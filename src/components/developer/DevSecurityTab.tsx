import React, { useState, useEffect } from 'react';
import { DeveloperSettings, Language } from '../../types';
import {
  updateMasterPasswordSecurely,
  exportFullSystemDatabase,
  getSecurityHardeningMetrics,
  upgradeAllChurchPasscodesToSha256,
  verifyCloudConfigSync,
  SecurityHardeningMetrics,
  SUPER_DEVELOPER_EMAIL,
  isSuperDeveloperEmail,
} from '../../utils/developerStorage';
import { APP_BASE_VERSION } from '../../version';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../lib/firebase';
import {
  Lock,
  Shield,
  Eye,
  EyeOff,
  CheckCircle2,
  Download,
  Activity,
  Cpu,
  KeyRound,
  Database,
  RefreshCw,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  FileText,
  Save,
  RotateCcw,
} from 'lucide-react';
import { DeveloperLegalConfig } from '../../types';
import { sanitizeLegalConfig, normalizeOfficialLegalUrl } from '../../utils/legalRoutes';
import {
  PRIVACY_DEFAULT_CONTENT,
  TERMS_DEFAULT_CONTENT,
  formatLegalLocaleToPlainText,
} from '../legal/legalDefaults';

export interface DevSecurityTabProps {
  settings: DeveloperSettings;
  onUpdateSettings: (updated: Partial<DeveloperSettings>) => Promise<void>;
  language?: Language;
  onOpenPrivacyPolicy?: () => void;
  onOpenTermsOfService?: () => void;
}

export const DevSecurityTab: React.FC<DevSecurityTabProps> = ({
  settings,
  onUpdateSettings,
  language = 'ht',
  onOpenPrivacyPolicy,
  onOpenTermsOfService,
}) => {
  const toast = useToast();
  const { googleUser, developerUser, isEmailVerified, signInWithGoogle } = useAuth();
  const activeDevAuthUser = developerUser || googleUser;
  const liveAuthUser = auth.currentUser;
  const isSuperDevGoogleAuthed = Boolean(
    liveAuthUser &&
    isSuperDeveloperEmail(liveAuthUser.email || activeDevAuthUser?.email) &&
    (Boolean(liveAuthUser.emailVerified) || isEmailVerified)
  );
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);

  // Master Pin Form State
  const [newMasterPin, setNewMasterPin] = useState<string>('');
  const [confirmMasterPin, setConfirmMasterPin] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isChangingPin, setIsChangingPin] = useState<boolean>(false);

  // Security & Architecture Hardening State
  const [hardeningMetrics, setHardeningMetrics] = useState<SecurityHardeningMetrics>(() =>
    getSecurityHardeningMetrics()
  );
  const [isUpgradingPasscodes, setIsUpgradingPasscodes] = useState<boolean>(false);
  const [isTestingCloudSync, setIsTestingCloudSync] = useState<boolean>(false);
  const [cloudSyncResult, setCloudSyncResult] = useState<{
    success: boolean;
    writeAuthorized: boolean;
    latencyMs: number;
    message: string;
  } | null>(null);
  const [confirmClearLogs, setConfirmClearLogs] = useState<boolean>(false);
  const [copiedLegalKey, setCopiedLegalKey] = useState<'privacy' | 'terms' | null>(null);

  // Legal Config & Editable Document State (URLs start strictly empty unless developer enters them)
  const [legalDraft, setLegalDraft] = useState<DeveloperLegalConfig>(() =>
    sanitizeLegalConfig(settings.legalConfig)
  );
  const [editingDocType, setEditingDocType] = useState<'privacy' | 'terms'>('privacy');
  const [editingLang, setEditingLang] = useState<Language>(language || 'ht');
  const [isSavingLegal, setIsSavingLegal] = useState<boolean>(false);

  useEffect(() => {
    setLegalDraft(sanitizeLegalConfig(settings.legalConfig));
  }, [settings.legalConfig]);

  const handleCopyLegalUrl = (page: 'privacy' | 'terms') => {
    const raw = page === 'privacy' ? legalDraft.officialPrivacyUrl : legalDraft.officialTermsUrl;
    const clean = normalizeOfficialLegalUrl(raw);
    if (!clean) {
      toast.warning('Chan Vid', 'Antre lyen ofisyèl ou a dabò avan ou kopye l.');
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(clean).catch(() => {});
    }
    setCopiedLegalKey(page);
    toast.success(
      page === 'privacy' ? 'Lyen Konfidansyalite Kopye' : 'Lyen Kondisyon Itilizasyon Kopye',
      clean
    );
    setTimeout(() => setCopiedLegalKey(null), 2200);
  };

  const currentDocMap =
    editingDocType === 'privacy' ? legalDraft.customPrivacy || {} : legalDraft.customTerms || {};
  const currentLangEntry = currentDocMap[editingLang] || {};
  const defaultDocLocale =
    editingDocType === 'privacy'
      ? PRIVACY_DEFAULT_CONTENT[editingLang]
      : TERMS_DEFAULT_CONTENT[editingLang];

  const updateCurrentEntryField = (
    field: 'title' | 'lastUpdatedDate' | 'content',
    value: string
  ) => {
    setLegalDraft((prev) => {
      const targetKey = editingDocType === 'privacy' ? 'customPrivacy' : 'customTerms';
      const existingMap = { ...(prev[targetKey] || {}) };
      const existingEntry = { ...(existingMap[editingLang] || {}) };
      existingEntry[field] = value;
      existingMap[editingLang] = existingEntry;
      return {
        ...prev,
        [targetKey]: existingMap,
      };
    });
  };

  const handleLoadDefaultIntoEditor = () => {
    setLegalDraft((prev) => {
      const targetKey = editingDocType === 'privacy' ? 'customPrivacy' : 'customTerms';
      const existingMap = { ...(prev[targetKey] || {}) };
      existingMap[editingLang] = {
        title: existingMap[editingLang]?.title?.trim() || defaultDocLocale.title,
        lastUpdatedDate:
          existingMap[editingLang]?.lastUpdatedDate?.trim() || defaultDocLocale.lastUpdatedDate,
        content: formatLegalLocaleToPlainText(defaultDocLocale),
      };
      return {
        ...prev,
        [targetKey]: existingMap,
      };
    });
    toast.info('Tèks Chaje', 'Kounye a ou ka modifye nenpòt mo oswa paragraf epi sove.');
  };

  const handleResetLangToDefault = () => {
    setLegalDraft((prev) => {
      const targetKey = editingDocType === 'privacy' ? 'customPrivacy' : 'customTerms';
      const existingMap = { ...(prev[targetKey] || {}) };
      delete existingMap[editingLang];
      return {
        ...prev,
        [targetKey]: existingMap,
      };
    });
    toast.info('Reyinisyalize', 'Lang sa a retounen sou tèks ofisyèl pa defo a lè w sove.');
  };

  const handleSaveLegalConfig = async () => {
    const cleanPrivacyUrl = legalDraft.officialPrivacyUrl.trim()
      ? normalizeOfficialLegalUrl(legalDraft.officialPrivacyUrl)
      : '';
    const cleanTermsUrl = legalDraft.officialTermsUrl.trim()
      ? normalizeOfficialLegalUrl(legalDraft.officialTermsUrl)
      : '';

    if (legalDraft.officialPrivacyUrl.trim() && !cleanPrivacyUrl) {
      toast.error('Lyen Envalid', 'Lyen Politik Konfidansyalite a pa gen yon fòma URL valid (https://...).');
      return;
    }
    if (legalDraft.officialTermsUrl.trim() && !cleanTermsUrl) {
      toast.error('Lyen Envalid', 'Lyen Kondisyon Itilizasyon an pa gen yon fòma URL valid (https://...).');
      return;
    }

    setIsSavingLegal(true);
    try {
      const sanitized = sanitizeLegalConfig({
        ...legalDraft,
        officialPrivacyUrl: cleanPrivacyUrl,
        officialTermsUrl: cleanTermsUrl,
        lastLegalUpdatedAt: new Date().toISOString(),
      });
      await onUpdateSettings({ legalConfig: sanitized });
      setLegalDraft(sanitized);
      toast.success(
        'Dokiman Legal & Lyen Sove ✓',
        'Tout chanjman yo anrejistre epi pibliye imedyatman sou platfòm lan.'
      );
    } catch (err: any) {
      toast.error('Erè Sovgad', err?.message || 'Pa t ka anrejistre paramèt legal yo.');
    } finally {
      setIsSavingLegal(false);
    }
  };

  const refreshHardeningMetrics = () => {
    setHardeningMetrics(getSecurityHardeningMetrics());
  };

  useEffect(() => {
    refreshHardeningMetrics();
  }, [settings]);

  // Upgrade all church admin passcodes to encrypted format
  const handleUpgradeAllPasscodes = async () => {
    setIsUpgradingPasscodes(true);
    try {
      const res = await upgradeAllChurchPasscodesToSha256();
      refreshHardeningMetrics();
      if (res.upgradedCount > 0) {
        toast.success(
          'Chifreman Sekirite Konplè!',
          `${res.upgradedCount} kòd PIN legliz pwoteje ak chifreman sekirite avanse.`
        );
      } else {
        toast.info(
          'Tout Kòd PIN Deja Pwoteje',
          'Tout kòd PIN administratè legliz yo deja pwoteje ak chifreman sekirite.'
        );
      }
    } catch (err: any) {
      toast.error('Erè Chifreman', err?.message || 'Pa t ka chifre kòd PIN legliz yo.');
    } finally {
      setIsUpgradingPasscodes(false);
    }
  };

  // Test live central server configuration sync
  const handleVerifyCloudSync = async () => {
    setIsTestingCloudSync(true);
    try {
      const res = await verifyCloudConfigSync();
      setCloudSyncResult({
        success: res.ok && res.writeAuthorized,
        writeAuthorized: res.writeAuthorized,
        latencyMs: res.latencyMs,
        message: res.message,
      });
      if (res.ok && res.writeAuthorized) {
        toast.success('Sèvè Santral Verifye ✓', res.message);
      } else if (res.readOk) {
        toast.info('Lekti OK • Modifikasyon Rezève', res.message);
      } else {
        toast.warning('Verifikasyon Echwe', res.message);
      }
    } catch (err: any) {
      toast.error('Erè Verifikasyon', err?.message || 'Pa t ka verifye koneksyon sèvè santral la.');
    } finally {
      setIsTestingCloudSync(false);
    }
  };

  const handleConnectSuperDevGoogle = async () => {
    setIsConnectingGoogle(true);
    try {
      const user = await signInWithGoogle();
      if (isSuperDeveloperEmail(user.email)) {
        toast.success('Kont Administrasyon Konekte ✓', 'Kont administratè jeneral verifye epi otorize pou mete ajou sèvè santral la.');
      } else {
        toast.warning(
          'Lòt Kont Konekte',
          `Ou konekte kòm ${user.email}, men se sèlman ${SUPER_DEVELOPER_EMAIL} ki otorize pou mete ajou paramèt jeneral yo.`
        );
      }
    } catch (err: any) {
      toast.error('Echèk Koneksyon', err?.message || 'Pa t ka konekte.');
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  // Change Master PIN
  const handleChangeMasterPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMasterPin.trim()) {
      toast.error('Kòd Manke', 'Tanpri mete yon kòd sekirite solid.');
      return;
    }
    if (newMasterPin.trim().length < 6) {
      toast.error('Kòd Twò Kout', 'Kòd sekirite administrasyon an dwe gen omwen 6 karaktè pou pwoteksyon total.');
      return;
    }
    if (newMasterPin.trim() !== confirmMasterPin.trim()) {
      toast.error('Pa Koresponn', 'De kòd sekirite yo dwe idantik.');
      return;
    }

    setIsChangingPin(true);
    try {
      const res = await updateMasterPasswordSecurely(newMasterPin.trim());
      if (res.success) {
        toast.success('Kòd Sekirite Chanje!', res.message);
        setNewMasterPin('');
        setConfirmMasterPin('');
      } else {
        toast.error('Chanjman Echwe', res.message);
      }
    } catch (err: any) {
      toast.error('Erè', err?.message || 'Pa t ka mete ajou kòd sekirite a.');
    } finally {
      setIsChangingPin(false);
    }
  };

  // Export Full Config
  const handleExportConfig = () => {
    const payload = exportFullSystemDatabase();
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(payload, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute(
      'download',
      `omnichurch_v${APP_BASE_VERSION}_config_backup_${new Date().toISOString().split('T')[0]}.json`
    );
    dlAnchor.click();
    toast.success('Ekspòtasyon Konplè', 'Fichye sovgad la telechaje avèk siksè.');
  };

  return (
    <div className="space-y-6">
      {/* SECURITY & ARCHITECTURE HARDENING HUB */}
      <div className="p-6 rounded-3xl bg-[#0B1120] border border-emerald-500/30 space-y-4 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">
                Sant Pwoteksyon & Sekirite Sistèm (v{APP_BASE_VERSION})
              </h3>
              <p className="text-[11px] text-slate-400">
                Eta reyèl sekirite sistèm nan: Chifreman kòd aksè, Règ pwoteksyon sèvè santral, netwayaj dosye ak wòl resepsyon
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={refreshHardeningMetrics}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Rafrechi Eta Sekirite</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Encrypted Church Admin Passcodes */}
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-extrabold text-white">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Chifreman Kòd PIN Administratè Legliz</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                    hardeningMetrics.unhashedPasscodeChurches === 0
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {hardeningMetrics.hashedPasscodeChurches}/{hardeningMetrics.totalChurches} PWOTEJE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Tout kòd PIN administratè legliz yo chifre otomatikman pou okenn modpas oswa kòd pa janm parèt an tèks klè.
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-[10px] font-medium text-slate-400">
                {hardeningMetrics.unhashedPasscodeChurches === 0
                  ? '✓ 100% kòd PIN legliz yo chifre ak sekirite avanse'
                  : `${hardeningMetrics.unhashedPasscodeChurches} legliz bezwen chifreman`}
              </span>
              <button
                type="button"
                onClick={handleUpgradeAllPasscodes}
                disabled={isUpgradingPasscodes}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-[11px] cursor-pointer transition-all disabled:opacity-50"
              >
                {isUpgradingPasscodes ? 'Ap Pwoteje...' : 'Chifre Tout Kòd PIN yo'}
              </button>
            </div>
          </div>

          {/* Card 2: Deleted Records Protection */}
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-extrabold text-white">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span>Pwoteksyon Dosye Efase yo</span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">
                  {hardeningMetrics.tombstones.total} DOSYE BLOKE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Anpeche dosye ki te deja efase yo (manm, sèvis, anons, prezans) retounen pandan senkronizasyon ant aparèy ak sèvè santral la.
              </p>
            </div>

            <div className="grid grid-cols-4 gap-1.5 pt-1 text-center font-mono text-[10px]">
              <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-slate-400">Manm</div>
                <div className="font-bold text-white">{hardeningMetrics.tombstones.members}</div>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-slate-400">Sèvis</div>
                <div className="font-bold text-white">{hardeningMetrics.tombstones.services}</div>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-slate-400">Anons</div>
                <div className="font-bold text-white">{hardeningMetrics.tombstones.announcements}</div>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-slate-400">Prezans</div>
                <div className="font-bold text-white">{hardeningMetrics.tombstones.attendance}</div>
              </div>
            </div>
          </div>

          {/* Card 3: Central Server Authorization */}
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-extrabold text-white">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span>Otorizasyon Sèvè Santral & Izolasyon Kont</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${
                    isSuperDevGoogleAuthed
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {isSuperDevGoogleAuthed ? 'KONT ADMIN AKTIF' : 'MÒD LOKAL SÈLMAN'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Sèvè santral la otorize modifikasyon paramèt jeneral yo sèlman pou <strong className="text-amber-300">{SUPER_DEVELOPER_EMAIL}</strong>. Kont sa a izole depi nan rasin sistèm nan epi li bloke pou l pa janm ka lye ak okenn legliz oswa kont manm.
              </p>
              {cloudSyncResult && (
                <div
                  className={`p-2 rounded-xl text-[11px] font-medium border ${
                    cloudSyncResult.success
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                      : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                  }`}
                >
                  {cloudSyncResult.message}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
              <span className="text-[10px] font-medium text-slate-400">
                {cloudSyncResult
                  ? `Tan repons: ${cloudSyncResult.latencyMs}ms`
                  : isSuperDevGoogleAuthed
                  ? 'Kont Administrasyon Jeneral Konekte ✓'
                  : 'Konekte kont administrasyon pou sove sou sèvè'}
              </span>
              <div className="flex items-center gap-1.5">
                {!isSuperDevGoogleAuthed && (
                  <button
                    type="button"
                    onClick={handleConnectSuperDevGoogle}
                    disabled={isConnectingGoogle}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-[11px] cursor-pointer transition-all disabled:opacity-50"
                  >
                    {isConnectingGoogle ? 'Koneksyon...' : 'Konekte Kont Admin'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleVerifyCloudSync}
                  disabled={isTestingCloudSync}
                  className="px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 font-bold text-[11px] cursor-pointer transition-all disabled:opacity-50"
                >
                  {isTestingCloudSync ? 'Ap Verifye...' : 'Verifye Koneksyon'}
                </button>
              </div>
            </div>
          </div>

          {/* Card 4: Performance & Role Isolation */}
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-extrabold text-white">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <span>Jesyon Pèfòmans & Separasyon Wòl yo</span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                  AKTIF
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Chajman rapid ak rechèch legliz sou demann, senkronizasyon an tan reyèl selon wòl itilizatè a (Administratè / Resepsyon / Manm), ak izolasyon strik kont administrasyon sistèm nan.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1 text-[10px] font-medium">
              <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
                ✓ Izolasyon Kont Admin
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
                ✓ Separasyon pa Wòl
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
                ✓ Rapò Absans 24h
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CHANGE MASTER PIN */}
      <div className="p-6 rounded-3xl bg-[#0B1120] border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">
                Kòd Sekirite Administrasyon Jeneral
              </h3>
              <p className="text-[11px] text-slate-400">
                Mete pwòp kòd sekirite pa w pou panèl administrasyon an (anrejistre an sekirite san li pa nan kòd aplikasyon an)
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Kòd Pèsonalize Pwoteje</span>
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 space-y-1">
          <div className="flex items-center gap-2 text-amber-300 font-bold">
            <Shield className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Pwoteksyon Kòd Sekirite:</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Kòd ou defini an pwoteje aksè panèl la sou aparèy la. Pou li anrejistre sou sèvè santral la tou, konekte ak <strong className="text-amber-300">{SUPER_DEVELOPER_EMAIL}</strong>.
          </p>
        </div>

        <form onSubmit={handleChangeMasterPin} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Mete Nouvo Modpas oswa Kòd Sekirite:</span>
              <span className="text-[10px] font-mono text-amber-400">Omwen 6 karaktè</span>
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                maxLength={32}
                value={newMasterPin}
                onChange={(e) => setNewMasterPin(e.target.value)}
                placeholder="Tape nouvo modpas solid ou a..."
                className="w-full py-2.5 pl-3.5 pr-10 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                tabIndex={-1}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Konfime Nouvo Modpas Devlopè a:
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                maxLength={32}
                value={confirmMasterPin}
                onChange={(e) => setConfirmMasterPin(e.target.value)}
                placeholder="Re-antre menm modpas la..."
                className="w-full py-2.5 pl-3.5 pr-10 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-amber-400 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                tabIndex={-1}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Password Criteria Badges */}
          <div className="flex flex-wrap gap-2 text-[10px] font-mono text-slate-400 pt-1">
            <span
              className={`px-2 py-0.5 rounded-md border ${
                newMasterPin.trim().length >= 6
                  ? 'bg-emerald-950/60 border-emerald-600/60 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              ✓ Min. 6 karaktè
            </span>
            <span
              className={`px-2 py-0.5 rounded-md border ${
                newMasterPin.trim() && newMasterPin.trim() === confirmMasterPin.trim()
                  ? 'bg-emerald-950/60 border-emerald-600/60 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              ✓ Koresponn
            </span>
            <span className="px-2 py-0.5 rounded-md border bg-slate-900 border-slate-800 text-slate-500">
              Chif + Lèt + Senbòl
            </span>
          </div>

          <button
            type="submit"
            disabled={isChangingPin || newMasterPin.trim().length < 6}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-400/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isChangingPin ? 'W ap anrejistre an sekirite...' : 'Anrejistre Modpas Sekirize a nan Baz Done'}
          </button>
        </form>
      </div>

      {/* MAINTENANCE MODE */}
      <div className="p-6 rounded-3xl bg-[#0B1120] border border-slate-800 space-y-3.5 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-sm text-white">
              Mòd Antretyen Global (Maintenance Mode)
            </h3>
            <p className="text-[11px] text-slate-400">
              Mete yon mesaj pou prevni itilizatè yo pandan w ap fè modifikasyon
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.maintenanceMode}
            onChange={(e) =>
              onUpdateSettings({ maintenanceMode: e.target.checked })
            }
            className="w-5 h-5 accent-amber-400 rounded cursor-pointer"
          />
        </div>

        {settings.maintenanceMode && (
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Mesaj Antretyen pou Itilizatè yo:
            </label>
            <textarea
              rows={2}
              value={settings.maintenanceMessage || ''}
              onChange={(e) =>
                onUpdateSettings({ maintenanceMessage: e.target.value })
              }
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400"
            />
          </div>
        )}
      </div>

      {/* SYSTEM DIAGNOSTICS & EXPORT */}
      <div className="p-6 rounded-3xl bg-[#0B1120] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <h3 className="font-extrabold text-sm text-white">
            Ekspòtasyon Konfigirasyon Devlopè
          </h3>
          <p className="text-[11px] text-slate-400">
            Telechaje tout lisans, konfigirasyon AdMob ak sponsò yo an JSON
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportConfig}
          className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer transition-all"
        >
          <Download className="w-4 h-4 text-amber-400" />
          <span>Ekspòte Konfigirasyon (.json)</span>
        </button>
      </div>

      {/* DEVELOPER AUDIT TRAIL LOGS */}
      <div className="p-6 rounded-3xl bg-[#0B1120] border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <div>
              <h3 className="font-extrabold text-sm text-white">
                Istorik Aksyon Devlopè (Developer Audit Trail)
              </h3>
              <p className="text-[11px] text-slate-400">
                Chak aksyon enpòtan (aktivasyon, modifikasyon, oto-reparasyon) anrejistre otomatikman
              </p>
            </div>
          </div>

          {(settings.auditLogs || []).length > 0 && (
            <div className="flex items-center gap-2">
              {confirmClearLogs ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateSettings({ auditLogs: [] });
                      setConfirmClearLogs(false);
                      toast.success('Jounal Efase', 'Istorik aksyon devlopè a netwaye.');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Konfime Efase
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearLogs(false)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    Anile
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClearLogs(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 text-xs font-bold border border-slate-800 transition-colors cursor-pointer"
                >
                  Vide Jounal
                </button>
              )}
            </div>
          )}
        </div>

        {(settings.auditLogs || []).length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs font-mono">
            Okenn aksyon poko anrejistre nan jounal la.
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {(settings.auditLogs || []).map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white font-mono">{log.action}</span>
                    <span
                      className={`px-2 py-0.2 rounded text-[9px] font-bold font-mono uppercase ${
                        log.status === 'success'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : log.status === 'error'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>
                  {log.details && (
                    <div className="text-[11px] text-slate-400">{log.details}</div>
                  )}
                </div>
                <span className="text-[10px] font-mono text-slate-500 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SYSTEM ENVIRONMENT DIAGNOSTICS */}
      <div className="p-6 rounded-3xl bg-[#0B1120] border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Cpu className="w-4 h-4 text-amber-400" />
          <div>
            <h3 className="font-extrabold text-sm text-white">
              Dyagnostik Anviwònman & Enfrastrikti
            </h3>
            <p className="text-[11px] text-slate-400">
              Paramèt teknik sou navigatè a, rezo a ak nivo pèfòmans
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="text-slate-400 text-[10px]">Vèsyon App:</div>
            <div className="font-mono font-bold text-white text-xs mt-0.5">
              OMNICHURCH PRO v{APP_BASE_VERSION}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="text-slate-400 text-[10px]">Sèvè Santral Administrasyon:</div>
            <div
              className={`font-semibold text-xs mt-0.5 flex items-center gap-1.5 ${
                isSuperDevGoogleAuthed ? 'text-emerald-400' : 'text-amber-300'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isSuperDevGoogleAuthed ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                }`}
              />
              <span>
                {isSuperDevGoogleAuthed
                  ? 'Kont Administrasyon Aktif ✓'
                  : 'Mòd Lokal • Konekte Kont Admin pou Sèvè'}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="text-slate-400 text-[10px]">Estati Rezo Kouran:</div>
            <div className="font-mono font-bold text-white text-xs mt-0.5">
              {typeof navigator !== 'undefined' && navigator.onLine
                ? '🟢 Sou Entènèt (Online)'
                : '🟡 San Fil / Mòd Dekonekte'}
            </div>
          </div>
        </div>
      </div>

      {/* OFFICIAL LEGAL DOCUMENTS, CUSTOM TEXT EDITOR & CUSTOM DOMAIN LINKS */}
      <div className="p-6 rounded-3xl bg-[#0B1120] border border-slate-800 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">
                Jesyon Dokiman Legal & Lyen Ofisyèl Domèn Ou
              </h3>
              <p className="text-[11px] text-slate-400">
                Mete tèks Konfidansyalite ak Kondisyon Itilizasyon yo ajou tèt ou, epi antre lyen domèn ofisyèl ou yo (chan lyen yo vid pa defo)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs shrink-0">
            {onOpenPrivacyPolicy && (
              <button
                type="button"
                id="dev-security-open-privacy"
                onClick={onOpenPrivacyPolicy}
                className="text-amber-300 hover:text-amber-200 underline underline-offset-2 font-semibold inline-flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
              >
                <span>Wè Konfidansyalite</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
            {onOpenTermsOfService && (
              <button
                type="button"
                id="dev-security-open-terms"
                onClick={onOpenTermsOfService}
                className="text-amber-300 hover:text-amber-200 underline underline-offset-2 font-semibold inline-flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
              >
                <span>Wè Kondisyon</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* 1. Custom Official URL Fields (Strictly Blank by Default - Zero Link Trace) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <label
              htmlFor="dev-input-official-privacy-url"
              className="block text-[11px] font-bold text-slate-300"
            >
              Lyen Ofisyèl Politik Konfidansyalite (Domèn Ou)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="dev-input-official-privacy-url"
                type="url"
                value={legalDraft.officialPrivacyUrl}
                onChange={(e) =>
                  setLegalDraft((prev) => ({
                    ...prev,
                    officialPrivacyUrl: e.target.value,
                  }))
                }
                placeholder=""
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
              />
              {legalDraft.officialPrivacyUrl.trim() && (
                <button
                  type="button"
                  onClick={() => handleCopyLegalUrl('privacy')}
                  className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  {copiedLegalKey === 'privacy' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <label
              htmlFor="dev-input-official-terms-url"
              className="block text-[11px] font-bold text-slate-300"
            >
              Lyen Ofisyèl Kondisyon Itilizasyon (Domèn Ou)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="dev-input-official-terms-url"
                type="url"
                value={legalDraft.officialTermsUrl}
                onChange={(e) =>
                  setLegalDraft((prev) => ({
                    ...prev,
                    officialTermsUrl: e.target.value,
                  }))
                }
                placeholder=""
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
              />
              {legalDraft.officialTermsUrl.trim() && (
                <button
                  type="button"
                  onClick={() => handleCopyLegalUrl('terms')}
                  className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  {copiedLegalKey === 'terms' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={Boolean(legalDraft.useExternalLinksOnClick)}
            onChange={(e) =>
              setLegalDraft((prev) => ({
                ...prev,
                useExternalLinksOnClick: e.target.checked,
              }))
            }
            className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
          />
          <span>
            Lè lyen ofisyèl yo ranpli anlè a, louvri yo dirèkteman sou domèn nan lè itilizatè klike (olye paj blan entèn lan)
          </span>
        </label>

        {/* 2. Self-Service Legal Content Editor */}
        <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditingDocType('privacy')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                  editingDocType === 'privacy'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                Politik Konfidansyalite
              </button>
              <button
                type="button"
                onClick={() => setEditingDocType('terms')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                  editingDocType === 'terms'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                Kondisyon Itilizasyon
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {(['ht', 'fr', 'en', 'es'] as Language[]).map((langCode) => (
                <button
                  key={langCode}
                  type="button"
                  onClick={() => setEditingLang(langCode)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold uppercase cursor-pointer ${
                    editingLang === langCode
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {langCode}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Tit Dokiman ({editingLang.toUpperCase()})
              </label>
              <input
                type="text"
                value={currentLangEntry.title ?? ''}
                onChange={(e) => updateCurrentEntryField('title', e.target.value)}
                placeholder={defaultDocLocale.title}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Dat Dènye Mizajou ({editingLang.toUpperCase()})
              </label>
              <input
                type="text"
                value={currentLangEntry.lastUpdatedDate ?? ''}
                onChange={(e) => updateCurrentEntryField('lastUpdatedDate', e.target.value)}
                placeholder={defaultDocLocale.lastUpdatedDate}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-[11px] font-bold text-slate-300">
                Tèks Konplè ({editingDocType === 'privacy' ? 'Konfidansyalite' : 'Kondisyon'} • {editingLang.toUpperCase()})
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadDefaultIntoEditor}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-semibold cursor-pointer"
                >
                  Chaje Tèks Aktyèl la pou Modifye
                </button>
                <button
                  type="button"
                  onClick={handleResetLangToDefault}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Pa Defo</span>
                </button>
              </div>
            </div>
            <textarea
              id="dev-textarea-legal-content"
              rows={10}
              value={currentLangEntry.content ?? ''}
              onChange={(e) => updateCurrentEntryField('content', e.target.value)}
              placeholder="Kite l vid pou itilize tèks ofisyèl pa defo a, oubyen klike 'Chaje Tèks Aktyèl la pou Modifye' pou w chanje sa w vle (itilize '## Tit Seksyon' ak '- Pwen lis')."
              className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs leading-relaxed focus:outline-none focus:border-amber-400 font-sans"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <span className="text-[10px] text-slate-400">
              {currentLangEntry.content?.trim()
                ? '✓ Tèks pèsonalize aktif pou lang sa a'
                : '• Ap itilize tèks ofisyèl pa defo a pou lang sa a'}
            </span>
            <button
              type="button"
              id="dev-btn-save-legal-config"
              disabled={isSavingLegal}
              onClick={handleSaveLegalConfig}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs inline-flex items-center gap-2 shadow-lg shadow-amber-400/20 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingLegal ? 'Ap Anrejistre...' : 'Anrejistre Tèks & Lyen yo'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
