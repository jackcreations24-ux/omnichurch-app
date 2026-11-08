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
  firestoreSaveChurch,
  firestoreAddMember,
  firestoreBatchAddOrUpdateMembers,
  firestoreUpdateMember,
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
} from "../services/firestoreService";

export interface ScanResult {
  success: boolean;
  duplicate?: boolean;
  deniedTenant?: boolean;
  record?: AttendanceRecord;
  member?: Member;
  service?: ServiceSession;
  scannedAt?: string;
  isOfflineSaved?: boolean;
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
  DELETED_ATTENDANCE: "app_legiz_deleted_attendance_v1"
};
export function markMemberAsDeleted(identifiers) {
  const deleted = loadFromStorage(STORAGE_KEYS.DELETED_MEMBERS, {});
  const now2 = Date.now();
  if (identifiers.id && identifiers.id.trim()) deleted[identifiers.id.trim()] = now2;
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
    for (const m2 of allMembers) {
      if (!m2 || isLegacyDemoMember(m2)) {
        membersChanged = true;
        continue;
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
    for (const s3 of allServices) {
      if (!s3 || isLegacyDemoService(s3)) {
        servicesChanged = true;
        continue;
      }
      let sChurchId = (s3.churchId || "").trim();
      if (sChurchId && churchIdMap.has(sChurchId.toUpperCase())) {
        const canonical = churchIdMap.get(sChurchId.toUpperCase());
        if (canonical !== sChurchId) {
          sChurchId = canonical;
          servicesChanged = true;
        }
      }
      cleanServices.push({ ...s3, churchId: sChurchId });
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
      let aChurchId = (a2.churchId || "").trim();
      if (aChurchId && churchIdMap.has(aChurchId.toUpperCase())) {
        const canonical = churchIdMap.get(aChurchId.toUpperCase());
        if (canonical !== aChurchId) {
          aChurchId = canonical;
          annChanged = true;
        }
      }
      cleanAnnouncements.push({ ...a2, churchId: aChurchId });
    }
    const dedupedAnn = deduplicateAnnouncements(cleanAnnouncements);
    if (annChanged || dedupedAnn.length !== allAnnouncements.length) {
      saveToStorage(STORAGE_KEYS.ANNOUNCEMENTS, dedupedAnn);
    }
    const allAttendance = loadFromStorage(STORAGE_KEYS.ATTENDANCE, []);
    let attChanged = false;
    const cleanAttendance = [];
    for (const att of allAttendance) {
      if (!att || isLegacyDemoAttendance(att)) {
        attChanged = true;
        continue;
      }
      let attChurchId = (att.churchId || "").trim();
      if (attChurchId && churchIdMap.has(attChurchId.toUpperCase())) {
        const canonical = churchIdMap.get(attChurchId.toUpperCase());
        if (canonical !== attChurchId) {
          attChurchId = canonical;
          attChanged = true;
        }
      }
      cleanAttendance.push({ ...att, churchId: attChurchId });
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
if (typeof window !== "undefined") {
  cleanLocalStorageLegacyDemoData();
}
export function getAllChurches() {
  const stored = loadFromStorage(STORAGE_KEYS.CHURCHES, INITIAL_CHURCHES);
  return stored;
}
export function getAllMembers() {
  return loadFromStorage(STORAGE_KEYS.MEMBERS, []).filter(
    (m2) => !isLegacyDemoMember(m2) && !isMemberMarkedDeleted(m2)
  );
}
export function getAllServices() {
  return loadFromStorage(STORAGE_KEYS.SERVICES, []).filter(
    (s3) => !isLegacyDemoService(s3) && !isServiceMarkedDeleted(s3.id)
  );
}
export function getAllAnnouncements() {
  return loadFromStorage(STORAGE_KEYS.ANNOUNCEMENTS, []).filter(
    (a2) => !isLegacyDemoAnnouncement(a2) && !isAnnouncementMarkedDeleted(a2.id)
  );
}
export function getAllAttendance() {
  return loadFromStorage(STORAGE_KEYS.ATTENDANCE, []).filter(
    (a2) => !isLegacyDemoAttendance(a2) && !isAttendanceMarkedDeleted(a2.id)
  );
}
export function getChurchById(churchId) {
  if (!churchId) return void 0;
  const clean = churchId.trim().toUpperCase();
  const churches = getAllChurches();
  return churches.find(
    (c3) => c3.id.toUpperCase() === clean || c3.code && c3.code.toUpperCase() === clean
  );
}
export function saveChurch(church) {
  const churches = getAllChurches();
  const index = churches.findIndex((c3) => c3.id === church.id);
  if (index >= 0) {
    churches[index] = church;
  } else {
    churches.push(church);
  }
  saveToStorage(STORAGE_KEYS.CHURCHES, churches);
  firestoreSaveChurch(church).catch(
    (err) => console.warn("Firestore saveChurch error:", err)
  );
}
export function createNewChurch(params) {
  var _a3, _b3, _c2, _d2;
  const churches = getAllChurches();
  let maxIdNum = 0;
  churches.forEach((c3) => {
    const match = c3.id.match(/^CH(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxIdNum) maxIdNum = num;
    }
  });
  let nextNum = Math.max(churches.length + 1, maxIdNum + 1);
  let churchId = `CH${String(nextNum).padStart(3, "0")}`;
  while (churches.some((c3) => c3.id.toUpperCase() === churchId.toUpperCase())) {
    nextNum++;
    churchId = `CH${String(nextNum).padStart(3, "0")}`;
  }
  const code = ((_a3 = params.code) == null ? void 0 : _a3.trim().toUpperCase()) || churchId;
  const cleanPasscode = (params.adminPasscode || "").trim();
  if (!cleanPasscode || cleanPasscode.length < 4) {
    throw new Error("Chak legliz dwe kreye avèk pwòp kòd sekirite (PIN) mèt li ki gen omwen 4 chif oswa lèt.");
  }
  const hashedPasscode = isPasscodeHashed(cleanPasscode) ? cleanPasscode : hashAdminPasscodeSync(cleanPasscode, churchId);
  const newChurch = {
    id: churchId,
    code,
    name: params.name.trim(),
    pastor: params.pastor.trim(),
    address: params.address.trim(),
    city: params.city.trim() || "Ayiti",
    phone: params.phone.trim(),
    email: params.email.trim(),
    motto: params.motto.trim() || "Nan sèvis Bondye ak renmen",
    themeColor: "indigo",
    logoIcon: "Church",
    rnc: ((_b3 = params.rnc) == null ? void 0 : _b3.trim()) || void 0,
    rncNumber: ((_c2 = params.rnc) == null ? void 0 : _c2.trim()) || void 0,
    adminPasscode: hashedPasscode,
    adminGoogleEmail: ((_d2 = params.adminGoogleEmail) == null ? void 0 : _d2.trim()) || "",
    donationInfo: {
      enabled: false
    },
    createdAt: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  };
  churches.push(newChurch);
  saveToStorage(STORAGE_KEYS.CHURCHES, churches);
  firestoreSaveChurch(newChurch).catch(
    (err) => console.warn("Firestore createNewChurch error:", err)
  );
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
  return allMembers.filter((m2) => {
    if (!m2 || isLegacyDemoMember(m2) || isMemberMarkedDeleted(m2)) return false;
    const mChurch = (m2.churchId || "").trim();
    if (!mChurch) return false;
    return mChurch.toUpperCase() === targetId.toUpperCase() || targetCode && mChurch.toUpperCase() === targetCode;
  });
}
export function addMember(churchId, memberData) {
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
  saveToStorage(STORAGE_KEYS.MEMBERS, allMembers);
  firestoreAddMember(newMember).catch(
    (err) => console.warn("Firestore addMember error:", err)
  );
  return newMember;
}
export function updateMember(churchId, updated) {
  const church = getChurchById(churchId);
  const canonicalChurchId = church ? church.id : churchId.trim();
  const churchCodeUpper = ((church == null ? void 0 : church.code) || "").toUpperCase();
  const allMembers = loadFromStorage(STORAGE_KEYS.MEMBERS, INITIAL_MEMBERS);
  const index = allMembers.findIndex(
    (m2) => m2.id === updated.id && (m2.churchId === canonicalChurchId || churchCodeUpper && (m2.churchId || "").toUpperCase() === churchCodeUpper)
  );
  const sanitizedMember = { ...updated, churchId: canonicalChurchId };
  if (index >= 0) {
    allMembers[index] = sanitizedMember;
    unmarkMemberAsDeleted({ id: sanitizedMember.id, memberId: sanitizedMember.memberId, barcodeToken: sanitizedMember.barcodeToken });
    saveToStorage(STORAGE_KEYS.MEMBERS, allMembers);
  }
  firestoreUpdateMember(sanitizedMember).catch(
    (err) => console.warn("Firestore updateMember error:", err)
  );
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
export async function bulkImportMembers(churchId, importedList, mode2 = "append") {
  var _a3, _b3, _c2, _d2, _e3, _f2, _g2, _h2, _i2, _j2, _k2;
  const allMembers = loadFromStorage(STORAGE_KEYS.MEMBERS, INITIAL_MEMBERS);
  const church = getChurchById(churchId);
  const canonicalChurchId = church ? church.id : churchId.trim();
  const churchCode = church ? church.code : canonicalChurchId;
  let added = 0;
  let updated = 0;
  let skipped = 0;
  const changedMembersToSync = [];
  for (const item of importedList) {
    if (!item || !item.fullName || !item.fullName.trim()) {
      skipped++;
      continue;
    }
    const cleanFullName = item.fullName.trim();
    const cleanPhone = (item.phone || "").trim();
    const cleanEmail = (item.email || "").trim().toLowerCase();
    const cleanMemberId = (item.memberId || "").trim().toUpperCase();
    const existingIndex = allMembers.findIndex((m2) => {
      if (m2.churchId !== canonicalChurchId) return false;
      if (cleanMemberId && m2.memberId.toUpperCase() === cleanMemberId) return true;
      if (item.id && m2.id === item.id) return true;
      if (cleanPhone && cleanPhone.length >= 8 && m2.phone && m2.phone.trim() === cleanPhone) return true;
      if (cleanEmail && m2.email && m2.email.trim().toLowerCase() === cleanEmail) return true;
      return false;
    });
    if (existingIndex >= 0) {
      if (mode2 === "skipDuplicates") {
        skipped++;
        continue;
      }
      if (mode2 === "update") {
        const current2 = allMembers[existingIndex];
        const updatedMember = {
          ...current2,
          fullName: cleanFullName,
          titlePrefix: item.titlePrefix || current2.titlePrefix,
          gender: item.gender || current2.gender,
          civilStatus: item.civilStatus || current2.civilStatus,
          profession: item.profession || current2.profession,
          dateOfBirth: item.dateOfBirth || current2.dateOfBirth,
          baptismDate: item.baptismDate || current2.baptismDate,
          phone: cleanPhone || current2.phone,
          emergencyContact: item.emergencyContact || current2.emergencyContact,
          emergencyContactName: item.emergencyContactName || current2.emergencyContactName,
          email: cleanEmail || current2.email,
          address: item.address || current2.address,
          city: item.city || current2.city,
          zone: item.zone || current2.zone,
          department: item.department || current2.department,
          role: item.role || current2.role,
          cellGroup: item.cellGroup || current2.cellGroup,
          joinedDate: item.joinedDate || current2.joinedDate,
          status: item.status || current2.status || "active",
          avatarUrl: item.avatarUrl || current2.avatarUrl,
          legalDocumentType: item.legalDocumentType || current2.legalDocumentType,
          legalDocumentNumber: item.legalDocumentNumber || current2.legalDocumentNumber,
          pin: item.pin || current2.pin,
          notes: item.notes || current2.notes
        };
        allMembers[existingIndex] = updatedMember;
        changedMembersToSync.push(updatedMember);
        updated++;
        continue;
      }
    }
    const memberId = cleanMemberId && mode2 !== "append" ? cleanMemberId : generateMemberId(churchCode, cleanFullName);
    const barcodeToken = `CHURCH:${canonicalChurchId}|MEMBER:${memberId}`;
    const defaultPin = (item.pin || "").trim() || generateSecureMemberPin();
    const newMember = {
      id: item.id && !allMembers.some((m2) => m2.id === item.id) ? item.id : `m-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      churchId: canonicalChurchId,
      memberId,
      pin: defaultPin,
      titlePrefix: ((_a3 = item.titlePrefix) == null ? void 0 : _a3.trim()) || void 0,
      fullName: cleanFullName,
      gender: item.gender,
      civilStatus: item.civilStatus,
      profession: ((_b3 = item.profession) == null ? void 0 : _b3.trim()) || void 0,
      dateOfBirth: item.dateOfBirth || "1990-01-01",
      baptismDate: item.baptismDate || void 0,
      phone: cleanPhone,
      emergencyContact: ((_c2 = item.emergencyContact) == null ? void 0 : _c2.trim()) || void 0,
      emergencyContactName: ((_d2 = item.emergencyContactName) == null ? void 0 : _d2.trim()) || void 0,
      email: cleanEmail,
      address: ((_e3 = item.address) == null ? void 0 : _e3.trim()) || "",
      city: ((_f2 = item.city) == null ? void 0 : _f2.trim()) || void 0,
      zone: ((_g2 = item.zone) == null ? void 0 : _g2.trim()) || void 0,
      department: item.department || "Service Général",
      role: item.role || "Manm",
      cellGroup: ((_h2 = item.cellGroup) == null ? void 0 : _h2.trim()) || void 0,
      joinedDate: item.joinedDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      status: item.status || "active",
      avatarUrl: ((_i2 = item.avatarUrl) == null ? void 0 : _i2.trim()) || void 0,
      legalDocumentType: item.legalDocumentType || void 0,
      legalDocumentNumber: ((_j2 = item.legalDocumentNumber) == null ? void 0 : _j2.trim()) || void 0,
      barcodeToken,
      notes: ((_k2 = item.notes) == null ? void 0 : _k2.trim()) || ""
    };
    allMembers.push(newMember);
    changedMembersToSync.push(newMember);
    added++;
  }
  saveToStorage(STORAGE_KEYS.MEMBERS, allMembers);
  if (changedMembersToSync.length > 0) {
    try {
      await firestoreBatchAddOrUpdateMembers(changedMembersToSync);
    } catch (err) {
      console.warn("Firestore bulk import sync error:", err);
    }
  }
  return {
    added,
    updated,
    skipped,
    totalProcessed: added + updated + skipped
  };
}
export function getServicesByChurch(churchId) {
  if (!churchId || !churchId.trim()) return [];
  const cleanId = churchId.trim();
  const church = getChurchById(cleanId);
  const targetId = church ? church.id : cleanId;
  const targetCode = (church == null ? void 0 : church.code) ? church.code.trim().toUpperCase() : "";
  const allServices = loadFromStorage(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
  return allServices.filter((s3) => {
    if (!s3 || isLegacyDemoService(s3) || isServiceMarkedDeleted(s3.id)) return false;
    const sChurch = (s3.churchId || "").trim();
    if (!sChurch) return false;
    return sChurch.toUpperCase() === targetId.toUpperCase() || targetCode && sChurch.toUpperCase() === targetCode;
  });
}
export function getActiveService(churchId) {
  const services = getServicesByChurch(churchId);
  return services.find((s3) => s3.isOpenForAttendance);
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
  if (isOpen && isServiceEnded(target)) {
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
    ...isOpen ? {} : { isPermanentlyEnded: true, endedAt: target.endedAt || nowIso }
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
  let modified = allServices;
  if (data.isOpenForAttendance) {
    modified = allServices.map((s3) => {
      const isThisChurch = s3.churchId === canonicalChurchId || churchCodeUpper && (s3.churchId || "").toUpperCase() === churchCodeUpper;
      return isThisChurch ? { ...s3, isOpenForAttendance: false } : s3;
    });
  }
  const newService = {
    id: `srv-${Date.now()}`,
    churchId: canonicalChurchId,
    ...data,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  modified.push(newService);
  saveToStorage(STORAGE_KEYS.SERVICES, modified);
  firestoreAddService(newService).catch(
    (err) => console.warn("Firestore addService error:", err)
  );
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
  firestoreDeleteService(serviceId).catch(
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
  if (target && (isServiceEnded(target) || target.isPermanentlyEnded || !!target.endedAt)) {
    const isCoreEdit = updates.title !== void 0 || updates.date !== void 0 || updates.startTime !== void 0 || updates.endTime !== void 0 || updates.category !== void 0 || updates.preacher !== void 0 || updates.leader !== void 0 || updates.preacherOrLeader !== void 0 || updates.theme !== void 0 || updates.passage !== void 0;
    if (isCoreEdit) {
      console.warn(`[STORAGE BLOCKED] Sèvis ${serviceId} fini deja epi li klotire. Li paka modifye.`);
      return target;
    }
  }
  let updatedService;
  const updatedList = allServices.map((s3) => {
    const isMatch2 = s3.id === serviceId && (s3.churchId === canonicalChurchId || churchCodeUpper && (s3.churchId || "").toUpperCase() === churchCodeUpper);
    if (isMatch2) {
      updatedService = { ...s3, ...updates, churchId: canonicalChurchId };
      return updatedService;
    }
    return s3;
  });
  if (updatedService) {
    saveToStorage(STORAGE_KEYS.SERVICES, updatedList);
    firestoreUpdateService(serviceId, updates).catch(
      (err) => console.warn("Firestore updateServiceSession error:", err)
    );
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
  const updatedService = updateServiceSession(church.id, service.id, {
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
    return new Date(b2.date).getTime() - new Date(a2.date).getTime();
  });
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
  const newAnnouncement = {
    id: `ann-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    churchId: canonicalChurchId,
    ...preparedData
  };
  const cleanList = deduplicateAnnouncements([newAnnouncement, ...allAnnouncements]);
  saveToStorage(STORAGE_KEYS.ANNOUNCEMENTS, cleanList);
  firestoreAddAnnouncement(newAnnouncement).catch(
    (err) => console.warn("Firestore addAnnouncement error:", err)
  );
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
  const newComment = {
    id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    announcementId,
    churchId: comment.churchId,
    author: comment.author.trim(),
    text: comment.text.trim(),
    time: comment.time || `${(/* @__PURE__ */ new Date()).getHours().toString().padStart(2, "0")}:${(/* @__PURE__ */ new Date()).getMinutes().toString().padStart(2, "0")}`,
    avatarInitials: comment.avatarInitials || comment.author.substring(0, 2).toUpperCase(),
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
        if (c3.isDemo || c3.id === "c1" || c3.id === "c2" || c3.id.startsWith("comm_demo") || c3.id.startsWith("demo_") || c3.author.includes("Hna.") || c3.author.includes("Hno.") || c3.author.includes("Carmel") || c3.author.includes("Baptiste") || c3.author.includes("Samuel Pierre")) {
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
  const allChurches = getAllChurches();
  const all = [];
  for (const annId of Object.keys(stored)) {
    if (stored[annId] && Array.isArray(stored[annId].comments)) {
      const parentAnn = allAnnouncements.find((a2) => a2.id === annId);
      const parentChurch = parentAnn ? allChurches.find((c3) => c3.id === parentAnn.churchId) : void 0;
      for (const comm of stored[annId].comments) {
        all.push({
          ...comm,
          announcementTitle: (parentAnn == null ? void 0 : parentAnn.title) || `Anons #${annId.slice(0, 8)}`,
          churchName: (parentChurch == null ? void 0 : parentChurch.name) || (comm.churchId ? `Legliz #${comm.churchId.slice(0, 6)}` : "OmniChurch")
        });
      }
    }
  }
  return all.sort((a2, b2) => new Date(b2.createdAt || 0).getTime() - new Date(a2.createdAt || 0).getTime());
}
export function parseScanToken(rawText) {
  const text = (rawText || "").trim();
  if (text.includes("verify") || text.startsWith("http://") || text.startsWith("https://")) {
    try {
      const url = new URL(text.startsWith("http") ? text : `https://dummy.local/${text.replace(/^\/?/, "")}`);
      const c3 = url.searchParams.get("church") || url.searchParams.get("c");
      const m2 = url.searchParams.get("member") || url.searchParams.get("m") || url.searchParams.get("verify_member") || url.searchParams.get("id");
      if (m2) {
        return {
          churchId: c3 ? decodeURIComponent(c3) : void 0,
          memberId: decodeURIComponent(m2)
        };
      }
    } catch {
      const churchMatch = text.match(/[?&](?:church|c)=([^&#]+)/i);
      const memberMatch = text.match(/[?&](?:member|m|verify_member|id)=([^&#]+)/i);
      if (memberMatch) {
        return {
          churchId: churchMatch ? decodeURIComponent(churchMatch[1].trim()) : void 0,
          memberId: decodeURIComponent(memberMatch[1].trim())
        };
      }
    }
  }
  if (text.includes("CHURCH:") && text.includes("MEMBER:")) {
    const churchMatch = text.match(/CHURCH:([^|]+)/i);
    const memberMatch = text.match(/MEMBER:([^|]+)/i);
    return {
      churchId: churchMatch ? churchMatch[1].trim() : void 0,
      memberId: memberMatch ? memberMatch[1].trim() : void 0
    };
  }
  if (text.includes("-") && !text.toLowerCase().startsWith("m-") && !text.toLowerCase().startsWith("srv-") && !text.toLowerCase().startsWith("ann-") && !text.toLowerCase().startsWith("att-")) {
    const parts = text.split("-");
    if (parts.length >= 2 && parts[0].length >= 2) {
      return {
        churchId: parts[0].trim(),
        memberId: text.trim()
      };
    }
  }
  return { memberId: text };
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
  const targetService = params.serviceId ? services.find((s3) => s3.id === params.serviceId) : services.find((s3) => s3.isOpenForAttendance) || services[0];
  if (!targetService) {
    playErrorBeep();
    return {
      success: false,
      errorMessage: "Pa gen okenn sèvis ki louvri pou prezans kounye a nan legliz sa a."
    };
  }
  const parsed = parseScanToken(rawCode);
  const memberCode = parsed.memberId || rawCode.trim();
  if (parsed.churchId && !validTenantIdentifiers.has(parsed.churchId.trim().toUpperCase())) {
    playErrorBeep();
    return {
      success: false,
      deniedTenant: true,
      errorMessage: `SEKIRITE: Kòd sa a fè pati legliz "${parsed.churchId}". Li pa gen dwa antre nan done "${(church == null ? void 0 : church.name) || currentChurchId}".`
    };
  }
  const churchMembers = getMembersByChurch(canonicalChurchId);
  const matchedMember = churchMembers.find(
    (m2) => m2.memberId.toUpperCase() === memberCode.toUpperCase() || m2.barcodeToken.toUpperCase() === rawCode.trim().toUpperCase() || m2.id === rawCode.trim()
  );
  if (!matchedMember) {
    playErrorBeep();
    return {
      success: false,
      errorMessage: `Kòd manm "${memberCode}" pa jwenn nan lis manm legliz sa a.`
    };
  }
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
        const serviceDateStr = targetService.date || now2.toISOString().split("T")[0];
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
  const newRecord = {
    id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    churchId: canonicalChurchId,
    serviceId: targetService.id,
    serviceCategory: targetService.category,
    serviceTitle: targetService.title,
    serviceDate: targetService.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    memberId: matchedMember.memberId,
    memberDbId: matchedMember.id,
    memberName: matchedMember.fullName,
    memberPhone: matchedMember.phone,
    memberDepartment: matchedMember.department,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    checkInMethod: method,
    recordedBy,
    attendanceStatus,
    lateMinutes,
    lateToleranceMinutes: toleranceMinutes
  };
  allAttendance.unshift(newRecord);
  saveToStorage(STORAGE_KEYS.ATTENDANCE, allAttendance);
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
  const isOnline = isDeviceOnline();
  let isOfflineSaved = false;
  if (!isOnline) {
    addPendingOfflineAttendance(newRecord);
    enqueueAttendance(newRecord).catch(() => {
    });
    isOfflineSaved = true;
  } else {
    firestoreAddAttendance(newRecord).catch((err) => {
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
    isOfflineSaved
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
export function isServiceEnded(service) {
  if (!service) return true;
  if (service.isPermanentlyEnded) return true;
  const now2 = /* @__PURE__ */ new Date();
  if (service.date) {
    const todayStr = now2.toISOString().split("T")[0];
    if (service.date < todayStr) {
      return true;
    }
  }
  if (service.date) {
    const todayStr = now2.toISOString().split("T")[0];
    if (service.date === todayStr) {
      const timeToCheck = service.endTime || (service.startTime ? `${parseInt(service.startTime.split(":")[0] || "8", 10) + 3}:${service.startTime.split(":")[1] || "00"}` : null);
      if (timeToCheck) {
        try {
          const [endHourStr, endMinStr] = timeToCheck.split(":");
          if (endHourStr !== void 0 && endMinStr !== void 0) {
            const [year, month, day] = service.date.split("-").map((v3) => parseInt(v3, 10));
            const serviceEndDateTime = new Date(
              year,
              month - 1,
              day,
              parseInt(endHourStr, 10),
              parseInt(endMinStr, 10),
              0,
              0
            );
            if (now2.getTime() >= serviceEndDateTime.getTime()) {
              return true;
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
export function permanentlyEndService(churchId, serviceId) {
  const allServices = loadFromStorage(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
  let endedService = null;
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const updated = allServices.map((s3) => {
    if (s3.churchId === churchId && s3.id === serviceId) {
      endedService = {
        ...s3,
        isOpenForAttendance: false,
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
  let hasChanges = false;
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const updated = allServices.map((s3) => {
    if (s3.churchId === churchId && !s3.isPermanentlyEnded && isServiceEnded(s3)) {
      hasChanges = true;
      return {
        ...s3,
        isOpenForAttendance: false,
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
  const activeMembers = members.filter((m2) => m2.status === "active");
  const baseMembers = activeMembers.length > 0 ? activeMembers : members;
  const allAttendance = getAttendanceByChurch(churchId);
  const existingAbsences = loadFromStorage(STORAGE_KEYS.ABSENCES, []);
  let updatedAbsences = [...existingAbsences];
  let absencesChanged = false;
  let servicesToCloseIds: string[] = [];

  const servicesToProcess = targetServiceId ? services.filter((s3) => s3.id === targetServiceId) : services;
  servicesToProcess.forEach((srv) => {
    const srvAttendance = allAttendance.filter((a2) => a2.serviceId === srv.id);
    const presentIdSet = /* @__PURE__ */ new Set();
    srvAttendance.forEach((a2) => {
      if (a2.memberId) presentIdSet.add(a2.memberId.toUpperCase());
      if (a2.memberDbId) presentIdSet.add(a2.memberDbId);
    });
    const ended = isServiceEnded(srv);
    const wasOpenedOrConducted = Boolean(srv.isPermanentlyEnded) || Boolean(srv.endedAt) || Boolean(srv.isOpenForAttendance) || srvAttendance.length > 0;
    if (ended && wasOpenedOrConducted) {
      if (srv.isOpenForAttendance) {
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
              serviceDate: srv.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
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
        firestoreUpdateService(s3.id, {
          isOpenForAttendance: false,
          isPermanentlyEnded: true,
          endedAt: endedAtVal
        }).catch(() => {});
        return {
          ...s3,
          isOpenForAttendance: false,
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
  syncServiceAbsencesAutomatically(churchId, serviceId);
  const members = getMembersByChurch(churchId);
  const activeMembers = members.filter((m2) => m2.status === "active");
  const baseMembers = activeMembers.length > 0 ? activeMembers : members;
  const allAttendance = getAttendanceByChurch(churchId).filter((a2) => a2.serviceId === serviceId);
  const allAbsences = getServiceAbsenceRecords(churchId, serviceId);
  const attendanceMap = /* @__PURE__ */ new Map();
  allAttendance.forEach((a2) => {
    if (a2.memberId) attendanceMap.set(a2.memberId.toUpperCase(), a2);
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
  const membersList = baseMembers.map((m2) => {
    const att = m2.memberId && attendanceMap.get(m2.memberId.toUpperCase()) || m2.id && attendanceMap.get(m2.id);
    const abs = m2.memberId && absenceMap.get(m2.memberId.toUpperCase()) || m2.id && absenceMap.get(m2.id);
    let status = "absent";
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
      excuseReason
    };
  });
  const totalPresent = totalOnTime + totalLate;
  const totalMembers = baseMembers.length;
  const attendanceRate = totalMembers > 0 ? Math.round(totalPresent / totalMembers * 100) : 0;
  const punctualityRate = totalPresent > 0 ? Math.round(totalOnTime / totalPresent * 100) : 0;
  return {
    service,
    totalMembers,
    totalPresent,
    totalOnTime,
    totalLate,
    totalAbsent,
    totalExcused,
    attendanceRate,
    punctualityRate,
    membersList
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
      margin: 1,
      width: 280,
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
export function getMemberVerificationUrl(member) {
  if (!member) return "";
  const churchId = (member.churchId || "").trim();
  const memberCode = (member.memberId || member.id || "").trim();
  if (!memberCode) return "";
  const OFFICIAL_VERIFICATION_DOMAIN = "https://verify.omnichurch.download";
  let origin = OFFICIAL_VERIFICATION_DOMAIN;
  if (typeof window !== "undefined" && window.location.origin) {
    const loc = window.location.origin.toLowerCase();
    if (loc.includes("run.app") && !loc.includes("localhost") && !loc.includes("127.0.0.1")) {
      origin = window.location.origin;
    }
  }
  const cleanOrigin = origin.replace(/\/$/, "");
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
export function getSavedLanguage() {
  try {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
      if (saved && (saved === "ht" || saved === "es" || saved === "en" || saved === "fr")) {
        return saved;
      }
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
export function isChurchAdminAuthorized(churchId?: string, userGoogleEmail?: string | null): boolean {
  if (!churchId) return false;
  const church = getChurchById(churchId);
  if (church && church.adminGoogleEmail && userGoogleEmail) {
    if (church.adminGoogleEmail.trim().toLowerCase() === userGoogleEmail.trim().toLowerCase()) {
      return true;
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
