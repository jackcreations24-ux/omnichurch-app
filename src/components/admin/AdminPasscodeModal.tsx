import React, * as reactExports from "react";
import * as _jsxRuntime from "react/jsx-runtime";
const jsxRuntimeExports: any = _jsxRuntime;

import confetti from "canvas-confetti";
import {
  Lock,
  X as X$1,
  ShieldAlert,
  Building2,
  Fingerprint,
  ScanFace,
  KeyRound,
  EyeOff,
  Eye,
  ShieldCheck,
} from "lucide-react";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import {
  checkBiometricSupport,
  getAdminBiometricRecord,
  registerAdminBiometrics,
  authenticateAdminBiometrics,
} from "../../utils/biometrics";
import { verifyAdminPasscode, hashAdminPasscode } from "../../utils/cryptoSecurity";
import { saveChurch } from "../../utils/storage";

export const AdminPasscodeModal: React.FC<any> = ({
  isOpen,
  onClose,
  church,
  allChurches,
  language = "ht",
  onSuccess,
  isAutoLock = false
}) => {
  const toast = useToast();
  const { googleUser, signInWithGoogle } = useAuth();
  const [selectedChurchId, setSelectedChurchId] = reactExports.useState(church.id);
  const [passcode, setPasscode] = reactExports.useState("");
  const [showPasscode, setShowPasscode] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [isVerifying, setIsVerifying] = reactExports.useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = reactExports.useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = reactExports.useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = reactExports.useState(false);
  const [adminBioRecord, setAdminBioRecord] = reactExports.useState(null);
  const [enableBioForFuture, setEnableBioForFuture] = reactExports.useState(true);
  const activeChurch = allChurches.find((c3) => c3.id === selectedChurchId) || church;
  reactExports.useEffect(() => {
    checkBiometricSupport().then((support) => {
      setIsBiometricSupported(support.isSupported);
    });
  }, []);
  reactExports.useEffect(() => {
    if (activeChurch) {
      const bio = getAdminBiometricRecord(activeChurch.id);
      setAdminBioRecord(bio);
    }
  }, [activeChurch, isOpen]);
  reactExports.useEffect(() => {
    if (church) {
      setSelectedChurchId(church.id);
    }
  }, [church]);
  reactExports.useEffect(() => {
    if (isOpen) {
      setPasscode("");
      setError(null);
    }
  }, [isOpen]);
  if (!isOpen) return null;
  const isEs = language === "es";
  const isEn = language === "en";
  const isFr = language === "fr";
  const t3 = {
    title: isEs ? "Acceso Restringido a Administrador" : isEn ? "Restricted Administrator Access" : isFr ? "Accès Administrateur Restreint" : "Aksè Administratè Sekirize",
    subtitle: isEs ? `Ingrese el código de seguridad o verifique con la cuenta Google de ${activeChurch.name}.` : isEn ? `Enter the security passcode or verify with Google account for ${activeChurch.name}.` : isFr ? `Entrez le code de sécurité ou vérifiez avec le compte Google de ${activeChurch.name}.` : `Antre kòd sekirite PIN lan oswa verifye ak kont Google ofisyèl ${activeChurch.name}.`,
    passcodeLabel: isEs ? "Código PIN de Administrador *" : isEn ? "Admin Security Passcode *" : isFr ? "Code PIN Administrateur *" : "Kòd PIN Sekirite Admin *",
    passcodePlaceholder: isEs ? "Ingrese el PIN de esta iglesia" : isEn ? "Enter church security PIN" : isFr ? "Entrez le PIN de cette église" : "Antre PIN sekirite legliz sa a",
    hintDefault: isEs ? "Código exclusivo definido al crear la iglesia" : isEn ? "Exclusive passcode defined when church was created" : isFr ? "Code exclusif défini lors de la création" : "Kòd sekirite defini pandan kreyasyon legliz la",
    unlockBtn: isEs ? "Verificar y Desbloquear" : isEn ? "Verify & Unlock" : isFr ? "Vérifier & Déverrouiller" : "Verifye & Debloke Espas Admin",
    googleBtn: isEs ? "Verificar con Google Admin" : isEn ? "Verify with Google Admin" : isFr ? "Vérifier avec Google Admin" : "Konekte ak Google Admin Ofisyèl",
    googleLinked: isEs ? "Admin Google Vinculado:" : isEn ? "Linked Google Admin:" : isFr ? "Admin Google Lié :" : "Admin Google ki Lye:",
    errIncorrectPasscode: isEs ? "Código de seguridad incorrecto para esta iglesia." : isEn ? "Incorrect security passcode for this church." : isFr ? "Code de sécurité incorrect pour cette église." : "Kòd sekirite PIN sa a pa kòrèk pou legliz sa a.",
    errGoogleMismatch: (userEmail, adminEmail) => isEs ? `La cuenta Google "${userEmail}" no coincide con el administrador oficial ("${adminEmail}").` : isEn ? `The Google account "${userEmail}" does not match the official admin ("${adminEmail}").` : isFr ? `Le compte Google "${userEmail}" ne correspond pas à l'administrateur officiel ("${adminEmail}").` : `Kont Google "${userEmail}" la pa koresponn ak admin ofisyèl legliz la ("${adminEmail}").`,
    cancel: isEs ? "Cancelar" : isEn ? "Cancel" : isFr ? "Annuler" : "Anile"
  };
  const handleVerifyPasscode = async (e3) => {
    e3.preventDefault();
    setError(null);
    setIsVerifying(true);
    const cleanInput = passcode.trim();
    if (!cleanInput) {
      setError(isEs ? "Por favor ingrese el código de seguridad." : "Tanpri antre kòd sekirite a.");
      setIsVerifying(false);
      return;
    }
    try {
      const verification = await verifyAdminPasscode(cleanInput, activeChurch.adminPasscode, activeChurch.id);
      if (verification.matches) {
        if (verification.needsUpgrade) {
          try {
            const hashed = await hashAdminPasscode(cleanInput, activeChurch.id);
            saveChurch({ ...activeChurch, adminPasscode: hashed });
          } catch (upgradeErr) {
            console.warn("Note: Non-blocking passcode hash upgrade deferred:", upgradeErr);
          }
        }
        try {
          confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
        } catch (_2) {
        }
        toast.success(
          isEs ? "¡Acceso Concedido!" : isEn ? "Access Granted!" : isFr ? "Accès Accordé !" : "Aksè Akòde ✓",
          isEs ? `Sesión de administración abierta para ${activeChurch.name}.` : isEn ? `Admin session unlocked for ${activeChurch.name}.` : isFr ? `Session administrateur déverrouillée pour ${activeChurch.name}.` : `Sesyon administratè debloke pou ${activeChurch.name}.`
        );
        if (enableBioForFuture && isBiometricSupported && !adminBioRecord) {
          registerAdminBiometrics(activeChurch.id, activeChurch.name, activeChurch.adminGoogleEmail).catch(() => {
          });
        }
        setIsVerifying(false);
        onSuccess(activeChurch);
      } else {
        setIsVerifying(false);
        setError(t3.errIncorrectPasscode);
      }
    } catch {
      setIsVerifying(false);
      setError(t3.errIncorrectPasscode);
    }
  };
  const handleBiometricAdminUnlock = async () => {
    setError(null);
    setIsBiometricLoading(true);
    try {
      const res = await authenticateAdminBiometrics(activeChurch.id);
      setIsBiometricLoading(false);
      if (!res.success) {
        setError(res.error || (isEs ? "Autenticación biométrica fallida." : "Otantifikasyon byometrik la pa t reyisi."));
        return;
      }
      try {
        confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
      } catch (_2) {
      }
      toast.success(
        isEs ? "¡Acceso Admin por Biometría!" : isEn ? "Biometric Admin Access!" : isFr ? "Accès Admin par Biométrie !" : "Aksè Admin pa Byometri ✓",
        isEs ? `Huella/FaceID verificada para ${activeChurch.name}.` : isEn ? `Fingerprint/FaceID verified for ${activeChurch.name}.` : isFr ? `Empreinte/FaceID vérifiée pour ${activeChurch.name}.` : `Anprent/FaceID verifye pou ${activeChurch.name}.`
      );
      onSuccess(activeChurch);
    } catch (err) {
      setIsBiometricLoading(false);
      setError((err == null ? void 0 : err.message) || "Erè pandan otantifikasyon byometrik la.");
    }
  };
  const handleGoogleVerify = async () => {
    setError(null);
    setIsGoogleLoading(true);
    try {
      let currentGUser = googleUser;
      if (!currentGUser) {
        currentGUser = await signInWithGoogle();
      }
      setIsGoogleLoading(false);
      if (!currentGUser || !currentGUser.email) {
        return;
      }
      const userEmail = currentGUser.email.toLowerCase().trim();
      const churchAdminEmail = (activeChurch.adminGoogleEmail || "").toLowerCase().trim();
      if (churchAdminEmail) {
        if (userEmail === churchAdminEmail) {
          try {
            confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
          } catch (_2) {
          }
          if (enableBioForFuture && isBiometricSupported && !adminBioRecord) {
            registerAdminBiometrics(activeChurch.id, activeChurch.name, userEmail).catch(() => {
            });
          }
          toast.success(
            isEs ? "¡Admin Google Verificado!" : isEn ? "Google Admin Verified!" : isFr ? "Admin Google Vérifié !" : "Admin Google Verifye ✓",
            isEs ? `Bienvenido(a), ${currentGUser.displayName || userEmail}.` : `Byenvini, ${currentGUser.displayName || userEmail}.`
          );
          onSuccess(activeChurch);
        } else {
          setError(t3.errGoogleMismatch(userEmail, churchAdminEmail));
        }
      } else {
        try {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        } catch (_2) {
        }
        if (enableBioForFuture && isBiometricSupported && !adminBioRecord) {
          registerAdminBiometrics(activeChurch.id, activeChurch.name, userEmail).catch(() => {
          });
        }
        toast.success(
          isEs ? "¡Sesión Admin Iniciada!" : isEn ? "Admin Session Initialized!" : isFr ? "Session Admin Initialisée !" : "Sesyon Admin Louvri ✓",
          isEs ? `Conectado como ${userEmail}.` : `Konekte kòm ${userEmail}.`
        );
        onSuccess(activeChurch);
      }
    } catch (err) {
      setIsGoogleLoading(false);
      setError((err == null ? void 0 : err.message) || (isEs ? "Error durante la autenticación con Google." : "Erè pandan otantifikasyon Google la."));
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative w-full max-w-md bg-[#1E293B] rounded-3xl shadow-2xl border border-slate-700/90 p-6 sm:p-7 text-slate-200 space-y-5 overflow-hidden", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-3 border-b border-slate-700/80 pb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-400/30 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-md", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "w-5 h-5" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "font-extrabold text-base sm:text-lg text-white tracking-tight flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t3.title }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 text-[10px] font-mono font-bold", children: activeChurch.code || activeChurch.id })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400 mt-0.5 line-clamp-1", children: activeChurch.name })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: onClose,
          className: "p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(X$1, { className: "w-5 h-5" })
        }
      )
    ] }),
    isAutoLock && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-3 animate-fadeIn", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldAlert, { className: "w-4 h-4" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "leading-relaxed min-w-0 flex-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-bold text-amber-300 text-xs flex items-center gap-1.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Bloqueo Automático por Inactividad (5 min)" : isEn ? "Auto-Locked due to Inactivity (5 min)" : isFr ? "Verrouillage Automatique par Inactivité (5 min)" : "Sesyon Bloke pou Inaktivite (5 minit)" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-amber-200/90 mt-1 leading-relaxed", children: isEs ? "Para proteger los datos de la congregación, la consola de administración se bloqueó automáticamente tras 5 minutos sin actividad. Ingrese el PIN, use biometría o Google para continuar." : isEn ? "To protect confidential church records, the admin console was automatically locked after 5 minutes of inactivity. Enter your PIN, use biometrics, or sign in with Google to resume." : isFr ? "Pour protéger les données de l’église, la console administrateur s’est verrouillée automatiquement après 5 minutes d’inactivité. Entrez votre PIN ou vérifiez pour continuer." : "Pou sekirize done ak rapò legliz la, espas administratè a bloke otomatikman apre 5 minit san aktivite. Antre kòd PIN lan, sèvi ak anprent oswa Google pou relouvri." })
      ] })
    ] }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldAlert, { className: "w-4 h-4 text-rose-400 shrink-0 mt-0.5" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "leading-relaxed", children: error })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3 bg-slate-900/90 rounded-2xl border border-slate-800 flex items-center justify-between text-xs", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Building2, { className: "w-4 h-4 text-amber-400 shrink-0" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-slate-400 block text-[10px] uppercase font-bold tracking-wider", children: isEs ? "Congregación Destino" : "Legliz Destinasyon" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-white", children: activeChurch.name })
        ] })
      ] }),
      activeChurch.adminGoogleEmail && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono", children: "Google Auth ✓" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2.5", children: [
      isBiometricSupported && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            id: "btn-admin-biometric-unlock",
            disabled: isBiometricLoading,
            onClick: handleBiometricAdminUnlock,
            className: `w-full py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2.5 transition-all transform active:scale-[0.99] cursor-pointer disabled:opacity-50 border ${adminBioRecord ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white border-emerald-400/50 shadow-emerald-500/20" : "bg-slate-900/90 hover:bg-slate-800 text-emerald-400 border-emerald-500/40 hover:border-emerald-400"}`,
            children: isBiometricLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Fingerprint, { className: "w-4 h-4 text-emerald-300" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(ScanFace, { className: "w-3.5 h-3.5 text-teal-300" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: adminBioRecord ? isEs ? "Desbloquear con Huella / FaceID" : isFr ? "Déverrouiller avec Empreinte / FaceID" : isEn ? "Unlock with Fingerprint / FaceID" : "Debloke ak Anprent / FaceID" : isEs ? "Verificar con Biometría (Huella)" : isFr ? "Vérifier avec Biométrie (Empreinte)" : isEn ? "Verify with Biometrics (Fingerprint)" : "Verifye ak Byometri (Anprent / FaceID)" })
            ] })
          }
        ),
        adminBioRecord && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-center text-emerald-400/90 font-medium", children: isEs ? "✓ Huella digital de administrador activada en este dispositivo" : isFr ? "✓ Empreinte digitale administrateur activée sur cet appareil" : isEn ? "✓ Administrator biometrics active on this device" : "✓ Anprent administrateur aktif sou aparèy sa a" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          disabled: isGoogleLoading,
          onClick: handleGoogleVerify,
          className: "w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2.5 transition-all transform active:scale-[0.99] cursor-pointer disabled:opacity-50 border border-slate-200",
          children: isGoogleLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { className: "w-4 h-4", viewBox: "0 0 24 24", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("path", { fill: "#4285F4", d: "M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("path", { fill: "#34A853", d: "M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("path", { fill: "#FBBC05", d: "M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("path", { fill: "#EA4335", d: "M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t3.googleBtn })
          ] })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex items-center justify-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-slate-700 w-full" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "bg-[#1E293B] px-3 text-[10px] uppercase tracking-widest text-slate-400 font-bold whitespace-nowrap", children: isEs ? "O Ingrese PIN Maestro" : "Oubyen Antre Kòd PIN Admin" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-slate-700 w-full" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleVerifyPasscode, className: "space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block text-xs font-bold uppercase tracking-wider text-slate-300", children: t3.passcodeLabel }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-slate-500 font-mono", children: t3.hintDefault })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(KeyRound, { className: "w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: showPasscode ? "text" : "password",
              autoFocus: true,
              required: true,
              value: passcode,
              onChange: (e3) => setPasscode(e3.target.value),
              placeholder: t3.passcodePlaceholder,
              className: "w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-white font-mono text-center text-lg tracking-widest focus:ring-2 focus:ring-amber-400 focus:border-transparent focus:outline-none"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: () => setShowPasscode(!showPasscode),
              className: "absolute right-3.5 top-3.5 text-slate-400 hover:text-white",
              children: showPasscode ? /* @__PURE__ */ jsxRuntimeExports.jsx(EyeOff, { className: "w-4 h-4" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "w-4 h-4" })
            }
          )
        ] }),
        isBiometricSupported && !adminBioRecord && /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 pt-2 text-[11px] text-slate-300 cursor-pointer select-none", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "checkbox",
              checked: enableBioForFuture,
              onChange: (e3) => setEnableBioForFuture(e3.target.checked),
              className: "w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-400 focus:ring-offset-0"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Fingerprint, { className: "w-3.5 h-3.5 text-emerald-400 shrink-0" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Activar Huella / FaceID para acceso rápido en este dispositivo" : isFr ? "Activer Empreinte / FaceID pour accès rapide sur cet appareil" : isEn ? "Enable Fingerprint / FaceID for quick unlock on this device" : "Aktive Anprent / FaceID pou debloke admin pi rapid sou aparèy sa a" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pt-2 flex items-center justify-end gap-2.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: onClose,
            className: "px-4 py-2.5 rounded-2xl text-slate-400 hover:text-white font-semibold text-xs transition-colors cursor-pointer",
            children: t3.cancel
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "submit",
            disabled: isVerifying,
            className: "px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all transform active:scale-95 cursor-pointer disabled:opacity-50",
            children: isVerifying ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "w-4 h-4" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t3.unlockBtn })
            ] })
          }
        )
      ] })
    ] })
  ] }) });
};
export default AdminPasscodeModal;
