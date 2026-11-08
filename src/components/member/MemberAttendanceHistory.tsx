import React, { useState } from 'react';
import { Church, Member, AttendanceRecord, ServiceCategory } from '../../types';
import { SERVICE_CATEGORIES } from '../../utils/i18n';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  BarChart3,
  Flame,
  Award,
  Sparkles,
} from 'lucide-react';

interface MemberAttendanceHistoryProps {
  church: Church;
  member: Member;
  attendanceRecords?: AttendanceRecord[];
  attendance?: AttendanceRecord[];
  language?: string;
}

export const MemberAttendanceHistory: React.FC<MemberAttendanceHistoryProps> = ({
  church,
  member,
  attendanceRecords,
  attendance,
  language = 'ht',
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const isEs = language === 'es';
  const isEn = language === 'en';
  const isFr = language === 'fr';

  const records = attendanceRecords || attendance || [];

  const filtered = records.filter((rec) => {
    if (filterCategory === 'all') return true;
    return rec.serviceCategory === filterCategory;
  });

  // Calculate consistency statistics
  const totalCheckins = records.length;
  const categoriesAttended = new Set(records.map((r) => r.serviceCategory)).size;

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            {isEs
              ? 'Mi Historial Personal de Asistencias'
              : isEn
              ? 'My Personal Attendance History'
              : isFr
              ? 'Mon Historique Personnel de Présences'
              : 'Istwa Prezans Pèsonèl Mwen'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            {isEs
              ? `Registro completo de todos los cultos y actividades a los que ha asistido en ${church.name}.`
              : isEn
              ? `Complete log of all services and activities you attended at ${church.name}.`
              : isFr
              ? `Journal complet de tous les cultes et activités auxquels vous avez assisté à ${church.name}.`
              : `Journal konplè tout kilt ak aktivite ou te asiste nan ${church.name}.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs bg-slate-900 px-3 py-1 rounded-lg border border-slate-700 font-bold text-amber-300">
            {member.memberId}
          </span>
        </div>
      </div>

      {/* STATS SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-[#1E293B] border border-slate-700/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 block">
              {isEs ? 'Total Asistencias' : isEn ? 'Total Attendances' : isFr ? 'Total Présences' : 'Total Prezans'}
            </span>
            <span className="text-2xl font-extrabold text-white">
              {totalCheckins}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#1E293B] border border-slate-700/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 block">
              {isEs ? 'Fidelidad y Constancia' : isEn ? 'Consistency & Fidelity' : isFr ? 'Fidélité & Régularité' : 'Fidélité & Régularité'}
            </span>
            <span className="text-2xl font-extrabold text-amber-400">
              {totalCheckins >= 5
                ? isEs ? 'Excelente ⭐' : isEn ? 'Excellent ⭐' : isFr ? 'Excellent ⭐' : 'Ekselan ⭐'
                : isEs ? 'Buen Comienzo' : isEn ? 'Good Start' : isFr ? 'Bon Début' : 'Bon Kòmansman'}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#1E293B] border border-slate-700/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 block">
              {isEs ? 'Departamentos Asistidos' : isEn ? 'Categories Attended' : isFr ? 'Départements Visités' : 'Depatman Asiste'}
            </span>
            <span className="text-2xl font-extrabold text-white">
              {categoriesAttended} {isEs ? '/ 6 secciones' : isEn ? '/ 6 categories' : isFr ? '/ 6 sections' : '/ 6 seksyon'}
            </span>
          </div>
        </div>
      </div>

      {/* FILTER & TABLE */}
      <div className="bg-[#1E293B] rounded-2xl border border-slate-700/80 shadow-sm overflow-hidden text-slate-200">
        <div className="p-4 border-b border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/40">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-400" />
            {isEs
              ? `Registros de Asistencia (${filtered.length})`
              : isEn
              ? `Attendance Records (${filtered.length})`
              : isFr
              ? `Tous les Enregistrements de Présence (${filtered.length})`
              : `Tout Anrejistreman Prezans (${filtered.length})`}
          </h3>

          {/* Filter Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              id="select-filter-history"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="text-xs bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 font-medium text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
            >
              <option value="all">
                {isEs ? 'Todas las Categorías' : isEn ? 'All Service Categories' : isFr ? 'Toutes les Catégories' : 'Tout Kategori Sèvis Yo'}
              </option>
              {Object.values(SERVICE_CATEGORIES).map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.code} — {isEs ? cat.name.es : isEn ? cat.name.en : isFr ? cat.name.fr : cat.name.ht}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <p className="text-sm">
              {isEs
                ? 'No hay registros de asistencia en esta categoría.'
                : isEn
                ? 'No attendance records found for this category.'
                : isFr
                ? 'Aucune présence enregistrée pour cette catégorie.'
                : 'Pa gen okenn prezans anrejistre pou kategori sa a.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#0F172A] text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-700/80">
                <tr>
                  <th className="py-3 px-4">{isEs ? 'Fecha' : isEn ? 'Date' : isFr ? 'Date' : 'Dat'}</th>
                  <th className="py-3 px-4">{isEs ? 'Actividad / Culto' : isEn ? 'Service / Activity' : isFr ? 'Activité / Culte' : 'Aktivite / Sèvis'}</th>
                  <th className="py-3 px-4">{isEs ? 'Sección' : isEn ? 'Section' : isFr ? 'Section' : 'Seksyon'}</th>
                  <th className="py-3 px-4">{isEs ? 'Hora de Escaneo' : isEn ? 'Scan Time' : isFr ? 'Heure de Scan' : 'Lè Scan'}</th>
                  <th className="py-3 px-4 text-center">{isEs ? 'Asistencia' : isEn ? 'Attendance' : isFr ? 'Présence' : 'Prezans'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium">
                {filtered.map((record) => {
                  const catConfig = SERVICE_CATEGORIES[record.serviceCategory];
                  return (
                    <tr
                      key={record.id}
                      className="hover:bg-slate-800/60 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-semibold text-white whitespace-nowrap">
                        {record.serviceDate}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        {record.serviceTitle}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {catConfig ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold border bg-slate-900 border-slate-700 text-slate-300">
                            {isEs ? catConfig.name.es : isEn ? catConfig.name.en : isFr ? catConfig.name.fr : catConfig.name.ht}
                          </span>
                        ) : (
                          <span>{record.serviceCategory}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400 whitespace-nowrap">
                        {new Date(record.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {isEs ? 'Presente ✓' : isEn ? 'Present ✓' : 'Présent ✓'}
                        </span>
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
  );
};

