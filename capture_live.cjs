const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1024 });

    console.log('Navigating to live site...');
    await page.goto('https://lock-recon.web.app/', { waitUntil: 'networkidle0' });

    // Wait for DB sync to finish
    await page.waitForFunction('!document.querySelector("#db-sync-readout").innerText.includes("CALCULATING")');

    // Click Any Budget, External env, Anti-Snap
    await page.click('input[name="attack"][value="anti-snap"]');

    console.log('Running scan...');
    // Click scan
    await page.click('#btn-scan');

    // Wait for grid to populate
    await page.waitForSelector('.lock-card');

    // Slight pause to ensure animations finish
    await new Promise(r => setTimeout(r, 2000));

    const screenshotPath = 'C:\\Users\\Cezary\\.gemini\\antigravity\\brain\\9eb91161-d63c-4c08-8b38-c373d6e2b064\\live_production_test.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Saved detailed screenshot to: ${screenshotPath}`);

    await browser.close();
})();
