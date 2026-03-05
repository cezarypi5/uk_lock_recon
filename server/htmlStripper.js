/**
 * htmlStripper.js — Strips non-essential HTML before sending to Gemini.
 * Removes scripts, styles, SVGs, comments, and collapses whitespace.
 * Reduces payload size by ~80%, saving tokens and avoiding context limits.
 */

/**
 * stripHtml - Clean raw HTML down to meaningful text-structure only.
 * @param {string} rawHtml
 * @returns {string} Stripped HTML
 */
export function stripHtml(rawHtml) {
    let html = rawHtml;

    // Remove <script>...</script> blocks
    html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

    // Remove <style>...</style> blocks
    html = html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');

    // Remove <link> stylesheet tags
    html = html.replace(/<link[^>]+rel=["']stylesheet["'][^>]*\/?>/gi, '');

    // Remove <svg>...</svg> blocks
    html = html.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, '');

    // Remove HTML comments
    html = html.replace(/<!--[\s\S]*?-->/g, '');

    // Remove inline event handlers (onclick, onload, etc.)
    html = html.replace(/\s+on\w+="[^"]*"/gi, '');
    html = html.replace(/\s+on\w+='[^']*'/gi, '');

    // Keep src= on <img> tags (needed for image URL extraction by Gemini)
    // Instead strip srcset, data-src, data-lazy (large lazy-load variants that waste tokens)
    html = html.replace(/\s+srcset="[^"]*"/gi, '');
    html = html.replace(/\s+data-src="[^"]*"/gi, '');
    html = html.replace(/\s+data-lazy-src="[^"]*"/gi, '');
    html = html.replace(/\s+data-lazy="[^"]*"/gi, '');

    // Remove data-* attributes (usually base64 or large values)
    html = html.replace(/\s+data-[\w-]+=["'][^"']*["']/gi, '');

    // Collapse multiple whitespace/newlines to single space
    html = html.replace(/\s{2,}/g, ' ');

    // Truncate to 400,000 characters max (well within gemini-1.5-flash context)
    if (html.length > 400000) {
        html = html.substring(0, 400000);
    }

    return html.trim();
}

export default stripHtml;
