import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Clock, Trash2, Play, Sparkles } from 'lucide-react';
import { Anime } from '../types';
import { fetchAnimes } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const FavoritesScreen: React.FC = () => {
  const navigate = useNavigate();
  const { favorites, history, toggleFavorite } = useAuth();
  const [activeTab, setActiveTab] = useState<'favorites' | 'history'>('favorites');
  const [allAnimes, setAllAnimes] = useState<Anime[]>([]);

  useEffect(() => {
    fetchAnimes().then(setAllAnimes);
  }, []);

  const favoriteAnimes = allAnimes.filter((a) => favorites.some((f) => String(f) === String(a.id)));

  const historyAnimes = history
    .map((h) => {
      const anime = allAnimes.find((a) => String(a.id) === String(h.animeId));
      if (!anime) return null;
      return { anime, episode: h.episode, timestamp: h.timestamp };
    })
    .filter(Boolean) as { anime: Anime; episode: number; timestamp: number }[];

  return (
    <div className="space-y-4 px-4 pt-3">
      {/* Top Title & Tab Switcher */}
      <div className="space-y-3">
        <h2 className="font-display font-black text-xl text-white">Mening To'plamim</h2>

        <div className="flex bg-[#0f1016] p-1 rounded-2xl border border-white/10">
          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'favorites'
                ? 'bg-[#ff006a] text-white shadow-[0_0_12px_rgba(255,0,106,0.4)]'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <Heart size={14} className={activeTab === 'favorites' ? 'fill-white' : ''} />
            <span>Sevimlilar ({favoriteAnimes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-[#ff006a] text-white shadow-[0_0_12px_rgba(255,0,106,0.4)]'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <Clock size={14} />
            <span>Tarix ({historyAnimes.length})</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'favorites' ? (
        <div className="space-y-2.5">
          {favoriteAnimes.map((anime) => (
            <div
              key={anime.id}
              className="flex items-center gap-3 p-2.5 rounded-2xl bg-[#0f1016] border border-white/5 hover:border-white/15 transition-all group"
            >
              <div
                onClick={() => navigate(`/watch/${anime.id}?ep=1`)}
                className="relative w-16 h-22 shrink-0 rounded-xl overflow-hidden cursor-pointer"
              >
                <img src={anime.poster_url} alt={anime.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <Play size={14} className="fill-white" />
                </div>
              </div>

              <div
                onClick={() => navigate(`/watch/${anime.id}?ep=1`)}
                className="flex-1 min-w-0 cursor-pointer space-y-1"
              >
                <h4 className="text-xs font-bold text-white leading-tight line-clamp-1 group-hover:text-[#ff006a] transition-colors">
                  {anime.title}
                </h4>
                <p className="text-[10px] text-[#00dfd8] font-bold">
                  {Array.isArray(anime.genres) ? anime.genres[0] : (anime.genres || 'Anime')}
                </p>
                <div className="text-[10px] text-white/40">
                  {anime.total_episodes ? `${anime.total_episodes} qism` : 'Davom etmoqda'}
                </div>
              </div>

              <button
                onClick={() => toggleFavorite(anime.id)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 flex items-center justify-center transition-colors"
                title="O'chirish"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {favoriteAnimes.length === 0 && (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-white/5 flex items-center justify-center text-white/30">
                <Heart size={20} />
              </div>
              <p className="text-white/40 text-xs">Hozircha sevimli animelar yo'q.</p>
              <button
                onClick={() => navigate('/explore')}
                className="bg-[#ff006a]/20 border border-[#ff006a]/40 text-[#ff006a] px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Sparkles size={13} /> Animelarni ko'rish
              </button>
            </div>
          )}
        </div>
      ) : (
        /* History tab */
        <div className="space-y-2.5">
          {historyAnimes.map(({ anime, episode }) => (
            <div
              key={`${anime.id}-${episode}`}
              onClick={() => navigate(`/watch/${anime.id}?ep=${episode}`)}
              className="flex items-center gap-3 p-2.5 rounded-2xl bg-[#0f1016] border border-white/5 hover:border-white/15 transition-all cursor-pointer group active:scale-[0.98]"
            >
              <div className="relative w-16 h-22 shrink-0 rounded-xl overflow-hidden">
                <img src={anime.poster_url} alt={anime.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Play size={14} className="fill-white" />
                </div>
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <h4 className="text-xs font-bold text-white truncate group-hover:text-[#ff006a] transition-colors">
                  {anime.title}
                </h4>
                <div className="inline-block bg-[#ff006a]/15 text-[#ff006a] text-[10px] font-black px-2 py-0.5 rounded">
                  {episode}-qism ko'rilgan
                </div>
                <p className="text-[10px] text-white/40">Davom ettirish uchun bosing</p>
              </div>
            </div>
          ))}

          {historyAnimes.length === 0 && (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-white/5 flex items-center justify-center text-white/30">
                <Clock size={20} />
              </div>
              <p className="text-white/40 text-xs">Tomosha tarixi bo'sh.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

