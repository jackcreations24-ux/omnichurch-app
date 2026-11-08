import React, { useState } from 'react';
import { DeveloperDonationConfig, Language } from '../../types';
import { updateDonationConfig } from '../../utils/developerStorage';
import { useToast } from '../../context/ToastContext';
import {
  CreditCard,
  Building2,
  Globe,
  Smartphone,
  Eye,
  Check,
  Info,
  Heart,
  Coins,
} from 'lucide-react';
import { DonationModal } from '../common/DonationModal';

export interface DevDonationsTabProps {
  donationConfig: DeveloperDonationConfig;
  onDonationConfigSaved?: (newConfig: DeveloperDonationConfig) => void;
  language?: Language;
}

export const DevDonationsTab: React.FC<DevDonationsTabProps> = ({
  donationConfig: initialConfig,
  onDonationConfigSaved,
  language = 'ht',
}) => {
  const toast = useToast();
  const [config, setConfig] = useState<DeveloperDonationConfig>(initialConfig);
  const [isDonationPreviewOpen, setIsDonationPreviewOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateDonationConfig(config);
      toast.success(
        'Donasyon Sove!',
        'Tout enfòmasyon peman devlopè a anrejistre avèk siksè nan Firestore ak lokal.'
      );
      if (onDonationConfigSaved) {
        onDonationConfigSaved(config);
      }
    } catch (err: any) {
      toast.error('Erè Sovgad', err?.message || 'Pa t ka sove enfòmasyon donasyon yo.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* DEVELOPER MISSION STATEMENT & PROFILE BANNER */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#0D1527] via-[#0B1120] to-[#171329] border border-rose-500/30 shadow-2xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-400 p-0.5 shadow-xl shadow-rose-500/20 shrink-0">
              <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center text-white font-black text-xl">
                JC
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-white">{config.developerName || 'Jackson Charles'}</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold font-mono uppercase">
                  Kreyatè & Achitèk Sistèm
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold font-mono">
                  Lead Developer
                </span>
              </div>
              <p className="text-xs text-slate-300 max-w-2xl font-medium leading-relaxed">
                {config.developerBio ||
                  'Objektif mwen se ede legliz la grandi sosyalman, espirityèlman ak nimerikman atravè solisyon teknolojik avanse, dirab, efikas e transparan ki konekte manm yo ak lidè yo toutotou mond lan.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-preview-donation-modal"
            onClick={() => setIsDonationPreviewOpen(true)}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white font-black text-xs shadow-xl shadow-rose-500/25 flex items-center gap-2 transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <Eye className="w-4 h-4" />
            <span>Gade Kijan Modal la Parèt (Live Preview)</span>
          </button>
        </div>

        {/* MISSION HIGHLIGHT QUOTE */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3.5 text-xs text-slate-300">
          <Heart className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <strong className="text-white font-bold block">
              Poukisa Sipò Sa a Enpòtan pou Legliz yo:
            </strong>
            <span>
              Chak kontribisyon ou konfigire anba a ap parèt nan fenèt sipò devlopè a pou manm ak responsab legliz yo. Sa pèmèt finanse sèvè Firestore, notifikasyon push an tan reyèl, ak devlopman nouvo zouti gratis pou ministè evanjelik yo.
            </span>
          </div>
        </div>
      </div>

      {/* DONATION ACCOUNTS FORM */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. PAYPAL MANAGEMENT */}
          <div className="p-6 rounded-3xl bg-[#0B1120] border border-blue-500/30 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white">Kont PayPal</h4>
                  <p className="text-[11px] text-slate-400">Peman entènasyonal pa kat ak balans PayPal</p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-[11px] font-bold text-slate-400">
                  {config.paypalEnabled ? 'Aktif' : 'Dezaktive'}
                </span>
                <input
                  type="checkbox"
                  checked={config.paypalEnabled}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, paypalEnabled: e.target.checked }))
                  }
                  className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
                />
              </label>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Email PayPal Devlopè a:
                </label>
                <input
                  type="email"
                  value={config.paypalEmail || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, paypalEmail: e.target.value }))
                  }
                  placeholder="imel@egzanp.com"
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Lyen Dirèk PayPal.me:
                </label>
                <input
                  type="url"
                  value={config.paypalMeUrl || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, paypalMeUrl: e.target.value }))
                  }
                  placeholder="https://paypal.me/itilizate"
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-400 font-mono"
                />
              </div>
            </div>
          </div>

          {/* 2. BINANCE CRYPTO (USDT) */}
          <div className="p-6 rounded-3xl bg-[#0B1120] border border-amber-500/30 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white">Binance Crypto & USDT</h4>
                  <p className="text-[11px] text-slate-400">Peman kriptomonnen mondyal san frè segondè</p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-[11px] font-bold text-slate-400">
                  {config.binanceEnabled ? 'Aktif' : 'Dezaktive'}
                </span>
                <input
                  type="checkbox"
                  checked={config.binanceEnabled}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, binanceEnabled: e.target.checked }))
                  }
                  className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                />
              </label>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Binance Pay ID:
                  </label>
                  <input
                    type="text"
                    value={config.binancePayId || ''}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, binancePayId: e.target.value }))
                    }
                    placeholder="eg. 482910381"
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-700 text-amber-300 text-xs focus:outline-none focus:border-amber-400 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Rezo (Network):
                  </label>
                  <input
                    type="text"
                    value={config.binanceNetwork || 'USDT (TRC20 / BSC)'}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, binanceNetwork: e.target.value }))
                    }
                    placeholder="TRC20 / BEP20"
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Adrès Wallet USDT:
                </label>
                <input
                  type="text"
                  value={config.binanceUsdtAddress || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, binanceUsdtAddress: e.target.value }))
                  }
                  placeholder="TXXXXX... oswa 0xXXXX..."
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>
            </div>
          </div>

          {/* 3. WISE (TRANSFERWISE) */}
          <div className="p-6 rounded-3xl bg-[#0B1120] border border-emerald-500/30 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white">Wise (TransferWise)</h4>
                  <p className="text-[11px] text-slate-400">Transfè labank entènasyonal rapid ak IBAN</p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-[11px] font-bold text-slate-400">
                  {config.wiseEnabled ? 'Aktif' : 'Dezaktive'}
                </span>
                <input
                  type="checkbox"
                  checked={config.wiseEnabled}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, wiseEnabled: e.target.checked }))
                  }
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </label>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Email Wise:
                  </label>
                  <input
                    type="email"
                    value={config.wiseEmail || ''}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, wiseEmail: e.target.value }))
                    }
                    placeholder="email@wise.com"
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Wise Tag / Link:
                  </label>
                  <input
                    type="text"
                    value={config.wiseTag || ''}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, wiseTag: e.target.value }))
                    }
                    placeholder="@itilizate"
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-700 text-emerald-300 text-xs focus:outline-none focus:border-emerald-400 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  IBAN / Nimewo Kont Wise:
                </label>
                <input
                  type="text"
                  value={config.wiseIban || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, wiseIban: e.target.value }))
                  }
                  placeholder="BE00 0000 0000 0000 / US Routing..."
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-400 font-mono"
                />
              </div>
            </div>
          </div>

          {/* 4. MONCASH (DIGICEL AYITI) */}
          <div className="p-6 rounded-3xl bg-[#0B1120] border border-rose-500/30 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white">MonCash (Digicel Ayiti)</h4>
                  <p className="text-[11px] text-slate-400">Peman Ayiti lokal dirèk pa nimewo telefòn</p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <span className={`text-[11px] font-bold ${config.moncashEnabled ? 'text-rose-400' : 'text-slate-500'}`}>
                  {config.moncashEnabled ? 'Aktif' : 'Dezaktive'}
                </span>
                <input
                  type="checkbox"
                  checked={config.moncashEnabled}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, moncashEnabled: e.target.checked }))
                  }
                  className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                />
              </label>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Nimewo MonCash:
                  </label>
                  <input
                    type="text"
                    value={config.moncashNumber || ''}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, moncashNumber: e.target.value }))
                    }
                    placeholder="+509 37 00 0000"
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-700 text-rose-300 text-xs focus:outline-none focus:border-rose-400 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Non sou Kont MonCash:
                  </label>
                  <input
                    type="text"
                    value={config.moncashName || ''}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, moncashName: e.target.value }))
                    }
                    placeholder="Non Titilè Kont la"
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-rose-400"
                  />
                </div>
              </div>

              {!config.moncashEnabled && (
                <p className="text-[10px] text-amber-400/90 font-medium">
                  Kanal MonCash la dezaktive nan motè a: li p ap parèt pou okenn manm ni okenn legliz.
                </p>
              )}
            </div>
          </div>

          {/* 5. ZELLE (USA DIRECT) */}
          <div className="p-6 rounded-3xl bg-[#0B1120] border border-purple-500/30 space-y-4 shadow-xl lg:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white">Zelle (Etazini / USA)</h4>
                  <p className="text-[11px] text-slate-400">Transfè dirèk bankè pou Etazini ak dyaspora a</p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <span className={`text-[11px] font-bold ${config.zelleEnabled ? 'text-purple-400' : 'text-slate-500'}`}>
                  {config.zelleEnabled ? 'Aktif' : 'Dezaktive'}
                </span>
                <input
                  type="checkbox"
                  checked={config.zelleEnabled}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, zelleEnabled: e.target.checked }))
                  }
                  className="w-4 h-4 accent-purple-500 rounded cursor-pointer"
                />
              </label>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Enfòmasyon Zelle (Email oswa Nimewo Telefòn):
                </label>
                <input
                  type="text"
                  value={config.zelleInfo || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, zelleInfo: e.target.value }))
                  }
                  placeholder="email@example.com oswa +1 (XXX) XXX-XXXX"
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-700 text-purple-300 text-xs focus:outline-none focus:border-purple-400 font-mono"
                />
              </div>

              {!config.zelleEnabled && (
                <p className="text-[10px] text-amber-400/90 font-medium">
                  Kanal Zelle la dezaktive nan motè a: li p ap parèt pou okenn moun.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* DEVELOPER MISSION NOTE & ACTION BUTTON */}
        <div className="p-6 rounded-3xl bg-[#0B1120] border border-slate-800 space-y-4 shadow-xl">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Mesaj / Remèsiman Devlopè a pou Kominote a:
            </label>
            <textarea
              rows={3}
              value={config.customNote || ''}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, customNote: e.target.value }))
              }
              placeholder="Mèsi pou sipò ou nan ministè teknolojik la..."
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400 leading-relaxed"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Done sa yo otomatikman senkronize ak baz done nwaj la pou tout manm yo wè yo.</span>
            </div>

            <button
              type="submit"
              id="btn-save-dev-donations"
              disabled={isSaving}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs shadow-xl shadow-amber-400/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
              <span>{isSaving ? 'W ap anrejistre...' : 'Anrejistre Tout Paramèt Donasyon yo'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* PREVIEW MODAL */}
      <DonationModal
        isOpen={isDonationPreviewOpen}
        onClose={() => setIsDonationPreviewOpen(false)}
        language={language}
        customConfig={config}
      />
    </div>
  );
};
