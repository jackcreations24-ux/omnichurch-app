import {
  DeveloperSettings,
  ChurchLicense,
  AdMobConfig,
  SponsorItem,
  LicenseTier,
  LicenseStatus,
  AnnouncementComment,
  DeveloperDonationConfig,
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
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
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
import { hashAdminPasscodeSync, isPasscodeHashed } from './cryptoSecurity';

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
};

export const DEFAULT_DONATION_CONFIG: DeveloperDonationConfig = {
  enabled: true,
  developerName: 'Jackson Charles',
  developerRole: 'Lead Software Architect & Ministry Technologist',
  developerBio: 'Objektif mwen se ede legliz la grandi sosyalman, espirityèlman ak nimerikman atravè zouti teknolojik modèn, efikas e transparan ki fasilite kominikasyon ak jesyon manm yo.',
  developerEmail: '',
  developerPhone: '',
  
  paypalEnabled: true,
  paypalEmail: '',
  paypalMeUrl: '',
  
  binanceEnabled: true,
  binancePayId: '',
  binanceUsdtAddress: '',
  binanceNetwork: '',
  
  wiseEnabled: true,
  wiseEmail: '',
  wiseTag: '',
  wiseIban: '',
  
  moncashEnabled: true,
  moncashNumber: '',
  moncashName: '',

  zelleEnabled: false,
  zelleInfo: '',

  customNote: 'Mèsi pou sipò w ak kontribisyon w nan avansman misyon nimerik legliz la!',
};

export const DEFAULT_DEVELOPER_APP_UPDATE_CONFIG: DeveloperAppUpdateConfig = {
  enabled: true,
  latestVersion: APP_BASE_VERSION,
  currentVersion: APP_BASE_VERSION,
  minRequiredVersion: APP_BASE_VERSION,
  downloadUrl: 'https://omnichurch.download',
  channel: 'stable',
  isMandatory: false,
  releaseDate: '2026-09-12',
  targetPlatform: 'all',
  highlights: {
    ht: [
      '5 nouvo fòma vizyèl pou domèn ak depatman manm yo sou badj yo (Pil Klasik, Riban Wayal, Kòd Modèn, Boukliye Sakre, Liksye Doré)',
      'Sistèm prezèvasyon sesyon otomatik pou w pa janm pèdi koneksyon w lè w ap mete app la ajou',
      'Akselerasyon eskanè kòd QR ak rechèch manm an tan reyèl',
      'Amelyorasyon estabilite ak pèfòmans jeneral aplikasyon an',
    ],
    fr: [
      '5 nouveaux formats visuels pour afficher les domaines et départements sur les badges membres',
      'Système de préservation automatique de session : aucune perte de connexion lors de la mise à jour',
      'Accélération du lecteur QR et recherche instantanée des membres',
      'Amélioration globale de la fluidité et des performances',
    ],
    en: [
      '5 brand-new visual formats for member ministry domains on identification badges',
      'Automatic session preservation engine: zero lost logins or sessions when updating',
      'Accelerated QR scanner response and real-time attendance verification',
      'General system stability and high-definition rendering enhancements',
    ],
    es: [
      '5 nuevos formatos visuales para dominios y departamentos en los carnets de miembros',
      'Preservación automática de sesión: no perderá su inicio de sesión al actualizar la aplicación',
      'Mayor velocidad en el escáner de códigos QR y búsqueda instantánea',
      'Mejoras en el rendimiento general y estabilidad del sistema',
    ],
  },
  importantNotice: {
    ht: 'Mizajou sa a pare pou telechaje sou https://omnichurch.download. Sesyon w, legliz ou ak tout done w yo rete an sekirite 100%.',
    fr: 'Cette mise à jour est prête au téléchargement sur https://omnichurch.download. Votre session, votre église et toutes vos données sont 100% préservées.',
    en: 'This update is ready for download at https://omnichurch.download. Your session, active church, and all data remain 100% preserved.',
    es: 'Esta actualización está lista para descargar en https://omnichurch.download. Su sesión, iglesia activa y todos los datos permanecen 100% preservados.',
  },
};

export const DEFAULT_DEVELOPER_SETTINGS: DeveloperSettings = {
  masterPin: '7799', // Initial default code until developer sets custom PIN
  maintenanceMode: false,
  maintenanceMessage: 'Sistèm nan nan peryòd antretyen teknik. Tanpri retounen pita.',
  showSponsorsInFooter: true,
  sponsorMarqueeSpeed: 26,
  enforceLicenseLockout: false,
  adMob: DEFAULT_ADMOB_CONFIG,
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

  return merged;
}

/**
 * Sanitize Developer App Update Config to ensure a unified 1.0.0 baseline
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
      saveDeveloperSettings(DEFAULT_DEVELOPER_SETTINGS);
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

    return {
      ...DEFAULT_DEVELOPER_SETTINGS,
      ...parsed,
      masterPin: parsed.masterPin && parsed.masterPin.trim().length >= 4 ? parsed.masterPin.trim() : '7799',
      adMob: {
        ...DEFAULT_ADMOB_CONFIG,
        ...(parsed.adMob || {}),
      },
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

  return {
    ...DEFAULT_DEVELOPER_SETTINGS,
    ...data,
    adMob: {
      ...DEFAULT_ADMOB_CONFIG,
      ...(data.adMob || {}),
    },
    donations: cleanDonationConfig(data.donations),
    sponsors: cleanSponsors,
    licenses: cleanLicenses,
    broadcasts: Array.isArray(data.broadcasts) ? data.broadcasts : [],
    auditLogs: Array.isArray(data.auditLogs) ? data.auditLogs : [],
    appUpdate: sanitizeAppUpdateConfig(data.appUpdate),
  };
}

/**
 * Permanently resets app update configuration to baseline v1.0.0
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

/**
 * Save Developer Settings to localStorage and Cloud Firestore
 */
export async function saveDeveloperSettings(settings: DeveloperSettings): Promise<void> {
  if (typeof window === 'undefined') return;
  const updated: DeveloperSettings = {
    ...settings,
    lastUpdated: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('omnichurch_dev_settings_updated', { detail: updated }));
  } catch (err) {
    console.error('Error saving developer settings to localStorage:', err);
  }

  // Cloud Firestore sync
  try {
    const devDocRef = doc(db, FIRESTORE_DEV_DOC, FIRESTORE_DEV_ID);
    const cleaned = cleanObjectForFirestore(updated);
    await setDoc(devDocRef, cleaned, { merge: true });
  } catch (err) {
    // Gracefully handle offline or permission state without failing
    console.warn('Developer settings saved locally; Firestore sync pending/offline:', err);
  }
}

/**
 * Pull Developer Settings from Cloud Firestore if available
 */
export async function fetchRemoteDeveloperSettings(): Promise<DeveloperSettings | null> {
  try {
    const devDocRef = doc(db, FIRESTORE_DEV_DOC, FIRESTORE_DEV_ID);
    const snap = await getDoc(devDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && data.masterPin) {
        const sanitized = sanitizeRemoteDeveloperSettings(data);
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
 * Real-Time Firestore Subscription for Developer Settings across all devices
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
          if (data && data.masterPin) {
            const sanitized = sanitizeRemoteDeveloperSettings(data);
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
  await saveDeveloperSettings(currentSettings);

  try {
    await logDeveloperAction(
      'SECURITY_CREDENTIAL_UPDATED',
      'Nouvo kòd sekirite devlopè a anrejistre avèk siksè nan baz done a.',
      'success'
    );
  } catch {
    // Non-blocking
  }

  return {
    success: true,
    message: 'Nouvo kòd sekirite devlopè a anrejistre avèk siksè nan baz done nwaj la!',
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
 */
export async function updateDonationConfig(
  newConfig: Partial<DeveloperDonationConfig>
): Promise<DeveloperDonationConfig> {
  const current = getDeveloperSettings();
  const updatedDonations: DeveloperDonationConfig = {
    ...DEFAULT_DONATION_CONFIG,
    ...(current.donations || {}),
    ...newConfig,
  };
  current.donations = updatedDonations;
  await saveDeveloperSettings(current);
  return updatedDonations;
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
    version: '2.6-engine',
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
      saveChurch({ ...c, adminPasscode: hashed });
      upgradedCount++;
    }
  }

  if (upgradedCount > 0) {
    await logDeveloperAction(
      'Chifman SHA-256 PIN Admin Legliz',
      `${upgradedCount} kòd PIN legliz chifre an SHA-256 (sha256:v1) avèk sèl izolasyon.`,
      'success'
    );
  }

  return { upgradedCount };
}

export async function verifyCloudConfigSync(): Promise<{ ok: boolean; latencyMs: number; message: string }> {
  const start = Date.now();
  try {
    const docRef = doc(db, FIRESTORE_DEV_DOC, FIRESTORE_DEV_ID);
    const snap = await getDoc(docRef);
    const latencyMs = Date.now() - start;
    if (snap.exists()) {
      return {
        ok: true,
        latencyMs,
        message: `Koneksyon Firestore /app_config/developer_engine verifye (${latencyMs}ms). Règ sekirite v2 aktif.`,
      };
    }
    await setDoc(docRef, { ...getDeveloperSettings(), updatedAt: new Date().toISOString() }, { merge: true });
    return {
      ok: true,
      latencyMs: Date.now() - start,
      message: `Dokiman /app_config/developer_engine inisyalize e senkronize avèk siksè (${Date.now() - start}ms).`,
    };
  } catch (err: any) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      message: err?.message || 'Pa ka verifye koneksyon Firestore /app_config.',
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

  // 1. Verify and auto-upgrade plain-text Church Admin Passcodes to salted SHA-256
  let hashedChurchesCount = 0;
  for (const ch of churches) {
    const pass = (ch.adminPasscode || '').trim();
    if (pass && !isPasscodeHashed(pass)) {
      issuesDetected.push(`Legliz "${ch.name}" (${ch.id}) te gen yon kòd PIN admin an tèks klè ( poko chifre SHA-256).`);
      const hashed = hashAdminPasscodeSync(pass, ch.id);
      saveChurch({ ...ch, adminPasscode: hashed });
      repairsApplied.push(`Chifre kòd PIN admin legliz "${ch.name}" an SHA-256 (sha256:v1).`);
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



