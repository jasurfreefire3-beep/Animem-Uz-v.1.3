import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Play } from 'lucide-react';
import { Anime } from '../types';

interface AnimeCardProps {
  anime: Anime;
  size?: 'normal' | 'compact' | 'wide';
}

export const AnimeCard: React.FC<AnimeCardProps> = ({ anime, size = 'normal' }) => {
  const navigate = useNavigate();

  if (size === 'wide') {
    return (
      <div
        onClick={() => navigate(`/watch/${anime.id}?ep=1`)}
        className="flex items-center gap-3 p-2.5 rounded-2xl bg-[#0f1016]/80 hover:bg-[#151622] border border-white/5 hover:border-white/15 transition-all cursor-pointer group active:scale-[0.98]"
      >
        <div className="relative w-20 h-28 shrink-0 rounded-xl overflow-hidden shadow-lg">
          <img src={anime.poster_url} alt={anime.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-[#ff006a]/90 text-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity scale-75 group-hover:scale-100">
              <Play size={14} className="fill-white ml-0.5" />
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-[#ff006a] bg-[#ff006a]/10 px-1.5 py-0.5 rounded">
              {anime.type || 'TV'}
            </span>
            <div className="flex items-center gap-1 text-[11px] text-amber-400 font-bold">
              <Star size={11} className="fill-amber-400" />
              <span>{anime.rating || '9.0'}</span>
            </div>
          </div>
          <h4 className="text-sm font-bold text-white leading-snug line-clamp-2 group-hover:text-[#ff006a] transition-colors">
            {anime.title}
          </h4>
          <p className="text-[11px] text-white/50 truncate">
            {Array.isArray(anime.genres) ? anime.genres.join(', ') : (anime.genres || 'Anime')}
          </p>
          <div className="text-[10px] text-white/40 font-mono">
            {anime.total_episodes ? `${anime.total_episodes} qism` : 'Davom etmoqda'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => navigate(`/watch/${anime.id}?ep=1`)}
      className="group relative flex flex-col shrink-0 w-32 sm:w-36 cursor-pointer select-none active:scale-[0.97] transition-transform"
    >
      {/* Poster Container */}
      <div className="relative aspect-[3/4.2] w-full rounded-2xl overflow-hidden shadow-xl border border-white/5 group-hover:border-[#ff006a]/50 transition-all bg-[#12131b]">
        <img
          src={anime.poster_url}
          alt={anime.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Top Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
          {/* Quality / Dub Badge */}
          <span className="bg-black/70 backdrop-blur-md text-white text-[9px] font-black px-1.5 py-0.5 rounded-md border border-white/10 uppercase tracking-tighter">
            HD UZ
          </span>

          {/* Rating */}
          <div className="flex items-center gap-0.5 bg-black/75 backdrop-blur-md text-amber-400 text-[10px] font-black px-1.5 py-0.5 rounded-md border border-amber-400/30">
            <Star size={10} className="fill-amber-400" />
            <span>{anime.rating || '9.5'}</span>
          </div>
        </div>

        {/* Play Icon Overlay on Hover/Touch */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-[#ff006a] text-white flex items-center justify-center shadow-[0_0_20px_rgba(255,0,106,0.8)] scale-75 group-hover:scale-100 transition-transform">
            <Play size={18} className="fill-white ml-0.5" />
          </div>
        </div>

        {/* Bottom Episode Count Badge */}
        <div className="absolute bottom-2 left-2 right-2 pointer-events-none">
          <span className="inline-block bg-black/80 backdrop-blur-md text-white/90 text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-white/10 truncate max-w-full">
            {anime.total_episodes ? `${anime.total_episodes} qism` : 'Yangi qism'}
          </span>
        </div>
      </div>

      {/* Title & Metadata */}
      <div className="mt-2 space-y-0.5">
        <h3 className="text-xs font-bold text-white/90 group-hover:text-[#ff006a] leading-tight line-clamp-2 transition-colors">
          {anime.title}
        </h3>
        <p className="text-[10px] text-white/40 truncate">
          {Array.isArray(anime.genres) ? anime.genres[0] : (anime.genres || 'Anime')}
        </p>
      </div>
    </div>
  );
};
