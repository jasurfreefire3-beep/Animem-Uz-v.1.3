import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Star, Heart, Share2, Download, MessageSquare, Layers, Send } from 'lucide-react';
import { Anime, Comment } from '../types';
import { fetchAnimeById, fetchAnimes } from '../services/api';
import { ProVideoPlayer } from '../components/ProVideoPlayer';
import { SectionSlider } from '../components/SectionSlider';
import { useAuth } from '../context/AuthContext';

export const WatchScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const epParam = Number(searchParams.get('ep')) || 1;

  const { isFavorite, toggleFavorite } = useAuth();

  const [anime, setAnime] = useState<Anime | null>(null);
  const [currentEpNum, setCurrentEpNum] = useState<number>(epParam);
  const [allAnimes, setAllAnimes] = useState<Anime[]>([]);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'comments'>('info');

  // Comments state
  const [comments, setComments] = useState<Comment[]>([
    { id: 1, user_name: "Azizbek Pro", user_avatar: "", text: "Dublyajiga gap yo'q! Keyingi qism qachon chiqadi?", created_at: "2 soat oldin" },
    { id: 2, user_name: "AnimeFan_99", user_avatar: "", text: "Eng zo'r qism bo'ldi, jang sahnalari daxshat!", created_at: "Kecha" }
  ]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    if (id) {
      fetchAnimeById(id).then(setAnime);
    }
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
    setComments(prev => [
      { id: Date.now(), user_name: "Siz (Foydalanuvchi)", text: newComment.trim(), created_at: "Hozirgina" },
      ...prev
    ]);
    setNewComment('');
  };

  if (!anime) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-white/50 text-xs">
        Yuklanmoqda...
      </div>
    );
  }

  const episodes = anime.episodes && anime.episodes.length > 0 ? anime.episodes : [
    { episode_number: 1, title: "1-qism", video_url: "https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4" },
    { episode_number: 2, title: "2-qism", video_url: "https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4" },
    { episode_number: 3, title: "3-qism", video_url: "https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4" },
  ];

  const fav = isFavorite(anime.id);

  return (
    <div className="space-y-4 pb-12">
      {/* Pro Video Player Header */}
      <div className="sticky top-0 z-40 bg-black">
        <ProVideoPlayer
          animeId={anime.id}
          animeTitle={anime.title}
          episodes={episodes}
          currentEpisodeNumber={currentEpNum}
          onEpisodeChange={handleEpisodeChange}
        />
      </div>

      <div className="px-4 space-y-4">
        {/* Title & Stats */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="bg-[#ff006a]/20 border border-[#ff006a]/40 text-[#ff006a] text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
              {anime.voice_acting || 'Animem Uz Dublaj'}
            </span>
            <div className="flex items-center gap-1 text-amber-400 text-xs font-black">
              <Star size={12} className="fill-amber-400" />
              <span>{anime.rating || '9.5'}</span>
            </div>
            <span className="text-white/40 text-xs">•</span>
            <span className="text-white/60 text-xs font-semibold">{anime.release_year || '2024'}</span>
          </div>

          <h1 className="text-lg sm:text-xl font-black text-white leading-snug">
            {anime.title}
          </h1>

          <p className="text-xs text-[#00dfd8] font-bold">
            {Array.isArray(anime.genres) ? anime.genres.join(', ') : anime.genres}
          </p>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-2 pt-1 border-y border-white/5 py-3">
          <button
            onClick={() => toggleFavorite(anime.id)}
            className={`flex-1 py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all active:scale-95 ${
              fav
                ? 'bg-[#ff006a]/20 border-[#ff006a] text-[#ff006a]'
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
            onClick={() => alert("Mobil ilovada oflayn yuklab olish funksiyasi tez kunda aktivlashadi!")}
            className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center active:scale-95 transition-all"
            title="Yuklab olish"
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
            Tavsif & Qismlar
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
            {/* Quick Horizontal Episode Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Layers size={13} className="text-[#00dfd8]" />
                  Qismlar ({episodes.length})
                </span>
                <span className="text-[10px] text-white/40">Tanlash uchun bosing</span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {episodes.map((ep) => (
                  <button
                    key={ep.episode_number}
                    onClick={() => handleEpisodeChange(ep.episode_number)}
                    className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                      ep.episode_number === currentEpNum
                        ? 'bg-[#ff006a] text-white shadow-[0_0_12px_#ff006a]'
                        : 'bg-[#0f1016] border border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    {ep.episode_number}-qism
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white/80">Anime haqida:</h4>
              <p className={`text-xs text-white/60 leading-relaxed font-sans ${showFullDesc ? '' : 'line-clamp-3'}`}>
                {anime.description || "Ushbu anime uchun tavsif hozircha kiritilmagan."}
              </p>
              {anime.description && anime.description.length > 150 && (
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
                placeholder="Fikringizni yozing..."
                className="flex-1 bg-[#0f1016] border border-white/10 focus:border-[#ff006a] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none"
              />
              <button
                type="submit"
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
            animes={allAnimes.filter(a => String(a.id) !== String(anime.id))}
          />
        </div>
      </div>
    </div>
  );
};
