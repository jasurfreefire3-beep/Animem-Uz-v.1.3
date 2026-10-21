import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Heart, Share2, Download, MessageSquare, Layers, Send, Eye, Film } from 'lucide-react';
import { Anime, Comment, formatGenresList, Episode } from '../types';
import { fetchAnimeById, fetchAnimes, fetchAnimeEpisodes } from '../services/api';
import { ProVideoPlayer } from '../components/ProVideoPlayer';
import { SectionSlider } from '../components/SectionSlider';
import { useAuth } from '../context/AuthContext';

export const WatchScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const epParam = Number(searchParams.get('ep')) || 1;

  const { isFavorite, toggleFavorite } = useAuth();

  const [anime, setAnime] = useState<Anime | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentEpNum, setCurrentEpNum] = useState<number>(epParam);
  const [allAnimes, setAllAnimes] = useState<Anime[]>([]);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'comments'>('info');

  // Comments state
  const [comments, setComments] = useState<Comment[]>([
    { id: 1, user_name: "Azizbek Pro", user_avatar: "", text: "Dublyajiga gap yo'q! TAS-IX sifati juda tez ochilmoqda!", created_at: "2 soat oldin" },
    { id: 2, user_name: "AnimeFan_99", user_avatar: "", text: "Eng zo'r qism bo'ldi, Animem Uz ilovasi juda qulay bo'libdi!", created_at: "Kecha" }
  ]);
  const [newComment, setNewComment] = useState('');

  // Load anime and its episodes
  useEffect(() => {
    if (!id) return;

    fetchAnimeById(id).then((animeData) => {
      if (animeData) {
        setAnime(animeData);
        if (animeData.episodes && animeData.episodes.length > 0) {
          setEpisodes(animeData.episodes);
        } else {
          // Additional fallback fetch for episodes
          fetchAnimeEpisodes(id).then((epList) => {
            if (epList && epList.length > 0) {
              setEpisodes(epList);
            }
          });
        }
      }
    });

    fetchAnimes().then(setAllAnimes);
  }, [id]);

  useEffect(() => {
    setCurrentEpNum(epParam);
  }, [epParam]);

  const handleEpisodeChange = (newEp: number) => {
    setCurrentEpNum(newEp);
    setSearchParams({ ep: String(newEp) });
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setComments((prev) => [
      { id: Date.now(), user_name: "Siz (Foydalanuvchi)", text: newComment.trim(), created_at: "Hozirgina" },
      ...prev
    ]);
    setNewComment('');
  };

  if (!anime) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-white/50 text-xs space-y-3">
        <div className="w-8 h-8 border-2 border-[#ff006a] border-t-transparent rounded-full animate-spin" />
        <span>Anime yuklanmoqda...</span>
      </div>
    );
  }

  // Episodes array guarantee
  const effectiveEpisodes: Episode[] = episodes.length > 0
    ? episodes
    : (anime.episodes && anime.episodes.length > 0
      ? anime.episodes
      : [
          {
            episode_number: 1,
            title: "1-qism",
            duration: "24:00",
            video_url: anime.video_url || "https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4",
            server_name: "TAS-IX Ultra (1080p FHD)"
          }
        ]);

  const fav = isFavorite(anime.id);
  const dubLabel = anime.dub_studio || anime.voice_acting || "AnimemUz Dublyaj";
  const yearLabel = anime.release_year || anime.yil || "2024";
  const statusLabel = anime.holati || anime.status || "Yakunlangan";
  const genreListText = formatGenresList(anime.janrlar || anime.genres);
  const viewsCount = anime.korishlar || anime.views || anime.views_count || 1240;

  return (
    <div className="space-y-4 pb-12">
      {/* Pro Video Player Header */}
      <div className="sticky top-0 z-40 bg-black">
        <ProVideoPlayer
          animeId={anime.id}
          animeTitle={anime.title}
          episodes={effectiveEpisodes}
          currentEpisodeNumber={currentEpNum}
          onEpisodeChange={handleEpisodeChange}
          posterUrl={anime.banner_url || anime.image_url || anime.poster_url}
        />
      </div>

      <div className="px-4 space-y-4">
        {/* Title & Metadata (Clean, modern, no stars) */}
        <div className="space-y-2">
          {/* Metadata badges row */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="bg-[#ff006a]/20 border border-[#ff006a]/40 text-[#ff006a] text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
              {dubLabel}
            </span>

            <span className="bg-white/10 text-white/90 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-white/10">
              TAS-IX FHD
            </span>

            <span className="text-white/40">•</span>

            <span className="text-white/70 text-[11px] font-semibold">{yearLabel}</span>

            <span className="text-white/40">•</span>

            <span className="text-white/60 text-[11px] font-medium">{statusLabel}</span>

            <span className="text-white/40">•</span>

            <div className="flex items-center gap-1 text-[11px] text-white/50">
              <Eye size={12} />
              <span>{viewsCount.toLocaleString()}</span>
            </div>
          </div>

          {/* Anime Title */}
          <h1 className="text-lg sm:text-xl font-black text-white leading-snug">
            {anime.title}
          </h1>

          {/* Genres row */}
          <p className="text-xs text-[#00dfd8] font-bold">
            {genreListText}
          </p>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-2 pt-1 border-y border-white/5 py-3">
          <button
            onClick={() => toggleFavorite(anime.id)}
            className={`flex-1 py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all active:scale-95 ${
              fav
                ? 'bg-[#ff006a]/20 border-[#ff006a] text-[#ff006a] shadow-[0_0_15px_rgba(255,0,106,0.3)]'
                : 'bg-white/5 border-white/10 text-white/80 hover:text-white'
            }`}
          >
            <Heart size={16} className={fav ? 'fill-[#ff006a]' : ''} />
            <span>{fav ? 'Sevimlilarda' : 'Saqlash'}</span>
          </button>

          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: anime.title, url: window.location.href }).catch(() => {});
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert("Havola nusxalandi!");
              }
            }}
            className="flex-1 py-2.5 px-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 hover:text-white flex items-center justify-center gap-2 text-xs font-bold active:scale-95 transition-all"
          >
            <Share2 size={16} />
            <span>Ulashish</span>
          </button>

          <button
            onClick={() => alert("Oflayn yuklab olish tez kunda aktivlashadi!")}
            className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center active:scale-95 transition-all"
            title="Yuklab olish"
            aria-label="Yuklab olish"
          >
            <Download size={16} />
          </button>
        </div>

        {/* Tabs: Info vs Comments */}
        <div className="flex items-center gap-4 border-b border-white/10 pb-2">
          <button
            onClick={() => setActiveTab('info')}
            className={`text-xs font-black uppercase tracking-wider pb-2 relative transition-colors ${
              activeTab === 'info' ? 'text-white' : 'text-white/40'
            }`}
          >
            Qismlar & Tavsif
            {activeTab === 'info' && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[#ff006a] shadow-[0_0_8px_#ff006a]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('comments')}
            className={`text-xs font-black uppercase tracking-wider pb-2 relative transition-colors flex items-center gap-1.5 ${
              activeTab === 'comments' ? 'text-white' : 'text-white/40'
            }`}
          >
            <MessageSquare size={13} />
            Sharhlar ({comments.length})
            {activeTab === 'comments' && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[#ff006a] shadow-[0_0_8px_#ff006a]" />
            )}
          </button>
        </div>

        {activeTab === 'info' ? (
          <div className="space-y-4">
            {/* Horizontal Quick Episode Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Layers size={13} className="text-[#00dfd8]" />
                  Epizodlar ({effectiveEpisodes.length} ta)
                </span>
                <span className="text-[10px] text-white/40">Tanlang va tomosha qiling</span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {effectiveEpisodes.map((ep) => {
                  const isCurrent = Number(ep.episode_number) === Number(currentEpNum);
                  return (
                    <button
                      key={ep.episode_number}
                      onClick={() => handleEpisodeChange(Number(ep.episode_number))}
                      className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                        isCurrent
                          ? 'bg-[#ff006a] text-white shadow-[0_0_12px_#ff006a]'
                          : 'bg-[#0f1016] border border-white/10 text-white/70 hover:text-white'
                      }`}
                    >
                      {ep.episode_number}-qism
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Anime Description */}
            <div className="space-y-1.5 pt-1">
              <h4 className="text-xs font-bold text-white/80 flex items-center gap-1.5">
                <Film size={13} className="text-[#ff006a]" />
                <span>Anime haqida</span>
              </h4>
              <p className={`text-xs text-white/70 leading-relaxed font-sans ${showFullDesc ? '' : 'line-clamp-3'}`}>
                {anime.description || "Ushbu anime uchun tavsif hozircha kiritilmagan."}
              </p>
              {anime.description && anime.description.length > 140 && (
                <button
                  onClick={() => setShowFullDesc(!showFullDesc)}
                  className="text-xs text-[#ff006a] font-bold hover:underline"
                >
                  {showFullDesc ? "Yopish" : "To'liq o'qish..."}
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Comments Tab */
          <div className="space-y-4">
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Fikringizni qoldiring..."
                className="flex-1 bg-[#0f1016] border border-white/10 focus:border-[#ff006a] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Yuborish"
                className="bg-[#ff006a] hover:bg-[#ff006a]/90 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center active:scale-95 transition-all shadow-[0_0_12px_rgba(255,0,106,0.4)]"
              >
                <Send size={14} />
              </button>
            </form>

            <div className="space-y-2.5">
              {comments.map((c) => (
                <div key={c.id} className="p-3 rounded-xl bg-[#0f1016] border border-white/5 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white/90">{c.user_name}</span>
                    <span className="text-[10px] text-white/40">{c.created_at}</span>
                  </div>
                  <p className="text-xs text-white/70">{c.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Similar Recommendations */}
        <div className="-mx-4 pt-4 border-t border-white/5">
          <SectionSlider
            title="O'xshash Animelar"
            subtitle="Sizga yoqishi mumkin bo'lgan tavsiyalar"
            animes={allAnimes.filter((a) => String(a.id) !== String(anime.id))}
          />
        </div>
      </div>
    </div>
  );
};
