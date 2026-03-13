const CACHE_NAME = 'lalistita-v7';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// No caching — always fetch fresh
self.addEventListener('fetch', e => {
  e.respondWith(fetch(e.request).catch(() => new Response('offline')));
});

self.addEventListener('message', e => {
  if (e.data?.type === 'NOTIFY_NEARBY') {
    const { listName, listEmoji, placeName, items, speakText } = e.data;
    const body = items.slice(0, 4).join('\n') + (items.length > 4 ? `\n…y ${items.length - 4} más` : '');

    e.waitUntil(
      self.registration.showNotification(`${listEmoji} ${listName} cerca`, {
        body: `📍 ${placeName}\n${body}`,
        icon: 'icon-192.png',
        badge: 'icon-192.png',
        tag: `lalistita-${listName}`,
        renotify: true,
        vibrate: [300, 100, 300, 100, 300],
        silent: false,
        data: { url: self.registration.scope, speakText },
        actions: [
          { action: 'open', title: 'Ver lista' },
          { action: 'dismiss', title: 'Ignorar' }
        ]
      }).then(() => {
        // Relay speak message to page if open
        return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      }).then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SPEAK', text: speakText });
        });
      })
    );
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length) return list[0].focus();
      return clients.openWindow(self.registration.scope);
    })
  );
});
