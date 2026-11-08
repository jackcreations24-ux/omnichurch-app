import React, { useEffect, useState, useRef } from 'react';
import { Member, Church, Language } from '../types';
import { generateQrDataUrl, getMemberVerificationUrl, getSavedLanguage } from '../utils/storage';
import { useToast } from '../context/ToastContext';
import { PrintMemberCardModal } from './PrintMemberCardModal';
import { churchHasValidRnc, getChurchRnc, getRncI18n } from '../utils/rncValidator';
import { hasActiveChurchLicense } from '../utils/developerStorage';
import {
  ShieldCheck,
  Download,
  Printer,
  Copy,
  Check,
  RotateCw,
  QrCode,
  CheckCircle2,
  Building2,
  Phone,
  MapPin,
  Calendar,
  User,
  Shield,
  Camera,
  Layers,
  BadgeCheck,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  BADGE_DOMAIN_STYLES,
  BadgeDomainStyleId,
  getSavedBadgeDomainStyle,
  saveBadgeDomainStyle,
} from '../data/badgeDomainStyles';
import { BadgeDomainDisplay } from './common/BadgeDomainDisplay';

interface DigitalIdCardProps {
  member: Member;
  church: Church;
  compact?: boolean;
  showPrintButton?: boolean;
  language?: Language;
  onEditPhoto?: () => void;
}

export const DigitalIdCard: React.FC<DigitalIdCardProps> = ({
  member,
  church,
  compact = false,
  showPrintButton = false,
  language,
  onEditPhoto,
}) => {
  const toast = useToast();
  const activeLang: Language = language || getSavedLanguage() || 'ht';
  const isEs = activeLang === 'es';
  const isEn = activeLang === 'en';
  const isFr = activeLang === 'fr';

  // Verification privilege: only churches with active license and their members display verified badge
  const isChurchLicensed = hasActiveChurchLicense(church.id);

  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [badgeDomainStyle, setBadgeDomainStyle] = useState<BadgeDomainStyleId>(() => getSavedBadgeDomainStyle());

  // 3D Tilt State for interactive realistic card depth
  const [rotateX, setRotateX] = useState<number>(0);
  const [rotateY, setRotateY] = useState<number>(0);
  const [glarePosition, setGlarePosition] = useState<{ x: number; y: number; opacity: number }>({
    x: 50,
    y: 50,
    opacity: 0,
  });

  // Official Church RNC State & Interactive Tooltip
  const [isRncTooltipOpen, setIsRncTooltipOpen] = useState<boolean>(false);
  const [isRncTooltipHovered, setIsRncTooltipHovered] = useState<boolean>(false);

  const hasValidRnc = churchHasValidRnc(church);
  const churchRnc = getChurchRnc(church);
  const rncI18n = getRncI18n(activeLang);
  const showRncTooltip = hasValidRnc && (isRncTooltipOpen || isRncTooltipHovered);

  const cardContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    if (member) {
      const verifyUrl = getMemberVerificationUrl(member);
      if (verifyUrl) {
        generateQrDataUrl(verifyUrl).then((url) => {
          if (isMounted) setQrUrl(url);
        });
      }
    }
    return () => {
      isMounted = false;
    };
  }, [member?.churchId, member?.memberId, member?.id]);

  const handleCopyId = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!member?.memberId) return;
    navigator.clipboard.writeText(member.memberId);
    setCopied(true);
    const title = isEs ? '¡ID Copiado!' : isEn ? 'ID Copied!' : isFr ? 'ID Copié !' : 'ID Kopye!';
    const body = `${member.memberId} (${member.fullName || 'Miembro'})`;
    toast.info(title, body);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenPrintModal = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsPrintModalOpen(true);
  };

  const handleDownload = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!qrUrl || !member) return;
    const a = document.createElement('a');
    a.href = qrUrl;
    const safeName = (member.fullName || 'manm').replace(/\s+/g, '_');
    a.download = `QR_${member.memberId || 'code'}_${safeName}.png`;
    a.click();
    const title = isEs ? '¡Código QR Descargado!' : isEn ? 'QR Code Downloaded!' : isFr ? 'Code QR Téléchargé !' : 'Kòd QR Telechaje!';
    const body = isEs
      ? `Archivo de imagen QR para ${member.fullName} listo.`
      : isEn
      ? `QR image code for ${member.fullName || 'Member'} is ready.`
      : isFr
      ? `Fichier image QR pour ${member.fullName || 'Membre'} prêt.`
      : `Fichye imaj QR pou ${member.fullName || 'Manm'} pare.`;
    toast.success(title, body);
  };

  // 3D Card Interactive Tilt Handler
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardContainerRef.current) return;
    const rect = cardContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = ((y - centerY) / centerY) * -10;
    const rotY = ((x - centerX) / centerX) * 10;

    setRotateX(rotX);
    setRotateY(rotY);
    setGlarePosition({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.2,
    });
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setGlarePosition((prev) => ({ ...prev, opacity: 0 }));
  };

  // Generate deterministic barcode lines based on memberId chars
  const renderBarcodeLines = () => {
    const code = member?.memberId || 'ID0000';
    const bars: boolean[] = [];
    for (let i = 0; i < code.length; i++) {
      const charCode = code.charCodeAt(i);
      bars.push(true, charCode % 2 === 0, charCode % 3 === 0, true, false, charCode % 5 === 0, true);
    }
    return (
      <div className="flex items-center justify-center gap-[1.5px] h-7 px-2 py-0.5 bg-white rounded border border-slate-300 shadow-inner">
        {bars.slice(0, 48).map((isBar, idx) => (
          <div
            key={idx}
            className={`h-full ${isBar ? 'bg-slate-950' : 'bg-transparent'}`}
            style={{ width: idx % 4 === 0 ? '2.5px' : '1.2px' }}
          />
        ))}
      </div>
    );
  };

  // MRZ string generator like realistic national identity cards
  const generateMrz = () => {
    const safeName = (member.fullName || 'MEMBER').replace(/[^A-Za-z]/g, '<').toUpperCase().slice(0, 26);
    const safeId = (member.memberId || 'MB0000').replace(/[^A-Za-z0-9]/g, '<').toUpperCase().padEnd(12, '<');
    const safeChurch = (church.code || 'CH01').replace(/[^A-Za-z0-9]/g, '<').toUpperCase().padEnd(6, '<');
    const line1 = `IDHTI${safeChurch}${safeId}<<<<<<<<<<`;
    const line2 = `${safeName.padEnd(30, '<')}`;
    return { line1, line2 };
  };

  const mrz = generateMrz();

  const cardHeaderTitle = church.customCardTitle || (isEs ? 'CARNET DE IDENTIDAD DE MIEMBRO' : isEn ? 'MEMBER IDENTITY CARD' : isFr ? 'CARTE D’IDENTITÉ DE MEMBRE' : 'KAT IDANTITE MANM');
  const badgeTitle = isEs ? 'TITULAR • OFICIAL' : isEn ? 'HOLDER • OFFICIAL' : isFr ? 'TITULAIRE • OFFICIEL' : 'TITILÈ • OFISYÈL';
  const photoBoxLabel = isEs ? 'FOTO OFICIAL' : isEn ? 'OFFICIAL PHOTO' : isFr ? 'PHOTO OFFICIELLE' : 'FOTO OFISYÈL';
  const nameLabel = isEs ? 'NOMBRE Y APELLIDO' : isEn ? 'FULL NAME' : isFr ? 'NOM & PRÉNOM' : 'NOM & PRÉNOM / NON KONPLÈ';
  const roleLabel = isEs ? 'CARGO / ROL' : isEn ? 'ROLE / FUNCTION' : isFr ? 'RÔLE / FONCTION' : 'FONKSYON / RÔLE';
  const deptLabel = isEs ? 'MINISTERIO / DEPARTAMENTO' : isEn ? 'MINISTRY / DEPARTMENT' : isFr ? 'MINISTÈRE / DÉPARTEMENT' : 'MINISTÈ / DEPATMAN';
  const idLabel = isEs ? 'ID MATRÍCULA' : isEn ? 'MEMBER ID' : isFr ? 'MATRICULE ID' : 'ID MATRIKIL';
  const joinedLabel = isEs ? 'FECHA DE INGRESO' : isEn ? 'JOINED DATE' : isFr ? 'DATE D’ADHÉSION' : 'DAT ADMISYON';
  const signatureLabel = isEs ? 'FIRMA DEL TITULAR' : isEn ? 'MEMBER SIGNATURE' : isFr ? 'SIGNATURE DU TITULAIRE' : 'SIYATI TITILÈ A';
  const statusLabel = isEs ? 'ESTADO: ACTIVO' : isEn ? 'STATUS: ACTIVE' : isFr ? 'STATUT: EN RÈGLE' : 'ESTATI: EN RÈGLE';
  const validityLabel = isEs ? 'VALIDEZ: PERMANENTE' : isEn ? 'VALIDITY: PERMANENT' : isFr ? 'VALIDITÉ: PERMANENT' : 'VALAB: PÈMANAN';
  const footerLabel = isEs ? 'CARNET OFICIAL DE MIEMBRO' : isEn ? 'OFFICIAL CHURCH MEMBER CARD' : isFr ? 'CARTE DE MEMBRE OFFICIELLE' : 'KAT IDANTITE MANM • CARTE DE MEMBRE OFFICIELLE';
  const flipHint = isEs ? 'Voltear tarjeta para escanear QR' : isEn ? 'Flip card for QR scanner' : isFr ? 'Retourner la carte pour QR' : 'Vire kat la pou eskanè QR';
  const qrBadgeLabel = isEs ? 'QR ASISTENCIA' : isEn ? 'ATTENDANCE QR' : isFr ? 'QR PRÉSENCE' : 'QR PREZANS';
  const phoneLabel = isEs ? 'TELÉFONO Y CONTACTO DE EMERGENCIA' : isEn ? 'PHONE & EMERGENCY CONTACT' : isFr ? 'TÉLÉPHONE & CONTACT D’URGENCE' : 'TELEFÒN & KONTAK DIJANS';
  const authSignatureLabel = isEs ? 'FIRMA AUTORIZADA / PASTOR' : isEn ? 'AUTHORIZED SIGNATURE' : isFr ? 'SIGNATURE AUTORISÉE' : 'SIYATI OTORIZE / DIREKSYON';
  const scanAtDoorLabel = isEs ? 'ESCANEAR EN LA ENTRADA' : isEn ? 'SCAN AT ENTRANCE' : isFr ? 'SCANNER À L’ENTRÉE' : 'ESKANE NAN PÒT LA';

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto">
      {/* 3D PERSPECTIVE CARD CONTAINER */}
      <div
        style={{ perspective: 1200 }}
        className="w-full relative select-none"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <motion.div
          ref={cardContainerRef}
          id={`official-id-card-${member.memberId}`}
          onClick={() => setIsFlipped(!isFlipped)}
          animate={{
            rotateY: isFlipped ? 180 : rotateY,
            rotateX: isFlipped ? 0 : rotateX,
          }}
          transition={{
            type: 'spring',
            stiffness: 260,
            damping: 24,
          }}
          style={{
            transformStyle: 'preserve-3d',
          }}
          className="relative w-full aspect-[1.586/1] min-h-[245px] sm:min-h-[265px] rounded-3xl cursor-pointer shadow-[0_20px_50px_rgba(0,0,0,0.65)] group transition-shadow duration-300"
        >
          {/* =========================================================================
              FRONT FACE (RECTO): VRÈ KAT IDANTITE OFISYÈL MANM
              ========================================================================= */}
          <div
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
            className="absolute inset-0 w-full h-full rounded-3xl p-4 sm:p-5 flex flex-col justify-between overflow-hidden border border-white/25 backdrop-blur-2xl bg-gradient-to-br from-slate-900 via-[#0d172e] to-[#121c38] text-white shadow-2xl"
          >
            {/* Glossy Plastic Laminate Glare Effect */}
            <div
              className="absolute inset-0 pointer-events-none transition-opacity duration-300 rounded-3xl"
              style={{
                background: `radial-gradient(circle at ${glarePosition.x}% ${glarePosition.y}%, rgba(255,255,255,${glarePosition.opacity}), transparent 60%)`,
              }}
            />

            {/* Official Security Guilloche Pattern & Watermark Background */}
            <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />
            <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full border-[12px] border-amber-400/10 pointer-events-none" />
            <div className="absolute -left-12 -top-12 w-48 h-48 rounded-full border-[12px] border-cyan-400/10 pointer-events-none" />

            {/* TOP HEADER: Official Church Banner & Republic / Protocol Seal */}
            <div className="relative z-10 border-b border-amber-400/30 pb-2 flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-300 to-amber-500 p-[1.5px] shadow-md shadow-amber-400/20">
                  <div className="w-full h-full rounded-2xl bg-slate-950 flex items-center justify-center text-amber-300 font-extrabold text-base">
                    ✝
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] font-black tracking-widest uppercase text-amber-400/90 font-mono">
                      {cardHeaderTitle}
                    </span>
                  </div>
                  <h3 className="font-black text-xs sm:text-sm tracking-wide uppercase text-white drop-shadow-sm leading-tight flex items-center gap-1">
                    <span className="truncate">{church.name}</span>
                    {isChurchLicensed && (
                      <BadgeCheck
                        className="w-3.5 h-3.5 text-sky-400 shrink-0 inline-block"
                        title={isEs ? 'Iglesia con Licencia Verificada' : 'Legliz verifye ak lisans ofisyèl'}
                      />
                    )}
                  </h3>
                  <div className="text-[9px] text-slate-300 font-mono flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-amber-300 font-bold">{church.code}</span>
                    {church.city && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-[130px]">{church.city}</span>
                      </>
                    )}
                    {hasValidRnc && (
                      <>
                        <span>•</span>
                        <button
                          type="button"
                          id={`badge-rnc-indicator-${member.id || member.memberId}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsRncTooltipOpen((prev) => !prev);
                          }}
                          onMouseEnter={() => setIsRncTooltipHovered(true)}
                          onMouseLeave={() => setIsRncTooltipHovered(false)}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-400/50 text-emerald-300 text-[8px] font-mono font-bold tracking-tight uppercase shadow-xs transition-all cursor-pointer backdrop-blur-xs hover:scale-105 active:scale-95"
                          title={rncI18n.badgeTitle}
                        >
                          <ShieldCheck className="w-2.5 h-2.5 text-emerald-400 shrink-0 animate-pulse" />
                          <span>RNC: {churchRnc}</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_#34d399]" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Holographic ID Badge Chip & Official Verification */}
              <div className="flex flex-col items-end gap-1">
                <div className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[9px] font-black tracking-wider uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{badgeTitle}</span>
                </div>
                <span className="text-[8px] font-mono text-slate-400 tracking-wider">
                  N° {member.memberId}
                </span>
                {hasValidRnc && (
                  <button
                    type="button"
                    id={`badge-rnc-pill-btn-${member.id || member.memberId}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsRncTooltipOpen((prev) => !prev);
                    }}
                    onMouseEnter={() => setIsRncTooltipHovered(true)}
                    onMouseLeave={() => setIsRncTooltipHovered(false)}
                    className="px-1.5 py-0.2 rounded-full bg-gradient-to-r from-emerald-500/30 to-teal-500/30 border border-emerald-400/60 text-emerald-300 text-[7.5px] font-black tracking-wider uppercase flex items-center gap-0.5 cursor-pointer hover:border-emerald-300 transition-all shadow-xs"
                    title={rncI18n.badgeTitle}
                  >
                    <ShieldCheck className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                    <span>{rncI18n.badgePill}</span>
                  </button>
                )}
              </div>
            </div>

            {/* RICH INTERACTIVE RNC CERTIFICATION TOOLTIP (Ki parèt sèlman lè legliz la gen RNC valide) */}
            {showRncTooltip && (
              <div
                id={`badge-rnc-tooltip-${member.id || member.memberId}`}
                onClick={(e) => e.stopPropagation()}
                className="absolute top-11 left-2.5 right-2.5 sm:left-3.5 sm:right-3.5 z-50 p-3.5 rounded-2xl bg-slate-950/95 border-2 border-emerald-400/90 shadow-[0_20px_45px_rgba(0,0,0,0.9)] backdrop-blur-2xl text-white space-y-2 animate-in fade-in zoom-in-95 duration-150"
              >
                {/* Tooltip Header */}
                <div className="flex items-center justify-between border-b border-emerald-500/30 pb-1.5">
                  <div className="flex items-center gap-1.5 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{rncI18n.tooltipHeader}</span>
                  </div>
                  <button
                    type="button"
                    id="btn-close-rnc-tooltip"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsRncTooltipOpen(false);
                      setIsRncTooltipHovered(false);
                    }}
                    className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded-lg bg-slate-800 border border-slate-700 cursor-pointer"
                    title={rncI18n.close}
                  >
                    ✕
                  </button>
                </div>

                {/* Tooltip Grid Info */}
                <div className="grid grid-cols-2 gap-2 text-[9px] pt-0.5">
                  <div>
                    <span className="text-[7.5px] uppercase tracking-wider text-slate-400 font-bold block">
                      {rncI18n.rncLabel}
                    </span>
                    <span className="font-mono font-black text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/40 inline-block mt-0.5">
                      {churchRnc}
                    </span>
                  </div>
                  <div>
                    <span className="text-[7.5px] uppercase tracking-wider text-slate-400 font-bold block">
                      {rncI18n.statusLabel}
                    </span>
                    <span className="text-emerald-300 font-bold flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span className="truncate">{rncI18n.statusValue}</span>
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[7.5px] uppercase tracking-wider text-slate-400 font-bold block">
                      {rncI18n.churchLabel}
                    </span>
                    <span className="text-white font-black text-[10px] truncate block">
                      {church.name}
                    </span>
                  </div>
                </div>

                {/* Explanation & Verifier Note */}
                <p className="text-[8.5px] text-slate-300 leading-tight">
                  {rncI18n.explanation}
                </p>
                <div className="pt-1 border-t border-slate-800 text-[8px] text-emerald-400 font-medium flex items-center gap-1">
                  <Check className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                  <span>{rncI18n.verifierNote}</span>
                </div>
              </div>
            )}

            {/* MIDDLE SECTION: Photo + Biometric ID Details */}
            <div className="relative z-10 flex items-center gap-3.5 my-auto py-1">
              {/* Official Member Passport Photo Box */}
              <div className="shrink-0 flex flex-col items-center">
                <div
                  onClick={(e) => {
                    if (onEditPhoto) {
                      e.stopPropagation();
                      onEditPhoto();
                    }
                  }}
                  className={`relative w-20 h-24 sm:w-22 sm:h-26 rounded-2xl bg-slate-800 border-2 border-amber-400/70 p-1 shadow-xl overflow-hidden bg-gradient-to-b from-slate-800 to-slate-900 group/photo ${
                    onEditPhoto ? 'cursor-pointer hover:border-amber-300 hover:scale-102 transition-all' : ''
                  }`}
                  title={
                    onEditPhoto
                      ? isEs
                        ? 'Tomar foto con cámara o cambiar foto de perfil'
                        : isFr
                        ? 'Prendre photo avec caméra ou changer'
                        : isEn
                        ? 'Take photo with camera or change profile photo'
                        : 'Pran foto ak kamera oswa chanje foto pwofil'
                      : undefined
                  }
                >
                  {member.googlePhoto || member.avatarUrl ? (
                    <img
                      src={member.googlePhoto || member.avatarUrl}
                      alt={member.fullName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <div className="w-full h-full rounded-xl bg-gradient-to-br from-indigo-600/60 to-slate-900 flex flex-col items-center justify-center text-white">
                      <User className="w-8 h-8 text-amber-300" />
                      <span className="text-[10px] font-black tracking-wider mt-1 text-slate-300">
                        {member.fullName ? member.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2) : 'ID'}
                      </span>
                    </div>
                  )}

                  {/* Interactive Camera Hover Badge */}
                  {onEditPhoto && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex flex-col items-center justify-center text-white rounded-xl backdrop-blur-[1px]">
                      <Camera className="w-5 h-5 text-amber-300 animate-bounce" />
                      <span className="text-[7.5px] font-black tracking-wider uppercase text-amber-200 mt-0.5">
                        {isEs ? 'CAMBIAR' : isFr ? 'CHANGER' : isEn ? 'CHANGE' : 'CHANJE'}
                      </span>
                    </div>
                  )}

                  {/* Security Hologram Stamp on Photo Corner */}
                  <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-amber-400/30 border border-amber-300 backdrop-blur-sm flex items-center justify-center text-[7px] font-black text-amber-200">
                    ✓
                  </div>
                </div>
                <span className="text-[8px] text-amber-300 font-mono font-bold tracking-widest mt-1 uppercase">
                  {photoBoxLabel}
                </span>
              </div>

              {/* Biometric & Identity Fields */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div>
                  <span className="text-[8px] uppercase tracking-widest text-slate-400 font-bold block">
                    {nameLabel}
                  </span>
                  <h4 className="font-black text-xs sm:text-sm text-white uppercase truncate drop-shadow leading-tight flex items-center gap-1">
                    <span className="truncate">{member.titlePrefix ? `${member.titlePrefix} ` : ''}{member.fullName}</span>
                    {isChurchLicensed && (
                      <BadgeCheck
                        className="w-3.5 h-3.5 text-sky-400 shrink-0 inline-block"
                        title={isEs ? 'Miembro de Iglesia con Licencia Verificada' : 'Manm legliz verifye ak lisans ofisyèl'}
                      />
                    )}
                  </h4>
                </div>

                <div className="pt-0.5 pb-1">
                  <BadgeDomainDisplay
                    department={member.department}
                    role={member.role}
                    styleId={badgeDomainStyle}
                    language={activeLang}
                    isDark={true}
                    accentColorClass="text-amber-400"
                    badgeBgClass="bg-amber-400/20"
                    badgeTextClass="text-amber-300"
                    accentBorderClass="border-amber-400/40"
                    subTextColorClass="text-slate-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] sm:text-[10px]">
                  <div>
                    <span className="text-[7.5px] uppercase tracking-wider text-slate-400 block font-bold">
                      {idLabel}
                    </span>
                    <span className="font-mono font-black text-white bg-slate-950/80 px-1.5 py-0.2 rounded border border-white/10 inline-block">
                      {member.memberId}
                    </span>
                  </div>

                  <div>
                    <span className="text-[7.5px] uppercase tracking-wider text-slate-400 block font-bold">
                      {joinedLabel}
                    </span>
                    <span className="font-mono text-slate-300 block">
                      {member.joinedDate || '2024'}
                    </span>
                  </div>

                  {member.legalDocumentNumber && (
                    <div className="col-span-2 pt-0.5 border-t border-white/10 flex items-center justify-between text-[8.5px]">
                      <span className="text-[7.5px] uppercase tracking-wider text-slate-400 font-bold">
                        {member.legalDocumentType === 'nif'
                          ? 'NIF'
                          : member.legalDocumentType === 'passeport'
                          ? (isEs ? 'PASAPORTE' : isEn ? 'PASSPORT' : isFr ? 'PASSEPORT' : 'PASIPÒ')
                          : member.legalDocumentType === 'autre'
                          ? (isEs ? 'DOCUMENTO' : isEn ? 'DOCUMENT' : isFr ? 'DOCUMENT' : 'DOKIMAN')
                          : (isEs ? 'CÉDULA / NIF' : isEn ? 'NATIONAL ID / NIF' : isFr ? 'CIN / NIF' : 'CIN / NIF')}
                      </span>
                      <span className="font-mono font-bold text-emerald-300 bg-slate-950/80 px-1.5 py-0.2 rounded border border-emerald-500/30">
                        {member.legalDocumentNumber}
                      </span>
                    </div>
                  )}
                </div>

                {/* Member Signature Line */}
                <div className="pt-0.5 border-t border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-[7px] uppercase tracking-widest text-slate-400 font-bold block">
                      {signatureLabel}
                    </span>
                    <span className="font-serif italic text-xs text-amber-200 font-bold tracking-wider">
                      {member.fullName}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[7px] uppercase tracking-widest text-emerald-400 font-bold block">
                      {statusLabel}
                    </span>
                    <span className="text-[8px] font-mono text-slate-400">
                      {validityLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Microprint Security Border Footer */}
            <div className="relative z-10 border-t border-amber-400/20 pt-1 flex items-center justify-between text-[8px] text-slate-400 font-mono">
              <div className="flex items-center gap-1 text-slate-300">
                <ShieldCheck className="w-3 h-3 text-amber-400" />
                <span>{footerLabel}</span>
              </div>
              <span className="text-amber-300/90 font-bold">
                {church.code}
              </span>
            </div>

            {/* Flip Hint */}
            <div className="absolute bottom-1 right-1/2 translate-x-1/2 px-2 py-0.5 rounded-full bg-black/50 border border-white/10 text-[8px] text-slate-300 font-medium flex items-center gap-1 pointer-events-none">
              <RotateCw className="w-2.5 h-2.5 text-amber-400" />
              <span>{flipHint}</span>
            </div>
          </div>

          {/* =========================================================================
              BACK FACE (VERSO): KÒD QR, BÒD BARRE, ADRES AK SIYATI OTORITE
              ========================================================================= */}
          <div
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
            className="absolute inset-0 w-full h-full rounded-3xl p-4 sm:p-5 flex flex-col justify-between overflow-hidden border border-white/25 backdrop-blur-2xl bg-gradient-to-br from-[#0c1427] via-[#0f1a36] to-[#172347] text-white shadow-2xl"
          >
            {/* Top Back Header: Official Church Legal Identity */}
            <div className="border-b border-amber-400/30 pb-2 flex items-center justify-between text-[9px]">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-black text-amber-400 uppercase tracking-wider block">
                    {church.name.toUpperCase()}
                  </span>
                  {hasValidRnc && (
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/25 text-emerald-300 font-mono font-bold text-[7.5px] border border-emerald-400/40 flex items-center gap-1 shadow-xs">
                      <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                      <span>RNC VALIDE: {churchRnc}</span>
                    </span>
                  )}
                </div>
                <span className="text-[8px] text-slate-400">
                  {church.address || (isEs ? 'Dirección de la Iglesia' : isEn ? 'Church Address' : isFr ? 'Adresse de l’Église' : 'Adrès Legliz')}, {church.city} • Tel: {church.phone || 'N/A'}
                </span>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-mono font-bold text-[9px] border border-amber-400/30">
                  {qrBadgeLabel}
                </span>
              </div>
            </div>

            {/* Middle Back Section: QR Code + Contacts + Signatures */}
            <div className="flex items-center justify-between gap-3.5 my-auto py-1">
              {/* Left: Member Emergency Contact & Pastor Signature */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="space-y-0.5 text-[9px]">
                  <span className="text-[7.5px] uppercase tracking-wider text-slate-400 font-bold block">
                    {phoneLabel}
                  </span>
                  <div className="text-slate-200 font-mono flex items-center gap-1">
                    <Phone className="w-2.5 h-2.5 text-amber-400" />
                    <span>{member.phone || (isEs ? 'Sin teléfono' : isEn ? 'No phone' : isFr ? 'Sans téléphone' : 'Pa gen telefòn')}</span>
                  </div>
                  {member.emergencyContact && (
                    <div className="text-[8.5px] text-slate-300 font-mono">
                      {isEs ? 'Emergencia:' : isEn ? 'Emergency:' : isFr ? 'Urgence:' : 'Dijans:'} {member.emergencyContact} ({member.emergencyContactName || (isEs ? 'Familiar' : isEn ? 'Relative' : isFr ? 'Famille' : 'Fanmi')})
                    </div>
                  )}
                </div>

                {/* Authority Signature & Official Stamp */}
                <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/80 flex items-center justify-between">
                  <div className="min-h-[30px] flex flex-col justify-center">
                    <span className="text-[7px] uppercase tracking-wider text-slate-400 font-bold block">
                      {authSignatureLabel}
                    </span>
                    {church.signatureUrl ? (
                      <div className="h-6 flex items-center mt-0.5">
                        <img
                          src={church.signatureUrl}
                          alt="Firma"
                          className="h-5.5 max-h-6 max-w-[110px] object-contain"
                        />
                      </div>
                    ) : (
                      <span className="font-serif italic text-[11px] text-amber-200 font-bold">
                        {church.pastor || (isEs ? 'Pastor de la Iglesia' : isEn ? 'Church Pastor' : isFr ? 'Pasteur de l’Église' : 'Pastè Legliz')}
                      </span>
                    )}
                  </div>
                  <div className="w-9 h-9 rounded-full border border-amber-400/40 bg-amber-400/10 flex flex-col items-center justify-center text-[6px] text-amber-300 font-bold text-center leading-none p-0.5 shrink-0">
                    <span>{isEs ? 'SELLO' : isEn ? 'SEAL' : isFr ? 'SCEAU' : 'SOU'}</span>
                    <span>{isEs ? 'OFICIAL' : isEn ? 'OFFICIAL' : isFr ? 'OFFICIEL' : 'OFISYÈL'}</span>
                    {hasValidRnc && (
                      <span className="text-[5px] text-emerald-300 font-mono font-black mt-0.5">RNC✓</span>
                    )}
                  </div>
                </div>

                {/* Barcode Strip */}
                <div className="space-y-0.5">
                  {renderBarcodeLines()}
                  <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 px-0.5">
                    <span>{church.code}</span>
                    <span className="text-amber-300 font-bold">{member.memberId}</span>
                    <span>{member.barcodeToken}</span>
                  </div>
                </div>
              </div>

              {/* Right: High-Resolution Attendance QR Code */}
              <div className="shrink-0 flex flex-col items-center justify-center">
                <div className="p-1.5 bg-white rounded-2xl shadow-2xl border-2 border-amber-400">
                  {qrUrl ? (
                    <img
                      src={qrUrl}
                      alt={`QR Code pou ${member.fullName}`}
                      className="w-20 h-20 sm:w-22 sm:h-22 object-contain"
                    />
                  ) : (
                    <div className="w-20 h-20 flex items-center justify-center text-slate-900 text-xs">
                      QR...
                    </div>
                  )}
                </div>
                <span className="text-[8px] text-amber-300 font-mono font-bold tracking-wider mt-1 uppercase">
                  {scanAtDoorLabel}
                </span>
              </div>
            </div>

            {/* Bottom: Machine Readable Zone (MRZ Lines) */}
            <div className="border-t border-slate-700/80 pt-1">
              <div className="bg-slate-950/90 rounded-lg p-1 font-mono text-[7px] sm:text-[7.5px] text-slate-400 tracking-widest leading-none space-y-0.5 border border-slate-800">
                <div className="truncate">{mrz.line1}</div>
                <div className="truncate">{mrz.line2}</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ACTION BUTTON CONTROLS */}
      <div className="flex flex-wrap items-center justify-center gap-2 w-full pt-1">
        {/* Flip Button */}
        <button
          type="button"
          id={`btn-flip-card-${member.id}`}
          onClick={() => setIsFlipped(!isFlipped)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
        >
          <RotateCw className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
          <span>
            {isEs
              ? isFlipped
                ? 'Ver Anverso (Foto y Datos)'
                : 'Voltear Tarjeta (Ver Reverso / QR)'
              : isEn
              ? isFlipped
                ? 'View Front (Photo & ID)'
                : 'Flip Card (Back & QR)'
              : isFr
              ? isFlipped
                ? 'Voir Recto (Photo & ID)'
                : 'Retourner Carte (Verso & QR)'
              : isFlipped
              ? 'Wè Devan Kat la (Foto & ID)'
              : 'Vire Kat la (Wè Dèyè / QR)'}
          </span>
        </button>

        {/* Copy ID Button */}
        <button
          type="button"
          id={`btn-action-copy-id-${member.id}`}
          onClick={handleCopyId}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-500/30 shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300">
                {isEs ? '¡Copiado!' : isEn ? 'Copied!' : isFr ? 'Copié !' : 'Kopye!'}
              </span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {isEs ? 'Copiar ID' : isEn ? 'Copy ID' : isFr ? 'Copier ID' : 'Kopye ID'}
              </span>
            </>
          )}
        </button>

        {/* Style Selector for Member Domain / Department (5 Styles) */}
        <div className="relative inline-flex items-center">
          <select
            value={badgeDomainStyle}
            onChange={(e) => {
              const s = e.target.value as BadgeDomainStyleId;
              setBadgeDomainStyle(s);
              saveBadgeDomainStyle(s);
              const found = BADGE_DOMAIN_STYLES.find((item) => item.id === s);
              const name = found ? found.name[activeLang] || found.name.ht : s;
              toast.info(
                isEs ? 'Formato de Insignia' : isEn ? 'Badge Format' : isFr ? 'Format du Badge' : 'Fòma Badj',
                name
              );
            }}
            title={
              isEs
                ? 'Cambiar Formato de Dominio en Carnet (5 Formatos)'
                : isEn
                ? 'Change Domain Format on Badge (5 Styles)'
                : isFr
                ? 'Changer le Format du Domaine sur le Badge (5 Styles)'
                : 'Chanje Fòma Domèn sou Badj la (5 Stil)'
            }
            className="appearance-none flex items-center gap-1.5 pl-3 pr-7 py-2 text-xs font-bold rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-slate-700 shadow-md transition-all cursor-pointer focus:outline-none focus:border-amber-400"
          >
            {BADGE_DOMAIN_STYLES.map((st) => (
              <option key={st.id} value={st.id}>
                {st.icon} {st.name[activeLang] || st.name.ht}
              </option>
            ))}
          </select>
          <Layers className="w-3.5 h-3.5 text-amber-400/70 absolute right-2.5 pointer-events-none" />
        </div>

        {/* Print Physical Card Modal (Admins only) */}
        {showPrintButton && (
          <button
            type="button"
            id={`btn-print-card-${member.id}`}
            onClick={handleOpenPrintModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 hover:from-amber-300 hover:to-amber-300 text-slate-950 shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
          >
            <Printer className="w-3.5 h-3.5 text-slate-950" />
            <span>
              {isEs ? 'Imprimir Carnet Físico' : isEn ? 'Print ID Card' : isFr ? 'Imprimer Carte' : 'Enprime Kat Fizik'}
            </span>
          </button>
        )}

        {!compact && (
          <a
            href={getMemberVerificationUrl(member)}
            target="_blank"
            rel="noopener noreferrer"
            id={`btn-verify-preview-${member.id}`}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-600/40 shadow transition-colors cursor-pointer"
            title={isEs ? 'Verificación Oficial para Autoridades' : isFr ? 'Vérification Officielle pour Autorités' : isEn ? 'Official Authority Verification' : 'Verifikasyon Ofisyèl pou Otorite'}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {isEs ? 'Página Oficial' : isFr ? 'Page Officielle' : isEn ? 'Official Page' : 'Paj Verifikasyon'}
            </span>
          </a>
        )}

        {!compact && (
          <button
            type="button"
            id={`btn-download-qr-${member.id}`}
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700 shadow transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {isEs ? 'Descargar QR' : isEn ? 'Download QR' : isFr ? 'Télécharger QR' : 'Telechaje QR'}
            </span>
          </button>
        )}
      </div>

      {/* Physical Card Printing Modal */}
      {showPrintButton && isPrintModalOpen && (
        <PrintMemberCardModal
          church={church}
          initialMember={member}
          language={activeLang}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}
    </div>
  );
};

