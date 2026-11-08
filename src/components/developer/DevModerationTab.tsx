import React, { useState } from 'react';
import {
  AnnouncementComment,
  Language,
  DeveloperSettings,
} from '../../types';
import {
  deleteAnnouncementComment,
  purgeDemoComments,
  EnrichedStoredComment,
} from '../../utils/storage';
import { useToast } from '../../context/ToastContext';
import {
  MessageSquare,
  Sparkles,
  Trash2,
  Search,
  CheckCircle2,
} from 'lucide-react';

export interface DevModerationTabProps {
  settings: DeveloperSettings;
  allComments: EnrichedStoredComment[] | AnnouncementComment[];
  onRefreshComments: () => void;
  language?: Language;
}

export const DevModerationTab: React.FC<DevModerationTabProps> = ({
  settings,
  allComments,
  onRefreshComments,
  language = 'ht',
}) => {
  const toast = useToast();
  const [commentSearchQuery, setCommentSearchQuery] = useState<string>('');
  const [isPurgingComments, setIsPurgingComments] = useState<boolean>(false);

  // Single Comment Delete
  const handleDeleteSingleComment = (commentId: string, authorName: string) => {
    if (confirm(`Èske w vle efase kòmantè "${authorName}" la nèt nan sistèm nan?`)) {
      const ok = deleteAnnouncementComment(commentId);
      if (ok) {
        toast.info('Kòmantè Efase', `Kòmantè ${authorName} la retire.`);
        onRefreshComments();
      } else {
        toast.error('Erè', 'Pa t ka efase kòmantè a.');
      }
    }
  };

  // Bulk Purge Demo Comments
  const handleBulkPurgeDemoComments = () => {
    if (confirm('Èske w vle efase tout ansyen kòmantè demonstrasyon yo nèt?')) {
      setIsPurgingComments(true);
      try {
        const res = purgeDemoComments();
        toast.success(
          'Kòmantè Demo Netwaye!',
          `${res.purgedCount} kòmantè demonstrasyon efase nèt nan sistèm nan.`
        );
        onRefreshComments();
      } catch (err: any) {
        toast.error('Erè', err?.message || 'Pa t ka efase kòmantè yo.');
      } finally {
        setIsPurgingComments(false);
      }
    }
  };

  // Filtered comments
  const filteredComments = allComments.filter((comm) => {
    if (!commentSearchQuery) return true;
    const q = commentSearchQuery.toLowerCase();
    return (
      (comm.author || '').toLowerCase().includes(q) ||
      (comm.text || '').toLowerCase().includes(q) ||
      (comm.churchName || '').toLowerCase().includes(q) ||
      (comm.announcementTitle || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl bg-[#0B1120] border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-white">
                Moderasyon Kòmantè & Kominikasyon Global
              </h3>
              <p className="text-xs text-slate-400">
                Gade, filtre epi retire nenpòt kòmantè ki pa konfòm nan tout anons legliz yo
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleBulkPurgeDemoComments}
            disabled={isPurgingComments}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-900 text-slate-300 hover:text-rose-300 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            title="Efase tout kòmantè demo ki te vini ak egzanp yo"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{isPurgingComments ? 'W ap netwaye...' : 'Netwaye Tout Kòmantè Demo'}</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={commentSearchQuery}
              onChange={(e) => setCommentSearchQuery(e.target.value)}
              placeholder="Filtre pa otè, tèks, legliz..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-purple-400"
            />
          </div>

          <div className="text-xs text-slate-400 font-mono">
            Total: <span className="font-bold text-white">{filteredComments.length}</span> kòmantè
          </div>
        </div>

        {/* Comment Cards List */}
        {filteredComments.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-60" />
            <p className="text-xs text-slate-400 font-medium">
              Fil aktyalite a pwòp oswa rechèch la pa bay okenn rezilta.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredComments.map((comm) => {
              const isDemo =
                comm.isDemo ||
                comm.id.startsWith('comm_demo') ||
                comm.id === 'c1' ||
                comm.id === 'c2' ||
                comm.author.includes('Hna.') ||
                comm.author.includes('Hno.') ||
                comm.author.includes('Carmel') ||
                comm.author.includes('Baptiste') ||
                comm.author.includes('Samuel Pierre');
              return (
                <div
                  key={`dev-comm-${comm.id}`}
                  className="p-4 rounded-2xl bg-[#0B1120] border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between gap-3 shadow-lg group"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-md shrink-0">
                          {comm.avatarInitials || comm.author.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white">
                              {comm.author}
                            </span>
                            {isDemo ? (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                DEMO
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                MANM
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                            <span>{comm.time || 'Kounye a'}</span>
                            {comm.churchName && (
                              <>
                                <span>•</span>
                                <span className="text-amber-400/80 font-mono">{comm.churchName}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteSingleComment(comm.id, comm.author)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-900 transition-colors cursor-pointer shrink-0"
                        title="Efase kòmantè sa a"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                      {comm.text}
                    </p>
                  </div>

                  {comm.announcementTitle && (
                    <div className="text-[10px] text-slate-500 flex items-center gap-1 truncate pt-1 border-t border-slate-800/60">
                      <span className="text-slate-400 font-bold">Sou Anons:</span>
                      <span className="truncate text-slate-300">{comm.announcementTitle}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
