import React, { useState, useEffect } from 'react';
import {
  Church,
  Member,
  ServiceSession,
  AttendanceRecord,
  Language,
} from '../../types';
import {
  Database,
  Search,
  Users,
  Calendar,
  CheckCircle2,
  HardDrive,
  Download,
  Upload,
  Wrench,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Check,
  Filter,
  FileText,
  Shield,
  Layers,
  QrCode,
  Clock,
  ExternalLink,
} from 'lucide-react';
import {
  getAllChurches,
  getAllMembers,
  getAllServices,
  getAllAttendance,
  deleteAttendanceRecord,
  deleteMultipleAttendanceRecords,
  deleteMember,
  deleteMemberAsync,
  deleteMultipleMembers,
  deleteMultipleMembersAsync,
  deleteServiceSession,
} from '../../utils/storage';
import {
  calculateAppStorageUsage,
  exportFullSystemDatabase,
  importFullSystemDatabase,
  runDatabaseIntegrityCheckAndRepair,
  DatabaseDoctorReport,
} from '../../utils/developerStorage';
import { useToast } from '../../context/ToastContext';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';

interface DevDatabaseTabProps {
  allChurches: Church[];
  language?: Language;
  onRefreshAll?: () => void;
  initialSubView?: 'members' | 'services' | 'attendance' | 'doctor' | 'backup';
}

export const DevDatabaseTab: React.FC<DevDatabaseTabProps> = ({
  allChurches,
  language = 'ht',
  onRefreshAll,
  initialSubView = 'members',
}) => {
  const toast = useToast();
  const [subView, setSubView] = useState<'members' | 'services' | 'attendance' | 'doctor' | 'backup'>(initialSubView);

  // Sync initialSubView when it changes
  useEffect(() => {
    if (initialSubView) {
      setSubView(initialSubView);
    }
  }, [initialSubView]);

  // Loaded Data
  const [members, setMembers] = useState<Member[]>(() => getAllMembers());
  const [services, setServices] = useState<ServiceSession[]>(() => getAllServices());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => getAllAttendance());
  const [storageUsage, setStorageUsage] = useState(() => calculateAppStorageUsage());

  // Search & Filters for Members
  const [memberSearch, setMemberSearch] = useState('');
  const [churchFilter, setChurchFilter] = useState('ALL');
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());

  // Search & Filters for Services
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceChurchFilter, setServiceChurchFilter] = useState('ALL');

  // Search & Filters for Attendance
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [attendanceChurchFilter, setAttendanceChurchFilter] = useState('ALL');
  const [attendanceMethodFilter, setAttendanceMethodFilter] = useState<string>('ALL');
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<string>('ALL');
  const [selectedAttendanceIds, setSelectedAttendanceIds] = useState<Set<string>>(new Set());

  // Doctor State
  const [isDoctorRunning, setIsDoctorRunning] = useState(false);
  const [doctorReport, setDoctorReport] = useState<DatabaseDoctorReport | null>(null);

  // Restore State
  const [importJsonText, setImportJsonText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // In-app Modal Confirmation States (avoids iframe window.confirm blocking)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    itemName?: string;
    confirmButtonText?: string;
    cancelButtonText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [serviceDeleteModal, setServiceDeleteModal] = useState<{
    isOpen: boolean;
    service: ServiceSession | null;
    deleteAttendance: boolean;
  }>({
    isOpen: false,
    service: null,
    deleteAttendance: true,
  });

  const reloadData = () => {
    setMembers(getAllMembers());
    setServices(getAllServices());
    setAttendance(getAllAttendance());
    setStorageUsage(calculateAppStorageUsage());
    setSelectedMemberIds(new Set());
    setSelectedAttendanceIds(new Set());
  };

  useEffect(() => {
    reloadData();
  }, []);

  // Filtered Members
  const filteredMembers = members.filter((m) => {
    if (churchFilter !== 'ALL' && (m.churchId || '').toUpperCase() !== churchFilter.toUpperCase()) {
      return false;
    }
    const q = memberSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (m.fullName || '').toLowerCase().includes(q) ||
      (m.memberId || '').toLowerCase().includes(q) ||
      (m.phone && m.phone.includes(q)) ||
      (m.titlePrefix && (m.titlePrefix || '').toLowerCase().includes(q))
    );
  });

  // Filtered Services
  const filteredServices = services.filter((s) => {
    if (serviceChurchFilter !== 'ALL' && (s.churchId || '').toUpperCase() !== serviceChurchFilter.toUpperCase()) {
      return false;
    }
    const q = serviceSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (s.title || '').toLowerCase().includes(q) ||
      (s.churchId || '').toLowerCase().includes(q) ||
      (s.date || '').includes(q) ||
      (s.status || '').toLowerCase().includes(q)
    );
  });

  // Filtered Attendance Records
  const filteredAttendance = attendance.filter((a) => {
    if (attendanceChurchFilter !== 'ALL' && (a.churchId || '').toUpperCase() !== attendanceChurchFilter.toUpperCase()) {
      return false;
    }
    if (attendanceMethodFilter !== 'ALL' && a.checkInMethod !== attendanceMethodFilter) {
      return false;
    }
    const recStatus = a.attendanceStatus || (a as any).status || 'on_time';
    if (attendanceStatusFilter !== 'ALL') {
      if (attendanceStatusFilter === 'on_time' && recStatus !== 'on_time' && recStatus !== 'present') return false;
      if (attendanceStatusFilter === 'late' && recStatus !== 'late') return false;
      if (attendanceStatusFilter === 'excused' && recStatus !== 'excused') return false;
    }
    const q = attendanceSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (a.memberName || '').toLowerCase().includes(q) ||
      (a.memberId || '').toLowerCase().includes(q) ||
      (a.serviceTitle || '').toLowerCase().includes(q) ||
      (a.serviceId || '').toLowerCase().includes(q) ||
      (a.recordedBy || '').toLowerCase().includes(q)
    );
  });

  // Attendance Metrics
  const totalAttendanceScans = attendance.length;
  const qrAttendanceScans = attendance.filter((a) => a.checkInMethod === 'qr_scan').length;
  const onTimeAttendanceScans = attendance.filter(
    (a) => a.attendanceStatus === 'on_time' || (a as any).status === 'present'
  ).length;
  const lateAttendanceScans = attendance.filter(
    (a) => a.attendanceStatus === 'late' || (a as any).status === 'late'
  ).length;

  const formatSafeScanTime = (timestamp?: string) => {
    if (!timestamp) return '—';
    try {
      const d = new Date(timestamp);
      if (isNaN(d.getTime())) return String(timestamp);
      return d.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (_) {
      return String(timestamp);
    }
  };

  // Export Attendance to CSV
  const handleExportAttendanceCsv = () => {
    if (attendance.length === 0) {
      toast.warning('Pa gen Done', 'Pa gen okenn dosye prezans pou ekspòte.');
      return;
    }
    const headers = ['ID', 'Legliz ID', 'Kòd Manm', 'Non Manm', 'Sèvis ID', 'Tit Sèvis', 'Dat Sèvis', 'Metòd', 'Lè Eskane', 'Estati', 'Reta (Min)'];
    const rows = attendance.map((a) => [
      `"${a.id}"`,
      `"${a.churchId}"`,
      `"${a.memberId}"`,
      `"${(a.memberName || '').replace(/"/g, '""')}"`,
      `"${a.serviceId}"`,
      `"${(a.serviceTitle || '').replace(/"/g, '""')}"`,
      `"${a.serviceDate || ''}"`,
      `"${a.checkInMethod || 'manual'}"`,
      `"${a.timestamp || ''}"`,
      `"${a.attendanceStatus || (a as any).status || 'on_time'}"`,
      `"${a.lateMinutes || 0}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `omnichurch_prezans_eskane_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    }, 500);
    toast.success('Ekspòtasyon CSV Fèt', `${attendance.length} anrejistreman prezans telechaje.`);
  };

  // Delete Attendance Record
  const handleDeleteAttendance = (recordId: string, memberName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Efase Eskan Prezans',
      message: `Èske w sèten ou vle efase eskan prezans pou "${memberName}"? Li pral retire nèt nan baz done lokal la ak Cloud Firestore.`,
      itemName: `Eskan: ${memberName} (ID: ${recordId})`,
      confirmButtonText: 'Wi, Efase Eskan sa a',
      onConfirm: () => {
        const ok = deleteAttendanceRecord(recordId);
        if (ok) {
          setSelectedAttendanceIds((prev) => {
            const next = new Set(prev);
            next.delete(recordId);
            return next;
          });
          reloadData();
          if (onRefreshAll) onRefreshAll();
          toast.success('Eskan Efase', 'Anrejistreman prezans lan retire nan baz done lokal ak Cloud Firestore.');
        } else {
          toast.error('Erè', 'Pa t ka efase anrejistreman an.');
        }
      },
    });
  };

  // Delete Selected Attendance Records in Batch
  const handleDeleteSelectedAttendance = () => {
    if (selectedAttendanceIds.size === 0) return;
    const count = selectedAttendanceIds.size;
    const confirmMessage =
      language === 'es'
        ? `¿Está seguro de eliminar los ${count} registros de asistencia seleccionados? Se eliminarán permanentemente de la base de datos local y Cloud Firestore.`
        : language === 'en'
        ? `Are you sure you want to delete the ${count} selected attendance records? They will be permanently removed from both local storage and Cloud Firestore.`
        : language === 'fr'
        ? `Êtes-vous sûr de vouloir supprimer les ${count} présences sélectionnées ? Elles seront définitivement supprimées du stockage local et Cloud Firestore.`
        : `Èske w sèten ou vle efase ${count} eskan prezans ou chwazi yo? Y ap retire nèt nan baz done lokal la ak Cloud Firestore!`;

    setConfirmModal({
      isOpen: true,
      title: 'Efase Eskan Prezans an Mas',
      message: confirmMessage,
      itemName: `${count} eskan prezans seleksyone`,
      confirmButtonText: `Wi, Efase ${count} Eskan`,
      onConfirm: () => {
        const deleted = deleteMultipleAttendanceRecords(Array.from(selectedAttendanceIds));
        setSelectedAttendanceIds(new Set());
        reloadData();
        if (onRefreshAll) onRefreshAll();
        toast.success('Eskan Prezans Efase', `${deleted} anrejistreman prezans efase nèt.`);
      },
    });
  };

  // Clear all filtered attendance
  const handleClearFilteredAttendance = () => {
    if (filteredAttendance.length === 0) return;
    const count = filteredAttendance.length;
    const confirmMessage = `⚠️ ATANSYON DEV: Ou pral efase TOUT ${count} eskan prezans ki nan rezilta rechèch/filtè aktyèl la! Aksyon sa a pa ka defèt epi li pral efase yo nan baz done lokal la ak Cloud Firestore tou.`;

    setConfirmModal({
      isOpen: true,
      title: 'Vide Tout Lis Prezans Filtre a',
      message: confirmMessage,
      itemName: `${count} eskan prezans filtre`,
      confirmButtonText: `Wi, Vide ${count} Eskan sa yo`,
      onConfirm: () => {
        const idsToDelete = filteredAttendance.map((a) => a.id);
        const deleted = deleteMultipleAttendanceRecords(idsToDelete);
        setSelectedAttendanceIds(new Set());
        reloadData();
        if (onRefreshAll) onRefreshAll();
        toast.success('Prezans Vide', `${deleted} anrejistreman prezans efase nèt.`);
      },
    });
  };

  // Delete Member Permanently across ANY church with full cascading activity wipe
  const handleDeleteMember = (member: Member) => {
    const memberName = member.fullName || member.memberId || member.id;
    const confirmMessage =
      language === 'es'
        ? `¿Está seguro de eliminar al miembro "${memberName}" (${member.memberId}) de la iglesia "${member.churchId}"?\n\n⚠️ ACCIÓN DE DESARROLLADOR: Esto eliminará permanentemente al miembro y TODAS sus actividades (asistencias, ausencias, comentarios) en la base de datos local y Cloud Firestore.`
        : language === 'en'
        ? `Are you sure you want to delete member "${memberName}" (${member.memberId}) from church "${member.churchId}"?\n\n⚠️ DEVELOPER PRIVILEGE: This will permanently delete the member and ALL of their activities (attendance scans, absences, comments) in both local storage and Cloud Firestore.`
        : language === 'fr'
        ? `Êtes-vous sûr de vouloir supprimer le membre "${memberName}" (${member.memberId}) de l'église "${member.churchId}" ?\n\n⚠️ PRIVILÈGE DÉVELOPPEUR : Cela supprimera définitivement le membre et TOUTES ses activités (présences, absences, commentaires) dans le stockage local et Cloud Firestore.`
        : `Èske w sèten ou vle efase manm "${memberName}" (${member.memberId}) nan legliz "${member.churchId}"?\n\n⚠️ POUVWA DEV: Aksyon sa a pral efase manm nan nèt ansanm ak TOUT aktivite li yo (tout eskan prezans, absans, kòmantè) nan baz done lokal la ak Cloud Firestore!`;

    setConfirmModal({
      isOpen: true,
      title: 'Efase Manm ak Tout Aktivite',
      message: confirmMessage,
      itemName: `${memberName} (${member.memberId}) - Legliz: ${member.churchId}`,
      confirmButtonText: 'Wi, Efase Manm Sa A',
      onConfirm: async () => {
        const res = await deleteMemberAsync(member.churchId, member.id);
        setSelectedMemberIds((prev) => {
          const next = new Set(prev);
          next.delete(member.id);
          return next;
        });
        reloadData();
        if (onRefreshAll) onRefreshAll();

        toast.success(
          language === 'es'
            ? 'Miembro y Actividades Eliminados'
            : language === 'en'
            ? 'Member & Activities Deleted'
            : language === 'fr'
            ? 'Membre et Activités Supprimés'
            : 'Manm ak Tout Aktivite Efase',
          language === 'es'
            ? `"${memberName}" y todos sus registros (${res.deletedScansCount} asistencias, ${res.deletedAbsencesCount} ausencias, ${res.deletedCommentsCount} comentarios) han sido eliminados.`
            : language === 'en'
            ? `"${memberName}" and all records (${res.deletedScansCount} attendance scans, ${res.deletedAbsencesCount} absences, ${res.deletedCommentsCount} comments) have been removed.`
            : language === 'fr'
            ? `"${memberName}" et tous ses dossiers (${res.deletedScansCount} présences, ${res.deletedAbsencesCount} absences, ${res.deletedCommentsCount} commentaires) ont été supprimés.`
            : `"${memberName}" ak tout aktivite li yo (${res.deletedScansCount} prezans, ${res.deletedAbsencesCount} absans, ${res.deletedCommentsCount} kòmantè) retire nèt.`
        );
      },
    });
  };

  // Delete Selected Members in Batch with cascading wipe
  const handleDeleteSelectedMembers = () => {
    if (selectedMemberIds.size === 0) return;
    const count = selectedMemberIds.size;
    const confirmMessage =
      language === 'es'
        ? `⚠️ PRIVILEGIO DESARROLLADOR: ¿Está seguro de eliminar ${count} miembros seleccionados? Esto eliminará permanentemente a los miembros y TODAS sus actividades en cascada (asistencias, ausencias, comentarios) en la base de datos local y Cloud Firestore.`
        : language === 'en'
        ? `⚠️ DEVELOPER PRIVILEGE: Are you sure you want to delete ${count} selected members? This will cascade-delete the members and ALL their activities (scans, absences, comments) in both local storage and Cloud Firestore.`
        : language === 'fr'
        ? `⚠️ PRIVILÈGE DÉVELOPPEUR : Êtes-vous sûr de vouloir supprimer ${count} membres sélectionnés ? Cela supprimera définitivement les membres et TOUTES leurs activités en cascade dans le stockage local et Cloud Firestore.`
        : `⚠️ POUVWA DEV: Èske w sèten ou vle efase ${count} manm ou seleksyone yo? Aksyon sa a pral efase yo ansanm ak TOUT aktivite yo (prezans, absans, kòmantè) an kaskad nan baz done lokal la ak Cloud Firestore!`;

    setConfirmModal({
      isOpen: true,
      title: 'Efase Manm Seleksyone an Mas',
      message: confirmMessage,
      itemName: `${count} manm seleksyone`,
      confirmButtonText: `Wi, Efase ${count} Manm Sa Yo`,
      onConfirm: async () => {
        const res = await deleteMultipleMembersAsync(Array.from(selectedMemberIds));
        setSelectedMemberIds(new Set());
        reloadData();
        if (onRefreshAll) onRefreshAll();
        toast.success(
          'Manm Efase an Mas',
          `${res.deletedMembersCount} manm efase ak ${res.totalScansCount} eskan prezans, ${res.totalAbsencesCount} absans retire nèt.`
        );
      },
    });
  };

  // Delete Service
  const handleDeleteService = (service: ServiceSession) => {
    setServiceDeleteModal({
      isOpen: true,
      service,
      deleteAttendance: true,
    });
  };

  const confirmDeleteServiceAction = () => {
    if (!serviceDeleteModal.service) return;
    const service = serviceDeleteModal.service;
    const sTitle = service.title || service.id;
    const res = deleteServiceSession(service.churchId, service.id, serviceDeleteModal.deleteAttendance);
    setServiceDeleteModal({ isOpen: false, service: null, deleteAttendance: true });
    reloadData();
    if (onRefreshAll) onRefreshAll();
    toast.success(
      'Sèvis Efase',
      `Sèvis "${sTitle}" efase.${res.deletedAttendanceCount > 0 ? ` Ansanm ak ${res.deletedAttendanceCount} eskan prezans li yo.` : ''}`
    );
  };

  // Run Database Doctor
  const handleRunDoctor = async () => {
    setIsDoctorRunning(true);
    try {
      const rep = await runDatabaseIntegrityCheckAndRepair();
      setDoctorReport(rep);
      reloadData();
      if (onRefreshAll) onRefreshAll();
      if (rep.repairsApplied.length > 0) {
        toast.success(
          'Reparasyon Aplike!',
          `${rep.repairsApplied.length} koreksyon otomatik fèt nan baz done a.`
        );
      } else {
        toast.success('Done Sen!', 'Baz done a an bon eta, pa gen enkoyerans.');
      }
    } catch (err: any) {
      toast.error('Erè Enspeksyon', err?.message);
    } finally {
      setIsDoctorRunning(false);
    }
  };

  // Full Database Export
  const handleExportFullBackup = () => {
    const backup = exportFullSystemDatabase();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `omnichurch_full_db_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchor.click();
    toast.success('Sovgad Ekspòte!', 'Tout baz done a telechaje an JSON.');
  };

  // File Upload for Restore
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      setImportJsonText(content);
      toast.info('Fichye Chaje', 'Revize tèks JSON an anba a epi klike sou "Egzekite Restore".');
    };
    reader.readAsText(file);
  };

  // Execute Restore
  const handleExecuteRestore = () => {
    if (!importJsonText.trim()) {
      toast.error('Tèks Manke', 'Tanpri chwazi yon fichye JSON oswa kole done yo.');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Konfime Restore Baz Done',
      message:
        'ATANSYON: Èske w sèten ou vle restore baz done sa a? Aksyon sa a pral ranplase oswa fize done kouran yo nan sistèm nan ak Cloud Firestore.',
      confirmButtonText: 'Wi, Egzekite Restore',
      onConfirm: async () => {
        setIsImporting(true);
        try {
          const parsed = JSON.parse(importJsonText);
          const res = await importFullSystemDatabase(parsed);
          if (res.success) {
            toast.success('Restore Fèt avèk Siksè!', res.message);
            setImportJsonText('');
            reloadData();
            if (onRefreshAll) onRefreshAll();
          } else {
            toast.error('Erè Restore', res.message);
          }
        } catch (err: any) {
          toast.error('JSON Envalid', err?.message || 'Fichye JSON an pa kòrèk.');
        } finally {
          setIsImporting(false);
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* SUB-NAVIGATION TABS */}
      <div className="p-4 rounded-3xl bg-[#0B1120] border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setSubView('members')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              subView === 'members'
                ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Manm Global ({members.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubView('services')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              subView === 'services'
                ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Kilt & Sèvis ({services.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubView('attendance')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              subView === 'attendance'
                ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Prezans Eskane ({attendance.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubView('doctor')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              subView === 'doctor'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Database Doctor (Oto-Reparasyon)</span>
          </button>

          <button
            type="button"
            onClick={() => setSubView('backup')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              subView === 'backup'
                ? 'bg-blue-500 text-white font-black shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Sovgad & Restore JSON</span>
          </button>
        </div>

        <button
          type="button"
          onClick={reloadData}
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
          title="Rafrechi Done"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* 1. MEMBERS EXPLORER */}
      {subView === 'members' && (
        <div className="p-6 rounded-3xl bg-[#0B1120] border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <h3 className="font-extrabold text-sm text-white">
                Enspektè Manm Global ({filteredMembers.length} afiche)
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={churchFilter}
                onChange={(e) => setChurchFilter(e.target.value)}
                className="py-1.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
              >
                <option value="ALL">★ Tout Legliz</option>
                {allChurches.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id})
                  </option>
                ))}
              </select>

              <div className="relative w-48 sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Chèche non, ID, telefòn..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* Bulk Action Bar for Members */}
          {selectedMemberIds.size > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs">
              <div className="flex items-center gap-2 text-rose-300 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{selectedMemberIds.size} manm seleksyone pou efase</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMemberIds(new Set())}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Anile Seleksyon
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSelectedMembers}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Efase {selectedMemberIds.size} Manm (Kaskad)</span>
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={filteredMembers.length > 0 && selectedMemberIds.size === filteredMembers.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMemberIds(new Set(filteredMembers.map((m) => m.id)));
                        } else {
                          setSelectedMemberIds(new Set());
                        }
                      }}
                      className="rounded border-slate-700 bg-slate-900 text-amber-400 focus:ring-0 cursor-pointer"
                      title="Chwazi tout manm yo"
                    />
                  </th>
                  <th className="py-2.5 px-3">Non Konplè</th>
                  <th className="py-2.5 px-3">Kòd Manm</th>
                  <th className="py-2.5 px-3">Legliz</th>
                  <th className="py-2.5 px-3">Telefòn</th>
                  <th className="py-2.5 px-3">Tit / Sèks</th>
                  <th className="py-2.5 px-3">PIN</th>
                  <th className="py-2.5 px-3 text-right">Aksyon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredMembers.slice(0, 100).map((m) => (
                  <tr key={m.id} className="hover:bg-slate-900/40 text-slate-300 transition-colors">
                    <td className="py-2.5 px-3">
                      <input
                        type="checkbox"
                        checked={selectedMemberIds.has(m.id)}
                        onChange={(e) => {
                          setSelectedMemberIds((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(m.id);
                            else next.delete(m.id);
                            return next;
                          });
                        }}
                        className="rounded border-slate-700 bg-slate-900 text-amber-400 focus:ring-0 cursor-pointer"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-white font-bold">{m.fullName}</td>
                    <td className="py-2.5 px-3 font-mono text-amber-300">{m.memberId}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">{m.churchId}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">{m.phone || '—'}</td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {m.titlePrefix || '—'} ({m.gender === 'male' ? 'M' : m.gender === 'female' ? 'F' : '—'})
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{m.pin || '****'}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteMember(m)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 hover:border-rose-500/40 transition-all cursor-pointer shadow-sm"
                        title={`Efase manm sa a ak tout aktivite li yo: ${m.fullName}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Efase</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredMembers.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-xs">
                Okenn manm pa jwenn nan kritè sa yo.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. SERVICES EXPLORER */}
      {subView === 'services' && (
        <div className="p-6 rounded-3xl bg-[#0B1120] border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <h3 className="font-extrabold text-sm text-white">
                Lis Kilt & Sèvis ({filteredServices.length} sou {services.length})
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={serviceChurchFilter}
                onChange={(e) => setServiceChurchFilter(e.target.value)}
                className="py-1.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-400 cursor-pointer"
              >
                <option value="ALL">★ Tout Legliz</option>
                {allChurches.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id})
                  </option>
                ))}
              </select>

              <div className="relative w-48 sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  placeholder="Chèche kilt, dat, estati..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Tit Sèvis</th>
                  <th className="py-2.5 px-3">Legliz</th>
                  <th className="py-2.5 px-3">Dat</th>
                  <th className="py-2.5 px-3">Orè</th>
                  <th className="py-2.5 px-3">Tolerans Reta</th>
                  <th className="py-2.5 px-3">Estati</th>
                  <th className="py-2.5 px-3 text-right">Aksyon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredServices.slice(0, 100).map((s) => (
                  <tr key={s.id} className="hover:bg-slate-900/40 text-slate-300 transition-colors">
                    <td className="py-2.5 px-3 text-white font-bold">{s.title}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{s.churchId}</td>
                    <td className="py-2.5 px-3 font-mono">{s.date}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{s.startTime} - {s.endTime}</td>
                    <td className="py-2.5 px-3 font-mono text-amber-300">
                      {s.lateThresholdMinutes ? `${s.lateThresholdMinutes} min` : '15 min (def)'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.status === 'completed'
                          ? 'bg-slate-800 text-slate-400'
                          : s.status === 'in_progress'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteService(s)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 hover:border-rose-500/40 transition-all cursor-pointer shadow-sm"
                        title={`Efase kilt / sèvis sa a: ${s.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Efase</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredServices.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-xs">
                Okenn kilt oswa sèvis pa jwenn nan kritè sa yo.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. ATTENDANCE EXPLORER */}
      {subView === 'attendance' && (
        <div className="space-y-4">
          {/* Quick Attendance Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#0B1120] border border-slate-800 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                <span>Total Eskane</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="text-xl font-black text-white font-mono">{totalAttendanceScans}</div>
              <div className="text-[10px] text-slate-500">Tout sèvis konfonn</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0B1120] border border-slate-800 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                <span>QR Code Eskane</span>
                <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl font-black text-emerald-300 font-mono">
                {qrAttendanceScans}{' '}
                <span className="text-xs font-normal text-slate-400">
                  ({totalAttendanceScans > 0 ? Math.round((qrAttendanceScans / totalAttendanceScans) * 100) : 0}%)
                </span>
              </div>
              <div className="text-[10px] text-emerald-400/70">Eskan dirèk nan pòt</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0B1120] border border-slate-800 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                <span>Alè (On Time)</span>
                <Clock className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="text-xl font-black text-blue-300 font-mono">{onTimeAttendanceScans}</div>
              <div className="text-[10px] text-blue-400/70">San tolerans reta</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0B1120] border border-slate-800 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                <span>An Reta (Late)</span>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-xl font-black text-amber-300 font-mono">{lateAttendanceScans}</div>
              <div className="text-[10px] text-amber-400/70">Apre delè sèvis la</div>
            </div>
          </div>

          {/* Table Container */}
          <div className="p-6 rounded-3xl bg-[#0B1120] border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400" />
                  <h3 className="font-extrabold text-sm text-white">
                    Lis Prezans Eskane ({filteredAttendance.length} sou {attendance.length})
                  </h3>
                </div>
                <p className="text-xs text-slate-400">
                  Dosye tout manm ki eskane kat yo nan pòt la oswa ki anrejistre prezans nan nenpòt legliz
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {filteredAttendance.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearFilteredAttendance}
                    className="px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-bold transition-all border border-rose-800/60 flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="Efase tout eskan ki nan lis filtre a nan baz done a"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Vide Lis Filtre ({filteredAttendance.length})</span>
                  </button>
                )}

                <button
                  type="button"
                  id="btn-export-attendance-csv"
                  onClick={handleExportAttendanceCsv}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 text-purple-400" />
                  <span>Ekspòte CSV</span>
                </button>

                <button
                  type="button"
                  onClick={reloadData}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Rafrechi</span>
                </button>
              </div>
            </div>

            {/* Bulk Action Bar for Attendance */}
            {selectedAttendanceIds.size > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs">
                <div className="flex items-center gap-2 text-rose-300 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{selectedAttendanceIds.size} eskan prezans seleksyone pou efase</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAttendanceIds(new Set())}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Anile Seleksyon
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteSelectedAttendance}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Efase {selectedAttendanceIds.size} Eskan Seleksyone</span>
                  </button>
                </div>
              </div>
            )}

            {/* Filter Toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={attendanceSearch}
                  onChange={(e) => setAttendanceSearch(e.target.value)}
                  placeholder="Chèche manm, kòd, sèvis..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs placeholder:text-slate-500 focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <select
                  value={attendanceChurchFilter}
                  onChange={(e) => setAttendanceChurchFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-purple-400 cursor-pointer"
                >
                  <option value="ALL">Tout Legliz ({allChurches.length})</option>
                  {allChurches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code || c.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={attendanceMethodFilter}
                  onChange={(e) => setAttendanceMethodFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-purple-400 cursor-pointer"
                >
                  <option value="ALL">Tout Metòd Chèk-in</option>
                  <option value="qr_scan">QR Code Eskane</option>
                  <option value="barcode">Barcode Eskane</option>
                  <option value="manual">Manyèl</option>
                </select>
              </div>

              <div>
                <select
                  value={attendanceStatusFilter}
                  onChange={(e) => setAttendanceStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-purple-400 cursor-pointer"
                >
                  <option value="ALL">Tout Estati Prezans</option>
                  <option value="on_time">Alè (On Time)</option>
                  <option value="late">An Reta (Late)</option>
                  <option value="excused">Eskize</option>
                </select>
              </div>
            </div>

            {/* Attendance Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3 w-8">
                      <input
                        type="checkbox"
                        checked={filteredAttendance.length > 0 && selectedAttendanceIds.size === filteredAttendance.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAttendanceIds(new Set(filteredAttendance.map((a) => a.id)));
                          } else {
                            setSelectedAttendanceIds(new Set());
                          }
                        }}
                        className="rounded border-slate-700 bg-slate-900 text-purple-400 focus:ring-0 cursor-pointer"
                        title="Chwazi tout eskan afiche"
                      />
                    </th>
                    <th className="py-3 px-3.5">Manm</th>
                    <th className="py-3 px-3">Legliz</th>
                    <th className="py-3 px-3">Sèvis / Kilt</th>
                    <th className="py-3 px-3">Metòd</th>
                    <th className="py-3 px-3">Lè & Dat Eskane</th>
                    <th className="py-3 px-3">Estati</th>
                    <th className="py-3 px-3 text-right">Aksyon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                        Pa gen okenn anrejistreman prezans ki koresponn ak kritè sa yo.
                      </td>
                    </tr>
                  ) : (
                    filteredAttendance.slice(0, 150).map((a) => {
                      const churchObj = allChurches.find((c) => c.id === a.churchId);
                      const recStatus = a.attendanceStatus || (a as any).status || 'on_time';
                      const isOnTime = recStatus === 'on_time' || recStatus === 'present';
                      const isLate = recStatus === 'late';
                      const memberDisplayName = a.memberName || a.memberId;

                      return (
                        <tr key={a.id} className="hover:bg-slate-900/50 text-slate-300 transition-colors">
                          <td className="py-3 px-3">
                            <input
                              type="checkbox"
                              checked={selectedAttendanceIds.has(a.id)}
                              onChange={(e) => {
                                setSelectedAttendanceIds((prev) => {
                                  const next = new Set(prev);
                                  if (e.target.checked) next.add(a.id);
                                  else next.delete(a.id);
                                  return next;
                                });
                              }}
                              className="rounded border-slate-700 bg-slate-900 text-purple-400 focus:ring-0 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-3.5">
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{memberDisplayName}</span>
                            </div>
                            <div className="font-mono text-[10px] text-slate-400">{a.memberId}</div>
                          </td>

                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-200 block truncate max-w-[130px]">
                              {churchObj ? churchObj.name : a.churchId}
                            </span>
                            <span className="font-mono text-[10px] text-slate-500">{a.churchId}</span>
                          </td>

                          <td className="py-3 px-3">
                            <span className="text-slate-200 font-medium block truncate max-w-[150px]">
                              {a.serviceTitle || a.serviceId}
                            </span>
                            {a.serviceDate && (
                              <span className="text-[10px] font-mono text-slate-500">{a.serviceDate}</span>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            {a.checkInMethod === 'qr_scan' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                <QrCode className="w-3 h-3" />
                                <span>QR Eskane</span>
                              </span>
                            ) : a.checkInMethod === 'barcode' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                <span>Barcode</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                <span>Manyèl</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3 font-mono text-slate-300 whitespace-nowrap">
                            <div className="text-xs text-slate-200">{formatSafeScanTime(a.timestamp)}</div>
                            {a.recordedBy && (
                              <div className="text-[10px] text-slate-500">Par: {a.recordedBy}</div>
                            )}
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                isOnTime
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : isLate
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {isOnTime ? 'ALÈ' : isLate ? `RETA (${a.lateMinutes || 0}m)` : String(recStatus).toUpperCase()}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleDeleteAttendance(a.id, memberDisplayName)}
                              title={`Efase eskan sa a pou ${memberDisplayName}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 hover:border-rose-500/40 transition-all cursor-pointer shadow-sm"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Efase</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {filteredAttendance.length > 150 && (
              <div className="text-center text-xs text-slate-500 pt-1">
                Afiche 150 premye sou {filteredAttendance.length} anrejistreman. Sèvi ak filtè yo oswa bouton Ekspòte CSV pou wè tout.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. DATABASE DOCTOR */}
      {subView === 'doctor' && (
        <div className="p-6 rounded-3xl bg-[#0B1120] border border-slate-800 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-base text-white">
                  Database Doctor & Oto-Reparasyon Sistèm nan
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Eskane baz done a pou repare otomatikman manm òfelen, kòd ki manke, PIN legliz ki poko chifre an SHA-256, ak dosye ki nan lis Tombstone yo
              </p>
            </div>

            <button
              type="button"
              onClick={handleRunDoctor}
              disabled={isDoctorRunning}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer active:scale-95 transition-all"
            >
              <Wrench className={`w-4 h-4 ${isDoctorRunning ? 'animate-spin' : ''}`} />
              <span>{isDoctorRunning ? 'Ap Fè Enspeksyon...' : 'Kòmanse Enspeksyon & Reparasyon'}</span>
            </button>
          </div>

          {doctorReport ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Total Manm Eskane:</div>
                  <div className="text-lg font-black text-white font-mono mt-1">{doctorReport.totalMembers}</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Total Kilt Eskane:</div>
                  <div className="text-lg font-black text-white font-mono mt-1">{doctorReport.totalServices}</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">PIN Admin SHA-256:</div>
                  <div className="text-lg font-black text-amber-400 font-mono mt-1">
                    {doctorReport.hashedChurchesCount ?? doctorReport.totalChurches}/{doctorReport.totalChurches}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Tombstones Aktif:</div>
                  <div className="text-lg font-black text-blue-400 font-mono mt-1">
                    {doctorReport.tombstonesProtectedCount ?? 0}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Erè Detekte:</div>
                  <div className="text-lg font-black text-amber-400 font-mono mt-1">{doctorReport.issuesDetected.length}</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Reparasyon Aplike:</div>
                  <div className="text-lg font-black text-emerald-400 font-mono mt-1">{doctorReport.repairsApplied.length}</div>
                </div>
              </div>

              {doctorReport.issuesDetected.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-xs space-y-2">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Pwoblèm ki te detekte:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                    {doctorReport.issuesDetected.map((iss, i) => (
                      <li key={i}>{iss}</li>
                    ))}
                  </ul>
                </div>
              )}

              {doctorReport.repairsApplied.length > 0 && (
                <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-xs space-y-2">
                  <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <Check className="w-4 h-4" />
                    <span>Reparasyon ki fèt:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                    {doctorReport.repairsApplied.map((rep, i) => (
                      <li key={i}>{rep}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl bg-slate-950 border border-slate-800/80 text-slate-400 space-y-2">
              <Wrench className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <div className="font-bold text-sm text-white">Zouti Reparasyon Otomatik</div>
              <p className="text-xs max-w-md mx-auto">
                Klike sou bouton anwo a pou kòmanse verifikasyon entegrite a. Database Doctor ap eskane epi repare tout done ki bezwen koreksyon.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 5. BACKUP & RESTORE */}
      {subView === 'backup' && (
        <div className="space-y-6">
          {/* Export Box */}
          <div className="p-6 rounded-3xl bg-[#0B1120] border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Download className="w-4 h-4 text-amber-400" />
                <h3 className="font-extrabold text-sm text-white">
                  Ekspòte Sovgad Konplè (JSON Export)
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Jenere yon kopi konplè tout platfòm nan (legliz, manm, kilt, prezans, paramèt) nan yon sèl fichye sekirize
              </p>
            </div>

            <button
              type="button"
              onClick={handleExportFullBackup}
              className="px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-400/20 cursor-pointer active:scale-95 transition-all shrink-0"
            >
              <Download className="w-4 h-4 fill-current" />
              <span>Telechaje Sovgad (.json)</span>
            </button>
          </div>

          {/* Import / Restore Box */}
          <div className="p-6 rounded-3xl bg-[#0B1120] border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Upload className="w-4 h-4 text-blue-400" />
              <div>
                <h3 className="font-extrabold text-sm text-white">
                  Restore Baz Done nan Fichye Sovgad (JSON Restore)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Chwazi yon fichye JSON sovgad oswa kole kontni an dirèkteman anba a
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Chwazi fichye JSON nan aparèy ou an:
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-amber-400 hover:file:bg-slate-700 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Oswa kole kontni JSON an isit la:
                </label>
                <textarea
                  rows={4}
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder='{"version":"2.6","churches":[...],"members":[...]}'
                  className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-white font-mono text-[11px] focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleExecuteRestore}
                  disabled={isImporting || !importJsonText.trim()}
                  className="px-5 py-3 rounded-2xl bg-blue-500 hover:bg-blue-400 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isImporting ? 'Ap Restore...' : 'Egzekite Restore Baz Done'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL REUSABLE IN-APP CONFIRMATION MODAL */}
      <ConfirmDeleteModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        itemName={confirmModal.itemName}
        confirmButtonText={confirmModal.confirmButtonText}
        cancelButtonText={confirmModal.cancelButtonText}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* SERVICE DELETION MODAL WITH ATTENDANCE WIPE OPTION */}
      {serviceDeleteModal.isOpen && serviceDeleteModal.service && (
        <div
          id="modal-confirm-delete-service"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setServiceDeleteModal({ isOpen: false, service: null, deleteAttendance: true })}
        >
          <div
            className="relative w-full max-w-md bg-[#1E293B] border border-rose-500/30 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white tracking-tight">
                  Efase Kilt / Sèvis
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Èske w sèten ou vle efase sèvis sa a nan baz done lokal la ak Cloud Firestore?
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/20 text-xs font-semibold text-rose-200 space-y-1">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="font-bold text-white truncate">
                  {serviceDeleteModal.service.title || serviceDeleteModal.service.id}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 pl-6">
                Dat: {serviceDeleteModal.service.date || '—'} | Legliz: {serviceDeleteModal.service.churchId}
              </div>
            </div>

            <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-700/60 cursor-pointer hover:bg-slate-800/80 transition-colors">
              <input
                type="checkbox"
                checked={serviceDeleteModal.deleteAttendance}
                onChange={(e) =>
                  setServiceDeleteModal((prev) => ({
                    ...prev,
                    deleteAttendance: e.target.checked,
                  }))
                }
                className="w-4 h-4 rounded text-rose-500 focus:ring-rose-400 bg-slate-950 border-slate-600 cursor-pointer"
              />
              <span className="text-xs text-slate-200 font-medium">
                Efase tout eskan prezans ki te fèt espesyalman pou sèvis sa a tou
              </span>
            </label>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                id="btn-cancel-service-delete"
                onClick={() => setServiceDeleteModal({ isOpen: false, service: null, deleteAttendance: true })}
                className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
              >
                Anile
              </button>
              <button
                type="button"
                id="btn-confirm-service-delete"
                onClick={confirmDeleteServiceAction}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Wi, Efase Sèvis la</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
