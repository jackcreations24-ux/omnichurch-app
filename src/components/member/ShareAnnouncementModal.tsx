import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import {
  X,
  Share2,
  Copy,
  Check,
  MessageCircle,
  ShieldCheck,
  Send,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Announcement, Church, Language } from '../../types';
import { useToast } from '../../context/ToastContext';

interface ShareAnnouncementModalProps {
  isOpen: boolean;
  announcement: Announcement | null;
  church: Church;
  language?: Language;
  onClose: () => void;
}

export const ShareAnnouncementModal: React.FC<ShareAnnouncementModalProps> = ({
  isOpen,
  announcement,
  church,
  language = 'ht',
  onClose,
}) => {
  const toast = useToast();
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen || !announcement) return null;

  const isEs = language === 'es';
  const isFr = language === 'fr';
  const isEn = language === 'en';

  // Get localized title & content
  const title =
    (isEs && announcement.title_es) ||
    (isFr && announcement.title_fr) ||
    (isEn && announcement.title_en) ||
    (language === 'ht' && announcement.title_ht) ||
    announcement.title;

  const content =
    (isEs && announcement.content_es) ||
    (isFr && announcement.content_fr) ||
    (isEn && announcement.content_en) ||
    (language === 'ht' && announcement.content_ht) ||
    announcement.content;

  // Formatted pure text to share — strictly without any localhost or internal URLs
  const textToShare = `📢 *${church.name}*
📌 *${title}*

${content}

📅 ${announcement.date}${announcement.time ? ` • ⏰ ${announcement.time}` : ''}
📍 ${church.city || ''} ${church.country || ''}`.trim();

  const OFFICIAL_SHARE_URL = 'https://omnichurch.download';

  // 1. WhatsApp Direct Sharing (Guaranteed 100% free of localhost link)
  const handleShareWhatsApp = () => {
    try {
      const shareMessage = `${textToShare}\n\n🔗 ${OFFICIAL_SHARE_URL}`;
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      toast.success(
        isEs ? 'Abriendo WhatsApp...' : isFr ? 'Ouverture de WhatsApp...' : isEn ? 'Opening WhatsApp...' : 'Ouvèti WhatsApp...',
        isEs
          ? 'El texto limpio se envió a WhatsApp con el enlace oficial.'
          : isFr
          ? 'Le texte propre a été transmis à WhatsApp avec le lien officiel.'
          : isEn
          ? 'Clean text sent to WhatsApp with official link.'
          : 'Tèks la pare nan WhatsApp ak lyen ofisyèl la.'
      );
    } catch (_) {
      handleCopyText();
    }
  };

  // 2. Clipboard Copy
  const handleCopyText = async () => {
    try {
      const shareMessage = `${textToShare}\n\n🔗 ${OFFICIAL_SHARE_URL}`;
      await navigator.clipboard.writeText(shareMessage);
      setCopied(true);
      toast.success(
        isEs ? '¡Texto Copiado!' : isFr ? 'Texte Copié !' : isEn ? 'Text Copied!' : 'Tèks la Kopye!',
        isEs
          ? 'Texto limpio listo para pegar en cualquier red o chat.'
          : isFr
          ? 'Texte prêt à être collé dans vos applications.'
          : isEn
          ? 'Clean text ready to paste anywhere.'
          : 'Tèks la kopye pwòp san okenn lyen lokal pou w kole l kote w vle.'
      );
      setTimeout(() => setCopied(false), 2500);
    } catch (_) {
      toast.error(
        isEs ? 'Error al copiar' : isFr ? 'Erreur de copie' : isEn ? 'Copy failed' : 'Pa ka kopye',
        'Tanpri seleksyone tèks la alamen.'
      );
    }
  };

  // 3. Native OS Share Sheet (Mobile Android/iOS or Desktop)
  const handleNativeShare = async () => {
    // Check if on Capacitor native device
    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share({
          title: `${church.name} - ${title}`,
          text: textToShare,
          url: OFFICIAL_SHARE_URL,
          dialogTitle: isEs ? 'Compartir publicación' : isFr ? 'Partager la publication' : isEn ? 'Share post' : 'Pataje anons sa a',
        });
        return;
      } catch (err: any) {
        if (err?.message?.includes('canceled') || err?.message?.includes('cancelled')) {
          return;
        }
      }
    }

    // In web browser / Android Chrome / iOS Safari:
    // Explicitly providing url: 'https://omnichurch.download' guarantees mobile OS
    // will NOT fallback to window.location.href (which contains localhost:3000)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${church.name} - ${title}`,
          text: textToShare,
          url: OFFICIAL_SHARE_URL,
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return;
        }
      }
    }

    // Fallback: Copy to clipboard
    handleCopyText();
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-indigo-950/80 border-b border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>{isEs ? 'Compartir Publicación' : isFr ? 'Partager la Publication' : isEn ? 'Share Announcement' : 'Pataje Piblikasyon'}</span>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </h3>
                <p className="text-[11px] text-slate-400 truncate max-w-[240px] sm:max-w-xs">
                  {church.name}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Guarantee Security Badge */}
          <div className="bg-emerald-950/40 border-b border-emerald-500/20 px-4 py-2.5 flex items-center gap-2 text-[11px] text-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="leading-tight font-medium">
              {isEs
                ? 'Garantía limpia: El texto se comparte sin ningún enlace local o localhost.'
                : isFr
                ? 'Garantie propre : Le texte est partagé sans aucun lien localhost.'
                : isEn
                ? 'Clean guarantee: Text is shared without any local or localhost link.'
                : 'Garanti pwòp: Tèks la ap pataje san okenn lyen localhost.'}
            </span>
          </div>

          {/* Content Preview Box */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 flex items-center justify-between">
                <span>{isEs ? 'Vista previa del texto:' : isFr ? 'Aperçu du texte :' : isEn ? 'Text preview:' : 'Aperçu tèks la:'}</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {textToShare.length} {isEs ? 'caracteres' : 'karaktè'}
                </span>
              </label>
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-200 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto select-all selection:bg-emerald-500/30">
                {textToShare}
              </div>
            </div>

            {/* Main Action Buttons */}
            <div className="space-y-2.5 pt-1">
              {/* WhatsApp Button */}
              <button
                type="button"
                id="btn-share-whatsapp-direct"
                onClick={handleShareWhatsApp}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
              >
                <MessageCircle className="w-5 h-5 fill-white text-emerald-600" />
                <span>
                  {isEs
                    ? 'Compartir en WhatsApp (Directo)'
                    : isFr
                    ? 'Partager sur WhatsApp (Direct)'
                    : isEn
                    ? 'Share on WhatsApp (Direct)'
                    : 'Pataje sou WhatsApp (Dirèk)'}
                </span>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Copy Text Button */}
                <button
                  type="button"
                  id="btn-copy-announcement-text"
                  onClick={handleCopyText}
                  className="w-full py-2.5 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-[0.99] text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300">
                        {isEs ? '¡Copiado!' : isFr ? 'Copié !' : isEn ? 'Copied!' : 'Kopye!'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-400" />
                      <span>
                        {isEs ? 'Copiar Texto Limpio' : isFr ? 'Copier Texte Propre' : isEn ? 'Copy Clean Text' : 'Kopye Tèks la'}
                      </span>
                    </>
                  )}
                </button>

                {/* Native OS Share Button */}
                <button
                  type="button"
                  id="btn-native-share-announcement"
                  onClick={handleNativeShare}
                  className="w-full py-2.5 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-[0.99] text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4 text-indigo-400" />
                  <span>
                    {isEs ? 'Otras Aplicaciones' : isFr ? 'Autres Applications' : isEn ? 'Other Apps' : 'Lòt Aplikasyon'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="p-3 bg-slate-950/60 border-t border-slate-800 text-center">
            <p className="text-[10px] text-slate-500">
              {isEs
                ? 'Publicado por la administración para todos los miembros de la iglesia.'
                : isFr
                ? 'Publié par l’administration pour tous les membres de l’église.'
                : isEn
                ? 'Published by administration for all church members.'
                : 'Pibliye pa administrasyon an pou tout manm legliz la.'}
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
