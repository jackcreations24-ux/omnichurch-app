import React, { useState, useEffect, useMemo } from 'react';
import { Language, DeveloperDonationConfig } from '../../types';
import { getDonationConfig } from '../../utils/developerStorage';
import {
  Heart,
  Copy,
  Check,
  ExternalLink,
  X,
  ShieldCheck,
  Wallet,
  Globe2,
  Smartphone,
  CreditCard,
  Building2,
  HeartHandshake,
} from 'lucide-react';

type DonationMethodKey = 'paypal' | 'binance' | 'wise' | 'moncash' | 'zelle';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: Language;
  customConfig?: DeveloperDonationConfig;
}

export const DonationModal: React.FC<DonationModalProps> = ({
  isOpen,
  onClose,
  language = 'ht',
  customConfig,
}) => {
  const [liveConfig, setLiveConfig] = useState<DeveloperDonationConfig>(() => getDonationConfig());
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Keep liveConfig synchronized in real-time with Developer Engine updates
  useEffect(() => {
    const handleUpdate = () => {
      setLiveConfig(getDonationConfig());
    };
    window.addEventListener('omnichurch_dev_settings_updated', handleUpdate);
    return () => {
      window.removeEventListener('omnichurch_dev_settings_updated', handleUpdate);
    };
  }, []);

  const config: DeveloperDonationConfig = customConfig || liveConfig;

  const isEs = language === 'es';
  const isFr = language === 'fr';
  const isEn = language === 'en';

  // Compute available channels enabled in Developer Engine
  const availableMethods = useMemo(() => {
    const methods: {
      id: DonationMethodKey;
      label: string;
      sublabel: string;
      icon: React.ElementType;
      color: string;
      activeBg: string;
      activeBorder: string;
      activeText: string;
    }[] = [];

    if (config.paypalEnabled) {
      methods.push({
        id: 'paypal',
        label: 'PayPal',
        sublabel: isEs ? 'Tarjeta / Cuenta' : isEn ? 'Card / Account' : isFr ? 'Carte / Compte' : 'Kat & Balans',
        icon: Globe2,
        color: 'text-blue-400',
        activeBg: 'bg-blue-500/20',
        activeBorder: 'border-blue-400',
        activeText: 'text-blue-300',
      });
    }

    if (config.binanceEnabled) {
      methods.push({
        id: 'binance',
        label: isEs ? 'Binance' : isEn ? 'Binance' : isFr ? 'Binance' : 'Binance',
        sublabel: isEs ? 'Cripto USDT' : isEn ? 'Crypto USDT' : isFr ? 'Crypto USDT' : 'Kripto USDT',
        icon: Wallet,
        color: 'text-amber-400',
        activeBg: 'bg-amber-500/20',
        activeBorder: 'border-amber-400',
        activeText: 'text-amber-300',
      });
    }

    if (config.wiseEnabled) {
      methods.push({
        id: 'wise',
        label: 'Wise',
        sublabel: 'TransferWise',
        icon: CreditCard,
        color: 'text-emerald-400',
        activeBg: 'bg-emerald-500/20',
        activeBorder: 'border-emerald-400',
        activeText: 'text-emerald-300',
      });
    }

    if (config.moncashEnabled) {
      methods.push({
        id: 'moncash',
        label: 'MonCash',
        sublabel: 'Digicel Ayiti',
        icon: Smartphone,
        color: 'text-rose-400',
        activeBg: 'bg-rose-500/20',
        activeBorder: 'border-rose-400',
        activeText: 'text-rose-300',
      });
    }

    if (config.zelleEnabled) {
      methods.push({
        id: 'zelle',
        label: 'Zelle',
        sublabel: 'USA / Direct',
        icon: Building2,
        color: 'text-purple-400',
        activeBg: 'bg-purple-500/20',
        activeBorder: 'border-purple-400',
        activeText: 'text-purple-300',
      });
    }

    return methods;
  }, [config, isEs, isEn, isFr]);

  const [activeMethod, setActiveMethod] = useState<DonationMethodKey>(() => {
    if (config.paypalEnabled) return 'paypal';
    if (config.binanceEnabled) return 'binance';
    if (config.wiseEnabled) return 'wise';
    if (config.moncashEnabled) return 'moncash';
    if (config.zelleEnabled) return 'zelle';
    return 'paypal';
  });

  // Auto-switch to first available method if current activeMethod gets deactivated in engine
  useEffect(() => {
    if (availableMethods.length > 0 && !availableMethods.some((m) => m.id === activeMethod)) {
      setActiveMethod(availableMethods[0].id);
    }
  }, [availableMethods, activeMethod]);

  if (!isOpen) return null;

  const handleCopy = (text: string, fieldId: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl bg-gradient-to-b from-[#0F172A] via-[#0B1120] to-[#080C16] border border-amber-500/30 rounded-3xl shadow-2xl shadow-amber-500/10 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP GLOW ACCENT */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500"></div>

        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-800/80 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Fèmen"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-inner">
              <HeartHandshake className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {isEs ? 'Soporte y Donación' : isEn ? 'Support & Donation' : isFr ? 'Soutien & Don' : 'Soutyen & Donasyon'}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  {isEs ? '100% Seguro' : isEn ? '100% Secure' : isFr ? '100% Sécurisé' : '100% Sekirize'}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-0.5 tracking-tight">
                {isEs
                  ? 'Apoya la Misión Digital de la Iglesia'
                  : isEn
                  ? 'Support the Church Digital Mission'
                  : isFr
                  ? 'Soutenez la Mission Numérique de l’Église'
                  : 'Soutni Misyon Nimerik Legliz la'}
              </h2>
            </div>
          </div>
        </div>

        {/* DEVELOPER PROFILE & VISION CARD */}
        <div className="p-5 sm:p-6 pt-4 space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-300 space-y-3 relative overflow-hidden">
            <div className="flex items-start gap-3.5">
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-black text-lg flex items-center justify-center shadow-lg shadow-amber-500/20">
                  JC
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-[8px] text-white">
                  ✓
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-sm sm:text-base text-white">
                    {config.developerName || 'Jackson Charles'}
                  </h3>
                  <span className="text-[10px] font-mono text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20 font-bold">
                    Devlopè Prensipal
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  {config.developerRole || 'Lead Software Architect & Ministry Technologist'}
                </p>
              </div>
            </div>

            {/* VISION & MISSION STATEMENT */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 leading-relaxed font-normal">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px] mb-1">
                <Heart className="w-3.5 h-3.5" />
                <span>
                  {isEs ? 'Visión y Misión:' : isEn ? 'Vision & Purpose:' : isFr ? 'Vision & Mission :' : 'Objektif ak Vizyon:'}
                </span>
              </div>
              <p className="italic text-slate-200">
                &ldquo;
                {config.developerBio ||
                  (isEs
                    ? 'Mi objetivo principal es ayudar a la iglesia a crecer social, espiritual y tecnológicamente mediante herramientas digitales modernas, accesibles y transparentes.'
                    : isEn
                    ? 'My core objective is to empower the church to grow socially, spiritually, and technologically through modern, accessible, and transparent digital tools.'
                    : isFr
                    ? 'Mon objectif principal est d’aider l’église à grandir socialement, spirituellement et technologiquement grâce à des outils numériques modernes et transparents.'
                    : 'Objektif mwen se ede legliz la grandi sosyalman, espirityèlman ak nimerikman atravè zouti teknolojik modèn, efikas e transparan ki fasilite kominikasyon ak jesyon manm yo.')}
                &rdquo;
              </p>
            </div>
          </div>

          {/* PAYMENT METHOD SELECTOR TABS */}
          {availableMethods.length > 0 ? (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">
                {isEs
                  ? 'Seleccione su método de donación preferido:'
                  : isEn
                  ? 'Select your preferred donation method:'
                  : isFr
                  ? 'Choisissez votre moyen de don :'
                  : 'Chwazi fason ou vle fè donasyon an:'}
              </label>

              <div
                className={`grid gap-2 ${
                  availableMethods.length === 1
                    ? 'grid-cols-1'
                    : availableMethods.length === 2
                    ? 'grid-cols-2'
                    : availableMethods.length === 3
                    ? 'grid-cols-3'
                    : availableMethods.length === 4
                    ? 'grid-cols-2 sm:grid-cols-4'
                    : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5'
                }`}
              >
                {availableMethods.map((m) => {
                  const Icon = m.icon;
                  const isSelected = activeMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setActiveMethod(m.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                        isSelected
                          ? `${m.activeBg} ${m.activeBorder} ${m.activeText} shadow-md`
                          : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? m.color : 'text-slate-400'}`} />
                      <span className="text-xs font-bold whitespace-nowrap">{m.label}</span>
                      <span className="text-[9px] opacity-75 font-mono truncate max-w-full">
                        {m.sublabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 text-center space-y-1.5">
              <HeartHandshake className="w-5 h-5 text-amber-400 mx-auto" />
              <p className="text-xs font-bold text-white">
                {isEs
                  ? 'Canales de donación no disponibles temporalmente'
                  : 'Kanal donasyon yo pa aktif pou kounye a'}
              </p>
              <p className="text-[11px] text-slate-400">
                {isEs
                  ? 'El desarrollador ha pausado temporalmente las opciones de donación directa.'
                  : 'Devlopè a dezaktive kanal peman dirèk yo nan paramèt motè a.'}
              </p>
            </div>
          )}

          {/* ACTIVE METHOD DETAILS CARD */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            {/* 1. PAYPAL METHOD */}
            {activeMethod === 'paypal' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      PayPal Account & Link
                    </span>
                  </div>
                  <span className="text-[10px] text-blue-300 font-mono">Entènasyonal</span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-mono block">
                    {isEs ? 'Correo Electrónico PayPal:' : 'Imèl PayPal:'}
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-blue-300 break-all select-all">
                      {config.paypalEmail || (
                        <span className="text-slate-500 font-normal italic">
                          {isEs ? 'No configurado aún' : isEn ? 'Not yet configured' : isFr ? 'Non configuré' : 'Poko konfigire'}
                        </span>
                      )}
                    </span>
                    {config.paypalEmail && (
                      <button
                        type="button"
                        onClick={() => handleCopy(config.paypalEmail, 'paypal_email')}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        {copiedField === 'paypal_email' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-bold">Kopye!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Kopye</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {config.paypalMeUrl && (
                  <a
                    href={config.paypalMeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                  >
                    <span>{isEs ? 'Abrir PayPal Directamente' : isEn ? 'Open PayPal.me' : isFr ? 'Ouvrir PayPal Directement' : 'Ouvri Paj PayPal la Dirèkteman'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}

            {/* 2. BINANCE METHOD */}
            {activeMethod === 'binance' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Binance Pay & USDT Address
                    </span>
                  </div>
                  {config.binanceNetwork && (
                    <span className="text-[10px] text-amber-300 font-mono font-bold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                      {config.binanceNetwork}
                    </span>
                  )}
                </div>

                {/* Binance Pay ID */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 font-mono block">
                    Binance Pay ID:
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-amber-300">
                      {config.binancePayId || (
                        <span className="text-slate-500 font-normal italic">
                          {isEs ? 'No configurado aún' : isEn ? 'Not yet configured' : isFr ? 'Non configuré' : 'Poko konfigire'}
                        </span>
                      )}
                    </span>
                    {config.binancePayId && (
                      <button
                        type="button"
                        onClick={() => handleCopy(config.binancePayId, 'binance_pay_id')}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        {copiedField === 'binance_pay_id' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-bold">Kopye!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Kopye</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* USDT Wallet Address */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 font-mono block">
                    {isEs ? 'Dirección USDT (TRC20 / BEP20):' : 'Adrès Portefeuille USDT:'}
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono font-bold text-slate-300 break-all select-all">
                      {config.binanceUsdtAddress || (
                        <span className="text-slate-500 font-normal italic">
                          {isEs ? 'No configurado aún' : isEn ? 'Not yet configured' : isFr ? 'Non configuré' : 'Poko konfigire'}
                        </span>
                      )}
                    </span>
                    {config.binanceUsdtAddress && (
                      <button
                        type="button"
                        onClick={() => handleCopy(config.binanceUsdtAddress, 'binance_wallet')}
                        className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        {copiedField === 'binance_wallet' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-slate-950" />
                            <span>Kopye!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Kopye</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 3. WISE METHOD */}
            {activeMethod === 'wise' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Wise (TransferWise) Account
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-300 font-mono font-bold">Virement Global</span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-mono block">
                    Wise Tag / Email:
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-emerald-300">
                      {config.wiseTag || ''} {config.wiseEmail ? `(${config.wiseEmail})` : ''}
                    </span>
                    {(config.wiseEmail || config.wiseTag) && (
                      <button
                        type="button"
                        onClick={() => handleCopy(config.wiseEmail || config.wiseTag, 'wise_email')}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        {copiedField === 'wise_email' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-bold">Kopye!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Kopye</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {config.wiseIban && (
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 font-mono block">
                      IBAN / Bank Transfer:
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-bold text-slate-300">
                        {config.wiseIban}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(config.wiseIban, 'wise_iban')}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        {copiedField === 'wise_iban' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-bold">Kopye!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Kopye</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. MONCASH METHOD */}
            {activeMethod === 'moncash' && config.moncashEnabled && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      MonCash (Digicel Ayiti)
                    </span>
                  </div>
                  <span className="text-[10px] text-rose-300 font-mono font-bold">Ayiti Lokal</span>
                </div>

                {/* MonCash */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 font-mono block">
                    Nimewo MonCash (Ayiti):
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-rose-300">
                      {config.moncashNumber ? (
                        <>
                          {config.moncashNumber} {config.moncashName ? `(${config.moncashName})` : ''}
                        </>
                      ) : (
                        <span className="text-slate-500 font-normal italic">
                          {isEs ? 'No configurado aún' : isEn ? 'Not yet configured' : isFr ? 'Non configuré' : 'Poko konfigire'}
                        </span>
                      )}
                    </span>
                    {config.moncashNumber && (
                      <button
                        type="button"
                        onClick={() => handleCopy(config.moncashNumber, 'moncash')}
                        className="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        {copiedField === 'moncash' ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Kopye!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Kopye</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed italic">
                  Ou ka voye donasyon an dirèkteman via aplikasyon MonCash oswa kòd *202# sou nimewo sa a.
                </p>
              </div>
            )}

            {/* 5. ZELLE METHOD */}
            {activeMethod === 'zelle' && config.zelleEnabled && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Zelle (Etazini / USA)
                    </span>
                  </div>
                  <span className="text-[10px] text-purple-300 font-mono font-bold">USA Direct</span>
                </div>

                {config.zelleInfo && (
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 font-mono block">
                      Enfòmasyon Zelle (USA):
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-bold text-purple-300">
                        {config.zelleInfo}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(config.zelleInfo, 'zelle')}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        {copiedField === 'zelle' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Kopye!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Kopye</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* FOOTER BLESSING & ACKNOWLEDGEMENT */}
          <div className="text-center pt-2">
            <p className="text-[11px] text-slate-400 italic">
              {config.customNote ||
                (isEs
                  ? '«Cada uno dé como propuso en su corazón: no con tristeza, ni por necesidad, porque Dios ama al dador alegre.» — 2 Corintios 9:7'
                  : isEn
                  ? '“Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver.” — 2 Corinthians 9:7'
                  : isFr
                  ? '« Que chacun donne comme il l’a résolu en son cœur, sans tristesse ni contrainte ; car Dieu aime celui qui donne avec joie. » — 2 Corinthiens 9:7'
                  : '« Se pou chak moun bay jan yo te deside nan kè yo, san regrèt ni fòse, paske Bondye renmen moun ki bay ak kè kontan. » — 2 Korentyen 9:7')}
            </p>
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="p-4 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            Legiz Platform • {config.developerName || 'Jackson Charles'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            {isEs ? 'Cerrar' : isEn ? 'Close' : isFr ? 'Fermer' : 'Fèmen'}
          </button>
        </div>
      </div>
    </div>
  );
};
