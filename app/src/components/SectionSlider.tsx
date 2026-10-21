import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Anime } from '../types';
import { AnimeCard } from './AnimeCard';

interface SectionSliderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  animes: Anime[];
  viewAllLink?: string;
}

export const SectionSlider: React.FC<SectionSliderProps> = ({
  title,
  subtitle,
  icon,
  animes,
  viewAllLink = '/explore',
}) => {
  if (!animes || animes.length === 0) return null;

  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="flex items-end justify-between px-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            {icon && <span className="text-[#ff006a]">{icon}</span>}
            <h3 className="font-display font-extrabold text-base tracking-wide text-white">
              {title}
            </h3>
          </div>
          {subtitle && <p className="text-[11px] text-white/40">{subtitle}</p>}
        </div>

        <Link
          to={viewAllLink}
          className="text-xs font-bold text-[#ff006a] hover:text-[#ff006a]/80 flex items-center gap-0.5 transition-colors py-1 pl-2"
        >
          <span>Barchasi</span>
          <ChevronRight size={14} />
        </Link>
      </div>

      {/* Horizontal Scroll Track */}
      <div className="flex items-start gap-3 overflow-x-auto no-scrollbar px-4 pb-2 pt-1 scroll-smooth">
        {animes.map((anime) => (
          <AnimeCard key={anime.id} anime={anime} />
        ))}
      </div>
    </section>
  );
};

