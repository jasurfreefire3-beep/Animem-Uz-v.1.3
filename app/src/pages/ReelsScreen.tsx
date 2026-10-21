import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Play, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { Reel } from '../types';

const SAMPLE_REELS: Reel[] = [
  {
    id: 1,
    anime_title: "Solo Leveling: Arise",
    caption: "Son Jin-Vuning afsonaviy uyg'onishi! ⚔️🔥 Kim kutgan edi?",
    video_url: "https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4",
    poster_url: "https://image.animem.uz/api/media/img_1792172361943_kkah81l.jpg",
    likes: 4280,
    comments_count: 142,
    anime_id: 1
  },
  {
    id: 2,
    anime_title: "Jujutsu Kaisen: Shibuya Arc",
    caption: "Satoru Gojoning cheksiz bo'shliq hujumi! ⚡ Sifatiga baho bering!",
    video_url: "https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4",
    poster_url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80",
    likes: 6810,
    comments_count: 310,
    anime_id: 2
  },
  {
    id: 3,
    anime_title: "Demon Slayer: Hashira",
    caption: "Muzanga qarshi eng so'nggi nafas! Hashiralar jangga kirdi! 🗡️",
    video_url: "https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4",
    poster_url: "https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80",
    likes: 5120,
    comments_count: 98,
    anime_id: 3
  }
];

export const ReelsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [likesState, setLikesState] = useState<{ [id: number]: { count: number; liked: boolean } }>({
    1: { count: 4280, liked: false },
    2: { count: 6810, liked: true },
    3: { count: 5120, liked: false }
  });
  const [isMuted, setIsMuted] = useState(true);

  const reel = SAMPLE_REELS[activeReelIndex];

  const handleLike = (id: number) => {
    setLikesState(prev => {
      const current = prev[id] || { count: 100, liked: false };
      return {
        ...prev,
        [id]: {
          liked: !current.liked,
          count: current.liked ? current.count - 1 : current.count + 1
        }
      };
    });
  };

  return (
    <div className="relative w-full h-[calc(100vh-80px)] overflow-hidden bg-black flex flex-col justify-between">
      {/* Background Video */}
      <div className="absolute inset-0 z-0">
        <video
          key={reel.id}
          src={reel.video_url}
          poster={reel.poster_url}
          autoPlay
          loop
          muted={isMuted}
          playsInline
          className="w-full h-full object-cover"
        />
        {/* Gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90 pointer-events-none" />
      </div>

      {/* Top Header */}
      <div className="relative z-10 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-display font-black text-sm text-white tracking-wider flex items-center gap-1.5 drop-shadow">
            ANIMEM REELS <Sparkles size={14} className="text-[#ff006a]" />
          </span>
        </div>

        <button
          onClick={() => setIsMuted(!isMuted)}
          className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center active:scale-95 transition-all shadow-lg"
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>

      {/* Floating Action Controls on Right */}
      <div className="relative z-10 flex items-end justify-between p-4 pb-6 gap-3">
        {/* Left Side: Caption and Info */}
        <div className="space-y-2 flex-1 max-w-[75%]">
          <span className="inline-block bg-[#ff006a] text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-[0_0_12px_#ff006a]">
            {reel.anime_title}
          </span>
          <p className="text-xs text-white leading-relaxed font-medium drop-shadow">
            {reel.caption}
          </p>

          {/* Jump to Full Anime Watch button */}
          {reel.anime_id && (
            <button
              onClick={() => navigate(`/watch/${reel.anime_id}`)}
              className="bg-white/15 hover:bg-white/25 border border-white/20 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-lg"
            >
              <Play size={12} className="fill-white" />
              <span>To'liq animeni ko'rish</span>
            </button>
          )}
        </div>

        {/* Right Side: Like, Comment, Next Buttons */}
        <div className="flex flex-col items-center gap-4">
          {/* Like */}
          <button
            onClick={() => handleLike(Number(reel.id))}
            className="flex flex-col items-center gap-1 group active:scale-90 transition-transform"
          >
            <div className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md border ${
              likesState[Number(reel.id)]?.liked
                ? 'bg-[#ff006a] border-[#ff006a] text-white shadow-[0_0_15px_#ff006a]'
                : 'bg-black/50 border-white/20 text-white'
            }`}>
              <Heart size={20} className={likesState[Number(reel.id)]?.liked ? 'fill-white' : ''} />
            </div>
            <span className="text-[10px] text-white font-bold drop-shadow">
              {likesState[Number(reel.id)]?.count || reel.likes}
            </span>
          </button>

          {/* Comments */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white flex items-center justify-center">
              <MessageCircle size={20} />
            </div>
            <span className="text-[10px] text-white font-bold drop-shadow">
              {reel.comments_count}
            </span>
          </div>

          {/* Share */}
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: reel.anime_title, text: reel.caption, url: window.location.href }).catch(() => {});
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert("Reels havolasi nusxalandi!");
              }
            }}
            className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
          >
            <div className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white flex items-center justify-center">
              <Share2 size={18} />
            </div>
            <span className="text-[10px] text-white font-bold drop-shadow">Ulashish</span>
          </button>

          {/* Next Reel Indicator */}
          <button
            onClick={() => setActiveReelIndex((prev) => (prev + 1) % SAMPLE_REELS.length)}
            className="w-11 h-11 rounded-full bg-gradient-to-r from-[#ff006a] to-[#7928ca] text-white flex items-center justify-center font-bold text-xs shadow-[0_0_15px_rgba(255,0,106,0.6)] active:scale-95 transition-all mt-2"
            title="Keyingi video"
          >
            ↓
          </button>
        </div>
      </div>
    </div>
  );
};
