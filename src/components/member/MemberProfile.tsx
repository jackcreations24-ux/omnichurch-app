import React, { useState, useEffect } from 'react';
import { Church, Member, AttendanceRecord } from '../../types';
import { DigitalIdCard } from '../DigitalIdCard';
import { ProfilePhotoCaptureModal } from '../common/ProfilePhotoCaptureModal';
import { updateMember } from '../../utils/storage';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  checkBiometricSupport,
  isBiometricEnabledForMember,
  registerMemberBiometrics,
  removeBiometricRecord,
} from '../../utils/biometrics';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Building2,
  Shield,
  MapPin,
  Save,
  Check,
  QrCode,
  Lock,
  CheckCircle2,
  Link,
  LogOut,
  Info,
  Fingerprint,
  ScanFace,
  ShieldCheck,
  Cake,
  KeyRound,
  Eye,
  EyeOff,
  ShieldAlert,
  HelpCircle,
  FileText,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ChurchTermsModal } from '../common/ChurchTermsModal';

interface MemberProfileProps {
  church: Church;
  member: Member;
  onMemberUpdated: (updated: Member) => void;
  attendance?: AttendanceRecord[];
  language?: string;
}

export const MemberProfile: React.FC<MemberProfileProps> = ({
  church,
  member,
  onMemberUpdated,
  language = 'ht',
}) => {
  const toast = useToast();
  const isEs = language === 'es';
  const isEn = language === 'en';
  const isFr = language === 'fr';

  const {
    googleUser,
    signInWithGoogle,
    linkMemberGoogleAccount,
    unlinkMemberGoogleAccount,
  } = useAuth();
  const [isLinkingGoogle, setIsLinkingGoogle] = useState<boolean>(false);

  // Dedicated PIN Management State
  const [isChangingPin, setIsChangingPin] = useState<boolean>(false);
  const [currentPinInput, setCurrentPinInput] = useState<string>('');
  const [newPinInput, setNewPinInput] = useState<string>('');
  const [confirmPinInput, setConfirmPinInput] = useState<string>('');
  const [showPinSecrets, setShowPinSecrets] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [isSavingPin, setIsSavingPin] = useState<boolean>(false);
  const [showCurrentPinValue, setShowCurrentPinValue] = useState<boolean>(false);

  // Biometrics State
  const [isBioSupported, setIsBioSupported] = useState<boolean>(false);
  const [isBioEnabled, setIsBioEnabled] = useState<boolean>(false);
  const [isBioRegistering, setIsBioRegistering] = useState<boolean>(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState<boolean>(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState<boolean>(false);

  // Check if today is the member's birthday
  const isBirthdayToday = React.useMemo(() => {
    if (!member?.dateOfBirth) return false;
    try {
      const today = new Date();
      const currentMonth = today.getMonth() + 1; // 1-12
      const currentDay = today.getDate(); // 1-31

      const parts = member.dateOfBirth.split(/[-/]/);
      if (parts.length >= 3) {
        const birthMonth = parseInt(parts[1], 10);
        const birthDay = parseInt(parts[2], 10);
        return birthMonth === currentMonth && birthDay === currentDay;
      }
    } catch {
      return false;
    }
    return false;
  }, [member?.dateOfBirth]);

  const memberAge = React.useMemo(() => {
    if (!member?.dateOfBirth) return null;
    try {
      const birth = new Date(member.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age > 0 ? age : null;
    } catch {
      return null;
    }
  }, [member?.dateOfBirth]);

  useEffect(() => {
    checkBiometricSupport().then((support) => {
      setIsBioSupported(support.isSupported);
    });
    const enabled = isBiometricEnabledForMember(church.id, member.memberId);
    setIsBioEnabled(enabled);
  }, [church.id, member.memberId]);

  const handleEnableBiometrics = async () => {
    setIsBioRegistering(true);
    try {
      const res = await registerMemberBiometrics(church.id, member.memberId, member.fullName);
      if (res.success) {
        setIsBioEnabled(true);
        toast.success(
          isEs ? '¡Biometría Activada!' : isEn ? 'Biometrics Enabled!' : isFr ? 'Biométrie Activée !' : 'Biometri Aktive!',
          isEs
            ? 'Face ID / Huella Digital registrada para este dispositivo. Ahora puede iniciar sesión con 1 toque.'
            : isEn
            ? 'Face ID / Fingerprint registered for this device. You can now login with 1 tap.'
            : isFr
            ? 'Face ID / Empreinte enregistrée pour cet appareil. Vous pouvez vous connecter en 1 clic.'
            : 'Face ID / Anprent ou anrejistre pou aparèy sa a. Ou ka konekte ak 1 klike kounye a.'
        );
      } else {
        toast.error(
          isEs ? 'Error de Biometría' : isEn ? 'Biometrics Error' : isFr ? 'Erreur Biométrie' : 'Erè Biometri',
          res.error || (isEs ? 'No se pudo registrar la biometría.' : 'Pa ka anrejistre biometri.')
        );
      }
    } catch (err: any) {
      toast.error(
        isEs ? 'Error' : isEn ? 'Error' : isFr ? 'Erreur' : 'Erè',
        err?.message || (isEs ? 'Ocurrió un error al registrar.' : 'Erè pandan anrejistreman an.')
      );
    } finally {
      setIsBioRegistering(false);
    }
  };

  const handleDisableBiometrics = () => {
    removeBiometricRecord(church.id, member.memberId);
    setIsBioEnabled(false);
    toast.info(
      isEs ? 'Biometría Desactivada' : isEn ? 'Biometrics Disabled' : isFr ? 'Biométrie Désactivée' : 'Biometri Dezaktive',
      isEs
        ? 'Su Face ID / Huella Digital fue removida de este dispositivo.'
        : isEn
        ? 'Fingerprint / Face ID was removed from this device.'
        : isFr
        ? 'Votre empreinte / Face ID a été retirée pour cet appareil.'
        : 'Anprent / Face ID ou retire pou aparèy sa a.'
    );
  };

  const handleLinkGoogle = async () => {
    setIsLinkingGoogle(true);
    try {
      let gUser = googleUser;
      if (!gUser) {
        gUser = await signInWithGoogle();
      }

      if (gUser && gUser.email) {
        linkMemberGoogleAccount(church.id, member.memberId, gUser);
        const updated: Member = {
          ...member,
          googleEmail: gUser.email.toLowerCase(),
          googleUid: gUser.uid,
          googlePhoto: gUser.photoURL || member.avatarUrl,
        };
        onMemberUpdated(updated);
        toast.success(
          isEs ? '¡Cuenta de Google Vinculada!' : isEn ? 'Google Account Linked!' : isFr ? 'Compte Google Lié !' : 'Kont Google Lye!',
          isEs
            ? `Cuenta "${gUser.email}" vinculada al ID ${member.memberId}. Ahora puede iniciar sesión con 1 clic.`
            : isEn
            ? `Account "${gUser.email}" linked to ID ${member.memberId}. You can now sign in with 1 click.`
            : isFr
            ? `Compte "${gUser.email}" lié avec l’ID ${member.memberId}. Vous pouvez vous connecter en 1 clic.`
            : `Kont "${gUser.email}" lye avèk ID ${member.memberId}. Ou ka konekte ak 1 klik kounye a.`
        );
      }
    } catch (err: any) {
      toast.error(
        isEs ? 'Error de Google' : isEn ? 'Google Error' : isFr ? 'Erreur Google' : 'Erè Google',
        err?.message || (isEs ? 'No se pudo vincular la cuenta de Google.' : 'Pa ka lye kont Google.')
      );
    } finally {
      setIsLinkingGoogle(false);
    }
  };

  const handleUnlinkGoogle = () => {
    unlinkMemberGoogleAccount(church.id, member.memberId);
    const updated: Member = {
      ...member,
      googleEmail: undefined,
      googleUid: undefined,
      googlePhoto: undefined,
    };
    onMemberUpdated(updated);
    toast.info(
      isEs ? 'Vinculación Removida' : isEn ? 'Unlinked' : isFr ? 'Liaison Supprimée' : 'Lyezon Retire',
      isEs
        ? 'La cuenta de Google ya no está asociada a este perfil de miembro.'
        : isEn
        ? 'Google account is no longer associated with this profile.'
        : isFr
        ? 'Le compte Google n’est plus associé à ce profil.'
        : 'Kont Google la pa asosye ak pwofil sa a ankò.'
    );
  };

  const handleCancelChangePin = () => {
    setIsChangingPin(false);
    setCurrentPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
    setPinError(null);
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);

    const cleanCurrent = currentPinInput.trim();
    const cleanNew = newPinInput.trim();
    const cleanConfirm = confirmPinInput.trim();
    const expectedCurrent = (member.pin || '').trim();

    // Verify current PIN if member already set one
    if (expectedCurrent && cleanCurrent !== expectedCurrent) {
      setPinError(
        isEs
          ? 'El código PIN actual no es correcto. Por favor verifíquelo.'
          : isEn
          ? 'Current PIN code is incorrect. Please verify your current PIN.'
          : isFr
          ? 'Le code PIN actuel est incorrect. Veuillez vérifier votre code.'
          : 'Kòd PIN aktyèl la pa kòrèk. Tanpri verifye kòd PIN ou genyen an.'
      );
      return;
    }

    // Validation on new PIN
    if (!cleanNew) {
      setPinError(
        isEs
          ? 'Por favor ingrese un nuevo código PIN.'
          : isEn
          ? 'Please enter a new PIN code.'
          : isFr
          ? 'Veuillez entrer un nouveau code PIN.'
          : 'Tanpri antre yon nouvo kòd PIN.'
      );
      return;
    }

    if (cleanNew.length < 4 || cleanNew.length > 8) {
      setPinError(
        isEs
          ? 'El código PIN debe tener entre 4 y 8 dígitos (o caracteres).'
          : isEn
          ? 'PIN code must be between 4 and 8 digits/characters.'
          : isFr
          ? 'Le code PIN doit comporter entre 4 et 8 chiffres (ou caractères).'
          : 'Kòd PIN an dwe gen ant 4 ak 8 chif (oswa karaktè).'
      );
      return;
    }

    if (cleanNew !== cleanConfirm) {
      setPinError(
        isEs
          ? 'El nuevo código PIN y la confirmación no coinciden.'
          : isEn
          ? 'New PIN and confirmation PIN do not match.'
          : isFr
          ? 'Le nouveau code PIN et la confirmation ne correspondent pas.'
          : 'Nouvo kòd PIN an ak konfimasyon an pa koresponn.'
      );
      return;
    }

    setIsSavingPin(true);
    try {
      const updated: Member = {
        ...member,
        pin: cleanNew,
      };
      updateMember(church.id, updated);
      onMemberUpdated(updated);
      setIsChangingPin(false);
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      setPinError(null);

      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }

      toast.success(
        isEs ? '¡Código PIN Actualizado!' : isEn ? 'Personal PIN Updated!' : isFr ? 'Code PIN Mis à Jour !' : 'Kòd PIN Pèsonèl Mete Ajou!',
        isEs
          ? `Su nuevo código PIN se guardó con éxito para "${member.fullName}".`
          : isEn
          ? `Your new PIN code was successfully saved for "${member.fullName}".`
          : isFr
          ? `Votre nouveau code PIN a été enregistré avec succès pour "${member.fullName}".`
          : `Nouvo kòd PIN ou anrejistre avèk siksè pou kont "${member.fullName}".`
      );
    } catch (err: any) {
      setPinError(
        err?.message ||
          (isEs
            ? 'Error al guardar el código PIN.'
            : isEn
            ? 'Error saving PIN code.'
            : isFr
            ? 'Erreur lors de l’enregistrement du code PIN.'
            : 'Erè pandan anrejistreman kòd PIN la.')
      );
    } finally {
      setIsSavingPin(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            {isEs
              ? 'Perfil Personal de Miembro'
              : isEn
              ? 'Personal Member Profile'
              : isFr
              ? 'Profil Personnel du Membre'
              : 'Pwofil Pèsonèl Manm nan'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            {isEs
              ? `Su información personal e identificación oficial en ${church.name}.`
              : isEn
              ? `Your personal details and official identity records at ${church.name}.`
              : isFr
              ? `Vos informations personnelles et identifiants officiels à ${church.name}.`
              : `Enfòmasyon pèsonèl ou ak idantifyan ofisyèl nan ${church.name}.`}
          </p>
        </div>
        <div className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            {isEs
              ? 'Espacio Privado y Seguro'
              : isEn
              ? 'Private & Secure Space'
              : isFr
              ? 'Espace Privé & Sécurisé'
              : 'Espas Prive & Sekirize'}
          </span>
        </div>
      </div>

      {/* BIRTHDAY CELEBRATION BANNER */}
      {isBirthdayToday && (
        <div
          id="member-birthday-banner"
          className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-rose-500/15 to-purple-500/20 border-2 border-amber-400/60 text-white shadow-xl shadow-amber-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 font-black shadow-lg shadow-amber-400/30 flex items-center justify-center shrink-0">
              <Cake className="w-7 h-7 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-amber-300 flex items-center gap-1.5">
                  <span>
                    {isEs
                      ? `¡Feliz Cumpleaños, ${member.fullName}!`
                      : isEn
                      ? `Happy Birthday, ${member.fullName}!`
                      : isFr
                      ? `Joyeux Anniversaire, ${member.fullName} !`
                      : `Jwaye Anivèsè Nesans, ${member.fullName}!`}
                  </span>
                  <span className="text-xl">🎂</span>
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 mt-0.5 leading-relaxed">
                {isEs
                  ? `¡Toda la familia de ${church.name} celebra contigo hoy! Recibe nuestras oraciones, felicitaciones y bendiciones de Dios por un año más de vida.`
                  : isEn
                  ? `The entire ${church.name} family celebrates with you today! Receive prayers, congratulations and God's abundant blessings for another fruitful year.`
                  : isFr
                  ? `Toute la famille de ${church.name} célèbre avec vous aujourd'hui ! Recevez nos prières, félicitations et bénédictions de Dieu.`
                  : `Tout fanmi ${church.name} la ap fete avèk ou jodi a! Resevwa lapriyè, felisitasyon ak benediksyon Bondye pou yon lòt ane anplis.`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-bold shrink-0 self-end sm:self-auto">
            <span>
              {isEs ? 'Felicitaciones de la Iglesia 🎉' : isEn ? 'Church Wishes 🎉' : isFr ? 'Vœux de l’Église 🎉' : 'Felisitasyon Legliz la 🎉'}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: DIGITAL CARD PREVIEW & GOOGLE ACCOUNT */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#1E293B] p-4 rounded-2xl border border-slate-700/80">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-amber-400" />
              {isEs
                ? 'Carnet Oficial de Miembro'
                : isEn
                ? 'Official Member ID Card'
                : isFr
                ? 'Carte Officielle de Membre'
                : 'Kat Manm Ofisyèl'}
            </h4>
            <DigitalIdCard
              member={member}
              church={church}
              compact={true}
              language={language}
              onEditPhoto={() => setIsPhotoModalOpen(true)}
            />
          </div>

          {/* DEDICATED PERSONAL PIN SECURITY CARD */}
          <div
            id="member-pin-security-card"
            className="bg-[#1E293B] p-4 rounded-2xl border border-slate-700/80 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {isEs ? 'Código PIN de Seguridad' : isEn ? 'Security PIN Code' : isFr ? 'Code PIN de Sécurité' : 'Kòd PIN Sekirite'}
                </span>
              </h4>
              {member.pin ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>
                    {isEs ? 'PIN Personalizado' : isEn ? 'Custom PIN' : isFr ? 'PIN Personnalisé' : 'PIN Pèsonalize'}
                  </span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                  {isEs ? 'PIN por Defecto' : isEn ? 'Default PIN' : isFr ? 'PIN par Défaut' : 'PIN Pa Defo'}
                </span>
              )}
            </div>

            {!isChangingPin ? (
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-700/80 text-xs space-y-3">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {isEs
                    ? <>Este código de seguridad le permite iniciar sesión en su espacio de miembro en cualquier dispositivo con su ID (<strong className="text-amber-400 font-mono">{member.memberId}</strong>).</>
                    : isEn
                    ? <>This security code allows you to sign in to your member portal on any device with your ID (<strong className="text-amber-400 font-mono">{member.memberId}</strong>).</>
                    : isFr
                    ? <>Ce code de sécurité vous permet de vous connecter à l’espace membre sur tout appareil avec votre ID (<strong className="text-amber-400 font-mono">{member.memberId}</strong>).</>
                    : <>Kòd sekirite sa a pèmèt ou konekte nan espas manm nan sou nenpòt aparèy avèk ID ou (<strong className="text-amber-400 font-mono">{member.memberId}</strong>).</>}
                </p>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      {isEs ? 'Su Código PIN Actual:' : isEn ? 'Your Current PIN:' : isFr ? 'Votre Code PIN Actuel :' : 'Kòd PIN Ou Kounye a:'}
                    </span>
                    <div className="font-mono font-bold text-sm tracking-widest text-amber-400">
                      {showCurrentPinValue
                        ? (member.pin || (isEs ? 'No configurado' : isEn ? 'Not configured' : isFr ? 'Non configuré' : 'Poko defini'))
                        : '••••••••'}
                    </div>
                  </div>
                  <button
                    type="button"
                    id="btn-toggle-show-current-pin"
                    onClick={() => setShowCurrentPinValue(!showCurrentPinValue)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
                    title={showCurrentPinValue ? (isEs ? 'Ocultar PIN' : 'Kache PIN') : (isEs ? 'Mostrar PIN' : 'Montre PIN')}
                  >
                    {showCurrentPinValue ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  id="btn-open-change-pin-form"
                  onClick={() => {
                    setIsChangingPin(true);
                    setPinError(null);
                    setCurrentPinInput('');
                    setNewPinInput('');
                    setConfirmPinInput('');
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {member.pin
                      ? isEs ? 'Cambiar Mi Código PIN' : isEn ? 'Change My PIN' : isFr ? 'Changer Mon PIN' : 'Chanje Kòd PIN Mwen'
                      : isEs ? 'Definir un Nuevo Código PIN' : isEn ? 'Set a New PIN' : isFr ? 'Définir un Nouveau PIN' : 'Defini yon Nouvo Kòd PIN'}
                  </span>
                </button>
              </div>
            ) : (
              <form
                id="form-change-member-pin"
                onSubmit={handleSavePin}
                className="p-3 bg-slate-900 rounded-xl border border-amber-400/40 text-xs space-y-3 shadow-inner"
              >
                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                  <span className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isEs ? 'Establecer / Cambiar Código PIN' : isEn ? 'Set / Change PIN' : isFr ? 'Définir / Changer Code PIN' : 'Mete / Chanje Kòd PIN'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCancelChangePin}
                    className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    {isEs ? 'Cancelar' : isEn ? 'Cancel' : isFr ? 'Annuler' : 'Anile'}
                  </button>
                </div>

                {pinError && (
                  <div
                    id="member-pin-error-box"
                    className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px] font-semibold flex items-start gap-1.5"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{pinError}</span>
                  </div>
                )}

                {/* Current PIN (if already set) */}
                {member.pin && (
                  <div className="space-y-1">
                    <label
                      htmlFor="input-current-pin"
                      className="text-slate-300 font-bold text-[11px] block"
                    >
                      {isEs ? 'Código PIN Actual *' : isEn ? 'Current PIN Code *' : isFr ? 'Code PIN Actuel *' : 'Kòd PIN Aktyèl *'}
                    </label>
                    <input
                      id="input-current-pin"
                      type={showPinSecrets ? 'text' : 'password'}
                      value={currentPinInput}
                      onChange={(e) => setCurrentPinInput(e.target.value)}
                      placeholder={isEs ? 'Ingrese su PIN anterior' : 'Antre ansyen kòd PIN la'}
                      maxLength={8}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                )}

                {/* New PIN */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="input-new-pin"
                      className="text-slate-300 font-bold text-[11px]"
                    >
                      {isEs
                        ? 'Nuevo Código PIN (4 a 8 dígitos) *'
                        : isEn
                        ? 'New PIN (4 to 8 digits) *'
                        : isFr
                        ? 'Nouveau Code PIN (4 à 8 chiffres) *'
                        : 'Nouvo Kòd PIN (4 a 8 chif) *'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPinSecrets(!showPinSecrets)}
                      className="text-[10px] text-slate-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                    >
                      {showPinSecrets ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>
                        {showPinSecrets
                          ? isEs ? 'Ocultar' : isEn ? 'Hide' : isFr ? 'Cacher' : 'Kache'
                          : isEs ? 'Mostrar' : isEn ? 'Show' : isFr ? 'Afficher' : 'Montre'}
                      </span>
                    </button>
                  </div>
                  <input
                    id="input-new-pin"
                    type={showPinSecrets ? 'text' : 'password'}
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value)}
                    placeholder={isEs ? 'Ej: 5829' : 'Egz: 5829'}
                    maxLength={8}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>

                {/* Confirm New PIN */}
                <div className="space-y-1">
                  <label
                    htmlFor="input-confirm-pin"
                    className="text-slate-300 font-bold text-[11px] block"
                  >
                    {isEs
                      ? 'Confirmar Nuevo Código PIN *'
                      : isEn
                      ? 'Confirm New PIN Code *'
                      : isFr
                      ? 'Confirmer le Nouveau Code PIN *'
                      : 'Konfime Nouvo Kòd PIN *'}
                  </label>
                  <input
                    id="input-confirm-pin"
                    type={showPinSecrets ? 'text' : 'password'}
                    value={confirmPinInput}
                    onChange={(e) => setConfirmPinInput(e.target.value)}
                    placeholder={isEs ? 'Vuelva a escribir el nuevo PIN' : 'Tape nouvo kòd PIN an ankò'}
                    maxLength={8}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="pt-1 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCancelChangePin}
                    className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    {isEs ? 'Cancelar' : isEn ? 'Cancel' : isFr ? 'Annuler' : 'Anile'}
                  </button>
                  <button
                    type="submit"
                    id="btn-submit-save-pin"
                    disabled={isSavingPin}
                    className="px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow disabled:opacity-50"
                  >
                    {isSavingPin ? (
                      <span>{isEs ? 'Guardando...' : isEn ? 'Saving...' : isFr ? 'Enregistrement...' : 'Anrejistreman...'}</span>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>{isEs ? 'Guardar PIN' : isEn ? 'Save PIN' : isFr ? 'Enregistrer PIN' : 'Anrejistre PIN'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* GOOGLE ACCOUNT LINKING CARD FOR MEMBER */}
          <div className="bg-[#1E293B] p-4 rounded-2xl border border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
                <span>{isEs ? 'Cuenta de Google Vinculada' : isEn ? 'Linked Google Account' : isFr ? 'Compte Google Lié' : 'Kont Google Lye'}</span>
              </h4>
              {member.googleEmail ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{isEs ? 'Verificada' : isEn ? 'Verified' : isFr ? 'Vérifié' : 'Verifye'}</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                  {isEs ? 'No Vinculada' : isEn ? 'Not Linked' : isFr ? 'Non Lié' : 'Poko Lye'}
                </span>
              )}
            </div>

            {member.googleEmail ? (
              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-700/80 text-xs space-y-2">
                <div className="text-white font-mono font-bold truncate">
                  {member.googleEmail}
                </div>
                <p className="text-[11px] text-slate-400">
                  {isEs
                    ? 'Puede usar el botón de Google en el inicio de sesión para entrar directamente sin escribir su PIN.'
                    : isEn
                    ? 'You can use the Google button on login screen to sign in directly without typing your PIN.'
                    : isFr
                    ? 'Vous pouvez utiliser le bouton Google sur la page de connexion pour entrer sans taper votre PIN.'
                    : 'Ou ka itilize bouton Google la sou paj koneksyon an pou w antre dirèkteman san w pa tape PIN ou.'}
                </p>
                <button
                  type="button"
                  onClick={handleUnlinkGoogle}
                  className="text-[11px] text-rose-400 hover:text-rose-300 underline font-semibold cursor-pointer"
                >
                  {isEs ? 'Desvincular esta Cuenta de Google' : isEn ? 'Unlink this Google Account' : isFr ? 'Déconnecter ce Compte Google' : 'Dekonekte Kont Google Sa a'}
                </button>
              </div>
            ) : (
              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-700/80 text-xs space-y-2">
                <p className="text-[11px] text-slate-400">
                  {isEs
                    ? 'Vincule su cuenta de Google con su ID de miembro para iniciar sesión rápidamente con 1 clic en cualquier dispositivo.'
                    : isEn
                    ? 'Link your Google account to your Member ID for instant 1-click login on any device.'
                    : isFr
                    ? 'Liez votre compte Google à cet ID membre pour une connexion en 1 clic sur tout appareil.'
                    : 'Lye kont Google ou ak ID Manm sa a pou koneksyon 1-klik rapid sou nenpòt aparèy.'}
                </p>
                <button
                  type="button"
                  id="btn-link-google-member-profile"
                  disabled={isLinkingGoogle}
                  onClick={handleLinkGoogle}
                  className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow disabled:opacity-50"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
                  <span>
                    {isEs
                      ? 'Vincular con Mi Cuenta de Google'
                      : isEn
                      ? 'Link with My Google Account'
                      : isFr
                      ? 'Lier à Mon Compte Google'
                      : 'Lye ak Kont Google Mwen'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* BIOMETRIC AUTHENTICATION CARD (FACE ID / FINGERPRINT) */}
          <div className="bg-[#1E293B] p-4 rounded-2xl border border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <ScanFace className="w-4 h-4 text-emerald-400" />
                <span>
                  {isEs
                    ? 'Biometría (Face ID / Huella)'
                    : isEn
                    ? 'Biometrics (Face ID / Fingerprint)'
                    : isFr
                    ? 'Biométrie (Face ID / Empreinte)'
                    : 'Biometri (Face ID / Anprent)'}
                </span>
              </h4>
              {isBioEnabled ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>
                    {isEs
                      ? 'Activo en este Dispositivo'
                      : isEn
                      ? 'Active on this Device'
                      : isFr
                      ? 'Activé sur cet Appareil'
                      : 'Aktive sou Aparèy Sa a'}
                  </span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold">
                  {isEs ? 'Desactivado' : isEn ? 'Disabled' : isFr ? 'Désactivé' : 'Dezaktive'}
                </span>
              )}
            </div>

            <div className="p-3 bg-slate-900 rounded-xl border border-slate-700/80 text-xs space-y-2.5">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {isEs
                  ? <>Le permite iniciar sesión en su espacio de miembro en este teléfono o computadora con <strong>Face ID</strong>, <strong>Touch ID</strong> o <strong>Huella Digital</strong> sin tener que escribir su PIN.</>
                  : isEn
                  ? <>Allows you to log in to your member portal on this device with <strong>Face ID</strong>, <strong>Touch ID</strong>, or <strong>Fingerprint</strong> without typing your PIN.</>
                  : isFr
                  ? <>Vous permet de vous connecter à votre espace membre sur cet appareil avec <strong>Face ID</strong> ou <strong>Empreinte</strong> sans taper votre code PIN.</>
                  : <>Pèmèt ou konekte nan espas manm nan sou telefòn oswa òdinatè sa a avèk <strong>Face ID</strong>, <strong>Touch ID</strong>, oswa <strong>Anprent Dijital</strong> san ou pa bezwen tape PIN ou.</>}
              </p>

              {isBioSupported ? (
                isBioEnabled ? (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        {isEs
                          ? 'Este dispositivo está configurado para acceso biométrico rápido.'
                          : isEn
                          ? 'This device is configured for fast biometric login.'
                          : isFr
                          ? 'Cet appareil est configuré pour une connexion biométrique rapide.'
                          : 'Aparèy sa a konfigire pou koneksyon byometrik rapid.'}
                      </span>
                    </div>
                    <button
                      type="button"
                      id="btn-disable-biometrics"
                      onClick={handleDisableBiometrics}
                      className="text-[11px] text-rose-400 hover:text-rose-300 underline font-semibold cursor-pointer block"
                    >
                      {isEs
                        ? 'Desactivar Biometría en este Dispositivo'
                        : isEn
                        ? 'Disable Biometrics on this Device'
                        : isFr
                        ? 'Désactiver la Biométrie sur cet Appareil'
                        : 'Dezaktive Biometri sou Aparèy Sa a'}
                    </button>
                  </div>
                ) : (
                  <div className="pt-1">
                    <button
                      type="button"
                      id="btn-enable-biometrics"
                      disabled={isBioRegistering}
                      onClick={handleEnableBiometrics}
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                    >
                      {isBioRegistering ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Fingerprint className="w-4 h-4" />
                          <span>
                            {isEs
                              ? 'Activar Face ID / Huella'
                              : isEn
                              ? 'Enable Face ID / Fingerprint'
                              : isFr
                              ? 'Activer Face ID / Empreinte'
                              : 'Aktive Face ID / Anprent'}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                )
              ) : (
                <div className="p-2 bg-slate-950/60 rounded-lg text-[10px] text-slate-500 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span>
                    {isEs
                      ? 'Este navegador o dispositivo no tiene soporte biométrico WebAuthn disponible.'
                      : isEn
                      ? 'This browser or device does not support WebAuthn biometrics.'
                      : isFr
                      ? 'Ce navigateur ou appareil ne prend pas en charge la biométrie WebAuthn.'
                      : 'Navigatè oswa aparèy sa a pa gen sipò byometrik WebAuthn ki disponib.'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: PERSONAL DETAILS (OFFICIAL RECORD) */}
        <div className="lg:col-span-7 bg-[#1E293B] rounded-2xl border border-slate-700/80 p-5 sm:p-6 shadow-sm space-y-5 text-slate-200">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <User className="w-5 h-5 text-amber-400" />
              {isEs ? 'Información General' : isEn ? 'General Information' : isFr ? 'Informations Générales' : 'Enfòmasyon Jeneral'}
            </h3>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-400 text-[11px] font-medium">
              <Lock className="w-3 h-3 text-slate-500" />
              <span>
                {isEs ? 'Registro Oficial Protegido' : isEn ? 'Protected Official Record' : isFr ? 'Dossier Officiel Protégé' : 'Dosye Ofisyèl Pwoteje'}
              </span>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            {/* Non konplè (Locked) */}
            <div>
              <label className="text-slate-400 font-medium block mb-1 flex items-center justify-between">
                <span>{isEs ? 'Nombre Completo' : isEn ? 'Full Name' : isFr ? 'Nom Complet' : 'Non Konplè'}</span>
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> {isEs ? 'Gestionado por la iglesia' : isEn ? 'Managed by church' : isFr ? 'Géré par l’église' : 'Jere pa legliz la'}
                </span>
              </label>
              <input
                type="text"
                disabled
                value={member.fullName}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold cursor-not-allowed"
              />
            </div>

            {/* Member ID (Locked) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 font-medium block mb-1 flex items-center justify-between">
                  <span>Member ID</span>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> {isEs ? 'Único' : isEn ? 'Unique' : isFr ? 'Unique' : 'Inik'}
                  </span>
                </label>
                <input
                  type="text"
                  disabled
                  value={member.memberId}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-amber-400 font-mono font-bold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-slate-400 font-medium block mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    {isEs ? 'Fecha de Nacimiento' : isEn ? 'Date of Birth' : isFr ? 'Date de Naissance' : 'Dat Nesans'}
                  </span>
                  {isBirthdayToday ? (
                    <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/40 animate-pulse">
                      <Cake className="w-3 h-3 text-amber-400" />
                      <span>{isEs ? '¡Cumpleaños Hoy! 🎂' : isEn ? 'Birthday Today! 🎂' : isFr ? 'Anniversaire Aujourd’hui ! 🎂' : 'Anivèsè Jodi a! 🎂'}</span>
                    </span>
                  ) : memberAge !== null ? (
                    <span className="text-[10px] text-slate-400 font-mono">
                      ({memberAge} {isEs ? 'años' : isEn ? 'years' : isFr ? 'ans' : 'lane'})
                    </span>
                  ) : null}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    disabled
                    value={member.dateOfBirth || (isEs ? 'No especificada' : isEn ? 'Not specified' : isFr ? 'Non mentionnée' : 'Pa mansyone')}
                    className={`w-full px-3 py-2 rounded-lg bg-slate-900 border cursor-not-allowed ${
                      isBirthdayToday
                        ? 'border-amber-400/80 text-amber-300 ring-1 ring-amber-400/40 font-bold'
                        : 'border-slate-700 text-slate-300 font-medium'
                    }`}
                  />
                  {isBirthdayToday && (
                    <div className="absolute right-3 top-2.5 flex items-center text-amber-400">
                      <Cake className="w-4 h-4 text-amber-400 animate-bounce" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Department & Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 font-medium block mb-1">
                  {isEs ? 'Departamento / Ministerio' : isEn ? 'Department / Ministry' : isFr ? 'Département / Ministère' : 'Depatman / Ministè'}
                </label>
                <input
                  type="text"
                  disabled
                  value={member.department}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 font-medium cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-slate-400 font-medium block mb-1">
                  {isEs ? 'Rol en la Iglesia' : isEn ? 'Role in Church' : isFr ? 'Rôle dans l’Église' : 'Wòl nan Legliz la'}
                </label>
                <input
                  type="text"
                  disabled
                  value={member.role}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 font-medium cursor-not-allowed"
                />
              </div>
            </div>

            {/* Legal Document Info if available */}
            {member.legalDocumentNumber && (
              <div>
                <label className="text-slate-400 font-medium block mb-1 flex items-center justify-between">
                  <span>
                    {isEs
                      ? `Documento Legal (${member.legalDocumentType === 'nif' ? 'NIF' : member.legalDocumentType === 'passeport' ? 'Pasaporte' : member.legalDocumentType === 'autre' ? 'Documento' : 'Cédula / NIF'})`
                      : `Dokiman Legal (${member.legalDocumentType === 'nif' ? 'NIF' : member.legalDocumentType === 'passeport' ? 'Pasipò' : member.legalDocumentType === 'autre' ? 'Dokiman' : 'CIN / NIF'})`}
                  </span>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> {isEs ? 'Protegido' : 'Pwoteje'}
                  </span>
                </label>
                <input
                  type="text"
                  disabled
                  value={member.legalDocumentNumber}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-amber-300 font-mono font-bold cursor-not-allowed"
                />
              </div>
            )}

            {/* Phone & Email (Protected / Read-Only) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 font-medium block mb-1 flex items-center justify-between">
                  <span>{isEs ? 'Número de Teléfono' : isEn ? 'Phone Number' : isFr ? 'Numéro de Téléphone' : 'Nimewo Telefòn'}</span>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> {isEs ? 'Protegido' : 'Pwoteje'}
                  </span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    disabled
                    value={member.phone || (isEs ? 'Sin número registrado' : 'Pa gen nimewo anrejistre')}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 font-medium cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-medium block mb-1 flex items-center justify-between">
                  <span>{isEs ? 'Correo Electrónico' : isEn ? 'Email Address' : isFr ? 'Adresse Email' : 'Adrès Imèl'}</span>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> {isEs ? 'Protegido' : 'Pwoteje'}
                  </span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    disabled
                    value={member.email || (isEs ? 'Sin correo registrado' : 'Pa gen imèl anrejistre')}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 font-medium cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="text-slate-400 font-medium block mb-1 flex items-center justify-between">
                <span>{isEs ? 'Dirección Residencial' : isEn ? 'Residential Address' : isFr ? 'Adresse Résidentielle' : 'Adrès Rezidans'}</span>
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> {isEs ? 'Protegido' : 'Pwoteje'}
                </span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  disabled
                  value={member.address || (isEs ? 'Sin dirección registrada' : 'Pa gen adrès anrejistre')}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 font-medium cursor-not-allowed"
                />
              </div>
            </div>

            {/* ASISTANS & SIPÒ POU MODIFIKASYON KONTAK */}
            <div className="p-3.5 rounded-xl bg-amber-400/10 border border-amber-400/30 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <HelpCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>{isEs ? '¿Necesita Modificar su Información de Contacto?' : isEn ? 'Need to Update Your Contact Information?' : isFr ? 'Besoin de Modifier Vos Coordonnées ?' : 'Bezwen Modifye Enfòmasyon Kontak Ou?'}</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {isEs
                  ? 'Para garantizar la seguridad y autenticidad de los registros de membresía, la administración de la iglesia o el soporte son los encargados de actualizar sus datos de contacto. Si nota algún error o requiere una actualización, comuníquese directamente con la administración.'
                  : isEn
                  ? 'To ensure the security and authenticity of member records, updates to your phone, email or address are handled directly by the church administration or support team.'
                  : isFr
                  ? 'Pour garantir la sécurité et l’authenticité des dossiers des membres, c’est l’administration de l’église qui gère la mise à jour de vos coordonnées.'
                  : 'Pou garanti sekirite ak konfòmite dosye manm yo, se administrasyon legliz la oswa asistans lan ki ka modifye nimewo telefòn, imèl oswa adrès rezidans ou. Si w remake nenpòt erè oswa si w bezwen mete yo ajou, tanpri kontakte asistans lan dirèkteman.'}
              </p>
              {(church.phone || church.email) && (
                <div className="pt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-300 font-medium">
                  {church.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-amber-400" />
                      <span>{church.phone}</span>
                    </span>
                  )}
                  {church.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-amber-400" />
                      <span>{church.email}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* CHURCH AFFILIATION INFO & REGULATIONS */}
          <div className="pt-4 border-t border-slate-700/80 space-y-3">
            <h4 className="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
              <Building2 className="w-4 h-4 text-amber-400" />
              {isEs ? 'Congregación a la que Pertenece' : isEn ? 'Church Affiliation' : isFr ? 'Église d’Appartenance' : 'Legliz Ou Fè Pati a'}
            </h4>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700 text-xs space-y-1 text-slate-300">
              <div className="font-bold text-white">{church.name}</div>
              <div className="text-slate-400">{isEs ? 'Pastor:' : 'Pastè:'} {church.pastor}</div>
              <div className="text-slate-400">{church.address}, {church.city}</div>
              <div className="font-mono text-[10px] text-amber-300 mt-1 font-bold">
                Church ID: {church.id}
              </div>
            </div>

            {/* BUTTON TO VIEW CHURCH RULES & PRIVACY */}
            <div className="pt-1">
              <button
                type="button"
                id="btn-member-open-terms-privacy"
                onClick={() => setIsTermsModalOpen(true)}
                className="w-full p-3 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-700/80 hover:border-slate-600 text-slate-300 hover:text-white flex items-center justify-between text-xs transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-slate-200 group-hover:text-amber-300 transition-colors">
                      {isEs ? 'Reglamento, Términos y Privacidad' : isFr ? 'Règlement Intérieur & Vie Privée' : isEn ? 'Church Guidelines & Privacy' : 'Règlemantasyon & Vi Prive'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {isEs ? 'Consulte los estatutos y protección de datos' : isFr ? 'Consultez les statuts et la confidentialité' : isEn ? 'View guidelines and member data protection' : 'Gade kòd kondit ak règleman konfidansyalite'}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-amber-400/90 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all">
                  →
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CHURCH TERMS & PRIVACY MODAL */}
      <ChurchTermsModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        church={church}
        language={language}
      />

      {/* PROFILE PHOTO CAPTURE & UPLOAD MODAL */}
      <ProfilePhotoCaptureModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        church={church}
        member={member}
        language={language}
        onPhotoSaved={(updated) => {
          onMemberUpdated(updated);
        }}
      />
    </div>
  );
};
