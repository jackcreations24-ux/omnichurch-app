import React from 'react';
import { X, Download, ZoomIn, Image as ImageIcon } from 'lucide-react';
import { Language } from '../../types';

interface PosterLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title: string;
  caption?: string;
  language?: Language;
}

export const PosterLightboxModal: React.FC<PosterLightboxModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title,
  caption,
  language = 'ht',
}) => {
  if (!isOpen || !imageUrl) return null;

  const isEs = language === 'es';
  const isEn = language === 'en';
  const isFr = language === 'fr';

  const handleDownload = () => {
    try {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `${(title || 'poster').toLowerCase().replace(/[^a-z0-9]/g, '_')}_poster.webp`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      window.open(imageUrl, '_blank');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full max-h-[92vh] flex flex-col bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2 truncate pr-4">
            <ImageIcon className="w-4 h-4 text-amber-400 shrink-0" />
            <h3 className="text-sm sm:text-base font-black text-white truncate">
              {title}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow"
              title={isEs ? 'Descargar imagen' : isFr ? 'Télécharger l’image' : isEn ? 'Download image' : 'Telechaje imaj la'}
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isEs ? 'Descargar' : isFr ? 'Télécharger' : isEn ? 'Download' : 'Telechaje'}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
              title={isEs ? 'Cerrar' : isFr ? 'Fermer' : isEn ? 'Close' : 'Fèmen'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Poster Image Container */}
        <div className="flex-1 overflow-auto p-3 sm:p-6 flex items-center justify-center bg-black/60 min-h-[300px] max-h-[75vh]">
          <img
            src={imageUrl}
            alt={title}
            className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl border border-slate-800/80 select-none"
          />
        </div>

        {/* Caption footer if provided */}
        {caption && (
          <div className="px-5 py-3 bg-slate-900/90 border-t border-slate-800 text-xs text-slate-300 text-center font-medium">
            {caption}
          </div>
        )}
      </div>
    </div>
  );
};
