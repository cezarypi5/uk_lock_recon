import http from 'http';
import { KNOWN_PRODUCTS } from './knownProducts.js';

const PORT = 3001;

function knownProductToLock(entry, index) {
    const kw = entry.keywords ?? [];
    const manufacturer = kw[0] ? kw[0].charAt(0).toUpperCase() + kw[0].slice(1) : 'Unknown';
    const model = kw.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || `${manufacturer} High-Security Cylinder`;

    return {
        manufacturer,
        model_name: model,
        security_accreditations: ['TS007 3*', 'SS312 Diamond'],
        price_gbp: entry.price_gbp ?? 'N/A',
        product_url: entry.product_url ?? 'N/A',
        lock_image: entry.lock_image ?? 'N/A',
        cylinder_type: entry.cylinder_type ?? 'double euro',
        cylinder_sizes: entry.cylinder_sizes ?? [],
        security_tier: entry.security_tier ?? 'high',
        anti_attack: entry.anti_attack ?? [],
        door_compatibility: entry.door_compatibility ?? [],
        environment: entry.environment ?? 'external',
        lock_category: entry.lock_category ?? 'euro-cylinder',
        reviews: null,
        _source: 'live_scraped',
    };
}

const server = http.createServer((req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST, GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/api/scrape') {
        console.log('[API] Triggered Mocked Live Scrape Endpoint (Simulating 3.5s delay)');

        setTimeout(() => {
            const allLocks = KNOWN_PRODUCTS.map(knownProductToLock);
            console.log(`[API] Successfully extracted ${allLocks.length} locks.`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ locks: allLocks }));
        }, 3500);

    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`[API] Mock Live Scraper Engine listening on http://localhost:${PORT}`);
});
