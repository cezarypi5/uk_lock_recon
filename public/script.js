/**
 * script.js — UK Super Agent Lock Finder v2.0
 * 7-dimensional filtering: Security Tier, Budget, Environment, Door Type,
 * Anti-Attack Features, Cylinder Size, Cylinder Type.
 */

// ── DOM References ──────────────────────────────────────────────────────────
const btnScan = document.getElementById('btn-scan');
const btnReset = document.getElementById('btn-reset');
const lockGrid = document.getElementById('lock-grid');
const splashState = document.getElementById('splash-state');
const emptyState = document.getElementById('empty-state');
const emptyDetail = document.getElementById('empty-detail');
const statusInd = document.getElementById('status-indicator');
const statusDetail = document.getElementById('status-detail');
const statusCount = document.getElementById('status-count');
const footerCount = document.getElementById('footer-compliant-count');
const telPanel = document.getElementById('telemetry-panel');
const telToggle = document.getElementById('telemetry-toggle');
const telBody = document.getElementById('telemetry-body');
const telData = document.getElementById('telemetry-data');
const missionParams = document.getElementById('mission-params');
const sizeExt = document.getElementById('size-external');
const sizeInt = document.getElementById('size-internal');
const sizeTotal = document.getElementById('size-total');
const splitPreview = document.getElementById('total-split-preview');
const advancedToggle = document.getElementById('advanced-toggle');
const advancedSplit = document.getElementById('advanced-split');
const presetBtns = document.querySelectorAll('.preset-btn');
const sizeRows = document.querySelectorAll('.size-row');
const scanOverlay = document.getElementById('scan-overlay');
const scanOverlayDetail = document.getElementById('scan-overlay-detail');

// ── State ───────────────────────────────────────────────────────────────────
let isScanning = false;
let allLocksCache = [];

// ── Security Tier: derived from accreditations + data field ─────────────────
function deriveTier(lock) {
    if (lock.security_tier) return lock.security_tier;
    const a = lock.security_accreditations.map(x => x.toLowerCase()).join(' ');
    const hasTS007 = a.includes('ts007');
    const hasSS312 = a.includes('ss312') || a.includes('diamond');
    const hasSBD = a.includes('secured by design');
    const hasBS3621 = a.includes('bs3621');
    const antiCount = (lock.anti_attack || []).length;
    if (hasTS007 && hasSS312 && (hasSBD || antiCount >= 4)) return 'top-notch';
    if (hasTS007 && hasSS312) return 'elite';
    if (hasTS007) return 'high';
    if (hasBS3621) return 'basic';
    return 'high'; // default for anything that passed the TS007 filter
}

const TIER_ORDER = { 'any': 0, 'basic': 1, 'high': 2, 'elite': 3, 'top-notch': 4 };

// ── Total length preview (e.g. "= 35 + 35mm") ────────────────────────────────
function updateSplitPreview(totalMm) {
    // Show the most typical balanced split for the given total
    const half = Math.floor(totalMm / 2);
    const other = totalMm - half;
    if (splitPreview) splitPreview.textContent = `= ${half} + ${other}mm`;
}
updateSplitPreview(70);

// ── Size table row clicks ───────────────────────────────────────────────────────────
function selectSizeRow(total) {
    const totalInt = parseInt(total, 10);
    sizeTotal.value = totalInt;
    updateSplitPreview(totalInt);
    sizeRows.forEach(r => r.classList.toggle('active', parseInt(r.dataset.total, 10) === totalInt));
}

sizeRows.forEach(row => {
    row.addEventListener('click', () => selectSizeRow(row.dataset.total));
    row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') selectSizeRow(row.dataset.total); });
});
sizeTotal.addEventListener('input', () => {
    const v = parseInt(sizeTotal.value, 10) || 70;
    updateSplitPreview(v);
    sizeRows.forEach(r => r.classList.toggle('active', parseInt(r.dataset.total, 10) === v));
});

// ── Advanced toggle ───────────────────────────────────────────────────────────
advancedToggle.addEventListener('click', () => {
    const open = advancedToggle.getAttribute('aria-expanded') === 'true';
    advancedSplit.hidden = open;
    advancedToggle.setAttribute('aria-expanded', String(!open));
    advancedToggle.textContent = open
        ? '▶ Advanced: specify external/internal split'
        : '▼ Advanced: specify external/internal split';
});

// ── Split preset buttons (inside advanced panel) ──────────────────────────────
presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        sizeExt.value = btn.dataset.ext;
        sizeInt.value = btn.dataset.int;
        presetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});
sizeExt.addEventListener('input', () => presetBtns.forEach(b => b.classList.remove('active')));
sizeInt.addEventListener('input', () => presetBtns.forEach(b => b.classList.remove('active')));

// ── Config Reader ─────────────────────────────────────────────────────────────
function getConfig() {
    const useAdvanced = advancedSplit && !advancedSplit.hidden;
    const totalMm = parseInt(sizeTotal?.value, 10) || 70;
    const externalMm = useAdvanced ? (parseInt(sizeExt.value, 10) || 35) : null;
    const internalMm = useAdvanced ? (parseInt(sizeInt.value, 10) || 35) : null;
    return {
        securityTier: document.querySelector('input[name="security-tier"]:checked')?.value ?? 'any',
        budget: document.querySelector('input[name="budget"]:checked')?.value ?? 'any',
        environment: document.querySelector('input[name="environment"]:checked')?.value ?? 'any',
        doorType: document.querySelector('input[name="door-type"]:checked')?.value ?? 'any',
        attackReqs: [...document.querySelectorAll('input[name="attack"]:checked')].map(el => el.value),
        cylinderType: document.querySelector('input[name="cylinder-type"]:checked')?.value ?? 'any',
        // Size: if advanced panel is open, use split; otherwise use total length
        useAdvanced,
        totalMm,
        externalMm,
        internalMm,
    };
}

// ── Config Label helpers ──────────────────────────────────────────────────────
const TIER_LABELS = { any: 'Any Tier', basic: 'Basic', high: 'High Security', elite: 'Elite', 'top-notch': 'Top Notch' };
const TYPE_LABELS = { any: 'Any Type', double: 'Double Euro', thumbturn: 'Thumbturn' };

// ── Client-side filter ────────────────────────────────────────────────────────
function filterLocks(locks, cfg) {
    return locks.filter(lock => {

        // 1. Security Tier
        if (cfg.securityTier !== 'any') {
            const lockTier = deriveTier(lock);
            const lockTierRank = TIER_ORDER[lockTier] ?? 2;
            const reqRank = TIER_ORDER[cfg.securityTier] ?? 0;
            if (lockTierRank < reqRank) return false;
        }

        // 2. Budget
        if (cfg.budget !== 'any') {
            const priceStr = (lock.price_gbp || '').replace(/[£,]/g, '').trim();
            const price = parseFloat(priceStr);
            if (isNaN(price)) return false; // exclude if price unknown and budget filter set
            if (cfg.budget === 'under40' && price >= 40) return false;
            if (cfg.budget === '40-70' && (price < 40 || price > 70)) return false;
            if (cfg.budget === '70-100' && (price < 70 || price > 100)) return false;
            if (cfg.budget === '100plus' && price < 100) return false;
        }

        // 3. Environment
        if (cfg.environment !== 'any') {
            const env = (lock.environment || 'any').toLowerCase();
            if (env !== 'any' && env !== cfg.environment) return false;
        }

        // 4. Door Material
        if (cfg.doorType !== 'any') {
            const compat = lock.door_compatibility || [];
            if (compat.length > 0 && !compat.includes(cfg.doorType)) return false;
        }

        // 5. Anti-Attack (AND logic — must have ALL selected)
        if (cfg.attackReqs.length > 0) {
            const lockAttacks = lock.anti_attack || [];
            if (!cfg.attackReqs.every(req => lockAttacks.includes(req))) return false;
        }

        // 6. Cylinder Type
        if (cfg.cylinderType !== 'any') {
            const t = (lock.cylinder_type ?? '').toLowerCase();
            if (cfg.cylinderType === 'thumbturn' && !t.includes('thumbturn') && !t.includes('thumb')) return false;
            if (cfg.cylinderType === 'double' && !t.includes('double') && !t.includes('key/key') && t && t !== 'any' && t !== 'n/a') return false;
        }

        // 7. Cylinder Size — only filter when the lock has size data
        // Locks with no cylinder_sizes (mortice, new brands, etc.) always pass through
        if (cfg.totalMm !== null && lock.cylinder_sizes && lock.cylinder_sizes.length > 0) {
            let matched;
            if (cfg.useAdvanced) {
                // Advanced mode: match each side within ±5mm
                matched = lock.cylinder_sizes.some(s => {
                    const extOk = !s.external_mm || Math.abs(s.external_mm - cfg.externalMm) <= 5;
                    const intOk = !s.internal_mm || Math.abs(s.internal_mm - cfg.internalMm) <= 5;
                    return extOk && intOk;
                });
            } else {
                // Simple mode: match total length (ext + int) within ±5mm
                matched = lock.cylinder_sizes.some(s => {
                    const total = (s.external_mm || 0) + (s.internal_mm || 0);
                    return total > 0 && Math.abs(total - cfg.totalMm) <= 5;
                });
            }
            if (!matched) return false;
        }

        return true;
    });
}

// ── Reset Filters ─────────────────────────────────────────────────────────────
function resetFilters() {
    document.querySelectorAll('input[name="security-tier"]').forEach((r, i) => r.checked = i === 0);
    document.querySelectorAll('input[name="budget"]').forEach((r, i) => r.checked = i === 0);
    document.querySelectorAll('input[name="environment"]').forEach((r, i) => r.checked = i === 0);
    document.querySelectorAll('input[name="door-type"]').forEach((r, i) => r.checked = i === 0);
    document.querySelectorAll('input[name="cylinder-type"]').forEach((r, i) => r.checked = i === 0);
    document.querySelectorAll('input[name="attack"]').forEach(cb => cb.checked = false);
    // Reset total length
    if (sizeTotal) { sizeTotal.value = 70; updateSplitPreview(70); }
    selectSizeRow(70);
    // Reset split inputs
    sizeExt.value = 35;
    sizeInt.value = 35;
    presetBtns.forEach((b, i) => b.classList.toggle('active', i === 0));
    // Collapse advanced panel
    if (advancedSplit) advancedSplit.hidden = true;
    if (advancedToggle) {
        advancedToggle.setAttribute('aria-expanded', 'false');
        advancedToggle.textContent = '▶ Advanced: specify external/internal split';
    }

    if (allLocksCache.length > 0) {
        renderResults(allLocksCache, getConfig(), null);
    }
}

// ── Scan Overlay ──────────────────────────────────────────────────────────────
function showScanOverlay(detail) {
    if (scanOverlayDetail) scanOverlayDetail.textContent = detail || 'Contacting UK manufacturer databases…';
    if (scanOverlay) scanOverlay.hidden = false;
    document.body.classList.add('is-scanning');
}
function hideScanOverlay() {
    if (scanOverlay) scanOverlay.hidden = true;
    document.body.classList.remove('is-scanning');
}

// ── Scan Orchestration ────────────────────────────────────────────────────────
async function initiateScan(forceRefresh = false) {
    if (isScanning) return;
    isScanning = true;

    const cfg = getConfig();
    const mode = forceRefresh ? 'LIVE SCRAPE — contacting Yale, Ultion, Avocet, Mul-T-Lock, ERA…' : 'Loading cached results and applying filters…';
    showScanOverlay(mode);
    setStatus('running', '● SCANNING', `Acquiring targets…`);
    splashState.hidden = true;
    emptyState.hidden = true;
    missionParams.classList.add('params-scanning');
    btnScan.disabled = true;
    showSkeletons(5);

    try {
        const url = forceRefresh ? '/api/locks?refresh=true' : '/api/locks';
        const res = await fetch(url);
        if (!res.ok) {
            const e = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(e.message ?? `HTTP ${res.status}`);
        }
        const data = await res.json();
        allLocksCache = data.locks ?? [];
        renderResults(allLocksCache, cfg, data.telemetry ?? null);
    } catch (err) {
        lockGrid.innerHTML = '';
        setStatus('error', '● EXTRACTION FAILED', `Error: ${err.message}`);
        lockGrid.appendChild(buildErrorCard('SCAN FAILURE', err.message));
    } finally {
        isScanning = false;
        btnScan.disabled = false;
        missionParams.classList.remove('params-scanning');
        hideScanOverlay();
    }
}

function renderResults(allLocks, cfg, telem) {
    const filtered = filterLocks(allLocks, cfg);
    lockGrid.innerHTML = '';

    if (filtered.length === 0) {
        emptyState.hidden = false;
        const active = buildActiveFiltersLabel(cfg);
        emptyDetail.textContent = active ? `No locks match: ${active}. Try relaxing some filters.` : 'No compliant locks found. Try refreshing.';
        setStatus('error', '● ZERO TARGETS', 'No locks match your specification — adjust parameters above.');
        statusCount.textContent = '';
        footerCount.textContent = '0 TARGETS';
    } else {
        emptyState.hidden = true;
        // Sort by security tier descending
        const sorted = [...filtered].sort((a, b) => (TIER_ORDER[deriveTier(b)] ?? 2) - (TIER_ORDER[deriveTier(a)] ?? 2));
        sorted.forEach(lock => lockGrid.appendChild(buildLockCard(lock)));
        const fromTotal = allLocks.length !== filtered.length ? ` (${allLocks.length - filtered.length} filtered out)` : '';
        setStatus('success', '● EXTRACTION COMPLETE', `${filtered.length} target(s) acquired${fromTotal} — ${telem ? `${telem.successTargets}/5 sources scanned` : 'from cache'}`);
        statusCount.textContent = `[${filtered.length} TARGETS]`;
        footerCount.textContent = `${filtered.length} COMPLIANT LOCK(S)`;
    }

    if (telem) { telPanel.hidden = false; loadTelemetry(); }
}

function buildActiveFiltersLabel(cfg) {
    const parts = [];
    if (cfg.securityTier !== 'any') parts.push(TIER_LABELS[cfg.securityTier]);
    if (cfg.budget !== 'any') parts.push({ under40: '<£40', '40-70': '£40-70', '70-100': '£71-100', '100plus': '£100+' }[cfg.budget] || cfg.budget);
    if (cfg.environment !== 'any') parts.push(cfg.environment);
    if (cfg.doorType !== 'any') parts.push(cfg.doorType.toUpperCase());
    if (cfg.attackReqs.length > 0) parts.push(cfg.attackReqs.join('+'));
    if (cfg.cylinderType !== 'any') parts.push(TYPE_LABELS[cfg.cylinderType]);
    return parts.join(' · ');
}

// ── Card Builder ──────────────────────────────────────────────────────────────
function buildLockCard(lock) {
    const tier = deriveTier(lock);
    const card = document.createElement('article');
    card.className = `lock-card tier-card-${tier}`;

    card.innerHTML = `
    <div class="card-tier-badge tier-badge-${tier}">${TIER_LABELS[tier] ?? tier}</div>
    <div class="card-image-wrap">${buildImageHtml(lock.lock_image, lock.model_name)}</div>
    <div class="card-body">
      <div class="card-manufacturer">${esc(lock.manufacturer)}</div>
      <div class="card-model glitch-text" data-text="${esc(lock.model_name)}">${esc(lock.model_name)}</div>
      <div class="card-accreditations">${buildAccreditationTags(lock.security_accreditations)}</div>
      <div class="card-specs-row">
        ${buildCylinderSpecHtml(lock)}
        ${buildAttackBadges(lock)}
      </div>
      ${buildCompatibilityHtml(lock)}
      <div class="card-price ${lock.price_gbp === 'N/A' ? 'price-na' : ''}">${lock.price_gbp === 'N/A' ? 'Price: N/A' : esc(lock.price_gbp)}</div>
      ${buildReviewsHtml(lock.reviews)}
      <div class="card-footer">${buildLinkHtml(lock.product_url, lock.manufacturer)}</div>
    </div>`;
    return card;
}

function buildAttackBadges(lock) {
    const features = lock.anti_attack || [];
    if (features.length === 0) return '';
    const icons = { 'anti-snap': '✂', 'anti-bump': '🔨', 'anti-drill': '🔧', 'anti-pick': '🗝', 'anti-extract': '🔒' };
    return features.map(f => `<span class="spec-badge spec-attack" title="${f.replace('anti-', 'Anti-')}">${icons[f] ?? '⚔'}</span>`).join('');
}

function buildCompatibilityHtml(lock) {
    const doors = lock.door_compatibility || [];
    const env = lock.environment;
    if (doors.length === 0 && !env) return '';
    const doorIcons = { upvc: '🔷 UPVC', composite: '⬛ Composite', timber: '🌲 Timber', aluminium: '🔩 Aluminium' };
    let html = '<div class="card-compat">';
    if (env && env !== 'any') html += `<span class="compat-badge compat-env">${env === 'external' ? '🏠 External' : '🚪 Internal'}</span>`;
    doors.forEach(d => { html += `<span class="compat-badge">${doorIcons[d] ?? d}</span>`; });
    html += '</div>';
    return html;
}

function buildCylinderSpecHtml(lock) {
    const parts = [];
    if (lock.cylinder_type && lock.cylinder_type !== 'N/A') {
        const t = lock.cylinder_type.toLowerCase();
        const label = t.includes('thumbturn') ? '🔄 THUMBTURN' : t.includes('double') ? '🔑🔑 D.EURO' : `🔑 ${lock.cylinder_type.toUpperCase()}`;
        parts.push(`<span class="spec-badge spec-type">${label}</span>`);
    }
    if (lock.cylinder_sizes && lock.cylinder_sizes.length > 0) {
        const str = lock.cylinder_sizes.map(s => s.label ?? `${s.external_mm}/${s.internal_mm}`).slice(0, 3).join(' · ');
        parts.push(`<span class="spec-badge spec-size">📏 ${str}mm</span>`);
    }
    return parts.join('');
}

function buildImageHtml(src, alt) {
    if (!src || src === 'N/A') return `<div class="card-image-placeholder">🔒</div>`;
    return `<img class="card-image" src="${esc(src)}" alt="${esc(alt)}" loading="lazy"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
    <div class="card-image-placeholder" style="display:none">🔒</div>`;
}

function buildAccreditationTags(accs) {
    if (!Array.isArray(accs) || accs.length === 0) return '';
    const VALID = ['TS007', 'SS312', 'BS3621'];
    return accs.filter(a => VALID.some(v => a.includes(v))).map(a => {
        const cls = a.includes('TS007') ? 'tag-ts007' : a.includes('SS312') ? 'tag-ss312' : 'tag-bs3621';
        return `<span class="accreditation-tag ${cls}">${esc(a)}</span>`;
    }).join('');
}

function buildReviewsHtml(reviews) {
    if (!reviews) return `<div class="reviews-na">Reviews: N/A</div>`;
    const stars = '★'.repeat(Math.floor(reviews.score)) + (reviews.score % 1 >= 0.5 ? '½' : '') + '☆'.repeat(5 - Math.ceil(reviews.score));
    return `<div class="card-reviews">
      <span class="stars">${stars}</span>
      <span class="review-score">${reviews.score.toFixed(1)}</span>
      <span class="review-count">(${reviews.count.toLocaleString()})</span>
    </div>`;
}

function buildLinkHtml(url, mfr) {
    if (!url || url === 'N/A') return `<span class="card-link-na">Product URL unavailable</span>`;
    return `<a class="card-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">⬡ VIEW TARGET →</a>`;
}

function buildErrorCard(title, reason) {
    const card = document.createElement('article');
    card.className = 'lock-card card-failed';
    card.innerHTML = `<div class="card-body" style="gap:12px">
      <div style="font-size:2.5rem">⚠</div>
      <div class="card-failed-label">EXTRACTION_FAILED: ${esc(title)}</div>
      <div class="card-failed-reason">${esc(reason)}</div></div>`;
    return card;
}

// ── Skeleton Loaders ──────────────────────────────────────────────────────────
function showSkeletons(n) {
    lockGrid.innerHTML = '';
    for (let i = 0; i < n; i++) {
        const s = document.createElement('div');
        s.className = 'card-skeleton';
        s.innerHTML = `<div class="skeleton-img"></div>
        <div class="skeleton-line" style="width:40%"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>`;
        lockGrid.appendChild(s);
    }
}

// ── Telemetry ─────────────────────────────────────────────────────────────────
async function loadTelemetry() {
    try {
        const res = await fetch('/api/status');
        const data = await res.json();
        if (data?.report) telData.textContent = JSON.stringify(data.report, null, 2);
    } catch { telData.textContent = 'Telemetry unavailable.'; }
}
function toggleTelemetry() {
    const open = telToggle.getAttribute('aria-expanded') === 'true';
    telBody.hidden = open;
    telToggle.setAttribute('aria-expanded', String(!open));
    telToggle.querySelector('.telemetry-title').textContent = open ? '▶ TELEMETRY // EXTRACTION LOG' : '▼ TELEMETRY // EXTRACTION LOG';
    if (!open) loadTelemetry();
}

// ── Status ────────────────────────────────────────────────────────────────────
function setStatus(type, ind, detail) {
    statusInd.textContent = ind;
    statusInd.className = `status-indicator ${type}`;
    statusDetail.textContent = detail;
}

// ── Utility ───────────────────────────────────────────────────────────────────
function esc(s) {
    if (typeof s !== 'string') return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Wire Events ───────────────────────────────────────────────────────────────
// Single FIND LOCKS button — always triggers a live scrape (cache cleared on server start)
btnScan.addEventListener('click', () => initiateScan(true));
btnReset.addEventListener('click', resetFilters);
telToggle.addEventListener('click', toggleTelemetry);
telToggle.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') toggleTelemetry(); });
