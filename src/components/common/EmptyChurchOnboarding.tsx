import React, { useState } from 'react';
import { Church, Language } from '../../types';
import { createNewChurch, authorizeChurchAdminSession } from '../../utils/storage';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  Building2,
  BookOpen,
  Plus,
  ShieldCheck,
  QrCode,
  Users,
  Calendar,
  Bell,
  Phone,
  Mail,
  MapPin,
  Flame,
  Award,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface EmptyChurchOnboardingProps {
  onChurchCreated: (church: Church) => void;
  onOpenTutorial: () => void;
  language?: Language;
}

export const EmptyChurchOnboarding: React.FC<EmptyChurchOnboardingProps> = ({
  onChurchCreated,
  onOpenTutorial,
  language = 'ht',
}) => {
  const toast = useToast();

  const labels = {
    ht: {
      badge: 'Sistèm Jesyon Legliz & Kat Dijital QR',
      welcomeTitle: 'Byenvini sou',
      welcomeDesc: 'Pou kòmanse itilize aplikasyon an, tanpri anrejistre premye legliz ou a oswa konsilte gid titoryèl la pou aprann kijan tout bagay fonksyone.',
      openTutorialBtn: 'Louvri Gid & Titoryèl Konplè',
      featuresTitle: 'Sa W Ap Jwenn Nan Sistèm Nan',
      feat1Title: 'Kat Manm Dijital QR & Barcode',
      feat1Desc: 'Jenere kòd inik ak PIN sekirite pou chak manm legliz la.',
      feat2Title: 'Eskanè Prezans 100% Offline',
      feat2Desc: 'Scan prezans san entènèt ak bip odyo, senkronizasyon otomatik.',
      feat3Title: 'Anons & Pwogramasyon Notifikasyon',
      feat3Desc: 'Voye alèt toast otomatik bay manm yo nan dat espesifik.',
      feat4Title: 'Sekirite Byometrik & Google Auth',
      feat4Desc: 'Koneksyon rapid ak Face ID, Touch ID oswa kont Google.',
      formTitle: 'Anrejistre Premye Legliz Ou',
      formSubtitle: 'Antre enfòmasyon debaz yo pou kreye espas prive legliz la kounye a.',
      churchNameLabel: 'Non Legliz la *',
      churchNamePlaceholder: 'Egz: Église Baptiste de la Grâce, Tabernacle de Gloire...',
      pastorLabel: 'Pastè Titilè / Responsab *',
      pastorPlaceholder: 'Egz: Pastè Jean-Claude Voltaire',
      codeLabel: 'Kòd Inik (Opsyonèl)',
      codePlaceholder: 'Egz: EBG, TAB01, CH001...',
      cityLabel: 'Vil / Depatman',
      cityPlaceholder: 'Egz: Pòtoprens, Okap, Delmas...',
      phoneLabel: 'Telefòn Kontak',
      phonePlaceholder: 'Egz: +509 3712-3456',
      addressLabel: 'Adrès Fizik Legliz la',
      addressPlaceholder: 'Egz: 14, Rue Capois, Champs de Mars',
      mottoLabel: 'Deviz oswa Vèsè Tematik',
      mottoPlaceholder: 'Egz: Yon pèp ki adore nan lespri ak nan verite',
      defaultCity: 'Pòtoprens, Ayiti',
      defaultMotto: 'Nan sèvis Bondye ak renmen',
      pinSectionTitle: 'Kòd PIN Sekirite Administratè Legliz la *',
      pinSectionHint: 'Defini yon kòd PIN sekirite (omwen 4 chif) pou pwoteje espas admin ou a ak done manm yo.',
      pinPlaceholder: 'Kòd PIN Admin (eg: 1234, 7788)',
      pinConfirmPlaceholder: 'Konfime Kòd PIN lan',
      showText: 'Montre',
      hideText: 'Kache',
      submitBtn: 'Kreye Espas Legliz Sa a Kounye a',
      submittingText: 'Kreyasyon an ap fèt...',
      errNameRequired: 'Tanpri antre non legliz la.',
      errPastorRequired: 'Tanpri antre non pastè a oswa responsab la.',
      errPinMismatch: 'Kòd PIN sekirite yo pa koresponn.',
      successToastTitle: 'Legliz Kreye avèk Siksè!',
      successToastDesc: (name: string) => `Byenvini nan espas administrasyon pou "${name}".`,
      errCreation: 'Erè pandan kreyasyon legliz la.',
    },
    es: {
      badge: 'Sistema de Gestión Eclesiástica y Carnets Digitales QR',
      welcomeTitle: 'Bienvenido a',
      welcomeDesc: 'Para comenzar a utilizar la aplicación, registre su congregación o consulte la guía interactiva para conocer todas las funciones.',
      openTutorialBtn: 'Abrir Guía y Tutorial Completo',
      featuresTitle: 'Ventajas y Capacidades del Sistema',
      feat1Title: 'Carnets Digitales QR y Código de Barras',
      feat1Desc: 'Generación instantánea de credenciales con código QR y PIN de seguridad para cada miembro.',
      feat2Title: 'Escaneo de Asistencia 100% Offline',
      feat2Desc: 'Registro sin internet con confirmación por sonido y sincronización automática en la nube.',
      feat3Title: 'Muro de Anuncios y Avisos Emergentes',
      feat3Desc: 'Comunique noticias clave y programe alertas toast automáticas por ministerios.',
      feat4Title: 'Biometría Avanzada y Google Auth',
      feat4Desc: 'Inicio de sesión ágil y seguro mediante Face ID, huella digital o cuenta de Google.',
      formTitle: 'Registrar su Congregación',
      formSubtitle: 'Complete la información oficial para crear el espacio privado de su iglesia.',
      churchNameLabel: 'Nombre de la Iglesia *',
      churchNamePlaceholder: 'Ej: Primera Iglesia Bautista, Tabernáculo de Gracia...',
      pastorLabel: 'Pastor Principal / Responsable *',
      pastorPlaceholder: 'Ej: Pastor Carlos Morales',
      codeLabel: 'Código Corto (Opcional)',
      codePlaceholder: 'Ej: PIB, TG01, CH001...',
      cityLabel: 'Ciudad / Provincia / Estado',
      cityPlaceholder: 'Ej: Santo Domingo, Madrid, Miami...',
      phoneLabel: 'Teléfono de Contacto',
      phonePlaceholder: 'Ej: +1 809 555-0123',
      addressLabel: 'Dirección de la Iglesia',
      addressPlaceholder: 'Ej: Av. Principal #102',
      mottoLabel: 'Lema o Versículo Temático',
      mottoPlaceholder: 'Ej: Una iglesia que adora en espíritu y en verdad',
      defaultCity: 'Santo Domingo',
      defaultMotto: 'Al servicio de Dios y la comunidad',
      pinSectionTitle: 'Código PIN de Seguridad del Administrador *',
      pinSectionHint: 'Defina un código PIN de seguridad (al menos 4 dígitos) para proteger su espacio de administración y los datos de los miembros.',
      pinPlaceholder: 'Código PIN Admin (ej: 1234, 7788)',
      pinConfirmPlaceholder: 'Confirmar Código PIN',
      showText: 'Mostrar',
      hideText: 'Ocultar',
      submitBtn: 'Crear Espacio de Esta Iglesia',
      submittingText: 'Registrando congregación...',
      errNameRequired: 'Por favor ingrese el nombre de la iglesia.',
      errPastorRequired: 'Por favor ingrese el nombre del pastor o responsable.',
      errPinMismatch: 'Los códigos PIN de seguridad no coinciden.',
      successToastTitle: '¡Iglesia Registrada con Éxito!',
      successToastDesc: (name: string) => `Bienvenido al panel de administración de "${name}".`,
      errCreation: 'Error durante el registro de la iglesia.',
    },
    fr: {
      badge: 'Gestion d’Église & Cartes Digitales QR',
      welcomeTitle: 'Bienvenue sur',
      welcomeDesc: 'Pour commencer, enregistrez votre première assemblée ou consultez le guide complet pour découvrir la plateforme.',
      openTutorialBtn: 'Ouvrir le Guide & Tutoriel',
      featuresTitle: 'Ce que le Système Vous Offre',
      feat1Title: 'Cartes Membres Digitales QR & Code-barres',
      feat1Desc: 'Identifiant unique et code PIN pour chaque fidèle de l’église.',
      feat2Title: 'Scan de Présence 100% Hors Ligne',
      feat2Desc: 'Enregistrez les présences sans connexion internet avec bip sonore.',
      feat3Title: 'Annonces & Notifications Planifiées',
      feat3Desc: 'Diffusez les communiqués et alertes ciblées par département.',
      feat4Title: 'Sécurité Biométrique & Google Auth',
      feat4Desc: 'Connexion rapide par empreinte, reconnaissance faciale ou compte Google.',
      formTitle: 'Enregistrer Votre Première Église',
      formSubtitle: 'Renseignez les données officielles pour initialiser votre espace sécurisé.',
      churchNameLabel: 'Nom de l’Église *',
      churchNamePlaceholder: 'Ex: Église Évangélique de la Grâce...',
      pastorLabel: 'Pasteur Titulaire / Responsable *',
      pastorPlaceholder: 'Ex: Pasteur Jean Dupont',
      codeLabel: 'Code Court (Optionnel)',
      codePlaceholder: 'Ex: EEG, CH001...',
      cityLabel: 'Ville / Région',
      cityPlaceholder: 'Ex: Paris, Port-au-Prince, Montréal...',
      phoneLabel: 'Téléphone de Contact',
      phonePlaceholder: 'Ex: +33 1 23 45 67 89',
      addressLabel: 'Adresse Physique',
      addressPlaceholder: 'Ex: 12 Rue de l’Espérance',
      mottoLabel: 'Devise ou Verset Thématique',
      mottoPlaceholder: 'Ex: Adorer Dieu en esprit et en vérité',
      defaultCity: 'Paris',
      defaultMotto: 'Au service de Dieu avec amour',
      pinSectionTitle: 'Code PIN de Sécurité de l’Administrateur *',
      pinSectionHint: 'Définissez un code PIN de sécurité (au moins 4 chiffres) pour protéger votre espace d’administration et les données des membres.',
      pinPlaceholder: 'Code PIN Admin (ex: 1234, 7788)',
      pinConfirmPlaceholder: 'Confirmer le Code PIN',
      showText: 'Afficher',
      hideText: 'Masquer',
      submitBtn: 'Créer l’Espace de cette Église',
      submittingText: 'Création en cours...',
      errNameRequired: 'Veuillez renseigner le nom de l’église.',
      errPastorRequired: 'Veuillez renseigner le nom du pasteur responsable.',
      errPinMismatch: 'Les codes PIN de sécurité ne correspondent pas.',
      successToastTitle: 'Église Créée avec Succès !',
      successToastDesc: (name: string) => `Bienvenue dans l’espace d’administration de "${name}".`,
      errCreation: 'Erreur lors de la création de l’église.',
    },
    en: {
      badge: 'Church Management & Digital QR Credentials',
      welcomeTitle: 'Welcome to',
      welcomeDesc: 'To begin, register your first church congregation or check the tutorial guide to explore the platform.',
      openTutorialBtn: 'Open Full Guide & Tutorial',
      featuresTitle: 'System Capabilities & Highlights',
      feat1Title: 'Digital Member ID Cards (QR & Barcode)',
      feat1Desc: 'Generate unique digital badges with QR codes and secure 4-digit PINs.',
      feat2Title: '100% Offline Attendance Check-in',
      feat2Desc: 'Scan check-ins even without internet, featuring audio tones and cloud sync.',
      feat3Title: 'Announcements & Scheduled Toast Alerts',
      feat3Desc: 'Post ministry updates and broadcast automated alerts for specific dates.',
      feat4Title: 'Biometric Security & Google Auth',
      feat4Desc: 'Seamless one-touch sign-in with Face ID, Fingerprint, or Google accounts.',
      formTitle: 'Register Your First Church',
      formSubtitle: 'Enter the official church details to initialize your isolated workspace.',
      churchNameLabel: 'Church Name *',
      churchNamePlaceholder: 'E.g. Grace Baptist Church, Glory Tabernacle...',
      pastorLabel: 'Senior Pastor / Leader *',
      pastorPlaceholder: 'E.g. Pastor John Doe',
      codeLabel: 'Short Code (Optional)',
      codePlaceholder: 'E.g. GBC, CH001...',
      cityLabel: 'City / State',
      cityPlaceholder: 'E.g. Miami, New York, London...',
      phoneLabel: 'Contact Phone',
      phonePlaceholder: 'E.g. +1 (555) 123-4567',
      addressLabel: 'Physical Address',
      addressPlaceholder: 'E.g. 100 Main Street',
      mottoLabel: 'Motto or Scripture Theme',
      mottoPlaceholder: 'E.g. Serving God and community with faith',
      defaultCity: 'Miami, FL',
      defaultMotto: 'Serving God with faith and love',
      pinSectionTitle: 'Church Administrator Security PIN *',
      pinSectionHint: 'Set a security PIN code (at least 4 digits) to protect your admin workspace and members’ records.',
      pinPlaceholder: 'Admin PIN Code (e.g. 1234, 7788)',
      pinConfirmPlaceholder: 'Confirm PIN Code',
      showText: 'Show',
      hideText: 'Hide',
      submitBtn: 'Create Church Workspace Now',
      submittingText: 'Creating church...',
      errNameRequired: 'Please enter the church name.',
      errPastorRequired: 'Please enter the senior pastor name.',
      errPinMismatch: 'Security PIN codes do not match.',
      successToastTitle: 'Church Successfully Created!',
      successToastDesc: (name: string) => `Welcome to the administration workspace for "${name}".`,
      errCreation: 'Error during church creation.',
    },
  }[language] || {
    badge: 'Sistèm Jesyon Legliz & Kat Dijital QR',
    welcomeTitle: 'Byenvini sou',
    welcomeDesc: 'Pou kòmanse itilize aplikasyon an, tanpri anrejistre premye legliz ou a.',
    openTutorialBtn: 'Louvri Gid & Titoryèl Konplè',
    featuresTitle: 'Sa W Ap Jwenn Nan Sistèm Nan',
    feat1Title: 'Kat Manm Dijital QR & Barcode',
    feat1Desc: 'Jenere kòd inik ak PIN sekirite pou chak manm legliz la.',
    feat2Title: 'Eskanè Prezans 100% Offline',
    feat2Desc: 'Scan prezans san entènèt ak bip odyo, senkronizasyon otomatik.',
    feat3Title: 'Anons & Pwogramasyon Notifikasyon',
    feat3Desc: 'Voye alèt toast otomatik bay manm yo nan dat espesifik.',
    feat4Title: 'Sekirite Byometrik & Google Auth',
    feat4Desc: 'Koneksyon rapid ak Face ID, Touch ID oswa kont Google.',
    formTitle: 'Anrejistre Premye Legliz Ou',
    formSubtitle: 'Antre enfòmasyon debaz yo pou kreye espas prive legliz la kounye a.',
    churchNameLabel: 'Non Legliz la *',
    churchNamePlaceholder: 'Egz: Église Baptiste de la Grâce...',
    pastorLabel: 'Pastè Titilè / Responsab *',
    pastorPlaceholder: 'Egz: Pastè Jean-Claude Voltaire',
    codeLabel: 'Kòd Inik (Opsyonèl)',
    codePlaceholder: 'Egz: EBG, CH001...',
    cityLabel: 'Vil / Depatman',
    cityPlaceholder: 'Egz: Pòtoprens...',
    phoneLabel: 'Telefòn Kontak',
    phonePlaceholder: 'Egz: +509 3712-3456',
    addressLabel: 'Adrès Fizik Legliz la',
    addressPlaceholder: 'Egz: 14, Rue Capois',
    mottoLabel: 'Deviz oswa Vèsè Tematik',
    mottoPlaceholder: 'Egz: Nan sèvis Bondye ak renmen',
    defaultCity: 'Pòtoprens, Ayiti',
    defaultMotto: 'Nan sèvis Bondye ak renmen',
    pinSectionTitle: 'Kòd PIN Sekirite Administratè Legliz la *',
    pinSectionHint: 'Defini yon kòd PIN sekirite (omwen 4 chif) pou pwoteje espas admin ou a ak done manm yo.',
    pinPlaceholder: 'Kòd PIN Admin (eg: 1234, 7788)',
    pinConfirmPlaceholder: 'Konfime Kòd PIN lan',
    showText: 'Montre',
    hideText: 'Kache',
    submitBtn: 'Kreye Espas Legliz Sa a Kounye a',
    submittingText: 'Kreyasyon an ap fèt...',
    errNameRequired: 'Tanpri antre non legliz la.',
    errPastorRequired: 'Tanpri antre non pastè a oswa responsab la.',
    errPinMismatch: 'Kòd PIN sekirite yo pa koresponn.',
    successToastTitle: 'Legliz Kreye avèk Siksè!',
    successToastDesc: (name: string) => `Byenvini nan espas administrasyon pou "${name}".`,
    errCreation: 'Erè pandan kreyasyon legliz la.',
  };

  const { googleUser } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    pastor: '',
    address: '',
    city: labels.defaultCity,
    phone: '',
    email: googleUser?.email || '',
    motto: labels.defaultMotto,
    adminPasscode: '',
    confirmPasscode: '',
  });

  const [showPasscode, setShowPasscode] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError(labels.errNameRequired);
      return;
    }
    if (!formData.pastor.trim()) {
      setError(labels.errPastorRequired);
      return;
    }
    const pin = formData.adminPasscode.trim();
    const confirmPin = formData.confirmPasscode.trim();
    if (!pin || pin.length < 4) {
      setError('Chak legliz dwe defini pwòp kòd sekirite (PIN) mèt li ki gen omwen 4 karaktè.');
      return;
    }
    if (pin !== confirmPin) {
      setError(labels.errPinMismatch);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const created = createNewChurch({
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        pastor: formData.pastor.trim(),
        address: formData.address.trim() || 'Adrès Prensipal',
        city: formData.city.trim() || labels.defaultCity,
        phone: formData.phone.trim(),
        email: formData.email.trim() || googleUser?.email || '',
        motto: formData.motto.trim() || labels.defaultMotto,
        adminPasscode: pin,
        adminGoogleEmail: googleUser?.email || '',
      });

      // Automatically authorize admin session for creator
      authorizeChurchAdminSession(created.id);

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      toast.success(
        labels.successToastTitle,
        labels.successToastDesc(created.name)
      );

      onChurchCreated(created);
    } catch (err: any) {
      setError(err?.message || labels.errCreation);
      toast.error('Erè Kreyasyon', 'Pa rive anrejistre legliz la.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="empty-church-onboarding-container"
      className="max-w-5xl mx-auto px-4 py-8 sm:py-12 space-y-8"
    >
      {/* Welcome Hero Banner */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-amber-400/10 border border-amber-400/30 text-amber-400 shadow-inner">
          <ShieldCheck className="w-4 h-4" />
          <span>{labels.badge}</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          {labels.welcomeTitle} <span className="text-amber-400">OmniChurch</span>
        </h1>

        <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
          {labels.welcomeDesc}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            id="open-tutorial-from-onboarding-btn"
            onClick={onOpenTutorial}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold bg-slate-800 text-amber-400 border border-amber-400/30 hover:bg-slate-700/80 hover:text-amber-300 transition-all shadow-md cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>{labels.openTutorialBtn}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Features Overview + Registration Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Key Features Guide Highlights */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-5 shadow-xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span>{labels.featuresTitle}</span>
            </h3>

            <div className="space-y-3.5 text-xs sm:text-sm text-slate-300">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/50 border border-slate-800/80">
                <div className="w-8 h-8 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center shrink-0">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white">{labels.feat1Title}</h4>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {labels.feat1Desc}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/50 border border-slate-800/80">
                <div className="w-8 h-8 rounded-xl bg-emerald-400/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white">{labels.feat2Title}</h4>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {labels.feat2Desc}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/50 border border-slate-800/80">
                <div className="w-8 h-8 rounded-xl bg-sky-400/10 text-sky-400 flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white">{labels.feat3Title}</h4>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {labels.feat3Desc}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/50 border border-slate-800/80">
                <div className="w-8 h-8 rounded-xl bg-purple-400/10 text-purple-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white">{labels.feat4Title}</h4>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {labels.feat4Desc}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Church Creation Form */}
        <div className="lg:col-span-7">
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{labels.formTitle}</h2>
                <p className="text-xs text-slate-400">
                  {labels.formSubtitle}
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label
                    htmlFor="onboard-church-name"
                    className="text-xs font-bold text-slate-300 flex items-center gap-1.5"
                  >
                    <Building2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>{labels.churchNameLabel}</span>
                  </label>
                  <input
                    type="text"
                    id="onboard-church-name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={labels.churchNamePlaceholder}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="onboard-church-pastor"
                    className="text-xs font-bold text-slate-300 flex items-center gap-1.5"
                  >
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    <span>{labels.pastorLabel}</span>
                  </label>
                  <input
                    type="text"
                    id="onboard-church-pastor"
                    required
                    value={formData.pastor}
                    onChange={(e) => setFormData({ ...formData, pastor: e.target.value })}
                    placeholder={labels.pastorPlaceholder}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="onboard-church-code"
                    className="text-xs font-bold text-slate-300 flex items-center gap-1.5"
                  >
                    <span>{labels.codeLabel}</span>
                  </label>
                  <input
                    type="text"
                    id="onboard-church-code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder={labels.codePlaceholder}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 uppercase transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="onboard-church-city"
                    className="text-xs font-bold text-slate-300 flex items-center gap-1.5"
                  >
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>{labels.cityLabel}</span>
                  </label>
                  <input
                    type="text"
                    id="onboard-church-city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder={labels.cityPlaceholder}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="onboard-church-phone"
                    className="text-xs font-bold text-slate-300 flex items-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5 text-amber-400" />
                    <span>{labels.phoneLabel}</span>
                  </label>
                  <input
                    type="tel"
                    id="onboard-church-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder={labels.phonePlaceholder}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label
                    htmlFor="onboard-church-address"
                    className="text-xs font-bold text-slate-300 flex items-center gap-1.5"
                  >
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>{labels.addressLabel}</span>
                  </label>
                  <input
                    type="text"
                    id="onboard-church-address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder={labels.addressPlaceholder}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label
                    htmlFor="onboard-church-motto"
                    className="text-xs font-bold text-slate-300 flex items-center gap-1.5"
                  >
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>{labels.mottoLabel}</span>
                  </label>
                  <input
                    type="text"
                    id="onboard-church-motto"
                    value={formData.motto}
                    onChange={(e) => setFormData({ ...formData, motto: e.target.value })}
                    placeholder={labels.mottoPlaceholder}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>

                {/* ADMIN SECURITY PIN INPUT */}
                <div className="p-4 rounded-2xl bg-amber-400/5 border border-amber-400/30 sm:col-span-2 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>{labels.pinSectionTitle}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPasscode(!showPasscode)}
                      className="text-xs text-slate-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                    >
                      {showPasscode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showPasscode ? labels.hideText : labels.showText}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {labels.pinSectionHint}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type={showPasscode ? 'text' : 'password'}
                      maxLength={12}
                      value={formData.adminPasscode}
                      onChange={(e) => setFormData({ ...formData, adminPasscode: e.target.value })}
                      placeholder={labels.pinPlaceholder}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-amber-400/40 text-white font-mono text-center text-sm font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <input
                      type={showPasscode ? 'text' : 'password'}
                      maxLength={12}
                      value={formData.confirmPasscode}
                      onChange={(e) => setFormData({ ...formData, confirmPasscode: e.target.value })}
                      placeholder={labels.pinConfirmPlaceholder}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-amber-400/40 text-white font-mono text-center text-sm font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                id="submit-onboard-church-btn"
                disabled={isSubmitting}
                className="w-full py-3 px-6 rounded-2xl font-bold bg-amber-400 text-slate-950 hover:bg-amber-300 transition-all shadow-lg hover:shadow-amber-400/20 flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                {isSubmitting ? (
                  <span>{labels.submittingText}</span>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    <span>{labels.submitBtn}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
