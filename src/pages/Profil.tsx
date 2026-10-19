
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Anime, toSlug } from '../types';
import { 
  Shield, Clock, Heart, MessageSquare, Edit3, Save, Camera, 
  Loader2, Globe, Send, Instagram, Youtube, Tv, Share2, 
  Check, X, Sparkles, Film, Star, ArrowRight, Lock, Eye, Trash2,
  RotateCcw, LogIn, Play, Upload, AlertCircle, Link as LinkIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TelegramIcon, InstagramIcon, TikTokIcon, YouTubeIcon, 
  DiscordIcon, FacebookIcon, VKIcon 
} from '../components/SocialIcons';
import LoadingScreen from '../components/LoadingScreen';
import { isVideoMedia } from '../components/UserAvatar';
import { getAllWatchProgress } from '../services/watchProgressService';

// Default banner if none provided
const DEFAULT_BANNER = "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80";

function getOnlineStatusInfo(lastSeen?: string, isOwner?: boolean) {
  if (isOwner) {
    return { isOnline: true, text: "Hozir tarmoqda (Online)" };
  }
  if (!lastSeen) return { isOnline: false, text: "Oflayn" };
  const seenDate = new Date(lastSeen).getTime();
  if (isNaN(seenDate)) return { isOnline: false, text: "Oflayn" };

  const now = Date.now();
  const diffMs = now - seenDate;
  
  if (diffMs < 300000) { // 5 minutes
    return { isOnline: true, text: "Hozir tarmoqda (Online)" };
  }

  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) {
    return { isOnline: false, text: `${diffMins} daqiqa oldin tarmoqda edi` };
  }

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return { isOnline: false, text: `${diffHours} soat oldin tarmoqda edi` };
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return { isOnline: false, text: `${diffDays} kun oldin tarmoqda edi` };
  }

  return { isOnline: false, text: "Yaqinda tarmoqda edi" };
}

export default function Profil() {
  const params = useParams();
  const targetId = params.id;
  const { user: currentUser, token, login } = useAuth();

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editBannerUrl, setEditBannerUrl] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editTelegram, setEditTelegram] = useState('');
  const [editInstagram, setEditInstagram] = useState('');
  const [editTiktok, setEditTiktok] = useState('');
  const [editYoutube, setEditYoutube] = useState('');
  const [editDiscord, setEditDiscord] = useState('');
  const [editFacebook, setEditFacebook] = useState('');
  const [editVk, setEditVk] = useState('');

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);


  // Format watch time accurately into hours and minutes in Uzbek
  const formatWatchTime = (minutes?: number) => {
    const mins = Number(minutes) || 0;
    if (mins <= 0) return "0 daqiqa";
    const hours = Math.floor(mins / 60);
    const remainderMins = mins % 60;
    if (hours > 0 && remainderMins > 0) {
      return `${hours} soat ${remainderMins} daq`;
    } else if (hours > 0) {
      return `${hours} soat`;
    } else {
      return `${remainderMins} daqiqa`;
    }
  };

  // Load user profile
  const fetchProfile = async () => {
    setLoading(true);
    setError('');

    const storedUser = (() => {
      try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch (e) { return null; }
    })();
    const activeUser = currentUser || storedUser;
    const idToFetch = targetId || activeUser?.id;

    if (!idToFetch || idToFetch === 'undefined' || idToFetch === 'null') {
      setLoading(false);
      return;
    }

    const effectiveToken = token || localStorage.getItem('token') || (activeUser as any)?.token;
    const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
    const headers: Record<string, string> = {};
    if (effectiveToken) {
      headers['Authorization'] = `Bearer ${effectiveToken}`;
    }

    let retries = 3;
    let delay = 600;

    while (retries > 0) {
      try {
        const res = await fetch(`${API_BASE}/api/user/${idToFetch}`, { headers });
        const contentType = res.headers.get("content-type");
        
        if (res.status === 404) {
          setError("Foydalanuvchi topilmadi");
          setLoading(false);
          return;
        }

        if (!res.ok) {
          if (contentType && contentType.includes("application/json")) {
            const errData = await res.json();
            throw new Error(errData.error || "Foydalanuvchi topilmadi");
          }
          throw new Error(`Server xatosi (${res.status})`);
        }

        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Noto'g'ri server javobi");
        }

        const data = await res.json();
        if (!data || !data.user) {
          setError("Foydalanuvchi topilmadi");
          setLoading(false);
          return;
        }

        const isUserOwner = Boolean(!targetId || data.isOwner || (activeUser && String(activeUser.id) === String(data.user?.id)));
        setIsOwner(isUserOwner);

        // Auto-sync owner's local favorites and watch history to server if needed
        if (isUserOwner && effectiveToken) {
          const savedFavs = localStorage.getItem('anime_favorites');
          const allProgress = getAllWatchProgress();
          let computedMinutes = 0;
          for (const prog of Object.values(allProgress)) {
            if (prog && prog.episodes) {
              computedMinutes += Object.values(prog.episodes).filter((ep: any) => ep && ep.watched).length * 24;
            } else if (prog && prog.lastEpisode) {
              computedMinutes += Number(prog.lastEpisode) * 24;
            }
          }

          if (computedMinutes > (data.user.watch_time_minutes || 0)) {
            data.user.watch_time_minutes = computedMinutes;
            fetch(`${API_BASE}/api/user/watch-progress`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ total_minutes: computedMinutes })
            }).catch(() => {});
          }

          if (savedFavs && (!data.user.favorites || data.user.favorites.length === 0)) {
            try {
              const favIds = JSON.parse(savedFavs);
              if (Array.isArray(favIds) && favIds.length > 0) {
                fetch(`${API_BASE}/api/user/favorites`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({ favorites: favIds })
                }).catch(() => {});

                // Pre-populate favorites so UI immediately displays them
                const animesRes = await fetch(`${API_BASE}/api/animes`).catch(() => null);
                if (animesRes && animesRes.ok) {
                  const animesList = await animesRes.json();
                  if (Array.isArray(animesList)) {
                    data.user.favorites = animesList.filter((a: any) => favIds.some((f: any) => String(f) === String(a.id)));
                  }
                }
              }
            } catch (e) {}
          }
        }

        setProfileUser(data.user);
        
        // Populate edit state values
        setEditName(data.user.name || '');
        setEditBio(data.user.bio || '');
        setEditBannerUrl(data.user.banner_url || '');
        setEditAvatarUrl(data.user.avatar_url || '');
        setEditTelegram(data.user.telegram || '');
        setEditInstagram(data.user.instagram || '');
        setEditTiktok(data.user.tiktok || '');
        setEditYoutube(data.user.youtube || '');
        setEditDiscord(data.user.discord || '');
        setEditFacebook(data.user.facebook || '');
        setEditVk(data.user.vk || '');
        setLoading(false);

        return; // Success
      } catch (err: any) {
        retries--;
        console.warn(`Profil yuklashda urinish muvaffaqiyatsiz bo'ldi. Qolgan urinishlar: ${retries}`, err);
        if (retries === 0) {
          const rawMsg = err.message || '';
          if (rawMsg.includes('Failed to fetch') || rawMsg.includes('NetworkError')) {
            setError("Server bilan aloqa o'rnatib bo'lmadi. Iltimos, qayta urinib ko'ring.");
          } else {
            setError(rawMsg || "Profilni yuklashda xatolik yuz berdi");
          }
          setLoading(false);
        } else {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 1.5;
        }
      }
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [targetId, currentUser, token]);

  // Client-side image compression
  const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      // If GIF or video, keep original raw data URL to preserve animation frames!
      if (
        file.type === 'image/gif' || 
        file.name.toLowerCase().endsWith('.gif') ||
        file.type.startsWith('video/') ||
        file.name.toLowerCase().endsWith('.webm') ||
        file.name.toLowerCase().endsWith('.mp4')
      ) {
        const rawReader = new FileReader();
        rawReader.onload = (e) => resolve(e.target?.result as string);
        rawReader.onerror = (err) => reject(err);
        rawReader.readAsDataURL(file);
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';

    const effectiveToken = token || localStorage.getItem('token') || (currentUser as any)?.token;
    if (!file) return;
    if (!effectiveToken) {
      alert("Iltimos, avval hisobingizga kiring!");
      return;
    }

    setUploadingAvatar(true);
    try {
      const resizedBase64 = await resizeImage(file, 400, 400);

      const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${API_BASE}/api/user/avatar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${effectiveToken}`
        },
        body: JSON.stringify({ avatar_url: resizedBase64 })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Avatarni yuklashda xatolik yuz berdi");
      }

      const finalAvatar = data.avatar_url || data.user?.avatar_url || resizedBase64;
      setProfileUser(prev => prev ? { ...prev, avatar_url: finalAvatar } : null);
      setEditAvatarUrl(finalAvatar);
      if (currentUser) {
        login(effectiveToken, { ...currentUser, avatar_url: finalAvatar });
      }
    } catch (err: any) {
      console.error("Avatar upload error:", err);
      alert(err.message || "Avatarni yuklashda xatolik yuz berdi");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';

    const effectiveToken = token || localStorage.getItem('token') || (currentUser as any)?.token;
    if (!file) return;
    if (!effectiveToken) {
      alert("Iltimos, avval hisobingizga kiring!");
      return;
    }

    setUploadingBanner(true);
    try {
      const resizedBase64 = await resizeImage(file, 1920, 1080);

      const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${API_BASE}/api/user/banner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${effectiveToken}`
        },
        body: JSON.stringify({ banner_url: resizedBase64 })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Fon rasmini yuklashda xatolik yuz berdi");
      }

      const savedBanner = data.banner_url || data?.user?.banner_url || resizedBase64;
      setProfileUser(prev => prev ? { ...prev, banner_url: savedBanner } : null);
      setEditBannerUrl(savedBanner);
      if (currentUser) {
        login(effectiveToken, { ...currentUser, banner_url: savedBanner });
      }
    } catch (err: any) {
      console.error("Banner upload error:", err);
      alert(err.message || "Fon rasmini yuklashda xatolik yuz berdi");
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleRemoveBanner = async () => {
    const effectiveToken = token || localStorage.getItem('token') || (currentUser as any)?.token;
    if (!effectiveToken || !isOwner) return;
    if (!window.confirm("Haqiqatan ham profil orqa fon rasmini o'chirmoqchimisiz?")) return;

    setUploadingBanner(true);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${API_BASE}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${effectiveToken}`
        },
        body: JSON.stringify({
          name: profileUser?.name,
          banner_url: ''
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Fon rasmini o'chirishda xatolik");
      }

      setProfileUser(prev => prev ? { ...prev, banner_url: undefined } : null);
      setEditBannerUrl('');
      if (currentUser) {
        login(effectiveToken, { ...currentUser, banner_url: undefined });
      }
    } catch (err: any) {
      console.error("Remove banner error:", err);
      alert(err.message || "Fon rasmini o'chirishda xatolik yuz berdi");
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveToken = token || localStorage.getItem('token') || (currentUser as any)?.token;
    if (!editName.trim() || !effectiveToken) return;

    setSaving(true);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
      const payload = {
        name: editName.trim(),
        bio: editBio,
        banner_url: editBannerUrl,
        avatar_url: editAvatarUrl,
        telegram: editTelegram,
        instagram: editInstagram,
        tiktok: editTiktok,
        youtube: editYoutube,
        discord: editDiscord,
        facebook: editFacebook,
        vk: editVk
      };

      const res = await fetch(`${API_BASE}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${effectiveToken}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Profilni saqlashda xatolik");
      }

      setProfileUser(prev => prev ? {
        ...prev,
        ...payload
      } : null);

      if (currentUser && data.user) {
        login(data.token || token, { ...currentUser, name: editName.trim(), avatar_url: editAvatarUrl || currentUser.avatar_url });
      }

      setIsEditing(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Saqlashda xatolik");
    } finally {
      setSaving(false);
    }
  };

  // Format social link for external redirect
  const formatSocialUrl = (platform: string, handleOrUrl: any) => {
    if (!handleOrUrl || typeof handleOrUrl !== 'string') return '#';
    const trimmed = handleOrUrl.trim();
    if (!trimmed) return '#';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    const cleanHandle = trimmed.replace(/^@/, '');
    switch (platform) {
      case 'telegram': return `https://t.me/${cleanHandle}`;
      case 'instagram': return `https://instagram.com/${cleanHandle}`;
      case 'tiktok': return `https://tiktok.com/@${cleanHandle}`;
      case 'youtube': return `https://youtube.com/${cleanHandle.startsWith('c/') || cleanHandle.startsWith('@') ? cleanHandle : '@' + cleanHandle}`;
      case 'facebook': return `https://facebook.com/${cleanHandle}`;
      case 'discord': return `https://discord.com/users/${cleanHandle}`;
      case 'vk': return `https://vk.com/${cleanHandle}`;
      default: return trimmed;
    }
  };

  if (loading) {
    return <LoadingScreen size="lg" />;
  }

  // If user is not logged in and didn't specify another user's id
  if (!targetId && !currentUser) {
    return (
      <div className="max-w-md mx-auto py-16 px-6 text-center space-y-5 bg-[#111] border border-[#222] rounded-2xl shadow-xl my-8">
        <div className="w-16 h-16 bg-[#ff006a]/10 border border-[#ff006a]/30 text-[#ff006a] rounded-full flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(255,0,106,0.2)]">
          <LogIn size={28} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white uppercase tracking-wide">Profilga kirish talab qilinadi</h2>
          <p className="text-white/50 text-xs leading-relaxed">
            Shaxsiy profilingiz, tomosha tarixingiz va saqlangan animelaringizni ko'rish uchun tizimga kiring.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link 
            to="/login" 
            className="bg-[#ff006a] hover:bg-[#ff006a]/90 text-white px-6 py-2.5 rounded-lg text-xs font-bold uppercase transition-all shadow-[0_0_15px_rgba(255,0,106,0.3)]"
          >
            Kirish
          </Link>
          <Link 
            to="/register" 
            className="bg-[#18181c] hover:bg-[#222] text-white/80 hover:text-white border border-[#333] px-6 py-2.5 rounded-lg text-xs font-bold uppercase transition-all"
          >
            Ro'yxatdan o'tish
          </Link>
        </div>
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="max-w-md mx-auto py-16 px-6 text-center space-y-5 bg-[#111] border border-[#222] rounded-2xl shadow-xl my-8">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto">
          <Shield size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-white uppercase">{error || "Foydalanuvchi topilmadi"}</h2>
          <p className="text-white/40 text-xs">
            Server bilan bog'lanishda muammo bo'lishi mumkin. Qaytadan urinib ko'ring.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 justify-center pt-2">
          <button
            onClick={() => fetchProfile()}
            className="inline-flex items-center gap-2 bg-[#ff006a] hover:bg-[#ff006a]/90 text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase transition-all shadow-[0_0_15px_rgba(255,0,106,0.3)]"
          >
            <RotateCcw size={14} /> Qayta urinish
          </button>
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 bg-[#18181c] hover:bg-[#222] text-white/80 hover:text-white border border-[#333] px-5 py-2.5 rounded-lg text-xs font-bold uppercase transition-all"
          >
            Bosh sahifaga
          </Link>
        </div>
      </div>
    );
  }

  const socialLinks = [
    { key: 'telegram', label: 'Telegram', value: profileUser.telegram, icon: TelegramIcon, glow: 'hover:shadow-[0_0_20px_rgba(0,136,204,0.7)]' },
    { key: 'instagram', label: 'Instagram', value: profileUser.instagram, icon: InstagramIcon, glow: 'hover:shadow-[0_0_20px_rgba(225,48,108,0.7)]' },
    { key: 'youtube', label: 'YouTube', value: profileUser.youtube, icon: YouTubeIcon, glow: 'hover:shadow-[0_0_20px_rgba(255,0,0,0.7)]' },
    { key: 'discord', label: 'Discord', value: profileUser.discord, icon: DiscordIcon, glow: 'hover:shadow-[0_0_20px_rgba(88,101,242,0.7)]' },
    { key: 'facebook', label: 'Facebook', value: profileUser.facebook, icon: FacebookIcon, glow: 'hover:shadow-[0_0_20px_rgba(24,119,242,0.7)]' },
    { key: 'tiktok', label: 'TikTok', value: profileUser.tiktok, icon: TikTokIcon, glow: 'hover:shadow-[0_0_20px_rgba(37,244,238,0.7)]' },
    { key: 'vk', label: 'VKontakte', value: profileUser.vk, icon: VKIcon, glow: 'hover:shadow-[0_0_20px_rgba(0,119,255,0.7)]' },
  ].filter(s => Boolean(s.value));

  const favoritesList: Anime[] = Array.isArray(profileUser.favorites) ? profileUser.favorites : [];

  const handleRemoveFavorite = async (e: React.MouseEvent, animeId: string | number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token) return;

    const updated = favoritesList.filter(a => String(a.id) !== String(animeId));
    setProfileUser(prev => prev ? { ...prev, favorites: updated } : null);

    // update localStorage
    const savedFavs = localStorage.getItem('anime_favorites');
    if (savedFavs) {
      try {
        const favIds = JSON.parse(savedFavs).filter((id: any) => String(id) !== String(animeId));
        localStorage.setItem('anime_favorites', JSON.stringify(favIds));
      } catch (e) {}
    }

    const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
    fetch(`${API_BASE}/api/user/favorites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ favorites: updated.map(a => a.id) })
    }).catch(() => {});
  };

  const hasCustomBg = Boolean(profileUser?.banner_url && profileUser.banner_url.trim() !== '');

  return (
    <div className="relative min-h-[85vh]">
      {/* FULL PROFILE PAGE BACKGROUND - No blur, no darkening, 100% natural crisp quality */}
      {hasCustomBg && (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none">
          {isVideoMedia(profileUser.banner_url!) ? (
            <video
              src={profileUser.banner_url!}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <img
              src={profileUser.banner_url!}
              alt="Profile Background"
              className="w-full h-full object-cover object-center"
            />
          )}
        </div>
      )}

      <div className="relative z-10 max-w-5xl mx-auto space-y-6 pb-16">
        
        {/* BANNER & AVATAR HEADER */}
        <div className={`relative rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${
          hasCustomBg 
            ? 'bg-[#0a0a14]/75 backdrop-blur-xl border border-white/20 shadow-[0_12px_40px_rgba(0,0,0,0.5)]' 
            : 'bg-[#111] border border-[#222]'
        }`}>
          
          {/* Banner Container */}
          <div className={`relative w-full h-48 sm:h-64 md:h-72 overflow-hidden ${
            hasCustomBg ? 'bg-black/20' : 'bg-[#1a1a1c]'
          }`}>
            {profileUser.banner_url && isVideoMedia(profileUser.banner_url) ? (
              <video
                src={profileUser.banner_url}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img loading="lazy" decoding="async" 
                src={profileUser.banner_url || DEFAULT_BANNER} 
                alt="User Banner" 
                className="w-full h-full object-cover"
              />
            )}
            
            {/* Smooth bottom transition to card body */}
            <div className={`absolute inset-0 pointer-events-none ${
              hasCustomBg 
                ? 'bg-gradient-to-t from-[#0a0a14]/80 via-transparent to-transparent' 
                : 'bg-gradient-to-t from-[#111] via-[#111]/40 to-transparent'
            }`} />

            {/* Banner / Background Controls (For Owner) */}
            {isOwner && (
              <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
                <label className="bg-[#ff006a] hover:bg-[#d40058] text-white text-xs font-black px-3.5 py-2 rounded-xl border border-white/20 cursor-pointer shadow-[0_0_20px_rgba(255,0,106,0.5)] transition-all flex items-center gap-1.5 active:scale-95">
                  <Camera size={15} />
                  <span>{uploadingBanner ? "Yuklanmoqda..." : "Fon rasmi yuklash"}</span>
                  <input 
                    type="file" 
                    accept="image/*,video/webm,video/mp4,.gif,.webm" 
                    className="hidden" 
                    onChange={handleBannerUpload}
                    disabled={uploadingBanner}
                  />
                </label>
                {profileUser.banner_url && (
                  <button
                    onClick={handleRemoveBanner}
                    title="Fon rasmini o'chirish"
                    className="bg-black/80 hover:bg-red-600/90 text-white px-3 py-2 rounded-xl border border-white/20 cursor-pointer backdrop-blur-md transition-all shadow-lg flex items-center gap-1 text-xs font-bold"
                  >
                    <Trash2 size={14} />
                    <span className="hidden sm:inline">O'chirish</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Profile Content Overlay */}
          <div className="px-6 pb-6 pt-0 relative flex flex-col md:flex-row items-center md:items-end justify-between gap-6 -mt-16 sm:-mt-20">
            
            {/* Avatar & Basic Info */}
            <div className="flex flex-col md:flex-row items-center md:items-end gap-5 text-center md:text-left">
              
              {/* Avatar Square */}
              <div className="relative shrink-0 aspect-square group w-28 h-28 sm:w-36 sm:h-36 flex items-center justify-center">
                <div className={`w-full h-full aspect-square rounded-2xl border-2 sm:border-4 ${
                  hasCustomBg ? 'border-white/25 bg-black/60 backdrop-blur-md' : 'border-[#111] bg-[#1c1c1e]'
                } overflow-hidden flex items-center justify-center text-4xl sm:text-5xl font-black text-[#ff006a] uppercase shadow-[0_0_30px_rgba(255,0,106,0.3)] relative`}>
                  {profileUser.avatar_url ? (
                    isVideoMedia(profileUser.avatar_url) ? (
                      <video
                        src={profileUser.avatar_url}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img loading="lazy" decoding="async" src={profileUser.avatar_url} alt={profileUser.name} className="w-full h-full object-cover" />
                    )
                  ) : (
                    (profileUser?.name || 'U').charAt(0)
                  )}

                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
                    <Loader2 size={28} className="text-[#ff006a] animate-spin" />
                  </div>
                )}
              </div>

              {/* Avatar Frame overlay - perfectly concentric and centered on all 4 sides */}
              {profileUser.avatar_frame_url && (
                isVideoMedia(profileUser.avatar_frame_url) ? (
                  <video
                    src={profileUser.avatar_frame_url}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[122%] h-[122%] max-w-none max-h-none pointer-events-none object-contain z-10 drop-shadow-[0_0_15px_rgba(255,0,106,0.6)]"
                  />
                ) : (
                  <img 
                    src={profileUser.avatar_frame_url} 
                    alt="Frame" 
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[122%] h-[122%] max-w-none max-h-none pointer-events-none object-contain z-10 drop-shadow-[0_0_15px_rgba(255,0,106,0.6)]" 
                  />
                )
              )}

              {/* Avatar Upload Button */}
              {isOwner && (
                <label className="absolute -bottom-1 -right-1 z-20 bg-[#ff006a] hover:bg-[#d40058] text-white p-2 rounded-full border-2 border-[#111] cursor-pointer shadow-lg transition-transform hover:scale-110 flex items-center justify-center">
                  <Camera size={14} />
                  <input 
                    type="file" 
                    accept="image/*,video/webm,video/mp4,.gif,.webm" 
                    className="hidden" 
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                  />
                </label>
              )}
            </div>

            {/* Name, Role & Bio summary */}
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wide text-white drop-shadow">
                  {profileUser.name}
                </h1>

                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-sm ${
                  profileUser.role === 'admin' 
                    ? 'bg-red-500/20 border-red-500/40 text-red-400' 
                    : 'bg-[#ff006a]/20 border-[#ff006a]/40 text-[#ff006a]'
                }`}>
                  {profileUser.role === 'admin' ? '⚡ ADMIN' : '✨ PREMIUM'}
                </span>

                {/* ONLINE / OFFLINE STATUS BADGE */}
                {(() => {
                  const status = getOnlineStatusInfo(profileUser.last_seen, isOwner);
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold border ${
                      status.isOnline 
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.2)]' 
                        : 'bg-white/5 border-white/10 text-white/50'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${status.isOnline ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]' : 'bg-white/30'}`} />
                      <span>{status.text}</span>
                    </span>
                  );
                })()}

                {/* Round Social Buttons Quick Row in Header */}
                {socialLinks.length > 0 && (
                  <div className="flex items-center gap-2 ml-1">
                    {socialLinks.map((social) => {
                      const IconComponent = social.icon;
                      const href = formatSocialUrl(social.key, social.value!);
                      return (
                        <a
                          key={social.key}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`${social.label}: ${social.value}`}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all transform hover:scale-110 ${social.glow} border border-white/10 bg-black/40`}
                        >
                          <IconComponent className="w-8 h-8" size={32} />
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>

              {profileUser.bio ? (
                <p className="text-white/80 text-xs sm:text-sm max-w-xl line-clamp-2 italic font-sans">
                  "{profileUser.bio}"
                </p>
              ) : (
                <p className="text-white/40 text-xs font-mono">
                  {isOwner ? "Bio yozilmagan. Profilni tahrirlash orqali bio qo'shing!" : "Foydalanuvchi bio yozmagan."}
                </p>
              )}
            </div>

          </div>

          {/* Edit Action Buttons */}
          {isOwner && (
            <div className="shrink-0 flex flex-wrap items-center gap-2.5">
              <label className="bg-gradient-to-r from-[#ff006a] to-[#7928ca] hover:from-[#e0005d] hover:to-[#6820b0] border border-white/20 text-white font-black text-xs px-4 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(255,0,106,0.35)] flex items-center gap-2 uppercase tracking-wider cursor-pointer active:scale-95">
                <Camera size={16} />
                <span>{uploadingBanner ? "Yuklanmoqda..." : "Fon rasmi yuklash"}</span>
                <input 
                  type="file" 
                  accept="image/*,video/webm,video/mp4,.gif,.webm" 
                  className="hidden" 
                  onChange={handleBannerUpload}
                  disabled={uploadingBanner}
                />
              </label>

              <button
                onClick={() => setIsEditing(!isEditing)}
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs px-4 py-3 rounded-xl transition-all backdrop-blur-md flex items-center gap-2 uppercase tracking-wider cursor-pointer active:scale-95"
              >
                <Edit3 size={15} /> Tahrirlash
              </button>
            </div>
          )}

        </div>
      </div>

      {/* EDIT MODAL / INLINE EDITOR (Owner Only) */}
      <AnimatePresence>
        {isEditing && isOwner && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`rounded-2xl p-6 shadow-2xl space-y-5 transition-all ${
              hasCustomBg 
                ? 'bg-[#0a0a14]/90 backdrop-blur-2xl border border-[#ff006a]/40 shadow-[0_12px_40px_rgba(0,0,0,0.6)]' 
                : 'bg-[#111] border border-[#ff006a]/30'
            }`}
          >
            <div className={`flex items-center justify-between border-b pb-3 ${hasCustomBg ? 'border-white/15' : 'border-[#222]'}`}>
              <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles size={18} className="text-[#ff006a]" /> Profil Ma'lumotlarini Tahrirlash
              </h3>
              <button onClick={() => setIsEditing(false)} className="text-white/50 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              
              {/* Name & Bio */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-white/70 uppercase mb-1">Ism va Familiya</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className={`w-full rounded-lg px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-[#ff006a] ${
                      hasCustomBg ? 'bg-black/60 border border-white/20' : 'bg-[#000] border border-[#222]'
                    }`}
                    placeholder="Ismingizni kiriting"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/70 uppercase mb-1">Bio (O'zingiz haqingizda status)</label>
                  <input
                    type="text"
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className={`w-full rounded-lg px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-[#ff006a] ${
                      hasCustomBg ? 'bg-black/60 border border-white/20' : 'bg-[#000] border border-[#222]'
                    }`}
                    placeholder="Masalan: Anime ixlosmandi va manga ishqibozi..."
                  />
                </div>
              </div>

              {/* Background Wallpaper Section */}
              <div className={`p-4 rounded-xl space-y-3 ${hasCustomBg ? 'bg-white/5 border border-white/10' : 'bg-black/40 border border-[#222]'}`}>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#ff006a] uppercase tracking-wider">
                    Orqa Fon Rasmi (Profil Bosh Foni / Wallpaper)
                  </label>
                  {editBannerUrl && (
                    <button
                      type="button"
                      onClick={() => setEditBannerUrl('')}
                      className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-bold"
                    >
                      <Trash2 size={12} /> Fonni tozalash
                    </button>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={editBannerUrl}
                      onChange={(e) => setEditBannerUrl(e.target.value)}
                      className={`w-full rounded-lg px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-[#ff006a] ${
                        hasCustomBg ? 'bg-black/60 border border-white/20' : 'bg-[#000] border border-[#222]'
                      }`}
                      placeholder="https://... rasm yoki GIF havolasi"
                    />
                  </div>
                  <label className="shrink-0 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2.5 rounded-lg border border-white/20 cursor-pointer backdrop-blur-md transition-all flex items-center justify-center gap-2">
                    <Upload size={14} className="text-[#ff006a]" />
                    <span>{uploadingBanner ? "Yuklanmoqda..." : "Fayl yuklash"}</span>
                    <input 
                      type="file" 
                      accept="image/*,video/webm,video/mp4,.gif,.webm" 
                      className="hidden" 
                      onChange={handleBannerUpload}
                      disabled={uploadingBanner}
                    />
                  </label>
                </div>
                {editBannerUrl && (
                  <div className="relative w-full h-24 rounded-lg overflow-hidden border border-white/20">
                    <img src={editBannerUrl} alt="Fon preview" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 right-2 bg-black/75 text-[10px] text-white/90 px-2 py-0.5 rounded backdrop-blur-sm">
                      Tanlangan fon rasmi
                    </span>
                  </div>
                )}
                <p className="text-[11px] text-white/40">
                  Ushbu rasm butun profil orqa foniga to'liq va tiniq sifatda joylashadi. Kartochkalar esa zamonaviy shaffof oyna (glassmorphism) ko'rinishiga o'tadi.
                </p>
              </div>

              {/* Avatar URL */}
              <div>
                <label className="block text-xs font-bold text-white/70 uppercase mb-1">Avatar Havolasi (URL, GIF yoki .webm)</label>
                <input
                  type="text"
                  value={editAvatarUrl}
                  onChange={(e) => setEditAvatarUrl(e.target.value)}
                  className={`w-full rounded-lg px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-[#ff006a] ${
                    hasCustomBg ? 'bg-black/60 border border-white/20' : 'bg-[#000] border border-[#222]'
                  }`}
                  placeholder="https://.../avatar.gif yoki .webm"
                />
              </div>

              {/* Social Media Links Inputs */}
              <div className={`border-t pt-4 ${hasCustomBg ? 'border-white/15' : 'border-[#222]'}`}>
                <h4 className="text-xs font-bold text-[#ff006a] uppercase tracking-wider mb-3">
                  Ijtimoiy Tarmoq Sahifalari (Telegram, Instagram, YouTube, Discord, Facebook, TikTok, VK)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-white/50 mb-1">Telegram (username yoki havola)</label>
                    <input
                      type="text"
                      value={editTelegram}
                      onChange={(e) => setEditTelegram(e.target.value)}
                      placeholder="@username yoki t.me/username"
                      className={`w-full rounded-lg px-3 py-2 text-white text-xs focus:border-[#0088cc] ${
                        hasCustomBg ? 'bg-black/60 border border-white/20' : 'bg-[#000] border border-[#222]'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-white/50 mb-1">Instagram (username)</label>
                    <input
                      type="text"
                      value={editInstagram}
                      onChange={(e) => setEditInstagram(e.target.value)}
                      placeholder="@username"
                      className={`w-full rounded-lg px-3 py-2 text-white text-xs focus:border-[#e1306c] ${
                        hasCustomBg ? 'bg-black/60 border border-white/20' : 'bg-[#000] border border-[#222]'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-white/50 mb-1">YouTube (Kanal havolasi)</label>
                    <input
                      type="text"
                      value={editYoutube}
                      onChange={(e) => setEditYoutube(e.target.value)}
                      placeholder="youtube.com/@channel"
                      className={`w-full rounded-lg px-3 py-2 text-white text-xs focus:border-red-500 ${
                        hasCustomBg ? 'bg-black/60 border border-white/20' : 'bg-[#000] border border-[#222]'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-white/50 mb-1">Discord (Tag yoki invite)</label>
                    <input
                      type="text"
                      value={editDiscord}
                      onChange={(e) => setEditDiscord(e.target.value)}
                      placeholder="username#0000 yoki invite"
                      className={`w-full rounded-lg px-3 py-2 text-white text-xs focus:border-[#5865F2] ${
                        hasCustomBg ? 'bg-black/60 border border-white/20' : 'bg-[#000] border border-[#222]'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-white/50 mb-1">Facebook (Profil havolasi)</label>
                    <input
                      type="text"
                      value={editFacebook}
                      onChange={(e) => setEditFacebook(e.target.value)}
                      placeholder="facebook.com/username"
                      className={`w-full rounded-lg px-3 py-2 text-white text-xs focus:border-[#1877F2] ${
                        hasCustomBg ? 'bg-black/60 border border-white/20' : 'bg-[#000] border border-[#222]'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-white/50 mb-1">TikTok (username)</label>
                    <input
                      type="text"
                      value={editTiktok}
                      onChange={(e) => setEditTiktok(e.target.value)}
                      placeholder="@username"
                      className={`w-full rounded-lg px-3 py-2 text-white text-xs focus:border-cyan-400 ${
                        hasCustomBg ? 'bg-black/60 border border-white/20' : 'bg-[#000] border border-[#222]'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-white/50 mb-1">VK / VKontakte (username yoki id)</label>
                    <input
                      type="text"
                      value={editVk}
                      onChange={(e) => setEditVk(e.target.value)}
                      placeholder="vk.com/username yoki id"
                      className={`w-full rounded-lg px-3 py-2 text-white text-xs focus:border-[#0077FF] ${
                        hasCustomBg ? 'bg-black/60 border border-white/20' : 'bg-[#000] border border-[#222]'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className={`flex justify-end gap-3 pt-3 border-t ${hasCustomBg ? 'border-white/15' : 'border-[#222]'}`}>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-2.5 bg-[#222] hover:bg-[#333] text-white rounded-lg text-xs font-bold uppercase transition-all"
                >
                  Bekor qilish
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#ff006a] hover:bg-[#d40058] text-white rounded-lg text-xs font-bold uppercase flex items-center gap-2 shadow-lg transition-all"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>Saqlash</span>
                </button>
              </div>

            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SOCIAL LINKS DISPLAY SECTION */}
      {socialLinks.length > 0 && (
        <div className={`rounded-2xl p-5 shadow-lg transition-all ${
          hasCustomBg 
            ? 'bg-[#0a0a14]/70 backdrop-blur-xl border border-white/20 shadow-lg' 
            : 'bg-[#111] border border-[#222]'
        }`}>
          <h3 className="text-xs font-bold text-white/70 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Globe size={16} className="text-[#ff006a]" /> Ijtimoiy Tarmoq Sahifalari
          </h3>
          <div className="flex flex-wrap gap-3">
            {socialLinks.map((social) => {
              const IconComp = social.icon;
              const href = formatSocialUrl(social.key, social.value!);
              return (
                <a
                  key={social.key}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-2 pr-4 rounded-full text-xs font-bold flex items-center gap-3 transition-all transform hover:-translate-y-0.5 ${social.glow} group cursor-pointer ${
                    hasCustomBg 
                      ? 'bg-black/50 backdrop-blur-md border border-white/20 hover:border-[#ff006a]/50 hover:bg-black/70' 
                      : 'bg-[#18181c] border border-white/10 hover:border-[#ff006a]/50'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center overflow-hidden">
                    <IconComp className="w-9 h-9" size={36} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] text-white/40 uppercase font-extrabold tracking-wider leading-none mb-0.5">{social.label}</span>
                    <span className="text-white text-xs font-medium font-mono truncate max-w-[140px] group-hover:text-[#ff006a] transition-colors">{social.value}</span>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* STATS COUNTER BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-5 rounded-2xl text-center space-y-1 transition-all ${
          hasCustomBg 
            ? 'bg-[#0a0a14]/70 backdrop-blur-xl border border-white/20 shadow-lg hover:border-[#ff006a]/50 hover:bg-[#0a0a14]/85' 
            : 'bg-[#111] border border-[#222] hover:border-[#ff006a]/30'
        }`}>
          <Clock className="w-6 h-6 text-[#ff006a] mx-auto" />
          <h4 className="text-white/40 text-[10px] uppercase font-bold tracking-wider">Tomosha vaqti</h4>
          <p className="text-2xl font-black text-white">{formatWatchTime(profileUser.watch_time_minutes)}</p>
          <span className="text-[10px] text-white/30 font-mono block">Aniq tomosha davomiyligi</span>
        </div>

        <div className={`p-5 rounded-2xl text-center space-y-1 transition-all ${
          hasCustomBg 
            ? 'bg-[#0a0a14]/70 backdrop-blur-xl border border-white/20 shadow-lg hover:border-[#ff006a]/50 hover:bg-[#0a0a14]/85' 
            : 'bg-[#111] border border-[#222] hover:border-[#ff006a]/30'
        }`}>
          <Heart className="w-6 h-6 text-[#ff006a] mx-auto fill-current" />
          <h4 className="text-white/40 text-[10px] uppercase font-bold tracking-wider">Saqlangan animelar</h4>
          <p className="text-2xl font-black text-white">{favoritesList.length} ta</p>
          <span className="text-[10px] text-white/30 font-mono block">Sevimlilar ro'yxatida</span>
        </div>

        <div className={`p-5 rounded-2xl text-center space-y-1 transition-all ${
          hasCustomBg 
            ? 'bg-[#0a0a14]/70 backdrop-blur-xl border border-white/20 shadow-lg hover:border-[#ff006a]/50 hover:bg-[#0a0a14]/85' 
            : 'bg-[#111] border border-[#222] hover:border-[#ff006a]/30'
        }`}>
          <MessageSquare className="w-6 h-6 text-[#ff006a] mx-auto" />
          <h4 className="text-white/40 text-[10px] uppercase font-bold tracking-wider">Jami Izohlar</h4>
          <p className="text-2xl font-black text-white">{profileUser.comments_count || 0} ta</p>
          <span className="text-[10px] text-white/30 font-mono block">Qoldirilgan fikrlar</span>
        </div>
      </div>

      {/* SAVED / FAVORITE ANIMELAR DISPLAY GRID */}
      <div className={`rounded-2xl p-6 space-y-4 transition-all ${
        hasCustomBg 
          ? 'bg-[#0a0a14]/70 backdrop-blur-xl border border-white/20 shadow-lg' 
          : 'bg-[#111] border border-[#222]'
      }`}>
        <div className={`flex items-center justify-between border-b pb-4 ${hasCustomBg ? 'border-white/15' : 'border-[#222]'}`}>
          <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Film size={18} className="text-[#ff006a]" /> Saqlangan Animelar ({favoritesList.length})
          </h3>

          {isOwner && (
            <Link to="/sevimlilar" className="text-xs text-[#ff006a] hover:underline font-bold flex items-center gap-1">
              Barchasini Boshqarish <ArrowRight size={13} />
            </Link>
          )}
        </div>

        {favoritesList.length === 0 ? (
          <div className="text-center py-12 text-white/30 space-y-3">
            <Film className="w-12 h-12 mx-auto text-white/20" />
            <p className="text-xs font-mono">Hozircha birorta ham anime saqlanmagan.</p>
            {isOwner && (
              <Link
                to="/animelar"
                className="inline-block bg-[#ff006a]/20 hover:bg-[#ff006a] text-[#ff006a] hover:text-white border border-[#ff006a]/30 px-4 py-2 rounded-lg text-xs font-bold transition-all"
              >
                Animelarni ko'rish va saqlash
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {favoritesList.map((anime) => (
              <div 
                key={anime.id} 
                className={`rounded-xl overflow-hidden group transition-all flex flex-col relative ${
                  hasCustomBg 
                    ? 'bg-black/50 backdrop-blur-md border border-white/15 hover:border-[#ff006a]/60 shadow-lg' 
                    : 'bg-[#161618] border border-[#222] hover:border-[#ff006a]/50'
                }`}
              >
                {/* Anime Poster */}
                <Link to={`/anime/${toSlug(anime.title)}`} className="relative block p-[2px] rounded-xl bg-gradient-to-b from-white/20 via-white/5 to-[#ff006a]/25 group-hover:from-[#ff006a] group-hover:to-purple-600 transition-all duration-500">
                  <div className="aspect-[3/4] relative overflow-hidden rounded-[10px] bg-black">
                    <img loading="lazy" decoding="async" 
                      src={anime.image_url} 
                      alt={anime.title} 
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-300"
                    />
                    <div className="absolute top-1.5 left-1.5 w-2 h-2 border-t-2 border-l-2 border-white/50 group-hover:border-[#ff006a] rounded-tl-sm pointer-events-none" />
                    <div className="absolute top-1.5 right-1.5 w-2 h-2 border-t-2 border-r-2 border-white/50 group-hover:border-[#ff006a] rounded-tr-sm pointer-events-none" />
                    <div className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b-2 border-l-2 border-white/50 group-hover:border-[#ff006a] rounded-bl-sm pointer-events-none" />
                    <div className="absolute bottom-1.5 right-1.5 w-2 h-2 border-b-2 border-r-2 border-white/50 group-hover:border-[#ff006a] rounded-br-sm pointer-events-none" />
                    
                    {anime.rating && (
                      <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-md border border-yellow-500/30 text-yellow-400 font-bold text-[10px] flex items-center gap-1">
                        <Star size={10} className="fill-current" /> {Number(anime.rating).toFixed(1)}
                      </div>
                    )}

                    {/* Remove favorite quick button for owner */}
                    {isOwner && (
                      <button
                        onClick={(e) => handleRemoveFavorite(e, anime.id)}
                        title="Saqlanganlardan o'chirish"
                        className="absolute top-2 left-2 bg-black/80 hover:bg-red-500 text-white/70 hover:text-white p-1.5 rounded-md border border-white/10 backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 z-10"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </Link>

                {/* Anime Info */}
                <div className="p-3 flex flex-col flex-1 justify-between">
                  <Link to={`/anime/${toSlug(anime.title)}`} className="text-xs font-bold text-white group-hover:text-[#ff006a] transition-colors line-clamp-1 block">
                    {anime.title}
                  </Link>

                  <div className={`mt-2 pt-2 border-t flex items-center justify-between text-[10px] text-white/40 ${
                    hasCustomBg ? 'border-white/10' : 'border-[#222]'
                  }`}>
                    <span>{anime.qismlar_soni || 12}-qism</span>
                    <Link to={`/anime/${toSlug(anime.title)}`} className="text-[#ff006a] font-bold hover:underline">
                      Ko'rish
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ACCOUNT DETAILS & PRIVACY CARD */}
      <div className={`rounded-2xl p-6 space-y-4 transition-all ${
        hasCustomBg 
          ? 'bg-[#0a0a14]/70 backdrop-blur-xl border border-white/20 shadow-lg' 
          : 'bg-[#111] border border-[#222]'
      }`}>
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Shield size={16} className="text-[#ff006a]" /> Tizim va Maxfiylik Ma'lumotlari
        </h3>

        <div className="space-y-3 text-xs font-mono">
          {/* EMAIL PRIVACY: EMAIL IS ONLY SHOWN IF ISOWNER IS TRUE */}
          {isOwner ? (
            <div className={`flex justify-between py-2 border-b items-center ${hasCustomBg ? 'border-white/15' : 'border-[#222]'}`}>
              <span className="text-white/40 uppercase flex items-center gap-1.5">
                <Eye size={13} className="text-[#ff006a]" /> Email (Faqat sizga ko'rinadi):
              </span>
              <span className={`text-white font-bold px-3 py-1 rounded border ${
                hasCustomBg ? 'bg-black/50 border-white/20' : 'bg-[#1a1a1c] border-[#333]'
              }`}>
                {profileUser.email || currentUser?.email || 'Foydalanuvchi emaili'}
              </span>
            </div>
          ) : (
            <div className={`flex justify-between py-2 border-b items-center text-white/40 ${hasCustomBg ? 'border-white/15' : 'border-[#222]'}`}>
              <span className="uppercase flex items-center gap-1.5">
                <Lock size={13} className="text-white/30" /> Email Manzili:
              </span>
              <span className="italic text-[11px] text-white/30">Maxfiy (Boshqalarga ko'rinmaydi)</span>
            </div>
          )}

          <div className={`flex justify-between py-2 border-b items-center ${hasCustomBg ? 'border-white/15' : 'border-[#222]'}`}>
            <span className="text-white/40 uppercase">Hisob Roli:</span>
            <span className="text-[#ff006a] font-bold uppercase">
              {profileUser.role === 'admin' ? 'ADMINISTRATOR' : 'PREMIUM FOYDALANUVCHI'}
            </span>
          </div>

          <div className="flex justify-between py-2 items-center">
            <span className="text-white/40 uppercase">A'zo bo'lingan sana:</span>
            <span className="text-white/80">
              {profileUser.created_at ? new Date(profileUser.created_at).toLocaleDateString() : '15.01.2024'}
            </span>
          </div>
        </div>
      </div>

      </div>
    </div>
  );
}
