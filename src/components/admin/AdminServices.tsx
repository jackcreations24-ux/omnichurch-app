import React, { useState } from 'react';
import { Church, ServiceSession, ServiceCategory, Language, Member } from '../../types';
import {
  addServiceSession,
  updateServiceSession,
  deleteServiceSession,
  setServiceActiveStatus,
  sendServiceReminderNotification,
  isServiceEnded,
  permanentlyEndService,
} from '../../utils/storage';
import { SERVICE_CATEGORIES } from '../../utils/i18n';
import { useToast } from '../../context/ToastContext';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import {
  Calendar,
  Clock,
  User,
  BookOpen,
  PlusCircle,
  Pencil,
  Trash2,
  CheckCircle2,
  Camera,
  X,
  Bell,
  Crown,
  Music,
  HeartHandshake,
  Users,
  Timer,
  Lock,
  BarChart3,
  StopCircle,
  RefreshCw,
} from 'lucide-react';

interface AdminServicesProps {
  church: Church;
  services: ServiceSession[];
  members?: Member[];
  onServicesChange?: () => void;
  onServicesUpdated?: () => void;
  onOpenScanner?: () => void;
  onNavigateToHistory?: (serviceId?: string) => void;
  language?: Language;
  initialCategory?: string;
}

export const AdminServices: React.FC<AdminServicesProps> = ({
  church,
  services,
  members = [],
  onServicesChange,
  onServicesUpdated,
  onOpenScanner,
  onNavigateToHistory,
  language = 'ht',
  initialCategory,
}) => {
  const toast = useToast();
  const isEs = language === 'es';
  const isEn = language === 'en';
  const isFr = language === 'fr';

  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'all');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [serviceToDelete, setServiceToDelete] = useState<ServiceSession | null>(null);
  const [serviceToEndPermanently, setServiceToEndPermanently] = useState<ServiceSession | null>(null);

  const notifyChange = () => {
    if (typeof onServicesChange === 'function') {
      onServicesChange();
    }
    if (typeof onServicesUpdated === 'function') {
      onServicesUpdated();
    }
  };

  // Form State
  const [editingService, setEditingService] = useState<ServiceSession | null>(null);
  const [category, setCategory] = useState<ServiceCategory>('dominical');
  const [title, setTitle] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>('08:30');
  const [endTime, setEndTime] = useState<string>('11:30');
  const [lateToleranceMinutes, setLateToleranceMinutes] = useState<number>(15);
  const [leader, setLeader] = useState<string>('');
  const [preacher, setPreacher] = useState<string>(church.pastor || '');
  const [reader, setReader] = useState<string>('');
  const [musicians, setMusicians] = useState<string>('');
  const [ushers, setUshers] = useState<string>('');
  const [theme, setTheme] = useState<string>('');
  const [passage, setPassage] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isOpenForAttendance, setIsOpenForAttendance] = useState<boolean>(true);
  const [sendReminder24h, setSendReminder24h] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const handleRefreshServices = () => {
    setIsRefreshing(true);
    notifyChange();
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success(
        isEs ? 'Servicios Actualizados' : isEn ? 'Services Refreshed' : isFr ? 'Services Actualisés' : 'Lis Sèvis Rafrechi',
        isEs
          ? 'La lista de servicios y estados de asistencia se ha sincronizado correctamente.'
          : isEn
          ? 'The services list and attendance statuses have been refreshed successfully.'
          : isFr
          ? 'La liste des cultes et les statuts de présence ont été mis à jour avec succès.'
          : 'Lis sèvis yo ak estati prezans yo senkronize ak siksè.'
      );
    }, 450);
  };

  const handleOpenCreate = () => {
    setEditingService(null);
    setCategory('dominical');
    setTitle('');
    setDate(new Date().toISOString().split('T')[0]);
    setStartTime('08:30');
    setEndTime('11:30');
    setLateToleranceMinutes(15);
    setLeader('');
    setPreacher(church.pastor || '');
    setReader('');
    setMusicians('');
    setUshers('');
    setTheme('');
    setPassage('');
    setNotes('');
    setIsOpenForAttendance(true);
    setSendReminder24h(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (service: ServiceSession) => {
    // Sekirite: Sèvis ki fini oswa klotire deja paka modifye
    if (isServiceEnded(service) || service.isPermanentlyEnded || !!service.endedAt) {
      toast.warning(
        isEs ? 'Servicio Finalizado y Archivado' : isEn ? 'Service Ended & Archived' : isFr ? 'Culte Terminé et Archivé' : 'Sèvis Fini & Klotire',
        isEs
          ? 'Este servicio ya concluyó o finalizó su horario. No se puede modificar.'
          : isEn
          ? 'This service has already concluded or ended. It cannot be edited.'
          : isFr
          ? 'Ce culte a déjà pris fin ou est archivé. Il ne peut plus être modifié.'
          : 'Kilt sa a fin ekoule epi li klotire. Li pa kapab modifye ankò.'
      );
      return;
    }

    setEditingService(service);
    setCategory(service.category);
    setTitle(service.title);
    setDate(service.date);
    setStartTime(service.startTime);
    setEndTime(service.endTime);
    setLateToleranceMinutes(service.lateToleranceMinutes ?? 15);
    setLeader(service.leader || '');
    setPreacher(service.preacher || service.preacherOrLeader || '');
    setReader(service.reader || '');
    setMusicians(service.musicians || '');
    setUshers(service.ushers || '');
    setTheme(service.theme || '');
    setPassage(service.passage || '');
    setNotes(service.notes || '');
    setIsOpenForAttendance(service.isOpenForAttendance);
    setSendReminder24h(service.sendReminder24h ?? false);
    setIsModalOpen(true);
  };

  const filteredServices = services.filter((s) => {
    if (selectedCategory === 'all') return true;
    return s.category === selectedCategory;
  });

  const handleToggleAttendance = (srv: ServiceSession) => {
    if (!srv.isOpenForAttendance && (isServiceEnded(srv) || srv.isPermanentlyEnded)) {
      toast.error(
        isEs ? 'Servicio Finalizado' : isEn ? 'Service Ended' : isFr ? 'Culte Terminé' : 'Sèvis Fini',
        isEs
          ? '¡Este servicio ha finalizado y ya pasó. No se puede volver a abrir!'
          : isEn
          ? 'This service has ended and passed. It cannot be reopened!'
          : language === 'fr'
          ? 'Ce culte est terminé et archivé. Il ne peut plus être rouvert !'
          : 'Kilt sa a fin ekoule epi li pase. Li pa kapab reouvri ankò!'
      );
      return;
    }

    const ok = setServiceActiveStatus(church.id, srv.id, !srv.isOpenForAttendance);
    if (!ok) {
      toast.error(
        isEs ? 'No se puede reabrir' : isEn ? 'Cannot Reopen' : isFr ? 'Impossible de rouvrir' : 'Pa kapab reouvri',
        isEs
          ? '¡Este servicio ha finalizado y ya pasó. No se puede volver a abrir!'
          : isEn
          ? 'This service has ended and passed. It cannot be reopened!'
          : 'Kilt sa a fin ekoule epi li pase. Li pa kapab reouvri ankò!'
      );
      return;
    }

    notifyChange();
    if (!srv.isOpenForAttendance) {
      toast.success(
        isEs ? 'Sesión Abierta para Escaneo' : isEn ? 'Session Open for Scanning' : isFr ? 'Session Ouverte pour le Scan' : 'Sesyon Louvri pou Scan',
        isEs ? 'Este culto está activo ahora para registro de asistencia.' : isEn ? 'This service is now active for attendance check-in.' : isFr ? 'Ce culte est maintenant actif pour l’enregistrement des présences.' : 'Kilt sa a aktif kounye a pou anrejistreman prezans.'
      );
    } else {
      toast.info(
        isEs ? 'Sesión Finalizada y Archivada' : isEn ? 'Service Closed & Archived' : isFr ? 'Session Fermée et Archivée' : 'Sesyon Fèmen & Anrejistre nan Istwa',
        isEs ? 'El servicio ha finalizado. Ha pasado al historial de servicios.' : isEn ? 'The service has ended. It has been archived in Service History.' : isFr ? 'Le culte est terminé. Il a été archivé dans l’historique.' : 'Sèvis la fin ekoule epi li anrejistre nan istwa kilt yo.'
      );
    }
  };

  const handleConfirmPermanentlyEnd = () => {
    if (!serviceToEndPermanently) return;
    permanentlyEndService(church.id, serviceToEndPermanently.id);
    notifyChange();
    toast.success(
      isEs ? 'Culto Finalizado' : isEn ? 'Service Concluded' : isFr ? 'Culte Clôturé' : 'Sèvis la Klotire',
      isEs
        ? `"${serviceToEndPermanently.title}" ha finalizado permanentemente. Las ausencias se registraron automáticamente y pasó al historial.`
        : isEn
        ? `"${serviceToEndPermanently.title}" has ended. Absences were recorded and the service is archived in history.`
        : isFr
        ? `"${serviceToEndPermanently.title}" est définitivement clôturé et archivé dans l’historique.`
        : `"${serviceToEndPermanently.title}" klotire kounye a. Tout moun ki pat prezan anrejistre kòm absan epi li pase nan istwa sèvis.`
    );
    setServiceToEndPermanently(null);
  };

  const handleSendReminder = (service: ServiceSession) => {
    sendServiceReminderNotification(church, service);
    notifyChange();

    let reminderDate = service.date;
    try {
      const sDate = new Date(service.date + 'T00:00:00');
      const dayBefore = new Date(sDate.getTime() - 24 * 60 * 60 * 1000);
      reminderDate = dayBefore.toISOString().split('T')[0];
    } catch {
      reminderDate = service.date;
    }

    toast.success(
      isEs ? '🔔 ¡Recordatorio Programado!' : isEn ? '🔔 Reminder Scheduled!' : isFr ? '🔔 Rappel Programmé !' : '🔔 Notifikasyon Rapèl Pwograme!',
      isEs
        ? `Recordatorio de 24h para "${service.title}" programado para todos los miembros (Fecha: ${reminderDate}).`
        : isEn
        ? `24h reminder for "${service.title}" scheduled for all members (Date: ${reminderDate}).`
        : isFr
        ? `Rappel de 24h pour "${service.title}" programmé pour tous les membres (Date : ${reminderDate}).`
        : `Rapèl 24h pou "${service.title}" pwograme pou tout manm yo (Dat rapèl: ${reminderDate}).`
    );
  };

  const handleDelete = (service: ServiceSession) => {
    setServiceToDelete(service);
  };

  const handleConfirmDelete = () => {
    if (!serviceToDelete) return;
    deleteServiceSession(church.id, serviceToDelete.id);
    notifyChange();
    toast.info(
      isEs ? 'Servicio Eliminado' : isEn ? 'Service Deleted' : isFr ? 'Service Supprimé' : 'Sèvis Efase',
      isEs
        ? `"${serviceToDelete.title}" eliminado del programa.`
        : isEn
        ? `"${serviceToDelete.title}" removed from schedule.`
        : isFr
        ? `"${serviceToDelete.title}" retiré du programme.`
        : `"${serviceToDelete.title}" retire nan orè a.`
    );
    setServiceToDelete(null);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error(
        isEs ? 'Falta el Título' : isEn ? 'Missing Title' : isFr ? 'Titre Manquant' : 'Tit Manke',
        isEs ? 'Por favor ingrese un título para el servicio.' : isEn ? 'Please enter a title for the service.' : isFr ? 'Veuillez saisir un titre pour le service.' : 'Tanpri bay yon tit pou sèvis la.'
      );
      return;
    }

    if (!startTime || !endTime) {
      toast.error(
        isEs ? 'Período Requerido' : isEn ? 'Period Required' : isFr ? 'Période Requise' : 'Peryòd Tan Manke',
        isEs ? 'Cada servicio debe tener una hora de inicio y de fin.' : isEn ? 'Each service must have a start and end time.' : isFr ? 'Chaque culte doit avoir une heure de début et de fin.' : 'Chak sèvis dwe gen yon lè kòmansman ak yon lè fini.'
      );
      return;
    }

    if (endTime <= startTime) {
      toast.error(
        isEs ? 'Hora de Fin Inválida' : isEn ? 'Invalid End Time' : isFr ? 'Heure de Fin Invalide' : 'Lè Fini Envalid',
        isEs ? 'La hora de finalización debe ser posterior a la hora de inicio.' : isEn ? 'End time must be later than start time.' : isFr ? 'L’heure de fin doit être postérieure à l’heure de début.' : 'Lè fini an dwe pi ta pase lè kòmansman an.'
      );
      return;
    }

    const finalLeader = leader.trim();
    const finalPreacher = preacher.trim();
    const finalReader = reader.trim();
    const finalMusicians = musicians.trim();
    const finalUshers = ushers.trim();
    const compositePreacherOrLeader = finalPreacher || finalLeader || church.pastor;

    if (editingService) {
      if (isServiceEnded(editingService) || editingService.isPermanentlyEnded || !!editingService.endedAt) {
        toast.error(
          isEs ? 'Servicio Finalizado' : isEn ? 'Service Ended' : isFr ? 'Culte Terminé' : 'Sèvis Fini & Klotire',
          isEs
            ? 'No se puede modificar un servicio que ya ha concluido y fue archivado.'
            : isEn
            ? 'Cannot edit a service that has already concluded and been archived.'
            : isFr
            ? 'Impossible de modifier un culte qui est déjà terminé et archivé.'
            : 'Ou pa kapab modifye yon sèvis ki deja fini epi klotire.'
        );
        setIsModalOpen(false);
        setEditingService(null);
        return;
      }

      updateServiceSession(church.id, editingService.id, {
        category,
        title: title.trim(),
        date,
        startTime,
        endTime,
        lateToleranceMinutes,
        leader: finalLeader || undefined,
        preacher: finalPreacher || undefined,
        reader: finalReader || undefined,
        musicians: finalMusicians || undefined,
        ushers: finalUshers || undefined,
        preacherOrLeader: compositePreacherOrLeader,
        theme: theme.trim() || undefined,
        passage: passage.trim() || undefined,
        notes: notes.trim() || undefined,
        isOpenForAttendance,
        sendReminder24h,
      });

      if (sendReminder24h && !editingService.sendReminder24h) {
        sendServiceReminderNotification(church, {
          ...editingService,
          category,
          title: title.trim(),
          date,
          startTime,
          endTime,
        });
      }

      notifyChange();
      setIsModalOpen(false);
      setEditingService(null);
      toast.success(
        isEs ? 'Servicio Actualizado' : isEn ? 'Service Updated' : isFr ? 'Service Mis à Jour' : 'Sèvis la Modifye',
        isEs
          ? `"${title.trim()}" ha sido modificado exitosamente (Tolerancia: ${lateToleranceMinutes} min).`
          : isEn
          ? `"${title.trim()}" updated successfully (Grace period: ${lateToleranceMinutes} min).`
          : isFr
          ? `"${title.trim()}" mis à jour avec succès (Tolérance : ${lateToleranceMinutes} min).`
          : `"${title.trim()}" modifye avèk siksè (Tolerans reta: ${lateToleranceMinutes} min).`
      );
      return;
    }

    const createdService = addServiceSession(church.id, {
      category,
      title: title.trim(),
      date,
      startTime,
      endTime,
      lateToleranceMinutes,
      leader: finalLeader || undefined,
      preacher: finalPreacher || undefined,
      reader: finalReader || undefined,
      musicians: finalMusicians || undefined,
      ushers: finalUshers || undefined,
      preacherOrLeader: compositePreacherOrLeader,
      theme: theme.trim() || undefined,
      passage: passage.trim() || undefined,
      notes: notes.trim() || undefined,
      isOpenForAttendance,
      sendReminder24h,
    });

    if (sendReminder24h) {
      sendServiceReminderNotification(church, createdService);
    }

    notifyChange();
    setIsModalOpen(false);
    toast.success(
      isEs ? '¡Nuevo Servicio Creado!' : isEn ? 'New Service Created!' : isFr ? 'Nouveau Service Créé !' : 'Nouvo Sèvis Kreye!',
      sendReminder24h
        ? isEs
          ? `"${title.trim()}" añadido al calendario y recordatorio de 24h programado para todos los miembros.`
          : isEn
          ? `"${title.trim()}" added to calendar and 24h reminder scheduled for all members.`
          : isFr
          ? `"${title.trim()}" ajouté au calendrier et rappel de 24h programmé pour tous les membres.`
          : `"${title.trim()}" ajoute nan orè a epi notifikasyon rapèl 24h pwograme pou tout manm yo.`
        : isEs
        ? `"${title.trim()}" añadido al calendario de la iglesia.`
        : isEn
        ? `"${title.trim()}" added to church calendar.`
        : isFr
        ? `"${title.trim()}" ajouté au calendrier de l'église.`
        : `"${title.trim()}" ajoute nan orè legliz la.`
    );
    setTitle('');
    setLeader('');
    setPreacher(church.pastor || '');
    setReader('');
    setMusicians('');
    setUshers('');
    setTheme('');
    setPassage('');
    setNotes('');
    setSendReminder24h(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {isEs ? 'Servicios & Cultos de la Iglesia (6 Secciones)' : isEn ? 'Church Services & Worship (6 Sections)' : isFr ? 'Services & Cultes de l’Église (6 Sections)' : 'Sèvis & Kilt Legliz la (6 Seksyon)'}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-mono">
              {services.length} {isEs ? 'Sesiones' : isEn ? 'Sessions' : isFr ? 'Sessions' : 'Sesyon'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            {isEs
              ? 'Organice los servicios por departamento y abra sesiones para detección automática en el escáner.'
              : isEn
              ? 'Organize worship services by department and open sessions for instant barcode / QR scanning.'
              : isFr
              ? 'Organisez les cultes par département et ouvrez les sessions pour la détection automatique au scanner.'
              : 'Òganize sèvis yo pa depatman epi louvri sesyon pou deteksyon otomatik nan scanner la.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            id="btn-admin-services-refresh"
            onClick={handleRefreshServices}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-bold text-xs shadow transition-all cursor-pointer disabled:opacity-50"
            title={isEs ? 'Refrescar Servicios' : isEn ? 'Refresh Services' : isFr ? 'Rafraîchir les Services' : 'Rafrechi Lis Sèvis yo'}
          >
            <RefreshCw className={`w-4 h-4 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isEs ? 'Refrescar' : isEn ? 'Refresh' : isFr ? 'Rafraîchir' : 'Rafrechi'}</span>
          </button>
          {onNavigateToHistory && (
            <button
              type="button"
              id="btn-admin-services-history"
              onClick={() => onNavigateToHistory()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 font-bold text-xs shadow transition-all cursor-pointer"
            >
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <span>{isEs ? 'Historial de Cultos' : isEn ? 'Service History' : isFr ? 'Historique Cultes' : 'Istwa Sèvis'}</span>
            </button>
          )}
          {onOpenScanner && (
            <button
              type="button"
              id="btn-admin-services-scan"
              onClick={onOpenScanner}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>{isEs ? 'Escanear Asistencia' : isEn ? 'Scan Attendance' : isFr ? 'Scanner Présence' : 'Scanner Prezans'}</span>
            </button>
          )}
          <button
            type="button"
            id="btn-open-create-service-modal"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 shadow transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-amber-400" />
            <span>{isEs ? 'Crear un Servicio' : isEn ? 'Create Service' : isFr ? 'Créer un Service' : 'Kreye yon Sèvis'}</span>
          </button>
        </div>
      </div>

      {/* 6 SECTION FILTER PILLS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          type="button"
          id="btn-filter-all-services"
          onClick={() => setSelectedCategory('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-amber-400 text-slate-950 shadow-sm'
              : 'bg-[#1E293B] text-slate-300 hover:bg-slate-800 border border-slate-700'
          }`}
        >
          {isEs ? `Todos los Servicios (${services.length})` : isEn ? `All Services (${services.length})` : isFr ? `Tous les Services (${services.length})` : `Tout Sèvis Yo (${services.length})`}
        </button>

        {Object.values(SERVICE_CATEGORIES).map((cat) => {
          const count = services.filter((s) => s.category === cat.id).length;
          const catName = isEs ? cat.name.es : isEn ? (cat.name as any).en || cat.name.ht : isFr ? (cat.name as any).fr || cat.name.ht : cat.name.ht;
          return (
            <button
              key={cat.id}
              type="button"
              id={`btn-filter-cat-${cat.id}`}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                  : 'bg-[#1E293B] text-slate-300 hover:bg-slate-800 border-slate-700'
              }`}
            >
              {cat.code} — {catName} ({count})
            </button>
          );
        })}
      </div>

      {/* SERVICES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredServices.map((srv) => {
          const catConfig = SERVICE_CATEGORIES[srv.category];
          const catName = catConfig ? (isEs ? catConfig.name.es : isEn ? (catConfig.name as any).en || catConfig.name.ht : isFr ? (catConfig.name as any).fr || catConfig.name.ht : catConfig.name.ht) : srv.category;
          const ended = isServiceEnded(srv) || srv.isPermanentlyEnded;
          return (
            <div
              key={srv.id}
              id={`admin-service-card-${srv.id}`}
              className={`p-5 rounded-2xl bg-[#1E293B] border transition-all flex flex-col justify-between ${
                srv.isOpenForAttendance
                  ? 'border-emerald-500/80 shadow-md ring-1 ring-emerald-500/50 bg-gradient-to-br from-[#1E293B] to-emerald-950/20'
                  : 'border-slate-700/80 shadow-sm hover:border-slate-600'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {catConfig && (
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${catConfig.badgeBg}`}>
                        {catConfig.code} • {catName}
                      </span>
                    )}
                    {ended ? (
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-400" />
                        {isEs ? 'CULTO FINALIZADO' : isEn ? 'SERVICE ENDED' : isFr ? 'CULTE TERMINÉ' : 'SÈVIS FINI & PASE'}
                      </span>
                    ) : srv.isOpenForAttendance ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        {isEs ? 'ACTIVO PARA ESCANEO' : isEn ? 'ACTIVE FOR SCAN' : isFr ? 'ACTIF POUR LE SCAN' : 'AKTIF POU SCAN'}
                      </span>
                    ) : null}
                    {srv.sendReminder24h && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-extrabold flex items-center gap-1">
                        <Bell className="w-3 h-3 text-amber-400" />
                        {isEs ? 'RECORDATORIO 24H ACTIVO' : isEn ? '24H REMINDER ACTIVE' : isFr ? 'RAPPEL 24H ACTIF' : 'RAPÈL 24H PWOGRAME'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {ended ? (
                      <button
                        type="button"
                        id={`btn-edit-service-${srv.id}-locked`}
                        onClick={() => handleOpenEdit(srv)}
                        className="p-1.5 text-slate-500 hover:text-amber-400/80 bg-slate-800/40 rounded-lg cursor-not-allowed opacity-60 transition-colors"
                        title={isEs ? 'Servicio Finalizado (No modificable)' : isEn ? 'Service Ended (Locked)' : isFr ? 'Culte Terminé (Verrouillé)' : 'Sèvis Fini & Klotire (Paka modifye)'}
                      >
                        <Lock className="w-4 h-4 text-slate-500" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        id={`btn-edit-service-${srv.id}`}
                        onClick={() => handleOpenEdit(srv)}
                        className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg cursor-pointer transition-colors"
                        title={isEs ? 'Editar Servicio (Lápiz)' : isEn ? 'Edit Service (Pencil)' : isFr ? 'Modifier le Service (Crayon)' : 'Modifye Sèvis (Krayon)'}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      id={`btn-delete-service-${srv.id}`}
                      onClick={() => handleDelete(srv)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 rounded-lg cursor-pointer transition-colors"
                      title={isEs ? 'Eliminar Servicio' : isEn ? 'Delete Service' : isFr ? 'Supprimer le Service' : 'Efase Sèvis'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-white mb-2 leading-snug">
                  {srv.title}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-300 mb-3">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{srv.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{srv.startTime} - {srv.endTime}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Timer className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      <strong className="text-slate-400">{isEs ? 'Retardo:' : isEn ? 'Grace:' : isFr ? 'Tolérance:' : 'Reta:'}</strong>{' '}
                      <span className="text-amber-300 font-bold font-mono">+{srv.lateToleranceMinutes ?? 15} min</span>
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/80 text-xs space-y-1.5 text-slate-300 mb-3">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <div className="flex items-center gap-1.5 font-medium text-slate-200">
                      <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span><strong className="text-slate-400">{isEs ? 'Director:' : isEn ? 'Leader:' : isFr ? 'Dirigeant :' : 'Dirijan:'}</strong> {srv.leader || srv.preacherOrLeader}</span>
                    </div>
                    {srv.preacher && srv.preacher !== srv.leader && (
                      <div className="flex items-center gap-1.5 font-medium text-amber-300">
                        <span><strong className="text-amber-400/80">{isEs ? 'Predicador:' : isEn ? 'Preacher:' : isFr ? 'Prédicateur :' : 'Predikatè:'}</strong> {srv.preacher}</span>
                      </div>
                    )}
                    {srv.reader && (
                      <div className="flex items-center gap-1.5 font-medium text-sky-300">
                        <BookOpen className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span><strong className="text-sky-400/80">{isEs ? 'Lector:' : isEn ? 'Reader:' : isFr ? 'Lecteur :' : 'Lektè:'}</strong> {srv.reader}</span>
                      </div>
                    )}
                    {srv.musicians && (
                      <div className="flex items-center gap-1.5 font-medium text-purple-300">
                        <span className="text-purple-400">🎵</span>
                        <span><strong className="text-purple-400/80">{isEs ? 'Música y Coro:' : isEn ? 'Music & Choir:' : isFr ? 'Musique & Chorale :' : 'Mizisyen & Koral:'}</strong> {srv.musicians}</span>
                      </div>
                    )}
                    {srv.ushers && (
                      <div className="flex items-center gap-1.5 font-medium text-rose-300">
                        <span className="text-rose-400">🤝</span>
                        <span><strong className="text-rose-400/80">{isEs ? 'Protocolo:' : isEn ? 'Ushers:' : isFr ? 'Protocole :' : 'Akèy & Pwotokòl:'}</strong> {srv.ushers}</span>
                      </div>
                    )}
                  </div>
                  {srv.theme && (
                    <div className="text-slate-300 pt-0.5">
                      <span className="font-semibold text-slate-400">{isEs ? 'Tema:' : isEn ? 'Theme:' : isFr ? 'Thème :' : 'Tèm:'}</span> {srv.theme}
                    </div>
                  )}
                  {srv.passage && (
                    <div className="flex items-center gap-1.5 text-indigo-300 font-medium">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>{srv.passage}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ACTION TOGGLE & REMINDER */}
              <div className="pt-3 border-t border-slate-700/80 flex flex-wrap items-center justify-between gap-2">
                {ended ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 bg-slate-800/90 text-slate-400 border border-slate-700/80 cursor-not-allowed">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{isEs ? 'Finalizado (No reabrible)' : isEn ? 'Ended (Cannot reopen)' : isFr ? 'Terminé (Non rouvrable)' : 'Sèvis Fini (Pa ka reouvri)'}</span>
                    </span>

                    {onNavigateToHistory && (
                      <button
                        type="button"
                        id={`btn-service-history-${srv.id}`}
                        onClick={() => onNavigateToHistory(srv.id)}
                        className="px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 transition-colors cursor-pointer"
                      >
                        <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{isEs ? 'Ver en Historial' : isEn ? 'View in History' : isFr ? 'Voir dans l’Historique' : 'Gade nan Istwa'}</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      id={`btn-toggle-service-attendance-${srv.id}`}
                      onClick={() => handleToggleAttendance(srv)}
                      className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                        srv.isOpenForAttendance
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
                          : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {srv.isOpenForAttendance
                          ? isEs ? 'Cerrar Asistencia' : isEn ? 'Close Check-in' : isFr ? 'Fermer Présence' : 'Fèmen Prezans'
                          : isEs ? 'Abrir para Asistencia (Activo)' : isEn ? 'Open Check-in (Active)' : isFr ? 'Ouvrir pour Présence (Actif)' : 'Louvri pou Prezans (Aktif)'}
                      </span>
                    </button>

                    {srv.isOpenForAttendance && (
                      <button
                        type="button"
                        id={`btn-conclude-service-${srv.id}`}
                        onClick={() => setServiceToEndPermanently(srv)}
                        className="px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 transition-colors cursor-pointer"
                        title={isEs ? 'Finalizar culto y archivar en historial' : isEn ? 'End service and archive in history' : isFr ? 'Clôturer le culte et archiver' : 'Klotire kilt la epi anrejistre li nan istwa'}
                      >
                        <StopCircle className="w-3.5 h-3.5 text-rose-400" />
                        <span>{isEs ? 'Finalizar Culto' : isEn ? 'End Service' : isFr ? 'Clôturer Culte' : 'Kloti Sèvis'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      id={`btn-service-reminder-${srv.id}`}
                      onClick={() => handleSendReminder(srv)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                        srv.sendReminder24h
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                          : 'bg-slate-800 text-slate-300 hover:text-amber-300 hover:bg-slate-700 border border-slate-700'
                      }`}
                      title={isEs ? 'Enviar o programar notificación de recordatorio 24h antes del culto' : isEn ? 'Send or schedule 24h service reminder notification' : isFr ? 'Envoyer ou programmer un rappel 24h avant le culte' : 'Voye oswa Pwograme notifikasyon rapèl bay tout manm yo 24h anvan kilt sa a'}
                    >
                      <Bell className="w-3.5 h-3.5 text-amber-400" />
                      <span>{srv.sendReminder24h ? (isEs ? 'Recordatorio 24h Activo' : isEn ? '24h Reminder Set' : isFr ? 'Rappel 24h Actif' : 'Rapèl 24h Pwograme') : (isEs ? 'Enviar Recordatorio (24h)' : isEn ? 'Send Reminder (24h)' : isFr ? 'Envoyer Rappel (24h)' : 'Voye Rapèl (24h)')}</span>
                    </button>
                  </div>
                )}

                {!ended && srv.isOpenForAttendance && onOpenScanner && (
                  <button
                    type="button"
                    onClick={onOpenScanner}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isEs ? 'Escanear Ahora' : isEn ? 'Scan Now' : isFr ? 'Scanner Maintenant' : 'Scan Kounye a'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE SERVICE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-[#1E293B] rounded-2xl shadow-2xl border border-slate-700 overflow-hidden my-auto text-slate-200">
            <div className="bg-[#0F172A] text-white p-4 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2">
                {editingService ? (
                  <Pencil className="w-4 h-4 text-amber-400" />
                ) : (
                  <Calendar className="w-4 h-4 text-amber-400" />
                )}
                <h3 className="font-bold text-sm text-white">
                  {editingService
                    ? isEs
                      ? `Editar Servicio: ${editingService.title}`
                      : isEn
                      ? `Edit Service: ${editingService.title}`
                      : isFr
                      ? `Modifier le Service : ${editingService.title}`
                      : `Modifye Sèvis: ${editingService.title}`
                    : isEs
                    ? `Crear un Nuevo Servicio en ${church.name}`
                    : isEn
                    ? `Create New Service in ${church.name}`
                    : isFr
                    ? `Créer un Nouveau Service à ${church.name}`
                    : `Kreye yon Nouvo Sèvis nan ${church.name}`}
                </h3>
              </div>
              <button
                type="button"
                id="btn-close-service-modal"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingService(null);
                }}
                className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-3.5 text-xs">
              {/* Category (6 Sections) */}
              <div>
                <label htmlFor="select-srv-cat" className="text-slate-300 font-bold block mb-1">
                  {isEs ? 'Categoría de Servicio (Elija una de las 6 Secciones) *' : isEn ? 'Service Category (Choose one of 6 Sections) *' : isFr ? 'Catégorie de Service (Choisissez une des 6 Sections) *' : 'Kategori Sèvis (Chwazi youn nan 6 Seksyon yo) *'}
                </label>
                <select
                  id="select-srv-cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ServiceCategory)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white font-medium focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
                >
                  {Object.values(SERVICE_CATEGORIES).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {isEs ? c.name.es : isEn ? (c.name as any).en || c.name.ht : isFr ? (c.name as any).fr || c.name.ht : c.name.ht}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label htmlFor="input-srv-title" className="text-slate-300 font-bold block mb-1">
                  {isEs ? 'Título del Servicio *' : isEn ? 'Service Title *' : isFr ? 'Titre du Service *' : 'Tit Sèvis la *'}
                </label>
                <input
                  id="input-srv-title"
                  type="text"
                  required
                  placeholder={isEs ? 'ej: Gran Culto Dominical de Adoración' : isEn ? 'e.g.: Sunday Celebration & Worship Service' : isFr ? 'ex: Grand Culte Dominical d’Adoration' : 'eg: Grand Culte Dominical d’Adoration'}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
                />
              </div>

              {/* Date & Times */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="input-srv-date" className="text-slate-300 font-bold block mb-1">
                    {isEs ? 'Fecha' : isEn ? 'Date' : isFr ? 'Date' : 'Dat'}
                  </label>
                  <input
                    id="input-srv-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="input-srv-start" className="text-slate-300 font-bold block mb-1">
                    {isEs ? 'Hora de Inicio' : isEn ? 'Start Time' : isFr ? 'Heure de Début' : 'Lè Kòmansman'}
                  </label>
                  <input
                    id="input-srv-start"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="input-srv-end" className="text-slate-300 font-bold block mb-1">
                    {isEs ? 'Hora de Fin' : isEn ? 'End Time' : isFr ? 'Heure de Fin' : 'Lè Fini'}
                  </label>
                  <input
                    id="input-srv-end"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* LATE TOLERANCE / HEURE DE RETARD CUSTOM */}
              <div className="p-3.5 bg-slate-900/90 rounded-xl border border-amber-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="input-srv-late-tolerance" className="text-slate-200 font-bold flex items-center gap-1.5">
                    <Timer className="w-4 h-4 text-amber-400" />
                    <span>{isEs ? 'Tolerancia de Retardo (Minutos) *' : isEn ? 'Lateness Grace Period (Minutes) *' : isFr ? 'Tolérance de Retard (Minutes) *' : 'Tolerans Reta (Konbyen Minit de Reta) *'}</span>
                  </label>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 font-mono font-bold text-xs">
                    +{lateToleranceMinutes} min
                  </span>
                </div>
                
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {isEs
                    ? 'Los miembros que escaneen después de esta cantidad de minutos desde el inicio serán marcados como "Con Retardo". Quienes no escaneen al terminar el servicio serán marcados automáticamente como ausentes.'
                    : isEn
                    ? 'Members checking in after this grace period from start time are marked "Late". Anyone who hasn’t scanned when the service ends is automatically logged as absent.'
                    : isFr
                    ? 'Les membres qui scannent après ce délai depuis le début seront marqués "En Retard". Ceux qui ne scannent pas à la fin du culte seront automatiquement inscrits aux absents.'
                    : 'Manm ki eskane apre kantite minit sa a fin pase ap make kòm "An Reta". Moun ki pa t eskane ditou ap pase otomatikman nan lis absans kou kilt la fin ekoule.'}
                </p>

                {/* Quick preset chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {[5, 10, 15, 20, 30, 45, 60].map((mins) => (
                    <button
                      key={`tolerance-preset-${mins}`}
                      type="button"
                      id={`btn-tolerance-preset-${mins}`}
                      onClick={() => setLateToleranceMinutes(mins)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        lateToleranceMinutes === mins
                          ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold shadow'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {mins} min
                    </button>
                  ))}
                  <div className="flex items-center gap-1.5 ml-auto pt-1 sm:pt-0">
                    <span className="text-[11px] text-slate-400">{isEs ? 'Personalizado:' : isEn ? 'Custom:' : isFr ? 'Personnalisé :' : 'Koutim:'}</span>
                    <input
                      id="input-srv-late-tolerance"
                      type="number"
                      min={0}
                      max={180}
                      value={lateToleranceMinutes}
                      onChange={(e) => setLateToleranceMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-16 px-2 py-1 rounded-md border border-slate-700 bg-slate-950 text-white font-mono font-bold text-xs text-center focus:ring-1 focus:ring-amber-400 focus:outline-none"
                    />
                    <span className="text-xs text-slate-400">min</span>
                  </div>
                </div>
              </div>

              {/* 5 DISTINCT ROLES WITH QUICK MEMBER ASSIGNMENT */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label htmlFor="input-srv-leader" className="text-slate-300 font-bold flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isEs ? 'Director del Servicio' : isEn ? 'Service Leader' : isFr ? 'Dirigeant du Culte' : 'Dirijan Sèvis la'}</span>
                    </label>
                  </div>
                  {members.length > 0 && (
                    <select
                      id="select-quick-srv-leader"
                      onChange={(e) => {
                        if (e.target.value) {
                          setLeader(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="w-full text-[11px] py-1 px-2 rounded-md bg-slate-950/80 border border-slate-700 text-amber-300 font-medium focus:ring-1 focus:ring-amber-400 focus:outline-none cursor-pointer mb-1"
                    >
                      <option value="">{isEs ? '⚡ Asignar Miembro Registrado...' : isFr ? '⚡ Assigner Membre Enregistré...' : isEn ? '⚡ Assign Registered Member...' : '⚡ Chwazi yon Manm ki anrejistre...'}</option>
                      {members.map((m) => {
                        const formatted = `${m.titlePrefix ? `${m.titlePrefix} ` : ''}${m.fullName}`;
                        return (
                          <option key={`lead-${m.id}`} value={formatted}>
                            {formatted} • ({m.role || 'Manm'})
                          </option>
                        );
                      })}
                    </select>
                  )}
                  <input
                    id="input-srv-leader"
                    type="text"
                    placeholder={isEs ? 'ej: Hno. Jonas Paul' : isEn ? 'e.g.: Bro. Jonas Paul' : isFr ? 'ex: Fr. Jonas Paul' : 'eg: Frè Jonas Paul'}
                    value={leader}
                    onChange={(e) => setLeader(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label htmlFor="input-srv-preacher" className="text-slate-300 font-bold flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isEs ? 'Predicador' : isEn ? 'Preacher' : isFr ? 'Prédicateur' : 'Predikatè'}</span>
                    </label>
                  </div>
                  {members.length > 0 && (
                    <select
                      id="select-quick-srv-preacher"
                      onChange={(e) => {
                        if (e.target.value) {
                          setPreacher(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="w-full text-[11px] py-1 px-2 rounded-md bg-slate-950/80 border border-slate-700 text-emerald-300 font-medium focus:ring-1 focus:ring-emerald-400 focus:outline-none cursor-pointer mb-1"
                    >
                      <option value="">{isEs ? '⚡ Asignar Predicador / Pastor...' : isFr ? '⚡ Assigner Prédicateur / Pasteur...' : isEn ? '⚡ Assign Preacher / Speaker...' : '⚡ Chwazi Predikatè / Pastè...'}</option>
                      {church.pastor && (
                        <option value={church.pastor}>
                          ★ {church.pastor} (Pastor Titular)
                        </option>
                      )}
                      {members.map((m) => {
                        const formatted = `${m.titlePrefix ? `${m.titlePrefix} ` : ''}${m.fullName}`;
                        return (
                          <option key={`preach-${m.id}`} value={formatted}>
                            {formatted} • ({m.role || 'Manm'})
                          </option>
                        );
                      })}
                    </select>
                  )}
                  <input
                    id="input-srv-preacher"
                    type="text"
                    placeholder={isEs ? 'ej: Pastor Jean-Claude Voltaire' : isEn ? 'e.g.: Pastor Jean-Claude Voltaire' : isFr ? 'ex: Pasteur Jean-Claude Voltaire' : 'eg: Pastè Jean-Claude Voltaire'}
                    value={preacher}
                    onChange={(e) => setPreacher(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label htmlFor="input-srv-reader" className="text-slate-300 font-bold flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{isEs ? 'Lector Bíblico' : isEn ? 'Bible Reader' : isFr ? 'Lecteur (Lecture)' : 'Lektè (Lekti Biblik)'}</span>
                    </label>
                  </div>
                  {members.length > 0 && (
                    <select
                      id="select-quick-srv-reader"
                      onChange={(e) => {
                        if (e.target.value) {
                          setReader(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="w-full text-[11px] py-1 px-2 rounded-md bg-slate-950/80 border border-slate-700 text-cyan-300 font-medium focus:ring-1 focus:ring-cyan-400 focus:outline-none cursor-pointer mb-1"
                    >
                      <option value="">{isEs ? '⚡ Asignar Lector de la Palabra...' : isFr ? '⚡ Assigner Lecteur...' : isEn ? '⚡ Assign Scripture Reader...' : '⚡ Chwazi Lektè Pawòl la...'}</option>
                      {members.map((m) => {
                        const formatted = `${m.titlePrefix ? `${m.titlePrefix} ` : ''}${m.fullName}`;
                        return (
                          <option key={`read-${m.id}`} value={formatted}>
                            {formatted} • ({m.role || 'Manm'})
                          </option>
                        );
                      })}
                    </select>
                  )}
                  <input
                    id="input-srv-reader"
                    type="text"
                    placeholder={isEs ? 'ej: Hna. Marie Yolande' : isEn ? 'e.g.: Sis. Marie Yolande' : isFr ? 'ex: Sr Marie Yolande' : 'eg: Sè Marie Yolande'}
                    value={reader}
                    onChange={(e) => setReader(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* MUSIC & USHERS WITH QUICK ASSIGN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label htmlFor="input-srv-musicians" className="text-slate-300 font-bold flex items-center gap-1">
                      <Music className="w-3.5 h-3.5 text-purple-400" />
                      <span>{isEs ? 'Música, Coro y Alabanza' : isEn ? 'Musicians & Worship Team' : isFr ? 'Musiciens & Chorale' : 'Mizisyen, Koral & Louanj'}</span>
                    </label>
                  </div>
                  {members.length > 0 && (
                    <select
                      id="select-quick-srv-musicians"
                      onChange={(e) => {
                        if (e.target.value) {
                          setMusicians(prev => prev ? `${prev}, ${e.target.value}` : e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="w-full text-[11px] py-1 px-2 rounded-md bg-slate-950/80 border border-slate-700 text-purple-300 font-medium focus:ring-1 focus:ring-purple-400 focus:outline-none cursor-pointer mb-1"
                    >
                      <option value="">{isEs ? '+ Agregar Músico / Corista...' : isFr ? '+ Ajouter Musicien / Choriste...' : isEn ? '+ Add Musician / Vocalist...' : '+ Ajoute Chantre / Mizisyen...'}</option>
                      {members.map((m) => {
                        const formatted = `${m.titlePrefix ? `${m.titlePrefix} ` : ''}${m.fullName}`;
                        return (
                          <option key={`mus-${m.id}`} value={formatted}>
                            {formatted} • ({m.role || m.department || 'Mizik'})
                          </option>
                        );
                      })}
                    </select>
                  )}
                  <input
                    id="input-srv-musicians"
                    type="text"
                    placeholder={isEs ? 'ej: Hno. David & Grupo Filadelfia' : isEn ? 'e.g.: Bro. David & Philadelphia Choir' : isFr ? 'ex: Fr. David & Groupe Philadelphie' : 'eg: Frè David & Gwoup Filadèlfi'}
                    value={musicians}
                    onChange={(e) => setMusicians(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-purple-400 focus:border-purple-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label htmlFor="input-srv-ushers" className="text-slate-300 font-bold flex items-center gap-1">
                      <HeartHandshake className="w-3.5 h-3.5 text-rose-400" />
                      <span>{isEs ? 'Protocolo y Bienvenida' : isEn ? 'Ushers & Hospitality Team' : isFr ? 'Accueil & Protocole' : 'Akèy & Pwotokòl'}</span>
                    </label>
                  </div>
                  {members.length > 0 && (
                    <select
                      id="select-quick-srv-ushers"
                      onChange={(e) => {
                        if (e.target.value) {
                          setUshers(prev => prev ? `${prev}, ${e.target.value}` : e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="w-full text-[11px] py-1 px-2 rounded-md bg-slate-950/80 border border-slate-700 text-rose-300 font-medium focus:ring-1 focus:ring-rose-400 focus:outline-none cursor-pointer mb-1"
                    >
                      <option value="">{isEs ? '+ Agregar Protocolo / Diácono...' : isFr ? '+ Ajouter Protocole / Diacre...' : isEn ? '+ Add Usher / Deacon...' : '+ Ajoute Akèy / Dyak...'}</option>
                      {members.map((m) => {
                        const formatted = `${m.titlePrefix ? `${m.titlePrefix} ` : ''}${m.fullName}`;
                        return (
                          <option key={`ush-${m.id}`} value={formatted}>
                            {formatted} • ({m.role || m.department || 'Akèy'})
                          </option>
                        );
                      })}
                    </select>
                  )}
                  <input
                    id="input-srv-ushers"
                    type="text"
                    placeholder={isEs ? 'ej: Comité de Bienvenida / Diáconos' : isEn ? 'e.g.: Hospitality Team / Deacons' : isFr ? 'ex: Comité d’accueil / Diacres' : 'eg: Ekip Akèy & Dyak'}
                    value={ushers}
                    onChange={(e) => setUshers(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-rose-400 focus:border-rose-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Theme & Passage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="input-srv-theme" className="text-slate-300 font-bold block mb-1">
                    {isEs ? 'Tema / Mensaje (Opcional)' : isEn ? 'Theme / Message (Optional)' : isFr ? 'Thème / Message (Optionnel)' : 'Tèm / Mesaj (Opsyonèl)'}
                  </label>
                  <input
                    id="input-srv-theme"
                    type="text"
                    placeholder={isEs ? 'ej: La gracia de Dios es suficiente' : isEn ? 'e.g.: God’s grace is sufficient' : isFr ? 'ex: La grâce de Dieu nous suffit' : 'eg: Gras Bondye sifi pou lavi nou'}
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="input-srv-passage" className="text-slate-300 font-bold block mb-1">
                    {isEs ? 'Pasaje Bíblico' : isEn ? 'Scripture Passage' : isFr ? 'Passage Biblique' : 'Pasaj Biblik'}
                  </label>
                  <input
                    id="input-srv-passage"
                    type="text"
                    placeholder={isEs ? 'ej: 2 Corintios 12:9' : isEn ? 'e.g.: 2 Corinthians 12:9' : isFr ? 'ex: 2 Corinthiens 12:9' : 'eg: 2 Korentyen 12:9'}
                    value={passage}
                    onChange={(e) => setPassage(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* 24h Reminder Notification Toggle */}
              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/30">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    id="checkbox-send-reminder-24h"
                    checked={sendReminder24h}
                    onChange={(e) => setSendReminder24h(e.target.checked)}
                    className="mt-0.5 rounded text-amber-400 focus:ring-amber-400 bg-slate-900 border-slate-700"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-bold text-amber-300">
                        {isEs
                          ? 'Enviar notificación de "Recordatorio" a todos los miembros 24 horas antes del servicio'
                          : isEn
                          ? 'Send "Reminder" push notification to all members 24 hours prior to service'
                          : isFr
                          ? 'Envoyer une notification de rappel à tous les membres 24 heures avant le service'
                          : 'Voye notifikasyon \'Rapèl\' bay tout manm yo 24 èdtan anvan sèvis la'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      {isEs
                        ? 'El sistema programará automáticamente un recordatorio para todos los miembros 24 horas antes del servicio.'
                        : isEn
                        ? 'The system will automatically schedule a notification 24 hours before the service begins.'
                        : isFr
                        ? 'Le système planifiera automatiquement un rappel pour tous les membres 24 heures avant le début du culte.'
                        : 'Sistèm nan ap pwograme otomatikman yon notifikasyon rapèl pou tout manm yo 24 èdtan anvan lè sèvis la kòmanse.'}
                    </span>
                  </div>
                </label>
              </div>

              {/* Open for Attendance Checkbox */}
              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isOpenForAttendance}
                    onChange={(e) => setIsOpenForAttendance(e.target.checked)}
                    className="rounded text-amber-400 focus:ring-amber-400 bg-slate-900 border-slate-700"
                  />
                  <div>
                    <span className="font-bold text-emerald-300 block">
                      {isEs ? 'Abrir este servicio inmediatamente para asistencia (Activo)' : isEn ? 'Open this service immediately for check-in (Active)' : isFr ? 'Ouvrir ce culte immédiatement pour l’enregistrement des présences (Actif)' : 'Louvri sèvis sa a imedyatman pou prezans (Aktif)'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {isEs ? 'El escáner QR se conectará automáticamente a esta sesión.' : isEn ? 'The QR scanner will connect automatically to this session.' : isFr ? 'Le scanner QR se connectera automatiquement à cette session.' : 'Scanner QR la ap konekte otomatikman sou sesyon sa a.'}
                    </span>
                  </div>
                </label>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-700 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingService(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:text-white font-semibold cursor-pointer"
                >
                  {isEs ? 'Cancelar' : isEn ? 'Cancel' : isFr ? 'Annuler' : 'Anile'}
                </button>
                <button
                  type="submit"
                  id="btn-submit-create-service"
                  className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold flex items-center gap-1.5 shadow cursor-pointer"
                >
                  {editingService ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                  ) : (
                    <PlusCircle className="w-3.5 h-3.5 text-slate-950" />
                  )}
                  <span>
                    {editingService
                      ? isEs
                        ? 'Guardar Modificaciones'
                        : isEn
                        ? 'Save Changes'
                        : isFr
                        ? 'Enregistrer Modifications'
                        : 'Anrejistre Modifikasyon yo'
                      : isEs
                      ? 'Guardar Servicio'
                      : isEn
                      ? 'Save Service'
                      : isFr
                      ? 'Enregistrer le Service'
                      : 'Anrejistre Sèvis'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDeleteModal
        isOpen={!!serviceToDelete}
        title={isEs ? 'Confirmar Eliminación de Servicio' : isEn ? 'Confirm Service Deletion' : isFr ? 'Confirmer la Suppression du Service' : 'Konfime Sipresyon Sèvis'}
        message={
          isEs
            ? `¿Está seguro de que desea eliminar este servicio del programa de ${church.name}?`
            : isEn
            ? `Are you sure you want to delete this service from ${church.name}'s schedule?`
            : isFr
            ? `Êtes-vous sûr de vouloir supprimer ce service du programme de ${church.name} ?`
            : `Èske w sèten ou vle efase sèvis sa a nan orè legliz ${church.name}?`
        }
        itemName={serviceToDelete ? `${serviceToDelete.title} (${serviceToDelete.category})` : ''}
        confirmButtonText={isEs ? 'Sí, Eliminar Este Servicio' : isEn ? 'Yes, Delete This Service' : isFr ? 'Oui, Supprimer Ce Service' : 'Wi, Efase Sèvis Sa a'}
        cancelButtonText={isEs ? 'Cancelar' : isEn ? 'Cancel' : isFr ? 'Annuler' : 'Anile'}
        onConfirm={handleConfirmDelete}
        onClose={() => setServiceToDelete(null)}
      />

      {/* CONFIRM PERMANENT END MODAL */}
      {serviceToEndPermanently && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1E293B] rounded-2xl border border-rose-500/40 p-6 max-w-md w-full shadow-2xl text-slate-200">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto mb-4">
              <StopCircle className="w-6 h-6 text-rose-400" />
            </div>

            <h3 className="text-lg font-bold text-white text-center mb-2">
              {isEs ? '¿Finalizar y Archivar Culto?' : isEn ? 'End and Archive Service?' : isFr ? 'Clôturer et Archiver le Culte ?' : 'Klotire sèvis sa a epi anrejistre nan istwa?'}
            </h3>

            <p className="text-xs text-slate-300 text-center leading-relaxed mb-4">
              {isEs
                ? `Al finalizar "${serviceToEndPermanently.title}", la sesión de asistencia quedará cerrada y no se podrá volver a abrir. Los miembros no registrados se marcarán como ausentes y el culto pasará inmediatamente al historial de estadísticas.`
                : isEn
                ? `Ending "${serviceToEndPermanently.title}" will permanently close attendance. It cannot be reopened. Unregistered members will be marked absent and this service will be archived into Service History.`
                : isFr
                ? `En clôturant "${serviceToEndPermanently.title}", l’enregistrement des présences sera définitivement fermé. Les membres non pointés seront enregistrés comme absents et le culte passera dans l’historique.`
                : `Lè w klotire "${serviceToEndPermanently.title}", sesyon prezans lan ap fèmen nèt epi li PAP KA REOUVRI ANKÒ. Moun ki pa te anrejistre yo ap make kòm absan, epi tout estatistik yo ap disponib nan paj Istwa Sèvis la.`}
            </p>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-5 text-[11px] text-amber-300 flex items-start gap-2">
              <Lock className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <span>
                {isEs
                  ? 'Aviso: Esta acción es permanente según las reglas del culto. Podrá consultar las estadísticas completas en el Historial.'
                  : isEn
                  ? 'Notice: This action is permanent. Complete attendance and absence stats will be saved to history.'
                  : isFr
                  ? 'Remarque : Cette action est irréversible. Les statistiques complètes seront disponibles dans l’historique.'
                  : 'Atansyon: Aksyon sa a definitif. Sèvis sa a ap pase dirèkteman nan istwa kote administrasyon an ka revize moun ki te prezan, an reta ak absan.'}
              </span>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setServiceToEndPermanently(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {isEs ? 'Cancelar' : isEn ? 'Cancel' : isFr ? 'Annuler' : 'Anile'}
              </button>
              <button
                type="button"
                id="btn-confirm-permanently-end-service"
                onClick={handleConfirmPermanentlyEnd}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow transition-all cursor-pointer flex items-center gap-1.5"
              >
                <StopCircle className="w-4 h-4" />
                <span>{isEs ? 'Sí, Finalizar Culto' : isEn ? 'Yes, End Service' : isFr ? 'Oui, Clôturer le Culte' : 'Wi, Klotire Sèvis la'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
