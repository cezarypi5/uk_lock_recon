import 'dotenv/config';
import targets from './targets.js';
import { scrapeTarget } from './selfHeal.js';
import * as telemetry from './telemetry.js';
import { KNOWN_PRODUCTS, applyKnownProductFallbacks } from './knownProducts.js';
import { db } from './firebaseAdmin.js'; // Firebase Cloud connection
import { LinkValidator } from './lib/LinkValidator.js';

function knownProductToLock(entry, index) {
    const kw = entry.keywords ?? [];
    const manufacturer = kw[0] ? kw[0].charAt(0).toUpperCase() + kw[0].slice(1) : 'Unknown';
    const model = kw.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || `${manufacturer} High-Security Cylinder`;

    return {
        manufacturer,
        model_name: model,
        security_accreditations: deriveAccreditations(entry.security_tier),
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
        _source: 'offline_database',
    };
}

function deriveAccreditations(tier) {
    if (tier === 'top-notch') return ['TS007 3*', 'SS312 Diamond', 'BS3621'];
    if (tier === 'elite') return ['TS007 3*', 'SS312 Diamond'];
    if (tier === 'high') return ['TS007 3*'];
    return ['BS3621'];
}



async function runNightlyScrape() {
    console.log('\n┌─────────────────────────────────────────────┐');
    console.log('│  UK LOCK-SPEC RECONNAISSANCE                │');
    console.log('│  Nightly Background Worker Starting...      │');
    console.log('└─────────────────────────────────────────────┘\n');

    if (!db) {
        console.error('[Worker] Fatal Error: Firebase database is not initialized. Cannot store results!');
        process.exit(1);
    }

    telemetry.startRun();
    let finalLocks = [];

    try {
        const results = await Promise.allSettled(
            targets.map(target => scrapeTarget(target))
        );

        const allLocks = results.flatMap((result, i) => {
            if (result.status === 'fulfilled') {
                return result.value;
            } else {
                console.error(`[Worker] Target ${targets[i].name} promise rejected: ${result.reason}`);
                return [];
            }
        });

        const report = telemetry.endRun();

        if (allLocks.length === 0) {
            console.warn('[Worker] ⚠ Live scrape returned 0 locks — falling back to offline database');
            finalLocks = KNOWN_PRODUCTS.map(knownProductToLock);
        } else {
            finalLocks = applyKnownProductFallbacks(allLocks);
        }

        console.log(`[Worker] Scrape finished. Found ${finalLocks.length} locks. Writing to Firestore...`);

        // Use a Firestore Batch write to upload all records and telemetry simultaneously
        const batch = db.batch();
        const locksRef = db.collection('locks');

        console.log(`[Worker] Validating and sanitizing ${finalLocks.length} locked routes via LinkValidator...`);

        for (const lock of finalLocks) {
            const docId = lock.manufacturer.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() + '_' + lock.model_name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
            const docRef = locksRef.doc(docId);

            // Autonomous URL Self-Healing Filter before committing to Live Database
            lock.product_url = await LinkValidator.validateAndHeal(lock.product_url);

            batch.set(docRef, lock);
        }

        // Add a telemetry run record
        const runRef = db.collection('telemetry_runs').doc(`run_${Date.now()}`);
        batch.set(runRef, {
            timestamp: new Date().toISOString(),
            locksExtracted: finalLocks.length,
            ...report
        });

        await batch.commit();

        // Write a lightweight metadata/last_sync document the frontend reads to show "last updated"
        await db.collection('metadata').doc('last_sync').set({
            syncedAt: new Date().toISOString(),
            locksCount: finalLocks.length,
            runDurationMs: report.durationMs ?? null,
            overallStatus: report.overallStatus ?? 'SUCCESS'
        });

        console.log('[Worker] ✨ Firebase Firestore successfully updated with fresh locks.');
        console.log('\n[Worker] 🏁 Nightly scrape cycle complete. Exiting gracefully.');
        process.exit(0);

    } catch (err) {
        console.error('[Worker] Fatal error during scrape cycle:', err);
        process.exit(1);
    }
}

// Execute the worker when the file is run directly by GitHub Actions (or manually via node)
runNightlyScrape();
