import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Heart,
  MessageCircle,
  Share2,
  AlertTriangle,
  Trash2,
  Plus,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ChevronUp,
  ChevronDown,
  Film,
  Music2,
  Check,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { Reel } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { ReelCommentsDrawer } from "../components/ReelCommentsDrawer";
import { ReelReportModal } from "../components/ReelReportModal";
import { ReelUploadModal } from "../components/ReelUploadModal";

// Helper to shuffle array randomly (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// TikTok-style vertical slide transition variants (tuned for ultra-smooth 60fps mobile playback)
const slideVariants = {
  enter: (direction: number) => ({
    y: direction > 0 ? "100%" : "-100%",
    opacity: 0.9,
  }),
  center: {
    y: 0,
    opacity: 1,
    transition: {
      y: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
      opacity: { duration: 0.16 },
    },
  },
  exit: (direction: number) => ({
    y: direction > 0 ? "-100%" : "100%",
    opacity: 0.9,
    transition: {
      y: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
      opacity: { duration: 0.16 },
    },
  }),
};

export default function Reels() {
  const { id: routeReelId } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const [reels, setReels] = useState<Reel[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);

  // Modals & Drawers
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Heart explosion animation for double-tap
  const [heartExplosion, setHeartExplosion] = useState<{ x: number; y: number; show: boolean }>({
    x: 0,
    y: 0,
    show: false,
  });

  // Current user info
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const bgVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const touchStartXRef = useRef<number>(0);
  const touchStartTimeRef = useRef<number>(0);
  const isSwipingRef = useRef<boolean>(false);
  const isTransitioningRef = useRef<boolean>(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch (_) {}
  }, []);

  // Fetch Reels
  const fetchReels = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      let url = "/api/reels?limit=20";
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        let fetched: Reel[] = data.reels || [];

        // If specific reel was opened by URL (/reels/:id)
        if (routeReelId) {
          let targetReel = fetched.find((r) => r.id === routeReelId);
          if (!targetReel) {
            try {
              const singleRes = await fetch(`/api/reels/${routeReelId}`, { headers });
              if (singleRes.ok) {
                targetReel = await singleRes.json();
              }
            } catch (_) {}
          }
          const otherReels = shuffleArray(fetched.filter((r) => r.id !== routeReelId));
          if (targetReel) {
            fetched = [targetReel, ...otherReels];
          } else {
            fetched = otherReels;
          }
          setCurrentIndex(0);
        } else {
          // Randomize reels order on each session so each visit is fresh and exciting
          fetched = shuffleArray(fetched);
          setCurrentIndex(0);
        }

        setReels(fetched);
      }
    } catch (err) {
      console.error("Failed to load reels:", err);
    } finally {
      setLoading(false);
    }
  }, [routeReelId]);

  useEffect(() => {
    fetchReels();
  }, [fetchReels]);

  // Sync active reel with URL and register view count
  const currentReel = reels[currentIndex];

  useEffect(() => {
    if (!currentReel) return;

    // Update URL quietly without full reload
    const currentPath = `/reels/${currentReel.id}`;
    if (window.location.pathname !== currentPath) {
      window.history.replaceState(null, "", currentPath);
    }

    // Register view count
    try {
      fetch(`/api/reels/${currentReel.id}/view`, { method: "POST" }).catch(() => {});
    } catch (_) {}

    // Auto-play active video
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        // If autoplay blocked with audio, try muted
        if (videoRef.current) {
          videoRef.current.muted = true;
          setIsMuted(true);
          videoRef.current.play().catch(() => {});
        }
      });
    }
    if (bgVideoRef.current) {
      bgVideoRef.current.currentTime = 0;
      bgVideoRef.current.play().catch(() => {});
    }
  }, [currentIndex, currentReel?.id]);

  // Next 4 videos to preload in advance for instant buffer-free playback
  const preloadedReels = reels.slice(currentIndex + 1, currentIndex + 5);

  const goToNext = useCallback(() => {
    if (currentIndex < reels.length - 1) {
      setDirection(1);
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, reels.length]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  // Mouse Wheel navigation (TikTok web style: scroll down = next, scroll up = prev)
  useEffect(() => {
    let wheelTimer: any = null;
    const handleWheel = (e: WheelEvent) => {
      if (commentsOpen || reportOpen || uploadOpen) return;
      if (Math.abs(e.deltaY) < 25) return;
      if (wheelTimer) return;

      if (e.deltaY > 0) {
        goToNext();
      } else {
        goToPrev();
      }
      wheelTimer = setTimeout(() => {
        wheelTimer = null;
      }, 400);
    };

    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => {
      window.removeEventListener("wheel", handleWheel);
      if (wheelTimer) clearTimeout(wheelTimer);
    };
  }, [goToNext, goToPrev, commentsOpen, reportOpen, uploadOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (commentsOpen || reportOpen || uploadOpen) return;
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        goToNext();
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        goToPrev();
      } else if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        setIsMuted((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrev, commentsOpen, reportOpen, uploadOpen]);

  // Ultra-Lightweight & Stable Mobile Touch Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (commentsOpen || reportOpen || uploadOpen) return;
    touchStartYRef.current = e.touches[0].clientY;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartTimeRef.current = Date.now();
    isSwipingRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwipingRef.current || isTransitioningRef.current) return;
    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const deltaY = touchStartYRef.current - currentY;
    const deltaX = touchStartXRef.current - currentX;

    // If gesture is clearly vertical, suppress page scrolling
    if (Math.abs(deltaY) > 8 && Math.abs(deltaY) > Math.abs(deltaX)) {
      if (e.cancelable) {
        e.preventDefault();
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isSwipingRef.current || isTransitioningRef.current) return;
    isSwipingRef.current = false;
    if (commentsOpen || reportOpen || uploadOpen) return;

    const touchEndY = e.changedTouches[0].clientY;
    const touchEndX = e.changedTouches[0].clientX;
    const diffY = touchStartYRef.current - touchEndY;
    const diffX = touchStartXRef.current - touchEndX;
    const deltaTime = Date.now() - touchStartTimeRef.current;

    // Detect either a quick flick (fast swipe < 280ms) or a deliberate drag (> 35px)
    const isQuickFlick = deltaTime < 280 && Math.abs(diffY) > 24;
    const isLongSwipe = Math.abs(diffY) > 38;

    // Must be predominantly vertical (|diffY| > |diffX| * 1.1) to avoid horizontal misfires
    if ((isQuickFlick || isLongSwipe) && Math.abs(diffY) > Math.abs(diffX) * 1.1) {
      isTransitioningRef.current = true;
      setTimeout(() => {
        isTransitioningRef.current = false;
      }, 300);

      if (diffY > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
  };

  // Toggle Play/Pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      if (bgVideoRef.current) bgVideoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      if (bgVideoRef.current) bgVideoRef.current.pause();
      setIsPlaying(false);
    }
    setShowPlayIcon(true);
    setTimeout(() => setShowPlayIcon(false), 500);
  };

  // Handle Double-tap / Single click on Video
  const handleVideoClick = (e: React.MouseEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap -> trigger Like!
      const rect = e.currentTarget.getBoundingClientRect();
      setHeartExplosion({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        show: true,
      });
      setTimeout(() => {
        setHeartExplosion((prev) => ({ ...prev, show: false }));
      }, 800);

      if (!currentReel?.is_liked) {
        handleLike();
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      setTimeout(() => {
        if (lastTapRef.current === now) {
          togglePlay();
        }
      }, DOUBLE_TAP_DELAY);
    }
  };

  // Handle Like Toggle
  const handleLike = async () => {
    if (!currentReel) return;
    if (!currentUser) {
      alert("Like bosish uchun tizimga kiring!");
      return;
    }

    const prevLiked = currentReel.is_liked;
    const prevCount = currentReel.likes_count;

    // Optimistic update
    setReels((prev) =>
      prev.map((r, i) =>
        i === currentIndex
          ? {
              ...r,
              is_liked: !prevLiked,
              likes_count: prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1,
            }
          : r
      )
    );

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/reels/${currentReel.id}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReels((prev) =>
          prev.map((r, i) =>
            i === currentIndex
              ? { ...r, is_liked: data.liked, likes_count: data.likes_count }
              : r
          )
        );
      }
    } catch (err) {
      // Revert on failure
      setReels((prev) =>
        prev.map((r, i) =>
          i === currentIndex
            ? { ...r, is_liked: prevLiked, likes_count: prevCount }
            : r
        )
      );
    }
  };

  // Handle Share / Copy Link
  const handleShare = async () => {
    if (!currentReel) return;
    const shareUrl = `${window.location.origin}/reels/${currentReel.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Animem Reels",
          text: currentReel.caption || "Animem.uz qiziqarli reels videosi!",
          url: shareUrl,
        });
        return;
      } catch (_) {}
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (_) {
      prompt("Havolani nusxalang:", shareUrl);
    }
  };

  // Handle Delete Reel (owner or admin)
  const handleDeleteReel = async () => {
    if (!currentReel) return;
    if (!confirm("Haqiqatan ham ushbu reelni butunlay o'chirmoqchimisiz?")) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/reels/${currentReel.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setReels((prev) => prev.filter((r) => r.id !== currentReel.id));
        if (currentIndex >= reels.length - 1 && currentIndex > 0) {
          setCurrentIndex((prev) => prev - 1);
        }
      } else {
        const err = await res.json();
        alert(err.error || "O'chirishda xatolik");
      }
    } catch (err) {
      alert("Tarmoq xatosi");
    }
  };

  const isOwner = currentUser && currentReel && String(currentUser.id) === String(currentReel.user_id);
  const isAdmin = currentUser && currentUser.role === "admin";

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-40 bg-black flex items-center justify-center overflow-hidden select-none"
      style={{ touchAction: "none" }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 4 Invisible Preloader Videos (0ms buffer-free swipe transition) */}
      <div className="hidden" aria-hidden="true">
        {preloadedReels.map((pReel) => (
          <video
            key={`preload-${pReel.id}`}
            src={pReel.video_url}
            preload="auto"
            muted
          />
        ))}
      </div>

      {/* Top Floating Bar */}
      <div className="absolute top-0 left-0 right-0 z-30 px-4 py-3 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition"
            title="Orqaga"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5 font-black text-lg tracking-wider text-white">
            <span className="bg-gradient-to-r from-pink-500 to-indigo-500 bg-clip-text text-transparent">
              ANIMEM
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/30">
              REELS
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Upload Button */}
          <button
            onClick={() => {
              if (!currentUser) {
                alert("Reel yuklash uchun tizimga kiring!");
                return;
              }
              setUploadOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-pink-600/30 active:scale-95 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Yuklash</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setIsMuted((prev) => !prev)}
            className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition"
            title={isMuted ? "Ovozni yoqish" : "Ovozni o'chirish"}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Main Video Viewport (Centered 9:16 Card) */}
      <div className="relative w-full h-full max-w-[480px] bg-zinc-950 flex items-center justify-center overflow-hidden shadow-2xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 text-zinc-400">
            <Loader2 className="w-10 h-10 animate-spin text-pink-500" />
            <p className="text-sm font-medium">Reels yuklanmoqda...</p>
          </div>
        ) : reels.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 text-center p-6 text-zinc-400">
            <Film className="w-16 h-16 text-zinc-600" />
            <div>
              <h3 className="text-lg font-bold text-white">Hozircha hech qanday Reel yo'q</h3>
              <p className="text-xs text-zinc-500 mt-1">
                Birinchi bo'lib qiziqarli video yuklang va jamoaga ulashing!
              </p>
            </div>
            <button
              onClick={() => setUploadOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-sm font-semibold transition"
            >
              Birinchi Reelni yuklash
            </button>
          </div>
        ) : currentReel ? (
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={currentReel.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.25}
              onDragEnd={(_, info) => {
                const threshold = 35;
                const velocityThreshold = 250;
                if (info.offset.y < -threshold || info.velocity.y < -velocityThreshold) {
                  goToNext();
                } else if (info.offset.y > threshold || info.velocity.y > velocityThreshold) {
                  goToPrev();
                }
              }}
              className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden touch-none"
            >
              {/* Ambient Blurred Backdrop for non-9:16 aspect ratios */}
              <video
                ref={bgVideoRef}
                key={`bg-${currentReel.id}`}
                src={currentReel.video_url}
                loop
                playsInline
                autoPlay
                muted
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-40 scale-125 pointer-events-none select-none"
              />

              {/* Active Video - Fully responsive & adaptive for all aspect ratios (9:16, 16:9, 1:1, etc.) */}
              <video
                ref={videoRef}
                key={currentReel.id}
                src={currentReel.video_url}
                loop
                playsInline
                autoPlay
                muted={isMuted}
                onClick={handleVideoClick}
                className="w-full h-full object-contain relative z-10 cursor-pointer"
              />

              {/* Play/Pause Animated Icon Pop */}
              {showPlayIcon && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  <div className="p-4 bg-black/50 backdrop-blur-md rounded-full text-white animate-in zoom-in duration-200">
                    {isPlaying ? <Play className="w-10 h-10" /> : <Pause className="w-10 h-10" />}
                  </div>
                </div>
              )}

              {/* Double Tap Heart Explosion Animation */}
              {heartExplosion.show && (
                <div
                  className="absolute pointer-events-none z-30 transform -translate-x-1/2 -translate-y-1/2 animate-bounce"
                  style={{ left: heartExplosion.x, top: heartExplosion.y }}
                >
                  <Heart className="w-24 h-24 fill-red-500 text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]" />
                </div>
              )}

              {/* Right Action Buttons */}
              <div
                onPointerDownCapture={(e) => e.stopPropagation()}
                className="absolute right-3 bottom-20 z-20 flex flex-col items-center gap-5"
              >
                {/* Creator Avatar */}
                <Link
                  to={`/profil?user=${currentReel.user_id}`}
                  className="relative group block"
                  title={currentReel.user_name}
                >
                  <img
                    src={currentReel.user_avatar || "https://image.animem.uz/logo.png"}
                    alt={currentReel.user_name}
                    className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-lg group-hover:scale-105 transition"
                    onError={(e: any) => {
                      e.target.src = "https://image.animem.uz/logo.png";
                    }}
                  />
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-pink-600 rounded-full p-0.5 text-white shadow">
                    <Plus className="w-2.5 h-2.5" />
                  </div>
                </Link>

                {/* Like Button */}
                <button
                  onClick={handleLike}
                  className="flex flex-col items-center gap-1 text-white group active:scale-90 transition"
                >
                  <div
                    className={`p-2.5 rounded-full backdrop-blur-md transition ${
                      currentReel.is_liked
                        ? "bg-red-500/20 text-red-500"
                        : "bg-black/40 text-white hover:bg-black/60"
                    }`}
                  >
                    <Heart
                      className={`w-7 h-7 transition ${
                        currentReel.is_liked ? "fill-red-500 scale-110" : ""
                      }`}
                    />
                  </div>
                  <span className="text-xs font-semibold drop-shadow">
                    {currentReel.likes_count}
                  </span>
                </button>

                {/* Comments Button */}
                <button
                  onClick={() => setCommentsOpen(true)}
                  className="flex flex-col items-center gap-1 text-white group active:scale-90 transition"
                >
                  <div className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md transition">
                    <MessageCircle className="w-7 h-7" />
                  </div>
                  <span className="text-xs font-semibold drop-shadow">
                    {currentReel.comments_count}
                  </span>
                </button>

                {/* Share Button */}
                <button
                  onClick={handleShare}
                  className="flex flex-col items-center gap-1 text-white group active:scale-90 transition"
                >
                  <div className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md transition">
                    {copiedLink ? (
                      <Check className="w-7 h-7 text-emerald-400" />
                    ) : (
                      <Share2 className="w-7 h-7" />
                    )}
                  </div>
                  <span className="text-xs font-semibold drop-shadow">
                    {copiedLink ? "Nusxalandi" : "Ulashish"}
                  </span>
                </button>

                {/* Report Button */}
                <button
                  onClick={() => setReportOpen(true)}
                  className="flex flex-col items-center gap-1 text-zinc-400 hover:text-amber-400 group active:scale-90 transition"
                  title="Shikoyat qilish"
                >
                  <div className="p-2 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-md transition">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-medium drop-shadow">Shikoyat</span>
                </button>

                {/* Delete Button (Owner or Admin) */}
                {(isOwner || isAdmin) && (
                  <button
                    onClick={handleDeleteReel}
                    className="flex flex-col items-center gap-1 text-zinc-400 hover:text-red-400 group active:scale-90 transition"
                    title="O'chirish"
                  >
                    <div className="p-2 rounded-full bg-black/30 hover:bg-red-500/20 backdrop-blur-md transition">
                      <Trash2 className="w-5 h-5 text-red-400" />
                    </div>
                    <span className="text-[10px] font-medium drop-shadow">O'chirish</span>
                  </button>
                )}
              </div>

              {/* Bottom Overlay: Creator info, caption, sound */}
              <div
                onPointerDownCapture={(e) => e.stopPropagation()}
                className="absolute left-0 right-16 bottom-0 z-20 p-4 pb-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col gap-2"
              >
                {/* Creator Name */}
                <div className="flex items-center gap-2">
                  <Link
                    to={`/profil?user=${currentReel.user_id}`}
                    className="font-bold text-white text-sm hover:underline drop-shadow flex items-center gap-1.5"
                  >
                    <span>@{currentReel.user_name}</span>
                  </Link>
                  <span className="text-[10px] text-zinc-400 font-normal">
                    {currentReel.views_count} ko'rildi
                  </span>
                </div>

                {/* Caption */}
                {currentReel.caption && (
                  <p className="text-xs text-zinc-100 drop-shadow line-clamp-3 leading-relaxed">
                    {currentReel.caption}
                  </p>
                )}

                {/* Anime Link Badge (if attached) */}
                {currentReel.anime_title && (
                  <div className="pt-1">
                    <Link
                      to={currentReel.anime_id ? `/anime/${currentReel.anime_id}` : `/animelar?search=${encodeURIComponent(currentReel.anime_title)}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur-md border border-white/20 transition group"
                    >
                      <Film className="w-3.5 h-3.5 text-pink-400 group-hover:rotate-12 transition-transform" />
                      <span className="truncate max-w-[200px]">
                        {currentReel.anime_title}
                      </span>
                    </Link>
                  </div>
                )}

                {/* Music / Audio Indicator */}
                <div className="flex items-center gap-2 pt-1 text-[11px] text-zinc-300 drop-shadow">
                  <Music2 className="w-3.5 h-3.5 animate-spin text-pink-400" />
                  <span className="truncate">Animem Reels Original Sound</span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : null}
      </div>

      {/* Desktop Up/Down Navigation Arrows */}
      <div className="hidden md:flex flex-col gap-3 absolute right-6 top-1/2 -translate-y-1/2 z-30">
        <button
          onClick={goToPrev}
          disabled={currentIndex === 0}
          className="p-3.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 disabled:opacity-20 disabled:pointer-events-none text-white border border-white/10 shadow-2xl transition hover:scale-110 active:scale-95 cursor-pointer"
          title="Oldingi video (Tepaga / ArrowUp)"
        >
          <ChevronUp className="w-6 h-6" />
        </button>
        <button
          onClick={goToNext}
          disabled={currentIndex >= reels.length - 1}
          className="p-3.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 disabled:opacity-20 disabled:pointer-events-none text-white border border-white/10 shadow-2xl transition hover:scale-110 active:scale-95 cursor-pointer"
          title="Keyingi video (Pastga / ArrowDown)"
        >
          <ChevronDown className="w-6 h-6" />
        </button>
      </div>

      {/* Comments Drawer */}
      {currentReel && (
        <ReelCommentsDrawer
          isOpen={commentsOpen}
          onClose={() => setCommentsOpen(false)}
          reelId={currentReel.id}
          currentUser={currentUser}
          onCommentCountChange={(newCount) => {
            setReels((prev) =>
              prev.map((r, i) =>
                i === currentIndex ? { ...r, comments_count: newCount } : r
              )
            );
          }}
        />
      )}

      {/* Report Modal */}
      {currentReel && (
        <ReelReportModal
          isOpen={reportOpen}
          onClose={() => setReportOpen(false)}
          reelId={currentReel.id}
        />
      )}

      {/* Upload Modal */}
      <ReelUploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        currentUser={currentUser}
        onSuccess={(newReel) => {
          setReels((prev) => [newReel, ...prev]);
          setCurrentIndex(0);
        }}
      />
    </div>
  );
}
