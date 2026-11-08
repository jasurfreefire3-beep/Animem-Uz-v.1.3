import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Shield,
  Coins,
  Award,
  Clock,
  Heart,
  Settings,
  Bell,
  Trash2,
  ExternalLink,
  LogOut,
  Sparkles,
  ChevronRight,
  Camera,
  Loader2,
  Play,
  Edit3,
  Check,
  X,
  Lock,
  Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { uploadUserAvatar, uploadUserBanner, updateUserProfile, fetchAnimes } from '../services/api';
import { Anime } from '../types';

export const ProfileScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user, token, logout, favorites, history, openAuthModal, login } = useAuth();

  const [activeTab, setActiveTab] = useState<'history' | 'favorites' | 'settings'>('history');
  const [allAnimes, setAllAnimes] = useState<Anime[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);

  // Upload states
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Edit profile states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    fetchAnimes().then(setAllAnimes).catch(() => {});
  }, []);

  // Handle Avatar Upload directly to Catbox / R2
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!token) {
      openAuthModal();
      return;
    }

    setUploadingAvatar(true);
    try {
      const avatarUrl = await uploadUserAvatar(file, token);
      if (avatarUrl && user) {
        const updated = { ...user, avatar_url: avatarUrl };
        login(token, updated);
      }
    } catch (err: any) {
      alert(err.message || "Avatarni yuklashda xatolik yuz berdi");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Handle Banner Upload directly to Catbox / R2
  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!token) {
      openAuthModal();
      return;
    }

    setUploadingBanner(true);
    try {
      const bannerUrl = await uploadUserBanner(file, token);
      if (bannerUrl && user) {
        const updated = { ...user, banner_url: bannerUrl };
        login(token, updated);
      }
    } catch (err: any) {
      alert(err.message || "Banerni yuklashda xatolik yuz berdi");
    } finally {
      setUploadingBanner(false);
    }
  };

  // Save profile info
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !user) return;

    setSavingProfile(true);
    try {
      const updatedUser = await updateUserProfile({ name: editName, bio: editBio }, token);
      login(token, { ...user, ...updatedUser });
      setShowEditModal(false);
    } catch (err: any) {
      alert(err.message || "Profilni yangilashda xatolik");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleClearCache = () => {
    if (window.confirm("Ilovaning oflayn keshini tozalashni xohlaysizmi?")) {
      localStorage.removeItem('app_cached_media');
      alert("Kesh muvaffaqiyatli tozalandi!");
    }
  };

  // Resolve anime objects for history & favorites
  const historyAnimes = history.map(h => {
    const anime = allAnimes.find(a => String(a.id) === String(h.animeId));
    return { ...h, anime };
  }).filter(h => Boolean(h.anime));

  const favoriteAnimes = allAnimes.filter(a =>
    favorites.some(favId => String(favId) === String(a.id))
  );

  return (
    <div className="space-y-4 px-4 pt-3 pb-8">
      {/* Profile Header with Banner & Avatar */}
      <div className="relative overflow-hidden rounded-3xl bg-[#0f1016] border border-white/10 shadow-2xl">
        {/* Banner Area */}
        <div className="relative h-28 w-full bg-[#181928] overflow-hidden group">
          {user?.banner_url ? (
            <img src={user.banner_url} alt="banner" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-[#181928] via-[#2d1238] to-[#121324]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f1016] via-transparent to-black/30" />

          {/* Banner Upload Button */}
          {user && (
            <label className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 text-white backdrop-blur-md flex items-center justify-center cursor-pointer transition-all active:scale-95 z-20 border border-white/10 shadow-lg">
              <input
                type="file"
                accept="image/*"
                onChange={handleBannerChange}
                disabled={uploadingBanner}
                className="hidden"
              />
              {uploadingBanner ? <Loader2 size={13} className="animate-spin text-[#ff006a]" /> : <Camera size={14} />}
            </label>
          )}
        </div>

        {/* Profile Card Body */}
        <div className="p-4 pt-0 -mt-10 relative z-10 space-y-3">
          <div className="flex items-end justify-between gap-3">
            {/* Avatar with Pro Frame & Upload trigger */}
            <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/20 p-0.5 bg-[#0f1016] shadow-xl shrink-0 group">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover rounded-xl" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-black text-2xl text-[#ff006a] uppercase bg-[#181928]">
                  {user?.name ? user.name.charAt(0) : 'U'}
                </div>
              )}

              {/* Equipped Frame Overlay */}
              {user?.avatar_frame_url && (
                <img
                  src={user.avatar_frame_url}
                  alt="frame"
                  className="absolute inset-0 w-full h-full pointer-events-none scale-125"
                />
              )}

              {/* Avatar Upload Camera Overlay */}
              {user && (
                <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity rounded-xl">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    disabled={uploadingAvatar}
                    className="hidden"
                  />
                  {uploadingAvatar ? <Loader2 size={20} className="text-[#ff006a] animate-spin" /> : <Camera size={20} className="text-white" />}
                </label>
              )}
            </div>

            {/* Edit Profile or Login button */}
            <div className="pb-1">
              {user ? (
                <button
                  onClick={() => {
                    setEditName(user.name || '');
                    setEditBio(user.bio || '');
                    setShowEditModal(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/90 border border-white/10 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <Edit3 size={13} />
                  <span>Tahrirlash</span>
                </button>
              ) : (
                <button
                  onClick={openAuthModal}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff006a] to-[#7928ca] text-white text-xs font-black shadow-[0_0_15px_rgba(255,0,106,0.4)] active:scale-95 transition-all"
                >
                  Kirish / Ro'yxatdan o'tish
                </button>
              )}
            </div>
          </div>

          {/* User Details */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-black text-lg text-white truncate">
                {user?.name || "Mehmon Foydalanuvchi"}
              </h3>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                user?.role === 'admin'
                  ? 'bg-red-500/20 text-red-400 border-red-500/30'
                  : 'bg-[#ff006a]/20 text-[#ff006a] border-[#ff006a]/30'
              }`}>
                {user?.role === 'admin' ? '⚡ ADMIN' : '✨ PRO OTAKU'}
              </span>
            </div>

            <p className="text-xs text-white/50 truncate">
              {user?.email || "Animem Uz — O'zbekistondagi eng yaxshi anime ilovasi"}
            </p>

            {user?.bio && (
              <p className="text-xs text-white/80 leading-relaxed bg-white/5 p-2 rounded-xl border border-white/5 mt-1">
                {user.bio}
              </p>
            )}
          </div>

          {/* Level & XP Progress Bar */}
          <div className="bg-black/40 rounded-2xl p-3 border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Award size={14} className="text-[#00dfd8]" /> Daraja: {user?.level || 15} (Otaku Master)
              </span>
              <span className="font-mono text-[#ff006a] font-black">
                {user?.xp || 3450} / 5000 XP
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#ff006a] to-[#00dfd8] rounded-full w-[69%]" />
            </div>
          </div>

          {/* Coins & Quick Stats */}
          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-0.5">
              <div className="flex items-center justify-center gap-1 text-amber-400 text-xs font-black">
                <Coins size={13} />
                <span>{user?.coins || 1250}</span>
              </div>
              <span className="text-[10px] text-white/40">Tangalar</span>
            </div>

            <div
              onClick={() => setActiveTab('favorites')}
              className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-0.5 cursor-pointer active:scale-95 transition-transform"
            >
              <div className="flex items-center justify-center gap-1 text-[#ff006a] text-xs font-black">
                <Heart size={13} />
                <span>{favorites.length}</span>
              </div>
              <span className="text-[10px] text-white/40">Sevimlilar</span>
            </div>

            <div
              onClick={() => setActiveTab('history')}
              className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-0.5 cursor-pointer active:scale-95 transition-transform"
            >
              <div className="flex items-center justify-center gap-1 text-[#00dfd8] text-xs font-black">
                <Clock size={13} />
                <span>{history.length}</span>
              </div>
              <span className="text-[10px] text-white/40">Ko'rilgan</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center bg-[#10111a] p-1 rounded-2xl border border-white/10">
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-[#ff006a] text-white shadow-[0_0_12px_rgba(255,0,106,0.4)]'
              : 'text-white/50 hover:text-white'
          }`}
        >
          <Clock size={14} />
          <span>Tarix</span>
        </button>

        <button
          onClick={() => setActiveTab('favorites')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'favorites'
              ? 'bg-[#ff006a] text-white shadow-[0_0_12px_rgba(255,0,106,0.4)]'
              : 'text-white/50 hover:text-white'
          }`}
        >
          <Heart size={14} />
          <span>Sevimlilar</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'settings'
              ? 'bg-[#ff006a] text-white shadow-[0_0_12px_rgba(255,0,106,0.4)]'
              : 'text-white/50 hover:text-white'
          }`}
        >
          <Settings size={14} />
          <span>Sozlamalar</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'history' && (
        <div className="space-y-2.5">
          {historyAnimes.length === 0 ? (
            <div className="py-12 text-center text-xs text-white/40 bg-white/5 rounded-2xl border border-white/5 p-6">
              Hozircha tomosha tarixi mavjud emas. Animelarni tomosha qiling va ular shu yerda avtomatik saqlanadi!
            </div>
          ) : (
            historyAnimes.map((item, idx) => (
              <div
                key={idx}
                onClick={() => navigate(`/watch/${item.animeId}?ep=${item.episode}`)}
                className="flex items-center gap-3 p-2.5 rounded-2xl bg-[#0f1016] border border-white/5 hover:border-white/20 transition-all cursor-pointer active:scale-[0.98]"
              >
                <img
                  src={item.anime?.poster_url || (item.anime as any)?.image_url}
                  alt={item.anime?.title}
                  className="w-12 h-16 object-cover rounded-xl shrink-0"
                />

                <div className="flex-1 min-w-0 space-y-1">
                  <h4 className="font-bold text-xs text-white truncate">
                    {item.anime?.title}
                  </h4>
                  <div className="flex items-center gap-2 text-[10px] text-white/50">
                    <span className="text-[#ff006a] font-bold">{item.episode}-qism</span>
                    <span>•</span>
                    <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>

                <button className="w-8 h-8 rounded-full bg-[#ff006a]/20 text-[#ff006a] flex items-center justify-center hover:bg-[#ff006a] hover:text-white transition-all shrink-0">
                  <Play size={14} className="fill-current ml-0.5" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'favorites' && (
        <div className="space-y-2.5">
          {favoriteAnimes.length === 0 ? (
            <div className="py-12 text-center text-xs text-white/40 bg-white/5 rounded-2xl border border-white/5 p-6">
              Sevimlilar ro'yxatingiz bo'sh. Anime sahifasidagi yurakcha tugmasini bosib saqlang!
            </div>
          ) : (
            favoriteAnimes.map((anime) => (
              <div
                key={anime.id}
                onClick={() => navigate(`/watch/${anime.id}`)}
                className="flex items-center gap-3 p-2.5 rounded-2xl bg-[#0f1016] border border-white/5 hover:border-white/20 transition-all cursor-pointer active:scale-[0.98]"
              >
                <img
                  src={anime.poster_url || (anime as any).image_url}
                  alt={anime.title}
                  className="w-12 h-16 object-cover rounded-xl shrink-0"
                />

                <div className="flex-1 min-w-0 space-y-1">
                  <h4 className="font-bold text-xs text-white truncate">
                    {anime.title}
                  </h4>
                  <div className="flex items-center gap-2 text-[10px] text-white/50">
                    <span className="text-amber-400 font-bold">★ {anime.rating || 9.5}</span>
                    <span>•</span>
                    <span>{anime.episodes_count || 12} qism</span>
                  </div>
                </div>

                <button className="w-8 h-8 rounded-full bg-[#ff006a]/20 text-[#ff006a] flex items-center justify-center hover:bg-[#ff006a] hover:text-white transition-all shrink-0">
                  <Play size={14} className="fill-current ml-0.5" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-3">
          {/* Cache clear button */}
          <div
            onClick={handleClearCache}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-[#0f1016] border border-white/5 cursor-pointer hover:bg-white/5 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white/60">
                <Trash2 size={16} />
              </div>
              <div>
                <h5 className="font-bold text-xs text-white">Keshni tozalash</h5>
                <p className="text-[10px] text-white/40">Oflayn kesh va vaqtinchalik ma'lumotlar</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-white/40" />
          </div>

          {/* Telegram Channel */}
          <a
            href="https://t.me/animem_uz"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between p-3.5 rounded-2xl bg-[#0f1016] border border-white/5 cursor-pointer hover:bg-white/5 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center">
                <ExternalLink size={16} />
              </div>
              <div>
                <h5 className="font-bold text-xs text-white">Rasmiy Telegram Kanal</h5>
                <p className="text-[10px] text-white/40">@animem_uz</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-white/40" />
          </a>

          {/* Logout button */}
          {user && (
            <button
              onClick={logout}
              className="w-full p-3.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <LogOut size={16} />
              <span>Hisobdan chiqish</span>
            </button>
          )}
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#0f1016] border border-white/15 rounded-3xl p-5 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white"
            >
              <X size={18} />
            </button>

            <h4 className="font-display font-black text-sm text-white flex items-center gap-2">
              <Edit3 size={16} className="text-[#ff006a]" />
              <span>Profilni tahrirlash</span>
            </h4>

            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-white/70 block mb-1">
                  Ismingiz
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#161726] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff006a]"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-white/70 block mb-1">
                  Bio (O'zingiz haqingizda)
                </label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={3}
                  placeholder="Sevimli anime janrlaringiz yoki iqtibos..."
                  className="w-full bg-[#161726] border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#ff006a]"
                />
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#ff006a] to-[#7928ca] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(255,0,106,0.35)] active:scale-95"
              >
                {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                <span>Saqlash</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
