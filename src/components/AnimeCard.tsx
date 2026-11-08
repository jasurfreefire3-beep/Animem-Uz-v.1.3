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
      {/* Outer Apple iOS Liquid Glass Anime Frame */}
      <div className="relative p-[1.5px] rounded-[22px] bg-gradient-to-b from-white/28 via-white/8 to-white/12 group-hover:from-white/50 group-hover:via-[#ff006a]/40 group-hover:to-purple-500/40 shadow-[0_10px_28px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.25)] group-hover:shadow-[0_16px_40px_rgba(255,0,106,0.35),0_0_24px_rgba(255,255,255,0.15)] group-hover:scale-[1.025] transition-all duration-300 ease-out">
        
        {/* Inner Card Canvas with tall cinematic aspect ratio & continuous squircle corners */}
        <div className="relative aspect-[2/3] overflow-hidden rounded-[20.5px] bg-[#0c0d16]">
          {/* Instant dark placeholder skeleton while image loads */}
          {!loaded && !isAlreadyLoaded && (
            <div className="absolute inset-0 bg-gradient-to-tr from-[#0a0b12] via-[#151724] to-[#0c0d16] pointer-events-none" />
          )}

          {/* Crisp, Vivid Poster Image */}
          <img
            src={anime.image_url}
            alt={`${anime.title} - ${targetUrl}`}
            title={`${anime.title} - Animem.uz`}
            loading={isAlreadyLoaded || loaded ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={showBadge ? "high" : "auto"}
            onLoad={handleImageLoad}
            className={`w-full h-full object-cover brightness-105 contrast-[1.05] group-hover:scale-106 transition-transform duration-500 ease-out ${
              loaded || isAlreadyLoaded ? 'opacity-100' : 'opacity-90'
            }`}
          />

          {/* Soft Liquid Glass Ambient Glare Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/20 pointer-events-none opacity-80 group-hover:opacity-40 transition-opacity" />

          {/* Hover Play Button: Liquid Glass Specular Disc */}
          <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="w-12 h-12 bg-white/25 rounded-full flex items-center justify-center transform scale-75 group-hover:scale-100 transition-all duration-300 shadow-[0_8px_32px_rgba(255,0,106,0.6),inset_0_1px_1px_rgba(255,255,255,0.6)] border border-white/40">
              <Play className="w-5 h-5 text-white fill-current ml-0.5" />
            </div>
          </div>

          {/* Episode Count Badge: iOS Frosted Glass Pill */}
          <div className="absolute bottom-2.5 left-2.5 bg-[#07080e]/85 border border-white/20 text-white text-[10px] sm:text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-lg tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff006a] animate-pulse shadow-[0_0_6px_#ff006a]" />
            <span>{isMultiEpisode ? `EP ${episodeCount}` : 'FILM / 1 QISM'}</span>
          </div>

          {/* Rating Badge: iOS Frosted Glass Pill */}
          {anime.rating && (
            <div className="absolute top-2.5 left-2.5 bg-[#07080e]/85 text-white text-[10px] sm:text-[11px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-white/20 shadow-lg">
              <Star className="w-3 h-3 text-yellow-400 fill-current" />
              <span>{Number(anime.rating).toFixed(1)}</span>
            </div>
          )}

          {/* Custom Tag Badge if provided */}
          {showBadge && (
            <div className="absolute top-2.5 right-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 text-black text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-lg border border-white/30">
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
