// Animem.uz Service Worker for Device Push Notifications & Offline Image/Asset Cache
// Guarantees 0ms instant image loading from local cache when scrolling up/down

const APP_ICON = 'https://api.animem.uz/api/images/1788100529230_au9wggu';
const IMAGE_CACHE = 'animem-images-v3';
const STATIC_CACHE = 'animem-static-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== IMAGE_CACHE && key !== STATIC_CACHE) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Cache-First interceptor for Images & Assets (Zero re-fetching on scroll)
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 1. Anime posters, banners, avatars, thumbnails & covers
  const isImage = 
    request.destination === 'image' ||
    /\.(jpe?g|png|webp|avif|gif|svg)(\?.*)?$/i.test(url.pathname) ||
    url.pathname.includes('/api/images/') ||
    url.hostname.includes('anihub.top') ||
    url.hostname.includes('static.yani.tv') ||
    url.hostname.includes('code.run');

  if (isImage) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        // A. Instant return from disk/RAM cache (0ms)
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // B. Fetch once from network, clone and save in cache
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          return cachedResponse || new Response('', { status: 408 });
        }
      })
    );
    return;
  }

  // 2. Static Vite JS & CSS chunks
  const isStaticAsset = 
    url.pathname.startsWith('/assets/') ||
    /\.(js|css|woff2?|ttf|eot)(\?.*)?$/i.test(url.pathname);

  if (isStaticAsset) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) {
          // Revalidate in background (stale-while-revalidate)
          fetch(request).then((res) => {
            if (res && res.status === 200) {
              cache.put(request, res.clone());
            }
          }).catch(() => {});
          return cached;
        }

        try {
          const res = await fetch(request);
          if (res && res.status === 200) {
            cache.put(request, res.clone());
          }
          return res;
        } catch (err) {
          return cached || new Response('', { status: 408 });
        }
      })
    );
  }
});

// Handle Push event from server (Web Push API - runs even when site is closed)
self.addEventListener('push', (event) => {
  let data = {
    title: 'Animem.uz | Yangi Anime',
    body: "Animem.uz saytida yangi o'zbek tilidagi animelar va qismlar joylandi!",
    icon: APP_ICON,
    badge: APP_ICON,
    image: undefined,
    data: { url: '/' }
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
      if (parsed.data && parsed.data.url) {
        data.data = parsed.data;
      } else if (parsed.url) {
        data.data = { url: parsed.url };
      }
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || APP_ICON,
    badge: data.badge || APP_ICON,
    image: data.image || undefined,
    data: data.data || { url: '/' },
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || `animem-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    actions: [
      { action: 'open', title: "Tomosha qilish 🎬" },
      { action: 'close', title: 'Yopish ✕' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle click on notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window tab with Animem.uz is already open, focus and navigate it
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url.includes(self.location.origin)) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Periodic background sync if supported
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-new-animes') {
    event.waitUntil(
      fetch('/api/notifications')
        .then(res => res.json())
        .then(notifs => {
          if (notifs && notifs.length > 0) {
            const latest = notifs[0];
            self.registration.showNotification("Animem.uz | Yangi Premyera", {
              body: latest.message,
              icon: APP_ICON,
              badge: APP_ICON,
              image: latest.image || undefined,
              data: { url: '/' }
            });
          }
        })
        .catch(() => {})
    );
  }
});
