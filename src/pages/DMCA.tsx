import React from 'react';
import { Copyright, ShieldAlert, Mail, ArrowLeft, CheckSquare, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export default function DMCA() {
  const { currentLanguage, getLocalizedPath } = useLanguage();
  const isRu = currentLanguage === 'ru';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 text-white/90">
      <Link to={getLocalizedPath('/')} className="inline-flex items-center gap-2 text-xs font-bold text-white/60 hover:text-white transition-colors">
        <ArrowLeft size={16} /> {isRu ? 'Вернуться на главную' : 'Bosh sahifaga qaytish'}
      </Link>

      <div className="bg-[#111] border border-[#222] p-6 sm:p-8 rounded-lg shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-[#ff006a]">
          <Copyright size={160} />
        </div>
        <div className="flex items-center gap-3 text-[#ff006a] text-sm font-bold uppercase tracking-wider mb-2">
          <ShieldAlert size={18} /> {isRu ? 'Правообладателям / DMCA' : 'Huquq Egalari Uchun / For Copyright Holders'}
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white mb-3">
          {isRu ? 'Политика соблюдения авторских прав (DMCA)' : 'Mualliflik Huquqi va DMCA Siyosati'}
        </h1>
        <p className="text-white/60 text-xs sm:text-sm leading-relaxed max-w-2xl">
          {isRu
            ? 'Администрация Animem.uz с уважением относится к интеллектуальной собственности и законам об авторском праве. Мы действуем в строгом соответствии с Законом об авторском праве в цифровую эпоху (DMCA) и международными стандартами.'
            : 'Animem.uz mualliflik huquqlarini va intellektual mulk egalarining qonuniy huquqlarini hurmat qiladi. Biz DMCA (Digital Millennium Copyright Act) va xalqaro mualliflik huquqi standartlariga mos ravishda ish yuritamiz.'}
        </p>
      </div>

      <div className="space-y-6 text-sm leading-relaxed text-white/80">
        <section className="bg-[#111]/60 border border-[#222] p-6 rounded-lg space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Copyright className="text-[#ff006a]" size={18} /> 
            {isRu ? '1. Правовой отказ от ответственности' : '1. Rad etish va Huquqiy Ogohlantirish'}
          </h2>
          <p>
            {isRu
              ? 'Сайт Animem.uz является общедоступным информационно-развлекательным ресурсом и не размещает видеоматериалы на собственных серверах. Все видеопотоки, ссылки и плееры, доступные на сайте, получены из открытых публичных источников (включая Telegram, VK, Sibnet, Ok.ru и сторонние embed-серверы).'
              : 'Animem.uz sayti o\'z serverlarida noqonuniy videofayllar yoki mualliflik huquqi bilan himoyalangan kontentlarni saqlamaydi. Saytdagi barcha videopleyerlar va pleylistlar ochiq internet manbalaridagi (VK, Telegram, Sibnet, Ok.ru va boshqa ochiq pleyerlar) havola va kodlardan (embed) iborat.'}
          </p>
          <p>
            {isRu
              ? 'Администрация сайта не имеет технической возможности контролировать контент, загружаемый на сторонние ресурсы, однако готова к сотрудничеству с правообладателями для немедленного прекращения показа спорного материала.'
              : 'Biroq, biz mualliflik huquqi egalarining har qanday asosli talablarini ko\'rib chiqishga va qoidabuzarlik aniqlangan havolalarni tezkorlik bilan o\'chirishga tayyormiz.'}
          </p>
        </section>

        <section className="bg-[#111]/60 border border-[#222] p-6 rounded-lg space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckSquare className="text-[#ff006a]" size={18} /> 
            {isRu ? '2. Порядок обращения для правообладателей' : '2. Murojaat Yuborish Tartibi'}
          </h2>
          <p>
            {isRu
              ? 'Если вы являетесь законным обладателем исключительных прав на контент, размещенный на страницах нашего сайта, и ваши права нарушаются, просим направить нам официальное уведомление со следующими данными:'
              : 'Agar siz mualliflik huquqi egasi bo\'lsangiz va Animem.uz saytidagi biron-bir sahifada huquqlaringiz buzilgan deb hisoblasangiz, quyidagi ma\'lumotlarni o\'z ichiga olgan rasmiy murojaatni bizga yuborishingiz mumkin:'}
          </p>
          <ul className="list-disc list-inside space-y-2 text-white/70 pl-2">
            <li>
              {isRu
                ? 'Документ, подтверждающий ваши полномочия или права на спорный объект интеллектуальной собственности;'
                : 'Mualliflik huquqini tasdiqlovchi rasmiy hujjat nusxasi yoki sertifikat;'}
            </li>
            <li>
              {isRu
                ? 'ФИО или наименование компании-правообладателя и контактные данные (e-mail, телефон);'
                : 'Huquq egalari yoki ularning rasmiy vakilining to\'liq ismi-sharifi va aloqa ma\'lumotlari;'}
            </li>
            <li>
              {isRu
                ? 'Прямой URL-адрес страницы на Animem.uz, где предположительно нарушаются права;'
                : 'Animem.uz saytidagi qoidabuzarlik mavjud bo\'lgan aniq sahifa havolasi (URL);'}
            </li>
            <li>
              {isRu
                ? 'Заявление о несанкционированном использовании материала и запрос на его удаление.'
                : 'Kontentni o\'chirish yoki bloklash bo\'yicha rasmiy so\'rov.'}
            </li>
          </ul>
        </section>

        <section className="bg-[#111]/60 border border-[#222] p-6 rounded-lg space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Mail className="text-[#ff006a]" size={18} /> 
            {isRu ? '3. Сроки рассмотрения и контакты' : '3. Ko\'rib Chiqish Muddati va Bog\'lanish'}
          </h2>
          <p>
            {isRu
              ? 'Все обращения правообладателей рассматриваются в срок не более 24 часов с момента получения. При подтверждении прав материал незамедлительно удаляется с платформы.'
              : 'Barcha murojaatlar kelib tushgan vaqtdan e\'tiboran 24 soat ichida ko\'rib chiqiladi. Asosli murojaat qabul qilingach, ko\'rsatilgan materiallar zudlik bilan platformadan olib tashlanadi.'}
          </p>
          <div className="p-4 bg-black/40 rounded border border-[#333] space-y-2 text-xs">
            <div>
              <strong>{isRu ? 'Официальный e-mail:' : 'Rasmiy email:'}</strong>{' '}
              <a href="mailto:dmca@animem.uz" className="text-[#ff006a] hover:underline font-bold">dmca@animem.uz</a> /{' '}
              <a href="mailto:admin@animem.uz" className="text-[#ff006a] hover:underline font-bold">admin@animem.uz</a>
            </div>
            <div>
              <strong>{isRu ? 'Telegram для связи:' : 'Telegram muloqot:'}</strong>{' '}
              <a href="https://t.me/AnimemUzb" target="_blank" rel="noreferrer" className="text-[#ff006a] hover:underline">@AnimemUzb</a>
            </div>
            <div>
              <strong>{isRu ? 'Время ответа:' : 'Javob berish vaqti:'}</strong> {isRu ? 'До 24 часов' : '24 soatgacha'}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
