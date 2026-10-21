export interface Episode {
  id?: number | string;
  episode_number: number;
  title?: string;
  video_url: string;
  video_urls?: {
    quality: string;
    url: string;
  }[];
  thumbnail?: string;
  duration?: number;
  duration_formatted?: string;
  watched?: boolean;
  progress_seconds?: number;
}

export interface Anime {
  id: number | string;
  title: string;
  original_title?: string;
  slug?: string;
  poster_url: string;
  banner_url?: string;
  description?: string;
  rating?: number | string;
  release_year?: number | string;
  genres?: string[] | string;
  status?: 'Davom etmoqda' | 'Tugallangan' | 'Kutilmoqda' | string;
  type?: 'TV Serial' | 'Film' | 'OVA' | 'ONA' | string;
  season?: string;
  studio?: string;
  voice_acting?: string; // e.g. "Animem Uz Dublaj"
  total_episodes?: number;
  views_count?: number;
  is_trending?: boolean;
  is_featured?: boolean;
  episodes?: Episode[];
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
