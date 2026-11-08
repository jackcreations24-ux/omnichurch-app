import React from 'react';
import { Language } from '../../types';
import {
  BadgeDomainStyleId,
  DOMAIN_LABEL_TRANSLATIONS,
} from '../../data/badgeDomainStyles';

export interface BadgeDomainDisplayProps {
  department?: string;
  role?: string;
  styleId?: BadgeDomainStyleId;
  language?: Language;
  isDark?: boolean;
  accentColorClass?: string;
  badgeBgClass?: string;
  badgeTextClass?: string;
  accentBorderClass?: string;
  subTextColorClass?: string;
  className?: string;
  compact?: boolean;
}

export const BadgeDomainDisplay: React.FC<BadgeDomainDisplayProps> = ({
  department,
  role,
  styleId = 'classic_pill',
  language = 'ht',
  isDark = true,
  accentColorClass = 'text-amber-400',
  badgeBgClass = 'bg-amber-400/20',
  badgeTextClass = 'text-amber-300',
  accentBorderClass = 'border-amber-400/50',
  subTextColorClass = 'text-slate-400',
  className = '',
  compact = false,
}) => {
  const langKey = language || 'ht';
  const labels = {
    general: DOMAIN_LABEL_TRANSLATIONS.general[langKey] || 'Jeneral',
    member: DOMAIN_LABEL_TRANSLATIONS.member[langKey] || 'Manm',
    domain: DOMAIN_LABEL_TRANSLATIONS.domain[langKey] || 'DOMÈN',
    dept: DOMAIN_LABEL_TRANSLATIONS.dept[langKey] || 'DEPT',
    ministry: DOMAIN_LABEL_TRANSLATIONS.ministry[langKey] || 'Ministè Sakre',
    prestige: DOMAIN_LABEL_TRANSLATIONS.prestige[langKey] || 'PRESTIJ',
    official: DOMAIN_LABEL_TRANSLATIONS.official[langKey] || 'OFISYÈL',
  };

  const effectiveDept = department?.trim() || labels.general;
  const effectiveRole = role?.trim() || labels.member;

  switch (styleId) {
    // 1. CLASSIC PILL (Pil Klasik)
    case 'classic_pill':
      return (
        <div className={`flex items-center gap-1.5 ${className}`}>
          <span
            className={`px-1.5 py-0.2 rounded text-[7.5px] font-bold border ${badgeBgClass} ${badgeTextClass} ${accentBorderClass} inline-flex items-center gap-1 shrink-0`}
          >
            <span className="w-1 h-1 rounded-full bg-current opacity-80" />
            <span className="truncate max-w-[130px]">{effectiveDept}</span>
          </span>
          <span className={`text-[7.5px] font-semibold truncate ${subTextColorClass}`}>
            • {effectiveRole}
          </span>
        </div>
      );

    // 2. RIBBON BANNER (Riban Elegans / Banyè Wayal)
    case 'ribbon_banner':
      return (
        <div className={`${className}`}>
          <div
            className={`px-2 py-0.5 rounded text-[7.5px] font-black uppercase tracking-wider border shadow-sm ${accentBorderClass} bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-500/20 ${badgeTextClass} inline-flex items-center gap-1 max-w-full`}
          >
            <span className="text-[7px] text-amber-300 shrink-0">✦</span>
            <span className="truncate">
              {labels.domain}: {effectiveDept}
            </span>
            <span className="text-[7px] text-amber-300 shrink-0">✦</span>
            <span className="opacity-50 text-[6.5px] shrink-0">|</span>
            <span className="text-[7px] font-bold lowercase first-letter:uppercase shrink-0 truncate max-w-[70px]">
              {effectiveRole}
            </span>
          </div>
        </div>
      );

    // 3. TAG CODE (Tikè Kòd Modèn / Monospace Tech)
    case 'tag_code':
      return (
        <div className={`${className}`}>
          <div className="inline-flex items-center font-mono text-[7px] font-bold max-w-full">
            <span
              className={`px-1.5 py-0.2 rounded-l border-y border-l ${accentBorderClass} ${
                isDark ? 'bg-slate-950/80 text-amber-300' : 'bg-slate-900 text-amber-200'
              } truncate max-w-[120px]`}
            >
              {labels.dept} // {effectiveDept}
            </span>
            <span
              className={`px-1.5 py-0.2 rounded-r border-y border-r border-l-0 ${accentBorderClass} ${badgeBgClass} ${badgeTextClass} font-sans text-[6.5px] shrink-0`}
            >
              {effectiveRole}
            </span>
          </div>
        </div>
      );

    // 4. CREST SHIELD (Boukliye Sakre / Emblèm Ministè)
    case 'crest_shield':
      return (
        <div className={`${className}`}>
          <div
            className={`px-2 py-0.5 rounded-lg text-[7.5px] font-bold border ${accentBorderClass} ${badgeBgClass} ${badgeTextClass} inline-flex items-center gap-1.5 shadow-sm max-w-full`}
          >
            <span className="text-[8px] shrink-0">🛡️</span>
            <div className="flex flex-col leading-none text-left min-w-0">
              <span className="text-[5.5px] uppercase tracking-widest opacity-80 truncate">
                {labels.ministry}
              </span>
              <span className="font-black text-[8px] truncate max-w-[110px]">
                {effectiveDept}
              </span>
            </div>
            <span className={`text-[6.5px] ml-1 opacity-80 font-normal shrink-0`}>
              ({effectiveRole})
            </span>
          </div>
        </div>
      );

    // 5. GOLD LUXURY (Liksye Doré / Or Prestige & Étwal)
    case 'gold_luxury':
      return (
        <div className={`${className}`}>
          <div
            className={`px-2 py-0.5 rounded-full text-[7.5px] font-black border border-amber-400/80 bg-gradient-to-r from-amber-400/30 via-amber-300/40 to-amber-500/30 text-amber-200 inline-flex items-center gap-1 shadow-sm ring-1 ring-amber-400/30 max-w-full`}
          >
            <span className="text-[7.5px] text-amber-300 shrink-0">★</span>
            <span className="tracking-tight uppercase truncate max-w-[110px]">
              {labels.prestige}: {effectiveDept}
            </span>
            <span className="text-[7.5px] text-amber-300 shrink-0">★</span>
            <span className="text-[6.5px] font-semibold text-amber-100/90 ml-0.5 shrink-0 truncate max-w-[70px]">
              • {effectiveRole}
            </span>
          </div>
        </div>
      );

    default:
      return (
        <div className={`flex items-center gap-1.5 ${className}`}>
          <span
            className={`px-1.5 py-0.2 rounded text-[7.5px] font-bold border ${badgeBgClass} ${badgeTextClass} ${accentBorderClass}`}
          >
            {effectiveDept}
          </span>
          <span className={`text-[7.5px] font-semibold ${subTextColorClass}`}>
            • {effectiveRole}
          </span>
        </div>
      );
  }
};
