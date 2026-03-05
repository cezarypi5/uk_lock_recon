/**
 * selfHeal.js — Deep parallel scraper with adaptive retry and deduplication.
 *
 * SPEED OPTIMISATIONS (v2):
 *  - knownBlocked: true targets skipped immediately (no wasted retries)
 *  - Progressive cascade: try first URL alone, stop on success (saves 5 Puppeteer calls)
 *  - MAX_CONCURRENT raised from 3 → 6 (tabs, not browsers — safe with shared browser pool)
 *  - MAX_RETRIES reduced from 5 → 2 (failed sites fail fast, not after 5 expensive attempts)
 *  - Retry sleep reduced from 2s×attempt → 500ms flat
 */

import { fetchWithPuppeteer } from './puppeteerFetch.js';
import { stripHtml } from './htmlStripper.js';
import { extractLocks } from './geminiExtractor.js';
import { enrichWithReviews } from './trustpilotAPI.js';
import * as telemetry from './telemetry.js';

const MAX_RETRIES = 2;          // Reduced from 5 — fail faster on blocked sites
const MAX_CONCURRENT = 6;       // Raised from 3 — safe with shared browser (tabs, not processes)
const RETRY_SLEEP_MS = 500;     // Flat delay — was 2000 * attempt

let activeCount = 0;
const waitQueue = [];

function acquireSemaphore() {
    return new Promise(resolve => {
        if (activeCount < MAX_CONCURRENT) {
            activeCount++;
            resolve();
        } else {
            waitQueue.push(resolve);
        }
    });
}

function releaseSemaphore() {
    if (waitQueue.length > 0) {
        const next = waitQueue.shift();
        next();
    } else {
        activeCount--;
    }
}

/**
 * scrapeUrl — Fetch one URL, strip HTML, extract locks via Gemini.
 */
async function scrapeUrl(url, target, puppeteerOptions = {}) {
    await acquireSemaphore();
    try {
        const rawHtml = await fetchWithPuppeteer(url, {
            timeoutMs: 10000,
            extraDelayMs: 600,
            userAgentIndex: 0,
            ...puppeteerOptions,
        });

        const strippedHtml = stripHtml(rawHtml);

        if (strippedHtml.length < 300) {
            throw new Error(`Page too short after stripping (${strippedHtml.length} chars) — likely blocked`);
        }

        const { locks, tokenCount, latencyMs } = await extractLocks(
            target.name,
            strippedHtml,
            target.geminiPrompt,
        );

        return { locks, tokenCount, latencyMs, url };
    } finally {
        releaseSemaphore();
    }
}

function deduplicateLocks(locks) {
    const seen = new Set();
    return locks.filter(lock => {
        const key = `${lock.manufacturer}::${lock.model_name.toLowerCase().trim()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function getRetryStrategy(attempt) {
    switch (attempt) {
        case 1: return { description: 'Extended timeout + Edge UA', puppeteerOptions: { timeoutMs: 12000, extraDelayMs: 1000, userAgentIndex: 1 } };
        case 2: return { description: 'Mac UA + max timeout', puppeteerOptions: { timeoutMs: 15000, extraDelayMs: 1500, userAgentIndex: 2 } };
        default: return null;
    }
}

/**
 * scrapeTarget — Progressive cascade scraper.
 *
 * Phase 1: Try first URL only (fastest path — succeeds ~80% of the time).
 * Phase 2: If Phase 1 got nothing, try all remaining URLs in parallel.
 * Phase 3: If still nothing, retry top-3 URLs with adaptive strategies (max 2 retries).
 * Phase 4: Enrich with Trustpilot reviews.
 */
export async function scrapeTarget(target) {
    // ── Skip known bot-blocked sites immediately ──────────────────────────────
    if (target.knownBlocked) {
        console.log(`[${target.name}] ⏭  knownBlocked=true — skipping (stockist fallback handles this brand)`);
        telemetry.failTarget(target.name, 'Skipped — knownBlocked (bot protection confirmed)');
        return [];
    }

    telemetry.startTarget(target.name, target.urls[0]);
    console.log(`\n[${target.name}] Starting progressive scrape of ${target.urls.length} URLs`);

    let totalTokens = 0;
    let totalLatency = 0;
    let allLocks = [];

    // ── Phase 1: Try first URL only (fast path) ───────────────────────────────
    console.log(`  [${target.name}] Phase 1: trying primary URL...`);
    try {
        const result = await scrapeUrl(target.urls[0], target);
        console.log(`  [${target.name}] ✅ Primary URL → ${result.locks.length} locks (${result.tokenCount} tokens)`);
        allLocks = result.locks;
        totalTokens += result.tokenCount;
        totalLatency = result.latencyMs;
    } catch (err) {
        console.warn(`  [${target.name}] ⚠️  Primary URL failed: ${err.message}`);
    }

    // ── Phase 2: If Phase 1 got nothing, try all remaining URLs in parallel ───
    if (allLocks.length === 0 && target.urls.length > 1) {
        console.log(`  [${target.name}] Phase 2: trying ${target.urls.length - 1} backup URLs in parallel...`);
        const backupResults = await Promise.allSettled(
            target.urls.slice(1).map(url => scrapeUrl(url, target))
        );
        backupResults.forEach((result, i) => {
            const url = target.urls[i + 1];
            if (result.status === 'fulfilled') {
                console.log(`  [${target.name}] ✅ ${url} → ${result.value.locks.length} locks`);
                allLocks.push(...result.value.locks);
                totalTokens += result.value.tokenCount;
                totalLatency = Math.max(totalLatency, result.value.latencyMs);
            } else {
                console.warn(`  [${target.name}] ⚠️  ${url} → ${result.reason?.message ?? result.reason}`);
            }
        });
        allLocks = deduplicateLocks(allLocks);
    }

    // ── Phase 3: Adaptive retry (max 2×) if still nothing ────────────────────
    if (allLocks.length === 0) {
        console.log(`[${target.name}] Zero locks — initiating ${MAX_RETRIES} retry attempts`);

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            const strategy = getRetryStrategy(attempt);
            if (!strategy) break;

            telemetry.retryTarget(target.name, attempt, strategy.description);
            await new Promise(r => setTimeout(r, RETRY_SLEEP_MS));

            const retryResults = await Promise.allSettled(
                target.urls.slice(0, 2).map(url => scrapeUrl(url, target, strategy.puppeteerOptions))
            );

            const retryLocks = [];
            retryResults.forEach(r => {
                if (r.status === 'fulfilled') {
                    retryLocks.push(...r.value.locks);
                    totalTokens += r.value.tokenCount;
                }
            });

            allLocks = deduplicateLocks(retryLocks);
            console.log(`[${target.name}] Retry ${attempt} (${strategy.description}): ${allLocks.length} locks`);

            if (allLocks.length > 0) {
                console.log(`[${target.name}] ✅ Recovery on retry ${attempt}`);
                break;
            }
        }
    }

    // ── Phase 4: Final result ─────────────────────────────────────────────────
    if (allLocks.length === 0) {
        telemetry.failTarget(target.name, `All ${target.urls.length} URLs + ${MAX_RETRIES} retries yielded no compliant locks`);
        return [];
    }

    const enrichedLocks = await enrichWithReviews(allLocks, target.trustpilotName);
    telemetry.completeTarget(target.name, enrichedLocks.length, totalTokens, totalLatency);
    console.log(`[${target.name}] 🔐 Final: ${enrichedLocks.length} accredited locks`);
    return enrichedLocks;
}

export default { scrapeTarget };
