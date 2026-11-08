import React, { useState } from 'react';
import {
  BookOpen,
  Building2,
  Users,
  QrCode,
  Calendar,
  Bell,
  Fingerprint,
  WifiOff,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  ShieldCheck,
  Smartphone,
  Scan,
  Check,
  ChevronRight,
  Clock,
  Layers,
  HelpCircle,
  Award,
  Phone,
  Mail,
  MapPin,
  KeyRound,
  User,
} from 'lucide-react';
import { Language, UserRole, Church, Member } from '../../types';

interface UserTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreateChurch?: () => void;
  language?: Language;
  userRole?: UserRole;
  currentChurch?: Church | null;
  currentMember?: Member | null;
}

interface TutorialStep {
  id: string;
  stepNumber: string;
  title: string;
  subtitle: string;
  tabLabel: string;
  icon: React.ElementType;
  badgeColor: string;
  iconBg: string;
  points: {
    title: string;
    description: string;
    icon: React.ElementType;
  }[];
  tip?: string;
}

export const UserTutorialModal: React.FC<UserTutorialModalProps> = ({
  isOpen,
  onClose,
  onOpenCreateChurch,
  language = 'ht',
  userRole = 'member',
  currentChurch,
  currentMember,
}) => {
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  if (!isOpen) return null;

  // -------------------------------------------------------------
  // MEMBER VIEW: PERSONAL PRACTICAL HELP & ISSUE RESOLUTION
  // -------------------------------------------------------------
  if (userRole === 'member') {
    const memberTexts = {
      ht: {
        badge: 'Èd & Asistans pou Manm',
        title: 'Kisa pou w fè si w gen yon enkonvenyan?',
        bannerTitle: 'Se Administratè Legliz la ki responsab kont ou',
        bannerDesc: 'Tout enfòmasyon pèsonèl ou, kat idantite dijital ou ak prezans ou se administrasyon legliz ou a ki jere yo. Si w gen nenpòt pwoblèm, se administratè a oswa sèvis akèy legliz la ki gen otorizasyon pou ede w epi korije done w yo.',
        scenariosTitle: 'Gid Pratik nan ka difikilte:',
        s1Title: '1. Ou bliye PIN ou oswa Nimewo ID ou?',
        s1Desc: 'Kontakte sekretè oswa administratè legliz la. Yo ka wè dosye w la dirèkteman epi ba w yon nouvo kòd PIN 4 chif pou w ka rekonekte.',
        s2Title: '2. Kòd QR ou pa pase nan eskanè a nan antre a?',
        s2Desc: 'Ogmante klète (brightness) ekran telefòn ou an. Si telefòn ou etenn oswa gen yon pwoblèm, mande responsab akèy la nan pòt la pou l anrejistre prezans ou manyèlman.',
        s3Title: '3. Ou vle chanje Foto, Telefòn oswa Dokiman Legal ou?',
        s3Desc: 'Pou rezon sekirite ak idantifikasyon ofisyèl, se administratè a sèlman ki kapab modifye pwofil ou. Pote nouvo enfòmasyon yo bay biwo legliz la pou yo mete l ajou pou ou.',
        contactTitle: 'Kontak Administrasyon Legliz Ou a',
        codeLabel: 'Kòd',
        pastorLabel: 'Pastè / Lidè:',
        phoneFallback: 'Telefòn disponib nan biwo',
        emailFallback: 'Imèl disponib nan biwo',
        btnUnderstand: 'Mwen Konprann, Mèsi!',
      },
      es: {
        badge: 'Ayuda y Asistencia para Miembros',
        title: '¿Qué hacer si experimenta alguna dificultad?',
        bannerTitle: 'La administración de su congregación gestiona su cuenta',
        bannerDesc: 'Toda su información personal, carnet digital y registros de asistencia son gestionados por el equipo administrativo de su iglesia local. Si necesita asistencia o corrección de datos, acérquese a secretaría o recepción.',
        scenariosTitle: 'Guía práctica para situaciones frecuentes:',
        s1Title: '1. ¿Olvidó su PIN de 4 dígitos o su ID de Miembro?',
        s1Desc: 'Comuníquese con el secretario o administrador de la iglesia. Ellos pueden consultar su ficha oficial y restablecer su código PIN en segundos.',
        s2Title: '2. ¿Su código QR no se lee en el escáner de la entrada?',
        s2Desc: 'Suba el brillo de la pantalla de su teléfono. Si no tiene batería o hay un fallo técnico, solicite al encargado en la puerta que registre su asistencia de forma manual.',
        s3Title: '3. ¿Desea actualizar su foto, número o datos personales?',
        s3Desc: 'Por motivos de seguridad e integridad documental, las modificaciones oficiales las realiza el administrador. Facilite sus nuevos datos en la secretaría para su actualización.',
        contactTitle: 'Contacto de Administración Eclesiástica',
        codeLabel: 'Código',
        pastorLabel: 'Pastor / Líder:',
        phoneFallback: 'Teléfono disponible en oficina',
        emailFallback: 'Correo disponible en oficina',
        btnUnderstand: '¡Entendido, muchas gracias!',
      },
      fr: {
        badge: 'Aide & Assistance Membre',
        title: 'Que faire en cas de difficulté ou question ?',
        bannerTitle: 'L’administration de votre église gère votre compte',
        bannerDesc: 'Vos informations personnelles, votre carte digitale et vos présences sont supervisées par l’administration de votre assemblée. En cas de besoin, adressez-vous au secrétariat ou à l’accueil.',
        scenariosTitle: 'Guide pratique en cas de difficulté :',
        s1Title: '1. PIN ou identifiant oublié ?',
        s1Desc: 'Contactez le secrétariat ou l’administrateur de l’église. Ils peuvent réinitialiser votre code PIN à 4 chiffres immédiatement.',
        s2Title: '2. Le QR Code n’est pas détecté à l’entrée ?',
        s2Desc: 'Augmentez la luminosité de votre écran. En cas d’imprévu, le responsable à l’entrée peut enregistrer votre présence manuellement.',
        s3Title: '3. Modifier vos informations personnelles ou photo ?',
        s3Desc: 'Pour des raisons de sécurité, seul l’administrateur peut mettre à jour votre fiche officielle. Transmettez vos nouveaux éléments au bureau pastoral.',
        contactTitle: 'Coordonnées de votre Église',
        codeLabel: 'Code',
        pastorLabel: 'Pasteur / Responsable :',
        phoneFallback: 'Téléphone au secrétariat',
        emailFallback: 'Email au secrétariat',
        btnUnderstand: 'J’ai compris, merci !',
      },
      en: {
        badge: 'Member Help & Support',
        title: 'What to do if you encounter an issue?',
        bannerTitle: 'Your church administration manages your account',
        bannerDesc: 'All personal information, digital ID cards, and attendance records are managed by your local church team. For any assistance, please consult your church secretary or reception team.',
        scenariosTitle: 'Practical troubleshooting guide:',
        s1Title: '1. Forgot your 4-digit PIN or Member ID?',
        s1Desc: 'Contact your church secretary or administrator. They can access your directory profile and reset your PIN immediately.',
        s2Title: '2. QR code not scanning at the door?',
        s2Desc: 'Increase your phone screen brightness. If your device is offline or battery is low, ask the usher to check you in manually.',
        s3Title: '3. Need to update your photo or phone number?',
        s3Desc: 'For security and verification accuracy, updates are processed by the church administration desk. Please provide your updated details at the church office.',
        contactTitle: 'Church Administration Contacts',
        codeLabel: 'Code',
        pastorLabel: 'Senior Pastor:',
        phoneFallback: 'Phone available at office',
        emailFallback: 'Email available at office',
        btnUnderstand: 'Got it, thank you!',
      },
    }[language] || {
      badge: 'Èd & Asistans pou Manm',
      title: 'Kisa pou w fè si w gen yon enkonvenyan?',
      bannerTitle: 'Se Administratè Legliz la ki responsab kont ou',
      bannerDesc: 'Tout enfòmasyon pèsonèl ou, kat idantite dijital ou ak prezans ou se administrasyon legliz ou a ki jere yo.',
      scenariosTitle: 'Gid Pratik nan ka difikilte:',
      s1Title: '1. Ou bliye PIN ou oswa Nimewo ID ou?',
      s1Desc: 'Kontakte sekretè oswa administratè legliz la pou yon nouvo PIN.',
      s2Title: '2. Kòd QR ou pa pase nan eskanè a nan antre a?',
      s2Desc: 'Ogmante klète ekran telefòn ou an oswa mande akèy la pou anrejistreman manyèl.',
      s3Title: '3. Ou vle chanje Foto, Telefòn oswa Dokiman Legal ou?',
      s3Desc: 'Se administratè a sèlman ki kapab modifye pwofil ou.',
      contactTitle: 'Kontak Administrasyon Legliz Ou a',
      codeLabel: 'Kòd',
      pastorLabel: 'Pastè / Lidè:',
      phoneFallback: 'Telefòn disponib nan biwo',
      emailFallback: 'Imèl disponib nan biwo',
      btnUnderstand: 'Mwen Konprann, Mèsi!',
    };

    return (
      <div
        id="user-tutorial-modal-overlay"
        className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      >
        <div
          id="user-tutorial-modal-content"
          className="bg-slate-900 border border-slate-700/70 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  {memberTexts.badge}
                </span>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {memberTexts.title}
                </h2>
              </div>
            </div>

            <button
              type="button"
              id="close-tutorial-modal-btn"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Fèmen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 text-slate-200">
            {/* Primary Responsibility Notice Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-800 to-slate-900 border border-amber-500/30 shadow-sm flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-amber-300">
                  {memberTexts.bannerTitle}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {memberTexts.bannerDesc}
                </p>
              </div>
            </div>

            {/* Practical Scenarios Grid */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 px-1">
                {memberTexts.scenariosTitle}
              </h4>

              {/* Scenario 1 */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-amber-400 border border-slate-700/80 flex items-center justify-center shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="text-xs font-bold text-white">
                    {memberTexts.s1Title}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {memberTexts.s1Desc}
                  </p>
                </div>
              </div>

              {/* Scenario 2 */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-sky-400 border border-slate-700/80 flex items-center justify-center shrink-0">
                  <Scan className="w-4 h-4" />
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="text-xs font-bold text-white">
                    {memberTexts.s2Title}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {memberTexts.s2Desc}
                  </p>
                </div>
              </div>

              {/* Scenario 3 */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-emerald-400 border border-slate-700/80 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="text-xs font-bold text-white">
                    {memberTexts.s3Title}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {memberTexts.s3Desc}
                  </p>
                </div>
              </div>
            </div>

            {/* Church & Admin Contact Information Box */}
            {currentChurch && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    {memberTexts.contactTitle}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {memberTexts.codeLabel}: {currentChurch.code}
                  </span>
                </div>
                <div className="font-bold text-sm text-white">{currentChurch.name}</div>
                {currentChurch.pastorName && (
                  <div className="text-xs text-slate-300 flex items-center gap-1.5">
                    <span className="text-slate-500">{memberTexts.pastorLabel}</span>
                    <span className="font-semibold">{currentChurch.pastorName}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-800/80 text-xs">
                  {currentChurch.phone ? (
                    <a
                      href={`tel:${currentChurch.phone}`}
                      className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-300 font-medium transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">{currentChurch.phone}</span>
                    </a>
                  ) : (
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{memberTexts.phoneFallback}</span>
                    </div>
                  )}

                  {currentChurch.email ? (
                    <a
                      href={`mailto:${currentChurch.email}`}
                      className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-300 font-medium transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">{currentChurch.email}</span>
                    </a>
                  ) : (
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400">
                      <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{memberTexts.emailFallback}</span>
                    </div>
                  )}
                </div>

                {currentChurch.address && (
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{currentChurch.address}{currentChurch.city ? `, ${currentChurch.city}` : ''}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Button */}
          <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-t border-slate-800 bg-slate-900/95 flex justify-end">
            <button
              type="button"
              id="tutorial-finish-btn"
              onClick={onClose}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-all shadow-md cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{memberTexts.btnUnderstand}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // ADMIN VIEW: FULL MULTI-STEP CHURCH SETUP & MANAGEMENT TUTORIAL
  // -------------------------------------------------------------
  const getAdminSteps = (lang: Language): TutorialStep[] => {
    if (lang === 'es') {
      return [
        {
          id: 'welcome',
          stepNumber: '01',
          tabLabel: 'Introducción',
          title: 'Bienvenido a OmniChurch',
          subtitle: 'Plataforma profesional para la gestión de congregaciones, miembros, credenciales QR y asistencia.',
          icon: Building2,
          badgeColor: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
          iconBg: 'from-amber-500 to-amber-600',
          points: [
            {
              title: 'Aislamiento Total de Datos (Multi-Tenant)',
              description: 'Cada congregación cuenta con su propio entorno seguro: miembros, cultos, asistencia y noticias independientes.',
              icon: Building2,
            },
            {
              title: 'Carnet Digital con QR y Código de Barras',
              description: 'Cada miembro recibe un carnet digital con código QR para escaneo ultra rápido en la entrada de la iglesia.',
              icon: QrCode,
            },
            {
              title: 'Modo 100% Offline (Sin Internet)',
              description: 'Registre la asistencia sin interrupciones incluso si falla la energía o la red; los datos se sincronizan automáticamente.',
              icon: WifiOff,
            },
          ],
          tip: 'Consejo: Haga clic en "Siguiente" para recorrer la guía paso a paso de administración eclesiástica.',
        },
        {
          id: 'church_creation',
          stepNumber: '02',
          tabLabel: '1. Registrar Iglesia',
          title: 'Paso 1: Registrar y Configurar su Iglesia',
          subtitle: 'Inicie registrando la información oficial de su congregación en pocos segundos.',
          icon: Building2,
          badgeColor: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
          iconBg: 'from-sky-500 to-blue-600',
          points: [
            {
              title: 'Datos Generales',
              description: 'Ingrese el Nombre de la iglesia, Pastor Principal, Dirección, Ciudad, Teléfono, Correo y Lema ministerial.',
              icon: Building2,
            },
            {
              title: 'Código Corto e Identificador Único',
              description: 'El sistema genera un código único (ej: CH001, IB-ES) para que los miembros encuentren fácilmente su iglesia.',
              icon: Layers,
            },
            {
              title: 'Personalización de Colores y Logotipo',
              description: 'Seleccione la paleta de colores oficial (Oro, Azul, Verde, Rosa, Púrpura) y el emblema representativo.',
              icon: Layers,
            },
          ],
          tip: 'Puede administrar múltiples sedes o congregaciones dentro de la misma plataforma unificada.',
        },
        {
          id: 'members_management',
          stepNumber: '03',
          tabLabel: '2. Miembros y Carnets',
          title: 'Paso 2: Registro de Miembros y Credenciales',
          subtitle: 'Inscriba a los creyentes, asigne roles ministeriales y configure sus códigos PIN.',
          icon: Users,
          badgeColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
          iconBg: 'from-emerald-500 to-teal-600',
          points: [
            {
              title: 'Perfil Ministerial Completo',
              description: 'Registre Nombre completo, Ministerio (Coro, Jóvenes, Damas, Servidores), Teléfono, Email y Fecha de nacimiento.',
              icon: Users,
            },
            {
              title: 'PIN de Seguridad Personal (4 Dígitos)',
              description: 'Cada creyente posee un PIN de 4 dígitos para acceder a su espacio privado y ver su carnet digital.',
              icon: ShieldCheck,
            },
            {
              title: 'Carnet Oficial con QR y Código de Barras',
              description: 'El carnet digital es compatible con lectores láser profesionales y con la cámara de cualquier teléfono móvil.',
              icon: QrCode,
            },
          ],
          tip: 'Los miembros pueden ingresar desde la pantalla de acceso con su ID o número telefónico y su PIN.',
        },
        {
          id: 'services_attendance',
          stepNumber: '04',
          tabLabel: '3. Cultos y Asistencia',
          title: 'Paso 3: Cultos y Control de Asistencia',
          subtitle: 'Organice los servicios de la semana y escanee a los asistentes en tiempo real.',
          icon: Calendar,
          badgeColor: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
          iconBg: 'from-purple-500 to-indigo-600',
          points: [
            {
              title: '6 Categorías Litúrgicas',
              description: 'Culto Dominical, Estudio Bíblico, Intercesión y Oración, Jóvenes, Niños (Escuela Dominical) y Servicio General.',
              icon: Calendar,
            },
            {
              title: 'Escáner QR Ultra Veloz con Tono de Confirmación',
              description: 'Abra la cámara en "Escanear QR" y apunte al carnet del miembro; escuchará un tono sonoro inmediato.',
              icon: Scan,
            },
            {
              title: 'Prevención de Registro Duplicado',
              description: 'El sistema alerta y previene automáticamente si un miembro intenta escanear dos veces en el mismo culto.',
              icon: CheckCircle2,
            },
          ],
          tip: 'Si la conexión a internet se interrumpe durante el culto, el escaneo continúa offline y se sincroniza al restablecerse.',
        },
        {
          id: 'announcements_notifications',
          stepNumber: '05',
          tabLabel: '4. Anuncios y Avisos',
          title: 'Paso 4: Muro de Anuncios y Notificaciones',
          subtitle: 'Comuníquese de forma efectiva con su congregación mediante publicaciones y avisos programados.',
          icon: Bell,
          badgeColor: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
          iconBg: 'from-amber-500 to-orange-600',
          points: [
            {
              title: 'Publicación de Noticias y Boletines',
              description: 'Publique comunicados generales o fije avisos destacados (Pinned) para máxima visibilidad.',
              icon: Bell,
            },
            {
              title: 'Notificaciones Toast Dirigidas',
              description: 'Programe avisos emergentes dirigidos a ministerios específicos (ej: Jóvenes, Alabanza) en fechas concretas.',
              icon: Clock,
            },
            {
              title: 'Niveles de Prioridad',
              description: 'Seleccione el tipo de aviso: Informativo (Info), Urgente (Urgent), Advertencia (Warning) o Celebración 🎉.',
              icon: Award,
            },
          ],
          tip: 'Los avisos emergentes garantizan que los miembros reciban información clave tan pronto abren la aplicación.',
        },
        {
          id: 'security_biometrics',
          stepNumber: '06',
          tabLabel: '5. Seguridad y Biometría',
          title: 'Paso 5: Biometría, Google Auth y Seguridad',
          subtitle: 'Autenticación moderna y respaldo seguro en la nube para líderes y miembros.',
          icon: Fingerprint,
          badgeColor: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
          iconBg: 'from-rose-500 to-pink-600',
          points: [
            {
              title: 'Acceso Biométrico (Face ID y Huella Dactilar)',
              description: 'Los creyentes pueden vincular su huella o Face ID para iniciar sesión en 1 segundo sin digitar el PIN.',
              icon: Fingerprint,
            },
            {
              title: 'Autenticación con Google',
              description: 'Inicie sesión rápida y seguramente vinculando su cuenta de Google.',
              icon: ShieldCheck,
            },
            {
              title: 'Respaldo y Exportación de Datos',
              description: 'Exporte registros en formato JSON o sincronice de forma segura con Cloud Firestore.',
              icon: Layers,
            },
          ],
          tip: 'Todos los datos se almacenan con doble redundancia: localmente en el dispositivo y en Cloud Firestore.',
        },
      ];
    }

    // Default Creole / Standard
    return [
      {
        id: 'welcome',
        stepNumber: '01',
        tabLabel: 'Entwodiksyon',
        title: 'Byenvini sou OmniChurch PRO',
        subtitle: 'Platfòm entelijan ak modèn pou jesyon tout legliz, manm, kòd dijital ak prezans.',
        icon: Building2,
        badgeColor: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
        iconBg: 'from-amber-500 to-amber-600',
        points: [
          {
            title: 'Izolasyon Total Données (Multi-Tenant)',
            description: 'Chak legliz gen espas prive pa li avèk lis manm, sèvis, prezans, ak anons separe.',
            icon: Building2,
          },
          {
            title: 'Kat Manm Dijital QR & Barcode',
            description: 'Chak manm resevwa yon kat idantite dijital inik ak kòd QR pou eskanè rapid nan pòt legliz la.',
            icon: QrCode,
          },
          {
            title: 'Mòd San Entènèt (100% Offline Capable)',
            description: 'Ou ka pran prezans menm lè pa gen kouran oswa entènèt. Done yo ap sove lokalman epi senkronize lè rezo a tounen.',
            icon: WifiOff,
          },
        ],
        tip: 'Konsèy: Klike sou bouton "Swivan" pou dekouvri kijan pou konfigire legliz ou a etap pa etap.',
      },
      {
        id: 'church_creation',
        stepNumber: '02',
        tabLabel: '1. Kreye Legliz',
        title: 'Etap 1: Kreye / Anrejistre Legliz Ou',
        subtitle: 'Kòmanse pa anrejistre legliz ou a avèk enfòmasyon ofisyèl li yo nan kèk segonn.',
        icon: Building2,
        badgeColor: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
        iconBg: 'from-sky-500 to-blue-600',
        points: [
          {
            title: 'Enfòmasyon Jeneral',
            description: 'Antre Non legliz la, Non Pastè titilè a, Adrès, Vil, Nimewo Telefòn, Imèl ak Deviz legliz la.',
            icon: Building2,
          },
          {
            title: 'Kòd & Idantifyan Inik',
            description: 'Sistèm nan ba w yon kòd inik (egz: CH001, TAB-HT) pou pèmèt manm yo jwenn legliz la fasilman.',
            icon: Layers,
          },
          {
            title: 'Pèsonalizasyon Tèm & Logo',
            description: 'Chwazi koulè prefere legliz la (Lò, Ble, Vèt, Woz, Mov) ak senbòl logo ki reprezante vizyon nou.',
            icon: Layers,
          },
        ],
        tip: 'Ou ka ajoute plizyè legliz si w jere yon rezo misyon oswa plizyè asanble.',
      },
      {
        id: 'members_management',
        stepNumber: '03',
        tabLabel: '2. Manm & Kat',
        title: 'Etap 2: Ajoute Manm & Jenere Kat Dijital',
        subtitle: 'Enskri manm yo, jenere kòd idantite yo, epi ba yo PIN pou yo konekte.',
        icon: Users,
        badgeColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
        iconBg: 'from-emerald-500 to-teal-600',
        points: [
          {
            title: 'Pwofil Konplè Manm lan',
            description: 'Antre Non konplè, Depatman (Koral, Jèn, Dames, Diak), Wòl, Telefòn, Imèl, ak Dat nesans.',
            icon: Users,
          },
          {
            title: 'Kòd Sekirite PIN (4 Chif)',
            description: 'Chak manm gen yon PIN 4 chif pou li konekte sou telefòn li epi wè kat dijital li a.',
            icon: ShieldCheck,
          },
          {
            title: 'Kat Manm ak QR Kòd & Barcode',
            description: 'Kat dijital la genyen kòd QR ak Barcode konpatib ak eskanè lazè oswa kamera telefòn.',
            icon: QrCode,
          },
        ],
        tip: 'Manm yo ka konekte nan paj "Koneksyon Manm" ak ID yo oswa nimewo telefòn yo ansanm ak PIN yo.',
      },
      {
        id: 'services_attendance',
        stepNumber: '04',
        tabLabel: '3. Sèvis & Scan',
        title: 'Etap 3: Sèvis & Eskanè Prezans (Online/Offline)',
        subtitle: 'Òganize sèvis legliz la epi pran prezans an tan reyèl ak sekirite total.',
        icon: Calendar,
        badgeColor: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
        iconBg: 'from-purple-500 to-indigo-600',
        points: [
          {
            title: '6 Kategori Sèvis Diferan',
            description: 'Kilt Dominikal, Etid Biblik, Priyè & Entèsesyon, Reyinyon Jèn, ECODIM Timoun, ak Sèvis Jeneral.',
            icon: Calendar,
          },
          {
            title: 'Eskanè QR Ultra Rapid ak Bip Odyo',
            description: 'Louvri kamera a nan "Eskanè QR", scan kòd manm lan; w ap tande yon bip siksè imedya!',
            icon: Scan,
          },
          {
            title: 'Prevansyon Doub Prezans',
            description: 'Sistèm nan bloke otomatikman si yon manm eseye scan 2 fwa nan menm sèvis la pou anpeche fo chif.',
            icon: CheckCircle2,
          },
        ],
        tip: 'Si entènèt la koupe pandan sèvis la, tout prezans ap sove lokalman epi voye nan nwaj la lè entènèt la tounen!',
      },
      {
        id: 'announcements_notifications',
        stepNumber: '05',
        tabLabel: '4. Anons & Alèt',
        title: 'Etap 4: Anons & Pwogramasyon Notifikasyon',
        subtitle: 'Kominike dirèkteman ak kongregasyon an epi pwograme mesaj toast otomatik.',
        icon: Bell,
        badgeColor: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
        iconBg: 'from-amber-500 to-orange-600',
        points: [
          {
            title: 'Pibliye Kominike & Anons',
            description: 'Pibliye anons pou tout legliz la oswa fikse yo an tèt (Pinned) pou tout moun wè yo an premye.',
            icon: Bell,
          },
          {
            title: 'Pwogramasyon Notifikasyon Toast',
            description: 'Chwazi yon dat ak yon odyans sib (egz: Jeunesse, Chorale); lè manm lan konekte li resevwa notifikasyon an.',
            icon: Clock,
          },
          {
            title: 'Nivo Alèt Pèsonalize',
            description: 'Defini nivo alèt la: Enfòmasyon (Info), Ijan (Urgent), Avètisman (Warning), oswa Selebrasyon 🎉.',
            icon: Award,
          },
        ],
        tip: 'Notifikasyon toast yo pèmèt manm yo pa janm rate yon enfòmasyon enpòtan lè yo ouvri app a.',
      },
      {
        id: 'security_biometrics',
        stepNumber: '06',
        tabLabel: '5. Byometrik & Sekirite',
        title: 'Etap 5: Byometrik, Google Auth & Sekirite',
        subtitle: 'Otantifikasyon modèn ak sekirite nivo siperyè pou lidè yo ak manm yo.',
        icon: Fingerprint,
        badgeColor: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
        iconBg: 'from-rose-500 to-pink-600',
        points: [
          {
            title: 'Koneksyon Byometrik (Face ID & Touch ID)',
            description: 'Manm yo ka aktive WebAuthn / Anprent / Face ID sou telefòn yo pou yo konekte an 1 segonn san tape PIN.',
            icon: Fingerprint,
          },
          {
            title: 'Koneksyon Google Auth',
            description: 'Konekte fasilman ak kont Google ou pou senkronize pwofil ou ak legliz la.',
            icon: ShieldCheck,
          },
          {
            title: 'Sovgad & Enpòtasyon Done',
            description: 'Eksporté tout done legliz ou yo an fòma JSON oswa fè sovgad sekirize nan Cloud Firestore.',
            icon: Layers,
          },
        ],
        tip: 'Tout enfòmasyon yo anrejistre an doub: sou aparèy la lokalman ak nan Cloud Firestore an sekirite.',
      },
    ];
  };

  const activeLang: Language = (language === 'es' || language === 'en' || language === 'fr') ? language : 'ht';
  const steps = getAdminSteps(activeLang);
  const currentStep = steps[activeStepIndex] || steps[0];

  const adminLabels = {
    ht: {
      guideHeader: 'Gid Itilizatè & Titoryèl',
      stepOf: (curr: number, total: number) => `Etap ${curr} sou ${total}`,
      closeTitle: 'Fèmen Gid la',
      keyPoints: 'Pwen Kle yo',
      prevBtn: 'Presedan',
      nextBtn: 'Swivan',
      finishBtn: 'Mwen Konprann Tout!',
      createChurchNow: 'Kreye Legliz Mwen Kounye a',
    },
    es: {
      guideHeader: 'Guía de Usuario y Tutorial',
      stepOf: (curr: number, total: number) => `Paso ${curr} de ${total}`,
      closeTitle: 'Cerrar Guía',
      keyPoints: 'Aspectos Clave',
      prevBtn: 'Anterior',
      nextBtn: 'Siguiente',
      finishBtn: '¡Entendido todo!',
      createChurchNow: 'Registrar Mi Iglesia Ahora',
    },
    fr: {
      guideHeader: 'Guide d’Utilisation & Tutoriel',
      stepOf: (curr: number, total: number) => `Étape ${curr} sur ${total}`,
      closeTitle: 'Fermer le Guide',
      keyPoints: 'Points Clés',
      prevBtn: 'Précédent',
      nextBtn: 'Suivant',
      finishBtn: 'J’ai tout compris !',
      createChurchNow: 'Créer Mon Église Maintenant',
    },
    en: {
      guideHeader: 'User Guide & Tutorial',
      stepOf: (curr: number, total: number) => `Step ${curr} of ${total}`,
      closeTitle: 'Close Guide',
      keyPoints: 'Key Highlights',
      prevBtn: 'Previous',
      nextBtn: 'Next',
      finishBtn: 'Got Everything!',
      createChurchNow: 'Register My Church Now',
    },
  }[language] || {
    guideHeader: 'Gid Itilizatè & Titoryèl',
    stepOf: (curr: number, total: number) => `Etap ${curr} sou ${total}`,
    closeTitle: 'Fèmen Gid la',
    keyPoints: 'Pwen Kle yo',
    prevBtn: 'Presedan',
    nextBtn: 'Swivan',
    finishBtn: 'Mwen Konprann Tout!',
    createChurchNow: 'Kreye Legliz Mwen Kounye a',
  };

  return (
    <div
      id="user-tutorial-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="user-tutorial-modal-content"
        className="bg-slate-900 border border-slate-700/70 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  {adminLabels.guideHeader}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  {adminLabels.stepOf(activeStepIndex + 1, steps.length)}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {currentStep.title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            id="close-tutorial-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title={adminLabels.closeTitle}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator Badges Bar */}
        <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {steps.map((step, idx) => (
            <button
              key={step.id}
              type="button"
              id={`tutorial-step-tab-${step.id}`}
              onClick={() => setActiveStepIndex(idx)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeStepIndex === idx
                  ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <step.icon className="w-3.5 h-3.5" />
              <span>{step.tabLabel}</span>
            </button>
          ))}
        </div>

        {/* Modal Main Content Area */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {/* Hero Banner for the Step */}
          <div className="flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/80 border border-slate-800 shadow-inner">
            <div
              className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${currentStep.iconBg} flex items-center justify-center text-white shrink-0 shadow-lg`}
            >
              <currentStep.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {currentStep.subtitle}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${currentStep.badgeColor}`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  {adminLabels.keyPoints}
                </span>
              </div>
            </div>
          </div>

          {/* Points List */}
          <div className="grid grid-cols-1 gap-3.5">
            {currentStep.points.map((pt, pIdx) => (
              <div
                key={pIdx}
                className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80 hover:border-slate-700 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                  <pt.icon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{pt.title}</h4>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mt-1">
                    {pt.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Tip Box */}
          {currentStep.tip && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
              <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-amber-300/90 leading-relaxed">
                {currentStep.tip}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-5 py-4 sm:px-6 sm:py-4 border-t border-slate-800 bg-slate-900/95 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="tutorial-prev-btn"
              disabled={activeStepIndex === 0}
              onClick={() => setActiveStepIndex((prev) => Math.max(0, prev - 1))}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all ${
                activeStepIndex === 0
                  ? 'border-slate-800 text-slate-600 cursor-not-allowed'
                  : 'border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{adminLabels.prevBtn}</span>
            </button>

            {activeStepIndex < steps.length - 1 ? (
              <button
                type="button"
                id="tutorial-next-btn"
                onClick={() => setActiveStepIndex((prev) => Math.min(steps.length - 1, prev + 1))}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-amber-400 text-slate-950 hover:bg-amber-300 transition-all shadow-md cursor-pointer"
              >
                <span>{adminLabels.nextBtn}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                id="tutorial-finish-btn"
                onClick={onClose}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-400 transition-all shadow-md cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{adminLabels.finishBtn}</span>
              </button>
            )}
          </div>

          {onOpenCreateChurch && (
            <button
              type="button"
              id="tutorial-create-church-action-btn"
              onClick={() => {
                onClose();
                onOpenCreateChurch();
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:from-sky-400 hover:to-blue-500 transition-all shadow-md cursor-pointer ml-auto"
            >
              <Building2 className="w-4 h-4" />
              <span>{adminLabels.createChurchNow}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
