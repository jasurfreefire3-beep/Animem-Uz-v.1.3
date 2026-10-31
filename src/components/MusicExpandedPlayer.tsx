import React, { useState } from 'react';
import { useMusic } from '../context/MusicContext';
import { 
  Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Repeat1, 
  Volume2, VolumeX, Volume1, Heart, ChevronDown, ListMusic, 
  Mic2, Disc3, Sparkles, Share2, Music as MusicIcon, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  if (!isFinite(seconds)) return 'LIVE';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function MusicExpandedPlayer() {
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
    showQueue,
    setShowQueue,
    showLyrics,
    setShowLyrics,
    playSong,
    removeFromQueue
  } = useMusic();

  const [activeTab, setActiveTab] = useState<'visualizer' | 'lyrics' | 'queue'>('visualizer');

  if (!isExpanded || !currentSong) {
    return null;
  }

  const isLiked = likedSongIds.has(currentSong.id);
  const progressPercent = duration > 0 && isFinite(duration) ? (currentTime / duration) * 100 : 0;

  const handleShare = () => {
    const url = window.location.origin + `/music?song=${currentSong.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      alert("Qo'shiq havolasi nusxalandi!");
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className="fixed inset-0 z-[100] bg-[#07070a]/95 backdrop-blur-3xl flex flex-col justify-between overflow-hidden text-white"
      >
        {/* Dynamic Atmospheric Ambient Background */}
        <div 
          className="absolute inset-0 opacity-25 filter blur-[120px] scale-125 pointer-events-none transition-all duration-1000 bg-cover bg-center"
          style={{ backgroundImage: `url(${currentSong.cover_url})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#07070a]/70 via-transparent to-[#07070a] pointer-events-none" />

        {/* Top Header Bar */}
        <header className="relative z-10 px-4 sm:px-8 pt-4 sm:pt-6 flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(false)}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/15 flex items-center justify-center transition-all cursor-pointer"
            title="Yopish"
          >
            <ChevronDown size={22} className="text-white/80" />
          </button>

          {/* Center Tabs: Visualizer / Matn / Navbat */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-full text-xs font-bold">
            <button
              onClick={() => setActiveTab('visualizer')}
              className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'visualizer' ? 'bg-[#ff006a] text-white shadow-lg shadow-[#ff006a]/30' : 'text-white/60 hover:text-white'
              }`}
            >
              <Disc3 size={14} className={isPlaying && activeTab === 'visualizer' ? 'animate-spin' : ''} />
              <span>Pleyer</span>
            </button>
            <button
              onClick={() => setActiveTab('lyrics')}
              className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'lyrics' ? 'bg-[#00c8ff] text-black shadow-lg shadow-[#00c8ff]/30' : 'text-white/60 hover:text-white'
              }`}
            >
              <Mic2 size={14} />
              <span>Matn</span>
            </button>
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'queue' ? 'bg-[#8b5cf6] text-white shadow-lg shadow-[#8b5cf6]/30' : 'text-white/60 hover:text-white'
              }`}
            >
              <ListMusic size={14} />
              <span>Navbat ({playlist.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/15 flex items-center justify-center transition-all cursor-pointer text-white/80 hover:text-white"
              title="Ulashish"
            >
              <Share2 size={18} />
            </button>
          </div>
        </header>

        {/* Center Main Body View (Tab Content) */}
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-4 sm:py-6 max-w-4xl mx-auto w-full min-h-0">
          
          {/* TAB 1: VISUALIZER & VINYL DISC */}
          {activeTab === 'visualizer' && (
            <div className="flex flex-col items-center justify-center w-full my-auto animate-fade-in">
              <div className="relative w-56 h-56 sm:w-80 sm:h-80 md:w-96 md:h-96 my-4">
                {/* Vinyl Record Disc Background */}
                <div 
                  className={`absolute inset-0 rounded-full bg-gradient-to-tr from-[#111116] via-[#1a1a24] to-[#0d0d12] border-4 border-[#252530] shadow-[0_20px_60px_rgba(0,0,0,0.9)] p-4 flex items-center justify-center ${
                    isPlaying ? 'animate-[spin_12s_linear_infinite]' : ''
                  }`}
                  style={{
                    backgroundImage: 'repeating-radial-gradient(circle, #1a1a22 0, #1a1a22 2px, #0e0e14 3px, #0e0e14 4px)'
                  }}
                >
                  {/* Center Cover Art */}
                  <div className="relative w-28 h-28 sm:w-44 sm:h-44 md:w-52 md:h-52 rounded-full overflow-hidden border-2 border-white/40 shadow-inner">
                    <img
                      src={currentSong.cover_url}
                      alt={currentSong.title}
                      className="w-full h-full object-cover"
                    />
                    {/* Vinyl Center Hole */}
                    <div className="absolute inset-0 m-auto w-6 h-6 rounded-full bg-[#07070a] border-2 border-white/50" />
                  </div>
                </div>

                {/* Animated Neon Audio Ring Waves */}
                {isPlaying && (
                  <div className="absolute -inset-4 rounded-full border border-[#00c8ff]/30 animate-ping opacity-40 pointer-events-none" />
                )}
              </div>

              {/* Sound Wave Frequency Visualizer Simulation */}
              <div className="flex items-center gap-1 sm:gap-1.5 h-10 my-3">
                {[40, 75, 20, 90, 60, 30, 85, 50, 95, 70, 45, 80, 25, 65, 85, 35, 90, 55, 70, 40].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 sm:w-1.5 bg-gradient-to-t from-[#ff006a] via-[#8b5cf6] to-[#00c8ff] rounded-full transition-all duration-200"
                    style={{
                      height: isPlaying ? `${Math.max(15, (h * Math.sin((currentTime * 3) + i)) % 100)}%` : '15%',
                      opacity: isPlaying ? 0.9 : 0.25
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: LYRICS (KARAOKE) */}
          {activeTab === 'lyrics' && (
            <div className="w-full h-full max-h-[60vh] overflow-y-auto px-4 sm:px-8 py-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md custom-scrollbar animate-fade-in text-center flex flex-col justify-start">
              {currentSong.lyrics ? (
                <div className="space-y-4 max-w-xl mx-auto">
                  <span className="inline-block text-[11px] font-bold text-[#00c8ff] uppercase tracking-wider bg-[#00c8ff]/10 px-3 py-1 rounded-full border border-[#00c8ff]/20 mb-2">
                    {currentSong.anime_title || 'Anime'} Qo'shiq Matni
                  </span>
                  {currentSong.lyrics.split('\n').map((line, idx) => (
                    <p 
                      key={idx} 
                      className={`text-base sm:text-xl font-medium leading-relaxed transition-all duration-300 ${
                        line.trim() === '' ? 'h-4' : 'text-white/80 hover:text-white hover:scale-105'
                      }`}
                    >
                      {line}
                    </p>
                  ))}
                </div>
              ) : (
                <div className="my-auto py-16 flex flex-col items-center justify-center text-white/40 gap-3">
                  <Mic2 size={36} className="text-white/20" />
                  <p className="text-sm">Ushbu qo'shiq uchun matn kiritilmagan</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: QUEUE LIST */}
          {activeTab === 'queue' && (
            <div className="w-full h-full max-h-[60vh] overflow-y-auto rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md custom-scrollbar animate-fade-in divide-y divide-white/5">
              <div className="p-4 flex items-center justify-between bg-white/[0.02]">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ListMusic size={16} className="text-[#00c8ff]" />
                  <span>Kutish ro'yxati</span>
                </h3>
                <span className="text-xs text-white/50">{playlist.length} ta saundtrek</span>
              </div>

              {playlist.map((song, idx) => {
                const isCurrent = song.id === currentSong.id;
                return (
                  <div
                    key={song.id}
                    onClick={() => playSong(song)}
                    className={`flex items-center justify-between p-3.5 px-4 sm:px-6 hover:bg-white/5 transition-all cursor-pointer ${
                      isCurrent ? 'bg-[#ff006a]/10 border-l-4 border-[#ff006a]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono text-white/40 w-5">
                        {isCurrent && isPlaying ? (
                          <span className="w-2 h-2 rounded-full bg-[#ff006a] inline-block animate-ping" />
                        ) : (
                          idx + 1
                        )}
                      </span>
                      <img
                        src={song.cover_url}
                        alt={song.title}
                        className="w-11 h-11 rounded-lg object-cover border border-white/10 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className={`text-sm font-bold truncate ${isCurrent ? 'text-[#ff006a]' : 'text-white'}`}>
                          {song.title}
                        </p>
                        <p className="text-xs text-white/50 truncate">
                          {song.artist} {song.anime_title ? `• ${song.anime_title}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-mono text-white/40">
                        {formatTime(song.duration || 0)}
                      </span>
                      {playlist.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromQueue(idx);
                          }}
                          className="p-1 text-white/30 hover:text-red-400 transition-colors"
                          title="Navbatdan o'chirish"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </main>

        {/* Bottom Expanded Controls Frame */}
        <footer className="relative z-10 px-4 sm:px-8 pb-6 sm:pb-8 pt-2 max-w-3xl mx-auto w-full">
          {/* Song Meta (Title + Artist + Heart) */}
          <div className="flex items-center justify-between mb-4">
            <div className="min-w-0 pr-4">
              <h2 className="text-lg sm:text-2xl font-black text-white truncate">
                {currentSong.title}
              </h2>
              <p className="text-xs sm:text-sm text-white/60 truncate mt-0.5">
                {currentSong.artist} {currentSong.anime_title && <span className="text-[#00c8ff] font-semibold">• {currentSong.anime_title}</span>}
              </p>
            </div>

            <button
              onClick={() => toggleLike(currentSong.id)}
              className={`p-3 rounded-full hover:bg-white/10 transition-transform active:scale-90 cursor-pointer ${
                isLiked ? 'text-[#ff006a]' : 'text-white/40 hover:text-white'
              }`}
            >
              <Heart size={24} className={isLiked ? 'fill-current scale-110 drop-shadow-[0_0_12px_rgba(255,0,106,0.8)]' : ''} />
            </button>
          </div>

          {/* Progress Timeline Slider */}
          <div className="space-y-1 mb-5">
            <div
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                seekTo((clickX / rect.width) * duration);
              }}
              className="relative h-2 bg-white/15 hover:h-3 rounded-full cursor-pointer transition-all group"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#ff006a] via-[#8b5cf6] to-[#00c8ff] relative"
                style={{ width: `${progressPercent}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-[0_0_12px_rgba(0,200,255,1)]" />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-white/50 font-mono">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Full Playback Buttons Row */}
          <div className="flex items-center justify-between max-w-md mx-auto">
            <button
              onClick={toggleShuffle}
              className={`p-3 rounded-xl transition-colors cursor-pointer ${
                isShuffle ? 'text-[#00c8ff] bg-[#00c8ff]/15' : 'text-white/40 hover:text-white'
              }`}
              title="Tasodifiy"
            >
              <Shuffle size={20} />
            </button>

            <button
              onClick={prevSong}
              className="p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer active:scale-95"
              title="Oldingi"
            >
              <SkipBack size={26} />
            </button>

            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.93 }}
              onClick={togglePlay}
              className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#ff006a] to-[#00c8ff] text-white flex items-center justify-center shadow-[0_0_30px_rgba(255,0,106,0.6)] hover:shadow-[0_0_40px_rgba(0,200,255,0.7)] transition-all cursor-pointer"
            >
              {isPlaying ? <Pause size={28} className="fill-current" /> : <Play size={28} className="fill-current ml-1" />}
            </motion.button>

            <button
              onClick={nextSong}
              className="p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer active:scale-95"
              title="Keyingi"
            >
              <SkipForward size={26} />
            </button>

            <button
              onClick={toggleRepeat}
              className={`p-3 rounded-xl transition-colors cursor-pointer ${
                repeatMode !== 'none' ? 'text-[#00c8ff] bg-[#00c8ff]/15' : 'text-white/40 hover:text-white'
              }`}
              title="Takrorlash"
            >
              {repeatMode === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
            </button>
          </div>

          {/* Volume Slider in Full Player */}
          <div className="flex items-center justify-center gap-3 mt-5 pt-3 border-t border-white/5 max-w-xs mx-auto">
            <button onClick={toggleMute} className="text-white/50 hover:text-white">
              {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolumeLevel(parseFloat(e.target.value))}
              className="w-48 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#00c8ff]"
            />
          </div>
        </footer>
      </motion.div>
    </AnimatePresence>
  );
}

