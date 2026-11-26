import React, * as reactExports from "react";
import * as _jsxRuntime from "react/jsx-runtime";
const jsxRuntimeExports: any = _jsxRuntime;

import {
  UserCheck,
  ChevronDown,
  WifiOff,
  Bell,
  BookOpen,
  CircleQuestionMark,
  ShieldCheck,
  Users,
  CircleCheck,
  Shield,
  Lock,
  ArrowLeftRight,
  LogOut,
  Globe,
  Languages,
  Mail,
  AlertCircle,
  Plus,
  Building2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useDeveloperTrigger } from "../hooks/useDeveloperTrigger";
import {
  getContextualNotifications,
  getUnreadNotificationsCount,
} from "../services/notificationCenterService";
import {
  revokeAdminSession,
  isDeviceOnline,
  getPendingOfflineAttendanceCount,
  resolveAdminOwnedChurches,
  resolveChurchAdminAvatarUrl,
} from "../utils/storage";
import { isReceptionRole, isDeaconRole } from "../utils/permissions";
import {
  EMAIL_VERIFICATION_RESEND_COOLDOWN_SEC,
  shouldShowProfileResendVerificationButton,
  needsInlineReauthForVerification,
  computeResendCooldownRemaining,
  getVerificationEmailLastSentAt,
  recordVerificationEmailSent,
} from "../utils/emailVerificationFlow";
import { auth } from "../lib/firebase";
import { ChurchSearchSelector } from "./common/ChurchSearchSelector";
import { OmniChurchLogo } from "./common/OmniChurchLogo";
import { DonateButton } from "./common/DonateButton";

export const Navbar: React.FC<any> = ({
  currentChurch,
  allChurches,
  members,
  currentMember,
  userRole,
  isAuthorizedAdmin,
  language,
  announcements = [],
  services = [],
  attendanceRecords = [],
  onChurchChange,
  onRoleChange,
  onMemberChange,
  onLanguageChange,
  onOpenScanner,
  onLogoutMember,
  onOpenTutorial,
  onOpenLanguageModal,
  onOpenDesktopModal,
  onOpenCreateChurch,
  onOpenDeveloperPanel,
  isNotificationsOpen = false,
  onOpenNotifications,
  onCloseNotifications,
  onNavigateToNotificationTarget,
  onLockAdmin,
  onOpenEmailVerificationScreen,
  onOpenDonateScreen
}) => {
  var _a3, _b3;
  const {
    googleUser,
    isEmailVerified,
    signInWithGoogle,
    signOutGoogle,
    linkChurchAdminGoogleAccount,
    resendAdminVerificationEmail,
    refreshAuthUserState,
  } = useAuth();
  const toast = useToast();
  const isEs = language === "es";
  const isEn = language === "en";
  const isFr = language === "fr";
  const [isMenuDropdownOpen, setIsMenuDropdownOpen] = reactExports.useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = reactExports.useState(false);
  const [isResendingProfileVerif, setIsResendingProfileVerif] = reactExports.useState(false);
  const [profileVerifCooldown, setProfileVerifCooldown] = reactExports.useState(0);
  const dropdownRef = reactExports.useRef(null);
  const isUserLoggedIn = userRole === "admin" ? Boolean(isAuthorizedAdmin) : Boolean(currentMember);
  const liveAuthUser = auth.currentUser;
  const activeAuthEmail = (liveAuthUser == null ? void 0 : liveAuthUser.email) || (googleUser == null ? void 0 : googleUser.email) || "";
  const showProfileResendVerification = shouldShowProfileResendVerificationButton({
    userRole,
    church: currentChurch,
    hasAuthUser: Boolean((liveAuthUser && liveAuthUser.uid) || (googleUser && googleUser.uid)),
    authEmailVerified: isEmailVerified,
    authUserEmail: activeAuthEmail,
  });
  reactExports.useEffect(() => {
    if (!showProfileResendVerification) {
      setProfileVerifCooldown(0);
      return;
    }
    const email = (currentChurch == null ? void 0 : currentChurch.adminGoogleEmail) || activeAuthEmail || "";
    const syncCooldown = () => {
      setProfileVerifCooldown(computeResendCooldownRemaining(getVerificationEmailLastSentAt(email)));
    };
    syncCooldown();
    const interval = window.setInterval(syncCooldown, 1000);
    return () => window.clearInterval(interval);
  }, [showProfileResendVerification, activeAuthEmail, currentChurch == null ? void 0 : currentChurch.adminGoogleEmail, isMenuDropdownOpen]);
  const handleProfileResendVerification = async () => {
    if (isResendingProfileVerif || profileVerifCooldown > 0) return;
    const requiresReauth = needsInlineReauthForVerification({
      church: currentChurch,
      hasAuthUser: Boolean(auth.currentUser && auth.currentUser.uid),
      authUserEmail: (auth.currentUser && auth.currentUser.email) || (googleUser && googleUser.email),
    });
    if (requiresReauth && onOpenEmailVerificationScreen) {
      setIsMenuDropdownOpen(false);
      onOpenEmailVerificationScreen();
      return;
    }
    setIsResendingProfileVerif(true);
    try {
      const alreadyVerified = await refreshAuthUserState();
      if (alreadyVerified) {
        toast.success(
          isEs ? "¡Correo ya verificado!" : isFr ? "E-mail déjà vérifié !" : isEn ? "Email already verified!" : "Imèl ou deja verifye!",
          isEs ? "Su cuenta de propietario está confirmada." : isFr ? "Votre compte propriétaire est confirmé." : isEn ? "Your owner account is already confirmed." : "Kont mèt legliz ou a deja konfime."
        );
        return;
      }
      await resendAdminVerificationEmail();
      const email = (currentChurch == null ? void 0 : currentChurch.adminGoogleEmail) || (auth.currentUser == null ? void 0 : auth.currentUser.email) || (googleUser == null ? void 0 : googleUser.email) || "";
      recordVerificationEmailSent(email);
      setProfileVerifCooldown(EMAIL_VERIFICATION_RESEND_COOLDOWN_SEC);
      toast.success(
        isEs ? "Correo de verificación reenviado" : isFr ? "E-mail de vérification renvoyé" : isEn ? "Verification email sent" : "Imèl verifikasyon voye",
        isEs ? `Revise su bandeja (o Spam) en ${email}.` : isFr ? `Vérifiez votre boîte (ou Spams) sur ${email}.` : isEn ? `Check your inbox (or Spam) at ${email}.` : `Louvri bwat imèl ou (oswa Spam) nan ${email} epi klike sou lyen an.`
      );
    } catch (err) {
      if (onOpenEmailVerificationScreen && !auth.currentUser) {
        setIsMenuDropdownOpen(false);
        onOpenEmailVerificationScreen();
        return;
      }
      toast.error(
        isEs ? "Error de verificación" : isFr ? "Erreur de vérification" : isEn ? "Verification note" : "Nòt verifikasyon",
        (err == null ? void 0 : err.message) || (isEn ? "Could not send verification email right now." : "Pa ka voye imèl verifikasyon an kounye a.")
      );
    } finally {
      setIsResendingProfileVerif(false);
    }
  };
  reactExports.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsMenuDropdownOpen(false);
      }
    };
    if (isMenuDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isMenuDropdownOpen]);
  const { triggerProps: developerTriggerProps } = useDeveloperTrigger({
    onTrigger: onOpenDeveloperPanel,
    longPressDurationMs: 1e4,
    enableKeyboardShortcut: true
  });
  const [unreadNotificationsCount, setUnreadNotificationsCount] = reactExports.useState(0);
  reactExports.useEffect(() => {
    const updateCount = () => {
      if (!currentChurch || userRole === "admin" || !currentMember) {
        setUnreadNotificationsCount(0);
        return;
      }
      try {
        const notifs = getContextualNotifications({
          church: currentChurch,
          member: currentMember,
          userRole,
          announcements: announcements || [],
          services: services || [],
          attendanceRecords: attendanceRecords || [],
          language: language || "ht"
        });
        setUnreadNotificationsCount(getUnreadNotificationsCount(notifs));
      } catch {
        setUnreadNotificationsCount(0);
      }
    };
    updateCount();
    window.addEventListener("omnichurch_notifications_updated", updateCount);
    window.addEventListener("storage", updateCount);
    return () => {
      window.removeEventListener("omnichurch_notifications_updated", updateCount);
      window.removeEventListener("storage", updateCount);
    };
  }, [currentChurch, currentMember, userRole, announcements, services, attendanceRecords, language]);
  const isCurrentChurchAdmin = Boolean(
    googleUser && currentChurch && (
      (googleUser.uid && currentChurch.adminGoogleUid && googleUser.uid === currentChurch.adminGoogleUid) ||
      (googleUser.email && currentChurch.adminGoogleEmail && googleUser.email.toLowerCase() === currentChurch.adminGoogleEmail.toLowerCase())
    )
  );
  const isAuthorized = isAuthorizedAdmin !== void 0 ? isAuthorizedAdmin : isCurrentChurchAdmin;
  const handleAdminGoogleSignIn = async () => {
    setIsConnectingGoogle(true);
    try {
      const user = await signInWithGoogle();
      if (user) {
        toast.success(
          isEs ? "¡Inicio de Sesión con Google Exitoso!" : isEn ? "Google Sign-In Successful!" : isFr ? "Connexion Google Réussie !" : "Koneksyon Google Reyisi!",
          isAuthorized ? isEs ? `Bienvenido/a, ${user.displayName || user.email} (Modo Administrador).` : isEn ? `Welcome, ${user.displayName || user.email} (Admin Mode).` : isFr ? `Bienvenue, ${user.displayName || user.email} (Mode Administrateur).` : `Byenvini, ${user.displayName || user.email} (Mòd Administratè).` : isEs ? `Bienvenido/a, ${user.displayName || user.email} (Modo Miembro).` : isEn ? `Welcome, ${user.displayName || user.email} (Member Mode).` : isFr ? `Bienvenue, ${user.displayName || user.email} (Mode Membre).` : `Byenvini, ${user.displayName || user.email} (Mòd Manm).`
        );
        if (isAuthorized && currentChurch && !currentChurch.adminGoogleEmail) {
          linkChurchAdminGoogleAccount(currentChurch.id, user);
        }
      }
    } catch (err) {
      toast.error(
        isEs ? "Error al conectar con Google" : isEn ? "Google Connection Error" : isFr ? "Erreur de Connexion Google" : "Erè Koneksyon Google",
        (err == null ? void 0 : err.message) || (isEs ? "No se pudo conectar con Google." : isEn ? "Could not connect to Google right now." : isFr ? "Impossible de se connecter avec Google." : "Pa ka konekte ak Google kounye a.")
      );
    } finally {
      setIsConnectingGoogle(false);
    }
  };
  const handleAdminGoogleSignOut = async () => {
    revokeAdminSession();
    await signOutGoogle();
    toast.info(
      isEs ? "Google Desconectado" : isEn ? "Google Disconnected" : isFr ? "Google Déconnecté" : "Google Dekonekte",
      isEs ? "Se ha cerrado la sesión de la cuenta Google." : isEn ? "Signed out of Google account." : isFr ? "Déconnexion du compte Google réussie." : "Ou dekonekte nan kont Google la."
    );
  };
  const langLabels = {
    ht: "Kreyòl",
    fr: "Français",
    en: "English",
    es: "Español"
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("header", { className: "sticky top-0 z-40 bg-gradient-to-r from-[#07152F] via-[#0F172A] to-[#07152F] text-white border-b border-slate-800/90 shadow-md", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-w-7xl mx-auto px-3 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between h-16 sm:h-[68px] gap-2 sm:gap-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 sm:gap-3 min-w-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          id: "navbar-brand-header-trigger",
          ...developerTriggerProps,
          className: "flex items-center gap-2 sm:gap-3 cursor-pointer select-none group shrink-0",
          title: "OmniChurch PRO Official Platform",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                id: "navbar-app-logo-trigger",
                className: "flex items-center justify-center shrink-0 group-active:scale-95 transition-transform",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  OmniChurchLogo,
                  {
                    variant: "responsive",
                    priority: true,
                    mobileClassName: "h-9 w-9",
                    desktopClassName: "h-11 md:h-12 w-auto"
                  }
                )
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col min-w-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "sm:hidden text-xs font-extrabold tracking-tight text-white leading-tight group-hover:text-[#FBBF24] transition-colors truncate", children: "OMNICHURCH" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-1.5 py-0.5 rounded bg-[#FBBF24]/15 border border-[#FBBF24]/35 text-[#FBBF24] text-[9px] font-mono font-bold leading-none shrink-0 tracking-wider", children: "PRO" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-slate-400 hidden md:block mt-0.5 truncate", children: "Multi-Tenant Church Platform" })
            ] })
          ]
        }
      ),
      userRole === "admin" && currentChurch && (() => {
        const ownedList = resolveAdminOwnedChurches(
          allChurches || [],
          googleUser == null ? void 0 : googleUser.uid,
          googleUser == null ? void 0 : googleUser.email
        );
        const scopedAdminChurches = ownedList.some((c3) => c3.id === currentChurch.id)
          ? ownedList
          : isAuthorized
          ? [currentChurch, ...ownedList]
          : ownedList;
        if (scopedAdminChurches.length > 1) {
          return /* @__PURE__ */ jsxRuntimeExports.jsx(
            ChurchSearchSelector,
            {
              id: "navbar-church-switcher",
              variant: "compact",
              churches: scopedAdminChurches,
              selectedChurchId: currentChurch.id,
              onSelectChurch: onChurchChange,
              onOpenCreateChurch
            }
          );
        }
        return null;
      })()
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 shrink-0", ref: dropdownRef, children: [
      onOpenDonateScreen && /* @__PURE__ */ jsxRuntimeExports.jsx(
        DonateButton,
        {
          id: "navbar-header-donate-btn",
          size: "header",
          language,
          onClick: () => {
            setIsMenuDropdownOpen(false);
            onOpenDonateScreen();
          }
        }
      ),
      isUserLoggedIn ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          id: "navbar-unified-menu-btn",
          onClick: () => setIsMenuDropdownOpen(!isMenuDropdownOpen),
          className: `flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer shadow-sm select-none ${isMenuDropdownOpen ? "bg-amber-400 text-slate-950 border-amber-400 shadow-amber-400/25 ring-2 ring-amber-400/30" : "bg-[#1E293B] hover:bg-slate-800 text-slate-200 border-slate-700/90 hover:border-slate-600 active:scale-[0.98]"}`,
          title: isEs ? "Perfil y Opciones" : isFr ? "Profil et Options" : isEn ? "Profile and Options" : "Profil & Opsyon yo",
          "aria-expanded": isMenuDropdownOpen,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative shrink-0 flex items-center justify-center", children: [
              (() => {
                const resolvedAdminPhoto =
                  resolveChurchAdminAvatarUrl(currentChurch, googleUser) ||
                  (currentChurch && currentChurch.adminGooglePhoto === "" ? undefined : currentChurch == null ? void 0 : currentChurch.logoUrl);
                const memberPhoto =
                  userRole === "member" && currentMember
                    ? currentMember.avatarUrl || currentMember.photoUrl || currentMember.googlePhoto || (googleUser == null ? void 0 : googleUser.photoURL)
                    : resolvedAdminPhoto || (currentMember == null ? void 0 : currentMember.avatarUrl) || (currentMember == null ? void 0 : currentMember.photoUrl);
                if (memberPhoto) {
                  return /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "img",
                    {
                      src: memberPhoto,
                      alt: (currentMember == null ? void 0 : currentMember.fullName) || (currentChurch == null ? void 0 : currentChurch.pastor) || "Profile avatar",
                      referrerPolicy: "no-referrer",
                      className: "w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover border border-emerald-400/90 shadow-sm"
                    }
                  );
                }
                if (userRole === "member" && currentMember && currentMember.fullName) {
                  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-[10px] sm:text-xs shadow-sm", children: currentMember.fullName[0].toUpperCase() });
                }
                if (googleUser == null ? void 0 : googleUser.displayName) {
                  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 flex items-center justify-center font-black text-[10px] sm:text-xs shadow-sm", children: googleUser.displayName[0].toUpperCase() });
                }
                return /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    className: `w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shadow-sm transition-colors ${isMenuDropdownOpen ? "bg-slate-950 text-amber-300" : "bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950"}`,
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(UserCheck, { className: "w-3.5 h-3.5 sm:w-4 sm:h-4" })
                  }
                );
              })(),
              !isDeviceOnline() && /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: "absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-[#0F172A]",
                  title: isEs ? "Modo sin internet" : isEn ? "Offline mode" : isFr ? "Mode hors-ligne" : "Mòd san entènèt"
                }
              ),
              unreadNotificationsCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: "absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-white text-[9px] font-black border-2 border-[#0F172A] shadow-sm animate-pulse",
                  title: `${unreadNotificationsCount} ${isEs ? "nuevas notificaciones" : isFr ? "nouvelles notifications" : isEn ? "new notifications" : "nouvo notifikasyon"}`,
                  children: unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "hidden sm:flex flex-col text-left leading-tight min-w-0 max-w-[110px] md:max-w-[130px]", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-xs font-bold truncate ${isMenuDropdownOpen ? "text-slate-950" : "text-slate-100"}`, children: ((_a3 = googleUser == null ? void 0 : googleUser.displayName) == null ? void 0 : _a3.split(" ")[0]) || (userRole === "admin" ? "Admin" : ((_b3 = currentMember == null ? void 0 : currentMember.fullName) == null ? void 0 : _b3.split(" ")[0]) || "Profil") }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-[10px] truncate font-medium ${isMenuDropdownOpen ? "text-slate-800" : "text-slate-400"}`, children: userRole === "admin" ? isEs ? "Administrador" : isFr ? "Administrateur" : isEn ? "Administrator" : "Administratè" : (isDeaconRole(currentMember) && isReceptionRole(currentMember)) ? (isEs ? "Diácono & Recepción" : isFr ? "Diacre & Réception" : isEn ? "Deacon & Reception" : "Dyak & Resepsyon") : isDeaconRole(currentMember) ? (isEs ? "Diácono • Cultos y Avisos" : isFr ? "Diacre • Cultes & Annonces" : isEn ? "Deacon • Services & News" : "Dyak • Sèvis & Anons") : isReceptionRole(currentMember) ? (isEs ? "Recepción • Akèy" : isFr ? "Réception • Accueil" : isEn ? "Reception • Usher" : "Resepsyon • Akèy") : isEs ? "Miembro" : isFr ? "Membre" : isEn ? "Member" : "Manm" })
            ] }),
            showProfileResendVerification && /* @__PURE__ */ jsxRuntimeExports.jsx(
              Mail,
              {
                className: `w-3.5 h-3.5 shrink-0 ${isMenuDropdownOpen ? "text-slate-950" : "text-amber-400"}`,
                "aria-label": isEs ? "Verificación de correo pendiente" : isFr ? "Vérification e-mail en attente" : isEn ? "Email verification pending" : "Verifikasyon imèl an atant"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                className: `px-1.5 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase shrink-0 ${isMenuDropdownOpen ? "bg-slate-950 text-amber-300" : "bg-slate-900 text-amber-400 border border-slate-700"}`,
                children: language.toUpperCase()
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              ChevronDown,
              {
                className: `w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${isMenuDropdownOpen ? "rotate-180" : ""}`
              }
            )
          ]
        }
      ),
      isMenuDropdownOpen && /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          id: "navbar-unified-dropdown-menu",
          className: "absolute right-0 mt-2 w-[calc(100vw-24px)] max-w-sm sm:w-96 max-h-[calc(100vh-5rem)] overflow-y-auto scrollbar-none bg-[#1E293B] rounded-2xl shadow-2xl border border-slate-700 p-3 z-50 space-y-3 text-xs text-slate-200 backdrop-blur-xl animate-fadeIn",
          children: [
            !isDeviceOnline() && currentChurch && /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                id: "navbar-dropdown-offline-status",
                className: "p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(WifiOff, { className: "w-4 h-4 text-amber-400 shrink-0" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-bold text-amber-300 text-xs truncate", children: isEs ? "Modo sin internet" : isEn ? "Offline Mode" : isFr ? "Mode hors-ligne" : "Mòd san entènèt" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-amber-400/80 truncate", children: isEs ? "Asistencias guardadas localmente" : isEn ? "Attendance saved locally" : isFr ? "Présences enregistrées localement" : "Prezans yo anrejistre lokalman" })
                    ] })
                  ] }),
                  getPendingOfflineAttendanceCount(currentChurch.id) > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-mono font-black shrink-0", children: getPendingOfflineAttendanceCount(currentChurch.id) })
                ]
              }
            ),
            currentChurch && onOpenNotifications && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10px] uppercase font-bold text-slate-400 tracking-wider px-1 flex items-center justify-between", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1.5", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Bell, { className: "w-3 h-3 text-amber-400" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Notificaciones" : isFr ? "Notifications" : isEn ? "Notifications" : "Notifikasyon & Alèt" })
                ] }),
                unreadNotificationsCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-mono font-black animate-pulse", children: [
                  unreadNotificationsCount,
                  " ",
                  isEs ? "nuevas" : isFr ? "nouvelles" : isEn ? "new" : "nouvo"
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  id: "navbar-dropdown-notifications-btn",
                  onClick: () => {
                    setIsMenuDropdownOpen(false);
                    onOpenNotifications();
                  },
                  className: "w-full p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-left border border-slate-700/80 hover:border-amber-400/50 transition-all flex items-center justify-between group cursor-pointer",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2.5 min-w-0", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform shrink-0", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Bell, { className: "w-4 h-4" }),
                        unreadNotificationsCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 border border-slate-900" })
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-bold text-xs text-white group-hover:text-amber-300 transition-colors", children: isEs ? "Centro de Notificaciones" : isFr ? "Centre de Notifications" : isEn ? "Notification Center" : "Sant Notifikasyon & Kominikasyon" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] text-slate-400 truncate", children: unreadNotificationsCount > 0 ? isEs ? `${unreadNotificationsCount} alertas pendientes por leer` : isEn ? `${unreadNotificationsCount} pending alerts to read` : isFr ? `${unreadNotificationsCount} alertes en attente` : `${unreadNotificationsCount} alèt ki poko li` : isEs ? "Ver todos los avisos y alertas de cultos" : isFr ? "Voir toutes les alertes et annonces" : isEn ? "View all service alerts and bulletins" : "Gade tout alèt kilt ak anons ofisyèl yo" })
                      ] })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${unreadNotificationsCount > 0 ? "bg-rose-500 text-white font-black" : "bg-amber-400/10 text-amber-400"}`, children: unreadNotificationsCount > 0 ? isEs ? "Ver" : isFr ? "Voir" : isEn ? "View" : "Gade" : isEs ? "Abrir" : isFr ? "Ouvrir" : isEn ? "Open" : "Ouvri" })
                  ]
                }
              )
            ] }),
            onOpenTutorial && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10px] uppercase font-bold text-slate-400 tracking-wider px-1 flex items-center gap-1.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(BookOpen, { className: "w-3 h-3 text-amber-400" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Guía y Tutorial" : isFr ? "Guide & Tutoriel" : isEn ? "Guide & Tutorial" : "Gid & Titoryèl" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  id: "navbar-dropdown-tutorial-btn",
                  onClick: () => {
                    setIsMenuDropdownOpen(false);
                    onOpenTutorial();
                  },
                  className: "w-full p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-left border border-slate-700/80 hover:border-amber-400/50 transition-all flex items-center justify-between group cursor-pointer",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2.5 min-w-0", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform shrink-0", children: userRole === "admin" ? /* @__PURE__ */ jsxRuntimeExports.jsx(BookOpen, { className: "w-4 h-4" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CircleQuestionMark, { className: "w-4 h-4" }) }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-bold text-xs text-white group-hover:text-amber-300 transition-colors", children: userRole === "admin" ? isEs ? "Guía y Tutorial de Administrador" : isEn ? "Admin Guide & Tutorial" : isFr ? "Guide et Tutoriel Administrateur" : "Gid ak Titoryèl Administratè" : isEs ? "Ayuda y Soporte para Miembros" : isEn ? "Member Help & Support" : isFr ? "Aide & Support pour Membres" : "Èd ak Asistans pou Manm" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] text-slate-400 truncate", children: userRole === "admin" ? isEs ? "Aprenda a gestionar miembros, cultos y reportes" : isEn ? "Learn how to manage members, services, and reports" : isFr ? "Apprenez à gérer les membres, cultes et rapports" : "Aprann kòman pou jere manm, sèvis ak rapò yo" : isEs ? "Consulte su carnet, PIN y registro de asistencia" : isEn ? "View your card, PIN, and attendance check-in" : isFr ? "Consultez votre carte, code PIN et présences" : "Gade kat dijital ou, kòd PIN ak prezans ou" })
                      ] })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-2 py-0.5 rounded-md bg-amber-400/10 text-amber-400 text-[10px] font-bold shrink-0", children: isEs ? "Abrir" : isFr ? "Ouvrir" : isEn ? "Open" : "Ouvri" })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5 pt-1 border-t border-slate-700/80", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10px] uppercase font-bold text-slate-400 tracking-wider px-1 flex items-center justify-between", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1.5", children: [
                  userRole === "admin" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "w-3 h-3 text-amber-400" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "w-3 h-3 text-indigo-400" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: userRole === "admin" ? isEs ? "Sesión Administrador" : isFr ? "Session Administrateur" : isEn ? "Admin Session" : "Sesyon Administratè" : isEs ? "Sesión de Miembro" : isFr ? "Session Membre" : isEn ? "Member Session" : "Sesyon Manm" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${userRole === "admin" ? isAuthorizedAdmin ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400" : currentMember ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-slate-300"}`, children: userRole === "admin" ? isAuthorizedAdmin ? isEs ? "Admin Autorizado" : isFr ? "Admin Autorisé" : isEn ? "Authorized Admin" : "Admin Otorize" : isEs ? "Acceso Requerido" : isFr ? "Connexion Requise" : isEn ? "Sign-In Required" : "Koneksyon Admin Mande" : currentMember ? isEs ? "Conectado" : isFr ? "Connecté" : isEn ? "Connected" : "Konekte" : isEs ? "Modo Visor" : isFr ? "Mode Visiteur" : isEn ? "Guest" : "Vizitè" })
              ] }),
              userRole === "admin" ? (() => {
                const adminSessionPhoto =
                  resolveChurchAdminAvatarUrl(currentChurch, googleUser) ||
                  (currentChurch && currentChurch.adminGooglePhoto === "" ? undefined : currentChurch == null ? void 0 : currentChurch.logoUrl);
                return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-2.5 bg-slate-900/90 rounded-xl border border-slate-700/80 space-y-2", children: [
                googleUser ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2.5", children: [
                  adminSessionPhoto ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "img",
                    {
                      src: adminSessionPhoto,
                      alt: (currentChurch == null ? void 0 : currentChurch.pastor) || googleUser.displayName || "Admin Profile",
                      referrerPolicy: "no-referrer",
                      className: "w-8 h-8 rounded-full border border-emerald-400 object-cover shrink-0"
                    }
                  ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs shrink-0", children: googleUser.displayName ? googleUser.displayName[0].toUpperCase() : "A" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "font-bold text-xs text-white truncate flex items-center gap-1.5", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: googleUser.displayName || (currentChurch == null ? void 0 : currentChurch.pastor) || "Admin" }),
                      showProfileResendVerification ? /* @__PURE__ */ jsxRuntimeExports.jsx(AlertCircle, { className: "w-3.5 h-3.5 text-amber-400 shrink-0" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "w-3 h-3 text-emerald-400 shrink-0" })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] text-slate-400 truncate", children: googleUser.email })
                  ] })
                ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [
                    adminSessionPhoto ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "img",
                      {
                        src: adminSessionPhoto,
                        alt: (currentChurch == null ? void 0 : currentChurch.pastor) || "Admin Profile",
                        referrerPolicy: "no-referrer",
                        className: "w-8 h-8 rounded-full border border-amber-400/70 object-cover shrink-0"
                      }
                    ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "w-4 h-4" }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-bold text-xs text-white", children: isEs ? "Consola de Administración" : isFr ? "Console d'Administration" : isEn ? "Admin Console" : "Espas Administratè" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-slate-400 truncate", children: (currentChurch == null ? void 0 : currentChurch.name) || (isEs ? "Iglesia Activa" : "Legliz") })
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "button",
                    {
                      type: "button",
                      id: "navbar-dropdown-admin-google-signin",
                      disabled: isConnectingGoogle,
                      onClick: handleAdminGoogleSignIn,
                      className: "px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-950 font-bold text-[11px] shadow transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { className: "w-3.5 h-3.5 shrink-0", viewBox: "0 0 24 24", children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx("path", { fill: "#4285F4", d: "M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("path", { fill: "#34A853", d: "M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("path", { fill: "#FBBC05", d: "M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("path", { fill: "#EA4335", d: "M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" })
                        ] }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isConnectingGoogle ? "..." : isEs ? "Google" : isEn ? "Google" : "Konekte" })
                      ]
                    }
                  )
                ] }),
                googleUser && currentChurch && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pt-1.5 border-t border-slate-800 text-[11px]", children: isCurrentChurchAdmin ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 text-emerald-400 font-semibold", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "w-3.5 h-3.5 shrink-0" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "truncate", children: [
                    isEs ? "Admin Oficial de " : isFr ? "Admin Officiel de " : isEn ? "Official Admin of " : "Admin Ofisyèl pou ",
                    /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: currentChurch.name })
                  ] })
                ] }) : isAuthorized ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => {
                      linkChurchAdminGoogleAccount(currentChurch.id);
                      toast.success(
                        isEs ? "¡Iglesia Vinculada!" : isEn ? "Church Linked!" : isFr ? "Église Associée !" : "Legliz Lye!",
                        isEs ? `Ha definido ${googleUser.email} como administrador principal de ${currentChurch.name}.` : isEn ? `Set ${googleUser.email} as primary administrator of ${currentChurch.name}.` : isFr ? `A défini ${googleUser.email} comme administrateur principal de ${currentChurch.name}.` : `Ou defini ${googleUser.email} kòm admin prensipal pou ${currentChurch.name}.`
                      );
                    },
                    className: "text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer text-left",
                    children: isEs ? `Vincular a ${currentChurch.name} como Admin` : isEn ? `Link to ${currentChurch.name} as Admin` : isFr ? `Associer à ${currentChurch.name} comme Admin` : `Lye ak ${currentChurch.name} kòm Admin`
                  }
                ) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 text-indigo-300 font-medium", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "w-3.5 h-3.5 shrink-0 text-indigo-400" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Cuenta Google Conectada" : isFr ? "Compte Google Connecté" : isEn ? "Connected Google Account" : "Kont Google Konekte" })
                ] }) }),
                showProfileResendVerification && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { id: "navbar-profile-email-verification-box", className: "pt-2 border-t border-slate-800 space-y-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2 text-[11px]", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-amber-300 font-semibold flex items-center gap-1.5 min-w-0", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(AlertCircle, { className: "w-3.5 h-3.5 text-amber-400 shrink-0" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: isEs ? "Correo aún sin confirmar" : isFr ? "E-mail non confirmé" : isEn ? "Email not confirmed yet" : "Imèl ou poko konfime" })
                    ] }),
                    onOpenEmailVerificationScreen && /* @__PURE__ */ jsxRuntimeExports.jsx("button", {
                      type: "button",
                      id: "navbar-profile-open-verify-screen-btn",
                      onClick: () => {
                        setIsMenuDropdownOpen(false);
                        onOpenEmailVerificationScreen();
                      },
                      className: "text-[11px] text-amber-300 hover:text-amber-200 underline font-semibold shrink-0 cursor-pointer",
                      children: isEs ? "Verificar" : isFr ? "Vérifier" : isEn ? "Verify" : "Verifye"
                    })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("button", {
                    type: "button",
                    id: "navbar-profile-resend-verification-btn",
                    disabled: isResendingProfileVerif || profileVerifCooldown > 0,
                    onClick: handleProfileResendVerification,
                    className: "w-full min-h-[36px] py-1.5 px-2.5 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-200 text-[11px] font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed whitespace-nowrap",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Mail, { className: "w-3.5 h-3.5 text-amber-400 shrink-0" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", {
                        className: "truncate tabular-nums",
                        children: isResendingProfileVerif
                          ? (isEs ? "Enviando..." : isFr ? "Envoi..." : isEn ? "Sending..." : "Ap voye...")
                          : profileVerifCooldown > 0
                          ? `${isEs ? "Reenviar correo de verificación" : isFr ? "Renvoyer l’e-mail de vérification" : isEn ? "Resend verification email" : "Resend imel verifikasyon"} (${profileVerifCooldown}s)`
                          : (isEs ? "Reenviar correo de verificación" : isFr ? "Renvoyer l’e-mail de vérification" : isEn ? "Resend verification email" : "Resend imel verifikasyon")
                      })
                    ]
                  })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pt-1.5 border-t border-slate-800/80 space-y-1.5", children: [
                  onLockAdmin && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "button",
                    {
                      type: "button",
                      id: "navbar-dropdown-admin-lock-now",
                      onClick: () => {
                        setIsMenuDropdownOpen(false);
                        onLockAdmin();
                      },
                      className: "w-full py-1.5 px-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "w-3.5 h-3.5 text-amber-400" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Bloquear Modo Admin Ahora" : isFr ? "Verrouiller Mode Admin" : isEn ? "Lock Admin Mode Now" : "Bloke Espas Admin Kounye a" })
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-1.5", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "button",
                      {
                        type: "button",
                        id: "navbar-dropdown-switch-to-member",
                        onClick: () => {
                          setIsMenuDropdownOpen(false);
                          onRoleChange("member");
                        },
                        className: "py-1.5 px-2 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeftRight, { className: "w-3.5 h-3.5" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Modo Miembro" : isFr ? "Mode Membre" : isEn ? "Member Mode" : "Mòd Manm" })
                        ]
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "button",
                      {
                        type: "button",
                        id: "navbar-dropdown-admin-logout",
                        onClick: () => {
                          setIsMenuDropdownOpen(false);
                          handleAdminGoogleSignOut();
                          onRoleChange("member");
                        },
                        className: "py-1.5 px-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(LogOut, { className: "w-3.5 h-3.5" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Cerrar Sesión" : isFr ? "Déconnexion" : isEn ? "Log Out" : "Dekonekte" })
                        ]
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pt-0.5 text-[10px] text-slate-400 flex items-center justify-center gap-1.5", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: `w-3 h-3 shrink-0 ${((currentChurch == null ? void 0 : currentChurch.autoLockMinutes) ?? 5) > 0 ? "text-emerald-400" : "text-slate-500"}` }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: (() => {
                      const lockMins = typeof (currentChurch == null ? void 0 : currentChurch.autoLockMinutes) === "number" ? currentChurch.autoLockMinutes : 5;
                      if (lockMins <= 0) {
                        return isEs ? "Auto-bloqueo desactivado" : isFr ? "Auto-verrouillage désactivé" : isEn ? "Auto-lock disabled" : "Oto-blokaj dezaktive";
                      }
                      return isEs ? `Auto-bloqueo activo (${lockMins} min sin uso)` : isFr ? `Auto-verrouillage actif (${lockMins} min)` : isEn ? `Auto-lock active (${lockMins} min inactivity)` : `Oto-blokaj sekirite aktif (${lockMins} min)`;
                    })() })
                  ] })
                ] })
              ] }) })() : (
                /* MEMBER MODE ACTIVE CARD */
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-2.5 bg-slate-900/90 rounded-xl border border-slate-700/80 space-y-2", children: [
                  currentMember ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2.5", children: [
                    (currentMember.avatarUrl || currentMember.photoUrl || currentMember.googlePhoto || (googleUser == null ? void 0 : googleUser.photoURL)) ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "img",
                      {
                        src: currentMember.avatarUrl || currentMember.photoUrl || currentMember.googlePhoto || (googleUser == null ? void 0 : googleUser.photoURL),
                        alt: currentMember.fullName,
                        referrerPolicy: "no-referrer",
                        className: "w-8 h-8 rounded-full border border-indigo-400 object-cover shrink-0"
                      }
                    ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-xs shrink-0", children: currentMember.fullName ? currentMember.fullName[0] : "M" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-bold text-xs text-white truncate", children: currentMember.fullName }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10px] text-amber-400 font-mono flex items-center gap-1 truncate", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                          "ID: ",
                          currentMember.memberId
                        ] }),
                        currentMember.department && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                          "• ",
                          currentMember.department
                        ] })
                      ] })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold shrink-0", children: isEs ? "Activo" : isFr ? "Actif" : isEn ? "Active" : "Aktif" })
                  ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2.5", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "w-4 h-4" }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-bold text-xs text-slate-200", children: isEs ? "Espacio de Miembros" : isFr ? "Espace Membre" : isEn ? "Member Portal" : "Espas Manm" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] text-slate-400 truncate", children: isEs ? "Ingrese con su ID para ver perfil y carnet" : isFr ? "Entrez avec votre ID pour votre carte" : isEn ? "Enter your ID to view digital card" : "Antre ak ID w pou wè kat ak prezans" })
                    ] })
                  ] }),
                  googleUser && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pt-1.5 border-t border-slate-800 flex items-center justify-between text-[11px]", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 text-slate-300 min-w-0 truncate", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "w-3.5 h-3.5 text-emerald-400 shrink-0" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate", children: googleUser.email })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => {
                          handleAdminGoogleSignOut();
                        },
                        className: "text-[10px] text-rose-400 hover:text-rose-300 underline font-bold shrink-0 cursor-pointer ml-1",
                        children: isEs ? "Desconectar" : isFr ? "Déconnexion" : isEn ? "Unlink" : "Dekonekte"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `pt-1.5 border-t border-slate-800/80 ${currentMember && onLogoutMember ? "grid grid-cols-2 gap-1.5" : "flex"}`, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "button",
                      {
                        type: "button",
                        id: "navbar-dropdown-switch-to-admin",
                        onClick: () => {
                          setIsMenuDropdownOpen(false);
                          onRoleChange("admin");
                        },
                        className: "flex-1 py-1.5 px-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "w-3.5 h-3.5" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Modo Admin" : isFr ? "Mode Admin" : isEn ? "Admin Mode" : "Mòd Admin" })
                        ]
                      }
                    ),
                    currentMember && onLogoutMember && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "button",
                      {
                        type: "button",
                        id: "navbar-dropdown-logout-member-btn",
                        onClick: () => {
                          setIsMenuDropdownOpen(false);
                          onLogoutMember();
                        },
                        className: "py-1.5 px-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(LogOut, { className: "w-3.5 h-3.5" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Cerrar Sesión" : isFr ? "Déconnexion" : isEn ? "Log Out" : "Dekonekte" })
                        ]
                      }
                    )
                  ] })
                ] })
              )
            ] }),
            onOpenCreateChurch && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pt-1 border-t border-slate-700/80", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  id: "navbar-dropdown-create-church-btn",
                  onClick: () => {
                    setIsMenuDropdownOpen(false);
                    onOpenCreateChurch();
                  },
                  className: "w-full py-2 px-3 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300 text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "w-3.5 h-3.5 text-amber-400 shrink-0" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Registrar Nueva Iglesia" : isFr ? "Créer une Nouvelle Église" : isEn ? "Register New Church" : "Kreye yon Nouvo Legliz" })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2 pt-1 border-t border-slate-700/80", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[10px] uppercase font-bold text-slate-400 tracking-wider px-1 flex items-center justify-between", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1.5", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Globe, { className: "w-3 h-3 text-amber-400" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Idioma / Traducir" : isFr ? "Langue / Traduire" : isEn ? "Language / Translate" : "Lang / Tradiksyon" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-amber-400 font-mono font-bold", children: langLabels[language] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-4 gap-1.5", children: ["ht", "fr", "en", "es"].map((langCode) => {
                const isSelected = language === langCode;
                return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    id: `navbar-dropdown-lang-${langCode}`,
                    onClick: () => {
                      onLanguageChange(langCode);
                    },
                    className: `py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer border ${isSelected ? "bg-amber-400 text-slate-950 border-amber-300 shadow-md font-black ring-1 ring-amber-300/40" : "bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700/80 hover:border-slate-600"}`,
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] uppercase font-mono", children: langCode }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `text-[9px] truncate ${isSelected ? "text-slate-950 font-black" : "text-slate-400"}`, children: langCode === "ht" ? "Kreyòl" : langCode === "fr" ? "Français" : langCode === "en" ? "English" : "Español" })
                    ]
                  },
                  langCode
                );
              }) }),
              onOpenLanguageModal && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  id: "navbar-dropdown-open-lang-modal",
                  onClick: () => {
                    setIsMenuDropdownOpen(false);
                    onOpenLanguageModal();
                  },
                  className: "w-full py-1.5 px-2 rounded-xl bg-slate-900/60 hover:bg-slate-800/90 text-slate-300 hover:text-amber-300 border border-slate-700/60 text-[11px] font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Languages, { className: "w-3.5 h-3.5 text-amber-400" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Ver todas las opciones de idioma..." : isFr ? "Voir toutes les options de langue..." : isEn ? "View all language options..." : "Wè tout opsyon lang yo..." })
                  ]
                }
              )
            ] })
          ]
        }
      )
    ] }) : (
      /* Compact actions for unauthenticated / auth-screen users: always show Create Church + Language */
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 sm:gap-2", children: [
        onOpenCreateChurch && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            id: "navbar-guest-create-church-btn",
            onClick: onOpenCreateChurch,
            className: "flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-[11px] sm:text-xs transition-all cursor-pointer shadow-sm whitespace-nowrap",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "w-3.5 h-3.5 shrink-0" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Nueva Iglesia" : isFr ? "Créer Église" : isEn ? "New Church" : "Kreye Legliz" })
            ]
          }
        ),
        onOpenLanguageModal && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            id: "navbar-guest-language-btn",
            onClick: onOpenLanguageModal,
            className: "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#1E293B] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-bold transition-all cursor-pointer shadow-sm",
            title: isEs ? "Cambiar Idioma" : isFr ? "Changer de Langue" : isEn ? "Change Language" : "Chanje Lang",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Globe, { className: "w-3.5 h-3.5 text-amber-400" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "uppercase text-[11px] font-mono tracking-wider font-extrabold text-amber-400", children: language })
            ]
          }
        )
      ] })
      )
    ] })
  ] }) }) });
};
export default Navbar;
