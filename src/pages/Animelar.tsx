import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Anime, translateGenre, getEnglishGenre, toSlug } from '../types';
import { Star, Play, Grid, List, Film, Eye, Search, X, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import AnimeCard from '../components/AnimeCard';
import LoadingScreen from '../components/LoadingScreen';
import { getSocketUrl } from '../lib/api';
import { prefetchImages } from '../utils/imageOptimizer';

// Generous responsive batch sizes so the grid is fully filled edge-to-edge
const getBatchSize = () => {
  if (typeof window !== 'undefined') {
    if (window.innerWidth < 640) return 12; // Mobile (2 cols): 6 full rows = 12 items
    if (window.innerWidth < 1024) return 18; // Tablet (3-4 cols): 18 items
    return 24; // Desktop (5-6 cols): 4 full rows = 24 items
  }
  return 24;
};

export default function Animelar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const genreFilter = searchParams.get('genre') || '';
  const searchFilter = searchParams.get('search') || '';

  const [animes, setAnimes] = useState<Anime[]>(() => {
    try {
      const cached = localStorage.getItem('cached_home_animes') || sessionStorage.getItem('cached_home_animes');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          prefetchImages(parsed.slice(0, 30).map((a: any) => a.image_url));
          return parsed;
        }
      }
      return [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => {
    try {
      return !(localStorage.getItem('cached_home_animes') || sessionStorage.getItem('cached_home_animes'));
    } catch {
      return true;
    }
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [localSearch, setLocalSearch] = useState(searchFilter);
  const [visibleCount, setVisibleCount] = useState<number>(getBatchSize);

  useEffect(() => {
    setLocalSearch(searchFilter);
  }, [searchFilter]);

  // Reset pagination when genre or search query changes
  useEffect(() => {
    setVisibleCount(getBatchSize());
  }, [genreFilter, searchFilter]);

  useEffect(() => {
    if (genreFilter && genreFilter !== 'Barchasi') {
      document.title = `${genreFilter} animelar - O'zbek tilida ko'rish | Animem.uz`;
    } else if (searchFilter) {
      document.title = `"${searchFilter}" qidiruvi - Animem.uz`;
    } else {
      document.title = "Barcha Animelar - O'zbek tilida tomosha qilish | Animem.uz";
    }
  }, [genreFilter, searchFilter]);

  useEffect(() => {
    let isMounted = true;
    const fetchAnimes = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
        const res = await fetch(`${API_BASE}/api/animes`);
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          const data = await res.json();
          if (isMounted) {
            setAnimes(data);
            try {
              localStorage.setItem('cached_home_animes', JSON.stringify(data));
              sessionStorage.setItem('cached_home_animes', JSON.stringify(data));
            } catch {}
            prefetchImages(data.slice(0, 30).map(a => a.image_url));
          }
        }
        if (isMounted) setLoading(false);
      } catch (err) {
        console.error("Error fetching animes:", err);
        if (isMounted) setLoading(false);
      }
    };
    fetchAnimes();

    const socketUrl = getSocketUrl();
    const socket = io(socketUrl);
    socket.on('contentUpdated', (data: any) => {
      if (!data || data.type === 'anime' || data.type === 'all') {
        fetchAnimes();
      }
    });

    return () => { 
      isMounted = false; 
      socket.disconnect();
    };
  }, []);

  const genres = [
    'Barchasi',
    'Action',
    'Adventure',
    'Comedy',
    'Drama',
    'Fantasy',
    'Horror',
    'Romance',
    'Sci-Fi',
    'Slice of Life',
    'Supernatural',
  ];

  // Enhanced Filtering logic
  const filteredAnimes = animes.filter((anime) => {
    let matchesGenre = true;
    if (genreFilter && genreFilter !== 'Barchasi') {
      const engFilter = getEnglishGenre(genreFilter).toLowerCase();
      const uzbFilter = translateGenre(genreFilter).toLowerCase();
      const animeJanrlar = anime.janrlar ? anime.janrlar.toLowerCase() : '';
      matchesGenre = animeJanrlar.includes(engFilter) || animeJanrlar.includes(uzbFilter);
    }

    let matchesSearch = true;
    if (searchFilter.trim()) {
      const q = searchFilter.trim().toLowerCase();
      const title = (anime.title || '').toLowerCase();
      const desc = (anime.description || '').toLowerCase();
      const janrlar = (anime.janrlar || '').toLowerCase();
      const tags = (anime.tags || '').toLowerCase();
      matchesSearch = title.includes(q) || desc.includes(q) || janrlar.includes(q) || tags.includes(q);
    }

    return matchesGenre && matchesSearch;
  });

  const handleGenreSelect = (genre: string) => {
    if (genre === 'Barchasi') {
      searchParams.delete('genre');
    } else {
      searchParams.set('genre', genre);
    }
    setSearchParams(searchParams);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearch.trim()) {
      searchParams.set('search', localSearch.trim());
    } else {
      searchParams.delete('search');
    }
    setSearchParams(searchParams);
  };

  const clearSearch = () => {
    setLocalSearch('');
    searchParams.delete('search');
    setSearchParams(searchParams);
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + getBatchSize());
  };

  const visibleAnimes = filteredAnimes.slice(0, visibleCount);
  const hasMore = visibleCount < filteredAnimes.length;

  if (loading) {
    return <LoadingScreen size="lg" />;
  }

  return (
    <div className="w-full space-y-8 sm:space-y-10 pb-20 select-none">
      {/* 1. Header with Title, Stats & Filter Controls - 100% Frosted Glass */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 p-4 sm:p-6 bg-black/40 backdrop-blur-xl border border-white/15 rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight flex items-center gap-2.5 text-white">
            <Film className="w-6 h-6 sm:w-7 sm:h-7 text-[#ff006a]" />
            {searchFilter ? (
              <span>Qidiruv: <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff006a] to-[#a855f7]">"{searchFilter}"</span></span>
            ) : genreFilter ? (
              `${translateGenre(genreFilter)} Animelar`
            ) : (
              'Barcha Animelar'
            )}
          </h1>
          <p className="text-white/50 text-xs sm:text-sm mt-1 font-medium">
            Katalogda jami {filteredAnimes.length} ta anime mavjud {filteredAnimes.length > visibleCount && `(${visibleAnimes.length} tasi ko'rsatilmoqda)`}
          </p>
        </div>

        {/* Search input + Grid/List View Toggles */}
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative min-w-[200px] sm:min-w-[280px]">
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Katalogdan qidirish..."
              className="w-full bg-white/[0.08] hover:bg-white/[0.12] border border-white/20 focus:border-[#ff006a] text-white text-xs sm:text-sm rounded-2xl pl-4 pr-10 py-2.5 font-bold placeholder:text-white/40 focus:outline-none backdrop-blur-md transition-all shadow-inner"
            />
            {localSearch ? (
              <button type="button" onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            ) : (
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-[#ff006a] cursor-pointer">
                <Search size={16} />
              </button>
            )}
          </form>

          {/* Grid / List Toggles */}
          <div className="flex items-center gap-1.5 p-1 bg-white/[0.06] backdrop-blur-md border border-white/10 rounded-2xl shadow-sm">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                viewMode === 'grid' 
                  ? 'bg-gradient-to-r from-[#ff006a] to-[#a855f7] text-white shadow-[0_0_12px_rgba(255,0,106,0.5)] scale-105' 
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              title="Katak ko'rinishi"
            >
              <Grid size={17} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                viewMode === 'list' 
                  ? 'bg-gradient-to-r from-[#ff006a] to-[#a855f7] text-white shadow-[0_0_12px_rgba(255,0,106,0.5)] scale-105' 
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              title="Ro'yxat ko'rinishi"
            >
              <List size={17} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Genre Filter Pills Bar - 100% Frosted Glass */}
      <div className="p-2 sm:p-2.5 bg-black/35 backdrop-blur-xl border border-white/15 rounded-2xl shadow-md flex flex-wrap gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
        {genres.map((g) => {
          const isActive = genreFilter === g || (g === 'Barchasi' && !genreFilter);
          return (
            <button
              key={g}
              onClick={() => handleGenreSelect(g)}
              className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-black transition-all cursor-pointer select-none ${
                isActive
                  ? 'bg-gradient-to-r from-[#ff006a] to-[#a855f7] text-white border border-white/30 shadow-[0_0_15px_rgba(255,0,106,0.6)] scale-105'
                  : 'bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/70 hover:text-white backdrop-blur-md'
              }`}
            >
              {translateGenre(g)}
            </button>
          );
        })}
      </div>

      {/* 3. Empty State */}
      {filteredAnimes.length === 0 && (
        <div className="text-center py-20 bg-black/40 backdrop-blur-xl border border-white/15 rounded-3xl space-y-4 shadow-2xl">
          <Film className="w-14 h-14 text-white/30 mx-auto" />
          <h3 className="text-xl font-black text-white">Hech narsa topilmadi</h3>
          <p className="text-white/50 text-sm max-w-sm mx-auto">
            Siz kiritgan so'rov bo'yicha hech qanday anime topilmadi. Boshqa janr yoki kalit so'zni tanlab ko'ring.
          </p>
          <button
            onClick={() => setSearchParams({})}
            className="bg-gradient-to-r from-[#ff006a] to-[#a855f7] text-white text-xs font-black px-6 py-2.5 rounded-xl shadow-lg hover:scale-105 transition-all cursor-pointer"
          >
            Filtrlarni tozalash
          </button>
        </div>
      )}

      {/* 4. Large Edge-to-Edge Anime Grid (Like Home Page) */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4 md:gap-5.5">
          {visibleAnimes.map((anime) => (
            <AnimeCard key={`anime-${anime.id}`} anime={anime} />
          ))}
        </div>
      ) : (
        /* List View with Glass Cards */
        <div className="space-y-3.5">
          {visibleAnimes.map((anime) => (
            <div
              key={`anime-list-${anime.id}`}
              className="bg-black/40 backdrop-blur-xl border border-white/15 p-3.5 sm:p-4 rounded-2xl flex gap-3.5 sm:gap-4 hover:border-[#ff006a]/50 hover:shadow-[0_8px_30px_rgba(255,0,106,0.2)] transition-all group"
            >
              {/* Thumbnail with luminous border */}
              <Link to={`/anime/${toSlug(anime.title) || anime.id}`} title={anime.title} className="w-20 sm:w-28 aspect-[2/3] shrink-0 block group/item">
                <div className="w-full h-full p-[2px] rounded-xl bg-gradient-to-b from-white/35 via-white/10 to-[#ff006a]/40 group-hover/item:from-[#ff006a] group-hover/item:to-purple-500 transition-all duration-300 shadow-md">
                  <div className="w-full h-full rounded-[10px] overflow-hidden bg-[#0c0d14] relative">
                    <img 
                      loading="lazy" 
                      decoding="async" 
                      src={anime.image_url} 
                      alt={anime.title} 
                      title={anime.title}
                      className="w-full h-full object-cover brightness-105 contrast-[1.06] group-hover/item:scale-106 transition-transform duration-300" 
                    />
                    <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-white/80 group-hover/item:border-[#ff006a] rounded-tl-sm pointer-events-none transition-colors" />
                    <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-white/80 group-hover/item:border-[#ff006a] rounded-br-sm pointer-events-none transition-colors" />
                  </div>
                </div>
              </Link>

              {/* Info Column */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                <div>
                  <div className="flex items-center gap-2">
                    <Link to={`/anime/${toSlug(anime.title) || anime.id}`} className="text-white font-black text-sm sm:text-base md:text-lg truncate group-hover:text-[#ff006a] transition-colors">
                      {anime.title}
                    </Link>
                    {anime.rating && (
                      <span className="flex items-center gap-1 text-yellow-400 font-black text-[10px] sm:text-[11px] px-2 py-0.5 bg-black/60 border border-yellow-500/30 rounded-lg">
                        <Star className="w-3 h-3 fill-current" /> {Number(anime.rating).toFixed(1)}
                      </span>
                    )}
                  </div>
                  <p className="text-white/60 text-xs sm:text-sm line-clamp-2 mt-1.5 leading-relaxed font-medium">
                    {anime.description}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-white/50 mt-2 font-mono">
                  <span>HOLATI: <span className="text-[#ff006a] font-bold">{anime.holati?.toUpperCase() || 'NOMA\'LUM'}</span></span>
                  <span>|</span>
                  <span>YIL: <span className="text-white/80">{anime.yil || 'Noma\'lum'}</span></span>
                  <span>|</span>
                  <span>QISMLAR: <span className="text-white/80">{anime.qismlar_soni || 1} ta</span></span>
                  <span>|</span>
                  <span className="flex items-center gap-1">KO'RISHLAR: <span className="text-white/80 flex items-center gap-0.5"><Eye className="w-3.5 h-3.5 text-[#ff006a]" /> {anime.korishlar || 0}</span></span>
                </div>
              </div>

              {/* Action Button */}
              <div className="hidden sm:flex items-center shrink-0 pr-2">
                <Link
                  to={`/anime/${toSlug(anime.title) || anime.id}`}
                  className="bg-gradient-to-r from-[#ff006a] to-[#7928ca] hover:opacity-95 text-white text-xs font-black uppercase tracking-wider px-5 py-3 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-[#ff006a]/25 hover:scale-105 active:scale-95"
                >
                  <Play size={13} className="fill-current" /> Tomosha
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Centered Glass Load More Button */}
      {hasMore && (
        <div className="flex justify-center pt-8 pb-4">
          <button
            onClick={handleLoadMore}
            className="group inline-flex items-center gap-3 px-8 sm:px-10 py-3.5 sm:py-4 bg-black/40 hover:bg-gradient-to-r hover:from-[#ff006a] hover:to-[#a855f7] text-white text-xs sm:text-sm font-black uppercase tracking-wider rounded-2xl border border-white/20 hover:border-white/40 shadow-2xl hover:shadow-[0_0_30px_rgba(255,0,106,0.5)] backdrop-blur-xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span>Ko'proq yuklash ({visibleAnimes.length} / {filteredAnimes.length})</span>
            <ChevronDown size={18} className="text-[#ff006a] group-hover:text-white group-hover:translate-y-0.5 transition-all duration-300" />
          </button>
        </div>
      )}
    </div>
  );
}
