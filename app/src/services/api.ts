import { Anime, User } from '../types';

// Connect to existing backend. In dev with Vite proxy, it defaults to /api,
// or fallback to https://animem.uz if running standalone
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export const SAMPLE_FALLBACK_ANIMES: Anime[] = [
  {
    id: 1,
    title: "Solo Leveling: Arise (Yolg'iz Daraja Ko'tarish)",
    original_title: "Ore dake Level Up na Ken",
    poster_url: "https://image.animem.uz/api/media/img_1792172361943_kkah81l.jpg",
    banner_url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1600&auto=format&fit=crop&q=80",
    description: "Insoniyatning eng zaif ovchisi Son Jin-Vu g'aroyib er osti dunyosidagi sirli sinovdan so'ng cheksiz daraja ko'tarish qobiliyatiga ega bo'ladi.",
    rating: 9.8,
    release_year: 2024,
    genres: ["Ekshn", "Fentezi", "Sarguzasht"],
    status: "Davom etmoqda",
    type: "TV Serial",
    studio: "A-1 Pictures",
    voice_acting: "Animem Uz Dublaj (Professional)",
    total_episodes: 12,
    views_count: 145200,
    is_trending: true,
    is_featured: true,
    episodes: [
      { episode_number: 1, title: "Men o'rganishim kerak", video_url: "https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4" },
      { episode_number: 2, title: "Ikkilamchi uyg'onish", video_url: "https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4" },
      { episode_number: 3, title: "Qasamyod", video_url: "https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4" },
    ]
  },
  {
    id: 2,
    title: "Jujutsu Kaisen: Sehrli Jang (2-mavsum)",
    original_title: "Jujutsu Kaisen Season 2",
    poster_url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&auto=format&fit=crop&q=80",
    description: "Satoru Gojo va Suguru Getoning o'tmishi hamda afsonaviy Shibuya hodisasi. Lanolatli ruhlar va sehrgarlar o'rtasidagi shafqatsiz kurash.",
    rating: 9.7,
    release_year: 2023,
    genres: ["Ekshn", "G'ayritabiiy", "Shonen"],
    status: "Tugallangan",
    type: "TV Serial",
    studio: "MAPPA",
    voice_acting: "Animem Uz Ovoz",
    total_episodes: 23,
    views_count: 230400,
    is_trending: true,
    is_featured: true,
    episodes: [
      { episode_number: 1, title: "Yashirin xazina", video_url: "https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4" },
      { episode_number: 2, title: "Shibuya boshlanishi", video_url: "https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4" }
    ]
  },
  {
    id: 3,
    title: "Demon Slayer: Kimetsu no Yaiba - Hashira Mashg'ulotlari",
    original_title: "Kimetsu no Yaiba: Hashira Geiko-hen",
    poster_url: "https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80",
    banner_url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80",
    description: "Muzan Kibutsujiga qarshi yakuniy jangga tayyorgarlik. Tanjirou va uning do'stlari afsonaviy ustunlar qo'lida qattiq mashg'ulot o'tashadi.",
    rating: 9.6,
    release_year: 2024,
    genres: ["Ekshn", "Tarixiy", "Drama"],
    status: "Tugallangan",
    type: "TV Serial",
    studio: "ufotable",
    voice_acting: "Animem Uz Dublaj",
    total_episodes: 8,
    views_count: 312000,
    is_trending: true,
    is_featured: false,
    episodes: [
      { episode_number: 1, title: "Muzan mag'lubiyati sari", video_url: "https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4" }
    ]
  },
  {
    id: 4,
    title: "Attack on Titan: Final Season (Titanlar Hujumi)",
    original_title: "Shingeki no Kyojin",
    poster_url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80",
    description: "Devorlar ortidagi haqiqat, ozodlik narxi va Eren Yegerning butun dunyo taqdirini o'zgartirgan qarori.",
    rating: 9.9,
    release_year: 2023,
    genres: ["Harbiy", "Drama", "Triller"],
    status: "Tugallangan",
    type: "TV Serial",
    studio: "MAPPA",
    voice_acting: "Animem Uz Dublaj",
    total_episodes: 28,
    views_count: 512000,
    is_trending: false,
    is_featured: false,
    episodes: [
      { episode_number: 1, title: "Dengiz orti", video_url: "https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4" }
    ]
  },
  {
    id: 5,
    title: "Chainsaw Man: Benzoarra Odam",
    original_title: "Chainsaw Man",
    poster_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
    description: "Denji o'zining sevimli iblis iti Pochita bilan birlashib, shafqatsiz iblis ovchisiga aylanadi.",
    rating: 9.4,
    release_year: 2022,
    genres: ["Qonli", "Qora komediya", "Ekshn"],
    status: "Tugallangan",
    type: "TV Serial",
    studio: "MAPPA",
    voice_acting: "Animem Uz Ovoz",
    total_episodes: 12,
    views_count: 189000,
    is_trending: true,
    is_featured: false,
    episodes: [
      { episode_number: 1, title: "Kuchukcha va Benzoarra", video_url: "https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4" }
    ]
  },
  {
    id: 6,
    title: "Spy x Family: Josus va Oila",
    original_title: "Spy x Family",
    poster_url: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&auto=format&fit=crop&q=80",
    description: "Maxfiy josus, professional qotil va fikrlarni o'qiydigan qizaloq — ular dunyoni qutqarish uchun bitta oila bo'lishlari kerak.",
    rating: 9.3,
    release_year: 2023,
    genres: ["Komediya", "Josuslik", "Kundalik hayot"],
    status: "Davom etmoqda",
    type: "TV Serial",
    studio: "Wit Studio / CloverWorks",
    voice_acting: "Animem Uz Dublaj",
    total_episodes: 25,
    views_count: 220000,
    is_trending: false,
    is_featured: false,
    episodes: [
      { episode_number: 1, title: "Operatsiya Strix", video_url: "https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4" }
    ]
  }
];

export async function fetchAnimes(): Promise<Anime[]> {
  try {
    const res = await fetch(`${API_BASE}/api/animes`);
    if (!res.ok) throw new Error('API server error');
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    return SAMPLE_FALLBACK_ANIMES;
  } catch (err) {
    console.warn("Backend /api/animes ga ulanib bo'lmadi, fallback ma'lumotlar ishlatilmoqda:", err);
    return SAMPLE_FALLBACK_ANIMES;
  }
}

export async function fetchAnimeById(id: string | number): Promise<Anime | null> {
  try {
    const res = await fetch(`${API_BASE}/api/animes/${id}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.id) return data;
    }
  } catch (e) {}

  // Fallback
  const found = SAMPLE_FALLBACK_ANIMES.find(a => String(a.id) === String(id));
  return found || SAMPLE_FALLBACK_ANIMES[0];
}

export async function askMikaAI(prompt: string, history: { role: string; text: string }[] = []): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/api/mika`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, history })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.reply) return data.reply;
    }
  } catch (e) {}

  // Fallback intelligent anime response
  const lower = prompt.toLowerCase();
  if (lower.includes('salom')) {
    return "Salom, anime muxlisi! ✨ Men Mika — Animem Uz ilovasining yordamchisiman. Sizga bugun qanday ajoyib anime topib beray?";
  }
  if (lower.includes('tavsiya') || lower.includes('maslahat') || lower.includes('nima ko')) {
    return "Albatta! Agar hayajonli janglar yoqsa — 'Solo Leveling' va 'Jujutsu Kaisen' ayni muddao! Agar ruhiy drama yoqsa — 'Attack on Titan'ni tomosha qilishingizni maslahat beraman. 🍿";
  }
  return "Juda qiziq savol! Men sizga Animem Uz orqali eng sara o'zbekcha tarjima animelarni topishda va tomosha qilishda bajonidil yordam beraman! 🌸";
}
