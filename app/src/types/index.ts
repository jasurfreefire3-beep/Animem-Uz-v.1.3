export interface Episode {
  id?: number | string;
  anime_id?: number | string;
  episode_number: number;
  title?: string | null;
  duration?: string | number;
  duration_formatted?: string;
  video_url: string;
  server_name?: string;
  backup_video_url?: string;
  telegram_video_id?: string;
  thumbnail_url?: string;
  is_filler?: boolean | number;
  created_at?: string;
}

export interface Anime {
  id: number | string;
  title: string;
  title_uz?: string;
  title_orig?: string;
  title_en?: string;
  slug?: string;
  description?: string;
  image_url?: string;
  poster_url: string;
  banner_url?: string;
  season?: string;
  holati?: string;
  status?: string;
  yil?: number | string | null;
  release_year?: number | string | null;
  qismlar_soni?: number;
  episodes_count?: number;
  current_episodes?: number;
  rating?: number | string;
  rating_count?: number;
  korishlar?: number;
  views?: number;
  views_count?: number;
  tavsiya?: boolean | number;
  is_featured?: boolean | number;
  is_banner?: boolean | number;
  type?: string;
  age_rating?: string;
  janrlar?: string[] | string;
  genres?: string[] | string;
  studiyasi?: string;
  studio?: string;
  duration?: string;
  dub_studio?: string;
  voice_acting?: string;
  telegram_url?: string;
  video_url?: string;
  tags?: string;
  is_trending?: boolean;
  episodes?: Episode[];
}

export const GENRE_MAP: Record<string, string> = {
  'Action': 'Jangari',
  'Adventure': 'Sarguzasht',
  'Comedy': 'Komediya',
  'Drama': 'Drama',
  'Fantasy': 'Fantastika',
  'Horror': 'Dahshatli',
  'Romance': 'Romantika',
  'Sci-Fi': 'Ilmiy-fantastika',
  'Slice of Life': 'Kundalik hayot',
  'Supernatural': 'G\'ayritabiiy'
};

export const SITE_GENRES = [
  'Barchasi',
  'Jangari',
  'Sarguzasht',
  'Fantastika',
  'Komediya',
  'Drama',
  'Romantika',
  'Dahshatli',
  'Ilmiy-fantastika',
  'Kundalik hayot',
  'G\'ayritabiiy'
];

export function translateGenre(genre: string): string {
  if (!genre || typeof genre !== 'string') return '';
  const normalized = genre.trim();
  for (const [eng, uzb] of Object.entries(GENRE_MAP)) {
    if (eng.toLowerCase() === normalized.toLowerCase()) return uzb;
    if (uzb.toLowerCase() === normalized.toLowerCase()) return uzb;
  }
  return normalized;
}

export function getEnglishGenre(genre: string): string {
  if (!genre || typeof genre !== 'string') return '';
  const normalized = genre.trim();
  for (const [eng, uzb] of Object.entries(GENRE_MAP)) {
    if (uzb.toLowerCase() === normalized.toLowerCase()) return eng;
    if (eng.toLowerCase() === normalized.toLowerCase()) return eng;
  }
  return normalized;
}

export function animeMatchesGenre(anime: Anime, targetGenre: string): boolean {
  if (!targetGenre || targetGenre === 'Barchasi' || targetGenre === 'Hammasi') return true;
  const eng = getEnglishGenre(targetGenre).toLowerCase();
  const uzb = translateGenre(targetGenre).toLowerCase();
  const rawJanrlar = (anime.janrlar || anime.genres || '').toString().toLowerCase();
  return rawJanrlar.includes(eng) || rawJanrlar.includes(uzb);
}

export function formatGenresList(genresInput?: string[] | string): string {
  if (!genresInput) return 'Anime';
  if (Array.isArray(genresInput)) {
    return genresInput.map(translateGenre).join(', ');
  }
  return genresInput
    .split(',')
    .map(g => translateGenre(g.trim()))
    .filter(Boolean)
    .join(', ');
}

export interface User {
  id: number | string;
  name: string;
  email?: string;
  role?: string;
  avatar_url?: string;
  banner_url?: string;
  avatar_frame_url?: string;
  bio?: string;
  level?: number;
  xp?: number;
  coins?: number;
  favorites?: any[];
  watch_history?: any[];
}

export interface Reel {
  id: string | number;
  anime_title: string;
  video_url: string;
  poster_url?: string;
  caption: string;
  likes: number;
  comments_count: number;
  anime_id?: number | string;
}

export interface Comment {
  id: string | number;
  user_name: string;
  user_avatar?: string;
  text: string;
  created_at: string;
  likes_count?: number;
}
