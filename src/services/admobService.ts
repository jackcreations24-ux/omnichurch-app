import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  BannerAdOptions,
  BannerAdSize,
  BannerAdPosition,
  AdMobBannerSize,
  AdOptions,
  RewardAdOptions,
  RewardAdPluginEvents,
  AdmobConsentStatus,
} from '@capacitor-community/admob';
import { AdMobConfig } from '../types';
import { getDeveloperSettings, isChurchAdFree } from '../utils/developerStorage';

// Google Official AdMob Test Unit IDs (Always safe for testing & QA)
export const GOOGLE_TEST_AD_UNITS = {
  APP_ID: 'ca-app-pub-3940256099942544~3347511713',
  BANNER: 'ca-app-pub-3940256099942544/6300978111',
  INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712',
  REWARDED: 'ca-app-pub-3940256099942544/5224354917',
  APP_OPEN: 'ca-app-pub-3940256099942544/3419835294',
};

export interface AdMobEngineState {
  isInitialized: boolean;
  isNative: boolean;
  bannerVisible: boolean;
  lastInterstitialTime: number;
  interstitialLoaded: boolean;
  rewardedLoaded: boolean;
  error: string | null;
}

class AdMobServiceEngine {
  private isInitialized = false;
  private bannerVisible = false;
  private lastInterstitialTime = 0;
  private lastScanCount = 0;
  private listenersAttached = false;

  constructor() {
    // Lazy check platform
  }

  public isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Initialize AdMob SDK safely on native Android / iOS
   */
  public async initialize(customConfig?: AdMobConfig): Promise<boolean> {
    const config = customConfig || getDeveloperSettings().adMob;

    if (!config.enabled) {
      console.log('[AdMob Engine] AdMob is disabled in Developer Settings.');
      return false;
    }

    if (!this.isNative()) {
      console.log('[AdMob Engine] Running on Web / Browser. Native AdMob SDK bypassed (Web Preview Active).');
      this.isInitialized = true;
      return true;
    }

    try {
      const isTest = config.environment === 'test';
      console.log(`[AdMob Engine] Initializing Google AdMob SDK on Android native (Mode: ${config.environment})...`);

      await AdMob.initialize({
        initializeForTesting: isTest,
      });

      this.isInitialized = true;
      this.attachEvents();
      console.log('[AdMob Engine] Google AdMob SDK initialized successfully on Native!');
      return true;
    } catch (err: any) {
      console.warn('[AdMob Engine] AdMob initialization error:', err?.message || err);
      return false;
    }
  }

  /**
   * Get the active Ad Unit ID depending on Test vs Production mode
   */
  public getAdUnitId(type: 'banner' | 'interstitial' | 'rewarded', customConfig?: AdMobConfig): string {
    const config = customConfig || getDeveloperSettings().adMob;
    const isTest = config.environment === 'test';

    if (isTest) {
      switch (type) {
        case 'banner':
          return GOOGLE_TEST_AD_UNITS.BANNER;
        case 'interstitial':
          return GOOGLE_TEST_AD_UNITS.INTERSTITIAL;
        case 'rewarded':
          return GOOGLE_TEST_AD_UNITS.REWARDED;
      }
    }

    // Production mode
    switch (type) {
      case 'banner':
        return config.bannerAdUnitId?.trim() || GOOGLE_TEST_AD_UNITS.BANNER;
      case 'interstitial':
        return config.interstitialAdUnitId?.trim() || GOOGLE_TEST_AD_UNITS.INTERSTITIAL;
      case 'rewarded':
        return config.rewardedAdUnitId?.trim() || GOOGLE_TEST_AD_UNITS.REWARDED;
    }
  }

  /**
   * Display native Banner Ad
   */
  public async showBanner(options?: {
    churchId?: string;
    position?: 'top' | 'bottom';
    customConfig?: AdMobConfig;
  }): Promise<boolean> {
    const config = options?.customConfig || getDeveloperSettings().adMob;

    if (!config.enabled) return false;

    // Ad-Free church license check
    if (options?.churchId && isChurchAdFree(options.churchId)) {
      console.log(`[AdMob Engine] Church ${options.churchId} has Pro license: Ad-Free enabled.`);
      await this.hideBanner();
      return false;
    }

    if (!this.isNative()) {
      this.bannerVisible = true;
      return true;
    }

    try {
      if (!this.isInitialized) {
        await this.initialize(config);
      }

      const adId = this.getAdUnitId('banner', config);
      const position = options?.position === 'top'
        ? BannerAdPosition.TOP_CENTER
        : BannerAdPosition.BOTTOM_CENTER;

      const bannerOptions: BannerAdOptions = {
        adId,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position,
        margin: 0,
        isTesting: config.environment === 'test',
      };

      await AdMob.showBanner(bannerOptions);
      this.bannerVisible = true;
      console.log(`[AdMob Engine] Native Banner displayed (Unit: ${adId})`);
      return true;
    } catch (err: any) {
      console.warn('[AdMob Engine] showBanner error:', err?.message || err);
      return false;
    }
  }

  /**
   * Hide native Banner Ad (without destroying it completely)
   */
  public async hideBanner(): Promise<void> {
    if (!this.isNative()) {
      this.bannerVisible = false;
      return;
    }

    try {
      if (this.bannerVisible) {
        await AdMob.hideBanner();
        this.bannerVisible = false;
      }
    } catch (err: any) {
      console.warn('[AdMob Engine] hideBanner error:', err?.message || err);
    }
  }

  /**
   * Resume native Banner Ad
   */
  public async resumeBanner(): Promise<void> {
    if (!this.isNative()) {
      this.bannerVisible = true;
      return;
    }

    try {
      await AdMob.resumeBanner();
      this.bannerVisible = true;
    } catch (_) {
      // If resuming fails, try showing again
      await this.showBanner();
    }
  }

  /**
   * Destroy native Banner Ad
   */
  public async removeBanner(): Promise<void> {
    if (!this.isNative()) {
      this.bannerVisible = false;
      return;
    }

    try {
      await AdMob.removeBanner();
      this.bannerVisible = false;
    } catch (err: any) {
      console.warn('[AdMob Engine] removeBanner error:', err?.message || err);
    }
  }

  /**
   * Pre-load an Interstitial Ad in memory
   */
  public async prepareInterstitial(customConfig?: AdMobConfig): Promise<boolean> {
    const config = customConfig || getDeveloperSettings().adMob;
    if (!config.enabled || !this.isNative()) return false;

    try {
      if (!this.isInitialized) {
        await this.initialize(config);
      }

      const adId = this.getAdUnitId('interstitial', config);
      const options: AdOptions = {
        adId,
        isTesting: config.environment === 'test',
      };

      await AdMob.prepareInterstitial(options);
      console.log('[AdMob Engine] Interstitial ad prepared & cached in memory.');
      return true;
    } catch (err: any) {
      console.warn('[AdMob Engine] prepareInterstitial error:', err?.message || err);
      return false;
    }
  }

  /**
   * Show Interstitial Ad (with smart cooldown and frequency limits)
   */
  public async showInterstitial(options?: {
    force?: boolean;
    churchId?: string;
    customConfig?: AdMobConfig;
  }): Promise<boolean> {
    const config = options?.customConfig || getDeveloperSettings().adMob;

    if (!config.enabled) return false;

    // Ad-Free church license check
    if (options?.churchId && isChurchAdFree(options.churchId)) {
      return false;
    }

    // Cooldown check (prevent showing back-to-back within 90 seconds unless forced)
    const now = Date.now();
    const cooldownMs = 90 * 1000;
    if (!options?.force && now - this.lastInterstitialTime < cooldownMs) {
      console.log('[AdMob Engine] Interstitial skipped: cooldown active.');
      return false;
    }

    if (!this.isNative()) {
      console.log('[AdMob Engine] Web preview: Interstitial triggered.');
      this.lastInterstitialTime = now;
      return true;
    }

    try {
      await this.prepareInterstitial(config);
      await AdMob.showInterstitial();
      this.lastInterstitialTime = now;
      console.log('[AdMob Engine] Interstitial shown successfully.');
      return true;
    } catch (err: any) {
      console.warn('[AdMob Engine] showInterstitial error:', err?.message || err);
      return false;
    }
  }

  /**
   * Smart Interstitial trigger on Member Scan
   */
  public async handleScanInterstitial(churchId?: string): Promise<boolean> {
    const config = getDeveloperSettings().adMob;
    if (!config.enabled || !config.enableInterstitialOnScan) return false;

    this.lastScanCount += 1;
    const freq = config.interstitialScanFrequency || 4;

    if (this.lastScanCount % freq === 0) {
      console.log(`[AdMob Engine] Scan count hit frequency threshold (${freq}). Triggering Interstitial...`);
      return await this.showInterstitial({ churchId });
    }

    return false;
  }

  /**
   * Show Rewarded Video Ad (returns true if user watched and earned reward)
   */
  public async showRewardVideoAd(options?: {
    onRewarded?: (reward: any) => void;
    customConfig?: AdMobConfig;
  }): Promise<boolean> {
    const config = options?.customConfig || getDeveloperSettings().adMob;
    if (!config.enabled) return false;

    if (!this.isNative()) {
      console.log('[AdMob Engine] Web preview: Rewarded Video simulated.');
      if (options?.onRewarded) options.onRewarded({ type: 'coins', amount: 10 });
      return true;
    }

    try {
      if (!this.isInitialized) {
        await this.initialize(config);
      }

      const adId = this.getAdUnitId('rewarded', config);
      const rewardOptions: RewardAdOptions = {
        adId,
        isTesting: config.environment === 'test',
      };

      await AdMob.prepareRewardVideoAd(rewardOptions);

      // Listen for reward
      let rewardEarned = false;
      const listener = await AdMob.addListener(
        RewardAdPluginEvents.Rewarded,
        (rewardItem) => {
          rewardEarned = true;
          console.log('[AdMob Engine] User earned reward:', rewardItem);
          if (options?.onRewarded) {
            options.onRewarded(rewardItem);
          }
        }
      );

      await AdMob.showRewardVideoAd();
      setTimeout(() => {
        listener.remove();
      }, 60000);

      return rewardEarned;
    } catch (err: any) {
      console.warn('[AdMob Engine] showRewardVideoAd error:', err?.message || err);
      return false;
    }
  }

  private attachEvents(): void {
    if (this.listenersAttached || !this.isNative()) return;
    this.listenersAttached = true;
    // Native listeners can be registered here safely
  }
}

// Export singleton instance
export const admobEngine = new AdMobServiceEngine();
