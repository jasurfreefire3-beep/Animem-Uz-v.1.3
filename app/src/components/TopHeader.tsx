import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Bell, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface TopHeaderProps {
  onSearchClick?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onSearchClick }) => {
  const { user, openAuthModal } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-[#07070a]/80 backdrop-blur-xl border-b border-white/5 pt-[env(safe-area-inset-top,0px)]">
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between gap-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#ff006a] to-[#7928ca] p-0.5 shadow-[0_0_15px_rgba(255,0,106,0.4)] flex items-center justify-center">
            <div className="w-full h-full bg-[#07070a] rounded-[10px] flex items-center justify-center">
              <span className="font-display font-black text-sm text-transparent bg-clip-text bg-gradient-to-r from-[#ff006a] to-white">
                A
              </span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-display font-black text-base tracking-wider text-white flex items-center gap-1">
              ANIMEM<span className="text-[#ff006a]">.UZ</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#00dfd8] animate-pulse shadow-[0_0_8px_#00dfd8]" />
            </span>
            <span className="text-[8px] font-bold text-white/40 tracking-widest -mt-1 uppercase">
              PRO MOBILE APP
            </span>
          </div>
        </Link>

        {/* Action icons */}
        <div className="flex items-center gap-2">
          {/* Mika AI Quick Pill */}
          <Link
            to="/mika"
            className="flex items-center gap-1 bg-[#ff006a]/15 hover:bg-[#ff006a]/25 text-[#ff006a] px-2.5 py-1 rounded-full border border-[#ff006a]/30 text-xs font-bold transition-all shadow-[0_0_12px_rgba(255,0,106,0.2)]"
          >
            <Sparkles size={13} className="text-[#00dfd8]" />
            <span className="text-[11px]">Mika</span>
          </Link>

          {/* Search Button */}
          <button
            onClick={() => onSearchClick ? onSearchClick() : navigate('/explore')}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all active:scale-95"
            aria-label="Qidiruv"
          >
            <Search size={17} />
          </button>

          {/* User Avatar or Kirish Button */}
          {user ? (
            <Link
              to="/profile"
              className="relative w-9 h-9 rounded-xl overflow-hidden border border-white/15 bg-white/5 flex items-center justify-center active:scale-95 transition-transform"
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="font-black text-xs text-[#ff006a] uppercase">
                  {user?.name ? user.name.charAt(0) : 'U'}
                </span>
              )}
            </Link>
          ) : (
            <button
              onClick={openAuthModal}
              className="bg-gradient-to-r from-[#ff006a] to-[#7928ca] text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-[0_0_12px_rgba(255,0,106,0.4)] active:scale-95 transition-all"
            >
              Kirish
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

