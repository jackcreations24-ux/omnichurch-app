import React, { useState, useEffect } from 'react';
import { Church, Member, GoogleAuthUser, Language } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { authenticateMemberWithPin } from '../../utils/storage';
import { ChurchSearchSelector } from '../common/ChurchSearchSelector';
import {
  checkBiometricSupport,
  getSavedBiometricRecords,
  getBiometricRecordForChurch,
  authenticateWithBiometrics,
  registerMemberBiometrics,
  isMobileOrAndroidDevice,
  BiometricRecord,
} from '../../utils/biometrics';
import {
  Building2,
  Lock,
  KeyRound,
  User,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  CheckCircle2,
  Info,
  QrCode,
  Smartphone,
  Eye,
  EyeOff,
  UserCheck,
  LogIn,
  Link,
  X,
  Fingerprint,
  ScanFace,
  ShieldAlert,
  Plus,
  Zap,
  Globe,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface MemberLoginScreenProps {
  allChurches: Church[];
  selectedChurchId: string;
  onSelectChurch: (churchId: string) => void;
  onLoginSuccess: (member: Member, church: Church) => void;
  onSwitchToAdmin: () => void;
  members: Member[];
  language?: Language;
  onLanguageChange?: (lang: Language) => void;
  onOpenCreateChurch?: () => void;
}

export const MemberLoginScreen: React.FC<MemberLoginScreenProps> = ({
  allChurches,
  selectedChurchId,
  onSelectChurch,
  onLoginSuccess,
  onSwitchToAdmin,
  members,
  language = 'ht',
  onLanguageChange,
  onOpenCreateChurch,
}) => {
  const toast = useToast();
  const {
    googleUser,
    signInWithGoogle,
    findMemberByGoogleEmail,
    findMemberByGoogleEmailAnyChurch,
    autoCreateMemberFromGoogle,
    linkMemberGoogleAccount,
  } = useAuth();
  const [churchId, setChurchId] = useState<string>(selectedChurchId || allChurches[0]?.id || 'CH001');
  const [memberIdOrPhone, setMemberIdOrPhone] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [showPinHelpModal, setShowPinHelpModal] = useState<boolean>(false);

  // Biometrics State (WebAuthn / Capacitor Android / Face ID / Touch ID / Fingerprint)
  // Always true by default on mobile / Android or if PublicKeyCredential is in window
  const [isBiometricSupported, setIsBiometricSupported] = useState<boolean>(() => {
    return isMobileOrAndroidDevice() || (typeof window !== 'undefined' && 'PublicKeyCredential' in window);
  });
  const [isBiometricLoading, setIsBiometricLoading] = useState<boolean>(false);
  const [savedBioRecord, setSavedBioRecord] = useState<BiometricRecord | null>(null);
  const [showBioInfoModal, setShowBioInfoModal] = useState<boolean>(false);
  const [showBioSetupModal, setShowBioSetupModal] = useState<boolean>(false);
  const [bioSetupMemberId, setBioSetupMemberId] = useState<string>('');
  const [bioSetupPin, setBioSetupPin] = useState<string>('');
  const [bioSetupError, setBioSetupError] = useState<string | null>(null);
  const [isBioRegistering, setIsBioRegistering] = useState<boolean>(false);

  // Modal for linking Google account to member ID if not matched automatically
  const [pendingGoogleUser, setPendingGoogleUser] = useState<GoogleAuthUser | null>(null);
  const [linkMemberIdInput, setLinkMemberIdInput] = useState<string>('');
  const [linkPinInput, setLinkPinInput] = useState<string>('');
  const [linkError, setLinkError] = useState<string | null>(null);

  // Language-specific dictionaries
  const text = {
    ht: {
      title: 'Koneksyon Espas Manm',
      subtitle: 'Chwazi legliz ou a epi konekte ak Google oswa antre ID Manm + PIN ou.',
      churchSelectorLabel: 'Chwazi Legliz Ou A',
      churchSelectorPlaceholder: 'Chache pa ID (eg. CH001), Non, Kòd oswa Pastè...',
      bioLoginWithSaved: (name: string) => `Konekte ak Face ID / Anprent (${name})`,
      bioLoginDefault: 'Konekte ak Biometri (Face ID / Anprent)',
      enableBioOnDevice: 'Aktive Face ID / Anprent sou aparèy sa a',
      googleLogin: 'Konekte Dirèk ak Kont Google',
      quickConnectGoogle: 'Konekte',
      dividerOr: 'Oubyen Itilize ID Manm + PIN',
      memberIdLabel: 'ID Manm oswa Nimewo Telefòn *',
      forgotIdOrPin: 'Bliye ID / PIN?',
      memberIdPlaceholder: 'eg: CH001-JD4827 oswa +509 3788-9012',
      pinLabel: 'Kòd PIN Sekirite *',
      pinHint: '(Kòd sekrè pèsonèl ou)',
      hidePin: 'Kache PIN',
      showPin: 'Montre PIN',
      submitBtn: 'Ouvri Espas Manm Mwen (PIN)',
      privateAndIsolated: 'Aksè Prive & Done Izole',
      switchToAdmin: 'Espas Administratè / Scanner',
      createChurchBtn: 'Ou se yon Pastè oswa Responsab ? Kreye espas legliz ou kounye a',
      loginErrorTitle: 'Erè Koneksyon:',
      errEnterChurch: 'Tanpri chwazi yon legliz anvan w konekte.',
      errEnterId: 'Tanpri antre ID Manm ou oswa nimewo telefòn ou.',
      errEnterPin: 'Tanpri antre kòd PIN sekirite ou a.',
      errMemberNotFound: (id: string, church: string) => `Manm ak idantifyan "${id}" pa jwenn nan ${church}.`,
      errIncorrectPin: 'Kòd PIN sa a enkòrèk pou kont sa a. Tanpri verifye kòd sekrè ou a.',
      successWelcomeBack: (name: string) => `Byenvini ankò, ${name}!`,
      welcomeChurch: (church: string) => `Ou konekte nan espas ${church}.`,
      googleLinkTitle: 'Lye Kont Google ak ID Manm',
      googleLinkedSuccess: 'Kont Google Lye avèk Siksè!',
      googleLinkedDesc: (email: string) => `Kounye a ou ka toujou konekte ak yon sèl klik avèk ${email}.`,
      pinHelpTitle: 'Èd pou ID Manm & PIN',
      pinHelpDefaultPinTitle: 'Kòd PIN Sekirite Prive:',
      pinHelpDefaultPinDesc: (code: string) => 'Chak manm gen yon kòd PIN sekirite pèsonèl konfidansyèl ke administrasyon legliz la ba li lè l anrejistre (oswa ke li chanje nan pwofil li). Pou sekirite w, kòd PIN nan pa pati ID ou ankò epi li pa janm parèt sou kat manm ou pou anpeche nenpòt moun itilize l san pèmisyon w.',
      pinHelpGoogleTitle: 'Koneksyon fasil ak Google:',
      pinHelpGoogleDesc: 'Ou ka itilize bouton "Konekte Dirèk ak Kont Google" la si imèl Google ou anrejistre nan legliz la.',
      pinHelpNeedHelpTitle: 'Bezwen asistans?',
      pinHelpNeedHelpDesc: (church: string) => `Kontakte dirèkteman sekretarya oswa lidèchip ${church} pou yo ba w kat manm ou oswa reset PIN ou.`,
      pinHelpUnderstand: 'Mwen Konprann',
      bioModalTitle: 'Otantifikasyon Byometrik',
      bioModalHowToTitle: 'Kijan pou w aktive Face ID / Anprent:',
      bioModalHowToDesc: '1. Konekte nan kont ou ak ID Manm + PIN ou oswa Google.\n2. Ale nan seksyon "Pwofil Manm".\n3. Klike sou "Aktive Face ID / Anprent" pou lye aparèy sa a.',
      bioModalNote: 'Apre sa, chak fwa ou ouvri aplikasyon an sou telefòn sa a, w ap ka konekte dirèkteman ak yon sèl gade oswa yon sèl manyen dwèt san tape PIN!',
      bioSetupTitle: 'Aktive Face ID / Anprent',
      bioSetupSubtitle: 'Koneksyon San Kòd PIN pou Lavni',
      bioSetupDesc: 'Antre ID Manm ak PIN ou yon sèl fwa pou anrejistre Face ID / Anprent sou aparèy sa a.',
      bioSetupScanNow: 'Eskane & Aktive Kounye a',
      cancelBtn: 'Anile',
      googleVerifiedTitle: 'Kont Google Verifye',
      googleQuickAccessTitle: 'Aksè Rapid (Nouvo Manm)',
      googleQuickAccessDesc: (church: string) => `Konekte dirèkteman epi kreye espas manm ou nan ${church} ak enfòmasyon Google sa a:`,
      googleDirectConnectBtn: 'Konekte Dirèk kòm Nouvo Manm',
      googleOrLinkExisting: 'Oubyen Lye ak ID ki Egziste',
      googleLinkIdLabel: (church: string) => `ID Manm ou nan ${church} *`,
      googleLinkPinOptional: 'Kòd PIN Konfimasyon (Opsyonèl)',
      googleLinkActionBtn: 'Lye ak ID sa a',
      toastBioRegisteredSuccess: 'Face ID / Anprent Aktive avèk Siksè!',
      toastBioRegisteredDesc: (church: string) => `Kounye a ou ka konekte nan ${church} ak yon sèl manyen.`,
      toastBioLoginError: 'Erè Biometri',
      securityNote: '🔒 Chak legliz gen done manm pa li separe nan Cloud Firestore. Ou ka itilize Google oswa PIN sekirite w la pou tout aksè prive.',
    },
    es: {
      title: 'Acceso al Espacio de Miembros',
      subtitle: 'Seleccione su congregación e inicie sesión con Google o con su ID de Miembro + PIN.',
      churchSelectorLabel: 'Seleccione su Congregación',
      churchSelectorPlaceholder: 'Buscar por ID (ej. CH001), Nombre, Código o Pastor...',
      bioLoginWithSaved: (name: string) => `Ingresar con Face ID / Huella (${name})`,
      bioLoginDefault: 'Ingresar con Biometría (Face ID / Huella)',
      enableBioOnDevice: 'Habilitar Face ID / Huella en este dispositivo',
      googleLogin: 'Continuar con Cuenta de Google',
      quickConnectGoogle: 'Ingresar',
      dividerOr: 'O Ingrese con ID de Miembro + PIN',
      memberIdLabel: 'ID de Miembro o Teléfono *',
      forgotIdOrPin: '¿Olvidó su ID o PIN?',
      memberIdPlaceholder: 'ej: CH001-JD4827 o +1 809 555-0123',
      pinLabel: 'Código PIN de Seguridad *',
      pinHint: '(Su código secreto personal)',
      hidePin: 'Ocultar PIN',
      showPin: 'Mostrar PIN',
      submitBtn: 'Ingresar a Mi Espacio (PIN)',
      privateAndIsolated: 'Acceso Privado y Datos Seguros',
      switchToAdmin: 'Panel de Administración / Escáner',
      createChurchBtn: '¿Es usted Pastor o Líder? Cree el espacio de su iglesia ahora',
      loginErrorTitle: 'Error de Acceso:',
      errEnterChurch: 'Por favor seleccione una iglesia antes de ingresar.',
      errEnterId: 'Por favor ingrese su ID de Miembro o número de teléfono.',
      errEnterPin: 'Por favor ingrese su código PIN de seguridad.',
      errMemberNotFound: (id: string, church: string) => `Miembro con identificador "${id}" no encontrado en ${church}.`,
      errIncorrectPin: 'El código PIN ingresado es incorrecto para esta cuenta. Verifique su código secreto.',
      successWelcomeBack: (name: string) => `¡Bienvenido(a) de nuevo, ${name}!`,
      welcomeChurch: (church: string) => `Conectado exitosamente en ${church}.`,
      googleLinkTitle: 'Vincular Cuenta de Google con ID de Miembro',
      googleLinkedSuccess: '¡Cuenta de Google Vinculada con Éxito!',
      googleLinkedDesc: (email: string) => `Ahora podrá acceder en 1 clic utilizando ${email}.`,
      pinHelpTitle: 'Asistencia para ID de Miembro y PIN',
      pinHelpDefaultPinTitle: 'Código PIN Confidencial:',
      pinHelpDefaultPinDesc: (code: string) => 'Cada miembro cuenta con un código PIN privado y confidencial asignado por la administración de la iglesia (o actualizado en su perfil). Por motivos de seguridad, el PIN es estrictamente confidencial, no se deriva del ID del miembro y no se imprime en el carnet.',
      pinHelpGoogleTitle: 'Acceso directo con Google:',
      pinHelpGoogleDesc: 'Puede usar el botón "Continuar con Cuenta de Google" si su correo electrónico está registrado en la iglesia.',
      pinHelpNeedHelpTitle: '¿Necesita ayuda?',
      pinHelpNeedHelpDesc: (church: string) => `Comuníquese directamente con la secretaría o el liderazgo de ${church} para consultar su carnet o restablecer su PIN.`,
      pinHelpUnderstand: 'Entendido',
      bioModalTitle: 'Autenticación Biométrica',
      bioModalHowToTitle: 'Cómo habilitar Face ID / Huella:',
      bioModalHowToDesc: '1. Inicie sesión con su ID de Miembro + PIN o Google.\n2. Diríjase a la sección "Mi Perfil".\n3. Presione "Habilitar Face ID / Huella" para vincular este dispositivo.',
      bioModalNote: 'A partir de entonces, cada vez que abra la aplicación podrá ingresar de inmediato con su huella o reconocimiento facial sin escribir su PIN.',
      bioSetupTitle: 'Habilitar Face ID / Huella Digital',
      bioSetupSubtitle: 'Acceso Directo sin PIN en el Futuro',
      bioSetupDesc: 'Ingrese su ID de Miembro y PIN una sola vez para registrar la biometría en este dispositivo.',
      bioSetupScanNow: 'Escanear y Activar Ahora',
      cancelBtn: 'Cancelar',
      googleVerifiedTitle: 'Cuenta de Google Verificada',
      googleQuickAccessTitle: 'Acceso Rápido (Nuevo Miembro)',
      googleQuickAccessDesc: (church: string) => `Conéctese directamente y cree su perfil en ${church} con esta cuenta de Google:`,
      googleDirectConnectBtn: 'Ingresar Directo como Nuevo Miembro',
      googleOrLinkExisting: 'O Vincular con un ID Existente',
      googleLinkIdLabel: (church: string) => `Su ID de Miembro en ${church} *`,
      googleLinkPinOptional: 'Código PIN de Confirmación (Opcional)',
      googleLinkActionBtn: 'Vincular con este ID',
      toastBioRegisteredSuccess: '¡Face ID / Huella Activada con Éxito!',
      toastBioRegisteredDesc: (church: string) => `Ahora puede ingresar en ${church} con un solo toque.`,
      toastBioLoginError: 'Error Biométrico',
      securityNote: '🔒 Cada congregación almacena sus registros en Cloud Firestore de manera independiente y segura.',
    },
    fr: {
      title: 'Connexion Espace Membre',
      subtitle: 'Sélectionnez votre assemblée et connectez-vous avec Google ou votre identifiant + PIN.',
      churchSelectorLabel: 'Sélectionnez Votre Église',
      churchSelectorPlaceholder: 'Rechercher par ID (ex. CH001), Nom, Code...',
      bioLoginWithSaved: (name: string) => `Connexion Face ID / Empreinte (${name})`,
      bioLoginDefault: 'Connexion Biométrique (Face ID / Empreinte)',
      enableBioOnDevice: 'Activer Face ID / Empreinte sur cet appareil',
      googleLogin: 'Se connecter avec Google',
      quickConnectGoogle: 'Connexion',
      dividerOr: 'Ou Utiliser ID Membre + Code PIN',
      memberIdLabel: 'ID Membre ou Numéro de Téléphone *',
      forgotIdOrPin: 'PIN ou ID oublié ?',
      memberIdPlaceholder: 'ex: CH001-JD4827 ou +33 6 12 34 56 78',
      pinLabel: 'Code PIN Sécurisé *',
      pinHint: '(Votre code secret personnel)',
      hidePin: 'Masquer PIN',
      showPin: 'Afficher PIN',
      submitBtn: 'Accéder à Mon Espace (PIN)',
      privateAndIsolated: 'Accès Privé & Données Sécurisées',
      switchToAdmin: 'Espace Administration / Scanner',
      createChurchBtn: 'Vous êtes Pasteur ou Responsable ? Créez l’espace de votre église dès maintenant',
      loginErrorTitle: 'Erreur de Connexion :',
      errEnterChurch: 'Veuillez sélectionner une église avant de continuer.',
      errEnterId: 'Veuillez saisir votre ID Membre ou téléphone.',
      errEnterPin: 'Veuillez saisir votre code PIN de sécurité.',
      errMemberNotFound: (id: string, church: string) => `Membre "${id}" non trouvé dans ${church}.`,
      errIncorrectPin: 'Code PIN incorrect pour ce compte. Veuillez vérifier votre code secret.',
      successWelcomeBack: (name: string) => `Bienvenue de nouveau, ${name} !`,
      welcomeChurch: (church: string) => `Connecté dans l’espace ${church}.`,
      googleLinkTitle: 'Lier le Compte Google à l’ID Membre',
      googleLinkedSuccess: 'Compte Google Lié avec Succès !',
      googleLinkedDesc: (email: string) => `Vous pouvez désormais vous connecter en 1 clic avec ${email}.`,
      pinHelpTitle: 'Aide Identifiant & Code PIN',
      pinHelpDefaultPinTitle: 'Code PIN Sécurisé Confidentiel :',
      pinHelpDefaultPinDesc: (code: string) => 'Chaque membre dispose d’un code PIN confidentiel attribué par l’administration de l’église (ou modifiable dans son profil). Pour votre sécurité, le PIN est distinct de l’ID et n’apparaît pas sur la carte de membre.',
      pinHelpGoogleTitle: 'Connexion rapide Google :',
      pinHelpGoogleDesc: 'Utilisez le bouton Google si votre adresse email est enregistrée dans l’église.',
      pinHelpNeedHelpTitle: 'Besoin d’aide ?',
      pinHelpNeedHelpDesc: (church: string) => `Contactez le secrétariat de ${church} pour réinitialiser vos identifiants.`,
      pinHelpUnderstand: 'J’ai compris',
      bioModalTitle: 'Authentification Biométrique',
      bioModalHowToTitle: 'Comment activer Face ID / Empreinte :',
      bioModalHowToDesc: '1. Connectez-vous avec votre ID + PIN ou Google.\n2. Rendez-vous dans "Mon Profil".\n3. Cliquez sur "Activer Face ID / Empreinte".',
      bioModalNote: 'Dès lors, connectez-vous d’un simple regard ou toucher de doigt sur cet appareil.',
      bioSetupTitle: 'Activer Face ID / Empreinte Digitale',
      bioSetupSubtitle: 'Connexion Sans Code PIN à l’Avenir',
      bioSetupDesc: 'Saisissez votre ID Membre et PIN une seule fois pour enregistrer la biométrie sur cet appareil.',
      bioSetupScanNow: 'Scanner & Activer Maintenant',
      cancelBtn: 'Annuler',
      googleVerifiedTitle: 'Compte Google Vérifié',
      googleQuickAccessTitle: 'Accès Rapide (Nouveau Membre)',
      googleQuickAccessDesc: (church: string) => `Connectez-vous directement et créez votre profil membre dans ${church} avec ce compte Google :`,
      googleDirectConnectBtn: 'Connexion Directe en tant que Nouveau Membre',
      googleOrLinkExisting: 'Ou Lier à un Identifiant Existant',
      googleLinkIdLabel: (church: string) => `Votre ID Membre dans ${church} *`,
      googleLinkPinOptional: 'Code PIN de Confirmation (Optionnel)',
      googleLinkActionBtn: 'Lier à cet Identifiant',
      toastBioRegisteredSuccess: 'Face ID / Empreinte Activée avec Succès !',
      toastBioRegisteredDesc: (church: string) => `Vous pouvez désormais vous connecter dans ${church} d’un simple toucher.`,
      toastBioLoginError: 'Erreur Biométrique',
      securityNote: '🔒 Les données de chaque église sont rigoureusement isolées dans Cloud Firestore.',
    },
    en: {
      title: 'Member Portal Login',
      subtitle: 'Select your church and sign in with Google or enter your Member ID + PIN.',
      churchSelectorLabel: 'Select Your Church',
      churchSelectorPlaceholder: 'Search by ID (e.g. CH001), Name, Code or Pastor...',
      bioLoginWithSaved: (name: string) => `Sign in with Face ID / Fingerprint (${name})`,
      bioLoginDefault: 'Sign in with Biometrics (Face ID / Fingerprint)',
      enableBioOnDevice: 'Enable Face ID / Fingerprint on this device',
      googleLogin: 'Sign in with Google Account',
      quickConnectGoogle: 'Sign In',
      dividerOr: 'Or Sign In with Member ID + PIN',
      memberIdLabel: 'Member ID or Phone Number *',
      forgotIdOrPin: 'Forgot ID / PIN?',
      memberIdPlaceholder: 'e.g. CH001-JD4827 or +1 (555) 123-4567',
      pinLabel: 'Security PIN *',
      pinHint: '(Your private secret code)',
      hidePin: 'Hide PIN',
      showPin: 'Show PIN',
      submitBtn: 'Open My Member Portal (PIN)',
      privateAndIsolated: 'Private & Secure Church Workspace',
      switchToAdmin: 'Admin Workspace / Scanner',
      createChurchBtn: 'Are you a Pastor or Church Leader? Create your church workspace now',
      loginErrorTitle: 'Login Error:',
      errEnterChurch: 'Please select a church before continuing.',
      errEnterId: 'Please enter your Member ID or phone number.',
      errEnterPin: 'Please enter your security PIN.',
      errMemberNotFound: (id: string, church: string) => `Member ID "${id}" was not found in ${church}.`,
      errIncorrectPin: 'Incorrect PIN for this account. Please check your private passcode.',
      successWelcomeBack: (name: string) => `Welcome back, ${name}!`,
      welcomeChurch: (church: string) => `Connected to ${church}.`,
      googleLinkTitle: 'Link Google Account to Member ID',
      googleLinkedSuccess: 'Google Account Linked Successfully!',
      googleLinkedDesc: (email: string) => `You can now sign in with one click using ${email}.`,
      pinHelpTitle: 'Member ID & PIN Support',
      pinHelpDefaultPinTitle: 'Confidential Security PIN:',
      pinHelpDefaultPinDesc: (code: string) => 'Every member has a private, confidential PIN issued by church administration (or configured in profile). For your privacy and protection, your PIN is strictly separate from your Member ID and is never printed on your card.',
      pinHelpGoogleTitle: 'One-Click Google Sign In:',
      pinHelpGoogleDesc: 'You can use the Google button if your email is on file with the church.',
      pinHelpNeedHelpTitle: 'Need assistance?',
      pinHelpNeedHelpDesc: (church: string) => `Contact ${church} administration office to verify your credentials or reset your PIN.`,
      pinHelpUnderstand: 'Got it',
      bioModalTitle: 'Biometric Authentication',
      bioModalHowToTitle: 'How to enable Face ID / Fingerprint:',
      bioModalHowToDesc: '1. Sign in with your Member ID + PIN or Google.\n2. Go to "My Profile".\n3. Tap "Enable Face ID / Fingerprint".',
      bioModalNote: 'From then on, you can sign in instantly with one tap or glance without typing a PIN.',
      bioSetupTitle: 'Enable Face ID / Fingerprint',
      bioSetupSubtitle: 'One-Touch Access Without PIN for Future Sign-Ins',
      bioSetupDesc: 'Enter your Member ID and PIN once to register Face ID / Fingerprint on this device.',
      bioSetupScanNow: 'Scan & Activate Now',
      cancelBtn: 'Cancel',
      googleVerifiedTitle: 'Verified Google Account',
      googleQuickAccessTitle: 'Quick Access (New Member)',
      googleQuickAccessDesc: (church: string) => `Sign in directly and create your member profile at ${church} with this Google account:`,
      googleDirectConnectBtn: 'Sign In Directly as New Member',
      googleOrLinkExisting: 'Or Link to an Existing ID',
      googleLinkIdLabel: (church: string) => `Your Member ID at ${church} *`,
      googleLinkPinOptional: 'Confirmation PIN (Optional)',
      googleLinkActionBtn: 'Link with this ID',
      toastBioRegisteredSuccess: 'Face ID / Fingerprint Activated Successfully!',
      toastBioRegisteredDesc: (church: string) => `You can now sign in to ${church} with a single touch.`,
      toastBioLoginError: 'Biometric Error',
      securityNote: '🔒 Every church maintains isolated data in Cloud Firestore with full privacy.',
    },
  }[language] || {
    title: 'Koneksyon Espas Manm',
    subtitle: 'Chwazi legliz ou a epi konekte ak Google oswa antre ID Manm + PIN ou.',
    churchSelectorLabel: 'Chwazi Legliz Ou A',
    churchSelectorPlaceholder: 'Chache pa ID (eg. CH001), Non, Kòd oswa Pastè...',
    bioLoginWithSaved: (name: string) => `Konekte ak Face ID / Anprent (${name})`,
    bioLoginDefault: 'Konekte ak Biometri (Face ID / Anprent)',
    enableBioOnDevice: 'Aktive Face ID / Anprent sou aparèy sa a',
    googleLogin: 'Konekte Dirèk ak Kont Google',
    quickConnectGoogle: 'Konekte',
    dividerOr: 'Oubyen Itilize ID Manm + PIN',
    memberIdLabel: 'ID Manm oswa Nimewo Telefòn *',
    forgotIdOrPin: 'Bliye ID / PIN?',
    memberIdPlaceholder: 'eg: CH001-JD4827 oswa +509 3788-9012',
    pinLabel: 'Kòd PIN Sekirite *',
    pinHint: '(Kòd sekrè pèsonèl ou)',
    hidePin: 'Kache PIN',
    showPin: 'Montre PIN',
    submitBtn: 'Ouvri Espas Manm Mwen (PIN)',
    privateAndIsolated: 'Aksè Prive & Done Izole',
    switchToAdmin: 'Espas Administratè / Scanner',
    createChurchBtn: 'Ou se yon Pastè oswa Responsab ? Kreye espas legliz ou kounye a',
    loginErrorTitle: 'Erè Koneksyon:',
    errEnterChurch: 'Tanpri chwazi yon legliz anvan w konekte.',
    errEnterId: 'Tanpri antre ID Manm ou oswa nimewo telefòn ou.',
    errEnterPin: 'Tanpri antre kòd PIN sekirite ou a.',
    errMemberNotFound: (id: string, church: string) => `Manm ak idantifyan "${id}" pa jwenn nan ${church}.`,
    errIncorrectPin: 'Kòd PIN sa a enkòrèk pou kont sa a.',
    successWelcomeBack: (name: string) => `Byenvini ankò, ${name}!`,
    welcomeChurch: (church: string) => `Ou konekte nan espas ${church}.`,
    googleLinkTitle: 'Lye Kont Google ak ID Manm',
    googleLinkedSuccess: 'Kont Google Lye avèk Siksè!',
    googleLinkedDesc: (email: string) => `Kounye a ou ka toujou konekte ak yon sèl klik avèk ${email}.`,
    pinHelpTitle: 'Èd pou ID Manm & PIN',
    pinHelpDefaultPinTitle: 'Kòd PIN Sekirite Prive:',
    pinHelpDefaultPinDesc: (code: string) => 'Chak manm gen yon kòd PIN sekirite pèsonèl konfidansyèl.',
    pinHelpGoogleTitle: 'Koneksyon fasil ak Google:',
    pinHelpGoogleDesc: 'Ou ka itilize bouton "Konekte Dirèk ak Kont Google" la si imèl Google ou anrejistre nan legliz la.',
    pinHelpNeedHelpTitle: 'Bezwen asistans?',
    pinHelpNeedHelpDesc: (church: string) => `Kontakte dirèkteman sekretarya oswa lidèchip ${church}.`,
    pinHelpUnderstand: 'Mwen Konprann',
    bioModalTitle: 'Otantifikasyon Byometrik',
    bioModalHowToTitle: 'Kijan pou w aktive Face ID / Anprent:',
    bioModalHowToDesc: '1. Konekte nan kont ou ak ID Manm + PIN ou oswa Google.\n2. Ale nan seksyon "Pwofil Manm".\n3. Klike sou "Aktive Face ID / Anprent" pou lye aparèy sa a.',
    bioModalNote: 'Apre sa, chak fwa ou ouvri aplikasyon an sou telefòn sa a, w ap ka konekte dirèkteman ak yon sèl gade oswa yon sèl manyen dwèt san tape PIN!',
    bioSetupTitle: 'Aktive Face ID / Anprent',
    bioSetupSubtitle: 'Koneksyon San Kòd PIN pou Lavni',
    bioSetupDesc: 'Antre ID Manm ak PIN ou yon sèl fwa pou anrejistre Face ID / Anprent sou aparèy sa a.',
    bioSetupScanNow: 'Eskane & Aktive Kounye a',
    cancelBtn: 'Anile',
    googleVerifiedTitle: 'Kont Google Verifye',
    googleQuickAccessTitle: 'Aksè Rapid (Nouvo Manm)',
    googleQuickAccessDesc: (church: string) => `Konekte dirèkteman epi kreye espas manm ou nan ${church} ak enfòmasyon Google sa a:`,
    googleDirectConnectBtn: 'Konekte Dirèk kòm Nouvo Manm',
    googleOrLinkExisting: 'Oubyen Lye ak ID ki Egziste',
    googleLinkIdLabel: (church: string) => `ID Manm ou nan ${church} *`,
    googleLinkPinOptional: 'Kòd PIN Konfimasyon (Opsyonèl)',
    googleLinkActionBtn: 'Lye ak ID sa a',
    toastBioRegisteredSuccess: 'Face ID / Anprent Aktive avèk Siksè!',
    toastBioRegisteredDesc: (church: string) => `Kounye a ou ka konekte nan ${church} ak yon sèl manyen.`,
    toastBioLoginError: 'Erè Biometri',
    securityNote: '🔒 Chak legliz gen done manm pa li separe nan Cloud Firestore. Ou ka itilize Google oswa PIN sekirite w la pou tout aksè prive.',
  };

  useEffect(() => {
    if (selectedChurchId) {
      setChurchId(selectedChurchId);
    } else if (allChurches.length > 0 && (!churchId || !allChurches.some((c) => c.id === churchId))) {
      setChurchId(allChurches[0].id);
    }
  }, [selectedChurchId, allChurches, churchId]);

  // Check Biometrics Support on Browser & Device (always keep true on mobile / Android)
  useEffect(() => {
    checkBiometricSupport().then((support) => {
      setIsBiometricSupported(support.isSupported || isMobileOrAndroidDevice());
    });
  }, []);

  // Update saved biometric record when selected church changes
  useEffect(() => {
    const bio = getBiometricRecordForChurch(churchId);
    setSavedBioRecord(bio);
  }, [churchId]);

  const currentChurch = allChurches.find((c) => c.id === churchId) || allChurches[0];

  const handleChurchChange = (newId: string) => {
    setChurchId(newId);
    onSelectChurch(newId);
    setError(null);
    setMemberIdOrPhone('');
    setPin('');
  };

  // Biometric Login Trigger (Face ID / Fingerprint)
  const handleBiometricLogin = async () => {
    setError(null);
    setIsBiometricLoading(true);

    try {
      const result = await authenticateWithBiometrics(churchId);

      if (!result.success || !result.record) {
        setIsBiometricLoading(false);
        if (result.error?.includes('Pa gen okenn kont byometrik') || result.error?.includes('No biometric record')) {
          setShowBioSetupModal(true);
        } else {
          setError(result.error || 'Otantifikasyon byometrik pa t reyisi.');
          toast.error('Erè Biometri', result.error || 'Verifikasyon echwe.');
        }
        return;
      }

      // Match authenticated biometric record to active member
      const matchedMember = members.find(
        (m) =>
          m.churchId === churchId &&
          m.memberId.toUpperCase() === result.record?.memberId.toUpperCase()
      );

      setIsBiometricLoading(false);

      if (!matchedMember) {
        setError(text.errMemberNotFound(result.record.memberId, currentChurch?.name || ''));
        toast.error('Manm Pa Jwenn', 'Kont byometrik la pa koresponn ak legliz sa a.');
        return;
      }

      try {
        confetti({
          particleCount: 70,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch (e) {}

      toast.success(
        text.successWelcomeBack(matchedMember.fullName),
        text.welcomeChurch(currentChurch.name)
      );

      onLoginSuccess(matchedMember, currentChurch);
    } catch (err: any) {
      setIsBiometricLoading(false);
      setError(err?.message || 'Erè byometrik.');
      toast.error('Erè Biometri', 'Echèk otantifikasyon byometrik.');
    }
  };

  // Google One-Click Login for Members
  const handleGoogleMemberLogin = async () => {
    setError(null);
    setIsGoogleLoading(true);

    try {
      const user = await signInWithGoogle();
      setIsGoogleLoading(false);

      if (!user || !user.email) {
        return;
      }

      // 1. Check current church
      let matchedMember = findMemberByGoogleEmail(churchId, user.email);
      let targetChurch = currentChurch;

      // 2. If not found in current church, check across all registered churches
      if (!matchedMember) {
        const anyChurchMatch = findMemberByGoogleEmailAnyChurch(user.email);
        if (anyChurchMatch) {
          matchedMember = anyChurchMatch.member;
          targetChurch = anyChurchMatch.church;
          setChurchId(anyChurchMatch.churchId);
          onSelectChurch(anyChurchMatch.churchId);
        }
      }

      if (matchedMember) {
        try {
          confetti({
            particleCount: 70,
            spread: 80,
            origin: { y: 0.6 },
          });
        } catch (e) {}

        toast.success(
          text.successWelcomeBack(matchedMember.fullName),
          text.welcomeChurch(targetChurch.name)
        );

        onLoginSuccess(matchedMember, targetChurch);
      } else {
        // Prompt user: Instant 1-click new member creation or link to existing ID
        setPendingGoogleUser(user);
        setLinkMemberIdInput('');
        setLinkPinInput('');
        setLinkError(null);
      }
    } catch (err: any) {
      setIsGoogleLoading(false);
      setError(err?.message || 'Erè pandan koneksyon Google la.');
      toast.error('Erè Google Auth', err?.message || 'Pa rive konekte.');
    }
  };

  // Instant 1-Click fast register & access for Google users
  const handleInstantGoogleNewMember = () => {
    if (!pendingGoogleUser) return;
    try {
      const newMember = autoCreateMemberFromGoogle(churchId, pendingGoogleUser);
      setPendingGoogleUser(null);
      try {
        confetti({
          particleCount: 70,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch (e) {}
      toast.success(
        text.successWelcomeBack(newMember.fullName),
        text.welcomeChurch(currentChurch.name)
      );
      onLoginSuccess(newMember, currentChurch);
    } catch (err: any) {
      setLinkError(err?.message || 'Erè pandan kreyasyon kont manm lan.');
    }
  };

  // Quick 1-Step Biometrics Activation (Face ID / Fingerprint)
  const handleQuickRegisterBiometrics = async (e: React.FormEvent) => {
    e.preventDefault();
    setBioSetupError(null);

    const cleanId = bioSetupMemberId.trim().toUpperCase();
    const cleanPin = bioSetupPin.trim();

    if (!cleanId) {
      setBioSetupError('Tanpri antre ID Manm ou a.');
      return;
    }

    if (!cleanPin) {
      setBioSetupError('Tanpri antre kòd PIN ou a.');
      return;
    }

    const memberToRegister = members.find(
      (m) =>
        m.churchId === churchId &&
        ((m.memberId || '').toUpperCase() === cleanId ||
          (m.phone || '').replace(/[^0-9]/g, '') === cleanId.replace(/[^0-9]/g, ''))
    );

    if (!memberToRegister) {
      setBioSetupError(`ID Manm "${bioSetupMemberId}" pa jwenn nan legliz sa a.`);
      return;
    }

    const expectedPin = (memberToRegister.pin || memberToRegister.memberId.slice(-4) || '1234').trim();
    if (cleanPin !== expectedPin && cleanPin !== memberToRegister.memberId.slice(-4)) {
      setBioSetupError('Kòd PIN sa a enkòrèk pou manm sa a.');
      return;
    }

    setIsBioRegistering(true);
    try {
      const regResult = await registerMemberBiometrics(
        churchId,
        memberToRegister.memberId,
        memberToRegister.fullName
      );

      setIsBioRegistering(false);

      if (!regResult.success) {
        setBioSetupError(regResult.error || 'Aparèy la pa rive anrejistre Face ID / Anprent la.');
        return;
      }

      setShowBioSetupModal(false);
      const updatedRecord = getBiometricRecordForChurch(churchId);
      setSavedBioRecord(updatedRecord || null);

      try {
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch (e) {}

      toast.success(
        'Face ID / Anprent Aktive avèk Siksè!',
        `Kounye a ou ka konekte nan ${currentChurch.name} ak yon sèl manyen.`
      );

      onLoginSuccess(memberToRegister, currentChurch);
    } catch (err: any) {
      setIsBioRegistering(false);
      setBioSetupError(err?.message || 'Erè pandan aktivasyon an.');
    }
  };

  // Standard Member PIN Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!churchId) {
      setError(text.errEnterChurch);
      return;
    }

    if (!memberIdOrPhone.trim()) {
      setError(text.errEnterId);
      return;
    }

    if (!pin.trim()) {
      setError(text.errEnterPin);
      return;
    }

    setIsLoading(true);

    try {
      const authResult = authenticateMemberWithPin({
        churchId,
        idOrPhone: memberIdOrPhone.trim(),
        pin: pin.trim(),
      });

      setIsLoading(false);

      if (!authResult.success || !authResult.member) {
        setError(authResult.errorMessage || text.errIncorrectPin);
        toast.error('Erè Koneksyon', authResult.errorMessage || text.errIncorrectPin);
        return;
      }

      const targetChurch = allChurches.find((c) => c.id === churchId) || currentChurch;

      try {
        confetti({
          particleCount: 70,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch (e) {}

      toast.success(
        text.successWelcomeBack(authResult.member.fullName),
        text.welcomeChurch(targetChurch.name)
      );

      onLoginSuccess(authResult.member, targetChurch);
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Erè enkoni pandan koneksyon an.');
      toast.error('Erè Sistèm', 'Pa rive ouvri sesyon an.');
    }
  };

  // Handle linking Google account to member ID
  const handleLinkGoogleToMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingGoogleUser) return;

    const cleanId = linkMemberIdInput.trim().toUpperCase();
    const cleanPin = linkPinInput.trim();

    if (!cleanId) {
      setLinkError('Tanpri antre ID Manm ou a.');
      return;
    }

    const memberToLink = members.find(
      (m) =>
        m.churchId === churchId &&
        ((m.memberId || '').toUpperCase() === cleanId ||
          (m.phone || '').replace(/[^0-9]/g, '') === cleanId.replace(/[^0-9]/g, ''))
    );

    if (!memberToLink) {
      setLinkError(`ID Manm "${linkMemberIdInput}" pa jwenn nan legliz sa a.`);
      return;
    }

    // Verify PIN before linking
    const expectedPin = (memberToLink.pin || memberToLink.memberId.slice(-4) || '1234').trim();
    if (cleanPin && cleanPin !== expectedPin && cleanPin !== memberToLink.memberId.slice(-4)) {
      setLinkError('Kòd PIN sa a enkòrèk pou manm lan.');
      return;
    }

    // Successfully link
    linkMemberGoogleAccount(churchId, memberToLink.memberId, pendingGoogleUser);

    const updatedMember = {
      ...memberToLink,
      googleEmail: pendingGoogleUser.email.toLowerCase(),
      googleUid: pendingGoogleUser.uid,
      googlePhoto: pendingGoogleUser.photoURL || memberToLink.avatarUrl,
    };

    setPendingGoogleUser(null);

    try {
      confetti({
        particleCount: 60,
        spread: 75,
        origin: { y: 0.6 },
      });
    } catch (e) {}

    toast.success(
      text.googleLinkedSuccess,
      text.googleLinkedDesc(pendingGoogleUser.email)
    );

    if (currentChurch) {
      onLoginSuccess(updatedMember, currentChurch);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8 relative">
      {/* Dynamic Ambient Background Lights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-tr from-blue-600/20 via-cyan-500/15 to-indigo-600/20 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-gradient-to-br from-indigo-500/10 via-sky-500/10 to-transparent rounded-full blur-2xl pointer-events-none -z-10" />

      <div className="w-full max-w-lg">
        {/* TOP BADGE / OFFICIAL APP LOGO WITH DYNAMIC GLOW */}
        <div className="text-center mb-6 space-y-3">
          <div className="relative inline-flex items-center justify-center">
            {/* Pulsing Luminous Backlight */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-blue-500 via-cyan-400 to-indigo-500 blur-md opacity-70 animate-pulse" />
            <div className="relative w-16 h-16 rounded-2xl bg-slate-900 border border-cyan-400/40 p-2 shadow-2xl flex items-center justify-center overflow-hidden">
              <img
                src="/icon.png"
                alt="App Legiz Logo"
                className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(56,189,248,0.7)]"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="font-black text-2xl text-cyan-300 hidden">✝</span>
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2">
              <span>{text.title}</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-400/30">
                PRO
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto mt-1">
              {text.subtitle}
            </p>
          </div>
        </div>

        {/* TOP BAR: LANGUAGE SELECTOR FOR MEMBER PORTAL */}
        {onLanguageChange && (
          <div className="flex items-center justify-center gap-1.5 mb-4">
            {(['ht', 'fr', 'en', 'es'] as Language[]).map((langItem) => (
              <button
                key={langItem}
                type="button"
                id={`member-login-lang-${langItem}`}
                onClick={() => onLanguageChange(langItem)}
                className={`px-3 py-1 rounded-xl text-xs font-bold font-mono uppercase transition-all cursor-pointer ${
                  language === langItem
                    ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/20 ring-1 ring-amber-400'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80'
                }`}
              >
                {langItem === 'ht' ? 'Kreyòl' : langItem === 'fr' ? 'Français' : langItem === 'en' ? 'English' : 'Español'}
              </button>
            ))}
          </div>
        )}

        {/* LOGIN CARD */}
        <div className="bg-[#1E293B]/95 rounded-3xl border border-slate-700/80 shadow-2xl p-6 sm:p-8 backdrop-blur-md relative overflow-hidden ring-1 ring-white/5">
          {/* Subtle Dynamic Glow Header Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-500" />

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">{text.loginErrorTitle}</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* ACTIVE GOOGLE SESSION 1-CLICK QUICK ACCESS (IF DETECTED) */}
          {googleUser && (
            <div className="mb-5 p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/70 via-slate-900 to-cyan-950/70 border border-cyan-500/30 flex items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3 overflow-hidden">
                {googleUser.photoURL ? (
                  <img
                    src={googleUser.photoURL}
                    alt={googleUser.displayName || 'Google'}
                    className="w-9 h-9 rounded-full object-cover border border-cyan-400/40 shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center border border-cyan-400/40 shrink-0">
                    {(googleUser.displayName || googleUser.email || 'G')[0].toUpperCase()}
                  </div>
                )}
                <div className="truncate text-left">
                  <div className="text-xs font-bold text-white truncate">
                    {googleUser.displayName || 'Google User'}
                  </div>
                  <div className="text-[11px] text-cyan-300/80 truncate">
                    {googleUser.email}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleMemberLogin}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs shrink-0 cursor-pointer shadow-md transition-all flex items-center gap-1.5"
              >
                <span>{text.quickConnectGoogle}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* 1. SELEKSYON LEGLIZ LA AK RECHÈCH RAPID POU DÈ MILYE LEGLIZ */}
          <div className="mb-5">
            <ChurchSearchSelector
              id="select-login-church"
              churches={allChurches}
              selectedChurchId={churchId}
              onSelectChurch={handleChurchChange}
              onOpenCreateChurch={onOpenCreateChurch}
              label={text.churchSelectorLabel}
              placeholder={text.churchSelectorPlaceholder}
            />
          </div>

          {/* QUICK AUTHENTICATION OPTIONS (BIOMETRIC + GOOGLE) */}
          <div className="space-y-3 mb-6">
            {/* BIOMETRIC AUTHENTICATION BUTTON (FACE ID / FINGERPRINT) IF SUPPORTED */}
            {isBiometricSupported && (
              <div className="space-y-2">
                <button
                  type="button"
                  id="btn-member-biometric-login"
                  disabled={isBiometricLoading}
                  onClick={handleBiometricLogin}
                  className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm shadow-xl flex items-center justify-center gap-3 transition-all transform active:scale-[0.99] cursor-pointer disabled:opacity-50 border ${
                    savedBioRecord
                      ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-white border-emerald-400/40 shadow-emerald-500/20'
                      : 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 hover:border-cyan-400/60 text-cyan-300 border-cyan-500/30 shadow-slate-950/50'
                  }`}
                >
                  {isBiometricLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5">
                        <ScanFace className="w-5 h-5 text-cyan-300" />
                        <Fingerprint className="w-5 h-5 text-emerald-400" />
                      </div>
                      <span>
                        {savedBioRecord
                          ? text.bioLoginWithSaved((savedBioRecord.memberName || 'Manm').split(' ')[0])
                          : text.bioLoginDefault}
                      </span>
                    </>
                  )}
                </button>

                {/* Direct quick setup link for biometrics if not yet enrolled */}
                {!savedBioRecord && (
                  <button
                    type="button"
                    onClick={() => {
                      setBioSetupMemberId(memberIdOrPhone);
                      setBioSetupPin(pin);
                      setBioSetupError(null);
                      setShowBioSetupModal(true);
                    }}
                    className="w-full text-center text-[11px] text-cyan-400/90 hover:text-cyan-300 font-medium py-1 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Fingerprint className="w-3.5 h-3.5" />
                    <span>{text.enableBioOnDevice}</span>
                  </button>
                )}
              </div>
            )}

            {/* GOOGLE ONE-CLICK LOGIN BUTTON */}
            <button
              type="button"
              id="btn-member-google-login"
              disabled={isGoogleLoading}
              onClick={handleGoogleMemberLogin}
              className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs sm:text-sm shadow-lg flex items-center justify-center gap-3 transition-all transform active:scale-[0.99] cursor-pointer disabled:opacity-50 border border-slate-200"
            >
              {isGoogleLoading ? (
                <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>{text.googleLogin}</span>
                </>
              )}
            </button>
          </div>

          {/* DIVIDER */}
          <div className="relative flex items-center justify-center my-5">
            <div className="border-t border-slate-700 w-full" />
            <span className="bg-[#1E293B] px-3 text-[10px] uppercase tracking-widest text-slate-400 font-bold whitespace-nowrap">
              {text.dividerOr}
            </span>
            <div className="border-t border-slate-700 w-full" />
          </div>

          {/* PIN BASED LOGIN FORM */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* 2. ID MANM OUBYEN TELEFÒN */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="input-login-member-id"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-300"
                >
                  {text.memberIdLabel}
                </label>
                <button
                  type="button"
                  onClick={() => setShowPinHelpModal(true)}
                  className="text-[11px] text-cyan-400/90 hover:text-cyan-300 font-medium cursor-pointer transition-colors"
                >
                  {text.forgotIdOrPin}
                </button>
              </div>

              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  id="input-login-member-id"
                  type="text"
                  required
                  placeholder={text.memberIdPlaceholder}
                  value={memberIdOrPhone}
                  onChange={(e) => setMemberIdOrPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-900/90 border border-slate-700 text-white font-mono text-xs sm:text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 focus:outline-none transition-all placeholder:text-slate-500 placeholder:font-sans"
                />
              </div>
            </div>

            {/* 3. KÒD PIN SEKIRITE */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="input-login-member-pin"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-300"
                >
                  {text.pinLabel}
                </label>
                <span className="text-[10px] text-slate-400">
                  {text.pinHint}
                </span>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  id="input-login-member-pin"
                  type={showPin ? 'text' : 'password'}
                  required
                  maxLength={8}
                  placeholder="••••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full pl-10 pr-11 py-3 rounded-2xl bg-slate-900/90 border border-slate-700 text-white font-mono text-sm tracking-widest focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 focus:outline-none transition-all placeholder:text-slate-500 placeholder:tracking-normal"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title={showPin ? text.hidePin : text.showPin}
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-2">
              <button
                type="submit"
                id="btn-member-login-submit"
                disabled={isLoading}
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 hover:from-blue-500 hover:to-cyan-400 text-white font-black text-sm shadow-xl shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <UserCheck className="w-4 h-4 text-white" />
                    <span>{text.submitBtn}</span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* HELP FOOTER */}
          <div className="mt-6 pt-4 border-t border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{text.privateAndIsolated}</span>
            </div>
            {onSwitchToAdmin && (
              <button
                type="button"
                id="btn-switch-to-admin-from-login"
                onClick={onSwitchToAdmin}
                className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>{text.switchToAdmin}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* DIRECT CHURCH CREATION & REGISTRATION CTA */}
        {onOpenCreateChurch && (
          <div className="mt-4 text-center">
            <button
              type="button"
              id="btn-open-create-church-from-login"
              onClick={onOpenCreateChurch}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 text-cyan-300 hover:text-cyan-200 border border-cyan-400/30 hover:border-cyan-400/60 text-xs font-bold transition-all shadow-md cursor-pointer group"
            >
              <Plus className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span>{text.createChurchBtn}</span>
            </button>
          </div>
        )}

        {/* FORGOT ID / PIN HELP MODAL */}
        {showPinHelpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-md bg-[#1E293B] rounded-3xl shadow-2xl border border-slate-700 p-6 text-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-400/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">{text.pinHelpTitle}</h3>
                    <p className="text-[11px] text-slate-400">{currentChurch.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPinHelpModal(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-700/80 space-y-2">
                  <div className="flex items-start gap-2 text-cyan-300 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{text.pinHelpDefaultPinTitle}</span>
                  </div>
                  <p className="text-slate-300 pl-6 leading-relaxed">
                    {text.pinHelpDefaultPinDesc(currentChurch.code)}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-700/80 space-y-2">
                  <div className="flex items-start gap-2 text-emerald-300 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{text.pinHelpGoogleTitle}</span>
                  </div>
                  <p className="text-slate-300 pl-6 leading-relaxed">
                    {text.pinHelpGoogleDesc}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-1 text-slate-400">
                  <p className="font-semibold text-slate-300">{text.pinHelpNeedHelpTitle}</p>
                  <p>
                    {text.pinHelpNeedHelpDesc(currentChurch.name)}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowPinHelpModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  {text.pinHelpUnderstand}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 1-STEP BIOMETRICS QUICK SETUP MODAL (FACE ID / FINGERPRINT) */}
        {showBioSetupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-md bg-[#1E293B] rounded-3xl shadow-2xl border border-cyan-500/30 p-6 text-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-400/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                    <ScanFace className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">{text.bioSetupTitle}</h3>
                    <p className="text-[11px] text-slate-400">{currentChurch.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBioSetupModal(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-slate-900 rounded-2xl border border-slate-700/80 text-xs space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <Fingerprint className="w-4 h-4" />
                  <span>{text.bioSetupSubtitle}</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  {text.bioSetupDesc}
                </p>
              </div>

              {bioSetupError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">
                  {bioSetupError}
                </div>
              )}

              <form onSubmit={handleQuickRegisterBiometrics} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    {text.memberIdLabel}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={text.memberIdPlaceholder}
                    value={bioSetupMemberId}
                    onChange={(e) => setBioSetupMemberId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono focus:ring-2 focus:ring-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    {text.pinLabel}
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={8}
                    placeholder="••••"
                    value={bioSetupPin}
                    onChange={(e) => setBioSetupPin(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono tracking-widest focus:ring-2 focus:ring-cyan-400 focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBioSetupModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-semibold cursor-pointer"
                  >
                    {text.cancelBtn}
                  </button>
                  <button
                    type="submit"
                    disabled={isBioRegistering}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-lg disabled:opacity-50"
                  >
                    {isBioRegistering ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <ScanFace className="w-4 h-4" />
                        <span>{text.bioSetupScanNow}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* LINK GOOGLE ACCOUNT / 1-CLICK INSTANT ACCESS MODAL */}
        {pendingGoogleUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-md bg-[#1E293B] rounded-3xl shadow-2xl border border-cyan-500/40 p-6 text-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center p-1">
                    <svg className="w-full h-full" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">{text.googleVerifiedTitle}</h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingGoogleUser(null)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-700/80 text-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center text-xs">
                    {(pendingGoogleUser.displayName || pendingGoogleUser.email || 'G')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs">{pendingGoogleUser.displayName || 'Google User'}</div>
                    <div className="text-[11px] text-cyan-300">{pendingGoogleUser.email}</div>
                  </div>
                </div>
              </div>

              {linkError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">
                  {linkError}
                </div>
              )}

              {/* OPTION 1: 1-CLICK INSTANT ACCESS AS NEW MEMBER */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/50 via-slate-900 to-blue-950/50 border border-cyan-500/40 space-y-2">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span>{text.googleQuickAccessTitle}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {text.googleQuickAccessDesc(currentChurch.name)}
                </p>
                <button
                  type="button"
                  onClick={handleInstantGoogleNewMember}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs cursor-pointer shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <span>{text.googleDirectConnectBtn}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* DIVIDER */}
              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-slate-700 w-full" />
                <span className="bg-[#1E293B] px-3 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                  {text.googleOrLinkExisting}
                </span>
                <div className="border-t border-slate-700 w-full" />
              </div>

              <form onSubmit={handleLinkGoogleToMember} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    {text.googleLinkIdLabel(currentChurch.name)}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="eg: CH001-JD4827"
                    value={linkMemberIdInput}
                    onChange={(e) => setLinkMemberIdInput(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono focus:ring-2 focus:ring-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    {text.googleLinkPinOptional}
                  </label>
                  <input
                    type="password"
                    placeholder="••••"
                    value={linkPinInput}
                    onChange={(e) => setLinkPinInput(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono focus:ring-2 focus:ring-cyan-400 focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingGoogleUser(null)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-semibold cursor-pointer"
                  >
                    {text.cancelBtn}
                  </button>
                  <button
                    type="submit"
                    id="btn-confirm-link-google"
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-400/40 font-bold flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <Link className="w-3.5 h-3.5" />
                    <span>{text.googleLinkActionBtn}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SECURITY NOTE */}
        <div className="mt-4 text-center">
          <p className="text-[11px] text-slate-500">
            {text.securityNote}
          </p>
        </div>
      </div>
    </div>
  );
};
