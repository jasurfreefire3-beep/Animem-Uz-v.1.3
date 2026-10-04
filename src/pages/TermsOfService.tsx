import React from 'react';
import { BookOpen, CheckCircle, AlertTriangle, ArrowLeft, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export default function TermsOfService() {
  const { currentLanguage, getLocalizedPath } = useLanguage();
  const isRu = currentLanguage === 'ru';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 text-white/90">
      <Link to={getLocalizedPath('/')} className="inline-flex items-center gap-2 text-xs font-bold text-white/60 hover:text-white transition-colors">
        <ArrowLeft size={16} /> {isRu ? 'Вернуться на главную' : 'Bosh sahifaga qaytish'}
      </Link>

      <div className="bg-[#111] border border-[#222] p-6 sm:p-8 rounded-lg shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-[#ff006a]">
          <BookOpen size={160} />
        </div>
        <div className="flex items-center gap-3 text-[#ff006a] text-sm font-bold uppercase tracking-wider mb-2">
          <Shield size={18} /> {isRu ? 'Юридические документы Animem.uz' : 'Animem.uz Huquqiy Hujjatlari'}
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white mb-3">
          {isRu ? 'Пользовательское соглашение (Terms of Service)' : 'Foydalanish Shartlari (Terms of Service)'}
        </h1>
        <p className="text-white/60 text-xs sm:text-sm leading-relaxed max-w-2xl">
          {isRu
            ? 'Посещение и использование сайта Animem.uz означает полное и безоговорочное согласие с настоящим Пользовательским соглашением. Пожалуйста, внимательно ознакомьтесь с его условиями перед использованием ресурса.'
            : 'Animem.uz saytiga tashrif buyurish va undan foydalanish ushbu Foydalanish shartlariga to\'liq rozi bo\'lganingizni anglatadi. Iltimos, saytdan foydalanishdan oldin shartlar bilan diqqat bilan tanishib chiqing.'}
        </p>
        <div className="mt-4 text-[11px] text-white/40">
          {isRu ? 'Последнее обновление: 4 октября 2026 г.' : 'So\'nggi yangilanish: 2026-yil 4-oktyabr'}
        </div>
      </div>

      <div className="space-y-6 text-sm leading-relaxed text-white/80">
        <section className="bg-[#111]/60 border border-[#222] p-6 rounded-lg space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle className="text-[#ff006a]" size={18} /> 
            {isRu ? '1. Общие положения и возрастное ограничение (16+)' : '1. Umumiy Qoidalar va Yoshi Cheklovi (16+)'}
          </h2>
          <p>
            {isRu
              ? 'Animem.uz — информационно-развлекательный портал для любителей анимации и восточной культуры. Материалы на сайте предназначены для аудитории старше 16 лет (16+). Пользователям младше 16 лет рекомендуется использовать ресурс под контролем родителей или законных представителей.'
              : 'Animem.uz — anime, manga va sharhlarni taqdim etuvchi axborot-ko\'ngilochar platformadir. Saytdagi materiallar yoshi 16 yoshdan oshgan (16+) auditoriya uchun mo\'ljallangan. 16 yoshga to\'lmagan foydalanuvchilar platformadan ota-onalari yoki qonuniy vakillari nazorati ostida foydalanishlari tavsiya etiladi.'}
          </p>
        </section>

        <section className="bg-[#111]/60 border border-[#222] p-6 rounded-lg space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="text-[#ff006a]" size={18} /> 
            {isRu ? '2. Учетные записи и ответственность' : '2. Hisob va Xavfsizlik'}
          </h2>
          <p>
            {isRu
              ? 'При регистрации на сайте пользователь обязуется предоставлять достоверные данные, обеспечивать конфиденциальность своего пароля и не создавать аккаунты от имени других лиц.'
              : 'Saytda ro\'yxatdan o\'tishda foydalanuvchi to\'g\'ri ma\'lumotlarni kiritish, o\'z parolini himoyalash va boshqa shaxslar nomidan soxta profillar yaratmaslik majburiyatini oladi.'}
          </p>
        </section>

        <section className="bg-[#111]/60 border border-[#222] p-6 rounded-lg space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <AlertTriangle className="text-[#ff006a]" size={18} /> 
            {isRu ? '3. Правила общения и запреты' : '3. Saytda Taqiqlar va Izohlar Qoidasi'}
          </h2>
          <p>
            {isRu
              ? 'В комментариях, чате и обсуждениях категорически запрещены: оскорбления, ненормативная лексика, спам, распространение вредоносных ссылок, разжигание межнациональной или религиозной розни, а также несанкционированные спойлеры.'
              : 'Saytdagi sharhlar va chatda haqoratli so\'zlar, spam, reklama, zararli havolalar, milliy yoki diniy nizolarni keltirib chiqaruvchi xabarlar hamda ruxsatsiz spoilerlar qat\'iyan man etiladi.'}
          </p>
        </section>

        <section className="bg-[#111]/60 border border-[#222] p-6 rounded-lg space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BookOpen className="text-[#ff006a]" size={18} /> 
            {isRu ? '4. Ограничение ответственности' : '4. Mas\'uliyatni Cheklash'}
          </h2>
          <p>
            {isRu
              ? 'Администрация сайта прилагает усилия для бесперебойного функционирования платформы, однако не несет ответственности за перебои в работе сторонних серверов, сетей связи или действия третьих лиц.'
              : 'Animem.uz ma\'muriyati saytning uzluksiz ishlashini ta\'minlashga harakat qiladi, biroq uchinchi tomon serverlari va texnik uzilishlar uchun javobgarlikni o\'z zimmasiga olmaydi.'}
          </p>
        </section>
      </div>
    </div>
  );
}
