import QRCode from "qrcode";
import {
  Church,
  Member,
  ServiceSession,
  Announcement,
  AttendanceRecord,
  AbsenceRecord,
  AnnouncementComment,
  AnnouncementInteractionData,
  UserRole,
  Language,
  ServiceCategory,
} from "../types";
import {
  INITIAL_CHURCHES,
  INITIAL_MEMBERS,
  INITIAL_SERVICES,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_ATTENDANCE,
} from "../data/initialData";
import {
  hashAdminPasscode,
  hashAdminPasscodeSync,
  verifyAdminPasscode,
  isPasscodeHashed,
  isSuperDeveloperEmail,
} from "./cryptoSecurity";
import {
  enqueueAttendance,
  triggerOfflineSync,
} from "./offlineQueue";
import {
  isLegacyDemoMember,
  isLegacyDemoService,
  isLegacyDemoAnnouncement,
  isLegacyDemoAttendance,
  isAccidentalTestChurch,
  firestoreSaveChurch,
  firestoreCreateChurchStrict,
  firestoreSetChurchAdminVerification,
  firestoreAddMember,
  firestoreBatchAddOrUpdateMembers,
  firestoreUpdateMember,
  firestoreUpdateMemberProfilePhoto,
  firestoreDeleteMember,
  firestoreBatchDeleteMembers,
  firestoreAddService,
  firestoreUpdateService,
  firestoreDeleteService,
  firestoreAddAnnouncement,
  firestoreUpdateAnnouncement,
  firestoreDeleteAnnouncement,
  firestoreAddAttendance,
  firestoreDeleteAttendance,
  firestoreBatchDeleteAttendance,
  firestoreDeleteChurch,
  firestoreResetAllDatabase,
  firestorePurgeTestChurches,
  resolveTimestampMs,
  registerLocalChurchLookup,
  firestoreSyncAdminUserProfilePhoto,
} from "../services/firestoreService";

import {
  isVisitorMember,
  isVisitorRole,
  isVisitorAttendanceRecord,
  isServiceCurrentlyActive,
  isServiceBeforeStart,
} from "./permissions";
import {
  resolveSafeMigrationDocId,
  MemberImportStrategy,
  ParsedMigrationMember,
} from "./memberMigration";
import {
  resolveInitialLanguageSync,
  isSupportedLanguage,
} from "./languageDetection";

export interface ScanResult {
  success: boolean;
  duplicate?: boolean;
  deniedTenant?: boolean;
  verifiedInFirestore?: boolean;
  record?: AttendanceRecord;
  member?: Member;
  service?: ServiceSession;
  scannedAt?: string;
  isOfflineSaved?: boolean;
  isVisitor?: boolean;
  homeChurchId?: string;
  homeChurchName?: string;
  errorMessage?: string;
}

export interface EnrichedStoredComment extends AnnouncementComment {
  announcementId: string;
  announcementTitle: string;
  churchId: string;
  churchName: string;
}

export interface ServiceHistoryMemberStat {
  memberId: string;
  memberDbId: string;
  fullName: string;
  phone?: string;
  department?: string;
  gender?: "male" | "female";
  status: "on_time" | "late" | "absent" | "excused";
  checkInTime?: string;
  checkInMethod?: "qr_scan" | "barcode" | "manual";
  lateMinutes?: number;
  excuseReason?: string;
  isVisitor?: boolean;
  homeChurchId?: string;
  homeChurchName?: string;
}

export const STORAGE_KEYS = {
  CHURCHES: "app_legiz_churches_v1",
  MEMBERS: "app_legiz_members_v1",
  SERVICES: "app_legiz_services_v1",
  ANNOUNCEMENTS: "app_legiz_announcements_v1",
  ANNOUNCEMENT_INTERACTIONS: "app_legiz_announcement_interactions_v1",
  ATTENDANCE: "app_legiz_attendance_v1",
  ABSENCES: "app_legiz_absences_v1",
  PENDING_ATTENDANCE: "app_legiz_pending_attendance_v1",
  ACTIVE_CHURCH_ID: "app_legiz_active_church_id_v1",
  ACTIVE_ROLE: "app_legiz_active_role_v1",
  ACTIVE_MEMBER_ID: "app_legiz_active_member_id_v1",
  LANGUAGE: "omnichurch_lang_v1",
  LANGUAGE_CHOSEN: "omnichurch_lang_chosen_v1",
  THEME_MODE: "app_legiz_theme_mode_v1",
  DELETED_MEMBERS: "app_legiz_deleted_members_v1",
  DELETED_SERVICES: "app_legiz_deleted_services_v1",
  DELETED_ANNOUNCEMENTS: "app_legiz_deleted_announcements_v1",
  DELETED_ATTENDANCE: "app_legiz_deleted_attendance_v1",
  DELETED_CHURCHES: "app_legiz_deleted_churches_v1",
  PENDING_LOCAL_UPLOADS: "omnichurch_pending_local_uploads_v1",
  PASSCODE_LOCK: "omnichurch_passcode_lock_v1"
};

export type PendingUploadEntityType = "church" | "member" | "service" | "announcement" | "attendance";

export function markPendingLocalUpload(entityType: PendingUploadEntityType, id: string) {
  const cleanId = (id || "").trim();
  if (!cleanId) return;
  const store = loadFromStorage<Record<string, Record<string, number>>>(STORAGE_KEYS.PENDING_LOCAL_UPLOADS, {});
  const bucket = store[entityType] || {};
  bucket[cleanId] = Date.now();
  store[entityType] = bucket;
  saveToStorage(STORAGE_KEYS.PENDING_LOCAL_UPLOADS, store);
}

export function clearPendingLocalUpload(entityType: PendingUploadEntityType, id: string) {
  const cleanId = (id || "").trim();
  if (!cleanId) return;
  const store = loadFromStorage<Record<string, Record<string, number>>>(STORAGE_KEYS.PENDING_LOCAL_UPLOADS, {});
  const bucket = store[entityType];
  if (!bucket || !bucket[cleanId]) return;
  delete bucket[cleanId];
  store[entityType] = bucket;
  saveToStorage(STORAGE_KEYS.PENDING_LOCAL_UPLOADS, store);
}

export function hasPendingLocalUpload(
  entityType: PendingUploadEntityType,
  id: string,
  maxAgeMs: number = 15 * 60 * 1000
): boolean {
  const cleanId = (id || "").trim();
  if (!cleanId) return false;
  const store = loadFromStorage<Record<string, Record<string, number>>>(STORAGE_KEYS.PENDING_LOCAL_UPLOADS, {});
  const ts = store?.[entityType]?.[cleanId];
  if (typeof ts !== "number") return false;
  if (Date.now() - ts > maxAgeMs) {
    // Expired stale marker so dead drafts do not resurrect deleted server documents indefinitely
    delete store[entityType][cleanId];
    saveToStorage(STORAGE_KEYS.PENDING_LOCAL_UPLOADS, store);
    return false;
  }
  return true;
}

export interface SnapshotSyncMeta {
  fromCache?: boolean;
  hasPendingWrites?: boolean;
  removedIds?: string[];
}

export function reconcileServerSnapshotWithLocal<T extends { id: string }>(params: {
  remoteItems: T[];
  localItems: T[];
  meta?: SnapshotSyncMeta;
  isMarkedDeleted: (item: T) => boolean;
  markDeleted: (item: T) => void;
  isDemo: (item: T) => boolean;
  isPendingUpload: (id: string) => boolean;
  mergeItem?: (remote: T, local?: T) => T;
}): {
  merged: T[];
  pendingToUpload: T[];
  removedIdsProcessed: string[];
} {
  const hasPendingWrites = Boolean(params.meta?.hasPendingWrites);
  const fromCache = params.meta?.fromCache ?? true;
  const isAuthoritativeServerSnapshot = Boolean(params.meta && !fromCache && !hasPendingWrites);
  const removedIdsProcessed: string[] = [];

  if (!hasPendingWrites && Array.isArray(params.meta?.removedIds) && params.meta!.removedIds!.length > 0) {
    for (const rid of params.meta!.removedIds!) {
      if (rid && !params.isPendingUpload(rid)) {
        params.markDeleted({ id: rid } as T);
        removedIdsProcessed.push(rid);
      }
    }
  }

  const localById = new Map<string, T>();
  for (const l of params.localItems) {
    if (l && l.id) localById.set(l.id, l);
  }

  const merged: T[] = [];
  const pendingToUpload: T[] = [];
  const seenIds = new Set<string>();

  for (const remote of params.remoteItems) {
    if (!remote || !remote.id || params.isDemo(remote) || params.isMarkedDeleted(remote)) continue;
    if (seenIds.has(remote.id)) continue;
    seenIds.add(remote.id);
    const localMatch = localById.get(remote.id);
    merged.push(params.mergeItem ? params.mergeItem(remote, localMatch) : remote);
  }

  for (const localItem of params.localItems) {
    if (!localItem || !localItem.id || seenIds.has(localItem.id)) continue;
    if (params.isDemo(localItem) || params.isMarkedDeleted(localItem)) continue;

    if (params.isPendingUpload(localItem.id)) {
      seenIds.add(localItem.id);
      merged.push(localItem);
      pendingToUpload.push(localItem);
    } else if (isAuthoritativeServerSnapshot) {
      // Server returned an authoritative snapshot without this item -> deleted remotely (Mobile or another Web session)
      params.markDeleted(localItem);
      removedIdsProcessed.push(localItem.id);
    } else {
      // Cache/offline snapshot while waiting for server confirmation: keep visible locally without force-uploading
      seenIds.add(localItem.id);
      merged.push(localItem);
    }
  }

  return { merged, pendingToUpload, removedIdsProcessed };
}

export function markChurchAsDeleted(churchId: string) {
  if (!churchId || !churchId.trim()) return;
  const deleted = loadFromStorage(STORAGE_KEYS.DELETED_CHURCHES, {});
  deleted[churchId.trim()] = Date.now();
  saveToStorage(STORAGE_KEYS.DELETED_CHURCHES, deleted);
  clearPendingLocalUpload("church", churchId);
}
export function unmarkChurchAsDeleted(churchId: string) {
  if (!churchId || !churchId.trim()) return;
  const deleted = loadFromStorage(STORAGE_KEYS.DELETED_CHURCHES, {});
  if (deleted[churchId.trim()]) {
    delete deleted[churchId.trim()];
    saveToStorage(STORAGE_KEYS.DELETED_CHURCHES, deleted);
  }
}
export function isChurchMarkedDeleted(churchId: string) {
  if (!churchId) return false;
  const deleted = loadFromStorage(STORAGE_KEYS.DELETED_CHURCHES, {});
  return !!(deleted && deleted[churchId.trim()]);
}

export function markMemberAsDeleted(identifiers) {
  const deleted = loadFromStorage(STORAGE_KEYS.DELETED_MEMBERS, {});
  const now2 = Date.now();
  if (identifiers.id && identifiers.id.trim()) {
    deleted[identifiers.id.trim()] = now2;
    clearPendingLocalUpload("member", identifiers.id);
  }
  if (identifiers.memberId && identifiers.memberId.trim()) {
    deleted[identifiers.memberId.trim().toUpperCase()] = now2;
  }
  if (identifiers.barcodeToken && identifiers.barcodeToken.trim()) {
    deleted[identifiers.barcodeToken.trim()] = now2;
  }
  saveToStorage(STORAGE_KEYS.DELETED_MEMBERS, deleted);
}
export function unmarkMemberAsDeleted(identifiers) {
  const deleted = loadFromStorage(STORAGE_KEYS.DELETED_MEMBERS, {});
  let changed = false;
  if (identifiers.id && deleted[identifiers.id.trim()]) {
    delete deleted[identifiers.id.trim()];
    changed = true;
  }
  if (identifiers.memberId && deleted[identifiers.memberId.trim().toUpperCase()]) {
    delete deleted[identifiers.memberId.trim().toUpperCase()];
    changed = true;
  }
  if (identifiers.barcodeToken && deleted[identifiers.barcodeToken.trim()]) {
    delete deleted[identifiers.barcodeToken.trim()];
    changed = true;
  }
  if (changed) {
    saveToStorage(STORAGE_KEYS.DELETED_MEMBERS, deleted);
  }
}
export function isMemberMarkedDeleted(member) {
  if (!member) return false;
  const deleted = loadFromStorage(STORAGE_KEYS.DELETED_MEMBERS, {});
  if (!deleted || Object.keys(deleted).length === 0) return false;
  if (typeof member === "string") {
    const clean = member.trim();
    return !!(deleted[clean] || deleted[clean.toUpperCase()]);
  }
  if (member.id && deleted[member.id.trim()]) return true;
  if (member.memberId && deleted[member.memberId.trim().toUpperCase()]) return true;
  if (member.barcodeToken && deleted[member.barcodeToken.trim()]) return true;
  return false;
}
export function markServiceAsDeleted(serviceId) {
  if (!serviceId || !serviceId.trim()) return;
  const deleted = loadFromStorage(STORAGE_KEYS.DELETED_SERVICES, {});
  deleted[serviceId.trim()] = Date.now();
  saveToStorage(STORAGE_KEYS.DELETED_SERVICES, deleted);
  clearPendingLocalUpload("service", serviceId);
}
export function isServiceMarkedDeleted(serviceId) {
  if (!serviceId) return false;
  const deleted = loadFromStorage(STORAGE_KEYS.DELETED_SERVICES, {});
  return !!(deleted && deleted[serviceId.trim()]);
}
export function markAttendanceAsDeleted(attendanceId) {
  if (!attendanceId || !attendanceId.trim()) return;
  const deleted = loadFromStorage(STORAGE_KEYS.DELETED_ATTENDANCE, {});
  deleted[attendanceId.trim()] = Date.now();
  saveToStorage(STORAGE_KEYS.DELETED_ATTENDANCE, deleted);
  clearPendingLocalUpload("attendance", attendanceId);
}
export function isAttendanceMarkedDeleted(attendanceId) {
  if (!attendanceId) return false;
  const deleted = loadFromStorage(STORAGE_KEYS.DELETED_ATTENDANCE, {});
  return !!(deleted && deleted[attendanceId.trim()]);
}
export function markAnnouncementAsDeleted(announcementId) {
  if (!announcementId || !announcementId.trim()) return;
  const deleted = loadFromStorage(STORAGE_KEYS.DELETED_ANNOUNCEMENTS, {});
  deleted[announcementId.trim()] = Date.now();
  saveToStorage(STORAGE_KEYS.DELETED_ANNOUNCEMENTS, deleted);
  clearPendingLocalUpload("announcement", announcementId);
}
export function isAnnouncementMarkedDeleted(announcementId) {
  if (!announcementId) return false;
  const deleted = loadFromStorage(STORAGE_KEYS.DELETED_ANNOUNCEMENTS, {});
  return !!(deleted && deleted[announcementId.trim()]);
}
export function loadFromStorage<T = any>(key: string, fallback?: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item);
  } catch (err) {
    console.warn(`Error loading key ${key} from localStorage`, err);
    return fallback;
  }
}
export function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Error saving key ${key} to localStorage`, err);
  }
}
export function cleanLocalStorageLegacyDemoData() {
  try {
    const churches = getAllChurches();
    const churchIdMap = /* @__PURE__ */ new Map();
    churches.forEach((c3) => {
      if (c3.id) churchIdMap.set(c3.id.trim().toUpperCase(), c3.id);
      if (c3.code) churchIdMap.set(c3.code.trim().toUpperCase(), c3.id);
    });
    const allMembers = loadFromStorage(STORAGE_KEYS.MEMBERS, []);
    let membersChanged = false;
    const cleanMembers = [];
    const seenMemberIds = new Set<string>();
    for (const m2 of allMembers) {
      if (!m2 || isLegacyDemoMember(m2)) {
        membersChanged = true;
        continue;
      }
      const resolvedMemberId =
        typeof m2.id === "string" && m2.id.trim()
          ? m2.id.trim()
          : typeof m2.memberId === "string" && m2.memberId.trim()
          ? m2.memberId.trim()
          : "";
      if (!resolvedMemberId || seenMemberIds.has(resolvedMemberId)) {
        membersChanged = true;
        continue;
      }
      seenMemberIds.add(resolvedMemberId);
      if (resolvedMemberId !== m2.id) {
        membersChanged = true;
      }
      let mChurchId = (m2.churchId || "").trim();
      if (!mChurchId && m2.memberId && m2.memberId.includes("-")) {
        const prefix = m2.memberId.split("-")[0].trim().toUpperCase();
        if (churchIdMap.has(prefix)) {
          mChurchId = churchIdMap.get(prefix);
          membersChanged = true;
        }
      }
      if (mChurchId && churchIdMap.has(mChurchId.toUpperCase())) {
        const canonical = churchIdMap.get(mChurchId.toUpperCase());
        if (canonical !== mChurchId) {
          mChurchId = canonical;
          membersChanged = true;
        }
      }
      let barcodeToken = m2.barcodeToken || `CHURCH:${mChurchId}|MEMBER:${m2.memberId}`;
      if (!barcodeToken.includes("CHURCH:") && mChurchId && m2.memberId) {
        barcodeToken = `CHURCH:${mChurchId}|MEMBER:${m2.memberId}`;
        membersChanged = true;
      }
      cleanMembers.push({
        ...m2,
        id: resolvedMemberId,
        churchId: mChurchId,
        barcodeToken
      });
    }
    if (membersChanged || cleanMembers.length !== allMembers.length) {
      saveToStorage(STORAGE_KEYS.MEMBERS, cleanMembers);
    }
    const allServices = loadFromStorage(STORAGE_KEYS.SERVICES, []);
    let servicesChanged = false;
    const cleanServices = [];
    const seenServiceIds = new Set<string>();
    for (const s3 of allServices) {
      if (!s3 || isLegacyDemoService(s3)) {
        servicesChanged = true;
        continue;
      }
      const resolvedServiceId =
        typeof s3.id === "string" && s3.id.trim()
          ? s3.id.trim()
          : typeof (s3 as any).serviceId === "string" && (s3 as any).serviceId.trim()
          ? (s3 as any).serviceId.trim()
          : "";
      if (!resolvedServiceId || seenServiceIds.has(resolvedServiceId)) {
        servicesChanged = true;
        continue;
      }
      seenServiceIds.add(resolvedServiceId);
      if (resolvedServiceId !== s3.id) {
        servicesChanged = true;
      }
      let sChurchId = (s3.churchId || "").trim();
      if (sChurchId && churchIdMap.has(sChurchId.toUpperCase())) {
        const canonical = churchIdMap.get(sChurchId.toUpperCase());
        if (canonical !== sChurchId) {
          sChurchId = canonical;
          servicesChanged = true;
        }
      }
      cleanServices.push({ ...s3, id: resolvedServiceId, churchId: sChurchId });
    }
    if (servicesChanged || cleanServices.length !== allServices.length) {
      saveToStorage(STORAGE_KEYS.SERVICES, cleanServices);
    }
    const allAnnouncements = loadFromStorage(STORAGE_KEYS.ANNOUNCEMENTS, []);
    let annChanged = false;
    const cleanAnnouncements = [];
    for (const a2 of allAnnouncements) {
      if (!a2 || isLegacyDemoAnnouncement(a2)) {
        annChanged = true;
        continue;
      }
      if (typeof a2.id !== "string" || !a2.id.trim()) {
        annChanged = true;
        continue;
      }
      let aChurchId = (a2.churchId || "").trim();
      if (aChurchId && churchIdMap.has(aChurchId.toUpperCase())) {
        const canonical = churchIdMap.get(aChurchId.toUpperCase());
        if (canonical !== aChurchId) {
          aChurchId = canonical;
          annChanged = true;
        }
      }
      cleanAnnouncements.push({ ...a2, id: a2.id.trim(), churchId: aChurchId });
    }
    const dedupedAnn = deduplicateAnnouncements(cleanAnnouncements);
    if (annChanged || dedupedAnn.length !== allAnnouncements.length) {
      saveToStorage(STORAGE_KEYS.ANNOUNCEMENTS, dedupedAnn);
    }
    const allAttendance = loadFromStorage(STORAGE_KEYS.ATTENDANCE, []);
    let attChanged = false;
    const cleanAttendance = [];
    const seenAttendanceIds = new Set<string>();
    for (const att of allAttendance) {
      if (!att || isLegacyDemoAttendance(att)) {
        attChanged = true;
        continue;
      }
      if (typeof att.id !== "string" || !att.id.trim() || seenAttendanceIds.has(att.id.trim())) {
        attChanged = true;
        continue;
      }
      const cleanAttId = att.id.trim();
      seenAttendanceIds.add(cleanAttId);
      let attChurchId = (att.churchId || "").trim();
      if (attChurchId && churchIdMap.has(attChurchId.toUpperCase())) {
        const canonical = churchIdMap.get(attChurchId.toUpperCase());
        if (canonical !== attChurchId) {
          attChurchId = canonical;
          attChanged = true;
        }
      }
      cleanAttendance.push({ ...att, id: cleanAttId, churchId: attChurchId });
    }
    if (attChanged || cleanAttendance.length !== allAttendance.length) {
      saveToStorage(STORAGE_KEYS.ATTENDANCE, cleanAttendance);
    }
    const allPending = loadFromStorage(STORAGE_KEYS.PENDING_ATTENDANCE, []);
    const cleanPending = allPending.filter((att) => !isLegacyDemoAttendance(att));
    if (cleanPending.length !== allPending.length) {
      saveToStorage(STORAGE_KEYS.PENDING_ATTENDANCE, cleanPending);
    }
  } catch (err) {
    console.warn("Error cleaning demo records from storage:", err);
  }
}
const CHURCH_MODEL_MIGRATION_KEY = "omnichurch_churches_migrated_active_model_v2";

export function upgradeChurchToCurrentModel(
  rawChurch: Church,
  forceActivateLegacy: boolean = false
): { church: Church; migrated: boolean } {
  if (!rawChurch || typeof rawChurch.id !== "string" || !rawChurch.id.trim()) {
    return { church: rawChurch, migrated: false };
  }
  const cleanId = rawChurch.id.trim();
  const cleanCode = (rawChurch.code || "").trim().toUpperCase() || cleanId.toUpperCase();
  const cleanName = (rawChurch.name || "").trim() || cleanId;
  const cleanPastor = (rawChurch.pastor || "").trim();
  const cleanAddress = (rawChurch.address || "").trim();
  const cleanCity = (rawChurch.city || "").trim() || "Ayiti";
  const cleanPhone = (rawChurch.phone || "").trim();
  const cleanAdminEmail = (rawChurch.adminGoogleEmail || "").trim().toLowerCase() || undefined;
  const cleanAdminUid = (rawChurch.adminGoogleUid || "").trim() || undefined;
  const cleanEmail = (rawChurch.email || "").trim() || cleanAdminEmail || "";
  const cleanMotto = (rawChurch.motto || "").trim() || "Nan sèvis Bondye ak renmen";
  const cleanThemeColor = (rawChurch.themeColor || "").trim() || "indigo";
  const cleanLogoIcon = (rawChurch.logoIcon || "").trim() || "Church";
  const cleanCreatedAt =
    (rawChurch.createdAt || "").trim() || new Date().toISOString().split("T")[0];
  const rncVal = (rawChurch.rnc || rawChurch.rncNumber || "").trim() || undefined;

  const cleanPass = (rawChurch.adminPasscode || "").trim();
  const hashedPasscode = cleanPass
    ? isPasscodeHashed(cleanPass)
      ? cleanPass
      : hashAdminPasscodeSync(cleanPass, cleanId)
    : undefined;

  const resolvedAuthMethod: Church["adminAuthMethod"] =
    rawChurch.adminAuthMethod ||
    (cleanAdminEmail && cleanAdminUid
      ? "email_password"
      : cleanAdminEmail
      ? "google"
      : "legacy_pin");

  const resolvedDonationInfo = rawChurch.donationInfo || { enabled: false };

  // Unless explicitly archived with an archivedAt timestamp (and not force-migrating),
  // ensure the church uses the active current model.
  const isExplicitlyArchived =
    !forceActivateLegacy &&
    rawChurch.status === "archived" &&
    Boolean(rawChurch.archivedAt);

  const resolvedStatus: Church["status"] = isExplicitlyArchived
    ? "archived"
    : forceActivateLegacy
    ? "active"
    : rawChurch.status || (rawChurch.isLegacy ? undefined : "active");

  const resolvedIsLegacy = forceActivateLegacy ? false : Boolean(rawChurch.isLegacy);

  const resolvedLogoUrl =
    typeof rawChurch.logoUrl === "string" && rawChurch.logoUrl.trim()
      ? rawChurch.logoUrl.trim()
      : undefined;
  const resolvedAdminGooglePhoto =
    rawChurch.adminGooglePhoto === null
      ? ""
      : typeof rawChurch.adminGooglePhoto === "string"
      ? rawChurch.adminGooglePhoto.trim()
      : undefined;

  const upgraded: Church = {
    ...rawChurch,
    id: cleanId,
    code: cleanCode,
    name: cleanName,
    pastor: cleanPastor,
    address: cleanAddress,
    city: cleanCity,
    phone: cleanPhone,
    email: cleanEmail,
    motto: cleanMotto,
    themeColor: cleanThemeColor,
    logoIcon: cleanLogoIcon,
    logoUrl: resolvedLogoUrl,
    createdAt: cleanCreatedAt,
    rnc: rncVal,
    rncNumber: rncVal,
    adminGoogleEmail: cleanAdminEmail,
    adminGoogleUid: cleanAdminUid,
    adminGooglePhoto: resolvedAdminGooglePhoto,
    adminAuthMethod: resolvedAuthMethod,
    adminPasscode: hashedPasscode,
    donationInfo: resolvedDonationInfo,
    status: resolvedStatus,
    isLegacy: resolvedIsLegacy,
    archivedAt: isExplicitlyArchived ? rawChurch.archivedAt : undefined,
  };

  const migrated =
    upgraded.code !== rawChurch.code ||
    upgraded.city !== rawChurch.city ||
    upgraded.motto !== rawChurch.motto ||
    upgraded.themeColor !== rawChurch.themeColor ||
    upgraded.logoIcon !== rawChurch.logoIcon ||
    upgraded.createdAt !== rawChurch.createdAt ||
    upgraded.adminAuthMethod !== rawChurch.adminAuthMethod ||
    upgraded.adminPasscode !== rawChurch.adminPasscode ||
    upgraded.status !== rawChurch.status ||
    Boolean(upgraded.isLegacy) !== Boolean(rawChurch.isLegacy) ||
    !rawChurch.donationInfo;

  return { church: upgraded, migrated };
}

export function migrateAllChurchesToActiveCurrentModel(): number {
  const stored = loadFromStorage<Church[]>(STORAGE_KEYS.CHURCHES, INITIAL_CHURCHES);
  if (!Array.isArray(stored) || stored.length === 0) return 0;
  let migratedCount = 0;
  const upgradedList: Church[] = [];
  const seen = new Set<string>();

  for (const c3 of stored) {
    if (!c3 || typeof c3.id !== "string" || !c3.id.trim()) continue;
    const cleanId = c3.id.trim();
    if (seen.has(cleanId)) continue;
    seen.add(cleanId);

    const { church: upgraded, migrated } = upgradeChurchToCurrentModel(c3, true);
    if (migrated || c3.status !== "active" || c3.isLegacy) {
      migratedCount++;
      firestoreSaveChurch(upgraded).catch(() => {});
    }
    upgradedList.push(upgraded);
  }

  if (migratedCount > 0) {
    saveToStorage(STORAGE_KEYS.CHURCHES, upgradedList);
  }
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(CHURCH_MODEL_MIGRATION_KEY, "1");
    }
  } catch {
    // ignore
  }
  return migratedCount;
}

if (typeof window !== "undefined") {
  cleanLocalStorageLegacyDemoData();
  try {
    if (localStorage.getItem(CHURCH_MODEL_MIGRATION_KEY) !== "1") {
      migrateAllChurchesToActiveCurrentModel();
    }
  } catch {
    // ignore
  }
}

export function getAllChurches() {
  const stored = loadFromStorage(STORAGE_KEYS.CHURCHES, INITIAL_CHURCHES);
  if (!Array.isArray(stored)) return [];
  const seen = new Set<string>();
  let anyMigrated = false;
  const result: Church[] = [];

  for (const c3 of stored) {
    if (!c3 || typeof c3.id !== "string" || !c3.id.trim()) continue;
    const cleanId = c3.id.trim();
    if (isChurchMarkedDeleted(cleanId) || isAccidentalTestChurch(c3)) {
      anyMigrated = true;
      continue;
    }
    if (seen.has(cleanId)) continue;
    seen.add(cleanId);
    const { church: upgraded, migrated } = upgradeChurchToCurrentModel(c3, false);
    if (migrated) anyMigrated = true;
    result.push(upgraded);
  }

  if (anyMigrated) {
    saveToStorage(STORAGE_KEYS.CHURCHES, result);
  }
  return result;
}
export function getAllMembers() {
  const seen = new Set<string>();
  return loadFromStorage(STORAGE_KEYS.MEMBERS, []).filter((m2) => {
    if (!m2 || typeof m2.id !== "string" || !m2.id.trim()) return false;
    if (isLegacyDemoMember(m2) || isMemberMarkedDeleted(m2)) return false;
    if (seen.has(m2.id)) return false;
    seen.add(m2.id);
    return true;
  });
}
export function getAllServices() {
  const seen = new Set<string>();
  return loadFromStorage(STORAGE_KEYS.SERVICES, []).filter((s3) => {
    if (!s3 || typeof s3.id !== "string" || !s3.id.trim()) return false;
    if (isLegacyDemoService(s3) || isServiceMarkedDeleted(s3.id)) return false;
    if (seen.has(s3.id)) return false;
    seen.add(s3.id);
    return true;
  });
}
export function getAllAnnouncements() {
  const seen = new Set<string>();
  return loadFromStorage(STORAGE_KEYS.ANNOUNCEMENTS, []).filter((a2) => {
    if (!a2 || typeof a2.id !== "string" || !a2.id.trim()) return false;
    if (isLegacyDemoAnnouncement(a2) || isAnnouncementMarkedDeleted(a2.id)) return false;
    if (seen.has(a2.id)) return false;
    seen.add(a2.id);
    return true;
  });
}
export function getAllAttendance() {
  const seen = new Set<string>();
  return loadFromStorage(STORAGE_KEYS.ATTENDANCE, []).filter((a2) => {
    if (!a2 || typeof a2.id !== "string" || !a2.id.trim()) return false;
    if (isLegacyDemoAttendance(a2) || isAttendanceMarkedDeleted(a2.id)) return false;
    if (seen.has(a2.id)) return false;
    seen.add(a2.id);
    return true;
  });
}
export function getChurchById(churchId) {
  if (!churchId) return void 0;
  const clean = churchId.trim().toUpperCase();
  const churches = getAllChurches();
  return churches.find(
    (c3) => c3.id.toUpperCase() === clean || c3.code && c3.code.toUpperCase() === clean
  );
}
registerLocalChurchLookup((churchIdOrCode) => getChurchById(churchIdOrCode));
interface PasscodeLockEntry {
  passcode: string;
  updatedAtIso: string;
  updatedAtMs: number;
  confirmedByRemote: boolean;
}

function getPasscodeLockMap(): Record<string, PasscodeLockEntry> {
  return loadFromStorage<Record<string, PasscodeLockEntry>>(STORAGE_KEYS.PASSCODE_LOCK, {}) || {};
}

function savePasscodeLockMap(map: Record<string, PasscodeLockEntry>): void {
  saveToStorage(STORAGE_KEYS.PASSCODE_LOCK, map);
}

export function recordDeliberatePasscodeUpdate(churchId: string, passcode: string): string {
  const cleanChurchId = (churchId || "").trim();
  const nowIso = new Date().toISOString();
  if (!cleanChurchId) return nowIso;
  const map = getPasscodeLockMap();
  map[cleanChurchId] = {
    passcode: (passcode || "").trim(),
    updatedAtIso: nowIso,
    updatedAtMs: Date.now(),
    confirmedByRemote: false,
  };
  savePasscodeLockMap(map);
  return nowIso;
}

export function reconcileRemoteChurchWithLocalPasscode(
  remoteChurch: Church,
  localChurch?: Church
): { church: Church; needsFirestoreReconcile: boolean } {
  if (!remoteChurch || !remoteChurch.id) {
    return { church: remoteChurch, needsFirestoreReconcile: false };
  }
  const { church: normalizedRemote } = upgradeChurchToCurrentModel(remoteChurch, true);
  remoteChurch = normalizedRemote;

  // Preserve pending local admin ownership upgrade fields (UID / email / authMethod)
  // so an incoming stale Firestore snapshot never wipes out an in-flight Email+Password or Google link.
  let ownershipPreservedChurch = remoteChurch;
  let needsOwnershipReconcile = false;
  if (localChurch && localChurch.id === remoteChurch.id) {
    const localUid = (localChurch.adminGoogleUid || "").trim();
    const localEmail = (localChurch.adminGoogleEmail || "").trim().toLowerCase();
    const remoteUid = (remoteChurch.adminGoogleUid || "").trim();
    const remoteEmail = (remoteChurch.adminGoogleEmail || "").trim().toLowerCase();
    const isPendingChurchUpload = hasPendingLocalUpload("church", remoteChurch.id);
    const remoteIsUnclaimed = !remoteUid && !remoteEmail;
    const localHasOwnership = Boolean(localUid || localEmail);
    const sameEmailMissingOrStaleUid =
      Boolean(localUid) &&
      localUid !== remoteUid &&
      Boolean(localEmail) &&
      (!remoteEmail || remoteEmail === localEmail);

    if (
      localHasOwnership &&
      (remoteIsUnclaimed || (isPendingChurchUpload && (sameEmailMissingOrStaleUid || !remoteEmail)))
    ) {
      ownershipPreservedChurch = {
        ...remoteChurch,
        adminGoogleUid: localUid || remoteChurch.adminGoogleUid,
        adminGoogleEmail: localEmail || remoteChurch.adminGoogleEmail,
        adminGoogleName: localChurch.adminGoogleName || remoteChurch.adminGoogleName,
        adminGooglePhoto:
          localChurch.adminGooglePhoto !== undefined
            ? localChurch.adminGooglePhoto
            : remoteChurch.adminGooglePhoto,
        adminAuthMethod: localChurch.adminAuthMethod || remoteChurch.adminAuthMethod,
      };
      needsOwnershipReconcile = true;
    }

    // Also preserve pending local media edits (adminGooglePhoto, logoUrl, signatureUrl) even when ownership already matches
    if (isPendingChurchUpload) {
      const adminPhotoDiffers = localChurch.adminGooglePhoto !== ownershipPreservedChurch.adminGooglePhoto;
      const logoUrlDiffers = localChurch.logoUrl !== ownershipPreservedChurch.logoUrl;
      const signatureDiffers = localChurch.signatureUrl !== ownershipPreservedChurch.signatureUrl;
      if (adminPhotoDiffers || logoUrlDiffers || signatureDiffers) {
        ownershipPreservedChurch = {
          ...ownershipPreservedChurch,
          ...(adminPhotoDiffers ? { adminGooglePhoto: localChurch.adminGooglePhoto } : {}),
          ...(logoUrlDiffers ? { logoUrl: localChurch.logoUrl } : {}),
          ...(signatureDiffers ? { signatureUrl: localChurch.signatureUrl } : {}),
          updatedAt: localChurch.updatedAt || ownershipPreservedChurch.updatedAt,
        };
        needsOwnershipReconcile = true;
      }
    }
  }
  remoteChurch = ownershipPreservedChurch;

  const map = getPasscodeLockMap();
  const lock = map[remoteChurch.id];
  const remotePass = (remoteChurch.adminPasscode || "").trim();
  const localPass = (localChurch?.adminPasscode || "").trim();

  // 1. If we have an explicit deliberate local update that hasn't been confirmed by Firestore yet:
  if (lock && !lock.confirmedByRemote) {
    if (remotePass === lock.passcode) {
      // Remote caught up to our deliberate local change
      map[remoteChurch.id] = { ...lock, confirmedByRemote: true };
      savePasscodeLockMap(map);
      return { church: remoteChurch, needsFirestoreReconcile: needsOwnershipReconcile };
    }
    // Check if remote has a strictly newer deliberate timestamp (> 2s newer)
    const remoteTs = remoteChurch.adminPasscodeUpdatedAt ? Date.parse(remoteChurch.adminPasscodeUpdatedAt) : 0;
    if (!Number.isNaN(remoteTs) && remoteTs > lock.updatedAtMs + 2000 && remotePass) {
      map[remoteChurch.id] = {
        passcode: remotePass,
        updatedAtIso: remoteChurch.adminPasscodeUpdatedAt || new Date().toISOString(),
        updatedAtMs: remoteTs,
        confirmedByRemote: true,
      };
      savePasscodeLockMap(map);
      return { church: remoteChurch, needsFirestoreReconcile: needsOwnershipReconcile };
    }
    // Otherwise, local version takes strict precedence and we should reconcile Firestore
    return {
      church: {
        ...remoteChurch,
        adminPasscode: lock.passcode || undefined,
        adminPasscodeUpdatedAt: lock.updatedAtIso,
      },
      needsFirestoreReconcile: true,
    };
  }

  // 2. Even if confirmed (or no lock entry), never let an empty/stale remote passcode overwrite a valid local passcode
  const localTs = localChurch?.adminPasscodeUpdatedAt ? Date.parse(localChurch.adminPasscodeUpdatedAt) : 0;
  const remoteTs = remoteChurch.adminPasscodeUpdatedAt ? Date.parse(remoteChurch.adminPasscodeUpdatedAt) : 0;

  if (localPass && !remotePass) {
    return {
      church: {
        ...remoteChurch,
        adminPasscode: localPass,
        adminPasscodeUpdatedAt: localChurch?.adminPasscodeUpdatedAt || lock?.updatedAtIso,
      },
      needsFirestoreReconcile: true,
    };
  }

  if (localPass && remotePass !== localPass) {
    const localLockMatches = lock && lock.passcode === localPass;
    const localIsNewer = !Number.isNaN(localTs) && (Number.isNaN(remoteTs) || localTs > remoteTs);
    if (localIsNewer || (localLockMatches && !remoteChurch.adminPasscodeUpdatedAt)) {
      return {
        church: {
          ...remoteChurch,
          adminPasscode: localPass,
          adminPasscodeUpdatedAt: localChurch?.adminPasscodeUpdatedAt || lock?.updatedAtIso,
        },
        needsFirestoreReconcile: true,
      };
    }
  }

  // Remote is authoritative (or equal): update lock confirmation
  if (remotePass) {
    map[remoteChurch.id] = {
      passcode: remotePass,
      updatedAtIso: remoteChurch.adminPasscodeUpdatedAt || new Date().toISOString(),
      updatedAtMs: !Number.isNaN(remoteTs) && remoteTs > 0 ? remoteTs : Date.now(),
      confirmedByRemote: true,
    };
    savePasscodeLockMap(map);
  }

  return { church: remoteChurch, needsFirestoreReconcile: needsOwnershipReconcile };
}

export function saveChurch(
  church: Church,
  options?: {
    deliberatePasscodeUpdate?: boolean;
    clearAdminGooglePhoto?: boolean;
    clearLogoUrl?: boolean;
    clearSignatureUrl?: boolean;
    skipFirestore?: boolean;
  }
) {
  const churches = getAllChurches();
  const index = churches.findIndex((c3) => c3.id === church.id);
  const existingLocal = index >= 0 ? churches[index] : undefined;
  const lockMap = getPasscodeLockMap();
  const existingLock = lockMap[church.id];
  const nowIso = new Date().toISOString();

  const shouldClearAdminPhoto =
    Boolean(options?.clearAdminGooglePhoto) ||
    church.adminGooglePhoto === "" ||
    (Boolean(existingLocal?.adminGooglePhoto) && "adminGooglePhoto" in church && !church.adminGooglePhoto);
  const shouldClearLogoUrl =
    Boolean(options?.clearLogoUrl) ||
    church.logoUrl === "" ||
    (Boolean(existingLocal?.logoUrl) && "logoUrl" in church && !church.logoUrl);
  const shouldClearSignatureUrl =
    Boolean(options?.clearSignatureUrl) ||
    church.signatureUrl === "" ||
    (Boolean(existingLocal?.signatureUrl) && "signatureUrl" in church && !church.signatureUrl);

  let churchToSave: Church;
  if (options?.deliberatePasscodeUpdate) {
    const cleanPass = (church.adminPasscode || "").trim();
    const updatedAtIso = recordDeliberatePasscodeUpdate(church.id, cleanPass);
    churchToSave = {
      ...church,
      updatedAt: nowIso,
      adminPasscode: cleanPass || undefined,
      adminPasscodeUpdatedAt: updatedAtIso,
      ...(shouldClearAdminPhoto ? { adminGooglePhoto: "" } : {}),
      ...(shouldClearLogoUrl ? { logoUrl: undefined } : {}),
      ...(shouldClearSignatureUrl ? { signatureUrl: undefined } : {}),
    };
  } else {
    // Non-deliberate save: preserve the authoritative local passcode so stale React props never revert it
    const authoritativePasscode =
      (existingLock?.passcode && !existingLock.confirmedByRemote ? existingLock.passcode : undefined) ||
      (existingLocal?.adminPasscode || "").trim() ||
      (existingLock?.passcode || "").trim() ||
      (church.adminPasscode || "").trim() ||
      undefined;
    const authoritativeUpdatedAt =
      existingLocal?.adminPasscodeUpdatedAt ||
      existingLock?.updatedAtIso ||
      church.adminPasscodeUpdatedAt;

    churchToSave = {
      ...church,
      updatedAt: nowIso,
      adminPasscode: authoritativePasscode,
      adminPasscodeUpdatedAt: authoritativeUpdatedAt,
      adminVerified:
        typeof church.adminVerified === "boolean"
          ? church.adminVerified
          : existingLocal?.adminVerified,
      adminVerifiedAt: church.adminVerifiedAt ?? existingLocal?.adminVerifiedAt,
      adminVerifiedBy: church.adminVerifiedBy ?? existingLocal?.adminVerifiedBy,
      ...(shouldClearAdminPhoto ? { adminGooglePhoto: "" } : {}),
      ...(shouldClearLogoUrl ? { logoUrl: undefined } : {}),
      ...(shouldClearSignatureUrl ? { signatureUrl: undefined } : {}),
    };
  }

  if (index >= 0) {
    churches[index] = churchToSave;
  } else {
    churches.push(churchToSave);
  }
  unmarkChurchAsDeleted(churchToSave.id);
  markPendingLocalUpload("church", churchToSave.id);
  saveToStorage(STORAGE_KEYS.CHURCHES, churches);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("church_data_updated"));
  }
  if (!options?.skipFirestore) {
    firestoreSaveChurch(churchToSave, {
      deliberatePasscodeUpdate: Boolean(options?.deliberatePasscodeUpdate),
      clearAdminGooglePhoto: shouldClearAdminPhoto,
      clearLogoUrl: shouldClearLogoUrl,
      clearSignatureUrl: shouldClearSignatureUrl,
    })
      .then(() => clearPendingLocalUpload("church", churchToSave.id))
      .catch((err) => console.warn("Firestore saveChurch error:", err));
  }
}

/**
 * Resolves the active Admin/Owner avatar photo cleanly:
 * 1. Non-empty `church.adminGooglePhoto` ALWAYS wins (including custom uploaded base64/URL photos even while connected to Google).
 * 2. If `church.adminGooglePhoto === ""` (explicitly removed by admin), returns undefined instead of silently resurrecting Google's photo.
 * 3. Otherwise (`adminGooglePhoto === undefined`), falls back to `googleUser?.photoURL`.
 */
export function resolveChurchAdminAvatarUrl(
  church?: Partial<Church> | null,
  googleUser?: { photoURL?: string | null } | null
): string | undefined {
  if (!church) {
    const g = (googleUser?.photoURL || "").trim();
    return g || undefined;
  }
  if (typeof church.adminGooglePhoto === "string") {
    const clean = church.adminGooglePhoto.trim();
    return clean ? clean : undefined;
  }
  const googleFallback = (googleUser?.photoURL || "").trim();
  return googleFallback || undefined;
}

/**
 * Updates the Admin/Church Owner profile photo (`adminGooglePhoto`) with full local + member + Firestore sync,
 * keeping custom uploaded photos active even when connected with a Google account.
 */
export async function updateChurchAdminProfilePhoto(
  churchId: string,
  nextPhoto: string | null,
  options?: { syncMemberRecord?: boolean }
): Promise<Church | undefined> {
  const existing = getChurchById(churchId);
  if (!existing) return undefined;

  const cleanPhoto = typeof nextPhoto === "string" ? nextPhoto.trim() : "";
  const isClearing = !cleanPhoto;
  const nowIso = new Date().toISOString();

  const updatedChurch: Church = {
    ...existing,
    adminGooglePhoto: isClearing ? "" : cleanPhoto,
    updatedAt: nowIso,
  };

  saveChurch(updatedChurch, {
    clearAdminGooglePhoto: isClearing,
    skipFirestore: true,
  });

  // Sync matching member record (1:1 via Google UID or official admin email) so member cards & feed match immediately
  if (options?.syncMemberRecord !== false) {
    const adminUid = (existing.adminGoogleUid || "").trim();
    const adminEmail = (existing.adminGoogleEmail || "").trim().toLowerCase();
    if (adminUid || adminEmail) {
      const members = getMembersByChurch(existing.id);
      const matchingMembers = members.filter((m) => {
        if (adminUid && (m.googleUid === adminUid || m.userId === adminUid)) return true;
        const mGoogleEmail = (m.googleEmail || "").trim().toLowerCase();
        const mEmail = (m.email || "").trim().toLowerCase();
        return Boolean(adminEmail && (mGoogleEmail === adminEmail || mEmail === adminEmail));
      });
      for (const matched of matchingMembers) {
        updateMember(existing.id, {
          ...matched,
          avatarUrl: isClearing ? undefined : cleanPhoto,
          photoUrl: isClearing ? undefined : cleanPhoto,
          googlePhoto: isClearing ? undefined : cleanPhoto,
        });
      }
    }
  }

  try {
    await firestoreSaveChurch(updatedChurch, {
      clearAdminGooglePhoto: isClearing,
      throwOnError: false,
    });
    clearPendingLocalUpload("church", updatedChurch.id);
    if (updatedChurch.adminGoogleUid) {
      await firestoreSyncAdminUserProfilePhoto(
        updatedChurch.adminGoogleUid,
        isClearing ? null : cleanPhoto
      );
    }
  } catch (err) {
    console.warn("Firestore updateChurchAdminProfilePhoto warning:", err);
  }

  return updatedChurch;
}

/**
 * Updates the Church official profile photo / logo (`logoUrl`) across local cache and Firestore.
 */
export async function updateChurchLogoPhoto(
  churchId: string,
  nextLogo: string | null
): Promise<Church | undefined> {
  const existing = getChurchById(churchId);
  if (!existing) return undefined;

  const cleanLogo = typeof nextLogo === "string" ? nextLogo.trim() : "";
  const isClearing = !cleanLogo;
  const nowIso = new Date().toISOString();

  const updatedChurch: Church = {
    ...existing,
    logoUrl: isClearing ? undefined : cleanLogo,
    updatedAt: nowIso,
  };

  saveChurch(updatedChurch, {
    clearLogoUrl: isClearing,
    skipFirestore: true,
  });

  try {
    await firestoreSaveChurch(updatedChurch, {
      clearLogoUrl: isClearing,
      throwOnError: false,
    });
    clearPendingLocalUpload("church", updatedChurch.id);
  } catch (err) {
    console.warn("Firestore updateChurchLogoPhoto warning:", err);
  }

  return updatedChurch;
}

/**
 * Super-Developer-only authoritative toggle for `church.adminVerified` (`false` -> `true` or `true` -> `false`).
 * Writes directly to Firestore FIRST (throwing if Super Developer Google auth is missing or rules reject),
 * then updates the local cache so the UI immediately reflects the authoritative state.
 */
export async function setChurchAdminVerificationAsync(
  church: Church,
  verified: boolean
): Promise<Church> {
  const result = await firestoreSetChurchAdminVerification(church, verified);
  const churches = getAllChurches();
  const index = churches.findIndex((c) => c.id === church.id);
  const baseChurch = index >= 0 ? churches[index] : church;

  const updatedChurch: Church = {
    ...baseChurch,
    adminVerified: result.verified,
    adminVerifiedAt: result.verifiedAt,
    adminVerifiedBy: result.verifiedBy,
  };

  if (index >= 0) {
    churches[index] = updatedChurch;
  } else {
    churches.push(updatedChurch);
  }
  unmarkChurchAsDeleted(updatedChurch.id);
  clearPendingLocalUpload("church", updatedChurch.id);
  saveToStorage(STORAGE_KEYS.CHURCHES, churches);
  return updatedChurch;
}

function generateUniqueChurchSuffix(length: number = 4): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return out;
}

export function rollbackLocalChurchCreation(churchId: string): void {
  const cleanId = (churchId || "").trim();
  if (!cleanId || cleanId.toUpperCase() === "CH001") return;
  const churches = getAllChurches().filter((c) => c.id !== cleanId);
  saveToStorage(STORAGE_KEYS.CHURCHES, churches);
  clearPendingLocalUpload("church", cleanId);
  const lockMap = getPasscodeLockMap();
  if (lockMap[cleanId]) {
    delete lockMap[cleanId];
    savePasscodeLockMap(lockMap);
  }
  const activeId = loadFromStorage<string>(STORAGE_KEYS.ACTIVE_CHURCH_ID, "");
  if (activeId === cleanId) {
    saveToStorage(STORAGE_KEYS.ACTIVE_CHURCH_ID, churches[0]?.id || "");
  }
}

export async function syncCreatedChurchToCloud(church: Church): Promise<boolean> {
  if (!church || !church.id) return false;
  try {
    await firestoreCreateChurchStrict(church, {
      deliberatePasscodeUpdate: Boolean(church.adminPasscode),
    });
    clearPendingLocalUpload("church", church.id);
    return true;
  } catch (err) {
    console.warn("Firestore syncCreatedChurchToCloud warning:", err);
    return false;
  }
}

/**
 * Strict church cloud synchronization used by CreateChurchModal, EmptyChurchOnboarding,
 * and AdminChurchSettings. Throws clean error & rolls back uncommitted ghost church on
 * auth/permission rejections while queuing gracefully when genuinely offline.
 */
export async function syncCreatedChurchToCloudStrict(
  church: Church
): Promise<{ synced: boolean; offlineQueued: boolean }> {
  if (!church || !church.id) {
    throw new Error("Enfòmasyon legliz la pa konplè.");
  }
  try {
    await firestoreCreateChurchStrict(church, {
      deliberatePasscodeUpdate: Boolean(church.adminPasscode),
    });
    clearPendingLocalUpload("church", church.id);
    return { synced: true, offlineQueued: false };
  } catch (err: any) {
    const rawMsg = String(err?.message || err || "");
    const rawCode = String(err?.code || "").toLowerCase();
    const lowerMsg = rawMsg.toLowerCase();

    const isOfflineFailure =
      !isDeviceOnline() ||
      rawCode === "unavailable" ||
      lowerMsg.includes("client is offline") ||
      lowerMsg.includes("network-request-failed") ||
      lowerMsg.includes("failed to get document because the client is offline");

    if (isOfflineFailure) {
      return { synced: false, offlineQueued: true };
    }

    // Roll back the uncommitted local ghost church so user isn't stuck with an unsynced orphan
    rollbackLocalChurchCreation(church.id);

    if (rawMsg.includes("AUTH_REQUIRED_FOR_CHURCH_CREATE")) {
      throw new Error(
        "Ou dwe konekte ak kont Google oswa Imèl + Modpas administratè a anvan ou kreye legliz la."
      );
    }
    if (rawMsg.includes("AUTH_UID_MISMATCH_FOR_CHURCH_CREATE") || rawMsg.includes("AUTH_EMAIL_MISMATCH_FOR_CHURCH_CREATE")) {
      throw new Error(
        "Sesyon Firebase aktif la pa koresponn ak kont administratè ou chwazi a. Rekonekte epi re-eseye."
      );
    }
    if (lowerMsg.includes("permission-denied") || lowerMsg.includes("missing or insufficient permissions")) {
      throw new Error(
        "Firestore refize kreyasyon legliz la (pèmisyon oswa sesyon ekspire). Verifye ou konekte ak vrè kont Google oswa Imèl + Modpas ou epi re-eseye."
      );
    }
    throw new Error(rawMsg || "Pa rive anrejistre legliz la nan nwaj la.");
  }
}

export function createNewChurch(
  params: {
    name: string;
    code?: string;
    pastor: string;
    address: string;
    city: string;
    phone: string;
    email: string;
    motto: string;
    rnc?: string;
    adminPasscode?: string;
    adminGoogleEmail?: string;
    adminGoogleUid?: string;
    adminGoogleName?: string;
    adminAuthMethod?: Church['adminAuthMethod'];
  },
  options?: {
    skipImmediateCloudSave?: boolean;
  }
) {
  const cleanName = (params.name || "").trim();
  if (cleanName.length < 2) {
    throw new Error("Non legliz la dwe gen omwen 2 karaktè.");
  }

  const churches = getAllChurches();
  let maxIdNum = 0;
  churches.forEach((c3) => {
    const match = c3.id.match(/^CH(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxIdNum) maxIdNum = num;
    }
  });
  let nextNum = Math.max(churches.length + 1, maxIdNum + 1);
  let shortPrefix = `CH${String(nextNum).padStart(3, "0")}`;
  let churchId = `${shortPrefix}-${generateUniqueChurchSuffix(4)}`;
  while (churches.some((c3) => c3.id.toUpperCase() === churchId.toUpperCase())) {
    nextNum++;
    shortPrefix = `CH${String(nextNum).padStart(3, "0")}`;
    churchId = `${shortPrefix}-${generateUniqueChurchSuffix(4)}`;
  }
  const code = (params.code?.trim().toUpperCase()) || shortPrefix;
  const cleanPasscode = (params.adminPasscode || "").trim();
  const cleanAdminEmail = (params.adminGoogleEmail || "").trim().toLowerCase();
  const cleanAdminUid = (params.adminGoogleUid || "").trim();

  const hasFirebaseAdmin = Boolean(cleanAdminEmail && cleanAdminUid);
  if (!hasFirebaseAdmin && (!cleanPasscode || cleanPasscode.length < 4)) {
    throw new Error(
      "Chak legliz dwe gen yon Imèl + Modpas administratè (oswa yon kòd sekirite PIN omwen 4 karaktè)."
    );
  }

  const hashedPasscode = cleanPasscode
    ? isPasscodeHashed(cleanPasscode)
      ? cleanPasscode
      : hashAdminPasscodeSync(cleanPasscode, churchId)
    : undefined;
  const passcodeTimestamp = hashedPasscode
    ? recordDeliberatePasscodeUpdate(churchId, hashedPasscode)
    : undefined;

  const resolvedAuthMethod: Church["adminAuthMethod"] =
    params.adminAuthMethod ||
    (hasFirebaseAdmin ? "email_password" : "legacy_pin");

  const newChurch: Church = {
    id: churchId,
    code,
    name: cleanName,
    pastor: params.pastor.trim(),
    address: params.address.trim(),
    city: params.city.trim() || "Ayiti",
    phone: params.phone.trim(),
    email: params.email.trim() || cleanAdminEmail,
    motto: params.motto.trim() || "Nan sèvis Bondye ak renmen",
    themeColor: "indigo",
    logoIcon: "Church",
    rnc: params.rnc?.trim() || void 0,
    rncNumber: params.rnc?.trim() || void 0,
    adminPasscode: hashedPasscode,
    adminPasscodeUpdatedAt: passcodeTimestamp,
    adminGoogleEmail: cleanAdminEmail || undefined,
    adminGoogleUid: cleanAdminUid || undefined,
    adminGoogleName: params.adminGoogleName?.trim() || undefined,
    adminAuthMethod: resolvedAuthMethod,
    donationInfo: {
      enabled: false
    },
    status: "active",
    isLegacy: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  };
  churches.push(newChurch);
  unmarkChurchAsDeleted(newChurch.id);
  markPendingLocalUpload("church", newChurch.id);
  saveToStorage(STORAGE_KEYS.CHURCHES, churches);
  if (!options?.skipImmediateCloudSave) {
    firestoreSaveChurch(newChurch, { deliberatePasscodeUpdate: Boolean(hashedPasscode) })
      .then(() => clearPendingLocalUpload("church", newChurch.id))
      .catch((err) => console.warn("Firestore createNewChurch error:", err));
  }
  const cleanMembers = loadFromStorage(STORAGE_KEYS.MEMBERS, []).filter(
    (m2) => m2.churchId !== newChurch.id && !isLegacyDemoMember(m2)
  );
  saveToStorage(STORAGE_KEYS.MEMBERS, cleanMembers);
  const cleanServices = loadFromStorage(STORAGE_KEYS.SERVICES, []).filter(
    (s3) => s3.churchId !== newChurch.id && !isLegacyDemoService(s3)
  );
  saveToStorage(STORAGE_KEYS.SERVICES, cleanServices);
  const cleanAnnouncements = loadFromStorage(STORAGE_KEYS.ANNOUNCEMENTS, []).filter(
    (a2) => a2.churchId !== newChurch.id && !isLegacyDemoAnnouncement(a2)
  );
  saveToStorage(STORAGE_KEYS.ANNOUNCEMENTS, cleanAnnouncements);
  const cleanAttendance = loadFromStorage(STORAGE_KEYS.ATTENDANCE, []).filter(
    (att) => att.churchId !== newChurch.id && !isLegacyDemoAttendance(att)
  );
  saveToStorage(STORAGE_KEYS.ATTENDANCE, cleanAttendance);
  return newChurch;
}
export function generateMemberId(churchCode, fullName) {
  const cleanCode = (churchCode || "CH001").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const parts = fullName.trim().split(/\s+/);
  let initials = "";
  if (parts.length >= 2) {
    initials = `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  } else if (parts.length === 1 && parts[0].length >= 2) {
    initials = parts[0].substring(0, 2).toUpperCase();
  } else {
    initials = "MB";
  }
  const randomSuffix = Math.floor(1e3 + Math.random() * 9e3);
  return `${cleanCode}-${initials}${randomSuffix}`;
}
export function generateSecureMemberPin() {
  const avoid = [
    "000000",
    "111111",
    "222222",
    "333333",
    "444444",
    "555555",
    "666666",
    "777777",
    "888888",
    "999999",
    "123456",
    "654321",
    "012345",
    "543210"
  ];
  let pin = "";
  for (let i2 = 0; i2 < 15; i2++) {
    if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
      const array2 = new Uint32Array(1);
      window.crypto.getRandomValues(array2);
      pin = (1e5 + array2[0] % 9e5).toString();
    } else {
      pin = Math.floor(1e5 + Math.random() * 9e5).toString();
    }
    if (!avoid.includes(pin)) {
      return pin;
    }
  }
  return pin || "793814";
}
export function getMembersByChurch(churchId) {
  if (!churchId || !churchId.trim()) return [];
  const cleanId = churchId.trim();
  const church = getChurchById(cleanId);
  const targetId = church ? church.id : cleanId;
  const targetCode = (church == null ? void 0 : church.code) ? church.code.trim().toUpperCase() : "";
  const allMembers = loadFromStorage(STORAGE_KEYS.MEMBERS, INITIAL_MEMBERS);
  const seen = new Set<string>();
  return allMembers.filter((m2) => {
    if (!m2 || typeof m2.id !== "string" || !m2.id.trim()) return false;
    if (isLegacyDemoMember(m2) || isMemberMarkedDeleted(m2)) return false;
    if (seen.has(m2.id)) return false;
    const mChurch = (m2.churchId || "").trim();
    if (!mChurch) return false;
    const matches = mChurch.toUpperCase() === targetId.toUpperCase() || Boolean(targetCode && mChurch.toUpperCase() === targetCode);
    if (matches) {
      seen.add(m2.id);
    }
    return matches;
  });
}
function buildAndSaveLocalMember(churchId, memberData) {
  var _a3, _b3, _c2, _d2, _e3, _f2, _g2, _h2, _i2, _j2, _k2, _l2;
  const allMembers = loadFromStorage(STORAGE_KEYS.MEMBERS, INITIAL_MEMBERS);
  const cleanId = (churchId || "").trim();
  const church = getChurchById(cleanId);
  const canonicalChurchId = church ? church.id : cleanId;
  const churchCode = church ? church.code : canonicalChurchId;
  const memberId = generateMemberId(churchCode, memberData.fullName);
  const barcodeToken = `CHURCH:${canonicalChurchId}|MEMBER:${memberId}`;
  const defaultPin = ((_a3 = memberData.pin) == null ? void 0 : _a3.trim()) || generateSecureMemberPin();
  const newMember = {
    id: `m-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    churchId: canonicalChurchId,
    memberId,
    pin: defaultPin,
    titlePrefix: ((_b3 = memberData.titlePrefix) == null ? void 0 : _b3.trim()) || void 0,
    fullName: memberData.fullName.trim(),
    gender: memberData.gender,
    civilStatus: memberData.civilStatus,
    profession: ((_c2 = memberData.profession) == null ? void 0 : _c2.trim()) || void 0,
    dateOfBirth: memberData.dateOfBirth,
    baptismDate: memberData.baptismDate || void 0,
    phone: memberData.phone.trim(),
    emergencyContact: ((_d2 = memberData.emergencyContact) == null ? void 0 : _d2.trim()) || void 0,
    emergencyContactName: ((_e3 = memberData.emergencyContactName) == null ? void 0 : _e3.trim()) || void 0,
    email: memberData.email.trim(),
    address: ((_f2 = memberData.address) == null ? void 0 : _f2.trim()) || "",
    city: ((_g2 = memberData.city) == null ? void 0 : _g2.trim()) || void 0,
    zone: ((_h2 = memberData.zone) == null ? void 0 : _h2.trim()) || void 0,
    department: memberData.department || "Service Général",
    role: memberData.role || "Manm",
    memberType: memberData.memberType || (isVisitorRole(memberData.role) ? "visitor" : "member"),
    cellGroup: ((_i2 = memberData.cellGroup) == null ? void 0 : _i2.trim()) || void 0,
    joinedDate: memberData.joinedDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    status: memberData.status || "active",
    avatarUrl: ((_j2 = memberData.avatarUrl) == null ? void 0 : _j2.trim()) || void 0,
    legalDocumentType: memberData.legalDocumentType || void 0,
    legalDocumentNumber: ((_k2 = memberData.legalDocumentNumber) == null ? void 0 : _k2.trim()) || void 0,
    barcodeToken,
    notes: ((_l2 = memberData.notes) == null ? void 0 : _l2.trim()) || ""
  };
  allMembers.push(newMember);
  unmarkMemberAsDeleted({ id: newMember.id, memberId: newMember.memberId, barcodeToken: newMember.barcodeToken });
  markPendingLocalUpload("member", newMember.id);
  saveToStorage(STORAGE_KEYS.MEMBERS, allMembers);
  return newMember;
}
export function addMember(churchId, memberData) {
  const newMember = buildAndSaveLocalMember(churchId, memberData);
  firestoreAddMember(newMember)
    .then(() => clearPendingLocalUpload("member", newMember.id))
    .catch((err) => console.warn("Firestore addMember error:", err));
  return newMember;
}
export async function addMemberWithCloudSync(
  churchId: string,
  memberData: any
): Promise<{ member: Member; cloudSynced: boolean; permissionError?: boolean }> {
  const newMember = buildAndSaveLocalMember(churchId, memberData);
  try {
    await firestoreAddMember(newMember);
    clearPendingLocalUpload("member", newMember.id);
    return { member: newMember, cloudSynced: true };
  } catch (err: any) {
    const msg = String(err?.message || err || "").toLowerCase();
    const isPerm = msg.includes("missing or insufficient permissions") || msg.includes("permission-denied");
    console.warn("Firestore addMemberWithCloudSync error:", err);
    return { member: newMember, cloudSynced: false, permissionError: isPerm };
  }
}
/**
 * Determines whether a photo URL is a custom uploaded/captured member photo
 * (e.g. Data URL or non-Google-avatar image) that must take priority over a generic Google avatar.
 */
export function isCustomMemberPhoto(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('data:image/')) return true;
  if (trimmed.includes('googleusercontent.com') || trimmed.includes('ggpht.com')) {
    return false;
  }
  return true;
}

/**
 * Resolves the canonical member photo across avatarUrl, photoUrl, googlePhoto, and optional GoogleAuthUser.
 * Ensures that an existing custom profile photo is NEVER overwritten when linking a Google account,
 * while automatically using the Google photo if the member has no custom photo yet.
 */
export function resolveCanonicalMemberPhoto(
  primary?: Partial<Member> | null,
  secondary?: Partial<Member> | null,
  googlePhotoFallback?: string | null
): { avatarUrl?: string; photoUrl?: string; googlePhoto?: string } {
  const candidates = [
    primary?.avatarUrl,
    primary?.photoUrl,
    secondary?.avatarUrl,
    secondary?.photoUrl,
    primary?.googlePhoto,
    secondary?.googlePhoto,
    googlePhotoFallback || undefined,
  ].filter((u): u is string => Boolean(u && typeof u === 'string' && u.trim().length > 0));

  // 1. Prefer custom uploaded/captured photo first
  const customPhoto = candidates.find((u) => isCustomMemberPhoto(u));
  // 2. Otherwise take the first valid photo available
  const canonicalPhoto = customPhoto || candidates[0] || undefined;
  const resolvedGooglePhoto =
    (googlePhotoFallback && googlePhotoFallback.trim()) ||
    primary?.googlePhoto ||
    secondary?.googlePhoto ||
    canonicalPhoto;

  return {
    avatarUrl: canonicalPhoto,
    photoUrl: canonicalPhoto,
    googlePhoto: canonicalPhoto || resolvedGooglePhoto,
  };
}

/**
 * Unifies and reconciles a Member profile across local state, remote Firestore state, and Google Account linking
 * so that all profile data (photo, Google UID/email, phone, role, department, PIN, QR token, notes)
 * stays on the exact same pedestal with zero data loss.
 */
export function unifyMemberProfile(
  primary: Member,
  secondary?: Partial<Member> | null,
  googleUser?: {
    email?: string | null;
    uid?: string | null;
    photoURL?: string | null;
    displayName?: string | null;
  } | null
): Member {
  const base = secondary ? { ...secondary, ...primary } : { ...primary };
  const photos = resolveCanonicalMemberPhoto(primary, secondary, googleUser?.photoURL);

  const cleanGoogleEmail =
    (googleUser?.email && googleUser.email.trim().toLowerCase()) ||
    (primary.googleEmail && primary.googleEmail.trim().toLowerCase()) ||
    (secondary?.googleEmail && secondary.googleEmail.trim().toLowerCase()) ||
    undefined;

  const cleanGoogleUid =
    (googleUser?.uid && googleUser.uid.trim()) ||
    primary.googleUid ||
    secondary?.googleUid ||
    undefined;

  const resolvedEmail =
    (primary.email && primary.email.trim().toLowerCase()) ||
    (secondary?.email && secondary.email.trim().toLowerCase()) ||
    cleanGoogleEmail ||
    '';

  const resolvedPhone =
    (primary.phone && primary.phone.trim()) ||
    (secondary?.phone && secondary.phone.trim()) ||
    '';

  const resolvedDob =
    primary.dateOfBirth && primary.dateOfBirth !== '2000-01-01'
      ? primary.dateOfBirth
      : secondary?.dateOfBirth && secondary.dateOfBirth !== '2000-01-01'
      ? secondary.dateOfBirth
      : primary.dateOfBirth || secondary?.dateOfBirth || '2000-01-01';

  const resolvedPin =
    (primary.pin && primary.pin.trim()) ||
    (secondary?.pin && secondary.pin.trim()) ||
    undefined;

  const resolvedNotes =
    (primary.notes && primary.notes.trim()) ||
    (secondary?.notes && secondary.notes.trim()) ||
    '';

  return {
    ...base,
    id: primary.id || secondary?.id || base.id,
    memberId: primary.memberId || secondary?.memberId || base.memberId,
    churchId: primary.churchId || secondary?.churchId || base.churchId,
    fullName:
      (primary.fullName && primary.fullName.trim()) ||
      (secondary?.fullName && secondary.fullName.trim()) ||
      (googleUser?.displayName && googleUser.displayName.trim()) ||
      base.fullName,
    email: resolvedEmail,
    phone: resolvedPhone,
    dateOfBirth: resolvedDob,
    department: primary.department || secondary?.department || base.department || 'Lwès',
    role: primary.role || secondary?.role || base.role || 'Manm',
    status: primary.status || secondary?.status || base.status || 'active',
    memberType:
      primary.memberType ||
      secondary?.memberType ||
      (isVisitorRole(primary.role || secondary?.role) ? 'visitor' : 'member'),
    pin: resolvedPin,
    notes: resolvedNotes,
    barcodeToken:
      primary.barcodeToken ||
      secondary?.barcodeToken ||
      base.barcodeToken ||
      ((primary.churchId || secondary?.churchId || base.churchId) &&
      (primary.memberId || secondary?.memberId || base.memberId)
        ? `CHURCH:${(primary.churchId || secondary?.churchId || base.churchId).trim()}|MEMBER:${(
            primary.memberId ||
            secondary?.memberId ||
            base.memberId
          )
            .trim()
            .toUpperCase()}`
        : undefined),
    joinedDate: primary.joinedDate || secondary?.joinedDate || base.joinedDate,
    googleEmail: cleanGoogleEmail,
    googleUid: cleanGoogleUid,
    avatarUrl: photos.avatarUrl,
    photoUrl: photos.photoUrl,
    googlePhoto: photos.googlePhoto,
  };
}

export function updateMember(
  churchId: string,
  updated: Member,
  options?: {
    skipFirestore?: boolean;
    clearPhoto?: boolean;
  }
) {
  const church = getChurchById(churchId);
  const canonicalChurchId = church ? church.id : churchId.trim();
  const churchCodeUpper = ((church == null ? void 0 : church.code) || "").toUpperCase();
  const allMembers = loadFromStorage(STORAGE_KEYS.MEMBERS, INITIAL_MEMBERS);
  const index = allMembers.findIndex(
    (m2) =>
      (m2.id === updated.id || (m2.memberId && updated.memberId && m2.memberId.toUpperCase() === updated.memberId.toUpperCase())) &&
      (m2.churchId === canonicalChurchId || (churchCodeUpper && (m2.churchId || "").toUpperCase() === churchCodeUpper))
  );
  const existingLocal = index >= 0 ? allMembers[index] : undefined;
  const explicitPhotoCleared =
    Boolean(options?.clearPhoto) ||
    (updated.avatarUrl === undefined &&
      updated.photoUrl === undefined &&
      updated.googlePhoto === undefined &&
      Boolean(existingLocal && (existingLocal.avatarUrl || existingLocal.photoUrl || existingLocal.googlePhoto)));
  const explicitGoogleUnlinked =
    updated.googleEmail === undefined &&
    updated.googleUid === undefined &&
    existingLocal &&
    (existingLocal.googleEmail || existingLocal.googleUid);

  let unified = unifyMemberProfile(
    {
      ...updated,
      churchId: canonicalChurchId,
    },
    existingLocal
  );

  if (explicitPhotoCleared) {
    unified = {
      ...unified,
      avatarUrl: undefined,
      photoUrl: undefined,
      googlePhoto: undefined,
    };
  }
  if (explicitGoogleUnlinked) {
    const keepCustomPhoto = isCustomMemberPhoto(existingLocal?.avatarUrl || existingLocal?.photoUrl)
      ? existingLocal?.avatarUrl || existingLocal?.photoUrl
      : undefined;
    unified = {
      ...unified,
      googleEmail: undefined,
      googleUid: undefined,
      googlePhoto: keepCustomPhoto,
      avatarUrl: keepCustomPhoto,
      photoUrl: keepCustomPhoto,
    };
  }

  if (index >= 0) {
    allMembers[index] = unified;
  } else {
    allMembers.push(unified);
  }
  unmarkMemberAsDeleted({
    id: unified.id,
    memberId: unified.memberId,
    barcodeToken: unified.barcodeToken,
  });
  markPendingLocalUpload("member", unified.id);
  saveToStorage(STORAGE_KEYS.MEMBERS, allMembers);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("omnichurch_member_updated", { detail: unified }));
  }
  if (!options?.skipFirestore) {
    firestoreUpdateMember(unified, { clearPhoto: explicitPhotoCleared })
      .then(() => clearPendingLocalUpload("member", unified.id))
      .catch((err) => console.warn("Firestore updateMember error:", err));
  }
  return unified;
}

export async function updateMemberProfilePhoto(
  churchId: string,
  member: Member,
  nextPhoto: string | null
): Promise<{ member: Member; cloudSynced: boolean; reason?: string }> {
  const cleanPhoto = typeof nextPhoto === "string" ? nextPhoto.trim() : "";
  const isClearing = !cleanPhoto;
  const savedMember = updateMember(
    churchId,
    {
      ...member,
      avatarUrl: isClearing ? undefined : cleanPhoto,
      photoUrl: isClearing ? undefined : cleanPhoto,
      googlePhoto: isClearing ? undefined : cleanPhoto,
    },
    { skipFirestore: true, clearPhoto: isClearing }
  );

  const cloudRes = await firestoreUpdateMemberProfilePhoto(
    savedMember,
    isClearing ? null : cleanPhoto
  );
  if (cloudRes.synced) {
    clearPendingLocalUpload("member", savedMember.id);
  }
  return {
    member: savedMember,
    cloudSynced: cloudRes.synced,
    reason: cloudRes.reason,
  };
}
export function getChurchByIdOrCode(churchIdOrCode: string): Church | undefined {
  const clean = (churchIdOrCode || "").trim();
  if (!clean) return undefined;
  const direct = getChurchById(clean);
  if (direct) return direct;
  const upper = clean.toUpperCase();
  return getAllChurches().find(
    (c2) =>
      (c2.id || "").trim().toUpperCase() === upper ||
      (c2.code || "").trim().toUpperCase() === upper
  );
}
export function cacheMemberLocally(member: Member): Member {
  if (!member || !member.id) return member;
  const allMembers = loadFromStorage<Member[]>(STORAGE_KEYS.MEMBERS, []);
  const idx = allMembers.findIndex(
    (m2) =>
      m2.id === member.id ||
      (m2.churchId === member.churchId &&
        m2.memberId &&
        member.memberId &&
        m2.memberId.toUpperCase() === member.memberId.toUpperCase())
  );
  const unified = idx >= 0 ? unifyMemberProfile(member, allMembers[idx]) : unifyMemberProfile(member);
  if (idx >= 0) {
    allMembers[idx] = unified;
  } else {
    allMembers.push(unified);
  }
  saveToStorage(STORAGE_KEYS.MEMBERS, allMembers);
  return unified;
}
export function cacheChurchLocally(church: Church) {
  if (!church || !church.id) return;
  const allChurches = loadFromStorage<Church[]>(STORAGE_KEYS.CHURCHES, []);
  const idx = allChurches.findIndex((c2) => c2.id === church.id);
  if (idx >= 0) {
    allChurches[idx] = church;
  } else {
    allChurches.push(church);
  }
  saveToStorage(STORAGE_KEYS.CHURCHES, allChurches);
}
export function updateMemberNotes(churchId, memberId, notes) {
  const church = getChurchById(churchId);
  const canonicalChurchId = church ? church.id : churchId.trim();
  const churchCodeUpper = ((church == null ? void 0 : church.code) || "").toUpperCase();
  const allMembers = loadFromStorage(STORAGE_KEYS.MEMBERS, INITIAL_MEMBERS);
  const index = allMembers.findIndex(
    (m2) => m2.id === memberId && (m2.churchId === canonicalChurchId || churchCodeUpper && (m2.churchId || "").toUpperCase() === churchCodeUpper)
  );
  if (index >= 0) {
    const updated = {
      ...allMembers[index],
      churchId: canonicalChurchId,
      notes: notes.trim()
    };
    allMembers[index] = updated;
    saveToStorage(STORAGE_KEYS.MEMBERS, allMembers);
    firestoreUpdateMember(updated).catch(
      (err) => console.warn("Firestore updateMemberNotes error:", err)
    );
    return updated;
  }
  return void 0;
}
export function deleteMember(churchId, memberId) {
  const allMembers = loadFromStorage(STORAGE_KEYS.MEMBERS, INITIAL_MEMBERS);
  const church = churchId && churchId !== "ALL" ? getChurchById(churchId) : void 0;
  const canonicalChurchId = church ? church.id : churchId && churchId !== "ALL" ? churchId.trim() : "";
  const churchCodeUpper = ((church == null ? void 0 : church.code) || "").toUpperCase();
  const memberToDelete = allMembers.find(
    (m2) => (m2.id === memberId || m2.memberId === memberId) && (!canonicalChurchId || m2.churchId === canonicalChurchId || churchCodeUpper && (m2.churchId || "").toUpperCase() === churchCodeUpper)
  ) || allMembers.find((m2) => m2.id === memberId || m2.memberId === memberId);
  const targetChurchId = (memberToDelete == null ? void 0 : memberToDelete.churchId) || canonicalChurchId || churchId;
  const memberDbId = (memberToDelete == null ? void 0 : memberToDelete.id) || memberId;
  const memberCode = (memberToDelete == null ? void 0 : memberToDelete.memberId) || "";
  const memberName = (memberToDelete == null ? void 0 : memberToDelete.fullName) || "";
  const barcodeToken = (memberToDelete == null ? void 0 : memberToDelete.barcodeToken) || "";
  markMemberAsDeleted({
    id: memberDbId,
    memberId: memberCode,
    barcodeToken
  });
  const remainingMembers = allMembers.filter((m2) => {
    if (m2.id === memberDbId) return false;
    if (memberCode && m2.memberId === memberCode && (!targetChurchId || m2.churchId === targetChurchId)) {
      return false;
    }
    if (barcodeToken && m2.barcodeToken === barcodeToken) return false;
    if (isMemberMarkedDeleted(m2)) return false;
    return true;
  });
  saveToStorage(STORAGE_KEYS.MEMBERS, remainingMembers);
  const allAttendance = loadFromStorage(STORAGE_KEYS.ATTENDANCE, INITIAL_ATTENDANCE);
  const remainingAttendance = allAttendance.filter((a2) => {
    const isThisMember = a2.memberDbId && a2.memberDbId === memberDbId || a2.memberId && (a2.memberId === memberDbId || memberCode && a2.memberId === memberCode) || barcodeToken && a2.barcodeToken === barcodeToken || memberName && (a2.memberName || "").trim().toLowerCase() === memberName.trim().toLowerCase() && (!targetChurchId || a2.churchId === targetChurchId);
    if (isThisMember) {
      markAttendanceAsDeleted(a2.id);
      return false;
    }
    return true;
  });
  const deletedScansCount = allAttendance.length - remainingAttendance.length;
  saveToStorage(STORAGE_KEYS.ATTENDANCE, remainingAttendance);
  const pendingAttendance = loadFromStorage(STORAGE_KEYS.PENDING_ATTENDANCE, []);
  const remainingPending = pendingAttendance.filter((p2) => {
    if (p2.memberDbId === memberDbId) return false;
    if (memberCode && p2.memberId === memberCode) return false;
    return true;
  });
  saveToStorage(STORAGE_KEYS.PENDING_ATTENDANCE, remainingPending);
  const allAbsences = loadFromStorage(STORAGE_KEYS.ABSENCES, []);
  const remainingAbsences = allAbsences.filter((abs) => {
    if (abs.memberDbId && abs.memberDbId === memberDbId) return false;
    if (abs.memberId && (abs.memberId === memberDbId || memberCode && abs.memberId === memberCode)) return false;
    if (memberName && (abs.memberName || "").trim().toLowerCase() === memberName.trim().toLowerCase() && (!targetChurchId || abs.churchId === targetChurchId)) {
      return false;
    }
    return true;
  });
  const deletedAbsencesCount = allAbsences.length - remainingAbsences.length;
  saveToStorage(STORAGE_KEYS.ABSENCES, remainingAbsences);
  const storedInteractions = getAnnouncementInteractions();
  let deletedCommentsCount = 0;
  for (const annId of Object.keys(storedInteractions)) {
    const item = storedInteractions[annId];
    if (item && Array.isArray(item.comments)) {
      const initLen = item.comments.length;
      item.comments = item.comments.filter((c3) => {
        if (c3.authorMemberId && (c3.authorMemberId === memberDbId || c3.authorMemberId === memberCode)) {
          return false;
        }
        if (memberName && (c3.author || "").trim().toLowerCase() === memberName.trim().toLowerCase()) {
          return false;
        }
        return true;
      });
      deletedCommentsCount += initLen - item.comments.length;
    }
  }
  saveToStorage(STORAGE_KEYS.ANNOUNCEMENT_INTERACTIONS, storedInteractions);
  if (typeof window !== "undefined") {
    const activeMemberId = localStorage.getItem(STORAGE_KEYS.ACTIVE_MEMBER_ID);
    if (activeMemberId && (activeMemberId === memberDbId || memberCode && activeMemberId === memberCode)) {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_MEMBER_ID);
    }
    window.dispatchEvent(new CustomEvent("church_data_updated"));
    window.dispatchEvent(
      new CustomEvent("omnichurch_interactions_updated", { detail: storedInteractions })
    );
    window.dispatchEvent(
      new CustomEvent("omnichurch_member_deleted", {
        detail: {
          memberId: memberDbId,
          memberCode,
          memberName,
          churchId: targetChurchId,
          deletedScansCount,
          deletedAbsencesCount,
          deletedCommentsCount
        }
      })
    );
  }
  firestoreDeleteMember(memberDbId, targetChurchId, memberCode, memberName).catch(
    (err) => console.warn("Firestore cascade deleteMember error:", err)
  );
  return {
    success: true,
    deletedMemberName: memberName || memberCode || memberDbId,
    deletedMemberId: memberCode || memberDbId,
    churchId: targetChurchId,
    deletedScansCount,
    deletedAbsencesCount,
    deletedCommentsCount
  };
}
export function deleteMultipleMembers(memberIdsOrChurchId: any, maybeIds?: any) {
  const memberIds = Array.isArray(memberIdsOrChurchId) ? memberIdsOrChurchId : (maybeIds || []);
  let totalScansCount = 0;
  let totalAbsencesCount = 0;
  let totalCommentsCount = 0;
  let count = 0;
  for (const mid of memberIds) {
    const res = deleteMember("ALL", mid);
    if (res.success) {
      count++;
      totalScansCount += res.deletedScansCount;
      totalAbsencesCount += res.deletedAbsencesCount;
      totalCommentsCount += res.deletedCommentsCount;
    }
  }
  return {
    deletedMembersCount: count,
    totalScansCount,
    totalAbsencesCount,
    totalCommentsCount
  };
}
export async function deleteMemberAsync(churchId, memberId) {
  const result = deleteMember(churchId, memberId);
  try {
    const fsResult = await firestoreDeleteMember(
      memberId,
      result.churchId,
      result.deletedMemberId,
      result.deletedMemberName
    );
    if (fsResult) {
      result.deletedScansCount = Math.max(result.deletedScansCount, fsResult.deletedScansCount);
      result.deletedCommentsCount = Math.max(result.deletedCommentsCount, fsResult.deletedCommentsCount);
    }
  } catch (fsErr) {
    console.warn("Firestore async deleteMember error:", fsErr);
  }
  return result;
}
export async function deleteMultipleMembersAsync(memberIds) {
  const localRes = deleteMultipleMembers(memberIds);
  try {
    await firestoreBatchDeleteMembers(memberIds);
  } catch (fsErr) {
    console.warn("Firestore async deleteMultipleMembers error:", fsErr);
  }
  return localRes;
}
export interface BulkImportMembersOptions {
  preserveMemberIds?: boolean;
  skipCloudSync?: boolean;
}

export interface BulkImportMembersResult {
  added: number;
  updated: number;
  skipped: number;
  totalProcessed: number;
  preservedIdsCount: number;
  generatedIdsCount: number;
  cloudSynced: boolean;
  cloudSyncError?: string;
}

export async function bulkImportMembers(
  churchId: string,
  importedList: ParsedMigrationMember[],
  mode2: MemberImportStrategy = "migrate",
  options?: BulkImportMembersOptions
): Promise<BulkImportMembersResult> {
  const allMembers: Member[] = loadFromStorage(STORAGE_KEYS.MEMBERS, INITIAL_MEMBERS);
  const church = getChurchById(churchId);
  const canonicalChurchId = church ? church.id : churchId.trim();
  const churchCode = church ? church.code : canonicalChurchId;

  const shouldPreserveMemberIds =
    typeof options?.preserveMemberIds === "boolean"
      ? options.preserveMemberIds
      : mode2 !== "append";

  // Track occupied Firestore DocIDs across ALL churches (to prevent immutable churchId conflicts on cross-church migration)
  const occupiedDocIdsInAllChurches = new Set<string>();
  const existingDocOwnerById = new Map<string, string>();
  const usedMemberIdsInTargetChurch = new Set<string>();

  for (const existingM of allMembers) {
    if (existingM?.id) {
      occupiedDocIdsInAllChurches.add(existingM.id);
      if (existingM.churchId) {
        existingDocOwnerById.set(existingM.id, existingM.churchId);
      }
    }
    if (
      existingM?.churchId &&
      existingM.churchId.toUpperCase() === canonicalChurchId.toUpperCase() &&
      existingM.memberId
    ) {
      usedMemberIdsInTargetChurch.add(existingM.memberId.trim().toUpperCase());
    }
  }

  let added = 0;
  let updated = 0;
  let skipped = 0;
  let preservedIdsCount = 0;
  let generatedIdsCount = 0;
  const changedMembersToSync: Member[] = [];

  for (const item of importedList) {
    if (!item || !item.fullName || !item.fullName.trim()) {
      skipped++;
      continue;
    }

    const cleanFullName = item.fullName.trim();
    const cleanPhone = (item.phone || "").trim();
    const cleanEmail = (item.email || "").trim().toLowerCase();
    const cleanMemberId = (item.memberId || "").trim().toUpperCase();
    const sourceChurchId = (item.sourceChurchId || item.churchId || "").trim() || undefined;
    const isCrossChurchRow = Boolean(
      sourceChurchId && sourceChurchId.toUpperCase() !== canonicalChurchId.toUpperCase()
    );

    const existingIndex = allMembers.findIndex((m2) => {
      if (!m2 || !m2.churchId) return false;
      if (m2.churchId.toUpperCase() !== canonicalChurchId.toUpperCase()) return false;
      if (cleanMemberId && (m2.memberId || "").trim().toUpperCase() === cleanMemberId) return true;
      if (!isCrossChurchRow && item.id && m2.id === item.id) return true;
      if (cleanPhone && cleanPhone.length >= 8 && m2.phone && m2.phone.trim() === cleanPhone) return true;
      if (cleanEmail && m2.email && m2.email.trim().toLowerCase() === cleanEmail) return true;
      return false;
    });

    if (existingIndex >= 0) {
      if (mode2 === "skipDuplicates") {
        skipped++;
        continue;
      }
      if (mode2 === "update" || mode2 === "migrate") {
        const current2 = allMembers[existingIndex];
        const preservedMemberId =
          (current2.memberId || "").trim().toUpperCase() ||
          cleanMemberId ||
          generateMemberId(churchCode, cleanFullName);
        if (cleanMemberId && preservedMemberId === cleanMemberId) {
          preservedIdsCount++;
        }
        const updatedMember: Member = {
          ...current2,
          churchId: canonicalChurchId,
          memberId: preservedMemberId,
          barcodeToken: `CHURCH:${canonicalChurchId}|MEMBER:${preservedMemberId}`,
          fullName: cleanFullName,
          titlePrefix: item.titlePrefix?.trim() || current2.titlePrefix,
          gender: item.gender || current2.gender,
          civilStatus: item.civilStatus || current2.civilStatus,
          profession: item.profession?.trim() || current2.profession,
          dateOfBirth: item.dateOfBirth?.trim() || current2.dateOfBirth,
          baptismDate: item.baptismDate?.trim() || current2.baptismDate,
          phone: cleanPhone || current2.phone,
          emergencyContact: item.emergencyContact?.trim() || current2.emergencyContact,
          emergencyContactName: item.emergencyContactName?.trim() || current2.emergencyContactName,
          email: cleanEmail || current2.email,
          googleEmail: item.googleEmail?.trim().toLowerCase() || current2.googleEmail,
          googleUid: item.googleUid?.trim() || current2.googleUid,
          googlePhoto: item.googlePhoto?.trim() || current2.googlePhoto,
          userId: item.userId?.trim() || current2.userId,
          address: item.address?.trim() || current2.address,
          city: item.city?.trim() || current2.city,
          zone: item.zone?.trim() || current2.zone,
          department: item.department?.trim() || current2.department,
          role: item.role?.trim() || current2.role,
          memberType: item.memberType || current2.memberType || "member",
          cellGroup: item.cellGroup?.trim() || current2.cellGroup,
          joinedDate: item.joinedDate?.trim() || current2.joinedDate,
          status: item.status || current2.status || "active",
          avatarUrl: item.avatarUrl?.trim() || current2.avatarUrl,
          photoUrl: item.photoUrl?.trim() || current2.photoUrl,
          legalDocumentType: item.legalDocumentType || current2.legalDocumentType,
          legalDocumentNumber: item.legalDocumentNumber?.trim() || current2.legalDocumentNumber,
          pin: item.pin?.trim() || current2.pin,
          securityPin: item.securityPin?.trim() || current2.securityPin,
          notes: item.notes !== undefined && item.notes !== "" ? item.notes.trim() : current2.notes,
        };
        allMembers[existingIndex] = updatedMember;
        usedMemberIdsInTargetChurch.add(preservedMemberId);
        changedMembersToSync.push(updatedMember);
        updated++;
        continue;
      }
    }

    // Preserve unique MemberID verbatim whenever available & non-colliding in target church
    let resolvedMemberId: string;
    if (
      cleanMemberId &&
      shouldPreserveMemberIds &&
      !usedMemberIdsInTargetChurch.has(cleanMemberId)
    ) {
      resolvedMemberId = cleanMemberId;
      preservedIdsCount++;
    } else {
      resolvedMemberId = generateMemberId(churchCode, cleanFullName);
      while (usedMemberIdsInTargetChurch.has(resolvedMemberId.toUpperCase())) {
        resolvedMemberId = generateMemberId(churchCode, cleanFullName);
      }
      generatedIdsCount++;
    }
    usedMemberIdsInTargetChurch.add(resolvedMemberId.toUpperCase());

    // Safe target-church Firestore DocID (never collides with another church's immutable churchId document)
    const safeDocId = resolveSafeMigrationDocId(
      canonicalChurchId,
      resolvedMemberId,
      item.id,
      sourceChurchId,
      occupiedDocIdsInAllChurches,
      existingDocOwnerById
    );
    occupiedDocIdsInAllChurches.add(safeDocId);
    existingDocOwnerById.set(safeDocId, canonicalChurchId);

    const barcodeToken = `CHURCH:${canonicalChurchId}|MEMBER:${resolvedMemberId}`;
    const defaultPin = (item.pin || "").trim() || generateSecureMemberPin();

    const newMember: Member = {
      id: safeDocId,
      userId: item.userId?.trim() || undefined,
      churchId: canonicalChurchId,
      memberId: resolvedMemberId,
      pin: defaultPin,
      securityPin: item.securityPin?.trim() || undefined,
      titlePrefix: item.titlePrefix?.trim() || undefined,
      fullName: cleanFullName,
      gender: item.gender,
      civilStatus: item.civilStatus,
      profession: item.profession?.trim() || undefined,
      dateOfBirth: item.dateOfBirth?.trim() || "1990-01-01",
      baptismDate: item.baptismDate?.trim() || undefined,
      phone: cleanPhone,
      emergencyContact: item.emergencyContact?.trim() || undefined,
      emergencyContactName: item.emergencyContactName?.trim() || undefined,
      email: cleanEmail,
      googleEmail: item.googleEmail?.trim().toLowerCase() || undefined,
      googleUid: item.googleUid?.trim() || undefined,
      googlePhoto: item.googlePhoto?.trim() || undefined,
      address: item.address?.trim() || "",
      city: item.city?.trim() || undefined,
      zone: item.zone?.trim() || undefined,
      department: item.department?.trim() || "Service Général",
      role: item.role?.trim() || "Manm",
      memberType: item.memberType || "member",
      cellGroup: item.cellGroup?.trim() || undefined,
      joinedDate: item.joinedDate?.trim() || new Date().toISOString().split("T")[0],
      status: item.status || "active",
      avatarUrl: item.avatarUrl?.trim() || undefined,
      photoUrl: item.photoUrl?.trim() || undefined,
      legalDocumentType: item.legalDocumentType || undefined,
      legalDocumentNumber: item.legalDocumentNumber?.trim() || undefined,
      barcodeToken,
      notes: item.notes?.trim() || "",
    };

    allMembers.push(newMember);
    changedMembersToSync.push(newMember);
    added++;
  }

  saveToStorage(STORAGE_KEYS.MEMBERS, allMembers);

  let cloudSynced = true;
  let cloudSyncError: string | undefined;

  if (changedMembersToSync.length > 0 && !options?.skipCloudSync) {
    for (const m of changedMembersToSync) {
      markPendingLocalUpload("member", m.id);
    }
    try {
      await firestoreBatchAddOrUpdateMembers(changedMembersToSync);
      for (const m of changedMembersToSync) {
        clearPendingLocalUpload("member", m.id);
      }
    } catch (err: any) {
      cloudSynced = false;
      cloudSyncError = err instanceof Error ? err.message : String(err);
      console.warn("Firestore bulk import sync error:", err);
    }
  }

  return {
    added,
    updated,
    skipped,
    totalProcessed: added + updated + skipped,
    preservedIdsCount,
    generatedIdsCount,
    cloudSynced,
    cloudSyncError,
  };
}
export function getServicesByChurch(churchId) {
  if (!churchId || !churchId.trim()) return [];
  const cleanId = churchId.trim();
  const church = getChurchById(cleanId);
  const targetId = church ? church.id : cleanId;
  const targetCode = (church == null ? void 0 : church.code) ? church.code.trim().toUpperCase() : "";
  const allServices = loadFromStorage(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
  const seen = new Set<string>();
  return allServices.filter((s3) => {
    if (!s3 || typeof s3.id !== "string" || !s3.id.trim()) return false;
    if (isLegacyDemoService(s3) || isServiceMarkedDeleted(s3.id)) return false;
    if (seen.has(s3.id)) return false;
    const sChurch = (s3.churchId || "").trim();
    if (!sChurch) return false;
    const matches = sChurch.toUpperCase() === targetId.toUpperCase() || Boolean(targetCode && sChurch.toUpperCase() === targetCode);
    if (matches) {
      seen.add(s3.id);
    }
    return matches;
  });
}
export function getActiveOngoingServices(churchId: string): ServiceSession[] {
  const services = getServicesByChurch(churchId);
  return services.filter(
    (s3) => isServiceCurrentlyActive(s3, isServiceEnded)
  );
}
export function getActiveService(churchId) {
  const ongoing = getActiveOngoingServices(churchId);
  if (ongoing.length > 0) return ongoing[0];
  return void 0;
}
export function setServiceActiveStatus(churchId: string, serviceId: string, isOpen: boolean = true) {
  const cleanId = churchId.trim();
  const church = getChurchById(cleanId);
  const canonicalChurchId = church ? church.id : cleanId;
  const churchCodeUpper = ((church == null ? void 0 : church.code) || "").toUpperCase();
  const allServices = loadFromStorage(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
  const target = allServices.find(
    (s3) => s3.id === serviceId && (s3.churchId === canonicalChurchId || churchCodeUpper && (s3.churchId || "").toUpperCase() === churchCodeUpper)
  );
  if (!target) return false;
  if (isOpen && (isServiceEnded(target) || isServiceBeforeStart(target))) {
    return false;
  }
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const updated = allServices.map((s3) => {
    const isThisChurch = s3.churchId === canonicalChurchId || churchCodeUpper && (s3.churchId || "").toUpperCase() === churchCodeUpper;
    if (isThisChurch) {
      if (s3.id === serviceId) {
        return {
          ...s3,
          churchId: canonicalChurchId,
          isOpenForAttendance: isOpen,
          wasOpenedForAttendance: isOpen ? true : Boolean(s3.wasOpenedForAttendance || s3.isOpenForAttendance),
          // Lè sèvis la fèmen, li pase epi li pa kapab reouvri ankò
          ...isOpen ? {} : { isPermanentlyEnded: true, endedAt: s3.endedAt || nowIso }
        };
      }
      if (isOpen) {
        return { ...s3, isOpenForAttendance: false };
      }
    }
    return s3;
  });
  saveToStorage(STORAGE_KEYS.SERVICES, updated);
  firestoreUpdateService(serviceId, {
    isOpenForAttendance: isOpen,
    ...(isOpen ? { wasOpenedForAttendance: true } : { isPermanentlyEnded: true, endedAt: target.endedAt || nowIso, wasOpenedForAttendance: Boolean(target.wasOpenedForAttendance || target.isOpenForAttendance) })
  }).catch(
    (err) => console.warn("Firestore setServiceActiveStatus error:", err)
  );
  if (isOpen) {
    allServices.filter((s3) => {
      const isThisChurch = s3.churchId === canonicalChurchId || churchCodeUpper && (s3.churchId || "").toUpperCase() === churchCodeUpper;
      return isThisChurch && s3.id !== serviceId && s3.isOpenForAttendance;
    }).forEach((other) => {
      firestoreUpdateService(other.id, { isOpenForAttendance: false }).catch(() => {
      });
    });
  } else {
    syncServiceAbsencesAutomatically(canonicalChurchId, serviceId);
  }
  return true;
}
export function addServiceSession(churchId, data) {
  const cleanId = churchId.trim();
  const church = getChurchById(cleanId);
  const canonicalChurchId = church ? church.id : cleanId;
  const churchCodeUpper = ((church == null ? void 0 : church.code) || "").toUpperCase();
  const allServices = loadFromStorage(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const scheduledAlreadyEnded = isServiceEnded({
    date: data?.date,
    startTime: data?.startTime,
    endTime: data?.endTime,
    isOpenForAttendance: false,
    isPermanentlyEnded: Boolean(data?.isPermanentlyEnded),
  });
  const scheduledBeforeStart = isServiceBeforeStart({
    date: data?.date,
    startTime: data?.startTime,
  });
  const effectiveIsOpen = (scheduledAlreadyEnded || scheduledBeforeStart) ? false : Boolean(data?.isOpenForAttendance);
  let modified = allServices;
  if (effectiveIsOpen) {
    modified = allServices.map((s3) => {
      const isThisChurch = s3.churchId === canonicalChurchId || churchCodeUpper && (s3.churchId || "").toUpperCase() === churchCodeUpper;
      return isThisChurch ? { ...s3, isOpenForAttendance: false } : s3;
    });
  }
  const newService = {
    id: `srv-${Date.now()}`,
    churchId: canonicalChurchId,
    ...data,
    isOpenForAttendance: effectiveIsOpen,
    wasOpenedForAttendance: effectiveIsOpen,
    ...(scheduledAlreadyEnded
      ? {
          isPermanentlyEnded: true,
          endedAt: data?.endedAt || nowIso,
          wasOpenedForAttendance: false,
        }
      : {}),
    createdAt: nowIso
  };
  modified.push(newService);
  markPendingLocalUpload("service", newService.id);
  saveToStorage(STORAGE_KEYS.SERVICES, modified);
  firestoreAddService(newService, { fanOutNotification: true })
    .then(() => clearPendingLocalUpload("service", newService.id))
    .catch((err) => console.warn("Firestore addService error:", err));
  return newService;
}
export function deleteServiceSession(churchId, serviceId, deleteRelatedAttendance = false) {
  const cleanId = (churchId || "").trim();
  markServiceAsDeleted(serviceId);
  const church = cleanId && cleanId !== "ALL" ? getChurchById(cleanId) : void 0;
  const canonicalChurchId = church ? church.id : cleanId;
  const churchCodeUpper = ((church == null ? void 0 : church.code) || "").toUpperCase();
  const allServices = loadFromStorage(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
  const filtered = allServices.filter(
    (s3) => !(s3.id === serviceId && (!canonicalChurchId || canonicalChurchId === "ALL" || s3.churchId === canonicalChurchId || churchCodeUpper && (s3.churchId || "").toUpperCase() === churchCodeUpper))
  );
  saveToStorage(STORAGE_KEYS.SERVICES, filtered);
  pruneAnnouncementInteractionsByTarget(serviceId);
  pruneAnnouncementInteractionsByTarget(`srv-feed-${serviceId}`);
  let deletedAttendanceCount = 0;
  if (deleteRelatedAttendance) {
    const allAttendance = loadFromStorage(STORAGE_KEYS.ATTENDANCE, INITIAL_ATTENDANCE);
    const toDeleteIds = [];
    const remainingAtt = allAttendance.filter((a2) => {
      if (a2.serviceId === serviceId) {
        toDeleteIds.push(a2.id);
        markAttendanceAsDeleted(a2.id);
        return false;
      }
      return true;
    });
    deletedAttendanceCount = toDeleteIds.length;
    if (deletedAttendanceCount > 0) {
      saveToStorage(STORAGE_KEYS.ATTENDANCE, remainingAtt);
      firestoreBatchDeleteAttendance(toDeleteIds).catch(
        (err) => console.warn("Firestore batch delete attendance error:", err)
      );
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("church_data_updated"));
  }
  firestoreDeleteService(serviceId, {
    churchId: canonicalChurchId && canonicalChurchId !== "ALL" ? canonicalChurchId : undefined,
    deleteRelatedAttendance,
  }).catch(
    (err) => console.warn("Firestore deleteService error:", err)
  );
  return { success: true, deletedAttendanceCount };
}
export function updateServiceSession(churchId, serviceId, updates) {
  const cleanId = churchId.trim();
  const church = getChurchById(cleanId);
  const canonicalChurchId = church ? church.id : cleanId;
  const churchCodeUpper = ((church == null ? void 0 : church.code) || "").toUpperCase();
  const allServices = loadFromStorage(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
  const target = allServices.find(
    (s3) => s3.id === serviceId && (s3.churchId === canonicalChurchId || churchCodeUpper && (s3.churchId || "").toUpperCase() === churchCodeUpper)
  );
  if (!target) {
    return void 0;
  }
  const targetAlreadyEnded = isServiceEnded(target) || Boolean(target.isPermanentlyEnded) || Boolean(target.endedAt);
  if (targetAlreadyEnded) {
    const isCoreEdit = updates.title !== void 0 || updates.date !== void 0 || updates.startTime !== void 0 || updates.endTime !== void 0 || updates.category !== void 0 || updates.preacher !== void 0 || updates.leader !== void 0 || updates.preacherOrLeader !== void 0 || updates.theme !== void 0 || updates.passage !== void 0;
    const isReopenOrUnlockAttempt = updates.isOpenForAttendance === true || updates.isPermanentlyEnded === false || (updates.endedAt !== void 0 && !updates.endedAt && Boolean(target.endedAt));
    if (isCoreEdit || isReopenOrUnlockAttempt) {
      console.warn(`[STORAGE BLOCKED] Sèvis ${serviceId} fini deja epi li klotire. Li paka modifye oswa reouvri.`);
      return target;
    }
  }
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const candidateMerged = { ...target, ...updates, churchId: canonicalChurchId };
  const mergedScheduleEnded = !targetAlreadyEnded && isServiceEnded(candidateMerged);
  const safeUpdates = mergedScheduleEnded
    ? {
        ...updates,
        isOpenForAttendance: false,
        isPermanentlyEnded: true,
        endedAt: candidateMerged.endedAt || nowIso,
      }
    : updates.isOpenForAttendance === true
    ? {
        ...updates,
        wasOpenedForAttendance: true,
      }
    : updates;
  const openingThisService = !mergedScheduleEnded && safeUpdates.isOpenForAttendance === true;
  const otherOpenServiceIds: string[] = [];
  let updatedService;
  const updatedList = allServices.map((s3) => {
    const isThisChurch = s3.churchId === canonicalChurchId || churchCodeUpper && (s3.churchId || "").toUpperCase() === churchCodeUpper;
    if (isThisChurch && s3.id === serviceId) {
      updatedService = { ...s3, ...safeUpdates, churchId: canonicalChurchId };
      return updatedService;
    }
    if (openingThisService && isThisChurch && s3.isOpenForAttendance) {
      otherOpenServiceIds.push(s3.id);
      return { ...s3, isOpenForAttendance: false };
    }
    return s3;
  });
  if (updatedService) {
    saveToStorage(STORAGE_KEYS.SERVICES, updatedList);
    firestoreUpdateService(serviceId, safeUpdates).catch(
      (err) => console.warn("Firestore updateServiceSession error:", err)
    );
    if (otherOpenServiceIds.length > 0) {
      otherOpenServiceIds.forEach((otherId) => {
        firestoreUpdateService(otherId, { isOpenForAttendance: false }).catch(() => {});
      });
    }
  }
  return updatedService;
}
export function buildServiceAnnouncementContent(church, service, lang) {
  var _a3, _b3, _c2, _d2, _e3, _f2, _g2, _h2, _i2, _j2;
  const leader = (_a3 = service.leader) == null ? void 0 : _a3.trim();
  const preacher = ((_b3 = service.preacher) == null ? void 0 : _b3.trim()) || (!leader ? (_c2 = service.preacherOrLeader) == null ? void 0 : _c2.trim() : void 0);
  const compositeFallback = !leader && !preacher ? ((_d2 = service.preacherOrLeader) == null ? void 0 : _d2.trim()) || ((_e3 = church.pastor) == null ? void 0 : _e3.trim()) || "Responsab Kilt" : void 0;
  const reader = (_f2 = service.reader) == null ? void 0 : _f2.trim();
  const musicians = (_g2 = service.musicians) == null ? void 0 : _g2.trim();
  const ushers = (_h2 = service.ushers) == null ? void 0 : _h2.trim();
  const theme = (_i2 = service.theme) == null ? void 0 : _i2.trim();
  const passage = (_j2 = service.passage) == null ? void 0 : _j2.trim();
  if (lang === "fr") {
    const rolesList2 = [];
    if (leader) rolesList2.push(`👑 Dirigeant du Culte : ${leader}`);
    if (preacher) rolesList2.push(`📖 Prédicateur : ${preacher}`);
    if (compositeFallback) rolesList2.push(`👤 Dirigeant / Prédicateur : ${compositeFallback}`);
    if (reader) rolesList2.push(`📜 Lecture Biblique : ${reader}`);
    if (musicians) rolesList2.push(`🎵 Musique & Louange : ${musicians}`);
    if (ushers) rolesList2.push(`🤝 Accueil & Protocole : ${ushers}`);
    if (theme) rolesList2.push(`🏷️ Thème : ${theme}`);
    if (passage) rolesList2.push(`📖 Passage Biblique : ${passage}`);
    const rolesBlock2 = rolesList2.length > 0 ? `

📋 PROGRAMME & RESPONSABLES DU CULTE :
${rolesList2.map((r2) => `• ${r2}`).join("\n")}` : "";
    return {
      title: `🔔 Rappel Culte (24h avant) : ${service.title}`,
      content: `Chers frères et sœurs en Christ,

Nous vous rappelons avec joie la tenue du culte "${service.title}" à ${church.name}.

📅 Date du Culte : ${service.date}
⏰ Heure : ${service.startTime} - ${service.endTime}${rolesBlock2}

✨ Nous comptons chaleureusement sur votre présence ainsi que celle de toute votre famille pour adorer le Seigneur ensemble dans la communion fraternelle.

⚠️ N’oubliez pas de vous munir de votre carte de membre numérique pour l’enregistrement fluide des présences à l’entrée !`
    };
  }
  if (lang === "es") {
    const rolesList2 = [];
    if (leader) rolesList2.push(`👑 Director del Culto: ${leader}`);
    if (preacher) rolesList2.push(`📖 Predicador: ${preacher}`);
    if (compositeFallback) rolesList2.push(`👤 Director / Predicador: ${compositeFallback}`);
    if (reader) rolesList2.push(`📜 Lectura Bíblica: ${reader}`);
    if (musicians) rolesList2.push(`🎵 Música y Alabanza: ${musicians}`);
    if (ushers) rolesList2.push(`🤝 Protocolo y Bienvenida: ${ushers}`);
    if (theme) rolesList2.push(`🏷️ Tema: ${theme}`);
    if (passage) rolesList2.push(`📖 Pasaje Bíblico: ${passage}`);
    const rolesBlock2 = rolesList2.length > 0 ? `

📋 PROGRAMA Y RESPONSABLES EN SERVICIO:
${rolesList2.map((r2) => `• ${r2}`).join("\n")}` : "";
    return {
      title: `🔔 Recordatorio de Culto (24h antes): ${service.title}`,
      content: `Queridos hermanos y hermanas en Cristo,

Les recordamos cordialmente la celebración del servicio "${service.title}" en ${church.name}.

📅 Fecha del Culto: ${service.date}
⏰ Horario: ${service.startTime} - ${service.endTime}${rolesBlock2}

✨ Contamos con su valiosa presencia y la de toda su familia para alabar y exaltar juntos el nombre de nuestro Señor.

⚠️ ¡No olvide traer su tarjeta de membresía digital para el registro rápido de asistencia en la entrada!`
    };
  }
  if (lang === "en") {
    const rolesList2 = [];
    if (leader) rolesList2.push(`👑 Service Leader: ${leader}`);
    if (preacher) rolesList2.push(`📖 Preacher: ${preacher}`);
    if (compositeFallback) rolesList2.push(`👤 Leader / Preacher: ${compositeFallback}`);
    if (reader) rolesList2.push(`📜 Scripture Reading: ${reader}`);
    if (musicians) rolesList2.push(`🎵 Music & Worship: ${musicians}`);
    if (ushers) rolesList2.push(`🤝 Ushers & Hospitality: ${ushers}`);
    if (theme) rolesList2.push(`🏷️ Theme: ${theme}`);
    if (passage) rolesList2.push(`📖 Scripture Passage: ${passage}`);
    const rolesBlock2 = rolesList2.length > 0 ? `

📋 SERVICE ROSTER & MINISTRY TEAM:
${rolesList2.map((r2) => `• ${r2}`).join("\n")}` : "";
    return {
      title: `🔔 Service Reminder (24h before): ${service.title}`,
      content: `Dear brothers and sisters in Christ,

We warmly remind you of the upcoming service "${service.title}" at ${church.name}.

📅 Service Date: ${service.date}
⏰ Time: ${service.startTime} - ${service.endTime}${rolesBlock2}

✨ We look forward to worshipping the Lord together with you and your entire family in unity.

⚠️ Please remember to bring your digital membership card for seamless attendance check-in at the door!`
    };
  }
  const rolesList = [];
  if (leader) rolesList.push(`👑 Dirijan Sèvis la: ${leader}`);
  if (preacher) rolesList.push(`📖 Predikatè: ${preacher}`);
  if (compositeFallback) rolesList.push(`👤 Dirijan / Predikatè: ${compositeFallback}`);
  if (reader) rolesList.push(`📜 Lektè Pawòl la: ${reader}`);
  if (musicians) rolesList.push(`🎵 Mizisyen & Louanj: ${musicians}`);
  if (ushers) rolesList.push(`🤝 Akèy & Pwotokòl: ${ushers}`);
  if (theme) rolesList.push(`🏷️ Tèm: ${theme}`);
  if (passage) rolesList.push(`📖 Pasaj Biblik: ${passage}`);
  const rolesBlock = rolesList.length > 0 ? `

📋 EKIP & MOUN KI SOU SÈVIS NAN KILT LA:
${rolesList.map((r2) => `• ${r2}`).join("\n")}` : "";
  return {
    title: `🔔 Rapèl Kilt (24h anvan): ${service.title}`,
    content: `Chè frè ak sè nan Kris la,

N ap fè w sonje ak kè kontan gen sèvis/kilt "${service.title}" k ap fèt nan ${church.name}.

📅 Dat Kilt: ${service.date}
⏰ Lè: ${service.startTime} - ${service.endTime}${rolesBlock}

✨ Nou konte anpil sou prezans ou ak tout fanmi w pou nou adore Senyè a ansanm nan lapè ak lafwa.

⚠️ Pa bliye vini ak kat manm nimerik ou pou anrejistreman prezans rapid nan pòt la!`
  };
}
export function getLocalizedAnnouncementTitle(ann, lang) {
  if (!ann) return "";
  if (lang === "es" && ann.title_es) return ann.title_es;
  if (lang === "en" && ann.title_en) return ann.title_en;
  if (lang === "fr" && ann.title_fr) return ann.title_fr;
  if (lang === "ht" && ann.title_ht) return ann.title_ht;
  const rawTitle = ann.title || "";
  if (rawTitle.includes("Rapèl Kilt") || rawTitle.includes("Rappel Culte") || rawTitle.includes("Recordatorio de Culto") || rawTitle.includes("Service Reminder")) {
    const cleanServiceName = rawTitle.replace(/^🔔\s*/, "").replace(/^(Rapèl Kilt|Rappel Culte|Recordatorio de Culto|Service Reminder)(\s*\(.*?\))?:\s*/i, "").trim();
    if (lang === "es") return `🔔 Recordatorio de Culto (24h antes): ${cleanServiceName}`;
    if (lang === "fr") return `🔔 Rappel Culte (24h avant) : ${cleanServiceName}`;
    if (lang === "en") return `🔔 Service Reminder (24h before): ${cleanServiceName}`;
    return `🔔 Rapèl Kilt (24h anvan): ${cleanServiceName}`;
  }
  return rawTitle;
}
export function getLocalizedAnnouncementContent(ann, lang, church) {
  if (!ann) return "";
  if (lang === "es" && ann.content_es) return ann.content_es;
  if (lang === "en" && ann.content_en) return ann.content_en;
  if (lang === "fr" && ann.content_fr) return ann.content_fr;
  if (lang === "ht" && ann.content_ht) return ann.content_ht;
  const rawContent = ann.content || "";
  if ((ann.serviceId || ann.category === "sevis") && (rawContent.includes("Chè frè ak sè") || rawContent.includes("Chers frères et sœurs") || rawContent.includes("Queridos hermanos") || rawContent.includes("Dear brothers and sisters"))) {
    const dummyService = {
      id: ann.serviceId || ann.id,
      churchId: ann.churchId,
      title: (ann.title || "").replace(/^🔔\s*/, "").replace(/^(Rapèl Kilt|Rappel Culte|Recordatorio de Culto|Service Reminder)(\s*\(.*?\))?:\s*/i, "").trim(),
      date: ann.date,
      startTime: ann.time || "08:00",
      endTime: "11:00",
      preacherOrLeader: ann.leader || ann.preacher || ann.author || "Dirijan",
      leader: ann.leader,
      preacher: ann.preacher,
      reader: ann.reader,
      musicians: ann.musicians,
      ushers: ann.ushers,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const generated = buildServiceAnnouncementContent(
      church || { name: "Legliz la", pastor: ann.author },
      dummyService,
      lang
    );
    return generated.content;
  }
  return rawContent;
}
export function deduplicateAnnouncements(announcements) {
  const seenIds = /* @__PURE__ */ new Set();
  const seenServiceIds = /* @__PURE__ */ new Set();
  const seenKeys = /* @__PURE__ */ new Set();
  const result = [];
  for (const ann of announcements) {
    if (!ann || !ann.id) continue;
    if (isLegacyDemoAnnouncement(ann)) continue;
    if (seenIds.has(ann.id)) {
      continue;
    }
    if (ann.serviceId) {
      if (seenServiceIds.has(ann.serviceId)) {
        continue;
      }
      seenServiceIds.add(ann.serviceId);
    }
    const normTitle = (ann.title || "").trim().toLowerCase().replace(/^🔔\s*/, "").replace(/^(rapèl kilt|rappel culte|recordatorio de culto|service reminder)(\s*\(.*?\))?:\s*/i, "");
    const normDate = (ann.date || "").trim();
    const contentKey = `${ann.churchId}_${ann.category}_${normTitle}_${normDate}`;
    if (seenKeys.has(contentKey)) {
      continue;
    }
    seenKeys.add(contentKey);
    seenIds.add(ann.id);
    result.push(ann);
  }
  return result;
}
export function sendServiceReminderNotification(church, service) {
  let reminderDate = service.date;
  try {
    const sDate = /* @__PURE__ */ new Date(service.date + "T00:00:00");
    const dayBefore = new Date(sDate.getTime() - 24 * 60 * 60 * 1e3);
    reminderDate = dayBefore.toISOString().split("T")[0];
  } catch {
    reminderDate = service.date;
  }
  const ht2 = buildServiceAnnouncementContent(church, service, "ht");
  const fr2 = buildServiceAnnouncementContent(church, service, "fr");
  const en2 = buildServiceAnnouncementContent(church, service, "en");
  const es = buildServiceAnnouncementContent(church, service, "es");
  const allAnnouncements = loadFromStorage(
    STORAGE_KEYS.ANNOUNCEMENTS,
    INITIAL_ANNOUNCEMENTS
  );
  const existingIndex = allAnnouncements.findIndex(
    (a2) => a2.churchId === church.id && (a2.serviceId && a2.serviceId === service.id || a2.category === "sevis" && a2.date === reminderDate && a2.title.includes(service.title))
  );
  let reminderAnnouncement;
  if (existingIndex >= 0) {
    const existing = allAnnouncements[existingIndex];
    reminderAnnouncement = {
      ...existing,
      title: ht2.title,
      content: ht2.content,
      category: "sevis",
      date: reminderDate,
      time: service.startTime,
      isPinned: true,
      author: church.pastor ? `Pastè ${church.pastor}` : "Administrasyon Legliz la",
      authorType: "pastor",
      targetAudience: "Tout moun",
      showToastOnLogin: true,
      toastAlertLevel: "info",
      isScheduledNotification: true,
      scheduledNotificationDate: reminderDate,
      scheduledNotificationEndDate: service.date,
      scheduledTargetAudience: "Tout moun",
      title_ht: ht2.title,
      content_ht: ht2.content,
      title_fr: fr2.title,
      content_fr: fr2.content,
      title_en: en2.title,
      content_en: en2.content,
      title_es: es.title,
      content_es: es.content,
      serviceId: service.id,
      leader: service.leader || void 0,
      preacher: service.preacher || (!service.leader ? service.preacherOrLeader : church.pastor || void 0),
      reader: service.reader || void 0,
      musicians: service.musicians || void 0,
      ushers: service.ushers || void 0
    };
    allAnnouncements[existingIndex] = reminderAnnouncement;
    saveToStorage(STORAGE_KEYS.ANNOUNCEMENTS, deduplicateAnnouncements(allAnnouncements));
    firestoreUpdateAnnouncement(reminderAnnouncement.id, reminderAnnouncement).catch(
      (err) => console.warn("Firestore updateAnnouncement in reminder error:", err)
    );
  } else {
    reminderAnnouncement = addAnnouncement(church.id, {
      title: ht2.title,
      content: ht2.content,
      category: "sevis",
      date: reminderDate,
      time: service.startTime,
      isPinned: true,
      author: church.pastor ? `Pastè ${church.pastor}` : "Administrasyon Legliz la",
      authorType: "pastor",
      targetAudience: "Tout moun",
      showToastOnLogin: true,
      toastAlertLevel: "info",
      isScheduledNotification: true,
      scheduledNotificationDate: reminderDate,
      scheduledNotificationEndDate: service.date,
      scheduledTargetAudience: "Tout moun",
      title_ht: ht2.title,
      content_ht: ht2.content,
      title_fr: fr2.title,
      content_fr: fr2.content,
      title_en: en2.title,
      content_en: en2.content,
      title_es: es.title,
      content_es: es.content,
      serviceId: service.id,
      leader: service.leader || void 0,
      preacher: service.preacher || (!service.leader ? service.preacherOrLeader : church.pastor || void 0),
      reader: service.reader || void 0,
      musicians: service.musicians || void 0,
      ushers: service.ushers || void 0
    });
  }
  const alreadyMarkedReminded = Boolean(service.sendReminder24h && service.reminderSentAt);
  const updatedService = alreadyMarkedReminded
    ? service
    : updateServiceSession(church.id, service.id, {
        sendReminder24h: true,
        reminderSentAt: (/* @__PURE__ */ new Date()).toISOString()
      }) || {
        ...service,
        sendReminder24h: true,
        reminderSentAt: (/* @__PURE__ */ new Date()).toISOString()
      };
  return { announcement: reminderAnnouncement, updatedService };
}
export function getAnnouncementsByChurch(churchId) {
  if (!churchId || !churchId.trim()) return [];
  const cleanId = churchId.trim();
  const church = getChurchById(cleanId);
  const targetId = church ? church.id : cleanId;
  const targetCode = (church == null ? void 0 : church.code) ? church.code.trim().toUpperCase() : "";
  const allAnnouncements = loadFromStorage(
    STORAGE_KEYS.ANNOUNCEMENTS,
    INITIAL_ANNOUNCEMENTS
  );
  const churchAnnouncements = allAnnouncements.filter((a2) => {
    if (!a2 || isLegacyDemoAnnouncement(a2) || isAnnouncementMarkedDeleted(a2.id)) return false;
    const aCh = (a2.churchId || "").trim().toUpperCase();
    if (!aCh) return false;
    return aCh === targetId.toUpperCase() || targetCode && aCh === targetCode;
  });
  const deduplicated = deduplicateAnnouncements(churchAnnouncements);
  return deduplicated.sort((a2, b2) => {
    if (a2.isPinned && !b2.isPinned) return -1;
    if (!a2.isPinned && b2.isPinned) return 1;
    return resolveTimestampMs(b2.createdAt, b2.date) - resolveTimestampMs(a2.createdAt, a2.date);
  });
}

export function formatAnnouncementTimestamp(
  createdAt: any,
  fallbackDate?: string,
  fallbackTime?: string,
  language: Language = "ht"
): string {
  let ms = resolveTimestampMs(createdAt, undefined);
  let hasExplicitTime = ms > 0;

  if (!ms && fallbackDate) {
    if (fallbackTime && /^\d{1,2}:\d{2}/.test(fallbackTime.trim())) {
      const parsed = Date.parse(`${fallbackDate}T${fallbackTime.trim()}:00`);
      if (!Number.isNaN(parsed)) {
        ms = parsed;
        hasExplicitTime = true;
      }
    }
    if (!ms) {
      const parsed = Date.parse(fallbackDate.length === 10 ? `${fallbackDate}T12:00:00` : fallbackDate);
      if (!Number.isNaN(parsed)) {
        ms = parsed;
      }
    }
  }

  if (!ms) {
    return fallbackDate || "";
  }

  const d = new Date(ms);
  const now = new Date();
  const isSameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();

  const mm = d.getMinutes().toString().padStart(2, "0");

  const hours12 = d.getHours() % 12 || 12;
  const ampm = d.getHours() >= 12 ? "PM" : "AM";
  let formattedFallback12 = fallbackTime || "";
  const fbMatch = (fallbackTime || "").trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (fbMatch) {
    const fbH = parseInt(fbMatch[1], 10);
    const fbMin = fbMatch[2];
    const explicitPeriod = fbMatch[3]?.toUpperCase();
    if (explicitPeriod) {
      const normalizedH = fbH === 0 ? 12 : fbH > 12 ? (fbH % 12 || 12) : fbH;
      formattedFallback12 = `${normalizedH}:${fbMin} ${explicitPeriod}`;
    } else if (fbH >= 0 && fbH <= 23) {
      const fbAmpm = fbH >= 12 ? "PM" : "AM";
      const fbH12 = fbH % 12 || 12;
      formattedFallback12 = `${fbH12}:${fbMin} ${fbAmpm}`;
    }
  }
  const time12 = fallbackTime && !hasExplicitTime
    ? formattedFallback12
    : `${hours12}:${mm} ${ampm}`;

  const todayWord =
    language === "fr"
      ? "Aujourd'hui"
      : language === "en"
      ? "Today"
      : language === "es"
      ? "Hoy"
      : "Jodi a";
  const yesterdayWord =
    language === "fr"
      ? "Hier"
      : language === "en"
      ? "Yesterday"
      : language === "es"
      ? "Ayer"
      : "Yè";

  if (isSameDay) {
    return `${todayWord} • ${time12}`;
  }
  if (isYesterday) {
    return `${yesterdayWord} • ${time12}`;
  }

  const monthsHt = ["Jan", "Fev", "Mas", "Avr", "Me", "Jen", "Jiy", "Out", "Sep", "Okt", "Nov", "Des"];
  const monthsFr = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
  const monthsEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthsEs = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const monthNames =
    language === "fr"
      ? monthsFr
      : language === "en"
      ? monthsEn
      : language === "es"
      ? monthsEs
      : monthsHt;

  const dayStr = d.getDate().toString().padStart(2, "0");
  const monthStr = monthNames[d.getMonth()] || "Jan";
  const yearStr = d.getFullYear();

  return `${dayStr} ${monthStr} ${yearStr} • ${time12}`;
}
export function addAnnouncement(churchId, data) {
  const cleanId = churchId.trim();
  const church = getChurchById(cleanId);
  const canonicalChurchId = church ? church.id : cleanId;
  const allAnnouncements = loadFromStorage(
    STORAGE_KEYS.ANNOUNCEMENTS,
    INITIAL_ANNOUNCEMENTS
  );
  if (data.serviceId) {
    const existingIndex = allAnnouncements.findIndex(
      (a2) => a2.churchId === canonicalChurchId && a2.serviceId === data.serviceId
    );
    if (existingIndex >= 0) {
      const existing = allAnnouncements[existingIndex];
      const updated = {
        ...existing,
        ...data,
        churchId: canonicalChurchId
      };
      allAnnouncements[existingIndex] = updated;
      const cleanList2 = deduplicateAnnouncements(allAnnouncements);
      saveToStorage(STORAGE_KEYS.ANNOUNCEMENTS, cleanList2);
      firestoreUpdateAnnouncement(updated.id, updated).catch(
        (err) => console.warn("Firestore updateAnnouncement in addAnnouncement error:", err)
      );
      return updated;
    }
  }
  let preparedData = { ...data };
  if (!preparedData.title_fr && !preparedData.title_en && !preparedData.title_es && (preparedData.serviceId || preparedData.category === "sevis")) {
    const churchInfo = church || { name: "Legliz la", pastor: preparedData.author };
    const dummyService = {
      id: preparedData.serviceId || `srv-${Date.now()}`,
      title: preparedData.title.replace(/^🔔\s*/, "").replace(/^(Rapèl Kilt|Rappel Culte|Recordatorio de Culto|Service Reminder)(\s*\(.*?\))?:\s*/i, "").trim(),
      date: preparedData.date,
      startTime: preparedData.time || "08:00",
      endTime: "11:00",
      preacherOrLeader: preparedData.leader || preparedData.preacher || preparedData.author || "Dirijan",
      leader: preparedData.leader,
      preacher: preparedData.preacher,
      reader: preparedData.reader,
      musicians: preparedData.musicians,
      ushers: preparedData.ushers,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const ht2 = buildServiceAnnouncementContent(churchInfo, dummyService, "ht");
    const fr2 = buildServiceAnnouncementContent(churchInfo, dummyService, "fr");
    const en2 = buildServiceAnnouncementContent(churchInfo, dummyService, "en");
    const es = buildServiceAnnouncementContent(churchInfo, dummyService, "es");
    preparedData = {
      ...preparedData,
      title_ht: preparedData.title_ht || ht2.title,
      content_ht: preparedData.content_ht || ht2.content,
      title_fr: preparedData.title_fr || fr2.title,
      content_fr: preparedData.content_fr || fr2.content,
      title_en: preparedData.title_en || en2.title,
      content_en: preparedData.content_en || en2.content,
      title_es: preparedData.title_es || es.title,
      content_es: preparedData.content_es || es.content
    };
  }
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const resolvedAuthorName = (
    preparedData.authorName ||
    preparedData.author ||
    (church && church.pastor) ||
    "Admin"
  ).trim();
  const resolvedPoster = preparedData.posterUrl || preparedData.imageUrl || null;
  const newAnnouncement = {
    id: `ann-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    churchId: canonicalChurchId,
    department: (preparedData.department || "Depatman Administrasyon").trim(),
    category: preparedData.category || "anons",
    targetAudience: preparedData.targetAudience || "Tout moun",
    isPinned: Boolean(preparedData.isPinned),
    showToastOnLogin: Boolean(preparedData.showToastOnLogin),
    toastAlertLevel: preparedData.toastAlertLevel || "info",
    isScheduledNotification: Boolean(preparedData.isScheduledNotification),
    scheduledNotificationDate: preparedData.scheduledNotificationDate || null,
    posterUrl: resolvedPoster,
    imageUrl: resolvedPoster,
    serviceId: preparedData.serviceId || null,
    authorId: preparedData.authorId || (church && church.adminGoogleUid) || `admin_${canonicalChurchId}`,
    authorName: resolvedAuthorName,
    author: preparedData.author || resolvedAuthorName,
    reactionsCount: typeof preparedData.reactionsCount === "number" ? preparedData.reactionsCount : 0,
    commentsCount: typeof preparedData.commentsCount === "number" ? preparedData.commentsCount : 0,
    createdAt: preparedData.createdAt || nowIso,
    updatedAt: nowIso,
    ...preparedData,
  };
  const cleanList = deduplicateAnnouncements([newAnnouncement, ...allAnnouncements]);
  markPendingLocalUpload("announcement", newAnnouncement.id);
  saveToStorage(STORAGE_KEYS.ANNOUNCEMENTS, cleanList);
  firestoreAddAnnouncement(newAnnouncement, { fanOutNotification: true })
    .then(() => clearPendingLocalUpload("announcement", newAnnouncement.id))
    .catch((err) => console.warn("Firestore addAnnouncement error:", err));
  return newAnnouncement;
}
export function toggleAnnouncementToastAlert(churchId, announcementId, showToast) {
  const cleanId = churchId.trim();
  const church = getChurchById(cleanId);
  const canonicalChurchId = church ? church.id : cleanId;
  const churchCodeUpper = ((church == null ? void 0 : church.code) || "").toUpperCase();
  const allAnnouncements = loadFromStorage(
    STORAGE_KEYS.ANNOUNCEMENTS,
    INITIAL_ANNOUNCEMENTS
  );
  const index = allAnnouncements.findIndex(
    (a2) => a2.id === announcementId && (a2.churchId === canonicalChurchId || churchCodeUpper && (a2.churchId || "").toUpperCase() === churchCodeUpper)
  );
  if (index >= 0) {
    allAnnouncements[index].showToastOnLogin = showToast;
    saveToStorage(STORAGE_KEYS.ANNOUNCEMENTS, allAnnouncements);
    firestoreUpdateAnnouncement(announcementId, { showToastOnLogin: showToast }).catch(
      (err) => console.warn("Firestore toggleAnnouncementToastAlert error:", err)
    );
  }
}
export function updateAnnouncementSchedule(churchId, announcementId, scheduleData) {
  const cleanId = churchId.trim();
  const church = getChurchById(cleanId);
  const canonicalChurchId = church ? church.id : cleanId;
  const churchCodeUpper = ((church == null ? void 0 : church.code) || "").toUpperCase();
  const allAnnouncements = loadFromStorage(
    STORAGE_KEYS.ANNOUNCEMENTS,
    INITIAL_ANNOUNCEMENTS
  );
  const index = allAnnouncements.findIndex(
    (a2) => a2.id === announcementId && (a2.churchId === canonicalChurchId || churchCodeUpper && (a2.churchId || "").toUpperCase() === churchCodeUpper)
  );
  if (index >= 0) {
    allAnnouncements[index] = {
      ...allAnnouncements[index],
      ...scheduleData
    };
    saveToStorage(STORAGE_KEYS.ANNOUNCEMENTS, allAnnouncements);
    firestoreUpdateAnnouncement(announcementId, scheduleData).catch(
      (err) => console.warn("Firestore updateAnnouncementSchedule error:", err)
    );
  }
}
export function pruneAnnouncementInteractionsByTarget(targetId: string) {
  const cleanTarget = (targetId || "").trim();
  if (!cleanTarget) return;
  const stored = getAnnouncementInteractions();
  if (stored[cleanTarget]) {
    delete stored[cleanTarget];
    saveToStorage(STORAGE_KEYS.ANNOUNCEMENT_INTERACTIONS, stored);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("omnichurch_interactions_updated", { detail: stored }));
    }
  }
}
export function syncLocalCommentsFromServerSnapshot(
  churchId: string,
  remoteComments: AnnouncementComment[],
  meta?: SnapshotSyncMeta
) {
  const stored = getAnnouncementInteractions();
  const hasPendingWrites = Boolean(meta?.hasPendingWrites);
  const isAuthoritative = Boolean(meta && !meta.fromCache && !hasPendingWrites);
  let changed = false;

  if (!hasPendingWrites && Array.isArray(meta?.removedIds) && meta!.removedIds!.length > 0) {
    const removedSet = new Set(meta!.removedIds!);
    for (const targetKey of Object.keys(stored)) {
      const bucket = stored[targetKey];
      if (bucket && Array.isArray(bucket.comments)) {
        const beforeLen = bucket.comments.length;
        bucket.comments = bucket.comments.filter((c) => !removedSet.has(c.id));
        if (bucket.comments.length !== beforeLen) changed = true;
      }
    }
  }

  if (isAuthoritative) {
    const remoteIdsByTarget = new Map<string, Set<string>>();
    const remoteByTarget = new Map<string, AnnouncementComment[]>();
    for (const rc of remoteComments) {
      const tid = (rc.targetId || rc.announcementId || "").trim();
      if (!tid) continue;
      if (!remoteIdsByTarget.has(tid)) {
        remoteIdsByTarget.set(tid, new Set());
        remoteByTarget.set(tid, []);
      }
      remoteIdsByTarget.get(tid)!.add(rc.id);
      remoteByTarget.get(tid)!.push(rc);
    }

    // Remove locally cached comments for this church that no longer exist on Firestore server
    for (const targetKey of Object.keys(stored)) {
      const bucket = stored[targetKey];
      if (!bucket || !Array.isArray(bucket.comments)) continue;
      const before = bucket.comments.length;
      bucket.comments = bucket.comments.filter((c) => {
        const matchesThisChurch =
          !c.churchId || c.churchId.trim().toUpperCase() === churchId.trim().toUpperCase();
        if (!matchesThisChurch) return true;
        const setForTarget = remoteIdsByTarget.get(targetKey);
        return Boolean(setForTarget && setForTarget.has(c.id));
      });
      if (bucket.comments.length !== before) changed = true;
    }

    // Upsert live server comments into local cache so subsequent reloads/Dev tab never see stale versions
    remoteByTarget.forEach((list, tid) => {
      const current = stored[tid] || { likes: 0, userLiked: false, comments: [] };
      const prevIds = (current.comments || []).map((c) => `${c.id}:${c.content || c.text}`).join("|");
      const nextIds = list.map((c) => `${c.id}:${c.content || c.text}`).join("|");
      if (prevIds !== nextIds) {
        stored[tid] = { ...current, comments: list };
        changed = true;
      }
    });
  }

  if (changed) {
    saveToStorage(STORAGE_KEYS.ANNOUNCEMENT_INTERACTIONS, stored);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("omnichurch_interactions_updated", { detail: stored }));
    }
  }
}
export function deleteAnnouncement(churchId, announcementId) {
  const cleanId = churchId.trim();
  markAnnouncementAsDeleted(announcementId);
  const church = getChurchById(cleanId);
  const canonicalChurchId = church ? church.id : cleanId;
  const churchCodeUpper = ((church == null ? void 0 : church.code) || "").toUpperCase();
  const allAnnouncements = loadFromStorage(
    STORAGE_KEYS.ANNOUNCEMENTS,
    INITIAL_ANNOUNCEMENTS
  );
  const filtered = allAnnouncements.filter(
    (a2) => !(a2.id === announcementId && (a2.churchId === canonicalChurchId || churchCodeUpper && (a2.churchId || "").toUpperCase() === churchCodeUpper))
  );
  saveToStorage(STORAGE_KEYS.ANNOUNCEMENTS, filtered);
  pruneAnnouncementInteractionsByTarget(announcementId);
  firestoreDeleteAnnouncement(announcementId).catch(
    (err) => console.warn("Firestore deleteAnnouncement error:", err)
  );
}
export function getAnnouncementInteractions(churchId?: string): Record<string, AnnouncementInteractionData> {
  const stored = loadFromStorage(
    STORAGE_KEYS.ANNOUNCEMENT_INTERACTIONS,
    {}
  );
  return stored;
}
export function saveAnnouncementInteraction(announcementId: string, data: Partial<AnnouncementInteractionData>, churchId?: string) {
  const stored = getAnnouncementInteractions();
  const existing = stored[announcementId] || {
    likes: 0,
    userLiked: false,
    reaction: void 0,
    comments: []
  };
  stored[announcementId] = {
    ...existing,
    ...data
  };
  saveToStorage(STORAGE_KEYS.ANNOUNCEMENT_INTERACTIONS, stored);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("omnichurch_interactions_updated", { detail: stored }));
  }
}
export function addAnnouncementComment(announcementId, comment) {
  const stored = getAnnouncementInteractions();
  const existing = stored[announcementId] || {
    likes: 0,
    userLiked: false,
    comments: []
  };
  const cleanExisting = Array.isArray(existing.comments) ? existing.comments : [];
  const nowMs = Date.now();
  const recentDuplicate = cleanExisting.find(
    (c3) => (c3.author || "").trim().toLowerCase() === (comment.author || "").trim().toLowerCase() && (c3.text || "").trim() === (comment.text || "").trim() && nowMs - new Date(c3.createdAt || 0).getTime() < 5e3
  );
  if (recentDuplicate) {
    return recentDuplicate;
  }
  const resolvedAuthor = (comment.userName || comment.author || "Manm Legliz").trim();
  const resolvedText = (comment.content || comment.text || "").trim();
  const newComment = {
    id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    targetId: announcementId,
    announcementId,
    churchId: comment.churchId,
    userId: comment.userId || resolvedAuthor,
    userName: resolvedAuthor,
    userPhotoUrl: comment.userPhotoUrl || null,
    content: resolvedText,
    author: resolvedAuthor,
    text: resolvedText,
    time: comment.time || `${(/* @__PURE__ */ new Date()).getHours().toString().padStart(2, "0")}:${(/* @__PURE__ */ new Date()).getMinutes().toString().padStart(2, "0")}`,
    avatarInitials: comment.avatarInitials || resolvedAuthor.substring(0, 2).toUpperCase(),
    isDemo: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const seenIds = /* @__PURE__ */ new Set();
  const dedupedExisting = cleanExisting.filter((c3) => {
    if (seenIds.has(c3.id)) return false;
    seenIds.add(c3.id);
    return true;
  });
  const updatedComments = [...dedupedExisting, newComment];
  stored[announcementId] = {
    ...existing,
    comments: updatedComments
  };
  saveToStorage(STORAGE_KEYS.ANNOUNCEMENT_INTERACTIONS, stored);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("omnichurch_interactions_updated", { detail: stored }));
  }
  return newComment;
}
export function updateAnnouncementCommentContentLocally(
  commentId: string,
  newContent: string = "[Kòmantè modere pa Administrasyon an]"
): boolean {
  const stored = getAnnouncementInteractions();
  let updated = false;
  const cleanText = (newContent || "[Kòmantè modere pa Administrasyon an]").trim().slice(0, 1000);
  for (const annId of Object.keys(stored)) {
    const interaction = stored[annId];
    if (interaction && Array.isArray(interaction.comments)) {
      interaction.comments = interaction.comments.map((c3) => {
        if (c3.id === commentId) {
          updated = true;
          return {
            ...c3,
            content: cleanText,
            text: cleanText
          };
        }
        return c3;
      });
    }
  }
  if (updated) {
    saveToStorage(STORAGE_KEYS.ANNOUNCEMENT_INTERACTIONS, stored);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("omnichurch_interactions_updated", { detail: stored }));
    }
  }
  return updated;
}
export function deleteAnnouncementComment(commentId) {
  const stored = getAnnouncementInteractions();
  let found = false;
  for (const annId of Object.keys(stored)) {
    const interaction = stored[annId];
    if (interaction && Array.isArray(interaction.comments)) {
      const initialLen = interaction.comments.length;
      interaction.comments = interaction.comments.filter((c3) => c3.id !== commentId);
      if (interaction.comments.length < initialLen) {
        found = true;
      }
    }
  }
  if (found) {
    saveToStorage(STORAGE_KEYS.ANNOUNCEMENT_INTERACTIONS, stored);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("omnichurch_interactions_updated", { detail: stored }));
    }
  }
  return found;
}
export function purgeDemoComments() {
  const stored = getAnnouncementInteractions();
  let purgedCount = 0;
  for (const annId of Object.keys(stored)) {
    const interaction = stored[annId];
    if (interaction && Array.isArray(interaction.comments)) {
      const initialLen = interaction.comments.length;
      const uniqueComments = [];
      const seenIds = /* @__PURE__ */ new Set();
      interaction.comments.forEach((c3) => {
        const cid = c3 && typeof c3.id === "string" ? c3.id : "";
        const cauthor = c3 && typeof c3.author === "string" ? c3.author : "";
        if (!c3 || c3.isDemo || cid === "c1" || cid === "c2" || cid.startsWith("comm_demo") || cid.startsWith("demo_") || cauthor.includes("Hna.") || cauthor.includes("Hno.") || cauthor.includes("Carmel") || cauthor.includes("Baptiste") || cauthor.includes("Samuel Pierre")) {
          return;
        }
        if (seenIds.has(c3.id)) {
          return;
        }
        const isDuplicateContent = uniqueComments.some(
          (u2) => (u2.author || "").trim().toLowerCase() === (c3.author || "").trim().toLowerCase() && (u2.text || "").trim() === (c3.text || "").trim()
        );
        if (isDuplicateContent) {
          return;
        }
        seenIds.add(c3.id);
        uniqueComments.push(c3);
      });
      interaction.comments = uniqueComments;
      purgedCount += initialLen - interaction.comments.length;
    }
  }
  if (purgedCount > 0) {
    saveToStorage(STORAGE_KEYS.ANNOUNCEMENT_INTERACTIONS, stored);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("omnichurch_interactions_updated", { detail: stored }));
    }
  }
  return { purgedCount };
}
export function getAllStoredComments() {
  const stored = getAnnouncementInteractions();
  const allAnnouncements = loadFromStorage(STORAGE_KEYS.ANNOUNCEMENTS, INITIAL_ANNOUNCEMENTS);
  const allServices = loadFromStorage(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
  const allChurches = getAllChurches();
  const all = [];
  for (const annId of Object.keys(stored)) {
    if (stored[annId] && Array.isArray(stored[annId].comments)) {
      const parentAnn = allAnnouncements.find((a2) => a2.id === annId);
      const parentSrv = !parentAnn ? allServices.find((s2) => s2.id === annId || s2.id === annId.replace(/^srv-feed-/, "")) : void 0;
      const resolvedChurchId = (parentAnn == null ? void 0 : parentAnn.churchId) || (parentSrv == null ? void 0 : parentSrv.churchId);
      const parentChurch = resolvedChurchId ? allChurches.find((c3) => c3.id === resolvedChurchId) : void 0;
      for (const comm of stored[annId].comments) {
        const commChurch = !parentChurch && comm.churchId ? allChurches.find((c3) => c3.id === comm.churchId) : parentChurch;
        all.push({
          ...comm,
          targetId: comm.targetId || comm.announcementId || annId,
          announcementId: comm.announcementId || comm.targetId || annId,
          userId: comm.userId || comm.memberId || comm.authorMemberId || comm.author || "member",
          userName: comm.userName || comm.author || "Manm",
          content: comm.content || comm.text || "",
          text: comm.content || comm.text || "",
          announcementTitle:
            (parentAnn == null ? void 0 : parentAnn.title) ||
            (parentSrv == null ? void 0 : parentSrv.title) ||
            comm.announcementTitle ||
            `Cible #${annId.slice(0, 8)}`,
          churchId: comm.churchId || resolvedChurchId || "",
          churchName:
            (commChurch == null ? void 0 : commChurch.name) ||
            comm.churchName ||
            (comm.churchId ? `Legliz #${comm.churchId.slice(0, 6)}` : "OmniChurch")
        });
      }
    }
  }
  return all.sort((a2, b2) => new Date(b2.createdAt || 0).getTime() - new Date(a2.createdAt || 0).getTime());
}
export function parseScanToken(rawText) {
  const sanitized = (rawText || "")
    .replace(/[\u0000-\u001F\u007F]+/g, "")
    .trim();
  if (!sanitized) return { memberId: "" };

  // Support JSON-encoded QR payloads (e.g. {"churchId":"CH001","memberId":"CH001-1234"})
  if (sanitized.startsWith("{") && sanitized.endsWith("}")) {
    try {
      const obj = JSON.parse(sanitized);
      if (obj && typeof obj === "object") {
        const jMember = (obj.memberId || obj.member || obj.memberCode || obj.id || "").toString().trim();
        const jChurch = (obj.churchId || obj.church || obj.c || "").toString().trim();
        if (jMember) {
          return {
            churchId: jChurch || void 0,
            memberId: jMember
          };
        }
      }
    } catch {
      // Ignore malformed JSON and continue to URL / token parsers
    }
  }

  // Support standard & hash-routed verification URLs or query fragments
  if (
    sanitized.includes("verify") ||
    sanitized.startsWith("http://") ||
    sanitized.startsWith("https://") ||
    sanitized.startsWith("?")
  ) {
    try {
      const normalizedUrl = sanitized.startsWith("http")
        ? sanitized
        : `https://dummy.local/${sanitized.replace(/^\/?/, "")}`;
      const url = new URL(normalizedUrl);
      const hashQueryIdx = url.hash.indexOf("?");
      const hashParams = hashQueryIdx >= 0 ? new URLSearchParams(url.hash.slice(hashQueryIdx + 1)) : null;
      const c3 =
        url.searchParams.get("church") ||
        url.searchParams.get("churchId") ||
        url.searchParams.get("c") ||
        hashParams?.get("church") ||
        hashParams?.get("churchId") ||
        hashParams?.get("c");
      const m2 =
        url.searchParams.get("member") ||
        url.searchParams.get("memberId") ||
        url.searchParams.get("m") ||
        url.searchParams.get("verify_member") ||
        url.searchParams.get("id") ||
        hashParams?.get("member") ||
        hashParams?.get("memberId") ||
        hashParams?.get("m") ||
        hashParams?.get("verify_member") ||
        hashParams?.get("id");
      if (m2) {
        return {
          churchId: c3 ? decodeURIComponent(c3).trim() : void 0,
          memberId: decodeURIComponent(m2).trim()
        };
      }
    } catch {
      const churchMatch = sanitized.match(/[?&](?:church|churchId|c)=([^&#]+)/i);
      const memberMatch = sanitized.match(/[?&](?:member|memberId|m|verify_member|id)=([^&#]+)/i);
      if (memberMatch) {
        return {
          churchId: churchMatch ? decodeURIComponent(churchMatch[1].trim()) : void 0,
          memberId: decodeURIComponent(memberMatch[1].trim())
        };
      }
    }
  }

  // Canonical pipe token: CHURCH:{churchId}|MEMBER:{memberId}
  if (/CHURCH:/i.test(sanitized) && /MEMBER:/i.test(sanitized)) {
    const churchMatch = sanitized.match(/CHURCH:\s*([^|;\s]+)/i);
    const memberMatch = sanitized.match(/MEMBER:\s*([^|;\s]+)/i);
    return {
      churchId: churchMatch ? churchMatch[1].trim() : void 0,
      memberId: memberMatch ? memberMatch[1].trim() : void 0
    };
  }

  // Prefixed Member IDs e.g. "EVG-0042" or "CAP-2026-0009" (skip internal document prefixes)
  const lower = sanitized.toLowerCase();
  if (
    sanitized.includes("-") &&
    !lower.startsWith("m-") &&
    !lower.startsWith("mem-") &&
    !lower.startsWith("mem_") &&
    !lower.startsWith("srv-") &&
    !lower.startsWith("ann-") &&
    !lower.startsWith("att-")
  ) {
    const parts = sanitized.split("-");
    if (parts.length >= 2 && parts[0].length >= 2) {
      return {
        churchId: parts[0].trim(),
        memberId: sanitized
      };
    }
  }
  return { memberId: sanitized };
}
export function recordAttendanceScan(params) {
  const { currentChurchId, rawCode, method = "qr_scan", recordedBy = "Scanner Entrée" } = params;
  const church = getChurchById(currentChurchId);
  const canonicalChurchId = church ? church.id : currentChurchId.trim();
  const validTenantIdentifiers = /* @__PURE__ */ new Set([
    canonicalChurchId.toUpperCase(),
    currentChurchId.trim().toUpperCase(),
    ...(church == null ? void 0 : church.code) ? [church.code.trim().toUpperCase()] : []
  ]);
  const services = getServicesByChurch(canonicalChurchId);
  const targetService = params.serviceId
    ? services.find((s3) => s3.id === params.serviceId)
    : services.find((s3) => isServiceCurrentlyActive(s3, isServiceEnded));
  if (!targetService) {
    const waitingService = services.find(
      (s3) => Boolean(s3.isOpenForAttendance) && !s3.isPermanentlyEnded && !isServiceEnded(s3) && isServiceBeforeStart(s3)
    );
    playErrorBeep();
    if (waitingService) {
      return {
        success: false,
        errorMessage: `Sèvis « ${waitingService.title} » poko kòmanse (ap kòmanse a ${waitingService.startTime || ''}). Okenn prezans pa kapab verifye anvan lè sèvis la.`
      };
    }
    return {
      success: false,
      errorMessage: "Pa gen okenn sèvis ki louvri pou prezans kounye a nan legliz sa a."
    };
  }
  if (isServiceEnded(targetService) || targetService.isPermanentlyEnded) {
    playErrorBeep();
    return {
      success: false,
      errorMessage: "Sèvis sa a deja fini oswa lè li pase — li paka resevwa prezans ankò."
    };
  }
  if (isServiceBeforeStart(targetService)) {
    playErrorBeep();
    return {
      success: false,
      errorMessage: `Sèvis « ${targetService.title} » poko kòmanse (lè kòmansman: ${targetService.startTime || ''}). Okenn prezans pa kapab verifye oswa eskane anvan lè sèvis la.`
    };
  }
  if (!isServiceCurrentlyActive(targetService, isServiceEnded)) {
    playErrorBeep();
    return {
      success: false,
      errorMessage: "Sèvis sa a fèmen pou prezans kounye a. Louvri li anvan ou verifye prezans."
    };
  }
  const parsed = parseScanToken(rawCode);
  const memberCode = (parsed.memberId || rawCode).trim();
  const isCrossChurchToken = Boolean(
    parsed.churchId && !validTenantIdentifiers.has(parsed.churchId.trim().toUpperCase())
  );

  const churchMembers = getMembersByChurch(canonicalChurchId);
  let matchedMember = churchMembers.find(
    (m2) =>
      m2.memberId.toUpperCase() === memberCode.toUpperCase() ||
      (m2.barcodeToken || "").toUpperCase() === rawCode.trim().toUpperCase() ||
      m2.id === rawCode.trim()
  );

  let homeChurch: Church | undefined = undefined;
  let isCrossChurchVisitor = false;

  if (!matchedMember && isCrossChurchToken && parsed.churchId) {
    // Read-only cross-church Visitor lookup (never mutates origin or host member collections)
    homeChurch = getChurchByIdOrCode(parsed.churchId);
    const originIdUpper = parsed.churchId.trim().toUpperCase();
    const originMembers = homeChurch
      ? getMembersByChurch(homeChurch.id)
      : loadFromStorage<Member[]>(STORAGE_KEYS.MEMBERS, []).filter(
          (m2) =>
            m2 &&
            !isLegacyDemoMember(m2) &&
            !isMemberMarkedDeleted(m2) &&
            (m2.churchId || "").trim().toUpperCase() === originIdUpper
        );
    matchedMember = originMembers.find(
      (m2) =>
        (m2.memberId || "").toUpperCase() === memberCode.toUpperCase() ||
        (m2.barcodeToken || "").toUpperCase() === rawCode.trim().toUpperCase() ||
        m2.id === rawCode.trim()
    );
    if (matchedMember && matchedMember.churchId.trim().toUpperCase() !== canonicalChurchId.trim().toUpperCase()) {
      isCrossChurchVisitor = true;
      if (!homeChurch) {
        homeChurch = getChurchByIdOrCode(matchedMember.churchId);
      }
    }
  }

  if (!matchedMember) {
    playErrorBeep();
    return {
      success: false,
      errorMessage: isCrossChurchToken
        ? `Kòd manm "${memberCode}" nan legliz "${parsed.churchId}" pa jwenn nan baz done lokal la.`
        : `Kòd manm "${memberCode}" pa jwenn nan lis manm legliz sa a.`
    };
  }

  const isLocalVisitor = !isCrossChurchVisitor && isVisitorMember(matchedMember);
  const isVisitor = isCrossChurchVisitor || isLocalVisitor;

  const allAttendance = loadFromStorage(
    STORAGE_KEYS.ATTENDANCE,
    INITIAL_ATTENDANCE
  );
  const existingRecord = allAttendance.find(
    (att) => (att.churchId === canonicalChurchId || validTenantIdentifiers.has((att.churchId || "").trim().toUpperCase())) && att.serviceId === targetService.id && (att.memberId.toUpperCase() === matchedMember.memberId.toUpperCase() || att.memberDbId === matchedMember.id)
  );
  if (existingRecord) {
    playDuplicateWarningBeep();
    return {
      success: false,
      duplicate: true,
      isVisitor,
      homeChurchId: existingRecord.homeChurchId || (isCrossChurchVisitor ? matchedMember.churchId : void 0),
      homeChurchName: existingRecord.homeChurchName || (isCrossChurchVisitor ? (homeChurch?.name || parsed.churchId) : void 0),
      record: existingRecord,
      member: matchedMember,
      service: targetService,
      errorMessage: `Présence déjà enregistrée pour ce service à ${new Date(
        existingRecord.timestamp
      ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`
    };
  }
  let attendanceStatus: "on_time" | "late" | "excused" = "on_time";
  let lateMinutes = 0;
  const toleranceMinutes = targetService.lateToleranceMinutes ?? 15;
  if (targetService.startTime) {
    try {
      const now2 = /* @__PURE__ */ new Date();
      const [startHourStr, startMinStr] = targetService.startTime.split(":");
      if (startHourStr !== void 0 && startMinStr !== void 0) {
        const serviceDateStr = targetService.date || formatLocalDateYmd(now2);
        const [year, month, day] = serviceDateStr.split("-").map((v3) => parseInt(v3, 10));
        const scheduledTime = new Date(year, month - 1, day, parseInt(startHourStr, 10), parseInt(startMinStr, 10), 0, 0);
        const diffMs = now2.getTime() - scheduledTime.getTime();
        const diffMins = Math.floor(diffMs / (1e3 * 60));
        if (diffMins > toleranceMinutes) {
          attendanceStatus = "late";
          lateMinutes = diffMins;
        } else {
          attendanceStatus = "on_time";
          lateMinutes = 0;
        }
      }
    } catch (e3) {
      console.warn("Lateness calculation note:", e3);
    }
  }
  const newRecord: AttendanceRecord = {
    id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    churchId: canonicalChurchId,
    hostChurchName: church?.name || canonicalChurchId,
    serviceId: targetService.id,
    serviceCategory: targetService.category,
    serviceTitle: targetService.title,
    serviceDate: targetService.date || formatLocalDateYmd(),
    memberId: matchedMember.memberId,
    memberDbId: matchedMember.id,
    memberName: matchedMember.fullName,
    memberPhone: matchedMember.phone,
    memberDepartment: matchedMember.department,
    barcodeToken: matchedMember.barcodeToken,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    checkInMethod: method,
    recordedBy,
    attendanceStatus,
    lateMinutes,
    lateToleranceMinutes: toleranceMinutes,
    attendanceRole: isVisitor ? "visitor" : "member",
    isVisitor,
    ...(isCrossChurchVisitor
      ? {
          homeChurchId: matchedMember.churchId,
          homeChurchName: homeChurch?.name || parsed.churchId || matchedMember.churchId,
        }
      : {}),
  };
  allAttendance.unshift(newRecord);
  markPendingLocalUpload("attendance", newRecord.id);
  saveToStorage(STORAGE_KEYS.ATTENDANCE, allAttendance);
  if (!isCrossChurchVisitor) {
    try {
      const existingAbsences = loadFromStorage(STORAGE_KEYS.ABSENCES, []);
      const remainingAbsences = existingAbsences.filter(
        (abs) => !((abs.churchId === canonicalChurchId || validTenantIdentifiers.has((abs.churchId || "").trim().toUpperCase())) && abs.serviceId === targetService.id && (abs.memberId.toUpperCase() === matchedMember.memberId.toUpperCase() || abs.memberDbId === matchedMember.id))
      );
      if (remainingAbsences.length !== existingAbsences.length) {
        saveToStorage(STORAGE_KEYS.ABSENCES, remainingAbsences);
      }
    } catch (err) {
      console.warn("Error clearing absence on check-in:", err);
    }
  }
  const isOnline = isDeviceOnline();
  let isOfflineSaved = false;
  if (!isOnline) {
    addPendingOfflineAttendance(newRecord);
    enqueueAttendance(newRecord).catch(() => {
    });
    isOfflineSaved = true;
  } else {
    firestoreAddAttendance(newRecord)
      .then(() => clearPendingLocalUpload("attendance", newRecord.id))
      .catch((err) => {
        console.warn("Firestore addAttendance offline fallback:", err);
        addPendingOfflineAttendance(newRecord);
        enqueueAttendance(newRecord).catch(() => {
        });
      });
    syncPendingOfflineAttendance(currentChurchId).catch(() => {
    });
    triggerOfflineSync().catch(() => {
    });
  }
  playSuccessBeep();
  return {
    success: true,
    record: newRecord,
    member: matchedMember,
    service: targetService,
    scannedAt: newRecord.timestamp,
    isOfflineSaved,
    isVisitor,
    homeChurchId: newRecord.homeChurchId,
    homeChurchName: newRecord.homeChurchName,
  };
}
export function isDeviceOnline() {
  if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
    return navigator.onLine;
  }
  return true;
}
export function getPendingOfflineAttendance() {
  return loadFromStorage(STORAGE_KEYS.PENDING_ATTENDANCE, []);
}
export function savePendingOfflineAttendance(records) {
  saveToStorage(STORAGE_KEYS.PENDING_ATTENDANCE, records);
}
export function addPendingOfflineAttendance(record) {
  const pending = getPendingOfflineAttendance();
  const exists = pending.some((r2) => r2.id === record.id);
  if (!exists) {
    pending.push(record);
    savePendingOfflineAttendance(pending);
  }
}
export function getPendingOfflineAttendanceCount(churchId?: string): number {
  const pending = getPendingOfflineAttendance();
  if (churchId) {
    return pending.filter((r2) => r2.churchId === churchId).length;
  }
  return pending.length;
}
export async function syncPendingOfflineAttendance(targetChurchId?: string) {
  if (!isDeviceOnline()) {
    return {
      syncedCount: 0,
      remainingCount: getPendingOfflineAttendanceCount(targetChurchId),
      syncedRecords: []
    };
  }
  const allPending = getPendingOfflineAttendance();
  if (allPending.length === 0) {
    return { syncedCount: 0, remainingCount: 0, syncedRecords: [] };
  }
  const recordsToSync = targetChurchId ? allPending.filter((r2) => r2.churchId === targetChurchId) : allPending;
  if (recordsToSync.length === 0) {
    return {
      syncedCount: 0,
      remainingCount: getPendingOfflineAttendanceCount(targetChurchId),
      syncedRecords: []
    };
  }
  const successfulIds = [];
  const syncedRecords = [];
  for (const record of recordsToSync) {
    try {
      await firestoreAddAttendance(record);
      successfulIds.push(record.id);
      syncedRecords.push(record);
    } catch (err) {
      console.warn(`Failed to sync record ${record.id} to Firestore:`, err);
    }
  }
  if (successfulIds.length > 0) {
    const remaining = allPending.filter((r2) => !successfulIds.includes(r2.id));
    savePendingOfflineAttendance(remaining);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("app_legiz_attendance_synced", {
          detail: {
            syncedCount: successfulIds.length,
            churchId: targetChurchId
          }
        })
      );
    }
  }
  const finalRemaining = getPendingOfflineAttendance();
  return {
    syncedCount: successfulIds.length,
    remainingCount: targetChurchId ? finalRemaining.filter((r2) => r2.churchId === targetChurchId).length : finalRemaining.length,
    syncedRecords
  };
}
export function getAttendanceByChurch(churchId: string, serviceId?: string): AttendanceRecord[] {
  if (!churchId || !churchId.trim()) return [];
  const cleanId = churchId.trim();
  const church = getChurchById(cleanId);
  const targetId = church ? church.id : cleanId;
  const targetCode = (church == null ? void 0 : church.code) ? church.code.trim().toUpperCase() : "";
  const allAttendance = loadFromStorage(
    STORAGE_KEYS.ATTENDANCE,
    INITIAL_ATTENDANCE
  );
  return allAttendance.filter((a2) => {
    if (!a2 || isLegacyDemoAttendance(a2) || isAttendanceMarkedDeleted(a2.id)) return false;
    const aCh = (a2.churchId || "").trim().toUpperCase();
    if (!aCh) return false;
    const matches2 = aCh === targetId.toUpperCase() || targetCode && aCh === targetCode;
    if (!matches2) return false;
    return true;
  });
}
export function deleteAttendanceRecord(recordId) {
  if (!recordId) return false;
  markAttendanceAsDeleted(recordId);
  const allAttendance = loadFromStorage(STORAGE_KEYS.ATTENDANCE, []);
  const filtered = allAttendance.filter((a2) => a2.id !== recordId);
  const pending = loadFromStorage(STORAGE_KEYS.PENDING_ATTENDANCE, []);
  const filteredPending = pending.filter((p2) => p2.id !== recordId);
  saveToStorage(STORAGE_KEYS.PENDING_ATTENDANCE, filteredPending);
  firestoreDeleteAttendance(recordId).catch(
    (err) => console.warn("Firestore deleteAttendance error:", err)
  );
  saveToStorage(STORAGE_KEYS.ATTENDANCE, filtered);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("church_data_updated"));
    window.dispatchEvent(new CustomEvent("app_legiz_attendance_synced"));
  }
  return true;
}
export function deleteMultipleAttendanceRecords(recordIds) {
  if (!recordIds || recordIds.length === 0) return 0;
  recordIds.forEach((id2) => markAttendanceAsDeleted(id2));
  const idSet = new Set(recordIds);
  const allAttendance = loadFromStorage(STORAGE_KEYS.ATTENDANCE, []);
  const initialLength = allAttendance.length;
  const filtered = allAttendance.filter((a2) => !idSet.has(a2.id));
  const pending = loadFromStorage(STORAGE_KEYS.PENDING_ATTENDANCE, []);
  const filteredPending = pending.filter((p2) => !idSet.has(p2.id));
  saveToStorage(STORAGE_KEYS.PENDING_ATTENDANCE, filteredPending);
  const deletedCount = initialLength - filtered.length;
  saveToStorage(STORAGE_KEYS.ATTENDANCE, filtered);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("church_data_updated"));
    window.dispatchEvent(new CustomEvent("app_legiz_attendance_synced"));
  }
  firestoreBatchDeleteAttendance(recordIds).catch(
    (err) => console.warn("Firestore batch delete attendance error:", err)
  );
  return deletedCount;
}
export function getMemberAttendanceHistory(churchId, memberId) {
  if (!churchId || !churchId.trim()) return [];
  const cleanId = churchId.trim();
  const church = getChurchById(cleanId);
  const targetId = church ? church.id : cleanId;
  const targetCode = (church == null ? void 0 : church.code) ? church.code.trim().toUpperCase() : "";
  const allAttendance = loadFromStorage(
    STORAGE_KEYS.ATTENDANCE,
    INITIAL_ATTENDANCE
  );
  return allAttendance.filter((a2) => {
    if (!a2 || isLegacyDemoAttendance(a2) || isAttendanceMarkedDeleted(a2.id)) return false;
    const aCh = (a2.churchId || "").trim().toUpperCase();
    if (!aCh) return false;
    const matchesChurch = aCh === targetId.toUpperCase() || targetCode && aCh === targetCode;
    if (!matchesChurch) return false;
    const matchesMember = (a2.memberId || "").toUpperCase() === memberId.toUpperCase() || (a2.memberDbId || "").toUpperCase() === memberId.toUpperCase();
    return matchesMember;
  });
}
export function getMemberCrossChurchVisits(
  memberDbId: string,
  memberCode: string,
  homeChurchId: string
): AttendanceRecord[] {
  const cleanHome = (homeChurchId || "").trim().toUpperCase();
  const cleanCode = (memberCode || "").trim().toUpperCase();
  const cleanDbId = (memberDbId || "").trim();
  if (!cleanCode && !cleanDbId) return [];
  const allAttendance = loadFromStorage<AttendanceRecord[]>(
    STORAGE_KEYS.ATTENDANCE,
    INITIAL_ATTENDANCE
  );
  return allAttendance
    .filter((a2) => {
      if (!a2 || isLegacyDemoAttendance(a2) || isAttendanceMarkedDeleted(a2.id)) return false;
      const matchesMember =
        (cleanDbId && a2.memberDbId === cleanDbId) ||
        (cleanCode && (a2.memberId || "").trim().toUpperCase() === cleanCode);
      if (!matchesMember) return false;
      const aCh = (a2.churchId || "").trim().toUpperCase();
      return Boolean(cleanHome && aCh && aCh !== cleanHome);
    })
    .sort((a2, b2) => new Date(b2.timestamp).getTime() - new Date(a2.timestamp).getTime());
}
export function formatLocalDateYmd(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
export function isServiceEnded(service: Partial<ServiceSession> | null | undefined, nowOverride?: Date): boolean {
  if (!service) return true;
  if (service.isPermanentlyEnded) return true;
  const now2 = nowOverride ? new Date(nowOverride.getTime()) : /* @__PURE__ */ new Date();
  if (service.date) {
    const todayStr = formatLocalDateYmd(now2);
    if (service.date < todayStr) {
      return true;
    }
    if (service.date === todayStr) {
      const timeToCheck = service.endTime || (service.startTime ? `${parseInt(service.startTime.split(":")[0] || "8", 10) + 3}:${service.startTime.split(":")[1] || "00"}` : null);
      if (timeToCheck) {
        try {
          const [endHourStr, endMinStr] = timeToCheck.split(":");
          if (endHourStr !== void 0 && endMinStr !== void 0) {
            const [year, month, day] = service.date.split("-").map((v3) => parseInt(v3, 10));
            const endHour = parseInt(endHourStr, 10);
            const endMin = parseInt(endMinStr, 10);
            if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day) && !Number.isNaN(endHour) && !Number.isNaN(endMin)) {
              const serviceEndDateTime = new Date(
                year,
                month - 1,
                day,
                endHour,
                endMin,
                0,
                0
              );
              if (now2.getTime() >= serviceEndDateTime.getTime()) {
                return true;
              }
            }
          }
        } catch {
        }
      }
    }
  }
  if (!service.isOpenForAttendance && service.endedAt) {
    return true;
  }
  return false;
}
export function getServiceEndTimestampMs(service: Partial<ServiceSession> | null | undefined): number | null {
  if (!service) return null;
  if (service.endedAt) {
    const parsedEndedAt = Date.parse(service.endedAt);
    if (!Number.isNaN(parsedEndedAt)) {
      return parsedEndedAt;
    }
  }
  if (service.date) {
    try {
      const [year, month, day] = service.date.split("-").map((v3) => parseInt(v3, 10));
      if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
        const timeToCheck =
          service.endTime ||
          (service.startTime
            ? `${Math.min(23, parseInt(service.startTime.split(":")[0] || "8", 10) + 3)}:${service.startTime.split(":")[1] || "00"}`
            : "23:59");
        const [endHourStr, endMinStr] = timeToCheck.split(":");
        const endHour = parseInt(endHourStr || "23", 10);
        const endMin = parseInt(endMinStr || "59", 10);
        if (!Number.isNaN(endHour) && !Number.isNaN(endMin)) {
          return new Date(year, month - 1, day, endHour, endMin, 0, 0).getTime();
        }
      }
    } catch {
    }
  }
  return null;
}

export const POST_SERVICE_AUTO_SYNC_DELAY_MS = 5 * 60 * 1000;
const MAX_SAFE_AUTO_SYNC_TIMEOUT_MS = 24 * 60 * 60 * 1000;

/**
 * Computes the exact delay (ms) until the earliest non-permanently-ended service
 * reaches `scheduledEndTime + delayAfterEndMs` (default 5 minutes).
 * Returns `null` when no service needs background scheduling, `0` if already due,
 * and caps long delays at 24h to prevent 32-bit JS timer overflow.
 */
export function getNextServiceAutoSyncDelayMs(
  services: Array<Partial<ServiceSession>>,
  nowMs: number = Date.now(),
  delayAfterEndMs: number = POST_SERVICE_AUTO_SYNC_DELAY_MS
): number | null {
  if (!Array.isArray(services) || services.length === 0) return null;
  let earliestTriggerAtMs: number | null = null;
  for (const srv of services) {
    if (!srv || srv.isPermanentlyEnded) continue;
    const endMs = getServiceEndTimestampMs(srv);
    if (endMs === null) continue;
    const triggerAtMs = endMs + delayAfterEndMs;
    if (earliestTriggerAtMs === null || triggerAtMs < earliestTriggerAtMs) {
      earliestTriggerAtMs = triggerAtMs;
    }
  }
  if (earliestTriggerAtMs === null) return null;
  const remainingMs = earliestTriggerAtMs - nowMs;
  if (remainingMs <= 0) return 0;
  return Math.min(remainingMs, MAX_SAFE_AUTO_SYNC_TIMEOUT_MS);
}

export function isServiceWithin24hReportWindow(
  service: Partial<ServiceSession> | null | undefined,
  nowMs: number = Date.now()
): boolean {
  if (!service) return false;
  if (!isServiceEnded(service, new Date(nowMs))) {
    return true;
  }
  const endMs = getServiceEndTimestampMs(service);
  if (endMs === null) return false;
  const elapsedMs = nowMs - endMs;
  if (elapsedMs < 0) return true;
  return elapsedMs < 24 * 60 * 60 * 1000;
}

export function hasServiceConductedSession(service: Partial<ServiceSession> | null | undefined, serviceAttendanceCount: number = 0): boolean {
  if (!service) return false;
  return Boolean(service.isOpenForAttendance) || Boolean(service.wasOpenedForAttendance) || serviceAttendanceCount > 0;
}

export function permanentlyEndService(churchId, serviceId) {
  const allServices = loadFromStorage(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
  let endedService = null;
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const updated = allServices.map((s3) => {
    if (s3.churchId === churchId && s3.id === serviceId) {
      endedService = {
        ...s3,
        isOpenForAttendance: false,
        wasOpenedForAttendance: Boolean(s3.wasOpenedForAttendance || s3.isOpenForAttendance),
        isPermanentlyEnded: true,
        endedAt: s3.endedAt || nowIso
      };
      return endedService;
    }
    return s3;
  });
  if (endedService) {
    saveToStorage(STORAGE_KEYS.SERVICES, updated);
    firestoreUpdateService(serviceId, {
      isOpenForAttendance: false,
      wasOpenedForAttendance: Boolean(endedService.wasOpenedForAttendance),
      isPermanentlyEnded: true,
      endedAt: endedService.endedAt
    }).catch(() => {
    });
    syncServiceAbsencesAutomatically(churchId, serviceId);
  }
  return endedService;
}
export function syncAllEndedServices(churchId) {
  const allServices = loadFromStorage(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
  const churchAttendance = getAttendanceByChurch(churchId);
  const attendanceServiceIds = new Set(churchAttendance.map((a2) => a2.serviceId).filter(Boolean));
  let hasChanges = false;
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const updated = allServices.map((s3) => {
    if (s3.churchId === churchId && !s3.isPermanentlyEnded && isServiceEnded(s3)) {
      hasChanges = true;
      const hadActiveSession = Boolean(s3.isOpenForAttendance || s3.wasOpenedForAttendance || attendanceServiceIds.has(s3.id));
      return {
        ...s3,
        isOpenForAttendance: false,
        ...(hadActiveSession ? { wasOpenedForAttendance: true } : {}),
        isPermanentlyEnded: true,
        endedAt: s3.endedAt || nowIso
      };
    }
    return s3;
  });
  if (hasChanges) {
    saveToStorage(STORAGE_KEYS.SERVICES, updated);
    syncServiceAbsencesAutomatically(churchId);
  }
}
export function syncServiceAbsencesAutomatically(churchId: string, targetServiceId?: string) {
  const services = getServicesByChurch(churchId);
  const members = getMembersByChurch(churchId);
  const regularMembers = members.filter((m2) => !isVisitorMember(m2));
  const activeMembers = regularMembers.filter((m2) => m2.status === "active");
  const baseMembers = activeMembers.length > 0 ? activeMembers : regularMembers;
  const allAttendance = getAttendanceByChurch(churchId);
  const existingAbsences = loadFromStorage<AbsenceRecord[]>(STORAGE_KEYS.ABSENCES, []);
  let updatedAbsences = [...existingAbsences];
  let absencesChanged = false;
  let servicesToCloseIds: string[] = [];

  // Map valid services & purge any auto-generated absences belonging to non-existent or never-conducted services
  const serviceMap = new Map<string, ServiceSession>();
  services.forEach((s3) => serviceMap.set(s3.id, s3));

  const cleanedInitial = updatedAbsences.filter((abs) => {
    if (abs.churchId !== churchId) return true;
    const srv = serviceMap.get(abs.serviceId);
    if (!srv) {
      if (abs.autoGenerated) {
        absencesChanged = true;
        return false;
      }
      return true;
    }
    const srvAttCount = allAttendance.filter((a2) => a2.serviceId === srv.id).length;
    if (abs.autoGenerated && (!isServiceEnded(srv) || !hasServiceConductedSession(srv, srvAttCount) || srvAttCount === 0)) {
      absencesChanged = true;
      return false;
    }
    return true;
  });
  updatedAbsences = cleanedInitial;

  const servicesToProcess = targetServiceId ? services.filter((s3) => s3.id === targetServiceId) : services;
  servicesToProcess.forEach((srv) => {
    const srvAttendance = allAttendance.filter((a2) => a2.serviceId === srv.id);
    const presentIdSet = /* @__PURE__ */ new Set();
    srvAttendance.forEach((a2) => {
      if (a2.memberId) presentIdSet.add(a2.memberId.toUpperCase());
      if (a2.memberDbId) presentIdSet.add(a2.memberDbId);
    });
    const ended = isServiceEnded(srv);
    // Strict guard: absences are counted ONLY when a service has finished AND members verified attendance in it
    const wasOpenedOrConducted = hasServiceConductedSession(srv, srvAttendance.length);
    if (ended && wasOpenedOrConducted && srvAttendance.length > 0) {
      if (srv.isOpenForAttendance || !srv.isPermanentlyEnded) {
        servicesToCloseIds.push(srv.id);
      }
      baseMembers.forEach((member) => {
        const isPresent = member.memberId && presentIdSet.has(member.memberId.toUpperCase()) || member.id && presentIdSet.has(member.id);
        const existingIdx = updatedAbsences.findIndex(
          (abs) => abs.churchId === churchId && abs.serviceId === srv.id && ((abs.memberId || "").toUpperCase() === (member.memberId || "").toUpperCase() || abs.memberDbId === member.id)
        );
        if (!isPresent) {
          if (existingIdx === -1) {
            const newAbsence = {
              id: `abs-${srv.id}-${member.id}`,
              churchId,
              serviceId: srv.id,
              serviceCategory: srv.category,
              serviceTitle: srv.title,
              serviceDate: srv.date || formatLocalDateYmd(),
              memberId: member.memberId,
              memberDbId: member.id,
              memberName: member.fullName,
              memberPhone: member.phone,
              memberDepartment: member.department,
              status: "absent" as const,
              recordedAt: (/* @__PURE__ */ new Date()).toISOString(),
              autoGenerated: true
            };
            updatedAbsences.push(newAbsence);
            absencesChanged = true;
          }
        } else {
          if (existingIdx !== -1) {
            updatedAbsences.splice(existingIdx, 1);
            absencesChanged = true;
          }
        }
      });
    } else {
      if (ended && (srv.isOpenForAttendance || !srv.isPermanentlyEnded)) {
        servicesToCloseIds.push(srv.id);
      }
      baseMembers.forEach((member) => {
        const isPresent = member.memberId && presentIdSet.has(member.memberId.toUpperCase()) || member.id && presentIdSet.has(member.id);
        if (isPresent) {
          const existingIdx = updatedAbsences.findIndex(
            (abs) => abs.churchId === churchId && abs.serviceId === srv.id && ((abs.memberId || "").toUpperCase() === (member.memberId || "").toUpperCase() || abs.memberDbId === member.id)
          );
          if (existingIdx !== -1) {
            updatedAbsences.splice(existingIdx, 1);
            absencesChanged = true;
          }
        }
      });
    }
  });

  if (servicesToCloseIds.length > 0) {
    const closeSet = new Set(servicesToCloseIds);
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const allStoredServices = loadFromStorage(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
    const updatedStoredServices = allStoredServices.map((s3) => {
      if (closeSet.has(s3.id)) {
        const endedAtVal = s3.endedAt || nowIso;
        const hadActive = Boolean(s3.isOpenForAttendance || s3.wasOpenedForAttendance);
        firestoreUpdateService(s3.id, {
          isOpenForAttendance: false,
          ...(hadActive ? { wasOpenedForAttendance: true } : {}),
          isPermanentlyEnded: true,
          endedAt: endedAtVal
        }).catch(() => {});
        return {
          ...s3,
          isOpenForAttendance: false,
          ...(hadActive ? { wasOpenedForAttendance: true } : {}),
          isPermanentlyEnded: true,
          endedAt: endedAtVal
        };
      }
      return s3;
    });
    saveToStorage(STORAGE_KEYS.SERVICES, updatedStoredServices);
  }

  if (absencesChanged) {
    saveToStorage(STORAGE_KEYS.ABSENCES, updatedAbsences);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("app_legiz_absences_synced", { detail: { churchId } })
      );
    }
  }
  return updatedAbsences.filter((a2) => a2.churchId === churchId);
}
export function getServiceAbsenceRecords(churchId: string, serviceId?: string): AbsenceRecord[] {
  const allAbsences = syncServiceAbsencesAutomatically(churchId, serviceId);
  if (serviceId) {
    return allAbsences.filter((a2) => a2.serviceId === serviceId);
  }
  return allAbsences;
}
export function toggleExcuseAbsence(churchId: string, absenceId: string, reason?: string) {
  const allAbsences = loadFromStorage(STORAGE_KEYS.ABSENCES, []);
  let targetAbsence;
  const updated = allAbsences.map((a2) => {
    if (a2.id === absenceId && a2.churchId === churchId) {
      const nextStatus = a2.status === "excused" ? "absent" : "excused";
      targetAbsence = {
        ...a2,
        status: nextStatus,
        excuseReason: nextStatus === "excused" ? reason || "Eskize pa lidè / pastè" : void 0
      };
      return targetAbsence;
    }
    return a2;
  });
  if (targetAbsence) {
    saveToStorage(STORAGE_KEYS.ABSENCES, updated);
  }
  return targetAbsence;
}
export function getServiceHistoryStats(churchId, serviceId) {
  const services = getServicesByChurch(churchId);
  const service = services.find((s3) => s3.id === serviceId);
  if (!service) return null;
  const members = getMembersByChurch(churchId);
  const regularMembers = members.filter((m2) => !isVisitorMember(m2));
  const activeMembers = regularMembers.filter((m2) => m2.status === "active");
  const baseMembers = activeMembers.length > 0 ? activeMembers : regularMembers;
  const visitorMemberIds = new Set<string>();
  members
    .filter((m2) => isVisitorMember(m2))
    .forEach((m2) => {
      if (m2.memberId) visitorMemberIds.add(m2.memberId.toUpperCase());
      if (m2.id) visitorMemberIds.add(m2.id);
    });
  const baseMemberIds = new Set<string>();
  baseMembers.forEach((m2) => {
    if (m2.memberId) baseMemberIds.add(m2.memberId.toUpperCase());
    if (m2.id) baseMemberIds.add(m2.id);
  });

  const allAttendance = getAttendanceByChurch(churchId).filter((a2) => a2.serviceId === serviceId);
  const serviceFinished = isServiceEnded(service);
  const wasConducted = serviceFinished && hasServiceConductedSession(service, allAttendance.length) && allAttendance.length > 0;
  const allAbsences = wasConducted ? getServiceAbsenceRecords(churchId, serviceId) : [];

  const attendanceMap = /* @__PURE__ */ new Map();
  const visitorAttendances: AttendanceRecord[] = [];
  const seenVisitorKeys = new Set<string>();

  allAttendance.forEach((a2) => {
    const codeUpper = (a2.memberId || "").toUpperCase();
    const isTrackedVisitor =
      isVisitorAttendanceRecord(a2, churchId) ||
      (codeUpper && visitorMemberIds.has(codeUpper)) ||
      (a2.memberDbId && visitorMemberIds.has(a2.memberDbId)) ||
      (!baseMemberIds.has(codeUpper) && !baseMemberIds.has(a2.memberDbId));

    if (isTrackedVisitor) {
      const vKey = a2.memberDbId || codeUpper || a2.id;
      if (!seenVisitorKeys.has(vKey)) {
        seenVisitorKeys.add(vKey);
        visitorAttendances.push(a2);
      }
      return;
    }

    if (a2.memberId) attendanceMap.set(codeUpper, a2);
    if (a2.memberDbId) attendanceMap.set(a2.memberDbId, a2);
  });

  const absenceMap = /* @__PURE__ */ new Map();
  allAbsences.forEach((a2) => {
    if (a2.memberId) absenceMap.set(a2.memberId.toUpperCase(), a2);
    if (a2.memberDbId) absenceMap.set(a2.memberDbId, a2);
  });
  let totalOnTime = 0;
  let totalLate = 0;
  let totalAbsent = 0;
  let totalExcused = 0;
  const regularMembersList: ServiceHistoryMemberStat[] = wasConducted
    ? baseMembers.map((m2) => {
        const att = m2.memberId && attendanceMap.get(m2.memberId.toUpperCase()) || m2.id && attendanceMap.get(m2.id);
        const abs = m2.memberId && absenceMap.get(m2.memberId.toUpperCase()) || m2.id && absenceMap.get(m2.id);
        let status: "on_time" | "late" | "absent" | "excused" = "absent";
        let checkInTime = void 0;
        let checkInMethod = void 0;
        let lateMinutes = void 0;
        let excuseReason = void 0;
        if (att) {
          if (att.attendanceStatus === "late") {
            status = "late";
            totalLate++;
          } else if (att.attendanceStatus === "excused") {
            status = "excused";
            totalExcused++;
          } else {
            status = "on_time";
            totalOnTime++;
          }
          checkInTime = att.timestamp;
          checkInMethod = att.checkInMethod;
          lateMinutes = att.lateMinutes;
        } else if (abs) {
          if (abs.status === "excused") {
            status = "excused";
            totalExcused++;
            excuseReason = abs.excuseReason;
          } else {
            status = "absent";
            totalAbsent++;
          }
        } else {
          status = "absent";
          totalAbsent++;
        }
        return {
          memberId: m2.memberId,
          memberDbId: m2.id,
          fullName: m2.fullName,
          phone: m2.phone,
          department: m2.department,
          gender: m2.gender,
          status,
          checkInTime,
          checkInMethod,
          lateMinutes,
          excuseReason,
          isVisitor: false,
        };
      })
    : [];

  const visitorsList: ServiceHistoryMemberStat[] = wasConducted
    ? visitorAttendances.map((att) => ({
        memberId: att.memberId,
        memberDbId: att.memberDbId,
        fullName: att.memberName,
        phone: att.memberPhone,
        department: att.memberDepartment,
        status: att.attendanceStatus === "late" ? "late" : "on_time",
        checkInTime: att.timestamp,
        checkInMethod: att.checkInMethod,
        lateMinutes: att.lateMinutes,
        isVisitor: true,
        homeChurchId: att.homeChurchId,
        homeChurchName: att.homeChurchName,
      }))
    : [];

  const membersList: ServiceHistoryMemberStat[] = [...regularMembersList, ...visitorsList];
  const totalPresent = totalOnTime + totalLate;
  const totalMembers = baseMembers.length;
  const totalVisitors = visitorsList.length;
  const attendanceRate = totalMembers > 0 && wasConducted ? Math.round(totalPresent / totalMembers * 100) : 0;
  const punctualityRate = totalPresent > 0 ? Math.round(totalOnTime / totalPresent * 100) : 0;
  return {
    service,
    totalMembers,
    totalPresent,
    totalOnTime,
    totalLate,
    totalAbsent,
    totalExcused,
    totalVisitors,
    attendanceRate,
    punctualityRate,
    visitorsList,
    membersList,
  };
}
export function getAudioContext() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    return new AudioCtx();
  } catch (e3) {
    return null;
  }
}
export function playSuccessBeep() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  } catch (e3) {
  }
}
export function playDuplicateWarningBeep() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.setValueAtTime(330, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.32);
  } catch (e3) {
  }
}
export function playErrorBeep() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.27);
  } catch (e3) {
  }
}
export const qrDataUrlCache = /* @__PURE__ */ new Map();
export async function generateQrDataUrl(text) {
  const safeText = (text || "").trim();
  if (!safeText) return "";
  if (qrDataUrlCache.has(safeText)) {
    return qrDataUrlCache.get(safeText);
  }
  try {
    const url = await QRCode.toDataURL(safeText, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 360,
      color: {
        dark: "#0f172a",
        light: "#ffffff"
      }
    });
    qrDataUrlCache.set(safeText, url);
    return url;
  } catch (err) {
    console.error("Failed to generate QR code", err);
    return "";
  }
}
export const PRODUCTION_VERIFICATION_ORIGIN =
  "https://verify.omnichurch.download";

export function resolvePublicVerificationOrigin(overrideOrigin?: string): string {
  const cleanOverride = (overrideOrigin || "").trim().replace(/\/+$/, "");
  if (
    cleanOverride &&
    (cleanOverride.startsWith("https://") || cleanOverride.startsWith("http://"))
  ) {
    return cleanOverride;
  }

  try {
    if (typeof localStorage !== "undefined") {
      const rawSettings = localStorage.getItem("omnichurch_dev_settings");
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings);
        const savedBase = (parsed?.memberVerification?.verificationBaseUrl || "")
          .trim()
          .replace(/\/+$/, "");
        if (
          savedBase &&
          (savedBase.startsWith("https://") || savedBase.startsWith("http://")) &&
          !savedBase.toLowerCase().includes("localhost") &&
          !savedBase.toLowerCase().includes("127.0.0.1")
        ) {
          return savedBase;
        }
      }
    }
  } catch {
  }

  try {
    const envObj =
      typeof import.meta !== "undefined" ? (import.meta as any).env : undefined;
    const configuredUrl = (envObj?.VITE_PUBLIC_VERIFICATION_URL || "")
      .trim()
      .replace(/\/+$/, "");
    if (
      configuredUrl &&
      (configuredUrl.startsWith("https://") || configuredUrl.startsWith("http://"))
    ) {
      return configuredUrl;
    }
  } catch {
  }

  return PRODUCTION_VERIFICATION_ORIGIN;
}

export function getMemberVerificationUrl(member, overrideBaseUrl?: string) {
  if (!member) return "";
  const churchId = (member.churchId || "").trim();
  const memberCode = (member.memberId || member.id || "").trim();
  if (!memberCode) return "";
  const cleanOrigin = resolvePublicVerificationOrigin(overrideBaseUrl);
  return `${cleanOrigin}/?verify=1&church=${encodeURIComponent(churchId)}&member=${encodeURIComponent(memberCode)}`;
}
export function getSavedActiveChurchId() {
  var _a3;
  try {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_CHURCH_ID);
      if (saved) {
        return saved;
      }
    }
  } catch (_2) {
  }
  const churches = getAllChurches();
  return ((_a3 = churches[0]) == null ? void 0 : _a3.id) || "";
}
export function setSavedActiveChurchId(churchId) {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CHURCH_ID, churchId);
    }
  } catch (_2) {
  }
}
export function getSavedActiveRole() {
  try {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem(STORAGE_KEYS.ACTIVE_ROLE);
      if (role === "admin" || role === "member") {
        return role;
      }
    }
  } catch (_2) {
  }
  return "member";
}
export function setSavedActiveRole(role) {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_ROLE, role);
    }
  } catch (_2) {
  }
}
export function getSavedActiveMemberId() {
  try {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_MEMBER_ID) || "";
    }
  } catch (_2) {
  }
  return "";
}
export function setSavedActiveMemberId(memberId) {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_MEMBER_ID, memberId);
    }
  } catch (_2) {
  }
}
export function getSavedLanguage(): Language {
  try {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
      const explicitChoice = localStorage.getItem(STORAGE_KEYS.LANGUAGE_CHOSEN) === "true";
      if (explicitChoice && isSupportedLanguage(saved)) {
        return saved;
      }
      const resolved = resolveInitialLanguageSync({
        userSavedLang: isSupportedLanguage(saved) ? saved : null,
        hasUserExplicitChoice: explicitChoice,
      });
      if (resolved.language) return resolved.language;
    }
  } catch (_2) {
  }
  return "ht";
}
export function setSavedLanguage(lang) {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
    }
  } catch (_2) {
  }
}
export function clearSavedLanguagePreference() {
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEYS.LANGUAGE);
      localStorage.removeItem(STORAGE_KEYS.LANGUAGE_CHOSEN);
    }
  } catch (_2) {
  }
}
export function hasUserChosenInitialLanguage() {
  try {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEYS.LANGUAGE_CHOSEN) === "true";
    }
  } catch (_2) {
  }
  return false;
}
export function setHasUserChosenInitialLanguage(chosen = true) {
  try {
    if (typeof window !== "undefined") {
      if (chosen) {
        localStorage.setItem(STORAGE_KEYS.LANGUAGE_CHOSEN, "true");
      } else {
        localStorage.removeItem(STORAGE_KEYS.LANGUAGE_CHOSEN);
      }
    }
  } catch (_2) {
  }
}
export function authenticateMemberWithPin(params) {
  const { churchId, idOrPhone, pin } = params;
  let church = getChurchById(churchId);
  const cleanInput = idOrPhone.trim().toUpperCase();
  const cleanPin = pin.trim();
  if (!cleanInput) {
    return {
      success: false,
      errorMessage: "Tanpri antre ID Manm ou oswa nimewo telefòn ou."
    };
  }
  if (!cleanPin) {
    return {
      success: false,
      errorMessage: "Tanpri antre Kòd Sekirite (PIN) ou."
    };
  }
  if (!church && cleanInput.includes("-")) {
    const codePrefix = cleanInput.split("-")[0].trim();
    church = getChurchById(codePrefix);
  }
  if (!church) {
    const all = getAllChurches();
    if (all.length === 1) {
      church = all[0];
    }
  }
  if (!church) {
    return {
      success: false,
      errorMessage: "Legliz la pa egziste nan sistèm nan. Tanpri chwazi bon legliz la."
    };
  }
  const churchMembers = getMembersByChurch(church.id);
  let member = churchMembers.find((m2) => {
    const matchId = (m2.memberId || "").toUpperCase() === cleanInput;
    const matchRawId = (m2.id || "").toUpperCase() === cleanInput;
    const matchPhone = (m2.phone || "").replace(/[^0-9]/g, "") === cleanInput.replace(/[^0-9]/g, "");
    const matchEmail = (m2.email || "").toUpperCase() === cleanInput;
    return matchId || matchRawId || matchPhone || matchEmail;
  });
  if (!member) {
    return {
      success: false,
      errorMessage: `Pa gen okenn manm ki anrejistre avèk ID/Telefòn "${idOrPhone}" nan legliz ${church.name}.`
    };
  }
  const hasDedicatedPin = Boolean(member.pin && member.pin.trim());
  const expectedPin = (member.pin || member.memberId.slice(-4) || "1234").trim();
  const isMatch2 = hasDedicatedPin ? cleanPin === expectedPin : cleanPin === expectedPin || cleanPin === member.memberId.slice(-4);
  if (!isMatch2) {
    return {
      success: false,
      errorMessage: "Kòd PIN sekirite sa a pa kòrèk pou manm sa a. Tanpri re-eseye ankò oswa verifye kòd sekrè w la."
    };
  }
  return {
    success: true,
    member,
    church
  };
}
export const ADMIN_SESSION_PREFIX = "app_legiz_admin_auth_session_";
export const ADMIN_LOCKED_PREFIX = "app_legiz_admin_locked_";

export function isChurchAdminLocked(churchId?: string): boolean {
  if (!churchId) return false;
  try {
    return sessionStorage.getItem(`${ADMIN_LOCKED_PREFIX}${churchId}`) === "true";
  } catch {
    return false;
  }
}

export function lockChurchAdminSession(churchId?: string) {
  try {
    if (churchId) {
      sessionStorage.setItem(`${ADMIN_LOCKED_PREFIX}${churchId}`, "true");
    }
  } catch (e3) {
    console.warn("SessionStorage lock error", e3);
  }
  revokeChurchAdminSession(churchId);
}

export function clearChurchAdminLock(churchId?: string) {
  try {
    if (churchId) {
      sessionStorage.removeItem(`${ADMIN_LOCKED_PREFIX}${churchId}`);
    } else {
      const keys = Object.keys(sessionStorage);
      for (const k3 of keys) {
        if (k3.startsWith(ADMIN_LOCKED_PREFIX)) {
          sessionStorage.removeItem(k3);
        }
      }
    }
  } catch (e3) {
    console.warn("SessionStorage clear lock error", e3);
  }
}

export function hasMatchingChurchCloudOwner(
  churchId?: string,
  userGoogleEmail?: string | null,
  userUid?: string | null
): boolean {
  if (!churchId) return false;
  const cleanEmail = (userGoogleEmail || "").trim().toLowerCase();
  const cleanUid = (userUid || "").trim();
  if (!cleanEmail && !cleanUid) return false;

  const church = getChurchById(churchId);
  if (!church) return false;
  const churchEmail = (church.adminGoogleEmail || "").trim().toLowerCase();
  const churchUid = (church.adminGoogleUid || "").trim();

  if (churchUid && cleanUid && churchUid === cleanUid) {
    return true;
  }
  if (churchEmail && cleanEmail && churchEmail === cleanEmail) {
    return true;
  }
  return false;
}

/**
 * Strictly resolves ONLY the church(es) owned by the authenticated administrator (UID or lowercase email).
 * Guarantees zero cross-tenant data mixing and blocks the reserved Super Developer account.
 */
export function resolveAdminOwnedChurches(
  churches: Church[],
  userUid?: string | null,
  userEmail?: string | null
): Church[] {
  const cleanUid = (userUid || "").trim();
  const cleanEmail = (userEmail || "").trim().toLowerCase();
  if (!cleanUid && !cleanEmail) return [];
  if (cleanEmail && isSuperDeveloperEmail(cleanEmail)) return [];

  const matchedMap = new Map<string, Church>();
  for (const ch of churches || []) {
    if (!ch || !ch.id || isAccidentalTestChurch(ch)) continue;
    const churchUid = (ch.adminGoogleUid || "").trim();
    const churchEmail = (ch.adminGoogleEmail || "").trim().toLowerCase();
    const uidMatches = Boolean(churchUid && cleanUid && churchUid === cleanUid);
    const emailMatches = Boolean(churchEmail && cleanEmail && churchEmail === cleanEmail);
    if (uidMatches || emailMatches) {
      matchedMap.set(ch.id, ch);
    }
  }

  return Array.from(matchedMap.values()).sort((a, b) => {
    const aArchived = a.status === "archived" ? 1 : 0;
    const bArchived = b.status === "archived" ? 1 : 0;
    if (aArchived !== bArchived) return aArchived - bArchived;
    return (a.name || "").localeCompare(b.name || "");
  });
}

const REMEMBERED_ADMIN_LOGIN_KEY = "omnichurch_remembered_admin_login_v1";
const REMEMBERED_MEMBER_LOGIN_KEY = "omnichurch_remembered_member_login_v1";

export interface RememberedAdminLogin {
  remember: boolean;
  email: string;
  churchId?: string;
  updatedAt?: string;
}

export interface RememberedMemberLogin {
  remember: boolean;
  memberIdOrPhone: string;
  churchId?: string;
  updatedAt?: string;
}

/**
 * Reads the saved non-sensitive admin login preference (NEVER stores plaintext passwords).
 */
export function getRememberedAdminLogin(): RememberedAdminLogin {
  try {
    const raw = localStorage.getItem(REMEMBERED_ADMIN_LOGIN_KEY);
    if (!raw) return { remember: false, email: "" };
    const parsed = JSON.parse(raw);
    const email = typeof parsed?.email === "string" ? parsed.email.trim().toLowerCase() : "";
    const remember = Boolean(parsed?.remember) && Boolean(email);
    if (!remember || isSuperDeveloperEmail(email)) {
      return { remember: false, email: "" };
    }
    const churchId =
      typeof parsed?.churchId === "string" && parsed.churchId.trim()
        ? parsed.churchId.trim()
        : undefined;
    return {
      remember: true,
      email,
      ...(churchId ? { churchId } : {}),
      ...(typeof parsed?.updatedAt === "string" ? { updatedAt: parsed.updatedAt } : {}),
    };
  } catch {
    return { remember: false, email: "" };
  }
}

/**
 * Persists only the admin's email & preference flag (NEVER passwords) when the user checks "Remember Me".
 */
export function saveRememberedAdminLogin(
  email: string,
  churchId?: string
): RememberedAdminLogin {
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@") || isSuperDeveloperEmail(cleanEmail)) {
    clearRememberedAdminLogin();
    return { remember: false, email: "" };
  }
  const cleanChurchId = (churchId || "").trim() || undefined;
  const record: RememberedAdminLogin = {
    remember: true,
    email: cleanEmail,
    ...(cleanChurchId ? { churchId: cleanChurchId } : {}),
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(REMEMBERED_ADMIN_LOGIN_KEY, JSON.stringify(record));
  } catch {
    // non-fatal storage quota guard
  }
  return record;
}

export function clearRememberedAdminLogin(): void {
  try {
    localStorage.removeItem(REMEMBERED_ADMIN_LOGIN_KEY);
  } catch {
    // ignore
  }
}

/**
 * Reads the saved non-sensitive member login preference (NEVER stores plaintext PINs).
 */
export function getRememberedMemberLogin(): RememberedMemberLogin {
  try {
    const raw = localStorage.getItem(REMEMBERED_MEMBER_LOGIN_KEY);
    if (!raw) return { remember: false, memberIdOrPhone: "" };
    const parsed = JSON.parse(raw);
    const memberIdOrPhone =
      typeof parsed?.memberIdOrPhone === "string" ? parsed.memberIdOrPhone.trim() : "";
    const remember = Boolean(parsed?.remember) && Boolean(memberIdOrPhone);
    if (!remember) {
      return { remember: false, memberIdOrPhone: "" };
    }
    const churchId =
      typeof parsed?.churchId === "string" && parsed.churchId.trim()
        ? parsed.churchId.trim()
        : undefined;
    return {
      remember: true,
      memberIdOrPhone,
      ...(churchId ? { churchId } : {}),
      ...(typeof parsed?.updatedAt === "string" ? { updatedAt: parsed.updatedAt } : {}),
    };
  } catch {
    return { remember: false, memberIdOrPhone: "" };
  }
}

export function saveRememberedMemberLogin(
  memberIdOrPhone: string,
  churchId?: string
): RememberedMemberLogin {
  const cleanId = (memberIdOrPhone || "").trim();
  if (!cleanId) {
    clearRememberedMemberLogin();
    return { remember: false, memberIdOrPhone: "" };
  }
  const cleanChurchId = (churchId || "").trim() || undefined;
  const record: RememberedMemberLogin = {
    remember: true,
    memberIdOrPhone: cleanId,
    ...(cleanChurchId ? { churchId: cleanChurchId } : {}),
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(REMEMBERED_MEMBER_LOGIN_KEY, JSON.stringify(record));
  } catch {
    // ignore
  }
  return record;
}

export function clearRememberedMemberLogin(): void {
  try {
    localStorage.removeItem(REMEMBERED_MEMBER_LOGIN_KEY);
  } catch {
    // ignore
  }
}

export function isChurchAdminAuthorized(
  churchId?: string,
  userGoogleEmail?: string | null,
  userUid?: string | null
): boolean {
  if (!churchId) return false;

  // If the admin console was explicitly locked (manual lock or inactivity timeout),
  // require explicit Quick PIN / Biometrics / Password / Google re-unlock even while Firebase Auth stays active.
  if (isChurchAdminLocked(churchId)) {
    return false;
  }

  const church = getChurchById(churchId);
  const cleanEmail = (userGoogleEmail || "").trim().toLowerCase();
  const cleanUid = (userUid || "").trim();

  if (church) {
    const churchEmail = (church.adminGoogleEmail || "").trim().toLowerCase();
    const churchUid = (church.adminGoogleUid || "").trim();

    if (churchUid && cleanUid && churchUid === cleanUid) {
      return true;
    }
    if (churchEmail && cleanEmail && churchEmail === cleanEmail) {
      return true;
    }

    // If the church has a dedicated Firebase owner and a DIFFERENT user is currently signed in, reject immediately
    if ((churchUid || churchEmail) && (cleanUid || cleanEmail)) {
      return false;
    }
  }

  try {
    const isAuthed = sessionStorage.getItem(`${ADMIN_SESSION_PREFIX}${churchId}`);
    return isAuthed === "true";
  } catch {
    return false;
  }
}
export function authorizeChurchAdminSession(churchId?: string) {
  clearChurchAdminLock(churchId);
  try {
    sessionStorage.setItem(`${ADMIN_SESSION_PREFIX}${churchId}`, "true");
  } catch (e3) {
    console.warn("SessionStorage not accessible", e3);
  }
}
export function revokeChurchAdminSession(churchId?: string) {
  try {
    if (churchId) {
      sessionStorage.removeItem(`${ADMIN_SESSION_PREFIX}${churchId}`);
    } else {
      const keys = Object.keys(sessionStorage);
      for (const k3 of keys) {
        if (k3.startsWith(ADMIN_SESSION_PREFIX)) {
          sessionStorage.removeItem(k3);
        }
      }
    }
  } catch (e3) {
    console.warn("SessionStorage revoke error", e3);
  }
}
export function revokeAdminSession(churchId?: string) {
  revokeChurchAdminSession(churchId);
}
export async function deleteChurch(churchId: string, adminPasscode?: string) {
  try {
    if (!churchId) return false;
    const church = getChurchById(churchId);
    if (!church) {
      throw new Error("Legliz la pa egziste nan sistèm nan.");
    }
    if (adminPasscode !== void 0) {
      const storedPasscode = (church.adminPasscode || "").trim();
      const enteredPasscode = adminPasscode.trim();
      if (storedPasscode) {
        const verify = await verifyAdminPasscode(enteredPasscode, storedPasscode, church.id);
        if (!verify.matches) {
          throw new Error("Kòd sekirite a enkòrèk pou legliz sa a. Konfimasyon sipresyon an pa akòde.");
        }
      }
    }
    markChurchAsDeleted(churchId);
    const churches = getAllChurches().filter((c3) => c3.id !== churchId);
    saveToStorage(STORAGE_KEYS.CHURCHES, churches);
    const allMembers = loadFromStorage(STORAGE_KEYS.MEMBERS, []);
    const remainingMembers = allMembers.filter((m2) => m2.churchId !== churchId);
    saveToStorage(STORAGE_KEYS.MEMBERS, remainingMembers);
    const allServices = loadFromStorage(STORAGE_KEYS.SERVICES, []);
    const remainingServices = allServices.filter((s3) => s3.churchId !== churchId);
    saveToStorage(STORAGE_KEYS.SERVICES, remainingServices);
    const allAnnouncements = loadFromStorage(STORAGE_KEYS.ANNOUNCEMENTS, []);
    const remainingAnnouncements = allAnnouncements.filter((a2) => a2.churchId !== churchId);
    saveToStorage(STORAGE_KEYS.ANNOUNCEMENTS, remainingAnnouncements);
    const allAttendance = loadFromStorage(STORAGE_KEYS.ATTENDANCE, []);
    const remainingAttendance = allAttendance.filter((att) => att.churchId !== churchId);
    saveToStorage(STORAGE_KEYS.ATTENDANCE, remainingAttendance);
    const allPending = loadFromStorage(STORAGE_KEYS.PENDING_ATTENDANCE, []);
    const remainingPending = allPending.filter((att) => att.churchId !== churchId);
    saveToStorage(STORAGE_KEYS.PENDING_ATTENDANCE, remainingPending);
    revokeChurchAdminSession(churchId);
    const activeChurchId = loadFromStorage(STORAGE_KEYS.ACTIVE_CHURCH_ID, "");
    if (activeChurchId === churchId) {
      if (churches.length > 0) {
        saveToStorage(STORAGE_KEYS.ACTIVE_CHURCH_ID, churches[0].id);
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_CHURCH_ID);
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_MEMBER_ID);
      }
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("church_data_updated"));
    }
    firestoreDeleteChurch(churchId).catch((err) => {
      console.warn(`Firestore deleteChurch async error for ${churchId}:`, err);
    });
    return true;
  } catch (err) {
    console.error(`Error deleting church ${churchId}:`, err);
    return false;
  }
}
export async function purgeTestChurches() {
  const churches = getAllChurches();
  const testChurches = churches.filter((c3) => {
    const name2 = (c3.name || "").toLowerCase();
    const code = (c3.code || "").toLowerCase();
    const id2 = (c3.id || "").toLowerCase();
    return name2.includes("tabernacle de l’espoir") || name2.includes("tabernacle de l'espoir") || name2.includes("eglise de la grâce") || name2.includes("eglise de la grace") || name2.includes("temple shalom") || name2.includes("demo") || name2.includes("test") || code === "demo" || code === "test" || id2 === "ch001" || id2 === "ch002" || id2 === "ch003";
  });
  for (const tc of testChurches) {
    await deleteChurch(tc.id);
  }
  const fsPurged = await firestorePurgeTestChurches().catch(() => 0);
  return Math.max(testChurches.length, fsPurged);
}
export async function resetSystemDatabase() {
  localStorage.removeItem(STORAGE_KEYS.CHURCHES);
  localStorage.removeItem(STORAGE_KEYS.MEMBERS);
  localStorage.removeItem(STORAGE_KEYS.SERVICES);
  localStorage.removeItem(STORAGE_KEYS.ANNOUNCEMENTS);
  localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
  localStorage.removeItem(STORAGE_KEYS.PENDING_ATTENDANCE);
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_CHURCH_ID);
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROLE);
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_MEMBER_ID);
  revokeChurchAdminSession();
  await firestoreResetAllDatabase().catch((err) => {
    console.warn("Firestore resetSystemDatabase async warning:", err);
  });
}
export function compressImageToBase64(file, maxDim = 400, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e3) => {
      var _a3;
      const img = new Image();
      img.onload = () => {
        var _a4;
        const canvas2 = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round(height * maxDim / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round(width * maxDim / height);
            height = maxDim;
          }
        }
        canvas2.width = width;
        canvas2.height = height;
        const ctx = canvas2.getContext("2d");
        if (!ctx) {
          resolve((_a4 = e3.target) == null ? void 0 : _a4.result);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas2.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Erè pandan lekti imaj la"));
      img.src = (_a3 = e3.target) == null ? void 0 : _a3.result;
    };
    reader.onerror = () => reject(new Error("Erè pandan chajman fichye a"));
    reader.readAsDataURL(file);
  });
}

export function purgeAllComments(): { purgedCount: number } {
  const stored = getAnnouncementInteractions();
  let purgedCount = 0;
  for (const annId of Object.keys(stored)) {
    const interaction = stored[annId];
    if (interaction && Array.isArray(interaction.comments)) {
      purgedCount += interaction.comments.length;
      interaction.comments = [];
    }
  }
  if (purgedCount > 0) {
    saveToStorage(STORAGE_KEYS.ANNOUNCEMENT_INTERACTIONS, stored);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("omnichurch_interactions_updated", { detail: stored }));
    }
  }
  return { purgedCount };
}

export {
  normalizeRoleText,
  isReceptionRole,
  getMemberPermissions,
  isServiceCurrentlyActive,
  type MemberPermissions,
} from "./permissions";
