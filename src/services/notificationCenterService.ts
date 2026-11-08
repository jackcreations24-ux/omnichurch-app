import {
  AppNotification,
  AppNotificationType,
  Announcement,
  ServiceSession,
  AttendanceRecord,
  Member,
  Church,
  Language,
} from '../types';
import { loadFromStorage, saveToStorage } from '../utils/storage';

const NOTIFICATIONS_STORAGE_PREFIX = 'omnichurch_notifications_';
const CUSTOM_NOTIFICATIONS_KEY = 'omnichurch_custom_notifications_v1';

function getReadStorageKey(churchId: string, memberId?: string): string {
  const userKey = memberId ? `member_${memberId}` : 'admin_space';
  return `${NOTIFICATIONS_STORAGE_PREFIX}read_${churchId}_${userKey}`;
}

function getDismissedStorageKey(churchId: string, memberId?: string): string {
  const userKey = memberId ? `member_${memberId}` : 'admin_space';
  return `${NOTIFICATIONS_STORAGE_PREFIX}dismissed_${churchId}_${userKey}`;
}

/**
 * Get read notification IDs for current context
 */
export function getReadNotificationIds(churchId: string, memberId?: string): string[] {
  return loadFromStorage<string[]>(getReadStorageKey(churchId, memberId), []);
}

/**
 * Get dismissed/deleted notification IDs for current context
 */
export function getDismissedNotificationIds(churchId: string, memberId?: string): string[] {
  return loadFromStorage<string[]>(getDismissedStorageKey(churchId, memberId), []);
}

/**
 * Mark a single notification as read
 */
export function markNotificationAsRead(
  notificationId: string,
  churchId: string,
  memberId?: string
): void {
  const readKey = getReadStorageKey(churchId, memberId);
  const currentRead = loadFromStorage<string[]>(readKey, []);
  if (!currentRead.includes(notificationId)) {
    const updated = [...currentRead, notificationId];
    saveToStorage(readKey, updated);
    notifyChange();
  }
}

/**
 * Toggle read status of a notification
 */
export function toggleNotificationRead(
  notificationId: string,
  churchId: string,
  memberId?: string
): boolean {
  const readKey = getReadStorageKey(churchId, memberId);
  const currentRead = loadFromStorage<string[]>(readKey, []);
  const isCurrentlyRead = currentRead.includes(notificationId);

  let updated: string[];
  if (isCurrentlyRead) {
    updated = currentRead.filter((id) => id !== notificationId);
  } else {
    updated = [...currentRead, notificationId];
  }
  saveToStorage(readKey, updated);
  notifyChange();
  return !isCurrentlyRead;
}

/**
 * Mark all notifications as read
 */
export function markAllNotificationsAsRead(
  notificationIds: string[],
  churchId: string,
  memberId?: string
): void {
  const readKey = getReadStorageKey(churchId, memberId);
  const currentRead = loadFromStorage<string[]>(readKey, []);
  const merged = Array.from(new Set([...currentRead, ...notificationIds]));
  saveToStorage(readKey, merged);
  notifyChange();
}

/**
 * Dismiss / delete a notification from view
 */
export function dismissNotification(
  notificationId: string,
  churchId: string,
  memberId?: string
): void {
  const dismissedKey = getDismissedStorageKey(churchId, memberId);
  const currentDismissed = loadFromStorage<string[]>(dismissedKey, []);
  if (!currentDismissed.includes(notificationId)) {
    saveToStorage(dismissedKey, [...currentDismissed, notificationId]);
    notifyChange();
  }
}

/**
 * Clear all notifications
 */
export function clearAllNotifications(
  notificationIds: string[],
  churchId: string,
  memberId?: string
): void {
  const dismissedKey = getDismissedStorageKey(churchId, memberId);
  const currentDismissed = loadFromStorage<string[]>(dismissedKey, []);
  const merged = Array.from(new Set([...currentDismissed, ...notificationIds]));
  saveToStorage(dismissedKey, merged);
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
 * Build aggregated, contextual notification list for a church
 */
export function getContextualNotifications(params: {
  church: Church;
  member?: Member | null;
  announcements: Announcement[];
  services: ServiceSession[];
  attendanceRecords?: AttendanceRecord[];
  language?: Language;
}): AppNotification[] {
  const { church, member, announcements, services, attendanceRecords = [] } = params;
  const readIds = new Set(getReadNotificationIds(church.id, member?.id || member?.memberId));
  const dismissedIds = new Set(getDismissedNotificationIds(church.id, member?.id || member?.memberId));

  const list: AppNotification[] = [];
  const today = new Date().toISOString().split('T')[0];

  // 1. Notifications from Active or Upcoming Services
  services.forEach((service) => {
    if (service.churchId !== church.id) return;

    // A) If service is currently open for attendance (LIVE)
    if (service.isOpenForAttendance) {
      const notifId = `service_active_${service.id}`;
      if (!dismissedIds.has(notifId)) {
        list.push({
          id: notifId,
          churchId: church.id,
          type: 'service_reminder',
          title: `🟢 Kilt Aktif Kounye a: ${service.title}`,
          body: `Prezans la louvri pou kilt ${service.title} (${service.startTime} - ${service.endTime}). Eskane kòd QR ou kounye a pou anrejistre prezans ou!`,
          createdAt: service.date ? `${service.date}T${service.startTime || '08:00'}:00` : new Date().toISOString(),
          read: readIds.has(notifId),
          priority: 'urgent',
          actionTarget: {
            tab: 'services',
            serviceId: service.id,
          },
          badgeText: 'An Dirèk',
          author: service.preacherOrLeader || church.name,
          authorType: 'pastor',
        });
      }
    }

    // B) 24h Reminder or Today's service notification
    const isToday = service.date === today;
    if (isToday && !service.isOpenForAttendance) {
      const notifId = `service_today_${service.id}`;
      if (!dismissedIds.has(notifId)) {
        list.push({
          id: notifId,
          churchId: church.id,
          type: 'service_reminder',
          title: `📅 Rapèl Sèvis Jodi a: ${service.title}`,
          body: `Sèvis ${service.title} ap kòmanse a ${service.startTime}. Pa bliye prepare kat dijital ou pou eskane lè w rive.`,
          createdAt: `${service.date}T${service.startTime || '08:00'}:00`,
          read: readIds.has(notifId),
          priority: 'high',
          actionTarget: {
            tab: 'services',
            serviceId: service.id,
          },
          badgeText: 'Jodi a',
          author: church.name,
          authorType: 'worship',
        });
      }
    }
  });

  // 2. Notifications from Announcements
  announcements.forEach((ann) => {
    if (ann.churchId !== church.id) return;

    // Check audience relevance if logged in as member
    if (member && ann.targetAudience && ann.targetAudience !== 'Tout moun') {
      const memDept = (member.department || '').toLowerCase();
      const memRole = (member.role || '').toLowerCase();
      const audLower = (typeof ann.targetAudience === 'string' ? ann.targetAudience : String(ann.targetAudience || '')).toLowerCase();
      const matches =
        (memDept && (memDept.includes(audLower) || audLower.includes(memDept))) ||
        (memRole && (memRole.includes(audLower) || audLower.includes(memRole)));
      if (!matches) return;
    }

    const notifId = `ann_${ann.id}`;
    if (dismissedIds.has(notifId)) return;

    const isOfficialAlert = !!ann.showToastOnLogin || ann.toastAlertLevel === 'urgent' || ann.toastAlertLevel === 'warning';

    // Determine priority
    let priority: 'normal' | 'high' | 'urgent' = 'normal';
    if (isOfficialAlert || ann.toastAlertLevel === 'urgent') {
      priority = 'urgent';
    } else if (ann.isPinned || ann.toastAlertLevel === 'warning' || ann.category === 'anons') {
      priority = 'high';
    }

    const badgeLabel = isOfficialAlert
      ? '⚠️ Avètisman Ofisyèl'
      : ann.isPinned
      ? 'Epengle'
      : ann.category === 'sevis'
      ? 'Kilt & Orè'
      : ann.category === 'mesaj'
      ? 'Mesaj Pastoral'
      : 'Ofisyèl';

    const cleanTitle = ann.title_ht || ann.title;
    const alertPrefix = isOfficialAlert ? '⚠️ ' : '';

    list.push({
      id: notifId,
      churchId: church.id,
      type: isOfficialAlert ? 'official_alert' : 'announcement',
      title: `${alertPrefix}${cleanTitle}`,
      body: ann.content_ht || ann.content,
      createdAt: ann.time && ann.date ? `${ann.date}T${ann.time}:00` : ann.date ? `${ann.date}T10:00:00` : new Date().toISOString(),
      read: readIds.has(notifId),
      priority,
      actionTarget: {
        tab: 'home',
        announcementId: ann.id,
      },
      author: isOfficialAlert ? `${church.name} (Administrasyon)` : (ann.author || church.name),
      authorType: 'admin',
      badgeText: badgeLabel,
    });
  });

  // 3. Notifications from Recent Check-ins (Attendance)
  if (member) {
    const memberAttendance = attendanceRecords
      .filter((att) => att.churchId === church.id && (att.memberId === member.memberId || att.memberDbId === member.id))
      .slice(0, 3);

    memberAttendance.forEach((att) => {
      const notifId = `attendance_${att.id}`;
      if (dismissedIds.has(notifId)) return;

      const isLate = att.attendanceStatus === 'late';
      list.push({
        id: notifId,
        churchId: church.id,
        type: 'attendance',
        title: isLate
          ? `Prezans Anrejistre (Reta: ${att.lateMinutes || 15} min)`
          : `✓ Prezans Konfime: ${att.serviceTitle}`,
        body: isLate
          ? `Prezans ou nan sèvis "${att.serviceTitle}" te anrejistre avèk siksè. Ou te rive ak yon ti reta.`
          : `Prezans ou nan sèvis "${att.serviceTitle}" anrejistre alè avèk siksè. Mèsi pou fidelite w!`,
        createdAt: att.timestamp || new Date().toISOString(),
        read: readIds.has(notifId),
        priority: 'normal',
        actionTarget: {
          tab: 'attendance',
        },
        badgeText: isLate ? 'Reta' : 'Alè',
        author: 'Sèvis Prezans',
        authorType: 'admin',
      });
    });
  }

  // 4. Custom Saved Notifications
  const customSaved = loadFromStorage<AppNotification[]>(CUSTOM_NOTIFICATIONS_KEY, []);
  customSaved.forEach((cNotif) => {
    if (cNotif.churchId === church.id && !dismissedIds.has(cNotif.id)) {
      list.push({
        ...cNotif,
        read: readIds.has(cNotif.id),
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
