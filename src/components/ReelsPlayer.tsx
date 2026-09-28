import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, VolumeX, Play, Pause, Loader2 } from 'lucide-react';
import Hls from 'hls.js';

interface ReelsPlayerProps {
  id: string | number;
  url: string;
  poster?: string;
  title: string;
  isActive: boolean;
  shouldPreload?: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onDoubleTapLike?: () => void;
}

export default function ReelsPlayer({
  id,
  url,
  poster,
  title,
  isActive,
  shouldPreload = true,
  isMuted,
  onToggleMute,
  onDoubleTapLike,
}: ReelsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [showPlayIcon, setShowPlayIcon] = useState<boolean>(false);
  const [showHeartAnim, setShowHeartAnim] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const lastTapTimeRef = useRef<number>(0);
  const hasInitializedSrcRef = useRef<boolean>(false);

  // Play video with instant fallback handling
  const safePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = isMuted;
    const promise = video.play();
    if (promise !== undefined) {
      promise
        .then(() => {
          setIsPlaying(true);
          setIsLoading(false);
        })
        .catch((err) => {
          // If autoplay blocked with audio, fallback to muted autoplay
          if (err?.name === 'NotAllowedError' && !video.muted) {
            video.muted = true;
            video.play()
              .then(() => {
                setIsPlaying(true);
                setIsLoading(false);
              })
              .catch(() => {
                setIsPlaying(false);
              });
          } else {
            setIsPlaying(false);
          }
        });
    }
  }, [isMuted]);

  // Safe pause
  const safePause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setIsPlaying(false);
  }, []);

  // Initialize and attach video source only when needed (active or preloading)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!shouldPreload && !isActive) {
      // If far from active index, don't load heavy video data
      if (hasInitializedSrcRef.current) {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
        video.pause();
        video.removeAttribute('src');
        video.load();
        hasInitializedSrcRef.current = false;
        setIsReady(false);
        setIsLoading(false);
      }
      return;
    }

    // Initialize source if not initialized yet
    if (!hasInitializedSrcRef.current) {
      hasInitializedSrcRef.current = true;
      const isHlsUrl = url && (url.endsWith('.m3u8') || url.includes('/hls/'));

      if (isHlsUrl && Hls.isSupported()) {
        const hls = new Hls({
          maxBufferLength: 15,
          maxMaxBufferLength: 30,
          enableWorker: true,
          lowLatencyMode: true,
        });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsReady(true);
          setIsLoading(false);
          if (isActive) {
            safePlay();
          }
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                hlsRef.current = null;
                video.src = url;
                video.load();
                break;
            }
          }
        });
      } else {
        // Direct MP4 / Catbox stream / local blob
        video.src = url;
        video.preload = isActive ? 'auto' : 'metadata';
        
        const handleLoadedData = () => {
          setIsReady(true);
          setIsLoading(false);
          if (isActive) {
            safePlay();
          }
        };

        const handleCanPlay = () => {
          setIsReady(true);
          setIsLoading(false);
          if (isActive) {
            safePlay();
          }
        };

        video.addEventListener('loadeddata', handleLoadedData, { once: true });
        video.addEventListener('canplay', handleCanPlay, { once: true });

        // Force quick load
        video.load();
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [url, shouldPreload, isActive, safePlay]);

  // Handle active slide transitions (INSTANT play/pause)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      // If already has buffer, play immediately
      if (video.readyState >= 2) {
        safePlay();
      } else {
        setIsLoading(true);
        safePlay();
      }
    } else {
      safePause();
    }
  }, [isActive, safePlay, safePause]);

  // Handle mute changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = isMuted;
  }, [isMuted]);

  // Time update for progress bar
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const current = video.currentTime;
    const dur = video.duration || 1;
    setProgress((current / dur) * 100);
    if (isLoading) {
      setIsLoading(false);
    }
  };

  const handleVideoEnded = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    safePlay();
  };

  const handleTapOrClick = () => {
    const now = Date.now();
    if (now - lastTapTimeRef.current < 300) {
      if (onDoubleTapLike) {
        onDoubleTapLike();
        setShowHeartAnim(true);
        setTimeout(() => setShowHeartAnim(false), 900);
      }
      lastTapTimeRef.current = 0;
      return;
    }
    lastTapTimeRef.current = now;

    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      safePlay();
    } else {
      safePause();
    }
    setShowPlayIcon(true);
    setTimeout(() => setShowPlayIcon(false), 600);
  };

  return (
    <div 
      className="relative w-full h-full bg-black overflow-hidden select-none flex items-center justify-center cursor-pointer"
      onClick={handleTapOrClick}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      {/* Poster Background for Zero-Flash Smooth Transitions */}
      {poster && !isReady && (
        <img
          src={poster}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover filter blur-sm scale-105 opacity-80 transition-opacity duration-300 pointer-events-none"
        />
      )}

      {/* Video Element */}
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        webkit-playsinline="true"
        x5-playsinline="true"
        x5-video-player-type="h5-page"
        loop
        muted={isMuted}
        preload={isActive ? 'auto' : shouldPreload ? 'auto' : 'none'}
        crossOrigin="anonymous"
        disablePictureInPicture
        controlsList="nodownload noplaybackrate"
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleVideoEnded}
        onWaiting={() => {
          if (isActive) setIsLoading(true);
        }}
        onPlaying={() => {
          setIsLoading(false);
          setIsPlaying(true);
          setIsReady(true);
        }}
        onCanPlay={() => {
          setIsReady(true);
          if (isActive && !isPlaying) {
            safePlay();
          }
        }}
        className={`w-full h-full object-cover bg-black select-none transition-opacity duration-200 ${
          isReady ? 'opacity-100' : 'opacity-90'
        }`}
      />

      {/* Loading Spinner only when genuinely waiting/buffering while active */}
      {isLoading && isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none z-20">
          <Loader2 className="w-10 h-10 text-pink-500 animate-spin" />
        </div>
      )}

      {/* Invisible protective overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none" />

      {/* Floating Mute/Unmute Button in top right */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleMute();
        }}
        className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-black/50 backdrop-blur-md text-white hover:bg-black/70 transition-all shadow-lg active:scale-95 cursor-pointer"
        title={isMuted ? "Ovozni yoqish" : "Ovozni o'chirish"}
        aria-label="Toggle mute"
      >
        {isMuted ? <VolumeX className="w-5 h-5 text-white/90" /> : <Volume2 className="w-5 h-5 text-pink-400" />}
      </button>

      {/* Play/Pause Pulse Icon */}
      {showPlayIcon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 transition-all duration-300">
          <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white scale-110 shadow-2xl animate-fade-in">
            {isPlaying ? (
              <Play className="w-8 h-8 fill-white translate-x-0.5" />
            ) : (
              <Pause className="w-8 h-8 fill-white" />
            )}
          </div>
        </div>
      )}

      {/* Big Heart animation on double tap */}
      {showHeartAnim && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
          <svg
            className="w-28 h-28 text-pink-500 fill-pink-500 drop-shadow-[0_0_25px_rgba(236,72,153,0.8)] animate-bounce"
            viewBox="0 0 24 24"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>
      )}

      {/* Bottom Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-30 pointer-events-none">
        <div 
          className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

