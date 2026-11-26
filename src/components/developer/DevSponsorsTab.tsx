import React, { useState, useMemo } from 'react';
import {
  DeveloperSettings,
  SponsorItem,
  SponsorTier,
  Language,
} from '../../types';
import { useToast } from '../../context/ToastContext';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import {
  HeartHandshake,
  Plus,
  Trash2,
  ExternalLink,
  Eye,
  EyeOff,
  Edit3,
  CheckCircle2,
  Image as ImageIcon,
  Award,
  ArrowUp,
  ArrowDown,
  Download,
  Gauge,
  ShieldCheck,
  Power,
} from 'lucide-react';

export interface DevSponsorsTabProps {
  settings: DeveloperSettings;
  onUpdateSettings: (partial: Partial<DeveloperSettings>) => Promise<void>;
  onRefreshSettings?: () => void;
  language?: Language;
}

export const DevSponsorsTab: React.FC<DevSponsorsTabProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const toast = useToast();

  // Sponsor Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [tier, setTier] = useState<SponsorTier>('gold');
  const [category, setCategory] = useState<SponsorItem['category']>('general');
  const [active, setActive] = useState(true);

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

  const sponsors = useMemo(() => {
    const raw = settings.sponsors || [];
    return [...raw].sort((a, b) => (a.displayOrder ?? 1) - (b.displayOrder ?? 1));
  }, [settings.sponsors]);

  const activeSponsors = useMemo(() => sponsors.filter((s) => s.active), [sponsors]);
  const isFooterBannerVisible = Boolean(
    settings.showSponsorsInFooter ?? settings.sponsorsEnabled ?? true
  );
  const marqueeSpeed = settings.sponsorMarqueeSpeed || 26;

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setTagline('');
    setLogoUrl('');
    setTargetUrl('');
    setTier('gold');
    setCategory('general');
    setActive(true);
  };

  const handleEditSponsor = (sponsor: SponsorItem) => {
    setEditingId(sponsor.id);
    setName(sponsor.name);
    setTagline(sponsor.tagline || '');
    setLogoUrl(sponsor.logoUrl);
    setTargetUrl(sponsor.targetUrl);
    setTier(sponsor.tier);
    setCategory(sponsor.category || 'general');
    setActive(sponsor.active);
  };

  const handleSaveSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !targetUrl.trim()) return;

    let normalizedUrl = targetUrl.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    const fallbackLogo =
      logoUrl.trim() ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        name.trim()
      )}&background=0D1527&color=F59E0B&bold=true&size=128`;

    if (editingId) {
      const updatedList = sponsors.map((item) =>
        item.id === editingId
          ? {
              ...item,
              name: name.trim(),
              tagline: tagline.trim(),
              logoUrl: fallbackLogo,
              targetUrl: normalizedUrl,
              tier,
              category,
              active,
            }
          : item
      );
      await onUpdateSettings({ sponsors: updatedList });
      toast.success(
        'Patnè Modifye!',
        `Enfòmasyon pou "${name.trim()}" mete ajou avèk siksè.`
      );
    } else {
      const newSponsor: SponsorItem = {
        id: `spon_${Date.now()}`,
        name: name.trim(),
        tagline: tagline.trim() || 'Patnè Ofisyèl OmniChurch',
        logoUrl: fallbackLogo,
        targetUrl: normalizedUrl,
        tier,
        category,
        active,
        displayOrder: sponsors.length + 1,
        createdAt: new Date().toISOString(),
      };
      await onUpdateSettings({ sponsors: [...sponsors, newSponsor] });
      toast.success(
        'Nouvo Patnè Ajoute!',
        `"${name.trim()}" ajoute nan lis patnè ofisyèl yo.`
      );
    }

    resetForm();
  };

  const handleToggleActive = async (id: string) => {
    const target = sponsors.find((s) => s.id === id);
    const updatedList = sponsors.map((item) =>
      item.id === id ? { ...item, active: !item.active } : item
    );
    await onUpdateSettings({ sponsors: updatedList });
    if (target) {
      toast.info(
        target.active ? 'Patnè Mete an Poz' : 'Patnè Aktive',
        `"${target.name}" ${target.active ? 'kache nan' : 'ap parèt nan'} pye paj aplikasyon an kounye a.`
      );
    }
  };

  const handleMoveSponsorOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sponsors.length) return;

    const reordered = [...sponsors];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    const withUpdatedOrder = reordered.map((item, idx) => ({
      ...item,
      displayOrder: idx + 1,
    }));

    await onUpdateSettings({ sponsors: withUpdatedOrder });
    toast.info('Lòd Afichaj Mete Ajou', `"${moved.name}" deplase nan pozisyon #${targetIndex + 1}.`);
  };

  const handleToggleAllSponsorsActive = async () => {
    if (sponsors.length === 0) return;
    const allCurrentlyActive = sponsors.every((s) => s.active);
    const nextState = !allCurrentlyActive;
    const updatedList = sponsors.map((s) => ({ ...s, active: nextState }));
    await onUpdateSettings({ sponsors: updatedList });
    toast.success(
      nextState ? 'Tout Patnè Aktive' : 'Tout Patnè Mete an Poz',
      nextState
        ? `Tout ${sponsors.length} patnè yo aktif nan banyè pye paj la kounye a.`
        : `Tout ${sponsors.length} patnè yo mete an poz tanporèman.`
    );
  };

  const handleExportSponsorsJson = () => {
    if (sponsors.length === 0) {
      toast.warning('Okenn Patnè', 'Pa gen okenn patnè pou ekspòte.');
      return;
    }
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(sponsors, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute(
      'download',
      `omnichurch-sponsors-${new Date().toISOString().split('T')[0]}.json`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(
      'Lis Patnè Ekspòte (.JSON)',
      `${sponsors.length} patnè ekspòte avèk siksè.`
    );
  };

  const handleDeleteSponsor = (id: string, sponsorName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Efase Patnè Definitivman',
      message: `Èske w sèten ou vle efase patnè "${sponsorName}" definitivman nan baz done a?`,
      confirmText: 'Wi, Efase Patnè a',
      variant: 'danger',
      onConfirm: async () => {
        const updatedList = sponsors.filter((item) => item.id !== id);
        await onUpdateSettings({ sponsors: updatedList });
        toast.success('Patnè Efase!', `"${sponsorName}" efase definitivman nan baz done a.`);
        if (editingId === id) resetForm();
      },
    });
  };

  // Purge ALL Sponsors
  const handlePurgeAllSponsors = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Efase TOUT Patnè yo',
      message: `ATANSYON: Èske w sèten ou vle efase TOUT (${sponsors.length}) patnè yo definitivman nan baz done a?`,
      confirmText: 'Wi, Efase Tout',
      variant: 'danger',
      onConfirm: async () => {
        await onUpdateSettings({ sponsors: [] });
        resetForm();
        toast.success('Tout Patnè Efase!', 'Lis patnè a vid kounye a.');
      },
    });
  };

  const getTierStyle = (t: SponsorTier) => {
    switch (t) {
      case 'platinum':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'gold':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'silver':
        return 'bg-slate-400/20 text-slate-200 border-slate-400/40';
      case 'bronze':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Sponsor Global Footer Bar Controls */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-extrabold text-white">
                Banyè Patnè & Sponsò Ofisyèl (Footer Banner)
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                  isFooterBannerVisible
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {isFooterBannerVisible
                  ? `${activeSponsors.length} PATNÈ AKTIF NAN PYE PAJ`
                  : 'BANYÈ KACHE'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Jere konpayi, medya, ak enstitisyon patnè k ap parèt anba aplikasyon an. Chak patnè gen logo, slogan, ak lyen dirèk ki ouvri sit ofisyèl li lè itilizatè klike sou li.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Marquee Speed Selector */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400 font-medium">Vitès:</span>
            <select
              value={marqueeSpeed}
              onChange={(e) =>
                onUpdateSettings({ sponsorMarqueeSpeed: Number(e.target.value) })
              }
              className="bg-transparent text-amber-300 font-bold focus:outline-none cursor-pointer"
              title="Chwazi vitès defilman banyè patnè yo nan pye paj la"
            >
              <option value={16} className="bg-slate-900 text-white">
                Rapid (16s)
              </option>
              <option value={26} className="bg-slate-900 text-white">
                Nòmal (26s)
              </option>
              <option value={40} className="bg-slate-900 text-white">
                Dous (40s)
              </option>
            </select>
          </div>

          {/* Toggle All Active/Pause */}
          {sponsors.length > 0 && (
            <button
              type="button"
              onClick={handleToggleAllSponsorsActive}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              title="Aktive oswa mete tout patnè yo an poz nan yon sèl klik"
            >
              <Power className="w-3.5 h-3.5" />
              <span>
                {sponsors.every((s) => s.active) ? 'Mete Tout an Poz' : 'Aktive Tout Patnè'}
              </span>
            </button>
          )}

          {/* Export JSON */}
          {sponsors.length > 0 && (
            <button
              type="button"
              onClick={handleExportSponsorsJson}
              className="px-3.5 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              title="Ekspòte lis patnè yo an fòma JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspòte (.JSON)</span>
            </button>
          )}

          {sponsors.length > 0 && (
            <button
              type="button"
              onClick={handlePurgeAllSponsors}
              className="px-3.5 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              title="Efase tout patnè nan baz done a"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Efase Tout ({sponsors.length})</span>
            </button>
          )}

          <label className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={isFooterBannerVisible}
              onChange={(e) =>
                onUpdateSettings({
                  showSponsorsInFooter: e.target.checked,
                  sponsorsEnabled: e.target.checked,
                })
              }
              className="rounded bg-slate-900 border-slate-700 text-amber-400 focus:ring-amber-400 w-4 h-4 cursor-pointer"
            />
            <span className="text-xs font-bold text-white">
              {isFooterBannerVisible ? 'Banyè Pye Paj Aktif' : 'Banyè Pye Paj Kache'}
            </span>
          </label>
        </div>
      </div>

      {/* Live Preview of Footer Banner */}
      {isFooterBannerVisible && activeSponsors.length > 0 && (
        <div className="p-4 rounded-2xl bg-[#090D16] border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" /> Previzyalizasyon an Dirèk Banyè Pye Paj la ({activeSponsors.length} Patnè Aktif)
            </span>
            <span className="text-slate-400 font-mono text-[10px]">
              Vitès defilman: {marqueeSpeed}s
            </span>
          </div>
          <div className="flex items-center gap-3 overflow-x-auto pb-1">
            {activeSponsors.map((spon) => (
              <a
                key={spon.id}
                href={spon.targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-400/50 shrink-0 transition-all group"
              >
                <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-950 border border-slate-700 flex items-center justify-center shrink-0">
                  {spon.logoUrl ? (
                    <img
                      src={spon.logoUrl}
                      alt={spon.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-white group-hover:text-amber-300">
                      {spon.name}
                    </span>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  </div>
                  {spon.tagline && (
                    <span className="text-[10px] text-slate-400 block max-w-[180px] truncate">
                      {spon.tagline}
                    </span>
                  )}
                </div>
                <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-amber-400 ml-1" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 2. Add / Edit Sponsor Form & Sponsors List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form (5 cols) */}
        <form
          onSubmit={handleSaveSponsor}
          className="lg:col-span-5 p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 h-fit"
        >
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-400" />
              <span>{editingId ? 'Modifye Patnè a' : 'Ajoute Nouvo Patnè / Sponsò'}</span>
            </h4>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
              >
                Anile Modifikasyon
              </button>
            )}
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1 font-medium">
                Non Konpayi / Sponsò a *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Egz: Sogebank / Radio Lumière / Konpayi..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-medium">
                Slogan / Deskripsyon Kout
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Egz: Patnè Finansye & Teknoloji Legliz yo"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-medium">
                Lyen Sit Web oswa Paj Rezo Sosyal (Target URL) *
              </label>
              <input
                type="text"
                required
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://www.example.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-medium">
                URL Logo / Imaj Patnè a (Opsyonèl)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://.../logo.png (Oswa kite vid pou logo otomatik)"
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-amber-400"
                />
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt="Preview"
                    className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1 font-medium">Nivo (Tier)</label>
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value as SponsorTier)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="platinum">💎 Platinum</option>
                  <option value="gold">🥇 Gold</option>
                  <option value="silver">🥈 Silver</option>
                  <option value="bronze">🥉 Bronze</option>
                  <option value="partner">🤝 Partner</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-medium">Kategori</label>
                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as SponsorItem['category'])
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="telecom">Telekominikasyon</option>
                  <option value="finance">Bank & Finans</option>
                  <option value="media">Medya & Radyo</option>
                  <option value="technology">Teknoloji</option>
                  <option value="education">Edikasyon / Biblik</option>
                  <option value="general">Jeneral</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-amber-400 focus:ring-amber-400"
              />
              <span className="text-slate-300 font-medium">
                Aktive patnè sa a imedyatman nan banyè pye paj la
              </span>
            </label>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 cursor-pointer transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{editingId ? 'Sove Modifikasyon an' : 'Ajoute nan Lis Patnè yo'}</span>
            </button>
          </div>
        </form>

        {/* Sponsors List (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Lis Patnè & Sponsò yo ({sponsors.length})</span>
            </h4>
            <span className="text-xs text-emerald-400 font-mono">
              {activeSponsors.length} Aktif kounye a
            </span>
          </div>

          {sponsors.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
              Okenn patnè pa anrejistre pou kounye a. Sèvi ak fòm agoch la pou ajoute yon patnè ofisyèl.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
              {sponsors.map((spon, idx) => (
                <div
                  key={spon.id}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    spon.active
                      ? 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-950/40 border-slate-900 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                      {spon.logoUrl ? (
                        <img
                          src={spon.logoUrl}
                          alt={spon.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-slate-500" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono text-slate-500">
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-sm text-white truncate">
                          {spon.name}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${getTierStyle(
                            spon.tier
                          )}`}
                        >
                          {spon.tier}
                        </span>
                      </div>
                      {spon.tagline && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {spon.tagline}
                        </p>
                      )}
                      <a
                        href={spon.targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:underline mt-0.5 font-mono truncate max-w-xs"
                      >
                        <span>{spon.targetUrl}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Reorder Up / Down */}
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveSponsorOrder(idx, 'up')}
                      title="Monte patnè sa a nan lòd afichaj la"
                      className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 disabled:opacity-30 cursor-pointer transition-colors"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === sponsors.length - 1}
                      onClick={() => handleMoveSponsorOrder(idx, 'down')}
                      title="Desann patnè sa a nan lòd afichaj la"
                      className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 disabled:opacity-30 cursor-pointer transition-colors"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleActive(spon.id)}
                      title={spon.active ? 'Kache nan pye paj' : 'Afiche nan pye paj'}
                      className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                        spon.active
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {spon.active ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleEditSponsor(spon)}
                      title="Modifye"
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteSponsor(spon.id, spon.name)}
                      title="Efase"
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
