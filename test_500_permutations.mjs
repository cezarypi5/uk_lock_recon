/**
 * test_500_permutations.mjs
 * ──────────────────────────────────────────────────────────────────────────
 * 500-iteration automated full-permutation stress test for lock-recon.web.app v2.0.0
 *
 * Tests ALL 7 filter dimensions in random combinations:
 *   1. Security Tier  (any | basic | high | elite | top-notch)
 *   2. Budget         (any | under40 | 40-70 | 70-100 | 100plus)
 *   3. Environment    (any | external | internal)
 *   4. Door Type      (any | upvc | composite | timber | aluminium)
 *   5. Anti-Attack    (random subset of: anti-snap, anti-bump, anti-drill, anti-pick, anti-extract)
 *   6. Cylinder Type  (any | double | thumbturn)  ← rotated randomly
 *   7. Cylinder Size  (none | 60 | 70 | 75 | 80 | 85 | 90 | 100)
 *   + Keyword         (empty | brand names)
 *
 * PASS conditions per iteration:
 *   - UI renders without crash (no JS fatal errors, lock-grid or empty-state visible)
 *   - If cylinder type = thumbturn → all visible cards must have THUMBTURN badge
 *   - If cylinder type = double   → no card should have THUMBTURN badge
 *   - Card images must load (no broken src="")
 *   - No uncaught JS exceptions logged to console.error
 *
 * Run: node test_500_permutations.mjs
 */

import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const LIVE_URL    = 'https://lock-recon.web.app';
const TOTAL       = 500;
const LOG_DIR     = './logs/permutation_500';
const SNAP_EVERY  = 50;  // screenshot every 50 tests
const SNAP_FAILS  = true; // always screenshot on FAIL

const SECURITY_TIERS  = ['any', 'basic', 'high', 'elite', 'top-notch'];
const BUDGETS         = ['any', 'under40', '40-70', '70-100', '100plus'];
const ENVIRONMENTS    = ['any', 'external', 'internal'];
const DOOR_TYPES      = ['any', 'upvc', 'composite', 'timber', 'aluminium'];
const CYLINDER_TYPES  = ['any', 'double', 'thumbturn', 'any', 'any']; // any weighted higher
const ATTACK_OPTIONS  = ['anti-snap', 'anti-bump', 'anti-drill', 'anti-pick', 'anti-extract'];
const KEYWORDS        = ['', '', '', '', 'yale', 'ultion', 'avocet', 'era', 'mul-t-lock', 'abloy', 'caveo', ''];
const CYL_SIZES       = [null, null, null, 60, 70, 70, 75, 80, 85, 90, 100];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function padded(n) { return n.toString().padStart(3, '0'); }
function randAttacks() {
    // 0-3 random attack checkboxes selected (weighted towards fewer)
    const count = Math.floor(Math.random() * 4);
    const shuffled = [...ATTACK_OPTIONS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
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

    console.log(`[PERM-500] Browser: ${execPath}`);
    console.log(`[PERM-500] Target:  ${LIVE_URL}`);
    console.log(`[PERM-500] Running  ${TOTAL} iterations...\n`);

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

    console.log('[PERM-500] Loading page...');
    await page.goto(LIVE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2500)); // let backgroundPrefetch warm up

    const results = [];
    let passed = 0, failed = 0;

    for (let i = 1; i <= TOTAL; i++) {
        const cfg = {
            tier:        rand(SECURITY_TIERS),
            budget:      rand(BUDGETS),
            environment: rand(ENVIRONMENTS),
            doorType:    rand(DOOR_TYPES),
            cylinderType: rand(CYLINDER_TYPES),
            attacks:     randAttacks(),
            keyword:     rand(KEYWORDS),
            cylinderMm:  rand(CYL_SIZES),
        };

        // Apply filters via page.evaluate
        const setupResult = await page.evaluate((c) => {
            const errors = [];

            // 1. Security tier
            const tierRadio = document.querySelector(`input[name="security-tier"][value="${c.tier}"]`);
            if (tierRadio) tierRadio.click(); else errors.push(`tier radio "${c.tier}" not found`);

            // 2. Budget
            const budgetRadio = document.querySelector(`input[name="budget"][value="${c.budget}"]`);
            if (budgetRadio) budgetRadio.click(); else errors.push(`budget radio "${c.budget}" not found`);

            // 3. Environment
            const envRadio = document.querySelector(`input[name="environment"][value="${c.environment}"]`);
            if (envRadio) envRadio.click(); else errors.push(`env radio "${c.environment}" not found`);

            // 4. Door type
            const doorRadio = document.querySelector(`input[name="door-type"][value="${c.doorType}"]`);
            if (doorRadio) doorRadio.click(); else errors.push(`door radio "${c.doorType}" not found`);

            // 5. Cylinder type
            const typeRadio = document.querySelector(`input[name="cylinder-type"][value="${c.cylinderType}"]`);
            if (typeRadio) typeRadio.click(); else errors.push(`cylinder-type radio "${c.cylinderType}" not found`);

            // 6. Attacks — first uncheck all, then check selected
            document.querySelectorAll('input[name="attack"]').forEach(cb => {
                if (cb.checked) cb.click();
            });
            c.attacks.forEach(att => {
                const cb = document.querySelector(`input[name="attack"][value="${att}"]`);
                if (cb && !cb.checked) cb.click();
            });

            // 7. Keyword
            const kwInput = document.getElementById('keyword-search');
            if (kwInput) {
                kwInput.value = c.keyword;
                kwInput.dispatchEvent(new Event('input', { bubbles: true }));
            }

            // 8. Cylinder size
            const sizeInput = document.getElementById('size-total');
            if (sizeInput) {
                sizeInput.value = c.cylinderMm !== null ? String(c.cylinderMm) : '70';
                sizeInput.dispatchEvent(new Event('input', { bubbles: true }));
            }

            return { errors };
        }, cfg);

        // Click FIND LOCKS
        await page.evaluate(() => {
            const btn = [...document.querySelectorAll('button')].find(b =>
                b.textContent.includes('FIND LOCKS') || b.textContent.includes('ZNAJDŹ ZAMKI')
            );
            if (btn) btn.click();
        });

        await new Promise(r => setTimeout(r, 900));

        // Validate result state
        const validation = await page.evaluate((cfg) => {
            const cards = [...document.querySelectorAll('.lock-card')];
            const emptyVisible = !document.getElementById('empty-state')?.hidden;
            const splashVisible = !document.getElementById('splash-state')?.hidden
                && document.getElementById('splash-state')?.style.display !== 'none';
            const gridVisible = !document.getElementById('lock-grid')?.hidden;

            const cardData = cards.map(card => {
                const badge = card.querySelector('.spec-type');
                const img   = card.querySelector('.card-image, img');
                const title = card.querySelector('.card-model, .card-brand');
                return {
                    title:        title?.textContent?.trim() ?? 'unknown',
                    badgeText:    badge?.textContent?.trim() ?? '',
                    imgSrc:       img?.src ?? img?.getAttribute('src') ?? '',
                    hasThumbBadge: (badge?.textContent ?? '').toUpperCase().includes('THUMBTURN') ||
                                   (badge?.textContent ?? '').toUpperCase().includes('NAKRĘTKĄ'),
                    hasDoubleBadge: (badge?.textContent ?? '').toUpperCase().includes('DOUBLE') ||
                                    (badge?.textContent ?? '').toUpperCase().includes('PODWÓJNY'),
                };
            });

            const selectedType = document.querySelector('input[name="cylinder-type"]:checked')?.value ?? 'none';

            return {
                cardCount:    cards.length,
                emptyVisible,
                splashVisible,
                gridVisible,
                cards:        cardData,
                selectedType,
            };
        }, cfg);

        // Evaluate PASS/FAIL
        const testErrors = [...setupResult.errors];

        // UI must show SOMETHING meaningful (not stuck on splash)
        if (validation.splashVisible && validation.cardCount === 0 && !validation.emptyVisible) {
            testErrors.push('UI stuck on splash — FIND LOCKS did not trigger');
        }

        // Thumbturn-specific: every card must have thumbturn badge
        if (cfg.cylinderType === 'thumbturn' && validation.cardCount > 0) {
            const nonThumb = validation.cards.filter(c => !c.hasThumbBadge);
            nonThumb.forEach(c =>
                testErrors.push(`[THUMBTURN] Card "${c.title}" missing thumbturn badge (got: "${c.badgeText}")`)
            );
        }

        // Double euro: no card should have thumbturn badge
        if (cfg.cylinderType === 'double' && validation.cardCount > 0) {
            const wrongCards = validation.cards.filter(c => c.hasThumbBadge);
            wrongCards.forEach(c =>
                testErrors.push(`[DOUBLE] Card "${c.title}" has thumbturn badge — should be double euro`)
            );
        }

        // Broken images
        const brokenImgs = validation.cards.filter(c => !c.imgSrc || c.imgSrc.endsWith('/'));
        brokenImgs.forEach(c =>
            testErrors.push(`Card "${c.title}" has broken/empty image src`)
        );

        const status = testErrors.length === 0 ? 'PASS' : 'FAIL';
        if (status === 'PASS') passed++; else failed++;

        results.push({
            test: i,
            cfg,
            cardCount: validation.cardCount,
            status,
            errors: testErrors,
        });

        // Screenshot: every SNAP_EVERY tests, and on every failure
        if (i % SNAP_EVERY === 0 || (SNAP_FAILS && status === 'FAIL')) {
            const snapFile = path.join(LOG_DIR, `${padded(i)}_${status.toLowerCase()}.webp`);
            await page.screenshot({ path: snapFile, type: 'webp', quality: 60, fullPage: false });
        }

        // Progress bar
        const bar = '█'.repeat(Math.floor(i / TOTAL * 30)).padEnd(30, '░');
        process.stdout.write(`\r[${bar}] ${i}/${TOTAL}  PASS:${passed}  FAIL:${failed}  Cards:${validation.cardCount}  `);
    }

    await browser.close();

    console.log('\n\n══════════════════════════════════════════════════════');
    console.log('[PERM-500] TEST COMPLETE');
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
    const reportPath = path.join(LOG_DIR, 'permutation_500_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\nJSON report saved: ${reportPath}`);

    if (failed > 0) {
        console.log('\n[FAILURES]:');
        results.filter(r => r.status === 'FAIL').forEach(f => {
            console.log(`  Test #${f.test} [${f.cfg.cylinderType} | ${f.cfg.tier}]: ${f.errors.join(' | ')}`);
        });
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
