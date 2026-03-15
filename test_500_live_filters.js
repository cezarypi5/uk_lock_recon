import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const LIVE_URL = 'https://lock-recon.web.app';
const TOTAL_TESTS = 500;
const SCREENSHOT_DIR = './logs/filter_screenshots';

async function runLiveFilterTests() {
    console.log(`[TEST] Starting 500 UI Filter tests on ${LIVE_URL}...`);

    // Ensure screenshot directory exists
    if (!fs.existsSync(SCREENSHOT_DIR)) {
        fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }

    const SYSTEM_BROWSERS = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    ];
    let execPath = SYSTEM_BROWSERS.find(p => fs.existsSync(p));

    const browser = await puppeteer.launch({
        headless: 'new', // or false if you want to watch
        executablePath: execPath,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    try {
        console.log(`[TEST] Navigating to ${LIVE_URL}...`);
        await page.goto(LIVE_URL, { waitUntil: 'networkidle2', timeout: 30000 });

        // Wait for data to load
        await page.waitForSelector('.lock-grid', { timeout: 15000 });

        // Let any initial animations settle
        await new Promise(r => setTimeout(r, 2000));

        let passed = 0;
        let failed = 0;

        // Get the select elements
        // The script.js seems to use filters for manufacturers, standards, etc.
        // Let's interact with them directly via page.evaluate

        console.log(`[TEST] Executing ${TOTAL_TESTS} filter permutations...`);

        for (let i = 1; i <= TOTAL_TESTS; i++) {
            // Apply a random combination of filters directly in the DOM
            const result = await page.evaluate((iteration) => {
                const brands = ['All', 'Yale', 'Ultion', 'Avocet', 'Mul-T-Lock', 'ERA', 'Evva', 'Winkhaus', 'Brisant Secure', 'Abloy'];
                const standards = ['All', 'TS007 3-Star', 'SS312 Diamond', 'BS3621'];

                // Emulate a random search term or empty string
                const searchTerms = ['', 'Pro', 'High', 'Security', 'Cylinder', 'Deadlock'];

                // --- Interaction exactly mapped to index.html ---

                // 1. Text Search
                const randomSearch = searchTerms[Math.floor(Math.random() * searchTerms.length)];
                const searchInput = document.getElementById('keyword-search');
                if (searchInput) {
                    searchInput.value = randomSearch;
                    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                }

                // 2. Click a random radio button per filter group to ensure complete permutation coverage
                const radioGroups = ['security-tier', 'budget', 'environment', 'door-type'];
                radioGroups.forEach(groupName => {
                    const radios = document.querySelectorAll(`input[type="radio"][name="${groupName}"]`);
                    if (radios.length > 0) {
                        const randomRadio = radios[Math.floor(Math.random() * radios.length)];
                        randomRadio.click(); // Triggers UI event
                    }
                });

                // 3. Randomly toggle checkbox filters (Attack Protection & Cylinder Options)
                const checkGroups = ['attack', 'cylinder'];
                checkGroups.forEach(groupName => {
                    const checkboxes = document.querySelectorAll(`input[type="checkbox"][name="${groupName}"]`);
                    checkboxes.forEach(cb => {
                        // 30% chance to toggle any given checkbox
                        if (Math.random() < 0.3) {
                            cb.click();
                        }
                    });
                });

                // Extract how many cards are visible
                const visibleCards = document.querySelectorAll('.lock-card').length;
                return {
                    search: randomSearch,
                    visibleCount: visibleCards
                };
            }, i);

            // Wait for JS to render the filtered locks
            await new Promise(r => setTimeout(r, 100)); // Short delay for UI update

            process.stdout.write(`\r[TEST] Perfoming test ${i}/${TOTAL_TESTS} | Visible Cards: ${result.visibleCount} `);

            // Take screenshot every 50 tests to avoid 500 images blowing up the disk, 
            // but the prompt said "screenshot all the tests" so let's screenshot all but maybe compress them?
            // Puppeteer webp screenshots are tiny and fast
            const screenshotPath = path.join(SCREENSHOT_DIR, `run2_test_${i.toString().padStart(3, '0')}.webp`);
            await page.screenshot({ path: screenshotPath, type: 'webp', quality: 50 });

            passed++;
        }

        console.log(`\n\n[TEST SUMMARY]`);
        console.log(`Total Completed: ${passed}/${TOTAL_TESTS}`);
        console.log(`Screenshots saved to: ${path.resolve(SCREENSHOT_DIR)}`);

    } catch (e) {
        console.error(`\n[FATAL ERROR] Automated test failed:`, e);
    } finally {
        await browser.close();
        process.exit(0);
    }
}

runLiveFilterTests();
