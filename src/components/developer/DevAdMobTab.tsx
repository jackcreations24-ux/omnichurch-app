import React, { useState } from 'react';
import { DeveloperSettings, Language } from '../../types';
import { AdMobBannerAd } from '../common/AdMobBannerAd';
import { admobEngine, GOOGLE_TEST_AD_UNITS } from '../../services/admobService';
import {
  getSuperDeveloperCloudAuthStatus,
  resolveEffectiveMobileAdMobConfig,
  verifyAndPushAdMobConfigToCloud,
} from '../../utils/developerStorage';
import { useToast } from '../../context/ToastContext';
import {
  Tv,
  Sliders,
  Play,
  RotateCcw,
  CheckCircle2,
  Smartphone,
  Globe,
  Sparkles,
  ShieldCheck,
  Zap,
  Info,
  Cloud,
  Copy,
  Check,
  RefreshCw,
  Code2,
  Lock,
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
  const toast = useToast();
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTestingAction, setIsTestingAction] = useState(false);
  const [isPushingCloud, setIsPushingCloud] = useState(false);
  const [cloudVerifyMessage, setCloudVerifyMessage] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [copiedKotlinPrompt, setCopiedKotlinPrompt] = useState(false);
  const [showPayloadPreview, setShowPayloadPreview] = useState(false);

  const isNative = admobEngine.isNative();
  const cloudAuth = getSuperDeveloperCloudAuthStatus();
  const mobileEffective = resolveEffectiveMobileAdMobConfig(
    settings.adMob,
    undefined,
    settings.licenses
  );

  const handleResetToTestIds = async () => {
    await onUpdateSettings({
      adMob: {
        ...settings.adMob,
        environment: 'test',
        mobileForceTestIds: true,
        adMobAppId: GOOGLE_TEST_AD_UNITS.APP_ID,
        bannerAdUnitId: GOOGLE_TEST_AD_UNITS.BANNER,
        interstitialAdUnitId: GOOGLE_TEST_AD_UNITS.INTERSTITIAL,
        rewardedAdUnitId: GOOGLE_TEST_AD_UNITS.REWARDED,
        nativeAdUnitId: 'ca-app-pub-3940256099942544/2247696110',
      },
    });
    setTestStatus('Tout ID yo retabli ak kle tès ofisyèl Google yo avèk siksè.');
    setTimeout(() => setTestStatus(null), 4000);
  };

  const handlePushAndVerifyCloud = async () => {
    setIsPushingCloud(true);
    setCloudVerifyMessage(null);
    try {
      const result = await verifyAndPushAdMobConfigToCloud(settings);
      await onUpdateSettings({
        adMob: {
          ...settings.adMob,
          lastCloudPushAt: result.pushedAt,
        },
      });

      if (result.syncedToCloud && result.remoteVerified) {
        const msg = `Senkronizasyon Cloud Verifye 100%! Dokiman app_config/developer_engine ajou sou Firestore (${new Date(
          result.pushedAt
        ).toLocaleTimeString()}). Tout telefòn Android yo resevwa mizajou a an tan reyèl.`;
        setCloudVerifyMessage({ ok: true, text: msg });
        toast.success('AdMob Cloud Sync Verifye!', msg);
      } else if (result.syncedToCloud) {
        const msg = `Konfigirasyon an voye sou Cloud (${new Date(
          result.pushedAt
        ).toLocaleTimeString()}), men lekti verifikasyon an retounen: ${
          result.reason || 'ok'
        }.`;
        setCloudVerifyMessage({ ok: true, text: msg });
        toast.info('AdMob Pouse sou Cloud', msg);
      } else {
        const msg =
          result.reason === 'requires_super_dev_google_auth'
            ? 'Sove lokalman sèlman. Konekte ak kont Google Super Developer Otorize a anlè nan Panèl Dev la pou pouse chanjman sa a sou Firestore pou app Android la.'
            : `Sove lokalman, men Cloud Sync echwe: ${result.reason || 'Erè koneksyon'}`;
        setCloudVerifyMessage({ ok: false, text: msg });
        toast.warning('Sove Lokalman Sèlman', msg);
      }
    } catch (e: any) {
      const errText = e?.message || 'Echèk koneksyon Cloud';
      setCloudVerifyMessage({ ok: false, text: errText });
      toast.error('Erè Cloud Sync', errText);
    } finally {
      setIsPushingCloud(false);
    }
  };

  const handleCopyKotlinPrompt = async () => {
    const promptText = `Act as a Senior Android Engineer (Kotlin + Jetpack Compose + Firebase Firestore + Google Mobile Ads SDK) maintaining OmniChurch Pro Android (package: com.zoutiw.omnichurch).

Connect Google AdMob in the Android Kotlin app with 100% real-time remote control from the Web Developer Panel via Firestore:
- Firebase Project ID: gen-lang-client-0674712996
- Named Firestore Database ID: ai-studio-applegizplatfmmu-438b9782-c8b8-4863-805f-d40924b9f1d1
- Remote Document Path: app_config/developer_engine (field: adMob, plus licenses array)

1. REMOTE ADMOB SCHEMA (app_config/developer_engine -> adMob):
- enabled: Boolean (${settings.adMob.enabled})
- environment: String ("${settings.adMob.environment}")
- mobileEnabled: Boolean (${settings.adMob.mobileEnabled !== false})
- mobileForceTestIds: Boolean (${settings.adMob.mobileForceTestIds === true})
- adMobAppId: "${settings.adMob.adMobAppId}"
- bannerAdUnitId: "${settings.adMob.bannerAdUnitId}"
- interstitialAdUnitId: "${settings.adMob.interstitialAdUnitId}"
- rewardedAdUnitId: "${settings.adMob.rewardedAdUnitId}"
- nativeAdUnitId: "${settings.adMob.nativeAdUnitId || 'ca-app-pub-3940256099942544/2247696110'}"
- adFreeForLicensedChurches: Boolean (${settings.adMob.adFreeForLicensedChurches})
- mobileShowBannerHome: Boolean (${settings.adMob.mobileShowBannerHome !== false})
- mobileShowBannerAnnouncements: Boolean (${settings.adMob.mobileShowBannerAnnouncements !== false})
- mobileShowBannerServices: Boolean (${settings.adMob.mobileShowBannerServices === true})
- enableInterstitialOnScan: Boolean (${settings.adMob.enableInterstitialOnScan})
- mobileEnableInterstitialAfterScanClose: Boolean (${settings.adMob.mobileEnableInterstitialAfterScanClose !== false})
- interstitialScanFrequency: Int (${settings.adMob.interstitialScanFrequency || 4})
- mobileInterstitialCooldownSeconds: Int (${settings.adMob.mobileInterstitialCooldownSeconds || 180})
- mobileRewardedEnabled: Boolean (${settings.adMob.mobileRewardedEnabled === true})
- mobileNativeFeedEnabled: Boolean (${settings.adMob.mobileNativeFeedEnabled !== false})

2. CRITICAL ANTI-BAN & UX RULES:
- Whenever environment == "test" OR mobileForceTestIds == true OR BuildConfig.DEBUG == true, strictly use Google Official Test Ad Unit IDs (Banner: ca-app-pub-3940256099942544/6300978111, Interstitial: ca-app-pub-3940256099942544/1033173712, Rewarded: ca-app-pub-3940256099942544/5224354917, Native: ca-app-pub-3940256099942544/2247696110).
- If enabled == false OR mobileEnabled == false OR the active churchId has an active license in licenses[] with allowAdFree == true (when adFreeForLicensedChurches == true), hide all banners immediately and skip all interstitials.
- NEVER show an Interstitial ad in the middle of live QR attendance scanning at the church door. Increment a scan counter on each successful QR scan, and ONLY trigger the interstitial when the admin/usher closes/exits the QR Scanner screen (if scanCount >= interstitialScanFrequency and cooldown >= mobileInterstitialCooldownSeconds has elapsed).`;

    try {
      await navigator.clipboard.writeText(promptText);
      setCopiedKotlinPrompt(true);
      toast.success(
        'Prompt Kotlin AdMob Kopye!',
        'Ou ka kole prompt sa a dirèkteman nan sesyon Android Studio / Kotlin ou a.'
      );
      setTimeout(() => setCopiedKotlinPrompt(false), 3500);
    } catch (_) {
      toast.error('Echèk Kopi', 'Pa t kapab kopye nan clipboard la.');
    }
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
          toast.success('Rekonpans AdMob Touche!', JSON.stringify(reward));
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
                {isNative ? 'Android / iOS Natif (Capacitor)' : 'Web / Desktop Control Center'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {isNative
                ? 'Plugin AdMob kominike dirèkteman ak Google Mobile Ads SDK nan Android.'
                : 'Tout chanjman ou fè isit la senkronize nan Firestore (app_config/developer_engine) pou kontwole app Android Kotlin lan an tan reyèl.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          <span
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono uppercase flex items-center gap-1 ${
              settings.adMob.enabled
                ? settings.adMob.environment === 'test' || settings.adMob.mobileForceTestIds
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            <Zap className="w-3 h-3" />
            {settings.adMob.enabled
              ? settings.adMob.environment === 'test' || settings.adMob.mobileForceTestIds
                ? 'Test Ads Safe Mode'
                : 'Production Live Mode'
              : 'Engine Pa Aktif'}
          </span>

          <span
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono uppercase flex items-center gap-1 ${
              mobileEffective.shouldShowAds
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}
          >
            <Smartphone className="w-3 h-3" />
            {mobileEffective.shouldShowAds ? 'Android Ads: ON' : 'Android Ads: OFF'}
          </span>
        </div>
      </div>

      {/* LIVE CLOUD FIRESTORE BRIDGE & REMOTE SYNC TESTER */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-[#0B1120] to-slate-900 border border-cyan-500/30 space-y-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-white">
                  Pon Senkronizasyon Cloud Firestore (Web Dev Panel → Android Kotlin)
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${
                    cloudAuth.isAuthorized
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  }`}
                >
                  {cloudAuth.isAuthorized ? 'CLOUD WRITE OTORIZE' : 'MÒD LOKAL (KONEKTE GOOGLE)'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Dokiman Sibl:{' '}
                <code className="text-cyan-300 font-mono bg-slate-950 px-1.5 py-0.5 rounded">
                  app_config/developer_engine
                </code>{' '}
                • Package Android:{' '}
                <code className="text-amber-300 font-mono bg-slate-950 px-1.5 py-0.5 rounded">
                  com.zoutiw.omnichurch
                </code>
              </p>
              {settings.adMob.lastCloudPushAt && (
                <p className="text-[11px] text-emerald-400/90 font-mono mt-1">
                  Dènye Pouse Verifye sou Cloud:{' '}
                  {new Date(settings.adMob.lastCloudPushAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handlePushAndVerifyCloud}
              disabled={isPushingCloud}
              className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-cyan-500/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPushingCloud ? 'animate-spin' : ''}`} />
              <span>
                {isPushingCloud
                  ? 'Ap Pouse & Verifye...'
                  : 'Pouse & Verifye sou Cloud Kounye a'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleCopyKotlinPrompt}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              {copiedKotlinPrompt ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Prompt Kotlin Kopye!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Kopye Prompt Kotlin AdMob</span>
                </>
              )}
            </button>
          </div>
        </div>

        {cloudVerifyMessage && (
          <div
            className={`p-3 rounded-2xl border text-xs flex items-center gap-2.5 ${
              cloudVerifyMessage.ok
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{cloudVerifyMessage.text}</span>
          </div>
        )}
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
                Google AdMob Monetization Engine (Global Master)
              </h3>
              <p className="text-xs text-slate-400">
                Jere tout anons bannè, entèstisyèl, native ak videyo rekonpans pou aplikasyon an
              </p>
            </div>
          </div>

          {/* Master Toggle */}
          <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-700 cursor-pointer self-start sm:self-center">
            <span className="text-xs font-bold text-white">Master AdMob:</span>
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
                adMob: {
                  ...settings.adMob,
                  environment: 'test',
                  mobileForceTestIds: true,
                },
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
                adMob: {
                  ...settings.adMob,
                  environment: 'production',
                  mobileForceTestIds: false,
                },
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

      {/* ANDROID KOTLIN REMOTE CONTROL ENGINE */}
      <div className="p-6 rounded-3xl bg-[#0B1120] border border-emerald-500/30 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-white">
                  Kontwòl A Distans pou App Android Kotlin (Mobile Remote Control)
                </h3>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                  LIVE SNAPSHOT
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Aktive oswa dezaktive chak tip anons sou telefòn manm yo an tan reyèl san pibliye nouvo APK sou Play Store
              </p>
            </div>
          </div>

          {/* Mobile Master Switch */}
          <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-emerald-500/40 cursor-pointer self-start sm:self-center">
            <span className="text-xs font-bold text-white">AdMob sou Android:</span>
            <input
              type="checkbox"
              checked={settings.adMob.mobileEnabled !== false}
              onChange={(e) =>
                onUpdateSettings({
                  adMob: { ...settings.adMob, mobileEnabled: e.target.checked },
                })
              }
              className="w-5 h-5 accent-emerald-400 rounded cursor-pointer"
            />
            <span
              className={`text-xs font-mono font-bold ${
                settings.adMob.mobileEnabled !== false ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {settings.adMob.mobileEnabled !== false ? 'AKTIF' : 'KOUPE'}
            </span>
          </label>
        </div>

        {/* Anti-Ban Force Test IDs Guard */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-extrabold text-amber-300 block">
                Sekirite Anti-Ban Google AdMob sou Telefòn (Force Official Test IDs on Mobile)
              </span>
              <span className="text-[11px] text-slate-300">
                Lè opsyon sa a sou <strong>ON</strong>, app Android Kotlin lan ap fòse kle tès ofisyèl Google yo menm si ou deja kole kle pwodiksyon ou yo. Dezaktive l sèlman lè APK a pibliye sou Google Play!
              </span>
            </div>
          </div>

          <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950 border border-amber-400/40 cursor-pointer shrink-0 self-start sm:self-center">
            <input
              type="checkbox"
              checked={settings.adMob.mobileForceTestIds ?? settings.adMob.environment === 'test'}
              onChange={(e) =>
                onUpdateSettings({
                  adMob: { ...settings.adMob, mobileForceTestIds: e.target.checked },
                })
              }
              className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
            />
            <span className="text-xs font-mono font-bold text-amber-300">
              {settings.adMob.mobileForceTestIds ?? settings.adMob.environment === 'test'
                ? 'TEST LOCK: ON'
                : 'TEST LOCK: OFF'}
            </span>
          </label>
        </div>

        {/* Mobile Placement Switches Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs cursor-pointer hover:border-slate-700 transition-colors">
            <div className="pr-2">
              <span className="text-slate-200 font-bold block">Bannè Akèy Mobile</span>
              <span className="text-[10px] text-slate-500">
                Adaptive Banner anba ekran Home sou Android
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.adMob.mobileShowBannerHome !== false}
              onChange={(e) =>
                onUpdateSettings({
                  adMob: { ...settings.adMob, mobileShowBannerHome: e.target.checked },
                })
              }
              className="w-4 h-4 accent-emerald-400 rounded cursor-pointer shrink-0"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs cursor-pointer hover:border-slate-700 transition-colors">
            <div className="pr-2">
              <span className="text-slate-200 font-bold block">Bannè Paj Anons Mobile</span>
              <span className="text-[10px] text-slate-500">
                Afiche bannè nan lis Anons legliz la sou Android
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.adMob.mobileShowBannerAnnouncements !== false}
              onChange={(e) =>
                onUpdateSettings({
                  adMob: { ...settings.adMob, mobileShowBannerAnnouncements: e.target.checked },
                })
              }
              className="w-4 h-4 accent-emerald-400 rounded cursor-pointer shrink-0"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs cursor-pointer hover:border-slate-700 transition-colors">
            <div className="pr-2">
              <span className="text-slate-200 font-bold block">Bannè Paj Sèvis Mobile</span>
              <span className="text-[10px] text-slate-500">
                Afiche bannè nan paj Sèvis / Aktivite sou Android
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.adMob.mobileShowBannerServices === true}
              onChange={(e) =>
                onUpdateSettings({
                  adMob: { ...settings.adMob, mobileShowBannerServices: e.target.checked },
                })
              }
              className="w-4 h-4 accent-emerald-400 rounded cursor-pointer shrink-0"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs cursor-pointer hover:border-slate-700 transition-colors">
            <div className="pr-2">
              <span className="text-slate-200 font-bold block">
                Entèstisyèl Lè Eskanè Fèmen
              </span>
              <span className="text-[10px] text-slate-500">
                Pa janm koupe eskanè pòt la; parèt sèlman lè ekran eskanè a fèmen
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.adMob.mobileEnableInterstitialAfterScanClose !== false}
              onChange={(e) =>
                onUpdateSettings({
                  adMob: {
                    ...settings.adMob,
                    mobileEnableInterstitialAfterScanClose: e.target.checked,
                  },
                })
              }
              className="w-4 h-4 accent-emerald-400 rounded cursor-pointer shrink-0"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs cursor-pointer hover:border-slate-700 transition-colors">
            <div className="pr-2">
              <span className="text-slate-200 font-bold block">Anons Native nan Feed Mobile</span>
              <span className="text-[10px] text-slate-500">
                Kat piblisite natif entegre ant kat anons yo sou Android
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.adMob.mobileNativeFeedEnabled !== false}
              onChange={(e) =>
                onUpdateSettings({
                  adMob: { ...settings.adMob, mobileNativeFeedEnabled: e.target.checked },
                })
              }
              className="w-4 h-4 accent-emerald-400 rounded cursor-pointer shrink-0"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs cursor-pointer hover:border-slate-700 transition-colors">
            <div className="pr-2">
              <span className="text-slate-200 font-bold block">Videyo Rekonpans Mobile</span>
              <span className="text-[10px] text-slate-500">
                Aktive bouton pou manm gade videyo pou sipòte legliz la
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.adMob.mobileRewardedEnabled === true}
              onChange={(e) =>
                onUpdateSettings({
                  adMob: { ...settings.adMob, mobileRewardedEnabled: e.target.checked },
                })
              }
              className="w-4 h-4 accent-emerald-400 rounded cursor-pointer shrink-0"
            />
          </label>
        </div>

        {/* Mobile Cooldown & Resolved Snapshot Inspector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
            <div>
              <span className="text-slate-200 font-bold block">
                Delè Minimòm ant 2 Entèstisyèl (Cooldown Mobile)
              </span>
              <span className="text-[10px] text-slate-500">
                Anpeche anons plen ekran parèt twò souvan sou telefòn
              </span>
            </div>
            <select
              value={settings.adMob.mobileInterstitialCooldownSeconds || 180}
              onChange={(e) =>
                onUpdateSettings({
                  adMob: {
                    ...settings.adMob,
                    mobileInterstitialCooldownSeconds: Number(e.target.value),
                  },
                })
              }
              className="py-1.5 px-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-emerald-400"
            >
              <option value={60}>60 segonn (1 min)</option>
              <option value={120}>120 segonn (2 min)</option>
              <option value={180}>180 segonn (3 min)</option>
              <option value={300}>300 segonn (5 min)</option>
            </select>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
            <div>
              <span className="text-slate-200 font-bold block">
                Enspektè JSON Live pou Kotlin (`adMob`)
              </span>
              <span className="text-[10px] text-slate-500">
                Verifye valè egzak app Android la ap li nan Firestore
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowPayloadPreview((prev) => !prev)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>{showPayloadPreview ? 'Kache JSON' : 'Wè JSON Mobile'}</span>
            </button>
          </div>
        </div>

        {showPayloadPreview && (
          <div className="p-4 rounded-2xl bg-slate-950 border border-cyan-500/30 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-cyan-300 font-mono">
              <span>FIRESTORE PATH: app_config/developer_engine → adMob</span>
              <span>
                EFFECTIVE MODE: {mobileEffective.isTestMode ? 'GOOGLE TEST IDS' : 'PRODUCTION IDS'}
              </span>
            </div>
            <pre className="text-[11px] font-mono text-emerald-300 overflow-x-auto bg-slate-900/90 p-3 rounded-xl border border-slate-800">
              {JSON.stringify(
                {
                  remoteFirestoreAdMob: settings.adMob,
                  kotlinEffectiveResolution: mobileEffective,
                },
                null,
                2
              )}
            </pre>
          </div>
        )}
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
              Google AdMob App ID (AndroidManifest):
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
              Anons plen ekran k ap parèt aprè yo fèmen ekran eskanè a
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

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Native Advanced Ad Unit ID (Fil Aktyalite / Feed Mobile):
            </label>
            <input
              type="text"
              placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX"
              value={settings.adMob.nativeAdUnitId || ''}
              onChange={(e) =>
                onUpdateSettings({
                  adMob: { ...settings.adMob, nativeAdUnitId: e.target.value.trim() },
                })
              }
              className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Inite Native Ad pou kat piblisite ki entegre natirèlman nan lis Anons sou Android
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
            Règ Global Pozisyon ak Frekans (Web & Mobile):
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs cursor-pointer">
              <div>
                <span className="text-slate-300 font-semibold block">Montre Bannè nan Akèy Manm (Web)</span>
                <span className="text-[10px] text-slate-500">Afiche bannè a anba paj prensipal manm yo sou Web</span>
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
                <span className="text-[10px] text-slate-500">Kache tout anons otomatikman pou legliz ki gen lisans aktif</span>
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
                <span className="text-[10px] text-slate-500">Aktive kontè eskanè pou deklanche anons plen ekran</span>
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
                <option value={10}>Chak 10 eskanè</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK EXPERT GUIDE */}
      <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 text-xs space-y-2.5">
        <h4 className="font-bold text-white flex items-center gap-1.5 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Gid Enstalasyon Rapid Google AdMob (Web Control → Android Kotlin):</span>
        </h4>
        <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
          <li>
            Kreye yon kont sou <strong className="text-white">apps.admob.com</strong> epi ajoute aplikasyon Android ou a (<code className="bg-slate-950 px-1 py-0.5 rounded text-emerald-400 font-mono">com.zoutiw.omnichurch</code>).
          </li>
          <li>
            Kopye <strong className="text-amber-300">App ID</strong> ou (fòma <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-400 font-mono">ca-app-pub-xxx~xxx</code>) epi kole l nan chan anlè a + nan <code className="bg-slate-950 px-1 py-0.5 rounded text-cyan-300 font-mono">AndroidManifest.xml</code>.
          </li>
          <li>
            Kreye inite <strong className="text-slate-200">Banner</strong>, <strong className="text-slate-200">Interstitial</strong>, <strong className="text-slate-200">Rewarded</strong>, ak <strong className="text-slate-200">Native</strong> sou AdMob, epi kole ID yo nan chan korespondan yo isit la.
          </li>
          <li>
            Klike sou <strong className="text-cyan-300">&ldquo;Pouse &amp; Verifye sou Cloud Kounye a&rdquo;</strong> pou estoke konfigirasyon an nan <code className="bg-slate-950 px-1 py-0.5 rounded text-cyan-300 font-mono">app_config/developer_engine</code>. App Android Kotlin lan ap chanje kle ak konpòtman otomatikman an tan reyèl!
          </li>
        </ol>
      </div>

      {/* LIVE ADMOB PREVIEW */}
      <div className="p-6 rounded-3xl bg-[#0B1120] border border-slate-800 space-y-3 shadow-xl">
        <span className="text-xs font-bold text-slate-300 block">
          Aperçu Bannè AdMob Live (Preview):
        </span>
        <AdMobBannerAd placement="home" showWebPreview />
      </div>
    </div>
  );
};

