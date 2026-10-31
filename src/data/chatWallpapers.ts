export interface ChatWallpaper {
  id: string;
  name: string;
  url: string;
  thumbnail: string;
  category?: string;
}

export const CHAT_WALLPAPERS: ChatWallpaper[] = [
  {
    id: 'wp-1',
    name: 'Cyberpunk Girl',
    url: 'https://i.pinimg.com/736x/db/70/40/db7040af32ad811a08f32cbf620a5607.jpg',
    thumbnail: 'https://i.pinimg.com/736x/db/70/40/db7040af32ad811a08f32cbf620a5607.jpg',
    category: 'Cyberpunk'
  },
  {
    id: 'wp-2',
    name: 'Anime City Sunset',
    url: 'https://i.pinimg.com/736x/b0/27/20/b0272011d1b4eed21058e5bd79463f47.jpg',
    thumbnail: 'https://i.pinimg.com/736x/b0/27/20/b0272011d1b4eed21058e5bd79463f47.jpg',
    category: 'Manzara'
  },
  {
    id: 'wp-3',
    name: 'Neon Samurai',
    url: 'https://i.pinimg.com/1200x/87/74/b5/8774b5fbcf0d15e41d699cee6409b15e.jpg',
    thumbnail: 'https://i.pinimg.com/1200x/87/74/b5/8774b5fbcf0d15e41d699cee6409b15e.jpg',
    category: 'Samuray'
  },
  {
    id: 'wp-4',
    name: 'Dark Aesthetic',
    url: 'https://i.pinimg.com/736x/c1/25/e1/c125e12dfececa22ba20f09e9ca89f7a.jpg',
    thumbnail: 'https://i.pinimg.com/736x/c1/25/e1/c125e12dfececa22ba20f09e9ca89f7a.jpg',
    category: 'Qorong\'u'
  },
  {
    id: 'wp-5',
    name: 'Anime Night Rain',
    url: 'https://i.pinimg.com/736x/a3/62/51/a3625118bf0651d55402f02be36a4a51.jpg',
    thumbnail: 'https://i.pinimg.com/736x/a3/62/51/a3625118bf0651d55402f02be36a4a51.jpg',
    category: 'Yomg\'ir'
  },
  {
    id: 'wp-6',
    name: 'Fantasy Sky',
    url: 'https://i.pinimg.com/736x/76/28/c1/7628c1371c15b953b5047ee8f4e9de36.jpg',
    thumbnail: 'https://i.pinimg.com/736x/76/28/c1/7628c1371c15b953b5047ee8f4e9de36.jpg',
    category: 'Fantastika'
  },
  {
    id: 'wp-7',
    name: 'Purple Glow Girl',
    url: 'https://i.pinimg.com/736x/0c/85/f5/0c85f5ead160afa8fd2df7b671002597.jpg',
    thumbnail: 'https://i.pinimg.com/736x/0c/85/f5/0c85f5ead160afa8fd2df7b671002597.jpg',
    category: 'Neon'
  },
  {
    id: 'wp-8',
    name: 'Cyber Sakura',
    url: 'https://i.pinimg.com/1200x/f7/b5/9a/f7b59a2652e97d0cc2337182e330d07e.jpg',
    thumbnail: 'https://i.pinimg.com/1200x/f7/b5/9a/f7b59a2652e97d0cc2337182e330d07e.jpg',
    category: 'Sakura'
  },
  {
    id: 'wp-9',
    name: 'Red Moon Warrior',
    url: 'https://i.pinimg.com/736x/a5/76/b5/a576b5aaf271d48089832d34f755a07e.jpg',
    thumbnail: 'https://i.pinimg.com/736x/a5/76/b5/a576b5aaf271d48089832d34f755a07e.jpg',
    category: 'Qizil Oy'
  },
  {
    id: 'wp-10',
    name: 'Retro Neon City',
    url: 'https://i.pinimg.com/736x/91/6f/dc/916fdc7dd116fea76cd1101b4c9f1a63.jpg',
    thumbnail: 'https://i.pinimg.com/736x/91/6f/dc/916fdc7dd116fea76cd1101b4c9f1a63.jpg',
    category: 'Shahar'
  },
  {
    id: 'wp-11',
    name: 'Anime Horizon',
    url: 'https://i.pinimg.com/736x/69/3a/88/693a88ff2cd13901878ed0279b6f6697.jpg',
    thumbnail: 'https://i.pinimg.com/736x/69/3a/88/693a88ff2cd13901878ed0279b6f6697.jpg',
    category: 'Ufq'
  }
];

export const DEFAULT_WALLPAPER_URL = CHAT_WALLPAPERS[0].url;

export const getSavedChatWallpaper = (): string => {
  try {
    const saved = localStorage.getItem('animem_chat_wallpaper');
    if (saved !== null) return saved;
  } catch (e) {}
  return DEFAULT_WALLPAPER_URL;
};

export const saveChatWallpaper = (url: string) => {
  try {
    localStorage.setItem('animem_chat_wallpaper', url);
    window.dispatchEvent(new CustomEvent('animem_chat_wallpaper_changed', { detail: { url } }));
  } catch (e) {}
};

export const getSavedWallpaperDim = (): number => {
  try {
    const saved = localStorage.getItem('animem_chat_wallpaper_dim');
    if (saved !== null) {
      const val = parseFloat(saved);
      if (!isNaN(val) && val >= 0.2 && val <= 0.95) return val;
    }
  } catch (e) {}
  return 0.72; // 72% dark glass by default for crisp reading
};

export const saveWallpaperDim = (dim: number) => {
  try {
    localStorage.setItem('animem_chat_wallpaper_dim', String(dim));
    window.dispatchEvent(new CustomEvent('animem_chat_wallpaper_dim_changed', { detail: { dim } }));
  } catch (e) {}
};

