import React, { useState } from 'react';
import {
  Church,
  DeveloperSettings,
  Language,
  LicenseTier,
} from '../../types';
import {
  Building2,
  Search,
  Users,
  Calendar,
  CheckCircle2,
  KeyRound,
  Download,
  ExternalLink,
  Shield,
  Zap,
  Award,
  Sparkles,
  Wrench,
  Trash2,
  Check,
  Plus,
  RefreshCw,
} from 'lucide-react';
import {
  getMembersByChurch,
  getServicesByChurch,
  getAttendanceByChurch,
} from '../../utils/storage';
import {
  generateLicenseKey,
  validateAndActivateLicense,
  deleteLicensePermanently,
} from '../../utils/developerStorage';
import { useToast } from '../../context/ToastContext';

interface DevChurchesTabProps {
  allChurches: Church[];
  currentChurch: Church | null;
  settings: DeveloperSettings;
  onUpdateSettings: (updated: Partial<DeveloperSettings>) => Promise<void>;
  onSelectChurch?: (church: Church) => void;
  onRefreshChurches?: () => void;
  language?: Language;
}

export const DevChurchesTab: React.FC<DevChurchesTabProps> = ({
  allChurches,
  currentChurch,
  settings,
  onUpdateSettings,
  onSelectChurch,
  onRefreshChurches,
  language = 'ht',
}) => {
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [tierForInstantIssue, setTierForInstantIssue] = useState<LicenseTier>('lifetime_unlimited');
  const [isActivatingId, setIsActivatingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshChurches = () => {
    setIsRefreshing(true);
    if (onRefreshChurches) {
      onRefreshChurches();
    }
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('Flòt Legliz yo Rafrechi', 'Lis tout legliz yo ak lisans yo mete ajou.');
    }, 450);
  };

  // Filtered churches
  const filteredChurches = allChurches.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.id || '').toLowerCase().includes(q) ||
      (c.code && (c.code || '').toLowerCase().includes(q)) ||
      (c.pastor && (c.pastor || '').toLowerCase().includes(q)) ||
      (c.city && (c.city || '').toLowerCase().includes(q))
    );
  });

  // Check license for a church
  const getChurchLicense = (churchId: string) => {
    return settings.licenses.find(
      (l) => l.churchId.toUpperCase() === churchId.toUpperCase() || l.churchId === 'GLOBAL'
    );
  };

  // Instant 1-Click License Activation for a church
  const handleInstantLicense = async (church: Church, tier: LicenseTier) => {
    setIsActivatingId(church.id);
    try {
      const key = generateLicenseKey(church.id, tier);
      const res = await validateAndActivateLicense(key, church.id, church.name);
      if (res.success) {
        toast.success(
          'Lisans Aktive nan 1 Klik!',
          `Legliz "${church.name}" resevwa yon lisans ${tier.toUpperCase()} ki valab kounye a.`
        );
        if (onRefreshChurches) onRefreshChurches();
      } else {
        toast.error('Erè Aktivasyon', res.message);
      }
    } catch (err: any) {
      toast.error('Erè', err?.message);
    } finally {
      setIsActivatingId(null);
    }
  };

  // Export specific church data
  const handleExportChurchData = (church: Church) => {
    const members = getMembersByChurch(church.id);
    const services = getServicesByChurch(church.id);
    const attendance = getAttendanceByChurch(church.id);

    const payload = {
      exportedAt: new Date().toISOString(),
      church,
      members,
      services,
      attendance,
      stats: {
        totalMembers: members.length,
        totalServices: services.length,
        totalAttendance: attendance.length,
      },
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `${church.id}_${church.name.replace(/\s+/g, '_')}_data.json`);
    dlAnchor.click();
    toast.success('Done Legliz Ekspòte!', `Fichye JSON pou ${church.name} telechaje avèk siksè.`);
  };

  // Revoke license for church
  const handleRevokeLicense = async (church: Church) => {
    if (!confirm(`Èske w vle retire lisans legliz "${church.name}"?`)) return;
    await deleteLicensePermanently(church.id);
    toast.info('Lisans Retire', `Lisans legliz ${church.name} retire nan sistèm nan.`);
    if (onRefreshChurches) onRefreshChurches();
  };

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="p-6 rounded-3xl bg-[#0B1120] border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Building2 className="w-5 h-5 text-amber-400" />
            <h3 className="font-extrabold text-base text-white">
              Jesyon Global Flòt Legliz yo (Multi-Tenant Fleet)
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Total: <span className="font-mono font-bold text-white">{allChurches.length}</span> legliz anrejistre nan platfòm lan
          </p>
        </div>

        {/* Search Bar & Refresh */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Chèche pa non, vil, kòd, pastè..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>
          <button
            type="button"
            id="btn-dev-refresh-churches"
            onClick={handleRefreshChurches}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            title="Rafrechi Flòt Legliz yo"
          >
            <RefreshCw className={`w-4 h-4 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* CHURCHES LIST */}
      <div className="space-y-4">
        {filteredChurches.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-[#0B1120] border border-slate-800 text-slate-400 space-y-2">
            <Building2 className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <div className="font-bold text-sm text-white">Okenn legliz pa jwenn</div>
            <p className="text-xs">Pa gen okenn legliz ki koresponn ak rechèch ou a.</p>
          </div>
        ) : (
          filteredChurches.map((church) => {
            const isCurrent = currentChurch?.id === church.id;
            const churchMembers = getMembersByChurch(church.id);
            const churchServices = getServicesByChurch(church.id);
            const churchAttendance = getAttendanceByChurch(church.id);
            const lic = getChurchLicense(church.id);
            const isLicensed = !!lic && lic.status === 'active';

            return (
              <div
                key={church.id}
                className={`p-5 sm:p-6 rounded-3xl border transition-all ${
                  isCurrent
                    ? 'bg-gradient-to-r from-[#0B1120] via-slate-900 to-[#0B1120] border-amber-400/60 ring-1 ring-amber-400/30 shadow-2xl'
                    : 'bg-[#0B1120] border-slate-800/80 hover:border-slate-700 shadow-xl'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  {/* Left: Church Info */}
                  <div className="space-y-2.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-black text-white truncate">
                        {church.name}
                      </h4>
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-300 font-mono text-[10px] font-bold border border-slate-700">
                        {church.id} {church.code ? `• ${church.code}` : ''}
                      </span>
                      {isCurrent && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black border border-amber-400/40">
                          LEGLIZ KOURAN AN NAN APP
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      {church.pastor && (
                        <div>Pastè: <span className="text-slate-200 font-medium">{church.pastor}</span></div>
                      )}
                      {church.city && (
                        <div>Vil: <span className="text-slate-200 font-medium">{church.city}</span></div>
                      )}
                      {church.phone && (
                        <div>Telefòn: <span className="text-slate-200 font-mono font-medium">{church.phone}</span></div>
                      )}
                      {church.adminGoogleEmail && (
                        <div>Admin: <span className="text-slate-200 font-mono font-medium">{church.adminGoogleEmail}</span></div>
                      )}
                    </div>

                    {/* Stats pills */}
                    <div className="flex items-center gap-2 pt-1">
                      <div className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1.5 text-[11px] font-mono">
                        <Users className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-slate-300 font-bold">{churchMembers.length}</span>
                        <span className="text-slate-500">manm</span>
                      </div>
                      <div className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1.5 text-[11px] font-mono">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-slate-300 font-bold">{churchServices.length}</span>
                        <span className="text-slate-500">kilt</span>
                      </div>
                      <div className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1.5 text-[11px] font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-slate-300 font-bold">{churchAttendance.length}</span>
                        <span className="text-slate-500">prezans</span>
                      </div>
                      <div className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1.5 text-[11px] font-mono">
                        <Shield
                          className={`w-3.5 h-3.5 ${
                            church.rncVerificationStatus === 'verified'
                              ? 'text-emerald-400'
                              : church.rncVerificationStatus === 'pending'
                              ? 'text-amber-400 animate-pulse'
                              : church.rncVerificationStatus === 'rejected'
                              ? 'text-rose-400'
                              : 'text-slate-600'
                          }`}
                        />
                        <span className="text-slate-400">RNC:</span>
                        <span
                          className={
                            church.rncVerificationStatus === 'verified'
                              ? 'text-emerald-300 font-bold'
                              : church.rncVerificationStatus === 'pending'
                              ? 'text-amber-300 font-bold'
                              : church.rncVerificationStatus === 'rejected'
                              ? 'text-rose-300 font-bold'
                              : 'text-slate-500'
                          }
                        >
                          {church.rncVerificationStatus === 'verified'
                            ? 'Verifye ✓'
                            : church.rncVerificationStatus === 'pending'
                            ? 'An Atant ⏳'
                            : church.rncVerificationStatus === 'rejected'
                            ? 'Rejte ⚠️'
                            : 'Poko soumèt'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: License & Actions */}
                  <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-start sm:items-center gap-3 shrink-0">
                    {/* License Badge */}
                    <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 min-w-[160px]">
                      <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                        <span>Lisans</span>
                        <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      {isLicensed ? (
                        <div className="mt-1">
                          <div className="text-xs font-black text-emerald-400 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>{lic.tier.toUpperCase().replace('_', ' ')}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[140px]">
                            {lic.key}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1">
                          <div className="text-xs font-bold text-amber-400">PA GEN LISANS AKTIF</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Mòd lib oswa esè</div>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Switch Active Church */}
                      {onSelectChurch && !isCurrent && (
                        <button
                          type="button"
                          onClick={() => onSelectChurch(church)}
                          className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Baskile sou legliz sa a pou w wè koòdone l"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                          <span>Chanje sou li</span>
                        </button>
                      )}

                      {/* 1-Click License Issue */}
                      {!isLicensed ? (
                        <button
                          type="button"
                          disabled={isActivatingId === church.id}
                          onClick={() => handleInstantLicense(church, 'enterprise_lifetime')}
                          className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer active:scale-95 transition-all"
                        >
                          <Zap className="w-3.5 h-3.5 fill-current" />
                          <span>{isActivatingId === church.id ? 'Ap aktive...' : 'Aktive Lifetime'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRevokeLicense(church)}
                          className="px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 text-xs font-bold transition-colors cursor-pointer"
                          title="Retire lisans sa a"
                        >
                          Revoke
                        </button>
                      )}

                      {/* Export Church Data */}
                      <button
                        type="button"
                        onClick={() => handleExportChurchData(church)}
                        className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                        title="Ekspòte tout done legliz sa a (JSON)"
                      >
                        <Download className="w-4 h-4 text-amber-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
