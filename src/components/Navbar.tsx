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
} from "../utils/storage";
import { ChurchSearchSelector } from "./common/ChurchSearchSelector";

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
  onLockAdmin
}) => {
  var _a3, _b3;
  const { googleUser, signInWithGoogle, signOutGoogle, linkChurchAdminGoogleAccount } = useAuth();
  const toast = useToast();
  const isEs = language === "es";
  const isEn = language === "en";
  const isFr = language === "fr";
  const [isMenuDropdownOpen, setIsMenuDropdownOpen] = reactExports.useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = reactExports.useState(false);
  const dropdownRef = reactExports.useRef(null);
  const isUserLoggedIn = userRole === "admin" ? Boolean(isAuthorizedAdmin) : Boolean(currentMember);
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
      if (!currentChurch) {
        setUnreadNotificationsCount(0);
        return;
      }
      try {
        const notifs = getContextualNotifications({
          church: currentChurch,
          member: currentMember,
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
    return () => {
      window.removeEventListener("omnichurch_notifications_updated", updateCount);
    };
  }, [currentChurch, currentMember, announcements, services, attendanceRecords, language]);
  const isCurrentChurchAdmin = !!(googleUser == null ? void 0 : googleUser.email) && !!(currentChurch == null ? void 0 : currentChurch.adminGoogleEmail) && (googleUser.email || "").toLowerCase() === (currentChurch.adminGoogleEmail || "").toLowerCase();
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
  return /* @__PURE__ */ jsxRuntimeExports.jsx("header", { className: "sticky top-0 z-40 bg-[#0F172A] text-white border-b border-slate-800 shadow-md", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-w-7xl mx-auto px-3 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between h-16 gap-2 sm:gap-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 sm:gap-3 min-w-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          id: "navbar-brand-header-trigger",
          ...developerTriggerProps,
          className: "flex items-center gap-2 sm:gap-2.5 cursor-pointer select-none group shrink-0",
          title: "OmniChurch Platform",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                id: "navbar-app-logo-trigger",
                className: "w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center font-black text-lg shadow-md shadow-blue-500/25 shrink-0 border border-blue-500/40 group-active:scale-95 transition-transform group-hover:border-blue-400",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "img",
                  {
                    src: "/icon.png",
                    alt: "OmniChurch Pro",
                    className: "w-full h-full object-cover pointer-events-none rounded-lg",
                    referrerPolicy: "no-referrer",
                    onError: (e3) => {
                      e3.target.style.display = "none";
                    }
                  }
                )
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col min-w-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1 sm:gap-1.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-xs sm:text-sm font-extrabold tracking-tight text-white leading-tight group-hover:text-amber-300 transition-colors truncate", children: "OMNICHURCH" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-1 sm:px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 text-[8px] sm:text-[9px] font-mono font-bold leading-none shrink-0", children: "PRO" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-slate-400 hidden sm:block -mt-0.5 truncate", children: "Multi-Tenant Church Platform" })
            ] })
          ]
        }
      ),
      userRole === "admin" && currentChurch && allChurches.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
        ChurchSearchSelector,
        {
          id: "navbar-church-switcher",
          variant: "compact",
          churches: allChurches,
          selectedChurchId: currentChurch.id,
          onSelectChurch: onChurchChange,
          onOpenCreateChurch
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center shrink-0", ref: dropdownRef, children: isUserLoggedIn ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
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
              (googleUser == null ? void 0 : googleUser.photoURL) ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                "img",
                {
                  src: googleUser.photoURL,
                  alt: "Google avatar",
                  referrerPolicy: "no-referrer",
                  className: "w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover border border-emerald-400/90 shadow-sm"
                }
              ) : (googleUser == null ? void 0 : googleUser.displayName) ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 flex items-center justify-center font-black text-[10px] sm:text-xs shadow-sm", children: googleUser.displayName[0].toUpperCase() }) : userRole === "member" && currentMember ? currentMember.photoUrl ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                "img",
                {
                  src: currentMember.photoUrl,
                  alt: currentMember.fullName,
                  className: "w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover border border-indigo-400/90 shadow-sm"
                }
              ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-[10px] sm:text-xs shadow-sm", children: currentMember.fullName ? currentMember.fullName[0].toUpperCase() : "M" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  className: `w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shadow-sm transition-colors ${isMenuDropdownOpen ? "bg-slate-950 text-amber-300" : "bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950"}`,
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(UserCheck, { className: "w-3.5 h-3.5 sm:w-4 sm:h-4" })
                }
              ),
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
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-[10px] truncate font-medium ${isMenuDropdownOpen ? "text-slate-800" : "text-slate-400"}`, children: userRole === "admin" ? isEs ? "Administrador" : isFr ? "Administrateur" : isEn ? "Administrator" : "Administratè" : isEs ? "Miembro" : isFr ? "Membre" : isEn ? "Member" : "Manm" })
            ] }),
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
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${userRole === "admin" ? isAuthorizedAdmin ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400" : currentMember ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-slate-300"}`, children: userRole === "admin" ? isAuthorizedAdmin ? isEs ? "Admin Autorizado" : isFr ? "Admin Autorisé" : isEn ? "Authorized Admin" : "Admin Otorize" : isEs ? "PIN Requerido" : isFr ? "PIN Requis" : isEn ? "PIN Required" : "PIN Mande" : currentMember ? isEs ? "Conectado" : isFr ? "Connecté" : isEn ? "Connected" : "Konekte" : isEs ? "Modo Visor" : isFr ? "Mode Visiteur" : isEn ? "Guest" : "Vizitè" })
              ] }),
              userRole === "admin" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-2.5 bg-slate-900/90 rounded-xl border border-slate-700/80 space-y-2", children: [
                googleUser ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2.5", children: [
                  googleUser.photoURL ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "img",
                    {
                      src: googleUser.photoURL,
                      alt: "Google Profile",
                      referrerPolicy: "no-referrer",
                      className: "w-8 h-8 rounded-full border border-emerald-400 object-cover shrink-0"
                    }
                  ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs shrink-0", children: googleUser.displayName ? googleUser.displayName[0] : "A" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "font-bold text-xs text-white truncate flex items-center gap-1.5", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: googleUser.displayName || "Admin" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "w-3 h-3 text-emerald-400 shrink-0" })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[11px] text-slate-400 truncate", children: googleUser.email })
                  ] })
                ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Shield, { className: "w-4 h-4" }) }),
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
                    /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "w-3 h-3 text-emerald-400 shrink-0" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Auto-bloqueo activo (5 min sin uso)" : isFr ? "Auto-verrouillage actif (5 min)" : isEn ? "Auto-lock active (5 min inactivity)" : "Oto-blokaj sekirite aktif (5 min)" })
                  ] })
                ] })
              ] }) : (
                /* MEMBER MODE ACTIVE CARD */
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-2.5 bg-slate-900/90 rounded-xl border border-slate-700/80 space-y-2", children: [
                  currentMember ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2.5", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-xs shrink-0", children: currentMember.fullName ? currentMember.fullName[0] : "M" }),
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
    ] }) : onOpenLanguageModal ? (
      /* Compact language trigger for unauthenticated users */
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
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
    ) : null })
  ] }) }) });
};
export default Navbar;
