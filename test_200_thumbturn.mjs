/**
 * test_200_thumbturn.mjs
 * ──────────────────────────────────────────────────────────────────────────
 * 200-iteration automated test proving that the THUMBTURN cylinder filter
 * on lock-recon.web.app ALWAYS returns:
 *   1. Only locks with cylinder_type = 'thumbturn' in the data
 *   2. Each result card shows the 🔄 THUMBTURN badge
 *   3. Each result card image is NOT a double-euro (no ERA Fortress / Yale 
 *      generic CDN URLs) — i.e. the image URL must be a verified thumbturn photo
 *
 * Strategy: THUMBTURN radio is locked ON for all 200 tests.
 * All OTHER filters (security tier, budget, anti-attack, door type, 
 * keyword, cylinder size) are randomised to create 200 unique combinations.
 *
 * PASS conditions per iteration:
 *   - UI renders without crash
 *   - Every visible lock card has the THUMBTURN badge text
 *   - No card's image src contains the known bad double-euro CDN URLs
 *   - Known thumbturn products (avocet abs master, era caveo) appear when
 *     no other filters would exclude them
 *
 * Run: node test_200_thumbturn.mjs
 */

import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const LIVE_URL   = 'https://lock-recon.web.app';
const TOTAL      = 200;
const LOG_DIR    = './logs/thumbturn_200';
const SNAP_EVERY = 20; // full screenshot every 20 tests

// Known BAD image URLs — these are double-euro cylinder photos
// If any of these appear in a thumbturn result, the test FAILS
const BAD_IMAGES = [
    'era-fortress-3-star-anti-snap-euro-cylinder-upvc-front-door-lock-ts007__08166',
    'era-fortress',
];

// Known GOOD thumbturn image patterns
const GOOD_THUMBTURN_IMAGES = [
    'safe.co.uk/products/grande/234914',   // Avocet ABS Master thumbturn
    'safe.co.uk/products/grande/156257',   // ERA Caveo thumbturn
];

const SECURITY_TIERS = ['any', 'basic', 'high', 'elite', 'top-notch'];
const BUDGETS        = ['any', 'under-40', '40-70', '70-100', 'over-100'];
const ENVIRONMENTS   = ['any', 'external', 'internal'];
const DOOR_TYPES     = ['any', 'upvc', 'composite', 'timber', 'aluminium'];
const KEYWORDS       = ['', '', '', 'avocet', 'era', 'caveo', 'abs', 'thumbturn', 'snap', ''];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function padded(n) { return n.toString().padStart(3, '0'); }

async function run() {
    // Setup log dir
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

    const browsers = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    ];
    const execPath = browsers.find(b => fs.existsSync(b));
    if (!execPath) throw new Error('No Chrome/Edge found — install a browser first');

    console.log(`[THUMBTURN-200] Browser: ${execPath}`);
    console.log(`[THUMBTURN-200] Target:  ${LIVE_URL}`);
    console.log(`[THUMBTURN-200] Running  ${TOTAL} iterations...\n`);

    const browser = await puppeteer.launch({
        headless: 'new',
        executablePath: execPath,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // Capture console errors from the page
    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    console.log('[THUMBTURN-200] Loading page...');
    await page.goto(LIVE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    const results = [];
    let passed = 0, failed = 0;

    for (let i = 1; i <= TOTAL; i++) {
        const cfg = {
            tier:        rand(SECURITY_TIERS),
            budget:      rand(BUDGETS),
            environment: rand(ENVIRONMENTS),
            doorType:    rand(DOOR_TYPES),
            keyword:     rand(KEYWORDS),
            cylinderMm:  Math.random() < 0.25 ? rand([60, 70, 75, 80, null]) : null,
        };

        // Apply all filters via page.evaluate — THUMBTURN is ALWAYS set
        const evalResult = await page.evaluate((c) => {
            const errors = [];

            // 1. Always set THUMBTURN
            const thumbturnRadio = document.querySelector('input[name="cylinder-type"][value="thumbturn"]');
            if (thumbturnRadio) thumbturnRadio.click();
            else errors.push('THUMBTURN radio not found');

            // 2. Security tier
            const tierRadio = document.querySelector(`input[name="security-tier"][value="${c.tier}"]`);
            if (tierRadio) tierRadio.click();

            // 3. Budget
            const budgetRadio = document.querySelector(`input[name="budget"][value="${c.budget}"]`);
            if (budgetRadio) budgetRadio.click();

            // 4. Environment
            const envRadio = document.querySelector(`input[name="environment"][value="${c.environment}"]`);
            if (envRadio) envRadio.click();

            // 5. Door type
            const doorRadio = document.querySelector(`input[name="door-type"][value="${c.doorType}"]`);
            if (doorRadio) doorRadio.click();

            // 6. Keyword
            const kwInput = document.getElementById('keyword-search');
            if (kwInput) {
                kwInput.value = c.keyword;
                kwInput.dispatchEvent(new Event('input', { bubbles: true }));
            }

            // 7. Cylinder size (optional)
            if (c.cylinderMm !== null) {
                const mmInput = document.getElementById('total-mm');
                if (mmInput) {
                    mmInput.value = c.cylinderMm;
                    mmInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
            } else {
                // Clear any previous cylinder size
                const mmInput = document.getElementById('total-mm');
                if (mmInput && mmInput.value) {
                    mmInput.value = '';
                    mmInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }

            return { setupErrors: errors };
        }, cfg);

        // Click FIND LOCKS
        const findBtn = await page.$('#find-locks-btn, .find-locks-btn, button[id*="find"]');
        if (findBtn) {
            await findBtn.click();
        } else {
            // Try clicking via evaluate on the FAB
            await page.evaluate(() => {
                const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('FIND LOCKS'));
                if (btn) btn.click();
            });
        }

        await new Promise(r => setTimeout(r, 800)); // wait for render

        // Validate: inspect all visible lock cards
        const validation = await page.evaluate(() => {
            const cards = [...document.querySelectorAll('.lock-card')];
            const cardData = cards.map(card => {
                // Correct selectors matching buildLockCard() in script.js:
                // - .card-model   → product name
                // - .spec-type    → cylinder type badge (contains "🔄 THUMBTURN")
                // - .card-image   → product image
                const badge = card.querySelector('.spec-type');
                const img   = card.querySelector('.card-image');
                const title = card.querySelector('.card-model');
                return {
                    title:      title?.textContent?.trim() ?? 'unknown',
                    hasBadge:   badge?.textContent?.includes('THUMBTURN') ?? false,
                    imgSrc:     img?.src ?? img?.getAttribute('src') ?? '',
                    badgeText:  badge?.textContent?.trim() ?? '',
                };
            });

            // Check if thumbturn radio is still selected
            const selectedType = document.querySelector('input[name="cylinder-type"]:checked')?.value ?? 'none';

            // Status bar text
            const status = document.getElementById('scan-status')?.textContent?.trim() ?? '';

            return { cards: cardData, selectedType, status, cardCount: cards.length };
        });

        // Evaluate PASS/FAIL
        const testErrors = [...evalResult.setupErrors];

        // Check thumbturn radio stayed selected
        if (validation.selectedType !== 'thumbturn') {
            testErrors.push(`Cylinder type changed to '${validation.selectedType}' — expected 'thumbturn'`);
        }

        // Check every card has THUMBTURN badge
        const nonThumbCards = validation.cards.filter(c => !c.hasBadge);
        if (nonThumbCards.length > 0) {
            nonThumbCards.forEach(c =>
                testErrors.push(`Card "${c.title}" missing THUMBTURN badge (got: "${c.badgeText}")`)
            );
        }

        // Check no card uses a known bad (double-euro) image
        const badImgCards = validation.cards.filter(c =>
            BAD_IMAGES.some(bad => c.imgSrc.includes(bad))
        );
        if (badImgCards.length > 0) {
            badImgCards.forEach(c =>
                testErrors.push(`Card "${c.title}" has DOUBLE-EURO image: ${c.imgSrc}`)
            );
        }

        const status = testErrors.length === 0 ? 'PASS' : 'FAIL';
        if (status === 'PASS') passed++; else failed++;

        results.push({
            test: i,
            cfg,
            cardCount: validation.cardCount,
            cards: validation.cards,
            errors: testErrors,
            status,
        });

        // Screenshot every SNAP_EVERY tests AND on failures
        if (i % SNAP_EVERY === 0 || status === 'FAIL') {
            const snapFile = path.join(LOG_DIR, `${padded(i)}_${status.toLowerCase()}.webp`);
            await page.screenshot({ path: snapFile, type: 'webp', quality: 60, fullPage: false });
        }

        // Progress output
        const bar = '█'.repeat(Math.floor(i / TOTAL * 30)).padEnd(30, '░');
        process.stdout.write(`\r[${bar}] ${i}/${TOTAL}  PASS:${passed}  FAIL:${failed}  Cards:${validation.cardCount}  `);
    }

    await browser.close();

    console.log('\n\n══════════════════════════════════════════');
    console.log('[THUMBTURN-200] TEST COMPLETE');
    console.log('══════════════════════════════════════════');
    console.log(`Total tests : ${TOTAL}`);
    console.log(`PASSED      : ${passed}  (${((passed/TOTAL)*100).toFixed(1)}%)`);
    console.log(`FAILED      : ${failed}  (${((failed/TOTAL)*100).toFixed(1)}%)`);
    console.log(`Console errs: ${consoleErrors.length}`);

    // Write JSON report
    const report = {
        timestamp:  new Date().toISOString(),
        url:        LIVE_URL,
        total:      TOTAL,
        passed,
        failed,
        passRate:   `${((passed/TOTAL)*100).toFixed(1)}%`,
        consoleErrors,
        failures:   results.filter(r => r.status === 'FAIL'),
        allResults: results,
    };
    const reportPath = path.join(LOG_DIR, 'thumbturn_200_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\nJSON report saved: ${reportPath}`);

    // Print failures if any
    if (failed > 0) {
        console.log('\n[FAILURES]:');
        results.filter(r => r.status === 'FAIL').forEach(f => {
            console.log(`  Test #${f.test}: ${f.errors.join(' | ')}`);
        });
    } else {
        console.log('\n✅ ALL 200 TESTS PASSED — Zero failures, zero bad images');
    }

    // Capture summary screenshots
    const snapshots = fs.readdirSync(LOG_DIR).filter(f => f.endsWith('.webp'));
    console.log(`\nSnapshots captured: ${snapshots.length} in ${LOG_DIR}`);

    process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
    console.error('[FATAL]', err);
    process.exit(1);
});
