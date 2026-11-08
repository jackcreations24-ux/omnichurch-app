import React, * as reactExports from "react";
import * as _jsxRuntime from "react/jsx-runtime";
const jsxRuntimeExports: any = _jsxRuntime;

import confetti from "canvas-confetti";
import {
  Building2,
  X as X$1,
  User2,
  MapPin,
  Phone,
  ShieldCheck,
  Lock,
  EyeOff,
  Eye,
} from "lucide-react";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { createNewChurch, authorizeChurchAdminSession } from "../../utils/storage";

export const CreateChurchModal: React.FC<any> = ({
  isOpen,
  onClose,
  onSuccess,
  language = "ht"
}) => {
  const toast = useToast();
  const { googleUser } = useAuth();
  const isEs = language === "es";
  const isEn = language === "en";
  const isFr = language === "fr";
  const [formData, setFormData] = reactExports.useState({
    name: "",
    code: "",
    pastor: "",
    city: isEs ? "Santo Domingo" : isEn ? "Miami, FL" : isFr ? "Port-au-Prince" : "Pòtoprens",
    address: "",
    phone: "",
    email: (googleUser == null ? void 0 : googleUser.email) || "",
    motto: isEs ? "Sirviendo a Dios con amor" : isEn ? "Serving God with faith and love" : isFr ? "Au service de Dieu avec amour" : "Nan sèvis Bondye ak renmen",
    rnc: "",
    adminPasscode: "",
    confirmPasscode: ""
  });
  const [showPasscode, setShowPasscode] = reactExports.useState(false);
  const [isSubmitting, setIsSubmitting] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  if (!isOpen) return null;
  const t3 = {
    title: isEs ? "Registrar Nueva Iglesia" : isEn ? "Register New Church" : isFr ? "Enregistrer une Nouvelle Église" : "Kreye / Anrejistre Legliz Ou",
    subtitle: isEs ? "Cree su congregación con su código PIN de seguridad exclusivo." : isEn ? "Create your church space with your exclusive admin security PIN." : isFr ? "Créez votre église avec votre code PIN de sécurité exclusif." : "Kreye espas legliz ou a ak pwòp kòd sekirite PIN pèsonèl ou.",
    nameLabel: isEs ? "Nombre de la Iglesia *" : isEn ? "Church Name *" : isFr ? "Nom de l’Église *" : "Non Legliz la *",
    namePlaceholder: isEs ? "ej: Iglesia Bautista de la Gracia" : isEn ? "e.g. Grace Baptist Church" : isFr ? "ex: Église Baptiste de la Grâce" : "eg: Église Baptiste de la Grâce...",
    pastorLabel: isEs ? "Pastor / Responsable *" : isEn ? "Senior Pastor / Leader *" : isFr ? "Pasteur / Responsable *" : "Pastè Titilè / Responsab *",
    pastorPlaceholder: isEs ? "ej: Pastor Carlos Morales" : isEn ? "e.g. Pastor John Doe" : isFr ? "ex: Pasteur Jean Voltaire" : "eg: Pastè Jean-Claude Voltaire",
    codeLabel: isEs ? "Código Corto (Opcional)" : isEn ? "Short Code (Optional)" : isFr ? "Code Court (Optionnel)" : "Kòd Inik (Opsyonèl)",
    codePlaceholder: isEs ? "ej: EBG, TG01" : isEn ? "e.g. GBC, CH001" : isFr ? "ex: EBG, CH001" : "eg: EBG, TAB01...",
    cityLabel: isEs ? "Ciudad / Ubicación" : isEn ? "City / Location" : isFr ? "Ville / Emplacement" : "Vil / Komin",
    cityPlaceholder: isEs ? "ej: Santo Domingo" : isEn ? "e.g. Miami, FL" : isFr ? "ex: Port-au-Prince" : "eg: Pòtoprens, Delmas...",
    phoneLabel: isEs ? "Teléfono de Contacto" : isEn ? "Contact Phone" : isFr ? "Téléphone de Contact" : "Telefòn Kontak",
    pinLabel: isEs ? "Código PIN de Seguridad Admin *" : isEn ? "Admin Security PIN Passcode *" : isFr ? "Code PIN de Sécurité Admin *" : "Kòd PIN Sekirite Admin Ou *",
    pinPlaceholder: isEs ? "Defina su PIN (ej: 1234, 7788)" : isEn ? "Set your PIN (e.g. 1234, 7788)" : isFr ? "Définissez votre PIN (ex: 1234)" : "Chwazi PIN ou (eg: 1234, 8899)",
    pinConfirmLabel: isEs ? "Confirmar PIN de Seguridad *" : isEn ? "Confirm Security PIN *" : isFr ? "Confirmer le PIN *" : "Konfime Kòd PIN lan *",
    pinHint: isEs ? "Este PIN protegerá el panel de administración y los datos privados de sus miembros." : isEn ? "This PIN will protect your admin dashboard and members’ private records." : isFr ? "Ce PIN protégera votre tableau de bord et les données de vos membres." : "Kòd PIN sa a pral pwoteje tablo bò ak done tout manm legliz ou a.",
    cancel: isEs ? "Cancelar" : isEn ? "Cancel" : isFr ? "Annuler" : "Anile",
    submitBtn: isEs ? "Crear e Iniciar Sesión" : isEn ? "Create & Start Session" : isFr ? "Créer & Démarrer la Session" : "Kreye & Louvri Espas Mwen",
    submitting: isEs ? "Creando iglesia..." : isEn ? "Creating church..." : isFr ? "Création en cours..." : "Kreyasyon an ap fèt...",
    errName: isEs ? "Por favor ingrese el nombre de la iglesia." : "Tanpri antre non legliz la.",
    errPastor: isEs ? "Por favor ingrese el nombre del pastor." : "Tanpri antre non pastè a.",
    errPin: isEs ? "Por favor defina un código PIN de al menos 4 caracteres." : "Tanpri chwazi yon kòd PIN ki gen omwen 4 chif oswa lèt.",
    errPinMismatch: isEs ? "Los códigos PIN ingresados no coinciden." : "Kòd PIN yo pa koresponn. Tanpri verifye yo.",
    successTitle: isEs ? "¡Iglesia Creada con Éxito!" : isEn ? "Church Successfully Created!" : isFr ? "Église Créée avec Succès !" : "Legliz Kreye avèk Siksè ✓",
    successDesc: (name2) => isEs ? `Bienvenido a su espacio administrativo para "${name2}".` : isEn ? `Welcome to your admin workspace for "${name2}".` : isFr ? `Bienvenue dans votre espace pour "${name2}".` : `Byenvini nan espas administrasyon prive pou "${name2}".`
  };
  const handleSubmit = (e3) => {
    var _a3;
    e3.preventDefault();
    setError(null);
    const name2 = formData.name.trim();
    const pastor = formData.pastor.trim();
    const pin = formData.adminPasscode.trim();
    const confirmPin = formData.confirmPasscode.trim();
    if (!name2) {
      setError(t3.errName);
      return;
    }
    if (!pastor) {
      setError(t3.errPastor);
      return;
    }
    if (!pin || pin.length < 4) {
      setError(t3.errPin);
      return;
    }
    if (pin !== confirmPin) {
      setError(t3.errPinMismatch);
      return;
    }
    setIsSubmitting(true);
    try {
      const newChurch = createNewChurch({
        name: name2,
        code: formData.code.trim().toUpperCase(),
        pastor,
        city: formData.city.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || (googleUser == null ? void 0 : googleUser.email) || "",
        motto: formData.motto.trim(),
        rnc: ((_a3 = formData.rnc) == null ? void 0 : _a3.trim()) || void 0,
        adminPasscode: pin,
        adminGoogleEmail: (googleUser == null ? void 0 : googleUser.email) || ""
      });
      authorizeChurchAdminSession(newChurch.id);
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (_2) {
      }
      toast.success(t3.successTitle, t3.successDesc(newChurch.name));
      setIsSubmitting(false);
      onSuccess(newChurch);
      onClose();
    } catch (err) {
      setIsSubmitting(false);
      setError((err == null ? void 0 : err.message) || (isEs ? "Error al crear la iglesia." : "Erè pandan kreyasyon legliz la."));
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative w-full max-w-xl bg-[#1E293B] rounded-3xl shadow-2xl border border-slate-700/90 p-6 sm:p-7 text-slate-200 space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-3 border-b border-slate-700/80 pb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-11 h-11 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-md", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Building2, { className: "w-6 h-6" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-extrabold text-base sm:text-lg text-white tracking-tight flex items-center gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t3.title }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400 mt-0.5", children: t3.subtitle })
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
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 font-semibold", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: error }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sm:col-span-2 space-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-xs font-bold text-slate-300 flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Building2, { className: "w-3.5 h-3.5 text-amber-400" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t3.nameLabel })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              required: true,
              autoFocus: true,
              value: formData.name,
              onChange: (e3) => setFormData({ ...formData, name: e3.target.value }),
              placeholder: t3.namePlaceholder,
              className: "w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-xs font-bold text-slate-300 flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(User2, { className: "w-3.5 h-3.5 text-amber-400" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t3.pastorLabel })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              required: true,
              value: formData.pastor,
              onChange: (e3) => setFormData({ ...formData, pastor: e3.target.value }),
              placeholder: t3.pastorPlaceholder,
              className: "w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold text-slate-300 flex items-center gap-1.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t3.codeLabel }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              value: formData.code,
              onChange: (e3) => setFormData({ ...formData, code: e3.target.value }),
              placeholder: t3.codePlaceholder,
              className: "w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs uppercase focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-mono"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-xs font-bold text-slate-300 flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(MapPin, { className: "w-3.5 h-3.5 text-amber-400" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t3.cityLabel })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              value: formData.city,
              onChange: (e3) => setFormData({ ...formData, city: e3.target.value }),
              placeholder: t3.cityPlaceholder,
              className: "w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-xs font-bold text-slate-300 flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Phone, { className: "w-3.5 h-3.5 text-amber-400" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t3.phoneLabel })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "tel",
              value: formData.phone,
              onChange: (e3) => setFormData({ ...formData, phone: e3.target.value }),
              placeholder: "+509 3712-3456",
              className: "w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1 sm:col-span-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-xs font-bold text-slate-300 flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "w-3.5 h-3.5 text-emerald-400" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "RNC / Registro Fiscal (Opcional)" : isFr ? "RNC / N° Fiscal (Optionnel)" : isEn ? "RNC / Tax ID (Optional)" : "RNC / Matrikil Fiskal (Opsyonèl)" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-slate-500 font-mono", children: "DGI / DGII" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              value: formData.rnc,
              onChange: (e3) => setFormData({ ...formData, rnc: e3.target.value }),
              placeholder: "eg: 001-234-567-8",
              className: "w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-slate-400 leading-tight", children: isEs ? "🛡️ Para certificar el RNC y mostrarlo en el carnet, se requerirá Licencia Activa ($70 USD/año) y foto del documento legal." : isFr ? "🛡️ Pour certifier le RNC sur les cartes, une Licence ($70 USD/an) et la photo du document légal seront requises." : isEn ? "🛡️ To certify the RNC on member IDs, an Active License ($70 USD/yr) and legal document photo will be required." : "🛡️ Pou RNC a sètifye sou kat manm yo, ap bezwen Lisans Aktif ($70 USD/ane) ak foto dokiman legal la nan Paramèt." })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 rounded-2xl bg-amber-400/5 border border-amber-400/30 space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-amber-300 font-bold text-xs", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { className: "w-4 h-4 text-amber-400" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t3.pinLabel })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => setShowPasscode(!showPasscode),
              className: "text-xs text-slate-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer",
              children: [
                showPasscode ? /* @__PURE__ */ jsxRuntimeExports.jsx(EyeOff, { className: "w-3.5 h-3.5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "w-3.5 h-3.5" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: showPasscode ? "Kache" : "Montre" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] text-slate-400 leading-relaxed", children: t3.pinHint }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: showPasscode ? "text" : "password",
              required: true,
              maxLength: 12,
              value: formData.adminPasscode,
              onChange: (e3) => setFormData({ ...formData, adminPasscode: e3.target.value }),
              placeholder: t3.pinPlaceholder,
              className: "w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-amber-400/40 text-white font-mono text-center text-sm font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-400"
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: showPasscode ? "text" : "password",
              required: true,
              maxLength: 12,
              value: formData.confirmPasscode,
              onChange: (e3) => setFormData({ ...formData, confirmPasscode: e3.target.value }),
              placeholder: t3.pinConfirmLabel,
              className: "w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-amber-400/40 text-white font-mono text-center text-sm font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-400"
            }
          ) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pt-2 flex items-center justify-end gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: onClose,
            className: "px-4 py-2.5 rounded-xl text-slate-400 hover:text-white font-semibold text-xs transition-colors cursor-pointer",
            children: t3.cancel
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "submit",
            disabled: isSubmitting,
            className: "px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer transition-all transform active:scale-95 disabled:opacity-50",
            children: isSubmitting ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "w-4 h-4" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t3.submitBtn })
            ] })
          }
        )
      ] })
    ] })
  ] }) });
};
export default CreateChurchModal;
