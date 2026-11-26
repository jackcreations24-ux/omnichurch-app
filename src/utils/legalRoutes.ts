import { normalizeSafeHttpUrl } from './safeExternalLink';
import { DeveloperLegalConfig, Language, LegalDocCustomText } from '../types';

export type LegalPageType = 'privacy' | 'terms' | null;

export const DEFAULT_LEGAL_CONFIG: DeveloperLegalConfig = {
  officialPrivacyUrl: '',
  officialTermsUrl: '',
  useExternalLinksOnClick: false,
  customPrivacy: {},
  customTerms: {},
};

const PRIVACY_ROUTE_SLUGS = new Set([
  'privacy',
  'privacy-policy',
  'policy-privacy',
  'privacy_policy',
  'policy_privacy',
  'politique-de-confidentialite',
  'politica-de-privacidad',
]);

const TERMS_ROUTE_SLUGS = new Set([
  'terms',
  'terms-of-service',
  'terms_of_service',
  'tos',
  'terms-and-conditions',
  'conditions-utilisation',
  'terminos-de-servicio',
]);

/**
 * Parses URL pathname, query parameters, or hash fragments to detect direct legal document links.
 * Supports:
 *  - /privacy-policy | /policy-privacy | /privacy
 *  - /terms-of-service | /terms | /tos
 *  - ?page=privacy | ?legal=privacy | ?privacy | #privacy | #privacy-policy
 *  - ?page=terms   | ?legal=terms   | ?terms   | #terms   | #terms-of-service
 */
export const parseLegalRouteFromUrl = (
  search: string = typeof window !== 'undefined' ? window.location.search : '',
  hash: string = typeof window !== 'undefined' ? window.location.hash : '',
  pathname: string = typeof window !== 'undefined' ? window.location.pathname : ''
): LegalPageType => {
  try {
    // 1. Check clean URL pathname first (e.g. /privacy-policy, /policy-privacy, /terms-of-service)
    const cleanPath = String(pathname || '')
      .trim()
      .toLowerCase()
      .replace(/\/+$/, '')
      .replace(/^\/+/, '');
    if (cleanPath) {
      const lastSegment = cleanPath.split('/').pop() || cleanPath;
      if (PRIVACY_ROUTE_SLUGS.has(cleanPath) || PRIVACY_ROUTE_SLUGS.has(lastSegment)) {
        return 'privacy';
      }
      if (TERMS_ROUTE_SLUGS.has(cleanPath) || TERMS_ROUTE_SLUGS.has(lastSegment)) {
        return 'terms';
      }
    }

    // 2. Check query parameters (?page=privacy-policy, ?legal=privacy, ?privacy, etc.)
    const params = new URLSearchParams(search || '');
    const pageParam = (params.get('page') || params.get('legal') || '').trim().toLowerCase();

    if (
      PRIVACY_ROUTE_SLUGS.has(pageParam) ||
      params.has('privacy') ||
      params.has('privacy-policy') ||
      params.has('policy-privacy')
    ) {
      return 'privacy';
    }
    if (
      TERMS_ROUTE_SLUGS.has(pageParam) ||
      params.has('terms') ||
      params.has('terms-of-service') ||
      params.has('tos')
    ) {
      return 'terms';
    }

    // 3. Check hash fragments (#privacy-policy, #/privacy-policy, #terms-of-service, etc.)
    const normalizedHash = (hash || '').trim().toLowerCase().replace(/^#\/?/, '').replace(/\/+$/, '');
    const hashBase = normalizedHash.split('?')[0];
    if (PRIVACY_ROUTE_SLUGS.has(hashBase)) {
      return 'privacy';
    }
    if (TERMS_ROUTE_SLUGS.has(hashBase)) {
      return 'terms';
    }
  } catch {
    // Ignore malformed URLs safely
  }
  return null;
};

/**
 * Returns the canonical clean pathname for a legal document page:
 *  - 'privacy' -> '/privacy-policy'
 *  - 'terms'   -> '/terms-of-service'
 */
export const getLegalDocumentPath = (page: 'privacy' | 'terms'): string => {
  return page === 'privacy' ? '/privacy-policy' : '/terms-of-service';
};

/**
 * Builds a legal document URL strictly from an explicit official domain origin
 * using clean enterprise pathnames (/privacy-policy and /terms-of-service).
 * Returns "" when no explicit origin is supplied so temporary/dev preview URLs
 * never leak into configuration fields.
 */
export const getLegalDocumentUrl = (
  page: 'privacy' | 'terms',
  origin?: string
): string => {
  const trimmedOrigin = String(origin || '').trim();
  if (!trimmedOrigin) return '';
  const safeOrigin = normalizeSafeHttpUrl(trimmedOrigin);
  if (!safeOrigin) return '';
  const cleanOrigin = safeOrigin.replace(/\/+$/, '');
  return `${cleanOrigin}${getLegalDocumentPath(page)}`;
};

/**
 * Normalizes an administrator-entered official URL for Privacy Policy or Terms of Service.
 * Keeps empty strings as "" and rejects dangerous non-HTTP schemes.
 */
export const normalizeOfficialLegalUrl = (rawUrl?: string | null): string => {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return '';
  return normalizeSafeHttpUrl(trimmed) || '';
};

const SUPPORTED_LEGAL_LANGUAGES: Language[] = ['ht', 'fr', 'en', 'es'];

const sanitizeCustomTextMap = (
  rawMap?: Partial<Record<Language, LegalDocCustomText>> | null
): Partial<Record<Language, LegalDocCustomText>> => {
  const result: Partial<Record<Language, LegalDocCustomText>> = {};
  if (!rawMap || typeof rawMap !== 'object') return result;

  for (const lang of SUPPORTED_LEGAL_LANGUAGES) {
    const entry = rawMap[lang];
    if (!entry || typeof entry !== 'object') continue;
    const title = typeof entry.title === 'string' ? entry.title.trim() : '';
    const lastUpdatedDate =
      typeof entry.lastUpdatedDate === 'string' ? entry.lastUpdatedDate.trim() : '';
    const content = typeof entry.content === 'string' ? entry.content.trim() : '';
    if (title || lastUpdatedDate || content) {
      result[lang] = {
        ...(title ? { title } : {}),
        ...(lastUpdatedDate ? { lastUpdatedDate } : {}),
        ...(content ? { content } : {}),
      };
    }
  }
  return result;
};

export const sanitizeLegalConfig = (
  raw?: Partial<DeveloperLegalConfig> | null
): DeveloperLegalConfig => {
  if (!raw || typeof raw !== 'object') {
    return {
      officialPrivacyUrl: '',
      officialTermsUrl: '',
      useExternalLinksOnClick: false,
      customPrivacy: {},
      customTerms: {},
    };
  }

  return {
    officialPrivacyUrl: normalizeOfficialLegalUrl(raw.officialPrivacyUrl),
    officialTermsUrl: normalizeOfficialLegalUrl(raw.officialTermsUrl),
    useExternalLinksOnClick: Boolean(raw.useExternalLinksOnClick),
    customPrivacy: sanitizeCustomTextMap(raw.customPrivacy),
    customTerms: sanitizeCustomTextMap(raw.customTerms),
    lastLegalUpdatedAt:
      typeof raw.lastLegalUpdatedAt === 'string' ? raw.lastLegalUpdatedAt : undefined,
  };
};

export type ParsedLegalBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] };

/**
 * Parses developer-edited plain text into clean, structured plain-HTML legal blocks
 * (headings, paragraphs, bullet lists) without any cards or fancy styling.
 */
export const parsePlainLegalBlocks = (rawContent: string): ParsedLegalBlock[] => {
  const normalized = String(rawContent || '').replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const rawChunks = normalized
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const blocks: ParsedLegalBlock[] = [];

  for (const chunk of rawChunks) {
    const lines = chunk
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) continue;

    // Group consecutive lines inside a chunk into headings / bullets / paragraphs
    let currentList: string[] = [];
    const flushList = () => {
      if (currentList.length > 0) {
        blocks.push({ type: 'list', items: [...currentList] });
        currentList = [];
      }
    };

    let currentParagraphLines: string[] = [];
    const flushParagraph = () => {
      if (currentParagraphLines.length > 0) {
        blocks.push({ type: 'paragraph', text: currentParagraphLines.join(' ') });
        currentParagraphLines = [];
      }
    };

    for (const line of lines) {
      if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
        flushParagraph();
        currentList.push(line.slice(2).trim());
        continue;
      }

      if (line.startsWith('## ')) {
        flushList();
        flushParagraph();
        blocks.push({ type: 'heading', text: line.slice(3).trim() });
        continue;
      }

      if (/^\d+\.\s+.{2,100}$/.test(line) && !line.endsWith('.')) {
        flushList();
        flushParagraph();
        blocks.push({ type: 'heading', text: line });
        continue;
      }

      flushList();
      currentParagraphLines.push(line);
    }

    flushList();
    flushParagraph();
  }

  return blocks;
};
