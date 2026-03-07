import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

// System browser detection for puppeteer-core
const SYSTEM_BROWSERS = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

function getSystemBrowserPath() {
    for (const p of SYSTEM_BROWSERS) {
        if (fs.existsSync(p)) return p;
    }
    throw new Error('No system Chrome or Edge found.');
}

const TARGET_URL = 'https://lock-recon.web.app/';
const TEST_COUNT = 20;
const OUTPUT_DIR = path.resolve('test_evidence');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
}

const delay = ms => new Promise(res => setTimeout(res, ms));

async function runExhaustiveTest() {
    console.log(`[+] Launching Headless Operations against ${TARGET_URL}...`);
    const browser = await puppeteer.launch({
        headless: 'new',
        executablePath: getSystemBrowserPath(),
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--window-size=1920,1080'
        ]
    });
    const page = await browser.newPage();

    // Disable unnecessary resources
    await page.setRequestInterception(true);
    page.on('request', req => {
        if (req.resourceType() === 'image' && !req.url().includes('lock-recon')) {
            req.continue();
        } else {
            req.continue();
        }
    });

    console.log(`[+] Navigating to Lock Recon UI...`);
    await page.goto(TARGET_URL, { waitUntil: 'networkidle2' });
    await delay(3000); // Allow JS rendering and Firebase pull

    // Get all lock cards
    const locks = await page.$$('.lock-card');
    console.log(`[+] Acquired ${locks.length} total lock targets on the UI.`);

    if (locks.length === 0) {
        console.error('[-] CRITICAL: No locks populated in UI.');
        await browser.close();
        process.exit(1);
    }

    // Shuffle array for randomness
    const shuffled = locks.sort(() => 0.5 - Math.random());
    const selectedLocks = shuffled.slice(0, Math.min(TEST_COUNT, locks.length));

    console.log(`[+] Commencing ${selectedLocks.length}-point random deep-link penetration via UI...`);

    let passed = 0;
    let failed = 0;
    let screenshotCount = 0;

    for (let i = 0; i < selectedLocks.length; i++) {
        const lock = selectedLocks[i];

        // Extract basic info from the card before clicking
        const mfg = await lock.$eval('.manufacturer', el => el.innerText).catch(() => 'Unknown');
        const model = await lock.$eval('.model-name', el => el.innerText).catch(() => 'Unknown');

        console.log(`\n  [Target ${i + 1}/${selectedLocks.length}] Engaging ${mfg} - ${model}...`);

        try {
            // Click the card
            await lock.click();
            await delay(1000); // wait for modal

            // Find the execute button in the modal
            const executeBtn = await page.$('.btn-purchase');
            if (!executeBtn) {
                console.log(`    [-] FAILED: No EXECUTE PURCHASE button found in modal.`);
                failed++;
                continue;
            }

            // Extract the deep link URL directly to test it
            const executionUrl = await page.$eval('.btn-purchase', el => el.href);
            console.log(`    [+] Intercepted Execution Vector: ${executionUrl}`);

            // Test the URL in a new isolated tab to prevent ruining the main UI state
            const targetPage = await browser.newPage();

            targetPage.on('response', resp => {
                // Ignore non-document responses
                if (resp.request().resourceType() === 'document') {
                    // console.log(`      -> HTTP ${resp.status()} [${resp.url()}]`);
                }
            });

            // Navigate and catch response
            const response = await targetPage.goto(executionUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

            if (!response) {
                console.log(`    [-] FAILED: No response from target domain.`);
                failed++;
            } else {
                const status = response.status();
                if (status >= 400) {
                    console.log(`    [-] FAILED: Target domain responded with HTTP ${status}`);
                    failed++;
                } else {
                    console.log(`    [+] VERIFIED: Deep link resolved successfully (HTTP ${status}).`);
                    passed++;

                    // Capture 3 randomized screenshots of the successful domains as evidence
                    if (screenshotCount < 3) {
                        const shotPath = path.join(OUTPUT_DIR, `verify_domain_${screenshotCount + 1}.png`);
                        await targetPage.screenshot({ path: shotPath });
                        console.log(`    [+] Captured domain evidence: ${shotPath}`);
                        screenshotCount++;
                    }
                }
            }

            await targetPage.close();

            // Close the modal on the main UI
            const closeModalBtn = await page.$('.close-modal');
            if (closeModalBtn) {
                await closeModalBtn.click();
                await delay(500);
            } else {
                // escape fallback
                await page.keyboard.press('Escape');
                await delay(500);
            }

        } catch (error) {
            console.log(`    [-] ERROR evaluating target: ${error.message}`);
            failed++;
        }
    }

    console.log(`\n╔══════════════════════════════════════════════════════╗`);
    console.log(`║  TEST RESULTS: ${passed}/${selectedLocks.length} passed (${Math.round((passed / selectedLocks.length) * 100)}%)`);
    if (failed === 0) {
        console.log(`║  STATUS: ✅ 100% BULLETPROOF                `);
    } else {
        console.log(`║  STATUS: ❌ FAILED DEEP LINKS DETECTED       `);
    }
    console.log(`╚══════════════════════════════════════════════════════╝\n`);

    await browser.close();
}

runExhaustiveTest().catch(err => {
    console.error(`[-] FATAL ERROR: `, err);
});
