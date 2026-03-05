/**
 * trustpilotAPI.js — Fetches brand review scores via Trustpilot Business API.
 * Falls back gracefully to null if API key is missing or call fails.
 */

import 'dotenv/config';

const TRUSTPILOT_API_BASE = 'https://api.trustpilot.com/v1';

/**
 * getReviews - Fetch Trustpilot score for a brand domain.
 * @param {string} brandDomain - e.g. "ultion-lock.co.uk"
 * @returns {Promise<{score: number, count: number} | null>}
 */
export async function getReviews(brandDomain) {
    const apiKey = process.env.TRUSTPILOT_API_KEY;
    if (!apiKey) {
        console.warn(`[TRUSTPILOT] No API key — reviews set to null for ${brandDomain}`);
        return null;
    }

    try {
        const searchUrl = `${TRUSTPILOT_API_BASE}/business-units/find?name=${encodeURIComponent(brandDomain)}&apikey=${apiKey}`;
        const res = await fetch(searchUrl, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) {
            console.warn(`[TRUSTPILOT] HTTP ${res.status} for ${brandDomain}`);
            return null;
        }

        const data = await res.json();
        const score = data?.score?.trustScore ?? null;
        const count = data?.numberOfReviews?.total ?? null;

        if (score === null || count === null) return null;
        return { score, count, source: 'Trustpilot' };
    } catch (e) {
        console.warn(`[TRUSTPILOT] Error for ${brandDomain}: ${e.message}`);
        return null;
    }
}

/**
 * enrichWithReviews - Add review data to an array of lock objects.
 * @param {Array} locks
 * @param {string} brandDomain
 * @returns {Promise<Array>}
 */
export async function enrichWithReviews(locks, brandDomain) {
    const reviews = await getReviews(brandDomain);
    return locks.map(lock => ({ ...lock, reviews }));
}

export default { getReviews, enrichWithReviews };
