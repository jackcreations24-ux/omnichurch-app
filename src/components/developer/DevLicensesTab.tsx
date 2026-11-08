import React, { useState } from 'react';
import {
  Church,
  DeveloperSettings,
  ChurchLicense,
  LicenseTier,
  LicenseStatus,
  Language,
} from '../../types';
import {
  generateLicenseKey,
  validateAndActivateLicense,
  deleteLicensePermanently,
  updateLicenseStatus,
  purgeAllLicensesPermanently,
  purgeAllDemoLicenses,
} from '../../utils/developerStorage';
import { useToast } from '../../context/ToastContext';
import {
  KeyRound,
  CheckCircle2,
  Sparkles,
  Layers,
  X,
  Trash2,
  Check,
  Search,
} from 'lucide-react';

export interface DevLicensesTabProps {
  settings: DeveloperSettings;
  allChurches: Church[];
  currentChurch: Church | null;
  onUpdateSettings: (updated: Partial<DeveloperSettings>) => Promise<void>;
  language?: Language;
}

export const DevLicensesTab: React.FC<DevLicensesTabProps> = ({
  settings,
  allChurches,
  currentChurch,
  onUpdateSettings,
  language = 'ht',
}) => {
  const toast = useToast();

  // Generator State
  const [selectedChurchForLicense, setSelectedChurchForLicense] = useState<string>(
    currentChurch?.id || allChurches[0]?.id || 'GLOBAL'
  );
  const [selectedTier, setSelectedTier] = useState<LicenseTier>('pro_annual');
  const [generatedKey, setGeneratedKey] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<boolean>(false);

  // Quick Activation State
  const [activationKeyInput, setActivationKeyInput] = useState<string>('');
  const [activationChurchId, setActivationChurchId] = useState<string>(
    currentChurch?.id || allChurches[0]?.id || ''
  );
  const [isActivating, setIsActivating] = useState<boolean>(false);

  // License Management & Search State
  const [licenseSearchQuery, setLicenseSearchQuery] = useState<string>('');
  const [licenseStatusFilter, setLicenseStatusFilter] = useState<'all' | 'active' | 'revoked' | 'expired'>('all');
  const [manualDeleteKeyOrId, setManualDeleteKeyOrId] = useState<string>('');
  const [isManualDeleting, setIsManualDeleting] = useState<boolean>(false);

  // Generate License Key
  const handleGenerateLicense = () => {
    const key = generateLicenseKey(selectedChurchForLicense, selectedTier);
    setGeneratedKey(key);
    setCopiedKey(false);
    toast.info(
      'Kle Lisans Jenere',
      `Kle: ${key} (${selectedTier.toUpperCase()})`
    );
  };

  // Copy Key
  const handleCopyKey = () => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey);
    setCopiedKey(true);
    toast.success('Kopye!', 'Kle lisans lan kopye nan kayeclip ou.');
    setTimeout(() => setCopiedKey(false), 2500);
  };

  // Quick Activate
  const handleActivateLicense = async () => {
    const trimmedKey = activationKeyInput.trim();
    if (!trimmedKey) {
      toast.error('Kle Manke', 'Tanpri antre yon kle lisans valid pou aktive.');
      return;
    }

    setIsActivating(true);
    try {
      const res = await validateAndActivateLicense(
        trimmedKey,
        activationChurchId || 'GLOBAL'
      );

      if (res.success) {
        toast.success(
          'Lisans Aktive Avèk Siksè! ✓',
          `Legliz "${res.license?.churchName || activationChurchId}" aktive sou plan ${res.license?.tier?.toUpperCase()}.`
        );
        setActivationKeyInput('');
      } else {
        toast.error('Aktivasyon Echwe', res.message || 'Kle sa a pa valid.');
      }
    } catch (err: any) {
      toast.error('Erè Aktivasyon', err?.message || 'Pa ka aktive lisans lan.');
    } finally {
      setIsActivating(false);
    }
  };

  // Status Change
  const handleUpdateLicenseStatus = async (
    key: string,
    newStatus: LicenseStatus,
    churchName?: string
  ) => {
    const ok = await updateLicenseStatus(key, newStatus);
    if (ok) {
      toast.success(
        'Estati Lisans Chanje',
        `Lisans pou "${churchName || key}" pase kòm ${newStatus.toUpperCase()}.`
      );
    } else {
      toast.error('Erè', 'Pa t ka mete ajou estati lisans lan.');
    }
  };

  // Permanent Delete
  const handleDeleteLicensePermanently = async (key: string, churchName?: string) => {
    if (confirm(`Èske w vle efase lisans "${churchName || key}" la nèt nan baz done a?`)) {
      const ok = await deleteLicensePermanently(key);
      if (ok) {
        toast.info('Lisans Efase', `Lisans ${key} retire nèt.`);
      } else {
        toast.error('Erè', 'Pa t ka efase lisans lan.');
      }
    }
  };

  // Direct manual purge
  const handleManualDeleteLicense = async () => {
    const target = manualDeleteKeyOrId.trim();
    if (!target) return;

    setIsManualDeleting(true);
    try {
      const ok = await deleteLicensePermanently(target);
      if (ok) {
        toast.success('Lisans Efase Definitif!', `Kle/ID "${target}" efase nèt nan sistèm nan.`);
        setManualDeleteKeyOrId('');
      } else {
        toast.error('Pa Jwenn', `Okenn lisans pa jwenn ak kle oswa ID "${target}".`);
      }
    } finally {
      setIsManualDeleting(false);
    }
  };

  // Purge All Demo Licenses
  const handlePurgeAllDemoLicenses = async () => {
    if (confirm('Èske w vle efase tout kle demo nan baz done a?')) {
      const res = await purgeAllDemoLicenses();
      toast.success(
        'Kle Demo Netwaye!',
        `${res.purgedCount} kle demo efase nan sistèm nan.`
      );
    }
  };

  // Purge ALL licenses permanently
  const handlePurgeAllLicensesPermanently = async () => {
    if (
      confirm(
        'ATANSYON MAJÈ: Èske w sèten ou vle efase TOUT lisans ki egziste nan baz done a nèt? Aksyon sa a pa ka defèt!'
      )
    ) {
      const res = await purgeAllLicensesPermanently();
      toast.success(
        'Tout Lisans Efase!',
        `${res.purgedCount} lisans efase nèt nan baz done a.`
      );
    }
  };

  const filteredLicenses = settings.licenses.filter((lic) => {
    const matchesQuery =
      !licenseSearchQuery ||
      (lic.churchName || '').toLowerCase().includes(licenseSearchQuery.toLowerCase()) ||
      (lic.churchId || '').toLowerCase().includes(licenseSearchQuery.toLowerCase()) ||
      (lic.key || '').toLowerCase().includes(licenseSearchQuery.toLowerCase());
    const matchesStatus =
      licenseStatusFilter === 'all' || lic.status === licenseStatusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* 2 COLUMNS: GENERATOR & ACTIVATION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Generator Box */}
        <div className="p-6 rounded-3xl bg-[#0B1120] border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">
                Dèlko Kle Lisans (License Key Generator)
              </h3>
              <p className="text-[11px] text-slate-400">
                Kreye yon kle lisans inik ak chifreman pou nenpòt legliz
              </p>
            </div>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Chwazi Legliz la:
              </label>
              <select
                value={selectedChurchForLicense}
                onChange={(e) => setSelectedChurchForLicense(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400"
              >
                <option value="GLOBAL">★ Lisans Global (Nenpòt Nouvo Legliz)</option>
                {allChurches.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Nivo Lisans (License Tier):
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'enterprise_lifetime', label: 'Pou Tout Tan', tag: 'Lifetime' },
                  { id: 'pro_annual', label: 'Pro Anyèl', tag: '1 Ane' },
                  { id: 'trial', label: 'Esè (Trial)', tag: '30 Jou' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTier(t.id as LicenseTier)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedTier === t.id
                        ? 'bg-amber-400/10 border-amber-400 text-amber-300 font-bold shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="block text-xs font-extrabold">{t.label}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{t.tag}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              id="btn-generate-license-key"
              onClick={handleGenerateLicense}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <KeyRound className="w-4 h-4" />
              <span>Jenere Nouvo Kle Lisans</span>
            </button>

            {generatedKey && (
              <div className="p-4 bg-slate-950 border border-amber-500/40 rounded-2xl space-y-2.5">
                <span className="text-[10px] text-amber-400 font-mono font-bold uppercase block tracking-wider">
                  Kle Jenere ak Siksè:
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedKey}
                    className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-amber-300 font-mono text-xs font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleCopyKey}
                    className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    {copiedKey ? <Check className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
                    <span>{copiedKey ? 'Kopye!' : 'Kopye'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. Quick Activation Box */}
        <div className="p-6 rounded-3xl bg-[#0B1120] border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">
                Aktivasyon Rapid (Quick Activation)
              </h3>
              <p className="text-[11px] text-slate-400">
                Antre yon kle pou aktive lisans lan imedyatman sou yon legliz
              </p>
            </div>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Chwazi Legliz pou Aktive a:
              </label>
              <select
                value={activationChurchId}
                onChange={(e) => setActivationChurchId(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-400"
              >
                {allChurches.length === 0 ? (
                  <option value="">★ Lisans Global (Okenn legliz anrejistre poko)</option>
                ) : (
                  allChurches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.id})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Antre Kle Lisans (eg. OMNI-CH001-LIFE-...):
              </label>
              <input
                type="text"
                value={activationKeyInput}
                onChange={(e) => setActivationKeyInput(e.target.value.toUpperCase())}
                placeholder="OMNI-CH001-PRO-XXXX-YYYY"
                className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-emerald-400 placeholder:text-slate-600"
              />
            </div>

            <button
              type="button"
              id="btn-activate-church-license"
              onClick={handleActivateLicense}
              disabled={isActivating || !activationKeyInput.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isActivating ? 'W ap verifye...' : 'Aktive Lisans lan Kounye a'}</span>
            </button>

            <div className="pt-2 flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
              <div>
                <span className="text-xs font-bold text-slate-200 block">
                  Mete Restriksyon si Lisans Ekspire
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Bloke aksè nan sèvis si legliz la pa gen lisans aktif
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.enforceLicenseLockout}
                onChange={(e) =>
                  onUpdateSettings({ enforceLicenseLockout: e.target.checked })
                }
                className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ACTIVE LICENSES TABLE */}
      <div className="p-6 rounded-3xl bg-[#0B1120] border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Jesyon & Lis Tout Lisans ki Anrejistre ({settings.licenses.length})</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Ou gen kontwòl total: chanje estati (Aktif, Revoke, Ekspire), efase nenpòt lisans definitif, oswa netwaye baz done a.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handlePurgeAllDemoLicenses}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Efase tout kle demo nan baz done a"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Efase Kle Demo</span>
            </button>

            <button
              type="button"
              onClick={handlePurgeAllLicensesPermanently}
              className="px-3.5 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:shadow-rose-900/20"
              title="Efase tout lisans ki egziste nan baz done a definitivman"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Efase TOUT Lisans Nèt (Reset)</span>
            </button>
          </div>
        </div>

        {/* SEARCH & MANUAL DIRECT DELETE TOOLBAR */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-2">
          <div className="lg:col-span-7 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={licenseSearchQuery}
                onChange={(e) => setLicenseSearchQuery(e.target.value)}
                placeholder="Chèche pa Legliz, ID, oswa Kle Lisans..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
              />
              {licenseSearchQuery && (
                <button
                  type="button"
                  onClick={() => setLicenseSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0">
              {(['all', 'active', 'revoked', 'expired'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setLicenseStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition cursor-pointer ${
                    licenseStatusFilter === st
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st === 'all' ? 'Tout' : st === 'active' ? 'Aktif' : st === 'revoked' ? 'Revoke' : 'Ekspire'}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 flex gap-2">
            <input
              type="text"
              value={manualDeleteKeyOrId}
              onChange={(e) => setManualDeleteKeyOrId(e.target.value)}
              placeholder="Kole nenpòt Kle oswa ID Legliz..."
              className="flex-1 px-3 py-2 rounded-xl bg-rose-950/20 border border-rose-800/40 text-white font-mono text-xs placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
            <button
              type="button"
              onClick={handleManualDeleteLicense}
              disabled={isManualDeleting || !manualDeleteKeyOrId.trim()}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shrink-0 shadow-sm"
              title="Efase kle sa a dirèkteman depi nan baz done a"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isManualDeleting ? 'Ap efase...' : 'Efase'}</span>
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800/80">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 text-[11px] uppercase tracking-wider font-mono">
                <th className="p-3.5 font-bold">Legliz & ID</th>
                <th className="p-3.5 font-bold">Kle Lisans</th>
                <th className="p-3.5 font-bold">Nivo (Tier)</th>
                <th className="p-3.5 font-bold">Ekspirasyon</th>
                <th className="p-3.5 font-bold">Estati</th>
                <th className="p-3.5 font-bold text-right">Aksyon Devlopè</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
              {filteredLicenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 font-mono text-xs">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400/60 mx-auto mb-2" />
                    {settings.licenses.length === 0
                      ? 'Okenn lisans pa anrejistre nan baz done a kounye a.'
                      : 'Okenn lisans pa koresponn ak filtè rechèch sa a.'}
                  </td>
                </tr>
              ) : (
                filteredLicenses.map((lic) => (
                  <tr key={lic.key} className="hover:bg-slate-900/60 transition-colors">
                    <td className="p-3.5 font-semibold text-white">
                      <div className="font-bold text-slate-100">{lic.churchName || lic.churchId}</div>
                      <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                        ID: {lic.churchId}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <code className="text-[11px] font-mono text-amber-300 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800 font-bold select-all">
                          {lic.key}
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(lic.key);
                            toast.success('Kopye!', `Kle ${lic.key} kopye.`);
                          }}
                          className="p-1 rounded text-slate-500 hover:text-amber-400 hover:bg-slate-800 transition"
                          title="Kopye kle lisans"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                          lic.tier === 'enterprise_lifetime'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : lic.tier === 'pro_annual'
                            ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {lic.tier.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-300 font-mono text-[11px]">
                      {lic.expiresAt === 'never' ? 'Pou Tout Tan (Illimité)' : lic.expiresAt}
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase font-mono ${
                            lic.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : lic.status === 'revoked'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {lic.status}
                        </span>

                        <select
                          value={lic.status}
                          onChange={(e) =>
                            handleUpdateLicenseStatus(lic.key, e.target.value as LicenseStatus, lic.churchName)
                          }
                          className="bg-slate-900 text-[10px] text-slate-300 border border-slate-700 rounded px-1.5 py-0.5 focus:outline-none cursor-pointer"
                        >
                          <option value="active">Aktif</option>
                          <option value="revoked">Revoke</option>
                          <option value="expired">Ekspire</option>
                        </select>
                      </div>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        {lic.status === 'active' ? (
                          <button
                            type="button"
                            onClick={() => handleUpdateLicenseStatus(lic.key, 'revoked', lic.churchName)}
                            className="px-2.5 py-1 rounded-lg text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-600 border border-amber-500/30 transition-all cursor-pointer text-[10px] font-bold inline-flex items-center gap-1"
                            title="Revoke lisans sa a pou tanporèman san w pa efase done li"
                          >
                            <span>Revoke</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleUpdateLicenseStatus(lic.key, 'active', lic.churchName)}
                            className="px-2.5 py-1 rounded-lg text-emerald-300 hover:text-white bg-emerald-500/10 hover:bg-emerald-600 border border-emerald-500/30 transition-all cursor-pointer text-[10px] font-bold inline-flex items-center gap-1"
                            title="Retabli lisans sa a kòm Aktif"
                          >
                            <span>Retabli</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteLicensePermanently(lic.key, lic.churchName)}
                          className="px-2.5 py-1 rounded-lg text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-600 border border-rose-800/60 transition-all cursor-pointer text-[10px] font-bold inline-flex items-center gap-1 shadow-sm active:scale-95"
                          title="Efase lisans sa a definitivman nan baz done a"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Efase Definitif</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
