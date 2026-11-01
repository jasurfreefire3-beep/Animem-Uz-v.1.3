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
    <div className="space-y-12 pb-20">
      {/* Cinematic Netflix / Crunchyroll Full-Width Hero Banner */}
      {featuredAnime && (
        <div 
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-[#060609] border border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.95)] min-h-[540px] sm:min-h-[580px] md:min-h-[620px] lg:min-h-[660px] flex flex-col justify-end p-5 sm:p-8 md:p-12 lg:p-14 group"
        >
          {/* Animated Background Image with Ken Burns Zoom & Smooth Crossfade */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`bg-${featuredAnime.id}`}
              initial={{ opacity: 0, scale: 1.07 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 w-full h-full pointer-events-none"
            >
              <img
                src={featuredAnime.banner_url || featuredAnime.image_url}
                alt={featuredAnime.title}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="w-full h-full object-cover object-center lg:object-[center_25%]"
              />
            </motion.div>
          </AnimatePresence>

          {/* Cinematic Vignettes and Multi-Directional Gradient Masks */}
          {/* 1. Heavy Left Gradient (protects text legibility) */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#060609] via-[#060609]/90 via-40% md:via-50% to-transparent pointer-events-none" />
          
          {/* 2. Bottom Fade to Black (seamless transition into page content) */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#060609] via-[#060609]/80 via-25% to-transparent pointer-events-none" />
          
          {/* 3. Top Vignette (navbar blend) */}
          <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#060609]/85 to-transparent pointer-events-none" />
          
          {/* 4. Ambient Neon Glow Accent behind title */}
          <div className="absolute left-6 top-1/4 w-80 h-80 rounded-full bg-[#ff006a]/20 blur-[130px] pointer-events-none" />

          {/* Left Hero Content Box */}
          <div className="relative z-10 max-w-2xl lg:max-w-3xl space-y-4 sm:space-y-5">
            {/* Row 1: Badges */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <span className="px-3 py-1 bg-gradient-to-r from-[#ff006a] to-[#a855f7] text-white text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(255,0,106,0.6)] flex items-center gap-1.5 animate-pulse">
                <Flame size={12} className="fill-current text-amber-300" />
                <span>#1 TRENDING</span>
              </span>

              {Boolean(featuredAnime.tavsiya) && (
                <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase tracking-wider rounded-full flex items-center gap-1 shadow-sm">
                  <Sparkles size={11} className="fill-current" />
                  <span>TAVSIYA</span>
                </span>
              )}

              <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/15 text-[11px] font-bold text-white shadow-sm">
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                <span>{featuredAnime.rating || '4.9'}</span>
                <span className="text-white/30">|</span>
                <span className="text-white/60 text-[10px] uppercase">IMDb</span>
              </div>

              <span className="px-2.5 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-bold text-white/90 border border-white/10 uppercase">
                {featuredAnime.holati || 'Tugallangan'}
              </span>

              <span className="px-2.5 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-black tracking-wide uppercase">
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
                transition={{ duration: 0.4 }}
                className="text-3xl sm:text-5xl md:text-6xl font-black leading-tight uppercase tracking-tight text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)]"
              >
                {renderTitle(featuredAnime.title)}
              </motion.h1>
            </AnimatePresence>

            {/* Row 3: Meta Info (Year, Studio, Episodes, Audio) */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold text-white/70">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#ff006a]" />
                <span>{featuredAnime.yil || '2024'}</span>
              </div>
              {featuredAnime.studiyasi && (
                <div className="flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-[#ff006a]" />
                  <span className="uppercase tracking-wider">{featuredAnime.studiyasi}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#ff006a]" />
                <span>{featuredAnime.qismlar_soni ? `${featuredAnime.qismlar_soni} Qism` : 'Barcha qismlar'}</span>
              </div>
              <span className="text-[#ff006a] font-extrabold uppercase tracking-wider text-[11px]">
                O'zbekcha Dublyaj
              </span>
            </div>

            {/* Row 4: Genre Chips */}
            {genresList.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {genresList.slice(0, 5).map((g, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 text-white/80 text-[11px] font-medium backdrop-blur-sm transition-colors"
                  >
                    #{g}
                  </span>
                ))}
              </div>
            )}

            {/* Row 5: Description with left neon border */}
            <div className="border-l-[3px] border-[#ff006a] pl-3.5 py-1">
              <p className="text-white/85 text-xs sm:text-sm leading-relaxed max-w-2xl font-medium line-clamp-3 drop-shadow">
                {featuredAnime.description}
              </p>
            </div>

            {/* Row 6: Interactive Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to={getLocalizedPath(`/anime/${toSlug(featuredAnime.title) || featuredAnime.id}`)}
                className="group/btn relative px-7 py-3 rounded-xl bg-gradient-to-r from-[#ff006a] to-[#7928ca] hover:opacity-95 text-white font-black flex items-center gap-2.5 shadow-[0_0_25px_rgba(255,0,106,0.45)] hover:shadow-[0_0_35px_rgba(255,0,106,0.7)] transition-all hover:scale-[1.03] active:scale-95 text-xs sm:text-sm uppercase tracking-wider cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover/btn:scale-110 transition-transform">
                  <Play className="w-3.5 h-3.5 fill-current text-white ml-0.5" />
                </div>
                <span>TOMOSHA QILISH</span>
              </Link>

              <Link
                to={getLocalizedPath(`/anime/${toSlug(featuredAnime.title) || featuredAnime.id}`)}
                className="px-5 py-3 rounded-xl bg-black/50 hover:bg-white/15 border border-white/15 hover:border-white/30 backdrop-blur-md text-white font-bold flex items-center gap-2 transition-all hover:scale-[1.02] text-xs sm:text-sm uppercase tracking-wider cursor-pointer"
              >
                <Info className="w-4 h-4 text-white/70" />
                <span>BATAFSIL</span>
              </Link>

              <Link
                to={getLocalizedPath('/sevimlilar')}
                className="p-3 rounded-xl bg-black/50 hover:bg-white/15 border border-white/15 hover:border-white/30 backdrop-blur-md text-white/80 hover:text-[#ff006a] transition-all hover:scale-[1.05] cursor-pointer"
                title="Sevimlilar ro'yxati"
              >
                <Heart className="w-4 h-4 fill-transparent hover:fill-current" />
              </Link>
            </div>
          </div>

          {/* Bottom Right: Mini-Thumbnails Carousel & Controls */}
          {displayBanners.length > 1 && (
            <div className="mt-8 sm:mt-0 sm:absolute sm:bottom-6 sm:right-6 lg:bottom-10 lg:right-10 z-20 flex flex-col items-end gap-3">
              {/* Thumbnail Cards Row */}
              <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 custom-scrollbar">
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

              {/* Progress Bar & Arrow Controls */}
              <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full shadow-lg">
                {/* Previous Button */}
                <button
                  type="button"
                  onClick={handlePrevBanner}
                  className="p-1 hover:bg-white/10 text-white/70 hover:text-white rounded-full transition-colors cursor-pointer"
                  title="Oldingi"
                >
                  <ChevronLeft size={16} />
                </button>

                {/* Progress Indicators */}
                <div className="flex items-center gap-1.5">
                  {displayBanners.slice(0, 5).map((_, idx) => (
                    <span
                      key={idx}
                      onClick={() => setBannerIndex(idx)}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        idx === bannerIndex
                          ? 'w-6 bg-[#ff006a] shadow-[0_0_8px_#ff006a]'
                          : 'w-1.5 bg-white/30 hover:bg-white/60'
                      }`}
                    />
                  ))}
                </div>

                {/* Counter */}
                <span className="text-[10px] font-mono text-white/50 px-1">
                  0{bannerIndex + 1} / 0{Math.min(5, displayBanners.length)}
                </span>

                {/* Next Button */}
                <button
                  type="button"
                  onClick={handleNextBanner}
                  className="p-1 hover:bg-white/10 text-white/70 hover:text-white rounded-full transition-colors cursor-pointer"
                  title="Keyingi"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Content Layout */}
      <div className="flex flex-col xl:flex-row gap-8">
        
        {/* Left Column (Main) */}
        <div className="flex-1 space-y-12 min-w-0">
          
          {/* Yangi qo'shilganlar */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#ff006a]" />
                Yangi qo'shilganlar
              </h2>
              <Link to="/animelar" className="text-xs font-medium text-white/50 hover:text-[#ff006a] transition-colors">Barchasini ko'rish</Link>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {newAnimes.map((anime, idx) => (
                <motion.div
                  key={`new-${anime.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <AnimeCard anime={anime} />
                </motion.div>
              ))}
            </div>
          </section>

          {/* Eng ko'p ko'rilganlar */}
          <section>
            <div className="flex items-center justify-between mb-4 mt-8">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-[#ff006a]" />
                Eng ko'p ko'rilganlar
              </h2>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {mostViewedAnimes.map((anime, idx) => (
                <motion.div
                  key={`viewed-${anime.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <AnimeCard anime={anime} />
                </motion.div>
              ))}
            </div>
          </section>

          {/* Eng ko'p baholanganlar */}
          <section>
            <div className="flex items-center justify-between mb-4 mt-8">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Star className="w-5 h-5 text-[#ff006a]" />
                Eng ko'p baholanganlar
              </h2>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {mostRatedAnimes.map((anime, idx) => (
                <motion.div
                  key={`rated-${anime.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <AnimeCard anime={anime} />
                </motion.div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column (Sidebar) */}
        <div className="w-full xl:w-[320px] shrink-0 space-y-6">
          
          {/* Community Chat Preview */}
          <div className="bg-[#111] border border-[#222] rounded-sm p-4">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-wide">
              <MessageSquare className="w-4 h-4 text-white/50"/> Eng So'nggi Fikrlar
            </h3>
            <div className="space-y-4">
               {loadingComments ? (
                 [
                   { anime_title: 'Yuklanmoqda...', user_name: 'tizim', content: 'Yuklanmoqda...', anime_id: '' }
                 ].map((c, i) => (
                   <div key={i} className="block bg-[#000] p-3 rounded-sm border border-[#222] opacity-50">
                     <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 rounded bg-[#333] flex items-center justify-center text-[9px] font-bold text-white uppercase">
                          L
                        </div>
                        <span className="text-white/30 text-[11px] font-medium">Yuklanmoqda...</span>
                     </div>
                   </div>
                 ))
               ) : recentComments.length === 0 ? (
                 <div className="text-center py-8 text-white/40 text-xs border border-[#222] bg-black/20 rounded-sm">
                   Fikrlar hozircha yo'q
                 </div>
               ) : (
                 recentComments.map((c, i) => {
                   const avatarSrc = c.user_avatar || c.avatar_url;
                   return (
                     <Link 
                       to={getLocalizedPath(`/anime/${toSlug(c.anime_title)}`)}
                       key={i} 
                       className="block group bg-[#000] p-3 rounded-sm border border-[#222] hover:border-[#ff006a]/30 transition-colors"
                     >
                       <div className="flex items-center gap-2 mb-2">
                          <UserAvatar
                            size="xs"
                            src={avatarSrc}
                            frameUrl={c.user_avatar_frame || c.avatar_frame_url}
                            name={c.user_name}
                          />
                          <span className="text-white/50 text-[11px] font-medium">{c.user_name}</span>
                       </div>
                       <div>
                         <p className="text-white/80 text-xs leading-relaxed group-hover:text-white transition-colors line-clamp-2">
                           {c.content?.includes('[gif]') || c.content?.includes('api.animem.uz/i/') ? (
                             <span className="text-[#ff006a] font-medium">
                               🎬 GIF stiker {c.content.replace(/\[gif\].*?\[\/gif\]/gi, '').trim()}
                             </span>
                           ) : (
                             c.content
                           )}
                         </p>
                         <span className="text-[#ff006a]/70 text-[10px] uppercase font-bold mt-2 block">{c.anime_title}</span>
                       </div>
                     </Link>
                   );
                 })
               )}
            </div>
            <Link to="/chat" className="mt-4 block w-full py-2.5 text-center text-xs font-bold text-white bg-[#222] hover:bg-[#333] rounded-sm transition-colors">
              Chatga qo'shilish
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
