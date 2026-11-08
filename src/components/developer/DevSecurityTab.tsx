import React, { useState, useEffect } from 'react';
import { DeveloperSettings, Language } from '../../types';
import {
  updateMasterPasswordSecurely,
  exportFullSystemDatabase,
  getSecurityHardeningMetrics,
  upgradeAllChurchPasscodesToSha256,
  verifyCloudConfigSync,
  SecurityHardeningMetrics,
} from '../../utils/developerStorage';
import { useToast } from '../../context/ToastContext';
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
} from 'lucide-react';

export interface DevSecurityTabProps {
  settings: DeveloperSettings;
  onUpdateSettings: (updated: Partial<DeveloperSettings>) => Promise<void>;
  language?: Language;
}

export const DevSecurityTab: React.FC<DevSecurityTabProps> = ({
  settings,
  onUpdateSettings,
  language = 'ht',
}) => {
  const toast = useToast();

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
    latencyMs: number;
    message: string;
  } | null>(null);
  const [confirmClearLogs, setConfirmClearLogs] = useState<boolean>(false);

  const refreshHardeningMetrics = () => {
    setHardeningMetrics(getSecurityHardeningMetrics());
  };

  useEffect(() => {
    refreshHardeningMetrics();
  }, [settings]);

  // Upgrade all church admin passcodes to SHA-256
  const handleUpgradeAllPasscodes = async () => {
    setIsUpgradingPasscodes(true);
    try {
      const res = await upgradeAllChurchPasscodesToSha256();
      refreshHardeningMetrics();
      if (res.upgradedCount > 0) {
        toast.success(
          'Chifreman SHA-256 Konplè!',
          `${res.upgradedCount} PIN legliz chifre ak Salted SHA-256 (sha256:v1).`
        );
      } else {
        toast.info(
          'Tout PIN Deja Chifre',
          'Tout PIN administratè legliz yo deja chifre ak SHA-256.'
        );
      }
    } catch (err: any) {
      toast.error('Erè Chifreman', err?.message || 'Pa t ka chifre PIN legliz yo.');
    } finally {
      setIsUpgradingPasscodes(false);
    }
  };

  // Test live Firestore /app_config/developer_engine sync
  const handleVerifyCloudSync = async () => {
    setIsTestingCloudSync(true);
    try {
      const res = await verifyCloudConfigSync();
      setCloudSyncResult({
        success: res.ok,
        latencyMs: res.latencyMs,
        message: res.message,
      });
      if (res.ok) {
        toast.success('Senkronizasyon Cloud Verifye!', res.message);
      } else {
        toast.warning('Tès Nwaj Echwe', res.message);
      }
    } catch (err: any) {
      toast.error('Erè Tès Cloud', err?.message || 'Pa t ka teste koneksyon Firestore la.');
    } finally {
      setIsTestingCloudSync(false);
    }
  };

  // Change Master PIN
  const handleChangeMasterPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMasterPin.trim()) {
      toast.error('Kòd Manke', 'Tanpri mete yon kòd PIN solid.');
      return;
    }
    if (newMasterPin.trim().length < 6) {
      toast.error('Kòd Twò Kout', 'Kòd sekirite devlopè a dwe gen omwen 6 karaktè pou pwoteksyon total.');
      return;
    }
    if (newMasterPin.trim() !== confirmMasterPin.trim()) {
      toast.error('Pa Koresponn', 'De modpas yo dwe idantik.');
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
      toast.error('Erè', err?.message || 'Pa t ka mete ajou kòd PIN la.');
    } finally {
      setIsChangingPin(false);
    }
  };

  // Export Full Config
  const handleExportConfig = () => {
    exportFullSystemDatabase();
    toast.success('Ekspòtasyon Konplè', 'Fichye konfigirasyon an telechaje.');
  };

  return (
    <div className="space-y-6">
      {/* SECURITY & ARCHITECTURE HARDENING HUB (RECENT UPDATES) */}
      <div className="p-6 rounded-3xl bg-[#0B1120] border border-emerald-500/30 space-y-4 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">
                Boukliye Sekirite & Mizajou Achitekti (Security Hardening v2.6)
              </h3>
              <p className="text-[11px] text-slate-400">
                Kontwòl dirèk sou nouvo kouch sekirite yo: chifreman PIN SHA-256, Règ Firestore v2, Tombstone Anti-Resireksyon & Pwoteksyon Runtime
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={refreshHardeningMetrics}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Rafrechi Metrik</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Salted SHA-256 Church Admin Passcodes */}
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-extrabold text-white">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Chifreman PIN Admin Legliz (SHA-256)</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                    hardeningMetrics.plainTextPasscodeChurches === 0
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {hardeningMetrics.hashedPasscodeChurches}/{hardeningMetrics.totalChurches} CHIFRE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Tout PIN administratè legliz yo chifre ak Salted SHA-256 (<code className="text-amber-300 font-mono">sha256:v1</code>) pou okenn modpas pa parèt an tèks klè nan Firestore oswa LocalStorage.
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-[10px] font-mono text-slate-400">
                {hardeningMetrics.plainTextPasscodeChurches === 0
                  ? '✓ 100% PIN legliz yo pwoteje ak SHA-256'
                  : `${hardeningMetrics.plainTextPasscodeChurches} legliz an tèks klè ki rete`}
              </span>
              <button
                type="button"
                onClick={handleUpgradeAllPasscodes}
                disabled={isUpgradingPasscodes}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-[11px] cursor-pointer transition-all disabled:opacity-50"
              >
                {isUpgradingPasscodes ? 'Ap Chifre...' : 'Chifre Tout PIN an SHA-256'}
              </button>
            </div>
          </div>

          {/* Card 2: Tombstone Anti-Resurrection Engine */}
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-extrabold text-white">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span>Motè Anti-Resireksyon (Tombstone Registry)</span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">
                  {hardeningMetrics.tombstones.total} ID BLOKE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Anpeche dosye ki efase yo (manm, kilt, anons, prezans) retounen pandan senkronizasyon Offline/Cloud.
              </p>
            </div>

            <div className="grid grid-cols-4 gap-1.5 pt-1 text-center font-mono text-[10px]">
              <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-slate-400">Manm</div>
                <div className="font-bold text-white">{hardeningMetrics.tombstones.members}</div>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-slate-400">Kilt</div>
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

          {/* Card 3: Firestore Rules v2 & /app_config Cloud Sync */}
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-extrabold text-white">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span>Firestore Rules v2 & Koleksyon /app_config</span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-mono font-bold">
                  DEPLOYED
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Koleksyon <code className="text-blue-300 font-mono">/app_config/developer_engine</code> otorize nan <code className="text-blue-300 font-mono">firestore.rules</code> epi aksyon <code className="text-rose-300 font-mono">delete</code> pwoteje ak otantifikasyon Firebase.
              </p>
              {cloudSyncResult && (
                <div
                  className={`p-2 rounded-xl text-[11px] font-mono border ${
                    cloudSyncResult.success
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {cloudSyncResult.message}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-[10px] font-mono text-slate-400">
                {cloudSyncResult
                  ? `Latans: ${cloudSyncResult.latencyMs}ms`
                  : 'Teste lekti/ekriti sou Firestore'}
              </span>
              <button
                type="button"
                onClick={handleVerifyCloudSync}
                disabled={isTestingCloudSync}
                className="px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 font-bold text-[11px] cursor-pointer transition-all disabled:opacity-50"
              >
                {isTestingCloudSync ? 'Ap Teste...' : 'Teste Senkronizasyon Cloud'}
              </button>
            </div>
          </div>

          {/* Card 4: Runtime Null-Safety & Quota Guard */}
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-extrabold text-white">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <span>Pwoteksyon Runtime & Optimizasyon Quota</span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold">
                  AKTIF
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Pwoteksyon total kont erè <code className="text-purple-300 font-mono">undefined.toLowerCase()</code> (autofill/klavye & rechèch) ak dezaktivasyon eskanè lou nan demaraj pou ekonomize quota Firestore.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1 text-[10px] font-mono">
              <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
                ✓ Null-Safe String Filters
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
                ✓ Startup Quota Guard
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
                ✓ Error Diagnostic Logger
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
                Kòd Sekirite Devlopè Pèsonalize (Master Code)
              </h3>
              <p className="text-[11px] text-slate-400">
                Mete pwòp kòd sekirite pa w pou panèl la (li anrejistre nan baz done a san li pa nan kòd app la)
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Kòd Pèsonalize Pwoteje</span>
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 space-y-1">
          <div className="flex items-center gap-2 text-amber-300 font-bold">
            <Shield className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Sekirite Zewo Hardcode:</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Kòd ou defini an anrejistre dirèkteman nan konfigirasyon baz done nwaj ou (Firestore) ak nan memwa sekirize navigatè a. Pa gen okenn ansyen kòd fiks ki ka itilize pou antre lè w fin defini kòd pa w la.
          </p>
        </div>

        <form onSubmit={handleChangeMasterPin} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Mete Nouvo Modpas oswa PIN Devlopè:</span>
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
            <div className="text-slate-400 text-[10px]">Vèsyon Motè:</div>
            <div className="font-mono font-bold text-white text-xs mt-0.5">
              OMNICHURCH ENGINE v2.6 PRO
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="text-slate-400 text-[10px]">Koneksyon Nwaj:</div>
            <div className="font-mono font-bold text-emerald-400 text-xs mt-0.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Firestore & Storage Senkronize</span>
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
    </div>
  );
};
