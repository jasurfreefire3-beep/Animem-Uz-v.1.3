import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Flame, Search, Loader2 } from 'lucide-react';

export const ANIMEM_GIFS = [
  "https://api.animem.uz/i/47253226-8c0c-4bd7-8a13-63fc8ab21048",
  "https://api.animem.uz/i/024daac2-c373-46d9-a1d3-17b772cf9d8d",
  "https://api.animem.uz/i/7f001189-caff-4761-b773-1ef852ba3405",
  "https://api.animem.uz/i/e14ebcc6-3198-4769-988e-b532d768c2c0",
  "https://api.animem.uz/i/a6740e1b-8128-4a35-9b59-991702aa7953",
  "https://api.animem.uz/i/20275072-6bcb-4bbf-9c31-b963c535ca52",
  "https://api.animem.uz/i/7f56e16a-336f-40e7-a088-3e7d379b6e7e",
  "https://api.animem.uz/i/e013bbda-731b-4243-b1a5-82b9184e6ba8",
  "https://api.animem.uz/i/0ed4d485-ed9a-42c4-96cf-0ea9e2520ff8",
  "https://api.animem.uz/i/4dcca4bb-4a81-40ee-b12d-1584b122bc20",
  "https://api.animem.uz/i/ee473d3e-95c5-4654-ab79-0f7f80bf72ac",
  "https://api.animem.uz/i/94bf66ce-7403-4a2f-8db6-267f15cd3d73",
  "https://api.animem.uz/i/d5740534-37b6-42f2-92d1-0d6012f7b424",
  "https://api.animem.uz/i/d6702c5f-a45e-4259-b3ac-6ac028671136",
  "https://api.animem.uz/i/863cae92-7e12-46d6-96c5-cf6da96afa43",
  "https://api.animem.uz/i/11e32365-a5d1-44b8-9eaf-809040de5fc3",
  "https://api.animem.uz/i/7c9b7e12-2d75-418a-b867-2a83169b9143",
  "https://api.animem.uz/i/b0000dc1-622a-4136-b20d-c7464b2dfee3",
  "https://api.animem.uz/i/f29d2f0f-4eed-43e3-8a18-c68acf9703f2",
  "https://api.animem.uz/i/ebb32df7-d609-46fa-a739-57b686bea1a4",
  "https://api.animem.uz/i/6ad422b0-29ff-4c44-b3bd-30e6015701ae",
  "https://api.animem.uz/i/d5077661-9cde-4524-ae21-be259f1e8b8a",
  "https://api.animem.uz/i/423b7231-db98-41e6-ae1e-af0ded6ca0ef",
  "https://api.animem.uz/i/cfae88fb-ade5-495c-a441-5b800075382b",
  "https://api.animem.uz/i/6b895206-f186-4db0-9a82-89ad97769806",
  "https://api.animem.uz/i/088aba4e-b0ef-443b-b7a6-bf6b8609e2b4",
  "https://api.animem.uz/i/208c0d15-d9cb-4507-ac51-814423a11d59",
  "https://api.animem.uz/i/632296a9-9ef1-453a-ac08-9db0aebdfc8c"
];

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
  { label: '⭐ Maxsus', query: 'animem_curated' }
];

// Global in-memory cache for fast display
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
  const [gifs, setGifs] = useState<GifItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load GIFs based on search query or category
  useEffect(() => {
    let isCancelled = false;
    const queryToFetch = debouncedQuery 
      ? debouncedQuery 
      : (CATEGORIES.find(c => c.label === activeCategory)?.query || 'anime trending');

    if (queryToFetch === 'animem_curated') {
      const staticItems: GifItem[] = ANIMEM_GIFS.map((url, i) => ({
        id: `animem_${i}`,
        title: `Animem GIF #${i + 1}`,
        url,
        preview: url
      }));
      setGifs(staticItems);
      setIsLoading(false);
      return;
    }

    if (globalGifCache.has(queryToFetch)) {
      setGifs(globalGifCache.get(queryToFetch)!);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    const fetchGifs = async () => {
      try {
        const res = await fetch(`/api/gifs/giphy?q=${encodeURIComponent(queryToFetch)}&limit=32`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            if (!isCancelled) {
              setGifs(data);
              globalGifCache.set(queryToFetch, data);
            }
            return;
          }
        }
      } catch (err) {
        console.warn('Giphy fetch error:', err);
      }

      // Fallback to static list if fetch failed
      if (!isCancelled && (!gifs || gifs.length === 0)) {
        const staticItems: GifItem[] = ANIMEM_GIFS.map((url, i) => ({
          id: `animem_${i}`,
          title: `Animem GIF #${i + 1}`,
          url,
          preview: url
        }));
        setGifs(staticItems);
      }
      if (!isCancelled) {
        setIsLoading(false);
      }
    };

    fetchGifs().finally(() => {
      if (!isCancelled) setIsLoading(false);
    });

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
