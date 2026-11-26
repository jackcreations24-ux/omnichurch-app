import React, { useState, useEffect, useMemo } from 'react';
import {
  AnnouncementComment,
  Language,
  DeveloperSettings,
  RemoteCommentModerationConfig,
  Church,
  Announcement,
  ServiceSession,
} from '../../types';
import {
  deleteAnnouncementComment,
  updateAnnouncementCommentContentLocally,
  EnrichedStoredComment,
  getAllChurches,
  getAllAnnouncements,
  getAllServices,
} from '../../utils/storage';
import {
  DEFAULT_COMMENT_MODERATION_CONFIG,
  sanitizeCommentModerationConfig,
  verifyAndPushCommentModerationToCloud,
  detectSuspectCommentReasons,
  REDACTED_COMMENT_PLACEHOLDER,
} from '../../utils/developerStorage';
import {
  subscribeToAllAnnouncementCommentsGlobal,
  firestoreRedactOrUpdateAnnouncementComment,
  firestoreDeleteAnnouncementComment,
  firestoreBulkDeleteAnnouncementComments,
  resolveTimestampMs,
  resolveTimestampIso,
} from '../../services/firestoreService';
import { useToast } from '../../context/ToastContext';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import {
  MessageSquare,
  Trash2,
  Search,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  VolumeX,
  Volume2,
  CloudUpload,
  Plus,
  X,
  AlertTriangle,
  Link2Off,
  Clock,
  FileEdit,
  Building2,
  Filter,
  RotateCcw,
  CheckSquare,
  Square,
  EyeOff,
  Check,
} from 'lucide-react';

export interface DevModerationTabProps {
  settings: DeveloperSettings;
  allComments: EnrichedStoredComment[] | AnnouncementComment[];
  onRefreshComments: () => void;
  onUpdateSettings?: (updated: Partial<DeveloperSettings>) => Promise<void> | void;
  allChurches?: Church[];
  language?: Language;
}

export const DevModerationTab: React.FC<DevModerationTabProps> = ({
  settings,
  allComments,
  onRefreshComments,
  onUpdateSettings,
  allChurches,
  language = 'ht',
}) => {
  const toast = useToast();

  // Live moderation config state synced with settings.commentModeration
  const [modConfig, setModConfig] = useState<RemoteCommentModerationConfig>(() =>
    sanitizeCommentModerationConfig(settings.commentModeration)
  );
  const [isPushingCloud, setIsPushingCloud] = useState(false);
  const [lastPushVerified, setLastPushVerified] = useState<boolean | null>(null);

  // Keyword & Mute inputs
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [newMutedIdInput, setNewMutedIdInput] = useState('');

  // Live Firestore comment stream state
  const [liveCloudComments, setLiveCloudComments] = useState<AnnouncementComment[]>([]);
  const [liveCloudSettled, setLiveCloudSettled] = useState<boolean>(false);
  const [selectedChurchFilter, setSelectedChurchFilter] = useState<string>('ALL');
  const [commentSearchQuery, setCommentSearchQuery] = useState<string>('');
  const [showSuspectOnly, setShowSuspectOnly] = useState<boolean>(false);

  // Bulk selection & inline edit state
  const [selectedCommentIds, setSelectedCommentIds] = useState<Set<string>>(new Set());
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContentText, setEditingContentText] = useState<string>('');
  const [busyCommentIds, setBusyCommentIds] = useState<Set<string>>(new Set());

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    itemName?: string;
    confirmText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Sync local state when parent settings update
  useEffect(() => {
    setModConfig(sanitizeCommentModerationConfig(settings.commentModeration));
  }, [settings.commentModeration]);

  // Attach real-time Firestore listener on `announcement_comments` sorted by createdAt descending
  useEffect(() => {
    setLiveCloudSettled(false);
    const unsub = subscribeToAllAnnouncementCommentsGlobal(
      (remoteComments, meta) => {
        setLiveCloudComments(remoteComments);
        const isAuthoritative = Boolean(meta && !meta.fromCache && !meta.hasPendingWrites);
        if (isAuthoritative) {
          setLiveCloudSettled(true);
        }

        if (meta && !meta.hasPendingWrites && meta.removedIds.length > 0) {
          const removedSet = new Set(meta.removedIds);
          meta.removedIds.forEach((rid) => {
            deleteAnnouncementComment(rid);
          });
          setSelectedCommentIds((prev) => {
            let changed = false;
            const next = new Set(prev);
            meta.removedIds.forEach((rid) => {
              if (next.delete(rid)) changed = true;
            });
            return changed ? next : prev;
          });
          setEditingCommentId((prevId) => (prevId && removedSet.has(prevId) ? null : prevId));
          onRefreshComments();
        } else if (isAuthoritative) {
          // Prune any active selection/edit if the comment no longer exists in the authoritative server snapshot
          const remoteSet = new Set(remoteComments.map((c) => c.id));
          setSelectedCommentIds((prev) => {
            let changed = false;
            const next = new Set<string>();
            prev.forEach((id) => {
              if (remoteSet.has(id)) {
                next.add(id);
              } else {
                changed = true;
              }
            });
            return changed ? next : prev;
          });
          setEditingCommentId((prevId) => (prevId && !remoteSet.has(prevId) ? null : prevId));
        }
      },
      selectedChurchFilter === 'ALL' ? undefined : selectedChurchFilter
    );
    return () => {
      unsub();
    };
  }, [selectedChurchFilter]);

  // Resolve church list, announcements, and services for metadata badges
  const churchesPool = useMemo<Church[]>(() => {
    return allChurches && allChurches.length > 0 ? allChurches : getAllChurches();
  }, [allChurches]);

  const churchMap = useMemo(() => {
    const map = new Map<string, Church>();
    churchesPool.forEach((c) => {
      if (c?.id) map.set(c.id, c);
      if (c?.code) map.set(c.code.toUpperCase(), c);
    });
    return map;
  }, [churchesPool]);

  const targetMetadataMap = useMemo(() => {
    const map = new Map<string, { type: 'service' | 'announcement'; title: string; churchId?: string }>();
    try {
      const anns: Announcement[] = getAllAnnouncements();
      anns.forEach((a) => {
        if (a?.id) {
          map.set(a.id, {
            type: a.category === 'sevis' || a.serviceId ? 'service' : 'announcement',
            title: a.title || `Anons #${a.id.slice(0, 8)}`,
            churchId: a.churchId,
          });
        }
      });
      const srvs: ServiceSession[] = getAllServices();
      srvs.forEach((s) => {
        if (s?.id) {
          map.set(s.id, {
            type: 'service',
            title: s.title || `Sèvis #${s.id.slice(0, 8)}`,
            churchId: s.churchId,
          });
          map.set(`srv-feed-${s.id}`, {
            type: 'service',
            title: s.title || `Sèvis #${s.id.slice(0, 8)}`,
            churchId: s.churchId,
          });
        }
      });
    } catch {
      // Non-blocking fallback
    }
    return map;
  }, [allComments, liveCloudComments]);

  // Helper to persist moderation config changes immediately and sync to `app_config/developer_engine`
  const applyModerationUpdate = async (
    partial: Partial<RemoteCommentModerationConfig>,
    toastMessage?: string
  ) => {
    const nextMod = sanitizeCommentModerationConfig({
      ...modConfig,
      ...partial,
      lastModerationPushAt: new Date().toISOString(),
    });
    setModConfig(nextMod);

    if (onUpdateSettings) {
      await onUpdateSettings({ commentModeration: nextMod });
    } else {
      await verifyAndPushCommentModerationToCloud(settings, nextMod);
    }

    if (toastMessage) {
      toast.success('Moderasyon Ajou', toastMessage);
    }
  };

  // Explicit Cloud Push & Verification button handler
  const handlePushModerationToCloud = async () => {
    setIsPushingCloud(true);
    try {
      const res = await verifyAndPushCommentModerationToCloud(settings, modConfig);
      if (res.remoteCommentModeration) {
        setModConfig(res.remoteCommentModeration);
      }
      if (onUpdateSettings) {
        await onUpdateSettings({
          commentModeration: res.remoteCommentModeration || modConfig,
        });
      }
      setLastPushVerified(res.syncedToCloud && res.remoteVerified);
      if (res.syncedToCloud) {
        toast.success(
          'Senkronize sou Sèvè Santral ✓',
          'Konfigirasyon commentModeration anrejistre nan app_config/developer_engine (san efase AdMob ni Lisans).'
        );
      } else {
        toast.info(
          'Anrejistre Lokalman',
          'Konekte Kont Administrasyon Jeneral Otorize a pou pouse sou sèvè santral la.'
        );
      }
    } catch (err: any) {
      toast.error('Erè Senkronizasyon', err?.message || 'Pa t ka pouse konfigirasyon moderasyon an.');
    } finally {
      setIsPushingCloud(false);
    }
  };

  // Add banned keyword(s)
  const handleAddKeyword = async () => {
    const raw = newKeywordInput.trim().toLowerCase();
    if (!raw) return;
    const parts = raw
      .split(',')
      .map((w) => w.trim())
      .filter(Boolean);
    if (parts.length === 0) return;

    const merged = Array.from(new Set([...modConfig.blockedKeywords, ...parts]));
    setNewKeywordInput('');
    await applyModerationUpdate(
      { blockedKeywords: merged },
      `${parts.length} mo entèdi ajoute nan filtè otomatik la.`
    );
  };

  // Remove banned keyword
  const handleRemoveKeyword = async (keyword: string) => {
    const filtered = modConfig.blockedKeywords.filter((w) => w !== keyword);
    await applyModerationUpdate(
      { blockedKeywords: filtered },
      `Mo "${keyword}" retire nan lis mo entèdi yo.`
    );
  };

  // Reset keywords to default
  const handleResetDefaultKeywords = async () => {
    await applyModerationUpdate(
      { blockedKeywords: [...DEFAULT_COMMENT_MODERATION_CONFIG.blockedKeywords] },
      'Lis mo entèdi yo retounen nan valè padefo (HT / FR / EN).'
    );
  };

  // Mute / Unmute Member ID
  const isUserMuted = (userId?: string): boolean => {
    const clean = (userId || '').trim().toUpperCase();
    if (!clean) return false;
    return modConfig.mutedMemberIds.some((id) => id.trim().toUpperCase() === clean);
  };

  const handleToggleMuteUser = async (userId: string, displayName?: string) => {
    const cleanId = (userId || '').trim();
    if (!cleanId) return;
    const currentlyMuted = isUserMuted(cleanId);
    const nextMuted = currentlyMuted
      ? modConfig.mutedMemberIds.filter((id) => id.trim().toUpperCase() !== cleanId.toUpperCase())
      : Array.from(new Set([...modConfig.mutedMemberIds, cleanId]));

    await applyModerationUpdate(
      { mutedMemberIds: nextMuted },
      currentlyMuted
        ? `Silans retire pou ${displayName || cleanId}. Manm nan ka kòmante ankò.`
        : `${displayName || cleanId} mete sou silans nan tout kòmantè.`
    );
  };

  const handleAddMutedIdManually = async () => {
    const clean = newMutedIdInput.trim();
    if (!clean) return;
    setNewMutedIdInput('');
    if (!isUserMuted(clean)) {
      await handleToggleMuteUser(clean, clean);
    }
  };

  // Toggle Church Disabled for Comments
  const handleToggleChurchComments = async (churchId: string, churchName: string) => {
    const cleanId = (churchId || '').trim();
    if (!cleanId) return;
    const isDisabled = modConfig.disabledChurchIds.some(
      (cid) => cid.trim().toUpperCase() === cleanId.toUpperCase()
    );
    const nextDisabled = isDisabled
      ? modConfig.disabledChurchIds.filter(
          (cid) => cid.trim().toUpperCase() !== cleanId.toUpperCase()
        )
      : Array.from(new Set([...modConfig.disabledChurchIds, cleanId]));

    await applyModerationUpdate(
      { disabledChurchIds: nextDisabled },
      isDisabled
        ? `Kòmantè aktive ankò pou ${churchName}.`
        : `Kòmantè dezaktive tanporèman pou ${churchName}.`
    );
  };

  // Merge live Firestore comments (`announcement_comments`) + local comments, deduplicated by id and sorted by createdAt DESC
  const unifiedComments = useMemo(() => {
    const map = new Map<string, AnnouncementComment & { announcementTitle?: string; churchName?: string; targetType?: 'service' | 'announcement' }>();

    const ingest = (comm: AnnouncementComment & { announcementTitle?: string; churchName?: string }) => {
      if (!comm || !comm.id) return;
      const targetId = (comm.targetId || comm.announcementId || '').trim();
      const targetInfo = targetMetadataMap.get(targetId);
      const resolvedChurchId = (comm.churchId || targetInfo?.churchId || '').trim();
      const churchObj =
        churchMap.get(resolvedChurchId) || churchMap.get(resolvedChurchId.toUpperCase());
      const resolvedChurchName =
        churchObj?.name ||
        comm.churchName ||
        (resolvedChurchId ? `Legliz ${resolvedChurchId}` : 'OmniChurch');
      const resolvedTargetTitle =
        targetInfo?.title ||
        comm.announcementTitle ||
        (targetId.startsWith('srv') ? `Sèvis #${targetId.slice(0, 10)}` : `Anons #${targetId.slice(0, 10)}`);
      const resolvedTargetType: 'service' | 'announcement' =
        targetInfo?.type || (targetId.startsWith('srv') ? 'service' : 'announcement');

      const userName = (comm.userName || comm.author || 'Manm').trim();
      const userId = (comm.userId || comm.memberId || comm.authorMemberId || userName).trim();
      const content = (comm.content || comm.text || '').trim();

      map.set(comm.id, {
        ...comm,
        id: comm.id,
        targetId: targetId || comm.id,
        announcementId: targetId || comm.id,
        churchId: resolvedChurchId,
        churchName: resolvedChurchName,
        userId,
        userName,
        author: userName,
        userPhotoUrl: comm.userPhotoUrl || null,
        content,
        text: content,
        announcementTitle: resolvedTargetTitle,
        targetType: resolvedTargetType,
        createdAt: comm.createdAt || new Date().toISOString(),
      });
    };

    // Before server snapshot settles, show local cache + cloud; once settled, Cloud Firestore is the source of truth
    if (!liveCloudSettled) {
      (allComments || []).forEach((c) => ingest(c));
    }
    (liveCloudComments || []).forEach((c) => ingest(c));

    const arr = Array.from(map.values());
    arr.sort((a, b) => resolveTimestampMs(b.createdAt) - resolveTimestampMs(a.createdAt));
    return arr;
  }, [allComments, liveCloudComments, liveCloudSettled, churchMap, targetMetadataMap]);

  // Enrich each comment with suspect analysis
  const analyzedComments = useMemo(() => {
    return unifiedComments.map((comm) => {
      const analysis = detectSuspectCommentReasons(
        comm.content || comm.text || '',
        comm.userId,
        modConfig
      );
      return {
        comment: comm,
        analysis,
      };
    });
  }, [unifiedComments, modConfig]);

  // Apply church, search, and suspect-only filters
  const filteredComments = useMemo(() => {
    return analyzedComments.filter(({ comment, analysis }) => {
      if (selectedChurchFilter !== 'ALL') {
        if ((comment.churchId || '').toUpperCase() !== selectedChurchFilter.toUpperCase()) {
          return false;
        }
      }
      if (showSuspectOnly && !analysis.isSuspect && !analysis.isMutedUser) {
        return false;
      }
      if (commentSearchQuery.trim()) {
        const q = commentSearchQuery.trim().toLowerCase();
        const matchUser = (comment.userName || comment.author || '').toLowerCase().includes(q);
        const matchUserId = (comment.userId || '').toLowerCase().includes(q);
        const matchContent = (comment.content || comment.text || '').toLowerCase().includes(q);
        const matchChurch = (comment.churchName || comment.churchId || '').toLowerCase().includes(q);
        const matchTarget = (comment.announcementTitle || comment.targetId || '').toLowerCase().includes(q);
        if (!matchUser && !matchUserId && !matchContent && !matchChurch && !matchTarget) {
          return false;
        }
      }
      return true;
    });
  }, [analyzedComments, selectedChurchFilter, showSuspectOnly, commentSearchQuery]);

  const suspectTotalCount = useMemo(
    () => analyzedComments.filter((item) => item.analysis.isSuspect).length,
    [analyzedComments]
  );

  // Redact a comment (`affectedKeys().hasOnly(['content'])`)
  const handleRedactComment = async (
    comment: AnnouncementComment,
    customText: string = REDACTED_COMMENT_PLACEHOLDER
  ) => {
    const cleanId = comment.id;
    setBusyCommentIds((prev) => new Set(prev).add(cleanId));
    try {
      updateAnnouncementCommentContentLocally(cleanId, customText);
      const cloudOk = await firestoreRedactOrUpdateAnnouncementComment(cleanId, customText);
      setLiveCloudComments((prev) =>
        prev.map((c) => (c.id === cleanId ? { ...c, content: customText, text: customText } : c))
      );
      onRefreshComments();
      setEditingCommentId(null);
      toast.success(
        'Kòmantè Modere ✓',
        cloudOk
          ? `Tèks kòmantè ${comment.userName || comment.author} la mete ajou nan announcement_comments (content sèlman).`
          : `Tèks kòmantè ${comment.userName || comment.author} la modere lokalman.`
      );
    } catch (err: any) {
      toast.error('Erè Moderasyon', err?.message || 'Pa t ka modere tèks kòmantè a.');
    } finally {
      setBusyCommentIds((prev) => {
        const next = new Set(prev);
        next.delete(cleanId);
        return next;
      });
    }
  };

  // Single Comment Delete (`deleteDoc(doc(db, "announcement_comments", commentId))`)
  const handleDeleteSingleComment = (comment: AnnouncementComment) => {
    const authorLabel = comment.userName || comment.author || comment.userId || 'Manm';
    setConfirmModal({
      isOpen: true,
      title: 'Efase Kòmantè Definitivman',
      message: `Èske w vle efase kòmantè "${authorLabel}" la nèt nan koleksyon announcement_comments sou sèvè a ak lokalman?`,
      itemName: authorLabel,
      confirmText: 'Wi, Efase Definitivman',
      onConfirm: async () => {
        const cleanId = comment.id;
        setBusyCommentIds((prev) => new Set(prev).add(cleanId));
        try {
          deleteAnnouncementComment(cleanId);
          await firestoreDeleteAnnouncementComment(cleanId, comment.targetId || comment.announcementId);
          setLiveCloudComments((prev) => prev.filter((c) => c.id !== cleanId));
          setSelectedCommentIds((prev) => {
            const next = new Set(prev);
            next.delete(cleanId);
            return next;
          });
          onRefreshComments();
          toast.info('Kòmantè Efase', `Kòmantè ${authorLabel} la retire definitivman.`);
        } catch (err: any) {
          toast.error('Erè Efasman', err?.message || 'Pa t ka efase kòmantè a.');
        } finally {
          setBusyCommentIds((prev) => {
            const next = new Set(prev);
            next.delete(cleanId);
            return next;
          });
        }
      },
    });
  };

  // Bulk Multi-Select Delete for Spam Cleanup
  const handleBulkDeleteSelected = () => {
    const ids: string[] = Array.from(selectedCommentIds.values());
    if (ids.length === 0) return;

    setConfirmModal({
      isOpen: true,
      title: `Efase ${ids.length} Kòmantè Anmenmtan`,
      message: `Èske w sèten ou vle efase tout ${ids.length} kòmantè ou chwazi yo definitivman nan announcement_comments?`,
      itemName: `${ids.length} kòmantè seleksyone`,
      confirmText: `Wi, Efase ${ids.length} Kòmantè`,
      onConfirm: async () => {
        ids.forEach((id) => deleteAnnouncementComment(id));
        const deletedCloud = await firestoreBulkDeleteAnnouncementComments(ids);
        setLiveCloudComments((prev) => prev.filter((c) => !selectedCommentIds.has(c.id)));
        setSelectedCommentIds(new Set());
        onRefreshComments();
        toast.success(
          'Netwayaj Spam Reyisi',
          `${Math.max(ids.length, deletedCloud)} kòmantè efase definitivman.`
        );
      },
    });
  };

  const toggleSelectComment = (id: string) => {
    setSelectedCommentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    if (filteredComments.length === 0) return;
    const allFilteredIds = filteredComments.map((item) => item.comment.id);
    const allSelected = allFilteredIds.every((id) => selectedCommentIds.has(id));
    if (allSelected) {
      setSelectedCommentIds(new Set());
    } else {
      setSelectedCommentIds(new Set(allFilteredIds));
    }
  };

  return (
    <div className="space-y-6">
      {/* =========================================================================
          1. HEADER & CLOUD SYNC BAR (`app_config/developer_engine -> commentModeration`)
          ========================================================================= */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0B1D3D] via-[#07142B] to-[#0B1120] border border-cyan-500/30 shadow-2xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/90 pb-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#00AEEF]/25 to-[#22ACFF]/10 border border-[#00AEEF]/40 flex items-center justify-center text-[#00AEEF] shrink-0 shadow-lg shadow-cyan-500/10">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-base sm:text-lg text-white tracking-tight">
                  Moderasyon Kòmantè & Kontwòl Kominikasyon An Tan Reyèl
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  app_config/developer_engine
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Kontwole kòmantè sou Sèvis ak Anons nan tout legliz yo (Web & Android), filtre mo entèdi, bloke lyen ekstèn, epi modere kòmantè an tan reyèl.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {lastPushVerified === true && (
              <span className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-[11px] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verifye sou Sèvè ✓</span>
              </span>
            )}
            {modConfig.lastModerationPushAt && (
              <span className="text-[11px] text-slate-400 font-mono bg-slate-950/70 px-2.5 py-1.5 rounded-xl border border-slate-800">
                Dènye Senkro:{' '}
                <strong className="text-cyan-300">
                  {new Date(modConfig.lastModerationPushAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </strong>
              </span>
            )}
            <button
              type="button"
              id="btn-push-comment-moderation-cloud"
              onClick={handlePushModerationToCloud}
              disabled={isPushingCloud}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00AEEF] to-[#22ACFF] hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <CloudUpload className={`w-4 h-4 ${isPushingCloud ? 'animate-bounce' : ''}`} />
              <span>
                {isPushingCloud ? 'Ap Senkronize...' : 'Sove & Pouse sou Sèvè a'}
              </span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            2. REAL-TIME GLOBAL & POLICY SWITCHES (6 TOGGLES + 2 NUMERIC CONTROLS)
            ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Toggle 1: enabled */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00AEEF] shrink-0" />
                <span>Aktive Moderasyon Otomatik</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Filtè aktif sou mo entèdi ak lyen spam (`enabled`)
              </p>
            </div>
            <button
              type="button"
              id="toggle-mod-enabled"
              onClick={() =>
                applyModerationUpdate(
                  { enabled: !modConfig.enabled },
                  !modConfig.enabled
                    ? 'Moderasyon otomatik aktive.'
                    : 'Moderasyon otomatik dezaktive.'
                )
              }
              className={`w-12 h-6 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                modConfig.enabled ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  modConfig.enabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Toggle 2: allowMemberCommentsGlobal */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Otorize Kòmantè Manm yo Globalman</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Kill-switch global pou tout legliz (`allowMemberCommentsGlobal`)
              </p>
            </div>
            <button
              type="button"
              id="toggle-mod-allow-global"
              onClick={() =>
                applyModerationUpdate(
                  { allowMemberCommentsGlobal: !modConfig.allowMemberCommentsGlobal },
                  !modConfig.allowMemberCommentsGlobal
                    ? 'Kòmantè manm yo otorize globalman.'
                    : 'Tout nouvo kòmantè bloke globalman.'
                )
              }
              className={`w-12 h-6 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                modConfig.allowMemberCommentsGlobal ? 'bg-emerald-500' : 'bg-rose-600'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  modConfig.allowMemberCommentsGlobal ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Toggle 3: allowServiceComments */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-white">
                Otorize Kòmantè sou Sèvis
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Pèmèt manm kòmante sou kilt ak sèvis (`allowServiceComments`)
              </p>
            </div>
            <button
              type="button"
              id="toggle-mod-allow-services"
              onClick={() =>
                applyModerationUpdate({
                  allowServiceComments: !modConfig.allowServiceComments,
                })
              }
              className={`w-12 h-6 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                modConfig.allowServiceComments ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  modConfig.allowServiceComments ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Toggle 4: allowAnnouncementComments */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-white">
                Otorize Kòmantè sou Anons
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Pèmèt kòmantè sou anons ofisyèl (`allowAnnouncementComments`)
              </p>
            </div>
            <button
              type="button"
              id="toggle-mod-allow-announcements"
              onClick={() =>
                applyModerationUpdate({
                  allowAnnouncementComments: !modConfig.allowAnnouncementComments,
                })
              }
              className={`w-12 h-6 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                modConfig.allowAnnouncementComments ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  modConfig.allowAnnouncementComments ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Toggle 5: blockExternalLinks */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <Link2Off className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Bloke Lyen Ekstèn / Spam URLs</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Rejte http://, https://, www. (`blockExternalLinks`)
              </p>
            </div>
            <button
              type="button"
              id="toggle-mod-block-links"
              onClick={() =>
                applyModerationUpdate({
                  blockExternalLinks: !modConfig.blockExternalLinks,
                })
              }
              className={`w-12 h-6 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                modConfig.blockExternalLinks ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  modConfig.blockExternalLinks ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Toggle 6: autoBlockProfanity */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>Filtre Mo Entèdi Otomatikman</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Bloke kòmantè ki gen mo entèdi HT / FR / EN (`autoBlockProfanity`)
              </p>
            </div>
            <button
              type="button"
              id="toggle-mod-block-profanity"
              onClick={() =>
                applyModerationUpdate({
                  autoBlockProfanity: !modConfig.autoBlockProfanity,
                })
              }
              className={`w-12 h-6 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                modConfig.autoBlockProfanity ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  modConfig.autoBlockProfanity ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Numeric Controls: Max Length & Slow Mode Cooldown + Per-Church Disable */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {/* Numeric 1: maxCommentLength (50-1000) */}
          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/90 flex items-center justify-between gap-3">
            <div>
              <label
                htmlFor="input-mod-max-length"
                className="text-xs font-extrabold text-white block"
              >
                Longè Maksimòm Kòmantè (50–1000)
              </label>
              <span className="text-[11px] text-slate-400">
                Karaktè maksimòm pou chak kòmantè (`maxCommentLength`)
              </span>
            </div>
            <input
              id="input-mod-max-length"
              type="number"
              min={50}
              max={1000}
              step={25}
              value={modConfig.maxCommentLength}
              onChange={(e) => {
                const val = Number(e.target.value);
                setModConfig((prev) => ({ ...prev, maxCommentLength: val }));
              }}
              onBlur={() =>
                applyModerationUpdate({
                  maxCommentLength: Math.min(1000, Math.max(50, Number(modConfig.maxCommentLength) || 500)),
                })
              }
              className="w-24 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-amber-300 font-mono font-bold text-xs text-center focus:outline-none focus:border-[#00AEEF]"
            />
          </div>

          {/* Numeric 2: slowModeCooldownSeconds (0-300) */}
          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/90 flex items-center justify-between gap-3">
            <div>
              <label
                htmlFor="input-mod-slow-mode"
                className="text-xs font-extrabold text-white flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Slow Mode Cooldown (segonn)</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Delè ant 2 kòmantè menm manm (0–300 segonn)
              </span>
            </div>
            <input
              id="input-mod-slow-mode"
              type="number"
              min={0}
              max={300}
              step={5}
              value={modConfig.slowModeCooldownSeconds}
              onChange={(e) => {
                const val = Number(e.target.value);
                setModConfig((prev) => ({ ...prev, slowModeCooldownSeconds: val }));
              }}
              onBlur={() =>
                applyModerationUpdate({
                  slowModeCooldownSeconds: Math.min(
                    300,
                    Math.max(0, Number(modConfig.slowModeCooldownSeconds) || 0)
                  ),
                })
              }
              className="w-24 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-cyan-300 font-mono font-bold text-xs text-center focus:outline-none focus:border-[#00AEEF]"
            />
          </div>

          {/* Per-Church Comment Disable Summary */}
          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/90 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Kòmantè pa Legliz</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {modConfig.disabledChurchIds.length} dezaktive
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
              {churchesPool.length === 0 ? (
                <span className="text-[11px] text-slate-500">Okenn legliz anrejistre</span>
              ) : (
                churchesPool.slice(0, 8).map((ch) => {
                  const isDisabled = modConfig.disabledChurchIds.some(
                    (cid) => cid.trim().toUpperCase() === ch.id.toUpperCase()
                  );
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => handleToggleChurchComments(ch.id, ch.name)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap border transition-all cursor-pointer ${
                        isDisabled
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                      title={
                        isDisabled
                          ? `Klike pou re-aktive kòmantè nan ${ch.name}`
                          : `Klike pou dezaktive kòmantè nan ${ch.name}`
                      }
                    >
                      {isDisabled ? '🚫 ' : '✓ '}
                      {ch.name.slice(0, 18)}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. CUSTOMIZABLE BANNED KEYWORDS & MUTED MEMBERS MANAGER
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card A: Banned Keywords Manager (blockedKeywords) */}
        <div className="p-5 rounded-3xl bg-[#0B1120] border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Mo Entèdi & Filtè Spam ({modConfig.blockedKeywords.length})</span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Ajoute oswa retire mo entèdi an Kreyòl, Franse oswa Anglè (`blockedKeywords`)
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetDefaultKeywords}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              title="Retounen nan lis mo entèdi padefo yo"
            >
              <RotateCcw className="w-3 h-3 text-amber-400" />
              <span>Padefo</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              id="input-add-blocked-keyword"
              value={newKeywordInput}
              onChange={(e) => setNewKeywordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddKeyword();
                }
              }}
              placeholder="Ajoute mo entèdi (eg: spam, scam, insulte)..."
              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-[#00AEEF]"
            />
            <button
              type="button"
              id="btn-add-blocked-keyword"
              onClick={handleAddKeyword}
              disabled={!newKeywordInput.trim()}
              className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajoute</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
            {modConfig.blockedKeywords.length === 0 ? (
              <span className="text-xs text-slate-500 italic py-2">
                Okenn mo entèdi pa nan lis la kounye a.
              </span>
            ) : (
              modConfig.blockedKeywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950/60 border border-rose-500/30 text-rose-200 text-[11px] font-mono font-semibold"
                >
                  <span>{kw}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveKeyword(kw)}
                    className="text-rose-400 hover:text-white cursor-pointer"
                    title={`Retire "${kw}"`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        {/* Card B: Muted Members Manager (mutedMemberIds) */}
        <div className="p-5 rounded-3xl bg-[#0B1120] border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <VolumeX className="w-4 h-4 text-amber-400" />
                <span>Manm ki Sou Silans ({modConfig.mutedMemberIds.length})</span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Manm sa yo pa ka poste nouvo kòmantè jiskaske ou klike sou &ldquo;Retire Silans&rdquo; (`mutedMemberIds`)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              id="input-add-muted-member"
              value={newMutedIdInput}
              onChange={(e) => setNewMutedIdInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddMutedIdManually();
                }
              }}
              placeholder="Antre ID Manm, Matrikil oswa UID pou mete sou silans..."
              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
            />
            <button
              type="button"
              id="btn-add-muted-member"
              onClick={handleAddMutedIdManually}
              disabled={!newMutedIdInput.trim()}
              className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Mete sou Silans</span>
            </button>
          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {modConfig.mutedMemberIds.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center text-xs text-slate-400">
                Okenn manm pa sou silans kounye a. Ou ka mete yon manm sou silans dirèkteman nan nenpòt liy kòmantè anba a.
              </div>
            ) : (
              modConfig.mutedMemberIds.map((mutedId) => (
                <div
                  key={mutedId}
                  className="px-3.5 py-2 rounded-xl bg-slate-950 border border-amber-500/30 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <VolumeX className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-xs font-mono font-bold text-white truncate">
                      {mutedId}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleMuteUser(mutedId, mutedId)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[11px] font-extrabold flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>Retire Silans</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. LIVE MULTI-CHURCH COMMENT STREAM & AUDIT TABLE (`announcement_comments`)
          ========================================================================= */}
      <div className="p-6 rounded-3xl bg-[#0B1120] border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#00AEEF]">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-base text-white">
                  Fil Kòmantè Multi-Legliz An Tan Reyèl (announcement_comments)
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Stream
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Triye pa dat (`createdAt` desandan). Modere tèks (`content` sèlman), efase spam, oswa mete yon manm sou silans an 1 klik.
              </p>
            </div>
          </div>

          {/* Bulk Action Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            {filteredComments.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAllFiltered}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {filteredComments.every((item) => selectedCommentIds.has(item.comment.id)) ? (
                  <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>Tout ({filteredComments.length})</span>
              </button>
            )}

            {selectedCommentIds.size > 0 && (
              <button
                type="button"
                id="btn-bulk-delete-comments"
                onClick={handleBulkDeleteSelected}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Efase Seleksyon ({selectedCommentIds.size})</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar: Church Select + Search Input + Suspect/Flagged Toggle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-1 items-center">
          {/* Filter 1: Church (Legliz) */}
          <div className="lg:col-span-3">
            <div className="relative">
              <Building2 className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                id="select-mod-church-filter"
                value={selectedChurchFilter}
                onChange={(e) => setSelectedChurchFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-[#00AEEF]"
              >
                <option value="ALL">Tout Legliz yo ({churchesPool.length})</option>
                {churchesPool.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.name} ({ch.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Filter 2: Search input */}
          <div className="lg:col-span-5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                id="input-mod-search-comments"
                value={commentSearchQuery}
                onChange={(e) => setCommentSearchQuery(e.target.value)}
                placeholder="Chèche tèks, non manm, userId, oswa ID anons/sèvis..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-[#00AEEF]"
              />
            </div>
          </div>

          {/* Filter 3: Suspect / Flagged Only */}
          <div className="lg:col-span-4 flex items-center justify-between sm:justify-end gap-2">
            <button
              type="button"
              id="btn-filter-suspect-only"
              onClick={() => setShowSuspectOnly((prev) => !prev)}
              className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border transition-all cursor-pointer ${
                showSuspectOnly
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-md shadow-rose-500/10'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <Filter className="w-3.5 h-3.5 text-rose-400" />
              <span>Sispèk / Siyale Sèlman</span>
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500/30 text-rose-200 font-mono text-[10px]">
                {suspectTotalCount}
              </span>
            </button>

            <div className="text-xs text-slate-400 font-mono shrink-0">
              Total: <span className="font-bold text-white">{filteredComments.length}</span>
            </div>
          </div>
        </div>

        {/* Comment Audit Stream Rows */}
        {filteredComments.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-60" />
            <p className="text-xs text-slate-400 font-medium">
              {showSuspectOnly
                ? 'Okenn kòmantè sispèk oswa siyale pa jwenn nan filtè sa a.'
                : 'Fil kòmantè a pwòp oswa rechèch la pa bay okenn rezilta.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredComments.map(({ comment: comm, analysis }) => {
              const isSelected = selectedCommentIds.has(comm.id);
              const isBusy = busyCommentIds.has(comm.id);
              const isEditingThis = editingCommentId === comm.id;
              const createdIso = resolveTimestampIso(comm.createdAt);
              const formattedDate = new Date(createdIso).toLocaleString([], {
                year: 'numeric',
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={`dev-comm-${comm.id}`}
                  className={`p-4 rounded-2xl transition-all flex flex-col gap-3 shadow-lg border ${
                    analysis.isSuspect
                      ? 'bg-rose-950/20 border-rose-500/50 hover:border-rose-400'
                      : analysis.isRedacted
                      ? 'bg-slate-950/80 border-amber-500/30'
                      : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Top Row: Checkbox + Member Avatar + Name/ID + Church + Target Badge + Quick Actions */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleSelectComment(comm.id)}
                        className="mt-1 sm:mt-0 text-slate-400 hover:text-amber-400 cursor-pointer shrink-0"
                        title="Chwazi kòmantè sa a"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>

                      {/* Member Avatar (userPhotoUrl or initials) */}
                      {comm.userPhotoUrl ? (
                        <img
                          src={comm.userPhotoUrl}
                          alt={comm.userName || comm.author}
                          className="w-10 h-10 rounded-full object-cover border border-cyan-400/40 shrink-0 shadow"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#00AEEF] to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-md shrink-0">
                          {comm.avatarInitials || (comm.userName || comm.author || 'M').slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-xs sm:text-sm text-white truncate">
                            {comm.userName || comm.author}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-900 text-cyan-300 border border-slate-800">
                            ID: {comm.userId || 'member'}
                          </span>
                          {analysis.isMutedUser && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                              <VolumeX className="w-3 h-3" />
                              <span>Sou Silans</span>
                            </span>
                          )}
                          {analysis.isRedacted && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              Modere
                            </span>
                          )}
                          {analysis.isSuspect &&
                            analysis.reasons.map((reason) => (
                              <span
                                key={reason}
                                className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1"
                              >
                                <AlertTriangle className="w-3 h-3 text-rose-400" />
                                <span>{reason}</span>
                              </span>
                            ))}
                        </div>

                        <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap mt-1">
                          <span className="text-amber-400 font-bold">
                            {comm.churchName || comm.churchId || 'OmniChurch'}
                          </span>
                          {comm.churchId && (
                            <span className="font-mono text-[10px] text-slate-500">
                              ({comm.churchId})
                            </span>
                          )}
                          <span>•</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              comm.targetType === 'service'
                                ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            {comm.targetType === 'service' ? 'Sèvis' : 'Anons'}:{' '}
                            {comm.announcementTitle || comm.targetId}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">
                            [{comm.targetId || comm.announcementId}]
                          </span>
                          <span>•</span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {formattedDate}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Moderation Actions per Comment Row */}
                    <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                      {/* Action 1: Redact (`[Kòmantè modere pa Administrasyon an]`) */}
                      <button
                        type="button"
                        disabled={isBusy || analysis.isRedacted}
                        onClick={() => handleRedactComment(comm, REDACTED_COMMENT_PLACEHOLDER)}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 text-[11px] font-extrabold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40"
                        title="Maske / Modere tèks la nan announcement_comments (content sèlman)"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Maske Tèks</span>
                      </button>

                      {/* Action 1b: Inline Edit Clean Content */}
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          if (isEditingThis) {
                            setEditingCommentId(null);
                          } else {
                            setEditingCommentId(comm.id);
                            setEditingContentText(comm.content || comm.text || '');
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Korije tèks kòmantè a (mete ajou content sèlman)"
                      >
                        <FileEdit className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Korije</span>
                      </button>

                      {/* Action 2: Mute / Unmute User */}
                      <button
                        type="button"
                        disabled={!comm.userId}
                        onClick={() =>
                          handleToggleMuteUser(
                            comm.userId || comm.author,
                            comm.userName || comm.author
                          )
                        }
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold flex items-center gap-1 border transition-colors cursor-pointer ${
                          analysis.isMutedUser
                            ? 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/40 text-emerald-300'
                            : 'bg-slate-900 hover:bg-amber-950/60 border-slate-700 hover:border-amber-500/40 text-slate-300 hover:text-amber-300'
                        }`}
                        title={
                          analysis.isMutedUser
                            ? 'Retire silans sou manm sa a'
                            : 'Mete manm sa a sou silans'
                        }
                      >
                        {analysis.isMutedUser ? (
                          <>
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Retire Silans</span>
                          </>
                        ) : (
                          <>
                            <VolumeX className="w-3.5 h-3.5" />
                            <span>Silans</span>
                          </>
                        )}
                      </button>

                      {/* Action 3: Delete Comment Permanently */}
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleDeleteSingleComment(comm)}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-[11px] font-extrabold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Efase kòmantè sa a definitivman nan announcement_comments"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Efase</span>
                      </button>
                    </div>
                  </div>

                  {/* Comment Content or Inline Editor */}
                  {isEditingThis ? (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-900/90 p-2.5 rounded-xl border border-cyan-500/40">
                      <input
                        type="text"
                        value={editingContentText}
                        maxLength={1000}
                        onChange={(e) => setEditingContentText(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-[#00AEEF]"
                      />
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            handleRedactComment(
                              comm,
                              editingContentText.trim() || REDACTED_COMMENT_PLACEHOLDER
                            )
                          }
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Sove Content</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCommentId(null)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                        >
                          Anile
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p
                      className={`text-xs sm:text-sm leading-relaxed p-3 rounded-xl border ${
                        analysis.isRedacted
                          ? 'bg-amber-950/20 border-amber-500/30 text-amber-300 italic'
                          : analysis.isSuspect
                          ? 'bg-rose-950/30 border-rose-500/30 text-white'
                          : 'bg-slate-900/70 border-slate-800/80 text-slate-200'
                      }`}
                    >
                      {comm.content || comm.text}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDeleteModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        itemName={confirmModal.itemName}
        confirmButtonText={confirmModal.confirmText}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
