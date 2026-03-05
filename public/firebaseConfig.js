import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// The configuration exacted from the authentic Firebase Web App
const firebaseConfig = {
    apiKey: "AIzaSyDaMOolKyaTb7eFv2Avrz_fUl15TJrTpew",
    authDomain: "gen-lang-client-0116991831.firebaseapp.com",
    projectId: "gen-lang-client-0116991831",
    storageBucket: "gen-lang-client-0116991831.firebasestorage.app",
    messagingSenderId: "349182924142",
    appId: "1:349182924142:web:172aef648a8db78019dd7f",
    measurementId: "G-SDF0BWL770"
};

let app, db;
try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('[Firebase Config] Web SDK initialized.');
} catch (error) {
    console.error('[Firebase Config] Error initializing Web SDK:', error);
}

export { db, collection, getDocs, onSnapshot };
