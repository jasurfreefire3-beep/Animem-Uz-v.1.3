# Animem Uz — Professional Flutter Mobil Ilovasi

O'zbekistonning eng yirik anime platformasi — **Animem Uz** uchun yaratilgan rasmiy, to'liq nativ va yuqori unumdorlikka ega Flutter mobil ilovasi.

---

## 📱 Asosiy Funksiyalar va Imkoniyatlar

### 1. 🔐 Zamonaviy Avtorizatsiya (OTP & Telegram Bot)
- **Telegram orqali 1-bosishda kirish**: Rasmiy `@Animem_reg_bot` ga avtomatik deep link (`tg://resolve?domain=Animem_reg_bot&start=auth_...`) orqali yo'naltiradi. Foydalanuvchi botda bitta tugma orqali telefon raqamini tasdiqlashi bilan ilovaga bir zumda avtorizatsiya bo'lib o'tadi.
- **Email (Gmail) OTP tizimi**: Emailga 6 xonali tasdiqlash kodi yuboriladi (60 soniyalik teskari hisoblagich bilan). Agar akkaunt mavjud bo'lsa — parolsiz 1 bosishda kirish; agar yangi bo'lsa — ism va parol kiritilib ro'yxatdan o'tiladi.
- **Mehmon rejimi (Guest mode)**: Kirish shart bo'lmagan holda barcha katalog va videolarni bemalol tomosha qilish imkoniyati.
- **Xavfsiz JWT saqlash**: `shared_preferences` orqali sessiya avtomatik saqlanadi.

### 2. 🎬 Universal Video Pleyer (HLS, MP4, Embed iFrame)
- **HLS (.m3u8) oqimli uzatish**: Adaptive bitrate, avtomatik sifat tanlash (360p, 480p, 720p, 1080p).
- **To'g'ridan-to'g'ri MP4**: Keshlash va silliq uzatish.
- **Webview Embed iFrame yordamchisi**: Sibnet, Alloha, YouTube, PlayerJS, Kodik kabi tashqi embed pleyerlar to'liq qo'llab-quvvatlanadi.
- **Qismlar almashtirgichi**: 1..N qismlarni uzluksiz tanlash.
- **Ko'rish tarixi (Watch History)**: Qaysi qismda to'xtaganini avtomatik xotirada saqlaydi va bosh sahifadan 1 tugma bilan davom ettiradi.

### 3. ⚡️ Vertikal Reels (Shorts) Tasmali Pleyer
- TikTok va Instagram Reels uslubidagi silliq vertikal video o'tkazish (`PageView.builder`).
- **Double-Tap portlovchi yurak animatsiyasi**: Videoni 2 marta tez bosganda chiroyli neon pushti yurak paydo bo'ladi va layk bosiladi.
- **Real-vaqtdagi layklar va izohlar**: Server bilan sinxronlashadi.
- **Video yuklash (Reel Upload)**: Galereyadan video tanlab, sarlavha yozib serverga (`/api/reels/upload`) yuklash oynasi.

### 4. 👥 Fandub Jamoalari Bo'limi
- O'zbekistonning barcha dublyaj guruhlari katalogi (Animem Dub, Amedia, Asia Fan, UzDub va h.k.).
- Har bir jamoaning obunachilari soni, a'zolari va tavsifi.
- **1-bosishda "Obuna bo'lish" (Subscribe)**: Serverdagi `/api/fandubs/:id/subscribe` bilan bog'langan.
- Telegram kanaliga to'g'ridan-to'g'ri o'tish tugmasi.

### 5. 💬 Jonli Chat (Sayt bilan to'liq sinxron — Socket.io)
- Saytdagi foydalanuvchilar bilan real-vaqtda birgalikda yozishish.
- Onlayn foydalanuvchilar hisoblagichi.
- Admin va VIP nishonlari (Badge).
- "Foydalanuvchi yozyapti..." (Typing indicator) hodisasi.

### 6. 👤 Profil & Catbox Media Yuklash
- Galereyadan rasm tanlab **Catbox / Animem** serveriga avatarka va banner yuklash (`/api/user/avatar`, `/api/user/banner`).
- Neon aylanuvchi avatarka ramkasi (Avatar Frame).
- Daraja (Level), Tajriba (XP) progress bari va Animem tangalari.
- Sevimlilar (Favorites) va Tarix (History) tablari.

### 7. 🤖 Mika AI Anime Maslahatchi
- Aqlli anime tavsiya beruvchi suhbatdosh AI.
- Qiziqishlarga qarab tezkor anime takliflari.

---

## 🎨 Dizayn Tizimi (Liquid Glass & OLED Dark)

Ilova dizayni Apple iOS va OLED qora standartlari asosida yaratilgan:
- **Asosiy fon**: `#07070A` (Deep Space OLED Black)
- **Glassmorphism**: `BackdropFilter` (Blur 25px) + 8% oq shaffoflik + neon hoshiyalar.
- **Neon Urg'ulari**:
  - Hot Cherry Neon: `#FF006A`
  - Cyber Violet: `#7928CA`
  - Cyan Glow: `#00F2FE`
  - Star Gold: `#FFB800`
- **Shimmer Skeletons**: Hech qanday xunuk yoki sun'iy aylanuvchi yuklagichlar ishlatilmagan — faqat zamonaviy silliq skelet cardlar (`shimmer`).

---

## 🚀 Ilovani Ishga Tushirish va APK Yig'ish

### 1. Paketlarni o'rnatish
```bash
cd animem_flutter
flutter pub get
```

### 2. Dasturchi rejimida ishga tushirish (Dev run)
```bash
flutter run
```

### 3. Release APK tayyorlash (Android)
```bash
flutter build apk --release
```
Tayyor APK fayli: `build/app/outputs/flutter-apk/app-release.apk` manzilida hosil bo'ladi.

### 4. App Bundle (Google Play Store uchun)
```bash
flutter build appbundle --release
```
