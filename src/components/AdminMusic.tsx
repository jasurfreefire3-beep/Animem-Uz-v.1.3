  import React, { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { useAuth } from '../context/AuthContext';
import { 
  Music, Upload, Link as LinkIcon, Trash2, Edit2, Play, Pause, 
  Check, X, Image, Disc3, RefreshCw, AlertCircle, Plus, Search, 
  CheckCircle2, Sparkles, Mic2, FileAudio, Headphones
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Song } from '../types';
import ImageUploader from './ImageUploader';
import initialSongsData from '../data/initialSongs';

function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function AdminMusic() {
  const { token } = useAuth();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  // Audio preview player inside admin
  const [previewSongId, setPreviewSongId] = useState<string | number | null>(null);
  const adminAudioRef = useRef<HTMLAudioElement | null>(null);
  const adminHlsRef = useRef<Hls | null>(null);

  const destroyAdminHls = () => {
    if (adminHlsRef.current) {
      try {
        adminHlsRef.current.destroy();
      } catch {}
      adminHlsRef.current = null;
    }
  };

  // Form Mode: 'upload' or 'url'
  const [audioInputMode, setAudioInputMode] = useState<'upload' | 'url'>('upload');

  // Form Fields
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [animeTitle, setAnimeTitle] = useState('');
  const [category, setCategory] = useState('Opening');
  const [duration, setDuration] = useState<number>(0);
  const [lyrics, setLyrics] = useState('');
  const [coverUrl, setCoverUrl] = useState('');

  // Audio file & preview
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Edit Modal
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | number | null>(null);

  const getAdminHeaders = () => {
    const currentToken = token || localStorage.getItem('token') || '';
    const adminPasscode = sessionStorage.getItem('animem_admin_passcode') || '';
    return {
      ...(currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {}),
      'x-admin-passcode': adminPasscode
    };
  };

  const fetchSongs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/music');
      if (res.ok) {
        const data = await res.json();
        setSongs(Array.isArray(data) && data.length > 0 ? data : (initialSongsData as Song[]));
      } else {
        setSongs(initialSongsData as Song[]);
      }
    } catch (err: any) {
      console.warn("Failed to load songs from backend:", err);
      setSongs(initialSongsData as Song[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSongs();
  }, []);

  // Handle local audio file selection
  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAudioFile(file);

      // Auto detect title from file name if title is empty
      if (!title) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
        setTitle(cleanName);
      }

      // Calculate audio duration using temp object URL
      const tempUrl = URL.createObjectURL(file);
      const tempAudio = new Audio(tempUrl);
      tempAudio.addEventListener('loadedmetadata', () => {
        if (tempAudio.duration && !isNaN(tempAudio.duration)) {
          setDuration(Math.round(tempAudio.duration));
        }
      });
    }
  };

  // Preview Play/Pause
  const togglePreview = (song: Song) => {
    if (previewSongId === song.id) {
      if (adminAudioRef.current) {
        adminAudioRef.current.pause();
      }
      destroyAdminHls();
      setPreviewSongId(null);
    } else {
      if (!adminAudioRef.current) {
        adminAudioRef.current = new Audio();
      }
      destroyAdminHls();

      const url = (song.audio_url || '').trim();
      const isHls = url.toLowerCase().includes('.m3u8') || url.toLowerCase().includes('/tghls/') || url.toLowerCase().includes('/hls/');

      if (isHls) {
        if (adminAudioRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          adminAudioRef.current.src = url;
          adminAudioRef.current.play().then(() => setPreviewSongId(song.id)).catch(() => {});
        } else if (Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true });
          hls.loadSource(url);
          hls.attachMedia(adminAudioRef.current);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            adminAudioRef.current?.play().then(() => setPreviewSongId(song.id)).catch(() => {});
          });
          adminHlsRef.current = hls;
        } else {
          adminAudioRef.current.src = url;
          adminAudioRef.current.play().then(() => setPreviewSongId(song.id)).catch(() => {});
        }
      } else {
        adminAudioRef.current.src = url;
        adminAudioRef.current.play().then(() => {
          setPreviewSongId(song.id);
        }).catch((err) => {
          console.warn("Audio preview error:", err);
        });
      }

      adminAudioRef.current.onended = () => {
        setPreviewSongId(null);
        destroyAdminHls();
      };
    }
  };

  // Upload audio file helper
  const uploadAudioFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const headers = getAdminHeaders();
    const res = await fetch('/api/music/upload', {
      method: 'POST',
      headers,
      body: formData
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Audio yuklashda xatolik (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.url || data.id;
  };

  // Submit new song
  const handleCreateSong = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!title.trim() || !artist.trim()) {
      setError("Iltimos, qo'shiq nomi va ijrochi nomini kiriting!");
      return;
    }

    setSubmitting(true);

    try {
      let finalAudioUrl = audioUrl.trim();

      // 1. Upload audio file if in upload mode
      if (audioInputMode === 'upload') {
        if (!audioFile) {
          throw new Error("Iltimos, audio faylni tanlang!");
        }
        setIsUploadingAudio(true);
        finalAudioUrl = await uploadAudioFile(audioFile);
        setIsUploadingAudio(false);
      } else if (!finalAudioUrl) {
        throw new Error("Iltimos, audio manzilini (URL) kiriting!");
      }

      // 2. Cover image (uploaded through ImageUploader or fallback)
      const finalCoverUrl = coverUrl.trim() || "https://image.animem.uz/logo.png";

      // 3. Create song record in API
      const payload = {
        title: title.trim(),
        artist: artist.trim(),
        anime_title: animeTitle.trim(),
        category,
        duration: duration || 200,
        cover_url: finalCoverUrl,
        audio_url: finalAudioUrl,
        lyrics: lyrics.trim()
      };

      const res = await fetch('/api/music', {
        method: 'POST',
        headers: {
          ...getAdminHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Qo'shiqni saqlashda xatolik: ${errText}`);
      }

      const newSong = await res.json();
      setSongs(prev => [newSong, ...prev]);
      setSuccess("Qo'shiq muvaffaqiyatli yuklandi va image.animem.uz orqali katalogga saqlandi!");

      // Reset form
      setTitle('');
      setArtist('');
      setAnimeTitle('');
      setDuration(0);
      setLyrics('');
      setCoverUrl('');
      setAudioFile(null);
      setAudioUrl('');
      if (audioInputRef.current) audioInputRef.current.value = '';
    } catch (err: any) {
      setError(err.message || "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
      setIsUploadingAudio(false);
    }
  };

  // Delete song
  const handleDeleteSong = async (id: string | number) => {
    try {
      const res = await fetch(`/api/music/${id}`, {
        method: 'DELETE',
        headers: getAdminHeaders()
      });
      if (res.ok) {
        setSongs(prev => prev.filter(s => s.id !== id));
        setDeleteConfirmId(null);
        setSuccess("Qo'shiq muvaffaqiyatli o'chirildi!");
      } else {
        throw new Error("O'chirishda xatolik");
      }
    } catch (err: any) {
      setError(err.message || "O'chirish amalga oshmadi");
    }
  };

  // Update song
  const handleUpdateSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSong) return;

    try {
      const res = await fetch(`/api/music/${editingSong.id}`, {
        method: 'PUT',
        headers: {
          ...getAdminHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingSong)
      });

      if (res.ok) {
        const updated = await res.json();
        setSongs(prev => prev.map(s => s.id === updated.id ? updated : s));
        setEditingSong(null);
        setSuccess("Qo'shiq muvaffaqiyatli yangilandi!");
      } else {
        throw new Error("Yangilashda xatolik");
      }
    } catch (err: any) {
      setError(err.message || "Yangilash amalga oshmadi");
    }
  };

  const filteredSongs = songs.filter(s => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      (s.title || '').toLowerCase().includes(q) ||
      (s.artist || '').toLowerCase().includes(q) ||
      (s.anime_title || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="bg-[#111116] border border-[#222] p-5 sm:p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <Music className="text-[#00c8ff]" size={24} />
            <span>Musiqa Boshqaruvi</span>
            <span className="text-xs bg-[#00c8ff]/10 text-[#00c8ff] px-2.5 py-0.5 rounded-full border border-[#00c8ff]/20 font-bold">
              music.animem.uz
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-white/50 mt-1">
            Qo'shiqlar va rasmlar avtomatik Catbox va <span className="text-[#00c8ff] font-mono">image.animem.uz</span> serveriga yuklanadi.
          </p>
        </div>

        <button
          onClick={fetchSongs}
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold px-4 py-2.5 rounded-xl border border-white/10 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Yangilash</span>
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs sm:text-sm font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-red-400/60 hover:text-red-400">
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="text-emerald-400/60 hover:text-emerald-400">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Add New Song Form Card */}
      <div className="bg-[#111116] border border-[#222] rounded-2xl p-5 sm:p-7 space-y-6">
        <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
          <Plus size={18} className="text-[#ff006a]" />
          <span>Yangi Qo'shiq / Saundtrek Qo'shish</span>
        </h3>

        <form onSubmit={handleCreateSong} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 1. Track Meta */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                  Qo'shiq nomi *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Masalan: Silhouette (シルエット)"
                  className="w-full bg-[#181820] border border-white/10 text-white text-xs sm:text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[#00c8ff] transition-all placeholder:text-white/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                  Ijrochi / Guruh nomi *
                </label>
                <input
                  type="text"
                  required
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Masalan: KANA-BOON, LiSA, YOASOBI"
                  className="w-full bg-[#181820] border border-white/10 text-white text-xs sm:text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[#00c8ff] transition-all placeholder:text-white/30"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                    Anime nomi
                  </label>
                  <input
                    type="text"
                    value={animeTitle}
                    onChange={(e) => setAnimeTitle(e.target.value)}
                    placeholder="Masalan: Naruto Shippuden"
                    className="w-full bg-[#181820] border border-white/10 text-white text-xs sm:text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[#00c8ff] transition-all placeholder:text-white/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                    Kategoriya / Turi
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#181820] border border-white/10 text-white text-xs sm:text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[#00c8ff] transition-all cursor-pointer"
                  >
                    <option value="Opening">Opening (OP)</option>
                    <option value="Ending">Ending (ED)</option>
                    <option value="OST">OST / Saundtrek</option>
                    <option value="J-Pop">J-Pop / Rock</option>
                    <option value="Lo-Fi">Lo-Fi Anime</option>
                    <option value="Remix">Remix</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Media Uploads: ImageUploader (Catbox + image.animem.uz) & Audio Upload */}
            <div className="space-y-5">
              
              {/* Cover Image Upload via Catbox / image.animem.uz */}
              <div className="p-4 rounded-xl bg-[#14141c] border border-white/10">
                <ImageUploader
                  label="Muqova Rasmi (Catbox & image.animem.uz)"
                  value={coverUrl}
                  onChange={setCoverUrl}
                  aspectRatio="square"
                  placeholder="https://image.animem.uz/api/media/..."
                  helpText="Rasm avtomatik Catbox va image.animem.uz serveriga yuklanadi (PNG, JPG, WebP)"
                />
              </div>

              {/* Audio Upload Box */}
              <div className="p-4 rounded-xl bg-[#14141c] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
                    <FileAudio size={16} className="text-[#00c8ff]" />
                    <span>Audio Fayl (Qo'shiq) *</span>
                  </label>
                  
                  <div className="flex items-center gap-1 bg-[#1c1c26] p-1 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setAudioInputMode('upload')}
                      className={`px-2 py-1 rounded transition-colors ${
                        audioInputMode === 'upload' ? 'bg-[#00c8ff] text-black' : 'text-white/50'
                      }`}
                    >
                      Fayl yuklash
                    </button>
                    <button
                      type="button"
                      onClick={() => setAudioInputMode('url')}
                      className={`px-2 py-1 rounded transition-colors ${
                        audioInputMode === 'url' ? 'bg-[#00c8ff] text-black' : 'text-white/50'
                      }`}
                    >
                      URL orqali
                    </button>
                  </div>
                </div>

                {audioInputMode === 'upload' ? (
                  <div 
                    onClick={() => audioInputRef.current?.click()}
                    className="border-2 border-dashed border-white/20 hover:border-[#00c8ff] rounded-xl p-5 text-center cursor-pointer transition-colors bg-white/[0.02]"
                  >
                    <input
                      ref={audioInputRef}
                      type="file"
                      accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac"
                      onChange={handleAudioFileChange}
                      className="hidden"
                    />
                    <Headphones size={28} className="text-[#00c8ff] mx-auto mb-2 opacity-80" />
                    {audioFile ? (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-white truncate">{audioFile.name}</p>
                        <p className="text-[10px] text-[#00c8ff] font-mono">
                          {(audioFile.size / (1024 * 1024)).toFixed(2)} MB • {formatDuration(duration)}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-white/80">Audio faylni tanlang (MP3, WAV, M4A, OGG)</p>
                        <p className="text-[10px] text-white/40">Maksimal hajm: 50MB</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type="url"
                    value={audioUrl}
                    onChange={(e) => setAudioUrl(e.target.value)}
                    placeholder="https://.../song.mp3 yoki HLS (.m3u8) oqim manzili"
                    className="w-full bg-[#181820] border border-white/10 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#00c8ff]"
                  />
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-[#ff006a] to-[#00c8ff] hover:from-[#e6005c] hover:to-[#00b4e6] text-white font-black text-sm py-3.5 rounded-xl shadow-lg shadow-[#ff006a]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>
                      {isUploadingAudio ? "Audio yuklanmoqda..." : "Saqlanmoqda..."}
                    </span>
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    <span>Qo'shiqni katalogga qo'shish</span>
                  </>
                )}
              </button>

            </div>
          </div>
        </form>
      </div>

      {/* Existing Songs Management Table */}
      <div className="bg-[#111116] border border-[#222] rounded-2xl p-5 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Disc3 size={18} className="text-[#00c8ff]" />
            <span>Mavjud Saundtreklar ({songs.length})</span>
          </h3>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Ro'yxatdan qidirish..."
              className="w-full bg-[#181820] border border-white/10 text-white text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-[#00c8ff]"
            />
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
          </div>
        </div>

        {/* Songs List */}
        <div className="divide-y divide-white/5 overflow-x-auto">
          {filteredSongs.length === 0 ? (
            <div className="text-center py-12 text-white/40 text-sm">
              Qo'shiqlar topilmadi
            </div>
          ) : (
            filteredSongs.map((song) => {
              const isPlayingPreview = previewSongId === song.id;

              return (
                <div
                  key={song.id}
                  className="py-3.5 flex items-center justify-between gap-4 hover:bg-white/[0.02] px-2 rounded-xl transition-colors"
                >
                  {/* Left: Thumbnail & Details */}
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <button
                      onClick={() => togglePreview(song)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform active:scale-90 cursor-pointer ${
                        isPlayingPreview
                          ? 'bg-[#ff006a] text-white shadow-lg shadow-[#ff006a]/40'
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                      title={isPlayingPreview ? "To'xtatish" : "Eshitib ko'rish"}
                    >
                      {isPlayingPreview ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                    </button>

                    <img
                      src={song.cover_url}
                      alt={song.title}
                      className="w-11 h-11 rounded-lg object-cover border border-white/10 shrink-0"
                    />

                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {song.title}
                      </p>
                      <p className="text-xs text-white/50 truncate">
                        {song.artist} {song.anime_title ? `• ${song.anime_title}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Middle / Right: Stats & Actions */}
                  <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                    <span className="hidden sm:inline-block text-[11px] bg-white/5 px-2.5 py-0.5 rounded-full text-white/70 border border-white/5">
                      {song.category || 'OST'}
                    </span>
                    <span className="text-xs font-mono text-white/40 hidden md:inline">
                      {formatDuration(song.duration || 0)}
                    </span>
                    <span className="text-xs font-mono text-white/40 hidden lg:inline">
                      {song.plays?.toLocaleString() || 0} tinglash
                    </span>

                    {/* Edit Button */}
                    <button
                      onClick={() => setEditingSong(song)}
                      className="p-2 text-white/50 hover:text-[#00c8ff] hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                      title="Tahrirlash"
                    >
                      <Edit2 size={16} />
                    </button>

                    {/* Delete Button */}
                    {deleteConfirmId === song.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleDeleteSong(song.id)}
                          className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded cursor-pointer"
                        >
                          Ha
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1 bg-white/10 text-white text-xs rounded cursor-pointer"
                        >
                          Yo'q
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(song.id)}
                        className="p-2 text-white/50 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                        title="O'chirish"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Edit Song Modal */}
      {editingSong && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111116] border border-white/10 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 size={16} className="text-[#00c8ff]" />
                <span>Qo'shiqni Tahrirlash</span>
              </h3>
              <button
                onClick={() => setEditingSong(null)}
                className="text-white/40 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateSong} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/70 mb-1">Nomi</label>
                <input
                  type="text"
                  required
                  value={editingSong.title}
                  onChange={(e) => setEditingSong({ ...editingSong, title: e.target.value })}
                  className="w-full bg-[#181820] border border-white/10 text-white text-xs rounded-xl px-3 py-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/70 mb-1">Ijrochi</label>
                <input
                  type="text"
                  required
                  value={editingSong.artist}
                  onChange={(e) => setEditingSong({ ...editingSong, artist: e.target.value })}
                  className="w-full bg-[#181820] border border-white/10 text-white text-xs rounded-xl px-3 py-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/70 mb-1">Anime</label>
                <input
                  type="text"
                  value={editingSong.anime_title || ''}
                  onChange={(e) => setEditingSong({ ...editingSong, anime_title: e.target.value })}
                  className="w-full bg-[#181820] border border-white/10 text-white text-xs rounded-xl px-3 py-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/70 mb-1">Kategoriya</label>
                <select
                  value={editingSong.category || 'Opening'}
                  onChange={(e) => setEditingSong({ ...editingSong, category: e.target.value })}
                  className="w-full bg-[#181820] border border-white/10 text-white text-xs rounded-xl px-3 py-2.5"
                >
                  <option value="Opening">Opening</option>
                  <option value="Ending">Ending</option>
                  <option value="OST">OST</option>
                  <option value="J-Pop">J-Pop</option>
                  <option value="Lo-Fi">Lo-Fi</option>
                  <option value="Remix">Remix</option>
                </select>
              </div>

              {/* Cover with ImageUploader */}
              <div>
                <ImageUploader
                  label="Muqova Rasmi (Catbox & image.animem.uz)"
                  value={editingSong.cover_url}
                  onChange={(url) => setEditingSong({ ...editingSong, cover_url: url })}
                  aspectRatio="square"
                  helpText="Rasm avtomatik Catbox va image.animem.uz ga joylanadi"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/70 mb-1">Audio URL</label>
                <input
                  type="text"
                  value={editingSong.audio_url}
                  onChange={(e) => setEditingSong({ ...editingSong, audio_url: e.target.value })}
                  className="w-full bg-[#181820] border border-white/10 text-white text-xs rounded-xl px-3 py-2.5"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSong(null)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00c8ff] hover:bg-[#00b4e6] text-black text-xs font-black rounded-xl"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
