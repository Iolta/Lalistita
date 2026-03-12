// ═══════════════════════════════════════
// ListaGo — Service Worker v1.0
// Maneja notificaciones en background
// ═══════════════════════════════════════

const CACHE_NAME = 'listago-v1';
const ASSETS = ['/', '/index.html', '/manifest.json'];

// ── Install: cachear archivos
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: limpiar caches viejos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: servir desde cache si está disponible
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// ── Recibir mensaje de la app principal
self.addEventListener('message', e => {
  if (e.data?.type === 'NOTIFY_NEARBY') {
    const { listName, listEmoji, placeName, items } = e.data;
    const body = items.slice(0, 4).join('\n') + (items.length > 4 ? `\n…y ${items.length - 4} más` : '');

    self.registration.showNotification(`${listEmoji} ${listName} cerca`, {
      body: `📍 ${placeName}\n${body}`,
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      tag: `listago-${listName}`,
      renotify: true,
      requireInteraction: false,
      vibrate: [200, 100, 200],
      data: { listName, url: '/index.html' },
      actions: [
        { action: 'open', title: 'Ver lista' },
        { action: 'dismiss', title: 'Ignorar' }
      ]
    });
  }
});

// ── Click en notificación
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('index.html') && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow('/index.html');
    })
  );
});

// ── Background sync (por si acaso)
self.addEventListener('sync', e => {
  if (e.tag === 'check-location') {
    console.log('[SW] Background sync triggered');
  }
});
