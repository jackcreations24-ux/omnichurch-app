import React, { useState, useEffect, useMemo } from 'react';
import {
  Church,
  ChurchLicense,
  DeveloperSettings,
  LicenseTier,
  LicenseStatus,
  Language,
} from '../../types';
import {
  generateLicenseKey,
  validateAndActivateLicense,
  generateAndActivateLicenseForChurch,
  extendOrUpgradeLicense,
  deleteLicensePermanently,
  deleteLicenseForChurch,
  updateLicenseStatus,
  purgeAllLicensesPermanently,
} from '../../utils/developerStorage';
import { useToast } from '../../context/ToastContext';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import {
  Key,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Building2,
  Ban,
  RefreshCw,
  Search,
  AlertTriangle,
  Download,
  CalendarPlus,
  Crown,
  Zap,
  CheckCircle2,
} from 'lucide-react';

export interface DevLicensesTabProps {
  settings: DeveloperSettings;
  allChurches: Church[];
  currentChurch?: Church | null;
  onUpdateSettings: (partial: Partial<DeveloperSettings>) => Promise<void>;
  onRefreshSettings?: () => void;
  language?: Language;
}

const LICENSE_UI_PREFS_KEY = 'omnichurch_dev_licenses_ui_v1';

export const DevLicensesTab: React.FC<DevLicensesTabProps> = ({
  settings,
  allChurches,
  onUpdateSettings,
  onRefreshSettings,
}) => {
  const toast = useToast();

  // Load persisted UI preferences so the developer's working context is remembered
  const savedPrefs = useMemo(() => {
    try {
      const raw = localStorage.getItem(LICENSE_UI_PREFS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, []);

  // Generator State
  const [targetChurchId, setTargetChurchId] = useState<string>(
    savedPrefs.targetChurchId || allChurches[0]?.id || 'GLOBAL'
  );
  const [selectedTier, setSelectedTier] = useState<LicenseTier>(
    savedPrefs.selectedTier || 'pro_annual'
  );
  const [customNotes, setCustomNotes] = useState<string>(savedPrefs.customNotes || '');
  const [generatedKey, setGeneratedKey] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isGeneratingAndActivating, setIsGeneratingAndActivating] = useState(false);

  // Manual Activation State
  const [activateKeyInput, setActivateKeyInput] = useState('');
  const [activateChurchId, setActivateChurchId] = useState<string>(
    savedPrefs.activateChurchId || allChurches[0]?.id || 'GLOBAL'
  );

  // Direct Delete / Lookup by Key or Church ID State
  const [directTargetInput, setDirectTargetInput] = useState('');
  const [searchQuery, setSearchQuery] = useState(savedPrefs.searchQuery || '');
  const [statusFilter, setStatusFilter] = useState<'all' | LicenseStatus>(
    savedPrefs.statusFilter || 'all'
  );

  // Persist generator & filter selections whenever the developer changes them
  useEffect(() => {
    try {
      localStorage.setItem(
        LICENSE_UI_PREFS_KEY,
        JSON.stringify({
          targetChurchId,
          selectedTier,
          customNotes,
          activateChurchId,
          searchQuery,
          statusFilter,
        })
      );
    } catch {
      // ignore storage quota errors
    }
  }, [targetChurchId, selectedTier, customNotes, activateChurchId, searchQuery, statusFilter]);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: async () => {},
  });

  const refreshParentOrStorage = () => {
    if (onRefreshSettings) onRefreshSettings();
  };

  const licenses = settings.licenses || [];

  // Live License Metrics
  const stats = useMemo(() => {
    const total = licenses.length;
    const active = licenses.filter((l) => l.status === 'active').length;
    const lifetime = licenses.filter(
      (l) => l.tier === 'enterprise_lifetime' && l.status === 'active'
    ).length;
    const proAnnual = licenses.filter(
      (l) => l.tier === 'pro_annual' && l.status === 'active'
    ).length;
    const trial = licenses.filter((l) => l.tier === 'trial' && l.status === 'active').length;
    const revokedOrExpired = licenses.filter(
      (l) => l.status === 'revoked' || l.status === 'expired'
    ).length;
    return { total, active, lifetime, proAnnual, trial, revokedOrExpired };
  }, [licenses]);

  const handleGenerateOnly = () => {
    const key = generateLicenseKey(targetChurchId, selectedTier);
    setGeneratedKey(key);
    setActivateKeyInput(key);
    setActivateChurchId(targetChurchId);
    toast.success(
      'Kle Lisans Jenere!',
      `Kle ${key} pare pou kopye oswa aktive.`
    );
  };

  const handleGenerateAndActivateNow = async () => {
    setIsGeneratingAndActivating(true);
    try {
      const targetChurch = allChurches.find((c) => c.id === targetChurchId);
      const churchName =
        targetChurchId === 'GLOBAL'
          ? 'Tout Legliz (Global)'
          : targetChurch?.name || targetChurchId;

      const res = await generateAndActivateLicenseForChurch(
        targetChurchId,
        churchName,
        selectedTier,
        customNotes
      );

      if (res.success && res.license) {
        setGeneratedKey(res.license.key);
        refreshParentOrStorage();
        toast.success(
          'Lisans Jenere & Aktive!',
          `${res.license.key} aktive imedyatman pou ${churchName}.`
        );
      } else {
        toast.error('Erè Aktivasyon', res.message);
      }
    } finally {
      setIsGeneratingAndActivating(false);
    }
  };

  const handleCopy = (keyText: string) => {
    navigator.clipboard.writeText(keyText);
    setCopiedKey(keyText);
    toast.info('Kle Kopye!', `${keyText} kopye nan clipboard ou.`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleActivateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activateKeyInput.trim()) return;

    const targetChurch = allChurches.find((c) => c.id === activateChurchId);
    const churchName =
      activateChurchId === 'GLOBAL'
        ? 'Tout Legliz (Global)'
        : targetChurch?.name || activateChurchId;

    const result = await validateAndActivateLicense(
      activateKeyInput,
      activateChurchId,
      churchName
    );

    if (result.success) {
      toast.success('Lisans Aktive!', result.message);
      setActivateKeyInput('');
      refreshParentOrStorage();
    } else {
      toast.error('Erè Aktivasyon', result.message);
    }
  };

  const handleExtendOrUpgrade = async (
    licenseKey: string,
    mode: 'extend_1_year' | 'upgrade_lifetime'
  ) => {
    const res = await extendOrUpgradeLicense(licenseKey, mode);
    if (res.success) {
      toast.success('Lisans Mete Ajou!', res.message);
      refreshParentOrStorage();
    } else {
      toast.error('Erè Mizajou Lisans', res.message);
    }
  };

  const handleExportLicensesCsv = () => {
    if (licenses.length === 0) {
      toast.warning('Okenn Lisans', 'Pa gen okenn lisans nan baz done a pou ekspòte.');
      return;
    }

    const headers = [
      'Kle Lisans',
      'ID Legliz',
      'Non Legliz',
      'Nivo (Tier)',
      'Estati',
      'Dat Kreye',
      'Dat Ekspirasyon',
      ' San Piblisite (Ad-Free)',
      'Nòt',
    ];
    const rows = licenses.map((lic) => [
      lic.key,
      lic.churchId,
      `"${(lic.churchName || '').replace(/"/g, '""')}"`,
      lic.tier,
      lic.status,
      lic.issuedAt ? new Date(lic.issuedAt).toISOString().split('T')[0] : '',
      lic.expiresAt,
      lic.allowAdFree ? 'Wi' : 'Non',
      `"${(lic.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `omnichurch-lisans-${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(
      'Rapò Lisans Ekspòte (.CSV)',
      `${licenses.length} lisans ekspòte avèk siksè.`
    );
  };

  // Permanently delete a single license key from table
  const handleDeleteLicense = (keyToDelete: string, churchName?: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Efase Lisans Definitivman',
      message: `Èske w sèten ou vle efase lisans "${keyToDelete}" (${churchName || 'Legliz'}) definitivman nan baz done a? Aksyon sa a pa ka defèt.`,
      confirmText: 'Wi, Efase Definitivman',
      variant: 'danger',
      onConfirm: async () => {
        const res = await deleteLicensePermanently(keyToDelete);
        if (res.success) {
          toast.success('Lisans Efase!', res.message);
          refreshParentOrStorage();
        } else {
          toast.error('Erè', res.message);
        }
      },
    });
  };

  // Revoke or Reactivate a license key
  const handleToggleLicenseStatus = async (lic: ChurchLicense) => {
    const nextStatus: LicenseStatus = lic.status === 'active' ? 'revoked' : 'active';
    const res = await updateLicenseStatus(lic.key, nextStatus);
    if (res.success) {
      toast.info(
        nextStatus === 'revoked' ? 'Lisans Revoke' : 'Lisans Reyaktive',
        res.message
      );
      refreshParentOrStorage();
    } else {
      toast.error('Erè', res.message);
    }
  };

  // Direct Delete by Key or Church ID input
  const handleDirectDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = directTargetInput.trim();
    if (!target) return;

    setConfirmModal({
      isOpen: true,
      title: 'Efase Lisans pa Kle oswa ID Legliz',
      message: `Èske w sèten ou vle efase definitivman tout lisans ki koresponn ak "${target}" nan baz done a?`,
      confirmText: 'Efase Kounye a',
      variant: 'danger',
      onConfirm: async () => {
        const res = await deleteLicensePermanently(target);
        if (res.success) {
          toast.success('Lisans Efase nan Baz Done!', res.message);
          setDirectTargetInput('');
          refreshParentOrStorage();
        } else {
          toast.warning('Pa Jwenn Lisans', res.message);
        }
      },
    });
  };

  // Delete license for selected church in dropdown
  const handleDeleteForSelectedChurch = () => {
    const targetChurch = allChurches.find((c) => c.id === activateChurchId);
    const label =
      activateChurchId === 'GLOBAL'
        ? 'Tout Legliz (GLOBAL)'
        : `${targetChurch?.name || activateChurchId} (${activateChurchId})`;

    setConfirmModal({
      isOpen: true,
      title: 'Retire Lisans Legliz la',
      message: `Èske w vle retire epi efase definitivman lisans ki aktif sou legliz "${label}" nan baz done a?`,
      confirmText: 'Wi, Retire Lisans lan',
      variant: 'danger',
      onConfirm: async () => {
        const res = await deleteLicenseForChurch(activateChurchId);
        if (res.success) {
          toast.success('Lisans Legliz Efase!', res.message);
          refreshParentOrStorage();
        } else {
          toast.warning('Okenn Lisans', res.message);
        }
      },
    });
  };

  // Purge ALL licenses
  const handlePurgeAllLicenses = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Efase TOUT Lisans nan Baz Done a',
      message: `ATANSYON: Aksyon sa a pral efase TOUT (${licenses.length}) lisans ki anrejistre nan sistèm nan definitivman. Èske w sèten?`,
      confirmText: 'Wi, Efase Tout Lisans',
      variant: 'danger',
      onConfirm: async () => {
        const res = await purgeAllLicensesPermanently();
        toast.success(
          'Baz Done Lisans Netwaye!',
          `${res.purgedCount} lisans efase definitivman.`
        );
        refreshParentOrStorage();
      },
    });
  };

  const getTierDetails = (tier: LicenseTier) => {
    switch (tier) {
      case 'enterprise_lifetime':
        return {
          label: 'Enterprise Pou Tout Tan (Lifetime)',
          badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          desc: 'Manm san limit • Senkronizasyon • San Piblisite • Pa janm ekspire',
        };
      case 'pro_annual':
        return {
          label: 'Pro Anyèl (365 Jou)',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          desc: 'Jiska 2,500 manm • Senkronizasyon • San Piblisite • Valab 1 ane',
        };
      case 'trial':
        return {
          label: 'Esè 30 Jou (Trial)',
          badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
          desc: 'Jiska 200 manm • Valab 30 jou pou teste sistèm nan',
        };
      default:
        return {
          label: 'Pèsonalize (Custom)',
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          desc: 'Konfigirasyon espesyal',
        };
    }
  };

  const filteredLicenses = licenses.filter((lic) => {
    if (statusFilter !== 'all' && lic.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      lic.key.toLowerCase().includes(q) ||
      lic.churchId.toLowerCase().includes(q) ||
      (lic.churchName || '').toLowerCase().includes(q) ||
      lic.tier.toLowerCase().includes(q) ||
      (lic.notes || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Master License Lockout Switch */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
              settings.enforceLicenseLockout
                ? 'bg-amber-400/20 border-amber-400/40 text-amber-300'
                : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
            }`}
          >
            {settings.enforceLicenseLockout ? (
              <Lock className="w-6 h-6" />
            ) : (
              <Unlock className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-extrabold text-white">
                Kontwòl Egzijans Lisans (License Enforcement)
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                  settings.enforceLicenseLockout
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {settings.enforceLicenseLockout ? 'STRIK (OBLIGATWA)' : 'MÒD LIB / ESÈ'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Lè opsyon sa a aktive, legliz ki pa gen yon kle lisans aktif ap wè yon fenèt ki mande yo antre kle lisans yo. Deplwaman sa a kontwole tout legliz yo an tan reyèl.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            onUpdateSettings({ enforceLicenseLockout: !settings.enforceLicenseLockout })
          }
          className={`px-5 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            settings.enforceLicenseLockout
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-lg shadow-amber-400/20'
          }`}
        >
          {settings.enforceLicenseLockout ? (
            <>
              <Unlock className="w-4 h-4" />
              <span>Dezaktive Egzijans Lisans</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span>Aktive Egzijans Lisans (1-Click)</span>
            </>
          )}
        </button>
      </div>

      {/* Live License Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Total Lisans
          </span>
          <span className="text-2xl font-black text-white font-mono mt-1 block">
            {stats.total}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Anrejistre nan sistèm nan
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
            Lisans Aktif
          </span>
          <span className="text-2xl font-black text-emerald-300 font-mono mt-1 block">
            {stats.active}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Pwoteksyon Ad-Free aktif
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-purple-500/30">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 block">
            Pou Tout Tan (Lifetime)
          </span>
          <span className="text-2xl font-black text-purple-300 font-mono mt-1 block">
            {stats.lifetime}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Manm san limit • Pa ekspire
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block">
            Pro Anyèl (365 Jou)
          </span>
          <span className="text-2xl font-black text-amber-300 font-mono mt-1 block">
            {stats.proAnnual}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Abònman anyèl aktif
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300 block">
            Esè 30 Jou / Revoke
          </span>
          <span className="text-2xl font-black text-sky-300 font-mono mt-1 block">
            {stats.trial} <span className="text-xs text-slate-500">/ {stats.revokedOrExpired}</span>
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Esè aktif / Sispann
          </span>
        </div>
      </div>

      {/* 2. License Generator & Direct Activation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Key Generator + 1-Click Activate */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h4 className="font-bold text-sm text-white">
                Jeneratè & Aktivasyon Lisans (1-Click)
              </h4>
            </div>
            <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
              OMNI-PRO ENGINE
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1 font-medium">
                Chwazi Legliz Sib la
              </label>
              <select
                value={targetChurchId}
                onChange={(e) => {
                  setTargetChurchId(e.target.value);
                  setActivateChurchId(e.target.value);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
              >
                <option value="GLOBAL">🌍 GLOBAL (Valab pou nenpòt legliz)</option>
                {allChurches.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    ⛪ {ch.name} ({ch.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-medium">
                Nivo Lisans (License Tier)
              </label>
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value as LicenseTier)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
              >
                <option value="enterprise_lifetime">
                  👑 Enterprise Pou Tout Tan (Lifetime - San Limit)
                </option>
                <option value="pro_annual">⭐ Pro Anyèl (365 Jou - 2,500 Manm)</option>
                <option value="trial">⏱️ Esè 30 Jou (Trial - 200 Manm)</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1.5">
                {getTierDetails(selectedTier).desc}
              </p>
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-medium">
                Nòt Referans sou Lisans lan (Opsyonèl)
              </label>
              <input
                type="text"
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Egz: Peye pa MonCash / Pastè Jean / Kontra 2026..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleGenerateOnly}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Key className="w-4 h-4" />
                <span>Jenere Kle Sèlman</span>
              </button>

              <button
                type="button"
                disabled={isGeneratingAndActivating}
                onClick={handleGenerateAndActivateNow}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-400/20 cursor-pointer transition-all disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                <span>
                  {isGeneratingAndActivating
                    ? 'Ap Aktive...'
                    : 'Jenere & Aktive Dirèkteman'}
                </span>
              </button>
            </div>

            {generatedKey && (
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-400/40 flex items-center justify-between gap-2 mt-3">
                <div className="truncate">
                  <span className="text-[10px] text-slate-400 block">
                    Dènye Kle ki Jenere:
                  </span>
                  <span className="font-mono text-sm font-black text-amber-300 tracking-wider">
                    {generatedKey}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(generatedKey)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {copiedKey === generatedKey ? (
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
            )}
          </div>
        </div>

        {/* Manual Activation & Direct Removal */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-5">
          <form onSubmit={handleActivateManual} className="space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h4 className="font-bold text-sm text-white">
                Aktive yon Kle Lisans sou yon Legliz
              </h4>
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-medium">
                Legliz pou Resevwa oswa Jere Lisans lan
              </label>
              <div className="flex gap-2">
                <select
                  value={activateChurchId}
                  onChange={(e) => setActivateChurchId(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-400"
                >
                  <option value="GLOBAL">🌍 GLOBAL (Tout Legliz)</option>
                  {allChurches.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      ⛪ {ch.name} ({ch.id})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleDeleteForSelectedChurch}
                  title="Efase lisans ki aktif sou legliz sa a"
                  className="px-3 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Retire Lisans Legliz</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-medium">
                Kole Kle Lisans lan (OMNI-...)
              </label>
              <input
                type="text"
                required
                value={activateKeyInput}
                onChange={(e) => setActivateKeyInput(e.target.value)}
                placeholder="OMNI-CH001-PRO-8492-7210"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono uppercase focus:outline-none focus:border-emerald-400"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Valide & Aktive Kle Lisans</span>
            </button>
          </form>

          {/* Direct Delete by License Key or Church ID */}
          <div className="pt-4 border-t border-slate-800">
            <form onSubmit={handleDirectDeleteSubmit} className="space-y-2.5 text-xs">
              <label className="text-rose-300 font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Efase Definitivman pa Kle Lisans oswa ID Legliz</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={directTargetInput}
                  onChange={(e) => setDirectTargetInput(e.target.value)}
                  placeholder="Antre OMNI-... oswa ID Legliz"
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-rose-500/30 text-white font-mono text-xs focus:outline-none focus:border-rose-400"
                />
                <button
                  type="submit"
                  disabled={!directTargetInput.trim()}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Efase nan Baz Done</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* 3. Active & Registered Licenses Table */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>Lisans Anrejistre nan Sistèm nan ({filteredLicenses.length})</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Jere tout lisans legliz yo an tan reyèl: pwolonje +1 ane, pase an Pou Tout Tan, sispann oswa ekspòte rapò ofisyèl.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Chèche kle oswa legliz..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
            >
              <option value="all">Tout Estati ({licenses.length})</option>
              <option value="active">Aktif Sèlman ({stats.active})</option>
              <option value="revoked">Revoke / Sispann</option>
              <option value="expired">Ekspire</option>
            </select>

            {/* Export CSV Report Button (Production Replacement) */}
            {licenses.length > 0 && (
              <button
                type="button"
                onClick={handleExportLicensesCsv}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                title="Telechaje rapò tout lisans yo an fòma CSV (Excel)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ekspòte Rapò (.CSV)</span>
              </button>
            )}

            {/* Purge ALL Licenses Button */}
            {licenses.length > 0 && (
              <button
                type="button"
                onClick={handlePurgeAllLicenses}
                className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                title="Efase tout lisans ki nan baz done a"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Efase Tout ({licenses.length})</span>
              </button>
            )}
          </div>
        </div>

        {filteredLicenses.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
            Okenn lisans pa koresponn ak rechèch la nan baz done a kounye a. Sèvi ak jeneratè anlè a pou kreye epi aktive yon lisans pou yon legliz.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase">
                  <th className="py-2.5 px-3">Kle Lisans</th>
                  <th className="py-2.5 px-3">Legliz</th>
                  <th className="py-2.5 px-3">Nivo (Tier)</th>
                  <th className="py-2.5 px-3">Ekspirasyon & Piblisite</th>
                  <th className="py-2.5 px-3">Estati</th>
                  <th className="py-2.5 px-3 text-right">Aksyon Pwodiksyon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLicenses.map((lic) => {
                  const tierInfo = getTierDetails(lic.tier);
                  const isLifetime = lic.tier === 'enterprise_lifetime' || lic.expiresAt === 'never';
                  return (
                    <tr key={lic.key} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-amber-300">
                        <div className="flex items-center gap-1.5">
                          <span>{lic.key}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(lic.key)}
                            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title="Kopye kle lisans lan"
                          >
                            {copiedKey === lic.key ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        {lic.notes && (
                          <span className="block text-[10px] font-sans font-normal text-slate-400 mt-0.5 max-w-xs truncate">
                            {lic.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-200 font-semibold">
                        <div>{lic.churchName || lic.churchId}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          ID: {lic.churchId}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${tierInfo.badge}`}
                        >
                          {tierInfo.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300 font-mono">
                        <div>
                          {lic.expiresAt === 'never' ? (
                            <span className="text-purple-300 font-bold">Pou Tout Tan ( ∞ )</span>
                          ) : (
                            <span>Jiska {lic.expiresAt}</span>
                          )}
                        </div>
                        {lic.allowAdFree && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-sans font-bold text-emerald-400 mt-0.5">
                            <CheckCircle2 className="w-3 h-3" /> San Piblisite (Ad-Free)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            lic.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : lic.status === 'revoked'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {lic.status === 'active'
                            ? 'AKTIF'
                            : lic.status === 'revoked'
                            ? 'REVOKE'
                            : 'EKSPIRE'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {!isLifetime && (
                            <button
                              type="button"
                              onClick={() => handleExtendOrUpgrade(lic.key, 'extend_1_year')}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                              title="Pwolonje dat ekspirasyon lisans sa a pou +1 ane (365 jou)"
                            >
                              <CalendarPlus className="w-3.5 h-3.5" />
                              <span>+1 Ane</span>
                            </button>
                          )}

                          {!isLifetime && (
                            <button
                              type="button"
                              onClick={() => handleExtendOrUpgrade(lic.key, 'upgrade_lifetime')}
                              className="px-2.5 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                              title="Pase lisans sa a an Enterprise Pou Tout Tan (Lifetime)"
                            >
                              <Crown className="w-3.5 h-3.5" />
                              <span>Lifetime</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleToggleLicenseStatus(lic)}
                            className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                              lic.status === 'active'
                                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            }`}
                            title={
                              lic.status === 'active'
                                ? 'Revoke / Sispann lisans sa a'
                                : 'Reyaktive lisans sa a'
                            }
                          >
                            {lic.status === 'active' ? (
                              <>
                                <Ban className="w-3.5 h-3.5" />
                                <span>Sispann</span>
                              </>
                            ) : (
                              <>
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Aktive</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteLicense(lic.key, lic.churchName)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                            title="Efase lisans sa a definitivman nan baz done a"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Efase</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={async () => {
          await confirmModal.onConfirm();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmButtonText={confirmModal.confirmText}
      />
    </div>
  );
};
