import React, { useState } from 'react';
import {
  Church,
  Language,
  DeveloperSettings,
  DeveloperAppUpdateConfig,
} from '../../types';
import {
  saveDeveloperAppUpdateConfig,
  broadcastUpdateAnnouncement,
  DEFAULT_DEVELOPER_APP_UPDATE_CONFIG,
} from '../../utils/developerStorage';
import {
  resetDismissedUpdate,
  dismissCurrentUpdate,
  setUserInstalledVersion,
  notifyAppUpdateChanged,
  isVersionNewer,
} from '../../services/appUpdateService';
import { APP_BASE_VERSION } from '../../version';
import { useToast } from '../../context/ToastContext';
import { AppUpdateModal } from '../common/AppUpdateModal';
import {
  Sparkles,
  Download,
  CheckCircle2,
  AlertTriangle,
  Radio,
  RefreshCw,
  ExternalLink,
  Eye,
  Save,
  Globe,
  Plus,
  Trash2,
  Check,
  Zap,
  Info,
  ShieldCheck,
  Send,
  Layers,
} from 'lucide-react';

interface DevUpdatesTabProps {
  settings: DeveloperSettings;
  allChurches: Church[];
  onUpdateSettings: (updated: Partial<DeveloperSettings>) => Promise<void>;
  language?: Language;
}

export const DevUpdatesTab: React.FC<DevUpdatesTabProps> = ({
  settings,
  allChurches,
  onUpdateSettings,
  language = 'ht',
}) => {
  const toast = useToast();
  const currentConfig: DeveloperAppUpdateConfig =
    settings.appUpdate || DEFAULT_DEVELOPER_APP_UPDATE_CONFIG;

  const sanitizeInitialVersion = (val?: string) => {
    if (!val || val === '2.5.0' || val === '2.4.0' || val === '2.0.0') {
      return APP_BASE_VERSION;
    }
    return val;
  };

  // Form State
  const [enabled, setEnabled] = useState<boolean>(currentConfig.enabled ?? true);
  const [latestVersion, setLatestVersion] = useState<string>(
    sanitizeInitialVersion(currentConfig.latestVersion)
  );
  const [currentVersion, setCurrentVersion] = useState<string>(
    sanitizeInitialVersion(currentConfig.currentVersion)
  );
  const [minRequiredVersion, setMinRequiredVersion] = useState<string>(
    sanitizeInitialVersion(currentConfig.minRequiredVersion)
  );
  const [downloadUrl, setDownloadUrl] = useState<string>(
    currentConfig.downloadUrl || 'https://omnichurch.download'
  );
  const [channel, setChannel] = useState<'stable' | 'beta' | 'rc'>(
    currentConfig.channel || 'stable'
  );
  const [isMandatory, setIsMandatory] = useState<boolean>(currentConfig.isMandatory || false);
  const [releaseDate, setReleaseDate] = useState<string>(
    currentConfig.releaseDate || new Date().toISOString().split('T')[0]
  );
  const [targetPlatform, setTargetPlatform] = useState<'all' | 'android' | 'desktop' | 'web'>(
    currentConfig.targetPlatform || 'all'
  );

  // Multilingual highlights & notices
  const [activeLangTab, setActiveLangTab] = useState<Language>('ht');
  const [highlights, setHighlights] = useState<Record<Language, string[]>>({
    ht: [...(currentConfig.highlights?.ht || DEFAULT_DEVELOPER_APP_UPDATE_CONFIG.highlights.ht)],
    fr: [...(currentConfig.highlights?.fr || DEFAULT_DEVELOPER_APP_UPDATE_CONFIG.highlights.fr)],
    en: [...(currentConfig.highlights?.en || DEFAULT_DEVELOPER_APP_UPDATE_CONFIG.highlights.en)],
    es: [...(currentConfig.highlights?.es || DEFAULT_DEVELOPER_APP_UPDATE_CONFIG.highlights.es)],
  });

  const [importantNotice, setImportantNotice] = useState<Record<Language, string>>({
    ht: currentConfig.importantNotice?.ht || DEFAULT_DEVELOPER_APP_UPDATE_CONFIG.importantNotice.ht,
    fr: currentConfig.importantNotice?.fr || DEFAULT_DEVELOPER_APP_UPDATE_CONFIG.importantNotice.fr,
    en: currentConfig.importantNotice?.en || DEFAULT_DEVELOPER_APP_UPDATE_CONFIG.importantNotice.en,
    es: currentConfig.importantNotice?.es || DEFAULT_DEVELOPER_APP_UPDATE_CONFIG.importantNotice.es,
  });

  const [newHighlightText, setNewHighlightText] = useState<string>('');

  // UI Modals & Actions
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);

  // Live Semver Check
  const hasValidUpdate = enabled && isVersionNewer(latestVersion, currentVersion);

  // Add highlight to currently selected language tab
  const handleAddHighlight = () => {
    const text = newHighlightText.trim();
    if (!text) return;
    setHighlights((prev) => ({
      ...prev,
      [activeLangTab]: [...(prev[activeLangTab] || []), text],
    }));
    setNewHighlightText('');
  };

  // Remove highlight by index
  const handleRemoveHighlight = (index: number) => {
    setHighlights((prev) => ({
      ...prev,
      [activeLangTab]: prev[activeLangTab].filter((_, i) => i !== index),
    }));
  };

  // Update specific highlight
  const handleUpdateHighlight = (index: number, newText: string) => {
    setHighlights((prev) => ({
      ...prev,
      [activeLangTab]: prev[activeLangTab].map((item, i) => (i === index ? newText : item)),
    }));
  };

  // Save Configuration
  const handleSaveUpdateConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const newConfig: DeveloperAppUpdateConfig = {
        enabled,
        latestVersion: latestVersion.trim(),
        currentVersion: currentVersion.trim(),
        minRequiredVersion: minRequiredVersion.trim(),
        downloadUrl: downloadUrl.trim() || 'https://omnichurch.download',
        channel,
        isMandatory,
        releaseDate,
        targetPlatform,
        highlights,
        importantNotice,
        lastBroadcastedAt: currentConfig.lastBroadcastedAt,
      };

      const res = await saveDeveloperAppUpdateConfig(newConfig);
      await onUpdateSettings({ appUpdate: newConfig });
      notifyAppUpdateChanged();

      if (res.success) {
        toast.success(
          'Konfigirasyon Mizajou Sove ✓',
          `Vèsyon v${newConfig.latestVersion} aktyèl sou sit ${newConfig.downloadUrl}.`
        );
      } else {
        toast.error('Erè', res.message);
      }
    } catch (err: any) {
      toast.error('Erè', err?.message || 'Pa ka sove konfigirasyon an.');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset All Versions to Baseline 1.0.0 (Unblock and unify on equal footing)
  const handleResetAllToBaseline = async () => {
    setIsSaving(true);
    try {
      setLatestVersion(APP_BASE_VERSION);
      setCurrentVersion(APP_BASE_VERSION);
      setMinRequiredVersion(APP_BASE_VERSION);
      setIsMandatory(false);

      const resetConfig: DeveloperAppUpdateConfig = {
        ...currentConfig,
        enabled: true,
        latestVersion: APP_BASE_VERSION,
        currentVersion: APP_BASE_VERSION,
        minRequiredVersion: APP_BASE_VERSION,
        isMandatory: false,
        releaseDate: new Date().toISOString().split('T')[0],
      };

      await saveDeveloperAppUpdateConfig(resetConfig);
      await onUpdateSettings({ appUpdate: resetConfig });
      setUserInstalledVersion(APP_BASE_VERSION);
      dismissCurrentUpdate();
      notifyAppUpdateChanged();

      toast.success(
        'Tout Vèsyon Reyinisyalize sou v1.0.0 ✓',
        'Tout sistèm nan mete sou menm pye egalite (1.0.0). Popup la pa bloke ankò!'
      );
    } catch (err: any) {
      toast.error('Erè pandan reyinisyalizasyon an', err?.message || 'Erè enprevizib.');
    } finally {
      setIsSaving(false);
    }
  };

  // Broadcast to All Churches
  const handleBroadcastAnnouncement = async () => {
    setIsBroadcasting(true);
    try {
      const configToBroadcast: DeveloperAppUpdateConfig = {
        enabled,
        latestVersion: latestVersion.trim(),
        currentVersion: currentVersion.trim(),
        minRequiredVersion: minRequiredVersion.trim(),
        downloadUrl: downloadUrl.trim() || 'https://omnichurch.download',
        channel,
        isMandatory,
        releaseDate,
        targetPlatform,
        highlights,
        importantNotice,
      };

      const res = await broadcastUpdateAnnouncement(configToBroadcast);
      // Refresh parent settings
      await onUpdateSettings({
        appUpdate: {
          ...configToBroadcast,
          lastBroadcastedAt: new Date().toISOString(),
        },
      });
      notifyAppUpdateChanged();

      if (res.success) {
        toast.success('Piblikasyon Reyisi ✓', res.message);
      } else {
        toast.error('Erè Piblikasyon', res.message);
      }
    } catch (err: any) {
      toast.error('Erè', err?.message || 'Pa ka difize kominike a.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Reset Dismissals so users see the modal again on launch
  const handleResetDismissals = () => {
    resetDismissedUpdate();
    notifyAppUpdateChanged();
    toast.success(
      'Reyouvèti Re-inisyalize!',
      'Tout itilizatè yo ap resevwa fenèt notifikasyon mizajou a ankò nan pwochen ouvèti aplikasyon an.'
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* TOP HERO BANNER & STATS */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-[#0D1527] to-slate-900 border border-slate-800 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-400/20 shrink-0 border border-amber-300">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Sant Jesyon & Piblikasyon Mizajou
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider border ${
                    enabled
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}
                >
                  {enabled ? 'SISTÈM AKTIF' : 'DEZAKTIVE'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 text-[10px] font-mono font-bold border border-slate-700">
                  {channel.toUpperCase()}
                </span>
                {isMandatory && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black uppercase tracking-wider animate-pulse">
                    IJAN / BLOKAN
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Kontwole an tan reyèl anons mizajou yo pou tout itilizatè OmniChurch. Mete ajou nimewo vèsyon, nòt piblikasyon nan 4 lang, ak lyen telechajman ofisyèl la sou{' '}
                <span className="text-amber-300 font-mono font-bold">{downloadUrl}</span>.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
            <button
              type="button"
              id="btn-dev-preview-update-modal"
              onClick={() => setIsPreviewModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm"
              title="Gade kijan itilizatè yo ap wè fenèt mizajou a"
            >
              <Eye className="w-4 h-4 text-amber-400" />
              <span>Previzyalize</span>
            </button>

            <button
              type="button"
              id="btn-dev-reset-update-dismissals"
              onClick={handleResetDismissals}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm"
              title="Fè tout itilizatè ki te klike fèmen wè anons lan ankò"
            >
              <RefreshCw className="w-4 h-4 text-emerald-400" />
              <span>Re-afiche Tout Moun</span>
            </button>

            <button
              type="button"
              id="btn-dev-broadcast-update-all"
              disabled={isBroadcasting}
              onClick={handleBroadcastAnnouncement}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-400/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Send className={`w-4 h-4 ${isBroadcasting ? 'animate-spin' : ''}`} />
              <span>{isBroadcasting ? 'W ap Pibliye...' : 'Pibliye Kominike'}</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Vèsyon Deplwaye</span>
            <span className="font-mono text-base font-black text-amber-300 mt-0.5 block">
              v{latestVersion}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Vèsyon Aktyèl App</span>
            <span className="font-mono text-base font-black text-white mt-0.5 block">
              v{currentVersion}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Deteksyon Mizajou</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {hasValidUpdate ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400">Nouvo Mizajou Aktif</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-slate-400">Pa gen mizajou</span>
                </>
              )}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Konsèvasyon Sesyon</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-emerald-400">Garanti 100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* CONFIGURATION FORM & EDITOR */}
      <form onSubmit={handleSaveUpdateConfig} className="space-y-6">
        {/* SECTION 1: CORE PARAMETERS */}
        <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center font-bold">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm sm:text-base text-white">
                  Paramèt Jeneral Piblikasyon an
                </h4>
                <p className="text-[11px] text-slate-400">
                  Konfigire nimewo vèsyon yo ak sit ofisyèl pou telechaje a
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleResetAllToBaseline}
                disabled={isSaving}
                className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50"
                title="Reyinisyalize tout vèsyon yo sou 1.0.0 pou mete tout sou menm pye egalite epi debloke popup la"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
                <span>Reyinisyalize sou v{APP_BASE_VERSION}</span>
              </button>

              {/* Enable/Disable Toggle */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-400"></div>
                <span className="ml-2 text-xs font-bold text-slate-300">
                  {enabled ? 'Alèt Aktif' : 'Alèt Etenn'}
                </span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {/* Latest Version */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-300 block">
                Nouvo Vèsyon Disponib (Latest Semver) *
              </label>
              <input
                type="text"
                required
                placeholder={APP_BASE_VERSION}
                value={latestVersion}
                onChange={(e) => setLatestVersion(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors"
              />
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-slate-400">
                  Egzanp: <code className="text-amber-300">1.0.1</code>. Sistèm nan detekte otomatikman si l pi wo pase vèsyon aktyèl la.
                </p>
                <button
                  type="button"
                  onClick={() => setLatestVersion(APP_BASE_VERSION)}
                  className="text-[10px] text-amber-400 hover:text-amber-300 underline font-mono cursor-pointer"
                >
                  Baz: v{APP_BASE_VERSION}
                </button>
              </div>
            </div>

            {/* Current App Version Baseline */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-300 block">
                Vèsyon Aktyèl Aplikasyon an (Current Base) *
              </label>
              <input
                type="text"
                required
                placeholder={APP_BASE_VERSION}
                value={currentVersion}
                onChange={(e) => setCurrentVersion(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors"
              />
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-slate-400">
                  Vèsyon ki enstale nan app a kounye a (baze sou bati a).
                </p>
                <button
                  type="button"
                  onClick={() => setCurrentVersion(APP_BASE_VERSION)}
                  className="text-[10px] text-amber-400 hover:text-amber-300 underline font-mono cursor-pointer"
                >
                  Mete v{APP_BASE_VERSION} (package.json)
                </button>
              </div>
            </div>

            {/* Min Required Version */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-300 block">
                Vèsyon Minimòm Egzije (Min Required)
              </label>
              <input
                type="text"
                placeholder={APP_BASE_VERSION}
                value={minRequiredVersion}
                onChange={(e) => setMinRequiredVersion(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors"
              />
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-slate-400">
                  Itilizatè ki pi ba pase sa ap resevwa notifikasyon ijan.
                </p>
                <button
                  type="button"
                  onClick={() => setMinRequiredVersion(APP_BASE_VERSION)}
                  className="text-[10px] text-amber-400 hover:text-amber-300 underline font-mono cursor-pointer"
                >
                  Baz: v{APP_BASE_VERSION}
                </button>
              </div>
            </div>

            {/* Download URL */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="font-bold text-slate-300 flex items-center justify-between">
                <span>Sit Telechajman Ofisyèl *</span>
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-mono font-normal"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Teste Lyen</span>
                </a>
              </label>
              <div className="relative">
                <input
                  type="url"
                  required
                  placeholder="https://omnichurch.download"
                  value={downloadUrl}
                  onChange={(e) => setDownloadUrl(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 font-mono text-xs focus:outline-none focus:border-amber-400 transition-colors"
                />
                <Download className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
              <p className="text-[10px] text-slate-400">
                Sit prensipal kote tout itilizatè ka telechaje dènye dosye yo: <span className="text-amber-300 font-bold">https://omnichurch.download</span>
              </p>
            </div>

            {/* Release Channel */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-300 block">Kanal Piblikasyon</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400 transition-colors cursor-pointer"
              >
                <option value="stable">Stable (Ofisyèl Pwodiksyon)</option>
                <option value="beta">Beta (Piblik Tès)</option>
                <option value="rc">Release Candidate (RC)</option>
              </select>
            </div>

            {/* Target Platform */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-300 block">Platfòm Sib</label>
              <select
                value={targetPlatform}
                onChange={(e) => setTargetPlatform(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400 transition-colors cursor-pointer"
              >
                <option value="all">Tout Platfòm (Android, Desktop & Web)</option>
                <option value="android">Android Sèlman (.APK)</option>
                <option value="desktop">Windows Desktop Sèlman (.EXE)</option>
                <option value="web">Web PWA Sèlman</option>
              </select>
            </div>

            {/* Mandatory Toggle */}
            <div className="space-y-1.5 flex flex-col justify-center">
              <label className="font-bold text-slate-300 block">Ijans Mizajou a</label>
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isMandatory}
                  onChange={(e) => setIsMandatory(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-amber-400 focus:ring-amber-400 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs text-slate-200 font-semibold">
                  Mete kòm mizajou obligatwa / ijan
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* SECTION 2: MULTILINGUAL RELEASE NOTES & HIGHLIGHTS */}
        <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm sm:text-base text-white">
                  Nòt Piblikasyon & Sa ki Nouvo (Tout Lang)
                </h4>
                <p className="text-[11px] text-slate-400">
                  Edite pwen fò mizajou a ak mesaj enpòtan an pou chak lang
                </p>
              </div>
            </div>

            {/* Language Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800 overflow-x-auto scrollbar-none max-w-full">
              {(['ht', 'fr', 'en', 'es'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setActiveLangTab(lang)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeLangTab === lang
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {lang === 'ht'
                    ? '🇭🇹 Kreyòl'
                    : lang === 'fr'
                    ? '🇫🇷 Français'
                    : lang === 'en'
                    ? '🇺🇸 English'
                    : '🇪🇸 Español'}
                </button>
              ))}
            </div>
          </div>

          {/* Highlights List for Active Language */}
          <div className="space-y-3">
            <label className="font-bold text-xs text-slate-300 block">
              Lis Amelyorasyon & Sa ki Nouvo ({activeLangTab.toUpperCase()}):
            </label>

            <div className="space-y-2">
              {(highlights[activeLangTab] || []).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 group hover:border-slate-700 transition-colors"
                >
                  <span className="w-5 h-5 rounded-lg bg-amber-400/20 text-amber-300 font-mono text-[11px] font-black flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => handleUpdateHighlight(idx, e.target.value)}
                    className="flex-1 bg-transparent text-xs text-white focus:outline-none focus:text-amber-200"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveHighlight(idx)}
                    className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Efase pwen sa a"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new highlight item */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder={`Ajoute yon nouvo pwen amelyorasyon an ${
                  activeLangTab === 'ht'
                    ? 'Kreyòl'
                    : activeLangTab === 'fr'
                    ? 'Français'
                    : activeLangTab === 'en'
                    ? 'English'
                    : 'Español'
                }...`}
                value={newHighlightText}
                onChange={(e) => setNewHighlightText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddHighlight();
                  }
                }}
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={handleAddHighlight}
                disabled={!newHighlightText.trim()}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajoute</span>
              </button>
            </div>

            {/* Important Notice Textarea */}
            <div className="pt-3 space-y-1.5">
              <label className="font-bold text-xs text-slate-300 block">
                Mesaj Sekirite / Avi Enpòtan ({activeLangTab.toUpperCase()}):
              </label>
              <textarea
                rows={2}
                value={importantNotice[activeLangTab] || ''}
                onChange={(e) =>
                  setImportantNotice((prev) => ({
                    ...prev,
                    [activeLangTab]: e.target.value,
                  }))
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none leading-relaxed"
                placeholder="Avi enpòtan pou itilizatè a..."
              />
            </div>
          </div>
        </div>

        {/* SUBMIT & SAVE BUTTON BAR */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
          <p className="text-[11px] text-slate-400">
            Lè w sove, tout paramèt yo ap reflete imedyatman nan tout aplikasyon an ak nan baz done a.
          </p>

          <button
            type="submit"
            id="btn-dev-save-update-config"
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-400/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50 text-center"
          >
            <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
            <span>{isSaving ? 'W ap Anrejistre...' : 'Anrejistre & Deplwaye Mizajou'}</span>
          </button>
        </div>
      </form>

      {/* LIVE PREVIEW MODAL */}
      <AppUpdateModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        language={language}
      />
    </div>
  );
};
