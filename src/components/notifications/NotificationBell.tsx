import React, { useState, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import {
  Church,
  Member,
  Announcement,
  ServiceSession,
  AttendanceRecord,
  Language,
  AppNotification,
} from '../../types';
import {
  getContextualNotifications,
  getUnreadNotificationsCount,
} from '../../services/notificationCenterService';
import { getAnnouncementsByChurch } from '../../utils/storage';

export interface NotificationBellProps {
  church?: Church;
  member?: Member | null;
  userRole?: 'admin' | 'member';
  announcements?: Announcement[];
  services?: ServiceSession[];
  attendanceRecords?: AttendanceRecord[];
  language?: Language;
  isOpenPage?: boolean;
  onOpenFullNotifications: () => void;
  onCloseNotifications?: () => void;
  onSelectAction?: (target: { tab?: string; announcementId?: string; serviceId?: string }) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  church,
  member,
  userRole = 'member',
  announcements = [],
  services = [],
  attendanceRecords = [],
  language = 'ht',
  isOpenPage = false,
  onOpenFullNotifications,
  onCloseNotifications,
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const isEs = language === 'es';
  const isEn = language === 'en';
  const isFr = language === 'fr';

  const reloadNotifications = useCallback(() => {
    if (!church || userRole === 'admin' || !member) {
      setNotifications([]);
      return;
    }
    const effectiveAnnouncements =
      announcements.length > 0 ? announcements : getAnnouncementsByChurch(church.id);
    const notifs = getContextualNotifications({
      church,
      member,
      userRole,
      announcements: effectiveAnnouncements,
      services,
      attendanceRecords,
      language: (language as Language) || 'ht',
    });
    setNotifications(notifs);
  }, [church, member, userRole, announcements, services, attendanceRecords, language]);

  useEffect(() => {
    reloadNotifications();

    const handleUpdate = () => {
      reloadNotifications();
    };

    window.addEventListener('omnichurch_notifications_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('omnichurch_notifications_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [reloadNotifications]);

  const unreadCount = getUnreadNotificationsCount(notifications);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOpenPage) {
      if (onCloseNotifications) {
        onCloseNotifications();
      } else {
        onOpenFullNotifications();
      }
    } else {
      onOpenFullNotifications();
    }
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        id="navbar-notifications-bell-btn"
        onClick={handleClick}
        className={`relative p-2 rounded-xl border transition-colors duration-200 cursor-pointer flex items-center justify-center select-none shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
          isOpenPage
            ? 'bg-amber-400 text-slate-950 border-amber-400 font-bold'
            : unreadCount > 0
            ? 'bg-[#0F172A]/95 hover:bg-slate-800 border-amber-400/50 text-amber-300'
            : 'bg-[#0F172A]/85 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:text-white'
        }`}
        title={
          isOpenPage
            ? isEs
              ? 'Cerrar notificaciones y volver'
              : isFr
              ? 'Fermer les notifications et retourner'
              : isEn
              ? 'Close notifications and go back'
              : 'Fèmen notifikasyon epi tounen'
            : isEs
            ? `Abrir Notificaciones (${unreadCount} sin leer)`
            : isEn
            ? `Open Notifications (${unreadCount} unread)`
            : isFr
            ? `Ouvrir les Notifications (${unreadCount} non lues)`
            : `Ouvri Notifikasyon yo (${unreadCount} pa li)`
        }
        aria-label={
          isEs
            ? `Notificaciones (${unreadCount} sin leer)`
            : isFr
            ? `Notifications (${unreadCount} non lues)`
            : isEn
            ? `Notifications (${unreadCount} unread)`
            : `Notifikasyon (${unreadCount} pa li)`
        }
        aria-pressed={isOpenPage}
      >
        <Bell className="w-4 h-4" />

        {unreadCount > 0 && (
          <span
            id="navbar-notifications-badge"
            className={`absolute -top-1.5 -right-1.5 min-w-[19px] h-[19px] px-1 rounded-full font-mono tabular-nums font-bold text-[10px] flex items-center justify-center shadow-md border ${
              isOpenPage
                ? 'bg-slate-950 text-amber-400 border-amber-400'
                : 'bg-red-600 text-white border-[#07152F]'
            }`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};
