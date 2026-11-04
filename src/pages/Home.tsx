import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Anime } from '../types';
import { Star, Clock, Eye } from 'lucide-react';
import AnimeCard from '../components/AnimeCard';
import HeroBanner from '../components/HeroBanner';
import EmaCommentsBoard from '../components/EmaCommentsBoard';
import AdsterraNativeBanner from '../components/AdsterraNativeBanner';
import { getSocketUrl } from '../lib/api';

export default function Home() {
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

  useEffect(() => {
    document.title = "Animem Uz - O'zbekistondagi eng yirik anime portali";
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchHomeData = async () => {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

      try {
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

  const displayBanners = useMemo(() => {
    const banners = animes.filter(a => a.is_banner);
    return banners.length > 0 ? banners : animes.slice(0, 6);
  }, [animes]);

  const newAnimes = useMemo(() => {
    return [...animes]
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 12);
  }, [animes]);

  const mostViewedAnimes = useMemo(() => {
    return [...animes]
      .sort((a, b) => (b.korishlar || 0) - (a.korishlar || 0))
      .slice(0, 12);
  }, [animes]);

  const mostRatedAnimes = useMemo(() => {
    return [...animes]
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 12);
  }, [animes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-[#ff006a] border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(255,0,106,0.5)]" />
      </div>
    );
  }

  return (
    <div className="w-full pb-20">
      {/* Cinematic Hero Banner Carousel (Isolated state so 6s timer never re-renders the rest of the page) */}
      {displayBanners.length > 0 && (
        <HeroBanner banners={displayBanners} />
      )}

      {/* Edge-to-Edge Main Content Layout with Large Impactful Anime Cards */}
      <div className="relative z-20 w-full bg-[#060609] pt-4 sm:pt-8">
        <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 md:px-10 lg:px-12 space-y-12 sm:space-y-16">
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

        {/* Adsterra Native Recommendation Banner */}
        <section className="w-full my-2 sm:my-4">
          <AdsterraNativeBanner />
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
  </div>
  );
}
