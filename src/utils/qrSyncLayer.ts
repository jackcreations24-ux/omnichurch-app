import {
  AttendanceRecord,
  Church,
  Member,
  ServiceSession,
} from '../types';
import {
  STORAGE_KEYS,
  ScanResult,
  addPendingOfflineAttendance,
  getChurchById,
  getChurchByIdOrCode,
  getMembersByChurch,
  getPendingOfflineAttendance,
  getServicesByChurch,
  isDeviceOnline,
  isMemberMarkedDeleted,
  isServiceEnded,
  formatLocalDateYmd,
  loadFromStorage,
  parseScanToken,
  playDuplicateWarningBeep,
  playErrorBeep,
  playSuccessBeep,
  PRODUCTION_VERIFICATION_ORIGIN,
  resolvePublicVerificationOrigin,
  saveToStorage,
  syncPendingOfflineAttendance,
} from './storage';
import { isServiceCurrentlyActive, isServiceBeforeStart, isVisitorMember } from './permissions';
import { formatServiceTimeAmPm } from './memberFeedUtils';
import { enqueueAttendance, getQueuedItems, triggerOfflineSync } from './offlineQueue';
import {
  firestoreAddAttendance,
  firestoreCheckDuplicateAttendance,
  firestoreGetChurch,
  firestoreGetChurchByIdOrCode,
  firestoreGetMember,
  firestoreGetMemberByScanToken,
  isLegacyDemoMember,
} from '../services/firestoreService';

export { PRODUCTION_VERIFICATION_ORIGIN };
export const CANONICAL_QR_VERIFICATION_ORIGIN = PRODUCTION_VERIFICATION_ORIGIN;

export interface ParsedCanonicalQrToken {
  churchId?: string;
  memberId?: string;
  rawToken: string;
  format: 'url' | 'pipe_token' | 'prefix_id' | 'raw_id';
}

/**
 * Generates the exact canonical barcode token used across Web, Desktop, and Android:
 * CHURCH:{churchId}|MEMBER:{memberId}
 */
export function buildCanonicalBarcodeToken(churchId: string, memberId: string): string {
  const cleanChurchId = (churchId || '').trim();
  const cleanMemberId = (memberId || '').trim().toUpperCase();
  if (!cleanChurchId || !cleanMemberId) return cleanMemberId;
  return `CHURCH:${cleanChurchId}|MEMBER:${cleanMemberId}`;
}

/**
 * Generates the exact canonical verification QR URL encoded in physical/digital member cards:
 * https://<production-origin>/?verify=1&church={churchId}&member={memberId}
 */
export function buildCanonicalQrPayload(
  churchId: string,
  memberId: string,
  customOrigin?: string
): string {
  const cleanChurchId = (churchId || '').trim();
  const cleanMemberId = (memberId || '').trim();
  if (!cleanMemberId) return '';
  const origin = (customOrigin || resolvePublicVerificationOrigin()).replace(/\/$/, '');
  return `${origin}/?verify=1&church=${encodeURIComponent(cleanChurchId)}&member=${encodeURIComponent(cleanMemberId)}`;
}

/**
 * Parses any OmniChurch QR payload (verification URL, canonical pipe token, church-prefixed ID, or raw ID).
 */
export function parseCanonicalQrToken(rawText: string): ParsedCanonicalQrToken {
  const rawToken = (rawText || '').replace(/[\u0000-\u001F\u007F]+/g, '').trim();
  const baseParsed = parseScanToken(rawToken);

  let format: ParsedCanonicalQrToken['format'] = 'raw_id';
  if (
    rawToken.includes('verify') ||
    rawToken.startsWith('http://') ||
    rawToken.startsWith('https://') ||
    rawToken.startsWith('?') ||
    (rawToken.startsWith('{') && rawToken.endsWith('}'))
  ) {
    format = 'url';
  } else if (/CHURCH:/i.test(rawToken) && /MEMBER:/i.test(rawToken)) {
    format = 'pipe_token';
  } else if (baseParsed.churchId) {
    format = 'prefix_id';
  }

  return {
    churchId: baseParsed.churchId,
    memberId: baseParsed.memberId,
    rawToken,
    format,
  };
}

/**
 * Ensures a member document conforms to the canonical barcodeToken format generated in the Web dashboard.
 */
export function normalizeMemberCanonicalTokens(member: Member, canonicalChurchId?: string): Member {
  const targetChurchId = (canonicalChurchId || member.churchId || '').trim();
  const canonicalToken =
    member.barcodeToken && member.barcodeToken.includes('CHURCH:') && member.barcodeToken.includes('MEMBER:')
      ? member.barcodeToken.trim()
      : buildCanonicalBarcodeToken(targetChurchId, member.memberId);

  return {
    ...member,
    churchId: targetChurchId || member.churchId,
    barcodeToken: canonicalToken,
  };
}

function cacheMemberLocally(member: Member): void {
  if (!member || !member.id || isLegacyDemoMember(member) || isMemberMarkedDeleted(member)) return;
  try {
    const allMembers = loadFromStorage<Member[]>(STORAGE_KEYS.MEMBERS, []) || [];
    const idx = allMembers.findIndex(
      (m) =>
        m.id === member.id ||
        (m.churchId === member.churchId &&
          m.memberId.toUpperCase() === (member.memberId || '').toUpperCase())
    );
    if (idx >= 0) {
      allMembers[idx] = { ...allMembers[idx], ...member };
    } else {
      allMembers.push(member);
    }
    saveToStorage(STORAGE_KEYS.MEMBERS, allMembers);
  } catch (err) {
    console.warn('Could not cache resolved Firestore member locally:', err);
  }
}

/**
 * Resolves a scanned member code or QR payload against local cache AND directly against the
 * master Firestore `members` collection when online so Web & Android stay strictly synchronized.
 */
export async function resolveMemberUnified(params: {
  canonicalChurchId: string;
  churchCode?: string;
  rawCode: string;
  memberCode: string;
}): Promise<{ member: Member | null; verifiedInFirestore: boolean }> {
  const { canonicalChurchId, churchCode, rawCode, memberCode } = params;
  const cleanRaw = (rawCode || '').trim();
  const cleanCode = (memberCode || cleanRaw).trim();
  const cleanCodeUpper = cleanCode.toUpperCase();
  const cleanRawUpper = cleanRaw.toUpperCase();
  const expectedCanonicalToken = buildCanonicalBarcodeToken(canonicalChurchId, cleanCode).toUpperCase();

  // 1. Check master Firestore `members` collection first when online to prevent stale IDs or missing Web members
  if (isDeviceOnline()) {
    try {
      const candidates = Array.from(
        new Set(
          [
            cleanCode,
            cleanRaw,
            buildCanonicalBarcodeToken(canonicalChurchId, cleanCode),
            ...(churchCode ? [buildCanonicalBarcodeToken(churchCode, cleanCode)] : []),
          ].filter(Boolean)
        )
      );

      for (const candidate of candidates) {
        const remote = await firestoreGetMember(candidate, canonicalChurchId);
        if (remote && !isLegacyDemoMember(remote) && !isMemberMarkedDeleted(remote)) {
          const normalized = normalizeMemberCanonicalTokens(remote, canonicalChurchId);
          cacheMemberLocally(normalized);
          return { member: normalized, verifiedInFirestore: true };
        }
      }

      if (churchCode && churchCode.toUpperCase() !== canonicalChurchId.toUpperCase()) {
        for (const candidate of candidates) {
          const remoteByCode = await firestoreGetMember(candidate, churchCode);
          if (remoteByCode && !isLegacyDemoMember(remoteByCode) && !isMemberMarkedDeleted(remoteByCode)) {
            const normalized = normalizeMemberCanonicalTokens(remoteByCode, canonicalChurchId);
            cacheMemberLocally(normalized);
            return { member: normalized, verifiedInFirestore: true };
          }
        }
      }
    } catch (err) {
      console.warn('Master Firestore member validation skipped, falling back to local cache:', err);
    }
  }

  // 2. Local cache fallback (supports offline scanning & quick manual name search)
  const localMembers = getMembersByChurch(canonicalChurchId);
  const localMatch =
    localMembers.find((m) => {
      const mId = (m.memberId || '').trim().toUpperCase();
      const mToken = (m.barcodeToken || '').trim().toUpperCase();
      const mGeneratedToken = buildCanonicalBarcodeToken(canonicalChurchId, m.memberId).toUpperCase();
      return (
        mId === cleanCodeUpper ||
        mToken === cleanRawUpper ||
        mToken === expectedCanonicalToken ||
        mGeneratedToken === cleanRawUpper ||
        m.id === cleanRaw
      );
    }) ||
    localMembers.find(
      (m) => (m.fullName || '').trim().toLowerCase() === cleanCode.toLowerCase()
    );

  if (localMatch) {
    return {
      member: normalizeMemberCanonicalTokens(localMatch, canonicalChurchId),
      verifiedInFirestore: false,
    };
  }

  return { member: null, verifiedInFirestore: false };
}

/**
 * Strictly READ-ONLY cross-church lookup for Visitor check-in.
 * Resolves the visitor's home church and member identity without ever writing or caching
 * that member into the host church's `members` list.
 */
async function resolveCrossChurchVisitorReadOnly(params: {
  originChurchHint: string;
  rawCode: string;
  memberCode: string;
}): Promise<{
  member: Member | null;
  homeChurch: Church | null;
  verifiedInFirestore: boolean;
}> {
  const { originChurchHint, rawCode, memberCode } = params;
  const cleanHint = (originChurchHint || '').trim();
  const cleanCode = (memberCode || rawCode).trim();
  const cleanCodeUpper = cleanCode.toUpperCase();
  const cleanRawUpper = (rawCode || '').trim().toUpperCase();

  let homeChurch: Church | null = getChurchByIdOrCode(cleanHint) || null;
  if (!homeChurch && isDeviceOnline()) {
    homeChurch = await firestoreGetChurchByIdOrCode(cleanHint).catch(() => null);
  }

  let verifiedInFirestore = false;
  let resolvedMember: Member | null = null;

  // 1. Online master Firestore read-only lookup
  if (isDeviceOnline()) {
    try {
      const candidates = Array.from(
        new Set(
          [
            cleanCode,
            rawCode.trim(),
            homeChurch ? buildCanonicalBarcodeToken(homeChurch.id, cleanCode) : '',
            cleanHint ? buildCanonicalBarcodeToken(cleanHint, cleanCode) : '',
          ].filter(Boolean)
        )
      );

      for (const candidate of candidates) {
        const remote = await firestoreGetMemberByScanToken(candidate, homeChurch?.id);
        if (remote && !isLegacyDemoMember(remote) && !isMemberMarkedDeleted(remote)) {
          resolvedMember = remote;
          verifiedInFirestore = true;
          break;
        }
      }

      if (resolvedMember && !homeChurch && resolvedMember.churchId) {
        homeChurch =
          getChurchByIdOrCode(resolvedMember.churchId) ||
          (await firestoreGetChurchByIdOrCode(resolvedMember.churchId).catch(() => null));
      }
    } catch (err) {
      console.warn('Firestore cross-church visitor lookup fallback:', err);
    }
  }

  // 2. Offline / local cache read-only fallback (reads origin church cache only)
  if (!resolvedMember) {
    const allLocalMembers = loadFromStorage<Member[]>(STORAGE_KEYS.MEMBERS, []) || [];
    const hintUpper = cleanHint.toUpperCase();
    const originIdUpper = (homeChurch?.id || '').trim().toUpperCase();
    const originCodeUpper = (homeChurch?.code || '').trim().toUpperCase();

    const originPool = homeChurch
      ? getMembersByChurch(homeChurch.id)
      : allLocalMembers.filter((m) => {
          if (!m || isLegacyDemoMember(m) || isMemberMarkedDeleted(m)) return false;
          const mCh = (m.churchId || '').trim().toUpperCase();
          return (
            (originIdUpper && mCh === originIdUpper) ||
            (originCodeUpper && mCh === originCodeUpper) ||
            (hintUpper && mCh === hintUpper)
          );
        });

    const localMatch = originPool.find((m) => {
      const mId = (m.memberId || '').trim().toUpperCase();
      const mToken = (m.barcodeToken || '').trim().toUpperCase();
      const mCanon = buildCanonicalBarcodeToken(m.churchId, m.memberId).toUpperCase();
      return (
        mId === cleanCodeUpper ||
        mToken === cleanRawUpper ||
        mCanon === cleanRawUpper ||
        m.id === rawCode.trim()
      );
    });

    if (localMatch) {
      resolvedMember = localMatch;
      if (!homeChurch && localMatch.churchId) {
        homeChurch = getChurchByIdOrCode(localMatch.churchId) || null;
      }
    }
  }

  return {
    member: resolvedMember,
    homeChurch,
    verifiedInFirestore,
  };
}

/**
 * Unified attendance recording pipeline for Web, Desktop, and Scanner modals:
 * 1. Canonicalizes QR tokens (`CHURCH:{churchId}|MEMBER:{memberId}` and verification URL)
 * 2. Enforces strict multi-tenant church isolation
 * 3. Validates member identity against the master Firestore `members` collection
 * 4. Validates duplicate check-ins against BOTH local queues AND master Firestore `attendances` collection
 * 5. Commits to Firestore immediately when online, or persists to dual offline queues cleanly
 */
// In-flight mutex prevents rapid double-fires before async Firestore check resolves
const activeScanKeysInFlight = new Set<string>();

export async function recordAttendanceScanUnified(params: {
  currentChurchId: string;
  rawCode: string;
  serviceId?: string;
  method?: 'qr_scan' | 'barcode' | 'manual';
  recordedBy?: string;
  requireActiveOngoingService?: boolean;
}): Promise<ScanResult> {
  const {
    currentChurchId,
    rawCode,
    method = 'qr_scan',
    recordedBy = 'Unified Scanner',
    requireActiveOngoingService = false,
  } = params;
  const trimmedCode = (rawCode || '').replace(/[\u0000-\u001F\u007F]+/g, '').trim();

  if (!trimmedCode) {
    return {
      success: false,
      errorMessage: 'Kòd manm lan vid. Tanpri eskane yon kat QR oswa antre yon ID manm.',
    };
  }

  const parsedPrecheck = parseCanonicalQrToken(trimmedCode);
  const flightKey = `${(currentChurchId || '').trim().toUpperCase()}::${params.serviceId || 'AUTO'}::${(
    parsedPrecheck.memberId || trimmedCode
  )
    .trim()
    .toUpperCase()}`;
  if (activeScanKeysInFlight.has(flightKey)) {
    return {
      success: false,
      duplicate: true,
      errorMessage: 'Scan an kounye a menm — tanpri tann yon segonn.',
    };
  }
  activeScanKeysInFlight.add(flightKey);
  try {

  let church: Church | undefined = getChurchById(currentChurchId);
  if (!church && isDeviceOnline()) {
    const remoteChurch = await firestoreGetChurch(currentChurchId).catch(() => null);
    if (remoteChurch) church = remoteChurch;
  }

  const canonicalChurchId = church ? church.id : currentChurchId.trim();
  const validTenantIdentifiers = new Set([
    canonicalChurchId.toUpperCase(),
    currentChurchId.trim().toUpperCase(),
    ...(church?.code ? [church.code.trim().toUpperCase()] : []),
  ]);

  const services = getServicesByChurch(canonicalChurchId);
  const targetService: ServiceSession | undefined = params.serviceId
    ? services.find((s) => s.id === params.serviceId)
    : services.find((s) => isServiceCurrentlyActive(s, isServiceEnded));

  if (!targetService) {
    const waitingService = services.find(
      (s) => Boolean(s.isOpenForAttendance) && !s.isPermanentlyEnded && !isServiceEnded(s) && isServiceBeforeStart(s)
    );
    playErrorBeep();
    if (waitingService) {
      const startLabel = formatServiceTimeAmPm(waitingService.startTime);
      return {
        success: false,
        errorMessage: `Sèvis « ${waitingService.title} » poko kòmanse (ap kòmanse a ${startLabel}). Okenn prezans pa kapab verifye oswa eskane anvan lè sèvis la.`,
      };
    }
    return {
      success: false,
      errorMessage: 'Pa gen okenn sèvis aktif ki louvri pou prezans kounye a nan legliz sa a.',
    };
  }

  if (isServiceEnded(targetService) || targetService.isPermanentlyEnded) {
    playErrorBeep();
    return {
      success: false,
      errorMessage: requireActiveOngoingService
        ? 'Sèvis sa a pa aktif oswa li deja fini. Wòl resepsyon kapab eskane sèlman pou sèvis ki an kou a.'
        : 'Sèvis sa a deja fini epi li fèmen pou toutan. Li pa kapab pran oswa verifye prezans ankò.',
    };
  }

  if (isServiceBeforeStart(targetService)) {
    const startLabel = formatServiceTimeAmPm(targetService.startTime);
    playErrorBeep();
    return {
      success: false,
      errorMessage: `Sèvis « ${targetService.title} » poko kòmanse (lè kòmansman: ${startLabel}). Okenn prezans pa kapab verifye oswa eskane anvan lè sèvis la.`,
    };
  }

  if (!isServiceCurrentlyActive(targetService, isServiceEnded)) {
    playErrorBeep();
    return {
      success: false,
      errorMessage: requireActiveOngoingService
        ? 'Sèvis sa a pa aktif oswa li deja fini. Wòl resepsyon kapab eskane sèlman pou sèvis ki an kou a.'
        : 'Sèvis sa a fèmen pou prezans kounye a. Tanpri louvri yon sèvis ki an kou anvan ou pran prezans.',
    };
  }

  const parsed = parseCanonicalQrToken(trimmedCode);
  const memberCode = (parsed.memberId || trimmedCode).trim();
  const parsedChurchUpper = (parsed.churchId || '').trim().toUpperCase();
  const isForeignChurchToken = Boolean(
    parsedChurchUpper && !validTenantIdentifiers.has(parsedChurchUpper)
  );

  let matchedMember: Member | null = null;
  let memberVerifiedRemote = false;
  let isCrossChurchVisitor = false;
  let homeChurch: Church | null = null;

  // If format is `prefix_id` (e.g. custom ID with hyphen in same church), verify local/host church first
  if (!isForeignChurchToken || parsed.format === 'prefix_id') {
    const hostResolution = await resolveMemberUnified({
      canonicalChurchId,
      churchCode: church?.code,
      rawCode: trimmedCode,
      memberCode,
    });
    if (hostResolution.member) {
      matchedMember = hostResolution.member;
      memberVerifiedRemote = hostResolution.verifiedInFirestore;
    }
  }

  // Cross-church Visitor flow: QR code belongs to another church
  if (!matchedMember && isForeignChurchToken && parsed.churchId) {
    const visitorResolution = await resolveCrossChurchVisitorReadOnly({
      originChurchHint: parsed.churchId,
      rawCode: trimmedCode,
      memberCode,
    });
    if (visitorResolution.member) {
      matchedMember = visitorResolution.member;
      memberVerifiedRemote = visitorResolution.verifiedInFirestore;
      homeChurch = visitorResolution.homeChurch;
      const matchedChurchUpper = (matchedMember.churchId || '').trim().toUpperCase();
      isCrossChurchVisitor = Boolean(
        matchedChurchUpper && !validTenantIdentifiers.has(matchedChurchUpper)
      );
    }
  }

  if (!matchedMember) {
    playErrorBeep();
    return {
      success: false,
      verifiedInFirestore: isDeviceOnline(),
      errorMessage: isForeignChurchToken
        ? `Kòd QR "${memberCode}" ki soti nan legliz "${parsed.churchId}" pa jwenn nan baz done mèt OmniChurch.`
        : `Kòd manm "${memberCode}" pa jwenn nan koleksyon mèt legliz sa a.`,
    };
  }

  const isVisitorCheckIn = isCrossChurchVisitor || isVisitorMember(matchedMember);

  // Duplicate check #1: LocalStorage attendance + Pending offline queue + IndexedDB offline queue
  const allAttendance = loadFromStorage<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []) || [];
  const pendingLocal = getPendingOfflineAttendance();
  const queuedIdb = await getQueuedItems().catch(() => []);
  const combinedLocal = [
    ...allAttendance,
    ...pendingLocal,
    ...queuedIdb.map((q) => q.record),
  ];

  const localDuplicate = combinedLocal.find(
    (att) =>
      att &&
      (att.churchId === canonicalChurchId ||
        validTenantIdentifiers.has((att.churchId || '').trim().toUpperCase())) &&
      att.serviceId === targetService.id &&
      ((att.memberId || '').toUpperCase() === matchedMember.memberId.toUpperCase() ||
        att.memberDbId === matchedMember.id)
  );

  if (localDuplicate) {
    playDuplicateWarningBeep();
    return {
      success: false,
      duplicate: true,
      verifiedInFirestore: memberVerifiedRemote,
      isVisitor: isVisitorCheckIn,
      homeChurchId: localDuplicate.homeChurchId || (isCrossChurchVisitor ? matchedMember.churchId : undefined),
      homeChurchName: localDuplicate.homeChurchName || (isCrossChurchVisitor ? (homeChurch?.name || parsed.churchId) : undefined),
      record: localDuplicate,
      member: matchedMember,
      service: targetService,
      errorMessage: `Prezans deja anrejistre pou sèvis sa a a ${new Date(
        localDuplicate.timestamp
      ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
    };
  }

  // Duplicate check #2: Direct master Firestore `attendances` query when online
  // Prevents duplicates across PC/Web and Android mobile devices scanning simultaneously!
  const isOnline = isDeviceOnline();
  if (isOnline) {
    const remoteDuplicate = await firestoreCheckDuplicateAttendance(
      canonicalChurchId,
      targetService.id,
      matchedMember.memberId,
      matchedMember.id
    );

    if (remoteDuplicate) {
      // Cache remote attendance record locally so this device stays synchronized
      if (!allAttendance.some((a) => a.id === remoteDuplicate.id)) {
        allAttendance.unshift(remoteDuplicate);
        saveToStorage(STORAGE_KEYS.ATTENDANCE, allAttendance);
      }
      playDuplicateWarningBeep();
      return {
        success: false,
        duplicate: true,
        verifiedInFirestore: true,
        isVisitor: Boolean(remoteDuplicate.isVisitor || isVisitorCheckIn),
        homeChurchId:
          remoteDuplicate.homeChurchId ||
          (isCrossChurchVisitor ? matchedMember.churchId : undefined),
        homeChurchName:
          remoteDuplicate.homeChurchName ||
          (isCrossChurchVisitor ? homeChurch?.name || parsed.churchId : undefined),
        record: remoteDuplicate,
        member: matchedMember,
        service: targetService,
        errorMessage: `Prezans deja konfime pou sèvis sa a a ${new Date(
          remoteDuplicate.timestamp
        ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
      };
    }
  }

  // Compute on_time vs late status
  let attendanceStatus: 'on_time' | 'late' | 'excused' = 'on_time';
  let lateMinutes = 0;
  const toleranceMinutes = targetService.lateToleranceMinutes ?? 15;

  if (targetService.startTime) {
    try {
      const now = new Date();
      const [startHourStr, startMinStr] = targetService.startTime.split(':');
      if (startHourStr !== undefined && startMinStr !== undefined) {
        const serviceDateStr = targetService.date || formatLocalDateYmd(now);
        const [year, month, day] = serviceDateStr.split('-').map((v) => parseInt(v, 10));
        const scheduledTime = new Date(
          year,
          month - 1,
          day,
          parseInt(startHourStr, 10),
          parseInt(startMinStr, 10),
          0,
          0
        );
        const diffMs = now.getTime() - scheduledTime.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        if (diffMins > toleranceMinutes) {
          attendanceStatus = 'late';
          lateMinutes = diffMins;
        }
      }
    } catch (e) {
      console.warn('Lateness calculation note:', e);
    }
  }

  const canonicalBarcode =
    matchedMember.barcodeToken ||
    buildCanonicalBarcodeToken(
      isCrossChurchVisitor ? matchedMember.churchId : canonicalChurchId,
      matchedMember.memberId
    );

  const resolvedHomeChurchName = isCrossChurchVisitor
    ? homeChurch?.name || parsed.churchId || matchedMember.churchId
    : undefined;

  const newRecord: AttendanceRecord = {
    id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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
    barcodeToken: canonicalBarcode,
    timestamp: new Date().toISOString(),
    checkInMethod: method,
    recordedBy,
    attendanceStatus,
    lateMinutes,
    lateToleranceMinutes: toleranceMinutes,
    attendanceRole: isVisitorCheckIn ? 'visitor' : 'member',
    isVisitor: isVisitorCheckIn,
    ...(isCrossChurchVisitor
      ? {
          homeChurchId: matchedMember.churchId,
          homeChurchName: resolvedHomeChurchName,
        }
      : {}),
  };

  allAttendance.unshift(newRecord);
  saveToStorage(STORAGE_KEYS.ATTENDANCE, allAttendance);

  // Clear absence record ONLY for members of the host church (never alter cross-church data)
  if (!isCrossChurchVisitor) {
    try {
      const existingAbsences = loadFromStorage<any[]>(STORAGE_KEYS.ABSENCES, []) || [];
      const remainingAbsences = existingAbsences.filter(
        (abs) =>
          !(
            (abs.churchId === canonicalChurchId ||
              validTenantIdentifiers.has((abs.churchId || '').trim().toUpperCase())) &&
            abs.serviceId === targetService.id &&
            ((abs.memberId || '').toUpperCase() === matchedMember.memberId.toUpperCase() ||
              abs.memberDbId === matchedMember.id)
          )
      );
      if (remainingAbsences.length !== existingAbsences.length) {
        saveToStorage(STORAGE_KEYS.ABSENCES, remainingAbsences);
      }
    } catch (err) {
      console.warn('Error clearing absence on unified check-in:', err);
    }
  }

  let isOfflineSaved = false;
  let verifiedWrite = false;

  if (!isOnline) {
    addPendingOfflineAttendance(newRecord);
    await enqueueAttendance(newRecord).catch(() => {});
    isOfflineSaved = true;
  } else {
    try {
      await firestoreAddAttendance(newRecord);
      verifiedWrite = true;
      syncPendingOfflineAttendance(canonicalChurchId).catch(() => {});
      triggerOfflineSync().catch(() => {});
    } catch (err) {
      console.warn('Firestore direct write failed, moving record to offline sync queue:', err);
      addPendingOfflineAttendance(newRecord);
      await enqueueAttendance(newRecord).catch(() => {});
      isOfflineSaved = true;
    }
  }

  playSuccessBeep();

  return {
    success: true,
    verifiedInFirestore: verifiedWrite,
    record: newRecord,
    member: matchedMember,
    service: targetService,
    scannedAt: newRecord.timestamp,
    isOfflineSaved,
    isVisitor: isVisitorCheckIn,
    homeChurchId: newRecord.homeChurchId,
    homeChurchName: newRecord.homeChurchName,
  };
  } finally {
    activeScanKeysInFlight.delete(flightKey);
  }
}
