import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ThumbsUp, Heart, ChevronUp } from 'lucide-react';

export type ReactionType = 'amen' | 'heart' | 'praise' | 'fire' | 'applause' | 'light';

export interface ReactionConfig {
  id: ReactionType;
  emoji: string;
  label: string;
  colorClass: string;
  badgeBg: string;
  soundName?: string;
}

export const REACTION_LIST: ReactionConfig[] = [
  {
    id: 'amen',
    emoji: '🙏',
    label: 'Amen!',
    colorClass: 'text-amber-300',
    badgeBg: 'bg-amber-400/20 border-amber-400/40 text-amber-300',
  },
  {
    id: 'heart',
    emoji: '❤️',
    label: 'Kè Kontan',
    colorClass: 'text-rose-400',
    badgeBg: 'bg-rose-500/20 border-rose-400/40 text-rose-300',
  },
  {
    id: 'praise',
    emoji: '🙌',
    label: 'Glwa pou Bondye',
    colorClass: 'text-indigo-400',
    badgeBg: 'bg-indigo-500/20 border-indigo-400/40 text-indigo-300',
  },
  {
    id: 'fire',
    emoji: '🔥',
    label: 'Dife & Favè',
    colorClass: 'text-orange-400',
    badgeBg: 'bg-orange-500/20 border-orange-400/40 text-orange-300',
  },
  {
    id: 'applause',
    emoji: '👏',
    label: 'Bravo & Viv!',
    colorClass: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300',
  },
  {
    id: 'light',
    emoji: '💡',
    label: 'Enspirasyon',
    colorClass: 'text-yellow-300',
    badgeBg: 'bg-yellow-400/20 border-yellow-400/40 text-yellow-200',
  },
];

interface ReactionPickerProps {
  announcementId: string;
  userLiked: boolean;
  currentReaction?: ReactionType;
  likesCount: number;
  onSelectReaction: (annId: string, reaction: ReactionType) => void;
  onToggleDefault: (annId: string) => void;
  variant?: 'pill' | 'facebook';
}

export const ReactionPicker: React.FC<ReactionPickerProps> = ({
  announcementId,
  userLiked,
  currentReaction = 'amen',
  likesCount,
  onSelectReaction,
  onToggleDefault,
  variant = 'pill',
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [hoveredReaction, setHoveredReaction] = useState<ReactionType | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const reactionItemsRef = useRef<Map<ReactionType, HTMLButtonElement>>(new Map());

  const activeReactionConfig = REACTION_LIST.find((r) => r.id === currentReaction) || REACTION_LIST[0];

  // Helper to find which reaction item is under (x, y) coordinates during swipe/drag
  const getReactionAtPoint = useCallback((clientX: number, clientY: number): ReactionType | null => {
    for (const [reactionId, elem] of reactionItemsRef.current.entries()) {
      if (elem) {
        const rect = elem.getBoundingClientRect();
        // Slightly generous hit area for smooth touch drag
        if (
          clientX >= rect.left - 12 &&
          clientX <= rect.right + 12 &&
          clientY >= rect.top - 18 &&
          clientY <= rect.bottom + 18
        ) {
          return reactionId;
        }
      }
    }
    return null;
  }, []);

  // Handle Touch Start (Start long-press timer)
  const handleTouchStart = (e: React.TouchEvent) => {
    isDraggingRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      setIsMenuOpen(true);
      isDraggingRef.current = true;
      if (navigator.vibrate) {
        try {
          navigator.vibrate(25);
        } catch (_) {}
      }
    }, 220); // 220ms for super responsive longpress
  };

  // Handle Touch Move (Swipe / Drag over reactions)
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMenuOpen && !isDraggingRef.current) {
      // If user moved finger before longpress, cancel longpress
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      return;
    }

    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const targetReaction = getReactionAtPoint(touch.clientX, touch.clientY);
      setHoveredReaction(targetReaction);
    }
  };

  // Handle Touch End (Lage = Auto-Select reaction)
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isDraggingRef.current && isMenuOpen) {
      // User was dragging and released finger
      if (hoveredReaction) {
        onSelectReaction(announcementId, hoveredReaction);
        if (navigator.vibrate) {
          try {
            navigator.vibrate([15, 30, 15]);
          } catch (_) {}
        }
      }
      setIsMenuOpen(false);
      setHoveredReaction(null);
      isDraggingRef.current = false;
    }
  };

  // Mouse / Desktop Interactions
  const handleMouseEnterContainer = () => {
    longPressTimerRef.current = setTimeout(() => {
      setIsMenuOpen(true);
    }, 250);
  };

  const handleMouseLeaveContainer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    setIsMenuOpen(false);
    setHoveredReaction(null);
  };

  // Quick Click Handler (If not long pressed)
  const handleMainButtonClick = () => {
    if (!isDraggingRef.current) {
      onToggleDefault(announcementId);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative select-none ${variant === 'facebook' ? 'flex-1 w-full' : 'inline-flex items-center'}`}
      onMouseEnter={handleMouseEnterContainer}
      onMouseLeave={handleMouseLeaveContainer}
    >
      {/* =========================================================================
          ULTRA PRO MAX FLOATING REACTION DOCK (SWIPE & RELEASE AUTO-SELECT)
          ========================================================================= */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.8 }}
            animate={{ opacity: 1, y: -8, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 450, damping: 28 }}
            className={`absolute bottom-full mb-1.5 z-50 flex items-center gap-1.5 p-1.5 rounded-full bg-slate-950/95 backdrop-blur-2xl border border-amber-400/40 shadow-[0_12px_40px_rgba(0,0,0,0.85),0_0_20px_rgba(251,191,36,0.2)] ${
              variant === 'facebook' ? 'left-0 sm:left-2' : 'left-0'
            }`}
          >
            {/* Instruction tooltip when hovering / dragging */}
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-slate-900/90 border border-slate-700 text-[10px] font-bold text-amber-300 whitespace-nowrap shadow pointer-events-none">
              {hoveredReaction ? (
                <span>{REACTION_LIST.find((r) => r.id === hoveredReaction)?.label}</span>
              ) : (
                <span className="text-slate-400">Glise dwèt ou & lage pou seleksyone</span>
              )}
            </div>

            {REACTION_LIST.map((reaction) => {
              const isHovered = hoveredReaction === reaction.id;
              const isCurrent = userLiked && currentReaction === reaction.id;

              return (
                <motion.button
                  key={reaction.id}
                  ref={(el) => {
                    if (el) reactionItemsRef.current.set(reaction.id, el);
                  }}
                  type="button"
                  id={`btn-dock-reaction-${announcementId}-${reaction.id}`}
                  animate={{
                    scale: isHovered ? 1.45 : 1,
                    y: isHovered ? -6 : 0,
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                  onMouseEnter={() => setHoveredReaction(reaction.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectReaction(announcementId, reaction.id);
                    setIsMenuOpen(false);
                    setHoveredReaction(null);
                  }}
                  className={`relative flex flex-col items-center justify-center w-10 h-10 rounded-full transition-colors cursor-pointer ${
                    isCurrent
                      ? 'bg-amber-400/20 ring-2 ring-amber-400'
                      : isHovered
                      ? 'bg-white/20 ring-2 ring-white/60'
                      : 'hover:bg-white/10'
                  }`}
                >
                  <span className="text-2xl drop-shadow-md select-none transform pointer-events-none">
                    {reaction.emoji}
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          MAIN TRIGGER BUTTON (TAP TO TOGGLE OR LONG-PRESS TO SWIPE)
          ========================================================================= */}
      {variant === 'facebook' ? (
        <button
          type="button"
          id={`btn-main-react-${announcementId}`}
          onClick={handleMainButtonClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`w-full py-2 px-1 sm:px-3 rounded-xl flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm font-bold transition-all cursor-pointer select-none active:scale-[0.98] ${
            userLiked
              ? `bg-amber-400/10 ${activeReactionConfig.colorClass} border border-amber-400/30 font-black`
              : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
          }`}
          title="Klike pou reponn, oswa kenbe peze pou chwazi reyaksyon"
        >
          <span className="text-base sm:text-lg leading-none transition-transform hover:scale-110 shrink-0">
            {userLiked ? activeReactionConfig.emoji : '🙏'}
          </span>
          <span className="truncate text-[11px] sm:text-xs font-bold">
            {userLiked ? activeReactionConfig.label : 'Amen'}
          </span>
        </button>
      ) : (
        <button
          type="button"
          id={`btn-main-react-${announcementId}`}
          onClick={handleMainButtonClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 select-none ${
            userLiked
              ? activeReactionConfig.badgeBg
              : 'bg-slate-950/80 hover:bg-slate-900 text-slate-300 border border-slate-700/80 hover:border-amber-400/40'
          }`}
          title="Klike pou reponn, oswa kenbe peze (long-press) pou chwazi reyaksyon"
        >
          <span className="text-base leading-none">
            {userLiked ? activeReactionConfig.emoji : '🙏'}
          </span>
          <span className="leading-none">
            {userLiked ? activeReactionConfig.label : 'Amen'}
          </span>
          {likesCount > 0 && (
            <span className="font-mono text-[11px] opacity-90 px-1 py-0.2 rounded-full bg-slate-900/60 border border-white/10">
              {likesCount}
            </span>
          )}
          <ChevronUp className="w-3 h-3 opacity-50 hover:opacity-100" />
        </button>
      )}
    </div>
  );
};
