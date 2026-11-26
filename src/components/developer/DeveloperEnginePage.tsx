import React, { useState, useEffect, useCallback } from 'react';
import {
  Church,
  Language,
  DeveloperSettings,
  DeveloperDonationConfig,
} from '../../types';
import {
  getDeveloperSettings,
  fetchRemoteDeveloperSettings,
  saveDeveloperSettings,
  getDonationConfig,
  SUPER_DEVELOPER_EMAIL,
  isSuperDeveloperEmail,
} from '../../utils/developerStorage';
import {
  collectPendingSyncAudit,
  executePendingSyncAll,
  PendingSyncAuditSummary,
} from '../../utils/developerSyncAudit';
import { subscribeSyncStatus } from '../../utils/offlineQueue';
import { APP_BASE_VERSION } from '../../version';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../lib/firebase';
import { OmniChurchLogo } from '../common/OmniChurchLogo';
import {
  Cpu,
  Shield,
  KeyRound,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Tv,
  HeartHandshake,
  Heart,
  Building2,
  Terminal,
  ArrowLeft,
  MessageSquare,
  LayoutDashboard,
  Database,
  Radio,
  CloudUpload,
  RefreshCw,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertCircle,
  BadgeCheck,
} from 'lucide-react';
import { DevDashboardTab } from './DevDashboardTab';
import { DevChurchesTab } from './DevChurchesTab';
import { DevDatabaseTab } from './DevDatabaseTab';
import { DevBroadcastsTab } from './DevBroadcastsTab';
import { DevUpdatesTab } from './DevUpdatesTab';
import { DevLicensesTab } from './DevLicensesTab';
import { DevDonationsTab } from './DevDonationsTab';
import { DevAdMobTab } from './DevAdMobTab';
import { DevSponsorsTab } from './DevSponsorsTab';
import { DevModerationTab } from './DevModerationTab';
import { DevVerificationTab } from './DevVerificationTab';
import { DevSecurityTab } from './DevSecurityTab';
import {
  getAllStoredComments,
  EnrichedStoredComment,
} from '../../utils/storage';

export interface DeveloperEnginePageProps {
  isOpen?: boolean;
  onClose: () => void;
  allChurches: Church[];
  currentChurch: Church | null;
  language?: Language;
  onRefreshChurches?: () => void;
  onSelectChurch?: (church: Church) => void;
  onOpenPrivacyPolicy?: () => void;
  onOpenTermsOfService?: () => void;
  onLanguageChange?: (lang: Language) => void;
}

export const DeveloperEnginePage = ({
  isOpen = true,
  onClose,
  allChurches = [],
  currentChurch,
  language = 'ht',
  onRefreshChurches,
  onSelectChurch,
  onOpenPrivacyPolicy,
  onOpenTermsOfService,
  onLanguageChange,
}: DeveloperEnginePageProps) => {
  const toast = useToast();
  const { googleUser, developerUser, isEmailVerified, signInSuperDeveloperWithGoogle } = useAuth();
  const liveAuthUser = auth.currentUser;
  const activeDevAuthUser = developerUser || googleUser;
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);
  const liveAuthEmail = (liveAuthUser?.email || activeDevAuthUser?.email || '').trim().toLowerCase();
  const isSuperDevGoogleAuthed = Boolean(
    liveAuthUser &&
    isSuperDeveloperEmail(liveAuthEmail) &&
    (Boolean(liveAuthUser.emailVerified) || isEmailVerified)
  );
  const [activeTab, setActiveTab] = useState<
    | 'dashboard'
    | 'sync_audit'
    | 'churches'
    | 'attendance'
    | 'database'
    | 'broadcasts'
    | 'updates'
    | 'licenses'
    | 'donations'
    | 'admob'
    | 'sponsors'
    | 'moderation'
    | 'verification'
    | 'security'
  >(() => {
    try {
      const savedTab = localStorage.getItem('omnichurch_dev_active_tab_v1');
      if (savedTab) return savedTab as any;
    } catch {
      // ignore
    }
    return 'dashboard';
  });

  useEffect(() => {
    try {
      localStorage.setItem('omnichurch_dev_active_tab_v1', activeTab);
    } catch {
      // ignore
    }
  }, [activeTab]);

  const [settings, setSettings] = useState<DeveloperSettings>(() => getDeveloperSettings());
  const [donationConfig, setDonationConfig] = useState<DeveloperDonationConfig>(() => getDonationConfig());
  const [commentsList, setCommentsList] = useState<EnrichedStoredComment[]>(() => getAllStoredComments());
  const [syncAudit, setSyncAudit] = useState<PendingSyncAuditSummary>({
    totalPendingTasks: 0,
    queuedCount: 0,
    failedCount: 0,
    affectedChurchCount: 0,
    pendingByChurch: {},
    items: [],
    activeChurchesCount: allChurches.length,
    archivedLegacyChurchesCount: 0,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    cloudWriteAuthorized: isSuperDevGoogleAuthed,
    cloudWriteEmail: activeDevAuthUser?.email || null,
    checkedAt: new Date().toISOString(),
  });
  const [isSyncingQueue, setIsSyncingQueue] = useState(false);
  const [isRefreshingAudit, setIsRefreshingAudit] = useState(false);
  const [showQueueDetails, setShowQueueDetails] = useState(false);

  const refreshSyncAudit = useCallback(async () => {
    try {
      const summary = await collectPendingSyncAudit(allChurches);
      setSyncAudit(summary);
    } catch (err) {
      console.warn('Could not collect pending sync audit:', err);
    }
  }, [allChurches]);

  // Reload settings and sync audit telemetry on mount and listen to real-time updates
  useEffect(() => {
    if (!isOpen) return;

    const fresh = getDeveloperSettings();
    setSettings(fresh);
    setDonationConfig(getDonationConfig());
    setCommentsList(getAllStoredComments());
    refreshSyncAudit();

    fetchRemoteDeveloperSettings().then((remote) => {
      if (remote) {
        setSettings(remote);
        setDonationConfig(getDonationConfig());
      }
    });

    const handleRemoteUpdate = (e: Event) => {
      const customEv = e as CustomEvent<DeveloperSettings>;
      if (customEv.detail) {
        setSettings(customEv.detail);
      } else {
        setSettings(getDeveloperSettings());
      }
      setDonationConfig(getDonationConfig());
      refreshSyncAudit();
    };

    const handleSyncRelatedEvent = () => {
      refreshSyncAudit();
    };

    const unsubQueue = subscribeSyncStatus((_count, syncing) => {
      setIsSyncingQueue(syncing);
      refreshSyncAudit();
    });

    window.addEventListener('omnichurch_dev_settings_updated', handleRemoteUpdate);
    window.addEventListener('app_legiz_attendance_synced', handleSyncRelatedEvent);
    window.addEventListener('church_data_updated', handleSyncRelatedEvent);
    window.addEventListener('online', handleSyncRelatedEvent);
    window.addEventListener('offline', handleSyncRelatedEvent);

    return () => {
      unsubQueue();
      window.removeEventListener('omnichurch_dev_settings_updated', handleRemoteUpdate);
      window.removeEventListener('app_legiz_attendance_synced', handleSyncRelatedEvent);
      window.removeEventListener('church_data_updated', handleSyncRelatedEvent);
      window.removeEventListener('online', handleSyncRelatedEvent);
      window.removeEventListener('offline', handleSyncRelatedEvent);
    };
  }, [isOpen, currentChurch, allChurches, activeDevAuthUser, refreshSyncAudit]);

  if (!isOpen) return null;

  const isEs = language === 'es';
  const isEn = language === 'en';
  const isFr = language === 'fr';

  // Master Settings Update helper
  const handleUpdateSettings = async (updated: Partial<DeveloperSettings>) => {
    const full = { ...settings, ...updated };
    setSettings(full);
    const saveResult = await saveDeveloperSettings(full);
    if (saveResult.syncedToCloud) {
      toast.success(
        isEs ? 'Configuración Guardada' : isEn ? 'Settings Saved' : isFr ? 'Paramètres Enregistrés' : 'Konfigirasyon Sove',
        isEs
          ? 'Los cambios se han sincronizado en el servidor central y localmente.'
          : isEn
          ? 'Changes synced to the central server and local storage.'
          : isFr
          ? 'Modifications synchronisées sur le serveur central et localement.'
          : 'Chanjman yo sove sou aparèy la ak sou sèvè santral la.'
      );
    } else {
      toast.info(
        isEs ? 'Guardado Localmente' : isEn ? 'Saved Locally' : isFr ? 'Enregistré Localement' : 'Sove Lokalman Sèlman',
        isEs
          ? `Conecte su cuenta autorizada (${SUPER_DEVELOPER_EMAIL}) para guardar en el servidor central.`
          : isEn
          ? `Sign in with your authorized account (${SUPER_DEVELOPER_EMAIL}) to sync changes to the central server.`
          : isFr
          ? `Connectez votre compte autorisé (${SUPER_DEVELOPER_EMAIL}) pour synchroniser sur le serveur central.`
          : `Pou sove sou sèvè santral la, konekte ak ${SUPER_DEVELOPER_EMAIL}.`
      );
    }
    refreshSyncAudit();
  };

  const handleConnectSuperDevGoogle = async () => {
    setIsSigningInGoogle(true);
    try {
      const { user, isSuperDeveloper, emailVerified } = await signInSuperDeveloperWithGoogle();
      if (isSuperDeveloper) {
        toast.success(
          isEn ? 'System Account Connected' : 'Kont Administrasyon Konekte ✓',
          isEn
            ? 'Authorized for central system configuration updates (strictly isolated from churches).'
            : 'Kont administratè jeneral verifye pou mete ajou sèvè santral la (endepandan de tout legliz).'
        );
      } else if (isSuperDeveloperEmail(user.email) && !emailVerified) {
        toast.warning(
          isEn ? 'Email Verification Needed' : 'Imèl Kont la Poko Verifye',
          isEn
            ? 'Your developer email must be verified in Firebase Auth before central writes are allowed.'
            : 'Imèl kont Super Dev la dwe verifye nan Google/Firebase anvan sèvè a aksepte ekriti.'
        );
      } else {
        toast.warning(
          isEn ? 'Different Account Connected' : 'Lòt Kont Konekte',
          isEn
            ? `Signed in as ${user.email}. Only the authorized system account can update central settings.`
            : `Ou konekte kòm ${user.email}. Chwazi kont Google Super Dev ou a (charlesjj3186@gmail.com) pou otorize sèvè santral la.`
        );
      }
      refreshSyncAudit();
    } catch (err: unknown) {
      toast.error(
        isEn ? 'Sign-In Failed' : 'Koneksyon Echwe',
        err instanceof Error ? err.message : isEn ? 'Could not sign in.' : 'Pa t ka konekte.'
      );
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  const handleRefreshAudit = async () => {
    setIsRefreshingAudit(true);
    await refreshSyncAudit();
    if (onRefreshChurches) {
      onRefreshChurches();
    }
    setTimeout(() => {
      setIsRefreshingAudit(false);
    }, 350);
  };

  const handleTriggerPendingSync = async () => {
    if (!syncAudit.isOnline) {
      toast.warning(
        isEn ? 'Device Offline' : isFr ? 'Appareil Hors Ligne' : isEs ? 'Dispositivo Sin Conexión' : 'Aparèy la Pa Konekte',
        isEn
          ? 'Reconnect to the internet before pushing pending local tasks to the central server.'
          : isFr
          ? 'Reconnectez-vous à Internet pour synchroniser les tâches locales.'
          : isEs
          ? 'Reconéctese a internet para sincronizar las tareas locales.'
          : 'Rekonekte w sou entènèt la anvan ou voye done lokal yo sou sèvè santral la.'
      );
      return;
    }

    setIsSyncingQueue(true);
    try {
      const { syncedCount, failedCount } = await executePendingSyncAll();
      await refreshSyncAudit();
      if (syncedCount > 0 && failedCount === 0) {
        toast.success(
          isEn ? 'Pending Sync Completed' : isFr ? 'Synchronisation Terminée' : isEs ? 'Sincronización Completada' : 'Senkronizasyon Reyisi',
          isEn
            ? `${syncedCount} pending local record(s) synced to the central server.`
            : isFr
            ? `${syncedCount} tâche(s) locale(s) synchronisée(s) vers le serveur central.`
            : isEs
            ? `${syncedCount} registro(s) sincronizado(s) en el servidor central.`
            : `${syncedCount} anrejistreman lokal voye sou sèvè santral la avèk siksè.`
        );
      } else if (failedCount > 0) {
        toast.warning(
          isEn ? 'Sync Finished with Retries' : 'Senkronizasyon avèk Erè',
          isEn
            ? `${syncedCount} synced, ${failedCount} failed and remain in queue.`
            : `${syncedCount} pase, ${failedCount} echwe epi rete nan liy atant la.`
        );
      } else {
        toast.info(
          isEn ? 'Nothing to Sync' : 'Pa gen Anyen an Atant',
          isEn
            ? 'All local records are already synced with the central server.'
            : 'Tout done lokal yo deja ajou ak sèvè santral la.'
        );
      }
    } catch (err: unknown) {
      toast.error(
        isEn ? 'Sync Error' : 'Erè Senkronizasyon',
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setIsSyncingQueue(false);
    }
  };

  const handleRefreshComments = () => {
    setCommentsList(getAllStoredComments());
  };

  const navCopy = {
    pageTitle: isEs
      ? 'Panel de Administración General'
      : isEn
      ? 'System Administration Panel'
      : isFr
      ? 'Panneau d’Administration Générale'
      : 'Panèl Administrasyon Jeneral',
    versionLabel: `OmniChurch v${APP_BASE_VERSION}`,
    cloudWritePrefix: isEn ? 'Central Server:' : isFr ? 'Serveur Central :' : isEs ? 'Servidor Central:' : 'Sèvè Santral:',
    localModeBtn: isEn
      ? 'Local Mode • Connect Admin Account'
      : isFr
      ? 'Mode Local • Connecter Compte Admin'
      : isEs
      ? 'Modo Local • Conectar Cuenta Admin'
      : 'Mòd Lokal • Konekte Kont Admin',
    connectingGoogle: isEn ? 'Connecting...' : 'Ap Konekte...',
    churchesChip: isEn ? 'Churches:' : isFr ? 'Églises :' : isEs ? 'Iglesias:' : 'Legliz:',
    licensesChip: isEn ? 'Licenses:' : isFr ? 'Licences :' : isEs ? 'Licencias:' : 'Lisans:',
    exitApp: isEs ? 'Volver a la App' : isEn ? 'Exit to App' : isFr ? 'Retour à l’App' : 'Tounen nan App',
    dashboardTab: isEn ? 'Overview & Metrics' : isFr ? 'Vue Générale & Métriques' : isEs ? 'Resumen y Métricas' : 'Sant Kontwòl & Metrik',
    syncAuditTab: isEn ? 'Sync Audit' : isFr ? 'Audit Sync' : isEs ? 'Auditoría Sync' : 'Odit Senkro',
    churchesTab: isEn ? 'Churches Management' : isFr ? 'Gestion des Églises' : isEs ? 'Gestión de Iglesias' : 'Jesyon Legliz yo',
    attendanceTab: isEn ? 'Scanned Attendance' : isFr ? 'Présences Scannées' : isEs ? 'Asistencias Escaneadas' : 'Prezans Eskane',
    databaseTab: isEn ? 'Data & Diagnostics' : isFr ? 'Données & Diagnostic' : isEs ? 'Datos y Diagnóstico' : 'Baz Done & Entegrite',
    broadcastsTab: isEn ? 'Alerts & Broadcasts' : isFr ? 'Alertes & Annonces' : isEs ? 'Alertas y Comunicados' : 'Alèt & Kominike',
    updatesTab: isEn ? 'App Updates' : isFr ? 'Mises à Jour App' : isEs ? 'Actualizaciones' : 'Mizajou App',
    licensesTab: isEn ? 'Licenses & Activation' : isFr ? 'Licences & Activation' : isEs ? 'Licencias' : 'Lisans & Aktivasyon',
    donationsTab: isEn ? 'Donations & Support' : isFr ? 'Dons & Soutien' : isEs ? 'Donaciones' : 'Kont Donasyon',
    admobTab: isEn ? 'AdMob Settings' : isFr ? 'Paramètres AdMob' : isEs ? 'Configuración AdMob' : 'AdMob Anons',
    sponsorsTab: isEn ? 'Sponsor Partners' : isFr ? 'Partenaires & Sponsors' : isEs ? 'Patrocinadores' : 'Jesyon Sponsò',
    moderationTab: isEn ? 'Feed & Comments' : isFr ? 'Fil & Commentaires' : isEs ? 'Comentarios' : 'Fil & Kòmantè',
    verificationTab: isEn ? 'Member Verification' : isFr ? 'Vérification Membres' : isEs ? 'Verificar Miembros' : 'Verifye Manm',
    securityTab: isEn ? 'Security & System' : isFr ? 'Sécurité & Système' : isEs ? 'Seguridad y Sistema' : 'Sekirite & Sistèm',
    footerTitle: isEn
      ? `OmniChurch System Administration Panel v${APP_BASE_VERSION}`
      : isFr
      ? `Panneau d’Administration Générale OmniChurch v${APP_BASE_VERSION}`
      : isEs
      ? `Panel de Administración General OmniChurch v${APP_BASE_VERSION}`
      : `Panèl Administrasyon Jeneral OmniChurch v${APP_BASE_VERSION}`,
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-200 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Top Multi-Color Glow Accent Line */}
      <div className="h-1.5 bg-gradient-to-r from-amber-500 via-emerald-400 to-amber-500 shrink-0 sticky top-0 z-50" />

      {/* Top Developer Page Header */}
      <header className="bg-[#0B1120]/95 backdrop-blur-md border-b border-slate-800/90 sticky top-1.5 z-40 px-4 sm:px-6 py-2 shadow-lg shadow-black/30">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <OmniChurchLogo
              variant="icon"
              priority
              className="h-9 w-9"
            />
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight truncate">
                {navCopy.pageTitle}
              </h1>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-md bg-slate-800/90 border border-slate-700/80 text-emerald-400 text-[10px] font-mono font-bold shrink-0">
                v{APP_BASE_VERSION}
              </span>
            </div>
          </div>

          {/* Compact Auth Status & Back Button */}
          <div className="flex items-center gap-2 shrink-0">
            {isSuperDevGoogleAuthed ? (
              <span
                className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold flex items-center gap-1.5"
                title="Kont administratè jeneral verifye pou sèvè santral la"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="hidden md:inline">{navCopy.cloudWritePrefix}</span>
                <span>{isEn ? 'Verified ✓' : 'Verifye ✓'}</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleConnectSuperDevGoogle}
                disabled={isSigningInGoogle}
                className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                title="Konekte Kont Administrasyon Jeneral la pou senkronize sou sèvè a"
              >
                {isSigningInGoogle
                  ? navCopy.connectingGoogle
                  : isEn
                  ? 'Local Mode • Connect'
                  : isFr
                  ? 'Mode Local • Connecter'
                  : isEs
                  ? 'Modo Local • Conectar'
                  : 'Mòd Lokal • Konekte'}
              </button>
            )}

            <button
              type="button"
              id="btn-exit-developer-engine-page"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-xs shadow-md shadow-amber-400/15 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{navCopy.exitApp}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Sticky Navigation Tabs */}
      <div className="bg-[#090E1A]/95 backdrop-blur-md border-b border-slate-800 sticky top-[54px] z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex items-center gap-2 py-2.5 overflow-x-auto scrollbar-none">
          <button
            type="button"
            id="tab-btn-dev-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>{navCopy.dashboardTab}</span>
          </button>

          <button
            type="button"
            id="tab-btn-dev-sync-audit"
            onClick={() => setActiveTab('sync_audit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'sync_audit'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
            }`}
          >
            <CloudUpload className="w-4 h-4" />
            <span>{navCopy.syncAuditTab}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                syncAudit.totalPendingTasks > 0
                  ? 'bg-amber-500/25 text-amber-300 font-bold'
                  : 'bg-slate-950/40'
              }`}
            >
              {syncAudit.totalPendingTasks}
            </span>
          </button>

          <button
            type="button"
            id="tab-btn-dev-churches"
            onClick={() => setActiveTab('churches')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'churches'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>{navCopy.churchesTab}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/40 font-mono">
              {allChurches.length}
            </span>
          </button>

          <button
            type="button"
            id="tab-btn-dev-attendance"
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'attendance'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-purple-400" />
            <span>{navCopy.attendanceTab}</span>
          </button>

          <button
            type="button"
            id="tab-btn-dev-database"
            onClick={() => setActiveTab('database')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'database'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>{navCopy.databaseTab}</span>
          </button>

          <button
            type="button"
            id="tab-btn-dev-broadcasts"
            onClick={() => setActiveTab('broadcasts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'broadcasts'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>{navCopy.broadcastsTab}</span>
            {(settings.broadcasts || []).filter((b) => b.active).length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/30 text-rose-300 font-mono font-bold">
                {(settings.broadcasts || []).filter((b) => b.active).length}
              </span>
            )}
          </button>

          <button
            type="button"
            id="tab-btn-dev-updates"
            onClick={() => setActiveTab('updates')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'updates'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>{navCopy.updatesTab}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/40 font-mono font-bold text-amber-300">
              v{settings.appUpdate?.latestVersion || APP_BASE_VERSION}
            </span>
          </button>

          <button
            type="button"
            id="tab-btn-dev-licenses"
            onClick={() => setActiveTab('licenses')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'licenses'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>{navCopy.licensesTab}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/40 font-mono">
              {settings.licenses.length}
            </span>
          </button>

          <button
            type="button"
            id="tab-btn-dev-donations"
            onClick={() => setActiveTab('donations')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'donations'
                ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md shadow-rose-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Heart className="w-4 h-4 text-rose-400" />
            <span>{navCopy.donationsTab}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-950/60 font-bold text-rose-300">
              {donationConfig.developerName || 'Jackson Charles'}
            </span>
          </button>

          <button
            type="button"
            id="tab-btn-dev-admob"
            onClick={() => setActiveTab('admob')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'admob'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>{navCopy.admobTab}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                settings.adMob.enabled
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {settings.adMob.enabled
                ? isEn ? 'Active' : 'Aktif'
                : isEn ? 'Off' : 'Dezaktive'}
            </span>
          </button>

          <button
            type="button"
            id="tab-btn-dev-sponsors"
            onClick={() => setActiveTab('sponsors')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'sponsors'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
            }`}
          >
            <HeartHandshake className="w-4 h-4" />
            <span>{navCopy.sponsorsTab}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/40 font-mono">
              {(settings.sponsors || []).filter((s) => s.active).length}{' '}
              {isEn ? 'Active' : 'Aktif'}
            </span>
          </button>

          <button
            type="button"
            id="tab-btn-dev-moderation"
            onClick={() => {
              setCommentsList(getAllStoredComments());
              setActiveTab('moderation');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'moderation'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>{navCopy.moderationTab}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/40 font-mono">
              {commentsList.length}
            </span>
          </button>

          <button
            type="button"
            id="tab-btn-dev-verification"
            onClick={() => setActiveTab('verification')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'verification'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
            }`}
          >
            <BadgeCheck className="w-4 h-4 text-sky-400" />
            <span>{navCopy.verificationTab}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                settings.memberVerification?.enabled !== false
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              {settings.memberVerification?.enabled !== false
                ? isEn ? 'Active' : 'Aktif'
                : isEn ? 'Paused' : 'Pòz'}
            </span>
          </button>

          <button
            type="button"
            id="tab-btn-dev-security"
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'security'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>{navCopy.securityTab}</span>
          </button>
        </div>
      </div>

      {/* Main Page Body Container */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 flex-1">
        {/* TAB: PENDING SYNC & DATASET AUDIT SUMMARY (OWN DEDICATED TAB) */}
        {activeTab === 'sync_audit' && (
        <section
          aria-label={isEn ? 'Pending Sync Audit Summary' : 'Rezime Odit Senkronizasyon'}
          className="p-5 sm:p-6 rounded-3xl bg-[#0B1120] border border-slate-800 shadow-xl space-y-4"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                  syncAudit.totalPendingTasks > 0 || syncAudit.failedCount > 0
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                    : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                }`}
              >
                <CloudUpload className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-sm sm:text-base font-extrabold text-white">
                    {isEn
                      ? 'Pending Sync & Dataset Audit Summary'
                      : isFr
                      ? 'Résumé d’Audit des Synchronisations en Attente'
                      : isEs
                      ? 'Resumen de Auditoría de Sincronización Pendiente'
                      : 'Rezime Odit Senkronizasyon ak Eta Legliz yo'}
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                      syncAudit.isOnline
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {syncAudit.isOnline ? (
                      <>
                        <Wifi className="w-3 h-3" />
                        <span>{isEn ? 'Online' : isFr ? 'En Ligne' : isEs ? 'En Línea' : 'An Liy'}</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3 h-3" />
                        <span>{isEn ? 'Offline' : isFr ? 'Hors Ligne' : isEs ? 'Sin Conexión' : 'Hors Liy'}</span>
                      </>
                    )}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isEn
                    ? 'Quick overview of offline check-in queues, failed sync retries, and multi-church dataset status'
                    : isFr
                    ? 'Aperçu rapide des files d’attente locales, échecs de synchronisation et état des églises'
                    : isEs
                    ? 'Vista rápida de registros pendientes locales, reintentos fallidos y estado de iglesias'
                    : 'Gade rapidman konbyen done prezans ki an atant sou aparèy la pou voye sou sèvè santral la ak eta legliz yo'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                id="btn-dev-refresh-sync-audit"
                onClick={handleRefreshAudit}
                disabled={isRefreshingAudit}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isRefreshingAudit ? 'animate-spin' : ''}`} />
                <span>{isEn ? 'Refresh Audit' : isFr ? 'Actualiser' : isEs ? 'Actualizar' : 'Rafrechi Odit'}</span>
              </button>

              <button
                type="button"
                id="btn-dev-sync-pending-now"
                onClick={handleTriggerPendingSync}
                disabled={isSyncingQueue || syncAudit.totalPendingTasks === 0}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  syncAudit.totalPendingTasks > 0
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed'
                }`}
              >
                <CloudUpload className={`w-3.5 h-3.5 ${isSyncingQueue ? 'animate-bounce' : ''}`} />
                <span>
                  {isSyncingQueue
                    ? isEn ? 'Syncing...' : 'Ap Senkronize...'
                    : isEn ? 'Sync Pending Tasks' : isFr ? 'Synchroniser Maintenant' : isEs ? 'Sincronizar Pendientes' : 'Senkronize Kounye a'}
                </span>
              </button>
            </div>
          </div>

          {/* 4 Quick Audit Stat Tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Tile 1: Pending Attendance Syncs */}
            <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/90 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold">
                  {isEn ? 'Pending Sync Tasks' : isFr ? 'Tâches en Attente' : isEs ? 'Tareas Pendientes' : 'Tach an Atant'}
                </span>
                <Clock className={`w-4 h-4 ${syncAudit.totalPendingTasks > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <span className="text-2xl font-black font-mono text-white">
                  {syncAudit.totalPendingTasks}
                </span>
                <span
                  className={`text-[11px] font-semibold ${
                    syncAudit.totalPendingTasks > 0 ? 'text-amber-300' : 'text-emerald-400'
                  }`}
                >
                  {syncAudit.totalPendingTasks > 0
                    ? `${syncAudit.queuedCount} ${isEn ? 'queued' : 'nan liy'}`
                    : isEn ? 'All synced' : 'Tout ajou'}
                </span>
              </div>
            </div>

            {/* Tile 2: Failed Sync Retries */}
            <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/90 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold">
                  {isEn ? 'Failed Sync Retries' : isFr ? 'Échecs de Sync' : isEs ? 'Reintentos Fallidos' : 'Echèk Senkronizasyon'}
                </span>
                <AlertCircle className={`w-4 h-4 ${syncAudit.failedCount > 0 ? 'text-rose-400' : 'text-slate-500'}`} />
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <span className={`text-2xl font-black font-mono ${syncAudit.failedCount > 0 ? 'text-rose-400' : 'text-white'}`}>
                  {syncAudit.failedCount}
                </span>
                <span className={`text-[11px] font-semibold ${syncAudit.failedCount > 0 ? 'text-rose-300' : 'text-slate-400'}`}>
                  {syncAudit.failedCount > 0
                    ? isEn ? 'Needs attention' : 'Bezwen verifikasyon'
                    : isEn ? 'No errors' : 'Okenn erè'}
                </span>
              </div>
            </div>

            {/* Tile 3: Multi-Church Dataset Split */}
            <button
              type="button"
              onClick={() => setActiveTab('churches')}
              className="p-3.5 rounded-2xl bg-slate-950/90 hover:bg-slate-900 border border-slate-800/90 hover:border-amber-500/40 text-left flex flex-col justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold">
                  {isEn ? 'Church Datasets' : isFr ? 'Églises Actives / Archivées' : isEs ? 'Conjuntos de Iglesias' : 'Eta Legliz yo'}
                </span>
                <Building2 className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <span className="text-sm sm:text-base font-extrabold text-white">
                  {syncAudit.activeChurchesCount} {isEn ? 'Active' : 'Aktif'}{' '}
                  <span className="text-slate-500 font-normal">/</span>{' '}
                  <span className="text-slate-300">{syncAudit.archivedLegacyChurchesCount} {isEn ? 'Archived' : 'Achive'}</span>
                </span>
                <span className="text-[11px] font-semibold text-amber-300 shrink-0">
                  {syncAudit.affectedChurchCount > 0
                    ? `${syncAudit.affectedChurchCount} ${isEn ? 'pending' : 'an atant'}`
                    : isEn ? 'View list' : 'Wè lis'}
                </span>
              </div>
            </button>

            {/* Tile 4: Central Server Sync Readiness */}
            <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/90 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold">
                  {isEn ? 'Central Server Sync' : isFr ? 'Sync Serveur Central' : isEs ? 'Sync Servidor Central' : 'Sèvè Santral'}
                </span>
                <Shield className={`w-4 h-4 ${syncAudit.cloudWriteAuthorized ? 'text-blue-400' : 'text-amber-400'}`} />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span
                  className={`text-xs font-extrabold ${
                    syncAudit.cloudWriteAuthorized ? 'text-blue-300' : 'text-amber-300'
                  }`}
                >
                  {syncAudit.cloudWriteAuthorized
                    ? isEn ? 'Authorized' : isFr ? 'Autorisé' : isEs ? 'Autorizado' : 'Otorize'
                    : isEn ? 'Local Only' : isFr ? 'Local Seulement' : isEs ? 'Solo Local' : 'Lokal Sèlman'}
                </span>
                {!syncAudit.cloudWriteAuthorized && (
                  <button
                    type="button"
                    onClick={handleConnectSuperDevGoogle}
                    disabled={isSigningInGoogle}
                    className="text-[11px] font-bold text-amber-300 hover:text-amber-200 underline cursor-pointer disabled:opacity-50"
                  >
                    {isEn ? 'Connect' : 'Konekte'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Expandable Pending Queue Breakdown */}
          {syncAudit.totalPendingTasks > 0 && (
            <div className="pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setShowQueueDetails((prev) => !prev)}
                className="text-xs font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-1.5 cursor-pointer"
              >
                <span>
                  {showQueueDetails
                    ? isEn ? 'Hide Pending Queue Details' : 'Kache Detay Liy Atant lan'
                    : isEn
                    ? `Inspect ${syncAudit.totalPendingTasks} Pending Sync Task(s)`
                    : `Enspekte ${syncAudit.totalPendingTasks} Tach ki An Atant`}
                </span>
                {showQueueDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showQueueDetails && (
                <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
                  {syncAudit.items.slice(0, 10).map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">
                          {item.memberName}{' '}
                          <span className="text-slate-400 font-normal">• {item.serviceTitle}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {item.churchName} ({item.churchId})
                          {item.lastError ? ` • ${item.lastError}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {item.retryCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px]">
                            {isEn ? `Retries: ${item.retryCount}` : `Esè: ${item.retryCount}`}
                          </span>
                        )}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            item.status === 'failed'
                              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {item.status === 'failed'
                            ? isEn ? 'Retry Needed' : 'Echwe'
                            : isEn ? 'Queued' : 'An Atant'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {syncAudit.items.length > 10 && (
                    <div className="text-[11px] text-slate-400 text-center pt-1">
                      +{syncAudit.items.length - 10}{' '}
                      {isEn ? 'additional items in queue' : 'lòt eleman an atant'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
        )}

        {/* Notice for 0 churches (only on overview/churches tabs) */}
        {allChurches.length === 0 && (activeTab === 'dashboard' || activeTab === 'churches') && (
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex items-start gap-3 text-amber-200 text-xs">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-amber-300 block text-sm">
                {isEn
                  ? 'System Notice: No churches registered in the database yet'
                  : 'Avi Sistèm: Okenn legliz poko anrejistre nan baz done a'}
              </strong>
              <p className="mt-0.5 text-amber-200/90 leading-relaxed">
                {isEn
                  ? 'You have full access to all developer tools including Global licenses, Google AdMob, partner sponsors, and security diagnostics.'
                  : 'Ou gen aksè konplè nan tout zouti devlopè yo (dèlko lisans Global, Google AdMob, jesyon patnè ak sekirite). Ou ka kreye yon legliz nan aplikasyon an oswa jenere lisans Global pou pare avans.'}
              </p>
            </div>
          </div>
        )}

        {/* TAB 0: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <DevDashboardTab
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onNavigateTab={(tab) => setActiveTab(tab)}
            language={language}
            onRefreshAll={onRefreshChurches}
            onApplyResolvedLanguage={onLanguageChange}
          />
        )}

        {/* TAB 1: CHURCHES FLEET */}
        {activeTab === 'churches' && (
          <DevChurchesTab
            allChurches={allChurches}
            currentChurch={currentChurch}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onSelectChurch={onSelectChurch}
            onRefreshChurches={onRefreshChurches}
            pendingByChurch={syncAudit.pendingByChurch}
            language={language}
          />
        )}

        {/* TAB: ATTENDANCE SCAN EXPLORER */}
        {activeTab === 'attendance' && (
          <DevDatabaseTab
            allChurches={allChurches}
            language={language}
            onRefreshAll={onRefreshChurches}
            initialSubView="attendance"
          />
        )}

        {/* TAB 2: DATABASE ENGINE */}
        {activeTab === 'database' && (
          <DevDatabaseTab
            allChurches={allChurches}
            language={language}
            onRefreshAll={onRefreshChurches}
          />
        )}

        {/* TAB 3: BROADCASTS ENGINE */}
        {activeTab === 'broadcasts' && (
          <DevBroadcastsTab
            allChurches={allChurches}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            language={language}
          />
        )}

        {/* TAB: APP UPDATES & ANNOUNCEMENT ENGINE */}
        {activeTab === 'updates' && (
          <DevUpdatesTab
            allChurches={allChurches}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            language={language}
          />
        )}

        {/* TAB 4: LICENSES & ACTIVATION ENGINE */}
        {activeTab === 'licenses' && (
          <DevLicensesTab
            settings={settings}
            allChurches={allChurches}
            currentChurch={currentChurch}
            onUpdateSettings={handleUpdateSettings}
            language={language}
          />
        )}

        {/* TAB 5: DONATIONS & DEVELOPER SPOTLIGHT */}
        {activeTab === 'donations' && (
          <DevDonationsTab
            settings={settings}
            donationConfig={donationConfig}
            onDonationConfigSaved={(newCfg) => setDonationConfig(newCfg)}
            language={language}
          />
        )}

        {/* TAB 6: ADMOB MONETIZATION ENGINE */}
        {activeTab === 'admob' && (
          <DevAdMobTab
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            language={language}
          />
        )}

        {/* TAB 7: SPONSORS & CORPORATE PARTNERS */}
        {activeTab === 'sponsors' && (
          <DevSponsorsTab
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            language={language}
          />
        )}

        {/* TAB 8: MODERATION & ANNOUNCEMENT COMMENTS */}
        {activeTab === 'moderation' && (
          <DevModerationTab
            settings={settings}
            allComments={commentsList}
            onRefreshComments={handleRefreshComments}
            onUpdateSettings={handleUpdateSettings}
            allChurches={allChurches}
            language={language}
          />
        )}

        {/* TAB 8B: PUBLIC MEMBER VERIFICATION ENGINE & LIVE INSPECTOR */}
        {activeTab === 'verification' && (
          <DevVerificationTab
            settings={settings}
            allChurches={allChurches}
            onUpdateSettings={handleUpdateSettings}
            language={language}
          />
        )}

        {/* TAB 9: SECURITY & SYSTEM DIAGNOSTICS */}
        {activeTab === 'security' && (
          <DevSecurityTab
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            language={language}
            onOpenPrivacyPolicy={onOpenPrivacyPolicy}
            onOpenTermsOfService={onOpenTermsOfService}
          />
        )}
      </main>

      {/* Developer Page Footer */}
      <footer className="bg-[#0B1120] border-t border-slate-800 px-4 sm:px-8 py-4 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
            <div className="flex items-center gap-2.5">
              <OmniChurchLogo variant="full" className="h-8 w-auto" />
              <span className="font-medium">{navCopy.footerTitle}</span>
            </div>
            {(onOpenPrivacyPolicy || onOpenTermsOfService) && (
              <div className="flex items-center gap-2 text-[11px] text-slate-400 sm:pl-2 sm:border-l sm:border-slate-700/80">
                {onOpenPrivacyPolicy && (
                  <button
                    type="button"
                    id="dev-footer-privacy-link"
                    onClick={onOpenPrivacyPolicy}
                    className="text-slate-300 hover:text-white underline underline-offset-2 cursor-pointer bg-transparent border-0 p-0"
                  >
                    {language === 'es'
                      ? 'Privacidad'
                      : language === 'en'
                      ? 'Privacy Policy'
                      : language === 'fr'
                      ? 'Confidentialité'
                      : 'Politik Konfidansyalite'}
                  </button>
                )}
                {onOpenPrivacyPolicy && onOpenTermsOfService && (
                  <span className="text-slate-600" aria-hidden="true">
                    •
                  </span>
                )}
                {onOpenTermsOfService && (
                  <button
                    type="button"
                    id="dev-footer-terms-link"
                    onClick={onOpenTermsOfService}
                    className="text-slate-300 hover:text-white underline underline-offset-2 cursor-pointer bg-transparent border-0 p-0"
                  >
                    {language === 'es'
                      ? 'Términos'
                      : language === 'en'
                      ? 'Terms of Service'
                      : language === 'fr'
                      ? 'Conditions d’Utilisation'
                      : 'Kondisyon Itilizasyon'}
                  </button>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer transition-colors"
          >
            {navCopy.exitApp}
          </button>
        </div>
      </footer>
    </div>
  );
};
