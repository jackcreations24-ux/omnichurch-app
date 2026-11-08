import React, { useState, useEffect } from 'react';
import { Camera, ShieldCheck, HardDrive, Check, X, Smartphone, ChevronRight } from 'lucide-react';
import { Language } from '../../types';
import { requestCameraPermission, isNativeAndroidApp } from '../../utils/devicePermissions';

interface DevicePermissionBannerProps {
  language?: Language;
  onDismiss?: () => void;
}

export const DevicePermissionBanner: React.FC<DevicePermissionBannerProps> = ({
  language = 'ht',
  onDismiss,
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [cameraGranted, setCameraGranted] = useState<boolean>(false);
  const [storageGranted, setStorageGranted] = useState<boolean>(true);
  const [isPrompting, setIsPrompting] = useState<boolean>(false);

  const isEs = language === 'es';
  const isFr = language === 'fr';
  const isEn = language === 'en';

  useEffect(() => {
    // Check if user already granted or dismissed prompt previously
    const hasSeenPrompt = localStorage.getItem('omnichurch_device_permissions_checked');
    
    // Check camera permission state gracefully
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'camera' as PermissionName })
        .then((status) => {
          if (status.state === 'granted') {
            setCameraGranted(true);
          } else if (!hasSeenPrompt) {
            setIsVisible(true);
          }
          status.onchange = () => {
            setCameraGranted(status.state === 'granted');
          };
        })
        .catch(() => {
          if (!hasSeenPrompt) setIsVisible(true);
        });
    } else if (!hasSeenPrompt) {
      setIsVisible(true);
    }
  }, []);

  const handleAuthorizeCamera = async () => {
    setIsPrompting(true);
    try {
      const { stream, error } = await requestCameraPermission('environment');
      if (stream) {
        setCameraGranted(true);
        // Stop stream immediately after acquiring permission
        stream.getTracks().forEach((track) => track.stop());
        localStorage.setItem('omnichurch_device_permissions_checked', 'true');
        setTimeout(() => {
          setIsVisible(false);
          if (onDismiss) onDismiss();
        }, 1200);
      } else {
        console.warn('Permission not granted:', error);
      }
    } catch (e) {
      console.warn('Permission prompt error:', e);
    } finally {
      setIsPrompting(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('omnichurch_device_permissions_checked', 'true');
    setIsVisible(false);
    if (onDismiss) onDismiss();
  };

  if (!isVisible || cameraGranted) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-gradient-to-br from-slate-900 via-[#0B1220] to-slate-950 border-2 border-amber-500/40 rounded-3xl p-4 sm:p-5 shadow-2xl shadow-amber-500/20 text-white backdrop-blur-xl relative overflow-hidden">
        {/* Top Glow Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-emerald-400 to-indigo-500" />

        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                <span>
                  {isEs
                    ? 'Permisos del Dispositivo'
                    : isFr
                    ? 'Autorisations de l’Appareil'
                    : isEn
                    ? 'Device Permissions'
                    : 'Otorizasyon Aparèy la'}
                </span>
                <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Android & Web
                </span>
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                {isEs
                  ? 'Active la cámara y el almacenamiento para escanear carnets y guardar fotos.'
                  : isFr
                  ? 'Activez la caméra et le stockage pour scanner les cartes et enregistrer les photos.'
                  : isEn
                  ? 'Enable camera & storage to scan member badges and save photos.'
                  : 'Pèmèt kamera a ak espas memwa a pou w ka eskane kat manm epi pran foto.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title="Fèmen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 my-3 text-[11px]">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/80 border border-slate-800">
            <Camera className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="truncate">
              <span className="font-bold text-slate-200 block truncate">Kamera (QR / Foto)</span>
              <span className="text-[10px] text-amber-300/90 font-medium">Pou eskane kat</span>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/80 border border-slate-800">
            <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="truncate">
              <span className="font-bold text-slate-200 block truncate">Espas Memwa</span>
              <span className="text-[10px] text-emerald-400 font-medium">Otorize nòmal</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleAuthorizeCamera}
            disabled={isPrompting}
            className="flex-1 py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 cursor-pointer active:scale-98 transition disabled:opacity-50"
          >
            {cameraGranted ? (
              <>
                <Check className="w-4 h-4 text-slate-950" />
                <span>Otorizasyon Akòde</span>
              </>
            ) : isPrompting ? (
              <span>Ap mande pèmisyon...</span>
            ) : (
              <>
                <Camera className="w-4 h-4 text-slate-950" />
                <span>{isEs ? 'Permitir Cámara Ahora' : isEn ? 'Grant Camera Access' : isFr ? 'Autoriser Caméra' : 'Otorize Kamera a'}</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition"
          >
            {isEs ? 'Más tarde' : isEn ? 'Later' : isFr ? 'Plus tard' : 'Pita'}
          </button>
        </div>
      </div>
    </div>
  );
};
