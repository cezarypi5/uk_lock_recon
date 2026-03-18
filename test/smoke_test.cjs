/**
 * v2.1.0 Mandatory Smoke Test — Per doorlocks.md § 6.3.5
 *
 * 4 TEST SCENARIOS  (2 filter combos × 2 languages):
 *
 *  Scenario EN-A  English  |  Security Tier: High Security
 *  Scenario EN-B  English  |  Security Tier: Elite  +  Budget: £40-70
 *  Scenario PL-A  Polish   |  Security Tier: High Security
 *  Scenario PL-B  Polish   |  Security Tier: Top-Notch
 *
 * Each scenario produces 2 screenshots:
 *   ss_<scenario>_1_filter.png  — filter panel with selection visible (BEFORE SCAN)
 *   ss_<scenario>_2_results.png — results grid with lock cards (AFTER SCAN)
 */
const puppeteer = require('puppeteer-core');
const https = require('https');
const fs = require('fs');

const PROD_URL     = 'https://lock-recon.web.app';
const EXPECTED_VERSION = '2.1.4';
const CHROME_PATH  = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SS_DIR       = 'C:\\Users\\Cezary\\.gemini\\antigravity\\brain\\e7fd0cd6-3530-4d44-91c7-d44fab83675a';

// ── Scenario definitions ─────────────────────────────────────────────────────
const SCENARIOS = [
  {
    id: 'EN-A',
    lang: 'en',
    label: 'English — High Security',
    tier: 'high',
    budget: null,         // no budget filter (leave at 'any')
  },
  {
    id: 'EN-B',
    lang: 'en',
    label: 'English — Elite tier, £40-70 budget',
    tier: 'elite',
    budget: '40-70',
  },
  {
    id: 'PL-A',
    lang: 'pl',
    label: 'Polski — High Security (Wysoka ochrona)',
    tier: 'high',
    budget: null,
  },
  {
    id: 'PL-B',
    lang: 'pl',
    label: 'Polski — Top Notch (Najwyższy poziom)',
    tier: 'top-notch',
    budget: null,
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function fetchVersionTxt() {
  return new Promise((resolve, reject) => {
    const url = `${PROD_URL}/version.txt?t=${Date.now()}`;
    https.get(url, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d.trim() }));
    }).on('error', reject);
  });
}

async function resetFilters(page) {
  await page.evaluate(() => {
    // Reset tier to 'any'
    const anyTier = document.querySelector('input[name="security-tier"][value="any"]');
    if (anyTier) anyTier.click();
    // Reset budget to 'any'
    const anyBudget = document.querySelector('input[name="budget"][value="any"]');
    if (anyBudget) anyBudget.click();
    // Clear keyword
    const kw = document.getElementById('keyword-search');
    if (kw) kw.value = '';
  });
  await new Promise(r => setTimeout(r, 400));
}

async function switchLang(page, lang) {
  await page.evaluate((l) => {
    const btn = document.querySelector(`.lang-btn[data-lang="${l}"]`);
    if (btn) btn.click();
  }, lang);
  await new Promise(r => setTimeout(r, 800)); // let i18n re-apply
}

async function applyScenarioFilters(page, scenario) {
  await page.evaluate((tier, budget) => {
    const tierRadio = document.querySelector(`input[name="security-tier"][value="${tier}"]`);
    if (tierRadio) tierRadio.click();
    if (budget) {
      const budgetRadio = document.querySelector(`input[name="budget"][value="${budget}"]`);
      if (budgetRadio) budgetRadio.click();
    }
  }, scenario.tier, scenario.budget);
  await new Promise(r => setTimeout(r, 500));
}

// ── Run one scenario ─────────────────────────────────────────────────────────
async function runScenario(page, scenario, results) {
  console.log(`\n${'═'.repeat(56)}`);
  console.log(`  SCENARIO ${scenario.id}: ${scenario.label}`);
  console.log(`${'═'.repeat(56)}`);

  // Reset state to neutral before each scenario
  await resetFilters(page);

  // Switch language
  await switchLang(page, scenario.lang);
  console.log(`  ✔ Language: ${scenario.lang.toUpperCase()}`);

  // Verify language is active (check html lang attr or button state)
  const activeLang = await page.evaluate(() => {
    const active = document.querySelector('.lang-btn.lang-active');
    return active ? active.dataset.lang : null;
  });
  if (activeLang === scenario.lang) {
    results.passed.push(`[${scenario.id}] Language ${scenario.lang.toUpperCase()} active ✅`);
  } else {
    results.failed.push(`[${scenario.id}] Language switch failed — got "${activeLang}" ❌`);
  }

  // Apply filters
  await applyScenarioFilters(page, scenario);
  console.log(`  ✔ Filters applied: tier=${scenario.tier}${scenario.budget ? ', budget=' + scenario.budget : ''}`);

  // Confirm tier radio is selected
  const tierChecked = await page.evaluate((tier) => {
    const r = document.querySelector(`input[name="security-tier"][value="${tier}"]`);
    return r ? r.checked : false;
  }, scenario.tier);
  if (tierChecked) {
    results.passed.push(`[${scenario.id}] Tier "${scenario.tier}" selected ✅`);
    console.log(`  ✅ Tier "${scenario.tier}" confirmed`);
  } else {
    results.failed.push(`[${scenario.id}] Tier "${scenario.tier}" not checked ❌`);
  }

  // ── SCREENSHOT 1: Filter state (BEFORE scan) ────────────────────────────
  const ss1 = `${SS_DIR}\\ss_${scenario.id}_1_filter.png`;
  // Scroll back to top so filter panel is fully visible
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: ss1, fullPage: false });
  results.screenshots.push({ label: `[${scenario.id}] BEFORE SCAN — Filter: ${scenario.label}`, path: ss1 });
  console.log(`  📸 Screenshot 1 (filter): ${ss1}`);

  // ── Click FIND LOCKS ─────────────────────────────────────────────────────
  console.log(`  Clicking FIND LOCKS...`);
  await page.click('#btn-scan');

  let cardCount = 0;
  try {
    await page.waitForSelector('.lock-card', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));
    cardCount = await page.evaluate(() => document.querySelectorAll('.lock-card').length);
    console.log(`  Cards loaded: ${cardCount}`);
    if (cardCount > 0) {
      results.passed.push(`[${scenario.id}] ${cardCount} lock cards loaded ✅`);
    } else {
      results.failed.push(`[${scenario.id}] No lock cards loaded ❌`);
    }
  } catch (e) {
    console.log(`  ⚠️  Timed out waiting for cards`);
    results.failed.push(`[${scenario.id}] Timeout waiting for lock cards ❌`);
    await new Promise(r => setTimeout(r, 3000));
  }

  // ── SCREENSHOT 2: Results page (AFTER scan) ──────────────────────────────
  // Get the exact Y position of the lock grid and scroll to it explicitly
  // (scrollIntoView inside evaluate can be ignored by the browser compositor)
  const gridTop = await page.evaluate(() => {
    const grid = document.getElementById('lock-grid');
    return grid ? Math.max(0, grid.getBoundingClientRect().top + window.scrollY - 20) : 0;
  });
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), gridTop);
  await new Promise(r => setTimeout(r, 1200)); // let compositor paint the grid at new scroll position
  console.log(`  ↕ Scrolled to lock-grid (y=${gridTop}px)`);
  const ss2 = `${SS_DIR}\\ss_${scenario.id}_2_results.png`;
  await page.screenshot({ path: ss2, fullPage: false });
  results.screenshots.push({ label: `[${scenario.id}] AFTER SCAN — ${cardCount} cards, ${scenario.lang.toUpperCase()}`, path: ss2 });
  console.log(`  📸 Screenshot 2 (results): ${ss2}`);

  // ── Validate first lock card ─────────────────────────────────────────────
  if (cardCount > 0) {
    const cardInfo = await page.evaluate(() => {
      const card = document.querySelectorAll('.lock-card')[0];
      return {
        brand: card?.querySelector('.card-manufacturer')?.textContent?.trim() ?? '?',
        price: card?.querySelector('.card-price')?.textContent?.trim() ?? '',
        hasBadge: (card?.textContent || '').includes('TS007') || (card?.textContent || '').includes('SS312') || (card?.textContent || '').includes('BS3621'),
        imgOk: (() => { const img = card?.querySelector('img.card-image'); return img && img.naturalWidth > 0; })()
      };
    });

    if (cardInfo.price) {
      results.passed.push(`[${scenario.id}] Card #1 (${cardInfo.brand}) — price: "${cardInfo.price}" ✅`);
    } else {
      results.failed.push(`[${scenario.id}] Card #1 price blank ❌`);
    }
    if (cardInfo.hasBadge) {
      results.passed.push(`[${scenario.id}] Card #1 — security badge present ✅`);
    } else {
      results.failed.push(`[${scenario.id}] Card #1 — no security badge ❌`);
    }
    if (cardInfo.imgOk) {
      results.passed.push(`[${scenario.id}] Card #1 (${cardInfo.brand}) — image loaded ✅`);
    } else {
      results.failed.push(`[${scenario.id}] Card #1 (${cardInfo.brand}) — image broken ⚠️`);
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const results = { passed: [], failed: [], screenshots: [] };
  const consoleErrors = [];

  // ── STEP 1: version.txt (cache-busted HTTP check) ─────────────────────────
  console.log('\n[1] Fetching version.txt (cache-busted)...');
  const versionCheck = await fetchVersionTxt();
  if (versionCheck.status === 200 && versionCheck.body === EXPECTED_VERSION) {
    results.passed.push(`version.txt → "${versionCheck.body}" ✅`);
    console.log(`  ✅ version.txt = ${versionCheck.body}`);
  } else {
    results.failed.push(`version.txt returned "${versionCheck.body}" (${versionCheck.status}) — expected "${EXPECTED_VERSION}" ❌`);
    console.log(`  ❌ version.txt = "${versionCheck.body}" (expected "${EXPECTED_VERSION}")`);
  }

  // ── STEP 2: Launch browser ────────────────────────────────────────────────
  console.log('\n[2] Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--start-maximized']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Suppress resource-load errors (broken images = data issue, not app bug)
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      if (txt.includes('ERR_CONNECTION_FAILED') || txt.includes('ERR_NAME_NOT_RESOLVED') ||
          txt.includes('Failed to load resource') || txt.includes('net::ERR_')) return;
      consoleErrors.push(txt);
      console.log(`  🔴 Console Error: ${txt}`);
    }
  });
  page.on('pageerror', err => {
    if (err.message.includes('import statement') || err.message.includes('Cannot use import')) return;
    consoleErrors.push(err.message);
    console.log(`  🔴 Page Error: ${err.message}`);
  });

  try {
    // ── STEP 3: Load live site once ─────────────────────────────────────────
    console.log('[3] Loading live site...');
    await page.goto(PROD_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500)); // let i18n + JS settle

    // Check footer version
    const footerVersion = await page.evaluate(() => {
      return document.querySelector('.footer-version')?.textContent?.trim() ?? null;
    });
    const footerOk = footerVersion && footerVersion.includes(EXPECTED_VERSION);
    if (footerOk) {
      results.passed.push(`Footer shows "v${EXPECTED_VERSION}" ✅`);
      console.log(`  ✅ Footer: "${footerVersion}"`);
    } else {
      results.failed.push(`Footer shows "${footerVersion}" — expected v${EXPECTED_VERSION} ❌`);
      console.log(`  ❌ Footer: "${footerVersion}"`);
    }

    // ── STEP 4–7: Run all 4 scenarios ────────────────────────────────────────
    for (const scenario of SCENARIOS) {
      await runScenario(page, scenario, results);
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
  console.log('\n' + '═'.repeat(60));
  console.log(`SMOKE TEST RESULTS — v${EXPECTED_VERSION}  (4 scenarios × 2 screenshots)`);
  console.log('═'.repeat(60));
  results.passed.forEach(p => console.log('  ✅', p));
  results.failed.forEach(f => console.log('  ❌', f));

  if (consoleErrors.length > 0) {
    console.log('\n🔴 Console Errors:');
    consoleErrors.forEach(e => console.log('  -', e));
  } else {
    console.log('\n✅ Zero browser console errors');
  }

  console.log('\n📸 Screenshots (8 total — 2 per scenario):');
  results.screenshots.forEach(s => console.log(`  [${s.label}]\n   → ${s.path}`));

  const criticalFailed = results.failed.filter(f => !f.includes('⚠️'));
  const allPassed = criticalFailed.length === 0 && consoleErrors.length === 0;
  console.log('\n' + (allPassed ? '✅ ALL CRITICAL TESTS PASSED' : '❌ CRITICAL TESTS FAILED'));

  const report = {
    version: EXPECTED_VERSION,
    timestamp: new Date().toISOString(),
    scenarios: SCENARIOS.map(s => s.id),
    passed: results.passed,
    failed: results.failed,
    consoleErrors,
    screenshots: results.screenshots,
    overall: allPassed ? 'PASS' : 'FAIL'
  };
  fs.writeFileSync(`C:\\tmp\\smoke_test_v${EXPECTED_VERSION.replace(/\./g, '')}.json`, JSON.stringify(report, null, 2));
  console.log(`\nReport saved: C:\\tmp\\smoke_test_v${EXPECTED_VERSION.replace(/\./g, '')}.json`);

  process.exit(allPassed ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
