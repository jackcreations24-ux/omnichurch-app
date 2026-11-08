import React, { useState, useEffect } from 'react';
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
} from '../../utils/developerStorage';
import { APP_BASE_VERSION } from '../../version';
import { useToast } from '../../context/ToastContext';
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
}

export const DeveloperEnginePage: React.FC<DeveloperEnginePageProps> = ({
  isOpen = true,
  onClose,
  allChurches = [],
  currentChurch,
  language = 'ht',
  onRefreshChurches,
  onSelectChurch,
}) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<
    | 'dashboard'
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
    | 'security'
  >('dashboard');
  const [settings, setSettings] = useState<DeveloperSettings>(() => getDeveloperSettings());
  const [donationConfig, setDonationConfig] = useState<DeveloperDonationConfig>(() => getDonationConfig());
  const [commentsList, setCommentsList] = useState<EnrichedStoredComment[]>(() => getAllStoredComments());

  // Reload settings on mount and listen to real-time updates
  useEffect(() => {
    const fresh = getDeveloperSettings();
    setSettings(fresh);
    setDonationConfig(getDonationConfig());
    setCommentsList(getAllStoredComments());

    // Fetch latest remote settings from Firestore if available
    fetchRemoteDeveloperSettings().then((remote) => {
      if (remote) {
        setSettings(remote);
      }
    });

    // Real-time listener for developer settings updates across the entire app
    const handleRemoteUpdate = (e: Event) => {
      const customEv = e as CustomEvent<DeveloperSettings>;
      if (customEv.detail) {
        setSettings(customEv.detail);
      } else {
        setSettings(getDeveloperSettings());
      }
      setDonationConfig(getDonationConfig());
    };
    window.addEventListener('omnichurch_dev_settings_updated', handleRemoteUpdate);

    return () => {
      window.removeEventListener('omnichurch_dev_settings_updated', handleRemoteUpdate);
    };
  }, [isOpen, currentChurch, allChurches]);

  if (!isOpen) return null;

  const isEs = language === 'es';
  const isEn = language === 'en';
  const isFr = language === 'fr';

  // Master Settings Update helper
  const handleUpdateSettings = async (updated: Partial<DeveloperSettings>) => {
    const full = { ...settings, ...updated };
    setSettings(full);
    await saveDeveloperSettings(full);
    toast.success(
      isEs ? 'Configuración Guardada' : isEn ? 'Settings Saved' : isFr ? 'Paramètres Enregistrés' : 'Konfigirasyon Sove ✓',
      isEs
        ? 'Los cambios se han aplicado al Developer Engine.'
        : isEn
        ? 'Changes applied to Developer Engine.'
        : isFr
        ? 'Modifications appliquées au Developer Engine.'
        : 'Chanjman yo aplike nan Developer Engine.'
    );
  };

  const handleRefreshComments = () => {
    setCommentsList(getAllStoredComments());
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-200 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Top Multi-Color Glow Accent Line */}
      <div className="h-1.5 bg-gradient-to-r from-amber-500 via-emerald-400 to-amber-500 shrink-0 sticky top-0 z-50" />

      {/* TOP DEVELOPER PAGE HEADER */}
      <header className="bg-[#0B1120]/95 backdrop-blur-md border-b border-slate-800 sticky top-1.5 z-40 px-4 sm:px-8 py-3.5 shadow-xl shadow-black/40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20 shrink-0 border border-amber-300">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Developer Engine Panel
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono font-black uppercase tracking-wider">
                  PRO ENGINE v2.6
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold uppercase">
                  PAGE MÒD
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isEs
                  ? 'Gestión central de monetización, activación de licencias, AdMob y patrocinadores'
                  : isEn
                  ? 'Central monetization management, church licenses, AdMob ads, and sponsors'
                  : isFr
                  ? 'Gestion centrale de la monétisation, licences, AdMob et sponsors officiels'
                  : 'Sant jesyon monetizasyon, dèlko lisans, konfigirasyon AdMob, ak sponsò footer'}
              </p>
            </div>
          </div>

          {/* Quick Stats Chips & Back Button */}
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
              <div className="flex items-center gap-1 text-slate-400">
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Legliz:</span>
                <strong className="text-white font-mono">{allChurches.length}</strong>
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1 text-slate-400">
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                <span>Lisans:</span>
                <strong className="text-white font-mono">{settings.licenses.length}</strong>
              </div>
            </div>

            <button
              type="button"
              id="btn-exit-developer-engine-page"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-400/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95 ml-auto sm:ml-0"
              title="Klike pou sòti nan Panèl Devlopè a epi retounen nan aplikasyon an"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>
                {isEs ? 'Volver a la App' : isEn ? 'Exit to App' : isFr ? 'Retour à l’App' : 'Tounen nan App'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* STICKY NAVIGATION TABS */}
      <div className="bg-[#090E1A] border-b border-slate-800 sticky top-[69px] z-30 shadow-md">
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
            <span>Sant Kontwòl & Metrik</span>
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
            <span>Flòt Legliz</span>
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
            <span>Prezans Eskane</span>
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
            <span>Baz Done & Doctor</span>
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
            <span>Alèt & Kominike</span>
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
            <span>Mizajou & Anons App</span>
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
            <span>Lisans & Aktivasyon</span>
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
            <span>Kont Donasyon & Dev</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-950/60 font-bold font-mono text-rose-300">
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
            <span>AdMob Anons</span>
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded font-bold font-mono ${
                settings.adMob.enabled
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {settings.adMob.enabled ? 'ON' : 'OFF'}
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
            <span>Jesyon Sponsò</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/40 font-mono">
              {(settings.sponsors || []).filter((s) => s.active).length} Aktif
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
            <span>Fil & Kòmantè</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/40 font-mono">
              {commentsList.length}
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
            <span>Sekirite & Sistèm</span>
          </button>
        </div>
      </div>

      {/* MAIN PAGE BODY CONTAINER */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 flex-1">
        {/* Notice for 0 churches */}
        {allChurches.length === 0 && (
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex items-start gap-3 text-amber-200 text-xs">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-amber-300 block text-sm">
                Avi Sistèm: Okenn legliz poko anrejistre nan baz done a
              </strong>
              <p className="mt-0.5 text-amber-200/90 leading-relaxed">
                Ou gen aksè konplè nan tout zouti devlopè yo (dèlko lisans mondyal, Google AdMob, jesyon patnè/sponsò, ak sekirite). Ou ka kreye yon legliz nan aplikasyon an oswa jenere lisans mondyal (GLOBAL) pou pare avans.
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
            language={language}
          />
        )}

        {/* TAB 9: SECURITY & SYSTEM DIAGNOSTICS */}
        {activeTab === 'security' && (
          <DevSecurityTab
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            language={language}
          />
        )}
      </main>

      {/* DEVELOPER PAGE FOOTER */}
      <footer className="bg-[#0B1120] border-t border-slate-800 px-4 sm:px-8 py-4 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-amber-400" />
            <span className="font-mono">OMNICHURCH DEVELOPER ENGINE — DEDICATED PAGE VIEW</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer transition-colors"
          >
            Tounen nan Aplikasyon an
          </button>
        </div>
      </footer>
    </div>
  );
};
