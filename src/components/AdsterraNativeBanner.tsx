import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface AdsterraNativeBannerProps {
  className?: string;
  badgeText?: string;
}

export default function AdsterraNativeBanner({ 
  className = '',
  badgeText = 'Hamkorlik' 
}: AdsterraNativeBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Small delay to ensure the DOM container is cleanly mounted and sized
    const timer = setTimeout(() => {
      const container = document.getElementById('container-5e5bdedbb0917caa7cf44e3709da7781');
      if (!container) return;

      // Remove any prior script instance to re-trigger execution cleanly
      const oldScript = document.getElementById('adsterra-native-banner-script');
      if (oldScript) {
        oldScript.remove();
      }

      const script = document.createElement('script');
      script.id = 'adsterra-native-banner-script';
      script.type = 'text/javascript';
      script.async = true;
      script.setAttribute('data-cfasync', 'false');
      script.src = 'https://bauval.org/21/5e5bdedbb0917caa7cf44e3709da7781';

      document.body.appendChild(script);
    }, 120);

    return () => {
      clearTimeout(timer);
      const s = document.getElementById('adsterra-native-banner-script');
      if (s) {
        try {
          s.remove();
        } catch {}
      }
    };
  }, [location.pathname]);

  return (
    <div className={`w-full ${className}`}>
      <div className="relative rounded-2xl bg-gradient-to-b from-[#14141d]/90 via-[#0e0e15]/80 to-[#09090d]/90 border border-white/10 p-3.5 sm:p-5 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-300 hover:border-white/20">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-[#ff006a]/5 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header Row */}
        <div className="flex items-center justify-between mb-3 px-1 relative z-10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ff006a] animate-pulse" />
            <span className="text-xs sm:text-sm font-extrabold text-white tracking-wide">
              Tavsiya etiladi
            </span>
          </div>
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-white/5 text-white/50 border border-white/10 tracking-wider">
            {badgeText}
          </span>
        </div>

        {/* Adsterra Native Banner Container */}
        <div 
          ref={containerRef}
          id="container-5e5bdedbb0917caa7cf44e3709da7781" 
          className="w-full min-h-[90px] flex items-center justify-center relative z-10"
        />
      </div>
    </div>
  );
}

