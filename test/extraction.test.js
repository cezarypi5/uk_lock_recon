/**
 * extraction.test.js — Validation test suite for /api/locks endpoint.
 * Tests all 7 required fields, accreditation validity, data formats.
 * Exits 0 on all pass, 1 on any failure.
 */

const BASE_URL = 'http://127.0.0.1:3000';
const REQUIRED_FIELDS = ['manufacturer', 'model_name', 'security_accreditations', 'price_gbp', 'product_url', 'lock_image', 'reviews'];
const VALID_ACCREDITATIONS = ['TS007 3*', 'SS312 Diamond', 'BS3621'];
const PRICE_REGEX = /^£[\d,]+(\.\d{2})?$|^N\/A$/;
const URL_PATTERN = /^https?:\/\/.+/;
const REAL_PRICE_PATTERN = /^£[\d,]+(\.\d{2})?$/;
const FORCE_REFRESH = process.argv.includes('--refresh');

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, testName, detail = '') {
    if (condition) {
        console.log(`  ✅ PASS │ ${testName}`);
        passed++;
    } else {
        console.log(`  ❌ FAIL │ ${testName}${detail ? ` — ${detail}` : ''}`);
        failed++;
        failures.push(`${testName}${detail ? ': ' + detail : ''}`);
    }
}

async function runTests() {
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║  UK LOCK-SPEC RECON — EXTRACTION TEST SUITE         ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');

    // ── Test 1: Server is reachable ────────────────────────────────────
    console.log(`► TEST GROUP 1: API Connectivity${FORCE_REFRESH ? ' + Fresh Scrape' : ' (cached)'}\n`);
    let data;
    try {
        const apiUrl = `${BASE_URL}/api/locks${FORCE_REFRESH ? '?refresh=true' : ''}`;
        if (FORCE_REFRESH) {
            console.log('  ℹ️  Triggering fresh scrape (this takes ~2 mins with optimisations)…\n');
        }
        const fetchOptions = FORCE_REFRESH
            ? { signal: AbortSignal.timeout(15 * 60 * 1000) }
            : {};
        const res = await fetch(apiUrl, fetchOptions);
        assert(res.ok, `GET ${apiUrl} returns HTTP 200`, `Received ${res.status}`);
        data = await res.json();
        assert(data && typeof data === 'object', 'Response is valid JSON object');
        assert(data.status === 'ok', `Response status is "ok"`, `Got "${data.status}"`);
        assert(Array.isArray(data.locks), 'Response contains "locks" array');
        if (FORCE_REFRESH) {
            assert(data.cached === false, 'Response is a fresh scrape (not cached)', `cached=${data.cached}`);
        }
    } catch (err) {
        console.error(`\n  ⛔ FATAL: Cannot reach ${BASE_URL} — is the server running? (npm start)\n`);
        console.error(`  Error: ${err.message}\n`);
        process.exit(1);
    }

    const locks = data.locks ?? [];

    // ── Test 2: Minimum target success ──────────────────────────────────────
    console.log('\n► TEST GROUP 2: Extraction Volume\n');
    const telem = data.telemetry ?? null;
    if (telem) {
        assert(telem.successTargets >= 4, `≥ 4/5 targets succeeded`, `Got ${telem.successTargets}/5`);
    } else {
        console.log('  ℹ️  No telemetry in response — skipping target count assertion (cached result)');
    }
    assert(locks.length > 0, 'At least 1 lock extracted', `Got ${locks.length}`);

    if (locks.length === 0) {
        console.log('\n  ⚠️  No locks to validate — skipping per-lock tests.\n');
    } else {
        // ── Test 3: Per-lock field validation ───────────────────────────────
        console.log(`\n► TEST GROUP 3: Per-Lock Field Validation (${locks.length} locks)\n`);

        locks.forEach((lock, i) => {
            const id = `Lock[${i}] ${lock.manufacturer ?? '?'} ${lock.model_name ?? '?'}`;
            console.log(`  ── ${id} ──`);

            // 3a: All 7 fields present
            REQUIRED_FIELDS.forEach(field => {
                assert(
                    field in lock && lock[field] !== undefined,
                    `${id} has field "${field}"`,
                );
            });

            // 3b: At least one valid accreditation
            const accreds = Array.isArray(lock.security_accreditations) ? lock.security_accreditations : [];
            const hasValidAccred = accreds.some(a => VALID_ACCREDITATIONS.includes(a));
            assert(hasValidAccred, `${id} has ≥1 valid accreditation`, `Got: ${JSON.stringify(accreds)}`);

            // 3c: Price format
            assert(
                typeof lock.price_gbp === 'string' && PRICE_REGEX.test(lock.price_gbp),
                `${id} price_gbp is £X.XX or N/A`,
                `Got: "${lock.price_gbp}"`
            );

            // 3d: Reviews is object with score/count or null
            const rev = lock.reviews;
            if (rev !== null) {
                assert(typeof rev === 'object', `${id} reviews is object or null`);
                assert(typeof rev.score === 'number' && rev.score >= 1 && rev.score <= 5, `${id} reviews.score is 1–5`, `Got: ${rev.score}`);
                assert(typeof rev.count === 'number' && rev.count >= 0, `${id} reviews.count is non-negative int`, `Got: ${rev.count}`);
            } else {
                assert(true, `${id} reviews is null (acceptable if no API key)`);
            }

            // 3e: model_name is non-empty string
            assert(
                typeof lock.model_name === 'string' && lock.model_name.length > 0,
                `${id} model_name is non-empty string`
            );

            // 3f: product_url must be a real https:// URL
            assert(
                URL_PATTERN.test(lock.product_url),
                `${id} product_url is a real URL`,
                `Got: "${lock.product_url}"`
            );

            // 3g: lock_image must be a real https:// URL
            assert(
                URL_PATTERN.test(lock.lock_image),
                `${id} lock_image is a real image URL`,
                `Got: "${lock.lock_image}"`
            );

            // 3h: price_gbp must be a real £X.XX value
            assert(
                REAL_PRICE_PATTERN.test(lock.price_gbp),
                `${id} price_gbp is a real £ value`,
                `Got: "${lock.price_gbp}"`
            );

            console.log('');
        });
    }

    // ── Test 4: /api/status endpoint ────────────────────────────────────────
    console.log('\n► TEST GROUP 4: Status / Telemetry Endpoint\n');
    try {
        const statusRes = await fetch(`${BASE_URL}/api/status`);
        assert(statusRes.ok, 'GET /api/status returns HTTP 200');
        const statusData = await statusRes.json();
        assert(statusData && typeof statusData === 'object', '/api/status returns JSON object');
        assert('status' in statusData, '/api/status has "status" field');
    } catch (err) {
        assert(false, 'GET /api/status reachable', err.message);
    }

    // ── Summary ──────────────────────────────────────────────────────────────
    const total = passed + failed;
    const pct = total > 0 ? Math.round((passed / total) * 100) : 0;
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log(`║  TEST RESULTS: ${passed}/${total} passed (${pct}%)${' '.repeat(Math.max(0, 22 - String(passed).length - String(total).length - String(pct).length))}║`);
    console.log(`║  STATUS: ${failed === 0 ? '✅ ALL TESTS PASSED' : `❌ ${failed} FAILING TEST(S)`}${' '.repeat(Math.max(0, 30 - (failed === 0 ? 18 : 12 + String(failed).length)))}║`);
    console.log('╚══════════════════════════════════════════════════════╝');

    if (failures.length > 0) {
        console.log('\n  Failures:');
        failures.forEach(f => console.log(`    • ${f}`));
    }

    console.log('');
    process.exit(failed === 0 ? 0 : 1);
}

runTests().catch(err => {
    console.error('[TEST RUNNER] Unhandled error:', err);
    process.exit(1);
});
