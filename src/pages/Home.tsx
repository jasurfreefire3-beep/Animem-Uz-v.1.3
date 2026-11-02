import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Anime, toSlug } from '../types';
import { Star, PlayCircle, Calendar, Play, Clock, Grid, MessageSquare, ChevronLeft, ChevronRight, TrendingUp, Info, Eye, Film, Flame, Sparkles, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AnimeCard from '../components/AnimeCard';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import UserAvatar from '../components/UserAvatar';
import { getSocketUrl } from '../lib/api';
import EmaCommentsBoard from '../components/EmaCommentsBoard';

export default function Home() {
  const { user } = useAuth();
  const { getLocalizedPath } = useLanguage();
  
  // Instant fast-load from cache if available
  const [animes, setAnimes] = useState<Anime[]>(() => {
    try {
      const cached = sessionStorage.getItem('cached_home_animes');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [recentComments, setRecentComments] = useState<any[]>(() => {
    try {
      const cached = sessionStorage.getItem('cached_home_comments');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => {
    try {
      return !sessionStorage.getItem('cached_home_animes');
    } catch {
      return true;
    }
  });
  const [loadingComments, setLoadingComments] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);

  useEffect(() => {
    document.title = "Animem Uz - O'zbekistondagi eng yirik anime portali";
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchHomeData = async () => {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

      try {
        // Parallel independent fetching: each section renders the instant its data arrives!
        fetch(`${API_BASE}/api/animes`)
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (isMounted && Array.isArray(data)) {
              setAnimes(data);
              setLoading(false);
              try { sessionStorage.setItem('cached_home_animes', JSON.stringify(data)); } catch {}
            }
          })
          .catch(() => isMounted && setLoading(false));

        fetch(`${API_BASE}/api/comments/recent`)
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (isMounted && Array.isArray(data)) {
              setRecentComments(data);
              setLoadingComments(false);
              try { sessionStorage.setItem('cached_home_comments', JSON.stringify(data)); } catch {}
            }
          })
          .catch(() => isMounted && setLoadingComments(false));
      } catch (err) {
        console.warn("Home fast fetch note:", err);
        if (isMounted) {
          setLoading(false);
          setLoadingComments(false);
        }
      }
    };

    fetchHomeData();

    const socketUrl = getSocketUrl();
    const socket = io(socketUrl);
    socket.on('contentUpdated', () => {
      fetchHomeData();
    });

    return () => { 
      isMounted = false; 
      socket.disconnect();
    };
  }, []);

  const bannerAnimes = animes.filter(a => a.is_banner);
  const displayBanners = bannerAnimes.length > 0 ? bannerAnimes : animes.slice(0, 6);
  const [isHovered, setIsHovered] = useState(false);

  const handleNextBanner = useCallback(() => {
    if (displayBanners.length <= 1) return;
    setBannerIndex(prev => (prev + 1) % displayBanners.length);
  }, [displayBanners.length]);

  const handlePrevBanner = useCallback(() => {
    if (displayBanners.length <= 1) return;
    setBannerIndex(prev => (prev - 1 + displayBanners.length) % displayBanners.length);
  }, [displayBanners.length]);

  useEffect(() => {
    if (displayBanners.length <= 1 || isHovered) return;
    const interval = setInterval(() => {
      setBannerIndex(prev => (prev + 1) % displayBanners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [displayBanners.length, isHovered]);

  const newAnimes = [...animes].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 10);
  const mostViewedAnimes = [...animes].sort((a, b) => (b.korishlar || 0) - (a.korishlar || 0)).slice(0, 10);
  const mostRatedAnimes = [...animes].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 10);

  if (loading) {
     return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-12 h-12 border-4 border-[#ff006a] border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(255,0,106,0.5)]" />
        </div>
     );
  }

  const featuredAnime = displayBanners[bannerIndex] || displayBanners[0];

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
    <div className="w-full pb-20">
      {/* Cinematic Netflix / Crunchyroll Full-Width Full-Screen Hero Banner */}
      {featuredAnime && (
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
                className="w-full h-full object-cover object-top sm:object-center lg:object-[center_20%] brightness-105 contrast-[1.05]"
              />
            </motion.div>
          </AnimatePresence>

          {/* Multi-Directional Gradient Masks (Crisp and transparent on mobile, protects artwork clarity) */}
          {/* 1. Desktop Left Gradient (Only active on md+ screens so phone artwork is never washed out) */}
          <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-[#060609] via-[#060609]/80 via-50% to-transparent pointer-events-none z-[1]" />
          
          {/* 2. Bottom Fade to Black (Smooth transition behind bottom-aligned text & into page) */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/85 via-45% md:via-25% to-transparent pointer-events-none z-[1]" />
          
          {/* 3. Top Vignette (navbar blend) */}
          <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-[#060609]/80 to-transparent pointer-events-none z-[1]" />
          
          {/* 4. Ambient Glow Accent */}
          <div className="hidden sm:block absolute left-10 top-1/3 w-96 h-96 rounded-full bg-[#ff006a]/15 blur-[140px] pointer-events-none z-[1]" />

          {/* Hero Content Box (Anchored nicely towards bottom on mobile) */}
          <div className="relative z-10 max-w-2xl lg:max-w-3xl space-y-2.5 sm:space-y-4 pt-0 pb-2 sm:pb-4">
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

            {/* Row 2: Title (Refined, stylish, not oversized) */}
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

            {/* Row 4: Interactive Action Buttons (Touch-friendly for phones) */}
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

          {/* Bottom Right: Mini-Thumbnails Carousel & Controls */}
          {displayBanners.length > 1 && (
            <div className="mt-2.5 sm:mt-0 sm:absolute sm:bottom-6 sm:right-6 lg:bottom-12 lg:right-14 z-20 flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2.5 pointer-events-auto w-full sm:w-auto">
              {/* Thumbnail Cards Row (Visible on tablet and desktop) */}
              <div className="hidden sm:flex items-center gap-2.5 overflow-x-auto max-w-full pb-1 custom-scrollbar">
                {displayBanners.slice(0, 5).map((anime, idx) => {
                  const isActive = idx === bannerIndex;
                  return (
                    <button
                      key={anime.id}
                      type="button"
                      onClick={() => setBannerIndex(idx)}
                      className={`relative group/thumb rounded-xl overflow-hidden cursor-pointer transition-all duration-300 w-16 sm:w-20 md:w-24 aspect-[16/10] shrink-0 border ${
                        isActive
                          ? 'border-[#ff006a] ring-2 ring-[#ff006a]/70 shadow-[0_0_20px_rgba(255,0,106,0.6)] scale-105'
                          : 'border-white/15 opacity-60 hover:opacity-100 hover:scale-102 hover:border-white/40'
                      }`}
                    >
                      <img
                        src={anime.banner_url || anime.image_url}
                        alt={anime.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                      <span className="absolute bottom-1 left-1.5 right-1.5 text-[9px] font-extrabold text-white truncate text-left drop-shadow">
                        {anime.title}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Progress Bar & Arrow Controls (Ultra sleek on all screen sizes) */}
              <div className="flex items-center gap-2 sm:gap-3 bg-black/70 backdrop-blur-md border border-white/10 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-lg">
                {/* Previous Button */}
                <button
                  type="button"
                  onClick={handlePrevBanner}
                  className="p-1 hover:bg-white/10 text-white/70 hover:text-white rounded-full transition-colors cursor-pointer"
                  title="Oldingi"
                >
                  <ChevronLeft size={15} />
                </button>

                {/* Progress Indicators */}
                <div className="flex items-center gap-1 sm:gap-1.5">
                  {displayBanners.slice(0, 5).map((_, idx) => (
                    <span
                      key={idx}
                      onClick={() => setBannerIndex(idx)}
                      className={`h-1 sm:h-1.5 rounded-full transition-all cursor-pointer ${
                        idx === bannerIndex
                          ? 'w-5 sm:w-6 bg-[#ff006a] shadow-[0_0_8px_#ff006a]'
                          : 'w-1 sm:w-1.5 bg-white/30 hover:bg-white/60'
                      }`}
                    />
                  ))}
                </div>

                {/* Counter */}
                <span className="text-[9px] sm:text-[10px] font-mono text-white/50 px-1">
                  0{bannerIndex + 1} / 0{Math.min(5, displayBanners.length)}
                </span>

                {/* Next Button */}
                <button
                  type="button"
                  onClick={handleNextBanner}
                  className="p-1 hover:bg-white/10 text-white/70 hover:text-white rounded-full transition-colors cursor-pointer"
                  title="Keyingi"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edge-to-Edge Main Content Layout with Large Impactful Anime Cards */}
      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 md:px-10 lg:px-12 space-y-12 sm:space-y-16 mt-10 sm:mt-14">
        {/* Yangi qo'shilganlar */}
        <section>
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-2xl font-black text-white flex items-center gap-2 tracking-tight">
              <Clock className="w-5 h-5 text-[#ff006a]" />
              Yangi qo'shilganlar
            </h2>
            <Link to="/animelar" className="text-xs sm:text-sm font-bold text-white/60 hover:text-[#ff006a] transition-colors">
              Barchasini ko'rish →
            </Link>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4 md:gap-5.5">
            {newAnimes.map((anime) => (
              <AnimeCard key={`new-${anime.id}`} anime={anime} />
            ))}
          </div>
        </section>

        {/* Eng ko'p ko'rilganlar */}
        <section>
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-2xl font-black text-white flex items-center gap-2 tracking-tight">
              <Eye className="w-5 h-5 text-[#ff006a]" />
              Eng ko'p ko'rilganlar
            </h2>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4 md:gap-5.5">
            {mostViewedAnimes.map((anime) => (
              <AnimeCard key={`viewed-${anime.id}`} anime={anime} />
            ))}
          </div>
        </section>

        {/* Eng ko'p baholanganlar */}
        <section>
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-2xl font-black text-white flex items-center gap-2 tracking-tight">
              <Star className="w-5 h-5 text-[#ff006a]" />
              Eng ko'p baholanganlar
            </h2>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4 md:gap-5.5">
            {mostRatedAnimes.map((anime) => (
              <AnimeCard key={`rated-${anime.id}`} anime={anime} />
            ))}
          </div>
        </section>

        {/* Japanese Ema Shrine Hanging Comments Board (絵馬掛け) - At the very bottom */}
        <EmaCommentsBoard comments={recentComments} loading={loadingComments} />
      </div>
    </div>
  );
}
