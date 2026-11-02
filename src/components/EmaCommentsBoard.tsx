import React, { useRef, memo } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { toSlug } from '../types';
import { useLanguage } from '../context/LanguageContext';

export interface EmaComment {
  id: string | number;
  content: string;
  user_name: string;
  user_avatar?: string | null;
  anime_title?: string;
  anime_image?: string;
  anime_slug?: string;
  created_at?: string;
}

interface EmaCommentsBoardProps {
  comments: EmaComment[];
  loading?: boolean;
}

// Format relative time helper in Uzbek
function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return 'Yaqinda';
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin < 1) return 'Hozirgina';
    if (diffMin < 60) return `${diffMin} daqiqa oldin`;
    if (diffHours < 24) return `${diffHours} soat oldin`;
    if (diffDays === 1) return '1 kun oldin';
    if (diffDays < 30) return `${diffDays} kun oldin`;
    return '1 oy oldin';
  } catch {
    return 'Yaqinda';
  }
}

// Alternating natural tilts for authentic shrine look
const TILTS = [-2.5, 2.8, -1.2, 2.2, -2.8, 1.5, -2.0, 2.4, -1.8, 2.0];

function EmaCommentsBoard({ comments, loading }: EmaCommentsBoardProps) {
  const { getLocalizedPath } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -340 : 340;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <section className="w-full mt-14 sm:mt-20 pt-8 border-t border-white/10 select-none">
      {/* 1. Header with Authentic Title & Japanese Kanji */}
      <div className="flex items-center justify-between px-4 sm:px-8 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#ff006a]/20 border border-[#ff006a]/40 flex items-center justify-center text-[#ff006a]">
            <MessageSquare size={16} className="stroke-[2.5]" />
          </div>
          <div className="flex items-baseline gap-2.5">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              So'nggi izohlar
            </h2>
            <span className="text-white/40 text-xs sm:text-sm font-light font-serif tracking-widest">
              絵馬掛け
            </span>
          </div>
        </div>

        {/* Carousel Arrow Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scroll('left')}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#ff006a] text-white/70 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95"
            title="Oldingi"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#ff006a] text-white/70 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95"
            title="Keyingi"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* 2. Wooden Shrine Beam & Braided Rope (絵馬掛け) */}
      <div className="relative w-full overflow-hidden">
        {/* Horizontal Wooden Beam / Shimenawa Rope */}
        <div className="relative h-6 sm:h-7 w-full flex items-center z-10 shadow-md">
          {/* Authentic Wood Beam texture gradient */}
          <div className="w-full h-3.5 sm:h-4.5 bg-gradient-to-b from-[#6b4423] via-[#4a2e16] to-[#2c1808] border-y border-[#8b5a2b]/60 relative shadow-inner">
            {/* Shimenawa braided cord styling */}
            <div 
              className="absolute inset-0 opacity-40" 
              style={{
                backgroundImage: 'repeating-linear-gradient(45deg, #f5d77f 0px, #f5d77f 8px, #3d2314 8px, #3d2314 16px)'
              }}
            />
          </div>

          {/* Traditional White Zig-Zag Paper Streamers (Shide 紙垂) hanging on beam */}
          <div className="absolute top-3 left-10 w-2.5 h-6 bg-white/90 shadow-sm transform -skew-x-12 pointer-events-none" />
          <div className="absolute top-3 left-[28%] w-3 h-7 bg-white/85 shadow-sm transform skew-x-12 pointer-events-none" />
          <div className="absolute top-3 left-[52%] w-2.5 h-6 bg-white/90 shadow-sm transform -skew-x-6 pointer-events-none" />
          <div className="absolute top-3 left-[76%] w-3 h-7 bg-white/85 shadow-sm transform skew-x-12 pointer-events-none" />
          <div className="absolute top-3 right-12 w-2.5 h-6 bg-white/90 shadow-sm transform -skew-x-12 pointer-events-none" />
        </div>

        {/* 3. Horizontal Scrollable Rack of Hanging Wooden Plaques (Ema) */}
        <div 
          ref={scrollRef}
          className="flex items-start gap-4 sm:gap-6 overflow-x-auto pt-2 pb-6 px-4 sm:px-8 no-scrollbar scroll-smooth relative"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {loading ? (
            /* Loading Skeletons shaped like Ema plaques */
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="shrink-0 w-64 sm:w-72 h-48 rounded-xl bg-amber-950/20 border border-amber-900/30 animate-pulse flex flex-col justify-end p-4"
              >
                <div className="w-3/4 h-3 bg-white/10 rounded mb-2" />
                <div className="w-1/2 h-3 bg-white/10 rounded mb-4" />
                <div className="w-full h-8 bg-white/5 rounded-lg" />
              </div>
            ))
          ) : comments.length === 0 ? (
            <div className="w-full py-8 text-center text-white/40 text-sm font-mono">
              Hozircha birorta izoh qoldirilmagan.
            </div>
          ) : (
            comments.map((comment, index) => {
              const tilt = TILTS[index % TILTS.length];
              const animeTargetSlug = comment.anime_slug || (comment.anime_title ? toSlug(comment.anime_title) : '');
              const cleanContent = comment.content.replace(/^["'«“]/, '').replace(/["'»”]$/, '');

              return (
                <div
                  key={comment.id || index}
                  className="shrink-0 flex flex-col items-center group relative cursor-pointer"
                  style={{
                    scrollSnapAlign: 'start',
                    transform: `rotate(${tilt}deg)`,
                    transformOrigin: 'top center',
                    transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = `rotate(0deg) translateY(-4px) scale(1.03)`;
                    e.currentTarget.style.zIndex = '30';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = `rotate(${tilt}deg)`;
                    e.currentTarget.style.zIndex = '1';
                  }}
                >
                  {/* Hanging Red Knot & String (Mizuhiki 紐) */}
                  <div className="w-0.5 h-6 bg-gradient-to-b from-red-600 via-rose-500 to-red-700 shadow-sm relative z-0">
                    {/* Metal Hook Loop / Bead */}
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500 border border-white/60 shadow-xs" />
                  </div>

                  {/* Traditional Five-Sided Wooden Shrine Plaque (Ema 絵馬) */}
                  <Link
                    to={animeTargetSlug ? getLocalizedPath(`/anime/${animeTargetSlug}`) : '#'}
                    className="relative w-64 sm:w-72 bg-gradient-to-b from-[#f5e3ba] via-[#ebd2a2] to-[#dcbe8d] rounded-b-xl p-4 sm:p-5 shadow-[0_12px_30px_rgba(0,0,0,0.65)] border-2 border-[#b88c52] block text-inherit focus:outline-none transition-shadow group-hover:shadow-[0_18px_40px_rgba(255,0,106,0.3)]"
                    style={{
                      clipPath: 'polygon(50% 0%, 100% 12%, 100% 100%, 0% 100%, 0% 12%)'
                    }}
                  >
                    {/* Brass Hanging Eyelet Ring on the top ridge */}
                    <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#523315] border border-[#d8aa6b] shadow-inner pointer-events-none" />

                    {/* Subtle Woodgrain Texture Overlay */}
                    <div 
                      className="absolute inset-0 pointer-events-none opacity-25 mix-blend-multiply"
                      style={{
                        backgroundImage: 'repeating-linear-gradient(90deg, rgba(74, 36, 12, 0.08) 0px, rgba(74, 36, 12, 0.08) 2px, transparent 2px, transparent 8px)'
                      }}
                    />

                    {/* Faint Red/Gold Japanese Shrine Stamp Watermark (願 - Wish / 祈 - Prayer) */}
                    <div className="absolute right-3 top-8 pointer-events-none select-none text-[#a64b2a]/15 text-5xl font-serif font-black">
                      願
                    </div>

                    {/* Comment Content with Authentic Japanese Corner Quotes 「 ... 」 */}
                    <div className="relative z-10 min-h-[64px] flex items-center justify-start text-left mb-3">
                      <p className="text-[#3b1d0c] font-black text-xs sm:text-[13px] leading-snug line-clamp-3">
                        <span className="text-[#a64b2a] font-serif text-sm mr-0.5">「</span>
                        {cleanContent}
                        <span className="text-[#a64b2a] font-serif text-sm ml-0.5">」</span>
                      </p>
                    </div>

                    {/* Author Row */}
                    <div className="relative z-10 flex items-center gap-2 mb-3 text-left">
                      {/* Avatar or Red Initial Badge */}
                      {comment.user_avatar ? (
                        <img
                          src={comment.user_avatar}
                          alt={comment.user_name}
                          className="w-7 h-7 rounded-full object-cover border border-[#a64b2a]/40 shadow-sm shrink-0"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 text-white font-black text-xs flex items-center justify-center shadow-sm shrink-0 uppercase">
                          {(comment.user_name || 'A')[0]}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h4 className="text-[12px] font-black text-[#2e1507] truncate leading-tight">
                          {comment.user_name || 'Foydalanuvchi'}
                        </h4>
                        <span className="text-[10px] font-medium text-[#7d4826] block leading-tight">
                          {formatRelativeTime(comment.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Bottom White Sticker Pill with Anime Thumbnail & Title */}
                    {comment.anime_title && (
                      <div className="relative z-10 bg-white/95 rounded-lg p-1.5 shadow-sm border border-black/5 flex items-center gap-2 text-left group-hover:bg-white transition-colors">
                        {comment.anime_image ? (
                          <img
                            src={comment.anime_image}
                            alt={comment.anime_title}
                            className="w-6 h-8 rounded object-cover shrink-0 shadow-xs"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-6 h-8 rounded bg-gray-200 shrink-0" />
                        )}
                        <span className="text-[11px] font-black text-gray-900 truncate flex-1">
                          {comment.anime_title}
                        </span>
                      </div>
                    )}
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

export default memo(EmaCommentsBoard);
