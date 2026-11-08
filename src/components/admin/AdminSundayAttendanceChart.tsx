import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  Award,
  BarChart3,
  LineChart as LineChartIcon,
  CheckCircle2,
} from 'lucide-react';
import { Church, Member, AttendanceRecord, ServiceSession, Language } from '../../types';

interface AdminSundayAttendanceChartProps {
  church: Church;
  members: Member[];
  services: ServiceSession[];
  attendanceRecords: AttendanceRecord[];
  language?: Language;
}

export const AdminSundayAttendanceChart: React.FC<AdminSundayAttendanceChartProps> = ({
  church,
  members,
  services,
  attendanceRecords,
  language = 'ht',
}) => {
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [showPercentage, setShowPercentage] = useState<boolean>(false);

  const isEs = language === 'es';
  const isFr = language === 'fr';
  const isEn = language === 'en';

  // Compute the last 4-5 Sundays covering a 1-month period
  const sundayData = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sunday
    const daysSinceSunday = currentDay === 0 ? 0 : currentDay;
    const latestSunday = new Date(today);
    latestSunday.setDate(today.getDate() - daysSinceSunday);

    const pastSundays: { dateStr: string; dateObj: Date }[] = [];
    // 5 Sundays (covers a full month of worship)
    for (let i = 4; i >= 0; i--) {
      const d = new Date(latestSunday);
      d.setDate(latestSunday.getDate() - i * 7);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      pastSundays.push({
        dateStr: `${year}-${month}-${day}`,
        dateObj: d,
      });
    }

    return pastSundays.map((sun, index) => {
      // Format day label according to language
      const dayNum = sun.dateObj.getDate();
      const monthShort = sun.dateObj.toLocaleDateString(
        isEs ? 'es-ES' : isFr ? 'fr-FR' : isEn ? 'en-US' : 'fr-HT',
        { month: 'short' }
      );

      const label = isEs
        ? `Dom ${dayNum} ${monthShort}`
        : isFr
        ? `Dim ${dayNum} ${monthShort}`
        : isEn
        ? `Sun ${monthShort} ${dayNum}`
        : `Dim ${dayNum} ${monthShort}`;

      // Filter all attendance records for this church on that Sunday
      const recordsOnSunday = attendanceRecords.filter((r) => {
        if (r.churchId && r.churchId !== church.id) return false;
        return r.serviceDate === sun.dateStr;
      });

      // Count unique members present
      const uniqueMemberIds = new Set(recordsOnSunday.map((r) => r.memberId || r.memberDbId));
      const totalPresent = uniqueMemberIds.size;

      // Find services held on this Sunday
      const servicesOnSunday = services.filter(
        (s) => s.churchId === church.id && s.date === sun.dateStr
      );
      const mainServiceName = servicesOnSunday[0]?.title || (isEs ? 'Culto Dominical' : isFr ? 'Culte Dominical' : isEn ? 'Sunday Service' : 'Kilt Dimanch');

      // Attendance percentage
      const totalMembersCount = members.length;
      const rate = totalMembersCount > 0 ? Math.round((totalPresent / totalMembersCount) * 100) : 0;

      // QR Scans vs Manual Check-ins
      const qrScans = recordsOnSunday.filter((r) => r.checkInMethod === 'qr_scan' || r.checkInMethod === 'barcode').length;
      const manualCheckins = recordsOnSunday.filter((r) => r.checkInMethod === 'manual').length;

      return {
        dateStr: sun.dateStr,
        label,
        weekName: isEs ? `Semana ${index + 1}` : isFr ? `Semaine ${index + 1}` : isEn ? `Week ${index + 1}` : `Semèn ${index + 1}`,
        totalPresent,
        rate,
        qrScans,
        manualCheckins,
        serviceTitle: mainServiceName,
        totalMembers: totalMembersCount,
      };
    });
  }, [attendanceRecords, church.id, members.length, services, isEs, isFr, isEn]);

  // Overall Statistics for the 1-month Sunday period
  const stats = useMemo(() => {
    const counts = sundayData.map((d) => d.totalPresent);
    const totalCheckinsMonth = counts.reduce((acc, c) => acc + c, 0);
    const average = counts.length > 0 ? Math.round(totalCheckinsMonth / counts.length) : 0;
    const peak = Math.max(...counts, 0);
    const peakSunday = sundayData.find((d) => d.totalPresent === peak);
    const lastSunday = sundayData[sundayData.length - 1];
    const prevSunday = sundayData[sundayData.length - 2];

    // Trend calculation
    let trend = 0;
    if (prevSunday && prevSunday.totalPresent > 0) {
      trend = Math.round(((lastSunday.totalPresent - prevSunday.totalPresent) / prevSunday.totalPresent) * 100);
    } else if (lastSunday.totalPresent > 0 && (!prevSunday || prevSunday.totalPresent === 0)) {
      trend = 100;
    }

    const avgRate = members.length > 0 ? Math.round((average / members.length) * 100) : 0;

    return {
      average,
      avgRate,
      peak,
      peakDate: peakSunday ? peakSunday.label : '-',
      lastSundayCount: lastSunday ? lastSunday.totalPresent : 0,
      trend,
    };
  }, [sundayData, members.length]);

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 border border-slate-700 p-3.5 rounded-2xl shadow-2xl backdrop-blur-md text-xs text-white space-y-2 min-w-[200px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-extrabold text-amber-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {data.label}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">{data.dateStr}</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">
                {isEs ? 'Manm Prezan:' : isFr ? 'Membres Présents :' : isEn ? 'Members Present:' : 'Manm Prezan:'}
              </span>
              <span className="font-extrabold text-emerald-400 text-sm font-mono">
                {data.totalPresent} <span className="text-[10px] text-slate-400">/ {data.totalMembers}</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-300">
                {isEs ? 'Tasa de Asistencia:' : isFr ? 'Taux de Présence :' : isEn ? 'Attendance Rate:' : 'Pousantaj:'}
              </span>
              <span className="font-bold text-amber-300 font-mono">{data.rate}%</span>
            </div>

            {data.totalPresent > 0 && (
              <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                <span>QR: <strong className="text-white font-mono">{data.qrScans}</strong></span>
                <span>{isEs ? 'Manual:' : isFr ? 'Manuel :' : isEn ? 'Manual:' : 'Manyèl:'} <strong className="text-white font-mono">{data.manualCheckins}</strong></span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#1E293B] rounded-3xl border border-slate-700/80 p-5 sm:p-6 shadow-xl space-y-5 h-full flex flex-col justify-between">
      {/* HEADER WITH CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white tracking-tight flex items-center gap-2">
                <span>
                  {isEs
                    ? 'Evolución de Asistencia Dominical'
                    : isFr
                    ? 'Évolution des Présences du Dimanche'
                    : isEn
                    ? 'Sunday Attendance Trends'
                    : 'Evolisyon Prezans Chak Dimanch'}
                </span>
                <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {isEs ? '1 Mes (5 Domingos)' : isFr ? '1 Mois (5 Dimanches)' : isEn ? '1 Month (5 Sundays)' : '1 Mwa (5 Dimanch)'}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isEs
                  ? 'Seguimiento visual de la participación de los miembros en los cultos dominicales.'
                  : isFr
                  ? 'Suivi visuel de la participation des membres aux cultes dominicaux.'
                  : isEn
                  ? 'Visual tracking of member engagement across recent Sunday worship services.'
                  : 'Swivi vizyèl patisipasyon manm yo nan kilt dimanch sou dènye mwa a.'}
              </p>
            </div>
          </div>
        </div>

        {/* CONTROLS (AREA VS BAR / COUNT VS PERCENTAGE) */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {/* Percentage Toggle */}
          <button
            type="button"
            onClick={() => setShowPercentage(!showPercentage)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              showPercentage
                ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md shadow-amber-400/20'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600'
            }`}
          >
            {showPercentage ? '% Pousantaj' : '# Kantite Manm'}
          </button>

          {/* Chart Type Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-700">
            <button
              type="button"
              onClick={() => setChartType('area')}
              title={isEs ? 'Gráfico de Área' : isFr ? 'Graphique en Aire' : isEn ? 'Area Chart' : 'Grafik zòn'}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                chartType === 'area'
                  ? 'bg-amber-400/20 text-amber-300 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LineChartIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setChartType('bar')}
              title={isEs ? 'Gráfico de Barras' : isFr ? 'Graphique en Barres' : isEn ? 'Bar Chart' : 'Grafik ba'}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                chartType === 'bar'
                  ? 'bg-amber-400/20 text-amber-300 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4 SUMMARY STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Average Sunday */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">
            <span>{isEs ? 'Promedio / Domingo' : isFr ? 'Moyenne / Dimanche' : isEn ? 'Avg / Sunday' : 'Mwayèn / Dimanch'}</span>
            <Users className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-white font-mono">{stats.average}</span>
            <span className="text-xs text-slate-400 font-medium">
              {isEs ? 'miembros' : isFr ? 'membres' : isEn ? 'members' : 'manm'}
            </span>
          </div>
          <span className="text-[10px] text-indigo-300 font-medium block mt-0.5">
            ≈ {stats.avgRate}% {isEs ? 'de la membresía' : isFr ? 'de l’assemblée' : isEn ? 'of members' : 'nan manm yo'}
          </span>
        </div>

        {/* Peak Sunday */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">
            <span>{isEs ? 'Pico Más Alto' : isFr ? 'Pic le Plus Élevé' : isEn ? 'Highest Peak' : 'Pik ki pi Wo'}</span>
            <Award className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono">{stats.peak}</span>
            <span className="text-xs text-slate-400 font-medium">
              {isEs ? 'miembros' : isFr ? 'membres' : isEn ? 'members' : 'manm'}
            </span>
          </div>
          <span className="text-[10px] text-amber-300/80 font-medium block mt-0.5 truncate">
            {stats.peakDate}
          </span>
        </div>

        {/* Last Sunday Check-ins */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">
            <span>{isEs ? 'Último Domingo' : isFr ? 'Dernier Dimanche' : isEn ? 'Last Sunday' : 'Dènye Dimanch'}</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">{stats.lastSundayCount}</span>
            <span className="text-xs text-slate-400 font-medium">
              {isEs ? 'presentes' : isFr ? 'présents' : isEn ? 'checked in' : 'prezan'}
            </span>
          </div>
          <span className="text-[10px] text-emerald-300/80 font-medium block mt-0.5">
            {sundayData[sundayData.length - 1]?.label}
          </span>
        </div>

        {/* Trend */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">
            <span>{isEs ? 'Tendencia' : isFr ? 'Tendance' : isEn ? 'Trend' : 'Tandans'}</span>
            {stats.trend >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            )}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-xl sm:text-2xl font-black font-mono ${
                stats.trend >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {stats.trend >= 0 ? `+${stats.trend}%` : `${stats.trend}%`}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
            {stats.trend >= 0
              ? (isEs ? 'Crecimiento semanal' : isFr ? 'Croissance hebdomadaire' : isEn ? 'Weekly growth' : 'Kwasans semèn sa')
              : (isEs ? 'Disminución semanal' : isFr ? 'Baisse hebdomadaire' : isEn ? 'Weekly drop' : 'Bès semèn sa')}
          </span>
        </div>
      </div>

      {/* RECHARTS CANVAS CONTAINER */}
      <div className="w-full h-[260px] sm:h-[300px] pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart
              data={sundayData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="sundayAttendanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.6} />

              <XAxis
                dataKey="label"
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#475569' }}
              />

              <YAxis
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#475569' }}
                domain={[0, showPercentage ? 100 : 'auto']}
                unit={showPercentage ? '%' : ''}
              />

              <Tooltip content={<CustomTooltip />} />

              <Area
                type="monotone"
                dataKey={showPercentage ? 'rate' : 'totalPresent'}
                name={
                  showPercentage
                    ? (isEs ? 'Tasa (%)' : isFr ? 'Taux (%)' : isEn ? 'Rate (%)' : 'Pousantaj (%)')
                    : (isEs ? 'Miembros Presentes' : isFr ? 'Membres Présents' : isEn ? 'Members Present' : 'Manm Prezan')
                }
                stroke={showPercentage ? '#10B981' : '#F59E0B'}
                strokeWidth={3}
                fillOpacity={1}
                fill={showPercentage ? 'url(#rateGradient)' : 'url(#sundayAttendanceGradient)'}
                activeDot={{ r: 6, fill: '#F59E0B', stroke: '#FFFFFF', strokeWidth: 2 }}
              />
            </AreaChart>
          ) : (
            <BarChart
              data={sundayData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.6} />

              <XAxis
                dataKey="label"
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#475569' }}
              />

              <YAxis
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#475569' }}
                domain={[0, showPercentage ? 100 : 'auto']}
                unit={showPercentage ? '%' : ''}
              />

              <Tooltip content={<CustomTooltip />} />

              <Bar
                dataKey={showPercentage ? 'rate' : 'totalPresent'}
                name={
                  showPercentage
                    ? (isEs ? 'Tasa (%)' : isFr ? 'Taux (%)' : isEn ? 'Rate (%)' : 'Pousantaj (%)')
                    : (isEs ? 'Miembros Presentes' : isFr ? 'Membres Présents' : isEn ? 'Members Present' : 'Manm Prezan')
                }
                fill={showPercentage ? '#10B981' : '#F59E0B'}
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* FOOTER NOTICE / ENCOURAGEMENT */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800 pt-3">
        <span className="flex items-center gap-1.5 text-slate-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
          <span>
            {isEs
              ? 'Los datos se actualizan en vivo al escanear los carnets con código QR de los miembros.'
              : isFr
              ? 'Les données se mettent à jour en direct lors du scan des cartes avec code QR.'
              : isEn
              ? 'Data updates in real time as member QR badges are scanned at the entrance.'
              : 'Done yo mete ajou an tan reyèl lè responsab yo ap eskane kòd QR sou kat manm yo.'}
          </span>
        </span>

        <span className="text-slate-400 font-mono hidden sm:inline">
          {members.length} {isEs ? 'miembros registrados' : isFr ? 'membres inscrits' : isEn ? 'registered members' : 'manm anrejistre'}
        </span>
      </div>
    </div>
  );
};
