import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Search,
  ArrowLeft,
  Calendar,
  Megaphone,
  CheckCircle2,
  Layers,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Radio,
  X,
  AlertTriangle,
  MessageSquare,
  ShieldAlert,
  BadgeCheck,
  MailOpen,
  Mail,
  BookOpen,
  Type,
} from 'lucide-react';
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
  markNotificationAsRead,
  toggleNotificationRead,
  markAllNotificationsAsRead,
  dismissNotification,
  clearAllNotifications,
  syncNotificationReadStatesFromCloud,
  getNotificationReadAt,
  formatNotificationTimestamp,
  getNotificationTextSizePreference,
  saveNotificationTextSizePreference,
  NotificationTextSize,
} from '../../services/notificationCenterService';
import { getAnnouncementsByChurch } from '../../utils/storage';
import { hasActiveChurchLicense } from '../../utils/developerStorage';
import { subscribeToMemberNotifications } from '../../services/firestoreService';
import { PosterLightboxModal } from '../common/PosterLightboxModal';

interface NotificationsPageProps {
  church: Church;
  member?: Member | null;
  userRole?: 'admin' | 'member';
  announcements: Announcement[];
  services: ServiceSession[];
  attendanceRecords?: AttendanceRecord[];
  language?: Language;
  onClose?: () => void;
  onBack?: () => void;
  onNavigateToTarget?: (
    target?: 'announcement' | 'service' | 'attendance' | 'members' | 'cards' | 'system',
    targetId?: string
  ) => void;
  onNavigateToTab?: (tab: string, extra?: { announcementId?: string; serviceId?: string }) => void;
  onRefresh?: () => Promise<void> | void;
}

type NotificationCategoryFilter =
  | 'all'
  | 'unread'
  | 'read'
  | 'official_alert'
  | 'announcement'
  | 'service_reminder'
  | 'attendance'
  | 'system';

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  church,
  member,
  userRole = 'member',
  announcements,
  services,
  attendanceRecords = [],
  language = 'ht',
  onClose,
  onBack,
  onNavigateToTarget,
  onNavigateToTab,
  onRefresh,
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeFilter, setActiveFilter] = useState<NotificationCategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'messages' | 'cards'>('cards');
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const [textSize, setTextSize] = useState<NotificationTextSize>(() => getNotificationTextSizePreference());
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string; caption?: string } | null>(null);

  const isChurchLicensed = useMemo(() => hasActiveChurchLicense(church.id), [church.id]);

  // Pull-to-refresh gesture refs
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const startYRef = useRef<number>(0);
  const pullDeltaRef = useRef<number>(0);
  const isRefreshingRef = useRef<boolean>(false);

  const handleClose = onClose || onBack || (() => {});

  const isEs = language === 'es';
  const isEn = language === 'en';
  const isFr = language === 'fr';
  const resolvedLang: Language = (language as Language) || 'ht';
  const memberKey = member?.id || member?.memberId;

  const showFeedback = useCallback((msg: string) => {
    setFeedbackMessage(msg);
  }, []);

  useEffect(() => {
    if (!feedbackMessage) return;
    const timer = window.setTimeout(() => setFeedbackMessage(null), 2600);
    return () => window.clearTimeout(timer);
  }, [feedbackMessage]);

  // Load all notifications (strictly excluded for admin)
  const reloadNotifications = useCallback(
    (overrideAnnouncements?: Announcement[]) => {
      if (userRole === 'admin' || !member) {
        setNotifications([]);
        return;
      }
      const effectiveAnnouncements =
        overrideAnnouncements && overrideAnnouncements.length > 0
          ? overrideAnnouncements
          : announcements.length > 0
          ? announcements
          : getAnnouncementsByChurch(church.id);

      const list = getContextualNotifications({
        church,
        member,
        userRole,
        announcements: effectiveAnnouncements,
        services,
        attendanceRecords,
        language: resolvedLang,
      });
      setNotifications(list);
    },
    [church, member, userRole, announcements, services, attendanceRecords, resolvedLang]
  );

  // Bidirectional real-time Firestore notifications listener (Web <-> Android parity)
  useEffect(() => {
    if (userRole === 'admin' || !member || !church?.id) return;
    const unsub = subscribeToMemberNotifications(church.id, member, church, (fsNotifs) => {
      syncNotificationReadStatesFromCloud(fsNotifs, church.id, member);
      reloadNotifications();
    });
    return () => unsub();
  }, [church, member, userRole, reloadNotifications]);

  // Pull-to-refresh trigger
  const triggerRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(15);
        } catch {}
      }
      if (onRefresh) {
        await onRefresh();
      }
      const freshAnnouncements = getAnnouncementsByChurch(church.id);
      reloadNotifications(freshAnnouncements);
      window.dispatchEvent(new Event('omnichurch_notifications_updated'));
    } finally {
      window.setTimeout(() => {
        isRefreshingRef.current = false;
        pullDeltaRef.current = 0;
      }, 250);
    }
  }, [church.id, onRefresh, reloadNotifications]);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (window.scrollY <= 2) {
      isDraggingRef.current = true;
      startYRef.current = e.touches[0].clientY;
      pullDeltaRef.current = 0;
    } else {
      isDraggingRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || isRefreshingRef.current) return;
    const deltaY = e.touches[0].clientY - startYRef.current;
    pullDeltaRef.current = deltaY > 0 && window.scrollY <= 2 ? Math.min(deltaY * 0.4, 60) : 0;
  };

  const handleTouchEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    if (pullDeltaRef.current >= 38) {
      triggerRefresh();
    }
    pullDeltaRef.current = 0;
  };

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
  const readCount = notifications.length - unreadCount;
  const officialAlertsCount = useMemo(
    () => notifications.filter((n) => n.type === 'official_alert').length,
    [notifications]
  );

  // Filter and search
  const filteredList = useMemo(() => {
    return notifications.filter((notif) => {
      if (activeFilter === 'unread' && notif.read) return false;
      if (activeFilter === 'read' && !notif.read) return false;
      if (
        activeFilter !== 'all' &&
        activeFilter !== 'unread' &&
        activeFilter !== 'read' &&
        notif.type !== activeFilter
      ) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (notif.title || '').toLowerCase().includes(q);
        const matchesBody = (notif.body || '').toLowerCase().includes(q);
        const matchesAuthor = notif.author ? notif.author.toLowerCase().includes(q) : false;
        return matchesTitle || matchesBody || matchesAuthor;
      }

      return true;
    });
  }, [notifications, activeFilter, searchQuery]);

  // Derive live selected notification (never stale!)
  const selectedNotification = useMemo(
    () => notifications.find((n) => n.id === selectedNotificationId) || null,
    [notifications, selectedNotificationId]
  );

  // Index within filteredList (or all notifications) for Prev/Next reading
  const readerNavigationList = useMemo(() => {
    if (selectedNotificationId && filteredList.some((n) => n.id === selectedNotificationId)) {
      return filteredList;
    }
    return notifications;
  }, [filteredList, notifications, selectedNotificationId]);

  const selectedIndex = useMemo(() => {
    if (!selectedNotificationId) return -1;
    return readerNavigationList.findIndex((n) => n.id === selectedNotificationId);
  }, [readerNavigationList, selectedNotificationId]);

  // Close modal with Escape & navigate with ArrowLeft / ArrowRight when reader is open
  useEffect(() => {
    if (!selectedNotificationId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedNotificationId(null);
      } else if (e.key === 'ArrowRight' && selectedIndex >= 0 && selectedIndex < readerNavigationList.length - 1) {
        const nextNotif = readerNavigationList[selectedIndex + 1];
        if (!nextNotif.read) {
          markNotificationAsRead(nextNotif.id, church.id, memberKey, member);
          reloadNotifications();
        }
        setSelectedNotificationId(nextNotif.id);
      } else if (e.key === 'ArrowLeft' && selectedIndex > 0) {
        const prevNotif = readerNavigationList[selectedIndex - 1];
        if (!prevNotif.read) {
          markNotificationAsRead(prevNotif.id, church.id, memberKey, member);
          reloadNotifications();
        }
        setSelectedNotificationId(prevNotif.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNotificationId, selectedIndex, readerNavigationList, church.id, memberKey, member, reloadNotifications]);

  const handleChangeTextSize = (size: NotificationTextSize) => {
    setTextSize(size);
    saveNotificationTextSizePreference(size);
  };

  const handleMarkAllRead = () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    markAllNotificationsAsRead(unreadIds, church.id, memberKey, member);
    reloadNotifications();
    showFeedback(
      isEs
        ? 'Todas las notificaciones marcadas como leídas.'
        : isFr
        ? 'Toutes les notifications sont marquées comme lues.'
        : isEn
        ? 'All notifications marked as read.'
        : 'Tout notifikasyon yo make kòm li.'
    );
  };

  const handleClearRead = () => {
    const readIds = notifications.filter((n) => n.read).map((n) => n.id);
    if (readIds.length === 0) return;
    clearAllNotifications(readIds, church.id, memberKey, member);
    if (selectedNotificationId && readIds.includes(selectedNotificationId)) {
      setSelectedNotificationId(null);
    }
    reloadNotifications();
    showFeedback(
      isEs
        ? 'Notificaciones leídas eliminadas de la vista.'
        : isFr
        ? 'Notifications lues retirées de la liste.'
        : isEn
        ? 'Read notifications cleared.'
        : 'Notifikasyon ki deja li yo netwaye.'
    );
  };

  const handleToggleRead = (e: React.MouseEvent, notif: AppNotification) => {
    e.stopPropagation();
    const nowRead = toggleNotificationRead(notif.id, church.id, memberKey, member);
    reloadNotifications();
    showFeedback(
      nowRead
        ? isEs
          ? 'Marcado como leído.'
          : isFr
          ? 'Marqué comme lu.'
          : isEn
          ? 'Marked as read.'
          : 'Make kòm li.'
        : isEs
        ? 'Marcado como no leído.'
        : isFr
        ? 'Marqué comme non lu.'
        : isEn
        ? 'Marked as unread.'
        : 'Make kòm pa li.'
    );
  };

  const handleDelete = (e: React.MouseEvent, notif: AppNotification) => {
    e.stopPropagation();
    dismissNotification(notif.id, church.id, memberKey, member);
    if (selectedNotificationId === notif.id) {
      setSelectedNotificationId(null);
    }
    reloadNotifications();
  };

  const handleCardClick = (notif: AppNotification) => {
    if (!notif.read) {
      markNotificationAsRead(notif.id, church.id, memberKey, member);
      reloadNotifications();
    }
    setSelectedNotificationId(notif.id);
  };

  const handleStepReader = (direction: -1 | 1) => {
    const targetIdx = selectedIndex + direction;
    if (targetIdx < 0 || targetIdx >= readerNavigationList.length) return;
    const nextNotif = readerNavigationList[targetIdx];
    if (!nextNotif.read) {
      markNotificationAsRead(nextNotif.id, church.id, memberKey, member);
      reloadNotifications();
    }
    setSelectedNotificationId(nextNotif.id);
  };

  const handleActionClick = (notif: AppNotification) => {
    if (!notif.read) {
      markNotificationAsRead(notif.id, church.id, memberKey, member);
      reloadNotifications();
    }
    setSelectedNotificationId(null);
    if (notif.actionTarget) {
      if (onNavigateToTarget) {
        onNavigateToTarget(
          notif.actionTarget.announcementId
            ? 'announcement'
            : notif.actionTarget.serviceId
            ? 'service'
            : ((notif.actionTarget.tab as any) || 'announcement'),
          notif.actionTarget.announcementId || notif.actionTarget.serviceId
        );
      } else if (onNavigateToTab) {
        onNavigateToTab(notif.actionTarget.tab || 'home', {
          announcementId: notif.actionTarget.announcementId,
          serviceId: notif.actionTarget.serviceId,
        });
      }
    }
  };

  // Typography scale classes based on reading comfort preference
  const titleSizeClass =
    textSize === 'large'
      ? 'text-base sm:text-lg'
      : textSize === 'compact'
      ? 'text-sm'
      : 'text-sm sm:text-base';

  const bodySizeClass =
    textSize === 'large'
      ? 'text-[15px] sm:text-base leading-7'
      : textSize === 'compact'
      ? 'text-xs sm:text-[13px] leading-relaxed'
      : 'text-[13px] sm:text-[15px] leading-relaxed';

  const modalBodySizeClass =
    textSize === 'large'
      ? 'text-base sm:text-[17px] leading-8'
      : textSize === 'compact'
      ? 'text-sm leading-6'
      : 'text-[15px] sm:text-base leading-7';

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'official_alert':
        return <AlertTriangle className="w-5 h-5 text-amber-300" />;
      case 'service_reminder':
        return <Calendar className="w-5 h-5 text-emerald-400" />;
      case 'attendance':
        return <CheckCircle2 className="w-5 h-5 text-sky-400" />;
      case 'interaction':
        return <Radio className="w-5 h-5 text-indigo-300" />;
      case 'system':
        return <Layers className="w-5 h-5 text-rose-400" />;
      default:
        return <Megaphone className="w-5 h-5 text-amber-400" />;
    }
  };

  const getIconBackground = (type: AppNotification['type']) => {
    switch (type) {
      case 'official_alert':
        return 'bg-red-500/15 border-amber-400/40 text-amber-300';
      case 'service_reminder':
        return 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300';
      case 'attendance':
        return 'bg-sky-500/15 border-sky-400/30 text-sky-300';
      case 'interaction':
        return 'bg-indigo-500/15 border-indigo-400/30 text-indigo-300';
      case 'system':
        return 'bg-rose-500/15 border-rose-400/30 text-rose-300';
      default:
        return 'bg-amber-400/15 border-amber-400/30 text-amber-300';
    }
  };

  const filterTabs: { id: NotificationCategoryFilter; label: string; count?: number }[] = [
    {
      id: 'all',
      label: isEs ? 'Todas' : isFr ? 'Toutes' : isEn ? 'All' : 'Tout',
      count: notifications.length,
    },
    {
      id: 'unread',
      label: isEs ? 'Sin leer' : isFr ? 'Non lues' : isEn ? 'Unread' : 'Pa li',
      count: unreadCount,
    },
    {
      id: 'read',
      label: isEs ? 'Leídas' : isFr ? 'Lues' : isEn ? 'Read' : 'Deja li',
      count: readCount,
    },
    ...(officialAlertsCount > 0
      ? [
          {
            id: 'official_alert' as NotificationCategoryFilter,
            label: isEs
              ? 'Avisos Oficiales'
              : isFr
              ? 'Avis Officiels'
              : isEn
              ? 'Official Notices'
              : 'Avètisman Ofisyèl',
            count: officialAlertsCount,
          },
        ]
      : []),
    {
      id: 'announcement',
      label: isEs ? 'Anuncios' : isFr ? 'Annonces' : isEn ? 'Announcements' : 'Anons',
    },
    {
      id: 'service_reminder',
      label: isEs ? 'Cultos' : isFr ? 'Cultes' : isEn ? 'Services' : 'Sèvis',
    },
    {
      id: 'attendance',
      label: isEs ? 'Asistencia' : isFr ? 'Présences' : isEn ? 'Attendance' : 'Prezans',
    },
  ];

  const getReadActionLabel = (isRead: boolean) => {
    if (isRead) {
      return isEs
        ? 'Marcar no leído'
        : isFr
        ? 'Marquer non lu'
        : isEn
        ? 'Mark unread'
        : 'Make pa li';
    }
    return isEs
      ? 'Marcar leído'
      : isFr
      ? 'Marquer lu'
      : isEn
      ? 'Mark read'
      : 'Make li';
  };

  const getOpenActionLabel = (notif: AppNotification) => {
    if (notif.actionTarget?.tab === 'services') {
      return isEs
        ? 'Abrir culto y asistencia'
        : isFr
        ? 'Ouvrir le culte'
        : isEn
        ? 'Open service & check-in'
        : 'Louvri kilt la';
    }
    if (notif.actionTarget?.tab === 'attendance') {
      return isEs
        ? 'Ver mi asistencia'
        : isFr
        ? 'Voir mes présences'
        : isEn
        ? 'View attendance'
        : 'Wè prezans mwen';
    }
    return isEs
      ? 'Ver publicación completa'
      : isFr
      ? 'Voir la publication'
      : isEn
      ? 'View full post'
      : 'Wè anons la nan fil la';
  };

  const selectedReadAt = selectedNotification
    ? getNotificationReadAt(selectedNotification.id, church.id, memberKey, member)
    : undefined;

  return (
    <div
      ref={containerRef}
      id="notifications-page-view"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="space-y-6 pb-12 max-w-5xl mx-auto touch-pan-y"
    >
      {/* =========================================================================
          1. HEADER & READING CONTROLS
          ========================================================================= */}
      <div className="rounded-3xl p-5 sm:p-6 bg-[#0F172A]/95 border border-slate-700/70 text-slate-100 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <button
              type="button"
              id="btn-back-from-notifications"
              onClick={handleClose}
              className="p-2.5 min-h-[42px] min-w-[42px] rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 hover:text-white transition-colors cursor-pointer flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              title={isEs ? 'Volver' : isFr ? 'Retour' : isEn ? 'Go Back' : 'Tounen'}
              aria-label={isEs ? 'Volver' : isFr ? 'Retour' : isEn ? 'Go Back' : 'Tounen'}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 shrink-0" />
                  <span className="truncate">
                    {isEs
                      ? 'Centro de Notificaciones'
                      : isFr
                      ? 'Centre de Notifications'
                      : isEn
                      ? 'Notification Center'
                      : 'Sant Notifikasyon'}
                  </span>
                </h1>
              </div>

              <div className="text-xs sm:text-sm text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-200 inline-flex items-center gap-1">
                  <span>{church.name}</span>
                  {isChurchLicensed && (
                    <span
                      title={
                        isEs
                          ? 'Iglesia con Licencia Verificada'
                          : isFr
                          ? 'Église vérifiée sous licence'
                          : isEn
                          ? 'Licensed verified church'
                          : 'Legliz verifye ak lisans ofisyèl'
                      }
                    >
                      <BadgeCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    </span>
                  )}
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums font-medium text-amber-300">
                  {unreadCount}{' '}
                  {isEs ? 'sin leer' : isFr ? 'non lues' : isEn ? 'unread' : 'pa li'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums text-slate-400">
                  {readCount} {isEs ? 'leídas' : isFr ? 'lues' : isEn ? 'read' : 'deja li'}
                </span>
              </div>
            </div>
          </div>

          {/* Reading Controls & Bulk Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Reading Comfort Text Size Control */}
            <div
              className="flex items-center gap-0.5 p-1 rounded-xl bg-[#07152F] border border-slate-700/80"
              role="group"
              aria-label={
                isEs
                  ? 'Tamaño de lectura'
                  : isFr
                  ? 'Taille de lecture'
                  : isEn
                  ? 'Reading text size'
                  : 'Gwosè tèks pou lekti'
              }
            >
              <span className="px-2 text-slate-400 flex items-center" aria-hidden="true">
                <Type className="w-3.5 h-3.5" />
              </span>
              {(
                [
                  { id: 'compact', label: 'A-' },
                  { id: 'normal', label: 'A' },
                  { id: 'large', label: 'A+' },
                ] as { id: NotificationTextSize; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  id={`btn-notif-text-${opt.id}`}
                  onClick={() => handleChangeTextSize(opt.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    textSize === opt.id
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-0.5 p-1 rounded-xl bg-[#07152F] border border-slate-700/80">
              <button
                type="button"
                id="btn-view-mode-cards"
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  viewMode === 'cards'
                    ? 'bg-amber-400 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{isEs ? 'Tarjetas' : isFr ? 'Cartes' : isEn ? 'Cards' : 'Kat'}</span>
              </button>
              <button
                type="button"
                id="btn-view-mode-messages"
                onClick={() => setViewMode('messages')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  viewMode === 'messages'
                    ? 'bg-amber-400 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{isEs ? 'Mensajes' : isFr ? 'Messages' : isEn ? 'Messages' : 'Fil Mesaj'}</span>
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                id="btn-mark-all-read-full-page"
                onClick={handleMarkAllRead}
                className="px-3.5 py-2 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-200 hover:text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <CheckCheck className="w-4 h-4 text-amber-400" />
                <span>
                  {isEs
                    ? 'Marcar todo leído'
                    : isFr
                    ? 'Tout marquer lu'
                    : isEn
                    ? 'Mark all read'
                    : 'Make tout kòm li'}
                </span>
              </button>
            )}

            {readCount > 0 && (
              <button
                type="button"
                id="btn-clear-read-notifications"
                onClick={handleClearRead}
                className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-red-950/50 border border-slate-700 hover:border-red-500/40 text-slate-300 hover:text-red-200 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                title={
                  isEs
                    ? 'Limpiar leídos'
                    : isFr
                    ? 'Effacer les lues'
                    : isEn
                    ? 'Clear read'
                    : 'Netwaye sa ki deja li yo'
                }
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {isEs
                    ? 'Limpiar leídos'
                    : isFr
                    ? 'Effacer lues'
                    : isEn
                    ? 'Clear read'
                    : 'Netwaye sa ki li'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Inline Action Feedback Confirmation */}
        {feedbackMessage && (
          <div
            role="status"
            aria-live="polite"
            className="mt-3 px-3.5 py-2 rounded-xl bg-sky-500/10 border border-sky-400/30 text-sky-200 text-xs font-medium flex items-center justify-between gap-2"
          >
            <span className="flex items-center gap-2">
              <CheckCheck className="w-4 h-4 text-sky-400 shrink-0" />
              <span>{feedbackMessage}</span>
            </span>
            <button
              type="button"
              onClick={() => setFeedbackMessage(null)}
              className="text-sky-300 hover:text-white cursor-pointer"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* =========================================================================
            2. FILTER SEGMENTED BAR & SEARCH
            ========================================================================= */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {filterTabs.map((tab) => {
              const isActive = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  id={`btn-filter-notif-${tab.id}`}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 border border-slate-700/70 hover:text-white'
                  }`}
                >
                  <span>{tab.label}</span>
                  {typeof tab.count === 'number' && (
                    <span
                      className={`font-mono tabular-nums text-[11px] ${
                        isActive ? 'text-slate-900 font-bold' : 'text-slate-400'
                      }`}
                    >
                      ({tab.count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-64 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              id="input-search-notifications"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isEs
                  ? 'Buscar notificaciones...'
                  : isFr
                  ? 'Rechercher...'
                  : isEn
                  ? 'Search notifications...'
                  : 'Chèche notifikasyon...'
              }
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#07152F] border border-slate-700/80 text-white placeholder:text-slate-500 text-xs focus:outline-none focus:border-amber-400 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. NOTIFICATIONS LIST
          ========================================================================= */}
      {filteredList.length === 0 ? (
        <div className="rounded-3xl p-10 sm:p-12 text-center bg-[#0F172A]/85 border border-slate-800 text-slate-300">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
            {activeFilter === 'unread' ? (
              <CheckCheck className="w-7 h-7 text-sky-400" />
            ) : (
              <Bell className="w-7 h-7 text-slate-400" />
            )}
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white">
            {activeFilter === 'unread'
              ? isEs
                ? '¡Estás al día! No hay mensajes sin leer.'
                : isFr
                ? 'Vous êtes à jour ! Aucune notification non lue.'
                : isEn
                ? 'You are all caught up! No unread notifications.'
                : 'Ou ajou ! Pa gen okenn notifikasyon ki poko li.'
              : isEs
              ? 'No hay notificaciones en este filtro'
              : isFr
              ? 'Aucune notification dans ce filtre'
              : isEn
              ? 'No notifications in this filter'
              : 'Pa gen notifikasyon nan kategori sa a'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-md mx-auto leading-relaxed">
            {searchQuery
              ? isEs
                ? 'Intenta modificar el texto de búsqueda.'
                : isFr
                ? 'Essayez de modifier votre recherche.'
                : isEn
                ? 'Try adjusting your search criteria.'
                : 'Eseye chanje mo w ap chèche a.'
              : activeFilter === 'unread' && notifications.length > 0
              ? isEs
                ? 'Puedes revisar tus mensajes leídos en la pestaña "Todas" o "Leídas".'
                : isFr
                ? 'Vous pouvez consulter les notifications déjà lues dans « Toutes » ou « Lues ».'
                : isEn
                ? 'You can review previously read items under "All" or "Read".'
                : 'Ou kapab revize mesaj ou deja li yo nan onglet "Tout" oswa "Deja li".'
              : isEs
              ? 'Las notificaciones de cultos, avisos de líderes y asistencias aparecerán automáticamente aquí.'
              : isFr
              ? 'Les notifications de cultes et d’annonces apparaîtront automatiquement ici.'
              : isEn
              ? 'Service alerts, ministry announcements, and attendance confirmations will appear here automatically.'
              : 'Tout rapèl kilt, nouvo anons ak konfimasyon prezans ap parèt otomatikman isit la.'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                {isEs ? 'Borrar búsqueda' : isFr ? 'Effacer la recherche' : isEn ? 'Clear search' : 'Efase rechèch'}
              </button>
            )}
            {activeFilter !== 'all' && notifications.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
              >
                {isEs ? 'Ver todas' : isFr ? 'Voir toutes' : isEn ? 'Show all' : 'Wè tout notifikasyon yo'}
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'messages' ? (
        /* =========================================================================
           3A. CONVERSATIONAL MESSAGES FEED
           ========================================================================= */
        <div className="space-y-4">
          {filteredList.map((notif) => {
            const isOfficialWarning = notif.type === 'official_alert' || notif.priority === 'urgent';
            const authorName = notif.author || church.name;
            const ts = formatNotificationTimestamp(notif.createdAt, resolvedLang);
            const readAtIso = notif.read
              ? getNotificationReadAt(notif.id, church.id, memberKey, member)
              : undefined;
            const readAtFormatted = readAtIso
              ? formatNotificationTimestamp(readAtIso, resolvedLang)
              : null;

            return (
              <div
                key={notif.id}
                id={`notification-message-${notif.id}`}
                className="flex items-start gap-3 sm:gap-4"
              >
                {/* Sender Avatar */}
                <div className="shrink-0 pt-1">
                  {church.logoUrl ? (
                    <img
                      src={church.logoUrl}
                      alt={authorName}
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border ${
                        isOfficialWarning ? 'border-amber-400' : 'border-slate-700'
                      }`}
                    />
                  ) : (
                    <div
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-bold text-xs text-white border ${
                        isOfficialWarning
                          ? 'bg-amber-600/30 border-amber-400/60 text-amber-200'
                          : 'bg-[#07152F] border-slate-700 text-amber-300'
                      }`}
                    >
                      {church.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Message Content */}
                <div className="flex-1 min-w-0 max-w-3xl">
                  {/* Unboxed Clean Metadata Header */}
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap text-xs text-slate-400">
                    <span className="font-semibold text-white inline-flex items-center gap-1">
                      <span>{authorName}</span>
                      {isChurchLicensed && (
                        <span
                          title={
                            isEs
                              ? 'Verificado'
                              : isFr
                              ? 'Vérifié'
                              : isEn
                              ? 'Verified'
                              : 'Verifye'
                          }
                        >
                          <BadgeCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        </span>
                      )}
                    </span>
                    {notif.badgeText && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            isOfficialWarning ? 'text-amber-300 font-semibold' : 'text-slate-300'
                          }
                        >
                          {notif.badgeText}
                        </span>
                      </>
                    )}
                    {ts.relative && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums text-slate-400" title={ts.full}>
                          {ts.relative}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Message Card */}
                  <div
                    onClick={() => handleCardClick(notif)}
                    className={`rounded-2xl rounded-tl-sm p-4 sm:p-5 transition-colors duration-200 cursor-pointer border ${
                      isOfficialWarning
                        ? 'bg-[#1a1625]/95 border-amber-400/50 hover:border-amber-400/80'
                        : !notif.read
                        ? 'bg-[#0F172A] border-amber-400/40 hover:border-amber-400/70'
                        : 'bg-[#0F172A]/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {isOfficialWarning && (
                      <div className="mb-2.5 pb-2 border-b border-amber-400/20 flex items-center gap-2 text-amber-300 font-semibold text-xs">
                        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>
                          {isEs
                            ? 'Comunicación Oficial de la Iglesia'
                            : isFr
                            ? 'Communication Officielle de l’Église'
                            : isEn
                            ? 'Official Church Leadership Notice'
                            : 'Kominikasyon Ofisyèl Direksyon Legliz la'}
                        </span>
                      </div>
                    )}

                    <h3
                      className={`${titleSizeClass} leading-snug ${
                        isOfficialWarning
                          ? 'font-bold text-amber-200'
                          : !notif.read
                          ? 'font-bold text-white'
                          : 'font-semibold text-slate-300'
                      }`}
                    >
                      {notif.title}
                    </h3>

                    <p
                      className={`${bodySizeClass} mt-2 whitespace-pre-line ${
                        !notif.read ? 'text-slate-100' : 'text-slate-300'
                      }`}
                    >
                      {notif.body}
                    </p>

                    {notif.imageUrl && (
                      <div className="mt-3 overflow-hidden rounded-xl border border-slate-700/70 bg-black/30">
                        <img
                          src={notif.imageUrl}
                          alt={notif.title}
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxImage({
                              url: notif.imageUrl!,
                              title: notif.title,
                              caption: notif.imageCaption,
                            });
                          }}
                          className="w-full max-h-64 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                        />
                      </div>
                    )}

                    {notif.actionTarget && (
                      <div className="mt-4 pt-3 border-t border-slate-800/80">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActionClick(notif);
                          }}
                          className={`px-4 py-2 rounded-xl font-semibold text-xs inline-flex items-center gap-2 transition-colors cursor-pointer ${
                            isOfficialWarning
                              ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold'
                              : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white'
                          }`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>{getOpenActionLabel(notif)}</span>
                        </button>
                      </div>
                    )}

                    {/* Status & Read/Unread Actions Bar */}
                    <div className="mt-3.5 pt-2.5 border-t border-slate-800/70 flex items-center justify-between gap-2 flex-wrap text-xs">
                      <div className="flex items-center gap-2">
                        {notif.read ? (
                          <span className="inline-flex items-center gap-1.5 text-sky-400 font-medium">
                            <CheckCheck className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {isEs ? 'Leído' : isFr ? 'Lu' : isEn ? 'Read' : 'Deja li'}
                            </span>
                            {readAtFormatted?.relative && (
                              <span className="text-slate-500 font-mono tabular-nums text-[11px]">
                                · {readAtFormatted.relative}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-amber-300 font-semibold">
                            <Mail className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {isEs
                                ? 'No leído'
                                : isFr
                                ? 'Non lu'
                                : isEn
                                ? 'Unread'
                                : 'Poko li'}
                            </span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => handleToggleRead(e, notif)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          title={getReadActionLabel(notif.read)}
                        >
                          {notif.read ? (
                            <MailOpen className="w-3.5 h-3.5 text-slate-300" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-amber-400" />
                          )}
                          <span>{getReadActionLabel(notif.read)}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, notif)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-300 transition-colors cursor-pointer"
                          title={
                            isEs
                              ? 'Eliminar mensaje'
                              : isFr
                              ? 'Supprimer'
                              : isEn
                              ? 'Delete'
                              : 'Efase'
                          }
                          aria-label={
                            isEs
                              ? 'Eliminar mensaje'
                              : isFr
                              ? 'Supprimer'
                              : isEn
                              ? 'Delete'
                              : 'Efase'
                          }
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* =========================================================================
           3B. CLASSIC CARDS VIEW (OPTIMIZED FOR LEGIBILITY & QUICK READING)
           ========================================================================= */
        <div className="space-y-3">
          {filteredList.map((notif) => {
            const ts = formatNotificationTimestamp(notif.createdAt, resolvedLang);
            const isLongBody = (notif.body || '').length > 180;
            const readAtIso = notif.read
              ? getNotificationReadAt(notif.id, church.id, memberKey, member)
              : undefined;
            const readAtFormatted = readAtIso
              ? formatNotificationTimestamp(readAtIso, resolvedLang)
              : null;

            return (
              <div
                key={notif.id}
                id={`notification-card-${notif.id}`}
                onClick={() => handleCardClick(notif)}
                className={`rounded-2xl p-4 sm:p-5 transition-colors duration-200 cursor-pointer border ${
                  !notif.read
                    ? 'bg-[#0F172A] border-amber-400/45 hover:border-amber-400/75 shadow-sm'
                    : 'bg-[#0F172A]/65 hover:bg-[#0F172A]/85 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  {/* Left Type Icon */}
                  <div
                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl border flex items-center justify-center shrink-0 ${getIconBackground(
                      notif.type
                    )}`}
                  >
                    {getNotificationIcon(notif.type)}
                  </div>

                  {/* Center Content */}
                  <div className="flex-1 min-w-0">
                    {/* Clean Unboxed Metadata Row */}
                    <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400 mb-1.5">
                      {!notif.read ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-300">
                          <Mail className="w-3 h-3 shrink-0" />
                          <span>
                            {isEs ? 'Sin leer' : isFr ? 'Non lu' : isEn ? 'Unread' : 'Poko li'}
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-medium text-sky-400">
                          <CheckCheck className="w-3.5 h-3.5 shrink-0" />
                          <span>{isEs ? 'Leído' : isFr ? 'Lu' : isEn ? 'Read' : 'Deja li'}</span>
                        </span>
                      )}

                      {notif.badgeText && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              notif.priority === 'urgent'
                                ? 'text-amber-300 font-semibold'
                                : 'text-slate-300 font-medium'
                            }
                          >
                            {notif.badgeText}
                          </span>
                        </>
                      )}

                      {notif.author && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-300 inline-flex items-center gap-1">
                            <span>{notif.author}</span>
                            {isChurchLicensed && (
                              <span
                                title={
                                  isEs
                                    ? 'Verificado'
                                    : isFr
                                    ? 'Vérifié'
                                    : isEn
                                    ? 'Verified'
                                    : 'Verifye'
                                }
                              >
                                <BadgeCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                              </span>
                            )}
                          </span>
                        </>
                      )}

                      {ts.relative && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span
                            className="font-mono tabular-nums text-slate-400 inline-flex items-center gap-1"
                            title={ts.full}
                          >
                            <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                            {ts.relative}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Title */}
                    <h3
                      className={`${titleSizeClass} leading-snug ${
                        !notif.read ? 'font-bold text-white' : 'font-semibold text-slate-300'
                      }`}
                    >
                      {notif.title}
                    </h3>

                    {/* Body */}
                    <p
                      className={`${bodySizeClass} mt-1.5 whitespace-pre-line line-clamp-3 ${
                        !notif.read ? 'text-slate-200' : 'text-slate-400'
                      }`}
                    >
                      {notif.body}
                    </p>

                    {/* Footer Action Row */}
                    <div className="mt-3.5 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCardClick(notif);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 hover:text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                          <span>
                            {isLongBody
                              ? isEs
                                ? 'Leer completo'
                                : isFr
                                ? 'Lire en entier'
                                : isEn
                                ? 'Read full message'
                                : 'Li tout mesaj la'
                              : isEs
                              ? 'Abrir lectura'
                              : isFr
                              ? 'Ouvrir'
                              : isEn
                              ? 'Read'
                              : 'Ouvri pou li'}
                          </span>
                        </button>

                        {notif.actionTarget && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleActionClick(notif);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/35 text-amber-200 hover:text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                            <span>{getOpenActionLabel(notif)}</span>
                          </button>
                        )}
                      </div>

                      {readAtFormatted?.relative && (
                        <span className="text-[11px] font-mono tabular-nums text-slate-500">
                          {isEs ? 'Leído' : isFr ? 'Lu' : isEn ? 'Read' : 'Li'} ·{' '}
                          {readAtFormatted.relative}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Quick Actions */}
                  <div className="flex flex-col sm:flex-row items-center gap-1 shrink-0 self-start">
                    <button
                      type="button"
                      id={`btn-toggle-read-${notif.id}`}
                      onClick={(e) => handleToggleRead(e, notif)}
                      className={`p-2 min-h-[36px] min-w-[36px] rounded-xl border transition-colors cursor-pointer flex items-center justify-center ${
                        notif.read
                          ? 'bg-slate-800/60 hover:bg-slate-700 border-slate-700/70 text-slate-300 hover:text-white'
                          : 'bg-amber-400/15 hover:bg-amber-400/25 border-amber-400/40 text-amber-300'
                      }`}
                      title={getReadActionLabel(notif.read)}
                      aria-label={getReadActionLabel(notif.read)}
                    >
                      {notif.read ? (
                        <MailOpen className="w-4 h-4" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, notif)}
                      className="p-2 min-h-[36px] min-w-[36px] rounded-xl bg-slate-800/40 hover:bg-red-500/20 border border-transparent hover:border-red-500/30 text-slate-400 hover:text-red-300 transition-colors cursor-pointer flex items-center justify-center"
                      title={
                        isEs
                          ? 'Eliminar notificación'
                          : isFr
                          ? 'Supprimer'
                          : isEn
                          ? 'Delete'
                          : 'Efase notifikasyon'
                      }
                      aria-label={
                        isEs
                          ? 'Eliminar notificación'
                          : isFr
                          ? 'Supprimer'
                          : isEn
                          ? 'Delete'
                          : 'Efase notifikasyon'
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          4. NOTIFICATION READER MODAL (COMFORTABLE READING + PREV/NEXT + READ TOGGLE)
          ========================================================================= */}
      <AnimatePresence>
        {selectedNotification && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setSelectedNotificationId(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-reader-title"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl rounded-3xl bg-[#0F172A] border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Top Header */}
              <div className="p-5 sm:p-6 pb-4 border-b border-slate-800 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${getIconBackground(
                      selectedNotification.type
                    )}`}
                  >
                    {getNotificationIcon(selectedNotification.type)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400 mb-1">
                      {selectedNotification.read ? (
                        <span className="inline-flex items-center gap-1 text-sky-400 font-semibold">
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>{isEs ? 'Leído' : isFr ? 'Lu' : isEn ? 'Read' : 'Deja li'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-300 font-semibold">
                          <Mail className="w-3.5 h-3.5" />
                          <span>{isEs ? 'No leído' : isFr ? 'Non lu' : isEn ? 'Unread' : 'Poko li'}</span>
                        </span>
                      )}
                      {selectedNotification.badgeText && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-300 font-medium">
                            {selectedNotification.badgeText}
                          </span>
                        </>
                      )}
                      {selectedIndex >= 0 && readerNavigationList.length > 1 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums text-slate-400">
                            {selectedIndex + 1} / {readerNavigationList.length}
                          </span>
                        </>
                      )}
                    </div>
                    <h3
                      id="notification-reader-title"
                      className="text-base sm:text-xl font-bold text-white leading-snug"
                    >
                      {selectedNotification.title}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedNotificationId(null)}
                  className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                  aria-label={isEs ? 'Cerrar' : isFr ? 'Fermer' : isEn ? 'Close' : 'Fèmen'}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Meta + Text Size Strip */}
              <div className="px-5 sm:px-6 py-3 bg-[#07152F]/70 border-b border-slate-800/80 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                  <span className="font-mono tabular-nums inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {formatNotificationTimestamp(selectedNotification.createdAt, resolvedLang).full}
                  </span>
                  {selectedNotification.author && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-200 font-medium">
                        {selectedNotification.author}
                      </span>
                    </>
                  )}
                  {selectedReadAt && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-sky-400 font-mono tabular-nums">
                        {isEs ? 'Leído' : isFr ? 'Lu' : isEn ? 'Read' : 'Li'}{' '}
                        {formatNotificationTimestamp(selectedReadAt, resolvedLang).relative}
                      </span>
                    </>
                  )}
                </div>

                {/* Inline Text Size Switcher */}
                <div className="flex items-center gap-1">
                  {(
                    [
                      { id: 'compact', label: 'A-' },
                      { id: 'normal', label: 'A' },
                      { id: 'large', label: 'A+' },
                    ] as { id: NotificationTextSize; label: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleChangeTextSize(opt.id)}
                      className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                        textSize === opt.id
                          ? 'bg-amber-400 text-slate-950 font-bold'
                          : 'bg-slate-800/80 text-slate-300 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrollable Reading Body */}
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
                {(selectedNotification.department ||
                  (selectedNotification.targetAudience &&
                    selectedNotification.targetAudience !== 'Tout moun')) && (
                  <div className="flex items-center gap-2 flex-wrap text-xs text-slate-300">
                    {selectedNotification.department && (
                      <span className="text-indigo-300 font-semibold">
                        {selectedNotification.department}
                      </span>
                    )}
                    {selectedNotification.targetAudience &&
                      selectedNotification.targetAudience !== 'Tout moun' && (
                        <span className="text-amber-300 font-medium">
                          {isEs ? 'Dirigido a:' : isFr ? 'Pour :' : isEn ? 'Audience:' : 'Konsène:'}{' '}
                          {selectedNotification.targetAudience}
                        </span>
                      )}
                  </div>
                )}

                <p
                  className={`${modalBodySizeClass} text-slate-100 whitespace-pre-line max-w-[68ch]`}
                >
                  {selectedNotification.body}
                </p>

                {selectedNotification.imageUrl && (
                  <div className="rounded-2xl overflow-hidden border border-slate-700/80 bg-black/40">
                    <img
                      src={selectedNotification.imageUrl}
                      alt={selectedNotification.title}
                      onClick={() =>
                        setLightboxImage({
                          url: selectedNotification.imageUrl!,
                          title: selectedNotification.title,
                          caption: selectedNotification.imageCaption,
                        })
                      }
                      className="w-full max-h-80 object-contain mx-auto cursor-pointer hover:opacity-95 transition-opacity"
                    />
                    {selectedNotification.imageCaption && (
                      <div className="px-4 py-2 bg-slate-950/80 text-xs text-slate-300 text-center">
                        {selectedNotification.imageCaption}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer Controls */}
              <div className="p-4 sm:p-5 border-t border-slate-800 bg-[#07152F]/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Left: Prev/Next & Toggle Read/Unread + Delete */}
                <div className="flex items-center gap-2 flex-wrap">
                  {readerNavigationList.length > 1 && (
                    <div className="flex items-center gap-1 mr-1">
                      <button
                        type="button"
                        disabled={selectedIndex <= 0}
                        onClick={() => handleStepReader(-1)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition-colors cursor-pointer"
                        title={isEs ? 'Anterior' : isFr ? 'Précédent' : isEn ? 'Previous' : 'Anvan'}
                        aria-label={isEs ? 'Anterior' : isFr ? 'Précédent' : isEn ? 'Previous' : 'Anvan'}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={selectedIndex < 0 || selectedIndex >= readerNavigationList.length - 1}
                        onClick={() => handleStepReader(1)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition-colors cursor-pointer"
                        title={isEs ? 'Siguiente' : isFr ? 'Suivant' : isEn ? 'Next' : 'Swivan'}
                        aria-label={isEs ? 'Siguiente' : isFr ? 'Suivant' : isEn ? 'Next' : 'Swivan'}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    id="btn-modal-toggle-read"
                    onClick={(e) => handleToggleRead(e, selectedNotification)}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {selectedNotification.read ? (
                      <MailOpen className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Check className="w-4 h-4 text-sky-400" />
                    )}
                    <span>{getReadActionLabel(selectedNotification.read)}</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, selectedNotification)}
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-red-950/50 border border-slate-700 hover:border-red-500/40 text-slate-400 hover:text-red-300 font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{isEs ? 'Eliminar' : isFr ? 'Supprimer' : isEn ? 'Delete' : 'Efase'}</span>
                  </button>
                </div>

                {/* Right: Open Target & Close */}
                <div className="flex items-center justify-end gap-2">
                  {selectedNotification.actionTarget && (
                    <button
                      type="button"
                      id="btn-modal-open-target"
                      onClick={() => handleActionClick(selectedNotification)}
                      className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>{getOpenActionLabel(selectedNotification)}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedNotificationId(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors cursor-pointer"
                  >
                    {isEs ? 'Cerrar' : isFr ? 'Fermer' : isEn ? 'Close' : 'Fèmen'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <PosterLightboxModal
        isOpen={!!lightboxImage}
        imageUrl={lightboxImage?.url || ''}
        title={lightboxImage?.title || ''}
        caption={lightboxImage?.caption}
        language={resolvedLang}
        onClose={() => setLightboxImage(null)}
      />
    </div>
  );
};
