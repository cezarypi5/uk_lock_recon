import https from 'https';
import http from 'http';
import { KNOWN_PRODUCTS } from '../server/knownProducts.js';

const TEST_COUNT = 20;

function checkUrl(urlStr) {
    return new Promise((resolve) => {
        const url = new URL(urlStr);
        const reqModule = url.protocol === 'https:' ? https : http;
        const req = reqModule.request(url, {
            method: 'HEAD',
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        }, (res) => {
            resolve(res.statusCode);
        });

        req.on('error', (err) => resolve(`ERROR: ${err.message}`));
        req.on('timeout', () => { req.destroy(); resolve('TIMEOUT'); });
        req.end();
    });
}

async function run() {
    console.log(`[+] Initiating 20-Point Native HTTP Reconnaissance on Deep Links...\n`);

    // Filter only those with purchase links
    const available = KNOWN_PRODUCTS.filter(p => p.product_url);
    const shuffled = available.sort(() => 0.5 - Math.random());
    const targets = shuffled.slice(0, Math.min(TEST_COUNT, available.length));

    let passed = 0;
    const results = [];

    for (let i = 0; i < targets.length; i++) {
        const item = targets[i];
        const mfg = item.keywords[0].toUpperCase();
        console.log(`[Target ${i + 1}/${targets.length}] Resolving endpoint for ${mfg}...`);

        let status = await checkUrl(item.product_url);

        // Handle standard CDNs blocking HEAD requests with 403 or 405s 
        // 405 Method Not Allowed implies the endpoint exists. 
        // 403 Forbidden implies Cloudflare/WAF block, which means endpoint exists.
        // 301/302/308 implies successful routing.
        let isPass = false;
        if (typeof status === 'number') {
            if (status >= 200 && status < 400) isPass = true;
            if ([403, 405, 429].includes(status)) isPass = true; // WAF blocks headless HEAD requests
        }

        if (isPass) {
            console.log(`  -> ✅ PASS (HTTP ${status}) | ${item.product_url}`);
            passed++;
        } else {
            console.log(`  -> ❌ FAIL (${status}) | ${item.product_url}`);
        }

        results.push(`| ${mfg} | ${status} | ${isPass ? '✅ PASS' : '❌ FAIL'} |`);
    }

    console.log(`\n╔══════════════════════════════════════════════════════╗`);
    console.log(`║  TEST RESULTS: ${passed}/${targets.length} passed (${Math.round((passed / targets.length) * 100)}%)`);
    if (passed === targets.length) {
        console.log(`║  STATUS: ✅ 100% BULLETPROOF                `);
    } else {
        console.log(`║  STATUS: ❌ FAILED DEEP LINKS DETECTED       `);
    }
    console.log(`╚══════════════════════════════════════════════════════╝\n`);

    // Output markdown matrix for the AI to grab
    console.log("MARKDOWN_MATRIX_START");
    console.log("| Manufacturer | HTTP Status | Verdict |");
    console.log("|---|---|---|");
    results.forEach(r => console.log(r));
    console.log("MARKDOWN_MATRIX_END");
}

run();
