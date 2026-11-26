import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Camera,
  RefreshCw,
  X,
  Zap,
  Flashlight,
  FlashlightOff,
  ZoomIn,
  CircleQuestionMark,
  Sun,
  Layers,
  ShieldCheck,
  CircleCheck,
  TriangleAlert,
  CircleX,
  UserCheck,
  Search,
  VolumeX,
  Volume2,
  Upload,
} from 'lucide-react';
import { Church, AttendanceRecord, Language, ServiceSession, Member } from '../types';
import { useToast } from '../context/ToastContext';
import { subscribeSyncStatus, triggerOfflineSync } from '../utils/offlineQueue';
import {
  getServicesByChurch,
  getActiveService,
  getMembersByChurch,
  isDeviceOnline,
  isServiceEnded,
  ScanResult,
} from '../utils/storage';
import { firestoreGetChurchMembersList } from '../services/firestoreService';
import { isServiceCurrentlyActive } from '../utils/permissions';
import { recordAttendanceScanUnified, buildCanonicalBarcodeToken } from '../utils/qrSyncLayer';
import { SERVICE_CATEGORIES } from '../utils/i18n';
import {
  scannerAudio,
  decodeFrameMultiPass,
  decodeImageFile,
} from '../utils/scannerEngine';
import {
  triggerHapticFeedback,
  requestCameraPermission,
  hasTorchSupport,
  getCameraZoomRange,
  setTorchState,
  setCameraZoom,
  resetCameraPermissionPreferences,
} from '../utils/devicePermissions';

type ZoomRangeState = {
  supported: boolean;
  min: number;
  max: number;
  current: number;
  step: number;
};

export interface QrScannerModalProps {
  church: Church;
  isOpen: boolean;
  language?: Language;
  onClose: () => void;
  onAttendanceRecorded?: (record: AttendanceRecord) => void;
  onScanSuccess?: (record: AttendanceRecord) => void;
  restrictToActiveService?: boolean;
  operatorLabel?: string;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  church,
  isOpen,
  language = 'ht',
  onClose,
  onAttendanceRecorded,
  onScanSuccess,
  restrictToActiveService = false,
  operatorLabel,
}) => {
  const isEs = language === 'es';
  const isEn = language === 'en';
  const isFr = language === 'fr';
  const toast = useToast();

  const [services, setServices] = useState<ServiceSession[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [members, setMembers] = useState<Member[]>([]);
  const [manualCode, setManualCode] = useState<string>('');
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [recentScans, setRecentScans] = useState<ScanResult[]>([]);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isCameraStarting, setIsCameraStarting] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [zoomRange, setZoomRange] = useState<ZoomRangeState>({
    supported: false,
    min: 1,
    max: 1,
    current: 1,
    step: 0.1,
  });
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [activeEnhancement, setActiveEnhancement] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [offlinePendingCount, setOfflinePendingCount] = useState<number>(0);
  const [isSyncingOffline, setIsSyncingOffline] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isScanningRef = useRef<boolean>(false);
  const framePassCounterRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refs synced to state so long-lived requestAnimationFrame callbacks never read stale closures
  const selectedServiceIdRef = useRef<string>('');
  const servicesRef = useRef<ServiceSession[]>([]);
  const restrictToActiveServiceRef = useRef<boolean>(restrictToActiveService);
  const isAudioMutedRef = useRef<boolean>(isAudioMuted);
  const zoomLevelRef = useRef<number>(zoomLevel);
  const zoomRangeRef = useRef<ZoomRangeState>(zoomRange);
  const facingModeRef = useRef<'environment' | 'user'>(facingMode);
  const scanCooldownUntilRef = useRef<number>(0);
  const lastDetectedCodeRef = useRef<{ code: string; at: number } | null>(null);
  const enhancementTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    selectedServiceIdRef.current = selectedServiceId;
  }, [selectedServiceId]);

  useEffect(() => {
    servicesRef.current = services;
  }, [services]);

  useEffect(() => {
    restrictToActiveServiceRef.current = restrictToActiveService;
  }, [restrictToActiveService]);

  useEffect(() => {
    isAudioMutedRef.current = isAudioMuted;
  }, [isAudioMuted]);

  useEffect(() => {
    zoomLevelRef.current = zoomLevel;
  }, [zoomLevel]);

  useEffect(() => {
    zoomRangeRef.current = zoomRange;
  }, [zoomRange]);

  useEffect(() => {
    facingModeRef.current = facingMode;
  }, [facingMode]);

  useEffect(() => {
    const unsub = subscribeSyncStatus((count, syncing) => {
      setOfflinePendingCount(count);
      setIsSyncingOffline(syncing);
    });
    return unsub;
  }, []);

  const currentService = services.find((s) => s.id === selectedServiceId);
  const categoryConfig = currentService ? SERVICE_CATEGORIES[currentService.category] : null;

  const processScanCode = async (
    code: string,
    method: 'qr_scan' | 'barcode' | 'manual' = 'qr_scan',
    _enhancement?: string
  ) => {
    const activeSrvId = selectedServiceIdRef.current;
    if (!code.trim() || !activeSrvId) return;

    const activeSrv = servicesRef.current.find((s) => s.id === activeSrvId);

    const res = await recordAttendanceScanUnified({
      currentChurchId: church.id,
      rawCode: code.trim(),
      serviceId: activeSrvId,
      method,
      recordedBy: operatorLabel || 'Ultra Scanner Live',
      requireActiveOngoingService: Boolean(restrictToActiveServiceRef.current),
    });

    if (!isMountedRef.current) return;

    setLastResult(res);
    setRecentScans((prev) => [res, ...prev.slice(0, 7)]);

    if (!isAudioMutedRef.current) {
      if (res.success) {
        scannerAudio.play('success');
      } else if (res.duplicate) {
        scannerAudio.play('duplicate');
      } else {
        scannerAudio.play('error');
      }
    }

    triggerHapticFeedback(res.success ? [40, 50, 40] : res.duplicate ? [80, 80] : 120);

    if (res.success && res.record) {
      if (res.isOfflineSaved) {
        toast.info(
          res.isVisitor
            ? isEs
              ? '💾 Visitante Guardado (Offline)'
              : isEn
              ? '💾 Visitor Saved Locally (Offline)'
              : isFr
              ? '💾 Visiteur Enregistré (Offline)'
              : '💾 Vizitè Sove Lokalman (Offline)'
            : isEs
            ? '💾 Asistencia Guardada Localmente (Offline)'
            : isEn
            ? '💾 Attendance Saved Locally (Offline)'
            : isFr
            ? '💾 Présence Enregistrée Localement (Offline)'
            : '💾 Prezans Sove Lokalman (Offline)',
          isEs
            ? `${res.member?.fullName} (${res.member?.memberId})${res.homeChurchName ? ` • ${res.homeChurchName}` : ''} — Guardado localmente. Se sincronizará automáticamente al volver la conexión.`
            : isEn
            ? `${res.member?.fullName} (${res.member?.memberId})${res.homeChurchName ? ` • ${res.homeChurchName}` : ''} — Saved locally. Will auto-sync when connection returns.`
            : isFr
            ? `${res.member?.fullName} (${res.member?.memberId})${res.homeChurchName ? ` • ${res.homeChurchName}` : ''} — Enregistré localement. Se synchronisera automatiquement dès le retour de la connexion.`
            : `${res.member?.fullName} (${res.member?.memberId})${res.homeChurchName ? ` • ${res.homeChurchName}` : ''} — Done anrejistre lokalman. L ap senkronize otomatikman lè koneksyon an retounen.`
        );
      } else {
        toast.success(
          res.isVisitor
            ? isEs
              ? '¡Visitante Registrado! ✓'
              : isEn
              ? 'Visitor Checked In! ✓'
              : isFr
              ? 'Visiteur Enregistré ! ✓'
              : 'Prezans Vizitè Anrejistre! ✓'
            : isEs
            ? '¡Asistencia Registrada!'
            : isEn
            ? 'Attendance Recorded!'
            : isFr
            ? 'Présence Enregistrée !'
            : 'Prezans Anrejistre!',
          `${res.member?.fullName} (${res.member?.memberId})${res.homeChurchName ? ` • Vizitè (${res.homeChurchName})` : ''} • ${activeSrv?.title || (isEs ? 'Servicio' : isEn ? 'Service' : isFr ? 'Service' : 'Sèvis')}`
        );
      }

      try {
        confetti({
          particleCount: 45,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#F59E0B', '#10B981', '#6366F1', '#38BDF8', '#FCD34D'],
          disableForReducedMotion: true,
        });
      } catch {
        // Ignore confetti errors in reduced motion or restricted contexts
      }

      if (onAttendanceRecorded) {
        onAttendanceRecorded(res.record);
      }
      if (onScanSuccess) {
        onScanSuccess(res.record);
      }
    } else if (res.duplicate) {
      toast.warning(
        isEs
          ? 'Asistencia Ya Registrada'
          : isEn
          ? 'Attendance Already Recorded'
          : isFr
          ? 'Présence Déjà Enregistrée'
          : 'Prezans Deja Anrejistre',
        isEs
          ? `${res.member?.fullName || 'El miembro'} ya está marcado como presente en este servicio.`
          : isEn
          ? `${res.member?.fullName || 'Member'} is already marked present for this service.`
          : isFr
          ? `${res.member?.fullName || 'Le membre'} est déjà noté présent pour ce service.`
          : `${res.member?.fullName || 'Manm nan'} deja make prezan nan sèvis sa a.`
      );
    } else {
      toast.error(
        isEs
          ? 'Acceso Denegado / Error de Escaneo'
          : isEn
          ? 'Access Denied / Scan Error'
          : isFr
          ? 'Accès Refusé / Erreur de Scan'
          : 'Aksè Refize / Erè Scan',
        res.errorMessage ||
          (isEs
            ? 'Este código no es reconocido para esta iglesia.'
            : isEn
            ? 'This code is not recognized for this church.'
            : isFr
            ? 'Ce code n’est pas reconnu pour cette église.'
            : 'Kòd sa a pa rekonèt pou legliz sa a.')
      );
    }

    setManualCode('');
  };

  const processScanCodeRef = useRef(processScanCode);
  processScanCodeRef.current = processScanCode;

  const scanVideoFrame = async () => {
    if (!videoRef.current || !canvasRef.current || !isScanningRef.current) return;

    const now = Date.now();
    // During post-detection cooldown, keep the animation loop alive cleanly instead of terminating it
    if (now < scanCooldownUntilRef.current) {
      if (isScanningRef.current) {
        animationFrameId.current = requestAnimationFrame(scanVideoFrame);
      }
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState >= video.HAVE_CURRENT_DATA && video.videoWidth > 0 && ctx) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const curZoom = zoomLevelRef.current;
      const curZoomRange = zoomRangeRef.current;
      const useDigitalZoomCrop = curZoom > 1 && !curZoomRange.supported;

      if (useDigitalZoomCrop) {
        const cropWidth = canvas.width / curZoom;
        const cropHeight = canvas.height / curZoom;
        const startX = (canvas.width - cropWidth) / 2;
        const startY = (canvas.height - cropHeight) / 2;
        ctx.drawImage(video, startX, startY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      try {
        // When digital zoom crop is active, feed the cropped canvas to native & jsQR decoders
        const detection = await decodeFrameMultiPass(
          useDigitalZoomCrop ? canvas : video,
          canvas,
          framePassCounterRef.current++
        );

        if (detection && detection.code) {
          const detectedCode = detection.code.trim();
          const prevDetected = lastDetectedCodeRef.current;
          const isSameCodeInCooldown =
            prevDetected && prevDetected.code === detectedCode && Date.now() - prevDetected.at < 3500;

          if (!isSameCodeInCooldown) {
            lastDetectedCodeRef.current = { code: detectedCode, at: Date.now() };
            scanCooldownUntilRef.current = Date.now() + 1800;

            if (detection.enhancementLabel) {
              setActiveEnhancement(detection.enhancementLabel);
              if (enhancementTimerRef.current) clearTimeout(enhancementTimerRef.current);
              enhancementTimerRef.current = setTimeout(() => {
                if (isMountedRef.current) setActiveEnhancement(null);
              }, 1800);
            }

            void processScanCodeRef.current(detectedCode, 'qr_scan', detection.enhancementLabel);
          }
        }
      } catch (err) {
        console.warn('Frame detection cycle error:', err);
      }
    }

    if (isScanningRef.current) {
      animationFrameId.current = requestAnimationFrame(scanVideoFrame);
    }
  };

  const stopCamera = () => {
    isScanningRef.current = false;
    scanCooldownUntilRef.current = 0;
    lastDetectedCodeRef.current = null;
    if (enhancementTimerRef.current) {
      clearTimeout(enhancementTimerRef.current);
      enhancementTimerRef.current = null;
    }
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsCameraStarting(false);
    setIsTorchOn(false);
    setActiveEnhancement(null);
  };

  const startCamera = async (overrideFacing?: 'environment' | 'user') => {
    setCameraError(null);
    setIsCameraStarting(true);
    const targetFacing = overrideFacing || facingModeRef.current;

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      const { stream, error } = await requestCameraPermission(targetFacing);
      if (error || !stream) {
        throw new Error(error || (isEs ? 'Cámara no disponible.' : 'Kamera pa disponib.'));
      }

      if (!isMountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      setHasTorch(hasTorchSupport(stream));
      setIsTorchOn(false);
      const zRange = getCameraZoomRange(stream);
      setZoomRange(zRange);
      zoomRangeRef.current = zRange;
      setZoomLevel(1);
      zoomLevelRef.current = 1;
      setIsCameraActive(true);

      const attachStreamToVideo = async () => {
        if (!isMountedRef.current) return;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.setAttribute('autoplay', 'true');
          videoRef.current.muted = true;
          try {
            await videoRef.current.play();
          } catch (playErr) {
            console.warn('Video play auto-resume warning:', playErr);
          }
          isScanningRef.current = true;
          scanCooldownUntilRef.current = 0;
          if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
          }
          animationFrameId.current = requestAnimationFrame(scanVideoFrame);
          setIsCameraStarting(false);
        } else {
          setTimeout(attachStreamToVideo, 50);
        }
      };

      await attachStreamToVideo();
    } catch (err) {
      console.warn('Camera access denied or unavailable', err);
      setIsCameraStarting(false);
      setIsCameraActive(false);
      const errorMsg =
        err instanceof Error
          ? err.message
          : isEs
          ? 'Cámara no disponible o denegada.'
          : isEn
          ? 'Camera unavailable or permission denied.'
          : isFr
          ? 'Caméra indisponible ou accès refusé.'
          : 'Kamera pa disponib oswa refize.';
      setCameraError(
        isEs
          ? `No se puede abrir la cámara (${errorMsg}). Puede ingresar el ID del miembro manualmente o subir una foto abajo.`
          : isEn
          ? `Unable to open camera (${errorMsg}). You can enter Member ID manually or upload a photo below.`
          : isFr
          ? `Impossible d’ouvrir la caméra (${errorMsg}). Vous pouvez saisir l’ID manuellement ou importer une photo ci-dessous.`
          : `Kamera pa kapab ouvri (${errorMsg}). Ou ka antre ID manm nan manyèlman oswa enpòte yon foto anba a.`
      );
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    const refreshAvailableServices = (): ServiceSession[] => {
      const churchServices = getServicesByChurch(church.id);
      return churchServices.filter((s) => isServiceCurrentlyActive(s, isServiceEnded));
    };

    const availableServices = refreshAvailableServices();
    setServices(availableServices);
    servicesRef.current = availableServices;

    const currentActive = getActiveService(church.id);
    const activeSrv =
      (currentActive && availableServices.find((s) => s.id === currentActive.id)) ||
      availableServices[0];
    const initialServiceId = activeSrv ? activeSrv.id : '';
    setSelectedServiceId(initialServiceId);
    selectedServiceIdRef.current = initialServiceId;

    const localMembers = getMembersByChurch(church.id);
    setMembers(localMembers);
    setLastResult(null);
    lastDetectedCodeRef.current = null;
    scanCooldownUntilRef.current = 0;

    // Background refresh latest members from cloud when online so mobile/multi-device registrations appear right away
    let cancelled = false;
    if (isDeviceOnline()) {
      firestoreGetChurchMembersList(church.id)
        .then((remoteMembers) => {
          if (cancelled || !remoteMembers || remoteMembers.length === 0) return;
          const mergedMap = new Map<string, Member>();
          for (const m of localMembers) mergedMap.set(m.id, m);
          for (const rm of remoteMembers) {
            const rawStatus = (rm as { isDeleted?: boolean; status?: string });
            if (!rawStatus.isDeleted && rawStatus.status !== 'deleted') {
              mergedMap.set(rm.id, rm);
            }
          }
          setMembers(Array.from(mergedMap.values()));
        })
        .catch(() => {
          // Local member list already loaded cleanly
        });
    }

    let autoOpenTimer: ReturnType<typeof setTimeout> | null = null;
    if (activeSrv) {
      autoOpenTimer = setTimeout(() => {
        if (!cancelled) {
          startCamera();
        }
      }, 120);
    }

    // Watch for scheduled service end-time expiration while scanner modal stays open
    const expiryWatcher = setInterval(() => {
      if (cancelled || !isMountedRef.current) return;
      const stillActive = refreshAvailableServices();
      setServices(stillActive);
      servicesRef.current = stillActive;

      const currentId = selectedServiceIdRef.current;
      if (currentId && !stillActive.some((s) => s.id === currentId)) {
        const nextSrv = stillActive[0];
        const nextId = nextSrv ? nextSrv.id : '';
        setSelectedServiceId(nextId);
        selectedServiceIdRef.current = nextId;
        if (!nextSrv) {
          stopCamera();
          toast.warning(
            isEs
              ? 'Servicio Finalizado'
              : isEn
              ? 'Service Ended'
              : isFr
              ? 'Culte Terminé'
              : 'Sèvis la Fini',
            isEs
              ? 'El servicio alcanzó su hora de cierre y ya no puede recibir asistencia.'
              : isEn
              ? 'This service reached its scheduled end time and can no longer record attendance.'
              : isFr
              ? 'Ce service a atteint son heure de fin et ne peut plus enregistrer de présences.'
              : 'Sèvis sa a rive nan lè finisman li epi li pa kapab pran prezans ankò.'
          );
        }
      }
    }, 15000);

    return () => {
      cancelled = true;
      clearInterval(expiryWatcher);
      if (autoOpenTimer) clearTimeout(autoOpenTimer);
      stopCamera();
    };
  }, [isOpen, church.id, restrictToActiveService]);

  const handleToggleTorch = async () => {
    if (!streamRef.current) return;
    const nextState = !isTorchOn;
    const success = await setTorchState(streamRef.current, nextState);
    if (success) {
      setIsTorchOn(nextState);
    } else {
      toast.info(
        isEs ? 'Flash / Linterna no soportada' : 'Flash pa sipòte sou kamera sa a',
        isEs
          ? 'El hardware de su cámara no permite controlar el flash directamente.'
          : 'Kamera aparèy la pa pèmèt kontwòl flash dirèk.'
      );
    }
  };

  const handleFlipCamera = async () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    facingModeRef.current = nextFacing;
    stopCamera();
    await startCamera(nextFacing);
  };

  const handleToggleZoom = async () => {
    const nextZoom = zoomLevel === 1 ? 2 : 1;
    setZoomLevel(nextZoom);
    zoomLevelRef.current = nextZoom;
    if (zoomRange.supported && streamRef.current) {
      await setCameraZoom(streamRef.current, nextZoom);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingFile(true);
    try {
      const detection = await decodeImageFile(file);
      if (detection && detection.code) {
        toast.success(
          isEs
            ? '¡Código Detectado de la Foto!'
            : isEn
            ? 'Code Detected from Photo!'
            : isFr
            ? 'Code Détecté depuis la Photo !'
            : 'Kòd Detekte nan Foto a!',
          detection.enhancementLabel || (isEs ? 'Imagen decodificada con éxito' : 'Foto a trete avèk siksè')
        );
        await processScanCode(detection.code, 'qr_scan', detection.enhancementLabel);
      } else {
        toast.error(
          isEs
            ? 'No se pudo detectar código QR'
            : isEn
            ? 'Could not detect QR code'
            : isFr
            ? 'Impossible de détecter le code QR'
            : 'Pa ka detekte kòd QR nan foto a',
          isEs
            ? 'Asegúrese de que el código QR esté bien enfocado y no tenga sombras excesivas.'
            : isEn
            ? 'Ensure the QR code is in focus and without excessive shadows.'
            : isFr
            ? 'Vérifiez que le code QR soit bien net et sans reflets excessifs.'
            : 'Asire w ke kòd QR la klè, li pa twò flou epi li parèt konplè.'
        );
      }
    } catch (err) {
      console.error('File scan error:', err);
      toast.error(
        isEs
          ? 'Error al procesar la foto'
          : isEn
          ? 'Error processing photo'
          : isFr
          ? 'Erreur lors du traitement'
          : 'Erè pandan tretman foto a'
      );
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0F172A] rounded-2xl shadow-2xl border border-slate-700/80 overflow-hidden my-auto max-h-[92vh] flex flex-col text-slate-200">
        {/* Header */}
        <div className="bg-[#1E293B] text-white p-4 flex items-center justify-between border-b border-slate-700/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base text-white">
                  {isEs
                    ? 'Escanear Asistencia & Código QR'
                    : isEn
                    ? 'Scan Attendance & QR Code'
                    : isFr
                    ? 'Scanner Présence & Code QR'
                    : 'Scan Prezans & Kòd QR'}
                </h3>
                <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-mono font-semibold">
                  {church.code}
                </span>
                {isDeviceOnline() ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Online
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    {isEs
                      ? 'Offline (Auto-Sync)'
                      : isEn
                      ? 'Offline (Auto-Sync)'
                      : isFr
                      ? 'Hors-ligne (Auto-Sync)'
                      : 'Offline (Oto-Senk)'}
                  </span>
                )}
                {offlinePendingCount > 0 && (
                  <button
                    type="button"
                    onClick={() => triggerOfflineSync()}
                    title={
                      isEs
                        ? 'Sincronizar ahora'
                        : isFr
                        ? 'Synchroniser maintenant'
                        : isEn
                        ? 'Sync now'
                        : 'Senkronize kounye a'
                    }
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold animate-pulse cursor-pointer hover:bg-blue-500/30 transition-colors"
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${isSyncingOffline ? 'animate-spin' : ''}`} />
                    <span>
                      {offlinePendingCount}{' '}
                      {isEs ? 'en cola' : isFr ? 'en attente' : isEn ? 'queued' : 'nan ke'}
                    </span>
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {isEs
                  ? 'Detección automática de servicios, guardado offline y prevención de duplicados'
                  : isEn
                  ? 'Automatic service detection, offline storage and duplicate attendance prevention'
                  : isFr
                  ? 'Détection automatique des cultes, sauvegarde hors-ligne et prévention des doublons'
                  : 'Deteksyon otomatik sèvis, sovgad lokal offline ak prevansyon doub prezans'}
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-scanner-modal"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Service Selector Bar */}
        <div className="bg-[#1E293B]/70 border-b border-slate-700/80 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              {currentService ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500/80" />
              )}
            </span>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 block">
                {isEs
                  ? 'Servicio Activo para Escaneo (Detección Automática)'
                  : isEn
                  ? 'Active Service for Scanning (Auto-Detection)'
                  : isFr
                  ? 'Service Actif pour Scanner (Détection Auto)'
                  : 'Sèvis Aktif pou Scan (Deteksyon Otomatik)'}
              </span>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">
                  {currentService
                    ? currentService.title
                    : isEs
                    ? 'Ningún servicio activo'
                    : isEn
                    ? 'No active service'
                    : isFr
                    ? 'Aucun service actif'
                    : 'Pa gen sèvis aktif'}
                </h4>
                {categoryConfig && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold border bg-slate-900 border-slate-700 text-slate-300">
                    {categoryConfig.name[language] || categoryConfig.name.ht}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {restrictToActiveService || services.length === 0 ? (
              <span
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold whitespace-nowrap ${
                  services.length > 0
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                }`}
              >
                {services.length > 0
                  ? isEs
                    ? '🟢 Solo Servicio en Curso'
                    : isEn
                    ? '🟢 Active Service Only'
                    : isFr
                    ? '🟢 Service Actif Uniquement'
                    : '🟢 Sèvis an Kou Sèlman'
                  : isEs
                  ? 'Sin Servicio Activo'
                  : isEn
                  ? 'No Active Service'
                  : isFr
                  ? 'Aucun Service Actif'
                  : 'Pa gen Sèvis Aktif'}
              </span>
            ) : (
              <>
                <label
                  htmlFor="select-scan-service"
                  className="text-xs text-slate-400 font-medium whitespace-nowrap"
                >
                  {isEs
                    ? 'Cambiar Servicio:'
                    : isEn
                    ? 'Switch Service:'
                    : isFr
                    ? 'Changer de Culte :'
                    : 'Chanje Sèvis:'}
                </label>
                <select
                  id="select-scan-service"
                  value={selectedServiceId}
                  onChange={(e) => {
                    setSelectedServiceId(e.target.value);
                    selectedServiceIdRef.current = e.target.value;
                  }}
                  className="text-xs bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 font-medium text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-400"
                >
                  {services.map((srv) => (
                    <option key={srv.id} value={srv.id}>
                      {srv.isOpenForAttendance
                        ? isEs
                          ? '🟢 (ACTIVO) '
                          : isEn
                          ? '🟢 (ACTIVE) '
                          : isFr
                          ? '🟢 (ACTIF) '
                          : '🟢 (AKTIF) '
                        : ''}
                      {srv.title} ({srv.date})
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {services.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-amber-500/30 text-center space-y-2">
              <h4 className="text-sm font-bold text-amber-300">
                {isEs
                  ? 'No hay ningún servicio activo en curso'
                  : isEn
                  ? 'No ongoing active service right now'
                  : isFr
                  ? 'Aucun service actif en cours actuellement'
                  : 'Pa gen okenn sèvis ki an kou kounye a'}
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {restrictToActiveService
                  ? isEs
                    ? 'El rol de Recepción solo puede escanear asistencia cuando la administración abre un servicio en curso.'
                    : isEn
                    ? 'The Reception role can only scan attendance when an administrator opens an active service.'
                    : isFr
                    ? 'Le rôle Réception peut uniquement scanner les présences lorsqu’un culte est ouvert.'
                    : 'Wòl Resepsyon an kapab eskane prezans sèlman lè gen yon sèvis ki louvri epi ki an kou.'
                  : isEs
                  ? 'Los servicios cerrados o finalizados no pueden recibir ni verificar asistencia. Abra un servicio vigente antes de escanear.'
                  : isEn
                  ? 'Closed or ended services cannot record or verify attendance. Please open an active ongoing service before scanning.'
                  : isFr
                  ? 'Les services fermés ou terminés ne peuvent plus enregistrer ni vérifier les présences. Veuillez ouvrir un service en cours avant de scanner.'
                  : 'Sèvis ki fèmen oswa ki deja depase lè finisman yo pa kapab pran oswa verifye prezans ankò. Tanpri louvri yon sèvis ki an kou anvan ou eskane.'}
              </p>
            </div>
          ) : (
            <>
              {/* Camera Viewport */}
              <div className="relative rounded-2xl bg-slate-950 overflow-hidden border border-slate-800 flex flex-col items-center justify-center min-h-[260px]">
                <div
                  className={`relative w-full h-64 sm:h-72 bg-black flex items-center justify-center overflow-hidden ${
                    isCameraActive ? 'block' : 'hidden'
                  }`}
                >
                  <video
                    ref={videoRef}
                    playsInline
                    autoPlay
                    muted
                    className={`w-full h-full object-cover transition-transform duration-200 ${
                      zoomLevel > 1 && !zoomRange.supported ? 'scale-150' : ''
                    }`}
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Top Camera Controls */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-20 pointer-events-auto">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/70 text-[11px] text-amber-300 font-mono shadow-md">
                      <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                      <span>Ultra HD 4-Pas</span>
                      {activeEnhancement && (
                        <span className="ml-1 pl-1.5 border-l border-slate-600 text-emerald-300 font-sans text-[10px] font-medium animate-fade-in">
                          {activeEnhancement}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {hasTorch && (
                        <button
                          type="button"
                          id="btn-scanner-torch-toggle"
                          onClick={handleToggleTorch}
                          title={
                            isTorchOn
                              ? isEs
                                ? 'Apagar Linterna'
                                : 'Etenn Flash'
                              : isEs
                              ? 'Encender Linterna'
                              : 'Limen Flash'
                          }
                          className={`p-2 rounded-xl backdrop-blur-md border transition-all cursor-pointer shadow-lg ${
                            isTorchOn
                              ? 'bg-amber-400 text-slate-950 border-amber-300 ring-2 ring-amber-400/50 shadow-amber-400/20'
                              : 'bg-slate-900/80 text-slate-300 hover:text-white border-slate-700/80 hover:bg-slate-800'
                          }`}
                        >
                          {isTorchOn ? (
                            <Flashlight className="w-4 h-4 text-slate-950" />
                          ) : (
                            <FlashlightOff className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      )}
                      {!hasTorch && (
                        <button
                          type="button"
                          id="btn-scanner-torch-toggle"
                          onClick={handleToggleTorch}
                          title={
                            isTorchOn
                              ? isEs
                                ? 'Apagar Linterna'
                                : 'Etenn Flash'
                              : isEs
                              ? 'Encender Linterna'
                              : 'Limen Flash'
                          }
                          className={`p-2 rounded-xl backdrop-blur-md border transition-all cursor-pointer shadow-lg ${
                            isTorchOn
                              ? 'bg-amber-400 text-slate-950 border-amber-300 ring-2 ring-amber-400/50 shadow-amber-400/20'
                              : 'bg-slate-900/80 text-slate-300 hover:text-white border-slate-700/80 hover:bg-slate-800'
                          }`}
                        >
                          {isTorchOn ? (
                            <Flashlight className="w-4 h-4 text-slate-950" />
                          ) : (
                            <FlashlightOff className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        id="btn-scanner-zoom-toggle"
                        onClick={handleToggleZoom}
                        title={zoomLevel === 1 ? 'Zoom 2x' : 'Zoom 1x'}
                        className={`px-2.5 py-1.5 rounded-xl backdrop-blur-md border transition-all cursor-pointer shadow-lg text-[11px] font-mono font-bold flex items-center gap-1 ${
                          zoomLevel > 1
                            ? 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-500/40'
                            : 'bg-slate-900/80 text-slate-300 hover:text-white border-slate-700/80 hover:bg-slate-800'
                        }`}
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                        <span>{zoomLevel}x</span>
                      </button>

                      <button
                        type="button"
                        id="btn-scanner-flip-camera"
                        onClick={handleFlipCamera}
                        title={isEs ? 'Cambiar Cámara' : 'Vire Kamera'}
                        className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md text-slate-300 hover:text-white border border-slate-700/80 transition-all cursor-pointer shadow-lg"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Reticle */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-52 h-52 sm:w-56 sm:h-56 border-2 border-dashed border-amber-400/90 rounded-2xl relative shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                      <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-amber-400 -mt-1 -ml-1 rounded-tl-sm" />
                      <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-amber-400 -mt-1 -mr-1 rounded-tr-sm" />
                      <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-amber-400 -mb-1 -ml-1 rounded-bl-sm" />
                      <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-amber-400 -mb-1 -mr-1 rounded-br-sm" />
                      <div className="absolute left-1 right-1 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_#F59E0B] animate-bounce top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  {/* Bottom Camera Status */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
                    <div className="bg-black/75 backdrop-blur-md px-3 py-1 rounded-full text-[11px] text-emerald-300 font-mono flex items-center gap-1.5 shadow-md border border-emerald-500/20">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>{isEs ? 'Listo para escanear' : 'Pare pou scanne...'}</span>
                    </div>
                    <span className="bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] text-slate-300 font-mono border border-slate-700">
                      {facingMode === 'environment'
                        ? isEs
                          ? 'Cámara Trasera'
                          : 'Kamera Dèyè'
                        : isEs
                        ? 'Cámara Frontal'
                        : 'Kamera Devan'}
                    </span>
                  </div>
                </div>

                {isCameraActive && (
                  <div className="p-2.5 bg-slate-900/90 border-t border-slate-800/80 w-full flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-emerald-400 flex items-center gap-1.5 font-mono">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>
                          {isEs
                            ? 'Lector QR Activo'
                            : isEn
                            ? 'QR Reader Active'
                            : isFr
                            ? 'Lecteur QR Actif'
                            : 'Lektè QR Aktif'}
                        </span>
                      </span>
                    </div>
                    <button
                      type="button"
                      id="btn-stop-camera"
                      onClick={stopCamera}
                      className="text-xs text-rose-400 hover:text-rose-300 px-3 py-1 rounded-lg hover:bg-rose-950/40 cursor-pointer transition font-medium"
                    >
                      {isEs
                        ? 'Pausar Cámara'
                        : isEn
                        ? 'Pause Camera'
                        : isFr
                        ? 'Pause Caméra'
                        : 'Fèmen Kamera'}
                    </button>
                  </div>
                )}

                {!isCameraActive && (
                  <div className="p-6 text-center text-slate-300 space-y-3 w-full">
                    <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center mx-auto text-amber-400 shadow-xl">
                      {isCameraStarting ? (
                        <RefreshCw className="w-7 h-7 text-amber-400 animate-spin" />
                      ) : (
                        <Camera className="w-7 h-7" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
                        <span>
                          {isCameraStarting
                            ? isEs
                              ? 'Iniciando Escáner de Cámara...'
                              : 'N ap ouvri lektè kamera a...'
                            : isEs
                            ? 'Ultra Escáner QR de Alta Precisión'
                            : isEn
                            ? 'High-Precision Ultra QR Scanner'
                            : isFr
                            ? 'Ultra Scanner QR Haute Précision'
                            : 'Ultra Scanner QR Segondè Presizyon'}
                        </span>
                        {!isCameraStarting && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 text-[10px] font-mono border border-amber-400/30">
                            v2.0
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-slate-400 max-w-md mx-auto pt-1 leading-relaxed">
                        {isCameraStarting
                          ? isEs
                            ? 'Conectando con la cámara del dispositivo móvil...'
                            : 'Koneksyon dirèk ak kamera telefòn lan pou lekti QR rapid...'
                          : isEs
                          ? 'Motor multi-filtro avanzado: lee códigos borrosos, con poca luz o en cámaras de baja calidad. Puede usar su teléfono como lector de códigos.'
                          : isEn
                          ? 'Advanced multi-filter engine: reads blurry codes, low-light conditions, or low-grade cameras. Easily use your phone as a scanner.'
                          : isFr
                          ? 'Moteur multi-filtre avancé : lit les codes flous, sous faible luminosité ou capteurs anciens. Utilisez votre téléphone comme lecteur.'
                          : 'Motè 4-pas avanse: li kòd ki flou, kote ki pa gen anpil limyè oswa sou ti kamera senp. Ou ka itilize telefòn ou kòm lektè trè fasil.'}
                      </p>
                    </div>

                    {cameraError && (
                      <div className="text-left bg-rose-950/40 border border-rose-800/80 p-3.5 rounded-2xl space-y-2 max-w-lg mx-auto">
                        <p className="text-xs text-rose-300 font-medium">{cameraError}</p>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              resetCameraPermissionPreferences();
                              startCamera();
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] flex items-center gap-1.5 cursor-pointer border border-slate-700 transition"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                            <span>
                              {isEs
                                ? 'Reintentar Permiso'
                                : isFr
                                ? 'Réessayer Permission'
                                : isEn
                                ? 'Retry Permission'
                                : 'Re-eseye Otorizasyon'}
                            </span>
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 space-y-1">
                          <div className="font-bold text-slate-300 flex items-center gap-1">
                            <CircleQuestionMark className="w-3.5 h-3.5 text-amber-400" />
                            <span>Gid pou Otorize Kamera sou Android:</span>
                          </div>
                          <ol className="list-decimal list-inside text-slate-400 space-y-0.5 pl-1">
                            <li>
                              Ale nan <strong>Paramèt (Settings)</strong> sou telefòn ou
                            </li>
                            <li>
                              Chwazi <strong>Aplikasyon (Apps)</strong> &gt;{' '}
                              <strong>OmniChurch</strong>
                            </li>
                            <li>
                              Klike sou <strong>Otorizasyon (Permissions)</strong> &gt;{' '}
                              <strong>Kamera</strong>
                            </li>
                            <li>
                              Chwazi <strong>Pèmèt (Allow)</strong>
                            </li>
                          </ol>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                      <button
                        type="button"
                        id="btn-start-camera"
                        onClick={() => startCamera()}
                        disabled={isCameraStarting}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-colors shadow-lg cursor-pointer disabled:opacity-50"
                      >
                        {isCameraStarting ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                        ) : (
                          <Camera className="w-4 h-4" />
                        )}
                        <span>
                          {isCameraStarting
                            ? isEs
                              ? 'Abriendo Cámara...'
                              : 'Kamera ap Ouvri...'
                            : isEs
                            ? 'Abrir Cámara para Escanear'
                            : isEn
                            ? 'Open Camera to Scan'
                            : isFr
                            ? 'Ouvrir la Caméra pour Scanner'
                            : 'Ouvri Kamera pou Scan'}
                        </span>
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-3 max-w-md mx-auto text-[11px] text-slate-400">
                      <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col items-center text-center">
                        <Sun className="w-3.5 h-3.5 text-amber-400 mb-1" />
                        <span className="font-semibold text-slate-300">Low-Light Boost</span>
                        <span className="text-[10px] text-slate-500">Klète amelyore</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col items-center text-center">
                        <Layers className="w-3.5 h-3.5 text-indigo-400 mb-1" />
                        <span className="font-semibold text-slate-300">Anti-Blur Filter</span>
                        <span className="text-[10px] text-slate-500">Netwaye flou</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col items-center text-center">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 mb-1" />
                        <span className="font-semibold text-slate-300">Offline Ready</span>
                        <span className="text-[10px] text-slate-500">Mizajou lokal</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Last Scan Result Banner */}
              {lastResult && (
                <div
                  id="scan-result-banner"
                  className={`p-4 rounded-xl border transition-all ${
                    lastResult.success
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-lg ring-1 ring-emerald-500/30'
                      : lastResult.duplicate
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {lastResult.success ? (
                      <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                        <CircleCheck className="w-5 h-5 text-emerald-400" />
                      </div>
                    ) : lastResult.duplicate ? (
                      <TriangleAlert className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                    ) : (
                      <CircleX className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                    )}

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm">
                            {lastResult.success
                              ? lastResult.isVisitor
                                ? isEs
                                  ? 'Visitante registrado con éxito ✓'
                                  : isEn
                                  ? 'Visitor checked in successfully ✓'
                                  : isFr
                                  ? 'Visiteur enregistré avec succès ✓'
                                  : 'Prezans Vizitè anrejistre avèk siksè ✓'
                                : isEs
                                ? 'Asistencia registrada con éxito ✓'
                                : isEn
                                ? 'Attendance recorded successfully ✓'
                                : isFr
                                ? 'Présence enregistrée avec succès ✓'
                                : 'Prezans anrejistre avèk siksè ✓'
                              : lastResult.duplicate
                              ? isEs
                                ? 'Atención: Asistencia ya registrada'
                                : isEn
                                ? 'Warning: Attendance already recorded'
                                : isFr
                                ? 'Attention : Présence déjà enregistrée'
                                : 'Atansyon: Prezans deja anrejistre'
                              : isEs
                              ? 'Error de Escaneo / Denegado'
                              : isEn
                              ? 'Scan Error / Denied'
                              : isFr
                              ? 'Erreur de Scan / Refusé'
                              : 'Erè Scan / Refize'}
                          </h4>
                          {lastResult.isVisitor && (
                            <span className="px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/40 text-[10px] font-black text-sky-300 uppercase tracking-wider">
                              {isEs ? 'Visitante' : isEn ? 'Visitor' : isFr ? 'Visiteur' : 'Vizitè'}
                            </span>
                          )}
                          {lastResult.success && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-400/40 text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                              {isEs
                                ? '🎉 ¡Gracias por su participación!'
                                : isEn
                                ? '🎉 Thank you for participating!'
                                : isFr
                                ? '🎉 Merci pour votre participation !'
                                : '🎉 Mèsi pou patisipasyon w!'}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-mono opacity-70">
                          {new Date().toLocaleTimeString()}
                        </span>
                      </div>

                      {lastResult.member && (
                        <div className="mt-1 text-xs text-slate-300">
                          <span className="font-bold text-white">{lastResult.member.fullName}</span> (
                          <span className="font-mono text-amber-300">
                            {lastResult.member.memberId}
                          </span>
                          ) •{' '}
                          <span>
                            {lastResult.homeChurchName
                              ? `${
                                  isEs
                                    ? 'Iglesia de origen'
                                    : isEn
                                    ? 'Home Church'
                                    : isFr
                                    ? "Église d'origine"
                                    : 'Legliz orijin'
                                }: ${lastResult.homeChurchName}`
                              : lastResult.member.department}
                          </span>
                        </div>
                      )}

                      {lastResult.errorMessage && (
                        <p className="text-xs mt-1 font-medium">{lastResult.errorMessage}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Manual Check-In & Quick Member List */}
              <div className="bg-[#1E293B] rounded-xl p-3.5 border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    {isEs
                      ? 'Registro Manual & Lista Rápida de Miembros'
                      : isEn
                      ? 'Manual Check-in & Quick Member List'
                      : isFr
                      ? 'Pointage Manuel & Liste Rapide des Membres'
                      : 'Anrejistreman Manyèl & Lis Rapid Manm'}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {isEs
                      ? 'Haga clic en un miembro o escriba su código'
                      : isEn
                      ? 'Click on a member or type their code'
                      : isFr
                      ? 'Cliquez sur un membre ou tapez son code'
                      : 'Klike sou yon manm oswa tape kòd li'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 bg-slate-900 rounded-lg border border-slate-700">
                  {members.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      id={`btn-quick-checkin-${m.id}`}
                      onClick={() =>
                        processScanCode(
                          m.barcodeToken || buildCanonicalBarcodeToken(church.id, m.memberId),
                          'qr_scan'
                        )
                      }
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 hover:text-amber-300 border border-slate-700 transition-colors flex items-center gap-1.5 text-slate-300 cursor-pointer"
                    >
                      <UserCheck className="w-3 h-3 text-slate-400" />
                      <span>{m.fullName}</span>
                      <span className="font-mono text-[10px] text-amber-400">({m.memberId})</span>
                    </button>
                  ))}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    processScanCode(manualCode, 'manual');
                  }}
                  className="flex gap-2 pt-1"
                >
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      id="input-manual-member-code"
                      placeholder={
                        isEs
                          ? 'Escriba el Member ID (ej: CH001-JD4827 o nombre)'
                          : isEn
                          ? 'Type Member ID (e.g. CH001-JD4827 or name)'
                          : isFr
                          ? 'Tapez ID Membre (ex. CH001-JD4827 ou nom)'
                          : 'Tape Member ID (eg: CH001-JD4827 oswa non manm)'
                      }
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-400 bg-slate-900 text-slate-200"
                    />
                  </div>
                  <button
                    type="submit"
                    id="btn-submit-manual-scan"
                    disabled={!manualCode.trim()}
                    className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {isEs
                      ? 'Marcar Presencia'
                      : isEn
                      ? 'Mark Present'
                      : isFr
                      ? 'Pointer Présence'
                      : 'Make Prezans'}
                  </button>
                </form>
              </div>

              {/* Recent Scans */}
              {recentScans.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    {isEs
                      ? `Últimos Escaneos en esta Sesión (${recentScans.length})`
                      : isEn
                      ? `Recent Scans in this Session (${recentScans.length})`
                      : isFr
                      ? `Derniers Scans de cette Session (${recentScans.length})`
                      : `Dènye Scan nan Sesyon Sa a (${recentScans.length})`}
                  </h5>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {recentScans.map((scan, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-2 rounded-lg text-xs border ${
                          scan.success
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : scan.duplicate
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {scan.success ? (
                            <CircleCheck className="w-4 h-4 text-emerald-400" />
                          ) : scan.duplicate ? (
                            <TriangleAlert className="w-4 h-4 text-amber-400" />
                          ) : (
                            <CircleX className="w-4 h-4 text-rose-400" />
                          )}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-white">
                              {scan.member
                                ? scan.member.fullName
                                : isEs
                                ? 'Código Desconocido'
                                : isEn
                                ? 'Unknown Code'
                                : isFr
                                ? 'Code Inconnu'
                                : 'Kòd Enkoni'}
                            </span>
                            {scan.member && (
                              <span className="text-[10px] text-slate-400 font-mono ml-1">
                                ({scan.member.memberId})
                              </span>
                            )}
                            {scan.isVisitor && (
                              <span className="px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-400/40 text-sky-300 text-[9px] font-extrabold uppercase">
                                {isEs
                                  ? 'Visitante'
                                  : isEn
                                  ? 'Visitor'
                                  : isFr
                                  ? 'Visiteur'
                                  : 'Vizitè'}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] font-mono">
                          {scan.success
                            ? scan.isVisitor
                              ? isEs
                                ? '✓ Visitante'
                                : isEn
                                ? '✓ Visitor'
                                : isFr
                                ? '✓ Visiteur'
                                : '✓ Vizitè'
                              : isEs
                              ? '✓ Presente'
                              : isEn
                              ? '✓ Present'
                              : isFr
                              ? '✓ Présent'
                              : '✓ Prezan'
                            : scan.duplicate
                            ? isEs
                              ? 'Duplicado'
                              : isEn
                              ? 'Duplicate'
                              : isFr
                              ? 'Doublon'
                              : 'Doub'
                            : isEs
                            ? 'Rechazado'
                            : isEn
                            ? 'Rejected'
                            : isFr
                            ? 'Rejeté'
                            : 'Refize'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#1E293B] p-3 sm:p-3.5 border-t border-slate-700/80 flex flex-wrap items-center justify-between gap-2.5">
          <button
            type="button"
            id="btn-toggle-scanner-sound"
            onClick={() => setIsAudioMuted(!isAudioMuted)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-xl border transition-colors cursor-pointer ${
              isAudioMuted
                ? 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}
          >
            {isAudioMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden xs:inline">
                  {isEs ? 'Sonido Silenciado' : isEn ? 'Muted' : isFr ? 'Silencieux' : 'Son Koupe'}
                </span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden xs:inline">
                  {isEs ? 'Bip Activo' : isEn ? 'Beep On' : isFr ? 'Bip Actif' : 'Son Bip Aktif'}
                </span>
              </>
            )}
          </button>

          <button
            type="button"
            id="btn-upload-photo-scan"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessingFile || services.length === 0 || !selectedServiceId}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 shadow-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              isEs
                ? 'Importar / Tomar Foto de Carnet'
                : isEn
                ? 'Upload / Snap Card Photo'
                : isFr
                ? 'Importer / Prendre Photo Carte'
                : 'Enpòte / Pran Foto Kat'
            }
          >
            {isProcessingFile ? (
              <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>
              {isProcessingFile
                ? isEs
                  ? 'Analizando Foto...'
                  : 'Tretman Foto...'
                : isEs
                ? 'Importar / Foto Carnet'
                : isEn
                ? 'Upload / Snap Card'
                : isFr
                ? 'Importer / Photo Carte'
                : 'Enpòte / Pran Foto Kat'}
            </span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            type="button"
            id="btn-done-scanner"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            {isEs
              ? 'Cerrar Escáner'
              : isEn
              ? 'Close Scanner'
              : isFr
              ? 'Fermer le Scanner'
              : 'Fèmen Scanner'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QrScannerModal;
