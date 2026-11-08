import React, { useState, useEffect } from 'react';
import { Church, Member, Language } from '../../types';
import { DigitalIdCard } from '../DigitalIdCard';
import { ProfilePhotoCaptureModal } from '../common/ProfilePhotoCaptureModal';
import { churchHasValidRnc, getChurchRnc } from '../../utils/rncValidator';
import {
  Shield,
  ShieldCheck,
  Info,
  Camera,
  Sparkles,
  CheckCircle2,
  Image as ImageIcon,
  User,
} from 'lucide-react';

interface MemberCardProps {
  church: Church;
  member: Member;
  language?: Language;
  onMemberUpdated?: (updated: Member) => void;
}

export const MemberCard: React.FC<MemberCardProps> = ({
  church,
  member: initialMember,
  language = 'ht',
  onMemberUpdated,
}) => {
  const isEs = language === 'es';
  const isEn = language === 'en';
  const isFr = language === 'fr';

  const hasValidRnc = churchHasValidRnc(church);
  const churchRnc = getChurchRnc(church);

  const [currentMember, setCurrentMember] = useState<Member>(initialMember);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState<boolean>(false);

  // Sync state if initialMember changes from parent
  useEffect(() => {
    setCurrentMember(initialMember);
  }, [initialMember]);

  // Listen to member update custom event
  useEffect(() => {
    const handleMemberUpdate = (e: any) => {
      const updated = e.detail as Member;
      if (updated && (updated.id === currentMember.id || updated.memberId === currentMember.memberId)) {
        setCurrentMember(updated);
        if (onMemberUpdated) {
          onMemberUpdated(updated);
        }
      }
    };

    window.addEventListener('omnichurch_member_updated', handleMemberUpdate);
    return () => {
      window.removeEventListener('omnichurch_member_updated', handleMemberUpdate);
    };
  }, [currentMember.id, currentMember.memberId, onMemberUpdated]);

  const hasPhoto = !!(currentMember.googlePhoto || currentMember.avatarUrl);

  const handlePhotoSaved = (updated: Member) => {
    setCurrentMember(updated);
    if (onMemberUpdated) {
      onMemberUpdated(updated);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-2xl mx-auto">
      {/* TITLE */}
      <div className="text-center space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-400/20 via-cyan-400/20 to-indigo-400/20 text-amber-300 border border-amber-400/30 text-xs font-black tracking-wider uppercase shadow-sm">
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          <span>
            {isEs
              ? 'CARNET OFICIAL DE IDENTIDAD DE MIEMBRO • DOCUMENTO ECLESIÁSTICO'
              : isEn
              ? 'OFFICIAL MEMBER IDENTITY CARD • DIGITAL CHURCH PASS'
              : isFr
              ? 'CARTE D’IDENTITÉ OFFICIELLE DE MEMBRE • PASS ÉGLISE NUMÉRIQUE'
              : 'KAT IDANTITE OFISYÈL MANM • PAS ECLESIYASTIK NIMEWIK'}
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          {isEs
            ? 'Carnet de Identidad de Miembro y Código de Asistencia'
            : isEn
            ? 'Member Identity Card & Attendance Code'
            : isFr
            ? 'Carte d’Identité de Membre & Code de Présence'
            : 'Kat Idantite Manm & Kòd Prezans'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
          {isEs
            ? 'Carnet oficial de membresía con fotografía, número de matrícula, rol ministerial, código QR y zona de lectura óptica para acceso a todos los cultos y actividades.'
            : isEn
            ? 'Official member ID card with photo, ID number, ministry role, QR code and optical scan zone for check-in to all church services and events.'
            : isFr
            ? 'Véritable carte d’identité officielle avec photo, matricule, rôle, code QR et zone de lecture optique pour tous les cultes.'
            : 'Vrè kat idantite manm ofisyèl ak foto, matrikil, wòl, kòd QR ak zòn lekti optik pou pase nan tout pòt ak kilt legliz la.'}
        </p>
      </div>

      {/* QUICK CAMERA & PHOTO CUSTOMIZATION ACTION BAR */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-amber-400/30 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-left w-full sm:w-auto">
          <div className="relative">
            {hasPhoto ? (
              <img
                src={currentMember.googlePhoto || currentMember.avatarUrl}
                alt={currentMember.fullName}
                className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-400/70 shadow-md"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-400 shadow-md">
                <User className="w-6 h-6 text-amber-400/80" />
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[9px] font-black shadow">
              ✓
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-black text-white">
                {isEs
                  ? 'Foto de Perfil del Carnet'
                  : isFr
                  ? 'Photo de Profil de la Carte'
                  : isEn
                  ? 'ID Card Profile Photo'
                  : 'Foto Pwofil Kat la'}
              </span>
              {hasPhoto ? (
                <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  {isEs ? 'Foto Activa' : isFr ? 'Photo Active' : isEn ? 'Active Photo' : 'Foto Etabli'}
                </span>
              ) : (
                <span className="px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold">
                  {isEs ? 'Avatar Estático' : isFr ? 'Avatar Statique' : isEn ? 'Static Avatar' : 'Avatar Estatik'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              {isEs
                ? 'Tome una fotografía oficial con su cámara o cargue una imagen para su carnet.'
                : isFr
                ? 'Prenez une photo avec la caméra ou téléversez une image pour votre carte.'
                : isEn
                ? 'Take an official photo with your camera or upload an image for your ID card.'
                : 'Pran yon bèl foto ak kamera w oswa telechaje yon imaj pou kat idantite w.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          id="btn-take-member-card-photo"
          onClick={() => setIsPhotoModalOpen(true)}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-400/20 transition-all hover:scale-102 active:scale-98 cursor-pointer shrink-0"
        >
          <Camera className="w-4 h-4 text-slate-950" />
          <span>
            {hasPhoto
              ? isEs
                ? '📸 Cambiar Foto'
                : isFr
                ? '📸 Changer la Photo'
                : isEn
                ? '📸 Change Photo'
                : '📸 Chanje Foto a'
              : isEs
              ? '📸 Tomar Foto con Cámara'
              : isFr
              ? '📸 Prendre Photo avec Caméra'
              : isEn
              ? '📸 Take Photo with Camera'
              : '📸 Pran Foto ak Kamera'}
          </span>
        </button>
      </div>

      {/* OFFICIAL CHURCH ACCREDITATION & VALID RNC BANNER (Ki parèt sèlman lè legliz la gen yon RNC valide) */}
      {hasValidRnc && (
        <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/40 shadow-md flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-emerald-300 uppercase tracking-wide text-[11px]">
                  {isEs ? 'Entidad Eclesiástica con RNC Oficial' : isFr ? 'Entité Ecclésiastique avec RNC Officiel' : isEn ? 'Officially Registered Church • Valid RNC' : 'Legliz ak RNC Ofisyèl'}
                </span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/25 text-emerald-200 font-mono font-bold text-[10px] border border-emerald-500/40">
                  {churchRnc}
                </span>
              </div>
              <p className="text-[10.5px] text-slate-400 truncate">
                {isEs
                  ? `${church.name} cuenta con acreditación legal; este carnet está verificado ante las autoridades.`
                  : isFr
                  ? `${church.name} possède un statut fiscal en règle attestant la validité officielle de ce badge.`
                  : isEn
                  ? `${church.name} holds valid ecclesiastical tax registration certifying official status to verifiers.`
                  : `${church.name} anrejistre kòrèkteman devan leta; kat sa a konfime estati ofisyèl manm lan devan tout verifikatè.`}
              </p>
            </div>
          </div>
          <div className="shrink-0 hidden xs:flex items-center">
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[9px] font-black tracking-wider uppercase flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>{isEs ? 'CERTIFICADO' : isFr ? 'CERTIFIÉ' : isEn ? 'CERTIFIED' : 'SÈTIFYE'}</span>
            </span>
          </div>
        </div>
      )}

      {/* DIGITAL CARD BADGE (With interactive photo edit trigger) */}
      <DigitalIdCard
        member={currentMember}
        church={church}
        showPrintButton={false}
        language={language}
        onEditPhoto={() => setIsPhotoModalOpen(true)}
      />

      {/* HOW TO USE CARD */}
      <div className="bg-[#1E293B] rounded-2xl p-5 border border-slate-700/80 space-y-3 text-xs text-slate-300">
        <h4 className="font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
          <Info className="w-4 h-4 text-amber-400" />
          {isEs
            ? 'Cómo Funciona el Sistema de Asistencia Inteligente'
            : isEn
            ? 'How the Smart Attendance System Works'
            : isFr
            ? 'Comment Fonctionne le Système de Présence'
            : 'Kòman Sistèm Prezans lan Fonksyone'}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700 space-y-1">
            <span className="font-bold text-white block">
              {isEs ? '1. Muestre su Carnet' : isEn ? '1. Show your Card' : isFr ? '1. Ouvrez votre Carte' : '1. Ouvri Kòd la'}
            </span>
            <p className="text-[11px] text-slate-400">
              {isEs
                ? 'Abra esta pantalla en su teléfono al llegar a cualquier culto o reunión eclesiástica.'
                : isEn
                ? 'Open this screen on your mobile phone when entering any service or church meeting.'
                : isFr
                ? 'Ouvrez cette page sur votre téléphone à l’entrée de chaque culte ou réunion.'
                : 'Ouvri paj sa a sou telefòn ou lè w ap antre nan nenpòt kilt oswa reyinyon.'}
            </p>
          </div>
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700 space-y-1">
            <span className="font-bold text-white block">
              {isEs ? '2. Escaneo en Puerta' : isEn ? '2. Reception Scans' : isFr ? '2. Scan à l’Entrée' : '2. Responsab la Eskane'}
            </span>
            <p className="text-[11px] text-slate-400">
              {isEs
                ? 'El lector óptico o la cámara de recepción reconocerán su ID de miembro y el culto activo al instante.'
                : isEn
                ? 'The entrance scanner automatically detects your Member ID and current church service.'
                : isFr
                ? 'Le scanner reconnaît automatiquement votre ID membre et le culte en cours.'
                : 'Scanner a rekonèt otomatikman Member ID ou ak sèvis k ap fèt jodi a.'}
            </p>
          </div>
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700 space-y-1">
            <span className="font-bold text-white block">
              {isEs ? '3. Asistencia Confirmada' : isEn ? '3. Confirmed Check-In' : isFr ? '3. Présence Confirmée' : '3. Prezans Konfime'}
            </span>
            <p className="text-[11px] text-slate-400">
              {isEs
                ? 'Su presencia quedará registrada al instante con validación en tiempo real y protección contra duplicados.'
                : isEn
                ? 'Your attendance is recorded in milliseconds with real-time duplicate prevention.'
                : isFr
                ? 'Votre présence est enregistrée instantanément avec protection contre les doublons.'
                : 'Prezans ou make nan kèk milisegonn san danje pou doub anrejistreman.'}
            </p>
          </div>
        </div>
      </div>

      {/* PROFILE PHOTO CAPTURE & UPLOAD MODAL */}
      <ProfilePhotoCaptureModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        church={church}
        member={currentMember}
        language={language}
        onPhotoSaved={handlePhotoSaved}
      />
    </div>
  );
};



