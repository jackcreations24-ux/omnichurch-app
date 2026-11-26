import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import {
  Building2,
  X,
  User2,
  MapPin,
  Phone,
  ShieldCheck,
  Lock,
  Mail,
  EyeOff,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { Church, Language } from "../../types";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { auth } from "../../lib/firebase";
import {
  createNewChurch,
  authorizeChurchAdminSession,
  syncCreatedChurchToCloudStrict,
} from "../../utils/storage";
import { isSuperDeveloperEmail } from "../../utils/cryptoSecurity";
import { OmniChurchLogo } from "../common/OmniChurchLogo";

interface CreateChurchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (church: Church) => void;
  onChurchCreated?: (church: Church) => void;
  language?: Language;
}

export const CreateChurchModal: React.FC<CreateChurchModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onChurchCreated,
  language = "ht",
}) => {
  const toast = useToast();
  const { googleUser, signInWithGoogle, registerChurchAdminWithEmail } = useAuth();
  const isEs = language === "es";
  const isEn = language === "en";
  const isFr = language === "fr";

  const hasLiveReusableAuthUser = Boolean(
    googleUser?.email &&
      googleUser?.uid &&
      !isSuperDeveloperEmail(googleUser.email) &&
      auth.currentUser?.uid === googleUser.uid
  );

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    pastor: "",
    city: isEs ? "Santo Domingo" : isEn ? "Miami, FL" : isFr ? "Port-au-Prince" : "Pòtoprens",
    address: "",
    phone: "",
    email: hasLiveReusableAuthUser ? googleUser?.email || "" : "",
    motto: isEs
      ? "Sirviendo a Dios con amor"
      : isEn
      ? "Serving God with faith and love"
      : isFr
      ? "Au service de Dieu avec amour"
      : "Nan sèvis Bondye ak renmen",
    rnc: "",
    adminEmail: hasLiveReusableAuthUser ? googleUser?.email || "" : "",
    adminPassword: "",
    confirmPassword: "",
  });

  const [useExistingGoogleAccount, setUseExistingGoogleAccount] = useState<boolean>(
    hasLiveReusableAuthUser
  );
  const [isGoogleConnecting, setIsGoogleConnecting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      const canUseLive = Boolean(
        googleUser?.email &&
          googleUser?.uid &&
          !isSuperDeveloperEmail(googleUser.email) &&
          auth.currentUser?.uid === googleUser.uid
      );
      setUseExistingGoogleAccount(canUseLive);
      setFormData((prev) => ({
        ...prev,
        email: prev.email || (canUseLive ? googleUser?.email || "" : ""),
        adminEmail: prev.adminEmail || (canUseLive ? googleUser?.email || "" : ""),
        adminPassword: "",
        confirmPassword: "",
      }));
    }
  }, [isOpen, googleUser]);

  if (!isOpen) return null;

  const t = {
    title: isEs
      ? "Registrar Nueva Iglesia"
      : isEn
      ? "Register New Church"
      : isFr
      ? "Enregistrer une Nouvelle Église"
      : "Kreye / Anrejistre Legliz Ou",
    subtitle: isEs
      ? "Cree su congregación protegida con un correo y contraseña real de administrador."
      : isEn
      ? "Create your church workspace protected with a dedicated admin email & real password."
      : isFr
      ? "Créez votre église protégée par un e-mail et un vrai mot de passe administrateur."
      : "Kreye espas legliz ou a pwoteje ak pwòp imèl ak vrè modpas administratè pa li.",
    nameLabel: isEs
      ? "Nombre de la Iglesia *"
      : isEn
      ? "Church Name *"
      : isFr
      ? "Nom de l’Église *"
      : "Non Legliz la *",
    namePlaceholder: isEs
      ? "ej: Iglesia Bautista de la Gracia"
      : isEn
      ? "e.g. Grace Baptist Church"
      : isFr
      ? "ex: Église Baptiste de la Grâce"
      : "eg: Église Baptiste de la Grâce...",
    pastorLabel: isEs
      ? "Pastor / Responsable *"
      : isEn
      ? "Senior Pastor / Leader *"
      : isFr
      ? "Pasteur / Responsable *"
      : "Pastè Titilè / Responsab *",
    pastorPlaceholder: isEs
      ? "ej: Pastor Carlos Morales"
      : isEn
      ? "e.g. Pastor John Doe"
      : isFr
      ? "ex: Pasteur Jean Voltaire"
      : "eg: Pastè Jean-Claude Voltaire",
    codeLabel: isEs
      ? "Código Corto (Opcional)"
      : isEn
      ? "Short Code (Optional)"
      : isFr
      ? "Code Court (Optionnel)"
      : "Kòd Inik (Opsyonèl)",
    codePlaceholder: isEs
      ? "ej: EBG, TG01"
      : isEn
      ? "e.g. GBC, CH001"
      : isFr
      ? "ex: EBG, CH001"
      : "eg: EBG, TAB01...",
    cityLabel: isEs
      ? "Ciudad / Ubicación"
      : isEn
      ? "City / Location"
      : isFr
      ? "Ville / Emplacement"
      : "Vil / Komin",
    cityPlaceholder: isEs
      ? "ej: Santo Domingo"
      : isEn
      ? "e.g. Miami, FL"
      : isFr
      ? "ex: Port-au-Prince"
      : "eg: Pòtoprens, Delmas...",
    phoneLabel: isEs
      ? "Teléfono de Contacto"
      : isEn
      ? "Contact Phone"
      : isFr
      ? "Téléphone de Contact"
      : "Telefòn Kontak",
    authSectionTitle: isEs
      ? "Cuenta del Propietario / Admin de la Iglesia *"
      : isEn
      ? "Church Owner / Admin Account *"
      : isFr
      ? "Compte du Propriétaire / Admin de l’Église *"
      : "Kont Mèt Legliz la (Imèl & Modpas oswa Google) *",
    authSectionHint: isEs
      ? "Este correo y contraseña real protegerán el panel administrativo y los datos de su iglesia."
      : isEn
      ? "This real email & password (or Google sign-in) will secure your admin console and church cloud records."
      : isFr
      ? "Cet e-mail et ce vrai mot de passe sécuriseront la console admin et les données de l’église."
      : "Imèl ak vrè modpas sa a (oswa kont Google ou) pral sekirize tablo bò admin lan ak done legliz la nan nwaj la.",
    adminEmailPlaceholder: isEs
      ? "Correo de acceso admin (ej: pastor@iglesia.org)"
      : isEn
      ? "Admin login email (e.g. pastor@church.org)"
      : isFr
      ? "E-mail d’accès admin (ex: pasteur@eglise.org)"
      : "Imèl koneksyon admin (eg: paste@legliz.org)",
    passwordPlaceholder: isEs
      ? "Contraseña (mín. 6 caracteres)"
      : isEn
      ? "Password (min. 6 characters)"
      : isFr
      ? "Mot de passe (min. 6 caractères)"
      : "Vrè Modpas (omwen 6 karaktè)",
    confirmPasswordPlaceholder: isEs
      ? "Confirmar contraseña"
      : isEn
      ? "Confirm password"
      : isFr
      ? "Confirmer le mot de passe"
      : "Konfime modpas la",
    useGoogleLabel: isEs
      ? `Usar sesión conectada (${googleUser?.email || ""})`
      : isEn
      ? `Use signed-in account (${googleUser?.email || ""})`
      : isFr
      ? `Utiliser le compte connecté (${googleUser?.email || ""})`
      : `Sèvi ak kont ki deja konekte a (${googleUser?.email || ""})`,
    connectGoogleBtn: hasLiveReusableAuthUser
      ? isEs
        ? "Cambiar cuenta Google"
        : isEn
        ? "Switch Google account"
        : isFr
        ? "Changer de compte Google"
        : "Chanje kont Google"
      : isEs
      ? "Continuar con Google (1 clic)"
      : isEn
      ? "Connect with Google (1-click)"
      : isFr
      ? "Continuer avec Google (1 clic)"
      : "Konekte ak Google (1 klik)",
    showText: isEs ? "Mostrar" : isFr ? "Afficher" : isEn ? "Show" : "Montre",
    hideText: isEs ? "Ocultar" : isFr ? "Masquer" : isEn ? "Hide" : "Kache",
    cancel: isEs ? "Cancelar" : isEn ? "Cancel" : isFr ? "Annuler" : "Anile",
    submitBtn: isEs
      ? "Crear e Iniciar Sesión"
      : isEn
      ? "Create & Start Session"
      : isFr
      ? "Créer & Démarrer la Session"
      : "Kreye & Louvri Espas Mwen",
    errName: isEs
      ? "Por favor ingrese el nombre de la iglesia (mín. 2 caracteres)."
      : isFr
      ? "Veuillez renseigner le nom de l’église (min. 2 caractères)."
      : isEn
      ? "Please enter the church name (at least 2 characters)."
      : "Tanpri antre non legliz la (omwen 2 karaktè).",
    errPastor: isEs
      ? "Por favor ingrese el nombre del pastor."
      : isFr
      ? "Veuillez renseigner le nom du pasteur."
      : isEn
      ? "Please enter the senior pastor name."
      : "Tanpri antre non pastè a.",
    errEmail: isEs
      ? "Por favor ingrese un correo electrónico de administrador válido."
      : isFr
      ? "Veuillez saisir une adresse e-mail administrateur valide."
      : isEn
      ? "Please enter a valid administrator email address."
      : "Tanpri antre yon adrès imèl administratè ki valab.",
    errPassword: isEs
      ? "La contraseña debe tener al menos 6 caracteres."
      : isFr
      ? "Le mot de passe doit contenir au moins 6 caractères."
      : isEn
      ? "Password must be at least 6 characters long."
      : "Modpas la dwe gen omwen 6 karaktè.",
    errPasswordMismatch: isEs
      ? "Las contraseñas ingresadas no coinciden."
      : isFr
      ? "Les mots de passe saisis ne correspondent pas."
      : isEn
      ? "The passwords entered do not match."
      : "De modpas yo pa koresponn. Tanpri verifye yo.",
    successTitle: isEs
      ? "¡Iglesia Creada con Éxito!"
      : isEn
      ? "Church Successfully Created!"
      : isFr
      ? "Église Créée avec Succès !"
      : "Legliz Kreye avèk Siksè ✓",
    successDesc: (name: string) =>
      isEs
        ? `Bienvenido a su espacio administrativo para "${name}".`
        : isEn
        ? `Welcome to your admin workspace for "${name}".`
        : isFr
        ? `Bienvenue dans votre espace pour "${name}".`
        : `Byenvini nan espas administrasyon prive pou "${name}".`,
  };

  const handleConnectGoogleInModal = async () => {
    setError(null);
    setIsGoogleConnecting(true);
    try {
      const signed = await signInWithGoogle();
      if (!signed?.email || !signed?.uid) {
        throw new Error(t.errEmail);
      }
      if (isSuperDeveloperEmail(signed.email)) {
        setUseExistingGoogleAccount(false);
        setError(
          isEs
            ? "Esta cuenta está reservada exclusivamente para el Panel de Administración General y no puede asignarse a una iglesia."
            : isEn
            ? "This account is strictly reserved for the System Administration Panel and cannot be assigned to a church."
            : isFr
            ? "Ce compte est strictement réservé au Panneau d’Administration Générale et ne peut pas être associé à une église."
            : "Kont sa a rezève sèlman pou Panèl Administrasyon Jeneral sistèm nan. Chwazi yon lòt kont Google oswa kreye ak Imèl + Modpas."
        );
        return;
      }
      setUseExistingGoogleAccount(true);
      setFormData((prev) => ({
        ...prev,
        email: prev.email || signed.email || "",
        adminEmail: signed.email || prev.adminEmail,
      }));
    } catch (err: any) {
      setError(err?.message || "Pa ka konekte ak Google kounye a.");
    } finally {
      setIsGoogleConnecting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const name = formData.name.trim();
    const pastor = formData.pastor.trim();
    if (name.length < 2) {
      setError(t.errName);
      return;
    }
    if (!pastor) {
      setError(t.errPastor);
      return;
    }

    const usingGoogle = Boolean(
      useExistingGoogleAccount &&
        googleUser?.email &&
        googleUser?.uid &&
        auth.currentUser?.uid === googleUser.uid
    );
    const cleanAdminEmail = usingGoogle
      ? (googleUser!.email || "").trim().toLowerCase()
      : formData.adminEmail.trim().toLowerCase();

    if (isSuperDeveloperEmail(cleanAdminEmail)) {
      setError(
        isEs
          ? "Esta cuenta está reservada exclusivamente para el Panel de Administración General y no puede asignarse a una iglesia."
          : isEn
          ? "This account is strictly reserved for the System Administration Panel and cannot be assigned to a church."
          : isFr
          ? "Ce compte est strictement réservé au Panneau d’Administration Générale et ne peut pas être associé à une église."
          : "Kont sa a rezève sèlman pou Panèl Administrasyon Jeneral sistèm nan. Li pa ka itilize pou kreye oswa jere yon legliz."
      );
      return;
    }

    if (!usingGoogle) {
      if (!cleanAdminEmail || !cleanAdminEmail.includes("@")) {
        setError(t.errEmail);
        return;
      }
      if (!formData.adminPassword || formData.adminPassword.length < 6) {
        setError(t.errPassword);
        return;
      }
      if (formData.adminPassword !== formData.confirmPassword) {
        setError(t.errPasswordMismatch);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      let authOwner = usingGoogle ? googleUser : null;
      let authMethod: Church["adminAuthMethod"] = "google";

      if (!usingGoogle) {
        authOwner = await registerChurchAdminWithEmail(
          cleanAdminEmail,
          formData.adminPassword,
          pastor || name
        );
        authMethod = "email_password";
      }

      if (!authOwner?.email || !authOwner?.uid) {
        throw new Error(t.errEmail);
      }

      const newChurch = createNewChurch(
        {
          name,
          code: formData.code.trim().toUpperCase(),
          pastor,
          city: formData.city.trim(),
          address: formData.address.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || authOwner.email,
          motto: formData.motto.trim(),
          rnc: formData.rnc.trim() || undefined,
          adminGoogleEmail: authOwner.email.toLowerCase(),
          adminGoogleUid: authOwner.uid,
          adminGoogleName: authOwner.displayName || pastor || name,
          adminAuthMethod: authMethod,
        },
        { skipImmediateCloudSave: true }
      );

      await syncCreatedChurchToCloudStrict(newChurch);
      authorizeChurchAdminSession(newChurch.id);

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }

      toast.success(t.successTitle, t.successDesc(newChurch.name));
      setIsSubmitting(false);
      if (onChurchCreated) onChurchCreated(newChurch);
      if (onSuccess) onSuccess(newChurch);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setError(
        err?.message ||
          (isEs ? "Error al crear la iglesia." : "Erè pandan kreyasyon legliz la.")
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-[#1E293B] rounded-3xl shadow-2xl border border-slate-700/90 p-6 sm:p-7 text-slate-200 space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300" />

        <div className="flex items-start justify-between gap-3 border-b border-slate-700/80 pb-4">
          <div className="flex items-center gap-3">
            <OmniChurchLogo
              variant="icon"
              priority
              className="h-11 w-11"
            />
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white tracking-tight flex items-center gap-2">
                <span>{t.title}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{t.subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 font-semibold">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                <span>{t.nameLabel}</span>
              </label>
              <input
                type="text"
                required
                minLength={2}
                autoFocus
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t.namePlaceholder}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <User2 className="w-3.5 h-3.5 text-amber-400" />
                <span>{t.pastorLabel}</span>
              </label>
              <input
                type="text"
                required
                value={formData.pastor}
                onChange={(e) => setFormData({ ...formData, pastor: e.target.value })}
                placeholder={t.pastorPlaceholder}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span>{t.codeLabel}</span>
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder={t.codePlaceholder}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs uppercase focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>{t.cityLabel}</span>
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder={t.cityPlaceholder}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                <span>{t.phoneLabel}</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+509 3712-3456"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {isEs
                      ? "RNC / Registro Fiscal (Opcional)"
                      : isFr
                      ? "RNC / N° Fiscal (Optionnel)"
                      : isEn
                      ? "RNC / Tax ID (Optional)"
                      : "RNC / Matrikil Fiskal (Opsyonèl)"}
                  </span>
                </label>
                <span className="text-[10px] text-slate-500 font-mono">DGI / DGII</span>
              </div>
              <input
                type="text"
                value={formData.rnc}
                onChange={(e) => setFormData({ ...formData, rnc: e.target.value })}
                placeholder="eg: 001-234-567-8"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
              />
              <p className="text-[10px] text-slate-400 leading-tight">
                {isEs
                  ? "🛡️ Para certificar el RNC y mostrarlo en el carnet, se requerirá Licencia Activa ($70 USD/año) y foto del documento legal."
                  : isFr
                  ? "🛡️ Pour certifier le RNC sur les cartes, une Licence ($70 USD/an) et la photo du document légal seront requises."
                  : isEn
                  ? "🛡️ To certify the RNC on member IDs, an Active License ($70 USD/yr) and legal document photo will be required."
                  : "🛡️ Pou RNC a sètifye sou kat manm yo, ap bezwen Lisans Aktif ($70 USD/ane) ak foto dokiman legal la nan Paramèt."}
              </p>
            </div>
          </div>

          {/* REAL EMAIL + PASSWORD OR GOOGLE ADMIN ACCOUNT SECTION */}
          <div className="p-4 rounded-2xl bg-amber-400/5 border border-amber-400/30 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{t.authSectionTitle}</span>
              </div>
              {!useExistingGoogleAccount && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-slate-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer shrink-0"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassword ? t.hideText : t.showText}</span>
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">{t.authSectionHint}</p>

            {hasLiveReusableAuthUser && (
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useExistingGoogleAccount}
                  onChange={(e) => setUseExistingGoogleAccount(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-400 focus:ring-offset-0"
                />
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold truncate">{t.useGoogleLabel}</span>
              </label>
            )}

            <button
              type="button"
              id="btn-create-church-google-connect"
              disabled={isGoogleConnecting || isSubmitting}
              onClick={handleConnectGoogleInModal}
              className="w-full py-2.5 px-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 border border-slate-200"
            >
              {isGoogleConnecting ? (
                <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                  </svg>
                  <span>{t.connectGoogleBtn}</span>
                </>
              )}
            </button>

            {!useExistingGoogleAccount && (
              <div className="space-y-3">
                <div className="relative">
                  <Mail className="w-4 h-4 text-amber-400/80 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={formData.adminEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, adminEmail: e.target.value })
                    }
                    placeholder={t.adminEmailPlaceholder}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-amber-400/40 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={formData.adminPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, adminPassword: e.target.value })
                    }
                    placeholder={t.passwordPlaceholder}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-amber-400/40 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, confirmPassword: e.target.value })
                    }
                    placeholder={t.confirmPasswordPlaceholder}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-amber-400/40 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer transition-all transform active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>{t.submitBtn}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateChurchModal;
