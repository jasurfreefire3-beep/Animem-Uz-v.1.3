import React from 'react';
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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ProfileScreen: React.FC = () => {
  const { user, logout, favorites, history } = useAuth();

  const handleClearCache = () => {
    if (window.confirm("Ilovaning oflayn keshini tozalashni xohlaysizmi?")) {
      localStorage.removeItem('app_cached_media');
      alert("Kesh muvaffaqiyatli tozalandi!");
    }
  };

  return (
    <div className="space-y-5 px-4 pt-3 pb-8">
      {/* User Header Profile Card */}
      <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-[#0f1016] via-[#141520] to-[#07070a] border border-white/10 shadow-2xl space-y-4">
        <div className="flex items-center gap-4">
          {/* Avatar with Pro Frame */}
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-[#ff006a] p-0.5 shadow-[0_0_20px_rgba(255,0,106,0.35)] shrink-0 bg-[#07070a]">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover rounded-xl" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-black text-2xl text-[#ff006a] uppercase">
                {user?.name ? user.name.charAt(0) : 'U'}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-black text-lg text-white truncate">
                {user?.name || "Mehmon Foydalanuvchi"}
              </h3>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                user?.role === 'admin'
                  ? 'bg-red-500/20 text-red-400 border-red-500/30'
                  : 'bg-[#ff006a]/20 text-[#ff006a] border-[#ff006a]/30'
              }`}>
                {user?.role === 'admin' ? '⚡ ADMIN' : '✨ PRO VIP'}
              </span>
            </div>
            <p className="text-xs text-white/40 truncate">
              {user?.email || "Animem Uz Mobil Ilovasi"}
            </p>
          </div>
        </div>

        {/* Level and XP progress bar */}
        <div className="bg-black/40 rounded-2xl p-3 border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Award size={14} className="text-[#00dfd8]" /> Daraja: {user?.level || 15} (Otaku Master)
            </span>
            <span className="font-mono text-[#ff006a] font-black">
              {user?.xp || 3450} / 5000 XP
            </span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#ff006a] to-[#00dfd8] rounded-full w-[69%]" />
          </div>
        </div>

        {/* Coins & Stats Cards */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-0.5">
            <div className="flex items-center justify-center gap-1 text-amber-400 text-xs font-black">
              <Coins size={13} />
              <span>{user?.coins || 1250}</span>
            </div>
            <span className="text-[10px] text-white/40">Animem Tangalar</span>
          </div>

          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-0.5">
            <div className="flex items-center justify-center gap-1 text-[#ff006a] text-xs font-black">
              <Heart size={13} />
              <span>{favorites.length}</span>
            </div>
            <span className="text-[10px] text-white/40">Sevimlilar</span>
          </div>

          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-0.5">
            <div className="flex items-center justify-center gap-1 text-[#00dfd8] text-xs font-black">
              <Clock size={13} />
              <span>{history.length}</span>
            </div>
            <span className="text-[10px] text-white/40">Tarix</span>
          </div>
        </div>
      </div>

      {/* Settings & Links Section */}
      <div className="space-y-2">
        <h4 className="text-xs font-black uppercase text-white/40 tracking-wider px-1">
          Ilova Sozlamalari
        </h4>

        <div className="rounded-2xl bg-[#0f1016] border border-white/10 divide-y divide-white/5 overflow-hidden">
          {/* Notifications */}
          <div className="flex items-center justify-between p-3.5 hover:bg-white/5 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Bell size={16} />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white">Yangi qism bildirishnomalari</h5>
                <p className="text-[10px] text-white/40">Sevimli animelar chiqqanda xabar berish</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-400">Yoniq</span>
          </div>

          {/* Clear Cache */}
          <div
            onClick={handleClearCache}
            className="flex items-center justify-between p-3.5 hover:bg-white/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Trash2 size={16} />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white">Ilova keshini tozalash</h5>
                <p className="text-[10px] text-white/40">Xotirani bo'shatish va yangilash</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-white/30" />
          </div>

          {/* Web Portal Link */}
          <a
            href="https://animem.uz"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between p-3.5 hover:bg-white/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#ff006a]/10 text-[#ff006a] flex items-center justify-center">
                <ExternalLink size={16} />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white">Animem.uz Veb Portali</h5>
                <p className="text-[10px] text-white/40">Rasmiy saytga o'tish</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-white/30" />
          </a>
        </div>
      </div>

      {/* Logout / Switch Account */}
      {user ? (
        <button
          onClick={logout}
          className="w-full py-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <LogOut size={15} />
          <span>Akkountdan chiqish</span>
        </button>
      ) : (
        <a
          href="/login"
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#ff006a] to-[#7928ca] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,0,106,0.4)] active:scale-95 transition-all"
        >
          <User size={15} />
          <span>Tizimga kirish / Ro'yxatdan o'tish</span>
        </a>
      )}

      {/* App Version Info */}
      <div className="text-center pt-2 space-y-0.5">
        <p className="text-[10px] text-white/30 font-mono">
          Animem Uz Mobile • v1.0.0 (Pro Build)
        </p>
        <p className="text-[9px] text-white/20">
          O'zbekistonning eng yirik anime platformasi
        </p>
      </div>
    </div>
  );
};
