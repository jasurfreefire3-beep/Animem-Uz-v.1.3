import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  Home, 
  Tv, 
  BookOpen,
  Film,
  Calendar, 
  Clock, 
  Star, 
  Heart, 
  Bookmark,
  History, 
  Settings, 
  Moon, 
  Sun,
  Shield,
  X,
  MessageSquare,
  Music
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { translateGenre } from '../types';

const logoImg = "/logo.png";

interface SidebarProps {
  onClose?: () => void;
  onGenreSelect?: (genre: string) => void;
}

export default function Sidebar({ onClose, onGenreSelect }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { t, getLocalizedPath } = useLanguage();
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved !== 'light';
  });

  useEffect(() => {
    // Initial sync
    const saved = localStorage.getItem('theme');
    if (saved === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }

    const handleGlobalThemeChange = () => {
      const savedTheme = localStorage.getItem('theme');
      setDarkMode(savedTheme !== 'light');
    };

    window.addEventListener('theme-changed', handleGlobalThemeChange);
    return () => window.removeEventListener('theme-changed', handleGlobalThemeChange);
  }, []);

  const toggleDarkMode = () => {
    const newValue = !darkMode;
    setDarkMode(newValue);
    const themeKey = newValue ? 'dark' : 'light';
    localStorage.setItem('theme', themeKey);
    if (themeKey === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    window.dispatchEvent(new Event('theme-changed'));
  };

  // 2 kundan keyin (2026-11-02 23:59:59 UTC dan so'ng) "New" belgisi barchada avtomatik yo'qoladi
  const isNewBadgeVisible = Date.now() < new Date('2026-11-02T23:59:59Z').getTime();

  const menuItems = [
    { name: t.navHome, path: '/', icon: Home },
    { name: t.navAnimes, path: '/animelar', icon: Tv },
    { name: t.navSchedule, path: '/jadval', icon: Calendar },
    { name: t.navNewReleases, path: '/yangi-chiqishlar', icon: Clock },
    { name: t.navTop100, path: '/top100', icon: Star },
    { name: t.navMyList, path: '/shaxsiy-royxat', icon: Bookmark },
    { name: t.navFavorites, path: '/sevimlilar', icon: Heart },
    { name: t.navHistory, path: '/tarix', icon: History },
    { name: t.navMusic || 'Musiqa', path: '/music', icon: Music, badge: isNewBadgeVisible ? 'New' : undefined },
    { name: t.navChat, path: '/chat', icon: MessageSquare },
    { name: 'Donat qilish', path: '/donat', icon: Heart },
    { name: t.navSettings, path: '/sozlamalar', icon: Settings },
  ];

  const categories = [
    'Action',
    'Adventure',
    'Comedy',
    'Drama',
    'Fantasy',
    'Horror',
    'Romance',
    'Sci-Fi',
    'Slice of Life',
    'Supernatural',
  ];

  // Helper to check if item is active regardless of language prefix
  const isItemActive = (rawPath: string) => {
    const current = location.pathname.replace(/^\/(uz|ru|ing|en)(\/|$)/, '/');
    const normalizedCurrent = current.endsWith('/') && current.length > 1 ? current.slice(0, -1) : current;
    const normalizedTarget = rawPath.endsWith('/') && rawPath.length > 1 ? rawPath.slice(0, -1) : rawPath;
    return normalizedCurrent === normalizedTarget;
  };

  return (
    <div className="w-full h-full flex flex-col text-white select-none">
      {/* Brand Logo */}
      <div className="relative h-44 flex items-center justify-center px-3 border-b border-white/10 bg-white/[0.02]">
        <Link to={getLocalizedPath('/')} onClick={onClose} className="flex items-center justify-center w-full group py-1">
          <img 
            src={logoImg} 
            alt="AnimeUz" 
            className="h-[145px] w-full max-w-[240px] object-contain transition-transform group-hover:scale-105 drop-shadow-xl" 
          />
        </Link>
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-white/10"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Scrollable Navigation */}
      <div className="flex-1 overflow-y-auto custom-scrollbar py-4 px-3 space-y-6">
        {/* Main Menu */}
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item.path);
            return (
              <Link
                key={item.name}
                to={getLocalizedPath(item.path)}
                onClick={onClose}
                className={`flex items-center space-x-3.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all border ${
                  active 
                    ? 'bg-gradient-to-r from-[#ff006a]/90 to-[#a855f7]/90 text-white shadow-[0_0_20px_rgba(255,0,106,0.35)] border-white/25' 
                    : 'text-white/70 hover:bg-white/10 hover:text-white border-transparent hover:border-white/10 backdrop-blur-sm'
                }`}
              >
                <Icon size={18} className={active ? 'text-white' : 'text-white/60'} />
                <span className="flex-1 truncate">{item.name}</span>
                {item.badge && (
                  <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-gradient-to-r from-[#ff006a] to-[#00c8ff] text-white shadow-sm shadow-[#ff006a]/30">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {user && user.role === 'admin' && (
            <Link
              to={getLocalizedPath('/admin')}
              onClick={onClose}
              className={`flex items-center space-x-3.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all border ${
                isItemActive('/admin')
                  ? 'bg-rose-600/90 text-white shadow-lg shadow-rose-600/30 border-rose-400/30'
                  : 'text-rose-400/80 hover:bg-rose-500/10 hover:text-rose-300 border-transparent hover:border-rose-500/20'
              }`}
            >
              <Shield size={18} />
              <span>Control Panel</span>
            </Link>
          )}
        </div>

        {/* Categories Section */}
        <div>
          <h4 className="px-3 text-[11px] font-bold text-white/40 uppercase tracking-widest mb-2.5">
            {t.categories}
          </h4>
          <div className="space-y-1">
            {categories.map((genre) => (
              <Link
                key={genre}
                to={`${getLocalizedPath('/animelar')}?genre=${genre}`}
                onClick={() => {
                  if (onGenreSelect) onGenreSelect(genre);
                  if (onClose) onClose();
                }}
                className="flex items-center px-3.5 py-2 text-xs font-bold text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-white/10"
              >
                <span className="mr-2 text-[#ff006a]/70 group-hover:text-[#ff006a] font-mono">&gt;</span>
                {translateGenre(genre)}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Mode Switch & Info */}
      <div className="p-4 border-t border-white/10 bg-black/50 backdrop-blur-2xl flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button 
            onClick={toggleDarkMode}
            className="p-2 hover:bg-white/10 rounded-xl text-white/60 hover:text-white transition-all cursor-pointer border border-transparent hover:border-white/10"
            title={darkMode ? "Kungi rejim" : "Tungi rejim"}
          >
            {darkMode ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
        <div className="text-[10px] text-white/30 font-bold tracking-wider font-mono uppercase">
          ANIMEUZ v1.2
        </div>
      </div>
    </div>
  );
}
