// Backend API configuration for Northflank & Vercel
export const NORTHFLANK_BACKEND_URL = 'https://p01--animem-beckend--jddxxkp4tz2g.code.run';

export const getApiBase = (): string => {
  // 1. If explicitly configured in environment (Vercel env or .env)
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/$/, '');
  }

  // 2. If running locally on localhost, use local relative origin
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return '';
    }
  }

  // 3. Production fallback to Northflank backend
  return NORTHFLANK_BACKEND_URL;
};

export const API_BASE = getApiBase();
