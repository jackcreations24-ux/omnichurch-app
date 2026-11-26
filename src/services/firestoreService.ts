import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  limit,
  writeBatch,
  serverTimestamp,
  increment,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { isSuperDeveloperEmail } from '../utils/cryptoSecurity';
import { isDeaconRole } from '../utils/permissions';
import {
  Church,
  Member,
  ServiceSession,
  Announcement,
  AttendanceRecord,
  AnnouncementComment,
  AnnouncementReactionDoc,
  FirestoreNotificationDoc,
} from '../types';

// Collection references
const CHURCHES_COL = 'churches';
const MEMBERS_COL = 'members';
const SERVICES_COL = 'services';
const ANNOUNCEMENTS_COL = 'announcements';
const ATTENDANCE_COL = 'attendances';
const ANNOUNCEMENT_COMMENTS_COL = 'announcement_comments';
const ANNOUNCEMENT_REACTIONS_COL = 'announcement_reactions';
const NOTIFICATIONS_COL = 'notifications';

const ACCIDENTAL_TEST_CHURCH_IDS = new Set<string>([
  'CH002-MIG9',
  'CH003-DUP',
]);

function isUnitTestRuntime(): boolean {
  try {
    return typeof process !== 'undefined' && process?.env?.OMNICHURCH_TEST_MODE === '1';
  } catch {
    return false;
  }
}

/**
 * Identifies accidental unclaimed test churches created by earlier automated test runs
 * so they never pollute production church lists and can be safely purged from Firestore.
 * NEVER matches CH001 or any real church with an owner account.
 */
export function isAccidentalTestChurch(church?: Partial<Church> | null): boolean {
  if (!church) return false;
  const idUpper = String(church.id || '').trim().toUpperCase();
  if (idUpper === 'CH001') return false;
  if (ACCIDENTAL_TEST_CHURCH_IDS.has(idUpper)) {
    const hasOwner = Boolean(
      (church.adminGoogleEmail && church.adminGoogleEmail.trim()) ||
        (church.adminGoogleUid && church.adminGoogleUid.trim())
    );
    return !hasOwner;
  }
  const nameLower = String(church.name || '').trim().toLowerCase();
  const hasOwner = Boolean(
    (church.adminGoogleEmail && church.adminGoogleEmail.trim()) ||
      (church.adminGoogleUid && church.adminGoogleUid.trim())
  );
  if (!hasOwner && (nameLower === 'nouvo legliz migre' || nameLower === 'legliz tès')) {
    return true;
  }
  return false;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorDebugContext {
  churchId?: string;
  docId?: string;
  payloadKeys?: string[];
  firebaseCode?: string;
  attemptsUsed?: number;
  churchVerified?: boolean;
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  debugContext?: FirestoreErrorDebugContext;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
  debugContext?: FirestoreErrorDebugContext
): void {
  const msg = error instanceof Error ? error.message : String(error);
  const firebaseCode =
    typeof (error as any)?.code === 'string' ? (error as any).code : undefined;
  const mergedDebugContext: FirestoreErrorDebugContext | undefined =
    debugContext || firebaseCode
      ? {
          ...debugContext,
          ...(firebaseCode ? { firebaseCode } : {}),
        }
      : undefined;
  const errInfo: FirestoreErrorInfo = {
    error: msg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
    ...(mergedDebugContext ? { debugContext: mergedDebugContext } : {}),
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  if (
    msg.toLowerCase().includes('missing or insufficient permissions') ||
    msg.toLowerCase().includes('permission-denied') ||
    firebaseCode?.toLowerCase() === 'permission-denied'
  ) {
    throw new Error(JSON.stringify(errInfo));
  }
}

/**
 * Remove undefined values recursively so Firestore setDoc / updateDoc never rejects.
 * Preserves Firestore FieldValue sentinels (serverTimestamp, increment) and Timestamps intact.
 */
function sanitizeForFirestore<T>(data: T): any {
  if (data === null || data === undefined) return null;
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item));
  }
  if (typeof data === 'object') {
    if (Object.getPrototypeOf(data) !== Object.prototype) {
      return data;
    }
    const clean: Record<string, any> = {};
    for (const [key, val] of Object.entries(data as Record<string, any>)) {
      if (val !== undefined) {
        clean[key] = sanitizeForFirestore(val);
      }
    }
    return clean;
  }
  return data;
}

const ALLOWED_CHURCH_KEYS = new Set<string>([
  'id', 'code', 'name', 'ownerId', 'pastor', 'address', 'city', 'country',
  'phone', 'email', 'motto', 'themeColor', 'logoIcon', 'logoUrl',
  'bannerUrl', 'tagline',
  'createdAt', 'updatedAt', 'rnc', 'rncNumber', 'rncDocumentPhoto',
  'rncDocumentUploadedAt', 'rncVerificationStatus', 'rncVerifiedAt',
  'rncLegalName', 'rncDocumentType', 'rncNotes', 'adminGoogleEmail',
  'adminGoogleUid', 'adminGoogleName', 'adminGooglePhoto', 'adminAuthMethod',
  'adminVerified', 'adminVerifiedAt', 'adminVerifiedBy',
  'adminPasscode', 'adminPasscodeUpdatedAt', 'quickPinEnabled', 'autoLockMinutes',
  'customCardTitle', 'signatureUrl', 'website', 'windowsExeDownloadUrl',
  'desktopAppVersion', 'donationInfo', 'churchRules', 'status', 'archivedAt',
  'isLegacy',
]);

const ALLOWED_SERVICE_KEYS = new Set<string>([
  'id', 'serviceId', 'churchId', 'churchName', 'category', 'type',
  'name', 'title', 'serviceTitle', 'serviceName', 'description',
  'imageUrl', 'posterUrl', 'bannerUrl', 'date', 'serviceDate',
  'dateFormatted', 'time', 'startTime', 'endTime', 'preacherOrLeader',
  'leader', 'preacher', 'reader', 'musicians', 'ushers', 'department',
  'authorId', 'authorName', 'createdBy', 'updatedBy', 'theme',
  'passage', 'notes', 'status', 'location', 'address', 'qrCode',
  'recurrence', 'usherMemberIds', 'usherUserIds',
  'isOpenForAttendance', 'wasOpenedForAttendance', 'isPermanentlyEnded',
  'isLive', 'isActive', 'recurring', 'endedAt', 'sendReminder24h',
  'reminderSentAt', 'startTimeEpochMillis', 'endTimeEpochMillis',
  'lateToleranceMinutes', 'lateThresholdMinutes', 'capacity',
  'durationMinutes', 'attendanceCount', 'reactionsCount',
  'commentsCount', 'createdAt', 'updatedAt', 'isDemo',
]);

const ALLOWED_MEMBER_KEYS = new Set<string>([
  'id', 'userId', 'churchId', 'memberId', 'pin', 'securityPin', 'titlePrefix',
  'fullName', 'gender', 'civilStatus', 'profession', 'dateOfBirth',
  'baptismDate', 'phone', 'emergencyContact', 'emergencyContactName',
  'email', 'googleEmail', 'googleUid', 'googlePhoto', 'address',
  'city', 'zone', 'department', 'role', 'memberType', 'cellGroup', 'joinedDate',
  'status', 'avatarUrl', 'photoUrl', 'legalDocumentType',
  'legalDocumentNumber', 'barcodeToken', 'notes', 'isDemo',
  'createdAt', 'updatedAt',
]);

type LocalChurchLookupFn = (churchIdOrCode: string) => Church | undefined;
let registeredLocalChurchLookup: LocalChurchLookupFn | null = null;
const verifiedExistingChurchIds = new Set<string>();
const syncedDeaconProfileKeys = new Set<string>();
let activeDeaconSessionContext: { churchId: string; member: Partial<Member> } | null = null;
const inFlightEnsureChurchMap = new Map<string, Promise<{ canonicalChurchId: string; existsInFirestore: boolean }>>();
const inFlightDeaconProfileMap = new Map<string, Promise<boolean>>();
const inFlightMemberAddMap = new Map<string, Promise<void>>();
const inFlightServiceAddMap = new Map<string, Promise<void>>();

async function waitForAuthStateReady(): Promise<void> {
  try {
    if (typeof (auth as any)?.authStateReady === 'function') {
      await (auth as any).authStateReady();
    }
  } catch {
    // Non-fatal auth hydration guard
  }
}

function sanitizeOptionalTimestampOrString(val: unknown): any {
  if (val === undefined || val === null) return undefined;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed ? trimmed.slice(0, 100) : undefined;
  }
  if (typeof val === 'number' && Number.isFinite(val)) {
    try {
      return new Date(val).toISOString().slice(0, 100);
    } catch {
      return undefined;
    }
  }
  if (typeof val === 'object') {
    const obj = val as Record<string, any>;
    // Preserve genuine Firestore Timestamp / FieldValue instances (non-plain objects)
    if (Object.getPrototypeOf(val) !== Object.prototype) {
      return val;
    }
    // Convert plain JSON-serialized Timestamp objects from localStorage ({ seconds, nanoseconds }) into ISO strings
    // so Firestore rules `isOptionalTimestampOrString` never rejects them as plain Maps.
    const rawSec =
      typeof obj.seconds === 'number'
        ? obj.seconds
        : typeof obj._seconds === 'number'
        ? obj._seconds
        : null;
    if (rawSec !== null && Number.isFinite(rawSec)) {
      const rawNano =
        typeof obj.nanoseconds === 'number'
          ? obj.nanoseconds
          : typeof obj._nanoseconds === 'number'
          ? obj._nanoseconds
          : 0;
      try {
        const ms = rawSec * 1000 + Math.floor(rawNano / 1e6);
        return new Date(ms).toISOString().slice(0, 100);
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

/**
 * Builds the minimal 4-field surgical patch for Super Developer `adminVerified` updates
 * so existing church data (profile, donations, rules, signature) is never overwritten by stale local state.
 */
export function buildSurgicalAdminVerificationPatch(
  verified: boolean,
  verifierEmail: string,
  nowIso: string = new Date().toISOString()
): {
  adminVerified: boolean;
  adminVerifiedAt: string | null;
  adminVerifiedBy: string | null;
  updatedAt: string;
} {
  const cleanIso = String(nowIso || new Date().toISOString()).trim().slice(0, 100);
  const cleanEmail = String(verifierEmail || '').trim().toLowerCase().slice(0, 200);
  return {
    adminVerified: Boolean(verified),
    adminVerifiedAt: verified ? cleanIso : null,
    adminVerifiedBy: verified && cleanEmail ? cleanEmail : null,
    updatedAt: cleanIso,
  };
}

/**
 * Detects whether an existing Firestore `churches/{churchId}` document contains legacy schema drift
 * (unknown keys outside `ALLOWED_CHURCH_KEYS`, mismatched `id`, invalid enum values, or plain-object timestamps)
 * that would cause `isValidChurch(incoming(), churchId)` to reject a partial `updateDoc`.
 */
export function hasChurchDocumentSchemaDrift(
  docData: Record<string, any> | null | undefined,
  expectedChurchId: string
): boolean {
  if (!docData || typeof docData !== 'object') return true;
  if (docData.id !== expectedChurchId) return true;
  if (typeof docData.name !== 'string' || docData.name.trim().length < 2 || docData.name.length > 200) {
    return true;
  }
  for (const key of Object.keys(docData)) {
    if (!ALLOWED_CHURCH_KEYS.has(key)) return true;
  }
  if (
    docData.adminAuthMethod !== undefined &&
    docData.adminAuthMethod !== null &&
    !['email_password', 'google', 'both', 'legacy_pin'].includes(String(docData.adminAuthMethod))
  ) {
    return true;
  }
  if (
    docData.status !== undefined &&
    docData.status !== null &&
    !['active', 'archived'].includes(String(docData.status))
  ) {
    return true;
  }
  for (const tsKey of [
    'createdAt',
    'updatedAt',
    'adminVerifiedAt',
    'adminPasscodeUpdatedAt',
    'rncDocumentUploadedAt',
    'rncVerifiedAt',
    'archivedAt',
  ]) {
    const val = docData[tsKey];
    if (
      val !== undefined &&
      val !== null &&
      typeof val !== 'string' &&
      typeof val === 'object' &&
      Object.getPrototypeOf(val) === Object.prototype
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Registers a synchronous lookup helper (e.g. getChurchById from storage.ts) without creating circular ES module import failures.
 */
export function registerLocalChurchLookup(fn: LocalChurchLookupFn): void {
  registeredLocalChurchLookup = fn;
}

function sanitizeFirestoreDocIdSegment(raw: string, fallbackPrefix: string = 'CH'): string {
  const cleaned = String(raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '');
  if (cleaned.length >= 2) {
    return cleaned.slice(0, 64);
  }
  return `${fallbackPrefix}${cleaned || '001'}`.slice(0, 64);
}

function clampOptionalString(val: unknown, maxLen: number): string | undefined {
  if (typeof val !== 'string') return undefined;
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLen);
}

function clampOptionalMediaString(val: unknown, maxLen: number = 600000): string | undefined {
  if (typeof val !== 'string') return undefined;
  const trimmed = val.trim();
  if (!trimmed || trimmed.length > maxLen) return undefined;
  return trimmed;
}

function resolveCanonicalChurchForWrite(rawChurchId?: string): { canonicalChurchId: string; localChurch?: Church } {
  const trimmed = String(rawChurchId || '').trim();
  if (trimmed && registeredLocalChurchLookup) {
    try {
      const localMatch = registeredLocalChurchLookup(trimmed);
      if (localMatch && localMatch.id) {
        return {
          canonicalChurchId: sanitizeFirestoreDocIdSegment(localMatch.id, 'CH'),
          localChurch: localMatch,
        };
      }
    } catch {
      // non-fatal lookup error
    }
  }
  return {
    canonicalChurchId: sanitizeFirestoreDocIdSegment(trimmed || 'CH001', 'CH'),
    localChurch: undefined,
  };
}

/**
 * Builds a strict `churches/{churchId}` document payload matching every key and limit in `firestore.rules` (`isValidChurch`).
 */
export function buildChurchFirestorePayload(
  church: Partial<Church>,
  docIdOverride?: string,
  options?: {
    deliberatePasscodeUpdate?: boolean;
    retireLegacyPasscode?: boolean;
    deliberateAdminVerificationUpdate?: boolean;
    clearAdminGooglePhoto?: boolean;
    clearLogoUrl?: boolean;
    clearSignatureUrl?: boolean;
  }
): Record<string, any> {
  const resolvedId = sanitizeFirestoreDocIdSegment(docIdOverride || church.id || 'CH001', 'CH');
  const rawName = typeof church.name === 'string' ? church.name.trim() : '';
  const safeName =
    rawName.length >= 2
      ? rawName.slice(0, 200)
      : rawName.length === 1
      ? `${rawName} Legliz`.slice(0, 200)
      : `Legliz ${resolvedId}`.slice(0, 200);

  const rawAuthMethod = typeof church.adminAuthMethod === 'string' ? church.adminAuthMethod.trim() : '';
  const validAuthMethod = ['email_password', 'google', 'both', 'legacy_pin'].includes(rawAuthMethod)
    ? rawAuthMethod
    : undefined;

  const rawStatus = typeof church.status === 'string' ? church.status.trim().toLowerCase() : '';
  const validStatus = rawStatus === 'archived' || rawStatus === 'active' ? rawStatus : undefined;

  const resolvedOwnerId = clampOptionalString(
    (church as any).ownerId || church.adminGoogleUid,
    128
  );

  const shouldClearLogo =
    Boolean(options?.clearLogoUrl) ||
    church.logoUrl === null ||
    church.logoUrl === '';
  const shouldClearAdminPhoto =
    Boolean(options?.clearAdminGooglePhoto) ||
    church.adminGooglePhoto === null ||
    church.adminGooglePhoto === '';
  const shouldClearSignature =
    Boolean(options?.clearSignatureUrl) ||
    church.signatureUrl === null ||
    church.signatureUrl === '';

  const candidate: Record<string, any> = {
    id: resolvedId,
    code: clampOptionalString(church.code, 64) || resolvedId.slice(0, 64),
    name: safeName,
    ownerId: resolvedOwnerId,
    pastor: clampOptionalString(church.pastor, 200) ?? '',
    address: clampOptionalString(church.address, 300) ?? '',
    city: clampOptionalString(church.city, 120) ?? 'Ayiti',
    country: clampOptionalString(church.country, 120),
    phone: clampOptionalString(church.phone, 64) ?? '',
    email: clampOptionalString(church.email, 200) ?? '',
    motto: clampOptionalString(church.motto, 400) ?? '',
    themeColor: clampOptionalString(church.themeColor, 64) ?? 'indigo',
    logoIcon: clampOptionalString(church.logoIcon, 64) ?? 'Church',
    logoUrl: shouldClearLogo ? null : clampOptionalMediaString(church.logoUrl, 600000),
    bannerUrl: clampOptionalMediaString((church as any).bannerUrl, 600000),
    tagline: clampOptionalString((church as any).tagline, 300),
    createdAt:
      sanitizeOptionalTimestampOrString((church as any).createdAt) ||
      new Date().toISOString().split('T')[0],
    updatedAt:
      sanitizeOptionalTimestampOrString((church as any).updatedAt) ||
      new Date().toISOString(),
    rnc: clampOptionalString(church.rnc, 100),
    rncNumber: clampOptionalString(church.rncNumber, 100),
    rncDocumentPhoto: clampOptionalMediaString(church.rncDocumentPhoto, 600000),
    rncDocumentUploadedAt: sanitizeOptionalTimestampOrString(church.rncDocumentUploadedAt),
    rncVerificationStatus: clampOptionalString(church.rncVerificationStatus, 32),
    rncVerifiedAt: sanitizeOptionalTimestampOrString(church.rncVerifiedAt),
    rncLegalName: clampOptionalString(church.rncLegalName, 200),
    rncDocumentType: clampOptionalString(church.rncDocumentType, 64),
    rncNotes: clampOptionalString(church.rncNotes, 1000),
    adminGoogleEmail: clampOptionalString(church.adminGoogleEmail, 200)?.toLowerCase(),
    adminGoogleUid: clampOptionalString(church.adminGoogleUid, 128),
    adminGoogleName: clampOptionalString(church.adminGoogleName, 200),
    adminGooglePhoto: shouldClearAdminPhoto
      ? null
      : clampOptionalMediaString(church.adminGooglePhoto, 600000),
    adminAuthMethod: validAuthMethod,
    quickPinEnabled: typeof church.quickPinEnabled === 'boolean' ? church.quickPinEnabled : undefined,
    autoLockMinutes:
      typeof church.autoLockMinutes === 'number' && Number.isFinite(church.autoLockMinutes)
        ? Math.min(120, Math.max(0, Math.round(church.autoLockMinutes)))
        : undefined,
    customCardTitle: clampOptionalString(church.customCardTitle, 150),
    signatureUrl: shouldClearSignature
      ? null
      : clampOptionalMediaString(church.signatureUrl, 600000),
    website: clampOptionalString(church.website, 300),
    windowsExeDownloadUrl: clampOptionalString(church.windowsExeDownloadUrl, 500),
    desktopAppVersion: clampOptionalString(church.desktopAppVersion, 64),
    donationInfo: church.donationInfo,
    churchRules: church.churchRules,
    status: validStatus,
    archivedAt: sanitizeOptionalTimestampOrString(church.archivedAt),
    isLegacy: typeof church.isLegacy === 'boolean' ? church.isLegacy : undefined,
  };

  if (options?.retireLegacyPasscode) {
    candidate.adminPasscode = null;
    candidate.adminPasscodeUpdatedAt = null;
  } else if (options?.deliberatePasscodeUpdate) {
    candidate.adminPasscode = clampOptionalString(church.adminPasscode, 256) ?? null;
    candidate.adminPasscodeUpdatedAt =
      sanitizeOptionalTimestampOrString(church.adminPasscodeUpdatedAt) ?? null;
  }

  // Only emit adminVerified* fields when explicitly triggered by Super Developer approval/revocation
  // so regular church admins never mutate Super-Developer-locked fields in firestore.rules.
  if (options?.deliberateAdminVerificationUpdate) {
    candidate.adminVerified = Boolean(church.adminVerified);
    candidate.adminVerifiedAt = church.adminVerified
      ? clampOptionalString(church.adminVerifiedAt, 100) ?? new Date().toISOString()
      : null;
    candidate.adminVerifiedBy = church.adminVerified
      ? clampOptionalString(church.adminVerifiedBy, 200)?.toLowerCase() ?? null
      : null;
  }

  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(candidate)) {
    if (ALLOWED_CHURCH_KEYS.has(key) && val !== undefined) {
      sanitized[key] = sanitizeForFirestore(val);
    }
  }
  return sanitized;
}

const VALID_CHURCH_ID_REGEX = /^[a-zA-Z0-9_-]{2,64}$/;

/**
 * Enforces that every member creation/update carries an explicit, valid, non-empty `churchId`.
 * Resolves church code aliases to the canonical church ID when registered, and throws immediately
 * if `churchId` is missing or invalid instead of silently defaulting to another tenant.
 */
export function assertMandatoryMemberChurchId(
  rawChurchId?: string,
  canonicalChurchIdOverride?: string
): string {
  const rawInput = String(canonicalChurchIdOverride ?? rawChurchId ?? '').trim();
  if (!rawInput) {
    throw new Error(
      'Mandatory churchId is required for all member creation and update events.'
    );
  }

  let candidate = rawInput;
  if (!canonicalChurchIdOverride && registeredLocalChurchLookup) {
    try {
      const localMatch = registeredLocalChurchLookup(rawInput);
      if (localMatch && typeof localMatch.id === 'string' && localMatch.id.trim()) {
        candidate = localMatch.id.trim();
      }
    } catch {
      // Non-fatal local lookup error; validate rawInput directly
    }
  }

  if (!VALID_CHURCH_ID_REGEX.test(candidate)) {
    throw new Error(
      `Invalid mandatory churchId "${rawInput}" for member operation. Expected 2-64 alphanumeric, underscore, or hyphen characters.`
    );
  }

  return candidate;
}

/**
 * Builds a strict `members/{memberId}` document payload matching every key, type, enum, and length bound
 * in `firestore.rules` (`isValidMember`) and `firebase-blueprint.json`.
 * Explicitly enforces `churchId` as a mandatory, immutable (non-writable, non-configurable) field.
 */
export function buildMemberFirestorePayload(
  member: Partial<Member> & { createdAt?: any; updatedAt?: any },
  cleanDocId: string,
  canonicalChurchIdOverride?: string,
  options?: { clearPhoto?: boolean }
): Record<string, any> {
  const canonicalChurchId = assertMandatoryMemberChurchId(
    member?.churchId,
    canonicalChurchIdOverride
  );

  const rawFullName = typeof member.fullName === 'string' ? member.fullName.trim() : '';
  const safeFullName =
    rawFullName.length >= 2
      ? rawFullName.slice(0, 200)
      : rawFullName.length === 1
      ? `${rawFullName} M`.slice(0, 200)
      : 'Nouvo Manm';

  const rawMemberType = typeof member.memberType === 'string' ? member.memberType.trim().toLowerCase() : '';
  const validMemberType = rawMemberType === 'visitor' || rawMemberType === 'member' ? rawMemberType : 'member';

  const rawStatus = typeof member.status === 'string' ? member.status.trim().toLowerCase() : '';
  const validStatus = rawStatus === 'inactive' || rawStatus === 'active' ? rawStatus : 'active';

  const safeMemberCode = clampOptionalString(member.memberId, 64) || cleanDocId.slice(0, 64);
  const safeBarcodeToken =
    clampOptionalString(member.barcodeToken, 256) ||
    `CHURCH:${canonicalChurchId}|MEMBER:${safeMemberCode}`.slice(0, 256);

  const isClearingPhoto = Boolean(options?.clearPhoto);
  const safeAvatarUrl = isClearingPhoto ? null : clampOptionalMediaString(member.avatarUrl, 600000);
  const rawPhotoUrl = isClearingPhoto ? null : clampOptionalMediaString(member.photoUrl, 600000);
  const rawGooglePhoto = isClearingPhoto ? null : clampOptionalMediaString(member.googlePhoto, 600000);
  const isLargeBase64Avatar = Boolean(
    !isClearingPhoto && safeAvatarUrl && safeAvatarUrl.startsWith('data:image/') && safeAvatarUrl.length > 120000
  );
  // Avoid triplicating huge base64 data URLs across avatarUrl/photoUrl/googlePhoto (which can exceed Firestore's 1MB doc limit)
  const safePhotoUrl =
    isLargeBase64Avatar && rawPhotoUrl === safeAvatarUrl ? undefined : rawPhotoUrl;
  const safeGooglePhoto =
    isLargeBase64Avatar && rawGooglePhoto === safeAvatarUrl ? undefined : rawGooglePhoto;

  const candidate: Record<string, any> = {
    id: cleanDocId.slice(0, 128),
    userId: clampOptionalString(member.userId, 128),
    churchId: canonicalChurchId,
    memberId: safeMemberCode,
    pin: clampOptionalString(member.pin, 64),
    securityPin: clampOptionalString(member.securityPin, 64),
    titlePrefix: clampOptionalString(member.titlePrefix, 64),
    fullName: safeFullName,
    gender: clampOptionalString(member.gender, 32),
    civilStatus: clampOptionalString(member.civilStatus, 64),
    profession: clampOptionalString(member.profession, 120),
    dateOfBirth: clampOptionalString(member.dateOfBirth, 64) ?? '2000-01-01',
    baptismDate: clampOptionalString(member.baptismDate, 64),
    phone: clampOptionalString(member.phone, 64) ?? '',
    emergencyContact: clampOptionalString(member.emergencyContact, 64),
    emergencyContactName: clampOptionalString(member.emergencyContactName, 150),
    email: clampOptionalString(member.email, 200) ?? '',
    googleEmail: clampOptionalString(member.googleEmail, 200)?.toLowerCase(),
    googleUid: clampOptionalString(member.googleUid, 128),
    googlePhoto: safeGooglePhoto,
    address: clampOptionalString(member.address, 300) ?? '',
    city: clampOptionalString(member.city, 120),
    zone: clampOptionalString(member.zone, 120),
    department: clampOptionalString(member.department, 120) ?? 'Service Général',
    role: clampOptionalString(member.role, 120) ?? 'Manm',
    memberType: validMemberType,
    cellGroup: clampOptionalString(member.cellGroup, 120),
    joinedDate: clampOptionalString(member.joinedDate, 64) ?? new Date().toISOString().split('T')[0],
    status: validStatus,
    avatarUrl: safeAvatarUrl,
    photoUrl: safePhotoUrl,
    legalDocumentType: clampOptionalString(member.legalDocumentType, 32),
    legalDocumentNumber: clampOptionalString(member.legalDocumentNumber, 100),
    barcodeToken: safeBarcodeToken,
    notes: clampOptionalString(member.notes, 2000) ?? '',
    isDemo: typeof member.isDemo === 'boolean' ? member.isDemo : undefined,
    createdAt: sanitizeOptionalTimestampOrString(member.createdAt),
    updatedAt: sanitizeOptionalTimestampOrString(member.updatedAt),
  };

  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(candidate)) {
    if (key === 'churchId') continue;
    if (ALLOWED_MEMBER_KEYS.has(key) && val !== undefined) {
      sanitized[key] = sanitizeForFirestore(val);
    }
  }

  // Lock `churchId` as a mandatory, immutable property on every member payload
  Object.defineProperty(sanitized, 'churchId', {
    value: canonicalChurchId,
    enumerable: true,
    writable: false,
    configurable: false,
  });

  return sanitized;
}

/**
 * Clears cached verified church IDs (called on Auth UID change or sign-out so ownership is re-validated).
 */
export function clearVerifiedChurchCache(): void {
  verifiedExistingChurchIds.clear();
  inFlightEnsureChurchMap.clear();
}

export type ChurchAdminSyncStatus =
  | 'already_synced'
  | 'created_in_cloud'
  | 'uid_healed'
  | 'email_verification_required'
  | 'owner_mismatch'
  | 'offline_or_unauthenticated';

export interface ChurchAdminSyncResult {
  synced: boolean;
  status: ChurchAdminSyncStatus;
  church?: Church;
  expectedEmail?: string;
  serverUid?: string;
  currentUid?: string;
}

/**
 * Verifies and synchronizes the active Firebase Auth user's UID/email/token with the live
 * Firestore `churches/{churchId}` document so subsequent tenant writes (`members`, `services`,
 * `announcements`) succeed under strict multi-tenant rules.
 */
export async function syncChurchAdminOwnershipWithCloud(
  candidateChurch: Church,
  options?: {
    forceTokenRefresh?: boolean;
    reloadUser?: boolean;
  }
): Promise<ChurchAdminSyncResult> {
  if (!candidateChurch || !candidateChurch.id) {
    return { synced: false, status: 'offline_or_unauthenticated' };
  }

  await waitForAuthStateReady();
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return { synced: false, status: 'offline_or_unauthenticated' };
  }

  if (options?.reloadUser) {
    try {
      await currentUser.reload();
    } catch {
      // Non-fatal offline/network reload error
    }
  }
  if (options?.forceTokenRefresh || options?.reloadUser) {
    try {
      await currentUser.getIdToken(true);
    } catch {
      // Non-fatal offline/network token refresh error
    }
  }

  const { canonicalChurchId } = resolveCanonicalChurchForWrite(candidateChurch.id);
  const currentUid = currentUser.uid;
  const currentEmail = (currentUser.email || '').trim().toLowerCase();
  const churchRef = doc(db, CHURCHES_COL, canonicalChurchId);

  try {
    let snap;
    try {
      snap = await getDocFromServer(churchRef);
    } catch {
      snap = await getDoc(churchRef);
    }

    // Case 1: Church document does not exist in Firestore yet — create it bound to currentUid
    if (!snap.exists()) {
      const enrichedChurch: Church = {
        ...candidateChurch,
        id: canonicalChurchId,
        adminGoogleUid: currentUid,
        adminGoogleEmail: currentEmail || candidateChurch.adminGoogleEmail,
        adminGoogleName:
          candidateChurch.adminGoogleName ||
          currentUser.displayName ||
          candidateChurch.pastor ||
          candidateChurch.name,
        adminAuthMethod: candidateChurch.adminAuthMethod || 'email_password',
      };
      const payload = buildChurchFirestorePayload(enrichedChurch, canonicalChurchId, {
        deliberatePasscodeUpdate: Boolean(enrichedChurch.adminPasscode),
      });
      await setDoc(churchRef, payload, { merge: true });
      verifiedExistingChurchIds.add(canonicalChurchId);
      return {
        synced: true,
        status: 'created_in_cloud',
        church: enrichedChurch,
        currentUid,
      };
    }

    const serverData = snap.data() as Partial<Church> & { ownerId?: string };
    const serverUid = (serverData.adminGoogleUid || '').trim();
    const serverOwnerId = (serverData.ownerId || '').trim();
    const serverEmail = (serverData.adminGoogleEmail || '').trim().toLowerCase();
    const serverIsUnclaimed = !serverUid && !serverOwnerId && !serverEmail;

    // Super Developer always has verified access
    if (currentUser.emailVerified && isSuperDeveloperEmail(currentEmail)) {
      verifiedExistingChurchIds.add(canonicalChurchId);
      return {
        synced: true,
        status: 'already_synced',
        church: { ...candidateChurch, ...serverData, id: canonicalChurchId } as Church,
        serverUid: serverUid || serverOwnerId,
        currentUid,
      };
    }

    // Case 2: Server church already bound to this exact Firebase Auth UID (via adminGoogleUid or mobile ownerId)
    if ((serverUid && serverUid === currentUid) || (serverOwnerId && serverOwnerId === currentUid)) {
      const localUpdatedMs = resolveTimestampMs(candidateChurch.updatedAt);
      const serverUpdatedMs = resolveTimestampMs(serverData.updatedAt);
      const preferLocalMedia = localUpdatedMs > serverUpdatedMs;
      const mergedChurch: Church = {
        ...candidateChurch,
        ...serverData,
        id: canonicalChurchId,
        adminGoogleUid: currentUid,
        adminGoogleEmail: serverEmail || currentEmail || candidateChurch.adminGoogleEmail,
        adminGooglePhoto: preferLocalMedia
          ? candidateChurch.adminGooglePhoto
          : serverData.adminGooglePhoto === null
          ? ''
          : serverData.adminGooglePhoto ?? candidateChurch.adminGooglePhoto,
        logoUrl: preferLocalMedia
          ? candidateChurch.logoUrl
          : serverData.logoUrl === null
          ? undefined
          : serverData.logoUrl ?? candidateChurch.logoUrl,
      };
      verifiedExistingChurchIds.add(canonicalChurchId);
      return {
        synced: true,
        status: 'already_synced',
        church: mergedChurch,
        serverUid: currentUid,
        currentUid,
      };
    }

    // Case 3: Server church is unclaimed (legacy PIN church) — claim with currentUid right now
    if (serverIsUnclaimed) {
      const claimedChurch: Church = {
        ...candidateChurch,
        ...serverData,
        id: canonicalChurchId,
        adminGoogleUid: currentUid,
        adminGoogleEmail: currentEmail || candidateChurch.adminGoogleEmail,
        adminGoogleName:
          candidateChurch.adminGoogleName ||
          currentUser.displayName ||
          serverData.pastor ||
          candidateChurch.name,
        adminAuthMethod:
          candidateChurch.adminAuthMethod ||
          (currentUser.providerData?.some((p) => p.providerId === 'google.com')
            ? 'google'
            : 'email_password'),
      };
      const payload = buildChurchFirestorePayload(claimedChurch, canonicalChurchId, {
        deliberatePasscodeUpdate: Boolean(claimedChurch.adminPasscode),
      });
      await setDoc(churchRef, payload, { merge: true });
      verifiedExistingChurchIds.add(canonicalChurchId);
      return {
        synced: true,
        status: 'uid_healed',
        church: claimedChurch,
        serverUid: currentUid,
        currentUid,
      };
    }

    // Case 4: Server church email matches current user's email, but server UID is missing or belongs to an older account/provider
    if (serverEmail && currentEmail && serverEmail === currentEmail) {
      let emailVerifiedNow = Boolean(currentUser.emailVerified);
      if (!emailVerifiedNow) {
        // Double-check live Auth state + force refresh JWT in case user already verified their email
        try {
          await currentUser.reload();
          emailVerifiedNow = Boolean(currentUser.emailVerified);
          if (emailVerifiedNow) {
            await currentUser.getIdToken(true);
          }
        } catch {
          // ignore network reload error
        }
      }

      const isPlatformVerifiedAdmin = serverData.adminVerified === true;
      const emailOrPlatformVerified = emailVerifiedNow || isPlatformVerifiedAdmin;

      const mergedChurch: Church = {
        ...candidateChurch,
        ...serverData,
        id: canonicalChurchId,
        adminGoogleEmail: serverEmail,
      };

      if (!emailOrPlatformVerified) {
        // Under strict rules, updating adminGoogleUid on an already-claimed church by email match requires email_verified == true OR platform-owner adminVerified == true
        return {
          synced: false,
          status: 'email_verification_required',
          church: mergedChurch,
          expectedEmail: serverEmail,
          serverUid,
          currentUid,
        };
      }

      // User's email IS verified (or platform owner approved adminVerified == true) — ensure fresh token and heal adminGoogleUid permanently on Firestore
      try {
        await currentUser.getIdToken(true);
      } catch {
        // ignore
      }
      const healedChurch: Church = {
        ...mergedChurch,
        adminGoogleUid: currentUid,
        adminGoogleEmail: currentEmail,
        adminGoogleName:
          mergedChurch.adminGoogleName ||
          currentUser.displayName ||
          mergedChurch.pastor ||
          mergedChurch.name,
        adminAuthMethod:
          mergedChurch.adminAuthMethod === 'email_password' &&
          currentUser.providerData?.some((p) => p.providerId === 'google.com')
            ? 'both'
            : mergedChurch.adminAuthMethod || 'email_password',
      };
      const payload = buildChurchFirestorePayload(healedChurch, canonicalChurchId, {
        deliberatePasscodeUpdate: Boolean(healedChurch.adminPasscode),
      });
      await setDoc(churchRef, payload, { merge: true });
      verifiedExistingChurchIds.add(canonicalChurchId);
      return {
        synced: true,
        status: 'uid_healed',
        church: healedChurch,
        serverUid: currentUid,
        currentUid,
      };
    }

    // Case 5: Church is owned by a different email/UID on Firestore
    return {
      synced: false,
      status: 'owner_mismatch',
      expectedEmail: serverEmail || undefined,
      serverUid,
      currentUid,
    };
  } catch (err: any) {
    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('missing or insufficient permissions')) {
      return {
        synced: false,
        status: !currentUser.emailVerified ? 'email_verification_required' : 'owner_mismatch',
        expectedEmail: candidateChurch.adminGoogleEmail || currentEmail || undefined,
        currentUid,
      };
    }
    console.warn(`syncChurchAdminOwnershipWithCloud warning (${canonicalChurchId}):`, err);
    return {
      synced: false,
      status: 'offline_or_unauthenticated',
      currentUid,
    };
  }
}

/**
 * Ensures parent `churches/{churchId}` document exists in Firestore before dependent tenant writes (`members`, `services`, `announcements`).
 * Resolves church code aliases to the canonical church ID, refreshes Auth JWT on retry, and backfills missing local-only or newly created churches safely.
 */
export async function firestoreEnsureChurchExists(
  rawChurchId: string,
  candidateChurch?: Church | null,
  forceRecheck: boolean = false
): Promise<{ canonicalChurchId: string; existsInFirestore: boolean }> {
  const { canonicalChurchId, localChurch } = resolveCanonicalChurchForWrite(rawChurchId);
  const effectiveChurch = candidateChurch || localChurch;

  if (!canonicalChurchId) {
    return { canonicalChurchId: '', existsInFirestore: false };
  }
  if (isUnitTestRuntime()) {
    return { canonicalChurchId, existsInFirestore: false };
  }
  if (!forceRecheck && verifiedExistingChurchIds.has(canonicalChurchId)) {
    return { canonicalChurchId, existsInFirestore: true };
  }

  const existingInFlight = inFlightEnsureChurchMap.get(canonicalChurchId);
  if (existingInFlight && !forceRecheck) {
    return existingInFlight;
  }

  const task = (async () => {
    try {
      await waitForAuthStateReady();
      if (forceRecheck && auth.currentUser) {
        try {
          await auth.currentUser.reload();
        } catch {
          // ignore offline reload error
        }
        try {
          await auth.currentUser.getIdToken(true);
        } catch {
          // ignore offline token refresh error
        }
      }

      const churchRef = doc(db, CHURCHES_COL, canonicalChurchId);
      let snap = forceRecheck
        ? await getDocFromServer(churchRef).catch(() => getDoc(churchRef))
        : await getDoc(churchRef);

      if (
        !forceRecheck &&
        snap.exists() &&
        snap.metadata?.fromCache &&
        typeof navigator !== 'undefined' &&
        navigator.onLine
      ) {
        try {
          snap = await getDocFromServer(churchRef);
        } catch {
          // Offline / transient network error: keep local snapshot result
        }
      }

      if (snap.exists()) {
        // Auto-heal server adminGoogleUid if the server doc is unclaimed OR verified email matches
        const serverData = snap.data() as Partial<Church> & { ownerId?: string };
        const currentUser = auth.currentUser;
        if (currentUser) {
          const serverUid = (serverData.adminGoogleUid || '').trim();
          const serverOwnerId = (serverData.ownerId || '').trim();
          const serverEmail = (serverData.adminGoogleEmail || '').trim().toLowerCase();
          const currentEmail = (currentUser.email || '').trim().toLowerCase();
          const serverIsUnclaimed = !serverUid && !serverOwnerId && !serverEmail;
          const isPlatformVerifiedAdmin = serverData.adminVerified === true;
          const alreadyOwnedByCurrentUid =
            serverUid === currentUser.uid || serverOwnerId === currentUser.uid;
          const canHealByVerifiedEmail =
            !alreadyOwnedByCurrentUid &&
            (Boolean(currentUser.emailVerified) || isPlatformVerifiedAdmin) &&
            Boolean(serverEmail) &&
            serverEmail === currentEmail;

          if (serverIsUnclaimed || canHealByVerifiedEmail) {
            try {
              const mergedChurch: Church = {
                ...(effectiveChurch || ({} as Church)),
                ...serverData,
                id: canonicalChurchId,
                adminGoogleUid: currentUser.uid,
                adminGoogleEmail: serverEmail || currentEmail || effectiveChurch?.adminGoogleEmail,
              };
              const payload = buildChurchFirestorePayload(mergedChurch, canonicalChurchId, {
                deliberatePasscodeUpdate: Boolean(mergedChurch.adminPasscode),
              });
              await setDoc(churchRef, payload, { merge: true });
            } catch {
              // Non-fatal: write retry will surface permission state cleanly
            }
          }
        }
        verifiedExistingChurchIds.add(canonicalChurchId);
        return { canonicalChurchId, existsInFirestore: true };
      }

      if (effectiveChurch) {
        const currentUid = auth.currentUser?.uid;
        const currentEmail = auth.currentUser?.email?.trim().toLowerCase();
        const churchEmail = (effectiveChurch.adminGoogleEmail || '').trim().toLowerCase();
        const matchesCurrentAccount = Boolean(currentUid && (!churchEmail || (currentEmail && churchEmail === currentEmail)));

        const enrichedChurch: Church = {
          ...effectiveChurch,
          id: canonicalChurchId,
          ...(matchesCurrentAccount
            ? {
                adminGoogleUid: currentUid,
                ...(currentEmail ? { adminGoogleEmail: currentEmail } : {}),
              }
            : {}),
        };

        const payload = buildChurchFirestorePayload(enrichedChurch, canonicalChurchId, {
          deliberatePasscodeUpdate: Boolean(enrichedChurch.adminPasscode),
        });
        await setDoc(churchRef, payload, { merge: true });
        verifiedExistingChurchIds.add(canonicalChurchId);
        return { canonicalChurchId, existsInFirestore: true };
      }

      return { canonicalChurchId, existsInFirestore: false };
    } catch (ensureErr) {
      console.warn(`firestoreEnsureChurchExists warning (${canonicalChurchId}):`, ensureErr);
      return { canonicalChurchId, existsInFirestore: false };
    } finally {
      inFlightEnsureChurchMap.delete(canonicalChurchId);
    }
  })();

  inFlightEnsureChurchMap.set(canonicalChurchId, task);
  return task;
}

/**
 * Resolves any Firestore Timestamp, { seconds, nanoseconds }, Date, or string to milliseconds.
 */
export function resolveTimestampMs(val: any, fallbackDate?: string): number {
  if (!val && !fallbackDate) return 0;
  if (val) {
    if (typeof val.toDate === 'function') {
      return val.toDate().getTime();
    }
    if (typeof val === 'object' && typeof val.seconds === 'number') {
      return val.seconds * 1000 + Math.floor((val.nanoseconds || 0) / 1e6);
    }
    if (val instanceof Date) {
      return val.getTime();
    }
    if (typeof val === 'number') {
      return val;
    }
    if (typeof val === 'string' && val.trim()) {
      const parsed = new Date(val.trim()).getTime();
      if (!isNaN(parsed)) return parsed;
    }
  }
  if (fallbackDate && typeof fallbackDate === 'string') {
    const parsedFallback = new Date(
      fallbackDate.includes('T') ? fallbackDate : `${fallbackDate}T08:00:00`
    ).getTime();
    if (!isNaN(parsedFallback)) return parsedFallback;
  }
  return 0;
}

/**
 * Resolves any Firestore Timestamp, { seconds, nanoseconds }, Date, or string to an ISO string.
 */
export function resolveTimestampIso(val: any, fallbackDate?: string): string {
  const ms = resolveTimestampMs(val, fallbackDate);
  return ms > 0 ? new Date(ms).toISOString() : new Date().toISOString();
}

/**
 * Canonical mobile & web reaction type normalizer
 */
export type CanonicalReactionType =
  | 'pray'
  | 'amen'
  | 'love'
  | 'like'
  | 'clap'
  | 'haha'
  | 'wow'
  | 'sad';

const VALID_REACTION_TYPES = new Set<string>([
  'pray',
  'amen',
  'love',
  'like',
  'clap',
  'haha',
  'wow',
  'sad',
]);

export function normalizeReactionType(rawReaction?: string): CanonicalReactionType {
  const clean = (rawReaction || '').trim().toLowerCase();
  if (VALID_REACTION_TYPES.has(clean)) {
    return clean as CanonicalReactionType;
  }
  if (clean === 'heart') return 'love';
  if (clean === 'praise') return 'pray';
  if (clean === 'applause') return 'clap';
  if (clean === 'fire') return 'wow';
  if (clean === 'light') return 'like';
  return 'amen';
}

/**
 * Normalizes a Firestore announcement document into the Web/Mobile Announcement interface.
 */
export function normalizeAnnouncementFromFirestore(
  docId: string,
  raw: Record<string, any>
): Announcement {
  const createdIso = resolveTimestampIso(raw.createdAt, raw.date);
  const fallbackDate = raw.date || createdIso.split('T')[0];
  const poster = raw.posterUrl || raw.imageUrl || undefined;
  const authorName = raw.authorName || raw.author || 'Admin';
  return {
    ...(raw as Announcement),
    id: docId || raw.id,
    churchId: raw.churchId,
    title: raw.title || '',
    content: raw.content || '',
    department: raw.department || 'Depatman Administrasyon',
    category: (raw.category || 'anons') as any,
    date: fallbackDate,
    targetAudience: raw.targetAudience || 'Tout moun',
    isPinned: Boolean(raw.isPinned ?? raw.pinned ?? false),
    showToastOnLogin: Boolean(raw.showToastOnLogin ?? false),
    toastAlertLevel: raw.toastAlertLevel || 'info',
    isScheduledNotification: Boolean(raw.isScheduledNotification ?? false),
    scheduledNotificationDate: raw.scheduledNotificationDate ?? undefined,
    posterUrl: poster ?? null,
    imageUrl: (raw.imageUrl || raw.posterUrl || undefined) ?? null,
    serviceId: raw.serviceId ?? undefined,
    authorId: raw.authorId || `admin_${raw.churchId || 'church'}`,
    authorName,
    author: authorName,
    reactionsCount: typeof raw.reactionsCount === 'number' ? raw.reactionsCount : 0,
    commentsCount: typeof raw.commentsCount === 'number' ? raw.commentsCount : 0,
    createdAt: raw.createdAt || createdIso,
    updatedAt: raw.updatedAt,
  };
}

/**
 * Builds the strict `announcements/{announcementId}` payload with ONLY the allowed keys
 * enforced by `firestore.rules` and shared with the Native Android Mobile App.
 */
export function buildAnnouncementFirestorePayload(
  ann: Partial<Announcement>,
  options?: { isCreate?: boolean; preserveExistingCreatedAt?: any }
): Record<string, any> {
  const isCreate = options?.isCreate ?? true;
  const poster = ann.posterUrl ?? ann.imageUrl ?? null;
  const image = ann.imageUrl ?? ann.posterUrl ?? null;
  const resolvedDepartment =
    (ann.department || '').trim() ||
    (ann.authorType === 'pastor'
      ? 'Biro Pastè Titilè'
      : ann.authorType === 'secretariat'
      ? 'Sekretarya Legliz la'
      : ann.authorType === 'worship'
      ? 'Depatman Louanj & Mizik'
      : ann.authorType === 'deacon'
      ? 'Dyakonat / Ministè'
      : 'Depatman Administrasyon');
  const resolvedAuthorId =
    (ann.authorId || '').trim() ||
    auth.currentUser?.uid ||
    `admin_${(ann.churchId || 'church').trim()}`;
  const resolvedAuthorName =
    (ann.authorName || ann.author || auth.currentUser?.displayName || 'Admin').trim() || 'Admin';
  const rawLevel = ann.toastAlertLevel || 'info';
  const validLevel = ['info', 'urgent', 'warning', 'celebration'].includes(rawLevel)
    ? rawLevel
    : 'info';

  const payload: Record<string, any> = {
    churchId: (ann.churchId || '').trim(),
    title: (ann.title || '').trim().slice(0, 300),
    content: (ann.content || '').trim().slice(0, 5000),
    department: resolvedDepartment.slice(0, 200),
    category: (ann.category || 'anons').trim(),
    date: (ann.date || new Date().toISOString().split('T')[0]).trim(),
    targetAudience: (ann.targetAudience || 'Tout moun').trim(),
    isPinned: Boolean(ann.isPinned ?? ann.pinned ?? false),
    showToastOnLogin: Boolean(ann.showToastOnLogin ?? false),
    toastAlertLevel: validLevel,
    isScheduledNotification: Boolean(ann.isScheduledNotification ?? false),
    scheduledNotificationDate: ann.scheduledNotificationDate ?? null,
    posterUrl: poster,
    imageUrl: image,
    serviceId: ann.serviceId ?? null,
    authorId: resolvedAuthorId.slice(0, 150),
    authorName: resolvedAuthorName.slice(0, 150),
    reactionsCount:
      typeof ann.reactionsCount === 'number' ? Math.max(0, Math.floor(ann.reactionsCount)) : 0,
    commentsCount:
      typeof ann.commentsCount === 'number' ? Math.max(0, Math.floor(ann.commentsCount)) : 0,
    updatedAt: serverTimestamp(),
  };

  if (isCreate) {
    payload.createdAt = serverTimestamp();
  } else if (options?.preserveExistingCreatedAt !== undefined) {
    payload.createdAt = options.preserveExistingCreatedAt;
  }

  return payload;
}

/**
 * CRITICAL RULE: Determines whether a member/user is a Church Admin / Sender
 * who must NEVER receive member fan-out notifications when an announcement or service is published.
 */
export function isExcludedAdminRecipient(
  member: (Partial<Member> & { userId?: string }) | null | undefined,
  church?: Partial<Church> | null,
  authorId?: string
): boolean {
  if (!member) return true;
  if (member.status && member.status !== 'active') return true;

  const roleLower = (member.role || '').trim().toLowerCase();
  if (
    roleLower === 'admin' ||
    roleLower === 'administratè' ||
    roleLower === 'administrateur' ||
    roleLower === 'administrator' ||
    roleLower === 'administrador'
  ) {
    return true;
  }

  const memberIds = [member.userId, member.id, member.memberId, member.googleUid]
    .filter(Boolean)
    .map((v) => String(v).trim());

  const cleanAuthorId = (authorId || auth.currentUser?.uid || '').trim();
  if (cleanAuthorId && memberIds.includes(cleanAuthorId)) {
    return true;
  }

  const adminGoogleUid = (church?.adminGoogleUid || '').trim();
  if (adminGoogleUid && memberIds.includes(adminGoogleUid)) {
    return true;
  }

  const memberEmails = [member.email, member.googleEmail]
    .filter(Boolean)
    .map((e) => String(e).trim().toLowerCase());

  if (memberEmails.some((e) => isSuperDeveloperEmail(e))) {
    return true;
  }

  const adminEmail = (church?.adminGoogleEmail || '').trim().toLowerCase();
  if (adminEmail && memberEmails.includes(adminEmail)) {
    return true;
  }

  const currentAuthEmail = (auth.currentUser?.email || '').trim().toLowerCase();
  if (currentAuthEmail && memberEmails.includes(currentAuthEmail)) {
    return true;
  }

  return false;
}

/**
 * Checks if a member document is part of the legacy pre-registered demo mock data.
 * Safe for production: will NEVER flag real members by name.
 */
export function isLegacyDemoMember(m: Partial<Member>): boolean {
  if (!m) return false;
  if ((m as any).isDemo === true) return true;
  const id = (m.id || '').toLowerCase();
  const email = (m.email || '').toLowerCase();
  const churchId = (m.churchId || '').toUpperCase();

  if (
    churchId === 'CH001' &&
    (id.startsWith('m-00') || id === 'm-010' || id.startsWith('demo-')) &&
    (email.includes('@tabernacle-espoir.org') || email.includes('@legiz.org'))
  ) {
    return true;
  }

  return false;
}

/**
 * Checks if a service document is part of the legacy pre-registered demo mock data.
 */
export function isLegacyDemoService(s: Partial<ServiceSession>): boolean {
  if (!s) return false;
  if ((s as any).isDemo === true) return true;
  const id = (s.id || '').toLowerCase();
  const churchId = (s.churchId || '').toUpperCase();

  if (
    churchId === 'CH001' &&
    (id.startsWith('srv-00') || id === 'srv-010' || id.startsWith('srv-demo'))
  ) {
    return true;
  }

  return false;
}

/**
 * Checks if an announcement document is part of the legacy pre-registered demo mock data.
 */
export function isLegacyDemoAnnouncement(a: Partial<Announcement>): boolean {
  if (!a) return false;
  if ((a as any).isDemo === true) return true;
  const id = (a.id || '').toLowerCase();
  const churchId = (a.churchId || '').toUpperCase();

  if (
    churchId === 'CH001' &&
    (id.startsWith('ann-00') || id === 'ann-010' || id.startsWith('ann-demo'))
  ) {
    return true;
  }

  return false;
}

/**
 * Checks if an attendance document is part of the legacy pre-registered demo mock data.
 */
export function isLegacyDemoAttendance(att: Partial<AttendanceRecord>): boolean {
  if (!att) return false;
  if ((att as any).isDemo === true) return true;
  const id = (att.id || '').toLowerCase();
  const churchId = (att.churchId || '').toUpperCase();

  if (
    churchId === 'CH001' &&
    (id.startsWith('att-00') || id.startsWith('att-demo'))
  ) {
    return true;
  }

  return false;
}

/**
 * Actively purge legacy mock demo documents from Cloud Firestore (when explicitly invoked by admin/developer).
 * Scoped to CH001 to prevent full-database scans across all tenants.
 */
export async function purgeFirestoreLegacyDemoData(): Promise<void> {
  try {
    const memSnap = await getDocs(query(collection(db, MEMBERS_COL), where('churchId', '==', 'CH001')));
    const srvSnap = await getDocs(query(collection(db, SERVICES_COL), where('churchId', '==', 'CH001')));
    const annSnap = await getDocs(query(collection(db, ANNOUNCEMENTS_COL), where('churchId', '==', 'CH001')));
    const attSnap = await getDocs(query(collection(db, ATTENDANCE_COL), where('churchId', '==', 'CH001')));

    const refsToDelete: any[] = [];

    memSnap.forEach((d) => {
      const data = d.data() as Member;
      if (isLegacyDemoMember(data)) {
        refsToDelete.push(doc(db, MEMBERS_COL, d.id));
      }
    });

    srvSnap.forEach((d) => {
      const data = d.data() as ServiceSession;
      if (isLegacyDemoService(data)) {
        refsToDelete.push(doc(db, SERVICES_COL, d.id));
      }
    });

    annSnap.forEach((d) => {
      const data = d.data() as Announcement;
      if (isLegacyDemoAnnouncement(data)) {
        refsToDelete.push(doc(db, ANNOUNCEMENTS_COL, d.id));
      }
    });

    attSnap.forEach((d) => {
      const data = d.data() as AttendanceRecord;
      if (isLegacyDemoAttendance(data)) {
        refsToDelete.push(doc(db, ATTENDANCE_COL, d.id));
      }
    });

    if (refsToDelete.length > 0) {
      const deletedCount = await commitDeleteDocRefsInChunks(refsToDelete);
      console.log(`Purged ${deletedCount} legacy demo records from Cloud Firestore.`);
    }
  } catch (err) {
    console.warn('Could not purge Firestore legacy demo items:', err);
  }
}

/**
 * Initialize Firestore data without triggering full-database reads on every client startup.
 */
export async function initializeFirestoreDataIfEmpty(): Promise<void> {
  // No-op on client boot to protect Firestore read quotas.
}

// ----------------- REAL-TIME LISTENERS & QUERIES -----------------

export interface FirestoreSnapshotMeta {
  fromCache: boolean;
  hasPendingWrites: boolean;
  removedIds: string[];
}

export interface FirestoreDocSnapshotMeta {
  fromCache: boolean;
  hasPendingWrites: boolean;
  exists: boolean;
}

function buildSnapshotMeta(snap: {
  metadata?: { fromCache?: boolean; hasPendingWrites?: boolean };
  docChanges?: () => Array<{ type: string; doc: { id: string } }>;
}): FirestoreSnapshotMeta {
  const removedIds: string[] = [];
  if (typeof snap.docChanges === 'function') {
    snap.docChanges().forEach((change) => {
      if (change.type === 'removed' && change.doc?.id) {
        removedIds.push(change.doc.id);
      }
    });
  }
  return {
    fromCache: Boolean(snap.metadata?.fromCache),
    hasPendingWrites: Boolean(snap.metadata?.hasPendingWrites),
    removedIds,
  };
}

async function commitDeleteDocRefsInChunks(docRefs: any[], chunkSize: number = 400): Promise<number> {
  if (!docRefs || docRefs.length === 0) return 0;
  let deleted = 0;
  for (let i = 0; i < docRefs.length; i += chunkSize) {
    const chunk = docRefs.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach((ref) => batch.delete(ref));
    await batch.commit();
    deleted += chunk.length;
  }
  return deleted;
}

function withDocId<T extends { id?: string }>(docSnap: { id: string; data: () => unknown }): T {
  const raw = (docSnap.data() || {}) as Record<string, any>;
  const resolvedId = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : docSnap.id;
  return { ...raw, id: resolvedId } as T;
}

export function subscribeToChurches(
  callback: (churches: Church[], meta?: FirestoreSnapshotMeta) => void,
  maxLimit: number = 25
): Unsubscribe {
  const q = query(collection(db, CHURCHES_COL), limit(maxLimit));
  return onSnapshot(
    q,
    (snap) => {
      const items: Church[] = [];
      snap.forEach((docSnap) => {
        const c = withDocId<Church>(docSnap);
        if (c && c.id && !isAccidentalTestChurch(c)) {
          items.push(c);
        }
      });
      callback(items, buildSnapshotMeta(snap));
    },
    (err) => {
      console.warn('Firestore churches listener error (fallback to local):', err);
    }
  );
}

/**
 * Phase 0 Read Optimization: One-time bounded fetch of churches instead of permanent global listener.
 */
export async function fetchInitialChurches(maxLimit: number = 25): Promise<Church[]> {
  try {
    const q = query(collection(db, CHURCHES_COL), limit(maxLimit));
    const snap = await getDocs(q);
    const items: Church[] = [];
    snap.forEach((docSnap) => {
      const c = withDocId<Church>(docSnap);
      if (c && c.id && !isAccidentalTestChurch(c)) {
        items.push(c);
      }
    });
    return items;
  } catch (err) {
    console.warn('fetchInitialChurches fallback to local:', err);
    return [];
  }
}

/**
 * Phase 0 Read Optimization: Subscribe ONLY to the currently active church (1 doc).
 */
export function subscribeToActiveChurch(
  churchId: string,
  callback: (church: Church | null, meta?: FirestoreDocSnapshotMeta) => void
): Unsubscribe {
  const cleanId = (churchId || '').trim();
  if (!cleanId) return () => {};
  const ref = doc(db, CHURCHES_COL, cleanId);
  return onSnapshot(
    ref,
    (docSnap) => {
      const docMeta: FirestoreDocSnapshotMeta = {
        fromCache: Boolean(docSnap.metadata?.fromCache),
        hasPendingWrites: Boolean(docSnap.metadata?.hasPendingWrites),
        exists: docSnap.exists(),
      };
      if (docSnap.exists()) {
        const c = withDocId<Church>(docSnap);
        callback(c && c.id ? c : null, docMeta);
      } else {
        callback(null, docMeta);
      }
    },
    (err) => {
      console.warn('Firestore active church listener error:', err);
    }
  );
}

/**
 * Phase 0 Read Optimization: Server lookup by exact ID or Code when searching beyond the initial 25 churches.
 */
export async function searchChurchesInFirestore(
  searchTerm: string,
  maxLimit: number = 15
): Promise<Church[]> {
  const raw = (searchTerm || '').trim();
  if (!raw) return [];
  const results = new Map<string, Church>();
  try {
    const directSnap = await getDoc(doc(db, CHURCHES_COL, raw));
    if (directSnap.exists()) {
      const c = withDocId<Church>(directSnap);
      if (c && c.id) results.set(c.id, c);
    }
    const upper = raw.toUpperCase();
    if (upper !== raw) {
      const upperSnap = await getDoc(doc(db, CHURCHES_COL, upper));
      if (upperSnap.exists()) {
        const c = withDocId<Church>(upperSnap);
        if (c && c.id) results.set(c.id, c);
      }
    }
    const codeQ = query(collection(db, CHURCHES_COL), where('code', '==', upper), limit(maxLimit));
    const codeSnap = await getDocs(codeQ);
    codeSnap.forEach((d) => {
      const c = withDocId<Church>(d);
      if (c && c.id) results.set(c.id, c);
    });
  } catch (err) {
    console.warn('searchChurchesInFirestore fallback:', err);
  }
  return Array.from(results.values());
}

/**
 * Strictly resolves ONLY the church(es) owned by the authenticated admin (by UID and/or lowercase email)
 * directly from Firestore so admins never need to browse or search a public list of other churches.
 */
export async function firestoreFindChurchesByAdmin(
  uid?: string | null,
  email?: string | null,
  maxLimit: number = 25
): Promise<Church[]> {
  const cleanUid = (uid || '').trim();
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanUid && !cleanEmail) return [];
  if (cleanEmail && isSuperDeveloperEmail(cleanEmail)) return [];
  if (isUnitTestRuntime()) return [];

  await waitForAuthStateReady();

  const results = new Map<string, Church>();

  if (cleanUid) {
    try {
      const uidQuery = query(
        collection(db, CHURCHES_COL),
        where('adminGoogleUid', '==', cleanUid),
        limit(maxLimit)
      );
      const uidSnap = await getDocs(uidQuery);
      uidSnap.forEach((docSnap) => {
        const c = withDocId<Church>(docSnap);
        if (c && c.id && !isAccidentalTestChurch(c)) {
          results.set(c.id, c);
        }
      });
    } catch (err) {
      console.warn('firestoreFindChurchesByAdmin (UID) fallback:', err);
    }

    try {
      const ownerQuery = query(
        collection(db, CHURCHES_COL),
        where('ownerId', '==', cleanUid),
        limit(maxLimit)
      );
      const ownerSnap = await getDocs(ownerQuery);
      ownerSnap.forEach((docSnap) => {
        const c = withDocId<Church>(docSnap);
        if (c && c.id && !isAccidentalTestChurch(c)) {
          results.set(c.id, c);
        }
      });
    } catch (err) {
      console.warn('firestoreFindChurchesByAdmin (ownerId) fallback:', err);
    }
  }

  if (cleanEmail) {
    try {
      const emailQuery = query(
        collection(db, CHURCHES_COL),
        where('adminGoogleEmail', '==', cleanEmail),
        limit(maxLimit)
      );
      const emailSnap = await getDocs(emailQuery);
      emailSnap.forEach((docSnap) => {
        const c = withDocId<Church>(docSnap);
        if (c && c.id && !isAccidentalTestChurch(c)) {
          results.set(c.id, c);
        }
      });
    } catch (err) {
      console.warn('firestoreFindChurchesByAdmin (email) fallback:', err);
    }
  }

  return Array.from(results.values()).sort((a, b) => {
    const aArchived = a.status === 'archived' ? 1 : 0;
    const bArchived = b.status === 'archived' ? 1 : 0;
    if (aArchived !== bArchived) return aArchived - bArchived;
    return (a.name || '').localeCompare(b.name || '');
  });
}

/**
 * Phase 0 Read Optimization: Subscribe ONLY to the logged-in regular member's own document (1 doc).
 */
export function subscribeToSingleMember(
  memberDocId: string,
  callback: (member: Member | null, meta?: FirestoreDocSnapshotMeta) => void
): Unsubscribe {
  const cleanId = (memberDocId || '').trim();
  if (!cleanId) return () => {};
  const ref = doc(db, MEMBERS_COL, cleanId);
  return onSnapshot(
    ref,
    (docSnap) => {
      const docMeta: FirestoreDocSnapshotMeta = {
        fromCache: Boolean(docSnap.metadata?.fromCache),
        hasPendingWrites: Boolean(docSnap.metadata?.hasPendingWrites),
        exists: docSnap.exists(),
      };
      if (docSnap.exists()) {
        const m = withDocId<Member>(docSnap);
        const isSoftDeleted = Boolean((m as any)?.isDeleted === true || (m as any)?.deleted === true);
        callback(m && !isLegacyDemoMember(m) && !isSoftDeleted ? m : null, docMeta);
      } else {
        callback(null, docMeta);
      }
    },
    (err) => {
      console.warn('Firestore single member listener error:', err);
    }
  );
}

/**
 * Phase 0 Read Optimization: Subscribe ONLY to the logged-in regular member's own attendance records.
 * Uses a single-field index (memberDbId) to avoid requiring custom composite indexes.
 */
export function subscribeToMemberAttendance(
  memberDbId: string,
  churchId: string,
  callback: (records: AttendanceRecord[], meta?: FirestoreSnapshotMeta) => void
): Unsubscribe {
  const cleanMemberDbId = (memberDbId || '').trim();
  if (!cleanMemberDbId) return () => {};
  const q = query(collection(db, ATTENDANCE_COL), where('memberDbId', '==', cleanMemberDbId));
  return onSnapshot(
    q,
    (snap) => {
      const items: AttendanceRecord[] = [];
      snap.forEach((docSnap) => {
        const att = withDocId<AttendanceRecord>(docSnap);
        if (
          att &&
          !isLegacyDemoAttendance(att) &&
          (!churchId || att.churchId === churchId)
        ) {
          items.push(att);
        }
      });
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      callback(items, buildSnapshotMeta(snap));
    },
    (err) => {
      console.warn('Firestore member attendance listener error:', err);
    }
  );
}

/**
 * Subscribe ONLY to the logged-in member's own cross-church Visitor check-ins (read-only).
 * Returns attendance records recorded at OTHER churches where this member visited (`isVisitor === true`
 * or `churchId !== homeChurchId`), keeping home church attendance metrics strictly isolated.
 */
export function subscribeToMemberVisitorVisits(
  memberDbId: string,
  memberCode: string,
  homeChurchId: string,
  callback: (records: AttendanceRecord[], meta?: FirestoreSnapshotMeta) => void
): Unsubscribe {
  const cleanMemberDbId = (memberDbId || '').trim();
  const cleanMemberCode = (memberCode || '').trim().toUpperCase();
  const cleanHomeChurchId = (homeChurchId || '').trim().toUpperCase();
  if (!cleanMemberDbId && !cleanMemberCode) return () => {};

  const primaryField = cleanMemberDbId ? 'memberDbId' : 'memberId';
  const primaryValue = cleanMemberDbId || cleanMemberCode;
  const q = query(collection(db, ATTENDANCE_COL), where(primaryField, '==', primaryValue));

  return onSnapshot(
    q,
    (snap) => {
      const items: AttendanceRecord[] = [];
      snap.forEach((docSnap) => {
        const att = withDocId<AttendanceRecord>(docSnap);
        if (!att || isLegacyDemoAttendance(att)) return;
        const attChurchUpper = (att.churchId || '').trim().toUpperCase();
        const isOtherChurch = Boolean(cleanHomeChurchId && attChurchUpper && attChurchUpper !== cleanHomeChurchId);
        const isVisitorFlag = att.isVisitor === true || att.attendanceRole === 'visitor';
        if (isOtherChurch || (isVisitorFlag && isOtherChurch)) {
          items.push(att);
        }
      });
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      callback(items, buildSnapshotMeta(snap));
    },
    (err) => {
      console.warn('Firestore member visitor visits listener error:', err);
    }
  );
}

export function subscribeToMembers(
  churchId: string,
  callback: (members: Member[], meta?: FirestoreSnapshotMeta) => void
): Unsubscribe {
  const q = query(collection(db, MEMBERS_COL), where('churchId', '==', churchId));
  return onSnapshot(
    q,
    (snap) => {
      const items: Member[] = [];
      snap.forEach((docSnap) => {
        const m = withDocId<Member>(docSnap);
        const isSoftDeleted = Boolean((m as any)?.isDeleted === true || (m as any)?.deleted === true);
        if (m && !isLegacyDemoMember(m) && !isSoftDeleted) {
          items.push(m);
        }
      });
      callback(items, buildSnapshotMeta(snap));
    },
    (err) => {
      console.warn('Firestore members listener error:', err);
    }
  );
}

export function subscribeToServices(
  churchId: string,
  callback: (services: ServiceSession[], meta?: FirestoreSnapshotMeta) => void
): Unsubscribe {
  const q = query(collection(db, SERVICES_COL), where('churchId', '==', churchId));
  return onSnapshot(
    q,
    (snap) => {
      const items: ServiceSession[] = [];
      snap.forEach((docSnap) => {
        const s = withDocId<ServiceSession>(docSnap);
        const isSoftDeleted = Boolean((s as any)?.isDeleted === true || (s as any)?.deleted === true);
        if (s && !isLegacyDemoService(s) && !isSoftDeleted) {
          items.push(s);
        }
      });
      callback(items, buildSnapshotMeta(snap));
    },
    (err) => {
      console.warn('Firestore services listener error:', err);
    }
  );
}

export function subscribeToAnnouncements(
  churchId: string,
  callback: (announcements: Announcement[], meta?: FirestoreSnapshotMeta) => void
): Unsubscribe {
  const q = query(collection(db, ANNOUNCEMENTS_COL), where('churchId', '==', churchId));
  return onSnapshot(
    q,
    (snap) => {
      const items: Announcement[] = [];
      snap.forEach((docSnap) => {
        const raw = docSnap.data() as Record<string, any>;
        if (!raw || raw.isDeleted === true || raw.deleted === true) return;
        const normalized = normalizeAnnouncementFromFirestore(docSnap.id, raw);
        if (!isLegacyDemoAnnouncement(normalized)) {
          items.push(normalized);
        }
      });
      items.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return resolveTimestampMs(b.createdAt, b.date) - resolveTimestampMs(a.createdAt, a.date);
      });
      callback(items, buildSnapshotMeta(snap));
    },
    (err) => {
      console.warn('Firestore announcements listener error:', err);
    }
  );
}

export function subscribeToAttendance(
  churchId: string,
  callback: (records: AttendanceRecord[], meta?: FirestoreSnapshotMeta) => void
): Unsubscribe {
  const q = query(collection(db, ATTENDANCE_COL), where('churchId', '==', churchId));
  return onSnapshot(
    q,
    (snap) => {
      const items: AttendanceRecord[] = [];
      snap.forEach((docSnap) => {
        const att = withDocId<AttendanceRecord>(docSnap);
        if (att && !isLegacyDemoAttendance(att)) {
          items.push(att);
        }
      });
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      callback(items, buildSnapshotMeta(snap));
    },
    (err) => {
      console.warn('Firestore attendance listener error:', err);
    }
  );
}

export function subscribeToAnnouncementComments(
  churchId: string,
  callback: (comments: AnnouncementComment[], meta?: FirestoreSnapshotMeta) => void
): Unsubscribe {
  const q = query(collection(db, ANNOUNCEMENT_COMMENTS_COL), where('churchId', '==', churchId));
  return onSnapshot(
    q,
    (snap) => {
      const items: AnnouncementComment[] = [];
      snap.forEach((docSnap) => {
        const raw = docSnap.data() as Record<string, any>;
        if (!raw) return;
        const commentId = (typeof raw.id === 'string' && raw.id ? raw.id : docSnap.id) || '';
        if (raw.isDemo || commentId.startsWith('comm_demo') || commentId.startsWith('demo_')) {
          return;
        }
        const targetId = (raw.targetId || raw.announcementId || '').trim();
        if (!targetId) return;
        const userName = (raw.userName || raw.author || 'Manm').trim();
        const content = (raw.content || raw.text || '').trim();
        if (!content) return;
        const userId = (raw.userId || raw.memberId || raw.authorMemberId || '').trim();
        const createdIso = resolveTimestampIso(raw.createdAt);
        const parsedDate = new Date(createdIso);
        const timeStr =
          raw.time ||
          (!isNaN(parsedDate.getTime())
            ? `${parsedDate.getHours().toString().padStart(2, '0')}:${parsedDate.getMinutes().toString().padStart(2, '0')}`
            : 'Kounye a');
        const initials =
          raw.avatarInitials ||
          userName
            .split(' ')
            .filter(Boolean)
            .map((w: string) => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase() ||
          'M';

        items.push({
          id: commentId,
          targetId,
          announcementId: targetId,
          churchId: raw.churchId || churchId,
          userId,
          userName,
          userPhotoUrl: raw.userPhotoUrl || null,
          content,
          author: userName,
          authorMemberId: userId,
          memberId: userId,
          text: content,
          time: timeStr,
          avatarInitials: initials,
          isDemo: false,
          createdAt: raw.createdAt || createdIso,
        });
      });
      items.sort((a, b) => resolveTimestampMs(a.createdAt) - resolveTimestampMs(b.createdAt));
      callback(items, buildSnapshotMeta(snap));
    },
    (err) => {
      console.warn('Firestore announcement comments listener error:', err);
    }
  );
}

/**
 * Real-time listener on `announcement_comments` for the Developer Panel Moderation Engine.
 * Supports listening across ALL churches or filtering by a specific `churchId`, sorted by `createdAt` descending.
 */
export function subscribeToAllAnnouncementCommentsGlobal(
  callback: (comments: AnnouncementComment[], meta?: FirestoreSnapshotMeta) => void,
  churchIdFilter?: string
): Unsubscribe {
  const cleanFilter = (churchIdFilter || '').trim();
  const q =
    cleanFilter && cleanFilter !== 'ALL'
      ? query(collection(db, ANNOUNCEMENT_COMMENTS_COL), where('churchId', '==', cleanFilter))
      : query(collection(db, ANNOUNCEMENT_COMMENTS_COL));

  return onSnapshot(
    q,
    (snap) => {
      const items: AnnouncementComment[] = [];
      snap.forEach((docSnap) => {
        const raw = docSnap.data() as Record<string, any>;
        if (!raw) return;
        const commentId = (typeof raw.id === 'string' && raw.id ? raw.id : docSnap.id) || '';
        if (raw.isDemo || commentId.startsWith('comm_demo') || commentId.startsWith('demo_')) {
          return;
        }
        const targetId = (raw.targetId || raw.announcementId || '').trim();
        if (!targetId) return;
        const userName = (raw.userName || raw.author || 'Manm').trim();
        const content = (raw.content || raw.text || '').trim();
        if (!content) return;
        const userId = (raw.userId || raw.memberId || raw.authorMemberId || '').trim();
        const createdIso = resolveTimestampIso(raw.createdAt);
        const parsedDate = new Date(createdIso);
        const timeStr =
          raw.time ||
          (!isNaN(parsedDate.getTime())
            ? `${parsedDate.getHours().toString().padStart(2, '0')}:${parsedDate.getMinutes().toString().padStart(2, '0')}`
            : 'Kounye a');
        const initials =
          raw.avatarInitials ||
          userName
            .split(' ')
            .filter(Boolean)
            .map((w: string) => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase() ||
          'M';

        items.push({
          id: commentId,
          targetId,
          announcementId: targetId,
          churchId: raw.churchId || cleanFilter || '',
          userId,
          userName,
          userPhotoUrl: raw.userPhotoUrl || null,
          content,
          author: userName,
          authorMemberId: userId,
          memberId: userId,
          text: content,
          time: timeStr,
          avatarInitials: initials,
          isDemo: false,
          createdAt: raw.createdAt || createdIso,
        });
      });
      items.sort((a, b) => resolveTimestampMs(b.createdAt) - resolveTimestampMs(a.createdAt));
      callback(items, buildSnapshotMeta(snap));
    },
    (err) => {
      console.warn('Firestore global announcement comments listener error:', err);
    }
  );
}

export function subscribeToAnnouncementReactions(
  churchId: string,
  callback: (reactions: AnnouncementReactionDoc[], meta?: FirestoreSnapshotMeta) => void
): Unsubscribe {
  const q = query(collection(db, ANNOUNCEMENT_REACTIONS_COL), where('churchId', '==', churchId));
  return onSnapshot(
    q,
    (snap) => {
      const items: AnnouncementReactionDoc[] = [];
      snap.forEach((docSnap) => {
        const raw = docSnap.data() as Record<string, any>;
        if (!raw) return;
        const targetId = (raw.targetId || raw.announcementId || '').trim();
        const userId = (raw.userId || raw.memberId || '').trim();
        if (!targetId || !userId) return;
        const reactionType = normalizeReactionType(raw.reactionType || raw.reaction || 'amen');
        items.push({
          id: docSnap.id,
          targetId,
          announcementId: targetId,
          churchId: raw.churchId || churchId,
          userId,
          userName: (raw.userName || userId).trim(),
          memberId: userId,
          reactionType,
          reaction: reactionType,
          createdAt: raw.createdAt || resolveTimestampIso(raw.createdAt),
          updatedAt: raw.updatedAt,
        });
      });
      callback(items, buildSnapshotMeta(snap));
    },
    (err) => {
      console.warn('Firestore announcement reactions listener error:', err);
    }
  );
}

/**
 * Subscribe to member-targeted notifications in `notifications` collection.
 * Strictly excludes Church Admins / Senders so admins never receive their own fan-out alerts.
 */
export function subscribeToMemberNotifications(
  churchId: string,
  member: Member | null | undefined,
  church: Church | null | undefined,
  callback: (notifications: FirestoreNotificationDoc[], meta?: FirestoreSnapshotMeta) => void
): Unsubscribe {
  if (!churchId || !member || isExcludedAdminRecipient(member, church)) {
    callback([], { fromCache: false, hasPendingWrites: false, removedIds: [] });
    return () => {};
  }

  const candidateUserIds = new Set(
    [(member as any).userId, member.id, member.memberId]
      .filter(Boolean)
      .map((v) => String(v).trim())
  );

  const q = query(collection(db, NOTIFICATIONS_COL), where('churchId', '==', churchId));
  return onSnapshot(
    q,
    (snap) => {
      const items: FirestoreNotificationDoc[] = [];
      snap.forEach((docSnap) => {
        const raw = docSnap.data() as Record<string, any>;
        if (!raw) return;
        const docUserId = String(raw.userId || '').trim();
        if (!candidateUserIds.has(docUserId)) return;
        items.push({
          id: docSnap.id,
          userId: docUserId,
          churchId: raw.churchId || churchId,
          title: raw.title || '',
          message: raw.message || '',
          type: raw.type === 'service' ? 'service' : 'announcement',
          isRead: Boolean(raw.isRead ?? raw.read),
          createdAt: raw.createdAt || resolveTimestampIso(raw.createdAt),
        });
      });
      items.sort((a, b) => resolveTimestampMs(b.createdAt) - resolveTimestampMs(a.createdAt));
      callback(items, buildSnapshotMeta(snap));
    },
    (err) => {
      console.warn('Firestore member notifications listener error:', err);
    }
  );
}

// ----------------- MUTATIONS & QUERIES -----------------

export async function firestoreSaveChurch(
  church: Church,
  options?: {
    deliberatePasscodeUpdate?: boolean;
    retireLegacyPasscode?: boolean;
    deliberateAdminVerificationUpdate?: boolean;
    clearAdminGooglePhoto?: boolean;
    clearLogoUrl?: boolean;
    clearSignatureUrl?: boolean;
    throwOnError?: boolean;
  }
): Promise<void> {
  const cleanChurchId = sanitizeFirestoreDocIdSegment(church?.id || '', 'CH');
  if (isUnitTestRuntime()) {
    return;
  }
  try {
    const ref = doc(db, CHURCHES_COL, cleanChurchId);
    const payload = buildChurchFirestorePayload(church, cleanChurchId, options);
    await setDoc(ref, payload, { merge: true });
    verifiedExistingChurchIds.add(cleanChurchId);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${CHURCHES_COL}/${cleanChurchId}`);
    if (options?.throwOnError) {
      throw error;
    }
  }
}

/**
 * Best-effort synchronization of the signed-in admin's profile photo to `users/{uid}`
 * so mobile and web sessions stay aligned without throwing if the web-only user lacks a `users` doc.
 * Note: We NEVER pass compressed base64 data URLs to Firebase Auth `updateProfile`, which rejects URLs > ~2KB.
 */
export async function firestoreSyncAdminUserProfilePhoto(
  uid: string,
  photoUrl: string | null
): Promise<void> {
  if (isUnitTestRuntime()) return;
  const cleanUid = String(uid || '').trim();
  if (!cleanUid || !auth.currentUser || auth.currentUser.uid !== cleanUid) return;
  try {
    const userRef = doc(db, 'users', cleanUid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;
    const safePhoto =
      typeof photoUrl === 'string' && photoUrl.trim().length > 0 && photoUrl.trim().length <= 600000
        ? photoUrl.trim()
        : null;
    await updateDoc(userRef, {
      photoUrl: safePhoto,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    // Non-fatal cross-platform profile parity sync
  }
}

function isCurrentUserSyncedDeaconForChurch(churchId: string): boolean {
  const uid = auth.currentUser?.uid;
  if (!uid || !churchId) return false;
  for (const key of syncedDeaconProfileKeys) {
    if (key.startsWith(`${uid}:${churchId}:`)) return true;
  }
  return Boolean(
    activeDeaconSessionContext &&
      activeDeaconSessionContext.churchId === churchId &&
      isDeaconRole(activeDeaconSessionContext.member)
  );
}

/**
 * Ensures the signed-in Firebase Auth user holding an active Deacon ('Dyak') member record
 * has a verified `users/{uid}` profile with `role: 'deacon'`, `churchId`, and `memberId`
 * matching `firestore.rules` (`canClaimDeaconRole` / `isDeaconOfChurch`).
 * Never downgrades existing `admin` or `super_admin` profiles.
 */
export async function firestoreEnsureDeaconUserProfile(
  rawChurchId: string,
  member?: Partial<Member> | null,
  options?: { forceRefresh?: boolean }
): Promise<boolean> {
  if (isUnitTestRuntime() || !rawChurchId || !member || !isDeaconRole(member)) {
    return false;
  }

  const memberDocId = typeof member.id === 'string' ? member.id.trim().replace(/[^a-zA-Z0-9_-]/g, '') : '';
  if (!memberDocId) return false;

  await waitForAuthStateReady();
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.uid) return false;

  const { canonicalChurchId, localChurch } = resolveCanonicalChurchForWrite(rawChurchId);
  if (!canonicalChurchId) return false;

  activeDeaconSessionContext = { churchId: canonicalChurchId, member };

  const cacheKey = `${currentUser.uid}:${canonicalChurchId}:${memberDocId}`;
  if (!options?.forceRefresh && syncedDeaconProfileKeys.has(cacheKey)) {
    return true;
  }

  const existingInFlight = inFlightDeaconProfileMap.get(cacheKey);
  if (existingInFlight && !options?.forceRefresh) {
    return existingInFlight;
  }

  const task = (async (): Promise<boolean> => {
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      const nowIso = new Date().toISOString();
      const rawDisplayName =
        (member.fullName || currentUser.displayName || 'Dyak').trim().slice(0, 120) || 'Dyak';
      const rawPhoto =
        clampOptionalMediaString(
          member.avatarUrl || member.photoUrl || member.googlePhoto || currentUser.photoURL || undefined,
          600000
        ) || null;
      const resolvedEmail =
        (currentUser.email || member.googleEmail || member.email || '').trim().slice(0, 200) ||
        `${currentUser.uid.slice(0, 16)}@omnichurch.app`;
      const churchName = clampOptionalString(localChurch?.name, 200) || null;

      if (userSnap.exists()) {
        const existingData = userSnap.data() as Record<string, any>;
        if (existingData?.role === 'admin' || existingData?.role === 'super_admin') {
          syncedDeaconProfileKeys.add(cacheKey);
          return true;
        }
        if (
          existingData?.role === 'deacon' &&
          existingData?.churchId === canonicalChurchId &&
          existingData?.memberId === memberDocId
        ) {
          syncedDeaconProfileKeys.add(cacheKey);
          return true;
        }

        await updateDoc(userRef, {
          role: 'deacon',
          churchId: canonicalChurchId,
          churchName,
          memberId: memberDocId,
          displayName: rawDisplayName,
          photoUrl: rawPhoto,
          updatedAt: nowIso,
        });
        syncedDeaconProfileKeys.add(cacheKey);
        return true;
      }

      await setDoc(userRef, {
        userId: currentUser.uid,
        email: resolvedEmail,
        displayName: rawDisplayName,
        photoUrl: rawPhoto,
        churchId: canonicalChurchId,
        churchName,
        role: 'deacon',
        memberId: memberDocId,
        language: 'ht',
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      syncedDeaconProfileKeys.add(cacheKey);
      return true;
    } catch (err) {
      console.warn(`firestoreEnsureDeaconUserProfile warning (${canonicalChurchId}):`, err);
      return false;
    } finally {
      inFlightDeaconProfileMap.delete(cacheKey);
    }
  })();

  inFlightDeaconProfileMap.set(cacheKey, task);
  return task;
}

/**
 * Strict, non-racy cloud creation for newly registered churches.
 * Verifies live Firebase Auth session + fresh ID token BEFORE `setDoc` so `firestore.rules`
 * `allow create` (`request.auth.uid == incoming().adminGoogleUid` & matching token email) never
 * rejects due to stale localStorage sessions or unpropagated signup tokens.
 */
export async function firestoreCreateChurchStrict(
  church: Church,
  options?: {
    deliberatePasscodeUpdate?: boolean;
  }
): Promise<void> {
  const cleanChurchId = sanitizeFirestoreDocIdSegment(church?.id || '', 'CH');
  if (isUnitTestRuntime()) {
    return;
  }

  await waitForAuthStateReady();
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.uid) {
    throw new Error(
      'AUTH_REQUIRED_FOR_CHURCH_CREATE: Ou dwe konekte ak yon kont Google oswa Imèl + Modpas anvan pou w anrejistre yon nouvo legliz nan nwaj la.'
    );
  }

  const currentEmail = (currentUser.email || '').trim().toLowerCase();
  const isSuperDev = isSuperDeveloperEmail(currentEmail);
  const expectedUid = (church.adminGoogleUid || '').trim();
  const expectedEmail = (church.adminGoogleEmail || '').trim().toLowerCase();

  if (!isSuperDev) {
    if (expectedUid && expectedUid !== currentUser.uid) {
      throw new Error(
        'AUTH_UID_MISMATCH_FOR_CHURCH_CREATE: Sesyon Firebase aktif la pa koresponn ak kont administratè legliz la. Rekonekte epi re-eseye.'
      );
    }
    if (expectedEmail && currentEmail && expectedEmail !== currentEmail) {
      throw new Error(
        `AUTH_EMAIL_MISMATCH_FOR_CHURCH_CREATE: Kont aktif la (${currentEmail}) pa koresponn ak imèl administratè legliz la (${expectedEmail}).`
      );
    }
  }

  try {
    await currentUser.getIdTokenResult(true);
  } catch {
    try {
      await currentUser.getIdToken(true);
    } catch {
      // ignore offline token refresh
    }
  }

  const ref = doc(db, CHURCHES_COL, cleanChurchId);
  const payload = buildChurchFirestorePayload(church, cleanChurchId, {
    deliberatePasscodeUpdate: Boolean(options?.deliberatePasscodeUpdate ?? church.adminPasscode),
    deliberateAdminVerificationUpdate: false,
  });

  // Never emit adminVerified* fields during regular tenant creation so allow create rules always pass
  if (!isSuperDev) {
    delete payload.adminVerified;
    delete payload.adminVerifiedAt;
    delete payload.adminVerifiedBy;
  }

  try {
    try {
      await setDoc(ref, payload);
    } catch (firstErr) {
      if (!isTransientPermissionDeniedError(firstErr)) {
        throw firstErr;
      }
      try {
        await currentUser.getIdToken(true);
      } catch {
        // ignore
      }
      await new Promise((resolve) => setTimeout(resolve, 350));
      await setDoc(ref, payload);
    }
    verifiedExistingChurchIds.add(cleanChurchId);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${CHURCHES_COL}/${cleanChurchId}`, {
      churchId: cleanChurchId,
      payloadKeys: Object.keys(payload),
    });
    throw error;
  }
}

/**
 * Super-Developer-only action: explicitly flips `adminVerified` (`false` <-> `true`) on `churches/{churchId}` in Firestore.
 * Enforced server-side by `firestore.rules` (only `isSuperDeveloper()` can modify `adminVerified`, `adminVerifiedAt`, `adminVerifiedBy`).
 *
 * Uses a surgical 4-field `updateDoc` on existing church documents (with automatic JWT refresh retry and
 * schema-drift self-healing from the authoritative server document) so rules are never weakened and church
 * profile data is never overwritten by stale local state.
 */
export async function firestoreSetChurchAdminVerification(
  church: Church,
  verified: boolean
): Promise<{
  verified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
}> {
  await waitForAuthStateReady();
  const currentUser = auth.currentUser;
  const currentEmail = (currentUser?.email || '').trim().toLowerCase();

  if (!currentUser || !isSuperDeveloperEmail(currentEmail)) {
    throw new Error(
      `SUPER_DEV_AUTH_REQUIRED:${currentEmail || 'none'}: Ou dwe konekte ak kont Google Propriyetè Platfòm nan (charlesjj3186@gmail.com) pou konfime pèmisyon yon mèt legliz.`
    );
  }

  let emailVerified = Boolean(currentUser.emailVerified);
  try {
    await currentUser.reload();
    emailVerified = Boolean(currentUser.emailVerified);
  } catch {
    // ignore transient reload failure if already verified
  }
  if (!emailVerified) {
    throw new Error(
      'SUPER_DEV_EMAIL_UNVERIFIED: Kont Propriyetè Platfòm nan dwe gen imèl Google li verifye anvan li ka konfime pèmisyon.'
    );
  }

  // Force-refresh ID token and confirm the actual JWT claims match `firestore.rules` `isSuperDeveloper()`
  let tokenEmail: string = currentEmail;
  let tokenEmailVerified: boolean = emailVerified;
  try {
    const tokenResult = await currentUser.getIdTokenResult(true);
    if (typeof tokenResult?.claims?.email === 'string') {
      tokenEmail = tokenResult.claims.email.trim().toLowerCase();
    }
    if (typeof tokenResult?.claims?.email_verified === 'boolean') {
      tokenEmailVerified = tokenResult.claims.email_verified;
    }
  } catch {
    try {
      await currentUser.getIdToken(true);
    } catch {
      // non-fatal offline refresh
    }
  }

  if (!isSuperDeveloperEmail(tokenEmail) || !tokenEmailVerified) {
    throw new Error(
      `SUPER_DEV_TOKEN_UNVERIFIED:${tokenEmail || 'none'}: Jeton sekirite Google Super Dev la pa gen email_verified=true. Dekonekte epi rekonekte ak Google (charlesjj3186@gmail.com).`
    );
  }

  const cleanChurchId = sanitizeFirestoreDocIdSegment(church?.id || '', 'CH');
  const nowIso = new Date().toISOString();
  const patch = buildSurgicalAdminVerificationPatch(verified, tokenEmail, nowIso);
  const ref = doc(db, CHURCHES_COL, cleanChurchId);

  let serverDocData: Record<string, any> | null = null;
  let docExistsInCloud = false;
  try {
    const snap = await getDocFromServer(ref);
    docExistsInCloud = snap.exists();
    if (docExistsInCloud) {
      serverDocData = snap.data() as Record<string, any>;
    }
  } catch {
    try {
      const cachedSnap = await getDoc(ref);
      docExistsInCloud = cachedSnap.exists();
      if (docExistsInCloud) {
        serverDocData = cachedSnap.data() as Record<string, any>;
      }
    } catch {
      // Proceed with write attempt
    }
  }

  try {
    if (docExistsInCloud && serverDocData) {
      const buildRepairedPayload = () => {
        const repaired = buildChurchFirestorePayload(
          {
            ...(serverDocData as Partial<Church>),
            id: cleanChurchId,
            adminVerified: verified,
            adminVerifiedAt: patch.adminVerifiedAt ?? undefined,
            adminVerifiedBy: patch.adminVerifiedBy ?? undefined,
          },
          cleanChurchId,
          {
            deliberateAdminVerificationUpdate: true,
            deliberatePasscodeUpdate: Boolean(serverDocData?.adminPasscode),
          }
        );
        repaired.updatedAt = nowIso;
        return repaired;
      };

      const hasDrift = hasChurchDocumentSchemaDrift(serverDocData, cleanChurchId);
      if (!hasDrift) {
        try {
          await updateDoc(ref, patch);
        } catch (firstErr) {
          if (!isTransientPermissionDeniedError(firstErr)) {
            throw firstErr;
          }
          // Flush freshly switched auth token to Firestore transport and retry once
          try {
            await currentUser.getIdToken(true);
          } catch {
            // ignore
          }
          await new Promise((resolve) => setTimeout(resolve, 350));
          try {
            await updateDoc(ref, patch);
          } catch (secondErr) {
            if (!isTransientPermissionDeniedError(secondErr)) {
              throw secondErr;
            }
            // Self-healing fallback: rewrite sanitized payload preserving all valid server fields
            await setDoc(ref, buildRepairedPayload());
          }
        }
      } else {
        // Authoritative self-healing rewrite preserving all valid server fields while stripping legacy drift keys
        await setDoc(ref, buildRepairedPayload());
      }
    } else {
      const fullPayload = buildChurchFirestorePayload(
        {
          ...church,
          id: cleanChurchId,
          adminVerified: verified,
          adminVerifiedAt: patch.adminVerifiedAt ?? undefined,
          adminVerifiedBy: patch.adminVerifiedBy ?? undefined,
        },
        cleanChurchId,
        {
          deliberateAdminVerificationUpdate: true,
          deliberatePasscodeUpdate: Boolean(church.adminPasscode),
        }
      );
      fullPayload.updatedAt = nowIso;
      await setDoc(ref, fullPayload, { merge: true });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${CHURCHES_COL}/${cleanChurchId}`, {
      churchId: cleanChurchId,
      docId: cleanChurchId,
      payloadKeys: Object.keys(patch),
    });
    throw error;
  }

  verifiedExistingChurchIds.add(cleanChurchId);

  return {
    verified,
    verifiedAt: patch.adminVerifiedAt ?? undefined,
    verifiedBy: patch.adminVerifiedBy ?? undefined,
  };
}

/**
 * Identifies transient or propagation-related Firestore `permission-denied` errors.
 */
export function isTransientPermissionDeniedError(error: unknown): boolean {
  const code =
    typeof (error as any)?.code === 'string' ? String((error as any).code).toLowerCase() : '';
  const msg =
    error instanceof Error ? error.message.toLowerCase() : String(error || '').toLowerCase();
  return (
    code === 'permission-denied' ||
    code === 'firestore/permission-denied' ||
    msg.includes('permission-denied') ||
    msg.includes('missing or insufficient permissions')
  );
}

export interface MemberCreateRetryOptions {
  maxAttempts?: number;
  retryDelaysMs?: number[];
  verifyChurchExists: (
    churchId: string,
    forceServerCheck: boolean
  ) => Promise<{ canonicalChurchId: string; existsInFirestore: boolean }>;
  refreshAuthToken?: () => Promise<void>;
  writeMemberDoc: (verifiedChurchId: string, attempt: number) => Promise<void>;
  sleep?: (ms: number) => Promise<void>;
}

export interface MemberCreateRetryResult {
  canonicalChurchId: string;
  attemptsUsed: number;
  churchVerified: boolean;
}

/**
 * Verifies parent church existence in the `churches` collection BEFORE writing a new member document,
 * and retries transient `permission-denied` errors with token refresh, forced server church verification,
 * and progressive backoff while preserving the mandatory immutable `churchId`.
 */
export async function executeMemberCreateWithRetry(
  mandatoryChurchId: string,
  options: MemberCreateRetryOptions
): Promise<MemberCreateRetryResult> {
  const lockedChurchId = assertMandatoryMemberChurchId(mandatoryChurchId);
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const retryDelaysMs = options.retryDelaysMs ?? [250, 600];
  const sleepFn =
    options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  let verifiedChurchId = lockedChurchId;
  let churchVerified = false;

  // Step 1: Verify the church document exists in `churches` BEFORE attempting the initial write
  let initialCheck = await options.verifyChurchExists(verifiedChurchId, false);
  if (!initialCheck.existsInFirestore) {
    initialCheck = await options.verifyChurchExists(verifiedChurchId, true);
  }
  if (!initialCheck.existsInFirestore) {
    throw new Error(
      `Cannot create member: parent church "${verifiedChurchId}" does not exist in the churches collection.`
    );
  }
  verifiedChurchId = assertMandatoryMemberChurchId(initialCheck.canonicalChurchId || verifiedChurchId);
  churchVerified = true;

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await options.writeMemberDoc(verifiedChurchId, attempt);
      return {
        canonicalChurchId: verifiedChurchId,
        attemptsUsed: attempt,
        churchVerified,
      };
    } catch (error) {
      lastError = error;
      const isPermDenied = isTransientPermissionDeniedError(error);
      if (!isPermDenied || attempt >= maxAttempts) {
        (error as any).__memberRetryMeta = {
          attemptsUsed: attempt,
          churchVerified,
          canonicalChurchId: verifiedChurchId,
        };
        throw error;
      }

      const delayMs = retryDelaysMs[attempt - 1] ?? 500;
      if (delayMs > 0) {
        await sleepFn(delayMs);
      }

      if (options.refreshAuthToken) {
        try {
          await options.refreshAuthToken();
        } catch {
          // Non-fatal token refresh failure; proceed to server church check
        }
      }

      // Re-verify directly against the `churches` collection on server before retrying write
      const retryCheck = await options.verifyChurchExists(verifiedChurchId, true);
      if (!retryCheck.existsInFirestore) {
        churchVerified = false;
        (error as any).__memberRetryMeta = {
          attemptsUsed: attempt,
          churchVerified: false,
          canonicalChurchId: verifiedChurchId,
        };
        throw error;
      }

      verifiedChurchId = assertMandatoryMemberChurchId(
        retryCheck.canonicalChurchId || verifiedChurchId
      );
      churchVerified = true;
    }
  }

  throw lastError;
}

export async function firestoreAddMember(member: Member): Promise<void> {
  const cleanId = typeof member?.id === 'string' ? member.id.trim().replace(/[^a-zA-Z0-9_-]/g, '') : '';
  if (!cleanId) return;

  // Enforce mandatory `churchId` immediately before queuing or writing
  const mandatoryChurchId = assertMandatoryMemberChurchId(member?.churchId);

  const existingInFlight = inFlightMemberAddMap.get(cleanId);
  if (existingInFlight) {
    return existingInFlight;
  }

  const runAdd = (async () => {
    await waitForAuthStateReady();
    const ref = doc(db, MEMBERS_COL, cleanId);
    let lastPayloadKeys: string[] = [];
    let resolvedChurchId = mandatoryChurchId;

    try {
      await executeMemberCreateWithRetry(mandatoryChurchId, {
        maxAttempts: 3,
        retryDelaysMs: [250, 600],
        verifyChurchExists: async (churchId, forceServerCheck) => {
          if (forceServerCheck) {
            verifiedExistingChurchIds.delete(churchId);
          }
          return firestoreEnsureChurchExists(churchId, undefined, forceServerCheck);
        },
        refreshAuthToken: async () => {
          if (auth.currentUser) {
            await auth.currentUser.reload().catch(() => {});
            await auth.currentUser.getIdToken(true).catch(() => {});
          }
        },
        writeMemberDoc: async (verifiedChurchId) => {
          resolvedChurchId = verifiedChurchId;
          const payload = buildMemberFirestorePayload(member, cleanId, verifiedChurchId);
          lastPayloadKeys = Object.keys(payload).sort();
          await setDoc(ref, payload);
        },
      });
    } catch (error) {
      const retryMeta = (error as any)?.__memberRetryMeta;
      handleFirestoreError(error, OperationType.CREATE, `${MEMBERS_COL}/${cleanId}`, {
        churchId: retryMeta?.canonicalChurchId || resolvedChurchId,
        docId: cleanId,
        payloadKeys: lastPayloadKeys,
        attemptsUsed: retryMeta?.attemptsUsed,
        churchVerified: retryMeta?.churchVerified,
      });
    }
  })();

  inFlightMemberAddMap.set(cleanId, runAdd);
  try {
    await runAdd;
  } finally {
    inFlightMemberAddMap.delete(cleanId);
  }
}

export async function firestoreBatchAddOrUpdateMembers(members: Member[]): Promise<void> {
  if (!members || members.length === 0) return;
  const validMembers = members.filter((m) => typeof m?.id === 'string' && m.id.trim());
  if (validMembers.length === 0) return;

  // Enforce mandatory `churchId` on every member in the batch before writing
  const resolvedInputChurchIds = validMembers.map((m) => assertMandatoryMemberChurchId(m.churchId));

  await waitForAuthStateReady();

  const uniqueChurchIds = Array.from(new Set(resolvedInputChurchIds));
  const churchIdResolutionMap = new Map<string, string>();
  for (const cid of uniqueChurchIds) {
    let ensured = await firestoreEnsureChurchExists(cid);
    if (!ensured.existsInFirestore) {
      ensured = await firestoreEnsureChurchExists(cid, undefined, true);
    }
    if (!ensured.existsInFirestore) {
      throw new Error(
        `Cannot batch write members: parent church "${cid}" does not exist in the churches collection.`
      );
    }
    churchIdResolutionMap.set(cid, assertMandatoryMemberChurchId(ensured.canonicalChurchId || cid));
  }

  const CHUNK_SIZE = 400;
  for (let i = 0; i < validMembers.length; i += CHUNK_SIZE) {
    const chunk = validMembers.slice(i, i + CHUNK_SIZE);
    const commitChunk = async (resMap: Map<string, string>) => {
      const batch = writeBatch(db);
      for (const m of chunk) {
        const cleanId = m.id.trim().replace(/[^a-zA-Z0-9_-]/g, '');
        if (!cleanId) continue;
        const mandatoryCid = assertMandatoryMemberChurchId(m.churchId);
        const canonicalChurchId = resMap.get(mandatoryCid) || mandatoryCid;
        const ref = doc(db, MEMBERS_COL, cleanId);
        const payload = buildMemberFirestorePayload(m, cleanId, canonicalChurchId);
        batch.set(ref, payload, { merge: true });
      }
      await batch.commit();
    };

    try {
      await commitChunk(churchIdResolutionMap);
    } catch (error) {
      if (isTransientPermissionDeniedError(error)) {
        await new Promise<void>((resolve) => setTimeout(resolve, 250));
        if (auth.currentUser) {
          await auth.currentUser.reload().catch(() => {});
          await auth.currentUser.getIdToken(true).catch(() => {});
        }
        for (const cid of uniqueChurchIds) {
          const mappedId = churchIdResolutionMap.get(cid) || cid;
          verifiedExistingChurchIds.delete(mappedId);
          const retryEnsure = await firestoreEnsureChurchExists(cid, undefined, true);
          if (retryEnsure.existsInFirestore) {
            churchIdResolutionMap.set(
              cid,
              assertMandatoryMemberChurchId(retryEnsure.canonicalChurchId || mappedId)
            );
          }
        }
        await commitChunk(churchIdResolutionMap);
      } else {
        throw error;
      }
    }
  }
}

export async function firestoreUpdateMember(
  member: Member,
  options?: { clearPhoto?: boolean }
): Promise<void> {
  const cleanId = typeof member?.id === 'string' ? member.id.trim().replace(/[^a-zA-Z0-9_-]/g, '') : '';
  if (!cleanId) return;

  // Enforce mandatory immutable `churchId` on all member updates
  const mandatoryChurchId = assertMandatoryMemberChurchId(member?.churchId);

  await waitForAuthStateReady();
  const { canonicalChurchId } = await firestoreEnsureChurchExists(mandatoryChurchId);
  const lockedChurchId = assertMandatoryMemberChurchId(canonicalChurchId || mandatoryChurchId);
  const payload = buildMemberFirestorePayload(member, cleanId, lockedChurchId, options);
  const ref = doc(db, MEMBERS_COL, cleanId);

  try {
    await setDoc(ref, payload, { merge: true });
  } catch (error) {
    if (isTransientPermissionDeniedError(error)) {
      verifiedExistingChurchIds.delete(lockedChurchId);
      const retryEnsure = await firestoreEnsureChurchExists(lockedChurchId, undefined, true);
      if (retryEnsure.existsInFirestore) {
        const verifiedRetryChurchId = assertMandatoryMemberChurchId(
          retryEnsure.canonicalChurchId || lockedChurchId
        );
        const retryPayload = buildMemberFirestorePayload(member, cleanId, verifiedRetryChurchId, options);
        try {
          await setDoc(ref, retryPayload, { merge: true });
          return;
        } catch (retryError) {
          handleFirestoreError(retryError, OperationType.UPDATE, `${MEMBERS_COL}/${cleanId}`, {
            churchId: verifiedRetryChurchId,
            docId: cleanId,
            payloadKeys: Object.keys(retryPayload).sort(),
            churchVerified: true,
          });
          return;
        }
      }
    }
    handleFirestoreError(error, OperationType.UPDATE, `${MEMBERS_COL}/${cleanId}`, {
      churchId: lockedChurchId,
      docId: cleanId,
      payloadKeys: Object.keys(payload).sort(),
    });
  }
}

/**
 * Surgical, rule-compliant profile photo update for a member (`isMemberSelf` or admin).
 * Writes ONLY `avatarUrl`, `photoUrl`, `googlePhoto`, `updatedAt` when updating an existing member doc
 * so `firestore.rules` `isMemberSelf` `affectedKeys().hasOnly([...])` succeeds cleanly,
 * and also aligns `users/{uid}.photoUrl` for the signed-in user if their user doc exists.
 */
export async function firestoreUpdateMemberProfilePhoto(
  member: Member,
  nextPhoto: string | null
): Promise<{ synced: boolean; reason?: string }> {
  const cleanId = typeof member?.id === 'string' ? member.id.trim().replace(/[^a-zA-Z0-9_-]/g, '') : '';
  if (!cleanId) return { synced: false, reason: 'invalid_id' };
  if (isUnitTestRuntime()) {
    return { synced: true };
  }

  await waitForAuthStateReady();
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return { synced: false, reason: 'unauthenticated' };
  }

  const cleanPhoto = typeof nextPhoto === 'string' ? clampOptionalMediaString(nextPhoto, 600000) : undefined;
  const isClearing = !cleanPhoto;
  const isLargeBase64 = Boolean(cleanPhoto && cleanPhoto.startsWith('data:image/') && cleanPhoto.length > 120000);
  const nowIso = new Date().toISOString();

  const photoPatch: Record<string, any> = isClearing
    ? {
        avatarUrl: null,
        photoUrl: null,
        googlePhoto: null,
        updatedAt: nowIso,
      }
    : {
        avatarUrl: cleanPhoto,
        photoUrl: isLargeBase64 ? null : cleanPhoto,
        googlePhoto: isLargeBase64 ? null : cleanPhoto,
        updatedAt: nowIso,
      };

  const memberRef = doc(db, MEMBERS_COL, cleanId);
  try {
    const existingSnap = await getDoc(memberRef).catch(() => null);
    if (existingSnap && existingSnap.exists()) {
      await updateDoc(memberRef, photoPatch);
    } else {
      const mandatoryChurchId = assertMandatoryMemberChurchId(member?.churchId);
      const { canonicalChurchId } = await firestoreEnsureChurchExists(mandatoryChurchId);
      const lockedChurchId = assertMandatoryMemberChurchId(canonicalChurchId || mandatoryChurchId);
      const fullPayload = buildMemberFirestorePayload(
        {
          ...member,
          avatarUrl: isClearing ? undefined : cleanPhoto,
          photoUrl: isClearing ? undefined : cleanPhoto,
          googlePhoto: isClearing ? undefined : cleanPhoto,
          updatedAt: nowIso,
        },
        cleanId,
        lockedChurchId,
        { clearPhoto: isClearing }
      );
      await setDoc(memberRef, fullPayload, { merge: true });
    }

    const matchesSignedInUid =
      currentUser.uid === member.googleUid ||
      currentUser.uid === member.userId ||
      Boolean(
        currentUser.emailVerified &&
          currentUser.email &&
          [member.googleEmail, member.email]
            .filter(Boolean)
            .some((e) => e!.trim().toLowerCase() === currentUser.email!.trim().toLowerCase())
      );

    if (matchesSignedInUid) {
      await firestoreSyncAdminUserProfilePhoto(currentUser.uid, isClearing ? null : cleanPhoto!);
    }
    return { synced: true };
  } catch (error) {
    console.warn('firestoreUpdateMemberProfilePhoto warning:', error);
    return {
      synced: false,
      reason: error instanceof Error ? error.message : 'firestore_error',
    };
  }
}

export async function firestoreDeleteMember(
  memberId: string,
  churchId?: string,
  memberCode?: string,
  memberName?: string
): Promise<{
  deletedScansCount: number;
  deletedCommentsCount: number;
  deletedReactionsCount: number;
}> {
  let deletedScansCount = 0;
  let deletedCommentsCount = 0;
  let deletedReactionsCount = 0;

  try {
    const cleanMemberId = (memberId || '').trim();
    let resolvedChurchId = (churchId && churchId !== 'ALL' ? churchId.trim() : '') || undefined;
    let resolvedMemberCode = (memberCode || '').trim() || undefined;
    let resolvedFullName = (memberName || '').trim() || undefined;
    let resolvedBarcodeToken: string | undefined;

    try {
      if (cleanMemberId) {
        const memberRef = doc(db, MEMBERS_COL, cleanMemberId);
        const mSnap = await getDoc(memberRef);
        if (mSnap.exists()) {
          const mData = mSnap.data() as Member;
          if (!resolvedChurchId && mData.churchId) resolvedChurchId = mData.churchId;
          if (!resolvedMemberCode && mData.memberId) resolvedMemberCode = mData.memberId;
          if (!resolvedFullName && mData.fullName) resolvedFullName = mData.fullName;
          if (mData.barcodeToken) resolvedBarcodeToken = mData.barcodeToken;
        }
      }
    } catch (fetchErr) {
      console.warn('Could not pre-fetch member details for cascade delete:', fetchErr);
    }

    const memberDocRefsToDelete = new Set<string>();
    if (cleanMemberId) memberDocRefsToDelete.add(cleanMemberId);
    if (resolvedMemberCode) memberDocRefsToDelete.add(resolvedMemberCode);

    try {
      const memCol = collection(db, MEMBERS_COL);
      const qMem = resolvedChurchId ? query(memCol, where('churchId', '==', resolvedChurchId)) : memCol;
      const memSnap = await getDocs(qMem);
      memSnap.forEach((d) => {
        const data = d.data() as Member;
        const matchId = data.id === cleanMemberId || (resolvedMemberCode && data.id === resolvedMemberCode);
        const matchCode = data.memberId === cleanMemberId || (resolvedMemberCode && data.memberId === resolvedMemberCode);
        const matchBarcode = resolvedBarcodeToken && data.barcodeToken === resolvedBarcodeToken;
        const matchName =
          resolvedFullName &&
          data.fullName &&
          data.fullName.trim().toLowerCase() === resolvedFullName.trim().toLowerCase();
        if (
          matchId ||
          matchCode ||
          matchBarcode ||
          matchName ||
          d.id === cleanMemberId ||
          (resolvedMemberCode && d.id === resolvedMemberCode)
        ) {
          memberDocRefsToDelete.add(d.id);
        }
      });
    } catch (searchErr) {
      console.warn('Error querying members collection for delete:', searchErr);
    }

    for (const docId of memberDocRefsToDelete) {
      try {
        await deleteDoc(doc(db, MEMBERS_COL, docId));
      } catch (delErr) {
        console.warn(`Error deleting member doc ${docId}:`, delErr);
      }
    }

    try {
      const attCol = collection(db, ATTENDANCE_COL);
      const qAtt = resolvedChurchId ? query(attCol, where('churchId', '==', resolvedChurchId)) : attCol;
      const attSnap = await getDocs(qAtt);
      if (!attSnap.empty) {
        const toDeleteDocs: any[] = [];
        attSnap.forEach((d) => {
          const data = d.data() as any;
          const matchDbId = data.memberDbId === cleanMemberId;
          const matchMemberId =
            data.memberId === cleanMemberId || (resolvedMemberCode && data.memberId === resolvedMemberCode);
          const matchBarcode = resolvedBarcodeToken && data.barcodeToken === resolvedBarcodeToken;
          const matchName =
            resolvedFullName &&
            data.memberName &&
            data.memberName.trim().toLowerCase() === resolvedFullName.trim().toLowerCase();
          if (matchDbId || matchMemberId || matchBarcode || matchName) {
            toDeleteDocs.push(d.ref);
          }
        });
        for (let i = 0; i < toDeleteDocs.length; i += 400) {
          const batch = writeBatch(db);
          const slice = toDeleteDocs.slice(i, i + 400);
          slice.forEach((r) => batch.delete(r));
          await batch.commit();
        }
        deletedScansCount = toDeleteDocs.length;
      }
    } catch (attErr) {
      console.warn('Firestore cascade delete attendance error:', attErr);
    }

    try {
      const commCol = collection(db, ANNOUNCEMENT_COMMENTS_COL);
      const qComm = resolvedChurchId ? query(commCol, where('churchId', '==', resolvedChurchId)) : commCol;
      const commSnap = await getDocs(qComm);
      if (!commSnap.empty) {
        const toDeleteDocs: any[] = [];
        commSnap.forEach((d) => {
          const data = d.data() as any;
          const authorVal = data.userName || data.author || '';
          const matchAuthor =
            resolvedFullName &&
            authorVal &&
            authorVal.trim().toLowerCase() === resolvedFullName.trim().toLowerCase();
          const matchId =
            data.userId === cleanMemberId ||
            data.authorMemberId === cleanMemberId ||
            data.memberId === cleanMemberId ||
            (resolvedMemberCode && (data.userId === resolvedMemberCode || data.memberId === resolvedMemberCode));
          if (matchAuthor || matchId) {
            toDeleteDocs.push(d.ref);
          }
        });
        for (let i = 0; i < toDeleteDocs.length; i += 400) {
          const batch = writeBatch(db);
          const slice = toDeleteDocs.slice(i, i + 400);
          slice.forEach((r) => batch.delete(r));
          await batch.commit();
        }
        deletedCommentsCount = toDeleteDocs.length;
      }
    } catch (commErr) {
      console.warn('Firestore cascade delete comments error:', commErr);
    }

    try {
      const reactCol = collection(db, ANNOUNCEMENT_REACTIONS_COL);
      const qReact = resolvedChurchId ? query(reactCol, where('churchId', '==', resolvedChurchId)) : reactCol;
      const reactSnap = await getDocs(qReact);
      if (!reactSnap.empty) {
        const toDeleteDocs: any[] = [];
        reactSnap.forEach((d) => {
          const data = d.data() as any;
          const matchMember =
            data.userId === cleanMemberId ||
            data.memberId === cleanMemberId ||
            (resolvedMemberCode && (data.userId === resolvedMemberCode || data.memberId === resolvedMemberCode));
          if (matchMember) {
            toDeleteDocs.push(d.ref);
          }
        });
        for (let i = 0; i < toDeleteDocs.length; i += 400) {
          const batch = writeBatch(db);
          const slice = toDeleteDocs.slice(i, i + 400);
          slice.forEach((r) => batch.delete(r));
          await batch.commit();
        }
        deletedReactionsCount = toDeleteDocs.length;
      }
    } catch (reactErr) {
      console.warn('Firestore cascade delete reactions error:', reactErr);
    }
  } catch (err) {
    console.warn('Firestore deleteMember error:', err);
  }

  return { deletedScansCount, deletedCommentsCount, deletedReactionsCount };
}

export async function firestoreBatchDeleteMembers(
  memberIds: string[],
  churchId?: string
): Promise<{ deletedMembersCount: number }> {
  let count = 0;
  for (const mid of memberIds) {
    try {
      await firestoreDeleteMember(mid, churchId);
      count++;
    } catch (err) {
      console.warn(`Error batch deleting member ${mid}:`, err);
    }
  }
  return { deletedMembersCount: count };
}

/**
 * Fan-out member notification documents in `notifications/{notifId}` for active church members.
 * Strictly excludes the Church Admin / sender (`role === "admin"`, `authorId`, `church.adminGoogleUid`, `church.adminGoogleEmail`, or verified Super Developer hash).
 */
export async function firestoreFanOutChurchNotification(params: {
  churchId: string;
  targetId: string;
  type: 'announcement' | 'service';
  title: string;
  message: string;
  authorId?: string;
  church?: Partial<Church> | null;
  members?: Member[];
}): Promise<number> {
  const { churchId, targetId, type, title, message, authorId } = params;
  if (!churchId || !targetId || !title) return 0;

  try {
    let churchData = params.church || null;
    if (!churchData) {
      try {
        const cSnap = await getDoc(doc(db, CHURCHES_COL, churchId));
        if (cSnap.exists()) {
          churchData = cSnap.data() as Church;
        }
      } catch {}
    }

    const memberList: Member[] =
      params.members && params.members.length > 0 ? [...params.members] : [];
    if (memberList.length === 0) {
      const mSnap = await getDocs(
        query(collection(db, MEMBERS_COL), where('churchId', '==', churchId))
      );
      mSnap.forEach((d) => {
        const m = d.data() as Member;
        if (m && !isLegacyDemoMember(m)) {
          memberList.push({ ...m, id: d.id || m.id });
        }
      });
    }

    const eligibleMembers = memberList.filter(
      (m) => !isExcludedAdminRecipient(m, churchData, authorId)
    );

    if (eligibleMembers.length === 0) return 0;

    const cleanTitleText = title.trim();
    const formattedTitle =
      type === 'announcement'
        ? cleanTitleText.startsWith('Nouvo Anons •')
          ? cleanTitleText.slice(0, 350)
          : `Nouvo Anons • ${cleanTitleText}`.slice(0, 350)
        : cleanTitleText.startsWith('Nouvo Sèvis •')
        ? cleanTitleText.slice(0, 350)
        : `Nouvo Sèvis • ${cleanTitleText}`.slice(0, 350);

    const formattedMessage = (message || cleanTitleText).trim().slice(0, 5000);

    const CHUNK_SIZE = 400;
    let written = 0;
    for (let i = 0; i < eligibleMembers.length; i += CHUNK_SIZE) {
      const chunk = eligibleMembers.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const m of chunk) {
        const memberDocId = (m.id || m.memberId || '').trim();
        const userId = ((m as any).userId || m.id || m.memberId || '').trim();
        if (!memberDocId || !userId) continue;
        const cleanDocId = memberDocId.replace(/[^a-zA-Z0-9_-]/g, '_');
        const cleanTargetId = targetId.replace(/[^a-zA-Z0-9_-]/g, '_');
        const notifId =
          type === 'announcement'
            ? `notif_announcement_${cleanTargetId}_${cleanDocId}`
            : `notif_service_${cleanTargetId}_${cleanDocId}`;
        const notifRef = doc(db, NOTIFICATIONS_COL, notifId);
        batch.set(notifRef, {
          userId,
          churchId,
          title: formattedTitle,
          message: formattedMessage,
          type,
          isRead: false,
          createdAt: serverTimestamp(),
        });
        written++;
      }
      await batch.commit();
    }
    return written;
  } catch (err) {
    console.warn('Firestore fan-out notification warning:', err);
    return 0;
  }
}

export async function firestoreSetNotificationReadStateById(
  notifId: string,
  isRead: boolean
): Promise<void> {
  if (!notifId || !notifId.trim() || isUnitTestRuntime()) return;
  try {
    const ref = doc(db, NOTIFICATIONS_COL, notifId.trim());
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data() as Record<string, any>;
    const currentIsRead = Boolean(data?.isRead);
    const currentRead = data?.read === undefined ? currentIsRead : Boolean(data?.read);
    if (currentIsRead !== isRead || currentRead !== isRead) {
      await updateDoc(ref, {
        isRead,
        read: isRead,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch {}
}

export async function firestoreMarkNotificationReadById(notifId: string): Promise<void> {
  await firestoreSetNotificationReadStateById(notifId, true);
}

export async function firestoreSetAnnouncementNotificationReadState(
  churchId: string,
  announcementId: string,
  member: Partial<Member> | null | undefined,
  isRead: boolean
): Promise<void> {
  if (!churchId || !announcementId || !member || isUnitTestRuntime()) return;
  const cleanTargetId = announcementId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const candidateDocIds = Array.from(
    new Set(
      [member.id, member.memberId, (member as any).userId]
        .filter(Boolean)
        .map((v) => String(v).trim().replace(/[^a-zA-Z0-9_-]/g, '_'))
    )
  );
  for (const docId of candidateDocIds) {
    const notifId = `notif_announcement_${cleanTargetId}_${docId}`;
    await firestoreSetNotificationReadStateById(notifId, isRead);
  }
}

export async function firestoreMarkAnnouncementNotificationRead(
  churchId: string,
  announcementId: string,
  member?: Partial<Member> | null
): Promise<void> {
  await firestoreSetAnnouncementNotificationReadState(churchId, announcementId, member, true);
}

export async function firestoreSetServiceNotificationReadState(
  churchId: string,
  serviceId: string,
  member: Partial<Member> | null | undefined,
  isRead: boolean
): Promise<void> {
  if (!churchId || !serviceId || !member || isUnitTestRuntime()) return;
  const cleanTargetId = serviceId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const candidateDocIds = Array.from(
    new Set(
      [member.id, member.memberId, (member as any).userId]
        .filter(Boolean)
        .map((v) => String(v).trim().replace(/[^a-zA-Z0-9_-]/g, '_'))
    )
  );
  for (const docId of candidateDocIds) {
    const notifId = `notif_service_${cleanTargetId}_${docId}`;
    await firestoreSetNotificationReadStateById(notifId, isRead);
  }
}

export async function firestoreAddService(
  service: ServiceSession,
  options?: { fanOutNotification?: boolean }
): Promise<void> {
  const cleanId =
    typeof service?.id === 'string' && service.id.trim()
      ? service.id.trim()
      : typeof (service as any)?.serviceId === 'string' && (service as any).serviceId.trim()
      ? (service as any).serviceId.trim()
      : '';
  if (!cleanId) return;

  const existingInFlight = inFlightServiceAddMap.get(cleanId);
  if (existingInFlight) {
    return existingInFlight;
  }

  const buildSanitizedServicePayload = (targetChurchId: string): Record<string, any> => {
    const resolvedPosterOrImage =
      (typeof service.posterUrl === 'string' && service.posterUrl.trim()) ||
      (typeof service.imageUrl === 'string' && service.imageUrl.trim()) ||
      (typeof service.bannerUrl === 'string' && service.bannerUrl.trim()) ||
      (typeof service.thumbnailUrl === 'string' && service.thumbnailUrl.trim()) ||
      (typeof service.coverUrl === 'string' && service.coverUrl.trim()) ||
      undefined;
    const currentAuthUid = auth.currentUser?.uid;
    const isDeaconCaller = isCurrentUserSyncedDeaconForChurch(targetChurchId);
    const resolvedAuthorId =
      (isDeaconCaller && currentAuthUid)
        ? currentAuthUid
        : (typeof service.authorId === 'string' && service.authorId.trim()) || currentAuthUid || undefined;
    const raw = sanitizeForFirestore({
      ...service,
      id: cleanId,
      churchId: targetChurchId || service.churchId,
      title: String(service.title || 'Sèvis').trim().slice(0, 200) || 'Sèvis',
      ...(resolvedAuthorId ? { authorId: resolvedAuthorId } : {}),
      ...(resolvedPosterOrImage
        ? { posterUrl: resolvedPosterOrImage, imageUrl: resolvedPosterOrImage }
        : {}),
    }) as Record<string, any>;
    const filtered: Record<string, any> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (ALLOWED_SERVICE_KEYS.has(k) && v !== undefined) {
        filtered[k] = v;
      }
    }
    return filtered;
  };

  const runAdd = (async () => {
    let effectiveChurchId = service.churchId || '';
    let lastPayloadKeys: string[] = [];
    try {
      await waitForAuthStateReady();
      let { canonicalChurchId } = await firestoreEnsureChurchExists(service.churchId);
      const ref = doc(db, SERVICES_COL, cleanId);
      effectiveChurchId = canonicalChurchId || service.churchId;
      if (activeDeaconSessionContext && activeDeaconSessionContext.churchId === effectiveChurchId) {
        await firestoreEnsureDeaconUserProfile(effectiveChurchId, activeDeaconSessionContext.member);
      }
      let payload = buildSanitizedServicePayload(effectiveChurchId);
      lastPayloadKeys = Object.keys(payload).sort();

      try {
        await setDoc(ref, payload);
      } catch (firstErr) {
        if (!isTransientPermissionDeniedError(firstErr)) {
          throw firstErr;
        }
        if (auth.currentUser) {
          await auth.currentUser.reload().catch(() => {});
          await auth.currentUser.getIdToken(true).catch(() => {});
        }
        verifiedExistingChurchIds.delete(effectiveChurchId);
        const retryCheck = await firestoreEnsureChurchExists(effectiveChurchId, undefined, true);
        canonicalChurchId = retryCheck.canonicalChurchId || effectiveChurchId;
        effectiveChurchId = canonicalChurchId;
        if (activeDeaconSessionContext && activeDeaconSessionContext.churchId === effectiveChurchId) {
          await firestoreEnsureDeaconUserProfile(effectiveChurchId, activeDeaconSessionContext.member, {
            forceRefresh: true,
          });
        }
        payload = buildSanitizedServicePayload(canonicalChurchId);
        lastPayloadKeys = Object.keys(payload).sort();
        await new Promise((resolve) => setTimeout(resolve, 300));
        await setDoc(ref, payload);
      }

      if (options?.fanOutNotification) {
        const summary = `${service.title} • ${service.date}${service.startTime ? ` (${service.startTime}${service.endTime ? ` - ${service.endTime}` : ''})` : ''}${service.preacherOrLeader ? ` • Dirije pa: ${service.preacherOrLeader}` : ''}`;
        firestoreFanOutChurchNotification({
          churchId: effectiveChurchId,
          targetId: cleanId,
          type: 'service',
          title: service.title,
          message: summary,
          authorId: auth.currentUser?.uid,
        }).catch(() => {});
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `${SERVICES_COL}/${cleanId}`, {
        churchId: effectiveChurchId,
        docId: cleanId,
        payloadKeys: lastPayloadKeys,
      });
    }
  })();

  inFlightServiceAddMap.set(cleanId, runAdd);
  try {
    await runAdd;
  } finally {
    inFlightServiceAddMap.delete(cleanId);
  }
}

export async function firestoreUpdateService(serviceId: string, data: Partial<ServiceSession>): Promise<void> {
  const cleanId = typeof serviceId === 'string' ? serviceId.trim() : '';
  if (!cleanId) return;

  // Wait for any in-flight creation of this exact service doc so updateDoc never races ahead of setDoc
  const pendingCreate = inFlightServiceAddMap.get(cleanId);
  if (pendingCreate) {
    try {
      await pendingCreate;
    } catch {
      // If initial create failed, don't fire a redundant doomed updateDoc on a non-existent doc
      return;
    }
  }

  const raw = sanitizeForFirestore(data) as Record<string, any>;
  const filtered: Record<string, any> = {};
  for (const [k, v] of Object.entries(raw || {})) {
    if (ALLOWED_SERVICE_KEYS.has(k) && v !== undefined) {
      filtered[k] = v;
    }
  }
  if (data.imageUrl !== undefined && filtered.posterUrl === undefined) {
    filtered.posterUrl = data.imageUrl ?? null;
  }
  if (data.posterUrl !== undefined && filtered.imageUrl === undefined) {
    filtered.imageUrl = data.posterUrl ?? null;
  }
  if (Object.keys(filtered).length === 0) return;

  try {
    await waitForAuthStateReady();
    const ref = doc(db, SERVICES_COL, cleanId);
    try {
      await updateDoc(ref, filtered);
    } catch (firstErr) {
      if (!isTransientPermissionDeniedError(firstErr)) {
        throw firstErr;
      }
      if (auth.currentUser) {
        await auth.currentUser.reload().catch(() => {});
        await auth.currentUser.getIdToken(true).catch(() => {});
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
      await updateDoc(ref, filtered);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${SERVICES_COL}/${cleanId}`, {
      churchId: typeof data?.churchId === 'string' ? data.churchId : undefined,
      docId: cleanId,
      payloadKeys: Object.keys(filtered).sort(),
    });
  }
}

export async function firestoreDeleteService(
  serviceId: string,
  options?: { churchId?: string; deleteRelatedAttendance?: boolean }
): Promise<void> {
  const cleanId = typeof serviceId === 'string' ? serviceId.trim() : '';
  if (!cleanId) return;
  try {
    const ref = doc(db, SERVICES_COL, cleanId);
    let resolvedChurchId = (options?.churchId || '').trim();
    if (!resolvedChurchId) {
      try {
        const srvSnap = await getDoc(ref);
        if (srvSnap.exists()) {
          resolvedChurchId = String((srvSnap.data() as any)?.churchId || '').trim();
        }
      } catch {}
    }

    await deleteDoc(ref);

    // Best-effort cascade cleanup of service comments, reactions, notifications, and (optionally) attendance
    try {
      const feedId = `srv-feed-${cleanId}`;
      const [commT1, commT2, commA1, commA2, reactT1, reactT2, reactA1, reactA2] = await Promise.all([
        getDocs(query(collection(db, ANNOUNCEMENT_COMMENTS_COL), where('targetId', '==', cleanId))),
        getDocs(query(collection(db, ANNOUNCEMENT_COMMENTS_COL), where('targetId', '==', feedId))),
        getDocs(query(collection(db, ANNOUNCEMENT_COMMENTS_COL), where('announcementId', '==', cleanId))),
        getDocs(query(collection(db, ANNOUNCEMENT_COMMENTS_COL), where('announcementId', '==', feedId))),
        getDocs(query(collection(db, ANNOUNCEMENT_REACTIONS_COL), where('targetId', '==', cleanId))),
        getDocs(query(collection(db, ANNOUNCEMENT_REACTIONS_COL), where('targetId', '==', feedId))),
        getDocs(query(collection(db, ANNOUNCEMENT_REACTIONS_COL), where('announcementId', '==', cleanId))),
        getDocs(query(collection(db, ANNOUNCEMENT_REACTIONS_COL), where('announcementId', '==', feedId))),
      ]);

      const refsToDelete = new Map<string, any>();
      [commT1, commT2, commA1, commA2, reactT1, reactT2, reactA1, reactA2].forEach((snap) => {
        snap.forEach((d) => refsToDelete.set(d.ref.path, d.ref));
      });

      if (resolvedChurchId) {
        const cleanTargetId = cleanId.replace(/[^a-zA-Z0-9_-]/g, '_');
        const notifPrefix = `notif_service_${cleanTargetId}_`;
        try {
          const notifSnap = await getDocs(
            query(collection(db, NOTIFICATIONS_COL), where('churchId', '==', resolvedChurchId))
          );
          notifSnap.forEach((d) => {
            if (d.id.startsWith(notifPrefix)) {
              refsToDelete.set(d.ref.path, d.ref);
            }
          });
        } catch {}
      }

      if (options?.deleteRelatedAttendance) {
        try {
          const attSnap = await getDocs(
            query(collection(db, ATTENDANCE_COL), where('serviceId', '==', cleanId))
          );
          attSnap.forEach((d) => refsToDelete.set(d.ref.path, d.ref));
        } catch {}
      }

      await commitDeleteDocRefsInChunks(Array.from(refsToDelete.values()));
    } catch (cascadeErr) {
      console.warn('Cascade cleanup on firestoreDeleteService warning:', cascadeErr);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${SERVICES_COL}/${cleanId}`);
  }
}

export async function firestoreAddAnnouncement(
  ann: Announcement,
  options?: { fanOutNotification?: boolean }
): Promise<void> {
  const cleanId = typeof ann?.id === 'string' ? ann.id.trim() : '';
  if (!cleanId) return;
  let effectiveChurchId = ann.churchId || '';
  let lastPayloadKeys: string[] = [];
  try {
    await waitForAuthStateReady();
    let { canonicalChurchId } = await firestoreEnsureChurchExists(ann.churchId);
    const ref = doc(db, ANNOUNCEMENTS_COL, cleanId);
    effectiveChurchId = canonicalChurchId || ann.churchId;
    if (activeDeaconSessionContext && activeDeaconSessionContext.churchId === effectiveChurchId) {
      await firestoreEnsureDeaconUserProfile(effectiveChurchId, activeDeaconSessionContext.member);
    }
    const alignDeaconAuthor = (input: Announcement): Announcement => {
      const uid = auth.currentUser?.uid;
      if (uid && (input.authorType === 'deacon' || isCurrentUserSyncedDeaconForChurch(effectiveChurchId))) {
        return { ...input, authorId: uid };
      }
      return input;
    };
    let strictPayload = buildAnnouncementFirestorePayload(
      alignDeaconAuthor({ ...ann, churchId: effectiveChurchId }),
      { isCreate: true }
    );
    lastPayloadKeys = Object.keys(strictPayload).sort();

    try {
      await setDoc(ref, sanitizeForFirestore(strictPayload));
    } catch (firstErr) {
      if (!isTransientPermissionDeniedError(firstErr)) {
        throw firstErr;
      }
      if (auth.currentUser) {
        await auth.currentUser.reload().catch(() => {});
        await auth.currentUser.getIdToken(true).catch(() => {});
      }
      verifiedExistingChurchIds.delete(effectiveChurchId);
      const retryCheck = await firestoreEnsureChurchExists(effectiveChurchId, undefined, true);
      effectiveChurchId = retryCheck.canonicalChurchId || effectiveChurchId;
      if (activeDeaconSessionContext && activeDeaconSessionContext.churchId === effectiveChurchId) {
        await firestoreEnsureDeaconUserProfile(effectiveChurchId, activeDeaconSessionContext.member, {
          forceRefresh: true,
        });
      }
      strictPayload = buildAnnouncementFirestorePayload(
        alignDeaconAuthor({ ...ann, churchId: effectiveChurchId }),
        { isCreate: true }
      );
      lastPayloadKeys = Object.keys(strictPayload).sort();
      await new Promise((resolve) => setTimeout(resolve, 300));
      await setDoc(ref, sanitizeForFirestore(strictPayload));
    }

    if (options?.fanOutNotification) {
      firestoreFanOutChurchNotification({
        churchId: strictPayload.churchId,
        targetId: cleanId,
        type: 'announcement',
        title: strictPayload.title,
        message: strictPayload.content,
        authorId: strictPayload.authorId,
      }).catch(() => {});
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${ANNOUNCEMENTS_COL}/${cleanId}`, {
      churchId: effectiveChurchId,
      docId: cleanId,
      payloadKeys: lastPayloadKeys,
    });
  }
}

const ALLOWED_ANNOUNCEMENT_KEYS = new Set<string>([
  'churchId',
  'title',
  'content',
  'department',
  'category',
  'date',
  'targetAudience',
  'isPinned',
  'showToastOnLogin',
  'toastAlertLevel',
  'isScheduledNotification',
  'scheduledNotificationDate',
  'posterUrl',
  'imageUrl',
  'serviceId',
  'authorId',
  'authorName',
  'reactionsCount',
  'commentsCount',
  'createdAt',
  'updatedAt',
]);

export async function firestoreUpdateAnnouncement(
  annId: string,
  data: Partial<Announcement>
): Promise<void> {
  const cleanId = typeof annId === 'string' ? annId.trim() : '';
  if (!cleanId) return;
  try {
    const ref = doc(db, ANNOUNCEMENTS_COL, cleanId);
    if (data.churchId && data.title && data.content) {
      const fullPayload = buildAnnouncementFirestorePayload(data, {
        isCreate: false,
        preserveExistingCreatedAt: data.createdAt,
      });
      await setDoc(ref, sanitizeForFirestore(fullPayload), { merge: true });
      return;
    }

    const filtered: Record<string, any> = {
      updatedAt: serverTimestamp(),
    };
    for (const [k, v] of Object.entries(data as Record<string, any>)) {
      if (ALLOWED_ANNOUNCEMENT_KEYS.has(k) && v !== undefined) {
        filtered[k] = v;
      }
    }
    if (data.imageUrl !== undefined && filtered.posterUrl === undefined) {
      filtered.posterUrl = data.imageUrl ?? null;
    }
    if (data.posterUrl !== undefined && filtered.imageUrl === undefined) {
      filtered.imageUrl = data.posterUrl ?? null;
    }
    await updateDoc(ref, sanitizeForFirestore(filtered));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${ANNOUNCEMENTS_COL}/${annId}`);
  }
}

export async function firestoreDeleteAnnouncement(annId: string): Promise<void> {
  const cleanId = typeof annId === 'string' ? annId.trim() : '';
  if (!cleanId) return;
  const ref = doc(db, ANNOUNCEMENTS_COL, cleanId);
  let resolvedChurchId = '';
  try {
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      resolvedChurchId = String((existingSnap.data() as any)?.churchId || '').trim();
    }
  } catch {}

  try {
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${ANNOUNCEMENTS_COL}/${cleanId}`);
    return;
  }

  try {
    const [commentsByTarget, commentsByAnn, reactionsByTarget, reactionsByAnn] = await Promise.all([
      getDocs(query(collection(db, ANNOUNCEMENT_COMMENTS_COL), where('targetId', '==', cleanId))),
      getDocs(query(collection(db, ANNOUNCEMENT_COMMENTS_COL), where('announcementId', '==', cleanId))),
      getDocs(query(collection(db, ANNOUNCEMENT_REACTIONS_COL), where('targetId', '==', cleanId))),
      getDocs(query(collection(db, ANNOUNCEMENT_REACTIONS_COL), where('announcementId', '==', cleanId))),
    ]);

    const refsToDelete = new Map<string, any>();
    commentsByTarget.forEach((d) => refsToDelete.set(d.ref.path, d.ref));
    commentsByAnn.forEach((d) => refsToDelete.set(d.ref.path, d.ref));
    reactionsByTarget.forEach((d) => refsToDelete.set(d.ref.path, d.ref));
    reactionsByAnn.forEach((d) => refsToDelete.set(d.ref.path, d.ref));

    if (resolvedChurchId) {
      const cleanTargetId = cleanId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const notifPrefix = `notif_announcement_${cleanTargetId}_`;
      try {
        const notifSnap = await getDocs(
          query(collection(db, NOTIFICATIONS_COL), where('churchId', '==', resolvedChurchId))
        );
        notifSnap.forEach((d) => {
          if (d.id.startsWith(notifPrefix)) {
            refsToDelete.set(d.ref.path, d.ref);
          }
        });
      } catch {}
    }

    await commitDeleteDocRefsInChunks(Array.from(refsToDelete.values()));
  } catch (e) {
    console.warn('Error cascade deleting announcement interactions:', e);
  }
}

/**
 * Builds the exact `announcement_comments/{commentId}` payload with ONLY the allowed keys
 * enforced by `firestore.rules` and shared with the Android Kotlin app (`com.zoutiw.omnichurch`):
 * - targetId (1..128)
 * - churchId (1..128)
 * - userId (1..128)
 * - userName (1..120)
 * - userPhotoUrl (optional string)
 * - content (1..1000)
 * - createdAt (Timestamp | string | number)
 */
export function buildAnnouncementCommentFirestorePayload(
  comment: Partial<AnnouncementComment> & { userPhotoUrl?: string | null },
  customCreatedAt?: any
): Record<string, any> | null {
  const targetId = (comment.targetId || comment.announcementId || '').trim().slice(0, 128);
  const churchId = (comment.churchId || '').trim().slice(0, 128);
  if (!targetId || !churchId) return null;

  const userId = (
    comment.userId ||
    comment.memberId ||
    comment.authorMemberId ||
    auth.currentUser?.uid ||
    comment.author ||
    'member'
  )
    .trim()
    .slice(0, 128);
  const userName = (comment.userName || comment.author || 'Manm').trim().slice(0, 120);
  const content = (comment.content || comment.text || '').trim().slice(0, 1000);
  if (!content) return null;

  const payload: Record<string, any> = {
    targetId,
    churchId,
    userId,
    userName,
    content,
    createdAt: customCreatedAt !== undefined ? customCreatedAt : serverTimestamp(),
  };

  if (typeof comment.userPhotoUrl === 'string' && comment.userPhotoUrl.trim()) {
    payload.userPhotoUrl = comment.userPhotoUrl.trim();
  }

  return payload;
}

/**
 * Builds the strict `announcement_comments` update payload containing ONLY `content`
 * to satisfy `incoming().diff(existing()).affectedKeys().hasOnly(['content'])` in `firestore.rules`.
 */
export function buildCommentRedactionUpdatePayload(
  newContent: string = '[Kòmantè modere pa Administrasyon an]'
): { content: string } {
  const clean = (newContent || '[Kòmantè modere pa Administrasyon an]').trim().slice(0, 1000);
  return {
    content: clean || '[Kòmantè modere pa Administrasyon an]',
  };
}

export async function firestoreAddAnnouncementComment(
  comment: AnnouncementComment & { userPhotoUrl?: string | null }
): Promise<void> {
  const payload = buildAnnouncementCommentFirestorePayload(comment);
  if (!payload || !comment.id) return;

  const ref = doc(db, ANNOUNCEMENT_COMMENTS_COL, comment.id);
  await setDoc(ref, sanitizeForFirestore(payload));

  try {
    const annRef = doc(db, ANNOUNCEMENTS_COL, payload.targetId);
    await updateDoc(annRef, {
      commentsCount: increment(1),
      updatedAt: serverTimestamp(),
    });
  } catch {}
}

/**
 * Updates/Redacts a comment in `announcement_comments/{commentId}` by updating ONLY the `content` field,
 * strictly compliant with `incoming().diff(existing()).affectedKeys().hasOnly(['content'])`.
 */
export async function firestoreRedactOrUpdateAnnouncementComment(
  commentId: string,
  newContent: string = '[Kòmantè modere pa Administrasyon an]'
): Promise<boolean> {
  const cleanId = (commentId || '').trim();
  if (!cleanId) return false;
  try {
    const ref = doc(db, ANNOUNCEMENT_COMMENTS_COL, cleanId);
    const updatePayload = buildCommentRedactionUpdatePayload(newContent);
    await updateDoc(ref, updatePayload);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${ANNOUNCEMENT_COMMENTS_COL}/${cleanId}`);
    return false;
  }
}

export async function firestoreDeleteAnnouncementComment(
  commentId: string,
  targetAnnouncementId?: string
): Promise<void> {
  const cleanId = (commentId || '').trim();
  if (!cleanId) return;
  const ref = doc(db, ANNOUNCEMENT_COMMENTS_COL, cleanId);
  let resolvedTargetId = targetAnnouncementId;
  if (!resolvedTargetId) {
    try {
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const d = snap.data() as any;
        resolvedTargetId = d.targetId || d.announcementId;
      }
    } catch {}
  }
  await deleteDoc(ref);
  if (resolvedTargetId) {
    try {
      const annRef = doc(db, ANNOUNCEMENTS_COL, resolvedTargetId);
      const annSnap = await getDoc(annRef);
      if (annSnap.exists()) {
        const currentCount = typeof annSnap.data().commentsCount === 'number' ? annSnap.data().commentsCount : 1;
        await updateDoc(annRef, {
          commentsCount: Math.max(0, currentCount - 1),
          updatedAt: serverTimestamp(),
        });
      }
    } catch {}
  }
}

export async function firestoreBulkDeleteAnnouncementComments(
  commentIds: string[]
): Promise<number> {
  if (!Array.isArray(commentIds) || commentIds.length === 0) return 0;
  let deleted = 0;
  for (const rawId of commentIds) {
    const cleanId = (rawId || '').trim();
    if (!cleanId) continue;
    try {
      await firestoreDeleteAnnouncementComment(cleanId);
      deleted++;
    } catch (err) {
      console.warn(`Failed to delete comment ${cleanId}:`, err);
    }
  }
  return deleted;
}

export async function firestoreSetAnnouncementReaction(
  targetId: string,
  userId: string,
  churchId: string,
  reactionType: string,
  userName?: string
): Promise<void> {
  const cleanTargetId = (targetId || '').trim();
  const cleanUserId = (userId || 'guest_member').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  if (!cleanTargetId || !churchId) return;

  const reactionId = `${cleanTargetId}_${cleanUserId}`;
  const ref = doc(db, ANNOUNCEMENT_REACTIONS_COL, reactionId);

  let existedBefore = false;
  try {
    const existingSnap = await getDoc(ref);
    existedBefore = existingSnap.exists();
  } catch {}

  const normalizedType = normalizeReactionType(reactionType);
  const payload = {
    targetId: cleanTargetId,
    churchId: churchId.trim(),
    userId: cleanUserId,
    userName: (userName || userId || 'Manm').trim().slice(0, 150),
    reactionType: normalizedType,
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, sanitizeForFirestore(payload));

  if (!existedBefore) {
    try {
      const annRef = doc(db, ANNOUNCEMENTS_COL, cleanTargetId);
      await updateDoc(annRef, {
        reactionsCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    } catch {}
  }
}

export async function firestoreRemoveAnnouncementReaction(
  targetId: string,
  userId: string
): Promise<void> {
  const cleanTargetId = (targetId || '').trim();
  const cleanUserId = (userId || 'guest_member').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  if (!cleanTargetId) return;

  const reactionId = `${cleanTargetId}_${cleanUserId}`;
  const ref = doc(db, ANNOUNCEMENT_REACTIONS_COL, reactionId);

  let existedBefore = false;
  try {
    const existingSnap = await getDoc(ref);
    existedBefore = existingSnap.exists();
  } catch {}

  await deleteDoc(ref);

  if (existedBefore) {
    try {
      const annRef = doc(db, ANNOUNCEMENTS_COL, cleanTargetId);
      const annSnap = await getDoc(annRef);
      if (annSnap.exists()) {
        const currentCount = typeof annSnap.data().reactionsCount === 'number' ? annSnap.data().reactionsCount : 1;
        await updateDoc(annRef, {
          reactionsCount: Math.max(0, currentCount - 1),
          updatedAt: serverTimestamp(),
        });
      }
    } catch {}
  }
}

export async function firestoreAddAttendance(record: AttendanceRecord): Promise<void> {
  const cleanId = typeof record?.id === 'string' ? record.id.trim() : '';
  if (!cleanId) return;
  try {
    const ref = doc(db, ATTENDANCE_COL, cleanId);
    await setDoc(ref, sanitizeForFirestore({ ...record, id: cleanId }));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${ATTENDANCE_COL}/${cleanId}`);
  }
}

export async function firestoreCheckDuplicateAttendance(
  churchId: string,
  serviceId: string,
  memberId: string,
  memberDbId?: string
): Promise<AttendanceRecord | null> {
  try {
    const q = query(
      collection(db, ATTENDANCE_COL),
      where('churchId', '==', churchId),
      where('serviceId', '==', serviceId)
    );
    const snap = await getDocs(q);
    const cleanMemberCode = (memberId || '').trim().toUpperCase();
    for (const d of snap.docs) {
      const rec = d.data() as AttendanceRecord;
      if (!rec) continue;
      const recCode = (rec.memberId || '').trim().toUpperCase();
      if (
        (cleanMemberCode && recCode === cleanMemberCode) ||
        (memberDbId && rec.memberDbId === memberDbId)
      ) {
        return rec;
      }
    }
  } catch (err) {
    console.warn('firestoreCheckDuplicateAttendance fallback:', err);
  }
  return null;
}

export async function firestoreGetChurchAttendanceRecords(
  churchId: string
): Promise<AttendanceRecord[]> {
  try {
    const q = query(collection(db, ATTENDANCE_COL), where('churchId', '==', churchId));
    const snap = await getDocs(q);
    const list: AttendanceRecord[] = [];
    snap.forEach((d) => {
      const rec = d.data() as AttendanceRecord;
      if (rec && !isLegacyDemoAttendance(rec)) {
        list.push(rec);
      }
    });
    return list;
  } catch (err) {
    console.warn('firestoreGetChurchAttendanceRecords fallback:', err);
    return [];
  }
}

export async function firestoreDeleteAttendance(recordId: string): Promise<void> {
  try {
    const ref = doc(db, ATTENDANCE_COL, recordId);
    await deleteDoc(ref);
  } catch (err) {
    console.warn('Firestore deleteAttendance error:', err);
  }
}

export async function firestoreBatchDeleteAttendance(recordIds: string[]): Promise<number> {
  if (!recordIds || recordIds.length === 0) return 0;
  let count = 0;
  try {
    for (let i = 0; i < recordIds.length; i += 400) {
      const batch = writeBatch(db);
      const chunk = recordIds.slice(i, i + 400);
      chunk.forEach((id) => {
        batch.delete(doc(db, ATTENDANCE_COL, id));
      });
      await batch.commit();
      count += chunk.length;
    }
  } catch (err) {
    console.warn('Firestore batchDeleteAttendance error:', err);
  }
  return count;
}

export async function firestoreDeleteChurch(churchId: string): Promise<void> {
  try {
    verifiedExistingChurchIds.delete(churchId);
    const churchRef = doc(db, CHURCHES_COL, churchId);
    await deleteDoc(churchRef);

    const tenantCollections = [
      MEMBERS_COL,
      SERVICES_COL,
      ANNOUNCEMENTS_COL,
      ATTENDANCE_COL,
      ANNOUNCEMENT_COMMENTS_COL,
      ANNOUNCEMENT_REACTIONS_COL,
      NOTIFICATIONS_COL,
    ];
    for (const colName of tenantCollections) {
      try {
        const snap = await getDocs(
          query(collection(db, colName), where('churchId', '==', churchId))
        );
        if (!snap.empty) {
          await commitDeleteDocRefsInChunks(snap.docs.map((d) => d.ref));
        }
      } catch (colErr) {
        console.warn(`Warning cleaning collection ${colName} for church ${churchId}:`, colErr);
      }
    }

    console.log(`Successfully deleted church ${churchId} and all associated records from Firestore.`);
  } catch (err) {
    console.error(`Error deleting church ${churchId} from Firestore:`, err);
    throw err;
  }
}

export async function firestoreResetAllDatabase(): Promise<void> {
  try {
    const collectionsToClear = [
      CHURCHES_COL,
      MEMBERS_COL,
      SERVICES_COL,
      ANNOUNCEMENTS_COL,
      ATTENDANCE_COL,
      ANNOUNCEMENT_COMMENTS_COL,
      ANNOUNCEMENT_REACTIONS_COL,
      NOTIFICATIONS_COL,
    ];
    for (const colName of collectionsToClear) {
      const snap = await getDocs(collection(db, colName));
      if (!snap.empty) {
        await commitDeleteDocRefsInChunks(snap.docs.map((d) => d.ref));
      }
    }
    console.log('Successfully performed full System Reset in Cloud Firestore.');
  } catch (err) {
    console.error('Error in firestoreResetAllDatabase:', err);
    throw err;
  }
}

export async function firestorePurgeTestChurches(): Promise<number> {
  try {
    const snap = await getDocs(collection(db, CHURCHES_COL));
    let deletedCount = 0;
    for (const docSnap of snap.docs) {
      const c = withDocId<Church>(docSnap);
      const id = (c.id || '').trim().toLowerCase();
      // NEVER delete production church CH001
      if (id === 'ch001') continue;
      const name = (c.name || '').toLowerCase();
      const code = (c.code || '').toLowerCase();
      const isTestOrDemo =
        isAccidentalTestChurch(c) ||
        name.includes('tabernacle de l’espoir') ||
        name.includes("tabernacle de l'espoir") ||
        name.includes('eglise de la grâce') ||
        name.includes('eglise de la grace') ||
        name.includes('temple shalom') ||
        name.includes('demo') ||
        name.includes('test') ||
        code === 'demo' ||
        code === 'test';
      if (isTestOrDemo && c.id) {
        await firestoreDeleteChurch(c.id);
        deletedCount++;
      }
    }
    return deletedCount;
  } catch (err) {
    console.error('Error in firestorePurgeTestChurches:', err);
    return 0;
  }
}

let accidentalTestPurgeRan = false;
/**
 * Automatically deletes the accidental unclaimed test churches (`CH002-MIG9`, `CH003-DUP`)
 * from live Firestore when the verified Super Developer signs in.
 */
export async function firestoreAutoPurgeAccidentalTestChurches(): Promise<number> {
  if (isUnitTestRuntime() || accidentalTestPurgeRan) return 0;
  const user = auth.currentUser;
  if (!user || !user.emailVerified || !isSuperDeveloperEmail(user.email)) {
    return 0;
  }
  accidentalTestPurgeRan = true;
  let purged = 0;
  for (const testId of Array.from(ACCIDENTAL_TEST_CHURCH_IDS)) {
    try {
      const ref = doc(db, CHURCHES_COL, testId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = withDocId<Church>(snap);
        if (isAccidentalTestChurch(data)) {
          await firestoreDeleteChurch(testId);
          purged++;
        }
      }
    } catch {
      // Non-fatal cleanup retry on next session if offline
      accidentalTestPurgeRan = false;
    }
  }
  return purged;
}

export async function firestoreGetChurch(
  churchId: string,
  options?: { fromServer?: boolean }
): Promise<Church | null> {
  const cleanId = (churchId || '').trim();
  if (!cleanId) return null;
  try {
    const churchRef = doc(db, CHURCHES_COL, cleanId);
    let snap;
    if (options?.fromServer) {
      try {
        snap = await getDocFromServer(churchRef);
      } catch {
        snap = await getDoc(churchRef);
      }
    } else {
      snap = await getDoc(churchRef);
    }
    if (snap.exists()) {
      const found = withDocId<Church>(snap);
      if (isAccidentalTestChurch(found)) return null;
      return found;
    }
  } catch (err) {
    console.warn('firestoreGetChurch failed:', err);
  }
  return null;
}

export async function firestoreGetChurchByIdOrCode(
  churchIdOrCode: string,
  options?: { fromServer?: boolean }
): Promise<Church | null> {
  const clean = (churchIdOrCode || '').trim();
  if (!clean) return null;
  const direct = await firestoreGetChurch(clean, options);
  if (direct) return direct;
  try {
    const upper = clean.toUpperCase();
    const upperDirect = upper !== clean ? await firestoreGetChurch(upper, options) : null;
    if (upperDirect) return upperDirect;

    const byCodeUpper = await getDocs(
      query(collection(db, CHURCHES_COL), where('code', '==', upper), limit(3))
    );
    if (!byCodeUpper.empty) {
      return withDocId<Church>(byCodeUpper.docs[0]);
    }

    if (upper !== clean) {
      const byCodeExact = await getDocs(
        query(collection(db, CHURCHES_COL), where('code', '==', clean), limit(3))
      );
      if (!byCodeExact.empty) {
        return withDocId<Church>(byCodeExact.docs[0]);
      }
    }
  } catch (err) {
    console.warn('firestoreGetChurchByIdOrCode fallback:', err);
  }
  return null;
}

export async function firestoreGetMember(
  memberIdOrToken: string,
  churchId?: string,
  options?: { fromServer?: boolean }
): Promise<Member | null> {
  const clean = (memberIdOrToken || '').replace(/[\u0000-\u001F\u007F]+/g, '').trim();
  if (!clean) return null;
  const pipeMemberMatch = clean.match(/MEMBER:\s*([^|;\s]+)/i);
  const extractedMember = pipeMemberMatch?.[1]?.trim() || '';
  const cleanUpper = clean.toUpperCase();
  const extractedUpper = extractedMember.toUpperCase();
  const candidates = Array.from(
    new Set(
      [
        clean,
        cleanUpper,
        extractedMember,
        extractedUpper,
        ...(churchId
          ? [
              `CHURCH:${churchId.trim()}|MEMBER:${extractedUpper || cleanUpper}`,
            ]
          : []),
      ].filter(Boolean)
    )
  );
  const isDeletedMember = (data: Member) =>
    Boolean((data as any)?.isDeleted === true || (data as any)?.deleted === true);
  const matchesTargetChurch = (data: Member) =>
    !churchId || (data.churchId || '').trim().toUpperCase() === churchId.trim().toUpperCase();

  try {
    if (!clean.includes('/')) {
      const memberRef = doc(db, MEMBERS_COL, clean);
      let snap;
      if (options?.fromServer) {
        try {
          snap = await getDocFromServer(memberRef);
        } catch {
          snap = await getDoc(memberRef);
        }
      } else {
        snap = await getDoc(memberRef);
      }
      if (snap.exists()) {
        const data = withDocId<Member>(snap);
        if (!isDeletedMember(data) && matchesTargetChurch(data)) {
          return data;
        }
      }
    }
    for (const candidate of candidates) {
      const q1 = query(collection(db, MEMBERS_COL), where('memberId', '==', candidate), limit(25));
      const snapQ1 = await getDocs(q1);
      for (const d of snapQ1.docs) {
        const data = withDocId<Member>(d);
        if (!isDeletedMember(data) && matchesTargetChurch(data)) {
          return data;
        }
      }
    }
    for (const candidate of candidates) {
      const q2 = query(collection(db, MEMBERS_COL), where('barcodeToken', '==', candidate), limit(25));
      const snapQ2 = await getDocs(q2);
      for (const d of snapQ2.docs) {
        const data = withDocId<Member>(d);
        if (!isDeletedMember(data) && matchesTargetChurch(data)) {
          return data;
        }
      }
    }
    for (const candidate of candidates) {
      const q3 = query(collection(db, MEMBERS_COL), where('userId', '==', candidate), limit(15));
      const snapQ3 = await getDocs(q3);
      for (const d of snapQ3.docs) {
        const data = withDocId<Member>(d);
        if (!isDeletedMember(data) && matchesTargetChurch(data)) {
          return data;
        }
      }
    }
  } catch (err) {
    console.warn('firestoreGetMember failed:', err);
  }
  return null;
}

export async function firestoreGetChurchMembersList(churchId: string): Promise<Member[]> {
  const cleanId = (churchId || '').trim();
  if (!cleanId) return [];
  try {
    const snap = await getDocs(query(collection(db, MEMBERS_COL), where('churchId', '==', cleanId)));
    const list: Member[] = [];
    snap.forEach((d) => {
      const m = withDocId<Member>(d);
      if (m && !isLegacyDemoMember(m)) {
        list.push(m);
      }
    });
    return list;
  } catch (err) {
    console.warn('firestoreGetChurchMembersList failed:', err);
    return [];
  }
}

/**
 * Read-only cross-church member lookup for Visitor check-in and public Authority Verification.
 * Checks preferred home church first, then falls back to exact memberId / barcodeToken / docId / userId match.
 */
export async function firestoreGetMemberByScanToken(
  memberIdOrToken: string,
  preferredHomeChurchId?: string
): Promise<Member | null> {
  const isDeleted = (m: Member) =>
    Boolean((m as any)?.isDeleted === true || (m as any)?.deleted === true);
  if (preferredHomeChurchId) {
    const scoped = await firestoreGetMember(memberIdOrToken, preferredHomeChurchId);
    if (scoped && !isLegacyDemoMember(scoped) && !isDeleted(scoped)) return scoped;
  }
  const unscoped = await firestoreGetMember(memberIdOrToken);
  if (unscoped && !isLegacyDemoMember(unscoped) && !isDeleted(unscoped)) return unscoped;
  return null;
}

/**
 * On-demand single-member lookup by Member ID, phone, or email (zero full-collection download).
 * Uses single-field equality queries so no custom composite indexes are required.
 */
export async function firestoreFindMemberByCredential(
  churchId: string,
  idOrPhoneOrEmail: string
): Promise<Member | null> {
  const raw = (idOrPhoneOrEmail || '').trim();
  if (!raw) return null;
  const cleanUpper = raw.toUpperCase();
  const cleanLower = raw.toLowerCase();
  const matchesChurch = (m: Member) =>
    !churchId || (m.churchId || '').toUpperCase() === churchId.trim().toUpperCase();

  try {
    const byId = await firestoreGetMember(cleanUpper, churchId);
    if (byId) return byId;

    const byRawDoc = await firestoreGetMember(raw, churchId);
    if (byRawDoc) return byRawDoc;

    const phoneSnap = await getDocs(
      query(collection(db, MEMBERS_COL), where('phone', '==', raw), limit(10))
    );
    for (const d of phoneSnap.docs) {
      const m = d.data() as Member;
      if (m && matchesChurch(m) && !isLegacyDemoMember(m)) return m;
    }

    if (raw.includes('@')) {
      const emailSnap = await getDocs(
        query(collection(db, MEMBERS_COL), where('email', '==', cleanLower), limit(10))
      );
      for (const d of emailSnap.docs) {
        const m = d.data() as Member;
        if (m && matchesChurch(m) && !isLegacyDemoMember(m)) return m;
      }
    }
  } catch (err) {
    console.warn('firestoreFindMemberByCredential fallback:', err);
  }
  return null;
}

/**
 * On-demand member lookup by Google Email without loading all church members.
 */
export async function firestoreFindMemberByGoogleEmail(
  email: string,
  churchId?: string
): Promise<Member | null> {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) return null;
  const matchesChurch = (m: Member) =>
    !churchId || (m.churchId || '').toUpperCase() === churchId.trim().toUpperCase();

  try {
    const gSnap = await getDocs(
      query(collection(db, MEMBERS_COL), where('googleEmail', '==', cleanEmail), limit(10))
    );
    for (const d of gSnap.docs) {
      const m = d.data() as Member;
      if (m && matchesChurch(m) && !isLegacyDemoMember(m)) return m;
    }
    // Second pass across any church if churchId didn't match
    if (churchId && !gSnap.empty) {
      for (const d of gSnap.docs) {
        const m = d.data() as Member;
        if (m && !isLegacyDemoMember(m)) return m;
      }
    }

    const eSnap = await getDocs(
      query(collection(db, MEMBERS_COL), where('email', '==', cleanEmail), limit(10))
    );
    for (const d of eSnap.docs) {
      const m = d.data() as Member;
      if (m && matchesChurch(m) && !isLegacyDemoMember(m)) return m;
    }
    if (churchId && !eSnap.empty) {
      for (const d of eSnap.docs) {
        const m = d.data() as Member;
        if (m && !isLegacyDemoMember(m)) return m;
      }
    }
  } catch (err) {
    console.warn('firestoreFindMemberByGoogleEmail fallback:', err);
  }
  return null;
}

export async function firestoreGetChurchById(churchId: string): Promise<Church | null> {
  if (!churchId || !churchId.trim()) return null;
  try {
    const snap = await getDoc(doc(db, CHURCHES_COL, churchId.trim()));
    if (!snap.exists()) return null;
    return snap.data() as Church;
  } catch (err) {
    console.warn('firestoreGetChurchById note:', err);
    return null;
  }
}

export interface DatasetReconcileResult {
  uploadedMembers: number;
  uploadedServices: number;
  uploadedAnnouncements: number;
  uploadedAttendances: number;
  remoteMembersToMerge: Member[];
  remoteServicesToMerge: ServiceSession[];
  remoteAnnouncementsToMerge: Announcement[];
  remoteAttendancesToMerge: AttendanceRecord[];
}

/**
 * Safely reconciles local and Firestore church datasets without overwriting or deleting existing records on either side.
 * Only uploads local records missing from Firestore, and returns Firestore records missing from local storage.
 */
export async function firestoreReconcileChurchDataset(params: {
  churchId: string;
  localMembers: Member[];
  localServices: ServiceSession[];
  localAnnouncements: Announcement[];
  localAttendances: AttendanceRecord[];
}): Promise<DatasetReconcileResult> {
  const { churchId, localMembers, localServices, localAnnouncements, localAttendances } = params;
  const result: DatasetReconcileResult = {
    uploadedMembers: 0,
    uploadedServices: 0,
    uploadedAnnouncements: 0,
    uploadedAttendances: 0,
    remoteMembersToMerge: [],
    remoteServicesToMerge: [],
    remoteAnnouncementsToMerge: [],
    remoteAttendancesToMerge: [],
  };

  if (!churchId) return result;

  // Helper to commit missing docs in chunks of 350 using schema-compliant builders
  const commitMissing = async (colName: string, items: any[]) => {
    if (!items.length) return 0;
    let count = 0;
    const CHUNK = 350;
    for (let i = 0; i < items.length; i += CHUNK) {
      const slice = items.slice(i, i + CHUNK);
      const batch = writeBatch(db);
      for (const item of slice) {
        if (!item?.id) continue;
        let payload: Record<string, any>;
        if (colName === MEMBERS_COL) {
          payload = buildMemberFirestorePayload(item, String(item.id), churchId);
        } else if (colName === ANNOUNCEMENTS_COL) {
          payload = sanitizeForFirestore(
            buildAnnouncementFirestorePayload({ ...item, churchId }, { isCreate: true })
          );
        } else if (colName === SERVICES_COL) {
          const rawSrv = sanitizeForFirestore({ ...item, churchId }) as Record<string, any>;
          payload = {};
          for (const [k, v] of Object.entries(rawSrv)) {
            if (ALLOWED_SERVICE_KEYS.has(k) && v !== undefined) {
              payload[k] = v;
            }
          }
        } else {
          payload = sanitizeForFirestore(item);
        }
        batch.set(doc(db, colName, item.id), payload, { merge: true });
        count++;
      }
      await batch.commit();
    }
    return count;
  };

  // 1. Members
  const remoteMembersMap = new Map<string, Member>();
  try {
    const mSnap = await getDocs(query(collection(db, MEMBERS_COL), where('churchId', '==', churchId)));
    mSnap.forEach((d) => {
      const m = d.data() as Member;
      if (m && m.id && !isLegacyDemoMember(m)) {
        remoteMembersMap.set(m.id, m);
      }
    });
    const localMemberIds = new Set(localMembers.map((m) => m.id));
    const missingRemoteMembers = localMembers.filter(
      (m) => m?.id && !isLegacyDemoMember(m) && !remoteMembersMap.has(m.id)
    );
    result.uploadedMembers = await commitMissing(MEMBERS_COL, missingRemoteMembers);
    remoteMembersMap.forEach((rm) => {
      if (!localMemberIds.has(rm.id)) result.remoteMembersToMerge.push(rm);
    });
  } catch (err) {
    console.warn('firestoreReconcileChurchDataset members note:', err);
  }

  // 2. Services (uploaded before attendances so Firestore rules validate serviceId parent existence)
  const knownServiceIds = new Set<string>();
  try {
    const sSnap = await getDocs(query(collection(db, SERVICES_COL), where('churchId', '==', churchId)));
    const remoteServicesMap = new Map<string, ServiceSession>();
    sSnap.forEach((d) => {
      const s = d.data() as ServiceSession;
      if (s && s.id && !isLegacyDemoService(s)) {
        remoteServicesMap.set(s.id, s);
        knownServiceIds.add(s.id);
      }
    });
    const localServiceIds = new Set(localServices.map((s) => s.id));
    const missingRemoteServices = localServices.filter(
      (s) => s?.id && !isLegacyDemoService(s) && !remoteServicesMap.has(s.id)
    );
    result.uploadedServices = await commitMissing(SERVICES_COL, missingRemoteServices);
    missingRemoteServices.forEach((s) => knownServiceIds.add(s.id));
    remoteServicesMap.forEach((rs) => {
      if (!localServiceIds.has(rs.id)) result.remoteServicesToMerge.push(rs);
    });
  } catch (err) {
    console.warn('firestoreReconcileChurchDataset services note:', err);
  }

  // 3. Announcements
  try {
    const aSnap = await getDocs(query(collection(db, ANNOUNCEMENTS_COL), where('churchId', '==', churchId)));
    const remoteAnnMap = new Map<string, Announcement>();
    aSnap.forEach((d) => {
      const a = d.data() as Announcement;
      if (a && a.id && !isLegacyDemoAnnouncement(a)) {
        remoteAnnMap.set(a.id, a);
      }
    });
    const localAnnIds = new Set(localAnnouncements.map((a) => a.id));
    const missingRemoteAnnouncements = localAnnouncements.filter(
      (a) => a?.id && !isLegacyDemoAnnouncement(a) && !remoteAnnMap.has(a.id)
    );
    result.uploadedAnnouncements = await commitMissing(ANNOUNCEMENTS_COL, missingRemoteAnnouncements);
    remoteAnnMap.forEach((ra) => {
      if (!localAnnIds.has(ra.id)) result.remoteAnnouncementsToMerge.push(ra);
    });
  } catch (err) {
    console.warn('firestoreReconcileChurchDataset announcements note:', err);
  }

  // 4. Attendances (append missing local attendances whose serviceId exists in Firestore)
  try {
    const attSnap = await getDocs(query(collection(db, ATTENDANCE_COL), where('churchId', '==', churchId)));
    const remoteAttMap = new Map<string, AttendanceRecord>();
    attSnap.forEach((d) => {
      const att = d.data() as AttendanceRecord;
      if (att && att.id && !isLegacyDemoAttendance(att)) {
        remoteAttMap.set(att.id, att);
      }
    });
    const localAttIds = new Set(localAttendances.map((att) => att.id));
    const missingRemoteAtt = localAttendances.filter(
      (att) =>
        att?.id &&
        !isLegacyDemoAttendance(att) &&
        !remoteAttMap.has(att.id) &&
        att.serviceId &&
        knownServiceIds.has(att.serviceId)
    );
    result.uploadedAttendances = await commitMissing(ATTENDANCE_COL, missingRemoteAtt);
    remoteAttMap.forEach((ratt) => {
      if (!localAttIds.has(ratt.id)) result.remoteAttendancesToMerge.push(ratt);
    });
  } catch (err) {
    console.warn('firestoreReconcileChurchDataset attendances note:', err);
  }

  return result;
}

// Compatibility aliases
export const listenToChurchChanges = subscribeToChurches;
export const listenToChurchMembers = subscribeToMembers;
export const listenToChurchServices = subscribeToServices;
export const listenToChurchAttendance = subscribeToAttendance;
export const listenToChurchAnnouncements = subscribeToAnnouncements;
