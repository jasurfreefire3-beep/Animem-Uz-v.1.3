import React, { useRef } from 'react';
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

export default function EmaCommentsBoard({ comments, loading }: EmaCommentsBoardProps) {
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
        <div 
          className="relative h-6 w-full border-y border-[#8b5a2b] shadow-md z-20"
          style={{
            background: 'repeating-linear-gradient(45deg, #a76b38, #a76b38 10px, #8b5224 10px, #8b5224 20px)'
          }}
        >
          {/* Subtle rope highlight */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/40 pointer-events-none" />
        </div>

        {/* White Shrine Paper Streamers (Gohei / Shimenawa tassels hanging at intervals) */}
        <div className="absolute top-6 left-0 right-0 h-4 pointer-events-none z-10 flex justify-around">
          {[...Array(14)].map((_, i) => (
            <div key={i} className="relative -top-1 w-3 h-4 bg-white/80 shadow-sm transform -skew-x-12 rotate-6" style={{ clipPath: 'polygon(0 0, 100% 0, 70% 100%, 0 85%)' }} />
          ))}
        </div>

        {/* 3. Horizontal Scrollable Hanging Ema Plaques */}
        <div
          ref={scrollRef}
          className="flex items-start gap-4 sm:gap-6 overflow-x-auto pt-6 pb-10 px-4 sm:px-8 no-scrollbar scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {loading ? (
            // Skeleton Plaques
            [...Array(5)].map((_, idx) => (
              <div
                key={idx}
                className="shrink-0 w-[240px] sm:w-[270px] h-[280px] bg-white/5 animate-pulse rounded-lg"
                style={{
                  clipPath: 'polygon(50% 0%, 100% 15%, 100% 100%, 0% 100%, 0% 15%)'
                }}
              />
            ))
          ) : comments.length === 0 ? (
            <div className="w-full text-center py-12 text-white/40 text-xs">
              Hozircha izohlar mavjud emas. Birinchi bo'lib fikringizni bildiring!
            </div>
          ) : (
            comments.map((comment, idx) => {
              const tilt = TILTS[idx % TILTS.length];
              const targetSlug = comment.anime_slug || toSlug(comment.anime_title || '');
              const cleanContent = (comment.content || '')
                .replace(/\[gif\].*?\[\/gif\]/gi, '')
                .replace(/https?:\/\/\S+/gi, '')
                .trim() || 'Ajoyib anime!';

              return (
                <div
                  key={comment.id || idx}
                  className="shrink-0 relative group flex flex-col items-center cursor-pointer transition-transform duration-300"
                  style={{
                    transform: `rotate(${tilt}deg)`,
                    transformOrigin: 'top center'
                  }}
                >
                  {/* Red Pin Tack holding the string on the wooden beam */}
                  <div className="relative -top-5 z-30 flex flex-col items-center">
                    <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-rose-700 to-red-500 shadow-[0_2px_4px_rgba(0,0,0,0.6)] border border-white/40" />
                    {/* Red Hanging String */}
                    <div className="w-[1.5px] h-6 bg-red-600 shadow-sm" />
                  </div>

                  {/* Authentic Traditional Wooden Ema Tablet (絵馬) */}
                  <Link
                    to={getLocalizedPath(`/anime/${targetSlug}`)}
                    className="relative block w-[240px] min-[420px]:w-[265px] sm:w-[285px] pt-7 pb-4 px-4 sm:px-5 transition-all duration-300 group-hover:scale-105 group-hover:rotate-0"
                    style={{
                      clipPath: 'polygon(50% 0%, 100% 15%, 100% 100%, 0% 100%, 0% 15%)',
                      background: 'linear-gradient(to bottom, #f0dfc4 0%, #e5cba8 50%, #d8b78d 100%)',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.45), 0 2px 4px rgba(0, 0, 0, 0.2)'
                    }}
                  >
                    {/* Hanging Hole at top peak */}
                    <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#4a240c] shadow-inner" />

                    {/* Subtle Wood Grain Texture (vertical soft lines) */}
                    <div 
                      className="absolute inset-0 pointer-events-none opacity-20"
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

