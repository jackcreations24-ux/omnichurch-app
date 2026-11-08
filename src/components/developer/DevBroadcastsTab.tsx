import React, { useState } from 'react';
import {
  Church,
  DeveloperSettings,
  DeveloperBroadcast,
  Language,
} from '../../types';
import {
  Radio,
  Plus,
  Trash2,
  AlertTriangle,
  Info,
  CheckCircle2,
  Wrench,
  Sparkles,
  Eye,
  Check,
  X,
} from 'lucide-react';
import {
  addDeveloperBroadcast,
  updateDeveloperBroadcast,
  deleteDeveloperBroadcast,
} from '../../utils/developerStorage';
import { useToast } from '../../context/ToastContext';

interface DevBroadcastsTabProps {
  allChurches: Church[];
  settings: DeveloperSettings;
  onUpdateSettings: (updated: Partial<DeveloperSettings>) => Promise<void>;
  language?: Language;
}

export const DevBroadcastsTab: React.FC<DevBroadcastsTabProps> = ({
  allChurches,
  settings,
  onUpdateSettings,
  language = 'ht',
}) => {
  const toast = useToast();
  const broadcasts = settings.broadcasts || [];

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetChurchId, setTargetChurchId] = useState<'ALL' | string>('ALL');
  const [type, setType] = useState<DeveloperBroadcast['type']>('info');
  const [priority, setPriority] = useState<DeveloperBroadcast['priority']>('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Broadcast
  const handleAddBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error('Chan Manke', 'Tanpri mete yon tit ak mesaj pou kominike a.');
      return;
    }

    setIsSubmitting(true);
    try {
      const added = await addDeveloperBroadcast({
        title: title.trim(),
        message: message.trim(),
        targetChurchId,
        type,
        priority,
        active: true,
      });

      // Update local state
      const nextBroadcasts = [added, ...broadcasts];
      await onUpdateSettings({ broadcasts: nextBroadcasts });

      setTitle('');
      setMessage('');
      toast.success(
        'Kominike Pibliye!',
        'Alèt la aktive kounye a epi tout itilizatè konsène yo ap wè l sou ekran yo.'
      );
    } catch (err: any) {
      toast.error('Erè', err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Active
  const handleToggleActive = async (b: DeveloperBroadcast) => {
    const updated: DeveloperBroadcast = { ...b, active: !b.active };
    await updateDeveloperBroadcast(updated);
    const nextBroadcasts = broadcasts.map((item) => (item.id === b.id ? updated : item));
    await onUpdateSettings({ broadcasts: nextBroadcasts });
    toast.info(
      updated.active ? 'Kominike Aktive' : 'Kominike Enaktif',
      `Alèt "${b.title}" ${updated.active ? 'vizib kounye a' : 'kache kounye a'}.`
    );
  };

  // Delete Broadcast
  const handleDelete = async (id: string, broadcastTitle: string) => {
    if (!confirm(`Èske w vle efase kominike "${broadcastTitle}" nèt?`)) return;
    await deleteDeveloperBroadcast(id);
    const nextBroadcasts = broadcasts.filter((item) => item.id !== id);
    await onUpdateSettings({ broadcasts: nextBroadcasts });
    toast.success('Kominike Efase', `Alèt "${broadcastTitle}" efase.`);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="p-6 rounded-3xl bg-[#0B1120] border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Radio className="w-5 h-5 text-rose-400 animate-pulse" />
            <h3 className="font-extrabold text-base text-white">
              Motè Alèt & Kominike Global (System Broadcasts)
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Pibliye banyè avètisman, nòt mizajou, oswa enfòmasyon ijan pou tout legliz oswa yon legliz espesifik
          </p>
        </div>

        <span className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-rose-400 shrink-0">
          {broadcasts.filter((b) => b.active).length} Alèt Aktif
        </span>
      </div>

      {/* CREATE FORM */}
      <div className="p-6 rounded-3xl bg-[#0B1120] border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Plus className="w-4 h-4 text-amber-400" />
          <h4 className="font-extrabold text-sm text-white">
            Kreye yon Nouvo Kominike / Alèt Sistèm
          </h4>
        </div>

        <form onSubmit={handleAddBroadcast} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Tit Alèt la:
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="eg. Mizajou Sistèm Planifye a 11:00 PM"
                className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Destinatè (Sib):
              </label>
              <select
                value={targetChurchId}
                onChange={(e) => setTargetChurchId(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
              >
                <option value="ALL">★ Tout Legliz (Global)</option>
                {allChurches.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Mesaj oswa Detay Kominike a:
            </label>
            <textarea
              rows={2}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Mete kontni mesaj la ki pral parèt anlè sou ekran itilizatè yo..."
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Kalite Mesaj (Type):
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
              >
                <option value="info">Enfòmasyon Jeneral (Ble)</option>
                <option value="update">Mizajou Sistèm (Vèt)</option>
                <option value="warning">Avètisman (Jòn)</option>
                <option value="maintenance">Antretyen & Travay (Woz/Wouj)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Nivo Priyorite:
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
              >
                <option value="normal">Nòmal (Banyè discrète)</option>
                <option value="urgent">Ijan (Banyè ak anfaz fò)</option>
              </select>
            </div>
          </div>

          {/* Live Preview Box */}
          {title.trim() && (
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>Aperçu Banyè a sou Ekran:</span>
              </div>
              <div
                className={`p-3 rounded-xl border flex items-center gap-3 text-xs ${
                  type === 'maintenance'
                    ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                    : type === 'warning'
                    ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                    : type === 'update'
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                    : 'bg-blue-950/40 border-blue-500/50 text-blue-200'
                }`}
              >
                {type === 'maintenance' ? (
                  <Wrench className="w-4 h-4 shrink-0 text-rose-400" />
                ) : type === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                ) : type === 'update' ? (
                  <Sparkles className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <Info className="w-4 h-4 shrink-0 text-blue-400" />
                )}
                <div>
                  <div className="font-bold">{title}</div>
                  <div className="text-[11px] opacity-90">{message || 'Kontni mesaj la...'}</div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-2 shadow-md shadow-amber-400/20 cursor-pointer active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 fill-current" />
              <span>{isSubmitting ? 'Ap pibliye...' : 'Pibliye Kominike Imedyat'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* EXISTING BROADCASTS LIST */}
      <div className="p-6 rounded-3xl bg-[#0B1120] border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h4 className="font-extrabold text-sm text-white">
            Lis Kominike ki Egziste ({broadcasts.length})
          </h4>
        </div>

        {broadcasts.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            Pa gen okenn kominike aktif kounye a.
          </div>
        ) : (
          <div className="space-y-3">
            {broadcasts.map((b) => (
              <div
                key={b.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  b.active
                    ? 'bg-slate-950 border-slate-800'
                    : 'bg-slate-950/40 border-slate-900 opacity-60'
                }`}
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-xs text-white truncate">
                      {b.title}
                    </span>
                    <span className={`px-2 py-0.2 rounded text-[9px] font-bold font-mono uppercase ${
                      b.type === 'maintenance'
                        ? 'bg-rose-500/20 text-rose-300'
                        : b.type === 'warning'
                        ? 'bg-amber-500/20 text-amber-300'
                        : b.type === 'update'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-blue-500/20 text-blue-300'
                    }`}>
                      {b.type}
                    </span>
                    <span className="px-2 py-0.2 rounded bg-slate-800 text-slate-400 text-[9px] font-mono">
                      {b.targetChurchId === 'ALL' ? 'Tout Legliz' : `Legliz: ${b.targetChurchId}`}
                    </span>
                    {b.priority === 'urgent' && (
                      <span className="px-2 py-0.2 rounded bg-rose-500/20 text-rose-400 text-[9px] font-bold">
                        IJAN
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-snug">
                    {b.message}
                  </p>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Kreye: {new Date(b.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(b)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      b.active
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {b.active ? 'Aktif' : 'Enaktif'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(b.id, b.title)}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors cursor-pointer"
                    title="Efase kominike"
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
  );
};
