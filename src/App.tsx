import React, * as reactExports from "react";
import * as _jsxRuntime from "react/jsx-runtime";
import type { Member } from "./types";
const jsxRuntimeExports: any = _jsxRuntime;

import { motion, AnimatePresence } from "motion/react";
import {
  Wrench,
  Radio,
  Download,
  X as X$1,
  Building2,
  Camera,
  QrCode,
  LayoutDashboard,
  CircleCheck,
  Users,
  Printer,
  Calendar,
  History,
  Bell,
  Settings,
  House,
  User2,
  UserCheck,
  ShieldAlert,
  Mail,
  RefreshCw,
  Megaphone,
} from "lucide-react";
import {
  getAllChurches,
  getChurchById,
  getMembersByChurch,
  getServicesByChurch,
  getAnnouncementsByChurch,
  getLocalizedAnnouncementTitle,
  getLocalizedAnnouncementContent,
  deduplicateAnnouncements,
  getAttendanceByChurch,
  syncServiceAbsencesAutomatically,
  getNextServiceAutoSyncDelayMs,
  getSavedActiveChurchId,
  setSavedActiveChurchId,
  getSavedActiveRole,
  setSavedActiveRole,
  getSavedActiveMemberId,
  setSavedActiveMemberId,
  setServiceActiveStatus,
  isDeviceOnline,
  getPendingOfflineAttendanceCount,
  syncPendingOfflineAttendance,
  getSavedLanguage,
  setSavedLanguage,
  clearSavedLanguagePreference,
  hasUserChosenInitialLanguage,
  setHasUserChosenInitialLanguage,
  isChurchAdminAuthorized,
  authorizeChurchAdminSession,
  revokeChurchAdminSession,
  lockChurchAdminSession,
  clearChurchAdminLock,
  isChurchAdminLocked,
  saveToStorage,
  saveChurch,
  loadFromStorage,
  STORAGE_KEYS,
  isMemberMarkedDeleted,
  isServiceMarkedDeleted,
  isAnnouncementMarkedDeleted,
  isAttendanceMarkedDeleted,
  markChurchAsDeleted,
  isChurchMarkedDeleted,
  markMemberAsDeleted,
  markServiceAsDeleted,
  markAnnouncementAsDeleted,
  markAttendanceAsDeleted,
  hasPendingLocalUpload,
  clearPendingLocalUpload,
  reconcileServerSnapshotWithLocal,
  pruneAnnouncementInteractionsByTarget,
  reconcileRemoteChurchWithLocalPasscode,
  isServiceEnded,
  getMemberCrossChurchVisits,
  unifyMemberProfile,
  resolveAdminOwnedChurches,
  getRememberedAdminLogin,
} from "./utils/storage";
import { getMemberPermissions, isServiceCurrentlyActive } from "./utils/permissions";
import {
  initializeFirestoreDataIfEmpty,
  fetchInitialChurches,
  subscribeToActiveChurch,
  subscribeToSingleMember,
  subscribeToMemberAttendance,
  subscribeToMemberVisitorVisits,
  subscribeToMembers,
  subscribeToServices,
  subscribeToAnnouncements,
  subscribeToAttendance,
  firestoreSaveChurch,
  firestoreEnsureChurchExists,
  syncChurchAdminOwnershipWithCloud,
  firestoreAddMember,
  firestoreAddService,
  firestoreAddAnnouncement,
  firestoreEnsureDeaconUserProfile,
  isLegacyDemoMember,
  isLegacyDemoService,
  isLegacyDemoAnnouncement,
  isLegacyDemoAttendance,
} from "./services/firestoreService";
import { translations } from "./utils/i18n";
import { useToast } from "./context/ToastContext";
import { useAuth } from "./context/AuthContext";
import { churchStore } from "./store/useChurchStore";
import { Navbar } from "./components/Navbar";
import { QrScannerModal } from "./components/QrScannerModal";
import { UserTutorialModal } from "./components/common/UserTutorialModal";
import { EmptyChurchOnboarding } from "./components/common/EmptyChurchOnboarding";
import { LanguageSelectionModal } from "./components/common/LanguageSelectionModal";
import { DesktopAppDownloadModal } from "./components/common/DesktopAppDownloadModal";
import { AdminPasscodeModal } from "./components/admin/AdminPasscodeModal";
import { CreateChurchModal } from "./components/admin/CreateChurchModal";
import { AdminEmailVerificationScreen } from "./components/admin/AdminEmailVerificationScreen";
import { auth } from "./lib/firebase";
import {
  EMAIL_VERIFICATION_RESEND_COOLDOWN_SEC,
  shouldPromptPostCreationEmailVerification,
  shouldShowProfileResendVerificationButton,
  needsInlineReauthForVerification,
  computeResendCooldownRemaining,
  getVerificationEmailLastSentAt,
  recordVerificationEmailSent,
} from "./utils/emailVerificationFlow";
import { DeveloperAuthModal } from "./components/developer/DeveloperAuthModal";
import { DeveloperEnginePage } from "./components/developer/DeveloperEnginePage";
import { MemberPublicVerificationPage } from "./components/public/MemberPublicVerificationPage";
import { getDeveloperSettings, subscribeToDeveloperSettings } from "./utils/developerStorage";
import { admobEngine } from "./services/admobService";
import { SponsorMarqueeFooter } from "./components/common/SponsorMarqueeFooter";
import { OmniChurchLogo } from "./components/common/OmniChurchLogo";
import { SplashScreen } from "./components/common/SplashScreen";
import { AdMobBannerAd } from "./components/common/AdMobBannerAd";
import { DevicePermissionBanner } from "./components/common/DevicePermissionBanner";
import { initializeAppPermissions } from "./utils/devicePermissions";
import { AppUpdateModal } from "./components/common/AppUpdateModal";
import {
  getAppVersionInfo,
  shouldPromptUpdateModal,
  subscribeToAppUpdates,
  recordUpdatePromptedThisSession,
  dismissCurrentUpdate,
  verifyAndRestoreSessionIntegrity,
  notifyAppUpdateChanged,
} from "./services/appUpdateService";
import { MemberHome } from "./components/member/MemberHome";
import { MemberServices } from "./components/member/MemberServices";
import { MemberCard } from "./components/member/MemberCard";
import { MemberAttendanceHistory } from "./components/member/MemberAttendanceHistory";
import { MemberProfile } from "./components/member/MemberProfile";
import { MemberLoginScreen } from "./components/member/MemberLoginScreen";
import { ReceptionDeskPanel } from "./components/member/ReceptionDeskPanel";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { AdminMembers } from "./components/admin/AdminMembers";
import { AdminAnnouncements } from "./components/admin/AdminAnnouncements";
import { AdminServices } from "./components/admin/AdminServices";
import { AdminAttendance } from "./components/admin/AdminAttendance";
import { AdminChurchSettings } from "./components/admin/AdminChurchSettings";
import { AdminCardsPage } from "./components/admin/AdminCardsPage";
import { AdminServiceHistory } from "./components/admin/AdminServiceHistory";
import { NotificationsPage } from "./components/notifications/NotificationsPage";
import { DonationScreen } from "./components/common/DonationScreen";
import { PrivacyPolicy } from "./components/legal/PrivacyPolicy";
import { TermsOfService } from "./components/legal/TermsOfService";
import {
  parseLegalRouteFromUrl,
  getLegalDocumentPath,
  normalizeOfficialLegalUrl,
  LegalPageType,
} from "./utils/legalRoutes";
import { openExternalUrlSafely } from "./utils/safeExternalLink";
import {
  resolveInitialLanguageSync,
  detectGeoCountryAsync,
  sanitizeLanguageConfig,
  getUrlLanguageOverride,
  getLanguageDisplayName,
} from "./utils/languageDetection";

export function App() {
  const toast = useToast();
  const {
    googleUser,
    isLoadingAuth,
    isEmailVerified,
    resendAdminVerificationEmail,
    refreshAuthUserState,
    signInWithGoogle,
  } = useAuth();
  const [adminCloudSyncAlert, setAdminCloudSyncAlert] = reactExports.useState<{
    churchId: string;
    email: string;
  } | null>(null);
  const [isHandlingAdminSyncAction, setIsHandlingAdminSyncAction] = reactExports.useState(false);
  const [isResendingAdminBannerVerif, setIsResendingAdminBannerVerif] = reactExports.useState(false);
  const [adminBannerVerifCooldown, setAdminBannerVerifCooldown] = reactExports.useState(0);
  reactExports.useEffect(() => {
    if (adminBannerVerifCooldown <= 0) return;
    const id = window.setInterval(() => {
      setAdminBannerVerifCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [adminBannerVerifCooldown > 0]);
  const lastAdminSyncKeyRef = reactExports.useRef<string>("");
  const [activeChurchId, setActiveChurchId] = reactExports.useState(() => getSavedActiveChurchId());
  const [userRole, setUserRole] = reactExports.useState(() => getSavedActiveRole());
  const [activeMemberId, setActiveMemberId] = reactExports.useState(() => getSavedActiveMemberId());
  const [languageResolution, setLanguageResolution] = reactExports.useState(() => {
    const cfg = sanitizeLanguageConfig(getDeveloperSettings().languageConfig);
    return resolveInitialLanguageSync({
      config: cfg,
      hasUserExplicitChoice: hasUserChosenInitialLanguage(),
    });
  });
  const [language, setLanguage] = reactExports.useState(() => getSavedLanguage());
  const [isLanguageModalOpen, setIsLanguageModalOpen] = reactExports.useState(
    () =>
      !hasUserChosenInitialLanguage() &&
      sanitizeLanguageConfig(getDeveloperSettings().languageConfig).showInitialModalOnFirstVisit
  );
  const [isAdminPasscodeModalOpen, setIsAdminPasscodeModalOpen] = reactExports.useState(false);
  const [pendingAdminChurch, setPendingAdminChurch] = reactExports.useState(null);
  const [isAutoLocked, setIsAutoLocked] = reactExports.useState(false);
  const lastAdminActivityRef = reactExports.useRef(Date.now());
  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    setSavedLanguage(newLang);
    setHasUserChosenInitialLanguage(true);
    setLanguageResolution((prev) => ({
      ...prev,
      language: newLang,
      source: "user_saved",
    }));
  };
  const handleAutoDetectLanguage = reactExports.useCallback(async () => {
    clearSavedLanguagePreference();
    const cfg = sanitizeLanguageConfig(getDeveloperSettings().languageConfig);
    let geo = null;
    if (cfg.autoDetectByCountry && cfg.useNetworkGeoFallback && isDeviceOnline()) {
      geo = await detectGeoCountryAsync();
    }
    const resolved = resolveInitialLanguageSync({
      config: { ...cfg, mode: "auto" },
      hasUserExplicitChoice: false,
      geoCountryCode: geo,
      urlLang: null,
    });
    setLanguage(resolved.language);
    setLanguageResolution(resolved);
    const matchedLangName = getLanguageDisplayName(resolved.language, resolved.language);
    toast.info(
      resolved.language === "es"
        ? "Idioma detectado automáticamente"
        : resolved.language === "fr"
        ? "Langue détectée automatiquement"
        : resolved.language === "en"
        ? "Language auto-detected"
        : "Lang Detekte Otomatikman",
      `${matchedLangName}${resolved.detectedCountryCode ? ` (${resolved.detectedCountryCode})` : ""}`
    );
  }, [toast]);
  const autoDetectedBadge = reactExports.useMemo(() => {
    if (
      languageResolution.source !== "country_position" &&
      languageResolution.source !== "browser"
    ) {
      return null;
    }
    const country = languageResolution.detectedCountryCode;
    if (language === "es") {
      return country ? `Idioma detectado automáticamente (${country})` : "Idioma detectado automáticamente";
    }
    if (language === "fr") {
      return country ? `Langue détectée automatiquement (${country})` : "Langue détectée automatiquement";
    }
    if (language === "en") {
      return country ? `Auto-detected by region (${country})` : "Auto-detected by device";
    }
    return country ? `Lang detekte otomatikman selon pozisyon (${country})` : "Lang detekte otomatikman selon aparèy la";
  }, [languageResolution, language]);
  const [memberTab, setMemberTab] = reactExports.useState("home");
  const [adminTab, setAdminTab] = reactExports.useState("dashboard");
  const [historyInitialServiceId, setHistoryInitialServiceId] = reactExports.useState(void 0);
  const [cardTargetMember, setCardTargetMember] = reactExports.useState(null);
  const [serviceCategoryInitial, setServiceCategoryInitial] = reactExports.useState("dominical");
  reactExports.useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.remove("light-mode");
      document.documentElement.classList.add("dark-mode");
    }
  }, []);
  reactExports.useEffect(() => {
    initializeAppPermissions().then(({ camera }) => {
      if (camera) {
        console.log("✓ OmniChurch: Android device permissions verified and active.");
      }
    });
  }, []);
  const [isScannerOpen, setIsScannerOpen] = reactExports.useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = reactExports.useState(false);
  const [isDesktopModalOpen, setIsDesktopModalOpen] = reactExports.useState(false);
  const [isCreateChurchModalOpen, setIsCreateChurchModalOpen] = reactExports.useState(false);
  const [postCreationVerifyChurch, setPostCreationVerifyChurch] = reactExports.useState<any>(null);
  const [isDevAuthModalOpen, setIsDevAuthModalOpen] = reactExports.useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const search = new URLSearchParams(window.location.search);
      const hash = (window.location.hash || "").toLowerCase();
      return search.has("dev") || hash === "#dev" || hash.startsWith("#dev?");
    } catch {
      return false;
    }
  });
  const [isDevEngineModalOpen, setIsDevEngineModalOpen] = reactExports.useState(false);
  const [isNotificationsPageOpen, setIsNotificationsPageOpen] = reactExports.useState(false);
  const [isDonateScreenOpen, setIsDonateScreenOpen] = reactExports.useState(false);
  const parseVerificationUrlParams = (): {
    isOpen: boolean;
    memberCode: string;
    churchId?: string;
    lang?: "ht" | "fr" | "en" | "es";
  } => {
    if (typeof window === "undefined") return { isOpen: false, memberCode: "" };
    try {
      const search = new URLSearchParams(window.location.search);
      const hash = window.location.hash || "";
      const hashSearch = hash.includes("?")
        ? new URLSearchParams(hash.substring(hash.indexOf("?")))
        : new URLSearchParams();
      const member =
        search.get("member") ||
        search.get("memberId") ||
        search.get("verify_member") ||
        search.get("m") ||
        hashSearch.get("member") ||
        hashSearch.get("memberId") ||
        hashSearch.get("verify_member") ||
        hashSearch.get("m") ||
        "";
      const church =
        search.get("church") ||
        search.get("churchId") ||
        search.get("c") ||
        hashSearch.get("church") ||
        hashSearch.get("churchId") ||
        hashSearch.get("c") ||
        "";
      const isVerifyFlag =
        search.has("verify") ||
        search.has("verify_member") ||
        search.has("verification") ||
        hash.toLowerCase().includes("verify") ||
        (Boolean(member.trim()) && Boolean(church.trim()));
      const rawLang = (search.get("lang") || hashSearch.get("lang") || "")
        .trim()
        .toLowerCase();
      const lang =
        rawLang === "ht" || rawLang === "fr" || rawLang === "en" || rawLang === "es"
          ? rawLang
          : undefined;
      if (isVerifyFlag && member.trim()) {
        return {
          isOpen: true,
          memberCode: member.trim(),
          churchId: church.trim() || void 0,
          lang
        };
      }
    } catch {
    }
    return { isOpen: false, memberCode: "" };
  };
  const [verificationView, setVerificationView] = reactExports.useState(() =>
    parseVerificationUrlParams()
  );
  const [activeLegalPage, setActiveLegalPage] = reactExports.useState<LegalPageType>(() =>
    parseLegalRouteFromUrl()
  );
  const openLegalPage = reactExports.useCallback((page: "privacy" | "terms", forceInternal = false) => {
    if (!forceInternal) {
      try {
        const legalCfg = getDeveloperSettings().legalConfig;
        if (legalCfg?.useExternalLinksOnClick) {
          const rawUrl = page === "privacy" ? legalCfg.officialPrivacyUrl : legalCfg.officialTermsUrl;
          const cleanUrl = normalizeOfficialLegalUrl(rawUrl);
          if (cleanUrl) {
            openExternalUrlSafely(cleanUrl);
            return;
          }
        }
      } catch {
      }
    }
    setActiveLegalPage(page);
    if (typeof window !== "undefined") {
      try {
        const nextUrl = getLegalDocumentPath(page);
        window.history.replaceState({ legalPage: page }, document.title, nextUrl);
      } catch {
      }
      try {
        window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
      } catch {
        window.scrollTo(0, 0);
      }
    }
  }, []);
  const closeLegalPage = reactExports.useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        window.close();
      } catch {
      }
    }
  }, []);
  reactExports.useEffect(() => {
    const handleUrlChange = () => {
      const parsed = parseVerificationUrlParams();
      if (parsed.isOpen && parsed.memberCode) {
        setVerificationView(parsed);
      }
      const nextLegal = parseLegalRouteFromUrl();
      setActiveLegalPage((prev) => {
        if (nextLegal) return nextLegal;
        if (prev) {
          try {
            window.close();
          } catch {
          }
          try {
            const lockedPath = getLegalDocumentPath(prev);
            window.history.replaceState({ legalPage: prev }, document.title, lockedPath);
          } catch {
          }
          return prev;
        }
        return null;
      });
    };
    window.addEventListener("popstate", handleUrlChange);
    window.addEventListener("hashchange", handleUrlChange);
    return () => {
      window.removeEventListener("popstate", handleUrlChange);
      window.removeEventListener("hashchange", handleUrlChange);
    };
  }, []);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = reactExports.useState(() => {
    return shouldPromptUpdateModal();
  });
  const [versionInfo, setVersionInfo] = reactExports.useState(() => getAppVersionInfo());
  reactExports.useEffect(() => {
    const unsub = subscribeToAppUpdates((newInfo) => {
      setVersionInfo(newInfo);
      if (shouldPromptUpdateModal()) {
        setIsUpdateModalOpen(true);
      }
    });
    return unsub;
  }, []);
  reactExports.useEffect(() => {
    if (isUpdateModalOpen) {
      recordUpdatePromptedThisSession();
    }
  }, [isUpdateModalOpen]);
  const handleOpenDeveloperAuth = reactExports.useCallback(() => {
    setIsDevAuthModalOpen(true);
  }, []);
  const [allChurches, setAllChurches] = reactExports.useState(() => getAllChurches());
  const [currentChurch, setCurrentChurch] = reactExports.useState(() => {
    const savedId = getSavedActiveChurchId();
    return getChurchById(savedId) || getAllChurches()[0] || null;
  });
  const [members, setMembers] = reactExports.useState(() => {
    const savedId = getSavedActiveChurchId();
    return getMembersByChurch(savedId);
  });
  const [services, setServices] = reactExports.useState(() => {
    const savedId = getSavedActiveChurchId();
    return getServicesByChurch(savedId);
  });
  const [announcements, setAnnouncements] = reactExports.useState(() => {
    const savedId = getSavedActiveChurchId();
    return getAnnouncementsByChurch(savedId);
  });
  const [attendanceRecords, setAttendanceRecords] = reactExports.useState(() => {
    const savedId = getSavedActiveChurchId();
    return getAttendanceByChurch(savedId);
  });
  const [memberVisitorVisits, setMemberVisitorVisits] = reactExports.useState(() => []);
  const [isOnline, setIsOnline] = reactExports.useState(() => isDeviceOnline());
  const [pendingSyncCount, setPendingSyncCount] = reactExports.useState(() => getPendingOfflineAttendanceCount());
  const authorizedAdmins = reactExports.useMemo(() => {
    var _a3;
    const adminSet = /* @__PURE__ */ new Set();
    try {
      const devSettings = getDeveloperSettings();
      const devEmail = (_a3 = devSettings == null ? void 0 : devSettings.donations) == null ? void 0 : _a3.developerEmail;
      if (devEmail && devEmail.trim()) {
        adminSet.add(devEmail.trim().toLowerCase());
      }
    } catch (_2) {
    }
    allChurches.forEach((c3) => {
      if (c3.adminGoogleEmail && c3.adminGoogleEmail.trim()) {
        adminSet.add(c3.adminGoogleEmail.trim().toLowerCase());
      }
    });
    if ((currentChurch == null ? void 0 : currentChurch.adminGoogleEmail) && currentChurch.adminGoogleEmail.trim()) {
      adminSet.add(currentChurch.adminGoogleEmail.trim().toLowerCase());
    }
    try {
      const savedCustom = localStorage.getItem("app_legiz_authorized_admins");
      if (savedCustom) {
        const parsed = JSON.parse(savedCustom);
        if (Array.isArray(parsed)) {
          parsed.forEach((e3) => {
            if (typeof e3 === "string" && e3.trim()) {
              adminSet.add(e3.trim().toLowerCase());
            }
          });
        }
      }
    } catch (_2) {
    }
    return Array.from(adminSet);
  }, [allChurches, currentChurch]);
  const isGoogleUserAuthorizedAdmin = reactExports.useMemo(() => {
    if (!googleUser || !googleUser.email) return false;
    const cleanEmail = googleUser.email.trim().toLowerCase();
    return authorizedAdmins.some((adminEmail) => adminEmail.toLowerCase() === cleanEmail);
  }, [googleUser, authorizedAdmins]);
  reactExports.useEffect(() => {
    if (isLoadingAuth) return;
    if (userRole === "admin" && currentChurch) {
      const stillAuthed = isChurchAdminAuthorized(
        currentChurch.id,
        googleUser == null ? void 0 : googleUser.email,
        googleUser == null ? void 0 : googleUser.uid
      );
      if (!stillAuthed) {
        revokeChurchAdminSession();
        setUserRole("member");
        setSavedActiveRole("member");
        if (googleUser && googleUser.email && !isGoogleUserAuthorizedAdmin) {
          toast.info(
            language === "es" ? "Sesión de Miembro" : language === "fr" ? "Espace Membre" : language === "en" ? "Member Session" : "Espas Manm",
            language === "es" ? `Conectado como miembro (${googleUser.displayName || googleUser.email}). Opciones de administrador restringidas.` : language === "fr" ? `Connecté en tant que membre (${googleUser.displayName || googleUser.email}). Options d'administrateur masquées.` : language === "en" ? `Connected as member (${googleUser.displayName || googleUser.email}). Administrator options hidden.` : `Ou konekte kòm manm (${googleUser.displayName || googleUser.email}). Opsyon admin yo kache.`
          );
        }
      }
    }
  }, [isLoadingAuth, googleUser, currentChurch, isGoogleUserAuthorizedAdmin, userRole, language]);
  reactExports.useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const pendingBefore = getPendingOfflineAttendanceCount();
      if (pendingBefore > 0) {
        toast.info(
          "Entènèt Retounen",
          `Koneksyon an retabli. N ap senkronize ${pendingBefore} prezans ki te sove offline otomatikman...`
        );
        const res = await syncPendingOfflineAttendance();
        if (res.syncedCount > 0) {
          toast.success(
            "Senkronizasyon Reyisi ✓",
            `${res.syncedCount} prezans senkronize avèk siksè nan nwaj la.`
          );
          setPendingSyncCount(getPendingOfflineAttendanceCount());
        }
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning(
        "Mòd San Entènèt (Offline)",
        "Ou pa gen entènèt kounye a. Tout prezans ap sove lokalman epi y ap senkronize otomatikman lè koneksyon an retounen."
      );
    };
    const handleSyncEvent = (e3) => {
      setPendingSyncCount(getPendingOfflineAttendanceCount());
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("app_legiz_attendance_synced", handleSyncEvent);
    if (isDeviceOnline() && getPendingOfflineAttendanceCount() > 0) {
      syncPendingOfflineAttendance().then((res) => {
        if (res.syncedCount > 0) {
          setPendingSyncCount(getPendingOfflineAttendanceCount());
        }
      });
    }
    verifyAndRestoreSessionIntegrity();
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("app_legiz_attendance_synced", handleSyncEvent);
    };
  }, [toast]);
  const syncedLocalIdsRef = reactExports.useRef(/* @__PURE__ */ new Set<string>());
  reactExports.useEffect(() => {
    initializeFirestoreDataIfEmpty();
    fetchInitialChurches(25).then((fetchedChurches) => {
      if (!fetchedChurches || fetchedChurches.length === 0) return;
      const localChurches = getAllChurches();
      const localById = new Map(localChurches.map((c) => [c.id, c]));
      const mergedMap = new Map<string, any>(localChurches.map((c) => [c.id, c]));
      for (const remoteChurch of fetchedChurches) {
        if (isChurchMarkedDeleted(remoteChurch.id)) continue;
        const localMatch = localById.get(remoteChurch.id);
        const { church: finalChurch, needsFirestoreReconcile } = reconcileRemoteChurchWithLocalPasscode(
          remoteChurch,
          localMatch
        );
        const reconcileKey = `church_sync_${finalChurch.id}_${finalChurch.adminPasscode || ""}_${finalChurch.adminGoogleUid || ""}`;
        if (needsFirestoreReconcile && !syncedLocalIdsRef.current.has(reconcileKey)) {
          syncedLocalIdsRef.current.add(reconcileKey);
          firestoreSaveChurch(finalChurch, {
            deliberatePasscodeUpdate: Boolean(finalChurch.adminPasscode),
          })
            .then(() => clearPendingLocalUpload("church", finalChurch.id))
            .catch(() => {
              syncedLocalIdsRef.current.delete(reconcileKey);
            });
        }
        mergedMap.set(finalChurch.id, finalChurch);
      }
      const reconciledChurches = Array.from(mergedMap.values());
      if (reconciledChurches.length > 0) {
        saveToStorage(STORAGE_KEYS.CHURCHES, reconciledChurches);
        setAllChurches((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(reconciledChurches)) return prev;
          return reconciledChurches;
        });
        churchStore.setAllChurches(reconciledChurches);
      }
    });
    admobEngine.initialize().catch(() => {
    });
    const unsubDevSettings = subscribeToDeveloperSettings((newSettings) => {
      notifyAppUpdateChanged();
      if (newSettings == null ? void 0 : newSettings.adMob) {
        admobEngine.initialize(newSettings.adMob).catch(() => {
        });
      }
      if (!hasUserChosenInitialLanguage() && !getUrlLanguageOverride()) {
        const nextCfg = sanitizeLanguageConfig(newSettings == null ? void 0 : newSettings.languageConfig);
        const resolved = resolveInitialLanguageSync({
          config: nextCfg,
          hasUserExplicitChoice: false,
        });
        setLanguage(resolved.language);
        setLanguageResolution(resolved);
        if (!nextCfg.showInitialModalOnFirstVisit) {
          setIsLanguageModalOpen(false);
        }
      }
    });
    const startupCfg = sanitizeLanguageConfig(getDeveloperSettings().languageConfig);
    if (
      !hasUserChosenInitialLanguage() &&
      !getUrlLanguageOverride() &&
      startupCfg.mode === "auto" &&
      startupCfg.autoDetectByCountry &&
      startupCfg.useNetworkGeoFallback
    ) {
      detectGeoCountryAsync().then((geoCountry) => {
        if (!geoCountry || hasUserChosenInitialLanguage() || getUrlLanguageOverride()) return;
        const latestCfg = sanitizeLanguageConfig(getDeveloperSettings().languageConfig);
        if (latestCfg.mode !== "auto" || !latestCfg.autoDetectByCountry) return;
        const refined = resolveInitialLanguageSync({
          config: latestCfg,
          hasUserExplicitChoice: false,
          geoCountryCode: geoCountry,
        });
        setLanguage(refined.language);
        setLanguageResolution(refined);
      }).catch(() => {
      });
    }
    const handleDevLanguageApplied = (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail;
      if (detail && detail.language) {
        setLanguage(detail.language);
        setLanguageResolution((prev) => ({
          ...prev,
          language: detail.language,
          source: detail.source || prev.source,
          detectedCountryCode: detail.detectedCountryCode ?? prev.detectedCountryCode,
        }));
      }
    };
    window.addEventListener("omnichurch_dev_language_applied", handleDevLanguageApplied);
    return () => {
      unsubDevSettings();
      window.removeEventListener("omnichurch_dev_language_applied", handleDevLanguageApplied);
    };
  }, []);
  reactExports.useEffect(() => {
    if (!activeChurchId) return;
    const unsubActiveChurch = subscribeToActiveChurch(activeChurchId, (remoteChurch, meta) => {
      if (!remoteChurch) {
        if (meta && !meta.fromCache && !meta.hasPendingWrites && !hasPendingLocalUpload("church", activeChurchId)) {
          markChurchAsDeleted(activeChurchId);
          const remainingChurches = getAllChurches().filter((c) => c.id !== activeChurchId);
          saveToStorage(STORAGE_KEYS.CHURCHES, remainingChurches);
          saveToStorage(
            STORAGE_KEYS.MEMBERS,
            loadFromStorage(STORAGE_KEYS.MEMBERS, []).filter((m2) => m2.churchId !== activeChurchId)
          );
          saveToStorage(
            STORAGE_KEYS.SERVICES,
            loadFromStorage(STORAGE_KEYS.SERVICES, []).filter((s3) => s3.churchId !== activeChurchId)
          );
          saveToStorage(
            STORAGE_KEYS.ANNOUNCEMENTS,
            loadFromStorage(STORAGE_KEYS.ANNOUNCEMENTS, []).filter((a2) => a2.churchId !== activeChurchId)
          );
          saveToStorage(
            STORAGE_KEYS.ATTENDANCE,
            loadFromStorage(STORAGE_KEYS.ATTENDANCE, []).filter((att) => att.churchId !== activeChurchId)
          );
          saveToStorage(
            STORAGE_KEYS.PENDING_ATTENDANCE,
            loadFromStorage(STORAGE_KEYS.PENDING_ATTENDANCE, []).filter((att) => att.churchId !== activeChurchId)
          );
          revokeChurchAdminSession(activeChurchId);
          setAllChurches(remainingChurches);
          churchStore.setAllChurches(remainingChurches);
          setActiveMemberId("");
          setSavedActiveMemberId("");
          setMemberVisitorVisits([]);
          if (remainingChurches.length > 0) {
            const nextChurch = remainingChurches[0];
            setActiveChurchId(nextChurch.id);
            setSavedActiveChurchId(nextChurch.id);
            setCurrentChurch(nextChurch);
            churchStore.setCurrentChurch(nextChurch);
          } else {
            setActiveChurchId("");
            setSavedActiveChurchId("");
            setCurrentChurch(null);
            churchStore.setCurrentChurch(null);
            setMembers([]);
            setServices([]);
            setAnnouncements([]);
            setAttendanceRecords([]);
          }
          toast.warning(
            language === "es" ? "Iglesia eliminada" : language === "fr" ? "Église supprimée" : language === "en" ? "Church removed" : "Legliz Siprime",
            language === "es"
              ? "Esta iglesia fue eliminada en tiempo real desde otra sesión."
              : language === "fr"
              ? "Cette église a été supprimée en temps réel depuis une autre session."
              : language === "en"
              ? "This church was deleted in real time from another session."
              : "Legliz sa a siprime an tan reyèl sou sèvè a."
          );
        }
        return;
      }
      if (isChurchMarkedDeleted(remoteChurch.id)) return;
      const localChurches = getAllChurches();
      const localMatch = localChurches.find((c) => c.id === remoteChurch.id);
      const { church: finalChurch, needsFirestoreReconcile } = reconcileRemoteChurchWithLocalPasscode(
        remoteChurch,
        localMatch
      );
      const reconcileKey = `church_sync_${finalChurch.id}_${finalChurch.adminPasscode || ""}_${finalChurch.adminGoogleUid || ""}`;
      if (needsFirestoreReconcile && !syncedLocalIdsRef.current.has(reconcileKey)) {
        syncedLocalIdsRef.current.add(reconcileKey);
        firestoreSaveChurch(finalChurch, {
          deliberatePasscodeUpdate: Boolean(finalChurch.adminPasscode),
        })
          .then(() => clearPendingLocalUpload("church", finalChurch.id))
          .catch(() => {
            syncedLocalIdsRef.current.delete(reconcileKey);
          });
      }
      const updatedList = localChurches.some((c) => c.id === finalChurch.id)
        ? localChurches.map((c) => (c.id === finalChurch.id ? finalChurch : c))
        : [...localChurches, finalChurch];
      saveToStorage(STORAGE_KEYS.CHURCHES, updatedList);
      setAllChurches((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(updatedList)) return prev;
        return updatedList;
      });
      churchStore.setAllChurches(updatedList);
      setCurrentChurch((prev) => {
        if (prev && JSON.stringify(prev) === JSON.stringify(finalChurch)) return prev;
        return finalChurch;
      });
      churchStore.setCurrentChurch(finalChurch);
    });
    return () => {
      unsubActiveChurch();
    };
  }, [activeChurchId]);
  reactExports.useEffect(() => {
    if (allChurches.length > 0) {
      const found =
        allChurches.find((c3) => c3.id === activeChurchId) ||
        (activeChurchId ? getChurchById(activeChurchId) : undefined) ||
        allChurches[0];
      setCurrentChurch((prev) => {
        if (prev && found && JSON.stringify(prev) === JSON.stringify(found)) return prev;
        return found;
      });
      churchStore.setCurrentChurch(found);
    }
  }, [allChurches, activeChurchId]);
  reactExports.useEffect(() => {
    if (userRole !== "admin" || !currentChurch || !currentChurch.id || !googleUser || !googleUser.uid) {
      setAdminCloudSyncAlert(null);
      return;
    }
    const syncKey = `${currentChurch.id}|${googleUser.uid}|${isEmailVerified ? "1" : "0"}`;
    if (lastAdminSyncKeyRef.current === syncKey) return;
    lastAdminSyncKeyRef.current = syncKey;

    let cancelled = false;
    syncChurchAdminOwnershipWithCloud(currentChurch, { forceTokenRefresh: false })
      .then((res) => {
        if (cancelled) return;
        if (res.synced) {
          setAdminCloudSyncAlert(null);
          if ((res.status === "uid_healed" || res.status === "created_in_cloud") && res.church) {
            saveChurch(res.church);
            clearPendingLocalUpload("church", res.church.id);
            setCurrentChurch(res.church);
            churchStore.setCurrentChurch(res.church);
            const pendingMembers = getMembersByChurch(res.church.id).filter((m) =>
              hasPendingLocalUpload("member", m.id)
            );
            for (const pm of pendingMembers) {
              firestoreAddMember(pm)
                .then(() => clearPendingLocalUpload("member", pm.id))
                .catch(() => {});
            }
          }
        } else if (res.status === "email_verification_required") {
          setAdminCloudSyncAlert({
            churchId: currentChurch.id,
            email: res.expectedEmail || googleUser.email || currentChurch.adminGoogleEmail || "",
          });
        } else if (res.status === "owner_mismatch") {
          const ownedChurches = resolveAdminOwnedChurches(
            getAllChurches(),
            googleUser.uid,
            googleUser.email
          );
          if (ownedChurches.length === 1 && ownedChurches[0].id !== currentChurch.id) {
            const ownedChurch = ownedChurches[0];
            setActiveChurchId(ownedChurch.id);
            setSavedActiveChurchId(ownedChurch.id);
            setCurrentChurch(ownedChurch);
            churchStore.setCurrentChurch(ownedChurch);
          }
        }
      })
      .catch(() => {
        // Non-fatal offline check
      });

    return () => {
      cancelled = true;
    };
  }, [userRole, currentChurch?.id, googleUser?.uid, isEmailVerified]);
  const currentChurchId = currentChurch == null ? void 0 : currentChurch.id;
  const currentChurchCode = currentChurch == null ? void 0 : currentChurch.code;
  const currentMember = members.find((m2) => m2.memberId === activeMemberId);
  const currentMemberDocId = currentMember ? currentMember.id : "";
  const memberPermissions = getMemberPermissions(currentMember);
  const isReceptionMember = userRole === "member" && memberPermissions.isReception;
  const isDeaconMember = userRole === "member" && memberPermissions.isDeacon;
  const canCreateServicesMember = userRole === "member" && memberPermissions.canCreateServices;
  const canPublishAnnouncementsMember = userRole === "member" && memberPermissions.canPublishAnnouncements;
  reactExports.useEffect(() => {
    if (!isDeaconMember || !currentChurchId || !currentMember || !(googleUser == null ? void 0 : googleUser.uid)) {
      return;
    }
    firestoreEnsureDeaconUserProfile(currentChurchId, currentMember).catch(() => {});
  }, [
    isDeaconMember,
    currentChurchId,
    currentMemberDocId,
    currentMember == null ? void 0 : currentMember.role,
    currentMember == null ? void 0 : currentMember.status,
    googleUser == null ? void 0 : googleUser.uid,
  ]);
  reactExports.useEffect(() => {
    if (!currentChurchId) return;
    const churchId = currentChurchId;
    const churchCodeUpper = (currentChurchCode || "").toUpperCase();
    const isAdminOrReception = userRole === "admin" || isReceptionMember;
    const isLoggedInRegularMember = userRole === "member" && Boolean(activeMemberId) && !isReceptionMember;

    // On login screen with no active session, avoid opening church real-time listeners
    if (!isAdminOrReception && !isLoggedInRegularMember) {
      return;
    }

    const unsubs: Array<() => void> = [];

    if (isAdminOrReception) {
      unsubs.push(
        subscribeToMembers(churchId, (churchMembers, meta) => {
          const local = getMembersByChurch(churchId);
          const { merged: filteredClean, pendingToUpload } = reconcileServerSnapshotWithLocal({
            remoteItems: churchMembers,
            localItems: local,
            meta,
            isMarkedDeleted: (m2) => isMemberMarkedDeleted(m2),
            markDeleted: (m2) =>
              markMemberAsDeleted({
                id: m2.id,
                memberId: m2.memberId,
                barcodeToken: m2.barcodeToken,
              }),
            isDemo: (m2) => isLegacyDemoMember(m2),
            isPendingUpload: (id) => hasPendingLocalUpload("member", id),
            mergeItem: (rm, lm) => {
              if (!lm) return unifyMemberProfile(rm);
              if (hasPendingLocalUpload("member", lm.id)) {
                const locallyClearedPhoto = !lm.avatarUrl && !lm.photoUrl && !lm.googlePhoto;
                const unifiedPending = unifyMemberProfile(lm, rm);
                return locallyClearedPhoto
                  ? { ...unifiedPending, avatarUrl: undefined, photoUrl: undefined, googlePhoto: undefined }
                  : unifiedPending;
              }
              return unifyMemberProfile(rm, lm);
            },
          });
          if (userRole === "admin" && pendingToUpload.length > 0) {
            const flushPendingMembers = async () => {
              if (hasPendingLocalUpload("church", churchId) && currentChurch) {
                try {
                  await firestoreSaveChurch(currentChurch, {
                    deliberatePasscodeUpdate: Boolean(currentChurch.adminPasscode),
                  });
                  clearPendingLocalUpload("church", churchId);
                } catch {}
              } else {
                await firestoreEnsureChurchExists(churchId, currentChurch);
              }
              for (const lm of pendingToUpload) {
                const syncKey = `mem_${lm.id}`;
                if (!syncedLocalIdsRef.current.has(syncKey)) {
                  syncedLocalIdsRef.current.add(syncKey);
                  firestoreAddMember(lm)
                    .then(() => clearPendingLocalUpload("member", lm.id))
                    .catch(() => {
                      syncedLocalIdsRef.current.delete(syncKey);
                    });
                }
              }
            };
            flushPendingMembers().catch(() => {});
          }
          setMembers(filteredClean);
          churchStore.setMembers(filteredClean);
          const allOtherMembers = loadFromStorage(STORAGE_KEYS.MEMBERS, []).filter(
            (m2) =>
              m2.churchId !== churchId &&
              (churchCodeUpper ? (m2.churchId || "").toUpperCase() !== churchCodeUpper : true) &&
              !isLegacyDemoMember(m2) &&
              !isMemberMarkedDeleted(m2)
          );
          saveToStorage(STORAGE_KEYS.MEMBERS, [...allOtherMembers, ...filteredClean]);
        })
      );

      unsubs.push(
        subscribeToAttendance(churchId, (churchAttendance, meta) => {
          const local = getAttendanceByChurch(churchId);
          const { merged: filteredAtt } = reconcileServerSnapshotWithLocal({
            remoteItems: churchAttendance,
            localItems: local,
            meta,
            isMarkedDeleted: (att) => isAttendanceMarkedDeleted(att.id),
            markDeleted: (att) => markAttendanceAsDeleted(att.id),
            isDemo: (att) => isLegacyDemoAttendance(att),
            isPendingUpload: (id) => hasPendingLocalUpload("attendance", id),
          });
          setAttendanceRecords(filteredAtt);
          churchStore.setAttendanceRecords(filteredAtt);
          const allOtherAttendance = loadFromStorage(STORAGE_KEYS.ATTENDANCE, []).filter(
            (att) =>
              att.churchId !== churchId &&
              (churchCodeUpper ? (att.churchId || "").toUpperCase() !== churchCodeUpper : true) &&
              !isLegacyDemoAttendance(att) &&
              !isAttendanceMarkedDeleted(att.id)
          );
          saveToStorage(STORAGE_KEYS.ATTENDANCE, [...allOtherAttendance, ...filteredAtt]);
        })
      );
    } else if (isLoggedInRegularMember && currentMemberDocId) {
      // Phase 0 Read Optimization: regular members subscribe ONLY to their own profile & own attendance
      unsubs.push(
        subscribeToSingleMember(currentMemberDocId, (remoteMember, meta) => {
          if (!remoteMember) {
            if (meta && !meta.fromCache && !meta.hasPendingWrites && !hasPendingLocalUpload("member", currentMemberDocId)) {
              markMemberAsDeleted({ id: currentMemberDocId, memberId: activeMemberId });
              const remaining = loadFromStorage(STORAGE_KEYS.MEMBERS, []).filter(
                (m2) => m2.id !== currentMemberDocId && m2.memberId !== activeMemberId
              );
              saveToStorage(STORAGE_KEYS.MEMBERS, remaining);
              setMembers((prev) => {
                const next = prev.filter((m2) => m2.id !== currentMemberDocId && m2.memberId !== activeMemberId);
                churchStore.setMembers(next);
                return next;
              });
              setMemberVisitorVisits([]);
              setActiveMemberId("");
              setSavedActiveMemberId("");
              toast.warning(
                language === "es" ? "Perfil eliminado" : language === "fr" ? "Profil supprimé" : language === "en" ? "Profile removed" : "Pwofil Siprime",
                language === "es"
                  ? "Su perfil de miembro fue eliminado por un administrador."
                  : language === "fr"
                  ? "Votre profil de membre a été supprimé par un administrateur."
                  : language === "en"
                  ? "Your member profile was deleted by an administrator."
                  : "Yon administratè siprime pwofil manm ou an tan reyèl."
              );
            }
            return;
          }
          if (isMemberMarkedDeleted(remoteMember)) return;
          const allLocal = loadFromStorage(STORAGE_KEYS.MEMBERS, []);
          const idx = allLocal.findIndex((m2) => m2.id === remoteMember.id);
          const existingLocal = idx >= 0 ? allLocal[idx] : undefined;
          let unified: Member;
          if (existingLocal && hasPendingLocalUpload("member", remoteMember.id)) {
            const locallyClearedPhoto =
              !existingLocal.avatarUrl && !existingLocal.photoUrl && !existingLocal.googlePhoto;
            unified = unifyMemberProfile(existingLocal, remoteMember);
            if (locallyClearedPhoto) {
              unified = { ...unified, avatarUrl: undefined, photoUrl: undefined, googlePhoto: undefined };
            }
          } else {
            unified = existingLocal ? unifyMemberProfile(remoteMember, existingLocal) : unifyMemberProfile(remoteMember);
          }
          if (idx >= 0) {
            allLocal[idx] = unified;
          } else {
            allLocal.push(unified);
          }
          saveToStorage(STORAGE_KEYS.MEMBERS, allLocal);
          setMembers((prev) => {
            const existsIdx = prev.findIndex((m2) => m2.id === unified.id);
            const next = existsIdx >= 0
              ? prev.map((m2) => (m2.id === unified.id ? unified : m2))
              : [...prev, unified];
            churchStore.setMembers(next);
            return next;
          });
        })
      );

      unsubs.push(
        subscribeToMemberAttendance(currentMemberDocId, churchId, (memberAttendanceRemote, meta) => {
          const localMemberAtt = getAttendanceByChurch(churchId).filter(
            (att) => att.memberDbId === currentMemberDocId || att.memberId === activeMemberId
          );
          const { merged: filteredAtt } = reconcileServerSnapshotWithLocal({
            remoteItems: memberAttendanceRemote,
            localItems: localMemberAtt,
            meta,
            isMarkedDeleted: (att) => isAttendanceMarkedDeleted(att.id),
            markDeleted: (att) => markAttendanceAsDeleted(att.id),
            isDemo: (att) => isLegacyDemoAttendance(att),
            isPendingUpload: (id) => hasPendingLocalUpload("attendance", id),
          });
          setAttendanceRecords(filteredAtt);
          churchStore.setAttendanceRecords(filteredAtt);
          if (meta && !meta.fromCache && !meta.hasPendingWrites) {
            const mergedIds = new Set(filteredAtt.map((att) => att.id));
            const allAtt = loadFromStorage(STORAGE_KEYS.ATTENDANCE, []);
            const cleanedAtt = allAtt.filter((att) => {
              const isThisMember =
                att.churchId === churchId &&
                (att.memberDbId === currentMemberDocId || att.memberId === activeMemberId);
              if (!isThisMember) return !isAttendanceMarkedDeleted(att.id);
              return mergedIds.has(att.id);
            });
            if (cleanedAtt.length !== allAtt.length) {
              saveToStorage(STORAGE_KEYS.ATTENDANCE, cleanedAtt);
            }
          }
        })
      );
    }

    unsubs.push(
      subscribeToServices(churchId, (churchServices, meta) => {
        const local = getServicesByChurch(churchId);
        const { merged: filteredServices, pendingToUpload, removedIdsProcessed } = reconcileServerSnapshotWithLocal({
          remoteItems: churchServices,
          localItems: local,
          meta,
          isMarkedDeleted: (s3) => isServiceMarkedDeleted(s3.id),
          markDeleted: (s3) => markServiceAsDeleted(s3.id),
          isDemo: (s3) => isLegacyDemoService(s3),
          isPendingUpload: (id) => hasPendingLocalUpload("service", id),
        });
        if (removedIdsProcessed.length > 0) {
          removedIdsProcessed.forEach((rid) => {
            pruneAnnouncementInteractionsByTarget(rid);
            pruneAnnouncementInteractionsByTarget(`srv-feed-${rid}`);
          });
        }
        if (userRole === "admin" || canCreateServicesMember) {
          for (const ls of pendingToUpload) {
            const syncKey = `srv_${ls.id}`;
            if (!syncedLocalIdsRef.current.has(syncKey)) {
              syncedLocalIdsRef.current.add(syncKey);
              firestoreAddService(ls)
                .then(() => clearPendingLocalUpload("service", ls.id))
                .catch(() => {
                  syncedLocalIdsRef.current.delete(syncKey);
                });
            }
          }
        }
        setServices(filteredServices);
        churchStore.setServices(filteredServices);
        const allOtherServices = loadFromStorage(STORAGE_KEYS.SERVICES, []).filter(
          (s3) =>
            s3.churchId !== churchId &&
            (churchCodeUpper ? (s3.churchId || "").toUpperCase() !== churchCodeUpper : true) &&
            !isLegacyDemoService(s3) &&
            !isServiceMarkedDeleted(s3.id)
        );
        saveToStorage(STORAGE_KEYS.SERVICES, [...allOtherServices, ...filteredServices]);
      })
    );

    unsubs.push(
      subscribeToAnnouncements(churchId, (churchAnnouncements, meta) => {
        const local = getAnnouncementsByChurch(churchId);
        const { merged, pendingToUpload, removedIdsProcessed } = reconcileServerSnapshotWithLocal({
          remoteItems: churchAnnouncements,
          localItems: local,
          meta,
          isMarkedDeleted: (a2) => isAnnouncementMarkedDeleted(a2.id),
          markDeleted: (a2) => markAnnouncementAsDeleted(a2.id),
          isDemo: (a2) => isLegacyDemoAnnouncement(a2),
          isPendingUpload: (id) => hasPendingLocalUpload("announcement", id),
        });
        if (removedIdsProcessed.length > 0) {
          removedIdsProcessed.forEach((rid) => pruneAnnouncementInteractionsByTarget(rid));
        }
        if (userRole === "admin" || canPublishAnnouncementsMember) {
          for (const la2 of pendingToUpload) {
            const syncKey = `ann_${la2.id}`;
            if (!syncedLocalIdsRef.current.has(syncKey)) {
              syncedLocalIdsRef.current.add(syncKey);
              firestoreAddAnnouncement(la2)
                .then(() => clearPendingLocalUpload("announcement", la2.id))
                .catch(() => {
                  syncedLocalIdsRef.current.delete(syncKey);
                });
            }
          }
        }
        const deduplicated = deduplicateAnnouncements(
          merged.filter((a2) => !isLegacyDemoAnnouncement(a2) && !isAnnouncementMarkedDeleted(a2.id))
        );
        setAnnouncements(deduplicated);
        churchStore.setAnnouncements(deduplicated);
        const allOtherAnnouncements = loadFromStorage(STORAGE_KEYS.ANNOUNCEMENTS, []).filter(
          (a2) =>
            a2.churchId !== churchId &&
            (churchCodeUpper ? (a2.churchId || "").toUpperCase() !== churchCodeUpper : true) &&
            !isLegacyDemoAnnouncement(a2) &&
            !isAnnouncementMarkedDeleted(a2.id)
        );
        saveToStorage(STORAGE_KEYS.ANNOUNCEMENTS, [...allOtherAnnouncements, ...deduplicated]);
      })
    );

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [
    currentChurchId,
    currentChurchCode,
    userRole,
    activeMemberId,
    currentMemberDocId,
    isReceptionMember,
    canCreateServicesMember,
    canPublishAnnouncementsMember,
  ]);
  reactExports.useEffect(() => {
    if (userRole !== "member" || !currentChurchId || !currentMemberDocId || !activeMemberId) {
      setMemberVisitorVisits([]);
      return;
    }
    const localVisits = getMemberCrossChurchVisits(currentMemberDocId, activeMemberId, currentChurchId);
    setMemberVisitorVisits(localVisits);
    const unsub = subscribeToMemberVisitorVisits(
      currentMemberDocId,
      activeMemberId,
      currentChurchId,
      (remoteVisits, meta) => {
        const latestLocal = getMemberCrossChurchVisits(currentMemberDocId, activeMemberId, currentChurchId);
        const { merged } = reconcileServerSnapshotWithLocal({
          remoteItems: remoteVisits,
          localItems: latestLocal,
          meta,
          isMarkedDeleted: (v) => isAttendanceMarkedDeleted(v.id),
          markDeleted: (v) => markAttendanceAsDeleted(v.id),
          isDemo: (v) => isLegacyDemoAttendance(v),
          isPendingUpload: (id) => hasPendingLocalUpload("attendance", id),
        });
        merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setMemberVisitorVisits(merged);
      }
    );
    return () => {
      unsub();
    };
  }, [userRole, currentChurchId, currentMemberDocId, activeMemberId]);
  reactExports.useEffect(() => {
    if (!currentChurchId) return;
    const handleCrossTabSync = (e3?: StorageEvent) => {
      if (
        e3 &&
        e3.key &&
        ![
          STORAGE_KEYS.CHURCHES,
          STORAGE_KEYS.MEMBERS,
          STORAGE_KEYS.SERVICES,
          STORAGE_KEYS.ANNOUNCEMENTS,
          STORAGE_KEYS.ATTENDANCE,
          STORAGE_KEYS.DELETED_CHURCHES,
          STORAGE_KEYS.DELETED_MEMBERS,
          STORAGE_KEYS.DELETED_SERVICES,
          STORAGE_KEYS.DELETED_ANNOUNCEMENTS,
          STORAGE_KEYS.DELETED_ATTENDANCE,
        ].includes(e3.key)
      ) {
        return;
      }
      const nextChurches = getAllChurches();
      setAllChurches(nextChurches);
      churchStore.setAllChurches(nextChurches);
      setMembers(getMembersByChurch(currentChurchId));
      setServices(getServicesByChurch(currentChurchId));
      setAnnouncements(getAnnouncementsByChurch(currentChurchId));
      setAttendanceRecords(getAttendanceByChurch(currentChurchId));
    };
    const handleMemberUpdatedEvent = (e3?: Event) => {
      const updatedDetail = (e3 as CustomEvent<Member> | undefined)?.detail;
      if (updatedDetail && updatedDetail.id) {
        setMembers((prev) => {
          const exists = prev.some((m2) => m2.id === updatedDetail.id || m2.memberId === updatedDetail.memberId);
          const next = exists
            ? prev.map((m2) => (m2.id === updatedDetail.id || m2.memberId === updatedDetail.memberId ? updatedDetail : m2))
            : [...prev, updatedDetail];
          churchStore.setMembers(next);
          return next;
        });
      } else {
        const latestMembers = getMembersByChurch(currentChurchId);
        setMembers(latestMembers);
        churchStore.setMembers(latestMembers);
      }
    };
    window.addEventListener("storage", handleCrossTabSync);
    window.addEventListener("church_data_updated", handleCrossTabSync as EventListener);
    window.addEventListener("omnichurch_member_deleted", handleCrossTabSync as EventListener);
    window.addEventListener("omnichurch_member_updated", handleMemberUpdatedEvent as EventListener);
    return () => {
      window.removeEventListener("storage", handleCrossTabSync);
      window.removeEventListener("church_data_updated", handleCrossTabSync as EventListener);
      window.removeEventListener("omnichurch_member_deleted", handleCrossTabSync as EventListener);
      window.removeEventListener("omnichurch_member_updated", handleMemberUpdatedEvent as EventListener);
    };
  }, [currentChurchId]);
  const servicesScheduleSignature = services
    .filter((s3) => s3 && !s3.isPermanentlyEnded)
    .map((s3) => `${s3.id}:${s3.date || ""}:${s3.startTime || ""}:${s3.endTime || ""}:${s3.endedAt || ""}`)
    .join("|");
  reactExports.useEffect(() => {
    if (!currentChurchId || userRole !== "admin") return;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const clearScheduledTimer = () => {
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
    };

    const scheduleOrRunAutoSync = (allowImmediateRun: boolean) => {
      clearScheduledTimer();
      const churchServices = getServicesByChurch(currentChurchId);
      const delayMs = getNextServiceAutoSyncDelayMs(churchServices);
      if (delayMs === null) {
        return;
      }
      if (delayMs === 0 && allowImmediateRun) {
        const beforeSig = churchServices
          .map((s3) => `${s3.id}:${s3.isOpenForAttendance ? 1 : 0}:${s3.isPermanentlyEnded ? 1 : 0}`)
          .join("|");
        syncServiceAbsencesAutomatically(currentChurchId);
        const updatedChurchServices = getServicesByChurch(currentChurchId);
        const afterSig = updatedChurchServices
          .map((s3) => `${s3.id}:${s3.isOpenForAttendance ? 1 : 0}:${s3.isPermanentlyEnded ? 1 : 0}`)
          .join("|");
        if (afterSig !== beforeSig) {
          setServices(updatedChurchServices);
        }
        const nextDelayMs = getNextServiceAutoSyncDelayMs(updatedChurchServices);
        if (nextDelayMs !== null && nextDelayMs > 0) {
          timerId = setTimeout(() => {
            scheduleOrRunAutoSync(true);
          }, nextDelayMs);
        }
        return;
      }
      if (delayMs > 0) {
        timerId = setTimeout(() => {
          scheduleOrRunAutoSync(true);
        }, delayMs);
      }
    };

    scheduleOrRunAutoSync(true);

    const handleWakeCheck = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      scheduleOrRunAutoSync(true);
    };
    const handleAbsencesSynced = () => {
      setAttendanceRecords(getAttendanceByChurch(currentChurchId));
    };

    window.addEventListener("app_legiz_absences_synced", handleAbsencesSynced);
    window.addEventListener("focus", handleWakeCheck);
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleWakeCheck);
    }

    return () => {
      clearScheduledTimer();
      window.removeEventListener("app_legiz_absences_synced", handleAbsencesSynced);
      window.removeEventListener("focus", handleWakeCheck);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleWakeCheck);
      }
    };
  }, [currentChurchId, userRole, servicesScheduleSignature]);
  const handleChurchChange = (newChurchId) => {
    if (userRole === "member" && activeMemberId) {
      return;
    }
    const targetChurch = allChurches.find((c3) => c3.id === newChurchId) || getChurchById(newChurchId);
    if (!targetChurch) return;
    if (userRole === "admin") {
      const isAuthed = isChurchAdminAuthorized(newChurchId, googleUser == null ? void 0 : googleUser.email, googleUser == null ? void 0 : googleUser.uid);
      if (!isAuthed) {
        setPendingAdminChurch(targetChurch);
        setIsAdminPasscodeModalOpen(true);
        return;
      }
    }
    setAllChurches((prev) =>
      prev.some((c3) => c3.id === targetChurch.id) ? prev : [...prev, targetChurch]
    );
    setActiveChurchId(newChurchId);
    setSavedActiveChurchId(newChurchId);
    if (activeMemberId) {
      const newChurchMembers = getMembersByChurch(newChurchId);
      const isMemberInNewChurch = newChurchMembers.some((m2) => m2.memberId === activeMemberId);
      if (!isMemberInNewChurch) {
        setActiveMemberId("");
        setSavedActiveMemberId("");
      }
    }
    setCurrentChurch(targetChurch);
    toast.info("Espas Legliz Chanje", `Ou konekte nan espas prive "${targetChurch.name}".`);
  };
  const effectiveAutoLockMinutes =
    typeof (currentChurch == null ? void 0 : currentChurch.autoLockMinutes) === "number"
      ? currentChurch.autoLockMinutes
      : 5;
  const handleRoleChange = (newRole) => {
    if (newRole === "admin") {
      const remembered = getRememberedAdminLogin();
      const ownedChurches = googleUser
        ? resolveAdminOwnedChurches(allChurches, googleUser.uid, googleUser.email)
        : [];
      const preferredOwned =
        (remembered.churchId
          ? ownedChurches.find((c3) => c3.id === remembered.churchId)
          : undefined) ||
        (ownedChurches.length === 1 ? ownedChurches[0] : undefined);

      if (
        preferredOwned &&
        isChurchAdminAuthorized(
          preferredOwned.id,
          googleUser == null ? void 0 : googleUser.email,
          googleUser == null ? void 0 : googleUser.uid
        )
      ) {
        handleAdminAuthSuccess(preferredOwned);
        toast.info(
          language === "es"
            ? "Modo Administrador Activado"
            : language === "fr"
            ? "Mode Administrateur Activé"
            : language === "en"
            ? "Administrator Mode Active"
            : "Mòd Administratè Aktive",
          preferredOwned.name
        );
        return;
      }

      const isLockedCurrentOwned = Boolean(
        currentChurch &&
          googleUser &&
          isChurchAdminLocked(currentChurch.id) &&
          resolveAdminOwnedChurches([currentChurch], googleUser.uid, googleUser.email).length > 0
      );

      if (isLockedCurrentOwned && currentChurch) {
        setIsAutoLocked(true);
        setPendingAdminChurch(currentChurch);
      } else {
        setIsAutoLocked(false);
        setPendingAdminChurch(null);
      }
      setIsAdminPasscodeModalOpen(true);
      return;
    } else {
      setIsAutoLocked(false);
      revokeChurchAdminSession();
      setUserRole("member");
      setSavedActiveRole("member");
      toast.info("Espas Manm Aktive", "Antre ID + PIN ou pou wè espas pèsonèl ou.");
    }
  };
  const handleAdminAuthSuccess = (authorizedChurch) => {
    setIsAutoLocked(false);
    clearChurchAdminLock(authorizedChurch.id);
    authorizeChurchAdminSession(authorizedChurch.id);
    // Strict multi-tenant workspace isolation: clear any prior member or tenant state immediately
    setActiveMemberId("");
    setSavedActiveMemberId("");
    setMemberVisitorVisits([]);
    setAdminCloudSyncAlert(null);
    lastAdminSyncKeyRef.current = "";
    const refreshedChurches = getAllChurches();
    setAllChurches(
      refreshedChurches.some((c3) => c3.id === authorizedChurch.id)
        ? refreshedChurches
        : [...refreshedChurches, authorizedChurch]
    );
    setActiveChurchId(authorizedChurch.id);
    setSavedActiveChurchId(authorizedChurch.id);
    setCurrentChurch(authorizedChurch);
    setMembers(getMembersByChurch(authorizedChurch.id));
    setServices(getServicesByChurch(authorizedChurch.id));
    setAnnouncements(getAnnouncementsByChurch(authorizedChurch.id));
    setAttendanceRecords(getAttendanceByChurch(authorizedChurch.id));
    setUserRole("admin");
    setSavedActiveRole("admin");
    lastAdminActivityRef.current = Date.now();
    setIsAdminPasscodeModalOpen(false);
    setPendingAdminChurch(null);
  };
  const handleLockAdminSession = reactExports.useCallback((isManual = false) => {
    if (userRole !== "admin") return;
    lockChurchAdminSession(currentChurch == null ? void 0 : currentChurch.id);
    setUserRole("member");
    setSavedActiveRole("member");
    if (currentChurch) {
      setPendingAdminChurch(currentChurch);
    }
    setIsAutoLocked(true);
    setIsAdminPasscodeModalOpen(true);
    if (isManual) {
      toast.info(
        language === "es" ? "Consola Bloqueada" : language === "fr" ? "Console Verrouillée" : language === "en" ? "Console Locked" : "Espas Admin Bloke",
        language === "es" ? "Ha bloqueado la consola de administración manualmente para proteger los datos." : language === "fr" ? "Vous avez verrouillé la console administrateur manuellement pour sécuriser les données." : language === "en" ? "You manually locked the admin console to protect confidential church data." : "Ou bloke espas administratè a pou pwoteje done ak rapò legliz la."
      );
    } else {
      const lockMins = typeof (currentChurch == null ? void 0 : currentChurch.autoLockMinutes) === "number" ? currentChurch.autoLockMinutes : 5;
      toast.warning(
        language === "es" ? `Bloqueo Automático (${lockMins} min)` : language === "fr" ? `Verrouillage Automatique (${lockMins} min)` : language === "en" ? `Auto-Lock (${lockMins} min)` : "Sesyon Bloke pou Inaktivite",
        language === "es" ? `La consola de administración se bloqueó automáticamente tras ${lockMins} minutos sin actividad para proteger los datos de la iglesia.` : language === "fr" ? `La console administrateur s’est verrouillée automatiquement après ${lockMins} minutes d’inactivité pour sécuriser les données de l’église.` : language === "en" ? `The admin console automatically locked after ${lockMins} minutes of inactivity to safeguard church records.` : `Espas administratè a bloke otomatikman apre ${lockMins} minit san aktivite pou sekirize done legliz la.`
      );
    }
  }, [userRole, currentChurch, language, toast]);
  reactExports.useEffect(() => {
    if (userRole !== "admin" || effectiveAutoLockMinutes <= 0) return;
    lastAdminActivityRef.current = Date.now();
    const recordUserActivity = () => {
      lastAdminActivityRef.current = Date.now();
    };
    const monitoredEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "click",
      "wheel",
      "omnichurch_keep_admin_session"
    ];
    monitoredEvents.forEach((eventName) => {
      window.addEventListener(eventName, recordUserActivity, { passive: true });
    });
    const LOCK_TIMEOUT_MS = effectiveAutoLockMinutes * 60 * 1e3;
    const POLLING_INTERVAL_MS = 4e3;
    const timerInterval = setInterval(() => {
      if (isScannerOpen) {
        lastAdminActivityRef.current = Date.now();
        return;
      }
      if (isAdminPasscodeModalOpen) {
        return;
      }
      const idleDuration = Date.now() - lastAdminActivityRef.current;
      if (idleDuration >= LOCK_TIMEOUT_MS) {
        handleLockAdminSession(false);
      }
    }, POLLING_INTERVAL_MS);
    return () => {
      monitoredEvents.forEach((eventName) => {
        window.removeEventListener(eventName, recordUserActivity);
      });
      clearInterval(timerInterval);
    };
  }, [userRole, isScannerOpen, isAdminPasscodeModalOpen, handleLockAdminSession, effectiveAutoLockMinutes]);
  const handleMemberChange = (newMemberId) => {
    setActiveMemberId(newMemberId);
    setSavedActiveMemberId(newMemberId);
    const targetM = members.find((m2) => m2.memberId === newMemberId);
    if (targetM) {
      toast.info("Profil Seleksyone", `${targetM.fullName} (${targetM.memberId})`);
    }
  };
  const handleMemberLoginSuccess = (member, church) => {
    setAllChurches((prev) =>
      prev.some((c3) => c3.id === church.id) ? prev : [...prev, church]
    );
    setActiveChurchId(church.id);
    setSavedActiveChurchId(church.id);
    setCurrentChurch(church);
    setMembers(getMembersByChurch(church.id));
    setAttendanceRecords(getAttendanceByChurch(church.id));
    setActiveMemberId(member.memberId);
    setSavedActiveMemberId(member.memberId);
    setMemberTab("home");
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const churchAlerts = announcements.filter((a2) => {
      if (a2.churchId !== church.id) return false;
      if (!a2.showToastOnLogin && !a2.isScheduledNotification) return false;
      if (a2.isScheduledNotification) {
        const start = a2.scheduledNotificationDate || a2.date;
        const end = a2.scheduledNotificationEndDate;
        const inDateRange = end ? today >= start && today <= end : today === start || today >= start;
        if (!inDateRange) return false;
        const targetAud = a2.scheduledTargetAudience || a2.targetAudience;
        if (targetAud && targetAud !== "Tout moun") {
          const memberDept = (member.department || "").toLowerCase();
          const memberRole = (member.role || "").toLowerCase();
          const audLower = (typeof targetAud === "string" ? targetAud : String(targetAud || "")).toLowerCase();
          const matches2 = memberDept && (memberDept.includes(audLower) || audLower.includes(memberDept)) || memberRole && (memberRole.includes(audLower) || audLower.includes(memberRole));
          if (!matches2) return false;
        }
        return true;
      }
      if (a2.targetAudience && a2.targetAudience !== "Tout moun") {
        const memberDept = (member.department || "").toLowerCase();
        const memberRole = (member.role || "").toLowerCase();
        const audLower = (typeof a2.targetAudience === "string" ? a2.targetAudience : String(a2.targetAudience || "")).toLowerCase();
        const matches2 = memberDept && (memberDept.includes(audLower) || audLower.includes(memberDept)) || memberRole && (memberRole.includes(audLower) || audLower.includes(memberRole));
        if (!matches2) return false;
      }
      return true;
    });
    if (churchAlerts.length > 0) {
      setTimeout(() => {
        churchAlerts.forEach((alertAnn, index) => {
          setTimeout(() => {
            const localizedTitle = getLocalizedAnnouncementTitle(alertAnn, language);
            const localizedContent = getLocalizedAnnouncementContent(alertAnn, language, church);
            const prefix = alertAnn.isScheduledNotification ? "📅 " : "";
            const isEs = language === "es";
            const isFr = language === "fr";
            const isEn = language === "en";
            const warningHeader = isEs ? `⚠️ ADVERTENCIA OFICIAL • ${church.name.toUpperCase()}` : isFr ? `⚠️ AVERTISSEMENT OFFICIEL • ${church.name.toUpperCase()}` : isEn ? `⚠️ OFFICIAL WARNING • ${church.name.toUpperCase()}` : `⚠️ AVÈTISMAN OFISYÈL • ${church.name.toUpperCase()}`;
            const celebrationHeader = isEs ? `🎉 CELEBRACIÓN • ${church.name.toUpperCase()}` : isFr ? `🎉 CÉLÉBRATION • ${church.name.toUpperCase()}` : isEn ? `🎉 CELEBRATION • ${church.name.toUpperCase()}` : `🎉 SELEBRASYON • ${church.name.toUpperCase()}`;
            const officialHeader = isEs ? `📢 AVISO OFICIAL • ${church.name.toUpperCase()}` : isFr ? `📢 ANNONCE OFFICIELLE • ${church.name.toUpperCase()}` : isEn ? `📢 OFFICIAL ANNOUNCEMENT • ${church.name.toUpperCase()}` : `📢 ANONS OFISYÈL • ${church.name.toUpperCase()}`;
            if (alertAnn.toastAlertLevel === "urgent") {
              toast.urgent(`🚨 ${localizedTitle}`, localizedContent, 9e3);
            } else if (alertAnn.toastAlertLevel === "warning") {
              toast.announcementToast(
                `⚠️ ${localizedTitle}`,
                localizedContent,
                warningHeader,
                8500
              );
            } else if (alertAnn.toastAlertLevel === "celebration") {
              toast.announcementToast(
                `🎉 ${localizedTitle}`,
                localizedContent,
                celebrationHeader,
                8e3
              );
            } else {
              toast.announcementToast(
                `${prefix}📢 ${localizedTitle}`,
                localizedContent,
                officialHeader,
                8e3
              );
            }
          }, index * 700);
        });
      }, 700);
    }
  };
  const handleMemberLogout = () => {
    setActiveMemberId("");
    setSavedActiveMemberId("");
    setMemberVisitorVisits([]);
    toast.info("Dekonekte", "Ou dekonekte nan espas manm nan avèk siksè.");
  };
  const handleToggleActiveService = (serviceId: string, isOpen: boolean): boolean => {
    if (!currentChurch) return false;
    const ok = setServiceActiveStatus(currentChurch.id, serviceId, isOpen);
    if (ok) {
      setServices(getServicesByChurch(currentChurch.id));
    }
    return ok;
  };
  const activeOngoingServices = services.filter((s3) => isServiceCurrentlyActive(s3, isServiceEnded));
  reactExports.useEffect(() => {
    if (!isReceptionMember && memberTab === "reception") {
      setMemberTab("home");
    }
    if (!canCreateServicesMember && memberTab === "deacon_services") {
      setMemberTab("home");
    }
    if (!canPublishAnnouncementsMember && memberTab === "deacon_announcements") {
      setMemberTab("home");
    }
  }, [isReceptionMember, canCreateServicesMember, canPublishAnnouncementsMember, memberTab]);
  const memberAttendance = currentMember && currentChurch ? attendanceRecords.filter(
    (a2) => a2.churchId === currentChurch.id && (a2.memberId === currentMember.memberId || a2.memberDbId === currentMember.id)
  ) : [];
  const maybeOpenPostCreationVerification = (newChurch: any) => {
    const liveAuthUser = auth.currentUser;
    const authEmailVerified = Boolean(liveAuthUser?.emailVerified);
    const authUserEmail = liveAuthUser?.email || newChurch?.adminGoogleEmail || "";
    if (
      shouldPromptPostCreationEmailVerification({
        church: newChurch,
        authEmailVerified,
        authUserEmail,
      })
    ) {
      recordVerificationEmailSent(authUserEmail);
      setPostCreationVerifyChurch(newChurch);
    }
  };
  const activateCreatedChurchWorkspace = (newChurch: any) => {
    clearChurchAdminLock(newChurch.id);
    authorizeChurchAdminSession(newChurch.id);
    setActiveMemberId("");
    setSavedActiveMemberId("");
    setMemberVisitorVisits([]);
    setIsAdminPasscodeModalOpen(false);
    setPendingAdminChurch(null);
    setIsAutoLocked(false);
    setAdminCloudSyncAlert(null);
    lastAdminSyncKeyRef.current = "";
    const updated = getAllChurches();
    setAllChurches(updated.some((c3) => c3.id === newChurch.id) ? updated : [...updated, newChurch]);
    setActiveChurchId(newChurch.id);
    setSavedActiveChurchId(newChurch.id);
    setCurrentChurch(newChurch);
    setMembers(getMembersByChurch(newChurch.id));
    setServices(getServicesByChurch(newChurch.id));
    setAnnouncements(getAnnouncementsByChurch(newChurch.id));
    setAttendanceRecords(getAttendanceByChurch(newChurch.id));
    setUserRole("admin");
    setSavedActiveRole("admin");
    setAdminTab("dashboard");
    maybeOpenPostCreationVerification(newChurch);
  };
  const handleChurchCreatedFromOnboarding = (newChurch: any) => {
    activateCreatedChurchWorkspace(newChurch);
  };
  const handleChurchCreatedSuccessfully = (newChurch: any) => {
    activateCreatedChurchWorkspace(newChurch);
  };
  const handleNavigateToNotificationTarget = (target, targetId) => {
    setIsNotificationsPageOpen(false);
    if (!target) return;
    if (userRole === "admin") {
      if (target === "announcement") setAdminTab("announcements");
      else if (target === "service") setAdminTab("services");
      else if (target === "attendance") setAdminTab("attendance");
      else if (target === "members") setAdminTab("members");
      else if (target === "cards") setAdminTab("cards");
      else setAdminTab("dashboard");
    } else {
      if (target === "announcement") {
        setIsNotificationsPageOpen(true);
      } else if (target === "service") {
        setMemberTab("services");
      } else if (target === "attendance") {
        setMemberTab("attendance");
      } else {
        setMemberTab("home");
      }
    }
  };
  const t3 = translations[language];
  if (verificationView.isOpen && verificationView.memberCode) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      MemberPublicVerificationPage,
      {
        memberCode: verificationView.memberCode,
        churchId: verificationView.churchId,
        initialLanguage: verificationView.lang || language,
        onClose: () => {
          const isUserLoggedIn = userRole === "admin" || Boolean(currentMember);
          if (isUserLoggedIn) {
            if (typeof window !== "undefined") {
              const cleanUrl = window.location.pathname;
              window.history.replaceState({}, document.title, cleanUrl);
            }
            setVerificationView({ isOpen: false, memberCode: "" });
          } else {
            if (typeof window !== "undefined") {
              try {
                window.close();
              } catch (_2) {
              }
              if (window.history.length > 1) {
                window.history.back();
              }
            }
          }
        }
      }
    );
  }
  if (activeLegalPage === "privacy") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      PrivacyPolicy,
      {
        language,
        onLanguageChange: handleLanguageChange,
        onBack: closeLegalPage,
        onNavigateTerms: () => openLegalPage("terms", true)
      }
    );
  }
  if (activeLegalPage === "terms") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      TermsOfService,
      {
        language,
        onLanguageChange: handleLanguageChange,
        onBack: closeLegalPage,
        onNavigatePrivacy: () => openLegalPage("privacy", true)
      }
    );
  }
  if (isDevEngineModalOpen) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      DeveloperEnginePage,
      {
        isOpen: true,
        language,
        allChurches,
        currentChurch: null,
        onClose: () => setIsDevEngineModalOpen(false),
        onLanguageChange: (nextLang) => {
          setLanguage(nextLang);
        },
        onOpenPrivacyPolicy: () => openLegalPage("privacy", true),
        onOpenTermsOfService: () => openLegalPage("terms", true),
        onSelectChurch: (church) => {
          handleChurchChange(church.id);
          setIsDevEngineModalOpen(false);
          toast.success(
            "Legliz Chanje",
            `Ou konekte kounye a sou ${church.name} (${church.id})`
          );
        },
        onRefreshChurches: () => {
          const refreshed = getAllChurches();
          setAllChurches(refreshed);
          if (currentChurch) {
            const curr = refreshed.find((c3) => c3.id === currentChurch.id);
            if (curr) setCurrentChurch(curr);
          }
        }
      }
    );
  }
  if (isLoadingAuth && !currentChurch && allChurches.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      SplashScreen,
      {
        subtitle: language === "es"
          ? "Plataforma Oficial de Gestión de Iglesias"
          : language === "fr"
          ? "Plateforme Officielle de Gestion d’Églises"
          : language === "en"
          ? "Official Multi-Tenant Church Platform"
          : "Platfòm Ofisyèl Jesyon Legliz"
      }
    );
  }
  if (!currentChurch || allChurches.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen bg-[#0F172A] text-slate-200 flex flex-col font-sans antialiased selection:bg-amber-400 selection:text-slate-950", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Navbar,
        {
          currentChurch: void 0,
          allChurches,
          members: [],
          currentMember: void 0,
          userRole,
          isAuthorizedAdmin: currentChurch ? isChurchAdminAuthorized(currentChurch.id, googleUser == null ? void 0 : googleUser.email, googleUser == null ? void 0 : googleUser.uid) : isGoogleUserAuthorizedAdmin,
          language,
          announcements: [],
          services: [],
          attendanceRecords: [],
          onOpenNotifications: () => {
          },
          onNavigateToNotificationTarget: () => {
          },
          onChurchChange: handleChurchChange,
          onRoleChange: handleRoleChange,
          onMemberChange: handleMemberChange,
          onLanguageChange: handleLanguageChange,
          onOpenScanner: () => setIsScannerOpen(true),
          onLogoutMember: handleMemberLogout,
          onOpenTutorial: () => setIsTutorialOpen(true),
          onOpenLanguageModal: () => setIsLanguageModalOpen(true),
          onOpenDesktopModal: () => setIsDesktopModalOpen(true),
          onOpenCreateChurch: () => setIsCreateChurchModalOpen(true),
          onOpenDeveloperPanel: handleOpenDeveloperAuth,
          onOpenDonateScreen: () => setIsDonateScreenOpen(true)
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-24 sm:pb-8", children: isDonateScreenOpen ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        DonationScreen,
        {
          language,
          onBack: () => setIsDonateScreenOpen(false)
        }
      ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
        EmptyChurchOnboarding,
        {
          onChurchCreated: handleChurchCreatedFromOnboarding,
          onOpenTutorial: () => setIsTutorialOpen(true),
          language
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SponsorMarqueeFooter,
        {
          language,
          onOpenDevPanel: () => setIsDevAuthModalOpen(true),
          onOpenPrivacyPolicy: () => openLegalPage("privacy"),
          onOpenTermsOfService: () => openLegalPage("terms")
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        UserTutorialModal,
        {
          isOpen: isTutorialOpen,
          onClose: () => setIsTutorialOpen(false),
          onOpenCreateChurch: () => {
            setIsTutorialOpen(false);
            setIsCreateChurchModalOpen(true);
          },
          language,
          userRole,
          currentChurch,
          currentMember
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        LanguageSelectionModal,
        {
          isOpen: isLanguageModalOpen,
          currentLanguage: language,
          onSelectLanguage: handleLanguageChange,
          onClose: () => setIsLanguageModalOpen(false),
          onAutoDetectLanguage: handleAutoDetectLanguage,
          detectedCountryCode: languageResolution.detectedCountryCode,
          isAutoDetected:
            languageResolution.source === "country_position" ||
            languageResolution.source === "browser",
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        CreateChurchModal,
        {
          isOpen: isCreateChurchModalOpen,
          onClose: () => setIsCreateChurchModalOpen(false),
          onChurchCreated: handleChurchCreatedSuccessfully,
          language
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        DeveloperAuthModal,
        {
          isOpen: isDevAuthModalOpen,
          language,
          onClose: () => setIsDevAuthModalOpen(false),
          onSuccess: () => {
            setIsDevAuthModalOpen(false);
            setIsDevEngineModalOpen(true);
          }
        }
      )
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen bg-[#0F172A] text-slate-200 flex flex-col font-sans antialiased selection:bg-amber-400 selection:text-slate-950", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Navbar,
      {
        currentChurch,
        allChurches,
        members,
        currentMember,
        userRole,
        isAuthorizedAdmin: currentChurch ? isChurchAdminAuthorized(currentChurch.id, googleUser == null ? void 0 : googleUser.email, googleUser == null ? void 0 : googleUser.uid) : isGoogleUserAuthorizedAdmin,
        language,
        announcements,
        services,
        attendanceRecords,
        isNotificationsOpen: isNotificationsPageOpen,
        onOpenNotifications: () => {
          setIsDonateScreenOpen(false);
          setIsNotificationsPageOpen((prev) => !prev);
        },
        onCloseNotifications: () => setIsNotificationsPageOpen(false),
        onNavigateToNotificationTarget: (target, targetId) => {
          setIsDonateScreenOpen(false);
          handleNavigateToNotificationTarget(target, targetId);
        },
        onChurchChange: handleChurchChange,
        onRoleChange: handleRoleChange,
        onMemberChange: handleMemberChange,
        onLanguageChange: handleLanguageChange,
        onOpenScanner: () => setIsScannerOpen(true),
        onLogoutMember: handleMemberLogout,
        onOpenTutorial: () => setIsTutorialOpen(true),
        onOpenLanguageModal: () => setIsLanguageModalOpen(true),
        onOpenDesktopModal: () => setIsDesktopModalOpen(true),
        onOpenCreateChurch: () => setIsCreateChurchModalOpen(true),
        onOpenDeveloperPanel: handleOpenDeveloperAuth,
        onOpenDonateScreen: () => {
          setIsNotificationsPageOpen(false);
          setIsDonateScreenOpen(true);
        },
        onLockAdmin: () => handleLockAdminSession(true),
        onOpenEmailVerificationScreen: () => {
          if (currentChurch) {
            setPostCreationVerifyChurch(currentChurch);
          }
        }
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(AdMobBannerAd, { churchId: currentChurch == null ? void 0 : currentChurch.id, placement: "navbar_bottom" }),
    (() => {
      const devSettings = getDeveloperSettings();
      const activeBroadcasts = (devSettings.broadcasts || []).filter(
        (b2) => b2.active && (b2.targetChurchId === "ALL" || b2.targetChurchId === (currentChurch == null ? void 0 : currentChurch.id))
      );
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        devSettings.maintenanceMode && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-rose-950/90 border-b border-rose-800/80 px-4 py-2.5 text-xs text-rose-200 flex items-center justify-between gap-2 shadow-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Wrench, { className: "w-4 h-4 text-rose-400 shrink-0" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold", children: "Mòd Antretyen Global:" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "opacity-90", children: devSettings.maintenanceMessage || "Sistèm nan ap pase nan yon ti faz antretyen." })
        ] }) }),
        activeBroadcasts.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-slate-950 border-b border-slate-800 p-2 space-y-1.5", children: activeBroadcasts.map((b2) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: `max-w-7xl mx-auto px-3.5 py-2 rounded-xl border flex items-center justify-between gap-3 text-xs ${b2.type === "maintenance" ? "bg-rose-950/70 border-rose-600/50 text-rose-100" : b2.type === "warning" ? "bg-amber-950/70 border-amber-600/50 text-amber-100" : b2.type === "update" ? "bg-emerald-950/70 border-emerald-600/50 text-emerald-100" : "bg-blue-950/70 border-blue-600/50 text-blue-100"}`,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2.5 min-w-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Radio, { className: "w-4 h-4 shrink-0 text-amber-400 animate-pulse" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-extrabold", children: [
                  b2.title,
                  ":"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate opacity-90", children: b2.message })
              ] }),
              b2.priority === "urgent" && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-2 py-0.5 rounded bg-rose-500 text-white font-black text-[9px] uppercase shrink-0", children: "IJAN" })
            ]
          },
          b2.id
        )) })
      ] });
    })(),
    versionInfo.hasUpdate && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-amber-500/20 border-b border-amber-400/30 px-4 py-2 text-xs text-amber-200", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-white", children: language === "es" ? `¡Nueva actualización disponible (v${versionInfo.latestVersion})!` : language === "en" ? `New update available (v${versionInfo.latestVersion})!` : language === "fr" ? `Nouvelle mise à jour disponible (v${versionInfo.latestVersion}) !` : `Nouvo mizajou disponib (v${versionInfo.latestVersion})!` }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden sm:inline text-amber-300/80 truncate", children: versionInfo.downloadUrl })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            id: "btn-open-update-modal-banner",
            onClick: () => setIsUpdateModalOpen(true),
            className: "px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all shadow-sm cursor-pointer flex items-center gap-1.5",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "w-3.5 h-3.5" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: language === "es" ? "Actualizar" : language === "en" ? "Update Now" : language === "fr" ? "Mettre à jour" : "Mete Ajou" })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            id: "btn-dismiss-update-banner",
            onClick: () => {
              dismissCurrentUpdate();
              setIsUpdateModalOpen(false);
            },
            title: language === "es" ? "Ignorar" : language === "en" ? "Dismiss" : language === "fr" ? "Ignorer" : "Inyore",
            className: "p-1 rounded-lg hover:bg-amber-400/20 text-amber-300/80 hover:text-white transition-colors cursor-pointer",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(X$1, { className: "w-3.5 h-3.5" })
          }
        )
      ] })
    ] }) }),
    (userRole === "admin" || Boolean(currentMember)) && currentChurch && /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "bg-[#111C30] border-b border-slate-800 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-inner", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2 text-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-300", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Building2, { className: "w-3.5 h-3.5 text-amber-400" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold", children: currentChurch.name || "" }),
        currentChurch.code && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] text-slate-500 font-mono", children: [
          "(",
          currentChurch.code,
          ")"
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2", children: userRole === "admin" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          id: "btn-quick-open-scanner",
          onClick: () => setIsScannerOpen(true),
          className: "px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Camera, { className: "w-3.5 h-3.5" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: language === "es" ? "Escanear Código QR" : language === "en" ? "Scan QR Code" : language === "fr" ? "Scanner Code QR" : "Eskane Kòd QR" })
          ]
        }
      ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        isReceptionMember && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            id: "btn-member-reception-quick-scan",
            onClick: () => {
              if (activeOngoingServices.length > 0) {
                setIsScannerOpen(true);
              } else {
                setMemberTab("reception");
              }
            },
            className: "px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Camera, { className: "w-3.5 h-3.5" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: language === "es" ? "Escanear (Recepción)" : language === "en" ? "Scan (Reception)" : language === "fr" ? "Scanner (Réception)" : "Eskane (Resepsyon)" })
            ]
          }
        ),
        canCreateServicesMember && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            id: "btn-member-deacon-quick-services",
            onClick: () => setMemberTab("deacon_services"),
            className: "px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, { className: "w-3.5 h-3.5" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: language === "es" ? "Cultos (Diácono)" : language === "en" ? "Services (Deacon)" : language === "fr" ? "Cultes (Diacre)" : "Sèvis (Dyak)" })
            ]
          }
        ),
        canPublishAnnouncementsMember && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            id: "btn-member-deacon-quick-announcements",
            onClick: () => setMemberTab("deacon_announcements"),
            className: "px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Megaphone, { className: "w-3.5 h-3.5" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: language === "es" ? "Avisos (Diácono)" : language === "en" ? "News (Deacon)" : language === "fr" ? "Annonces (Diacre)" : "Anons (Dyak)" })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            id: "btn-quick-view-my-card",
            onClick: () => setMemberTab("mycode"),
            className: "px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/30 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(QrCode, { className: "w-3.5 h-3.5" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: language === "es" ? "Mi Carnet" : language === "en" ? "My ID Card" : language === "fr" ? "Ma Carte" : "Kat Mwen" })
            ]
          }
        )
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: `flex-1 ${userRole === "admin" && !isNotificationsPageOpen && !isDonateScreenOpen ? "max-w-[1440px]" : "max-w-7xl"} w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-24 sm:pb-8`, children: isDonateScreenOpen ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      DonationScreen,
      {
        language,
        onBack: () => setIsDonateScreenOpen(false)
      }
    ) : isNotificationsPageOpen ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      NotificationsPage,
      {
        church: currentChurch,
        member: currentMember,
        userRole,
        announcements,
        services,
        attendanceRecords,
        language,
        onClose: () => setIsNotificationsPageOpen(false),
        onBack: () => setIsNotificationsPageOpen(false),
        onNavigateToTarget: (target, targetId) => {
          handleNavigateToNotificationTarget(target, targetId);
        },
        onRefresh: async () => {
          if (currentChurch) {
            const freshAnn = getAnnouncementsByChurch(currentChurch.id);
            setAnnouncements(freshAnn);
            const freshServ = getServicesByChurch(currentChurch.id);
            setServices(freshServ);
            const freshAtt = getAttendanceByChurch(currentChurch.id);
            setAttendanceRecords(freshAtt);
          }
        }
      }
    ) : userRole === "admin" ? (
      /* =========================================================================
         ADMINISTRATION WORKSPACE
         ========================================================================= */
      /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        (() => {
          const liveAuthUser = auth.currentUser;
          const activeAuthEmail = (liveAuthUser == null ? void 0 : liveAuthUser.email) || (googleUser == null ? void 0 : googleUser.email) || "";
          const showAdminProfileVerifyBanner = shouldShowProfileResendVerificationButton({
            userRole,
            church: currentChurch,
            hasAuthUser: Boolean((liveAuthUser && liveAuthUser.uid) || (googleUser && googleUser.uid)),
            authEmailVerified: isEmailVerified,
            authUserEmail: activeAuthEmail,
          });
          if (!showAdminProfileVerifyBanner || adminCloudSyncAlert || !currentChurch) return null;
          const targetEmail = currentChurch.adminGoogleEmail || activeAuthEmail;
          const remainingSec = Math.max(
            adminBannerVerifCooldown,
            computeResendCooldownRemaining(getVerificationEmailLastSentAt(targetEmail))
          );
          const resendLabel =
            language === "es"
              ? "Reenviar correo de verificación"
              : language === "fr"
              ? "Renvoyer l’e-mail de vérification"
              : language === "en"
              ? "Resend verification email"
              : "Resend imel verifikasyon";
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", {
            id: "admin-unverified-email-banner",
            className: "mb-4 px-4 py-3 rounded-2xl bg-[#1E293B] border border-amber-500/35 text-slate-200 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2.5 min-w-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Mail, { className: "w-4 h-4" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 space-y-0.5 leading-snug", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-bold text-white", children: language === "es" ? "Correo del propietario aún sin verificar" : language === "fr" ? "E-mail du propriétaire non vérifié" : language === "en" ? "Owner email address not verified yet" : "Imèl mèt legliz la poko verifye" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[11px] text-slate-300", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-amber-300 break-all", children: targetEmail }),
                    " — ",
                    language === "es"
                      ? "Si el enlace anterior expiró, puede reenviar uno nuevo en cualquier momento."
                      : language === "fr"
                      ? "Si le lien précédent a expiré, vous pouvez en renvoyer un nouveau à tout moment."
                      : language === "en"
                      ? "If an older verification link expired, you can resend a fresh link anytime."
                      : "Menm si ansyen lyen verifikasyon an ekspire deja, ou toujou ka revoye yon nouvo kounye a."
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2 shrink-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("button", {
                  type: "button",
                  id: "admin-banner-resend-verification-btn",
                  disabled: isResendingAdminBannerVerif || remainingSec > 0,
                  onClick: async () => {
                    if (isResendingAdminBannerVerif || remainingSec > 0) return;
                    const requiresReauth = needsInlineReauthForVerification({
                      church: currentChurch,
                      hasAuthUser: Boolean(auth.currentUser && auth.currentUser.uid),
                      authUserEmail: (auth.currentUser && auth.currentUser.email) || (googleUser && googleUser.email),
                    });
                    if (requiresReauth) {
                      setPostCreationVerifyChurch(currentChurch);
                      return;
                    }
                    setIsResendingAdminBannerVerif(true);
                    try {
                      const alreadyVerified = await refreshAuthUserState();
                      if (alreadyVerified) {
                        toast.success(
                          language === "en" ? "Email Already Verified!" : "Imèl ou Deja Verifye!",
                          language === "en" ? "Your owner email is confirmed." : "Kont mèt legliz ou a deja konfime."
                        );
                        return;
                      }
                      await resendAdminVerificationEmail();
                      recordVerificationEmailSent(targetEmail);
                      setAdminBannerVerifCooldown(EMAIL_VERIFICATION_RESEND_COOLDOWN_SEC);
                      toast.success(
                        language === "es" ? "Correo de verificación reenviado" : language === "fr" ? "E-mail renvoyé" : language === "en" ? "Verification Email Sent" : "Imèl Verifikasyon Voye",
                        language === "en"
                          ? `A fresh verification link was sent to ${targetEmail}.`
                          : `Nou voye yon nouvo lyen verifikasyon nan ${targetEmail}.`
                      );
                    } catch (err: any) {
                      if (!auth.currentUser) {
                        setPostCreationVerifyChurch(currentChurch);
                        return;
                      }
                      toast.error(language === "en" ? "Verification Note" : "Nòt Verifikasyon", err?.message || "Pa ka voye imèl la kounye a.");
                    } finally {
                      setIsResendingAdminBannerVerif(false);
                    }
                  },
                  className: "min-h-[36px] px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed whitespace-nowrap transition-colors",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Mail, { className: "w-3.5 h-3.5 shrink-0" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                      className: "tabular-nums",
                      children: isResendingAdminBannerVerif
                        ? (language === "en" ? "Sending..." : "Ap voye...")
                        : remainingSec > 0
                        ? `${resendLabel} (${remainingSec}s)`
                        : resendLabel
                    })
                  ]
                }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("button", {
                  type: "button",
                  id: "admin-banner-open-verify-screen-btn",
                  onClick: () => setPostCreationVerifyChurch(currentChurch),
                  className: "min-h-[36px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-3.5 h-3.5" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: language === "es" ? "Verificar" : language === "fr" ? "Vérifier" : language === "en" ? "Verify" : "Verifye" })
                  ]
                })
              ] })
            ]
          });
        })(),
        adminCloudSyncAlert && currentChurch && adminCloudSyncAlert.churchId === currentChurch.id && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 p-4 rounded-2xl bg-amber-500/15 border border-amber-400/50 text-amber-100 text-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-2.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldAlert, { className: "w-4 h-4 text-amber-300 shrink-0 mt-0.5" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-0.5 leading-relaxed", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-bold text-amber-200", children: language === "es" ? "Sincronización de cuenta pendiente (evita errores de permiso)" : language === "en" ? "Admin account cloud sync required (prevents permission errors)" : language === "fr" ? "Synchronisation du compte admin requise" : "Senkronizasyon Kont Admin Obligatwa (pou anpeche erè pèmisyon)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-amber-100/90", children: language === "es" ? `Verifique el correo ${adminCloudSyncAlert.email} una sola vez o inicie sesión con Google para sincronizar su ID con el servidor.` : language === "en" ? `Verify ${adminCloudSyncAlert.email} once or sign in with Google to permanently sync your admin ID with the cloud.` : language === "fr" ? `Vérifiez ${adminCloudSyncAlert.email} une fois ou connectez-vous avec Google pour synchroniser votre ID administrateur.` : `Verifye imèl ${adminCloudSyncAlert.email} yon sèl fwa oswa konekte ak Google pou senkronize ID kont ou a nèt ak baz done legliz la.` })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2 shrink-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", {
              type: "button",
              disabled: isHandlingAdminSyncAction,
              onClick: async () => {
                setIsHandlingAdminSyncAction(true);
                try {
                  await resendAdminVerificationEmail();
                  toast.success(
                    language === "en" ? "Verification Sent" : "Imèl Verifikasyon Voye ✓",
                    language === "en" ? `Check ${adminCloudSyncAlert.email} and click the link.` : `Louvri ${adminCloudSyncAlert.email} epi klike sou lyen verifikasyon an.`
                  );
                } catch (err: any) {
                  toast.error(language === "en" ? "Verification Note" : "Nòt", err?.message || "Pa ka voye imèl la.");
                } finally {
                  setIsHandlingAdminSyncAction(false);
                }
              },
              className: "px-3 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-400/40 font-bold text-[11px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Mail, { className: "w-3.5 h-3.5" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: language === "es" ? "Enviar Verificación" : language === "en" ? "Send Verification" : language === "fr" ? "Envoyer Lien" : "Voye Verifikasyon" })
              ]
            }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", {
              type: "button",
              disabled: isHandlingAdminSyncAction,
              onClick: async () => {
                setIsHandlingAdminSyncAction(true);
                try {
                  const verified = await refreshAuthUserState();
                  if (!verified) {
                    toast.warning(
                      language === "en" ? "Not Verified Yet" : "Poko Verifye",
                      language === "en" ? "Click the link in your email inbox (or Spam) first, then try again." : "Klike sou lyen ki nan imèl ou a (oswa Spam) dabò, epi re-eseye."
                    );
                    return;
                  }
                  lastAdminSyncKeyRef.current = "";
                  const res = await syncChurchAdminOwnershipWithCloud(currentChurch, { forceTokenRefresh: true, reloadUser: true });
                  if (res.synced && res.church) {
                    saveChurch(res.church);
                    clearPendingLocalUpload("church", res.church.id);
                    setCurrentChurch(res.church);
                    churchStore.setCurrentChurch(res.church);
                    setAdminCloudSyncAlert(null);
                    const pendingMembers = getMembersByChurch(res.church.id).filter((m) => hasPendingLocalUpload("member", m.id));
                    for (const pm of pendingMembers) {
                      firestoreAddMember(pm).then(() => clearPendingLocalUpload("member", pm.id)).catch(() => {});
                    }
                    toast.success(
                      language === "en" ? "Synced Successfully!" : "Senkronize avèk Siksè ✓",
                      language === "en" ? "Cloud write permissions are now active." : "Pèmisyon kont administratè ou a senkronize kounye a."
                    );
                  }
                } catch (err: any) {
                  toast.error(language === "en" ? "Sync Error" : "Erè Senkronizasyon", err?.message || "Re-eseye.");
                } finally {
                  setIsHandlingAdminSyncAction(false);
                }
              },
              className: "px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: `w-3.5 h-3.5 ${isHandlingAdminSyncAction ? "animate-spin" : ""}` }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: language === "es" ? "Ya Verifiqué — Sincronizar" : language === "en" ? "I Verified — Sync" : language === "fr" ? "Synchroniser" : "Mwen Verifye — Senkronize" })
              ]
            }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", {
              type: "button",
              disabled: isHandlingAdminSyncAction,
              onClick: async () => {
                setIsHandlingAdminSyncAction(true);
                try {
                  await signInWithGoogle();
                  lastAdminSyncKeyRef.current = "";
                  const res = await syncChurchAdminOwnershipWithCloud(currentChurch, { forceTokenRefresh: true });
                  if (res.synced && res.church) {
                    saveChurch(res.church);
                    clearPendingLocalUpload("church", res.church.id);
                    setCurrentChurch(res.church);
                    churchStore.setCurrentChurch(res.church);
                    setAdminCloudSyncAlert(null);
                    const pendingMembers = getMembersByChurch(res.church.id).filter((m) => hasPendingLocalUpload("member", m.id));
                    for (const pm of pendingMembers) {
                      firestoreAddMember(pm).then(() => clearPendingLocalUpload("member", pm.id)).catch(() => {});
                    }
                    toast.success(
                      language === "en" ? "Google Synced!" : "Senkronize ak Google ✓",
                      language === "en" ? "Your admin account is now synced with the church." : "Kont administratè ou a senkronize kounye a ak legliz la."
                    );
                  } else if (res.status === "owner_mismatch") {
                    toast.error(
                      language === "en" ? "Wrong Account" : "Move Kont",
                      language === "en" ? `Please sign in with ${res.expectedEmail || adminCloudSyncAlert.email}.` : `Tanpri konekte ak kont ${res.expectedEmail || adminCloudSyncAlert.email}.`
                    );
                  }
                } catch (err: any) {
                  toast.error(language === "en" ? "Google Sign-In Note" : "Erè Google", err?.message || "Re-eseye.");
                } finally {
                  setIsHandlingAdminSyncAction(false);
                }
              },
              className: "px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-[11px] cursor-pointer disabled:opacity-50",
              children: language === "es" ? "Sincronizar con Google" : language === "en" ? "Sync with Google" : language === "fr" ? "Synchroniser Google" : "Konekte ak Google"
            })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col lg:flex-row lg:items-start gap-6", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "aside",
            {
              id: "admin-desktop-sidebar",
              "aria-label": "OmniChurch PRO Desktop Navigation",
              className: "hidden lg:flex lg:flex-col w-60 shrink-0 rounded-2xl border border-slate-800/90 bg-gradient-to-b from-[#07152F] via-[#0B1733] to-[#0F172A] p-4 shadow-xl sticky top-20 self-start space-y-4",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center text-center pb-3.5 border-b border-slate-800/90 gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    OmniChurchLogo,
                    {
                      variant: "full",
                      priority: true,
                      className: "h-16 w-auto"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full min-w-0", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-bold text-white truncate", title: currentChurch.name, children: currentChurch.name }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 inline-flex items-center gap-1.5 text-[10px] font-mono text-[#38BDF8]", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-1.5 py-0.5 rounded bg-[#FBBF24]/15 border border-[#FBBF24]/30 text-[#FBBF24] font-bold", children: "PRO" }),
                      currentChurch.code && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-400", children: currentChurch.code })
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("nav", { className: "flex flex-col gap-1 text-xs", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("button", {
                    type: "button",
                    id: "sidebar-admin-tab-dashboard",
                    onClick: () => setAdminTab("dashboard"),
                    className: `flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold transition-all cursor-pointer text-left ${adminTab === "dashboard" ? "bg-[#FBBF24] text-slate-950 font-black shadow-md shadow-amber-400/20" : "text-slate-300 hover:text-white hover:bg-slate-800/60"}`,
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(LayoutDashboard, { className: "w-4 h-4 shrink-0" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: t3.navDashboard })
                    ]
                  }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("button", {
                    type: "button",
                    id: "sidebar-admin-tab-attendance",
                    onClick: () => setAdminTab("attendance"),
                    className: `flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl font-bold transition-all cursor-pointer text-left ${adminTab === "attendance" ? "bg-[#FBBF24] text-slate-950 font-black shadow-md shadow-amber-400/20" : "text-slate-300 hover:text-white hover:bg-slate-800/60"}`,
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-2.5 min-w-0", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "w-4 h-4 shrink-0" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: t3.navAttendance })
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-[10px] font-mono px-1.5 py-0.5 rounded-md ${adminTab === "attendance" ? "bg-slate-950/15 text-slate-950" : "bg-slate-800 text-slate-400"}`, children: attendanceRecords.length })
                    ]
                  }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("button", {
                    type: "button",
                    id: "sidebar-admin-tab-members",
                    onClick: () => setAdminTab("members"),
                    className: `flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl font-bold transition-all cursor-pointer text-left ${adminTab === "members" ? "bg-[#FBBF24] text-slate-950 font-black shadow-md shadow-amber-400/20" : "text-slate-300 hover:text-white hover:bg-slate-800/60"}`,
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-2.5 min-w-0", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "w-4 h-4 shrink-0" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: t3.navMembers })
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-[10px] font-mono px-1.5 py-0.5 rounded-md ${adminTab === "members" ? "bg-slate-950/15 text-slate-950" : "bg-slate-800 text-slate-400"}`, children: members.length })
                    ]
                  }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("button", {
                    type: "button",
                    id: "sidebar-admin-tab-cards",
                    onClick: () => {
                      setCardTargetMember(null);
                      setAdminTab("cards");
                    },
                    className: `flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold transition-all cursor-pointer text-left ${adminTab === "cards" ? "bg-[#FBBF24] text-slate-950 font-black shadow-md shadow-amber-400/20" : "text-slate-300 hover:text-white hover:bg-slate-800/60"}`,
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Printer, { className: "w-4 h-4 shrink-0" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: t3.navCards })
                    ]
                  }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("button", {
                    type: "button",
                    id: "sidebar-admin-tab-services",
                    onClick: () => setAdminTab("services"),
                    className: `flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl font-bold transition-all cursor-pointer text-left ${adminTab === "services" ? "bg-[#FBBF24] text-slate-950 font-black shadow-md shadow-amber-400/20" : "text-slate-300 hover:text-white hover:bg-slate-800/60"}`,
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-2.5 min-w-0", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, { className: "w-4 h-4 shrink-0" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: t3.navServices })
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-[10px] font-mono px-1.5 py-0.5 rounded-md ${adminTab === "services" ? "bg-slate-950/15 text-slate-950" : "bg-slate-800 text-slate-400"}`, children: services.length })
                    ]
                  }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("button", {
                    type: "button",
                    id: "sidebar-admin-tab-history",
                    onClick: () => {
                      setHistoryInitialServiceId(void 0);
                      setAdminTab("history");
                    },
                    className: `flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold transition-all cursor-pointer text-left ${adminTab === "history" ? "bg-[#FBBF24] text-slate-950 font-black shadow-md shadow-amber-400/20" : "text-slate-300 hover:text-white hover:bg-slate-800/60"}`,
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(History, { className: "w-4 h-4 shrink-0" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: t3.navServiceHistory || (language === "es" ? "Historial de Cultos" : language === "en" ? "Service History" : language === "fr" ? "Historique Cultes" : "Istwa Sèvis") })
                    ]
                  }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("button", {
                    type: "button",
                    id: "sidebar-admin-tab-announcements",
                    onClick: () => setAdminTab("announcements"),
                    className: `flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl font-bold transition-all cursor-pointer text-left ${adminTab === "announcements" ? "bg-[#FBBF24] text-slate-950 font-black shadow-md shadow-amber-400/20" : "text-slate-300 hover:text-white hover:bg-slate-800/60"}`,
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-2.5 min-w-0", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Bell, { className: "w-4 h-4 shrink-0" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: t3.navAnnouncements })
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-[10px] font-mono px-1.5 py-0.5 rounded-md ${adminTab === "announcements" ? "bg-slate-950/15 text-slate-950" : "bg-slate-800 text-slate-400"}`, children: announcements.length })
                    ]
                  }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("button", {
                    type: "button",
                    id: "sidebar-admin-tab-settings",
                    onClick: () => setAdminTab("settings"),
                    className: `flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold transition-all cursor-pointer text-left ${adminTab === "settings" ? "bg-[#FBBF24] text-slate-950 font-black shadow-md shadow-amber-400/20" : "text-slate-300 hover:text-white hover:bg-slate-800/60"}`,
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { className: "w-4 h-4 shrink-0" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: t3.navSettings })
                    ]
                  })
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0 space-y-6", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex lg:hidden items-center gap-1 overflow-x-auto pb-1 border-b border-slate-800 text-xs scrollbar-none", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              id: "admin-tab-dashboard",
              onClick: () => setAdminTab("dashboard"),
              className: `relative flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${adminTab === "dashboard" ? "text-slate-950 font-black" : "text-slate-400 hover:text-white hover:bg-slate-800/40"}`,
              children: [
                adminTab === "dashboard" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  motion.div,
                  {
                    layoutId: "admin-active-tab-pill",
                    className: "absolute inset-0 bg-amber-400 rounded-xl shadow-md -z-10",
                    transition: { type: "spring", stiffness: 400, damping: 32 }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(LayoutDashboard, { className: "w-4 h-4" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t3.navDashboard })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              id: "admin-tab-attendance",
              onClick: () => setAdminTab("attendance"),
              className: `relative flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${adminTab === "attendance" ? "text-slate-950 font-black" : "text-slate-400 hover:text-white hover:bg-slate-800/40"}`,
              children: [
                adminTab === "attendance" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  motion.div,
                  {
                    layoutId: "admin-active-tab-pill",
                    className: "absolute inset-0 bg-amber-400 rounded-xl shadow-md -z-10",
                    transition: { type: "spring", stiffness: 400, damping: 32 }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "w-4 h-4" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                  t3.navAttendance,
                  " (",
                  attendanceRecords.length,
                  ")"
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              id: "admin-tab-members",
              onClick: () => setAdminTab("members"),
              className: `relative flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${adminTab === "members" ? "text-slate-950 font-black" : "text-slate-400 hover:text-white hover:bg-slate-800/40"}`,
              children: [
                adminTab === "members" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  motion.div,
                  {
                    layoutId: "admin-active-tab-pill",
                    className: "absolute inset-0 bg-amber-400 rounded-xl shadow-md -z-10",
                    transition: { type: "spring", stiffness: 400, damping: 32 }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "w-4 h-4" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                  t3.navMembers,
                  " (",
                  members.length,
                  ")"
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              id: "admin-tab-cards",
              onClick: () => {
                setCardTargetMember(null);
                setAdminTab("cards");
              },
              className: `relative flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${adminTab === "cards" ? "text-slate-950 font-black" : "text-slate-400 hover:text-white hover:bg-slate-800/40"}`,
              children: [
                adminTab === "cards" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  motion.div,
                  {
                    layoutId: "admin-active-tab-pill",
                    className: "absolute inset-0 bg-amber-400 rounded-xl shadow-md -z-10",
                    transition: { type: "spring", stiffness: 400, damping: 32 }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Printer, { className: "w-4 h-4" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t3.navCards })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              id: "admin-tab-services",
              onClick: () => setAdminTab("services"),
              className: `relative flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${adminTab === "services" ? "text-slate-950 font-black" : "text-slate-400 hover:text-white hover:bg-slate-800/40"}`,
              children: [
                adminTab === "services" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  motion.div,
                  {
                    layoutId: "admin-active-tab-pill",
                    className: "absolute inset-0 bg-amber-400 rounded-xl shadow-md -z-10",
                    transition: { type: "spring", stiffness: 400, damping: 32 }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, { className: "w-4 h-4" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                  t3.navServices,
                  " (",
                  services.length,
                  ")"
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              id: "admin-tab-history",
              onClick: () => {
                setHistoryInitialServiceId(void 0);
                setAdminTab("history");
              },
              className: `relative flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${adminTab === "history" ? "text-slate-950 font-black" : "text-slate-400 hover:text-white hover:bg-slate-800/40"}`,
              children: [
                adminTab === "history" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  motion.div,
                  {
                    layoutId: "admin-active-tab-pill",
                    className: "absolute inset-0 bg-amber-400 rounded-xl shadow-md -z-10",
                    transition: { type: "spring", stiffness: 400, damping: 32 }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(History, { className: "w-4 h-4" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t3.navServiceHistory || (language === "es" ? "Historial de Cultos" : language === "en" ? "Service History" : language === "fr" ? "Historique Cultes" : "Istwa Sèvis") })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              id: "admin-tab-announcements",
              onClick: () => setAdminTab("announcements"),
              className: `relative flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${adminTab === "announcements" ? "text-slate-950 font-black" : "text-slate-400 hover:text-white hover:bg-slate-800/40"}`,
              children: [
                adminTab === "announcements" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  motion.div,
                  {
                    layoutId: "admin-active-tab-pill",
                    className: "absolute inset-0 bg-amber-400 rounded-xl shadow-md -z-10",
                    transition: { type: "spring", stiffness: 400, damping: 32 }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Bell, { className: "w-4 h-4" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                  t3.navAnnouncements,
                  " (",
                  announcements.length,
                  ")"
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              id: "admin-tab-settings",
              onClick: () => setAdminTab("settings"),
              className: `relative flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${adminTab === "settings" ? "text-slate-950 font-black" : "text-slate-400 hover:text-white hover:bg-slate-800/40"}`,
              children: [
                adminTab === "settings" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  motion.div,
                  {
                    layoutId: "admin-active-tab-pill",
                    className: "absolute inset-0 bg-amber-400 rounded-xl shadow-md -z-10",
                    transition: { type: "spring", stiffness: 400, damping: 32 }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { className: "w-4 h-4" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t3.navSettings })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "w-full",
            children: [
              adminTab === "dashboard" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                AdminDashboard,
                {
                  church: currentChurch,
                  members,
                  services,
                  attendanceRecords,
                  announcements,
                  language,
                  onOpenScanner: () => setIsScannerOpen(true),
                  onKeepSessionAlive: () => {
                    lastAdminActivityRef.current = Date.now();
                  },
                  onRefresh: () => {
                    if (currentChurch) {
                      setMembers(getMembersByChurch(currentChurch.id));
                      setServices(getServicesByChurch(currentChurch.id));
                      setAttendanceRecords(getAttendanceByChurch(currentChurch.id));
                      setAnnouncements(getAnnouncementsByChurch(currentChurch.id));
                    }
                  },
                  onNavigateTab: (tab) => {
                    if (tab === "history" || tab === "service_history") {
                      setHistoryInitialServiceId(void 0);
                      setAdminTab("history");
                    } else {
                      setAdminTab(tab);
                    }
                  },
                  onToggleActiveService: handleToggleActiveService,
                  onOpenDonateScreen: () => {
                    setIsNotificationsPageOpen(false);
                    setIsDonateScreenOpen(true);
                  }
                }
              ),
              adminTab === "attendance" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                AdminAttendance,
                {
                  church: currentChurch,
                  services,
                  attendanceRecords,
                  members,
                  language,
                  onOpenScanner: () => setIsScannerOpen(true),
                  onToggleServiceActive: handleToggleActiveService,
                  onAttendanceChange: () => {
                    if (currentChurch) {
                      setAttendanceRecords(getAttendanceByChurch(currentChurch.id));
                    }
                  }
                }
              ),
              adminTab === "members" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                AdminMembers,
                {
                  church: currentChurch,
                  members,
                  language,
                  onMembersChange: () => {
                    setMembers(getMembersByChurch(currentChurch.id));
                  },
                  onNavigateToCards: (targetMember) => {
                    setCardTargetMember(targetMember || null);
                    setAdminTab("cards");
                  }
                }
              ),
              adminTab === "cards" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                AdminCardsPage,
                {
                  church: currentChurch,
                  allMembers: members,
                  initialMember: cardTargetMember || void 0,
                  language,
                  onBack: () => setAdminTab("members")
                }
              ),
              adminTab === "services" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                AdminServices,
                {
                  church: currentChurch,
                  services,
                  members,
                  language,
                  initialCategory: serviceCategoryInitial,
                  onServicesChange: () => {
                    setServices(getServicesByChurch(currentChurch.id));
                  },
                  onServicesUpdated: () => {
                    setServices(getServicesByChurch(currentChurch.id));
                  },
                  onOpenScanner: () => setIsScannerOpen(true),
                  onNavigateToHistory: (srvId) => {
                    setHistoryInitialServiceId(srvId);
                    setAdminTab("history");
                  }
                }
              ),
              adminTab === "history" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                AdminServiceHistory,
                {
                  church: currentChurch,
                  services,
                  members,
                  language,
                  initialServiceId: historyInitialServiceId,
                  onBackToServices: () => setAdminTab("services"),
                  onOpenScanner: () => setIsScannerOpen(true)
                }
              ),
              adminTab === "announcements" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                AdminAnnouncements,
                {
                  church: currentChurch,
                  announcements,
                  services,
                  language,
                  onAnnouncementsUpdated: () => {
                    setAnnouncements(getAnnouncementsByChurch(currentChurch.id));
                  }
                }
              ),
              adminTab === "settings" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                AdminChurchSettings,
                {
                  church: currentChurch,
                  allChurches,
                  language,
                  onChurchChange: (newChurchId) => {
                    handleChurchChange(newChurchId);
                  },
                  onChurchSaved: () => {
                    const refreshed = getAllChurches();
                    setAllChurches(refreshed);
                    const current2 = refreshed.find((c3) => c3.id === (currentChurch == null ? void 0 : currentChurch.id));
                    if (current2) setCurrentChurch(current2);
                  },
                  onChurchCreated: (newChurch) => {
                    const refreshed = getAllChurches();
                    setAllChurches(refreshed);
                    setActiveChurchId(newChurch.id);
                    setSavedActiveChurchId(newChurch.id);
                    setCurrentChurch(newChurch);
                    maybeOpenPostCreationVerification(newChurch);
                  },
                  onChurchDeleted: (deletedChurchId) => {
                    const refreshed = getAllChurches().filter((c3) => c3.id !== deletedChurchId);
                    setAllChurches(refreshed);
                    if (refreshed.length > 0) {
                      const next = refreshed[0];
                      setActiveChurchId(next.id);
                      setSavedActiveChurchId(next.id);
                      setCurrentChurch(next);
                      setMembers(getMembersByChurch(next.id));
                      setServices(getServicesByChurch(next.id));
                      setAnnouncements(getAnnouncementsByChurch(next.id));
                      setAttendanceRecords(getAttendanceByChurch(next.id));
                    } else {
                      setActiveChurchId("");
                      setSavedActiveChurchId("");
                      setCurrentChurch(null);
                      setMembers([]);
                      setServices([]);
                      setAnnouncements([]);
                      setAttendanceRecords([]);
                    }
                  },
                  onSystemReset: () => {
                    setAllChurches([]);
                    setActiveChurchId("");
                    setSavedActiveChurchId("");
                    setCurrentChurch(null);
                    setMembers([]);
                    setServices([]);
                    setAnnouncements([]);
                    setAttendanceRecords([]);
                    setActiveMemberId("");
                    window.location.reload();
                  },
                  onRefreshAll: () => {
                    const refreshed = getAllChurches();
                    setAllChurches(refreshed);
                    if (currentChurch) {
                      const current2 = refreshed.find((c3) => c3.id === currentChurch.id);
                      if (current2) {
                        setCurrentChurch(current2);
                        setMembers(getMembersByChurch(current2.id));
                        setServices(getServicesByChurch(current2.id));
                        setAnnouncements(getAnnouncementsByChurch(current2.id));
                        setAttendanceRecords(getAttendanceByChurch(current2.id));
                      }
                    }
                  },
                  onOpenPrivacyPolicy: () => openLegalPage("privacy"),
                  onOpenTermsOfService: () => openLegalPage("terms"),
                  onOpenEmailVerificationScreen: () => {
                    if (currentChurch) setPostCreationVerifyChurch(currentChurch);
                  }
                }
              )
            ]
          },
          adminTab
        )
          ] })
        ] })
      ] })
    ) : !currentMember ? (
      /* =========================================================================
         MEMBER AUTHENTICATION SCREEN (Ultra Pro Max: Select Church + ID + PIN)
         ========================================================================= */
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        MemberLoginScreen,
        {
          allChurches,
          selectedChurchId: activeChurchId,
          onSelectChurch: handleChurchChange,
          onLoginSuccess: handleMemberLoginSuccess,
          onSwitchToAdmin: () => handleRoleChange("admin"),
          members,
          language,
          onLanguageChange: handleLanguageChange,
          onAutoDetectLanguage: handleAutoDetectLanguage,
          autoDetectedBadge,
          onOpenCreateChurch: () => setIsCreateChurchModalOpen(true),
          onOpenPrivacyPolicy: () => openLegalPage("privacy"),
          onOpenTermsOfService: () => openLegalPage("terms")
        }
      )
    ) : (
      /* =========================================================================
         MEMBER WORKSPACE (Authenticated Member Workspace)
         ========================================================================= */
      /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-800 text-xs scrollbar-none", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              id: "member-tab-home",
              onClick: () => setMemberTab("home"),
              className: `relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${memberTab === "home" ? "text-slate-950 font-black" : "text-slate-400 hover:text-white hover:bg-slate-800/40"}`,
              children: [
                memberTab === "home" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  motion.div,
                  {
                    layoutId: "member-active-tab-pill",
                    className: "absolute inset-0 bg-amber-400 rounded-xl shadow-md -z-10",
                    transition: { type: "spring", stiffness: 400, damping: 32 }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(House, { className: "w-4 h-4" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t3.navHome })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              id: "member-tab-mycode",
              onClick: () => setMemberTab("mycode"),
              className: `relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${memberTab === "mycode" ? "text-slate-950 font-black" : "text-slate-400 hover:text-white hover:bg-slate-800/40"}`,
              children: [
                memberTab === "mycode" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  motion.div,
                  {
                    layoutId: "member-active-tab-pill",
                    className: "absolute inset-0 bg-amber-400 rounded-xl shadow-md -z-10",
                    transition: { type: "spring", stiffness: 400, damping: 32 }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(QrCode, { className: "w-4 h-4" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t3.myDigitalCard })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              id: "member-tab-services",
              onClick: () => setMemberTab("services"),
              className: `relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${memberTab === "services" ? "text-slate-950 font-black" : "text-slate-400 hover:text-white hover:bg-slate-800/40"}`,
              children: [
                memberTab === "services" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  motion.div,
                  {
                    layoutId: "member-active-tab-pill",
                    className: "absolute inset-0 bg-amber-400 rounded-xl shadow-md -z-10",
                    transition: { type: "spring", stiffness: 400, damping: 32 }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, { className: "w-4 h-4" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t3.navServices })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              id: "member-tab-attendance",
              onClick: () => setMemberTab("attendance"),
              className: `relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${memberTab === "attendance" ? "text-slate-950 font-black" : "text-slate-400 hover:text-white hover:bg-slate-800/40"}`,
              children: [
                memberTab === "attendance" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  motion.div,
                  {
                    layoutId: "member-active-tab-pill",
                    className: "absolute inset-0 bg-amber-400 rounded-xl shadow-md -z-10",
                    transition: { type: "spring", stiffness: 400, damping: 32 }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "w-4 h-4" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t3.navAttendance })
              ]
            }
          ),
          isReceptionMember && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              id: "member-tab-reception",
              onClick: () => setMemberTab("reception"),
              className: `relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${memberTab === "reception" ? "text-slate-950 font-black" : "text-emerald-300 hover:text-white hover:bg-emerald-500/10"}`,
              children: [
                memberTab === "reception" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  motion.div,
                  {
                    layoutId: "member-active-tab-pill",
                    className: "absolute inset-0 bg-emerald-400 rounded-xl shadow-md -z-10",
                    transition: { type: "spring", stiffness: 400, damping: 32 }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(UserCheck, { className: "w-4 h-4" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: language === "es" ? "Recepción & Escaneo" : language === "en" ? "Reception & Scan" : language === "fr" ? "Réception & Scan" : "Resepsyon & Scan" })
              ]
            }
          ),
          canCreateServicesMember && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              id: "member-tab-deacon-services",
              onClick: () => setMemberTab("deacon_services"),
              className: `relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${memberTab === "deacon_services" ? "text-slate-950 font-black" : "text-amber-300 hover:text-white hover:bg-amber-500/10"}`,
              children: [
                memberTab === "deacon_services" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  motion.div,
                  {
                    layoutId: "member-active-tab-pill",
                    className: "absolute inset-0 bg-amber-400 rounded-xl shadow-md -z-10",
                    transition: { type: "spring", stiffness: 400, damping: 32 }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, { className: "w-4 h-4" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: language === "es" ? "Crear Cultos" : language === "en" ? "Manage Services" : language === "fr" ? "Créer Cultes" : "Kreye Sèvis" })
              ]
            }
          ),
          canPublishAnnouncementsMember && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              id: "member-tab-deacon-announcements",
              onClick: () => setMemberTab("deacon_announcements"),
              className: `relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${memberTab === "deacon_announcements" ? "text-slate-950 font-black" : "text-amber-300 hover:text-white hover:bg-amber-500/10"}`,
              children: [
                memberTab === "deacon_announcements" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  motion.div,
                  {
                    layoutId: "member-active-tab-pill",
                    className: "absolute inset-0 bg-amber-400 rounded-xl shadow-md -z-10",
                    transition: { type: "spring", stiffness: 400, damping: 32 }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Megaphone, { className: "w-4 h-4" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: language === "es" ? "Publicar Avisos" : language === "en" ? "Publish Announcements" : language === "fr" ? "Publier Annonces" : "Pibliye Anons" })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              id: "member-tab-profile",
              onClick: () => setMemberTab("profile"),
              className: `relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${memberTab === "profile" ? "text-slate-950 font-black" : "text-slate-400 hover:text-white hover:bg-slate-800/40"}`,
              children: [
                memberTab === "profile" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  motion.div,
                  {
                    layoutId: "member-active-tab-pill",
                    className: "absolute inset-0 bg-amber-400 rounded-xl shadow-md -z-10",
                    transition: { type: "spring", stiffness: 400, damping: 32 }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(User2, { className: "w-4 h-4" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t3.myProfile })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "w-full",
            children: [
              memberTab === "home" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                MemberHome,
                {
                  church: currentChurch,
                  member: currentMember,
                  members,
                  services,
                  announcements,
                  language,
                  isReception: isReceptionMember,
                  onOpenReceptionDesk: () => setMemberTab("reception"),
                  onOpenReceptionScanner: () => setIsScannerOpen(true),
                  isDeacon: isDeaconMember,
                  onOpenDeaconServices: canCreateServicesMember ? () => setMemberTab("deacon_services") : void 0,
                  onOpenDeaconAnnouncements: canPublishAnnouncementsMember ? () => setMemberTab("deacon_announcements") : void 0,
                  onOpenMyCode: () => setMemberTab("mycode"),
                  onSelectServiceCategory: (cat) => {
                    setServiceCategoryInitial(cat);
                    setMemberTab("services");
                  },
                  onOpenDonateScreen: () => {
                    setIsNotificationsPageOpen(false);
                    setIsDonateScreenOpen(true);
                  }
                }
              ),
              memberTab === "mycode" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                MemberCard,
                {
                  church: currentChurch,
                  member: currentMember,
                  language,
                  onMemberUpdated: (updated) => {
                    setActiveMemberId(updated.memberId);
                    setMembers((prev) => {
                      const exists = prev.some((m2) => m2.id === updated.id || m2.memberId === updated.memberId);
                      const next = exists
                        ? prev.map((m2) => (m2.id === updated.id || m2.memberId === updated.memberId ? updated : m2))
                        : [...prev, updated];
                      churchStore.setMembers(next);
                      return next;
                    });
                  }
                }
              ),
              memberTab === "services" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                MemberServices,
                {
                  church: currentChurch,
                  member: currentMember,
                  services,
                  attendanceRecords: memberAttendance,
                  initialCategory: serviceCategoryInitial,
                  onOpenMyCode: () => setMemberTab("mycode"),
                  language
                }
              ),
              memberTab === "attendance" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                MemberAttendanceHistory,
                {
                  church: currentChurch,
                  member: currentMember,
                  attendanceRecords: memberAttendance,
                  visitorVisits: memberVisitorVisits,
                  language
                }
              ),
              memberTab === "reception" && isReceptionMember && /* @__PURE__ */ jsxRuntimeExports.jsx(
                ReceptionDeskPanel,
                {
                  church: currentChurch,
                  currentMember,
                  members,
                  services,
                  attendanceRecords,
                  language,
                  onOpenScanner: () => setIsScannerOpen(true),
                  onAttendanceUpdated: () => {
                    if (currentChurch) {
                      setAttendanceRecords(getAttendanceByChurch(currentChurch.id));
                    }
                  }
                }
              ),
              memberTab === "deacon_services" && canCreateServicesMember && /* @__PURE__ */ jsxRuntimeExports.jsx(
                AdminServices,
                {
                  church: currentChurch,
                  services,
                  members,
                  currentMember,
                  isDeaconMode: true,
                  language,
                  initialCategory: serviceCategoryInitial,
                  onOpenScanner: isReceptionMember ? () => setIsScannerOpen(true) : void 0,
                  onServicesChange: () => {
                    setServices(getServicesByChurch(currentChurch.id));
                  },
                  onServicesUpdated: () => {
                    setServices(getServicesByChurch(currentChurch.id));
                  }
                }
              ),
              memberTab === "deacon_announcements" && canPublishAnnouncementsMember && /* @__PURE__ */ jsxRuntimeExports.jsx(
                AdminAnnouncements,
                {
                  church: currentChurch,
                  announcements,
                  services,
                  currentMember,
                  isDeaconMode: true,
                  language,
                  onAnnouncementsChange: () => {
                    setAnnouncements(getAnnouncementsByChurch(currentChurch.id));
                  },
                  onAnnouncementsUpdated: () => {
                    setAnnouncements(getAnnouncementsByChurch(currentChurch.id));
                  }
                }
              ),
              memberTab === "profile" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                MemberProfile,
                {
                  church: currentChurch,
                  member: currentMember,
                  attendance: memberAttendance,
                  language,
                  onMemberUpdated: (updated) => {
                    setActiveMemberId(updated.memberId);
                    setMembers((prev) => {
                      const exists = prev.some((m2) => m2.id === updated.id || m2.memberId === updated.memberId);
                      const next = exists
                        ? prev.map((m2) => (m2.id === updated.id || m2.memberId === updated.memberId ? updated : m2))
                        : [...prev, updated];
                      churchStore.setMembers(next);
                      return next;
                    });
                  }
                }
              )
            ]
          },
          memberTab
        )
      ] })
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      SponsorMarqueeFooter,
      {
        language,
        onOpenDevPanel: () => setIsDevAuthModalOpen(true),
        onOpenPrivacyPolicy: () => openLegalPage("privacy"),
        onOpenTermsOfService: () => openLegalPage("terms")
      }
    ),
    (userRole === "admin" || currentMember) && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0F172A]/95 backdrop-blur-md border-t border-slate-800 px-3 py-2 flex items-center justify-around", children: userRole === "admin" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: () => setAdminTab("dashboard"),
          className: `flex flex-col items-center gap-1 text-[10px] font-bold ${adminTab === "dashboard" ? "text-amber-400" : "text-slate-400"}`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(LayoutDashboard, { className: "w-5 h-5" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t3.navDashboard })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: () => setAdminTab("attendance"),
          className: `flex flex-col items-center gap-1 text-[10px] font-bold ${adminTab === "attendance" ? "text-amber-400" : "text-slate-400"}`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "w-5 h-5" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t3.navAttendance })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: () => setIsScannerOpen(true),
          className: "flex flex-col items-center justify-center -mt-5 w-12 h-12 rounded-full bg-amber-400 text-slate-950 shadow-lg font-bold",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Camera, { className: "w-6 h-6" })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: () => setAdminTab("members"),
          className: `flex flex-col items-center gap-1 text-[10px] font-bold ${adminTab === "members" ? "text-amber-400" : "text-slate-400"}`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "w-5 h-5" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t3.navMembers })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: () => setAdminTab("settings"),
          className: `flex flex-col items-center gap-1 text-[10px] font-bold ${adminTab === "settings" ? "text-amber-400" : "text-slate-400"}`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { className: "w-5 h-5" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t3.navSettings })
          ]
        }
      )
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: () => setMemberTab("home"),
          className: `flex flex-col items-center gap-1 text-[10px] font-bold ${memberTab === "home" ? "text-amber-400" : "text-slate-400"}`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(House, { className: "w-5 h-5" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t3.navHome })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: () => setMemberTab("services"),
          className: `flex flex-col items-center gap-1 text-[10px] font-bold ${memberTab === "services" ? "text-amber-400" : "text-slate-400"}`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, { className: "w-5 h-5" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t3.navServices })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: () => setMemberTab("mycode"),
          className: "flex flex-col items-center justify-center -mt-5 w-12 h-12 rounded-full bg-amber-400 text-slate-950 shadow-lg font-bold",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(QrCode, { className: "w-6 h-6" })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: () => setMemberTab("attendance"),
          className: `flex flex-col items-center gap-1 text-[10px] font-bold ${memberTab === "attendance" ? "text-amber-400" : "text-slate-400"}`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "w-5 h-5" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t3.navAttendance })
          ]
        }
      ),
      isReceptionMember && /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: () => setMemberTab("reception"),
          className: `flex flex-col items-center gap-1 text-[10px] font-bold ${memberTab === "reception" ? "text-emerald-400" : "text-slate-400"}`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(UserCheck, { className: "w-5 h-5" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: language === "es" ? "Recepción" : language === "en" ? "Reception" : language === "fr" ? "Réception" : "Resepsyon" })
          ]
        }
      ),
      canCreateServicesMember && /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          id: "mobile-member-tab-deacon-services",
          onClick: () => setMemberTab("deacon_services"),
          className: `flex flex-col items-center gap-1 text-[10px] font-bold ${memberTab === "deacon_services" ? "text-amber-400" : "text-slate-400"}`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, { className: "w-5 h-5" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: language === "es" ? "Cultos" : language === "en" ? "Services" : language === "fr" ? "Cultes" : "Sèvis+" })
          ]
        }
      ),
      canPublishAnnouncementsMember && /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          id: "mobile-member-tab-deacon-announcements",
          onClick: () => setMemberTab("deacon_announcements"),
          className: `flex flex-col items-center gap-1 text-[10px] font-bold ${memberTab === "deacon_announcements" ? "text-amber-400" : "text-slate-400"}`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Megaphone, { className: "w-5 h-5" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: language === "es" ? "Avisos" : language === "en" ? "News" : language === "fr" ? "Annonces" : "Anons" })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: () => setMemberTab("profile"),
          className: `flex flex-col items-center gap-1 text-[10px] font-bold ${memberTab === "profile" ? "text-amber-400" : "text-slate-400"}`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(User2, { className: "w-5 h-5" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t3.myProfile })
          ]
        }
      )
    ] }) }),
    isScannerOpen && (userRole === "admin" || isReceptionMember) && /* @__PURE__ */ jsxRuntimeExports.jsx(
      QrScannerModal,
      {
        church: currentChurch,
        services,
        isOpen: isScannerOpen,
        language,
        restrictToActiveService: userRole === "member",
        operatorLabel: isReceptionMember && currentMember ? `Resepsyon: ${currentMember.fullName}` : void 0,
        onClose: () => setIsScannerOpen(false),
        onAttendanceRecorded: () => {
          if (currentChurch) {
            setAttendanceRecords(getAttendanceByChurch(currentChurch.id));
          }
        },
        onScanSuccess: () => {
          if (currentChurch) {
            setAttendanceRecords(getAttendanceByChurch(currentChurch.id));
          }
        }
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      UserTutorialModal,
      {
        isOpen: isTutorialOpen,
        onClose: () => setIsTutorialOpen(false),
        onOpenCreateChurch: () => {
          setIsTutorialOpen(false);
          setIsCreateChurchModalOpen(true);
        },
        language,
        userRole,
        currentChurch,
        currentMember
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      LanguageSelectionModal,
      {
        isOpen: isLanguageModalOpen,
        currentLanguage: language,
        onSelectLanguage: handleLanguageChange,
        onClose: () => setIsLanguageModalOpen(false),
        onAutoDetectLanguage: handleAutoDetectLanguage,
        detectedCountryCode: languageResolution.detectedCountryCode,
        isAutoDetected:
          languageResolution.source === "country_position" ||
          languageResolution.source === "browser",
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      DesktopAppDownloadModal,
      {
        isOpen: isDesktopModalOpen,
        onClose: () => setIsDesktopModalOpen(false),
        church: currentChurch,
        language,
        userRole,
        onChurchSaved: () => {
          const refreshed = getAllChurches();
          setAllChurches(refreshed);
          if (currentChurch) {
            const curr = refreshed.find((c3) => c3.id === currentChurch.id);
            if (curr) setCurrentChurch(curr);
          }
        }
      }
    ),
    isAdminPasscodeModalOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
      AdminPasscodeModal,
      {
        isOpen: isAdminPasscodeModalOpen,
        onClose: () => {
          setIsAdminPasscodeModalOpen(false);
          setPendingAdminChurch(null);
          setIsAutoLocked(false);
        },
        church: isAutoLocked ? (pendingAdminChurch || currentChurch) : null,
        allChurches,
        language,
        onSuccess: handleAdminAuthSuccess,
        isAutoLock: isAutoLocked,
        onOpenCreateChurch: () => {
          setIsAdminPasscodeModalOpen(false);
          setPendingAdminChurch(null);
          setIsAutoLocked(false);
          setIsCreateChurchModalOpen(true);
        }
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      CreateChurchModal,
      {
        isOpen: isCreateChurchModalOpen,
        onClose: () => setIsCreateChurchModalOpen(false),
        onChurchCreated: handleChurchCreatedSuccessfully,
        language
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      DeveloperAuthModal,
      {
        isOpen: isDevAuthModalOpen,
        language,
        onClose: () => setIsDevAuthModalOpen(false),
        onSuccess: () => {
          setIsDevAuthModalOpen(false);
          setIsDevEngineModalOpen(true);
        }
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      AppUpdateModal,
      {
        isOpen: isUpdateModalOpen,
        onClose: () => setIsUpdateModalOpen(false),
        language
      }
    ),
    postCreationVerifyChurch && /* @__PURE__ */ jsxRuntimeExports.jsx(
      AdminEmailVerificationScreen,
      {
        church: postCreationVerifyChurch,
        language,
        onVerifiedComplete: (syncedChurch) => {
          const refreshed = getAllChurches();
          setAllChurches(refreshed);
          setCurrentChurch(syncedChurch);
          churchStore.setCurrentChurch(syncedChurch);
          setAdminCloudSyncAlert(null);
          lastAdminSyncKeyRef.current = "";
          setPostCreationVerifyChurch(null);
        },
        onContinueLater: () => {
          setPostCreationVerifyChurch(null);
        }
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(DevicePermissionBanner, { language })
  ] });
}
export default App;

