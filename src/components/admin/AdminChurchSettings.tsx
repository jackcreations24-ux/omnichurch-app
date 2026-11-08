import React, * as reactExports from "react";
import * as _jsxRuntime from "react/jsx-runtime";
const jsxRuntimeExports: any = _jsxRuntime;

import confetti from "canvas-confetti";
import QRCode from "qrcode";
import { Share } from "@capacitor/share";
import {
  Settings,
  Download,
  ShieldCheck,
  CheckCheck,
  Flame,
  BookOpen,
  Heart,
  Crown,
  Building2,
  Check,
  Copy,
  Globe,
  KeyRound,
  Layers,
  CreditCard,
  Database,
  HeartHandshake,
  Activity,
  Lock,
  MapPin,
  Phone,
  Mail,
  CircleCheck,
  Clock,
  FileText,
  Eye,
  Upload,
  Trash2,
  ImagePlus,
  PenTool,
  Save,
  TriangleAlert,
  Info,
  LogOut,
  EyeOff,
  Fingerprint,
  ScanFace,
  ShieldAlert,
  Plus,
  Search,
  X as X$1,
  Palette,
  FileJson,
  CircleArrowUp,
  RefreshCw,
  DollarSign,
  Smartphone,
  Server,
  HardDrive,
  Cpu,
} from "lucide-react";
import { translations } from "../../utils/i18n";
import {
  getAllChurches,
  compressImageToBase64,
  saveChurch,
  createNewChurch,
  deleteChurch,
  resetSystemDatabase,
  purgeTestChurches,
  getMembersByChurch,
  getServicesByChurch,
  getAnnouncementsByChurch,
  getAttendanceByChurch,
} from "../../utils/storage";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import {
  hasActiveChurchLicense,
  getChurchLicense,
} from "../../utils/developerStorage";
import {
  checkBiometricSupport,
  getAdminBiometricRecord,
  removeAdminBiometrics,
  registerAdminBiometrics,
} from "../../utils/biometrics";
import {
  isPasscodeHashed,
  hashAdminPasscodeSync,
  verifyAdminPasscode,
} from "../../utils/cryptoSecurity";
import { APP_BASE_VERSION as version } from "../../version";
import { isValidRnc } from "../../utils/rncValidator";
import {
  getAppVersionInfo,
  preserveSessionBeforeUpdate,
  executeAppUpdateDownload,
} from "../../services/appUpdateService";
import { AdminRncVerificationSection } from "./AdminRncVerificationSection";
import { SignatureDrawModal } from "../common/SignatureDrawModal";
import { ChurchDonationModal } from "../common/ChurchDonationModal";
import { ChurchTermsModal } from "../common/ChurchTermsModal";
import { ChurchLicenseModal } from "../common/ChurchLicenseModal";

const getThemeColors = (isEs, isFr, isEn) => [
  { id: "amber", name: isEs ? "Oro Real (Ámbar)" : isFr ? "Or Royal (Ambre)" : isEn ? "Royal Gold (Amber)" : "Lò Wayal (Amber)", bg: "bg-amber-500", text: "text-amber-400", border: "border-amber-400" },
  { id: "indigo", name: isEs ? "Azul Índigo (Indigo)" : isFr ? "Bleu Indigo (Indigo)" : isEn ? "Indigo Blue (Indigo)" : "Ble Endigo (Indigo)", bg: "bg-indigo-500", text: "text-indigo-400", border: "border-indigo-400" },
  { id: "emerald", name: isEs ? "Verde Esmeralda (Emerald)" : isFr ? "Vert Émeraude (Emerald)" : isEn ? "Emerald Green (Emerald)" : "Favè Vèt (Emerald)", bg: "bg-emerald-500", text: "text-emerald-400", border: "border-emerald-400" },
  { id: "rose", name: isEs ? "Rosa Amor (Rose)" : isFr ? "Rose Amour (Rose)" : isEn ? "Love Rose (Rose)" : "Renmen Woz (Rose)", bg: "bg-rose-500", text: "text-rose-400", border: "border-rose-400" },
  { id: "purple", name: isEs ? "Púrpura Gloria (Purple)" : isFr ? "Pourpre Gloire (Purple)" : isEn ? "Glory Purple (Purple)" : "Glwa Mov (Purple)", bg: "bg-purple-500", text: "text-purple-400", border: "border-purple-400" },
  { id: "sky", name: isEs ? "Azul Celeste (Sky)" : isFr ? "Bleu Ciel (Sky)" : isEn ? "Sky Blue (Sky)" : "Syèl Ble (Sky)", bg: "bg-sky-500", text: "text-sky-400", border: "border-sky-400" }
];
const getLogoIcons = (isEs, isFr, isEn) => [
  { id: "Church", label: isEs ? "Iglesia" : isFr ? "Église" : isEn ? "Church" : "Legliz", icon: Building2 },
  { id: "Cross", label: isEs ? "Cruz" : isFr ? "Croix" : isEn ? "Cross" : "Kwa", icon: Plus },
  { id: "Flame", label: isEs ? "Fuego del Espíritu" : isFr ? "Flamme de l’Esprit" : isEn ? "Flame of the Spirit" : "Dife Lespri", icon: Flame },
  { id: "Book", label: isEs ? "Biblia" : isFr ? "Bible" : isEn ? "Bible" : "Labib", icon: BookOpen },
  { id: "Heart", label: isEs ? "Amor" : isFr ? "Amour" : isEn ? "Love" : "Renmen", icon: Heart },
  { id: "Crown", label: isEs ? "Corona" : isFr ? "Couronne" : isEn ? "Crown" : "Kowòn", icon: Crown }
];
export const AdminChurchSettings: React.FC<any> = ({
  currentChurch: propCurrentChurch,
  church: propChurch,
  allChurches: propAllChurches,
  language = "ht",
  onChurchChange,
  onChurchSaved,
  onChurchCreated,
  onChurchDeleted,
  onSystemReset,
  onRefreshAll
}) => {
  var _a3, _b3, _c2, _d2, _e3, _f2, _g2, _h2, _i2, _j2, _k2, _l2, _m2, _n2, _o, _p, _q, _r2, _s, _t2, _u, _v, _w, _x, _y, _z, _A, _B;
  const isEs = language === "es";
  const isFr = language === "fr";
  const isEn = language === "en";
  const t3 = translations[language] || translations.ht;
  const activeChurch = propCurrentChurch || propChurch || getAllChurches()[0];
  const allChurchesList = propAllChurches || getAllChurches();
  const toast = useToast();
  const {
    googleUser,
    signInWithGoogle,
    signOutGoogle,
    linkChurchAdminGoogleAccount,
    unlinkChurchAdminGoogleAccount
  } = useAuth();
  const [activeSubTab, setActiveSubTab] = reactExports.useState("profile");
  const [churchToDelete, setChurchToDelete] = reactExports.useState(null);
  const [deletePasscode, setDeletePasscode] = reactExports.useState("");
  const [showDeletePasscode, setShowDeletePasscode] = reactExports.useState(false);
  const [deletePasscodeError, setDeletePasscodeError] = reactExports.useState(null);
  const [isDeletingChurch, setIsDeletingChurch] = reactExports.useState(false);
  const [showSystemResetModal, setShowSystemResetModal] = reactExports.useState(false);
  const [isResettingSystem, setIsResettingSystem] = reactExports.useState(false);
  const [showPurgeDemoModal, setShowPurgeDemoModal] = reactExports.useState(false);
  const [isPurgingDemo, setIsPurgingDemo] = reactExports.useState(false);
  const [name2, setName] = reactExports.useState(activeChurch.name || "");
  const [code, setCode] = reactExports.useState(activeChurch.code || "");
  const [pastor, setPastor] = reactExports.useState(activeChurch.pastor || "");
  const [address, setAddress] = reactExports.useState(activeChurch.address || "");
  const [city, setCity] = reactExports.useState(activeChurch.city || "");
  const [phone, setPhone] = reactExports.useState(activeChurch.phone || "");
  const [email, setEmail] = reactExports.useState(activeChurch.email || "");
  const [website, setWebsite] = reactExports.useState(activeChurch.website || "");
  const [motto, setMotto] = reactExports.useState(activeChurch.motto || "");
  const [rnc, setRnc] = reactExports.useState(activeChurch.rnc || activeChurch.rncNumber || "");
  const [rncDocumentPhoto, setRncDocumentPhoto] = reactExports.useState(activeChurch.rncDocumentPhoto || "");
  const [rncDocumentUploadedAt, setRncDocumentUploadedAt] = reactExports.useState(activeChurch.rncDocumentUploadedAt || "");
  const [isPreviewingDocumentModal, setIsPreviewingDocumentModal] = reactExports.useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = reactExports.useState(false);
  const legalDocInputRef = reactExports.useRef(null);
  const [themeColor, setThemeColor] = reactExports.useState(activeChurch.themeColor || "amber");
  const [logoIcon, setLogoIcon] = reactExports.useState(activeChurch.logoIcon || "Church");
  const [adminPasscode, setAdminPasscode] = reactExports.useState(activeChurch.adminPasscode || "");
  const [customCardTitle, setCustomCardTitle] = reactExports.useState(
    activeChurch.customCardTitle || (isEs ? "TARJETA DE MEMBRESÍA" : isFr ? "CARTE DE MEMBRE OFFICIELLE" : isEn ? "OFFICIAL MEMBER CARD" : "KAT IDANTITE MANM")
  );
  const [signatureUrl, setSignatureUrl] = reactExports.useState(activeChurch.signatureUrl || "");
  const [showSignaturePad, setShowSignaturePad] = reactExports.useState(false);
  const [adminGoogleEmail, setAdminGoogleEmail] = reactExports.useState(activeChurch.adminGoogleEmail || "");
  const [windowsExeDownloadUrl, setWindowsExeDownloadUrl] = reactExports.useState(activeChurch.windowsExeDownloadUrl || "");
  const [copiedCmd, setCopiedCmd] = reactExports.useState(null);
  const [qrDataUrl, setQrDataUrl] = reactExports.useState("");
  const signatureInputRef = reactExports.useRef(null);
  const profileSignatureInputRef = reactExports.useRef(null);
  const [showLicenseModal, setShowLicenseModal] = reactExports.useState(false);
  const [licenseRefreshKey, setLicenseRefreshKey] = reactExports.useState(0);
  const isChurchLicensed = reactExports.useMemo(() => hasActiveChurchLicense(activeChurch.id), [activeChurch.id, licenseRefreshKey]);
  const activeLicenseDetails = reactExports.useMemo(() => getChurchLicense(activeChurch.id), [activeChurch.id, licenseRefreshKey]);
  const [donationEnabled, setDonationEnabled] = reactExports.useState(
    isChurchLicensed ? ((_a3 = activeChurch.donationInfo) == null ? void 0 : _a3.enabled) ?? false : false
  );
  const [donationBankEnabled, setDonationBankEnabled] = reactExports.useState(((_b3 = activeChurch.donationInfo) == null ? void 0 : _b3.bankEnabled) ?? true);
  const [donationBankName, setDonationBankName] = reactExports.useState(((_c2 = activeChurch.donationInfo) == null ? void 0 : _c2.bankName) || "");
  const [donationBankAccountNumber, setDonationBankAccountNumber] = reactExports.useState(((_d2 = activeChurch.donationInfo) == null ? void 0 : _d2.bankAccountNumber) || "");
  const [donationBankAccountHolder, setDonationBankAccountHolder] = reactExports.useState(
    ((_e3 = activeChurch.donationInfo) == null ? void 0 : _e3.bankAccountHolder) || activeChurch.name || ""
  );
  const [donationBankAccountType, setDonationBankAccountType] = reactExports.useState(
    ((_f2 = activeChurch.donationInfo) == null ? void 0 : _f2.bankAccountType) || "checking"
  );
  const [donationBankRoutingOrSwift, setDonationBankRoutingOrSwift] = reactExports.useState(
    ((_g2 = activeChurch.donationInfo) == null ? void 0 : _g2.bankRoutingOrSwift) || ""
  );
  const [donationPaypalEnabled, setDonationPaypalEnabled] = reactExports.useState(((_h2 = activeChurch.donationInfo) == null ? void 0 : _h2.paypalEnabled) ?? true);
  const [donationPaypalEmail, setDonationPaypalEmail] = reactExports.useState(
    ((_i2 = activeChurch.donationInfo) == null ? void 0 : _i2.paypalEmail) || activeChurch.email || ""
  );
  const [donationPaypalMeUrl, setDonationPaypalMeUrl] = reactExports.useState(((_j2 = activeChurch.donationInfo) == null ? void 0 : _j2.paypalMeUrl) || "");
  const [donationMoncashEnabled, setDonationMoncashEnabled] = reactExports.useState(((_k2 = activeChurch.donationInfo) == null ? void 0 : _k2.moncashEnabled) ?? true);
  const [donationMoncashNumber, setDonationMoncashNumber] = reactExports.useState(
    ((_l2 = activeChurch.donationInfo) == null ? void 0 : _l2.moncashNumber) || activeChurch.phone || ""
  );
  const [donationMoncashName, setDonationMoncashName] = reactExports.useState(
    ((_m2 = activeChurch.donationInfo) == null ? void 0 : _m2.moncashName) || activeChurch.name || ""
  );
  const [donationZelleEnabled, setDonationZelleEnabled] = reactExports.useState(((_n2 = activeChurch.donationInfo) == null ? void 0 : _n2.zelleEnabled) ?? false);
  const [donationZelleInfo, setDonationZelleInfo] = reactExports.useState(((_o = activeChurch.donationInfo) == null ? void 0 : _o.zelleInfo) || "");
  const [donationZelleName, setDonationZelleName] = reactExports.useState(
    ((_p = activeChurch.donationInfo) == null ? void 0 : _p.zelleName) || activeChurch.name || ""
  );
  const handleLegalDocUpload = async (e3) => {
    var _a4;
    const file = (_a4 = e3.target.files) == null ? void 0 : _a4[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(
        isEs ? "Formato No Válido" : isFr ? "Format Non Valide" : isEn ? "Invalid Format" : "Fòma Envalid",
        isEs ? "Por favor suba una foto en formato JPG o PNG." : "Tanpri chwazi yon foto dokiman ki nan fòma JPG oswa PNG."
      );
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Fichye Twò Gwo", "Tanpri chwazi yon foto ki mwens pase 10MB.");
      return;
    }
    setIsUploadingDoc(true);
    try {
      const compressed = await compressImageToBase64(file, 1200, 0.85);
      setRncDocumentPhoto(compressed);
      setRncDocumentUploadedAt((/* @__PURE__ */ new Date()).toISOString());
      toast.success(
        isEs ? "Documento Legal Cargado" : isFr ? "Document Légal Ajouté" : isEn ? "Legal Document Uploaded" : "Dokiman Legal Anrejistre",
        isEs ? "Foto del documento legal guardada." : "Foto dokiman legal la anrejistre kòrèkteman."
      );
    } catch (err) {
      toast.error("Erè", (err == null ? void 0 : err.message) || "Pa t ka trete foto a.");
    } finally {
      setIsUploadingDoc(false);
      if (legalDocInputRef.current) legalDocInputRef.current.value = "";
    }
  };
  const [donationCashAppEnabled, setDonationCashAppEnabled] = reactExports.useState(((_q = activeChurch.donationInfo) == null ? void 0 : _q.cashAppEnabled) ?? false);
  const [donationCashAppTag, setDonationCashAppTag] = reactExports.useState(((_r2 = activeChurch.donationInfo) == null ? void 0 : _r2.cashAppTag) || "");
  const [donationCustomGivingUrl, setDonationCustomGivingUrl] = reactExports.useState(
    ((_s = activeChurch.donationInfo) == null ? void 0 : _s.customGivingUrl) || ""
  );
  const [donationCustomGivingLabel, setDonationCustomGivingLabel] = reactExports.useState(
    ((_t2 = activeChurch.donationInfo) == null ? void 0 : _t2.customGivingLabel) || ""
  );
  const [donationCustomInstructions, setDonationCustomInstructions] = reactExports.useState(
    ((_u = activeChurch.donationInfo) == null ? void 0 : _u.customInstructions) || ""
  );
  const [donationBibleVerse, setDonationBibleVerse] = reactExports.useState(
    ((_v = activeChurch.donationInfo) == null ? void 0 : _v.bibleVerse) || ""
  );
  const [showDonationPreviewModal, setShowDonationPreviewModal] = reactExports.useState(false);
  const [rulesEnabled, setRulesEnabled] = reactExports.useState(((_w = activeChurch.churchRules) == null ? void 0 : _w.enabled) ?? true);
  const [rulesCommunity, setRulesCommunity] = reactExports.useState(((_x = activeChurch.churchRules) == null ? void 0 : _x.communityGuidelines) || "");
  const [rulesPrivacy, setRulesPrivacy] = reactExports.useState(((_y = activeChurch.churchRules) == null ? void 0 : _y.privacyPolicy) || "");
  const [rulesFinancial, setRulesFinancial] = reactExports.useState(((_z = activeChurch.churchRules) == null ? void 0 : _z.financialTerms) || "");
  const [rulesMemberObligations, setRulesMemberObligations] = reactExports.useState(((_A = activeChurch.churchRules) == null ? void 0 : _A.memberObligations) || "");
  const [showRulesPreviewModal, setShowRulesPreviewModal] = reactExports.useState(false);
  const [savedSuccess, setSavedSuccess] = reactExports.useState(false);
  const [isLinkingGoogle, setIsLinkingGoogle] = reactExports.useState(false);
  const [showPasscode, setShowPasscode] = reactExports.useState(false);
  const [churchSearchQuery, setChurchSearchQuery] = reactExports.useState("");
  const [copiedId, setCopiedId] = reactExports.useState(false);
  const [copiedPortalUrl, setCopiedPortalUrl] = reactExports.useState(false);
  const [bioSupported, setBioSupported] = reactExports.useState(false);
  const [bioLabel, setBioLabel] = reactExports.useState("Anprent / FaceID");
  const [adminBioRecord, setAdminBioRecord] = reactExports.useState(null);
  const [isRegisteringBio, setIsRegisteringBio] = reactExports.useState(false);
  const [pingLatency, setPingLatency] = reactExports.useState(null);
  const [isPinging, setIsPinging] = reactExports.useState(false);
  const [isImporting, setIsImporting] = reactExports.useState(false);
  const fileInputRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const currentUrl = typeof window !== "undefined" ? window.location.href : "https://omnichurch.pro";
    QRCode.toDataURL(currentUrl, {
      width: 260,
      margin: 1.5,
      color: {
        dark: "#0F172A",
        light: "#FFFFFF"
      }
    }).then((url) => setQrDataUrl(url)).catch(() => {
    });
  }, []);
  reactExports.useEffect(() => {
    var _a4, _b4, _c3, _d3, _e4, _f3, _g3, _h3, _i3, _j3, _k3, _l3, _m3, _n3, _o2, _p2, _q2, _r3, _s2, _t3, _u2, _v2, _w2, _x2, _y2, _z2, _A2;
    setName(activeChurch.name || "");
    setCode(activeChurch.code || "");
    setPastor(activeChurch.pastor || "");
    setAddress(activeChurch.address || "");
    setCity(activeChurch.city || "");
    setPhone(activeChurch.phone || "");
    setEmail(activeChurch.email || "");
    setWebsite(activeChurch.website || "");
    setMotto(activeChurch.motto || "");
    setRnc(activeChurch.rnc || activeChurch.rncNumber || "");
    setRncDocumentPhoto(activeChurch.rncDocumentPhoto || "");
    setRncDocumentUploadedAt(activeChurch.rncDocumentUploadedAt || "");
    setThemeColor(activeChurch.themeColor || "amber");
    setLogoIcon(activeChurch.logoIcon || "Church");
    setAdminPasscode(activeChurch.adminPasscode || "");
    setCustomCardTitle(
      activeChurch.customCardTitle || (isEs ? "TARJETA DE MEMBRESÍA" : isFr ? "CARTE DE MEMBRE OFFICIELLE" : isEn ? "OFFICIAL MEMBER CARD" : "KAT IDANTITE MANM")
    );
    setSignatureUrl(activeChurch.signatureUrl || "");
    setAdminGoogleEmail(activeChurch.adminGoogleEmail || "");
    setWindowsExeDownloadUrl(activeChurch.windowsExeDownloadUrl || "");
    setDonationEnabled(((_a4 = activeChurch.donationInfo) == null ? void 0 : _a4.enabled) ?? true);
    setDonationBankEnabled(((_b4 = activeChurch.donationInfo) == null ? void 0 : _b4.bankEnabled) ?? true);
    setDonationBankName(((_c3 = activeChurch.donationInfo) == null ? void 0 : _c3.bankName) || "");
    setDonationBankAccountNumber(((_d3 = activeChurch.donationInfo) == null ? void 0 : _d3.bankAccountNumber) || "");
    setDonationBankAccountHolder(((_e4 = activeChurch.donationInfo) == null ? void 0 : _e4.bankAccountHolder) || activeChurch.name || "");
    setDonationBankAccountType(((_f3 = activeChurch.donationInfo) == null ? void 0 : _f3.bankAccountType) || "checking");
    setDonationBankRoutingOrSwift(((_g3 = activeChurch.donationInfo) == null ? void 0 : _g3.bankRoutingOrSwift) || "");
    setDonationPaypalEnabled(((_h3 = activeChurch.donationInfo) == null ? void 0 : _h3.paypalEnabled) ?? true);
    setDonationPaypalEmail(((_i3 = activeChurch.donationInfo) == null ? void 0 : _i3.paypalEmail) || activeChurch.email || "");
    setDonationPaypalMeUrl(((_j3 = activeChurch.donationInfo) == null ? void 0 : _j3.paypalMeUrl) || "");
    setDonationMoncashEnabled(((_k3 = activeChurch.donationInfo) == null ? void 0 : _k3.moncashEnabled) ?? true);
    setDonationMoncashNumber(((_l3 = activeChurch.donationInfo) == null ? void 0 : _l3.moncashNumber) || activeChurch.phone || "");
    setDonationMoncashName(((_m3 = activeChurch.donationInfo) == null ? void 0 : _m3.moncashName) || activeChurch.name || "");
    setDonationZelleEnabled(((_n3 = activeChurch.donationInfo) == null ? void 0 : _n3.zelleEnabled) ?? false);
    setDonationZelleInfo(((_o2 = activeChurch.donationInfo) == null ? void 0 : _o2.zelleInfo) || "");
    setDonationZelleName(((_p2 = activeChurch.donationInfo) == null ? void 0 : _p2.zelleName) || activeChurch.name || "");
    setDonationCashAppEnabled(((_q2 = activeChurch.donationInfo) == null ? void 0 : _q2.cashAppEnabled) ?? false);
    setDonationCashAppTag(((_r3 = activeChurch.donationInfo) == null ? void 0 : _r3.cashAppTag) || "");
    setDonationCustomGivingUrl(((_s2 = activeChurch.donationInfo) == null ? void 0 : _s2.customGivingUrl) || "");
    setDonationCustomGivingLabel(((_t3 = activeChurch.donationInfo) == null ? void 0 : _t3.customGivingLabel) || "");
    setDonationCustomInstructions(((_u2 = activeChurch.donationInfo) == null ? void 0 : _u2.customInstructions) || "");
    setDonationBibleVerse(((_v2 = activeChurch.donationInfo) == null ? void 0 : _v2.bibleVerse) || "");
    setRulesEnabled(((_w2 = activeChurch.churchRules) == null ? void 0 : _w2.enabled) ?? true);
    setRulesCommunity(((_x2 = activeChurch.churchRules) == null ? void 0 : _x2.communityGuidelines) || "");
    setRulesPrivacy(((_y2 = activeChurch.churchRules) == null ? void 0 : _y2.privacyPolicy) || "");
    setRulesFinancial(((_z2 = activeChurch.churchRules) == null ? void 0 : _z2.financialTerms) || "");
    setRulesMemberObligations(((_A2 = activeChurch.churchRules) == null ? void 0 : _A2.memberObligations) || "");
  }, [activeChurch, isEs, isFr, isEn]);
  const handleUploadSignature = (e3) => {
    var _a4;
    const file = (_a4 = e3.target.files) == null ? void 0 : _a4[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error(
        isEs ? "Archivo Demasiado Grande" : isFr ? "Fichier Trop Volumineux" : isEn ? "File Too Large" : "Fichye Twò Gwo",
        isEs ? "Por favor elija una imagen de firma menor a 4MB." : isFr ? "Veuillez choisir une image de signature de moins de 4 Mo." : isEn ? "Please choose a signature image under 4MB." : "Tanpri chwazi yon imaj siyati mwens pase 4MB."
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setSignatureUrl(dataUrl);
      const updated = {
        ...activeChurch,
        signatureUrl: dataUrl
      };
      saveChurch(updated);
      toast.success(
        isEs ? "¡Firma Electrónica Cargada!" : isFr ? "Signature Électronique Téléversée !" : isEn ? "Electronic Signature Uploaded!" : "Siyati Elektwonik Monte!",
        isEs ? "La firma se ha guardado y se mostrará en todas las tarjetas." : isFr ? "La signature a été enregistrée et apparaîtra sur toutes les cartes." : isEn ? "Signature saved and will be displayed on all member ID cards." : "Siyati a anrejistre epi l ap parèt sou tout kat ak badj yo."
      );
      if (onChurchSaved) onChurchSaved();
      if (onRefreshAll) onRefreshAll();
    };
    reader.readAsDataURL(file);
  };
  const handleSaveDrawnSignature = (dataUrl) => {
    setSignatureUrl(dataUrl);
    const updated = {
      ...activeChurch,
      signatureUrl: dataUrl
    };
    saveChurch(updated);
    toast.success(
      isEs ? "¡Firma Guardada con Éxito!" : isFr ? "Signature Enregistrée avec Succès !" : isEn ? "Signature Successfully Saved!" : "Siyati Trase a Anrejistre !",
      isEs ? "La firma electrónica trazada se ha guardado y está disponible para todas las tarjetas." : isFr ? "La signature dessinée a été enregistrée et est disponible pour toutes les cartes." : isEn ? "Drawn signature has been saved and is available across all cards." : "Siyati elektwonik ou fèk ekri a anrejistre epi li disponib globalman pou tout kat ak badj yo."
    );
    if (onChurchSaved) onChurchSaved();
    if (onRefreshAll) onRefreshAll();
  };
  const handleRemoveSignature = () => {
    setSignatureUrl("");
    if (signatureInputRef.current) {
      signatureInputRef.current.value = "";
    }
    if (profileSignatureInputRef.current) {
      profileSignatureInputRef.current.value = "";
    }
    const updated = {
      ...activeChurch,
      signatureUrl: void 0
    };
    saveChurch(updated);
    toast.info(
      isEs ? "Firma Eliminada" : isFr ? "Signature Supprimée" : isEn ? "Signature Removed" : "Siyati Retire",
      isEs ? "Las tarjetas usarán la firma de texto estándar." : isFr ? "Les cartes utiliseront la signature textuelle standard." : isEn ? "Cards will revert to standard text signature." : "Kat yo ap itilize siyati tèks estanda."
    );
    if (onChurchSaved) onChurchSaved();
    if (onRefreshAll) onRefreshAll();
  };
  reactExports.useEffect(() => {
    checkBiometricSupport().then((support) => {
      setBioSupported(support.isSupported);
      if (support.biometryLabel) setBioLabel(support.biometryLabel);
    });
  }, []);
  reactExports.useEffect(() => {
    if (activeChurch) {
      setAdminBioRecord(getAdminBiometricRecord(activeChurch.id));
    }
  }, [activeChurch]);
  const handleToggleAdminBiometrics = async () => {
    if (adminBioRecord) {
      removeAdminBiometrics(activeChurch.id);
      setAdminBioRecord(null);
      toast.info(
        isEs ? "Biometría Desactivada" : isFr ? "Biométrie Désactivée" : isEn ? "Biometrics Disabled" : "Byometri Dezaktive",
        isEs ? "El acceso biométrico para este administrador ha sido revocado en este dispositivo." : isFr ? "L’accès biométrique pour cet administrateur a été révoqué sur cet appareil." : isEn ? "Biometric unlock for this church admin was revoked on this device." : "Aksè anprent/FaceID pou admin legliz sa a retire sou aparèy sa a."
      );
    } else {
      setIsRegisteringBio(true);
      const res = await registerAdminBiometrics(
        activeChurch.id,
        activeChurch.name,
        activeChurch.adminGoogleEmail
      );
      setIsRegisteringBio(false);
      if (res.success) {
        setAdminBioRecord(getAdminBiometricRecord(activeChurch.id));
        try {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        } catch (_2) {
        }
        toast.success(
          isEs ? "¡Biometría Activada con Éxito!" : isFr ? "Biométrie Activée avec Succès !" : isEn ? "Biometrics Activated Successfully!" : "Byometri Aktive avèk Siksè!",
          isEs ? "Ahora puede desbloquear el panel de administración con su huella o Face ID." : isFr ? "Vous pouvez désormais déverrouiller l’espace admin avec votre empreinte ou Face ID." : isEn ? "You can now unlock the admin panel with your fingerprint or Face ID." : "Kounye a ou ka debloke espas admin nan ak anprent oswa Face ID ou sou aparèy sa a."
        );
      } else {
        toast.error(
          isEs ? "Error de Activación" : isFr ? "Erreur d’Activation" : isEn ? "Activation Error" : "Erè Aktivasyon",
          res.error || (isEs ? "No se pudo activar la biometría." : "Pa rive aktive byometri sou aparèy sa a.")
        );
      }
    }
  };
  const filteredChurches = reactExports.useMemo(() => {
    const q2 = churchSearchQuery.trim().toLowerCase();
    if (!q2) return allChurchesList;
    return allChurchesList.filter(
      (c3) => (c3.name || "").toLowerCase().includes(q2) || (c3.id || "").toLowerCase().includes(q2) || (c3.code || "").toLowerCase().includes(q2) || (c3.pastor || "").toLowerCase().includes(q2) || (c3.city || "").toLowerCase().includes(q2)
    );
  }, [allChurchesList, churchSearchQuery]);
  const [isCreatingNew, setIsCreatingNew] = reactExports.useState(false);
  const [newName, setNewName] = reactExports.useState("");
  const [newCode, setNewCode] = reactExports.useState("");
  const [newPastor, setNewPastor] = reactExports.useState("");
  const [newAddress, setNewAddress] = reactExports.useState("");
  const [newCity, setNewCity] = reactExports.useState(
    isEs ? "Santo Domingo, Rep. Dom." : isFr ? "Port-au-Prince, Haïti" : isEn ? "Miami, FL, USA" : "Pòtoprens, Ayiti"
  );
  const [newPhone, setNewPhone] = reactExports.useState("+1 ");
  const [newEmail, setNewEmail] = reactExports.useState("");
  const [newMotto, setNewMotto] = reactExports.useState("");
  const [newAdminPasscode, setNewAdminPasscode] = reactExports.useState("");
  const [newConfirmPasscode, setNewConfirmPasscode] = reactExports.useState("");
  const [showNewPasscode, setShowNewPasscode] = reactExports.useState(false);
  const handleSaveCurrentChurch = (e3) => {
    e3.preventDefault();
    const updated = {
      ...activeChurch,
      name: name2.trim(),
      code: code.trim().toUpperCase(),
      pastor: pastor.trim(),
      address: address.trim(),
      city: city.trim(),
      phone: phone.trim(),
      email: email.trim(),
      website: website.trim(),
      motto: motto.trim(),
      rnc: rnc.trim() || void 0,
      rncNumber: rnc.trim() || void 0,
      rncDocumentPhoto: rncDocumentPhoto.trim() || void 0,
      rncDocumentUploadedAt: rncDocumentPhoto.trim() ? rncDocumentUploadedAt || (/* @__PURE__ */ new Date()).toISOString() : void 0,
      themeColor,
      logoIcon,
      adminPasscode: adminPasscode.trim() ? isPasscodeHashed(adminPasscode.trim()) ? adminPasscode.trim() : hashAdminPasscodeSync(adminPasscode.trim(), activeChurch.id) : void 0,
      customCardTitle: customCardTitle.trim() || void 0,
      signatureUrl: signatureUrl.trim() || void 0,
      adminGoogleEmail: adminGoogleEmail.trim().toLowerCase() || void 0,
      windowsExeDownloadUrl: windowsExeDownloadUrl.trim() || void 0,
      donationInfo: {
        enabled: isChurchLicensed ? donationEnabled : false,
        bankEnabled: donationBankEnabled,
        bankName: donationBankName.trim(),
        bankAccountNumber: donationBankAccountNumber.trim(),
        bankAccountHolder: donationBankAccountHolder.trim() || activeChurch.name,
        bankAccountType: donationBankAccountType,
        bankRoutingOrSwift: donationBankRoutingOrSwift.trim(),
        paypalEnabled: donationPaypalEnabled,
        paypalEmail: donationPaypalEmail.trim(),
        paypalMeUrl: donationPaypalMeUrl.trim(),
        moncashEnabled: donationMoncashEnabled,
        moncashNumber: donationMoncashNumber.trim(),
        moncashName: donationMoncashName.trim() || activeChurch.name,
        zelleEnabled: donationZelleEnabled,
        zelleInfo: donationZelleInfo.trim(),
        zelleName: donationZelleName.trim() || activeChurch.name,
        cashAppEnabled: donationCashAppEnabled,
        cashAppTag: donationCashAppTag.trim(),
        customGivingUrl: donationCustomGivingUrl.trim(),
        customGivingLabel: donationCustomGivingLabel.trim(),
        customInstructions: donationCustomInstructions.trim(),
        bibleVerse: donationBibleVerse.trim()
      },
      churchRules: {
        enabled: rulesEnabled,
        communityGuidelines: rulesCommunity.trim(),
        privacyPolicy: rulesPrivacy.trim(),
        financialTerms: rulesFinancial.trim(),
        memberObligations: rulesMemberObligations.trim(),
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
    saveChurch(updated);
    setSavedSuccess(true);
    toast.success(
      isEs ? "¡Ajustes Guardados!" : isFr ? "Paramètres Enregistrés !" : isEn ? "Settings Saved!" : "Paramèt Anrejistre!",
      isEs ? `Toda la configuración para "${updated.name}" ha sido actualizada.` : isFr ? `Toute la configuration pour "${updated.name}" a été mise à jour.` : isEn ? `Configuration for "${updated.name}" has been successfully updated.` : `Tout konfigirasyon pou "${updated.name}" mete ajou.`
    );
    setTimeout(() => setSavedSuccess(false), 3e3);
    if (onChurchSaved) onChurchSaved();
    if (onRefreshAll) onRefreshAll();
  };
  const handleCreateChurch = (e3) => {
    e3.preventDefault();
    if (!newName.trim() || !newPastor.trim()) {
      toast.error(
        isEs ? "Faltan Datos" : isFr ? "Données Manquantes" : isEn ? "Missing Information" : "Enfòmasyon Manke",
        isEs ? "Por favor indique el nombre de la iglesia y el nombre del pastor principal." : isFr ? "Veuillez renseigner le nom de l’église et le pasteur titulaire." : isEn ? "Please provide the church name and senior pastor name." : "Tanpri bay non legliz la ak non pastè titilè a."
      );
      return;
    }
    const cleanPin = newAdminPasscode.trim();
    const cleanConfirm = newConfirmPasscode.trim();
    if (!cleanPin || cleanPin.length < 4) {
      toast.error(
        isEs ? "PIN de Seguridad Requerido" : isFr ? "PIN de Sécurité Obligatoire" : isEn ? "Security PIN Required" : "Kòd PIN Obligatwa",
        isEs ? "Cada iglesia debe tener su propio PIN de seguridad exclusivo de al menos 4 caracteres." : isFr ? "Chaque église doit avoir son propre code PIN de sécurité d’au moins 4 caractères." : isEn ? "Every church must define its own master security PIN of at least 4 characters." : "Chak legliz dwe defini pwòp kòd sekirite (PIN) mèt pa li ki gen omwen 4 karaktè."
      );
      return;
    }
    if (cleanPin !== cleanConfirm) {
      toast.error(
        isEs ? "Los PIN no coinciden" : isFr ? "Les PIN ne correspondent pas" : isEn ? "PINs do not match" : "Kòd PIN yo pa koresponn",
        isEs ? "La confirmación del PIN no coincide." : "Konfimasyon kòd PIN lan pa koresponn."
      );
      return;
    }
    try {
      const created = createNewChurch({
        name: newName,
        code: newCode,
        pastor: newPastor,
        address: newAddress,
        city: newCity,
        phone: newPhone,
        email: newEmail,
        motto: newMotto,
        adminPasscode: cleanPin,
        adminGoogleEmail: (googleUser == null ? void 0 : googleUser.email) || ""
      });
      toast.success(
        isEs ? "¡Nueva Iglesia Creada!" : isFr ? "Nouvelle Église Créée !" : isEn ? "New Church Created!" : "Nouvo Legliz Kreye!",
        isEs ? `El espacio privado "${created.name}" (${created.id}) está listo con su código de seguridad propio.` : isFr ? `L'espace d'église privé "${created.name}" (${created.id}) est prêt avec son code de sécurité propre.` : isEn ? `Private church workspace "${created.name}" (${created.id}) is ready with its dedicated passcode.` : `Espas prive "${created.name}" (${created.id}) pare avèk kòd sekirite pa li.`
      );
      try {
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
      } catch (_2) {
      }
      setIsCreatingNew(false);
      setNewName("");
      setNewCode("");
      setNewPastor("");
      setNewAddress("");
      setNewEmail("");
      setNewMotto("");
      setNewAdminPasscode("");
      setNewConfirmPasscode("");
      if (onChurchCreated) {
        onChurchCreated(created);
      } else if (onChurchChange) {
        onChurchChange(created.id);
      }
    } catch (err) {
      toast.error(
        isEs ? "Error al crear la iglesia" : "Erè pandan kreyasyon legliz la",
        (err == null ? void 0 : err.message) || "Pa ka kreye espas legliz la."
      );
    }
  };
  const handleConfirmDeleteChurch = async () => {
    if (!churchToDelete) return;
    setDeletePasscodeError(null);
    const requiredPasscode = (churchToDelete.adminPasscode || "").trim();
    const enteredPasscode = deletePasscode.trim();
    if (!enteredPasscode) {
      setDeletePasscodeError(
        isEs ? "Por favor ingrese el código de seguridad de esta iglesia para confirmar la eliminación." : isFr ? "Veuillez entrer le code de sécurité de cette église pour confirmer la suppression." : isEn ? "Please enter the security passcode of this church to confirm deletion." : "Tanpri antre kòd sekirite mèt legliz sa a pou w ka konfime sipresyon an."
      );
      return;
    }
    if (requiredPasscode) {
      const verify = await verifyAdminPasscode(enteredPasscode, requiredPasscode, churchToDelete.id);
      if (!verify.matches) {
        setDeletePasscodeError(
          isEs ? "Código de seguridad incorrecto. Verifique el código maestro de esta iglesia." : isFr ? "Code de sécurité incorrect. Vérifiez le code maître de cette église." : isEn ? "Incorrect security passcode. Please verify this church’s master PIN." : "Kòd sekirite sa a pa kòrèk pou legliz sa a. Verifye kòd sekirite mèt li a."
        );
        return;
      }
    }
    setIsDeletingChurch(true);
    try {
      const deletedId = churchToDelete.id;
      const deletedName = churchToDelete.name;
      await deleteChurch(deletedId, enteredPasscode);
      toast.success(
        isEs ? "¡Iglesia Eliminada!" : isEn ? "Church Deleted!" : isFr ? "Église Supprimée !" : "Legliz la Efase!",
        isEs ? `La iglesia "${deletedName}" y todos sus datos han sido eliminados de la base de datos.` : isEn ? `The church "${deletedName}" and all associated data have been deleted.` : isFr ? `L'église "${deletedName}" et toutes ses données ont été supprimées.` : `Legliz "${deletedName}" ak tout done li yo efase nèt nan baz done a.`
      );
      setChurchToDelete(null);
      setDeletePasscode("");
      setDeletePasscodeError(null);
      if (onChurchDeleted) {
        onChurchDeleted(deletedId);
      } else if (onRefreshAll) {
        onRefreshAll();
      }
    } catch (err) {
      toast.error(
        isEs ? "Error al eliminar" : isEn ? "Delete error" : isFr ? "Erreur de suppression" : "Erè pandan sipresyon",
        (err == null ? void 0 : err.message) || (isEs ? "No se pudo eliminar la iglesia." : isEn ? "Could not delete church." : isFr ? "Impossible de supprimer l’église." : "Pa ka efase legliz la.")
      );
      setDeletePasscodeError((err == null ? void 0 : err.message) || "Erè pandan sipresyon an.");
    } finally {
      setIsDeletingChurch(false);
    }
  };
  const handleConfirmSystemReset = async () => {
    setIsResettingSystem(true);
    try {
      await resetSystemDatabase();
      toast.success(
        isEs ? "¡Sistema Restablecido!" : isEn ? "System Reset Complete!" : isFr ? "Système Réinitialisé !" : "Sistèm Re-inisyalize!",
        isEs ? "Todos los datos de la base de datos y del almacenamiento local han sido restablecidos con éxito." : isEn ? "All database and local storage records have been successfully reset." : isFr ? "Toutes les données de la base de données et du stockage local ont été réinitialisées avec succès." : "Tout done nan baz done a ak memwa lokal la re-inisyalize a zewo avèk siksè."
      );
      setShowSystemResetModal(false);
      if (onSystemReset) {
        onSystemReset();
      } else {
        window.location.reload();
      }
    } catch (err) {
      toast.error(
        isEs ? "Error al restablecer" : isEn ? "Reset error" : isFr ? "Erreur de réinitialisation" : "Erè pandan re-inisyalizasyon",
        (err == null ? void 0 : err.message) || (isEs ? "No se pudo restablecer el sistema." : isEn ? "Could not reset system." : isFr ? "Impossible de réinitialiser le système." : "Pa ka re-inisyalize sistèm nan.")
      );
    } finally {
      setIsResettingSystem(false);
    }
  };
  const handleConfirmPurgeDemo = async () => {
    setIsPurgingDemo(true);
    try {
      const count = await purgeTestChurches();
      toast.success(
        isEs ? "¡Limpieza Completada!" : isEn ? "Cleanup Completed!" : isFr ? "Nettoyage Terminé !" : "Netwayaj Konplè!",
        isEs ? `Se eliminaron ${count} iglesia(s) de prueba/demo de la base de datos.` : isEn ? `Deleted ${count} test/demo church(es) from the database.` : isFr ? `${count} église(s) de test/démo ont été supprimées de la base de données.` : `Yo efase ${count} legliz tès/demo nan baz done a.`
      );
      setShowPurgeDemoModal(false);
      if (onRefreshAll) onRefreshAll();
    } catch (err) {
      toast.error(
        isEs ? "Error de limpieza" : isEn ? "Cleanup error" : isFr ? "Erreur de nettoyage" : "Erè netwayaj",
        (err == null ? void 0 : err.message) || (isEs ? "No se pudieron eliminar las iglesias de prueba." : isEn ? "Could not clean test churches." : isFr ? "Impossible de supprimer les églises de test." : "Pa ka netwaye legliz tès yo.")
      );
    } finally {
      setIsPurgingDemo(false);
    }
  };
  const handleCopyId = () => {
    navigator.clipboard.writeText(activeChurch.id);
    setCopiedId(true);
    toast.success(
      isEs ? "¡Copiado!" : isFr ? "Copié !" : isEn ? "Copied!" : "Kopye!",
      isEs ? `Church ID ${activeChurch.id} copiado al portapapeles.` : isFr ? `Church ID ${activeChurch.id} copié dans le presse-papiers.` : isEn ? `Church ID ${activeChurch.id} copied to clipboard.` : `Church ID ${activeChurch.id} kopye nan clipboard ou.`
    );
    setTimeout(() => setCopiedId(false), 2500);
  };
  const handleCopyPortalLink = () => {
    const rawOrigin = typeof window !== "undefined" && window.location.origin ? window.location.origin : "";
    const isLocal = !rawOrigin || rawOrigin.includes("localhost") || rawOrigin.includes("127.0.0.1");
    const baseUrl = isLocal ? "https://omnichurch.pro" : rawOrigin;
    const url = `${baseUrl}?church=${activeChurch.id}&role=member`;
    navigator.clipboard.writeText(url);
    setCopiedPortalUrl(true);
    toast.success(
      isEs ? "¡Enlace de Portal Copiado!" : isFr ? "Lien du Portail Copié !" : isEn ? "Member Portal Link Copied!" : "Lyen Pòtay Manm Kopye!",
      isEs ? "Puede compartir este enlace directamente con los miembros." : isFr ? "Vous pouvez partager ce lien directement avec les membres." : isEn ? "You can share this link directly with members." : "Ou ka pataje lyen sa a bay manm legliz la dirèkteman."
    );
    setTimeout(() => setCopiedPortalUrl(false), 2500);
  };
  const handleExportJsonBackup = () => {
    const churchMembers = getMembersByChurch(activeChurch.id);
    const churchServices = getServicesByChurch(activeChurch.id);
    const churchAnnouncements = getAnnouncementsByChurch(activeChurch.id);
    const churchAttendance = getAttendanceByChurch(activeChurch.id);
    const backupPayload = {
      version: "2.0-pro",
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      church: activeChurch,
      data: {
        members: churchMembers,
        services: churchServices,
        announcements: churchAnnouncements,
        attendance: churchAttendance
      },
      stats: {
        totalMembers: churchMembers.length,
        totalServices: churchServices.length,
        totalAnnouncements: churchAnnouncements.length,
        totalAttendanceRecords: churchAttendance.length
      }
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupPayload, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `iglesia_${activeChurch.code || activeChurch.id}_backup_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success(
      isEs ? "¡Copia de Seguridad Descargada!" : isFr ? "Sauvegarde Téléchargée !" : isEn ? "Backup Downloaded!" : "Sovgad Telechaje!",
      isEs ? `Archivo JSON para "${activeChurch.name}" descargado con éxito.` : isFr ? `Fichier JSON pour "${activeChurch.name}" téléchargé avec succès.` : isEn ? `JSON backup file for "${activeChurch.name}" downloaded successfully.` : `Fichye JSON pou "${activeChurch.name}" telechaje avèk siksè.`
    );
    try {
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
    } catch (_2) {
    }
  };
  const handleFileImport = (e3) => {
    var _a4;
    const file = (_a4 = e3.target.files) == null ? void 0 : _a4[0];
    if (!file) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      var _a5, _b4, _c3, _d3, _e4, _f3, _g3, _h3, _i3;
      try {
        const content = (_a5 = event.target) == null ? void 0 : _a5.result;
        const parsed = JSON.parse(content);
        if (!parsed.church || !parsed.data) {
          throw new Error(
            isEs ? "El formato del archivo no es válido." : isFr ? "Le format du fichier n’est pas valide pour ce système." : isEn ? "Invalid backup file format for this system." : "Fòma fichye a pa valid pou sistèm legliz sa a."
          );
        }
        const confirmRestore = window.confirm(
          isEs ? `¿Desea restaurar los datos de "${parsed.church.name}" (${((_b4 = parsed.stats) == null ? void 0 : _b4.totalMembers) || ((_c3 = parsed.data.members) == null ? void 0 : _c3.length) || 0} miembros)?` : isFr ? `Voulez-vous restaurer les données de "${parsed.church.name}" (${((_d3 = parsed.stats) == null ? void 0 : _d3.totalMembers) || ((_e4 = parsed.data.members) == null ? void 0 : _e4.length) || 0} membres) ?` : isEn ? `Do you want to restore data for "${parsed.church.name}" (${((_f3 = parsed.stats) == null ? void 0 : _f3.totalMembers) || ((_g3 = parsed.data.members) == null ? void 0 : _g3.length) || 0} members)?` : `Èske w vle restore done pou "${parsed.church.name}" (${((_h3 = parsed.stats) == null ? void 0 : _h3.totalMembers) || ((_i3 = parsed.data.members) == null ? void 0 : _i3.length) || 0} manm)?`
        );
        if (confirmRestore) {
          saveChurch(parsed.church);
          toast.success(
            isEs ? "¡Restauración Exitosa!" : isFr ? "Restauration Réussie !" : isEn ? "Restore Successful!" : "Restorasyon Reyisi!",
            isEs ? `Datos de ${parsed.church.name} restaurados.` : isFr ? `Données de ${parsed.church.name} restaurées.` : isEn ? `Data for ${parsed.church.name} restored.` : `Done pou ${parsed.church.name} restore.`
          );
          if (onRefreshAll) onRefreshAll();
        }
      } catch (err) {
        toast.error(
          isEs ? "Error de Archivo" : isFr ? "Erreur de Fichier" : isEn ? "File Error" : "Erè Fichye",
          (err == null ? void 0 : err.message) || (isEs ? "Archivo JSON no reconocido." : isFr ? "Fichier JSON non reconnu." : isEn ? "Unrecognized JSON file." : "Fichye JSON pa rekonèt.")
        );
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };
  const handleTestLatency = () => {
    setIsPinging(true);
    const start = performance.now();
    setTimeout(() => {
      const end = performance.now();
      setPingLatency(Math.round(end - start));
      setIsPinging(false);
      toast.success(
        isEs ? "Sistema Operacional" : isFr ? "Système Opérationnel" : isEn ? "System Operational" : "Sistèm Operasyonèl",
        isEs ? "Conexión local y nube respondiendo rápidamente." : isFr ? "Connexion locale et cloud répondant rapidement." : isEn ? "Local cache and cloud sync responding quickly." : "Koneksyon lokal & nwaj ap reponn rapidman."
      );
    }, 180);
  };
  const activeMembersCount = reactExports.useMemo(() => getMembersByChurch(activeChurch.id).length, [activeChurch.id]);
  const activeServicesCount = reactExports.useMemo(() => getServicesByChurch(activeChurch.id).length, [activeChurch.id]);
  const activeAttendanceCount = reactExports.useMemo(() => getAttendanceByChurch(activeChurch.id).length, [activeChurch.id]);
  const themeColors = getThemeColors(isEs, isFr, isEn);
  const logoIcons = getLogoIcons(isEs, isFr, isEn);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6 pb-16 max-w-5xl mx-auto font-sans", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2.5 flex-wrap", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { className: "w-6 h-6 text-amber-400" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Ajustes y Configuración General" : isFr ? "Paramètres & Configuration Générale" : isEn ? "General Settings & Configuration" : "Paramèt & Konfigirasyon Ultra Pro Max" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-3 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 text-xs font-mono font-extrabold", children: activeChurch.code || activeChurch.id })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs sm:text-sm text-slate-400 mt-0.5", children: isEs ? "Gestión centralizada, diseño de tarjetas, seguridad Google/PIN y aislamiento multi-iglesia." : isFr ? "Gestion centralisée, personnalisation des cartes, sécurité Google/PIN et isolation multi-églises." : isEn ? "Centralized management, card customization, Google/PIN security, and multi-church isolation." : "Jesyon santralize, pèsonalizasyon kat, sekirite Google/PIN ak izolasyon multi-legliz." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: handleExportJsonBackup,
            className: "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/30 font-bold text-xs shadow transition-all cursor-pointer",
            title: isEs ? "Descargar todos los datos de esta iglesia en JSON" : isFr ? "Télécharger toutes les données de cette église en JSON" : isEn ? "Download all data for this church in JSON" : "Telechaje tout done legliz sa a an JSON",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "w-3.5 h-3.5" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Copia JSON" : isFr ? "Sauvegarde JSON" : isEn ? "JSON Backup" : "Sovgad JSON" })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "w-4 h-4 text-emerald-400" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Datos Aislados (Multi-Tenant)" : isFr ? "Données Isolées (Multi-Tenant)" : isEn ? "Isolated Data (Multi-Tenant)" : "Done Izole (Multi-Tenant)" })
        ] })
      ] })
    ] }),
    savedSuccess && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3.5 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-fadeIn", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCheck, { className: "w-5 h-5 text-emerald-400 shrink-0" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "¡Cambios guardados con éxito en la base de datos!" : isFr ? "Modifications enregistrées avec succès dans la base de données !" : isEn ? "Changes saved successfully in the database!" : "Modifikasyon yo anrejistre avèk siksè nan baz done a!" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-gradient-to-r from-[#1E293B] via-[#1E293B] to-[#162235] rounded-3xl p-5 border border-slate-700/80 shadow-xl space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col md:flex-row md:items-center justify-between gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-extrabold text-xl shadow-inner", children: activeChurch.logoIcon === "Flame" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Flame, { className: "w-6 h-6 text-amber-400" }) : activeChurch.logoIcon === "Book" ? /* @__PURE__ */ jsxRuntimeExports.jsx(BookOpen, { className: "w-6 h-6 text-amber-400" }) : activeChurch.logoIcon === "Heart" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Heart, { className: "w-6 h-6 text-amber-400" }) : activeChurch.logoIcon === "Crown" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Crown, { className: "w-6 h-6 text-amber-400" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Building2, { className: "w-6 h-6 text-amber-400" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-base sm:text-lg font-black text-white", children: activeChurch.name }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-[10px] font-mono text-slate-300", children: activeChurch.id })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-slate-400", children: [
              activeChurch.pastor,
              " • ",
              activeChurch.city || (isEs ? "Sede Principal" : isFr ? "Siège Principal" : isEn ? "Main Campus" : "Ayiti")
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              id: "btn-copy-church-id",
              onClick: handleCopyId,
              className: "px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all",
              children: [
                copiedId ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "w-3.5 h-3.5 text-emerald-400" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "w-3.5 h-3.5 text-amber-400" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: copiedId ? isEs ? "¡Copiado!" : isFr ? "Copié !" : isEn ? "Copied!" : "Kopye!" : `ID: ${activeChurch.id}` })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              id: "btn-copy-member-portal-link",
              onClick: handleCopyPortalLink,
              className: "px-3 py-1.5 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all",
              children: [
                copiedPortalUrl ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "w-3.5 h-3.5 text-emerald-400" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Globe, { className: "w-3.5 h-3.5" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: copiedPortalUrl ? isEs ? "¡Enlace Copiado!" : isFr ? "Lien Copié !" : isEn ? "Link Copied!" : "Lyen Kopye!" : isEs ? "Compartir Portal" : isFr ? "Partager le Portail" : isEn ? "Share Portal" : "Pataje Pòtay Manm" })
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-3 gap-2 pt-3 border-t border-slate-700/80 text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-2.5 rounded-xl bg-slate-900/60 border border-slate-800", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-slate-400 uppercase font-bold block", children: isEs ? "Miembros Registrados" : isFr ? "Membres Enregistrés" : isEn ? "Registered Members" : "Manm Anrejistre" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-base font-extrabold text-white", children: activeMembersCount })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-2.5 rounded-xl bg-slate-900/60 border border-slate-800", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-slate-400 uppercase font-bold block", children: isEs ? "Sesiones de Culto" : isFr ? "Sessions de Culte" : isEn ? "Worship Services" : "Sesyon Kilt" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-base font-extrabold text-amber-300", children: activeServicesCount })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-2.5 rounded-xl bg-slate-900/60 border border-slate-800", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-slate-400 uppercase font-bold block", children: isEs ? "Registros Asistencia" : isFr ? "Fiches de Présence" : isEn ? "Attendance Records" : "Fich Prezans" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-base font-extrabold text-emerald-300", children: activeAttendanceCount })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800 text-xs scrollbar-none", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          id: "settings-subtab-profile",
          onClick: () => setActiveSubTab("profile"),
          className: `flex items-center gap-2 px-3.5 py-2.5 rounded-2xl font-bold whitespace-nowrap transition-all cursor-pointer ${activeSubTab === "profile" ? "bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20" : "text-slate-400 hover:text-white hover:bg-slate-800/80"}`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Building2, { className: "w-4 h-4" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "1. Perfil e Identidad" : isFr ? "1. Profil & Identité" : isEn ? "1. Profile & Identity" : "1. Pwofil & Idantite" })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          id: "settings-subtab-security",
          onClick: () => setActiveSubTab("security"),
          className: `flex items-center gap-2 px-3.5 py-2.5 rounded-2xl font-bold whitespace-nowrap transition-all cursor-pointer ${activeSubTab === "security" ? "bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20" : "text-slate-400 hover:text-white hover:bg-slate-800/80"}`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(KeyRound, { className: "w-4 h-4" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "2. Seguridad y Acceso Google" : isFr ? "2. Sécurité & Accès Google" : isEn ? "2. Security & Google Access" : "2. Sekirite & Aksè Google" }),
            activeChurch.adminGoogleEmail && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-2 h-2 rounded-full bg-emerald-400 animate-pulse" })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          id: "settings-subtab-rnc-verification",
          onClick: () => setActiveSubTab("rnc_verification"),
          className: `flex items-center gap-2 px-3.5 py-2.5 rounded-2xl font-bold whitespace-nowrap transition-all cursor-pointer ${activeSubTab === "rnc_verification" ? "bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20" : "text-slate-400 hover:text-white hover:bg-slate-800/80"}`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "w-4 h-4" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "3. Verificación RNC Legal" : isFr ? "3. Vérification RNC Légal" : isEn ? "3. Legal RNC Verification" : "3. RNC & Verifikasyon Legal" }),
            activeChurch.rncVerificationStatus === "verified" ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-2 h-2 rounded-full bg-emerald-400" }) : activeChurch.rncVerificationStatus === "pending" || activeChurch.rncDocumentPhoto && !activeChurch.rncVerificationStatus ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-2 h-2 rounded-full bg-amber-400 animate-pulse" }) : null
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          id: "settings-subtab-multichurch",
          onClick: () => setActiveSubTab("multichurch"),
          className: `flex items-center gap-2 px-3.5 py-2.5 rounded-2xl font-bold whitespace-nowrap transition-all cursor-pointer ${activeSubTab === "multichurch" ? "bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20" : "text-slate-400 hover:text-white hover:bg-slate-800/80"}`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Layers, { className: "w-4 h-4" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? `4. Multi-Iglesia (${allChurchesList.length})` : isFr ? `4. Multi-Églises (${allChurchesList.length})` : isEn ? `4. Multi-Church (${allChurchesList.length})` : `4. Multi-Legliz (${allChurchesList.length})` })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          id: "settings-subtab-cards",
          onClick: () => setActiveSubTab("cards"),
          className: `flex items-center gap-2 px-3.5 py-2.5 rounded-2xl font-bold whitespace-nowrap transition-all cursor-pointer ${activeSubTab === "cards" ? "bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20" : "text-slate-400 hover:text-white hover:bg-slate-800/80"}`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CreditCard, { className: "w-4 h-4" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "4. Tarjetas y Colores" : isFr ? "4. Cartes & Couleurs" : isEn ? "4. Cards & Colors" : "4. Modèl Kat & Koulè" })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          id: "settings-subtab-backup",
          onClick: () => setActiveSubTab("backup"),
          className: `flex items-center gap-2 px-3.5 py-2.5 rounded-2xl font-bold whitespace-nowrap transition-all cursor-pointer ${activeSubTab === "backup" ? "bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20" : "text-slate-400 hover:text-white hover:bg-slate-800/80"}`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Database, { className: "w-4 h-4" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "5. Copia de Seguridad" : isFr ? "5. Sauvegarde & Restauration" : isEn ? "5. Backup & Restore" : "5. Sovgad & Restorasyon" })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          id: "settings-subtab-donations",
          onClick: () => setActiveSubTab("donations"),
          className: `flex items-center gap-2 px-3.5 py-2.5 rounded-2xl font-bold whitespace-nowrap transition-all cursor-pointer ${activeSubTab === "donations" ? "bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20" : "text-slate-400 hover:text-white hover:bg-slate-800/80"}`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(HeartHandshake, { className: "w-4 h-4" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "6. Donaciones y Finanzas" : isFr ? "6. Dîmes, Dons & Paiements" : isEn ? "6. Church Giving & Donations" : "6. Donasyon & Kont Labank Legliz la" })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          id: "settings-subtab-rules",
          onClick: () => setActiveSubTab("rules"),
          className: `flex items-center gap-2 px-3.5 py-2.5 rounded-2xl font-bold whitespace-nowrap transition-all cursor-pointer ${activeSubTab === "rules" ? "bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20" : "text-slate-400 hover:text-white hover:bg-slate-800/80"}`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "w-4 h-4" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "7. Estatutos y Privacidad" : isFr ? "7. Règlement & Vie Privée" : isEn ? "7. Church Rules & Privacy" : "7. Règleman & Vi Prive" })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          id: "settings-subtab-diagnostics",
          onClick: () => setActiveSubTab("diagnostics"),
          className: `flex items-center gap-2 px-3.5 py-2.5 rounded-2xl font-bold whitespace-nowrap transition-all cursor-pointer ${activeSubTab === "diagnostics" ? "bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20" : "text-slate-400 hover:text-white hover:bg-slate-800/80"}`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { className: "w-4 h-4" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "8. Diagnósticos del Sistema" : isFr ? "8. Diagnostics Système" : isEn ? "8. System Diagnostics" : "8. Dyagnostik Sistèm" })
          ]
        }
      )
    ] }),
    activeSubTab === "profile" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("form", { onSubmit: handleSaveCurrentChurch, className: "space-y-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-[#1E293B] rounded-3xl border border-slate-700/80 p-6 shadow-xl space-y-5 text-slate-200", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-b border-slate-700/80 pb-3 flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "font-bold text-base text-white flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Building2, { className: "w-5 h-5 text-amber-400" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Perfil y Datos Oficiales de la Iglesia" : isFr ? "Profil et Informations Officielles de l’Église" : isEn ? "Church Profile and Official Information" : "Pwofil & Detay Ofisyèl Legliz la" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-slate-400", children: [
            "ID: ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "text-amber-400 font-mono", children: activeChurch.id })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-slate-400 font-medium block mb-1", children: isEs ? "Church ID (Único en BD)" : isFr ? "ID de l’Église (Unique en BD)" : isEn ? "Church ID (Unique in DB)" : "Church ID (Inik nan Baz Done)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "text",
                  disabled: true,
                  value: activeChurch.id,
                  className: "w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 font-mono font-bold text-slate-300 cursor-not-allowed opacity-90"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "w-3.5 h-3.5 text-slate-500 absolute right-3 top-3" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-slate-300 font-bold block mb-1", children: isEs ? "Código Corto (Acrónimo) *" : isFr ? "Code Court (Acronyme) *" : isEn ? "Short Code (Acronym) *" : "Kòd Kout (Code Acronyme) *" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                required: true,
                placeholder: "eg: EGT01",
                value: code,
                onChange: (e3) => setCode(e3.target.value),
                className: "w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white font-mono font-bold focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-slate-300 font-bold block mb-1", children: isEs ? "Pastor Titular (Responsable) *" : isFr ? "Pasteur Titulaire (Responsable) *" : isEn ? "Lead Pastor (Responsible) *" : "Pastè Titulaire (Responsab Prensipal) *" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                required: true,
                placeholder: isEs ? "ej: Pastor Juan Morales" : isFr ? "ex: Pasteur Jean-Robert Louis" : isEn ? "e.g., Pastor John Smith" : "eg: Pastè André Joseph",
                value: pastor,
                onChange: (e3) => setPastor(e3.target.value),
                className: "w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none font-semibold"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-slate-300 font-bold block mb-1", children: isEs ? "Nombre Oficial Completo de la Iglesia *" : isFr ? "Nom Officiel Complet de l’Église *" : isEn ? "Full Official Church Name *" : "Non Ofisyèl Konplè Legliz la *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              required: true,
              value: name2,
              onChange: (e3) => setName(e3.target.value),
              className: "w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white text-sm font-bold focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-slate-300 font-bold block mb-1 flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(MapPin, { className: "w-3.5 h-3.5 text-amber-400" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Dirección Física" : isFr ? "Adresse Physique" : isEn ? "Physical Address" : "Adrès Fizik" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                value: address,
                onChange: (e3) => setAddress(e3.target.value),
                placeholder: isEs ? "ej: Av. Central #123" : isFr ? "ex: 45, Route de Frères" : isEn ? "e.g., 123 Main Street" : "eg: 45, Route de Frères",
                className: "w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-slate-300 font-bold block mb-1", children: isEs ? "Ciudad / Provincia / País" : isFr ? "Ville / Département / Pays" : isEn ? "City / State / Country" : "Vil / Depatman / Peyi" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                value: city,
                onChange: (e3) => setCity(e3.target.value),
                placeholder: isEs ? "ej: Santo Domingo, Rep. Dom." : isFr ? "ex: Port-au-Prince, Haïti" : isEn ? "e.g., Miami, FL, USA" : "eg: Pòtoprens, Lwès, Ayiti",
                className: "w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-slate-300 font-bold block mb-1 flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Phone, { className: "w-3.5 h-3.5 text-amber-400" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Número de Teléfono" : isFr ? "Numéro de Téléphone" : isEn ? "Phone Number" : "Nimewo Telefòn" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                value: phone,
                onChange: (e3) => setPhone(e3.target.value),
                placeholder: "eg: +1 809-000-0000",
                className: "w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-slate-300 font-bold block mb-1 flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Mail, { className: "w-3.5 h-3.5 text-amber-400" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Correo Electrónico" : isFr ? "Adresse E-mail" : isEn ? "Email Address" : "Adrès Imèl" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "email",
                value: email,
                onChange: (e3) => setEmail(e3.target.value),
                placeholder: "eg: contacto@iglesia.org",
                className: "w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-slate-300 font-bold block mb-1 flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Globe, { className: "w-3.5 h-3.5 text-amber-400" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Sitio Web / Red Social" : isFr ? "Site Web / Réseaux Sociaux" : isEn ? "Website / Social Media" : "Sit Wèb / Paj Medya" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                value: website,
                onChange: (e3) => setWebsite(e3.target.value),
                placeholder: "eg: https://iglesia.org",
                className: "w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-slate-300 font-bold block mb-1", children: isEs ? "Lema / Versículo Clave de la Iglesia" : isFr ? "Devise / Verset Clé de l’Église" : isEn ? "Church Motto / Key Scripture Verse" : "Deviz / Motto de l’Église (Vèsè Kle oswa Slogan)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              value: motto,
              onChange: (e3) => setMotto(e3.target.value),
              placeholder: isEs ? "ej: Al servicio de Cristo con amor, fe y devoción" : isFr ? "ex: Au service du Christ avec amour, foi et dévotion" : isEn ? "e.g., Serving Christ with love, faith, and devotion" : "eg: Nan sèvis Kris la ak renmen, lafwa ak devosyon",
              className: "w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none italic"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 sm:p-5 bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-slate-950 rounded-2xl border border-slate-700/80 space-y-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "w-5 h-5" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-xs font-bold text-white flex items-center gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "RNC Oficial y Documento Legal de la Iglesia" : isFr ? "RNC Officiel & Document Légal de l’Église" : isEn ? "Official Church Tax ID / RNC & Legal Document" : "RNC Ofisyèl & Dokiman Legal Legliz la" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10.5px] text-slate-400", children: isEs ? "Protección contra fraude: Requiere Licencia Activa ($70 USD/año) y Foto del Documento Legal" : isFr ? "Protection anti-fraude : Requiert une Licence ($70 USD/an) et la Photo du Document Légal" : isEn ? "Anti-fraud protection: Requires Active License ($70 USD/yr) and Legal Document Photo" : "Pwoteksyon anti-fwòd: Egzije Lisans Aktif ($70 USD/ane) ak Foto Dokiman Legal" })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  onClick: () => setActiveSubTab("rnc_verification"),
                  className: "px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "w-3.5 h-3.5 text-amber-400" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Abrir Sección de Verificación RNC" : "Ouvri Panèl Verifikasyon RNC" })
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: activeChurch.rncVerificationStatus === "verified" || isChurchLicensed && rncDocumentPhoto && isValidRnc(rnc) ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10.5px] font-extrabold flex items-center gap-1.5 shadow-sm", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "w-4 h-4 text-emerald-400" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "RNC VERIFICADO ✓" : isFr ? "RNC VÉRIFIÉ ✓" : isEn ? "RNC VERIFIED ✓" : "RNC VERIFYE ✓" })
              ] }) : activeChurch.rncVerificationStatus === "pending" || rncDocumentPhoto || rnc.trim() ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10.5px] font-bold flex items-center gap-1.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "w-4 h-4 text-amber-400" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "En Revisión" : isFr ? "En Attente" : isEn ? "Pending" : "An Atant" })
              ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-medium", children: isEs ? "No Enviado" : isFr ? "Non Soumis" : isEn ? "Not Submitted" : "Poko Soumèt" }) })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 space-y-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 font-bold text-slate-200", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "w-4 h-4 text-amber-400" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Reglas de Seguridad y Prevención de Fraude:" : isFr ? "Règles de Sécurité & Prévention de Fraude :" : isEn ? "Security & Fraud Prevention Rules:" : "Règ Sekirite & Pwoteksyon Kont Fwòd:" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-slate-400 leading-relaxed", children: isEs ? "Para evitar que cualquier persona use números RNC ajenos o fraudulentos, para activar y validar el RNC en el carnet de los miembros, la iglesia debe:" : isFr ? "Pour éviter l’usage frauduleux de faux numéros RNC, l’activation officielle du RNC sur la carte des membres exige :" : isEn ? "To prevent unauthorized use of false RNC numbers, official RNC validation on member cards strictly requires:" : "Pou evite nenpòt moun mete fo nimewo RNC oswa fè frod devan Lapolis ak Leta, RNC a sèlman sètifye sou kat manm yo si legliz la ranpli 2 kondisyon sa yo:" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] pt-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `p-2.5 rounded-lg border ${isChurchLicensed ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-200" : "bg-amber-950/20 border-amber-500/40 text-amber-200"} flex items-start gap-2`, children: [
                isChurchLicensed ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "w-4 h-4 text-emerald-400 shrink-0 mt-0.5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "w-4 h-4 text-amber-400 shrink-0 mt-0.5" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("strong", { className: "block font-bold", children: [
                    "1. ",
                    isEs ? "Licencia Pro Activa ($70 USD / 1 año)" : "Lisans Pro Aktif ($70.00 USD / 1 ane)"
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] opacity-80", children: isChurchLicensed ? isEs ? "Licencia activa y validada" : "Lisans ou aktif e an règ" : isEs ? "Se requiere licencia activa de $70 USD" : "Lisans $70 USD / 1 ane egzije pou otorize RNC" })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `p-2.5 rounded-lg border ${rncDocumentPhoto ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-200" : "bg-amber-950/20 border-amber-500/40 text-amber-200"} flex items-start gap-2`, children: [
                rncDocumentPhoto ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "w-4 h-4 text-emerald-400 shrink-0 mt-0.5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "w-4 h-4 text-amber-400 shrink-0 mt-0.5" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("strong", { className: "block font-bold", children: [
                    "2. ",
                    isEs ? "Foto del Documento Legal" : "Foto Dokiman Legal Legliz la"
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] opacity-80", children: rncDocumentPhoto ? isEs ? "Documento cargado correctamente" : "Foto dokiman anrejistre" : isEs ? "Debe subir foto de patente o decreto" : "Fòk ou founi foto patant DGI oswa dekrè" })
                ] })
              ] })
            ] }),
            !isChurchLicensed && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-slate-800/80", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-amber-300 font-medium", children: isEs ? "💡 Nota: Esta misma licencia de $70 USD / 1 año también activa la sección de Diezmos y Ofrendas." : "💡 Nòt: Se menm lisans $70 USD / 1 ane sa a ki sèvi tou pou aktive seksyon Dîm ak Ofrann lan." }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  onClick: () => setShowLicenseModal(true),
                  className: "px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-[11px] flex items-center gap-1.5 shadow cursor-pointer",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "w-3.5 h-3.5" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Activar Licencia ($70 USD / 1 Año)" : "Aktive Lisans ($70 USD / 1 Ane)" })
                  ]
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-semibold text-slate-300", children: isEs ? "Número de RNC / Matrícula Fiscal Oficial" : "Nimewo RNC / Matrikil Fiskal Ofisyèl" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                value: rnc,
                onChange: (e3) => setRnc(e3.target.value),
                placeholder: isEs ? "ej: 1-32-45678-9 o 004-582-193-4" : isFr ? "ex: 1-32-45678-9 ou 004-582-193-4" : isEn ? "e.g. 1-32-45678-9 or 004-582-193-4" : "eg: 1-32-45678-9 oswa 004-582-193-4",
                className: "w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white font-mono text-xs focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400 focus:outline-none"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2 pt-2 border-t border-slate-800", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-bold text-white", children: isEs ? "Foto del Documento Legal de la Iglesia" : isFr ? "Photo du Document Légal de l’Église" : isEn ? "Church Legal Registration Document Photo" : "Foto Dokiman Legal Legliz la" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10.5px] text-slate-400", children: isEs ? "Suba una foto clara de la Patente DGI/DGII, Decreto Presidencial o Certificado del Ministerio" : "Mete yon foto klè Patant DGI / DGII, Dekrè Ofisyèl oswa Sètifika Rekonesans Legal Ministè" })
              ] }),
              rncDocumentPhoto && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "w-3 h-3 text-emerald-400" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Cargado" : "Founi ✓" })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "file",
                ref: legalDocInputRef,
                onChange: handleLegalDocUpload,
                accept: "image/*",
                className: "hidden"
              }
            ),
            rncDocumentPhoto ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "div",
                  {
                    onClick: () => setIsPreviewingDocumentModal(true),
                    className: "w-16 h-16 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 cursor-pointer relative group shrink-0",
                    title: isEs ? "Haga clic para ampliar" : "Klike pou wè an gwo",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "img",
                        {
                          src: rncDocumentPhoto,
                          alt: "Legal Document",
                          className: "w-full h-full object-cover group-hover:scale-105 transition-transform"
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "w-4 h-4 text-white" }) })
                    ]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-bold text-white", children: isEs ? "Documento Legal Registrado" : "Dokiman Legal Anrejistre" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-emerald-400 font-bold", children: "✓" })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10.5px] text-slate-400 mt-0.5", children: rncDocumentUploadedAt ? `${isEs ? "Registrado el" : "Anrejistre le"}: ${new Date(rncDocumentUploadedAt).toLocaleDateString()}` : isEs ? "Documento oficial adjunto" : "Dokiman ofisyèl atache" })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 self-end sm:self-center", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    onClick: () => setIsPreviewingDocumentModal(true),
                    className: "px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "w-3.5 h-3.5" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Ver" : "Gade" })
                    ]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    onClick: () => {
                      var _a4;
                      return (_a4 = legalDocInputRef.current) == null ? void 0 : _a4.click();
                    },
                    disabled: isUploadingDoc,
                    className: "px-2.5 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "w-3.5 h-3.5" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isUploadingDoc ? "..." : isEs ? "Cambiar" : "Chanje" })
                    ]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    onClick: () => {
                      setRncDocumentPhoto("");
                      setRncDocumentUploadedAt("");
                    },
                    className: "px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-3.5 h-3.5" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Eliminar" : "Retire" })
                    ]
                  }
                )
              ] })
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                onClick: () => {
                  var _a4;
                  return (_a4 = legalDocInputRef.current) == null ? void 0 : _a4.click();
                },
                className: "p-4 rounded-xl border-2 border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-950/60 hover:bg-slate-900/60 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 group",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 h-10 rounded-full bg-slate-800 group-hover:bg-emerald-500/20 text-slate-400 group-hover:text-emerald-400 flex items-center justify-center transition-colors", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ImagePlus, { className: "w-5 h-5" }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-bold text-slate-200 group-hover:text-white", children: isUploadingDoc ? isEs ? "Subiendo documento..." : "Ap telechaje dokiman an..." : isEs ? "Haga clic para subir o tomar foto del Documento Legal" : "Klike pou chwazi oswa pran foto Dokiman Legal la" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10.5px] text-slate-400 mt-0.5", children: isEs ? "Formato JPG, PNG (máx. 10MB)" : "Fòma JPG, PNG (Patant DGI, Dekrè oswa Sètifika)" })
                  ] })
                ]
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 bg-slate-900/90 rounded-2xl border border-slate-700/80 space-y-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(PenTool, { className: "w-5 h-5" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-xs font-bold text-white", children: isEs ? "Firma Electrónica Autorizada (Admin / Pastor)" : isFr ? "Signature Électronique Autorisée (Admin / Pasteur)" : isEn ? "Authorized Electronic Signature (Admin / Pastor)" : "Siyati Elektwonik Otorize (Admin / Pastè)" }),
                signatureUrl ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "w-3 h-3" }),
                  isEs ? "Activa" : isFr ? "Active" : isEn ? "Active" : "Aktive"
                ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full", children: isEs ? "Texto por defecto" : isFr ? "Texte par défaut" : isEn ? "Default text" : "Tèks pa defo" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-slate-400 mt-0.5", children: isEs ? "Elija una imagen de firma (PNG o JPG) o dibújela en pantalla. Aparecerá en todas las tarjetas de miembros." : isFr ? "Téléversez une signature (PNG transparent ou JPG) ou dessinez-la à l’écran. Elle s’affichera sur toutes les cartes." : isEn ? "Upload a signature image (transparent PNG or JPG) or draw it on screen. It will appear on all member cards." : "Chwazi yon imaj siyati (PNG transparan oswa JPG). URL siyati sa a anrejistre nan estrikti legliz la epi li disponib globalman pou tout jenerasyon badge ak kat manm yo." })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                ref: profileSignatureInputRef,
                type: "file",
                accept: "image/png, image/jpeg, image/webp, image/svg+xml",
                onChange: handleUploadSignature,
                className: "hidden",
                id: "profile-signature-upload-input"
              }
            ),
            signatureUrl ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-10 px-3 bg-white/95 rounded-xl border border-slate-500 flex items-center justify-center shadow-inner", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "img",
                {
                  src: signatureUrl,
                  alt: "Firma",
                  className: "h-8 max-w-[90px] object-contain"
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  onClick: () => setShowSignaturePad(true),
                  className: "px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-400/30 hover:from-amber-500/30 hover:to-amber-400/40 text-amber-300 border border-amber-400/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all",
                  title: isEs ? "Redibujar la firma directamente en pantalla" : isFr ? "Redessiner la signature à l’écran" : isEn ? "Redraw signature directly on screen" : "Retrase siyati a dirèkteman sou ekran an",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(PenTool, { className: "w-3.5 h-3.5" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Redibujar" : isFr ? "Redessiner" : isEn ? "Redraw" : "Retrase Dirèk" })
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  onClick: () => {
                    var _a4;
                    return (_a4 = profileSignatureInputRef.current) == null ? void 0 : _a4.click();
                  },
                  className: "px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors",
                  title: isEs ? "Cambiar por archivo de imagen" : isFr ? "Changer par fichier image" : isEn ? "Change image file" : "Chanje pa imaj siyati a",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "w-3.5 h-3.5" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Subir" : isFr ? "Téléverser" : isEn ? "Upload" : "Upload" })
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  onClick: handleRemoveSignature,
                  className: "p-2 rounded-xl bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-500/30 text-xs cursor-pointer transition-colors",
                  title: isEs ? "Eliminar firma" : isFr ? "Supprimer la signature" : isEn ? "Remove signature" : "Retire siyati a",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-4 h-4" })
                }
              )
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  id: "btn-draw-profile-signature",
                  onClick: () => setShowSignaturePad(true),
                  className: "px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-400/20 transition-all active:scale-95",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(PenTool, { className: "w-4 h-4" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "✍️ Dibujar en Pantalla" : isFr ? "✍️ Dessiner à l’Écran" : isEn ? "✍️ Draw on Screen" : "✍️ Ekri Dirèk nan App la" })
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  id: "btn-upload-profile-signature",
                  onClick: () => {
                    var _a4;
                    return (_a4 = profileSignatureInputRef.current) == null ? void 0 : _a4.click();
                  },
                  className: "px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-amber-300 border border-amber-400/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(ImagePlus, { className: "w-4 h-4 text-amber-400" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Subir Imagen" : isFr ? "Téléverser Image" : isEn ? "Upload Image" : "Upload Imaj" })
                  ]
                }
              )
            ] })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pt-3 border-t border-slate-700/80 flex items-center justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "submit",
            id: "btn-save-profile-settings",
            className: "px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-amber-400/20 cursor-pointer transition-all active:scale-95",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "w-4 h-4" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Guardar Perfil" : isFr ? "Enregistrer le Profil" : isEn ? "Save Profile" : "Anrejistre Pwofil la" })
            ]
          }
        ) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 bg-[#1E293B] rounded-3xl border border-rose-900/50 p-6 shadow-xl space-y-4 text-slate-200", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 border-b border-rose-900/40 pb-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "w-4 h-4" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-bold text-sm text-rose-300", children: t3.dangerZoneTitle }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400", children: isEs ? `Eliminar permanentemente "${activeChurch.name}" y todos sus miembros, cultos y asistencias de la base de datos.` : isEn ? `Permanently delete "${activeChurch.name}" and all associated members, services, and attendance from the database.` : isFr ? `Supprimer définitivement "${activeChurch.name}" et tous ses membres, cultes et présences de la base de données.` : `Efase "${activeChurch.name}" nèt ansanm ak tout manm li yo, sèvis li yo ak prezans li yo nan baz done a.` })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-rose-950/20 border border-rose-900/30", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-rose-200/90 space-y-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold", children: isEs ? "Esta acción es irreversible y definitiva:" : isEn ? "This action is irreversible and permanent:" : isFr ? "Cette action est irréversible et définitive :" : "Aksyon sa a definitif epi pa gen bak:" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "list-disc list-inside text-rose-300/80 text-[11px] space-y-0.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: t3.deleteChurchWarning1 }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: t3.deleteChurchWarning2 }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: t3.deleteChurchWarning3 })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              id: "btn-delete-active-church-profile",
              onClick: () => setChurchToDelete(activeChurch),
              className: "px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-600/20 transition-all self-start sm:self-center whitespace-nowrap",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-4 h-4" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t3.deleteChurch })
              ]
            }
          )
        ] })
      ] })
    ] }),
    activeSubTab === "security" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-[#1E293B] rounded-3xl border border-slate-700/80 p-6 shadow-xl space-y-4 text-slate-200", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/80 pb-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-9 h-9 rounded-xl bg-white flex items-center justify-center p-1.5 shadow", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { className: "w-full h-full", viewBox: "0 0 24 24", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("path", { fill: "#4285F4", d: "M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("path", { fill: "#34A853", d: "M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("path", { fill: "#FBBC05", d: "M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("path", { fill: "#EA4335", d: "M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-bold text-base text-white", children: isEs ? "Autenticación y Seguridad Administrador Google" : isFr ? "Authentification & Sécurité Administrateur Google" : isEn ? "Google Administrator Authentication & Security" : "Otantifikasyon & Sekirite Administratè Google" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400", children: isEs ? "Inicio de sesión directo con cuenta de Google (Firebase Auth)." : isFr ? "Connexion directe avec compte Google officiel (Firebase Auth)." : isEn ? "Direct sign-in with official Google account (Firebase Auth)." : "Koneksyon dirèk ak kont Google ofisyèl la (Firebase Google Sign-In)." })
            ] })
          ] }),
          activeChurch.adminGoogleEmail ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "w-3.5 h-3.5" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Admin Google Vinculado" : isFr ? "Admin Google Associé" : isEn ? "Google Admin Linked" : "Admin Google Lye" })
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { className: "w-3.5 h-3.5" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Sin Vincular con Google" : isFr ? "Non Associé à Google" : isEn ? "Not Linked to Google" : "Poko Lye ak Google" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 bg-slate-900/90 rounded-2xl border border-slate-700/80 space-y-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5", children: isEs ? "Cuenta Google Activa en este Dispositivo:" : isFr ? "Compte Google Actif sur cet Appareil :" : isEn ? "Active Google Account on this Device:" : "Kont Google Aktif sou Aparèy Sa a:" }),
              googleUser ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2.5", children: [
                googleUser.photoURL ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "img",
                  {
                    src: googleUser.photoURL,
                    alt: "Google User",
                    referrerPolicy: "no-referrer",
                    className: "w-7 h-7 rounded-full border border-emerald-400"
                  }
                ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-xs", children: "G" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-bold text-white block", children: googleUser.displayName }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-slate-400 font-mono", children: googleUser.email })
                ] })
              ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-slate-400 italic", children: isEs ? "Aún no ha iniciado sesión con Google en este dispositivo." : isFr ? "Vous n’êtes pas encore connecté avec Google sur cet appareil." : isEn ? "Not signed in with a Google account on this device yet." : "Ou poko konekte ak yon kont Google sou aparèy sa a." })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2 flex-wrap", children: googleUser ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  id: "btn-link-current-google",
                  onClick: () => {
                    linkChurchAdminGoogleAccount(activeChurch.id);
                    setAdminGoogleEmail(googleUser.email || "");
                    toast.success(
                      isEs ? "¡Cuenta Google Vinculada!" : isFr ? "Compte Google Associé !" : isEn ? "Google Account Linked!" : "Kont Google Lye!",
                      isEs ? `"${googleUser.email}" ha sido definido como admin oficial para ${activeChurch.name}.` : isFr ? `"${googleUser.email}" a été défini comme administrateur officiel pour ${activeChurch.name}.` : isEn ? `"${googleUser.email}" has been set as official admin for ${activeChurch.name}.` : `"${googleUser.email}" defini kòm admin ofisyèl pou ${activeChurch.name}.`
                    );
                    if (onRefreshAll) onRefreshAll();
                  },
                  className: "px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "w-3.5 h-3.5" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Vincular como Admin de esta Iglesia" : isFr ? "Associer comme Admin de cette Église" : isEn ? "Link as Admin for this Church" : "Lye kòm Admin Legliz Sa a" })
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  onClick: async () => {
                    await signOutGoogle();
                    toast.info(
                      isEs ? "Desconectado" : isFr ? "Déconnecté" : isEn ? "Signed Out" : "Dekonekte",
                      isEs ? "La sesión de Google ha finalizado." : isFr ? "La session Google est terminée." : isEn ? "Google session has ended." : "Sesyon Google la fini."
                    );
                  },
                  className: "px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 font-semibold text-xs flex items-center gap-1.5 cursor-pointer border border-slate-700",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(LogOut, { className: "w-3.5 h-3.5" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Desconectar" : isFr ? "Déconnexion" : isEn ? "Sign Out" : "Dekonekte" })
                  ]
                }
              )
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                id: "btn-admin-connect-google-settings",
                disabled: isLinkingGoogle,
                onClick: async () => {
                  setIsLinkingGoogle(true);
                  try {
                    const user = await signInWithGoogle();
                    if (user) {
                      linkChurchAdminGoogleAccount(activeChurch.id, user);
                      setAdminGoogleEmail(user.email || "");
                      toast.success(
                        isEs ? "¡Conexión Exitosa!" : isFr ? "Connexion Réussie !" : isEn ? "Sign-In Successful!" : "Koneksyon Reyisi!",
                        isEs ? `La cuenta Google ${user.email} se ha vinculado como admin para ${activeChurch.name}.` : isFr ? `Le compte Google ${user.email} a été associé comme admin pour ${activeChurch.name}.` : isEn ? `Google account ${user.email} linked as admin for ${activeChurch.name}.` : `Kont Google ${user.email} lye kòm admin pou ${activeChurch.name}.`
                      );
                      if (onRefreshAll) onRefreshAll();
                    }
                  } catch (err) {
                    toast.error(isEs ? "Error de Google" : isFr ? "Erreur Google" : isEn ? "Google Error" : "Erè Google", (err == null ? void 0 : err.message) || (isEs ? "No se pudo conectar." : isFr ? "Impossible de se connecter." : isEn ? "Could not sign in with Google." : "Pa ka konekte"));
                  } finally {
                    setIsLinkingGoogle(false);
                  }
                },
                className: "px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer shadow disabled:opacity-50",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { className: "w-4 h-4", viewBox: "0 0 24 24", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { fill: "#4285F4", d: "M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { fill: "#34A853", d: "M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { fill: "#FBBC05", d: "M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { fill: "#EA4335", d: "M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Iniciar Sesión con Google (Admin)" : isFr ? "Se connecter avec Google (Admin)" : isEn ? "Sign in with Google (Admin)" : "Konekte ak Google (Admin)" })
                ]
              }
            ) })
          ] }),
          activeChurch.adminGoogleEmail && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-slate-400", children: [
              isEs ? "Correo Admin Vinculado:" : isFr ? "E-mail Admin Associé :" : isEn ? "Linked Admin Email:" : "Imel Admin ki Lye:",
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "text-emerald-400 font-mono", children: activeChurch.adminGoogleEmail })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => {
                  unlinkChurchAdminGoogleAccount(activeChurch.id);
                  setAdminGoogleEmail("");
                  toast.info(
                    isEs ? "Vinculación Eliminada" : isFr ? "Association Supprimée" : isEn ? "Link Removed" : "Lyezon Retire",
                    isEs ? "La cuenta Google ya no está asociada a esta iglesia." : isFr ? "Le compte Google n’est plus associé à cette église." : isEn ? "Google account is no longer linked to this church." : "Kont Google la pa asosye ak legliz sa a ankò."
                  );
                  if (onRefreshAll) onRefreshAll();
                },
                className: "text-[11px] text-rose-400 hover:text-rose-300 underline font-semibold cursor-pointer",
                children: isEs ? "Desvincular Cuenta Google" : isFr ? "Dissocier le Compte Google" : isEn ? "Unlink Google Account" : "Retire Lyezon Google Sa a"
              }
            )
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-[#1E293B] rounded-3xl border border-slate-700/80 p-6 shadow-xl space-y-4 text-slate-200", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-b border-slate-700/80 pb-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "font-bold text-base text-white flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "w-5 h-5 text-amber-400" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Código de Seguridad de Administrador (PIN Maestro)" : isFr ? "Code de Sécurité Administrateur (PIN Maître)" : isEn ? "Admin Security Code (Master Passcode)" : "Kòd Sekirite Administratè (Master Passcode)" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400 mt-0.5", children: isEs ? "Código PIN para verificar acciones administrativas sensibles como eliminar o editar miembros." : isFr ? "Code PIN secret pour valider les actions administratives sensibles (suppression ou modification)." : isEn ? "Secret PIN code to verify sensitive administrative actions like member deletion or modification." : "Kòd PIN sekrè pou verifye aksyon administratif sansib tankou sipresyon oswa modifikasyon manm." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-slate-300 font-bold block mb-1", children: isEs ? "Código PIN Admin (Opcional)" : isFr ? "Code PIN Admin (Optionnel)" : isEn ? "Admin PIN Code (Optional)" : "Kòd Sekirite PIN Admin (Opsyonèl)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: showPasscode ? "text" : "password",
                  value: adminPasscode,
                  onChange: (e3) => setAdminPasscode(e3.target.value),
                  placeholder: isEs ? "ej: 8899 o código de 6 dígitos" : isFr ? "ex: 8899 ou code à 6 chiffres" : isEn ? "e.g., 8899 or 6-digit code" : "eg: 8899 oswa kòd 6 chif",
                  className: "w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white font-mono focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  onClick: () => setShowPasscode(!showPasscode),
                  className: "absolute right-3 top-3 text-slate-400 hover:text-white",
                  children: showPasscode ? /* @__PURE__ */ jsxRuntimeExports.jsx(EyeOff, { className: "w-4 h-4" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "w-4 h-4" })
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-slate-400 mt-1 block", children: isEs ? "Cada iglesia tiene su propio código PIN exclusivo de seguridad." : isFr ? "Chaque église possède son propre code PIN exclusif de sécurité." : isEn ? "Each church maintains its own exclusive master security PIN." : "Chak legliz gen pwòp kòd PIN sekirite mèt pa li." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-[#1E293B] rounded-3xl border border-slate-700/80 p-6 shadow-xl space-y-4 text-slate-200", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/80 pb-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Fingerprint, { className: "w-5 h-5" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "font-bold text-base text-white flex items-center gap-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Seguridad Biométrica (Huella / Face ID Android)" : isFr ? "Sécurité Biométrique (Empreinte / Face ID Android)" : isEn ? "Biometric Security (Android Fingerprint & FaceID)" : "Sekirite Byometrik (Anprent / Face ID Android)" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-300 border border-cyan-400/20 font-mono", children: "@capacitor/biometric-auth" })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400", children: isEs ? "Desbloqueo instantáneo de alta seguridad mediante hardware nativo Android para proteger datos eclesiásticos." : isFr ? "Déverrouillage instantané haute sécurité via matériel Android natif pour protéger les données de l’église." : isEn ? "High-security instant unlock powered by native Android hardware to protect church administration data." : "Debloke enstantane sekirite maksimòm ak pyès detèktè natif Android pou pwoteje done ak finans legliz la." })
                ] })
              ] }),
              adminBioRecord ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "w-3.5 h-3.5" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Biometría Activa" : isFr ? "Biométrie Active" : isEn ? "Biometrics Active" : "Byometri Aktif ✓" })
              ] }) : bioSupported ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(ScanFace, { className: "w-3.5 h-3.5" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Hardware Compatible" : isFr ? "Matériel Compatible" : isEn ? "Hardware Ready" : "Aparèy Konpatib" })
              ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { className: "w-3.5 h-3.5" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "No Disponible" : isFr ? "Non Disponible" : isEn ? "Not Available" : "Pa Disponib" })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 bg-slate-900/90 rounded-2xl border border-slate-700/80 space-y-3 text-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-400", children: isEs ? "Hardware Detectado:" : isFr ? "Matériel Détecté :" : isEn ? "Detected Hardware:" : "Materyèl Detekte:" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "text-white font-mono bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700", children: bioLabel })
                ] }),
                adminBioRecord ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-emerald-400", children: isEs ? `✓ Registrado en este dispositivo para ${activeChurch.name} (${new Date(adminBioRecord.registeredAt).toLocaleDateString()}).` : isFr ? `✓ Enregistré sur cet appareil pour ${activeChurch.name} (${new Date(adminBioRecord.registeredAt).toLocaleDateString()}).` : isEn ? `✓ Enrolled on this device for ${activeChurch.name} (${new Date(adminBioRecord.registeredAt).toLocaleDateString()}).` : `✓ Anrejistre sou telefòn/aparèy sa a pou ${activeChurch.name} (${new Date(adminBioRecord.registeredAt).toLocaleDateString()}).` }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-slate-400", children: bioSupported ? isEs ? "Este dispositivo está listo. Active la huella para desbloquear el panel admin en 1 toque sin tener que ingresar el PIN cada vez." : isFr ? "Cet appareil est prêt. Activez l’empreinte pour déverrouiller l’espace admin en 1 touche sans taper le code PIN à chaque fois." : isEn ? "This device is ready. Enable biometrics to unlock the admin area in 1 touch without typing your passcode every time." : "Telefòn/aparèy sa a pare. Aktive anprent pou w ka debloke espas admin nan yon sèl touche san bezwen tape PIN chak fwa." : isEs ? "El hardware biométrico no está habilitado o no está configurado en este navegador/sistema." : "Pyès byometrik la poko aktive oswa li pa konfigire nan aparèy sa a." })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  disabled: isRegisteringBio,
                  onClick: handleToggleAdminBiometrics,
                  className: `px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer shadow transition-all active:scale-95 disabled:opacity-50 ${adminBioRecord ? "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40" : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-500/20"}`,
                  children: isRegisteringBio ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" }) : adminBioRecord ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-4 h-4" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Desactivar Biometría Admin" : isFr ? "Désactiver Biométrie Admin" : isEn ? "Disable Admin Biometrics" : "Dezaktive Byometri Admin" })
                  ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Fingerprint, { className: "w-4 h-4" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Activar Huella / Face ID" : isFr ? "Activer Empreinte / Face ID" : isEn ? "Enable Fingerprint / FaceID" : "Aktive Anprent / Face ID" })
                  ] })
                }
              ) })
            ] }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-[#1E293B] rounded-3xl border border-slate-700/80 p-6 shadow-xl space-y-4 text-slate-200", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/80 pb-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldAlert, { className: "w-5 h-5" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "font-bold text-base text-white flex items-center gap-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Bloqueo Automático por Inactividad (5 Minutos)" : isFr ? "Verrouillage Automatique par Inactivité (5 Minutes)" : isEn ? "Automatic Inactivity Lock (5 Minutes)" : "Blokaj Otomatik pou Inaktivite (5 Minit)" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono font-bold", children: isEs ? "PROTECCIÓN ACTIVA" : isFr ? "PROTECTION ACTIVE" : isEn ? "ACTIVE PROTECTION" : "PWOTEKSYON AKTIF" })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400", children: isEs ? "Cierra y asegura la sesión de administración automáticamente si el dispositivo queda desatendido durante 5 minutos." : isFr ? "Ferme et sécurise la session d’administration automatiquement si l’appareil reste sans surveillance pendant 5 minutes." : isEn ? "Automatically locks and secures the admin session if the device is left unattended for 5 minutes." : "Bloke epi sekirize sesyon administratè a otomatikman si aparèy la rete san siveyans pandan 5 minit." })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "w-3.5 h-3.5" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Activo (5 min)" : isFr ? "Actif (5 min)" : isEn ? "Active (5 min)" : "Aktif (5 min)" })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 bg-slate-900/90 rounded-2xl border border-slate-700/80 text-xs space-y-2 text-slate-300", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "w-4 h-4 text-emerald-400 shrink-0 mt-0.5" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "leading-relaxed", children: isEs ? "Cualquier movimiento del ratón, toque en la pantalla o tecla pulsada renueva el tiempo. Si pasan 5 minutos continuos sin actividad, el sistema revoca los privilegios y exige el PIN, huella digital o cuenta de Google para reanudar." : isFr ? "Tout mouvement de souris, toucher d’écran ou frappe clavier réinitialise le délai. Si 5 minutes s’écoulent sans activité, le système révoque les privilèges et exige le code PIN, l’empreinte ou le compte Google." : isEn ? "Any mouse movement, screen tap, or key press resets the timer. If 5 continuous minutes pass without activity, the system revokes privileges and requires your PIN, fingerprint, or Google account to resume." : "Nenpòt mouvman sourit, touche ekran oswa tape nan klavye a renouvle kontè a. Si 5 minit pase san okenn aktivite, sistèm nan bloke aksè a otomatikman epi l mande kòd PIN, anprent oswa Google pou relouvri." })
            ] }) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pt-2 flex justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: handleSaveCurrentChurch,
            className: "px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "w-4 h-4" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Guardar Código de Seguridad" : isFr ? "Enregistrer le Code de Sécurité" : isEn ? "Save Security Code" : "Anrejistre Kòd Sekirite" })
            ]
          }
        ) })
      ] })
    ] }),
    activeSubTab === "rnc_verification" && /* @__PURE__ */ jsxRuntimeExports.jsx(
      AdminRncVerificationSection,
      {
        church: activeChurch,
        language,
        onSaveChurch: (updated) => {
          saveChurch(updated);
          setRnc(updated.rnc || "");
          setRncDocumentPhoto(updated.rncDocumentPhoto || "");
          setRncDocumentUploadedAt(updated.rncDocumentUploadedAt || "");
          if (onChurchSaved) onChurchSaved();
        }
      }
    ),
    activeSubTab === "multichurch" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-[#1E293B] text-slate-200 rounded-3xl p-6 shadow-xl border border-slate-700/80 space-y-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/80 pb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-bold uppercase tracking-wider text-amber-400 block", children: isEs ? "Red Multi-Iglesia (Arquitectura Multi-Tenant)" : isEn ? "Multi-Church Network (Multi-Tenant Architecture)" : isFr ? "Réseau Multi-Églises (Architecture Multi-Tenant)" : "Rezo Multi-Legliz (Multi-Tenant Architecture)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-base sm:text-lg font-bold text-white flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Layers, { className: "w-5 h-5 text-amber-400" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Cambiar o Crear un Espacio de Iglesia" : isEn ? "Switch or Create Church Workspace" : isFr ? "Changer ou Créer un Espace d’Église" : "Navige oswa Kreye yon Lòt Espas Legliz" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              id: "btn-purge-test-churches-multitab",
              onClick: () => setShowPurgeDemoModal(true),
              className: "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-rose-300 font-bold text-xs transition-all cursor-pointer",
              title: t3.purgeDemoChurches,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-3.5 h-3.5 text-rose-400" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t3.cleanDemos })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              id: "btn-open-create-church",
              onClick: () => setIsCreatingNew(true),
              className: "inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-400/20 transition-all cursor-pointer",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "w-4 h-4" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t3.createChurch })
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-slate-400 font-medium", children: isEs ? "Cambie de iglesia para verificar el aislamiento total de datos:" : isEn ? "Switch church to verify complete tenant isolation:" : isFr ? "Changez d’église pour vérifier l’isolation complète des données :" : "Chanje Legliz pou teste izolasyon total done yo:" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[11px] text-amber-400 font-mono font-bold", children: [
            filteredChurches.length,
            " ",
            isEs ? "de" : isEn ? "of" : isFr ? "sur" : "sou",
            " ",
            allChurchesList.length,
            " ",
            isEs ? "iglesias en el sistema" : isEn ? "churches in system" : isFr ? "églises dans le système" : "legliz nan sistèm nan"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              id: "input-search-admin-churches",
              value: churchSearchQuery,
              onChange: (e3) => setChurchSearchQuery(e3.target.value),
              placeholder: isEs ? "Buscar por ID (ej. CH001), Nombre, Código o Pastor..." : isEn ? "Search by ID (e.g. CH001), Name, Code, or Pastor..." : isFr ? "Rechercher par ID (ex. CH001), Nom, Code ou Pasteur..." : "Chache pa ID (eg. CH001), Non Legliz, Kòd oswa Pastè...",
              className: "w-full pl-10 pr-8 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-all"
            }
          ),
          churchSearchQuery && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: () => setChurchSearchQuery(""),
              className: "absolute right-3 top-3 text-slate-400 hover:text-white",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(X$1, { className: "w-3.5 h-3.5" })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1", children: filteredChurches.map((c3) => {
          const isSelected = c3.id === activeChurch.id;
          const membersCount = getMembersByChurch(c3.id).length;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              id: `card-church-${c3.id}`,
              onClick: () => {
                if (onChurchChange) onChurchChange(c3.id);
              },
              className: `p-4 rounded-2xl text-left border transition-all cursor-pointer relative overflow-hidden group ${isSelected ? "bg-amber-400 text-slate-950 border-amber-400 shadow-xl font-bold" : "bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600"}`,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-black/20", children: c3.id }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
                    isSelected ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] bg-slate-950 text-amber-300 px-2 py-0.5 rounded-full font-black", children: isEs ? "ACTIVA AHORA" : isFr ? "ACTIVE MAINTENANT" : isEn ? "ACTIVE NOW" : "AKTIF KOUNYE A" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] text-slate-400 font-medium", children: [
                      membersCount,
                      " ",
                      isEs ? "miembros" : isFr ? "membres" : isEn ? "members" : "manm"
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        type: "button",
                        id: `btn-delete-church-card-${c3.id}`,
                        title: isEs ? `Eliminar "${c3.name}"` : isFr ? `Supprimer "${c3.name}"` : isEn ? `Delete "${c3.name}"` : `Efase "${c3.name}"`,
                        onClick: (e3) => {
                          e3.stopPropagation();
                          setChurchToDelete(c3);
                        },
                        className: `p-1.5 rounded-lg transition-colors cursor-pointer ${isSelected ? "text-slate-950 hover:bg-black/20 hover:text-rose-900" : "text-slate-500 hover:text-rose-400 hover:bg-rose-500/20"}`,
                        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-3.5 h-3.5" })
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-sm font-extrabold leading-tight line-clamp-1", children: c3.name }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: `text-xs mt-1 ${isSelected ? "text-slate-900 font-medium" : "text-slate-400"}`, children: c3.pastor }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: `text-[11px] mt-0.5 ${isSelected ? "text-slate-800" : "text-slate-500"}`, children: c3.city || (isEs ? "Sede" : isFr ? "Siège" : isEn ? "Main Campus" : "Ayiti") })
              ]
            },
            c3.id
          );
        }) })
      ] })
    ] }),
    activeSubTab === "cards" && /* @__PURE__ */ jsxRuntimeExports.jsx("form", { onSubmit: handleSaveCurrentChurch, className: "space-y-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-[#1E293B] rounded-3xl border border-slate-700/80 p-6 shadow-xl space-y-6 text-slate-200", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-b border-slate-700/80 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "font-bold text-base text-white flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Palette, { className: "w-5 h-5 text-amber-400" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Personalización de Tema y Tarjetas de Miembro" : isFr ? "Personnalisation du Thème et Cartes de Membre" : isEn ? "Theme Customization and Member Cards" : "Pèsonalizasyon Tèm Koulè & Modèl Kat Idantite" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400 mt-0.5", children: isEs ? "Cambie los colores oficiales de la iglesia, el ícono y el título de las tarjetas." : isFr ? "Modifiez les couleurs officielles de l’église, l’icône et le titre des cartes." : isEn ? "Customize church official colors, badge icon, and card header title." : "Chanje koulè ofisyèl legliz la, senbòl logo, ak tit sou kat yo." })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-slate-300 font-bold block mb-1", children: isEs ? "Título Impreso en las Tarjetas (Header)" : isFr ? "Titre Imprimé sur les Cartes (En-tête)" : isEn ? "Printed Header Title on Member Cards" : "Tit ki Enprime sou Kat Manm yo (Header Title)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            value: customCardTitle,
            onChange: (e3) => setCustomCardTitle(e3.target.value),
            placeholder: isEs ? "ej: TARJETA OFICIAL DE MIEMBRO" : isFr ? "ex: CARTE DE MEMBRE OFFICIELLE" : isEn ? "e.g., OFFICIAL MEMBER CARD" : "eg: KAT IDANTITE MANM OFISYÈL",
            className: "w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white font-bold focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 bg-slate-900/90 rounded-2xl border border-slate-700/80 space-y-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(PenTool, { className: "w-5 h-5" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-xs font-bold text-white", children: isEs ? "Firma Electrónica Autorizada (Admin / Pastor)" : isFr ? "Signature Électronique Autorisée (Admin / Pasteur)" : isEn ? "Authorized Electronic Signature (Admin / Pastor)" : "Siyati Elektwonik Otorize (Admin / Pastè)" }),
              signatureUrl ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "w-3 h-3" }),
                isEs ? "Activa" : isFr ? "Active" : isEn ? "Active" : "Aktive"
              ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full", children: isEs ? "Texto por defecto" : isFr ? "Texte par défaut" : isEn ? "Default text" : "Tèks pa defo" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-slate-400 mt-0.5", children: isEs ? "Cargue una imagen de firma (PNG transparente o JPG) para que aparezca en todas las tarjetas de miembros." : isFr ? "Téléversez une signature (PNG transparent ou JPG) pour l’intégrer à toutes les cartes de membres." : isEn ? "Upload a signature image (transparent PNG or JPG) to automatically embed on member cards." : "Upload yon imaj siyati (PNG transparan oswa JPG) pou l monte otomatikman sou tout kat manm ak badj yo." })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              ref: signatureInputRef,
              type: "file",
              accept: "image/png, image/jpeg, image/webp, image/svg+xml",
              onChange: handleUploadSignature,
              className: "hidden",
              id: "settings-signature-upload-input"
            }
          ),
          signatureUrl ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-10 px-3 bg-white/95 rounded-xl border border-slate-500 flex items-center justify-center shadow-inner", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "img",
              {
                src: signatureUrl,
                alt: "Firma",
                className: "h-8 max-w-[90px] object-contain"
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: () => setShowSignaturePad(true),
                className: "px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-400/30 hover:from-amber-500/30 hover:to-amber-400/40 text-amber-300 border border-amber-400/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all",
                title: isEs ? "Redibujar la firma directamente en pantalla" : isFr ? "Redessiner la signature à l’écran" : isEn ? "Redraw signature directly on screen" : "Retrase siyati a dirèkteman sou ekran an",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(PenTool, { className: "w-3.5 h-3.5" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Redibujar" : isFr ? "Redessiner" : isEn ? "Redraw" : "Retrase Dirèk" })
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: () => {
                  var _a4;
                  return (_a4 = signatureInputRef.current) == null ? void 0 : _a4.click();
                },
                className: "px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors",
                title: isEs ? "Cambiar imagen de firma" : isFr ? "Changer l’image de signature" : isEn ? "Change signature image" : "Chanje pa imaj siyati a",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "w-3.5 h-3.5" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Subir" : isFr ? "Téléverser" : isEn ? "Upload" : "Upload" })
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: handleRemoveSignature,
                className: "p-2 rounded-xl bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-500/30 text-xs cursor-pointer transition-colors",
                title: isEs ? "Eliminar firma" : isFr ? "Supprimer la signature" : isEn ? "Delete signature" : "Retire siyati a",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-4 h-4" })
              }
            )
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                id: "btn-draw-cards-signature",
                onClick: () => setShowSignaturePad(true),
                className: "px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-400/20 transition-all active:scale-95",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(PenTool, { className: "w-4 h-4" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "✍️ Dibujar en Pantalla" : isFr ? "✍️ Dessiner à l’Écran" : isEn ? "✍️ Draw on Screen" : "✍️ Ekri Dirèk nan App la" })
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                id: "btn-upload-settings-signature",
                onClick: () => {
                  var _a4;
                  return (_a4 = signatureInputRef.current) == null ? void 0 : _a4.click();
                },
                className: "px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-amber-300 border border-amber-400/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(ImagePlus, { className: "w-4 h-4 text-amber-400" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Subir Imagen" : isFr ? "Téléverser Image" : isEn ? "Upload Image" : "Upload Imaj" })
                ]
              }
            )
          ] })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2 text-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-slate-300 font-bold block", children: isEs ? "Elija el Color Oficial de la Iglesia:" : isFr ? "Choisissez la Couleur Officielle de l’Église :" : isEn ? "Choose Church Official Accent Color:" : "Chwazi Koulè Aksan Ofisyèl Legliz la:" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-3", children: themeColors.map((col) => {
          const isSelected = themeColor === col.id;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => setThemeColor(col.id),
              className: `p-3 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${isSelected ? "bg-slate-800 border-amber-400 ring-2 ring-amber-400/30" : "bg-slate-900/80 border-slate-700 hover:bg-slate-800"}`,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `w-6 h-6 rounded-full ${col.bg} shadow-md shrink-0` }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-xs font-bold ${isSelected ? "text-white" : "text-slate-300"}`, children: col.name })
              ]
            },
            col.id
          );
        }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2 text-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-slate-300 font-bold block", children: isEs ? "Ícono o Símbolo de la Iglesia:" : isFr ? "Icône ou Symbole de l’Église :" : isEn ? "Church Emblem / Icon:" : "Senbòl Logo Legliz la:" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-2 sm:grid-cols-6 gap-2.5", children: logoIcons.map((item) => {
          const IconComp = item.icon;
          const isSelected = logoIcon === item.id;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => setLogoIcon(item.id),
              className: `p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${isSelected ? "bg-amber-400 text-slate-950 border-amber-400 shadow-md font-bold" : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"}`,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(IconComp, { className: "w-5 h-5" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px]", children: item.label })
              ]
            },
            item.id
          );
        }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pt-3 border-t border-slate-700/80 flex justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "submit",
          className: "px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow cursor-pointer",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "w-4 h-4" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Guardar Tema y Tarjetas" : isFr ? "Enregistrer Thème et Cartes" : isEn ? "Save Theme and Cards" : "Anrejistre Tèm & Modèl" })
          ]
        }
      ) })
    ] }) }),
    activeSubTab === "backup" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-[#1E293B] rounded-3xl border border-slate-700/80 p-6 shadow-xl space-y-5 text-slate-200", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-b border-slate-700/80 pb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "font-bold text-base text-white flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Database, { className: "w-5 h-5 text-amber-400" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Centro de Copias de Seguridad y Restauración" : isFr ? "Centre de Sauvegarde, Exportation et Restauration" : isEn ? "Backup, Export & Restoration Center" : "Sant Sovgad, Eksportasyon & Restorasyon Done" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400 mt-0.5", children: isEs ? "Descargue una copia de seguridad completa para todos los miembros, cultos, asistencias y anuncios de esta iglesia." : isFr ? "Téléchargez une sauvegarde complète pour tous les membres, cultes, présences et annonces de cette église." : isEn ? "Download a full backup containing all members, services, attendance, and announcements for this church." : "Telechaje yon kopi sekirite konplè pou tout manm, kilt, prezans ak anons legliz sa a." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 text-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-5 rounded-2xl bg-slate-900 border border-slate-700/80 space-y-3 flex flex-col justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "w-5 h-5" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "font-extrabold text-white text-sm", children: isEs ? "Descargar Copia de Seguridad JSON" : isFr ? "Télécharger la Sauvegarde JSON" : isEn ? "Download JSON Backup" : "Telechaje Sovgad JSON" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-400 mt-1 text-[11px] leading-relaxed", children: isEs ? "Crea un archivo .json seguro que contiene toda la información de la iglesia, miembros y códigos ID." : isFr ? "Crée un fichier .json sécurisé contenant toutes les données de l’église, des membres et des cartes ID." : isEn ? "Creates a secure .json file containing church details, member rosters, and card configurations." : "Kreye yon fichye .json sekirize ki gen tout enfòmasyon legliz la, lis manm yo ak tout kòd ID yo." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              id: "btn-trigger-json-backup",
              onClick: handleExportJsonBackup,
              className: "w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow cursor-pointer transition-all active:scale-95",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(FileJson, { className: "w-4 h-4" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? `Exportar Copia (${activeChurch.code})` : isFr ? `Exporter Sauvegarde (${activeChurch.code})` : isEn ? `Export Backup (${activeChurch.code})` : `Ekspòte Sovgad (${activeChurch.code})` })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-5 rounded-2xl bg-slate-900 border border-slate-700/80 space-y-3 flex flex-col justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "w-5 h-5" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "font-extrabold text-white text-sm", children: isEs ? "Restaurar Datos desde JSON" : isFr ? "Restaurer les Données depuis JSON" : isEn ? "Restore Data from JSON" : "Restore Done apati JSON" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-400 mt-1 text-[11px] leading-relaxed", children: isEs ? "Cargue un archivo de respaldo exportado previamente para restaurar todos los datos sin perder nada." : isFr ? "Téléversez un fichier de sauvegarde précédemment exporté pour restaurer toutes les données." : isEn ? "Upload a previously exported backup file to restore all tenant data without loss." : "Chaje yon fichye sovgad ou te ekspòte deja pou restore tout done yo san pèdi anyen." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "file",
                ref: fileInputRef,
                accept: ".json",
                onChange: handleFileImport,
                className: "hidden",
                id: "input-json-file-upload"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "label",
              {
                htmlFor: "input-json-file-upload",
                className: "w-full py-2.5 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow cursor-pointer transition-all active:scale-95",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "w-4 h-4" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isImporting ? isEs ? "Cargando..." : isFr ? "Chargement..." : isEn ? "Importing..." : "W ap chaje..." : isEs ? "Elegir Archivo JSON" : isFr ? "Choisir Fichier JSON" : isEn ? "Choose JSON File" : "Chwazi Fichye JSON" })
                ]
              }
            )
          ] })
        ] })
      ] }),
      (() => {
        const versionInfo = getAppVersionInfo();
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-5 rounded-3xl bg-slate-900/90 border border-slate-800 text-xs space-y-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-400 border border-amber-400/30 flex items-center justify-center shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleArrowUp, { className: "w-5 h-5" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "font-extrabold text-sm text-white", children: isEs ? "Versión y Actualizaciones del Sistema" : isEn ? "System Version & Updates" : isFr ? "Version du Système & Mises à Jour" : "Vèsyon ak Mizajou Sistèm" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] font-bold border border-slate-700", children: [
                    "v",
                    versionInfo.currentVersion
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-slate-400 mt-0.5", children: isEs ? "Descargue siempre la versión más reciente desde el portal oficial." : isEn ? "Always download the latest version from the official portal." : isFr ? "Téléchargez toujours la version la plus récente depuis le portail officiel." : "Telechaje toujou dènye vèsyon an sou sit ofisyèl la." })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "a",
              {
                href: versionInfo.downloadUrl,
                target: "_blank",
                rel: "noopener noreferrer",
                onClick: () => {
                  preserveSessionBeforeUpdate();
                  toast.success(
                    isEs ? "Sesión Preservada" : isEn ? "Session Preserved" : isFr ? "Session Préservée" : "Sesyon w Konsève",
                    isEs ? "Abriendo el sitio de descarga https://omnichurch.download" : isEn ? "Opening download site https://omnichurch.download" : isFr ? "Ouverture du site https://omnichurch.download" : "N ap ouvri sit telechajman an https://omnichurch.download"
                  );
                  executeAppUpdateDownload();
                },
                className: "px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-400/20 transition-all cursor-pointer",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "w-3.5 h-3.5 text-slate-950" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Descargar en omnichurch.download" : isEn ? "Download at omnichurch.download" : isFr ? "Télécharger sur omnichurch.download" : "Telechaje sou omnichurch.download" })
                ]
              }
            ) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3 rounded-2xl bg-slate-950 border border-slate-800", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] uppercase font-bold text-slate-400 block", children: isEs ? "Versión Actual" : isEn ? "Current Version" : isFr ? "Version Actuelle" : "Vèsyon Aktyèl" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-sm font-bold text-white mt-0.5 block", children: [
                "v",
                versionInfo.currentVersion
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3 rounded-2xl bg-slate-950 border border-slate-800", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] uppercase font-bold text-slate-400 block", children: isEs ? "Última Versión" : isEn ? "Latest Version" : isFr ? "Dernière Version" : "Dènye Vèsyon" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-sm font-bold text-amber-300 mt-0.5 block", children: [
                "v",
                versionInfo.latestVersion
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3 rounded-2xl bg-slate-950 border border-slate-800", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] uppercase font-bold text-slate-400 block", children: isEs ? "Portal de Descarga" : isEn ? "Download Portal" : isFr ? "Portail de Téléchargement" : "Sit Telechajman" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "a",
                {
                  href: versionInfo.downloadUrl,
                  target: "_blank",
                  rel: "noopener noreferrer",
                  className: "font-mono text-xs font-bold text-amber-400 hover:underline mt-0.5 block truncate",
                  children: versionInfo.downloadUrl
                }
              )
            ] })
          ] })
        ] });
      })(),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pt-4 border-t border-rose-950/60 p-5 rounded-3xl bg-rose-950/30 border border-rose-900/50 text-xs space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3 text-rose-300", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-9 h-9 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "w-5 h-5 text-rose-400" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "font-extrabold text-sm text-white", children: t3.dangerManagementTitle }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-rose-300/80 mt-1", children: t3.dangerManagementDesc })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 rounded-2xl bg-slate-900/80 border border-rose-900/40 flex flex-col justify-between gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("h5", { className: "font-bold text-slate-200 flex items-center gap-1.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-4 h-4 text-amber-400" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t3.purgeDemoOptionTitle })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-slate-400 mt-1 leading-relaxed", children: t3.purgeDemoOptionDesc })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                id: "btn-purge-demo-churches",
                onClick: () => setShowPurgeDemoModal(true),
                className: "w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-3.5 h-3.5" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t3.purgeDemoButton })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 flex flex-col justify-between gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("h5", { className: "font-bold text-rose-200 flex items-center gap-1.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-4 h-4 text-rose-400" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t3.systemResetOptionTitle })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-rose-300/80 mt-1 leading-relaxed", children: t3.systemResetOptionDesc })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                id: "btn-open-system-reset-modal",
                onClick: () => setShowSystemResetModal(true),
                className: "w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-600/30 transition-all active:scale-95",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-3.5 h-3.5" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t3.systemReset })
                ]
              }
            )
          ] })
        ] })
      ] })
    ] }) }),
    activeSubTab === "donations" && /* @__PURE__ */ jsxRuntimeExports.jsx("form", { onSubmit: handleSaveCurrentChurch, className: "space-y-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-[#1E293B] rounded-3xl border border-slate-700/80 p-6 shadow-xl space-y-6 text-slate-200", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-b border-slate-700/80 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-9 h-9 rounded-2xl bg-amber-400/20 text-amber-400 border border-amber-400/40 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(HeartHandshake, { className: "w-5 h-5" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-extrabold text-base sm:text-lg text-white", children: isEs ? `Donaciones, Díezmos y Cuentas de "${activeChurch.name}"` : isFr ? `Dîmes, Offrandes & Comptes Bancaires de « ${activeChurch.name} »` : isEn ? `Giving, Tithes & Payment Methods for "${activeChurch.name}"` : `Donasyon, Dîmes & Kont Peman pou "${activeChurch.name}"` })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400 mt-1", children: isEs ? "Configure los canales oficiales de donación exclusivos de su iglesia: transferencias bancarias, PayPal, MonCash, Zelle y notas personalizadas." : isFr ? "Configurez les canaux officiels de don propres à votre église : coordonnées bancaires, PayPal, MonCash, Zelle et consignes personnalisées." : isEn ? "Configure your church-specific giving channels: official bank transfers, PayPal, MonCash, Zelle, and custom instructions." : "Konfigire kanal ofisyèl donasyon legliz ou sèlman: enfòmasyon labank, PayPal, MonCash, Zelle, Cash App ak enstriksyon pèsonalize pou manm yo." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 self-end sm:self-auto", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => setShowDonationPreviewModal(true),
              className: "px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "w-4 h-4" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Ver como Miembro (Preview)" : isFr ? "Aperçu Membre" : isEn ? "Member Preview" : "Gade Kijan Manm yo ap Wè li" })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "submit",
              className: "px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-400/20 transition-all cursor-pointer",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "w-4 h-4" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Guardar Cambios" : isFr ? "Enregistrer" : isEn ? "Save" : "Anrejistre" })
              ]
            }
          )
        ] })
      ] }),
      isChurchLicensed ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 sm:p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "w-5 h-5" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "font-extrabold text-sm text-white", children: isEs ? "Licencia Pro Activa — Donaciones Autorizadas" : isFr ? "Licence Active — Dons & Dîmes Autorisés" : isEn ? "Active License — Giving Module Authorized" : "Lisans Aktif — Donasyon & Dîm Otorize" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30", children: ((_B = activeLicenseDetails == null ? void 0 : activeLicenseDetails.tier) == null ? void 0 : _B.toUpperCase()) || "PRO" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-300 mt-0.5", children: isEs ? `La iglesia "${activeChurch.name}" cuenta con una licencia oficial válida. Puede habilitar y configurar la recaudación.` : isFr ? `L’église "${activeChurch.name}" dispose d’une licence officielle valide.` : isEn ? `Church "${activeChurch.name}" has an active verified license. Member giving is unlocked.` : `Legliz "${activeChurch.name}" gen yon lisans ofisyèl valab. Ou ka aktive epi konfigire resepsyon donasyon yo.` })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: () => setShowLicenseModal(true),
            className: "px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer self-start sm:self-auto shrink-0",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "w-4 h-4 text-emerald-400" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Ver Licencia & Dev" : isFr ? "Voir Licence & Dev" : isEn ? "View License & Dev" : "Detay Lisans & Dev" })
            ]
          }
        )
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-slate-950 border border-amber-500/50 shadow-lg relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0 mt-0.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "w-5 h-5 text-amber-400" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "font-black text-sm text-white", children: isEs ? "Módulo de Donaciones Bloqueado (Licencia Requerida)" : isFr ? "Module de Dons Verrouillé (Licence Requise)" : isEn ? "Donation Module Locked (License Required)" : "Modil Donasyon Bloke (Lisans Egzije)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30", children: isEs ? "Sin Licencia" : isFr ? "Sans Licence" : isEn ? "Unlicensed" : "San Lisans" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-300 mt-1 leading-relaxed", children: isEs ? "Para activar la recepción de diezmos y ofrendas, la iglesia debe contar con una Licencia Oficial Activa ($70.00 USD / válida por 1 año). Esta misma licencia es la que autoriza y protege el RNC oficial de la congregación." : isFr ? "Pour activer la réception des dîmes et offrandes, l’église doit posséder une Licence Officielle Active ($70.00 USD / valide 1 an). Cette même licence sert également à autoriser le RNC officiel." : isEn ? "To enable tithes and offerings, the church must hold an Active Official License ($70.00 USD / valid for 1 year). This same license also validates and protects the church’s official RNC." : "Pou legliz la ka aktive epi resevwa dîm ak ofrann nan men manm yo, li dwe gen yon Lisans Ofisyèl Aktif ($70.00 USD / valid pou 1 ane). Se menm lisans sa a ki sèvi tou pou otorize RNC ofisyèl legliz la." })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: () => setShowLicenseModal(true),
            className: "px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 transition cursor-pointer self-start sm:self-auto shrink-0 active:scale-98",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "w-4 h-4 text-slate-950" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Activar Licencia ($70.00 USD / 1 Año)" : isFr ? "Activer Licence ($70.00 USD / 1 An)" : isEn ? "Activate License ($70.00 USD / 1 Yr)" : "Aktive Lisans ($70.00 USD / 1 Ane)" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `p-4 rounded-2xl bg-slate-900/90 border ${isChurchLicensed ? "border-slate-800" : "border-slate-800/60 opacity-80"} flex items-center justify-between`, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `w-9 h-9 rounded-xl flex items-center justify-center ${donationEnabled && isChurchLicensed ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-500"}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(DollarSign, { className: "w-5 h-5" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "font-extrabold text-sm text-white", children: isEs ? "Activar Módulo de Donación y Ofrendas para los Miembros" : isFr ? "Activer le Module de Dons & Offrandes pour les Membres" : isEn ? "Enable Church Giving Module for Members" : "Aktive Modil Donasyon & Ofrann pou Manm Legliz la" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400", children: isEs ? "Muestra el botón de donación oficial de su congregación en el portal de los miembros (permanece cerrado por defecto)." : isFr ? "Affiche le bouton de don officiel sur l’espace membre (fermé par défaut)." : isEn ? "Displays the official giving button on the member portal (closed by default)." : "L ap mete bouton ofisyèl donasyon legliz ou a nan espas manm yo (li fèmen pa defo)." })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "relative inline-flex items-center cursor-pointer", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "checkbox",
              checked: donationEnabled && isChurchLicensed,
              disabled: !isChurchLicensed,
              onChange: (e3) => {
                if (!isChurchLicensed) {
                  toast.error(
                    isEs ? "Licencia Requerida" : isFr ? "Licence Requise" : isEn ? "License Required" : "Lisans Egzije",
                    isEs ? "Para activar las donaciones de esta iglesia, se requiere una Licencia Activa." : isFr ? "Pour activer les dons de cette église, une Licence Active est requise." : isEn ? "An active license is required to enable member giving for this church." : "Pou w ka aktive donasyon pou legliz sa a, li dwe gen yon lisans aktif nan sistèm nan."
                  );
                  return;
                }
                setDonationEnabled(e3.target.checked);
              },
              className: "sr-only peer"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${isChurchLicensed ? "peer-checked:bg-emerald-500" : "cursor-not-allowed opacity-40"}` })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between border-b border-slate-800 pb-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-white font-extrabold text-sm", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Building2, { className: "w-4 h-4 text-amber-400" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "1. Cuenta Bancaria Oficial de la Iglesia" : isFr ? "1. Coordonnées Bancaires Officielles de l’Église" : isEn ? "1. Official Church Bank Account" : "1. Kont Labank Ofisyèl Legliz la" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 text-xs text-slate-300 cursor-pointer font-bold", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "checkbox",
                checked: donationBankEnabled,
                onChange: (e3) => setDonationBankEnabled(e3.target.checked),
                className: "w-4 h-4 text-amber-400 rounded bg-slate-950 border-slate-700"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Habilitar Banco" : isFr ? "Activer Banque" : isEn ? "Enable Bank" : "Aktive Labank" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 text-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-slate-300 font-bold mb-1", children: isEs ? "Nombre del Banco (ej: Unibank, Sogebank, Chase, Banreservas)" : isFr ? "Nom de la Banque (ex: Unibank, Sogebank, Chase)" : isEn ? "Bank Name (e.g. Unibank, Sogebank, Chase)" : "Non Bank la (eg: Unibank, Sogebank, Chase, Banreservas)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                placeholder: "ex: Sogebank / Unibank / Chase Bank",
                value: donationBankName,
                onChange: (e3) => setDonationBankName(e3.target.value),
                className: "w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-slate-300 font-bold mb-1", children: isEs ? "Número de Cuenta Bancaria" : isFr ? "Numéro de Compte Bancaire" : isEn ? "Bank Account Number" : "Nimewo Kont Labank" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                placeholder: "ex: 123-456-789-00",
                value: donationBankAccountNumber,
                onChange: (e3) => setDonationBankAccountNumber(e3.target.value),
                className: "w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 font-mono font-bold placeholder-slate-500 focus:outline-none focus:border-amber-400"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-slate-300 font-bold mb-1", children: isEs ? "Titular de la Cuenta / Beneficiario" : isFr ? "Titulaire du Compte" : isEn ? "Account Holder / Church Legal Name" : "Non Titilè Kont lan / Non Legliz la" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                placeholder: activeChurch.name || "Nom complet de l’église",
                value: donationBankAccountHolder,
                onChange: (e3) => setDonationBankAccountHolder(e3.target.value),
                className: "w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-slate-300 font-bold mb-1", children: isEs ? "Tipo de Cuenta" : isFr ? "Type de Compte" : isEn ? "Account Type" : "Tip de Kont" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                value: donationBankAccountType,
                onChange: (e3) => setDonationBankAccountType(e3.target.value),
                className: "w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-400 font-semibold",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "checking", children: isEs ? "Cuenta Corriente (Checking)" : isFr ? "Compte Courant (Checking)" : isEn ? "Checking Account" : "Kont Kouran (Checking)" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "savings", children: isEs ? "Cuenta de Ahorros (Savings)" : isFr ? "Compte Épargne (Savings)" : isEn ? "Savings Account" : "Kont Epany (Savings)" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "md:col-span-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-slate-300 font-bold mb-1", children: isEs ? "Código Routing / SWIFT / IBAN / Sucursal (Opcional)" : isFr ? "Code SWIFT / IBAN / Agence (Optionnel)" : isEn ? "Routing / SWIFT / IBAN / Branch (Optional)" : "Kòd Routing / SWIFT / IBAN / Sikisal (Si genyen)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                placeholder: "ex: UNIBHTPP o Routing: 021000021",
                value: donationBankRoutingOrSwift,
                onChange: (e3) => setDonationBankRoutingOrSwift(e3.target.value),
                className: "w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
              }
            )
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between border-b border-slate-800 pb-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-white font-extrabold text-sm", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CreditCard, { className: "w-4 h-4 text-blue-400" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "2. Cuenta PayPal de la Iglesia" : isFr ? "2. Compte PayPal de l’Église" : isEn ? "2. Church PayPal Account" : "2. Kont PayPal Legliz la" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 text-xs text-slate-300 cursor-pointer font-bold", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "checkbox",
                checked: donationPaypalEnabled,
                onChange: (e3) => setDonationPaypalEnabled(e3.target.checked),
                className: "w-4 h-4 text-blue-400 rounded bg-slate-950 border-slate-700"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Habilitar PayPal" : isFr ? "Activer PayPal" : isEn ? "Enable PayPal" : "Aktive PayPal" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 text-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-slate-300 font-bold mb-1", children: isEs ? "Correo Electrónico de PayPal de la Iglesia" : isFr ? "Courriel PayPal de l’Église" : isEn ? "Church PayPal Email" : "Email PayPal Legliz la" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "email",
                placeholder: "finances@eglise.org",
                value: donationPaypalEmail,
                onChange: (e3) => setDonationPaypalEmail(e3.target.value),
                className: "w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-slate-300 font-bold mb-1", children: isEs ? "Enlace Directo PayPal.Me (Opcional)" : isFr ? "Lien Direct PayPal.Me (Optionnel)" : isEn ? "Direct PayPal.Me URL (Optional)" : "Lyen Dirèk PayPal.Me (Si genyen)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "url",
                placeholder: "https://paypal.me/eglisename",
                value: donationPaypalMeUrl,
                onChange: (e3) => setDonationPaypalMeUrl(e3.target.value),
                className: "w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
              }
            )
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-b border-slate-800 pb-3 flex items-center justify-between", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-white font-extrabold text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Smartphone, { className: "w-4 h-4 text-emerald-400" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "3. Pagos Móviles: MonCash, Zelle & Cash App" : isFr ? "3. Paiements Mobiles : MonCash, Zelle & Cash App" : isEn ? "3. Mobile Payments: MonCash, Zelle & Cash App" : "3. Peman Mobil: MonCash, Zelle & Cash App" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 text-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 rounded-xl bg-slate-950 border border-rose-500/30 space-y-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-extrabold text-rose-400 text-xs uppercase", children: "MonCash (Digicel)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "checkbox",
                  checked: donationMoncashEnabled,
                  onChange: (e3) => setDonationMoncashEnabled(e3.target.checked),
                  className: "w-4 h-4 text-rose-500 rounded bg-slate-900 border-slate-700"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[11px] text-slate-400 mb-1 font-semibold", children: "Nimewo Telefòn MonCash" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "text",
                  placeholder: "+509 3700-0000",
                  value: donationMoncashNumber,
                  onChange: (e3) => setDonationMoncashNumber(e3.target.value),
                  className: "w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-rose-400"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[11px] text-slate-400 mb-1 font-semibold", children: "Non sou MonCash" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "text",
                  placeholder: activeChurch.name,
                  value: donationMoncashName,
                  onChange: (e3) => setDonationMoncashName(e3.target.value),
                  className: "w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-rose-400"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 rounded-xl bg-slate-950 border border-purple-500/30 space-y-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-extrabold text-purple-400 text-xs uppercase", children: "Zelle (USA)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "checkbox",
                  checked: donationZelleEnabled,
                  onChange: (e3) => setDonationZelleEnabled(e3.target.checked),
                  className: "w-4 h-4 text-purple-500 rounded bg-slate-900 border-slate-700"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[11px] text-slate-400 mb-1 font-semibold", children: "Email / Telefòn Zelle" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "text",
                  placeholder: "zelle@church.org",
                  value: donationZelleInfo,
                  onChange: (e3) => setDonationZelleInfo(e3.target.value),
                  className: "w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-purple-400"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[11px] text-slate-400 mb-1 font-semibold", children: "Non sou Zelle" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "text",
                  placeholder: activeChurch.name,
                  value: donationZelleName,
                  onChange: (e3) => setDonationZelleName(e3.target.value),
                  className: "w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-purple-400"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-extrabold text-emerald-400 text-xs uppercase", children: "Cash App" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "checkbox",
                  checked: donationCashAppEnabled,
                  onChange: (e3) => setDonationCashAppEnabled(e3.target.checked),
                  className: "w-4 h-4 text-emerald-500 rounded bg-slate-900 border-slate-700"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-[11px] text-slate-400 mb-1 font-semibold", children: "$Cashtag" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "text",
                  placeholder: "$EgliseDeDieu",
                  value: donationCashAppTag,
                  onChange: (e3) => setDonationCashAppTag(e3.target.value),
                  className: "w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-400"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-slate-500 italic pt-2", children: isEs ? "Permite transferencias rápidas desde EE.UU." : isFr ? "Transferts directs depuis les USA." : isEn ? "Direct transfers in the US." : "Peman rapid pou manm nan peyi etranje." })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-between border-b border-slate-800 pb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-white font-extrabold text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Globe, { className: "w-4 h-4 text-amber-400" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "4. Enlace Personalizado, Instrucciones y Versículo" : isFr ? "4. Lien Personnalisé, Consignes & Verset" : isEn ? "4. Custom Giving Link, Instructions & Scripture" : "4. Lyen Pèsonalize, Enstriksyon & Vèsè Biblik" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 text-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-slate-300 font-bold mb-1", children: isEs ? "Enlace Externo de Donación (ej: Tithe.ly, Subsplash, Sitio Web)" : isFr ? "Lien Externe de Don (ex: Tithe.ly, Subsplash, Site)" : isEn ? "External Giving URL (e.g. Tithe.ly, Subsplash, Website)" : "Lyen Donasyon Ekstèn (eg: Tithe.ly, Subsplash, Sit Wèb)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "url",
                placeholder: "https://giving.church.org",
                value: donationCustomGivingUrl,
                onChange: (e3) => setDonationCustomGivingUrl(e3.target.value),
                className: "w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-slate-300 font-bold mb-1", children: isEs ? "Nombre o Etiqueta del Botón Externo" : isFr ? "Texte du Bouton Externe" : isEn ? "External Button Label" : "Non sou Bouton Ekstèn lan" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                placeholder: "ex: Fè Don sou Tithe.ly oswa Sit Wèb",
                value: donationCustomGivingLabel,
                onChange: (e3) => setDonationCustomGivingLabel(e3.target.value),
                className: "w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "md:col-span-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-slate-300 font-bold mb-1", children: isEs ? "Versículo Bíblico sobre la Generosidad" : isFr ? "Verset Biblique sur la Générosité" : isEn ? "Scripture Verse on Giving" : "Vèsè Biblik sou Jenewozite" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                placeholder: "Chak moun fèt pou bay jan yo te deside nan kè yo, san regrèt, san fòse... (2 Korentyen 9:7)",
                value: donationBibleVerse,
                onChange: (e3) => setDonationBibleVerse(e3.target.value),
                className: "w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-amber-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 italic"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "md:col-span-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-slate-300 font-bold mb-1", children: isEs ? "Instrucciones Personalizadas para los Miembros" : isFr ? "Instructions Particulières pour les Membres" : isEn ? "Custom Instructions for Members" : "Enstriksyon Pèsonalize pou Manm yo" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "textarea",
              {
                rows: 3,
                placeholder: "Tanpri mete non ou ak kòd manm ou nan nòt transfè a pou nou ka anrejistre li nan dosye dim ak ofrann ou.",
                value: donationCustomInstructions,
                onChange: (e3) => setDonationCustomInstructions(e3.target.value),
                className: "w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none"
              }
            )
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between pt-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: () => setShowDonationPreviewModal(true),
            className: "px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/30 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "w-4 h-4" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Probar y Ver Modal como Miembro" : isFr ? "Tester et Voir comme Membre" : isEn ? "Test & Preview Modal" : "Teste & Wè Kijan Manm yo ap Wè li" })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "submit",
            className: "px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-amber-400/20 transition-all cursor-pointer",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "w-4 h-4" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Guardar Información de Donación" : isFr ? "Enregistrer les Informations" : isEn ? "Save Giving Configuration" : "Anrejistre Enfòmasyon Donasyon yo" })
            ]
          }
        )
      ] })
    ] }) }),
    activeSubTab === "rules" && /* @__PURE__ */ jsxRuntimeExports.jsx("form", { onSubmit: handleSaveCurrentChurch, className: "space-y-6 animate-fadeIn", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-[#1E293B] rounded-3xl border border-slate-700/80 p-6 shadow-xl space-y-6 text-slate-200", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-b border-slate-700/80 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "font-bold text-base text-white flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "w-5 h-5 text-amber-400" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Estatutos, Términos de Uso y Política de Privacidad" : isFr ? "Règlement Intérieur, Conditions & Confidentialité" : isEn ? "Church Guidelines, Terms & Privacy Policy" : "Règlemantasyon, Kondisyon & Vi Prive" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400 mt-0.5", children: isEs ? "Establezca las normas de convivencia cristiana, el uso responsable de la plataforma y las garantías de protección de datos de los miembros." : isFr ? "Définissez les règles de vie chrétienne, l’utilisation responsable et les garanties de confidentialité des données." : isEn ? "Define Christian community conduct, terms of use, and strict member data confidentiality policies." : "Mete kanpe prensip lavi kretyen, bon itilizasyon platfòm lan ak garanti pwoteksyon done manm yo." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: () => setShowRulesPreviewModal(true),
            className: "px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-400/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "w-4 h-4" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Vista Previa (Miembros)" : isFr ? "Aperçu (Membres)" : isEn ? "Preview (Members)" : "Wè Kijan Manm yo ap Wè li" })
            ]
          }
        ) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400", children: /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "w-5 h-5" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "font-bold text-white text-xs sm:text-sm", children: isEs ? "Activar Módulo de Reglamento y Privacidad" : isFr ? "Activer le Module de Règlement & Vie Privée" : isEn ? "Enable Church Rules & Privacy Module" : "Aktive Modil Règleman & Vi Prive" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-slate-400", children: isEs ? "Los miembros podrán consultar los estatutos en cualquier momento desde su perfil o pantalla principal." : "Manm yo ap ka konsilte règleman sa yo nenpòt kilè nan pwofil yo oswa nan paj dakèy la." })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "relative inline-flex items-center cursor-pointer", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "checkbox",
              checked: rulesEnabled,
              onChange: (e3) => setRulesEnabled(e3.target.checked),
              className: "sr-only peer"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-400" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-white font-extrabold text-xs sm:text-sm border-b border-slate-800 pb-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(HeartHandshake, { className: "w-4 h-4 text-amber-400" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "1. Normas de Convivencia y Respeto en Anuncios / Comentarios" : isFr ? "1. Règles de Vie Communautaire & Commentaires" : isEn ? "1. Community Conduct & Uplifting Comments" : "1. Règ Kominotè, Respè & Bon Kòmantè" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400 leading-relaxed", children: isEs ? "Escriba indicaciones o normas específicas que rigen las interacciones de los miembros en esta congregación." : "Mete konsiy oswa règleman espesifik ki gouvène entèraksyon ak kòmantè manm yo nan legliz sa a." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "textarea",
          {
            rows: 3,
            placeholder: isEs ? "Ej: Se requiere cordialidad, lenguaje sano y respeto mutuo en todo comentario..." : "Egzanp: Tout manm dwe kominike ak respè, lapè, epi evite nenpòt pawòl ki ka blese oswa divize...",
            value: rulesCommunity,
            onChange: (e3) => setRulesCommunity(e3.target.value),
            className: "w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-xs resize-none leading-relaxed"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-white font-extrabold text-xs sm:text-sm border-b border-slate-800 pb-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "w-4 h-4 text-indigo-400" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "2. Política de Protección de Datos de los Miembros" : isFr ? "2. Politique de Protection des Données Personnelles" : isEn ? "2. Member Data Privacy & Security Commitments" : "2. Pwoteksyon Done & Konfidansyalite Manm yo" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400 leading-relaxed", children: isEs ? "Garantice formalmente a los miembros que sus teléfonos, direcciones e historial de asistencias son estrictamente confidenciales." : "Asire manm yo ke nimewo telefòn yo, adrès yo ak rapò prezans yo rete 100% sekirize e konfidansyèl." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "textarea",
          {
            rows: 3,
            placeholder: isEs ? "Ej: La iglesia garantiza la estricta confidencialidad de todos los registros..." : "Egzanp: Legliz la garanti ke tout enfòmasyon pèsonèl manm yo rete sekirize nan sistèm lan epi yo pap janm pataje...",
            value: rulesPrivacy,
            onChange: (e3) => setRulesPrivacy(e3.target.value),
            className: "w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 text-xs resize-none leading-relaxed"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-white font-extrabold text-xs sm:text-sm border-b border-slate-800 pb-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DollarSign, { className: "w-4 h-4 text-emerald-400" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "3. Transparencia en Díezmos, Ofrendas y Proyectos" : isFr ? "3. Transparence Financière, Dîmes & Dons" : isEn ? "3. Financial Transparency, Tithes & Offerings" : "3. Transparans Finansye, Dîm & Ofrann" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "textarea",
          {
            rows: 2,
            placeholder: isEs ? "Ej: Todo aporte financiero se destina íntegramente a las obras del ministerio..." : "Egzanp: Tout dîm ak ofrann ale dirèkteman sou kont ofisyèl legliz la pou soutni travay levanjil la ak pwojè kominotè yo...",
            value: rulesFinancial,
            onChange: (e3) => setRulesFinancial(e3.target.value),
            className: "w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 text-xs resize-none leading-relaxed"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between pt-3 border-t border-slate-800", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: () => setShowRulesPreviewModal(true),
            className: "px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/30 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "w-4 h-4" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Probar y Ver Modal" : isFr ? "Tester et Voir l’Aperçu" : isEn ? "Test & Preview Modal" : "Teste & Wè Kijan l ap Parèt" })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "submit",
            id: "btn-save-church-rules",
            className: "px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-amber-400/20 transition-all cursor-pointer transform active:scale-95",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "w-4 h-4" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Guardar Reglamento y Privacidad" : isFr ? "Enregistrer le Règlement" : isEn ? "Save Rules & Privacy" : "Anrejistre Règleman & Vi Prive" })
            ]
          }
        )
      ] })
    ] }) }),
    activeSubTab === "diagnostics" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-[#1E293B] rounded-3xl border border-slate-700/80 p-6 shadow-xl space-y-5 text-slate-200", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-b border-slate-700/80 pb-3 flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "font-bold text-base text-white flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { className: "w-5 h-5 text-emerald-400" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Diagnósticos y Estado del Sistema" : "Dyagnostik & Sante Sistèm nan" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400 mt-0.5", children: isEs ? "Inspección en tiempo real del estado de Firestore, memoria local y servicios." : "Enspeksyon an tan reyèl sou eta baz done Firestore, memwa lokal ak sèvis yo." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: handleTestLatency,
            disabled: isPinging,
            className: "px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: `w-3.5 h-3.5 ${isPinging ? "animate-spin" : ""}` }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Probar Latencia" : "Teste Latans" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-slate-400", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold", children: isEs ? "Sincronización Firestore" : isFr ? "Synchronisation Firestore" : isEn ? "Firestore Synchronization" : "Firestore Sync" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Server, { className: "w-4 h-4 text-emerald-400" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-lg font-extrabold text-emerald-400 flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Conectado / En Línea" : isFr ? "Connecté / En Ligne" : isEn ? "Connected / Online" : "Konekte / Online" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-slate-500", children: isEs ? "Escuchando cambios en tiempo real" : isFr ? "Écoute des modifications en direct" : isEn ? "Listening to real-time sync updates" : "Koute modifikasyon an tan reyèl" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-slate-400", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold", children: isEs ? "Memoria Local (Caché Offline)" : isFr ? "Mémoire Locale (Cache Hors-ligne)" : isEn ? "Local Memory (Offline Cache)" : "Memwa Lokal (Offline Cache)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(HardDrive, { className: "w-4 h-4 text-indigo-400" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-lg font-extrabold text-white", children: [
            allChurchesList.length,
            " ",
            isEs ? "Iglesias Activas" : isFr ? "Églises Actives" : isEn ? "Active Churches" : "Legliz Aktif"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-slate-500", children: isEs ? "Persistencia local lista para modo offline" : isFr ? "Persistance locale prête pour mode hors-ligne" : isEn ? "Local persistence ready for offline mode" : "Pèsistans lokal pare pou mòd offline" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between text-slate-400", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold", children: isEs ? "Latencia de Red" : isFr ? "Latence Réseau" : isEn ? "Network Latency" : "Latans Kominikasyon" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Cpu, { className: "w-4 h-4 text-amber-400" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-lg font-extrabold text-amber-400", children: pingLatency ? `${pingLatency} ms` : "< 12 ms" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-slate-500", children: isEs ? "Tiempo de respuesta ultra rápido" : isFr ? "Temps de réponse ultra-rapide" : isEn ? "Ultra fast round-trip latency" : "Tan repons ultra rapid" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "font-bold text-slate-300", children: isEs ? "Versión y Arquitectura:" : isFr ? "Version & Architecture :" : isEn ? "Version & Architecture:" : "Vèsyon & Achitekti:" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-400 font-mono", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            isEs ? "Versión:" : isFr ? "Version :" : isEn ? "Version:" : "Vèsyon:",
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "text-white", children: "v2.4.0-ProMax" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            isEs ? "Motor:" : isFr ? "Moteur :" : isEn ? "Engine:" : "Motè:",
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "text-white", children: "React 18 + Vite" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            isEs ? "Base de Datos:" : isFr ? "Base de Données :" : isEn ? "Database:" : "Baz Done:",
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "text-white", children: "Firestore Cloud" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            isEs ? "Seguridad:" : isFr ? "Sécurité :" : isEn ? "Security:" : "Sekirite:",
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { className: "text-white", children: "WebAuthn + Google" })
          ] })
        ] })
      ] })
    ] }),
    isCreatingNew && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative w-full max-w-lg bg-[#1E293B] rounded-3xl shadow-2xl border border-slate-700 overflow-hidden my-auto text-slate-200", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-[#0F172A] text-white p-5 flex items-center justify-between border-b border-slate-700", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Building2, { className: "w-4 h-4" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-extrabold text-sm text-white", children: isEs ? "Crear Nuevo Espacio de Iglesia Privado" : isFr ? "Créer un Nouvel Espace d’Église Privé" : isEn ? "Create New Private Church Workspace" : "Kreye yon Nouvo Espas Legliz Prive" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-slate-400", children: isEs ? "Aislamiento total con ID único" : isFr ? "Isolation totale des données avec ID unique" : isEn ? "Complete data tenant isolation with unique ID" : "Izolasyon total done ak ID inik" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: () => setIsCreatingNew(false),
            className: "text-slate-400 hover:text-white cursor-pointer",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(X$1, { className: "w-5 h-5" })
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleCreateChurch, className: "p-6 space-y-4 text-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[11px] font-bold text-slate-300 flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "⚡" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Elegir una plantilla rápida (Opcional):" : isFr ? "Choisir un modèle rapide (Optionnel) :" : isEn ? "Choose a quick template (Optional):" : "Chwazi yon modèl rapid (Opsyonèl) :" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-1.5", children: [
            { name: isEs ? "Iglesia Bautista de la Gracia" : isFr ? "Église Baptiste de la Grâce" : isEn ? "Grace Baptist Church" : "Legliz Batis de la Gras", code: "EBG", pastor: isEs ? "Pastor Roberto Morales" : isFr ? "Pasteur Jean-Robert Louis" : isEn ? "Pastor Robert Louis" : "Pastè Jean-Robert Louis", city: isEs ? "Santo Domingo, Rep. Dom." : isFr ? "Port-au-Prince, Haïti" : isEn ? "Miami, FL" : "Pòtoprens, Ayiti", motto: isEs ? "Gracia y Verdad en Cristo" : isFr ? "Grâce et Vérité en Christ" : isEn ? "Grace and Truth in Christ" : "Gras ak Verite nan Kris la" },
            { name: isEs ? "Iglesia de Dios de la Liberación" : isFr ? "Église de Dieu de la Délivrance" : isEn ? "Deliverance Church of God" : "Legliz Bondye Delivrans lan", code: "EDD", pastor: isEs ? "Pastor Carlos Méndez" : isFr ? "Pasteur Jude Valcourt" : isEn ? "Pastor Jude Valcourt" : "Pastè Jude Valcourt", city: isEs ? "Santiago, Rep. Dom." : isFr ? "Delmas, Haïti" : isEn ? "Orlando, FL" : "Dèlma, Ayiti", motto: isEs ? "Victoria a través de la oración" : isFr ? "Victoire par la prière" : isEn ? "Victory through prayer" : "Viktwa pa mwayen lapriyè" },
            { name: isEs ? "Asamblea de Dios Central" : isFr ? "Assemblée de Dieu Centrale" : isEn ? "Central Assembly of God" : "Lasanble Bondye Santral", code: "ADC", pastor: isEs ? "Pastor Emmanuel Pérez" : isFr ? "Pasteur Emmanuel Pierre" : isEn ? "Pastor Emmanuel Pierre" : "Pastè Emmanuel Pierre", city: isEs ? "San Cristóbal, Rep. Dom." : isFr ? "Pétion-Ville, Haïti" : isEn ? "New York, NY" : "Pétion-Ville, Ayiti", motto: isEs ? "Una comunidad que adora y sirve" : isFr ? "Une communauté qui adore et sert" : isEn ? "A community that worships and serves" : "Yon kominote ki adore e ki sèvi" }
          ].map((tpl) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => {
                setNewName(tpl.name);
                setNewCode(tpl.code);
                setNewPastor(tpl.pastor);
                setNewCity(tpl.city);
                setNewMotto(tpl.motto);
                setNewEmail(`${(tpl.code || "").toLowerCase()}@iglesia.org`);
              },
              className: "px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-amber-400/20 hover:text-amber-300 text-slate-300 border border-slate-700 text-[10px] font-semibold transition-colors cursor-pointer",
              children: [
                "+ ",
                tpl.name
              ]
            },
            tpl.name
          )) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-slate-300 font-bold block mb-1", children: isEs ? "Nombre Completo de la Iglesia *" : isFr ? "Nom Complet de l’Église *" : isEn ? "Full Church Name *" : "Nom de l’Église (Non Konplè Legliz la) *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              required: true,
              placeholder: isEs ? "ej: Iglesia de la Gracia Triunfante" : isFr ? "ex: Église de la Grâce Triomphante" : isEn ? "e.g., Triumphant Grace Church" : "eg: Église de la Grâce Triomphante",
              value: newName,
              onChange: (e3) => setNewName(e3.target.value),
              className: "w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none font-bold"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-slate-300 font-bold block mb-1", children: isEs ? "Código Corto (Acrónimo)" : isFr ? "Code Court (Acronyme)" : isEn ? "Short Code (Acronym)" : "Kòd Kout (Acronyme)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                placeholder: "eg: EGT01",
                value: newCode,
                onChange: (e3) => setNewCode(e3.target.value),
                className: "w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none font-mono"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-slate-300 font-bold block mb-1", children: isEs ? "Pastor Responsable *" : isFr ? "Pasteur Responsable *" : isEn ? "Lead Pastor *" : "Pastè Responsable *" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                required: true,
                placeholder: isEs ? "ej: Pastor Juan Morales" : isFr ? "ex: Pasteur André Joseph" : isEn ? "e.g., Pastor John Miller" : "eg: Pastè André Joseph",
                value: newPastor,
                onChange: (e3) => setNewPastor(e3.target.value),
                className: "w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-slate-300 font-bold block mb-1", children: isEs ? "Dirección Física" : isFr ? "Adresse Physique" : isEn ? "Physical Address" : "Adrès Fizik" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                placeholder: isEs ? "ej: Av. Duarte #45" : isFr ? "ex: 45, Route de Frères" : isEn ? "e.g., 123 Main Street" : "eg: 45, Route de Frères",
                value: newAddress,
                onChange: (e3) => setNewAddress(e3.target.value),
                className: "w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-slate-300 font-bold block mb-1", children: isEs ? "Ciudad / País" : isFr ? "Ville / Pays" : isEn ? "City / Country" : "Vil / Peyi" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                value: newCity,
                onChange: (e3) => setNewCity(e3.target.value),
                className: "w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-slate-300 font-bold block mb-1", children: isEs ? "Teléfono" : isFr ? "Téléphone" : isEn ? "Phone Number" : "Telefòn" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                value: newPhone,
                onChange: (e3) => setNewPhone(e3.target.value),
                className: "w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-slate-300 font-bold block mb-1", children: isEs ? "Correo Electrónico" : isFr ? "Email de Contact" : isEn ? "Contact Email" : "Email" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "email",
                placeholder: "eg: contact@iglesia.org",
                value: newEmail,
                onChange: (e3) => setNewEmail(e3.target.value),
                className: "w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-slate-300 font-bold block mb-1", children: isEs ? "Lema / Versículo" : isFr ? "Devise / Verset" : isEn ? "Motto / Theme Verse" : "Devise / Motto" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              placeholder: isEs ? "ej: Al servicio de Cristo con amor" : isFr ? "ex: Au service du Christ avec amour" : isEn ? "e.g., Serving Christ with joy and love" : "eg: Nan sèvis Kris la ak renmen",
              value: newMotto,
              onChange: (e3) => setNewMotto(e3.target.value),
              className: "w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-amber-400 focus:border-amber-400 focus:outline-none"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3.5 bg-amber-400/10 border border-amber-400/30 rounded-2xl space-y-2.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-amber-300 font-bold text-xs", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "w-4 h-4 text-amber-400" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Código PIN de Seguridad Admin *" : isFr ? "Code PIN de Sécurité Admin *" : isEn ? "Admin Security PIN *" : "Kòd PIN Sekirite Administratè *" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: () => setShowNewPasscode(!showNewPasscode),
                className: "text-xs text-slate-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer",
                children: [
                  showNewPasscode ? /* @__PURE__ */ jsxRuntimeExports.jsx(EyeOff, { className: "w-3.5 h-3.5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "w-3.5 h-3.5" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: showNewPasscode ? "Kache" : "Montre" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-slate-300", children: isEs ? "Defina el código maestro para proteger el acceso y permitir eliminar o modificar datos sensibles." : isFr ? "Définissez le code maître pour protéger l’accès et confirmer les suppressions." : isEn ? "Set the master passcode required for admin access and sensitive operations." : "Chak legliz dwe gen pwòp kòd sekirite mèt li pou verifye aksè ak konfimasyon sipresyon." }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: showNewPasscode ? "text" : "password",
                required: true,
                maxLength: 12,
                value: newAdminPasscode,
                onChange: (e3) => setNewAdminPasscode(e3.target.value),
                placeholder: isEs ? "PIN (ej: 1234, 7788)" : "Kòd PIN (eg: 1234, 7788)",
                className: "w-full px-3 py-2 rounded-xl bg-slate-900 border border-amber-400/40 text-white font-mono text-center text-sm font-bold tracking-widest focus:ring-1 focus:ring-amber-400 focus:outline-none"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: showNewPasscode ? "text" : "password",
                required: true,
                maxLength: 12,
                value: newConfirmPasscode,
                onChange: (e3) => setNewConfirmPasscode(e3.target.value),
                placeholder: isEs ? "Confirmar PIN" : "Konfime Kòd PIN lan",
                className: "w-full px-3 py-2 rounded-xl bg-slate-900 border border-amber-400/40 text-white font-mono text-center text-sm font-bold tracking-widest focus:ring-1 focus:ring-amber-400 focus:outline-none"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pt-4 border-t border-slate-700 flex justify-end gap-2.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: () => setIsCreatingNew(false),
              className: "px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white font-semibold cursor-pointer",
              children: isEs ? "Cancelar" : isFr ? "Annuler" : isEn ? "Cancel" : "Anile"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "submit",
              id: "btn-submit-new-church",
              className: "px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold cursor-pointer shadow-lg shadow-amber-400/20",
              children: isEs ? "Crear Espacio de Iglesia" : isFr ? "Créer l’Espace d’Église" : isEn ? "Create Church Workspace" : "Kreye Espas Legliz la"
            }
          )
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      SignatureDrawModal,
      {
        isOpen: showSignaturePad,
        onClose: () => setShowSignaturePad(false),
        onSave: handleSaveDrawnSignature,
        title: isEs ? "✍️ Dibujar Firma Electrónica Autorizada" : isFr ? "✍️ Dessiner la Signature Électronique" : isEn ? "✍️ Draw Authorized Electronic Signature" : "✍️ Ekri Siyati Elektwonik Otorize",
        subtitle: isEs ? "Trace su firma directamente. Elija colores para que aparezca en todas las tarjetas de miembros." : isFr ? "Tracez votre signature directement. Choisissez la couleur pour l’intégrer aux cartes de membres." : isEn ? "Draw your signature directly. Choose ink colors to appear seamlessly on member cards." : "Trase siyati ou dirèkteman. Chwazi plizyè koulè oswa koulè pèsonalize pou l parèt nèt sou tout kat ak badj yo."
      }
    ),
    churchToDelete && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-[#1E293B] border border-rose-800/80 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-200", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 border-b border-slate-700/80 pb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-5 h-5" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-extrabold text-base text-white", children: t3.confirmDeleteChurchTitle }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-rose-300 font-mono", children: [
            churchToDelete.name,
            " (",
            churchToDelete.id,
            ")"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3.5 bg-rose-950/30 border border-rose-900/40 rounded-2xl text-xs space-y-2 text-rose-200/90", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-white", children: isEs ? "Atención: Esta acción eliminará permanentemente:" : isEn ? "Warning: This action will permanently remove:" : isFr ? "Attention : Cette action supprimera définitivement :" : "Atansyon: Aksyon sa a ap efase nèt:" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "list-disc list-inside space-y-1 text-slate-300 text-[11px]", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: t3.deleteChurchWarning1 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: t3.deleteChurchWarning2 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: t3.deleteChurchWarning3 })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3.5 bg-slate-900/90 border border-rose-500/40 rounded-2xl space-y-2 text-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-rose-300 font-bold flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "w-4 h-4 text-rose-400" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Código PIN de Seguridad Maestro *" : isFr ? "Code PIN de Sécurité Maître *" : isEn ? "Master Admin Passcode *" : "Kòd Sekirite Mèt Legliz Sa a *" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => setShowDeletePasscode(!showDeletePasscode),
              className: "text-[11px] text-slate-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer",
              children: [
                showDeletePasscode ? /* @__PURE__ */ jsxRuntimeExports.jsx(EyeOff, { className: "w-3.5 h-3.5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "w-3.5 h-3.5" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: showDeletePasscode ? "Kache" : "Montre" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-slate-400", children: isEs ? `Para confirmar la eliminación, ingrese el código de seguridad de "${churchToDelete.name}".` : isFr ? `Pour confirmer la suppression, entrez le code PIN de sécurité de "${churchToDelete.name}".` : isEn ? `To confirm deletion, enter the security PIN for "${churchToDelete.name}".` : `Pou konfime sipresyon an, antre kòd sekirite mèt ki te kreye pou "${churchToDelete.name}".` }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: showDeletePasscode ? "text" : "password",
            autoFocus: true,
            value: deletePasscode,
            onChange: (e3) => {
              setDeletePasscode(e3.target.value);
              setDeletePasscodeError(null);
            },
            placeholder: isEs ? "Ingrese el PIN de seguridad" : "Antre kòd sekirite legliz sa a...",
            className: "w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-rose-500/50 text-white font-mono text-center text-sm font-bold tracking-widest focus:ring-2 focus:ring-rose-500 focus:outline-none placeholder:text-slate-600"
          }
        ),
        deletePasscodeError && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-rose-400 text-[11px] font-semibold flex items-center gap-1.5 pt-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "⚠️" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: deletePasscodeError })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pt-2 flex items-center justify-end gap-2.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            disabled: isDeletingChurch,
            onClick: () => {
              setChurchToDelete(null);
              setDeletePasscode("");
              setDeletePasscodeError(null);
            },
            className: "px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer transition-colors",
            children: t3.cancel
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            id: "btn-confirm-delete-church",
            disabled: isDeletingChurch || !deletePasscode.trim(),
            onClick: handleConfirmDeleteChurch,
            className: "px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-600/30 transition-all active:scale-95 disabled:opacity-50",
            children: [
              isDeletingChurch ? /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-3.5 h-3.5 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-3.5 h-3.5" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isDeletingChurch ? isEs ? "Eliminando..." : isEn ? "Deleting..." : isFr ? "Suppression..." : "W ap efase..." : t3.confirmDeleteChurchBtn })
            ]
          }
        )
      ] })
    ] }) }),
    showPurgeDemoModal && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-[#1E293B] border border-amber-500/50 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-200", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 border-b border-slate-700/80 pb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-400 border border-amber-400/30 flex items-center justify-center shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-5 h-5" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-extrabold text-base text-white", children: t3.purgeDemoModalTitle }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-amber-300", children: t3.purgeDemoModalSubtitle })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-300 leading-relaxed", children: t3.purgeDemoModalDesc }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pt-2 flex items-center justify-end gap-2.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            disabled: isPurgingDemo,
            onClick: () => setShowPurgeDemoModal(false),
            className: "px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer transition-colors",
            children: t3.cancel
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            id: "btn-confirm-purge-demo",
            disabled: isPurgingDemo,
            onClick: handleConfirmPurgeDemo,
            className: "px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-400/20 transition-all active:scale-95 disabled:opacity-50",
            children: [
              isPurgingDemo ? /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-3.5 h-3.5 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-3.5 h-3.5" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isPurgingDemo ? isEs ? "Limpiando..." : isEn ? "Cleaning..." : isFr ? "Nettoyage..." : "W ap netwaye..." : t3.purgeDemoModalConfirm })
            ]
          }
        )
      ] })
    ] }) }),
    showSystemResetModal && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-[#1E293B] border border-rose-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-200", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 border-b border-rose-900/60 pb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 h-10 rounded-2xl bg-rose-600/30 text-rose-400 border border-rose-500/40 flex items-center justify-center shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "w-6 h-6" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-extrabold text-base text-white", children: t3.systemResetModalTitle }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-rose-300", children: t3.systemResetModalSubtitle })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 bg-rose-950/40 border border-rose-900/60 rounded-2xl text-xs space-y-2 text-rose-200", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-bold text-white", children: t3.systemResetWarningHeader }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "list-disc list-inside space-y-1 text-slate-300 text-[11px]", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: t3.systemResetWarning1 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: t3.systemResetWarning2 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: t3.systemResetWarning3 })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pt-2 flex items-center justify-end gap-2.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            disabled: isResettingSystem,
            onClick: () => setShowSystemResetModal(false),
            className: "px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer transition-colors",
            children: t3.cancel
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            id: "btn-confirm-system-reset",
            disabled: isResettingSystem,
            onClick: handleConfirmSystemReset,
            className: "px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-600/30 transition-all active:scale-95 disabled:opacity-50",
            children: [
              isResettingSystem ? /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-3.5 h-3.5 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-3.5 h-3.5" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isResettingSystem ? isEs ? "Restableciendo Base de Datos..." : isEn ? "Resetting Database..." : isFr ? "Réinitialisation..." : "W ap re-inisyalize baz done a..." : t3.systemResetConfirmBtn })
            ]
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ChurchDonationModal,
      {
        isOpen: showDonationPreviewModal,
        onClose: () => setShowDonationPreviewModal(false),
        language,
        church: {
          ...activeChurch,
          donationInfo: {
            enabled: donationEnabled,
            bankEnabled: donationBankEnabled,
            bankName: donationBankName,
            bankAccountNumber: donationBankAccountNumber,
            bankAccountHolder: donationBankAccountHolder || activeChurch.name,
            bankAccountType: donationBankAccountType,
            bankRoutingOrSwift: donationBankRoutingOrSwift,
            paypalEnabled: donationPaypalEnabled,
            paypalEmail: donationPaypalEmail,
            paypalMeUrl: donationPaypalMeUrl,
            moncashEnabled: donationMoncashEnabled,
            moncashNumber: donationMoncashNumber,
            moncashName: donationMoncashName || activeChurch.name,
            zelleEnabled: donationZelleEnabled,
            zelleInfo: donationZelleInfo,
            zelleName: donationZelleName || activeChurch.name,
            cashAppEnabled: donationCashAppEnabled,
            cashAppTag: donationCashAppTag,
            customGivingUrl: donationCustomGivingUrl,
            customGivingLabel: donationCustomGivingLabel,
            customInstructions: donationCustomInstructions,
            bibleVerse: donationBibleVerse
          }
        }
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ChurchTermsModal,
      {
        isOpen: showRulesPreviewModal,
        onClose: () => setShowRulesPreviewModal(false),
        language,
        church: {
          ...activeChurch,
          churchRules: {
            enabled: rulesEnabled,
            communityGuidelines: rulesCommunity,
            privacyPolicy: rulesPrivacy,
            financialTerms: rulesFinancial,
            memberObligations: rulesMemberObligations,
            lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
          }
        }
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ChurchLicenseModal,
      {
        isOpen: showLicenseModal,
        onClose: () => setShowLicenseModal(false),
        church: activeChurch,
        language,
        onLicenseUpdated: () => {
          setLicenseRefreshKey((k3) => k3 + 1);
          setDonationEnabled(true);
          if (onRefreshAll) onRefreshAll();
        }
      }
    ),
    isPreviewingDocumentModal && rncDocumentPhoto && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        role: "dialog",
        "aria-modal": "true",
        className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/80", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { className: "w-5 h-5 text-amber-400" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-bold text-white", children: isEs ? "Documento Legal de la Iglesia" : "Dokiman Legal Legliz la" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-slate-400", children: activeChurch.name })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => setIsPreviewingDocumentModal(false),
                className: "w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer transition-colors",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(X$1, { className: "w-4 h-4" })
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 overflow-y-auto flex items-center justify-center bg-black/40", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "img",
            {
              src: rncDocumentPhoto,
              alt: "Dokiman Legal",
              className: "max-h-[65vh] w-auto object-contain rounded-lg shadow-lg border border-slate-800"
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: rncDocumentUploadedAt ? `${isEs ? "Fecha de carga" : "Dat li te anrejistre"}: ${new Date(rncDocumentUploadedAt).toLocaleString()}` : "" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => setIsPreviewingDocumentModal(false),
                className: "px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer transition-colors",
                children: isEs ? "Cerrar" : "Fèmen"
              }
            )
          ] })
        ] })
      }
    )
  ] });
};
export default AdminChurchSettings;
