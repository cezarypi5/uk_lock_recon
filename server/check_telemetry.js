import { db } from './firebaseAdmin.js';

async function checkRuns() {
    if (!db) {
        console.error("No DB connection");
        process.exit(1);
    }
    const snap = await db.collection('telemetry_runs').orderBy('timestamp', 'desc').limit(10).get();
    console.log("--- Recent Telemetry Runs ---");
    snap.forEach(doc => {
        const data = doc.data();
        console.log(`[${data.timestamp}] Status: ${data.overallStatus} | Targets: ${data.successTargets}/6 | Duration: ${data.durationMs}ms`);
    });
    process.exit(0);
}

checkRuns().catch(console.error);
