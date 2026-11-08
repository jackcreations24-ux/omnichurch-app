import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Check,
} from 'lucide-react';
import { Language } from '../../types';
import {
  getAppVersionInfo,
  dismissCurrentUpdate,
  executeAppUpdateDownload,
  preserveSessionBeforeUpdate,
  markAppAsUpdated,
} from '../../services/appUpdateService';
import { useToast } from '../../context/ToastContext';

interface AppUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: Language;
  onManualCheck?: () => void;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({
  isOpen,
  onClose,
  language = 'ht',
}) => {
  const toast = useToast();
  const versionInfo = getAppVersionInfo();
  const langKey = language || 'ht';
  const isEs = langKey === 'es';
  const isEn = langKey === 'en';
  const isFr = langKey === 'fr';

  const highlights =
    versionInfo.highlights[langKey] || versionInfo.highlights.ht;
  const notice =
    versionInfo.importantNotice[langKey] || versionInfo.importantNotice.ht;

  const handleDismiss = () => {
    dismissCurrentUpdate();
    onClose();
  };

  // Keyboard shortcut (Escape to close)
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleMarkAsUpdated = () => {
    markAppAsUpdated(versionInfo.latestVersion);
    toast.success(
      isEs
        ? '¡Aplicación Actualizada!'
        : isEn
        ? 'App Updated!'
        : isFr
        ? 'Application Mise à Jour !'
        : 'Aplikasyon an Ajou!',
      isEs
        ? `Se ha registrado la versión v${versionInfo.latestVersion} con éxito.`
        : isEn
        ? `Successfully registered v${versionInfo.latestVersion}.`
        : isFr
        ? `Version v${versionInfo.latestVersion} enregistrée avec succès.`
        : `Vèsyon v${versionInfo.latestVersion} anrejistre avèk siksè sou aparèy ou an.`
    );
    onClose();
  };

  const handleDownload = () => {
    // 1. Preserve user session data redundantly
    preserveSessionBeforeUpdate();

    // 2. Notify the user that their session is preserved
    toast.success(
      isEs
        ? 'Sesión Preservada'
        : isEn
        ? 'Session Preserved'
        : isFr
        ? 'Session Préservée'
        : 'Sesyon w Konsève',
      isEs
        ? 'Abriendo https://omnichurch.download para descargar la nueva versión.'
        : isEn
        ? 'Opening https://omnichurch.download to download the latest version.'
        : isFr
        ? 'Ouverture de https://omnichurch.download pour télécharger la nouvelle version.'
        : 'N ap ouvri https://omnichurch.download pou telechaje nouvo vèsyon an.'
    );

    // 3. Open the download website
    executeAppUpdateDownload();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleDismiss();
          }
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="bg-[#0F172A] border border-amber-400/40 w-full max-w-lg rounded-3xl shadow-2xl shadow-amber-500/10 overflow-hidden relative flex flex-col text-left"
        >
          {/* Subtle Top Glowing Bar */}
          <div
            className={`h-1.5 w-full bg-gradient-to-r ${
              versionInfo.isMandatory
                ? 'from-rose-500 via-amber-400 to-rose-600'
                : 'from-amber-500 via-amber-300 to-amber-600'
            }`}
          />

          {/* Header Bar */}
          <div className="p-6 pb-4 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shrink-0 ${
                  versionInfo.isMandatory
                    ? 'bg-gradient-to-br from-rose-500 to-amber-600 text-white shadow-rose-500/30'
                    : 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-amber-500/30'
                }`}
              >
                {versionInfo.isMandatory ? (
                  <AlertTriangle className="w-6 h-6 animate-pulse" />
                ) : (
                  <Download className="w-6 h-6 animate-pulse" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      versionInfo.isMandatory
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                    }`}
                  >
                    {versionInfo.isMandatory
                      ? isEs
                        ? 'Actualización Obligatoria'
                        : isEn
                        ? 'Mandatory Update'
                        : isFr
                        ? 'Mise à Jour Obligatoire'
                        : 'Mizajou Obligatwa'
                      : isEs
                      ? 'Nueva Versión'
                      : isEn
                      ? 'New Version'
                      : isFr
                      ? 'Nouvelle Version'
                      : 'Nouvo Mizajou'}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    v{versionInfo.latestVersion}
                  </span>
                </div>
                <h3 className="text-lg font-black text-white mt-1">
                  {versionInfo.isMandatory
                    ? isEs
                      ? 'Actualización Crítica Requerida'
                      : isEn
                      ? 'Critical Update Required'
                      : isFr
                      ? 'Mise à Jour Critique Requise'
                      : 'Mizajou Kritik Obligatwa'
                    : isEs
                    ? '¡Actualización Disponible!'
                    : isEn
                    ? 'New Update Available!'
                    : isFr
                    ? 'Mise à Jour Disponible !'
                    : 'Nouvo Mizajou Disponib!'}
                </h3>
              </div>
            </div>

            {/* Close / Dismiss button (ALWAYS accessible so user is NEVER stuck) */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                id="btn-close-update-modal"
                onClick={handleDismiss}
                aria-label={
                  isEs
                    ? 'Cerrar alerta'
                    : isEn
                    ? 'Close alert'
                    : isFr
                    ? 'Fermer l’alerte'
                    : 'Fèmen alèt la'
                }
                title={
                  isEs
                    ? 'Cerrar ventana'
                    : isEn
                    ? 'Close window'
                    : isFr
                    ? 'Fermer la fenêtre'
                    : 'Fèmen fenèt la'
                }
                className="w-8 h-8 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-slate-700 hover:scale-105 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body content */}
          <div className="px-6 py-2 space-y-4 max-h-[62vh] overflow-y-auto">
            {/* Version Comparison Card (WhatsApp style: shows user version vs available version) */}
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">
                  {isEs ? 'Versión instalada:' : isEn ? 'Installed version:' : isFr ? 'Version installée :' : 'Vèsyon sou aparèy la:'}
                </span>
                <span className="font-mono font-bold text-slate-200 bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700">
                  v{versionInfo.currentVersion}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">
                  {isEs ? 'Nueva versión:' : isEn ? 'New version:' : isFr ? 'Nouvelle version :' : 'Nouvo vèsyon:'}
                </span>
                <span className="font-mono font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/30">
                  v{versionInfo.latestVersion}
                </span>
              </div>
            </div>

            {/* Smart Cooldown Note (WhatsApp standard: won't disturb repeatedly) */}
            {!versionInfo.isMandatory && (
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-2.5 text-[11px] text-slate-400">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {isEs
                    ? 'Frecuencia Inteligente: Si decide posponer, este aviso no volverá a interrumpirle durante 3 días.'
                    : isEn
                    ? 'Smart Frequency: If postponed, this alert will not interrupt you again for 3 days.'
                    : isFr
                    ? 'Fréquence Intelligente : Si vous reportez, cet avis ne vous dérangera pas pendant 3 jours.'
                    : 'Frekans Entèlijan: Si w klike sou "Pita", alèt sa a pap monte ankò pandan 3 jou pou l pa nwi w.'}
                </span>
              </div>
            )}

            {/* Download Link Card */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  {isEs
                    ? 'Sitio Oficial de Descarga'
                    : isEn
                    ? 'Official Download Site'
                    : isFr
                    ? 'Site Officiel de Téléchargement'
                    : 'Sit Ofisyèl pou Telechaje'}
                </span>
                <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {isEs ? 'Verificado' : isEn ? 'Verified' : isFr ? 'Vérifié' : 'Ofisyèl'}
                </span>
              </div>
              <a
                href={versionInfo.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleDownload}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-700/80 hover:border-amber-400/60 text-amber-300 transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <ExternalLink className="w-4 h-4 shrink-0 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
                  <span className="font-mono text-xs font-bold truncate">
                    {versionInfo.downloadUrl}
                  </span>
                </div>
                <span className="text-[11px] font-medium text-slate-400 shrink-0 ml-2 group-hover:text-amber-300">
                  {isEs ? 'Visitar' : isEn ? 'Visit' : isFr ? 'Visiter' : 'Ale sou sit la'} →
                </span>
              </a>
            </div>

            {/* What's New Highlights */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                {isEs
                  ? 'Novedades de esta Versión:'
                  : isEn
                  ? 'What’s New in this Release:'
                  : isFr
                  ? 'Nouveautés de cette Version :'
                  : 'Kisa ki Nèf nan Vèsyon sa a:'}
              </h4>
              <ul className="space-y-2">
                {highlights.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/60"
                  >
                    <span className="w-4 h-4 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      ✓
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Session Preservation Assurance */}
            <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-3 text-xs text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-emerald-300">
                  {isEs
                    ? 'Garantía de Preservación de Sesión'
                    : isEn
                    ? 'Session Preservation Guarantee'
                    : isFr
                    ? 'Garantie de Préservation de Session'
                    : 'Garanti Konsèvasyon Sesyon'}
                </span>
                <p className="text-[11px] text-emerald-300/80 mt-0.5 leading-relaxed">
                  {notice}
                </p>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-4 sm:p-6 pt-3 sm:pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 bg-slate-900/40">
            {/* Secondary Action: Mark as Updated (if user already downloaded) */}
            {!versionInfo.isMandatory ? (
              <button
                type="button"
                id="btn-mark-as-updated"
                onClick={handleMarkAsUpdated}
                className="text-[11px] text-slate-400 hover:text-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer py-1 self-center sm:self-auto"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {isEs
                    ? 'Ya actualicé esta app'
                    : isEn
                    ? 'Already updated'
                    : isFr
                    ? 'Déjà mis à jour'
                    : 'Mwen fin mete l ajou'}
                </span>
              </button>
            ) : (
              <span className="text-[11px] text-rose-400 font-bold self-center sm:self-auto">
                {isEs
                  ? 'Requerido para continuar'
                  : isEn
                  ? 'Required to proceed'
                  : isFr
                  ? 'Requis pour continuer'
                  : 'Obligatwa pou w ka kontinye'}
              </span>
            )}

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Close / Dismiss button (Always available) */}
              <button
                type="button"
                id="btn-ignore-update"
                onClick={handleDismiss}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer text-center justify-center border border-slate-700"
              >
                {isEs
                  ? 'Cerrar / Más tarde'
                  : isEn
                  ? 'Close / Later'
                  : isFr
                  ? 'Fermer / Plus tard'
                  : 'Fèmen / Pita'}
              </button>

              {/* Download New Version Button */}
              <button
                type="button"
                id="btn-download-new-version"
                onClick={handleDownload}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-400/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-950" />
                <span>
                  {isEs
                    ? 'Descargar Nueva Versión'
                    : isEn
                    ? 'Download New Version'
                    : isFr
                    ? 'Télécharger Nouvelle Version'
                    : 'Telechaje Nouvèl Vèsyon an'}
                </span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
