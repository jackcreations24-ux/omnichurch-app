import React, { useState, useMemo } from 'react';
import { Church, ServiceSession, Language, Member } from '../../types';
import {
  getServicesByChurch,
  getServiceHistoryStats,
  toggleExcuseAbsence,
  syncAllEndedServices,
  isServiceEnded,
  ServiceHistoryMemberStat,
} from '../../utils/storage';
import { SERVICE_CATEGORIES, TRANSLATIONS } from '../../utils/i18n';
import { useToast } from '../../context/ToastContext';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Search,
  Printer,
  Users,
  Timer,
  ShieldCheck,
  FileText,
  ChevronRight,
  RefreshCw,
  BarChart3,
  UserCheck,
  UserX,
  Sparkles,
  BookOpen,
  ArrowUpDown,
} from 'lucide-react';

interface AdminServiceHistoryProps {
  church: Church;
  services?: ServiceSession[];
  members?: Member[];
  language?: Language;
  initialServiceId?: string;
  onNavigateTab?: (tab: string) => void;
  onBackToServices?: () => void;
  onOpenScanner?: () => void;
}

export const AdminServiceHistory: React.FC<AdminServiceHistoryProps> = ({
  church,
  services,
  members,
  language = 'ht',
  initialServiceId,
  onNavigateTab,
  onBackToServices,
  onOpenScanner,
}) => {
  const toast = useToast();
  const t = TRANSLATIONS[language] || TRANSLATIONS.ht;
  const isEs = language === 'es';
  const isEn = language === 'en';
  const isFr = language === 'fr';

  // Ensure all ended services are synced and locked
  const [syncKey, setSyncKey] = useState<number>(0);
  const [isRefreshingStats, setIsRefreshingStats] = useState<boolean>(false);

  const handleRefreshStats = () => {
    setIsRefreshingStats(true);
    syncAllEndedServices(church.id);
    setSyncKey((prev) => prev + 1);
    setTimeout(() => {
      setIsRefreshingStats(false);
      toast.success(
        isEs ? 'Estadísticas Actualizadas' : isEn ? 'Stats Refreshed' : isFr ? 'Statistiques Actualisées' : 'Estatistik Rafrechi',
        isEs
          ? 'El historial de cultos y el control de asistencias han sido actualizados.'
          : isEn
          ? 'Service history and attendance stats have been refreshed.'
          : isFr
          ? 'L’historique des cultes et les présences ont été actualisés.'
          : 'Istwa sèvis yo ak rapò prezans yo mete ajou.'
      );
    }, 450);
  };

  // Load all church services and filter ended ones
  const allServices = useMemo(() => {
    // Run sync
    syncAllEndedServices(church.id);
    return getServicesByChurch(church.id);
  }, [church.id, syncKey]);

  // Ended / Archived services (sorted with most recent date first)
  const endedServices = useMemo(() => {
    return allServices
      .filter((s) => isServiceEnded(s) || s.isPermanentlyEnded)
      .sort((a, b) => {
        const dateA = `${a.date || ''}T${a.startTime || '00:00'}`;
        const dateB = `${b.date || ''}T${b.startTime || '00:00'}`;
        return dateB.localeCompare(dateA);
      });
  }, [allServices]);

  // Selected service ID for detailed stats
  const [selectedServiceId, setSelectedServiceId] = useState<string>(() => {
    if (initialServiceId && endedServices.some((s) => s.id === initialServiceId)) {
      return initialServiceId;
    }
    return endedServices.length > 0 ? endedServices[0].id : '';
  });

  // Category filter for the list of ended services
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchServiceQuery, setSearchServiceQuery] = useState<string>('');

  // Filtering ended services list
  const filteredEndedServices = useMemo(() => {
    return endedServices.filter((s) => {
      if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
      if (searchServiceQuery.trim()) {
        const q = (searchServiceQuery || '').toLowerCase();
        const matchTitle = (s.title || '').toLowerCase().includes(q);
        const matchLeader = (s.leader || s.preacherOrLeader || '').toLowerCase().includes(q);
        const matchPreacher = (s.preacher || '').toLowerCase().includes(q);
        const matchDate = (s.date || '').includes(q);
        return matchTitle || matchLeader || matchPreacher || matchDate;
      }
      return true;
    });
  }, [endedServices, categoryFilter, searchServiceQuery]);

  // Active selected service
  const activeService = useMemo(() => {
    return endedServices.find((s) => s.id === selectedServiceId) || null;
  }, [endedServices, selectedServiceId]);

  // Detailed statistics for the active service
  const stats = useMemo(() => {
    if (!activeService) return null;
    return getServiceHistoryStats(church.id, activeService.id);
  }, [church.id, activeService, syncKey]);

  // Member roll filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'on_time' | 'late' | 'absent' | 'excused'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [searchMemberQuery, setSearchMemberQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'name_asc' | 'status' | 'time'>('name_asc');

  // Excuse modal / prompt state
  const [excuseTarget, setExcuseTarget] = useState<ServiceHistoryMemberStat | null>(null);
  const [excuseReasonInput, setExcuseReasonInput] = useState<string>('');

  // List of departments for filtering
  const departments = useMemo(() => {
    if (!stats) return [];
    const depts = new Set<string>();
    stats.membersList.forEach((m) => {
      if (m.department && m.department.trim()) {
        depts.add(m.department.trim());
      }
    });
    return Array.from(depts);
  }, [stats]);

  // Filtered members roll
  const filteredMembers = useMemo(() => {
    if (!stats) return [];
    return stats.membersList.filter((m) => {
      // Status filter
      if (statusFilter === 'present' && m.status !== 'on_time' && m.status !== 'late') return false;
      if (statusFilter === 'on_time' && m.status !== 'on_time') return false;
      if (statusFilter === 'late' && m.status !== 'late') return false;
      if (statusFilter === 'absent' && m.status !== 'absent') return false;
      if (statusFilter === 'excused' && m.status !== 'excused') return false;

      // Department filter
      if (departmentFilter !== 'all' && m.department !== departmentFilter) return false;

      // Search query
      if (searchMemberQuery.trim()) {
        const q = (searchMemberQuery || '').toLowerCase();
        const matchName = (m.fullName || '').toLowerCase().includes(q);
        const matchId = (m.memberId || '').toLowerCase().includes(q);
        const matchPhone = (m.phone || '').includes(q);
        return matchName || matchId || matchPhone;
      }
      return true;
    }).sort((a, b) => {
      if (sortOrder === 'status') {
        const orderWeight: Record<string, number> = { on_time: 1, late: 2, excused: 3, absent: 4 };
        return (orderWeight[a.status] || 9) - (orderWeight[b.status] || 9);
      }
      if (sortOrder === 'time') {
        return (b.checkInTime || '').localeCompare(a.checkInTime || '');
      }
      return a.fullName.localeCompare(b.fullName);
    });
  }, [stats, statusFilter, departmentFilter, searchMemberQuery, sortOrder]);

  // Handle Excuse toggle
  const handleOpenExcuseModal = (memberStat: ServiceHistoryMemberStat) => {
    setExcuseTarget(memberStat);
    setExcuseReasonInput(memberStat.excuseReason || '');
  };

  const handleSaveExcuse = () => {
    if (!excuseTarget || !activeService) return;
    const absenceId = `abs-${activeService.id}-${excuseTarget.memberDbId}`;
    toggleExcuseAbsence(church.id, absenceId, excuseReasonInput.trim() || 'Eskize pa administrasyon legliz');
    toast.success(
      isEs ? 'Estado Actualizado' : isEn ? 'Status Updated' : isFr ? 'Statut Mis à Jour' : 'Estati Mizajou',
      isEs
        ? `Se ha modificado la justificación para ${excuseTarget.fullName}.`
        : isEn
        ? `Absence justification updated for ${excuseTarget.fullName}.`
        : isFr
        ? `Justification mise à jour pour ${excuseTarget.fullName}.`
        : `Eskiz / rezon absans la mete ajou pou ${excuseTarget.fullName}.`
    );
    setExcuseTarget(null);
    setSyncKey((prev) => prev + 1);
  };

  // Handle Print / Export
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/50 rounded-2xl border border-slate-800 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold text-xs uppercase tracking-wider border border-amber-400/30">
              {t.navServiceHistory || 'Istwa Sèvis'}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              ({endedServices.length} {isEs ? 'cultos finalizados' : isEn ? 'completed services' : isFr ? 'services terminés' : 'kilt fini anrejistre'})
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-amber-400" />
            <span>{t.serviceHistoryTitle || 'Istwa Sèvis & Rapò Kilt'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            {t.serviceHistorySubtitle || 'Gade kilt ki fin pase yo ak estatistik konplè: moun ki te prezan, an reta, ak absan.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            id="btn-refresh-service-history-stats"
            onClick={handleRefreshStats}
            disabled={isRefreshingStats}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            title={isEs ? 'Refrescar Estadísticas' : isEn ? 'Refresh Stats' : isFr ? 'Rafraîchir' : 'Rafrechi Estatistik'}
          >
            <RefreshCw className={`w-4 h-4 text-amber-400 ${isRefreshingStats ? 'animate-spin' : ''}`} />
          </button>

          {activeService && (
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>{t.servicePrintReport || 'Enprime Rapò'}</span>
            </button>
          )}

          {(onNavigateTab || onBackToServices) && (
            <button
              type="button"
              onClick={() => (onBackToServices ? onBackToServices() : onNavigateTab?.('services'))}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-colors cursor-pointer shadow-md"
            >
              <Calendar className="w-4 h-4" />
              <span>{isEs ? 'Ver Servicios' : isEn ? 'View Services' : isFr ? 'Voir Services' : 'Sèvis Kounye a'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Layout */}
      {endedServices.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/60 rounded-2xl border border-slate-800 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
            <Clock className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-white">
              {isEs ? 'Aún no hay servicios finalizados' : isEn ? 'No completed services yet' : isFr ? 'Aucun culte terminé pour le moment' : 'Poko gen sèvis ki fin pase'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              {isEs
                ? 'Cuando un culto finalice según su hora programada o sea cerrado por la administración, quedará archivado aquí permanentemente con sus estadísticas completas de asistencia.'
                : isEn
                ? 'When a service reaches its scheduled end time or is manually closed by church administration, it will be permanently archived here with full attendance, lateness, and absence statistics.'
                : isFr
                ? 'Lorsqu’un culte arrive à son heure de fin prévue ou est clôturé par l’administration, il sera définitivement archivé ici avec toutes ses statistiques de présence.'
                : 'Chak sèvis gen yon period tan kòmanse ak fini. Lè lè fini an pase oswa administrasyon an klotire li, li pap kapab reouvri ankò epi l ap parèt isit la ak tout estatistik moun ki te prezan, an reta, ak absan.'}
            </p>
          </div>
          {(onNavigateTab || onBackToServices) && (
            <button
              type="button"
              onClick={() => (onBackToServices ? onBackToServices() : onNavigateTab?.('services'))}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-colors cursor-pointer"
            >
              {isEs ? 'Ir a Gestión de Servicios' : isEn ? 'Go to Services' : isFr ? 'Aller aux Cultes' : 'Ale nan Paj Sèvis'}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: List of Ended Services (4 columns on lg) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>{isEs ? 'Cultos en Historial' : isEn ? 'Archived Services' : isFr ? 'Cultes Archivés' : 'Kilt nan Istwa'}</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {filteredEndedServices.length} / {endedServices.length}
                </span>
              </div>

              {/* Search in history */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={isEs ? 'Buscar en historial...' : isEn ? 'Search history...' : isFr ? 'Rechercher...' : 'Chèche nan istwa kilt yo...'}
                  value={searchServiceQuery}
                  onChange={(e) => setSearchServiceQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 text-xs placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap gap-1 pt-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setCategoryFilter('all')}
                  className={`px-2 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                    categoryFilter === 'all'
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {isEs ? 'Todos' : isEn ? 'All' : isFr ? 'Tous' : 'Tout'}
                </button>
                {Object.values(SERVICE_CATEGORIES).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`px-2 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                      categoryFilter === cat.id
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat.name[language] || cat.name.ht}
                  </button>
                ))}
              </div>
            </div>

            {/* List of Ended Service Cards */}
            <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
              {filteredEndedServices.map((srv) => {
                const isSelected = srv.id === selectedServiceId;
                const catObj = SERVICE_CATEGORIES[srv.category];
                return (
                  <button
                    key={srv.id}
                    type="button"
                    id={`btn-select-history-${srv.id}`}
                    onClick={() => setSelectedServiceId(srv.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800/90 border-amber-400/80 shadow-md ring-1 ring-amber-400/40'
                        : 'bg-slate-900/80 hover:bg-slate-800/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-amber-300 font-bold text-[10px] uppercase border border-slate-700">
                        {catObj ? (catObj.name[language] || catObj.name.ht) : srv.category}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded-full border border-slate-800">
                        <CheckCircle2 className="w-3 h-3 text-slate-400" />
                        <span>{t.servicePermanentlyEndedBadge || 'FINI & PASE'}</span>
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-1 mb-1">
                      {srv.title}
                    </h4>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {srv.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {srv.startTime} - {srv.endTime}
                      </span>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="truncate max-w-[170px]">
                        {srv.leader || srv.preacherOrLeader}
                      </span>
                      <span className="text-amber-400 font-bold flex items-center gap-0.5">
                        <span>{isEs ? 'Ver informe' : isEn ? 'View report' : isFr ? 'Voir rapport' : 'Gade rapò'}</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Detailed Service Stats & Member Roll (8 columns on lg) */}
          <div className="lg:col-span-8 space-y-6">
            {activeService && stats ? (
              <>
                {/* Active Service Overview Card */}
                <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 shadow-md space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold text-xs">
                          {SERVICE_CATEGORIES[activeService.category]
                            ? (SERVICE_CATEGORIES[activeService.category].name[language] || SERVICE_CATEGORIES[activeService.category].name.ht)
                            : activeService.category}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-mono border border-slate-700">
                          {activeService.date}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-mono border border-slate-700">
                          {activeService.startTime} - {activeService.endTime}
                        </span>
                      </div>
                      <h2 className="text-lg sm:text-xl font-black text-white">
                        {activeService.title}
                      </h2>
                    </div>

                    <div className="text-right">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950 text-slate-400 border border-slate-800 text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{t.serviceCannotReopen || 'Sèvis Fini / Klotire'}</span>
                      </div>
                      {activeService.endedAt && (
                        <div className="text-[10px] text-slate-500 mt-1">
                          {isEs ? 'Archivado el:' : isEn ? 'Archived:' : isFr ? 'Archivé le :' : 'Klotire le:'}{' '}
                          {new Date(activeService.endedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ministry Officers Information */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    <div>
                      <span className="text-slate-500 font-semibold block text-[10px] uppercase">
                        {isEs ? 'Director de Culto' : isEn ? 'Service Leader' : isFr ? 'Dirigeant' : 'Dirijan Sèvis'}
                      </span>
                      <span className="font-bold text-white">
                        {activeService.leader || activeService.preacherOrLeader || '—'}
                      </span>
                    </div>

                    {activeService.preacher && (
                      <div>
                        <span className="text-slate-500 font-semibold block text-[10px] uppercase">
                          {isEs ? 'Predicador' : isEn ? 'Preacher' : isFr ? 'Prédicateur' : 'Predikatè'}
                        </span>
                        <span className="font-bold text-amber-300">
                          {activeService.preacher}
                        </span>
                      </div>
                    )}

                    {activeService.passage && (
                      <div>
                        <span className="text-slate-500 font-semibold block text-[10px] uppercase">
                          {isEs ? 'Pasaje Bíblico' : isEn ? 'Scripture' : isFr ? 'Passage' : 'Pasaj Biblik'}
                        </span>
                        <span className="font-bold text-indigo-300">
                          {activeService.passage}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 4 Summary Stat Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    {/* Total Present */}
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-1">
                      <div className="flex items-center justify-between text-emerald-400">
                        <span className="text-[11px] font-bold uppercase tracking-wider">
                          {t.serviceHistoryPresent || 'Prezan'}
                        </span>
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div className="text-2xl font-black text-white">
                        {stats.totalPresent}
                      </div>
                      <div className="text-[11px] text-emerald-400/90 font-medium">
                        {stats.attendanceRate}% {isEs ? 'asistencia' : isEn ? 'rate' : isFr ? 'taux' : 'to prezans'}
                      </div>
                    </div>

                    {/* On Time */}
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-teal-500/30 space-y-1">
                      <div className="flex items-center justify-between text-teal-400">
                        <span className="text-[11px] font-bold uppercase tracking-wider">
                          {t.serviceHistoryOnTime || 'Alè'}
                        </span>
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="text-2xl font-black text-white">
                        {stats.totalOnTime}
                      </div>
                      <div className="text-[11px] text-teal-400/90 font-medium">
                        {stats.punctualityRate}% {isEs ? 'puntuales' : isEn ? 'on time' : isFr ? 'à l’heure' : 'alè'}
                      </div>
                    </div>

                    {/* Late */}
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/30 space-y-1">
                      <div className="flex items-center justify-between text-amber-400">
                        <span className="text-[11px] font-bold uppercase tracking-wider">
                          {t.serviceHistoryLate || 'An Reta'}
                        </span>
                        <Timer className="w-4 h-4" />
                      </div>
                      <div className="text-2xl font-black text-white">
                        {stats.totalLate}
                      </div>
                      <div className="text-[11px] text-amber-400/90 font-medium">
                        {activeService.lateToleranceMinutes ? `+${activeService.lateToleranceMinutes}m tol.` : '+15m tol.'}
                      </div>
                    </div>

                    {/* Absent & Excused */}
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-rose-500/30 space-y-1">
                      <div className="flex items-center justify-between text-rose-400">
                        <span className="text-[11px] font-bold uppercase tracking-wider">
                          {t.serviceHistoryAbsent || 'Absan'}
                        </span>
                        <UserX className="w-4 h-4" />
                      </div>
                      <div className="text-2xl font-black text-white">
                        {stats.totalAbsent}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {stats.totalExcused > 0 ? (
                          <span className="text-indigo-400 font-bold">
                            +{stats.totalExcused} {isEs ? 'excusados' : isEn ? 'excused' : isFr ? 'excusés' : 'eskize'}
                          </span>
                        ) : (
                          `${stats.totalMembers} ${isEs ? 'miembros' : isEn ? 'members' : isFr ? 'membres' : 'manm'}`
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Visual Proportion Breakdown Bar */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{isEs ? 'Distribución del Culte' : isEn ? 'Attendance Distribution' : isFr ? 'Répartition des Présences' : 'Distribisyon Kilt la'}</span>
                      <span className="font-mono text-slate-300">
                        {stats.totalPresent} / {stats.totalMembers} {isEs ? 'miembros activos' : isEn ? 'active members' : isFr ? 'membres actifs' : 'manm aktif'}
                      </span>
                    </div>
                    <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                      {stats.totalOnTime > 0 && (
                        <div
                          style={{ width: `${(stats.totalOnTime / (stats.totalMembers || 1)) * 100}%` }}
                          className="bg-emerald-500 h-full transition-all"
                          title={`Alè: ${stats.totalOnTime}`}
                        />
                      )}
                      {stats.totalLate > 0 && (
                        <div
                          style={{ width: `${(stats.totalLate / (stats.totalMembers || 1)) * 100}%` }}
                          className="bg-amber-500 h-full transition-all"
                          title={`An reta: ${stats.totalLate}`}
                        />
                      )}
                      {stats.totalExcused > 0 && (
                        <div
                          style={{ width: `${(stats.totalExcused / (stats.totalMembers || 1)) * 100}%` }}
                          className="bg-indigo-500 h-full transition-all"
                          title={`Eskize: ${stats.totalExcused}`}
                        />
                      )}
                      {stats.totalAbsent > 0 && (
                        <div
                          style={{ width: `${(stats.totalAbsent / (stats.totalMembers || 1)) * 100}%` }}
                          className="bg-rose-500/80 h-full transition-all"
                          title={`Absan: ${stats.totalAbsent}`}
                        />
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span>{t.serviceHistoryOnTime || 'Alè'}: {stats.totalOnTime}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span>{t.serviceHistoryLate || 'An Reta'}: {stats.totalLate}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                        <span>{t.serviceHistoryExcused || 'Eskize'}: {stats.totalExcused}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        <span>{t.serviceHistoryAbsent || 'Absan'}: {stats.totalAbsent}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Member Roll Controls & Search */}
                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-amber-400" />
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">
                        {isEs ? 'Lista de Asistencia del Culte' : isEn ? 'Service Attendance Roll' : isFr ? 'Feuille de Présence du Culte' : 'Fèy Prezans Kilt la'}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-xs font-bold">
                        {filteredMembers.length}
                      </span>
                    </div>

                    {/* Search member input */}
                    <div className="relative min-w-[240px]">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder={t.serviceHistorySearchMember || 'Chèche pa non, telefòn oswa ID...'}
                        value={searchMemberQuery}
                        onChange={(e) => setSearchMemberQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 text-xs placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                      />
                    </div>
                  </div>

                  {/* Filter Pills (All / Present / On Time / Late / Absent / Excused) */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setStatusFilter('all')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                        statusFilter === 'all'
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t.serviceHistoryAllStatus || 'Tout'} ({stats.totalMembers})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('present')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                        statusFilter === 'present'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t.serviceHistoryPresent || 'Prezan'} ({stats.totalPresent})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('on_time')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                        statusFilter === 'on_time'
                          ? 'bg-teal-500 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t.serviceHistoryOnTime || 'Alè'} ({stats.totalOnTime})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('late')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                        statusFilter === 'late'
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t.serviceHistoryLate || 'An Reta'} ({stats.totalLate})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('absent')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                        statusFilter === 'absent'
                          ? 'bg-rose-500 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t.serviceHistoryAbsent || 'Absan'} ({stats.totalAbsent})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('excused')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                        statusFilter === 'excused'
                          ? 'bg-indigo-500 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t.serviceHistoryExcused || 'Eskize'} ({stats.totalExcused})
                    </button>

                    {/* Department Filter */}
                    {departments.length > 0 && (
                      <select
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                        className="ml-auto px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-400"
                      >
                        <option value="all">{isEs ? 'Todos Departamentos' : isEn ? 'All Departments' : isFr ? 'Tous Départements' : 'Tout Depatman'}</option>
                        {departments.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Members List Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                          <th className="py-2.5 px-3">{isEs ? 'Miembro' : isEn ? 'Member' : isFr ? 'Membre' : 'Manm'}</th>
                          <th className="py-2.5 px-3">{isEs ? 'Departamento' : isEn ? 'Department' : isFr ? 'Département' : 'Depatman'}</th>
                          <th className="py-2.5 px-3">{isEs ? 'Estado en Culte' : isEn ? 'Service Status' : isFr ? 'Statut au Culte' : 'Estati nan Kilt'}</th>
                          <th className="py-2.5 px-3">{isEs ? 'Hora / Detalles' : isEn ? 'Time / Details' : isFr ? 'Heure / Détails' : 'Lè / Detay'}</th>
                          <th className="py-2.5 px-3 text-right">{isEs ? 'Acciones' : isEn ? 'Actions' : isFr ? 'Actions' : 'Aksyon'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredMembers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-500">
                              {isEs ? 'No se encontraron miembros para este filtro.' : isEn ? 'No members found for this filter.' : isFr ? 'Aucun membre trouvé pour ce filtre.' : 'Pa gen okenn manm pou filtè sa a.'}
                            </td>
                          </tr>
                        ) : (
                          filteredMembers.map((m) => {
                            const isPresent = m.status === 'on_time' || m.status === 'late';
                            return (
                              <tr
                                key={m.memberDbId || m.memberId}
                                className="hover:bg-slate-800/40 transition-colors"
                              >
                                {/* Member info */}
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-2.5">
                                    <div
                                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                        m.status === 'on_time'
                                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                          : m.status === 'late'
                                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                          : m.status === 'excused'
                                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                      }`}
                                    >
                                      {m.fullName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="font-bold text-white text-xs">
                                        {m.fullName}
                                      </div>
                                      <div className="text-[10px] text-slate-400 font-mono">
                                        ID: {m.memberId || '—'} {m.phone ? `• ${m.phone}` : ''}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* Department */}
                                <td className="py-3 px-3 text-slate-300">
                                  {m.department ? (
                                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-semibold border border-slate-700">
                                      {m.department}
                                    </span>
                                  ) : (
                                    <span className="text-slate-500 text-[10px]">—</span>
                                  )}
                                </td>

                                {/* Status Badge */}
                                <td className="py-3 px-3">
                                  {m.status === 'on_time' && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-[11px]">
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>{t.serviceHistoryOnTime || 'Alè'}</span>
                                    </span>
                                  )}
                                  {m.status === 'late' && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-[11px]">
                                      <Timer className="w-3 h-3" />
                                      <span>{t.serviceHistoryLate || 'An Reta'}</span>
                                    </span>
                                  )}
                                  {m.status === 'absent' && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-[11px]">
                                      <XCircle className="w-3 h-3" />
                                      <span>{t.serviceHistoryAbsent || 'Absan'}</span>
                                    </span>
                                  )}
                                  {m.status === 'excused' && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold text-[11px]">
                                      <ShieldCheck className="w-3 h-3" />
                                      <span>{t.serviceHistoryExcused || 'Eskize'}</span>
                                    </span>
                                  )}
                                </td>

                                {/* Timestamp & Details */}
                                <td className="py-3 px-3 text-slate-300 text-[11px]">
                                  {isPresent ? (
                                    <div className="space-y-0.5">
                                      <div className="font-mono text-slate-200">
                                        {m.checkInTime ? new Date(m.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                                      </div>
                                      <div className="text-[10px] text-slate-400">
                                        {m.checkInMethod === 'qr_scan'
                                          ? 'QR Code'
                                          : m.checkInMethod === 'barcode'
                                          ? 'Barcode'
                                          : isEs ? 'Manual' : isEn ? 'Manual' : isFr ? 'Manuel' : 'Manyèl'}
                                        {m.status === 'late' && m.lateMinutes ? (
                                          <span className="text-amber-400 ml-1 font-bold font-mono">
                                            (+{m.lateMinutes} min)
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>
                                  ) : m.status === 'excused' ? (
                                    <div className="text-indigo-300 text-[11px] italic">
                                      {m.excuseReason || 'Eskize pa legliz la'}
                                    </div>
                                  ) : (
                                    <span className="text-slate-500 text-[10px]">
                                      {isEs ? 'Sin registro' : isEn ? 'No check-in' : isFr ? 'Non scanné' : 'Pa t eskane'}
                                    </span>
                                  )}
                                </td>

                                {/* Action (Eskize / Justify) */}
                                <td className="py-3 px-3 text-right">
                                  {!isPresent && (
                                    <button
                                      type="button"
                                      id={`btn-excuse-${m.memberDbId}`}
                                      onClick={() => handleOpenExcuseModal(m)}
                                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white text-[11px] font-bold transition-colors cursor-pointer"
                                    >
                                      {m.status === 'excused'
                                        ? isEs ? 'Modificar' : isEn ? 'Edit' : isFr ? 'Modifier' : 'Chanje'
                                        : isEs ? 'Justificar' : isEn ? 'Excuse' : isFr ? 'Justifier' : 'Eskize'}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-12 text-center bg-slate-900 rounded-2xl border border-slate-800 text-slate-400">
                {t.serviceHistorySelectPrompt || 'Chwazi yon sèvis ki te pase pou w revize estatistik li yo.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Excuse Modal */}
      {excuseTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <span>
                  {excuseTarget.status === 'excused'
                    ? isEs ? 'Modificar Justificación' : isEn ? 'Edit Absence Reason' : isFr ? 'Modifier la Justification' : 'Chanje Rezon Eskiz'
                    : isEs ? 'Justificar Ausencia' : isEn ? 'Excuse Absence' : isFr ? 'Justifier l’Absence' : 'Eskize Absans Sa a'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setExcuseTarget(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-300">
              <span className="text-slate-400 block mb-1">
                {isEs ? 'Miembro:' : isEn ? 'Member:' : isFr ? 'Membre :' : 'Manm:'}
              </span>
              <strong className="text-white text-sm">{excuseTarget.fullName}</strong>
              <div className="text-slate-400 mt-0.5 font-mono">ID: {excuseTarget.memberId}</div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="input-excuse-reason" className="block text-xs font-bold text-slate-300">
                {isEs ? 'Motivo o Causa de la Ausencia:' : isEn ? 'Reason for Absence:' : isFr ? 'Motif de l’Absence :' : 'Rezon oswa Motif Absans la:'}
              </label>
              <textarea
                id="input-excuse-reason"
                rows={3}
                value={excuseReasonInput}
                onChange={(e) => setExcuseReasonInput(e.target.value)}
                placeholder={isEs ? 'Ej: Enfermedad, Viaje de trabajo, Misión pastoral...' : isEn ? 'e.g. Sickness, Travel, Pastoral mission...' : isFr ? 'ex: Maladie, Voyage, Mission pastorale...' : 'Egzanp: Maladi, Vwayaj, Misyon legliz, Travay...'}
                className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>

            {/* Quick Reason Suggestions */}
            <div className="flex flex-wrap gap-1 text-[10px]">
              {['Maladi', 'Vwayaj', 'Misyon', 'Travay', 'Ijans Fanmi'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setExcuseReasonInput(r)}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                >
                  {r}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setExcuseTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                {isEs ? 'Cancelar' : isEn ? 'Cancel' : isFr ? 'Annuler' : 'Anile'}
              </button>
              <button
                type="button"
                id="btn-confirm-excuse"
                onClick={handleSaveExcuse}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                {isEs ? 'Guardar Justificación' : isEn ? 'Save Excuse' : isFr ? 'Enregistrer' : 'Anrejistre Eskiz'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
