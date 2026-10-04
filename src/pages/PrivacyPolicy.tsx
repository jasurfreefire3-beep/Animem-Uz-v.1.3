import React from 'react';
import { ShieldCheck, Lock, Eye, FileText, ArrowLeft, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export default function PrivacyPolicy() {
  const { currentLanguage, getLocalizedPath } = useLanguage();
  const isRu = currentLanguage === 'ru';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 text-white/90">
      <Link to={getLocalizedPath('/')} className="inline-flex items-center gap-2 text-xs font-bold text-white/60 hover:text-white transition-colors">
        <ArrowLeft size={16} /> {isRu ? 'Вернуться на главную' : 'Bosh sahifaga qaytish'}
      </Link>

      <div className="bg-[#111] border border-[#222] p-6 sm:p-8 rounded-lg shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-[#ff006a]">
          <ShieldCheck size={160} />
        </div>
        <div className="flex items-center gap-3 text-[#ff006a] text-sm font-bold uppercase tracking-wider mb-2">
          <Lock size={18} /> {isRu ? 'Юридические документы Animem.uz' : 'Animem.uz Huquqiy Hujjatlari'}
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white mb-3">
          {isRu ? 'Политика конфиденциальности (Privacy Policy)' : 'Maxfiylik Siyosati (Privacy Policy)'}
        </h1>
        <p className="text-white/60 text-xs sm:text-sm leading-relaxed max-w-2xl">
          {isRu
            ? 'Настоящая Политика конфиденциальности определяет порядок сбора, обработки, хранения и защиты персональной информации пользователей сайта Animem.uz. Мы уделяем первостепенное внимание защите конфиденциальности ваших данных.'
            : 'Ushbu Maxfiylik siyosati Animem.uz foydalanuvchilarining shaxsiy ma\'lumotlarini to\'plash, qayta ishlash, saqlash va himoya qilish tartibini belgilaydi. Biz foydalanuvchilarimizning xavfsizligi va maxfiyligini oliy o\'ringa qo\'yamiz.'}
        </p>
        <div className="mt-4 text-[11px] text-white/40">
          {isRu ? 'Последнее обновление: 4 октября 2026 г.' : 'So\'nggi yangilanish: 2026-yil 4-oktyabr'}
        </div>
      </div>

      <div className="space-y-6 text-sm leading-relaxed text-white/80">
        <section className="bg-[#111]/60 border border-[#222] p-6 rounded-lg space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Eye className="text-[#ff006a]" size={18} /> 
            {isRu ? '1. Какие данные мы собираем' : '1. Qanday ma\'lumotlar to\'planadi?'}
          </h2>
          <p>
            {isRu
              ? 'При использовании сайта Animem.uz могут обрабатываться следующие категории информации:'
              : 'Animem.uz saytidan foydalanish jarayonida quyidagi turdagi ma\'lumotlar to\'planishi mumkin:'}
          </p>
          <ul className="list-disc list-inside space-y-1 text-white/70 pl-2">
            <li>
              <strong>{isRu ? 'Регистрационные данные:' : 'Ro\'yxatdan o\'tish ma\'lumotlari:'}</strong>{' '}
              {isRu
                ? 'Имя пользователя (логин), адрес электронной почты (e-mail), аватар профиля и зашифрованный пароль.'
                : 'Taxallus (Username), elektron pochta manzili (Email), profil rasmi va parol (shifrlangan ko\'rinishda).'}
            </li>
            <li>
              <strong>{isRu ? 'Технические данные:' : 'Texnik ma\'lumotlar:'}</strong>{' '}
              {isRu
                ? 'IP-адрес, тип и версия браузера, операционная система, дата и время визита, статистика просмотренных страниц.'
                : 'IP manzil, brauzer turi va versiyasi, operatsion tizim, kirish vaqti hamda tashrif buyurilgan sahifalar.'}
            </li>
            <li>
              <strong>{isRu ? 'Пользовательская активность:' : 'Foydalanish tarixi:'}</strong>{' '}
              {isRu
                ? 'История просмотров, избранные закладки, пользовательские списки, оставленные комментарии и оценки.'
                : 'Ko\'rilgan animelar, saqlangan sevimli ro\'yxatlar hamda qoldirilgan izohlar va sharhlar.'}
            </li>
          </ul>
        </section>

        <section className="bg-[#111]/60 border border-[#222] p-6 rounded-lg space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="text-[#ff006a]" size={18} /> 
            {isRu ? '2. Использование файлов Cookie и рекламные сети' : '2. Cookie fayllari va Analitika'}
          </h2>
          <p>
            {isRu
              ? 'Для обеспечения стабильной работы сайта, анализа аудитории и отображения релевантных объявлений используются файлы cookie и аналитические сервисы:'
              : 'Saytimiz samaradorligini oshirish va qulaylik yaratish maqsadida Cookie (kuki) fayllari hamda analitik tizimlardan foydalaniladi:'}
          </p>
          <ul className="list-disc list-inside space-y-1 text-white/70 pl-2">
            <li>
              {isRu
                ? 'Функциональные cookies — для сохранения авторизации, настроек плеера и языка интерфейса.'
                : 'Saytda avtorizatsiyadan o\'tganlik holatini va foydalanuvchi sozlamalarini saqlab qolish uchun funksional cookie-fayllar ishlatiladi.'}
            </li>
            <li>
              {isRu
                ? 'Аналитические счетчики (Яндекс Метрика, Google Analytics) — для подсчета посещаемости и улучшения качества сервиса.'
                : 'Saytga tashriflar statistikasi va foydalanuvchi xatti-harakatlarini tahlil qilish uchun Yandex Metrika va Google Analytics xizmatlaridan foydalaniladi.'}
            </li>
            <li>
              {isRu
                ? 'Рекламные cookies партнеров (включая Рекламную сеть Яндекса / РСЯ) — для безопасного показа релевантной контекстной и медийной рекламы.'
                : 'Saytda uchinchi tomon reklama tarmoqlari (jumladan Yandex Advertising Network / РСЯ va hamkorlar) tomonidan qiziqishlarga mos reklamalarni ko\'rsatish uchun reklama cookie-fayllari qo\'llanilishi mumkin.'}
            </li>
          </ul>
        </section>

        <section className="bg-[#111]/60 border border-[#222] p-6 rounded-lg space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="text-[#ff006a]" size={18} /> 
            {isRu ? '3. Безопасность и защита данных' : '3. Ma\'lumotlarni xavfsiz saqlash va Himoya'}
          </h2>
          <p>
            {isRu
              ? 'Мы применяем современные методы шифрования данных (включая защищенные SSL/TLS протоколы) для предотвращения несанкционированного доступа. Персональные данные пользователей не передаются и не продаются третьим лицам.'
              : 'Biz foydalanuvchi ma\'lumotlarini ruxsatsiz kirish, o\'zgartirish yoki oshkor qilishdan himoya qilish uchun barcha zamonaviy SSL shifrlash sertifikatlari va xavfsiz protokollardan foydalanamiz.'}
          </p>
        </section>

        <section className="bg-[#111]/60 border border-[#222] p-6 rounded-lg space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Mail className="text-[#ff006a]" size={18} /> 
            {isRu ? '4. Контакты по вопросам конфиденциальности' : '4. Bog\'lanish'}
          </h2>
          <p>
            {isRu
              ? 'По любым вопросам, касающимся обработки и удаления ваших персональных данных, вы можете обратиться к нам:'
              : 'Maxfiylik siyosati yoki shaxsiy ma\'lumotlar bo\'yicha savollaringiz bo\'lsa, biz bilan bog\'lanishingiz mumkin:'}
          </p>
          <div className="p-4 bg-black/40 rounded border border-[#333] space-y-1 text-xs">
            <div><strong>E-mail:</strong> support@animem.uz / admin@animem.uz</div>
            <div><strong>Telegram:</strong> <a href="https://t.me/AnimemUzb" target="_blank" rel="noreferrer" className="text-[#ff006a] hover:underline">@AnimemUzb</a></div>
          </div>
        </section>
      </div>
    </div>
  );
}
