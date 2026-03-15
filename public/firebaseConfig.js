import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, getDocs, onSnapshot, query, orderBy, limit, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// The true configuration for 'Lock Recon'
const firebaseConfig = {
    apiKey: "AIzaSyDmdlKy02VLAM6RLsiEGuBfU10JVK3Jq78",
    authDomain: "lock-recon.firebaseapp.com",
    projectId: "lock-recon",
    storageBucket: "lock-recon.firebasestorage.app",
    messagingSenderId: "482615452902",
    appId: "1:482615452902:web:db5274b580a814b46d0727"
};

let app, db;
try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);

    // ── v1.7.5: Enable IndexedDB offline persistence ──────────────────────────
    // Caches Firestore reads locally — repeat loads serve from IndexedDB instantly
    // instead of always hitting the network. Silently fails in multi-tab scenarios
    // (benign — one tab holds the lock, others fall back to network).
    enableIndexedDbPersistence(db).catch(err => {
        if (err.code === 'failed-precondition') {
            // Multiple tabs open — persistence only works in one tab at a time
            console.info('[Firestore] Offline persistence unavailable (multiple tabs).');
        } else if (err.code === 'unimplemented') {
            // Browser doesn't support IndexedDB (rare)
            console.info('[Firestore] Offline persistence not supported by this browser.');
        }
    });

    console.log('[Firebase Config] Web SDK initialized with offline persistence.');
} catch (error) {
    console.error('[Firebase Config] Error initializing Web SDK:', error);
}

export { db, collection, getDocs, onSnapshot, query, orderBy, limit };

