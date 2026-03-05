/**
 * geminiExtractor.js — Calls Gemini REST API directly via fetch.
 * No SDK dependency — avoids Z: drive ESM/.mjs resolution issues on Node v24.
 */

import 'dotenv/config';
import { applyKnownProductFallbacks } from './knownProducts.js';

const MODEL = 'gemini-2.5-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * extractLocks - Send stripped HTML + prompt to Gemini, return array of lock objects.
 * @param {string} siteName
 * @param {string} strippedHtml
 * @param {string} prompt
 * @returns {Promise<{locks: Array, tokenCount: number, latencyMs: number}>}
 */
export async function extractLocks(siteName, strippedHtml, prompt) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not set in .env');

    const fullPrompt = `${prompt}\n\nMANDATORY AI RULE: For \`security_accreditations\`, you MUST use these exact strings if the lock meets them: "TS007 3*", "SS312 Diamond", "BS3621". If a lock falls below this standard, OMIT IT ENTIRELY from the JSON.\n\n---HTML CONTENT START---\n${strippedHtml}\n---HTML CONTENT END---`;
    const url = `${GEMINI_API_BASE}/models/${MODEL}:generateContent?key=${apiKey}`;

    const startTime = Date.now();

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 4096,
            },
        }),
        // Signal removed to prevent Node v24 Windows libuv crash (async.c line 76)
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Gemini API HTTP ${response.status}: ${errBody.substring(0, 300)}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const tokenCount = data?.usageMetadata?.totalTokenCount ?? 0;

    // Parse JSON — strip markdown code fences if Gemini wraps response
    let locks = [];
    try {
        const cleaned = rawText
            .replace(/^```(?:json)?\n?/i, '')
            .replace(/\n?```$/i, '')
            .trim();
        locks = JSON.parse(cleaned);
        if (!Array.isArray(locks)) locks = [];
    } catch (e) {
        console.warn(`[GEMINI] ${siteName}: JSON parse failed — ${e.message}`);
        console.warn(`[GEMINI] Raw response: ${rawText.substring(0, 500)}`);
        locks = [];
    }

    // Normalise and validate fields
    locks = locks
        .filter(l => l && typeof l === 'object')
        .map(l => ({
            manufacturer: l.manufacturer ?? siteName,
            model_name: l.model_name ?? 'Unknown Model',
            security_accreditations: Array.isArray(l.security_accreditations)
                ? l.security_accreditations
                : [l.security_accreditations].filter(Boolean),
            price_gbp: (l.price_gbp && typeof l.price_gbp === 'string' && l.price_gbp.includes('-'))
                ? l.price_gbp.split('-')[0].trim()
                : (l.price_gbp ?? 'N/A'),
            product_url: l.product_url ?? 'N/A',
            lock_image: l.lock_image ?? 'N/A',
            // Cylinder specification
            cylinder_type: l.cylinder_type ?? 'N/A',
            cylinder_sizes: Array.isArray(l.cylinder_sizes) ? l.cylinder_sizes : [],
            // Security & compatibility (enriched by knownProducts fallback)
            security_tier: l.security_tier ?? null,
            anti_attack: Array.isArray(l.anti_attack) ? l.anti_attack : [],
            door_compatibility: Array.isArray(l.door_compatibility) ? l.door_compatibility : [],
            environment: l.environment ?? 'any',
            lock_category: l.lock_category ?? 'euro-cylinder',
            reviews: null,
        }))
        .filter(l => {
            return l.security_accreditations.some(act => /TS007|3\*|3 [sS]tar|SS312|Diamond|BS3621/i.test(act));
        });

    // Apply known-product fallbacks: fills N/A fields from verified database
    locks = applyKnownProductFallbacks(locks);

    return { locks, tokenCount, latencyMs };
}

export default { extractLocks };
