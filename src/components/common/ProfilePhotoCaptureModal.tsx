import React, { useState, useEffect, useRef } from 'react';
import { Member, Church, Language } from '../../types';
import { updateMember } from '../../utils/storage';
import { optimizeImageFile } from '../../utils/imageOptimizer';
import { useToast } from '../../context/ToastContext';
import { requestCameraPermission, triggerHapticFeedback } from '../../utils/devicePermissions';
import {
  Camera,
  Upload,
  RefreshCw,
  Check,
  X,
  Trash2,
  User,
  AlertCircle,
  SwitchCamera,
  Timer,
  ShieldCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ProfilePhotoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  church: Church;
  member: Member;
  language?: Language;
  onPhotoSaved?: (updatedMember: Member) => void;
}

export const ProfilePhotoCaptureModal: React.FC<ProfilePhotoCaptureModalProps> = ({
  isOpen,
  onClose,
  church,
  member,
  language = 'ht',
  onPhotoSaved,
}) => {
  const toast = useToast();
  const isEs = language === 'es';
  const isEn = language === 'en';
  const isFr = language === 'fr';

  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [useCountdown, setUseCountdown] = useState<boolean>(false);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Play subtle sound on shutter click via Web Audio API (Zero external assets)
  const playShutterSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.09);
    } catch {
      // AudioContext not allowed or not supported - silently ignore
    }
  };

  // Start Camera Stream with clean mobile permission handling
  const startCamera = async (mode = facingMode) => {
    stopCamera();
    setCameraError(null);
    try {
      const { stream, error } = await requestCameraPermission(mode);
      if (error || !stream) {
        throw new Error(error || (isEs ? 'No se pudo acceder a la cámara.' : 'Pa ka jwenn aksè ak kamera a.'));
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.error('Camera stream error:', err);
      setIsCameraActive(false);
      setCameraError(
        err?.message ||
          (isEs
            ? 'No se pudo acceder a la cámara. Por favor autorice el permiso o use la pestaña de subir archivo.'
            : isFr
            ? 'Impossible d’accéder à la caméra. Veuillez autoriser l’accès ou téléverser une photo.'
            : isEn
            ? 'Unable to access camera. Please allow camera permissions or upload an image.'
            : 'Nou pa ka jwenn aksè ak kamera a. Tanpri pèmèt otorizasyon an oswa telechaje yon foto.')
      );
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Manage camera lifecycle based on modal open state and active tab
  useEffect(() => {
    if (isOpen && activeTab === 'camera' && !capturedDataUrl) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, facingMode, capturedDataUrl]);

  // Handle Capture Snap
  const executeSnap = () => {
    if (!videoRef.current) return;
    playShutterSound();
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 640;

    // Crop to square / passport aspect ratio
    const size = Math.min(width, height);
    const startX = (width - size) / 2;
    const startY = (height - size) / 2;

    canvas.width = 480;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontally if front selfie camera for natural mirror reflection
    if (facingMode === 'user') {
      ctx.translate(480, 0);
      ctx.scale(-1, 1);
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(video, startX, startY, size, size, 0, 0, 480, 480);

    const dataUrl = canvas.toDataURL('image/webp', 0.88);
    setCapturedDataUrl(dataUrl);
    stopCamera();
  };

  const handleTriggerCapture = () => {
    if (useCountdown) {
      setCountdown(3);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            executeSnap();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      executeSnap();
    }
  };

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      toast.error(
        isEs ? 'Archivo muy pesado' : isFr ? 'Fichier trop lourd' : isEn ? 'File too large' : 'Fichye a twò lou',
        isEs ? 'El tamaño máximo es de 12 MB.' : isFr ? 'La taille maximale est de 12 Mo.' : isEn ? 'Max size is 12 MB.' : 'Gwosè maksimòm se 12 MB.'
      );
      return;
    }

    try {
      setIsProcessing(true);
      const optimized = await optimizeImageFile(file, {
        maxWidth: 600,
        maxHeight: 600,
        quality: 0.88,
        format: 'image/webp',
      });
      setCapturedDataUrl(optimized);
    } catch (err) {
      console.error('File optimization error:', err);
      toast.error(
        isEs ? 'Error al procesar foto' : isFr ? 'Erreur de traitement' : isEn ? 'Error processing photo' : 'Erè nan trete foto a',
        isEs ? 'No se pudo optimizar la imagen.' : 'Pa ka prepare foto sa a.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Save Photo to Member Record
  const handleSavePhoto = () => {
    if (!capturedDataUrl) return;

    setIsProcessing(true);
    try {
      const updatedMember: Member = {
        ...member,
        avatarUrl: capturedDataUrl,
        googlePhoto: capturedDataUrl, // Ensure both sources point to updated photo
      };

      updateMember(church.id, updatedMember);

      // Notify parent & dispatch real-time custom event
      if (onPhotoSaved) {
        onPhotoSaved(updatedMember);
      }
      window.dispatchEvent(
        new CustomEvent('omnichurch_member_updated', { detail: updatedMember })
      );

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }

      toast.success(
        isEs
          ? '¡Foto Oficial Actualizada!'
          : isFr
          ? 'Photo Officielle Mise à Jour !'
          : isEn
          ? 'Official Photo Updated!'
          : 'Foto Ofisyèl Mete Ajou!',
        isEs
          ? `La fotografía de ${member.fullName} ya está lista en el carnet oficial de identidad.`
          : isFr
          ? `La photo de ${member.fullName} est prête sur sa carte d’identité officielle.`
          : isEn
          ? `The photo for ${member.fullName} is now live on your official member ID card.`
          : `Foto ${member.fullName} an parèt kounye a sou kat idantite ofisyèl la.`
      );

      onClose();
    } catch (err: any) {
      toast.error(
        isEs ? 'Error al guardar foto' : isFr ? 'Erreur d’enregistrement' : isEn ? 'Error saving photo' : 'Erè nan anrejistre foto a',
        err?.message || (isEs ? 'Ocurrió un error.' : 'Yon erè rive.')
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Remove current photo
  const handleRemovePhoto = () => {
    setIsProcessing(true);
    try {
      const updatedMember: Member = {
        ...member,
        avatarUrl: undefined,
        googlePhoto: undefined,
      };

      updateMember(church.id, updatedMember);

      if (onPhotoSaved) {
        onPhotoSaved(updatedMember);
      }
      window.dispatchEvent(
        new CustomEvent('omnichurch_member_updated', { detail: updatedMember })
      );

      setCapturedDataUrl(null);
      toast.info(
        isEs ? 'Foto Removida' : isFr ? 'Photo Retirée' : isEn ? 'Photo Removed' : 'Foto Retire',
        isEs
          ? 'Se ha restablecido el avatar por defecto.'
          : isFr
          ? 'L’avatar par défaut a été réinitialisé.'
          : isEn
          ? 'Default avatar has been restored.'
          : 'Avatar pa defo a retabli.'
      );
      onClose();
    } catch (err: any) {
      toast.error(
        isEs ? 'Error' : isEn ? 'Error' : isFr ? 'Erreur' : 'Erè',
        err?.message || (isEs ? 'No se pudo remover la foto.' : 'Pa ka retire foto a.')
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetake = () => {
    setCapturedDataUrl(null);
    if (activeTab === 'camera') {
      startCamera(facingMode);
    }
  };

  if (!isOpen) return null;

  const currentPhoto = member.googlePhoto || member.avatarUrl;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative max-w-lg w-full bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-900/90 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-slate-950 shadow-md">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white leading-tight">
                {isEs
                  ? 'Foto Oficial para Carnet de Miembro'
                  : isEn
                  ? 'Official Member ID Photo'
                  : isFr
                  ? 'Photo Officielle Carte de Membre'
                  : 'Foto Ofisyèl Kat Manm'}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {member.fullName} ({member.memberId})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title={isEs ? 'Cerrar' : isFr ? 'Fermer' : isEn ? 'Close' : 'Fèmen'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TABS: Live Camera vs Upload */}
        <div className="px-5 pt-3 bg-slate-900/50 border-b border-slate-800/80 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('camera');
              setCapturedDataUrl(null);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-xl text-xs font-bold transition-colors cursor-pointer border-b-2 ${
              activeTab === 'camera'
                ? 'border-amber-400 text-amber-300 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {isEs ? '📸 Cámara en Vivo' : isFr ? '📸 Caméra en Direct' : isEn ? '📸 Live Camera' : '📸 Kamera an Dirèk'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('upload');
              stopCamera();
              setCapturedDataUrl(null);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-xl text-xs font-bold transition-colors cursor-pointer border-b-2 ${
              activeTab === 'upload'
                ? 'border-amber-400 text-amber-300 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {isEs ? '📁 Subir Archivo' : isFr ? '📁 Téléverser Image' : isEn ? '📁 Upload Photo' : '📁 Telechaje Fichye'}
            </span>
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* CAMERA TAB */}
          {activeTab === 'camera' && (
            <div className="space-y-3">
              {!capturedDataUrl ? (
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-square max-w-[340px] mx-auto border-2 border-amber-400/40 shadow-xl flex items-center justify-center">
                  {/* Flashing shutter effect */}
                  {isFlashing && (
                    <div className="absolute inset-0 bg-white z-30 animate-fadeOut" />
                  )}

                  {/* Video Stream Element */}
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className={`w-full h-full object-cover ${
                      facingMode === 'user' ? 'scale-x-[-1]' : ''
                    }`}
                  />

                  {/* Passport Oval Alignment Guide Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6 z-10">
                    <div className="w-48 h-60 border-2 border-dashed border-amber-400/70 rounded-[50%] shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] flex items-center justify-center">
                      <div className="text-center px-4">
                        <span className="text-[10px] font-bold text-amber-300 bg-black/70 px-2 py-0.5 rounded-full backdrop-blur-sm">
                          {isEs
                            ? 'Alinee el rostro aquí'
                            : isFr
                            ? 'Alignez le visage ici'
                            : isEn
                            ? 'Align face inside oval'
                            : 'Pozisyone figi w anndan an'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Countdown number badge */}
                  {countdown !== null && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40">
                      <span className="text-6xl font-black text-amber-400 animate-ping">
                        {countdown}
                      </span>
                    </div>
                  )}

                  {/* Camera Error Message */}
                  {cameraError && (
                    <div className="absolute inset-0 z-20 bg-slate-950/95 p-6 flex flex-col items-center justify-center text-center space-y-3">
                      <AlertCircle className="w-10 h-10 text-rose-400" />
                      <p className="text-xs text-rose-200">{cameraError}</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startCamera(facingMode)}
                          className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>{isEs ? 'Reintentar' : isFr ? 'Réessayer' : isEn ? 'Retry' : 'Eseye Ankò'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('upload')}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 text-cyan-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-cyan-400/30"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{isEs ? 'Subir Foto' : isFr ? 'Téléverser' : isEn ? 'Upload' : 'Telechaje'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Captured Preview Box */
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-square max-w-[320px] mx-auto border-2 border-emerald-400/70 shadow-2xl">
                  <img
                    src={capturedDataUrl}
                    alt="Captured preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-emerald-500/90 text-slate-950 text-[10px] font-black tracking-wider uppercase flex items-center gap-1 shadow-lg backdrop-blur-sm">
                    <Check className="w-3 h-3" />
                    <span>{isEs ? 'Foto Capturada' : isFr ? 'Photo Capturée' : isEn ? 'Captured' : 'Foto Pare'}</span>
                  </div>
                </div>
              )}

              {/* Camera Controls */}
              {!capturedDataUrl ? (
                <div className="flex items-center justify-center gap-3 pt-2">
                  {/* Switch Camera Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const next = facingMode === 'user' ? 'environment' : 'user';
                      setFacingMode(next);
                      startCamera(next);
                    }}
                    className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer shadow"
                    title={isEs ? 'Cambiar cámara' : isFr ? 'Changer caméra' : isEn ? 'Switch camera' : 'Chanje kamera'}
                  >
                    <SwitchCamera className="w-5 h-5 text-cyan-400" />
                  </button>

                  {/* Shutter Snap Button */}
                  <button
                    type="button"
                    id="btn-shutter-snap-photo"
                    onClick={handleTriggerCapture}
                    disabled={!isCameraActive || !!cameraError || countdown !== null}
                    className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm flex items-center gap-2 shadow-lg shadow-amber-400/30 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <div className="w-4 h-4 rounded-full border-2 border-slate-950 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-slate-950" />
                    </div>
                    <span>
                      {isEs
                        ? '📸 Tomar Foto Ahora'
                        : isFr
                        ? '📸 Prendre la Photo'
                        : isEn
                        ? '📸 Take Photo Now'
                        : '📸 Pran Foto a Kounye a'}
                    </span>
                  </button>

                  {/* 3s Timer Toggle */}
                  <button
                    type="button"
                    onClick={() => setUseCountdown(!useCountdown)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer shadow ${
                      useCountdown
                        ? 'bg-amber-400/20 text-amber-300 border-amber-400/50 ring-1 ring-amber-400/30'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
                    }`}
                    title={isEs ? 'Temporizador 3s' : isFr ? 'Minuteur 3s' : isEn ? '3s Timer' : 'Revèy 3s'}
                  >
                    <Timer className="w-5 h-5" />
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {/* UPLOAD TAB */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              {!capturedDataUrl ? (
                <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-700 hover:border-amber-400 rounded-3xl bg-slate-900/60 hover:bg-slate-900 cursor-pointer transition-all space-y-3 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isProcessing}
                  />
                  <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-bold text-white block">
                      {isEs
                        ? 'Seleccione una foto desde su galería o archivos'
                        : isFr
                        ? 'Sélectionnez une photo depuis votre galerie'
                        : isEn
                        ? 'Select photo from gallery or files'
                        : 'Chwazi yon bèl foto nan galeri oswa dosye w'}
                    </span>
                    <p className="text-[11px] text-slate-400">
                      PNG, JPG, JPEG, WEBP • Max 12 MB
                    </p>
                  </div>
                </label>
              ) : (
                /* Uploaded Preview Box */
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-square max-w-[320px] mx-auto border-2 border-emerald-400/70 shadow-2xl">
                  <img
                    src={capturedDataUrl}
                    alt="Uploaded preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-emerald-500/90 text-slate-950 text-[10px] font-black tracking-wider uppercase flex items-center gap-1 shadow-lg backdrop-blur-sm">
                    <Check className="w-3 h-3" />
                    <span>{isEs ? 'Foto Cargada' : isFr ? 'Photo Chargée' : isEn ? 'Photo Ready' : 'Foto Pare'}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ACTION BUTTONS (CONFIRM / RETAKE) */}
          {capturedDataUrl && (
            <div className="space-y-3 pt-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleRetake}
                  disabled={isProcessing}
                  className="flex-1 py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-slate-400" />
                  <span>
                    {isEs ? 'Tomar Otra Foto' : isFr ? 'Prendre une Autre' : isEn ? 'Retake Photo' : 'Pran yon Lòt'}
                  </span>
                </button>

                <button
                  type="button"
                  id="btn-confirm-save-member-photo"
                  onClick={handleSavePhoto}
                  disabled={isProcessing}
                  className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                  <span>
                    {isEs ? 'Guardar en mi Carnet' : isFr ? 'Enregistrer sur ma Carte' : isEn ? 'Save to my ID Card' : 'Sove sou Kat Mwen'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* CURRENT PHOTO & REMOVE OPTION */}
          {currentPhoto && !capturedDataUrl && (
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src={currentPhoto}
                  alt={member.fullName}
                  className="w-10 h-10 rounded-xl object-cover border border-amber-400/40"
                />
                <div>
                  <span className="text-[11px] font-bold text-slate-200 block">
                    {isEs ? 'Foto Actual Activa' : isFr ? 'Photo Actuelle' : isEn ? 'Current Photo' : 'Foto Ou Genyen Kounye a'}
                  </span>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    {isEs ? 'Mostrándose en el carnet' : isFr ? 'Visible sur la carte' : isEn ? 'Active on ID card' : 'Ap parèt sou kat la'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={isProcessing}
                className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  {isEs ? 'Eliminar Foto' : isFr ? 'Supprimer' : isEn ? 'Remove' : 'Retire Foto'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
