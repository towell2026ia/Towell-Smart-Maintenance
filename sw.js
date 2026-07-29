/* ==========================================================================
   Towell Smart Maintenance AI (TSM-AI) - Service Worker (PWA)
   ========================================================================== */

const CACHE_NAME = 'tsmai-pwa-v2.7.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './dashboard.html',
  './favicon.ico',
  './favicon.png',
  './apple-touch-icon.png',
  './style.css?v=2.7.0',
  './config.js?v=2.7.0',
  './app.js?v=2.7.0',
  './dashboard.js?v=2.7.0',
  './manifest.json?v=2.7.0',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/favicon-64.png',
  './images/logo.png',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
];

// Instalar Service Worker y cachear recursos estáticos shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching app shell assets');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('[ServiceWorker] Some assets failed to cache on install:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activar Service Worker y limpiar cachés obsoletas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptar peticiones (Estrategia Network-First con fallback a Caché para estáticos)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignorar peticiones que no sean GET o que sean de APIs de Supabase/Ext (usar red siempre)
  if (req.method !== 'GET' || url.hostname.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    fetch(req)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // En caso de estar Offline, devolver desde caché
        return caches.match(req).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (req.headers.get('accept')?.includes('text/html')) {
            return caches.match('./index.html');
          }
        });
      })
  );
});

// Escuchar notificaciones Push (Alertas de mantenimiento)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Alerta TSM-AI', body: 'Nueva notificación de planta.' };
  const options = {
    body: data.body || 'Alerta de mantenimiento industrial.',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    }
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'TSM-AI Alerta', options)
  );
});
