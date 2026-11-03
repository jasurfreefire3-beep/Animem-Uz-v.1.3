import React, { useState, useEffect, memo } from 'react';
import { Link } from 'react-router-dom';
import { Anime, toSlug, translateGenre } from '../types';
import { Play, Info, Heart, Pause, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';

interface HeroBannerProps {
  banners: Anime[];
}

let savedHeroBannerIndex = 0;

function HeroBanner({ banners }: HeroBannerProps) {
  const { getLocalizedPath } = useLanguage();
  const displayBanners = banners.length > 0 ? banners : [];

  // Persistent banner index across page reloads and route navigations
  const [bannerIndex, setBannerIndex] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const sessionVal = sessionStorage.getItem('animem_hero_banner_index');
    if (sessionVal !== null) {
      const parsed = parseInt(sessionVal, 10);
      if (Number.isFinite(parsed) && displayBanners.length > 0) {
        const next = (parsed + 1) % displayBanners.length;
        savedHeroBannerIndex = next;
        sessionStorage.setItem('animem_hero_banner_index', String(next));
        return next;
      }
    }
    return 0;
  });

  const [isHovered, setIsHovered] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  const featuredAnime = displayBanners[bannerIndex] || displayBanners[0];

  // Parallax Scroll Tracking: background moves slower, text & buttons scroll up naturally
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const updateSlide = (nextIndex: number) => {
    setBannerIndex(nextIndex);
    savedHeroBannerIndex = nextIndex;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('animem_hero_banner_index', String(nextIndex));
    }
  };

  // Auto-advance banner every 6 seconds, continuing sequentially
  useEffect(() => {
    if (displayBanners.length <= 1 || isHovered || isPaused) return;
    const interval = setInterval(() => {
      setBannerIndex(prev => {
        const next = (prev + 1) % displayBanners.length;
        savedHeroBannerIndex = next;
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('animem_hero_banner_index', String(next));
        }
        return next;
      });
    }, 6000);
    return () => clearInterval(interval);
  }, [displayBanners.length, isHovered, isPaused]);

  // Sync favorites state
  useEffect(() => {
    if (!featuredAnime) return;
    try {
      const saved = localStorage.getItem('anime_favorites');
      if (saved) {
        const list = JSON.parse(saved);
        setIsFavorited(list.some((id: any) => String(id) === String(featuredAnime.id)));
      } else {
        setIsFavorited(false);
      }
    } catch {
      setIsFavorited(false);
    }
  }, [featuredAnime]);

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!featuredAnime) return;
    try {
      const saved = localStorage.getItem('anime_favorites');
      let list = saved ? JSON.parse(saved) : [];
      const animeIdStr = String(featuredAnime.id);
      if (isFavorited) {
        list = list.filter((id: any) => String(id) !== animeIdStr);
        setIsFavorited(false);
      } else {
        list.push(featuredAnime.id);
        setIsFavorited(true);
      }
      localStorage.setItem('anime_favorites', JSON.stringify(list));
    } catch (err) {
      console.error(err);
    }
  };

  if (!featuredAnime) return null;

  const genresList = featuredAnime?.janrlar 
    ? featuredAnime.janrlar.split(',').map(g => g.trim()).filter(Boolean) 
    : [];

  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative w-full h-[88vh] md:h-[94vh] min-h-[580px] sm:min-h-[640px] overflow-hidden bg-[#060609] select-none flex flex-col justify-end"
    >
      {/* 1. Animated Parallax Background Artwork */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`bg-${featuredAnime.id}`}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          style={{
            transform: `translateY(${Math.min(scrollY * 0.42, 300)}px) scale(${1 + Math.min(scrollY * 0.00025, 0.07)})`
          }}
          className="absolute inset-0 w-full h-full pointer-events-none will-change-transform"
        >
          <img
            src={featuredAnime.banner_url || featuredAnime.image_url}
            alt={featuredAnime.title}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-cover object-top sm:object-center lg:object-[center_20%] brightness-100 contrast-100"
          />
        </motion.div>
      </AnimatePresence>

      {/* 2. Crystal Clear Cinematic Lighting (No heavy black fog or dimming) */}
      {/* Light soft gradient on left for text legibility without dimming the artwork */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 via-30% to-transparent pointer-events-none z-[2]" />
      
      {/* Top subtle shadow for navbar clarity */}
      <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-[2]" />
      
      {/* Bottom transition that lets content below glide seamlessly over the hero */}
      <div className="absolute bottom-0 inset-x-0 h-28 sm:h-36 bg-gradient-to-t from-[#060609] to-transparent pointer-events-none z-[2]" />

      {/* 3. Left-Aligned Foreground Content (Scrolls Up in Parallax) */}
      <div 
        style={{
          transform: `translateY(-${Math.min(scrollY * 0.28, 200)}px)`,
          opacity: Math.max(1 - scrollY / 550, 0)
        }}
        className="relative z-10 w-full max-w-3xl lg:max-w-4xl px-4 min-[400px]:px-6 sm:px-12 md:px-16 lg:px-20 pb-16 sm:pb-20 md:pb-24 will-change-transform"
      >
        {/* Row 1: Logo (if available) or Stylized Bold Typography */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`brand-${featuredAnime.id}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35 }}
            className="mb-3 sm:mb-4"
          >
            {featuredAnime.logo_url ? (
              <img
                src={featuredAnime.logo_url}
                alt={featuredAnime.title}
                className="h-24 sm:h-36 md:h-48 lg:h-56 max-w-[320px] sm:max-w-[480px] md:max-w-[620px] lg:max-w-[740px] object-contain object-left drop-shadow-[0_12px_40px_rgba(0,0,0,0.95)]"
              />
            ) : (
              <h1 
                style={{ 
                  color: featuredAnime.banner_title_color || '#ff2442',
                  fontFamily: featuredAnime.banner_title_font ? `'${featuredAnime.banner_title_font}', sans-serif` : "'Bebas Neue', sans-serif",
                  textShadow: `0 4px 35px ${featuredAnime.banner_title_color ? `${featuredAnime.banner_title_color}88` : 'rgba(255,36,66,0.65)'}, 0 2px 10px rgba(0,0,0,0.9)`
                }}
                className="text-4xl min-[400px]:text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black uppercase tracking-tight leading-[0.96] drop-shadow-[0_8px_30px_rgba(0,0,0,0.9)]"
              >
                {featuredAnime.title}
              </h1>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Row 2: Subtitle / Japanese/Original Name with Accent Bar */}
        <div className="flex items-center gap-2 mb-2 sm:mb-2.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
          <span className="w-1.5 h-3.5 sm:h-4.5 bg-[#ff006a] rounded-full inline-block shrink-0 shadow-[0_0_8px_#ff006a]" />
          <span className="text-white/90 font-bold text-xs sm:text-sm uppercase tracking-wider truncate max-w-lg drop-shadow">
            {featuredAnime.title}
          </span>
        </div>

        {/* Row 3: Metadata Line (Year • Type • Genres • Audio Flags) */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm text-white/90 font-semibold mb-3 sm:mb-3.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
          <span>{featuredAnime.yil || '2024'}</span>
          <span className="text-white/40">•</span>
          <span>Anime</span>
          {genresList.length > 0 && (
            <>
              <span className="text-white/40">•</span>
              <span>{genresList.slice(0, 3).map(g => translateGenre(g)).join(', ')}</span>
            </>
          )}

          {/* Audio Dub / Sub Flags */}
          <div className="flex items-center gap-1.5 ml-1">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/15 border border-white/25 text-[11px] shadow-sm select-none" title="O'zbek tilida dublyaj">
              🇺🇿
            </span>
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/15 border border-white/25 text-[11px] shadow-sm select-none" title="Inglizcha subtitr">
              🇬🇧
            </span>
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/15 border border-white/25 text-[11px] shadow-sm select-none" title="Original ovoz">
              🇯🇵
            </span>
          </div>
        </div>

        {/* Row 4: Short Description */}
        <p className="text-white/90 text-xs sm:text-sm md:text-base leading-relaxed max-w-xl line-clamp-2 sm:line-clamp-3 mb-5 sm:mb-6 drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] font-medium">
          {featuredAnime.description}
        </p>

        {/* Row 5: Action Buttons */}
        <div className="flex items-center gap-3 drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
          {/* Primary Watch Button: White Pill with Black Play Icon */}
          <Link
            to={getLocalizedPath(`/anime/${toSlug(featuredAnime.title) || featuredAnime.id}`)}
            className="px-6 sm:px-8 py-3 sm:py-3.5 rounded-full bg-white hover:bg-white/90 text-black font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2.5 shadow-[0_10px_35px_rgba(255,255,255,0.25)] hover:shadow-[0_12px_45px_rgba(255,255,255,0.4)] transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
          >
            <Play className="w-4 h-4 fill-black text-black shrink-0 ml-0.5" />
            <span>Tomosha qilish</span>
          </Link>

          {/* Favorite Button: Dark Pill / Circle */}
          <button
            type="button"
            onClick={handleToggleFavorite}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border transition-all flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 cursor-pointer shrink-0 ${
              isFavorited
                ? 'bg-[#ff006a] border-[#ff006a] text-white shadow-[0_0_20px_rgba(255,0,106,0.5)]'
                : 'bg-black/60 hover:bg-black/80 border-white/20 hover:border-white/40 text-white'
            }`}
            title={isFavorited ? "Sevimlilardan o'chirish" : "Sevimlilarga saqlash"}
          >
            <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current text-white' : 'text-white'}`} />
          </button>

          {/* Details / Info Button */}
          <Link
            to={getLocalizedPath(`/anime/${toSlug(featuredAnime.title) || featuredAnime.id}`)}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 hover:border-white/40 text-white flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95 cursor-pointer shrink-0"
            title="Batafsil ma'lumot"
          >
            <Info className="w-5 h-5 text-white/80" />
          </Link>
        </div>
      </div>

      {/* 4. Bottom-Right Slide Indicator & Controller */}
      <div className="absolute bottom-6 sm:bottom-8 right-4 sm:right-10 md:right-16 z-20 flex items-center gap-2">
        <div className="bg-black/60 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-2xl">
          {/* Pause / Play toggle */}
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className="w-6 h-6 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
            title={isPaused ? "Slaydni davom ettirish" : "Slaydni to'xtatib turish"}
          >
            {isPaused ? <Play size={12} className="fill-current ml-0.5" /> : <Pause size={12} className="fill-current" />}
          </button>

          {/* Dash & Dot Indicators */}
          <div className="flex items-center gap-1.5 px-1">
            {displayBanners.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => updateSlide(idx)}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  idx === bannerIndex 
                    ? 'w-6 h-1.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' 
                    : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/80'
                }`}
                title={`${idx + 1}-slayd`}
              />
            ))}
          </div>

          {/* Quick Arrow Controls */}
          <div className="flex items-center gap-0.5 border-l border-white/15 pl-1.5">
            <button
              type="button"
              onClick={() => updateSlide((bannerIndex - 1 + displayBanners.length) % displayBanners.length)}
              className="w-6 h-6 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              title="Oldingi slayd"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => updateSlide((bannerIndex + 1) % displayBanners.length)}
              className="w-6 h-6 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              title="Keyingi slayd"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(HeroBanner);
