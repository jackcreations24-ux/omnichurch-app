import React, { useMemo, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Clock,
  Lock,
  QrCode,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import {
  AttendanceRecord,
  Church,
  Language,
  Member,
  ServiceSession,
} from '../../types';
import { SERVICE_CATEGORIES } from '../../utils/i18n';
import { isServiceEnded } from '../../utils/storage';
import {
  getMemberPermissions,
  isServiceCurrentlyActive,
  isVisitorAttendanceRecord,
  isVisitorMember,
} from '../../utils/permissions';
import { recordAttendanceScanUnified } from '../../utils/qrSyncLayer';
import { useToast } from '../../context/ToastContext';

interface ReceptionDeskPanelProps {
  church: Church;
  currentMember: Member;
  members: Member[];
  services: ServiceSession[];
  attendanceRecords: AttendanceRecord[];
  language?: Language;
  onOpenScanner: () => void;
  onAttendanceUpdated: () => void;
}

export const ReceptionDeskPanel: React.FC<ReceptionDeskPanelProps> = ({
  church,
  currentMember,
  members,
  services,
  attendanceRecords,
  language = 'ht',
  onOpenScanner,
  onAttendanceUpdated,
}) => {
  const toast = useToast();
  const isEs = language === 'es';
  const isEn = language === 'en';
  const isFr = language === 'fr';

  const permissions = getMemberPermissions(currentMember);

  const [manualMemberCode, setManualMemberCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'checked_in'>('all');
  const [isSubmittingId, setIsSubmittingId] = useState<string | null>(null);
  const [selectedActiveServiceId, setSelectedActiveServiceId] = useState<string>('');

  // Strictly filter to services that are OPEN for attendance AND NOT ended
  const activeOngoingServices = useMemo(() => {
    return services.filter((s) => isServiceCurrentlyActive(s, isServiceEnded));
  }, [services]);

  const activeService = useMemo(() => {
    if (activeOngoingServices.length === 0) return undefined;
    if (selectedActiveServiceId) {
      const found = activeOngoingServices.find((s) => s.id === selectedActiveServiceId);
      if (found) return found;
    }
    return activeOngoingServices[0];
  }, [activeOngoingServices, selectedActiveServiceId]);

  const activeMembers = useMemo(() => {
    return members.filter((m) => m.status !== 'inactive' && !isVisitorMember(m));
  }, [members]);

  // Attendance records strictly belonging to the active service in progress
  const activeServiceAttendance = useMemo(() => {
    if (!activeService) return [];
    return attendanceRecords
      .filter((a) => a.churchId === church.id && a.serviceId === activeService.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [attendanceRecords, church.id, activeService]);

  const visitorAttendances = useMemo(() => {
    return activeServiceAttendance.filter((a) => isVisitorAttendanceRecord(a, church.id));
  }, [activeServiceAttendance, church.id]);

  const attendanceByMemberMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    activeServiceAttendance.forEach((rec) => {
      if (rec.memberId) map.set(rec.memberId.toUpperCase(), rec);
      if (rec.memberDbId) map.set(rec.memberDbId, rec);
    });
    return map;
  }, [activeServiceAttendance]);

  const stats = useMemo(() => {
    const total = activeMembers.length;
    const checkedInRegular = activeMembers.filter(
      (m) =>
        (m.memberId && attendanceByMemberMap.has(m.memberId.toUpperCase())) ||
        attendanceByMemberMap.has(m.id)
    ).length;
    const onTimeCount = activeServiceAttendance.filter((a) => a.attendanceStatus !== 'late').length;
    const lateCount = activeServiceAttendance.filter((a) => a.attendanceStatus === 'late').length;
    const pendingCount = Math.max(0, total - checkedInRegular);
    return {
      total,
      checkedInCount: checkedInRegular,
      visitorCount: visitorAttendances.length,
      onTimeCount,
      lateCount,
      pendingCount,
    };
  }, [activeMembers, attendanceByMemberMap, activeServiceAttendance, visitorAttendances.length]);

  const filteredRoster = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activeMembers
      .map((m) => {
        const record =
          attendanceByMemberMap.get((m.memberId || '').toUpperCase()) ||
          attendanceByMemberMap.get(m.id);
        return { member: m, record };
      })
      .filter(({ member, record }) => {
        if (statusFilter === 'pending' && record) return false;
        if (statusFilter === 'checked_in' && !record) return false;
        if (!q) return true;
        return (
          (member.fullName || '').toLowerCase().includes(q) ||
          (member.memberId || '').toLowerCase().includes(q) ||
          (member.department || '').toLowerCase().includes(q)
        );
      });
  }, [activeMembers, attendanceByMemberMap, searchQuery, statusFilter]);

  if (!permissions.isReception) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900 border border-rose-500/30 text-center space-y-2">
        <Lock className="w-8 h-8 text-rose-400 mx-auto" />
        <h3 className="text-sm font-bold text-white">
          {isEs
            ? 'Acceso Restringido al Rol de Recepción'
            : isEn
            ? 'Reception Role Required'
            : isFr
            ? 'Accès Réservé au Rôle Réception'
            : 'Aksè Rezève pou Wòl Resepsyon'}
        </h3>
      </div>
    );
  }

  const handleManualCheckIn = async (codeToSubmit: string, method: 'manual' | 'qr_scan' = 'manual') => {
    const cleanCode = codeToSubmit.trim();
    if (!cleanCode || !activeService) return;

    setIsSubmittingId(cleanCode);
    try {
      const res = await recordAttendanceScanUnified({
        currentChurchId: church.id,
        rawCode: cleanCode,
        serviceId: activeService.id,
        method,
        recordedBy: `Resepsyon: ${currentMember.fullName}`,
        requireActiveOngoingService: true,
      });

      if (res.success && res.record) {
        onAttendanceUpdated();
        if (method === 'manual') {
          setManualMemberCode('');
        }
        toast.success(
          res.isVisitor
            ? isEs
              ? 'Visitante Registrado'
              : isEn
              ? 'Visitor Checked In'
              : isFr
              ? 'Visiteur Enregistré'
              : 'Prezans Vizitè Anrejistre'
            : isEs
            ? 'Asistencia Registrada'
            : isEn
            ? 'Attendance Recorded'
            : isFr
            ? 'Présence Enregistrée'
            : 'Prezans Anrejistre',
          `${res.member?.fullName || cleanCode}${res.homeChurchName ? ` • Vizitè (${res.homeChurchName})` : ''} • ${activeService.title}`
        );
      } else if (res.duplicate) {
        toast.warning(
          isEs
            ? 'Ya Registrado'
            : isEn
            ? 'Already Checked In'
            : isFr
            ? 'Déjà Pointé'
            : 'Deja Anrejistre',
          res.errorMessage || ''
        );
      } else {
        toast.error(
          isEs
            ? 'No se pudo registrar'
            : isEn
            ? 'Check-in Denied'
            : isFr
            ? 'Pointage Refusé'
            : 'Prezans Refize',
          res.errorMessage || ''
        );
      }
    } finally {
      setIsSubmittingId(null);
    }
  };

  const categoryConfig = activeService ? SERVICE_CATEGORIES[activeService.category] : null;

  return (
    <div className="space-y-6 pb-10">
      {/* RECEPTION ROLE HEADER & STRICT READ-ONLY GUARD NOTICE */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-[#162238] to-slate-900 border border-slate-700/80 p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-400/30 text-rose-300 text-xs font-extrabold">
              <UserCheck className="w-3.5 h-3.5" />
              <span>
                {isEs
                  ? 'Puesto de Recepción'
                  : isEn
                  ? 'Reception Desk'
                  : isFr
                  ? 'Poste de Réception'
                  : 'Espas Resepsyon & Akèy'}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-semibold">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>
                {isEs
                  ? 'Solo Lectura (Sin Edición / Borrado)'
                  : isEn
                  ? 'Read-Only Roster (No Edit/Delete)'
                  : isFr
                  ? 'Lecture Seule (Sans Édition / Suppression)'
                  : 'Lektè Sèlman (Pa ka Modifye / Efase)'}
              </span>
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white">
            {isEs
              ? 'Escaneo y Recepción de Asistencia'
              : isEn
              ? 'Attendance Scanning & Member Welcome'
              : isFr
              ? 'Scan de Présence & Accueil'
              : 'Eskanè Prezans & Akèy Manm yo'}
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            {isEs
              ? 'Escanee códigos QR y confirme la llegada de los miembros para el servicio en curso. Los datos personales, roles y configuraciones permanecen protegidos.'
              : isEn
              ? 'Scan member QR badges and check in arrivals for the active service in progress. Member profiles, roles, and deletions are locked.'
              : isFr
              ? 'Scannez les badges QR et validez les arrivées pour le culte en cours. Les fiches membres, rôles et suppressions restent verrouillés.'
              : 'Eskane kòd QR kat manm yo epi make prezans pou sèvis ki an kou a. Done manm yo, wòl yo ak sipresyon rete pwoteje.'}
          </p>
        </div>

        <button
          type="button"
          id="btn-reception-open-qr-scanner"
          disabled={!activeService}
          onClick={onOpenScanner}
          className="px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 transition-all cursor-pointer disabled:cursor-not-allowed shrink-0"
        >
          <Camera className="w-4 h-4" />
          <span>
            {isEs
              ? 'Abrir Escáner QR'
              : isEn
              ? 'Open QR Scanner'
              : isFr
              ? 'Ouvrir Scanner QR'
              : 'Ouvri Eskanè QR'}
          </span>
        </button>
      </div>

      {/* NO ACTIVE ONGOING SERVICE STATE */}
      {!activeService ? (
        <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 text-center space-y-3 shadow-inner">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/90 border border-slate-700 flex items-center justify-center mx-auto text-amber-400">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="text-base font-extrabold text-white">
            {isEs
              ? 'No hay ningún servicio activo en curso'
              : isEn
              ? 'No Active Service in Progress'
              : isFr
              ? 'Aucun service actif en cours'
              : 'Pa gen okenn sèvis ki an kou kounye a'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            {isEs
              ? 'La función de escaneo de recepción se habilita automáticamente cuando la administración abre un servicio activo. Los servicios pasados o cerrados no están disponibles para escaneo.'
              : isEn
              ? 'Reception scanning is available only while Administration has an open service in progress. Past or closed services are locked.'
              : isFr
              ? 'Le scan de réception s’active automatiquement dès que l’administration ouvre un culte en cours. Les cultes terminés restent verrouillés.'
              : 'Fonksyon eskanè resepsyon an ouvri sèlman lè administrasyon an louvri yon sèvis ki an kou. Sèvis ki fini yo fèmen.'}
          </p>
        </div>
      ) : (
        <>
          {/* ACTIVE SERVICE BANNER + STATS */}
          <div className="rounded-3xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/40 p-5 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <span className="flex h-3.5 w-3.5 relative mt-1.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500" />
                </span>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">
                      {isEs
                        ? 'Servicio Activo en Curso'
                        : isEn
                        ? 'Active Service in Progress'
                        : isFr
                        ? 'Culte Actif en Cours'
                        : 'Sèvis ki an Kou Kounye a'}
                    </span>
                    {categoryConfig && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-300">
                        {categoryConfig.name[language] || categoryConfig.name.ht}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-black text-white">{activeService.title}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      {activeService.date}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      {activeService.startTime} - {activeService.endTime}
                    </span>
                    {activeService.preacherOrLeader && (
                      <span className="text-slate-400">
                        • {activeService.preacherOrLeader}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {activeOngoingServices.length > 1 && (
                <div className="shrink-0">
                  <select
                    aria-label="Active Service Selector"
                    value={activeService.id}
                    onChange={(e) => setSelectedActiveServiceId(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    {activeOngoingServices.map((srv) => (
                      <option key={srv.id} value={srv.id}>
                        🟢 {srv.title} ({srv.startTime})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* 4 LIVE RECEPTION METRICS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="text-[11px] font-semibold text-slate-400">
                  {isEs ? 'Presentes Hoy' : isEn ? 'Checked In' : isFr ? 'Présents' : 'Prezan Kounye a'}
                </div>
                <div className="text-xl font-black text-emerald-400 mt-0.5">
                  {stats.checkedInCount}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="text-[11px] font-semibold text-slate-400">
                  {isEs ? 'A Tiempo' : isEn ? 'On Time' : isFr ? 'À l’Heure' : 'Alè'}
                </div>
                <div className="text-xl font-black text-sky-400 mt-0.5">
                  {stats.onTimeCount}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="text-[11px] font-semibold text-slate-400">
                  {isEs ? 'Tarde' : isEn ? 'Late' : isFr ? 'En Retard' : 'An Reta'}
                </div>
                <div className="text-xl font-black text-amber-400 mt-0.5">
                  {stats.lateCount}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="text-[11px] font-semibold text-slate-400">
                  {isEs ? 'Por Llegar' : isEn ? 'Awaiting Check-In' : isFr ? 'En Attente' : 'Poko Eskane'}
                </div>
                <div className="text-xl font-black text-slate-200 mt-0.5">
                  {stats.pendingCount}
                </div>
              </div>
            </div>
          </div>

          {/* MANUAL CHECK-IN BAR */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-lg">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-extrabold text-white">
                <QrCode className="w-4 h-4 text-amber-400" />
                <span>
                  {isEs
                    ? 'Registro Rápido por Código o ID de Miembro'
                    : isEn
                    ? 'Quick Check-In by Member ID or QR Token'
                    : isFr
                    ? 'Pointage Rapide par ID Membre ou Code QR'
                    : 'Make Prezans Rapid pa Member ID oswa Kòd'}
                </span>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleManualCheckIn(manualMemberCode, 'manual');
              }}
              className="flex flex-col sm:flex-row gap-2.5"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  id="input-reception-manual-id"
                  value={manualMemberCode}
                  onChange={(e) => setManualMemberCode(e.target.value)}
                  placeholder={
                    isEs
                      ? 'Ej: CH001-JD4827 o nombre del miembro...'
                      : isEn
                      ? 'e.g. CH001-JD4827 or member full name...'
                      : isFr
                      ? 'Ex : CH001-JD4827 ou nom du membre...'
                      : 'Eg: CH001-JD4827 oswa non manm nan...'
                  }
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <button
                type="submit"
                id="btn-reception-manual-checkin"
                disabled={!manualMemberCode.trim() || isSubmittingId !== null}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs transition-colors cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isEs
                    ? 'Confirmar Asistencia'
                    : isEn
                    ? 'Check In'
                    : isFr
                    ? 'Valider Présence'
                    : 'Make Prezan'}
                </span>
              </button>
            </form>
          </div>

          {/* READ-ONLY RECEPTION ROSTER FOR THE ACTIVE SERVICE */}
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-4 sm:p-5 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>
                    {isEs
                      ? 'Lista de Recepción (Solo Lectura — Servicio Activo)'
                      : isEn
                      ? 'Active Service Reception Roster (Read-Only)'
                      : isFr
                      ? 'Liste d’Accueil du Culte Actif (Lecture Seule)'
                      : 'Lis Akèy Sèvis Aktif la (Lektè Sèlman)'}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isEs
                    ? 'Consulte los asistentes o marque su llegada sin acceso a modificar fichas ni roles.'
                    : isEn
                    ? 'Verify arrivals and mark members present without modifying member data or roles.'
                    : isFr
                    ? 'Vérifiez les arrivées sans pouvoir modifier ni supprimer les fiches ou rôles.'
                    : 'Verifye rive manm yo san dwa pou modifye oswa siprime fich yo ni chanje wòl.'}
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
                {(
                  [
                    { id: 'all', label: isEs ? 'Todos' : isEn ? 'All' : isFr ? 'Tous' : 'Tout' },
                    { id: 'pending', label: isEs ? 'Por Llegar' : isEn ? 'Pending' : isFr ? 'En Attente' : 'Poko Rive' },
                    { id: 'checked_in', label: isEs ? 'Presentes' : isEn ? 'Present' : isFr ? 'Présents' : 'Prezan' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setStatusFilter(f.id)}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      statusFilter === f.id
                        ? 'bg-amber-400 text-slate-950 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isEs
                    ? 'Buscar miembro por nombre, ID o departamento...'
                    : isEn
                    ? 'Search member by name, ID, or department...'
                    : isFr
                    ? 'Rechercher par nom, ID ou département...'
                    : 'Chèche manm pa non, ID oswa depatman...'
                }
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>

            <div className="divide-y divide-slate-800/80 max-h-[420px] overflow-y-auto pr-1">
              {filteredRoster.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  {isEs
                    ? 'No se encontraron miembros con este filtro.'
                    : isEn
                    ? 'No members match this filter.'
                    : isFr
                    ? 'Aucun membre trouvé pour ce filtre.'
                    : 'Okenn manm pa koresponn ak rechèch sa a.'}
                </div>
              ) : (
                filteredRoster.map(({ member, record }) => {
                  const initials = (member.fullName || 'M')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                  const photoSrc = member.avatarUrl || member.photoUrl || member.googlePhoto;
                  const isBusy = isSubmittingId === member.memberId;

                  return (
                    <div
                      key={member.id}
                      className="py-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center text-xs font-bold text-amber-300 shrink-0">
                          {photoSrc ? (
                            <img
                              src={photoSrc}
                              alt={member.fullName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            initials
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-bold text-white truncate">
                            {member.titlePrefix ? `${member.titlePrefix} ` : ''}
                            {member.fullName}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                            <span className="font-mono text-amber-300">{member.memberId}</span>
                            {member.department && <span>• {member.department}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {record ? (
                          <div className="text-right">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                record.attendanceStatus === 'late'
                                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              }`}
                            >
                              <ShieldCheck className="w-3 h-3" />
                              <span>
                                {record.attendanceStatus === 'late'
                                  ? isEs
                                    ? 'Tarde'
                                    : isEn
                                    ? 'Late'
                                    : isFr
                                    ? 'Retard'
                                    : 'An Reta'
                                  : isEs
                                  ? 'A Tiempo'
                                  : isEn
                                  ? 'On Time'
                                  : isFr
                                  ? 'À l’Heure'
                                  : 'Alè'}
                              </span>
                            </span>
                            <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                              {new Date(record.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={isBusy || isSubmittingId !== null}
                            onClick={() => handleManualCheckIn(member.memberId, 'manual')}
                            className="px-3 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400 text-amber-300 hover:text-slate-950 border border-amber-400/30 text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isBusy
                              ? '...'
                              : isEs
                              ? 'Marcar Presente'
                              : isEn
                              ? 'Mark Present'
                              : isFr
                              ? 'Pointer'
                              : 'Make Prezan'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {visitorAttendances.length > 0 && (
              <div className="pt-4 border-t border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>
                      {isEs
                        ? `Visitantes Presentes (${visitorAttendances.length})`
                        : isEn
                        ? `Checked-in Visitors (${visitorAttendances.length})`
                        : isFr
                        ? `Visiteurs Présents (${visitorAttendances.length})`
                        : `Vizitè Prezan nan Sèvis la (${visitorAttendances.length})`}
                    </span>
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {visitorAttendances.map((v) => (
                    <div
                      key={v.id}
                      className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                          <span>{v.memberName}</span>
                          <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[9px] font-black uppercase">
                            {isEs ? 'Visitante' : isEn ? 'Visitor' : isFr ? 'Visiteur' : 'Vizitè'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          <span className="font-mono text-amber-300">{v.memberId}</span>
                          {v.homeChurchName ? ` • ${v.homeChurchName}` : ''}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-sky-300 shrink-0">
                        {new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
export default ReceptionDeskPanel;
