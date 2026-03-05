import { fetchWithPuppeteer } from './server/puppeteerFetch.js';

async function test(name, url) {
    console.log(`\n[${name}] Testing stealth bypass: ${url}`);
    try {
        const html = await fetchWithPuppeteer(url, { timeoutMs: 25000, extraDelayMs: 3000 });
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : '(no title)';
        const isBlocked =
            html.includes('Just a moment') ||
            html.includes('Checking your browser') ||
            html.includes('cf-chl-') ||
            html.includes('Access Denied') ||
            html.includes('403 Forbidden') ||
            html.length < 3000;
        const hasProducts =
            html.toLowerCase().includes('cylinder') ||
            html.toLowerCase().includes('ts007') ||
            html.toLowerCase().includes('break secure') ||
            html.toLowerCase().includes('fortress') ||
            html.toLowerCase().includes('anti-snap');
        console.log(`  Title   : ${title}`);
        console.log(`  Size    : ${html.length} chars`);
        console.log(`  Blocked : ${isBlocked ? '❌ YES - bot protection active' : '✅ NO - stealth worked!'}`);
        console.log(`  Products: ${hasProducts ? '✅ YES - content found' : '❌ NO - no product content'}`);
        return { ok: !isBlocked && hasProducts, title, size: html.length };
    } catch (err) {
        console.error(`  ERROR: ${err.message}`);
        return { ok: false, error: err.message };
    }
}

const mtl = await test('Mul-T-Lock', 'https://mul-t-lock.com/uk/products/cylinders/break-secure/');
const era = await test('ERA', 'https://www.erahomesecurity.com/products/cylinders/');

console.log(`\n=== STEALTH TEST RESULTS ===`);
console.log(`Mul-T-Lock: ${mtl.ok ? '✅ BYPASS SUCCESS' : '❌ STILL BLOCKED'}`);
console.log(`ERA:        ${era.ok ? '✅ BYPASS SUCCESS' : '❌ STILL BLOCKED'}`);
