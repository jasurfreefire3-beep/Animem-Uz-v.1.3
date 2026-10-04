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
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 p-4 sm:p-5 bg-[#121217]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl animate-fade-in text-white/90"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#ff006a]/15 text-[#ff006a] flex items-center justify-center shrink-0 mt-0.5">
          <Cookie size={20} />
        </div>

        <div className="flex-1 text-xs leading-relaxed">
          <div className="font-bold text-white text-sm mb-1 flex items-center justify-between">
            <span>{isRu ? 'Файлы Cookie и конфиденциальность' : 'Cookie fayllari va maxfiylik'}</span>
            <button
              onClick={() => setIsVisible(false)}
              className="text-white/40 hover:text-white transition-colors p-1"
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
              className="flex-1 py-2 px-4 bg-[#ff006a] hover:bg-[#e0005e] active:scale-95 text-white font-bold rounded-xl transition-all shadow-lg shadow-[#ff006a]/20 text-center"
            >
              {isRu ? 'Принять всё' : 'Qabul qilish'}
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="py-2 px-3 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl transition-colors font-medium"
            >
              {isRu ? 'Закрыть' : 'Yopish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
