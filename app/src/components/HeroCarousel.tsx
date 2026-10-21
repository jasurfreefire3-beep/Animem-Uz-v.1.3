import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Plus, Check, Star, Sparkles } from 'lucide-react';
import { Anime } from '../types';
import { useAuth } from '../context/AuthContext';

interface HeroCarouselProps {
  animes: Anime[];
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({ animes }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();
  const { toggleFavorite, isFavorite } = useAuth();

  const featured = animes.slice(0, 5);

  useEffect(() => {
    if (featured.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featured.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [featured.length]);

  if (!featured.length) return null;

  const current = featured[currentIndex];
  const fav = isFavorite(current.id);

  return (
    <div className="relative w-full aspect-[4/5] sm:aspect-[16/10] overflow-hidden rounded-3xl mx-auto max-w-md shadow-[0_16px_40px_rgba(0,0,0,0.8)] border border-white/10 group">
      {/* Background Image / Poster */}
      <img
        src={current.banner_url || current.poster_url}
        alt={current.title}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />

      {/* Cyber/Dark Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#07070a] via-[#07070a]/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#07070a]/80 via-transparent to-transparent" />

      {/* Top Floating Badge */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <span className="bg-[#ff006a]/90 backdrop-blur-md text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-[0_0_15px_rgba(255,0,106,0.6)] flex items-center gap-1">
          <Sparkles size={11} /> TOP TREND
        </span>
        {current.type && (
          <span className="bg-black/60 backdrop-blur-md text-white/90 border border-white/15 text-[10px] font-bold px-2 py-1 rounded-full">
            {current.type}
          </span>
        )}
      </div>

      {/* Bottom Content Area */}
      <div className="absolute bottom-0 inset-x-0 p-5 space-y-3 z-10">
        {/* Rating and Genre Row */}
        <div className="flex items-center gap-2.5 text-xs">
          <div className="flex items-center gap-1 bg-amber-500/20 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded-lg font-black text-[11px]">
            <Star size={12} className="fill-amber-400" />
            <span>{current.rating || '9.5'}</span>
          </div>

          <span className="text-white/40">•</span>
          <span className="text-white/70 font-semibold">{current.release_year || '2024'}</span>
          <span className="text-white/40">•</span>

          <span className="text-[#00dfd8] font-bold text-[11px] truncate max-w-[140px]">
            {Array.isArray(current.genres) ? current.genres.slice(0, 2).join(', ') : (current.genres || "Anime")}
          </span>
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-md line-clamp-2">
          {current.title}
        </h2>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-1">
          {/* Watch Now Button */}
          <button
            onClick={() => navigate(`/watch/${current.id}?ep=1`)}
            className="flex-1 bg-gradient-to-r from-[#ff006a] to-[#7928ca] hover:from-[#ff006a]/90 hover:to-[#7928ca]/90 text-white font-black text-xs uppercase tracking-wider py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,0,106,0.5)] active:scale-95 transition-all"
          >
            <Play size={16} className="fill-white" />
            <span>Tomosha qilish</span>
          </button>

          {/* Add to List / Favorite Button */}
          <button
            onClick={() => toggleFavorite(current.id)}
            className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all active:scale-90 ${
              fav
                ? 'bg-[#ff006a]/20 border-[#ff006a] text-[#ff006a] shadow-[0_0_15px_rgba(255,0,106,0.4)]'
                : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
            }`}
            aria-label="Sevimlilarga qo'shish"
          >
            {fav ? <Check size={18} /> : <Plus size={18} />}
          </button>
        </div>

        {/* Dots Pagination */}
        <div className="flex items-center justify-center gap-1.5 pt-2">
          {featured.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentIndex
                  ? 'w-6 bg-[#ff006a] shadow-[0_0_8px_#ff006a]'
                  : 'w-1.5 bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
