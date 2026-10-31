import React, { useState, useEffect, useMemo } from 'react';
import { useMusic } from '../context/MusicContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Link } from 'react-router-dom';
import { 
  Play, Pause, Heart, Search, Disc3, 
  Headphones, Flame, Clock, Radio, Plus, Check,
  LayoutGrid, List, Zap,
  TrendingUp, Star, Award, Layers, Volume2, ListMusic,
  Share2, Shuffle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Song } from '../types';
import initialSongsData from '../data/initialSongs';

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  if (!isFinite(seconds)) return 'LIVE';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function Music() {
  const { 
    currentSong, 
    isPlaying, 
    playSong, 
    togglePlay, 
    toggleLike, 
    likedSongIds,
    playlist,
    setPlaylist,
    addToQueue,
    isShuffle,
    toggleShuffle
  } = useMusic();

  const { user } = useAuth();
  const { t } = useLanguage();

  const [songs, setSongs] = useState<Song[]>(() => (playlist.length > 0 ? playlist : (initialSongsData as Song[])));
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Barchasi');
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'title'>('popular');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const categories = [
    { id: 'Barchasi', label: 'Barchasi', kanji: 'すべて' },
    { id: 'Opening', label: 'Openinglar', kanji: 'OP・オープニング' },
    { id: 'Ending', label: 'Endinglar', kanji: 'ED・エンディング' },
    { id: 'OST', label: 'Saundtreklar', kanji: '劇中歌・OST' },
    { id: 'J-Pop', label: 'J-Pop & Rock', kanji: 'J-POP / ロック' },
    { id: 'Lo-Fi', label: 'Sakura Lo-Fi', kanji: '桜チル・Lo-Fi' },
    { id: 'Remix', label: 'Remikslar', kanji: 'リミックス' }
  ];

  // Fetch songs from API on mount
  useEffect(() => {
    const fetchSongs = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/music');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setSongs(data);
            setPlaylist(data);
          }
        }
      } catch (err) {
        console.warn("API songs fetch error, relying on local seed:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSongs();
  }, []);

  // Filter and sort songs
  const filteredSongs = useMemo(() => {
    let result = [...songs];

    // Category filter
    if (selectedCategory !== 'Barchasi') {
      result = result.filter(s => 
        (s.category || '').toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(s => 
        (s.title || '').toLowerCase().includes(q) ||
        (s.artist || '').toLowerCase().includes(q) ||
        (s.anime_title || '').toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortBy === 'popular') {
      result.sort((a, b) => (b.plays || 0) - (a.plays || 0));
    } else if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    } else if (sortBy === 'title') {
      result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }

    return result;
  }, [songs, selectedCategory, searchQuery, sortBy]);

  // Featured Hero Track (top played or first)
  const featuredTrack = useMemo(() => {
    if (songs.length === 0) return null;
    return songs[0];
  }, [songs]);

  // Top 5 Oricon Billboard Chart
  const topChartSongs = useMemo(() => {
    return [...songs].sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 5);
  }, [songs]);

  const isCurrentPlaying = (song: Song) => {
    return currentSong?.id === song.id && isPlaying;
  };

  const handleTrackClick = (song: Song) => {
    if (currentSong?.id === song.id) {
      togglePlay();
    } else {
      playSong(song, filteredSongs);
    }
  };

  const handleStartRandom = () => {
    if (songs.length > 0) {
      const randomIndex = Math.floor(Math.random() * songs.length);
      playSong(songs[randomIndex], songs);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-32 max-w-7xl mx-auto">
      
      {/* 1. CINEMATIC HERO SPOTLIGHT */}
      {featuredTrack && (
        <section className="relative rounded-3xl overflow-hidden bg-[#07070c] border border-cyan-500/20 shadow-[0_25px_70px_rgba(0,0,0,0.9)] p-5 sm:p-8 md:p-10 group">
          {/* Subtle Ambient Glow */}
          <div 
            className="absolute right-0 top-0 w-full md:w-3/5 h-full bg-cover bg-center opacity-30 filter blur-3xl pointer-events-none transition-all duration-1000 group-hover:opacity-40"
            style={{ backgroundImage: `url(${featuredTrack.cover_url})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#07070c] via-[#07070c]/90 to-transparent pointer-events-none" />

          {/* Authentic Kanji Watermark */}
          <div className="absolute top-4 right-6 text-7xl sm:text-9xl font-black text-white/[0.03] select-none pointer-events-none font-serif tracking-widest">
            音響
          </div>

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-10">
            {/* Left Info Column */}
            <div className="w-full md:max-w-xl space-y-4 text-left">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[#00f0ff] text-[11px] font-extrabold uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-[#00f0ff] animate-ping" />
                  <span>music.animem.uz</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-pink-500/10 border border-pink-500/30 text-[#ff2a85] text-[11px] font-bold">
                  🌸 TOP HIT
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[#ffd166] text-[11px] font-bold">
                  ★ #1 TREK
                </span>
              </div>

              {/* Title & Japanese Subtitle */}
              <div>
                <p className="text-xs sm:text-sm font-bold text-white/50 tracking-widest uppercase mb-1">
                  HAFTA TREKI
                </p>
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                  {featuredTrack.title}
                </h1>
              </div>

              {/* Artist, Anime & Stats */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-white/70">
                <span className="font-bold text-white bg-white/10 px-2.5 py-1 rounded-lg">
                  {featuredTrack.artist}
                </span>
                {featuredTrack.anime_title && (
                  <span className="text-[#00f0ff] font-semibold bg-[#00f0ff]/10 border border-[#00f0ff]/20 px-2.5 py-1 rounded-lg">
                    {featuredTrack.anime_title}
                  </span>
                )}
                <span className="text-white/40 font-mono">
                  {featuredTrack.plays?.toLocaleString() || 0} tinglash
                </span>
              </div>

              {/* Equalizer Wave Indicator */}
              <div className="flex items-end gap-1 h-5 py-0.5 select-none">
                {[40, 70, 95, 60, 85, 45, 100, 75, 55, 90, 65, 80].map((h, i) => (
                  <span
                    key={i}
                    style={{ height: isCurrentPlaying(featuredTrack) ? `${h}%` : '25%' }}
                    className={`w-1 rounded-full transition-all duration-300 ${
                      isCurrentPlaying(featuredTrack) 
                        ? 'bg-gradient-to-t from-[#ff006a] to-[#00c8ff] animate-[pulse_0.7s_ease-in-out_infinite]' 
                        : 'bg-white/15'
                    }`}
                  />
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleTrackClick(featuredTrack)}
                  className="bg-gradient-to-r from-[#ff006a] via-[#8b5cf6] to-[#00c8ff] hover:opacity-95 text-white px-6 sm:px-8 py-3.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2.5 shadow-[0_0_25px_rgba(255,0,106,0.4)] transition-all cursor-pointer"
                >
                  {isCurrentPlaying(featuredTrack) ? (
                    <>
                      <Pause size={18} className="fill-current" />
                      <span>Pauza</span>
                    </>
                  ) : (
                    <>
                      <Play size={18} className="fill-current ml-0.5" />
                      <span>Hozir tinglash</span>
                    </>
                  )}
                </motion.button>

                <button
                  onClick={() => toggleLike(featuredTrack.id)}
                  className={`p-3.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all cursor-pointer ${
                    likedSongIds.has(featuredTrack.id) ? 'text-[#ff006a] border-[#ff006a]/40 bg-[#ff006a]/15' : 'text-white/70 hover:text-white'
                  }`}
                  title="Sevimlilarga qo'shish"
                >
                  <Heart size={18} className={likedSongIds.has(featuredTrack.id) ? 'fill-current' : ''} />
                </button>

                <button
                  onClick={() => addToQueue(featuredTrack)}
                  className="p-3.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer flex items-center gap-2 text-xs font-bold"
                  title="Navbatga qo'shish"
                >
                  <ListMusic size={18} />
                  <span className="hidden sm:inline">Navbatga</span>
                </button>

                <button
                  onClick={handleStartRandom}
                  className="p-3.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-[#00c8ff] hover:text-white transition-all cursor-pointer flex items-center gap-2 text-xs font-bold"
                  title="Tasodifiy ijro"
                >
                  <Shuffle size={18} />
                  <span className="hidden sm:inline">Tasodifiy</span>
                </button>

                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="p-3.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-[#00c8ff] text-xs font-bold flex items-center gap-1.5 transition-all ml-auto sm:ml-0"
                    title="Yangi qo'shiq yuklash"
                  >
                    <Plus size={16} />
                    <span>Yuklash</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Right Side: Rotating Turntable Vinyl */}
            <div className="relative shrink-0 my-3 md:my-0">
              <div className="relative w-48 h-48 sm:w-60 sm:h-60 md:w-68 md:h-68 rounded-full p-3 bg-gradient-to-tr from-[#121218] via-[#1a1a24] to-[#0c0c12] border-4 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.95)] flex items-center justify-center group/disc">
                <div className="absolute inset-2 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute inset-5 rounded-full border border-white/5 pointer-events-none" />

                {/* Spinning Vinyl Record */}
                <div className={`relative w-full h-full rounded-full overflow-hidden border border-white/20 shadow-inner ${
                  isPlaying && currentSong?.id === featuredTrack.id ? 'animate-[spin_10s_linear_infinite]' : ''
                }`}>
                  <img
                    src={featuredTrack.cover_url}
                    alt={featuredTrack.title}
                    className="w-full h-full object-cover"
                  />
                  {/* Center Vinyl Hole */}
                  <div className="absolute inset-0 m-auto w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#07070c] border-2 border-white/40 flex items-center justify-center shadow-lg">
                    <Disc3 size={18} className="text-[#00c8ff]" />
                  </div>
                </div>

                {/* Pulsing Visualizer Ring */}
                {isPlaying && currentSong?.id === featuredTrack.id && (
                  <div className="absolute -inset-3 rounded-full border-2 border-cyan-400/40 animate-ping opacity-40 pointer-events-none" />
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. ORICON BILLBOARD TOP 5 CHART */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-xl font-black text-white flex items-center gap-2">
            <TrendingUp size={20} className="text-[#ffd166]" />
            <span>Oricon Anime Top 5 Charti</span>
            <span className="text-[11px] bg-amber-500/10 text-[#ffd166] px-2.5 py-0.5 rounded-full border border-amber-500/30 font-bold">
              TOP 5
            </span>
          </h2>
          <span className="text-xs text-white/40 font-mono">Haftalik eng ommabop treklari</span>
        </div>

        <div className="bg-[#0b0b10] border border-white/5 rounded-2xl p-2 sm:p-4 divide-y divide-white/5 shadow-xl">
          {topChartSongs.map((song, index) => {
            const isPlayingThis = isCurrentPlaying(song);
            const rank = index + 1;
            const rankColor = 
              rank === 1 ? 'text-[#ffd166] font-black drop-shadow-[0_0_8px_rgba(255,209,102,0.6)]' :
              rank === 2 ? 'text-slate-200 font-bold drop-shadow-[0_0_6px_rgba(226,232,240,0.5)]' :
              rank === 3 ? 'text-amber-500 font-bold' : 'text-white/40';

            const rankBadge = 
              rank === 1 ? '👑' :
              rank === 2 ? '🥈' :
              rank === 3 ? '🥉' : null;

            return (
              <div
                key={song.id}
                onClick={() => handleTrackClick(song)}
                className={`py-3 px-2 sm:px-3 flex items-center justify-between gap-3 hover:bg-white/5 rounded-xl transition-all cursor-pointer ${
                  isPlayingThis ? 'bg-[#ff006a]/10 border-l-4 border-[#ff006a]' : ''
                }`}
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="w-8 text-center shrink-0 flex items-center justify-center">
                    {rankBadge ? (
                      <span className="text-sm sm:text-base">{rankBadge}</span>
                    ) : (
                      <span className={`text-sm sm:text-base font-mono ${rankColor}`}>
                        {rank < 10 ? `0${rank}` : rank}
                      </span>
                    )}
                  </div>

                  <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden shrink-0 border border-white/10 group/thumb">
                    <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                      {isPlayingThis ? <Pause size={16} className="text-white" /> : <Play size={16} className="text-white ml-0.5" />}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <h4 className={`text-xs sm:text-sm font-bold truncate ${isPlayingThis ? 'text-[#00c8ff]' : 'text-white'}`}>
                      {song.title}
                    </h4>
                    <p className="text-[11px] text-white/50 truncate mt-0.5">
                      {song.artist} {song.anime_title ? `• ${song.anime_title}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {isPlayingThis && (
                    <div className="flex items-end gap-0.5 h-3">
                      <span className="w-0.5 h-full bg-[#ff006a] animate-[pulse_0.6s_ease-in-out_infinite]" />
                      <span className="w-0.5 h-2/3 bg-[#00c8ff] animate-[pulse_0.8s_ease-in-out_infinite]" />
                      <span className="w-0.5 h-full bg-[#8b5cf6] animate-[pulse_0.5s_ease-in-out_infinite]" />
                    </div>
                  )}
                  <span className="text-xs font-mono text-white/40">
                    {formatTime(song.duration || 0)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLike(song.id);
                    }}
                    className={`p-1.5 rounded-full hover:bg-white/10 transition-colors ${
                      likedSongIds.has(song.id) ? 'text-[#ff006a]' : 'text-white/30 hover:text-white'
                    }`}
                  >
                    <Heart size={15} className={likedSongIds.has(song.id) ? 'fill-current' : ''} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. FULL SOUNDTRACK CATALOG */}
      <section className="space-y-5">
        
        {/* Controls Bar */}
        <div className="flex flex-col gap-4">
          
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {categories.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                    active
                      ? 'bg-gradient-to-r from-[#ff006a] to-[#00c8ff] text-white shadow-lg shadow-[#ff006a]/20 scale-105'
                      : 'bg-[#0f0f15] border border-white/10 text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className={`text-[10px] font-normal ${active ? 'text-white/80' : 'text-white/30'}`}>
                    {cat.kanji}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Bar + Sort + Grid/List Toggle */}
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Qo'shiq nomi, ijrochi yoki animeni qidiring..."
                className="w-full bg-[#0f0f15] border border-white/10 text-white text-xs rounded-xl pl-9 pr-8 py-3 focus:outline-none focus:border-[#00c8ff] transition-all placeholder:text-white/30"
              />
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-start">
              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-[#0f0f15] border border-white/10 text-white text-xs rounded-xl px-3.5 py-3 focus:outline-none focus:border-[#00c8ff] cursor-pointer flex-1 sm:flex-initial"
              >
                <option value="popular">Eng ommabop</option>
                <option value="newest">Yangi qo'shilgan</option>
                <option value="title">Alifbo bo'yicha</option>
              </select>

              {/* View Toggle */}
              <div className="flex items-center bg-[#0f0f15] border border-white/10 rounded-xl p-1 shrink-0">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'grid' ? 'bg-white/15 text-[#00c8ff]' : 'text-white/40 hover:text-white'
                  }`}
                  title="Katak ko'rinishi"
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'list' ? 'bg-white/15 text-[#00c8ff]' : 'text-white/40 hover:text-white'
                  }`}
                  title="Ro'yxat ko'rinishi"
                >
                  <List size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tracks Grid or List */}
        {filteredSongs.length === 0 ? (
          <div className="py-20 text-center rounded-2xl bg-[#0c0c12] border border-white/5 space-y-3">
            <Disc3 size={40} className="text-white/20 mx-auto" />
            <p className="text-white/60 text-sm">Hech qanday saundtrek topilmadi</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-[#00c8ff] hover:underline cursor-pointer"
              >
                Qidiruvni tozalash
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* GRID VIEW */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-5">
            {filteredSongs.map((song) => {
              const playing = isCurrentPlaying(song);
              const isLiked = likedSongIds.has(song.id);

              return (
                <motion.div
                  key={song.id}
                  whileHover={{ y: -5 }}
                  className="group relative bg-[#0b0b10] border border-white/5 hover:border-cyan-500/40 rounded-2xl p-3 flex flex-col justify-between transition-all shadow-md hover:shadow-cyan-500/10 cursor-pointer overflow-hidden"
                  onClick={() => handleTrackClick(song)}
                >
                  {/* Cover Art */}
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-3 bg-[#151520]">
                    <img
                      src={song.cover_url}
                      alt={song.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Category Tag */}
                    <div className="absolute top-2 left-2 z-10 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 text-[9px] font-black text-white/90 uppercase tracking-wider">
                      {song.category || 'OST'}
                    </div>

                    {/* Like button on card */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(song.id);
                      }}
                      className={`absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/60 backdrop-blur-md hover:bg-black/90 transition-colors ${
                        isLiked ? 'text-[#ff006a]' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      <Heart size={14} className={isLiked ? 'fill-current' : ''} />
                    </button>

                    {/* Hover Play Button Overlay */}
                    <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${
                      playing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#ff006a] to-[#00c8ff] text-white flex items-center justify-center shadow-lg shadow-[#ff006a]/40 transform group-hover:scale-110 transition-transform">
                        {playing ? (
                          <Pause size={20} className="fill-current" />
                        ) : (
                          <Play size={20} className="fill-current ml-0.5" />
                        )}
                      </div>
                    </div>

                    {/* Equalizer animation when playing */}
                    {playing && (
                      <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded-md flex items-end gap-0.5 h-4">
                        <span className="w-1 h-full bg-[#ff006a] animate-[pulse_0.6s_ease-in-out_infinite]" />
                        <span className="w-1 h-2/3 bg-[#00c8ff] animate-[pulse_0.8s_ease-in-out_infinite]" />
                        <span className="w-1 h-full bg-[#8b5cf6] animate-[pulse_0.5s_ease-in-out_infinite]" />
                      </div>
                    )}
                  </div>

                  {/* Meta Text */}
                  <div className="min-w-0">
                    <h3 className={`text-xs sm:text-sm font-bold truncate transition-colors ${
                      playing ? 'text-[#00c8ff]' : 'text-white group-hover:text-[#00c8ff]'
                    }`}>
                      {song.title}
                    </h3>
                    <p className="text-[11px] text-white/50 truncate mt-0.5">
                      {song.artist}
                    </p>
                    {song.anime_title && (
                      <p className="text-[10px] text-[#ff006a] font-medium truncate mt-0.5">
                        {song.anime_title}
                      </p>
                    )}
                  </div>

                  {/* Bottom Stats */}
                  <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-white/5 text-[10px] text-white/40 font-mono">
                    <span>{formatTime(song.duration || 0)}</span>
                    <span>{song.plays?.toLocaleString() || 0} tinglash</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* LIST VIEW */
          <div className="bg-[#0b0b10] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
            {filteredSongs.map((song, idx) => {
              const playing = isCurrentPlaying(song);
              const isLiked = likedSongIds.has(song.id);

              return (
                <div
                  key={song.id}
                  onClick={() => handleTrackClick(song)}
                  className={`flex items-center justify-between p-3 sm:px-6 hover:bg-white/5 transition-all cursor-pointer ${
                    playing ? 'bg-[#ff006a]/10 border-l-4 border-[#ff006a]' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <span className="text-xs font-mono text-white/30 w-6 text-center">
                      {playing ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-[#ff006a] inline-block animate-ping" />
                      ) : (
                        idx + 1
                      )}
                    </span>

                    <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden shrink-0 border border-white/10 group">
                      <img
                        src={song.cover_url}
                        alt={song.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        {playing ? <Pause size={16} className="text-white" /> : <Play size={16} className="text-white ml-0.5" />}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <p className={`text-xs sm:text-sm font-bold truncate ${playing ? 'text-[#00c8ff]' : 'text-white'}`}>
                        {song.title}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-white/50 truncate mt-0.5">
                        <span className="truncate">{song.artist}</span>
                        {song.anime_title && (
                          <>
                            <span>•</span>
                            <span className="text-[#ff006a] truncate">{song.anime_title}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                    <span className="hidden sm:inline text-[11px] bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full text-white/70">
                      {song.category || 'OST'}
                    </span>
                    <span className="hidden md:inline text-xs text-white/40 font-mono">
                      {song.plays?.toLocaleString() || 0} tinglash
                    </span>
                    <span className="text-xs text-white/50 font-mono">
                      {formatTime(song.duration || 0)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(song.id);
                      }}
                      className={`p-1.5 rounded-full hover:bg-white/10 transition-colors ${
                        isLiked ? 'text-[#ff006a]' : 'text-white/30 hover:text-white'
                      }`}
                    >
                      <Heart size={16} className={isLiked ? 'fill-current' : ''} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}
