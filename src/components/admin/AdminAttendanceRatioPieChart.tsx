import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import {
  PieChart as PieChartIcon,
  CheckCircle2,
  Clock,
  UserX,
  Calendar,
} from 'lucide-react';
import { Church, Member, AttendanceRecord, ServiceSession, Language } from '../../types';

interface AdminAttendanceRatioPieChartProps {
  church: Church;
  members: Member[];
  services: ServiceSession[];
  attendanceRecords: AttendanceRecord[];
  language?: Language;
}

export const AdminAttendanceRatioPieChart: React.FC<AdminAttendanceRatioPieChartProps> = ({
  church,
  members,
  services,
  attendanceRecords,
  language = 'ht',
}) => {
  const isEs = language === 'es';
  const isFr = language === 'fr';
  const isEn = language === 'en';

  // 1. Identify past services (services held on or before today, or having attendance records)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const pastServices = useMemo(() => {
    return services
      .filter((s) => {
        if (s.churchId && s.churchId !== church.id) return false;
        const hasRecords = attendanceRecords.some(
          (r) => r.serviceId === s.id || (r.serviceDate === s.date && r.churchId === church.id)
        );
        return s.date <= todayStr || hasRecords;
      })
      .sort((a, b) => {
        const dateA = a.date + (a.startTime || '00:00');
        const dateB = b.date + (b.startTime || '00:00');
        return dateB.localeCompare(dateA);
      });
  }, [services, church.id, todayStr, attendanceRecords]);

  // Selected service: 'all' for cumulative, or specific service id
  const [selectedServiceId, setSelectedServiceId] = useState<string>('all');

  // Active members in the church
  const activeMembers = useMemo(() => {
    return members.filter((m) => {
      if (m.churchId && m.churchId !== church.id) return false;
      return m.status !== 'inactive';
    });
  }, [members, church.id]);

  const totalMembersCount = activeMembers.length || members.length || 1;

  // 2. Compute attendance ratio (On-time Present, Late, Absent)
  const attendanceBreakdown = useMemo(() => {
    if (selectedServiceId !== 'all') {
      // Single specific service calculation
      const currentService = pastServices.find((s) => s.id === selectedServiceId);
      const serviceDate = currentService?.date;

      const recordsForService = attendanceRecords.filter((r) => {
        if (r.churchId && r.churchId !== church.id) return false;
        return r.serviceId === selectedServiceId || (serviceDate && r.serviceDate === serviceDate);
      });

      // Deduplicate by member ID
      const presentMap = new Map<string, AttendanceRecord>();
      recordsForService.forEach((r) => {
        const key = r.memberDbId || r.memberId;
        if (key && !presentMap.has(key)) {
          presentMap.set(key, r);
        }
      });

      let onTime = 0;
      let late = 0;

      presentMap.forEach((rec) => {
        if (rec.attendanceStatus === 'late' || (rec.lateMinutes && rec.lateMinutes > 0)) {
          late++;
        } else {
          onTime++;
        }
      });

      const totalPresent = onTime + late;
      const absent = Math.max(0, totalMembersCount - totalPresent);
      const grandTotal = onTime + late + absent || 1;

      return {
        onTime,
        late,
        absent,
        totalPresent,
        onTimeRate: Math.round((onTime / grandTotal) * 100),
        lateRate: Math.round((late / grandTotal) * 100),
        absentRate: Math.max(0, 100 - Math.round((onTime / grandTotal) * 100) - Math.round((late / grandTotal) * 100)),
        presentRate: Math.round((totalPresent / grandTotal) * 100),
        evaluatedServicesCount: 1,
        label: currentService?.title || (isEs ? 'Servicio Seleccionado' : isFr ? 'Service Sélectionné' : isEn ? 'Selected Service' : 'Sèvis Chwazi a'),
      };
    }

    // Cumulative calculation across past services
    if (pastServices.length > 0) {
      let cumulativeOnTime = 0;
      let cumulativeLate = 0;
      let cumulativeAbsent = 0;

      pastServices.forEach((svc) => {
        const records = attendanceRecords.filter((r) => {
          if (r.churchId && r.churchId !== church.id) return false;
          return r.serviceId === svc.id || (r.serviceDate === svc.date && (!r.serviceId || r.serviceId === svc.id));
        });

        const presentMap = new Map<string, AttendanceRecord>();
        records.forEach((r) => {
          const key = r.memberDbId || r.memberId;
          if (key && !presentMap.has(key)) {
            presentMap.set(key, r);
          }
        });

        let svcOnTime = 0;
        let svcLate = 0;

        presentMap.forEach((rec) => {
          if (rec.attendanceStatus === 'late' || (rec.lateMinutes && rec.lateMinutes > 0)) {
            svcLate++;
          } else {
            svcOnTime++;
          }
        });

        const svcPresent = svcOnTime + svcLate;
        const svcAbsent = Math.max(0, totalMembersCount - svcPresent);

        cumulativeOnTime += svcOnTime;
        cumulativeLate += svcLate;
        cumulativeAbsent += svcAbsent;
      });

      const grandTotal = cumulativeOnTime + cumulativeLate + cumulativeAbsent || 1;
      const totalPresent = cumulativeOnTime + cumulativeLate;

      return {
        onTime: cumulativeOnTime,
        late: cumulativeLate,
        absent: cumulativeAbsent,
        totalPresent,
        onTimeRate: Math.round((cumulativeOnTime / grandTotal) * 100),
        lateRate: Math.round((cumulativeLate / grandTotal) * 100),
        absentRate: Math.max(0, 100 - Math.round((cumulativeOnTime / grandTotal) * 100) - Math.round((cumulativeLate / grandTotal) * 100)),
        presentRate: Math.round((totalPresent / grandTotal) * 100),
        evaluatedServicesCount: pastServices.length,
        label: isEs
          ? `Todos los cultos pasados (${pastServices.length})`
          : isFr
          ? `Tous les cultes passés (${pastServices.length})`
          : isEn
          ? `All past services (${pastServices.length})`
          : `Tout kilt ki pase yo (${pastServices.length})`,
      };
    }

    // Fallback if no past services exist yet
    const presentMap = new Map<string, AttendanceRecord>();
    attendanceRecords
      .filter((r) => !r.churchId || r.churchId === church.id)
      .forEach((r) => {
        const key = r.memberDbId || r.memberId;
        if (key && !presentMap.has(key)) {
          presentMap.set(key, r);
        }
      });

    let onTime = 0;
    let late = 0;

    presentMap.forEach((rec) => {
      if (rec.attendanceStatus === 'late' || (rec.lateMinutes && rec.lateMinutes > 0)) {
        late++;
      } else {
        onTime++;
      }
    });

    const totalPresent = onTime + late;
    const absent = Math.max(0, totalMembersCount - totalPresent);
    const grandTotal = onTime + late + absent || 1;

    return {
      onTime,
      late,
      absent,
      totalPresent,
      onTimeRate: Math.round((onTime / grandTotal) * 100),
      lateRate: Math.round((late / grandTotal) * 100),
      absentRate: Math.max(0, 100 - Math.round((onTime / grandTotal) * 100) - Math.round((late / grandTotal) * 100)),
      presentRate: Math.round((totalPresent / grandTotal) * 100),
      evaluatedServicesCount: 1,
      label: isEs ? 'Registros Generales' : isFr ? 'Données Générales' : isEn ? 'General Records' : 'Tout Done yo',
    };
  }, [selectedServiceId, pastServices, attendanceRecords, church.id, totalMembersCount, isEs, isFr, isEn]);

  // 3. Format data for Recharts Pie
  const pieData = useMemo(() => {
    return [
      {
        id: 'on_time',
        name: isEs ? 'Presentes a Tiempo' : isFr ? 'Présents à l’heure' : isEn ? 'On-time Present' : 'Prezan Alè',
        value: attendanceBreakdown.onTime,
        rate: attendanceBreakdown.onTimeRate,
        color: '#10B981', // emerald-500
      },
      {
        id: 'late',
        name: isEs ? 'Tardanzas' : isFr ? 'En retard' : isEn ? 'Late' : 'Anreta',
        value: attendanceBreakdown.late,
        rate: attendanceBreakdown.lateRate,
        color: '#F59E0B', // amber-500
      },
      {
        id: 'absent',
        name: isEs ? 'Ausentes' : isFr ? 'Absents' : isEn ? 'Absent' : 'Absan',
        value: attendanceBreakdown.absent,
        rate: attendanceBreakdown.absentRate,
        color: '#F43F5E', // rose-500
      },
    ];
  }, [attendanceBreakdown, isEs, isFr, isEn]);

  // Custom Pie Tooltip
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs text-white space-y-1 min-w-[160px]">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: data.color }}
            />
            <span className="font-extrabold text-white text-xs">{data.name}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-0.5">
            <span className="text-slate-400">
              {isEs ? 'Cantidad:' : isFr ? 'Nombre :' : isEn ? 'Count:' : 'Kantite:'}
            </span>
            <span className="font-mono font-black text-white">{data.value}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">
              {isEs ? 'Proporción:' : isFr ? 'Part :' : isEn ? 'Share:' : 'Pousantaj:'}
            </span>
            <span className="font-mono font-bold" style={{ color: data.color }}>
              {data.rate}%
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#1E293B] rounded-3xl border border-slate-700/80 p-5 sm:p-6 shadow-xl flex flex-col justify-between space-y-4 h-full">
      {/* HEADER WITH TITLE & SERVICE SELECTOR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/80 pb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center shrink-0">
            <PieChartIcon className="w-5 h-5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-extrabold text-base text-white tracking-tight truncate flex items-center gap-2">
              <span>
                {isEs
                  ? 'Proporción de Asistencia'
                  : isFr
                  ? 'Ratio Présences / Absences'
                  : isEn
                  ? 'Attendance Ratio (Pie)'
                  : 'Rapò Prezans vs Absans'}
              </span>
            </h3>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {isEs
                ? 'Presentes vs Tardanzas vs Ausentes'
                : isFr
                ? 'Présents vs Retards vs Absents'
                : isEn
                ? 'Present vs Late vs Absent'
                : 'Moun ki prezan vs anreta vs absan'}
            </p>
          </div>
        </div>

        {/* SERVICE SELECTOR DROPDOWN */}
        <div className="w-full sm:w-auto shrink-0">
          <select
            id="select-attendance-pie-service"
            value={selectedServiceId}
            onChange={(e) => setSelectedServiceId(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-bold focus:outline-none focus:border-amber-400 max-w-full sm:max-w-[240px] truncate cursor-pointer transition-colors"
          >
            <option value="all">
              {isEs
                ? '★ Todos los cultos pasados'
                : isFr
                ? '★ Tous les cultes passés'
                : isEn
                ? '★ All past services'
                : '★ Tout kilt ki pase yo'}
            </option>
            {pastServices.map((svc) => (
              <option key={svc.id} value={svc.id}>
                {svc.date} • {svc.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* MAIN BODY: PIE CHART + DETAILED BREAKDOWN (STACKED ON MOBILE, SIDE-BY-SIDE ON TABLET/DESKTOP) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center my-auto py-2">
        {/* RECHARTS PIE CHART WITH DONUT CENTER RATE */}
        <div className="md:col-span-5 relative w-full h-[220px] sm:h-[240px] flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={86}
                paddingAngle={4}
                dataKey="value"
                nameKey="name"
                stroke="none"
                isAnimationActive={true}
              >
                {pieData.map((entry) => (
                  <Cell key={`cell-${entry.id}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* CENTER STAT OVERLAY */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono leading-none">
              {attendanceBreakdown.presentRate}%
            </span>
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mt-1 font-mono">
              {isEs ? 'Asistencia' : isFr ? 'Présence' : isEn ? 'Present' : 'Prezans'}
            </span>
          </div>
        </div>

        {/* STAT METRICS & SEGMENTATION BARS */}
        <div className="md:col-span-7 space-y-4">
          {/* SEGMENTED PROGRESS BAR */}
          <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
              <span>{isEs ? 'Distribución Global' : isFr ? 'Distribution Globale' : isEn ? 'Overall Distribution' : 'Distribisyon Global'}</span>
              <span className="font-mono text-amber-400">{attendanceBreakdown.totalPresent} / {totalMembersCount} {isEs ? 'presentes' : isFr ? 'présents' : isEn ? 'attended' : 'prezan'}</span>
            </div>
            <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${attendanceBreakdown.onTimeRate}%` }}
                title={`Alè: ${attendanceBreakdown.onTimeRate}%`}
              />
              <div
                className="bg-amber-500 h-full transition-all duration-500"
                style={{ width: `${attendanceBreakdown.lateRate}%` }}
                title={`Anreta: ${attendanceBreakdown.lateRate}%`}
              />
              <div
                className="bg-rose-500 h-full transition-all duration-500"
                style={{ width: `${attendanceBreakdown.absentRate}%` }}
                title={`Absan: ${attendanceBreakdown.absentRate}%`}
              />
            </div>
          </div>

          {/* 3 COMPARATIVE STAT CARDS */}
          <div className="grid grid-cols-3 gap-2.5">
            {/* PREZAN ALÈ */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/90 border border-emerald-500/25 flex flex-col items-center justify-center text-center">
              <div className="flex items-center gap-1 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-[11px] font-bold text-slate-300 truncate">
                  {isEs ? 'A Tiempo' : isFr ? 'À l’heure' : isEn ? 'On Time' : 'Alè'}
                </span>
              </div>
              <div className="text-lg sm:text-xl font-black text-emerald-400 font-mono leading-tight">
                {attendanceBreakdown.onTime}
              </div>
              <span className="text-[10px] font-bold text-slate-400 font-mono mt-0.5">
                {attendanceBreakdown.onTimeRate}%
              </span>
            </div>

            {/* ANRETA */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/90 border border-amber-500/25 flex flex-col items-center justify-center text-center">
              <div className="flex items-center gap-1 mb-1">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px] font-bold text-slate-300 truncate">
                  {isEs ? 'Tardanza' : isFr ? 'En Retard' : isEn ? 'Late' : 'Anreta'}
                </span>
              </div>
              <div className="text-lg sm:text-xl font-black text-amber-400 font-mono leading-tight">
                {attendanceBreakdown.late}
              </div>
              <span className="text-[10px] font-bold text-slate-400 font-mono mt-0.5">
                {attendanceBreakdown.lateRate}%
              </span>
            </div>

            {/* ABSAN */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/90 border border-rose-500/25 flex flex-col items-center justify-center text-center">
              <div className="flex items-center gap-1 mb-1">
                <UserX className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="text-[11px] font-bold text-slate-300 truncate">
                  {isEs ? 'Ausente' : isFr ? 'Absent' : isEn ? 'Absent' : 'Absan'}
                </span>
              </div>
              <div className="text-lg sm:text-xl font-black text-rose-400 font-mono leading-tight">
                {attendanceBreakdown.absent}
              </div>
              <span className="text-[10px] font-bold text-slate-400 font-mono mt-0.5">
                {attendanceBreakdown.absentRate}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER LABEL */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
        <span className="flex items-center gap-1 text-slate-300 truncate">
          <Calendar className="w-3 h-3 text-amber-400 shrink-0" />
          <span className="truncate">{attendanceBreakdown.label}</span>
        </span>
        <span className="font-mono text-slate-400 shrink-0 ml-2">
          {totalMembersCount} {isEs ? 'miembros' : isFr ? 'membres' : isEn ? 'members' : 'manm'}
        </span>
      </div>
    </div>
  );
};
