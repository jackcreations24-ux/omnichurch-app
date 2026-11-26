import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  MailCheck,
  Mail,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  Building2,
  ShieldCheck,
  Inbox,
  AlertCircle,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  X,
} from 'lucide-react';
import { Church, Language } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { auth } from '../../lib/firebase';
import { OmniChurchLogo } from '../common/OmniChurchLogo';
import {
  EMAIL_VERIFICATION_RESEND_COOLDOWN_SEC,
  computeResendCooldownRemaining,
  getVerificationEmailLastSentAt,
  recordVerificationEmailSent,
  needsInlineReauthForVerification,
} from '../../utils/emailVerificationFlow';
import {
  syncChurchAdminOwnershipWithCloud,
  firestoreAddMember,
} from '../../services/firestoreService';
import {
  saveChurch,
  clearPendingLocalUpload,
  getMembersByChurch,
  hasPendingLocalUpload,
  isDeviceOnline,
} from '../../utils/storage';

interface AdminEmailVerificationScreenProps {
  church: Church;
  language?: Language;
  onVerifiedComplete: (syncedChurch: Church) => void;
  onContinueLater: () => void;
}

export const AdminEmailVerificationScreen: React.FC<AdminEmailVerificationScreenProps> = ({
  church,
  language = 'ht',
  onVerifiedComplete,
  onContinueLater,
}) => {
  const toast = useToast();
  const {
    googleUser,
    isEmailVerified,
    resendAdminVerificationEmail,
    refreshAuthUserState,
    signInChurchAdminWithEmail,
    sendChurchAdminPasswordReset,
  } = useAuth();

  const targetEmail = (church.adminGoogleEmail || googleUser?.email || '').trim().toLowerCase();
  const liveAuthEmail = (auth.currentUser?.email || googleUser?.email || '').trim().toLowerCase();
  const hasMatchingLiveAuth = !needsInlineReauthForVerification({
    church,
    hasAuthUser: Boolean(auth.currentUser?.uid),
    authUserEmail: liveAuthEmail,
  });

  const isEn = language === 'en';
  const isFr = language === 'fr';
  const isEs = language === 'es';

  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verifiedSuccess, setVerifiedSuccess] = useState(
    Boolean((isEmailVerified && hasMatchingLiveAuth) || church.adminVerified)
  );
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [resendCount, setResendCount] = useState(0);
  const [cooldownSec, setCooldownSec] = useState<number>(() =>
    computeResendCooldownRemaining(getVerificationEmailLastSentAt(targetEmail))
  );

  // Inline re-authentication state for expired sessions / PIN logins / late verification (days later)
  const [forceReauthMode, setForceReauthMode] = useState(false);
  const [reauthEmail, setReauthEmail] = useState(targetEmail);
  const [reauthPassword, setReauthPassword] = useState('');
  const [showReauthPassword, setShowReauthPassword] = useState(false);
  const [isReauthingAndSending, setIsReauthingAndSending] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const showReauthPanel = forceReauthMode || !hasMatchingLiveAuth;
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    if (targetEmail && !reauthEmail) {
      setReauthEmail(targetEmail);
    }
  }, [targetEmail, reauthEmail]);

  const copy = {
    kicker: isEs
      ? 'Verificación de cuenta de propietario'
      : isFr
      ? 'Vérification du compte propriétaire'
      : isEn
      ? 'Church Owner Email Verification'
      : 'Verifikasyon Imèl Mèt Legliz la',
    headline: isEs
      ? 'Confirme su correo electrónico para activar su iglesia'
      : isFr
      ? 'Confirmez votre adresse e-mail pour activer votre église'
      : isEn
      ? 'Confirm your email address to activate your church'
      : 'Konfime adrès imèl ou pou aktive legliz la',
    subtitle: isEs
      ? 'Confirme su dirección de correo para proteger y sincronizar su iglesia. Si un enlace anterior ya expiró (incluso después de varios días), puede solicitar uno nuevo al instante.'
      : isFr
      ? 'Confirmez votre adresse e-mail pour activer la synchronisation cloud. Si votre ancien lien a expiré (même après plusieurs jours), vous pouvez en renvoyer un nouveau immédiatement.'
      : isEn
      ? 'Confirm your email address to unlock full cloud permissions for your church. Even if an older verification link expired days ago, you can always send a fresh link below.'
      : 'Konfime adrès imèl ou pou aktive tout pèmisyon legliz ou a nan baz done a. Menm si ansyen lyen verifikasyon an ekspire deja (apre plizyè jou), ou toujou kapab revoye yon nouvo lyen fre kounye a.',
    sentToLabel: isEs
      ? 'Correo del propietario de la iglesia'
      : isFr
      ? 'E-mail du propriétaire de l’église'
      : isEn
      ? 'Church owner email address'
      : 'Adrès imèl mèt legliz la',
    stepsHeading: isEs
      ? 'Cómo confirmar (incluso si el enlace anterior expiró)'
      : isFr
      ? 'Comment confirmer (même si le lien a expiré)'
      : isEn
      ? 'How to confirm (even if an old link expired)'
      : 'Kòman pou konfime (menm si ansyen lyen an ekspire)',
    step1: isEs
      ? 'Si el enlace anterior expiró, presione « Reenviar correo de verificación » para recibir uno nuevo y válido.'
      : isFr
      ? 'Si le lien précédent a expiré, appuyez sur « Renvoyer l’e-mail de vérification » pour recevoir un nouveau lien valide.'
      : isEn
      ? 'If your previous link expired, tap "Resend verification email" to get a brand-new link right away.'
      : 'Si ansyen lyen an ekspire deja, peze « Resend imel verifikasyon » pou resevwa yon nouvo lyen ki valab touswit.',
    step2: isEs
      ? 'Abra su bandeja de entrada (revise también Spam / Correo no deseado) y haga clic en el enlace más reciente.'
      : isFr
      ? 'Ouvrez votre boîte de réception (et vos Spams) puis cliquez sur le lien le plus récent.'
      : isEn
      ? 'Open your inbox (check Spam / Junk too) and click the newest verification link.'
      : 'Louvri bwat imèl ou (verifye Spam / Junk tou) epi klike sou dènye lyen ou resevwa a.',
    step3: isEs
      ? 'Regrese aquí y presione « Ya confirmé mi correo » (o espere unos segundos para la detección automática).'
      : isFr
      ? 'Revenez ici et appuyez sur « J’ai confirmé mon e-mail » (détection automatique active).'
      : isEn
      ? 'Return here and tap "I confirmed my email" — or wait a moment for automatic detection.'
      : 'Retounen isit la epi peze « Mwen fin verifye imèl mwen » (oswa sistèm nan ap detekte l otomatikman).',
    reauthTitle: isEs
      ? 'Inicie sesión con el correo de la iglesia para reenviar un enlace nuevo'
      : isFr
      ? 'Connectez-vous avec l’e-mail de l’église pour renvoyer un nouveau lien'
      : isEn
      ? 'Sign in with the church owner email to resend a fresh link'
      : 'Konekte ak kont imèl legliz la pou revoye yon nouvo lyen verifikasyon',
    reauthHint: isEs
      ? 'Por seguridad de Firebase, necesitamos confirmar su contraseña del propietario para generar un nuevo enlace de verificación.'
      : isFr
      ? 'Par sécurité Firebase, confirmez votre mot de passe propriétaire afin de générer un nouveau lien de vérification.'
      : isEn
      ? 'Firebase requires an active owner sign-in to generate a fresh verification link when an older link or session has expired.'
      : 'Pou sekirite Firebase, antre modpas kont mèt legliz sa a pou nou ka voye yon nouvo lyen verifikasyon fre nan bwat imèl ou touswit.',
    reauthSubmitBtn: isEs
      ? 'Conectar y Reenviar correo de verificación'
      : isFr
      ? 'Connexion & Renvoyer l’e-mail de vérification'
      : isEn
      ? 'Sign in & Resend verification email'
      : 'Konekte & Resend imel verifikasyon',
    forgotPwdBtn: isEs
      ? '¿Olvidó su contraseña? Enviar enlace de restablecimiento'
      : isFr
      ? 'Mot de passe oublié ? Réinitialiser par e-mail'
      : isEn
      ? 'Forgot password? Send password reset email'
      : 'Ou bliye modpas ou? Voye lyen pou chanje modpas',
    primaryBtn: isEs
      ? 'Ya confirmé mi correo — Continuar'
      : isFr
      ? 'J’ai confirmé mon e-mail — Continuer'
      : isEn
      ? 'I confirmed my email — Continue'
      : 'Mwen fin verifye imèl mwen — Kontinye',
    checkingBtn: isEs
      ? 'Verificando estado...'
      : isFr
      ? 'Vérification en cours...'
      : isEn
      ? 'Checking verification...'
      : 'Ap verifye estati a...',
    resendBtn: isEs
      ? 'Reenviar correo de verificación'
      : isFr
      ? 'Renvoyer l’e-mail de vérification'
      : isEn
      ? 'Resend verification email'
      : 'Resend imel verifikasyon',
    resendingBtn: isEs
      ? 'Enviando correo...'
      : isFr
      ? 'Envoi en cours...'
      : isEn
      ? 'Sending email...'
      : 'Ap voye imèl la...',
    skipLaterBtn: isEs
      ? 'Volver al panel ahora (verificaré luego en mi perfil)'
      : isFr
      ? 'Continuer vers le tableau de bord (vérifier plus tard)'
      : isEn
      ? 'Continue to dashboard (verify later from my profile)'
      : 'Kontinye nan Espas Admin (m ap verifye pita nan profil mwen)',
    skipHint: isEs
      ? 'Si entra ahora sin confirmar, siempre verá un botón « Reenviar correo de verificación » en su perfil.'
      : isFr
      ? 'Si vous continuez maintenant, un bouton « Renvoyer l’e-mail de vérification » restera accessible dans votre profil.'
      : isEn
      ? 'If you continue now, a "Resend verification email" button stays visible in your profile until confirmed.'
      : 'Si w kontinye kounye a san w poko konfime, bouton « Resend imel verifikasyon » ap rete parèt nan profil ou jiskaske w konfime l.',
    notVerifiedYet: isEs
      ? 'El correo aún aparece pendiente de confirmación. Abra el enlace más reciente en su bandeja de entrada (o Spam) y vuelva a intentarlo.'
      : isFr
      ? 'L’adresse e-mail n’est pas encore confirmée. Cliquez d’abord sur le lien le plus récent reçu par e-mail (ou Spams), puis réessayez.'
      : isEn
      ? 'Your email is not confirmed yet. Click the newest verification link in your inbox (or Spam folder) first, then try again.'
      : 'Imèl la poko parèt konfime. Louvri dènye lyen ki nan bwat imèl ou a (oswa Spam) dabò, epi peze bouton an ankò.',
    verifiedTitle: isEs
      ? '¡Correo confirmado con éxito!'
      : isFr
      ? 'Adresse e-mail confirmée !'
      : isEn
      ? 'Email confirmed successfully!'
      : 'Adrès imèl ou konfime avèk siksè!',
    verifiedSubtitle: isEs
      ? 'Sincronizando los permisos de su iglesia con la nube...'
      : isFr
      ? 'Synchronisation des permissions de votre église en cours...'
      : isEn
      ? 'Syncing your church permissions with the cloud...'
      : 'Ap senkronize tout pèmisyon legliz ou a ak baz done a...',
    resendSuccessTitle: isEs
      ? 'Nuevo correo de verificación enviado'
      : isFr
      ? 'Nouvel e-mail de vérification envoyé'
      : isEn
      ? 'Fresh verification email sent'
      : 'Nouvo imèl verifikasyon voye ✓',
    resendSuccessDesc: (email: string) =>
      isEs
        ? `Revise la bandeja de entrada (y Spam) de ${email} y use el enlace más reciente.`
        : isFr
        ? `Vérifiez la boîte de réception (et les Spams) de ${email} et utilisez le dernier lien.`
        : isEn
        ? `Check the inbox (and Spam folder) for ${email} and click the newest link.`
        : `Verifye bwat imèl (ak dosye Spam) pou ${email} epi klike sou dènye lyen ki fenk rive a.`,
  };

  // Live 1-second cooldown ticker
  useEffect(() => {
    setCooldownSec(computeResendCooldownRemaining(getVerificationEmailLastSentAt(targetEmail)));
    const timer = window.setInterval(() => {
      setCooldownSec(computeResendCooldownRemaining(getVerificationEmailLastSentAt(targetEmail)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [targetEmail, resendCount]);

  const finalizeVerifiedTransition = useCallback(async () => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    setVerifiedSuccess(true);
    setFeedbackError(null);

    let finalChurch = church;
    try {
      const syncRes = await syncChurchAdminOwnershipWithCloud(church, {
        forceTokenRefresh: true,
        reloadUser: true,
      });
      if (syncRes.synced && syncRes.church) {
        finalChurch = syncRes.church;
        saveChurch(finalChurch);
        clearPendingLocalUpload('church', finalChurch.id);
        const pendingMembers = getMembersByChurch(finalChurch.id).filter((m) =>
          hasPendingLocalUpload('member', m.id)
        );
        for (const pm of pendingMembers) {
          firestoreAddMember(pm)
            .then(() => clearPendingLocalUpload('member', pm.id))
            .catch(() => {});
        }
      }
    } catch {
      // Non-fatal offline sync note; user is verified
    }

    toast.success(
      copy.verifiedTitle,
      isEs
        ? `Bienvenido al panel oficial de ${finalChurch.name}.`
        : isFr
        ? `Bienvenue dans l’espace officiel de ${finalChurch.name}.`
        : isEn
        ? `Welcome to the official workspace for ${finalChurch.name}.`
        : `Byenvini nan espas ofisyèl ${finalChurch.name}.`
    );

    window.setTimeout(() => {
      onVerifiedComplete(finalChurch);
    }, 900);
  }, [church, copy.verifiedTitle, isEn, isEs, isFr, onVerifiedComplete, toast]);

  // React immediately if matching user becomes verified or Super Developer approved adminVerified
  useEffect(() => {
    if ((isEmailVerified && hasMatchingLiveAuth) || church.adminVerified) {
      finalizeVerifiedTransition();
    }
  }, [isEmailVerified, hasMatchingLiveAuth, church.adminVerified, finalizeVerifiedTransition]);

  // Silent auto-detection when user returns from email app / tab
  const silentCheckVerification = useCallback(async () => {
    if (hasCompletedRef.current || !isDeviceOnline() || showReauthPanel) return;
    try {
      const verified = await refreshAuthUserState();
      if (verified) {
        await finalizeVerifiedTransition();
      }
    } catch {
      // ignore transient offline checks
    }
  }, [refreshAuthUserState, finalizeVerifiedTransition, showReauthPanel]);

  useEffect(() => {
    const onFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        silentCheckVerification();
      }
    };
    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onFocusOrVisible);

    const pollInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        silentCheckVerification();
      }
    }, 6000);

    return () => {
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
      window.clearInterval(pollInterval);
    };
  }, [silentCheckVerification]);

  const handleManualCheckVerification = async () => {
    setFeedbackError(null);
    if (showReauthPanel) {
      setFeedbackError(copy.reauthHint);
      return;
    }
    setIsChecking(true);
    try {
      const verified = await refreshAuthUserState();
      if (verified || church.adminVerified) {
        await finalizeVerifiedTransition();
        return;
      }
      setFeedbackError(copy.notVerifiedYet);
    } catch (err: any) {
      setFeedbackError(err?.message || copy.notVerifiedYet);
    } finally {
      setIsChecking(false);
    }
  };

  const handleResendEmail = async () => {
    if (cooldownSec > 0 || isResending) return;
    setFeedbackError(null);
    if (!auth.currentUser || !hasMatchingLiveAuth) {
      setForceReauthMode(true);
      return;
    }
    setIsResending(true);
    try {
      const alreadyVerified = await refreshAuthUserState();
      if (alreadyVerified) {
        await finalizeVerifiedTransition();
        return;
      }
      await resendAdminVerificationEmail();
      recordVerificationEmailSent(targetEmail);
      setResendCount((c) => c + 1);
      setCooldownSec(EMAIL_VERIFICATION_RESEND_COOLDOWN_SEC);
      toast.success(copy.resendSuccessTitle, copy.resendSuccessDesc(targetEmail));
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (
        msg.toLowerCase().includes('requires-recent-login') ||
        msg.toLowerCase().includes('konekte ak kont')
      ) {
        setForceReauthMode(true);
      }
      setFeedbackError(
        msg ||
          (isEn
            ? 'Could not resend verification email right now. Please try again in a minute.'
            : 'Pa ka voye imèl verifikasyon an kounye a. Tanpri tann kèk segonn epi re-eseye.')
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleReauthAndSendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError(null);
    const cleanEmail = (reauthEmail || targetEmail).trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setFeedbackError(
        isEn ? 'Please enter the church owner email address.' : 'Tanpri antre adrès imèl mèt legliz la.'
      );
      return;
    }
    if (!reauthPassword) {
      setFeedbackError(
        isEn ? 'Please enter your admin password.' : 'Tanpri antre modpas kont mèt legliz la.'
      );
      return;
    }
    setIsReauthingAndSending(true);
    try {
      await signInChurchAdminWithEmail(cleanEmail, reauthPassword);
      setReauthPassword('');
      setForceReauthMode(false);
      const alreadyVerified = await refreshAuthUserState();
      if (alreadyVerified) {
        await finalizeVerifiedTransition();
        return;
      }
      await resendAdminVerificationEmail();
      recordVerificationEmailSent(cleanEmail);
      setResendCount((c) => c + 1);
      setCooldownSec(EMAIL_VERIFICATION_RESEND_COOLDOWN_SEC);
      toast.success(copy.resendSuccessTitle, copy.resendSuccessDesc(cleanEmail));
    } catch (err: any) {
      setFeedbackError(
        err?.message ||
          (isEn ? 'Invalid email or password.' : 'Imèl oswa modpas la pa kòrèk.')
      );
    } finally {
      setIsReauthingAndSending(false);
    }
  };

  const handleSendPasswordReset = async () => {
    const cleanEmail = (reauthEmail || targetEmail).trim().toLowerCase();
    if (!cleanEmail) return;
    setIsSendingReset(true);
    setFeedbackError(null);
    try {
      await sendChurchAdminPasswordReset(cleanEmail);
      toast.success(
        isEn ? 'Password reset sent' : 'Lyen modpas voye ✓',
        isEn
          ? `Check ${cleanEmail} to reset your password.`
          : `Verifye bwat imèl ${cleanEmail} pou w chanje modpas ou.`
      );
    } catch (err: any) {
      setFeedbackError(err?.message || 'Pa ka voye imèl re-inisyalizasyon an kounye a.');
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div
      id="admin-email-verification-screen"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-email-verify-headline"
      className="fixed inset-0 z-50 bg-[#0B1120] text-slate-100 overflow-y-auto flex flex-col"
    >
      {/* Top minimal bar */}
      <header className="w-full border-b border-slate-800/90 bg-[#0F172A]/95 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <OmniChurchLogo
              variant="responsive"
              priority
              mobileClassName="h-8 w-8"
              desktopClassName="h-10 w-auto"
            />
            <span className="sm:hidden text-sm font-bold tracking-tight text-white whitespace-nowrap">
              OmniChurch
            </span>
            <span className="px-1.5 py-0.5 rounded bg-[#FBBF24]/15 border border-[#FBBF24]/35 text-[#FBBF24] text-[9px] font-mono font-bold leading-none shrink-0">
              PRO
            </span>
          </div>

          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 min-w-0 truncate">
              <span className="truncate font-medium text-slate-300">{church.name}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums shrink-0">{church.id}</span>
            </div>
            <button
              type="button"
              onClick={onContinueLater}
              aria-label={isEn ? 'Close' : 'Fèmen'}
              className="min-w-[40px] min-h-[40px] rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content area — full responsive 2-column desktop, ergonomic mobile flow */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left column: Hero message & destination email */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-colors ${
                  verifiedSuccess
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                    : 'bg-amber-400/10 border-amber-400/30 text-amber-400'
                }`}
              >
                {verifiedSuccess ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <MailCheck className="w-6 h-6" />
                )}
              </div>
              <p className="text-xs font-semibold text-amber-300 tracking-wide">
                {copy.kicker}
              </p>
            </div>

            <div className="space-y-3">
              <h1
                id="admin-email-verify-headline"
                className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight max-w-xl [text-wrap:balance]"
              >
                {verifiedSuccess ? copy.verifiedTitle : copy.headline}
              </h1>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
                {verifiedSuccess ? copy.verifiedSubtitle : copy.subtitle}
              </p>
            </div>

            {/* Destination Email Highlight */}
            <div className="pt-2 border-t border-slate-800/90 space-y-1.5">
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Inbox className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{copy.sentToLabel}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-mono text-base sm:text-lg font-bold text-white break-all">
                  {targetEmail || '—'}
                </span>
                <span aria-hidden="true" className="text-slate-600 hidden sm:inline">
                  ·
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{church.pastor || church.name}</span>
                </span>
              </div>
            </div>

            {/* Feedback Error */}
            {feedbackError && !verifiedSuccess && (
              <div
                role="alert"
                className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/35 text-rose-200 text-xs sm:text-sm flex items-start gap-3 leading-relaxed"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{feedbackError}</span>
              </div>
            )}
          </div>

          {/* Right column: Single-elevation action & checklist card */}
          <div className="lg:col-span-5">
            <div className="bg-[#1E293B] rounded-3xl border border-slate-700/80 p-6 sm:p-7 shadow-2xl space-y-6">
              {verifiedSuccess ? (
                <div className="py-6 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-white">{copy.verifiedTitle}</h2>
                    <p className="text-xs text-slate-300">{copy.verifiedSubtitle}</p>
                  </div>
                  <div className="flex justify-center pt-1">
                    <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                  </div>
                </div>
              ) : showReauthPanel ? (
                /* Inline re-auth for expired sessions / PIN logins / late verification */
                <form onSubmit={handleReauthAndSendVerification} className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-amber-300 text-sm font-bold">
                      <Lock className="w-4 h-4 shrink-0" />
                      <h2>{copy.reauthTitle}</h2>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{copy.reauthHint}</p>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300 block">
                        {copy.sentToLabel}
                      </label>
                      <input
                        type="email"
                        required
                        value={reauthEmail}
                        onChange={(e) => setReauthEmail(e.target.value)}
                        className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300 block">
                        {isEs ? 'Contraseña del propietario' : isFr ? 'Mot de passe propriétaire' : isEn ? 'Owner password' : 'Modpas mèt legliz la'}
                      </label>
                      <div className="relative">
                        <input
                          type={showReauthPassword ? 'text' : 'password'}
                          required
                          autoFocus
                          value={reauthPassword}
                          onChange={(e) => setReauthPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full min-h-[44px] pl-3.5 pr-11 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowReauthPassword((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-white cursor-pointer"
                          aria-label={showReauthPassword ? 'Hide password' : 'Show password'}
                        >
                          {showReauthPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="btn-verify-screen-reauth-resend"
                    disabled={isReauthingAndSending}
                    className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-60 whitespace-nowrap"
                  >
                    {isReauthingAndSending ? (
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    ) : (
                      <Mail className="w-4 h-4 shrink-0" />
                    )}
                    <span className="truncate">
                      {isReauthingAndSending ? copy.resendingBtn : copy.reauthSubmitBtn}
                    </span>
                  </button>

                  <div className="flex flex-col items-center gap-2 pt-2 border-t border-slate-700/60">
                    <button
                      type="button"
                      disabled={isSendingReset}
                      onClick={handleSendPasswordReset}
                      className="text-xs text-amber-300 hover:text-amber-200 underline font-medium cursor-pointer disabled:opacity-50"
                    >
                      {isSendingReset ? copy.resendingBtn : copy.forgotPwdBtn}
                    </button>
                    <button
                      type="button"
                      onClick={onContinueLater}
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/70 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span className="truncate">{copy.skipLaterBtn}</span>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {/* 3 Editorial Steps */}
                  <div className="space-y-4">
                    <h2 className="text-sm font-bold text-white">{copy.stepsHeading}</h2>
                    <ol className="space-y-3.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
                      <li className="flex items-start gap-3">
                        <span className="font-mono tabular-nums text-xs font-bold text-amber-400 mt-0.5 shrink-0">
                          01.
                        </span>
                        <span>{copy.step1}</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="font-mono tabular-nums text-xs font-bold text-amber-400 mt-0.5 shrink-0">
                          02.
                        </span>
                        <span>{copy.step2}</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="font-mono tabular-nums text-xs font-bold text-amber-400 mt-0.5 shrink-0">
                          03.
                        </span>
                        <span>{copy.step3}</span>
                      </li>
                    </ol>
                  </div>

                  {/* Primary & Secondary Actions */}
                  <div className="pt-4 border-t border-slate-700/80 space-y-3">
                    <button
                      type="button"
                      id="btn-verify-screen-confirm-check"
                      disabled={isChecking}
                      onClick={handleManualCheckVerification}
                      className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-60 whitespace-nowrap"
                    >
                      {isChecking ? (
                        <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      )}
                      <span className="truncate">
                        {isChecking ? copy.checkingBtn : copy.primaryBtn}
                      </span>
                    </button>

                    <button
                      type="button"
                      id="btn-verify-screen-resend-email"
                      disabled={isResending || cooldownSec > 0}
                      onClick={handleResendEmail}
                      className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-100 border border-slate-700 hover:border-amber-400/50 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {isResending ? (
                        <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
                      ) : (
                        <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                      <span className="truncate tabular-nums">
                        {isResending
                          ? copy.resendingBtn
                          : cooldownSec > 0
                          ? `${copy.resendBtn} (${cooldownSec}s)`
                          : copy.resendBtn}
                      </span>
                    </button>
                  </div>

                  {/* Non-blocking escape hatch */}
                  <div className="pt-3 border-t border-slate-700/60 space-y-2 text-center">
                    <button
                      type="button"
                      id="btn-verify-screen-continue-later"
                      onClick={onContinueLater}
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/70 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span className="truncate">{copy.skipLaterBtn}</span>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                    </button>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {copy.skipHint}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminEmailVerificationScreen;
