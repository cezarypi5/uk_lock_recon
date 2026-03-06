import { db } from './server/firebaseAdmin.js';

async function checkDb() {
    console.log('Checking Firebase DB Connection...');
    if (!db) {
        console.log('❌ DB object is null. Firebase is not initialized. (Missing service account key?)');
        process.exit(1);
    }

    try {
        const snapshot = await db.collection('locks').limit(5).get();
        console.log(`✅ Connection successful. Found ${snapshot.size} locks in the database.`);
        if (snapshot.size > 0) {
            console.log('Sample data:');
            snapshot.forEach(doc => {
                console.log(` - ID: ${doc.id} | Model: ${doc.data().model_name}`);
            });
        }

        const runs = await db.collection('telemetry_runs').orderBy('timestamp', 'desc').limit(1).get();
        if (!runs.empty) {
            runs.forEach(doc => console.log(`\nLast Telemetry Run: ${doc.id} at ${doc.data().timestamp}`));
        } else {
            console.log('\nNo telemetry runs found.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error querying database:', error);
        process.exit(1);
    }
}

checkDb();
