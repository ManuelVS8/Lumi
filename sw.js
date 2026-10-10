// Service worker de Mi Mascota
// Cambia VERSION cada vez que subas cambios importantes para forzar la actualización.
const VERSION = 'mascota-v3';
const CORE = [
  './mascota.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('mascota-') && k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Comprobación de versión de la app: siempre directa a la red, sin tocar la caché
  if (url.searchParams.has('nocache')) return;

  // Página: primero la red (para recibir las actualizaciones) y, sin conexión, la copia guardada
  if (req.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' })
        .then(res => { if (!res.ok) throw new Error(res.status); const copy = res.clone(); caches.open(VERSION).then(c => c.put('./mascota.html', copy)); return res; })
        .catch(() => caches.match('./mascota.html'))
    );
    return;
  }

  // Iconos, manifiesto y fuente de Google: primero la copia guardada y se actualiza en segundo plano
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (sameOrigin || isFont) {
    e.respondWith(
      caches.match(req).then(cached => {
        const net = fetch(req)
          .then(res => { if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return res; })
          .catch(() => cached);
        return cached || net;
      })
    );
  }
});
