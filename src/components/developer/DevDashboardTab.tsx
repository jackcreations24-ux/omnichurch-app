import React, { useState, useEffect } from 'react';
import {
  Church,
  DeveloperSettings,
  Language,
} from '../../types';
import { APP_BASE_VERSION } from '../../version';
import {
  Cpu,
  Building2,
  Users,
  Calendar,
  CheckCircle2,
  HardDrive,
  Shield,
  Zap,
  Activity,
  Download,
  Wrench,
  Trash2,
  RefreshCw,
  Clock,
  KeyRound,
  AlertTriangle,
  Radio,
  FileText,
  Sparkles,
  Check,
} from 'lucide-react';
import {
  getAllChurches,
  getAllMembers,
  getAllServices,
  getAllAttendance,
} from '../../utils/storage';
import {
  calculateAppStorageUsage,
  exportFullSystemDatabase,
  runDatabaseIntegrityCheckAndRepair,
  DatabaseDoctorReport,
  toggleSystemMaintenanceMode,
  toggleLicenseLockout,
  purgeAllDemoLicenses,
  purgeDemoSponsors,
} from '../../utils/developerStorage';
import { useToast } from '../../context/ToastContext';

export interface DevDashboardTabProps {
  settings: DeveloperSettings;
  onUpdateSettings: (updated: Partial<DeveloperSettings>) => Promise<void>;
  onNavigateTab: (tab: any) => void;
  language?: Language;
  onRefreshAll?: () => void;
}

export const DevDashboardTab: React.FC<DevDashboardTabProps> = ({
  settings,
  onUpdateSettings,
  onNavigateTab,
  language = 'ht',
  onRefreshAll,
}) => {
  const toast = useToast();
  const [stats, setStats] = useState({
    churchesCount: 0,
    membersCount: 0,
    servicesCount: 0,
    attendanceCount: 0,
    activeLicensesCount: 0,
  });

  const [storageUsage, setStorageUsage] = useState(() => calculateAppStorageUsage());
  const [isDoctorRunning, setIsDoctorRunning] = useState(false);
  const [doctorReport, setDoctorReport] = useState<DatabaseDoctorReport | null>(null);
  const [isPurging, setIsPurging] = useState(false);
  const [confirmPurgeDemo, setConfirmPurgeDemo] = useState(false);

  const loadStats = () => {
    const ch = getAllChurches();
    const mb = getAllMembers();
    const sv = getAllServices();
    const att = getAllAttendance();
    const activeLic = settings.licenses.filter((l) => l.status === 'active').length;

    setStats({
      churchesCount: ch.length,
      membersCount: mb.length,
      servicesCount: sv.length,
      attendanceCount: att.length,
      activeLicensesCount: activeLic,
    });
    setStorageUsage(calculateAppStorageUsage());
  };

  useEffect(() => {
    loadStats();
  }, [settings]);

  // Run Database Doctor
  const handleRunDoctor = async () => {
    setIsDoctorRunning(true);
    try {
      const rep = await runDatabaseIntegrityCheckAndRepair();
      setDoctorReport(rep);
      loadStats();
      if (rep.repairsApplied.length > 0) {
        toast.success(
          'Reparasyon Baz Done Fèt!',
          `${rep.repairsApplied.length} koreksyon otomatik aplike avèk siksè nan baz done a.`
        );
      } else if (rep.issuesDetected.length === 0) {
        toast.success(
          'Baz Done Sen!',
          'Okenn erè oswa enkoyerans pa detekte nan baz done a.'
        );
      }
    } catch (err: any) {
      toast.error('Erè Enspeksyon', err?.message || 'Pa ka fè enspeksyon an');
    } finally {
      setIsDoctorRunning(false);
    }
  };

  // 1-Click Export Full Database Backup
  const handleExportFullBackup = () => {
    const backup = exportFullSystemDatabase();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `omnichurch_master_backup_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchor.click();
    toast.success('Sovgad Ekspòte!', 'Tout baz done a (legliz, manm, kilt, prezans, paramèt) telechaje an JSON.');
  };

  // Toggle Maintenance Mode
  const handleToggleMaintenance = async () => {
    const next = !settings.maintenanceMode;
    await toggleSystemMaintenanceMode(next);
    await onUpdateSettings({ maintenanceMode: next });
  };

  // 1-Click License Lockout Toggle
  const handleToggleLockout = async () => {
    const next = !settings.enforceLicenseLockout;
    await toggleLicenseLockout(next);
    await onUpdateSettings({ enforceLicenseLockout: next });
    if (next) {
      toast.info('Sistèm Lisans Aktive!', 'Sistèm nan kounye a mande kle ofisyèl pou tout legliz.');
    } else {
      toast.success('Mòd Lib Aktive!', 'Tout legliz ka fonksyone libman san restriksyon.');
    }
  };

  // Quick Purge Demo Data
  const handleQuickPurgeDemo = async () => {
    setIsPurging(true);
    try {
      const licRes = await purgeAllDemoLicenses();
      const sponRes = await purgeDemoSponsors();
      loadStats();
      setConfirmPurgeDemo(false);
      if (onRefreshAll) onRefreshAll();
      toast.success(
        'Netwayaj Fèt!',
        `${licRes.purgedCount} lisans demo ak ${sponRes.purgedCount} sponsò demo retire nèt nan baz done a.`
      );
    } catch (err: any) {
      toast.error('Erè Netwayaj', err?.message);
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* TOP ENGINE STATUS BANNER */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#0B1120] via-slate-900 to-[#0B1120] border border-amber-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-black uppercase tracking-wider">
                CORE ENGINE LIVE & OPERATIONAL
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono">
                PWA / Offline First v2.6
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Sant Kontwòl & Motè Global OmniChurch
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Panèl sa a ba w kontwòl total sou tout ekosistèm aplikasyon an: legliz ki anrejistre yo, baz done santral la, monetizasyon AdMob, dèlko lisans ofisyèl, alèt global ak zouti oto-reparasyon.
            </p>
          </div>

          {/* Quick Status Badges */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <div className="px-4 py-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-center min-w-[100px]">
              <div className="text-[10px] uppercase font-bold text-slate-400">Antretyen</div>
              <div className={`text-xs font-black mt-0.5 ${settings.maintenanceMode ? 'text-amber-400' : 'text-emerald-400'}`}>
                {settings.maintenanceMode ? 'AKTIF' : 'MÒD NÒMAL'}
              </div>
            </div>

            <div className="px-4 py-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-center min-w-[100px]">
              <div className="text-[10px] uppercase font-bold text-slate-400">Pwoteksyon Lisans</div>
              <div className={`text-xs font-black mt-0.5 ${settings.enforceLicenseLockout ? 'text-emerald-400' : 'text-amber-300'}`}>
                {settings.enforceLicenseLockout ? 'PWOTEJE' : 'FLEKSIB (LIB)'}
              </div>
            </div>

            <div className="px-4 py-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-center min-w-[100px]">
              <div className="text-[10px] uppercase font-bold text-slate-400">Espace Itilize</div>
              <div className="text-xs font-black font-mono text-white mt-0.5">
                {storageUsage.totalKb}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PLATFORM OVERVIEW METRICS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <button
          type="button"
          onClick={() => onNavigateTab('churches')}
          className="p-4 rounded-2xl bg-[#0B1120] hover:bg-[#0F172A] border border-slate-800 hover:border-amber-400/50 transition-all text-left group shadow-lg cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold">Legliz Anrejistre</span>
            <Building2 className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{stats.churchesCount}</div>
          <div className="text-[10px] text-amber-300/80 mt-1 flex items-center gap-1">
            <span>Jere tout legliz &rarr;</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('database')}
          className="p-4 rounded-2xl bg-[#0B1120] hover:bg-[#0F172A] border border-slate-800 hover:border-emerald-400/50 transition-all text-left group shadow-lg cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold">Manm Global</span>
            <Users className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{stats.membersCount}</div>
          <div className="text-[10px] text-emerald-300/80 mt-1 flex items-center gap-1">
            <span>Enspekte baz done &rarr;</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('database')}
          className="p-4 rounded-2xl bg-[#0B1120] hover:bg-[#0F172A] border border-slate-800 hover:border-blue-400/50 transition-all text-left group shadow-lg cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold">Sèvis & Kilt</span>
            <Calendar className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{stats.servicesCount}</div>
          <div className="text-[10px] text-blue-300/80 mt-1 flex items-center gap-1">
            <span>Sesyon kilt kreye &rarr;</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('attendance')}
          className="p-4 rounded-2xl bg-[#0B1120] hover:bg-[#0F172A] border border-slate-800 hover:border-purple-400/50 transition-all text-left group shadow-lg cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold">Prezans Eskane</span>
            <CheckCircle2 className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{stats.attendanceCount}</div>
          <div className="text-[10px] text-purple-300/80 mt-1 flex items-center gap-1">
            <span>Dosye prezans QR &rarr;</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('licenses')}
          className="p-4 rounded-2xl bg-[#0B1120] hover:bg-[#0F172A] border border-slate-800 hover:border-amber-400/50 transition-all text-left group shadow-lg cursor-pointer col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold">Lisans Aktif</span>
            <KeyRound className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{stats.activeLicensesCount}</div>
          <div className="text-[10px] text-amber-300/80 mt-1 flex items-center gap-1">
            <span>Dèlko & kle lisans &rarr;</span>
          </div>
        </button>
      </div>

      {/* MASTER ACTION HUB */}
      <div className="p-6 rounded-3xl bg-[#0B1120] border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">
                Sant Aksyon Imedyat Devlopè (Master Actions)
              </h3>
              <p className="text-[11px] text-slate-400">
                Aksyon rapid pou kontwole sistèm nan, enspekte done yo, ak sovgade platfòm nan
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Action 1: Database Doctor */}
          <button
            type="button"
            onClick={handleRunDoctor}
            disabled={isDoctorRunning}
            className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 text-left transition-all group flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Wrench className={`w-4 h-4 ${isDoctorRunning ? 'animate-spin' : ''}`} />
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                OTO-REPARASYON
              </span>
            </div>
            <div>
              <div className="font-extrabold text-xs text-white group-hover:text-emerald-300">
                Database Doctor & Self-Healing
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                Detekte epi korije otomatikman ID manm ki double, referans ki kase, oswa kòd manm ki manke.
              </p>
            </div>
          </button>

          {/* Action 2: Export Full Database */}
          <button
            type="button"
            onClick={handleExportFullBackup}
            className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/50 text-left transition-all group flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Download className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                SOVGAD JSON
              </span>
            </div>
            <div>
              <div className="font-extrabold text-xs text-white group-hover:text-amber-300">
                Telechaje Sovgad Konplè
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                Ekspòte tout baz done a (legliz, manm, kilt, prezans ak lisans) nan yon sèl fichye JSON sekirize.
              </p>
            </div>
          </button>

          {/* Action 3: 1-Click License Switch */}
          <button
            type="button"
            onClick={handleToggleLockout}
            className={`p-4 rounded-2xl border text-left transition-all group flex flex-col justify-between cursor-pointer ${
              settings.enforceLicenseLockout
                ? 'bg-emerald-950/30 border-emerald-500/40 hover:bg-emerald-900/30'
                : 'bg-slate-900 border-slate-800 hover:border-amber-500/50'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                settings.enforceLicenseLockout
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              }`}>
                <Shield className="w-4 h-4" />
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                settings.enforceLicenseLockout
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {settings.enforceLicenseLockout ? 'PWOTEJE' : 'FLEKSIB'}
              </span>
            </div>
            <div>
              <div className="font-extrabold text-xs text-white">
                {settings.enforceLicenseLockout ? 'Dezaktive Pwoteksyon Lisans' : 'Aktive Pwoteksyon Lisans'}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                Baskile ant mòd lib (tout legliz itilize libman) ak mòd pwoteje (mande lisans ofisyèl).
              </p>
            </div>
          </button>

          {/* Action 4: Broadcast Alert */}
          <button
            type="button"
            onClick={() => onNavigateTab('broadcasts')}
            className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-rose-500/50 text-left transition-all group flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Radio className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                ALÈT GLOBAL
              </span>
            </div>
            <div>
              <div className="font-extrabold text-xs text-white group-hover:text-rose-300">
                Voye Alèt oswa Kominike
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                Pibliye yon banyè alèt oswa mesaj ijan pou tout legliz oswa yon legliz espesifik.
              </p>
            </div>
          </button>

          {/* Action 5: App Updates & Release Hub */}
          <button
            type="button"
            onClick={() => onNavigateTab('updates')}
            className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-amber-400/50 text-left transition-all group flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                <Sparkles className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold">
                MIZAJOU APP
              </span>
            </div>
            <div>
              <div className="font-extrabold text-xs text-white group-hover:text-amber-300">
                Anons & Vèsyon Mizajou
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                Jere vèsyon v{settings.appUpdate?.latestVersion || APP_BASE_VERSION}, nòt piblikasyon ak lyen sit telechajman an.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* DOCTOR REPORT CARD (IF SCANNED) */}
      {doctorReport && (
        <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-emerald-500/40 shadow-xl space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-emerald-400" />
              <h4 className="text-sm font-black text-white">
                Rapò Database Doctor & Self-Healing
              </h4>
              <span className="text-[10px] font-mono text-slate-400">
                {new Date(doctorReport.checkedAt).toLocaleTimeString()}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDoctorReport(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Fèmen Rapò
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-slate-400 text-[10px]">Manm verifye:</div>
              <div className="font-mono font-black text-white text-sm mt-0.5">{doctorReport.totalMembers}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-slate-400 text-[10px]">Sèvis verifye:</div>
              <div className="font-mono font-black text-white text-sm mt-0.5">{doctorReport.totalServices}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-slate-400 text-[10px]">Prezans verifye:</div>
              <div className="font-mono font-black text-white text-sm mt-0.5">{doctorReport.totalAttendance}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-slate-400 text-[10px]">PIN Admin SHA-256:</div>
              <div className="font-mono font-black text-amber-400 text-sm mt-0.5">
                {doctorReport.hashedChurchesCount ?? doctorReport.totalChurches}/{doctorReport.totalChurches}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-slate-400 text-[10px]">Tombstones Aktif:</div>
              <div className="font-mono font-black text-blue-400 text-sm mt-0.5">
                {doctorReport.tombstonesProtectedCount ?? 0}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-slate-400 text-[10px]">Reparasyon Aplike:</div>
              <div className="font-mono font-black text-emerald-400 text-sm mt-0.5">
                {doctorReport.repairsApplied.length}
              </div>
            </div>
          </div>

          {doctorReport.repairsApplied.length > 0 ? (
            <div className="space-y-1.5 p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs">
              <div className="font-bold text-emerald-300">Koreksyon ki fèt:</div>
              <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                {doctorReport.repairsApplied.map((rep, idx) => (
                  <li key={idx}>{rep}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-xs text-emerald-400 flex items-center gap-2 p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
              <Check className="w-4 h-4" />
              <span>Tout done yo entèg, pa gen okenn enkoyerans oswa erè detekte!</span>
            </div>
          )}
        </div>
      )}

      {/* STORAGE FOOTPRINT BREAKDOWN */}
      <div className="p-6 rounded-3xl bg-[#0B1120] border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-extrabold text-sm text-white">
                Anpwent Memwa & Done Sistèm nan (Storage Footprint)
              </h3>
              <p className="text-[11px] text-slate-400">
                Pwa total done ki estoke nan navigatè a ak kantite dosye pa tab
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {confirmPurgeDemo ? (
              <>
                <button
                  type="button"
                  onClick={handleQuickPurgeDemo}
                  disabled={isPurging}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isPurging ? 'Ap Netwaye...' : 'Konfime Netwayaj Demo'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmPurgeDemo(false)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Anile
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmPurgeDemo(true)}
                disabled={isPurging}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/50 border border-slate-800 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Netwaye Done Demo</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setStorageUsage(calculateAppStorageUsage())}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
              title="Rafrechi"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {storageUsage.perKeyBreakdown.slice(0, 6).map((item) => (
            <div
              key={item.key}
              className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between"
            >
              <div className="truncate mr-2">
                <div className="text-xs font-bold text-slate-200 truncate font-mono">
                  {item.key.replace('app_legiz_', '').replace('_v1', '')}
                </div>
                {item.itemsCount !== undefined && (
                  <div className="text-[10px] text-slate-500 font-mono">
                    {item.itemsCount} eleman
                  </div>
                )}
              </div>
              <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] font-bold text-amber-400 shrink-0">
                {item.kb}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
