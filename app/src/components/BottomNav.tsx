import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Compass, PlaySquare, Heart, Sparkles, User as UserIcon } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const location = useLocation();

  // Hide bottom nav when in fullscreen video watch screen for immersive experience
  if (location.pathname.startsWith('/watch')) {
    return null;
  }

  const navItems = [
    { to: '/', label: 'Asosiy', icon: Home },
    { to: '/explore', label: 'Katalog', icon: Compass },
    { to: '/reels', label: 'Reels', icon: PlaySquare, badge: 'HOT' },
    { to: '/favorites', label: 'Sevimlilar', icon: Heart },
    { to: '/mika', label: 'Mika AI', icon: Sparkles, glow: true },
    { to: '/profile', label: 'Profil', icon: UserIcon },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none pb-[env(safe-area-inset-bottom,0px)]">
      <div className="max-w-md mx-auto px-3 pb-2 pt-1 pointer-events-auto">
        <div className="glass-nav rounded-2xl px-2 py-2 flex items-center justify-around shadow-[0_-8px_32px_rgba(0,0,0,0.65)] border border-white/10 backdrop-blur-2xl">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="relative flex flex-col items-center justify-center flex-1 py-1 transition-all duration-300 group"
              >
                {/* Active glow pill */}
                {isActive && (
                  <div className="absolute -top-1 w-8 h-1 rounded-full bg-gradient-to-r from-[#ff006a] to-[#00dfd8] shadow-[0_0_12px_#ff006a]" />
                )}

                {/* Badge */}
                {item.badge && (
                  <span className="absolute -top-1 right-2 bg-gradient-to-r from-[#ff006a] to-red-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-tighter shadow-[0_0_8px_rgba(255,0,106,0.6)]">
                    {item.badge}
                  </span>
                )}

                <div
                  className={`relative p-1.5 rounded-xl transition-all duration-300 ${
                    isActive
                      ? item.glow
                        ? 'text-[#00dfd8] scale-110 drop-shadow-[0_0_12px_rgba(0,223,216,0.8)]'
                        : 'text-[#ff006a] scale-110 drop-shadow-[0_0_12px_rgba(255,0,106,0.8)]'
                      : 'text-white/45 group-hover:text-white/80'
                  }`}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>

                <span
                  className={`text-[10px] tracking-tight font-medium transition-colors ${
                    isActive ? 'text-white font-bold' : 'text-white/40'
                  }`}
                >
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
