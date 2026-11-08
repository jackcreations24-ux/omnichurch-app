import React, { useRef, useEffect, useState, useCallback } from 'react';
import { AnnouncementComment } from '../../types';
import { Trash2, ChevronUp, ChevronDown, MessageSquare } from 'lucide-react';

interface CommentsWheelProps {
  announcementId: string;
  comments: AnnouncementComment[];
  currentMemberName?: string;
  onDeleteComment: (annId: string, commentId: string) => void;
  language?: string;
}

export const CommentsWheel: React.FC<CommentsWheelProps> = ({
  announcementId,
  comments,
  currentMemberName,
  onDeleteComment,
  language = 'ht',
}) => {
  const isEs = language === 'es';
  const isFr = language === 'fr';
  const isEn = language === 'en';

  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [itemMetrics, setItemMetrics] = useState<
    Array<{ dist: number; ratio: number; scale: number; opacity: number; rotateX: number }>
  >([]);

  // Update center calculations on scroll
  const updateActiveAndTransform = useCallback(() => {
    const container = containerRef.current;
    if (!container || comments.length === 0) return;

    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.top + containerRect.height / 2;

    let closestIdx = 0;
    let minDistance = Infinity;

    const metrics = comments.map((_, idx) => {
      const el = itemRefs.current[idx];
      if (!el) {
        return { dist: 0, ratio: 1, scale: 1, opacity: 1, rotateX: 0 };
      }
      const elRect = el.getBoundingClientRect();
      const elCenter = elRect.top + elRect.height / 2;
      const dist = elCenter - containerCenter;
      const absDist = Math.abs(dist);

      if (absDist < minDistance) {
        minDistance = absDist;
        closestIdx = idx;
      }

      // Calculate iOS wheel 3D curvature and magnification:
      // When at center (absDist ~ 0): scale is 1.05, opacity is 1, rotateX is 0
      // As it moves away, scale decreases to ~0.90, opacity to ~0.45, rotateX curves up to 26deg
      const maxRange = containerRect.height * 0.45 || 120;
      const normalized = Math.min(1, absDist / maxRange);
      const ratio = 1 - normalized; // 1 at center, 0 far away

      const scale = 0.9 + ratio * 0.14; // from 0.90 up to 1.04
      const opacity = 0.4 + ratio * 0.6; // from 0.40 up to 1.0
      // 3D rotation: items above rotate down, items below rotate up
      const rotateX = Math.max(-28, Math.min(28, (dist / maxRange) * 22));

      return { dist, ratio, scale, opacity, rotateX };
    });

    setActiveIndex(closestIdx);
    setItemMetrics(metrics);
  }, [comments]);

  // Initial calculation and resize handling
  useEffect(() => {
    updateActiveAndTransform();
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      requestAnimationFrame(updateActiveAndTransform);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [updateActiveAndTransform]);

  // ISOLATE SCROLL FROM FEED (Crucial: prevents feed from scrolling while spinning wheel)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheelCapture = (e: WheelEvent) => {
      // Prevent parent newsfeed from moving
      e.stopPropagation();

      const { scrollTop, scrollHeight, clientHeight } = container;
      const isScrollable = scrollHeight > clientHeight;

      if (!isScrollable) return;

      const atTop = scrollTop <= 0 && e.deltaY < 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1 && e.deltaY > 0;

      // If reaching the edge, prevent feed from taking over scroll
      if (atTop || atBottom) {
        e.preventDefault();
        return;
      }

      // Smooth manual scroll to keep containment 100% airtight
      container.scrollTop += e.deltaY;
      e.preventDefault();
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.stopPropagation();
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.stopPropagation();
    };

    container.addEventListener('wheel', handleWheelCapture, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      container.removeEventListener('wheel', handleWheelCapture);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  // Center a comment when clicked or via navigation arrows
  const scrollToComment = (idx: number) => {
    const container = containerRef.current;
    const el = itemRefs.current[idx];
    if (!container || !el) return;

    const containerCenter = container.clientHeight / 2;
    const elCenter = el.offsetTop + el.clientHeight / 2;
    const targetScrollTop = elCenter - containerCenter;

    container.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth',
    });
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      scrollToComment(activeIndex - 1);
    }
  };

  const handleNext = () => {
    if (activeIndex < comments.length - 1) {
      scrollToComment(activeIndex + 1);
    }
  };

  if (comments.length === 0) {
    return (
      <div className="text-center py-4 px-3 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800">
        <MessageSquare className="w-5 h-5 mx-auto text-slate-500 mb-1.5 opacity-60" />
        <p className="text-xs text-slate-400 italic">
          {isEs
            ? 'Aún no hay comentarios. ¡Sé el primero en compartir una bendición!'
            : isFr
            ? 'Aucun commentaire pour le moment. Soyez le premier à partager une bénédiction !'
            : isEn
            ? 'No comments yet. Be the first to share a blessing!'
            : 'Pa gen kòmantè pou kounye a. Ekri premye mo benediksyon an!'}
        </p>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl bg-slate-950/90 border border-slate-800/90 p-2 sm:p-3 overflow-hidden shadow-2xl">
      {/* Top Bar with iOS Wheel Header, Status Indicator & Stepper Buttons */}
      <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-800/80 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-[11px] font-bold text-slate-300">
            {isEs ? 'Comentarios' : isFr ? 'Commentaires' : isEn ? 'Comments' : 'Kòmantè yo'}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20 font-bold">
            {activeIndex + 1} / {comments.length}
          </span>
        </div>

        {/* Up / Down Navigation Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrev}
            disabled={activeIndex === 0}
            className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
            title={isEs ? 'Anterior' : isFr ? 'Précédent' : isEn ? 'Previous' : 'Kòmantè Anvan'}
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={activeIndex >= comments.length - 1}
            className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
            title={isEs ? 'Siguiente' : isFr ? 'Suivant' : isEn ? 'Next' : 'Kòmantè Apre'}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* =========================================================================
          THE iOS WHEEL CYLINDRICAL VIEWPORT
          - Perspective drum
          - overscroll-behavior: contain (strictly protects feed scroll)
          - Centered reading lens highlighting the active comment
          ========================================================================= */}
      <div className="relative">
        {/* Optical Center Lens / Highlighting Focus Rail */}
        <div
          className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-20 sm:h-22 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-400/15 to-amber-500/10 border-y border-amber-400/40 pointer-events-none z-10 shadow-[0_0_20px_rgba(251,191,36,0.08)]"
          aria-hidden="true"
        />

        {/* Top Fade Vignette (iOS Picker 3D depth) */}
        <div
          className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-slate-950 via-slate-950/80 to-transparent pointer-events-none z-20"
          aria-hidden="true"
        />

        {/* Bottom Fade Vignette (iOS Picker 3D depth) */}
        <div
          className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent pointer-events-none z-20"
          aria-hidden="true"
        />

        {/* The Scrollable Roller Track */}
        <div
          ref={containerRef}
          className="h-64 sm:h-72 overflow-y-auto overflow-x-hidden snap-y snap-mandatory py-20 space-y-3 px-1.5 scroll-smooth"
          style={{
            overscrollBehaviorY: 'contain',
            WebkitOverflowScrolling: 'touch',
            perspective: '1000px',
          }}
        >
          {comments.map((c, idx) => {
            const isActive = idx === activeIndex;
            const metrics = itemMetrics[idx] || {
              scale: isActive ? 1.04 : 0.92,
              opacity: isActive ? 1 : 0.5,
              rotateX: 0,
            };

            const safeCurrentMember = (currentMemberName || '').toLowerCase();
            const isAuthor =
              Boolean(safeCurrentMember) &&
              (((c.author || '').toLowerCase().includes(safeCurrentMember)) ||
                safeCurrentMember.includes((c.author || '').toLowerCase()));

            return (
              <div
                key={c.id}
                ref={(el) => {
                  itemRefs.current[idx] = el;
                }}
                onClick={() => scrollToComment(idx)}
                className={`snap-center transition-all duration-200 cursor-pointer rounded-2xl p-3 select-none ${
                  isActive
                    ? 'bg-slate-800/95 border border-amber-400/60 shadow-[0_8px_25px_rgba(0,0,0,0.6),0_0_15px_rgba(251,191,36,0.15)] ring-1 ring-amber-400/30'
                    : 'bg-slate-900/60 border border-slate-800/60 hover:bg-slate-900/90'
                }`}
                style={{
                  transform: `scale(${metrics.scale}) rotateX(${metrics.rotateX}deg)`,
                  opacity: metrics.opacity,
                  transformOrigin: 'center center',
                }}
              >
                <div className="flex items-start justify-between gap-2.5">
                  {/* Avatar & Author Details */}
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <div
                      className={`rounded-full text-white font-bold flex items-center justify-center shrink-0 shadow transition-all ${
                        isActive
                          ? 'w-8 h-8 text-xs bg-gradient-to-br from-amber-500 via-purple-600 to-indigo-600 ring-2 ring-amber-400/50'
                          : 'w-7 h-7 text-[10px] bg-gradient-to-br from-indigo-600 to-slate-700'
                      }`}
                    >
                      {c.avatarInitials || (c.author || 'M').slice(0, 2).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`font-bold truncate leading-tight transition-colors ${
                            isActive ? 'text-amber-300 text-sm' : 'text-slate-300 text-xs'
                          }`}
                        >
                          {c.author}
                        </span>

                        {isActive && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                            {isEs ? 'Leyendo' : isFr ? 'En lecture' : isEn ? 'Reading' : 'W ap li l'}
                          </span>
                        )}

                        <span className="text-[10px] text-slate-400 font-mono ml-auto shrink-0">
                          {c.time}
                        </span>
                      </div>

                      {/* Comment text - Magnified and prominent when active */}
                      <p
                        className={`mt-1 whitespace-pre-line leading-relaxed transition-all ${
                          isActive
                            ? 'text-white text-xs sm:text-sm font-medium'
                            : 'text-slate-300 text-xs line-clamp-2'
                        }`}
                      >
                        {c.text}
                      </p>
                    </div>
                  </div>

                  {/* Delete Comment Button (visible on hover or if author) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteComment(announcementId, c.id);
                    }}
                    className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                    title={isEs ? 'Eliminar comentario' : isFr ? 'Supprimer' : isEn ? 'Delete' : 'Efase kòmantè'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Helper Footer Instruction */}
      <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 px-1">
        <span>
          💡 {isEs ? 'Desliza hacia arriba/abajo como rueda de iOS' : isFr ? 'Faites défiler comme une molette iOS' : isEn ? 'Scroll like an iOS picker wheel' : 'Glise monte oswa desann tankou yon wou iOS'}
        </span>
        <span className="font-mono text-slate-400">{comments.length} total</span>
      </div>
    </div>
  );
};
