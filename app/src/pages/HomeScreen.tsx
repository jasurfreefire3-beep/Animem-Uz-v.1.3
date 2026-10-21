import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Clock, Sparkles, TrendingUp, Compass } from 'lucide-react';
import { Anime } from '../types';
import { fetchAnimes } from '../services/api';
import { HeroCarousel } from '../components/HeroCarousel';
import { SectionSlider } from '../components/SectionSlider';
import { AnimeCard } from '../components/AnimeCard';

const GENRES = [
  'Barchasi',
  'Ekshn',
  'Fentezi',
  'Shonen',
  'Sarguzasht',
  'Komediya',
  'Drama',
  'Romantika',
  'Qonli'
];

export const HomeScreen: React.FC = () => {
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [selectedGenre, setSelectedGenre] = useState('Barchasi');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAnimes().then((data) => {
      setAnimes(data);
      setLoading(false);
    });
  }, []);

  const filtered = selectedGenre === 'Barchasi'
    ? animes
    : animes.filter(a => {
        if (Array.isArray(a.genres)) return a.genres.includes(selectedGenre);
        if (typeof a.genres === 'string') return a.genres.includes(selectedGenre);
        return false;
      });

  const trendingAnimes = animes.filter(a => a.is_trending || (Number(a.rating) >= 9.5));
  const latestAnimes = [...animes].sort((a, b) => Number(b.release_year || 0) - Number(a.release_year || 0));

  return (
    <div className="space-y-6 pt-3">
      {/* Featured Hero Carousel */}
      <div className="px-4">
        <HeroCarousel animes={animes} />
      </div>

      {/* Interactive Genres Chips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-4 py-1">
        {GENRES.map((genre) => (
          <button
            key={genre}
            onClick={() => setSelectedGenre(genre)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
              selectedGenre === genre
                ? 'bg-gradient-to-r from-[#ff006a] to-[#7928ca] text-white shadow-[0_0_12px_rgba(255,0,106,0.4)]'
                : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/5'
            }`}
          >
            {genre}
          </button>
        ))}
      </div>

      {/* Mika AI Feature Promo Banner */}
      <div className="px-4">
        <div
          onClick={() => navigate('/mika')}
          className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-r from-[#ff006a]/20 via-[#7928ca]/20 to-[#00dfd8]/20 border border-white/10 flex items-center justify-between shadow-lg cursor-pointer group active:scale-[0.98] transition-all"
        >
          <div className="space-y-1 z-10">
            <span className="text-[10px] font-black uppercase text-[#00dfd8] tracking-wider flex items-center gap-1">
              <Sparkles size={11} /> AI Maslahatchi
            </span>
            <h4 className="text-sm font-black text-white group-hover:text-[#ff006a] transition-colors">
              Mika AI bilan suhbatlashing
            </h4>
            <p className="text-[11px] text-white/60">
              Qaysi anime ko'rishni bilmayapsizmi? Mikadan so'rang!
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#ff006a] to-[#00dfd8] p-0.5 shadow-[0_0_15px_rgba(255,0,106,0.5)] shrink-0 z-10 flex items-center justify-center">
            <div className="w-full h-full bg-[#0a0a14] rounded-[14px] flex items-center justify-center text-xl">
              🌸
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-[#ff006a]/20 rounded-full blur-2xl pointer-events-none" />
        </div>
      </div>

      {/* Trend Section */}
      <SectionSlider
        title="Trenddagi Animelar"
        subtitle="Hozirda eng ko'p tomosha qilinayotganlar"
        icon={<Flame size={18} />}
        animes={trendingAnimes.length > 0 ? trendingAnimes : animes}
      />

      {/* Latest Episodes Section */}
      <SectionSlider
        title="Yangi Chiqqan Qismlar"
        subtitle="O'zbek tiliga yangi tarjima qilinganlar"
        icon={<Clock size={18} />}
        animes={latestAnimes}
      />

      {/* Filtered Grid Section */}
      <section className="px-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Compass size={18} className="text-[#00dfd8]" />
            <h3 className="font-display font-extrabold text-base tracking-wide text-white">
              {selectedGenre === 'Barchasi' ? 'Barcha Animelar' : `${selectedGenre} janridagi`}
            </h3>
          </div>
          <span className="text-[11px] font-mono text-white/40">{filtered.length} ta anime</span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {filtered.map((anime) => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </div>
      </section>
    </div>
  );
};
