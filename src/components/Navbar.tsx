import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Notification, Anime, toSlug } from '../types';
import { Search, LogOut, User, Bell, Menu, PlusCircle, Heart, Bookmark, Settings, X, Shield, Star, Film, Globe, ShoppingBag, Headphones, ChevronDown, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getNotificationPermission, 
  requestNotificationPermission, 
  checkAndNotifyNewContent
} from '../services/notificationService';
import { Language } from '../i18n/translations';
import UserAvatar from './UserAvatar';

const logoImg = "/logo.png";

interface NavbarProps {
  onToggleSidebar: () => void;
}

export default function Navbar({ onToggleSidebar }: NavbarProps) {
  const { user, logout } = useAuth();
  const { language, setLanguage, t, getLocalizedPath } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const isMusicPage = location.pathname.includes('/music') || location.pathname.includes('/musiqa');
  const [searchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get('search') || '');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const isNewBadgeVisible = Date.now() < new Date('2026-11-02T23:59:59Z').getTime();

  const isItemActive = (rawPath: string) => {
    const current = location.pathname.replace(/^\/(uz|ru|ing|en)(\/|$)/, '/');
    const normalizedCurrent = current.endsWith('/') && current.length > 1 ? current.slice(0, -1) : current;
    const normalizedTarget = rawPath.endsWith('/') && rawPath.length > 1 ? rawPath.slice(0, -1) : rawPath;
    return normalizedCurrent === normalizedTarget;
  };

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [allAnimes, setAllAnimes] = useState<Anime[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [lastReadId, setLastReadId] = useState<number>(() => {
    return Number(localStorage.getItem('last_read_notif_id') || '0');
  });

  const notifCount = notifications.filter(n => Number(n.id) > lastReadId).length;
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  // Fetch notifications & animes on mount
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchNotifications = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
        const res = await fetch(`${API_BASE}/api/notifications`, { signal: controller.signal });
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json") && isMounted) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setNotifications(data);
            if (allAnimes.length > 0) {
              checkAndNotifyNewContent(allAnimes, data);
            }
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {}
      }
    };

    const fetchAnimes = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
        const res = await fetch(`${API_BASE}/api/animes`, { signal: controller.signal });
        if (res.ok && isMounted) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setAllAnimes(data);
            checkAndNotifyNewContent(data, notifications);
          }
        }
      } catch (err) {}
    };

    fetchNotifications();
    fetchAnimes();

    // Check notifications once every 60 seconds (prevents server CPU saturation)
    const interval = setInterval(fetchNotifications, 60000);
    return () => {
      isMounted = false;
      controller.abort();
      clearInterval(interval);
    };
  }, []);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearchValue(searchParams.get('search') || '');
  }, [searchParams]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setShowLangDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setShowMoreDropdown(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute live search results
  const searchResults = useMemo(() => {
    if (!searchValue.trim()) return [];
    const q = searchValue.trim().toLowerCase();
    return allAnimes.filter(anime => {
      const title = (anime.title || '').toLowerCase();
      const janrlar = (anime.janrlar || '').toLowerCase();
      const tags = (anime.tags || '').toLowerCase();
      const desc = (anime.description || '').toLowerCase();
      return title.includes(q) || janrlar.includes(q) || tags.includes(q) || desc.includes(q);
    });
  }, [searchValue, allAnimes]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSearchFocused(false);
    setShowMobileSearch(false);
    const targetBase = getLocalizedPath('/animelar');
    if (searchValue.trim()) {
      navigate(`${targetBase}?search=${encodeURIComponent(searchValue.trim())}`);
    } else {
      navigate(targetBase);
    }
  };

  const handleLogout = () => {
    logout();
    setShowProfileDropdown(false);
    navigate(getLocalizedPath('/'));
  };

  const languagesList: { code: Language; label: string; flag: string }[] = [
    { code: 'uz', label: "O'zbekcha", flag: "🇺🇿" },
    { code: 'ru', label: "Русский", flag: "🇷🇺" },
    { code: 'ing', label: "English", flag: "🇬🇧" }
  ];

  return (
    <header className="fixed top-0 right-0 left-0 h-16 md:h-20 bg-[#07080e]/75 backdrop-blur-3xl border-b border-white/14 shadow-[0_8px_32px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.18)] z-40 px-3 min-[400px]:px-4 md:px-6 lg:px-8 flex items-center justify-between text-white select-none transition-all gap-2 md:gap-4">
      
      {/* Mobile Search Overlay */}
      <AnimatePresence>
        {showMobileSearch && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute inset-x-0 top-0 bg-[#090a12]/95 backdrop-blur-3xl px-3 sm:px-4 py-3 flex flex-col gap-2 z-50 border-b border-white/15 shadow-[0_16px_40px_rgba(0,0,0,0.85)] md:hidden"
          >
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowMobileSearch(false)}
                className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/14 flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer active:scale-90 shrink-0"
              >
                <X size={17} />
              </button>
              <form onSubmit={handleSearchSubmit} className="relative flex-1">
                <input
                  type="text"
                  autoFocus
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full bg-white/[0.08] border border-white/20 text-white text-xs rounded-full pl-4 pr-10 py-2.5 focus:outline-none focus:border-[#ff006a] backdrop-blur-2xl transition-all placeholder:text-white/40 font-bold shadow-[inset_0_1px_1px_rgba(0,0,0,0.3)]"
                />
                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#ff006a] hover:text-white transition-colors cursor-pointer active:scale-90">
                  <Search size={16} />
                </button>
              </form>
            </div>

            {/* Mobile Live Results */}
            {searchValue.trim() && (
              <div className="bg-[#0e0f17]/95 backdrop-blur-3xl border border-white/15 rounded-2xl max-h-72 overflow-y-auto divide-y divide-white/10 mt-1 shadow-2xl">
                {searchResults.length === 0 ? (
                  <div className="p-3 text-center text-xs text-white/40 flex items-center justify-center gap-2">
                    <Film size={14} />
                    <span>{t.notFound}</span>
                  </div>
                ) : (
                  <>
                    {searchResults.slice(0, 5).map((anime) => (
                      <Link
                        key={anime.id}
                        to={getLocalizedPath(`/anime/${toSlug(anime.title)}`)}
                        onClick={() => {
                          setShowMobileSearch(false);
                          setIsSearchFocused(false);
                        }}
                        className="p-2 flex items-center gap-3 hover:bg-white/10 transition-colors"
                      >
                        <img
                          src={anime.image_url}
                          alt={anime.title}
                          className="w-9 h-12 object-cover rounded-lg border border-white/10 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate">{anime.title}</p>
                          <div className="flex items-center gap-2 text-[10px] text-white/40 mt-0.5">
                            {anime.rating && (
                              <span className="flex items-center gap-0.5 text-yellow-400 font-bold">
                                <Star size={10} className="fill-current" /> {Number(anime.rating).toFixed(1)}
                              </span>
                            )}
                            <span>{anime.yil || ''}</span>
                            <span className="text-[#ff006a] uppercase text-[9px] font-semibold">{anime.holati || ''}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                    <button
                      onClick={() => handleSearchSubmit()}
                      className="w-full p-2.5 text-center text-xs font-bold text-[#ff006a] hover:bg-[#ff006a]/10 transition-colors bg-white/[0.04] cursor-pointer rounded-b-2xl"
                    >
                      {searchResults.length} {t.searchResults} →
                    </button>
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left side: Hamburger + Logo */}
      <div className="flex items-center space-x-2 md:space-x-3 shrink-0">
        {/* Hamburger Trigger (Mobile & Drawer) */}
        <button
          onClick={onToggleSidebar}
          className="w-9 h-9 text-white/80 hover:text-white bg-white/[0.08] hover:bg-white/[0.15] border border-white/14 rounded-full backdrop-blur-xl transition-all shrink-0 cursor-pointer lg:hidden active:scale-90 flex items-center justify-center shadow-sm"
          title="Menyu"
        >
          <Menu size={18} />
        </button>

        {/* Brand Logo (Guaranteed room, never shrinks or gets squashed) */}
        <Link to={getLocalizedPath('/')} className="flex items-center shrink-0 group">
          <img 
            src={logoImg} 
            alt="AnimeUz" 
            className="h-7 min-[380px]:h-8 md:h-10 w-auto object-contain max-w-[95px] min-[380px]:max-w-[115px] md:max-w-[145px] transition-transform group-hover:scale-105 drop-shadow-md" 
          />
        </Link>
      </div>

      {/* Desktop Nav Links (Apple Segmented Liquid Glass Capsule) */}
      <nav className="hidden lg:flex items-center space-x-0.5 xl:space-x-1 p-1 bg-white/[0.06] border border-white/12 rounded-full backdrop-blur-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.18)] shrink-0 mx-auto">
        <Link
          to={getLocalizedPath('/')}
          className={`px-3 xl:px-3.5 py-1.5 rounded-full text-xs xl:text-sm font-bold transition-all ${
            isItemActive('/')
              ? 'bg-gradient-to-r from-[#ff006a] to-[#a855f7] text-white shadow-[0_2px_14px_rgba(255,0,106,0.45),inset_0_1px_0_rgba(255,255,255,0.4)]'
              : 'text-white/75 hover:text-white hover:bg-white/10 active:scale-95'
          }`}
        >
          {t.navHome || 'Bosh sahifa'}
        </Link>

        <Link
          to={getLocalizedPath('/animelar')}
          className={`px-3 xl:px-3.5 py-1.5 rounded-full text-xs xl:text-sm font-bold transition-all ${
            isItemActive('/animelar')
              ? 'bg-gradient-to-r from-[#ff006a] to-[#a855f7] text-white shadow-[0_2px_14px_rgba(255,0,106,0.45),inset_0_1px_0_rgba(255,255,255,0.4)]'
              : 'text-white/75 hover:text-white hover:bg-white/10 active:scale-95'
          }`}
        >
          {t.navAnimes || 'Animelar'}
        </Link>

        <Link
          to={getLocalizedPath('/jadval')}
          className={`px-3 xl:px-3.5 py-1.5 rounded-full text-xs xl:text-sm font-bold transition-all ${
            isItemActive('/jadval')
              ? 'bg-gradient-to-r from-[#ff006a] to-[#a855f7] text-white shadow-[0_2px_14px_rgba(255,0,106,0.45),inset_0_1px_0_rgba(255,255,255,0.4)]'
              : 'text-white/75 hover:text-white hover:bg-white/10 active:scale-95'
          }`}
        >
          {t.navSchedule || 'Jadval'}
        </Link>

        <Link
          to={getLocalizedPath('/yangi-chiqishlar')}
          className={`px-3 xl:px-3.5 py-1.5 rounded-full text-xs xl:text-sm font-bold transition-all ${
            isItemActive('/yangi-chiqishlar')
              ? 'bg-gradient-to-r from-[#ff006a] to-[#a855f7] text-white shadow-[0_2px_14px_rgba(255,0,106,0.45),inset_0_1px_0_rgba(255,255,255,0.4)]'
              : 'text-white/75 hover:text-white hover:bg-white/10 active:scale-95'
          }`}
        >
          {t.navNewReleases || 'Yangi'}
        </Link>

        <Link
          to={getLocalizedPath('/top100')}
          className={`px-3 xl:px-3.5 py-1.5 rounded-full text-xs xl:text-sm font-bold transition-all ${
            isItemActive('/top100')
              ? 'bg-gradient-to-r from-[#ff006a] to-[#a855f7] text-white shadow-[0_2px_14px_rgba(255,0,106,0.45),inset_0_1px_0_rgba(255,255,255,0.4)]'
              : 'text-white/75 hover:text-white hover:bg-white/10 active:scale-95'
          }`}
        >
          {t.navTop100 || 'Top 100'}
        </Link>

        <Link
          to={getLocalizedPath('/reels')}
          className={`px-3 xl:px-3.5 py-1.5 rounded-full text-xs xl:text-sm font-bold transition-all flex items-center gap-1.5 ${
            isItemActive('/reels')
              ? 'bg-gradient-to-r from-pink-500 to-indigo-500 text-white shadow-[0_2px_14px_rgba(236,72,153,0.5),inset_0_1px_0_rgba(255,255,255,0.4)]'
              : 'text-white/75 hover:text-pink-400 hover:bg-white/10 active:scale-95'
          }`}
        >
          <span>Reels</span>
          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase bg-gradient-to-r from-pink-500 to-indigo-500 text-white animate-pulse">
            HOT
          </span>
        </Link>

        <Link
          to={getLocalizedPath('/music')}
          className={`px-3 xl:px-3.5 py-1.5 rounded-full text-xs xl:text-sm font-bold transition-all flex items-center gap-1.5 ${
            isItemActive('/music')
              ? 'bg-cyan-500/25 text-[#00f0ff] border border-cyan-400/40 shadow-[0_0_14px_rgba(0,240,255,0.45),inset_0_1px_0_rgba(255,255,255,0.4)]'
              : 'text-white/75 hover:text-[#00c8ff] hover:bg-white/10 active:scale-95'
          }`}
        >
          <span>{t.navMusic || 'Musiqa'}</span>
          {isNewBadgeVisible && (
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase bg-[#ff006a] text-white animate-pulse">
              New
            </span>
          )}
        </Link>

        {/* More Items Dropdown */}
        <div className="relative" ref={moreRef}>
          <button
            onClick={() => setShowMoreDropdown(!showMoreDropdown)}
            className="flex items-center gap-1 px-2 xl:px-2.5 py-1.5 rounded-lg text-xs xl:text-sm font-bold text-white/75 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <span>Yana</span>
            <ChevronDown size={14} className={`transition-transform duration-200 ${showMoreDropdown ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {showMoreDropdown && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                className="absolute left-0 mt-2 w-52 bg-black/80 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-2 z-50 divide-y divide-white/10"
              >
                <div className="space-y-1 pb-1">
                  <Link
                    to={getLocalizedPath('/shaxsiy-royxat')}
                    onClick={() => setShowMoreDropdown(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                  >
                    <Bookmark size={14} className="text-[#ff006a]" />
                    <span>{t.navMyList || "Shaxsiy ro'yxat"}</span>
                  </Link>
                  <Link
                    to={getLocalizedPath('/sevimlilar')}
                    onClick={() => setShowMoreDropdown(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                  >
                    <Heart size={14} className="text-[#ff006a]" />
                    <span>{t.navFavorites || 'Sevimlilar'}</span>
                  </Link>
                  <Link
                    to={getLocalizedPath('/tarix')}
                    onClick={() => setShowMoreDropdown(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                  >
                    <History size={14} className="text-[#ff006a]" />
                    <span>{t.navHistory || 'Tarix'}</span>
                  </Link>
                  <Link
                    to={getLocalizedPath('/sozlamalar')}
                    onClick={() => setShowMoreDropdown(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                  >
                    <Settings size={14} className="text-white/60" />
                    <span>{t.navSettings || 'Sozlamalar'}</span>
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Right side: Search, Actions & Profile */}
      <div className="flex items-center gap-1.5 min-[380px]:gap-2 md:gap-2.5 shrink-0 ml-auto">
        
        {/* Desktop Search Bar Input (Apple iOS Glass Capsule) */}
        <div className="relative w-36 lg:w-44 xl:w-64 2xl:w-72 hidden md:block shrink transition-all" ref={searchContainerRef}>
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <input
              type="text"
              value={searchValue}
              onFocus={() => setIsSearchFocused(true)}
              onChange={(e) => {
                setSearchValue(e.target.value);
                setIsSearchFocused(true);
              }}
              placeholder={t.searchPlaceholder}
              className="w-full bg-white/[0.07] hover:bg-white/[0.12] focus:bg-white/[0.14] border border-white/14 focus:border-white/35 backdrop-blur-2xl text-white text-xs rounded-full pl-3.5 pr-8 py-2 focus:outline-none transition-all placeholder:text-white/40 font-semibold shadow-[inset_0_1px_1px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.15)]"
            />
            <button type="submit" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors cursor-pointer active:scale-90">
              <Search size={14} />
            </button>
          </form>

          {/* Desktop Live Autocomplete Dropdown */}
          <AnimatePresence>
            {isSearchFocused && searchValue.trim() && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute left-0 right-0 top-full mt-2 bg-black/85 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden z-50 divide-y divide-white/10"
              >
                {searchResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-white/40 flex items-center justify-center gap-2">
                    <Film size={14} />
                    <span>"{searchValue}" bo'yicha hech narsa topilmadi</span>
                  </div>
                ) : (
                  <>
                    <div className="max-h-80 overflow-y-auto divide-y divide-white/10 custom-scrollbar">
                      {searchResults.slice(0, 6).map((anime) => (
                        <Link
                          key={anime.id}
                          to={getLocalizedPath(`/anime/${toSlug(anime.title)}`)}
                          onClick={() => setIsSearchFocused(false)}
                          className="p-2.5 flex items-center gap-3 hover:bg-white/10 transition-colors group"
                        >
                          <img
                            src={anime.image_url}
                            alt={anime.title}
                            className="w-10 h-13 object-cover rounded-lg border border-white/10 shrink-0 group-hover:scale-105 transition-transform"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white group-hover:text-[#ff006a] transition-colors truncate">
                              {anime.title}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-white/50 mt-1">
                              {anime.rating && (
                                <span className="flex items-center gap-0.5 text-yellow-400 font-bold">
                                  <Star size={10} className="fill-current" /> {Number(anime.rating).toFixed(1)}
                                </span>
                              )}
                              <span>{anime.yil || ''}</span>
                              <span className="text-[#ff006a] uppercase text-[9px] font-semibold">{anime.holati || ''}</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                    <button
                      onClick={() => handleSearchSubmit()}
                      className="w-full p-2.5 text-center text-xs font-bold text-[#ff006a] hover:bg-[#ff006a]/15 transition-colors bg-white/[0.04] block cursor-pointer"
                    >
                      Barcha {searchResults.length} ta natijani ko'rish →
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile Search Icon - opens sleek iOS search overlay */}
        <button 
          onClick={() => setShowMobileSearch(true)} 
          className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/14 backdrop-blur-xl flex items-center justify-center text-white/80 hover:text-white transition-all active:scale-90 md:hidden cursor-pointer shadow-sm shrink-0"
          title={t.search}
        >
          <Search size={15} />
        </button>

        {/* Language Switcher Dropdown */}
        <div className="relative hidden min-[390px]:block" ref={langRef}>
          <button
            onClick={() => setShowLangDropdown(!showLangDropdown)}
            className="w-8 h-8 md:w-auto md:h-auto md:px-2.5 md:py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/14 hover:border-[#ff006a]/40 text-xs font-bold text-white/90 backdrop-blur-xl transition-all active:scale-95 shadow-sm cursor-pointer flex items-center justify-center gap-1 shrink-0"
            title="Tilni o'zgartirish"
          >
            <Globe size={13} className="text-[#ff006a]" />
            <span className="uppercase text-[10px] min-[380px]:text-[11px] font-black">{language}</span>
          </button>

          <AnimatePresence>
            {showLangDropdown && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-2 w-44 bg-[#0a0b12]/85 backdrop-blur-3xl border border-white/20 rounded-[22px] shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.2)] overflow-hidden z-50 p-1.5 space-y-0.5"
              >
                {languagesList.map((item) => (
                  <button
                    key={item.code}
                    onClick={() => {
                      setLanguage(item.code, true);
                      setShowLangDropdown(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      language === item.code 
                        ? 'bg-[#ff006a]/20 text-[#ff006a] border border-[#ff006a]/30' 
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{item.flag}</span>
                      <span>{item.label}</span>
                    </span>
                    {language === item.code && <span className="w-1.5 h-1.5 bg-[#ff006a] rounded-full" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Music Quick Link */}
        <Link
          to={getLocalizedPath('/music')}
          className={`hidden min-[480px]:flex items-center justify-center w-8 h-8 md:w-auto md:h-auto md:px-2.5 md:py-1.5 rounded-full transition-all shrink-0 active:scale-95 shadow-sm ${
            isMusicPage 
              ? 'bg-cyan-500/25 text-[#00f0ff] border border-cyan-400/40 shadow-[0_0_14px_rgba(0,240,255,0.45)] backdrop-blur-xl' 
              : 'bg-white/[0.08] hover:bg-white/[0.15] border border-white/14 backdrop-blur-xl text-white/75 hover:text-[#00c8ff]'
          }`}
          title="Animem Musiqa (music.animem.uz)"
        >
          <Headphones size={14} />
          <span className="hidden xl:inline text-xs font-bold text-white/90 hover:text-[#00c8ff] ml-1.5">Musiqa</span>
        </Link>

        {/* Upload/Add Anime Quick-link (Admins only) */}
        {user?.role === 'admin' && (
          <Link
            to={getLocalizedPath('/admin')}
            className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/14 backdrop-blur-xl flex items-center justify-center text-white/70 hover:text-[#ff006a] transition-all active:scale-90 shadow-sm shrink-0"
            title="Katalog boshqaruvi"
          >
            <PlusCircle size={16} />
          </Link>
        )}

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              const nextShow = !showNotifications;
              setShowNotifications(nextShow);
              if (nextShow && notifications.length > 0) {
                const highestId = Math.max(...notifications.map(n => Number(n.id)));
                setLastReadId(highestId);
                localStorage.setItem('last_read_notif_id', String(highestId));
              }
            }}
            className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/14 backdrop-blur-xl flex items-center justify-center text-white/80 hover:text-white transition-all active:scale-90 shadow-sm relative cursor-pointer shrink-0"
          >
            <Bell size={15} />
            {notifCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-[#ff006a] rounded-full text-[9px] flex items-center justify-center font-bold text-white ring-2 ring-[#07080e]">
                {notifCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="fixed sm:absolute top-16 sm:top-auto right-2 sm:right-0 left-2 sm:left-auto mt-1 sm:mt-3 w-auto sm:w-84 bg-[#0a0b12]/85 backdrop-blur-3xl border border-white/20 rounded-[26px] shadow-[0_25px_60px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.2)] overflow-hidden text-sm z-50"
              >
                <div className="p-3.5 border-b border-white/10 bg-white/5 flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-white/70">{t.notificationsTitle}</span>
                  <button onClick={() => setShowNotifications(false)} className="text-white/40 hover:text-white p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer">
                    <X size={14} />
                  </button>
                </div>

                {/* Device Push Notification Quick Prompt */}
                {getNotificationPermission() !== 'granted' && (
                  <div className="p-3 bg-[#ff006a]/15 border-b border-[#ff006a]/25 backdrop-blur-md flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Bell className="w-3.5 h-3.5 text-[#ff006a] shrink-0 animate-pulse" />
                      <span className="text-[11px] text-white/90 font-medium truncate">{t.pushNotificationsSubtitle}</span>
                    </div>
                    <button
                      onClick={async () => {
                        await requestNotificationPermission();
                        setShowNotifications(false);
                      }}
                      className="px-3 py-1 bg-[#ff006a] hover:bg-[#e6005c] text-white text-[10px] font-bold rounded-full uppercase shrink-0 transition-all cursor-pointer shadow-md shadow-[#ff006a]/30"
                    >
                      {t.enableNotifications}
                    </button>
                  </div>
                )}
                <div className="divide-y divide-white/10 max-h-72 overflow-y-auto custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-xs text-center text-white/40">{t.noNotifications}</div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="p-3 hover:bg-white/10 transition-colors cursor-pointer">
                        <p className="font-bold text-xs text-white/90">{n.message}</p>
                        <span className="text-[9px] text-[#ff006a] font-mono mt-1 block">
                          {n.created_at ? new Date(n.created_at).toLocaleString() : 'Yangi'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User State & Dropdown */}
        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex items-center space-x-1.5 p-0.5 md:p-1 md:pl-1.5 md:pr-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/16 backdrop-blur-xl transition-all cursor-pointer active:scale-95 shadow-sm shrink-0"
            >
              <UserAvatar
                size="sm"
                src={user.avatar_url}
                frameUrl={user.avatar_frame_url}
                name={user.name}
              />
              <span className="text-xs font-bold hidden md:inline text-white/80 max-w-[100px] truncate">{user.name}</span>
            </button>

            <AnimatePresence>
              {showProfileDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-3 w-60 bg-[#0a0b12]/85 backdrop-blur-3xl border border-white/20 rounded-[26px] shadow-[0_25px_60px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.25)] overflow-hidden z-50 text-xs"
                >
                  <div className="p-4 border-b border-white/10 bg-white/[0.04]">
                    <p className="font-bold text-white text-sm truncate">{user.name}</p>
                    <p className="text-[11px] text-white/50 truncate mt-0.5">{user.email}</p>
                  </div>
                  <div className="p-2 space-y-1">
                    <Link
                      to={getLocalizedPath('/profil')}
                      onClick={() => setShowProfileDropdown(false)}
                      className="flex items-center space-x-2.5 px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                    >
                      <User size={15} className="text-[#ff006a]" />
                      <span className="font-semibold">{t.myProfile}</span>
                    </Link>
                    <Link
                      to={getLocalizedPath('/shaxsiy-royxat')}
                      onClick={() => setShowProfileDropdown(false)}
                      className="flex items-center space-x-2.5 px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                    >
                      <Bookmark size={15} className="text-[#ff006a]" />
                      <span className="font-semibold">{t.myList}</span>
                    </Link>
                    <Link
                      to={getLocalizedPath('/sevimlilar')}
                      onClick={() => setShowProfileDropdown(false)}
                      className="flex items-center space-x-2.5 px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                    >
                      <Heart size={15} className="text-[#ff006a]" />
                      <span className="font-semibold">{t.favorites}</span>
                    </Link>
                    <Link
                      to={getLocalizedPath('/sozlamalar')}
                      onClick={() => setShowProfileDropdown(false)}
                      className="flex items-center space-x-2.5 px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                    >
                      <Settings size={15} className="text-white/60" />
                      <span className="font-semibold">{t.settings}</span>
                    </Link>
                    {user.role === 'admin' && (
                      <Link
                        to={getLocalizedPath('/admin')}
                        onClick={() => setShowProfileDropdown(false)}
                        className="flex items-center space-x-2.5 px-3 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all"
                      >
                        <Shield size={15} />
                        <span className="font-semibold">Control Panel</span>
                      </Link>
                    )}
                  </div>
                  <div className="p-2 border-t border-white/10 bg-white/[0.03]">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 text-white/60 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all text-left cursor-pointer font-semibold"
                    >
                      <LogOut size={15} />
                      <span>{t.logout}</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex items-center space-x-1 min-[400px]:space-x-2 shrink-0">
            <Link 
              to={getLocalizedPath('/login')} 
              className="text-white/80 hover:text-white text-[11px] min-[400px]:text-xs font-bold px-2.5 min-[400px]:px-3 py-1 min-[400px]:py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/14 backdrop-blur-xl transition-all uppercase tracking-wider whitespace-nowrap active:scale-95 shadow-sm"
            >
              {t.login}
            </Link>
            <Link 
              to={getLocalizedPath('/register')} 
              className="hidden min-[480px]:inline-flex bg-gradient-to-r from-[#ff006a] to-[#a855f7] text-white px-3 min-[400px]:px-4 py-1 min-[400px]:py-1.5 rounded-full text-[11px] min-[400px]:text-xs font-bold hover:brightness-110 border border-white/25 shadow-[0_2px_14px_rgba(255,0,106,0.4),inset_0_1px_0_rgba(255,255,255,0.35)] transition-all uppercase tracking-wider whitespace-nowrap shrink-0 active:scale-95"
            >
              {t.register}
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
