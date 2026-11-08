import React, { useState, useMemo } from 'react';
import {
  Church,
  Member,
  ServiceSession,
  AttendanceRecord,
  Language,
  AbsenceRecord,
} from '../../types';
import { SERVICE_CATEGORIES } from '../../utils/i18n';
import {
  recordAttendanceScan,
  getActiveService,
  isDeviceOnline,
  getPendingOfflineAttendanceCount,
  syncPendingOfflineAttendance,
  getServiceAbsenceRecords,
  toggleExcuseAbsence,
  isServiceEnded,
  syncServiceAbsencesAutomatically,
} from '../../utils/storage';
import {
  exportAttendanceListToPdf,
  exportAbsenteesListToPdf,
} from '../../utils/pdfReportExporter';
import { useToast } from '../../context/ToastContext';
import {
  CheckCircle2,
  Camera,
  Search,
  Download,
  Users,
  RefreshCw,
  UserCheck,
  Zap,
  AlertTriangle,
  FileSpreadsheet,
  Clock,
  Timer,
  UserX,
  TrendingUp,
  Phone,
  MessageCircle,
  Filter,
  Calendar,
  ShieldCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AdminAttendanceProps {
  church: Church;
  members: Member[];
  services: ServiceSession[];
  attendanceRecords: AttendanceRecord[];
  language?: Language;
  onAttendanceChange?: () => void;
  onOpenScanner?: () => void;
  onToggleServiceActive?: (serviceId: string, isOpen: boolean) => void;
}

export const AdminAttendance: React.FC<AdminAttendanceProps> = ({
  church,
  members,
  services,
  attendanceRecords,
  language = 'ht',
  onAttendanceChange,
  onOpenScanner,
}) => {
  const toast = useToast();
  const isEs = language === 'es';
  const isFr = language === 'fr';
  const isEn = language === 'en';

  // Navigation Tabs: Attendance vs Absentees
  const [activeTab, setActiveTab] = useState<'attendance' | 'absentees'>('attendance');

  // Filters for Attendance
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'on_time' | 'late'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Filters for Absentees
  const [absenteeSearch, setAbsenteeSearch] = useState<string>('');
  const [absenteeDeptFilter, setAbsenteeDeptFilter] = useState<string>('all');

  // Manual Check-in & Sync
  const [manualCode, setManualCode] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(() =>
    getPendingOfflineAttendanceCount(church.id)
  );
  const [quickCheckinFeedback, setQuickCheckinFeedback] = useState<{
    success?: boolean;
    message: string;
  } | null>(null);

  // Active Service context
  const activeService = getActiveService(church.id) || services[0];
  const targetServiceForAbsentees =
    selectedServiceFilter !== 'all'
      ? services.find((s) => s.id === selectedServiceFilter) || activeService
      : activeService;

  // Manual sync handler
  const handleManualSync = async () => {
    if (!isDeviceOnline()) {
      toast.warning(
        isEs
          ? 'Sin Conexión a Internet'
          : isFr
          ? 'Pas de Connexion Internet'
          : isEn
          ? 'No Internet Connection'
          : 'Pa Gen Entènèt',
        isEs
          ? 'No está conectado a internet ahora. La sincronización se realizará automáticamente cuando se restablezca la conexión.'
          : isFr
          ? 'Vous n’êtes pas connecté à internet actuellement. La synchronisation se fera automatiquement dès le retour de la connexion.'
          : isEn
          ? 'You are currently offline. Synchronization will happen automatically once internet connectivity is restored.'
          : 'Ou pa konekte ak entènèt kounye a. Senkronizasyon an ap fèt otomatikman kou koneksyon an retounen.'
      );
      return;
    }
    setIsSyncing(true);
    try {
      const res = await syncPendingOfflineAttendance(church.id);
      if (res.syncedCount > 0) {
        toast.success(
          isEs
            ? 'Sincronización Exitosa ✓'
            : isFr
            ? 'Synchronisation Réussie ✓'
            : isEn
            ? 'Sync Successful ✓'
            : 'Senkronizasyon Reyisi ✓',
          isEs
            ? `${res.syncedCount} asistencias guardadas offline se sincronizaron con la nube.`
            : isFr
            ? `${res.syncedCount} présences enregistrées hors-ligne ont été synchronisées avec le cloud.`
            : isEn
            ? `${res.syncedCount} offline attendance records synced to the cloud.`
            : `${res.syncedCount} prezans ki te sove offline senkronize ak nwaj la.`
        );
        if (onAttendanceChange) onAttendanceChange();
      } else {
        toast.info(
          isEs
            ? 'Todo Actualizado'
            : isFr
            ? 'Toutes Données à Jour'
            : isEn
            ? 'All Up to Date'
            : 'Tout Done Ajou',
          isEs
            ? 'No hay asistencias offline pendientes de sincronizar.'
            : isFr
            ? 'Aucune présence hors-ligne en attente de synchronisation.'
            : isEn
            ? 'No pending offline attendance records to sync.'
            : 'Pa gen okenn prezans offline ki an reta pou senkronize.'
        );
      }
      setPendingCount(getPendingOfflineAttendanceCount(church.id));
    } catch (err) {
      toast.error(
        isEs
          ? 'Error de Sincronización'
          : isFr
          ? 'Erreur de Synchronisation'
          : isEn
          ? 'Sync Error'
          : 'Erè Senkronizasyon',
        isEs
          ? 'Ocurrió un problema durante la sincronización.'
          : isFr
          ? 'Un problème est survenu lors de la synchronisation.'
          : isEn
          ? 'An error occurred during synchronization.'
          : 'Gen yon pwoblèm ki rive pandan senkronizasyon an.'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  // ---------------- ATTENDANCE RECORDS FILTERING ----------------
  const recordsForEffectiveService = targetServiceForAbsentees
    ? attendanceRecords.filter((r) => r.serviceId === targetServiceForAbsentees.id)
    : attendanceRecords;

  const filteredAttendance = attendanceRecords.filter((rec) => {
    const matchesService =
      selectedServiceFilter === 'all' || rec.serviceId === selectedServiceFilter;
    const isLate = rec.attendanceStatus === 'late';
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'late'
        ? isLate
        : !isLate;
    const sTerm = (searchTerm || '').trim().toLowerCase();
    const matchesSearch =
      !sTerm ||
      (rec.memberName || '').toLowerCase().includes(sTerm) ||
      (rec.memberId || '').toLowerCase().includes(sTerm) ||
      (rec.serviceTitle || '').toLowerCase().includes(sTerm);
    return matchesService && matchesStatus && matchesSearch;
  });

  // ---------------- ABSENTEES CALCULATION & AUTO-DETECTION ----------------
  const [absenceRefreshKey, setAbsenceRefreshKey] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const handleRefreshAttendance = async () => {
    setIsRefreshing(true);
    setAbsenceRefreshKey((k) => k + 1);
    if (isDeviceOnline() && getPendingOfflineAttendanceCount(church.id) > 0) {
      await syncPendingOfflineAttendance(church.id);
      setPendingCount(getPendingOfflineAttendanceCount(church.id));
    }
    if (onAttendanceChange) {
      onAttendanceChange();
    }
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success(
        isEs ? 'Asistencias Actualizadas' : isEn ? 'Attendance Refreshed' : isFr ? 'Présences Actualisées' : 'Prezans Rafrechi',
        isEs
          ? 'Los registros de asistencia y ausencias han sido actualizados.'
          : isEn
          ? 'Attendance and absence records have been refreshed.'
          : isFr
          ? 'Les registres de présence et d’absence ont été actualisés.'
          : 'Tout done prezans ak absans yo mete ajou.'
      );
    }, 450);
  };

  // Set of member IDs who checked in for the effective service
  const presentMemberIdSet = new Set<string>();
  recordsForEffectiveService.forEach((r) => {
    if (r.memberId) presentMemberIdSet.add(r.memberId.toUpperCase());
    if (r.memberDbId) presentMemberIdSet.add(r.memberDbId);
  });

  const rawAbsentees = members.filter((m) => {
    const isPresent =
      (m.memberId && presentMemberIdSet.has(m.memberId.toUpperCase())) ||
      (m.id && presentMemberIdSet.has(m.id));
    return !isPresent;
  });

  const targetServiceEnded = targetServiceForAbsentees
    ? isServiceEnded(targetServiceForAbsentees)
    : false;

  const currentAbsenceRecords = useMemo(() => {
    if (!targetServiceForAbsentees) return [];
    return getServiceAbsenceRecords(church.id, targetServiceForAbsentees.id);
  }, [church.id, targetServiceForAbsentees?.id, absenceRefreshKey, attendanceRecords.length]);

  const absenceByMemberMap = useMemo(() => {
    const map = new Map<string, AbsenceRecord>();
    currentAbsenceRecords.forEach((a) => {
      if (a.memberDbId) map.set(a.memberDbId, a);
      if (a.memberId) map.set(a.memberId.toUpperCase(), a);
    });
    return map;
  }, [currentAbsenceRecords]);

  // Handle Excuse Toggle
  const handleToggleExcuse = (m: Member) => {
    if (!targetServiceForAbsentees) return;
    const existingRec =
      absenceByMemberMap.get(m.id) ||
      (m.memberId ? absenceByMemberMap.get(m.memberId.toUpperCase()) : undefined);

    if (existingRec) {
      const updated = toggleExcuseAbsence(church.id, existingRec.id);
      setAbsenceRefreshKey((k) => k + 1);
      if (onAttendanceChange) onAttendanceChange();
      toast.info(
        updated?.status === 'excused'
          ? isEs
            ? 'Ausencia Justificada ✓'
            : isFr
            ? 'Absence Excusée ✓'
            : isEn
            ? 'Absence Excused ✓'
            : 'Absans Eskize ✓'
          : isEs
          ? 'Ausencia No Justificada'
          : isFr
          ? 'Absence Non Justifiée'
          : isEn
          ? 'Absence Unexcused'
          : 'Eskiz Retire',
        `${m.fullName} (${m.memberId})`
      );
    } else {
      syncServiceAbsencesAutomatically(church.id, targetServiceForAbsentees.id);
      const absList = getServiceAbsenceRecords(church.id, targetServiceForAbsentees.id);
      const found = absList.find(
        (a) =>
          a.memberDbId === m.id ||
          (m.memberId && a.memberId.toUpperCase() === m.memberId.toUpperCase())
      );
      if (found) {
        const updated = toggleExcuseAbsence(church.id, found.id);
        setAbsenceRefreshKey((k) => k + 1);
        if (onAttendanceChange) onAttendanceChange();
        toast.info(
          updated?.status === 'excused'
            ? isEs
              ? 'Ausencia Justificada ✓'
              : isFr
              ? 'Absence Excusée ✓'
              : isEn
              ? 'Absence Excused ✓'
              : 'Absans Eskize ✓'
            : isEs
            ? 'Ausencia No Justificada'
            : isFr
            ? 'Absence Non Justifiée'
            : isEn
            ? 'Absence Unexcused'
            : 'Eskiz Retire',
          `${m.fullName} (${m.memberId})`
        );
      }
    }
  };

  const filteredAbsentees = rawAbsentees.filter((m) => {
    const matchesDept =
      absenteeDeptFilter === 'all' || m.department === absenteeDeptFilter;
    const s = absenteeSearch.trim().toLowerCase();
    const matchesSearch =
      !s ||
      (m.fullName || '').toLowerCase().includes(s) ||
      (m.memberId || '').toLowerCase().includes(s) ||
      (m.phone && (m.phone || '').toLowerCase().includes(s)) ||
      (m.department && (m.department || '').toLowerCase().includes(s));
    return matchesDept && matchesSearch;
  });

  // ---------------- EXECUTIVE KPI STATS ----------------
  const totalChurchMembers = members.length;
  const distinctPresentCount = presentMemberIdSet.size;
  const onTimeCount = recordsForEffectiveService.filter(
    (r) => r.attendanceStatus !== 'late'
  ).length;
  const lateCount = recordsForEffectiveService.filter(
    (r) => r.attendanceStatus === 'late'
  ).length;
  const absentCount = rawAbsentees.length;
  const excusedCount = rawAbsentees.filter((m) => {
    const rec =
      absenceByMemberMap.get(m.id) ||
      (m.memberId ? absenceByMemberMap.get(m.memberId.toUpperCase()) : undefined);
    return rec?.status === 'excused';
  }).length;
  const unexcusedAbsentCount = Math.max(0, absentCount - excusedCount);
  const attendanceRate =
    totalChurchMembers > 0
      ? Math.round((distinctPresentCount / totalChurchMembers) * 100)
      : 0;

  // Department list for filters
  const departmentsList = Array.from(
    new Set(members.map((m) => m.department).filter(Boolean))
  ) as string[];

  // ---------------- MANUAL CHECK-IN ----------------
  const handleManualCheckIn = (codeOrMember: string) => {
    const targetService = targetServiceForAbsentees || activeService;
    if (!codeOrMember.trim() || !targetService) return;

    const res = recordAttendanceScan({
      currentChurchId: church.id,
      rawCode: codeOrMember.trim(),
      serviceId: targetService.id,
      method: 'manual',
      recordedBy: 'Admin Desk',
    });

    if (res.success) {
      const isLate = res.record?.attendanceStatus === 'late';
      const lateStr =
        isLate && res.record?.lateMinutes
          ? ` (${isEs ? 'Retardo' : isFr ? 'Retard' : isEn ? 'Late' : 'Reta'}: +${res.record.lateMinutes} min)`
          : '';

      if (res.isOfflineSaved) {
        setQuickCheckinFeedback({
          success: true,
          message: isEs
            ? `💾 Asistencia guardada offline para ${res.member?.fullName} (${res.member?.memberId}) en ${res.service?.title}${lateStr}.`
            : isFr
            ? `💾 Présence enregistrée hors-ligne pour ${res.member?.fullName} (${res.member?.memberId}) dans ${res.service?.title}${lateStr}.`
            : isEn
            ? `💾 Attendance saved offline for ${res.member?.fullName} (${res.member?.memberId}) in ${res.service?.title}${lateStr}.`
            : `💾 Prezans anrejistre offline pou ${res.member?.fullName} (${res.member?.memberId}) nan ${res.service?.title}${lateStr}.`,
        });
        toast.info(
          isEs
            ? '💾 Guardado Offline'
            : isFr
            ? '💾 Enregistré Hors-ligne'
            : isEn
            ? '💾 Saved Offline'
            : '💾 Sove Offline',
          `${res.member?.fullName} (${res.member?.memberId})`
        );
      } else {
        setQuickCheckinFeedback({
          success: true,
          message: isEs
            ? `Asistencia registrada ✓ para ${res.member?.fullName} (${res.member?.memberId}) en ${res.service?.title}${lateStr}`
            : isFr
            ? `Présence enregistrée ✓ pour ${res.member?.fullName} (${res.member?.memberId}) dans ${res.service?.title}${lateStr}`
            : isEn
            ? `Attendance recorded ✓ for ${res.member?.fullName} (${res.member?.memberId}) in ${res.service?.title}${lateStr}`
            : `Prezans anrejistre ✓ pou ${res.member?.fullName} (${res.member?.memberId}) nan ${res.service?.title}${lateStr}`,
        });
        toast.success(
          isEs
            ? '¡Asistencia Registrada!'
            : isFr
            ? 'Présence Enregistrée !'
            : isEn
            ? 'Attendance Recorded!'
            : 'Prezans Anrejistre!',
          `${res.member?.fullName} (${res.member?.memberId}) • ${res.service?.title}`
        );
      }
      setPendingCount(getPendingOfflineAttendanceCount(church.id));
      try {
        confetti({ particleCount: 25, spread: 50, origin: { y: 0.6 } });
      } catch (e) {}
    } else if (res.duplicate) {
      setQuickCheckinFeedback({
        success: false,
        message: isEs
          ? `⚠️ Atención: ¡Asistencia ya registrada para ${res.member?.fullName} en este servicio!`
          : isFr
          ? `⚠️ Attention : Présence déjà enregistrée pour ${res.member?.fullName} dans ce culte !`
          : isEn
          ? `⚠️ Warning: Attendance already recorded for ${res.member?.fullName} in this service!`
          : `⚠️ Atansyon: Prezans deja anrejistre pou ${res.member?.fullName} nan sèvis sa a!`,
      });
      toast.warning(
        isEs
          ? 'Asistencia Ya Registrada'
          : isFr
          ? 'Présence Déjà Enregistrée'
          : isEn
          ? 'Already Checked-in'
          : 'Prezans Deja Anrejistre',
        `${res.member?.fullName} deja make prezan nan sèvis sa a.`
      );
    } else {
      setQuickCheckinFeedback({
        success: false,
        message: isEs
          ? `🚫 Error: ${res.errorMessage}`
          : isFr
          ? `🚫 Erreur : ${res.errorMessage}`
          : isEn
          ? `🚫 Error: ${res.errorMessage}`
          : `🚫 Erè: ${res.errorMessage}`,
      });
      toast.error(
        isEs
          ? 'Error de Validación'
          : isFr
          ? 'Erreur de Validation'
          : isEn
          ? 'Validation Error'
          : 'Erè Validasyon',
        res.errorMessage || 'Kòd pa rekonèt pou legliz sa a.'
      );
    }

    setManualCode('');
    setAbsenceRefreshKey((k) => k + 1);
    if (onAttendanceChange) onAttendanceChange();
    setTimeout(() => setQuickCheckinFeedback(null), 5000);
  };

  // ---------------- EXPORTS ----------------
  const handleExportAttendanceCSV = () => {
    if (filteredAttendance.length === 0) {
      toast.info(
        isEs ? 'Sin datos' : isFr ? 'Aucune donnée' : isEn ? 'No data' : 'Pa gen done',
        'Pa gen okenn liy prezans pou ekspòte.'
      );
      return;
    }
    const headers = isEs
      ? ['Fecha', 'Hora', 'Member ID', 'Nombre Completo', 'Servicio', 'Categoría', 'Método', 'Estado', 'Retardo (min)']
      : isFr
      ? ['Date', 'Heure', 'Member ID', 'Nom Complet', 'Culte', 'Catégorie', 'Méthode', 'Statut', 'Retard (min)']
      : isEn
      ? ['Date', 'Time', 'Member ID', 'Full Name', 'Service', 'Category', 'Method', 'Status', 'Lateness (min)']
      : ['Dat', 'Lè', 'Member ID', 'Non Konplè', 'Sèvis', 'Kategori', 'Metòd', 'Stati', 'Reta (min)'];

    const rows = filteredAttendance.map((r) => [
      r.serviceDate,
      new Date(r.timestamp).toLocaleTimeString(),
      r.memberId,
      `"${r.memberName}"`,
      `"${r.serviceTitle}"`,
      r.serviceCategory,
      r.checkInMethod,
      r.attendanceStatus === 'late'
        ? isEs ? 'Retardo' : isFr ? 'Retard' : isEn ? 'Late' : 'Reta'
        : isEs ? 'A tiempo' : isFr ? 'À l\'heure' : isEn ? 'On Time' : 'Alè',
      r.lateMinutes || 0,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Prezans_${church.code}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(
      isEs ? '¡Archivo CSV Descargado!' : isFr ? 'Fichier CSV Téléchargé !' : isEn ? 'CSV File Downloaded!' : 'Fichye CSV Telechaje!',
      `${filteredAttendance.length} liy prezans ekspòte avèk siksè.`
    );
  };

  const handleExportAttendancePDF = async () => {
    if (filteredAttendance.length === 0) {
      toast.info(
        isEs ? 'Sin datos' : isFr ? 'Aucune donnée' : isEn ? 'No data' : 'Pa gen done',
        'Pa gen okenn liy prezans nan filtè aktyèl la pou ekspòte.'
      );
      return;
    }
    try {
      const selectedService = services.find((s) => s.id === selectedServiceFilter);
      const filterLabel =
        selectedServiceFilter !== 'all' || searchTerm || statusFilter !== 'all'
          ? [
              searchTerm ? `Rechèch: "${searchTerm}"` : '',
              selectedService ? `Sèvis: ${selectedService.title}` : '',
              statusFilter === 'late' ? 'Filtè: Reta sèlman' : statusFilter === 'on_time' ? 'Filtè: Alè sèlman' : '',
            ]
              .filter(Boolean)
              .join(' | ')
          : undefined;

      await exportAttendanceListToPdf({
        church,
        records: filteredAttendance,
        serviceTitle: selectedService?.title,
        filterLabel,
      });

      toast.success(
        isEs ? '¡Reporte PDF Descargado!' : isFr ? 'Rapport PDF Téléchargé !' : isEn ? 'PDF Report Downloaded!' : 'Rapò Prezans PDF Telechaje!',
        `Fichye PDF ak ${filteredAttendance.length} prezans yo jenere avèk siksè.`
      );
    } catch (err) {
      toast.error('Erè Ekspòtasyon', 'Gen yon pwoblèm ki rive pandan jenerasyon rapò PDF la.');
    }
  };

  const handleExportAbsenteesCSV = () => {
    if (filteredAbsentees.length === 0) {
      toast.info(
        isEs ? 'Sin datos' : isFr ? 'Aucune donnée' : isEn ? 'No data' : 'Pa gen done',
        'Pa gen okenn manm absan pou ekspòte.'
      );
      return;
    }
    const headers = isEs
      ? ['Member ID', 'Nombre Completo', 'Teléfono', 'Departamento', 'Estado', 'Servicio', 'Fecha']
      : isFr
      ? ['Member ID', 'Nom Complet', 'Téléphone', 'Département', 'Statut', 'Culte', 'Date']
      : isEn
      ? ['Member ID', 'Full Name', 'Phone', 'Department', 'Status', 'Service', 'Date']
      : ['Member ID', 'Non Konplè', 'Telefòn', 'Depatman', 'Stati', 'Sèvis', 'Dat'];

    const sTitle = targetServiceForAbsentees ? targetServiceForAbsentees.title : 'Sèvis Kilt';
    const sDate = targetServiceForAbsentees ? targetServiceForAbsentees.date : '';

    const rows = filteredAbsentees.map((m) => [
      m.memberId,
      `"${m.fullName}"`,
      m.phone || '',
      `"${m.department || ''}"`,
      isEs ? 'Ausente' : isFr ? 'Absent' : isEn ? 'Absent' : 'Absan',
      `"${sTitle}"`,
      sDate,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Absans_${church.code}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(
      isEs ? '¡Lista de Ausencias Descargada!' : isFr ? 'Liste des Absences Téléchargée !' : isEn ? 'Absence List Downloaded!' : 'Lis Absans Telechaje!',
      `${filteredAbsentees.length} manm absan ekspòte nan fichye CSV.`
    );
  };

  const handleExportAbsenteesPDF = async () => {
    if (filteredAbsentees.length === 0) {
      toast.info(
        isEs ? 'Sin datos' : isFr ? 'Aucune donnée' : isEn ? 'No data' : 'Pa gen done',
        'Pa gen okenn manm absan pou ekspòte.'
      );
      return;
    }
    try {
      await exportAbsenteesListToPdf({
        church,
        absentees: filteredAbsentees,
        serviceTitle: targetServiceForAbsentees?.title,
        serviceDate: targetServiceForAbsentees?.date,
      });
      toast.success(
        isEs ? '¡Reporte de Ausencias Descargado!' : isFr ? 'Rapport des Absences Téléchargé !' : isEn ? 'Absence Report Downloaded!' : 'Rapò Absans PDF Telechaje!',
        `${filteredAbsentees.length} manm absan ekspòte nan dokiman PDF.`
      );
    } catch (e) {
      toast.error('Erè PDF', 'Pa ka jenere dokiman PDF absans lan.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {isEs
                ? 'Asistencias, Retardos & Ausencias'
                : isFr
                ? 'Présences, Retards & Absences'
                : isEn
                ? 'Attendance, Lateness & Absences'
                : 'Prezans, Reta & Absans'}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
              {attendanceRecords.length} {isEs ? 'Registros' : isFr ? 'Enregistrements' : isEn ? 'Records' : 'Anrejistreman'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {isEs
              ? `Seguimiento de asistencias, puntualidad, retardos y control de miembros ausentes en ${church.name}.`
              : isFr
              ? `Suivi des présences, de la ponctualité, des retards et contrôle des membres absents pour ${church.name}.`
              : isEn
              ? `Attendance tracking, punctuality, lateness records, and absence management for ${church.name}.`
              : `Swivi prezans, kontwòl alè/reta, ak jesyon manm ki pa prezan nan kilt legliz ${church.name}.`}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            id="btn-admin-attendance-refresh"
            onClick={handleRefreshAttendance}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#1E293B] hover:bg-slate-700/80 text-slate-200 hover:text-white font-bold text-xs border border-slate-700/80 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            title={isEs ? 'Refrescar Asistencias' : isEn ? 'Refresh Attendance' : isFr ? 'Rafraîchir Présences' : 'Rafrechi Prezans'}
          >
            <RefreshCw className={`w-4 h-4 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isEs ? 'Refrescar' : isEn ? 'Refresh' : isFr ? 'Rafraîchir' : 'Rafrechi'}</span>
          </button>
          {activeTab === 'attendance' ? (
            <>
              <button
                type="button"
                id="btn-export-attendance-pdf"
                onClick={handleExportAttendancePDF}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#1E293B] hover:bg-slate-700/80 text-emerald-300 font-bold text-xs border border-emerald-500/30 hover:border-emerald-400 shadow-sm transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>{isEs ? 'Exportar PDF' : isFr ? 'Exporter PDF' : isEn ? 'Export PDF' : 'Ekspòte PDF'}</span>
              </button>
              <button
                type="button"
                id="btn-export-attendance-csv"
                onClick={handleExportAttendanceCSV}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#1E293B] hover:bg-slate-700/80 text-slate-200 font-bold text-xs border border-slate-700/80 shadow-sm transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>{isEs ? 'Exportar CSV' : isFr ? 'Exporter CSV' : isEn ? 'Export CSV' : 'Ekspòte CSV'}</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                id="btn-export-absentees-pdf"
                onClick={handleExportAbsenteesPDF}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#1E293B] hover:bg-slate-700/80 text-rose-300 font-bold text-xs border border-rose-500/30 hover:border-rose-400 shadow-sm transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-rose-400" />
                <span>{isEs ? 'Exportar Ausencias PDF' : isFr ? 'Exporter Absences PDF' : isEn ? 'Export Absences PDF' : 'Ekspòte Absans PDF'}</span>
              </button>
              <button
                type="button"
                id="btn-export-absentees-csv"
                onClick={handleExportAbsenteesCSV}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#1E293B] hover:bg-slate-700/80 text-slate-200 font-bold text-xs border border-slate-700/80 shadow-sm transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-rose-400" />
                <span>{isEs ? 'Exportar Ausencias CSV' : isFr ? 'Exporter Absences CSV' : isEn ? 'Export Absences CSV' : 'Ekspòte Absans CSV'}</span>
              </button>
            </>
          )}

          {onOpenScanner && (
            <button
              type="button"
              id="btn-open-scanner-from-attendance"
              onClick={onOpenScanner}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs shadow-md shadow-amber-500/10 transition-all hover:scale-105 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>{isEs ? 'Lanzar Escáner' : isFr ? 'Lancer le Scanner' : isEn ? 'Launch Scanner' : 'Lanse Scanner la'}</span>
            </button>
          )}
        </div>
      </div>

      {/* OFFLINE ATTENDANCE & SYNC STATUS BANNER */}
      {!isDeviceOnline() ? (
        <div className="p-3.5 bg-amber-500/15 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-200">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-bold text-xs">
                {isEs ? 'Modo Local / Fuera de Línea' : isFr ? 'Mode Local / Hors-ligne' : isEn ? 'Local / Offline Mode' : 'Mòd Lokal / Offline'}
              </p>
              <p className="text-[11px] text-amber-300/80">
                {pendingCount > 0
                  ? `${pendingCount} prezans ap tann pou senkronize kou koneksyon an retounen.`
                  : 'Prezans yo ap sove lokalman sou aparèy la san entènèt.'}
              </p>
            </div>
          </div>
        </div>
      ) : pendingCount > 0 ? (
        <div className="p-3.5 bg-sky-500/15 border border-sky-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sky-200">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-5 h-5 text-sky-400 shrink-0" />
            <div>
              <p className="font-bold text-xs">
                {pendingCount} {isEs ? 'Asistencias Pendientes de Sincronización' : isFr ? 'Présences en Attente de Synchronisation' : isEn ? 'Attendances Pending Cloud Sync' : 'Prezans ap Tann Senkronizasyon'}
              </p>
              <p className="text-[11px] text-sky-300/80">
                Koneksyon an disponib. Ou ka klike pou senkronize done sa yo kounye a ak nwaj la.
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-sync-offline-attendance"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-sm transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>
              {isSyncing
                ? isEs ? 'Sincronizando...' : isFr ? 'Synchronisation...' : isEn ? 'Syncing...' : 'N ap senkronize...'
                : isEs ? 'Sincronizar Ahora' : isFr ? 'Synchroniser Maintenant' : isEn ? 'Sync Now' : 'Senkronize Kounye a'}
            </span>
          </button>
        </div>
      ) : null}

      {/* EXECUTIVE KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Members */}
        <div className="bg-[#1E293B] rounded-2xl p-3.5 border border-slate-700/70">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              {isEs ? 'Total Miembros' : isFr ? 'Total Membres' : isEn ? 'Total Members' : 'Total Manm'}
            </span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">{totalChurchMembers}</div>
          <div className="text-[10px] text-slate-400 mt-1">
            {isEs ? 'Registrados en la iglesia' : isFr ? 'Inscrits à l\'église' : isEn ? 'Registered in church' : 'Anrejistre nan legliz'}
          </div>
        </div>

        {/* Present Members */}
        <div className="bg-[#1E293B] rounded-2xl p-3.5 border border-emerald-500/30 bg-emerald-500/[0.04]">
          <div className="flex items-center justify-between text-emerald-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              {isEs ? 'Presentes' : isFr ? 'Présents' : isEn ? 'Present' : 'Prezan'}
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-300">{distinctPresentCount}</div>
          <div className="text-[10px] text-emerald-400/80 mt-1 font-medium">
            {recordsForEffectiveService.length} {isEs ? 'escaneos' : isFr ? 'scans' : isEn ? 'scans' : 'scan fèt'}
          </div>
        </div>

        {/* On Time */}
        <div className="bg-[#1E293B] rounded-2xl p-3.5 border border-teal-500/30 bg-teal-500/[0.04]">
          <div className="flex items-center justify-between text-teal-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              {isEs ? 'A Tiempo' : isFr ? 'À l\'heure' : isEn ? 'On Time' : 'Alè'}
            </span>
            <Clock className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-teal-300">{onTimeCount}</div>
          <div className="text-[10px] text-teal-400/80 mt-1 font-medium">
            {distinctPresentCount > 0 ? Math.round((onTimeCount / distinctPresentCount) * 100) : 0}% {isEs ? 'de los presentes' : isFr ? 'des présents' : isEn ? 'of attendees' : 'prezan yo'}
          </div>
        </div>

        {/* Late */}
        <div className="bg-[#1E293B] rounded-2xl p-3.5 border border-amber-500/30 bg-amber-500/[0.04]">
          <div className="flex items-center justify-between text-amber-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              {isEs ? 'Retardos' : isFr ? 'Retards' : isEn ? 'Late' : 'Reta'}
            </span>
            <Timer className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-300">{lateCount}</div>
          <div className="text-[10px] text-amber-400/80 mt-1 font-medium">
            {distinctPresentCount > 0 ? Math.round((lateCount / distinctPresentCount) * 100) : 0}% {isEs ? 'con retraso' : isFr ? 'en retard' : isEn ? 'arrived late' : 'rive an reta'}
          </div>
        </div>

        {/* Absent */}
        <div className="bg-[#1E293B] rounded-2xl p-3.5 border border-rose-500/30 bg-rose-500/[0.04]">
          <div className="flex items-center justify-between text-rose-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              {isEs ? 'Ausentes' : isFr ? 'Absents' : isEn ? 'Absent' : 'Absan'}
            </span>
            <UserX className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-300">{absentCount}</div>
          <div className="text-[10px] text-rose-400/80 mt-1 font-medium">
            {targetServiceEnded
              ? (excusedCount > 0
                  ? `${unexcusedAbsentCount} ${isEs ? 'sin justif.' : isEn ? 'unexcused' : isFr ? 'non justif.' : 'san eskiz'} • ${excusedCount} ${isEs ? 'excusados' : isEn ? 'excused' : isFr ? 'excusés' : 'eskize'}`
                  : (isEs ? 'Marcados ausentes' : isEn ? 'Logged as absent' : isFr ? 'Marqués absents' : 'Tout make absan'))
              : (isEs ? 'Pendientes de llegar' : isFr ? 'En attente' : isEn ? 'Not yet checked in' : 'Poko anrejistre')}
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="bg-[#1E293B] rounded-2xl p-3.5 border border-indigo-500/30 bg-indigo-500/[0.04]">
          <div className="flex items-center justify-between text-indigo-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              {isEs ? 'Tasa Presencia' : isFr ? 'Taux Présence' : isEn ? 'Attendance Rate' : 'To Prezans'}
            </span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-300">{attendanceRate}%</div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-indigo-500 h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(100, attendanceRate)}%` }}
            />
          </div>
        </div>
      </div>

      {/* ACTIVE SERVICE STATUS BANNER */}
      <div className="p-4 bg-[#1E293B] text-white rounded-2xl border border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-3 w-3 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
              {isEs
                ? 'Culte en Cours / Service Actif'
                : isFr
                ? 'Culte en Cours / Service Actif'
                : isEn
                ? 'Active Service Session'
                : 'Kilt / Sèvis ki Louvri Kounye a'}
            </span>
            <h3 className="text-base font-bold text-white">
              {activeService
                ? activeService.title
                : isEs
                ? 'No hay servicio activo'
                : isFr
                ? 'Aucun culte actif'
                : isEn
                ? 'No active service'
                : 'Pa gen sèvis aktif'}
            </h3>
            {activeService && (
              <p className="text-xs text-slate-400">
                {activeService.date} • {activeService.startTime} - {activeService.endTime}
                {activeService.preacherOrLeader && ` • ${activeService.preacherOrLeader}`}
                {activeService.lateToleranceMinutes && (
                  <span className="text-amber-300/90 ml-2">
                    ({isEs ? 'Tolerancia' : isFr ? 'Tolérance' : isEn ? 'Grace period' : 'Tolerans'}: {activeService.lateToleranceMinutes} min)
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {onOpenScanner && (
          <button
            type="button"
            onClick={onOpenScanner}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 cursor-pointer"
          >
            <Camera className="w-4 h-4 text-amber-400" />
            <span>
              {isEs
                ? 'Abrir Cámara para Este Servicio'
                : isFr
                ? 'Ouvrir la Caméra pour ce Culte'
                : isEn
                ? 'Open Camera for this Service'
                : 'Ouvri Kamera pou Sèvis Sa a'}
            </span>
          </button>
        )}
      </div>

      {/* QUICK MANUAL CHECK-IN BAR */}
      <div className="bg-[#1E293B] rounded-2xl p-4 sm:p-5 border border-slate-700/80 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" />
            {isEs
              ? 'Entrada Manual & Registro de Asistencia'
              : isFr
              ? 'Saisie Manuelle & Enregistrement de Présence'
              : isEn
              ? 'Manual Entry & Quick Check-in'
              : 'Antre Manyèl & Anrejistreman Prezans'}
          </h4>
          <span className="text-[11px] text-slate-400">
            {isEs
              ? 'Escriba Member ID o seleccione un miembro'
              : isFr
              ? 'Tapez le Member ID ou cliquez sur un membre'
              : isEn
              ? 'Type Member ID or click a member'
              : 'Tape Member ID oswa klike sou yon manm'}
          </span>
        </div>

        {/* Quick Feedback */}
        {quickCheckinFeedback && (
          <div
            className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
              quickCheckinFeedback.success
                ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/20 border border-amber-500/30 text-amber-300'
            }`}
          >
            {quickCheckinFeedback.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>{quickCheckinFeedback.message}</span>
          </div>
        )}

        {/* Member Quick Buttons */}
        <div className="flex flex-wrap gap-1.5 p-2 bg-slate-900/80 rounded-xl border border-slate-700 max-h-24 overflow-y-auto">
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              id={`btn-desk-checkin-${m.id}`}
              onClick={() => handleManualCheckIn(m.memberId)}
              className="px-2.5 py-1 rounded-md text-xs bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/30 border border-slate-700 transition-colors font-medium text-slate-300 flex items-center gap-1 cursor-pointer"
            >
              <UserCheck className="w-3 h-3 text-slate-400" />
              <span>{m.fullName}</span>
              <span className="font-mono text-[10px] text-slate-500">({m.memberId})</span>
            </button>
          ))}
        </div>

        {/* Manual Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleManualCheckIn(manualCode);
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              id="input-desk-manual-code"
              placeholder={
                isEs
                  ? 'Escriba Member ID (ej: CH001-JD4827) o nombre...'
                  : isFr
                  ? 'Tapez Member ID (ex: CH001-JD4827) ou nom...'
                  : isEn
                  ? 'Type Member ID (e.g. CH001-JD4827) or name...'
                  : 'Tape Member ID (eg: CH001-JD4827) oswa non...'
              }
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            id="btn-desk-submit-checkin"
            disabled={!manualCode.trim()}
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs disabled:opacity-50 transition-colors cursor-pointer"
          >
            {isEs ? 'Marcar Asistencia' : isFr ? 'Pointer Présence' : isEn ? 'Check-in Member' : 'Make Prezans'}
          </button>
        </form>
      </div>

      {/* SERVICE FILTER SELECTOR & TOP TABS */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#1E293B] p-3 rounded-2xl border border-slate-700/80">
          {/* Main Tabs */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="tab-btn-attendance-list"
              onClick={() => setActiveTab('attendance')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'attendance'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isEs ? 'Lista de Asistencias' : isFr ? 'Liste des Présences' : isEn ? 'Attendance List' : 'Lis Prezans (Alè & Reta)'}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === 'attendance'
                    ? 'bg-slate-950/20 text-slate-950 font-black'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {filteredAttendance.length}
              </span>
            </button>

            <button
              type="button"
              id="tab-btn-absentees-list"
              onClick={() => setActiveTab('absentees')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'absentees'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <UserX className="w-4 h-4" />
              <span>{isEs ? 'Miembros Ausentes' : isFr ? 'Membres Absents' : isEn ? 'Absent Members' : 'Manm ki Absan'}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === 'absentees'
                    ? 'bg-rose-950 text-white font-black'
                    : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {rawAbsentees.length}
              </span>
            </button>
          </div>

          {/* Service Selector (Shared by both views) */}
          <div className="flex items-center gap-2 min-w-[240px]">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              id="select-filter-attendance-service"
              value={selectedServiceFilter}
              onChange={(e) => setSelectedServiceFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-slate-900 text-slate-200 rounded-xl border border-slate-700 font-medium focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none shadow-sm cursor-pointer"
            >
              <option value="all">
                {isEs
                  ? `Todos los Servicios (${attendanceRecords.length} registros)`
                  : isFr
                  ? `Tous les Cultes (${attendanceRecords.length} présences)`
                  : isEn
                  ? `All Services (${attendanceRecords.length} records)`
                  : `Tout Sèvis Yo (${attendanceRecords.length} prezans)`}
              </option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.date})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ======================= TAB 1: ATTENDANCE LIST ======================= */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            {/* Sub-Filters: Status & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5 p-1 bg-[#1E293B] rounded-xl border border-slate-700/80">
                <button
                  type="button"
                  id="btn-filter-status-all"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-slate-700 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isEs ? 'Todos' : isFr ? 'Tous' : isEn ? 'All' : 'Tout'} ({recordsForEffectiveService.length})
                </button>
                <button
                  type="button"
                  id="btn-filter-status-ontime"
                  onClick={() => setStatusFilter('on_time')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    statusFilter === 'on_time'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-emerald-400'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isEs ? 'A Tiempo' : isFr ? 'À l\'heure' : isEn ? 'On Time' : 'Alè'} ({onTimeCount})</span>
                </button>
                <button
                  type="button"
                  id="btn-filter-status-late"
                  onClick={() => setStatusFilter('late')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    statusFilter === 'late'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'text-slate-400 hover:text-amber-400'
                  }`}
                >
                  <Timer className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isEs ? 'Retardos' : isFr ? 'Retards' : isEn ? 'Late' : 'Reta'} ({lateCount})</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  id="input-search-attendance-list"
                  placeholder={
                    isEs
                      ? 'Buscar por nombre, Member ID o servicio...'
                      : isFr
                      ? 'Rechercher par nom, Member ID ou culte...'
                      : isEn
                      ? 'Search by name, Member ID or service...'
                      : 'Chèche pa non, Member ID oswa sèvis...'
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-[#1E293B] text-slate-100 placeholder:text-slate-500 rounded-xl border border-slate-700/80 focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none shadow-sm"
                />
              </div>
            </div>

            {/* Attendance Table */}
            <div className="bg-[#1E293B] rounded-2xl border border-slate-700/80 shadow-sm overflow-hidden">
              {filteredAttendance.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <Users className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-sm font-medium">
                    {isEs
                      ? 'No hay registros de asistencia que coincidan con la búsqueda.'
                      : isFr
                      ? 'Aucun enregistrement de présence ne correspond à la recherche.'
                      : isEn
                      ? 'No attendance records match your search.'
                      : 'Pa gen okenn anrejistreman prezans ki koresponn.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-[#0F172A] text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-700/80">
                      <tr>
                        <th className="py-3.5 px-4">{isEs ? 'Miembro / Nombre' : isFr ? 'Membre / Nom' : isEn ? 'Member / Name' : 'Manm / Non'}</th>
                        <th className="py-3.5 px-4">Member ID</th>
                        <th className="py-3.5 px-4">{isEs ? 'Servicio / Actividad' : isFr ? 'Culte / Activité' : isEn ? 'Service / Worship' : 'Sèvis / Aktivite'}</th>
                        <th className="py-3.5 px-4">{isEs ? 'Categoría' : isFr ? 'Catégorie' : isEn ? 'Category' : 'Kategori'}</th>
                        <th className="py-3.5 px-4">{isEs ? 'Hora de Escaneo' : isFr ? 'Heure du Scan' : isEn ? 'Scan Time' : 'Lè Scan'}</th>
                        <th className="py-3.5 px-4">{isEs ? 'Método' : isFr ? 'Méthode' : isEn ? 'Method' : 'Metòd'}</th>
                        <th className="py-3.5 px-4 text-center">{isEs ? 'Puntualidad' : isFr ? 'Ponctualité' : isEn ? 'Punctuality' : 'Estati Reta / Alè'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/60 font-medium">
                      {filteredAttendance.map((rec) => {
                        const catConfig = SERVICE_CATEGORIES[rec.serviceCategory];
                        const categoryName = catConfig
                          ? isEs
                            ? catConfig.name.es
                            : isFr
                            ? catConfig.name.fr || catConfig.name.es
                            : isEn
                            ? catConfig.name.en || catConfig.name.es
                            : catConfig.name.ht
                          : rec.serviceCategory;

                        const isLate = rec.attendanceStatus === 'late';

                        return (
                          <tr
                            key={rec.id}
                            className="hover:bg-slate-800/80 transition-colors"
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                    isLate
                                      ? 'bg-amber-500/20 border border-amber-500/30 text-amber-400'
                                      : 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                                  }`}
                                >
                                  {rec.memberName[0]}
                                </div>
                                <div>
                                  <span className="font-bold text-white block">
                                    {rec.memberName}
                                  </span>
                                  {rec.memberDepartment && (
                                    <span className="text-[10px] text-slate-500">
                                      {rec.memberDepartment}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 font-mono font-bold text-amber-300 whitespace-nowrap">
                              {rec.memberId}
                            </td>

                            <td className="py-3.5 px-4 font-semibold text-slate-200">
                              <div>{rec.serviceTitle}</div>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {rec.serviceDate}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {catConfig ? (
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${catConfig.badgeBg}`}
                                >
                                  {categoryName}
                                </span>
                              ) : (
                                <span>{rec.serviceCategory}</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 font-mono text-slate-400 whitespace-nowrap">
                              {new Date(rec.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-mono text-[10px]">
                                {rec.checkInMethod === 'qr_scan'
                                  ? 'QR Code'
                                  : rec.checkInMethod === 'barcode'
                                  ? 'Barcode'
                                  : isEs ? 'Manual' : isFr ? 'Manuel' : isEn ? 'Manual' : 'Manyèl'}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              {isLate ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-[11px]">
                                  <Timer className="w-3.5 h-3.5 text-amber-400" />
                                  <span>
                                    {isEs ? 'Retardo' : isFr ? 'Retard' : isEn ? 'Late' : 'Reta'}
                                    {rec.lateMinutes ? ` (+${rec.lateMinutes} min)` : ''}
                                  </span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-[11px]">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>{isEs ? 'A Tiempo ✓' : isFr ? 'À l\'heure ✓' : isEn ? 'On Time ✓' : 'Alè ✓'}</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================= TAB 2: ABSENTEES LIST ======================= */}
        {activeTab === 'absentees' && (
          <div className="space-y-4">
            {/* Absentees Service Info Notice */}
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-200">
              <div className="flex items-center gap-2.5">
                <UserX className="w-5 h-5 text-rose-400 shrink-0" />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-xs text-white">
                      {isEs
                        ? `Miembros ausentes para: ${targetServiceForAbsentees?.title || 'Servicio'}`
                        : isFr
                        ? `Membres absents pour : ${targetServiceForAbsentees?.title || 'Culte'}`
                        : isEn
                        ? `Absent members for: ${targetServiceForAbsentees?.title || 'Service'}`
                        : `Manm ki absan nan: ${targetServiceForAbsentees?.title || 'Sèvis Kilt la'}`}
                    </p>
                    {targetServiceEnded ? (
                      <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 text-[10px] font-bold">
                        {isEs ? 'Servicio Finalizado (Ausencias Registradas)' : isEn ? 'Service Ended (Absences Recorded)' : isFr ? 'Culte Terminé (Absences Enregistrées)' : 'Kilt Fini (Absans Anrejistre)'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                        {isEs ? 'En Curso (Pendientes de Escanear)' : isEn ? 'In Progress (Pending Scan)' : isFr ? 'En Cours (En attente)' : 'Sèvis an Kous (Ki poko eskane)'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-rose-300/80 mt-0.5">
                    {targetServiceForAbsentees?.date} • {rawAbsentees.length} {isEs ? 'miembros no han registrado asistencia' : isFr ? 'membres n\'ont pas encore enregistré leur présence' : isEn ? 'members have not checked in' : 'manm pa t eskane pandan sèvis sa a'}
                    {excusedCount > 0 ? ` (${excusedCount} ${isEs ? 'excusados' : isEn ? 'excused' : isFr ? 'excusés' : 'eskize'})` : ''}.
                  </p>
                </div>
              </div>
            </div>

            {/* Filters: Search & Department */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  id="input-search-absentees-list"
                  placeholder={
                    isEs
                      ? 'Buscar miembros ausentes por nombre, ID o teléfono...'
                      : isFr
                      ? 'Rechercher les absents par nom, ID ou téléphone...'
                      : isEn
                      ? 'Search absentees by name, ID or phone...'
                      : 'Chèche manm ki absan pa non, ID, oswa telefòn...'
                  }
                  value={absenteeSearch}
                  onChange={(e) => setAbsenteeSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs bg-[#1E293B] text-slate-100 placeholder:text-slate-500 rounded-xl border border-slate-700/80 focus:ring-1 focus:ring-rose-400 focus:border-rose-400 focus:outline-none shadow-sm"
                />
              </div>

              <div className="sm:col-span-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                  <select
                    id="select-filter-absentees-dept"
                    value={absenteeDeptFilter}
                    onChange={(e) => setAbsenteeDeptFilter(e.target.value)}
                    className="w-full py-2.5 px-3 text-xs bg-[#1E293B] text-slate-200 rounded-xl border border-slate-700/80 font-medium focus:ring-1 focus:ring-rose-400 focus:border-rose-400 focus:outline-none shadow-sm cursor-pointer"
                  >
                    <option value="all">
                      {isEs ? 'Todos los Departamentos' : isFr ? 'Tous les Départements' : isEn ? 'All Departments' : 'Tout Depatman Yo'}
                    </option>
                    {departmentsList.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Absentees Table */}
            <div className="bg-[#1E293B] rounded-2xl border border-slate-700/80 shadow-sm overflow-hidden">
              {filteredAbsentees.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                  <p className="text-sm font-bold text-white">
                    {isEs
                      ? '¡Excelente! No hay ausencias registradas para esta selección.'
                      : isFr
                      ? 'Parfait ! Aucune absence enregistrée pour cette sélection.'
                      : isEn
                      ? 'Excellent! No absentees found for this selection.'
                      : 'Ekselan! Tout manm nan seleksyon sa a prezan.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-[#0F172A] text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-700/80">
                      <tr>
                        <th className="py-3.5 px-4">{isEs ? 'Miembro / Nombre' : isFr ? 'Membre / Nom' : isEn ? 'Member / Name' : 'Manm / Non'}</th>
                        <th className="py-3.5 px-4">Member ID</th>
                        <th className="py-3.5 px-4">{isEs ? 'Departamento' : isFr ? 'Département' : isEn ? 'Department' : 'Depatman'}</th>
                        <th className="py-3.5 px-4">{isEs ? 'Contacto' : isFr ? 'Contact' : isEn ? 'Contact' : 'Kontak'}</th>
                        <th className="py-3.5 px-4 text-center">{isEs ? 'Estado' : isFr ? 'Statut' : isEn ? 'Status' : 'Stati'}</th>
                        <th className="py-3.5 px-4 text-right">{isEs ? 'Acción Rápida' : isFr ? 'Action Rapide' : isEn ? 'Quick Action' : 'Aksyon Rapid'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/60 font-medium">
                      {filteredAbsentees.map((m) => (
                        <tr
                          key={m.id}
                          className="hover:bg-slate-800/80 transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center font-bold text-xs shrink-0">
                                {m.fullName[0]}
                              </div>
                              <div>
                                <span className="font-bold text-white block">
                                  {m.fullName}
                                </span>
                                {m.role && (
                                  <span className="text-[10px] text-slate-500 capitalize">
                                    {m.role}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-amber-300 whitespace-nowrap">
                            {m.memberId}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 text-[10px] font-semibold">
                              {m.department || 'Manm Jeneral'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {m.phone ? (
                              <div className="flex items-center gap-2">
                                <a
                                  href={`tel:${m.phone}`}
                                  className="inline-flex items-center gap-1 text-slate-300 hover:text-emerald-400 font-mono transition-colors"
                                  title="Rele manm lan"
                                >
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  <span>{m.phone}</span>
                                </a>
                                <a
                                  href={`https://wa.me/${m.phone.replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors"
                                  title="WhatsApp"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                </a>
                              </div>
                            ) : (
                              <span className="text-slate-600 text-[11px]">—</span>
                            )}
                          </td>

                          {(() => {
                            const absenceRec =
                              absenceByMemberMap.get(m.id) ||
                              (m.memberId ? absenceByMemberMap.get(m.memberId.toUpperCase()) : undefined);
                            const isExcused = absenceRec?.status === 'excused';

                            return (
                              <>
                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                  {isExcused ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold text-[11px]">
                                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                                      <span>{isEs ? 'Excusado ✓' : isFr ? 'Excusé ✓' : isEn ? 'Excused ✓' : 'Eskize ✓'}</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold text-[11px]">
                                      <UserX className="w-3.5 h-3.5 text-rose-400" />
                                      <span>{isEs ? 'Ausente' : isFr ? 'Absent' : isEn ? 'Absent' : 'Absan'}</span>
                                    </span>
                                  )}
                                </td>

                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                  <div className="inline-flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      id={`btn-toggle-excuse-${m.id}`}
                                      onClick={() => handleToggleExcuse(m)}
                                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                                        isExcused
                                          ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-400/30'
                                          : 'bg-indigo-500/10 hover:bg-indigo-500/25 text-indigo-300 border-indigo-500/30'
                                      }`}
                                      title={isExcused ? 'Retire Eskiz' : 'Eskize absans sa a'}
                                    >
                                      <ShieldCheck className="w-3.5 h-3.5" />
                                      <span>
                                        {isExcused
                                          ? isEs
                                            ? 'Quitar Excusa'
                                            : isFr
                                            ? 'Annuler'
                                            : isEn
                                            ? 'Remove Excuse'
                                            : 'Retire Eskiz'
                                          : isEs
                                          ? 'Excusar'
                                          : isFr
                                          ? 'Exposer'
                                          : isEn
                                          ? 'Excuse'
                                          : 'Eskize'}
                                      </span>
                                    </button>

                                    <button
                                      type="button"
                                      id={`btn-mark-absentee-present-${m.id}`}
                                      onClick={() => handleManualCheckIn(m.memberId)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-sm cursor-pointer"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>{isEs ? 'Marcar Presente' : isFr ? 'Pointer Présent' : isEn ? 'Mark Present' : 'Make Prezan'}</span>
                                    </button>
                                  </div>
                                </td>
                              </>
                            );
                          })()}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
