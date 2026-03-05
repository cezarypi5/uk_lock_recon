import admin from 'firebase-admin';
import fs from 'fs';

// Initialize Firebase Admin securely.
let serviceAccount;

try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        // Used in GitHub Actions
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
        // Used in local testing (Z: drive)
        const localKeyPath = new URL('./service-account.json', import.meta.url);
        if (fs.existsSync(localKeyPath)) {
            serviceAccount = JSON.parse(fs.readFileSync(localKeyPath, 'utf8'));
        }
    }

    if (serviceAccount) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('[Firebase Admin] Successfully initialized.');
    } else {
        console.warn('[Firebase Admin] Skipping initialization: No service account provided.');
    }
} catch (error) {
    console.error('[Firebase Admin] Initialization failed:', error);
}

const db = admin.apps.length ? admin.firestore() : null;

export { admin, db };
