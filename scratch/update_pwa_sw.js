const fs = require('fs');
const path = require('path');

// ==========================================
// 1. UPDATE sw.js (PWA Cache v3.4.5)
// ==========================================
const swPath = path.join(__dirname, '..', 'sw.js');
const swContent = `/* ==========================================================================
   Towell Smart Maintenance AI (TSM-AI) - Service Worker (PWA)
   ========================================================================== */

const CACHE_NAME = 'tsmai-pwa-v3.4.5';
const ASSETS_TO_CACHE = [
  './',
  './index.html?v=3.4.5',
  './favicon.ico',
  './favicon.png',
  './apple-touch-icon.png',
  './style.css?v=3.4.5',
  './config.js?v=3.4.5',
  './agents-client.js?v=3.4.5',
  './app.js?v=3.4.5',
  './dashboard.js?v=3.4.5',
  './manifest.json?v=3.4.5',
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
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching app shell assets v3.4.5');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('[ServiceWorker] Asset cache warning:', err);
      });
    })
  );
});

// Activar Service Worker y limpiar de inmediato TODOS los cachés obsoletos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Purging old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptar peticiones (Network-First para APIs y archivos dinámicos)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignorar peticiones no GET o de Supabase
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
        return caches.match(req).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (req.headers.get('accept')?.includes('text/html')) {
            return caches.match('./index.html?v=3.4.5') || caches.match('./index.html') || caches.match('./');
          }
        });
      })
  );
});

// Notificaciones Push
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
`;
fs.writeFileSync(swPath, swContent, 'utf8');
console.log('✅ sw.js updated to v3.4.5 with strict cache purge.');

// ==========================================
// 2. UPDATE index.html (Head & SW registration)
// ==========================================
const indexPath = path.join(__dirname, '..', 'index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf8');

// Replace all v=3.4.4 with v=3.4.5
indexHtml = indexHtml.replace(/v=3\.4\.4/g, 'v=3.4.5');
indexHtml = indexHtml.replace(/v=3\.3\.6/g, 'v=3.4.5');

// Update in-head script to safely check both sessionStorage and localStorage without hiding portal on stale hashes
const oldHeadScript = `  <!-- Script In-Head de Transición Orgánica (Evita parpadeo de pantalla inicial si hay sesión activa) -->
  <script>
    (function() {
      try {
        const u = JSON.parse(localStorage.getItem('TSMAI_current_user') || 'null');
        const h = window.location.hash || '';
        const isStaff = u && (u.role === 'admin' || u.role === 'tech' || u.role === 'solicitante' || u.rol === 'SUPER_ADMINISTRADOR' || u.rol === 'MANTENIMIENTO' || u.rol === 'SOLICITANTE');
        if (isStaff || h.includes('#admin') || h.includes('#tech') || h.includes('#solicitante')) {
          const st = document.createElement('style');
          st.id = 'preload-hide-public';
          st.textContent = '#view-public-portal { display: none !important; }';
          document.head.appendChild(st);
        }
      } catch(e) {}
    })();
  </script>`;

const newHeadScript = `  <!-- Script In-Head de Transición Orgánica (Evita parpadeo de pantalla inicial si hay sesión activa) -->
  <script>
    (function() {
      try {
        const u = JSON.parse(sessionStorage.getItem('TSMAI_current_user') || localStorage.getItem('TSMAI_current_user') || 'null');
        const isStaff = u && (u.role === 'admin' || u.role === 'tech' || u.role === 'solicitante' || u.rol === 'SUPER_ADMINISTRADOR' || u.rol === 'MANTENIMIENTO' || u.rol === 'SOLICITANTE');
        if (isStaff) {
          const st = document.createElement('style');
          st.id = 'preload-hide-public';
          st.textContent = '#view-public-portal { display: none !important; }';
          document.head.appendChild(st);
        }
      } catch(e) {}
    })();
  </script>`;

if (indexHtml.includes(oldHeadScript)) {
  indexHtml = indexHtml.replace(oldHeadScript, newHeadScript);
  console.log('✅ In-head preload script updated.');
} else {
  console.warn('⚠️ in-head script exact match not found, checking regex...');
}

// Update SW registration in index.html
const oldSwReg = `    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js?v=3.4.5')
          .then(reg => console.log('✅ ServiceWorker registrado:', reg.scope))
          .catch(err => console.warn('⚠️ ServiceWorker error:', err));
      });
    }`;

const newSwReg = `    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js?v=3.4.5')
          .then(reg => {
            console.log('✅ ServiceWorker registrado v3.4.5:', reg.scope);
            reg.update();
          })
          .catch(err => console.warn('⚠️ ServiceWorker error:', err));
      });
    }`;

indexHtml = indexHtml.replace(oldSwReg, newSwReg);

fs.writeFileSync(indexPath, indexHtml, 'utf8');
console.log('✅ index.html updated to v3.4.5.');
