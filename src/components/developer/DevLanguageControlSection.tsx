import React, { useState, useEffect, useMemo } from 'react';
import {
  DeveloperLanguageConfig,
  DeveloperSettings,
  Language,
} from '../../types';
import {
  DEFAULT_LANGUAGE_CONFIG,
  sanitizeLanguageConfig,
  getDeviceDetectionContext,
  resolveInitialLanguageSync,
  detectGeoCountryAsync,
  getLanguageDisplayName,
} from '../../utils/languageDetection';
import { clearSavedLanguagePreference } from '../../utils/storage';
import { useToast } from '../../context/ToastContext';
import {
  Globe,
  Sparkles,
  Check,
  MapPin,
  Monitor,
  Wifi,
  RotateCcw,
  Save,
  Compass,
} from 'lucide-react';

export interface DevLanguageControlSectionProps {
  settings: DeveloperSettings;
  onUpdateSettings: (updated: Partial<DeveloperSettings>) => Promise<void>;
  language?: Language;
  onApplyResolvedLanguage?: (lang: Language) => void;
}

const LANGUAGE_CHOICES: {
  code: Language;
  flag: string;
  label: string;
  sublabel: string;
}[] = [
  { code: 'ht', flag: '🇭🇹', label: 'Kreyòl', sublabel: 'Kreyòl Ayisyen' },
  { code: 'es', flag: '🇪🇸', label: 'Español', sublabel: 'Espagnol / Latino' },
  { code: 'fr', flag: '🇫🇷', label: 'Français', sublabel: 'Français / Francophone' },
  { code: 'en', flag: '🇺🇸', label: 'English', sublabel: 'English / International' },
];

export const DevLanguageControlSection: React.FC<DevLanguageControlSectionProps> = ({
  settings,
  onUpdateSettings,
  language = 'ht',
  onApplyResolvedLanguage,
}) => {
  const toast = useToast();
  const [draft, setDraft] = useState<DeveloperLanguageConfig>(() =>
    sanitizeLanguageConfig(settings.languageConfig)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingGeo, setIsTestingGeo] = useState(false);
  const [detectedGeoCountry, setDetectedGeoCountry] = useState<string | null>(
    () => getDeviceDetectionContext().geoCountryCode
  );

  useEffect(() => {
    setDraft(sanitizeLanguageConfig(settings.languageConfig));
  }, [settings.languageConfig]);

  const deviceCtx = useMemo(() => getDeviceDetectionContext(), []);

  const simulatedResolution = useMemo(() => {
    return resolveInitialLanguageSync({
      config: draft,
      hasUserExplicitChoice: false,
      timeZone: deviceCtx.timeZone,
      geoCountryCode: detectedGeoCountry || deviceCtx.geoCountryCode,
      browserLanguages: deviceCtx.browserLanguages,
      urlLang: null,
    });
  }, [draft, deviceCtx, detectedGeoCountry]);

  const isDirty = useMemo(() => {
    const current = sanitizeLanguageConfig(settings.languageConfig);
    return (
      current.mode !== draft.mode ||
      current.defaultLanguage !== draft.defaultLanguage ||
      current.autoDetectByCountry !== draft.autoDetectByCountry ||
      current.autoDetectByBrowser !== draft.autoDetectByBrowser ||
      current.useNetworkGeoFallback !== draft.useNetworkGeoFallback ||
      current.showInitialModalOnFirstVisit !== draft.showInitialModalOnFirstVisit
    );
  }, [settings.languageConfig, draft]);

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      const nextConfig: DeveloperLanguageConfig = sanitizeLanguageConfig({
        ...draft,
        lastLanguageConfigUpdatedAt: new Date().toISOString(),
      });
      await onUpdateSettings({ languageConfig: nextConfig });

      if (nextConfig.mode === 'manual') {
        clearSavedLanguagePreference();
        onApplyResolvedLanguage?.(nextConfig.defaultLanguage);
      }

      toast.success(
        'Konfigirasyon Lang Pibliye!',
        nextConfig.mode === 'auto'
          ? `Mòd Entelijan Otomatik aktif (Pa Defo / Sekou: ${getLanguageDisplayName(
              nextConfig.defaultLanguage,
              language as Language
            )}).`
          : `Lang pa defo fiks etabli sou ${getLanguageDisplayName(
              nextConfig.defaultLanguage,
              language as Language
            )}.`
      );
    } catch (err: any) {
      toast.error('Erè Anrejistreman', err?.message || 'Pa ka sove konfigirasyon lang lan.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestAndResetLocalChoice = async () => {
    setIsTestingGeo(true);
    try {
      clearSavedLanguagePreference();
      let geo = getDeviceDetectionContext().geoCountryCode;
      if (draft.mode === 'auto' && draft.autoDetectByCountry && draft.useNetworkGeoFallback) {
        const fetched = await detectGeoCountryAsync();
        if (fetched) {
          geo = fetched;
          setDetectedGeoCountry(fetched);
        }
      }

      const resolved = resolveInitialLanguageSync({
        config: draft,
        hasUserExplicitChoice: false,
        geoCountryCode: geo,
        urlLang: null,
      });

      onApplyResolvedLanguage?.(resolved.language);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('omnichurch_dev_language_applied', {
            detail: {
              language: resolved.language,
              source: resolved.source,
              detectedCountryCode: resolved.detectedCountryCode || null,
            },
          })
        );
      }

      toast.success(
        'Deteksyon Lang Reyinisyalize!',
        `Aparèy sa a rezoud sou: ${getLanguageDisplayName(resolved.language, resolved.language)}${
          resolved.detectedCountryCode ? ` (Peyi: ${resolved.detectedCountryCode})` : ''
        }.`
      );
    } finally {
      setIsTestingGeo(false);
    }
  };

  const getSourceBadgeText = (source: string) => {
    switch (source) {
      case 'country_position':
        return 'Pozisyon / Peyi Aparèy la';
      case 'browser':
        return 'Lang Navigatè / Telefòn';
      case 'developer_default':
        return 'Lang Pa Defo Fiks (Manyèl)';
      case 'developer_fallback':
        return 'Lang Sekou / Pa Defo Devlopè';
      default:
        return source;
    }
  };

  return (
    <div
      id="dev-language-control-section"
      className="p-6 rounded-3xl bg-[#0B1120] border border-slate-800 shadow-xl space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                Kontwòl Lang Pa Defo & Deteksyon Entelijan pa Pozisyon
              </h3>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                  draft.mode === 'auto'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}
              >
                {draft.mode === 'auto' ? 'Otomatik Entelijan' : 'Pa Defo Fiks'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Chwazi si aplikasyon an detekte lang peyi itilizatè a otomatikman (ex: Repiblik Dominikèn / Espay &rarr; Español, Lafrans &rarr; Français, Ayiti &rarr; Kreyòl) oswa fòse yon lang pa defo fiks pou tout moun.
            </p>
          </div>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          type="button"
          id="btn-lang-mode-auto"
          onClick={() => setDraft((prev) => ({ ...prev, mode: 'auto' }))}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            draft.mode === 'auto'
              ? 'bg-emerald-950/35 border-emerald-400/70 ring-1 ring-emerald-400/30'
              : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 font-extrabold text-xs sm:text-sm text-white">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Deteksyon Entelijan Otomatik (Pozisyon + Aparèy)</span>
            </div>
            {draft.mode === 'auto' && (
              <span className="w-5 h-5 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 stroke-[3]" />
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Detekte pozisyon peyi itilizatè a (zòn tan + rezo) ak lang navigatè a pou mete Español, Français, English oswa Kreyòl otomatikman sou premye ouvèti a.
          </p>
        </button>

        <button
          type="button"
          id="btn-lang-mode-manual"
          onClick={() => setDraft((prev) => ({ ...prev, mode: 'manual' }))}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            draft.mode === 'manual'
              ? 'bg-amber-950/35 border-amber-400/70 ring-1 ring-amber-400/30'
              : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 font-extrabold text-xs sm:text-sm text-white">
              <Compass className="w-4 h-4 text-amber-400" />
              <span>Lang Pa Defo Fiks (Chwazi pa Devlopè)</span>
            </div>
            {draft.mode === 'manual' && (
              <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 stroke-[3]" />
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Tout nouvo itilizatè ap ouvri aplikasyon an dirèkteman nan lang pa defo ou chwazi anba a (san deteksyon otomatik pa peyi).
          </p>
        </button>
      </div>

      {/* Default / Fallback Language Picker */}
      <div className="space-y-2.5">
        <label className="block text-xs font-extrabold text-slate-200">
          {draft.mode === 'manual'
            ? 'Chwazi Lang Ki Parèt Pa Defo a:'
            : 'Chwazi Lang Sekou (Si peyi/aparèy la pa matche youn nan 4 lang yo):'}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {LANGUAGE_CHOICES.map((choice) => {
            const active = draft.defaultLanguage === choice.code;
            return (
              <button
                key={choice.code}
                type="button"
                id={`btn-dev-default-lang-${choice.code}`}
                onClick={() => setDraft((prev) => ({ ...prev, defaultLanguage: choice.code }))}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  active
                    ? 'bg-amber-400/15 border-amber-400 text-white shadow-md'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl shrink-0">{choice.flag}</span>
                  <div className="min-w-0">
                    <div className="font-black text-xs text-white truncate">{choice.label}</div>
                    <div className="text-[10px] text-slate-400 truncate">{choice.sublabel}</div>
                  </div>
                </div>
                {active && (
                  <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Granular Intelligence & First-Visit Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={draft.autoDetectByCountry}
            disabled={draft.mode === 'manual'}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, autoDetectByCountry: e.target.checked }))
            }
            className="mt-0.5 accent-emerald-400 w-4 h-4 cursor-pointer"
          />
          <div className={draft.mode === 'manual' ? 'opacity-50' : ''}>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Detekte pa Pozisyon / Peyi (Zòn Tan)</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Idantifye peyi itilizatè a san pèmisyon GPS anmèdan (eg. Santo Domingo &rarr; Español).
            </p>
          </div>
        </label>

        <label className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={draft.autoDetectByBrowser}
            disabled={draft.mode === 'manual'}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, autoDetectByBrowser: e.target.checked }))
            }
            className="mt-0.5 accent-cyan-400 w-4 h-4 cursor-pointer"
          />
          <div className={draft.mode === 'manual' ? 'opacity-50' : ''}>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-cyan-400" />
              <span>Detekte pa Lang Telefòn / Navigatè</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Matche lang navigatè a si pozisyon peyi a bileng oswa pa nan kat jeyografik la.
            </p>
          </div>
        </label>

        <label className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={draft.useNetworkGeoFallback}
            disabled={draft.mode === 'manual' || !draft.autoDetectByCountry}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, useNetworkGeoFallback: e.target.checked }))
            }
            className="mt-0.5 accent-blue-400 w-4 h-4 cursor-pointer"
          />
          <div className={draft.mode === 'manual' || !draft.autoDetectByCountry ? 'opacity-50' : ''}>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-blue-400" />
              <span>Konfimasyon Pozisyon Rezo (Si an liy)</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Verifye kòd peyi a rapidman sou entènèt lè sa posib san bloke demaraj aplikasyon an.
            </p>
          </div>
        </label>

        <label className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={draft.showInitialModalOnFirstVisit}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, showInitialModalOnFirstVisit: e.target.checked }))
            }
            className="mt-0.5 accent-amber-400 w-4 h-4 cursor-pointer"
          />
          <div>
            <div className="text-xs font-bold text-white">
              Montre Fenèt Konfimasyon Lang lan sou Premye Vizit
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Dekoche si ou vle itilizatè yo antre dirèkteman nan lang ki detekte oswa pa defo a san fenèt modal la.
            </p>
          </div>
        </label>
      </div>

      {/* Live Diagnostic Summary */}
      <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Diyagnostik Aparèy Sa a an Tan Reyèl
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <div className="text-[10px] text-slate-500">Zòn Tan (TimeZone)</div>
            <div className="font-mono font-bold text-slate-200 truncate">
              {deviceCtx.timeZone || 'Pa disponib'}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500">Peyi Detekte</div>
            <div className="font-mono font-bold text-emerald-300">
              {simulatedResolution.detectedCountryCode || 'Pa detekte'}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500">Lang Navigatè</div>
            <div className="font-mono font-bold text-cyan-300 truncate">
              {deviceCtx.browserLanguages.slice(0, 2).join(', ') || '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500">Lang Rezoud Pou Vizitè</div>
            <div className="font-bold text-amber-300">
              {getLanguageDisplayName(simulatedResolution.language, 'ht')} (
              {getSourceBadgeText(simulatedResolution.source)})
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <button
          type="button"
          id="btn-dev-reset-test-lang"
          onClick={handleTestAndResetLocalChoice}
          disabled={isTestingGeo}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RotateCcw className={`w-3.5 h-3.5 text-cyan-400 ${isTestingGeo ? 'animate-spin' : ''}`} />
          <span>Teste & Reyinisyalize Chwa Lokal Aparèy Sa a</span>
        </button>

        <button
          type="button"
          id="btn-dev-save-lang-config"
          onClick={handleSaveConfig}
          disabled={isSaving}
          className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${
            isDirty
              ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300'
          }`}
        >
          <Save className="w-3.5 h-3.5" />
          <span>
            {isSaving
              ? 'Ap Pibliye...'
              : 'Anrejistre & Pibliye Konfigirasyon Lang'}
          </span>
        </button>
      </div>
    </div>
  );
};
