import { DeveloperLanguageConfig, Language, LanguageSelectionMode } from '../types';

export const SUPPORTED_LANGUAGES: readonly Language[] = ['ht', 'es', 'en', 'fr'];

const GEO_COUNTRY_CACHE_KEY = 'omnichurch_detected_geo_country_v1';
const GEO_COUNTRY_CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const DEV_SETTINGS_STORAGE_KEY = 'omnichurch_developer_settings_v1';

export const DEFAULT_LANGUAGE_CONFIG: DeveloperLanguageConfig = {
  mode: 'auto',
  defaultLanguage: 'ht',
  autoDetectByCountry: true,
  autoDetectByBrowser: true,
  useNetworkGeoFallback: true,
  showInitialModalOnFirstVisit: true,
};

export function isSupportedLanguage(val: unknown): val is Language {
  return val === 'ht' || val === 'es' || val === 'en' || val === 'fr';
}

export function sanitizeLanguageConfig(
  raw?: Partial<DeveloperLanguageConfig> | null
): DeveloperLanguageConfig {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_LANGUAGE_CONFIG };
  }

  const mode: LanguageSelectionMode = raw.mode === 'manual' ? 'manual' : 'auto';
  const defaultLanguage: Language = isSupportedLanguage(raw.defaultLanguage)
    ? raw.defaultLanguage
    : DEFAULT_LANGUAGE_CONFIG.defaultLanguage;

  return {
    mode,
    defaultLanguage,
    autoDetectByCountry:
      typeof raw.autoDetectByCountry === 'boolean'
        ? raw.autoDetectByCountry
        : DEFAULT_LANGUAGE_CONFIG.autoDetectByCountry,
    autoDetectByBrowser:
      typeof raw.autoDetectByBrowser === 'boolean'
        ? raw.autoDetectByBrowser
        : DEFAULT_LANGUAGE_CONFIG.autoDetectByBrowser,
    useNetworkGeoFallback:
      typeof raw.useNetworkGeoFallback === 'boolean'
        ? raw.useNetworkGeoFallback
        : DEFAULT_LANGUAGE_CONFIG.useNetworkGeoFallback,
    showInitialModalOnFirstVisit:
      typeof raw.showInitialModalOnFirstVisit === 'boolean'
        ? raw.showInitialModalOnFirstVisit
        : DEFAULT_LANGUAGE_CONFIG.showInitialModalOnFirstVisit,
    lastLanguageConfigUpdatedAt:
      typeof raw.lastLanguageConfigUpdatedAt === 'string'
        ? raw.lastLanguageConfigUpdatedAt
        : undefined,
  };
}

/**
 * Maps ISO 3166-1 alpha-2 country codes to primary spoken platform language.
 * Countries whose national language is outside HT/ES/FR/EN return null so
 * browser locale or platform defaultLanguage can handle them gracefully.
 */
const COUNTRY_TO_LANGUAGE: Record<string, Language> = {
  // Haitian Creole
  HT: 'ht',

  // Spanish-speaking countries & territories
  DO: 'es',
  ES: 'es',
  MX: 'es',
  CO: 'es',
  AR: 'es',
  CL: 'es',
  PE: 'es',
  VE: 'es',
  EC: 'es',
  GT: 'es',
  HN: 'es',
  SV: 'es',
  NI: 'es',
  CR: 'es',
  PA: 'es',
  CU: 'es',
  PR: 'es',
  BO: 'es',
  PY: 'es',
  UY: 'es',
  GQ: 'es',

  // French-speaking countries & territories
  FR: 'fr',
  BE: 'fr',
  MC: 'fr',
  LU: 'fr',
  MQ: 'fr',
  GP: 'fr',
  GF: 'fr',
  RE: 'fr',
  YT: 'fr',
  NC: 'fr',
  PF: 'fr',
  PM: 'fr',
  MF: 'fr',
  BL: 'fr',
  WF: 'fr',
  SN: 'fr',
  CI: 'fr',
  CM: 'fr',
  CD: 'fr',
  CG: 'fr',
  ML: 'fr',
  BF: 'fr',
  NE: 'fr',
  TG: 'fr',
  BJ: 'fr',
  GA: 'fr',
  CF: 'fr',
  TD: 'fr',
  GN: 'fr',
  MG: 'fr',
  BI: 'fr',
  RW: 'fr',
  DJ: 'fr',
  KM: 'fr',
  TN: 'fr',
  DZ: 'fr',
  MA: 'fr',

  // English-speaking countries & territories
  US: 'en',
  GB: 'en',
  AU: 'en',
  NZ: 'en',
  IE: 'en',
  JM: 'en',
  BS: 'en',
  BB: 'en',
  TT: 'en',
  BZ: 'en',
  GY: 'en',
  AG: 'en',
  DM: 'en',
  GD: 'en',
  KN: 'en',
  LC: 'en',
  VC: 'en',
  ZA: 'en',
  NG: 'en',
  GH: 'en',
  KE: 'en',
  UG: 'en',
  TZ: 'en',
  ZM: 'en',
  ZW: 'en',
  BW: 'en',
  NA: 'en',
  LR: 'en',
  SL: 'en',
  GM: 'en',
  SG: 'en',
  PH: 'en',
};

/**
 * Comprehensive IANA Timezone -> ISO Country Code map for instant offline
 * position/country detection without requiring any browser permission prompt.
 */
const TIMEZONE_TO_COUNTRY: Record<string, string> = {
  // Haiti
  'America/Port-au-Prince': 'HT',

  // Spanish-speaking regions
  'America/Santo_Domingo': 'DO',
  'Europe/Madrid': 'ES',
  'Atlantic/Canary': 'ES',
  'Africa/Ceuta': 'ES',
  'America/Mexico_City': 'MX',
  'America/Cancun': 'MX',
  'America/Merida': 'MX',
  'America/Monterrey': 'MX',
  'America/Matamoros': 'MX',
  'America/Mazatlan': 'MX',
  'America/Chihuahua': 'MX',
  'America/Ojinaga': 'MX',
  'America/Hermosillo': 'MX',
  'America/Tijuana': 'MX',
  'America/Bahia_Banderas': 'MX',
  'America/Ciudad_Juarez': 'MX',
  'America/Ensenada': 'MX',
  'America/Santa_Isabel': 'MX',
  'America/Bogota': 'CO',
  'America/Buenos_Aires': 'AR',
  'America/Argentina/Buenos_Aires': 'AR',
  'America/Argentina/Cordoba': 'AR',
  'America/Argentina/Salta': 'AR',
  'America/Argentina/Jujuy': 'AR',
  'America/Argentina/Tucuman': 'AR',
  'America/Argentina/Catamarca': 'AR',
  'America/Argentina/La_Rioja': 'AR',
  'America/Argentina/San_Juan': 'AR',
  'America/Argentina/Mendoza': 'AR',
  'America/Argentina/San_Luis': 'AR',
  'America/Argentina/Rio_Gallegos': 'AR',
  'America/Argentina/Ushuaia': 'AR',
  'America/Cordoba': 'AR',
  'America/Mendoza': 'AR',
  'America/Santiago': 'CL',
  'America/Punta_Arenas': 'CL',
  'Pacific/Easter': 'CL',
  'America/Lima': 'PE',
  'America/Caracas': 'VE',
  'America/Guayaquil': 'EC',
  'Pacific/Galapagos': 'EC',
  'America/Guatemala': 'GT',
  'America/Tegucigalpa': 'HN',
  'America/El_Salvador': 'SV',
  'America/Managua': 'NI',
  'America/Costa_Rica': 'CR',
  'America/Panama': 'PA',
  'America/Havana': 'CU',
  'America/Puerto_Rico': 'PR',
  'America/La_Paz': 'BO',
  'America/Asuncion': 'PY',
  'America/Montevideo': 'UY',
  'Africa/Malabo': 'GQ',

  // French-speaking regions
  'Europe/Paris': 'FR',
  'Europe/Brussels': 'BE',
  'Europe/Monaco': 'MC',
  'Europe/Luxembourg': 'LU',
  'America/Martinique': 'MQ',
  'America/Guadeloupe': 'GP',
  'America/Cayenne': 'GF',
  'America/Marigot': 'MF',
  'America/St_Barthelemy': 'BL',
  'America/Miquelon': 'PM',
  'Indian/Reunion': 'RE',
  'Indian/Mayotte': 'YT',
  'Pacific/Noumea': 'NC',
  'Pacific/Tahiti': 'PF',
  'Pacific/Marquesas': 'PF',
  'Pacific/Gambier': 'PF',
  'Africa/Dakar': 'SN',
  'Africa/Abidjan': 'CI',
  'Africa/Douala': 'CM',
  'Africa/Kinshasa': 'CD',
  'Africa/Lubumbashi': 'CD',
  'Africa/Brazzaville': 'CG',
  'Africa/Bamako': 'ML',
  'Africa/Ouagadougou': 'BF',
  'Africa/Niamey': 'NE',
  'Africa/Lome': 'TG',
  'Africa/Porto-Novo': 'BJ',
  'Africa/Libreville': 'GA',
  'Africa/Bangui': 'CF',
  'Africa/Ndjamena': 'TD',
  'Africa/Conakry': 'GN',
  'Indian/Antananarivo': 'MG',
  'Africa/Bujumbura': 'BI',
  'Africa/Kigali': 'RW',
  'Africa/Djibouti': 'DJ',
  'Indian/Comoro': 'KM',
  'Africa/Tunis': 'TN',
  'Africa/Algiers': 'DZ',
  'Africa/Casablanca': 'MA',
  'America/Montreal': 'CA_FR',

  // English-speaking regions
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Phoenix': 'US',
  'America/Anchorage': 'US',
  'America/Adak': 'US',
  'America/Detroit': 'US',
  'America/Indiana/Indianapolis': 'US',
  'America/Kentucky/Louisville': 'US',
  'America/Boise': 'US',
  'Pacific/Honolulu': 'US',
  'US/Eastern': 'US',
  'US/Central': 'US',
  'US/Mountain': 'US',
  'US/Pacific': 'US',
  'Europe/London': 'GB',
  'Europe/Dublin': 'IE',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'America/Winnipeg': 'CA',
  'America/Edmonton': 'CA',
  'America/Halifax': 'CA',
  'America/St_Johns': 'CA',
  'America/Regina': 'CA',
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
  'Australia/Brisbane': 'AU',
  'Australia/Perth': 'AU',
  'Australia/Adelaide': 'AU',
  'Australia/Hobart': 'AU',
  'Australia/Darwin': 'AU',
  'Pacific/Auckland': 'NZ',
  'America/Jamaica': 'JM',
  'America/Nassau': 'BS',
  'America/Barbados': 'BB',
  'America/Port_of_Spain': 'TT',
  'America/Belize': 'BZ',
  'America/Guyana': 'GY',
  'Africa/Johannesburg': 'ZA',
  'Africa/Lagos': 'NG',
  'Africa/Accra': 'GH',
  'Africa/Nairobi': 'KE',
  'Asia/Singapore': 'SG',
};

export function getCountryFromTimeZone(timeZone?: string): string | null {
  const tz = (timeZone || '').trim();
  if (!tz) return null;
  if (TIMEZONE_TO_COUNTRY[tz]) return TIMEZONE_TO_COUNTRY[tz];
  if (tz.startsWith('America/Argentina/')) return 'AR';
  if (tz.startsWith('Australia/')) return 'AU';
  if (tz.startsWith('US/')) return 'US';
  return null;
}

export function mapBrowserLocalesToLanguage(locales?: readonly string[] | null): Language | null {
  if (!locales || locales.length === 0) return null;
  for (const raw of locales) {
    const clean = String(raw || '').trim().toLowerCase();
    if (!clean) continue;
    const primary = clean.split(/[-_]/)[0];
    if (primary === 'ht') return 'ht';
    if (primary === 'es') return 'es';
    if (primary === 'fr') return 'fr';
    if (primary === 'en') return 'en';
  }
  return null;
}

export function mapCountryCodeToLanguage(
  countryCode?: string | null,
  browserLocales?: readonly string[] | null
): Language | null {
  const code = (countryCode || '').trim().toUpperCase();
  if (!code) return null;

  if (code === 'CA_FR') return 'fr';
  if (code === 'CA') {
    const browserLang = mapBrowserLocalesToLanguage(browserLocales);
    return browserLang === 'fr' ? 'fr' : 'en';
  }
  if (code === 'CH') {
    const browserLang = mapBrowserLocalesToLanguage(browserLocales);
    return browserLang === 'fr' ? 'fr' : null;
  }

  return COUNTRY_TO_LANGUAGE[code] || null;
}

export function getCachedGeoCountry(): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(GEO_COUNTRY_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { countryCode?: string; cachedAt?: number };
    if (
      parsed &&
      typeof parsed.countryCode === 'string' &&
      /^[A-Z]{2}$/.test(parsed.countryCode) &&
      typeof parsed.cachedAt === 'number' &&
      Date.now() - parsed.cachedAt < GEO_COUNTRY_CACHE_TTL_MS
    ) {
      return parsed.countryCode;
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

export function setCachedGeoCountry(countryCode: string): void {
  if (typeof localStorage === 'undefined') return;
  const clean = (countryCode || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(clean)) return;
  try {
    localStorage.setItem(
      GEO_COUNTRY_CACHE_KEY,
      JSON.stringify({ countryCode: clean, cachedAt: Date.now() })
    );
  } catch {
    // ignore
  }
}

export function readStoredDeveloperLanguageConfig(): DeveloperLanguageConfig {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_LANGUAGE_CONFIG };
  try {
    const raw = localStorage.getItem(DEV_SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_LANGUAGE_CONFIG };
    const parsed = JSON.parse(raw);
    return sanitizeLanguageConfig(parsed?.languageConfig);
  } catch {
    return { ...DEFAULT_LANGUAGE_CONFIG };
  }
}

export function getUrlLanguageOverride(): Language | null {
  if (typeof window === 'undefined') return null;
  try {
    const search = new URLSearchParams(window.location.search);
    const hash = window.location.hash || '';
    const hashSearch = hash.includes('?')
      ? new URLSearchParams(hash.substring(hash.indexOf('?')))
      : new URLSearchParams();
    const rawLang = (search.get('lang') || hashSearch.get('lang') || '').trim().toLowerCase();
    return isSupportedLanguage(rawLang) ? rawLang : null;
  } catch {
    return null;
  }
}

export type LanguageResolutionSource =
  | 'url'
  | 'user_saved'
  | 'developer_default'
  | 'country_position'
  | 'browser'
  | 'developer_fallback';

export interface LanguageResolutionResult {
  language: Language;
  source: LanguageResolutionSource;
  detectedCountryCode?: string | null;
  detectedTimeZone?: string | null;
  browserLanguages?: string[];
}

export interface ResolveLanguageOptions {
  config?: Partial<DeveloperLanguageConfig> | null;
  urlLang?: Language | null;
  userSavedLang?: Language | null;
  hasUserExplicitChoice?: boolean;
  timeZone?: string | null;
  geoCountryCode?: string | null;
  browserLanguages?: readonly string[] | null;
}

export function getDeviceDetectionContext(): {
  timeZone: string | null;
  geoCountryCode: string | null;
  browserLanguages: string[];
} {
  let timeZone: string | null = null;
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    timeZone = null;
  }

  let browserLanguages: string[] = [];
  if (typeof navigator !== 'undefined') {
    if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
      browserLanguages = navigator.languages.filter(Boolean);
    } else if (navigator.language) {
      browserLanguages = [navigator.language];
    }
  }

  return {
    timeZone,
    geoCountryCode: getCachedGeoCountry(),
    browserLanguages,
  };
}

/**
 * Resolves the active language synchronously and deterministically.
 */
export function resolveInitialLanguageSync(
  options?: ResolveLanguageOptions
): LanguageResolutionResult {
  const cfg = sanitizeLanguageConfig(
    options?.config !== undefined ? options.config : readStoredDeveloperLanguageConfig()
  );

  const deviceCtx = getDeviceDetectionContext();
  const timeZone =
    options?.timeZone !== undefined ? options.timeZone : deviceCtx.timeZone;
  const geoCountryCode =
    options?.geoCountryCode !== undefined ? options.geoCountryCode : deviceCtx.geoCountryCode;
  const browserLanguages =
    options?.browserLanguages !== undefined
      ? Array.from(options.browserLanguages || [])
      : deviceCtx.browserLanguages;

  // 1. Explicit URL parameter (?lang=es)
  const urlLang =
    options?.urlLang !== undefined ? options.urlLang : getUrlLanguageOverride();
  if (isSupportedLanguage(urlLang)) {
    return {
      language: urlLang,
      source: 'url',
      detectedCountryCode: geoCountryCode || getCountryFromTimeZone(timeZone || undefined),
      detectedTimeZone: timeZone,
      browserLanguages,
    };
  }

  // 2. Respect user's explicit saved choice unless caller bypassed it
  if (options?.hasUserExplicitChoice && isSupportedLanguage(options?.userSavedLang)) {
    return {
      language: options.userSavedLang,
      source: 'user_saved',
      detectedCountryCode: geoCountryCode || getCountryFromTimeZone(timeZone || undefined),
      detectedTimeZone: timeZone,
      browserLanguages,
    };
  }

  const tzCountry = getCountryFromTimeZone(timeZone || undefined);
  const resolvedCountry = (geoCountryCode || tzCountry || '').trim().toUpperCase() || null;
  const normalizedCountryForDisplay =
    resolvedCountry === 'CA_FR' ? 'CA' : resolvedCountry;

  // 3. Manual Mode: force the developer-configured defaultLanguage
  if (cfg.mode === 'manual') {
    return {
      language: cfg.defaultLanguage,
      source: 'developer_default',
      detectedCountryCode: normalizedCountryForDisplay,
      detectedTimeZone: timeZone,
      browserLanguages,
    };
  }

  // 4. Smart Auto Mode: position/country + browser detection
  const primaryBrowserLocale = (browserLanguages[0] || '').trim().toLowerCase();
  const primaryBrowserLang = primaryBrowserLocale.split(/[-_]/)[0];

  // If device explicitly uses Haitian Creole, keep it
  if (cfg.autoDetectByBrowser && primaryBrowserLang === 'ht') {
    return {
      language: 'ht',
      source: 'browser',
      detectedCountryCode: normalizedCountryForDisplay,
      detectedTimeZone: timeZone,
      browserLanguages,
    };
  }

  if (cfg.autoDetectByCountry && resolvedCountry) {
    const countryLang = mapCountryCodeToLanguage(resolvedCountry, browserLanguages);
    if (countryLang) {
      // In US/Canada multilingual diaspora, honor explicit Spanish/French device UI if set
      if (
        (resolvedCountry === 'US' || resolvedCountry === 'CA') &&
        cfg.autoDetectByBrowser &&
        (primaryBrowserLang === 'es' || primaryBrowserLang === 'fr')
      ) {
        return {
          language: primaryBrowserLang,
          source: 'browser',
          detectedCountryCode: normalizedCountryForDisplay,
          detectedTimeZone: timeZone,
          browserLanguages,
        };
      }
      return {
        language: countryLang,
        source: 'country_position',
        detectedCountryCode: normalizedCountryForDisplay,
        detectedTimeZone: timeZone,
        browserLanguages,
      };
    }
  }

  if (cfg.autoDetectByBrowser) {
    const browserMatched = mapBrowserLocalesToLanguage(browserLanguages);
    if (browserMatched) {
      return {
        language: browserMatched,
        source: 'browser',
        detectedCountryCode: normalizedCountryForDisplay,
        detectedTimeZone: timeZone,
        browserLanguages,
      };
    }
  }

  // 5. Fallback to developer-configured defaultLanguage
  return {
    language: cfg.defaultLanguage,
    source: 'developer_fallback',
    detectedCountryCode: normalizedCountryForDisplay,
    detectedTimeZone: timeZone,
    browserLanguages,
  };
}

export async function detectGeoCountryAsync(
  customFetcher?: (url: string, init?: RequestInit) => Promise<Response>
): Promise<string | null> {
  const cached = getCachedGeoCountry();
  if (cached) return cached;

  const fetcher = customFetcher || (typeof fetch === 'function' ? fetch : null);
  if (!fetcher) return null;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 2200) : null;

  try {
    const res = await fetcher('https://api.country.is/', {
      method: 'GET',
      signal: controller?.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res || !res.ok) return null;
    const data = (await res.json()) as { country?: string };
    const code = (data?.country || '').trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(code)) {
      setCachedGeoCountry(code);
      return code;
    }
  } catch {
    // Silent graceful fallback to timezone + browser detection
  } finally {
    if (timeoutId !== null) clearTimeout(timeoutId);
  }
  return null;
}

export function getLanguageDisplayName(lang: Language, uiLang: Language = 'ht'): string {
  const names: Record<Language, Record<Language, string>> = {
    ht: { ht: 'Kreyòl Ayisyen', fr: 'Créole Haïtien', en: 'Haitian Creole', es: 'Criollo Haitiano' },
    es: { ht: 'Panyòl (Español)', fr: 'Espagnol', en: 'Spanish', es: 'Español' },
    fr: { ht: 'Fransè (Français)', fr: 'Français', en: 'French', es: 'Francés' },
    en: { ht: 'Anglè (English)', fr: 'Anglais', en: 'English', es: 'Inglés' },
  };
  return names[lang]?.[uiLang] || lang.toUpperCase();
}
