import React, { useState } from 'react';
import {
  Church,
  Member,
  ServiceSession,
  ServiceCategory,
  AttendanceRecord,
} from '../../types';
import { SERVICE_CATEGORIES } from '../../utils/i18n';
import {
  Calendar,
  Clock,
  User,
  BookOpen,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Flame,
  SunMedium,
  Building2,
  Users,
  Info,
} from 'lucide-react';

interface MemberServicesProps {
  church: Church;
  member?: Member | null;
  services: ServiceSession[];
  attendanceRecords?: AttendanceRecord[];
  initialCategory?: ServiceCategory;
  onOpenMyCode?: () => void;
  language?: string;
}

export const MemberServices: React.FC<MemberServicesProps> = ({
  church,
  member,
  services,
  attendanceRecords = [],
  initialCategory = 'dominical',
  onOpenMyCode,
  language = 'ht',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory>(initialCategory);
  const isEs = language === 'es';
  const isEn = language === 'en';
  const isFr = language === 'fr';

  const currentCategoryConfig = SERVICE_CATEGORIES[selectedCategory];

  const categoryServices = services.filter((s) => s.category === selectedCategory);
  const myCategoryAttendance = (attendanceRecords || []).filter(
    (att) => att.serviceCategory === selectedCategory
  );

  const activeServiceInCategory = categoryServices.find((s) => s.isOpenForAttendance);

  const getCategoryIcon = (id: ServiceCategory) => {
    switch (id) {
      case 'general':
        return <Building2 className="w-4 h-4" />;
      case 'dominical':
        return <SunMedium className="w-4 h-4" />;
      case 'etude':
        return <BookOpen className="w-4 h-4" />;
      case 'intercession':
        return <Flame className="w-4 h-4" />;
      case 'jeunesse':
        return <Users className="w-4 h-4" />;
      case 'enfants':
        return <SunMedium className="w-4 h-4" />;
    }
  };

  const getCategoryName = (cat: typeof currentCategoryConfig) => {
    if (isEs) return cat.name.es || cat.name.fr;
    if (isEn) return cat.name.en || cat.name.ht;
    if (isFr) return cat.name.fr;
    return cat.name.ht;
  };

  const getCategoryDesc = (cat: typeof currentCategoryConfig) => {
    if (isEs) return cat.desc.es || cat.desc.fr;
    if (isEn) return cat.desc.en || cat.desc.ht;
    if (isFr) return cat.desc.fr;
    return cat.desc.ht;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            {isEs ? 'Servicios y Departamentos de la Iglesia' : isEn ? 'Church Services & Departments' : isFr ? 'Services & Départements de l’Église' : 'Sèvis & Depatman Legliz Yo'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            {isEs ? '6 Secciones separadas para organizar las actividades y asistencias de la iglesia.' : isEn ? '6 Separate sections to organize church activities and attendance.' : isFr ? '6 Sections séparées pour organiser les activités et présences de l’église.' : '6 Seksyon separe pou evite melanje aktivite ak prezans legliz la.'}
          </p>
        </div>
        <div className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold self-start sm:self-auto">
          {church.name}
        </div>
      </div>

      {/* 6 SECTION TABS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {Object.values(SERVICE_CATEGORIES).map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const serviceCount = services.filter((s) => s.category === cat.id).length;
          return (
            <button
              key={cat.id}
              type="button"
              id={`tab-service-${cat.id}`}
              onClick={() => setSelectedCategory(cat.id)}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                isSelected
                  ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md font-bold'
                  : 'bg-[#1E293B] hover:bg-slate-800 text-slate-300 border-slate-700/80 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-mono font-bold ${isSelected ? 'text-slate-950' : 'text-slate-400'}`}>
                  {cat.code}
                </span>
                <span className={isSelected ? 'text-slate-950' : 'text-slate-400'}>
                  {getCategoryIcon(cat.id)}
                </span>
              </div>
              <div>
                <h4 className="text-xs font-bold leading-tight">
                  {getCategoryName(cat)}
                </h4>
                <span className={`text-[10px] mt-1 block font-normal ${isSelected ? 'text-slate-900' : 'text-slate-400'}`}>
                  {serviceCount} {isEs ? 'sesiones' : isEn ? 'sessions' : isFr ? 'sessions' : 'sesyon'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ACTIVE SECTION HERO CARD */}
      <div className="rounded-2xl bg-[#1E293B] border border-slate-700/80 p-5 sm:p-6 shadow-sm space-y-4 text-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/80 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-lg shadow border border-slate-700">
              {currentCategoryConfig.code}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">
                  {getCategoryName(currentCategoryConfig)}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold border bg-slate-900 border-slate-700 text-slate-300">
                  {currentCategoryConfig.name.fr}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                {getCategoryDesc(currentCategoryConfig)}
              </p>
            </div>
          </div>

          {activeServiceInCategory && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase block">
                  {isEs ? '¡Asistencia Abierta Ahora!' : isEn ? 'Attendance Open Now!' : isFr ? 'Présence Ouverte Maintenant !' : 'Prezans Louvri Kounye a!'}
                </span>
                <button
                  type="button"
                  id="btn-scan-for-category-service"
                  onClick={onOpenMyCode}
                  className="text-xs font-bold text-emerald-300 hover:text-emerald-200 flex items-center gap-1 mt-0.5 cursor-pointer"
                >
                  {isEs ? 'Mostrar Mi Código' : isEn ? 'Show My Code' : isFr ? 'Afficher Mon Code' : 'Montre Kòd Mwen'} <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SERVICES IN THIS CATEGORY */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            {isEs ? `Sesiones y Horarios en esta sección (${categoryServices.length})` : isEn ? `Sessions & Schedule in this section (${categoryServices.length})` : isFr ? `Sessions & Horaires dans cette section (${categoryServices.length})` : `Sesyon & Orè nan seksyon sa a (${categoryServices.length})`}
          </h4>

          {categoryServices.length === 0 ? (
            <div className="p-6 text-center bg-slate-900/60 rounded-xl border border-slate-700/80 text-slate-400 text-xs">
              {isEs ? 'No hay ninguna sesión programada por el momento en esta sección.' : isEn ? 'No sessions scheduled at this time in this section.' : isFr ? 'Aucune session programmée pour le moment dans cette section.' : 'Pa gen okenn sesyon pwograme pou moman sa a nan seksyon sa a.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {categoryServices.map((srv) => (
                <div
                  key={srv.id}
                  id={`service-card-${srv.id}`}
                  className={`p-4 rounded-xl border transition-all ${
                    srv.isOpenForAttendance
                      ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-900/70 border-slate-700/80 shadow-sm hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h5 className="font-bold text-sm text-white">
                      {srv.title}
                    </h5>
                    {srv.isOpenForAttendance ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-bold">
                        {isEs ? 'ACTIVO PARA ESCANEO' : isEn ? 'ACTIVE FOR SCAN' : isFr ? 'ACTIF POUR SCAN' : 'AKTIF POU SCAN'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-medium border border-slate-700">
                        {isEs ? 'Programado' : isEn ? 'Scheduled' : isFr ? 'Programmé' : 'Pwograme'}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{srv.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{srv.startTime} - {srv.endTime}</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-300 space-y-1.5 bg-[#1E293B] p-2.5 rounded-lg border border-slate-700">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <div className="flex items-center gap-1.5 text-slate-200">
                        <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="font-medium"><strong className="text-slate-400">{isEs ? 'Director:' : isEn ? 'Leader:' : isFr ? 'Dirigeant :' : 'Dirijan:'}</strong> {srv.leader || srv.preacherOrLeader}</span>
                      </div>
                      {srv.preacher && srv.preacher !== srv.leader && (
                        <div className="flex items-center gap-1.5 text-amber-300">
                          <span className="font-medium"><strong className="text-amber-400/80">{isEs ? 'Predicador:' : isEn ? 'Preacher:' : isFr ? 'Prédicateur :' : 'Predikatè:'}</strong> {srv.preacher}</span>
                        </div>
                      )}
                      {srv.reader && (
                        <div className="flex items-center gap-1.5 text-sky-300">
                          <BookOpen className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span className="font-medium"><strong className="text-sky-400/80">{isEs ? 'Lector:' : isEn ? 'Reader:' : isFr ? 'Lecteur :' : 'Lektè:'}</strong> {srv.reader}</span>
                        </div>
                      )}
                    </div>
                    {srv.theme && (
                      <div className="flex items-center gap-1.5 text-slate-300 pt-0.5">
                        <span className="font-semibold text-white">{isEs ? 'Tema:' : isEn ? 'Theme:' : isFr ? 'Thème :' : 'Tèm:'}</span> {srv.theme}
                      </div>
                    )}
                    {srv.passage && (
                      <div className="flex items-center gap-1.5 text-amber-300 font-medium">
                        <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{isEs ? 'Pasaje:' : isEn ? 'Passage:' : isFr ? 'Passage :' : 'Pasaj:'} {srv.passage}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MY ATTENDANCE IN THIS CATEGORY */}
        <div className="mt-4 pt-4 border-t border-slate-700/80 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {isEs
                ? `Mis Asistencias en ${currentCategoryConfig.name.es}`
                : isEn
                ? `My Attendance in ${currentCategoryConfig.name.en}`
                : isFr
                ? `Mes Présences en ${currentCategoryConfig.name.fr}`
                : `Prezans Mwen nan ${currentCategoryConfig.name.ht}`}
            </h4>
            <span className="text-xs text-slate-400 font-medium font-mono">
              {isEs
                ? `${myCategoryAttendance.length} asistencias registradas`
                : isEn
                ? `${myCategoryAttendance.length} attendances recorded`
                : isFr
                ? `${myCategoryAttendance.length} présences enregistrées`
                : `${myCategoryAttendance.length} prezans anrejistre`}
            </span>
          </div>

          {myCategoryAttendance.length === 0 ? (
            <p className="text-xs text-slate-400 italic bg-slate-900/60 p-3 rounded-lg border border-slate-700/80">
              {isEs
                ? 'Aún no tiene asistencias registradas en esta sección.'
                : isEn
                ? 'You do not have any recorded attendance in this category yet.'
                : isFr
                ? 'Vous n’avez aucune présence enregistrée dans cette section pour le moment.'
                : 'Ou poko gen prezans ki make nan seksyon sa a.'}
            </p>
          ) : (
            <div className="space-y-2">
              {myCategoryAttendance.map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-700 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="font-bold text-white">{rec.serviceTitle}</span>
                      <span className="text-slate-400 text-[11px] block">{rec.serviceDate}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold text-[10px]">
                      {isEs ? 'Presente ✓' : isEn ? 'Present ✓' : 'Présent ✓'}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
