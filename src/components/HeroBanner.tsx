import React, { useState, useEffect, memo } from 'react';
import { Link } from 'react-router-dom';
import { Anime, toSlug } from '../types';
import { Star, Calendar, Play, Clock, Film, Sparkles, Flame, Info, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';

interface HeroBannerProps {
  banners: Anime[];
}

function HeroBanner({ banners }: HeroBannerProps) {
  const { getLocalizedPath } = useLanguage();
  const [bannerIndex, setBannerIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const displayBanners = banners.length > 0 ? banners : [];
  const featuredAnime = displayBanners[bannerIndex] || displayBanners[0];

  useEffect(() => {
    if (displayBanners.length <= 1 || isHovered) return;
    const interval = setInterval(() => {
      setBannerIndex(prev => (prev + 1) % displayBanners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [displayBanners.length, isHovered]);

  if (!featuredAnime) return null;

  const renderTitle = (title: string) => {
    const upper = title.toUpperCase();
    if (upper.includes(':')) {
      const idx = upper.indexOf(':');
      const first = upper.slice(0, idx + 1);
      const rest = upper.slice(idx + 1);
      return (
        <>
          <span className="text-white">{first}</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff006a] to-[#a855f7]">{rest}</span>
        </>
      );
    } else {
      const words = upper.split(' ');
      if (words.length > 1) {
        return (
          <>
            <span className="text-white">{words[0]} </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff006a] to-[#a855f7]">{words.slice(1).join(' ')}</span>
          </>
        );
      }
      return <span className="text-white">{upper}</span>;
    }
  };

  const genresList = featuredAnime?.janrlar 
    ? featuredAnime.janrlar.split(',').map(g => g.trim()).filter(Boolean) 
    : [];

  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative w-full min-h-[100svh] h-[100svh] overflow-hidden bg-[#060609] border-b border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.95)] flex flex-col justify-end md:justify-center px-4 min-[400px]:px-6 sm:px-12 md:px-16 lg:px-24 py-8 group pt-20 sm:pt-24 md:pt-28 pb-20 min-[400px]:pb-24 sm:pb-28 md:pb-14 select-none"
    >
      {/* Animated Background Image with Ken Burns Zoom & Smooth Crossfade */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`bg-${featuredAnime.id}`}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          <img
            src={featuredAnime.banner_url || featuredAnime.image_url}
            alt={featuredAnime.title}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-cover object-top sm:object-center lg:object-[center_20%] brightness-110 contrast-[1.08] saturate-[1.12]"
          />
        </motion.div>
      </AnimatePresence>

      {/* Ultra-Slim Edge Blends Only (Never covers or dims the artwork, 100% bright & crisp everywhere) */}
      {/* 1. Subtle top shadow for navbar readability */}
      <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/50 to-transparent pointer-events-none z-[1]" />
      
      {/* 2. Slim bottom transition into page */}
      <div className="absolute bottom-0 inset-x-0 h-20 sm:h-28 bg-gradient-to-t from-[#060609] via-[#060609]/60 to-transparent pointer-events-none z-[1]" />

      {/* Hero Content Box with Sleek Glassmorphism (Protects artwork while keeping text 100% legible) */}
      <div className="relative z-10 max-w-2xl lg:max-w-3xl space-y-2.5 sm:space-y-4 p-3 min-[400px]:p-4 sm:p-6 rounded-3xl bg-black/40 backdrop-blur-md border border-white/15 shadow-[0_15px_45px_rgba(0,0,0,0.65)]">
        {/* Row 1: Badges */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="px-2.5 py-0.5 sm:px-3 sm:py-0.5 bg-gradient-to-r from-[#ff006a] to-[#a855f7] text-white text-[9px] sm:text-[11px] font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(255,0,106,0.6)] flex items-center gap-1.5 animate-pulse">
            <Flame size={11} className="fill-current text-amber-300" />
            <span>#1 TRENDING</span>
          </span>

          {Boolean(featuredAnime.tavsiya) && (
            <span className="px-2 py-0.5 sm:px-2.5 sm:py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-full flex items-center gap-1 shadow-sm">
              <Sparkles size={10} className="fill-current" />
              <span>TAVSIYA</span>
            </span>
          )}

          <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/15 text-[10px] sm:text-[11px] font-bold text-white shadow-sm">
            <Star className="w-3 h-3 text-yellow-400 fill-current" />
            <span>{featuredAnime.rating || '4.9'}</span>
            <span className="text-white/30">|</span>
            <span className="text-white/60 text-[9px] uppercase">IMDb</span>
          </div>

          <span className="px-2 py-0.5 sm:px-2.5 sm:py-0.5 bg-white/10 backdrop-blur-md rounded-full text-[9px] sm:text-[10px] font-bold text-white/90 border border-white/10 uppercase">
            {featuredAnime.holati || 'Tugallangan'}
          </span>

          <span className="px-2 py-0.5 sm:px-2.5 sm:py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full text-[9px] sm:text-[10px] font-black tracking-wide uppercase">
            HD 1080p
          </span>
        </div>

        {/* Row 2: Title */}
        <AnimatePresence mode="wait">
          <motion.h1
            key={`title-${featuredAnime.id}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35 }}
            className="text-xl min-[400px]:text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight uppercase tracking-tight text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)] line-clamp-2"
          >
            {renderTitle(featuredAnime.title)}
          </motion.h1>
        </AnimatePresence>

        {/* Row 3: Meta Info (Year, Studio, Episodes, Audio) & Genre Chips */}
        <div className="flex flex-wrap items-center gap-x-2.5 sm:gap-x-4 gap-y-1.5 text-[11px] sm:text-xs font-semibold text-white/70">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#ff006a]" />
            <span>{featuredAnime.yil || '2024'}</span>
          </div>
          {featuredAnime.studiyasi && (
            <div className="flex items-center gap-1.5">
              <Film className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#ff006a]" />
              <span className="uppercase tracking-wider truncate max-w-[130px] sm:max-w-none">{featuredAnime.studiyasi}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#ff006a]" />
            <span>{featuredAnime.qismlar_soni ? `${featuredAnime.qismlar_soni} Qism` : 'Barcha qismlar'}</span>
          </div>
          <span className="text-[#ff006a] font-extrabold uppercase tracking-wider text-[10px] sm:text-[11px]">
            O'zbekcha
          </span>

          {/* Genre Chips */}
          {genresList.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 pl-0 sm:pl-1">
              {genresList.slice(0, 3).map((g, idx) => (
                <span
                  key={idx}
                  className="px-1.5 sm:px-2 py-0.5 rounded-md bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 text-white/80 text-[9px] sm:text-[11px] font-medium backdrop-blur-sm transition-colors"
                >
                  #{g}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Row 4: Interactive Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1.5 sm:pt-2">
          <Link
            to={getLocalizedPath(`/anime/${toSlug(featuredAnime.title) || featuredAnime.id}`)}
            className="group/btn relative px-4 sm:px-7 py-2.5 sm:py-3.5 rounded-xl bg-gradient-to-r from-[#ff006a] to-[#7928ca] hover:opacity-95 text-white font-black flex items-center gap-2 sm:gap-2.5 shadow-[0_0_25px_rgba(255,0,106,0.5)] hover:shadow-[0_0_35px_rgba(255,0,106,0.8)] transition-all hover:scale-[1.03] active:scale-95 text-xs sm:text-sm uppercase tracking-wider cursor-pointer"
          >
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/20 flex items-center justify-center group-hover/btn:scale-110 transition-transform">
              <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current text-white ml-0.5" />
            </div>
            <span>TOMOSHA QILISH</span>
          </Link>

          <Link
            to={getLocalizedPath(`/anime/${toSlug(featuredAnime.title) || featuredAnime.id}`)}
            className="px-3.5 sm:px-5 py-2.5 sm:py-3.5 rounded-xl bg-black/60 hover:bg-white/15 border border-white/20 hover:border-white/40 backdrop-blur-md text-white font-bold flex items-center gap-1.5 sm:gap-2 transition-all hover:scale-[1.02] text-xs sm:text-sm uppercase tracking-wider cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/70" />
            <span>BATAFSIL</span>
          </Link>

          <Link
            to={getLocalizedPath('/sevimlilar')}
            className="p-2.5 sm:p-3.5 rounded-xl bg-black/60 hover:bg-white/15 border border-white/20 hover:border-white/40 backdrop-blur-md text-white/80 hover:text-[#ff006a] transition-all hover:scale-[1.05] cursor-pointer"
            title="Sevimlilar ro'yxati"
          >
            <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-transparent hover:fill-current" />
          </Link>
        </div>

        {/* Row 5: Description with left neon border */}
        <div className="border-l-[3px] border-[#ff006a] pl-2.5 sm:pl-3.5 py-0.5 sm:py-1">
          <p className="text-white/85 text-[11px] sm:text-sm leading-relaxed max-w-2xl font-medium line-clamp-2 sm:line-clamp-3 drop-shadow">
            {featuredAnime.description}
          </p>
        </div>
      </div>
    </div>
  );
}

export default memo(HeroBanner);

