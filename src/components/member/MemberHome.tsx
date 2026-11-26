import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Church,
  Member,
  Announcement,
  ServiceSession,
  ServiceCategory,
  Language,
  DeveloperSettings,
  AnnouncementComment,
  AnnouncementReactionDoc,
} from '../../types';
import { SERVICE_CATEGORIES } from '../../utils/i18n';
import {
  Calendar,
  Clock,
  QrCode,
  ChevronRight,
  ShieldCheck,
  Building2,
  Users,
  Radio,
  AlertTriangle,
  Heart,
  MessageSquare,
  Send,
  Share2,
  ExternalLink,
  BadgeCheck,
  Globe,
  HeartHandshake,
  DollarSign,
  Wallet,
  Camera,
  Crown,
  BookOpen,
  ScrollText,
  Music,
  Sparkles,
  ZoomIn,
  Megaphone,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { ReactionPicker, ReactionType, REACTION_LIST } from './ReactionPicker';
import { CommentsWheel } from './CommentsWheel';
import { DonationModal } from '../common/DonationModal';
import { DonateButton } from '../common/DonateButton';
import { ChurchDonationModal } from '../common/ChurchDonationModal';
import { ChurchTermsModal } from '../common/ChurchTermsModal';
import { PosterLightboxModal } from '../common/PosterLightboxModal';
import { ShareAnnouncementModal } from './ShareAnnouncementModal';
import {
  getAnnouncementInteractions,
  saveAnnouncementInteraction,
  addAnnouncementComment,
  deleteAnnouncementComment,
  purgeDemoComments,
  isServiceEnded,
  formatAnnouncementTimestamp,
  syncLocalCommentsFromServerSnapshot,
  getMembersByChurch,
} from '../../utils/storage';
import {
  getMemberFeedServices,
  getServiceFeedTargetId,
  stripServiceFeedPrefix,
  formatServiceCalendarBadge,
  formatServiceFullDateLabel,
  formatServiceTimeAmPm,
  formatServiceTimeRangeAmPm,
  buildServiceShareText,
  buildServiceShareAnnouncement,
  resolveServiceThumbnailUrl,
  resolveMemberAvatarsForRole,
  resolveMemberProfilePhoto,
  normalizePersonNameForMatch,
  isValidDisplayImageUrl,
  ResolvedRoleAvatar,
} from '../../utils/memberFeedUtils';
import { isServiceCurrentlyActive } from '../../utils/permissions';
import {
  getDeveloperSettings,
  getDonationConfig,
  hasActiveChurchLicense,
  sanitizeCommentModerationConfig,
  evaluateCommentAgainstModeration,
  CommentModerationEvaluationResult,
} from '../../utils/developerStorage';
import {
  subscribeToAnnouncementComments,
  subscribeToAnnouncementReactions,
  subscribeToMemberNotifications,
  firestoreAddAnnouncementComment,
  firestoreDeleteAnnouncementComment,
  firestoreSetAnnouncementReaction,
  firestoreRemoveAnnouncementReaction,
  firestoreGetChurchMembersList,
} from '../../services/firestoreService';
import {
  syncNotificationReadStatesFromCloud,
} from '../../services/notificationCenterService';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

const cachedChurchRosterMap = new Map<string, Member[]>();

interface MemberHomeProps {
  church: Church;
  member?: Member | null;
  members?: Member[];
  announcements: Announcement[];
  services: ServiceSession[];
  onOpenMyCode: () => void;
  onSelectServiceCategory: (category: any) => void;
  isReception?: boolean;
  onOpenReceptionDesk?: () => void;
  onOpenReceptionScanner?: () => void;
  isDeacon?: boolean;
  onOpenDeaconServices?: () => void;
  onOpenDeaconAnnouncements?: () => void;
  onOpenDonateScreen?: () => void;
  language?: Language;
}

interface AnnouncementInteraction {
  likes: number;
  userLiked: boolean;
  reaction?: ReactionType;
  comments: AnnouncementComment[];
}

export const MemberHome: React.FC<MemberHomeProps> = ({
  church,
  member,
  members: membersProp = [],
  announcements,
  services,
  onOpenMyCode,
  onSelectServiceCategory,
  isReception = false,
  onOpenReceptionDesk,
  onOpenReceptionScanner,
  isDeacon = false,
  onOpenDeaconServices,
  onOpenDeaconAnnouncements,
  onOpenDonateScreen,
  language = 'ht',
}) => {
  const toast = useToast();
  const isEs = language === 'es';
  const isEn = language === 'en';
  const isFr = language === 'fr';

  // License Verification privilege: only licensed churches and their members show official verification badge
  const isChurchLicensed = hasActiveChurchLicense(church.id);

  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [openCommentBox, setOpenCommentBox] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [devSettings, setDevSettings] = useState<DeveloperSettings>(getDeveloperSettings());
  const [devDonationConfig, setDevDonationConfig] = useState(() => getDonationConfig());
  const [isDonationModalOpen, setIsDonationModalOpen] = useState<boolean>(false);
  const [isChurchDonationModalOpen, setIsChurchDonationModalOpen] = useState<boolean>(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState<boolean>(false);
  const [sharingAnnouncement, setSharingAnnouncement] = useState<Announcement | null>(null);
  const [activeLightboxImage, setActiveLightboxImage] = useState<{
    url: string;
    title: string;
    caption?: string;
  } | null>(null);
  const [brokenImageUrls, setBrokenImageUrls] = useState<Record<string, boolean>>({});
  const [cloudRoster, setCloudRoster] = useState<Member[]>(() =>
    church?.id ? cachedChurchRosterMap.get(church.id) || [] : []
  );

  const markImageBroken = (url?: string | null) => {
    if (!url) return;
    setBrokenImageUrls((prev) => (prev[url] ? prev : { ...prev, [url]: true }));
  };

  const isUsableImageUrl = (url?: string | null): url is string =>
    Boolean(url && isValidDisplayImageUrl(url) && !brokenImageUrls[url]);

  // Helper to deduplicate comments by id, text and author (prevent any duplicates)
  const deduplicateComments = (rawComments: any[] = []): any[] => {
    const clean: any[] = [];
    const seenIds = new Set<string>();
    rawComments.forEach((c) => {
      const commentId = typeof c?.id === 'string' ? c.id : '';
      if (!c || c.isDemo || commentId === 'c1' || commentId === 'c2' || commentId.startsWith('comm_demo') || commentId.startsWith('demo_')) {
        return;
      }
      if (commentId && seenIds.has(commentId)) return;
      const isDup = clean.some(
        (u) =>
          (u.author || '').trim().toLowerCase() === (c.author || '').trim().toLowerCase() &&
          (u.text || '').trim().toLowerCase() === (c.text || '').trim().toLowerCase()
      );
      if (isDup) return;
      seenIds.add(c.id);
      clean.push(c);
    });
    return clean;
  };

  // Load persistent interactions for church services (canonical key: srv-feed-{service.id})
  const [interactions, setInteractions] = useState<Record<string, AnnouncementInteraction>>(() => {
    const initial: Record<string, AnnouncementInteraction> = {};
    const allStored = getAnnouncementInteractions(church.id);
    services.forEach((srv) => {
      if (!srv?.id) return;
      const feedId = getServiceFeedTargetId(srv.id);
      const stored = allStored[feedId] || allStored[srv.id];
      if (stored) {
        initial[feedId] = {
          ...stored,
          comments: deduplicateComments(stored.comments),
        } as AnnouncementInteraction;
      } else {
        initial[feedId] = {
          likes: 0,
          userLiked: false,
          reaction: undefined,
          comments: [],
        };
      }
    });
    return initial;
  });

  // Automatically purge demo/test comments once on mount
  useEffect(() => {
    try {
      purgeDemoComments();
    } catch (_) {}
  }, []);

  // Hydrate church roster once per church so service leader/reader/worship avatars render accurately
  useEffect(() => {
    if (!church?.id) return;
    const cached = cachedChurchRosterMap.get(church.id);
    if (cached && cached.length > 0) {
      setCloudRoster(cached);
      return;
    }
    if ((membersProp?.length || 0) > 1) return;
    const hasNamedServiceRoles = services.some((s) =>
      Boolean(s.leader || s.preacher || s.reader || s.musicians || s.ushers || s.preacherOrLeader)
    );
    if (!hasNamedServiceRoles) return;

    let cancelled = false;
    firestoreGetChurchMembersList(church.id)
      .then((fetched) => {
        if (cancelled || !Array.isArray(fetched) || fetched.length === 0) return;
        cachedChurchRosterMap.set(church.id, fetched);
        setCloudRoster(fetched);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [church?.id, membersProp?.length, services]);

  // Sync state with storage events
  useEffect(() => {
    const refreshInteractions = () => {
      const allStored = getAnnouncementInteractions(church.id);
      const updated: Record<string, AnnouncementInteraction> = {};
      services.forEach((srv) => {
        if (!srv?.id) return;
        const feedId = getServiceFeedTargetId(srv.id);
        const stored = allStored[feedId] || allStored[srv.id];
        if (stored) {
          updated[feedId] = {
            ...stored,
            comments: deduplicateComments(stored.comments),
          } as AnnouncementInteraction;
        }
      });
      if (Object.keys(updated).length > 0) {
        setInteractions((prev) => ({ ...prev, ...updated }));
      }
      setDevSettings(getDeveloperSettings());
      setDevDonationConfig(getDonationConfig());
    };

    window.addEventListener('omnichurch_dev_settings_updated', refreshInteractions);
    window.addEventListener('omnichurch_interactions_updated', refreshInteractions);
    window.addEventListener('storage', refreshInteractions);
    return () => {
      window.removeEventListener('omnichurch_interactions_updated', refreshInteractions);
      window.removeEventListener('omnichurch_dev_settings_updated', refreshInteractions);
      window.removeEventListener('storage', refreshInteractions);
    };
  }, [services, church.id]);

  const currentMemberIdentifier =
    member?.id || member?.memberId || member?.phone || member?.fullName || 'guest_member';

  const lastCommentTsStorageKey = `omnichurch_last_comment_ts_${currentMemberIdentifier}`;
  const lastCommentTimestampRef = useRef<number>(0);

  useEffect(() => {
    try {
      const savedTs = Number(localStorage.getItem(lastCommentTsStorageKey) || 0);
      lastCommentTimestampRef.current = Number.isFinite(savedTs) ? savedTs : 0;
    } catch {
      lastCommentTimestampRef.current = 0;
    }
  }, [lastCommentTsStorageKey]);

  const getLocalizedModerationMessage = (res: CommentModerationEvaluationResult): string => {
    if (isEs) return res.messageEs;
    if (isFr) return res.messageFr;
    if (isEn) return res.messageEn;
    return res.messageHt;
  };

  const resolveCommentTargetType = (annId: string, annObj?: Announcement): 'service' | 'announcement' => {
    if (annObj?.category === 'sevis' || Boolean(annObj?.serviceId) || annId.startsWith('srv-feed-')) {
      return 'service';
    }
    return 'announcement';
  };

  const currentMemberCandidateIds = [
    currentMemberIdentifier,
    member?.id,
    member?.memberId,
    member?.userId,
    member?.googleUid,
    member?.email,
    member?.phone,
  ];

  const servicesRef = useRef(services);
  const memberRef = useRef(member);
  servicesRef.current = services;
  memberRef.current = member;

  // Ensure new service feed items have an interaction bucket without tearing down Firestore listeners
  useEffect(() => {
    setInteractions((prev) => {
      let changed = false;
      const next = { ...prev };
      services.forEach((srv) => {
        if (!srv?.id) return;
        const feedId = getServiceFeedTargetId(srv.id);
        if (!next[feedId]) {
          next[feedId] = { likes: 0, userLiked: false, reaction: undefined, comments: [] };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [services]);

  // Normalize service interaction target keys so both `srv-feed-{id}` and raw `{id}` from mobile map to `srv-feed-{id}`
  const resolveCanonicalServiceFeedTarget = (rawTargetId: string, knownServiceIds: Set<string>): string => {
    const stripped = stripServiceFeedPrefix(rawTargetId);
    if (knownServiceIds.has(stripped) || rawTargetId.startsWith('srv-feed-')) {
      return getServiceFeedTargetId(stripped);
    }
    return rawTargetId;
  };

  // Cloud Firestore Real-Time Synchronization for Comments, Reactions, and Member Notifications
  // Uses stable [church.id, member?.id, member?.memberId] dependencies to eliminate listener churn
  useEffect(() => {
    if (!church?.id) return;
    const activeMember = memberRef.current;

    // 1. Listen for persistent comments in Cloud Firestore
    const unsubComments = subscribeToAnnouncementComments(church.id, (firestoreComments, meta) => {
      syncLocalCommentsFromServerSnapshot(church.id, firestoreComments, meta);

      setInteractions((prev) => {
        const next = { ...prev };
        const knownServiceIds = new Set<string>(servicesRef.current.map((s) => s.id).filter(Boolean));
        const grouped: Record<string, any[]> = {};
        firestoreComments.forEach((c) => {
          const rawTargetId = c.targetId || c.announcementId;
          if (!rawTargetId) return;
          const targetId = resolveCanonicalServiceFeedTarget(rawTargetId, knownServiceIds);
          if (!grouped[targetId]) grouped[targetId] = [];
          grouped[targetId].push(c);
        });

        const targetIds = new Set<string>([
          ...servicesRef.current.map((s) => getServiceFeedTargetId(s.id)),
          ...Object.keys(grouped),
          ...Object.keys(prev),
        ]);

        targetIds.forEach((tid) => {
          const current = next[tid] || { likes: 0, userLiked: false, comments: [] };
          const fsComments = grouped[tid] || [];
          next[tid] = {
            ...current,
            comments: deduplicateComments(fsComments),
          };
        });
        return next;
      });
    });

    // 2. Listen for persistent reactions in Cloud Firestore
    const unsubReactions = subscribeToAnnouncementReactions(church.id, (firestoreReactions) => {
      setInteractions((prev) => {
        const next = { ...prev };
        const knownServiceIds = new Set<string>(servicesRef.current.map((s) => s.id).filter(Boolean));
        const grouped: Record<string, AnnouncementReactionDoc[]> = {};
        firestoreReactions.forEach((r) => {
          const rawTargetId = r.targetId || r.announcementId;
          if (!rawTargetId) return;
          const targetId = resolveCanonicalServiceFeedTarget(rawTargetId, knownServiceIds);
          if (!grouped[targetId]) grouped[targetId] = [];
          grouped[targetId].push(r);
        });

        const curMember = memberRef.current;
        const candidateIds = new Set(
          [
            currentMemberIdentifier,
            curMember?.id,
            curMember?.memberId,
            curMember?.userId,
            curMember?.phone,
          ]
            .filter(Boolean)
            .map((v) => String(v).trim().toLowerCase())
        );

        const targetIds = new Set<string>([
          ...servicesRef.current.map((s) => getServiceFeedTargetId(s.id)),
          ...Object.keys(grouped),
          ...Object.keys(prev),
        ]);

        targetIds.forEach((tid) => {
          const current = next[tid] || { likes: 0, userLiked: false, comments: [] };
          const rList = grouped[tid] || [];
          const userReaction = rList.find((r) => {
            const rUid = String(r.userId || r.memberId || '').trim().toLowerCase();
            return rUid && candidateIds.has(rUid);
          });

          next[tid] = {
            ...current,
            likes: rList.length,
            userLiked: !!userReaction,
            reaction: userReaction
              ? ((userReaction.reactionType || userReaction.reaction) as ReactionType)
              : undefined,
          };
        });
        return next;
      });
    });

    // 3. Listen for member notification read/unread sync in Cloud Firestore
    const unsubNotifs = activeMember
      ? subscribeToMemberNotifications(church.id, activeMember, church, (fsNotifs) => {
          syncNotificationReadStatesFromCloud(fsNotifs, church.id, activeMember);
        })
      : () => {};

    return () => {
      unsubComments();
      unsubReactions();
      unsubNotifs();
    };
  }, [church.id, member?.id, member?.memberId, currentMemberIdentifier]);

  // Close comment section automatically when user clicks outside
  useEffect(() => {
    const hasAnyOpen = Object.values(openCommentBox).some(Boolean);
    if (!hasAnyOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Don't close if clicked inside a comment box or on any comment toggle trigger
      if (target.closest('[data-comment-box]') || target.closest('[data-comment-toggle]')) {
        return;
      }

      setOpenCommentBox({});
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenCommentBox({});
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick, { passive: true });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openCommentBox]);

  const effectiveRoster: Member[] = React.useMemo(() => {
    const byKey = new Map<string, Member>();
    const localChurchMembers = church?.id ? getMembersByChurch(church.id) : [];
    const combined = [
      ...(member ? [member] : []),
      ...(membersProp || []),
      ...localChurchMembers,
      ...cloudRoster,
    ];
    combined.forEach((m) => {
      if (!m) return;
      const key = (m.id || m.memberId || m.fullName || '').trim();
      if (!key) return;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, m);
      } else {
        const existingPhoto = resolveMemberProfilePhoto(existing);
        const nextPhoto = resolveMemberProfilePhoto(m);
        if (!existingPhoto && nextPhoto) {
          byKey.set(key, { ...existing, ...m });
        }
      }
    });
    return Array.from(byKey.values());
  }, [church?.id, member, membersProp, cloudRoster]);

  const activeService = services.find((s) => isServiceCurrentlyActive(s, isServiceEnded));
  const feedServices = getMemberFeedServices(services, church.id, church.code, filterCategory);

  const renderRoleAvatars = (
    avatars: ResolvedRoleAvatar[],
    roleKind: 'leader' | 'preacher' | 'reader' | 'musicians' | 'ushers'
  ) => {
    const roleTheme = {
      leader: {
        ring: 'ring-amber-400/50 border-amber-400/50',
        gradient: 'from-amber-500 to-orange-600',
        badge: 'bg-amber-400 text-slate-950',
        Icon: Crown,
      },
      preacher: {
        ring: 'ring-emerald-400/50 border-emerald-400/50',
        gradient: 'from-emerald-500 to-teal-600',
        badge: 'bg-emerald-400 text-slate-950',
        Icon: BookOpen,
      },
      reader: {
        ring: 'ring-cyan-400/50 border-cyan-400/50',
        gradient: 'from-cyan-500 to-sky-600',
        badge: 'bg-cyan-400 text-slate-950',
        Icon: ScrollText,
      },
      musicians: {
        ring: 'ring-purple-400/50 border-purple-400/50',
        gradient: 'from-purple-500 to-fuchsia-600',
        badge: 'bg-purple-400 text-slate-950',
        Icon: Music,
      },
      ushers: {
        ring: 'ring-rose-400/50 border-rose-400/50',
        gradient: 'from-rose-500 to-pink-600',
        badge: 'bg-rose-400 text-slate-950',
        Icon: HeartHandshake,
      },
    }[roleKind];

    const RoleIcon = roleTheme.Icon;
    const displayList = avatars.slice(0, 3);

    return (
      <div className="relative flex items-center shrink-0">
        <div className={`flex items-center ${displayList.length > 1 ? '-space-x-2' : ''}`}>
          {displayList.map((person, idx) => {
            const photoUrl = isUsableImageUrl(person.avatarUrl) ? person.avatarUrl : null;
            return photoUrl ? (
              <img
                key={`${roleKind}-${person.name}-${idx}`}
                src={photoUrl}
                alt={person.name}
                onError={() => markImageBroken(photoUrl)}
                className={`w-9 h-9 rounded-full object-cover border ${roleTheme.ring} ring-2 ring-slate-950 shadow-sm bg-slate-900`}
              />
            ) : (
              <div
                key={`${roleKind}-${person.name}-${idx}`}
                className={`w-9 h-9 rounded-full bg-gradient-to-br ${roleTheme.gradient} text-white font-black text-[11px] flex items-center justify-center ring-2 ring-slate-950 shadow-sm`}
              >
                {person.initials}
              </div>
            );
          })}
        </div>
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ${roleTheme.badge} border border-slate-950 flex items-center justify-center shadow-sm`}
        >
          <RoleIcon className="w-2.5 h-2.5" />
        </span>
      </div>
    );
  };

  const getServiceCategoryBadge = (cat: ServiceCategory | string) => {
    const cfg = SERVICE_CATEGORIES[cat as ServiceCategory] || SERVICE_CATEGORIES.general;
    const label = isEs
      ? cfg.name.es || cfg.name.fr
      : isEn
      ? cfg.name.en || cfg.name.ht
      : isFr
      ? cfg.name.fr
      : cfg.name.ht;
    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-white/10 inline-flex items-center gap-1 ${cfg.badgeBg} ${cfg.badgeText}`}
      >
        <Calendar className="w-2.5 h-2.5 shrink-0" />
        <span>{label}</span>
      </span>
    );
  };

  // Select specific reaction via Long-Press, Swipe, or Dock Click
  const handleSelectReaction = (targetFeedId: string, reactionType: ReactionType) => {
    setInteractions((prev) => {
      const current = prev[targetFeedId] || { likes: 0, userLiked: false, comments: [] };
      const isSameReaction = current.userLiked && current.reaction === reactionType;

      const updated = {
        ...current,
        likes: isSameReaction ? current.likes : current.userLiked ? current.likes : current.likes + 1,
        userLiked: true,
        reaction: reactionType,
      };

      saveAnnouncementInteraction(targetFeedId, updated);
      return {
        ...prev,
        [targetFeedId]: updated,
      };
    });

    // Cloud Firestore synchronization (persists across updates and native Android apps)
    firestoreSetAnnouncementReaction(
      targetFeedId,
      currentMemberIdentifier,
      church.id,
      reactionType,
      member?.fullName || 'Manm Legliz'
    ).catch((err) => {
      console.warn('Firestore reaction sync warning:', err);
    });

    const targetConfig = REACTION_LIST.find((r) => r.id === reactionType);
    toast.info(
      `${isEs ? 'Reacción' : 'Reyaksyon'} ${targetConfig?.emoji || '🙏'}`,
      isEs ? `${targetConfig?.label || '¡Amén!'} registrada con éxito.` : `${targetConfig?.label || 'Amen!'} anrejistre avèk siksè.`
    );
  };

  // Toggle Default Reaction on Single Tap/Click
  const handleToggleDefault = (targetFeedId: string) => {
    setInteractions((prev) => {
      const current = prev[targetFeedId] || { likes: 0, userLiked: false, comments: [] };
      const nextUserLiked = !current.userLiked;
      const nextLikes = nextUserLiked ? current.likes + 1 : Math.max(0, current.likes - 1);
      const nextReaction = nextUserLiked ? (current.reaction || 'pray') : undefined;

      const updated = {
        ...current,
        likes: nextLikes,
        userLiked: nextUserLiked,
        reaction: nextReaction,
      };

      saveAnnouncementInteraction(targetFeedId, updated);

      // Cloud Firestore synchronization
      if (nextUserLiked) {
        firestoreSetAnnouncementReaction(
          targetFeedId,
          currentMemberIdentifier,
          church.id,
          nextReaction || 'pray',
          member?.fullName || 'Manm Legliz'
        ).catch((err) => {
          console.warn('Firestore reaction sync warning:', err);
        });
      } else {
        firestoreRemoveAnnouncementReaction(targetFeedId, currentMemberIdentifier).catch((err) => {
          console.warn('Firestore reaction removal warning:', err);
        });
      }

      return {
        ...prev,
        [targetFeedId]: updated,
      };
    });
  };

  // Add Comment/Reply (Enforces Real-Time Cloud Moderation Policy from Developer Engine)
  const handleAddComment = (feedId: string, serviceObj?: ServiceSession) => {
    const rawInput = commentInputs[feedId] || '';
    const text = rawInput.trim();
    if (!text) return;

    const targetType = resolveCommentTargetType(
      feedId,
      serviceObj ? { category: 'sevis', serviceId: serviceObj.id } as Announcement : undefined
    );
    const modEval = evaluateCommentAgainstModeration({
      content: text,
      churchId: church.id,
      userIds: currentMemberCandidateIds,
      targetType,
      lastCommentTimestampMs: lastCommentTimestampRef.current || undefined,
      customConfig: devSettings.commentModeration,
    });

    if (!modEval.allowed) {
      toast.error(
        isEs
          ? 'Comentario bloqueado'
          : isFr
          ? 'Commentaire bloqué'
          : isEn
          ? 'Comment blocked'
          : 'Kòmantè Bloke',
        getLocalizedModerationMessage(modEval)
      );
      return;
    }

    const nowMs = Date.now();
    lastCommentTimestampRef.current = nowMs;
    try {
      localStorage.setItem(lastCommentTsStorageKey, String(nowMs));
    } catch {}

    const authorName = member?.fullName || (isEs ? 'Miembro de la Iglesia' : 'Manm Legliz');
    const initials = authorName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    const resolvedPhotoUrl =
      member?.avatarUrl || member?.photoUrl || member?.googlePhoto || null;

    // Call storage helper which returns the saved sanitized comment
    const saved = addAnnouncementComment(feedId, {
      targetId: feedId,
      userId: currentMemberIdentifier,
      userName: authorName,
      userPhotoUrl: resolvedPhotoUrl,
      content: text,
      author: authorName,
      text,
      time: isEs ? 'Ahora' : isEn ? 'Now' : isFr ? 'Maintenant' : 'Kounye a',
      avatarInitials: initials,
      isDemo: false,
      churchId: church.id,
    });

    // Cloud Firestore persistent synchronization across updates & native platforms
    firestoreAddAnnouncementComment(saved).catch((err) => {
      console.warn('Firestore add comment sync warning:', err);
    });

    setInteractions((prev) => {
      const current = prev[feedId] || { likes: 0, userLiked: false, comments: [] };
      const existing = current.comments || [];
      // Prevent duplicate in local state if already present
      const alreadyHas = existing.some(
        (c) =>
          c.id === saved.id ||
          (((c.author || '').trim().toLowerCase() === (saved.author || '').trim().toLowerCase()) &&
            ((c.text || '').trim().toLowerCase() === (saved.text || '').trim().toLowerCase()))
      );
      if (alreadyHas) {
        return prev;
      }
      return {
        ...prev,
        [feedId]: {
          ...current,
          comments: [...existing, saved],
        },
      };
    });

    setCommentInputs((prev) => ({ ...prev, [feedId]: '' }));
    toast.success(
      isEs ? '¡Comentario Publicado!' : isFr ? 'Commentaire Publié !' : isEn ? 'Comment Posted!' : 'Kòmantè Pibliye!',
      isEs ? 'Gracias por tu aliento y participación activa.' : isFr ? 'Merci pour votre encouragement et participation.' : isEn ? 'Thank you for your encouragement and engagement.' : 'Mèsi pou ankourajman ak patisipasyon w.'
    );
  };

  // Delete Comment
  const handleDeleteComment = (annId: string, commentId: string) => {
    deleteAnnouncementComment(commentId);

    // Cloud Firestore deletion
    firestoreDeleteAnnouncementComment(commentId).catch((err) => {
      console.warn('Firestore delete comment warning:', err);
    });

    setInteractions((prev) => {
      const current = prev[annId];
      if (!current) return prev;
      return {
        ...prev,
        [annId]: {
          ...current,
          comments: current.comments.filter((c) => c.id !== commentId),
        },
      };
    });
    toast.info(isEs ? 'Comentario eliminado' : isFr ? 'Commentaire supprimé' : isEn ? 'Comment deleted' : 'Kòmantè efase');
  };

  // Share Service via navigator.share() / Capacitor Share with clean official URL: https://omnichurch.download
  const handleShareService = async (srv: ServiceSession) => {
    const title = srv.title;
    const content = buildServiceShareText(srv, church, (language as Language) || 'ht');
    const shareUrl = 'https://omnichurch.download';
    const shareDateLabel = formatServiceFullDateLabel(srv.date, (language as Language) || 'ht');
    const shareTimeLabel = formatServiceTimeRangeAmPm(srv.startTime, srv.endTime, '');
    const textToShare = `📢 *${church.name}*\n📅 *${title}*\n\n${content}\n\n📅 ${shareDateLabel}${shareTimeLabel ? ` • ⏰ ${shareTimeLabel}` : ''}\n📍 ${church.city || ''} ${church.country || ''}`;

    // 1. Native Mobile Platform (Capacitor Android / iOS)
    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share({
          title: `${church.name} - ${title}`,
          text: textToShare,
          url: shareUrl,
          dialogTitle: isEs ? 'Compartir culto' : isFr ? 'Partager le culte' : isEn ? 'Share service' : 'Pataje sèvis sa a',
        });
        return;
      } catch (err: any) {
        if (err?.message?.includes('canceled') || err?.message?.includes('cancelled')) {
          return;
        }
      }
    }

    // 2. Web Browser Native Share (Android Chrome, iOS Safari, PWA)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${church.name} - ${title}`,
          text: textToShare,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return;
        }
      }
    }

    // 3. Fallback: Desktop browsers -> open Clean Share Modal
    setSharingAnnouncement(buildServiceShareAnnouncement(srv, church, (language as Language) || 'ht'));
  };

  const memberDisplayName = member?.fullName ? member.fullName.split(' ')[0] : (isEs ? 'Bienvenido' : isFr ? 'Bienvenue' : isEn ? 'Welcome' : 'Byenvini');

  // Active sponsors for advertisement section
  const activeSponsors = devSettings.sponsors?.filter((s) => s.active) || [];

  return (
    <div className="space-y-6 pb-12">
      {/* =========================================================================
          1. COMPACT & CLEAN ULTRA PRO MAX WELCOME HERO BANNER
          ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl backdrop-blur-2xl bg-gradient-to-r from-slate-900/95 via-[#0d162d]/90 to-indigo-950/95 text-white p-5 sm:p-6 shadow-2xl border border-white/15">
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-amber-400/15 via-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 text-xs font-bold shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="flex items-center gap-1">
                <span>{church.name}</span>
                {isChurchLicensed && (
                  <BadgeCheck
                    className="w-3.5 h-3.5 text-sky-400 shrink-0 inline-block"
                    title={isEs ? 'Iglesia con Licencia Verificada' : 'Legliz verifye ak lisans ofisyèl'}
                  />
                )}
              </span>
              <span>•</span>
              <span className="font-mono">{church.code}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
              {isEs ? (
                <>La paz de Dios sea contigo, <span className="text-amber-300 inline-flex items-center gap-1"><span>{memberDisplayName}</span>{isChurchLicensed && member && (<BadgeCheck className="w-4 h-4 text-sky-400 shrink-0 inline-block" title="Miembro de Iglesia con Licencia Verificada" />)}</span> 🕊️</>
              ) : isEn ? (
                <>The peace of God be with you, <span className="text-amber-300 inline-flex items-center gap-1"><span>{memberDisplayName}</span>{isChurchLicensed && member && (<BadgeCheck className="w-4 h-4 text-sky-400 shrink-0 inline-block" title="Verified Member of Licensed Church" />)}</span> 🕊️</>
              ) : isFr ? (
                <>La paix de Dieu soit avec vous, <span className="text-amber-300 inline-flex items-center gap-1"><span>{memberDisplayName}</span>{isChurchLicensed && member && (<BadgeCheck className="w-4 h-4 text-sky-400 shrink-0 inline-block" title="Membre d'Église sous Licence Vérifiée" />)}</span> 🕊️</>
              ) : (
                <>Lapè Bondye avèk ou, <span className="text-amber-300 inline-flex items-center gap-1"><span>{memberDisplayName}</span>{isChurchLicensed && member && (<BadgeCheck className="w-4 h-4 text-sky-400 shrink-0 inline-block" title="Manm legliz verifye ak lisans ofisyèl" />)}</span> 🕊️</>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {isEs
                ? 'Consulte los próximos cultos y servicios de la iglesia, confirme su asistencia e interactúe con la comunidad.'
                : isEn
                ? 'Follow upcoming worship services, interact with your church community, and check your schedule at a glance.'
                : isFr
                ? 'Consultez les prochains cultes et services de l’église, interagissez avec la communauté et suivez le programme.'
                : 'Swiv dènye sèvis ak kilt legliz la, patisipe nan kominikasyon an, epi rete konekte sou tout pwogram yo.'}
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <button
              type="button"
              id="btn-member-open-terms-header"
              onClick={() => setIsTermsModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/90 border border-slate-700/80 hover:border-amber-400/40 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>{isEs ? 'Reglamento y Privacidad' : isFr ? 'Règlement & Vie Privée' : isEn ? 'Rules & Privacy' : 'Règlemantasyon & Vi Prive'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* DEACON MINISTRY QUICK ACTIONS (WHEN LOGGED IN MEMBER IS AN ACTIVE DEACON) */}
      {isDeacon && (onOpenDeaconServices || onOpenDeaconAnnouncements) && (
        <div
          id="deacon-home-quick-card"
          className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900/95 to-amber-950/40 border border-amber-400/40 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 backdrop-blur-md"
        >
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                {isEs
                  ? 'Espacio de Diaconado Activo'
                  : isEn
                  ? 'Active Deacon Ministry Workspace'
                  : isFr
                  ? 'Espace Diaconat Actif'
                  : 'Espas Sèvis Dyakonat Aktif'}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {isEs
                  ? 'Puede crear o programar servicios de culto y publicar avisos para toda la congregación.'
                  : isEn
                  ? 'Create worship services and publish church-wide announcements with your deacon role.'
                  : isFr
                  ? 'Créez des cultes et publiez des annonces pour la congrégation avec votre rôle de diacre.'
                  : 'Kòm dyak aktif, ou kapab kreye pwogram sèvis epi pibliye anons pou tout legliz la.'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onOpenDeaconServices && (
              <button
                type="button"
                id="btn-deacon-home-services"
                onClick={onOpenDeaconServices}
                className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow transition-colors cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-slate-950" />
                <span>
                  {isEs ? 'Crear / Gestionar Cultos' : isEn ? 'Create / Manage Services' : isFr ? 'Créer / Gérer Cultes' : 'Kreye / Jere Sèvis'}
                </span>
              </button>
            )}
            {onOpenDeaconAnnouncements && (
              <button
                type="button"
                id="btn-deacon-home-announcements"
                onClick={onOpenDeaconAnnouncements}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/40 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Megaphone className="w-4 h-4 text-amber-400" />
                <span>
                  {isEs ? 'Publicar Avisos' : isEn ? 'Publish Announcements' : isFr ? 'Publier Annonces' : 'Pibliye Anons'}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ACTIVE SERVICE ALERT (IF OPEN) */}
      {activeService && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900/95 to-emerald-950/60 text-white border border-emerald-500/50 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  {isEs ? 'Culto Activo Ahora — Asistencia Abierta' : isEn ? 'Active Service Now — Attendance Open' : isFr ? 'Culte Actif Maintenant — Présence Ouverte' : 'Kilt Aktif Kounye a — Prezans Louvri'}
                </span>
              </div>
              <h3 className="text-base font-bold text-white">
                {activeService.title}
              </h3>
              <p className="text-xs text-slate-400">
                {formatServiceTimeRangeAmPm(activeService.startTime, activeService.endTime, '')} • {isEs ? 'Dirigido por:' : 'Dirije pa:'} {activeService.preacherOrLeader}
              </p>
            </div>
          </div>
          <div className="w-full sm:w-auto flex flex-wrap items-center gap-2">
            {isReception && onOpenReceptionScanner && (
              <button
                type="button"
                id="btn-reception-home-scan"
                onClick={onOpenReceptionScanner}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4 text-slate-950" />
                <span>
                  {isEs
                    ? 'Escanear Asistencia (Recepción)'
                    : isEn
                    ? 'Scan Attendance (Reception)'
                    : isFr
                    ? 'Scanner Présence (Réception)'
                    : 'Eskane Prezans (Resepsyon)'}
                </span>
              </button>
            )}
            {isReception && onOpenReceptionDesk && (
              <button
                type="button"
                id="btn-reception-home-desk"
                onClick={onOpenReceptionDesk}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>{isEs ? 'Recepción' : isEn ? 'Reception Desk' : isFr ? 'Réception' : 'Espas Resepsyon'}</span>
              </button>
            )}
            <button
              type="button"
              id="btn-show-code-for-active"
              onClick={onOpenMyCode}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-slate-950" />
              <span>{isEs ? 'Mostrar Mi Código para Escaneo' : isEn ? 'Show My Code to Scan' : isFr ? 'Afficher Mon Code à Scanner' : 'Montre Kòd Mwen pou Scan'}</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          3. FIL AKTYALITE SÈVIS AK KILT LEGLIZ LA (SAN ANONS — ANONS YO NAN NOTIFIKASYON)
          ========================================================================= */}
      <div className="space-y-4 pt-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" />
              {isEs ? `Cultos y Servicios (${church.name})` : isEn ? `Services & Worship Feed (${church.name})` : isFr ? `Cultes & Services (${church.name})` : `Sèvis & Kilt Legliz la (${church.name})`}
            </h3>
            <p className="text-xs text-slate-400">
              {isEs
                ? 'Todos los cultos, horarios y programas ministeriales de la iglesia en tiempo real.'
                : isEn
                ? 'All worship services, schedules, and ministry lineups in one live feed.'
                : isFr
                ? 'Tous les cultes, horaires et responsables de service de l’église en un coup d’œil.'
                : 'Tout sèvis kilt, orè ak ekip ki sou sèvis legliz la an dirèk nan fil aktyalite a.'}
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'all', label: isEs ? 'Todos' : isEn ? 'All' : isFr ? 'Tout' : 'Tout' },
              ...Object.values(SERVICE_CATEGORIES).map((cat) => ({
                id: cat.id,
                label: isEs
                  ? cat.name.es || cat.name.fr
                  : isEn
                  ? cat.name.en || cat.name.ht
                  : isFr
                  ? cat.name.fr
                  : cat.name.ht,
              })),
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                id={`filter-news-${tab.id}`}
                onClick={() => setFilterCategory(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  filterCategory === tab.id
                    ? 'bg-amber-400 text-slate-950 shadow-md scale-[1.02]'
                    : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-700/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Services Feed List */}
        <AnimatePresence mode="wait">
          <motion.div
            key={filterCategory}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* 1. CHURCH-SPECIFIC DONATION & TITHES BANNER (DÎMES, OFRANN AK KONT LABANK PWÒP LEGLIZ LA - FÈMEN PA DEFO) */}
            {church.donationInfo?.enabled === true && (
              <div className="mb-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900/90 to-indigo-950/40 border border-emerald-500/40 shadow-xl relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-300 shadow-inner">
                      <Wallet className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {isEs ? '🏛️ Donaciones y Díezmos de la Iglesia' : isFr ? '🏛️ Dîmes, Dons & Offrandes de l’Église' : isEn ? '🏛️ Church Giving, Tithes & Offerings' : '🏛️ Dîm, Ofrann & Donasyon Legliz la'}
                        </span>
                        <span className="text-[11px] text-slate-300 font-bold">
                          {church.name}
                        </span>
                      </div>
                      <h4 className="text-sm font-extrabold text-white">
                        {isEs
                          ? '«Apoye la obra y los ministerios de nuestra congregación»'
                          : isEn
                          ? '“Support the ministry, mission, and services of our local church”'
                          : isFr
                          ? '« Soutenez le ministère, la mission et les projets de notre assemblée »'
                          : '« Soutni travay Bondye, ministè ak sèvis legliz lokal nou an »'}
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 max-w-xl">
                        {isEs
                          ? 'Consulte los números de cuenta bancaria oficial, PayPal, transferencias y notas personalizadas de nuestra iglesia.'
                          : isEn
                          ? 'View official church bank details, PayPal, transfers, and custom giving instructions.'
                          : isFr
                          ? 'Consultez les coordonnées bancaires officielles, PayPal, virements et instructions de l’église.'
                          : 'Gade enfòmasyon kont labank ofisyèl, PayPal, MonCash/Zelle ak enstriksyon legliz nou an.'}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center">
                    <button
                      type="button"
                      id="btn-member-open-church-donation"
                      onClick={() => setIsChurchDonationModalOpen(true)}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer transform active:scale-95"
                    >
                      <DollarSign className="w-4 h-4 text-slate-950" />
                      <span>{isEs ? 'Díezmos y Ofrendas (Ver Cuentas)' : isEn ? 'Give to Church (View Accounts)' : isFr ? 'Donner à l’Église (Voir Comptes)' : 'Peye Dîm / Fè Don ak Legliz la'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. SPONSORED / DONATION ANNOUNCEMENT CARD (DEV SUPPORT: JACKSON CHARLES) */}
            <div className="mb-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-slate-900/90 border border-amber-500/30 shadow-lg shadow-amber-500/5 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center shrink-0 text-amber-300 shadow-inner">
                    <HeartHandshake className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                        {isEs ? '🌟 Mensaje del Desarrollador' : isEn ? '🌟 Developer Spotlight' : isFr ? '🌟 Message du Développeur' : '🌟 Mesaj Devlopè a'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        Jackson Charles • {isEs ? 'Crecimiento de la Iglesia' : isEn ? 'Church Social Growth' : isFr ? 'Croissance Sociale' : 'Kwasans Sosyal Legliz la'}
                      </span>
                    </div>
                    <h4 className="text-sm font-extrabold text-white">
                      {isEs
                        ? '«Mi objetivo es ayudar a la iglesia a crecer social, espiritual y tecnológicamente.»'
                        : isEn
                        ? '“My purpose is to empower the church to grow socially, spiritually, and digitally.”'
                        : isFr
                        ? '« Mon but est d’aider l’église à grandir socialement, spirituellement et numériquement. »'
                        : '« Objektif mwen se ede legliz la grandi sosyalman, espirityèlman ak nimerikman. »'}
                    </h4>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl">
                      {(() => {
                        const list: string[] = [];
                        if (devDonationConfig.paypalEnabled) list.push('PayPal');
                        if (devDonationConfig.binanceEnabled) list.push(isEs ? 'Binance USDT' : 'Binance Crypto');
                        if (devDonationConfig.wiseEnabled) list.push('Wise');
                        if (devDonationConfig.moncashEnabled) list.push('MonCash');
                        if (devDonationConfig.zelleEnabled) list.push('Zelle');
                        const channelStr = list.length > 0 ? ` (${list.join(', ')})` : '';

                        return isEs
                          ? `Usted puede apoyar este proyecto ministerial haciendo una donación voluntaria${channelStr}.`
                          : isEn
                          ? `You can support this ministry project by making a voluntary donation${channelStr}.`
                          : isFr
                          ? `Vous pouvez soutenir ce projet ministériel en faisant un don volontaire${channelStr}.`
                          : `Ou kapab sipòte pwojè ministeryèl sa a avèk yon donasyon volontè${channelStr}.`;
                      })()}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center">
                  <DonateButton
                    id="btn-member-open-donation"
                    size="inline"
                    language={language}
                    onClick={() => {
                      if (onOpenDonateScreen) {
                        onOpenDonateScreen();
                      } else {
                        setIsDonationModalOpen(true);
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {feedServices.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/60 rounded-3xl border border-slate-800 text-slate-400 backdrop-blur-md">
                <p className="text-sm">
                  {isEs
                    ? 'No hay servicios programados en esta categoría por el momento.'
                    : isEn
                    ? 'No worship services scheduled in this category for now.'
                    : isFr
                    ? 'Aucun culte ou service dans cette catégorie pour le moment.'
                    : 'Pa gen okenn sèvis kilt nan kategori sa a pou kounye a.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {feedServices.map((srv, srvIndex) => {
                  const feedId = getServiceFeedTargetId(srv.id);
                  const srvInteraction = interactions[feedId] || {
                    likes: 0,
                    userLiked: false,
                    comments: [],
                  };
                  const isCommentOpen = !!openCommentBox[feedId];
                  const cleanComments = deduplicateComments(srvInteraction.comments);
                  const commentCount = cleanComments.length;
                  const effectiveLikesCount = srvInteraction.likes;

                  const isLive = isServiceCurrentlyActive(srv, isServiceEnded);
                  const isEnded = isServiceEnded(srv);
                  const calBadge = formatServiceCalendarBadge(srv.date, (language as Language) || 'ht');
                  const formattedServiceDate = formatServiceFullDateLabel(srv.date, (language as Language) || 'ht');

                  const formattedTimestamp = formatAnnouncementTimestamp(
                    srv.createdAt,
                    srv.date,
                    srv.startTime,
                    (language as Language) || 'ht'
                  );

                  const serviceLeader = srv.leader?.trim() || undefined;
                  const rawFallbackPreacher =
                    srv.preacher?.trim() || (!serviceLeader ? srv.preacherOrLeader?.trim() : undefined);
                  const servicePreacher =
                    rawFallbackPreacher &&
                    (!serviceLeader ||
                      normalizePersonNameForMatch(rawFallbackPreacher) !==
                        normalizePersonNameForMatch(serviceLeader))
                      ? rawFallbackPreacher
                      : undefined;
                  const serviceReader = srv.reader;
                  const serviceMusicians = srv.musicians;
                  const serviceUshers = srv.ushers;
                  const hasServiceRoles = !!(serviceLeader || servicePreacher || serviceReader || serviceMusicians || serviceUshers);

                  const leaderAvatars = serviceLeader
                    ? resolveMemberAvatarsForRole(serviceLeader, effectiveRoster, church, 1)
                    : [];
                  const preacherAvatars = servicePreacher
                    ? resolveMemberAvatarsForRole(servicePreacher, effectiveRoster, church, 1)
                    : [];
                  const readerAvatars = serviceReader
                    ? resolveMemberAvatarsForRole(serviceReader, effectiveRoster, church, 1)
                    : [];
                  const musiciansAvatars = serviceMusicians
                    ? resolveMemberAvatarsForRole(serviceMusicians, effectiveRoster, church, 3)
                    : [];
                  const ushersAvatars = serviceUshers
                    ? resolveMemberAvatarsForRole(serviceUshers, effectiveRoster, church, 3)
                    : [];

                  const usableChurchLogo = isUsableImageUrl(church.logoUrl) ? church.logoUrl : null;
                  const usableChurchBanner = isUsableImageUrl(church.bannerUrl) ? church.bannerUrl : null;
                  const churchInitials =
                    church.name
                      .trim()
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((w) => w[0] || '')
                      .join('')
                      .toUpperCase() ||
                    church.name.slice(0, 2).toUpperCase() ||
                    'OM';

                  const rawServiceThumb = resolveServiceThumbnailUrl(srv);
                  const serviceThumbUrl = isUsableImageUrl(rawServiceThumb) ? rawServiceThumb : null;
                  const programMiniThumb = serviceThumbUrl || usableChurchBanner || usableChurchLogo;

                  return (
                    <React.Fragment key={srv.id}>
                      <div
                        id={`service-feed-card-${srv.id}`}
                        className={`ios-glass-card ios-specular-highlight rounded-2xl sm:rounded-3xl transition-all duration-300 overflow-hidden ${
                          isLive
                            ? 'ring-1 ring-emerald-400/60 shadow-[0_16px_45px_rgba(16,185,129,0.18)]'
                            : !isEnded
                            ? 'ring-1 ring-amber-400/35 shadow-[0_14px_40px_rgba(251,191,36,0.10)]'
                            : 'hover:shadow-[0_22px_55px_rgba(0,0,0,0.65)]'
                        }`}
                      >
                        {/* =========================================================================
                            1. FACEBOOK-STYLE SERVICE POST HEADER
                            ========================================================================= */}
                        <div className="p-3.5 sm:p-5 pb-2.5 sm:pb-3 flex items-start justify-between gap-2.5 sm:gap-3">
                          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                            {/* Church Profile Avatar */}
                            <div className="relative shrink-0">
                              {usableChurchLogo ? (
                                <img
                                  src={usableChurchLogo}
                                  alt={church.name}
                                  onError={() => markImageBroken(usableChurchLogo)}
                                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border border-indigo-400/40 shadow-md ring-1 ring-white/10 bg-slate-900"
                                />
                              ) : (
                                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-indigo-600 via-purple-600 to-amber-500 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-md ring-1 ring-white/10">
                                  {churchInitials}
                                </div>
                              )}
                              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white border border-slate-950 flex items-center justify-center shadow-sm">
                                <Building2 className="w-2.5 h-2.5" />
                              </span>
                            </div>

                            {/* Church Name, Verified Badge & Metadata */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-white text-xs sm:text-base truncate max-w-[160px] xs:max-w-[220px] sm:max-w-none">
                                  {church.name}
                                </span>
                                {isChurchLicensed && (
                                  <BadgeCheck
                                    className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400 fill-sky-400/20 shrink-0"
                                    title={isEs ? 'Culto Oficial Verificado (Iglesia con Licencia)' : isFr ? 'Culte Officiel Vérifié' : isEn ? 'Verified Official Service' : 'Sèvis Ofisyèl Verifye (Legliz ak Lisans)'}
                                  />
                                )}
                                {getServiceCategoryBadge(srv.category)}
                                {isLive ? (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 shadow-sm animate-pulse">
                                    {isEs ? 'EN VIVO' : isFr ? 'EN DIRECT' : isEn ? 'LIVE' : 'AN DIRÈK'}
                                  </span>
                                ) : isEnded ? (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                                    {isEs ? 'FINALIZADO' : isFr ? 'TERMINÉ' : isEn ? 'ENDED' : 'FINI'}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                                    {isEs ? 'PRÓXIMO' : isFr ? 'À VENIR' : isEn ? 'UPCOMING' : 'PWOGRAME'}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-slate-400 mt-0.5 flex-wrap">
                                <span className="font-medium flex items-center gap-1 text-slate-300">
                                  <Clock className="w-3 h-3 text-amber-400/80 shrink-0" />
                                  {formattedTimestamp}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-slate-400" title={isEs ? 'Público para todos los miembros' : isFr ? 'Public pour tous les membres' : isEn ? 'Public to all members' : 'Piblik pou tout manm'}>
                                  <Globe className="w-3 h-3 text-slate-400" />
                                  <span className="text-[10px] sm:text-[11px]">{isEs ? 'Público' : isFr ? 'Public' : isEn ? 'Public' : 'Piblik'}</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right Controls: Share Button */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleShareService(srv)}
                              className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                              title={isEs ? 'Compartir culto' : isFr ? 'Partager le culte' : isEn ? 'Share service' : 'Pataje sèvis sa a'}
                            >
                              <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        </div>

                        {/* =========================================================================
                            2. SERVICE TITLE, THEME, PASSAGE & NOTES
                            ========================================================================= */}
                        <div className="px-3.5 sm:px-5 pb-3 space-y-1.5">
                          <h4 className="text-sm sm:text-lg font-bold text-white leading-snug">
                            {srv.title}
                          </h4>

                          {srv.theme && (
                            <p className="text-xs sm:text-sm text-amber-300 font-semibold flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>{isEs ? 'Tema:' : isFr ? 'Thème :' : isEn ? 'Theme:' : 'Tèm:'} {srv.theme}</span>
                            </p>
                          )}

                          {srv.passage && (
                            <p className="text-xs sm:text-sm text-sky-300 font-medium flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                              <span>{isEs ? 'Lectura bíblica:' : isFr ? 'Texte biblique :' : isEn ? 'Scripture:' : 'Pasaj Biblik:'} {srv.passage}</span>
                            </p>
                          )}

                          {srv.notes ? (
                            <p className="text-xs sm:text-sm text-slate-200 whitespace-pre-line leading-relaxed">
                              {srv.notes}
                            </p>
                          ) : (
                            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                              {buildServiceShareText(srv, church, (language as Language) || 'ht')}
                            </p>
                          )}
                        </div>

                        {/* =========================================================================
                            2B. SERVICE COVER / THUMBNAIL (MINYATI SÈVIS)
                            ========================================================================= */}
                        {serviceThumbUrl && (
                          <div className="px-3.5 sm:px-5 pb-3">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveLightboxImage({
                                  url: serviceThumbUrl,
                                  title: srv.title,
                                  caption: `${church.name} • ${formattedServiceDate}${srv.startTime ? ` (${formatServiceTimeRangeAmPm(srv.startTime, srv.endTime, '')})` : ''}`,
                                })
                              }
                              className="relative w-full rounded-2xl overflow-hidden border-0 bg-slate-950/70 group block text-left cursor-pointer shadow-lg"
                            >
                              <img
                                src={serviceThumbUrl}
                                alt={srv.title}
                                onError={() => markImageBroken(serviceThumbUrl)}
                                className="w-full h-auto max-h-[520px] object-contain mx-auto block transition-transform duration-300 group-hover:scale-[1.01] border-0"
                              />
                              <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-slate-950/80 via-slate-950/25 to-transparent pointer-events-none" />
                              <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between gap-2">
                                <span className="px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/15 text-[10px] font-bold text-amber-300 truncate max-w-[75%]">
                                  {formattedServiceDate} {srv.startTime ? `• ${formatServiceTimeAmPm(srv.startTime)}` : ''}
                                </span>
                                <span className="w-7 h-7 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/15 text-white flex items-center justify-center opacity-85 group-hover:opacity-100 transition-opacity">
                                  <ZoomIn className="w-3.5 h-3.5" />
                                </span>
                              </div>
                            </button>
                          </div>
                        )}

                        {/* =========================================================================
                            3. CHURCH SERVICE & WORSHIP PROGRAM (FACEBOOK EVENT STYLE)
                            ========================================================================= */}
                        <div className="px-0 pb-3">
                          <div className="w-full px-3.5 sm:px-5 py-3 space-y-3 bg-transparent border-0 rounded-none shadow-none">
                            {/* Event Header Banner with Minyati Thumbnail */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                {/* Service Thumbnail Tile (displays uploaded minyati or church visual cover + clean date chip) */}
                                {programMiniThumb ? (
                                  <button
                                    type="button"
                                    disabled={!serviceThumbUrl}
                                    onClick={() => {
                                      if (serviceThumbUrl) {
                                        setActiveLightboxImage({
                                          url: serviceThumbUrl,
                                          title: srv.title,
                                          caption: `${church.name} • ${formattedServiceDate}`,
                                        });
                                      }
                                    }}
                                    className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-950 border-0 overflow-hidden shrink-0 shadow-md flex items-center justify-center ${
                                      serviceThumbUrl ? 'cursor-pointer group' : 'cursor-default'
                                    }`}
                                  >
                                    <img
                                      src={programMiniThumb}
                                      alt={srv.title}
                                      onError={() => markImageBroken(programMiniThumb)}
                                      className="w-full h-full object-contain object-center border-0"
                                    />
                                    <div className="absolute inset-x-0 bottom-0 bg-slate-950/85 backdrop-blur-sm py-0.5 px-1 text-center">
                                      <span className="text-[8px] font-black uppercase text-amber-300 tracking-wider block leading-tight">
                                        {calBadge.day} {calBadge.month}
                                      </span>
                                    </div>
                                  </button>
                                ) : (
                                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-900 border-0 overflow-hidden flex flex-col items-center justify-center text-center shrink-0 shadow">
                                    <div className="bg-indigo-600 w-full py-0.5 text-[9px] font-black uppercase text-white tracking-wider">
                                      {calBadge.month}
                                    </div>
                                    <div className="text-base sm:text-lg font-black text-white leading-none py-1 flex-1 flex items-center justify-center">
                                      {calBadge.day}
                                    </div>
                                  </div>
                                )}

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-amber-400 inline-flex items-center gap-1">
                                      <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                      <span>{isEs ? 'Programa del Culto' : isFr ? 'Programme du Culte' : isEn ? 'Service Program' : 'Pwogram Sèvis Kilt la'}</span>
                                    </span>
                                    {isLive && (
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 inline-flex items-center gap-1.5 animate-pulse">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                        <span>{isEs ? 'En vivo' : isFr ? 'En direct' : isEn ? 'Live now' : 'An dirèk'}</span>
                                      </span>
                                    )}
                                  </div>
                                  <h5 className="font-extrabold text-white text-xs sm:text-sm mt-0.5 truncate">
                                    {srv.title}
                                  </h5>
                                  <div className="text-[10px] sm:text-[11px] text-slate-300 flex items-center gap-2 mt-0.5 font-medium">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-indigo-400" />
                                      {formattedServiceDate} • {formatServiceTimeRangeAmPm(srv.startTime, srv.endTime, '08:30')}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Quick Scan presence button if service is active */}
                              {isLive && (
                                <button
                                  type="button"
                                  onClick={onOpenMyCode}
                                  className="w-full sm:w-auto px-3 py-2 sm:py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg cursor-pointer transition-all active:scale-95 shrink-0"
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                  <span>{isEs ? 'Confirmar Asistencia' : isFr ? 'Confirmer Présence' : isEn ? 'Check-in Now' : 'Scan Prezans Mwen'}</span>
                                </button>
                              )}
                            </div>

                            {/* Service Roles & Leaders Team Grid with Real Member Profile Avatars */}
                            {hasServiceRoles && (
                              <div className="pt-1 border-0">
                                <div className="text-[11px] font-bold text-indigo-300/90 mb-2 flex items-center gap-1.5">
                                  <Users className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                  <span>{isEs ? 'Equipo y Responsables en Servicio:' : isFr ? 'Équipe et Responsables en Service :' : isEn ? 'Ministry Team in Service:' : 'Ekip & Responsab ki sou Sèvis:'}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                                  {serviceLeader && (
                                    <div className="py-0.5 bg-transparent border-0 flex items-center gap-2 min-w-0">
                                      {renderRoleAvatars(leaderAvatars, 'leader')}
                                      <div className="min-w-0 flex-1">
                                        <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider leading-tight">{isEs ? 'Dirigente' : isFr ? 'Dirigeant' : isEn ? 'Leader' : 'Dirijan'}</span>
                                        <span className="font-bold text-white truncate block leading-snug">{serviceLeader}</span>
                                      </div>
                                    </div>
                                  )}
                                  {servicePreacher && (
                                    <div className="py-0.5 bg-transparent border-0 flex items-center gap-2 min-w-0">
                                      {renderRoleAvatars(preacherAvatars, 'preacher')}
                                      <div className="min-w-0 flex-1">
                                        <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider leading-tight">{isEs ? 'Predicador' : isFr ? 'Prédicateur' : isEn ? 'Preacher' : 'Predikatè'}</span>
                                        <span className="font-bold text-white truncate block leading-snug">{servicePreacher}</span>
                                      </div>
                                    </div>
                                  )}
                                  {serviceReader && (
                                    <div className="py-0.5 bg-transparent border-0 flex items-center gap-2 min-w-0">
                                      {renderRoleAvatars(readerAvatars, 'reader')}
                                      <div className="min-w-0 flex-1">
                                        <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider leading-tight">{isEs ? 'Lectura Bíblica' : isFr ? 'Lecture Biblique' : isEn ? 'Scripture Reading' : 'Lektè Pawòl la'}</span>
                                        <span className="font-bold text-white truncate block leading-snug">{serviceReader}</span>
                                      </div>
                                    </div>
                                  )}
                                  {serviceMusicians && (
                                    <div className="py-0.5 bg-transparent border-0 flex items-center gap-2 min-w-0">
                                      {renderRoleAvatars(musiciansAvatars, 'musicians')}
                                      <div className="min-w-0 flex-1">
                                        <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider leading-tight">{isEs ? 'Adoradores y Música' : isFr ? 'Adoration & Chorale' : isEn ? 'Worship & Choir' : 'Adoratè & Mizisyen'}</span>
                                        <span className="font-bold text-white truncate block leading-snug">{serviceMusicians}</span>
                                      </div>
                                    </div>
                                  )}
                                  {serviceUshers && (
                                    <div className="py-0.5 bg-transparent border-0 flex items-center gap-2 min-w-0 col-span-2">
                                      {renderRoleAvatars(ushersAvatars, 'ushers')}
                                      <div className="min-w-0 flex-1">
                                        <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider leading-tight">{isEs ? 'Protocolo y Bienvenida' : isFr ? 'Accueil & Protocole' : isEn ? 'Ushers & Hospitality' : 'Akèy & Pwotokòl'}</span>
                                        <span className="font-bold text-white truncate block leading-snug">{serviceUshers}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* =========================================================================
                            5. FACEBOOK SOCIAL PROOF BAR (REACTIONS COUNT & COMMENT COUNT)
                            ========================================================================= */}
                        <div className="px-3.5 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between text-xs text-slate-400 border-t border-white/10 bg-white/[0.01]">
                          {/* Left: Reaction Icons & Count */}
                          <div className="flex items-center gap-1.5 min-w-0">
                            {(effectiveLikesCount > 0 || srvInteraction.userLiked) ? (
                              <>
                                <div className="flex -space-x-1 items-center shrink-0">
                                  <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-xs shadow-sm">
                                    {srvInteraction.reaction === 'love' || srvInteraction.reaction === 'heart'
                                      ? '❤️'
                                      : srvInteraction.reaction === 'like'
                                      ? '👍'
                                      : srvInteraction.reaction === 'clap' || srvInteraction.reaction === 'praise'
                                      ? '👏'
                                      : srvInteraction.reaction === 'haha'
                                      ? '😄'
                                      : srvInteraction.reaction === 'wow' || srvInteraction.reaction === 'fire'
                                      ? '😮'
                                      : srvInteraction.reaction === 'sad'
                                      ? '😢'
                                      : '🙏'}
                                  </span>
                                  {effectiveLikesCount > 1 && (
                                    <span className="w-5 h-5 rounded-full bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-xs shadow-sm">
                                      ❤️
                                    </span>
                                  )}
                                </div>
                                <span className="font-semibold text-slate-200 ml-0.5 truncate text-[11px] sm:text-xs">
                                  {effectiveLikesCount > 0 ? `${effectiveLikesCount} ${isEs ? 'reacciones' : isFr ? 'réactions' : isEn ? 'reactions' : 'reyaksyon'}` : (isEs ? '1 reacción' : isFr ? '1 réaction' : isEn ? '1 reaction' : '1 reyaksyon')}
                                </span>
                              </>
                            ) : (
                              <span className="text-slate-400 text-[10px] sm:text-[11px] italic truncate">
                                {isEs ? 'Sé el primero en reaccionar' : isFr ? 'Soyez le premier à réagir' : isEn ? 'Be the first to react' : 'Fè premye moun ki di Amen'}
                              </span>
                            )}
                          </div>

                          {/* Right: Comments Count */}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              data-comment-toggle={feedId}
                              onClick={() => {
                                setOpenCommentBox((prev) => ({
                                  ...prev,
                                  [feedId]: !prev[feedId],
                                }));
                              }}
                              className="hover:underline cursor-pointer text-slate-300 hover:text-white font-medium text-[11px] sm:text-xs"
                            >
                              {commentCount > 0 ? (
                                <span>
                                  {commentCount} {commentCount === 1 ? (isEs ? 'comentario' : isFr ? 'commentaire' : isEn ? 'comment' : 'kòmantè') : (isEs ? 'comentarios' : isFr ? 'commentaires' : isEn ? 'comments' : 'kòmantè')}
                                </span>
                              ) : (
                                <span>{isEs ? '0 comentarios' : isFr ? '0 commentaire' : isEn ? '0 comments' : '0 kòmantè'}</span>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* =========================================================================
                            6. FACEBOOK 3-ACTION BUTTON BAR (REACT | COMMENT | SHARE)
                            ========================================================================= */}
                        <div className="grid grid-cols-3 divide-x divide-white/10 border-t border-b border-white/10 px-0.5 sm:px-1 py-1 bg-white/[0.02]">
                          {/* 1. Like / React Action Button */}
                          <div className="flex items-center justify-center p-0.5 min-w-0">
                            <ReactionPicker
                              announcementId={feedId}
                              userLiked={srvInteraction.userLiked}
                              currentReaction={srvInteraction.reaction}
                              likesCount={effectiveLikesCount}
                              onSelectReaction={handleSelectReaction}
                              onToggleDefault={handleToggleDefault}
                              variant="facebook"
                            />
                          </div>

                          {/* 2. Comment Action Button */}
                          <div className="flex items-center justify-center p-0.5 min-w-0">
                            <button
                              type="button"
                              id={`btn-toggle-comments-${feedId}`}
                              data-comment-toggle={feedId}
                              onClick={() =>
                                setOpenCommentBox((prev) => ({
                                  ...prev,
                                  [feedId]: !prev[feedId],
                                }))
                              }
                              className={`w-full py-2 px-1 sm:px-2 rounded-xl flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                                isCommentOpen
                                  ? 'bg-indigo-500/25 text-indigo-300 font-black shadow-sm ring-1 ring-indigo-400/30'
                                  : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                              }`}
                            >
                              <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400 shrink-0" />
                              <span className="truncate text-[11px] sm:text-xs font-bold">{isEs ? 'Comentar' : isFr ? 'Commenter' : isEn ? 'Comment' : 'Kòmante'}</span>
                            </button>
                          </div>

                          {/* 3. Share Action Button */}
                          <div className="flex items-center justify-center p-0.5 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleShareService(srv)}
                              className="w-full py-2 px-1 sm:px-2 rounded-xl flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm font-bold text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer active:scale-[0.98]"
                            >
                              <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
                              <span className="truncate text-[11px] sm:text-xs font-bold">{isEs ? 'Compartir' : isFr ? 'Partager' : isEn ? 'Share' : 'Pataje'}</span>
                            </button>
                          </div>
                        </div>

                        {/* =========================================================================
                            7. FACEBOOK-STYLE COMMENTS THREAD WITH iOS WHEEL ROLLER
                            ========================================================================= */}
                        {isCommentOpen && (() => {
                          const modConfig = sanitizeCommentModerationConfig(devSettings.commentModeration);
                          const targetType = resolveCommentTargetType(feedId, { category: 'sevis', serviceId: srv.id } as Announcement);
                          const gateCheck = evaluateCommentAgainstModeration({
                            content: 'ok',
                            churchId: church.id,
                            userIds: currentMemberCandidateIds,
                            targetType,
                            customConfig: { ...modConfig, enabled: false },
                          });
                          const isPostingLocked = !gateCheck.allowed;
                          const memberPhoto =
                            member?.avatarUrl || member?.photoUrl || member?.googlePhoto;
                          const currentInputVal = commentInputs[feedId] || '';

                          return (
                            <div
                              data-comment-box={feedId}
                              className="p-4 sm:p-5 bg-slate-950/75 backdrop-blur-xl border-t border-white/10 space-y-3.5 transition-all"
                            >
                              {isPostingLocked ? (
                                <div
                                  role="status"
                                  className="px-3.5 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-amber-200 text-xs font-semibold flex items-center gap-2.5"
                                >
                                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                                  <span>{getLocalizedModerationMessage(gateCheck)}</span>
                                </div>
                              ) : null}

                              {/* Input Form at Top (Avatar + rounded pill input) */}
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2.5">
                                  {memberPhoto ? (
                                    <img
                                      src={memberPhoto}
                                      alt={memberDisplayName}
                                      className="w-8 h-8 rounded-full object-cover shrink-0 shadow-md ring-1 ring-white/20"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-md ring-1 ring-white/20">
                                      {memberDisplayName.slice(0, 2).toUpperCase()}
                                    </div>
                                  )}
                                  <div className="flex-1 relative flex items-center">
                                    <input
                                      type="text"
                                      id={`input-comment-${feedId}`}
                                      disabled={isPostingLocked}
                                      maxLength={modConfig.maxCommentLength}
                                      placeholder={
                                        isPostingLocked
                                          ? getLocalizedModerationMessage(gateCheck)
                                          : isEs
                                          ? 'Escribe una bendición o comentario...'
                                          : isEn
                                          ? 'Write a blessing or comment...'
                                          : isFr
                                          ? 'Écrivez une bénédiction ou un commentaire...'
                                          : 'Ekri yon benediksyon oswa kòmantè...'
                                      }
                                      value={currentInputVal}
                                      onChange={(e) =>
                                        setCommentInputs((prev) => ({
                                          ...prev,
                                          [feedId]: e.target.value,
                                        }))
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !isPostingLocked) {
                                          e.preventDefault();
                                          handleAddComment(feedId, srv);
                                        }
                                      }}
                                      className="w-full pl-4 pr-10 py-2 rounded-full ios-glass-pill text-white placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-amber-400/60 transition-all shadow-inner disabled:opacity-45 disabled:cursor-not-allowed"
                                    />
                                    <button
                                      type="button"
                                      id={`btn-send-comment-${feedId}`}
                                      onClick={() => handleAddComment(feedId, srv)}
                                      disabled={isPostingLocked || !currentInputVal.trim()}
                                      className="absolute right-1.5 p-1.5 rounded-full bg-amber-400 hover:bg-amber-300 disabled:opacity-30 disabled:pointer-events-none text-slate-950 font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
                                      title={isEs ? 'Publicar' : isFr ? 'Publier' : isEn ? 'Post' : 'Voye'}
                                    >
                                      <Send className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {!isPostingLocked && (currentInputVal.length > 0 || modConfig.slowModeCooldownSeconds > 0) && (
                                  <div className="flex items-center justify-between text-[10px] text-slate-400 px-11">
                                    <span>
                                      {modConfig.slowModeCooldownSeconds > 0
                                        ? isEs
                                          ? `Modo lento: ${modConfig.slowModeCooldownSeconds}s entre comentarios`
                                          : isFr
                                          ? `Mode lent : ${modConfig.slowModeCooldownSeconds}s entre commentaires`
                                          : isEn
                                          ? `Slow mode: ${modConfig.slowModeCooldownSeconds}s cooldown`
                                          : `Slow Mode: ${modConfig.slowModeCooldownSeconds}s ant 2 kòmantè`
                                        : ''}
                                    </span>
                                    <span className="font-mono">
                                      {currentInputVal.length}/{modConfig.maxCommentLength}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* iOS Wheel Drum View: Reading item magnified, scrolls smoothly without affecting feed */}
                              <CommentsWheel
                                announcementId={feedId}
                                comments={cleanComments}
                                currentMemberName={member?.fullName || memberDisplayName}
                                onDeleteComment={handleDeleteComment}
                                language={language}
                              />
                            </div>
                          );
                        })()}
                      </div>

                      {/* =========================================================================
                          DEDICATED ADVERTISEMENT & VERIFIED PARTNER SECTION IN FEED
                          ========================================================================= */}
                      {srvIndex === 0 && (
                        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-950 via-[#0a1128] to-slate-900 border border-emerald-500/30 shadow-2xl relative overflow-hidden space-y-4">
                          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                          {/* Section Header */}
                          <div className="flex items-center justify-between flex-wrap gap-2 relative z-10 border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center">
                                <BadgeCheck className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-white font-extrabold text-xs sm:text-sm tracking-tight">
                                    {isEs ? 'Socios & Patrocinadores Oficiales' : isFr ? 'Partenaires & Sponsors Officiels' : isEn ? 'Official Partners & Sponsors' : 'Patnè & Piblisite Ofisyèl Legliz la'}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black uppercase flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                    {isEs ? 'Verificado' : isFr ? 'Vérifié' : isEn ? 'Verified' : 'Verifié'}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400">
                                  {isEs ? 'Espacio publicitario y servicios recomendados para la comunidad' : isFr ? 'Espace publicitaire & services recommandés' : isEn ? 'Sponsored space & recommended community services' : 'Espas piblisite ak sèvis rekòmande pou kominote a'}
                                </span>
                              </div>
                            </div>

                            <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-2 py-1 rounded border border-slate-800">
                              {isEs ? 'PUBLICIDAD OFICIAL' : isFr ? 'PUBLICITÉ OFFICIELLE' : isEn ? 'OFFICIAL ADS' : 'PIBLISITE OFISYÈL'}
                            </span>
                          </div>

                          {/* Active Sponsors Cards */}
                          {activeSponsors.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
                              {activeSponsors.map((sponsor) => (
                                <div
                                  key={`feed-sponsor-${sponsor.id}`}
                                  className="p-4 rounded-2xl bg-slate-900/90 hover:bg-slate-900 border border-emerald-500/20 hover:border-emerald-400/40 transition-all flex flex-col justify-between group shadow-md"
                                >
                                  <div className="flex items-start gap-3 mb-3">
                                    {sponsor.logoUrl ? (
                                      <img
                                        src={sponsor.logoUrl}
                                        alt={sponsor.name}
                                        className="w-12 h-12 rounded-xl object-contain bg-white/5 p-1 border border-slate-700 shrink-0"
                                      />
                                    ) : (
                                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow">
                                        {sponsor.name.slice(0, 2).toUpperCase()}
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5 mb-0.5">
                                        <h5 className="font-bold text-white text-xs sm:text-sm group-hover:text-emerald-300 transition-colors truncate">
                                          {sponsor.name}
                                        </h5>
                                        <BadgeCheck className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400 shrink-0" />
                                      </div>
                                      <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                                        {sponsor.description || (isEs ? 'Patrocinador oficial de confianza' : 'Patnè ofisyèl ak sèvis kalifye')}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
                                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                                      {sponsor.tier || 'Verified Partner'}
                                    </span>
                                    {sponsor.targetUrl ? (
                                      <a
                                        href={sponsor.targetUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs font-bold text-amber-300 hover:text-amber-200 transition-colors"
                                      >
                                        <span>{isEs ? 'Visitar Sitio' : isFr ? 'Visiter' : isEn ? 'Visit Link' : 'Vizite Sit'}</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    ) : (
                                      <span className="text-[10px] text-slate-500">OmniChurch Certified</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center relative z-10 space-y-2">
                              <Building2 className="w-6 h-6 text-amber-400 mx-auto" />
                              <h5 className="text-xs font-bold text-white">
                                {isEs ? 'Espacio Publicitario Disponible' : isFr ? 'Espace Publicitaire Disponible' : isEn ? 'Sponsored Ad Space Available' : 'Espas Piblisite Disponib'}
                              </h5>
                              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                                {isEs
                                  ? 'Comuníquese con la administración de la iglesia o configure los patrocinadores en el panel de desarrollador.'
                                  : isFr
                                  ? 'Contactez l’administration ou configurez les sponsors depuis le panneau développeur.'
                                  : isEn
                                  ? 'Contact church administration or configure sponsors in the developer panel.'
                                  : 'Kontakte administrasyon legliz la oswa devlopè a pou mete bèl anons piblisite ak patnè ofisyèl isit la.'}
                              </p>
                            </div>
                          )}

                          {/* AdMob Banner Display if enabled */}
                          {devSettings.admob?.enabled && devSettings.admob?.bannerAdUnitId && (
                            <div className="p-2.5 rounded-xl bg-slate-950/90 border border-amber-400/30 text-center text-[10px] text-amber-300 font-mono flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <Radio className="w-3 h-3 text-amber-400 animate-pulse" />
                                Google AdMob Banner
                              </span>
                              <span className="text-slate-400 truncate max-w-[200px]">
                                {devSettings.admob.bannerAdUnitId}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* =========================================================================
          4. 6 DISTINCT CHURCH SERVICES QUICK SHORTCUTS
          ========================================================================= */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            {isEs ? 'Servicios y Departamentos de la Iglesia' : isEn ? 'Church Services & Departments' : isFr ? 'Services & Départements de l’Église' : 'Sèvis & Depatman Legliz la'}
          </h3>
          <span className="text-xs text-slate-400 font-medium font-mono">
            {isEs ? '6 Secciones Separadas' : isEn ? '6 Separate Sections' : isFr ? '6 Sections Séparées' : '6 Seksyon Separe'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.values(SERVICE_CATEGORIES).map((cat) => (
            <button
              key={cat.id}
              type="button"
              id={`btn-member-cat-${cat.id}`}
              onClick={() => onSelectServiceCategory(cat.id)}
              className="p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 shadow-sm hover:shadow transition-all text-left flex flex-col justify-between group cursor-pointer hover:border-amber-400/40"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold text-slate-400 group-hover:text-amber-400">
                  {cat.code}
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    cat.badgeBg.includes('amber')
                      ? 'bg-amber-400'
                      : cat.badgeBg.includes('blue')
                      ? 'bg-blue-400'
                      : cat.badgeBg.includes('emerald')
                      ? 'bg-emerald-400'
                      : cat.badgeBg.includes('purple')
                      ? 'bg-purple-400'
                      : cat.badgeBg.includes('indigo')
                      ? 'bg-indigo-400'
                      : 'bg-rose-400'
                  }`}
                />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white group-hover:text-amber-300 leading-snug">
                  {isEs ? cat.name.es || cat.name.fr : isEn ? cat.name.en || cat.name.ht : isFr ? cat.name.fr : cat.name.ht}
                </h4>
                <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                  {isEs ? cat.desc.es || cat.desc.fr : isEn ? cat.desc.en || cat.desc.ht : isFr ? cat.desc.fr : cat.desc.ht}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* CHURCH-SPECIFIC DONATION MODAL */}
      <ChurchDonationModal
        isOpen={isChurchDonationModalOpen}
        onClose={() => setIsChurchDonationModalOpen(false)}
        church={church}
        language={language}
      />

      {/* CHURCH TERMS & REGULATIONS MODAL */}
      <ChurchTermsModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        church={church}
        language={language}
      />

      {/* DONATION & DEV SUPPORT MODAL */}
      <DonationModal
        isOpen={isDonationModalOpen}
        onClose={() => setIsDonationModalOpen(false)}
        language={language}
        customConfig={devSettings.donations}
      />

      {/* CLEAN SHARE ANNOUNCEMENT MODAL (Guaranteed 100% localhost-free) */}
      <ShareAnnouncementModal
        isOpen={!!sharingAnnouncement}
        announcement={sharingAnnouncement}
        church={church}
        language={language}
        onClose={() => setSharingAnnouncement(null)}
      />

      {/* SERVICE THUMBNAIL / POSTER LIGHTBOX MODAL */}
      <PosterLightboxModal
        isOpen={!!activeLightboxImage}
        imageUrl={activeLightboxImage?.url || ''}
        title={activeLightboxImage?.title || ''}
        caption={activeLightboxImage?.caption}
        language={language}
        onClose={() => setActiveLightboxImage(null)}
      />
    </div>
  );
};
