/* =========================================================
   DocSafe 2.4.0 - Service Worker & Motor PWA
   Sello: medbasha
   ========================================================= */

const CACHE_NAME = 'docsafe-v2.4.0';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './sw.js',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// 1. INSTALACIÓN Y CACHÉ INICIAL
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 2. ACTIVACIÓN Y LIMPIEZA DE CACHÉS ANTIGUAS
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. CAPTURA DE COMPARTIR INTERCEPTANDO EL POST Y REDIRIGIENDO AL INSTANTE
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === 'POST') {
    event.respondWith(
      (async () => {
        try {
          const formData = await event.request.formData();
          const sharedFile = formData.get('shared_file') || formData.get('file') || formData.get('document');

          if (sharedFile) {
            const cache = await caches.open('docsafe-share');
            await cache.put(
              '/shared-file',
              new Response(sharedFile, {
                headers: {
                  'Content-Type': sharedFile.type || 'application/octet-stream',
                  'X-File-Name': encodeURIComponent(sharedFile.name || 'Doc_Recibido'),
                },
              })
            );
          }
        } catch (err) {
          console.error("Error procesando archivo compartido:", err);
        }

        return Response.redirect('./index.html?shared=1', 303);
      })()
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// 4. GESTIÓN DE NOTIFICACIONES PUSH Y CLICS
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./index.html');
      }
    })
  );
});
