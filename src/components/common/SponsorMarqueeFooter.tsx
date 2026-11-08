import React, { useState, useEffect } from 'react';
import { SponsorItem, Language } from '../../types';
import { getDeveloperSettings } from '../../utils/developerStorage';
import { ExternalLink, HeartHandshake, CheckCircle2, ShieldCheck } from 'lucide-react';

interface SponsorMarqueeFooterProps {
  language?: Language;
  onOpenDevPanel?: () => void;
}

export const SponsorMarqueeFooter: React.FC<SponsorMarqueeFooterProps> = ({
  language = 'ht',
}) => {
  const [settings, setSettings] = useState(() => getDeveloperSettings());
  const [sponsors, setSponsors] = useState<SponsorItem[]>(() =>
    settings.sponsors.filter((s) => s.active)
  );

  useEffect(() => {
    const handleUpdate = () => {
      const current = getDeveloperSettings();
      setSettings(current);
      setSponsors(current.sponsors.filter((s) => s.active));
    };

    window.addEventListener('omnichurch_dev_settings_updated', handleUpdate);
    return () => {
      window.removeEventListener('omnichurch_dev_settings_updated', handleUpdate);
    };
  }, []);

  if (!settings.showSponsorsInFooter || sponsors.length === 0) {
    return null;
  }

  const isEs = language === 'es';
  const isEn = language === 'en';
  const isFr = language === 'fr';

  const titleText = isEs
    ? 'Patrocinadores & Socios Oficiales'
    : isEn
    ? 'Official Sponsors & Partners'
    : isFr
    ? 'Sponsors & Partenaires Officiels'
    : 'Patnè & Sponsor Ofisyèl';

  const subText = isEs
    ? 'Haga clic en un logo para visitar su sitio o perfil'
    : isEn
    ? 'Click any sponsor to visit their website or profile'
    : isFr
    ? 'Cliquez sur un logo pour visiter leur site ou profil'
    : 'Klike sou logo yon patnè pou vizite sit oswa rezo li';

  const handleSponsorClick = (sponsor: SponsorItem, e: React.MouseEvent) => {
    e.preventDefault();
    if (!sponsor.targetUrl) return;
    let url = sponsor.targetUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getTierBadge = (tier: SponsorItem['tier']) => {
    switch (tier) {
      case 'platinum':
        return 'bg-gradient-to-r from-purple-500/30 to-indigo-500/30 text-purple-200 border-purple-400/40';
      case 'gold':
        return 'bg-gradient-to-r from-amber-500/30 to-yellow-500/30 text-amber-200 border-amber-400/40';
      case 'silver':
        return 'bg-gradient-to-r from-slate-400/30 to-slate-300/30 text-slate-200 border-slate-300/40';
      case 'bronze':
        return 'bg-gradient-to-r from-orange-600/30 to-amber-700/30 text-orange-200 border-orange-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30';
    }
  };

  // If only 1 sponsor is active, DO NOT duplicate it - show single clean card!
  // If multiple sponsors are active, duplicate for smooth infinite marquee.
  const isSingleSponsor = sponsors.length === 1;
  const marqueeItems = isSingleSponsor ? sponsors : [...sponsors, ...sponsors, ...sponsors];
  const durationSec = settings.sponsorMarqueeSpeed || 26;

  return (
    <footer
      id="main-app-footer"
      className="hidden sm:block w-full bg-[#090D16] border-t border-slate-800/90 py-3.5 overflow-hidden select-none relative group/footer"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <HeartHandshake className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-white">
            {titleText}
          </span>
          <span className="hidden sm:inline-block text-[10px] text-slate-400 font-medium">
            — {subText}
          </span>
        </div>

        {/* Real Verified Partner Badge: Green Background & Icon with Crisp White Title */}
        <span className="inline-flex items-center gap-1.5 text-[10px] bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-bold shadow-sm">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-white font-extrabold tracking-wide">
            {sponsors.length} {isEs ? 'Socios Verificados' : isEn ? 'Verified Partners' : isFr ? 'Partenaires Vérifiés' : 'Patnè Verifye'}
          </span>
        </span>
      </div>

      {/* If single sponsor: render centered without duplicating or spinning */}
      {isSingleSponsor ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-center py-1">
          {sponsors.map((spon) => (
            <div
              key={spon.id}
              onClick={(e) => handleSponsorClick(spon, e)}
              className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-amber-400/60 shadow-lg hover:shadow-amber-400/10 transition-all cursor-pointer group shrink-0 max-w-md w-full justify-between"
              title={`${spon.name} — ${spon.tagline || 'Klike pou ouvri lyen'}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Logo / Thumbnail */}
                <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-950 border border-slate-700/80 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  {spon.logoUrl ? (
                    <img
                      src={spon.logoUrl}
                      alt={spon.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                  )}
                </div>

                {/* Sponsor Info */}
                <div className="flex flex-col text-left min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                      {spon.name}
                    </span>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider border ${getTierBadge(
                        spon.tier
                      )}`}
                    >
                      {spon.tier}
                    </span>
                  </div>
                  {spon.tagline && (
                    <span className="text-[10px] text-slate-400 group-hover:text-slate-300 transition-colors truncate">
                      {spon.tagline}
                    </span>
                  )}
                </div>
              </div>

              {/* External Link Indicator */}
              <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors shrink-0 ml-2 opacity-70 group-hover:opacity-100" />
            </div>
          ))}
        </div>
      ) : (
        /* Infinite Horizontal Marquee Container for Multiple Sponsors */
        <div className="relative w-full overflow-hidden mask-gradient-x">
          <div
            className="flex items-center gap-4 w-max hover:[animation-play-state:paused] animate-marquee"
            style={{
              animationDuration: `${durationSec}s`,
            }}
          >
            {marqueeItems.map((spon, idx) => (
              <div
                key={`${spon.id}-${idx}`}
                onClick={(e) => handleSponsorClick(spon, e)}
                className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-amber-400/60 shadow-md hover:shadow-amber-400/10 transition-all cursor-pointer group shrink-0"
                title={`${spon.name} — ${spon.tagline || 'Klike pou ouvri lyen'}`}
              >
                {/* Logo / Thumbnail */}
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-950 border border-slate-700/80 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  {spon.logoUrl ? (
                    <img
                      src={spon.logoUrl}
                      alt={spon.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                  )}
                </div>

                {/* Sponsor Info */}
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors whitespace-nowrap">
                      {spon.name}
                    </span>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider border ${getTierBadge(
                        spon.tier
                      )}`}
                    >
                      {spon.tier}
                    </span>
                  </div>
                  {spon.tagline && (
                    <span className="text-[10px] text-slate-400 group-hover:text-slate-300 transition-colors max-w-[200px] truncate">
                      {spon.tagline}
                    </span>
                  )}
                </div>

                {/* External Link Indicator */}
                <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors shrink-0 ml-1 opacity-60 group-hover:opacity-100" />
              </div>
            ))}
          </div>
        </div>
      )}
    </footer>
  );
};
