/**
 * test_1000_thumbturn.mjs
 * ──────────────────────────────────────────────────────────────────────────
 * 1000-iteration automated thumbturn stress test for lock-recon.web.app v2.0.0
 *
 * THUMBTURN cylinder type is PERMANENTLY LOCKED ON for all 1000 iterations.
 * All OTHER 6 filter dimensions are randomised:
 *   1. Security Tier  (any | basic | high | elite | top-notch)
 *   2. Budget         (any | under40 | 40-70 | 70-100 | 100plus)
 *   3. Environment    (any | external | internal)
 *   4. Door Type      (any | upvc | composite | timber | aluminium)
 *   5. Anti-Attack    (random subset of 5 features)
 *   6. Cylinder Size  (none | 60 | 70 | 75 | 80 | 85 | 90 | 100mm)
 *   7. Keyword        (empty | brand names)
 *
 * PASS conditions per iteration:
 *   - UI renders without crash
 *   - THUMBTURN radio stays selected after FIND LOCKS
 *   - Every visible lock card shows the THUMBTURN badge
 *   - No card has a known double-euro image URL
 *   - No broken (empty) image sources
 *
 * Run: node test_1000_thumbturn.mjs
 */

import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const LIVE_URL    = 'https://lock-recon.web.app';
const TOTAL       = 1000;
const LOG_DIR     = './logs/thumbturn_1000';
const SNAP_EVERY  = 100;

const SECURITY_TIERS = ['any', 'basic', 'high', 'elite', 'top-notch'];
const BUDGETS        = ['any', 'under40', '40-70', '70-100', '100plus'];
const ENVIRONMENTS   = ['any', 'external', 'internal'];
const DOOR_TYPES     = ['any', 'upvc', 'composite', 'timber', 'aluminium'];
const ATTACK_OPTIONS = ['anti-snap', 'anti-bump', 'anti-drill', 'anti-pick', 'anti-extract'];
const KEYWORDS       = ['', '', '', '', 'avocet', 'era', 'caveo', 'abs', 'thumbturn', ''];
const CYL_SIZES      = [null, null, null, 60, 70, 70, 75, 80, 85, 90, 100];

const BAD_IMAGES = ['era-fortress', 'era-fortress-3-star'];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function padded(n) { return n.toString().padStart(4, '0'); }
function randAttacks() {
    const count = Math.floor(Math.random() * 4); // 0-3 features
    return [...ATTACK_OPTIONS].sort(() => Math.random() - 0.5).slice(0, count);
}

async function run() {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

    const browsers = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    ];
    const execPath = browsers.find(b => fs.existsSync(b));
    if (!execPath) throw new Error('No Chrome/Edge found');

    console.log(`[THUMB-1000] Browser: ${execPath}`);
    console.log(`[THUMB-1000] Target:  ${LIVE_URL}`);
    console.log(`[THUMB-1000] Running  ${TOTAL} iterations — THUMBTURN always locked\n`);

    const browser = await puppeteer.launch({
        headless: 'new',
        executablePath: execPath,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => consoleErrors.push(`[pageerror] ${err.message}`));

    console.log('[THUMB-1000] Loading page...');
    await page.goto(LIVE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2500)); // let backgroundPrefetch warm

    const results = [];
    let passed = 0, failed = 0;

    for (let i = 1; i <= TOTAL; i++) {
        const cfg = {
            tier:       rand(SECURITY_TIERS),
            budget:     rand(BUDGETS),
            environment: rand(ENVIRONMENTS),
            doorType:   rand(DOOR_TYPES),
            attacks:    randAttacks(),
            keyword:    rand(KEYWORDS),
            cylinderMm: rand(CYL_SIZES),
        };

        // Apply filters — THUMBTURN always ON
        const setupResult = await page.evaluate((c) => {
            const errors = [];

            // THUMBTURN — ALWAYS selected
            const thumbRadio = document.querySelector('input[name="cylinder-type"][value="thumbturn"]');
            if (thumbRadio) thumbRadio.click();
            else errors.push('THUMBTURN radio not found in DOM');

            // Security tier
            const tierRadio = document.querySelector(`input[name="security-tier"][value="${c.tier}"]`);
            if (tierRadio) tierRadio.click();
            else errors.push(`tier "${c.tier}" not found`);

            // Budget
            const budgetRadio = document.querySelector(`input[name="budget"][value="${c.budget}"]`);
            if (budgetRadio) budgetRadio.click();
            else errors.push(`budget "${c.budget}" not found`);

            // Environment
            const envRadio = document.querySelector(`input[name="environment"][value="${c.environment}"]`);
            if (envRadio) envRadio.click();
            else errors.push(`env "${c.environment}" not found`);

            // Door type
            const doorRadio = document.querySelector(`input[name="door-type"][value="${c.doorType}"]`);
            if (doorRadio) doorRadio.click();
            else errors.push(`door "${c.doorType}" not found`);

            // Attacks — clear all then set selected
            document.querySelectorAll('input[name="attack"]').forEach(cb => {
                if (cb.checked) cb.click();
            });
            c.attacks.forEach(att => {
                const cb = document.querySelector(`input[name="attack"][value="${att}"]`);
                if (cb && !cb.checked) cb.click();
            });

            // Keyword
            const kwInput = document.getElementById('keyword-search');
            if (kwInput) {
                kwInput.value = c.keyword;
                kwInput.dispatchEvent(new Event('input', { bubbles: true }));
            }

            // Cylinder size
            const sizeInput = document.getElementById('size-total');
            if (sizeInput) {
                sizeInput.value = c.cylinderMm !== null ? String(c.cylinderMm) : '70';
                sizeInput.dispatchEvent(new Event('input', { bubbles: true }));
            }

            return { errors };
        }, cfg);

        // Click FIND LOCKS (works for both EN and PL)
        await page.evaluate(() => {
            const btn = [...document.querySelectorAll('button')].find(b =>
                b.id === 'btn-scan' ||
                b.textContent.includes('FIND LOCKS') ||
                b.textContent.includes('ZNAJDŹ ZAMKI')
            );
            if (btn) btn.click();
        });

        await new Promise(r => setTimeout(r, 800));

        // Validate
        const validation = await page.evaluate((badImages) => {
            const cards = [...document.querySelectorAll('.lock-card')];
            const selectedType = document.querySelector('input[name="cylinder-type"]:checked')?.value ?? 'none';

            const cardData = cards.map(card => {
                const badge = card.querySelector('.spec-type');
                const img   = card.querySelector('.card-image, img');
                const title = card.querySelector('.card-model, .card-brand');
                const badgeText = (badge?.textContent ?? '').toUpperCase();
                return {
                    title:       title?.textContent?.trim() ?? 'unknown',
                    badgeText,
                    hasThumb:    badgeText.includes('THUMBTURN') || badgeText.includes('NAKRĘTKĄ'),
                    imgSrc:      img?.src ?? img?.getAttribute('src') ?? '',
                    hasBadImg:   badImages.some(bad => (img?.src ?? '').includes(bad)),
                };
            });

            return { cards: cardData, selectedType, cardCount: cards.length };
        }, BAD_IMAGES);

        const testErrors = [...setupResult.errors];

        // Thumbturn radio must still be selected
        if (validation.selectedType !== 'thumbturn') {
            testErrors.push(`Cylinder radio changed to "${validation.selectedType}" — expected "thumbturn"`);
        }

        // Every card must have thumbturn badge
        validation.cards.filter(c => !c.hasThumb).forEach(c =>
            testErrors.push(`Card "${c.title}" missing THUMBTURN badge (got: "${c.badgeText}")`)
        );

        // No double-euro images
        validation.cards.filter(c => c.hasBadImg).forEach(c =>
            testErrors.push(`Card "${c.title}" has bad double-euro image: ${c.imgSrc}`)
        );

        // No broken images
        validation.cards.filter(c => !c.imgSrc || c.imgSrc.endsWith('/')).forEach(c =>
            testErrors.push(`Card "${c.title}" has broken/empty image src`)
        );

        const status = testErrors.length === 0 ? 'PASS' : 'FAIL';
        if (status === 'PASS') passed++; else failed++;

        results.push({ test: i, cfg, cardCount: validation.cardCount, status, errors: testErrors });

        if (i % SNAP_EVERY === 0 || status === 'FAIL') {
            const snapFile = path.join(LOG_DIR, `${padded(i)}_${status.toLowerCase()}.webp`);
            await page.screenshot({ path: snapFile, type: 'webp', quality: 60, fullPage: false });
        }

        const bar = '█'.repeat(Math.floor(i / TOTAL * 30)).padEnd(30, '░');
        process.stdout.write(`\r[${bar}] ${i}/${TOTAL}  PASS:${passed}  FAIL:${failed}  Cards:${validation.cardCount}  `);
    }

    await browser.close();

    console.log('\n\n══════════════════════════════════════════════════════');
    console.log('[THUMB-1000] TEST COMPLETE');
    console.log('══════════════════════════════════════════════════════');
    console.log(`Total tests   : ${TOTAL}`);
    console.log(`PASSED        : ${passed}  (${((passed / TOTAL) * 100).toFixed(1)}%)`);
    console.log(`FAILED        : ${failed}  (${((failed / TOTAL) * 100).toFixed(1)}%)`);
    console.log(`Console errors: ${consoleErrors.length}`);

    const report = {
        timestamp:    new Date().toISOString(),
        url:          LIVE_URL,
        version:      'v2.0.0',
        total:        TOTAL,
        passed,
        failed,
        passRate:     `${((passed / TOTAL) * 100).toFixed(1)}%`,
        consoleErrors,
        failures:     results.filter(r => r.status === 'FAIL'),
        allResults:   results,
    };
    const reportPath = path.join(LOG_DIR, 'thumbturn_1000_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\nJSON report saved: ${reportPath}`);

    if (failed > 0) {
        console.log('\n[FAILURES]:');
        results.filter(r => r.status === 'FAIL').forEach(f =>
            console.log(`  Test #${f.test} [${f.cfg.tier} | ${f.cfg.budget}]: ${f.errors.join(' | ')}`)
        );
    } else {
        console.log(`\n✅ ALL ${TOTAL} TESTS PASSED — Zero failures, zero bad images`);
    }

    const snapshots = fs.readdirSync(LOG_DIR).filter(f => f.endsWith('.webp'));
    console.log(`\nSnapshots captured: ${snapshots.length} in ${LOG_DIR}`);
    process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
    console.error('[FATAL]', err);
    process.exit(1);
});
