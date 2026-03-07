import https from 'https';
import http from 'http';

/**
 * LinkValidator.js
 * Validates deep links proactively via HTTP HEAD requests with WAF bypass heuristics.
 */
export class LinkValidator {
    /**
     * Pings a URL to verify it resolves correctly.
     * Treats 403, 405, 429 as "Alive" to bypass CDN anti-bot measures blocking HEAD.
     * @param {string} urlStr 
     * @returns {Promise<boolean>} True if alive, False if 404/500/Timeout
     */
    static checkUrl(urlStr) {
        return new Promise((resolve) => {
            try {
                const url = new URL(urlStr);
                const reqModule = url.protocol === 'https:' ? https : http;
                const req = reqModule.request(url, {
                    method: 'HEAD',
                    timeout: 8000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
                    }
                }, (res) => {
                    const status = res.statusCode;
                    // Standard success or redirects
                    if (status >= 200 && status < 400) return resolve(true);
                    // Standard Cloudflare/WAF block, means server is alive
                    if ([403, 405, 429].includes(status)) return resolve(true);

                    console.warn(`[LinkValidator] ❌ HTTP ${status} detected on ${urlStr}`);
                    resolve(false);
                });

                req.on('error', (err) => {
                    console.warn(`[LinkValidator] ❌ Network Error on ${urlStr}: ${err.message}`);
                    resolve(false);
                });

                req.on('timeout', () => {
                    req.destroy();
                    console.warn(`[LinkValidator] ❌ Timeout on ${urlStr}`);
                    resolve(false);
                });

                req.end();
            } catch (err) {
                console.warn(`[LinkValidator] ❌ Invalid URL format: ${urlStr}`);
                resolve(false);
            }
        });
    }

    /**
     * Validates a primary URL and automatically returns a fallback if the primary is dead.
     */
    static async validateAndHeal(primaryUrl, fallbackUrl = 'https://lockandkeyshop.co.uk/') {
        if (!primaryUrl) return fallbackUrl;
        const isAlive = await this.checkUrl(primaryUrl);
        if (isAlive) {
            return primaryUrl;
        } else {
            console.log(`[LinkValidator] ⚕️ AUTONOMOUS HEALING: Rerouting dead link ${primaryUrl} -> ${fallbackUrl}`);
            return fallbackUrl;
        }
    }
}
