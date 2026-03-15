/**
 * i18n.js — EN / PL translation dictionary for Lock Recon v2.0.0
 * Usage: import { t, setLang, currentLang } from './i18n.js';
 */

export const TRANSLATIONS = {
    en: {
        // Header
        headerBadge:        'CLASSIFIED',
        siteTitle:          'UK RESIDENTIAL HARDENING',
        siteSubtitle:       '// SUPER AGENT LOCK FINDER — LIVE INTELLIGENCE SYSTEM',
        dbSyncCalc:         '// DB SYNC: CALCULATING...',

        // Scan overlay
        scanLabel:          'TARGET ACQUISITION IN PROGRESS',
        scanSublabel:       'Scanning UK manufacturer databases…',
        scanUplink:         'Establishing secure uplink to Firestore database…',

        // Mission params header
        paramsTitle:        '⬡ MISSION PARAMETERS // FULL LOCK SPECIFICATION',

        // 0. Keyword
        keywordLabel:       '🎯 TEXT SEARCH / MANUFACTURER',
        keywordHint:        "Filter by specific brand (e.g., 'Yale', 'Ultion') or model name.",
        keywordPlaceholder: 'Enter target keyword (e.g. Abloy Protec2)...',

        // 1. Security tier
        tierLabel:          '🛡 SECURITY TIER',
        tierHint:           'From insurance-grade to military-class. Higher tiers require more accreditations.',
        tierAnyName:        'ANY TIER',
        tierAnyDesc:        'All security levels',
        tierBasicName:      'BASIC',
        tierBasicDesc:      'BS3621 insurance approved',
        tierHighName:       'HIGH',
        tierHighDesc:       'TS007 3-Star certified',
        tierEliteName:      'ELITE',
        tierEliteDesc:      'TS007 + SS312 Diamond',
        tierTopName:        'TOP NOTCH',
        tierTopDesc:        'All certs + full attack protection',

        // 2. Budget
        budgetLabel:        '💷 BUDGET RANGE',
        budgetHint:         'Filter by price bracket.',
        budgetAny:          'Any Budget',

        // 3. Environment
        envLabel:           '🏠 ENVIRONMENT',
        envHint:            'Where the lock will be installed.',
        envAny:             'ANY',
        envExtName:         'EXTERNAL',
        envExtDesc:         'Front / back door',
        envIntName:         'INTERNAL',
        envIntDesc:         'Bedroom / bathroom',

        // 4. Door material
        doorLabel:          '🚪 DOOR MATERIAL',
        doorHint:           'Filter by door type compatibility.',

        // 5. Attack protection
        attackLabel:        '⚔ REQUIRED ATTACK PROTECTION',
        attackHint:         'Select features the lock MUST have (AND logic — all selected must be present).',
        attackSnapName:     'ANTI-SNAP',
        attackSnapDesc:     'Resist cylinder snap attacks',
        attackBumpName:     'ANTI-BUMP',
        attackBumpDesc:     'Resist bump key attacks',
        attackDrillName:    'ANTI-DRILL',
        attackDrillDesc:    'Hardened drill-resistant core',
        attackPickName:     'ANTI-PICK',
        attackPickDesc:     'High-security pin configuration',
        attackExtractName:  'ANTI-EXTRACT',
        attackExtractDesc:  'Key cannot be forcibly removed',

        // 6. Cylinder size
        cylinderSizeLabel:  '📏 CYLINDER SIZE (mm)',
        cylinderSizeHint:   'Enter total cylinder length — the end-to-end measurement of the barrel. Most standard UPVC doors need <strong>70mm</strong>.',
        totalLengthLabel:   'TOTAL LENGTH',
        advancedToggle:     '▶ Advanced: specify external/internal split',
        advancedToggleOpen: '▼ Advanced: specify external/internal split',
        advancedHint:       'E.g. 35/35 = 35mm key-side + 35mm inside (70mm total). Used by locksmiths.',
        externalLabel:      'EXTERNAL (key side)',
        internalLabel:      'INTERNAL (inside)',
        splitPresets:       'SPLIT PRESETS:',
        sizeColTotal:       'Total Length',
        sizeColSplit:       'External / Internal split',
        sizeColUse:         'Typical use',
        size70desc:         'Standard UPVC door',
        size75desc:         'Slightly offset UPVC',
        size80desc:         'Composite / timber',
        size85desc:         'Thicker composite',
        size90desc:         'Heavy duty timber',
        size100desc:        'Long-throw / multipoint',
        size110desc:        'Extra-long or commercial',

        // 7. Cylinder type
        cylinderTypeLabel:  '🔑 CYLINDER TYPE',
        cylinderTypeHint:   'Thumbturn = key outside only, lever inside.',
        typeAny:            'ANY TYPE',
        typeDouble:         'DOUBLE EURO',
        typeDoubleDesc:     'Key / Key',
        typeThumb:          'THUMBTURN',
        typeThumbDesc:      'Key / Thumb-lever',

        // Status bar
        standby:            '● STANDBY',
        standbyDetail:      'Set mission parameters above, then initiate scan…',

        // Splash
        splashTitle:        'SUPER AGENT LOCK FINDER ONLINE',
        splashText:         'Configure your mission parameters above, then press <strong>FIND LOCKS</strong>.<br />Live intelligence from 17 UK manufacturers &amp; stockists — always fresh data.',
        splashTier:         '⬡ Security Tier — Basic → Top Notch',
        splashBudget:       '⬡ Budget Range — Under £40 to £100+',
        splashAttack:       '⬡ Anti-Attack — Snap / Bump / Drill / Pick / Extract',
        splashEnv:          '⬡ Environment — External / Internal',
        splashDoor:         '⬡ Door Material — UPVC / Composite / Timber / Aluminium',
        splashCylinder:     '⬡ Cylinder — Size (mm) + Type',

        // Empty state
        noTargets:          'NO TARGETS ACQUIRED',
        noTargetsDesc:      'The specified mission parameters yielded 0 results.',
        relaxFilters:       '[ RELAX FILTERS ]',

        // Telemetry
        telemetryTitle:     '▶ TELEMETRY // EXTRACTION LOG',
        telemetryTitleOpen: '▼ TELEMETRY // EXTRACTION LOG',
        telemetryHint:      '[CLICK TO EXPAND]',
        telemetryLoading:   'Loading…',

        // Modal
        securityClearance:  'SECURITY CLEARANCE',
        attackVectorRes:    'ATTACK VECTOR RESISTANCE',
        executePurchase:    'EXECUTE PURCHASE ⬈',
        verified:           'VERIFIED',
        vulnerable:         'VULNERABLE',

        // FAB
        sortLabel:          'SORT:',
        sortThreat:         'Threat Level (Highest First)',
        sortPriceAsc:       'Price (Low to High)',
        sortPriceDesc:      'Price (High to Low)',
        btnScan:            '⬡ FIND LOCKS',
        btnReset:           '✕ RESET',
        btnExport:          '⭳ DOSSIER',

        // Footer
        footerSbd:          'SECURED BY DESIGN',
        footerAwait:        '— AWAITING DATA —',

        // Toast messages
        toastDbSynced:      'Database Synchronized',
        toastResetFilters:  'Filters Reset',
        toastParamsApplied: 'Mission Parameters Applied',
        toastDossier:       'Dossier Compiled & Downloaded',
        toastConnErr:       'Error: Re-establishing Connection',
        toastScrapeErr:     'Error: Scraper Disconnected',
        toastScrapeOk:      'Live Extraction Complete',

        // Status messages
        upstreamSync:       '● UPSTREAM SYNC',
        upstreamDetail:     'Downloading hardware intelligence…',
        extractComplete:    '● EXTRACTION COMPLETE',
        extractFailed:      '● EXTRACTION FAILED',
        zeroTargets:        '● ZERO TARGETS',
        zeroDetail:         'No locks match your specification — adjust parameters above.',
    },

    pl: {
        // Header
        headerBadge:        'TAJNE',
        siteTitle:          'WZMOCNIENIE DOMU W UK',
        siteSubtitle:       '// SYSTEM WYSZUKIWANIA ZAMKÓW — DANE NA ŻYWO',
        dbSyncCalc:         '// SYNC BD: OBLICZANIE...',

        // Scan overlay
        scanLabel:          'POZYSKIWANIE CELU W TOKU',
        scanSublabel:       'Skanowanie baz producentów w UK…',
        scanUplink:         'Ustanawianie bezpiecznego połączenia z bazą danych…',

        // Mission params header
        paramsTitle:        '⬡ PARAMETRY MISJI // PEŁNA SPECYFIKACJA ZAMKA',

        // 0. Keyword
        keywordLabel:       '🎯 SZUKAJ TEKSTU / PRODUCENTA',
        keywordHint:        "Filtruj według marki (np. 'Yale', 'Ultion') lub nazwy modelu.",
        keywordPlaceholder: 'Wpisz słowo kluczowe (np. Abloy Protec2)...',

        // 1. Security tier
        tierLabel:          '🛡 POZIOM BEZPIECZEŃSTWA',
        tierHint:           'Od ubezpieczeniowego do klasy wojskowej. Wyższe poziomy wymagają więcej certyfikatów.',
        tierAnyName:        'DOWOLNY',
        tierAnyDesc:        'Wszystkie poziomy',
        tierBasicName:      'PODSTAWOWY',
        tierBasicDesc:      'BS3621 zatwierdzone ubezpieczeniowo',
        tierHighName:       'WYSOKI',
        tierHighDesc:       'Certyfikat TS007 3-gwiazdkowy',
        tierEliteName:      'ELITARNY',
        tierEliteDesc:      'TS007 + SS312 Diamond',
        tierTopName:        'NAJWYŻSZY',
        tierTopDesc:        'Wszystkie certyfikaty + pełna ochrona',

        // 2. Budget
        budgetLabel:        '💷 ZAKRES BUDŻETU',
        budgetHint:         'Filtruj według przedziału cenowego.',
        budgetAny:          'Dowolny budżet',

        // 3. Environment
        envLabel:           '🏠 MIEJSCE MONTAŻU',
        envHint:            'Gdzie zamek zostanie zamontowany.',
        envAny:             'DOWOLNE',
        envExtName:         'ZEWNĘTRZNE',
        envExtDesc:         'Drzwi wejściowe / tylne',
        envIntName:         'WEWNĘTRZNE',
        envIntDesc:         'Sypialnia / łazienka',

        // 4. Door material
        doorLabel:          '🚪 MATERIAŁ DRZWI',
        doorHint:           'Filtruj według kompatybilności z typem drzwi.',

        // 5. Attack protection
        attackLabel:        '⚔ WYMAGANA OCHRONA PRZED ATAKAMI',
        attackHint:         'Wybierz cechy, które zamek MUSI posiadać (logika AND — wszystkie wybrane muszą być obecne).',
        attackSnapName:     'ANTY-SNAP',
        attackSnapDesc:     'Odporność na złamanie wkładki',
        attackBumpName:     'ANTY-BUMP',
        attackBumpDesc:     'Odporność na klucz udarowy',
        attackDrillName:    'ANTY-WIERTŁO',
        attackDrillDesc:    'Hartowany rdzeń odporny na wiercenie',
        attackPickName:     'ANTY-WYTRYCHY',
        attackPickDesc:     'Wysoko-zabezpieczona konfiguracja pinów',
        attackExtractName:  'ANTY-WYCIĄGANIE',
        attackExtractDesc:  'Klucz nie może być siłowo usunięty',

        // 6. Cylinder size
        cylinderSizeLabel:  '📏 ROZMIAR WKŁADKI (mm)',
        cylinderSizeHint:   'Podaj całkowitą długość wkładki — pomiar od końca do końca. Standardowe drzwi UPVC wymagają <strong>70mm</strong>.',
        totalLengthLabel:   'CAŁKOWITA DŁUGOŚĆ',
        advancedToggle:     '▶ Zaawansowane: podaj podział zewnętrzny/wewnętrzny',
        advancedToggleOpen: '▼ Zaawansowane: podaj podział zewnętrzny/wewnętrzny',
        advancedHint:       'Np. 35/35 = 35mm od klucza + 35mm od środka (70mm łącznie). Stosowane przez ślusarzy.',
        externalLabel:      'ZEWNĘTRZNA (strona klucza)',
        internalLabel:      'WEWNĘTRZNA (środek)',
        splitPresets:       'GOTOWE PODZIAŁY:',
        sizeColTotal:       'Całkowita długość',
        sizeColSplit:       'Podział zewn. / wewn.',
        sizeColUse:         'Typowe zastosowanie',
        size70desc:         'Standardowe drzwi UPVC',
        size75desc:         'UPVC z lekkim przesunięciem',
        size80desc:         'Kompozyt / drewno',
        size85desc:         'Grubszy kompozyt',
        size90desc:         'Ciężkie drzwi drewniane',
        size100desc:        'Wielopunktowe / długi skok',
        size110desc:        'Bardzo długa lub komercyjna',

        // 7. Cylinder type
        cylinderTypeLabel:  '🔑 TYP WKŁADKI',
        cylinderTypeHint:   'Nakrętka = klucz tylko od zewnątrz, dźwignia od wewnątrz.',
        typeAny:            'DOWOLNY TYP',
        typeDouble:         'PODWÓJNY EURO',
        typeDoubleDesc:     'Klucz / Klucz',
        typeThumb:          'Z NAKRĘTKĄ',
        typeThumbDesc:      'Klucz / Nakrętka',

        // Status bar
        standby:            '● GOTOWOŚĆ',
        standbyDetail:      'Ustaw parametry misji powyżej, następnie uruchom skan…',

        // Splash
        splashTitle:        'WYSZUKIWARKA ZAMKÓW ONLINE',
        splashText:         'Skonfiguruj parametry misji powyżej, następnie naciśnij <strong>ZNAJDŹ ZAMKI</strong>.<br />Dane na żywo od 17 producentów i dystrybutorów w UK — zawsze aktualne.',
        splashTier:         '⬡ Poziom bezpieczeństwa — Podstawowy → Najwyższy',
        splashBudget:       '⬡ Zakres budżetu — Poniżej £40 do £100+',
        splashAttack:       '⬡ Ochrona — Snap / Bump / Wiertło / Wytrychy / Wyciąganie',
        splashEnv:          '⬡ Środowisko — Zewnętrzne / Wewnętrzne',
        splashDoor:         '⬡ Materiał drzwi — UPVC / Kompozyt / Drewno / Aluminium',
        splashCylinder:     '⬡ Wkładka — Rozmiar (mm) + Typ',

        // Empty state
        noTargets:          'BRAK WYNIKÓW',
        noTargetsDesc:      'Podane parametry misji zwróciły 0 wyników.',
        relaxFilters:       '[ ROZLUŹNIJ FILTRY ]',

        // Telemetry
        telemetryTitle:     '▶ TELEMETRIA // DZIENNIK EKSTRAKCJI',
        telemetryTitleOpen: '▼ TELEMETRIA // DZIENNIK EKSTRAKCJI',
        telemetryHint:      '[KLIKNIJ ABY ROZWINĄĆ]',
        telemetryLoading:   'Ładowanie…',

        // Modal
        securityClearance:  'CERTYFIKATY BEZPIECZEŃSTWA',
        attackVectorRes:    'ODPORNOŚĆ NA ATAKI',
        executePurchase:    'KUP TERAZ ⬈',
        verified:           'CHRONIONE',
        vulnerable:         'PODATNE',

        // FAB
        sortLabel:          'SORTUJ:',
        sortThreat:         'Poziom zagrożenia (od najwyższego)',
        sortPriceAsc:       'Cena (od najniższej)',
        sortPriceDesc:      'Cena (od najwyższej)',
        btnScan:            '⬡ ZNAJDŹ ZAMKI',
        btnReset:           '✕ RESET',
        btnExport:          '⭳ RAPORT',

        // Footer
        footerSbd:          'ZABEZPIECZONO',
        footerAwait:        '— OCZEKIWANIE NA DANE —',

        // Toast messages
        toastDbSynced:      'Baza danych zsynchronizowana',
        toastResetFilters:  'Filtry zresetowane',
        toastParamsApplied: 'Parametry misji zastosowane',
        toastDossier:       'Raport skompilowany i pobrany',
        toastConnErr:       'Błąd: Przywracanie połączenia',
        toastScrapeErr:     'Błąd: Skrobak rozłączony',
        toastScrapeOk:      'Ekstrakcja na żywo zakończona',

        // Status messages
        upstreamSync:       '● SYNCHRONIZACJA',
        upstreamDetail:     'Pobieranie danych o zamkach…',
        extractComplete:    '● EKSTRAKCJA ZAKOŃCZONA',
        extractFailed:      '● EKSTRAKCJA NIE POWIODŁA SIĘ',
        zeroTargets:        '● BRAK CELÓW',
        zeroDetail:         'Żaden zamek nie pasuje do specyfikacji — dostosuj parametry powyżej.',
    }
};

let _lang = localStorage.getItem('lockReconLang') || 'en';

export function currentLang() { return _lang; }

export function setLang(lang) {
    if (!TRANSLATIONS[lang]) return;
    _lang = lang;
    localStorage.setItem('lockReconLang', lang);
    document.documentElement.lang = lang;
    applyTranslations();
    updateLangSwitcher();
}

export function t(key) {
    return TRANSLATIONS[_lang]?.[key] ?? TRANSLATIONS['en']?.[key] ?? key;
}

/** Update all [data-i18n] elements in the DOM */
export function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        const val = t(key);
        if (el.tagName === 'INPUT' && el.type === 'text') {
            el.placeholder = val;
        } else if (el.dataset.i18nHtml) {
            el.innerHTML = val;
        } else {
            el.textContent = val;
        }
    });
    // Update html lang attribute
    document.documentElement.lang = _lang;
}

export function updateLangSwitcher() {
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('lang-active', btn.dataset.lang === _lang);
    });
}

// Auto-apply on module load
document.addEventListener('DOMContentLoaded', () => {
    applyTranslations();
    updateLangSwitcher();
});
