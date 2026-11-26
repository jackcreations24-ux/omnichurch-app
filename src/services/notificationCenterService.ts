import {
  AppNotification,
  Announcement,
  ServiceSession,
  AttendanceRecord,
  Member,
  Church,
  Language,
  UserRole,
  FirestoreNotificationDoc,
} from '../types';
import { loadFromStorage, saveToStorage, isServiceEnded, formatLocalDateYmd } from '../utils/storage';
import { isServiceCurrentlyActive } from '../utils/permissions';
import {
  isExcludedAdminRecipient,
  firestoreSetNotificationReadStateById,
  firestoreSetAnnouncementNotificationReadState,
  firestoreSetServiceNotificationReadState,
  resolveTimestampIso,
} from './firestoreService';

const NOTIFICATIONS_STORAGE_PREFIX = 'omnichurch_notifications_';
const CUSTOM_NOTIFICATIONS_KEY = 'omnichurch_custom_notifications_v1';
const TEXT_SIZE_STORAGE_KEY = 'omnichurch_notifications_text_size_v1';

export type NotificationTextSize = 'compact' | 'normal' | 'large';

/**
 * Short-lived in-memory guard to prevent an immediately-arriving Firestore snapshot
 * from reverting an optimistic local read/unread toggle while the cloud update is in flight.
 */
const pendingLocalReadOverrides = new Map<string, { isRead: boolean; expiresAt: number }>();

function sanitizeSegment(value: string): string {
  return String(value || '').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
}

function getCandidateMemberIds(memberId?: string, member?: Partial<Member> | null): string[] {
  return Array.from(
    new Set(
      [memberId, member?.id, member?.memberId, (member as any)?.userId]
        .filter(Boolean)
        .map((v) => String(v).trim())
    )
  );
}

function getStorageMemberKey(memberId?: string, member?: Partial<Member> | null): string {
  const key = memberId || member?.id || member?.memberId;
  return key ? `member_${key}` : 'admin_space';
}

function getReadStorageKey(churchId: string, memberId?: string, member?: Partial<Member> | null): string {
  return `${NOTIFICATIONS_STORAGE_PREFIX}read_${churchId}_${getStorageMemberKey(memberId, member)}`;
}

function getReadAtStorageKey(churchId: string, memberId?: string, member?: Partial<Member> | null): string {
  return `${NOTIFICATIONS_STORAGE_PREFIX}read_at_${churchId}_${getStorageMemberKey(memberId, member)}`;
}

function getDismissedStorageKey(churchId: string, memberId?: string, member?: Partial<Member> | null): string {
  return `${NOTIFICATIONS_STORAGE_PREFIX}dismissed_${churchId}_${getStorageMemberKey(memberId, member)}`;
}

export function getNotificationTextSizePreference(): NotificationTextSize {
  const raw = loadFromStorage<string>(TEXT_SIZE_STORAGE_KEY, 'normal');
  if (raw === 'compact' || raw === 'large') return raw;
  return 'normal';
}

export function saveNotificationTextSizePreference(size: NotificationTextSize): void {
  saveToStorage(TEXT_SIZE_STORAGE_KEY, size);
}

interface ResolvedNotificationMeta {
  aliases: string[];
  cloudDocIds: string[];
  announcementId?: string;
  serviceId?: string;
}

/**
 * Resolves all local & cloud alias IDs for a given notification ID so marking read,
 * marking unread, and dismissing stay 100% synchronized across Web cards, MemberHome,
 * and Android Firestore documents (even when IDs contain underscores or hyphens).
 */
export function resolveNotificationAliases(
  notificationId: string,
  memberId?: string,
  member?: Partial<Member> | null
): ResolvedNotificationMeta {
  const cleanId = String(notificationId || '').trim();
  const aliases = new Set<string>();
  const cloudDocIds = new Set<string>();
  if (!cleanId) {
    return { aliases: [], cloudDocIds: [] };
  }

  aliases.add(cleanId);
  const candidateMembers = getCandidateMemberIds(memberId, member);
  const sanitizedCandidates = Array.from(new Set(candidateMembers.map(sanitizeSegment).filter(Boolean)));

  let announcementId: string | undefined;
  let serviceId: string | undefined;

  if (cleanId.startsWith('ann_')) {
    announcementId = cleanId.slice(4);
  } else if (cleanId.startsWith('notif_announcement_')) {
    cloudDocIds.add(cleanId);
    const body = cleanId.slice('notif_announcement_'.length);
    // Strip known candidate member suffix first (handles member IDs with underscores)
    for (const cand of [...candidateMembers, ...sanitizedCandidates]) {
      const suffix = `_${cand}`;
      if (cand && body.endsWith(suffix) && body.length > suffix.length) {
        announcementId = body.slice(0, -suffix.length);
        break;
      }
    }
    if (!announcementId) {
      const lastUnderscore = body.lastIndexOf('_');
      if (lastUnderscore > 0) {
        announcementId = body.slice(0, lastUnderscore);
      }
    }
  } else if (cleanId.startsWith('service_active_')) {
    serviceId = cleanId.slice('service_active_'.length);
  } else if (cleanId.startsWith('service_today_')) {
    serviceId = cleanId.slice('service_today_'.length);
  } else if (cleanId.startsWith('notif_service_')) {
    cloudDocIds.add(cleanId);
    const body = cleanId.slice('notif_service_'.length);
    for (const cand of [...candidateMembers, ...sanitizedCandidates]) {
      const suffix = `_${cand}`;
      if (cand && body.endsWith(suffix) && body.length > suffix.length) {
        serviceId = body.slice(0, -suffix.length);
        break;
      }
    }
    if (!serviceId) {
      const lastUnderscore = body.lastIndexOf('_');
      if (lastUnderscore > 0) {
        serviceId = body.slice(0, lastUnderscore);
      }
    }
  } else if (cleanId.startsWith('notif_')) {
    cloudDocIds.add(cleanId);
  }

  if (announcementId) {
    const cleanAnnId = sanitizeSegment(announcementId);
    aliases.add(`ann_${announcementId}`);
    aliases.add(announcementId);
    if (cleanAnnId && cleanAnnId !== announcementId) {
      aliases.add(`ann_${cleanAnnId}`);
      aliases.add(cleanAnnId);
    }
    candidateMembers.forEach((cand) => {
      aliases.add(`notif_announcement_${announcementId}_${cand}`);
      const cleanCand = sanitizeSegment(cand);
      if (cleanCand) {
        const deterministicId = `notif_announcement_${cleanAnnId}_${cleanCand}`;
        aliases.add(deterministicId);
        cloudDocIds.add(deterministicId);
      }
    });
  }

  if (serviceId) {
    const cleanSrvId = sanitizeSegment(serviceId);
    aliases.add(`service_active_${serviceId}`);
    aliases.add(`service_today_${serviceId}`);
    if (cleanSrvId && cleanSrvId !== serviceId) {
      aliases.add(`service_active_${cleanSrvId}`);
      aliases.add(`service_today_${cleanSrvId}`);
    }
    candidateMembers.forEach((cand) => {
      aliases.add(`notif_service_${serviceId}_${cand}`);
      const cleanCand = sanitizeSegment(cand);
      if (cleanCand) {
        const deterministicId = `notif_service_${cleanSrvId}_${cleanCand}`;
        aliases.add(deterministicId);
        cloudDocIds.add(deterministicId);
      }
    });
  }

  return {
    aliases: Array.from(aliases),
    cloudDocIds: Array.from(cloudDocIds),
    announcementId,
    serviceId,
  };
}

function makePendingKey(churchId: string, memberKey: string | undefined, alias: string): string {
  return `${churchId}::${memberKey || 'admin'}::${alias}`;
}

function recordPendingOverrides(
  churchId: string,
  memberKey: string | undefined,
  aliases: string[],
  isRead: boolean
): void {
  const expiresAt = Date.now() + 3000;
  aliases.forEach((id) => {
    pendingLocalReadOverrides.set(makePendingKey(churchId, memberKey, id), { isRead, expiresAt });
  });
}

function hasActivePendingOverride(
  churchId: string,
  memberKey: string | undefined,
  aliases: string[]
): { isRead: boolean } | null {
  const now = Date.now();
  for (const id of aliases) {
    const key = makePendingKey(churchId, memberKey, id);
    const entry = pendingLocalReadOverrides.get(key);
    if (entry) {
      if (entry.expiresAt > now) {
        return { isRead: entry.isRead };
      }
      pendingLocalReadOverrides.delete(key);
    }
  }
  return null;
}

/**
 * Get read notification IDs for current context
 */
export function getReadNotificationIds(churchId: string, memberId?: string): string[] {
  return loadFromStorage<string[]>(getReadStorageKey(churchId, memberId), []);
}

/**
 * Get map of notificationId -> ISO timestamp when it was read
 */
export function getNotificationReadTimestamps(churchId: string, memberId?: string): Record<string, string> {
  return loadFromStorage<Record<string, string>>(getReadAtStorageKey(churchId, memberId), {});
}

/**
 * Lookup the read timestamp for a notification (checking all aliases)
 */
export function getNotificationReadAt(
  notificationId: string,
  churchId: string,
  memberId?: string,
  member?: Partial<Member> | null
): string | undefined {
  const map = getNotificationReadTimestamps(churchId, memberId || member?.id || member?.memberId);
  const { aliases } = resolveNotificationAliases(notificationId, memberId, member);
  for (const id of aliases) {
    if (map[id]) return map[id];
  }
  return undefined;
}

/**
 * Get dismissed/deleted notification IDs for current context
 */
export function getDismissedNotificationIds(churchId: string, memberId?: string): string[] {
  return loadFromStorage<string[]>(getDismissedStorageKey(churchId, memberId), []);
}

/**
 * Check if a notification (or any of its aliases) is marked read
 */
export function isNotificationReadInSet(
  notificationId: string,
  readIds: Set<string>,
  memberId?: string,
  member?: Partial<Member> | null
): boolean {
  const { aliases } = resolveNotificationAliases(notificationId, memberId, member);
  return aliases.some((alias) => readIds.has(alias));
}

/**
 * Check if an announcement is marked read for a member
 */
export function isAnnouncementReadForMember(
  announcementId: string,
  churchId: string,
  member?: Partial<Member> | null,
  extraReadIds?: Set<string>
): boolean {
  const memberKey = member?.id || member?.memberId;
  const readIds = extraReadIds || new Set(getReadNotificationIds(churchId, memberKey));
  return isNotificationReadInSet(`ann_${announcementId}`, readIds, memberKey, member);
}

/**
 * Mark a single notification as read (and optionally sync to Firestore)
 */
export function markNotificationAsRead(
  notificationId: string,
  churchId: string,
  memberId?: string,
  member?: Partial<Member> | null,
  options?: { syncCloud?: boolean; silent?: boolean }
): void {
  const resolvedMemberId = memberId || member?.id || member?.memberId;
  const readKey = getReadStorageKey(churchId, resolvedMemberId, member);
  const readAtKey = getReadAtStorageKey(churchId, resolvedMemberId, member);
  const currentRead = loadFromStorage<string[]>(readKey, []);
  const currentReadAt = loadFromStorage<Record<string, string>>(readAtKey, {});
  const { aliases, cloudDocIds, announcementId, serviceId } = resolveNotificationAliases(
    notificationId,
    resolvedMemberId,
    member
  );

  const shouldSyncCloud = options?.syncCloud !== false;
  if (shouldSyncCloud) {
    recordPendingOverrides(churchId, resolvedMemberId, aliases, true);
    cloudDocIds.forEach((docId) => {
      firestoreSetNotificationReadStateById(docId, true).catch(() => {});
    });
    if (announcementId && member) {
      firestoreSetAnnouncementNotificationReadState(churchId, announcementId, member, true).catch(() => {});
    }
    if (serviceId && member) {
      firestoreSetServiceNotificationReadState(churchId, serviceId, member, true).catch(() => {});
    }
  }

  let changed = false;
  const updated = [...currentRead];
  const nowIso = new Date().toISOString();
  const updatedReadAt = { ...currentReadAt };

  aliases.forEach((id) => {
    if (!updated.includes(id)) {
      updated.push(id);
      changed = true;
    }
    if (!updatedReadAt[id]) {
      updatedReadAt[id] = nowIso;
    }
  });

  if (changed) {
    saveToStorage(readKey, updated);
    saveToStorage(readAtKey, updatedReadAt);
    if (!options?.silent) {
      notifyChange();
    }
  }
}

/**
 * Mark a single notification as UNREAD (removing all alias IDs & syncing to Firestore)
 */
export function markNotificationAsUnread(
  notificationId: string,
  churchId: string,
  memberId?: string,
  member?: Partial<Member> | null,
  options?: { syncCloud?: boolean; silent?: boolean }
): void {
  const resolvedMemberId = memberId || member?.id || member?.memberId;
  const readKey = getReadStorageKey(churchId, resolvedMemberId, member);
  const readAtKey = getReadAtStorageKey(churchId, resolvedMemberId, member);
  const currentRead = loadFromStorage<string[]>(readKey, []);
  const currentReadAt = loadFromStorage<Record<string, string>>(readAtKey, {});
  const { aliases, cloudDocIds, announcementId, serviceId } = resolveNotificationAliases(
    notificationId,
    resolvedMemberId,
    member
  );

  const aliasSet = new Set(aliases);
  const shouldSyncCloud = options?.syncCloud !== false;

  if (shouldSyncCloud) {
    recordPendingOverrides(churchId, resolvedMemberId, aliases, false);
    cloudDocIds.forEach((docId) => {
      firestoreSetNotificationReadStateById(docId, false).catch(() => {});
    });
    if (announcementId && member) {
      firestoreSetAnnouncementNotificationReadState(churchId, announcementId, member, false).catch(() => {});
    }
    if (serviceId && member) {
      firestoreSetServiceNotificationReadState(churchId, serviceId, member, false).catch(() => {});
    }
  }

  const updated = currentRead.filter((id) => !aliasSet.has(id));
  const changed = updated.length !== currentRead.length;

  const updatedReadAt = { ...currentReadAt };
  let readAtChanged = false;
  aliases.forEach((id) => {
    if (id in updatedReadAt) {
      delete updatedReadAt[id];
      readAtChanged = true;
    }
  });

  if (changed || readAtChanged) {
    saveToStorage(readKey, updated);
    saveToStorage(readAtKey, updatedReadAt);
    if (!options?.silent) {
      notifyChange();
    }
  }
}

/**
 * Toggle read status of a notification (properly removes or adds ALL alias IDs + syncs cloud)
 */
export function toggleNotificationRead(
  notificationId: string,
  churchId: string,
  memberId?: string,
  member?: Partial<Member> | null
): boolean {
  const resolvedMemberId = memberId || member?.id || member?.memberId;
  const readIds = new Set(getReadNotificationIds(churchId, resolvedMemberId));
  const isCurrentlyRead = isNotificationReadInSet(notificationId, readIds, resolvedMemberId, member);

  if (isCurrentlyRead) {
    markNotificationAsUnread(notificationId, churchId, resolvedMemberId, member);
    return false;
  } else {
    markNotificationAsRead(notificationId, churchId, resolvedMemberId, member);
    return true;
  }
}

/**
 * Mark all notifications as read
 */
export function markAllNotificationsAsRead(
  notificationIds: string[],
  churchId: string,
  memberId?: string,
  member?: Partial<Member> | null
): void {
  if (!notificationIds.length) return;
  const resolvedMemberId = memberId || member?.id || member?.memberId;
  const readKey = getReadStorageKey(churchId, resolvedMemberId, member);
  const readAtKey = getReadAtStorageKey(churchId, resolvedMemberId, member);
  const currentRead = loadFromStorage<string[]>(readKey, []);
  const currentReadAt = loadFromStorage<Record<string, string>>(readAtKey, {});
  const mergedSet = new Set(currentRead);
  const updatedReadAt = { ...currentReadAt };
  const nowIso = new Date().toISOString();

  notificationIds.forEach((id) => {
    const { aliases, cloudDocIds, announcementId, serviceId } = resolveNotificationAliases(
      id,
      resolvedMemberId,
      member
    );
    recordPendingOverrides(churchId, resolvedMemberId, aliases, true);
    aliases.forEach((alias) => {
      mergedSet.add(alias);
      if (!updatedReadAt[alias]) {
        updatedReadAt[alias] = nowIso;
      }
    });
    cloudDocIds.forEach((docId) => {
      firestoreSetNotificationReadStateById(docId, true).catch(() => {});
    });
    if (announcementId && member) {
      firestoreSetAnnouncementNotificationReadState(churchId, announcementId, member, true).catch(() => {});
    }
    if (serviceId && member) {
      firestoreSetServiceNotificationReadState(churchId, serviceId, member, true).catch(() => {});
    }
  });

  saveToStorage(readKey, Array.from(mergedSet));
  saveToStorage(readAtKey, updatedReadAt);
  notifyChange();
}

/**
 * Bidirectional sync from real-time Cloud Firestore `notifications` snapshot into local read state.
 * Respects recent optimistic local toggles so UI never flickers while an update is in flight.
 */
export function syncNotificationReadStatesFromCloud(
  fsNotifs: FirestoreNotificationDoc[],
  churchId: string,
  member?: Partial<Member> | null
): boolean {
  if (!churchId || !member || !fsNotifs.length) return false;
  const memberKey = member.id || member.memberId;
  const readKey = getReadStorageKey(churchId, memberKey, member);
  const readAtKey = getReadAtStorageKey(churchId, memberKey, member);
  const readSet = new Set(loadFromStorage<string[]>(readKey, []));
  const readAtMap = { ...loadFromStorage<Record<string, string>>(readAtKey, {}) };
  const nowIso = new Date().toISOString();

  let changed = false;

  fsNotifs.forEach((fn) => {
    if (!fn?.id) return;
    const { aliases } = resolveNotificationAliases(fn.id, memberKey, member);
    const pending = hasActivePendingOverride(churchId, memberKey, aliases);
    if (pending) return;

    const currentlyReadLocally = aliases.some((a) => readSet.has(a));
    if (fn.isRead && !currentlyReadLocally) {
      aliases.forEach((a) => {
        readSet.add(a);
        if (!readAtMap[a]) readAtMap[a] = nowIso;
      });
      changed = true;
    } else if (!fn.isRead && currentlyReadLocally) {
      aliases.forEach((a) => {
        if (readSet.delete(a)) changed = true;
        if (a in readAtMap) {
          delete readAtMap[a];
          changed = true;
        }
      });
    }
  });

  if (changed) {
    saveToStorage(readKey, Array.from(readSet));
    saveToStorage(readAtKey, readAtMap);
    notifyChange();
  }
  return changed;
}

/**
 * Dismiss / delete a notification from view (suppresses all alias IDs)
 */
export function dismissNotification(
  notificationId: string,
  churchId: string,
  memberId?: string,
  member?: Partial<Member> | null
): void {
  const resolvedMemberId = memberId || member?.id || member?.memberId;
  const dismissedKey = getDismissedStorageKey(churchId, resolvedMemberId, member);
  const currentDismissed = loadFromStorage<string[]>(dismissedKey, []);
  const { aliases } = resolveNotificationAliases(notificationId, resolvedMemberId, member);

  const merged = Array.from(new Set([...currentDismissed, ...aliases]));
  if (merged.length !== currentDismissed.length) {
    saveToStorage(dismissedKey, merged);
    notifyChange();
  }
}

/**
 * Clear multiple notifications from view
 */
export function clearAllNotifications(
  notificationIds: string[],
  churchId: string,
  memberId?: string,
  member?: Partial<Member> | null
): void {
  if (!notificationIds.length) return;
  const resolvedMemberId = memberId || member?.id || member?.memberId;
  const dismissedKey = getDismissedStorageKey(churchId, resolvedMemberId, member);
  const currentDismissed = loadFromStorage<string[]>(dismissedKey, []);
  const expanded = new Set<string>(currentDismissed);

  notificationIds.forEach((id) => {
    const { aliases } = resolveNotificationAliases(id, resolvedMemberId, member);
    aliases.forEach((a) => expanded.add(a));
  });

  saveToStorage(dismissedKey, Array.from(expanded));
  notifyChange();
}

/**
 * Add a custom notification
 */
export function addCustomNotification(
  notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>
): AppNotification {
  const allCustom = loadFromStorage<AppNotification[]>(CUSTOM_NOTIFICATIONS_KEY, []);
  const newNotif: AppNotification = {
    ...notification,
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
    read: false,
    isRead: false,
  };
  saveToStorage(CUSTOM_NOTIFICATIONS_KEY, [newNotif, ...allCustom]);
  notifyChange();
  return newNotif;
}

function notifyChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('omnichurch_notifications_updated'));
  }
}

/**
 * Resolve localized text from an announcement according to the active language.
 */
function resolveLocalizedAnnouncementField(
  ann: Announcement,
  field: 'title' | 'content',
  language: Language
): string {
  if (field === 'title') {
    if (language === 'fr') return ann.title_fr || ann.title || ann.title_ht || '';
    if (language === 'en') return ann.title_en || ann.title || ann.title_ht || '';
    if (language === 'es') return ann.title_es || ann.title || ann.title_ht || '';
    return ann.title_ht || ann.title || '';
  }
  if (language === 'fr') return ann.content_fr || ann.content || ann.content_ht || '';
  if (language === 'en') return ann.content_en || ann.content || ann.content_ht || '';
  if (language === 'es') return ann.content_es || ann.content || ann.content_ht || '';
  return ann.content_ht || ann.content || '';
}

/**
 * Format an ISO timestamp or Firestore timestamp into a clean, human-readable relative/absolute label
 * in all 4 supported languages (ht, fr, en, es).
 */
export function formatNotificationTimestamp(
  rawDate: any,
  language: Language = 'ht'
): { relative: string; full: string } {
  const iso = resolveTimestampIso(rawDate);
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { relative: '', full: '' };
  }

  const localeMap: Record<Language, string> = {
    ht: 'fr-HT',
    fr: 'fr-FR',
    en: 'en-US',
    es: 'es-ES',
  };
  const locale = localeMap[language] || 'fr-FR';

  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const timeStr = `${hh}:${mm}`;

  let fullDate = '';
  try {
    fullDate = `${date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })} · ${timeStr}`;
  } catch {
    fullDate = `${iso.slice(0, 10)} · ${timeStr}`;
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);

  if (diffMs >= 0 && diffMin < 1) {
    return {
      relative:
        language === 'es'
          ? 'Ahora mismo'
          : language === 'fr'
          ? 'À l’instant'
          : language === 'en'
          ? 'Just now'
          : 'Kounye a',
      full: fullDate,
    };
  }

  if (diffMs >= 0 && diffMin < 60) {
    return {
      relative:
        language === 'es'
          ? `Hace ${diffMin} min`
          : language === 'fr'
          ? `Il y a ${diffMin} min`
          : language === 'en'
          ? `${diffMin}m ago`
          : `${diffMin} min de sa`,
      full: fullDate,
    };
  }

  if (diffMs >= 0 && diffHr < 24 && date.getDate() === now.getDate()) {
    return {
      relative:
        language === 'es'
          ? `Hace ${diffHr} h · ${timeStr}`
          : language === 'fr'
          ? `Il y a ${diffHr} h · ${timeStr}`
          : language === 'en'
          ? `${diffHr}h ago · ${timeStr}`
          : `${diffHr} èdtan de sa · ${timeStr}`,
      full: fullDate,
    };
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    return {
      relative:
        language === 'es'
          ? `Ayer · ${timeStr}`
          : language === 'fr'
          ? `Hier · ${timeStr}`
          : language === 'en'
          ? `Yesterday · ${timeStr}`
          : `Yè · ${timeStr}`,
      full: fullDate,
    };
  }

  return { relative: fullDate, full: fullDate };
}

/**
 * Build aggregated, contextual notification list for a church.
 * CRITICAL RULE: NEVER send or display member announcement/service notifications to the Church Admin / sender.
 */
export function getContextualNotifications(params: {
  church: Church;
  member?: Member | null;
  userRole?: UserRole | string;
  announcements: Announcement[];
  services: ServiceSession[];
  attendanceRecords?: AttendanceRecord[];
  language?: Language;
}): AppNotification[] {
  const {
    church,
    member,
    userRole,
    announcements,
    services,
    attendanceRecords = [],
    language = 'ht',
  } = params;

  // STRICT ADMIN EXCLUSION: Admin / Pastor / Super Developer never receives member fan-out notifications
  if (userRole === 'admin' || !member || isExcludedAdminRecipient(member, church)) {
    return [];
  }

  const isEs = language === 'es';
  const isEn = language === 'en';
  const isFr = language === 'fr';

  const memberDocId = member.id || member.memberId;
  const readIds = new Set(getReadNotificationIds(church.id, memberDocId));
  const dismissedIds = new Set(getDismissedNotificationIds(church.id, memberDocId));

  const list: AppNotification[] = [];
  const today = formatLocalDateYmd();

  // 1. Notifications from Active or Upcoming Services
  services.forEach((service) => {
    if (service.churchId !== church.id) return;

    const activeAliases = resolveNotificationAliases(`service_active_${service.id}`, memberDocId, member).aliases;
    const todayAliases = resolveNotificationAliases(`service_today_${service.id}`, memberDocId, member).aliases;
    const isLiveNow = isServiceCurrentlyActive(service, isServiceEnded);

    // A) If service is currently open AND within start-to-end window (LIVE for scanning)
    if (isLiveNow) {
      const notifId = `service_active_${service.id}`;
      if (!activeAliases.some((a) => dismissedIds.has(a))) {
        const isRead = activeAliases.some((a) => readIds.has(a));
        list.push({
          id: notifId,
          churchId: church.id,
          type: 'service_reminder',
          title: isEs
            ? `Culto activo ahora: ${service.title}`
            : isFr
            ? `Culte en cours : ${service.title}`
            : isEn
            ? `Live service now: ${service.title}`
            : `Kilt aktif kounye a: ${service.title}`,
          body: isEs
            ? `El registro de asistencia está abierto para "${service.title}" (${service.startTime} - ${service.endTime}). Escanea tu código QR ahora para registrar tu presencia.`
            : isFr
            ? `Les présences sont ouvertes pour « ${service.title} » (${service.startTime} - ${service.endTime}). Scannez votre code QR maintenant pour enregistrer votre présence.`
            : isEn
            ? `Attendance check-in is open for "${service.title}" (${service.startTime} - ${service.endTime}). Scan your QR pass now to record your attendance.`
            : `Prezans la louvri pou kilt "${service.title}" (${service.startTime} - ${service.endTime}). Eskane kòd QR ou kounye a pou anrejistre prezans ou.`,
          createdAt: resolveTimestampIso(
            service.createdAt,
            service.date ? `${service.date}T${service.startTime || '08:00'}:00` : undefined
          ),
          read: isRead,
          isRead,
          priority: 'urgent',
          actionTarget: {
            tab: 'services',
            serviceId: service.id,
          },
          badgeText: isEs ? 'En vivo' : isFr ? 'En direct' : isEn ? 'Live' : 'An dirèk',
          author: service.preacherOrLeader || church.name,
          authorType: 'pastor',
        });
      }
    }

    // B) Today's service notification (not currently live/scanning)
    const isToday = service.date === today;
    if (isToday && !isLiveNow && !isServiceEnded(service) && !service.isPermanentlyEnded) {
      const notifId = `service_today_${service.id}`;
      if (!todayAliases.some((a) => dismissedIds.has(a))) {
        const isRead = todayAliases.some((a) => readIds.has(a));
        list.push({
          id: notifId,
          churchId: church.id,
          type: 'service_reminder',
          title: isEs
            ? `Recordatorio de culto hoy: ${service.title}`
            : isFr
            ? `Rappel du culte aujourd’hui : ${service.title}`
            : isEn
            ? `Today’s service reminder: ${service.title}`
            : `Rapèl sèvis jodi a: ${service.title}`,
          body: isEs
            ? `El culto "${service.title}" comienza a las ${service.startTime}. Ten listo tu carnet digital para escanear al llegar.`
            : isFr
            ? `Le culte « ${service.title} » commence à ${service.startTime}. Préparez votre carte numérique pour le scan à votre arrivée.`
            : isEn
            ? `Service "${service.title}" starts at ${service.startTime}. Keep your digital member card ready for check-in on arrival.`
            : `Sèvis "${service.title}" ap kòmanse a ${service.startTime}. Pa bliye prepare kat dijital ou pou eskane lè w rive.`,
          createdAt: resolveTimestampIso(
            service.createdAt,
            `${service.date}T${service.startTime || '08:00'}:00`
          ),
          read: isRead,
          isRead,
          priority: 'high',
          actionTarget: {
            tab: 'services',
            serviceId: service.id,
          },
          badgeText: isEs ? 'Hoy' : isFr ? 'Aujourd’hui' : isEn ? 'Today' : 'Jodi a',
          author: church.name,
          authorType: 'worship',
        });
      }
    }
  });

  // 2. Notifications from Announcements
  announcements.forEach((ann) => {
    if (ann.churchId !== church.id) return;

    // Exclude if current member is the author of this announcement
    if (
      ann.authorId &&
      (ann.authorId === member.id || ann.authorId === member.memberId || ann.authorId === member.userId)
    ) {
      return;
    }

    // Check audience relevance if logged in as member
    if (member && ann.targetAudience && ann.targetAudience !== 'Tout moun') {
      const memDept = (member.department || '').toLowerCase();
      const memRole = (member.role || '').toLowerCase();
      const audLower = (
        typeof ann.targetAudience === 'string' ? ann.targetAudience : String(ann.targetAudience || '')
      ).toLowerCase();
      const matches =
        (memDept && (memDept.includes(audLower) || audLower.includes(memDept))) ||
        (memRole && (memRole.includes(audLower) || audLower.includes(memRole)));
      if (!matches) return;
    }

    const notifId = `ann_${ann.id}`;
    const annAliases = resolveNotificationAliases(notifId, memberDocId, member).aliases;
    if (annAliases.some((a) => dismissedIds.has(a))) return;

    const isOfficialAlert =
      !!ann.showToastOnLogin || ann.toastAlertLevel === 'urgent' || ann.toastAlertLevel === 'warning';

    let priority: 'normal' | 'high' | 'urgent' = 'normal';
    if (isOfficialAlert || ann.toastAlertLevel === 'urgent') {
      priority = 'urgent';
    } else if (ann.isPinned || ann.toastAlertLevel === 'warning' || ann.category === 'anons') {
      priority = 'high';
    }

    const badgeLabel = isOfficialAlert
      ? isEs
        ? 'Aviso oficial'
        : isFr
        ? 'Avis officiel'
        : isEn
        ? 'Official notice'
        : 'Avètisman ofisyèl'
      : ann.isPinned
      ? isEs
        ? 'Fijado'
        : isFr
        ? 'Épinglé'
        : isEn
        ? 'Pinned'
        : 'Epengle'
      : ann.category === 'sevis'
      ? isEs
        ? 'Cultos y horarios'
        : isFr
        ? 'Cultes & horaires'
        : isEn
        ? 'Services & schedule'
        : 'Kilt & orè'
      : ann.category === 'mesaj'
      ? isEs
        ? 'Mensaje pastoral'
        : isFr
        ? 'Message pastoral'
        : isEn
        ? 'Pastoral message'
        : 'Mesaj pastoral'
      : isEs
      ? 'Anuncio'
      : isFr
      ? 'Annonce'
      : isEn
      ? 'Announcement'
      : 'Ofisyèl';

    const cleanTitle = resolveLocalizedAnnouncementField(ann, 'title', language);
    const cleanBody = resolveLocalizedAnnouncementField(ann, 'content', language);
    const isRead = isAnnouncementReadForMember(ann.id, church.id, member, readIds);

    list.push({
      id: notifId,
      churchId: church.id,
      type: isOfficialAlert ? 'official_alert' : 'announcement',
      title: cleanTitle,
      body: cleanBody,
      createdAt: resolveTimestampIso(
        ann.createdAt,
        ann.time && ann.date ? `${ann.date}T${ann.time}:00` : ann.date ? `${ann.date}T10:00:00` : undefined
      ),
      read: isRead,
      isRead,
      priority,
      actionTarget: ann.serviceId
        ? {
            tab: 'services',
            serviceId: ann.serviceId,
          }
        : undefined,
      author: isOfficialAlert
        ? `${church.name} (${isEs ? 'Administración' : isFr ? 'Administration' : isEn ? 'Administration' : 'Administrasyon'})`
        : ann.authorName || ann.author || church.name,
      authorType: 'admin',
      badgeText: badgeLabel,
      imageUrl: ann.posterUrl || ann.imageUrl || null,
      imageCaption: ann.imageCaption,
      targetAudience: ann.targetAudience,
      department: ann.department,
    });
  });

  // 3. Notifications from Recent Check-ins (Attendance)
  if (member) {
    const memberAttendance = attendanceRecords
      .filter(
        (att) =>
          att.churchId === church.id && (att.memberId === member.memberId || att.memberDbId === member.id)
      )
      .slice(0, 5);

    memberAttendance.forEach((att) => {
      const notifId = `attendance_${att.id}`;
      if (dismissedIds.has(notifId)) return;

      const isLate = att.attendanceStatus === 'late';
      const isRead = readIds.has(notifId);
      const lateMins = att.lateMinutes || 15;

      list.push({
        id: notifId,
        churchId: church.id,
        type: 'attendance',
        title: isLate
          ? isEs
            ? `Asistencia registrada (Retraso: ${lateMins} min)`
            : isFr
            ? `Présence enregistrée (Retard : ${lateMins} min)`
            : isEn
            ? `Attendance recorded (${lateMins} min late)`
            : `Prezans anrejistre (Reta: ${lateMins} min)`
          : isEs
          ? `Asistencia confirmada: ${att.serviceTitle}`
          : isFr
          ? `Présence confirmée : ${att.serviceTitle}`
          : isEn
          ? `Attendance confirmed: ${att.serviceTitle}`
          : `Prezans konfime: ${att.serviceTitle}`,
        body: isLate
          ? isEs
            ? `Tu asistencia al culto "${att.serviceTitle}" fue registrada correctamente con un ligero retraso.`
            : isFr
            ? `Votre présence au culte « ${att.serviceTitle} » a bien été enregistrée avec un léger retard.`
            : isEn
            ? `Your attendance for "${att.serviceTitle}" was recorded with a slight delay.`
            : `Prezans ou nan sèvis "${att.serviceTitle}" te anrejistre avèk siksè. Ou te rive ak yon ti reta.`
          : isEs
          ? `Tu asistencia al culto "${att.serviceTitle}" se registró puntualmente. ¡Gracias por tu fidelidad!`
          : isFr
          ? `Votre présence au culte « ${att.serviceTitle} » a été enregistrée à l’heure. Merci pour votre fidélité !`
          : isEn
          ? `Your attendance for "${att.serviceTitle}" was recorded on time. Thank you for your faithfulness!`
          : `Prezans ou nan sèvis "${att.serviceTitle}" anrejistre alè avèk siksè. Mèsi pou fidelite w!`,
        createdAt: att.timestamp || new Date().toISOString(),
        read: isRead,
        isRead,
        priority: 'normal',
        actionTarget: {
          tab: 'attendance',
        },
        badgeText: isLate
          ? isEs
            ? 'Retraso'
            : isFr
            ? 'Retard'
            : isEn
            ? 'Late'
            : 'Reta'
          : isEs
          ? 'Puntual'
          : isFr
          ? 'À l’heure'
          : isEn
          ? 'On time'
          : 'Alè',
        author: isEs
          ? 'Control de asistencia'
          : isFr
          ? 'Service des présences'
          : isEn
          ? 'Attendance desk'
          : 'Sèvis prezans',
        authorType: 'admin',
      });
    });
  }

  // 4. Custom Saved Notifications
  const customSaved = loadFromStorage<AppNotification[]>(CUSTOM_NOTIFICATIONS_KEY, []);
  customSaved.forEach((cNotif) => {
    if (cNotif.churchId === church.id && !dismissedIds.has(cNotif.id)) {
      const isRead = readIds.has(cNotif.id);
      list.push({
        ...cNotif,
        read: isRead,
        isRead,
      });
    }
  });

  // Sort by createdAt descending (most recent first)
  list.sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    if (isNaN(dateA) || isNaN(dateB)) return 0;
    return dateB - dateA;
  });

  return list;
}

/**
 * Get unread count
 */
export function getUnreadNotificationsCount(notifications: AppNotification[]): number {
  return notifications.filter((n) => !n.read).length;
}
