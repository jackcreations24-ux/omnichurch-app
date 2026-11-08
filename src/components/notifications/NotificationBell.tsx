import React, { useState, useEffect } from 'react';
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

export interface NotificationBellProps {
  church?: Church;
  member?: Member | null;
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

  // Load and refresh notifications
  const reloadNotifications = () => {
    if (!church) {
      setNotifications([]);
      return;
    }
    const notifs = getContextualNotifications({
      church,
      member,
      announcements,
      services,
      attendanceRecords,
      language: (language as Language) || 'ht',
    });
    setNotifications(notifs);
  };

  useEffect(() => {
    reloadNotifications();

    const handleUpdate = () => {
      reloadNotifications();
    };

    window.addEventListener('omnichurch_notifications_updated', handleUpdate);
    return () => {
      window.removeEventListener('omnichurch_notifications_updated', handleUpdate);
    };
  }, [church, member, announcements, services, attendanceRecords, language]);

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
      {/* Integrated Notification Bell Button */}
      <button
        type="button"
        id="navbar-notifications-bell-btn"
        onClick={handleClick}
        className={`relative p-2 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-center select-none shadow-sm ${
          isOpenPage
            ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-amber-400/25 scale-105 font-black'
            : unreadCount > 0
            ? 'bg-slate-900/90 hover:bg-slate-800 border-amber-400/40 text-amber-300'
            : 'bg-slate-900/80 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:text-white'
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
            : `Ouvri Notifikasyon yo (${unreadCount} nouvo)`
        }
        aria-label="Notifications"
        aria-pressed={isOpenPage}
      >
        <Bell
          className={`w-4 h-4 transition-transform duration-300 ${
            unreadCount > 0 && !isOpenPage ? 'rotate-[-10deg]' : ''
          }`}
        />

        {/* Shiny Pill Unread Count Badge */}
        {unreadCount > 0 && (
          <span
            id="navbar-notifications-badge"
            className={`absolute -top-1.5 -right-1.5 min-w-[19px] h-[19px] px-1 rounded-full font-mono font-black text-[10px] flex items-center justify-center shadow-lg border border-slate-900 ${
              isOpenPage
                ? 'bg-slate-950 text-amber-400 border-amber-400'
                : 'bg-gradient-to-r from-red-500 to-amber-500 text-white shadow-red-500/30 animate-pulse'
            }`}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};
