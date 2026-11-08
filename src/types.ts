export type Language = 'ht' | 'es' | 'en' | 'fr';

export type UserRole = 'admin' | 'member';

export type ServiceCategory =
  | 'general'      // 01 — Service Général
  | 'dominical'    // 02 — Dominical (Sèvis Dimanch)
  | 'etude'        // 03 — Étude Biblique
  | 'intercession' // 04 — Intercession
  | 'jeunesse'     // 05 — Réunion de la Jeunesse
  | 'enfants';     // 06 — Club des Enfants

export interface ServiceCategoryConfig {
  id: ServiceCategory;
  code: string;
  name: {
    ht: string;
    es?: string;
    fr: string;
    en: string;
  };
  description: {
    ht: string;
    es?: string;
    fr: string;
    en: string;
  };
  desc?: {
    ht: string;
    es?: string;
    fr: string;
    en: string;
  };
  iconName: string;
  color: string;
  badgeBg: string;
  badgeText: string;
}

export interface ChurchDonationInfo {
  enabled: boolean;

  // Bank Account Information
  bankEnabled?: boolean;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  bankAccountType?: 'checking' | 'savings' | 'courant' | 'epargne';
  bankRoutingOrSwift?: string;
  bankBranchOrDetails?: string;

  // PayPal Account Information
  paypalEnabled?: boolean;
  paypalEmail?: string;
  paypalMeUrl?: string;

  // MonCash (Haiti / Local Mobile Money)
  moncashEnabled?: boolean;
  moncashNumber?: string;
  moncashName?: string;

  // Zelle (USA / International)
  zelleEnabled?: boolean;
  zelleInfo?: string;
  zelleName?: string;

  // Cash App
  cashAppEnabled?: boolean;
  cashAppTag?: string;

  // Custom Giving / Direct Link & Instructions
  customGivingUrl?: string;
  customGivingLabel?: string;
  customInstructions?: string;
  bibleVerse?: string;
  notes?: string;
}

export interface ChurchRules {
  enabled?: boolean;
  communityGuidelines?: string; // Règlemantasyon Kominotè ak Eklezyastik
  privacyPolicy?: string;       // Pwoteksyon Done & Konfidansyalite
  financialTerms?: string;      // Règ sou Dîm, Ofrann ak Donasyon
  memberObligations?: string;   // Dwa ak Devwa Manm yo
  lastUpdated?: string;
}

export interface Church {
  id: string;          // e.g. "CH001"
  code: string;        // e.g. "ETG01" or "CH001"
  name: string;
  pastor: string;
  address: string;
  city: string;
  country?: string;
  phone: string;
  email: string;
  motto: string;
  themeColor: string;
  logoIcon: string;
  logoUrl?: string;
  createdAt: string;
  rnc?: string;        // Registre National des Contribuables (RNC) / Numéro Fiscal Eclésiastique Officiel
  rncNumber?: string;  // Alias for compatibility
  rncDocumentPhoto?: string; // Photo of church legal document (DGI/DGII tax cert, ministry decree, incorporation)
  rncDocumentUploadedAt?: string; // Timestamp of legal document upload
  rncVerificationStatus?: 'not_submitted' | 'pending' | 'verified' | 'rejected';
  rncVerifiedAt?: string;
  rncLegalName?: string; // Official legal entity name registered in government records
  rncDocumentType?: 'rnc_cert' | 'dgii_act' | 'ministry_decree' | 'statutes' | 'other';
  rncNotes?: string; // Notes, feedback or verification explanation
  adminGoogleEmail?: string;
  adminGoogleUid?: string;
  adminGoogleName?: string;
  adminGooglePhoto?: string;
  adminPasscode?: string;
  customCardTitle?: string;
  signatureUrl?: string; // Electronic signature data URL or image link of the admin/pastor
  website?: string;
  windowsExeDownloadUrl?: string; // Direct link to download the Windows .exe installer
  desktopAppVersion?: string;
  donationInfo?: ChurchDonationInfo;
  churchRules?: ChurchRules;
}

export interface Member {
  id: string;
  churchId: string;       // Multi-tenant isolation key
  memberId: string;       // Unique ID like "CH001-JD4827"
  pin?: string;           // 4-6 digit security PIN for member login (default: last 4 digits of memberId or phone)
  securityPin?: string;
  titlePrefix?: string;   // e.g. "Frè", "Sè", "Pastè", "Diacre", "Evangelis"
  fullName: string;
  gender?: 'male' | 'female';
  civilStatus?: 'celibataire' | 'marie' | 'veuf' | 'divorce';
  profession?: string;
  dateOfBirth: string;    // YYYY-MM-DD
  baptismDate?: string;   // YYYY-MM-DD
  phone: string;
  emergencyContact?: string; // Emergency phone or WhatsApp
  emergencyContactName?: string;
  email: string;
  googleEmail?: string;   // Connected Google Account Email
  googleUid?: string;     // Firebase Auth UID
  googlePhoto?: string;   // Google Profile picture
  address?: string;
  city?: string;
  zone?: string;
  department: string;     // e.g., 'Jeunesse', 'Chorale', 'Accueil', 'Intercession', 'Enfants', 'Général'
  role: string;           // e.g., 'Manm', 'Diacre', 'Responsable', 'Chantre', 'Monitè'
  cellGroup?: string;     // Cell or Prayer Group
  joinedDate: string;     // YYYY-MM-DD
  status: 'active' | 'inactive';
  avatarUrl?: string;
  photoUrl?: string;
  legalDocumentType?: 'cin' | 'nif' | 'passeport' | 'autre'; // Dokiman Legal (CIN, NIF, Pasipò, Lòt)
  legalDocumentNumber?: string;                             // Nimewo Dokiman Legal (eg: 001-234-567-8)
  barcodeToken: string;   // Token stored in QR/Barcode e.g. "CHURCH:CH001|MEMBER:CH001-JD4827"
  notes?: string;
  isDemo?: boolean;
}

export interface ServiceSession {
  id: string;
  churchId: string;
  category: ServiceCategory;
  title: string;
  date: string;          // YYYY-MM-DD
  startTime: string;     // e.g. "08:30"
  endTime: string;       // e.g. "11:30"
  preacherOrLeader: string;
  leader?: string;       // Dirijan (apa)
  preacher?: string;     // Predikatè (apa)
  reader?: string;       // Lektè (apa)
  musicians?: string;    // Mizisyen & Koral
  ushers?: string;       // Akèy & Pwotokòl
  theme?: string;
  passage?: string;
  notes?: string;
  status?: string;
  isOpenForAttendance: boolean; // Is this currently active for QR scanning?
  isPermanentlyEnded?: boolean; // Lè li fini, li pase epi li pa kapab reouvri ankò
  endedAt?: string;             // Dat ak lè egzak kilt la fini
  sendReminder24h?: boolean;   // Voye notifikasyon Rapèl 24 èdtan anvan sèvis la
  reminderSentAt?: string;     // Dat ak lè rapèl la te pwograme/voye
  lateToleranceMinutes?: number; // Minit tolerans anvan yo konsidere kòm reta
  lateThresholdMinutes?: number;
  createdAt: string;
  isDemo?: boolean;
}

export type AnnouncementCategory = 'anons' | 'ore' | 'sevis' | 'mesaj';

export interface Announcement {
  id: string;
  churchId: string;
  title: string;
  content: string;
  category: AnnouncementCategory | string;
  date: string;          // YYYY-MM-DD
  time?: string;
  isPinned?: boolean;
  pinned?: boolean;
  author: string;
  authorType?: 'admin' | 'pastor' | 'secretariat' | 'worship' | 'custom';
  targetAudience?: string; // 'Tout moun', 'Jeunesse', 'Dames', 'Hommes', 'Enfants'
  showToastOnLogin?: boolean; // When true, triggers a special alert toast when members log in
  toastAlertLevel?: 'urgent' | 'info' | 'warning' | 'celebration';
  // Pwogramasyon Notifikasyon Push / Toast Otomatik pou Dat Espesifik
  isScheduledNotification?: boolean; // Si notifikasyon an pwograme pou yon dat espesifik
  scheduledNotificationDate?: string; // Dat kòmansman / dat espesifik pou voye notifikasyon an (YYYY-MM-DD)
  scheduledNotificationEndDate?: string; // Dat limit / fen peryòd notifikasyon an (opsyonèl YYYY-MM-DD)
  scheduledTargetAudience?: string; // Odyans oswa depatman espesifik (opsyonèl, default: 'Tout moun')
  // Sipò Milti-lang pou Anons Ofisyèl yo
  title_fr?: string;
  title_en?: string;
  title_es?: string;
  title_ht?: string;
  content_fr?: string;
  content_en?: string;
  content_es?: string;
  content_ht?: string;
  // Wòl & Moun ki sou Sèvis nan Kilt la (Dirijan, Predikatè, Lektè, elatriye)
  serviceId?: string;
  leader?: string;       // Dirijan / Worship Leader / Dirigeant
  preacher?: string;     // Predikatè / Preacher / Prédicateur
  reader?: string;       // Lektè / Scripture Reader / Lecteur
  musicians?: string;    // Mizisyen & Koral / Musicians & Choir / Musiciens
  ushers?: string;       // Akèy & Pwotokòl / Ushers & Hospitality / Accueil
  // Postè & Imaj Vizyèl pou Fil Aktyalite Dinamik (Banner / Poster image)
  imageUrl?: string;     // Base64 WebP/JPEG data URL or external image URL
  imageCaption?: string; // Ti tit oswa deskripsyon pou postè a
  createdAt?: string;
  isDemo?: boolean;
}

export interface AnnouncementComment {
  id: string;
  announcementId?: string;
  announcementTitle?: string;
  churchId?: string;
  churchName?: string;
  author: string;
  authorMemberId?: string;
  memberId?: string;
  text: string;
  time: string;
  avatarInitials: string;
  isDemo?: boolean;
  createdAt?: string;
}

export interface AnnouncementReactionDoc {
  id: string;
  announcementId: string;
  churchId: string;
  memberId: string;
  reaction: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AnnouncementInteractionData {
  likes: number;
  userLiked: boolean;
  reaction?: string;
  comments: AnnouncementComment[];
}

export interface AttendanceRecord {
  id: string;
  churchId: string;
  serviceId: string;
  serviceCategory: ServiceCategory;
  serviceTitle: string;
  serviceDate: string;    // YYYY-MM-DD
  memberId: string;       // The unique code like "CH001-JD4827"
  memberDbId: string;     // The internal UUID
  memberName: string;
  memberPhone?: string;
  memberDepartment?: string;
  barcodeToken?: string;
  timestamp: string;      // ISO string
  checkInMethod: 'qr_scan' | 'barcode' | 'manual';
  recordedBy: string;     // Admin or Scanner name
  attendanceStatus?: 'on_time' | 'late' | 'excused';
  lateMinutes?: number;
  lateToleranceMinutes?: number;
  isDemo?: boolean;
}

export interface AbsenceRecord {
  id: string;
  churchId: string;
  serviceId: string;
  serviceCategory: ServiceCategory;
  serviceTitle: string;
  serviceDate: string;
  memberId: string;
  memberDbId: string;
  memberName: string;
  memberPhone?: string;
  memberDepartment?: string;
  status: 'absent' | 'excused';
  excuseReason?: string;
  recordedAt: string;
  autoGenerated: boolean;
}

export interface AppState {
  currentChurchId: string;
  currentUserRole: UserRole;
  currentMemberId?: string; // When logged in as member
  language: Language;
}

export interface GoogleAuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  id?: string;
  name?: string;
  imageUrl?: string;
  idToken?: string;
}

export type LicenseTier = 'trial' | 'pro_annual' | 'enterprise_lifetime' | 'custom';
export type LicenseStatus = 'active' | 'expired' | 'pending' | 'revoked';

export interface ChurchLicense {
  key: string;              // e.g. "OMNI-CH001-PRO-8492-7210"
  churchId: string;         // Targeted church ID (or "GLOBAL" for all)
  churchName?: string;
  tier: LicenseTier;
  status: LicenseStatus;
  issuedAt: string;         // ISO date
  expiresAt: string;        // ISO date or 'never'
  maxMembers: number;       // 0 for unlimited
  allowCloudSync: boolean;
  allowMultiChurch: boolean;
  allowAdFree: boolean;
  notes?: string;
}

export interface AdMobConfig {
  enabled: boolean;
  environment: 'test' | 'production';
  adMobAppId: string;          // e.g. "ca-app-pub-3940256099942544~3347511713"
  bannerAdUnitId: string;      // e.g. "ca-app-pub-3940256099942544/6300978111"
  interstitialAdUnitId: string;// e.g. "ca-app-pub-3940256099942544/1033173712"
  rewardedAdUnitId: string;    // e.g. "ca-app-pub-3940256099942544/5224354917"
  nativeAdUnitId: string;      // e.g. "ca-app-pub-3940256099942544/2247696110"
  showBannerInNavbarBottom: boolean;
  showBannerInMemberHome: boolean;
  showBannerInFooter: boolean;
  enableInterstitialOnScan: boolean;
  interstitialScanFrequency: number; // e.g. every 5 scans
  adFreeForLicensedChurches: boolean;
}

export type SponsorTier = 'platinum' | 'gold' | 'silver' | 'bronze' | 'partner';

export interface SponsorItem {
  id: string;
  name: string;
  logoUrl: string;
  tagline?: string;
  description?: string;
  category?: 'technology' | 'finance' | 'telecom' | 'media' | 'education' | 'general';
  tier: SponsorTier;
  targetUrl: string;          // Website or Social media link
  active: boolean;
  displayOrder: number;
  churchId?: string;          // Optional church scope, or 'global'
  createdAt: string;
}

export interface DeveloperDonationConfig {
  enabled: boolean;
  developerName: string;
  developerRole: string;
  developerBio: string;
  developerEmail: string;
  developerPhone?: string;

  // PayPal Account
  paypalEnabled: boolean;
  paypalEmail: string;
  paypalMeUrl: string;

  // Binance Crypto Account
  binanceEnabled: boolean;
  binancePayId: string;
  binanceUsdtAddress: string;
  binanceNetwork: string;

  // Wise Account
  wiseEnabled: boolean;
  wiseEmail: string;
  wiseTag: string;
  wiseIban: string;

  // MonCash / Local Payments
  moncashEnabled: boolean;
  moncashNumber: string;
  moncashName: string;

  // Zelle / Bank Transfer
  zelleEnabled: boolean;
  zelleInfo: string;

  customNote?: string;
}

export interface DeveloperAuditLog {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  status: 'info' | 'success' | 'warn' | 'error';
  admin?: string;
}

export interface DeveloperBroadcast {
  id: string;
  title: string;
  message: string;
  type: 'update' | 'warning' | 'info' | 'maintenance';
  targetChurchId: string; // 'ALL' or specific churchId
  createdAt: string;
  active: boolean;
  priority?: 'normal' | 'urgent';
}

export interface DeveloperAppUpdateConfig {
  enabled: boolean;                      // True si alèt mizajou a aktif nan tout sistèm lan
  latestVersion: string;                 // Egzanp: "1.0.1"
  currentVersion?: string;               // Egzanp: "1.0.0"
  minRequiredVersion?: string;           // Egzanp: "1.0.0"
  downloadUrl: string;                   // "https://omnichurch.download"
  channel: 'stable' | 'beta' | 'rc';
  isMandatory: boolean;                  // Si true, se yon mizajou kritik / ijan
  releaseDate: string;                   // Dat piblikasyon, egzanp: "2026-09-08"
  highlights: Record<Language, string[]>;
  importantNotice: Record<Language, string>;
  targetPlatform?: 'all' | 'android' | 'desktop' | 'web';
  lastBroadcastedAt?: string;
}

export interface DeveloperSettings {
  masterPin: string;          // Default: "7799"
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  showSponsorsInFooter: boolean;
  sponsorsEnabled?: boolean;
  sponsorMarqueeSpeed: number; // in seconds, default 25s
  enforceLicenseLockout: boolean;
  adMob: AdMobConfig;
  admob?: AdMobConfig;
  sponsors: SponsorItem[];
  licenses: ChurchLicense[];
  donations?: DeveloperDonationConfig;
  broadcasts?: DeveloperBroadcast[];
  auditLogs?: DeveloperAuditLog[];
  appUpdate?: DeveloperAppUpdateConfig;
  lastUpdated: string;
}

export type AppNotificationType =
  | 'official_alert'   // Avètisman Ofisyèl oswa Alèt Ijan Administrasyon Legliz la
  | 'announcement'      // Anons ofisyèl oswa kominike legliz
  | 'service_reminder' // Rapèl kilt oswa kilt aktif kounye a
  | 'attendance'       // Konfimasyon prezans eskane
  | 'interaction'      // Nouvo kòmantè oswa reyaksyon sou yon anons
  | 'system';          // Alèt sistèm oswa sekirite legliz

export interface AppNotification {
  id: string;
  churchId: string;
  type: AppNotificationType;
  title: string;
  body: string;
  createdAt: string; // ISO date string or formatted date
  read: boolean;
  priority?: 'normal' | 'high' | 'urgent';
  author?: string;
  authorType?: 'admin' | 'pastor' | 'secretariat' | 'worship' | 'custom' | 'member';
  actionTarget?: {
    tab?: string; // 'home', 'services', 'announcements', 'attendance'
    announcementId?: string;
    serviceId?: string;
  };
  badgeText?: string;
  iconType?: string;
}
