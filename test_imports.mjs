console.log('Starting test');
async function test() {
    console.log('Importing dotenv...');
    await import('dotenv/config');
    console.log('Importing express...');
    await import('express');
    console.log('Importing telemetry...');
    await import('./server/telemetry.js');
    console.log('Importing targets...');
    await import('./server/targets.js');
    console.log('Importing puppeteerFetch...');
    await import('./server/puppeteerFetch.js');
    console.log('Importing gemini...');
    await import('./server/geminiExtractor.js');
    console.log('Importing selfHeal...');
    await import('./server/selfHeal.js');
    console.log('Importing knownProducts...');
    await import('./server/knownProducts.js');
    console.log('All imports done!');
}
test().catch(console.error);
