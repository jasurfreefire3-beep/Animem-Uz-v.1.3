import React, { useState, useRef } from 'react';
import { useMusic } from '../context/MusicContext';
import { 
  Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Repeat1, 
  Volume2, VolumeX, Volume1, Heart, Maximize2, ListMusic, 
  Mic2, Disc3, Music as MusicIcon, ChevronUp, Minus, X, Share2, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  if (!isFinite(seconds)) return 'LIVE';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function MusicPlayerBar() {
  const {
    currentSong,
    isPlaying,
    playlist,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    likedSongIds,
    togglePlay,
    nextSong,
    prevSong,
    seekTo,
    setVolumeLevel,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    toggleLike,
    isExpanded,
    setIsExpanded,
    isPlayerBarDismissed,
    dismissPlayerBar,
    restorePlayerBar,
    closePlayer,
    showQueue,
    setShowQueue,
    showLyrics,
    setShowLyrics
  } = useMusic();

  const [isHoveringProgress, setIsHoveringProgress] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentSong) return;
    const url = `${window.location.origin}/music/${currentSong.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  if (!currentSong) {
    return null;
  }

  // If dismissed by user: show a tiny unobtrusive floating vinyl disc on the LEFT side of the screen
  // (Left side ensures it NEVER interferes with Chat / Mika buttons on the right side!)
  if (isPlayerBarDismissed) {
    return (
      <AnimatePresence>
        {isPlaying && (
          <motion.div
            initial={{ scale: 0, opacity: 0, x: -20 }}
            animate={{ scale: 1, opacity: 1, x: 0 }}
            exit={{ scale: 0, opacity: 0, x: -20 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="fixed bottom-20 left-3 md:bottom-6 md:left-6 z-40 select-none group"
          >
            <div className="relative">
              <button
                onClick={restorePlayerBar}
                className="relative w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#0a0a0e] border-2 border-[#00c8ff]/70 shadow-[0_0_20px_rgba(0,200,255,0.4)] flex items-center justify-center overflow-hidden cursor-pointer hover:scale-105 active:scale-95 transition-all"
                title="Pleyerni ochish"
              >
                <img
                  src={currentSong.cover_url}
                  alt={currentSong.title}
                  className="w-full h-full object-cover animate-[spin_8s_linear_infinite]"
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 flex items-center justify-center transition-colors">
                  <div className="w-4 h-4 rounded-full bg-[#0a0a0e] border border-white/50 flex items-center justify-center shadow">
                    <MusicIcon size={9} className="text-[#00c8ff]" />
                  </div>
                </div>
              </button>
              {/* Close badge to completely stop playback */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closePlayer();
                }}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-90 cursor-pointer"
                title="Musiqani to'xtatish va yopish"
              >
                <X size={11} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  const isLiked = likedSongIds.has(currentSong.id);
  const progressPercent = duration > 0 && isFinite(duration) ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = Math.max(0, Math.min(1, clickX / width));
    seekTo(percentage * duration);
  };

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = Math.max(0, Math.min(1, clickX / width));
    setHoverTime(percentage * duration);
  };

  return (
    <div className="fixed bottom-[4.8rem] md:bottom-3.5 left-3 right-3 md:left-72 md:right-28 xl:right-32 z-45 pointer-events-none select-none">
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        className="max-w-5xl mx-auto bg-[#0a0b12]/80 backdrop-blur-3xl border border-white/22 rounded-[28px] shadow-[0_16px_48px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.3)] p-2 sm:p-2.5 pointer-events-auto relative overflow-hidden"
      >
        {/* Subtle Ambient Glow */}
        <div className={`absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#ff006a]/20 via-[#00c8ff]/15 to-[#8b5cf6]/20 blur-xl opacity-60 pointer-events-none transition-opacity duration-700 ${isPlaying ? 'opacity-70' : 'opacity-20'}`} />

        <div className="relative z-10 flex flex-col gap-1">
          {/* Main Controls Row */}
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            
            {/* 1. Track Info (Cover + Title + Artist) */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 max-w-[50%] sm:max-w-[32%]">
              <div 
                onClick={() => setIsExpanded(true)}
                className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden shadow-lg cursor-pointer shrink-0 group border border-white/10"
              >
                <img
                  src={currentSong.cover_url}
                  alt={currentSong.title}
                  className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${
                    isPlaying ? 'animate-[spin_8s_linear_infinite]' : ''
                  }`}
                />
                <div className="absolute inset-0 m-auto w-2.5 h-2.5 rounded-full bg-[#0a0a0e] border border-white/30" />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 size={13} className="text-white drop-shadow" />
                </div>
              </div>

              <div className="min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-1.5">
                  <h4 
                    onClick={() => setIsExpanded(true)}
                    className="text-xs sm:text-sm font-bold text-white hover:text-[#00c8ff] transition-colors truncate cursor-pointer"
                  >
                    {currentSong.title}
                  </h4>
                  {isPlaying && (
                    <div className="hidden min-[480px]:flex items-end gap-0.5 h-3 shrink-0">
                      <span className="w-0.5 h-full bg-[#ff006a] animate-[pulse_0.6s_ease-in-out_infinite]" />
                      <span className="w-0.5 h-2/3 bg-[#00c8ff] animate-[pulse_0.8s_ease-in-out_infinite]" />
                      <span className="w-0.5 h-full bg-[#8b5cf6] animate-[pulse_0.5s_ease-in-out_infinite]" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[10px] sm:text-xs text-white/50 truncate">
                  <span className="truncate hover:text-white/80 transition-colors">{currentSong.artist}</span>
                  {currentSong.anime_title && (
                    <>
                      <span>•</span>
                      <span className="text-[#00c8ff] truncate">{currentSong.anime_title}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Like Button */}
              <button
                onClick={() => toggleLike(currentSong.id)}
                className={`hidden min-[400px]:inline-flex p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer shrink-0 ${
                  isLiked ? 'text-[#ff006a]' : 'text-white/40 hover:text-white'
                }`}
                title={isLiked ? "Sevimlilardan o'chirish" : "Sevimlilarga qo'shish"}
              >
                <Heart size={15} className={isLiked ? 'fill-current scale-110' : ''} />
              </button>

              {/* Share Button */}
              <button
                onClick={handleShare}
                className="hidden min-[480px]:inline-flex p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer shrink-0 text-white/40 hover:text-[#00c8ff]"
                title="Ulashish (Havolani nusxalash)"
              >
                {isCopied ? <Check size={15} className="text-emerald-400" /> : <Share2 size={15} />}
              </button>
            </div>

            {/* 2. Playback Controls */}
            <div className="flex items-center justify-center gap-1 sm:gap-2.5">
              <button
                onClick={toggleShuffle}
                className={`hidden md:inline-flex p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isShuffle ? 'text-[#00c8ff] bg-[#00c8ff]/10' : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
                title="Tasodifiy ijro"
              >
                <Shuffle size={15} />
              </button>

              <button
                onClick={prevSong}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer active:scale-95"
                title="Oldingi"
              >
                <SkipBack size={17} />
              </button>

              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                onClick={togglePlay}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-[#ff006a] to-[#00c8ff] text-white flex items-center justify-center shadow-[0_0_15px_rgba(255,0,106,0.5)] hover:shadow-[0_0_20px_rgba(0,200,255,0.6)] transition-all cursor-pointer"
                title={isPlaying ? "Pauza" : "Ijro etish"}
              >
                {isPlaying ? <Pause size={16} className="fill-current" /> : <Play size={16} className="fill-current ml-0.5" />}
              </motion.button>

              <button
                onClick={nextSong}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer active:scale-95"
                title="Keyingi"
              >
                <SkipForward size={17} />
              </button>

              <button
                onClick={toggleRepeat}
                className={`hidden md:inline-flex p-1.5 rounded-lg transition-colors cursor-pointer ${
                  repeatMode !== 'none' ? 'text-[#00c8ff] bg-[#00c8ff]/10' : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
                title="Takrorlash"
              >
                {repeatMode === 'one' ? <Repeat1 size={15} /> : <Repeat size={15} />}
              </button>
            </div>

            {/* 3. Actions & Close (X) Button */}
            <div className="flex items-center justify-end gap-1 sm:gap-2">
              {/* Queue Button */}
              <button
                onClick={() => setShowQueue(!showQueue)}
                className={`hidden sm:inline-flex p-1.5 rounded-lg transition-colors cursor-pointer relative ${
                  showQueue ? 'text-[#00c8ff] bg-[#00c8ff]/15' : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
                title="Kutish ro'yxati"
              >
                <ListMusic size={15} />
                {playlist.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#00c8ff] text-black text-[8px] font-extrabold flex items-center justify-center">
                    {playlist.length}
                  </span>
                )}
              </button>

              {/* Volume Slider (Desktop) */}
              <div className="hidden xl:flex items-center gap-1.5 pl-1 border-l border-white/10">
                <button
                  onClick={toggleMute}
                  className="text-white/50 hover:text-white transition-colors cursor-pointer p-0.5"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX size={15} className="text-red-400" />
                  ) : volume < 0.5 ? (
                    <Volume1 size={15} />
                  ) : (
                    <Volume2 size={15} />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVolumeLevel(parseFloat(e.target.value))}
                  className="w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#00c8ff]"
                />
              </div>

              {/* Expand to Fullscreen button */}
              <button
                onClick={() => setIsExpanded(true)}
                className="p-1.5 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                title="Kengaytirilgan ko'rinish"
              >
                <ChevronUp size={16} />
              </button>

              {/* Minimize to mini floating disc on bottom-left */}
              <button
                onClick={dismissPlayerBar}
                className="p-1.5 text-white/50 hover:text-[#00c8ff] hover:bg-[#00c8ff]/10 rounded-lg transition-colors cursor-pointer"
                title="Kichraytirish (Mini pleyer)"
              >
                <Minus size={16} />
              </button>

              {/* X (Close / Stop & Remove completely) Button */}
              <button
                onClick={closePlayer}
                className="p-2 sm:p-1.5 text-white/70 hover:text-red-400 hover:bg-red-500/20 active:scale-90 rounded-xl transition-all cursor-pointer ml-1 relative z-50 shrink-0 bg-white/5 sm:bg-transparent"
                title="Musiqani to'xtatish va butunlay yopish"
              >
                <X size={18} className="stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Bottom Progress Bar with Timers */}
          <div className="flex items-center gap-2 pt-0.5">
            <span className="text-[9px] sm:text-[10px] text-white/40 font-mono w-8 text-right select-none">
              {formatTime(currentTime)}
            </span>

            <div
              ref={progressBarRef}
              onClick={handleProgressClick}
              onMouseEnter={() => setIsHoveringProgress(true)}
              onMouseLeave={() => setIsHoveringProgress(false)}
              onMouseMove={handleProgressMouseMove}
              className="relative flex-1 h-1 sm:h-1.5 hover:h-2 rounded-full cursor-pointer transition-all group bg-white/10"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#ff006a] to-[#00c8ff] relative"
                style={{ width: `${progressPercent}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_rgba(0,200,255,0.9)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {isHoveringProgress && hoverTime !== null && (
                <div 
                  className="absolute -top-6 -translate-x-1/2 px-1 py-0.5 rounded bg-[#181820] border border-white/20 text-[9px] text-white font-mono pointer-events-none shadow"
                  style={{ left: `${(hoverTime / duration) * 100}%` }}
                >
                  {formatTime(hoverTime)}
                </div>
              )}
            </div>

            <span className="text-[9px] sm:text-[10px] text-white/40 font-mono w-8 select-none">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
