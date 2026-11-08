import React, * as reactExports from "react";
import * as _jsxRuntime from "react/jsx-runtime";
const jsxRuntimeExports: any = _jsxRuntime;

import confetti from "canvas-confetti";
import {
  Camera,
  RefreshCw,
  X as X$1,
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
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { subscribeSyncStatus, triggerOfflineSync } from "../utils/offlineQueue";
import {
  getServicesByChurch,
  getActiveService,
  getMembersByChurch,
  recordAttendanceScan,
  isDeviceOnline,
} from "../utils/storage";
import { SERVICE_CATEGORIES } from "../utils/i18n";
import {
  scannerAudio,
  decodeFrameMultiPass,
  decodeImageFile,
} from "../utils/scannerEngine";
import {
  triggerHapticFeedback,
  requestCameraPermission,
  hasTorchSupport,
  getCameraZoomRange,
  setTorchState,
  setCameraZoom,
  resetCameraPermissionPreferences,
} from "../utils/devicePermissions";

export const QrScannerModal: React.FC<any> = ({
  church,
  isOpen,
  language = "ht",
  onClose,
  onAttendanceRecorded
}) => {
  const isEs = language === "es";
  const isEn = language === "en";
  const isFr = language === "fr";
  const toast = useToast();
  const [services, setServices] = reactExports.useState([]);
  const [selectedServiceId, setSelectedServiceId] = reactExports.useState("");
  const [members, setMembers] = reactExports.useState([]);
  const [manualCode, setManualCode] = reactExports.useState("");
  const [lastResult2, setLastResult] = reactExports.useState(null);
  const [recentScans, setRecentScans] = reactExports.useState([]);
  const [isCameraActive, setIsCameraActive] = reactExports.useState(false);
  const [isCameraStarting, setIsCameraStarting] = reactExports.useState(false);
  const [cameraError, setCameraError] = reactExports.useState(null);
  const [facingMode, setFacingMode] = reactExports.useState("environment");
  const [hasTorch, setHasTorch] = reactExports.useState(false);
  const [isTorchOn, setIsTorchOn] = reactExports.useState(false);
  const [zoomRange, setZoomRange] = reactExports.useState({
    supported: false,
    min: 1,
    max: 1,
    current: 1,
    step: 0.1
  });
  const [zoomLevel, setZoomLevel] = reactExports.useState(1);
  const [isAudioMuted, setIsAudioMuted] = reactExports.useState(false);
  const [activeEnhancement, setActiveEnhancement] = reactExports.useState(null);
  const [isProcessingFile, setIsProcessingFile] = reactExports.useState(false);
  const [offlinePendingCount, setOfflinePendingCount] = reactExports.useState(0);
  const [isSyncingOffline, setIsSyncingOffline] = reactExports.useState(false);
  reactExports.useEffect(() => {
    const unsub = subscribeSyncStatus((count, syncing) => {
      setOfflinePendingCount(count);
      setIsSyncingOffline(syncing);
    });
    return unsub;
  }, []);
  const videoRef = reactExports.useRef(null);
  const canvasRef = reactExports.useRef(null);
  const animationFrameId = reactExports.useRef(null);
  const streamRef = reactExports.useRef(null);
  const isScanningRef = reactExports.useRef(false);
  const framePassCounterRef = reactExports.useRef(0);
  const fileInputRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }
    const churchServices = getServicesByChurch(church.id);
    setServices(churchServices);
    const activeSrv = getActiveService(church.id) || churchServices[0];
    if (activeSrv) {
      setSelectedServiceId(activeSrv.id);
    }
    setMembers(getMembersByChurch(church.id));
    setLastResult(null);
    const autoOpenTimer = setTimeout(() => {
      startCamera();
    }, 120);
    return () => {
      clearTimeout(autoOpenTimer);
      stopCamera();
    };
  }, [isOpen, church.id]);
  const currentService = services.find((s3) => s3.id === selectedServiceId);
  const categoryConfig = currentService ? SERVICE_CATEGORIES[currentService.category] : null;
  const processScanCode = (code: string, method: any = "qr_scan", enhancement?: string) => {
    var _a3, _b3, _c2, _d2, _e3, _f2, _g2, _h2, _i2, _j2, _k2, _l2, _m2, _n2;
    if (!code.trim() || !selectedServiceId) return;
    const res = recordAttendanceScan({
      currentChurchId: church.id,
      rawCode: code.trim(),
      serviceId: selectedServiceId,
      method,
      recordedBy: "Ultra Scanner Live"
    });
    setLastResult(res);
    setRecentScans((prev) => [res, ...prev.slice(0, 7)]);
    if (!isAudioMuted) {
      if (res.success) {
        scannerAudio.play("success");
      } else if (res.duplicate) {
        scannerAudio.play("duplicate");
      } else {
        scannerAudio.play("error");
      }
    }
    triggerHapticFeedback(res.success ? [40, 50, 40] : res.duplicate ? [80, 80] : 120);
    if (res.success && res.record) {
      if (res.isOfflineSaved) {
        toast.info(
          isEs ? "💾 Asistencia Guardada Localmente (Offline)" : isEn ? "💾 Attendance Saved Locally (Offline)" : isFr ? "💾 Présence Enregistrée Localement (Offline)" : "💾 Prezans Sove Lokalman (Offline)",
          isEs ? `${(_a3 = res.member) == null ? void 0 : _a3.fullName} (${(_b3 = res.member) == null ? void 0 : _b3.memberId}) — Guardado localmente. Se sincronizará automáticamente al volver la conexión.` : isEn ? `${(_c2 = res.member) == null ? void 0 : _c2.fullName} (${(_d2 = res.member) == null ? void 0 : _d2.memberId}) — Saved locally. Will auto-sync when connection returns.` : isFr ? `${(_e3 = res.member) == null ? void 0 : _e3.fullName} (${(_f2 = res.member) == null ? void 0 : _f2.memberId}) — Enregistré localement. Se synchronisera automatiquement dès le retour de la connexion.` : `${(_g2 = res.member) == null ? void 0 : _g2.fullName} (${(_h2 = res.member) == null ? void 0 : _h2.memberId}) — Done anrejistre lokalman. L ap senkronize otomatikman lè koneksyon an retounen.`
        );
      } else {
        toast.success(
          isEs ? "¡Asistencia Registrada!" : isEn ? "Attendance Recorded!" : isFr ? "Présence Enregistrée !" : "Prezans Anrejistre!",
          `${(_i2 = res.member) == null ? void 0 : _i2.fullName} (${(_j2 = res.member) == null ? void 0 : _j2.memberId}) • ${(currentService == null ? void 0 : currentService.title) || (isEs ? "Servicio" : isEn ? "Service" : isFr ? "Service" : "Sèvis")}`
        );
      }
      try {
        confetti({
          particleCount: 45,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#F59E0B", "#10B981", "#6366F1", "#38BDF8", "#FCD34D"],
          disableForReducedMotion: true
        });
      } catch (e3) {
      }
      if (onAttendanceRecorded) {
        onAttendanceRecorded(res.record);
      }
    } else if (res.duplicate) {
      toast.warning(
        isEs ? "Asistencia Ya Registrada" : isEn ? "Attendance Already Recorded" : isFr ? "Présence Déjà Enregistrée" : "Prezans Deja Anrejistre",
        isEs ? `${((_k2 = res.member) == null ? void 0 : _k2.fullName) || "El miembro"} ya está marcado como presente en este servicio.` : isEn ? `${((_l2 = res.member) == null ? void 0 : _l2.fullName) || "Member"} is already marked present for this service.` : isFr ? `${((_m2 = res.member) == null ? void 0 : _m2.fullName) || "Le membre"} est déjà noté présent pour ce service.` : `${((_n2 = res.member) == null ? void 0 : _n2.fullName) || "Manm nan"} deja make prezan nan sèvis sa a.`
      );
    } else {
      toast.error(
        isEs ? "Acceso Denegado / Error de Escaneo" : isEn ? "Access Denied / Scan Error" : isFr ? "Accès Refusé / Erreur de Scan" : "Aksè Refize / Erè Scan",
        res.errorMessage || (isEs ? "Este código no es reconocido para esta iglesia." : isEn ? "This code is not recognized for this church." : isFr ? "Ce code n’est pas reconnu pour cette église." : "Kòd sa a pa rekonèt pou legliz sa a.")
      );
    }
    setManualCode("");
  };
  const scanVideoFrame = async () => {
    if (!videoRef.current || !canvasRef.current || !isScanningRef.current) return;
    const video = videoRef.current;
    const canvas2 = canvasRef.current;
    const ctx = canvas2.getContext("2d", { willReadFrequently: true });
    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas2.width = video.videoWidth || 640;
      canvas2.height = video.videoHeight || 480;
      if (zoomLevel > 1 && !zoomRange.supported) {
        const cropWidth = canvas2.width / zoomLevel;
        const cropHeight = canvas2.height / zoomLevel;
        const startX = (canvas2.width - cropWidth) / 2;
        const startY = (canvas2.height - cropHeight) / 2;
        ctx.drawImage(video, startX, startY, cropWidth, cropHeight, 0, 0, canvas2.width, canvas2.height);
      } else {
        ctx.drawImage(video, 0, 0, canvas2.width, canvas2.height);
      }
      try {
        const detection = await decodeFrameMultiPass(
          video,
          canvas2,
          framePassCounterRef.current++
        );
        if (detection && detection.code) {
          if (detection.enhancementLabel) {
            setActiveEnhancement(detection.enhancementLabel);
          }
          processScanCode(detection.code, "qr_scan", detection.enhancementLabel);
          isScanningRef.current = false;
          setTimeout(() => {
            setActiveEnhancement(null);
            isScanningRef.current = true;
          }, 2e3);
        }
      } catch (err) {
        console.warn("Frame detection cycle error:", err);
      }
    }
    if (isScanningRef.current) {
      animationFrameId.current = requestAnimationFrame(scanVideoFrame);
    }
  };
  const startCamera = async (overrideFacing?: any) => {
    setCameraError(null);
    setIsCameraStarting(true);
    const targetFacing = overrideFacing || facingMode;
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t3) => t3.stop());
        streamRef.current = null;
      }
      const { stream, error } = await requestCameraPermission(targetFacing);
      if (error || !stream) {
        throw new Error(error || (isEs ? "Cámara no disponible." : "Kamera pa disponib."));
      }
      streamRef.current = stream;
      setHasTorch(hasTorchSupport(stream));
      setIsTorchOn(false);
      const zRange = getCameraZoomRange(stream);
      setZoomRange(zRange);
      setZoomLevel(1);
      setIsCameraActive(true);
      const attachStreamToVideo = async () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.setAttribute("autoplay", "true");
          videoRef.current.muted = true;
          try {
            await videoRef.current.play();
          } catch (playErr) {
            console.warn("Video play auto-resume warning:", playErr);
          }
          isScanningRef.current = true;
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
      console.warn("Camera access denied or unavailable", err);
      setIsCameraStarting(false);
      setIsCameraActive(false);
      const errorMsg = err instanceof Error ? err.message : isEs ? "Cámara no disponible o denegada." : isEn ? "Camera unavailable or permission denied." : isFr ? "Caméra indisponible ou accès refusé." : "Kamera pa disponib oswa refize.";
      setCameraError(
        isEs ? `No se puede abrir la cámara (${errorMsg}). Puede ingresar el ID del miembro manualmente o subir una foto abajo.` : isEn ? `Unable to open camera (${errorMsg}). You can enter Member ID manually or upload a photo below.` : isFr ? `Impossible d’ouvrir la caméra (${errorMsg}). Vous pouvez saisir l’ID manuellement ou importer une photo ci-dessous.` : `Kamera pa kapab ouvri (${errorMsg}). Ou ka antre ID manm nan manyèlman oswa enpòte yon foto anba a.`
      );
    }
  };
  const stopCamera = () => {
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
    setIsCameraActive(false);
    setIsCameraStarting(false);
    setIsTorchOn(false);
    setActiveEnhancement(null);
  };
  const handleToggleTorch = async () => {
    if (!streamRef.current) return;
    const nextState = !isTorchOn;
    const success = await setTorchState(streamRef.current, nextState);
    if (success) {
      setIsTorchOn(nextState);
    } else {
      toast.info(
        isEs ? "Flash / Linterna no soportada" : "Flash pa sipòte sou kamera sa a",
        isEs ? "El hardware de su cámara no permite controlar el flash directamente." : "Kamera aparèy la pa pèmèt kontwòl flash dirèk."
      );
    }
  };
  const handleFlipCamera = async () => {
    const nextFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextFacing);
    stopCamera();
    await startCamera(nextFacing);
  };
  const handleToggleZoom = async () => {
    const nextZoom = zoomLevel === 1 ? 2 : 1;
    setZoomLevel(nextZoom);
    if (zoomRange.supported && streamRef.current) {
      await setCameraZoom(streamRef.current, nextZoom);
    }
  };
  const handleFileUpload = async (e3) => {
    var _a3;
    const file = (_a3 = e3.target.files) == null ? void 0 : _a3[0];
    if (!file) return;
    setIsProcessingFile(true);
    try {
      const detection = await decodeImageFile(file);
      if (detection && detection.code) {
        toast.success(
          isEs ? "¡Código Detectado de la Foto!" : isEn ? "Code Detected from Photo!" : isFr ? "Code Détecté depuis la Photo !" : "Kòd Detekte nan Foto a!",
          detection.enhancementLabel || (isEs ? "Imagen decodificada con éxito" : "Foto a trete avèk siksè")
        );
        processScanCode(detection.code, "qr_scan", detection.enhancementLabel);
      } else {
        toast.error(
          isEs ? "No se pudo detectar código QR" : isEn ? "Could not detect QR code" : isFr ? "Impossible de détecter le code QR" : "Pa ka detekte kòd QR nan foto a",
          isEs ? "Asegúrese de que el código QR esté bien enfocado y no tenga sombras excesivas." : isEn ? "Ensure the QR code is in focus and without excessive shadows." : isFr ? "Vérifiez que le code QR soit bien net et sans reflets excessifs." : "Asire w ke kòd QR la klè, li pa twò flou epi li parèt konplè."
        );
      }
    } catch (err) {
      console.error("File scan error:", err);
      toast.error(
        isEs ? "Error al procesar la foto" : isEn ? "Error processing photo" : isFr ? "Erreur lors du traitement" : "Erè pandan tretman foto a"
      );
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };
  reactExports.useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);
  if (!isOpen) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative w-full max-w-2xl bg-[#0F172A] rounded-2xl shadow-2xl border border-slate-700/80 overflow-hidden my-auto max-h-[92vh] flex flex-col text-slate-200", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-[#1E293B] text-white p-4 flex items-center justify-between border-b border-slate-700/80", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Camera, { className: "w-5 h-5" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-bold text-base text-white", children: isEs ? "Escanear Asistencia & Código QR" : isEn ? "Scan Attendance & QR Code" : isFr ? "Scanner Présence & Code QR" : "Scan Prezans & Kòd QR" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-mono font-semibold", children: church.code }),
            isDeviceOnline() ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-emerald-400" }),
              "Online"
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-amber-400" }),
              isEs ? "Offline (Auto-Sync)" : isEn ? "Offline (Auto-Sync)" : isFr ? "Hors-ligne (Auto-Sync)" : "Offline (Oto-Senk)"
            ] }),
            offlinePendingCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: () => triggerOfflineSync(),
                title: isEs ? "Sincronizar ahora" : isFr ? "Synchroniser maintenant" : isEn ? "Sync now" : "Senkronize kounye a",
                className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold animate-pulse cursor-pointer hover:bg-blue-500/30 transition-colors",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: `w-2.5 h-2.5 ${isSyncingOffline ? "animate-spin" : ""}` }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                    offlinePendingCount,
                    " ",
                    isEs ? "en cola" : isFr ? "en attente" : isEn ? "queued" : "nan ke"
                  ] })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400", children: isEs ? "Detección automática de servicios, guardado offline y prevención de duplicados" : isEn ? "Automatic service detection, offline storage and duplicate attendance prevention" : isFr ? "Détection automatique des cultes, sauvegarde hors-ligne et prévention des doublons" : "Deteksyon otomatik sèvis, sovgad lokal offline ak prevansyon doub prezans" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          id: "btn-close-scanner-modal",
          onClick: () => {
            stopCamera();
            onClose();
          },
          className: "p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(X$1, { className: "w-5 h-5" })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-[#1E293B]/70 border-b border-slate-700/80 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex h-2.5 w-2.5 relative", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] uppercase font-bold tracking-wider text-amber-400 block", children: isEs ? "Servicio Activo para Escaneo (Detección Automática)" : isEn ? "Active Service for Scanning (Auto-Detection)" : isFr ? "Service Actif pour Scanner (Détection Auto)" : "Sèvis Aktif pou Scan (Deteksyon Otomatik)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-sm font-bold text-white", children: currentService ? currentService.title : isEs ? "Ningún servicio seleccionado" : isEn ? "No service selected" : isFr ? "Aucun service sélectionné" : "Okenn sèvis chwazi" }),
            categoryConfig && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-2 py-0.5 rounded text-[10px] font-semibold border bg-slate-900 border-slate-700 text-slate-300", children: categoryConfig.name[language] || categoryConfig.name.ht })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "select-scan-service", className: "text-xs text-slate-400 font-medium whitespace-nowrap", children: isEs ? "Cambiar Servicio:" : isEn ? "Switch Service:" : isFr ? "Changer de Culte :" : "Chanje Sèvis:" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "select",
          {
            id: "select-scan-service",
            value: selectedServiceId,
            onChange: (e3) => setSelectedServiceId(e3.target.value),
            className: "text-xs bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 font-medium text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-400",
            children: services.map((srv) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: srv.id, children: [
              srv.isOpenForAttendance ? isEs ? "🟢 (ACTIVO) " : isEn ? "🟢 (ACTIVE) " : isFr ? "🟢 (ACTIF) " : "🟢 (AKTIF) " : "",
              srv.title,
              " (",
              srv.date,
              ")"
            ] }, srv.id))
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 sm:p-5 overflow-y-auto space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative rounded-2xl bg-slate-950 overflow-hidden border border-slate-800 flex flex-col items-center justify-center min-h-[260px]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `relative w-full h-64 sm:h-72 bg-black flex items-center justify-center overflow-hidden ${isCameraActive ? "block" : "hidden"}`, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "video",
            {
              ref: videoRef,
              playsInline: true,
              autoPlay: true,
              muted: true,
              className: "w-full h-full object-cover"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("canvas", { ref: canvasRef, className: "hidden" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-20 pointer-events-auto", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/70 text-[11px] text-amber-300 font-mono shadow-md", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Zap, { className: "w-3.5 h-3.5 text-amber-400 animate-pulse" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Ultra HD 4-Pas" }),
              activeEnhancement && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1 pl-1.5 border-l border-slate-600 text-emerald-300 font-sans text-[10px] font-medium animate-fade-in", children: activeEnhancement })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  id: "btn-scanner-torch-toggle",
                  onClick: handleToggleTorch,
                  title: isTorchOn ? isEs ? "Apagar Linterna" : "Etenn Flash" : isEs ? "Encender Linterna" : "Limen Flash",
                  className: `p-2 rounded-xl backdrop-blur-md border transition-all cursor-pointer shadow-lg ${isTorchOn ? "bg-amber-400 text-slate-950 border-amber-300 ring-2 ring-amber-400/50 shadow-amber-400/20" : "bg-slate-900/80 text-slate-300 hover:text-white border-slate-700/80 hover:bg-slate-800"}`,
                  children: isTorchOn ? /* @__PURE__ */ jsxRuntimeExports.jsx(Flashlight, { className: "w-4 h-4 text-slate-950" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(FlashlightOff, { className: "w-4 h-4 text-slate-400" })
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  id: "btn-scanner-zoom-toggle",
                  onClick: handleToggleZoom,
                  title: zoomLevel === 1 ? "Zoom 2x" : "Zoom 1x",
                  className: `px-2.5 py-1.5 rounded-xl backdrop-blur-md border transition-all cursor-pointer shadow-lg text-[11px] font-mono font-bold flex items-center gap-1 ${zoomLevel > 1 ? "bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-500/40" : "bg-slate-900/80 text-slate-300 hover:text-white border-slate-700/80 hover:bg-slate-800"}`,
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(ZoomIn, { className: "w-3.5 h-3.5" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                      zoomLevel,
                      "x"
                    ] })
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  id: "btn-scanner-flip-camera",
                  onClick: handleFlipCamera,
                  title: isEs ? "Cambiar Cámara" : "Vire Kamera",
                  className: "p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md text-slate-300 hover:text-white border border-slate-700/80 transition-all cursor-pointer shadow-lg",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-4 h-4" })
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 pointer-events-none flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-52 h-52 sm:w-56 sm:h-56 border-2 border-dashed border-amber-400/90 rounded-2xl relative shadow-[0_0_20px_rgba(245,158,11,0.15)]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-amber-400 -mt-1 -ml-1 rounded-tl-sm" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-amber-400 -mt-1 -mr-1 rounded-tr-sm" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-amber-400 -mb-1 -ml-1 rounded-bl-sm" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-amber-400 -mb-1 -mr-1 rounded-br-sm" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute left-1 right-1 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_#F59E0B] animate-bounce top-1/2 -translate-y-1/2" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-black/75 backdrop-blur-md px-3 py-1 rounded-full text-[11px] text-emerald-300 font-mono flex items-center gap-1.5 shadow-md border border-emerald-500/20", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-2 h-2 rounded-full bg-emerald-400 animate-ping" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Listo para escanear" : "Pare pou scanne..." })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] text-slate-300 font-mono border border-slate-700", children: facingMode === "environment" ? isEs ? "Cámara Trasera" : "Kamera Dèyè" : isEs ? "Cámara Frontal" : "Kamera Devan" })
          ] })
        ] }),
        isCameraActive && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-2.5 bg-slate-900/90 border-t border-slate-800/80 w-full flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[11px] text-emerald-400 flex items-center gap-1.5 font-mono", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-2 h-2 rounded-full bg-emerald-400 animate-pulse" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Lector QR Activo" : isEn ? "QR Reader Active" : isFr ? "Lecteur QR Actif" : "Lektè QR Aktif" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              id: "btn-stop-camera",
              onClick: stopCamera,
              className: "text-xs text-rose-400 hover:text-rose-300 px-3 py-1 rounded-lg hover:bg-rose-950/40 cursor-pointer transition font-medium",
              children: isEs ? "Pausar Cámara" : isEn ? "Pause Camera" : isFr ? "Pause Caméra" : "Fèmen Kamera"
            }
          )
        ] }),
        !isCameraActive && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 text-center text-slate-300 space-y-3 w-full", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center mx-auto text-amber-400 shadow-xl", children: isCameraStarting ? /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-7 h-7 text-amber-400 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Camera, { className: "w-7 h-7" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("h4", { className: "text-sm font-bold text-white flex items-center justify-center gap-1.5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isCameraStarting ? isEs ? "Iniciando Escáner de Cámara..." : "N ap ouvri lektè kamera a..." : isEs ? "Ultra Escáner QR de Alta Precisión" : isEn ? "High-Precision Ultra QR Scanner" : isFr ? "Ultra Scanner QR Haute Précision" : "Ultra Scanner QR Segondè Presizyon" }),
              !isCameraStarting && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 text-[10px] font-mono border border-amber-400/30", children: "v2.0" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-400 max-w-md mx-auto pt-1 leading-relaxed", children: isCameraStarting ? isEs ? "Conectando con la cámara del dispositivo móvil..." : "Koneksyon dirèk ak kamera telefòn lan pou lekti QR rapid..." : isEs ? "Motor multi-filtro avanzado: lee códigos borrosos, con poca luz o en cámaras de baja calidad. Puede usar su teléfono como lector de códigos." : isEn ? "Advanced multi-filter engine: reads blurry codes, low-light conditions, or low-grade cameras. Easily use your phone as a scanner." : isFr ? "Moteur multi-filtre avancé : lit les codes flous, sous faible luminosité ou capteurs anciens. Utilisez votre téléphone comme lecteur." : "Motè 4-pas avanse: li kòd ki flou, kote ki pa gen anpil limyè oswa sou ti kamera senp. Ou ka itilize telefòn ou kòm lektè trè fasil." })
          ] }),
          cameraError && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-left bg-rose-950/40 border border-rose-800/80 p-3.5 rounded-2xl space-y-2 max-w-lg mx-auto", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-rose-300 font-medium", children: cameraError }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2 pt-1", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: () => {
                  resetCameraPermissionPreferences();
                  startCamera();
                },
                className: "px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] flex items-center gap-1.5 cursor-pointer border border-slate-700 transition",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-3.5 h-3.5 text-amber-400" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEs ? "Reintentar Permiso" : isFr ? "Réessayer Permission" : isEn ? "Retry Permission" : "Re-eseye Otorizasyon" })
                ]
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 space-y-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "font-bold text-slate-300 flex items-center gap-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(CircleQuestionMark, { className: "w-3.5 h-3.5 text-amber-400" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Gid pou Otorize Kamera sou Android:" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("ol", { className: "list-decimal list-inside text-slate-400 space-y-0.5 pl-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
                  "Ale nan ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Paramèt (Settings)" }),
                  " sou telefòn ou"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
                  "Chwazi ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Aplikasyon (Apps)" }),
                  " > ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "OmniChurch" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
                  "Klike sou ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Otorizasyon (Permissions)" }),
                  " > ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Kamera" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
                  "Chwazi ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Pèmèt (Allow)" })
                ] })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap items-center justify-center gap-2.5 pt-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              id: "btn-start-camera",
              onClick: () => startCamera(),
              disabled: isCameraStarting,
              className: "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-colors shadow-lg cursor-pointer disabled:opacity-50",
              children: [
                isCameraStarting ? /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-4 h-4 animate-spin text-slate-950" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Camera, { className: "w-4 h-4" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isCameraStarting ? isEs ? "Abriendo Cámara..." : "Kamera ap Ouvri..." : isEs ? "Abrir Cámara para Escanear" : isEn ? "Open Camera to Scan" : isFr ? "Ouvrir la Caméra pour Scanner" : "Ouvri Kamera pou Scan" })
              ]
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-3 gap-2 pt-3 max-w-md mx-auto text-[11px] text-slate-400", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-2 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col items-center text-center", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Sun, { className: "w-3.5 h-3.5 text-amber-400 mb-1" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-slate-300", children: "Low-Light Boost" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-slate-500", children: "Klète amelyore" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-2 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col items-center text-center", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Layers, { className: "w-3.5 h-3.5 text-indigo-400 mb-1" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-slate-300", children: "Anti-Blur Filter" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-slate-500", children: "Netwaye flou" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-2 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col items-center text-center", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "w-3.5 h-3.5 text-emerald-400 mb-1" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-slate-300", children: "Offline Ready" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-slate-500", children: "Mizajou lokal" })
            ] })
          ] })
        ] })
      ] }),
      lastResult2 && /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          id: "scan-result-banner",
          className: `p-4 rounded-xl border transition-all ${lastResult2.success ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-lg ring-1 ring-emerald-500/30" : lastResult2.duplicate ? "bg-amber-500/10 border-amber-500/30 text-amber-300" : "bg-rose-500/10 border-rose-500/30 text-rose-300"}`,
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3", children: [
            lastResult2.success ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-1 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "w-5 h-5 text-emerald-400" }) }) : lastResult2.duplicate ? /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "w-6 h-6 text-amber-400 shrink-0 mt-0.5" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, { className: "w-6 h-6 text-rose-400 shrink-0 mt-0.5" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "font-bold text-sm", children: lastResult2.success ? isEs ? "Asistencia registrada con éxito ✓" : isEn ? "Attendance recorded successfully ✓" : isFr ? "Présence enregistrée avec succès ✓" : "Prezans anrejistre avèk siksè ✓" : lastResult2.duplicate ? isEs ? "Atención: Asistencia ya registrada" : isEn ? "Warning: Attendance already recorded" : isFr ? "Attention : Présence déjà enregistrée" : "Atansyon: Prezans deja anrejistre" : isEs ? "Error de Escaneo / Denegado" : isEn ? "Scan Error / Denied" : isFr ? "Erreur de Scan / Refusé" : "Erè Scan / Refize" }),
                  lastResult2.success && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-2 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-400/40 text-[10px] font-bold text-emerald-300 flex items-center gap-1", children: isEs ? "🎉 ¡Gracias por su participación!" : isEn ? "🎉 Thank you for participating!" : isFr ? "🎉 Merci pour votre participation !" : "🎉 Mèsi pou patisipasyon w!" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-mono opacity-70", children: (/* @__PURE__ */ new Date()).toLocaleTimeString() })
              ] }),
              lastResult2.member && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1 text-xs text-slate-300", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold text-white", children: lastResult2.member.fullName }),
                " (",
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-amber-300", children: lastResult2.member.memberId }),
                ") •",
                " ",
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: lastResult2.member.department })
              ] }),
              lastResult2.errorMessage && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs mt-1 font-medium", children: lastResult2.errorMessage })
            ] })
          ] })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-[#1E293B] rounded-xl p-3.5 border border-slate-700/80 space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs font-bold text-white flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Zap, { className: "w-3.5 h-3.5 text-amber-400" }),
            isEs ? "Registro Manual & Lista Rápida de Miembros" : isEn ? "Manual Check-in & Quick Member List" : isFr ? "Pointage Manuel & Liste Rapide des Membres" : "Anrejistreman Manyèl & Lis Rapid Manm"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-slate-400 font-medium", children: isEs ? "Haga clic en un miembro o escriba su código" : isEn ? "Click on a member or type their code" : isFr ? "Cliquez sur un membre ou tapez son code" : "Klike sou yon manm oswa tape kòd li" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 bg-slate-900 rounded-lg border border-slate-700", children: members.map((m2) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            id: `btn-quick-checkin-${m2.id}`,
            onClick: () => processScanCode(m2.barcodeToken || m2.memberId, "qr_scan"),
            className: "px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 hover:text-amber-300 border border-slate-700 transition-colors flex items-center gap-1.5 text-slate-300 cursor-pointer",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(UserCheck, { className: "w-3 h-3 text-slate-400" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: m2.fullName }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-[10px] text-amber-400", children: [
                "(",
                m2.memberId,
                ")"
              ] })
            ]
          },
          m2.id
        )) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "form",
          {
            onSubmit: (e3) => {
              e3.preventDefault();
              processScanCode(manualCode, "manual");
            },
            className: "flex gap-2 pt-1",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "w-4 h-4 text-slate-400 absolute left-3 top-2.5" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: "text",
                    id: "input-manual-member-code",
                    placeholder: isEs ? "Escriba el Member ID (ej: CH001-JD4827 o nombre)" : isEn ? "Type Member ID (e.g. CH001-JD4827 or name)" : isFr ? "Tapez ID Membre (ex. CH001-JD4827 ou nom)" : "Tape Member ID (eg: CH001-JD4827 oswa non manm)",
                    value: manualCode,
                    onChange: (e3) => setManualCode(e3.target.value),
                    className: "w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-400 bg-slate-900 text-slate-200"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "submit",
                  id: "btn-submit-manual-scan",
                  disabled: !manualCode.trim(),
                  className: "px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs disabled:opacity-50 transition-colors cursor-pointer",
                  children: isEs ? "Marcar Presencia" : isEn ? "Mark Present" : isFr ? "Pointer Présence" : "Make Prezans"
                }
              )
            ]
          }
        )
      ] }),
      recentScans.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h5", { className: "text-xs font-bold text-slate-300 uppercase tracking-wider", children: isEs ? `Últimos Escaneos en esta Sesión (${recentScans.length})` : isEn ? `Recent Scans in this Session (${recentScans.length})` : isFr ? `Derniers Scans de cette Session (${recentScans.length})` : `Dènye Scan nan Sesyon Sa a (${recentScans.length})` }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1.5 max-h-36 overflow-y-auto", children: recentScans.map((scan, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: `flex items-center justify-between p-2 rounded-lg text-xs border ${scan.success ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : scan.duplicate ? "bg-amber-500/10 border-amber-500/30 text-amber-300" : "bg-rose-500/10 border-rose-500/30 text-rose-300"}`,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                scan.success ? /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "w-4 h-4 text-emerald-400" }) : scan.duplicate ? /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "w-4 h-4 text-amber-400" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, { className: "w-4 h-4 text-rose-400" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-white", children: scan.member ? scan.member.fullName : isEs ? "Código Desconocido" : isEn ? "Unknown Code" : isFr ? "Code Inconnu" : "Kòd Enkoni" }),
                  scan.member && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] text-slate-400 font-mono ml-1.5", children: [
                    "(",
                    scan.member.memberId,
                    ")"
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-mono", children: scan.success ? isEs ? "✓ Presente" : isEn ? "✓ Present" : isFr ? "✓ Présent" : "✓ Prezan" : scan.duplicate ? isEs ? "Duplicado" : isEn ? "Duplicate" : isFr ? "Doublon" : "Doub" : isEs ? "Rechazado" : isEn ? "Rejected" : isFr ? "Rejeté" : "Refize" })
            ]
          },
          idx
        )) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-[#1E293B] p-3 sm:p-3.5 border-t border-slate-700/80 flex flex-wrap items-center justify-between gap-2.5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          id: "btn-toggle-scanner-sound",
          onClick: () => setIsAudioMuted(!isAudioMuted),
          className: `flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-xl border transition-colors cursor-pointer ${isAudioMuted ? "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"}`,
          children: isAudioMuted ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(VolumeX, { className: "w-3.5 h-3.5 text-slate-400" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden xs:inline", children: isEs ? "Sonido Silenciado" : isEn ? "Muted" : isFr ? "Silencieux" : "Son Koupe" })
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Volume2, { className: "w-3.5 h-3.5 text-emerald-400" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden xs:inline", children: isEs ? "Bip Activo" : isEn ? "Beep On" : isFr ? "Bip Actif" : "Son Bip Aktif" })
          ] })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          id: "btn-upload-photo-scan",
          onClick: () => {
            var _a3;
            return (_a3 = fileInputRef.current) == null ? void 0 : _a3.click();
          },
          disabled: isProcessingFile,
          className: "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 shadow-md transition-colors cursor-pointer disabled:opacity-50",
          title: isEs ? "Importar / Tomar Foto de Carnet" : isEn ? "Upload / Snap Card Photo" : isFr ? "Importer / Prendre Photo Carte" : "Enpòte / Pran Foto Kat",
          children: [
            isProcessingFile ? /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-3.5 h-3.5 text-amber-400 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { className: "w-3.5 h-3.5 text-amber-400" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isProcessingFile ? isEs ? "Analizando Foto..." : "Tretman Foto..." : isEs ? "Importar / Foto Carnet" : isEn ? "Upload / Snap Card" : isFr ? "Importer / Photo Carte" : "Enpòte / Pran Foto Kat" })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          ref: fileInputRef,
          type: "file",
          accept: "image/*",
          capture: "environment",
          onChange: handleFileUpload,
          className: "hidden"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          id: "btn-done-scanner",
          onClick: () => {
            stopCamera();
            onClose();
          },
          className: "px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium text-xs transition-colors cursor-pointer",
          children: isEs ? "Cerrar Escáner" : isEn ? "Close Scanner" : isFr ? "Fermer le Scanner" : "Fèmen Scanner"
        }
      )
    ] })
  ] }) });
};
export default QrScannerModal;
