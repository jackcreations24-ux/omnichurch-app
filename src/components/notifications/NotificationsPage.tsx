import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  Search,
  ArrowLeft,
  Calendar,
  Megaphone,
  CheckCircle2,
  Layers,
  Clock,
  ExternalLink,
  ChevronRight,
  Eye,
  EyeOff,
  Radio,
  Share2,
  X,
  AlertTriangle,
  Info,
  MessageSquare,
  ShieldAlert,
  BadgeCheck,
  Send,
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
} from '../../services/notificationCenterService';
import { getAnnouncementsByChurch } from '../../utils/storage';
import { hasActiveChurchLicense } from '../../utils/developerStorage';

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
  // Set cards ("tarjetas") as default view mode in notifications
  const [viewMode, setViewMode] = useState<'messages' | 'cards'>('cards');
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);

  // Verification privilege: only churches with an active license receive verified status badge
  const isChurchLicensed = useMemo(() => hasActiveChurchLicense(church.id), [church.id]);

  // Invisible Pull-to-Refresh State & Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const startYRef = useRef<number>(0);
  const isRefreshingRef = useRef<boolean>(false);

  const handleClose = onClose || onBack || (() => {});

  const isEs = language === 'es';
  const isEn = language === 'en';
  const isFr = language === 'fr';

  // Load all notifications
  const reloadNotifications = useCallback((overrideAnnouncements?: Announcement[]) => {
    const freshAnnouncements = overrideAnnouncements || getAnnouncementsByChurch(church.id);
    const effectiveAnnouncements = freshAnnouncements.length > 0 ? freshAnnouncements : announcements;
    const list = getContextualNotifications({
      church,
      member,
      announcements: effectiveAnnouncements,
      services,
      attendanceRecords,
      language: (language as Language) || 'ht',
    });
    setNotifications(list);
  }, [church, member, announcements, services, attendanceRecords, language]);

  // Invisible Pull-to-Refresh Trigger Action
  const triggerRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;

    try {
      // Subtle tactile feedback on supported devices (silent confirmation)
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(15);
        } catch (_) {}
      }

      // 1. Call parent refresh handler if provided
      if (onRefresh) {
        await onRefresh();
      }

      // 2. Fetch fresh announcements from church storage
      const freshAnnouncements = getAnnouncementsByChurch(church.id);

      // 3. Re-calculate contextual notifications
      reloadNotifications(freshAnnouncements);

      // 4. Dispatch global event so badges across the entire app stay synchronized
      window.dispatchEvent(new Event('omnichurch_notifications_updated'));
    } finally {
      setTimeout(() => {
        isRefreshingRef.current = false;
        setPullDistance(0);
      }, 250);
    }
  }, [church.id, onRefresh, reloadNotifications]);

  // Touch Gesture Listeners (Mobile Pull-to-Refresh)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const isAtTop = window.scrollY <= 2;
    if (isAtTop) {
      isDraggingRef.current = true;
      startYRef.current = e.touches[0].clientY;
    } else {
      isDraggingRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || isRefreshingRef.current) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startYRef.current;

    // Pulling down while at top
    if (deltaY > 0 && window.scrollY <= 2) {
      // Damped resistance curve for smooth native feel
      const distance = Math.min(deltaY * 0.38, 60);
      setPullDistance(distance);
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    if (pullDistance >= 38) {
      triggerRefresh();
    } else {
      setPullDistance(0);
    }
  };

  // Pointer Listeners (Desktop / Trackpad Drag)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if (window.scrollY <= 2) {
      isDraggingRef.current = true;
      startYRef.current = e.clientY;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || isRefreshingRef.current) return;
    const deltaY = e.clientY - startYRef.current;
    if (deltaY > 0 && window.scrollY <= 2) {
      const distance = Math.min(deltaY * 0.35, 55);
      setPullDistance(distance);
    } else {
      setPullDistance(0);
    }
  };

  const handlePointerUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    if (pullDistance >= 38) {
      triggerRefresh();
    } else {
      setPullDistance(0);
    }
  };

  const handlePointerCancel = () => {
    isDraggingRef.current = false;
    setPullDistance(0);
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
  }, [reloadNotifications]);

  const unreadCount = getUnreadNotificationsCount(notifications);

  // Filter and search
  const filteredList = useMemo(() => {
    return notifications.filter((notif) => {
      // Filter by category
      if (activeFilter === 'unread' && notif.read) return false;
      if (activeFilter !== 'all' && activeFilter !== 'unread' && notif.type !== activeFilter) {
        return false;
      }

      // Search by query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (notif.title || '').toLowerCase().includes(q);
        const matchesBody = (notif.body || '').toLowerCase().includes(q);
        const matchesAuthor = notif.author ? (notif.author || '').toLowerCase().includes(q) : false;
        return matchesTitle || matchesBody || matchesAuthor;
      }

      return true;
    });
  }, [notifications, activeFilter, searchQuery]);

  const handleMarkAllRead = () => {
    const ids = notifications.map((n) => n.id);
    markAllNotificationsAsRead(ids, church.id, member?.id || member?.memberId);
    reloadNotifications();
  };

  const handleClearRead = () => {
    const readIds = notifications.filter((n) => n.read).map((n) => n.id);
    if (readIds.length === 0) return;
    clearAllNotifications(readIds, church.id, member?.id || member?.memberId);
    reloadNotifications();
  };

  const handleToggleRead = (e: React.MouseEvent, notif: AppNotification) => {
    e.stopPropagation();
    toggleNotificationRead(notif.id, church.id, member?.id || member?.memberId);
    reloadNotifications();
  };

  const handleDelete = (e: React.MouseEvent, notif: AppNotification) => {
    e.stopPropagation();
    dismissNotification(notif.id, church.id, member?.id || member?.memberId);
    reloadNotifications();
    if (selectedNotification?.id === notif.id) {
      setSelectedNotification(null);
    }
  };

  const handleCardClick = (notif: AppNotification) => {
    if (!notif.read) {
      markNotificationAsRead(notif.id, church.id, member?.id || member?.memberId);
      reloadNotifications();
    }
    setSelectedNotification(notif);
  };

  const handleActionClick = (notif: AppNotification) => {
    if (!notif.read) {
      markNotificationAsRead(notif.id, church.id, member?.id || member?.memberId);
      reloadNotifications();
    }
    if (notif.actionTarget) {
      if (onNavigateToTarget) {
        onNavigateToTarget(
          notif.actionTarget.announcementId ? 'announcement' :
          notif.actionTarget.serviceId ? 'service' :
          (notif.actionTarget.tab as any) || 'announcement',
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

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'official_alert':
        return <AlertTriangle className="w-5 h-5 text-amber-300 animate-pulse" />;
      case 'service_reminder':
        return <Calendar className="w-5 h-5 text-emerald-400" />;
      case 'attendance':
        return <CheckCircle2 className="w-5 h-5 text-cyan-400" />;
      case 'interaction':
        return <Radio className="w-5 h-5 text-purple-400" />;
      case 'system':
        return <Layers className="w-5 h-5 text-rose-400" />;
      default:
        return <Megaphone className="w-5 h-5 text-amber-400" />;
    }
  };

  const getIconBackground = (type: AppNotification['type']) => {
    switch (type) {
      case 'official_alert':
        return 'bg-red-500/20 border-amber-400/50 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.3)]';
      case 'service_reminder':
        return 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300';
      case 'attendance':
        return 'bg-cyan-500/15 border-cyan-400/30 text-cyan-300';
      case 'interaction':
        return 'bg-purple-500/15 border-purple-400/30 text-purple-300';
      case 'system':
        return 'bg-rose-500/15 border-rose-400/30 text-rose-300';
      default:
        return 'bg-amber-400/15 border-amber-400/30 text-amber-300';
    }
  };

  const officialAlertsCount = notifications.filter((n) => n.type === 'official_alert').length;

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
    ...(officialAlertsCount > 0
      ? [
          {
            id: 'official_alert' as NotificationCategoryFilter,
            label: isEs ? '⚠️ Avisos Oficiales' : isFr ? '⚠️ Avis Officiels' : isEn ? '⚠️ Official Warnings' : '⚠️ Avètisman Ofisyèl',
            count: officialAlertsCount,
          },
        ]
      : []),
    {
      id: 'announcement',
      label: isEs ? 'Avisos & Comunicados' : isFr ? 'Annonces & Bulletins' : isEn ? 'Announcements' : 'Anons & Kominike',
    },
    {
      id: 'service_reminder',
      label: isEs ? 'Cultos & Recordatorios' : isFr ? 'Cultes & Rappels' : isEn ? 'Services & Reminders' : 'Sèvis & Rapèl',
    },
    {
      id: 'attendance',
      label: isEs ? 'Asistencia' : isFr ? 'Présences' : isEn ? 'Attendance' : 'Prezans',
    },
  ];

  return (
    <div
      ref={containerRef}
      id="notifications-page-view"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      style={{
        transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : 'none',
        transition: pullDistance === 0 ? 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none',
        willChange: pullDistance > 0 ? 'transform' : 'auto',
      }}
      className="space-y-6 pb-12 max-w-5xl mx-auto touch-pan-y"
    >
      {/* =========================================================================
          1. HEADER - iOS 27 ULTRA ADVANCED FROSTED GLASS BAR
          ========================================================================= */}
      <div
        className="rounded-3xl p-5 sm:p-6 ios-glass-card relative overflow-hidden text-slate-100 shadow-2xl"
        style={{
          background: 'radial-gradient(130% 120% at 50% 0%, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.96) 100%)',
          backdropFilter: 'blur(30px) saturate(190%)',
          WebkitBackdropFilter: 'blur(30px) saturate(190%)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
        }}
      >
        {/* Specular Highlight */}
        <div className="absolute inset-x-12 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              id="btn-back-from-notifications"
              onClick={handleClose}
              className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
              title={isEs ? 'Volver' : isFr ? 'Retour' : isEn ? 'Go Back' : 'Tounen'}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 shrink-0" />
                  <span className="truncate">
                    {isEs
                      ? 'Centro de Notificaciones'
                      : isFr
                      ? 'Centre de Notifications'
                      : isEn
                      ? 'Notification Center'
                      : 'Sant Notifikasyon & Alèt'}
                  </span>
                </h1>
                {unreadCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-300 text-slate-950 font-black text-xs font-mono shadow-md shadow-amber-400/20 shrink-0">
                    {unreadCount} {isEs ? 'nuevas' : isFr ? 'nouvelles' : isEn ? 'new' : 'nouvo'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-white flex items-center gap-1">
                  <span>{church.name}</span>
                  {isChurchLicensed && (
                    <BadgeCheck
                      className="w-3.5 h-3.5 text-sky-400 shrink-0"
                      title={isEs ? 'Iglesia con Licencia Verificada' : 'Legliz verifye ak lisans ofisyèl'}
                    />
                  )}
                </span>
                <span>•</span>
                <span>
                  {isEs
                    ? 'Todos los avisos de cultos, confirmaciones de asistencia y comunicaciones oficiales.'
                    : isFr
                    ? 'Toutes les alertes de cultes, présences et communications officielles.'
                    : isEn
                    ? 'All service alerts, attendance logs, and official church announcements.'
                    : 'Tout alèt kilt, konfimasyon prezans ak kominikasyon ofisyèl legliz la.'}
                </span>
              </p>
            </div>
          </div>

          {/* Quick Global Actions & View Mode Toggle */}
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-950/70 border border-white/10">
              <button
                type="button"
                id="btn-view-mode-messages"
                onClick={() => setViewMode('messages')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'messages'
                    ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={isEs ? 'Modo Mensajes' : isFr ? 'Mode Messages' : isEn ? 'Message View' : 'Wè kòmsi se mesaj'}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{isEs ? 'Mensajes' : isFr ? 'Messages' : isEn ? 'Messages' : 'Fil Mesaj'}</span>
              </button>
              <button
                type="button"
                id="btn-view-mode-cards"
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={isEs ? 'Modo Tarjetas' : isFr ? 'Mode Cartes' : isEn ? 'Card View' : 'Lis Kat'}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{isEs ? 'Tarjetas' : isFr ? 'Cartes' : isEn ? 'Cards' : 'Kat'}</span>
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                id="btn-mark-all-read-full-page"
                onClick={handleMarkAllRead}
                className="px-3.5 py-2 rounded-xl bg-white/8 hover:bg-white/15 border border-white/15 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <CheckCheck className="w-4 h-4 text-amber-400" />
                <span>{isEs ? 'Marcar todo leído' : isFr ? 'Tout marquer lu' : isEn ? 'Mark all as read' : 'Make tout kòm li'}</span>
              </button>
            )}

            {notifications.some((n) => n.read) && (
              <button
                type="button"
                id="btn-clear-read-notifications"
                onClick={handleClearRead}
                className="px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 hover:border-red-500/40 text-slate-400 hover:text-red-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                title={isEs ? 'Limpiar leídos' : isFr ? 'Effacer lus' : isEn ? 'Clear read' : 'Efase sa ki li yo'}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isEs ? 'Limpiar leídos' : isFr ? 'Effacer lus' : isEn ? 'Clear read' : 'Netwaye sa ki li'}</span>
              </button>
            )}
          </div>
        </div>

        {/* =========================================================================
            2. SEARCH & FILTER TABS
            ========================================================================= */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {filterTabs.map((tab) => {
              const isActive = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  id={`btn-filter-notif-${tab.id}`}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20 scale-[1.02]'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10 hover:text-white'
                  }`}
                >
                  <span>{tab.label}</span>
                  {typeof tab.count === 'number' && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                        isActive
                          ? 'bg-slate-950/20 text-slate-950'
                          : 'bg-white/10 text-slate-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-64 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              id="input-search-notifications"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isEs ? 'Buscar notificaciones...' : isFr ? 'Rechercher...' : isEn ? 'Search notifications...' : 'Chèche notifikasyon...'
              }
              className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-slate-950/60 border border-white/10 text-white placeholder:text-slate-500 text-xs focus:outline-none focus:border-amber-400 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
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
        <div
          className="rounded-3xl p-12 text-center ios-glass-card border border-white/10 text-slate-300"
          style={{
            background: 'radial-gradient(130% 120% at 50% 0%, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.8) 100%)',
          }}
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 shadow-inner">
            <Bell className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white">
            {isEs
              ? 'No hay notificaciones en este filtro'
              : isFr
              ? 'Aucune notification dans ce filtre'
              : isEn
              ? 'No notifications found'
              : 'Pa gen notifikasyon nan kategori sa a'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? isEs
                ? 'Intente modificar el texto de búsqueda.'
                : isFr
                ? 'Essayez de modifier votre recherche.'
                : isEn
                ? 'Try adjusting your search criteria.'
                : 'Eseye chanje mo w ap chèche a.'
              : isEs
              ? 'Las notificaciones de cultos, avisos de líderes y asistencias aparecerán automáticamente aquí.'
              : isFr
              ? 'Les notifications de cultes et d’annonces apparaîtront automatiquement ici.'
              : isEn
              ? 'Service alerts, ministry announcements, and scan records will automatically appear here.'
              : 'Tout rapèl kilt ak nouvo anons legliz la ap parèt otomatikman isit la.'}
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-4 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              {isEs ? 'Borrar búsqueda' : isFr ? 'Effacer la recherche' : isEn ? 'Clear search' : 'Efase rechèch'}
            </button>
          )}
        </div>
      ) : viewMode === 'messages' ? (
        /* =========================================================================
           3A. CONVERSATIONAL MESSAGES FEED ("kòmsi se mesaj")
           ========================================================================= */
        <div className="space-y-4">
          {filteredList.map((notif) => {
            const isOfficialWarning = notif.type === 'official_alert' || notif.priority === 'urgent';
            const authorName = notif.author || `${church.name} (Ofisyèl)`;

            return (
              <div
                key={notif.id}
                id={`notification-message-${notif.id}`}
                className="flex items-start gap-3 sm:gap-4 group transition-all"
              >
                {/* 1. Sender Avatar */}
                <div className="relative shrink-0 pt-1">
                  {church.logoUrl ? (
                    <img
                      src={church.logoUrl}
                      alt={authorName}
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border shadow-md ring-1 ring-white/10 ${
                        isOfficialWarning
                          ? 'border-amber-400 ring-2 ring-red-500/40'
                          : 'border-indigo-400/40'
                      }`}
                    />
                  ) : (
                    <div
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-black text-xs text-white shadow-md ring-1 ring-white/10 ${
                        isOfficialWarning
                          ? 'bg-gradient-to-br from-red-600 via-amber-600 to-slate-900 border border-amber-400'
                          : 'bg-gradient-to-br from-indigo-600 via-purple-600 to-amber-500'
                      }`}
                    >
                      {church.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  {/* Verified / Active Status Dot */}
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-950 ${
                      isOfficialWarning
                        ? 'bg-amber-400 animate-pulse'
                        : notif.type === 'service_reminder'
                        ? 'bg-emerald-400'
                        : isChurchLicensed
                        ? 'bg-sky-400'
                        : 'bg-slate-500'
                    }`}
                    title={isOfficialWarning ? 'Avètisman Ofisyèl' : isChurchLicensed ? 'Verifye (Legliz ak Lisans)' : 'Aktif'}
                  />
                </div>

                {/* 2. Chat Message Bubble */}
                <div className="flex-1 min-w-0 max-w-3xl">
                  {/* Sender Metadata Bar */}
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="font-bold text-white text-xs sm:text-sm flex items-center gap-1">
                      <span>{authorName}</span>
                      {isChurchLicensed && (
                        <BadgeCheck
                          className="w-3.5 h-3.5 text-sky-400 shrink-0"
                          title={isEs ? 'Verificado (Iglesia con Licencia)' : isFr ? 'Vérifié (Église sous Licence)' : isEn ? 'Verified (Licensed Church)' : 'Verifye (Legliz ki gen Lisans)'}
                        />
                      )}
                    </span>

                    {/* Official Warning / Category Badge */}
                    {isOfficialWarning ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-red-600 to-amber-500 text-white shadow-sm flex items-center gap-1 border border-amber-300/40">
                        <AlertTriangle className="w-3 h-3 text-white animate-pulse" />
                        <span>
                          {isEs
                            ? 'AVISO OFICIAL DIRECTO'
                            : isFr
                            ? 'AVIS OFFICIEL DIRECT'
                            : isEn
                            ? 'OFFICIAL DIRECT NOTICE'
                            : 'AVÈTISMAN OFISYÈL DIRECT'}
                        </span>
                      </span>
                    ) : (
                      notif.badgeText && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 text-slate-300 border border-white/10">
                          {notif.badgeText}
                        </span>
                      )
                    )}

                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {notif.createdAt ? notif.createdAt.replace('T', ' ').slice(0, 16) : ''}
                    </span>
                  </div>

                  {/* Message Bubble Geometry */}
                  <div
                    onClick={() => handleCardClick(notif)}
                    className={`rounded-2xl sm:rounded-3xl rounded-tl-sm sm:rounded-tl-md p-4 sm:p-5 relative overflow-hidden transition-all duration-200 cursor-pointer border ${
                      isOfficialWarning
                        ? 'bg-gradient-to-br from-red-950/60 via-slate-900/95 to-amber-950/40 border-amber-400/60 shadow-[0_12px_35px_rgba(239,68,68,0.2)]'
                        : !notif.read
                        ? 'bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-800/80 border-amber-400/40 shadow-[0_8px_25px_rgba(251,191,36,0.1)]'
                        : 'bg-slate-900/85 hover:bg-slate-900 border-white/10'
                    }`}
                    style={{
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                    }}
                  >
                    {/* Official Warning Top Ribbon */}
                    {isOfficialWarning && (
                      <div className="mb-2.5 pb-2 border-b border-amber-400/30 flex items-center justify-between gap-2 text-amber-300 font-bold text-xs">
                        <div className="flex items-center gap-1.5">
                          <ShieldAlert className="w-4 h-4 text-amber-400" />
                          <span>
                            {isEs
                              ? 'Comunicación Oficial de la Iglesia'
                              : isFr
                              ? 'Communication Officielle de l’Église'
                              : isEn
                              ? 'Official Church Leadership Notice'
                              : 'Kominikasyon & Avètisman Direksyon Legliz la'}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400/20 text-amber-200 border border-amber-400/30">
                          {isEs ? 'CONFIDENCIAL / MIEMBROS' : 'POU TOUT MANM'}
                        </span>
                      </div>
                    )}

                    {/* Message Subject / Title */}
                    <h3
                      className={`text-sm sm:text-base leading-snug ${
                        isOfficialWarning
                          ? 'font-black text-amber-200'
                          : !notif.read
                          ? 'font-black text-white'
                          : 'font-bold text-slate-200'
                      }`}
                    >
                      {notif.title}
                    </h3>

                    {/* Message Body */}
                    <p className="text-xs sm:text-sm text-slate-200 mt-2 whitespace-pre-line leading-relaxed">
                      {notif.body}
                    </p>

                    {/* Embedded Action Attachment Card inside Message */}
                    {notif.actionTarget && (
                      <div className="mt-3.5 pt-3 border-t border-white/10">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActionClick(notif);
                          }}
                          className={`w-full sm:w-auto px-4 py-2 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-95 ${
                            isOfficialWarning
                              ? 'bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-slate-950 shadow-amber-400/20'
                              : 'bg-white/10 hover:bg-white/15 border border-white/15 text-white'
                          }`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>
                            {notif.actionTarget.tab === 'services'
                              ? isEs
                                ? 'Abrir Culto & Registrar Asistencia'
                                : isFr
                                ? 'Ouvrir le Culte & Confirmer Présence'
                                : isEn
                                ? 'Open Service & Check-in'
                                : 'Louvri Kilt la & Eskane Prezans'
                              : isEs
                              ? 'Ver Anuncio Completo'
                              : isFr
                              ? 'Voir l’Annonce Complète'
                              : isEn
                              ? 'View Full Post'
                              : 'Wè Piblikasyon an nan Fil la'}
                          </span>
                        </button>
                      </div>
                    )}

                    {/* Message Status & Read Receipts Bar */}
                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center gap-2">
                        {notif.read ? (
                          <span className="flex items-center gap-1 text-slate-400 font-medium">
                            <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                            <span>{isEs ? 'Leído' : isFr ? 'Lu' : isEn ? 'Read' : 'Li'}</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-300 font-black">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                            <span>{isEs ? 'Nuevo mensaje' : isFr ? 'Nouveau message' : isEn ? 'New message' : 'Nouvo mesaj'}</span>
                          </span>
                        )}
                      </div>

                      {/* Quick Message Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleToggleRead(e, notif)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title={notif.read ? (isEs ? 'Marcar no leído' : 'Make kòm pa li') : (isEs ? 'Marcar leído' : 'Make kòm li')}
                        >
                          {notif.read ? <EyeOff className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5 text-amber-400" />}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, notif)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-300 transition-colors cursor-pointer"
                          title={isEs ? 'Eliminar mensaje' : isFr ? 'Supprimer' : isEn ? 'Delete' : 'Efase mesaj'}
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
           3B. CLASSIC CARDS VIEW
           ========================================================================= */
        <div className="space-y-3">
          {filteredList.map((notif) => (
            <div
              key={notif.id}
              id={`notification-card-${notif.id}`}
              onClick={() => handleCardClick(notif)}
              className={`rounded-2xl sm:rounded-3xl p-4 sm:p-5 transition-all duration-200 cursor-pointer relative overflow-hidden border ${
                !notif.read
                  ? 'bg-gradient-to-r from-slate-900/95 via-slate-900/90 to-amber-950/20 border-amber-400/40 shadow-[0_8px_25px_rgba(251,191,36,0.08)]'
                  : 'bg-slate-900/75 hover:bg-slate-900/90 border-white/8 hover:border-white/15'
              }`}
              style={{
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
            >
              {/* Unread Glow Indicator */}
              {!notif.read && (
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-amber-500 shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
              )}

              <div className="flex items-start justify-between gap-3 sm:gap-4">
                {/* Left Type Icon */}
                <div
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl border flex items-center justify-center shrink-0 shadow-sm ${getIconBackground(
                    notif.type
                  )}`}
                >
                  {getNotificationIcon(notif.type)}
                </div>

                {/* Center Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {notif.priority === 'urgent' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-red-400" />
                        {isEs ? 'Urgente' : isFr ? 'Urgent' : isEn ? 'Urgent' : 'Ijan'}
                      </span>
                    )}
                    {notif.badgeText && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 text-slate-300 border border-white/10">
                        {notif.badgeText}
                      </span>
                    )}
                    {notif.author && (
                      <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                        <span>{notif.author}</span>
                        {isChurchLicensed && (
                          <BadgeCheck
                            className="w-3.5 h-3.5 text-sky-400 shrink-0"
                            title={isEs ? 'Verificado (Iglesia con Licencia)' : isFr ? 'Vérifié (Église sous Licence)' : isEn ? 'Verified (Licensed Church)' : 'Verifye (Legliz ki gen Lisans)'}
                          />
                        )}
                      </span>
                    )}
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {notif.createdAt ? notif.createdAt.replace('T', ' ').slice(0, 16) : ''}
                    </span>
                  </div>

                  <h3
                    className={`text-sm sm:text-base leading-snug ${
                      !notif.read ? 'font-black text-white' : 'font-bold text-slate-200'
                    }`}
                  >
                    {notif.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-300 mt-1 whitespace-pre-line leading-relaxed line-clamp-3">
                    {notif.body}
                  </p>

                  {/* Bottom Action bar if available */}
                  {notif.actionTarget && (
                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActionClick(notif);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/30 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          {notif.actionTarget.tab === 'services'
                            ? isEs
                              ? 'Ver Culto / Asistencia'
                              : isFr
                              ? 'Voir le Culte'
                              : isEn
                              ? 'View Service'
                              : 'Gade Sèvis la / Eskane'
                            : isEs
                            ? 'Ver Publicación en Noticias'
                            : isFr
                            ? 'Voir l’Annonce'
                            : isEn
                            ? 'View Announcement'
                            : 'Gade Anons la nan Fil la'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-1 shrink-0 self-start">
                  <button
                    type="button"
                    onClick={(e) => handleToggleRead(e, notif)}
                    className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title={
                      notif.read
                        ? isEs
                          ? 'Marcar como no leído'
                          : isFr
                          ? 'Marquer non lu'
                          : isEn
                          ? 'Mark as unread'
                          : 'Make kòm pa li'
                        : isEs
                        ? 'Marcar como leído'
                        : isFr
                        ? 'Marquer comme lu'
                        : isEn
                        ? 'Mark as read'
                        : 'Make kòm li'
                    }
                  >
                    {notif.read ? (
                      <EyeOff className="w-4 h-4 text-slate-400" />
                    ) : (
                      <Check className="w-4 h-4 text-amber-400" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, notif)}
                    className="p-2 rounded-xl hover:bg-red-500/20 text-slate-400 hover:text-red-300 transition-colors cursor-pointer"
                    title={isEs ? 'Eliminar notificación' : isFr ? 'Supprimer' : isEn ? 'Delete' : 'Efase notifikasyon'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =========================================================================
          4. NOTIFICATION DETAIL POPUP MODAL (WHEN CLICKED)
          ========================================================================= */}
      <AnimatePresence>
        {selectedNotification && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg rounded-3xl ios-glass-card p-6 shadow-2xl relative border border-white/15"
              style={{
                background: 'radial-gradient(130% 120% at 50% 0%, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.99) 100%)',
              }}
            >
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 shadow-sm ${getIconBackground(
                      selectedNotification.type
                    )}`}
                  >
                    {getNotificationIcon(selectedNotification.type)}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                      {selectedNotification.badgeText || 'Notifikasyon'}
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-white mt-1 leading-snug">
                      {selectedNotification.title}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedNotification(null)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 space-y-3">
                <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {selectedNotification.createdAt ? selectedNotification.createdAt.replace('T', ' ').slice(0, 16) : ''}
                  </span>
                  {selectedNotification.author && (
                    <>
                      <span>•</span>
                      <span>{selectedNotification.author}</span>
                    </>
                  )}
                </div>

                <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line bg-black/20 p-4 rounded-2xl border border-white/5">
                  {selectedNotification.body}
                </p>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, selectedNotification)}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-red-950/40 border border-slate-700 hover:border-red-500/40 text-slate-400 hover:text-red-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isEs ? 'Eliminar' : isFr ? 'Supprimer' : isEn ? 'Delete' : 'Efase'}</span>
                </button>

                <div className="flex items-center gap-2">
                  {selectedNotification.actionTarget && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = selectedNotification.actionTarget;
                        setSelectedNotification(null);
                        if (target && onNavigateToTab) {
                          onNavigateToTab(target.tab || 'home', {
                            announcementId: target.announcementId,
                            serviceId: target.serviceId,
                          });
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-400/20 transition-all cursor-pointer transform active:scale-95"
                    >
                      <ExternalLink className="w-4 h-4 text-slate-950" />
                      <span>{isEs ? 'Ir a la publicación' : isFr ? 'Ouvrir' : isEn ? 'Open Post' : 'Ouvri kounye a'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedNotification(null)}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    {isEs ? 'Cerrar' : isFr ? 'Fermer' : isEn ? 'Close' : 'Fèmen'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
