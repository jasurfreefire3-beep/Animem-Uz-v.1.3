import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Sparkles, X, Flame, Search, Loader2 } from 'lucide-react';

export const POPULAR_ANIME_GIFS = [
  // High quality Giphy Anime GIFs (Luffy, Naruto, Gojo, Anya, Demon Slayer, etc.)
  { id: 'g1', title: 'Luffy Gear 5 Laugh', url: 'https://media.giphy.com/media/WmkqburJqXziM/giphy.gif', preview: 'https://media.giphy.com/media/WmkqburJqXziM/200.gif' },
  { id: 'g2', title: 'Gojo Satoru Domain Expansion', url: 'https://media.giphy.com/media/UgV8Y7bDxsZDCP079U/giphy.gif', preview: 'https://media.giphy.com/media/UgV8Y7bDxsZDCP079U/200.gif' },
  { id: 'g3', title: 'Naruto Rasengan Epic', url: 'https://media.giphy.com/media/OU6tgBi0YJ4HK/giphy.gif', preview: 'https://media.giphy.com/media/OU6tgBi0YJ4HK/200.gif' },
  { id: 'g4', title: 'Anya Forger Heh Smile', url: 'https://media.giphy.com/media/FWAcpJsFT9mVRv0e7a/giphy.gif', preview: 'https://media.giphy.com/media/FWAcpJsFT9mVRv0e7a/200.gif' },
  { id: 'g5', title: 'Tanjiro Kamado Hinokami', url: 'https://media.giphy.com/media/dyjrpqaUVqCELGuQVr/giphy.gif', preview: 'https://media.giphy.com/media/dyjrpqaUVqCELGuQVr/200.gif' },
  { id: 'g6', title: 'Zoro Three Sword Style', url: 'https://media.giphy.com/media/9az09tlYyYNfq/giphy.gif', preview: 'https://media.giphy.com/media/9az09tlYyYNfq/200.gif' },
  { id: 'g7', title: 'Killua Godspeed HxH', url: 'https://media.giphy.com/media/qb1eHxhUHLdsc/giphy.gif', preview: 'https://media.giphy.com/media/qb1eHxhUHLdsc/200.gif' },
  { id: 'g8', title: 'Levi Ackerman Attack on Titan', url: 'https://media.giphy.com/media/11HeubLHnQJSA8/giphy.gif', preview: 'https://media.giphy.com/media/11HeubLHnQJSA8/200.gif' },
  { id: 'g9', title: 'Sukuna Malevolent Shrine', url: 'https://media.giphy.com/media/bDWdJRY2IZCX6/giphy.gif', preview: 'https://media.giphy.com/media/bDWdJRY2IZCX6/200.gif' },
  { id: 'g10', title: 'Goku Ultra Instinct DBZ', url: 'https://media.giphy.com/media/12wsn8hn693bWw/giphy.gif', preview: 'https://media.giphy.com/media/12wsn8hn693bWw/200.gif' },
  { id: 'g11', title: 'Sailor Moon Wink Magic', url: 'https://media.giphy.com/media/PoK1bzB3qyNFe/giphy.gif', preview: 'https://media.giphy.com/media/PoK1bzB3qyNFe/200.gif' },
  { id: 'g12', title: 'Nezuko Kamado Cute Run', url: 'https://media.giphy.com/media/kX7OWl40hcz6RSZa1n/giphy.gif', preview: 'https://media.giphy.com/media/kX7OWl40hcz6RSZa1n/200.gif' },
  { id: 'g13', title: 'Kakashi Chidori Lightning', url: 'https://media.giphy.com/media/A8UGp97js577q/giphy.gif', preview: 'https://media.giphy.com/media/A8UGp97js577q/200.gif' },
  { id: 'g14', title: 'Itachi Uchiha Crow Genjutsu', url: 'https://media.giphy.com/media/CchzkJJ6UrQmQ/giphy.gif', preview: 'https://media.giphy.com/media/CchzkJJ6UrQmQ/200.gif' },
  { id: 'g15', title: 'Chika Dance Kaguya-sama', url: 'https://media.giphy.com/media/108he41yPdWwOQ/giphy.gif', preview: 'https://media.giphy.com/media/108he41yPdWwOQ/200.gif' },
  { id: 'g16', title: 'One Punch Man Saitama OK', url: 'https://media.giphy.com/media/arbHBDAq95uDcFi9Z9/giphy.gif', preview: 'https://media.giphy.com/media/arbHBDAq95uDcFi9Z9/200.gif' },
  { id: 'g17', title: 'Solo Leveling Sung Jinwoo Arise', url: 'https://media.giphy.com/media/fBGy9GPvCuNNhS0nxG/giphy.gif', preview: 'https://media.giphy.com/media/fBGy9GPvCuNNhS0nxG/200.gif' },
  { id: 'g18', title: 'Eren Yeager Founding Titan', url: 'https://media.giphy.com/media/3o7btQ8jDTPGDpgc6I/giphy.gif', preview: 'https://media.giphy.com/media/3o7btQ8jDTPGDpgc6I/200.gif' },
  { id: 'g19', title: 'Megumi Fushiguro Shadows', url: 'https://media.giphy.com/media/4ilFRqgbzbx4c/giphy.gif', preview: 'https://media.giphy.com/media/4ilFRqgbzbx4c/200.gif' },
  { id: 'g20', title: 'Bleach Ichigo Bankai', url: 'https://media.giphy.com/media/M13G8I98Kn846GESm3/giphy.gif', preview: 'https://media.giphy.com/media/M13G8I98Kn846GESm3/200.gif' }
];

export const ANIMEM_GIFS = POPULAR_ANIME_GIFS.map(g => g.url);

interface GifItem {
  id: string;
  title: string;
  url: string;
  preview: string;
}

const CATEGORIES = [
  { label: '🔥 Trend', query: 'anime trending' },
  { label: '⚔️ Jang', query: 'anime fight battle' },
  { label: '😂 Kulgi', query: 'anime funny laugh' },
  { label: '❤️ Sevgi', query: 'anime love heart blush' },
  { label: '😭 Yig\'i', query: 'anime sad cry' },
  { label: '✨ Wow', query: 'anime wow shock' },
  { label: '🐱 Chibi', query: 'anime chibi cute' },
  { label: '⭐ Qahramonlar', query: 'anime luffy naruto gojo' }
];

// Global in-memory cache for ultra-fast response
const globalGifCache = new Map<string, GifItem[]>();

interface GifPickerProps {
  onSelectGif: (gifUrl: string) => void;
  onClose?: () => void;
  className?: string;
}

export default function GifPicker({ onSelectGif, onClose, className = '' }: GifPickerProps) {
  const [activeCategory, setActiveCategory] = useState<string>('🔥 Trend');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [gifs, setGifs] = useState<GifItem[]>(() => globalGifCache.get('anime trending') || POPULAR_ANIME_GIFS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load GIFs based on search query or category
  useEffect(() => {
    let isCancelled = false;
    const rawQuery = debouncedQuery || (CATEGORIES.find(c => c.label === activeCategory)?.query || 'anime trending');
    const queryToFetch = rawQuery.toLowerCase().includes('anime') ? rawQuery : `anime ${rawQuery}`;

    if (globalGifCache.has(queryToFetch)) {
      setGifs(globalGifCache.get(queryToFetch)!);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const fetchGifs = async () => {
      // 1. Try Backend API endpoint
      try {
        const res = await fetch(`/api/gifs/giphy?q=${encodeURIComponent(queryToFetch)}&limit=36`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            if (!isCancelled) {
              setGifs(data);
              globalGifCache.set(queryToFetch, data);
              setIsLoading(false);
            }
            return;
          }
        }
      } catch (err) {
        // Backend proxy might be deploying, fallback to direct Giphy API
      }

      // 2. Direct Giphy Public SDK API Call (CORS Allowed, 100% Reliable globally)
      try {
        const GIPHY_KEY = 'sXpGFDGZs0Dv1mmNFvYaGUvYwKX0PWIh';
        const directUrl = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(queryToFetch)}&limit=36&rating=g`;
        const resDirect = await fetch(directUrl);
        if (resDirect.ok) {
          const gData = await resDirect.json();
          if (gData && Array.isArray(gData.data) && gData.data.length > 0) {
            const mapped: GifItem[] = gData.data.map((item: any) => ({
              id: item.id,
              title: item.title || 'Anime GIF',
              url: item.images?.downsized_medium?.url || item.images?.original?.url || item.images?.fixed_height?.url,
              preview: item.images?.fixed_height?.url || item.images?.fixed_width_small?.url || item.images?.original?.url,
            })).filter((x: any) => Boolean(x.url));

            if (mapped.length > 0 && !isCancelled) {
              setGifs(mapped);
              globalGifCache.set(queryToFetch, mapped);
              setIsLoading(false);
              return;
            }
          }
        }
      } catch (directErr) {
        console.warn('Direct Giphy fetch notice:', directErr);
      }

      // 3. Fallback to rich curated anime GIFs list
      if (!isCancelled) {
        setGifs(POPULAR_ANIME_GIFS);
        setIsLoading(false);
      }
    };

    fetchGifs();

    return () => {
      isCancelled = true;
    };
  }, [debouncedQuery, activeCategory]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.96 }}
      transition={{ duration: 0.16 }}
      className={`bg-[#0d0d12]/98 border border-[#ff006a]/40 rounded-2xl shadow-2xl overflow-hidden w-80 sm:w-96 flex flex-col z-50 select-none backdrop-blur-2xl shadow-black/95 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-[#08080b]/90 border-b border-white/10 px-3.5 py-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="px-2 py-0.5 rounded bg-gradient-to-r from-[#ff006a] to-[#a855f7] text-white font-black text-[10px] tracking-wider shadow-sm shadow-[#ff006a]/40">
            GIPHY
          </div>
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#ff006a]" />
            Anime GIF Stikerlar
          </span>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="Yopish"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Search Input Bar */}
      <div className="p-2.5 pb-1 bg-[#0a0a0e] border-b border-white/5 shrink-0">
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-3.5 h-3.5 text-white/40 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Anime GIF qidirish (luffy, naruto, gojo, funny...)"
            className="w-full bg-[#14141a] border border-white/10 focus:border-[#ff006a]/60 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-white/40 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                if (searchInputRef.current) searchInputRef.current.focus();
              }}
              className="absolute right-2.5 p-1 text-white/40 hover:text-white cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Quick Category Chips */}
        {!searchQuery && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-2 custom-scrollbar no-scrollbar text-[11px]">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.label;
              return (
                <button
                  key={cat.label}
                  type="button"
                  onClick={() => setActiveCategory(cat.label)}
                  className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer text-[11px] shrink-0 ${
                    isActive
                      ? 'bg-[#ff006a] text-white shadow-sm shadow-[#ff006a]/30 scale-[1.02]'
                      : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/5'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* GIFs Grid */}
      <div className="p-2 max-h-72 sm:max-h-80 overflow-y-auto custom-scrollbar grid grid-cols-3 sm:grid-cols-4 gap-1.5 bg-[#07070a] relative min-h-[220px]">
        {isLoading ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 space-y-2 text-white/50">
            <Loader2 className="w-6 h-6 animate-spin text-[#ff006a]" />
            <span className="text-[11px] font-medium">Anime GIFlar yuklanmoqda...</span>
          </div>
        ) : gifs.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 space-y-1 text-white/40 text-center">
            <span className="text-xs">GIF topilmadi</span>
            <span className="text-[10px] text-white/30">Boshqa so'z bilan qidirib ko'ring</span>
          </div>
        ) : (
          gifs.map((gif, idx) => (
            <button
              key={`${gif.id}_${idx}`}
              type="button"
              onClick={() => {
                setSelectedIdx(idx);
                onSelectGif(gif.url);
              }}
              className={`group relative aspect-square rounded-xl overflow-hidden bg-[#14141c] border transition-all duration-150 cursor-pointer flex items-center justify-center p-0.5 hover:scale-105 active:scale-95 ${
                selectedIdx === idx
                  ? 'border-[#ff006a] ring-2 ring-[#ff006a]/40 bg-[#ff006a]/15'
                  : 'border-white/10 hover:border-[#ff006a]/70 hover:shadow-lg hover:shadow-[#ff006a]/20'
              }`}
              title={gif.title}
            >
              <img
                src={gif.preview || gif.url}
                alt={gif.title || `Anime GIF ${idx + 1}`}
                className="w-full h-full object-cover rounded-lg pointer-events-none group-hover:scale-110 transition-transform duration-200"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/100x100?text=GIF';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))
        )}
      </div>

      {/* Footer Info */}
      <div className="px-3.5 py-1.5 bg-[#08080b] border-t border-white/5 flex items-center justify-between text-[10px] text-white/40 shrink-0">
        <span className="flex items-center gap-1.5">
          <Flame size={12} className="text-[#ff006a]" />
          <span className="text-white/60 font-semibold">Giphy Anime</span>
        </span>
        <span className="text-[9px] text-white/30">Tanlash uchun bosing</span>
      </div>
    </motion.div>
  );
}
