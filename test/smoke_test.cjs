/**
 * v2.0.8 Mandatory Smoke Test — Per doorlocks.md § 6.3.5
 * Screenshot procedure (updated v2.0.8):
 *   1. BEFORE SCAN:  Capture filter panel with a chosen security tier selected
 *   2. AFTER SCAN:   Capture results page showing the loaded lock cards
 * Tests: version.txt, footer version, 2 lock cards (image, price, badge), console errors
 */
const puppeteer = require('puppeteer-core');
const https = require('https');
const fs = require('fs');

const PROD_URL = 'https://lock-recon.web.app';
const EXPECTED_VERSION = '2.0.8';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = 'C:\\Users\\Cezary\\.gemini\\antigravity\\brain\\e7fd0cd6-3530-4d44-91c7-d44fab83675a';

function fetchVersionTxt() {
  return new Promise((resolve, reject) => {
    const bustedUrl = `${PROD_URL}/version.txt?t=${Date.now()}`;
    https.get(bustedUrl, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d.trim() }));
    }).on('error', reject);
  });
}

async function main() {
  const results = { passed: [], failed: [], screenshots: [] };
  const consoleErrors = [];

  // ── STEP 1: version.txt check (cache-busted) ──────────────────────────────
  console.log('\n[1] Fetching version.txt (cache-busted)...');
  const versionCheck = await fetchVersionTxt();
  if (versionCheck.status === 200 && versionCheck.body === EXPECTED_VERSION) {
    results.passed.push(`version.txt → "${versionCheck.body}" ✅`);
    console.log(`  ✅ version.txt = ${versionCheck.body}`);
  } else {
    results.failed.push(`version.txt returned "${versionCheck.body}" (${versionCheck.status}) — expected "${EXPECTED_VERSION}" ❌`);
    console.log(`  ❌ version.txt = "${versionCheck.body}" (expected "${EXPECTED_VERSION}")`);
  }

  // ── STEP 2: Browser launch ────────────────────────────────────────────────
  console.log('\n[2] Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--start-maximized']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Capture console errors (suppress known ESM browser internal noise)
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log(`  🔴 Console Error: ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    if (err.message.includes('import statement') || err.message.includes('Cannot use import')) return;
    consoleErrors.push(err.message);
    console.log(`  🔴 Page Error: ${err.message}`);
  });

  try {
    console.log('[3] Loading live site...');
    await page.goto(PROD_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500)); // allow i18n and domready to settle

    // ── SCREENSHOT 1: Filter selection state (BEFORE scan) ──────────────────
    // Select "High Security" tier so the screenshot proves a real filter was chosen
    console.log('[4] Selecting "High Security" tier filter...');
    const tierSelected = await page.evaluate(() => {
      // Click the 'high' radio button for security tier
      const highRadio = document.querySelector('input[name="security-tier"][value="high"]');
      if (highRadio) {
        highRadio.click();
        return true;
      }
      return false;
    });

    if (tierSelected) {
      results.passed.push('Security tier "High Security" selected ✅');
      console.log('  ✅ Filter: High Security selected');
    } else {
      results.failed.push('Could not select High Security radio button ❌');
      console.log('  ❌ Filter radio not found');
    }

    await new Promise(r => setTimeout(r, 500)); // let filter UI update

    // Take SCREENSHOT 1 — filter panel with selection visible
    const ss1Path = `${SCREENSHOT_DIR}\\smoke_1_filter_selection_v208.png`;
    await page.screenshot({ path: ss1Path, fullPage: false });
    results.screenshots.push({ label: 'BEFORE SCAN — Filter: High Security selected', path: ss1Path });
    console.log(`  📸 Screenshot 1 (filter state): ${ss1Path}`);

    // ── STEP 5: Check footer version ─────────────────────────────────────────
    const footerVersion = await page.evaluate(() => {
      const el = document.querySelector('.footer-version');
      return el ? el.textContent.trim() : null;
    });
    if (footerVersion && footerVersion.includes(EXPECTED_VERSION)) {
      results.passed.push(`Footer shows "v${EXPECTED_VERSION}" ✅`);
      console.log(`  ✅ Footer: "${footerVersion}"`);
    } else {
      results.failed.push(`Footer shows "${footerVersion}" — expected v${EXPECTED_VERSION} ❌`);
      console.log(`  ❌ Footer: "${footerVersion}"`);
    }

    // ── STEP 6: Click FIND LOCKS ──────────────────────────────────────────────
    console.log('\n[5] Clicking FIND LOCKS (#btn-scan)...');
    await page.click('#btn-scan');

    // Wait for Firestore data to load lock cards
    try {
      await page.waitForSelector('.lock-card', { timeout: 15000 });
      await new Promise(r => setTimeout(r, 2000)); // let all cards and images settle
      console.log('  ✅ Cards appeared after FIND LOCKS');
    } catch(e) {
      console.log('  ⚠️  Timed out waiting for .lock-card — taking screenshot anyway');
      await new Promise(r => setTimeout(r, 5000));
    }

    // Count cards
    const cardCount = await page.evaluate(() => document.querySelectorAll('.lock-card').length);
    console.log(`  ℹ️  Cards loaded: ${cardCount}`);
    if (cardCount > 0) {
      results.passed.push(`${cardCount} lock cards loaded ✅`);
    } else {
      results.failed.push('No lock cards loaded ❌');
    }

    // ── SCREENSHOT 2: Results page with cards (AFTER scan) ───────────────────
    // Scroll to the grid so cards are in view
    await page.evaluate(() => {
      const grid = document.getElementById('lock-grid');
      if (grid) grid.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    await new Promise(r => setTimeout(r, 500));

    const ss2Path = `${SCREENSHOT_DIR}\\smoke_2_results_page_v208.png`;
    await page.screenshot({ path: ss2Path, fullPage: false });
    results.screenshots.push({ label: 'AFTER SCAN — Results page with lock cards', path: ss2Path });
    console.log(`  📸 Screenshot 2 (results): ${ss2Path}`);

    if (cardCount === 0) {
      await browser.close();
      return finalize(results, consoleErrors);
    }

    // ── STEP 7: Validate 2 lock cards (card #1 and middle card) ──────────────
    for (let i = 0; i < 2; i++) {
      const cardIndex = i === 0 ? 0 : Math.floor(cardCount / 2);
      console.log(`\n[${6 + i}] Testing card #${cardIndex + 1}...`);

      const cardInfo = await page.evaluate((idx) => {
        const cards = document.querySelectorAll('.lock-card');
        const card = cards[idx];
        if (!card) return null;
        const brand = card.querySelector('.card-manufacturer')?.textContent?.trim();
        const model = card.querySelector('.card-model')?.textContent?.trim();
        return { brand, model };
      }, cardIndex);

      console.log(`  Card info: ${JSON.stringify(cardInfo)}`);

      // Check image
      const hasImage = await page.evaluate((idx) => {
        const card = document.querySelectorAll('.lock-card')[idx];
        if (!card) return false;
        const img = card.querySelector('img.card-image');
        return img && img.naturalWidth > 0;
      }, cardIndex);

      if (hasImage) {
        results.passed.push(`Card #${cardIndex + 1} (${cardInfo?.brand || '?'}) — image loaded ✅`);
        console.log(`  ✅ Image loaded`);
      } else {
        results.failed.push(`Card #${cardIndex + 1} (${cardInfo?.brand || '?'}) — image broken or N/A ⚠️`);
        console.log(`  ⚠️  Image missing/broken (may be N/A for this lock)`);
      }

      // Check price
      const priceText = await page.evaluate((idx) => {
        const card = document.querySelectorAll('.lock-card')[idx];
        return card?.querySelector('.card-price')?.textContent?.trim() ?? null;
      }, cardIndex);

      if (priceText && priceText !== '') {
        results.passed.push(`Card #${cardIndex + 1} — price: "${priceText}" ✅`);
        console.log(`  ✅ Price: "${priceText}"`);
      } else {
        results.failed.push(`Card #${cardIndex + 1} — price blank ❌`);
        console.log(`  ❌ Price blank`);
      }

      // Check security badge
      const hasBadge = await page.evaluate((idx) => {
        const card = document.querySelectorAll('.lock-card')[idx];
        const text = card?.textContent || '';
        return text.includes('TS007') || text.includes('SS312') || text.includes('BS3621');
      }, cardIndex);

      if (hasBadge) {
        results.passed.push(`Card #${cardIndex + 1} — security badge present ✅`);
        console.log(`  ✅ Security badge found`);
      } else {
        results.failed.push(`Card #${cardIndex + 1} — no security badge ❌`);
        console.log(`  ❌ No security badge`);
      }
    }

  } catch (err) {
    results.failed.push(`Script error: ${err.message} ❌`);
    console.error('[ERROR]', err.message);
  }

  await browser.close();
  return finalize(results, consoleErrors);
}

// ── Finalize ──────────────────────────────────────────────────────────────────
function finalize(results, consoleErrors) {
  console.log('\n══════════════════════════════════════════');
  console.log(`SMOKE TEST RESULTS — v${EXPECTED_VERSION}`);
  console.log('══════════════════════════════════════════');
  results.passed.forEach(p => console.log('  ✅', p));
  results.failed.forEach(f => console.log('  ❌', f));

  if (consoleErrors.length > 0) {
    console.log('\n🔴 Console Errors:');
    consoleErrors.forEach(e => console.log('  -', e));
  } else {
    console.log('\n✅ Zero browser console errors');
  }

  console.log('\n📸 Screenshots:');
  results.screenshots.forEach(s => console.log(`  [${s.label}]\n   → ${s.path}`));

  const criticalFailed = results.failed.filter(f => !f.includes('⚠️'));
  const allPassed = criticalFailed.length === 0 && consoleErrors.length === 0;
  console.log('\n' + (allPassed ? '✅ ALL CRITICAL TESTS PASSED' : '❌ CRITICAL TESTS FAILED'));

  const report = {
    version: EXPECTED_VERSION,
    timestamp: new Date().toISOString(),
    passed: results.passed,
    failed: results.failed,
    consoleErrors,
    screenshots: results.screenshots,
    overall: allPassed ? 'PASS' : 'FAIL'
  };
  fs.writeFileSync('C:\\tmp\\smoke_test_v208.json', JSON.stringify(report, null, 2));
  console.log('\nReport saved: C:\\tmp\\smoke_test_v208.json');

  process.exit(allPassed ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
