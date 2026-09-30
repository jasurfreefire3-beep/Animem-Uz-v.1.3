import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Dices, 
  Sparkles, 
  X, 
  Play, 
  RotateCw, 
  Star, 
  Calendar, 
  Film, 
  Check, 
  Flame,
  Volume2,
  VolumeX
} from 'lucide-react';
import { Anime, toSlug, translateGenre } from '../types';

interface RandomAnimeModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function openAnimeRoulette() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('animem-open-roulette'));
  }
}

// Playful sound generator using Web Audio API (no external sound files required)
function playSound(type: 'tick' | 'win') {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'tick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600 + Math.random() * 200, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } else if (type === 'win') {
      // Fanfare chord
      const freqs = [523.25, 659.25, 783.99, 1046.50]; // C Major arpeggio
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, ctx.currentTime + i * 0.08);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.08);
        osc.stop(ctx.currentTime + i * 0.08 + 0.45);
      });
    }
  } catch (e) {
    // Audio may be blocked before user gesture; gracefully ignore
  }
}

const POPULAR_GENRES = [
  { id: 'all', label: 'Barchasi' },
  { id: 'Action', label: 'Jangari' },
  { id: 'Romance', label: 'Romantika' },
  { id: 'Comedy', label: 'Komediya' },
  { id: 'Fantasy', label: 'Fantastika' },
  { id: 'Drama', label: 'Drama' },
  { id: 'Adventure', label: 'Sarguzasht' },
  { id: 'Supernatural', label: "G'ayritabiiy" }
];

export default function RandomAnimeModal({ isOpen: propIsOpen, onClose: propOnClose }: RandomAnimeModalProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Reel cards shown during spin animation
  const [reelAnimes, setReelAnimes] = useState<Anime[]>([]);
  const [reelOffset, setReelOffset] = useState(0);

  // Sync propIsOpen if provided, else listen to event
  useEffect(() => {
    if (propIsOpen !== undefined) {
      setIsOpen(propIsOpen);
    }
  }, [propIsOpen]);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('animem-open-roulette', handleOpen);
    return () => window.removeEventListener('animem-open-roulette', handleOpen);
  }, []);

  // Fetch anime catalogue
  useEffect(() => {
    if (!isOpen || animes.length > 0) return;
    fetch('/api/animes')
      .then(res => res.ok ? res.json() : [])
      .then((data: Anime[]) => {
        if (Array.isArray(data)) {
          setAnimes(data);
        }
      })
      .catch(() => {});
  }, [isOpen, animes.length]);

  // Filtered pool based on selected genre
  const filteredAnimes = useMemo(() => {
    if (selectedGenre === 'all') return animes;
    return animes.filter(a => {
      const g = (a.janrlar || '').toLowerCase();
      return g.includes(selectedGenre.toLowerCase());
    });
  }, [animes, selectedGenre]);

  const handleClose = () => {
    if (isSpinning) return;
    setIsOpen(false);
    if (propOnClose) propOnClose();
  };

  const handleStartSpin = () => {
    if (isSpinning || filteredAnimes.length === 0) return;

    setIsSpinning(true);
    setSelectedAnime(null);

    // Pick random winner from filtered pool
    const winnerIndex = Math.floor(Math.random() * filteredAnimes.length);
    const winner = filteredAnimes[winnerIndex];

    // Build a reel strip of 35-45 items, placing winner near the end
    const reelLength = 35;
    const strip: Anime[] = [];
    for (let i = 0; i < reelLength - 1; i++) {
      const rand = filteredAnimes[Math.floor(Math.random() * filteredAnimes.length)];
      strip.push(rand);
    }
    // Place winner at target index (index 30)
    const targetIdx = 30;
    strip[targetIdx] = winner;
    setReelAnimes(strip);

    // Card item width + gap in px: e.g. 140px width + 12px gap = 152px
    const cardWidthWithGap = 152;
    // Calculate final scroll offset to center the targetIdx card in the viewport
    // Target position: targetIdx * cardWidthWithGap
    const finalOffset = targetIdx * cardWidthWithGap;

    let startTime: number | null = null;
    const duration = 4000; // 4 seconds total
    let lastTick = 0;

    const animateReel = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Custom easeOutCubic deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3.5);
      const currentOffset = easeOut * finalOffset;
      setReelOffset(currentOffset);

      // Play tick sound every card passing
      const currentCard = Math.floor(currentOffset / cardWidthWithGap);
      if (currentCard !== lastTick) {
        if (soundEnabled) playSound('tick');
        lastTick = currentCard;
      }

      if (progress < 1) {
        requestAnimationFrame(animateReel);
      } else {
        // Spin finished!
        setIsSpinning(false);
        setSelectedAnime(winner);
        if (soundEnabled) playSound('win');
      }
    };

    setReelOffset(0);
    requestAnimationFrame(animateReel);
  };

  const handleWatchAnime = (anime: Anime) => {
    handleClose();
    navigate(`/anime/${toSlug(anime.title)}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div 
        className="absolute inset-0" 
        onClick={handleClose} 
      />

      <div className="relative w-full max-w-2xl bg-[#0c0d14] border border-[#ff006a]/30 rounded-2xl shadow-[0_0_50px_rgba(255,0,106,0.25)] overflow-hidden z-10 flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-[#ff006a]/20 via-[#181824] to-[#0c0d14] border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff006a] to-purple-600 flex items-center justify-center shadow-lg shadow-[#ff006a]/30">
              <Dices className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white tracking-wide uppercase">
                  Anime Ruletka
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#ff006a]/20 text-[#ff006a] border border-[#ff006a]/30">
                  Tasodifiy
                </span>
              </div>
              <p className="text-xs text-white/50">
                Nima ko'rishni bilmayapsizmi? Ruletkani aylantiring va omadingizni sinang!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
              title={soundEnabled ? "Ovozni o'chirish" : "Ovozni yoqish"}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSpinning}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 custom-scrollbar">
          {/* Genre selector chips */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-[#ff006a]" /> Janr bo'yicha saralash
              </label>
              <span className="text-[11px] text-white/40 font-mono">
                {filteredAnimes.length} ta anime mavjud
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_GENRES.map((g) => {
                const active = selectedGenre === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    disabled={isSpinning}
                    onClick={() => {
                      setSelectedGenre(g.id);
                      setSelectedAnime(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      active
                        ? 'bg-[#ff006a] text-white shadow-md shadow-[#ff006a]/30'
                        : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/5'
                    }`}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Roulette Slot Reel Display */}
          <div className="relative w-full bg-[#07070b] border-2 border-[#ff006a]/30 rounded-2xl p-4 overflow-hidden shadow-inner">
            {/* Center Pointer Indicator */}
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[144px] border-2 border-[#ff006a] bg-[#ff006a]/10 rounded-xl pointer-events-none z-20 shadow-[0_0_20px_rgba(255,0,106,0.35)] flex flex-col justify-between items-center py-1">
              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-[#ff006a]" />
              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-[#ff006a]" />
            </div>

            {/* Gradient shadow fades on sides */}
            <div className="absolute top-0 bottom-0 left-0 w-16 bg-gradient-to-r from-[#07070b] to-transparent z-10 pointer-events-none" />
            <div className="absolute top-0 bottom-0 right-0 w-16 bg-gradient-to-l from-[#07070b] to-transparent z-10 pointer-events-none" />

            {/* Horizontal Reel Track */}
            <div className="h-44 sm:h-52 flex items-center overflow-hidden">
              <div 
                className="flex items-center gap-3 transition-transform"
                style={{
                  transform: `translateX(calc(50% - 72px - ${reelOffset}px))`,
                  willChange: 'transform'
                }}
              >
                {(reelAnimes.length > 0 ? reelAnimes : filteredAnimes.slice(0, 15)).map((anime, index) => (
                  <div
                    key={`${anime.id}-${index}`}
                    className="w-[140px] h-40 sm:h-48 rounded-xl overflow-hidden bg-[#161726] border border-white/10 shrink-0 relative group select-none shadow-md"
                  >
                    <img
                      src={anime.image_url}
                      alt={anime.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-2">
                      <p className="text-[11px] font-bold text-white line-clamp-1">
                        {anime.title}
                      </p>
                      <div className="flex items-center gap-1 text-[10px] text-yellow-400 font-bold mt-0.5">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        <span>{anime.rating ? Number(anime.rating).toFixed(1) : '9.0'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Winning Anime Announcement Box */}
          <AnimatePresence>
            {selectedAnime && !isSpinning && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="p-4 sm:p-5 bg-gradient-to-br from-[#ff006a]/15 via-[#131422] to-[#0c0d14] border-2 border-[#ff006a]/50 rounded-2xl shadow-xl flex flex-col sm:flex-row gap-4 sm:gap-5 items-center sm:items-start relative overflow-hidden"
              >
                {/* Glow accent */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#ff006a]/20 rounded-full blur-2xl pointer-events-none" />

                <div className="w-28 sm:w-32 h-40 sm:h-44 rounded-xl overflow-hidden shadow-2xl border-2 border-[#ff006a] shrink-0">
                  <img
                    src={selectedAnime.image_url}
                    alt={selectedAnime.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 text-center sm:text-left min-w-0">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider mb-1.5">
                    <Sparkles className="w-3 h-3" />
                    <span>Sizning omadli animengiz!</span>
                  </div>

                  <h4 className="text-lg sm:text-xl font-black text-white leading-tight mb-2 line-clamp-2">
                    {selectedAnime.title}
                  </h4>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-white/70 mb-3">
                    <span className="flex items-center gap-1 text-yellow-400 font-bold bg-black/40 px-2 py-0.5 rounded">
                      <Star className="w-3 h-3 fill-current" />
                      {selectedAnime.rating ? Number(selectedAnime.rating).toFixed(1) : '9.0'}
                    </span>
                    <span className="bg-black/40 px-2 py-0.5 rounded font-mono">
                      {selectedAnime.yil || '2026'}
                    </span>
                    <span className="bg-black/40 px-2 py-0.5 rounded text-[#ff006a] font-bold">
                      {selectedAnime.qismlar_soni ? `${selectedAnime.qismlar_soni} qism` : 'TV'}
                    </span>
                  </div>

                  <p className="text-xs text-white/60 line-clamp-2 mb-4 leading-relaxed">
                    {selectedAnime.description || "Ushbu anime haqida to'liq ma'lumot olish uchun tomosha qilish tugmasini bosing."}
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleWatchAnime(selectedAnime)}
                      className="px-5 py-2.5 bg-[#ff006a] hover:bg-[#d40058] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-[#ff006a]/30 flex items-center gap-2 cursor-pointer transform hover:-translate-y-0.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Hozir ko'rish</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleStartSpin}
                      className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Yana aylantirish</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Button: Spin */}
          {!selectedAnime && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                disabled={isSpinning || filteredAnimes.length === 0}
                onClick={handleStartSpin}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#ff006a] via-[#e6005f] to-purple-600 hover:opacity-95 disabled:opacity-40 text-white rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-xl shadow-[#ff006a]/35 flex items-center justify-center gap-2.5 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <Dices className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
                <span>{isSpinning ? 'Ruletka aylanmoqda...' : '🎲 Ruletkani aylantirish'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
