import { AttendanceRecord, Member, ServiceSession } from '../types';

export interface MemberPermissions {
  readonly isReception: boolean;
  readonly isDeacon: boolean;
  readonly canScanAttendance: boolean;
  readonly canManualCheckInActiveService: boolean;
  readonly canViewActiveServiceRoster: boolean;
  readonly canCreateServices: boolean;
  readonly canManageServices: boolean;
  readonly canPublishAnnouncements: boolean;
  readonly canDeleteChurchRecords: false;
  readonly canEditMembers: false;
  readonly canDeleteMembers: false;
  readonly canChangeRoles: false;
}

/**
 * Normalizes role/department text by removing diacritics and converting to lowercase
 * so localized variants ("Réception", "Recepción", "Resepsyon", "Akèy", "Dyak", "Diácono") match reliably.
 */
export function normalizeRoleText(value?: string | null): string {
  if (!value) return '';
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const RECEPTION_ROLE_TOKENS = [
  'recepcion',
  'resepsyon',
  'reception',
  'akey',
  'accueil',
  'pwotokol',
  'protokol',
  'protocol',
  'protocolo',
  'usher',
  'hospitality',
  'bienvenida',
];

const DEACON_ROLE_TOKENS = [
  'dyak',
  'dyakones',
  'diacre',
  'diaconesse',
  'diacono',
  'diaconisa',
  'deacon',
  'deaconess',
];

const VISITOR_ROLE_TOKENS = [
  'vizite',
  'visitor',
  'visitante',
  'visiteur',
];

/**
 * Checks whether a role label represents the Visitor ('Vizitè') member type.
 */
export function isVisitorRole(role?: string | null): boolean {
  const normalized = normalizeRoleText(role);
  if (!normalized) return false;
  return VISITOR_ROLE_TOKENS.some((token) => normalized === token || normalized.includes(token));
}

/**
 * Checks whether a member profile is classified as a Visitor ('Vizitè').
 */
export function isVisitorMember(member?: Pick<Member, 'role' | 'memberType'> | null): boolean {
  if (!member) return false;
  if (member.memberType === 'visitor') return true;
  return isVisitorRole(member.role);
}

/**
 * Checks whether an attendance record represents a Visitor check-in.
 */
export function isVisitorAttendanceRecord(
  record?: Pick<AttendanceRecord, 'isVisitor' | 'attendanceRole' | 'churchId' | 'homeChurchId'> | null,
  hostChurchId?: string
): boolean {
  if (!record) return false;
  if (record.isVisitor === true || record.attendanceRole === 'visitor') return true;
  if (record.homeChurchId && (hostChurchId || record.churchId)) {
    const compareHost = (hostChurchId || record.churchId || '').trim().toUpperCase();
    return record.homeChurchId.trim().toUpperCase() !== compareHost;
  }
  return false;
}

function isMemberStatusActive(member?: { status?: string | null } | null): boolean {
  if (!member || !member.status) return true;
  return normalizeRoleText(member.status) === 'active';
}

/**
 * Checks whether an authenticated church member holds a Reception / Ushers / Hospitality role.
 * Strictly evaluates the member's assigned role (`member.role`) so regular members never inherit
 * scanning capabilities unintentionally.
 */
export function isReceptionRole(
  member?: (Partial<Member> & { status?: string | null; memberType?: string | null }) | null
): boolean {
  if (!member || !isMemberStatusActive(member)) return false;
  if (member.memberType === 'visitor') return false;
  const normalizedRole = normalizeRoleText(member.role);
  if (!normalizedRole) return false;
  return RECEPTION_ROLE_TOKENS.some((token) => normalizedRole.includes(token));
}

/**
 * Checks whether an active church member holds the Deacon / Dyak / Diacre / Diácono role.
 * Strictly evaluates word tokens within `member.role` (never `department` alone, and never visitors
 * or inactive/suspended accounts) so non-deacon roles cannot inherit service or announcement creation.
 */
export function isDeaconRole(
  member?: (Partial<Member> & { status?: string | null; memberType?: string | null }) | null
): boolean {
  if (!member || !isMemberStatusActive(member)) return false;
  if (member.memberType === 'visitor' || isVisitorRole(member.role)) return false;
  const normalizedRole = normalizeRoleText(member.role);
  if (!normalizedRole) return false;
  const tokens = normalizedRole.split(/[^a-z0-9]+/).filter(Boolean);
  return DEACON_ROLE_TOKENS.some((deaconToken) => tokens.includes(deaconToken));
}

/**
 * Checks whether a Deacon member is the verified author of a service or announcement record,
 * restricting Deacon delete actions strictly to records they created themselves.
 */
export function isDeaconAuthorOfRecord(
  member?: Pick<Member, 'id' | 'memberId' | 'googleUid' | 'userId'> | null,
  record?: { authorId?: string | null; createdBy?: string | null } | null,
  authUid?: string | null
): boolean {
  if (!member || !record) return false;
  const candidateAuthorIds = new Set(
    [member.id, member.memberId, member.googleUid, member.userId, authUid]
      .filter((val): val is string => typeof val === 'string' && val.trim().length > 0)
      .map((val) => val.trim())
  );
  if (candidateAuthorIds.size === 0) return false;
  const recordAuthor = typeof record.authorId === 'string' ? record.authorId.trim() : '';
  const recordCreator = typeof record.createdBy === 'string' ? record.createdBy.trim() : '';
  return (
    (recordAuthor.length > 0 && candidateAuthorIds.has(recordAuthor)) ||
    (recordCreator.length > 0 && candidateAuthorIds.has(recordCreator))
  );
}

/**
 * Returns strict least-privilege permissions for a logged-in member.
 * - Reception: attendance scanning & active service manual check-in ONLY.
 * - Deacon ("Dyak"): create/manage worship services & publish announcements ONLY.
 * - Neither role can edit/delete church members, change roles, or access church settings/admin data.
 */
export function getMemberPermissions(
  member?: (Partial<Member> & { status?: string | null; memberType?: string | null }) | null
): MemberPermissions {
  const isReception = isReceptionRole(member);
  const isDeacon = isDeaconRole(member);
  return {
    isReception,
    isDeacon,
    canScanAttendance: isReception,
    canManualCheckInActiveService: isReception,
    canViewActiveServiceRoster: isReception,
    canCreateServices: isDeacon,
    canManageServices: isDeacon,
    canPublishAnnouncements: isDeacon,
    canDeleteChurchRecords: false,
    canEditMembers: false,
    canDeleteMembers: false,
    canChangeRoles: false,
  };
}

/**
 * Parses either 24h ("19:00", "07:30:00") or 12h ("7:00 PM") schedule times into hour (0-23) and minute (0-59).
 */
export function parseScheduleTimeToHourMinute(
  timeStr?: string | null
): { hour: number; minute: number } | null {
  const clean = (timeStr || '').trim();
  if (!clean) return null;

  const amPmMatch = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  if (amPmMatch) {
    let hour = parseInt(amPmMatch[1], 10);
    const minute = parseInt(amPmMatch[2], 10);
    const period = amPmMatch[3].toUpperCase();
    if (Number.isNaN(hour) || Number.isNaN(minute) || minute < 0 || minute > 59) return null;
    if (period === 'AM') {
      if (hour === 12) hour = 0;
    } else if (period === 'PM') {
      if (hour < 12) hour += 12;
    }
    if (hour < 0 || hour > 23) return null;
    return { hour, minute };
  }

  const h24Match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (h24Match) {
    const hour = parseInt(h24Match[1], 10);
    const minute = parseInt(h24Match[2], 10);
    if (Number.isNaN(hour) || Number.isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return null;
    }
    return { hour, minute };
  }

  return null;
}

/**
 * Returns true if the service's scheduled start date/time is strictly in the future
 * (e.g., at 6:00 PM for a 7:00 PM service, or on an earlier calendar day).
 */
export function isServiceBeforeStart(
  service: Partial<ServiceSession> | null | undefined,
  nowOverride?: Date
): boolean {
  if (!service || !service.date) return false;
  const datePart = service.date.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return false;

  const now = nowOverride ? new Date(nowOverride.getTime()) : new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${d}`;

  if (datePart > todayStr) {
    return true;
  }

  if (datePart === todayStr && service.startTime) {
    const parsedStart = parseScheduleTimeToHourMinute(service.startTime);
    if (parsedStart) {
      const [year, month, day] = datePart.split('-').map((v) => parseInt(v, 10));
      const serviceStartMs = new Date(
        year,
        month - 1,
        day,
        parsedStart.hour,
        parsedStart.minute,
        0,
        0
      ).getTime();
      if (now.getTime() < serviceStartMs) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Evaluates whether a service is currently LIVE / active for attendance scanning:
 * 1. Activated for member attendance (`isOpenForAttendance === true`)
 * 2. Not permanently ended or past scheduled endTime
 * 3. Current local time has reached the scheduled start date & startTime
 */
export function isServiceCurrentlyActive(
  service: Partial<ServiceSession> | null | undefined,
  isEndedFn?: (srv: Partial<ServiceSession>, nowOverride?: Date) => boolean,
  nowOverride?: Date
): boolean {
  if (!service) return false;
  if (!service.isOpenForAttendance) return false;
  if (service.isPermanentlyEnded) return false;
  if (isEndedFn && isEndedFn(service, nowOverride)) return false;
  if (isServiceBeforeStart(service, nowOverride)) return false;
  return true;
}
