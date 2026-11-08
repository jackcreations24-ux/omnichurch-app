import React, { useState } from 'react';
import { DeveloperSettings, Language } from '../../types';
import { AdMobBannerAd } from '../common/AdMobBannerAd';
import { admobEngine, GOOGLE_TEST_AD_UNITS } from '../../services/admobService';
import {
  Tv,
  Sliders,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Globe,
  Sparkles,
  ShieldCheck,
  Zap,
  Info,
} from 'lucide-react';

export interface DevAdMobTabProps {
  settings: DeveloperSettings;
  onUpdateSettings: (updated: Partial<DeveloperSettings>) => Promise<void>;
  language?: Language;
}

export const DevAdMobTab: React.FC<DevAdMobTabProps> = ({
  settings,
  onUpdateSettings,
  language = 'ht',
}) => {
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTestingAction, setIsTestingAction] = useState(false);
  const isNative = admobEngine.isNative();

  const handleResetToTestIds = async () => {
    await onUpdateSettings({
      adMob: {
        ...settings.adMob,
        environment: 'test',
        adMobAppId: GOOGLE_TEST_AD_UNITS.APP_ID,
        bannerAdUnitId: GOOGLE_TEST_AD_UNITS.BANNER,
        interstitialAdUnitId: GOOGLE_TEST_AD_UNITS.INTERSTITIAL,
        rewardedAdUnitId: GOOGLE_TEST_AD_UNITS.REWARDED,
      },
    });
    setTestStatus('Tout ID yo retabli ak kle tès ofisyèl Google yo avèk siksè.');
    setTimeout(() => setTestStatus(null), 4000);
  };

  const handleTestBanner = async () => {
    setIsTestingAction(true);
    try {
      if (isNative) {
        await admobEngine.showBanner({ customConfig: settings.adMob });
        setTestStatus('Bannè AdMob voye bay SDK Android la avèk siksè!');
      } else {
        setTestStatus('Mòd Navigatè Web: Bannè a ap afiche nan preview anba a.');
      }
    } catch (e: any) {
      setTestStatus(`Erè: ${e?.message || 'Echèk'}`);
    } finally {
      setIsTestingAction(false);
      setTimeout(() => setTestStatus(null), 5000);
    }
  };

  const handleTestInterstitial = async () => {
    setIsTestingAction(true);
    setTestStatus('Chajman anons entèstisyèl AdMob nan memwa...');
    try {
      const res = await admobEngine.showInterstitial({ force: true, customConfig: settings.adMob });
      if (res) {
        setTestStatus('Anons plen ekran (Interstitial) deklanche avèk siksè!');
      } else {
        setTestStatus('Anons entèstisyèl la pa t ka parèt. Verifye si w sou Android oswa koneksyon entènèt la.');
      }
    } catch (e: any) {
      setTestStatus(`Erè: ${e?.message || 'Echèk'}`);
    } finally {
      setIsTestingAction(false);
      setTimeout(() => setTestStatus(null), 5000);
    }
  };

  const handleTestRewarded = async () => {
    setIsTestingAction(true);
    setTestStatus('Chajman anons rekonpans AdMob (Rewarded)...');
    try {
      const res = await admobEngine.showRewardVideoAd({
        customConfig: settings.adMob,
        onRewarded: (reward) => {
          alert(`Konpliman! Rekonpans touche nan AdMob: ${JSON.stringify(reward)}`);
        },
      });
      if (res) {
        setTestStatus('Anons rekonpans lan fini avèk siksè!');
      } else {
        setTestStatus('Anons rekonpans lan fini.');
      }
    } catch (e: any) {
      setTestStatus(`Erè: ${e?.message || 'Echèk'}`);
    } finally {
      setIsTestingAction(false);
      setTimeout(() => setTestStatus(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      {/* PLATFORM & ENGINE STATUS BANNER */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          {isNative ? (
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Globe className="w-4 h-4" />
            </div>
          )}
          <div>
            <div className="font-bold text-white flex items-center gap-1.5">
              <span>Platfòm Kouran:</span>
              <span className={isNative ? 'text-emerald-400 font-mono' : 'text-cyan-400 font-mono'}>
                {isNative ? 'Android / iOS Natif (Capacitor)' : 'Web / Desktop Browser (Preview)'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {isNative
                ? 'Plugin AdMob kominike dirèkteman ak Google Mobile Ads SDK nan Android.'
                : 'Anons yo ap parèt kòm preview vizyèl sou web la; nan APK Android la se SDK ofisyèl Google la k ap fonksyone.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <span
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono uppercase flex items-center gap-1 ${
              settings.adMob.enabled
                ? settings.adMob.environment === 'test'
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            <Zap className="w-3 h-3" />
            {settings.adMob.enabled
              ? settings.adMob.environment === 'test'
                ? 'Test Ads Active'
                : 'Production Active'
              : 'Engine Pa Aktif'}
          </span>
        </div>
      </div>

      {/* MASTER ADMOB TOGGLE & ENVIRONMENT */}
      <div className="p-6 rounded-3xl bg-[#0B1120] border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-white">
                Google AdMob Monetization Engine
              </h3>
              <p className="text-xs text-slate-400">
                Jere tout anons bannè, entèstisyèl ak videyo rekonpans pou aplikasyon an
              </p>
            </div>
          </div>

          {/* Master Toggle */}
          <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-700 cursor-pointer self-start sm:self-center">
            <span className="text-xs font-bold text-white">Monetizasyon AdMob:</span>
            <input
              type="checkbox"
              checked={settings.adMob.enabled}
              onChange={(e) =>
                onUpdateSettings({
                  adMob: { ...settings.adMob, enabled: e.target.checked },
                })
              }
              className="w-5 h-5 accent-amber-400 rounded cursor-pointer"
            />
            <span
              className={`text-xs font-mono font-bold ${
                settings.adMob.enabled ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              {settings.adMob.enabled ? 'AKTIF' : 'INAKTIF'}
            </span>
          </label>
        </div>

        {/* Environment Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            onClick={() =>
              onUpdateSettings({
                adMob: { ...settings.adMob, environment: 'test' },
              })
            }
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              settings.adMob.environment === 'test'
                ? 'bg-amber-400/10 border-amber-400 text-amber-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs">Mòd Tès (Google Test IDs)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold">
                REKÒMANDE POU TÈS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Itilize ID ofisyèl tès Google pou verifye afichaj anons yo san okenn risk pou AdMob bloke kont ou.
            </p>
          </div>

          <div
            onClick={() =>
              onUpdateSettings({
                adMob: { ...settings.adMob, environment: 'production' },
              })
            }
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              settings.adMob.environment === 'production'
                ? 'bg-emerald-400/10 border-emerald-400 text-emerald-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs">Mòd Pwodiksyon (Live IDs)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                REVNI REYÈL
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Itilize pwòp kle AdMob ou mete anba a pou kòmanse difize anons reyèl epi touche lajan.
            </p>
          </div>
        </div>
      </div>

      {/* AD UNIT IDS CONFIGURATION */}
      <div className="p-6 rounded-3xl bg-[#0B1120] border border-slate-800 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>Kle ak Inite Piblisite AdMob (Ad Unit IDs)</span>
          </h3>

          <button
            type="button"
            onClick={handleResetToTestIds}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors self-start sm:self-center cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Retabli ID Tès Estanda yo</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Google AdMob App ID:
            </label>
            <input
              type="text"
              placeholder="ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"
              value={settings.adMob.adMobAppId}
              onChange={(e) =>
                onUpdateSettings({
                  adMob: { ...settings.adMob, adMobAppId: e.target.value.trim() },
                })
              }
              className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Fòma: ca-app-pub-xxxxxxxxxxxxxxxx~xxxxxxxxxx (avèk siy tilde ~)
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Banner Ad Unit ID:
            </label>
            <input
              type="text"
              placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX"
              value={settings.adMob.bannerAdUnitId}
              onChange={(e) =>
                onUpdateSettings({
                  adMob: { ...settings.adMob, bannerAdUnitId: e.target.value.trim() },
                })
              }
              className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Bannè adaptif nan bas paj la oswa nan espas dedye a
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Interstitial Ad Unit ID (Plen Ekran):
            </label>
            <input
              type="text"
              placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX"
              value={settings.adMob.interstitialAdUnitId}
              onChange={(e) =>
                onUpdateSettings({
                  adMob: { ...settings.adMob, interstitialAdUnitId: e.target.value.trim() },
                })
              }
              className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Anons plen ekran k ap parèt aprè aksyon enpòtan (tankou eskanè)
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Rewarded Video Ad Unit ID (Rekonpans):
            </label>
            <input
              type="text"
              placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX"
              value={settings.adMob.rewardedAdUnitId}
              onChange={(e) =>
                onUpdateSettings({
                  adMob: { ...settings.adMob, rewardedAdUnitId: e.target.value.trim() },
                })
              }
              className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Videyo kote manm gade pou sipòte legliz la oswa touche rekonpans
            </span>
          </div>
        </div>

        {/* INTERACTIVE TEST ACTIONS */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Tès Aksyon Anons (Instant Test Triggers)</span>
            </span>
            {isTestingAction && (
              <span className="text-[10px] text-amber-400 animate-pulse font-mono font-bold">
                Chajman an kou...
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={handleTestBanner}
              disabled={isTestingAction}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition-colors cursor-pointer"
            >
              <Play className="w-3 h-3 text-amber-400" />
              <span>Teste Bannè</span>
            </button>

            <button
              type="button"
              onClick={handleTestInterstitial}
              disabled={isTestingAction}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition-colors cursor-pointer"
            >
              <Play className="w-3 h-3 text-cyan-400" />
              <span>Teste Entèstisyèl</span>
            </button>

            <button
              type="button"
              onClick={handleTestRewarded}
              disabled={isTestingAction}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition-colors cursor-pointer"
            >
              <Play className="w-3 h-3 text-emerald-400" />
              <span>Teste Videyo Rekonpans</span>
            </button>
          </div>

          {testStatus && (
            <div className="p-2.5 rounded-xl bg-slate-900 border border-amber-400/30 text-amber-300 text-xs flex items-center gap-2">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>{testStatus}</span>
            </div>
          )}
        </div>

        {/* Placement & Frequency Rules */}
        <div className="pt-3 border-t border-slate-800 space-y-3">
          <span className="text-xs font-bold text-white block">
            Pozisyon ak Frekans Afichaj Piblisite:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs cursor-pointer">
              <div>
                <span className="text-slate-300 font-semibold block">Montre Bannè nan Akèy Manm</span>
                <span className="text-[10px] text-slate-500">Afiche bannè a anba paj prensipal manm yo</span>
              </div>
              <input
                type="checkbox"
                checked={settings.adMob.showBannerInMemberHome}
                onChange={(e) =>
                  onUpdateSettings({
                    adMob: { ...settings.adMob, showBannerInMemberHome: e.target.checked },
                  })
                }
                className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs cursor-pointer">
              <div>
                <span className="text-slate-300 font-semibold block">San Piblisite pou Legliz Pro</span>
                <span className="text-[10px] text-slate-500">Kache anons pou legliz ki gen lisans aktif</span>
              </div>
              <input
                type="checkbox"
                checked={settings.adMob.adFreeForLicensedChurches}
                onChange={(e) =>
                  onUpdateSettings({
                    adMob: {
                      ...settings.adMob,
                      adFreeForLicensedChurches: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs cursor-pointer">
              <div>
                <span className="text-slate-300 font-semibold block">Entèstisyèl sou Eskanè Prezans</span>
                <span className="text-[10px] text-slate-500">Afiche yon anons plen ekran aprè plizyè eskanè</span>
              </div>
              <input
                type="checkbox"
                checked={settings.adMob.enableInterstitialOnScan}
                onChange={(e) =>
                  onUpdateSettings({
                    adMob: {
                      ...settings.adMob,
                      enableInterstitialOnScan: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
              />
            </label>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
              <div>
                <span className="text-slate-300 font-semibold block">Frekans Eskanè pou Entèstisyèl</span>
                <span className="text-[10px] text-slate-500">Chak konbyen eskanè yon anons dwe parèt</span>
              </div>
              <select
                value={settings.adMob.interstitialScanFrequency || 4}
                onChange={(e) =>
                  onUpdateSettings({
                    adMob: {
                      ...settings.adMob,
                      interstitialScanFrequency: Number(e.target.value),
                    },
                  })
                }
                className="py-1 px-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
              >
                <option value={3}>Chak 3 eskanè</option>
                <option value={4}>Chak 4 eskanè</option>
                <option value={5}>Chak 5 eskanè</option>
                <option value={8}>Chak 8 eskanè</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK EXPERT GUIDE */}
      <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 text-xs space-y-2.5">
        <h4 className="font-bold text-white flex items-center gap-1.5 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Gid Enstalasyon Rapid Google AdMob (Nivo Ekspè):</span>
        </h4>
        <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
          <li>
            Kreye yon kont sou <strong className="text-white">apps.admob.com</strong> epi ajoute aplikasyon Android ou a.
          </li>
          <li>
            Kopye <strong className="text-amber-300">App ID</strong> ou (ki gen fòma <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-400 font-mono">ca-app-pub-xxx~xxx</code>) epi kole l nan premye chan anlè a.
          </li>
          <li>
            Kreye yon inite <strong className="text-slate-200">Banner</strong>, yon inite <strong className="text-slate-200">Interstitial</strong>, ak yon inite <strong className="text-slate-200">Rewarded Video</strong>, epi kole ID inite sa yo nan chan korespondan yo.
          </li>
          <li>
            Pandan w ap devlope oswa teste, toujou kite switch la sou <strong className="text-amber-400">Mòd Tès</strong> pou pwoteje kont AdMob ou kont klik envalid. Lè w pare pou pibliye sou Google Play, pase l sou <strong className="text-emerald-400">Mòd Pwodiksyon</strong>.
          </li>
        </ol>
      </div>

      {/* LIVE ADMOB PREVIEW */}
      <div className="p-6 rounded-3xl bg-[#0B1120] border border-slate-800 space-y-3 shadow-xl">
        <span className="text-xs font-bold text-slate-300 block">
          Aperçu Bannè AdMob Live (Preview):
        </span>
        <AdMobBannerAd placement="home" />
      </div>
    </div>
  );
};

