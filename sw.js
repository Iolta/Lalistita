const CACHE_NAME = 'lalistita-v5';
const STATIC_ASSETS = ['/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Nunca cachear el HTML — siempre traer fresco de la red
  if (e.request.url.endsWith('.html') || e.request.url.endsWith('/')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

self.addEventListener('message', e => {
  if (e.data?.type === 'NOTIFY_NEARBY') {
    const { listName, listEmoji, placeName, items } = e.data;
    const body = items.slice(0, 4).join('\n') + (items.length > 4 ? `\n…y ${items.length - 4} más` : '');
    self.registration.showNotification(`${listEmoji} ${listName} cerca`, {
      body: `📍 ${placeName}\n${body}`,
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      tag: `lalistita-${listName}`,
      renotify: true,
      vibrate: [200, 100, 200],
      data: { listName, url: '/index.html' },
      actions: [
        { action: 'open', title: 'Ver lista' },
        { action: 'dismiss', title: 'Ignorar' }
      ]
    });
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});
