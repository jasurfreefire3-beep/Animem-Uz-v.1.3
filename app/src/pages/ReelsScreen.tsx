import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  MessageCircle,
  Share2,
  Play,
  Volume2,
  VolumeX,
  Sparkles,
  Plus,
  Loader2,
  X,
  Send,
  Upload,
  Film,
  AlertCircle,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Reel, Anime } from '../types';
import { fetchReels, toggleReelLike, fetchReelComments, postReelComment, uploadReelVideo, fetchAnimes } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const ReelsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user, token, openAuthModal } = useAuth();

  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [heartAnim, setHeartAnim] = useState(false);

  // Comments Bottom Sheet
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Upload Reel Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCaption, setUploadCaption] = useState('');
  const [selectedAnimeId, setSelectedAnimeId] = useState<string>('');
  const [animesList, setAnimesList] = useState<Anime[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<{ [key: number]: HTMLVideoElement | null }>({});

  // 1. Fetch Reels feed
  const loadReels = async () => {
    setLoading(true);
    try {
      const data = await fetchReels(1, 20, token || undefined);
      if (data.reels && data.reels.length > 0) {
        setReels(data.reels);
      } else {
        // Fallback sample reels if database has none
        setReels([
          {
            id: 1,
            anime_title: "Solo Leveling: Arise",
            caption: "Son Jin-Vuning afsonaviy uyg'onishi! ⚔️🔥 Kim kutgan edi?",
            video_url: "https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4",
            poster_url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1600&auto=format&fit=crop&q=80",
            likes_count: 4280,
            comments_count: 142,
            anime_id: 1,
            is_liked: false
          },
          {
            id: 2,
            anime_title: "Jujutsu Kaisen: Shibuya",
            caption: "Satoru Gojoning cheksiz bo'shliq hujumi! ⚡ Sifatiga baho bering!",
            video_url: "https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4",
            poster_url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80",
            likes_count: 6810,
            comments_count: 310,
            anime_id: 2,
            is_liked: true
          }
        ]);
      }
    } catch (err) {
      console.warn("Reels yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReels();
  }, [token]);

  // Load animes for upload selector
  useEffect(() => {
    if (showUploadModal && animesList.length === 0) {
      fetchAnimes().then(setAnimesList).catch(() => {});
    }
  }, [showUploadModal]);

  // Handle active video playback
  useEffect(() => {
    Object.keys(videoRefs.current).forEach((key) => {
      const idx = Number(key);
      const vid = videoRefs.current[idx];
      if (vid) {
        if (idx === activeIndex) {
          vid.currentTime = 0;
          vid.play().catch(() => {});
        } else {
          vid.pause();
        }
      }
    });
  }, [activeIndex, reels]);

  // Double tap to like with bursting heart animation
  const handleDoubleTap = (reel: any) => {
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 900);
    if (!reel.is_liked) {
      handleToggleLike(reel);
    }
  };

  // Toggle Like API
  const handleToggleLike = async (reel: any) => {
    if (!user || !token) {
      openAuthModal();
      return;
    }

    const prevLiked = Boolean(reel.is_liked);
    const prevCount = Number(reel.likes_count || 0);

    // Optimistic UI update
    setReels(prev =>
      prev.map(r => {
        if (r.id === reel.id) {
          return {
            ...r,
            is_liked: !prevLiked,
            likes_count: prevLiked ? prevCount - 1 : prevCount + 1
          };
        }
        return r;
      })
    );

    try {
      await toggleReelLike(reel.id, token);
    } catch (e) {
      // Revert on failure
      setReels(prev =>
        prev.map(r => {
          if (r.id === reel.id) {
            return {
              ...r,
              is_liked: prevLiked,
              likes_count: prevCount
            };
          }
          return r;
        })
      );
    }
  };

  // Open comments
  const handleOpenComments = async (reel: any) => {
    setShowComments(true);
    setLoadingComments(true);
    try {
      const data = await fetchReelComments(reel.id);
      setComments(data);
    } catch (e) {
      console.warn("Izohlarni yuklash xatosi:", e);
    } finally {
      setLoadingComments(false);
    }
  };

  // Submit comment
  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !token) {
      openAuthModal();
      return;
    }
    const text = commentText.trim();
    if (!text) return;

    const currentReel = reels[activeIndex];
    if (!currentReel) return;

    setSubmittingComment(true);
    try {
      const newComment = await postReelComment(currentReel.id, text, token);
      setComments(prev => [newComment, ...prev]);
      setCommentText('');

      // Update count on reel
      setReels(prev =>
        prev.map(r => {
          if (r.id === currentReel.id) {
            return { ...r, comments_count: (r.comments_count || 0) + 1 };
          }
          return r;
        })
      );
    } catch (err: any) {
      alert(err.message || "Izoh qo'shishda xatolik");
    } finally {
      setSubmittingComment(false);
    }
  };

  // Share reel
  const handleShare = (reel: any) => {
    const url = `${window.location.origin}/app/reels?id=${reel.id}`;
    if (navigator.share) {
      navigator.share({
        title: `${reel.anime_title} - Animem Reels`,
        text: reel.caption,
        url: url
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      alert("Reel havolasi nusxalandi!");
    }
  };

  // Handle video upload submit
  const handleUploadReelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError("Iltimos, video fayl tanlang");
      return;
    }
    if (!token) {
      openAuthModal();
      return;
    }

    setUploadError('');
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('video', uploadFile);
      formData.append('caption', uploadCaption);
      if (selectedAnimeId) formData.append('anime_id', selectedAnimeId);

      const res = await uploadReelVideo(formData, token);
      alert("Reel muvaffaqiyatli yuklandi!");
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadCaption('');
      setSelectedAnimeId('');
      loadReels();
    } catch (err: any) {
      setUploadError(err.message || "Video yuklashda xatolik yuz berdi");
    } finally {
      setIsUploading(false);
    }
  };

  // Touch Swipe Navigation for vertical reels
  const touchStartY = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY;

    if (diff > 50 && activeIndex < reels.length - 1) {
      // Swiped up -> next reel
      setActiveIndex(prev => prev + 1);
    } else if (diff < -50 && activeIndex > 0) {
      // Swiped down -> previous reel
      setActiveIndex(prev => prev - 1);
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-140px)] flex flex-col items-center justify-center space-y-3 bg-black">
        <Loader2 size={36} className="text-[#ff006a] animate-spin" />
        <span className="text-xs text-white/50 font-medium">Reels yuklanmoqda...</span>
      </div>
    );
  }

  const currentReel = reels[activeIndex];

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative w-full h-[calc(100vh-140px)] overflow-hidden bg-black select-none flex flex-col justify-between"
    >
      {/* Active Video Background */}
      {currentReel && (
        <div
          className="absolute inset-0 z-0 cursor-pointer"
          onDoubleClick={() => handleDoubleTap(currentReel)}
        >
          <video
            ref={(el) => (videoRefs.current[activeIndex] = el)}
            src={currentReel.video_url}
            poster={currentReel.poster_url}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Gradients */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/90 pointer-events-none" />
        </div>
      )}

      {/* Double tap heart animation */}
      {heartAnim && (
        <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center animate-ping">
          <Heart size={100} className="fill-[#ff006a] text-[#ff006a] drop-shadow-[0_0_30px_#ff006a]" />
        </div>
      )}

      {/* Top Header Bar */}
      <div className="relative z-10 p-4 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2">
          <span className="font-display font-black text-sm text-white tracking-wider flex items-center gap-1.5 drop-shadow">
            ANIMEM REELS <Sparkles size={14} className="text-[#ff006a]" />
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Upload Reel button */}
          <button
            onClick={() => {
              if (!user) openAuthModal();
              else setShowUploadModal(true);
            }}
            className="h-8 px-2.5 rounded-full bg-gradient-to-r from-[#ff006a] to-[#7928ca] text-white text-xs font-bold flex items-center gap-1 shadow-lg active:scale-95 transition-all"
          >
            <Plus size={14} />
            <span>Yuklash</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center active:scale-95 transition-all"
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>
      </div>

      {/* Vertical Navigation Indicator Arrows */}
      <div className="absolute top-1/2 right-2 -translate-y-1/2 z-20 flex flex-col gap-2 pointer-events-auto">
        {activeIndex > 0 && (
          <button
            onClick={() => setActiveIndex(prev => prev - 1)}
            className="w-7 h-7 rounded-full bg-black/50 border border-white/10 text-white/70 hover:text-white flex items-center justify-center backdrop-blur-sm"
          >
            <ChevronUp size={16} />
          </button>
        )}
        {activeIndex < reels.length - 1 && (
          <button
            onClick={() => setActiveIndex(prev => prev + 1)}
            className="w-7 h-7 rounded-full bg-black/50 border border-white/10 text-white/70 hover:text-white flex items-center justify-center backdrop-blur-sm"
          >
            <ChevronDown size={16} />
          </button>
        )}
      </div>

      {/* Floating Action Controls on Bottom */}
      {currentReel && (
        <div className="relative z-10 flex items-end justify-between p-4 pb-4 gap-3 pointer-events-auto">
          {/* Left Side: Caption and Info */}
          <div className="space-y-2 flex-1 max-w-[76%]">
            {currentReel.anime_title && (
              <span className="inline-block bg-[#ff006a] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-[0_0_12px_#ff006a]">
                {currentReel.anime_title}
              </span>
            )}
            <p className="text-xs text-white leading-relaxed font-medium drop-shadow whitespace-pre-wrap">
              {currentReel.caption}
            </p>

            {/* Jump to Full Anime Watch button */}
            {currentReel.anime_id && (
              <button
                onClick={() => navigate(`/watch/${currentReel.anime_id}`)}
                className="bg-white/15 hover:bg-white/25 border border-white/20 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-lg"
              >
                <Play size={12} className="fill-white" />
                <span>To'liq animeni ko'rish</span>
              </button>
            )}
          </div>

          {/* Right Side: Social Action Buttons */}
          <div className="flex flex-col items-center gap-4">
            {/* Like */}
            <button
              onClick={() => handleToggleLike(currentReel)}
              className="flex flex-col items-center gap-1 group active:scale-90 transition-transform"
            >
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md border transition-all ${
                  currentReel.is_liked
                    ? 'bg-[#ff006a] text-white border-[#ff006a] shadow-[0_0_20px_#ff006a]'
                    : 'bg-black/60 text-white border-white/20 hover:bg-black/80'
                }`}
              >
                <Heart size={20} className={currentReel.is_liked ? 'fill-current' : ''} />
              </div>
              <span className="text-[11px] font-black text-white drop-shadow">
                {currentReel.likes_count || 0}
              </span>
            </button>

            {/* Comment */}
            <button
              onClick={() => handleOpenComments(currentReel)}
              className="flex flex-col items-center gap-1 group active:scale-90 transition-transform"
            >
              <div className="w-11 h-11 rounded-full bg-black/60 text-white border border-white/20 flex items-center justify-center backdrop-blur-md hover:bg-black/80 transition-all">
                <MessageCircle size={20} />
              </div>
              <span className="text-[11px] font-black text-white drop-shadow">
                {currentReel.comments_count || 0}
              </span>
            </button>

            {/* Share */}
            <button
              onClick={() => handleShare(currentReel)}
              className="flex flex-col items-center gap-1 group active:scale-90 transition-transform"
            >
              <div className="w-11 h-11 rounded-full bg-black/60 text-white border border-white/20 flex items-center justify-center backdrop-blur-md hover:bg-black/80 transition-all">
                <Share2 size={20} />
              </div>
              <span className="text-[11px] font-black text-white drop-shadow">Ulashish</span>
            </button>
          </div>
        </div>
      )}

      {/* Comments Drawer Bottom Sheet */}
      {showComments && currentReel && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="flex-1" onClick={() => setShowComments(false)} />

          <div className="w-full max-w-md mx-auto bg-[#0f1016] border-t border-white/10 rounded-t-3xl overflow-hidden max-h-[70vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between shrink-0">
              <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                <MessageCircle size={14} className="text-[#ff006a]" />
                <span>Izohlar ({comments.length})</span>
              </h4>
              <button
                onClick={() => setShowComments(false)}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center"
              >
                <X size={14} />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
              {loadingComments ? (
                <div className="py-10 flex flex-col items-center justify-center space-y-2">
                  <Loader2 size={24} className="text-[#ff006a] animate-spin" />
                  <span className="text-xs text-white/40">Izohlar yuklanmoqda...</span>
                </div>
              ) : comments.length === 0 ? (
                <div className="py-10 text-center text-xs text-white/40">
                  Hozircha izohlar yo'q. Birinchi bo'lib fikr qoldiring!
                </div>
              ) : (
                comments.map((comm) => (
                  <div key={comm.id} className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-white/10 shrink-0">
                      {comm.user_avatar ? (
                        <img src={comm.user_avatar} alt={comm.user_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-xs text-[#ff006a] bg-[#1a1b2b]">
                          {comm.user_name?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white/90">{comm.user_name}</span>
                        <span className="text-[10px] text-white/40 font-mono">
                          {comm.created_at ? new Date(comm.created_at).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <p className="text-xs text-white/80 mt-0.5 break-words leading-relaxed">
                        {comm.comment || comm.text}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Input Bar */}
            <div className="p-3 bg-[#141522] border-t border-white/10 shrink-0">
              <form onSubmit={handleSendComment} className="flex items-center gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={user ? "Izoh qoldiring..." : "Izoh qoldirish uchun kiring..."}
                  className="flex-1 bg-[#1a1c2e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#ff006a]"
                />
                <button
                  type="submit"
                  disabled={submittingComment || !commentText.trim()}
                  className="px-3.5 py-2 rounded-xl bg-[#ff006a] text-white text-xs font-bold transition-all disabled:opacity-40 active:scale-95 shrink-0"
                >
                  {submittingComment ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Upload Reel Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#0f1016] border border-white/15 rounded-3xl p-5 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="space-y-1">
              <h3 className="font-display font-black text-base text-white flex items-center gap-2">
                <Film size={18} className="text-[#ff006a]" />
                <span>Reel Video Yuklash</span>
              </h3>
              <p className="text-xs text-white/50">
                Telefon galereyasidan sevimli anime epizodingizni yuklang (maksimal 60MB).
              </p>
            </div>

            {uploadError && (
              <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadReelSubmit} className="space-y-3">
              {/* File input */}
              <div className="border-2 border-dashed border-white/15 rounded-2xl p-4 text-center hover:border-[#ff006a]/50 transition-colors cursor-pointer relative bg-white/5">
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 60 * 1024 * 1024) {
                        setUploadError("Video hajmi 60MB dan oshmasligi kerak");
                        return;
                      }
                      setUploadFile(file);
                      setUploadError('');
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Upload size={24} className="mx-auto text-[#ff006a] mb-1" />
                <span className="text-xs font-bold text-white block">
                  {uploadFile ? uploadFile.name : "Video tanlash (galereyadan)"}
                </span>
                <span className="text-[10px] text-white/40 block mt-0.5">
                  MP4, WebM yoki MOV
                </span>
              </div>

              {/* Caption */}
              <div>
                <label className="text-[11px] font-bold text-white/70 block mb-1">
                  Tavsif (Caption)
                </label>
                <textarea
                  value={uploadCaption}
                  onChange={(e) => setUploadCaption(e.target.value)}
                  placeholder="Reel haqida yozing... #anime #action"
                  rows={2}
                  className="w-full bg-[#161726] border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#ff006a]"
                />
              </div>

              {/* Select Anime */}
              <div>
                <label className="text-[11px] font-bold text-white/70 block mb-1">
                  Tegishli anime (ixtiyoriy)
                </label>
                <select
                  value={selectedAnimeId}
                  onChange={(e) => setSelectedAnimeId(e.target.value)}
                  className="w-full bg-[#161726] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#ff006a]"
                >
                  <option value="">Animesiz</option>
                  {animesList.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isUploading || !uploadFile}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#ff006a] to-[#7928ca] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,0,106,0.4)] disabled:opacity-50 active:scale-95 transition-all"
              >
                {isUploading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Yuklanmoqda...</span>
                  </>
                ) : (
                  <>
                    <Upload size={15} />
                    <span>Reelni chop etish</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
