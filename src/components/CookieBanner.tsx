import React, { useState, useEffect } from 'react';
import { Cookie, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const { currentLanguage, getLocalizedPath } = useLanguage();
  const isRu = currentLanguage === 'ru';

  useEffect(() => {
    try {
      const consent = localStorage.getItem('animem_cookie_consent');
      if (!consent) {
        // Show after 1.5 seconds so it doesn't block initial page load
        const timer = setTimeout(() => setIsVisible(true), 1500);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem('animem_cookie_consent', 'accepted');
    } catch {}
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent banner"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 p-4 sm:p-5 bg-black/80 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] animate-fade-in text-white/90"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[#ff006a]/20 border border-[#ff006a]/30 text-[#ff006a] flex items-center justify-center shrink-0 mt-0.5">
          <Cookie size={20} />
        </div>

        <div className="flex-1 text-xs leading-relaxed">
          <div className="font-bold text-white text-sm mb-1 flex items-center justify-between">
            <span>{isRu ? 'Файлы Cookie и конфиденциальность' : 'Cookie fayllari va maxfiylik'}</span>
            <button
              onClick={() => setIsVisible(false)}
              className="text-white/40 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-xl"
              aria-label="Yopish"
            >
              <X size={15} />
            </button>
          </div>

          <p className="text-white/70 mb-3">
            {isRu
              ? 'Мы используем файлы cookie для персонализации контента, анализа трафика и показа релевантной рекламы в соответствии с нашей '
              : 'Saytimizda foydalanuvchi tajribasini yaxshilash, statistik tahlil va mos reklamalarni ko‘rsatish uchun cookie fayllaridan foydalaniladi. '}
            <Link
              to={getLocalizedPath('/maxfiylik-siyosati')}
              className="text-[#ff006a] hover:underline font-semibold"
            >
              {isRu ? 'Политикой конфиденциальности' : 'Maxfiylik siyosati'}
            </Link>
            .
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAccept}
              className="flex-1 py-2.5 px-4 bg-gradient-to-r from-[#ff006a] to-[#e0005e] hover:brightness-110 active:scale-95 text-white font-bold rounded-xl transition-all shadow-lg shadow-[#ff006a]/25 text-center border border-white/20"
            >
              {isRu ? 'Принять всё' : 'Qabul qilish'}
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="py-2.5 px-3.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/70 hover:text-white rounded-xl transition-colors font-medium"
            >
              {isRu ? 'Закрыть' : 'Yopish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
