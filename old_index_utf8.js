import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import targets from './targets.js';
import { scrapeTarget } from './selfHeal.js';
import * as telemetry from './telemetry.js';
import { KNOWN_PRODUCTS } from './knownProducts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT ?? 3000;

// Serve static files from /public
app.use(express.static(path.join(__dirname, '..', 'public')));

// In-memory cache to avoid re-scraping on every browser refresh
let cachedResults = null;
let cacheTime = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Build a full lock object from a KNOWN_PRODUCTS entry.
 * Used as guaranteed fallback when live scraping returns 0 results.
 */
function knownProductToLock(entry, index) {
    const kw = entry.keywords ?? [];
    // Capitalise first keyword as manufacturer, rest as model hints
    const manufacturer = kw[0]
        ? kw[0].charAt(0).toUpperCase() + kw[0].slice(1)
        : 'Unknown';
    const model = kw.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        || `${manufacturer} High-Security Cylinder`;

    return {
        manufacturer,
        model_name: model,
        security_accreditations: deriveAccreditations(entry.security_tier),
        price_gbp: entry.price_gbp ?? 'N/A',
        product_url: entry.product_url ?? 'N/A',
        lock_image: entry.lock_image ?? 'N/A',
        cylinder_type: entry.cylinder_type ?? 'double euro',
        cylinder_sizes: entry.cylinder_sizes ?? [],
        security_tier: entry.security_tier ?? 'high',
        anti_attack: entry.anti_attack ?? [],
        door_compatibility: entry.door_compatibility ?? [],
        environment: entry.environment ?? 'external',
        lock_category: entry.lock_category ?? 'euro-cylinder',
        reviews: null,
        _source: 'offline_database',
    };
}

function deriveAccreditations(tier) {
    if (tier === 'top-notch') return ['TS007 3*', 'SS312 Diamond', 'BS3621'];
    if (tier === 'elite') return ['TS007 3*', 'SS312 Diamond'];
    if (tier === 'high') return ['TS007 3*'];
    return ['BS3621'];
}

/**
 * GET /api/locks ΓÇö Run full parallel scrape and return all lock results.
 * Results cached for 10 minutes. Falls back to KNOWN_PRODUCTS if scraping returns 0.
 */
app.get('/api/locks', async (req, res) => {
    const forceRefresh = req.query.refresh === 'true';

    // Return cached data if fresh
    if (cachedResults && !forceRefresh && (Date.now() - cacheTime < CACHE_TTL_MS)) {
        console.log('[API] Returning cached results');
        return res.json({ status: 'ok', cached: true, locks: cachedResults });
    }

    console.log('[API] Starting fresh scrape run...');
    telemetry.startRun();

    try {
        // Scrape all manufacturer targets IN PARALLEL
        const results = await Promise.allSettled(
            targets.map(target => scrapeTarget(target))
        );

        // Flatten all successfully extracted locks
        const allLocks = results.flatMap((result, i) => {
            if (result.status === 'fulfilled') {
                return result.value;
            } else {
                console.error(`[API] Target ${targets[i].name} promise rejected: ${result.reason}`);
                return [];
            }
        });

        const report = telemetry.endRun();

        // ΓöÇΓöÇ FALLBACK: if scraping returned 0 locks, use KNOWN_PRODUCTS as offline database
        let finalLocks = allLocks;
        let usedFallback = false;
        if (allLocks.length === 0) {
            console.warn('[API] ΓÜá Live scrape returned 0 locks ΓÇö falling back to offline database');
            finalLocks = KNOWN_PRODUCTS.map(knownProductToLock);
            usedFallback = true;
        }

        cachedResults = finalLocks;
        cacheTime = Date.now();

        return res.json({
            status: 'ok',
            cached: false,
            fallback: usedFallback,
            locks: finalLocks,
            telemetry: {
                durationMs: report.durationMs,
                totalTokens: report.totalTokens,
                totalLocksExtracted: report.totalLocksExtracted,
                successTargets: report.successTargets,
                overallStatus: usedFallback ? 'offline_database' : report.overallStatus,
            },
        });
    } catch (err) {
        console.error('[API] Fatal error during scrape:', err);
        return res.status(500).json({ status: 'error', message: err.message });
    }
});

/**
 * GET /api/status ΓÇö Return the last run telemetry report.
 */
app.get('/api/status', (req, res) => {
    const report = telemetry.getLastReport();
    if (!report) {
        return res.json({ status: 'no_run', message: 'No scrape has been run yet. Call /api/locks first.' });
    }
    return res.json({ status: 'ok', report });
});

/**
 * GET /api/cache/clear ΓÇö Flush the in-memory cache to force a fresh scrape on next /api/locks call.
 */
app.get('/api/cache/clear', (req, res) => {
    cachedResults = null;
    cacheTime = null;
    console.log('[API] Cache cleared manually');
    return res.json({ status: 'ok', message: 'Cache cleared. Next /api/locks call will trigger a fresh scrape.' });
});

app.listen(PORT, () => {
    // Always start with a clean slate ΓÇö cache is flushed on every server start.
    cachedResults = null;
    cacheTime = null;
    console.log(`\nΓöîΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÉ`);
    console.log(`Γöé  UK LOCK-SPEC RECONNAISSANCE ΓÇö ONLINE       Γöé`);
    console.log(`Γöé  Dashboard: http://localhost:${PORT}            Γöé`);
    console.log(`Γöé  API:       http://localhost:${PORT}/api/locks  Γöé`);
    console.log(`Γöé  Cache: FLUSHED ΓÇö all scans will be live    Γöé`);
    console.log(`ΓööΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÿ\n`);
});

export default app;
