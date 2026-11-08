import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  DeveloperSettings,
  SponsorItem,
  Language,
} from '../../types';
import {
  purgeDemoSponsors,
} from '../../utils/developerStorage';
import { useToast } from '../../context/ToastContext';
import {
  HeartHandshake,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Sparkles,
  X,
  Radio,
} from 'lucide-react';

export interface DevSponsorsTabProps {
  settings: DeveloperSettings;
  onUpdateSettings: (updated: Partial<DeveloperSettings>) => Promise<void>;
  language?: Language;
}

export const DevSponsorsTab: React.FC<DevSponsorsTabProps> = ({
  settings,
  onUpdateSettings,
  language = 'ht',
}) => {
  const toast = useToast();

  // Sponsor Modal State
  const [isSponsorModalOpen, setIsSponsorModalOpen] = useState<boolean>(false);
  const [editingSponsor, setEditingSponsor] = useState<SponsorItem | null>(null);
  const [sponsorName, setSponsorName] = useState<string>('');
  const [sponsorLogoUrl, setSponsorLogoUrl] = useState<string>('');
  const [sponsorTagline, setSponsorTagline] = useState<string>('');
  const [sponsorCategory, setSponsorCategory] = useState<SponsorItem['category']>('telecom');
  const [sponsorTier, setSponsorTier] = useState<SponsorItem['tier']>('gold');
  const [sponsorTargetUrl, setSponsorTargetUrl] = useState<string>('');
  const [sponsorActive, setSponsorActive] = useState<boolean>(true);

  // Open Add Sponsor
  const handleOpenAddSponsor = () => {
    setEditingSponsor(null);
    setSponsorName('');
    setSponsorLogoUrl('');
    setSponsorTagline('');
    setSponsorCategory('telecom');
    setSponsorTier('gold');
    setSponsorTargetUrl('');
    setSponsorActive(true);
    setIsSponsorModalOpen(true);
  };

  // Open Edit Sponsor
  const handleOpenEditSponsor = (s: SponsorItem) => {
    setEditingSponsor(s);
    setSponsorName(s.name);
    setSponsorLogoUrl(s.logoUrl);
    setSponsorTagline(s.tagline || '');
    setSponsorCategory(s.category);
    setSponsorTier(s.tier);
    setSponsorTargetUrl(s.targetUrl);
    setSponsorActive(s.active);
    setIsSponsorModalOpen(true);
  };

  // Save Sponsor
  const handleSaveSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sponsorName.trim() || !sponsorTargetUrl.trim()) {
      toast.error('Enfòmasyon Manke', 'Tanpri mete non ak lyen sit sponsor la.');
      return;
    }

    const currentList = settings.sponsors || [];
    let updatedList: SponsorItem[];

    if (editingSponsor) {
      updatedList = currentList.map((s) =>
        s.id === editingSponsor.id
          ? {
              ...s,
              name: sponsorName.trim(),
              logoUrl: sponsorLogoUrl.trim() || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=400&q=80',
              tagline: sponsorTagline.trim(),
              category: sponsorCategory,
              tier: sponsorTier,
              targetUrl: sponsorTargetUrl.trim(),
              active: sponsorActive,
            }
          : s
      );
    } else {
      const newSponsor: SponsorItem = {
        id: `sp_${Date.now()}`,
        name: sponsorName.trim(),
        logoUrl: sponsorLogoUrl.trim() || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=400&q=80',
        tagline: sponsorTagline.trim(),
        category: sponsorCategory,
        tier: sponsorTier,
        targetUrl: sponsorTargetUrl.trim(),
        active: sponsorActive,
        displayOrder: currentList.length + 1,
        createdAt: new Date().toISOString(),
      };
      updatedList = [newSponsor, ...currentList];
    }

    await onUpdateSettings({ sponsors: updatedList });
    setIsSponsorModalOpen(false);
    toast.success(
      editingSponsor ? 'Sponsor Modifye' : 'Sponsor Ajoute',
      `Sponsor "${sponsorName}" anrejistre avèk siksè.`
    );
  };

  // Delete Sponsor
  const handleDeleteSponsor = async (id: string, name: string) => {
    if (confirm(`Èske w vle retire sponsor "${name}" la nan lis la?`)) {
      const updatedList = (settings.sponsors || []).filter((s) => s.id !== id);
      await onUpdateSettings({ sponsors: updatedList });
      toast.info('Sponsor Retire', `Sponsor "${name}" pa nan lis la ankò.`);
    }
  };

  // Toggle Sponsor Active
  const handleToggleSponsorActive = async (id: string) => {
    const updatedList = (settings.sponsors || []).map((s) =>
      s.id === id ? { ...s, active: !s.active } : s
    );
    await onUpdateSettings({ sponsors: updatedList });
  };

  // Purge Demo Sponsors
  const handlePurgeDemoSponsors = async () => {
    if (confirm('Èske w vle retire tout sponsor demo nan lis la?')) {
      const res = await purgeDemoSponsors();
      toast.success(
        'Sponsò Demo Netwaye!',
        `${res.purgedCount} sponsò demo retire nan sistèm nan.`
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* SPONSOR ENGINE SETTINGS & CONTROLS */}
      <div className="p-6 rounded-3xl bg-[#0B1120] border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-white">
                Sponsor & Corporate Partners Engine
              </h3>
              <p className="text-xs text-slate-400">
                Pèmèt konpayi ak antrepriz afiche mak yo nan footer app la pou tout legliz
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handlePurgeDemoSponsors}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Efase tout sponsò demo ki te vin padefo yo"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Efase Sponsò Demo</span>
            </button>

            <button
              type="button"
              id="btn-add-new-sponsor"
              onClick={handleOpenAddSponsor}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-400/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
              <span>Ajoute yon Sponsor</span>
            </button>
          </div>
        </div>

        {/* Global Footer Banner Display Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs cursor-pointer">
            <div>
              <span className="text-white font-bold block">Montre Bannè Sponsò nan Footer</span>
              <span className="text-[11px] text-slate-400 block">Afiche logo patnè yo anba chak paj</span>
            </div>
            <input
              type="checkbox"
              checked={settings.sponsorsEnabled}
              onChange={(e) => onUpdateSettings({ sponsorsEnabled: e.target.checked })}
              className="w-5 h-5 accent-amber-400 rounded cursor-pointer"
            />
          </label>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
            <div>
              <span className="text-white font-bold block">Total Patnè Anrejistre</span>
              <span className="text-[11px] text-slate-400 block">
                {(settings.sponsors || []).filter((s) => s.active).length} aktif sou {(settings.sponsors || []).length} total
              </span>
            </div>
            <span className="px-3 py-1 rounded-xl bg-amber-400/10 text-amber-300 border border-amber-400/20 font-mono font-black text-sm">
              {(settings.sponsors || []).length}
            </span>
          </div>
        </div>
      </div>

      {/* SPONSOR LIST */}
      <div className="p-6 rounded-3xl bg-[#0B1120] border border-slate-800 space-y-4 shadow-xl">
        <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
          <HeartHandshake className="w-4 h-4 text-amber-400" />
          <span>Lis Konpayi & Mak Patnè ({ (settings.sponsors || []).length })</span>
        </h3>

        {(settings.sponsors || []).length === 0 ? (
          <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
            <HeartHandshake className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400 font-medium">
              Okenn patnè pa anrejistre pou kounye a.
            </p>
            <button
              type="button"
              onClick={handleOpenAddSponsor}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold"
            >
              + Ajoute Premye Patnè a
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(settings.sponsors || []).map((sponsor) => (
              <div
                key={sponsor.id}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-3 shadow-md"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase ${
                        sponsor.tier === 'platinum'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : sponsor.tier === 'gold'
                          ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                          : sponsor.tier === 'silver'
                          ? 'bg-slate-300/20 text-slate-200 border border-slate-300/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {sponsor.tier}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggleSponsorActive(sponsor.id)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition ${
                        sponsor.active
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {sponsor.active ? 'Aktif' : 'Inaktif'}
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <img
                      src={sponsor.logoUrl}
                      alt={sponsor.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-xl object-contain bg-slate-900 border border-slate-800 p-1 shrink-0"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=400&q=80';
                      }}
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{sponsor.name}</h4>
                      {sponsor.tagline && (
                        <p className="text-[10px] text-slate-400 truncate">{sponsor.tagline}</p>
                      )}
                      <span className="text-[9px] font-mono text-amber-400/80 block uppercase">
                        {sponsor.category}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <a
                    href={sponsor.targetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-slate-400 hover:text-amber-400 flex items-center gap-1 truncate max-w-[150px]"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    <span className="truncate">{sponsor.targetUrl}</span>
                  </a>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditSponsor(sponsor)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                      title="Modifye"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSponsor(sponsor.id, sponsor.name)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
                      title="Efase"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SPONSOR CREATE / EDIT MODAL */}
      {isSponsorModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg rounded-3xl bg-slate-900 border border-amber-400/40 p-6 text-white shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-black text-sm flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-amber-400" />
                <span>{editingSponsor ? 'Modifye Sponsor' : 'Ajoute yon Nouvo Sponsor'}</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsSponsorModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSponsor} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Non Sponsor / Patnè:</label>
                <input
                  type="text"
                  required
                  value={sponsorName}
                  onChange={(e) => setSponsorName(e.target.value)}
                  placeholder="eg. Digicel Business"
                  className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Logo URL (Imaj):</label>
                <input
                  type="url"
                  value={sponsorLogoUrl}
                  onChange={(e) => setSponsorLogoUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Slogan / Deskripsyon Kout:</label>
                <input
                  type="text"
                  value={sponsorTagline}
                  onChange={(e) => setSponsorTagline(e.target.value)}
                  placeholder="eg. Solisyon Kominikasyon & Entènèt"
                  className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Kategori:</label>
                  <select
                    value={sponsorCategory}
                    onChange={(e) => setSponsorCategory(e.target.value as any)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="telecom">Telekominikasyon</option>
                    <option value="finance">Finans & Bank</option>
                    <option value="technology">Teknoloji & Cloud</option>
                    <option value="media">Medya & Radyo</option>
                    <option value="education">Edikasyon</option>
                    <option value="general">Jeneral</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Nivo / Tier:</label>
                  <select
                    value={sponsorTier}
                    onChange={(e) => setSponsorTier(e.target.value as any)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="platinum">Platinum (Pi Wo)</option>
                    <option value="gold">Gold</option>
                    <option value="silver">Silver</option>
                    <option value="bronze">Bronze</option>
                    <option value="partner">Partner</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Lyen Sit Wèb oswa Rezo Sosyal (URL klikeb):
                </label>
                <input
                  type="url"
                  required
                  value={sponsorTargetUrl}
                  onChange={(e) => setSponsorTargetUrl(e.target.value)}
                  placeholder="https://www.digicelgroup.com oswa https://instagram.com/..."
                  className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-sponsor-active"
                  checked={sponsorActive}
                  onChange={(e) => setSponsorActive(e.target.checked)}
                  className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                />
                <label htmlFor="chk-sponsor-active" className="text-slate-300 cursor-pointer font-bold">
                  Aktive sponsor sa a nan footer la
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSponsorModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white cursor-pointer"
                >
                  Anile
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/20 cursor-pointer"
                >
                  {editingSponsor ? 'Sove Modifikasyon' : 'Ajoute Sponsor'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
