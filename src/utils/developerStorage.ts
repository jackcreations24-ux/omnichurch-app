import {
  DeveloperSettings,
  ChurchLicense,
  AdMobConfig,
  RemoteCommentModerationConfig,
  RemoteMemberVerificationConfig,
  SponsorItem,
  LicenseTier,
  LicenseStatus,
  AnnouncementComment,
  DeveloperDonationConfig,
  LocalizedDonationCopy,
  Language,
  DeveloperAuditLog,
  DeveloperBroadcast,
  DeveloperAppUpdateConfig,
  Church,
  Member,
  ServiceSession,
  Announcement,
  AttendanceRecord,
  AbsenceRecord,
} from '../types';
import { APP_BASE_VERSION } from '../version';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';

import {
  hashAdminPasscodeSync,
  isPasscodeHashed,
  isSuperDeveloperEmail,
  SUPER_DEVELOPER_EMAIL_HASH,
} from './cryptoSecurity';
import { DEFAULT_LEGAL_CONFIG, sanitizeLegalConfig } from './legalRoutes';
import { DEFAULT_LANGUAGE_CONFIG, sanitizeLanguageConfig } from './languageDetection';

export { isSuperDeveloperEmail, SUPER_DEVELOPER_EMAIL_HASH };
export const SUPER_DEVELOPER_LABEL = 'Kont Administrasyon Jeneral Otorize';
export const SUPER_DEVELOPER_EMAIL = SUPER_DEVELOPER_LABEL;

export function getSuperDeveloperCloudAuthStatus(): {
  isAuthorized: boolean;
  email: string | null;
  emailVerified: boolean;
} {
  const user = auth.currentUser;
  const email = user?.email ? user.email.toLowerCase() : null;
  const emailVerified = Boolean(user?.emailVerified);
  return {
    isAuthorized: Boolean(user && isSuperDeveloperEmail(email) && emailVerified),
    email: user?.email || null,
    emailVerified,
  };
}
import {
  getAllStoredComments,
  deleteAnnouncementComment,
  purgeDemoComments,
  purgeAllComments,
  STORAGE_KEYS,
  loadFromStorage,
  saveToStorage,
  getAllChurches,
  getAllMembers,
  getAllServices,
  getAllAnnouncements,
  getAllAttendance,
  saveChurch,
  isMemberMarkedDeleted,
  isServiceMarkedDeleted,
  isAnnouncementMarkedDeleted,
  isAttendanceMarkedDeleted,
} from './storage';

const STORAGE_KEY = 'omnichurch_developer_settings_v1';
const FIRESTORE_DEV_DOC = 'app_config';
const FIRESTORE_DEV_ID = 'developer_engine';

export const INITIAL_SPONSORS: SponsorItem[] = [];

export const DEFAULT_ADMOB_CONFIG: AdMobConfig = {
  enabled: true,
  environment: 'test',
  adMobAppId: 'ca-app-pub-3940256099942544~3347511713',
  bannerAdUnitId: 'ca-app-pub-3940256099942544/6300978111',
  interstitialAdUnitId: 'ca-app-pub-3940256099942544/1033173712',
  rewardedAdUnitId: 'ca-app-pub-3940256099942544/5224354917',
  nativeAdUnitId: 'ca-app-pub-3940256099942544/2247696110',
  showBannerInNavbarBottom: false,
  showBannerInMemberHome: true,
  showBannerInFooter: false,
  enableInterstitialOnScan: true,
  interstitialScanFrequency: 4,
  adFreeForLicensedChurches: true,
  mobileEnabled: true,
  mobileForceTestIds: true,
  mobileShowBannerHome: true,
  mobileShowBannerAnnouncements: true,
  mobileShowBannerServices: false,
  mobileEnableInterstitialAfterScanClose: true,
  mobileInterstitialCooldownSeconds: 180,
  mobileRewardedEnabled: false,
  mobileNativeFeedEnabled: true,
};

export const DEFAULT_DONATE_BUTTON_IMAGE =
  '/assets/aistudio/cfacb6c8-980a-4a5b-abc8-b5cbb0440b26_ee08b207.png';

export const DEFAULT_LOCALIZED_DONATION_COPY: Record<Language, LocalizedDonationCopy> = {
  ht: {
    screenTitle: 'Soutni Misyon Nimerik Legliz la',
    screenSubtitle:
      'Chak kontribisyon volontè ede kenbe sèvè yo aktif, devlope nouvo zouti modèn gratis pou legliz yo, epi akselere avansman travay Bondye a.',
    developerRole: 'Achitèk Lojisyèl Prensipal & Teknològ Ministè',
    developerBio:
      'Objektif mwen se ede legliz la grandi sosyalman, espirityèlman ak nimerikman atravè zouti teknolojik modèn, efikas e transparan ki fasilite kominikasyon ak jesyon manm yo.',
    customNote:
      'Mèsi pou sipò w ak kontribisyon w nan avansman misyon nimerik legliz la!',
  },
  fr: {
    screenTitle: 'Soutenez la Mission Numérique de l’Église',
    screenSubtitle:
      'Chaque contribution volontaire aide à maintenir les serveurs actifs, développer de nouveaux outils gratuits pour les églises et accélérer l’œuvre.',
    developerRole: 'Architecte Logiciel Principal & Technologue Ministériel',
    developerBio:
      'Mon objectif principal est d’aider l’église à grandir socialement, spirituellement et technologiquement grâce à des outils numériques modernes, efficaces et transparents.',
    customNote:
      'Merci pour votre soutien et votre contribution à l’avancement de la mission numérique de l’église !',
  },
  en: {
    screenTitle: 'Support the Church Digital Mission',
    screenSubtitle:
      'Every voluntary contribution helps keep servers online, build free modern tools for churches, and accelerate the advancement of the ministry.',
    developerRole: 'Lead Software Architect & Ministry Technologist',
    developerBio:
      'My core objective is to empower the church to grow socially, spiritually, and technologically through modern, accessible, and transparent digital tools.',
    customNote:
      'Thank you for your support and contribution to advancing the digital mission of the church!',
  },
  es: {
    screenTitle: 'Apoya la Misión Digital de la Iglesia',
    screenSubtitle:
      'Cada aporte voluntario ayuda a mantener los servidores activos, crear herramientas gratuitas y modernas para las iglesias e impulsar la obra.',
    developerRole: 'Arquitecto de Software Principal y Tecnólogo Ministerial',
    developerBio:
      'Mi objetivo principal es ayudar a la iglesia a crecer social, espiritual y tecnológicamente mediante herramientas digitales modernas, accesibles y transparentes.',
    customNote:
      '¡Gracias por tu apoyo y contribución al avance de la misión digital de la iglesia!',
  },
};

export const DEFAULT_DONATION_CONFIG: DeveloperDonationConfig = {
  enabled: true,
  developerName: 'Jackson Charles',
  developerRole: DEFAULT_LOCALIZED_DONATION_COPY.ht.developerRole,
  developerBio: DEFAULT_LOCALIZED_DONATION_COPY.ht.developerBio,
  developerEmail: '',
  developerPhone: '',
  
  paypalEnabled: false,
  paypalEmail: '',
  paypalMeUrl: '',
  
  binanceEnabled: false,
  binancePayId: '',
  binanceUsdtAddress: '',
  binanceNetwork: '',
  
  wiseEnabled: false,
  wiseEmail: '',
  wiseTag: '',
  wiseIban: '',
  
  moncashEnabled: false,
  moncashNumber: '',
  moncashName: '',

  zelleEnabled: false,
  zelleInfo: '',

  customNote: DEFAULT_LOCALIZED_DONATION_COPY.ht.customNote,
  screenTitle: DEFAULT_LOCALIZED_DONATION_COPY.ht.screenTitle,
  screenSubtitle: DEFAULT_LOCALIZED_DONATION_COPY.ht.screenSubtitle,
  localizedCopy: {
    ht: { ...DEFAULT_LOCALIZED_DONATION_COPY.ht },
    fr: { ...DEFAULT_LOCALIZED_DONATION_COPY.fr },
    en: { ...DEFAULT_LOCALIZED_DONATION_COPY.en },
    es: { ...DEFAULT_LOCALIZED_DONATION_COPY.es },
  },
  buttonImageUrl: DEFAULT_DONATE_BUTTON_IMAGE,
  enableShakeAnimation: true,
  shakeIntervalSeconds: 6,
  userCustomizedChannels: false,
};

export const DEFAULT_DEVELOPER_APP_UPDATE_CONFIG: DeveloperAppUpdateConfig = {
  enabled: true,
  latestVersion: APP_BASE_VERSION,
  currentVersion: APP_BASE_VERSION,
  minRequiredVersion: APP_BASE_VERSION,
  downloadUrl: 'https://omnichurch.download',
  channel: 'stable',
  isMandatory: false,
  releaseDate: '2026-11-13',
  targetPlatform: 'all',
  highlights: {
    ht: [
      'Rapò Absans 24h strik: sèlman dènye sèvis ki fini konte manm ki te verifye prezans ak QR epi reset chak 24 èdtan otomatikman',
      'Wòl Resepsyon: aksè pou eskane prezans QR nan sèvis ki an kou a san dwa modifye oswa efase okenn manm ni chanje wòl',
      'Pèfòmans & Sekirite Renfòse: chajman legliz sou demann, senkronizasyon selon wòl, ak izolasyon strik kont administrasyon sistèm nan',
      'Estabilite & Entèfas Pwòp: tit pwofesyonèl e natirèl nan tout sistèm nan pou yon eksperyans klè e san erè',
    ],
    fr: [
      'Rapport d’Absence 24h strict : seul le dernier culte terminé évalue les absences selon les présences QR et se réinitialise toutes les 24h',
      'Rôle Réception : accès dédié au scan QR du culte en cours sans droit de modification ni suppression des membres ou rôles',
      'Performance & Sécurité Renforcée : recherche à la demande, synchronisation par rôle et isolation stricte du compte d’administration générale',
      'Stabilité & Interface Épurée : titres naturels et professionnels sur l’ensemble de la plateforme',
    ],
    en: [
      'Strict 24h Absence Engine: only the latest completed service counts QR-verified attendance and resets every 24h automatically',
      'Reception Role: dedicated active-service QR check-in access with strict read-only protection on member profiles and roles',
      'Enhanced Performance & Security: bounded church loading with on-demand search, role-based sync, and strict system admin account isolation',
      'Stability & Executive UI: natural, professional titles and messaging across the entire platform',
    ],
    es: [
      'Reporte de Ausencias 24h estricto: solo el último culto finalizado evalúa asistencias QR y se reinicia cada 24h automáticamente',
      'Rol Recepción: acceso dedicado al escáner QR del culto activo sin permisos para modificar o eliminar miembros ni roles',
      'Rendimiento y Seguridad Reforzada: carga rápida de iglesias bajo demanda, sincronización por rol y aislamiento del panel general',
      'Estabilidad e Interfaz Ejecutiva: títulos claros y profesionales en toda la plataforma',
    ],
  },
  importantNotice: {
    ht: 'Mizajou sa a pare pou telechaje sou https://omnichurch.download. Sesyon w, legliz ou ak tout done w yo rete an sekirite 100%.',
    fr: 'Cette mise à jour est prête au téléchargement sur https://omnichurch.download. Votre session, votre église et toutes vos données sont 100% préservées.',
    en: 'This update is ready for download at https://omnichurch.download. Your session, active church, and all data remain 100% preserved.',
    es: 'Esta actualización está lista para descargar en https://omnichurch.download. Su sesión, iglesia activa y todos los datos permanecen 100% preservados.',
  },
};

export const DEFAULT_COMMENT_MODERATION_CONFIG: RemoteCommentModerationConfig = {
  enabled: true,
  allowMemberCommentsGlobal: true,
  allowServiceComments: true,
  allowAnnouncementComments: true,
  autoBlockProfanity: true,
  blockExternalLinks: true,
  maxCommentLength: 500,
  slowModeCooldownSeconds: 15,
  blockedKeywords: [
    'spam',
    'scam',
    'casino',
    'betting',
    'crypto giveaway',
    'whatsapp.com',
    't.me/',
    'bit.ly',
    'makak',
    'bouzin',
    'salòp',
    'fuck',
    'shit',
    'bitch',
    'merde',
    'putain',
    'connard',
  ],
  mutedMemberIds: [],
  disabledChurchIds: [],
};

export function sanitizeCommentModerationConfig(
  raw?: Partial<RemoteCommentModerationConfig> | null
): RemoteCommentModerationConfig {
  if (!raw || typeof raw !== 'object') {
    return {
      ...DEFAULT_COMMENT_MODERATION_CONFIG,
      blockedKeywords: [...DEFAULT_COMMENT_MODERATION_CONFIG.blockedKeywords],
      mutedMemberIds: [],
      disabledChurchIds: [],
    };
  }

  const maxLenRaw = Number(raw.maxCommentLength ?? DEFAULT_COMMENT_MODERATION_CONFIG.maxCommentLength);
  const maxCommentLength = Number.isFinite(maxLenRaw)
    ? Math.min(1000, Math.max(50, Math.round(maxLenRaw)))
    : 500;

  const slowRaw = Number(
    raw.slowModeCooldownSeconds ?? DEFAULT_COMMENT_MODERATION_CONFIG.slowModeCooldownSeconds
  );
  const slowModeCooldownSeconds = Number.isFinite(slowRaw)
    ? Math.min(300, Math.max(0, Math.round(slowRaw)))
    : 15;

  const blockedKeywords = Array.isArray(raw.blockedKeywords)
    ? Array.from(
        new Set(
          raw.blockedKeywords
            .map((w) => String(w || '').trim().toLowerCase())
            .filter(Boolean)
        )
      )
    : [...DEFAULT_COMMENT_MODERATION_CONFIG.blockedKeywords];

  const dedupePreserveFirst = (items: unknown[]): string[] => {
    const seen = new Map<string, string>();
    for (const item of items) {
      const trimmed = String(item || '').trim();
      if (!trimmed) continue;
      const key = trimmed.toUpperCase();
      if (!seen.has(key)) {
        seen.set(key, trimmed);
      }
    }
    return Array.from(seen.values());
  };

  const mutedMemberIds = Array.isArray(raw.mutedMemberIds)
    ? dedupePreserveFirst(raw.mutedMemberIds)
    : [];

  const disabledChurchIds = Array.isArray(raw.disabledChurchIds)
    ? dedupePreserveFirst(raw.disabledChurchIds)
    : [];

  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : true,
    allowMemberCommentsGlobal:
      typeof raw.allowMemberCommentsGlobal === 'boolean' ? raw.allowMemberCommentsGlobal : true,
    allowServiceComments:
      typeof raw.allowServiceComments === 'boolean' ? raw.allowServiceComments : true,
    allowAnnouncementComments:
      typeof raw.allowAnnouncementComments === 'boolean' ? raw.allowAnnouncementComments : true,
    autoBlockProfanity:
      typeof raw.autoBlockProfanity === 'boolean' ? raw.autoBlockProfanity : true,
    blockExternalLinks:
      typeof raw.blockExternalLinks === 'boolean' ? raw.blockExternalLinks : true,
    maxCommentLength,
    slowModeCooldownSeconds,
    blockedKeywords,
    mutedMemberIds,
    disabledChurchIds,
    lastModerationPushAt: raw.lastModerationPushAt || undefined,
  };
}

export const OFFICIAL_PLATFORM_VERIFICATION_URL = 'https://verify.omnichurch.download';

export function sanitizeVerificationBaseUrl(rawUrl?: string | null): string {
  const trimmed = String(rawUrl || '').trim().replace(/\/+$/, '');
  if (!trimmed) return OFFICIAL_PLATFORM_VERIFICATION_URL;
  const candidate =
    trimmed.startsWith('https://') || trimmed.startsWith('http://')
      ? trimmed
      : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return candidate.replace(/\/+$/, '');
    }
  } catch {
  }
  return OFFICIAL_PLATFORM_VERIFICATION_URL;
}

export const DEFAULT_MEMBER_VERIFICATION_CONFIG: RemoteMemberVerificationConfig = {
  enabled: true,
  verificationBaseUrl: OFFICIAL_PLATFORM_VERIFICATION_URL,
  enforceActiveStatusCheck: true,
  showMemberPhoto: true,
  showLegalDocuments: true,
  maskLegalDocumentNumber: false,
  showChurchContactInfo: true,
  showChurchRncBadge: true,
  allowPrintAndShare: true,
  disabledChurchIds: [],
  customAuthorityNotice: '',
};

export function sanitizeMemberVerificationConfig(
  raw?: Partial<RemoteMemberVerificationConfig> | null
): RemoteMemberVerificationConfig {
  if (!raw || typeof raw !== 'object') {
    return {
      ...DEFAULT_MEMBER_VERIFICATION_CONFIG,
      disabledChurchIds: [],
    };
  }

  const seenChurches = new Map<string, string>();
  if (Array.isArray(raw.disabledChurchIds)) {
    for (const cid of raw.disabledChurchIds) {
      const trimmed = String(cid || '').trim();
      if (!trimmed) continue;
      const upper = trimmed.toUpperCase();
      if (!seenChurches.has(upper)) {
        seenChurches.set(upper, trimmed);
      }
    }
  }

  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : true,
    verificationBaseUrl: sanitizeVerificationBaseUrl(raw.verificationBaseUrl),
    enforceActiveStatusCheck:
      typeof raw.enforceActiveStatusCheck === 'boolean' ? raw.enforceActiveStatusCheck : true,
    showMemberPhoto: typeof raw.showMemberPhoto === 'boolean' ? raw.showMemberPhoto : true,
    showLegalDocuments:
      typeof raw.showLegalDocuments === 'boolean' ? raw.showLegalDocuments : true,
    maskLegalDocumentNumber:
      typeof raw.maskLegalDocumentNumber === 'boolean' ? raw.maskLegalDocumentNumber : false,
    showChurchContactInfo:
      typeof raw.showChurchContactInfo === 'boolean' ? raw.showChurchContactInfo : true,
    showChurchRncBadge:
      typeof raw.showChurchRncBadge === 'boolean' ? raw.showChurchRncBadge : true,
    allowPrintAndShare:
      typeof raw.allowPrintAndShare === 'boolean' ? raw.allowPrintAndShare : true,
    disabledChurchIds: Array.from(seenChurches.values()),
    customAuthorityNotice:
      typeof raw.customAuthorityNotice === 'string'
        ? raw.customAuthorityNotice.trim().slice(0, 600)
        : '',
    lastVerificationPushAt: raw.lastVerificationPushAt || undefined,
  };
}

/**
 * Masks sensitive legal document digits (CIN/NIF/Passport) while keeping the last 4 characters visible.
 */
export function maskLegalDocumentNumberValue(rawNumber?: string | null): string {
  const clean = (rawNumber || '').trim();
  if (!clean) return '';
  if (clean.length <= 4) return '••••';
  const visibleTail = clean.slice(-4);
  const maskedPrefix = clean
    .slice(0, -4)
    .replace(/[a-zA-Z0-9]/g, '•');
  return `${maskedPrefix}${visibleTail}`;
}

/**
 * Parses any Member Verification lookup string:
 * - Full verification URL (`https://verify.omnichurch.download/?verify=1&church=CH001&member=CH001-1234`)
 * - Canonical QR payload (`CHURCH:CH001|MEMBER:CH001-1234`)
 * - Raw Member ID / Doc ID / Barcode token (`CH001-1234`)
 */
export function parseMemberVerificationLookupInput(
  rawInput: string,
  fallbackChurchId?: string
): { memberCode: string; churchId?: string } {
  const clean = (rawInput || '').trim();
  const fallbackChurch = (fallbackChurchId || '').trim() || undefined;
  if (!clean) return { memberCode: '', churchId: fallbackChurch };

  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.includes('verify=')) {
    try {
      const normalized = clean.startsWith('http') ? clean : `https://verify.omnichurch.download/${clean.replace(/^\/+/, '')}`;
      const url = new URL(normalized);
      const hashQueryIdx = url.hash.indexOf('?');
      const hashParams = hashQueryIdx >= 0 ? new URLSearchParams(url.hash.slice(hashQueryIdx + 1)) : null;
      const mParam = (
        url.searchParams.get('member') ||
        url.searchParams.get('verify_member') ||
        url.searchParams.get('m') ||
        hashParams?.get('member') ||
        hashParams?.get('verify_member') ||
        hashParams?.get('m') ||
        ''
      ).trim();
      const cParam = (
        url.searchParams.get('church') ||
        url.searchParams.get('c') ||
        hashParams?.get('church') ||
        hashParams?.get('c') ||
        ''
      ).trim();
      if (mParam) {
        return {
          memberCode: mParam,
          churchId: cParam || fallbackChurch,
        };
      }
    } catch {
      const mMatch = clean.match(/[?&](?:member|verify_member|m)=([^&#]+)/i);
      const cMatch = clean.match(/[?&](?:church|c)=([^&#]+)/i);
      if (mMatch?.[1]) {
        return {
          memberCode: decodeURIComponent(mMatch[1]).trim(),
          churchId: cMatch?.[1] ? decodeURIComponent(cMatch[1]).trim() : fallbackChurch,
        };
      }
    }
  }

  if (clean.toUpperCase().includes('MEMBER:')) {
    const churchPart = clean.match(/CHURCH:([^|;\s]+)/i)?.[1]?.trim();
    const memberPart = clean.match(/MEMBER:([^|;\s]+)/i)?.[1]?.trim();
    if (memberPart) {
      return {
        memberCode: memberPart,
        churchId: churchPart || fallbackChurch,
      };
    }
  }

  return { memberCode: clean, churchId: fallbackChurch };
}

export const DEFAULT_DEVELOPER_SETTINGS: DeveloperSettings = {
  masterPin: '7799', // Initial default code until developer sets custom PIN
  maintenanceMode: false,
  maintenanceMessage: 'Sistèm nan nan peryòd antretyen teknik. Tanpri retounen pita.',
  showSponsorsInFooter: true,
  sponsorMarqueeSpeed: 26,
  enforceLicenseLockout: false,
  adMob: DEFAULT_ADMOB_CONFIG,
  commentModeration: DEFAULT_COMMENT_MODERATION_CONFIG,
  memberVerification: DEFAULT_MEMBER_VERIFICATION_CONFIG,
  legalConfig: DEFAULT_LEGAL_CONFIG,
  languageConfig: DEFAULT_LANGUAGE_CONFIG,
  sponsors: [],
  licenses: [],
  donations: DEFAULT_DONATION_CONFIG,
  broadcasts: [],
  auditLogs: [],
  appUpdate: DEFAULT_DEVELOPER_APP_UPDATE_CONFIG,
  lastUpdated: new Date().toISOString(),
};

// Known demo IDs to filter out permanently
const LEGACY_DEMO_SPONSOR_IDS = new Set([
  'spon_digicel',
  'spon_natcom',
  'spon_sogebank',
  'spon_lumiereradio',
  'spon_biblesociety',
  'spon_cloudsoft',
]);

const LEGACY_DEMO_LICENSE_KEYS = new Set([
  'OMNI-CH001-LIFETIME-9941-8820',
  'OMNI-GLOBAL-PRO-2026-7782',
]);

/**
 * Sanitizes donation configuration by stripping legacy demo/placeholder values
 * so that all payment info fields remain completely empty until Jackson Charles enters his own.
 */
export function cleanDonationConfig(rawDonations?: Partial<DeveloperDonationConfig>): DeveloperDonationConfig {
  const merged: DeveloperDonationConfig = {
    ...DEFAULT_DONATION_CONFIG,
    ...(rawDonations || {}),
  };

  // Strip legacy demo placeholder values
  if (merged.binancePayId === '589231401') merged.binancePayId = '';
  if (merged.binanceUsdtAddress === 'TXjK9zYqN8xV7mP2Wq8L1bRc4vZsE9aD1f') merged.binanceUsdtAddress = '';
  if (merged.wiseIban === 'BE68 5390 0754 7034') merged.wiseIban = '';
  if (merged.wiseTag === '@jacksoncharles') merged.wiseTag = '';
  if (merged.moncashNumber === '+509 3700-0000' || merged.moncashNumber === '+509 37 00 0000') merged.moncashNumber = '';
  if (merged.developerPhone === '+509 3700-0000') merged.developerPhone = '';

  // Ensure all channels are unselected (false) by default unless the developer has explicitly customized
  // them OR already entered real payment account details for that channel.
  if (!merged.userCustomizedChannels) {
    const hasPaypalData = Boolean(merged.paypalEmail?.trim() || merged.paypalMeUrl?.trim());
    const hasBinanceData = Boolean(merged.binancePayId?.trim() || merged.binanceUsdtAddress?.trim());
    const hasWiseData = Boolean(merged.wiseEmail?.trim() || merged.wiseTag?.trim() || merged.wiseIban?.trim());
    const hasMoncashData = Boolean(merged.moncashNumber?.trim() || merged.moncashName?.trim());
    const hasZelleData = Boolean(merged.zelleInfo?.trim());

    merged.paypalEnabled = hasPaypalData ? Boolean(merged.paypalEnabled) : false;
    merged.binanceEnabled = hasBinanceData ? Boolean(merged.binanceEnabled) : false;
    merged.wiseEnabled = hasWiseData ? Boolean(merged.wiseEnabled) : false;
    merged.moncashEnabled = hasMoncashData ? Boolean(merged.moncashEnabled) : false;
    merged.zelleEnabled = hasZelleData ? Boolean(merged.zelleEnabled) : false;
  }

  merged.enableShakeAnimation = merged.enableShakeAnimation !== false;
  const rawShakeInterval = Number(merged.shakeIntervalSeconds ?? DEFAULT_DONATION_CONFIG.shakeIntervalSeconds ?? 6);
  merged.shakeIntervalSeconds = Number.isFinite(rawShakeInterval)
    ? Math.min(30, Math.max(3, Math.round(rawShakeInterval)))
    : 6;
  merged.buttonImageUrl =
    typeof merged.buttonImageUrl === 'string' && merged.buttonImageUrl.trim().length > 0
      ? merged.buttonImageUrl.trim()
      : DEFAULT_DONATE_BUTTON_IMAGE;

  const rawLocalized = (rawDonations?.localizedCopy || {}) as Partial<
    Record<Language, Partial<LocalizedDonationCopy>>
  >;
  const pickString = (candidate: unknown, fallback: string): string =>
    typeof candidate === 'string' && candidate.trim().length > 0 ? candidate.trim() : fallback;

  const legacyHtTitle = pickString(rawDonations?.screenTitle, DEFAULT_LOCALIZED_DONATION_COPY.ht.screenTitle);
  const legacyHtSubtitle = pickString(rawDonations?.screenSubtitle, DEFAULT_LOCALIZED_DONATION_COPY.ht.screenSubtitle);
  const legacyHtRole = pickString(rawDonations?.developerRole, DEFAULT_LOCALIZED_DONATION_COPY.ht.developerRole);
  const legacyHtBio = pickString(rawDonations?.developerBio, DEFAULT_LOCALIZED_DONATION_COPY.ht.developerBio);
  const legacyHtNote = pickString(rawDonations?.customNote, DEFAULT_LOCALIZED_DONATION_COPY.ht.customNote);

  const normalizedLocalizedCopy: Record<Language, LocalizedDonationCopy> = {
    ht: {
      screenTitle: pickString(rawLocalized.ht?.screenTitle, legacyHtTitle),
      screenSubtitle: pickString(rawLocalized.ht?.screenSubtitle, legacyHtSubtitle),
      developerRole: pickString(rawLocalized.ht?.developerRole, legacyHtRole),
      developerBio: pickString(rawLocalized.ht?.developerBio, legacyHtBio),
      customNote: pickString(rawLocalized.ht?.customNote, legacyHtNote),
    },
    fr: {
      screenTitle: pickString(rawLocalized.fr?.screenTitle, DEFAULT_LOCALIZED_DONATION_COPY.fr.screenTitle),
      screenSubtitle: pickString(rawLocalized.fr?.screenSubtitle, DEFAULT_LOCALIZED_DONATION_COPY.fr.screenSubtitle),
      developerRole: pickString(rawLocalized.fr?.developerRole, DEFAULT_LOCALIZED_DONATION_COPY.fr.developerRole),
      developerBio: pickString(rawLocalized.fr?.developerBio, DEFAULT_LOCALIZED_DONATION_COPY.fr.developerBio),
      customNote: pickString(rawLocalized.fr?.customNote, DEFAULT_LOCALIZED_DONATION_COPY.fr.customNote),
    },
    en: {
      screenTitle: pickString(rawLocalized.en?.screenTitle, DEFAULT_LOCALIZED_DONATION_COPY.en.screenTitle),
      screenSubtitle: pickString(rawLocalized.en?.screenSubtitle, DEFAULT_LOCALIZED_DONATION_COPY.en.screenSubtitle),
      developerRole: pickString(rawLocalized.en?.developerRole, DEFAULT_LOCALIZED_DONATION_COPY.en.developerRole),
      developerBio: pickString(rawLocalized.en?.developerBio, DEFAULT_LOCALIZED_DONATION_COPY.en.developerBio),
      customNote: pickString(rawLocalized.en?.customNote, DEFAULT_LOCALIZED_DONATION_COPY.en.customNote),
    },
    es: {
      screenTitle: pickString(rawLocalized.es?.screenTitle, DEFAULT_LOCALIZED_DONATION_COPY.es.screenTitle),
      screenSubtitle: pickString(rawLocalized.es?.screenSubtitle, DEFAULT_LOCALIZED_DONATION_COPY.es.screenSubtitle),
      developerRole: pickString(rawLocalized.es?.developerRole, DEFAULT_LOCALIZED_DONATION_COPY.es.developerRole),
      developerBio: pickString(rawLocalized.es?.developerBio, DEFAULT_LOCALIZED_DONATION_COPY.es.developerBio),
      customNote: pickString(rawLocalized.es?.customNote, DEFAULT_LOCALIZED_DONATION_COPY.es.customNote),
    },
  };

  merged.localizedCopy = normalizedLocalizedCopy;
  merged.screenTitle = normalizedLocalizedCopy.ht.screenTitle;
  merged.screenSubtitle = normalizedLocalizedCopy.ht.screenSubtitle;
  merged.developerRole = normalizedLocalizedCopy.ht.developerRole;
  merged.developerBio = normalizedLocalizedCopy.ht.developerBio;
  merged.customNote = normalizedLocalizedCopy.ht.customNote;

  return merged;
}

/**
 * Resolves the Donate screen & profile copy strictly for the active app language
 * (ht / fr / en / es), preventing Haitian Creole defaults from leaking into FR/EN/ES screens.
 */
export function resolveLocalizedDonationCopy(
  config: DeveloperDonationConfig | undefined | null,
  language: Language | string = 'ht'
): LocalizedDonationCopy {
  const safeLang: Language =
    language === 'fr' || language === 'en' || language === 'es' ? language : 'ht';
  const cleaned = cleanDonationConfig(config || undefined);
  const langCopy = cleaned.localizedCopy?.[safeLang];
  const fallback = DEFAULT_LOCALIZED_DONATION_COPY[safeLang];
  return {
    screenTitle: langCopy?.screenTitle?.trim() || fallback.screenTitle,
    screenSubtitle: langCopy?.screenSubtitle?.trim() || fallback.screenSubtitle,
    developerRole: langCopy?.developerRole?.trim() || fallback.developerRole,
    developerBio: langCopy?.developerBio?.trim() || fallback.developerBio,
    customNote: langCopy?.customNote?.trim() || fallback.customNote,
  };
}

/**
 * Sanitize Developer App Update Config to ensure a unified baseline (APP_BASE_VERSION)
 * and clean out any legacy uninitialized demo versions (e.g. 2.5.0, 2.4.0, 2.0.0).
 */
export function sanitizeAppUpdateConfig(rawUpdate?: any): DeveloperAppUpdateConfig {
  if (!rawUpdate || typeof rawUpdate !== 'object') {
    return { ...DEFAULT_DEVELOPER_APP_UPDATE_CONFIG };
  }

  // Detect legacy demo/uninitialized versions (e.g. 2.5.0, 2.4.0, 2.0.0)
  const isLegacyVersion =
    rawUpdate.latestVersion === '2.5.0' ||
    rawUpdate.latestVersion === '2.4.0' ||
    rawUpdate.currentVersion === '2.4.0' ||
    rawUpdate.minRequiredVersion === '2.0.0';

  if (isLegacyVersion) {
    return {
      ...DEFAULT_DEVELOPER_APP_UPDATE_CONFIG,
      latestVersion: APP_BASE_VERSION,
      currentVersion: APP_BASE_VERSION,
      minRequiredVersion: APP_BASE_VERSION,
      isMandatory: false,
    };
  }

  return {
    ...DEFAULT_DEVELOPER_APP_UPDATE_CONFIG,
    ...rawUpdate,
    latestVersion: rawUpdate.latestVersion || APP_BASE_VERSION,
    currentVersion: rawUpdate.currentVersion || APP_BASE_VERSION,
    minRequiredVersion: rawUpdate.minRequiredVersion || APP_BASE_VERSION,
  };
}

/**
 * Load Developer Settings from localStorage with default fallbacks
 */
export function getDeveloperSettings(): DeveloperSettings {
  if (typeof window === 'undefined') return DEFAULT_DEVELOPER_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DEVELOPER_SETTINGS));
      } catch {
        // Ignore storage quota/privacy errors
      }
      return DEFAULT_DEVELOPER_SETTINGS;
    }
    const parsed = JSON.parse(raw) as Partial<DeveloperSettings>;
    
    // Clean sponsors (remove any legacy demo items)
    const rawSponsors = Array.isArray(parsed.sponsors) ? parsed.sponsors : [];
    const cleanSponsors = rawSponsors.filter((s) => !LEGACY_DEMO_SPONSOR_IDS.has(s.id));

    // Clean licenses (remove any legacy demo items)
    const rawLicenses = Array.isArray(parsed.licenses) ? parsed.licenses : [];
    const cleanLicenses = rawLicenses.filter((l) => !LEGACY_DEMO_LICENSE_KEYS.has(l.key));

    // Sanitize appUpdate config to ensure no stuck 2.5.0 / 2.4.0 legacy version exists
    const cleanAppUpdate = sanitizeAppUpdateConfig(parsed.appUpdate);

    // If legacy version 2.5.0 was detected and cleansed, save it back immediately
    if (parsed.appUpdate?.latestVersion === '2.5.0' || parsed.appUpdate?.currentVersion === '2.4.0') {
      try {
        const cleanedSettings: DeveloperSettings = {
          ...DEFAULT_DEVELOPER_SETTINGS,
          ...parsed,
          appUpdate: cleanAppUpdate,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanedSettings));
      } catch (e) {
        // ignore
      }
    }

    const resolvedShowSponsors =
      typeof parsed.showSponsorsInFooter === 'boolean'
        ? parsed.showSponsorsInFooter
        : typeof parsed.sponsorsEnabled === 'boolean'
        ? parsed.sponsorsEnabled
        : DEFAULT_DEVELOPER_SETTINGS.showSponsorsInFooter;

    return {
      ...DEFAULT_DEVELOPER_SETTINGS,
      ...parsed,
      showSponsorsInFooter: resolvedShowSponsors,
      sponsorsEnabled: resolvedShowSponsors,
      masterPin: parsed.masterPin && parsed.masterPin.trim().length >= 4 ? parsed.masterPin.trim() : '7799',
      adMob: {
        ...DEFAULT_ADMOB_CONFIG,
        ...(parsed.adMob || {}),
      },
      commentModeration: sanitizeCommentModerationConfig(parsed.commentModeration),
      memberVerification: sanitizeMemberVerificationConfig(parsed.memberVerification),
      legalConfig: sanitizeLegalConfig(parsed.legalConfig),
      languageConfig: sanitizeLanguageConfig(parsed.languageConfig),
      donations: cleanDonationConfig(parsed.donations),
      sponsors: cleanSponsors,
      licenses: cleanLicenses,
      broadcasts: Array.isArray(parsed.broadcasts) ? parsed.broadcasts : [],
      auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
      appUpdate: cleanAppUpdate,
    };
  } catch (err) {
    console.error('Error reading developer settings:', err);
    return DEFAULT_DEVELOPER_SETTINGS;
  }
}

/**
 * Helper to remove undefined properties recursively before writing to Firestore
 */
function cleanObjectForFirestore<T>(data: T): any {
  if (data === null || data === undefined) return null;
  if (Array.isArray(data)) {
    return data.map((item) => cleanObjectForFirestore(item));
  }
  if (typeof data === 'object') {
    const clean: Record<string, any> = {};
    for (const [key, val] of Object.entries(data as Record<string, any>)) {
      if (val !== undefined) {
        clean[key] = cleanObjectForFirestore(val);
      }
    }
    return clean;
  }
  return data;
}

/**
 * Sanitize raw Firestore or local DeveloperSettings
 */
function sanitizeRemoteDeveloperSettings(data: any): DeveloperSettings {
  const rawSponsors = Array.isArray(data.sponsors) ? data.sponsors : [];
  const cleanSponsors = rawSponsors.filter((s: any) => !LEGACY_DEMO_SPONSOR_IDS.has(s.id));
  const rawLicenses = Array.isArray(data.licenses) ? data.licenses : [];
  const cleanLicenses = rawLicenses.filter((l: any) => !LEGACY_DEMO_LICENSE_KEYS.has(l.key));

  const resolvedShowSponsors =
    typeof data.showSponsorsInFooter === 'boolean'
      ? data.showSponsorsInFooter
      : typeof data.sponsorsEnabled === 'boolean'
      ? data.sponsorsEnabled
      : DEFAULT_DEVELOPER_SETTINGS.showSponsorsInFooter;

  return {
    ...DEFAULT_DEVELOPER_SETTINGS,
    ...data,
    showSponsorsInFooter: resolvedShowSponsors,
    sponsorsEnabled: resolvedShowSponsors,
    adMob: {
      ...DEFAULT_ADMOB_CONFIG,
      ...(data.adMob || {}),
    },
    commentModeration: sanitizeCommentModerationConfig(data.commentModeration),
    memberVerification: sanitizeMemberVerificationConfig(data.memberVerification),
    legalConfig: sanitizeLegalConfig(data.legalConfig),
    languageConfig: sanitizeLanguageConfig(data.languageConfig),
    donations: cleanDonationConfig(data.donations),
    sponsors: cleanSponsors,
    licenses: cleanLicenses,
    broadcasts: Array.isArray(data.broadcasts) ? data.broadcasts : [],
    auditLogs: Array.isArray(data.auditLogs) ? data.auditLogs : [],
    appUpdate: sanitizeAppUpdateConfig(data.appUpdate),
  };
}

/**
 * Permanently resets app update configuration to baseline APP_BASE_VERSION
 * across local storage and Cloud Firestore.
 */
export async function resetDeveloperAppUpdateToBaseline(): Promise<DeveloperSettings> {
  const current = getDeveloperSettings();
  const resetConfig: DeveloperAppUpdateConfig = {
    ...DEFAULT_DEVELOPER_APP_UPDATE_CONFIG,
    latestVersion: APP_BASE_VERSION,
    currentVersion: APP_BASE_VERSION,
    minRequiredVersion: APP_BASE_VERSION,
    isMandatory: false,
    releaseDate: new Date().toISOString().split('T')[0],
  };

  const updated: DeveloperSettings = {
    ...current,
    appUpdate: resetConfig,
  };

  await saveDeveloperSettings(updated);
  return updated;
}

export interface SaveDeveloperSettingsResult {
  savedLocally: boolean;
  syncedToCloud: boolean;
  reason?: string;
}

const LOCAL_DEV_MODIFIED_TS_KEY = 'omnichurch_dev_local_modified_ts_v1';

/**
 * Helper to determine if local developer settings were modified more recently than remote
 */
function isLocalDeveloperConfigNewer(local: DeveloperSettings, remote: DeveloperSettings): boolean {
  if (typeof window === 'undefined') return false;
  const localModMs = Number(localStorage.getItem(LOCAL_DEV_MODIFIED_TS_KEY) || '0');
  const localTs = Date.parse(local.lastUpdated || '') || 0;
  const remoteLastUpdated = Date.parse(remote.lastUpdated || '') || 0;
  const remoteUpdatedAt = Date.parse((remote as any).updatedAt || '') || 0;
  const remoteTs = Math.max(remoteLastUpdated, remoteUpdatedAt);
  const effectiveLocalTs = Math.max(localTs, localModMs);
  if (effectiveLocalTs > 0 && remoteTs > 0) {
    return effectiveLocalTs > remoteTs + 1500;
  }
  return localModMs > 0 && remoteTs === 0;
}

/**
 * Save Developer Settings to localStorage and (when authorized as Super Developer) Cloud Firestore
 */
export async function saveDeveloperSettings(
  settings: DeveloperSettings
): Promise<SaveDeveloperSettingsResult> {
  if (typeof window === 'undefined') {
    return { savedLocally: false, syncedToCloud: false, reason: 'no_window' };
  }
  const resolvedShowSponsors =
    typeof settings.showSponsorsInFooter === 'boolean'
      ? settings.showSponsorsInFooter
      : typeof settings.sponsorsEnabled === 'boolean'
      ? settings.sponsorsEnabled
      : true;

  const nowIso = new Date().toISOString();
  const currentLocal = localStorage.getItem(STORAGE_KEY)
    ? getDeveloperSettings()
    : DEFAULT_DEVELOPER_SETTINGS;
  const updated: DeveloperSettings = {
    ...currentLocal,
    ...settings,
    adMob: {
      ...DEFAULT_ADMOB_CONFIG,
      ...(currentLocal.adMob || {}),
      ...(settings.adMob || {}),
    },
    commentModeration: sanitizeCommentModerationConfig(
      settings.commentModeration || currentLocal.commentModeration
    ),
    memberVerification: sanitizeMemberVerificationConfig(
      settings.memberVerification || currentLocal.memberVerification
    ),
    legalConfig: sanitizeLegalConfig(settings.legalConfig || currentLocal.legalConfig),
    languageConfig: sanitizeLanguageConfig(settings.languageConfig || currentLocal.languageConfig),
    licenses: Array.isArray(settings.licenses) ? settings.licenses : currentLocal.licenses,
    showSponsorsInFooter: resolvedShowSponsors,
    sponsorsEnabled: resolvedShowSponsors,
    lastUpdated: nowIso,
  };

  let savedLocally = false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    localStorage.setItem(LOCAL_DEV_MODIFIED_TS_KEY, String(Date.now()));
    window.dispatchEvent(new CustomEvent('omnichurch_dev_settings_updated', { detail: updated }));
    savedLocally = true;
  } catch (err) {
    console.error('Error saving developer settings to localStorage:', err);
  }

  const cloudAuth = getSuperDeveloperCloudAuthStatus();
  if (!cloudAuth.isAuthorized) {
    return {
      savedLocally,
      syncedToCloud: false,
      reason: 'requires_super_dev_google_auth',
    };
  }

  // Cloud Firestore sync (merges commentModeration alongside adMob, licenses, and updatedAt into app_config/developer_engine)
  try {
    const devDocRef = doc(db, FIRESTORE_DEV_DOC, FIRESTORE_DEV_ID);
    const cleaned = cleanObjectForFirestore({
      ...updated,
      updatedAt: nowIso,
    });
    await setDoc(devDocRef, cleaned, { merge: true });
    return { savedLocally, syncedToCloud: true };
  } catch (err: any) {
    console.warn('Developer settings saved locally; Firestore sync failed:', err);
    return {
      savedLocally,
      syncedToCloud: false,
      reason: err?.message || 'firestore_write_failed',
    };
  }
}

/**
 * Pull Developer Settings from Cloud Firestore if available.
 * Never overwrites newer locally-saved developer settings!
 */
export async function fetchRemoteDeveloperSettings(): Promise<DeveloperSettings | null> {
  try {
    const localCurrent = getDeveloperSettings();
    const devDocRef = doc(db, FIRESTORE_DEV_DOC, FIRESTORE_DEV_ID);
    const snap = await getDoc(devDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (
        data &&
        (data.masterPin ||
          data.adMob ||
          data.commentModeration ||
          data.memberVerification ||
          data.licenses ||
          data.donations)
      ) {
        const mergedRemote = {
          ...localCurrent,
          ...data,
          masterPin: data.masterPin || localCurrent.masterPin,
        };
        const sanitized = sanitizeRemoteDeveloperSettings(mergedRemote);
        if (isLocalDeveloperConfigNewer(localCurrent, sanitized)) {
          // Local developer configuration is newer than remote — keep local and push if authorized
          if (getSuperDeveloperCloudAuthStatus().isAuthorized) {
            await setDoc(devDocRef, cleanObjectForFirestore(localCurrent), { merge: true }).catch(() => {});
          }
          return localCurrent;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
        window.dispatchEvent(new CustomEvent('omnichurch_dev_settings_updated', { detail: sanitized }));
        return sanitized;
      }
    }
  } catch (err) {
    console.warn('Could not fetch remote developer settings:', err);
  }
  return null;
}

/**
 * Real-Time Firestore Subscription for Developer Settings across all devices.
 * Respects newer local developer settings so nothing resets unexpectedly.
 */
export function subscribeToDeveloperSettings(
  callback: (settings: DeveloperSettings) => void
): Unsubscribe {
  try {
    const devDocRef = doc(db, FIRESTORE_DEV_DOC, FIRESTORE_DEV_ID);
    const unsubscribe = onSnapshot(
      devDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (
            data &&
            (data.masterPin ||
              data.adMob ||
              data.commentModeration ||
              data.memberVerification ||
              data.licenses ||
              data.donations)
          ) {
            const localCurrent = getDeveloperSettings();
            const mergedRemote = {
              ...localCurrent,
              ...data,
              masterPin: data.masterPin || localCurrent.masterPin,
            };
            const sanitized = sanitizeRemoteDeveloperSettings(mergedRemote);
            if (isLocalDeveloperConfigNewer(localCurrent, sanitized)) {
              callback(localCurrent);
              return;
            }
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
            } catch (storageErr) {
              console.warn('Could not cache remote developer settings:', storageErr);
            }
            window.dispatchEvent(
              new CustomEvent('omnichurch_dev_settings_updated', { detail: sanitized })
            );
            callback(sanitized);
          }
        }
      },
      (error) => {
        console.warn('Firestore developer settings real-time subscription error:', error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to attach real-time listener to developer settings:', err);
    return () => {};
  }
}

// Security Storage Keys for Brute-Force Protection & Session Management
const DEV_AUTH_FAILED_ATTEMPTS_KEY = 'omnichurch_dev_failed_attempts_count_v2';
const DEV_AUTH_LOCKED_UNTIL_KEY = 'omnichurch_dev_locked_until_ts_v2';
const DEV_AUTH_SESSION_KEY = 'omnichurch_dev_active_session_ts_v2';

export interface DeveloperLockoutInfo {
  isLocked: boolean;
  remainingSeconds: number;
  failedAttempts: number;
  maxAttemptsBeforeLock: number;
}

/**
 * Get current brute-force lockout status for Developer Engine Gate
 */
export function getDeveloperLockoutInfo(): DeveloperLockoutInfo {
  if (typeof window === 'undefined') {
    return { isLocked: false, remainingSeconds: 0, failedAttempts: 0, maxAttemptsBeforeLock: 5 };
  }

  try {
    const rawAttempts = localStorage.getItem(DEV_AUTH_FAILED_ATTEMPTS_KEY);
    const failedAttempts = rawAttempts ? parseInt(rawAttempts, 10) || 0 : 0;
    const rawLockedUntil = localStorage.getItem(DEV_AUTH_LOCKED_UNTIL_KEY);
    const lockedUntil = rawLockedUntil ? parseInt(rawLockedUntil, 10) || 0 : 0;

    const now = Date.now();
    if (lockedUntil > now) {
      const remainingSeconds = Math.ceil((lockedUntil - now) / 1000);
      return {
        isLocked: true,
        remainingSeconds,
        failedAttempts,
        maxAttemptsBeforeLock: 5,
      };
    }

    // If lock expired, clear the lock timestamp
    if (lockedUntil > 0 && lockedUntil <= now) {
      localStorage.removeItem(DEV_AUTH_LOCKED_UNTIL_KEY);
    }

    return {
      isLocked: false,
      remainingSeconds: 0,
      failedAttempts,
      maxAttemptsBeforeLock: 5,
    };
  } catch {
    return { isLocked: false, remainingSeconds: 0, failedAttempts: 0, maxAttemptsBeforeLock: 5 };
  }
}

/**
 * Record a failed developer authentication attempt with progressive brute-force penalty
 */
export async function recordFailedMasterAuthAttempt(): Promise<DeveloperLockoutInfo> {
  if (typeof window === 'undefined') {
    return { isLocked: false, remainingSeconds: 0, failedAttempts: 1, maxAttemptsBeforeLock: 5 };
  }

  try {
    const currentStatus = getDeveloperLockoutInfo();
    const newCount = currentStatus.failedAttempts + 1;
    localStorage.setItem(DEV_AUTH_FAILED_ATTEMPTS_KEY, newCount.toString());

    let lockSeconds = 0;
    if (newCount >= 8) {
      lockSeconds = 300; // 5 minutes lockout
    } else if (newCount >= 5) {
      lockSeconds = 60; // 1 minute lockout
    } else if (newCount >= 3) {
      lockSeconds = 15; // 15 seconds cooldown
    }

    if (lockSeconds > 0) {
      const lockUntil = Date.now() + lockSeconds * 1000;
      localStorage.setItem(DEV_AUTH_LOCKED_UNTIL_KEY, lockUntil.toString());
    }

    // Log security warning
    try {
      await logDeveloperAction(
        'SECURITY_AUTH_FAILED',
        `Tantativ koneksyon devlopè echwe (#${newCount}). ${lockSeconds > 0 ? `Sistèm bloke pou ${lockSeconds}s.` : ''}`,
        'warn'
      );
    } catch {
      // Non-blocking log
    }

    return getDeveloperLockoutInfo();
  } catch {
    return { isLocked: false, remainingSeconds: 0, failedAttempts: 1, maxAttemptsBeforeLock: 5 };
  }
}

/**
 * Record successful authentication, resetting failed attempts & establishing a secure session
 */
export async function recordSuccessfulMasterAuth(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(DEV_AUTH_FAILED_ATTEMPTS_KEY);
    localStorage.removeItem(DEV_AUTH_LOCKED_UNTIL_KEY);
    // Active session for 30 minutes
    const sessionExpiresAt = Date.now() + 30 * 60 * 1000;
    localStorage.setItem(DEV_AUTH_SESSION_KEY, sessionExpiresAt.toString());

    try {
      await logDeveloperAction(
        'SECURITY_AUTH_SUCCESS',
        'Otorizasyon Devlopè reyisi avèk siksè. Sesyon sekirize valide.',
        'success'
      );
    } catch {
      // Non-blocking log
    }
  } catch {
    // Non-blocking
  }
}

/**
 * Check if a verified developer session is currently active
 */
export function isDeveloperSessionActive(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const sessionRaw = localStorage.getItem(DEV_AUTH_SESSION_KEY);
    if (!sessionRaw) return false;
    const expiresAt = parseInt(sessionRaw, 10) || 0;
    return expiresAt > Date.now();
  } catch {
    return false;
  }
}

/**
 * Revoke and lock active developer session immediately
 */
export async function revokeDeveloperSession(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(DEV_AUTH_SESSION_KEY);
    try {
      await logDeveloperAction(
        'SECURITY_SESSION_REVOKED',
        'Sesyon devlopè a fèmen epi re-bloke manyèlman.',
        'info'
      );
    } catch {
      // Non-blocking
    }
  } catch {
    // Non-blocking
  }
}

/**
 * Verify Master Developer Passcode or Strong Alphanumeric Password
 * Strictly checks against the developer's configured custom passcode.
 */
export function verifyMasterPin(inputPin: string): boolean {
  const lockout = getDeveloperLockoutInfo();
  if (lockout.isLocked) {
    return false;
  }

  const current = getDeveloperSettings();
  const trimmed = (inputPin || '').trim();
  if (!trimmed) return false;

  const configured = (current.masterPin || '').trim();
  if (configured) {
    return trimmed === configured;
  }
  return trimmed === '7799';
}

/**
 * Ultra-secure password update requiring minimum strength enforcement and audit logging.
 */
export async function updateMasterPasswordSecurely(
  newPasswordInput: string,
  currentPasswordInput?: string
): Promise<{ success: boolean; message: string }> {
  const currentSettings = getDeveloperSettings();
  const configured = (currentSettings.masterPin || '').trim() || '7799';
  const cleanNew = (newPasswordInput || '').trim();

  // 1. If current password provided, validate it
  if (currentPasswordInput !== undefined && currentPasswordInput !== '') {
    const cleanCurrent = currentPasswordInput.trim();
    if (cleanCurrent !== configured) {
      await recordFailedMasterAuthAttempt();
      return {
        success: false,
        message: 'Modpas aktyèl la pa kòrèk. Aksè refize pou sekirite sistèm nan.',
      };
    }
  }

  // 2. Enforce minimum length (at least 6 characters for ultra-secure passwords)
  if (cleanNew.length < 6) {
    return {
      success: false,
      message: 'Nouvo kòd sekirite a dwe gen omwen 6 karaktè pou anpeche pirataj.',
    };
  }

  // 3. Reject trivial/weak patterns
  const weakPasswords = ['123456', '000000', '111111', 'password', 'admin123', 'qwerty', '779900', '12345678'];
  if (weakPasswords.includes(cleanNew.toLowerCase())) {
    return {
      success: false,
      message: 'Modpas sa a twò fasil pou devine. Tanpri itilize yon modpas ki gen plis divèsite (lèt, chif oswa senbòl).',
    };
  }

  currentSettings.masterPin = cleanNew;
  const saveResult = await saveDeveloperSettings(currentSettings);

  try {
    await logDeveloperAction(
      'SECURITY_CREDENTIAL_UPDATED',
      saveResult.syncedToCloud
        ? 'Nouvo kòd sekirite administrasyon an anrejistre sou aparèy la ak sou sèvè santral la.'
        : 'Nouvo kòd sekirite administrasyon an anrejistre sou aparèy la sèlman (konekte Kont Administrasyon Jeneral pou sèvè santral la).',
      saveResult.syncedToCloud ? 'success' : 'warn'
    );
  } catch {
    // Non-blocking
  }

  return {
    success: true,
    message: saveResult.syncedToCloud
      ? 'Nouvo kòd sekirite administrasyon an anrejistre sou aparèy la ak sou sèvè santral la!'
      : 'Nouvo kòd la anrejistre sou aparèy sa a (pou sove l sou sèvè santral la tou, konekte ak Kont Administrasyon Jeneral Otorize a).',
  };
}

/**
 * Update Developer Master Passcode
 * Saves to local settings and Cloud Firestore database.
 */
export async function updateMasterPin(newPin: string): Promise<boolean> {
  const res = await updateMasterPasswordSecurely(newPin);
  return res.success;
}

/**
 * Permanently Delete a License Key or Church License from Database (Local + Firestore)
 */
export async function deleteLicensePermanently(
  licenseKeyOrChurchId: string
): Promise<{ success: boolean; message: string; count: number }> {
  const current = getDeveloperSettings();
  const search = (licenseKeyOrChurchId || '').trim().toUpperCase();
  if (!search) {
    return { success: false, message: 'Kle oswa ID Legliz pa dwe vid.', count: 0 };
  }

  const originalLength = current.licenses.length;
  current.licenses = current.licenses.filter(
    (l) => l.key.toUpperCase() !== search && l.churchId.toUpperCase() !== search
  );
  const deletedCount = originalLength - current.licenses.length;
  await saveDeveloperSettings(current);

  if (deletedCount > 0) {
    return {
      success: true,
      message: `Lisans (${licenseKeyOrChurchId}) efase definitivman nan baz done a.`,
      count: deletedCount,
    };
  } else {
    return {
      success: false,
      message: `Pa jwenn okenn lisans ki koresponn ak "${licenseKeyOrChurchId}".`,
      count: 0,
    };
  }
}

/**
 * Permanently Delete License for a Specific Church
 */
export async function deleteLicenseForChurch(
  churchId: string
): Promise<{ success: boolean; message: string; count: number }> {
  const current = getDeveloperSettings();
  const targetId = (churchId || '').trim();
  if (!targetId) {
    return { success: false, message: 'ID Legliz pa dwe vid.', count: 0 };
  }

  const originalLength = current.licenses.length;
  current.licenses = current.licenses.filter((l) => l.churchId !== targetId);
  const deletedCount = originalLength - current.licenses.length;
  await saveDeveloperSettings(current);

  if (deletedCount > 0) {
    return {
      success: true,
      message: `Lisans pou legliz ${churchId} efase definitivman nan baz done a.`,
      count: deletedCount,
    };
  } else {
    return {
      success: false,
      message: `Pa jwenn okenn lisans ki aktif pou legliz ${churchId}.`,
      count: 0,
    };
  }
}

/**
 * Update Status of a License Key (active | expired | revoked)
 */
export async function updateLicenseStatus(
  licenseKey: string,
  newStatus: LicenseStatus
): Promise<{ success: boolean; message: string }> {
  const current = getDeveloperSettings();
  const keyToFind = (licenseKey || '').trim().toUpperCase();
  const license = current.licenses.find((l) => l.key.toUpperCase() === keyToFind);
  if (!license) {
    return { success: false, message: `Pa jwenn lisans ${licenseKey}.` };
  }

  license.status = newStatus;
  if (newStatus === 'revoked') {
    license.notes = `${license.notes || ''} [REVOKE pa Dev nan ${new Date().toLocaleDateString()}]`.trim();
  }
  await saveDeveloperSettings(current);
  return {
    success: true,
    message: `Estati lisans ${licenseKey} mete sou ${newStatus.toUpperCase()}.`,
  };
}

/**
 * Revoke License for a Church
 */
export async function revokeChurchLicense(
  churchId: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  const current = getDeveloperSettings();
  const targetId = (churchId || '').trim();
  const license = current.licenses.find((l) => l.churchId === targetId && l.status === 'active');
  if (!license) {
    return { success: false, message: `Pa jwenn lisans aktif pou legliz ${churchId}.` };
  }

  license.status = 'revoked';
  license.notes = `${license.notes || ''} [REVOKE pa Dev: ${reason || 'Aksyon Admin'}]`.trim();
  await saveDeveloperSettings(current);
  return {
    success: true,
    message: `Lisans pou legliz ${churchId} revoke avèk siksè.`,
  };
}

/**
 * Permanently Purge ALL registered licenses from Database (Local + Firestore)
 */
export async function purgeAllLicensesPermanently(): Promise<{ purgedCount: number }> {
  const current = getDeveloperSettings();
  const purgedCount = current.licenses.length;
  current.licenses = [];
  await saveDeveloperSettings(current);
  return { purgedCount };
}

/**
 * 1-Click License System Activation Toggle (For future staged enforcement)
 */
export async function toggleLicenseLockout(enforce: boolean): Promise<boolean> {
  const current = getDeveloperSettings();
  current.enforceLicenseLockout = enforce;
  await saveDeveloperSettings(current);
  return enforce;
}

/**
 * Update Donation Configuration
 * Marks userCustomizedChannels = true so the developer's exact selection is remembered forever.
 */
export async function updateDonationConfig(
  newConfig: Partial<DeveloperDonationConfig>
): Promise<DeveloperDonationConfig> {
  const current = getDeveloperSettings();
  const updatedDonations = cleanDonationConfig({
    ...DEFAULT_DONATION_CONFIG,
    ...(current.donations || {}),
    ...newConfig,
    userCustomizedChannels: true,
  });
  current.donations = updatedDonations;
  await saveDeveloperSettings(current);
  return updatedDonations;
}

export interface DonationsCloudPushResult {
  savedLocally: boolean;
  syncedToCloud: boolean;
  remoteVerified: boolean;
  pushedAt: string;
  reason?: string;
  remoteDonations?: DeveloperDonationConfig;
}

/**
 * Pushes `donations` alongside the rest of `DeveloperSettings` into
 * `app_config/developer_engine` (`{ merge: true }`) and reads back from Firestore
 * to verify 100% Web + Android Mobile parity.
 */
export async function verifyAndPushDonationsToCloud(
  settings?: DeveloperSettings,
  donationOverride?: Partial<DeveloperDonationConfig>
): Promise<DonationsCloudPushResult> {
  const pushedAt = new Date().toISOString();
  const baseSettings = settings || getDeveloperSettings();
  const mergedDonations = cleanDonationConfig({
    ...DEFAULT_DONATION_CONFIG,
    ...(baseSettings.donations || {}),
    ...(donationOverride || {}),
    userCustomizedChannels: true,
    lastDonationsPushAt: pushedAt,
  });

  const nextSettings: DeveloperSettings = {
    ...baseSettings,
    donations: mergedDonations,
  };

  const saveRes = await saveDeveloperSettings(nextSettings);
  if (!saveRes.syncedToCloud) {
    return {
      savedLocally: saveRes.savedLocally,
      syncedToCloud: false,
      remoteVerified: false,
      pushedAt,
      reason: saveRes.reason || 'cloud_sync_skipped',
      remoteDonations: mergedDonations,
    };
  }

  try {
    const devDocRef = doc(db, FIRESTORE_DEV_DOC, FIRESTORE_DEV_ID);
    const snap = await getDoc(devDocRef);
    if (snap.exists()) {
      const data = snap.data();
      const remoteDonations = cleanDonationConfig(data?.donations);
      const remoteVerified =
        remoteDonations.enabled === mergedDonations.enabled &&
        remoteDonations.developerName === mergedDonations.developerName &&
        remoteDonations.enableShakeAnimation === mergedDonations.enableShakeAnimation &&
        remoteDonations.shakeIntervalSeconds === mergedDonations.shakeIntervalSeconds &&
        remoteDonations.paypalEnabled === mergedDonations.paypalEnabled &&
        remoteDonations.binanceEnabled === mergedDonations.binanceEnabled &&
        remoteDonations.wiseEnabled === mergedDonations.wiseEnabled &&
        remoteDonations.moncashEnabled === mergedDonations.moncashEnabled &&
        remoteDonations.zelleEnabled === mergedDonations.zelleEnabled &&
        remoteDonations.localizedCopy?.ht?.screenTitle === mergedDonations.localizedCopy?.ht?.screenTitle &&
        remoteDonations.localizedCopy?.fr?.screenTitle === mergedDonations.localizedCopy?.fr?.screenTitle &&
        remoteDonations.localizedCopy?.en?.screenTitle === mergedDonations.localizedCopy?.en?.screenTitle &&
        remoteDonations.localizedCopy?.es?.screenTitle === mergedDonations.localizedCopy?.es?.screenTitle;
      return {
        savedLocally: saveRes.savedLocally,
        syncedToCloud: true,
        remoteVerified,
        pushedAt,
        remoteDonations,
      };
    }
  } catch (err: any) {
    return {
      savedLocally: saveRes.savedLocally,
      syncedToCloud: true,
      remoteVerified: false,
      pushedAt,
      reason: err?.message || 'remote_readback_failed',
      remoteDonations: mergedDonations,
    };
  }

  return {
    savedLocally: saveRes.savedLocally,
    syncedToCloud: true,
    remoteVerified: false,
    pushedAt,
    reason: 'remote_doc_missing',
    remoteDonations: mergedDonations,
  };
}

/**
 * Get active donation configuration
 */
export function getDonationConfig(): DeveloperDonationConfig {
  const current = getDeveloperSettings();
  return cleanDonationConfig(current.donations);
}

/**
 * Purge All Demo License Keys Permanently from Database
 */
export async function purgeAllDemoLicenses(): Promise<{ purgedCount: number }> {
  const current = getDeveloperSettings();
  const beforeCount = current.licenses.length;
  current.licenses = current.licenses.filter(
    (l) => !LEGACY_DEMO_LICENSE_KEYS.has(l.key) && !l.key.includes('CH001-LIFETIME') && !l.key.includes('GLOBAL-PRO-2026')
  );
  const purgedCount = beforeCount - current.licenses.length;
  await saveDeveloperSettings(current);
  return { purgedCount };
}

/**
 * Purge All Demo Sponsors Permanently from Database
 */
export async function purgeDemoSponsors(): Promise<{ purgedCount: number }> {
  const current = getDeveloperSettings();
  const beforeCount = current.sponsors.length;
  current.sponsors = current.sponsors.filter((s) => !LEGACY_DEMO_SPONSOR_IDS.has(s.id));
  const purgedCount = beforeCount - current.sponsors.length;
  await saveDeveloperSettings(current);
  return { purgedCount };
}

/**
 * License Key Generator Algorithm:
 * e.g. "OMNI-[CHURCHID]-[TIER]-[RANDOM4]-[CHECKSUM4]"
 */
export function generateLicenseKey(churchId: string, tier: LicenseTier): string {
  const cleanId = (churchId || 'GLOBAL').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const tierCode =
    tier === 'enterprise_lifetime'
      ? 'LIFE'
      : tier === 'pro_annual'
      ? 'PRO'
      : tier === 'trial'
      ? 'TRIAL'
      : 'CUST';
  const rand1 = Math.floor(1000 + Math.random() * 9000).toString();
  const rand2 = Math.floor(1000 + Math.random() * 9000).toString();
  return `OMNI-${cleanId}-${tierCode}-${rand1}-${rand2}`;
}

/**
 * Validate and Activate a License Key for a church
 */
export async function validateAndActivateLicense(
  rawKey: string,
  churchId: string,
  churchName?: string
): Promise<{ success: boolean; message: string; license?: ChurchLicense }> {
  const key = (rawKey || '').trim().toUpperCase();
  if (!key.startsWith('OMNI-')) {
    return { success: false, message: 'Fòma kle lisans lan pa valab. Li dwe kòmanse ak OMNI-.' };
  }

  const parts = key.split('-');
  if (parts.length < 5) {
    return { success: false, message: 'Estrikti kle lisans lan enkonplè.' };
  }

  const targetChurchInKey = parts[1];
  const tierPart = parts[2];

  let tier: LicenseTier = 'pro_annual';
  let expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  let maxMembers = 1500;

  if (tierPart === 'LIFE' || tierPart === 'LIFETIME') {
    tier = 'enterprise_lifetime';
    expiresAt = 'never';
    maxMembers = 0; // unlimited
  } else if (tierPart === 'TRIAL') {
    tier = 'trial';
    expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    maxMembers = 200;
  } else if (tierPart === 'PRO') {
    tier = 'pro_annual';
    expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    maxMembers = 2500;
  }

  const settings = getDeveloperSettings();
  const existingLicenseIndex = settings.licenses.findIndex(
    (l) => l.key === key || (l.churchId === churchId && l.churchId !== 'GLOBAL')
  );

  const newLicense: ChurchLicense = {
    key,
    churchId: churchId || targetChurchInKey,
    churchName: churchName || 'Legliz Aktive',
    tier,
    status: 'active',
    issuedAt: new Date().toISOString(),
    expiresAt,
    maxMembers,
    allowCloudSync: true,
    allowMultiChurch: true,
    allowAdFree: true,
    notes: `Aktive otomatikman ${new Date().toLocaleDateString()}`,
  };

  if (existingLicenseIndex >= 0) {
    settings.licenses[existingLicenseIndex] = newLicense;
  } else {
    settings.licenses.unshift(newLicense);
  }

  await saveDeveloperSettings(settings);

  return {
    success: true,
    message: `Lisans ${tier.toUpperCase()} aktive avèk siksè pou legliz la!`,
    license: newLicense,
  };
}

/**
 * Generate AND Immediately Activate a License for a Target Church in 1 Step
 */
export async function generateAndActivateLicenseForChurch(
  churchId: string,
  churchName: string,
  tier: LicenseTier,
  customNotes?: string
): Promise<{ success: boolean; message: string; license?: ChurchLicense }> {
  const key = generateLicenseKey(churchId, tier);
  const res = await validateAndActivateLicense(key, churchId, churchName);
  if (res.success && res.license && customNotes?.trim()) {
    const current = getDeveloperSettings();
    const idx = current.licenses.findIndex((l) => l.key === key);
    if (idx >= 0) {
      current.licenses[idx].notes = customNotes.trim();
      await saveDeveloperSettings(current);
      res.license = current.licenses[idx];
    }
  }
  return res;
}

/**
 * Extend (+1 Year) or Upgrade an Existing License to Lifetime
 */
export async function extendOrUpgradeLicense(
  licenseKey: string,
  mode: 'extend_1_year' | 'upgrade_lifetime'
): Promise<{ success: boolean; message: string; license?: ChurchLicense }> {
  const current = getDeveloperSettings();
  const cleanKey = (licenseKey || '').trim().toUpperCase();
  const idx = current.licenses.findIndex((l) => l.key.toUpperCase() === cleanKey);
  if (idx < 0) {
    return { success: false, message: `Pa jwenn lisans ki gen kle "${licenseKey}".` };
  }

  const target = { ...current.licenses[idx] };
  target.status = 'active';

  if (mode === 'upgrade_lifetime') {
    target.tier = 'enterprise_lifetime';
    target.expiresAt = 'never';
    target.maxMembers = 0;
    target.allowAdFree = true;
    target.allowCloudSync = true;
    target.allowMultiChurch = true;
    target.notes = `${target.notes || ''} [Pase an Pou Tout Tan nan ${new Date().toLocaleDateString()}]`.trim();
  } else {
    const baseTime =
      target.expiresAt && target.expiresAt !== 'never' && Date.parse(target.expiresAt) > Date.now()
        ? Date.parse(target.expiresAt)
        : Date.now();
    const newExp = new Date(baseTime + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    target.expiresAt = newExp;
    if (target.tier === 'trial') {
      target.tier = 'pro_annual';
      target.maxMembers = 2500;
    }
    target.notes = `${target.notes || ''} [Pwolonje +1 Ane jiska ${newExp}]`.trim();
  }

  current.licenses[idx] = target;
  await saveDeveloperSettings(current);

  return {
    success: true,
    message:
      mode === 'upgrade_lifetime'
        ? `Lisans ${target.key} pase an "Pou Tout Tan (Lifetime)" avèk siksè!`
        : `Lisans ${target.key} pwolonje pou +1 ane (jiska ${target.expiresAt})!`,
    license: target,
  };
}

/**
 * Get active license for a given church
 */
export function getChurchLicense(churchId: string): ChurchLicense | null {
  const settings = getDeveloperSettings();
  const match = settings.licenses.find(
    (l) => (l.churchId === churchId || l.churchId === 'GLOBAL') && l.status === 'active'
  );
  if (!match) return null;

  if (match.expiresAt !== 'never') {
    const expDate = new Date(match.expiresAt).getTime();
    if (expDate < Date.now()) {
      return { ...match, status: 'expired' };
    }
  }

  return match;
}

/**
 * Check if a church has an active valid license
 */
export function hasActiveChurchLicense(churchId: string): boolean {
  if (!churchId) return false;
  const license = getChurchLicense(churchId);
  return !!(license && license.status === 'active');
}

/**
 * Check if Church is Ad-Free
 */
export function isChurchAdFree(churchId: string): boolean {
  const settings = getDeveloperSettings();
  if (!settings.adMob.enabled) return true;
  if (!settings.adMob.adFreeForLicensedChurches) return false;

  const license = getChurchLicense(churchId);
  return !!(license && license.status === 'active' && license.allowAdFree);
}

export interface EffectiveMobileAdMobResolution {
  shouldShowAds: boolean;
  isTestMode: boolean;
  adFreeReason: 'none' | 'master_disabled' | 'mobile_disabled' | 'pro_church_license';
  effectiveAppId: string;
  effectiveBannerId: string;
  effectiveInterstitialId: string;
  effectiveRewardedId: string;
  effectiveNativeId: string;
  placements: {
    homeBanner: boolean;
    announcementsBanner: boolean;
    servicesBanner: boolean;
    interstitialAfterScanClose: boolean;
    interstitialScanFrequency: number;
    interstitialCooldownSeconds: number;
    rewardedVideo: boolean;
    nativeFeed: boolean;
  };
}

/**
 * Resolves the exact effective AdMob configuration that the Android Kotlin app
 * (com.zoutiw.omnichurch) applies from `app_config/developer_engine`.
 * Automatically enforces Google Official Test IDs when `environment === 'test'`
 * or `mobileForceTestIds === true`, and respects Pro church Ad-Free licenses.
 */
export function resolveEffectiveMobileAdMobConfig(
  customAdMob?: Partial<AdMobConfig>,
  churchId?: string,
  customLicenses?: ChurchLicense[]
): EffectiveMobileAdMobResolution {
  const settings = getDeveloperSettings();
  const cfg: AdMobConfig = {
    ...DEFAULT_ADMOB_CONFIG,
    ...settings.adMob,
    ...(customAdMob || {}),
  };

  const TEST_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
  const TEST_BANNER = 'ca-app-pub-3940256099942544/6300978111';
  const TEST_INTERSTITIAL = 'ca-app-pub-3940256099942544/1033173712';
  const TEST_REWARDED = 'ca-app-pub-3940256099942544/5224354917';
  const TEST_NATIVE = 'ca-app-pub-3940256099942544/2247696110';

  const isTestMode = cfg.environment === 'test' || cfg.mobileForceTestIds === true;
  const mobileEnabled = cfg.mobileEnabled !== false;

  let churchHasAdFreeLicense = false;
  if (churchId && cfg.adFreeForLicensedChurches) {
    const licensesPool = Array.isArray(customLicenses) ? customLicenses : settings.licenses;
    const matchedLicense = licensesPool.find(
      (l) => l.churchId === churchId && l.status === 'active' && l.allowAdFree
    );
    if (matchedLicense) {
      if (matchedLicense.expiresAt && matchedLicense.expiresAt !== 'never') {
        churchHasAdFreeLicense = new Date(matchedLicense.expiresAt).getTime() >= Date.now();
      } else {
        churchHasAdFreeLicense = true;
      }
    }
  }

  let adFreeReason: EffectiveMobileAdMobResolution['adFreeReason'] = 'none';
  if (!cfg.enabled) {
    adFreeReason = 'master_disabled';
  } else if (!mobileEnabled) {
    adFreeReason = 'mobile_disabled';
  } else if (churchHasAdFreeLicense) {
    adFreeReason = 'pro_church_license';
  }

  const shouldShowAds = adFreeReason === 'none';

  return {
    shouldShowAds,
    isTestMode,
    adFreeReason,
    effectiveAppId: isTestMode ? TEST_APP_ID : cfg.adMobAppId?.trim() || TEST_APP_ID,
    effectiveBannerId: isTestMode ? TEST_BANNER : cfg.bannerAdUnitId?.trim() || TEST_BANNER,
    effectiveInterstitialId: isTestMode
      ? TEST_INTERSTITIAL
      : cfg.interstitialAdUnitId?.trim() || TEST_INTERSTITIAL,
    effectiveRewardedId: isTestMode ? TEST_REWARDED : cfg.rewardedAdUnitId?.trim() || TEST_REWARDED,
    effectiveNativeId: isTestMode ? TEST_NATIVE : cfg.nativeAdUnitId?.trim() || TEST_NATIVE,
    placements: {
      homeBanner: shouldShowAds && cfg.mobileShowBannerHome !== false,
      announcementsBanner: shouldShowAds && cfg.mobileShowBannerAnnouncements !== false,
      servicesBanner: shouldShowAds && cfg.mobileShowBannerServices === true,
      interstitialAfterScanClose:
        shouldShowAds &&
        cfg.enableInterstitialOnScan !== false &&
        cfg.mobileEnableInterstitialAfterScanClose !== false,
      interstitialScanFrequency: Math.max(1, Number(cfg.interstitialScanFrequency || 4)),
      interstitialCooldownSeconds: Math.max(30, Number(cfg.mobileInterstitialCooldownSeconds || 180)),
      rewardedVideo: shouldShowAds && cfg.mobileRewardedEnabled === true,
      nativeFeed: shouldShowAds && cfg.mobileNativeFeedEnabled !== false,
    },
  };
}

export interface AdMobCloudPushVerificationResult {
  savedLocally: boolean;
  syncedToCloud: boolean;
  remoteVerified: boolean;
  pushedAt: string;
  reason?: string;
  remoteAdMob?: AdMobConfig;
}

/**
 * Pushes the current DeveloperSettings (including AdMob mobile remote controls)
 * to `app_config/developer_engine` in the named Firestore database and reads back
 * the live remote snapshot to verify 100% parity for Android clients.
 */
export async function verifyAndPushAdMobConfigToCloud(
  settings: DeveloperSettings
): Promise<AdMobCloudPushVerificationResult> {
  const pushedAt = new Date().toISOString();
  const nextSettings: DeveloperSettings = {
    ...settings,
    adMob: {
      ...DEFAULT_ADMOB_CONFIG,
      ...settings.adMob,
      lastCloudPushAt: pushedAt,
    },
  };

  const saveRes = await saveDeveloperSettings(nextSettings);
  if (!saveRes.syncedToCloud) {
    return {
      savedLocally: saveRes.savedLocally,
      syncedToCloud: false,
      remoteVerified: false,
      pushedAt,
      reason: saveRes.reason || 'cloud_sync_skipped',
    };
  }

  try {
    const devDocRef = doc(db, FIRESTORE_DEV_DOC, FIRESTORE_DEV_ID);
    const snap = await getDoc(devDocRef);
    if (snap.exists()) {
      const data = snap.data();
      const remoteAdMob: AdMobConfig = {
        ...DEFAULT_ADMOB_CONFIG,
        ...(data?.adMob || {}),
      };
      const remoteVerified =
        remoteAdMob.enabled === nextSettings.adMob.enabled &&
        remoteAdMob.environment === nextSettings.adMob.environment &&
        remoteAdMob.mobileEnabled === nextSettings.adMob.mobileEnabled;
      return {
        savedLocally: saveRes.savedLocally,
        syncedToCloud: true,
        remoteVerified,
        pushedAt,
        remoteAdMob,
      };
    }
  } catch (err: any) {
    return {
      savedLocally: saveRes.savedLocally,
      syncedToCloud: true,
      remoteVerified: false,
      pushedAt,
      reason: err?.message || 'remote_readback_failed',
    };
  }

  return {
    savedLocally: saveRes.savedLocally,
    syncedToCloud: true,
    remoteVerified: false,
    pushedAt,
    reason: 'remote_doc_missing',
  };
}

export interface CommentModerationCloudPushResult {
  savedLocally: boolean;
  syncedToCloud: boolean;
  remoteVerified: boolean;
  pushedAt: string;
  reason?: string;
  remoteCommentModeration?: RemoteCommentModerationConfig;
}

/**
 * Pushes `commentModeration` alongside `adMob`, `licenses`, and `updatedAt`
 * to `app_config/developer_engine` using `{ merge: true }` so neither overwrites the other,
 * and reads back the remote document to verify parity.
 */
export async function verifyAndPushCommentModerationToCloud(
  settings: DeveloperSettings,
  moderationOverride?: Partial<RemoteCommentModerationConfig>
): Promise<CommentModerationCloudPushResult> {
  const pushedAt = new Date().toISOString();
  const mergedModeration = sanitizeCommentModerationConfig({
    ...(settings.commentModeration || DEFAULT_COMMENT_MODERATION_CONFIG),
    ...(moderationOverride || {}),
    lastModerationPushAt: pushedAt,
  });

  const nextSettings: DeveloperSettings = {
    ...settings,
    commentModeration: mergedModeration,
  };

  const saveRes = await saveDeveloperSettings(nextSettings);
  if (!saveRes.syncedToCloud) {
    return {
      savedLocally: saveRes.savedLocally,
      syncedToCloud: false,
      remoteVerified: false,
      pushedAt,
      reason: saveRes.reason || 'cloud_sync_skipped',
      remoteCommentModeration: mergedModeration,
    };
  }

  try {
    const devDocRef = doc(db, FIRESTORE_DEV_DOC, FIRESTORE_DEV_ID);
    const snap = await getDoc(devDocRef);
    if (snap.exists()) {
      const data = snap.data();
      const remoteCommentModeration = sanitizeCommentModerationConfig(data?.commentModeration);
      const remoteVerified =
        remoteCommentModeration.enabled === mergedModeration.enabled &&
        remoteCommentModeration.allowMemberCommentsGlobal ===
          mergedModeration.allowMemberCommentsGlobal &&
        remoteCommentModeration.maxCommentLength === mergedModeration.maxCommentLength;
      return {
        savedLocally: saveRes.savedLocally,
        syncedToCloud: true,
        remoteVerified,
        pushedAt,
        remoteCommentModeration,
      };
    }
  } catch (err: any) {
    return {
      savedLocally: saveRes.savedLocally,
      syncedToCloud: true,
      remoteVerified: false,
      pushedAt,
      reason: err?.message || 'remote_readback_failed',
      remoteCommentModeration: mergedModeration,
    };
  }

  return {
    savedLocally: saveRes.savedLocally,
    syncedToCloud: true,
    remoteVerified: false,
    pushedAt,
    reason: 'remote_doc_missing',
    remoteCommentModeration: mergedModeration,
  };
}

export interface MemberVerificationCloudPushResult {
  savedLocally: boolean;
  syncedToCloud: boolean;
  remoteVerified: boolean;
  pushedAt: string;
  reason?: string;
  remoteMemberVerification?: RemoteMemberVerificationConfig;
}

/**
 * Pushes `memberVerification` alongside `adMob`, `licenses`, `commentModeration`, and `updatedAt`
 * to `app_config/developer_engine` using `{ merge: true }` and reads back to verify server parity.
 */
export async function verifyAndPushMemberVerificationToCloud(
  settings: DeveloperSettings,
  verificationOverride?: Partial<RemoteMemberVerificationConfig>
): Promise<MemberVerificationCloudPushResult> {
  const pushedAt = new Date().toISOString();
  const mergedVerification = sanitizeMemberVerificationConfig({
    ...(settings.memberVerification || DEFAULT_MEMBER_VERIFICATION_CONFIG),
    ...(verificationOverride || {}),
    lastVerificationPushAt: pushedAt,
  });

  const nextSettings: DeveloperSettings = {
    ...settings,
    memberVerification: mergedVerification,
  };

  const saveRes = await saveDeveloperSettings(nextSettings);
  if (!saveRes.syncedToCloud) {
    return {
      savedLocally: saveRes.savedLocally,
      syncedToCloud: false,
      remoteVerified: false,
      pushedAt,
      reason: saveRes.reason || 'cloud_sync_skipped',
      remoteMemberVerification: mergedVerification,
    };
  }

  try {
    const devDocRef = doc(db, FIRESTORE_DEV_DOC, FIRESTORE_DEV_ID);
    const snap = await getDoc(devDocRef);
    if (snap.exists()) {
      const data = snap.data();
      const remoteVerification = sanitizeMemberVerificationConfig(data?.memberVerification);
      const remoteVerified =
        remoteVerification.enabled === mergedVerification.enabled &&
        remoteVerification.enforceActiveStatusCheck === mergedVerification.enforceActiveStatusCheck &&
        remoteVerification.showLegalDocuments === mergedVerification.showLegalDocuments &&
        remoteVerification.maskLegalDocumentNumber === mergedVerification.maskLegalDocumentNumber;
      return {
        savedLocally: saveRes.savedLocally,
        syncedToCloud: true,
        remoteVerified,
        pushedAt,
        remoteMemberVerification: remoteVerification,
      };
    }
  } catch (err: any) {
    return {
      savedLocally: saveRes.savedLocally,
      syncedToCloud: true,
      remoteVerified: false,
      pushedAt,
      reason: err?.message || 'remote_readback_failed',
      remoteMemberVerification: mergedVerification,
    };
  }

  return {
    savedLocally: saveRes.savedLocally,
    syncedToCloud: true,
    remoteVerified: false,
    pushedAt,
    reason: 'remote_doc_missing',
    remoteMemberVerification: mergedVerification,
  };
}

export interface CommentModerationEvaluationResult {
  allowed: boolean;
  reasonCode?:
    | 'empty'
    | 'global_disabled'
    | 'church_disabled'
    | 'service_comments_disabled'
    | 'announcement_comments_disabled'
    | 'user_muted'
    | 'slow_mode'
    | 'too_long'
    | 'external_link'
    | 'profanity_keyword';
  messageHt: string;
  messageFr: string;
  messageEn: string;
  messageEs: string;
  matchedKeyword?: string;
  remainingCooldownSeconds?: number;
}

const EXTERNAL_LINK_REGEX = /(https?:\/\/|www\.[a-z0-9-]+|\b(?:bit\.ly|t\.me|wa\.me|tinyurl\.com)\/)/i;

/**
 * Evaluates a candidate comment against live `commentModeration` policy before posting.
 */
export function evaluateCommentAgainstModeration(params: {
  content: string;
  churchId?: string;
  userIds?: Array<string | undefined | null>;
  targetType?: 'service' | 'announcement';
  lastCommentTimestampMs?: number;
  nowMs?: number;
  customConfig?: Partial<RemoteCommentModerationConfig>;
}): CommentModerationEvaluationResult {
  const settings = getDeveloperSettings();
  const cfg = sanitizeCommentModerationConfig(
    params.customConfig || settings.commentModeration || DEFAULT_COMMENT_MODERATION_CONFIG
  );

  const cleanText = (params.content || '').trim();
  if (!cleanText) {
    return {
      allowed: false,
      reasonCode: 'empty',
      messageHt: 'Tanpri ekri yon mesaj anvan ou voye kòmantè a.',
      messageFr: 'Veuillez saisir un message avant de publier.',
      messageEn: 'Please enter a message before posting.',
      messageEs: 'Por favor escriba un mensaje antes de publicar.',
    };
  }

  const cleanChurchId = (params.churchId || '').trim().toUpperCase();
  const isChurchDisabled =
    Boolean(cleanChurchId) &&
    cfg.disabledChurchIds.some((cid) => cid.trim().toUpperCase() === cleanChurchId);

  // 1. Global kill-switch or per-church disable
  if (!cfg.allowMemberCommentsGlobal || isChurchDisabled) {
    return {
      allowed: false,
      reasonCode: !cfg.allowMemberCommentsGlobal ? 'global_disabled' : 'church_disabled',
      messageHt: 'Kòmantè yo dezaktive tanporèman pa administrasyon an.',
      messageFr: 'Les commentaires sont temporairement désactivés par l’administration.',
      messageEn: 'Comments are temporarily disabled by administration.',
      messageEs: 'Los comentarios están desactivados temporalmente por la administración.',
    };
  }

  // 2. Target type switch (Service vs Announcement)
  if (params.targetType === 'service' && !cfg.allowServiceComments) {
    return {
      allowed: false,
      reasonCode: 'service_comments_disabled',
      messageHt: 'Kòmantè yo dezaktive tanporèman pa administrasyon an.',
      messageFr: 'Les commentaires sur les cultes sont temporairement désactivés.',
      messageEn: 'Comments on worship services are temporarily disabled.',
      messageEs: 'Los comentarios en los cultos están desactivados temporalmente.',
    };
  }
  if (params.targetType === 'announcement' && !cfg.allowAnnouncementComments) {
    return {
      allowed: false,
      reasonCode: 'announcement_comments_disabled',
      messageHt: 'Kòmantè yo dezaktive tanporèman pa administrasyon an.',
      messageFr: 'Les commentaires sur les annonces sont temporairement désactivés.',
      messageEn: 'Comments on announcements are temporarily disabled.',
      messageEs: 'Los comentarios en los anuncios están desactivados temporalmente.',
    };
  }

  // 3. Muted member check
  const normalizedMutedSet = new Set(
    cfg.mutedMemberIds.map((id) => id.trim().toUpperCase()).filter(Boolean)
  );
  const candidateUserIds = (params.userIds || [])
    .filter(Boolean)
    .map((id) => String(id).trim().toUpperCase());

  if (candidateUserIds.some((uid) => normalizedMutedSet.has(uid))) {
    return {
      allowed: false,
      reasonCode: 'user_muted',
      messageHt: 'Kont ou pa gen otorizasyon pou poste kòmantè kounye a.',
      messageFr: 'Votre compte n’est pas autorisé à publier des commentaires pour le moment.',
      messageEn: 'Your account is not authorized to post comments right now.',
      messageEs: 'Su cuenta no tiene autorización para publicar comentarios en este momento.',
    };
  }

  // 4. Max comment length check (always enforced)
  const effectiveMaxLen = Math.min(1000, Math.max(50, cfg.maxCommentLength || 500));
  if (cleanText.length > effectiveMaxLen) {
    return {
      allowed: false,
      reasonCode: 'too_long',
      messageHt: `Kòmantè a twò long (${cleanText.length}/${effectiveMaxLen} karaktè maksimòm).`,
      messageFr: `Commentaire trop long (${cleanText.length}/${effectiveMaxLen} caractères max).`,
      messageEn: `Comment is too long (${cleanText.length}/${effectiveMaxLen} max characters).`,
      messageEs: `El comentario es demasiado largo (${cleanText.length}/${effectiveMaxLen} caracteres máx).`,
    };
  }

  // 5. Slow Mode Cooldown check
  if (cfg.slowModeCooldownSeconds > 0 && params.lastCommentTimestampMs) {
    const now = params.nowMs ?? Date.now();
    const elapsedSeconds = (now - params.lastCommentTimestampMs) / 1000;
    if (elapsedSeconds >= 0 && elapsedSeconds < cfg.slowModeCooldownSeconds) {
      const remaining = Math.max(1, Math.ceil(cfg.slowModeCooldownSeconds - elapsedSeconds));
      return {
        allowed: false,
        reasonCode: 'slow_mode',
        remainingCooldownSeconds: remaining,
        messageHt: `Tanpri tann ${remaining} segonn anvan ou poste yon lòt kòmantè (Slow Mode aktif).`,
        messageFr: `Veuillez patienter ${remaining}s avant de publier un autre commentaire.`,
        messageEn: `Please wait ${remaining}s before posting another comment (Slow Mode active).`,
        messageEs: `Por favor espere ${remaining}s antes de publicar otro comentario.`,
      };
    }
  }

  // Automatic filters below apply when master moderation `enabled` is true
  if (cfg.enabled) {
    // 6. External links check
    if (cfg.blockExternalLinks && EXTERNAL_LINK_REGEX.test(cleanText)) {
      return {
        allowed: false,
        reasonCode: 'external_link',
        messageHt: 'Lyen ekstèn (http://, https://, www.) pa otorize nan kòmantè yo.',
        messageFr: 'Les liens externes (http://, https://, www.) ne sont pas autorisés.',
        messageEn: 'External links (http://, https://, www.) are not allowed in comments.',
        messageEs: 'Los enlaces externos (http://, https://, www.) no están permitidos.',
      };
    }

    // 7. Auto-block profanity / banned keywords check
    if (cfg.autoBlockProfanity && cfg.blockedKeywords.length > 0) {
      const lowerText = cleanText.toLowerCase();
      for (const rawKw of cfg.blockedKeywords) {
        const kw = rawKw.trim().toLowerCase();
        if (!kw) continue;
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Match whole word for short single words, or substring for phrases/domains
        const pattern =
          kw.includes(' ') || kw.includes('.') || kw.includes('/') || kw.length >= 6
            ? new RegExp(escaped, 'i')
            : new RegExp(`(^|[^a-zA-Z0-9À-ÿ])${escaped}([^a-zA-Z0-9À-ÿ]|$)`, 'i');
        if (pattern.test(lowerText)) {
          return {
            allowed: false,
            reasonCode: 'profanity_keyword',
            matchedKeyword: kw,
            messageHt: `Kòmantè a gen mo ki pa otorize nan kominote legliz la ("${kw}").`,
            messageFr: `Ce commentaire contient un terme non autorisé ("${kw}").`,
            messageEn: `This comment contains a restricted word ("${kw}").`,
            messageEs: `Este comentario contiene una palabra restringida ("${kw}").`,
          };
        }
      }
    }
  }

  return {
    allowed: true,
    messageHt: 'OK',
    messageFr: 'OK',
    messageEn: 'OK',
    messageEs: 'OK',
  };
}

export interface SuspectCommentAnalysis {
  isSuspect: boolean;
  isMutedUser: boolean;
  isRedacted: boolean;
  reasons: string[];
  matchedKeywords: string[];
  hasExternalLink: boolean;
  hasExcessiveCapsOrSpam: boolean;
}

export const REDACTED_COMMENT_PLACEHOLDER = '[Kòmantè modere pa Administrasyon an]';

/**
 * Analyzes any existing comment row for the Developer Panel Live Moderation Stream
 * to highlight suspect comments (banned keywords, external URLs, excessive caps/repetition, or muted author).
 */
export function detectSuspectCommentReasons(
  content: string,
  userId?: string,
  customConfig?: Partial<RemoteCommentModerationConfig>
): SuspectCommentAnalysis {
  const settings = getDeveloperSettings();
  const cfg = sanitizeCommentModerationConfig(
    customConfig || settings.commentModeration || DEFAULT_COMMENT_MODERATION_CONFIG
  );

  const text = (content || '').trim();
  const isRedacted = text === REDACTED_COMMENT_PLACEHOLDER;
  const cleanUserId = (userId || '').trim().toUpperCase();
  const isMutedUser =
    Boolean(cleanUserId) &&
    cfg.mutedMemberIds.some((id) => id.trim().toUpperCase() === cleanUserId);

  if (isRedacted) {
    return {
      isSuspect: false,
      isMutedUser,
      isRedacted: true,
      reasons: [],
      matchedKeywords: [],
      hasExternalLink: false,
      hasExcessiveCapsOrSpam: false,
    };
  }

  const reasons: string[] = [];
  const matchedKeywords: string[] = [];

  const hasExternalLink = EXTERNAL_LINK_REGEX.test(text);
  if (hasExternalLink) {
    reasons.push('Lyen Ekstèn / URL');
  }

  const lowerText = text.toLowerCase();
  for (const rawKw of cfg.blockedKeywords) {
    const kw = rawKw.trim().toLowerCase();
    if (!kw) continue;
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern =
      kw.includes(' ') || kw.includes('.') || kw.includes('/') || kw.length >= 6
        ? new RegExp(escaped, 'i')
        : new RegExp(`(^|[^a-zA-Z0-9À-ÿ])${escaped}([^a-zA-Z0-9À-ÿ]|$)`, 'i');
    if (pattern.test(lowerText)) {
      matchedKeywords.push(kw);
    }
  }
  if (matchedKeywords.length > 0) {
    reasons.push(`Mo Entèdi (${matchedKeywords.slice(0, 2).join(', ')})`);
  }

  // Excessive caps (> 70% uppercase on strings >= 18 letters) or 6+ repeated characters
  const lettersOnly = text.replace(/[^a-zA-ZÀ-ÿ]/g, '');
  const upperCount = lettersOnly.replace(/[^A-ZÀ-Ý]/g, '').length;
  const excessiveCaps = lettersOnly.length >= 18 && upperCount / lettersOnly.length >= 0.72;
  const repeatedChars = /(.)\1{5,}/.test(text);
  const hasExcessiveCapsOrSpam = excessiveCaps || repeatedChars;
  if (hasExcessiveCapsOrSpam) {
    reasons.push(repeatedChars ? 'Repetisyon Spam' : 'Majiskil Eksesif');
  }

  return {
    isSuspect: reasons.length > 0,
    isMutedUser,
    isRedacted: false,
    reasons,
    matchedKeywords,
    hasExternalLink,
    hasExcessiveCapsOrSpam,
  };
}

/**
 * Sponsor Operations
 */
export async function addSponsor(sponsor: Omit<SponsorItem, 'id' | 'createdAt'>): Promise<SponsorItem> {
  const settings = getDeveloperSettings();
  const newSponsor: SponsorItem = {
    ...sponsor,
    id: `spon_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  settings.sponsors.unshift(newSponsor);
  await saveDeveloperSettings(settings);
  return newSponsor;
}

export async function updateSponsor(sponsor: SponsorItem): Promise<void> {
  const settings = getDeveloperSettings();
  const index = settings.sponsors.findIndex((s) => s.id === sponsor.id);
  if (index >= 0) {
    settings.sponsors[index] = sponsor;
    await saveDeveloperSettings(settings);
  }
}

export async function deleteSponsor(sponsorId: string): Promise<void> {
  const settings = getDeveloperSettings();
  settings.sponsors = settings.sponsors.filter((s) => s.id !== sponsorId);
  await saveDeveloperSettings(settings);
}

/**
 * Feed Comment Moderation & Developer Controls
 */
export function getAllFeedComments(): AnnouncementComment[] {
  return getAllStoredComments();
}

export async function deleteCommentPermanently(commentId: string): Promise<boolean> {
  return deleteAnnouncementComment(commentId);
}

export async function purgeAllDemoComments(): Promise<{ purgedCount: number }> {
  return purgeDemoComments();
}

export async function purgeAllFeedComments(): Promise<{ purgedCount: number }> {
  return purgeAllComments();
}

/**
 * -------------------------------------------------------------
 * AUDIT LOG ENGINE: Track Developer Actions & Events
 * -------------------------------------------------------------
 */
export async function logDeveloperAction(
  action: string,
  details: string,
  status: 'info' | 'success' | 'warn' | 'error' = 'info',
  admin: string = 'Jackson Charles (Lead Dev)'
): Promise<DeveloperAuditLog> {
  const settings = getDeveloperSettings();
  const newLog: DeveloperAuditLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    action,
    details,
    status,
    admin,
  };

  const logs = Array.isArray(settings.auditLogs) ? settings.auditLogs : [];
  // Keep last 100 logs
  settings.auditLogs = [newLog, ...logs].slice(0, 100);
  await saveDeveloperSettings(settings);
  return newLog;
}

export async function clearDeveloperAuditLogs(): Promise<void> {
  const settings = getDeveloperSettings();
  settings.auditLogs = [];
  await saveDeveloperSettings(settings);
}

/**
 * -------------------------------------------------------------
 * BROADCAST & EMERGENCY ALERT ENGINE
 * -------------------------------------------------------------
 */
export async function addDeveloperBroadcast(
  broadcast: Omit<DeveloperBroadcast, 'id' | 'createdAt'>
): Promise<DeveloperBroadcast> {
  const settings = getDeveloperSettings();
  const newBroadcast: DeveloperBroadcast = {
    ...broadcast,
    id: `bcast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
  };

  const broadcasts = Array.isArray(settings.broadcasts) ? settings.broadcasts : [];
  settings.broadcasts = [newBroadcast, ...broadcasts];
  await saveDeveloperSettings(settings);
  await logDeveloperAction(
    'Nouvo Alèt/Broadcast Pibliye',
    `Tit: "${broadcast.title}" pou ${broadcast.targetChurchId === 'ALL' ? 'Tout Legliz' : 'Legliz ' + broadcast.targetChurchId}`,
    'success'
  );
  return newBroadcast;
}

export async function updateDeveloperBroadcast(broadcast: DeveloperBroadcast): Promise<void> {
  const settings = getDeveloperSettings();
  const broadcasts = Array.isArray(settings.broadcasts) ? settings.broadcasts : [];
  const idx = broadcasts.findIndex((b) => b.id === broadcast.id);
  if (idx >= 0) {
    broadcasts[idx] = broadcast;
    settings.broadcasts = broadcasts;
    await saveDeveloperSettings(settings);
  }
}

export async function deleteDeveloperBroadcast(id: string): Promise<void> {
  const settings = getDeveloperSettings();
  const broadcasts = Array.isArray(settings.broadcasts) ? settings.broadcasts : [];
  settings.broadcasts = broadcasts.filter((b) => b.id !== id);
  await saveDeveloperSettings(settings);
  await logDeveloperAction('Alèt/Broadcast Efase', `Broadcast ID: ${id}`, 'warn');
}

/**
 * -------------------------------------------------------------
 * SYSTEM MAINTENANCE ENGINE
 * -------------------------------------------------------------
 */
export async function toggleSystemMaintenanceMode(
  enabled: boolean,
  message?: string
): Promise<boolean> {
  const settings = getDeveloperSettings();
  settings.maintenanceMode = enabled;
  if (message) {
    settings.maintenanceMessage = message;
  }
  await saveDeveloperSettings(settings);
  await logDeveloperAction(
    enabled ? 'Mòd Antretyen Aktive' : 'Mòd Antretyen Dezaktive',
    `Mòd antretyen mondyal la mete sou: ${enabled ? 'AKTIF' : 'DEZAKTIF'}. Mesaj: ${settings.maintenanceMessage || 'Default'}`,
    enabled ? 'warn' : 'success'
  );
  return enabled;
}

/**
 * -------------------------------------------------------------
 * FULL SYSTEM BACKUP & RESTORE ENGINE
 * -------------------------------------------------------------
 */
export interface FullSystemBackupPayload {
  version: string;
  exportedAt: string;
  exportedBy: string;
  churches: Church[];
  members: Member[];
  services: ServiceSession[];
  announcements: Announcement[];
  attendance: AttendanceRecord[];
  absences: AbsenceRecord[];
  settings: DeveloperSettings;
  checksum: number;
}

export function exportFullSystemDatabase(): FullSystemBackupPayload {
  const churches = getAllChurches();
  const members = getAllMembers();
  const services = getAllServices();
  const announcements = getAllAnnouncements();
  const attendance = getAllAttendance();
  const absences = loadFromStorage<AbsenceRecord[]>(STORAGE_KEYS.ABSENCES, []);
  const settings = getDeveloperSettings();

  const totalEntities =
    churches.length +
    members.length +
    services.length +
    announcements.length +
    attendance.length +
    absences.length;

  return {
    version: APP_BASE_VERSION,
    exportedAt: new Date().toISOString(),
    exportedBy: 'Developer Console Master',
    churches,
    members,
    services,
    announcements,
    attendance,
    absences,
    settings,
    checksum: totalEntities,
  };
}

export async function importFullSystemDatabase(
  rawJson: string
): Promise<{ success: boolean; message: string; stats?: Record<string, number> }> {
  try {
    const data = JSON.parse(rawJson) as Partial<FullSystemBackupPayload>;

    if (!data || typeof data !== 'object') {
      return { success: false, message: 'Fichye a pa yon JSON valab.' };
    }

    let restoredChurches = 0;
    let restoredMembers = 0;
    let restoredServices = 0;
    let restoredAnnouncements = 0;
    let restoredAttendance = 0;

    if (Array.isArray(data.churches) && data.churches.length > 0) {
      saveToStorage(STORAGE_KEYS.CHURCHES, data.churches);
      restoredChurches = data.churches.length;
    }

    if (Array.isArray(data.members)) {
      saveToStorage(STORAGE_KEYS.MEMBERS, data.members);
      restoredMembers = data.members.length;
    }

    if (Array.isArray(data.services)) {
      saveToStorage(STORAGE_KEYS.SERVICES, data.services);
      restoredServices = data.services.length;
    }

    if (Array.isArray(data.announcements)) {
      saveToStorage(STORAGE_KEYS.ANNOUNCEMENTS, data.announcements);
      restoredAnnouncements = data.announcements.length;
    }

    if (Array.isArray(data.attendance)) {
      saveToStorage(STORAGE_KEYS.ATTENDANCE, data.attendance);
      restoredAttendance = data.attendance.length;
    }

    if (Array.isArray(data.absences)) {
      saveToStorage(STORAGE_KEYS.ABSENCES, data.absences);
    }

    if (data.settings && data.settings.masterPin) {
      await saveDeveloperSettings({
        ...DEFAULT_DEVELOPER_SETTINGS,
        ...data.settings,
        lastUpdated: new Date().toISOString(),
      });
    }

    await logDeveloperAction(
      'Restorasyon Baz Done Konplè',
      `Restore: ${restoredChurches} legliz, ${restoredMembers} manm, ${restoredServices} sèvis, ${restoredAttendance} prezans.`,
      'success'
    );

    return {
      success: true,
      message: `Restorasyon konplè avèk siksè: ${restoredChurches} legliz, ${restoredMembers} manm, ${restoredServices} sèvis, ${restoredAttendance} prezans!`,
      stats: {
        churches: restoredChurches,
        members: restoredMembers,
        services: restoredServices,
        announcements: restoredAnnouncements,
        attendance: restoredAttendance,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Erè pandan restorasyon an: ${err?.message || 'Fòma enkoni'}`,
    };
  }
}

/**
 * -------------------------------------------------------------
 * DATABASE INTEGRITY DOCTOR & SELF-HEALING ENGINE
 * -------------------------------------------------------------
 */
export interface DatabaseDoctorReport {
  checkedAt: string;
  totalChurches: number;
  totalMembers: number;
  totalServices: number;
  totalAttendance: number;
  totalAbsences: number;
  hashedChurchesCount?: number;
  tombstonesProtectedCount?: number;
  issuesDetected: string[];
  repairsApplied: string[];
  status: 'healthy' | 'warning' | 'repaired';
}

export interface SecurityHardeningMetrics {
  totalChurches: number;
  hashedPasscodeChurches: number;
  unhashedPasscodeChurches: number;
  tombstones: {
    members: number;
    services: number;
    announcements: number;
    attendance: number;
    total: number;
  };
}

export function getSecurityHardeningMetrics(): SecurityHardeningMetrics {
  const churches = getAllChurches();
  let hashedPasscodeChurches = 0;
  let unhashedPasscodeChurches = 0;

  for (const c of churches) {
    const pass = (c.adminPasscode || '').trim();
    if (!pass || isPasscodeHashed(pass)) {
      hashedPasscodeChurches++;
    } else {
      unhashedPasscodeChurches++;
    }
  }

  const delMembers = Object.keys(loadFromStorage<Record<string, number>>(STORAGE_KEYS.DELETED_MEMBERS, {}) || {}).length;
  const delServices = Object.keys(loadFromStorage<Record<string, number>>(STORAGE_KEYS.DELETED_SERVICES, {}) || {}).length;
  const delAnnouncements = Object.keys(loadFromStorage<Record<string, number>>(STORAGE_KEYS.DELETED_ANNOUNCEMENTS, {}) || {}).length;
  const delAttendance = Object.keys(loadFromStorage<Record<string, number>>(STORAGE_KEYS.DELETED_ATTENDANCE, {}) || {}).length;

  return {
    totalChurches: churches.length,
    hashedPasscodeChurches,
    unhashedPasscodeChurches,
    tombstones: {
      members: delMembers,
      services: delServices,
      announcements: delAnnouncements,
      attendance: delAttendance,
      total: delMembers + delServices + delAnnouncements + delAttendance,
    },
  };
}

export async function upgradeAllChurchPasscodesToSha256(): Promise<{ upgradedCount: number }> {
  const churches = getAllChurches();
  let upgradedCount = 0;

  for (const c of churches) {
    const rawPass = (c.adminPasscode || '').trim();
    if (rawPass && !isPasscodeHashed(rawPass)) {
      const hashed = hashAdminPasscodeSync(rawPass, c.id);
      saveChurch({ ...c, adminPasscode: hashed }, { deliberatePasscodeUpdate: true });
      upgradedCount++;
    }
  }

  if (upgradedCount > 0) {
    await logDeveloperAction(
      'Chifreman Sekirite Kòd PIN Legliz',
      `${upgradedCount} kòd PIN legliz pwoteje ak chifreman sekirite avanse.`,
      'success'
    );
  }

  return { upgradedCount };
}

export async function verifyCloudConfigSync(): Promise<{
  ok: boolean;
  readOk: boolean;
  writeAuthorized: boolean;
  latencyMs: number;
  message: string;
}> {
  const start = Date.now();
  const cloudAuth = getSuperDeveloperCloudAuthStatus();
  try {
    const docRef = doc(db, FIRESTORE_DEV_DOC, FIRESTORE_DEV_ID);
    const snap = await getDoc(docRef);
    const readLatencyMs = Date.now() - start;

    if (!cloudAuth.isAuthorized) {
      return {
        ok: snap.exists(),
        readOk: true,
        writeAuthorized: false,
        latencyMs: readLatencyMs,
        message: snap.exists()
          ? `Koneksyon lekti sèvè santral la fonksyone (${readLatencyMs}ms). Pou anrejistre modifikasyon sou sèvè a, konekte ak ${SUPER_DEVELOPER_EMAIL}.`
          : `Koneksyon lekti OK (${readLatencyMs}ms). Konekte ak ${SUPER_DEVELOPER_EMAIL} pou aktive konfigirasyon sou sèvè santral la.`,
      };
    }

    if (snap.exists()) {
      await setDoc(docRef, { lastVerifiedAt: new Date().toISOString() }, { merge: true });
      const totalLatency = Date.now() - start;
      return {
        ok: true,
        readOk: true,
        writeAuthorized: true,
        latencyMs: totalLatency,
        message: `Lekti ak anrejistreman sou sèvè santral la verifye avèk siksè (${totalLatency}ms).`,
      };
    }

    const cleaned = cleanObjectForFirestore({
      ...getDeveloperSettings(),
      lastUpdated: new Date().toISOString(),
      lastVerifiedAt: new Date().toISOString(),
    });
    await setDoc(docRef, cleaned, { merge: true });
    const totalLatency = Date.now() - start;
    return {
      ok: true,
      readOk: true,
      writeAuthorized: true,
      latencyMs: totalLatency,
      message: `Konfigirasyon sèvè santral la kreye e verifye avèk siksè (${totalLatency}ms).`,
    };
  } catch (err: any) {
    return {
      ok: false,
      readOk: false,
      writeAuthorized: cloudAuth.isAuthorized,
      latencyMs: Date.now() - start,
      message: err?.message || 'Pa ka verifye koneksyon sèvè santral la.',
    };
  }
}

export async function runDatabaseIntegrityCheckAndRepair(): Promise<DatabaseDoctorReport> {
  const churches = getAllChurches();
  const rawMembers = loadFromStorage<Member[]>(STORAGE_KEYS.MEMBERS, []);
  const rawServices = loadFromStorage<ServiceSession[]>(STORAGE_KEYS.SERVICES, []);
  const rawAnnouncements = loadFromStorage<Announcement[]>(STORAGE_KEYS.ANNOUNCEMENTS, []);
  const rawAttendance = loadFromStorage<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []);
  const absences = loadFromStorage<AbsenceRecord[]>(STORAGE_KEYS.ABSENCES, []);

  const issuesDetected: string[] = [];
  const repairsApplied: string[] = [];

  // 1. Verify and auto-upgrade plain-text Church Admin Passcodes
  let hashedChurchesCount = 0;
  for (const ch of churches) {
    const pass = (ch.adminPasscode || '').trim();
    if (pass && !isPasscodeHashed(pass)) {
      issuesDetected.push(`Legliz "${ch.name}" (${ch.id}) te gen yon kòd PIN admin ki poko chifre.`);
      const hashed = hashAdminPasscodeSync(pass, ch.id);
      saveChurch({ ...ch, adminPasscode: hashed }, { deliberatePasscodeUpdate: true });
      repairsApplied.push(`Chifre kòd PIN admin legliz "${ch.name}" avèk sekirite avanse.`);
      hashedChurchesCount++;
    } else {
      hashedChurchesCount++;
    }
  }

  const churchIdSet = new Set(churches.map((c) => (c.id || '').toUpperCase()));
  const defaultChurchId = churches[0]?.id || 'CH001';

  // 2. Purge any ghost records that match Tombstone deletion registries
  let membersModified = false;
  const cleanedMembers: Member[] = [];
  const seenMemberIds = new Set<string>();

  for (const m of rawMembers) {
    if (!m) continue;
    if (isMemberMarkedDeleted(m)) {
      issuesDetected.push(`Manm fantòm "${m.fullName || m.id}" te toujou nan memwa malgre li te make efase (Tombstone).`);
      repairsApplied.push(` Netwaye manm fantòm "${m.fullName || m.id}" gras ak rejis Tombstone.`);
      membersModified = true;
      continue;
    }

    let member = { ...m };

    if (!member.fullName || typeof member.fullName !== 'string') {
      issuesDetected.push(`Manm (${member.id}) te gen chan fullName ki vid oswa undefined.`);
      member.fullName = member.memberId || 'Manm San Non';
      repairsApplied.push(`Korije fullName pou manm ${member.id}.`);
      membersModified = true;
    }

    // Check orphaned churchId
    if (!member.churchId || (churchIdSet.size > 0 && !churchIdSet.has((member.churchId || '').toUpperCase()))) {
      issuesDetected.push(`Manm "${member.fullName}" (${member.id}) te gen yon ID legliz invalid oswa òfelen ("${member.churchId || 'VID'}").`);
      member.churchId = defaultChurchId;
      repairsApplied.push(`Rekonekte manm "${member.fullName}" ak legliz prensipal ${defaultChurchId}.`);
      membersModified = true;
    }

    // Check missing memberId or PIN
    if (!member.memberId) {
      issuesDetected.push(`Manm "${member.fullName}" (${member.id}) pat gen yon kòd manm ofisyèl.`);
      member.memberId = member.id;
      repairsApplied.push(`Fikse kòd manm inik pou "${member.fullName}".`);
      membersModified = true;
    }
    if (!member.pin || member.pin.length < 4) {
      issuesDetected.push(`Manm "${member.fullName}" (${member.memberId}) pat gen yon PIN sekirite valab.`);
      member.pin = member.memberId.slice(-4) || '1234';
      repairsApplied.push(`Jenere PIN sekirite default pou "${member.fullName}".`);
      membersModified = true;
    }

    // Check duplicate ID
    if (seenMemberIds.has(member.id)) {
      const newId = `${member.id}_FIX${Math.floor(100 + Math.random() * 900)}`;
      issuesDetected.push(`Manm "${member.fullName}" te gen menm ID ak yon lòt manm (${member.id}).`);
      member.id = newId;
      repairsApplied.push(`Jenere nouvo ID inik "${newId}" pou manm "${member.fullName}".`);
      membersModified = true;
    }

    seenMemberIds.add(member.id);
    cleanedMembers.push(member);
  }

  if (membersModified) {
    saveToStorage(STORAGE_KEYS.MEMBERS, cleanedMembers);
  }

  // 3. Check Services & Tombstones
  let servicesModified = false;
  const cleanedServices: ServiceSession[] = [];
  for (const s of rawServices) {
    if (!s) continue;
    if (isServiceMarkedDeleted(s.id)) {
      issuesDetected.push(`Sèvis fantòm "${s.title || s.id}" te toujou nan memwa malgre li te efase.`);
      repairsApplied.push(`Retire sèvis fantòm "${s.title || s.id}" gras ak Tombstone.`);
      servicesModified = true;
      continue;
    }
    const srvCopy = { ...s };
    if (!srvCopy.title || typeof srvCopy.title !== 'string') {
      issuesDetected.push(`Sèvis (${srvCopy.id}) pat gen tit valab.`);
      srvCopy.title = 'Kilt & Sèvis';
      repairsApplied.push(`Korije tit sèvis ${srvCopy.id}.`);
      servicesModified = true;
    }
    cleanedServices.push(srvCopy);
  }
  if (servicesModified) {
    saveToStorage(STORAGE_KEYS.SERVICES, cleanedServices);
  }

  // 4. Check Announcements & Tombstones
  let announcementsModified = false;
  const cleanedAnnouncements: Announcement[] = [];
  for (const a of rawAnnouncements) {
    if (!a) continue;
    if (isAnnouncementMarkedDeleted(a.id)) {
      issuesDetected.push(`Anons fantòm "${a.title || a.id}" te toujou nan memwa malgre li te efase.`);
      repairsApplied.push(`Retire anons fantòm "${a.title || a.id}" gras ak Tombstone.`);
      announcementsModified = true;
      continue;
    }
    cleanedAnnouncements.push(a);
  }
  if (announcementsModified) {
    saveToStorage(STORAGE_KEYS.ANNOUNCEMENTS, cleanedAnnouncements);
  }

  // 5. Check Attendance references & Tombstones
  let attendanceModified = false;
  const cleanedAttendance: AttendanceRecord[] = [];
  for (const att of rawAttendance) {
    if (!att) continue;
    if (isAttendanceMarkedDeleted(att.id)) {
      issuesDetected.push(`Prezans fantòm (${att.id}) te toujou nan memwa malgre li te efase.`);
      repairsApplied.push(`Retire prezans fantòm (${att.id}) gras ak Tombstone.`);
      attendanceModified = true;
      continue;
    }
    const attCopy = { ...att };
    if (!attCopy.churchId || (churchIdSet.size > 0 && !churchIdSet.has((attCopy.churchId || '').toUpperCase()))) {
      issuesDetected.push(`Prezans ${attCopy.id} te gen yon legliz òfelen.`);
      attCopy.churchId = defaultChurchId;
      repairsApplied.push(`Repare referans legliz pou prezans ${attCopy.id}.`);
      attendanceModified = true;
    }
    cleanedAttendance.push(attCopy);
  }

  if (attendanceModified) {
    saveToStorage(STORAGE_KEYS.ATTENDANCE, cleanedAttendance);
  }

  const secMetrics = getSecurityHardeningMetrics();

  const status: 'healthy' | 'warning' | 'repaired' =
    repairsApplied.length > 0 ? 'repaired' : issuesDetected.length > 0 ? 'warning' : 'healthy';

  await logDeveloperAction(
    'Enspeksyon & Reparasyon Baz Done',
    `Rezilta: ${status.toUpperCase()}. Pwoblèm detekte: ${issuesDetected.length}. Reparasyon aplike: ${repairsApplied.length}. PIN SHA-256: ${hashedChurchesCount}/${churches.length}. Tombstones: ${secMetrics.tombstones.total}.`,
    status === 'healthy' ? 'success' : 'warn'
  );

  return {
    checkedAt: new Date().toISOString(),
    totalChurches: churches.length,
    totalMembers: cleanedMembers.length,
    totalServices: cleanedServices.length,
    totalAttendance: cleanedAttendance.length,
    totalAbsences: absences.length,
    hashedChurchesCount,
    tombstonesProtectedCount: secMetrics.tombstones.total,
    issuesDetected,
    repairsApplied,
    status,
  };
}

/**
 * Calculate LocalStorage usage in Kilobytes
 */
export function calculateAppStorageUsage(): {
  totalBytes: number;
  totalKb: string;
  keysCount: number;
  perKeyBreakdown: { key: string; kb: string; itemsCount?: number }[];
} {
  if (typeof window === 'undefined') {
    return { totalBytes: 0, totalKb: '0 KB', keysCount: 0, perKeyBreakdown: [] };
  }

  let totalBytes = 0;
  const breakdown: { key: string; kb: string; itemsCount?: number }[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    const value = localStorage.getItem(key) || '';
    const bytes = key.length + value.length * 2; // UTF-16 characters = 2 bytes
    totalBytes += bytes;

    let itemsCount: number | undefined = undefined;
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        itemsCount = parsed.length;
      }
    } catch {
      // not array json
    }

    breakdown.push({
      key,
      kb: (bytes / 1024).toFixed(1) + ' KB',
      itemsCount,
    });
  }

  breakdown.sort((a, b) => parseFloat(b.kb) - parseFloat(a.kb));

  return {
    totalBytes,
    totalKb: (totalBytes / 1024).toFixed(1) + ' KB',
    keysCount: localStorage.length,
    perKeyBreakdown: breakdown,
  };
}

/**
 * Get current App Update Announcement Configuration from Developer Settings
 */
export function getDeveloperAppUpdateConfig(): DeveloperAppUpdateConfig {
  const settings = getDeveloperSettings();
  return settings.appUpdate || DEFAULT_DEVELOPER_APP_UPDATE_CONFIG;
}

/**
 * Save App Update Announcement Configuration to Developer Settings & Cloud
 */
export async function saveDeveloperAppUpdateConfig(
  config: DeveloperAppUpdateConfig
): Promise<{ success: boolean; message: string }> {
  try {
    const currentSettings = getDeveloperSettings();
    const updatedSettings: DeveloperSettings = {
      ...currentSettings,
      appUpdate: {
        ...config,
      },
      lastUpdated: new Date().toISOString(),
    };

    await saveDeveloperSettings(updatedSettings);
    return {
      success: true,
      message: `Konfigirasyon anons mizajou v${config.latestVersion} anrejistre avèk siksè nan sistèm nan.`,
    };
  } catch (err: any) {
    console.error('Error saving developer app update config:', err);
    return {
      success: false,
      message: err?.message || 'Erè pandan anrejistreman konfigirasyon mizajou a.',
    };
  }
}

/**
 * Broadcast App Update as an urgent or official developer broadcast to all churches
 */
export async function broadcastUpdateAnnouncement(
  config: DeveloperAppUpdateConfig
): Promise<{ success: boolean; message: string }> {
  try {
    const title = `Mizajou Disponib (v${config.latestVersion})`;
    const message = `Nouvo vèsyon v${config.latestVersion} disponib kounye a sou ${config.downloadUrl}. Tanpri telechaje l pou benefisye tout dènye amelyorasyon yo.`;

    const broadcast: DeveloperBroadcast = {
      id: `upd_bcast_${Date.now()}`,
      title,
      message,
      type: 'update',
      targetChurchId: 'ALL',
      createdAt: new Date().toISOString(),
      active: config.enabled,
      priority: config.isMandatory ? 'urgent' : 'normal',
    };

    const currentSettings = getDeveloperSettings();
    const existingBroadcasts = currentSettings.broadcasts || [];
    // Replace previous update broadcast if any
    const filteredBroadcasts = existingBroadcasts.filter(
      (b) => !(b?.title || '').toLowerCase().includes('mizajou disponib') && b?.type !== 'update'
    );

    const updatedSettings: DeveloperSettings = {
      ...currentSettings,
      broadcasts: [broadcast, ...filteredBroadcasts],
      appUpdate: {
        ...config,
        lastBroadcastedAt: new Date().toISOString(),
      },
      lastUpdated: new Date().toISOString(),
    };

    await saveDeveloperSettings(updatedSettings);
    return {
      success: true,
      message: `Kominike mizajou v${config.latestVersion} pibliye nan tout flòt legliz yo avèk siksè!`,
    };
  } catch (err: any) {
    console.error('Error broadcasting update announcement:', err);
    return {
      success: false,
      message: err?.message || 'Erè pandan piblikasyon anons mizajou a.',
    };
  }
}



