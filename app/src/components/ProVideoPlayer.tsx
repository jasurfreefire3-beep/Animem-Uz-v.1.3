import React, { useRef, useState, useEffect } from 'react';
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
}

export const ProVideoPlayer: React.FC<ProVideoPlayerProps> = ({
  animeId,
  animeTitle,
  episodes,
  currentEpisodeNumber,
  onEpisodeChange,
}) => {
  const navigate = useNavigate();
  const { saveWatchProgress } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [brightness, setBrightness] = useState(1);
  const [volume, setVolume] = useState(1);

  // Modals & Panels
  const [showSettings, setShowSettings] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [skipNotice, setSkipNotice] = useState<string | null>(null);

  const currentEp = episodes.find((e) => e.episode_number === currentEpisodeNumber) || episodes[0];

  // Auto-hide controls timer
  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      return;
    }
    const timer = setTimeout(() => {
      setShowControls(false);
      setShowSettings(false);
    }, 3500);

    return () => clearTimeout(timer);
  }, [isPlaying, showControls, showSettings]);

  // Video time update and progress saving
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    setCurrentTime(curr);
    if (Math.floor(curr) % 10 === 0) {
      saveWatchProgress(animeId, currentEpisodeNumber);
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
    setIsLoading(false);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleSeek = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, seconds));
  };

  // Double tap to skip 10 seconds
  const handleDoubleTap = (side: 'left' | 'right') => {
    if (!videoRef.current) return;
    if (side === 'left') {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
      setSkipNotice('-10 soniya');
    } else {
      videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
      setSkipNotice('+10 soniya');
    }
    setTimeout(() => setSkipNotice(null), 800);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const hasNext = episodes.some((e) => e.episode_number === currentEpisodeNumber + 1);

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden bg-black select-none ${
        isFullscreen ? 'h-screen fixed inset-0 z-50' : 'aspect-video rounded-2xl shadow-2xl'
      }`}
      style={{ filter: `brightness(${brightness})` }}
      onClick={() => setShowControls((prev) => !prev)}
    >
      {/* HTML5 Native Video Tag */}
      <video
        ref={videoRef}
        src={currentEp?.video_url}
        playsInline
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => {
          setIsLoading(false);
          setIsPlaying(true);
        }}
        onEnded={() => {
          setIsPlaying(false);
          if (hasNext) {
            onEpisodeChange(currentEpisodeNumber + 1);
          }
        }}
      />

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
          <Loader2 size={40} className="text-[#ff006a] animate-spin drop-shadow-[0_0_15px_#ff006a]" />
        </div>
      )}

      {/* Double Tap Ripple Notice */}
      {skipNotice && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/80 backdrop-blur-md px-4 py-2 rounded-full text-white text-xs font-black border border-[#ff006a]/50 shadow-[0_0_20px_rgba(255,0,106,0.6)] animate-ping">
            {skipNotice}
          </div>
        </div>
      )}

      {/* Left/Right invisible tap areas for 10s skip */}
      <div
        className="absolute inset-y-0 left-0 w-1/3 z-20 cursor-pointer"
        onDoubleClick={(e) => {
          e.stopPropagation();
          handleDoubleTap('left');
        }}
      />
      <div
        className="absolute inset-y-0 right-0 w-1/3 z-20 cursor-pointer"
        onDoubleClick={(e) => {
          e.stopPropagation();
          handleDoubleTap('right');
        }}
      />

      {/* Controls Overlay */}
      <div
        className={`absolute inset-0 z-30 flex flex-col justify-between p-4 bg-gradient-to-t from-black/80 via-transparent to-black/70 transition-opacity duration-300 pointer-events-auto ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center border border-white/10 active:scale-95 transition-all"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="truncate">
              <h3 className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-md">{animeTitle}</h3>
              <p className="text-[10px] text-[#ff006a] font-bold">{currentEpisodeNumber}-qism (O'zbekcha Dublyaj)</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Episode List Trigger */}
            <button
              onClick={() => setShowDrawer(true)}
              className="bg-black/50 hover:bg-black/80 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg border border-white/15 flex items-center gap-1.5 active:scale-95"
            >
              <Layers size={14} className="text-[#00dfd8]" />
              <span className="text-[11px]">Qismlar</span>
            </button>

            {/* Settings Trigger */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center border border-white/10"
            >
              <Settings size={15} />
            </button>
          </div>
        </div>

        {/* Center Controls */}
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => handleDoubleTap('left')}
            className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center active:scale-90 transition-transform"
          >
            <RotateCcw size={18} />
          </button>

          <button
            onClick={togglePlay}
            className="w-14 h-14 rounded-full bg-[#ff006a] text-white flex items-center justify-center shadow-[0_0_25px_rgba(255,0,106,0.6)] hover:scale-105 active:scale-95 transition-all"
          >
            {isPlaying ? <Pause size={24} className="fill-white" /> : <Play size={24} className="fill-white ml-1" />}
          </button>

          <button
            onClick={() => handleDoubleTap('right')}
            className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center active:scale-90 transition-transform"
          >
            <RotateCw size={18} />
          </button>
        </div>

        {/* Bottom Scrubber & Controls */}
        <div className="space-y-2">
          {/* Progress Bar */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-white/70 min-w-[35px]">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => handleSeek(Number(e.target.value))}
              className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#ff006a]"
            />
            <span className="text-[10px] font-mono text-white/40 min-w-[35px]">{formatTime(duration)}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.muted = !isMuted;
                    setIsMuted(!isMuted);
                  }
                }}
                className="text-white/80 hover:text-white"
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>

              {hasNext && (
                <button
                  onClick={() => onEpisodeChange(currentEpisodeNumber + 1)}
                  className="flex items-center gap-1 text-[11px] font-bold text-white/70 hover:text-white"
                >
                  <SkipForward size={14} /> Keyingi qism
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-[#00dfd8] bg-[#00dfd8]/10 px-1.5 py-0.5 rounded">
                {playbackSpeed}x
              </span>
              <button onClick={toggleFullscreen} className="text-white/80 hover:text-white">
                {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal (Playback Speed & Brightness) */}
      {showSettings && (
        <div
          className="absolute top-14 right-4 z-40 bg-[#0f1016]/95 border border-white/15 rounded-2xl p-4 w-60 shadow-2xl space-y-3"
          onClick={(e) => e.stopPropagation()}
        >
          <h4 className="text-xs font-bold text-white border-b border-white/10 pb-2">Sozlamalar</h4>

          {/* Speed */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-white/50 uppercase font-black">Tezlik</label>
            <div className="grid grid-cols-4 gap-1 text-xs">
              {[0.75, 1, 1.25, 1.5].map((speed) => (
                <button
                  key={speed}
                  onClick={() => {
                    if (videoRef.current) videoRef.current.playbackRate = speed;
                    setPlaybackSpeed(speed);
                  }}
                  className={`py-1 rounded-lg font-bold text-[11px] ${
                    playbackSpeed === speed ? 'bg-[#ff006a] text-white' : 'bg-white/5 text-white/60 hover:text-white'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* Brightness */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-white/50 uppercase font-black">
              <span className="flex items-center gap-1">
                <Sun size={11} /> Yorug'lik
              </span>
              <span>{Math.round(brightness * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.4}
              max={1.6}
              step={0.1}
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="w-full h-1 bg-white/20 rounded accent-[#00dfd8]"
            />
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
