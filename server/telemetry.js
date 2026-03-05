/**
 * telemetry.js — Structured logging and run report writer.
 * All events include ISO 8601 timestamps.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGS_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOGS_DIR, 'last_run.json');

const runState = {
    startTime: null,
    endTime: null,
    targets: {},
    totalTokens: 0,
    totalLocksExtracted: 0,
    events: [],
};

function ts() {
    return new Date().toISOString();
}

export function startRun() {
    runState.startTime = ts();
    runState.targets = {};
    runState.totalTokens = 0;
    runState.totalLocksExtracted = 0;
    runState.events = [];
    log('RUN_START', 'Scrape run initiated');
}

export function startTarget(name, url) {
    runState.targets[name] = {
        url,
        status: 'PENDING',
        retryCount: 0,
        locksExtracted: 0,
        geminiTokens: 0,
        geminiLatencyMs: 0,
        error: null,
        startTime: ts(),
        endTime: null,
    };
    log('TARGET_START', `Starting target: ${name} → ${url}`);
}

export function retryTarget(name, attempt, reason) {
    if (runState.targets[name]) {
        runState.targets[name].retryCount = attempt;
    }
    log('TARGET_RETRY', `Retry #${attempt} for ${name}: ${reason}`);
}

export function completeTarget(name, locksCount, tokens, latencyMs) {
    if (runState.targets[name]) {
        const t = runState.targets[name];
        t.status = 'SUCCESS';
        t.locksExtracted = locksCount;
        t.geminiTokens = tokens;
        t.geminiLatencyMs = latencyMs;
        t.endTime = ts();
        runState.totalTokens += tokens;
        runState.totalLocksExtracted += locksCount;
    }
    log('TARGET_SUCCESS', `${name}: extracted ${locksCount} locks (${tokens} tokens, ${latencyMs}ms)`);
}

export function failTarget(name, reason) {
    if (runState.targets[name]) {
        const t = runState.targets[name];
        t.status = 'EXTRACTION_FAILED';
        t.error = reason;
        t.endTime = ts();
    }
    log('TARGET_FAILED', `${name} FAILED: ${reason}`);
}

export function endRun() {
    runState.endTime = ts();
    const durationMs = new Date(runState.endTime) - new Date(runState.startTime);
    const successCount = Object.values(runState.targets).filter(t => t.status === 'SUCCESS').length;
    const report = {
        ...runState,
        durationMs,
        successTargets: successCount,
        overallStatus: successCount >= 4 ? 'SUCCESS' : 'PARTIAL_FAILURE',
    };
    log('RUN_END', `Run complete: ${successCount}/5 targets succeeded in ${durationMs}ms (${runState.totalTokens} tokens total)`);

    try {
        if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
        fs.writeFileSync(LOG_FILE, JSON.stringify(report, null, 2), 'utf8');
        console.log(`[TELEMETRY] Report saved to logs/last_run.json`);
    } catch (e) {
        console.error(`[TELEMETRY] Failed to write log: ${e.message}`);
    }

    return report;
}

export function getLastReport() {
    try {
        if (fs.existsSync(LOG_FILE)) {
            return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
        }
    } catch {
        // ignore
    }
    return null;
}

function log(type, message) {
    const entry = { ts: ts(), type, message };
    runState.events.push(entry);
    console.log(`[${entry.ts}] [${type}] ${message}`);
}

export default { startRun, startTarget, retryTarget, completeTarget, failTarget, endRun, getLastReport };
