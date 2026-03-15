/**
 * patch_era_caveo_image.mjs — One-shot Firestore patch to fix ERA Caveo image.
 * Finds all Firestore documents where manufacturer='ERA' and model_name contains 'Caveo'
 * and updates lock_image to the correct thumbturn product photo from safe.co.uk.
 * Run: node patch_era_caveo_image.mjs
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load service account same way as the main server
const serviceAccountPath = join(__dirname, 'server', 'service-account.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

const CORRECT_THUMBTURN_IMAGE = 'https://assets-a.safe.co.uk/products/grande/156257.jpg';
const CORRECT_PRODUCT_URL    = 'https://www.safe.co.uk/products/caveo-3-star-euro-thumbturn-cylinder-35-35-70.html';

async function patchEraeCaveo() {
    console.log('[Patch] Searching Firestore for ERA Caveo documents...');
    const snap = await db.collection('locks').get();
    
    let patched = 0;
    const batch = db.batch();
    
    snap.forEach(doc => {
        const data = doc.data();
        const mfr = (data.manufacturer ?? '').toLowerCase();
        const model = (data.model_name ?? '').toLowerCase();
        
        if (mfr.includes('era') && model.includes('caveo')) {
            console.log(`  → Patching doc ${doc.id}: "${data.manufacturer} ${data.model_name}"`);
            console.log(`    Old image: ${data.lock_image}`);
            console.log(`    New image: ${CORRECT_THUMBTURN_IMAGE}`);
            batch.update(doc.ref, {
                lock_image: CORRECT_THUMBTURN_IMAGE,
                product_url: CORRECT_PRODUCT_URL,
            });
            patched++;
        }
    });
    
    if (patched === 0) {
        console.log('[Patch] No ERA Caveo documents found in Firestore.');
        console.log('[Patch] Listing all documents for reference:');
        snap.forEach(doc => {
            const d = doc.data();
            console.log(`  - ${d.manufacturer} ${d.model_name}`);
        });
    } else {
        await batch.commit();
        console.log(`[Patch] ✅ Successfully patched ${patched} ERA Caveo document(s).`);
    }
    process.exit(0);
}

patchEraeCaveo().catch(err => {
    console.error('[Patch] ❌ Error:', err);
    process.exit(1);
});
