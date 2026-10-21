import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  ArrowLeft,
  Settings,
  Layers,
  SkipForward,
  Sun,
  Loader2,
  Server,
  AlertCircle,
  ExternalLink,
  Check,
  Smartphone,
  Gauge
} from 'lucide-react';
import { Episode } from '../types';
import { EpisodeDrawer } from './EpisodeDrawer';
import { useAuth } from '../context/AuthContext';

interface ProVideoPlayerProps {
  animeId: string | number;
  animeTitle: string;
  episodes: Episode[];
  currentEpisodeNumber: number;
  onEpisodeChange: (newEpNum: number) => void;
  posterUrl?: string;
}

export const ProVideoPlayer: React.FC<ProVideoPlayerProps> = ({
  animeId,
  animeTitle,
  episodes,
  currentEpisodeNumber,
  onEpisodeChange,
  posterUrl,
}) => {
  const navigate = useNavigate();
  const { saveWatchProgress } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Player settings
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [brightness, setBrightness] = useState(1);
  const [objectFit, setObjectFit] = useState<'contain' | 'cover'>('contain');
  const [autoNext, setAutoNext] = useState(true);
  const [selectedServer, setSelectedServer] = useState<'main' | 'backup'>('main');

  // Overlays & Drawers
  const [showSettings, setShowSettings] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [skipNotice, setSkipNotice] = useState<{ text: string; side: 'left' | 'right' } | null>(null);

  // Active episode object
  const currentEp = episodes.find((e) => Number(e.episode_number) === Number(currentEpisodeNumber)) || episodes[0];
  const nextEp = episodes.find((e) => Number(e.episode_number) === Number(currentEpisodeNumber) + 1);

  // Determine current playable source
  const videoSource = React.useMemo(() => {
    if (!currentEp) return '';
    if (selectedServer === 'backup' && currentEp.backup_video_url) {
      return currentEp.backup_video_url;
    }
    return currentEp.video_url || currentEp.backup_video_url || '';
  }, [currentEp, selectedServer]);

  // Reset states on episode change
  useEffect(() => {
    setHasError(false);
    setErrorMessage('');
    setIsLoading(true);
    setCurrentTime(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.load();
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {
        setIsPlaying(false);
        setIsLoading(false);
      });
    }
  }, [videoSource]);

  // Auto-hide controls timer
  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      return;
    }
    const timer = setTimeout(() => {
      setShowControls(false);
      setShowSettings(false);
    }, 4000);

    return () => clearTimeout(timer);
  }, [isPlaying, showControls, showSettings]);

  // Video time update and progress saving
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    setCurrentTime(curr);

    // Update buffered amount
    if (videoRef.current.buffered.length > 0) {
      try {
        const buffered = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
        setBufferedEnd(buffered);
      } catch (e) {}
    }

    if (Math.floor(curr) % 10 === 0 && curr > 2) {
      saveWatchProgress(animeId, currentEpisodeNumber);
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration || 0);
    setIsLoading(false);
    setHasError(false);
  };

  const handleVideoError = () => {
    setIsLoading(false);
    setHasError(true);
    setErrorMessage("Ushbu serverdan videoni yuklab bo'lmadi");
  };

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
        setHasError(false);
      }).catch((err) => {
        console.warn("Play error:", err);
      });
    }
  }, [isPlaying]);

  const handleSeek = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, seconds));
    setCurrentTime(seconds);
  };

  // Double tap to skip 10 seconds (left or right)
  const handleDoubleTap = (side: 'left' | 'right') => {
    if (!videoRef.current) return;
    if (side === 'left') {
      const newTime = Math.max(0, videoRef.current.currentTime - 10);
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      setSkipNotice({ text: '-10s', side: 'left' });
    } else {
      const newTime = Math.min(duration, videoRef.current.currentTime + 10);
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      setSkipNotice({ text: '+10s', side: 'right' });
    }
    setTimeout(() => setSkipNotice(null), 900);
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
        }
        setIsFullscreen(true);
        // Try orientation lock if supported on Android
        if ((screen.orientation as any)?.lock) {
          (screen.orientation as any).lock('landscape').catch(() => {});
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
        setIsFullscreen(false);
        if ((screen.orientation as any)?.unlock) {
          (screen.orientation as any).unlock();
        }
      }
    } catch (err) {
      console.warn("Fullscreen toggle error:", err);
    }
  };

  // Fullscreen change listener
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleDoubleTap('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleDoubleTap('right');
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key.toLowerCase() === 'm') {
        if (videoRef.current) {
          videoRef.current.muted = !videoRef.current.muted;
          setIsMuted(videoRef.current.muted);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay]);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const serverDisplayName = currentEp?.server_name || "TAS-IX Ultra (1080p FHD)";

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden bg-black select-none ${
        isFullscreen ? 'fixed inset-0 z-50 h-screen w-screen' : 'aspect-video rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.9)] border border-white/10'
      }`}
      style={{ filter: `brightness(${brightness})` }}
      onClick={() => setShowControls((prev) => !prev)}
      onMouseMove={() => setShowControls(true)}
    >
      {/* HTML5 Native Video Stream */}
      <video
        ref={videoRef}
        src={videoSource}
        poster={posterUrl}
        playsInline
        preload="auto"
        className={`w-full h-full ${objectFit === 'cover' ? 'object-cover' : 'object-contain'}`}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => {
          setIsLoading(false);
          setIsPlaying(true);
          setHasError(false);
        }}
        onError={handleVideoError}
        onEnded={() => {
          setIsPlaying(false);
          if (autoNext && nextEp) {
            onEpisodeChange(Number(nextEp.episode_number));
          }
        }}
      />

      {/* Loading State Spinner */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 pointer-events-none z-20 space-y-2">
          <Loader2 size={42} className="text-[#ff006a] animate-spin drop-shadow-[0_0_20px_#ff006a]" />
          <span className="text-[11px] font-bold text-white/80 tracking-wide bg-black/60 px-3 py-1 rounded-full border border-white/10">
            TAS-IX Oqimi Yuklanmoqda...
          </span>
        </div>
      )}

      {/* Double Tap Skip Indicator */}
      {skipNotice && (
        <div
          className={`absolute top-1/2 -translate-y-1/2 z-25 pointer-events-none flex items-center justify-center ${
            skipNotice.side === 'left' ? 'left-12' : 'right-12'
          }`}
        >
          <div className="bg-black/85 backdrop-blur-md px-4 py-2.5 rounded-full text-white text-xs font-black border border-[#ff006a]/60 shadow-[0_0_25px_rgba(255,0,106,0.7)] flex items-center gap-1.5 animate-pulse">
            {skipNotice.side === 'left' ? <RotateCcw size={14} /> : <RotateCw size={14} />}
            <span>{skipNotice.text}</span>
          </div>
        </div>
      )}

      {/* Gesture Tap Zones (Left 30% for rewind, Right 30% for forward) */}
      <div
        className="absolute inset-y-0 left-0 w-3/12 z-20 cursor-pointer"
        onDoubleClick={(e) => {
          e.stopPropagation();
          handleDoubleTap('left');
        }}
      />
      <div
        className="absolute inset-y-0 right-0 w-3/12 z-20 cursor-pointer"
        onDoubleClick={(e) => {
          e.stopPropagation();
          handleDoubleTap('right');
        }}
      />

      {/* Stream Error Notification Card */}
      {hasError && (
        <div className="absolute inset-0 z-35 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="max-w-xs w-full bg-[#12131d] border border-white/10 rounded-2xl p-4 text-center space-y-3 shadow-2xl">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#ff006a]/20 border border-[#ff006a]/40 flex items-center justify-center text-[#ff006a]">
              <AlertCircle size={24} />
            </div>
            <div>
              <h4 className="text-sm font-black text-white">Video yuklanmadi</h4>
              <p className="text-xs text-white/60 mt-1">
                {errorMessage || "Tarmoq xatoligi yoki stream server javob bermadi."}
              </p>
            </div>
            <div className="space-y-2 pt-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setHasError(false);
                  setIsLoading(true);
                  if (videoRef.current) {
                    videoRef.current.load();
                    videoRef.current.play().catch(() => {});
                  }
                }}
                className="w-full py-2 bg-[#ff006a] hover:bg-[#ff006a]/90 text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(255,0,106,0.4)]"
              >
                Qayta urinib ko'rish
              </button>

              {videoSource && (
                <a
                  href={videoSource}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="w-full py-2 bg-white/5 hover:bg-white/10 text-white/80 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <ExternalLink size={13} />
                  <span>Brauzerda to'g'ridan-to'g'ri ochish</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modern Player Controls Overlay */}
      <div
        className={`absolute inset-0 z-30 flex flex-col justify-between p-3.5 sm:p-5 bg-gradient-to-t from-black/90 via-black/25 to-black/80 transition-opacity duration-300 pointer-events-auto ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => {
                if (isFullscreen) {
                  toggleFullscreen();
                } else {
                  navigate(-1);
                }
              }}
              aria-label="Orqaga"
              className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-white/15 active:scale-90 transition-all shrink-0"
            >
              <ArrowLeft size={16} />
            </button>

            <div className="truncate">
              <h3 className="text-xs sm:text-sm font-black text-white truncate max-w-[200px] sm:max-w-md drop-shadow">
                {animeTitle}
              </h3>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-[#00dfd8] font-bold">
                  {currentEpisodeNumber}-qism
                </span>
                <span className="text-white/40">•</span>
                <span className="text-white/60 font-mono truncate max-w-[150px]">
                  {serverDisplayName}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Episode List Trigger */}
            <button
              onClick={() => setShowDrawer(true)}
              className="bg-black/60 hover:bg-black/90 text-white text-xs font-bold px-2.5 py-1.5 rounded-xl border border-white/15 flex items-center gap-1.5 active:scale-95 transition-all shadow"
            >
              <Layers size={14} className="text-[#00dfd8]" />
              <span className="text-[11px]">Qismlar</span>
            </button>

            {/* Settings Trigger */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              aria-label="Sozlamalar"
              className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                showSettings
                  ? 'bg-[#ff006a] border-[#ff006a] text-white shadow-[0_0_12px_#ff006a]'
                  : 'bg-black/60 hover:bg-black/90 border-white/15 text-white'
              }`}
            >
              <Settings size={15} />
            </button>
          </div>
        </div>

        {/* Center Main Play / Seek Controls */}
        <div className="flex items-center justify-center gap-6 sm:gap-8">
          {/* -10s Rewind */}
          <button
            onClick={() => handleDoubleTap('left')}
            aria-label="10 soniya orqaga"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center active:scale-90 transition-transform border border-white/10"
          >
            <RotateCcw size={18} />
          </button>

          {/* Big Play / Pause */}
          <button
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pauza' : 'Ijro etish'}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#ff006a] text-white flex items-center justify-center shadow-[0_0_30px_rgba(255,0,106,0.65)] hover:scale-105 active:scale-95 transition-all"
          >
            {isPlaying ? (
              <Pause size={26} className="fill-white" />
            ) : (
              <Play size={26} className="fill-white ml-1" />
            )}
          </button>

          {/* +10s Forward */}
          <button
            onClick={() => handleDoubleTap('right')}
            aria-label="10 soniya oldinga"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center active:scale-90 transition-transform border border-white/10"
          >
            <RotateCw size={18} />
          </button>
        </div>

        {/* Bottom Timeline & Control Bar */}
        <div className="space-y-2 pt-2">
          {/* Seekbar with buffered indicator */}
          <div className="relative flex items-center group/scrubber cursor-pointer">
            <div className="relative w-full h-1.5 group-hover/scrubber:h-2.5 transition-all bg-white/20 rounded-full overflow-hidden">
              {/* Buffered progress bar */}
              <div
                className="absolute inset-y-0 left-0 bg-white/30 transition-all duration-200"
                style={{ width: `${duration ? (bufferedEnd / duration) * 100 : 0}%` }}
              />
              {/* Played progress bar */}
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#ff006a] to-[#7928ca] shadow-[0_0_10px_#ff006a]"
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>

            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.5}
              value={currentTime}
              onChange={(e) => handleSeek(Number(e.target.value))}
              aria-label="Video vaqti"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          {/* Control Buttons & Timestamps */}
          <div className="flex items-center justify-between text-xs">
            {/* Left: Time and Volume */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-white/90">
                {formatTime(currentTime)} <span className="text-white/40">/</span> {formatTime(duration)}
              </span>

              {/* Volume */}
              <div className="flex items-center gap-1.5 group/vol">
                <button
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.muted = !isMuted;
                      setIsMuted(!isMuted);
                    }
                  }}
                  aria-label="Ovoz"
                  className="text-white/80 hover:text-white transition-colors"
                >
                  {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>

                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const newVol = Number(e.target.value);
                    setVolume(newVol);
                    if (videoRef.current) {
                      videoRef.current.volume = newVol;
                      videoRef.current.muted = newVol === 0;
                      setIsMuted(newVol === 0);
                    }
                  }}
                  className="w-16 h-1 bg-white/20 rounded accent-[#ff006a] hidden sm:block"
                />
              </div>

              {/* Next Episode Button */}
              {nextEp && (
                <button
                  onClick={() => onEpisodeChange(Number(nextEp.episode_number))}
                  className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-white/80 hover:text-white bg-white/10 hover:bg-white/15 px-2.5 py-1 rounded-lg transition-all"
                >
                  <SkipForward size={13} />
                  <span>Keyingi qism ({nextEp.episode_number})</span>
                </button>
              )}
            </div>

            {/* Right: Speed & Fullscreen */}
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] font-bold text-[#00dfd8] bg-[#00dfd8]/10 border border-[#00dfd8]/20 px-2 py-0.5 rounded-md">
                {playbackSpeed}x
              </span>

              <button
                onClick={toggleFullscreen}
                aria-label="To'liq ekran"
                className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 transition-all"
              >
                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Panel Popover */}
      {showSettings && (
        <div
          className="absolute top-14 right-3.5 z-40 bg-[#0f1016]/95 backdrop-blur-xl border border-white/15 rounded-2xl p-4 w-64 shadow-[0_15px_40px_rgba(0,0,0,0.85)] space-y-3.5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Settings size={13} className="text-[#00dfd8]" />
              <span>Player Sozlamalari</span>
            </h4>
            <span className="text-[10px] text-[#ff006a] font-black uppercase">PRO</span>
          </div>

          {/* Speed Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-white/50 uppercase font-black flex items-center gap-1">
              <Gauge size={11} /> Tezlik
            </label>
            <div className="grid grid-cols-5 gap-1 text-xs">
              {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
                <button
                  key={spd}
                  onClick={() => {
                    if (videoRef.current) videoRef.current.playbackRate = spd;
                    setPlaybackSpeed(spd);
                  }}
                  className={`py-1 rounded-lg font-bold text-[11px] transition-all ${
                    playbackSpeed === spd
                      ? 'bg-[#ff006a] text-white shadow-[0_0_10px_#ff006a]'
                      : 'bg-white/5 text-white/60 hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* Server / Quality Selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-white/50 uppercase font-black flex items-center gap-1">
              <Server size={11} /> Server & Sifat
            </label>
            <div className="space-y-1 text-xs">
              <button
                onClick={() => setSelectedServer('main')}
                className={`w-full p-2 rounded-xl text-left text-[11px] font-bold flex items-center justify-between transition-all ${
                  selectedServer === 'main'
                    ? 'bg-[#ff006a]/20 border border-[#ff006a]/50 text-white'
                    : 'bg-white/5 hover:bg-white/10 text-white/70'
                }`}
              >
                <span>TAS-IX Ultra (1080p FHD)</span>
                {selectedServer === 'main' && <Check size={13} className="text-[#ff006a]" />}
              </button>

              <button
                onClick={() => setSelectedServer('backup')}
                className={`w-full p-2 rounded-xl text-left text-[11px] font-bold flex items-center justify-between transition-all ${
                  selectedServer === 'backup'
                    ? 'bg-[#ff006a]/20 border border-[#ff006a]/50 text-white'
                    : 'bg-white/5 hover:bg-white/10 text-white/70'
                }`}
              >
                <span>Standart Server (720p HD)</span>
                {selectedServer === 'backup' && <Check size={13} className="text-[#ff006a]" />}
              </button>
            </div>
          </div>

          {/* Brightness Adjustment */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-white/50 uppercase font-black">
              <span className="flex items-center gap-1">
                <Sun size={11} /> Yorug'lik
              </span>
              <span>{Math.round(brightness * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.05}
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="w-full h-1 bg-white/20 rounded accent-[#00dfd8]"
            />
          </div>

          {/* Aspect / Fit Toggle */}
          <div className="flex items-center justify-between pt-1 border-t border-white/10 text-xs">
            <span className="text-[11px] text-white/70 flex items-center gap-1">
              <Smartphone size={12} /> Ekranga moslash
            </span>
            <button
              onClick={() => setObjectFit(objectFit === 'contain' ? 'cover' : 'contain')}
              className="text-[10px] font-bold px-2 py-1 rounded-md bg-white/10 text-white hover:bg-white/15"
            >
              {objectFit === 'cover' ? "To'liq (Cover)" : "Asl (Contain)"}
            </button>
          </div>

          {/* Auto Next Episode */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] text-white/70">Avto keyingi qism</span>
            <button
              onClick={() => setAutoNext(!autoNext)}
              className={`w-9 h-5 rounded-full transition-colors relative ${
                autoNext ? 'bg-[#ff006a]' : 'bg-white/20'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                  autoNext ? 'translate-x-4' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Episode Drawer */}
      <EpisodeDrawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        episodes={episodes}
        currentEpisodeNumber={currentEpisodeNumber}
        onSelectEpisode={onEpisodeChange}
        animeTitle={animeTitle}
      />
    </div>
  );
};
