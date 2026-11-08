import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Church,
  Member,
  Announcement,
  ServiceSession,
  AnnouncementCategory,
  Language,
  DeveloperSettings,
} from '../../types';
import { SERVICE_CATEGORIES } from '../../utils/i18n';
import {
  Bell,
  Calendar,
  Clock,
  QrCode,
  Maximize2,
  Pin,
  Flame,
  ChevronRight,
  ShieldCheck,
  Building2,
  Users,
  SunMedium,
  BookOpen,
  Megaphone,
  Radio,
  AlertTriangle,
  Heart,
  ThumbsUp,
  MessageSquare,
  Send,
  Smile,
  CheckCircle2,
  Share2,
  ExternalLink,
  Award,
  Trash2,
  BadgeCheck,
  Globe,
  HeartHandshake,
  DollarSign,
  Wallet,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { ReactionPicker, ReactionType, REACTION_LIST } from './ReactionPicker';
import { CommentsWheel } from './CommentsWheel';
import { DonationModal } from '../common/DonationModal';
import { ChurchDonationModal } from '../common/ChurchDonationModal';
import { ChurchTermsModal } from '../common/ChurchTermsModal';
import { PosterLightboxModal } from '../common/PosterLightboxModal';
import { ShareAnnouncementModal } from './ShareAnnouncementModal';
import {
  getAnnouncementInteractions,
  saveAnnouncementInteraction,
  addAnnouncementComment,
  deleteAnnouncementComment,
  getLocalizedAnnouncementTitle,
  getLocalizedAnnouncementContent,
  deduplicateAnnouncements,
  purgeDemoComments,
} from '../../utils/storage';
import { getDeveloperSettings, getDonationConfig, hasActiveChurchLicense } from '../../utils/developerStorage';
import {
  subscribeToAnnouncementComments,
  subscribeToAnnouncementReactions,
  firestoreAddAnnouncementComment,
  firestoreDeleteAnnouncementComment,
  firestoreSetAnnouncementReaction,
  firestoreRemoveAnnouncementReaction,
} from '../../services/firestoreService';
import { AnnouncementReactionDoc } from '../../types';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

interface MemberHomeProps {
  church: Church;
  member?: Member | null;
  announcements: Announcement[];
  services: ServiceSession[];
  onOpenMyCode: () => void;
  onSelectServiceCategory: (category: any) => void;
  language?: Language;
}

interface AnnouncementInteraction {
  likes: number;
  userLiked: boolean;
  reaction?: ReactionType;
  comments: {
    id: string;
    author: string;
    text: string;
    time: string;
    avatarInitials: string;
    isDemo?: boolean;
  }[];
}

export const MemberHome: React.FC<MemberHomeProps> = ({
  church,
  member,
  announcements,
  services,
  onOpenMyCode,
  onSelectServiceCategory,
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

  // Helper to deduplicate comments by id, text and author (prevent any duplicates)
  const deduplicateComments = (rawComments: any[] = []): any[] => {
    const clean: any[] = [];
    const seenIds = new Set<string>();
    rawComments.forEach((c) => {
      if (!c || c.isDemo || c.id === 'c1' || c.id === 'c2' || c.id.startsWith('comm_demo') || c.id.startsWith('demo_')) {
        return;
      }
      if (seenIds.has(c.id)) return;
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

  // Load persistent interactions for announcements (100% clean & real - no test/demo artifacts)
  const [interactions, setInteractions] = useState<Record<string, AnnouncementInteraction>>(() => {
    const initial: Record<string, AnnouncementInteraction> = {};
    const allStored = getAnnouncementInteractions(church.id);
    announcements.forEach((ann) => {
      const stored = allStored[ann.id];
      if (stored) {
        initial[ann.id] = {
          ...stored,
          comments: deduplicateComments(stored.comments),
        } as AnnouncementInteraction;
      } else {
        initial[ann.id] = {
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

  // Sync state with storage events
  useEffect(() => {
    const refreshInteractions = () => {
      const allStored = getAnnouncementInteractions(church.id);
      const updated: Record<string, AnnouncementInteraction> = {};
      announcements.forEach((ann) => {
        const stored = allStored[ann.id];
        if (stored) {
          updated[ann.id] = {
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
  }, [announcements, church.id]);

  const currentMemberIdentifier =
    member?.memberId || member?.phone || member?.fullName || 'guest_member';

  // Cloud Firestore Real-Time Synchronization for Comments and Reactions
  // Ensures 100% permanence across app updates, cache clears, and native Android / Web sync
  useEffect(() => {
    if (!church?.id) return;

    // 1. Listen for persistent comments in Cloud Firestore
    const unsubComments = subscribeToAnnouncementComments(church.id, (firestoreComments) => {
      setInteractions((prev) => {
        const next = { ...prev };
        const grouped: Record<string, any[]> = {};
        firestoreComments.forEach((c) => {
          if (!grouped[c.announcementId]) grouped[c.announcementId] = [];
          grouped[c.announcementId].push(c);
        });

        announcements.forEach((ann) => {
          const current = next[ann.id] || { likes: 0, userLiked: false, comments: [] };
          const fsComments = grouped[ann.id] || [];
          next[ann.id] = {
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
        const grouped: Record<string, AnnouncementReactionDoc[]> = {};
        firestoreReactions.forEach((r) => {
          if (!grouped[r.announcementId]) grouped[r.announcementId] = [];
          grouped[r.announcementId].push(r);
        });

        const myIdentifier = (currentMemberIdentifier || '').toLowerCase();

        announcements.forEach((ann) => {
          const current = next[ann.id] || { likes: 0, userLiked: false, comments: [] };
          const rList = grouped[ann.id] || [];
          const userReaction = rList.find(
            (r) => (r.memberId || '').toLowerCase() === myIdentifier
          );

          next[ann.id] = {
            ...current,
            likes: rList.length,
            userLiked: !!userReaction,
            reaction: (userReaction?.reaction as ReactionType) || current.reaction,
          };
        });
        return next;
      });
    });

    return () => {
      unsubComments();
      unsubReactions();
    };
  }, [church.id, announcements, currentMemberIdentifier]);

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

  const activeService = services.find((s) => s.isOpenForAttendance);
  const deduplicatedAnnouncements = deduplicateAnnouncements(announcements);

  const filteredAnnouncements = deduplicatedAnnouncements.filter((a) => {
    // Avètisman ofisyèl yo se notifikasyon pèsonèl/ofisyèl, yo pa dwe piblik nan fil la
    if (a.showToastOnLogin) return false;
    if (filterCategory === 'all') return true;
    return a.category === filterCategory;
  });

  // Multilingual resolution
  const getAnnouncementTitle = (ann: Announcement): string => {
    return getLocalizedAnnouncementTitle(ann, (language as Language) || 'ht');
  };

  const getAnnouncementContent = (ann: Announcement): string => {
    return getLocalizedAnnouncementContent(ann, (language as Language) || 'ht', church);
  };

  const getAnnouncementAuthor = (ann: Announcement): string => {
    if (ann.authorType === 'admin') {
      return isEs
        ? 'Administración de la Iglesia'
        : isFr
        ? 'L’Administration de l’Église'
        : isEn
        ? 'Church Administration'
        : 'Administrasyon Legliz la';
    }
    if (ann.authorType === 'pastor') {
      const pastorSuffix = church.pastor ? ` (${church.pastor})` : '';
      return isEs
        ? `El Pastor Principal${pastorSuffix}`
        : isFr
        ? `Le Pasteur Titulaire${pastorSuffix}`
        : isEn
        ? `Senior Pastor${pastorSuffix}`
        : `Pastè a${pastorSuffix}`;
    }
    if (ann.authorType === 'secretariat') {
      return isEs
        ? 'Secretaría de la Iglesia'
        : isFr
        ? 'Secrétariat de l’Église'
        : isEn
        ? 'Church Secretariat'
        : 'Sekretarya Legliz la';
    }
    if (ann.authorType === 'worship') {
      return isEs
        ? 'Ministerio de Alabanza y Música'
        : isFr
        ? 'Département Louange & Musique'
        : isEn
        ? 'Worship & Music Ministry'
        : 'Depatman Louanj & Mizik';
    }
    return ann.author || (isEs ? 'Administración' : isFr ? 'Administration' : isEn ? 'Administration' : 'Administrasyon');
  };

  const getCategoryBadge = (cat: AnnouncementCategory) => {
    switch (cat) {
      case 'anons':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center gap-1">
            📢 {isEs ? 'Avisos' : isEn ? 'Notices' : isFr ? 'Annonces' : 'Anons'}
          </span>
        );
      case 'ore':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 border border-amber-400/30 text-amber-300 flex items-center gap-1">
            🕐 {isEs ? 'Horarios' : isEn ? 'Schedule' : isFr ? 'Horaires' : 'Orè'}
          </span>
        );
      case 'sevis':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center gap-1">
            📅 {isEs ? 'Servicios' : isEn ? 'Services' : isFr ? 'Services' : 'Sèvis'}
          </span>
        );
      case 'mesaj':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 border border-purple-400/30 text-purple-300 flex items-center gap-1">
            📣 {isEs ? 'Mensajes' : isEn ? 'Messages' : isFr ? 'Messages' : 'Mesaj'}
          </span>
        );
    }
  };

  // Select specific reaction via Long-Press, Swipe, or Dock Click
  const handleSelectReaction = (annId: string, reactionType: ReactionType) => {
    setInteractions((prev) => {
      const current = prev[annId] || { likes: 0, userLiked: false, comments: [] };
      const isSameReaction = current.userLiked && current.reaction === reactionType;

      const updated = {
        ...current,
        likes: isSameReaction ? current.likes : current.userLiked ? current.likes : current.likes + 1,
        userLiked: true,
        reaction: reactionType,
      };

      saveAnnouncementInteraction(annId, updated);
      return {
        ...prev,
        [annId]: updated,
      };
    });

    // Cloud Firestore synchronization (persists across updates and native Android apps)
    firestoreSetAnnouncementReaction(annId, currentMemberIdentifier, church.id, reactionType).catch((err) => {
      console.warn('Firestore reaction sync warning:', err);
    });

    const targetConfig = REACTION_LIST.find((r) => r.id === reactionType);
    toast.info(
      `${isEs ? 'Reacción' : 'Reyaksyon'} ${targetConfig?.emoji || '🙏'}`,
      isEs ? `${targetConfig?.label || '¡Amén!'} registrada con éxito.` : `${targetConfig?.label || 'Amen!'} anrejistre avèk siksè.`
    );
  };

  // Toggle Default Reaction on Single Tap/Click
  const handleToggleDefault = (annId: string) => {
    setInteractions((prev) => {
      const current = prev[annId] || { likes: 0, userLiked: false, comments: [] };
      const nextUserLiked = !current.userLiked;
      const nextLikes = nextUserLiked ? current.likes + 1 : Math.max(0, current.likes - 1);
      const nextReaction = nextUserLiked ? (current.reaction || 'amen') : undefined;

      const updated = {
        ...current,
        likes: nextLikes,
        userLiked: nextUserLiked,
        reaction: nextReaction,
      };

      saveAnnouncementInteraction(annId, updated);

      // Cloud Firestore synchronization
      if (nextUserLiked) {
        firestoreSetAnnouncementReaction(annId, currentMemberIdentifier, church.id, nextReaction || 'amen').catch((err) => {
          console.warn('Firestore reaction sync warning:', err);
        });
      } else {
        firestoreRemoveAnnouncementReaction(annId, currentMemberIdentifier).catch((err) => {
          console.warn('Firestore reaction removal warning:', err);
        });
      }

      return {
        ...prev,
        [annId]: updated,
      };
    });
  };

  // Add Comment/Reply
  const handleAddComment = (annId: string) => {
    const text = (commentInputs[annId] || '').trim();
    if (!text) return;

    const authorName = member?.fullName || (isEs ? 'Miembro de la Iglesia' : 'Manm Legliz');
    const initials = authorName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    // Call storage helper which returns the saved sanitized comment
    const saved = addAnnouncementComment(annId, {
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
      const current = prev[annId] || { likes: 0, userLiked: false, comments: [] };
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
        [annId]: {
          ...current,
          comments: [...existing, saved],
        },
      };
    });

    setCommentInputs((prev) => ({ ...prev, [annId]: '' }));
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

  // Share Announcement via navigator.share() / Capacitor Share with clean official URL: https://omnichurch.download
  const handleShareAnnouncement = async (ann: Announcement) => {
    const title = getAnnouncementTitle(ann);
    const content = getAnnouncementContent(ann);
    const shareUrl = 'https://omnichurch.download';
    const textToShare = `📢 *${church.name}*\n📌 *${title}*\n\n${content}\n\n📅 ${ann.date}${ann.time ? ` • ⏰ ${ann.time}` : ''}\n📍 ${church.city || ''} ${church.country || ''}`;

    // 1. Native Mobile Platform (Capacitor Android / iOS)
    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share({
          title: `${church.name} - ${title}`,
          text: textToShare,
          url: shareUrl,
          dialogTitle: isEs ? 'Compartir publicación' : isFr ? 'Partager la publication' : isEn ? 'Share post' : 'Pataje anons sa a',
        });
        return;
      } catch (err: any) {
        if (err?.message?.includes('canceled') || err?.message?.includes('cancelled')) {
          return;
        }
      }
    }

    // 2. Web Browser Native Share (Android Chrome, iOS Safari, PWA)
    // Passing explicit url: 'https://omnichurch.download' guarantees mobile browsers
    // do not auto-inject window.location.href (which contains localhost:3000)
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

    // 3. Fallback: If navigator.share is not supported (Desktop browsers), open the Clean Share Modal
    setSharingAnnouncement(ann);
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
                ? 'Consulte los últimos avisos, interactúe con la comunidad de la iglesia y manténgase informado sobre todas las actividades.'
                : isEn
                ? 'View the latest announcements, interact with the church community, and stay informed on all activities.'
                : isFr
                ? 'Consultez les dernières annonces, interagissez avec la communauté de l’église et restez informé de toutes les activités.'
                : 'Gade dènye anons yo, patisipe nan kominikasyon legliz la, epi rete enfòme sou tout aktivite yo.'}
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
                {activeService.startTime} - {activeService.endTime} • {isEs ? 'Dirigido por:' : 'Dirije pa:'} {activeService.preacherOrLeader}
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-show-code-for-active"
            onClick={onOpenMyCode}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-slate-950" />
            <span>{isEs ? 'Mostrar Mi Código para Escaneo' : isEn ? 'Show My Code to Scan' : isFr ? 'Afficher Mon Code à Scanner' : 'Montre Kòd Mwen pou Scan'}</span>
          </button>
        </div>
      )}

      {/* =========================================================================
          3. DÈNYE ANONS YO AK ENTEAKSYON PRO MAX (LIKES, REYAKSYON, KÒMANTÈ/REPONN)
          ========================================================================= */}
      <div className="space-y-4 pt-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-400" />
              {isEs ? `Últimos Avisos y Actualidades (${church.name})` : isEn ? `Latest Announcements & Feed (${church.name})` : isFr ? `Dernières Annonces & Fil d’Actualités (${church.name})` : `Dènye Anons & Fil Aktyalite (${church.name})`}
            </h3>
            <p className="text-xs text-slate-400">
              {isEs
                ? 'Toda la información, reuniones, mensajes y comunicados oficiales en un vistazo.'
                : isEn
                ? 'All information, meetings, messages, and official communications at a glance.'
                : isFr
                ? 'Toutes les informations, réunions, messages et communications officielles en un coup d’œil.'
                : 'Tout enfòmasyon, reyinyon, mesaj ak kominikasyon ofisyèl nan yon koudèy.'}
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'all', label: isEs ? 'Todos' : isEn ? 'All' : isFr ? 'Tout' : 'Tout' },
              { id: 'anons', label: isEs ? 'Avisos' : isEn ? 'Notices' : isFr ? 'Annonces' : 'Anons' },
              { id: 'ore', label: isEs ? 'Horarios' : isEn ? 'Schedule' : isFr ? 'Horaires' : 'Orè' },
              { id: 'sevis', label: isEs ? 'Servicios' : isEn ? 'Services' : isFr ? 'Services' : 'Sèvis' },
              { id: 'mesaj', label: isEs ? 'Mensajes' : isEn ? 'Messages' : isFr ? 'Messages' : 'Mesaj' },
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

        {/* Announcements List */}
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
                  <button
                    type="button"
                    id="btn-member-open-donation"
                    onClick={() => setIsDonationModalOpen(true)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-400/20 transition-all cursor-pointer transform active:scale-95"
                  >
                    <Heart className="w-4 h-4 fill-slate-950 text-slate-950" />
                    <span>{isEs ? 'Hacer una Donación' : isEn ? 'Make a Donation' : isFr ? 'Faire un Don' : 'Fè yon Donasyon / Soutni'}</span>
                  </button>
                </div>
              </div>
            </div>

            {filteredAnnouncements.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/60 rounded-3xl border border-slate-800 text-slate-400 backdrop-blur-md">
                <p className="text-sm">
                  {isEs ? 'No hay anuncios en esta categoría por el momento.' : isEn ? 'No announcements in this category for now.' : isFr ? 'Aucune annonce dans cette catégorie pour le moment.' : 'Pa gen okenn anons nan kategori sa a pou kounye a.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAnnouncements.map((ann, annIndex) => {
                  const annInteraction = interactions[ann.id] || {
                    likes: 0,
                    userLiked: false,
                    comments: [],
                  };
                  const isCommentOpen = !!openCommentBox[ann.id];
                  const cleanComments = deduplicateComments(annInteraction.comments);
                  const commentCount = cleanComments.length;
                  const localizedTitle = getAnnouncementTitle(ann);
                  const localizedContent = getAnnouncementContent(ann);

                  const linkedService = ann.serviceId
                    ? services.find((s) => s.id === ann.serviceId)
                    : (ann.category === 'sevis'
                        ? services.find(
                            (s) =>
                              (s && s.date === ann.date) ||
                              (ann.title && s?.title && (ann.title || '').toLowerCase().includes((s.title || '').toLowerCase()))
                          )
                        : undefined);

                  const serviceLeader = ann.leader || linkedService?.leader;
                  const servicePreacher = ann.preacher || linkedService?.preacher || (!serviceLeader ? linkedService?.preacherOrLeader : undefined);
                  const serviceReader = ann.reader || linkedService?.reader;
                  const serviceMusicians = ann.musicians || linkedService?.musicians;
                  const serviceUshers = ann.ushers || linkedService?.ushers;
                  const hasServiceRoles = !!(serviceLeader || servicePreacher || serviceReader || serviceMusicians || serviceUshers);

                  const getAuthorIcon = () => {
                    if (ann.authorType === 'pastor') return '✝️';
                    if (ann.authorType === 'secretariat') return '📜';
                    if (ann.authorType === 'worship') return '🎵';
                    if (ann.authorType === 'admin') return '🏛️';
                    return '📢';
                  };

                  return (
                    <React.Fragment key={ann.id}>
                      <div
                        id={`announcement-card-${ann.id}`}
                        className={`ios-glass-card ios-specular-highlight rounded-2xl sm:rounded-3xl transition-all duration-300 overflow-hidden ${
                          ann.isPinned
                            ? 'ring-1 ring-amber-400/50 shadow-[0_16px_45px_rgba(251,191,36,0.18)]'
                            : 'hover:shadow-[0_22px_55px_rgba(0,0,0,0.65)]'
                        }`}
                      >
                        {/* =========================================================================
                            1. FACEBOOK-STYLE POST HEADER
                            ========================================================================= */}
                        <div className="p-3.5 sm:p-5 pb-2.5 sm:pb-3 flex items-start justify-between gap-2.5 sm:gap-3">
                          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                            {/* Author / Church Avatar */}
                            <div className="relative shrink-0">
                              {church.logoUrl ? (
                                <img
                                  src={church.logoUrl}
                                  alt={church.name}
                                  className="w-9 h-9 sm:w-11 sm:h-11 rounded-full object-cover border border-indigo-400/40 shadow-md ring-1 ring-white/10"
                                />
                              ) : (
                                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-indigo-600 via-purple-600 to-amber-500 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-md ring-1 ring-white/10">
                                  {church.name.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <span className="absolute -bottom-1 -right-1 text-xs select-none">
                                {getAuthorIcon()}
                              </span>
                            </div>

                            {/* Author Name, Verified Badge & Metadata */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-white text-xs sm:text-base hover:underline cursor-pointer truncate max-w-[150px] xs:max-w-[200px] sm:max-w-none">
                                  {getAnnouncementAuthor(ann) || church.name}
                                </span>
                                {isChurchLicensed && (
                                  <BadgeCheck
                                    className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400 fill-sky-400/20 shrink-0"
                                    title={isEs ? 'Publicación Oficial Verificada (Iglesia con Licencia)' : isFr ? 'Publication Officielle Vérifiée' : isEn ? 'Verified Official Post' : 'Piblikasyon Ofisyèl Verifye (Legliz ak Lisans)'}
                                  />
                                )}
                                {getCategoryBadge(ann.category)}
                              </div>

                              <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-slate-400 mt-0.5 flex-wrap">
                                <span className="font-medium">{ann.date}</span>
                                {ann.time && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-slate-500" />
                                      {ann.time}
                                    </span>
                                  </>
                                )}
                                <span>•</span>
                                <span className="flex items-center gap-1 text-slate-400" title={isEs ? 'Público para todos los miembros' : isFr ? 'Public pour tous les membres' : isEn ? 'Public to all members' : 'Piblik pou tout manm'}>
                                  <Globe className="w-3 h-3 text-slate-400" />
                                  <span className="text-[10px] sm:text-[11px]">{isEs ? 'Público' : isFr ? 'Public' : isEn ? 'Public' : 'Piblik'}</span>
                                </span>
                                {ann.showToastOnLogin && (
                                  <span className="px-2 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 flex items-center gap-1 shadow-sm">
                                    <Radio className="w-2.5 h-2.5 text-slate-950 animate-pulse" />
                                    {isEs ? 'Aviso' : isEn ? 'Notice' : isFr ? 'Avis' : 'Alèt'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right Controls: Pinned Badge & Share Button */}
                          <div className="flex items-center gap-1 shrink-0">
                            {ann.isPinned && (
                              <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-black bg-amber-400 text-slate-950 flex items-center gap-1 shadow-sm">
                                <Pin className="w-3 h-3 fill-slate-950" />
                                <span className="hidden xs:inline">{isEs ? 'Fijado' : isEn ? 'Pinned' : isFr ? 'Épinglé' : 'Epengle'}</span>
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleShareAnnouncement(ann)}
                              className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                              title={isEs ? 'Compartir publicación' : isFr ? 'Partager publication' : isEn ? 'Share post' : 'Pataje anons sa a'}
                            >
                              <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        </div>

                        {/* =========================================================================
                            2. POST TITLE & TEXT CONTENT
                            ========================================================================= */}
                        <div className="px-3.5 sm:px-5 pb-3">
                          <h4 className="text-sm sm:text-lg font-bold text-white mb-1.5 sm:mb-2 leading-snug">
                            {localizedTitle}
                          </h4>

                          <p className="text-xs sm:text-sm text-slate-200 whitespace-pre-line leading-relaxed">
                            {localizedContent}
                          </p>

                          {ann.targetAudience && (
                            <div className="mt-2 text-[10px] sm:text-[11px] text-amber-300/90 font-medium">
                              {isEs ? 'Destinado a:' : isEn ? 'Audience:' : isFr ? 'Public cible :' : 'Konsène:'}{' '}
                              <span className="font-bold underline">{ann.targetAudience}</span>
                            </div>
                          )}
                        </div>

                        {/* =========================================================================
                            3. CHURCH SERVICE & WORSHIP PROGRAM (FACEBOOK EVENT STYLE)
                            ========================================================================= */}
                        {(hasServiceRoles || ann.category === 'sevis' || linkedService) && (
                          <div className="px-3.5 sm:px-5 pb-3">
                            <div className="ios-glass-pill rounded-2xl p-3 sm:p-4 shadow-inner space-y-3">
                              {/* Event Header Banner */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  {/* Visual Calendar Tile */}
                                  <div className="w-11 h-12 sm:w-12 sm:h-13 rounded-xl bg-slate-900 border border-indigo-400/40 overflow-hidden flex flex-col items-center justify-center text-center shrink-0 shadow">
                                    <div className="bg-indigo-600 w-full py-0.5 text-[8px] sm:text-[9px] font-black uppercase text-white tracking-wider">
                                      {ann.date ? ann.date.slice(0, 3).toUpperCase() : 'KILT'}
                                    </div>
                                    <div className="text-sm sm:text-lg font-black text-white leading-none py-1">
                                      {ann.date && ann.date.match(/\d+/) ? ann.date.match(/\d+/)![0] : '★'}
                                    </div>
                                  </div>

                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-amber-400">
                                        📅 {isEs ? 'Programa del Culto' : isFr ? 'Programme du Culte' : isEn ? 'Service Program' : 'Pwogram Sèvis Kilt la'}
                                      </span>
                                      {(linkedService?.isOpenForAttendance || activeService?.id === linkedService?.id) && (
                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center gap-1 animate-pulse">
                                          🟢 {isEs ? 'En vivo' : isFr ? 'En direct' : isEn ? 'Live now' : 'An dirèk'}
                                        </span>
                                      )}
                                    </div>
                                    <h5 className="font-extrabold text-white text-xs sm:text-sm mt-0.5">
                                      {linkedService?.title || localizedTitle}
                                    </h5>
                                    <div className="text-[10px] sm:text-[11px] text-slate-300 flex items-center gap-2 mt-0.5 font-medium">
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-indigo-400" />
                                        {ann.time || linkedService?.startTime || '08:30 AM'} {linkedService?.endTime ? `- ${linkedService.endTime}` : ''}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Quick Scan presence button if service is active */}
                                {(linkedService?.isOpenForAttendance || activeService?.id === linkedService?.id) && (
                                  <button
                                    type="button"
                                    onClick={onOpenMyCode}
                                    className="w-full sm:w-auto px-3 py-2 sm:py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg cursor-pointer transition-all active:scale-95"
                                  >
                                    <QrCode className="w-3.5 h-3.5" />
                                    <span>{isEs ? 'Confirmar Asistencia' : isFr ? 'Confirmer Présence' : isEn ? 'Check-in Now' : 'Scan Prezans Mwen'}</span>
                                  </button>
                                )}
                              </div>

                              {/* Service Roles & Leaders Team Grid */}
                              {hasServiceRoles && (
                                <div className="pt-2 border-t border-indigo-500/20">
                                  <div className="text-[11px] font-bold text-indigo-300 mb-2 flex items-center gap-1.5">
                                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                                    <span>{isEs ? 'Equipo y Responsables en Servicio:' : isFr ? 'Équipe et Responsables en Service :' : isEn ? 'Ministry Team in Service:' : 'Ekip & Responsab ki sou Sèvis:'}</span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                    {serviceLeader && (
                                      <div className="p-2 rounded-xl bg-slate-950/80 border border-indigo-400/20 flex items-center gap-2">
                                        <span className="text-amber-400 text-sm">👑</span>
                                        <div className="min-w-0">
                                          <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">{isEs ? 'Dirigente' : isFr ? 'Dirigeant' : isEn ? 'Leader' : 'Dirijan'}</span>
                                          <span className="font-bold text-white truncate block">{serviceLeader}</span>
                                        </div>
                                      </div>
                                    )}
                                    {servicePreacher && (
                                      <div className="p-2 rounded-xl bg-slate-950/80 border border-indigo-400/20 flex items-center gap-2">
                                        <span className="text-emerald-400 text-sm">📖</span>
                                        <div className="min-w-0">
                                          <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">{isEs ? 'Predicador' : isFr ? 'Prédicateur' : isEn ? 'Preacher' : 'Predikatè'}</span>
                                          <span className="font-bold text-white truncate block">{servicePreacher}</span>
                                        </div>
                                      </div>
                                    )}
                                    {serviceReader && (
                                      <div className="p-2 rounded-xl bg-slate-950/80 border border-indigo-400/20 flex items-center gap-2">
                                        <span className="text-cyan-400 text-sm">📜</span>
                                        <div className="min-w-0">
                                          <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">{isEs ? 'Lectura Bíblica' : isFr ? 'Lecture Biblique' : isEn ? 'Scripture Reading' : 'Lektè Pawòl la'}</span>
                                          <span className="font-bold text-white truncate block">{serviceReader}</span>
                                        </div>
                                      </div>
                                    )}
                                    {serviceMusicians && (
                                      <div className="p-2 rounded-xl bg-slate-950/80 border border-indigo-400/20 flex items-center gap-2">
                                        <span className="text-purple-400 text-sm">🎵</span>
                                        <div className="min-w-0">
                                          <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">{isEs ? 'Música y Coro' : isFr ? 'Musique & Chorale' : isEn ? 'Music & Choir' : 'Mizisyen & Koral'}</span>
                                          <span className="font-bold text-white truncate block">{serviceMusicians}</span>
                                        </div>
                                      </div>
                                    )}
                                    {serviceUshers && (
                                      <div className="p-2 rounded-xl bg-slate-950/80 border border-indigo-400/20 flex items-center gap-2 sm:col-span-2">
                                        <span className="text-rose-400 text-sm">🤝</span>
                                        <div className="min-w-0">
                                          <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">{isEs ? 'Protocolo y Bienvenida' : isFr ? 'Accueil & Protocole' : isEn ? 'Ushers & Hospitality' : 'Akèy & Pwotokòl'}</span>
                                          <span className="font-bold text-white truncate block">{serviceUshers}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* =========================================================================
                            4. POST IMAGE / FLYER (ATTACHMENT)
                            ========================================================================= */}
                        {ann.imageUrl && (
                          <div className="relative overflow-hidden bg-black/40 border-y border-white/10 group">
                            <img
                              src={ann.imageUrl}
                              alt={localizedTitle}
                              onClick={() =>
                                setActiveLightboxImage({
                                  url: ann.imageUrl!,
                                  title: localizedTitle,
                                  caption: ann.imageCaption,
                                })
                              }
                              className="w-full max-h-[420px] object-cover cursor-pointer hover:opacity-95 transition-opacity"
                            />
                            <div
                              onClick={() =>
                                setActiveLightboxImage({
                                  url: ann.imageUrl!,
                                  title: localizedTitle,
                                  caption: ann.imageCaption,
                                })
                              }
                              className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all flex items-center justify-center cursor-pointer pointer-events-none group-hover:pointer-events-auto"
                            >
                              <span className="opacity-0 group-hover:opacity-100 transition-all px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 shadow-xl">
                                <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                                {isEs ? 'Ver en Grande' : isFr ? 'Agrandir' : isEn ? 'Enlarge' : 'Gade an Gwo'}
                              </span>
                            </div>
                            {ann.imageCaption && (
                              <div className="px-4 py-2 bg-slate-950/90 text-xs text-slate-300 text-center font-medium">
                                {ann.imageCaption}
                              </div>
                            )}
                          </div>
                        )}

                        {/* =========================================================================
                            5. FACEBOOK SOCIAL PROOF BAR (REACTIONS COUNT & COMMENT COUNT)
                            ========================================================================= */}
                        <div className="px-3.5 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between text-xs text-slate-400 border-t border-white/10 bg-white/[0.01]">
                          {/* Left: Reaction Icons & Count */}
                          <div className="flex items-center gap-1.5 min-w-0">
                            {(annInteraction.likes > 0 || annInteraction.userLiked) ? (
                              <>
                                <div className="flex -space-x-1 items-center shrink-0">
                                  <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-xs shadow-sm">
                                    {annInteraction.reaction === 'heart' ? '❤️' : annInteraction.reaction === 'fire' ? '🔥' : annInteraction.reaction === 'praise' ? '🙌' : '🙏'}
                                  </span>
                                  {annInteraction.likes > 1 && (
                                    <span className="w-5 h-5 rounded-full bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-xs shadow-sm">
                                      ❤️
                                    </span>
                                  )}
                                </div>
                                <span className="font-semibold text-slate-200 ml-0.5 truncate text-[11px] sm:text-xs">
                                  {annInteraction.likes > 0 ? `${annInteraction.likes} ${isEs ? 'reacciones' : isFr ? 'réactions' : isEn ? 'reactions' : 'reyaksyon'}` : (isEs ? '1 reacción' : isFr ? '1 réaction' : isEn ? '1 reaction' : '1 reyaksyon')}
                                </span>
                              </>
                            ) : (
                              <span className="text-slate-400 text-[10px] sm:text-[11px] italic truncate">
                                {isEs ? 'Sé el primero en reaccionar' : isFr ? 'Soyez le premier à réagir' : isEn ? 'Be the first to react' : 'Fè premye moun ki di Amen'}
                              </span>
                            )}
                          </div>

                          {/* Right: Comments Count & Share Count */}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              data-comment-toggle={ann.id}
                              onClick={() =>
                                setOpenCommentBox((prev) => ({
                                  ...prev,
                                  [ann.id]: !prev[ann.id],
                                }))
                              }
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
                              announcementId={ann.id}
                              userLiked={annInteraction.userLiked}
                              currentReaction={annInteraction.reaction}
                              likesCount={annInteraction.likes}
                              onSelectReaction={handleSelectReaction}
                              onToggleDefault={handleToggleDefault}
                              variant="facebook"
                            />
                          </div>

                          {/* 2. Comment Action Button */}
                          <div className="flex items-center justify-center p-0.5 min-w-0">
                            <button
                              type="button"
                              id={`btn-toggle-comments-${ann.id}`}
                              data-comment-toggle={ann.id}
                              onClick={() =>
                                setOpenCommentBox((prev) => ({
                                  ...prev,
                                  [ann.id]: !prev[ann.id],
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
                              onClick={() => handleShareAnnouncement(ann)}
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
                        {isCommentOpen && (
                          <div
                            data-comment-box={ann.id}
                            className="p-4 sm:p-5 bg-slate-950/75 backdrop-blur-xl border-t border-white/10 space-y-3.5 transition-all"
                          >
                            {/* Input Form at Top (Avatar + rounded pill input) */}
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-md ring-1 ring-white/20">
                                {memberDisplayName.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="flex-1 relative flex items-center">
                                <input
                                  type="text"
                                  id={`input-comment-${ann.id}`}
                                  placeholder={isEs ? 'Escribe una bendición o comentario...' : isEn ? 'Write a blessing or comment...' : isFr ? 'Écrivez une bénédiction ou un commentaire...' : 'Ekri yon benediksyon oswa kòmantè...'}
                                  value={commentInputs[ann.id] || ''}
                                  onChange={(e) =>
                                    setCommentInputs((prev) => ({
                                      ...prev,
                                      [ann.id]: e.target.value,
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddComment(ann.id);
                                    }
                                  }}
                                  className="w-full pl-4 pr-10 py-2 rounded-full ios-glass-pill text-white placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-amber-400/60 transition-all shadow-inner"
                                />
                                <button
                                  type="button"
                                  id={`btn-send-comment-${ann.id}`}
                                  onClick={() => handleAddComment(ann.id)}
                                  disabled={!commentInputs[ann.id]?.trim()}
                                  className="absolute right-1.5 p-1.5 rounded-full bg-amber-400 hover:bg-amber-300 disabled:opacity-30 disabled:pointer-events-none text-slate-950 font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
                                  title={isEs ? 'Publicar' : isFr ? 'Publier' : isEn ? 'Post' : 'Voye'}
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* iOS Wheel Drum View: Reading item magnified, scrolls smoothly without affecting feed */}
                            <CommentsWheel
                              announcementId={ann.id}
                              comments={cleanComments}
                              currentMemberName={member?.fullName || memberDisplayName}
                              onDeleteComment={handleDeleteComment}
                              language={language}
                            />
                          </div>
                        )}
                      </div>

                      {/* =========================================================================
                          DEDICATED ADVERTISEMENT & VERIFIED PARTNER SECTION IN FEED
                          ========================================================================= */}
                      {annIndex === 0 && (
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

      {/* POSTER LIGHTBOX MODAL */}
      <PosterLightboxModal
        isOpen={!!activeLightboxImage}
        imageUrl={activeLightboxImage?.url || ''}
        title={activeLightboxImage?.title || ''}
        caption={activeLightboxImage?.caption}
        language={language}
        onClose={() => setActiveLightboxImage(null)}
      />

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
    </div>
  );
};
