import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Monitor,
  Download,
  Terminal,
  Share2,
  Copy,
  Check,
  Globe,
  ExternalLink,
  ShieldCheck,
  FileCode,
  Layers,
  Smartphone,
  QrCode as QrCodeIcon,
  HelpCircle,
  FolderOpen,
  Play,
  CheckCircle2,
  AlertCircle,
  Save,
} from 'lucide-react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { Church, Language, UserRole } from '../../types';
import { useToast } from '../../context/ToastContext';
import { saveChurch } from '../../utils/storage';

interface DesktopAppDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  church?: Church | null;
  language?: Language;
  userRole?: UserRole;
  onChurchSaved?: () => void;
}

export const DesktopAppDownloadModal: React.FC<DesktopAppDownloadModalProps> = ({
  isOpen,
  onClose,
  church,
  language = 'ht',
  userRole = 'member',
  onChurchSaved,
}) => {
  const toast = useToast();
  const isEs = language === 'es';
  const isEn = language === 'en';
  const isFr = language === 'fr';

  const [activeTab, setActiveTab] = useState<'build' | 'download' | 'share'>('build');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [exeUrlInput, setExeUrlInput] = useState<string>(church?.windowsExeDownloadUrl || '');
  const [isSavingUrl, setIsSavingUrl] = useState<boolean>(false);

  useEffect(() => {
    if (church?.windowsExeDownloadUrl) {
      setExeUrlInput(church.windowsExeDownloadUrl);
    }
  }, [church]);

  // Generate QR Code for sharing
  useEffect(() => {
    const currentUrl = window.location.href;
    QRCode.toDataURL(currentUrl, {
      width: 260,
      margin: 1.5,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => {});
  }, []);

  if (!isOpen) return null;

  const getCleanAppUrl = () => {
    if (typeof window !== 'undefined' && window.location.href) {
      const loc = window.location.href;
      if (!loc.includes('localhost') && !loc.includes('127.0.0.1')) {
        return loc;
      }
    }
    return 'https://omnichurch.download';
  };
  const currentUrl = getCleanAppUrl();

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    toast.success(
      isEs ? '¡Copiado al portapapeles!' : isEn ? 'Copied to clipboard!' : isFr ? 'Copié dans le presse-papiers !' : 'Kopye nan clipboard ou!'
    );
    setTimeout(() => setCopiedCmd(null), 2500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedLink(true);
    toast.success(
      isEs ? '¡Enlace de la aplicación copiado!' : isEn ? 'App link copied!' : isFr ? 'Lien de l’application copié !' : 'Lyen aplikasyon an kopye!'
    );
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDownloadBatScript = () => {
    const batContent = `@echo off
title OmniChurch Pro - Windows .EXE Builder
color 0A

echo ========================================================
echo       OMNICHURCH PRO - BUILDER POU WINDOWS (.EXE)
echo ========================================================
echo.
echo [1/3] Verifikasyon anviwonman Node.js ak depandans yo...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js pa enstale sou PC sa a!
    echo Tanpri telechaje epi enstale Node.js sou: https://nodejs.org
    echo Apre sa, relanse script sa a.
    pause
    exit /b
)

if not exist node_modules (
    echo Depandans yo poko enstale. N ap lanse "npm install" otomatikman...
    call npm install
)

if not exist node_modules\\vite (
    echo Vite pa detekte nan node_modules. N ap enstale li kounye a...
    call npm install
)

echo [OK] Node.js ak depandans yo pare!
echo.
echo [2/3] Konpilasyon aplikasyon an ak Vite (npm run build)...
call npm run build
if %errorlevel% neq 0 (
    echo [ERREUR] Konpilasyon Vite echwe!
    pause
    exit /b
)

echo.
echo [3/3] Kreyasyon fichye .EXE Windows (64-bit & 32-bit) ak Electron Builder...
echo N ap jenere fichye .exe yo kounye a (sa ka pran 1 a 3 minit)...
call npx --yes electron-builder --win --x64 --ia32

if %errorlevel% neq 0 (
    echo.
    echo [AVÈTISMAN] Eseye kreyasyon vèsyon x64 sèlman...
    call npx --yes electron-builder --win --x64
)

echo.
echo ========================================================
echo  BRAVO! Fichye .EXE yo kreye avèk siksè nan dosye "dist_electron"!
echo ========================================================
echo.
echo W ap jwenn:
echo  1) Setup (x64) .exe pou Windows 64-bit
echo  2) Setup (ia32) .exe pou Windows 32-bit
echo.
pause
`;
    const blob = new Blob([batContent], { type: 'application/x-bat' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'build-windows-exe.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(
      isEs ? '¡Script de compilación descargado!' : isEn ? 'Build script downloaded!' : isFr ? 'Script de build téléchargé !' : 'Script build .bat la telechaje!',
      isEs ? 'Haga doble clic en el archivo descargado para compilar el .exe en Windows.' : 'Double-klike sou fichye .bat la sou PC Windows ou pou kreye .exe a.'
    );
    try {
      confetti({ particleCount: 35, spread: 60, origin: { y: 0.6 } });
    } catch (_) {}
  };

  const handleSaveExeUrl = () => {
    if (!church) return;
    setIsSavingUrl(true);
    const updated: Church = {
      ...church,
      windowsExeDownloadUrl: exeUrlInput.trim(),
    };
    saveChurch(updated);
    setIsSavingUrl(false);
    toast.success(
      isEs ? '¡Enlace de descarga guardado!' : isEn ? 'Download URL saved!' : isFr ? 'Lien de téléchargement enregistré !' : 'Lyen telechajman .exe anrejistre!',
      isEs ? 'Todos los usuarios podrán descargar el ejecutable desde el sitio.' : 'Tout manm ak administratè ap ka telechaje .exe a kounye a.'
    );
    if (onChurchSaved) onChurchSaved();
  };

  const handleShareWhatsApp = () => {
    const text = isEs
      ? `✝️ *${church?.name || 'OmniChurch Pro'}*\nAccede al portal oficial de nuestra iglesia, gestiona tu membresía, carnet digital y asistencia:\n🔗 ${currentUrl}`
      : isEn
      ? `✝️ *${church?.name || 'OmniChurch Pro'}*\nAccess our official church portal, digital membership card, services and attendance:\n🔗 ${currentUrl}`
      : isFr
      ? `✝️ *${church?.name || 'OmniChurch Pro'}*\nAccédez au portail officiel de notre église, carte de membre digitale et présences :\n🔗 ${currentUrl}`
      : `✝️ *${church?.name || 'OmniChurch Pro'}*\nKonekte sou pòtay ofisyèl legliz nou an, jwenn kat manm dijital ou, orè sèvis ak prezans:\n🔗 ${currentUrl}`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="relative w-full max-w-2xl bg-[#0F172A] border border-slate-700/90 rounded-3xl shadow-2xl overflow-hidden text-slate-200 my-auto"
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-[#162235]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-extrabold shadow-inner">
              <Monitor className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>{isEs ? 'Aplicación de Escritorio (.EXE) & Compartir' : isEn ? 'Desktop App (.EXE) & Share' : isFr ? 'Application Bureau (.EXE) & Partage' : 'Aplikasyon PC (.EXE) & Sant Pataj'}</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                  Windows & Web
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {isEs
                  ? 'Genere el archivo .exe para Windows y comparta el portal web fácilmente'
                  : isEn
                  ? 'Easily create Windows .exe application and share the portal with members'
                  : isFr
                  ? 'Générez facilement le fichier .exe Windows et partagez le portail web'
                  : 'Jenere fichye .exe Windows la fasilman epi pataje pòtay la sou sit la'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TABS SELECTOR */}
        <div className="flex items-center gap-1.5 p-2 bg-[#111C30] border-b border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('build')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'build'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>{isEs ? '1. Crear .EXE' : isEn ? '1. Build .EXE' : isFr ? '1. Créer .EXE' : '1. Kreye .EXE'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('download')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'download'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>{isEs ? '2. Descargar .EXE' : isEn ? '2. Download .EXE' : isFr ? '2. Télécharger .EXE' : '2. Telechaje .EXE'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('share')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'share'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>{isEs ? '3. Compartir en el Sitio' : isEn ? '3. Share on Site' : isFr ? '3. Partager sur le Site' : '3. Pataje sou Sit la'}</span>
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-4 sm:p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* TAB 1: BUILD .EXE INSTRUCTIONS */}
          {activeTab === 'build' && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-300 flex items-start gap-2.5">
                <Monitor className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-extrabold text-white text-sm">
                    {isEs ? 'Configuración de Electron Lista' : 'Konfigirasyon Electron Pare Nèt'}
                  </div>
                  <p className="mt-0.5 text-slate-300">
                    {isEs
                      ? 'El proyecto ya incluye todos los scripts de Electron y el archivo ejecutable configurado para generar instaladores .exe y versiones portables con un solo clic.'
                      : 'Tout script Electron, konfigirasyon fenèt ak builder pare nan pwojè a pou w ka kreye enstalatè .exe ak vèsyon pòtab ak yon sèl klik.'}
                  </p>
                </div>
              </div>

              {/* METHOD A: 1-CLICK .BAT BUILD SCRIPT */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-extrabold text-sm">
                    <FileCode className="w-4 h-4 text-amber-400" />
                    <span>{isEs ? 'Método Fácil: Script de 1-Clic (.BAT)' : 'Metòd Fasil: Script 1-Klike (.BAT pou Windows)'}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-bold">
                    Recommandé
                  </span>
                </div>
                <p className="text-slate-400">
                  {isEs
                    ? 'Descargue el script de compilación automática. Al hacer doble clic sobre él en Windows, compilará la aplicación y creará el instalador .exe automáticamente en la carpeta "dist_electron".'
                    : 'Telechaje fichye script sa a. Lè w double-klike sou li sou PC Windows ou, l ap bati tout pwojè a epi jenere fichye .exe a otomatikman nan dosye "dist_electron".'}
                </p>

                <button
                  type="button"
                  onClick={handleDownloadBatScript}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{isEs ? 'Descargar Script "build-windows-exe.bat"' : 'Telechaje Script "build-windows-exe.bat"'}</span>
                </button>
              </div>

              {/* METHOD B: COMMAND LINE INSTRUCTIONS */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-white font-extrabold text-sm">
                  <Terminal className="w-4 h-4 text-amber-400" />
                  <span>{isEs ? 'Método Terminal / Línea de Comandos' : 'Metòd Tèminal / Liy Kòmand'}</span>
                </div>
                <p className="text-slate-400">
                  {isEs
                    ? 'Abra la terminal en la carpeta del proyecto y ejecute los siguientes comandos:'
                    : 'Louvri tèminal nan dosye pwojè a epi egzekite kòmand sa yo:'}
                </p>

                <div className="space-y-2">
                  {/* CMD 1 */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0B1120] border border-slate-800 font-mono text-[11px] text-amber-300">
                    <span className="truncate">npm run build:exe</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('npm run build:exe', 'build-exe')}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                      title="Copier"
                    >
                      {copiedCmd === 'build-exe' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span className="text-[10px]">{copiedCmd === 'build-exe' ? (isEs ? 'Copiado' : 'Kopye') : (isEs ? 'Copiar' : 'Kopye')}</span>
                    </button>
                  </div>

                  {/* CMD 2 */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0B1120] border border-slate-800 font-mono text-[11px] text-emerald-300">
                    <span className="truncate">npm run package:win</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('npm run package:win', 'package-win')}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                      title="Copier"
                    >
                      {copiedCmd === 'package-win' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span className="text-[10px]">{copiedCmd === 'package-win' ? (isEs ? 'Copiado' : 'Kopye') : (isEs ? 'Copiar' : 'Kopye')}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
                  <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {isEs
                      ? 'Archivos generados en: /dist_electron (Instalador NSIS y versión Portable).'
                      : 'Fichye yo ap pare nan: /dist_electron (Enstalatè NSIS ak vèsyon Portable .exe).'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DOWNLOAD .EXE & ADMIN CONFIGURE URL */}
          {activeTab === 'download' && (
            <div className="space-y-4 text-xs">
              {church?.windowsExeDownloadUrl ? (
                <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/40 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-300 font-black text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>{isEs ? '¡Instalador .EXE Listo para Descargar!' : 'Enstalatè .EXE Pare pou Telechaje!'}</span>
                  </div>
                  <p className="text-slate-300">
                    {isEs
                      ? `La iglesia "${church.name}" tiene configurado el enlace oficial de descarga del ejecutable de Windows.`
                      : `Legliz "${church.name}" gen lyen ofisyèl telechajman vèsyon Windows .exe a pare.`}
                  </p>

                  <a
                    href={church.windowsExeDownloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isEs ? 'Telecargar OmniChurch Pro (.EXE para Windows)' : 'Telechaje OmniChurch Pro (.EXE pou Windows)'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-center space-y-2">
                  <Monitor className="w-8 h-8 text-amber-400 mx-auto opacity-70" />
                  <div className="font-extrabold text-white">
                    {isEs ? 'Aún no se ha añadido un enlace de descarga directo' : 'Poko gen lyen telechajman dirèk ki anrejistre'}
                  </div>
                  <p className="text-slate-400 text-[11px] max-w-md mx-auto">
                    {isEs
                      ? 'Los administradores pueden subir el archivo .exe compilado a Google Drive, Dropbox o Firebase y guardar el enlace aquí para que los miembros lo descarguen.'
                      : 'Administratè yo ka monte fichye .exe a sou Google Drive, Dropbox oswa Firebase epi mete lyen an la a pou tout manm ka telechaje l.'}
                  </p>
                </div>
              )}

              {/* ADMIN URL CONFIGURATION */}
              {userRole === 'admin' && church && (
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-white font-extrabold text-sm">
                    <Save className="w-4 h-4 text-amber-400" />
                    <span>{isEs ? 'Configurar Enlace de Descarga de la Iglesia' : 'Konfigirasyon Lyen Telechajman pou Legliz la'}</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    {isEs
                      ? 'Pegue el enlace público donde subió el archivo .exe (ej: Google Drive, Dropbox, AWS, etc.):'
                      : 'Kole lyen piblik kote w monte fichye .exe a (eg: Google Drive, Dropbox, GitHub, elatriye):'}
                  </p>

                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      placeholder="https://drive.google.com/uc?id=... o https://..."
                      value={exeUrlInput}
                      onChange={(e) => setExeUrlInput(e.target.value)}
                      className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      disabled={isSavingUrl}
                      onClick={handleSaveExeUrl}
                      className="py-2 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isEs ? 'Guardar' : 'Anrejistre'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* PWA / WEB APP ALTERNATIVE */}
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-extrabold text-white">
                    {isEs ? 'Opción sin Instalación (PWA Desktop / Móvil)' : 'Opsyon San Enstalasyon (PWA Desktop / Mobil)'}
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    {isEs
                      ? 'También puede instalar OmniChurch Pro directamente desde Chrome/Edge haciendo clic en el icono "Instalar Aplicación" en la barra de direcciones.'
                      : 'Ou ka enstale OmniChurch Pro dirèkteman nan Google Chrome oswa Microsoft Edge lè w klike sou "Enstale Aplikasyon an" nan ba navigatè a.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SHARE ON SITE & WHATSAPP */}
          {activeTab === 'share' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* QR CODE DISPLAY */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3 flex flex-col items-center justify-center">
                  <div className="font-extrabold text-white flex items-center gap-1.5 text-xs">
                    <QrCodeIcon className="w-4 h-4 text-amber-400" />
                    <span>{isEs ? 'Escanear para Abrir en Móvil/PC' : 'Eskane pou Ouvri sou Telefòn/PC'}</span>
                  </div>

                  {qrDataUrl ? (
                    <div className="p-2 bg-white rounded-2xl shadow-md inline-block">
                      <img src={qrDataUrl} alt="QR Code Portal" className="w-36 h-36 mx-auto rounded-lg" />
                    </div>
                  ) : (
                    <div className="w-36 h-36 bg-slate-800 rounded-2xl animate-pulse" />
                  )}

                  <div className="text-[10px] text-slate-400 font-mono break-all line-clamp-1">
                    {currentUrl}
                  </div>
                </div>

                {/* SHARING ACTIONS */}
                <div className="space-y-3 flex flex-col justify-center">
                  {/* WhatsApp Share Button */}
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>{isEs ? 'Compartir por WhatsApp' : 'Pataje sou WhatsApp'}</span>
                  </button>

                  {/* Copy Link Button */}
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/30 font-bold text-xs flex items-center justify-center gap-2 shadow transition-all cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? (isEs ? '¡Enlace Copiado!' : 'Lyen Kopye!') : (isEs ? 'Copiar Enlace del Portal' : 'Kopye Lyen Pòtay la')}</span>
                  </button>

                  {/* Open in new window */}
                  <a
                    href={currentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{isEs ? 'Abrir en Pestaña Nueva' : 'Ouvri nan Nouvo Onglè'}</span>
                  </a>
                </div>
              </div>

              {/* ISOLATED CHURCH INFO */}
              {church && (
                <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-slate-300">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>
                      {isEs ? 'Espacio dedicado a:' : 'Espas dedye a:'}{' '}
                      <strong className="text-white">{church.name}</strong>
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                    ID: {church.id}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-[#162235] border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isEs ? 'Compatible con Windows 10/11 & Web' : 'Konpatib ak Windows 10/11 & Web'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs transition-colors cursor-pointer"
          >
            {isEs ? 'Cerrar' : isEn ? 'Close' : isFr ? 'Fermer' : 'Fèmen'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
