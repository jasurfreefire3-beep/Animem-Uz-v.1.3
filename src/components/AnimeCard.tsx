import React, { memo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Anime, toSlug } from '../types';
import { Star, Play, Eye } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { prefetchAnimeDetails, isImagePreloaded, markImageLoaded } from '../utils/imageOptimizer';

// Global cache of successfully loaded poster URLs in this session.
// Once an image loads, we remember it so scrolling back up never unloads or re-evaluates it!
const loadedImageCache = new Set<string>();

interface AnimeCardProps {
  anime: Anime;
  showBadge?: string; // Optional badge e.g. "Yangi", "TOP 1"
}

function AnimeCard({ anime, showBadge }: AnimeCardProps) {
  const { getLocalizedPath } = useLanguage();
  const episodeCount = Number(anime.qismlar_soni) || 1;
  const isMultiEpisode = episodeCount >= 2;
  const slug = toSlug(anime.title) || String(anime.id);
  const targetPath = getLocalizedPath(`/anime/${slug}`);
  const targetUrl = `https://animem.uz/anime/${slug}`;

  const isAlreadyLoaded = loadedImageCache.has(anime.image_url) || isImagePreloaded(anime.image_url);
  const [loaded, setLoaded] = useState(isAlreadyLoaded);

  const handleImageLoad = useCallback(() => {
    if (anime.image_url) {
      loadedImageCache.add(anime.image_url);
      markImageLoaded(anime.image_url);
    }
    setLoaded(true);
  }, [anime.image_url]);

  const handleWarmup = useCallback(() => {
    prefetchAnimeDetails(slug);
  }, [slug]);

  return (
    <Link
      to={targetPath}
      title={`${anime.title} - O'zbek tilida ko'rish`}
      onMouseEnter={handleWarmup}
      onTouchStart={handleWarmup}
      onFocus={handleWarmup}
      className="group relative block focus:outline-none select-none transform-gpu"
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: '240px 380px'
      }}
    >
      {/* Outer Bright Luminous Anime Frame (Crisp, High Contrast, Vibrant) */}
      <div className="relative p-[2px] rounded-2xl bg-gradient-to-b from-white/35 via-white/10 to-[#ff006a]/40 group-hover:from-[#ff006a] group-hover:via-[#ff006a] group-hover:to-purple-500 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.6)] group-hover:shadow-[0_0_30px_rgba(255,0,106,0.55)] group-hover:scale-[1.02]">
        
        {/* Inner Card Canvas with tall cinematic aspect ratio */}
        <div className="relative aspect-[2/3] overflow-hidden rounded-[14px] bg-[#0c0d14]">
          {/* Instant dark placeholder skeleton while image loads */}
          {!loaded && !isAlreadyLoaded && (
            <div className="absolute inset-0 bg-gradient-to-tr from-[#0a0b12] via-[#151724] to-[#0c0d16] animate-pulse pointer-events-none" />
          )}

          {/* Crisp, Vivid Poster Image (Loaded once, stays in memory and sw cache forever) */}
          <img
            src={anime.image_url}
            alt={`${anime.title} - ${targetUrl}`}
            title={`${anime.title} - Animem.uz`}
            loading={isAlreadyLoaded || loaded ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={showBadge ? "high" : "auto"}
            onLoad={handleImageLoad}
            className={`w-full h-full object-cover brightness-105 contrast-[1.06] group-hover:scale-106 transition-transform duration-500 ease-out ${
              loaded || isAlreadyLoaded ? 'opacity-100' : 'opacity-90'
            }`}
          />

          {/* Minimal Bottom Shadow for Badge Contrast (Preserves 90% image clarity) */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none opacity-70 group-hover:opacity-40 transition-opacity" />

          {/* Bright Luminous Frame Corner Accents */}
          <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-white/80 group-hover:border-[#ff006a] rounded-tl-sm transition-colors duration-300 pointer-events-none drop-shadow-[0_0_4px_rgba(255,255,255,0.6)]" />
          <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-white/80 group-hover:border-[#ff006a] rounded-tr-sm transition-colors duration-300 pointer-events-none drop-shadow-[0_0_4px_rgba(255,255,255,0.6)]" />
          <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-white/80 group-hover:border-[#ff006a] rounded-bl-sm transition-colors duration-300 pointer-events-none drop-shadow-[0_0_4px_rgba(255,255,255,0.6)]" />
          <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-white/80 group-hover:border-[#ff006a] rounded-br-sm transition-colors duration-300 pointer-events-none drop-shadow-[0_0_4px_rgba(255,255,255,0.6)]" />

          {/* Hover Play Button Overlay with Pulse Glow */}
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="w-13 h-13 bg-gradient-to-tr from-[#ff006a] to-[#ff4081] rounded-full flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300 shadow-[0_0_25px_rgba(255,0,106,0.8)] border-2 border-white">
              <Play className="w-6 h-6 text-white fill-current ml-0.5" />
            </div>
          </div>

          {/* Episode Count Badge */}
          <div className="absolute bottom-2.5 left-2.5 bg-[#ff006a] text-white text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-md shadow-lg border border-white/25 tracking-wider">
            {isMultiEpisode ? `EP ${episodeCount}` : 'FILM / 1 QISM'}
          </div>

          {/* Rating Badge */}
          {anime.rating && (
            <div className="absolute top-2.5 left-2.5 bg-black/85 text-white text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 border border-yellow-500/40 shadow-lg">
              <Star className="w-3 h-3 text-yellow-400 fill-current" />
              {Number(anime.rating).toFixed(1)}
            </div>
          )}

          {/* Custom Tag Badge if provided */}
          {showBadge && (
            <div className="absolute top-2.5 right-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 text-black text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-lg border border-emerald-300/40">
              {showBadge}
            </div>
          )}
        </div>
      </div>

      {/* Anime Title */}
      <h3 className="text-white font-bold text-xs sm:text-sm md:text-base line-clamp-1 group-hover:text-[#ff006a] transition-colors mt-2.5 px-1">
        {anime.title}
      </h3>

      {/* Footer metadata */}
      <div className="flex justify-between items-center text-[11px] text-white/50 mt-1 font-mono px-1">
        <span className="flex items-center gap-1 group-hover:text-white/80 transition-colors">
          <Eye className="w-3.5 h-3.5 text-[#ff006a]" /> {anime.korishlar || 0}
        </span>
        <span className="text-white/60">{anime.yil || 'Noma\'lum'}</span>
      </div>
    </Link>
  );
}

export default memo(AnimeCard);
