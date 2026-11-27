import React, { useState, useEffect } from 'react';
import {
  DeveloperSettings,
  DeveloperShareAppConfig,
  Language,
  LocalizedShareAppCopy,
} from '../../types';
import {
  buildFormattedShareAppPreview,
  DEFAULT_LOCALIZED_SHARE_APP_COPY,
  DEFAULT_SHARE_APP_CONFIG,
  OFFICIAL_SHARE_APP_URL,
  resolveEffectiveShareAppUrl,
  sanitizeShareAppConfig,
  verifyAndPushShareAppToCloud,
} from '../../utils/developerStorage';
import { useToast } from '../../context/ToastContext';
import {
  Share2,
  Globe,
  Smartphone,
  Languages,
  Save,
  CloudUpload,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RotateCcw,
  MessageCircle,
  Sparkles,
  ExternalLink,
  Link as LinkIcon,
  Building2,
} from 'lucide-react';

export interface DevShareAppTabProps {
  settings: DeveloperSettings;
  onUpdateSettings: (updated: Partial<DeveloperSettings>) => Promise<void>;
  language?: Language;
  sampleChurchName?: string;
}

const LANG_TABS: { code: Language; label: string; flag: string }[] = [
  { code: 'ht', label: 'HT - Kreyòl', flag: '🇭🇹' },
  { code: 'fr', label: 'FR - Français', flag: '🇫🇷' },
  { code: 'en', label: 'EN - English', flag: '🇺🇸' },
  { code: 'es', label: 'ES - Español', flag: '🇪🇸' },
];

export const DevShareAppTab: React.FC<DevShareAppTabProps> = ({
  settings,
  onUpdateSettings,
  language = 'ht',
  sampleChurchName,
}) => {
  const toast = useToast();
  const isEs = language === 'es';
  const isFr = language === 'fr';
  const isEn = language === 'en';

  const [shareDraft, setShareDraft] = useState<DeveloperShareAppConfig>(() =>
    sanitizeShareAppConfig(settings.shareApp)
  );
  const [activeLangTab, setActiveLangTab] = useState<Language>(language || 'ht');
  const [previewPlatform, setPreviewPlatform] = useState<'web' | 'android'>('android');
  const [previewMode, setPreviewMode] = useState<'church_invite' | 'general_app' | 'content_footer'>(
    'church_invite'
  );
  const [previewChurchName, setPreviewChurchName] = useState<string>(
    sampleChurchName || 'Legliz Evanjelik La Rezirèksyon'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedPlaceholder, setCopiedPlaceholder] = useState<string | null>(null);
  const [copiedPreview, setCopiedPreview] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setShareDraft(sanitizeShareAppConfig(settings.shareApp));
  }, [settings.shareApp]);

  const currentLangCopy: LocalizedShareAppCopy =
    shareDraft.localizedCopy?.[activeLangTab] || DEFAULT_LOCALIZED_SHARE_APP_COPY[activeLangTab];

  const handleUpdateLangField = (field: keyof LocalizedShareAppCopy, value: string) => {
    setShareDraft((prev) => ({
      ...prev,
      localizedCopy: {
        ...prev.localizedCopy,
        [activeLangTab]: {
          ...(prev.localizedCopy?.[activeLangTab] ||
            DEFAULT_LOCALIZED_SHARE_APP_COPY[activeLangTab]),
          [field]: value,
        },
      },
    }));
  };

  const handleResetActiveLanguage = () => {
    const fallback = DEFAULT_LOCALIZED_SHARE_APP_COPY[activeLangTab];
    setShareDraft((prev) => ({
      ...prev,
      localizedCopy: {
        ...prev.localizedCopy,
        [activeLangTab]: { ...fallback },
      },
    }));
    toast.info(
      isEs
        ? `Idioma ${activeLangTab.toUpperCase()} restablecido`
        : isFr
          ? `Langue ${activeLangTab.toUpperCase()} réinitialisée`
          : isEn
            ? `${activeLangTab.toUpperCase()} copy reset`
            : `Tèks ${activeLangTab.toUpperCase()} reyinisyalize`,
      isEs
        ? 'Se restauraron los textos predeterminados para este idioma.'
        : isFr
          ? 'Les textes par défaut de cette langue ont été restaurés.'
          : isEn
            ? 'Default share copy restored for this language.'
            : 'Tèks pataj pa defo pou lang sa a retounen.'
    );
  };

  const handleCopyPlaceholder = (token: '{church}' | '{url}') => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(token).catch(() => {});
    }
    setCopiedPlaceholder(token);
    toast.info(
      isEs ? 'Marcador copiado' : isFr ? 'Variable copiée' : isEn ? 'Placeholder copied' : 'Varyab kopye',
      `${token}`
    );
    setTimeout(() => setCopiedPlaceholder(null), 1800);
  };

  const handleSaveShareApp = async () => {
    setIsSaving(true);
    setCloudStatus(null);
    try {
      const cleaned = sanitizeShareAppConfig({
        ...shareDraft,
        lastUpdatedAt: new Date().toISOString(),
      });
      setShareDraft(cleaned);
      await onUpdateSettings({ shareApp: cleaned });
      const pushRes = await verifyAndPushShareAppToCloud(
        { ...settings, shareApp: cleaned },
        cleaned
      );

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);

      if (pushRes.syncedToCloud && pushRes.remoteVerified) {
        const msg = isEs
          ? 'Sincronizado y verificado en Cloud Firestore (app_config/developer_engine -> shareApp).'
          : isFr
            ? 'Synchronisé et vérifié dans Cloud Firestore (app_config/developer_engine -> shareApp).'
            : isEn
              ? 'Synced and verified in Cloud Firestore (app_config/developer_engine -> shareApp).'
              : 'Senkronize e verifye an tan reyèl nan Cloud Firestore (app_config/developer_engine -> shareApp).';
        setCloudStatus({ ok: true, text: msg });
      } else if (pushRes.syncedToCloud) {
        const msg = isEs
          ? 'Enviado a Cloud Firestore (app_config/developer_engine -> shareApp).'
          : isFr
            ? 'Envoyé vers Cloud Firestore (app_config/developer_engine -> shareApp).'
            : isEn
              ? 'Pushed to Cloud Firestore (app_config/developer_engine -> shareApp).'
              : 'Pouse nan Cloud Firestore (app_config/developer_engine -> shareApp).';
        setCloudStatus({ ok: true, text: msg });
      } else {
        const msg = isEs
          ? 'Guardado localmente. Inicie sesión con la cuenta Super Developer de Google para sincronizar con Firestore.'
          : isFr
            ? 'Enregistré localement. Connectez le compte Google Super Developer pour synchroniser avec Firestore.'
            : isEn
              ? 'Saved locally. Sign in with the Super Developer Google account to push to Cloud Firestore.'
              : 'Sove lokalman. Konekte ak kont Google Super Developer la pou pouse l sou Cloud Firestore.';
        setCloudStatus({ ok: false, text: msg });
      }
    } catch (err: any) {
      toast.error(
        isEs ? 'Error al guardar' : isFr ? 'Erreur de sauvegarde' : isEn ? 'Save error' : 'Erè sovgad',
        err?.message || 'Could not save shareApp configuration.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const previewData = buildFormattedShareAppPreview(shareDraft, {
    language: activeLangTab,
    churchName: previewChurchName,
    isAndroid: previewPlatform === 'android',
    mode: previewMode,
  });

  const effectiveWebUrl = resolveEffectiveShareAppUrl(shareDraft, false);
  const effectiveAndroidUrl = resolveEffectiveShareAppUrl(shareDraft, true);
  const hasCustomAndroidOverride = Boolean(shareDraft.androidUrl && shareDraft.androidUrl.trim());

  const handleCopyPreviewMessage = async () => {
    try {
      await navigator.clipboard.writeText(previewData.fullText);
      setCopiedPreview(true);
      toast.success(
        isEs ? 'Mensaje de vista previa copiado' : isFr ? 'Message d’aperçu copié' : isEn ? 'Preview message copied' : 'Mesaj apèsi a kopye!',
        previewData.effectiveUrl
      );
      setTimeout(() => setCopiedPreview(false), 2200);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* HEADER BANNER */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-950/60 via-[#0F172A] to-[#0B1120] border border-emerald-500/30 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  {isEs
                    ? 'Motor de Compartir App y Enlaces de Referencia'
                    : isFr
                      ? 'Moteur de Partage d’Application & Liens de Parrainage'
                      : isEn
                        ? 'Share App & Referral Link Engine'
                        : 'Sistèm Pataj Aplikasyon & Lyen (Share App Engine)'}
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider border ${
                    shareDraft.enabled
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}
                >
                  {shareDraft.enabled
                    ? isEs
                      ? 'ACTIVO'
                      : isFr
                        ? 'ACTIF'
                        : isEn
                          ? 'ENABLED'
                          : 'AKTIF'
                    : isEs
                      ? 'PAUSADO'
                      : isFr
                        ? 'DÉSACTIVÉ'
                        : isEn
                          ? 'DISABLED'
                          : 'DEZAKTIVE'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                {isEs
                  ? 'Sincronizado en tiempo real con Cloud Firestore (app_config/developer_engine -> shareApp) en los 4 idiomas (HT, FR, EN, ES) para Web y Android.'
                  : isFr
                    ? 'Synchronisé en temps réel avec Cloud Firestore (app_config/developer_engine -> shareApp) dans les 4 langues (HT, FR, EN, ES) pour Web et Android.'
                    : isEn
                      ? 'Synchronized in real time with Cloud Firestore (app_config/developer_engine -> shareApp) across all 4 languages (HT, FR, EN, ES) for Web and Android.'
                      : 'Senkronize an tan reyèl ak Cloud Firestore (app_config/developer_engine -> shareApp) nan tout 4 lang yo (HT, FR, EN, ES) pou Web ak Android.'}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2.5 text-[11px] font-mono text-slate-400">
                <span className="px-2 py-0.5 rounded-lg bg-slate-900/90 border border-slate-800 text-emerald-300">
                  Firestore: app_config/developer_engine → shareApp
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-slate-900/90 border border-slate-800 text-amber-300">
                  Web: {effectiveWebUrl}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-slate-900/90 border border-slate-800 text-sky-300">
                  Android: {effectiveAndroidUrl}{' '}
                  {hasCustomAndroidOverride ? '(Override)' : '(Fallback -> shareUrl)'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Master Toggle */}
            <label
              htmlFor="dev-share-app-enabled-toggle"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border cursor-pointer select-none transition-all ${
                shareDraft.enabled
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <input
                id="dev-share-app-enabled-toggle"
                type="checkbox"
                checked={shareDraft.enabled}
                onChange={(e) =>
                  setShareDraft((prev) => ({
                    ...prev,
                    enabled: e.target.checked,
                  }))
                }
                className="w-4 h-4 accent-emerald-400 rounded cursor-pointer"
              />
              <span className="text-xs font-extrabold">
                {shareDraft.enabled
                  ? isEs
                    ? 'Compartir App Habilitado'
                    : isFr
                      ? 'Partage App Activé'
                      : isEn
                        ? 'Share App Enabled'
                        : 'Pataj App Aktive'
                  : isEs
                    ? 'Compartir App Desactivado'
                    : isFr
                      ? 'Partage App Désactivé'
                      : isEn
                        ? 'Share App Disabled'
                        : 'Pataj App Dezaktive'}
              </span>
            </label>

            {/* Save & Sync Button */}
            <button
              type="button"
              id="dev-save-share-app-btn"
              onClick={handleSaveShareApp}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50 transition-all"
            >
              {isSaving ? (
                <CloudUpload className="w-4 h-4 animate-bounce" />
              ) : savedSuccess ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>
                {isSaving
                  ? isEs
                    ? 'Sincronizando...'
                    : isFr
                      ? 'Synchronisation...'
                      : isEn
                        ? 'Syncing...'
                        : 'Ap Senkronize...'
                  : savedSuccess
                    ? isEs
                      ? '¡Guardado en Firestore!'
                      : isFr
                        ? 'Enregistré dans Firestore !'
                        : isEn
                          ? 'Saved to Firestore!'
                          : 'Sove nan Firestore!'
                    : isEs
                      ? 'Guardar y Sincronizar shareApp'
                      : isFr
                        ? 'Enregistrer & Synchroniser shareApp'
                        : isEn
                          ? 'Save & Sync shareApp'
                          : 'Sove & Senkronize shareApp'}
              </span>
            </button>
          </div>
        </div>

        {cloudStatus && (
          <div
            className={`mt-4 p-3 rounded-2xl border text-xs flex items-center gap-2.5 ${
              cloudStatus.ok
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
          >
            {cloudStatus.ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>{cloudStatus.text}</span>
          </div>
        )}
      </div>

      {/* MAIN GRID: LEFT = URLS & 4-LANGUAGE COPY EDITOR | RIGHT = LIVE WHATSAPP / MOBILE SHARE PREVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN (7 COLS): URL INPUTS & 4-LANGUAGE FORM */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. URL CONFIGURATION CARD */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[#1E293B] border border-slate-800 space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <LinkIcon className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-extrabold text-white">
                  {isEs
                    ? '1. Enlaces Oficiales de Descarga y Redirección'
                    : isFr
                      ? '1. Liens Officiels de Téléchargement & Redirection'
                      : isEn
                        ? '1. Official Referral & Download URLs'
                        : '1. Lyen Ofisyèl Pataj & Telechajman (Web & Android)'}
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                shareUrl / androidUrl
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* General Web / Universal Link (shareUrl) */}
              <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800/90 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="dev-share-app-url-input"
                    className="text-xs font-bold text-slate-200 flex items-center gap-1.5"
                  >
                    <Globe className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {isEs
                        ? 'Enlace General Web / Universal (shareUrl)'
                        : isFr
                          ? 'Lien Général Web / Universel (shareUrl)'
                          : isEn
                            ? 'General Web / Universal Link (shareUrl)'
                            : 'Lyen Jeneral Web / Inivèsèl (shareUrl)'}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setShareDraft((prev) => ({
                        ...prev,
                        shareUrl: OFFICIAL_SHARE_APP_URL,
                      }))
                    }
                    className="text-[10px] font-mono text-amber-300 hover:underline cursor-pointer"
                  >
                    Default: {OFFICIAL_SHARE_APP_URL}
                  </button>
                </div>
                <input
                  id="dev-share-app-url-input"
                  type="url"
                  value={shareDraft.shareUrl}
                  onChange={(e) =>
                    setShareDraft((prev) => ({
                      ...prev,
                      shareUrl: e.target.value,
                    }))
                  }
                  placeholder="https://omnichurch.download"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-emerald-400"
                />
                <p className="text-[11px] text-slate-400">
                  {isEs
                    ? 'Enlace principal utilizado en Web y como respaldo automático en Android cuando androidUrl está vacío.'
                    : isFr
                      ? 'Lien principal utilisé sur le Web et comme lien de secours automatique sur Android lorsque androidUrl est vide.'
                      : isEn
                        ? 'Primary link used on Web and as automatic fallback on Android whenever androidUrl is empty.'
                        : 'Lyen prensipal ki itilize sou Web epi kòm fallback otomatik sou Android lè androidUrl vid.'}
                </p>
              </div>

              {/* Optional Android Override Link (androidUrl) */}
              <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800/90 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="dev-share-android-url-input"
                    className="text-xs font-bold text-slate-200 flex items-center gap-1.5"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                    <span>
                      {isEs
                        ? 'Enlace Específico para Android (androidUrl — Opcional)'
                        : isFr
                          ? 'Lien Spécifique Android (androidUrl — Optionnel)'
                          : isEn
                            ? 'Android Override Link (androidUrl — Optional)'
                            : 'Lyen Espesyal Android (androidUrl — Opsyonèl)'}
                    </span>
                  </label>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      hasCustomAndroidOverride
                        ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {hasCustomAndroidOverride
                      ? isEn
                        ? 'Active Override'
                        : 'Override Aktif'
                      : isEn
                        ? 'Using shareUrl Fallback'
                        : 'Itilize shareUrl pa defo'}
                  </span>
                </div>
                <input
                  id="dev-share-android-url-input"
                  type="url"
                  value={shareDraft.androidUrl}
                  onChange={(e) =>
                    setShareDraft((prev) => ({
                      ...prev,
                      androidUrl: e.target.value,
                    }))
                  }
                  placeholder="https://play.google.com/store/apps/details?id=com.zoutiw.omnichurch (oswa kite vid)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-sky-400"
                />
                <p className="text-[11px] text-slate-400">
                  {isEs
                    ? 'URL de Google Play Store o descarga directa APK. Si se llena, la app Android usará androidUrl; si está vacío, usará shareUrl.'
                    : isFr
                      ? 'URL Google Play Store ou téléchargement direct APK. Si renseigné, l’application Android utilisera androidUrl ; sinon elle utilisera shareUrl.'
                      : isEn
                        ? 'Google Play Store URL or direct APK download link. When non-empty, the Android app uses androidUrl; otherwise it falls back to shareUrl.'
                        : 'Lyen Google Play Store oswa APK dirèk. Lè li ranpli, app Android la itilize androidUrl; si li vid, li tonbe otomatikman sou shareUrl.'}
                </p>
              </div>
            </div>
          </div>

          {/* 2. 4-LANGUAGE LOCALIZED COPY EDITOR */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[#1E293B] border border-slate-800 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Languages className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-extrabold text-white">
                    {isEs
                      ? '2. Textos de Compartir por Idioma (localizedCopy)'
                      : isFr
                        ? '2. Textes de Partage Multilingues (localizedCopy)'
                        : isEn
                          ? '2. Multilingual Share Copy (localizedCopy)'
                          : '2. Tèks Pataj nan 4 Lang yo (localizedCopy)'}
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isEs
                    ? 'Personalice el encabezado, plantilla de iglesia, mensaje, pie de página y título del selector para cada idioma.'
                    : isFr
                      ? 'Personnalisez l’en-tête, le modèle d’église, le message, le pied de page et le titre du sélecteur pour chaque langue.'
                      : isEn
                        ? 'Customize header, church template, body message, content footer label, and chooser title per language.'
                        : 'Modifye tit jeneral la, modèl legliz la, mesaj la, siyati anba a ak tit meni pataj la pou chak lang.'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleResetActiveLanguage}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {isEs
                    ? `Restablecer ${activeLangTab.toUpperCase()}`
                    : isFr
                      ? `Réinitialiser ${activeLangTab.toUpperCase()}`
                      : isEn
                        ? `Reset ${activeLangTab.toUpperCase()} Default`
                        : `Reyinisyalize ${activeLangTab.toUpperCase()}`}
                </span>
              </button>
            </div>

            {/* 4-Language Switcher Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {LANG_TABS.map((tab) => {
                const isActive = activeLangTab === tab.code;
                return (
                  <button
                    key={tab.code}
                    type="button"
                    id={`dev-share-lang-tab-${tab.code}`}
                    onClick={() => setActiveLangTab(tab.code)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all border ${
                      isActive
                        ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md shadow-amber-400/20'
                        : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span>{tab.flag}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Dynamic Placeholders Helper Badges */}
            <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-amber-500/25 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-bold">
                  {isEs
                    ? 'Marcadores dinámicos soportados:'
                    : isFr
                      ? 'Variables dynamiques supportées :'
                      : isEn
                        ? 'Supported dynamic placeholders:'
                        : 'Varyab dinamik ki sipòte (klike pou kopye):'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyPlaceholder('{church}')}
                  className="px-2.5 py-1 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/35 text-amber-300 font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  title={
                    isEn
                      ? 'Replaced automatically with the active church name'
                      : 'Ranplase otomatikman ak non legliz aktif la'
                  }
                >
                  <span>{'{church}'}</span>
                  {copiedPlaceholder === '{church}' ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3 opacity-80" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyPlaceholder('{url}')}
                  className="px-2.5 py-1 rounded-lg bg-sky-400/15 hover:bg-sky-400/25 border border-sky-400/35 text-sky-300 font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  title={
                    isEn
                      ? 'Replaced automatically with the effective share URL (androidUrl or shareUrl)'
                      : 'Ranplase otomatikman ak lyen pataj aktif la (androidUrl oswa shareUrl)'
                  }
                >
                  <span>{'{url}'}</span>
                  {copiedPlaceholder === '{url}' ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3 opacity-80" />
                  )}
                </button>
              </div>
            </div>

            {/* 5 Localized Fields */}
            <div className="space-y-4">
              {/* Field 1: header */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-200">
                    {isEs
                      ? 'Encabezado General (header)'
                      : isFr
                        ? 'En-tête Général (header)'
                        : isEn
                          ? 'General App Header (header)'
                          : 'Tit Jeneral Aplikasyon an (header)'}
                  </label>
                  <span className="font-mono text-[10px] text-slate-400">
                    localizedCopy.{activeLangTab}.header
                  </span>
                </div>
                <input
                  type="text"
                  value={currentLangCopy.header}
                  onChange={(e) => handleUpdateLangField('header', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Field 2: churchHeaderTemplate */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-200 flex items-center gap-1.5">
                    <span>
                      {isEs
                        ? 'Plantilla de Encabezado con Iglesia (churchHeaderTemplate)'
                        : isFr
                          ? 'Modèle d’En-tête avec Église (churchHeaderTemplate)'
                          : isEn
                            ? 'Church Invite Header Template (churchHeaderTemplate)'
                            : 'Modèl Tit Envbay Legliz la (churchHeaderTemplate)'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300 font-mono text-[10px]">
                      {'{church}'}
                    </span>
                  </label>
                  <span className="font-mono text-[10px] text-slate-400">
                    localizedCopy.{activeLangTab}.churchHeaderTemplate
                  </span>
                </div>
                <input
                  type="text"
                  value={currentLangCopy.churchHeaderTemplate}
                  onChange={(e) => handleUpdateLangField('churchHeaderTemplate', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Field 3: message */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-200">
                    {isEs
                      ? 'Mensaje Descriptivo Principal (message)'
                      : isFr
                        ? 'Message Descriptif Principal (message)'
                        : isEn
                          ? 'Main Referral Message Body (message)'
                          : 'Mesaj Deskripsyon Prensipal la (message)'}
                  </label>
                  <span className="font-mono text-[10px] text-slate-400">
                    localizedCopy.{activeLangTab}.message
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={currentLangCopy.message}
                  onChange={(e) => handleUpdateLangField('message', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs leading-relaxed focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Field 4: contentFooterLabel */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-200">
                    {isEs
                      ? 'Etiqueta de Pie de Página en Publicaciones (contentFooterLabel)'
                      : isFr
                        ? 'Signature de Pied de Page des Publications (contentFooterLabel)'
                        : isEn
                          ? 'Shared Content Footer Label (contentFooterLabel)'
                          : 'Siyati Anba Anons & Sèvis Pataje yo (contentFooterLabel)'}
                  </label>
                  <span className="font-mono text-[10px] text-slate-400">
                    localizedCopy.{activeLangTab}.contentFooterLabel
                  </span>
                </div>
                <input
                  type="text"
                  value={currentLangCopy.contentFooterLabel}
                  onChange={(e) => handleUpdateLangField('contentFooterLabel', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Field 5: chooserTitle */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-200">
                    {isEs
                      ? 'Título del Selector Nativo Android/iOS (chooserTitle)'
                      : isFr
                        ? 'Titre du Sélecteur Natif Android/iOS (chooserTitle)'
                        : isEn
                          ? 'Native Share Sheet Chooser Title (chooserTitle)'
                          : 'Tit Fèy Pataj Telefòn nan (chooserTitle)'}
                  </label>
                  <span className="font-mono text-[10px] text-slate-400">
                    localizedCopy.{activeLangTab}.chooserTitle
                  </span>
                </div>
                <input
                  type="text"
                  value={currentLangCopy.chooserTitle}
                  onChange={(e) => handleUpdateLangField('chooserTitle', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (5 COLS): LIVE WHATSAPP & MOBILE SHARE SHEET PREVIEW CARD */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-5 sm:p-6 rounded-3xl bg-[#1E293B] border border-slate-800 space-y-4 sticky top-24">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-extrabold text-white">
                  {isEs
                    ? 'Vista Previa en Vivo (WhatsApp / Móvil)'
                    : isFr
                      ? 'Aperçu en Direct (WhatsApp / Mobile)'
                      : isEn
                        ? 'Live WhatsApp / Share Preview'
                        : 'Apèsi an Dirèk (WhatsApp & Fèy Pataj Mobil)'}
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-amber-400/15 text-amber-300 font-mono text-[10px] font-bold uppercase">
                {activeLangTab.toUpperCase()}
              </span>
            </div>

            {/* Preview Controls: Platform & Mode & Sample Church */}
            <div className="space-y-3">
              {/* Platform Toggle: Android vs Web */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewPlatform('android')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border transition-all ${
                    previewPlatform === 'android'
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Android App</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPlatform('web')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border transition-all ${
                    previewPlatform === 'web'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Web / Universal</span>
                </button>
              </div>

              {/* Scenario Mode Switcher */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreviewMode('church_invite')}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer border transition-all ${
                    previewMode === 'church_invite'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {isEn ? 'Church Invite' : 'Envitasyon Legliz'}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('general_app')}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer border transition-all ${
                    previewMode === 'general_app'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {isEn ? 'General App' : 'Pataj App Jeneral'}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('content_footer')}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer border transition-all ${
                    previewMode === 'content_footer'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {isEn ? 'Post Footer' : 'Anba Sèvis/Anons'}
                </button>
              </div>

              {/* Sample {church} Name Input */}
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px] font-mono text-slate-400 shrink-0">{'{church}'}:</span>
                <input
                  type="text"
                  value={previewChurchName}
                  onChange={(e) => setPreviewChurchName(e.target.value)}
                  placeholder="Nom legliz pou tès la..."
                  className="w-full bg-transparent text-xs text-white font-semibold focus:outline-none"
                />
              </div>
            </div>

            {/* Simulated Mobile Share Sheet + WhatsApp Bubble */}
            <div className="rounded-2xl bg-[#0B141A] border border-slate-800 overflow-hidden shadow-inner">
              {/* Native Android/iOS Chooser Header Bar */}
              <div className="px-4 py-2.5 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Share2 className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-bold text-slate-200">{previewData.chooserTitle}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">chooserTitle</span>
              </div>

              {/* WhatsApp Chat Wallpaper Area */}
              <div className="p-4 space-y-3 bg-gradient-to-b from-[#0B141A] to-[#111B21]">
                {/* Link Preview Card inside WhatsApp */}
                <div className="rounded-2xl rounded-tr-none bg-[#005C4B] text-white p-3.5 shadow-md space-y-2 border border-emerald-400/20">
                  <div className="p-2.5 rounded-xl bg-[#025144] border-l-4 border-amber-400 text-[11px] space-y-0.5">
                    <div className="font-extrabold text-amber-300 truncate">OmniChurch Pro</div>
                    <div className="text-emerald-100/80 font-mono text-[10px] truncate">
                      {previewData.effectiveUrl}
                    </div>
                  </div>

                  <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-slate-100">
                    {previewData.fullText}
                  </pre>

                  <div className="flex items-center justify-end gap-1 text-[10px] text-emerald-200/75 pt-1">
                    <span>12:45 PM</span>
                    <span>✓✓</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Effective URL Resolution Box */}
            <div className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 text-[11px] space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span>
                  {previewPlatform === 'android'
                    ? isEn
                      ? 'Resolved Android URL:'
                      : 'Lyen Android Rezoud la:'
                    : isEn
                      ? 'Resolved Web URL:'
                      : 'Lyen Web Rezoud la:'}
                </span>
                <span className="font-mono text-[10px] text-emerald-400">
                  {previewPlatform === 'android' && hasCustomAndroidOverride
                    ? 'shareApp.androidUrl'
                    : 'shareApp.shareUrl'}
                </span>
              </div>
              <div className="font-mono text-xs text-amber-300 break-all flex items-center justify-between gap-2">
                <span>{previewData.effectiveUrl}</span>
                <a
                  href={previewData.effectiveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-white shrink-0"
                  title="Open URL"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Copy Formatted Preview Button */}
            <button
              type="button"
              onClick={handleCopyPreviewMessage}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              {copiedPreview ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300">
                    {isEs
                      ? '¡Mensaje Copiado!'
                      : isFr
                        ? 'Message Copié !'
                        : isEn
                          ? 'Message Copied!'
                          : 'Mesaj Pataj la Kopye!'}
                  </span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-amber-400" />
                  <span>
                    {isEs
                      ? 'Copiar Mensaje de Vista Previa'
                      : isFr
                        ? 'Copier le Message d’Aperçu'
                        : isEn
                          ? 'Copy Formatted Share Message'
                          : 'Kopye Mesaj Apèsi a'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevShareAppTab;
