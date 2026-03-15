import express from 'express';
import { fetchWithPuppeteer } from './server/puppeteerFetch.js';
import fs from 'fs';

const app = express();
const port = 3055;

// Endpoint that returns the requested HTTP status code
app.get('/status/:code', (req, res) => {
    const code = parseInt(req.params.code, 10);
    res.status(code).send(`This is a mock response for HTTP ${code}`);
});

let server;

async function runTests() {
    await new Promise(resolve => {
        server = app.listen(port, resolve);
    });
    console.log(`[TEST] Mock server started on port ${port}`);

    const results = [];
    const permutations = [];

    // Generate 100 random HTTP status codes between 400 and 599
    for (let i = 0; i < 100; i++) {
        permutations.push(Math.floor(Math.random() * (599 - 400 + 1)) + 400);
    }

    console.log(`[TEST] Generated 100 random HTTP Error Codes: \n${permutations.join(', ')}\n`);

    let passCount = 0;

    for (const code of permutations) {
        process.stdout.write(`[TEST] Fetching HTTP ${code} permutation... `);
        const url = `http://localhost:${port}/status/${code}`;
        try {
            await fetchWithPuppeteer(url, { timeoutMs: 3000, extraDelayMs: 0 });
            console.log(`❌ FAIL: Script did not abort on HTTP ${code}`);
            results.push({ code, status: 'FAIL' });
        } catch (err) {
            if (err.message.includes(`HTTP ${code}`) || err.message.includes('Protocol Error') || err.message.includes('WAF Block')) {
                console.log(`✅ PASS: Gracefully caught HTTP ${code} (${err.message})`);
                passCount++;
                results.push({ code, status: 'PASS' });
            } else {
                console.log(`⚠️ UNKNOWN ERROR: caught ${err.message}`);
                results.push({ code, status: 'UNKNOWN' });
            }
        }
    }

    console.log(`\n=========================================`);
    console.log(`[TEST SUMMARY] ${passCount}/100 passed successfully.`);
    console.log(`=========================================\n`);

    const logPath = './logs/100_permutations_results.log';
    fs.mkdirSync('./logs', { recursive: true });
    fs.writeFileSync(logPath, `100 Permutations Test Run\nTotal Passed: ${passCount}/100\n\n` + results.map(r => `HTTP ${r.code}: ${r.status}`).join('\n'));
    console.log(`[TEST] Results saved to ${logPath}`);

    server.close();
    process.exit(0);
}

runTests().catch(err => {
    console.error(err);
    if (server) server.close();
    process.exit(1);
});
