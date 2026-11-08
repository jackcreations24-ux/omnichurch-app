import React, { useState, useEffect } from 'react';
import { getDeveloperSettings, isChurchAdFree } from '../../utils/developerStorage';
import { admobEngine } from '../../services/admobService';
import { Megaphone, X, Info, Smartphone } from 'lucide-react';

interface AdMobBannerAdProps {
  churchId?: string;
  placement?: 'home' | 'navbar_bottom' | 'footer';
  className?: string;
}

export const AdMobBannerAd: React.FC<AdMobBannerAdProps> = ({
  churchId,
  placement = 'home',
  className = '',
}) => {
  const [settings, setSettings] = useState(() => getDeveloperSettings());
  const [isDismissed, setIsDismissed] = useState(false);
  const isNative = admobEngine.isNative();

  useEffect(() => {
    const handleUpdate = () => {
      setSettings(getDeveloperSettings());
    };
    window.addEventListener('omnichurch_dev_settings_updated', handleUpdate);
    return () => {
      window.removeEventListener('omnichurch_dev_settings_updated', handleUpdate);
    };
  }, []);

  // Handle native banner lifecycle on native Android / iOS
  useEffect(() => {
    if (!settings.adMob.enabled || isDismissed) {
      if (isNative) {
        admobEngine.hideBanner();
      }
      return;
    }

    if (placement === 'home' && !settings.adMob.showBannerInMemberHome) return;
    if (placement === 'navbar_bottom' && !settings.adMob.showBannerInNavbarBottom) return;
    if (placement === 'footer' && !settings.adMob.showBannerInFooter) return;
    if (churchId && isChurchAdFree(churchId)) return;

    if (isNative) {
      admobEngine.showBanner({
        churchId,
        position: placement === 'navbar_bottom' ? 'bottom' : 'bottom',
        customConfig: settings.adMob,
      });
    }

    return () => {
      if (isNative) {
        admobEngine.hideBanner();
      }
    };
  }, [settings.adMob, isDismissed, placement, churchId, isNative]);

  if (!settings.adMob.enabled || isDismissed) {
    return null;
  }

  // Check placement settings
  if (placement === 'home' && !settings.adMob.showBannerInMemberHome) return null;
  if (placement === 'navbar_bottom' && !settings.adMob.showBannerInNavbarBottom) return null;
  if (placement === 'footer' && !settings.adMob.showBannerInFooter) return null;

  // Check if current church has an Ad-Free pro license
  if (churchId && isChurchAdFree(churchId)) {
    return null;
  }

  const isTest = settings.adMob.environment === 'test';
  const adUnitId = admobEngine.getAdUnitId('banner', settings.adMob);

  // If on native platform, the SDK renders the real native view overlay at the bottom/top.
  // We can render a subtle spacing box so content isn't covered, or a native banner placeholder.
  if (isNative) {
    return (
      <div className="w-full py-1 text-center select-none pointer-events-none opacity-50">
        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider flex items-center justify-center gap-1">
          <Smartphone className="w-3 h-3 text-amber-400" />
          <span>Google AdMob Native Active</span>
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full max-w-4xl mx-auto my-3 overflow-hidden rounded-xl border border-slate-700/80 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-slate-300 p-2.5 shadow-md ${className}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-700/50 pb-1.5 mb-1.5 text-[10px]">
        <div className="flex items-center gap-1.5 text-slate-400 font-mono">
          <span className="bg-amber-400/20 text-amber-300 px-1.5 py-0.2 rounded font-bold uppercase text-[9px]">
            Google AdMob {isTest ? '(Test Mode)' : '(Live)'}
          </span>
          <span className="hidden sm:inline text-slate-500 truncate max-w-[200px]">
            Unit: {adUnitId}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsDismissed(true);
            if (isNative) admobEngine.hideBanner();
          }}
          className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-700/50 transition-colors cursor-pointer"
          title="Fèmen anons sa a"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-1">
        <div className="flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Google AdMob Banner Placement</span>
              <span className="text-[9px] bg-slate-700 text-slate-300 px-1.5 py-0.2 rounded font-mono">
                Responsive 320x50 / 728x90
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              {isTest
                ? 'Espas piblisite AdMob valide. Nan vèsyon Android pwodiksyon an, se anons reyèl k ap afiche.'
                : 'Anons patwone pa Google Ad Network.'}
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <span className="text-[10px] text-amber-300 bg-amber-400/10 px-2 py-1 rounded-lg border border-amber-400/20 font-semibold flex items-center gap-1">
            <Info className="w-3 h-3" />
            <span>Monetization Active</span>
          </span>
        </div>
      </div>
    </div>
  );
};

