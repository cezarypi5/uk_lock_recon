import puppeteer from 'puppeteer';

(async () => {
    console.log("🚀 Initializing Latency Benchmark Environment...");
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    let dbLatencyLog = "";
    let liveLatencyLog = "";

    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('[LATENCY]')) {
            console.log(`[Captured] ${text}`);
            if (text.toLowerCase().includes('firestore') || text.toLowerCase().includes('database') || text.toLowerCase().includes('db')) {
                dbLatencyLog = text;
            } else if (text.toLowerCase().includes('live')) {
                liveLatencyLog = text;
            } else {
                // Fallback if not distinctly named
                if (!dbLatencyLog) dbLatencyLog = text;
                else liveLatencyLog = text;
            }
        }
    });

    try {
        console.log("\n[1] Testing Database Sync (Firestore)...");
        await page.goto('https://lock-recon.web.app/', { waitUntil: 'networkidle2' });

        console.log("    Clicking 'FIND LOCKS' in Standard Mode...");
        await page.waitForSelector('#btn-scan');
        await page.click('#btn-scan');

        // Wait for overlay to disappear
        await new Promise(r => setTimeout(r, 4000));

        console.log("\n[2] Testing Live Scrape (Puppeteer Backend)...");
        await page.goto('https://lock-recon.web.app/?mode=live', { waitUntil: 'networkidle2' });

        console.log("    Clicking 'FIND LOCKS' in Live Mode...");
        await page.waitForSelector('#btn-scan');
        await page.click('#btn-scan');

        console.log("    Waiting for Scraper API to return (up to 60s)...");
        // Wait until btn-scan is re-enabled to signal completion
        await page.waitForFunction(() => {
            const btn = document.querySelector('#btn-scan');
            return btn && btn.disabled === false;
        }, { timeout: 60000 });

        await new Promise(r => setTimeout(r, 1000));

        console.log("\n=========================================");
        console.log("📊 LATENCY BENCHMARK RESULTS ");
        console.log("=========================================");
        console.log(`👉 Database Sync: ${dbLatencyLog || 'No log found'}`);
        console.log(`👉 Live Scrape  : ${liveLatencyLog || 'No log found'}`);
        console.log("=========================================\n");

    } catch (e) {
        console.error("Test encountered an error:", e);
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
