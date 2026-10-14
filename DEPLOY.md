# Vercel & Northflank Deploy Qo'llanmasi

Ushbu loyiha ikkiga ajratilgan holda mustaqil va juda tez ishlaydi:
- **Frontend (UI / React SPA):** Vercel-da joylashtiriladi (CDN, yuqori tezlik, bepul SSL).
- **Backend (Express + Socket.io + Database):** Northflank-da Docker yoki Node.js konteyner sifatida ishlaydi (doimiy server, WebSockets, FFmpeg).

---

## 1. Backend-ni Northflank-da sozlash

1. **Northflank** (https://northflank.com) hisobingizga kiring.
2. Yangi **Project** yarating.
3. **Create Service** -> **Deployment** (yoki Combined Service) tanlang.
4. Repozitoriyani ulang (`GitHub` / `GitLab`).
5. **Build Source:**
   - **Dockerfile** tanlang (loyiha ildizida tayyor `Dockerfile` mavjud).
6. **Networking & Ports:**
   - Port: `3000`
   - Protocol: `HTTP`
   - Public traffic: **Enabled** (tashqi internetga ochish).
   - O'zingizga berilgan domen: masalan, `https://animem-backend-xxxx.northflank.app`
7. **Environment Variables (Atrof-muhit o'zgaruvchilari):**
   Northflank Service sozlamalaridagi **Environment** bo'limida `.env.example` dagi qiymatlarni kiriting:
   - `PORT`: `3000` (Northflank avtomatik ham beradi)
   - `DB_HOST`: Ma'lumotlar bazasi hosti
   - `DB_PORT`: `10272`
   - `DB_NAME`: `dataanime`
   - `DB_USER`: Sizning db useringiz
   - `DB_PASSWORD`: Sizning db parolingiz
   - `JWT_SECRET`: Maxfiy kalit
   - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` va boshqa kerakli kalitlar.
8. **Deploy** tugmasini bosing va server ishga tushganini loglar orqali tekshiring.

---

## 2. Frontend-ni Vercel-da sozlash

1. **Vercel** (https://vercel.com) hisobingizga kiring.
2. **Add New...** -> **Project** tanlang va o'sha repozitoriyangizni import qiling.
3. **Project Settings:**
   - **Framework Preset:** `Vite` (avtomatik aniqlanadi)
   - **Root Directory:** `./`
   - **Build Command:** `vite build` (yoki `npm run build:client`)
   - **Output Directory:** `dist`
4. **Environment Variables:**
   Quyidagi o'zgaruvchini qo'shing:
   - `VITE_API_BASE_URL`: Northflank-dagi backend manzili (oxirida `/` bo'lmasin!).
     Masalan: `https://animem-backend-xxxx.northflank.app`
5. **Deploy** tugmasini bosing.
   - Loyiha ildizidagi `vercel.json` fayli React Router sahifalarini (masalan: `/animelar`, `/chat`, `/anime/...`) 404 xatosi bermasdan to'g'ri ishlashini ta'minlaydi.

---

## 3. Qanday ishlaydi?

1. **API so'rovlar:** Foydalanuvchi saytga kirganda barcha `fetch('/api/...')` va fayl yuklash so'rovlari `src/main.tsx` dagi global avtomatik yo'naltiruvchi orqali to'g'ridan-to'g'ri `VITE_API_BASE_URL` (Northflank) ga yuboriladi.
2. **CORS:** Backend `server.ts` da `cors({ origin: true, credentials: true })` sozlangan, shuning uchun Vercel domenidan kelgan barcha so'rovlar muammosiz qabul qilinadi.
3. **Jonli Chat (Socket.io):** Frontend `ChatWidget.tsx` va `Chat.tsx` Northflank backendiga to'g'ridan-to'g'ri WebSocket ulanadi.
