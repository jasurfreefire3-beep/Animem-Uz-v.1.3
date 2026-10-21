import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Bookmark, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Anime, formatGenresList } from '../types';
import { useAuth } from '../context/AuthContext';

interface HeroCarouselProps {
  animes: Anime[];
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({ animes }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();
  const { toggleFavorite, isFavorite } = useAuth();
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Pick animes configured for banner or featured first
  const bannerList = React.useMemo(() => {
    if (!animes || animes.length === 0) return [];
    const banners = animes.filter(a => Boolean(a.is_banner) || Boolean(a.tavsiya) || Boolean(a.is_featured));
    return banners.length > 0 ? banners.slice(0, 6) : animes.slice(0, 5);
  }, [animes]);

  useEffect(() => {
    if (bannerList.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % bannerList.length);
    }, 6500);
    return () => clearInterval(interval);
  }, [bannerList.length]);

  if (!bannerList.length) return null;

  const current = bannerList[currentIndex];
  const fav = isFavorite(current.id);

  // Swipe support for mobile gesture feel
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        // Next
        setCurrentIndex((prev) => (prev + 1) % bannerList.length);
      } else {
        // Prev
        setCurrentIndex((prev) => (prev - 1 + bannerList.length) % bannerList.length);
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const bgImage = current.banner_url || current.image_url || current.poster_url;
  const dubLabel = current.dub_studio || current.voice_acting || "AnimemUz Dublyaj";
  const yearLabel = current.release_year || current.yil || "2024";
  const statusLabel = current.holati || current.status || "Yakunlangan";
  const genreText = formatGenresList(current.janrlar || current.genres);

  return (
    <div
      className="relative w-full aspect-[4/5] sm:aspect-[16/10] overflow-hidden rounded-3xl mx-auto max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.85)] border border-white/10 select-none group"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Anime Image */}
      <img
        key={current.id}
        src={bgImage}
        alt={current.title}
        className="w-full h-full object-cover object-top transition-transform duration-1000 ease-out group-hover:scale-105"
      />

      {/* Modern High-End Vignette Gradients (No child-like elements) */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#07070a] via-[#07070a]/65 to-black/20 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#07070a]/90 via-[#07070a]/30 to-transparent pointer-events-none" />

      {/* Top Status & Quality Badges (Clean, sleek, star-free) */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Studio Dub Badge */}
          <span className="bg-black/75 backdrop-blur-md text-[#00dfd8] border border-[#00dfd8]/30 text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-md">
            {dubLabel}
          </span>

          {/* Quality Badge */}
          <span className="bg-white/10 backdrop-blur-md text-white/90 border border-white/15 text-[10px] font-bold px-2 py-1 rounded-full">
            TAS-IX 1080p
          </span>
        </div>

        {/* Status Badge */}
        <span className="bg-black/60 backdrop-blur-md text-white/80 border border-white/10 text-[10px] font-medium px-2 py-0.5 rounded-full">
          {statusLabel}
        </span>
      </div>

      {/* Quick Navigation Arrows (Hover visible on desktop, swipe on mobile) */}
      {bannerList.length > 1 && (
        <>
          <button
            onClick={() => setCurrentIndex((prev) => (prev - 1 + bannerList.length) % bannerList.length)}
            aria-label="Oldingi banner"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/80 backdrop-blur-md border border-white/10 text-white/70 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity active:scale-90"
          >
            <ChevronLeft size={16} />
          </button>

          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % bannerList.length)}
            aria-label="Keyingi banner"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/80 backdrop-blur-md border border-white/10 text-white/70 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity active:scale-90"
          >
            <ChevronRight size={16} />
          </button>
        </>
      )}

      {/* Bottom Content Area */}
      <div className="absolute bottom-0 inset-x-0 p-5 space-y-3 z-10">
        {/* Clean Meta Row (Year, Studio, Genres - NO stars) */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-white/80 font-bold text-[11px] bg-white/10 px-2 py-0.5 rounded">
            {yearLabel}
          </span>

          <span className="text-white/40">•</span>

          <span className="text-white/80 font-semibold text-[11px] truncate max-w-[200px]">
            {genreText}
          </span>
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] line-clamp-2">
          {current.title}
        </h2>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-3 pt-1">
          {/* Watch Now Button */}
          <button
            onClick={() => navigate(`/watch/${current.id}?ep=1`)}
            className="flex-1 bg-gradient-to-r from-[#ff006a] to-[#7928ca] hover:from-[#ff006a]/90 hover:to-[#7928ca]/90 text-white font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(255,0,106,0.45)] active:scale-95 transition-all"
          >
            <Play size={16} className="fill-white" />
            <span>Tomosha qilish</span>
          </button>

          {/* Add to List / Favorite Button */}
          <button
            onClick={() => toggleFavorite(current.id)}
            className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all active:scale-90 ${
              fav
                ? 'bg-[#ff006a]/20 border-[#ff006a] text-[#ff006a] shadow-[0_0_15px_rgba(255,0,106,0.35)]'
                : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
            }`}
            aria-label="Sevimlilarga saqlash"
            title={fav ? "Saqlangan" : "Sevimlilarga saqlash"}
          >
            {fav ? <Check size={18} /> : <Bookmark size={18} />}
          </button>
        </div>

        {/* Clean Line Indicators (Modern streaming progress style) */}
        {bannerList.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-2">
            {bannerList.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Banner ${idx + 1}`}
                className={`h-1 rounded-full transition-all duration-300 ${
                  idx === currentIndex
                    ? 'w-7 bg-[#ff006a] shadow-[0_0_8px_#ff006a]'
                    : 'w-2 bg-white/25 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
