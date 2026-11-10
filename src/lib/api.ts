// Backend API configuration for Wasmer Edge & Vercel
export const WASMER_BACKEND_URL = 'https://jasurfreefire3.wasmer.app';
export const NORTHFLANK_BACKEND_URL = WASMER_BACKEND_URL;

export const getApiBase = (): string => {
  // 1. If explicitly configured in environment
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/$/, '');
  }

  // 2. Default to same-origin (on Vercel, vercel.json rewrites /api/* to Wasmer)
  return '';
};

export const API_BASE = getApiBase();

/**
 * Normalizes media URLs for seamless cross-platform display on Vercel and Wasmer.
 * Fixes broken image.animem.uz links by routing through API proxy or Catbox CDN.
 */
export const normalizeMediaUrl = (url: string | null | undefined): string => {
  if (!url || typeof url !== 'string') return '';
  let clean = url.trim();
  if (clean.includes('image.animem.uz/api/media/')) {
    clean = clean.replace('https://image.animem.uz/api/media/', `${API_BASE}/api/media/`);
  } else if (clean.startsWith('https://image.animem.uz/')) {
    const fn = clean.replace('https://image.animem.uz/', '');
    clean = `https://files.catbox.moe/${fn}`;
  }
  return clean;
};

export const getSocketUrl = (): string => {
  // 1. If explicitly configured in environment
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/$/, '');
  }

  // 2. Local development on machine
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return window.location.origin;
    }
  }

  // 3. In production (e.g. Vercel), connect WebSockets directly to Wasmer Edge
  return WASMER_BACKEND_URL;
};
