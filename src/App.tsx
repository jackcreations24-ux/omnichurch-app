import React, * as reactExports from "react";
import * as _jsxRuntime from "react/jsx-runtime";
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
  hasUserChosenInitialLanguage,
  setHasUserChosenInitialLanguage,
  isChurchAdminAuthorized,
  authorizeChurchAdminSession,
  revokeChurchAdminSession,
  saveToStorage,
  loadFromStorage,
  STORAGE_KEYS,
  isMemberMarkedDeleted,
  isServiceMarkedDeleted,
  isAnnouncementMarkedDeleted,
  isAttendanceMarkedDeleted,
} from "./utils/storage";
import {
  initializeFirestoreDataIfEmpty,
  subscribeToChurches,
  subscribeToMembers,
  subscribeToServices,
  subscribeToAnnouncements,
  subscribeToAttendance,
  firestoreAddMember,
  firestoreAddService,
  firestoreAddAnnouncement,
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
import { DeveloperAuthModal } from "./components/developer/DeveloperAuthModal";
import { DeveloperEnginePage } from "./components/developer/DeveloperEnginePage";
import { MemberPublicVerificationPage } from "./components/public/MemberPublicVerificationPage";
import { getDeveloperSettings, subscribeToDeveloperSettings } from "./utils/developerStorage";
import { admobEngine } from "./services/admobService";
import { SponsorMarqueeFooter } from "./components/common/SponsorMarqueeFooter";
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
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { AdminMembers } from "./components/admin/AdminMembers";
import { AdminAnnouncements } from "./components/admin/AdminAnnouncements";
import { AdminServices } from "./components/admin/AdminServices";
import { AdminAttendance } from "./components/admin/AdminAttendance";
import { AdminChurchSettings } from "./components/admin/AdminChurchSettings";
import { AdminCardsPage } from "./components/admin/AdminCardsPage";
import { AdminServiceHistory } from "./components/admin/AdminServiceHistory";
import { NotificationsPage } from "./components/notifications/NotificationsPage";

export function App() {
  const toast = useToast();
  const { googleUser } = useAuth();
  const [activeChurchId, setActiveChurchId] = reactExports.useState(() => getSavedActiveChurchId());
  const [userRole, setUserRole] = reactExports.useState(() => getSavedActiveRole());
  const [activeMemberId, setActiveMemberId] = reactExports.useState(() => getSavedActiveMemberId());
  const [language, setLanguage] = reactExports.useState(() => getSavedLanguage());
  const [isLanguageModalOpen, setIsLanguageModalOpen] = reactExports.useState(() => !hasUserChosenInitialLanguage());
  const [isAdminPasscodeModalOpen, setIsAdminPasscodeModalOpen] = reactExports.useState(false);
  const [pendingAdminChurch, setPendingAdminChurch] = reactExports.useState(null);
  const [isAutoLocked, setIsAutoLocked] = reactExports.useState(false);
  const lastAdminActivityRef = reactExports.useRef(Date.now());
  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    setSavedLanguage(newLang);
    setHasUserChosenInitialLanguage(true);
  };
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
  const [isDevAuthModalOpen, setIsDevAuthModalOpen] = reactExports.useState(false);
  const [isDevEngineModalOpen, setIsDevEngineModalOpen] = reactExports.useState(false);
  const [isNotificationsPageOpen, setIsNotificationsPageOpen] = reactExports.useState(false);
  const [verificationView, setVerificationView] = reactExports.useState(() => {
    if (typeof window === "undefined") return { isOpen: false, memberCode: "" };
    try {
      const search = new URLSearchParams(window.location.search);
      const hash = window.location.hash || "";
      const hashSearch = hash.includes("?") ? new URLSearchParams(hash.substring(hash.indexOf("?"))) : new URLSearchParams();
      const isVerifyFlag = search.has("verify") || search.has("verify_member") || search.has("verification") || hash.includes("verify");
      const member = search.get("member") || search.get("verify_member") || search.get("m") || hashSearch.get("member") || hashSearch.get("verify_member") || hashSearch.get("m") || "";
      const church = search.get("church") || search.get("c") || hashSearch.get("church") || hashSearch.get("c") || "";
      if (isVerifyFlag && member) {
        return {
          isOpen: true,
          memberCode: member.trim(),
          churchId: church.trim() || void 0
        };
      }
    } catch {
    }
    return { isOpen: false, memberCode: "" };
  });
  reactExports.useEffect(() => {
    const handleUrlChange = () => {
      try {
        const search = new URLSearchParams(window.location.search);
        const hash = window.location.hash || "";
        const hashSearch = hash.includes("?") ? new URLSearchParams(hash.substring(hash.indexOf("?"))) : new URLSearchParams();
        const isVerifyFlag = search.has("verify") || search.has("verify_member") || search.has("verification") || hash.includes("verify");
        const member = search.get("member") || search.get("verify_member") || search.get("m") || hashSearch.get("member") || hashSearch.get("verify_member") || hashSearch.get("m") || "";
        const church = search.get("church") || search.get("c") || hashSearch.get("church") || hashSearch.get("c") || "";
        if (isVerifyFlag && member) {
          setVerificationView({
            isOpen: true,
            memberCode: member.trim(),
            churchId: church.trim() || void 0
          });
        }
      } catch {
      }
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
    adminSet.add("charlesjj3186@gmail.com");
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
    if (googleUser && googleUser.email) {
      const cleanEmail = googleUser.email.trim().toLowerCase();
      const isAuthorized = authorizedAdmins.some((adminEmail) => adminEmail.toLowerCase() === cleanEmail);
      if (!isAuthorized) {
        if (userRole === "admin") {
          revokeChurchAdminSession();
          setUserRole("member");
          setSavedActiveRole("member");
          toast.info(
            language === "es" ? "Sesión de Miembro" : language === "fr" ? "Espace Membre" : language === "en" ? "Member Session" : "Espas Manm",
            language === "es" ? `Conectado como miembro (${googleUser.displayName || cleanEmail}). Opciones de administrador restringidas.` : language === "fr" ? `Connecté en tant que membre (${googleUser.displayName || cleanEmail}). Options d'administrateur masquées.` : language === "en" ? `Connected as member (${googleUser.displayName || cleanEmail}). Administrator options hidden.` : `Ou konekte kòm manm (${googleUser.displayName || cleanEmail}). Opsyon admin yo kache.`
          );
        }
      }
    }
  }, [googleUser, authorizedAdmins, userRole, language]);
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
    const unsubChurches = subscribeToChurches((updatedChurches) => {
      if (updatedChurches && updatedChurches.length > 0) {
        saveToStorage(STORAGE_KEYS.CHURCHES, updatedChurches);
      }
      setAllChurches((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(updatedChurches)) return prev;
        return updatedChurches;
      });
      churchStore.setAllChurches(updatedChurches);
    });
    admobEngine.initialize().catch(() => {
    });
    const unsubDevSettings = subscribeToDeveloperSettings((newSettings) => {
      notifyAppUpdateChanged();
      if (newSettings == null ? void 0 : newSettings.adMob) {
        admobEngine.initialize(newSettings.adMob).catch(() => {
        });
      }
    });
    return () => {
      unsubChurches();
      unsubDevSettings();
    };
  }, []);
  reactExports.useEffect(() => {
    if (allChurches.length > 0) {
      const found = allChurches.find((c3) => c3.id === activeChurchId) || allChurches[0];
      setCurrentChurch((prev) => {
        if (prev && found && JSON.stringify(prev) === JSON.stringify(found)) return prev;
        return found;
      });
      churchStore.setCurrentChurch(found);
    }
  }, [allChurches, activeChurchId]);
  const currentChurchId = currentChurch == null ? void 0 : currentChurch.id;
  const currentChurchCode = currentChurch == null ? void 0 : currentChurch.code;
  reactExports.useEffect(() => {
    if (!currentChurchId) return;
    const churchId = currentChurchId;
    const churchCodeUpper = (currentChurchCode || "").toUpperCase();
    const unsubMembers = subscribeToMembers(churchId, (churchMembers) => {
      const local = getMembersByChurch(churchId);
      const remoteIds = new Set(churchMembers.map((m2) => m2.id));
      const combined = [...churchMembers];
      for (const lm of local) {
        if (!remoteIds.has(lm.id) && !isLegacyDemoMember(lm) && !isMemberMarkedDeleted(lm)) {
          combined.push(lm);
          const syncKey = `mem_${lm.id}`;
          if (!syncedLocalIdsRef.current.has(syncKey)) {
            syncedLocalIdsRef.current.add(syncKey);
            firestoreAddMember(lm).catch(() => {
            });
          }
        }
      }
      const filteredClean = combined.filter((m2) => !isLegacyDemoMember(m2) && !isMemberMarkedDeleted(m2));
      setMembers(filteredClean);
      churchStore.setMembers(filteredClean);
      const allOtherMembers = loadFromStorage(STORAGE_KEYS.MEMBERS, []).filter(
        (m2) => m2.churchId !== churchId && (churchCodeUpper ? (m2.churchId || "").toUpperCase() !== churchCodeUpper : true) && !isLegacyDemoMember(m2)
      );
      saveToStorage(STORAGE_KEYS.MEMBERS, [...allOtherMembers, ...filteredClean]);
    });
    const unsubServices = subscribeToServices(churchId, (churchServices) => {
      const local = getServicesByChurch(churchId);
      const remoteIds = new Set(churchServices.map((s3) => s3.id));
      const combined = [...churchServices];
      for (const ls of local) {
        if (!remoteIds.has(ls.id) && !isLegacyDemoService(ls) && !isServiceMarkedDeleted(ls.id)) {
          combined.push(ls);
          const syncKey = `srv_${ls.id}`;
          if (!syncedLocalIdsRef.current.has(syncKey)) {
            syncedLocalIdsRef.current.add(syncKey);
            firestoreAddService(ls).catch(() => {
            });
          }
        }
      }
      const filteredServices = combined.filter((s3) => !isLegacyDemoService(s3) && !isServiceMarkedDeleted(s3.id));
      setServices(filteredServices);
      churchStore.setServices(filteredServices);
      const allOtherServices = loadFromStorage(STORAGE_KEYS.SERVICES, []).filter(
        (s3) => s3.churchId !== churchId && (churchCodeUpper ? (s3.churchId || "").toUpperCase() !== churchCodeUpper : true) && !isLegacyDemoService(s3)
      );
      saveToStorage(STORAGE_KEYS.SERVICES, [...allOtherServices, ...filteredServices]);
    });
    const unsubAnnouncements = subscribeToAnnouncements(churchId, (churchAnnouncements) => {
      const local = getAnnouncementsByChurch(churchId);
      const remoteIds = new Set(churchAnnouncements.map((a2) => a2.id));
      const combined = [...churchAnnouncements];
      for (const la2 of local) {
        if (!remoteIds.has(la2.id) && !isLegacyDemoAnnouncement(la2) && !isAnnouncementMarkedDeleted(la2.id)) {
          combined.push(la2);
          const syncKey = `ann_${la2.id}`;
          if (!syncedLocalIdsRef.current.has(syncKey)) {
            syncedLocalIdsRef.current.add(syncKey);
            firestoreAddAnnouncement(la2).catch(() => {
            });
          }
        }
      }
      const deduplicated = deduplicateAnnouncements(combined.filter((a2) => !isLegacyDemoAnnouncement(a2) && !isAnnouncementMarkedDeleted(a2.id)));
      setAnnouncements(deduplicated);
      churchStore.setAnnouncements(deduplicated);
      const allOtherAnnouncements = loadFromStorage(STORAGE_KEYS.ANNOUNCEMENTS, []).filter(
        (a2) => a2.churchId !== churchId && (churchCodeUpper ? (a2.churchId || "").toUpperCase() !== churchCodeUpper : true) && !isLegacyDemoAnnouncement(a2)
      );
      saveToStorage(STORAGE_KEYS.ANNOUNCEMENTS, [...allOtherAnnouncements, ...deduplicated]);
    });
    const unsubAttendance = subscribeToAttendance(churchId, (churchAttendance) => {
      const local = getAttendanceByChurch(churchId);
      const remoteIds = new Set(churchAttendance.map((att) => att.id));
      const combined = [...churchAttendance];
      for (const latt of local) {
        if (!remoteIds.has(latt.id) && !isLegacyDemoAttendance(latt) && !isAttendanceMarkedDeleted(latt.id)) {
          combined.push(latt);
        }
      }
      const filteredAtt = combined.filter((att) => !isLegacyDemoAttendance(att) && !isAttendanceMarkedDeleted(att.id));
      setAttendanceRecords(filteredAtt);
      churchStore.setAttendanceRecords(filteredAtt);
      const allOtherAttendance = loadFromStorage(STORAGE_KEYS.ATTENDANCE, []).filter(
        (att) => att.churchId !== churchId && (churchCodeUpper ? (att.churchId || "").toUpperCase() !== churchCodeUpper : true) && !isLegacyDemoAttendance(att)
      );
      saveToStorage(STORAGE_KEYS.ATTENDANCE, [...allOtherAttendance, ...filteredAtt]);
    });
    return () => {
      unsubMembers();
      unsubServices();
      unsubAnnouncements();
      unsubAttendance();
    };
  }, [currentChurchId, currentChurchCode]);
  reactExports.useEffect(() => {
    if (!currentChurchId) return;
    syncServiceAbsencesAutomatically(currentChurchId);
    const interval = setInterval(() => {
      syncServiceAbsencesAutomatically(currentChurchId);
    }, 6e4);
    const handleAbsencesSynced = () => {
      setAttendanceRecords(getAttendanceByChurch(currentChurchId));
    };
    const handleChurchDataUpdated = () => {
      setMembers(getMembersByChurch(currentChurchId));
      setAttendanceRecords(getAttendanceByChurch(currentChurchId));
    };
    window.addEventListener("app_legiz_absences_synced", handleAbsencesSynced);
    window.addEventListener("church_data_updated", handleChurchDataUpdated);
    window.addEventListener("omnichurch_member_deleted", handleChurchDataUpdated);
    return () => {
      clearInterval(interval);
      window.removeEventListener("app_legiz_absences_synced", handleAbsencesSynced);
      window.removeEventListener("church_data_updated", handleChurchDataUpdated);
      window.removeEventListener("omnichurch_member_deleted", handleChurchDataUpdated);
    };
  }, [currentChurchId]);
  const handleChurchChange = (newChurchId) => {
    if (userRole === "member" && activeMemberId) {
      return;
    }
    const targetChurch = allChurches.find((c3) => c3.id === newChurchId) || getChurchById(newChurchId);
    if (!targetChurch) return;
    if (userRole === "admin") {
      if (googleUser && googleUser.email && !isGoogleUserAuthorizedAdmin) {
        revokeChurchAdminSession();
        setUserRole("member");
        setSavedActiveRole("member");
        return;
      }
      const isAuthed = isChurchAdminAuthorized(newChurchId, googleUser == null ? void 0 : googleUser.email);
      if (!isAuthed) {
        setPendingAdminChurch(targetChurch);
        setIsAdminPasscodeModalOpen(true);
        return;
      }
    }
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
  const handleRoleChange = (newRole) => {
    if (newRole === "admin") {
      if (googleUser && googleUser.email && !isGoogleUserAuthorizedAdmin) {
        toast.error(
          language === "es" ? "Acceso Administrativo Denegado" : language === "fr" ? "Accès Administrateur Refusé" : language === "en" ? "Admin Access Denied" : "Aksè Administratè Refize",
          language === "es" ? `La cuenta Google "${googleUser.email}" no está en la lista de administradores autorizados.` : language === "fr" ? `Le compte Google "${googleUser.email}" n'est pas dans la liste des administrateurs autorisés.` : language === "en" ? `Google account "${googleUser.email}" is not on the authorized administrators list.` : `Kont Google "${googleUser.email}" la pa nan lis administratè ki otorize yo.`
        );
        return;
      }
      const target = currentChurch || allChurches[0];
      if (target) {
        const isAuthed = isChurchAdminAuthorized(target.id, googleUser == null ? void 0 : googleUser.email);
        if (!isAuthed) {
          setIsAutoLocked(false);
          setPendingAdminChurch(target);
          setIsAdminPasscodeModalOpen(true);
          return;
        }
      }
      setIsAutoLocked(false);
      setUserRole("admin");
      setSavedActiveRole("admin");
      lastAdminActivityRef.current = Date.now();
      toast.info("Mòd Administratè Aktive", "Aksè ak Tablo Bò, Manm, Sèvis, Anons & Scanner.");
    } else {
      setIsAutoLocked(false);
      revokeChurchAdminSession();
      setUserRole("member");
      setSavedActiveRole("member");
      toast.info("Espas Manm Aktive", "Antre ID + PIN ou pou wè espas pèsonèl ou.");
    }
  };
  const handleAdminAuthSuccess = (authorizedChurch) => {
    if (googleUser && googleUser.email && !isGoogleUserAuthorizedAdmin) {
      toast.error(
        language === "es" ? "Acceso Administrativo Denegado" : language === "fr" ? "Accès Administrateur Refusé" : language === "en" ? "Admin Access Denied" : "Aksè Administratè Refize",
        language === "es" ? `La cuenta Google "${googleUser.email}" no está autorizada para administrar.` : `Kont Google "${googleUser.email}" la pa otorize kòm administratè.`
      );
      return;
    }
    setIsAutoLocked(false);
    authorizeChurchAdminSession(authorizedChurch.id);
    setActiveChurchId(authorizedChurch.id);
    setSavedActiveChurchId(authorizedChurch.id);
    setCurrentChurch(authorizedChurch);
    setUserRole("admin");
    setSavedActiveRole("admin");
    lastAdminActivityRef.current = Date.now();
    setIsAdminPasscodeModalOpen(false);
    setPendingAdminChurch(null);
  };
  const handleLockAdminSession = reactExports.useCallback((isManual = false) => {
    if (userRole !== "admin") return;
    revokeChurchAdminSession();
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
      toast.warning(
        language === "es" ? "Bloqueo Automático (5 min)" : language === "fr" ? "Verrouillage Automatique (5 min)" : language === "en" ? "Auto-Lock (5 min)" : "Sesyon Bloke pou Inaktivite",
        language === "es" ? "La consola de administración se bloqueó automáticamente tras 5 minutos sin actividad para proteger los datos de la iglesia." : language === "fr" ? "La console administrateur s’est verrouillée automatiquement après 5 minutes d’inactivité pour sécuriser les données de l’église." : language === "en" ? "The admin console automatically locked after 5 minutes of inactivity to safeguard church records." : "Espas administratè a bloke otomatikman apre 5 minit san aktivite pou sekirize done legliz la."
      );
    }
  }, [userRole, currentChurch, language, toast]);
  reactExports.useEffect(() => {
    if (userRole !== "admin") return;
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
    const FIVE_MINUTES_MS = 5 * 60 * 1e3;
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
      if (idleDuration >= FIVE_MINUTES_MS) {
        handleLockAdminSession(false);
      }
    }, POLLING_INTERVAL_MS);
    return () => {
      monitoredEvents.forEach((eventName) => {
        window.removeEventListener(eventName, recordUserActivity);
      });
      clearInterval(timerInterval);
    };
  }, [userRole, isScannerOpen, isAdminPasscodeModalOpen, handleLockAdminSession]);
  const handleMemberChange = (newMemberId) => {
    setActiveMemberId(newMemberId);
    setSavedActiveMemberId(newMemberId);
    const targetM = members.find((m2) => m2.memberId === newMemberId);
    if (targetM) {
      toast.info("Profil Seleksyone", `${targetM.fullName} (${targetM.memberId})`);
    }
  };
  const handleMemberLoginSuccess = (member, church) => {
    setActiveChurchId(church.id);
    setSavedActiveChurchId(church.id);
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
    toast.info("Dekonekte", "Ou dekonekte nan espas manm nan avèk siksè.");
  };
  const handleToggleActiveService = (serviceId, isOpen) => {
    if (!currentChurch) return;
    setServiceActiveStatus(currentChurch.id, serviceId, isOpen);
  };
  const currentMember = members.find((m2) => m2.memberId === activeMemberId);
  const memberAttendance = currentMember && currentChurch ? attendanceRecords.filter(
    (a2) => a2.churchId === currentChurch.id && (a2.memberId === currentMember.memberId || a2.memberDbId === currentMember.id)
  ) : [];
  const handleChurchCreatedFromOnboarding = (newChurch) => {
    const updated = getAllChurches();
    setAllChurches(updated);
    setActiveChurchId(newChurch.id);
    setSavedActiveChurchId(newChurch.id);
    setCurrentChurch(newChurch);
    setUserRole("admin");
    setSavedActiveRole("admin");
    setAdminTab("dashboard");
  };
  const handleChurchCreatedSuccessfully = (newChurch) => {
    const refreshed = getAllChurches();
    setAllChurches(refreshed);
    setActiveChurchId(newChurch.id);
    setSavedActiveChurchId(newChurch.id);
    setCurrentChurch(newChurch);
    setUserRole("admin");
    setSavedActiveRole("admin");
    setAdminTab("dashboard");
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
        setMemberTab("home");
        if (targetId) {
          setTimeout(() => {
            const el = document.getElementById(`announcement-card-${targetId}`);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              el.classList.add("ring-2", "ring-amber-400");
              setTimeout(() => el.classList.remove("ring-2", "ring-amber-400"), 2500);
            }
          }, 150);
        }
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
        initialLanguage: language,
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
  if (isDevEngineModalOpen) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      DeveloperEnginePage,
      {
        isOpen: true,
        language,
        allChurches,
        currentChurch,
        onClose: () => setIsDevEngineModalOpen(false),
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
          isAuthorizedAdmin: !googleUser ? true : isGoogleUserAuthorizedAdmin,
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
          onOpenDeveloperPanel: handleOpenDeveloperAuth
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-24 sm:pb-8", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        EmptyChurchOnboarding,
        {
          onChurchCreated: handleChurchCreatedFromOnboarding,
          onOpenTutorial: () => setIsTutorialOpen(true),
          language
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        UserTutorialModal,
        {
          isOpen: isTutorialOpen,
          onClose: () => setIsTutorialOpen(false),
          onOpenCreateChurch: () => setIsTutorialOpen(false),
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
          onClose: () => setIsLanguageModalOpen(false)
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
        isAuthorizedAdmin: !googleUser ? true : isGoogleUserAuthorizedAdmin,
        language,
        announcements,
        services,
        attendanceRecords,
        isNotificationsOpen: isNotificationsPageOpen,
        onOpenNotifications: () => setIsNotificationsPageOpen((prev) => !prev),
        onCloseNotifications: () => setIsNotificationsPageOpen(false),
        onNavigateToNotificationTarget: (target, targetId) => {
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
        onLockAdmin: () => handleLockAdminSession(true)
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
      ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
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
      ) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-24 sm:pb-8", children: isNotificationsPageOpen ? /* @__PURE__ */ jsxRuntimeExports.jsx(
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
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-800 text-xs scrollbar-none", children: [
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
                  onToggleActiveService: handleToggleActiveService
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
                  }
                }
              )
            ]
          },
          adminTab
        )
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
          onSwitchToAdmin: googleUser && !isGoogleUserAuthorizedAdmin ? void 0 : () => handleRoleChange("admin"),
          members,
          language,
          onLanguageChange: handleLanguageChange,
          onOpenCreateChurch: googleUser && !isGoogleUserAuthorizedAdmin ? void 0 : () => setIsCreateChurchModalOpen(true)
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
                  services,
                  announcements,
                  language,
                  onOpenMyCode: () => setMemberTab("mycode"),
                  onSelectServiceCategory: (cat) => {
                    setServiceCategoryInitial(cat);
                    setMemberTab("services");
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
                  language
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
        onOpenDevPanel: () => setIsDevAuthModalOpen(true)
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
    isScannerOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
      QrScannerModal,
      {
        church: currentChurch,
        services,
        isOpen: isScannerOpen,
        language,
        onClose: () => setIsScannerOpen(false),
        onScanSuccess: () => {
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
          if (googleUser && !isGoogleUserAuthorizedAdmin) {
            return;
          }
          if (userRole !== "admin") setUserRole("admin");
          setAdminTab("settings");
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
        onClose: () => setIsLanguageModalOpen(false)
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
        church: pendingAdminChurch || currentChurch || allChurches[0],
        allChurches,
        language,
        onSuccess: handleAdminAuthSuccess,
        isAutoLock: isAutoLocked
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
    /* @__PURE__ */ jsxRuntimeExports.jsx(DevicePermissionBanner, { language })
  ] });
}
export default App;

