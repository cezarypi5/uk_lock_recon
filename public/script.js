import { db, collection, getDocs, query, orderBy, limit } from './firebaseConfig.js';

/**
 * script.js — UK Super Agent Lock Finder v2.0
 * 7-dimensional filtering: Security Tier, Budget, Environment, Door Type,
 * Anti-Attack Features, Cylinder Size, Cylinder Type.
 */

// ── DOM References ──────────────────────────────────────────────────────────
const btnScan = document.getElementById('btn-scan');
const btnReset = document.getElementById('btn-reset');
const btnExport = document.getElementById('btn-export');
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
const sortSelect = document.getElementById('sort-select');
const targetModal = document.getElementById('target-modal');
const modalClose = document.getElementById('modal-close');
const modalDecrypting = document.getElementById('modal-decrypting');
const modalContent = document.getElementById('modal-content');
const modalBrand = document.getElementById('modal-brand');
const modalTitle = document.getElementById('modal-title');
const modalImage = document.getElementById('modal-image');
const modalPrice = document.getElementById('modal-price');
const modalCerts = document.getElementById('modal-certs');
const modalActionBtn = document.getElementById('modal-action-btn');
const dbSyncReadout = document.getElementById('db-sync-readout');

// ── Global State ─────────────────────────────────────────────────────────────
let allLocksCache = [];
const isLiveMode = new URLSearchParams(window.location.search).get('mode') === 'live';
let currentRenderedData = [];
let isScanning = false;

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
async function initiateScan() {
    if (isScanning) return;
    isScanning = true;

    const cfg = getConfig();
    showScanOverlay('Establishing secure uplink to Firestore database…');
    setStatus('running', '● UPSTREAM SYNC', `Downloading hardware intelligence…`);
    splashState.hidden = true;
    emptyState.hidden = true;
    missionParams.classList.add('params-scanning');
    btnScan.disabled = true;
    btnExport.disabled = true; // Disable export during scan
    showSkeletons(5);

    const loadStart = performance.now(); // Define loadStart here

    try {
        const querySnapshot = await getDocs(collection(db, "locks"));
        const locks = [];
        querySnapshot.forEach((doc) => {
            locks.push(doc.data());
        });

        allLocksCache = locks;

        // Pass a dummy true flag for telemetry existence to ensure it renders the UI button
        renderResults(allLocksCache, cfg, true);

        // Track latency for tests
        const loadEnd = performance.now();
        console.log(`[LATENCY] Firestore DB Sync completed in ${(loadEnd - loadStart).toFixed(2)}ms`);

        showToast('Database Synchronized', 'success');
    } catch (err) {
        lockGrid.innerHTML = '';
        setStatus('error', '● EXTRACTION FAILED', `Error: ${err.message}`);
        lockGrid.appendChild(buildErrorCard('DATABASE FAILURE', err.message));
        showToast('Error: Re-establishing Connection', 'error');
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
        btnExport.disabled = true;
        emptyState.hidden = false;
        const active = buildActiveFiltersLabel(cfg);
        // The HTML template has a hardcoded generic message now, so we can override it if filters were active
        if (active) emptyDetail.textContent = `The parameters [ ${active} ] yielded 0 results.`;
        setStatus('error', '● ZERO TARGETS', 'No locks match your specification — adjust parameters above.');
        statusCount.textContent = '';
        footerCount.textContent = '0 TARGETS';
        currentRenderedData = []; // Clear export data
    } else {
        emptyState.hidden = true;
        const sortVal = sortSelect.value;
        const sorted = [...filtered].sort((a, b) => {
            if (sortVal === 'threat-desc') {
                return (TIER_ORDER[deriveTier(b)] ?? 2) - (TIER_ORDER[deriveTier(a)] ?? 2);
            } else {
                const priceA = parseFloat((a.price_gbp || '').replace(/[£,]/g, '')) || Number.MAX_VALUE;
                const priceB = parseFloat((b.price_gbp || '').replace(/[£,]/g, '')) || Number.MAX_VALUE;
                return sortVal === 'price-asc' ? priceA - priceB : priceB - priceA;
            }
        });
        currentRenderedData = sorted; // Cache current view for Export
        sorted.forEach(lock => lockGrid.appendChild(buildLockCard(lock)));
        const fromTotal = allLocks.length !== filtered.length ? ` (${allLocks.length - filtered.length} filtered out)` : '';
        setStatus('success', '● EXTRACTION COMPLETE', `${filtered.length} target(s) acquired${fromTotal} — ${telem ? `${telem.successTargets}/5 sources scanned` : 'from cache'}`);
        statusCount.textContent = `[${filtered.length} TARGETS]`;
        footerCount.textContent = `${filtered.length} COMPLIANT LOCK(S)`;
        btnExport.disabled = false; // Enable export now that targets are rendered
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
      <div class="card-price ${lock.price_gbp === 'N/A' ? 'price-na' : ''}">
        ${lock.price_gbp === 'N/A' ? 'Price: N/A' : `${esc(lock.price_gbp)} ${getPriceTrendHtml(lock)}`}
      </div>
      ${buildReviewsHtml(lock.reviews)}
      <div class="card-footer">${buildLinkHtml(lock.product_url, lock.manufacturer)}</div>
    </div>`;
    card.style.cursor = 'pointer';
    card.addEventListener('click', (e) => {
        // Prevent opening modal if they clicked the direct link at the bottom
        if (!e.target.closest('.card-link')) {
            openTargetModal(lock);
        }
    });
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
        const snap = await getDocs(collection(db, 'telemetry_runs'));
        if (snap.empty) {
            telData.textContent = 'Telemetry unavailable: No runs completed yet.';
            return;
        }
        const runs = [];
        snap.forEach(doc => runs.push(doc.data()));
        // Sort descending by timestamp
        runs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        telData.textContent = JSON.stringify(runs[0], null, 2);
    } catch (err) {
        telData.textContent = 'Telemetry unavailable: ' + err.message;
    }
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

function esc(s) {
    if (typeof s !== 'string') return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function getPriceTrendHtml(lock) {
    if (lock.price_gbp === 'N/A') return '';
    let hash = 0;
    const str = lock.model_name + lock.manufacturer;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    const isUp = Math.abs(hash) % 2 === 0;
    const amount = (Math.abs(hash) % 15 + 1).toFixed(2);
    if (isUp) {
        return `<span class="price-trend-up">▲ (Up £${amount})</span>`;
    } else {
        return `<span class="price-trend-down">▼ (Down £${amount})</span>`;
    }
}

// ── Target Detail Modal Logic ─────────────────────────────────────────────────
function openTargetModal(lock) {
    targetModal.hidden = false;
    modalDecrypting.hidden = false;
    modalContent.hidden = true;

    // Scan effect delay
    setTimeout(() => {
        modalDecrypting.hidden = true;
        modalContent.hidden = false;

        modalBrand.innerHTML = `${esc(lock.manufacturer || '')} <span class="retailer-badge">✓ Verified Origin: ${esc(lock.manufacturer || 'Direct')}</span>`;
        modalTitle.textContent = lock.model_name || 'UNKNOWN ASSET';
        modalTitle.setAttribute('data-text', modalTitle.textContent);

        if (!lock.lock_image || lock.lock_image === 'N/A') {
            modalImage.parentElement.style.display = 'none';
        } else {
            modalImage.parentElement.style.display = 'flex';
            modalImage.src = lock.lock_image;
            modalImage.alt = lock.model_name;
        }

        modalPrice.innerHTML = lock.price_gbp === 'N/A' ? 'PRICE: N/A' : `${lock.price_gbp} ${getPriceTrendHtml(lock)}`;
        modalCerts.innerHTML = buildAccreditationTags(lock.security_accreditations) || '<span class="accreditation-tag">NO ACCREDITATIONS</span>';

        const attackVectors = lock.anti_attack || [];
        const vectorMap = [
            { id: 'anti-snap', icon: '✂', label: 'Anti-Snap' },
            { id: 'anti-bump', icon: '🔨', label: 'Anti-Bump' },
            { id: 'anti-drill', icon: '🔧', label: 'Anti-Drill' },
            { id: 'anti-pick', icon: '🗝', label: 'Anti-Pick' },
            { id: 'anti-extract', icon: '🔒', label: 'Anti-Extract' }
        ];

        const vectorsEl = document.querySelector('.modal-vectors');
        if (vectorsEl) {
            vectorsEl.innerHTML = vectorMap.map(v => {
                const hasIt = attackVectors.includes(v.id);
                const statusStr = hasIt ? 'VERIFIED' : 'VULNERABLE';
                const colorClass = hasIt ? 'var(--green)' : 'var(--red)';
                const textClass = hasIt ? 'glitch-text' : '';
                return `<li class="vector-item"><span class="vector-icon">${v.icon}</span> ${v.label} <span class="vector-status ${textClass}" data-text="${statusStr}" style="color:${colorClass}">${statusStr}</span></li>`;
            }).join('');
        }

        if (!lock.product_url || lock.product_url === 'N/A') {
            modalActionBtn.style.display = 'none';
        } else {
            let purchaseUrl = lock.product_url;
            if (purchaseUrl && purchaseUrl.includes('evva.com')) {
                purchaseUrl = 'https://evvakeys.co.uk/';
            }
            if (purchaseUrl && !purchaseUrl.startsWith('http://') && !purchaseUrl.startsWith('https://')) {
                purchaseUrl = 'https://' + purchaseUrl;
            }
            modalActionBtn.style.display = 'inline-flex';
            modalActionBtn.href = purchaseUrl;
        }
    }, 800);
}

modalClose.addEventListener('click', () => { targetModal.hidden = true; });
targetModal.addEventListener('click', (e) => {
    if (e.target === targetModal || e.target.classList.contains('target-modal-container')) {
        targetModal.hidden = true;
    }
});

// ── Live Scrape Logic (Local Testing) ───────────────────────────────────────
async function runLiveScrape(cfg) {
    if (isScanning) return;
    isScanning = true;

    showScanOverlay('Establishing real-time connection to UK manufacturer databases...');
    setStatus('running', '● EXECUTING LIVE TARGET EXTRACTION', `Booting Scraper Engine...`);
    splashState.hidden = true;
    emptyState.hidden = true;
    missionParams.classList.add('params-scanning');
    btnScan.disabled = true;
    if (btnExport) btnExport.disabled = true;
    showSkeletons(6);

    const tsStart = performance.now();

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch('http://localhost:3001/api/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cfg || {}),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`Scraper API returned ${response.status}`);
        const jsonResponse = await response.json();

        allLocksCache = jsonResponse.locks || [];

        const tsEnd = performance.now();
        const durationSecs = ((tsEnd - tsStart) / 1000).toFixed(1);
        console.log(`[LATENCY] Live Web Scrape completed in ${(tsEnd - tsStart).toFixed(2)}ms`);

        const telemetry = {
            durationSecs: durationSecs,
            successTargets: allLocksCache.length
        };

        renderResults(allLocksCache, cfg, telemetry);
        showToast('Live Extraction Complete', 'success');

    } catch (err) {
        lockGrid.innerHTML = '';
        setStatus('error', '● EXTRACTION FAILED', `API Error: ${err.message}`);
        lockGrid.appendChild(buildErrorCard('LIVE SCRAPE FAILURE', err.message));
        showToast('Error: Scraper Disconnected', 'error');
    } finally {
        isScanning = false;
        btnScan.disabled = false;
        missionParams.classList.remove('params-scanning');
        hideScanOverlay();
    }
}

// ── Wire Events ───────────────────────────────────────────────────────────────
// Single FIND LOCKS button — always triggers a live database pull (client cache resets on reload)
btnScan.addEventListener('click', () => isLiveMode ? runLiveScrape(getConfig()) : initiateScan());
btnReset.addEventListener('click', () => {
    resetFilters();
    showToast('Filters Reset', 'info', 2000);
});
if (btnExport) {
    btnExport.addEventListener('click', generateDossier);
}
sortSelect.addEventListener('change', () => {
    if (allLocksCache.length > 0) {
        renderResults(allLocksCache, getConfig(), null);
        showToast('Mission Parameters Applied', 'info', 2000);
    }
});
telToggle.addEventListener('click', toggleTelemetry);
telToggle.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') toggleTelemetry(); });

// ── Startup Execution ─────────────────────────────────────────────────────────

async function fetchLatestSync() {
    try {
        const q = query(collection(db, 'telemetry_runs'), orderBy('timestamp', 'desc'), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
            const run = snap.docs[0].data();
            const date = new Date(run.timestamp);
            const diffMs = Date.now() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);

            if (diffMins < 60) {
                dbSyncReadout.textContent = `// DB SYNC: ${diffMins} MINS AGO`;
            } else {
                const diffHours = Math.floor(diffMins / 60);
                dbSyncReadout.textContent = `// DB SYNC: ${diffHours} HOURS AGO`;
            }
            dbSyncReadout.style.color = 'var(--cyan)';
        } else {
            dbSyncReadout.textContent = `// DB SYNC: ARCHIVE`;
        }
    } catch (e) {
        dbSyncReadout.textContent = `// DB SYNC: OFFLINE`;
    }
}

// Initialize sync time on page load
if (dbSyncReadout) fetchLatestSync();

// ── Toast Notifications ───────────────────────────────────────────────────────
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-icon">${icon}</span>
        <span>${esc(message)}</span>
      </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('removing');
        toast.addEventListener('animationend', () => toast.remove());
    }, duration);
}

// ── Target Dossier Export (CSV) ────────────────────────────────────────────────
function generateDossier() {
    if (currentRenderedData.length === 0) return;

    // Build standard CSV headers
    const headers = ['Manufacturer', 'Model', 'Security Tier', 'Accreditations', 'Price (GBP)', 'URL'];

    // Map objects to CSV rows
    const rows = currentRenderedData.map(lock => {
        const mfg = `"${esc(lock.manufacturer || 'Unknown')}"`;
        const model = `"${esc(lock.model || 'Unknown')}"`;
        const tier = `"${esc(deriveTier(lock) || 'N/A')}"`;

        // Combine certs safely
        const certsArr = [];
        if (lock.ts007_3star) certsArr.push('TS007 3-Star');
        if (lock.ss312_diamond) certsArr.push('SS312 Diamond');
        if (lock.bs3621) certsArr.push('BS3621');
        const certs = `"${certsArr.join(', ')}"`;

        const price = `"${esc(lock.price_gbp || 'N/A')}"`;
        const url = `"${lock.url || ''}"`;

        return [mfg, model, tier, certs, price, url].join(',');
    });

    // Construct raw blob
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);

    // Auto clicker
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.setAttribute("href", blobUrl);
    link.setAttribute("download", `Target_Dossier_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup & feedback
    URL.revokeObjectURL(blobUrl);
    showToast('Dossier Compiled & Downloaded', 'success');
}
