import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  Database,
  RefreshCw,
  Search,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import {
  AttendanceRecord,
  Church,
  Language,
  ServiceSession,
} from '../../types';
import {
  getPendingOfflineAttendance,
  isDeviceOnline,
  syncPendingOfflineAttendance,
} from '../../utils/storage';
import {
  QueuedAttendance,
  getQueuedItems,
  subscribeSyncStatus,
  triggerOfflineSync,
} from '../../utils/offlineQueue';
import { firestoreGetChurchAttendanceRecords } from '../../services/firestoreService';
import { useToast } from '../../context/ToastContext';

interface AdminAttendanceAuditProps {
  church: Church;
  services: ServiceSession[];
  attendanceRecords: AttendanceRecord[];
  language?: Language;
  onSyncCompleted?: () => void;
}

type AuditFilter = 'all' | 'synced' | 'pending' | 'failed';

interface AuditRowItem {
  id: string;
  record: AttendanceRecord;
  syncState: 'synced' | 'pending' | 'failed';
  retryCount: number;
  lastError?: string;
}

export const AdminAttendanceAudit: React.FC<AdminAttendanceAuditProps> = ({
  church,
  services,
  attendanceRecords,
  language = 'ht',
  onSyncCompleted,
}) => {
  const toast = useToast();
  const isEs = language === 'es';
  const isFr = language === 'fr';
  const isEn = language === 'en';

  const [pendingLocalRecords, setPendingLocalRecords] = useState<AttendanceRecord[]>(() =>
    getPendingOfflineAttendance().filter((r) => !r.churchId || r.churchId === church.id)
  );
  const [queuedIdbItems, setQueuedIdbItems] = useState<QueuedAttendance[]>([]);
  const [remoteFirestoreRecords, setRemoteFirestoreRecords] = useState<AttendanceRecord[] | null>(null);
  const [isSyncingNow, setIsSyncingNow] = useState<boolean>(false);
  const [isAuditingRemote, setIsAuditingRemote] = useState<boolean>(false);
  const [lastAuditAt, setLastAuditAt] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(() => isDeviceOnline());
  const [statusFilter, setStatusFilter] = useState<AuditFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadLocalQueues = useCallback(async () => {
    const localPending = getPendingOfflineAttendance().filter(
      (r) => !r.churchId || r.churchId === church.id || r.churchId === church.code
    );
    setPendingLocalRecords(localPending);

    const idbItems = await getQueuedItems();
    const scopedIdb = idbItems.filter(
      (item) =>
        !item.record?.churchId ||
        item.record.churchId === church.id ||
        item.record.churchId === church.code
    );
    setQueuedIdbItems(scopedIdb);
  }, [church.id, church.code]);

  const runRemoteFirestoreAudit = useCallback(
    async (silent = false) => {
      if (!isDeviceOnline()) {
        if (!silent) {
          toast.warning(
            isEs ? 'Sin conexión a Internet' : isFr ? 'Hors-ligne' : isEn ? 'Offline' : 'Pa gen Entènèt',
            isEs
              ? 'No se puede verificar la nube mientras el dispositivo está sin conexión.'
              : isFr
              ? 'Impossible de vérifier le serveur cloud hors-ligne.'
              : isEn
              ? 'Cannot verify cloud records while offline.'
              : 'Pa ka verifye sèvè a pandan aparèy la offline.'
          );
        }
        return;
      }

      setIsAuditingRemote(true);
      try {
        const remote = await firestoreGetChurchAttendanceRecords(church.id);
        setRemoteFirestoreRecords(remote);
        setLastAuditAt(new Date().toISOString());
        await loadLocalQueues();
        if (!silent) {
          toast.success(
            isEs ? 'Auditoría Completada' : isFr ? 'Audit Terminé' : isEn ? 'Audit Complete' : 'Odit Konplete',
            isEs
              ? `${remote.length} asistencias confirmadas en línea.`
              : isFr
              ? `${remote.length} présences confirmées en ligne.`
              : isEn
              ? `${remote.length} attendance records verified in the cloud.`
              : `${remote.length} prezans konfime an liy avèk siksè.`
          );
        }
      } catch (err) {
        console.warn('Attendance audit Firestore fetch warning:', err);
      } finally {
        setIsAuditingRemote(false);
      }
    },
    [church.id, isEs, isFr, isEn, loadLocalQueues, toast]
  );

  useEffect(() => {
    loadLocalQueues();
    runRemoteFirestoreAudit(true);

    const unsubSync = subscribeSyncStatus((_count, syncing) => {
      setIsSyncingNow(syncing);
      loadLocalQueues();
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleDataUpdated = () => loadLocalQueues();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('app_legiz_attendance_synced', handleDataUpdated);
    window.addEventListener('church_data_updated', handleDataUpdated);

    return () => {
      unsubSync();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('app_legiz_attendance_synced', handleDataUpdated);
      window.removeEventListener('church_data_updated', handleDataUpdated);
    };
  }, [loadLocalQueues, runRemoteFirestoreAudit]);

  const handleForceSync = async () => {
    if (!isDeviceOnline()) {
      toast.warning(
        isEs ? 'Dispositivo Offline' : isFr ? 'Appareil Hors-ligne' : isEn ? 'Device Offline' : 'Aparèy la Offline',
        isEs
          ? 'Los registros se sincronizarán automáticamente cuando regrese la conexión.'
          : isFr
          ? 'Les enregistrements seront synchronisés automatiquement au retour de la connexion.'
          : isEn
          ? 'Queued scans will sync automatically when network returns.'
          : 'Done yo ap senkronize otomatikman kou koneksyon an retounen.'
      );
      return;
    }

    setIsSyncingNow(true);
    try {
      const [localRes, idbRes] = await Promise.all([
        syncPendingOfflineAttendance(church.id),
        triggerOfflineSync(),
      ]);
      const totalSynced = localRes.syncedCount + idbRes.synced;
      await runRemoteFirestoreAudit(true);
      if (onSyncCompleted) onSyncCompleted();

      if (totalSynced > 0) {
        toast.success(
          isEs ? 'Sincronización Exitosa' : isFr ? 'Synchronisation Réussie' : isEn ? 'Sync Completed' : 'Senkronizasyon Reyisi',
          isEs
            ? `${totalSynced} registros enviados correctamente al servidor.`
            : isFr
            ? `${totalSynced} enregistrements envoyés avec succès.`
            : isEn
            ? `${totalSynced} offline check-ins synced to the cloud.`
            : `${totalSynced} prezans offline voye an liy avèk siksè.`
        );
      } else {
        toast.info(
          isEs ? 'Todo Sincronizado' : isFr ? 'Tout est à jour' : isEn ? 'Up to Date' : 'Tout Done Ajou',
          isEs
            ? 'No había registros pendientes por sincronizar.'
            : isFr
            ? 'Aucun enregistrement en attente de synchronisation.'
            : isEn
            ? 'No pending offline records remained in the queue.'
            : 'Pa t gen okenn prezans ki te rete an atant.'
        );
      }
    } finally {
      setIsSyncingNow(false);
    }
  };

  // Deduplicate pending vs failed vs synced items cleanly
  const auditDataset = useMemo(() => {
    const idbById = new Map<string, QueuedAttendance>();
    queuedIdbItems.forEach((item) => {
      if (item?.record?.id) {
        idbById.set(item.record.id, item);
      }
    });

    const pendingById = new Map<string, AttendanceRecord>();
    pendingLocalRecords.forEach((r) => {
      if (r?.id) pendingById.set(r.id, r);
    });
    queuedIdbItems.forEach((item) => {
      if (item?.record?.id && !pendingById.has(item.record.id)) {
        pendingById.set(item.record.id, item.record);
      }
    });

    // Authoritative synced source: live Firestore audit snapshot merged with live prop stream (minus pending queue IDs)
    const syncedMap = new Map<string, AttendanceRecord>();
    const baselineRecords = remoteFirestoreRecords ?? attendanceRecords;
    baselineRecords.forEach((rec) => {
      if (!rec?.id) return;
      if (rec.churchId && rec.churchId !== church.id && rec.churchId !== church.code) return;
      if (!pendingById.has(rec.id)) {
        syncedMap.set(rec.id, rec);
      }
    });

    // Also keep any live attendanceRecords not yet captured in last manual fetch (excluding queued items)
    attendanceRecords.forEach((rec) => {
      if (!rec?.id) return;
      if (rec.churchId && rec.churchId !== church.id && rec.churchId !== church.code) return;
      if (!pendingById.has(rec.id) && !syncedMap.has(rec.id)) {
        syncedMap.set(rec.id, rec);
      }
    });

    const rows: AuditRowItem[] = [];
    let pendingCount = 0;
    let failedCount = 0;

    pendingById.forEach((rec, id) => {
      const idbMeta = idbById.get(id);
      const isFailed = idbMeta?.status === 'failed' || (idbMeta?.retryCount || 0) > 0;
      if (isFailed) {
        failedCount++;
      } else {
        pendingCount++;
      }
      rows.push({
        id,
        record: rec,
        syncState: isFailed ? 'failed' : 'pending',
        retryCount: idbMeta?.retryCount || 0,
        lastError: idbMeta?.lastError,
      });
    });

    syncedMap.forEach((rec, id) => {
      rows.push({
        id,
        record: rec,
        syncState: 'synced',
        retryCount: 0,
      });
    });

    rows.sort(
      (a, b) =>
        new Date(b.record.timestamp).getTime() - new Date(a.record.timestamp).getTime()
    );

    const syncedCount = syncedMap.size;
    const totalPendingOrFailed = pendingCount + failedCount;
    const totalRecords = syncedCount + totalPendingOrFailed;
    const healthRate =
      totalRecords === 0 ? 100 : Math.round((syncedCount / totalRecords) * 100);

    return {
      rows,
      syncedCount,
      pendingCount,
      failedCount,
      totalPendingOrFailed,
      totalRecords,
      healthRate,
    };
  }, [attendanceRecords, church.id, church.code, pendingLocalRecords, queuedIdbItems, remoteFirestoreRecords]);

  // Donut Chart Data
  const pieChartData = useMemo(() => {
    const items = [
      {
        id: 'synced',
        name: isEs
          ? 'Sincronizado'
          : isFr
          ? 'Synchronisé'
          : isEn
          ? 'Synced'
          : 'Senkronize',
        value: auditDataset.syncedCount,
        color: '#10B981',
      },
      {
        id: 'pending',
        name: isEs
          ? 'Pendiente Offline'
          : isFr
          ? 'En attente Hors-ligne'
          : isEn
          ? 'Pending Offline'
          : 'An Atant (Offline)',
        value: auditDataset.pendingCount,
        color: '#F59E0B',
      },
      {
        id: 'failed',
        name: isEs
          ? 'Reintento / Error'
          : isFr
          ? 'Échec / Nouvel essai'
          : isEn
          ? 'Retry Needed'
          : 'Erè / Re-eseye',
        value: auditDataset.failedCount,
        color: '#F43F5E',
      },
    ];
    return items.filter((d) => d.value > 0);
  }, [auditDataset, isEs, isFr, isEn]);

  // Bar Chart Data grouped by Service / Date (last 6 services with activity)
  const serviceHealthBars = useMemo(() => {
    const groups = new Map<
      string,
      { name: string; fullTitle: string; date: string; synced: number; pending: number }
    >();

    // Seed with recent church services so empty states still map neatly if records exist
    services
      .filter((s) => !s.churchId || s.churchId === church.id || s.churchId === church.code)
      .slice(0, 6)
      .forEach((s) => {
        const shortLabel =
          s.title.length > 14 ? `${s.title.slice(0, 14)}…` : s.title;
        groups.set(s.id, {
          name: shortLabel,
          fullTitle: s.title,
          date: s.date,
          synced: 0,
          pending: 0,
        });
      });

    auditDataset.rows.forEach((row) => {
      const sid = row.record.serviceId || row.record.serviceDate || 'unknown';
      const existing = groups.get(sid) || {
        name:
          (row.record.serviceTitle || sid).length > 14
            ? `${(row.record.serviceTitle || sid).slice(0, 14)}…`
            : row.record.serviceTitle || sid,
        fullTitle: row.record.serviceTitle || sid,
        date: row.record.serviceDate || '',
        synced: 0,
        pending: 0,
      };
      if (row.syncState === 'synced') {
        existing.synced += 1;
      } else {
        existing.pending += 1;
      }
      groups.set(sid, existing);
    });

    return Array.from(groups.values())
      .filter((g) => g.synced > 0 || g.pending > 0)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      .slice(-6);
  }, [auditDataset.rows, services, church.id, church.code]);

  // Filtered table rows
  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return auditDataset.rows.filter((row) => {
      if (statusFilter !== 'all' && row.syncState !== statusFilter) return false;
      if (!q) return true;
      return (
        (row.record.memberName || '').toLowerCase().includes(q) ||
        (row.record.memberId || '').toLowerCase().includes(q) ||
        (row.record.serviceTitle || '').toLowerCase().includes(q)
      );
    });
  }, [auditDataset.rows, statusFilter, searchQuery]);

  const CustomChartTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0];
    const barPayload = item?.payload;
    return (
      <div className="bg-slate-900/95 border border-slate-700 px-3 py-2.5 rounded-xl shadow-2xl text-xs text-slate-200 space-y-1 min-w-[165px]">
        <div className="font-bold text-white border-b border-slate-800 pb-1">
          {barPayload?.fullTitle || item.name}
        </div>
        {payload.map((entry: any) => (
          <div key={entry.dataKey || entry.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: entry.color || entry.payload?.color }}
              />
              {entry.name}
            </span>
            <span className="font-mono font-bold text-white tabular-nums">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <section
      id="section-attendance-audit"
      className="bg-[#1E293B] rounded-3xl border border-slate-700/80 p-5 sm:p-6 shadow-xl space-y-6"
    >
      {/* HEADER BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-700/80 pb-4">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-base sm:text-lg text-white tracking-tight">
                {isEs
                  ? 'Auditoría de Asistencia y Salud de Sincronización'
                  : isFr
                  ? 'Audit des Présences & Santé de Synchronisation'
                  : isEn
                  ? 'Attendance Audit & Sync Health'
                  : 'Odit Prezans & Sante Senkronizasyon'}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEs
                ? 'Comparación en tiempo real entre escaneos locales offline y registros sincronizados.'
                : isFr
                ? 'Comparaison en temps réel entre les scans locaux hors-ligne et les enregistrements synchronisés.'
                : isEn
                ? 'Real-time comparison of pending offline attendance queue vs. synced cloud records.'
                : 'Konparezon an tan reyèl ant prezans ki an atant offline ak sa ki deja senkronize an liy.'}
            </p>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            id="btn-audit-verify-firestore"
            onClick={() => runRemoteFirestoreAudit(false)}
            disabled={isAuditingRemote || !isOnline}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <Database className={`w-3.5 h-3.5 text-indigo-400 ${isAuditingRemote ? 'animate-pulse' : ''}`} />
            <span>
              {isAuditingRemote
                ? isEs
                  ? 'Verificando...'
                  : isFr
                  ? 'Vérification...'
                  : isEn
                  ? 'Verifying...'
                  : 'Ap Verifye...'
                : isEs
                ? 'Verificar Estado'
                : isFr
                ? 'Vérifier État'
                : isEn
                ? 'Verify Sync'
                : 'Verifye Done'}
            </span>
          </button>

          <button
            type="button"
            id="btn-audit-sync-pending"
            onClick={handleForceSync}
            disabled={isSyncingNow}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow ? 'animate-spin' : ''}`} />
            <span>
              {isSyncingNow
                ? isEs
                  ? 'Sincronizando...'
                  : isFr
                  ? 'Synchronisation...'
                  : isEn
                  ? 'Syncing...'
                  : 'Ap Senkronize...'
                : isEs
                ? `Sincronizar (${auditDataset.totalPendingOrFailed})`
                : isFr
                ? `Synchroniser (${auditDataset.totalPendingOrFailed})`
                : isEn
                ? `Sync Pending (${auditDataset.totalPendingOrFailed})`
                : `Senkronize (${auditDataset.totalPendingOrFailed})`}
            </span>
          </button>
        </div>
      </div>

      {/* KPI STRIP (SINGLE-ELEVATION SUBTLE DIVIDERS, NO NESTED CARD SHADOWS) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 rounded-2xl bg-[#0F172A] border border-slate-800 overflow-hidden">
        <div className="p-4 flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-medium text-slate-400 block">
              {isEs ? 'Total Registrados' : isFr ? 'Total Scannés' : isEn ? 'Total Check-ins' : 'Total Prezans'}
            </span>
            <span className="text-2xl font-black text-white font-mono tabular-nums mt-1 block">
              {auditDataset.totalRecords}
            </span>
          </div>
          <ShieldCheck className="w-5 h-5 text-slate-400 shrink-0" />
        </div>

        <div className="p-4 flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-medium text-emerald-400 block">
              {isEs ? 'Sincronizados' : isFr ? 'Synchronisés' : isEn ? 'Synced' : 'Senkronize'}
            </span>
            <span className="text-2xl font-black text-emerald-400 font-mono tabular-nums mt-1 block">
              {auditDataset.syncedCount}
            </span>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
        </div>

        <div className="p-4 flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-medium text-amber-400 block">
              {isEs ? 'Pendientes Offline' : isFr ? 'En attente Hors-ligne' : isEn ? 'Pending Offline' : 'An Atant Offline'}
            </span>
            <span className="text-2xl font-black text-amber-400 font-mono tabular-nums mt-1 block">
              {auditDataset.totalPendingOrFailed}
            </span>
          </div>
          {auditDataset.failedCount > 0 ? (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <CloudOff className="w-5 h-5 text-amber-400 shrink-0" />
          )}
        </div>

        <div className="p-4 flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-medium text-slate-400 block">
              {isEs ? 'Salud de Sincronización' : isFr ? 'Santé de Synchro' : isEn ? 'Sync Health Rate' : 'Sante Senkronizasyon'}
            </span>
            <span
              className={`text-2xl font-black font-mono tabular-nums mt-1 block ${
                auditDataset.healthRate >= 95
                  ? 'text-emerald-400'
                  : auditDataset.healthRate >= 75
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {auditDataset.healthRate}%
            </span>
          </div>
          <div className="text-right text-[11px] text-slate-400 font-mono tabular-nums">
            {lastAuditAt
              ? new Date(lastAuditAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '--:--'}
          </div>
        </div>
      </div>

      {/* RECHARTS VISUALIZATIONS: DONUT + PER-SERVICE SYNC HEALTH BAR CHART */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* LEFT: RECHARTS DONUT CHART */}
        <div className="lg:col-span-5 rounded-2xl bg-[#0F172A] border border-slate-800 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-200">
              {isEs
                ? 'Distribución Sincronizada vs Offline'
                : isFr
                ? 'Répartition Synchronisée vs Hors-ligne'
                : isEn
                ? 'Synced vs. Offline Queue'
                : 'Pwopòsyon Senkronize vs Offline'}
            </h4>
            <span className="text-[11px] font-mono tabular-nums text-slate-400">
              {auditDataset.syncedCount}/{auditDataset.totalRecords}
            </span>
          </div>

          {auditDataset.totalRecords === 0 ? (
            <div className="h-[220px] flex flex-col items-center justify-center text-center text-slate-400 text-xs px-4">
              <Database className="w-7 h-7 text-slate-600 mb-2" />
              <p>
                {isEs
                  ? 'Aún no hay escaneos registrados para auditar.'
                  : isFr
                  ? 'Aucun scan enregistré pour cet audit.'
                  : isEn
                  ? 'No attendance scans recorded yet to audit.'
                  : 'Poko gen okenn eskanè prezans ki anrejistre pou odite.'}
              </p>
            </div>
          ) : (
            <div className="relative h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={84}
                    paddingAngle={pieChartData.length > 1 ? 4 : 0}
                    dataKey="value"
                    nameKey="name"
                    stroke="none"
                  >
                    {pieChartData.map((entry) => (
                      <Cell key={entry.id} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-white font-mono tabular-nums">
                  {auditDataset.healthRate}%
                </span>
                <span className="text-[10px] font-bold text-emerald-400 mt-0.5">
                  {isEs ? 'Salud' : isFr ? 'Santé' : isEn ? 'Health' : 'Sante'}
                </span>
              </div>
            </div>
          )}

          {/* LEGEND */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2 border-t border-slate-800/80 text-xs">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>{isEs ? 'Sincronizados' : isFr ? 'Synchronisés' : isEn ? 'Synced' : 'Senkronize'}</span>
              <strong className="font-mono tabular-nums text-white">{auditDataset.syncedCount}</strong>
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>{isEs ? 'Offline' : isFr ? 'Hors-ligne' : 'Offline'}</span>
              <strong className="font-mono tabular-nums text-white">{auditDataset.pendingCount}</strong>
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>{isEs ? 'Error' : isFr ? 'Erreur' : isEn ? 'Retry' : 'Erè'}</span>
              <strong className="font-mono tabular-nums text-white">{auditDataset.failedCount}</strong>
            </span>
          </div>
        </div>

        {/* RIGHT: RECHARTS STACKED BAR CHART BY SERVICE */}
        <div className="lg:col-span-7 rounded-2xl bg-[#0F172A] border border-slate-800 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-200">
              {isEs
                ? 'Estado de Sincronización por Servicio'
                : isFr
                ? 'État de Synchronisation par Culte'
                : isEn
                ? 'Sync Health by Service Session'
                : 'Estati Senkronizasyon pa Sèvis'}
            </h4>
            <span className="text-[11px] font-mono tabular-nums text-slate-400">
              {serviceHealthBars.length} {isEs ? 'servicios' : isFr ? 'cultes' : isEn ? 'services' : 'sèvis'}
            </span>
          </div>

          {serviceHealthBars.length === 0 ? (
            <div className="h-[245px] flex flex-col items-center justify-center text-center text-slate-400 text-xs">
              <Clock className="w-7 h-7 text-slate-600 mb-2" />
              <p>
                {isEs
                  ? 'Las barras aparecerán cuando los servicios tengan registros de asistencia.'
                  : isFr
                  ? 'Le graphique apparaîtra dès qu’un culte contiendra des présences.'
                  : isEn
                  ? 'Service bars appear once attendance check-ins are logged.'
                  : 'Grafik la ap parèt kou yon sèvis gen prezans anrejistre.'}
              </p>
            </div>
          ) : (
            <div className="h-[245px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={serviceHealthBars}
                  margin={{ top: 10, right: 12, left: -16, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                    axisLine={{ stroke: '#334155' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                  <Bar
                    dataKey="synced"
                    stackId="sync"
                    name={
                      isEs
                        ? 'Sincronizado'
                        : isFr
                        ? 'Synchronisé'
                        : isEn
                        ? 'Synced'
                        : 'Senkronize'
                    }
                    fill="#10B981"
                    radius={[0, 0, 4, 4]}
                    maxBarSize={38}
                  />
                  <Bar
                    dataKey="pending"
                    stackId="sync"
                    name={
                      isEs
                        ? 'Pendiente Offline'
                        : isFr
                        ? 'En attente Hors-ligne'
                        : isEn
                        ? 'Pending Offline'
                        : 'An Atant Offline'
                    }
                    fill="#F59E0B"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={38}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* AUDIT LEDGER CONTROLS & COMPACT DATA TABLE */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* FILTER SEGMENTED TABS */}
          <div className="inline-flex items-center p-1 rounded-xl bg-[#0F172A] border border-slate-800 gap-1 overflow-x-auto">
            {(
              [
                {
                  id: 'all',
                  label: isEs ? 'Todos' : isFr ? 'Tous' : isEn ? 'All' : 'Tout',
                  count: auditDataset.totalRecords,
                },
                {
                  id: 'synced',
                  label: isEs ? 'Sincronizados' : isFr ? 'Synchronisés' : isEn ? 'Synced' : 'Senkronize',
                  count: auditDataset.syncedCount,
                },
                {
                  id: 'pending',
                  label: isEs ? 'Offline' : isFr ? 'Hors-ligne' : isEn ? 'Pending' : 'Offline',
                  count: auditDataset.pendingCount,
                },
                {
                  id: 'failed',
                  label: isEs ? 'Errores' : isFr ? 'Échecs' : isEn ? 'Failed' : 'Erè',
                  count: auditDataset.failedCount,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <span>{tab.label}</span>
                <span className="font-mono tabular-nums text-[11px] opacity-80">({tab.count})</span>
              </button>
            ))}
          </div>

          {/* LIVE SEARCH */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isEs
                  ? 'Buscar miembro o ID...'
                  : isFr
                  ? 'Rechercher membre ou ID...'
                  : isEn
                  ? 'Filter member or ID...'
                  : 'Chèche manm oswa ID...'
              }
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[#0F172A] border border-slate-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* COMPACT DATA TABLE */}
        <div className="rounded-2xl bg-[#0F172A] border border-slate-800 overflow-hidden">
          {isAuditingRemote && auditDataset.rows.length === 0 ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((idx) => (
                <div key={idx} className="h-10 rounded-lg bg-slate-800/50 animate-pulse" />
              ))}
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="py-8 px-4 text-center text-xs text-slate-400">
              {isEs
                ? 'No hay registros que coincidan con este filtro.'
                : isFr
                ? 'Aucun enregistrement ne correspond à ce filtre.'
                : isEn
                ? 'No attendance records match the current filter.'
                : 'Pa gen okenn prezans ki koresponn ak filtè sa a.'}
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-900/95 border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">
                      {isEs ? 'Miembro' : isFr ? 'Membre' : isEn ? 'Member' : 'Manm'}
                    </th>
                    <th className="py-2.5 px-3 font-semibold">
                      {isEs ? 'Servicio' : isFr ? 'Culte' : isEn ? 'Service' : 'Sèvis'}
                    </th>
                    <th className="py-2.5 px-3 font-semibold">
                      {isEs ? 'Método' : isFr ? 'Méthode' : isEn ? 'Method' : 'Metòd'}
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right">
                      {isEs ? 'Hora' : isFr ? 'Heure' : isEn ? 'Time' : 'Lè'}
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right">
                      {isEs ? 'Estado Sync' : isFr ? 'Statut Sync' : isEn ? 'Sync Status' : 'Estati Sync'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredRows.slice(0, 25).map((item) => (
                    <tr
                      key={`${item.syncState}-${item.id}`}
                      className="hover:bg-slate-800/40 transition-colors h-10"
                    >
                      <td className="py-2 px-3">
                        <div className="font-semibold text-slate-100 truncate max-w-[180px]">
                          {item.record.memberName}
                        </div>
                        <div className="font-mono text-[11px] text-amber-300 tabular-nums">
                          {item.record.memberId}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-slate-300">
                        <div className="truncate max-w-[180px]">{item.record.serviceTitle}</div>
                        <div className="font-mono text-[11px] text-slate-400 tabular-nums">
                          {item.record.serviceDate}
                        </div>
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-300">
                        {item.record.checkInMethod}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-300 whitespace-nowrap">
                        {new Date(item.record.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        {item.syncState === 'synced' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold text-[11px]">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>
                              {isEs
                                ? 'Sincronizado ✓'
                                : isFr
                                ? 'Synchronisé ✓'
                                : isEn
                                ? 'Synced ✓'
                                : 'Konfime ✓'}
                            </span>
                          </span>
                        ) : item.syncState === 'failed' ? (
                          <span
                            title={item.lastError || 'Sync retry queued'}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/30 font-semibold text-[11px]"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            <span>
                              {isEs
                                ? `Reintento (${item.retryCount})`
                                : isFr
                                ? `Échec (${item.retryCount})`
                                : isEn
                                ? `Retry (${item.retryCount})`
                                : `Erè (${item.retryCount})`}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold text-[11px]">
                            <CloudOff className="w-3 h-3" />
                            <span>
                              {isEs
                                ? 'Offline Cola'
                                : isFr
                                ? 'Hors-ligne'
                                : isEn
                                ? 'Pending Offline'
                                : 'Offline An Atant'}
                            </span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
