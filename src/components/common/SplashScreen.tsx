import React from 'react';
import { OmniChurchLogo } from './OmniChurchLogo';

interface SplashScreenProps {
  subtitle?: string;
}

/**
 * Official OmniChurch PRO branded splash / loading screen.
 * Blends the transparent official logo naturally over the Royal Navy -> Midnight Blue palette.
 */
export const SplashScreen: React.FC<SplashScreenProps> = ({
  subtitle = 'Multi-Tenant Church Platform',
}) => {
  return (
    <div
      id="omnichurch-splash-screen"
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] h-dvh w-screen max-w-full overflow-hidden flex flex-col items-center justify-center bg-gradient-to-b from-[#07152F] via-[#0F172A] to-[#07152F] text-slate-100 px-6 select-none"
    >
      <div className="flex flex-col items-center justify-center gap-4 max-w-xs sm:max-w-sm w-full text-center">
        <OmniChurchLogo
          variant="full"
          priority
          className="w-28 sm:w-36 md:w-40 max-w-[42vw] max-h-[26vh] h-auto"
        />

        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 rounded bg-[#FBBF24]/15 border border-[#FBBF24]/35 text-[#FBBF24] text-[10px] font-mono font-bold tracking-widest uppercase shrink-0">
            PRO
          </span>
          <span className="text-xs sm:text-sm font-medium text-slate-300 tracking-wide">
            {subtitle}
          </span>
        </div>

        <div className="w-40 max-w-full h-1 rounded-full bg-slate-800/90 overflow-hidden mt-1">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#38BDF8] via-[#FBBF24] to-[#38BDF8] animate-pulse" />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
