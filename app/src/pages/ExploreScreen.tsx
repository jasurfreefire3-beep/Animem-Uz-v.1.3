import React, { useState, useEffect } from 'react';
import { Search, X, SlidersHorizontal, LayoutGrid, List } from 'lucide-react';
import { Anime, SITE_GENRES, animeMatchesGenre } from '../types';
import { fetchAnimes } from '../services/api';
import { AnimeCard } from '../components/AnimeCard';

export const ExploreScreen: React.FC = () => {
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeGenre, setActiveGenre] = useState<string>('Barchasi');
  const [viewMode, setViewMode] = useState<'grid' | 'wide'>('grid');
  const [sortBy, setSortBy] = useState<'rating' | 'newest' | 'views'>('rating');

  useEffect(() => {
    fetchAnimes().then(setAnimes);
  }, []);

  const filtered = animes.filter((anime) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch = !q ||
      anime.title.toLowerCase().includes(q) ||
      (anime.title_uz && anime.title_uz.toLowerCase().includes(q)) ||
      (anime.title_en && anime.title_en.toLowerCase().includes(q)) ||
      (anime.title_orig && anime.title_orig.toLowerCase().includes(q)) ||
      (anime.janrlar && anime.janrlar.toString().toLowerCase().includes(q));

    const matchesGenre = animeMatchesGenre(anime, activeGenre);

    return matchesSearch && matchesGenre;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'rating') return Number(b.rating || 0) - Number(a.rating || 0);
    if (sortBy === 'newest') return Number(b.release_year || b.yil || 0) - Number(a.release_year || a.yil || 0);
    if (sortBy === 'views') return Number(b.views || b.korishlar || b.views_count || 0) - Number(a.views || a.korishlar || a.views_count || 0);
    return 0;
  });

  return (
    <div className="space-y-4 px-4 pt-3">
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <Search size={18} className="absolute left-3.5 text-white/40 pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Anime nomi, janr yoki personaj..."
          className="w-full h-12 bg-[#0f1016] border border-white/10 focus:border-[#ff006a] rounded-2xl pl-11 pr-10 text-white placeholder-white/40 text-xs focus:outline-none transition-all shadow-inner"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            aria-label="Tozalash"
            className="absolute right-3.5 text-white/40 hover:text-white"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Website Synchronized Genre Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {SITE_GENRES.map((g) => (
          <button
            key={g}
            onClick={() => setActiveGenre(g)}
            className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeGenre === g
                ? 'bg-[#ff006a] text-white shadow-[0_0_10px_#ff006a]'
                : 'bg-white/5 text-white/50 hover:text-white border border-white/5'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Sort & View Mode Toolbar */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5 text-xs text-white/50">
          <SlidersHorizontal size={13} />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-transparent text-white/80 font-bold focus:outline-none cursor-pointer"
          >
            <option value="rating" className="bg-[#0f1016]">Reyting bo'yicha</option>
            <option value="newest" className="bg-[#0f1016]">Yangi chiqqanlar</option>
            <option value="views" className="bg-[#0f1016]">Ko'p ko'rilganlar</option>
          </select>
        </div>

        <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10">
          <button
            onClick={() => setViewMode('grid')}
            aria-label="Kataklar ko'rinishi"
            className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-[#ff006a] text-white' : 'text-white/40'}`}
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={() => setViewMode('wide')}
            aria-label="Keng ro'yxat ko'rinishi"
            className={`p-1.5 rounded transition-colors ${viewMode === 'wide' ? 'bg-[#ff006a] text-white' : 'text-white/40'}`}
          >
            <List size={14} />
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-[11px] text-white/40 font-mono">
        {sorted.length} ta anime topildi
      </div>

      {/* Grid or Wide List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-3 gap-2.5">
          {sorted.map((anime) => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((anime) => (
            <AnimeCard key={anime.id} anime={anime} size="wide" />
          ))}
        </div>
      )}

      {sorted.length === 0 && (
        <div className="py-16 text-center space-y-3">
          <p className="text-white/40 text-xs">Ushbu so'rov bo'yicha hech qanday anime topilmadi.</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setActiveGenre('Barchasi');
            }}
            className="text-xs text-[#ff006a] font-bold underline"
          >
            Filtrni tozalash
          </button>
        </div>
      )}
    </div>
  );
};
