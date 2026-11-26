import React, { useState, useEffect } from 'react';
import { Church, Language } from '../../types';
import {
  createNewChurch,
  authorizeChurchAdminSession,
  syncCreatedChurchToCloudStrict,
} from '../../utils/storage';
import { isSuperDeveloperEmail } from '../../utils/cryptoSecurity';
import { auth } from '../../lib/firebase';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  Building2,
  BookOpen,
  Plus,
  ShieldCheck,
  QrCode,
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
  Users,
  CheckCircle2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { OmniChurchLogo } from './OmniChurchLogo';

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
  const { googleUser, signInWithGoogle, registerChurchAdminWithEmail } = useAuth();
  const hasLiveReusableAuthUser = Boolean(
    googleUser?.email &&
      googleUser?.uid &&
      !isSuperDeveloperEmail(googleUser.email) &&
      auth.currentUser?.uid === googleUser.uid
  );

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
      feat4Title: 'Sekirite Byometrik & Firebase Auth',
      feat4Desc: 'Koneksyon sekirize ak Imèl + Modpas, Google oswa Face ID / Anprent.',
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
      authSectionTitle: 'Kont Administratè Legliz la (Imèl & Modpas Reyèl) *',
      authSectionHint: 'Defini imèl ak vrè modpas (omwen 6 karaktè) ki pral pwoteje espas admin ak done nwaj legliz ou a.',
      adminEmailPlaceholder: 'Imèl Administratè (eg: paste@legliz.org)',
      passwordPlaceholder: 'Vrè Modpas (omwen 6 karaktè)',
      passwordConfirmPlaceholder: 'Konfime Modpas la',
      useGoogleLabel: `Sèvi ak kont Google ki deja konekte a (${googleUser?.email || ''})`,
      showText: 'Montre',
      hideText: 'Kache',
      submitBtn: 'Kreye Espas Legliz Sa a Kounye a',
      submittingText: 'Kreyasyon an ap fèt...',
      errNameRequired: 'Tanpri antre non legliz la.',
      errPastorRequired: 'Tanpri antre non pastè a oswa responsab la.',
      errEmailInvalid: 'Tanpri antre yon adrès imèl administratè ki valab.',
      errPasswordWeak: 'Modpas administratè a dwe gen omwen 6 karaktè.',
      errPasswordMismatch: 'De modpas yo pa koresponn.',
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
      feat4Title: 'Biometría Avanzada y Firebase Auth',
      feat4Desc: 'Acceso seguro mediante Correo + Contraseña real, Google Auth, Face ID o huella digital.',
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
      authSectionTitle: 'Cuenta del Administrador (Correo y Contraseña Real) *',
      authSectionHint: 'Defina el correo y una contraseña real (mín. 6 caracteres) para proteger el panel administrativo y la nube de su iglesia.',
      adminEmailPlaceholder: 'Correo del Administrador (ej: pastor@iglesia.org)',
      passwordPlaceholder: 'Contraseña Real (mín. 6 caracteres)',
      passwordConfirmPlaceholder: 'Confirmar Contraseña',
      useGoogleLabel: `Usar cuenta Google conectada (${googleUser?.email || ''})`,
      showText: 'Mostrar',
      hideText: 'Ocultar',
      submitBtn: 'Crear Espacio de Esta Iglesia',
      submittingText: 'Registrando congregación...',
      errNameRequired: 'Por favor ingrese el nombre de la iglesia.',
      errPastorRequired: 'Por favor ingrese el nombre del pastor o responsable.',
      errEmailInvalid: 'Por favor ingrese un correo electrónico de administrador válido.',
      errPasswordWeak: 'La contraseña debe tener al menos 6 caracteres.',
      errPasswordMismatch: 'Las contraseñas ingresadas no coinciden.',
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
      feat4Title: 'Sécurité Biométrique & Firebase Auth',
      feat4Desc: 'Accès sécurisé par E-mail + Mot de passe, Google Auth ou biométrie.',
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
      authSectionTitle: 'Compte Administrateur (E-mail & Vrai Mot de Passe) *',
      authSectionHint: 'Définissez l’e-mail et un vrai mot de passe (min. 6 caractères) pour sécuriser l’espace d’administration et le cloud.',
      adminEmailPlaceholder: 'E-mail Administrateur (ex: pasteur@eglise.org)',
      passwordPlaceholder: 'Mot de Passe (min. 6 caractères)',
      passwordConfirmPlaceholder: 'Confirmer le Mot de Passe',
      useGoogleLabel: `Utiliser le compte Google connecté (${googleUser?.email || ''})`,
      showText: 'Afficher',
      hideText: 'Masquer',
      submitBtn: 'Créer l’Espace de cette Église',
      submittingText: 'Création en cours...',
      errNameRequired: 'Veuillez renseigner le nom de l’église.',
      errPastorRequired: 'Veuillez renseigner le nom du pasteur responsable.',
      errEmailInvalid: 'Veuillez saisir une adresse e-mail administrateur valide.',
      errPasswordWeak: 'Le mot de passe doit comporter au moins 6 caractères.',
      errPasswordMismatch: 'Les mots de passe ne correspondent pas.',
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
      feat1Desc: 'Generate unique digital badges with QR codes and secure member PINs.',
      feat2Title: '100% Offline Attendance Check-in',
      feat2Desc: 'Scan check-ins even without internet, featuring audio tones and cloud sync.',
      feat3Title: 'Announcements & Scheduled Toast Alerts',
      feat3Desc: 'Post ministry updates and broadcast automated alerts for specific dates.',
      feat4Title: 'Biometric Security & Firebase Auth',
      feat4Desc: 'Secure admin access with Email + Password, Google Auth, Face ID or Fingerprint.',
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
      authSectionTitle: 'Church Administrator Account (Email & Password) *',
      authSectionHint: 'Set the real admin email and password (min. 6 characters) that protects your church workspace and cloud records.',
      adminEmailPlaceholder: 'Admin Email (e.g. pastor@church.org)',
      passwordPlaceholder: 'Password (min. 6 characters)',
      passwordConfirmPlaceholder: 'Confirm Password',
      useGoogleLabel: `Use signed-in Google account (${googleUser?.email || ''})`,
      showText: 'Show',
      hideText: 'Hide',
      submitBtn: 'Create Church Workspace Now',
      submittingText: 'Creating church...',
      errNameRequired: 'Please enter the church name.',
      errPastorRequired: 'Please enter the senior pastor name.',
      errEmailInvalid: 'Please enter a valid administrator email address.',
      errPasswordWeak: 'Password must be at least 6 characters long.',
      errPasswordMismatch: 'The passwords entered do not match.',
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
    feat4Title: 'Sekirite Byometrik & Firebase Auth',
    feat4Desc: 'Koneksyon sekirize ak Imèl + Modpas, Google oswa Face ID / Anprent.',
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
    authSectionTitle: 'Kont Administratè Legliz la (Imèl & Modpas Reyèl) *',
    authSectionHint: 'Defini imèl ak vrè modpas (omwen 6 karaktè) ki pral pwoteje espas admin ak done nwaj legliz ou a.',
    adminEmailPlaceholder: 'Imèl Administratè (eg: paste@legliz.org)',
    passwordPlaceholder: 'Vrè Modpas (omwen 6 karaktè)',
    passwordConfirmPlaceholder: 'Konfime Modpas la',
    useGoogleLabel: `Sèvi ak kont Google ki deja konekte a (${googleUser?.email || ''})`,
    showText: 'Montre',
    hideText: 'Kache',
    submitBtn: 'Kreye Espas Legliz Sa a Kounye a',
    submittingText: 'Kreyasyon an ap fèt...',
    errNameRequired: 'Tanpri antre non legliz la.',
    errPastorRequired: 'Tanpri antre non pastè a oswa responsab la.',
    errEmailInvalid: 'Tanpri antre yon adrès imèl administratè ki valab.',
    errPasswordWeak: 'Modpas administratè a dwe gen omwen 6 karaktè.',
    errPasswordMismatch: 'De modpas yo pa koresponn.',
    successToastTitle: 'Legliz Kreye avèk Siksè!',
    successToastDesc: (name: string) => `Byenvini nan espas administrasyon pou "${name}".`,
    errCreation: 'Erè pandan kreyasyon legliz la.',
  };

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    pastor: '',
    address: '',
    city: labels.defaultCity,
    phone: '',
    email: hasLiveReusableAuthUser ? googleUser?.email || '' : '',
    motto: labels.defaultMotto,
    adminEmail: hasLiveReusableAuthUser ? googleUser?.email || '' : '',
    adminPassword: '',
    confirmPassword: '',
  });

  const [useExistingGoogleAccount, setUseExistingGoogleAccount] = useState<boolean>(
    hasLiveReusableAuthUser
  );
  const [isGoogleConnecting, setIsGoogleConnecting] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canUseLive = Boolean(
      googleUser?.email &&
        googleUser?.uid &&
        !isSuperDeveloperEmail(googleUser.email) &&
        auth.currentUser?.uid === googleUser.uid
    );
    setUseExistingGoogleAccount(canUseLive);
    if (canUseLive && googleUser?.email) {
      setFormData((prev) => ({
        ...prev,
        adminEmail: prev.adminEmail || googleUser.email || '',
        email: prev.email || googleUser.email || '',
      }));
    }
  }, [googleUser]);

  const handleConnectGoogleOnboarding = async () => {
    setError(null);
    setIsGoogleConnecting(true);
    try {
      const signed = await signInWithGoogle();
      if (!signed?.email || !signed?.uid) {
        throw new Error(labels.errEmailInvalid);
      }
      if (isSuperDeveloperEmail(signed.email)) {
        setUseExistingGoogleAccount(false);
        setError(
          language === 'es'
            ? 'Esta cuenta está reservada exclusivamente para el Panel de Administración General.'
            : language === 'en'
            ? 'This account is strictly reserved for the System Administration Panel.'
            : language === 'fr'
            ? 'Ce compte est strictement réservé au Panneau d’Administration Générale.'
            : 'Kont sa a rezève sèlman pou Panèl Administrasyon Jeneral sistèm nan. Chwazi yon lòt kont Google oswa kreye ak Imèl + Modpas.'
        );
        return;
      }
      setUseExistingGoogleAccount(true);
      setFormData((prev) => ({
        ...prev,
        adminEmail: signed.email || prev.adminEmail,
        email: prev.email || signed.email || '',
      }));
    } catch (err: any) {
      setError(err?.message || labels.errCreation);
    } finally {
      setIsGoogleConnecting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim().length < 2) {
      setError(labels.errNameRequired);
      return;
    }
    if (!formData.pastor.trim()) {
      setError(labels.errPastorRequired);
      return;
    }

    const usingGoogle = Boolean(
      useExistingGoogleAccount &&
        googleUser?.email &&
        googleUser?.uid &&
        auth.currentUser?.uid === googleUser.uid
    );
    const cleanAdminEmail = usingGoogle
      ? (googleUser!.email || '').trim().toLowerCase()
      : formData.adminEmail.trim().toLowerCase();

    if (isSuperDeveloperEmail(cleanAdminEmail)) {
      setError(
        language === 'es'
          ? 'Esta cuenta está reservada para el Panel de Administración General.'
          : language === 'en'
          ? 'This account is reserved for the System Administration Panel.'
          : language === 'fr'
          ? 'Ce compte est réservé au Panneau d’Administration Générale.'
          : 'Kont sa a rezève pou Panèl Administrasyon Jeneral sistèm nan.'
      );
      return;
    }

    if (!usingGoogle) {
      if (!cleanAdminEmail || !cleanAdminEmail.includes('@')) {
        setError(labels.errEmailInvalid);
        return;
      }
      if (!formData.adminPassword || formData.adminPassword.length < 6) {
        setError(labels.errPasswordWeak);
        return;
      }
      if (formData.adminPassword !== formData.confirmPassword) {
        setError(labels.errPasswordMismatch);
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let authOwner = usingGoogle ? googleUser : null;
      let authMethod: Church['adminAuthMethod'] = 'google';

      if (!usingGoogle) {
        authOwner = await registerChurchAdminWithEmail(
          cleanAdminEmail,
          formData.adminPassword,
          formData.pastor.trim() || formData.name.trim()
        );
        authMethod = 'email_password';
      }

      if (!authOwner?.email || !authOwner?.uid) {
        throw new Error(labels.errEmailInvalid);
      }

      const created = createNewChurch(
        {
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          pastor: formData.pastor.trim(),
          address: formData.address.trim() || 'Adrès Prensipal',
          city: formData.city.trim() || labels.defaultCity,
          phone: formData.phone.trim(),
          email: formData.email.trim() || authOwner.email,
          motto: formData.motto.trim() || labels.defaultMotto,
          adminGoogleEmail: authOwner.email.toLowerCase(),
          adminGoogleUid: authOwner.uid,
          adminGoogleName: authOwner.displayName || formData.pastor.trim() || formData.name.trim(),
          adminAuthMethod: authMethod,
        },
        { skipImmediateCloudSave: true }
      );

      await syncCreatedChurchToCloudStrict(created);
      authorizeChurchAdminSession(created.id);

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }

      toast.success(
        labels.successToastTitle,
        labels.successToastDesc(created.name)
      );

      onChurchCreated(created);
    } catch (err: any) {
      setError(err?.message || labels.errCreation);
      toast.error('Erè Kreyasyon', err?.message || 'Pa rive anrejistre legliz la.');
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
        <div className="flex justify-center">
          <OmniChurchLogo
            variant="full"
            priority
            className="h-24 sm:h-32 w-auto"
          />
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-[#FBBF24]/10 border border-[#FBBF24]/30 text-[#FBBF24] shadow-inner">
          <ShieldCheck className="w-4 h-4" />
          <span>{labels.badge}</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          {labels.welcomeTitle} <span className="text-[#FBBF24]">OmniChurch PRO</span>
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

                {/* ADMIN EMAIL + PASSWORD SECURITY BLOCK */}
                <div className="p-4 rounded-2xl bg-amber-400/5 border border-amber-400/30 sm:col-span-2 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{labels.authSectionTitle}</span>
                    </label>
                    {!useExistingGoogleAccount && (
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-xs text-slate-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showPassword ? labels.hideText : labels.showText}</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {labels.authSectionHint}
                  </p>

                  {hasLiveReusableAuthUser && (
                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={useExistingGoogleAccount}
                        onChange={(e) => setUseExistingGoogleAccount(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-400 focus:ring-offset-0"
                      />
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-semibold truncate">{labels.useGoogleLabel}</span>
                    </label>
                  )}

                  <button
                    type="button"
                    id="btn-onboard-google-connect"
                    disabled={isGoogleConnecting || isSubmitting}
                    onClick={handleConnectGoogleOnboarding}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 border border-slate-200"
                  >
                    {isGoogleConnecting ? (
                      <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                          <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z" />
                          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                        </svg>
                        <span>
                          {hasLiveReusableAuthUser
                            ? language === 'es'
                              ? 'Cambiar cuenta Google'
                              : language === 'en'
                              ? 'Switch Google account'
                              : language === 'fr'
                              ? 'Changer de compte Google'
                              : 'Chanje kont Google'
                            : language === 'es'
                            ? 'Continuar con Google (1 clic)'
                            : language === 'en'
                            ? 'Connect with Google (1-click)'
                            : language === 'fr'
                            ? 'Continuer avec Google (1 clic)'
                            : 'Konekte ak Google (1 klik)'}
                        </span>
                      </>
                    )}
                  </button>

                  {!useExistingGoogleAccount && (
                    <div className="space-y-3">
                      <div className="relative">
                        <Mail className="w-4 h-4 text-amber-400/80 absolute left-3.5 top-3 pointer-events-none" />
                        <input
                          type="email"
                          required
                          value={formData.adminEmail}
                          onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                          placeholder={labels.adminEmailPlaceholder}
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-amber-400/40 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={formData.adminPassword}
                          onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                          placeholder={labels.passwordPlaceholder}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-amber-400/40 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          placeholder={labels.passwordConfirmPlaceholder}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-amber-400/40 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                id="submit-onboard-church-btn"
                disabled={isSubmitting}
                className="w-full py-3 px-6 rounded-2xl font-bold bg-amber-400 text-slate-950 hover:bg-amber-300 transition-all shadow-lg hover:shadow-amber-400/20 flex items-center justify-center gap-2 cursor-pointer mt-4 disabled:opacity-50"
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
