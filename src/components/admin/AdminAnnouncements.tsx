import React, { useState } from 'react';
import { Church, Announcement, AnnouncementCategory, Language, ServiceSession } from '../../types';
import {
  addAnnouncement,
  deleteAnnouncement,
  toggleAnnouncementToastAlert,
  updateAnnouncementSchedule,
  buildServiceAnnouncementContent,
} from '../../utils/storage';
import { useToast } from '../../context/ToastContext';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { PosterLightboxModal } from '../common/PosterLightboxModal';
import { optimizeImageFile } from '../../utils/imageOptimizer';
import {
  Bell,
  PlusCircle,
  Pin,
  Trash2,
  Calendar,
  Clock,
  Send,
  X,
  CheckCircle2,
  Users,
  Megaphone,
  AlertTriangle,
  Flame,
  Radio,
  Sparkles,
  Eye,
  CalendarClock,
  Settings2,
  Target,
  PartyPopper,
  Info,
  Globe,
  BookOpen,
  Music,
  Image as ImageIcon,
  Upload,
} from 'lucide-react';

interface AdminAnnouncementsProps {
  church: Church;
  announcements: Announcement[];
  services?: ServiceSession[];
  language?: Language;
  onAnnouncementsChange?: () => void;
  onAnnouncementsUpdated?: () => void;
}

const AUDIENCE_OPTIONS_ES = [
  'Todos',
  'Jóvenes',
  'Coro',
  'Damas',
  'Caballeros',
  'Bienvenida y Protocolo',
  'Intercesión y Oración',
  'Escuela Dominical y Niños',
  'Medios y Sonido',
  'Diaconado',
];

const AUDIENCE_OPTIONS_FR = [
  'Tout le monde',
  'Jeunesse',
  'Chorale',
  'Dames',
  'Hommes',
  'Accueil & Protocole',
  'Intercession & Prière',
  'ECODIM & Enfants',
  'Média & Sonorisation',
  'Diaconat',
];

const AUDIENCE_OPTIONS_EN = [
  'Everyone',
  'Youth',
  'Choir',
  "Women's Ministry",
  "Men's Ministry",
  'Welcome & Protocol',
  'Intercession & Prayer',
  'Sunday School & Kids',
  'Media & Sound',
  'Deacon Ministry',
];

const AUDIENCE_OPTIONS_HT = [
  'Tout moun',
  'Jeunesse',
  'Chorale',
  'Dames',
  'Hommes',
  'Accueil & Protocole',
  'Intercession & Lapriyè',
  'ECODIM & Enfants',
  'Média & Sonorisation',
  'Diaconat',
];

export const AdminAnnouncements: React.FC<AdminAnnouncementsProps> = ({
  church,
  announcements,
  services = [],
  language = 'ht',
  onAnnouncementsChange,
  onAnnouncementsUpdated,
}) => {
  const toast = useToast();
  const isEs = language === 'es';
  const isEn = language === 'en';
  const isFr = language === 'fr';
  const audienceOptions = isEs
    ? AUDIENCE_OPTIONS_ES
    : isFr
    ? AUDIENCE_OPTIONS_FR
    : isEn
    ? AUDIENCE_OPTIONS_EN
    : AUDIENCE_OPTIONS_HT;
  const defaultAudience = isEs ? 'Todos' : isFr ? 'Tout le monde' : isEn ? 'Everyone' : 'Tout moun';

  const todayStr = new Date().toISOString().split('T')[0];

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [category, setCategory] = useState<AnnouncementCategory>('anons');
  const [date, setDate] = useState<string>(todayStr);
  const [time, setTime] = useState<string>('');
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [authorType, setAuthorType] = useState<'admin' | 'pastor' | 'secretariat' | 'worship' | 'custom'>('admin');
  const [author, setAuthor] = useState<string>(
    isEs
      ? 'Administración de la Iglesia'
      : isFr
      ? 'L’Administration de l’Église'
      : isEn
      ? 'Church Administration'
      : 'Administrasyon Legliz la'
  );
  const [targetAudience, setTargetAudience] = useState<string>(defaultAudience);
  const [showToastOnLogin, setShowToastOnLogin] = useState<boolean>(false);
  const [toastAlertLevel, setToastAlertLevel] = useState<'urgent' | 'info' | 'warning' | 'celebration'>('warning');

  // Service Roles State (Dirijan, Predikatè, Lektè, Mizisyen, Akèy)
  const [leader, setLeader] = useState<string>('');
  const [preacher, setPreacher] = useState<string>('');
  const [reader, setReader] = useState<string>('');
  const [musicians, setMusicians] = useState<string>('');
  const [ushers, setUshers] = useState<string>('');

  // Poster & Image Visual State for Announcements
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageCaption, setImageCaption] = useState<string>('');
  const [isCompressingImage, setIsCompressingImage] = useState<boolean>(false);
  const [activeLightboxImage, setActiveLightboxImage] = useState<{
    url: string;
    title: string;
    caption?: string;
  } | null>(null);

  // Multilingual translations state
  const [title_fr, setTitle_fr] = useState<string>('');
  const [title_en, setTitle_en] = useState<string>('');
  const [title_es, setTitle_es] = useState<string>('');
  const [title_ht, setTitle_ht] = useState<string>('');
  const [content_fr, setContent_fr] = useState<string>('');
  const [content_en, setContent_en] = useState<string>('');
  const [content_es, setContent_es] = useState<string>('');
  const [content_ht, setContent_ht] = useState<string>('');
  const [showTranslationsAccordion, setShowTranslationsAccordion] = useState<boolean>(false);

  // Scheduled Notification State
  const [isScheduledNotification, setIsScheduledNotification] = useState<boolean>(false);
  const [scheduledNotificationDate, setScheduledNotificationDate] = useState<string>(todayStr);
  const [scheduledNotificationEndDate, setScheduledNotificationEndDate] = useState<string>('');
  const [scheduledTargetAudience, setScheduledTargetAudience] = useState<string>(defaultAudience);

  // Quick Schedule Edit Modal State
  const [schedulingAnnouncement, setSchedulingAnnouncement] = useState<Announcement | null>(null);
  const [editIsScheduled, setEditIsScheduled] = useState<boolean>(false);
  const [editScheduledDate, setEditScheduledDate] = useState<string>(todayStr);
  const [editScheduledEndDate, setEditScheduledEndDate] = useState<string>('');
  const [editScheduledAudience, setEditScheduledAudience] = useState<string>(defaultAudience);
  const [editAlertLevel, setEditAlertLevel] = useState<'urgent' | 'info' | 'warning' | 'celebration'>('warning');
  const [editShowToastOnLogin, setEditShowToastOnLogin] = useState<boolean>(false);

  // Delete State
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);

  const notifyChange = () => {
    if (typeof onAnnouncementsChange === 'function') onAnnouncementsChange();
    if (typeof onAnnouncementsUpdated === 'function') onAnnouncementsUpdated();
  };

  const handleOpenCreateModal = () => {
    setTitle('');
    setContent('');
    setCategory('anons');
    setDate(todayStr);
    setTime('');
    setIsPinned(false);
    setImageUrl('');
    setImageCaption('');
    setAuthorType('admin');
    setAuthor(
      isEs
        ? 'Administración de la Iglesia'
        : isFr
        ? 'L’Administration de l’Église'
        : isEn
        ? 'Church Administration'
        : 'Administrasyon Legliz la'
    );
    setLeader('');
    setPreacher('');
    setReader('');
    setMusicians('');
    setUshers('');
    setTitle_fr('');
    setTitle_en('');
    setTitle_es('');
    setTitle_ht('');
    setContent_fr('');
    setContent_en('');
    setContent_es('');
    setContent_ht('');
    setShowTranslationsAccordion(false);
    setTargetAudience(defaultAudience);
    setShowToastOnLogin(false);
    setToastAlertLevel('warning');
    setIsScheduledNotification(false);
    setScheduledNotificationDate(todayStr);
    setScheduledNotificationEndDate('');
    setScheduledTargetAudience(defaultAudience);
    setIsModalOpen(true);
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit before processing (10MB max source)
    if (file.size > 10 * 1024 * 1024) {
      toast.error(
        isEs ? 'Archivo muy grande' : isFr ? 'Fichier trop volumineux' : isEn ? 'File too large' : 'Fichye a twò gwo',
        isEs ? 'El tamaño máximo es de 10 MB.' : isFr ? 'La taille maximale est de 10 Mo.' : isEn ? 'Max size is 10 MB.' : 'Gwosè maksimòm se 10 MB.'
      );
      return;
    }

    try {
      setIsCompressingImage(true);
      const optimizedDataUrl = await optimizeImageFile(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.82,
        format: 'image/webp',
      });
      setImageUrl(optimizedDataUrl);
      toast.success(
        isEs ? '¡Imagen / Póster cargado!' : isFr ? 'Image / Poster chargé !' : isEn ? 'Image / Poster loaded!' : 'Imaj / Postè chaje!',
        isEs ? 'La imagen se comprimió y optimizó automáticamente sin costo de servidor.' : isFr ? 'L’image a été compressée et optimisée automatiquement.' : isEn ? 'The image was automatically optimized for fast viewing.' : 'Imaj la optimize nèt pou l chaje rapid sou telefòn manm yo.'
      );
    } catch (err) {
      console.error('Image compression error:', err);
      toast.error(
        isEs ? 'Error al procesar la imagen' : isFr ? 'Erreur de traitement' : isEn ? 'Error processing image' : 'Erè nan trete imaj la',
        isEs ? 'No se pudo optimizar la imagen seleccionada.' : 'Pa t ka trete imaj sa a.'
      );
    } finally {
      setIsCompressingImage(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error(
        isEs
          ? 'Información Incompleta'
          : isFr
          ? 'Information Incomplète'
          : isEn
          ? 'Incomplete Information'
          : 'Enfòmasyon Manke',
        isEs
          ? 'Por favor ingrese un título y contenido para el aviso.'
          : isFr
          ? 'Veuillez saisir un titre et un contenu pour l’annonce.'
          : isEn
          ? 'Please enter a title and content for the announcement.'
          : 'Tanpri antre yon tit ak kontni pou anons la.'
      );
      return;
    }

    addAnnouncement(church.id, {
      title: title.trim(),
      content: content.trim(),
      category,
      date,
      time: time.trim() || undefined,
      isPinned,
      imageUrl: imageUrl.trim() || undefined,
      imageCaption: imageCaption.trim() || undefined,
      author: author.trim(),
      authorType,
      targetAudience,
      leader: leader.trim() || undefined,
      preacher: preacher.trim() || undefined,
      reader: reader.trim() || undefined,
      musicians: musicians.trim() || undefined,
      ushers: ushers.trim() || undefined,
      title_fr: title_fr.trim() || undefined,
      title_en: title_en.trim() || undefined,
      title_es: title_es.trim() || undefined,
      title_ht: title_ht.trim() || undefined,
      content_fr: content_fr.trim() || undefined,
      content_en: content_en.trim() || undefined,
      content_es: content_es.trim() || undefined,
      content_ht: content_ht.trim() || undefined,
      showToastOnLogin: showToastOnLogin || isScheduledNotification,
      toastAlertLevel,
      isScheduledNotification,
      scheduledNotificationDate: isScheduledNotification ? (scheduledNotificationDate || date) : undefined,
      scheduledNotificationEndDate: isScheduledNotification && scheduledNotificationEndDate ? scheduledNotificationEndDate : undefined,
      scheduledTargetAudience: isScheduledNotification ? scheduledTargetAudience : undefined,
    });

    notifyChange();
    setIsModalOpen(false);

    if (isScheduledNotification) {
      toast.success(
        isEs
          ? '¡Notificación Programada con Éxito! 📅'
          : isFr
          ? 'Notification Programmée avec Succès ! 📅'
          : isEn
          ? 'Notification Scheduled Successfully! 📅'
          : 'Notifikasyon Pwograme avèk Siksè! 📅',
        isEs
          ? `El aviso activará una notificación toast automática para los miembros cuando inicien sesión en la fecha ${scheduledNotificationDate || date}.`
          : isFr
          ? `L’annonce déclenchera une notification toast automatique pour les membres lors de leur connexion le ${scheduledNotificationDate || date}.`
          : isEn
          ? `The announcement will trigger an automated toast notification for members upon logging in on ${scheduledNotificationDate || date}.`
          : `Anons lan ap deklannche notifikasyon toast otomatik pou manm yo lè yo konekte nan dat ${scheduledNotificationDate || date}.`
      );
    } else if (showToastOnLogin) {
      toast.success(
        isEs
          ? '¡Aviso y Alerta Toast Publicados!'
          : isFr
          ? 'Annonce & Alerte Toast Publiées !'
          : isEn
          ? 'Announcement & Toast Alert Published!'
          : 'Anons ak Avètisman Toast Pibliye!',
        isEs
          ? `Todos los miembros que inicien sesión en el espacio "${church.name}" verán esta alerta toast automáticamente.`
          : isFr
          ? `Tous les membres se connectant à l’espace "${church.name}" verront cette alerte toast automatiquement.`
          : isEn
          ? `All members logging into "${church.name}" will see this toast alert automatically.`
          : `Tout manm ki konekte nan espas "${church.name}" ap wè avètisman toast sa a otomatikman.`
      );
    } else {
      toast.success(
        isEs
          ? '¡Aviso Publicado con Éxito!'
          : isFr
          ? 'Annonce Publiée avec Succès !'
          : isEn
          ? 'Announcement Published Successfully!'
          : 'Anons Pibliye avèk Siksè!',
        isEs
          ? `"${title.trim()}" ha sido publicado para los miembros.`
          : isFr
          ? `"${title.trim()}" a été publié pour les membres.`
          : isEn
          ? `"${title.trim()}" has been published for members.`
          : `"${title.trim()}" pibliye pou manm yo.`
      );
    }
  };

  const handleOpenScheduleModal = (ann: Announcement) => {
    setSchedulingAnnouncement(ann);
    setEditIsScheduled(!!ann.isScheduledNotification);
    setEditScheduledDate(ann.scheduledNotificationDate || ann.date || todayStr);
    setEditScheduledEndDate(ann.scheduledNotificationEndDate || '');
    setEditScheduledAudience(ann.scheduledTargetAudience || ann.targetAudience || defaultAudience);
    setEditAlertLevel(ann.toastAlertLevel || 'warning');
    setEditShowToastOnLogin(!!ann.showToastOnLogin);
  };

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingAnnouncement) return;

    updateAnnouncementSchedule(church.id, schedulingAnnouncement.id, {
      isScheduledNotification: editIsScheduled,
      scheduledNotificationDate: editIsScheduled ? editScheduledDate : undefined,
      scheduledNotificationEndDate: editIsScheduled && editScheduledEndDate ? editScheduledEndDate : undefined,
      scheduledTargetAudience: editIsScheduled ? editScheduledAudience : undefined,
      toastAlertLevel: editAlertLevel,
      showToastOnLogin: editShowToastOnLogin || editIsScheduled,
    });

    notifyChange();
    setSchedulingAnnouncement(null);

    if (editIsScheduled) {
      toast.success(
        isEs
          ? '¡Programación de Notificación Actualizada! 📅'
          : isFr
          ? 'Programmation de Notification Mise à Jour ! 📅'
          : isEn
          ? 'Notification Schedule Updated! 📅'
          : 'Pwogramasyon Notifikasyon Mete a Jou! 📅',
        isEs
          ? `La notificación toast se activará automáticamente cuando los miembros inicien sesión en la fecha ${editScheduledDate}.`
          : isFr
          ? `La notification toast s’activera automatiquement lors de la connexion des membres le ${editScheduledDate}.`
          : isEn
          ? `The toast notification will automatically trigger when members log in on ${editScheduledDate}.`
          : `Notifikasyon toast la ap deklannche otomatikman lè manm yo konekte nan dat ${editScheduledDate}.`
      );
    } else {
      toast.info(
        isEs
          ? 'Programación Desactivada'
          : isFr
          ? 'Programmation Désactivée'
          : isEn
          ? 'Schedule Disabled'
          : 'Pwogramasyon Enfim',
        isEs
          ? `Programación de notificación para "${schedulingAnnouncement.title}" actualizada.`
          : isFr
          ? `Programmation de notification pour "${schedulingAnnouncement.title}" mise à jour.`
          : isEn
          ? `Notification schedule for "${schedulingAnnouncement.title}" updated.`
          : `Pwogramasyon notifikasyon pou "${schedulingAnnouncement.title}" mete a jour.`
      );
    }
  };

  const handleToggleToastAlert = (ann: Announcement) => {
    const nextState = !ann.showToastOnLogin;
    toggleAnnouncementToastAlert(church.id, ann.id, nextState);
    notifyChange();
    if (nextState) {
      toast.success(
        isEs
          ? '¡Alerta Toast Activada!'
          : isFr
          ? 'Alerte Toast Activée !'
          : isEn
          ? 'Toast Alert Activated!'
          : 'Avètisman Toast Aktive!',
        isEs
          ? `Los miembros recibirán la notificación toast "${ann.title}" al iniciar sesión.`
          : isFr
          ? `Les membres recevront la notification toast "${ann.title}" lors de leur connexion.`
          : isEn
          ? `Members will receive the toast notification "${ann.title}" upon login.`
          : `Manm yo ap resevwa notifikasyon toast "${ann.title}" lè yo konekte.`
      );
    } else {
      toast.info(
        isEs
          ? 'Alerta Toast Desactivada'
          : isFr
          ? 'Alerte Toast Désactivée'
          : isEn
          ? 'Toast Alert Deactivated'
          : 'Avètisman Toast Dezaktive',
        isEs
          ? `La notificación toast "${ann.title}" fue desactivada para el inicio de sesión.`
          : isFr
          ? `La notification toast "${ann.title}" a été désactivée pour la connexion.`
          : isEn
          ? `The toast notification "${ann.title}" was deactivated for login.`
          : `Notifikasyon toast "${ann.title}" dezaktive pou koneksyon.`
      );
    }
  };

  const handleTestToast = (ann: Announcement) => {
    const level = ann.toastAlertLevel || 'info';
    const scheduleNotice = ann.isScheduledNotification
      ? ` • [${isEs ? 'PROGRAMADO' : isFr ? 'PROGRAMMÉ' : isEn ? 'SCHEDULED' : 'PWOGRAME'}: ${ann.scheduledNotificationDate || ann.date}]`
      : '';

    if (level === 'urgent') {
      toast.urgent(
        `🚨 ${ann.title}`,
        `${ann.content}\n\n(${isEs ? 'Audiencia' : isFr ? 'Audience' : isEn ? 'Audience' : 'Odyans'}: ${ann.scheduledTargetAudience || ann.targetAudience || defaultAudience})`,
        9000
      );
    } else if (level === 'warning') {
      toast.announcementToast(
        `⚠️ ${ann.title}`,
        ann.content,
        `⚠️ ${isEs ? 'AVISO OFICIAL' : isFr ? 'AVIS OFFICIEL' : isEn ? 'OFFICIAL WARNING' : 'AVÈTISMAN OFISYÈL'}${scheduleNotice} • ${church.name.toUpperCase()}`,
        8500
      );
    } else if (level === 'celebration') {
      toast.announcementToast(
        `🎉 ${ann.title}`,
        ann.content,
        `🎉 ${isEs ? 'CELEBRACIÓN' : isFr ? 'CÉLÉBRATION' : isEn ? 'CELEBRATION' : 'SELEBRASYON'}${scheduleNotice} • ${church.name.toUpperCase()}`,
        8000
      );
    } else {
      toast.announcementToast(
        `📢 ${ann.title}`,
        ann.content,
        `📢 ${isEs ? 'ANUNCIO OFICIAL' : isFr ? 'ANNONCE OFFICIELLE' : isEn ? 'OFFICIAL ANNOUNCEMENT' : 'ANONS OFISYÈL'}${scheduleNotice} • ${church.name.toUpperCase()}`,
        8000
      );
    }
  };

  const handleDelete = (ann: Announcement) => {
    setAnnouncementToDelete(ann);
  };

  const handleConfirmDelete = () => {
    if (!announcementToDelete) return;
    deleteAnnouncement(church.id, announcementToDelete.id);
    notifyChange();
    toast.info(
      isEs
        ? 'Aviso Eliminado'
        : isFr
        ? 'Annonce Supprimée'
        : isEn
        ? 'Announcement Deleted'
        : 'Anons Efase',
      isEs
        ? `"${announcementToDelete.title}" fue retirado del feed de noticias.`
        : isFr
        ? `"${announcementToDelete.title}" a été retiré du fil d'actualités.`
        : isEn
        ? `"${announcementToDelete.title}" was removed from the news feed.`
        : `"${announcementToDelete.title}" retire nan fil aktyalite a.`
    );
    setAnnouncementToDelete(null);
  };

  // Stats
  const activeToastAlertsCount = announcements.filter((a) => a.showToastOnLogin && !a.isScheduledNotification).length;
  const activeScheduledCount = announcements.filter((a) => {
    if (!a.isScheduledNotification) return false;
    const start = a.scheduledNotificationDate || a.date;
    const end = a.scheduledNotificationEndDate;
    if (end) return todayStr >= start && todayStr <= end;
    return todayStr >= start;
  }).length;
  const upcomingScheduledCount = announcements.filter((a) => {
    if (!a.isScheduledNotification) return false;
    const start = a.scheduledNotificationDate || a.date;
    return todayStr < start;
  }).length;

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {isEs ? 'Avisos y Feed de Actualidades de la Iglesia' : isEn ? 'Church Announcements & Feed' : isFr ? 'Annonces & Fil d’Actualités de l’Église' : 'Anons & Fil Aktyalite Legliz la'}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold font-mono">
              {announcements.length} {isEs ? 'Publicados' : isFr ? 'Publiés' : isEn ? 'Published' : 'Pibliye'}
            </span>

            {/* Scheduled badge */}
            {(activeScheduledCount > 0 || upcomingScheduledCount > 0) && (
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                <CalendarClock className="w-3.5 h-3.5 text-cyan-400" />
                {activeScheduledCount > 0
                  ? isEs
                    ? `${activeScheduledCount} Notificación(es) Activa(s) Hoy`
                    : isFr
                    ? `${activeScheduledCount} Notification(s) Active(s) Aujourd'hui`
                    : isEn
                    ? `${activeScheduledCount} Active Notification(s) Today`
                    : `${activeScheduledCount} Notifikasyon Aktif Jodia`
                  : isEs
                  ? `${upcomingScheduledCount} Programada(s)`
                  : isFr
                  ? `${upcomingScheduledCount} Programmée(s)`
                  : isEn
                  ? `${upcomingScheduledCount} Scheduled`
                  : `${upcomingScheduledCount} Pwograme`}
              </span>
            )}

            {activeToastAlertsCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 animate-pulse">
                <Radio className="w-3.5 h-3.5 text-amber-400" />
                {activeToastAlertsCount} {isEs ? 'Toast Instantáneo(s) Activo(s)' : isFr ? 'Toast Instantané(s) Actif(s)' : isEn ? 'Instant Toast(s) Active' : 'Toast Enstantane Aktif'}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {isEs
              ? 'Publique avisos o programe el envío de notificaciones toast/push automáticas para los miembros cuando inicien sesión en una fecha específica.'
              : isFr
              ? 'Publiez des annonces ou programmez l’envoi de notifications toast/push automatiques pour les membres lors de leur connexion à une date précise.'
              : isEn
              ? 'Publish announcements or schedule automated push/toast notifications for members upon logging in on a specific date.'
              : 'Pibliye anons, oswa pwograme voye notifikasyon push/toast otomatik pou manm yo lè yo konekte nan yon dat espesifik.'}
          </p>
        </div>

        <button
          type="button"
          id="btn-open-create-announcement-modal"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-md transition-all self-start sm:self-auto cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 text-slate-950" />
          <span>{isEs ? 'Crear Aviso / Programar Notificación' : isFr ? 'Créer Annonce / Programmer Notification' : isEn ? 'Create Announcement / Schedule Notification' : 'Kreye Anons / Pwograme Notifikasyon'}</span>
        </button>
      </div>

      {/* ANNOUNCEMENTS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {announcements.length === 0 ? (
          <div className="md:col-span-2 p-8 text-center bg-[#1E293B] rounded-2xl border border-slate-800 space-y-3">
            <Megaphone className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-300">
              {isEs ? 'No se ha publicado ningún aviso' : isFr ? 'Aucune annonce publiée pour le moment' : isEn ? 'No announcements published yet' : 'Okenn anons poko pibliye'}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {isEs
                ? 'Haga clic en el botón "Crear Aviso / Programar Notificación" para publicar un nuevo comunicado o programar una notificación toast para los miembros.'
                : isFr
                ? 'Cliquez sur le bouton "Créer Annonce / Programmer Notification" pour publier un communiqué ou programmer une alerte toast pour les membres.'
                : isEn
                ? 'Click "Create Announcement / Schedule Notification" to post a new bulletin or schedule a toast notification for members.'
                : 'Klike sou bouton "Kreye Anons / Pwograme Notifikasyon" pou poste yon nouvo kominike oswa pwograme yon toast notifikasyon pou manm yo.'}
            </p>
          </div>
        ) : (
          announcements.map((ann) => {
            const isScheduled = !!ann.isScheduledNotification;
            const schedStart = ann.scheduledNotificationDate || ann.date;
            const schedEnd = ann.scheduledNotificationEndDate;
            const isTodayScheduled = isScheduled && (schedEnd ? todayStr >= schedStart && todayStr <= schedEnd : todayStr === schedStart || todayStr >= schedStart);
            const isFutureScheduled = isScheduled && todayStr < schedStart;

            return (
              <div
                key={ann.id}
                id={`admin-announcement-${ann.id}`}
                className={`p-5 rounded-2xl bg-[#1E293B] border transition-all flex flex-col justify-between ${
                  isScheduled
                    ? isTodayScheduled
                      ? 'border-cyan-500/70 shadow-lg ring-1 ring-cyan-400/40 bg-gradient-to-br from-[#1E293B] via-[#1E293B] to-cyan-950/30'
                      : 'border-cyan-500/40 shadow-sm bg-gradient-to-br from-[#1E293B] to-cyan-950/20'
                    : ann.showToastOnLogin
                    ? 'border-amber-400/70 shadow-lg ring-1 ring-amber-400/40 bg-gradient-to-br from-[#1E293B] via-[#1E293B] to-amber-950/30'
                    : ann.isPinned
                    ? 'border-amber-500/50 shadow-md bg-gradient-to-br from-[#1E293B] to-amber-950/20'
                    : 'border-slate-700/80 shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ann.category === 'anons'
                            ? 'bg-blue-500/20 border border-blue-500/30 text-blue-300'
                            : ann.category === 'ore'
                            ? 'bg-amber-500/20 border border-amber-500/30 text-amber-300'
                            : ann.category === 'sevis'
                            ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                            : 'bg-purple-500/20 border border-purple-500/30 text-purple-300'
                        }`}
                      >
                        {isEs
                          ? (ann.category === 'anons' ? 'AVISO' : ann.category === 'ore' ? 'HORARIO' : ann.category === 'sevis' ? 'SERVICIO' : 'MENSAJE')
                          : isFr
                          ? (ann.category === 'anons' ? 'ANNONCE' : ann.category === 'ore' ? 'HORAIRE' : ann.category === 'sevis' ? 'CULTE' : 'MESSAGE')
                          : isEn
                          ? (ann.category === 'anons' ? 'ANNOUNCEMENT' : ann.category === 'ore' ? 'SCHEDULE' : ann.category === 'sevis' ? 'SERVICE' : 'MESSAGE')
                          : ann.category.toUpperCase()}
                      </span>

                      {/* Scheduled Notification Badge */}
                      {isScheduled && (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm ${
                            isTodayScheduled
                              ? 'bg-cyan-400 text-slate-950 animate-pulse'
                              : isFutureScheduled
                              ? 'bg-cyan-900/60 border border-cyan-400/50 text-cyan-200'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <CalendarClock className="w-3 h-3" />
                          {isTodayScheduled
                            ? isEs ? `🔔 Programado Activo (${schedStart})` : isFr ? `🔔 Programmé Actif (${schedStart})` : isEn ? `🔔 Active Scheduled (${schedStart})` : `🔔 Pwograme Aktif (${schedStart})`
                            : isFutureScheduled
                            ? isEs ? `⏳ Programado para ${schedStart}` : isFr ? `⏳ Programmé pour le ${schedStart}` : isEn ? `⏳ Scheduled for ${schedStart}` : `⏳ Pwograme pou ${schedStart}`
                            : isEs ? `📅 Fecha Programada: ${schedStart}` : isFr ? `📅 Date Programmée : ${schedStart}` : isEn ? `📅 Scheduled Date: ${schedStart}` : `📅 Dat Pwograme: ${schedStart}`}
                        </span>
                      )}

                      {!isScheduled && ann.showToastOnLogin && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 flex items-center gap-1 shadow-sm">
                          <Radio className="w-3 h-3 text-slate-950 animate-pulse" />
                          {isEs ? 'Toast al Iniciar Sesión Activo' : isFr ? 'Toast à la Connexion Actif' : isEn ? 'Login Toast Active' : 'Toast Koneksyon Aktif'}
                        </span>
                      )}

                      {ann.isPinned && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center gap-1">
                          <Pin className="w-3 h-3" />
                          {isEs ? 'Fijado' : isFr ? 'Épinglé' : isEn ? 'Pinned' : 'Epengle'}
                        </span>
                      )}

                      {/* Target Audience Badge */}
                      {(ann.scheduledTargetAudience || ann.targetAudience) && (ann.scheduledTargetAudience || ann.targetAudience) !== defaultAudience && (ann.scheduledTargetAudience || ann.targetAudience) !== 'Tout moun' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 border border-purple-400/30 text-purple-300 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {ann.scheduledTargetAudience || ann.targetAudience}
                        </span>
                      )}

                      {ann.time && (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {ann.time}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      id={`btn-delete-announcement-${ann.id}`}
                      onClick={() => handleDelete(ann)}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                      title={isEs ? 'Eliminar aviso' : isFr ? 'Supprimer l’annonce' : isEn ? 'Delete announcement' : 'Efase anons'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-white mb-1.5 leading-snug">
                    {ann.title}
                  </h3>

                  <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed mb-3">
                    {ann.content}
                  </p>

                  {/* 🖼️ Attached Poster / Banner Image Display */}
                  {ann.imageUrl && (
                    <div className="mb-3 rounded-2xl overflow-hidden border border-slate-700/80 bg-black/40 group relative shadow-md">
                      <img
                        src={ann.imageUrl}
                        alt={ann.title}
                        onClick={() =>
                          setActiveLightboxImage({
                            url: ann.imageUrl!,
                            title: ann.title,
                            caption: ann.imageCaption,
                          })
                        }
                        className="w-full max-h-64 object-cover cursor-pointer group-hover:scale-102 transition-all duration-300"
                      />
                      <div
                        onClick={() =>
                          setActiveLightboxImage({
                            url: ann.imageUrl!,
                            title: ann.title,
                            caption: ann.imageCaption,
                          })
                        }
                        className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center cursor-pointer pointer-events-none group-hover:pointer-events-auto"
                      >
                        <span className="opacity-0 group-hover:opacity-100 transition-all px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 shadow-xl">
                          <Eye className="w-3.5 h-3.5 text-amber-400" />
                          {isEs ? 'Ver Póster Completo' : isFr ? 'Voir Poster Complet' : isEn ? 'View Full Poster' : 'Gade Postè a an Gwo'}
                        </span>
                      </div>
                      {ann.imageCaption && (
                        <div className="p-2 bg-slate-900/90 border-t border-slate-800 text-[11px] text-slate-300 font-medium text-center">
                          {ann.imageCaption}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Service Roster Team (Dirijan, Predikatè, Lektè, Mizik, Akèy) */}
                  {(ann.leader || ann.preacher || ann.reader || ann.musicians || ann.ushers) && (
                    <div className="mb-3 p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-[11px] space-y-1">
                      <div className="flex items-center gap-1 font-bold text-indigo-300">
                        <Users className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{isEs ? 'Equipo en Servicio del Culto:' : isFr ? 'Équipe en Service du Culte :' : isEn ? 'Ministry Team in Service:' : 'Ekip ki sou Sèvis nan Kilt la:'}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-[10px]">
                        {ann.leader && <span className="px-2 py-0.5 rounded bg-slate-900 border border-indigo-400/20 text-amber-300">👑 {isEs ? 'Dirigente:' : 'Dir:'} {ann.leader}</span>}
                        {ann.preacher && <span className="px-2 py-0.5 rounded bg-slate-900 border border-indigo-400/20 text-emerald-300">📖 {isEs ? 'Predicador:' : 'Pred:'} {ann.preacher}</span>}
                        {ann.reader && <span className="px-2 py-0.5 rounded bg-slate-900 border border-indigo-400/20 text-cyan-300">📜 {isEs ? 'Lectura:' : 'Lekt:'} {ann.reader}</span>}
                        {ann.musicians && <span className="px-2 py-0.5 rounded bg-slate-900 border border-indigo-400/20 text-purple-300">🎵 {isEs ? 'Música:' : 'Mizik:'} {ann.musicians}</span>}
                        {ann.ushers && <span className="px-2 py-0.5 rounded bg-slate-900 border border-indigo-400/20 text-rose-300">🤝 {isEs ? 'Protocolo:' : 'Akèy:'} {ann.ushers}</span>}
                      </div>
                    </div>
                  )}

                  {/* Multilingual indicators */}
                  {(ann.title_fr || ann.title_en || ann.title_es || ann.title_ht) && (
                    <div className="mb-2 flex items-center gap-1.5 text-[10px] text-slate-400">
                      <Globe className="w-3 h-3 text-amber-400" />
                      <span>{isEs ? 'Traducciones disponibles:' : isFr ? 'Traductions disponibles :' : isEn ? 'Translations available:' : 'Tradiksyon disponib:'}</span>
                      {ann.title_fr && <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-bold">FR</span>}
                      {ann.title_en && <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">EN</span>}
                      {ann.title_es && <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">ES</span>}
                      {ann.title_ht && <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold">HT</span>}
                    </div>
                  )}

                  {/* Scheduled info banner if scheduled */}
                  {isScheduled && (
                    <div className="mb-3 p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-[11px] text-cyan-200 flex items-start gap-2">
                      <CalendarClock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold text-cyan-300 block">
                          {isEs
                            ? `Programación Push/Toast: ${schedStart} ${schedEnd ? `hasta ${schedEnd}` : ''}`
                            : isFr
                            ? `Programmation Push/Toast : ${schedStart} ${schedEnd ? `jusqu'au ${schedEnd}` : ''}`
                            : isEn
                            ? `Push/Toast Schedule: ${schedStart} ${schedEnd ? `to ${schedEnd}` : ''}`
                            : `Pwogramasyon Push/Toast: ${schedStart} ${schedEnd ? `rive ${schedEnd}` : ''}`}
                        </span>
                        <span className="text-slate-300 block text-[10px]">
                          {isEs ? 'Audiencia:' : isFr ? 'Audience :' : isEn ? 'Audience:' : 'Odyans:'} <span className="font-semibold text-white">{ann.scheduledTargetAudience || ann.targetAudience || defaultAudience}</span> • {isEs ? 'Tipo:' : isFr ? 'Type :' : isEn ? 'Type:' : 'Tip:'} <span className="capitalize text-amber-300">{ann.toastAlertLevel || 'warning'}</span>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Action toolbar for this announcement */}
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-2 mt-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Schedule / Edit notification button */}
                      <button
                        type="button"
                        id={`btn-schedule-ann-${ann.id}`}
                        onClick={() => handleOpenScheduleModal(ann)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isScheduled
                            ? 'bg-cyan-500 text-slate-950 shadow'
                            : 'bg-slate-800 text-cyan-300 hover:bg-slate-700 border border-cyan-500/30'
                        }`}
                      >
                        <CalendarClock className="w-3.5 h-3.5" />
                        <span>
                          {isScheduled
                            ? isEs ? 'Programación Activa' : isFr ? 'Programmation Active' : isEn ? 'Active Schedule' : 'Pwogramasyon Aktif'
                            : isEs ? 'Programar Notificación' : isFr ? 'Programmer Notification' : isEn ? 'Schedule Notification' : 'Pwograme Notifikasyon'}
                        </span>
                      </button>

                      {/* Quick instant toast toggle */}
                      {!isScheduled && (
                        <button
                          type="button"
                          id={`btn-toggle-toast-${ann.id}`}
                          onClick={() => handleToggleToastAlert(ann)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            ann.showToastOnLogin
                              ? 'bg-amber-400 text-slate-950 shadow'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 border border-slate-700'
                          }`}
                        >
                          <Bell className="w-3.5 h-3.5" />
                          <span>
                            {ann.showToastOnLogin
                              ? isEs ? 'Toast Activo' : isFr ? 'Toast Actif' : isEn ? 'Toast Active' : 'Toast Aktif'
                              : isEs ? 'Toast Instantáneo' : isFr ? 'Toast Instantané' : isEn ? 'Instant Toast' : 'Toast Enstantane'}
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Test toast button */}
                    <button
                      type="button"
                      id={`btn-test-toast-${ann.id}`}
                      onClick={() => handleTestToast(ann)}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title={
                        isEs
                          ? 'Probar cómo aparecerá esta notificación toast para los miembros al iniciar sesión'
                          : isFr
                          ? 'Tester l’affichage du toast pour les membres lors de leur connexion'
                          : isEn
                          ? 'Test how this toast notification will appear to members upon logging in'
                          : 'Teste kijan notifikasyon toast sa a ap parèt pou manm yo lè yo konekte'
                      }
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{isEs ? 'Probar Toast' : isFr ? 'Tester Toast' : isEn ? 'Test Toast' : 'Teste Toast'}</span>
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-700/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{isEs ? 'Autor:' : isFr ? 'Auteur :' : isEn ? 'Author:' : 'Otè:'} {ann.author}</span>
                  <span className="font-mono">{ann.date}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE ANNOUNCEMENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-[#1E293B] rounded-2xl shadow-2xl border border-slate-700 overflow-hidden my-auto text-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#0F172A] text-white p-4 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-white">
                  {isEs ? 'Crear Nuevo Aviso o Programar Notificación' : isFr ? 'Créer une Nouvelle Annonce ou Programmer une Notification' : isEn ? 'Create New Announcement or Schedule Notification' : 'Kreye yon Nouvo Anons oswa Pwograme Notifikasyon'}
                </h3>
              </div>
              <button
                type="button"
                id="btn-close-announcement-modal"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {/* Category & Audience */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="select-ann-cat" className="text-slate-300 font-bold block mb-1">
                    {isEs ? 'Categoría del Aviso' : isFr ? 'Catégorie de l’Annonce' : isEn ? 'Announcement Category' : 'Kategori Anons la'}
                  </label>
                  <select
                    id="select-ann-cat"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as AnnouncementCategory)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
                  >
                    <option value="anons">{isEs ? '📢 Aviso General' : isFr ? '📢 Annonce Générale' : isEn ? '📢 General Announcement' : '📢 Anons Jeneral'}</option>
                    <option value="ore">{isEs ? '🕐 Horarios y Reuniones' : isFr ? '🕐 Horaires & Réunions' : isEn ? '🕐 Schedule & Meetings' : '🕐 Orè & Reyinyon'}</option>
                    <option value="sevis">{isEs ? '📅 Información de Servicios' : isFr ? '📅 Informations sur les Cultes' : isEn ? '📅 Worship & Services' : '📅 Enfòmasyon Sèvis'}</option>
                    <option value="mesaj">{isEs ? '📣 Mensaje Importante / Alerta' : isFr ? '📣 Message Important / Alerte' : isEn ? '📣 Important Message / Alert' : '📣 Mesaj Enpòtan / Avètisman'}</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="select-ann-audience" className="text-slate-300 font-bold block mb-1">
                    {isEs ? 'Audiencia Destinataria' : isFr ? 'Audience Cible' : isEn ? 'Target Audience' : 'Odyans Sib'}
                  </label>
                  <select
                    id="select-ann-audience"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
                  >
                    {audienceOptions.map((aud) => (
                      <option key={aud} value={aud}>
                        {aud === defaultAudience || aud === 'Tout moun' ? (isEs ? '👥 Todos (Toda la Iglesia)' : isFr ? '👥 Tout le monde (Toute l’Église)' : isEn ? '👥 Everyone (Whole Church)' : '👥 Tout moun (Legliz la)') : `🎯 ${aud}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label htmlFor="input-ann-title" className="text-slate-300 font-bold block mb-1">
                  {isEs ? 'Título del Aviso *' : isFr ? 'Titre de l’Annonce *' : isEn ? 'Announcement Title *' : 'Tit Anons la *'}
                </label>
                <input
                  id="input-ann-title"
                  type="text"
                  required
                  placeholder={
                    isEs
                      ? 'ej: Reunión especial de oración el sábado...'
                      : isFr
                      ? 'ex: Réunion spéciale de prière ce samedi...'
                      : isEn
                      ? 'e.g.: Special prayer meeting this Saturday...'
                      : 'eg: Reyinyon espesyal la ap fèt samdi a...'
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
                />
              </div>

              {/* Content */}
              <div>
                <label htmlFor="textarea-ann-content" className="text-slate-300 font-bold block mb-1">
                  {isEs ? 'Contenido / Detalles del Mensaje *' : isFr ? 'Contenu / Détails du Message *' : isEn ? 'Message Content / Details *' : 'Kontni / Detay Mesaj la *'}
                </label>
                <textarea
                  id="textarea-ann-content"
                  required
                  rows={3}
                  placeholder={
                    isEs
                      ? 'Escriba todos los detalles para que los miembros los lean en el feed y en la notificación toast...'
                      : isFr
                      ? 'Saisissez tous les détails à afficher dans le fil d’actualités et la notification toast...'
                      : isEn
                      ? 'Write all details for members to read in the news feed and toast notification...'
                      : 'Ekri tout detay pou manm yo kapab li nan fil aktyalite a ak nan toast notifikasyon an...'
                  }
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
                />
              </div>

              {/* 🖼️ POSTER / BANNER IMAGE UPLOAD & URL (Fil Aktyalite Dinamik) */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-950/20 via-slate-900 to-purple-950/20 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                    <ImageIcon className="w-4 h-4 text-amber-400" />
                    {isEs
                      ? '🖼️ Póster / Imagen del Aviso (Opcional)'
                      : isFr
                      ? '🖼️ Poster / Image de l’Annonce (Optionnel)'
                      : isEn
                      ? '🖼️ Poster / Announcement Banner Image (Optional)'
                      : '🖼️ Postè / Imaj Anons lan (Opsyonèl)'}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    {isEs ? '⚡ Cero Costo / Optimizado' : isFr ? '⚡ Zéro Coût / Optimisé' : isEn ? '⚡ Zero Cost / Optimized' : '⚡ 0 Frè / Otomatik'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {isEs
                    ? 'Agregue un póster o volante para hacer el feed dinámico. Puede subir una foto desde su dispositivo o pegar un enlace web.'
                    : isFr
                    ? 'Ajoutez une affiche ou un flyer pour dynamiser le fil d’actualités. Téléversez une image ou collez une URL.'
                    : isEn
                    ? 'Add a poster or flyer to make the feed dynamic. Upload directly from your device or paste an image URL.'
                    : 'Mete yon afich oswa banyè pou fè fil aktyalite a pi vivan e dinamik. Ou ka telechaje yon foto nan aparèy ou oswa kole yon lyen imaj.'}
                </p>

                {/* Upload or URL tabs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* File Upload Option */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1 mb-1">
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      {isEs ? 'Subir archivo (Foto / Póster):' : isFr ? 'Téléverser fichier (Photo / Poster) :' : isEn ? 'Upload file (Photo / Poster):' : 'Telechaje fichye (Foto / Postè):'}
                    </label>
                    <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-700 hover:border-amber-400/60 rounded-xl bg-slate-950/80 cursor-pointer text-xs text-slate-300 hover:text-white transition-all">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileUpload}
                        disabled={isCompressingImage}
                        className="hidden"
                      />
                      {isCompressingImage ? (
                        <div className="flex items-center gap-2 text-amber-300 animate-pulse">
                          <span className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                          <span className="text-[11px] font-bold">
                            {isEs ? 'Optimizando póster...' : isFr ? 'Optimisation du poster...' : isEn ? 'Optimizing poster...' : 'Ap optimize postè a...'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-300">
                          <Upload className="w-4 h-4 text-amber-400" />
                          <span className="text-[11px] font-medium">
                            {isEs ? 'Elegir foto del dispositivo' : isFr ? 'Choisir image de l’appareil' : isEn ? 'Choose device photo' : 'Chwazi foto nan aparèy la'}
                          </span>
                        </div>
                      )}
                    </label>
                  </div>

                  {/* Direct URL input */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1 mb-1">
                      <Globe className="w-3.5 h-3.5 text-cyan-400" />
                      {isEs ? 'O pegar enlace web (URL):' : isFr ? 'Ou coller lien web (URL) :' : isEn ? 'Or paste web image link (URL):' : 'Oswa kole yon lyen entènèt (URL):'}
                    </label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* Image Preview & Caption input if imageUrl exists */}
                {imageUrl && (
                  <div className="pt-2 border-t border-amber-500/20 space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        {isEs ? 'Vista previa del Póster:' : isFr ? 'Aperçu du Poster :' : isEn ? 'Poster Preview:' : 'Aperçu Postè a:'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="text-[10px] text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                      >
                        <Trash2 className="w-3 h-3" />
                        {isEs ? 'Eliminar imagen' : isFr ? 'Supprimer l’image' : isEn ? 'Remove image' : 'Retire imaj la'}
                      </button>
                    </div>

                    <div className="relative rounded-xl overflow-hidden border border-slate-700/80 bg-black/40 max-h-48 flex items-center justify-center group">
                      <img
                        src={imageUrl}
                        alt="Preview Poster"
                        className="max-h-48 w-full object-cover group-hover:scale-105 transition-all duration-300"
                      />
                    </div>

                    {/* Image Caption */}
                    <div>
                      <input
                        type="text"
                        placeholder={
                          isEs
                            ? 'Pie de foto / Descripción breve del póster (Opcional)...'
                            : isFr
                            ? 'Légende / Brève description du poster (Optionnel)...'
                            : isEn
                            ? 'Image caption / Brief poster description (Optional)...'
                            : 'Ti tit oswa deskripsyon kout anba postè a (Opsyonèl)...'
                        }
                        value={imageCaption}
                        onChange={(e) => setImageCaption(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Author Selection & Custom attribution */}
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  {isEs ? 'Autor / Identidad de la Publicación *' : isFr ? 'Auteur / Identité de Publication *' : isEn ? 'Author / Publication Identity *' : 'Otè / Idantite Piblikasyon an *'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthorType('admin');
                      setAuthor(
                        isEs
                          ? 'Administración de la Iglesia'
                          : isFr
                          ? 'L’Administration de l’Église'
                          : isEn
                          ? 'Church Administration'
                          : 'Administrasyon Legliz la'
                      );
                    }}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                      authorType === 'admin'
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-sm">🏛️</span>
                    <span className="truncate">{isEs ? 'Administración' : isFr ? 'Administration' : isEn ? 'Administration' : 'Administrasyon'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthorType('pastor');
                      setAuthor(
                        church.pastor
                          ? `${isEs ? 'Pastor' : isFr ? 'Pasteur' : isEn ? 'Pastor' : 'Pastè'} ${church.pastor}`
                          : (isEs ? 'Pastor Principal' : isFr ? 'Pasteur Titulaire' : isEn ? 'Senior Pastor' : 'Pastè Titilè')
                      );
                    }}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                      authorType === 'pastor'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-sm">✝️</span>
                    <span className="truncate">{isEs ? 'El Pastor' : isFr ? 'Le Pasteur' : isEn ? 'The Pastor' : 'Pastè a'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthorType('secretariat');
                      setAuthor(
                        isEs
                          ? 'Secretaría de la Iglesia'
                          : isFr
                          ? 'Secrétariat de l’Église'
                          : isEn
                          ? 'Church Secretariat'
                          : 'Sekretarya Legliz la'
                      );
                    }}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                      authorType === 'secretariat'
                        ? 'bg-purple-500/20 border-purple-400 text-purple-200 shadow'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-sm">📜</span>
                    <span className="truncate">{isEs ? 'Secretaría' : isFr ? 'Secrétariat' : isEn ? 'Secretariat' : 'Sekretarya'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthorType('custom');
                    }}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                      authorType === 'custom'
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 shadow'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-sm">✏️</span>
                    <span className="truncate">{isEs ? 'Personalizado' : isFr ? 'Personnalisé' : isEn ? 'Custom' : 'Pèsonalize'}</span>
                  </button>
                </div>

                <input
                  type="text"
                  id="input-ann-author"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder={
                    isEs
                      ? 'Nombre del autor, pastor o departamento emisor...'
                      : isFr
                      ? 'Nom de l’auteur, pasteur ou département émetteur...'
                      : isEn
                      ? 'Name of the author, pastor, or department...'
                      : 'Non otè, pastè oswa depatman ki pibliye a...'
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              {/* Service Roster Roles: Dirijan, Predikatè, Lektè, Mizisyen, Akèy */}
              <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/40 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-bold text-indigo-300 flex items-center gap-1.5 text-xs">
                    <Users className="w-4 h-4 text-indigo-400" />
                    {isEs
                      ? 'Equipo y Responsables en Servicio del Culto'
                      : isFr
                      ? 'Équipe & Responsables en Service du Culte'
                      : isEn
                      ? 'Ministry Team & Service Roster Roles'
                      : 'Ekip & Moun ki sou Sèvis nan Kilt la'}
                  </span>
                  <span className="text-[10px] text-indigo-300/80 font-medium">
                    {isEs ? '(Dirigente, Predicador, Lectura, Música, Protocolo)' : '(Dirijan, Predikatè, Lektè, Mizik, Akèy)'}
                  </span>
                </div>

                {/* Quick Auto-fill from active service if available */}
                {services.length > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/80 border border-indigo-500/20 text-[11px]">
                    <span className="text-slate-400 shrink-0">
                      {isEs ? 'Cargar desde culto:' : isFr ? 'Remplir depuis culte :' : isEn ? 'Load from service:' : 'Chaje depi kilt:'}
                    </span>
                    <select
                      onChange={(e) => {
                        const s = services.find((srv) => srv.id === e.target.value);
                        if (s) {
                          setCategory('sevis');
                          if (s.leader) setLeader(s.leader);
                          else if (s.preacherOrLeader) setLeader(s.preacherOrLeader);
                          if (s.preacher) setPreacher(s.preacher);
                          else if (s.preacherOrLeader && !s.leader) setPreacher(s.preacherOrLeader);
                          if (s.reader) setReader(s.reader);
                          if (s.musicians) setMusicians(s.musicians);
                          if (s.ushers) setUshers(s.ushers);
                          if (s.date) {
                            setDate(s.date);
                            setScheduledNotificationDate(s.date);
                          }
                          if (s.startTime) setTime(s.startTime);

                          const ht = buildServiceAnnouncementContent(church, s, 'ht');
                          const fr = buildServiceAnnouncementContent(church, s, 'fr');
                          const en = buildServiceAnnouncementContent(church, s, 'en');
                          const es = buildServiceAnnouncementContent(church, s, 'es');

                          setTitle(language === 'es' ? es.title : language === 'fr' ? fr.title : language === 'en' ? en.title : ht.title);
                          setContent(language === 'es' ? es.content : language === 'fr' ? fr.content : language === 'en' ? en.content : ht.content);
                          setTitle_ht(ht.title);
                          setContent_ht(ht.content);
                          setTitle_fr(fr.title);
                          setContent_fr(fr.content);
                          setTitle_en(en.title);
                          setContent_en(en.content);
                          setTitle_es(es.title);
                          setContent_es(es.content);

                          toast.info('Ranpli!', `Done kilt "${s.title}" aplike nan tout 4 lang yo ak wòl yo.`);
                        }
                      }}
                      className="flex-1 bg-slate-900 border border-slate-700 text-white rounded px-2 py-1 text-xs"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        {isEs ? '-- Seleccionar culto programado --' : isFr ? '-- Choisir un culte --' : isEn ? '-- Choose a service --' : '-- Chwazi yon kilt ki pwograme --'}
                      </option>
                      {services.map((srv) => (
                        <option key={srv.id} value={srv.id}>
                          {srv.title} ({srv.category} - {srv.dayOfWeek})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1 mb-1">
                      👑 {isEs ? 'Dirigente del Culto' : isFr ? 'Dirigeant du Culte' : isEn ? 'Worship Leader' : 'Dirijan Kilt la'}
                    </label>
                    <input
                      type="text"
                      placeholder={isEs ? 'ej: Hno. Jean Baptiste' : 'eg: Frè Jean Baptiste'}
                      value={leader}
                      onChange={(e) => setLeader(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-slate-950 text-white text-xs focus:outline-none focus:border-indigo-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1 mb-1">
                      📖 {isEs ? 'Predicador del Mensaje' : isFr ? 'Prédicateur de la Parole' : isEn ? 'Preacher / Speaker' : 'Predikatè Mesaj la'}
                    </label>
                    <input
                      type="text"
                      placeholder={isEs ? 'ej: Pastor Titular' : 'eg: Pastè Titilè'}
                      value={preacher}
                      onChange={(e) => setPreacher(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-slate-950 text-white text-xs focus:outline-none focus:border-indigo-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1 mb-1">
                      📜 {isEs ? 'Lectura Bíblica' : isFr ? 'Lecteur des Écritures' : isEn ? 'Scripture Reader' : 'Lektè Pawòl la'}
                    </label>
                    <input
                      type="text"
                      placeholder={isEs ? 'ej: Diácono Samuel' : 'eg: Dyak Samuel'}
                      value={reader}
                      onChange={(e) => setReader(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-slate-950 text-white text-xs focus:outline-none focus:border-indigo-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1 mb-1">
                      🎵 {isEs ? 'Música y Coro' : isFr ? 'Musique & Chorale' : isEn ? 'Music & Choir' : 'Mizisyen & Koral'}
                    </label>
                    <input
                      type="text"
                      placeholder={isEs ? 'ej: Coro de Jóvenes / Grupo de Alabanza' : 'eg: Koral Jèn yo / Gwoup Louanj'}
                      value={musicians}
                      onChange={(e) => setMusicians(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-slate-950 text-white text-xs focus:outline-none focus:border-indigo-400"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1 mb-1">
                      🤝 {isEs ? 'Bienvenida y Protocolo' : isFr ? 'Accueil & Protocole' : isEn ? 'Ushers & Hospitality' : 'Akèy & Pwotokòl'}
                    </label>
                    <input
                      type="text"
                      placeholder={isEs ? 'ej: Equipo de Protocolo y Diaconado' : 'eg: Ekip Akèy & Dyakonat'}
                      value={ushers}
                      onChange={(e) => setUshers(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-slate-950 text-white text-xs focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>
              </div>

              {/* Multilingual translations Accordion (FR, EN, ES, HT) */}
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <button
                  type="button"
                  onClick={() => setShowTranslationsAccordion(!showTranslationsAccordion)}
                  className="w-full flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-amber-400" />
                    {isEs
                      ? 'Traducciones en otros idiomas (FR, EN, ES, HT)'
                      : isFr
                      ? 'Traductions en d’autres langues (FR, EN, ES, HT)'
                      : isEn
                      ? 'Translations in other languages (FR, EN, ES, HT)'
                      : 'Tradiksyon anons lan nan lòt lang (Fransè, Anglè, Espanyòl, Kreyòl)'}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-mono">
                    {showTranslationsAccordion ? '▲ Fèmen' : '▼ Louvri'}
                  </span>
                </button>

                {showTranslationsAccordion && (
                  <div className="pt-2 border-t border-slate-800 space-y-3 animate-in fade-in duration-200">
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {isEs
                        ? 'Si ingresa estas traducciones, el aviso se mostrará automáticamente en el idioma que cada miembro tenga configurado en su aplicación.'
                        : isFr
                        ? 'Si vous saisissez ces traductions, l’annonce s’affichera automatiquement dans la langue configurée par chaque membre.'
                        : isEn
                        ? 'If provided, the announcement will automatically display in the language configured by each member in their app.'
                        : 'Lè w mete tradiksyon sa yo, anons lan ap parèt otomatikman nan lang chak manm chwazi nan app li a.'}
                    </p>

                    {/* French */}
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <span className="font-bold text-[11px] text-blue-400 flex items-center gap-1">🇫🇷 Français</span>
                      <input
                        type="text"
                        placeholder="Titre en Français..."
                        value={title_fr}
                        onChange={(e) => setTitle_fr(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-white text-xs focus:ring-1 focus:ring-blue-400 focus:outline-none"
                      />
                      <textarea
                        rows={2}
                        placeholder="Contenu en Français..."
                        value={content_fr}
                        onChange={(e) => setContent_fr(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-white text-xs focus:ring-1 focus:ring-blue-400 focus:outline-none"
                      />
                    </div>

                    {/* English */}
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <span className="font-bold text-[11px] text-emerald-400 flex items-center gap-1">🇺🇸 English</span>
                      <input
                        type="text"
                        placeholder="Title in English..."
                        value={title_en}
                        onChange={(e) => setTitle_en(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-white text-xs focus:ring-1 focus:ring-emerald-400 focus:outline-none"
                      />
                      <textarea
                        rows={2}
                        placeholder="Content in English..."
                        value={content_en}
                        onChange={(e) => setContent_en(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-white text-xs focus:ring-1 focus:ring-emerald-400 focus:outline-none"
                      />
                    </div>

                    {/* Spanish */}
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <span className="font-bold text-[11px] text-amber-400 flex items-center gap-1">🇪🇸 Español</span>
                      <input
                        type="text"
                        placeholder="Título en Español..."
                        value={title_es}
                        onChange={(e) => setTitle_es(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-white text-xs focus:ring-1 focus:ring-amber-400 focus:outline-none"
                      />
                      <textarea
                        rows={2}
                        placeholder="Contenido en Español..."
                        value={content_es}
                        onChange={(e) => setContent_es(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-white text-xs focus:ring-1 focus:ring-amber-400 focus:outline-none"
                      />
                    </div>

                    {/* Haitian Creole */}
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <span className="font-bold text-[11px] text-rose-400 flex items-center gap-1">🇭🇹 Kreyòl Ayisyen</span>
                      <input
                        type="text"
                        placeholder="Tit an Kreyòl..."
                        value={title_ht}
                        onChange={(e) => setTitle_ht(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-white text-xs focus:ring-1 focus:ring-rose-400 focus:outline-none"
                      />
                      <textarea
                        rows={2}
                        placeholder="Kontni an Kreyòl..."
                        value={content_ht}
                        onChange={(e) => setContent_ht(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-white text-xs focus:ring-1 focus:ring-rose-400 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="input-ann-date" className="text-slate-300 font-bold block mb-1">
                    {isEs ? 'Fecha de Publicación' : isFr ? 'Date de Publication' : isEn ? 'Publication Date' : 'Dat Piblikasyon'}
                  </label>
                  <input
                    id="input-ann-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="input-ann-time" className="text-slate-300 font-bold block mb-1">
                    {isEs ? 'Hora (Opcional)' : isFr ? 'Heure (Optionnel)' : isEn ? 'Time (Optional)' : 'Lè (Opsyonèl)'}
                  </label>
                  <input
                    id="input-ann-time"
                    type="text"
                    placeholder="eg: 6:00 PM"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* 🔔 SCHEDULED PUSH/TOAST NOTIFICATION SECTION */}
              <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/40 space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    id="checkbox-scheduled-toast"
                    checked={isScheduledNotification}
                    onChange={(e) => {
                      setIsScheduledNotification(e.target.checked);
                      if (e.target.checked) setShowToastOnLogin(false);
                    }}
                    className="mt-0.5 rounded text-cyan-400 focus:ring-cyan-400 bg-slate-900 border-slate-700"
                  />
                  <div>
                    <span className="font-bold text-cyan-300 flex items-center gap-1.5 text-xs">
                      <CalendarClock className="w-4 h-4 text-cyan-400" />
                      {isEs
                        ? 'Programar envío de notificación push/toast para una fecha específica'
                        : isFr
                        ? 'Programmer l’envoi d’une notification toast/push pour une date précise'
                        : isEn
                        ? 'Schedule push/toast notification delivery for a specific date'
                        : 'Pwograme voye notifikasyon push/toast pou yon dat espesifik'}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      {isEs
                        ? 'Cuando un miembro inicie sesión en su portal en esta fecha (o durante este período), se activará automáticamente una notificación toast en su pantalla.'
                        : isFr
                        ? 'Lorsqu’un membre se connectera à son portail à cette date (ou durant cette période), une alerte toast apparaîtra automatiquement.'
                        : isEn
                        ? 'When a member logs into their portal on this date (or during this period), an automated toast popup will appear.'
                        : 'Lè yon manm konekte nan espas li a nan dat sa a (oswa pandan peryòd la), yon notifikasyon toast ap deklannche otomatikman sou ekran li.'}
                    </span>
                  </div>
                </label>

                {isScheduledNotification && (
                  <div className="pt-2 border-t border-cyan-500/20 space-y-3 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="input-sched-date" className="text-cyan-200 font-bold block mb-1 text-[11px]">
                          {isEs ? 'Fecha Específica de Notificación *' : isFr ? 'Date Spécifique de Notification *' : isEn ? 'Specific Notification Date *' : 'Dat Spesifik Notifikasyon an *'}
                        </label>
                        <input
                          id="input-sched-date"
                          type="date"
                          required={isScheduledNotification}
                          value={scheduledNotificationDate}
                          onChange={(e) => setScheduledNotificationDate(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-slate-950 text-white text-xs focus:ring-1 focus:ring-cyan-400 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label htmlFor="input-sched-end-date" className="text-cyan-200 font-bold block mb-1 text-[11px]">
                          {isEs ? 'Fecha Fin del Período (Opcional)' : isFr ? 'Date de Fin de Période (Optionnel)' : isEn ? 'Period End Date (Optional)' : 'Dat Fen Peryòd (Opsyonèl)'}
                        </label>
                        <input
                          id="input-sched-end-date"
                          type="date"
                          value={scheduledNotificationEndDate}
                          onChange={(e) => setScheduledNotificationEndDate(e.target.value)}
                          placeholder="YYYY-MM-DD"
                          className="w-full px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-slate-950 text-white text-xs focus:ring-1 focus:ring-cyan-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="select-sched-audience" className="text-cyan-200 font-bold block mb-1 text-[11px]">
                          {isEs ? 'Audiencia Destinataria de la Notificación' : isFr ? 'Audience Destinataire de la Notification' : isEn ? 'Notification Target Audience' : 'Odyans Sib pou Notifikasyon an'}
                        </label>
                        <select
                          id="select-sched-audience"
                          value={scheduledTargetAudience}
                          onChange={(e) => setScheduledTargetAudience(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-slate-950 text-white text-xs focus:ring-1 focus:ring-cyan-400 focus:outline-none"
                        >
                          {audienceOptions.map((aud) => (
                            <option key={aud} value={aud}>
                              {aud === defaultAudience || aud === 'Tout moun' ? (isEs ? '👥 Todos' : isFr ? '👥 Tout le monde' : isEn ? '👥 Everyone' : '👥 Tout moun') : `🎯 ${aud}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="select-sched-level" className="text-cyan-200 font-bold block mb-1 text-[11px]">
                          {isEs ? 'Tipo y Urgencia de la Notificación' : isFr ? 'Type et Urgence de la Notification' : isEn ? 'Notification Type & Urgency' : 'Tip & Ijans Notifikasyon an'}
                        </label>
                        <select
                          id="select-sched-level"
                          value={toastAlertLevel}
                          onChange={(e) => setToastAlertLevel(e.target.value as any)}
                          className="w-full px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-slate-950 text-white text-xs focus:ring-1 focus:ring-cyan-400 focus:outline-none"
                        >
                          <option value="warning">{isEs ? '⚠️ Aviso Importante (Warning)' : isFr ? '⚠️ Avis Important (Warning)' : isEn ? '⚠️ Important Warning' : '⚠️ Avètisman Enpòtan (Warning)'}</option>
                          <option value="urgent">{isEs ? '🚨 Mensaje Urgente (Urgent Alert)' : isFr ? '🚨 Message Urgent (Urgent Alert)' : isEn ? '🚨 Urgent Message (Alert)' : '🚨 Mesaj Ijan (Urgent Alert)'}</option>
                          <option value="info">{isEs ? '📢 Aviso Oficial (Announcement)' : isFr ? '📢 Annonce Officielle (Announcement)' : isEn ? '📢 Official Announcement' : '📢 Anons Ofisyèl (Announcement)'}</option>
                          <option value="celebration">{isEs ? '🎉 Celebración / Felicitación' : isFr ? '🎉 Célébration / Félicitations' : isEn ? '🎉 Celebration / Greetings' : '🎉 Selebrasyon / Felisitasyon'}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* INSTANT TOAST ON LOGIN (when not scheduled) */}
              {!isScheduledNotification && (
                <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-500/30 space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      id="checkbox-ann-toast"
                      checked={showToastOnLogin}
                      onChange={(e) => setShowToastOnLogin(e.target.checked)}
                      className="mt-0.5 rounded text-amber-400 focus:ring-amber-400 bg-slate-900 border-slate-700"
                    />
                    <div>
                      <span className="font-bold text-amber-300 block">
                        {isEs ? '🔔 Enviar como Alerta Toast Instantánea (Ahora)' : isFr ? '🔔 Envoyer comme Alerte Toast Instantanée (Maintenant)' : isEn ? '🔔 Send as Instant Toast Alert (Now)' : '🔔 Voye kòm Avètisman Toast Enstantane (Kounye a)'}
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {isEs
                          ? 'Active la notificación toast para que aparezca de inmediato cada vez que un miembro inicie sesión hoy.'
                          : isFr
                          ? 'Activez la notification toast pour qu’elle s’affiche immédiatement lors de chaque connexion aujourd’hui.'
                          : isEn
                          ? 'Enable the toast notification so it appears immediately whenever members log in today.'
                          : 'Aktive notifikasyon toast la pou li parèt imedyatman chak fwa yon manm konekte jodi a.'}
                      </span>
                    </div>
                  </label>

                  {showToastOnLogin && (
                    <div className="pt-2 border-t border-slate-800 space-y-1.5">
                      <label htmlFor="select-toast-level" className="text-slate-300 font-semibold block text-[11px]">
                        {isEs ? 'Nivel de Urgencia del Aviso' : isFr ? 'Niveau d’Urgence de l’Avis' : isEn ? 'Alert Urgency Level' : 'Nivo Ijans Avètisman an'}
                      </label>
                      <select
                        id="select-toast-level"
                        value={toastAlertLevel}
                        onChange={(e) => setToastAlertLevel(e.target.value as any)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-white text-xs focus:ring-1 focus:ring-amber-400 focus:outline-none"
                      >
                        <option value="warning">{isEs ? '⚠️ Aviso Importante (Warning)' : isFr ? '⚠️ Avis Important (Warning)' : isEn ? '⚠️ Important Warning' : '⚠️ Avètisman Enpòtan (Warning)'}</option>
                        <option value="urgent">{isEs ? '🚨 Mensaje Urgente (Urgent / Urgent Alert)' : isFr ? '🚨 Message Urgent (Urgent Alert)' : isEn ? '🚨 Urgent Message (Alert)' : '🚨 Mesaj Ijan (Urgent / Urgent Alert)'}</option>
                        <option value="info">{isEs ? '📢 Aviso Oficial (Official Announcement)' : isFr ? '📢 Annonce Officielle' : isEn ? '📢 Official Announcement' : '📢 Anons Ofisyèl (Official Announcement)'}</option>
                        <option value="celebration">{isEs ? '🎉 Celebración / Felicitación' : isFr ? '🎉 Célébration / Félicitations' : isEn ? '🎉 Celebration / Greetings' : '🎉 Selebrasyon / Felisitasyon'}</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Pinned Checkbox */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="rounded text-amber-400 focus:ring-amber-400 bg-slate-900 border-slate-700"
                  />
                  <span className="font-semibold text-slate-200">
                    {isEs ? 'Fijar al inicio del feed (Pinned)' : isFr ? 'Épingler en haut du fil (Pinned)' : isEn ? 'Pin to top of feed (Pinned)' : 'Epengle nan tèt fil aktyalite a (Pinned)'}
                  </span>
                </label>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-700 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:text-white font-semibold cursor-pointer"
                >
                  {isEs ? 'Cancelar' : isFr ? 'Annuler' : isEn ? 'Cancel' : 'Anile'}
                </button>
                <button
                  type="submit"
                  id="btn-submit-create-announcement"
                  className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-slate-950" />
                  <span>
                    {isScheduledNotification
                      ? (isEs ? 'Programar y Publicar' : isFr ? 'Programmer et Publier' : isEn ? 'Schedule & Publish' : 'Pwograme & Pibliye')
                      : (isEs ? 'Publicar Aviso' : isFr ? 'Publier l’Annonce' : isEn ? 'Publish Announcement' : 'Pibliye Anons')}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK SCHEDULE NOTIFICATION EDIT MODAL */}
      {schedulingAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-md bg-[#1E293B] rounded-2xl shadow-2xl border border-slate-700 overflow-hidden my-auto text-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#0F172A] text-white p-4 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-sm text-white truncate">
                  {isEs
                    ? `Programar Notificación: ${schedulingAnnouncement.title}`
                    : isFr
                    ? `Programmer Notification : ${schedulingAnnouncement.title}`
                    : isEn
                    ? `Schedule Notification: ${schedulingAnnouncement.title}`
                    : `Pwograme Notifikasyon: ${schedulingAnnouncement.title}`}
                </h3>
              </div>
              <button
                type="button"
                id="btn-close-schedule-modal"
                onClick={() => setSchedulingAnnouncement(null)}
                className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <p className="text-slate-300 font-semibold mb-1 truncate">{schedulingAnnouncement.title}</p>
                <p className="text-slate-400 text-[11px] line-clamp-2">{schedulingAnnouncement.content}</p>
              </div>

              {/* Schedule toggle */}
              <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsScheduled}
                    onChange={(e) => setEditIsScheduled(e.target.checked)}
                    className="mt-0.5 rounded text-cyan-400 focus:ring-cyan-400 bg-slate-900 border-slate-700"
                  />
                  <div>
                    <span className="font-bold text-cyan-300 block text-xs">
                      {isEs
                        ? 'Activar Programación de Notificación para Fecha Específica'
                        : isFr
                        ? 'Activer la Programmation de Notification pour une Date Précise'
                        : isEn
                        ? 'Enable Notification Scheduling for Specific Date'
                        : 'Aktive Pwogramasyon Notifikasyon pou Dat Espesifik'}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {isEs
                        ? 'Enviar un popup toast automáticamente a los miembros cuando inicien sesión en esa fecha.'
                        : isFr
                        ? 'Envoyer un popup toast automatiquement aux membres lorsqu’ils se connectent à cette date.'
                        : isEn
                        ? 'Automatically pop up a toast to members upon login on that date.'
                        : 'Voye yon popup toast otomatikman bay manm yo lè yo konekte nan dat sa a.'}
                    </span>
                  </div>
                </label>

                {editIsScheduled && (
                  <div className="space-y-3 pt-2 border-t border-cyan-500/20">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-cyan-200 font-bold block mb-1 text-[11px]">
                          {isEs ? 'Fecha de Notificación *' : isFr ? 'Date de Notification *' : isEn ? 'Notification Date *' : 'Dat Notifikasyon *'}
                        </label>
                        <input
                          type="date"
                          required={editIsScheduled}
                          value={editScheduledDate}
                          onChange={(e) => setEditScheduledDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-cyan-500/40 bg-slate-950 text-white text-xs focus:ring-1 focus:ring-cyan-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-cyan-200 font-bold block mb-1 text-[11px]">
                          {isEs ? 'Fecha Fin (Opcional)' : isFr ? 'Date de Fin (Optionnel)' : isEn ? 'End Date (Optional)' : 'Dat Fen (Opsyonèl)'}
                        </label>
                        <input
                          type="date"
                          value={editScheduledEndDate}
                          onChange={(e) => setEditScheduledEndDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-cyan-500/40 bg-slate-950 text-white text-xs focus:ring-1 focus:ring-cyan-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-cyan-200 font-bold block mb-1 text-[11px]">
                        {isEs ? 'Audiencia Destinataria' : isFr ? 'Audience Cible' : isEn ? 'Target Audience' : 'Odyans Sib'}
                      </label>
                      <select
                        value={editScheduledAudience}
                        onChange={(e) => setEditScheduledAudience(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-cyan-500/40 bg-slate-950 text-white text-xs focus:ring-1 focus:ring-cyan-400 focus:outline-none"
                      >
                        {audienceOptions.map((aud) => (
                          <option key={aud} value={aud}>
                            {aud === defaultAudience || aud === 'Tout moun' ? (isEs ? '👥 Todos' : isFr ? '👥 Tout le monde' : isEn ? '👥 Everyone' : '👥 Tout moun') : `🎯 ${aud}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-cyan-200 font-bold block mb-1 text-[11px]">
                        {isEs ? 'Nivel de Urgencia / Tipo de Toast' : isFr ? 'Niveau d’Urgence / Type de Toast' : isEn ? 'Urgency Level / Toast Type' : 'Nivo Ijans / Tip Toast'}
                      </label>
                      <select
                        value={editAlertLevel}
                        onChange={(e) => setEditAlertLevel(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-cyan-500/40 bg-slate-950 text-white text-xs focus:ring-1 focus:ring-cyan-400 focus:outline-none"
                      >
                        <option value="warning">{isEs ? '⚠️ Aviso Importante (Warning)' : isFr ? '⚠️ Avis Important (Warning)' : isEn ? '⚠️ Important Warning' : '⚠️ Avètisman Enpòtan (Warning)'}</option>
                        <option value="urgent">{isEs ? '🚨 Mensaje Urgente (Urgent Alert)' : isFr ? '🚨 Message Urgent (Urgent Alert)' : isEn ? '🚨 Urgent Message (Alert)' : '🚨 Mesaj Ijan (Urgent Alert)'}</option>
                        <option value="info">{isEs ? '📢 Aviso Oficial (Announcement)' : isFr ? '📢 Annonce Officielle' : isEn ? '📢 Official Announcement' : '📢 Anons Ofisyèl (Announcement)'}</option>
                        <option value="celebration">{isEs ? '🎉 Celebración / Felicitación' : isFr ? '🎉 Célébration / Félicitations' : isEn ? '🎉 Celebration / Greetings' : '🎉 Selebrasyon / Felisitasyon'}</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Direct toggle when not scheduled */}
              {!editIsScheduled && (
                <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <input
                    type="checkbox"
                    checked={editShowToastOnLogin}
                    onChange={(e) => setEditShowToastOnLogin(e.target.checked)}
                    className="rounded text-amber-400 focus:ring-amber-400 bg-slate-950 border-slate-700"
                  />
                  <span className="text-slate-300 font-semibold text-[11px]">
                    {isEs ? 'Activar Toast de Conexión Instantáneo (Ahora)' : isFr ? 'Activer Toast de Connexion Instantané (Maintenant)' : isEn ? 'Enable Instant Login Toast (Now)' : 'Aktive Toast Koneksyon Enstantane (Kounye a)'}
                  </span>
                </label>
              )}

              {/* Footer */}
              <div className="pt-3 border-t border-slate-700 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSchedulingAnnouncement(null)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:text-white font-semibold cursor-pointer"
                >
                  {isEs ? 'Cancelar' : isFr ? 'Annuler' : isEn ? 'Cancel' : 'Anile'}
                </button>
                <button
                  type="submit"
                  id="btn-save-schedule"
                  className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                  <span>{isEs ? 'Guardar Programación' : isFr ? 'Enregistrer Programmation' : isEn ? 'Save Schedule' : 'Sove Pwogramasyon'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POSTER LIGHTBOX MODAL */}
      <PosterLightboxModal
        isOpen={!!activeLightboxImage}
        imageUrl={activeLightboxImage?.url || ''}
        title={activeLightboxImage?.title || ''}
        caption={activeLightboxImage?.caption}
        language={language}
        onClose={() => setActiveLightboxImage(null)}
      />

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDeleteModal
        isOpen={!!announcementToDelete}
        title={isEs ? 'Confirmar Eliminación de Aviso' : isFr ? 'Confirmer la Suppression de l’Annonce' : isEn ? 'Confirm Announcement Deletion' : 'Konfime Sipresyon Anons'}
        message={
          isEs
            ? `¿Está seguro de que desea eliminar este aviso del feed de noticias de la iglesia ${church.name}?`
            : isFr
            ? `Êtes-vous sûr de vouloir supprimer cette annonce du fil d’actualités de l’église ${church.name} ?`
            : isEn
            ? `Are you sure you want to delete this announcement from ${church.name}'s news feed?`
            : `Èske w sèten ou vle efase anons sa a nan fil aktyalite legliz ${church.name}?`
        }
        itemName={announcementToDelete ? `"${announcementToDelete.title}"` : ''}
        confirmButtonText={isEs ? 'Sí, Eliminar este Aviso' : isFr ? 'Oui, Supprimer cette Annonce' : isEn ? 'Yes, Delete this Announcement' : 'Wi, Efase Anons Sa a'}
        cancelButtonText={isEs ? 'Cancelar' : isFr ? 'Annuler' : isEn ? 'Cancel' : 'Anile'}
        onConfirm={handleConfirmDelete}
        onClose={() => setAnnouncementToDelete(null)}
      />
    </div>
  );
};
