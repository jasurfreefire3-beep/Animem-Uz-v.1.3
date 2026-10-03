// Backend API configuration for Northflank & Vercel
export const NORTHFLANK_BACKEND_URL = 'https://p01--animem-beckend--jddxxkp4tz2g.code.run';

export const getApiBase = (): string => {
  // 1. If running in browser on animem.uz or localhost, use native edge API directly
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.includes('animem.uz') || hostname === 'localhost' || hostname === '127.0.0.1') {
      return '';
    }
  }

  // 2. If explicitly configured in environment (and not dead code.run)
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0 && !envUrl.includes('code.run')) {
    return envUrl.trim().replace(/\/$/, '');
  }

  // 3. Default to same-origin
  return '';
};

export const API_BASE = getApiBase();
