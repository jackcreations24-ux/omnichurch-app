import React, { useState, useEffect } from 'react';
import {
  DeveloperDonationConfig,
  DeveloperSettings,
  Language,
  LocalizedDonationCopy,
} from '../../types';
import {
  cleanDonationConfig,
  DEFAULT_DONATE_BUTTON_IMAGE,
  DEFAULT_DONATION_CONFIG,
  DEFAULT_LOCALIZED_DONATION_COPY,
  resolveLocalizedDonationCopy,
  updateDonationConfig,
  verifyAndPushDonationsToCloud,
} from '../../utils/developerStorage';
import { useToast } from '../../context/ToastContext';
import {
  Heart,
  Save,
  CreditCard,
  Coins,
  Globe,
  Smartphone,
  Building2,
  User,
  CheckCircle2,
  Eye,
  Mail,
  Phone,
  Link as LinkIcon,
  FileText,
  SlidersHorizontal,
  XCircle,
  AlertCircle,
  CloudUpload,
  Copy,
  Check,
  Sparkles,
  LayoutTemplate,
  Languages,
  RotateCcw,
} from 'lucide-react';
import { DonateButton } from '../common/DonateButton';
import { DonationScreen } from '../common/DonationScreen';

export interface DevDonationsTabProps {
  settings?: DeveloperSettings;
  donationConfig?: DeveloperDonationConfig;
  onDonationConfigSaved?: (config: DeveloperDonationConfig) => void;
  onUpdateDonationConfig?: (config: DeveloperDonationConfig) => Promise<void>;
  language?: Language;
}

const LANG_OPTIONS: { code: Language; short: string; label: string }[] = [
  { code: 'ht', short: 'HT', label: 'Kreyòl' },
  { code: 'fr', short: 'FR', label: 'Français' },
  { code: 'en', short: 'EN', label: 'English' },
  { code: 'es', short: 'ES', label: 'Español' },
];

export function buildAndroidDonateSyncPrompt(config: DeveloperDonationConfig): string {
  const cleaned = cleanDonationConfig(config);
  const shakeInterval = Math.min(30, Math.max(3, Number(cleaned.shakeIntervalSeconds || 6)));
  const shakeEnabled = cleaned.enableShakeAnimation !== false;
  const copyHt = resolveLocalizedDonationCopy(cleaned, 'ht');
  const copyFr = resolveLocalizedDonationCopy(cleaned, 'fr');
  const copyEn = resolveLocalizedDonationCopy(cleaned, 'en');
  const copyEs = resolveLocalizedDonationCopy(cleaned, 'es');

  const escapeForPrompt = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  return `Act as a Senior Android Engineer (Kotlin + Jetpack Compose + Material 3 + Firebase Firestore) maintaining the OmniChurch Pro Android app (package: com.zoutiw.omnichurch).

Implement the complete multilingual Donate system (supporting all 4 app languages: ht = Kreyòl Ayisyen, fr = Français, en = English, es = Español) with a compact animated Donate image button in the header (replacing the small notification Bell icon button) and a brand-new dedicated full-screen DonateScreen (NOT a modal/dialog), 100% synchronized in real time with the Web Developer Panel via Cloud Firestore.

1. SHARED FIRESTORE REAL-TIME SYNCHRONIZATION & MULTILINGUAL SCHEMA
- Firebase Project ID: gen-lang-client-0674712996
- Named Firestore Database ID: ai-studio-applegizplatfmmu-438b9782-c8b8-4863-805f-d40924b9f1d1
- Remote Document Path: app_config/developer_engine (nested object field: donations)
- CRITICAL: Do NOT overwrite or deploy conflicting firestore.rules from the Android project. Read app_config/developer_engine using a real-time addSnapshotListener (public get is already allowed by the unified security rules).
- Parse app_config/developer_engine -> donations into DeveloperDonationConfig + LocalizedDonationCopy data classes:
  data class LocalizedDonationCopy(
    val screenTitle: String = "",
    val screenSubtitle: String = "",
    val developerRole: String = "",
    val developerBio: String = "",
    val customNote: String = ""
  )
  data class DeveloperDonationConfig(
    val enabled: Boolean = ${cleaned.enabled},
    val enableShakeAnimation: Boolean = ${shakeEnabled},
    val shakeIntervalSeconds: Int = ${shakeInterval}, // clamp 3..30
    val developerName: String = "${escapeForPrompt(cleaned.developerName || 'Jackson Charles')}",
    val developerEmail: String = "${escapeForPrompt(cleaned.developerEmail || '')}",
    val developerPhone: String = "${escapeForPrompt(cleaned.developerPhone || '')}",
    // Legacy top-level HT fallback fields:
    val screenTitle: String = "${escapeForPrompt(copyHt.screenTitle)}",
    val screenSubtitle: String = "${escapeForPrompt(copyHt.screenSubtitle)}",
    val developerRole: String = "${escapeForPrompt(copyHt.developerRole)}",
    val developerBio: String = "${escapeForPrompt(copyHt.developerBio)}",
    val customNote: String = "${escapeForPrompt(copyHt.customNote)}",
    // 4-Language map synced directly from Dev Panel (app_config/developer_engine -> donations.localizedCopy.{ht,fr,en,es}):
    val localizedCopy: Map<String, LocalizedDonationCopy> = mapOf(
      "ht" to LocalizedDonationCopy(
        screenTitle = "${escapeForPrompt(copyHt.screenTitle)}",
        screenSubtitle = "${escapeForPrompt(copyHt.screenSubtitle)}",
        developerRole = "${escapeForPrompt(copyHt.developerRole)}",
        developerBio = "${escapeForPrompt(copyHt.developerBio)}",
        customNote = "${escapeForPrompt(copyHt.customNote)}"
      ),
      "fr" to LocalizedDonationCopy(
        screenTitle = "${escapeForPrompt(copyFr.screenTitle)}",
        screenSubtitle = "${escapeForPrompt(copyFr.screenSubtitle)}",
        developerRole = "${escapeForPrompt(copyFr.developerRole)}",
        developerBio = "${escapeForPrompt(copyFr.developerBio)}",
        customNote = "${escapeForPrompt(copyFr.customNote)}"
      ),
      "en" to LocalizedDonationCopy(
        screenTitle = "${escapeForPrompt(copyEn.screenTitle)}",
        screenSubtitle = "${escapeForPrompt(copyEn.screenSubtitle)}",
        developerRole = "${escapeForPrompt(copyEn.developerRole)}",
        developerBio = "${escapeForPrompt(copyEn.developerBio)}",
        customNote = "${escapeForPrompt(copyEn.customNote)}"
      ),
      "es" to LocalizedDonationCopy(
        screenTitle = "${escapeForPrompt(copyEs.screenTitle)}",
        screenSubtitle = "${escapeForPrompt(copyEs.screenSubtitle)}",
        developerRole = "${escapeForPrompt(copyEs.developerRole)}",
        developerBio = "${escapeForPrompt(copyEs.developerBio)}",
        customNote = "${escapeForPrompt(copyEs.customNote)}"
      )
    ),
    val paypalEnabled: Boolean = ${cleaned.paypalEnabled}, val paypalEmail: String = "", val paypalMeUrl: String = "",
    val binanceEnabled: Boolean = ${cleaned.binanceEnabled}, val binancePayId: String = "", val binanceUsdtAddress: String = "", val binanceNetwork: String = "",
    val wiseEnabled: Boolean = ${cleaned.wiseEnabled}, val wiseEmail: String = "", val wiseTag: String = "", val wiseIban: String = "",
    val moncashEnabled: Boolean = ${cleaned.moncashEnabled}, val moncashNumber: String = "", val moncashName: String = "",
    val zelleEnabled: Boolean = ${cleaned.zelleEnabled}, val zelleInfo: String = ""
  )

2. STRICT 4-LANGUAGE RESOLUTION RULE (ZERO LANGUAGE LEAKS)
- Implement resolveLocalizedDonationCopy(config: DeveloperDonationConfig, appLang: String): LocalizedDonationCopy:
  - Normalize appLang to one of "ht", "fr", "en", "es" (default "ht").
  - For each field (screenTitle, screenSubtitle, developerRole, developerBio, customNote):
    1) Use config.localizedCopy[lang]?.field if non-blank.
    2) Only when lang == "ht", allow falling back to legacy top-level config.field before the built-in Haitian Creole default.
    3) When lang is "fr", "en", or "es", NEVER fall back to Haitian Creole top-level fields — fall back strictly to that language's built-in default copy so switching languages in the app immediately updates every heading, subtitle, bio, button label, and gratitude note in the chosen language.

3. HEADER BUTTON REPLACEMENT (REPLACE BELL ICON WITH COMPACT GOLD IMAGE + SHAKE ANIMATION)
- Bundle the glossy gold Donate button PNG as res/drawable/btn_donate_gold.png.
- In the Android TopAppBar / Header, REMOVE the small notification Bell icon button and REPLACE it directly with this compact image Donate button (keep Notifications accessible inside the profile/settings menu).
- Render cleanly without heavy borders/boxes: Image(painter = painterResource(R.drawable.btn_donate_gold), contentScale = ContentScale.Fit), height = 34.dp, min 44.dp touch hitbox, localized contentDescription ("Fè yon donasyon" / "Faire un don" / "Donate" / "Donar").
- Hide immediately when donations.enabled == false.
- Subtle periodic shake animation when donations.enableShakeAnimation == true:
  - LaunchedEffect(donations.enableShakeAnimation, donations.shakeIntervalSeconds) stays idle for (shakeIntervalSeconds * 1000L) ms, then runs a smooth ~550ms rotationZ wiggle (0f -> -5f -> 5f -> -3f -> 2f -> 0f) + tiny scale pulse (1f -> 1.05f -> 1f) via Modifier.graphicsLayer (respect system reduced-motion setting).

4. BRAND-NEW DEDICATED FULL SCREEN — DonateScreen (FULLY LOCALIZED IN HT / FR / EN / ES)
- Register a dedicated Navigation Compose route (e.g. route = "donate") — NEVER open a Dialog or ModalBottomSheet.
- Tapping the compact gold header button navigates cleanly to DonateScreen (navController.navigate("donate") { launchSingleTop = true }).
- Localize EVERY UI label on DonateScreen according to the active OmniChurch app language (ht / fr / en / es):
  - TopAppBar Back button + title ("Soutyen & Donasyon" / "Soutien & Don" / "Support & Donate" / "Apoyo y Donación") + Verified label ("Verifye" / "Vérifié" / "Verified" / "Verificado")
  - Hero kicker, localized screenTitle & screenSubtitle from resolveLocalizedDonationCopy()
  - Payment Methods heading, channel sublabels (Card/Account, Crypto USDT, TransferWise, Digicel/Natcash, USA/Bank), localized Copy / Copied! feedback ("Kopye" / "Copier" / "Copy" / "Copiar"), PayPal direct button ("Ouvri Paj PayPal la Dirèkteman" / "Ouvrir PayPal.me Directement" / "Open PayPal.me Directly" / "Abrir PayPal.me Directamente"), MonCash *202# helper text, and empty state when 0 channels are enabled
  - Developer Profile card (developerName, localized developerRole, localized developerBio, localized Direct Contact section with copyable developerEmail & developerPhone)
  - Gratitude Note card displaying localized customNote
- Verify that changing language in the Android app immediately re-renders DonateScreen in HT/FR/EN/ES, and editing any language tab in the Web Developer Panel updates Android in real time via Firestore.`;
}

export const DevDonationsTab: React.FC<DevDonationsTabProps> = ({
  settings,
  donationConfig: initialConfig,
  onDonationConfigSaved,
  onUpdateDonationConfig,
  language = 'ht',
}) => {
  const toast = useToast();
  const isEs = language === 'es';
  const isFr = language === 'fr';
  const isEn = language === 'en';

  const [config, setConfig] = useState<DeveloperDonationConfig>(() =>
    cleanDonationConfig({
      ...DEFAULT_DONATION_CONFIG,
      ...(initialConfig || {}),
    })
  );

  const [activeCopyLang, setActiveCopyLang] = useState<Language>(language);
  const [previewLang, setPreviewLang] = useState<Language>(language);
  const [isSaving, setIsSaving] = useState(false);
  const [isPushingCloud, setIsPushingCloud] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [showPreviewScreen, setShowPreviewScreen] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  useEffect(() => {
    if (initialConfig) {
      setConfig((prev) =>
        cleanDonationConfig({
          ...DEFAULT_DONATION_CONFIG,
          ...prev,
          ...initialConfig,
        })
      );
    }
  }, [initialConfig]);

  const activeLocalizedCopy: LocalizedDonationCopy =
    config.localizedCopy?.[activeCopyLang] ||
    DEFAULT_LOCALIZED_DONATION_COPY[activeCopyLang];

  const persistConfig = async (nextConfig: DeveloperDonationConfig, silent = false) => {
    const stamped = cleanDonationConfig({
      ...nextConfig,
      userCustomizedChannels: true,
    });
    setConfig(stamped);
    const updated = await updateDonationConfig(stamped);
    if (onDonationConfigSaved) onDonationConfigSaved(updated);
    if (onUpdateDonationConfig) await onUpdateDonationConfig(updated);
    if (!silent) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

  const handleChange = (
    field: keyof DeveloperDonationConfig,
    value: string | boolean | number
  ) => {
    const nextConfig: DeveloperDonationConfig = {
      ...config,
      [field]: value,
      userCustomizedChannels: true,
    };
    setConfig(nextConfig);

    if (typeof value === 'boolean') {
      void persistConfig(nextConfig, true);
    }
  };

  const handleLocalizedFieldChange = (
    lang: Language,
    field: keyof LocalizedDonationCopy,
    value: string
  ) => {
    const currentMap: Record<Language, LocalizedDonationCopy> = {
      ht: { ...(config.localizedCopy?.ht || DEFAULT_LOCALIZED_DONATION_COPY.ht) },
      fr: { ...(config.localizedCopy?.fr || DEFAULT_LOCALIZED_DONATION_COPY.fr) },
      en: { ...(config.localizedCopy?.en || DEFAULT_LOCALIZED_DONATION_COPY.en) },
      es: { ...(config.localizedCopy?.es || DEFAULT_LOCALIZED_DONATION_COPY.es) },
    };

    currentMap[lang] = {
      ...currentMap[lang],
      [field]: value,
    };

    const nextConfig: DeveloperDonationConfig = {
      ...config,
      localizedCopy: currentMap,
      ...(lang === 'ht' ? { [field]: value } : {}),
      userCustomizedChannels: true,
    };
    setConfig(nextConfig);
  };

  const handleResetLanguageDefaults = (lang: Language) => {
    const defaults = DEFAULT_LOCALIZED_DONATION_COPY[lang];
    const currentMap: Record<Language, LocalizedDonationCopy> = {
      ht: { ...(config.localizedCopy?.ht || DEFAULT_LOCALIZED_DONATION_COPY.ht) },
      fr: { ...(config.localizedCopy?.fr || DEFAULT_LOCALIZED_DONATION_COPY.fr) },
      en: { ...(config.localizedCopy?.en || DEFAULT_LOCALIZED_DONATION_COPY.en) },
      es: { ...(config.localizedCopy?.es || DEFAULT_LOCALIZED_DONATION_COPY.es) },
    };
    currentMap[lang] = { ...defaults };

    const nextConfig: DeveloperDonationConfig = {
      ...config,
      localizedCopy: currentMap,
      ...(lang === 'ht'
        ? {
            screenTitle: defaults.screenTitle,
            screenSubtitle: defaults.screenSubtitle,
            developerRole: defaults.developerRole,
            developerBio: defaults.developerBio,
            customNote: defaults.customNote,
          }
        : {}),
      userCustomizedChannels: true,
    };
    setConfig(nextConfig);
    toast.info(
      isEs
        ? `Textos restaurados (${lang.toUpperCase()})`
        : isEn
        ? `Default copy restored (${lang.toUpperCase()})`
        : isFr
        ? `Textes par défaut restaurés (${lang.toUpperCase()})`
        : `Tèks padefo retabli (${lang.toUpperCase()})`,
      isEs
        ? 'Haz clic en Guardar y Sincronizar para publicar en la nube.'
        : isEn
        ? 'Click Save & Sync to publish to Firestore.'
        : isFr
        ? 'Cliquez sur Enregistrer & Synchroniser pour publier sur le cloud.'
        : 'Klike sou Anrejistre & Senkwonize pou pibliye sou Cloud la.'
    );
  };

  const handleUnselectAllChannels = async () => {
    const nextConfig: DeveloperDonationConfig = {
      ...config,
      paypalEnabled: false,
      binanceEnabled: false,
      wiseEnabled: false,
      moncashEnabled: false,
      zelleEnabled: false,
      userCustomizedChannels: true,
    };
    await persistConfig(nextConfig);
    toast.info(
      isEs
        ? 'Canales Desactivados'
        : isEn
        ? 'All Channels Disabled'
        : isFr
        ? 'Tous les Canaux Désactivés'
        : 'Tout Kanal Deseleksyone',
      isEs
        ? 'Todas las opciones de pago se han desactivado y guardado.'
        : isEn
        ? 'All payment channels have been unselected and saved.'
        : isFr
        ? 'Toutes les options de paiement ont été désactivées.'
        : 'Tout opsyon peman yo mete sou "Pa Seleksyone" e anrejistre.'
    );
  };

  const handleEnableConfiguredChannelsOnly = async () => {
    const hasPaypal = Boolean(config.paypalEmail?.trim() || config.paypalMeUrl?.trim());
    const hasBinance = Boolean(config.binancePayId?.trim() || config.binanceUsdtAddress?.trim());
    const hasWise = Boolean(config.wiseEmail?.trim() || config.wiseTag?.trim() || config.wiseIban?.trim());
    const hasMoncash = Boolean(config.moncashNumber?.trim() || config.moncashName?.trim());
    const hasZelle = Boolean(config.zelleInfo?.trim());

    const nextConfig: DeveloperDonationConfig = {
      ...config,
      paypalEnabled: hasPaypal,
      binanceEnabled: hasBinance,
      wiseEnabled: hasWise,
      moncashEnabled: hasMoncash,
      zelleEnabled: hasZelle,
      userCustomizedChannels: true,
    };
    await persistConfig(nextConfig);
    const activeCount = [hasPaypal, hasBinance, hasWise, hasMoncash, hasZelle].filter(Boolean).length;
    toast.success(
      isEs
        ? 'Canales Configurados Activados'
        : isEn
        ? 'Configured Channels Enabled'
        : isFr
        ? 'Canaux Configurés Activés'
        : 'Kanal Konfigire yo Aktive',
      activeCount > 0
        ? isEs
          ? `${activeCount} canal(es) con datos completos activados automáticamente.`
          : isEn
          ? `${activeCount} configured payment channel(s) enabled automatically.`
          : isFr
          ? `${activeCount} canal(aux) renseigné(s) activé(s) automatiquement.`
          : `${activeCount} kanal peman ki gen enfòmasyon ranpli yo aktive otomatikman.`
        : isEs
        ? 'Ningún canal tiene datos completos todavía.'
        : isEn
        ? 'No channels have account details configured yet.'
        : isFr
        ? 'Aucun canal n’a encore de coordonnées renseignées.'
        : 'Okenn kanal poko gen enfòmasyon kont ranpli; tout rete deseleksyone.'
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setCloudStatus(null);
    try {
      const result = await verifyAndPushDonationsToCloud(settings, config);
      if (result.remoteDonations) {
        setConfig(result.remoteDonations);
        if (onDonationConfigSaved) onDonationConfigSaved(result.remoteDonations);
        if (onUpdateDonationConfig) await onUpdateDonationConfig(result.remoteDonations);
      } else {
        await persistConfig(config);
      }

      if (result.syncedToCloud && result.remoteVerified) {
        const msg = isEs
          ? 'Configuración multilingüe (HT/FR/EN/ES) guardada y verificada 100% en Cloud Firestore.'
          : isEn
          ? 'Multilingual donation settings (HT/FR/EN/ES) saved and verified 100% on Cloud Firestore.'
          : isFr
          ? 'Configuration multilingue (HT/FR/EN/ES) enregistrée et vérifiée à 100% sur Cloud Firestore.'
          : 'Konfigirasyon Donasyon 4 lang yo (HT/FR/EN/ES) sove epi verifye 100% sou Cloud Firestore.';
        setCloudStatus({ ok: true, text: msg });
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
        toast.success(
          isEs ? '¡Guardado y Sincronizado!' : isEn ? 'Saved & Cloud Synced!' : isFr ? 'Enregistré & Synchronisé !' : 'Sove & Senkwonize sou Cloud!',
          msg
        );
      } else if (result.syncedToCloud) {
        const msg = isEs
          ? 'Guardado en Cloud Firestore (app_config/developer_engine -> donations).'
          : isEn
          ? 'Saved to Cloud Firestore (app_config/developer_engine -> donations).'
          : isFr
          ? 'Enregistré sur Cloud Firestore (app_config/developer_engine -> donations).'
          : 'Sove sou Cloud Firestore (app_config/developer_engine -> donations).';
        setCloudStatus({ ok: true, text: msg });
        toast.success(
          isEs ? 'Configuración Guardada' : isEn ? 'Donation Settings Saved' : isFr ? 'Configuration Enregistrée' : 'Konfigirasyon Donasyon Anrejistre!',
          msg
        );
      } else {
        const msg =
          result.reason === 'requires_super_dev_google_auth'
            ? isEs
              ? 'Guardado solo localmente. Inicia sesión con la cuenta Google Super Developer arriba para sincronizar con la app móvil.'
              : isEn
              ? 'Saved locally only. Sign in with the authorized Super Developer Google account above to sync to mobile.'
              : isFr
              ? 'Enregistré localement uniquement. Connectez le compte Google Super Developer ci-dessus pour synchroniser avec le mobile.'
              : 'Sove lokalman sèlman. Konekte ak kont Google Super Developer la anlè pou senkwonize ak app mobil la.'
            : `${isEn ? 'Saved locally, Cloud Sync failed:' : 'Sove lokalman, Cloud Sync echwe:'} ${result.reason || 'Error'}`;
        setCloudStatus({ ok: false, text: msg });
        toast.warning(
          isEs ? 'Guardado Localmente' : isEn ? 'Saved Locally Only' : isFr ? 'Enregistré Localement' : 'Sove Lokalman Sèlman',
          msg
        );
      }
    } catch (err) {
      console.error('Error saving donation config:', err);
      toast.error(
        isEs ? 'Error' : isEn ? 'Error' : isFr ? 'Erreur' : 'Erè',
        isEs
          ? 'No se pudo guardar la configuración de donaciones.'
          : isEn
          ? 'Could not save donation configuration.'
          : isFr
          ? 'Impossible d’enregistrer la configuration des dons.'
          : 'Pa t kapab sove konfigirasyon donasyon an.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handlePushAndVerifyCloud = async () => {
    setIsPushingCloud(true);
    setCloudStatus(null);
    try {
      const result = await verifyAndPushDonationsToCloud(settings, config);
      if (result.remoteDonations) {
        setConfig(result.remoteDonations);
        if (onDonationConfigSaved) onDonationConfigSaved(result.remoteDonations);
        if (onUpdateDonationConfig) await onUpdateDonationConfig(result.remoteDonations);
      }
      if (result.syncedToCloud && result.remoteVerified) {
        const msg = isEs
          ? '¡Sincronización Cloud 100% verificada! app_config/developer_engine → donations (HT/FR/EN/ES) actualizado para Web y Android.'
          : isEn
          ? 'Cloud Sync verified 100%! app_config/developer_engine → donations (HT/FR/EN/ES) is live for Web and Android.'
          : isFr
          ? 'Synchronisation Cloud vérifiée à 100% ! app_config/developer_engine → donations (HT/FR/EN/ES) est à jour pour Web et Android.'
          : 'Senkronizasyon Cloud Verifye 100%! app_config/developer_engine → donations (HT/FR/EN/ES) ajou pou Web ak Android.';
        setCloudStatus({ ok: true, text: msg });
        toast.success(
          isEs ? '¡Cloud Sync Verificado!' : isEn ? 'Cloud Sync Verified!' : isFr ? 'Cloud Sync Vérifié !' : 'Cloud Sync Verifye!',
          msg
        );
      } else {
        const msg =
          result.reason === 'requires_super_dev_google_auth'
            ? isEs
              ? 'Conecta tu cuenta Google Super Developer autorizada arriba para publicar en Firestore.'
              : isEn
              ? 'Sign in with your authorized Super Developer Google account above to push to Cloud Firestore.'
              : isFr
              ? 'Connectez votre compte Google Super Developer autorisé ci-dessus pour publier sur Firestore.'
              : 'Konekte ak kont Google Super Developer otorize a anlè pou pouse done donasyon yo sou Cloud Firestore.'
            : `${isEn ? 'Cloud Sync unconfirmed:' : 'Cloud Sync pa konfime:'} ${result.reason || ''}`;
        setCloudStatus({ ok: false, text: msg });
        toast.warning(
          isEs ? 'Cloud Sync Pendiente' : isEn ? 'Cloud Sync Pending' : isFr ? 'Sync Cloud en Attente' : 'Cloud Sync An Atant',
          msg
        );
      }
    } catch (err: any) {
      const msg = err?.message || 'Cloud sync error';
      setCloudStatus({ ok: false, text: msg });
      toast.error('Cloud Sync Error', msg);
    } finally {
      setIsPushingCloud(false);
    }
  };

  const handleCopyAndroidPrompt = async () => {
    const promptText = buildAndroidDonateSyncPrompt(config);
    try {
      await navigator.clipboard.writeText(promptText);
      setCopiedPrompt(true);
      toast.success(
        isEs
          ? '¡Prompt Android Copiado!'
          : isEn
          ? 'Android Donate Prompt Copied!'
          : isFr
          ? 'Prompt Android Copié !'
          : 'Prompt Android Donate Kopye!',
        isEs
          ? 'Pega este prompt directamente en tu proyecto Android Kotlin / Compose.'
          : isEn
          ? 'Paste this prompt directly into your Android Kotlin / Compose project.'
          : isFr
          ? 'Collez ce prompt directement dans votre projet Android Kotlin / Compose.'
          : 'Ou ka kole prompt sa a dirèkteman nan pwojè Android Kotlin / Compose ou a.'
      );
      setTimeout(() => setCopiedPrompt(false), 3000);
    } catch {
      toast.error(
        isEs ? 'Error al copiar' : isEn ? 'Copy Failed' : isFr ? 'Échec de copie' : 'Echèk Kopi',
        isEs
          ? 'No se pudo copiar al portapapeles.'
          : isEn
          ? 'Could not copy to clipboard.'
          : isFr
          ? 'Impossible de copier dans le presse-papiers.'
          : 'Pa t kapab kopye prompt la nan clipboard la.'
      );
    }
  };

  const hasPaypalDetails = Boolean(config.paypalEmail?.trim() || config.paypalMeUrl?.trim());
  const hasBinanceDetails = Boolean(config.binancePayId?.trim() || config.binanceUsdtAddress?.trim());
  const hasWiseDetails = Boolean(config.wiseEmail?.trim() || config.wiseTag?.trim() || config.wiseIban?.trim());
  const hasMoncashDetails = Boolean(config.moncashNumber?.trim() || config.moncashName?.trim());
  const hasZelleDetails = Boolean(config.zelleInfo?.trim());

  const enabledChannelsCount = [
    config.paypalEnabled,
    config.binanceEnabled,
    config.wiseEnabled,
    config.moncashEnabled,
    config.zelleEnabled,
  ].filter(Boolean).length;

  const selectedLabel = isEs ? 'Activo' : isEn ? 'Enabled' : isFr ? 'Activé' : 'Seleksyone';
  const unselectedLabel = isEs ? 'Inactivo' : isEn ? 'Disabled' : isFr ? 'Désactivé' : 'Pa Seleksyone';

  const renderChannelStatusText = (isEnabled: boolean, hasDetails: boolean) => {
    if (!isEnabled) {
      return <span className="text-[11px] font-medium text-slate-500">{unselectedLabel}</span>;
    }
    if (hasDetails) {
      return (
        <span className="text-[11px] font-semibold text-emerald-400 inline-flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {isEs ? 'Configurado y Activo' : isEn ? 'Configured & Active' : isFr ? 'Configuré & Actif' : 'Konfigire & Aktif'}
        </span>
      );
    }
    return (
      <span className="text-[11px] font-semibold text-amber-400 inline-flex items-center gap-1">
        <AlertCircle className="w-3.5 h-3.5" />
        {isEs ? 'Faltan Datos' : isEn ? 'Needs Details' : isFr ? 'Infos Requises' : 'Mande Enfòmasyon'}
      </span>
    );
  };

  const activeLangMeta = LANG_OPTIONS.find((l) => l.code === activeCopyLang) || LANG_OPTIONS[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner + Cloud Sync Bar */}
      <div className="p-6 rounded-3xl bg-slate-900/95 border border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shrink-0">
              <Heart className="w-6 h-6 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-extrabold text-white">
                  {isEs
                    ? 'Pantalla y Botón de Donación (4 Idiomas · Web + Móvil)'
                    : isEn
                    ? 'Donation Screen & Button (4 Languages · Web + Mobile)'
                    : isFr
                    ? 'Écran & Bouton de Don (4 Langues · Web + Mobile)'
                    : 'Ekran & Bouton Donasyon (4 Lang · Web + Mobil)'}
                </h3>
                <span className="text-xs font-mono text-amber-400 tabular-nums">
                  · {enabledChannelsCount} / 5{' '}
                  {isEs ? 'Canales' : isEn ? 'Channels' : isFr ? 'Canaux' : 'Kanal'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {isEs
                  ? 'Personaliza los textos de donación en Kreyòl, Francés, Inglés y Español, controla la animación del botón y tus cuentas de pago. Todo se sincroniza en tiempo real en '
                  : isEn
                  ? 'Customize Donate copy across Haitian Creole, French, English, and Spanish, control the button shake animation, and manage payment channels. Everything syncs live to '
                  : isFr
                  ? 'Personnalisez les textes de don en Créole, Français, Anglais et Espagnol, gérez l’animation du bouton et vos comptes. Tout est synchronisé en temps réel dans '
                  : 'Modifye tèks ekran donasyon an nan tout 4 lang yo (Kreyòl, Fransè, Anglè, Panyòl), animasyon shake bouton an, ak kont peman yo. Tout bagay senkwonize an tan reyèl nan '}
                <code className="font-mono text-amber-300">app_config/developer_engine → donations</code>.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              id="btn-dev-preview-donate-screen"
              onClick={() => {
                setPreviewLang(activeCopyLang);
                setShowPreviewScreen(true);
              }}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Eye className="w-4 h-4" />
              <span>
                {isEs
                  ? 'Vista Previa Pantalla'
                  : isEn
                  ? 'Preview Donate Screen'
                  : isFr
                  ? 'Aperçu Écran Don'
                  : 'Previzyalize Ekran Donasyon'}
              </span>
            </button>

            <button
              type="button"
              id="btn-dev-push-donations-cloud"
              disabled={isPushingCloud}
              onClick={handlePushAndVerifyCloud}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/35 text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <CloudUpload className="w-4 h-4" />
              <span>
                {isPushingCloud
                  ? isEs
                    ? 'Sincronizando...'
                    : isEn
                    ? 'Syncing...'
                    : isFr
                    ? 'Synchronisation...'
                    : 'Ap Senkwonize...'
                  : isEs
                  ? 'Publicar y Verificar Cloud'
                  : isEn
                  ? 'Push & Verify Cloud'
                  : isFr
                  ? 'Publier & Vérifier Cloud'
                  : 'Pouse & Verifye sou Cloud'}
              </span>
            </button>

            <label className="min-h-[42px] flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => handleChange('enabled', e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-amber-400 focus:ring-amber-400 w-4 h-4"
              />
              <span className="text-xs font-bold text-white">
                {config.enabled
                  ? isEs
                    ? 'Botón Visible'
                    : isEn
                    ? 'Button Visible'
                    : isFr
                    ? 'Bouton Actif'
                    : 'Bouton Aktif'
                  : isEs
                  ? 'Botón Oculto'
                  : isEn
                  ? 'Button Hidden'
                  : isFr
                  ? 'Bouton Masqué'
                  : 'Bouton Kache'}
              </span>
            </label>
          </div>
        </div>

        {cloudStatus && (
          <div
            className={`px-4 py-3 rounded-2xl border text-xs flex items-center gap-2.5 ${
              cloudStatus.ok
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
            }`}
          >
            {cloudStatus.ok ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            )}
            <span>{cloudStatus.text}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Header Button Style & Shake Animation */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <LayoutTemplate className="w-5 h-5 text-amber-400" />
              <div>
                <h4 className="font-bold text-sm text-white">
                  {isEs
                    ? '1. Botón Compacto del Encabezado (Imagen + Animación Shake)'
                    : isEn
                    ? '1. Compact Header Button (Image + Shake Animation)'
                    : isFr
                    ? '1. Bouton Compact d’En-tête (Image + Animation Shake)'
                    : '1. Ti Bouton Header (Imaj Lò + Animasyon Shake)'}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {isEs
                    ? 'Controla la imagen dorada y la frecuencia de la vibración sutil en Web y Android.'
                    : isEn
                    ? 'Control the golden image asset and subtle periodic shake interval on Web and Android.'
                    : isFr
                    ? 'Contrôlez l’image dorée et la fréquence de l’animation shake sur Web et Android.'
                    : 'Kontwole imaj bouton an ak frekans animasyon shake dous la sou Web ak Android.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-[11px] text-slate-400 font-medium">
                {isEs ? 'Vista previa:' : isEn ? 'Preview:' : isFr ? 'Aperçu :' : 'Apèsi:'}
              </span>
              <DonateButton
                size="preview"
                customConfig={config}
                forceShow
                language={activeCopyLang}
                onClick={() => {
                  setPreviewLang(activeCopyLang);
                  setShowPreviewScreen(true);
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="flex flex-col sm:flex-row gap-3">
              <label className="flex-1 flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <div>
                  <span className="font-semibold text-white block">
                    {isEs
                      ? 'Animación Shake'
                      : isEn
                      ? 'Shake Animation'
                      : isFr
                      ? 'Animation Shake'
                      : 'Animasyon Shake'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {isEs
                      ? 'Vibración sutil periódica'
                      : isEn
                      ? 'Gentle periodic attention wiggle'
                      : isFr
                      ? 'Légère secousse périodique'
                      : 'Ti souke dous peryodik sou bouton an'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={config.enableShakeAnimation !== false}
                  onChange={(e) => handleChange('enableShakeAnimation', e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-amber-400 focus:ring-amber-400 w-4 h-4"
                />
              </label>

              <div className="w-full sm:w-40">
                <label className="text-slate-400 block mb-1 font-medium">
                  {isEs
                    ? 'Intervalo (seg.)'
                    : isEn
                    ? 'Interval (sec)'
                    : isFr
                    ? 'Intervalle (sec)'
                    : 'Entèval (seg.)'}
                </label>
                <input
                  type="number"
                  min={3}
                  max={30}
                  value={config.shakeIntervalSeconds ?? 6}
                  onChange={(e) => handleChange('shakeIntervalSeconds', Number(e.target.value || 6))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-amber-300 font-mono tabular-nums focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-400 font-medium">
                  {isEs
                    ? 'Ruta / URL Imagen del Botón'
                    : isEn
                    ? 'Button Image Path / URL'
                    : isFr
                    ? 'Chemin / URL Image du Bouton'
                    : 'Chemen / URL Imaj Bouton an'}
                </label>
                {config.buttonImageUrl !== DEFAULT_DONATE_BUTTON_IMAGE && (
                  <button
                    type="button"
                    onClick={() => handleChange('buttonImageUrl', DEFAULT_DONATE_BUTTON_IMAGE)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                  >
                    {isEs ? 'Restaurar' : isEn ? 'Reset Default' : isFr ? 'Réinitialiser' : 'Retabli Imaj Lò'}
                  </button>
                )}
              </div>
              <input
                type="text"
                value={config.buttonImageUrl || DEFAULT_DONATE_BUTTON_IMAGE}
                onChange={(e) => handleChange('buttonImageUrl', e.target.value)}
                placeholder={DEFAULT_DONATE_BUTTON_IMAGE}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
        </div>

        {/* 2. Multilingual Copy Editor (HT / FR / EN / ES) */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <Languages className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-white">
                  {isEs
                    ? '2. Textos de la Pantalla de Donación por Idioma (HT · FR · EN · ES)'
                    : isEn
                    ? '2. Multilingual Donate Screen Copy (HT · FR · EN · ES)'
                    : isFr
                    ? '2. Textes de l’Écran de Don par Langue (HT · FR · EN · ES)'
                    : '2. Tèks Ekran Donasyon an pou Chak Lang (HT · FR · EN · ES)'}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {isEs
                    ? 'Selecciona un idioma para editar su título, subtítulo, rol, visión y nota de agradecimiento.'
                    : isEn
                    ? 'Switch tabs below to customize the headline, subtitle, role, mission bio, and gratitude note per language.'
                    : isFr
                    ? 'Sélectionnez une langue ci-dessous pour personnaliser le titre, sous-titre, rôle, mission et message de gratitude.'
                    : 'Chwazi yon lang anba a pou pèsonalize tit, soutit, wòl, vizyon ak mesaj remèsiman pou lang sa a.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div
                role="tablist"
                aria-label="Donation copy language selector"
                className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800"
              >
                {LANG_OPTIONS.map((langOpt) => {
                  const isActive = activeCopyLang === langOpt.code;
                  return (
                    <button
                      key={langOpt.code}
                      type="button"
                      role="tab"
                      id={`btn-dev-donate-lang-${langOpt.code}`}
                      aria-selected={isActive}
                      onClick={() => setActiveCopyLang(langOpt.code)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'bg-amber-400 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {langOpt.short} · {langOpt.label}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => handleResetLanguageDefaults(activeCopyLang)}
                className="min-h-[36px] px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-amber-300 text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                title={`Reset ${activeLangMeta.label}`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>
                  {isEs
                    ? `Restaurar ${activeLangMeta.short}`
                    : isEn
                    ? `Reset ${activeLangMeta.short}`
                    : isFr
                    ? `Défaut ${activeLangMeta.short}`
                    : `Padefo ${activeLangMeta.short}`}
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-slate-400 block mb-1 font-medium">
                {isEs
                  ? `Título Principal (${activeLangMeta.label})`
                  : isEn
                  ? `Screen Headline (${activeLangMeta.label})`
                  : isFr
                  ? `Titre Principal (${activeLangMeta.label})`
                  : `Tit Prensipal Ekran an (${activeLangMeta.label})`}
              </label>
              <input
                type="text"
                value={activeLocalizedCopy.screenTitle}
                onChange={(e) =>
                  handleLocalizedFieldChange(activeCopyLang, 'screenTitle', e.target.value)
                }
                placeholder={DEFAULT_LOCALIZED_DONATION_COPY[activeCopyLang].screenTitle}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-medium">
                {isEs
                  ? `Rol / Título Profesional (${activeLangMeta.label})`
                  : isEn
                  ? `Developer Role / Title (${activeLangMeta.label})`
                  : isFr
                  ? `Rôle / Titre Professionnel (${activeLangMeta.label})`
                  : `Tit / Wòl Pwofesyonèl (${activeLangMeta.label})`}
              </label>
              <input
                type="text"
                value={activeLocalizedCopy.developerRole}
                onChange={(e) =>
                  handleLocalizedFieldChange(activeCopyLang, 'developerRole', e.target.value)
                }
                placeholder={DEFAULT_LOCALIZED_DONATION_COPY[activeCopyLang].developerRole}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-slate-400 block mb-1 font-medium">
                {isEs
                  ? `Subtítulo / Introducción (${activeLangMeta.label})`
                  : isEn
                  ? `Screen Subtitle / Intro (${activeLangMeta.label})`
                  : isFr
                  ? `Sous-titre / Introduction (${activeLangMeta.label})`
                  : `Soutit / Entwodiksyon Ekran an (${activeLangMeta.label})`}
              </label>
              <textarea
                rows={2}
                value={activeLocalizedCopy.screenSubtitle}
                onChange={(e) =>
                  handleLocalizedFieldChange(activeCopyLang, 'screenSubtitle', e.target.value)
                }
                placeholder={DEFAULT_LOCALIZED_DONATION_COPY[activeCopyLang].screenSubtitle}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400 leading-relaxed"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-slate-400 block mb-1 font-medium">
                {isEs
                  ? `Mensaje de Visión y Misión (${activeLangMeta.label})`
                  : isEn
                  ? `Vision & Mission Statement (${activeLangMeta.label})`
                  : isFr
                  ? `Message de Vision & Mission (${activeLangMeta.label})`
                  : `Mesaj Vizyon & Objektif Devlopman an (${activeLangMeta.label})`}
              </label>
              <textarea
                rows={3}
                value={activeLocalizedCopy.developerBio}
                onChange={(e) =>
                  handleLocalizedFieldChange(activeCopyLang, 'developerBio', e.target.value)
                }
                placeholder={DEFAULT_LOCALIZED_DONATION_COPY[activeCopyLang].developerBio}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400 leading-relaxed"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-slate-400 block mb-1 font-medium flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {isEs
                    ? `Nota de Agradecimiento / Versículo (${activeLangMeta.label})`
                    : isEn
                    ? `Gratitude Note / Blessing (${activeLangMeta.label})`
                    : isFr
                    ? `Note de Remerciement / Verset (${activeLangMeta.label})`
                    : `Nòt Remèsiman Pèsonalize (${activeLangMeta.label})`}
                </span>
              </label>
              <input
                type="text"
                value={activeLocalizedCopy.customNote}
                onChange={(e) =>
                  handleLocalizedFieldChange(activeCopyLang, 'customNote', e.target.value)
                }
                placeholder={DEFAULT_LOCALIZED_DONATION_COPY[activeCopyLang].customNote}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
        </div>

        {/* 3. Shared Developer Contact Identity */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
            <User className="w-5 h-5 text-amber-400" />
            <h4 className="font-bold text-sm text-white">
              {isEs
                ? '3. Identidad y Contacto Directo del Desarrollador (Común a todos los idiomas)'
                : isEn
                ? '3. Developer Identity & Direct Contact (Shared across all languages)'
                : isFr
                ? '3. Identité & Contact Direct du Développeur (Partagé dans toutes les langues)'
                : '3. Idantite & Kontak Dirèk Devlopè a (Pataje nan tout 4 lang yo)'}
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-slate-400 block mb-1 font-medium">
                {isEs ? 'Nombre Completo *' : isEn ? 'Full Name *' : isFr ? 'Nom Complet *' : 'Non Konplè Devlopè a *'}
              </label>
              <input
                type="text"
                required
                value={config.developerName}
                onChange={(e) => handleChange('developerName', e.target.value)}
                placeholder="Jackson Charles"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-medium flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{isEs ? 'Correo Oficial' : isEn ? 'Official Email' : isFr ? 'E-mail Officiel' : 'Imèl Kontak Ofisyèl'}</span>
              </label>
              <input
                type="email"
                value={config.developerEmail}
                onChange={(e) => handleChange('developerEmail', e.target.value)}
                placeholder="contact@omnichurch.download"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-medium flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{isEs ? 'Teléfono / WhatsApp' : isEn ? 'Phone / WhatsApp' : isFr ? 'Téléphone / WhatsApp' : 'Telefòn / WhatsApp'}</span>
              </label>
              <input
                type="text"
                value={config.developerPhone || ''}
                onChange={(e) => handleChange('developerPhone', e.target.value)}
                placeholder="+1 / +509 ..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
        </div>

        {/* Channel Quick Selection Toolbar */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <h4 className="text-xs font-extrabold text-white">
                {isEs
                  ? `Control Rápido de Canales (${enabledChannelsCount} de 5 activos)`
                  : isEn
                  ? `Quick Payment Channel Control (${enabledChannelsCount} of 5 enabled)`
                  : isFr
                  ? `Contrôle Rapide des Canaux (${enabledChannelsCount} sur 5 activés)`
                  : `Kontwòl Rapid Kanal Peman yo (${enabledChannelsCount} sou 5 seleksyone)`}
              </h4>
              <p className="text-[11px] text-slate-400">
                {isEs
                  ? 'Cada interruptor se guarda automáticamente y se sincroniza con Cloud Firestore.'
                  : isEn
                  ? 'Toggle switches save immediately and sync to Cloud Firestore.'
                  : isFr
                  ? 'Chaque bascule est enregistrée automatiquement et synchronisée.'
                  : 'Chak chanjman sou kaz seleksyon yo sove otomatikman e senkwonize ak Cloud Firestore.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleEnableConfiguredChannelsOnly}
              className="px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {isEs
                  ? 'Activar Canales con Datos'
                  : isEn
                  ? 'Enable Configured Only'
                  : isFr
                  ? 'Activer Canaux Remplis'
                  : 'Seleksyone Kanal ki gen Done yo'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleUnselectAllChannels}
              disabled={enabledChannelsCount === 0}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>
                {isEs ? 'Desactivar Todos' : isEn ? 'Disable All' : isFr ? 'Tout Désactiver' : 'Deseleksyone Tout'}
              </span>
            </button>
          </div>
        </div>

        {/* 4. Payment Channels Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* PAYPAL */}
          <div
            className={`p-6 rounded-3xl border transition-all space-y-4 ${
              config.paypalEnabled
                ? 'bg-slate-900/95 border-blue-500/40'
                : 'bg-slate-900/50 border-slate-800/80 opacity-80'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-sm text-white">PayPal</h4>
                    <span className="text-slate-600">·</span>
                    {renderChannelStatusText(config.paypalEnabled, hasPaypalDetails)}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {isEs ? 'Pagos internacionales por correo o PayPal.Me' : isEn ? 'International donations via email or PayPal.Me' : isFr ? 'Paiements internationaux par e-mail ou PayPal.Me' : 'Peman entènasyonal pa imèl oswa PayPal.Me'}
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={config.paypalEnabled}
                  onChange={(e) => handleChange('paypalEnabled', e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-blue-500 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-300">
                  {config.paypalEnabled ? selectedLabel : unselectedLabel}
                </span>
              </label>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">
                  {isEs ? 'Correo PayPal' : isEn ? 'PayPal Account Email' : isFr ? 'E-mail Compte PayPal' : 'Imèl Kont PayPal'}
                </label>
                <input
                  type="email"
                  value={config.paypalEmail}
                  onChange={(e) => handleChange('paypalEmail', e.target.value)}
                  placeholder="paypal@example.com"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1 flex items-center gap-1">
                  <LinkIcon className="w-3 h-3" />
                  <span>{isEs ? 'Enlace directo PayPal.Me (Opcional)' : isEn ? 'Direct PayPal.Me URL (Optional)' : isFr ? 'Lien direct PayPal.Me (Optionnel)' : 'Lyen dirèk PayPal.Me (Opsyonèl)'}</span>
                </label>
                <input
                  type="text"
                  value={config.paypalMeUrl}
                  onChange={(e) => handleChange('paypalMeUrl', e.target.value)}
                  placeholder="https://paypal.me/..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>
          </div>

          {/* BINANCE CRYPTO */}
          <div
            className={`p-6 rounded-3xl border transition-all space-y-4 ${
              config.binanceEnabled
                ? 'bg-slate-900/95 border-amber-500/40'
                : 'bg-slate-900/50 border-slate-800/80 opacity-80'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-sm text-white">Binance Pay / USDT</h4>
                    <span className="text-slate-600">·</span>
                    {renderChannelStatusText(config.binanceEnabled, hasBinanceDetails)}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {isEs ? 'Cripto sin comisiones o billetera USDT' : isEn ? 'Zero-fee Binance Pay or USDT wallet' : isFr ? 'Crypto sans frais ou portefeuille USDT' : 'Kripto monè san frè oswa USDT'}
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={config.binanceEnabled}
                  onChange={(e) => handleChange('binanceEnabled', e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-300">
                  {config.binanceEnabled ? selectedLabel : unselectedLabel}
                </span>
              </label>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Binance Pay ID (UID)</label>
                  <input
                    type="text"
                    value={config.binancePayId}
                    onChange={(e) => handleChange('binancePayId', e.target.value)}
                    placeholder="Binance Pay ID..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-amber-300 font-mono text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">
                    {isEs ? 'Red (Network)' : isEn ? 'Network' : isFr ? 'Réseau (Network)' : 'Rezo (Network)'}
                  </label>
                  <input
                    type="text"
                    value={config.binanceNetwork}
                    onChange={(e) => handleChange('binanceNetwork', e.target.value)}
                    placeholder="TRC20 / BEP20"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  {isEs ? 'Dirección Wallet USDT' : isEn ? 'USDT Wallet Address' : isFr ? 'Adresse Wallet USDT' : 'Adrès Wallet USDT'}
                </label>
                <input
                  type="text"
                  value={config.binanceUsdtAddress}
                  onChange={(e) => handleChange('binanceUsdtAddress', e.target.value)}
                  placeholder="T..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* WISE */}
          <div
            className={`p-6 rounded-3xl border transition-all space-y-4 ${
              config.wiseEnabled
                ? 'bg-slate-900/95 border-emerald-500/40'
                : 'bg-slate-900/50 border-slate-800/80 opacity-80'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-sm text-white">Wise (TransferWise)</h4>
                    <span className="text-slate-600">·</span>
                    {renderChannelStatusText(config.wiseEnabled, hasWiseDetails)}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {isEs ? 'Transferencias internacionales rápidas (USD / EUR / CAD)' : isEn ? 'Fast international transfers (USD / EUR / CAD)' : isFr ? 'Transferts internationaux rapides (USD / EUR / CAD)' : 'Transfè entènasyonal rapid (USD / EUR / CAD)'}
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={config.wiseEnabled}
                  onChange={(e) => handleChange('wiseEnabled', e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-300">
                  {config.wiseEnabled ? selectedLabel : unselectedLabel}
                </span>
              </label>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">
                    {isEs ? 'Correo Wise' : isEn ? 'Wise Email' : isFr ? 'E-mail Wise' : 'Imèl Kont Wise'}
                  </label>
                  <input
                    type="email"
                    value={config.wiseEmail}
                    onChange={(e) => handleChange('wiseEmail', e.target.value)}
                    placeholder="wise@example.com"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Wisetag (@)</label>
                  <input
                    type="text"
                    value={config.wiseTag}
                    onChange={(e) => handleChange('wiseTag', e.target.value)}
                    placeholder="@..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-emerald-300 font-mono text-xs focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  {isEs ? 'IBAN / Número de Cuenta (Opcional)' : isEn ? 'IBAN / Account / Routing (Optional)' : isFr ? 'IBAN / Numéro de Compte (Optionnel)' : 'Nimewo Kont / IBAN / Routing (Opsyonèl)'}
                </label>
                <input
                  type="text"
                  value={config.wiseIban}
                  onChange={(e) => handleChange('wiseIban', e.target.value)}
                  placeholder="IBAN / Routing..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>
          </div>

          {/* MONCASH / LOCAL MOBILE MONEY */}
          <div
            className={`p-6 rounded-3xl border transition-all space-y-4 ${
              config.moncashEnabled
                ? 'bg-slate-900/95 border-rose-500/40'
                : 'bg-slate-900/50 border-slate-800/80 opacity-80'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-sm text-white">MonCash / Natcash</h4>
                    <span className="text-slate-600">·</span>
                    {renderChannelStatusText(config.moncashEnabled, hasMoncashDetails)}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {isEs ? 'Dinero móvil local en Haití' : isEn ? 'Local Haiti mobile money transfer' : isFr ? 'Transfert mobile local en Haïti' : 'Transfè mobil lokal pou legliz an Ayiti'}
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={config.moncashEnabled}
                  onChange={(e) => handleChange('moncashEnabled', e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-rose-500 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-300">
                  {config.moncashEnabled ? selectedLabel : unselectedLabel}
                </span>
              </label>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">
                  {isEs ? 'Número MonCash / Natcash' : isEn ? 'MonCash / Natcash Number' : isFr ? 'Numéro MonCash / Natcash' : 'Nimewo Telefòn MonCash / Natcash'}
                </label>
                <input
                  type="text"
                  value={config.moncashNumber}
                  onChange={(e) => handleChange('moncashNumber', e.target.value)}
                  placeholder="+509 ..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-rose-300 font-mono text-xs focus:outline-none focus:border-rose-400"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  {isEs ? 'Nombre del Titular' : isEn ? 'Account Holder Name' : isFr ? 'Nom du Titulaire' : 'Non sou Kont lan'}
                </label>
                <input
                  type="text"
                  value={config.moncashName}
                  onChange={(e) => handleChange('moncashName', e.target.value)}
                  placeholder="Jackson Charles"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-rose-400"
                />
              </div>
            </div>
          </div>

          {/* ZELLE / BANK TRANSFER */}
          <div
            className={`p-6 rounded-3xl border transition-all space-y-4 lg:col-span-2 ${
              config.zelleEnabled
                ? 'bg-slate-900/95 border-purple-500/40'
                : 'bg-slate-900/50 border-slate-800/80 opacity-80'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-sm text-white">
                      {isEs ? 'Zelle / Transferencia Bancaria Directa' : isEn ? 'Zelle / Direct Bank Transfer' : isFr ? 'Zelle / Virement Bancaire Direct' : 'Zelle / Viman Bankè Dirèk'}
                    </h4>
                    <span className="text-slate-600">·</span>
                    {renderChannelStatusText(config.zelleEnabled, hasZelleDetails)}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {isEs ? 'Datos de Zelle (EE.UU.) o cuenta bancaria directa' : isEn ? 'US Zelle details or direct bank account info' : isFr ? 'Coordonnées Zelle (US) ou compte bancaire direct' : 'Enfòmasyon Zelle (US) oswa kont labank dirèk'}
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={config.zelleEnabled}
                  onChange={(e) => handleChange('zelleEnabled', e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-purple-500 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-300">
                  {config.zelleEnabled ? selectedLabel : unselectedLabel}
                </span>
              </label>
            </div>

            <div className="text-xs">
              <label className="text-slate-400 block mb-1">
                {isEs ? 'Datos de Zelle o Cuenta Bancaria' : isEn ? 'Zelle or Bank Account Details' : isFr ? 'Coordonnées Zelle ou Compte Bancaire' : 'Enfòmasyon Zelle oswa Kont Labank'}
              </label>
              <input
                type="text"
                value={config.zelleInfo}
                onChange={(e) => handleChange('zelleInfo', e.target.value)}
                placeholder="zelle@example.com / Bank..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
              />
            </div>
          </div>
        </div>

        {/* 5. Android Mobile Kotlin Sync Prompt Box */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">
                  {isEs
                    ? 'Prompt Sincronización Android Kotlin (4 Idiomas + Header Donate + Pantalla Completa)'
                    : isEn
                    ? 'Android Kotlin Sync Prompt (4 Languages + Header Donate + Full Screen)'
                    : isFr
                    ? 'Prompt Synchronisation Android Kotlin (4 Langues + Bouton Header + Écran Complet)'
                    : 'Prompt Senkronizasyon Android Kotlin (4 Lang + Bouton Header + Ekran Konplè)'}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isEs
                    ? 'Copia este prompt para sincronizar los 4 idiomas (HT/FR/EN/ES), la animación shake y la pantalla completa en Android.'
                    : isEn
                    ? 'Copy this prompt to synchronize all 4 languages (HT/FR/EN/ES), the header shake button, and full Donate screen on Android.'
                    : isFr
                    ? 'Copiez ce prompt pour synchroniser les 4 langues (HT/FR/EN/ES), le bouton animé et l’écran complet sur Android.'
                    : 'Kopye prompt sa a pou senkwonize tout 4 lang yo (HT/FR/EN/ES), bouton imaj lò a ak animasyon shake, epi nouvo ekran Donate la sou Android.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              id="btn-copy-android-donate-prompt"
              onClick={handleCopyAndroidPrompt}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs inline-flex items-center gap-2 shrink-0 transition-colors cursor-pointer whitespace-nowrap"
            >
              {copiedPrompt ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>
                    {isEs ? '¡Prompt Copiado!' : isEn ? 'Prompt Copied!' : isFr ? 'Prompt Copié !' : 'Prompt Kopye!'}
                  </span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>
                    {isEs ? 'Copiar Prompt Móvil' : isEn ? 'Copy Mobile Prompt' : isFr ? 'Copier Prompt Mobile' : 'Kopye Prompt Mobil la'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/95 border border-slate-800 sticky bottom-4 shadow-2xl">
          <div className="text-xs text-slate-400">
            {savedSuccess ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {isEs
                  ? '¡Guardado y sincronizado en los 4 idiomas con Cloud Firestore!'
                  : isEn
                  ? 'Saved and synced across all 4 languages with Cloud Firestore!'
                  : isFr
                  ? 'Enregistré et synchronisé dans les 4 langues sur Cloud Firestore !'
                  : 'Konfigirasyon 4 lang yo sove epi senkwonize ak Cloud Firestore!'}
              </span>
            ) : (
              <span>
                {isEs
                  ? 'Se guarda en '
                  : isEn
                  ? 'Synced to '
                  : isFr
                  ? 'Synchronisé dans '
                  : 'Chwa ou yo sove nan '}
                <code className="font-mono text-slate-300">app_config/developer_engine</code> (HT · FR · EN · ES).
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 cursor-pointer transition-all disabled:opacity-50 whitespace-nowrap"
          >
            <Save className="w-4 h-4" />
            <span>
              {isSaving
                ? isEs
                  ? 'Guardando y Sincronizando...'
                  : isEn
                  ? 'Saving & Syncing...'
                  : isFr
                  ? 'Enregistrement...'
                  : 'Ap Sove & Senkwonize...'
                : isEs
                ? 'Guardar y Sincronizar Donaciones'
                : isEn
                ? 'Save & Sync Donations'
                : isFr
                ? 'Enregistrer & Synchroniser'
                : 'Anrejistre & Senkwonize Donasyon'}
            </span>
          </button>
        </div>
      </form>

      {/* Dedicated Full-Screen Preview with 4-Language Live Switcher */}
      {showPreviewScreen && (
        <div className="fixed inset-0 z-50 bg-[#0F172A] overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 animate-in fade-in duration-150">
          <div className="max-w-5xl mx-auto mb-3 flex items-center justify-between gap-2 flex-wrap px-1">
            <span className="text-xs text-slate-400 font-medium">
              {isEs
                ? 'Probar vista en idioma:'
                : isEn
                ? 'Preview language:'
                : isFr
                ? 'Tester la langue :'
                : 'Teste ekran an nan lang:'}
            </span>
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
              {LANG_OPTIONS.map((langOpt) => (
                <button
                  key={langOpt.code}
                  type="button"
                  onClick={() => setPreviewLang(langOpt.code)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    previewLang === langOpt.code
                      ? 'bg-amber-400 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {langOpt.short} · {langOpt.label}
                </button>
              ))}
            </div>
          </div>
          <DonationScreen
            onBack={() => setShowPreviewScreen(false)}
            language={previewLang}
            customConfig={config}
            isPreview
          />
        </div>
      )}
    </div>
  );
};
