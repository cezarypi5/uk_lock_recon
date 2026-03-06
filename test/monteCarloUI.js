import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\Cezary\\.gemini\\antigravity\\brain\\fc3dc004-9f46-4808-ba6e-b00124e73b51';
const TARGET_URL = 'https://lock-recon.web.app/';
const delay = ms => new Promise(res => setTimeout(res, ms));

const testParameters = {
    tiers: ['any', 'basic', 'high', 'elite', 'top-notch'],
    budgets: ['any', 'under40', '40-70', '70-100', '100plus'],
    environments: ['any', 'external', 'internal'],
    doors: ['any', 'upvc', 'composite', 'timber', 'aluminium'],
    attacks: ['anti-snap', 'anti-bump', 'anti-drill', 'anti-pick', 'anti-extract'],
    cylinderTypes: ['any', 'double', 'thumbturn']
};

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

async function runMonteCarlo() {
    console.log('--- INITIALIZING MONTE CARLO UI TESTING ENGINE ---');
    const browser = await puppeteer.launch({
        headless: "new",
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1536, height: 1080 });

    const numTests = 5;
    const results = [];

    for (let i = 1; i <= numTests; i++) {
        console.log(`\n>[TEST ${i}/${numTests}] Navigating to target...`);
        await page.goto(TARGET_URL, { waitUntil: 'networkidle0' });

        // Click RESET FILTERS to ensure clean slate
        await page.click('#btn-reset');
        await delay(500);

        // Generate random constraints
        const tier = getRandomElement(testParameters.tiers);
        const budget = getRandomElement(testParameters.budgets);
        const env = getRandomElement(testParameters.environments);
        const door = getRandomElement(testParameters.doors);
        const cylType = getRandomElement(testParameters.cylinderTypes);

        const activeAttacks = [];
        const numAttacks = getRandomInt(0, 3);
        const shuffledAttacks = [...testParameters.attacks].sort(() => 0.5 - Math.random());
        for (let j = 0; j < numAttacks; j++) {
            activeAttacks.push(shuffledAttacks[j]);
        }

        let sizeDesc = "";
        const isAdvanced = Math.random() > 0.5;
        if (isAdvanced) {
            // Split
            await page.click('#advanced-toggle');
            await delay(300);
            const ext = getRandomInt(30, 80);
            const int = getRandomInt(30, 80);

            await page.evaluate(() => document.getElementById('size-external').value = '');
            await page.type('#size-external', ext.toString());

            await page.evaluate(() => document.getElementById('size-internal').value = '');
            await page.type('#size-internal', int.toString());
            sizeDesc = `${ext}/${int}mm (Asymmetric)`;
        } else {
            // Total Length
            const total = getRandomInt(60, 110);
            await page.evaluate(() => document.getElementById('size-total').value = '');
            await page.type('#size-total', total.toString());
            sizeDesc = `${total}mm (Total)`;
        }

        console.log(`  Applying Parameters:`);
        console.log(`  - Tier: ${tier}`);
        await page.click(`input[name="security-tier"][value="${tier}"]`);

        console.log(`  - Budget: ${budget}`);
        await page.click(`input[name="budget"][value="${budget}"]`);

        console.log(`  - Env: ${env}`);
        await page.click(`input[name="environment"][value="${env}"]`);

        console.log(`  - Door: ${door}`);
        await page.click(`input[name="door-type"][value="${door}"]`);

        if (activeAttacks.length > 0) {
            console.log(`  - Attacks: ${activeAttacks.join(', ')}`);
            for (const attack of activeAttacks) {
                await page.click(`input[name="attack"][value="${attack}"]`);
            }
        } else {
            console.log(`  - Attacks: None required`);
        }

        console.log(`  - Cyl Size: ${sizeDesc}`);

        console.log(`  - Cyl Type: ${cylType}`);
        await page.click(`input[name="cylinder-type"][value="${cylType}"]`);

        console.log(`  Initiating Scan...`);
        await page.click('#btn-scan');

        await delay(1000);
        try {
            await page.waitForFunction(() => {
                const overlay = document.getElementById('scan-overlay');
                return overlay.hasAttribute('hidden');
            }, { timeout: 8000 });
        } catch (e) {
            console.log('  Overlay wait timeout, assuming done.');
        }
        await delay(500);

        const statusText = await page.$eval('#status-count', el => el.innerText);
        console.log(`  Outcome: ${statusText}`);

        const screenshotName = `monte_carlo_outcome_${i}_${Date.now()}.png`;
        const screenshotPath = path.join(ARTIFACT_DIR, screenshotName);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`  Snapshot Saved: ${screenshotName}`);

        results.push({
            iteration: i,
            tier, budget, env, door, activeAttacks, sizeDesc, cylType,
            outcome: statusText,
            screenshot: screenshotPath,
            screenshotName
        });
    }

    await browser.close();
    console.log('\n--- MONTE CARLO TESTING COMPLETE ---');
    fs.writeFileSync('test/monteCarloResults.json', JSON.stringify(results, null, 2));
}

runMonteCarlo().catch(console.error);
