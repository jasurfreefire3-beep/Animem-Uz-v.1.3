import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Clock, Sparkles, Compass, Mic2, Heart, Search } from 'lucide-react';
import { Anime, SITE_GENRES, animeMatchesGenre, Fandub } from '../types';
import { fetchAnimes, fetchFandubs } from '../services/api';
import { HeroCarousel } from '../components/HeroCarousel';
import { SectionSlider } from '../components/SectionSlider';
import { AnimeCard } from '../components/AnimeCard';

export const HomeScreen: React.FC = () => {
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [fandubs, setFandubs] = useState<Fandub[]>([]);
  const [selectedGenre, setSelectedGenre] = useState('Barchasi');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAnimes().then((data) => {
      setAnimes(data);
      setLoading(false);
    });
    fetchFandubs().then(setFandubs).catch(() => {});
  }, []);

  const filtered = selectedGenre === 'Barchasi'
    ? animes
    : animes.filter((a) => animeMatchesGenre(a, selectedGenre));

  const trendingAnimes = animes.filter(
    (a) => Boolean(a.is_trending) || (Number(a.korishlar || a.views || 0) > 100) || (Number(a.rating || 0) >= 9.0)
  );
  const latestAnimes = [...animes].sort(
    (a, b) => Number(b.release_year || b.yil || 0) - Number(a.release_year || a.yil || 0)
  );

  return (
    <div className="space-y-6 pt-3">
      {/* Featured Hero Carousel (Clean, sleek, star-free) */}
      <div className="px-4">
        <HeroCarousel animes={animes} />
      </div>

      {/* Quick Feature Action Pills */}
      <div className="px-4 grid grid-cols-4 gap-2 text-center">
        <button
          onClick={() => navigate('/fandublar')}
          className="p-2.5 rounded-2xl bg-[#0f1016] border border-white/10 hover:border-[#ff006a]/50 flex flex-col items-center gap-1.5 transition-all active:scale-95 group shadow-lg"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#ff006a] to-[#7928ca] p-0.5 flex items-center justify-center">
            <div className="w-full h-full bg-[#0f1016] rounded-[10px] flex items-center justify-center text-[#ff006a] group-hover:scale-110 transition-transform">
              <Mic2 size={18} />
            </div>
          </div>
          <span className="text-[11px] font-bold text-white/90">Fandublar</span>
        </button>

        <button
          onClick={() => navigate('/explore')}
          className="p-2.5 rounded-2xl bg-[#0f1016] border border-white/10 hover:border-[#00dfd8]/50 flex flex-col items-center gap-1.5 transition-all active:scale-95 group shadow-lg"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00dfd8] to-[#0070f3] p-0.5 flex items-center justify-center">
            <div className="w-full h-full bg-[#0f1016] rounded-[10px] flex items-center justify-center text-[#00dfd8] group-hover:scale-110 transition-transform">
              <Search size={18} />
            </div>
          </div>
          <span className="text-[11px] font-bold text-white/90">Katalog</span>
        </button>

        <button
          onClick={() => navigate('/mika')}
          className="p-2.5 rounded-2xl bg-[#0f1016] border border-white/10 hover:border-[#ff006a]/50 flex flex-col items-center gap-1.5 transition-all active:scale-95 group shadow-lg"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#ff006a] to-[#ff4b4b] p-0.5 flex items-center justify-center">
            <div className="w-full h-full bg-[#0f1016] rounded-[10px] flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
              🌸
            </div>
          </div>
          <span className="text-[11px] font-bold text-white/90">Mika AI</span>
        </button>

        <button
          onClick={() => navigate('/favorites')}
          className="p-2.5 rounded-2xl bg-[#0f1016] border border-white/10 hover:border-[#ff006a]/50 flex flex-col items-center gap-1.5 transition-all active:scale-95 group shadow-lg"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-[#ff006a] p-0.5 flex items-center justify-center">
            <div className="w-full h-full bg-[#0f1016] rounded-[10px] flex items-center justify-center text-[#ff006a] group-hover:scale-110 transition-transform">
              <Heart size={18} className="fill-[#ff006a]" />
            </div>
          </div>
          <span className="text-[11px] font-bold text-white/90">Sevimlilar</span>
        </button>
      </div>

      {/* Fandublar Highlights Slider */}
      {fandubs.length > 0 && (
        <div className="space-y-3">
          <div className="px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#ff006a]/20 text-[#ff006a] flex items-center justify-center">
                <Mic2 size={15} />
              </div>
              <div>
                <h3 className="font-display font-black text-sm text-white">
                  Fandub Jamoalari
                </h3>
                <p className="text-[10px] text-white/40">Ovoz ustalari va tarjima studiyalari</p>
              </div>
            </div>

            <button
              onClick={() => navigate('/fandublar')}
              className="text-[#ff006a] text-xs font-bold hover:underline"
            >
              Barchasi →
            </button>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar px-4 pb-1">
            {fandubs.map((f) => (
              <div
                key={f.id}
                onClick={() => navigate('/fandublar')}
                className="shrink-0 w-36 rounded-2xl p-3 bg-[#0f1016] border border-white/10 hover:border-[#ff006a]/40 transition-all cursor-pointer space-y-2 text-center group active:scale-95"
              >
                <div className="relative w-12 h-12 mx-auto rounded-xl overflow-hidden border border-white/15 bg-white/5">
                  {f.avatar_url ? (
                    <img src={f.avatar_url} alt={f.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-sm text-[#ff006a]">
                      {f.name.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <h5 className="font-bold text-xs text-white truncate group-hover:text-[#ff006a]">
                    {f.name}
                  </h5>
                  <span className="text-[10px] text-white/40 block">
                    {f.subscribers_count || 0} obunachi
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Website Synchronized Genres Chips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-4 py-1">
        {SITE_GENRES.map((genre) => (
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

        {filtered.length === 0 ? (
          <div className="p-8 text-center text-white/40 text-xs bg-white/5 rounded-2xl border border-white/5">
            Ushbu janrda animelar tez orada qo'shiladi.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5">
            {filtered.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
