import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Church,
  Member,
  ServiceSession,
  AttendanceRecord,
  Announcement,
  Language,
} from '../../types';
import { SERVICE_CATEGORIES } from '../../utils/i18n';
import {
  recordAttendanceScan,
  ScanResult,
  isDeviceOnline,
} from '../../utils/storage';
import { useToast } from '../../context/ToastContext';
import {
  Users,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Camera,
  UserPlus,
  Bell,
  ShieldCheck,
  Building2,
  Clock,
  ArrowRight,
  QrCode,
  ChevronDown,
  Printer,
  SlidersHorizontal,
  Zap,
  Radio,
  Power,
  UserCheck,
  AlertTriangle,
  Maximize2,
  RefreshCw,
  MoreVertical,
  Search,
  Award,
  PlusCircle,
  HeartHandshake,
  Heart,
  Flashlight,
  FlashlightOff,
  ZoomIn,
  Upload,
  Image as ImageIcon,
  Sun,
  Layers,
  History,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DonationModal } from '../common/DonationModal';
import {
  requestCameraPermission,
  hasTorchSupport,
  setTorchState,
  getCameraZoomRange,
  setCameraZoom,
} from '../../utils/devicePermissions';
import {
  decodeFrameMultiPass,
  decodeImageFile,
  scannerAudio,
} from '../../utils/scannerEngine';
import { featureFlags } from '../../utils/featureFlags';
import { hasActiveChurchLicense, getChurchLicense, getDonationConfig } from '../../utils/developerStorage';
import { AdminAttendanceRatioPieChart } from './AdminAttendanceRatioPieChart';
import { ChurchLicenseModal } from '../common/ChurchLicenseModal';

interface AdminDashboardProps {
  church: Church;
  members: Member[];
  services: ServiceSession[];
  announcements: Announcement[];
  attendanceRecords: AttendanceRecord[];
  language?: Language;
  onOpenScanner: () => void;
  onRefresh?: () => void;
  onNavigate?: (tab: string) => void;
  onNavigateTab?: (tab: string) => void;
  onToggleActiveService?: (serviceId: string, isOpen: boolean) => void;
  onKeepSessionAlive?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  church,
  members,
  services,
  announcements,
  attendanceRecords,
  language = 'ht',
  onOpenScanner,
  onRefresh,
  onNavigate,
  onNavigateTab,
  onToggleActiveService,
  onKeepSessionAlive,
}) => {
  const toast = useToast();
  const isEs = language === 'es';
  const isEn = language === 'en';
  const isFr = language === 'fr';

  // 30-Second Warning Toast before automatic session lock
  const [showSessionWarning, setShowSessionWarning] = useState<boolean>(false);
  const [sessionSecondsRemaining, setSessionSecondsRemaining] = useState<number>(30);
  const lastAdminDashboardActivityRef = useRef<number>(Date.now());

  const handleKeepSessionActive = () => {
    lastAdminDashboardActivityRef.current = Date.now();
    setShowSessionWarning(false);
    setSessionSecondsRemaining(30);
    if (onKeepSessionAlive) {
      onKeepSessionAlive();
    }
    window.dispatchEvent(new CustomEvent('omnichurch_keep_admin_session'));
    toast.success(
      isEs ? 'Sesión Prolongada' : isEn ? 'Session Extended' : isFr ? 'Session Prolongée' : 'Sesyon Pwolonje',
      isEs
        ? 'Su sesión de administrador permanece activa.'
        : isEn
        ? 'Your admin session remains active.'
        : isFr
        ? 'Votre session administrateur reste active.'
        : 'Sesyon administrate ou a rete aktif avèk siksè.'
    );
  };

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const handleRefreshDashboard = () => {
    setIsRefreshing(true);
    if (onRefresh) {
      onRefresh();
    }
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success(
        isEs ? 'Panel Actualizado' : isEn ? 'Dashboard Refreshed' : isFr ? 'Tableau de Bord Actualisé' : 'Tablo Rafrechi',
        isEs
          ? 'Las métricas, cultos y asistencias han sido actualizados.'
          : isEn
          ? 'Metrics, services, and attendance have been refreshed.'
          : isFr
          ? 'Les métriques, cultes et présences ont été mis à jour.'
          : 'Tout done tablo a, sèvis ak prezans yo mete ajou.'
      );
    }, 450);
  };

  // Auto-Scan Switch State (Kamera / Scanner dirèk nan sèvis aktif la)
  const [isAutoScanEnabled, setIsAutoScanEnabled] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [zoomRange, setZoomRange] = useState<{ supported: boolean; min: number; max: number; current: number; step: number }>({
    supported: false,
    min: 1,
    max: 1,
    current: 1,
    step: 0.1,
  });
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [activeEnhancement, setActiveEnhancement] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [manualCodeInput, setManualCodeInput] = useState<string>('');
  const [selectedServiceToOpen, setSelectedServiceToOpen] = useState<string>('');
  const [isDonationModalOpen, setIsDonationModalOpen] = useState<boolean>(false);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState<boolean>(false);
  const [licenseRefreshKey, setLicenseRefreshKey] = useState<number>(0);

  // Reactive Developer Donation Configuration
  const [devDonationConfig, setDevDonationConfig] = useState(() => getDonationConfig());

  useEffect(() => {
    const handleUpdate = () => {
      setDevDonationConfig(getDonationConfig());
    };
    window.addEventListener('omnichurch_dev_settings_updated', handleUpdate);
    return () => {
      window.removeEventListener('omnichurch_dev_settings_updated', handleUpdate);
    };
  }, []);

  // Track user inactivity in AdminDashboard and show warning toast 30 seconds before auto-lock
  useEffect(() => {
    lastAdminDashboardActivityRef.current = Date.now();

    const recordDashboardActivity = () => {
      lastAdminDashboardActivityRef.current = Date.now();
    };

    const monitoredEvents = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'click',
      'wheel',
      'omnichurch_keep_admin_session',
    ];

    monitoredEvents.forEach((evt) => {
      window.addEventListener(evt, recordDashboardActivity, { passive: true });
    });

    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    const WARNING_THRESHOLD_MS = FIVE_MINUTES_MS - 30 * 1000; // 270,000 ms (30s before auto-lock)

    const interval = setInterval(() => {
      // If camera scanner is actively scanning, keep session active automatically
      if (isAutoScanEnabled) {
        lastAdminDashboardActivityRef.current = Date.now();
        window.dispatchEvent(new CustomEvent('omnichurch_keep_admin_session'));
        setShowSessionWarning(false);
        return;
      }

      const idleDuration = Date.now() - lastAdminDashboardActivityRef.current;

      if (idleDuration >= WARNING_THRESHOLD_MS && idleDuration < FIVE_MINUTES_MS) {
        const remaining = Math.max(1, Math.ceil((FIVE_MINUTES_MS - idleDuration) / 1000));
        setSessionSecondsRemaining(remaining);
        setShowSessionWarning(true);
      } else if (idleDuration < WARNING_THRESHOLD_MS) {
        setShowSessionWarning(false);
      }
    }, 1000);

    return () => {
      monitoredEvents.forEach((evt) => {
        window.removeEventListener(evt, recordDashboardActivity);
      });
      clearInterval(interval);
    };
  }, [isAutoScanEnabled]);

  const activeDonationSubtitle = useMemo(() => {
    const list: string[] = [];
    if (devDonationConfig.paypalEnabled) list.push('PayPal');
    if (devDonationConfig.binanceEnabled) list.push(isEs ? 'Binance USDT' : 'Binance Crypto');
    if (devDonationConfig.wiseEnabled) list.push('Wise');
    if (devDonationConfig.moncashEnabled) list.push('MonCash');
    if (devDonationConfig.zelleEnabled) list.push('Zelle');
    return list.length > 0
      ? list.join(', ')
      : (isEs ? 'Apoyo al Desarrollador' : isEn ? 'Support the Developer' : isFr ? 'Soutien au Développeur' : 'Soutyen pou Devlopè a');
  }, [devDonationConfig, isEs, isEn, isFr]);

  const isChurchLicensed = useMemo(() => hasActiveChurchLicense(church.id), [church.id, licenseRefreshKey]);
  const activeLicense = useMemo(() => getChurchLicense(church.id), [church.id, licenseRefreshKey]);

  // Video and scanning references
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isScanningRef = useRef<boolean>(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const framePassCounterRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 3-dots more menu state for header actions
  const [isHeaderMoreMenuOpen, setIsHeaderMoreMenuOpen] = useState<boolean>(false);
  const headerMoreMenuRef = useRef<HTMLDivElement>(null);

  // Close header more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        headerMoreMenuRef.current &&
        !headerMoreMenuRef.current.contains(event.target as Node)
      ) {
        setIsHeaderMoreMenuOpen(false);
      }
    };
    if (isHeaderMoreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isHeaderMoreMenuOpen]);

  // Accordion Menu State for Action Groups
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    members: true,
    scanner: true,
    services: false,
    announcements: false,
    church: false,
    donation: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const areAllOpen = Object.values(openSections).every(Boolean);

  const toggleAllSections = () => {
    const nextState = !areAllOpen;
    setOpenSections({
      members: nextState,
      scanner: nextState,
      services: nextState,
      announcements: nextState,
      church: nextState,
    });
  };

  const handleNavigate = (tab: string) => {
    if (onNavigate) {
      onNavigate(tab);
    } else if (onNavigateTab) {
      onNavigateTab(tab);
    }
  };

  const activeService = services.find((s) => s.isOpenForAttendance);
  const activeServiceCategory = activeService
    ? SERVICE_CATEGORIES[activeService.category]
    : null;

  // Set default selected service to open if none is active
  useEffect(() => {
    if (!activeService && services.length > 0 && !selectedServiceToOpen) {
      setSelectedServiceToOpen(services[0].id);
    }
  }, [activeService, services, selectedServiceToOpen]);

  // Today's attendance
  const todayDate = new Date().toISOString().split('T')[0];
  const todayRecords = attendanceRecords.filter((a) => a.serviceDate === todayDate);

  // Active attendance rate for the open service
  const activeServiceCheckins = activeService
    ? attendanceRecords.filter((a) => a.serviceId === activeService.id).length
    : 0;

  const attendanceRate =
    members.length > 0 ? Math.round((activeServiceCheckins / members.length) * 100) : 0;

  // ---------------- SOUND CHIME FEEDBACK ----------------
  const playScanBeep = (isSuccess: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (isSuccess) {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12); // A6
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(280, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(160, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch {
      // Audio context might be restricted before user interaction
    }
  };

  // ---------------- PROCESS SCAN EXECUTION ----------------
  const handleProcessScan = (rawCode: string, method: 'qr_scan' | 'barcode' | 'manual' = 'qr_scan') => {
    if (!rawCode.trim() || !activeService) {
      if (!activeService) {
        toast.warning(
          isEs ? 'No hay Servicio Activo' : isEn ? 'No Active Service' : isFr ? 'Aucun Service Actif' : 'Pa gen Sèvis Aktif',
          isEs ? 'Por favor abra un servicio antes de comenzar a escanear.' : isEn ? 'Please open a service before scanning.' : isFr ? 'Veuillez ouvrir un service avant de scanner.' : 'Tanpri louvri yon sèvis anvan ou kòmanse eskane.'
        );
      }
      return;
    }

    const res = recordAttendanceScan({
      currentChurchId: church.id,
      rawCode: rawCode.trim(),
      serviceId: activeService.id,
      method,
      recordedBy: isEs ? 'Admin Auto-Scanner en Vivo' : isEn ? 'Admin Live Auto-Scanner' : isFr ? 'Admin Auto-Scanner en Direct' : 'Admin Auto-Scanner Live',
    });

    setLastScanResult(res);

    if (res.success && res.record) {
      scannerAudio.play('success');
      if (res.isOfflineSaved) {
        toast.info(
          isEs ? '💾 Asistencia Guardada Localmente (Offline)' : isEn ? '💾 Attendance Saved Locally (Offline)' : isFr ? '💾 Présence Enregistrée Localement (Offline)' : '💾 Prezans Sove Lokalman (Offline)',
          isEs
            ? `${res.member?.fullName} (${res.member?.memberId}) registrado localmente.`
            : isEn
            ? `${res.member?.fullName} (${res.member?.memberId}) saved locally.`
            : isFr
            ? `${res.member?.fullName} (${res.member?.memberId}) enregistré localement.`
            : `${res.member?.fullName} (${res.member?.memberId}) anrejistre lokalman.`
        );
      } else {
        toast.success(
          isEs ? '¡Asistencia Registrada! ✓' : isEn ? 'Attendance Recorded! ✓' : isFr ? 'Présence Enregistrée ! ✓' : 'Prezans Anrejistre! ✓',
          `${res.member?.fullName} (${res.member?.memberId}) • ${activeService.title}`
        );
      }

      try {
        confetti({
          particleCount: 35,
          spread: 60,
          origin: { y: 0.55 },
          colors: ['#F59E0B', '#10B981', '#6366F1', '#38BDF8', '#FCD34D'],
          disableForReducedMotion: true,
        });
      } catch {
        // ignore
      }
    } else if (res.duplicate) {
      scannerAudio.play('duplicate');
      toast.warning(
        isEs ? 'Asistencia Ya Registrada' : isEn ? 'Attendance Already Recorded' : isFr ? 'Présence Déjà Enregistrée' : 'Prezans Deja Anrejistre',
        isEs
          ? `${res.member?.fullName || 'El miembro'} ya está marcado presente en este servicio.`
          : isEn
          ? `${res.member?.fullName || 'Member'} has already been checked in for this service.`
          : isFr
          ? `${res.member?.fullName || 'Le membre'} est déjà marqué présent pour ce service.`
          : `${res.member?.fullName || 'Manm nan'} te deja make prezan nan sèvis sa a.`
      );
    } else {
      scannerAudio.play('error');
      toast.error(
        isEs ? 'Error de Escaneo' : isEn ? 'Scan Error' : isFr ? 'Erreur de Scan' : 'Erè Scan',
        res.errorMessage || (isEs ? 'Este código no se reconoce para esta iglesia.' : isEn ? 'This code is not recognized for this church.' : isFr ? 'Ce code n’est pas reconnu pour cette église.' : 'Kòd sa a pa rekonèt pou legliz sa a.')
      );
    }

    setManualCodeInput('');
  };

  // ---------------- ULTRA MULTI-PASS CAMERA SCANNER LOOP ----------------
  const scanVideoFrame = async () => {
    if (!videoRef.current || !canvasRef.current || !isScanningRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      // Handle digital zoom crop if digital zoom is active and hardware zoom wasn't applied
      if (zoomLevel > 1 && !zoomRange.supported) {
        const cropWidth = canvas.width / zoomLevel;
        const cropHeight = canvas.height / zoomLevel;
        const startX = (canvas.width - cropWidth) / 2;
        const startY = (canvas.height - cropHeight) / 2;
        ctx.drawImage(video, startX, startY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      try {
        const detection = await decodeFrameMultiPass(
          video,
          canvas,
          framePassCounterRef.current++
        );

        if (detection && detection.code) {
          if (detection.enhancementLabel) {
            setActiveEnhancement(detection.enhancementLabel);
          }
          // Process scanned QR code
          handleProcessScan(detection.code, 'qr_scan');
          // Pause briefly before next scan to prevent instant re-trigger
          isScanningRef.current = false;
          setTimeout(() => {
            setActiveEnhancement(null);
            if (isAutoScanEnabled) {
              isScanningRef.current = true;
            }
          }, 1800);
        }
      } catch (err) {
        console.warn('Scan frame error:', err);
      }
    }

    if (isScanningRef.current) {
      animationFrameId.current = requestAnimationFrame(scanVideoFrame);
    }
  };

  // Start Embedded Camera with clean mobile permissions & hardware checks
  const startEmbeddedCamera = async (overrideFacing?: 'environment' | 'user') => {
    setCameraError(null);
    const targetFacing = overrideFacing || facingMode;
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      const { stream, error } = await requestCameraPermission(targetFacing);
      if (error || !stream) {
        throw new Error(error || (isEs ? 'Cámara no disponible.' : 'Kamera pa disponib.'));
      }
      streamRef.current = stream;

      // Check hardware torch & zoom
      setHasTorch(hasTorchSupport(stream));
      setIsTorchOn(false);
      const zRange = getCameraZoomRange(stream);
      setZoomRange(zRange);
      setZoomLevel(1);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        isScanningRef.current = true;
        animationFrameId.current = requestAnimationFrame(scanVideoFrame);
      }
    } catch (err: unknown) {
      console.warn('Camera access denied or not available:', err);
      const errMsg = err instanceof Error ? err.message : (isEs ? 'Cámara no disponible.' : isEn ? 'Camera not available.' : isFr ? 'Caméra indisponible.' : 'Kamera pa disponib.');
      setCameraError(
        isEs
          ? `No se pudo abrir la cámara (${errMsg}). Puede usar la búsqueda rápida o escribir el ID.`
          : isEn
          ? `Could not open camera (${errMsg}). You can use quick search or type the Member ID.`
          : isFr
          ? `Impossible d'ouvrir la caméra (${errMsg}). Vous pouvez utiliser la recherche rapide ou saisir l'ID.`
          : `Kamera pa kapab ouvri (${errMsg}). Ou ka itilize seleksyon rapid oswa tape kòd la.`
      );
      isScanningRef.current = false;
    }
  };

  // Stop Embedded Camera
  const stopEmbeddedCamera = () => {
    isScanningRef.current = false;
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
    setIsTorchOn(false);
    setActiveEnhancement(null);
  };

  // Toggle Torch
  const handleToggleTorch = async () => {
    if (!streamRef.current) return;
    const nextState = !isTorchOn;
    const success = await setTorchState(streamRef.current, nextState);
    if (success) {
      setIsTorchOn(nextState);
    } else {
      toast.info(isEs ? 'Flash no disponible' : 'Flash pa disponib sou aparèy sa a');
    }
  };

  // Toggle Zoom
  const handleToggleZoom = async () => {
    const nextZoom = zoomLevel === 1 ? 2 : 1;
    setZoomLevel(nextZoom);
    if (zoomRange.supported && streamRef.current) {
      await setCameraZoom(streamRef.current, nextZoom);
    }
  };

  // Decode Image File / Photo
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    try {
      const detection = await decodeImageFile(file);
      if (detection && detection.code) {
        toast.success(
          isEs ? '¡Código Detectado de la Foto!' : 'Kòd Detekte nan Foto a!',
          detection.enhancementLabel || (isEs ? 'Foto procesada con éxito' : 'Foto a trete avèk siksè')
        );
        handleProcessScan(detection.code, 'qr_scan');
      } else {
        toast.error(
          isEs ? 'No se pudo leer el código QR' : 'Pa ka li kòd QR nan foto sa a',
          isEs ? 'Asegúrese de que el código QR esté visible y nítido.' : 'Asire w ke kòd QR la klè epi li pa twò flou.'
        );
      }
    } catch (err) {
      console.error('File scan error:', err);
      toast.error(isEs ? 'Error al procesar foto' : 'Erè pandan foto a t ap trete');
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Toggle Auto-Scan Switch
  const handleToggleAutoScan = () => {
    if (!isAutoScanEnabled) {
      if (!activeService) {
        toast.warning(
          isEs ? 'Abra un Servicio Primero' : isEn ? 'Open a Service First' : isFr ? 'Ouvrez un Service d’Abord' : 'Ouvri yon Sèvis Dabò',
          isEs
            ? 'Por favor abra la asistencia para un servicio antes de encender el escáner automático.'
            : isEn
            ? 'Please open attendance for a service before turning on auto-scanner.'
            : isFr
            ? 'Veuillez ouvrir la présence pour un service avant d’activer le scanner automatique.'
            : 'Tanpri louvri pòt prezans pou yon sèvis anvan ou limen scanner otomatik la.'
        );
        return;
      }
      setIsAutoScanEnabled(true);
      toast.info(
        isEs ? 'Escáner Automático Encendido 🟢' : isEn ? 'Auto-Scanner Turned On 🟢' : isFr ? 'Auto-Scanner Activé 🟢' : 'Scanner Otomatik Limen 🟢',
        isEs
          ? 'Pase las tarjetas de los miembros frente a la cámara para marcar asistencia instantáneamente.'
          : isEn
          ? 'Hold member cards in front of the camera to check in instantly.'
          : isFr
          ? 'Présentez les cartes des membres devant la caméra pour enregistrer la présence instantanément.'
          : 'Pase kat manm yo devan kamera a pou make prezans otomatikman san pèdi tan.'
      );
      setTimeout(() => {
        startEmbeddedCamera();
        barcodeInputRef.current?.focus();
      }, 100);
    } else {
      setIsAutoScanEnabled(false);
      stopEmbeddedCamera();
      toast.info(
        isEs ? 'Escáner Apagado' : isEn ? 'Scanner Turned Off' : isFr ? 'Scanner Désactivé' : 'Scanner Fèmen',
        isEs ? 'El escáner automático ha sido desactivado.' : isEn ? 'Auto-scanner has been deactivated.' : isFr ? 'L’auto-scanner a été désactivé.' : 'Scanner otomatik la dezaktive.'
      );
    }
  };

  // Flip Camera
  const handleFlipCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (isAutoScanEnabled) {
      startEmbeddedCamera(nextMode);
    }
  };

  // Clean up on unmount or tab switch
  useEffect(() => {
    return () => {
      stopEmbeddedCamera();
    };
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* 30-SECOND AUTO-LOCK WARNING TOAST */}
      <AnimatePresence>
        {showSessionWarning && (
          <motion.div
            key="admin-session-lock-warning-toast"
            initial={{ opacity: 0, y: -24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            id="toast-admin-session-lock-warning"
            className="fixed top-4 right-4 sm:right-6 z-[9999] max-w-sm sm:max-w-md w-[calc(100%-2rem)] p-4 rounded-2xl bg-slate-900/95 border-2 border-amber-500/80 shadow-[0_20px_50px_rgba(245,158,11,0.35)] backdrop-blur-xl text-white"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5 shadow-inner">
                  <Clock className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-sm text-white">
                      {isEs
                        ? 'Advertencia de Cierre de Sesión'
                        : isEn
                        ? 'Session Timeout Warning'
                        : isFr
                        ? 'Avertissement de Session'
                        : 'Avètisman Sesyon Admin'}
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-black text-xs">
                      {sessionSecondsRemaining}s
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {isEs
                      ? `La sesión de administrador se bloqueará en ${sessionSecondsRemaining} segundos por inactividad para proteger los datos.`
                      : isEn
                      ? `Admin session will automatically lock in ${sessionSecondsRemaining} seconds due to inactivity to secure church data.`
                      : isFr
                      ? `Votre session administrateur sera verrouillée dans ${sessionSecondsRemaining} secondes par inactivité pour sécuriser les données.`
                      : `Sesyon admin an pral bloke otomatikman nan ${sessionSecondsRemaining} segonn akòz inaktivite pou sekirize done legliz la.`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="btn-dismiss-session-warning"
                onClick={handleKeepSessionActive}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                title="Fèmen"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400 font-medium">
                {isEs
                  ? '¿Desea continuar trabajando?'
                  : isEn
                  ? 'Continue your session?'
                  : isFr
                  ? 'Continuer à travailler ?'
                  : 'Èske w vle kontinye travay?'}
              </span>

              <button
                type="button"
                id="btn-keep-admin-session-active"
                onClick={handleKeepSessionActive}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <ShieldCheck className="w-4 h-4 text-slate-950" />
                <span>
                  {isEs
                    ? 'Mantenerme conectado'
                    : isEn
                    ? 'Keep me signed in'
                    : isFr
                    ? 'Garder ma session active'
                    : 'Kenbe m konekte'}
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {isEs ? 'Panel de Administración' : isEn ? 'Admin Dashboard' : isFr ? 'Tableau de Bord Admin' : 'Tablo Bò Administrasyon'}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-mono font-bold">
              {church.code}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            {isEs
              ? `Gestión de miembros, cultos, anuncios y control de asistencia en tiempo real para ${church.name}.`
              : isEn
              ? `Real-time management of members, services, announcements and attendance tracking for ${church.name}.`
              : isFr
              ? `Gestion des membres, cultes, annonces et suivi des présences en temps réel pour ${church.name}.`
              : `Jesyon manm, kilt, anons ak kontwòl prezans an tan reyèl pou ${church.name}.`}
          </p>
        </div>

        {/* Action Header Buttons & 3-dots Menu */}
        <div className="flex items-center gap-2">
          {/* Global Quick Scan Modal Primary Button */}
          <button
            type="button"
            id="btn-admin-launch-scanner-top"
            onClick={onOpenScanner}
            className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs shadow-md shadow-amber-500/10 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
            <span className="hidden sm:inline">
              {isEs ? 'Escáner Pantalla Completa' : isEn ? 'Full-Screen Scanner' : isFr ? 'Scanner Plein Écran' : 'Scanner Plein Écran'}
            </span>
            <span className="sm:hidden">
              {isEs ? 'Escanear' : isEn ? 'Scan' : isFr ? 'Scanner' : 'Eskane'}
            </span>
          </button>

          {/* 3-dots More Actions Menu Dropdown */}
          <div className="relative" ref={headerMoreMenuRef}>
            <button
              type="button"
              id="btn-admin-header-more-options"
              onClick={() => setIsHeaderMoreMenuOpen(!isHeaderMoreMenuOpen)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                isHeaderMoreMenuOpen
                  ? 'bg-amber-400/20 border-amber-400/50 text-amber-300 shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
              }`}
              title={isEs ? 'Más opciones' : isEn ? 'More options' : isFr ? 'Plus d\'options' : 'Plis opsyon'}
              aria-label={isEs ? 'Más opciones' : isEn ? 'More options' : isFr ? 'Plus d\'options' : 'Plis opsyon'}
              aria-expanded={isHeaderMoreMenuOpen}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Dropdown Popover */}
            {isHeaderMoreMenuOpen && (
              <div
                id="menu-admin-header-more-dropdown"
                className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-[#0f172a] border border-slate-700/80 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 mb-1">
                  {isEs ? 'Opciones del Panel' : isEn ? 'Dashboard Options' : isFr ? 'Options du Tableau' : 'Opsyon Tablo a'}
                </div>

                {/* Refresh Dashboard Option */}
                <button
                  type="button"
                  id="btn-admin-dropdown-refresh"
                  onClick={() => {
                    setIsHeaderMoreMenuOpen(false);
                    handleRefreshDashboard();
                  }}
                  disabled={isRefreshing}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer text-left disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 text-amber-400 shrink-0 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <div className="min-w-0 flex-1">
                    <div>{isEs ? 'Refrescar Datos' : isEn ? 'Refresh Data' : isFr ? 'Rafraîchir les données' : 'Rafrechi Done yo'}</div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {isEs ? 'Sincronizar membresía y servicios' : isEn ? 'Sync members & services' : isFr ? 'Synchroniser membres et cultes' : 'Senkronize manm ak kilt'}
                    </div>
                  </div>
                </button>

                {/* Support/Donation Option (if enabled) */}
                {featureFlags.donationsEnabled && (
                  <button
                    type="button"
                    id="btn-admin-dropdown-support-dev"
                    onClick={() => {
                      setIsHeaderMoreMenuOpen(false);
                      setIsDonationModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-300 hover:text-amber-200 hover:bg-amber-400/10 transition-colors cursor-pointer text-left mt-0.5"
                  >
                    <Heart className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div>{isEs ? 'Apoyar / Donar' : isEn ? 'Support / Donate' : isFr ? 'Soutenir / Don' : 'Soutni / Donasyon'}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {isEs ? 'Contribución voluntaria' : isEn ? 'Voluntary contribution' : isFr ? 'Contribution volontaire' : 'Kontribisyon volontè'}
                      </div>
                    </div>
                  </button>
                )}

                {/* License quick shortcut */}
                <button
                  type="button"
                  id="btn-admin-dropdown-license"
                  onClick={() => {
                    setIsHeaderMoreMenuOpen(false);
                    setIsLicenseModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/10 transition-colors cursor-pointer text-left mt-0.5"
                >
                  <Award className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div>{isEs ? 'Licencia & Estado' : isEn ? 'License & Status' : isFr ? 'Licence & Statut' : 'Lisans & Estati'}</div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {isChurchLicensed ? 'Lisans PRO aktif' : 'Wè oswa aktive'}
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          🔥 HERO #1: SÈVIS AKTIF & SWITCH SCAN OTOMATIK
          ========================================================================= */}
      <div
        id="section-active-service-hero"
        className={`rounded-3xl border transition-all duration-300 overflow-hidden shadow-2xl ${
          activeService
            ? 'bg-gradient-to-br from-[#13233c] via-[#1E293B] to-[#0f172a] border-amber-400/40 ring-1 ring-amber-400/20'
            : 'bg-[#1E293B] border-slate-700/80'
        }`}
      >
        {/* HERO TOP BAR */}
        <div className="p-5 sm:p-6 border-b border-slate-700/80 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Active Service Info */}
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="flex h-3 w-3 relative">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                    activeService ? 'bg-emerald-400' : 'bg-amber-400'
                  } opacity-75`}
                />
                <span
                  className={`relative inline-flex rounded-full h-3 w-3 ${
                    activeService ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
              </span>

              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/40 font-mono">
                {activeService
                  ? (isEs ? 'SERVICIO ACTIVO EN LA IGLESIA' : isEn ? 'ACTIVE SERVICE IN CHURCH' : isFr ? 'SERVICE ACTIF DANS L’ÉGLISE' : 'SÈVIS AKTIF NAN LEGLIZ LA')
                  : (isEs ? 'NINGÚN SERVICIO ABIERTO' : isEn ? 'NO OPEN SERVICE' : isFr ? 'AUCUN SERVICE OUVERT' : 'OKENN SÈVIS PA LOUVRI')}
              </span>

              {activeServiceCategory && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {isEs ? activeServiceCategory.name.es : isEn ? activeServiceCategory.name.en : isFr ? activeServiceCategory.name.fr : activeServiceCategory.name.ht}
                </span>
              )}

              {isDeviceOnline() ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ● {isEs ? 'Nube Conectada' : isEn ? 'Cloud Connected' : isFr ? 'Cloud Connecté' : 'Nwaj Konekte'}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  ● {isEs ? 'Modo Offline (Auto-Sync)' : isEn ? 'Offline Mode (Auto-Sync)' : isFr ? 'Mode Hors-Ligne (Auto-Sync)' : 'Mòd Offline (Oto-Senk)'}
                </span>
              )}

              {/* License Status Badge */}
              <button
                type="button"
                onClick={() => setIsLicenseModalOpen(true)}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition cursor-pointer ${
                  isChurchLicensed
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
                }`}
                title={isEs ? 'Haga clic para ver o activar la licencia oficial' : 'Klike pou wè oswa aktive lisans ofisyèl la'}
              >
                {isChurchLicensed ? (
                  <>
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>LISANS: {activeLicense?.tier?.toUpperCase() || 'PRO'}</span>
                  </>
                ) : (
                  <>
                    <Award className="w-3 h-3 text-amber-400" />
                    <span>{isEs ? '🔑 ACTIVAR LICENCIA' : isEn ? '🔑 ACTIVATE LICENSE' : isFr ? '🔑 ACTIVER LICENCE' : '🔑 AKTIVE LISANS'}</span>
                  </>
                )}
              </button>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {activeService
                ? activeService.title
                : isEs
                ? 'Elija un servicio para abrir la asistencia'
                : isEn
                ? 'Select a service to open attendance'
                : isFr
                ? 'Sélectionnez un service pour ouvrir les présences'
                : 'Chwazi yon sèvis pou louvri prezans'}
            </h3>

            {activeService ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isEs ? 'Horario:' : isEn ? 'Schedule:' : isFr ? 'Horaire :' : 'Orè:'} {activeService.startTime} - {activeService.endTime}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {isEs ? 'Director / Predicador:' : isEn ? 'Leader / Preacher:' : isFr ? 'Dirigeant / Prédicateur :' : 'Dirijan / Predikatè:'}{' '}
                    <strong className="text-white">{activeService.preacherOrLeader}</strong>
                  </span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />
                  <span>
                    {isEs ? 'Presentes actualmente:' : isEn ? 'Currently checked in:' : isFr ? 'Présents actuellement :' : 'Prezan aktyèlman:'}{' '}
                    <strong className="text-amber-300 font-mono text-sm">{activeServiceCheckins}</strong>{' '}
                    {isEs ? 'de' : isEn ? 'of' : isFr ? 'sur' : 'sou'} {members.length} {isEs ? 'miembros' : isEn ? 'members' : isFr ? 'membres' : 'manm'} ({attendanceRate}%)
                  </span>
                </span>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                {isEs
                  ? 'Al abrir un servicio, el escáner se activa directamente para permitir que los miembros escaneen su tarjeta en la entrada rápidamente.'
                  : isEn
                  ? 'When opening a service, the scanner turns on directly so members can scan their cards at the entrance seamlessly.'
                  : isFr
                  ? 'En ouvrant un service, le scanner s’active directement pour permettre aux membres de scanner leur carte à l’entrée rapidement.'
                  : 'Lè ou louvri yon sèvis, scanner la ap aktive dirèkteman pou pèmèt manm yo eskane kat yo nan pòt la san pèdi tan.'}
              </p>
            )}
          </div>

          {/* RIGHT SIDE: CONTROLS & THE AUTO-SCAN SWITCH */}
          <div className="w-full lg:w-auto flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
            {/* If no service active, show quick-open dropdown */}
            {!activeService ? (
              <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-900/90 p-2 sm:p-2.5 rounded-2xl border border-slate-700 shadow-lg">
                <select
                  id="select-service-to-open-now"
                  value={selectedServiceToOpen}
                  onChange={(e) => setSelectedServiceToOpen(e.target.value)}
                  className="w-full sm:w-auto flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-400 min-w-0 cursor-pointer"
                >
                  {services.map((srv) => (
                    <option key={srv.id} value={srv.id}>
                      {srv.title} ({srv.startTime})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  id="btn-open-selected-service-now"
                  onClick={() => {
                    if (selectedServiceToOpen && onToggleActiveService) {
                      onToggleActiveService(selectedServiceToOpen, true);
                      toast.success(
                        isEs ? '¡Servicio Abierto!' : isEn ? 'Service Opened!' : isFr ? 'Service Ouvert !' : 'Sèvis Louvri!',
                        isEs
                          ? 'Asistencia abierta para el servicio. Puede activar el escaneo automático ahora.'
                          : isEn
                          ? 'Attendance opened for this service. You can now enable auto-scan.'
                          : isFr
                          ? 'Présence ouverte pour ce service. Vous pouvez activer le scan automatique.'
                          : 'Prezans louvri pou sèvis la. Ou ka limen scan otomatik kounye a.'
                      );
                    }
                  }}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs whitespace-nowrap cursor-pointer transition-all shadow-md flex items-center justify-center text-center active:scale-[0.98]"
                >
                  {isEs ? 'Abrir Este Servicio' : isEn ? 'Open This Service' : isFr ? 'Ouvrir ce Service' : 'Louvri Sèvis Sa a'}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                {/* AUTO-SCAN TOGGLE SWITCH */}
                <div
                  id="card-auto-scan-switch"
                  onClick={handleToggleAutoScan}
                  className={`flex items-center gap-3.5 px-4 py-2.5 rounded-2xl border cursor-pointer select-none transition-all shadow-lg ${
                    isAutoScanEnabled
                      ? 'bg-emerald-950/80 border-emerald-400/80 ring-2 ring-emerald-400/40 text-emerald-200'
                      : 'bg-slate-900/90 border-slate-700 hover:border-amber-400/60 text-slate-300'
                  }`}
                  title={isEs ? 'Haga clic para encender o apagar el escáner automático' : isEn ? 'Click to turn auto-scanner on or off' : isFr ? 'Cliquez pour allumer ou éteindre l’auto-scanner' : 'Klike pou limen oswa fèmen scanner otomatik la'}
                >
                  {/* Hardware-like Toggle Pill */}
                  <div className="relative inline-flex items-center">
                    <div
                      className={`w-12 h-6.5 rounded-full transition-colors duration-300 p-0.5 flex items-center ${
                        isAutoScanEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    >
                      <div
                        className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform duration-300 flex items-center justify-center ${
                          isAutoScanEnabled ? 'translate-x-5.5 text-emerald-600' : 'translate-x-0 text-slate-400'
                        }`}
                      >
                        {isAutoScanEnabled ? (
                          <Radio className="w-3 h-3 text-emerald-600 animate-spin" />
                        ) : (
                          <Power className="w-3 h-3 text-slate-500" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Switch Label */}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-extrabold text-white tracking-tight">
                        {isAutoScanEnabled
                          ? isEs ? 'ESCÁNER AUTOMÁTICO ENCENDIDO' : isEn ? 'AUTO-SCANNER ON' : isFr ? 'AUTO-SCANNER ACTIVÉ' : 'SCAN OTOMATIK LIMEN'
                          : isEs ? 'ENCENDER ESCÁNER AUTOMÁTICO' : isEn ? 'TURN ON AUTO-SCANNER' : isFr ? 'ACTIVER AUTO-SCANNER' : 'OUVÈ SCAN OTOMATIK'}
                      </span>
                      {isAutoScanEnabled && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      {isAutoScanEnabled
                        ? isEs ? 'La cámara escanea tarjetas al instante' : isEn ? 'Camera scans cards instantly' : isFr ? 'La caméra scanne instantanément' : 'Kamera ap pase kat yo san pèdi tan'
                        : isEs ? 'Encienda para escanear en la puerta' : isEn ? 'Turn on to scan at the door' : isFr ? 'Allumez pour scanner à la porte' : 'Limen pou eskane nan pòt la'}
                    </span>
                  </div>
                </div>

                {/* Close Service Button */}
                {onToggleActiveService && (
                  <button
                    type="button"
                    id="btn-hero-close-active-service"
                    onClick={() => {
                      if (isAutoScanEnabled) {
                        setIsAutoScanEnabled(false);
                        stopEmbeddedCamera();
                      }
                      onToggleActiveService(activeService.id, false);
                      toast.info(
                        isEs ? 'Servicio Cerrado' : isEn ? 'Service Closed' : isFr ? 'Service Fermé' : 'Sèvis Fèmen',
                        isEs ? `Asistencia cerrada para ${activeService.title}.` : isEn ? `Attendance closed for ${activeService.title}.` : isFr ? `Présence fermée pour ${activeService.title}.` : `Prezans fèmen pou ${activeService.title}.`
                      );
                    }}
                    className="px-3.5 py-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-rose-300 border border-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    {isEs ? 'Cerrar Servicio' : isEn ? 'Close Service' : isFr ? 'Fermer Service' : 'Fèmen Sèvis'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* EMBEDDED LIVE AUTO-SCANNER VIEWFINDER */}
        {activeService && isAutoScanEnabled && (
          <div className="p-5 sm:p-6 bg-slate-950/80 border-t border-slate-800 space-y-5 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex flex-col lg:flex-row gap-5 items-start">
              {/* CAMERA VIEWFINDER */}
              <div className="w-full lg:w-7/12 relative rounded-3xl bg-black border-2 border-amber-400/60 overflow-hidden shadow-2xl min-h-[260px] flex flex-col items-center justify-center">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-64 sm:h-72 object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Target Laser Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
                  <div className="w-52 h-52 sm:w-60 sm:h-60 border-2 border-dashed border-amber-400/80 rounded-3xl relative">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-amber-400 -mt-1.5 -ml-1.5 rounded-tl-xl" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-amber-400 -mt-1.5 -mr-1.5 rounded-tr-xl" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-amber-400 -mb-1.5 -ml-1.5 rounded-bl-xl" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-amber-400 -mb-1.5 -mr-1.5 rounded-br-xl" />

                    {/* Animated Scanning Laser Bar */}
                    <div className="w-full h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent absolute top-1/2 -translate-y-1/2 animate-pulse shadow-[0_0_15px_#F59E0B]" />
                  </div>
                </div>

                {/* Status Bar inside Camera */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                  <div className="bg-black/80 backdrop-blur-md px-3 py-1 rounded-full text-[11px] text-emerald-300 font-mono font-bold flex items-center gap-1.5 border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>{isEs ? 'ESCÁNER ULTRA EN VIVO' : isEn ? 'LIVE ULTRA SCANNER' : isFr ? 'ULTRA SCANNER EN DIRECT' : 'SCANNER ULTRA AN DIRÈK'}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {activeEnhancement && (
                      <div className="bg-amber-500/90 text-slate-950 font-bold px-2 py-0.5 rounded-full text-[10px] animate-pulse">
                        {activeEnhancement}
                      </div>
                    )}
                    <div className="bg-black/80 backdrop-blur-md px-3 py-1 rounded-full text-[11px] text-amber-300 font-mono font-bold border border-amber-400/30">
                      {activeServiceCheckins} {isEs ? 'Presentes ✓' : isEn ? 'Present ✓' : isFr ? 'Présents ✓' : 'Prezan ✓'}
                    </div>
                  </div>
                </div>

                {/* Floating Controls Bar (Torch, Zoom, Flip, Upload) */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* Torch Button */}
                    {hasTorch && (
                      <button
                        type="button"
                        id="btn-admin-scanner-torch"
                        onClick={handleToggleTorch}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border backdrop-blur-md flex items-center gap-1 cursor-pointer transition-colors shadow ${
                          isTorchOn
                            ? 'bg-amber-400 text-slate-950 border-amber-300'
                            : 'bg-black/70 hover:bg-black text-slate-200 border-slate-700'
                        }`}
                        title={isTorchOn ? 'Apagar Flash' : 'Encender Flash'}
                      >
                        {isTorchOn ? <Flashlight className="w-3.5 h-3.5 text-slate-950" /> : <FlashlightOff className="w-3.5 h-3.5" />}
                        <span className="text-[11px]">{isTorchOn ? 'Flash On' : 'Flash'}</span>
                      </button>
                    )}

                    {/* Zoom Button */}
                    <button
                      type="button"
                      id="btn-admin-scanner-zoom"
                      onClick={handleToggleZoom}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border backdrop-blur-md flex items-center gap-1 cursor-pointer transition-colors shadow ${
                        zoomLevel > 1
                          ? 'bg-indigo-600 text-white border-indigo-400'
                          : 'bg-black/70 hover:bg-black text-slate-200 border-slate-700'
                      }`}
                      title="Zoom 2x"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                      <span className="text-[11px]">{zoomLevel}x</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Upload Photo Button */}
                    <button
                      type="button"
                      id="btn-admin-scanner-upload"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessingFile}
                      className="px-2.5 py-1.5 rounded-xl bg-black/70 hover:bg-black text-slate-200 text-xs font-bold border border-slate-700 backdrop-blur-md flex items-center gap-1 cursor-pointer shadow disabled:opacity-50"
                      title={isEs ? 'Cargar foto de tarjeta' : 'Chaje foto kat'}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span className="text-[11px]">{isProcessingFile ? '...' : (isEs ? 'Foto' : 'Foto')}</span>
                    </button>

                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />

                    {/* Flip camera control */}
                    <button
                      type="button"
                      id="btn-admin-scanner-flip"
                      onClick={handleFlipCamera}
                      className="px-2.5 py-1.5 rounded-xl bg-black/70 hover:bg-black text-white text-xs font-bold border border-slate-700 backdrop-blur-md flex items-center gap-1 cursor-pointer shadow"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span className="text-[11px]">{isEs ? 'Girar' : isEn ? 'Flip' : isFr ? 'Tourner' : 'Vire'}</span>
                    </button>
                  </div>
                </div>

                {cameraError && (
                  <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center text-rose-300 space-y-2">
                    <AlertTriangle className="w-8 h-8 text-rose-400" />
                    <p className="text-xs font-medium">{cameraError}</p>
                    <button
                      type="button"
                      onClick={() => startEmbeddedCamera()}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold cursor-pointer"
                    >
                      {isEs ? 'Reintentar' : isEn ? 'Retry' : isFr ? 'Réessayer' : 'Eseye Ankò'}
                    </button>
                  </div>
                )}
              </div>

              {/* RIGHT SIDE: LAST SCANNED PERSON & QUICK BARCODE INPUT */}
              <div className="w-full lg:w-5/12 space-y-3.5">
                {/* Last Scanned Member Result Card */}
                {lastScanResult ? (
                  <div
                    className={`p-4 rounded-2xl border transition-all ${
                      lastScanResult.success
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200 shadow-xl ring-1 ring-emerald-500/30'
                        : lastScanResult.duplicate
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-200'
                        : 'bg-rose-500/15 border-rose-500/50 text-rose-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-base shrink-0 ${
                          lastScanResult.success
                            ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/40'
                            : lastScanResult.duplicate
                            ? 'bg-amber-500/30 text-amber-300 border border-amber-400/40'
                            : 'bg-rose-500/30 text-rose-300 border border-rose-400/40'
                        }`}
                      >
                        {lastScanResult.member?.fullName?.[0] || '!'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] uppercase font-bold tracking-wider opacity-80">
                            {lastScanResult.success
                              ? (isEs ? 'Asistencia Validada ✓' : isEn ? 'Attendance Validated ✓' : isFr ? 'Présence Validée ✓' : 'Prezans Valide ✓')
                              : lastScanResult.duplicate
                              ? (isEs ? 'Atención: Ya Registrado' : isEn ? 'Notice: Already Recorded' : isFr ? 'Attention : Déjà Enregistré' : 'Atansyon: Deja Make')
                              : (isEs ? 'Error de Escaneo' : isEn ? 'Scan Error' : isFr ? 'Erreur de Scan' : 'Erè Scan')}
                          </span>
                          <span className="text-[10px] font-mono opacity-70">
                            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>

                        {lastScanResult.member && (
                          <>
                            <h4 className="text-base font-extrabold text-white truncate mt-0.5">
                              {lastScanResult.member.fullName}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-slate-300 flex-wrap mt-1">
                              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300 font-mono font-bold text-[11px]">
                                {lastScanResult.member.memberId}
                              </span>
                              <span>•</span>
                              <span>{lastScanResult.member.department}</span>
                              <span>•</span>
                              <span className="text-emerald-400 font-semibold">{lastScanResult.member.role}</span>
                            </div>
                          </>
                        )}

                        {lastScanResult.errorMessage && (
                          <p className="text-xs text-rose-300 font-medium mt-1">
                            {lastScanResult.errorMessage}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-amber-300 flex items-center justify-center mx-auto">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <h5 className="text-xs font-bold text-white">
                      {isEs ? 'Escáner Listo para Trabajar' : isEn ? 'Scanner Ready to Scan' : isFr ? 'Scanner Prêt à l’Emploi' : 'Scanner Pare pou Travay'}
                    </h5>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                      {isEs
                        ? 'Presente la tarjeta QR o código de barras del miembro ante la cámara. Se registrará de inmediato.'
                        : isEn
                        ? 'Hold member QR card or barcode before the camera. It will be recorded immediately.'
                        : isFr
                        ? 'Présentez la carte QR ou le code-barres du membre devant la caméra pour enregistrement immédiat.'
                        : 'Prezante kat QR oswa Barcode yon manm devan kamera a. L ap anrejistre imedyatman.'}
                    </p>
                  </div>
                )}

                {/* Instant Barcode Reader / Manual Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleProcessScan(manualCodeInput, 'manual');
                  }}
                  className="space-y-1.5"
                >
                  <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isEs ? 'Escáner Láser / ID Manual:' : isEn ? 'Laser Scanner / Manual ID:' : isFr ? 'Scanner Laser / ID Manuel :' : 'Eskanè Lazè / ID Manyèl:'}</span>
                    </span>
                    <span className="text-[10px] text-slate-400">{isEs ? 'USB / Bluetooth / Teclado' : isEn ? 'USB / Bluetooth / Keyboard' : isFr ? 'USB / Bluetooth / Clavier' : 'USB / Bluetooth / Klavye'}</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        ref={barcodeInputRef}
                        type="text"
                        id="input-hero-manual-barcode"
                        value={manualCodeInput}
                        onChange={(e) => setManualCodeInput(e.target.value)}
                        placeholder={isEs ? 'Escriba el ID o use escáner láser...' : isEn ? 'Type Member ID or scan laser...' : isFr ? 'Saisissez l’ID ou utilisez le laser...' : 'Tape ID oswa pase eskanè lazè...'}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white font-mono placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!manualCodeInput.trim()}
                      className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {isEs ? 'Validar' : isEn ? 'Validate' : isFr ? 'Valider' : 'Valide'}
                    </button>
                  </div>
                </form>

                {/* Quick 1-Tap Member List Pills */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 block">
                    {isEs ? 'Marcar Asistencia Rápida (1 Clic):' : isEn ? 'Quick 1-Click Check-in:' : isFr ? 'Présence Rapide en 1 Clic :' : 'Make Prezans Rapid pou Manm (1 Klik):'}
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-slate-900/90 rounded-xl border border-slate-800">
                    {members.slice(0, 10).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        id={`btn-hero-quick-checkin-${m.id}`}
                        onClick={() => handleProcessScan(m.barcodeToken || m.memberId, 'qr_scan')}
                        className="px-2 py-1 rounded-lg text-[11px] font-medium bg-slate-800 hover:bg-slate-700 hover:text-amber-300 border border-slate-700 transition-colors text-slate-300 flex items-center gap-1 cursor-pointer"
                      >
                        <UserCheck className="w-3 h-3 text-slate-400" />
                        <span>{m.fullName}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          2. KPI METRICS GRID
          ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Members */}
        <div
          onClick={() => handleNavigate('members')}
          className="p-4 sm:p-5 rounded-2xl bg-[#1E293B] border border-slate-700/80 shadow-sm hover:border-indigo-400/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {isEs ? 'Total Miembros' : isEn ? 'Total Members' : isFr ? 'Total Membres' : 'Total Manm'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {members.length}
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-1">
            <ShieldCheck className="w-3 h-3" /> {isEs ? 'Todos con ID único' : isEn ? 'All with unique ID' : isFr ? 'Tous avec ID unique' : 'Tout gen ID inik'}
          </span>
        </div>

        {/* Members Scanned for Active Service Today */}
        <div
          id="card-active-service-scans"
          onClick={() => handleNavigate('attendance')}
          className="p-4 sm:p-5 rounded-2xl bg-[#1E293B] border border-slate-700/80 shadow-sm hover:border-amber-400/50 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
              {isEs ? 'Escaneados Activo' : isEn ? 'Active Scans' : isFr ? 'Scannés Actifs' : 'Eskane Sèvis Aktif'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <div className="text-2xl sm:text-3xl font-extrabold text-white">
              {activeServiceCheckins}
            </div>
            {activeService && (
              <span className="text-xs text-slate-400 font-medium">
                / {members.length}
              </span>
            )}
          </div>
          <div className="mt-1 truncate text-[10px]">
            {activeService ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="truncate">{activeService.title}</span>
              </span>
            ) : (
              <span className="text-slate-400 font-medium">
                {isEs ? 'Sin culto activo' : isEn ? 'No active service' : isFr ? 'Aucun culte actif' : 'Poko gen kilt aktif'}
              </span>
            )}
          </div>
        </div>

        {/* Today's Check-ins (All Services) */}
        <div
          onClick={() => handleNavigate('attendance')}
          className="p-4 sm:p-5 rounded-2xl bg-[#1E293B] border border-slate-700/80 shadow-sm hover:border-emerald-400/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {isEs ? 'Presentes Hoy' : isEn ? 'Present Today' : isFr ? 'Présents Aujourd’hui' : 'Prezan Jodi a'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {todayRecords.length}
          </div>
          <span className="text-[10px] text-slate-400 font-medium block mt-1">
            {isEs ? 'En todos los cultos de hoy' : isEn ? 'In all services today' : isFr ? 'Dans tous les cultes du jour' : 'Nan tout kilt jodi a'}
          </span>
        </div>

        {/* Active Service Rate */}
        <div
          onClick={() => handleNavigate('services')}
          className="p-4 sm:p-5 rounded-2xl bg-[#1E293B] border border-slate-700/80 shadow-sm hover:border-cyan-400/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {isEs ? 'Tasa de Asistencia' : isEn ? 'Attendance Rate' : isFr ? 'Taux de Présence' : 'Pousantaj Prezans'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {attendanceRate}%
          </div>
          <span className="text-[10px] text-cyan-300/80 font-medium block mt-1">
            {activeServiceCheckins} {isEs ? 'de' : isEn ? 'of' : isFr ? 'sur' : 'sou'} {members.length} {isEs ? 'miembros' : isEn ? 'members' : isFr ? 'membres' : 'manm'}
          </span>
        </div>

        {/* Total Announcements */}
        <div
          onClick={() => handleNavigate('announcements')}
          className="col-span-2 sm:col-span-1 p-4 sm:p-5 rounded-2xl bg-[#1E293B] border border-slate-700/80 shadow-sm hover:border-purple-400/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {isEs ? 'Anuncios Publicados' : isEn ? 'Announcements' : isFr ? 'Annonces Publiées' : 'Anons Pibliye'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {announcements.length}
          </div>
          <span className="text-[10px] text-slate-400 font-medium block mt-1">
            {isEs ? 'En el feed de noticias' : isEn ? 'In member news feed' : isFr ? 'Dans le fil d’actualités' : 'Nan fil aktyalite a'}
          </span>
        </div>
      </div>

      {/* =========================================================================
          3. ATTENDANCE RATIO PIE CHART (RECHARTS)
          ========================================================================= */}
      <AdminAttendanceRatioPieChart
        church={church}
        members={members}
        services={services}
        attendanceRecords={attendanceRecords}
        language={language}
      />

      {/* =========================================================================
          4. QUICK ACTIONS ACCORDION & RECENT ATTENDANCE FEED
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: QUICK ACTIONS ACCORDION MENU */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider">
                {isEs ? 'Menú Acordeón de Acciones' : isEn ? 'Quick Actions Accordion' : isFr ? 'Menu Accordéon d’Actions' : 'Menu Akòdeyon Aksyon'}
              </h3>
            </div>
            <button
              type="button"
              id="btn-toggle-all-accordions"
              onClick={toggleAllSections}
              className="text-[11px] font-bold text-amber-400 hover:text-amber-300 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80 transition-colors cursor-pointer"
            >
              {areAllOpen
                ? (isEs ? 'Cerrar Todo' : isEn ? 'Close All' : isFr ? 'Tout Fermer' : 'Fèmen Tout')
                : (isEs ? 'Abrir Todo' : isEn ? 'Open All' : isFr ? 'Tout Ouvrir' : 'Ouvri Tout')}
            </button>
          </div>

          <div className="space-y-2.5">
            {/* ACCORDION 1: JESYON MANM & KAT */}
            <div className="rounded-2xl bg-[#1E293B] border border-slate-700/80 overflow-hidden shadow-sm transition-all">
              <button
                type="button"
                id="accordion-header-members"
                onClick={() => toggleSection('members')}
                className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {isEs ? 'Gestión de Miembros y Tarjetas' : isEn ? 'Members & ID Cards Management' : isFr ? 'Gestion des Membres & Cartes' : 'Jesyon Manm & Kat Idantite'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {isEs ? 'ID único, código PIN, impresión de tarjetas' : isEn ? 'Unique ID, PIN code, card printing' : isFr ? 'ID unique, code PIN, impression de cartes' : 'ID inik, kòd PIN, enpresyon kat'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-[10px] font-bold text-indigo-300">
                    2 {isEs ? 'Acciones' : isEn ? 'Actions' : isFr ? 'Actions' : 'Aksyon'}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                      openSections.members ? 'rotate-180 text-amber-300' : ''
                    }`}
                  />
                </div>
              </button>

              {openSections.members && (
                <div className="p-3 pt-0 space-y-2 border-t border-slate-800/80 mt-1">
                  <button
                    type="button"
                    id="btn-quick-add-member"
                    onClick={() => handleNavigate('members')}
                    className="w-full p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/60 hover:border-amber-400/50 shadow-sm text-left flex items-center justify-between transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                        <UserPlus className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-100 group-hover:text-amber-300">
                          {isEs ? 'Agregar Nuevo Miembro' : isEn ? 'Add New Member' : isFr ? 'Ajouter Nouveau Membre' : 'Ajoute Nouvo Manm'}
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          {isEs ? 'Creación automática de Member ID y QR' : isEn ? 'Automatic Member ID and QR generation' : isFr ? 'Création automatique d’ID et QR' : 'Kreyasyon otomatik Member ID & QR'}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-300 shrink-0" />
                  </button>

                  <button
                    type="button"
                    id="btn-quick-print-cards"
                    onClick={() => handleNavigate('cards')}
                    className="w-full p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/60 hover:border-amber-400/50 shadow-sm text-left flex items-center justify-between transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                        <Printer className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-100 group-hover:text-amber-300">
                          {isEs ? 'Imprimir Tarjetas Físicas (Lote)' : isEn ? 'Print Physical ID Cards (Batch)' : isFr ? 'Imprimer Cartes Physiques (Lot)' : 'Enprime Kat Fizik (Batch)'}
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          {isEs ? 'Tarjetas de miembro con código QR y Barcode' : isEn ? 'Member ID cards with QR code and Barcode' : isFr ? 'Cartes de membres avec code QR et Code-barres' : 'Kat manm ak kòd QR & Barcode'}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-300 shrink-0" />
                  </button>
                </div>
              )}
            </div>

            {/* ACCORDION 2: ESKANE QR & PREZANS */}
            <div className="rounded-2xl bg-[#1E293B] border border-slate-700/80 overflow-hidden shadow-sm transition-all">
              <button
                type="button"
                id="accordion-header-scanner"
                onClick={() => toggleSection('scanner')}
                className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {isEs ? 'Escáner QR y Control de Asistencia' : isEn ? 'QR Scanner & Attendance Tracking' : isFr ? 'Scanner QR & Suivi des Présences' : 'Eskanè QR & Kontwòl Prezans'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {isEs ? 'Escaneo en vivo, estadísticas, reportes' : isEn ? 'Live scanning, stats, reports' : isFr ? 'Scan en direct, statistiques, rapports' : 'Eskanè an dirèk, estatistik, rapò'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-amber-300">
                    2 {isEs ? 'Acciones' : isEn ? 'Actions' : isFr ? 'Actions' : 'Aksyon'}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                      openSections.scanner ? 'rotate-180 text-amber-300' : ''
                    }`}
                  />
                </div>
              </button>

              {openSections.scanner && (
                <div className="p-3 pt-0 space-y-2 border-t border-slate-800/80 mt-1">
                  <button
                    type="button"
                    id="btn-quick-open-scanner"
                    onClick={onOpenScanner}
                    className="w-full p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/60 hover:border-amber-400/50 shadow-sm text-left flex items-center justify-between transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                        <QrCode className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-100 group-hover:text-amber-300">
                          {isEs ? 'Abrir Escáner QR / Código de Barras (Modal)' : isEn ? 'Open QR / Barcode Scanner (Modal)' : isFr ? 'Ouvrir le Scanner QR / Code-barres (Modal)' : 'Ouvri Scanner QR / Barcode (Modal)'}
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          {isEs ? 'Escanear tarjetas y marcar asistencia rápida' : isEn ? 'Scan cards and rapid check-in' : isFr ? 'Scanner les cartes et présence rapide' : 'Eskane kat manm ak prezans rapid'}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-300 shrink-0" />
                  </button>

                  <button
                    type="button"
                    id="btn-quick-attendance-report"
                    onClick={() => handleNavigate('attendance')}
                    className="w-full p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/60 hover:border-amber-400/50 shadow-sm text-left flex items-center justify-between transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-100 group-hover:text-amber-300">
                          {isEs ? 'Ver Reporte de Asistencia' : isEn ? 'View Attendance Report' : isFr ? 'Voir le Rapport de Présence' : 'Gade Rapò Prezans'}
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          {isEs ? 'Estadísticas e historial de cada servicio' : isEn ? 'Statistics and history of each service' : isFr ? 'Statistiques et historique de chaque culte' : 'Estatistik ak istwa chak sèvis'}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-300 shrink-0" />
                  </button>
                </div>
              )}
            </div>

            {/* ACCORDION 3: SÈVIS & ORÈ */}
            <div className="rounded-2xl bg-[#1E293B] border border-slate-700/80 overflow-hidden shadow-sm transition-all">
              <button
                type="button"
                id="accordion-header-services"
                onClick={() => toggleSection('services')}
                className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {isEs ? 'Servicios, Cultos y Horarios' : isEn ? 'Services, Worship & Schedules' : isFr ? 'Services, Cultes & Horaires' : 'Sèvis, Kilt & Orè'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {isEs ? '6 categorías de cultos y sesiones de asistencia' : isEn ? '6 service categories & check-in sessions' : isFr ? '6 catégories de cultes & sessions de présence' : '6 kategori kilt ak sesyon prezans'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-300">
                    {activeService ? '3' : '2'} {isEs ? 'Acciones' : isEn ? 'Actions' : isFr ? 'Actions' : 'Aksyon'}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                      openSections.services ? 'rotate-180 text-amber-300' : ''
                    }`}
                  />
                </div>
              </button>

              {openSections.services && (
                <div className="p-3 pt-0 space-y-2 border-t border-slate-800/80 mt-1">
                  <button
                    type="button"
                    id="btn-quick-new-service"
                    onClick={() => handleNavigate('services')}
                    className="w-full p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/60 hover:border-amber-400/50 shadow-sm text-left flex items-center justify-between transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-100 group-hover:text-amber-300">
                          {isEs ? 'Planificar Servicio (6 Categorías)' : isEn ? 'Schedule Service (6 Categories)' : isFr ? 'Planifier Service (6 Catégories)' : 'Planifye Sèvis (6 Kategori)'}
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          {isEs ? 'Domingo, Estudio, Ayuno, Jóvenes, etc.' : isEn ? 'Sunday, Bible Study, Fasting, Youth, etc.' : isFr ? 'Dimanche, Étude Biblique, Jeûne, Jeunesse, etc.' : 'Dimanch, Etid, Jèn, Timoun, elatriye'}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-300 shrink-0" />
                  </button>

                  <button
                    type="button"
                    id="btn-quick-service-history"
                    onClick={() => handleNavigate('history')}
                    className="w-full p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/60 hover:border-indigo-400/50 shadow-sm text-left flex items-center justify-between transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                        <History className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-100 group-hover:text-indigo-300">
                          {isEs ? 'Historial de Cultos y Asistencias' : isEn ? 'Service & Attendance History' : isFr ? 'Historique des Cultes & Présences' : 'Istwa Sèvis ak Prezans'}
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          {isEs ? 'Ver cultos finalizados, ausencias y reportes pasados' : isEn ? 'View ended services, absences and past reports' : isFr ? 'Consulter les cultes terminés, absences et rapports' : 'Gade kilt ki fini, absans ak rapò pase'}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-300 shrink-0" />
                  </button>

                  {activeService && onToggleActiveService && (
                    <button
                      type="button"
                      id="btn-quick-toggle-active-service"
                      onClick={() => onToggleActiveService(activeService.id, false)}
                      className="w-full p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/60 hover:border-rose-400/50 shadow-sm text-left flex items-center justify-between transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-100 group-hover:text-rose-300">
                            {isEs ? 'Cerrar el Servicio Activo' : isEn ? 'Close Active Service' : isFr ? 'Fermer le Service Actif' : 'Fèmen Sèvis Aktif la'}
                          </h4>
                          <p className="text-[10px] text-slate-400">
                            {isEs ? `Cerrar asistencia para: ${activeService.title}` : isEn ? `Close attendance for: ${activeService.title}` : isFr ? `Fermer présence pour : ${activeService.title}` : `Fèmen prezans pou: ${activeService.title}`}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-rose-300 shrink-0" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ACCORDION 4: KOMINIKASYON & ANONS */}
            <div className="rounded-2xl bg-[#1E293B] border border-slate-700/80 overflow-hidden shadow-sm transition-all">
              <button
                type="button"
                id="accordion-header-announcements"
                onClick={() => toggleSection('announcements')}
                className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {isEs ? 'Comunicación y Anuncios' : isEn ? 'Communication & Announcements' : isFr ? 'Communication & Annonces' : 'Kominikasyon & Anons'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {isEs ? 'Feed de noticias y notificaciones a miembros' : isEn ? 'News feed and member notifications' : isFr ? 'Fil d’actualités et notifications membres' : 'Fil aktyalite ak notifikasyon manm'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-[10px] font-bold text-purple-300">
                    1 {isEs ? 'Acción' : isEn ? 'Action' : isFr ? 'Action' : 'Aksyon'}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                      openSections.announcements ? 'rotate-180 text-amber-300' : ''
                    }`}
                  />
                </div>
              </button>

              {openSections.announcements && (
                <div className="p-3 pt-0 space-y-2 border-t border-slate-800/80 mt-1">
                  <button
                    type="button"
                    id="btn-quick-new-announcement"
                    onClick={() => handleNavigate('announcements')}
                    className="w-full p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/60 hover:border-amber-400/50 shadow-sm text-left flex items-center justify-between transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                        <PlusCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-100 group-hover:text-amber-300">
                          {isEs ? 'Crear un Anuncio' : isEn ? 'Create Announcement' : isFr ? 'Créer une Annonce' : 'Kreye yon Anons'}
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          {isEs ? 'Publicar en el muro de noticias de los miembros' : isEn ? 'Publish to members news feed' : isFr ? 'Publier dans le fil d’actualités des membres' : 'Pibliye nan fil aktyalite manm yo'}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-300 shrink-0" />
                  </button>
                </div>
              )}
            </div>

            {/* ACCORDION 5: ESPAS LEGLIZ & PARAMÈT */}
            <div className="rounded-2xl bg-[#1E293B] border border-slate-700/80 overflow-hidden shadow-sm transition-all">
              <button
                type="button"
                id="accordion-header-church"
                onClick={() => toggleSection('church')}
                className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {isEs ? 'Espacio de Iglesia y Ajustes' : isEn ? 'Church Workspace & Settings' : isFr ? 'Espace Église & Paramètres' : 'Espas Legliz & Paramèt'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {isEs ? 'Multi-iglesia, colores, plantillas de tarjetas' : isEn ? 'Multi-church, colors, ID card templates' : isFr ? 'Multi-églises, couleurs, modèles de cartes' : 'Milti-legliz, koulè, modèl kat'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-[10px] font-bold text-rose-300">
                    1 {isEs ? 'Acción' : isEn ? 'Action' : isFr ? 'Action' : 'Aksyon'}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                      openSections.church ? 'rotate-180 text-amber-300' : ''
                    }`}
                  />
                </div>
              </button>

              {openSections.church && (
                <div className="p-3 pt-0 space-y-2 border-t border-slate-800/80 mt-1">
                  <button
                    type="button"
                    id="btn-quick-manage-church"
                    onClick={() => handleNavigate('settings')}
                    className="w-full p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/60 hover:border-amber-400/50 shadow-sm text-left flex items-center justify-between transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-100 group-hover:text-amber-300">
                          {isEs ? 'Gestionar el Espacio de la Iglesia' : isEn ? 'Manage Church Workspace' : isFr ? 'Gérer l’Espace de l’Église' : 'Jere Espas Legliz la'}
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          {isEs ? 'Cambiar de iglesia o crear una nueva' : isEn ? 'Switch church branch or create new' : isFr ? 'Changer d’église ou en créer une' : 'Chanje legliz oswa kreye lòt'}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-300 shrink-0" />
                  </button>
                </div>
              )}
            </div>

            {/* ACCORDION 6: SOUTYEN & DONASYON MINISTÈ (DEV SUPPORT) */}
            {featureFlags.donationsEnabled && (
              <div className="rounded-2xl bg-gradient-to-r from-amber-950/30 to-[#1E293B] border border-amber-500/30 overflow-hidden shadow-sm transition-all">
                <button
                  type="button"
                  id="accordion-header-donation"
                  onClick={() => toggleSection('donation')}
                  className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
                      <HeartHandshake className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block flex items-center gap-1.5">
                        <span>{isEs ? 'Apoyo y Donaciones' : isEn ? 'Support & Donations' : isFr ? 'Soutien & Dons' : 'Soutyen & Donasyon'}</span>
                        <span className="text-[9px] px-1.5 py-0.2 bg-amber-400/20 text-amber-300 rounded font-mono font-bold">Jackson Charles</span>
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {activeDonationSubtitle}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-amber-300">
                      {isEs ? 'Donar' : isEn ? 'Donate' : isFr ? 'Don' : 'Fè Don'}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                        openSections.donation ? 'rotate-180 text-amber-300' : ''
                      }`}
                    />
                  </div>
                </button>

                {openSections.donation && (
                  <div className="p-3 pt-0 space-y-2 border-t border-slate-800/80 mt-1">
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-500/20 space-y-2">
                      <p className="text-[11px] text-slate-300 leading-relaxed italic">
                        &ldquo;
                        {isEs
                          ? '«Mi objetivo es ayudar a la iglesia a crecer social, espiritual y tecnológicamente.» — Jackson Charles'
                          : isEn
                          ? '“My purpose is to empower the church to grow socially, spiritually, and digitally.” — Jackson Charles'
                          : isFr
                          ? '« Mon but est d’aider l’église à grandir socialement, spirituellement et numériquement. » — Jackson Charles'
                          : '« Objektif mwen se ede legliz la grandi sosyalman, espirityèlman ak nimerikman. » — Jackson Charles'}
                        &rdquo;
                      </p>
                      <button
                        type="button"
                        id="btn-admin-accordion-open-donation"
                        onClick={() => setIsDonationModalOpen(true)}
                        className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                      >
                        <Heart className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                        <span>{isEs ? 'Abrir Cuentas de Donación' : isEn ? 'Open Donation Accounts' : isFr ? 'Ouvrir les Comptes de Don' : 'Ouvri Kont Donasyon yo'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: RECENT LIVE ATTENDANCE FEED */}
        <div className="lg:col-span-7 bg-[#1E293B] rounded-2xl border border-slate-700/80 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {isEs ? 'Últimas Asistencias Registradas' : isEn ? 'Latest Recorded Check-ins' : isFr ? 'Dernières Présences Enregistrées' : 'Dènye Prezans ki Anrejistre'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isEs
                  ? 'Actualización en tiempo real a medida que los encargados escanean en la puerta.'
                  : isEn
                  ? 'Real-time updates as door attendants scan member cards.'
                  : isFr
                  ? 'Mises à jour en direct au fur et à mesure que les préposés scannent à l’entrée.'
                  : 'Mizajou an tan reyèl lè responsab yo ap eskane nan pòt la.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleNavigate('attendance')}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 cursor-pointer"
            >
              {isEs ? 'Ver todo' : isEn ? 'View all' : isFr ? 'Voir tout' : 'Wè tout'}
            </button>
          </div>

          {attendanceRecords.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              {isEs
                ? 'Aún no hay asistencias registradas por el momento.'
                : isEn
                ? 'No check-ins recorded yet for today.'
                : isFr
                ? 'Aucune présence enregistrée pour le moment.'
                : 'Poko gen okenn prezans ki anrejistre pou kounye a.'}
            </div>
          ) : (
            <div className="space-y-2">
              {attendanceRecords.slice(0, 5).map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 transition-colors text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-xs">
                      {record.memberName[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-100">
                        {record.memberName}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                        <span className="font-mono text-amber-400 font-bold">
                          {record.memberId}
                        </span>
                        <span>•</span>
                        <span>{record.serviceTitle}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                      {isEs ? 'Presente ✓' : isEn ? 'Present ✓' : isFr ? 'Présent ✓' : 'Prezan ✓'}
                    </span>
                    <span className="text-[10px] text-slate-500 block font-mono mt-0.5">
                      {new Date(record.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* DONATION & DEV SUPPORT MODAL */}
      <DonationModal
        isOpen={isDonationModalOpen}
        onClose={() => setIsDonationModalOpen(false)}
        language={language}
      />

      {/* CHURCH LICENSE & DEVELOPER ACTIVATION MODAL */}
      <ChurchLicenseModal
        isOpen={isLicenseModalOpen}
        onClose={() => setIsLicenseModalOpen(false)}
        church={church}
        language={language}
        onLicenseUpdated={() => {
          setLicenseRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
};
