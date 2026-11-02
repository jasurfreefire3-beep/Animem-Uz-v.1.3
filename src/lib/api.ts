// Backend API configuration for Northflank & Vercel
export const NORTHFLANK_BACKEND_URL = 'https://site--anime--jpdsl9nq68nb.code.run';

export const getApiBase = (): string => {
  // 1. If explicitly configured in environment
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/$/, '');
  }

  // 2. Default to same-origin (on Vercel, vercel.json rewrites /api/* to Northflank)
  return '';
};

export const API_BASE = getApiBase();

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

  // 3. In production (e.g. Vercel), connect WebSockets directly to Northflank
  return NORTHFLANK_BACKEND_URL;
};
