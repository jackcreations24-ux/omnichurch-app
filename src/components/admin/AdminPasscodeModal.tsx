import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import {
  Lock,
  X,
  ShieldAlert,
  Building2,
  Fingerprint,
  ScanFace,
  KeyRound,
  Mail,
  EyeOff,
  Eye,
  ShieldCheck,
  RefreshCw,
  Plus,
  ChevronRight,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { Church, GoogleAuthUser, Language } from "../../types";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { OmniChurchLogo } from "../common/OmniChurchLogo";
import {
  checkBiometricSupport,
  getAdminBiometricRecord,
  registerAdminBiometrics,
  authenticateAdminBiometrics,
} from "../../utils/biometrics";
import {
  verifyAdminPasscode,
  hashAdminPasscodeSync,
  isSuperDeveloperEmail,
} from "../../utils/cryptoSecurity";
import {
  saveChurch,
  cacheChurchLocally,
  getAllChurches,
  getChurchById,
  clearPendingLocalUpload,
  hasMatchingChurchCloudOwner,
  resolveAdminOwnedChurches,
  getRememberedAdminLogin,
  saveRememberedAdminLogin,
  clearRememberedAdminLogin,
} from "../../utils/storage";
import {
  syncChurchAdminOwnershipWithCloud,
  firestoreFindChurchesByAdmin,
} from "../../services/firestoreService";
import { auth } from "../../lib/firebase";

interface AdminPasscodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  church?: Church | null;
  allChurches: Church[];
  language?: Language;
  onSuccess: (church: Church) => void;
  isAutoLock?: boolean;
  onOpenCreateChurch?: () => void;
}

export const AdminPasscodeModal: React.FC<AdminPasscodeModalProps> = ({
  isOpen,
  onClose,
  church,
  allChurches,
  language = "ht",
  onSuccess,
  isAutoLock = false,
  onOpenCreateChurch,
}) => {
  const toast = useToast();
  const {
    googleUser,
    signInWithGoogle,
    signInChurchAdminWithEmail,
    registerChurchAdminWithEmail,
    sendChurchAdminPasswordReset,
    resendAdminVerificationEmail,
    refreshAuthUserState,
    linkChurchAdminGoogleAccount,
  } = useAuth();

  // Only expose a specific church context BEFORE auth when resuming an already-authenticated owner's locked session.
  // For fresh Admin Sign-In, NEVER show any public church list, target church name, or another church's admin email.
  const lockedChurch = isAutoLock && church ? church : null;
  const isCloudOwnerSignedIn = Boolean(
    lockedChurch &&
      googleUser &&
      hasMatchingChurchCloudOwner(
        lockedChurch.id,
        googleUser.email,
        googleUser.uid
      )
  );
  const isLockedOwnerSession = Boolean(lockedChurch && isCloudOwnerSignedIn);
  const canQuickPinUnlock = Boolean(
    isLockedOwnerSession &&
      lockedChurch &&
      lockedChurch.quickPinEnabled &&
      lockedChurch.adminPasscode
  );
  const isLegacyPinOnlyLockedChurch = Boolean(
    lockedChurch &&
      !lockedChurch.adminGoogleEmail &&
      !lockedChurch.adminGoogleUid &&
      lockedChurch.adminPasscode
  );

  // Quick PIN session-resume state
  const [quickPinInput, setQuickPinInput] = useState("");
  const [showQuickPin, setShowQuickPin] = useState(false);
  const [preferEmailPasswordInsteadOfPin, setPreferEmailPasswordInsteadOfPin] =
    useState(false);

  // Email + Password + Remember Me state
  const [rememberMe, setRememberMe] = useState<boolean>(
    () => getRememberedAdminLogin().remember
  );
  const [adminEmail, setAdminEmail] = useState<string>(() => {
    const saved = getRememberedAdminLogin();
    return saved.remember ? saved.email : "";
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Post-auth owner-only multi-church selection (ONLY rendered if the authenticated admin owns >1 church)
  const [ownedChurchChoices, setOwnedChurchChoices] = useState<{
    user: GoogleAuthUser;
    authMethod: "email_password" | "google";
    churches: Church[];
  } | null>(null);
  const [selectingChurchId, setSelectingChurchId] = useState<string | null>(null);
  const [noChurchFoundEmail, setNoChurchFoundEmail] = useState<string | null>(null);

  // Legacy PIN one-time migration state (only used when resuming a locked legacy PIN-only church)
  const [legacyPin, setLegacyPin] = useState("");
  const [legacyPinVerified, setLegacyPinVerified] = useState(false);
  const [upgradeEmail, setUpgradeEmail] = useState("");
  const [upgradePassword, setUpgradePassword] = useState("");
  const [upgradeConfirmPassword, setUpgradeConfirmPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [syncRequiredState, setSyncRequiredState] = useState<{
    email: string;
    church: Church;
  } | null>(null);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const [adminBioRecord, setAdminBioRecord] = useState<any>(null);
  const [biometricTargetChurch, setBiometricTargetChurch] = useState<Church | null>(null);
  const [enableBioForFuture, setEnableBioForFuture] = useState(true);

  useEffect(() => {
    checkBiometricSupport().then((support) => {
      setIsBiometricSupported(support.isSupported);
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const saved = getRememberedAdminLogin();
    setRememberMe(saved.remember);

    // Only pre-fill email from the user's OWN verified locked session OR their own opt-in "Remember Me" setting.
    if (isLockedOwnerSession && googleUser?.email) {
      setAdminEmail(googleUser.email);
    } else if (saved.remember && saved.email) {
      setAdminEmail(saved.email);
    } else {
      setAdminEmail("");
    }

    // Only resolve biometric record for the user's own locked church or their own remembered church
    const bioCandidateChurch =
      (isLockedOwnerSession && lockedChurch) ||
      (saved.remember && saved.churchId
        ? allChurches.find((c) => c.id === saved.churchId) || getChurchById(saved.churchId) || null
        : null);

    if (bioCandidateChurch) {
      const bio = getAdminBiometricRecord(bioCandidateChurch.id);
      setAdminBioRecord(bio);
      setBiometricTargetChurch(bio ? bioCandidateChurch : isLockedOwnerSession ? bioCandidateChurch : null);
    } else {
      setAdminBioRecord(null);
      setBiometricTargetChurch(null);
    }

    setQuickPinInput("");
    setShowQuickPin(false);
    setPreferEmailPasswordInsteadOfPin(false);
    setPassword("");
    setLegacyPin("");
    setLegacyPinVerified(false);
    setUpgradeEmail("");
    setUpgradePassword("");
    setUpgradeConfirmPassword("");
    setError(null);
    setSyncRequiredState(null);
    setOwnedChurchChoices(null);
    setSelectingChurchId(null);
    setNoChurchFoundEmail(null);
  }, [isOpen, isLockedOwnerSession, lockedChurch?.id, googleUser?.email]);

  if (!isOpen) return null;

  const isEs = language === "es";
  const isEn = language === "en";
  const isFr = language === "fr";

  const t = {
    title: isEs
      ? "Acceso de Administrador"
      : isEn
      ? "Administrator Sign-In"
      : isFr
      ? "Connexion Administrateur"
      : "Koneksyon Administratè",
    autoResolveSubtitle: isEs
      ? "Ingrese su correo y contraseña: el sistema cargará su iglesia automáticamente."
      : isEn
      ? "Sign in with your email & password or Google — your church loads automatically."
      : isFr
      ? "Connectez-vous avec votre e-mail ou Google — votre église se charge automatiquement."
      : "Antre imèl ak modpas ou (oswa Google) — sistèm lan ap chaje legliz pa w la otomatikman.",
    emailLabel: isEs
      ? "Correo del Administrador *"
      : isEn
      ? "Admin Email Address *"
      : isFr
      ? "E-mail Administrateur *"
      : "Imèl Administratè a *",
    emailPlaceholder: isEs
      ? "correo@iglesia.org"
      : isEn
      ? "pastor@church.org"
      : isFr
      ? "pasteur@eglise.org"
      : "paste@legliz.org",
    passwordLabel: isEs
      ? "Contraseña *"
      : isEn
      ? "Password *"
      : isFr
      ? "Mot de Passe *"
      : "Modpas *",
    passwordPlaceholder: isEs
      ? "Ingrese su contraseña"
      : isEn
      ? "Enter your password"
      : isFr
      ? "Entrez votre mot de passe"
      : "Antre modpas ou a",
    rememberMeLabel: isEs
      ? "Recordar mi cuenta en este dispositivo"
      : isEn
      ? "Remember my login on this device"
      : isFr
      ? "Se souvenir de moi sur cet appareil"
      : "Sonje kont mwen sou aparèy sa a",
    rememberMeHint: isEs
      ? "Mantiene su sesión segura y evita volver a escribir su correo cada vez."
      : isEn
      ? "Keeps your session active and avoids retyping your credentials every time."
      : isFr
      ? "Maintient votre session active et évite de retaper vos identifiants à chaque visite."
      : "Kenbe sesyon ou an sekirite pou w pa bezwen retape imèl ak modpas ou chak fwa.",
    forgotPassword: isEs
      ? "¿Olvidó su contraseña?"
      : isEn
      ? "Forgot password?"
      : isFr
      ? "Mot de passe oublié ?"
      : "Bliye modpas ou?",
    unlockBtn: isEs
      ? "Iniciar Sesión Admin"
      : isEn
      ? "Sign In & Load My Church"
      : isFr
      ? "Connexion & Ouvrir Mon Église"
      : "Konekte & Chaje Legliz Mwen",
    googleBtn: isEs
      ? "Continuar con Google Admin"
      : isEn
      ? "Continue with Google Admin"
      : isFr
      ? "Continuer avec Google Admin"
      : "Kontinye ak Kont Google Admin",
    cancel: isEs ? "Cancelar" : isEn ? "Cancel" : isFr ? "Annuler" : "Anile",
    errNoChurchFound: (userEmail: string) =>
      isEs
        ? `No se encontró ninguna iglesia asociada a la cuenta "${userEmail}". Verifique su correo o cree el espacio de su iglesia ahora.`
        : isEn
        ? `No church workspace is linked to "${userEmail}" yet. Double-check your email or create your church workspace now.`
        : isFr
        ? `Aucune église n’est encore associée au compte « ${userEmail} ». Vérifiez l’adresse ou créez votre église maintenant.`
        : `Pa gen okenn legliz ki lye ak kont "${userEmail}" sa a ankò. Verifye imèl la oubyen kreye espas legliz pa w la kounye a.`,
    errOwnerMismatch: (userEmail: string, adminEmailStr: string) =>
      isEs
        ? `La cuenta "${userEmail}" no coincide con el propietario autorizado de esta iglesia (${adminEmailStr}).`
        : isEn
        ? `Account "${userEmail}" does not match this church's authorized owner (${adminEmailStr}).`
        : isFr
        ? `Le compte "${userEmail}" ne correspond pas au propriétaire autorisé de cette église (${adminEmailStr}).`
        : `Kont "${userEmail}" sa a pa koresponn ak mèt ofisyèl legliz sa a (${adminEmailStr}).`,
    errSuperDevReserved: isEs
      ? "Esta cuenta está reservada exclusivamente para el Panel de Administración General y no puede utilizarse como administrador de iglesia."
      : isEn
      ? "This account is strictly reserved for the System Administration Panel and cannot be used as a church administrator."
      : isFr
      ? "Ce compte est strictement réservé au Panneau d’Administration Générale et ne peut pas être utilisé comme administrateur d’église."
      : "Kont sa a rezève sèlman pou Panèl Administrasyon Jeneral sistèm nan. Li pa ka itilize kòm administratè legliz.",
    chooseOwnChurchTitle: isEs
      ? "Seleccione su Iglesia"
      : isEn
      ? "Select Your Church"
      : isFr
      ? "Sélectionnez Votre Église"
      : "Chwazi Legliz Pa W La",
    chooseOwnChurchDesc: (count: number, userEmail: string) =>
      isEs
        ? `Su cuenta (${userEmail}) administra ${count} iglesias. Seleccione cuál desea abrir:`
        : isEn
        ? `Your account (${userEmail}) owns ${count} churches. Choose the workspace to open:`
        : isFr
        ? `Votre compte (${userEmail}) administre ${count} églises. Choisissez l’espace à ouvrir :`
        : `Kont ou a (${userEmail}) jere ${count} legliz. Klike sou legliz ou vle ouvri a:`,
  };

  /**
   * Synchronizes the authenticated user's UID/JWT with Firestore `churches/{id}` BEFORE opening the Admin workspace.
   */
  const finalizeCloudOwnershipSync = async (
    candidateChurch: Church,
    userEmailForError: string,
    options?: { forceTokenRefresh?: boolean; reloadUser?: boolean }
  ): Promise<{ ok: boolean; syncedChurch?: Church }> => {
    const syncRes = await syncChurchAdminOwnershipWithCloud(candidateChurch, {
      forceTokenRefresh: options?.forceTokenRefresh ?? true,
      reloadUser: options?.reloadUser ?? false,
    });

    if (syncRes.synced) {
      const resolvedChurch = syncRes.church || candidateChurch;
      saveChurch(resolvedChurch);
      clearPendingLocalUpload("church", resolvedChurch.id);
      setSyncRequiredState(null);
      return { ok: true, syncedChurch: resolvedChurch };
    }

    if (syncRes.status === "email_verification_required") {
      setSyncRequiredState({
        email:
          syncRes.expectedEmail ||
          userEmailForError ||
          candidateChurch.adminGoogleEmail ||
          "",
        church: syncRes.church || candidateChurch,
      });
      return { ok: false };
    }

    if (syncRes.status === "owner_mismatch") {
      setError(
        t.errOwnerMismatch(
          userEmailForError || auth.currentUser?.email || "",
          syncRes.expectedEmail ||
            candidateChurch.adminGoogleEmail ||
            candidateChurch.name
        )
      );
      return { ok: false };
    }

    // Offline fallback: save locally so pending sync queue can flush once online
    saveChurch(candidateChurch);
    return { ok: true, syncedChurch: candidateChurch };
  };

  const applyRememberPreference = (userEmail: string, resolvedChurchId?: string) => {
    if (rememberMe) {
      saveRememberedAdminLogin(userEmail, resolvedChurchId);
    } else {
      clearRememberedAdminLogin();
    }
  };

  const finalizeAndEnterChurch = async (
    targetChurch: Church,
    signedInUser: GoogleAuthUser,
    authMethodUsed: "email_password" | "google"
  ): Promise<boolean> => {
    const userEmail = (signedInUser.email || adminEmail || "").trim().toLowerCase();
    const expectedUid = (targetChurch.adminGoogleUid || "").trim();
    const expectedEmail = (targetChurch.adminGoogleEmail || "").trim().toLowerCase();

    let candidateChurch: Church = targetChurch;
    if (expectedEmail === userEmail && expectedUid !== signedInUser.uid) {
      if (authMethodUsed === "google") {
        linkChurchAdminGoogleAccount(targetChurch.id, signedInUser);
      }
      candidateChurch = {
        ...targetChurch,
        adminGoogleUid: signedInUser.uid,
        adminGoogleEmail: userEmail,
        adminAuthMethod:
          targetChurch.adminAuthMethod === "email_password" && authMethodUsed === "google"
            ? "both"
            : targetChurch.adminAuthMethod === "google" && authMethodUsed === "email_password"
            ? "both"
            : targetChurch.adminAuthMethod || authMethodUsed,
      };
    }

    const syncOut = await finalizeCloudOwnershipSync(candidateChurch, userEmail, {
      forceTokenRefresh: true,
    });
    if (!syncOut.ok || !syncOut.syncedChurch) {
      return false;
    }

    const finalChurch = syncOut.syncedChurch;
    applyRememberPreference(userEmail, finalChurch.id);

    try {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    } catch {
      // ignore
    }

    toast.success(
      isEs
        ? "¡Acceso Concedido!"
        : isEn
        ? "Access Granted!"
        : isFr
        ? "Accès Accordé !"
        : "Aksè Akòde ✓",
      isEs
        ? `Espacio privado cargado automáticamente: ${finalChurch.name}.`
        : isEn
        ? `Your church workspace loaded automatically: ${finalChurch.name}.`
        : isFr
        ? `Votre église a été chargée automatiquement : ${finalChurch.name}.`
        : `Legliz pa w la chaje otomatikman: ${finalChurch.name}.`
    );

    const existingBio = getAdminBiometricRecord(finalChurch.id);
    if (enableBioForFuture && isBiometricSupported && !existingBio) {
      registerAdminBiometrics(
        finalChurch.id,
        finalChurch.name,
        userEmail
      ).catch(() => {});
    }

    onSuccess(finalChurch);
    return true;
  };

  /**
   * Automatically resolves ONLY the church(es) owned by the authenticated admin (from Firestore + local cache).
   * Never exposes or mixes any other tenant's church data.
   */
  const resolveAndEnterOwnedChurch = async (
    signedInUser: GoogleAuthUser,
    authMethodUsed: "email_password" | "google"
  ): Promise<void> => {
    const userEmail = (signedInUser.email || adminEmail || "").trim().toLowerCase();
    if (isSuperDeveloperEmail(userEmail)) {
      setError(t.errSuperDevReserved);
      return;
    }

    // 1. Live Firestore lookup strictly filtered by adminGoogleUid / adminGoogleEmail
    const remoteOwned = await firestoreFindChurchesByAdmin(
      signedInUser.uid,
      userEmail
    ).catch(() => []);
    for (const remoteChurch of remoteOwned) {
      cacheChurchLocally(remoteChurch);
    }

    // 2. Merge with local storage & strictly isolate to ONLY this owner's church(es)
    const mergedPool = [
      ...remoteOwned,
      ...allChurches,
      ...getAllChurches(),
      ...(lockedChurch ? [lockedChurch] : []),
    ];
    const ownedChurches = resolveAdminOwnedChurches(
      mergedPool,
      signedInUser.uid,
      userEmail
    );

    // If resuming a specific locked session and this user owns that locked church, reopen it directly
    if (lockedChurch && ownedChurches.some((c) => c.id === lockedChurch.id)) {
      const matchedLocked = ownedChurches.find((c) => c.id === lockedChurch.id)!;
      await finalizeAndEnterChurch(matchedLocked, signedInUser, authMethodUsed);
      return;
    }

    if (ownedChurches.length === 0) {
      setNoChurchFoundEmail(userEmail);
      setError(t.errNoChurchFound(userEmail));
      return;
    }

    if (ownedChurches.length === 1) {
      await finalizeAndEnterChurch(ownedChurches[0], signedInUser, authMethodUsed);
      return;
    }

    // Multi-church owner: present a private picker containing ONLY their own churches
    setOwnedChurchChoices({
      user: signedInUser,
      authMethod: authMethodUsed,
      churches: ownedChurches,
    });
  };

  const handleSelectOwnedChurch = async (chosenChurch: Church) => {
    if (!ownedChurchChoices) return;
    setError(null);
    setSelectingChurchId(chosenChurch.id);
    try {
      await finalizeAndEnterChurch(
        chosenChurch,
        ownedChurchChoices.user,
        ownedChurchChoices.authMethod
      );
    } catch (err: any) {
      setError(err?.message || "Erè pandan chajman legliz la.");
    } finally {
      setSelectingChurchId(null);
    }
  };

  const handleResendVerificationForSync = async () => {
    setError(null);
    setIsSendingVerification(true);
    try {
      await resendAdminVerificationEmail();
      const targetEmail =
        syncRequiredState?.email || adminEmail || lockedChurch?.adminGoogleEmail || "";
      toast.success(
        isEs
          ? "Correo de Verificación Enviado"
          : isEn
          ? "Verification Email Sent"
          : isFr
          ? "E-mail Envoyé"
          : "Imèl Verifikasyon Voye ✓",
        isEs
          ? `Revise su bandeja de entrada (${targetEmail}) y haga clic en el enlace para sincronizar sus permisos.`
          : isEn
          ? `Open ${targetEmail} and click the verification link, then click "I Verified — Sync Now".`
          : isFr
          ? `Ouvrez ${targetEmail} et cliquez sur le lien de vérification, puis cliquez sur « Synchroniser ».`
          : `Louvri bwat imèl ${targetEmail}, klike sou lyen verifikasyon an, epi peze « Mwen Verifye — Senkronize ».`
      );
    } catch (err: any) {
      setError(err?.message || "Pa ka voye imèl verifikasyon an kounye a.");
    } finally {
      setIsSendingVerification(false);
    }
  };

  const handleCheckVerificationAndSync = async () => {
    if (!syncRequiredState) return;
    setError(null);
    setIsCheckingVerification(true);
    try {
      const verified = await refreshAuthUserState();
      if (!verified) {
        setIsCheckingVerification(false);
        setError(
          isEs
            ? "Su correo aún no aparece verificado. Abra el enlace en su bandeja (o Spam) y vuelva a intentarlo, o use Google para sincronizar al instante."
            : isEn
            ? "Your email is not verified yet. Click the link in your inbox (or Spam folder) and try again, or use Google to sync instantly."
            : isFr
            ? "Votre e-mail n’est pas encore vérifié. Cliquez sur le lien reçu (ou Spam) puis réessayez, ou utilisez Google."
            : "Imèl ou a poko parèt verifye. Klike sou lyen nou voye nan bwat ou (oswa Spam) epi re-eseye, oubyen konekte ak Google pou senkronize touswit."
        );
        return;
      }

      const syncOut = await finalizeCloudOwnershipSync(
        syncRequiredState.church,
        syncRequiredState.email,
        { forceTokenRefresh: true, reloadUser: true }
      );
      setIsCheckingVerification(false);
      if (syncOut.ok && syncOut.syncedChurch) {
        applyRememberPreference(syncRequiredState.email, syncOut.syncedChurch.id);
        toast.success(
          isEs
            ? "¡Permisos Sincronizados!"
            : isEn
            ? "Permissions Synced!"
            : isFr
            ? "Permissions Synchronisées !"
            : "Pèmisyon Senkronize ✓",
          isEs
            ? `Su cuenta ahora está vinculada con ${syncOut.syncedChurch.name}.`
            : isEn
            ? `Your admin account is now synced with ${syncOut.syncedChurch.name}.`
            : `Kont administratè ou a senkronize kounye a ak ${syncOut.syncedChurch.name}.`
        );
        onSuccess(syncOut.syncedChurch);
      }
    } catch (err: any) {
      setIsCheckingVerification(false);
      setError(err?.message || "Erè pandan verifikasyon senkronizasyon an.");
    }
  };

  const handleQuickPinUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isLockedOwnerSession || !lockedChurch) {
      setError(
        isEs
          ? "La sesión en la nube expiró. Inicie sesión con correo y contraseña primero."
          : isEn
          ? "Cloud session is not active. Please sign in with Email & Password first."
          : isFr
          ? "La session cloud n’est plus active. Connectez-vous avec e-mail et mot de passe d’abord."
          : "Sesyon nwaj la pa aktif ankò. Konekte ak imèl + modpas ou dabò."
      );
      setPreferEmailPasswordInsteadOfPin(true);
      return;
    }

    const cleanPin = quickPinInput.trim();
    if (!cleanPin || cleanPin.length < 4) {
      setError(
        isEs
          ? "Ingrese su PIN rápido de administrador (mínimo 4 dígitos)."
          : isEn
          ? "Enter your quick admin PIN (minimum 4 digits)."
          : isFr
          ? "Entrez votre code PIN rapide (minimum 4 chiffres)."
          : "Tanpri antre kòd PIN rapid ou a (omwen 4 chif)."
      );
      return;
    }

    setIsVerifying(true);
    try {
      const verify = await verifyAdminPasscode(
        cleanPin,
        lockedChurch.adminPasscode,
        lockedChurch.id
      );

      if (!verify.matches) {
        setIsVerifying(false);
        setError(
          isEs
            ? "El PIN rápido es incorrecto."
            : isEn
            ? "Incorrect quick PIN."
            : isFr
            ? "Code PIN rapide incorrect."
            : "Kòd PIN rapid la pa kòrèk pou legliz sa a."
        );
        return;
      }

      let finalChurch = lockedChurch;
      if (verify.needsUpgrade) {
        const hashed = hashAdminPasscodeSync(cleanPin, lockedChurch.id);
        finalChurch = {
          ...lockedChurch,
          adminPasscode: hashed,
        };
        saveChurch(finalChurch, { deliberatePasscodeUpdate: true });
      }

      const syncOut = await finalizeCloudOwnershipSync(
        finalChurch,
        googleUser?.email || finalChurch.adminGoogleEmail || ""
      );
      if (!syncOut.ok || !syncOut.syncedChurch) {
        setIsVerifying(false);
        return;
      }
      finalChurch = syncOut.syncedChurch;

      try {
        confetti({ particleCount: 55, spread: 70, origin: { y: 0.6 } });
      } catch {
        // ignore
      }

      toast.success(
        isEs
          ? "¡Sesión Reanudada!"
          : isEn
          ? "Session Resumed!"
          : isFr
          ? "Session Reprise !"
          : "Sesyon Reprann Vit ✓",
        isEs
          ? `Acceso rápido verificado para ${finalChurch.name}.`
          : isEn
          ? `Quick PIN verified for ${finalChurch.name}.`
          : isFr
          ? `Accès rapide vérifié pour ${finalChurch.name}.`
          : `Ou reprann espas administratè "${finalChurch.name}" avèk siksè.`
      );

      setIsVerifying(false);
      onSuccess(finalChurch);
    } catch {
      setIsVerifying(false);
      setError(
        isEs
          ? "No se pudo verificar el PIN."
          : isEn
          ? "Could not verify PIN."
          : "Pa ka verifye kòd PIN la."
      );
    }
  };

  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSyncRequiredState(null);
    setNoChurchFoundEmail(null);

    const cleanEmail = adminEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError(
        isEs
          ? "Por favor ingrese un correo electrónico válido."
          : isEn
          ? "Please enter a valid email address."
          : isFr
          ? "Veuillez saisir une adresse e-mail valide."
          : "Tanpri antre yon adrès imèl ki valab."
      );
      return;
    }
    if (!password) {
      setError(
        isEs
          ? "Por favor ingrese su contraseña."
          : isEn
          ? "Please enter your password."
          : isFr
          ? "Veuillez entrer votre mot de passe."
          : "Tanpri antre modpas ou a."
      );
      return;
    }

    setIsVerifying(true);
    try {
      const signedInUser = await signInChurchAdminWithEmail(cleanEmail, password, {
        rememberMe,
      });
      await resolveAndEnterOwnedChurch(signedInUser, "email_password");
      setIsVerifying(false);
    } catch (err: any) {
      setIsVerifying(false);
      setError(
        err?.message ||
          (isEs
            ? "Correo o contraseña incorrectos."
            : "Imèl oswa modpas la pa kòrèk.")
      );
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    const targetEmail = adminEmail.trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes("@")) {
      setError(
        isEs
          ? "Escriba su correo de administrador arriba primero para enviarle el enlace de restablecimiento."
          : isEn
          ? "Enter your admin email above first so we can send your password reset link."
          : isFr
          ? "Entrez votre e-mail administrateur ci-dessus d’abord pour recevoir le lien de réinitialisation."
          : "Antre imèl administratè w la anwo a dabò pou nou ka voye lyen chanjman modpas la."
      );
      return;
    }

    setIsResettingPassword(true);
    try {
      await sendChurchAdminPasswordReset(targetEmail);
      toast.success(
        isEs
          ? "Enlace Enviado"
          : isEn
          ? "Reset Email Sent"
          : isFr
          ? "E-mail Envoyé"
          : "Imèl Re-inisyalizasyon Voye ✓",
        isEs
          ? `Se envió un correo para restablecer la contraseña a ${targetEmail}.`
          : isEn
          ? `Password reset instructions have been sent to ${targetEmail}.`
          : isFr
          ? `Un e-mail de réinitialisation a été envoyé à ${targetEmail}.`
          : `Nou voye yon lyen nan bwat "${targetEmail}" pou w ka kreye yon nouvo modpas.`
      );
    } catch (err: any) {
      setError(err?.message || "Pa ka voye imèl re-inisyalizasyon an.");
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleVerifyLegacyPinAndProceed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lockedChurch) return;
    setError(null);
    const cleanPin = legacyPin.trim();
    if (!cleanPin) {
      setError("Tanpri antre ansyen kòd PIN legliz la.");
      return;
    }
    setIsVerifying(true);
    try {
      const verify = await verifyAdminPasscode(
        cleanPin,
        lockedChurch.adminPasscode,
        lockedChurch.id
      );
      setIsVerifying(false);
      if (verify.matches) {
        setLegacyPinVerified(true);
        setUpgradeEmail(lockedChurch.email || "");
      } else {
        setError("Ansyen kòd PIN la pa kòrèk pou legliz sa a.");
      }
    } catch {
      setIsVerifying(false);
      setError("Ansyen kòd PIN la pa kòrèk.");
    }
  };

  const handleCompleteLegacyUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lockedChurch) return;
    setError(null);
    const cleanEmail = upgradeEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Tanpri antre yon imèl administratè ki valab.");
      return;
    }
    if (!upgradePassword || upgradePassword.length < 6) {
      setError("Nouvo modpas la dwe gen omwen 6 karaktè.");
      return;
    }
    if (upgradePassword !== upgradeConfirmPassword) {
      setError("De modpas yo pa koresponn.");
      return;
    }

    setIsVerifying(true);
    try {
      const registeredUser = await registerChurchAdminWithEmail(
        cleanEmail,
        upgradePassword,
        lockedChurch.pastor || lockedChurch.name
      );

      const upgradedChurch: Church = {
        ...lockedChurch,
        adminGoogleEmail: (registeredUser.email || cleanEmail).toLowerCase(),
        adminGoogleUid: registeredUser.uid,
        adminGoogleName: registeredUser.displayName || lockedChurch.pastor,
        adminAuthMethod: "email_password",
      };
      const syncOut = await finalizeCloudOwnershipSync(
        upgradedChurch,
        upgradedChurch.adminGoogleEmail || cleanEmail,
        { forceTokenRefresh: true }
      );
      if (!syncOut.ok || !syncOut.syncedChurch) {
        setIsVerifying(false);
        return;
      }

      const finalUpgraded = syncOut.syncedChurch;
      applyRememberPreference(
        finalUpgraded.adminGoogleEmail || cleanEmail,
        finalUpgraded.id
      );
      toast.success(
        isEn ? "Security Upgraded!" : "Sekirite Legliz la Amelyore ✓",
        isEn
          ? `${finalUpgraded.name} is now secured with ${finalUpgraded.adminGoogleEmail}.`
          : `Legliz "${finalUpgraded.name}" konekte kounye a ak kont sekirize ${finalUpgraded.adminGoogleEmail}.`
      );
      setIsVerifying(false);
      onSuccess(finalUpgraded);
    } catch (err: any) {
      setIsVerifying(false);
      setError(err?.message || "Erè pandan aktyalizasyon kont administratè a.");
    }
  };

  const handleBiometricAdminUnlock = async () => {
    if (!biometricTargetChurch) return;
    setError(null);
    setIsBiometricLoading(true);
    try {
      const res = await authenticateAdminBiometrics(biometricTargetChurch.id);
      if (!res.success) {
        setIsBiometricLoading(false);
        setError(
          res.error ||
            (isEs
              ? "Autenticación biométrica fallida."
              : "Otantifikasyon byometrik la pa t reyisi.")
        );
        return;
      }
      let finalChurch = biometricTargetChurch;
      if (auth.currentUser) {
        const syncOut = await finalizeCloudOwnershipSync(
          biometricTargetChurch,
          auth.currentUser.email || biometricTargetChurch.adminGoogleEmail || ""
        );
        if (!syncOut.ok || !syncOut.syncedChurch) {
          setIsBiometricLoading(false);
          return;
        }
        finalChurch = syncOut.syncedChurch;
      }
      setIsBiometricLoading(false);
      try {
        confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
      } catch {
        // ignore
      }
      toast.success(
        isEs
          ? "¡Acceso Admin por Biometría!"
          : isEn
          ? "Biometric Admin Access!"
          : isFr
          ? "Accès Admin par Biométrie !"
          : "Aksè Admin pa Byometri ✓",
        isEs
          ? `Huella/FaceID verificada para ${finalChurch.name}.`
          : isEn
          ? `Fingerprint/FaceID verified for ${finalChurch.name}.`
          : isFr
          ? `Empreinte/FaceID vérifiée pour ${finalChurch.name}.`
          : `Anprent/FaceID verifye pou ${finalChurch.name}.`
      );
      onSuccess(finalChurch);
    } catch (err: any) {
      setIsBiometricLoading(false);
      setError(err?.message || "Erè pandan otantifikasyon byometrik la.");
    }
  };

  const handleGoogleVerify = async () => {
    setError(null);
    setSyncRequiredState(null);
    setNoChurchFoundEmail(null);
    setIsGoogleLoading(true);
    try {
      const currentGUser = await signInWithGoogle({ rememberMe });
      if (!currentGUser || !currentGUser.email) {
        setIsGoogleLoading(false);
        return;
      }
      await resolveAndEnterOwnedChurch(currentGUser, "google");
      setIsGoogleLoading(false);
    } catch (err: any) {
      setIsGoogleLoading(false);
      setError(
        err?.message ||
          (isEs
            ? "Error durante la autenticación con Google."
            : "Erè pandan otantifikasyon Google la.")
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#1E293B] rounded-3xl shadow-2xl border border-slate-700/90 p-6 sm:p-7 text-slate-200 space-y-5 overflow-hidden max-h-[92vh] overflow-y-auto custom-scrollbar">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-700/80 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <OmniChurchLogo
              variant="icon"
              priority
              className="h-11 w-11"
            />
            <div className="min-w-0">
              <h3 className="font-extrabold text-base sm:text-lg text-white tracking-tight flex items-center gap-1.5 flex-wrap">
                <span>
                  {ownedChurchChoices ? t.chooseOwnChurchTitle : t.title}
                </span>
                {isLockedOwnerSession && lockedChurch && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 text-[10px] font-mono font-bold">
                    {lockedChurch.code || lockedChurch.id}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                {ownedChurchChoices
                  ? t.chooseOwnChurchDesc(
                      ownedChurchChoices.churches.length,
                      ownedChurchChoices.user.email || ""
                    )
                  : isLockedOwnerSession && lockedChurch
                  ? lockedChurch.name
                  : t.autoResolveSubtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auto-lock Banner (only shown when resuming the authenticated owner's locked session) */}
        {isLockedOwnerSession && lockedChurch && (
          <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-3 animate-fadeIn">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="leading-relaxed min-w-0 flex-1">
              <div className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                <span>
                  {(() => {
                    const mins =
                      typeof lockedChurch.autoLockMinutes === "number"
                        ? lockedChurch.autoLockMinutes
                        : 5;
                    return isEs
                      ? `Sesión Bloqueada (${mins} min)`
                      : isEn
                      ? `Admin Session Locked (${mins} min)`
                      : isFr
                      ? `Session Verrouillée (${mins} min)`
                      : `Sesyon Bloke (${mins} min)`;
                  })()}
                </span>
              </div>
              <p className="text-[11px] text-amber-200/90 mt-1 leading-relaxed">
                {canQuickPinUnlock
                  ? isEs
                    ? "Su cuenta sigue vinculada. Ingrese su PIN rápido, biometría o contraseña para reanudar al instante."
                    : isEn
                    ? "Your owner account stays signed in. Enter your Quick PIN, biometrics, or password to resume immediately."
                    : isFr
                    ? "Votre compte reste connecté. Entrez votre PIN rapide, biométrie ou mot de passe pour reprendre vite."
                    : "Kont ou a toujou konekte anba a. Antre kòd PIN rapid ou a, anprent ou oswa modpas ou pou reprann travay la vit."
                  : isEs
                  ? "Para proteger los datos de la congregación, ingrese su contraseña de administrador, biometría o Google para reanudar."
                  : isEn
                  ? "To protect confidential church records, enter your admin password, biometrics, or Google account to resume."
                  : isFr
                  ? "Pour protéger les données de l’église, entrez votre mot de passe, la biométrie ou Google pour continuer."
                  : "Pou sekirize done legliz la, konekte ak imèl + modpas administratè a, byometri oswa Google pou relouvri."}
              </p>
            </div>
          </div>
        )}

        {/* Cloud Ownership Sync / Email Verification Required Card */}
        {syncRequiredState && (
          <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-400/50 text-amber-100 text-xs space-y-3 animate-fadeIn">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
              <div className="space-y-1 leading-relaxed">
                <p className="font-bold text-amber-200">
                  {isEs
                    ? "Sincronización de Permisos Requerida (1 sola vez)"
                    : isEn
                    ? "One-Time Cloud Permission Sync Required"
                    : isFr
                    ? "Synchronisation des Permissions Requise (1 fois)"
                    : "Senkronizasyon Kont Admin Obligatwa (1 Sèl Fwa)"}
                </p>
                <p className="text-[11px] text-amber-100/90">
                  {isEs
                    ? `Para que su cuenta (${syncRequiredState.email}) pueda crear y editar miembros sin error de permiso, confirme su correo electrónico una sola vez o sincronice al instante con Google.`
                    : isEn
                    ? `To allow ${syncRequiredState.email} to save members and church records without permission errors, verify your email once or click Google Sign-In above to sync immediately.`
                    : isFr
                    ? `Pour autoriser ${syncRequiredState.email} à enregistrer des membres sans erreur de permission, vérifiez votre e-mail une seule fois ou synchronisez avec Google.`
                    : `Pou kont ${syncRequiredState.email} la ka ajoute manm san erè pèmisyon nan baz done a, verifye imèl ou yon sèl fwa oswa konekte ak Google anba a pou senkronize touswit.`}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isSendingVerification}
                onClick={handleResendVerificationForSync}
                className="px-3 py-2 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-400/40 font-bold text-[11px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>
                  {isSendingVerification
                    ? "..."
                    : isEs
                    ? "Enviar Correo de Verificación"
                    : isEn
                    ? "Send Verification Email"
                    : isFr
                    ? "Envoyer E-mail"
                    : "Voye Imèl Verifikasyon"}
                </span>
              </button>
              <button
                type="button"
                disabled={isCheckingVerification}
                onClick={handleCheckVerificationAndSync}
                className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    isCheckingVerification ? "animate-spin" : ""
                  }`}
                />
                <span>
                  {isCheckingVerification
                    ? "..."
                    : isEs
                    ? "Ya Verifiqué — Sincronizar"
                    : isEn
                    ? "I Verified — Sync Now"
                    : isFr
                    ? "J’ai Vérifié — Synchroniser"
                    : "Mwen Verifye — Senkronize"}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs space-y-2.5">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
            {noChurchFoundEmail && onOpenCreateChurch && (
              <div className="pl-6">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCreateChurch();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    {isEs
                      ? "Crear Mi Iglesia Ahora"
                      : isFr
                      ? "Créer Mon Église Maintenant"
                      : isEn
                      ? "Create My Church Now"
                      : "Kreye Legliz Mwen Kounye a"}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* POST-AUTH OWNER-ONLY MULTI-CHURCH PICKER (Only shown when authenticated admin owns > 1 church) */}
        {ownedChurchChoices ? (
          <div className="space-y-3 animate-fadeIn">
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
              {ownedChurchChoices.churches.map((owned) => {
                const isBusy = selectingChurchId === owned.id;
                return (
                  <button
                    key={owned.id}
                    type="button"
                    disabled={Boolean(selectingChurchId)}
                    onClick={() => handleSelectOwnedChurch(owned)}
                    className="w-full p-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/90 hover:border-amber-400/60 text-left flex items-center justify-between gap-3 transition-all cursor-pointer disabled:opacity-60 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white text-sm truncate flex items-center gap-1.5">
                          <span className="truncate">{owned.name}</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 text-[10px] font-mono shrink-0">
                            {owned.code || owned.id}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {[owned.pastor, owned.city].filter(Boolean).join(" • ") ||
                            owned.adminGoogleEmail}
                        </div>
                      </div>
                    </div>
                    {isBusy ? (
                      <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-300 shrink-0 transition-colors" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-700/70">
              <button
                type="button"
                onClick={() => {
                  setOwnedChurchChoices(null);
                  setError(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-semibold cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>
                  {isEs
                    ? "Usar otra cuenta"
                    : isFr
                    ? "Changer de compte"
                    : isEn
                    ? "Use another account"
                    : "Itilize yon lòt kont"}
                </span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-semibold text-xs cursor-pointer"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Private Locked Church Badge (ONLY shown when resuming an already-signed-in owner's locked session) */}
            {isLockedOwnerSession && lockedChurch && (
              <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                      {isEs
                        ? "Su Iglesia Activa"
                        : isFr
                        ? "Votre Église Active"
                        : isEn
                        ? "Your Active Church"
                        : "Legliz Pa W La"}
                    </span>
                    <span className="font-bold text-white truncate block">
                      {lockedChurch.name}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono shrink-0">
                  {isEn ? "Owner Verified ✓" : "Kont Sekirize ✓"}
                </span>
              </div>
            )}

            {/* Biometrics (only if enrolled for user's own church) & Google Sign-In */}
            <div className="space-y-2.5">
              {isBiometricSupported && biometricTargetChurch && adminBioRecord && (
                <div className="space-y-1.5">
                  <button
                    type="button"
                    id="btn-admin-biometric-unlock"
                    disabled={isBiometricLoading}
                    onClick={handleBiometricAdminUnlock}
                    className="w-full py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2.5 transition-all transform active:scale-[0.99] cursor-pointer disabled:opacity-50 border bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white border-emerald-400/50 shadow-emerald-500/20"
                  >
                    {isBiometricLoading ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <div className="flex items-center gap-1">
                          <Fingerprint className="w-4 h-4 text-emerald-300" />
                          <ScanFace className="w-3.5 h-3.5 text-teal-300" />
                        </div>
                        <span>
                          {isEs
                            ? "Desbloquear con Huella / FaceID"
                            : isFr
                            ? "Déverrouiller avec Empreinte / FaceID"
                            : isEn
                            ? "Unlock with Fingerprint / FaceID"
                            : "Debloke ak Anprent / FaceID"}
                        </span>
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-center text-emerald-400/90 font-medium">
                    {isEs
                      ? "✓ Huella digital de administrador activada en este dispositivo"
                      : isFr
                      ? "✓ Empreinte digitale administrateur activée sur cet appareil"
                      : isEn
                      ? "✓ Administrator biometrics active on this device"
                      : "✓ Anprent administratè aktif sou aparèy sa a"}
                  </p>
                </div>
              )}

              <button
                type="button"
                id="btn-admin-google-signin"
                disabled={isGoogleLoading}
                onClick={handleGoogleVerify}
                className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2.5 transition-all transform active:scale-[0.99] cursor-pointer disabled:opacity-50 border border-slate-200"
              >
                {isGoogleLoading ? (
                  <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    <span>{t.googleBtn}</span>
                  </>
                )}
              </button>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-700 w-full" />
              <span className="bg-[#1E293B] px-3 text-[10px] uppercase tracking-widest text-slate-400 font-bold whitespace-nowrap">
                {canQuickPinUnlock && !preferEmailPasswordInsteadOfPin
                  ? isEs
                    ? "Desbloqueo Rápido con PIN"
                    : isEn
                    ? "Quick PIN Resume"
                    : isFr
                    ? "Déverrouillage Rapide par PIN"
                    : "Deblokaj Rapid ak Kòd PIN"
                  : isLegacyPinOnlyLockedChurch
                  ? isEs
                    ? "O Actualice desde PIN Antiguo"
                    : isEn
                    ? "Or Upgrade Legacy PIN"
                    : "Oubyen Verifye Ansyen PIN"
                  : isEs
                  ? "O Correo y Contraseña Admin"
                  : isEn
                  ? "Or Admin Email & Password"
                  : isFr
                  ? "Ou E-mail & Mot de Passe Admin"
                  : "Oubyen Imèl & Modpas Admin"}
              </span>
              <div className="border-t border-slate-700 w-full" />
            </div>

            {/* QUICK PIN UNLOCK vs LEGACY MIGRATION vs EMAIL + PASSWORD LOGIN */}
            {canQuickPinUnlock && !preferEmailPasswordInsteadOfPin ? (
              <form onSubmit={handleQuickPinUnlock} className="space-y-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span className="truncate font-mono">
                      {googleUser?.email}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-[10px] font-bold shrink-0">
                    PIN Rapid ✓
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    {isEs
                      ? "PIN Rápido de Administrador"
                      : isEn
                      ? "Quick Admin PIN"
                      : isFr
                      ? "Code PIN Rapide Admin"
                      : "Kòd PIN Rapid Admin"}
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-amber-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type={showQuickPin ? "text" : "password"}
                      inputMode="numeric"
                      autoFocus
                      required
                      maxLength={8}
                      value={quickPinInput}
                      onChange={(e) => setQuickPinInput(e.target.value)}
                      placeholder="••••"
                      className="w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-900 border border-amber-400/60 text-white font-mono text-center text-lg tracking-[0.4em] focus:ring-2 focus:ring-amber-400 focus:border-transparent focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowQuickPin(!showQuickPin)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showQuickPin ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setPreferEmailPasswordInsteadOfPin(true);
                    }}
                    className="text-amber-400 hover:text-amber-300 underline font-semibold cursor-pointer"
                  >
                    {isEs
                      ? "Usar correo y contraseña"
                      : isEn
                      ? "Use email & password instead"
                      : isFr
                      ? "Utiliser e-mail et mot de passe"
                      : "Itilize Imèl + Modpas pito"}
                  </button>
                </div>

                <div className="pt-1 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-2xl text-slate-400 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    id="btn-quick-pin-unlock-submit"
                    disabled={isVerifying}
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all transform active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {isVerifying ? (
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>
                          {isEs
                            ? "Reanudar Ahora"
                            : isEn
                            ? "Unlock with PIN"
                            : isFr
                            ? "Déverrouiller Vite"
                            : "Reprann Vit ak PIN"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : isLegacyPinOnlyLockedChurch ? (
              !legacyPinVerified ? (
                <form
                  onSubmit={handleVerifyLegacyPinAndProceed}
                  className="space-y-4"
                >
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 leading-relaxed">
                    {isEn
                      ? "This legacy church still uses an old PIN. Verify the PIN below once to upgrade it to a real Admin Email & Password."
                      : "Legliz sa a te kreye sou ansyen sistèm PIN lan. Antre ansyen kòd PIN lan yon sèl fwa pou transfòme l ak yon Imèl + Modpas reyèl."}
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type={showPassword ? "text" : "password"}
                      autoFocus
                      required
                      value={legacyPin}
                      onChange={(e) => setLegacyPin(e.target.value)}
                      placeholder={
                        isEn
                          ? "Enter legacy church PIN"
                          : "Antre ansyen PIN legliz la"
                      }
                      className="w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-white font-mono text-center text-base tracking-widest focus:ring-2 focus:ring-amber-400 focus:border-transparent focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div className="pt-1 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2.5 rounded-2xl text-slate-400 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
                    >
                      {t.cancel}
                    </button>
                    <button
                      type="submit"
                      disabled={isVerifying}
                      className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>
                        {isEn ? "Verify Legacy PIN" : "Verifye Ansyen PIN"}
                      </span>
                    </button>
                  </div>
                </form>
              ) : (
                <form
                  onSubmit={handleCompleteLegacyUpgrade}
                  className="space-y-3.5"
                >
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-300 font-semibold flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 shrink-0" />
                    <span>
                      {isEn
                        ? "PIN verified! Now assign the church's official Admin Email & Password."
                        : "PIN verifye ✓! Kounye a defini Imèl ak Modpas ofisyèl pou admin legliz sa a."}
                    </span>
                  </div>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={upgradeEmail}
                      onChange={(e) => setUpgradeEmail(e.target.value)}
                      placeholder={t.emailPlaceholder}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={upgradePassword}
                    onChange={(e) => setUpgradePassword(e.target.value)}
                    placeholder={
                      isEn
                        ? "New password (min 6 chars)"
                        : "Nouvo modpas (omwen 6 karaktè)"
                    }
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={upgradeConfirmPassword}
                    onChange={(e) => setUpgradeConfirmPassword(e.target.value)}
                    placeholder={
                      isEn ? "Confirm password" : "Konfime nouvo modpas la"
                    }
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                  <div className="pt-1 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2.5 rounded-2xl text-slate-400 hover:text-white font-semibold text-xs cursor-pointer"
                    >
                      {t.cancel}
                    </button>
                    <button
                      type="submit"
                      disabled={isVerifying}
                      className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>
                        {isEn ? "Save & Unlock" : "Aktive Kont la & Debloke"}
                      </span>
                    </button>
                  </div>
                </form>
              )
            ) : (
              <form
                onSubmit={handleEmailPasswordLogin}
                autoComplete="on"
                className="space-y-4"
              >
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="input-admin-auth-email"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
                    >
                      {t.emailLabel}
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                      <input
                        id="input-admin-auth-email"
                        name="email"
                        type="email"
                        autoComplete="username"
                        autoFocus={!adminEmail}
                        required
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder={t.emailPlaceholder}
                        className="w-full pl-10 pr-3.5 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="input-admin-auth-password"
                        className="block text-xs font-bold uppercase tracking-wider text-slate-300"
                      >
                        {t.passwordLabel}
                      </label>
                      <button
                        type="button"
                        disabled={isResettingPassword}
                        onClick={handleForgotPassword}
                        className="text-[11px] text-amber-400 hover:text-amber-300 underline font-semibold cursor-pointer disabled:opacity-50"
                      >
                        {isResettingPassword ? "..." : t.forgotPassword}
                      </button>
                    </div>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                      <input
                        id="input-admin-auth-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        autoFocus={Boolean(adminEmail)}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t.passwordPlaceholder}
                        className="w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Opt-in Remember Me Checkbox */}
                  <label
                    htmlFor="checkbox-admin-remember-me"
                    className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/70 border border-slate-700/70 hover:border-amber-400/40 transition-colors cursor-pointer select-none"
                  >
                    <input
                      id="checkbox-admin-remember-me"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setRememberMe(checked);
                        if (!checked) {
                          clearRememberedAdminLogin();
                        }
                      }}
                      className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-950 text-amber-400 focus:ring-amber-400 focus:ring-offset-0 shrink-0 cursor-pointer"
                    />
                    <span className="min-w-0">
                      <span className="block text-xs font-bold text-slate-100 leading-snug">
                        {t.rememberMeLabel}
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5 leading-snug">
                        {t.rememberMeHint}
                      </span>
                    </span>
                  </label>

                  {isBiometricSupported && !adminBioRecord && (
                    <label className="flex items-center gap-2 pt-0.5 text-[11px] text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={enableBioForFuture}
                        onChange={(e) =>
                          setEnableBioForFuture(e.target.checked)
                        }
                        className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-400 focus:ring-offset-0"
                      />
                      <span className="flex items-center gap-1.5">
                        <Fingerprint className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>
                          {isEs
                            ? "Activar Huella / FaceID para acceso rápido en este dispositivo"
                            : isFr
                            ? "Activer Empreinte / FaceID pour accès rapide sur cet appareil"
                            : isEn
                            ? "Enable Fingerprint / FaceID for quick unlock on this device"
                            : "Aktive Anprent / FaceID pou debloke admin pi rapid sou aparèy sa a"}
                        </span>
                      </span>
                    </label>
                  )}
                </div>

                {/* Strict Multi-Tenant Privacy Guarantee */}
                <div className="flex items-center gap-2 text-[11px] text-emerald-300/90 px-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>
                    {isEs
                      ? "Aislamiento total: solo se cargará su propia iglesia."
                      : isFr
                      ? "Isolation totale : seule votre propre église sera chargée."
                      : isEn
                      ? "Strict privacy: only your own church data is ever loaded."
                      : "Done 100% separe: se sèlman legliz pa w la ki pral chaje."}
                  </span>
                </div>

                <div className="pt-1 flex items-center justify-between gap-2.5">
                  <div>
                    {canQuickPinUnlock && (
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setPreferEmailPasswordInsteadOfPin(false);
                        }}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 underline font-semibold cursor-pointer"
                      >
                        {isEn
                          ? "← Back to Quick PIN"
                          : "← Retounen sou PIN Rapid"}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2.5 rounded-2xl text-slate-400 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
                    >
                      {t.cancel}
                    </button>
                    <button
                      type="submit"
                      id="btn-admin-email-login-submit"
                      disabled={isVerifying}
                      className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all transform active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      {isVerifying ? (
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>{t.unlockBtn}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </>
        )}

        {onOpenCreateChurch && (
          <div className="pt-3 border-t border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-[11px]">
            <span className="text-slate-400 text-center sm:text-left">
              {isEs
                ? "¿Aún no tiene su congregación registrada?"
                : isFr
                ? "Votre église n’est pas encore créée ?"
                : isEn
                ? "Registering your own church workspace?"
                : "Ou vle kreye espas pa pwòp legliz pa w ?"}
            </span>
            <button
              type="button"
              id="btn-open-create-church-from-admin-modal"
              onClick={() => {
                onClose();
                onOpenCreateChurch();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300 font-bold transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {isEs
                  ? "Crear Nueva Iglesia"
                  : isFr
                  ? "Créer une Nouvelle Église"
                  : isEn
                  ? "Create New Church"
                  : "Kreye Nouvo Legliz"}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPasscodeModal;
