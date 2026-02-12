
const CACHE_NAME = 'klect-ops-tactical-v2';
const SHARE_CACHE_NAME = 'klect-shared-assets';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
  'https://esm.sh/recharts@^3.7.0',
  'https://esm.sh/lucide-react@^0.563.0',
  'https://esm.sh/@google/genai@^1.39.0'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching tactical assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== SHARE_CACHE_NAME) {
            console.log('[SW] Purging legacy cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Handle Web Share Target POST request
  if (event.request.method === 'POST' && url.searchParams.has('share-target')) {
    event.respondWith(
      (async () => {
        const formData = await event.request.formData();
        const mediaFiles = formData.getAll('media');
        
        if (mediaFiles.length > 0) {
          const cache = await caches.open(SHARE_CACHE_NAME);
          // Clear previous shared assets
          const keys = await cache.keys();
          await Promise.all(keys.map(k => cache.delete(k)));
          
          // Store new shared assets
          for (let i = 0; i < mediaFiles.length; i++) {
            const file = mediaFiles[i];
            if (file instanceof File) {
              const response = new Response(file, {
                headers: { 'Content-Type': file.type }
              });
              await cache.put(`/shared-media-${i}`, response);
            }
          }
        }
        
        // Redirect to root with shared flag to trigger processing
        return Response.redirect('./?shared-assets-ready=true', 303);
      })()
    );
    return;
  }

  // Skip caching for API calls (Gemini, Google) to ensure fresh intel
  if (event.request.url.includes('generativelanguage.googleapis.com') || 
      event.request.url.includes('google.com/maps') ||
      event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});
