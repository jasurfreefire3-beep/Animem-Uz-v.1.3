import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic2,
  Users,
  Film,
  Sparkles,
  Search,
  Check,
  ChevronRight,
  Loader2,
  X,
  Play,
  Share2,
  Star,
  Eye,
  Radio
} from 'lucide-react';
import { Fandub, Anime } from '../types';
import { fetchFandubs, fetchFandubById, toggleFandubSubscription } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const FandublarScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user, token, openAuthModal } = useAuth();

  const [fandubs, setFandubs] = useState<Fandub[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFandub, setSelectedFandub] = useState<Fandub | null>(null);
  const [teamAnimes, setTeamAnimes] = useState<Anime[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [subscribingId, setSubscribingId] = useState<number | null>(null);

  // Load fandubs list
  const loadFandubs = async () => {
    setLoading(true);
    try {
      const data = await fetchFandubs(token || undefined);
      setFandubs(data);
    } catch (err) {
      console.warn("Fandublarni yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFandubs();
  }, [token]);

  // Open detail sheet
  const handleOpenFandub = async (f: Fandub) => {
    setSelectedFandub(f);
    setLoadingTeam(true);
    try {
      const data = await fetchFandubById(f.slug || f.id, token || undefined);
      if (data) {
        setSelectedFandub(data.fandub);
        setTeamAnimes(data.animes || []);
      }
    } catch (err) {
      console.warn("Fandub detallari xatosi:", err);
    } finally {
      setLoadingTeam(false);
    }
  };

  // Toggle subscription
  const handleToggleSubscribe = async (e: React.MouseEvent, fandubId: number) => {
    e.stopPropagation();
    if (!user || !token) {
      openAuthModal();
      return;
    }

    setSubscribingId(fandubId);
    try {
      const res = await toggleFandubSubscription(fandubId, token);
      // Optimistic update
      setFandubs(prev =>
        prev.map(f => {
          if (f.id === fandubId) {
            return {
              ...f,
              is_subscribed: res.is_subscribed,
              subscribers_count: res.subscribers_count
            };
          }
          return f;
        })
      );

      if (selectedFandub && selectedFandub.id === fandubId) {
        setSelectedFandub(prev =>
          prev
            ? {
                ...prev,
                is_subscribed: res.is_subscribed,
                subscribers_count: res.subscribers_count
              }
            : null
        );
      }
    } catch (err: any) {
      alert(err.message || "Obunani yangilashda xatolik");
    } finally {
      setSubscribingId(null);
    }
  };

  const filteredFandubs = fandubs.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.description && f.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-4 px-4 pt-3 pb-8">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-[#12131e] via-[#1a1325] to-[#0c0d14] border border-white/10 shadow-2xl">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ff006a]/15 border border-[#ff006a]/30 text-[#ff006a] text-xs font-bold shadow-[0_0_12px_rgba(255,0,106,0.2)]">
            <Radio size={13} className="animate-pulse" />
            <span>O'zbek Dublyaj Jamoalari</span>
          </div>

          <h2 className="font-display font-black text-xl text-white tracking-wide">
            Fandub Jamoalari 🎙️
          </h2>
          <p className="text-xs text-white/60 leading-relaxed max-w-sm">
            Sevimli ovoz ustalari va fandub jamoalarini kuzating, yangi qismlarni birinchilardan bo'lib o'zbek tilida tomosha qiling!
          </p>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-[#ff006a]/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Fandub jamoasini qidirish..."
          className="w-full bg-[#12131e] border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#ff006a] transition-all"
        />
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-3">
          <Loader2 size={36} className="text-[#ff006a] animate-spin" />
          <span className="text-xs text-white/50 font-medium">Jamoalar yuklanmoqda...</span>
        </div>
      ) : filteredFandubs.length === 0 ? (
        /* Empty state */
        <div className="py-14 text-center space-y-3 bg-[#12131e]/50 rounded-2xl border border-white/5 p-6">
          <Mic2 size={40} className="mx-auto text-white/20" />
          <h4 className="text-sm font-bold text-white">Hech qanday jamoa topilmadi</h4>
          <p className="text-xs text-white/40">Qidiruv so'zini o'zgartirib ko'ring yoki keyinroq qayting.</p>
        </div>
      ) : (
        /* Fandub Cards Grid / List */
        <div className="space-y-3.5">
          {filteredFandubs.map((fandub) => {
            const isSubscribed = Boolean(fandub.is_subscribed);
            const isSubmitting = subscribingId === fandub.id;

            return (
              <div
                key={fandub.id}
                onClick={() => handleOpenFandub(fandub)}
                className="group relative overflow-hidden rounded-2xl bg-[#0e0f17] border border-white/10 hover:border-[#ff006a]/50 transition-all duration-300 shadow-xl cursor-pointer active:scale-[0.99]"
              >
                {/* Banner Header */}
                <div className="relative h-24 w-full overflow-hidden bg-[#161726]">
                  {fandub.banner_url ? (
                    <img
                      src={fandub.banner_url}
                      alt={fandub.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-[#181928] via-[#24132b] to-[#12131d]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0e0f17] via-black/40 to-transparent" />
                </div>

                {/* Team Info Card */}
                <div className="p-4 pt-0 relative -mt-8 flex items-end justify-between gap-3">
                  <div className="flex items-end gap-3 min-w-0">
                    {/* Avatar */}
                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/20 p-0.5 bg-[#0e0f17] shadow-xl shrink-0">
                      {fandub.avatar_url ? (
                        <img
                          src={fandub.avatar_url}
                          alt={fandub.name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-black text-xl text-[#ff006a] bg-gradient-to-tr from-[#1b1c2b] to-[#25122e]">
                          {fandub.name.charAt(0)}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 pb-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-display font-black text-sm text-white truncate">
                          {fandub.name}
                        </h3>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      </div>
                      <p className="text-[11px] text-white/50 truncate max-w-[160px]">
                        {fandub.description || "Rasmiy fandub ovoz jamoasi"}
                      </p>
                    </div>
                  </div>

                  {/* Subscribe Button */}
                  <button
                    onClick={(e) => handleToggleSubscribe(e, fandub.id)}
                    disabled={isSubmitting}
                    className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md active:scale-95 ${
                      isSubscribed
                        ? 'bg-white/10 hover:bg-white/15 text-white/80 border border-white/15'
                        : 'bg-gradient-to-r from-[#ff006a] to-[#7928ca] text-white shadow-[0_0_15px_rgba(255,0,106,0.35)]'
                    }`}
                  >
                    {isSubmitting ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : isSubscribed ? (
                      <>
                        <Check size={13} className="text-emerald-400" />
                        <span>Obunadasiz</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={12} />
                        <span>Obuna bo'lish</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Stats Footer Bar */}
                <div className="px-4 pb-3.5 pt-2 flex items-center gap-4 text-xs text-white/50 border-t border-white/5 mx-3">
                  <div className="flex items-center gap-1.5">
                    <Users size={13} className="text-[#00dfd8]" />
                    <span className="font-bold text-white/80">{fandub.subscribers_count || 0}</span>
                    <span className="text-[10px]">obunachi</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Film size={13} className="text-[#ff006a]" />
                    <span className="font-bold text-white/80">{fandub.anime_count || 0}</span>
                    <span className="text-[10px]">anime</span>
                  </div>

                  <div className="ml-auto flex items-center gap-1 text-[#ff006a] text-[11px] font-bold">
                    <span>Ko'rish</span>
                    <ChevronRight size={13} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fandub Detail Bottom Sheet Modal */}
      {selectedFandub && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="flex-1" onClick={() => setSelectedFandub(null)} />

          <div className="w-full max-w-md mx-auto bg-[#0f1016] border-t border-white/10 rounded-t-3xl overflow-hidden max-h-[88vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Sheet Banner */}
            <div className="relative h-32 w-full bg-[#181928] shrink-0">
              {selectedFandub.banner_url ? (
                <img
                  src={selectedFandub.banner_url}
                  alt={selectedFandub.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-[#181928] via-[#24132b] to-[#12131d]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f1016] via-black/40 to-transparent" />

              <button
                onClick={() => setSelectedFandub(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md flex items-center justify-center transition-all z-20"
              >
                <X size={16} />
              </button>
            </div>

            {/* Header with Avatar & Details */}
            <div className="p-4 pt-0 -mt-10 relative z-10 space-y-3 shrink-0">
              <div className="flex items-end justify-between gap-3">
                <div className="flex items-end gap-3">
                  <div className="w-18 h-18 rounded-2xl overflow-hidden border-2 border-white/20 p-0.5 bg-[#0f1016] shadow-xl shrink-0">
                    {selectedFandub.avatar_url ? (
                      <img
                        src={selectedFandub.avatar_url}
                        alt={selectedFandub.name}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-black text-2xl text-[#ff006a] bg-[#1a1b2b]">
                        {selectedFandub.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div className="pb-1 min-w-0">
                    <h3 className="font-display font-black text-lg text-white truncate">
                      {selectedFandub.name}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-white/50">
                      <span>👥 {selectedFandub.subscribers_count || 0} obunachi</span>
                      <span>🎬 {selectedFandub.anime_count || teamAnimes.length} anime</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => handleToggleSubscribe(e, selectedFandub.id)}
                  disabled={subscribingId === selectedFandub.id}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ${
                    selectedFandub.is_subscribed
                      ? 'bg-white/10 hover:bg-white/15 text-white/80 border border-white/15'
                      : 'bg-gradient-to-r from-[#ff006a] to-[#7928ca] text-white shadow-[0_0_15px_rgba(255,0,106,0.4)]'
                  }`}
                >
                  {selectedFandub.is_subscribed ? "Obunadasiz ✓" : "+ Obuna bo'lish"}
                </button>
              </div>

              {selectedFandub.description && (
                <p className="text-xs text-white/70 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">
                  {selectedFandub.description}
                </p>
              )}
            </div>

            {/* Dubbed Animes List Header */}
            <div className="px-4 pt-2 pb-1 border-t border-white/10 flex items-center justify-between shrink-0">
              <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                <Film size={14} className="text-[#ff006a]" />
                <span>Dublyaj qilingan animelar ({teamAnimes.length})</span>
              </h4>
            </div>

            {/* Scrollable Animes List */}
            <div className="overflow-y-auto no-scrollbar p-4 pt-2 space-y-2 flex-1">
              {loadingTeam ? (
                <div className="py-10 flex flex-col items-center justify-center space-y-2">
                  <Loader2 size={24} className="text-[#ff006a] animate-spin" />
                  <span className="text-xs text-white/40">Animelar yuklanmoqda...</span>
                </div>
              ) : teamAnimes.length === 0 ? (
                <div className="py-8 text-center text-xs text-white/40">
                  Ushbu jamoa tomonidan hozircha animelar yuklanmagan.
                </div>
              ) : (
                teamAnimes.map((anime) => (
                  <div
                    key={anime.id}
                    onClick={() => {
                      setSelectedFandub(null);
                      navigate(`/watch/${anime.id}`);
                    }}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all cursor-pointer active:scale-[0.98]"
                  >
                    <img
                      src={anime.poster_url || (anime as any).image_url}
                      alt={anime.title}
                      className="w-12 h-16 object-cover rounded-lg shrink-0"
                    />

                    <div className="flex-1 min-w-0 space-y-1">
                      <h5 className="font-bold text-xs text-white truncate">
                        {anime.title}
                      </h5>
                      <div className="flex items-center gap-2 text-[10px] text-white/50">
                        <span className="flex items-center gap-0.5 text-amber-400 font-bold">
                          <Star size={10} className="fill-amber-400" />
                          {anime.rating || 9.5}
                        </span>
                        <span>•</span>
                        <span>{anime.episodes_count || (anime as any).qismlar_soni || 12} qism</span>
                        <span>•</span>
                        <span>{anime.release_year || (anime as any).yil || 2024}</span>
                      </div>
                    </div>

                    <button className="w-8 h-8 rounded-full bg-[#ff006a]/20 text-[#ff006a] hover:bg-[#ff006a] hover:text-white flex items-center justify-center transition-all shrink-0">
                      <Play size={14} className="fill-current ml-0.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
