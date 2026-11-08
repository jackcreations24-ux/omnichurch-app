import React, { useState } from 'react';
import { Language } from '../../types';
import { Globe, Check, ArrowRight, X } from 'lucide-react';

interface LanguageSelectionModalProps {
  isOpen: boolean;
  currentLanguage: Language;
  onSelectLanguage: (lang: Language) => void;
  onClose?: () => void;
  isFirstStart?: boolean;
}

interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
  description: string;
  tagline: string;
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    code: 'ht',
    name: 'Haitian Creole',
    nativeName: 'Kreyòl Ayisyen',
    flag: '🇭🇹',
    description: 'Eksperyans natif natal konplè an Kreyòl',
    tagline: 'Kòmanse an Kreyòl Ayisyen',
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    description: 'Experiencia completa en español para ministerios e iglesias',
    tagline: 'Comenzar en Español',
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    description: 'Full church management experience in English',
    tagline: 'Start in English',
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    description: 'Gestion ecclésiastique et membres en Français',
    tagline: 'Commencer en Français',
  },
];

export const LanguageSelectionModal: React.FC<LanguageSelectionModalProps> = ({
  isOpen,
  currentLanguage,
  onSelectLanguage,
  onClose,
  isFirstStart = false,
}) => {
  const [selected, setSelected] = useState<Language>(currentLanguage || 'ht');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onSelectLanguage(selected);
    if (onClose) {
      onClose();
    }
  };

  const getLocalizedTitle = () => {
    switch (selected) {
      case 'es':
        return {
          title: 'Bienvenido a OmniChurch',
          subtitle: 'Selecciona tu idioma para comenzar la aplicación',
          confirmBtn: 'Comenzar con Español',
          note: 'Podrás cambiar el idioma en cualquier momento desde la barra superior.',
        };
      case 'en':
        return {
          title: 'Welcome to OmniChurch',
          subtitle: 'Choose your language to start the application',
          confirmBtn: 'Get Started with English',
          note: 'You can change the language anytime from the top bar.',
        };
      case 'fr':
        return {
          title: 'Bienvenue sur OmniChurch',
          subtitle: 'Choisissez votre langue pour démarrer l’application',
          confirmBtn: 'Démarrer en Français',
          note: 'Vous pourrez modifier la langue à tout moment.',
        };
      case 'ht':
      default:
        return {
          title: 'Byenvini sou OmniChurch',
          subtitle: 'Chwazi nan ki lang ou vle kòmanse platfòm nan',
          confirmBtn: 'Kòmanse ak Kreyòl',
          note: 'Ou kapab toujou chanje lang lan nenpòt kilè nan ba ki anwo a.',
        };
    }
  };

  const text = getLocalizedTitle();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div
        id="modal-language-selector"
        className="relative w-full max-w-xl bg-[#0F172A] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8"
      >
        {/* Top Glow Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-emerald-500 to-blue-500" />

        {/* Close Button (only if not forced first start) */}
        {!isFirstStart && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            title="Fèmen"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
            <Globe className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-400/10 text-amber-300 font-mono text-[10px] font-bold tracking-wider uppercase mb-1">
              OmniChurch • Multi-Language
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {text.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              {text.subtitle}
            </p>
          </div>
        </div>

        {/* Language Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-6">
          {LANGUAGE_OPTIONS.map((opt) => {
            const isSelected = selected === opt.code;
            return (
              <button
                key={opt.code}
                type="button"
                id={`btn-select-lang-${opt.code}`}
                onClick={() => setSelected(opt.code)}
                className={`relative p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/30 shadow-lg'
                    : 'bg-slate-900/80 hover:bg-slate-800/90 border-slate-700/80 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl" role="img" aria-label={opt.name}>
                      {opt.flag}
                    </span>
                    <div>
                      <div className="font-black text-sm sm:text-base text-slate-100 flex items-center gap-1.5">
                        {opt.nativeName}
                        <span className="text-[10px] font-mono text-slate-400 uppercase">
                          ({opt.code})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {opt.name}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                      isSelected
                        ? 'bg-amber-400 border-amber-400 text-slate-950 shadow-sm'
                        : 'border-slate-600 bg-slate-800/50 text-transparent'
                    }`}
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                  {opt.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Footer & Action Buttons */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-slate-400 text-center sm:text-left">
            {text.note}
          </p>

          <button
            type="button"
            id="btn-confirm-start-language"
            onClick={handleConfirm}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm shadow-md hover:shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <span>{text.confirmBtn}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
