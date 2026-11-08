import { Language } from '../types';
import {
  getSavedActiveChurchId,
  getSavedActiveRole,
  getSavedActiveMemberId,
  getSavedLanguage,
  saveToStorage,
  loadFromStorage,
} from '../utils/storage';
import {
  getDeveloperSettings,
  DEFAULT_DEVELOPER_APP_UPDATE_CONFIG,
} from '../utils/developerStorage';
import { APP_BASE_VERSION } from '../version';

export interface AppVersionInfo {
  currentVersion: string;
  latestVersion: string;
  minRequiredVersion?: string;
  downloadUrl: string;
  hasUpdate: boolean;
  releaseDate: string;
  highlights: Record<Language, string[]>;
  importantNotice: Record<Language, string>;
  isMandatory?: boolean;
  channel?: string;
}

export const CURRENT_APP_VERSION = APP_BASE_VERSION;
export const LATEST_APP_VERSION = APP_BASE_VERSION;
export const OFFICIAL_UPDATE_DOWNLOAD_URL = 'https://omnichurch.download';

export const USER_INSTALLED_VERSION_KEY = 'omnichurch_installed_client_version_v1';
export const UPDATE_DISMISSED_RECORD_KEY = 'omnichurch_update_dismissed_record_v2';
export const UPDATE_PROMPTED_SESSION_KEY = 'omnichurch_update_prompted_session_v1';
export const SESSION_BACKUP_STORAGE_KEY = 'omnichurch_session_preservation_backup_v1';

// Cooldown between non-mandatory update prompts: 3 days (WhatsApp standard frequency cap)
export const DISMISSAL_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;

export interface SessionBackupData {
  activeChurchId: string;
  userRole: string;
  activeMemberId: string;
  language: Language;
  timestamp: number;
}

export interface UpdateDismissalRecord {
  version: string;
  dismissedAt: number;
}

export interface UpdatePromptDecision {
  shouldPrompt: boolean;
  reason:
    | 'no_update'
    | 'already_latest'
    | 'dismissed_in_cooldown'
    | 'already_prompted_this_session'
    | 'mandatory'
    | 'prompt_allowed';
  info: AppVersionInfo;
}

/**
 * Returns the client version installed on this specific user's device.
 * Defaults to the built-in current release version ('2.5.0').
 */
export function getUserInstalledVersion(): string {
  try {
    const saved = localStorage.getItem(USER_INSTALLED_VERSION_KEY);
    if (saved && saved.trim()) {
      const clean = saved.trim();
      // Auto-migrate legacy 2.x versions to clean 1.0.0 baseline
      if (clean === '2.5.0' || clean === '2.4.0' || clean === '2.0.0') {
        localStorage.setItem(USER_INSTALLED_VERSION_KEY, APP_BASE_VERSION);
        return APP_BASE_VERSION;
      }
      return clean;
    }
  } catch (err) {
    // fallback
  }
  return CURRENT_APP_VERSION;
}

/**
 * Sets the user's installed version (e.g. after updating or testing).
 */
export function setUserInstalledVersion(version: string): void {
  try {
    localStorage.setItem(USER_INSTALLED_VERSION_KEY, version.trim());
    notifyAppUpdateChanged();
  } catch (err) {
    console.error('Error setting user installed version', err);
  }
}

/**
 * Global update event bus so that when an update is detected or modified,
 * the entire system is aware in real-time.
 */
type UpdateListener = (info: AppVersionInfo) => void;
const updateListeners: Set<UpdateListener> = new Set();

export function subscribeToAppUpdates(listener: UpdateListener): () => void {
  updateListeners.add(listener);
  return () => {
    updateListeners.delete(listener);
  };
}

function notifyUpdateListeners(info: AppVersionInfo): void {
  updateListeners.forEach((listener) => {
    try {
      listener(info);
    } catch (e) {
      console.error('Error in app update listener', e);
    }
  });
}

export function notifyAppUpdateChanged(): void {
  const info = getAppVersionInfo();
  notifyUpdateListeners(info);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('omnichurch_app_update_changed', {
        detail: info,
      })
    );
  }
}

/**
 * Returns complete release details and checks if latestVersion > clientVersion.
 * Note: If the user's client is already at or above latestVersion, hasUpdate is FALSE.
 */
export function getAppVersionInfo(): AppVersionInfo {
  let devConfig = DEFAULT_DEVELOPER_APP_UPDATE_CONFIG;
  try {
    const devSettings = getDeveloperSettings();
    if (devSettings && devSettings.appUpdate) {
      devConfig = devSettings.appUpdate;
    }
  } catch (err) {
    // fallback
  }

  const latestVersion = (devConfig.latestVersion || LATEST_APP_VERSION).trim();
  const rawMinReq = (devConfig.minRequiredVersion || APP_BASE_VERSION).trim();
  const minRequiredVersion = rawMinReq === '2.0.0' ? APP_BASE_VERSION : rawMinReq;
  
  // Real client installed version
  const currentVersion = getUserInstalledVersion();

  const isEnabled = devConfig.enabled !== false;
  // Strict SemVer comparison: hasUpdate is true ONLY if latestVersion > currentVersion
  const hasUpdate = isEnabled && isVersionNewer(latestVersion, currentVersion);

  // Mandatory if configured by developer OR if currentVersion is below minRequiredVersion (WhatsApp obsolete APK rule)
  const isMandatory =
    Boolean(devConfig.isMandatory) ||
    isVersionNewer(minRequiredVersion, currentVersion);

  return {
    currentVersion,
    latestVersion,
    minRequiredVersion,
    downloadUrl: devConfig.downloadUrl || OFFICIAL_UPDATE_DOWNLOAD_URL,
    hasUpdate,
    releaseDate: devConfig.releaseDate || '2026-09-12',
    highlights: devConfig.highlights || DEFAULT_DEVELOPER_APP_UPDATE_CONFIG.highlights,
    importantNotice: devConfig.importantNotice || DEFAULT_DEVELOPER_APP_UPDATE_CONFIG.importantNotice,
    isMandatory,
    channel: devConfig.channel || 'stable',
  };
}

/**
 * Compare two semver-like strings (e.g. "2.5.0" vs "2.4.0")
 */
export function isVersionNewer(latest: string, current: string): boolean {
  if (!latest || !current) return false;
  const parse = (v: string) =>
    v
      .replace(/^[vV]/, '')
      .split('.')
      .map((part) => {
        const n = parseInt(part, 10);
        return isNaN(n) ? 0 : n;
      });

  const [lMaj = 0, lMin = 0, lPatch = 0] = parse(latest);
  const [cMaj = 0, cMin = 0, cPatch = 0] = parse(current);

  if (lMaj > cMaj) return true;
  if (lMaj < cMaj) return false;
  if (lMin > cMin) return true;
  if (lMin < cMin) return false;
  return lPatch > cPatch;
}

/**
 * Evaluates whether an update modal should be shown to the user.
 * WhatsApp & Top-tier Company Rules:
 * 1. If user is already on latestVersion or higher -> NEVER prompt (reason: 'already_latest').
 * 2. If update is mandatory -> ALWAYS prompt (reason: 'mandatory').
 * 3. If user already dismissed it within the cooldown period (3 days) -> DO NOT prompt (reason: 'dismissed_in_cooldown').
 * 4. If user was already prompted during this session -> DO NOT prompt again (reason: 'already_prompted_this_session').
 */
export function evaluateUpdatePrompt(options?: { ignoreCooldown?: boolean }): UpdatePromptDecision {
  const info = getAppVersionInfo();

  if (!info.hasUpdate) {
    return { shouldPrompt: false, reason: 'already_latest', info };
  }

  if (info.isMandatory) {
    return { shouldPrompt: true, reason: 'mandatory', info };
  }

  if (options?.ignoreCooldown) {
    return { shouldPrompt: true, reason: 'prompt_allowed', info };
  }

  // Session-level frequency cap
  try {
    const promptedThisSession = sessionStorage.getItem(UPDATE_PROMPTED_SESSION_KEY);
    if (promptedThisSession === 'true') {
      return { shouldPrompt: false, reason: 'already_prompted_this_session', info };
    }
  } catch (e) {
    // ignore
  }

  // Cooldown check
  try {
    const raw = localStorage.getItem(UPDATE_DISMISSED_RECORD_KEY);
    if (raw) {
      const record: UpdateDismissalRecord = JSON.parse(raw);
      if (record && record.version === info.latestVersion) {
        const elapsed = Date.now() - (Number(record.dismissedAt) || 0);
        if (elapsed < DISMISSAL_COOLDOWN_MS) {
          return { shouldPrompt: false, reason: 'dismissed_in_cooldown', info };
        }
      }
    }
  } catch (e) {
    // ignore
  }

  return { shouldPrompt: true, reason: 'prompt_allowed', info };
}

/**
 * Determines if update alert modal should open
 */
export function shouldPromptUpdateModal(options?: { ignoreCooldown?: boolean }): boolean {
  return evaluateUpdatePrompt(options).shouldPrompt;
}

/**
 * Check if the user has dismissed this update within the cooldown period
 */
export function isUpdateDismissed(): boolean {
  const decision = evaluateUpdatePrompt();
  return decision.reason === 'dismissed_in_cooldown' || decision.reason === 'already_prompted_this_session';
}

/**
 * Record that the modal was prompted during this active browser session
 */
export function recordUpdatePromptedThisSession(): void {
  try {
    sessionStorage.setItem(UPDATE_PROMPTED_SESSION_KEY, 'true');
  } catch (e) {
    // ignore
  }
}

/**
 * Dismiss the current update notification (user clicked close / later)
 * Starts the 3-day cooldown timer for this version so they are not disturbed.
 */
export function dismissCurrentUpdate(version?: string): void {
  try {
    const info = getAppVersionInfo();
    const versionToDismiss = version || info.latestVersion;
    const record: UpdateDismissalRecord = {
      version: versionToDismiss,
      dismissedAt: Date.now(),
    };
    localStorage.setItem(UPDATE_DISMISSED_RECORD_KEY, JSON.stringify(record));
    sessionStorage.setItem(UPDATE_PROMPTED_SESSION_KEY, 'true');
  } catch (err) {
    console.error('Error dismissing update', err);
  }
}

/**
 * Reset dismissed flag so modal can be shown again if requested by developer
 */
export function resetDismissedUpdate(): void {
  try {
    localStorage.removeItem(UPDATE_DISMISSED_RECORD_KEY);
    sessionStorage.removeItem(UPDATE_PROMPTED_SESSION_KEY);
  } catch (err) {
    console.error('Error resetting update dismissal', err);
  }
}

/**
 * Marks the client as successfully updated to the new version
 */
export function markAppAsUpdated(newVersion?: string): void {
  const version = newVersion || getAppVersionInfo().latestVersion;
  setUserInstalledVersion(version);
  resetDismissedUpdate();
  notifyAppUpdateChanged();
}

/**
 * Securely preserve the user session before updating or redirecting to download.
 * Ensures activeChurchId, activeRole, activeMemberId, and language are persistently
 * stored in multiple redundant storages so the user NEVER loses their session.
 */
export function preserveSessionBeforeUpdate(): SessionBackupData {
  const sessionData: SessionBackupData = {
    activeChurchId: getSavedActiveChurchId(),
    userRole: getSavedActiveRole(),
    activeMemberId: getSavedActiveMemberId(),
    language: getSavedLanguage(),
    timestamp: Date.now(),
  };

  saveToStorage(SESSION_BACKUP_STORAGE_KEY, sessionData);

  // Extra safety in sessionStorage as fallback
  try {
    sessionStorage.setItem(SESSION_BACKUP_STORAGE_KEY, JSON.stringify(sessionData));
  } catch (e) {
    // Ignore if disabled
  }

  return sessionData;
}

/**
 * Verify and restore session integrity if needed after an update or reload
 */
export function verifyAndRestoreSessionIntegrity(): void {
  const backup = loadFromStorage<SessionBackupData | null>(SESSION_BACKUP_STORAGE_KEY, null);
  if (!backup) return;

  const currentChurchId = getSavedActiveChurchId();
  if (!currentChurchId && backup.activeChurchId) {
    localStorage.setItem('app_legiz_active_church_id_v1', backup.activeChurchId);
  }

  const currentRole = getSavedActiveRole();
  if (!currentRole && backup.userRole) {
    localStorage.setItem('app_legiz_active_role_v1', backup.userRole);
  }

  const currentMember = getSavedActiveMemberId();
  if (!currentMember && backup.activeMemberId) {
    localStorage.setItem('app_legiz_active_member_id_v1', backup.activeMemberId);
  }
}

/**
 * Safely trigger update download:
 * 1. Backs up session state so the user NEVER loses their session.
 * 2. Opens https://omnichurch.download in a new tab.
 */
export function executeAppUpdateDownload(): void {
  preserveSessionBeforeUpdate();
  if (typeof window !== 'undefined') {
    window.open(OFFICIAL_UPDATE_DOWNLOAD_URL, '_blank', 'noopener,noreferrer');
  }
}
