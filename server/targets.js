/**
 * targets.js — Deep multi-URL configuration for each scrape target.
 * Each brand has 4–6 specific product page URLs scraped in parallel.
 * All results are deduplicated by model_name before returning.
 */

export const targets = [
    {
        name: 'Yale',
        brand: 'yale',
        trustpilotName: 'yale.co.uk',
        // Deep: homepage + cylinders listing + Platinum 3* product + Superior + night latches
        urls: [
            'https://www.yalehome.co.uk/locks/cylinders',
            'https://www.yalehome.co.uk/locks/door-cylinders',
            'https://www.yalehome.co.uk/home-security/door-locks',
            'https://www.yalehome.co.uk/security/',
            'https://www.yalehome.co.uk/product/platinum-3-star-euro-single-cylinder/',
            'https://www.yalehome.co.uk/',
        ],
        geminiPrompt: `
You are a data extraction assistant. Analyse the HTML below from Yale UK.

Extract ALL door lock or cylinder products that have TS007 3-star, SS312 Diamond, or BS3621 accreditation.
Look for: "Platinum 3 Star", "Superior", "TS007", "SS312", "BS3621", "3 Star", "anti-snap", "Kitemark".
If the page has product listings, extract each individual product separately.
If the page is a category listing, extract all products visible.
If the page is a single product page, extract that product.

Return a JSON array. Return [] if truly nothing accreditation-relevant is found.
Each object MUST have exactly these fields:
{
  "manufacturer": "Yale",
  "model_name": "<full product name, e.g. Yale Platinum 3 Star Anti-Snap Cylinder>",
  "security_accreditations": ["TS007 3*", "SS312 Diamond", "BS3621"] (include all that apply),
  "price_gbp": "<e.g. £24.99 or N/A>",
  "product_url": "<full URL from any link on the page, or N/A>",
  "lock_image": "<full image URL or N/A>"
}

Important: Be generous — if a product MENTIONS TS007, 3-star, anti-snap certification or Kitemark it qualifies. Do NOT over-filter.

CRITICAL EXTRACTION RULES:
- product_url: Find the <a href="..."> link closest to the product name. If relative (e.g. /product/xxx/), make absolute by prepending "https://www.yalehome.co.uk". NEVER return N/A if any product link exists.
- lock_image: Find <img src="..."> nearest the product. If relative, prepend "https://www.yalehome.co.uk". Return the src= value as-is if already absolute.
- price_gbp: Find £ symbol near the product. Return as "£XX.XX" format. Only return N/A if truly no price visible.

Return valid JSON array only. No markdown fences.
`,
    },

    {
        name: 'Ultion',
        brand: 'ultion',
        trustpilotName: 'ultion-lock.co.uk',
        // Deep: main locks page + 3 Star PLUS product + Nuki smart + Bolt + padlock + security handle
        urls: [
            'https://www.ultion-lock.co.uk/ultion-locks/',
            'https://www.ultion-lock.co.uk/ultion-nuki-2025/',
            'https://www.ultion-lock.co.uk/ultion-bolt/',
            'https://www.ultion-lock.co.uk/product/padlocks/',
            'https://www.ultion-lock.co.uk/security-handle/',
            'https://www.ultion-lock.co.uk/',
        ],
        geminiPrompt: `
You are a data extraction assistant. Analyse the HTML below from Ultion Lock UK.

Extract ALL lock products that have TS007 3-star, SS312 Diamond, or BS3621 accreditation.
Look for: "3 Star PLUS", "TS007", "SS312", "Police Preferred Specification", "British Standards", "Sold Secure Diamond", "anti-snap", "3 Star", "WXM".
Extract each product variant separately where possible.

Return a JSON array or [] if nothing found.
Each object MUST have exactly these fields:
{
  "manufacturer": "Ultion",
  "model_name": "<full product name, e.g. Ultion 3 Star PLUS Lock>",
  "security_accreditations": ["TS007 3*", "SS312 Diamond", "BS3621"] (include all that apply),
  "price_gbp": "<e.g. £89.00 or N/A>",
  "product_url": "<full product URL from any link, or N/A>",
  "lock_image": "<full image URL or N/A>"
}

If you see "TS007", "3 Star", "Police Preferred", "Sold Secure Diamond" or "British Standards" mentioned anywhere on the page next to a product — include it.

CRITICAL EXTRACTION RULES:
- product_url: Find the <a href="..."> link closest to the product name. If relative, prepend "https://www.ultion-lock.co.uk". NEVER return N/A if any product link exists.
- lock_image: Find <img src="..."> nearest the product. If relative, prepend "https://www.ultion-lock.co.uk".
- price_gbp: Find £ symbol near the product. Return as "£XX.XX". Only N/A if truly no price visible.

Return valid JSON array only. No markdown fences.
`,
    },

    {
        name: 'Avocet',
        brand: 'avocet',
        trustpilotName: 'avocet-hardware.co.uk',
        // Deep: ABS cylinder product pages — ABS Master is their flagship TS007 3*/SS312 Diamond product
        urls: [
            'https://www.avocet-hardware.co.uk/abs-master-euro-lock-cylinder/',
            'https://www.avocet-hardware.co.uk/abs-euro-lock-cylinder/',
            'https://www.avocet-hardware.co.uk/product-category/cylinders/',
            'https://www.avocet-hardware.co.uk/product-category/door-locks/',
            'https://www.avocet-hardware.co.uk/product-category/euro-cylinders/',
            'https://www.avocet-hardware.co.uk/',
        ],
        geminiPrompt: `
You are a data extraction assistant. Analyse the HTML below from Avocet Hardware UK.

Extract ALL door lock and cylinder products with TS007 3-star, SS312 Diamond, or BS3621 accreditation.
Look for: "ABS Master", "ABS", "TS007", "SS312", "Sold Secure Diamond", "3 Star", "anti-snap", "Active Snap Protection", "Thermaguard", "Secured by Design", "BS3621".

Return a JSON array or [] if nothing found.
Each object MUST have exactly these fields:
{
  "manufacturer": "Avocet",
  "model_name": "<full product name, e.g. Avocet ABS Master Euro Lock Cylinder>",
  "security_accreditations": ["TS007 3*", "SS312 Diamond", "BS3621"] (include all that apply),
  "price_gbp": "<e.g. £49.99 or N/A>",
  "product_url": "<full URL or N/A>",
  "lock_image": "<full image URL or N/A>"
}

Be generous — if a product mentions TS007, SS312, 3-star or Sold Secure Diamond it qualifies.

CRITICAL EXTRACTION RULES:
- product_url: Find the <a href="..."> link closest to the product name. If relative, prepend "https://www.avocet-hardware.co.uk". NEVER return N/A if any product link exists.
- lock_image: Find <img src="..."> nearest the product. If relative, prepend "https://www.avocet-hardware.co.uk".
- price_gbp: Find £ symbol near the product. Return as "£XX.XX". Only N/A if truly no price visible.

Return valid JSON array only. No markdown fences.
`,
    },

    {
        name: 'Mul-T-Lock',
        brand: 'mul-t-lock',
        trustpilotName: 'mul-t-lock.com',
        knownBlocked: true, // Cloudflare blocks all headless browsers — stockist target covers this brand
        urls: [
            'https://mul-t-lock.com/uk/',
            'https://mul-t-lock.com/uk/products/',
            'https://mul-t-lock.com/uk/integrator/',
            'https://mul-t-lock.com/uk/integrator-xp/',
            'https://mul-t-lock.com/uk/high-security/',
            'https://mul-t-lock.com/uk/solutions/residential/',
        ],
        geminiPrompt: `
You are a data extraction assistant. Analyse the HTML below from Mul-T-Lock UK.

Extract ALL door lock and cylinder products with TS007 3-star, SS312 Diamond, or BS3621 accreditation.
Look for: "MTL300", "Break Secure", "3XP", "TS007", "SS312", "Sold Secure Diamond", "Secured by Design", "3 Star", "anti-snap", "BS3621".
The MTL300 Break Secure 3XP Pro is their flagship UK product — always include it if mentioned.

Return a JSON array or [] if nothing found.
Each object MUST have exactly these fields:
{
  "manufacturer": "Mul-T-Lock",
  "model_name": "<full product name, e.g. Mul-T-Lock MTL300 Break Secure 3XP Pro>",
  "security_accreditations": ["TS007 3*", "SS312 Diamond", "BS3621"] (include all that apply),
  "price_gbp": "<e.g. £120.00 or N/A>",
  "product_url": "<full URL or N/A>",
  "lock_image": "<full image URL or N/A>"
}

Be generous in inclusion — any mention of TS007, SS312, 3-star, or Secured by Design qualifies a product.
Return valid JSON array only. No markdown fences.
`,
    },

    {
        name: 'ERA',
        brand: 'era',
        trustpilotName: 'erahomesecurity.com',
        knownBlocked: true, // Cloudflare blocks all headless browsers — stockist target covers this brand
        urls: [
            'https://www.erahomesecurity.com/products/cylinders/',
            'https://www.erahomesecurity.com/products/',
            'https://www.erahomesecurity.com/product/era-fortress-kitemarked-3-star-euro-profile-cylinder/',
            'https://www.erahomesecurity.com/product-category/cylinders/',
            'https://www.erahomesecurity.com/product/era-caveo-ts007-3-star-euro-double-cylinder/',
            'https://www.erahomesecurity.com/',
        ],
        geminiPrompt: `
You are a data extraction assistant. Analyse the HTML below from ERA Home Security UK.

Extract ALL door lock and cylinder products with TS007 3-star, SS312 Diamond, or BS3621 accreditation.
Look for: "Fortress", "Caveo", "TS007", "3 Star", "SS312", "Sold Secure Diamond", "BS3621", "British Standard", "Kitemark", "Secured by Design", "anti-snap".
Note: ERA's main high-security cylinder product is the "Fortress" (now sometimes replaced by "Caveo"). Include both if present.

Return a JSON array or [] if nothing found.
Each object MUST have exactly these fields:
{
  "manufacturer": "ERA",
  "model_name": "<full product name, e.g. ERA Fortress 3 Star Euro Cylinder>",
  "security_accreditations": ["TS007 3*", "SS312 Diamond", "BS3621"] (include all that apply),
  "price_gbp": "<e.g. £39.99 or N/A>",
  "product_url": "<full URL or N/A>",
  "lock_image": "<full image URL or N/A>"
}

Be generous — any product with TS007, 3 Star, SS312, Sold Secure or BS3621 qualifies.
Return valid JSON array only. No markdown fences.
`,
    },

    // ── STOCKIST TARGETS ────────────────────────────────────────────────────────
    // Stockist targets for Mul-T-Lock and ERA as insurance/additional coverage.
    // Manufacturer sites are now accessible via stealth mode but stockists add
    // extra product coverage and pricing data not always on manufacturer pages.

    {
        name: 'Mul-T-Lock (Stockists)',
        brand: 'mul-t-lock',
        trustpilotName: 'mul-t-lock.com',
        urls: [
            // Browser-verified working product pages
            'https://lockandkeyshop.co.uk/mul-t-lock-integrator-xp-3-star-snap-safe-euro-cylinder-2784-p.asp',
            'https://www.lockshopdirect.co.uk/door-cylinders/',
            'https://www.lockshopdirect.co.uk/mul-t-lock-locking-platforms/',
            'https://www.safeguardlocksmiths.co.uk/mul-t-lock/',
            'https://www.lockandkey.co.uk/mul-t-lock-cylinders/',
            'https://www.bennlockandsafe.co.uk/mul-t-lock-cylinders/',
        ],
        geminiPrompt: `
You are a data extraction assistant. Analyse the HTML below from a UK locksmith/stockist website selling Mul-T-Lock products.

Extract ALL Mul-T-Lock door lock and cylinder products that have TS007 3-star, SS312 Diamond, or BS3621 accreditation.
Look for: "MTL300", "Break Secure", "3XP", "TS007", "SS312", "Sold Secure Diamond", "Secured by Design", "3 Star", "anti-snap".
The MTL300 Break Secure 3XP Pro is the flagship UK product — always include it if mentioned anywhere on the page.

Return a JSON array or [] if nothing found.
Each object MUST have exactly these fields:
{
  "manufacturer": "Mul-T-Lock",
  "model_name": "<full product name, e.g. Mul-T-Lock MTL300 Break Secure 3XP Pro>",
  "security_accreditations": ["TS007 3*", "SS312 Diamond", "BS3621"] (include all that apply),
  "price_gbp": "<e.g. £120.00 or N/A>",
  "product_url": "<full URL or N/A>",
  "lock_image": "<full image URL or N/A>"
}

Be generous — any mention of TS007, SS312, 3-star, anti-snap, or Secured by Design qualifies.

CRITICAL EXTRACTION RULES:
- product_url: Find the <a href="..."> link closest to the product name. Use the full URL as-is if already absolute.
- lock_image: Find <img src="..."> nearest the product. Use the src= value directly if absolute.
- price_gbp: Find £ symbol near the product. Return as "£XX.XX". Only N/A if truly no price visible.

Return valid JSON array only. No markdown fences.
`,
    },

    {
        name: 'ERA (Stockists)',
        brand: 'era',
        trustpilotName: 'erahomesecurity.com',
        urls: [
            'https://jcphardware.co.uk/era-fortress-3-star-anti-snap-euro-cylinder-upvc-front-door-lock-ts007/',
            'https://lockandkeyshop.co.uk/era-bs-kitemarked-3-6-pin-invincible-double-door-cylinder-9714-p.asp',
            'https://www.jcphardware.co.uk/cylinders/?brand=era',
            'https://www.lockandkey.co.uk/era-cylinders/',
            'https://www.lockshopdirect.co.uk/door-cylinders/?brand=era',
            'https://www.safe.co.uk/era-cylinders/',
        ],
        geminiPrompt: `
You are a data extraction assistant. Analyse the HTML below from a UK hardware/locksmith stockist selling ERA products.

Extract ALL ERA door lock and cylinder products with TS007 3-star, SS312 Diamond, or BS3621 accreditation.
Look for: "ERA Fortress", "ERA Caveo", "TS007", "3 Star", "SS312", "Sold Secure Diamond", "BS3621", "British Standard", "Kitemark", "Secured by Design", "anti-snap".
ERA's main high-security cylinders are "Fortress" and its replacement "Caveo" — include both if present.

Return a JSON array or [] if nothing found.
Each object MUST have exactly these fields:
{
  "manufacturer": "ERA",
  "model_name": "<full product name, e.g. ERA Fortress 3 Star Euro Cylinder>",
  "security_accreditations": ["TS007 3*", "SS312 Diamond", "BS3621"] (include all that apply),
  "price_gbp": "<e.g. £39.99 or N/A>",
  "product_url": "<full URL or N/A>",
  "lock_image": "<full image URL or N/A>"
}

Be generous — any product with TS007, 3 Star, SS312, Sold Secure or BS3621 qualifies.

CRITICAL EXTRACTION RULES:
- product_url: Find the <a href="..."> link closest to the product name. Use full URL as-is if absolute.
- lock_image: Find <img src="..."> nearest the product. Use the src= value directly if absolute.
- price_gbp: Find £ symbol near the product. Return as "£XX.XX". Only N/A if truly no price visible.

Return valid JSON array only. No markdown fences.
`,
    },

    // ── ADDITIONAL BRANDS ────────────────────────────────────────────────────────

    {
        name: 'Brisant Secure',
        brand: 'brisant',
        trustpilotName: 'brisantsecure.com',
        urls: [
            'https://www.brisantsecure.com/products/',
            'https://www.brisantsecure.com/ultion/',
            'https://www.brisantsecure.com/sweet/',
            'https://www.safe.co.uk/brisant-ultion-cylinders/',
            'https://jcphardware.co.uk/brisant-ultion/',
            'https://www.brisantsecure.com/',
        ],
        geminiPrompt: `
You are a data extraction assistant. Analyse the HTML below from Brisant Secure or a UK stockist.

Brisant Secure manufactures the Ultion WXM cylinder — the only SS312 Diamond + TS007 3* cylinder to score 8/8 in Which? tests.
Also look for: "Sweet", "Nuki", "Bolt", "3 Star PLUS", "SS312 Diamond", "TS007", "Police Preferred Specification", "Sold Secure Diamond", "anti-snap".

Return a JSON array or [] if nothing found.
Each object MUST have exactly these fields:
{
  "manufacturer": "Brisant Secure",
  "model_name": "<full product name, e.g. Brisant Ultion WXM Cylinder>",
  "security_accreditations": ["TS007 3*", "SS312 Diamond", "BS3621"] (include all that apply),
  "price_gbp": "<e.g. £63.00 or N/A>",
  "product_url": "<full URL or N/A>",
  "lock_image": "<full image URL or N/A>"
}

CRITICAL EXTRACTION RULES:
- product_url: Absolute URL, prepend "https://www.brisantsecure.com" if relative.
- lock_image: Absolute image URL.
- price_gbp: £XX.XX format.
Return valid JSON array only. No markdown fences.
`,
    },

    {
        name: 'Abloy UK',
        brand: 'abloy',
        trustpilotName: 'abloy.co.uk',
        urls: [
            'https://abloy.co.uk/products/cylinders/',
            'https://abloy.co.uk/products/padlocks/',
            'https://abloy.co.uk/products/',
            'https://www.safe.co.uk/abloy-cylinders/',
            'https://www.lockshopdirect.co.uk/abloy-cylinders/',
            'https://abloy.co.uk/',
        ],
        geminiPrompt: `
You are a data extraction assistant. Analyse the HTML below from Abloy UK or a stockist.

Abloy makes disc-detainer (not pin-tumbler) cylinders — the most pick-resistant in the world.
Look for: "Protec2", "Protec", "Classic", "Exec", "SENTO", "BEAT", "LockIQ", "Cliq", "SS312 Diamond", "TS007", "Sold Secure Diamond", "anti-pick", "disc detainer".

Return a JSON array or [] if nothing found.
Each object MUST have exactly these fields:
{
  "manufacturer": "Abloy",
  "model_name": "<full product name, e.g. Abloy Protec2>",
  "security_accreditations": ["TS007 3*", "SS312 Diamond", "BS3621"] (include all that apply),
  "price_gbp": "<e.g. £120.00 or N/A>",
  "product_url": "<full URL or N/A>",
  "lock_image": "<full image URL or N/A>"
}

CRITICAL EXTRACTION RULES:
- product_url: Absolute URL, prepend "https://abloy.co.uk" if relative.
- lock_image: Absolute image URL.
- price_gbp: £XX.XX format.
Return valid JSON array only. No markdown fences.
`,
    },

    {
        name: 'Banham',
        brand: 'banham',
        trustpilotName: 'banhamgroup.com',
        knownBlocked: true,
        urls: [
            'https://www.banhamgroup.com/locks/',
            'https://www.banhamgroup.com/locks/cylinders/',
            'https://www.banhamgroup.com/products/',
            'https://www.safe.co.uk/banham/',
            'https://jcphardware.co.uk/banham/',
            'https://www.banhamgroup.com/',
        ],
        geminiPrompt: `
You are a data extraction assistant. Analyse the HTML below from Banham or a UK stockist.

Banham is a London-based ultra-high-security lock company. Look for: "N-Series", "M Series", "Banham double locking", "BS3621", "TS007", "mortice", "British Standard", "5-lever", "deadlock", "nightlatch".

Return a JSON array or [] if nothing found.
Each object MUST have exactly these fields:
{
  "manufacturer": "Banham",
  "model_name": "<full product name>",
  "security_accreditations": ["TS007 3*", "SS312 Diamond", "BS3621"] (include all that apply),
  "price_gbp": "<e.g. £95.00 or N/A>",
  "product_url": "<full URL or N/A>",
  "lock_image": "<full image URL or N/A>"
}

CRITICAL EXTRACTION RULES:
- product_url: Absolute URL, prepend "https://www.banhamgroup.com" if relative.
- lock_image: Absolute image URL.
- price_gbp: £XX.XX format.
Return valid JSON array only. No markdown fences.
`,
    },

    {
        name: 'Millenco',
        brand: 'millenco',
        trustpilotName: 'millenco.com',
        urls: [
            'https://www.millenco.com/cylinders/',
            'https://www.millenco.com/products/',
            'https://www.millenco.com/guardsman/',
            'https://www.safe.co.uk/millenco-cylinders/',
            'https://jcphardware.co.uk/millenco/',
            'https://www.millenco.com/',
        ],
        geminiPrompt: `
You are a data extraction assistant. Analyse the HTML below from Millenco or a UK stockist.

Millenco makes the Guardsman range — TS007 3-star anti-snap cylinders very popular in the UK.
Look for: "Guardsman", "TS007", "3 Star", "anti-snap", "SS312", "Sold Secure", "British Standard", "Kitemark".

Return a JSON array or [] if nothing found.
Each object MUST have exactly these fields:
{
  "manufacturer": "Millenco",
  "model_name": "<full product name, e.g. Millenco Guardsman TS007 3 Star Cylinder>",
  "security_accreditations": ["TS007 3*", "SS312 Diamond", "BS3621"] (include all that apply),
  "price_gbp": "<e.g. £42.00 or N/A>",
  "product_url": "<full URL or N/A>",
  "lock_image": "<full image URL or N/A>"
}

CRITICAL EXTRACTION RULES:
- product_url: Absolute URL, prepend "https://www.millenco.com" if relative.
- lock_image: Absolute image URL.
- price_gbp: £XX.XX format.
Return valid JSON array only. No markdown fences.
`,
    },

    {
        name: 'Union',
        brand: 'union',
        trustpilotName: 'union.co.uk',
        urls: [
            'https://www.union.co.uk/cylinders/',
            'https://www.union.co.uk/mortice-locks/',
            'https://www.union.co.uk/products/',
            'https://jcphardware.co.uk/union-locks/',
            'https://www.lockshopdirect.co.uk/union-locks/',
            'https://www.union.co.uk/',
        ],
        geminiPrompt: `
You are a data extraction assistant. Analyse the HTML below from Union Locks (an ASSA ABLOY brand) or a UK stockist.

Union is one of the UK's oldest lock brands, making BS3621 5-lever mortice locks and TS007 cylinders.
Look for: "3C35", "2C35", "5-lever", "BS3621", "British Standard Kitemark", "TS007", "3 Star", "deadlock", "sashlock", "anti-snap", "Deadlock".

Return a JSON array or [] if nothing found.
Each object MUST have exactly these fields:
{
  "manufacturer": "Union",
  "model_name": "<full product name>",
  "security_accreditations": ["TS007 3*", "SS312 Diamond", "BS3621"] (include all that apply),
  "price_gbp": "<e.g. £45.00 or N/A>",
  "product_url": "<full URL or N/A>",
  "lock_image": "<full image URL or N/A>"
}

CRITICAL EXTRACTION RULES:
- product_url: Absolute URL, prepend "https://www.union.co.uk" if relative.
- lock_image: Absolute image URL.
- price_gbp: £XX.XX format.
Return valid JSON array only. No markdown fences.
`,
    },

    {
        name: 'Ingersoll',
        brand: 'ingersoll',
        trustpilotName: 'ingersoll.co.uk',
        urls: [
            'https://www.ingersoll.co.uk/products/',
            'https://www.ingersoll.co.uk/cylinders/',
            'https://www.safe.co.uk/ingersoll/',
            'https://jcphardware.co.uk/ingersoll/',
            'https://www.lockshopdirect.co.uk/ingersoll-locks/',
            'https://www.ingersoll.co.uk/',
        ],
        geminiPrompt: `
You are a data extraction assistant. Analyse the HTML below from Ingersoll or a UK stockist.

Ingersoll makes the 10T cylinder — one of only a few SS312 Diamond rated cylinders in the UK.
Look for: "10T", "SS312 Diamond", "Sold Secure Diamond", "TS007", "3 Star", "anti-snap", "anti-bump", "anti-pick", "BS3621", "British Standard".

Return a JSON array or [] if nothing found.
Each object MUST have exactly these fields:
{
  "manufacturer": "Ingersoll",
  "model_name": "<full product name, e.g. Ingersoll 10T Euro Cylinder>",
  "security_accreditations": ["TS007 3*", "SS312 Diamond", "BS3621"] (include all that apply),
  "price_gbp": "<e.g. £55.00 or N/A>",
  "product_url": "<full URL or N/A>",
  "lock_image": "<full image URL or N/A>"
}

CRITICAL EXTRACTION RULES:
- product_url: Absolute URL, prepend "https://www.ingersoll.co.uk" if relative.
- lock_image: Absolute image URL.
- price_gbp: £XX.XX format.
Return valid JSON array only. No markdown fences.
`,
    },

    {
        name: 'Eurospec',
        brand: 'eurospec',
        trustpilotName: 'eurospec.co.uk',
        urls: [
            'https://www.eurospec.co.uk/cylinders/',
            'https://www.eurospec.co.uk/euro-profile-cylinders/',
            'https://www.eurospec.co.uk/products/',
            'https://jcphardware.co.uk/eurospec/',
            'https://www.safe.co.uk/eurospec-cylinders/',
            'https://www.eurospec.co.uk/',
        ],
        geminiPrompt: `
You are a data extraction assistant. Analyse the HTML below from Eurospec or a UK stockist.

Eurospec makes TS007 3-star euro cylinders in a wide range of sizes.
Look for: "ES-CYL", "Eurospec", "TS007", "3 Star", "anti-snap", "anti-bump", "BS3621", "British Standard", "Kitemark", "Sold Secure".

Return a JSON array or [] if nothing found.
Each object MUST have exactly these fields:
{
  "manufacturer": "Eurospec",
  "model_name": "<full product name>",
  "security_accreditations": ["TS007 3*", "SS312 Diamond", "BS3621"] (include all that apply),
  "price_gbp": "<e.g. £35.00 or N/A>",
  "product_url": "<full URL or N/A>",
  "lock_image": "<full image URL or N/A>"
}

CRITICAL EXTRACTION RULES:
- product_url: Absolute URL, prepend "https://www.eurospec.co.uk" if relative.
- lock_image: Absolute image URL.
- price_gbp: £XX.XX format.
Return valid JSON array only. No markdown fences.
`,
    },

    {
        name: 'UAP',
        brand: 'uap',
        trustpilotName: 'uaponline.com',
        urls: [
            'https://www.uaponline.com/cylinders/',
            'https://www.uaponline.com/door-cylinders/',
            'https://www.uaponline.com/products/',
            'https://jcphardware.co.uk/uap/',
            'https://www.safe.co.uk/uap-cylinders/',
            'https://www.uaponline.com/',
        ],
        geminiPrompt: `
You are a data extraction assistant. Analyse the HTML below from UAP Limited or a UK stockist.

UAP makes the Lockmaster and Titan Pro range — TS007 3-star anti-snap cylinders.
Look for: "Lockmaster", "Titan Pro", "UFO", "TS007", "3 Star", "anti-snap", "anti-bump", "Sold Secure", "BS3621", "Kitemark".

Return a JSON array or [] if nothing found.
Each object MUST have exactly these fields:
{
  "manufacturer": "UAP",
  "model_name": "<full product name, e.g. UAP Lockmaster TS007 3 Star Cylinder>",
  "security_accreditations": ["TS007 3*", "SS312 Diamond", "BS3621"] (include all that apply),
  "price_gbp": "<e.g. £39.99 or N/A>",
  "product_url": "<full URL or N/A>",
  "lock_image": "<full image URL or N/A>"
}

CRITICAL EXTRACTION RULES:
- product_url: Absolute URL, prepend "https://www.uaponline.com" if relative.
- lock_image: Absolute image URL.
- price_gbp: £XX.XX format.
Return valid JSON array only. No markdown fences.
`,
    },

    {
        name: 'EVVA',
        brand: 'evva',
        trustpilotName: 'evva.com',
        knownBlocked: true, // Cloudflare WAF issues 403, masking origin 503s
        urls: [
            'https://www.safe.co.uk/evva-cylinders/',
            'https://jcphardware.co.uk/evva/',
            'https://www.lockshopdirect.co.uk/evva-cylinders/',
            'https://www.lockandkey.co.uk/evva-cylinders/',
            'https://www.bennlockandsafe.co.uk/evva-cylinders/',
        ],
        geminiPrompt: `
You are a data extraction assistant. Analyse the HTML below from EVVA or a UK stockist.

EVVA is an Austrian premium cylinder manufacturer. Their key products for the UK market include:
Look for: "EPS", "AirKey", "4KS", "MCS", "ICS", "TS007", "SS312 Diamond", "Sold Secure Diamond", "3 Star", "anti-snap", "anti-pick", "anti-drill".

Return a JSON array or [] if nothing found.
Each object MUST have exactly these fields:
{
  "manufacturer": "EVVA",
  "model_name": "<full product name, e.g. EVVA EPS Cylinder>",
  "security_accreditations": ["TS007 3*", "SS312 Diamond", "BS3621"] (include all that apply),
  "price_gbp": "<e.g. £85.00 or N/A>",
  "product_url": "<full URL or N/A>",
  "lock_image": "<full image URL or N/A>"
}

CRITICAL EXTRACTION RULES:
- product_url: Absolute URL, prepend "https://www.evva.com" if relative.
- lock_image: Absolute image URL.
- price_gbp: £XX.XX format.
Return valid JSON array only. No markdown fences.
`,
    },

    {
        name: 'ABUS',
        brand: 'abus',
        trustpilotName: 'abus.com',
        urls: [
            'https://www.abus.com/eng/Home-Security/Door-Security/Cylinders',
            'https://www.abus.com/eng/Home-Security/Door-Security',
            'https://www.safe.co.uk/abus-cylinders/',
            'https://jcphardware.co.uk/abus/',
            'https://www.lockshopdirect.co.uk/abus-cylinders/',
            'https://www.abus.com/eng/',
        ],
        geminiPrompt: `
You are a data extraction assistant. Analyse the HTML below from ABUS or a UK stockist.

ABUS is a German security brand widely available in the UK. Look for:
"EC660", "EC750", "EC850", "Bravus", "Zolit", "TS007", "3 Star", "SS312", "Sold Secure", "anti-snap", "BS3621", "British Standard".

Return a JSON array or [] if nothing found.
Each object MUST have exactly these fields:
{
  "manufacturer": "ABUS",
  "model_name": "<full product name>",
  "security_accreditations": ["TS007 3*", "SS312 Diamond", "BS3621"] (include all that apply),
  "price_gbp": "<e.g. £49.00 or N/A>",
  "product_url": "<full URL or N/A>",
  "lock_image": "<full image URL or N/A>"
}

CRITICAL EXTRACTION RULES:
- product_url: Absolute URL.
- lock_image: Absolute image URL.
- price_gbp: £XX.XX format.
Return valid JSON array only. No markdown fences.
`,
    },

    {
        name: 'Asec',
        brand: 'asec',
        trustpilotName: 'asec.co.uk',
        urls: [
            'https://www.asec.co.uk/cylinders/',
            'https://www.asec.co.uk/euro-cylinders/',
            'https://www.asec.co.uk/products/',
            'https://jcphardware.co.uk/asec/',
            'https://www.safe.co.uk/asec-cylinders/',
            'https://www.asec.co.uk/',
        ],
        geminiPrompt: `
You are a data extraction assistant. Analyse the HTML below from Asec (Associated Security Corporation) or a UK stockist.

Asec makes a range of anti-snap TS007 3-star euro cylinders for the UK market.
Look for: "Asec", "TS007", "3 Star", "anti-snap", "anti-bump", "Sold Secure", "BS3621", "Kitemark", "thumbturn", "British Standard".

Return a JSON array or [] if nothing found.
Each object MUST have exactly these fields:
{
  "manufacturer": "Asec",
  "model_name": "<full product name>",
  "security_accreditations": ["TS007 3*", "SS312 Diamond", "BS3621"] (include all that apply),
  "price_gbp": "<e.g. £28.00 or N/A>",
  "product_url": "<full URL or N/A>",
  "lock_image": "<full image URL or N/A>"
}

CRITICAL EXTRACTION RULES:
- product_url: Absolute URL, prepend "https://www.asec.co.uk" if relative.
- lock_image: Absolute image URL.
- price_gbp: £XX.XX format.
Return valid JSON array only. No markdown fences.
`,
    },

    {
        name: 'Winkhaus',
        brand: 'winkhaus',
        trustpilotName: 'winkhaus.co.uk',
        urls: [
            'https://www.winkhaus.co.uk/products/',
            'https://www.winkhaus.co.uk/cylinders/',
            'https://www.winkhaus.co.uk/multipoint-locks/',
            'https://jcphardware.co.uk/winkhaus/',
            'https://www.safe.co.uk/winkhaus/',
            'https://www.winkhaus.co.uk/',
        ],
        geminiPrompt: `
You are a data extraction assistant. Analyse the HTML below from Winkhaus or a UK stockist.

Winkhaus is a German hardware brand widely used in UK UPVC and composite doors. Their cylinders and multipoint locks are very popular.
Look for: "keyTec", "BlueMatic", "rondo star", "TS007", "3 Star", "anti-snap", "BS3621", "multipoint", "Sold Secure".

Return a JSON array or [] if nothing found.
Each object MUST have exactly these fields:
{
  "manufacturer": "Winkhaus",
  "model_name": "<full product name>",
  "security_accreditations": ["TS007 3*", "SS312 Diamond", "BS3621"] (include all that apply),
  "price_gbp": "<e.g. £48.00 or N/A>",
  "product_url": "<full URL or N/A>",
  "lock_image": "<full image URL or N/A>"
}

CRITICAL EXTRACTION RULES:
- product_url: Absolute URL, prepend "https://www.winkhaus.co.uk" if relative.
- lock_image: Absolute image URL.
- price_gbp: £XX.XX format.
Return valid JSON array only. No markdown fences.
`,
    },

];

export default targets;
