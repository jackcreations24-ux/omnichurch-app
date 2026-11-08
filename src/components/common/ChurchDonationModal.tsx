import React, { useState } from 'react';
import { Church, Language, ChurchDonationInfo } from '../../types';
import {
  Heart,
  Copy,
  Check,
  ExternalLink,
  X,
  Sparkles,
  ShieldCheck,
  Building2,
  CreditCard,
  Send,
  Smartphone,
  Globe2,
  BookOpen,
  Info,
  DollarSign,
  QrCode,
  Flame,
  Crown,
} from 'lucide-react';

interface ChurchDonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  church: Church;
  language?: Language;
}

export const ChurchDonationModal: React.FC<ChurchDonationModalProps> = ({
  isOpen,
  onClose,
  church,
  language = 'ht',
}) => {
  const [activeTab, setActiveTab] = useState<'bank' | 'paypal' | 'mobile' | 'custom'>('bank');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const isEs = language === 'es';
  const isFr = language === 'fr';
  const isEn = language === 'en';

  const donation: ChurchDonationInfo = church.donationInfo || {
    enabled: true,
    bankEnabled: true,
    bankName: '',
    bankAccountNumber: '',
    bankAccountHolder: church.name,
    paypalEnabled: !!church.email,
    paypalEmail: church.email || '',
    moncashEnabled: !!church.phone,
    moncashNumber: church.phone || '',
    moncashName: church.name,
    zelleEnabled: false,
    cashAppEnabled: false,
    customInstructions: isEs
      ? 'Indique su nombre completo y código de miembro en la descripción de la transferencia.'
      : isFr
      ? 'Veuillez indiquer votre nom complet et code membre dans le libellé du virement.'
      : isEn
      ? 'Please include your full name and member ID in the transfer memo.'
      : 'Tanpri mete non konplè w ak nimewo idantite manm ou nan rezon transfè a.',
    bibleVerse: isEs
      ? 'Cada uno dé como propuso en su corazón: no con tristeza, ni por necesidad, porque Dios ama al dador alegre. (2 Corintios 9:7)'
      : isFr
      ? 'Que chacun donne comme il l’a résolu en son cœur, sans tristesse ni contrainte; car Dieu aime celui qui donne avec joie. (2 Corinthiens 9:7)'
      : isEn
      ? 'Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver. (2 Corinthians 9:7)'
      : 'Chak moun fèt pou bay jan yo te deside nan kè yo, san regrèt, san fòse, paske Bondye renmen moun ki bay ak kè kontan. (2 Korentyen 9:7)',
  };

  const handleCopy = (text: string, fieldId: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  // Determine available tabs
  const hasBank = donation.bankEnabled !== false && (donation.bankName || donation.bankAccountNumber);
  const hasPaypal = donation.paypalEnabled !== false && (donation.paypalEmail || donation.paypalMeUrl);
  const hasMobile =
    (donation.moncashEnabled && donation.moncashNumber) ||
    (donation.zelleEnabled && donation.zelleInfo) ||
    (donation.cashAppEnabled && donation.cashAppTag);
  const hasCustom = !!donation.customGivingUrl || !!donation.customInstructions;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-gradient-to-b from-[#0F172A] via-[#0B1120] to-[#080C16] border border-amber-400/40 rounded-3xl shadow-2xl shadow-amber-500/10 overflow-hidden my-auto"
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

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
              {church.logoIcon === 'Flame' ? (
                <Flame className="w-6 h-6 text-amber-400" />
              ) : church.logoIcon === 'Book' ? (
                <BookOpen className="w-6 h-6 text-amber-400" />
              ) : church.logoIcon === 'Crown' ? (
                <Crown className="w-6 h-6 text-amber-400" />
              ) : church.logoIcon === 'Heart' ? (
                <Heart className="w-6 h-6 text-amber-400" />
              ) : (
                <Building2 className="w-6 h-6 text-amber-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {isEs ? 'Dîmes, Ofrendas y Donaciones' : isEn ? 'Tithes, Offerings & Giving' : isFr ? 'Dîmes, Offrandes & Dons' : 'Dim, Ofrann & Donasyon'}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  {isEs ? 'Canal Oficial' : isEn ? 'Official Church' : isFr ? 'Canal Officiel' : 'Kanal Ofisyèl Legliz la'}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-1 tracking-tight truncate">
                {church.name}
              </h2>
              <p className="text-xs text-slate-400 truncate">
                {church.pastor} • {church.city || 'Ayiti'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6 pt-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* SCRIPTURE VERSE CARD */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-slate-200 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold">
              <BookOpen className="w-3.5 h-3.5" />
              <span>{isEs ? 'Palabra de Dios sobre las Ofrendas:' : isEn ? 'Scripture on Giving:' : isFr ? 'Parole de Dieu sur les Offrandes :' : 'Pawòl Bondye sou Ofrann:'}</span>
            </div>
            <p className="text-xs italic text-amber-100/90 leading-relaxed font-serif">
              &ldquo;{donation.bibleVerse || 'Chak moun fèt pou bay jan yo te deside nan kè yo, san regrèt, san fòse, paske Bondye renmen moun ki bay ak kè kontan. (2 Korentyen 9:7)'}&rdquo;
            </p>
          </div>

          {/* PAYMENT METHOD SELECTOR TABS */}
          <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('bank')}
              className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'bank'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isEs ? 'Banco' : isFr ? 'Banque' : isEn ? 'Bank' : 'Labank'}</span>
              <span className="sm:hidden">Bank</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('paypal')}
              className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'paypal'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>PayPal</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('mobile')}
              className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'mobile'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">MonCash / Zelle</span>
              <span className="sm:hidden">Mobil</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'custom'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isEs ? 'Enlace/Info' : isFr ? 'Lien/Info' : isEn ? 'Link/Info' : 'Lyen/Nòt'}</span>
              <span className="sm:hidden">Nòt</span>
            </button>
          </div>

          {/* TAB 1: BANK ACCOUNT DETAILS */}
          {activeTab === 'bank' && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">
                      {isEs ? 'Transferencia Bancaria Directa' : isFr ? 'Virement Bancaire Direct' : isEn ? 'Direct Bank Transfer' : 'Virement Labank Dirèk'}
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      {isEs ? 'Deposite directamente en la cuenta oficial de la iglesia' : isFr ? 'Déposez sur le compte officiel de l’église' : isEn ? 'Deposit directly into the church’s official account' : 'Depoze dirèkteman sou kont ofisyèl legliz la'}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                  {donation.bankAccountType ? donation.bankAccountType.toUpperCase() : 'CHECKING'}
                </span>
              </div>

              {donation.bankName || donation.bankAccountNumber ? (
                <div className="space-y-3 text-xs">
                  {/* Bank Name */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                        {isEs ? 'Nombre del Banco' : isFr ? 'Nom de la Banque' : isEn ? 'Bank Name' : 'Non Bank la'}
                      </span>
                      <span className="font-bold text-white text-sm">{donation.bankName || 'Banque Nationale'}</span>
                    </div>
                    {donation.bankName && (
                      <button
                        type="button"
                        onClick={() => handleCopy(donation.bankName || '', 'bankName')}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {copiedField === 'bankName' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                        <span>{copiedField === 'bankName' ? (isEs ? 'Copiado' : 'Kopye') : (isEs ? 'Copiar' : 'Kopye')}</span>
                      </button>
                    )}
                  </div>

                  {/* Account Number */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                        {isEs ? 'Número de Cuenta' : isFr ? 'Numéro de Compte' : isEn ? 'Account Number' : 'Nimewo Kont'}
                      </span>
                      <span className="font-mono font-black text-amber-300 text-base tracking-wider">{donation.bankAccountNumber || 'N/A'}</span>
                    </div>
                    {donation.bankAccountNumber && (
                      <button
                        type="button"
                        onClick={() => handleCopy(donation.bankAccountNumber || '', 'accountNum')}
                        className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow transition-all"
                      >
                        {copiedField === 'accountNum' ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedField === 'accountNum' ? (isEs ? '¡Copiado!' : 'Kopye!') : (isEs ? 'Copiar' : 'Kopye')}</span>
                      </button>
                    )}
                  </div>

                  {/* Account Holder */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                        {isEs ? 'Titular de la Cuenta / Beneficiario' : isFr ? 'Titulaire du Compte' : isEn ? 'Account Holder' : 'Titilè Kont lan'}
                      </span>
                      <span className="font-bold text-slate-200">{donation.bankAccountHolder || church.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(donation.bankAccountHolder || church.name, 'holderName')}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {copiedField === 'holderName' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                      <span>{copiedField === 'holderName' ? (isEs ? 'Copiado' : 'Kopye') : (isEs ? 'Copiar' : 'Kopye')}</span>
                    </button>
                  </div>

                  {/* Routing / SWIFT / IBAN (if available) */}
                  {donation.bankRoutingOrSwift && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                          Routing / SWIFT / IBAN
                        </span>
                        <span className="font-mono font-bold text-slate-200">{donation.bankRoutingOrSwift}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(donation.bankRoutingOrSwift || '', 'routingCode')}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {copiedField === 'routingCode' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                        <span>{copiedField === 'routingCode' ? (isEs ? 'Copiado' : 'Kopye') : (isEs ? 'Copiar' : 'Kopye')}</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-center space-y-2">
                  <Info className="w-6 h-6 text-amber-400 mx-auto" />
                  <p className="text-xs text-slate-300">
                    {isEs
                      ? 'Los datos bancarios aún no han sido configurados por el administrador de la iglesia.'
                      : isFr
                      ? 'Les coordonnées bancaires n’ont pas encore été renseignées par l’administrateur.'
                      : isEn
                      ? 'Bank account details have not yet been configured by the church administrator.'
                      : 'Enfòmasyon labank yo poko konfigire pa administrasyon legliz la.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PAYPAL */}
          {activeTab === 'paypal' && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center font-black">
                    P
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">PayPal</h4>
                    <p className="text-[10px] text-slate-400">
                      {isEs ? 'Pague de forma segura con tarjeta o cuenta PayPal' : isFr ? 'Payez en toute sécurité par carte ou compte PayPal' : isEn ? 'Give securely via debit, credit card or PayPal account' : 'Fè don an sekirite avèk kat labank oswa kont PayPal'}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold">
                  Online
                </span>
              </div>

              <div className="space-y-3 text-xs">
                {/* PayPal Email */}
                {donation.paypalEmail && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                        {isEs ? 'Correo Electrónico de PayPal' : isFr ? 'Courriel PayPal' : isEn ? 'PayPal Email' : 'Email PayPal'}
                      </span>
                      <span className="font-mono font-bold text-amber-300 text-xs sm:text-sm">{donation.paypalEmail}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(donation.paypalEmail || '', 'paypalEmail')}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {copiedField === 'paypalEmail' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                      <span>{copiedField === 'paypalEmail' ? (isEs ? 'Copiado' : 'Kopye') : (isEs ? 'Copiar' : 'Kopye')}</span>
                    </button>
                  </div>
                )}

                {/* PayPal Direct Button */}
                {donation.paypalMeUrl ? (
                  <a
                    href={donation.paypalMeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>{isEs ? 'Donar Directamente en PayPal.Me' : isFr ? 'Faire un Don sur PayPal.Me' : isEn ? 'Give Directly on PayPal.Me' : 'Fè Don Dirèkteman sou PayPal.Me'}</span>
                  </a>
                ) : donation.paypalEmail ? (
                  <a
                    href={`https://www.paypal.com/sendmoney?recipient=${encodeURIComponent(donation.paypalEmail)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>{isEs ? 'Abrir PayPal para Enviar' : isFr ? 'Ouvrir PayPal pour Envoyer' : isEn ? 'Open PayPal to Send' : 'Ouvri PayPal pou Fè Peman'}</span>
                  </a>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-2">
                    {isEs ? 'PayPal no configurado.' : isFr ? 'PayPal non configuré.' : isEn ? 'PayPal not configured.' : 'Kont PayPal poko konfigire.'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: MOBILE MONEY (MONCASH, ZELLE, CASHAPP) */}
          {activeTab === 'mobile' && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">MonCash, Zelle & Cash App</h4>
                    <p className="text-[10px] text-slate-400">
                      {isEs ? 'Transferencias móviles instantáneas' : isFr ? 'Paiements mobiles instantanés' : isEn ? 'Instant mobile transfers' : 'Peman mobil dirèk ak rapid'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                {/* MonCash Section */}
                {donation.moncashEnabled && (
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-rose-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-black uppercase">
                        MonCash (Digicel Ayiti)
                      </span>
                      {donation.moncashName && (
                        <span className="text-[11px] text-slate-300 font-bold">{donation.moncashName}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-white text-base tracking-wider">
                        {donation.moncashNumber || church.phone || 'N/A'}
                      </span>
                      {(donation.moncashNumber || church.phone) && (
                        <button
                          type="button"
                          onClick={() => handleCopy(donation.moncashNumber || church.phone || '', 'moncashNum')}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          {copiedField === 'moncashNum' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedField === 'moncashNum' ? (isEs ? 'Copiado' : 'Kopye') : (isEs ? 'Copiar' : 'Kopye')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Zelle Section */}
                {donation.zelleEnabled && donation.zelleInfo && (
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-purple-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-black uppercase">
                        Zelle (USA)
                      </span>
                      {donation.zelleName && (
                        <span className="text-[11px] text-slate-300 font-bold">{donation.zelleName}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-white text-sm tracking-wider">
                        {donation.zelleInfo}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(donation.zelleInfo || '', 'zelleInfo')}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {copiedField === 'zelleInfo' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedField === 'zelleInfo' ? (isEs ? 'Copiado' : 'Kopye') : (isEs ? 'Copiar' : 'Kopye')}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Cash App Section */}
                {donation.cashAppEnabled && donation.cashAppTag && (
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase">
                        Cash App ($Cashtag)
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-emerald-300 text-base tracking-wider">
                        {donation.cashAppTag.startsWith('$') ? donation.cashAppTag : `$${donation.cashAppTag}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(donation.cashAppTag || '', 'cashAppTag')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {copiedField === 'cashAppTag' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedField === 'cashAppTag' ? (isEs ? 'Copiado' : 'Kopye') : (isEs ? 'Copiar' : 'Kopye')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: CUSTOM LINK & INSTRUCTIONS */}
          {activeTab === 'custom' && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
                    <Globe2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">
                      {isEs ? 'Enlace Directo e Instrucciones' : isFr ? 'Lien Direct & Instructions' : isEn ? 'Direct Link & Instructions' : 'Lyen Dirèk & Enstriksyon'}
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      {isEs ? 'Información y notas especiales de la administración' : isFr ? 'Informations et remarques de l’administration' : isEn ? 'Special instructions and notes from administration' : 'Enstriksyon espesyal nan men lidèchip legliz la'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                {/* External Giving URL */}
                {donation.customGivingUrl && (
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                      {donation.customGivingLabel || (isEs ? 'Plataforma Oficial de Donación' : isFr ? 'Plateforme Officielle de Don' : isEn ? 'Official Giving Platform' : 'Platfòm Donasyon Ofisyèl')}
                    </span>
                    <a
                      href={donation.customGivingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>{donation.customGivingLabel || (isEs ? 'Ir a la Página de Donación' : isFr ? 'Accéder à la Page de Don' : isEn ? 'Open Giving Page' : 'Ale sou Paj Donasyon an')}</span>
                    </a>
                  </div>
                )}

                {/* Special Instructions Note */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold">
                    <Info className="w-3.5 h-3.5" />
                    <span>{isEs ? 'Instrucciones Importantes:' : isFr ? 'Instructions Importantes :' : isEn ? 'Important Instructions:' : 'Enstriksyon Enpòtan:'}</span>
                  </div>
                  <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                    {donation.customInstructions || (isEs
                      ? 'Por favor especifique en la nota de la transacción el motivo de su donación (Díezmo, Ofrenda, Construcción, Misión) y su nombre completo.'
                      : isFr
                      ? 'Veuillez préciser dans la note de transaction la destination de votre don (Dîme, Offrande, Construction, Mission) et votre nom complet.'
                      : isEn
                      ? 'Please specify in the transaction memo the purpose of your contribution (Tithe, Offering, Building, Mission) and your full name.'
                      : 'Tanpri presize nan nòt transfè a si se Dim, Ofrann, Fon Konstriksyon oswa Misyon, ansanm ak non konplè w.')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* FOOTER CONFIRMATION */}
          <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{church.name} — {church.id}</span>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer transition-colors"
            >
              {isEs ? 'Cerrar' : isFr ? 'Fermer' : isEn ? 'Close' : 'Fèmen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
