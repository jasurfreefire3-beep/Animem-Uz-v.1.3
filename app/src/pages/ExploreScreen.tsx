import React, { useState, useEffect } from 'react';
import { Search, X, SlidersHorizontal, LayoutGrid, List } from 'lucide-react';
import { Anime } from '../types';
import { fetchAnimes } from '../services/api';
import { AnimeCard } from '../components/AnimeCard';

export const ExploreScreen: React.FC = () => {
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeGenre, setActiveGenre] = useState<string>('Hammasi');
  const [viewMode, setViewMode] = useState<'grid' | 'wide'>('grid');
  const [sortBy, setSortBy] = useState<'rating' | 'newest' | 'views'>('rating');

  useEffect(() => {
    fetchAnimes().then(setAnimes);
  }, []);

  const genres = ['Hammasi', 'Ekshn', 'Fentezi', 'Shonen', 'Drama', 'Komediya', 'Harbiy', 'Triller'];

  const filtered = animes.filter((anime) => {
    const matchesSearch =
      anime.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (anime.original_title && anime.original_title.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesGenre =
      activeGenre === 'Hammasi' ||
      (Array.isArray(anime.genres)
        ? anime.genres.includes(activeGenre)
        : (anime.genres && anime.genres.includes(activeGenre)));

    return matchesSearch && matchesGenre;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'rating') return Number(b.rating || 0) - Number(a.rating || 0);
    if (sortBy === 'newest') return Number(b.release_year || 0) - Number(a.release_year || 0);
    if (sortBy === 'views') return Number(b.views_count || 0) - Number(a.views_count || 0);
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
          placeholder="Anime nomi, personaj yoki janr..."
          className="w-full h-12 bg-[#0f1016] border border-white/10 focus:border-[#ff006a] rounded-2xl pl-11 pr-10 text-white placeholder-white/40 text-xs focus:outline-none transition-all shadow-inner"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3.5 text-white/40 hover:text-white"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Genre Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {genres.map((g) => (
          <button
            key={g}
            onClick={() => setActiveGenre(g)}
            className={`shrink-0 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
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
            <option value="rating" className="bg-[#0f1016]">⭐ Eng yuqori reyting</option>
            <option value="newest" className="bg-[#0f1016]">🕒 Eng yangilari</option>
            <option value="views" className="bg-[#0f1016]">🔥 Eng ko'p ko'rilgan</option>
          </select>
        </div>

        <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-[#ff006a] text-white' : 'text-white/40'}`}
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={() => setViewMode('wide')}
            className={`p-1.5 rounded ${viewMode === 'wide' ? 'bg-[#ff006a] text-white' : 'text-white/40'}`}
          >
            <List size={14} />
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-[11px] text-white/40 font-mono">
        {sorted.length} ta natija topildi
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
          <p className="text-white/40 text-xs">Hech qanday anime topilmadi.</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setActiveGenre('Hammasi');
            }}
            className="text-xs text-[#ff006a] font-bold underline"
          >
            Qidiruvni tozalash
          </button>
        </div>
      )}
    </div>
  );
};
