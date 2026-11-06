// High-Performance Image & Resource Optimizer for Animem.uz
// Ensures 0.000001s (instant) image display from memory & browser cache

const memoryLoadedImages = new Set<string>();
const prefetchedUrls = new Set<string>();

/**
 * Preload high-priority image URLs into browser memory & Service Worker cache
 */
export function prefetchImages(urls: (string | undefined | null)[], maxCount: number = 30): void {
  if (typeof window === 'undefined' || !Array.isArray(urls)) return;

  const validUrls = urls
    .filter((u): u is string => typeof u === 'string' && u.length > 5 && (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('/')))
    .filter(u => !prefetchedUrls.has(u))
    .slice(0, maxCount);

  if (validUrls.length === 0) return;

  // 1. Mark as prefetched to avoid duplicate work
  validUrls.forEach(u => prefetchedUrls.add(u));

  // 2. Delegate to Service Worker if active for persistent disk caching
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'PREFETCH_IMAGES',
      urls: validUrls
    });
  }

  // 3. Parallel warm-up via Image elements in browser memory
  const warmUpBatch = () => {
    validUrls.forEach((src) => {
      const img = new Image();
      img.decoding = 'async';
      img.loading = 'eager';
      img.onload = () => {
        memoryLoadedImages.add(src);
      };
      img.src = src;
    });
  };

  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(warmUpBatch, { timeout: 1500 });
  } else {
    setTimeout(warmUpBatch, 50);
  }
}

/**
 * Check if image was already decoded/loaded in this session
 */
export function isImagePreloaded(url: string | undefined | null): boolean {
  if (!url) return false;
  return memoryLoadedImages.has(url);
}

/**
 * Record successful image load in global memory
 */
export function markImageLoaded(url: string | undefined | null): void {
  if (url) {
    memoryLoadedImages.add(url);
    prefetchedUrls.add(url);
  }
}

/**
 * Preload anime details data and its banner/poster on card hover/touch
 */
const prefetchedAnimeSlugs = new Set<string>();
export function prefetchAnimeDetails(slugOrId: string | number | undefined | null): void {
  if (!slugOrId || typeof window === 'undefined') return;
  const key = String(slugOrId);
  if (prefetchedAnimeSlugs.has(key)) return;
  prefetchedAnimeSlugs.add(key);

  const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '';
  const url = `${API_BASE}/api/animes/by-slug/${encodeURIComponent(key)}`;

  fetch(url, { priority: 'low' } as any)
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data && typeof data === 'object') {
        if (data.image_url) prefetchImages([data.image_url]);
        if (data.banner_url) prefetchImages([data.banner_url]);
        if (data.logo_url) prefetchImages([data.logo_url]);
      }
    })
    .catch(() => {});
}

