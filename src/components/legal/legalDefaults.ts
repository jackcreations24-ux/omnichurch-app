import { Language } from '../../types';

export interface LegalSectionItem {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegalLocaleContent {
  brand: string;
  title: string;
  lastUpdatedLabel: string;
  lastUpdatedDate: string;
  effectiveLabel: string;
  backLabel: string;
  otherDocLinkLabel: string;
  printLabel: string;
  intro: string;
  sections: LegalSectionItem[];
  footerNote: string;
}

export const PRIVACY_DEFAULT_CONTENT: Record<Language, LegalLocaleContent> = {
  ht: {
    brand: 'OmniChurch Pro',
    title: 'Politik Konfidansyalite',
    lastUpdatedLabel: 'Dènye mizajou :',
    lastUpdatedDate: '17 Novanm 2026',
    effectiveLabel: 'Aplikab pou sit entènèt, aplikasyon mobil Android ak aplikasyon biwo OmniChurch Pro.',
    backLabel: '← Retounen nan aplikasyon an',
    otherDocLinkLabel: 'Li Kondisyon Itilizasyon yo',
    printLabel: 'Enprime paj la',
    intro:
      'Politik Konfidansyalite sa a eksplike kijan OmniChurch Pro (« Platfòm lan », « nou ») kolekte, itilize, estoke ak pwoteje enfòmasyon pèsonèl manm legliz yo, administratè legliz yo ak vizitè yo lè yo itilize sèvis dijital nou yo (Sit Web, PWA, Android ak Desktop).',
    sections: [
      {
        title: '1. Enfòmasyon Nou Kolekte',
        paragraphs: [
          'Nou kolekte sèlman enfòmasyon ki nesesè pou jesyon administratif, swivi prezans ak kominikasyon legliz ki anrejistre sou platfòm lan :',
        ],
        bullets: [
          'Enfòmasyon manm yo : non konplè, nimewo ID Manm (Matrikil), nimewo telefòn, adrès imèl, dat nesans, dat batèm, depatman oswa wòl nan legliz la, foto pwofil (si manm lan oswa administratè a chwazi mete l), ak pyès idantite legal (CIN/NIF) sèlman lè yo soumèt li pou verifikasyon ofisyèl.',
          'Enfòmasyon legliz ak administratè yo : non legliz la, kòd idantifikasyon, adrès fizik, non pastè responsab la, dokiman legal RNC pou verifikasyon, siyati dijital otorize, ak adrès imèl Google / Firebase ki itilize pou otantifikasyon administratè a.',
          'Done aktivite ak prezans : orè sèvis/kilt yo, dosye prezans pa kòd QR, vizit manm nan lòt legliz patnè (cross-church visitor check-in), anons, kòmantè ak reyaksyon nan espas legliz la.',
          'Done teknik ak sekirite : estati senkronizasyon san fil (offline queue), jounal sekirite ak idantifyan aparèy lokal pou fonksyon deblokaj byometrik.',
        ],
      },
      {
        title: '2. Kijan Nou Itilize Enfòmasyon Yo',
        bullets: [
          'Pèmèt chak legliz jere anyè manm li yo, kat idantifikasyon QR yo ak prezans nan sèvis yo an tan reyèl.',
          'Otantifye administratè yo, operatè resepsyon yo ak manm yo an sekirite.',
          'Verifye otantisite kat manm yo atravè pòtay verifikasyon ofisyèl la lè yon otorite oswa resepsyon eskane kòd QR la.',
          'Senkronize done ant aparèy mobil, tablèt ak òdinatè legliz la, menm lè koneksyon entènèt la koupe tanporèman.',
          'Pwoteje platfòm lan kont fwod, aksè san otorizasyon, abi oswa kòmantè ki vyole règ kominote a.',
        ],
      },
      {
        title: '3. Baz Pataj ak Izolasyon Done Ant Legliz yo',
        paragraphs: [
          'OmniChurch Pro pa janm vann, lwe oswa komèsyalize done pèsonèl manm oswa legliz yo bay okenn twazyèm pati pou rezon maketing oswa piblisite sible.',
          'Chak legliz gen yon espas done izole ak pwòp ID pa li. Done manm yon legliz pa aksesib pou lòt legliz, eksepte nan de ka presi itilizatè a deklanche tèt li :',
        ],
        bullets: [
          'Lè yon manm vizite yon lòt legliz sou platfòm lan epi prezante kat QR li pou anrejistre prezans li kòm vizitè.',
          'Lè yon kat manm gen yon lyen verifikasyon piblik ki eskane sou pòtay verifikasyon ofisyèl la (kote sèlman enfòmasyon estati verifikasyon ki otorize yo parèt).',
        ],
      },
      {
        title: '4. Founisè Enfrastrikti ak Sèvis Twazyèm Pati',
        paragraphs: [
          'Pou fonksyone ak fyab ak sekirite mondyal, OmniChurch Pro itilize enfrastrikti sa yo :',
        ],
        bullets: [
          'Google Firebase (Authentication ak Cloud Firestore) pou otantifikasyon ak estokaj sekirize nan nwaj la.',
          'WebAuthn / Biyometri Aparèy : done anprent oswa rekonesans vizaj (Face ID) rete estoke sèlman nan chip sekirite aparèy itilizatè a; sèvè nou yo pa janm resevwa ni estoke imaj byometrik ou.',
          'Google AdMob : sou kont legliz ki nan vèsyon gratis san lisans komèsyal aktif, platfòm lan ka afiche anons estanda AdMob. Legliz ki gen lisans aktif yo pa gen piblisite.',
        ],
      },
      {
        title: '5. Sekirite ak Konsèvasyon Done',
        paragraphs: [
          'Tout kominikasyon ant aparèy itilizatè yo ak sèvè yo chifre anba pwotokòl HTTPS/TLS. Kòd PIN administratè yo ak aksè sansib yo pwoteje ak chifreman kriptografik (hachage). Nou aplike règ aksè strik sou baz wòl (Administratè Sistèm, Administratè Legliz, Resepsyon, Manm).',
          'Done yo konsève toutotan kont legliz la oswa manm lan aktif. Lè yon administratè oswa itilizatè efase yon dosye (manm, sèvis, anons oswa prezans), sistèm lan propaje sipresyon an nan baz done a pou anpeche dosye efase yo retounen.',
        ],
      },
      {
        title: '6. Dwa Itilizatè yo (Aksè, Koreksyon ak Sipresyon)',
        paragraphs: ['Chak manm ak administratè gen dwa pou :'],
        bullets: [
          'Konsilte ak verifye enfòmasyon pèsonèl ki sou pwofil li.',
          'Mande koreksyon nenpòt enfòmasyon ki pa egzak atravè pwofil li oswa sekretarya legliz li.',
          'Mande sipresyon konplè kont li ak tout done ki asosye ak li nan men administratè legliz li oswa dirèkteman nan ekip administrasyon platfòm lan.',
        ],
      },
      {
        title: '7. Pwoteksyon Minè',
        paragraphs: [
          'Enfòmasyon sou timoun oswa minè ki anrejistre nan kad aktivite legliz (tankou lekòl dimanch oswa jèn) dwe antre ak konsantman paran oswa responsab legal yo sou responsablite dirèk administrasyon legliz la.',
        ],
      },
      {
        title: '8. Chanjman nan Politik sa a ak Kontak',
        paragraphs: [
          'Nou ka mete Politik Konfidansyalite sa a ajou nenpòt lè pou reflete amelyorasyon teknik oswa egzijans legal. Dat dènye mizajou a toujou parèt anlè paj la.',
          'Pou tout kesyon, demann sipresyon done oswa verifikasyon konfidansyalite, kontakte responsab platfòm lan : Jackson Charles — Imèl : charlesjj3186@gmail.com | Sit ofisyèl : https://omnichurch.download',
        ],
      },
    ],
    footerNote: 'OmniChurch Pro — Tout dwa rezève.',
  },
  fr: {
    brand: 'OmniChurch Pro',
    title: 'Politique de Confidentialité',
    lastUpdatedLabel: 'Dernière mise à jour :',
    lastUpdatedDate: '17 novembre 2026',
    effectiveLabel: 'Applicable au site web, à l’application mobile Android et à l’application bureau OmniChurch Pro.',
    backLabel: '← Retour à l’application',
    otherDocLinkLabel: 'Consulter les Conditions d’Utilisation',
    printLabel: 'Imprimer',
    intro:
      'La présente Politique de Confidentialité décrit la manière dont OmniChurch Pro (« la Plateforme », « nous ») collecte, utilise, stocke et protège les données personnelles des membres, administrateurs d’église et visiteurs utilisant nos services numériques.',
    sections: [
      {
        title: '1. Données Collectées',
        paragraphs: [
          'Nous collectons uniquement les données nécessaires à la gestion administrative, au suivi des présences et à la communication interne des églises enregistrées :',
        ],
        bullets: [
          'Données des membres : nom complet, identifiant membre (Matricule), numéro de téléphone, adresse e-mail, date de naissance, date de baptême, département ou rôle ministériel, photo de profil facultative et pièce d’identité officielle (CIN/NIF) uniquement lorsqu’elle est fournie à des fins de vérification.',
          'Données des églises et administrateurs : nom de l’église, code court, adresse physique, nom du pasteur responsable, justificatif légal RNC pour vérification, signature numérique autorisée et e-mail Google/Firebase d’administration.',
          'Données d’activité et de présence : horaires des cultes, enregistrements de présence par code QR, visites inter-églises, annonces, commentaires et réactions.',
          'Données techniques : file d’attente de synchronisation hors ligne, journaux d’audit de sécurité et jetons locaux de déverrouillage biométrique.',
        ],
      },
      {
        title: '2. Utilisation des Données',
        bullets: [
          'Permettre à chaque église de gérer son annuaire de membres, ses cartes d’identification QR et ses relevés de présence en temps réel.',
          'Authentifier de façon sécurisée les administrateurs, agents d’accueil et membres.',
          'Vérifier l’authenticité d’une carte de membre lors du scan d’un code QR via le portail officiel de vérification.',
          'Assurer la synchronisation multi-appareils (mobile, tablette, ordinateur), y compris après une coupure réseau temporaire.',
          'Prévenir la fraude, les accès non autorisés et les abus contraires au règlement communautaire.',
        ],
      },
      {
        title: '3. Partage et Isolation des Données',
        paragraphs: [
          'OmniChurch Pro ne vend, ne loue et ne cède jamais les données personnelles des membres ou des églises à des tiers à des fins commerciales ou publicitaires.',
          'Chaque église dispose d’un espace isolé identifié par son propre ID. Les données d’une église ne sont accessibles à aucune autre église, sauf dans deux cas initiés volontairement :',
        ],
        bullets: [
          'Lorsqu’un membre visite une autre église partenaire et présente son code QR pour enregistrer sa présence en tant que visiteur.',
          'Lorsqu’un lien public de vérification de badge est consulté ou scanné (seuls les champs publics autorisés pour l’attestation sont affichés).',
        ],
      },
      {
        title: '4. Services Tiers et Infrastructure',
        bullets: [
          'Google Firebase (Authentication et Cloud Firestore) pour l’authentification sécurisée et l’hébergement cloud des données.',
          'WebAuthn / Biométrie de l’appareil : les empreintes digitales ou données Face ID restent strictement confinées dans la puce sécurisée de votre appareil et ne sont jamais transmises à nos serveurs.',
          'Google AdMob : sur les espaces gratuits sans licence commerciale active, des bannières ou annonces standard AdMob peuvent être affichées. Les églises disposant d’une licence active sont exemptes de publicités.',
        ],
      },
      {
        title: '5. Sécurité et Conservation',
        paragraphs: [
          'Toutes les communications réseau sont chiffrées via HTTPS/TLS. Les codes PIN d’administration sont protégés par hachage cryptographique et l’accès aux opérations sensibles est contrôlé par des règles serveur basées sur les rôles.',
          'Les données sont conservées tant que le compte est actif. Lorsqu’un administrateur supprime un membre, un culte, une annonce ou une présence, la suppression est propagée en temps réel afin d’éviter toute réapparition.',
        ],
      },
      {
        title: '6. Vos Droits',
        bullets: [
          'Droit d’accès et de consultation de vos informations personnelles.',
          'Droit de rectification des données inexactes via votre profil ou l’administration de votre église.',
          'Droit à l’effacement complet de votre dossier auprès de l’administrateur de votre église ou de l’équipe OmniChurch Pro.',
        ],
      },
      {
        title: '7. Mineurs',
        paragraphs: [
          'L’enregistrement d’informations concernant des mineurs dans le cadre des activités paroissiales relève de la responsabilité de l’administration de l’église locale, avec le consentement des parents ou tuteurs légaux.',
        ],
      },
      {
        title: '8. Modifications et Contact',
        paragraphs: [
          'Cette politique peut être mise à jour périodiquement. La date de révision affichée en haut de cette page indique la version en vigueur.',
          'Pour toute question ou demande relative à la confidentialité et à la suppression de données : Jackson Charles — E-mail : charlesjj3186@gmail.com | Site web : https://omnichurch.download',
        ],
      },
    ],
    footerNote: 'OmniChurch Pro — Tous droits réservés.',
  },
  en: {
    brand: 'OmniChurch Pro',
    title: 'Privacy Policy',
    lastUpdatedLabel: 'Last updated:',
    lastUpdatedDate: 'November 17, 2026',
    effectiveLabel: 'Applies to the OmniChurch Pro web platform, Android mobile app, and desktop application.',
    backLabel: '← Back to Application',
    otherDocLinkLabel: 'Read Terms of Service',
    printLabel: 'Print',
    intro:
      'This Privacy Policy explains how OmniChurch Pro ("the Platform", "we", "our") collects, uses, stores, and safeguards personal information provided by church administrators, church members, and visitors using our web, mobile, and desktop services.',
    sections: [
      {
        title: '1. Information We Collect',
        paragraphs: [
          'We collect only the information required for church membership administration, service attendance tracking, and internal community communication:',
        ],
        bullets: [
          'Member Information: full name, Member ID, phone number, email address, date of birth, baptism date, ministry department or role, optional profile photo, and optional government ID (CIN/NIF) strictly when submitted for identity verification.',
          'Church & Administrator Information: church name, short code, physical location, lead pastor name, legal RNC documentation for verification, authorized digital signature, and the administrator’s Google/Firebase authentication email.',
          'Operational & Attendance Data: worship service schedules, QR attendance check-ins, voluntary cross-church visitor check-ins, announcements, comments, and reactions.',
          'Technical & Security Data: offline synchronization queue records, security audit logs, and local device biometric enrollment identifiers.',
        ],
      },
      {
        title: '2. How We Use Information',
        bullets: [
          'Enable churches to maintain their member directory, digital/printed QR ID cards, and real-time service attendance.',
          'Authenticate church administrators, reception operators, and members securely.',
          'Verify member card authenticity when a QR code is scanned via the official public verification portal.',
          'Synchronize records reliably across mobile, tablet, and desktop devices, including recovery from offline mode.',
          'Protect platform integrity against unauthorized access, fraud, or abusive behavior.',
        ],
      },
      {
        title: '3. Data Sharing & Tenant Isolation',
        paragraphs: [
          'OmniChurch Pro never sells, rents, or trades member or church data to third parties for advertising or brokerage purposes.',
          'Each church workspace is logically isolated under its unique Church ID. Data belonging to one church is not visible to other churches except in two user-initiated scenarios:',
        ],
        bullets: [
          'When a member visits another participating church and scans their QR card for cross-church visitor attendance.',
          'When an official public QR verification URL is accessed to confirm badge validity (displaying only authorized verification fields).',
        ],
      },
      {
        title: '4. Third-Party Infrastructure & Services',
        bullets: [
          'Google Firebase (Authentication and Cloud Firestore) for user authentication and encrypted cloud database persistence.',
          'Device Biometrics (WebAuthn / Fingerprint / Face ID): biometric verification happens strictly inside your device’s secure hardware enclave; biometric scans are never transmitted to or stored on our servers.',
          'Google AdMob: standard AdMob advertisements may be displayed on free-tier church workspaces without an active commercial license. Licensed churches operate ad-free.',
        ],
      },
      {
        title: '5. Security & Data Retention',
        paragraphs: [
          'All data in transit is encrypted using HTTPS/TLS. Administrative passcodes are cryptographically hashed, and server-side security rules enforce strict role-based access control.',
          'Records are retained while an account remains active. Deletions of members, services, announcements, or attendance records propagate across synchronized clients to prevent deleted items from reappearing.',
        ],
      },
      {
        title: '6. User Rights (Access, Correction & Deletion)',
        bullets: [
          'Access and review your personal profile information at any time.',
          'Request correction of inaccurate records through your profile settings or local church administration.',
          'Request complete deletion of your account and associated records through your church administrator or directly via platform support.',
        ],
      },
      {
        title: '7. Children’s Privacy',
        paragraphs: [
          'Any records involving minors within church youth or Sunday school ministries must be entered and managed by authorized church leadership with appropriate parental or legal guardian consent.',
        ],
      },
      {
        title: '8. Policy Updates & Contact Information',
        paragraphs: [
          'We may update this Privacy Policy from time to time to reflect operational or legal requirements. The effective date at the top indicates the latest revision.',
          'For privacy inquiries, compliance questions, or data deletion requests, contact: Jackson Charles — Email: charlesjj3186@gmail.com | Website: https://omnichurch.download',
        ],
      },
    ],
    footerNote: 'OmniChurch Pro — All rights reserved.',
  },
  es: {
    brand: 'OmniChurch Pro',
    title: 'Política de Privacidad',
    lastUpdatedLabel: 'Última actualización:',
    lastUpdatedDate: '17 de noviembre de 2026',
    effectiveLabel: 'Aplicable al sitio web, aplicación móvil Android y aplicación de escritorio OmniChurch Pro.',
    backLabel: '← Volver a la aplicación',
    otherDocLinkLabel: 'Ver Términos de Servicio',
    printLabel: 'Imprimir',
    intro:
      'Esta Política de Privacidad describe cómo OmniChurch Pro ("la Plataforma", "nosotros") recopila, utiliza, almacena y protege la información personal de administradores, miembros de iglesias y visitantes que utilizan nuestros servicios digitales.',
    sections: [
      {
        title: '1. Información que Recopilamos',
        paragraphs: [
          'Recopilamos únicamente la información necesaria para la administración eclesiástica, el registro de asistencias y la comunicación interna de cada congregación:',
        ],
        bullets: [
          'Datos de miembros: nombre completo, ID de Miembro, número de teléfono, correo electrónico, fecha de nacimiento, fecha de bautismo, ministerio o rol, fotografía de perfil opcional y documento de identidad (CIN/NIF) únicamente cuando se aporta para verificación.',
          'Datos de iglesias y administradores: nombre de la iglesia, código identificador, dirección física, pastor responsable, documentación legal RNC para verificación, firma digital autorizada y correo Google/Firebase de administración.',
          'Datos de actividad y asistencia: horarios de cultos, registros de asistencia por código QR, visitas entre iglesias, anuncios, comentarios y reacciones.',
          'Datos técnicos: cola de sincronización sin conexión, registros de auditoría de seguridad e identificadores locales de biometría del dispositivo.',
        ],
      },
      {
        title: '2. Uso de la Información',
        bullets: [
          'Permitir a cada iglesia gestionar su directorio de miembros, carnés QR y asistencias en tiempo real.',
          'Autenticar de forma segura a administradores, operadores de recepción y miembros.',
          'Verificar la autenticidad de los carnés de miembros al escanear el código QR en el portal oficial de verificación.',
          'Sincronizar registros entre dispositivos móviles y computadoras, incluso tras desconexiones temporales.',
          'Proteger la plataforma contra accesos no autorizados, fraude o conductas indebidas.',
        ],
      },
      {
        title: '3. Compartición y Aislamiento de Datos',
        paragraphs: [
          'OmniChurch Pro nunca vende, alquila ni comercializa datos personales de miembros o iglesias a terceros.',
          'Cada iglesia opera en un entorno aislado bajo su propio ID único. Los datos no se comparten con otras iglesias salvo en dos situaciones iniciadas voluntariamente:',
        ],
        bullets: [
          'Cuando un miembro visita otra iglesia participante y presenta su código QR para registrar asistencia como visitante.',
          'Cuando se consulta un enlace oficial de verificación pública de carné (mostrando exclusivamente los campos autorizados).',
        ],
      },
      {
        title: '4. Servicios de Terceros e Infraestructura',
        bullets: [
          'Google Firebase (Authentication y Cloud Firestore) para autenticación y almacenamiento seguro en la nube.',
          'Biometría del dispositivo (WebAuthn / Huella / Face ID): los datos biométricos permanecen exclusivamente en el hardware seguro de su dispositivo y nunca se envían a nuestros servidores.',
          'Google AdMob: en espacios gratuitos sin licencia comercial activa pueden mostrarse anuncios estándar de AdMob. Las iglesias con licencia activa operan sin publicidad.',
        ],
      },
      {
        title: '5. Seguridad y Conservación',
        paragraphs: [
          'Todas las comunicaciones están cifradas mediante HTTPS/TLS. Los códigos PIN administrativos se protegen mediante hash criptográfico y las reglas del servidor aplican control de acceso por roles.',
          'Los datos se conservan mientras la cuenta permanezca activa. Las eliminaciones de miembros, servicios, anuncios o asistencias se propagan en tiempo real para evitar su reaparición.',
        ],
      },
      {
        title: '6. Derechos del Usuario',
        bullets: [
          'Acceder y revisar su información personal en cualquier momento.',
          'Solicitar la corrección de datos inexactos desde su perfil o mediante la administración de su iglesia.',
          'Solicitar la eliminación definitiva de su cuenta y registros asociados ante el administrador de su iglesia o el equipo de la plataforma.',
        ],
      },
      {
        title: '7. Privacidad de Menores',
        paragraphs: [
          'El registro de información sobre menores en ministerios infantiles o juveniles debe realizarse bajo responsabilidad de la iglesia local con el consentimiento de padres o tutores legales.',
        ],
      },
      {
        title: '8. Cambios y Contacto',
        paragraphs: [
          'Podemos actualizar esta política periódicamente. La fecha superior indica la versión vigente.',
          'Para consultas de privacidad o solicitudes de eliminación de datos: Jackson Charles — Correo: charlesjj3186@gmail.com | Sitio web: https://omnichurch.download',
        ],
      },
    ],
    footerNote: 'OmniChurch Pro — Todos los derechos reservados.',
  },
};

export const TERMS_DEFAULT_CONTENT: Record<Language, LegalLocaleContent> = {
  ht: {
    brand: 'OmniChurch Pro',
    title: 'Kondisyon Itilizasyon',
    lastUpdatedLabel: 'Dènye mizajou :',
    lastUpdatedDate: '17 Novanm 2026',
    effectiveLabel: 'Aplikab pou sit entènèt, aplikasyon mobil Android ak aplikasyon biwo OmniChurch Pro.',
    backLabel: '← Retounen nan aplikasyon an',
    otherDocLinkLabel: 'Li Politik Konfidansyalite a',
    printLabel: 'Enprime paj la',
    intro:
      'Lè w kreye yon espas legliz, konekte kòm administratè, resepsyonis oswa manm, oswa itilize nenpòt sèvis OmniChurch Pro (« Platfòm lan »), ou dakò respekte Kondisyon Itilizasyon sa yo ak Politik Konfidansyalite platfòm lan.',
    sections: [
      {
        title: '1. Akseptasyon ak Objektif Platfòm lan',
        paragraphs: [
          'OmniChurch Pro se yon sistèm dijital jesyon legliz ki pèmèt kongregasyon yo òganize anyè manm yo, kat idantifikasyon QR yo, swivi prezans nan sèvis yo, anons ak kominikasyon entèn.',
          'Itilizasyon platfòm lan rezève pou aktivite legliz, òganizasyon kominotè kretyen ak sèvis pastoral lejitim.',
        ],
      },
      {
        title: '2. Responsablite Administratè Legliz yo',
        paragraphs: [
          'Chak administratè legliz ki anrejistre yon kongregasyon sou OmniChurch Pro sètifye e responsab pou :',
        ],
        bullets: [
          'Kenbe enfòmasyon legliz la (non, adrès, pastè responsab ak dokiman RNC si y ap mande verifikasyon) egzak ak otantik.',
          'Pwoteje kòd PIN administrasyon an, koneksyon Google li ak aparèy resepsyon ki otorize pou eskane prezans yo.',
          'Asire li gen konsantman manm yo (ak konsantman paran yo pou minè yo) anvan li anrejistre done pèsonèl yo nan anyè legliz la.',
          'Jere modération anons ak kòmantè nan legliz li an konfòmite ak lwa lokal yo ak prensip respè kretyen.',
        ],
      },
      {
        title: '3. Règ Itilizasyon Akseptab ak Konduit Manm yo',
        paragraphs: ['Tout itilizatè (administratè, resepsyon ak manm) entèdi pou :'],
        bullets: [
          'Itilize platfòm lan pou voye mesaj arasman, diskou rayisman, menas, fwod, espyonaj oswa kontni ilegal.',
          'Fòje oswa manipile kòd QR, kat manm, dokiman RNC oswa pyès idantite ofisyèl sou pòtay verifikasyon an.',
          'Eseye kontourne izolasyon sekirite ant legliz yo, rale done san otorizasyon (scraping), oswa deranje fonksyònman sèvè ak baz done platfòm lan.',
        ],
      },
      {
        title: '4. Pwopriyete Done ak Pwopriyete Entelektyèl',
        paragraphs: [
          'Chak legliz rete pwopriyetè total tout done manm li yo, istwa prezans li ak anons li kreye sou platfòm lan. OmniChurch Pro aji sèlman kòm founisè enfrastrikti teknik.',
          'Tout kòd sous, konsepsyon sistèm, mak OmniChurch Pro, modèl kat ak motè senkronizasyon yo rete pwopriyete eksklizif kreyatè platfòm lan. Pa gen okenn itilizatè ki gen dwa kopye, revann oswa rekonstwi platfòm lan san otorizasyon ekri.',
        ],
      },
      {
        title: '5. Lisans, Piblisite ak Vèsyon Gratis',
        paragraphs: [
          'Platfòm lan ka ofri toude espas gratis (ki kapab gen anons estanda AdMob oswa sponsò verifye pou sipòte depans sèvè yo) ak espas sou lisans ofisyèl san piblisite.',
          'Administrasyon platfòm lan gen dwa verifye validite kle lisans yo ak estati RNC legliz yo pou garanti sekirite tout rezo a.',
        ],
      },
      {
        title: '6. Disponibilite Sèvis ak Senkronizasyon Offline',
        paragraphs: [
          'Nou fè tout efò teknik pou sèvis nwaj la disponib 24/24 epi pèmèt anrejistreman prezans menm san entènèt. Sepandan, nou pa ka garanti yon disponibilite san entèripsyon nan ka pann rezo entènèt jeneral, antretyen pwograme oswa fòs majè.',
        ],
      },
      {
        title: '7. Sispansyon oswa Fèmti Kont',
        paragraphs: [
          'Ekip administrasyon OmniChurch Pro gen dwa sispann oswa fèmen aksè nenpòt kont oswa legliz ki vyole Kondisyon Itilizasyon sa yo, ki soumèt fo dokiman verifikasyon, oswa ki reprezante yon risk sekirite pou lòt itilizatè yo.',
        ],
      },
      {
        title: '8. Limitasyon Responsablite ak Kontak',
        paragraphs: [
          'Platfòm lan founi « jan li ye a » (as is). Nan limit lwa pèmèt, OmniChurch Pro pa responsab pou okenn pèt endirèk ki sòti nan move itilizasyon kòd aksè pèsonèl oswa nan kontni legliz endepandan yo pibliye.',
          'Pou nenpòt kesyon legal, sipò teknik oswa reklamasyon : Jackson Charles — Imèl : charlesjj3186@gmail.com | Sit ofisyèl : https://omnichurch.download',
        ],
      },
    ],
    footerNote: 'OmniChurch Pro — Kondisyon Itilizasyon Ofisyèl.',
  },
  fr: {
    brand: 'OmniChurch Pro',
    title: 'Conditions d’Utilisation',
    lastUpdatedLabel: 'Dernière mise à jour :',
    lastUpdatedDate: '17 novembre 2026',
    effectiveLabel: 'Applicable au site web, à l’application mobile Android et à l’application bureau OmniChurch Pro.',
    backLabel: '← Retour à l’application',
    otherDocLinkLabel: 'Consulter la Politique de Confidentialité',
    printLabel: 'Imprimer',
    intro:
      'En créant un espace d’église, en vous connectant en tant qu’administrateur, agent d’accueil ou membre, ou en utilisant tout service d’OmniChurch Pro (« la Plateforme »), vous acceptez sans réserve les présentes Conditions d’Utilisation ainsi que notre Politique de Confidentialité.',
    sections: [
      {
        title: '1. Objet et Champ d’Application',
        paragraphs: [
          'OmniChurch Pro est une solution numérique de gestion ecclésiale permettant aux congrégations de gérer leur annuaire de membres, cartes QR, suivi des présences, annonces et communications internes.',
        ],
      },
      {
        title: '2. Responsabilités des Administrateurs d’Église',
        bullets: [
          'Fournir des informations exactes et authentiques concernant l’église (nom, coordonnées, pasteur responsable et justificatifs RNC en cas de demande de vérification).',
          'Protéger la confidentialité du code PIN administrateur, du compte Google d’administration et des appareils d’accueil autorisés.',
          'Recueillir le consentement approprié des membres (et des tuteurs légaux pour les mineurs) avant d’enregistrer leurs données personnelles.',
          'Veiller au respect de la légalité et de la bienséance communautaire dans les annonces et commentaires publiés.',
        ],
      },
      {
        title: '3. Règles d’Usage Acceptable',
        bullets: [
          'Ne pas publier de contenu illégal, diffamatoire, haineux, frauduleux ou portant atteinte à la vie privée d’autrui.',
          'Ne pas falsifier de codes QR, cartes de membres, certificats RNC ou données affichées sur le portail de vérification.',
          'Ne pas tenter de contourner l’isolation des données entre églises, d’extraire massivement des données ou de perturber l’infrastructure technique.',
        ],
      },
      {
        title: '4. Propriété des Données et Propriété Intellectuelle',
        paragraphs: [
          'Chaque église conserve l’entière propriété de sa base de membres, de ses historiques de présence et de ses publications.',
          'La plateforme OmniChurch Pro, son code source, ses interfaces et ses marques demeurent la propriété exclusive de son éditeur. Toute reproduction, revente ou rétro-ingénierie non autorisée est interdite.',
        ],
      },
      {
        title: '5. Licences et Publicités',
        paragraphs: [
          'Les espaces gratuits peuvent afficher des annonces standard (AdMob) ou des partenaires vérifiés pour financer l’infrastructure. Les espaces disposant d’une licence commerciale active fonctionnent sans publicité.',
        ],
      },
      {
        title: '6. Disponibilité et Synchronisation Hors Ligne',
        paragraphs: [
          'Nous mettons tout en œuvre pour assurer une disponibilité continue et une prise en charge hors ligne fiable, sans toutefois garantir l’absence d’interruptions liées aux opérateurs réseau, à la maintenance ou aux cas de force majeure.',
        ],
      },
      {
        title: '7. Suspension et Résiliation',
        paragraphs: [
          'L’administration de la plateforme se réserve le droit de suspendre ou fermer tout compte ou espace d’église en cas de violation grave des présentes conditions, de fraude documentaire ou de menace à la sécurité du service.',
        ],
      },
      {
        title: '8. Limitation de Responsabilité et Contact',
        paragraphs: [
          'Le service est fourni « en l’état ». OmniChurch Pro ne saurait être tenu responsable des dommages indirects résultant d’une négligence dans la garde des identifiants ou des contenus publiés par des églises tierces.',
          'Contact officiel : Jackson Charles — E-mail : charlesjj3186@gmail.com | Site web : https://omnichurch.download',
        ],
      },
    ],
    footerNote: 'OmniChurch Pro — Conditions d’Utilisation Officielles.',
  },
  en: {
    brand: 'OmniChurch Pro',
    title: 'Terms of Service',
    lastUpdatedLabel: 'Last updated:',
    lastUpdatedDate: 'November 17, 2026',
    effectiveLabel: 'Applies to the OmniChurch Pro web platform, Android mobile app, and desktop application.',
    backLabel: '← Back to Application',
    otherDocLinkLabel: 'Read Privacy Policy',
    printLabel: 'Print',
    intro:
      'By creating a church workspace, signing in as an administrator, reception operator, or member, or using any OmniChurch Pro service ("the Platform"), you agree to be bound by these Terms of Service and our Privacy Policy.',
    sections: [
      {
        title: '1. Acceptance & Purpose of the Platform',
        paragraphs: [
          'OmniChurch Pro is a church management platform designed to help congregations administer member directories, QR identification badges, worship service attendance tracking, announcements, and internal communications.',
        ],
      },
      {
        title: '2. Church Administrator Responsibilities',
        bullets: [
          'Provide accurate, truthful church information (name, address, lead pastor, and authentic legal RNC documents when requesting verification).',
          'Safeguard administrative PIN codes, Google authentication credentials, and authorized reception scanning devices.',
          'Obtain appropriate consent from members (and parents/legal guardians for minors) before storing personal records.',
          'Moderate church announcements and community comments in accordance with applicable laws and respectful standards.',
        ],
      },
      {
        title: '3. Acceptable Use & Prohibited Conduct',
        bullets: [
          'Do not post unlawful, harassing, defamatory, fraudulent, or abusive material.',
          'Do not forge, tamper with, or misrepresent QR badges, member profiles, RNC certificates, or public verification results.',
          'Do not attempt to bypass church data isolation, scrape records, or interfere with servers, APIs, or security controls.',
        ],
      },
      {
        title: '4. Data Ownership & Intellectual Property',
        paragraphs: [
          'Each participating church retains sole ownership of its member directory, attendance history, and internal announcements.',
          'The OmniChurch Pro software, source code, trademarks, and system architecture remain the exclusive intellectual property of its creator. Unauthorized copying, resale, or reverse engineering is strictly prohibited.',
        ],
      },
      {
        title: '5. Licensing & Free-Tier Disclosures',
        paragraphs: [
          'Free-tier church workspaces may display standard advertisements (such as Google AdMob) or verified sponsors to support infrastructure operations. Workspaces covered by an active license operate free of advertisements.',
        ],
      },
      {
        title: '6. Service Availability & Offline Synchronization',
        paragraphs: [
          'While we strive for high availability and resilient offline synchronization, uninterrupted operation cannot be guaranteed in the event of external network outages, scheduled maintenance, or force majeure.',
        ],
      },
      {
        title: '7. Suspension & Termination',
        paragraphs: [
          'Platform administration reserves the right to suspend or terminate access for any account or church workspace that violates these Terms, submits falsified verification records, or poses a security risk.',
        ],
      },
      {
        title: '8. Limitation of Liability & Contact',
        paragraphs: [
          'The Platform is provided on an "as is" and "as available" basis. To the fullest extent permitted by law, OmniChurch Pro disclaims liability for indirect damages arising from compromised user credentials or third-party congregation content.',
          'Official Contact: Jackson Charles — Email: charlesjj3186@gmail.com | Website: https://omnichurch.download',
        ],
      },
    ],
    footerNote: 'OmniChurch Pro — Official Terms of Service.',
  },
  es: {
    brand: 'OmniChurch Pro',
    title: 'Términos de Servicio',
    lastUpdatedLabel: 'Última actualización:',
    lastUpdatedDate: '17 de noviembre de 2026',
    effectiveLabel: 'Aplicable al sitio web, aplicación móvil Android y aplicación de escritorio OmniChurch Pro.',
    backLabel: '← Volver a la aplicación',
    otherDocLinkLabel: 'Ver Política de Privacidad',
    printLabel: 'Imprimir',
    intro:
      'Al crear un espacio de iglesia, iniciar sesión como administrador, operador de recepción o miembro, o utilizar cualquier servicio de OmniChurch Pro ("la Plataforma"), usted acepta estos Términos de Servicio y nuestra Política de Privacidad.',
    sections: [
      {
        title: '1. Objeto de la Plataforma',
        paragraphs: [
          'OmniChurch Pro es una plataforma digital de gestión eclesiástica destinada a administrar directorios de miembros, carnés QR, control de asistencia a cultos, anuncios y comunicación interna.',
        ],
      },
      {
        title: '2. Responsabilidades de los Administradores',
        bullets: [
          'Mantener información veraz y actualizada de la iglesia (nombre, dirección, pastor responsable y documentos RNC válidos en caso de verificación).',
          'Resguardar la confidencialidad del PIN administrativo, cuenta Google autorizada y dispositivos de recepción.',
          'Contar con el consentimiento correspondiente de los miembros (y tutores legales en el caso de menores) antes de registrar sus datos.',
          'Supervisar los anuncios y comentarios publicados dentro de su congregación.',
        ],
      },
      {
        title: '3. Uso Aceptable y Conductas Prohibidas',
        bullets: [
          'No publicar contenido ilegal, difamatorio, fraudulento u ofensivo.',
          'No falsificar ni manipular códigos QR, carnés de miembros, documentos RNC ni resultados del portal de verificación.',
          'No intentar vulnerar el aislamiento entre iglesias, extraer datos sin permiso ni interferir con la infraestructura técnica.',
        ],
      },
      {
        title: '4. Propiedad de los Datos y Propiedad Intelectual',
        paragraphs: [
          'Cada iglesia conserva la plena titularidad de sus registros de miembros, asistencias y publicaciones.',
          'El software OmniChurch Pro, su código fuente, diseño y marcas son propiedad exclusiva de su creador. Queda prohibida la reproducción, reventa o ingeniería inversa no autorizada.',
        ],
      },
      {
        title: '5. Licencias y Publicidad',
        paragraphs: [
          'Los espacios gratuitos pueden mostrar anuncios estándar (Google AdMob) o patrocinadores verificados para sostener el servicio. Las iglesias con licencia activa operan sin publicidad.',
        ],
      },
      {
        title: '6. Disponibilidad y Modo Sin Conexión',
        paragraphs: [
          'Procuramos máxima disponibilidad y sincronización confiable sin conexión, pero no garantizamos funcionamiento ininterrumpido ante fallas de red externas, mantenimiento o fuerza mayor.',
        ],
      },
      {
        title: '7. Suspensión y Terminación',
        paragraphs: [
          'La administración de la plataforma podrá suspender o cancelar cualquier cuenta o espacio que infrinja estos Términos, aporte documentación falsa o comprometa la seguridad del sistema.',
        ],
      },
      {
        title: '8. Limitación de Responsabilidad y Contacto',
        paragraphs: [
          'La plataforma se ofrece "tal cual". En la medida permitida por la ley, OmniChurch Pro no será responsable por daños indirectos derivados del descuido de credenciales o contenidos publicados por terceros.',
          'Contacto oficial: Jackson Charles — Correo: charlesjj3186@gmail.com | Sitio web: https://omnichurch.download',
        ],
      },
    ],
    footerNote: 'OmniChurch Pro — Términos de Servicio Oficiales.',
  },
};

export const formatLegalLocaleToPlainText = (locale: LegalLocaleContent): string => {
  const parts: string[] = [locale.intro];
  for (const sec of locale.sections) {
    parts.push(`## ${sec.title}`);
    if (sec.paragraphs && sec.paragraphs.length > 0) {
      parts.push(...sec.paragraphs);
    }
    if (sec.bullets && sec.bullets.length > 0) {
      parts.push(sec.bullets.map((b) => `- ${b}`).join('\n'));
    }
  }
  return parts.join('\n\n');
};
