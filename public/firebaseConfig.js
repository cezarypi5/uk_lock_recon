import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, getDocs, onSnapshot, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

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
    console.log('[Firebase Config] Web SDK initialized.');
} catch (error) {
    console.error('[Firebase Config] Error initializing Web SDK:', error);
}

export { db, collection, getDocs, onSnapshot, query, orderBy, limit };
