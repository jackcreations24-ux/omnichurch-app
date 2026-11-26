import React, { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { DeveloperDonationConfig, Language } from '../../types';
import {
  DEFAULT_DONATE_BUTTON_IMAGE,
  getDonationConfig,
} from '../../utils/developerStorage';

export interface DonateButtonProps {
  onClick: () => void;
  language?: Language;
  size?: 'header' | 'inline' | 'preview';
  customConfig?: DeveloperDonationConfig;
  forceShow?: boolean;
  id?: string;
  className?: string;
}

export const DonateButton: React.FC<DonateButtonProps> = ({
  onClick,
  language = 'ht',
  size = 'header',
  customConfig,
  forceShow = false,
  id,
  className = '',
}) => {
  const [liveConfig, setLiveConfig] = useState<DeveloperDonationConfig>(() => getDonationConfig());
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    const sync = () => setLiveConfig(getDonationConfig());
    window.addEventListener('omnichurch_dev_settings_updated', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('omnichurch_dev_settings_updated', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const config = customConfig || liveConfig;
  const imageSrc = config.buttonImageUrl || DEFAULT_DONATE_BUTTON_IMAGE;

  useEffect(() => {
    setImgFailed(false);
  }, [imageSrc]);

  if (!forceShow && !config.enabled) {
    return null;
  }

  const isShakeEnabled = config.enableShakeAnimation !== false;
  const shakeDurationSec = Math.min(30, Math.max(3, Number(config.shakeIntervalSeconds || 6)));

  const ariaLabel =
    language === 'es'
      ? 'Donar y apoyar la misión'
      : language === 'fr'
      ? 'Faire un don et soutenir la mission'
      : language === 'en'
      ? 'Donate and support the mission'
      : 'Fè yon donasyon pou soutni misyon an';

  const imgHeightClass =
    size === 'header'
      ? 'h-8 sm:h-9'
      : size === 'preview'
      ? 'h-10'
      : 'h-10 sm:h-11';

  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      style={
        isShakeEnabled
          ? ({ '--donate-shake-duration': `${shakeDurationSec}s` } as React.CSSProperties)
          : undefined
      }
      className={`group relative inline-flex items-center justify-center min-h-[40px] px-0.5 rounded-full bg-transparent border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 transition-transform duration-150 hover:scale-[1.04] active:scale-[0.96] cursor-pointer select-none shrink-0 ${
        isShakeEnabled ? 'animate-donate-shake' : ''
      } ${className}`}
    >
      {!imgFailed ? (
        <img
          src={imageSrc}
          alt={ariaLabel}
          referrerPolicy="no-referrer"
          draggable={false}
          onError={() => setImgFailed(true)}
          className={`${imgHeightClass} w-auto object-contain drop-shadow-[0_3px_10px_rgba(251,191,36,0.32)] pointer-events-none select-none`}
        />
      ) : (
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 text-slate-950 font-black text-xs shadow-md shadow-amber-500/25 border border-amber-200/70 whitespace-nowrap">
          <Heart className="w-3.5 h-3.5 fill-rose-600 text-rose-600 shrink-0" />
          <span>Donate</span>
        </span>
      )}
    </button>
  );
};
