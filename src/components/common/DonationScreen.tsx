import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  Globe2,
  Heart,
  HeartHandshake,
  Mail,
  Phone,
  ShieldCheck,
  Smartphone,
  Wallet,
} from 'lucide-react';
import { DeveloperDonationConfig, Language } from '../../types';
import {
  getDonationConfig,
  resolveLocalizedDonationCopy,
} from '../../utils/developerStorage';
import { normalizeSafeHttpUrl, openExternalUrlSafely } from '../../utils/safeExternalLink';

type DonationMethodKey = 'paypal' | 'binance' | 'wise' | 'moncash' | 'zelle';

export interface DonationScreenProps {
  onBack: () => void;
  language?: Language;
  customConfig?: DeveloperDonationConfig;
  isPreview?: boolean;
}

export const DonationScreen: React.FC<DonationScreenProps> = ({
  onBack,
  language = 'ht',
  customConfig,
  isPreview = false,
}) => {
  const [liveConfig, setLiveConfig] = useState<DeveloperDonationConfig>(() => getDonationConfig());
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setLiveConfig(getDonationConfig());
    };
    window.addEventListener('omnichurch_dev_settings_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('omnichurch_dev_settings_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const config: DeveloperDonationConfig = customConfig || liveConfig;
  const localizedCopy = useMemo(
    () => resolveLocalizedDonationCopy(config, language),
    [config, language]
  );

  const isEs = language === 'es';
  const isFr = language === 'fr';
  const isEn = language === 'en';

  const availableMethods = useMemo(() => {
    const methods: {
      id: DonationMethodKey;
      label: string;
      sublabel: string;
      icon: React.ElementType;
      accentText: string;
      activeClasses: string;
    }[] = [];

    if (config.paypalEnabled) {
      methods.push({
        id: 'paypal',
        label: 'PayPal',
        sublabel: isEs ? 'Tarjeta / Cuenta' : isEn ? 'Card / Account' : isFr ? 'Carte / Compte' : 'Kat & Balans',
        icon: Globe2,
        accentText: 'text-sky-400',
        activeClasses: 'bg-sky-500/15 border-sky-400/70 text-white',
      });
    }

    if (config.binanceEnabled) {
      methods.push({
        id: 'binance',
        label: 'Binance',
        sublabel: isEs ? 'Cripto USDT' : isEn ? 'Crypto USDT' : isFr ? 'Crypto USDT' : 'Kripto USDT',
        icon: Wallet,
        accentText: 'text-amber-400',
        activeClasses: 'bg-amber-500/15 border-amber-400/70 text-white',
      });
    }

    if (config.wiseEnabled) {
      methods.push({
        id: 'wise',
        label: 'Wise',
        sublabel: 'TransferWise',
        icon: CreditCard,
        accentText: 'text-emerald-400',
        activeClasses: 'bg-emerald-500/15 border-emerald-400/70 text-white',
      });
    }

    if (config.moncashEnabled) {
      methods.push({
        id: 'moncash',
        label: 'MonCash',
        sublabel: 'Digicel / Natcash',
        icon: Smartphone,
        accentText: 'text-rose-400',
        activeClasses: 'bg-rose-500/15 border-rose-400/70 text-white',
      });
    }

    if (config.zelleEnabled) {
      methods.push({
        id: 'zelle',
        label: 'Zelle',
        sublabel: isEs ? 'EE.UU. / Banco' : isEn ? 'USA / Bank' : isFr ? 'USA / Banque' : 'USA / Labank',
        icon: Building2,
        accentText: 'text-indigo-400',
        activeClasses: 'bg-indigo-500/15 border-indigo-400/70 text-white',
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

  useEffect(() => {
    if (availableMethods.length > 0 && !availableMethods.some((m) => m.id === activeMethod)) {
      setActiveMethod(availableMethods[0].id);
    }
  }, [availableMethods, activeMethod]);

  const handleCopy = async (text: string, fieldId: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedField(fieldId);
    window.setTimeout(() => {
      setCopiedField((prev) => (prev === fieldId ? null : prev));
    }, 2000);
  };

  const developerInitials = useMemo(() => {
    const name = (config.developerName || 'Jackson Charles').trim();
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || 'JC';
  }, [config.developerName]);

  const pageTitle = localizedCopy.screenTitle;
  const pageSubtitle = localizedCopy.screenSubtitle;
  const developerRoleText = localizedCopy.developerRole;
  const developerBioText = localizedCopy.developerBio;
  const gratitudeNoteText = localizedCopy.customNote;

  const copyLabel = isEs ? 'Copiar' : isEn ? 'Copy' : isFr ? 'Copier' : 'Kopye';
  const copiedLabel = isEs ? '¡Copiado!' : isEn ? 'Copied!' : isFr ? 'Copié !' : 'Kopye!';
  const notConfiguredLabel = isEs
    ? 'No configurado aún'
    : isEn
    ? 'Not configured yet'
    : isFr
    ? 'Non configuré'
    : 'Poko konfigire';

  const safePaypalUrl = normalizeSafeHttpUrl(config.paypalMeUrl);

  const renderCopyRow = (label: string, value: string, fieldId: string, accentClass = 'text-slate-100') => (
    <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/90 flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1 space-y-0.5">
        <span className="text-[11px] text-slate-400 block">{label}</span>
        {value ? (
          <span className={`text-sm font-mono font-semibold break-all select-all tabular-nums ${accentClass}`}>
            {value}
          </span>
        ) : (
          <span className="text-xs text-slate-500 italic">{notConfiguredLabel}</span>
        )}
      </div>
      {value && (
        <button
          type="button"
          onClick={() => handleCopy(value, fieldId)}
          className="min-h-[44px] px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer whitespace-nowrap"
        >
          {copiedField === fieldId ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400">{copiedLabel}</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-slate-300" />
              <span>{copyLabel}</span>
            </>
          )}
        </button>
      )}
    </div>
  );

  return (
    <section
      id="donate-full-screen"
      aria-label={isEs ? 'Pantalla de Donación' : isEn ? 'Donation Screen' : isFr ? 'Écran de Don' : 'Ekran Donasyon'}
      className="w-full max-w-5xl mx-auto space-y-6 pb-10 animate-in fade-in duration-200"
    >
      {/* Mobile-first sticky top navigation header */}
      <div className="sticky top-0 z-20 -mx-4 px-4 sm:mx-0 sm:px-0 py-3 bg-[#0F172A]/90 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between gap-3">
        <button
          type="button"
          id="btn-donate-screen-back"
          onClick={onBack}
          className="min-h-[44px] px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>{isEs ? 'Volver' : isEn ? 'Back' : isFr ? 'Retour' : 'Retounen'}</span>
        </button>

        <div className="min-w-0 text-center">
          <span className="text-sm font-bold text-white truncate block">
            {isEs ? 'Apoyo y Donación' : isEn ? 'Support & Donate' : isFr ? 'Soutien & Don' : 'Soutyen & Donasyon'}
          </span>
        </div>

        <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium shrink-0 whitespace-nowrap">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">
            {isPreview
              ? isEs
                ? 'Vista previa'
                : isEn
                ? 'Live Preview'
                : isFr
                ? 'Aperçu'
                : 'Previzyalizasyon'
              : isEs
              ? 'Verificado'
              : isEn
              ? 'Verified'
              : isFr
              ? 'Vérifié'
              : 'Verifye'}
          </span>
        </div>
      </div>

      {/* Editorial Hero Header */}
      <div className="space-y-2.5 px-1">
        <div className="flex items-center gap-2 text-xs text-amber-400 font-medium">
          <HeartHandshake className="w-4 h-4 shrink-0" />
          <span>OmniChurch Pro</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="text-slate-400">
            {isEs
              ? 'Contribución voluntaria directa'
              : isEn
              ? 'Direct voluntary support'
              : isFr
              ? 'Soutien volontaire direct'
              : 'Kontribisyon volontè dirèk'}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight max-w-2xl [text-wrap:balance]">
          {pageTitle}
        </h1>
        <p className="text-sm sm:text-[15px] text-slate-300 leading-relaxed max-w-3xl">
          {pageSubtitle}
        </p>
      </div>

      {/* Responsive 2-Column Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Payment Channels (Primary Action Anchor) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-5">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
              <div>
                <h2 className="text-base font-bold text-white">
                  {isEs
                    ? 'Métodos de Donación Disponibles'
                    : isEn
                    ? 'Available Donation Methods'
                    : isFr
                    ? 'Moyens de Don Disponibles'
                    : 'Mwayen Donasyon ki Disponib'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isEs
                    ? 'Seleccione una plataforma para ver los datos oficiales.'
                    : isEn
                    ? 'Choose a channel below to view official transfer details.'
                    : isFr
                    ? 'Choisissez un canal ci-dessous pour afficher les coordonnées officielles.'
                    : 'Chwazi yon kanal anba a pou wè detay ofisyèl yo epi kopye yo fasil.'}
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400 tabular-nums shrink-0">
                {availableMethods.length} / 5
              </span>
            </div>

            {availableMethods.length > 0 ? (
              <>
                {/* Interactive Segmented Method Controls */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {availableMethods.map((method) => {
                    const Icon = method.icon;
                    const isSelected = activeMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setActiveMethod(method.id)}
                        className={`min-h-[56px] px-3 py-2.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                          isSelected
                            ? method.activeClasses
                            : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isSelected ? method.accentText : 'text-slate-500'}`} />
                        <div className="min-w-0">
                          <div className="text-xs font-bold leading-tight truncate">{method.label}</div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">{method.sublabel}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Channel Details */}
                <div className="pt-1 space-y-3.5">
                  {activeMethod === 'paypal' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-semibold text-white">PayPal</span>
                        <span>{isEs ? 'Internacional' : isEn ? 'International' : isFr ? 'International' : 'Entènasyonal'}</span>
                      </div>
                      {renderCopyRow(
                        isEs ? 'Correo PayPal' : isEn ? 'PayPal Email' : isFr ? 'E-mail PayPal' : 'Imèl Kont PayPal',
                        config.paypalEmail,
                        'paypal_email',
                        'text-sky-300'
                      )}
                      {safePaypalUrl && (
                        <button
                          type="button"
                          onClick={() => openExternalUrlSafely(safePaypalUrl)}
                          className="w-full min-h-[48px] px-4 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          <span>
                            {isEs
                              ? 'Abrir PayPal.me Directamente'
                              : isEn
                              ? 'Open PayPal.me Directly'
                              : isFr
                              ? 'Ouvrir PayPal.me Directement'
                              : 'Ouvri Paj PayPal la Dirèkteman'}
                          </span>
                          <ExternalLink className="w-4 h-4 shrink-0" />
                        </button>
                      )}
                    </div>
                  )}

                  {activeMethod === 'binance' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-semibold text-white">Binance Pay &amp; USDT</span>
                        {config.binanceNetwork && (
                          <span className="font-mono text-amber-300">{config.binanceNetwork}</span>
                        )}
                      </div>
                      {renderCopyRow('Binance Pay ID (UID)', config.binancePayId, 'binance_pay_id', 'text-amber-300')}
                      {renderCopyRow(
                        isEs ? 'Dirección Wallet USDT' : isEn ? 'USDT Wallet Address' : isFr ? 'Adresse Wallet USDT' : 'Adrès Portefeuille USDT',
                        config.binanceUsdtAddress,
                        'binance_wallet',
                        'text-slate-100'
                      )}
                    </div>
                  )}

                  {activeMethod === 'wise' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-semibold text-white">Wise (TransferWise)</span>
                        <span>USD · EUR · CAD</span>
                      </div>
                      {renderCopyRow(
                        isEs ? 'Correo Wise' : isEn ? 'Wise Email' : isFr ? 'E-mail Wise' : 'Imèl Kont Wise',
                        config.wiseEmail,
                        'wise_email',
                        'text-emerald-300'
                      )}
                      {config.wiseTag &&
                        renderCopyRow('Wisetag', config.wiseTag, 'wise_tag', 'text-emerald-300')}
                      {config.wiseIban &&
                        renderCopyRow(
                          isEs ? 'IBAN / Cuenta Bancaria' : isEn ? 'IBAN / Routing' : isFr ? 'IBAN / Coordonnées' : 'IBAN / Nimewo Kont',
                          config.wiseIban,
                          'wise_iban',
                          'text-slate-100'
                        )}
                    </div>
                  )}

                  {activeMethod === 'moncash' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-semibold text-white">MonCash / Natcash</span>
                        <span>{isEs ? 'Haití' : isEn ? 'Haiti' : isFr ? 'Haïti' : 'Ayiti'}</span>
                      </div>
                      {renderCopyRow(
                        isEs ? 'Número MonCash / Natcash' : isEn ? 'MonCash / Natcash Number' : isFr ? 'Numéro MonCash / Natcash' : 'Nimewo MonCash / Natcash',
                        config.moncashNumber,
                        'moncash_number',
                        'text-rose-300'
                      )}
                      {config.moncashName && (
                        <div className="px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 flex items-center justify-between gap-2">
                          <span className="text-slate-400">
                            {isEs ? 'Titular' : isEn ? 'Account Name' : isFr ? 'Titulaire' : 'Non sou Kont lan'}
                          </span>
                          <span className="font-semibold text-white">{config.moncashName}</span>
                        </div>
                      )}
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {isEs
                          ? 'Puede enviar su donación directamente desde la app MonCash o marcando *202#.'
                          : isEn
                          ? 'Send your contribution directly through the MonCash app or by dialing *202#.'
                          : isFr
                          ? 'Envoyez votre don directement depuis l’application MonCash ou en composant *202#.'
                          : 'Ou ka voye donasyon an dirèkteman via aplikasyon MonCash oswa lè w konpoze *202#.'}
                      </p>
                    </div>
                  )}

                  {activeMethod === 'zelle' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-semibold text-white">
                          {isEs ? 'Zelle / Transferencia Bancaria' : isEn ? 'Zelle / Direct Bank Transfer' : isFr ? 'Zelle / Virement Bancaire' : 'Zelle / Viman Bankè'}
                        </span>
                        <span>USA Direct</span>
                      </div>
                      {renderCopyRow(
                        isEs ? 'Datos Zelle / Banco' : isEn ? 'Zelle / Bank Details' : isFr ? 'Coordonnées Zelle / Banque' : 'Enfòmasyon Zelle / Kont Labank',
                        config.zelleInfo,
                        'zelle_info',
                        'text-indigo-300'
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="py-8 px-4 text-center space-y-2 rounded-2xl bg-slate-950/70 border border-slate-800">
                <HeartHandshake className="w-6 h-6 text-amber-400 mx-auto" />
                <p className="text-sm font-semibold text-white">
                  {isEs
                    ? 'Canales de donación pausados temporalmente'
                    : isEn
                    ? 'Donation channels temporarily paused'
                    : isFr
                    ? 'Canaux de don temporairement en pause'
                    : 'Kanal donasyon yo pa aktif pou kounye a'}
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {isEs
                    ? 'El administrador del sistema aún no ha activado un método de pago directo.'
                    : isEn
                    ? 'No direct donation channel is currently active in the system settings.'
                    : isFr
                    ? 'Aucun canal de don direct n’est actif pour le moment.'
                    : 'Okenn kanal peman dirèk poko aktive nan paramèt sistèm lan.'}
                </p>
              </div>
            )}
          </div>

          {/* Custom Note / Scripture */}
          <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
              <Heart className="w-3.5 h-3.5 shrink-0" />
              <span>
                {isEs ? 'Mensaje de Gratitud' : isEn ? 'Note of Gratitude' : isFr ? 'Mot de Gratitude' : 'Mesaj Remèsiman'}
              </span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed italic">
              {gratitudeNoteText}
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Developer Profile, Mission & Direct Contact */}
        <div className="lg:col-span-5 space-y-5">
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-5">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-black text-lg flex items-center justify-center shrink-0">
                {developerInitials}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-white truncate">
                  {config.developerName || 'Jackson Charles'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                  {developerRoleText}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/80 space-y-2">
              <h3 className="text-xs font-semibold text-amber-400">
                {isEs ? 'Visión y Misión' : isEn ? 'Vision & Mission' : isFr ? 'Vision & Mission' : 'Objektif ak Vizyon'}
              </h3>
              <p className="text-sm text-slate-200 leading-relaxed">
                &ldquo;{developerBioText}&rdquo;
              </p>
            </div>

            {(config.developerEmail?.trim() || config.developerPhone?.trim()) && (
              <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
                <h3 className="text-xs font-semibold text-slate-400">
                  {isEs ? 'Contacto Directo' : isEn ? 'Direct Contact' : isFr ? 'Contact Direct' : 'Kontak Dirèk'}
                </h3>
                {config.developerEmail?.trim() && (
                  <div className="flex items-center justify-between gap-2 text-xs p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    <div className="flex items-center gap-2 min-w-0 text-slate-200">
                      <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="truncate font-mono">{config.developerEmail}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(config.developerEmail, 'dev_email')}
                      className="min-h-[36px] px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold shrink-0 cursor-pointer"
                    >
                      {copiedField === 'dev_email' ? copiedLabel : copyLabel}
                    </button>
                  </div>
                )}
                {config.developerPhone?.trim() && (
                  <div className="flex items-center justify-between gap-2 text-xs p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    <div className="flex items-center gap-2 min-w-0 text-slate-200">
                      <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="truncate font-mono tabular-nums">{config.developerPhone}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(config.developerPhone || '', 'dev_phone')}
                      className="min-h-[36px] px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold shrink-0 cursor-pointer"
                    >
                      {copiedField === 'dev_phone' ? copiedLabel : copyLabel}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
