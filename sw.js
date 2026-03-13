const CACHE_NAME = 'lalistita-v8';

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

self.addEventListener('fetch', e => {
  e.respondWith(fetch(e.request).catch(() => new Response('offline')));
});

self.addEventListener('message', e => {
  if (e.data?.type === 'NOTIFY_NEARBY') {
    const { listName, listEmoji, placeName, placeId, listId, items, speakText } = e.data;
    const body = items.slice(0, 4).join('\n') + (items.length > 4 ? `\n…y ${items.length - 4} más` : '');
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName)}${placeId ? '&query_place_id=' + placeId : ''}`;

    e.waitUntil(
      self.registration.showNotification(`${listEmoji} ${listName} cerca`, {
        body: `📍 ${placeName}\n${body}`,
        icon: 'icon-192.png',
        badge: 'icon-192.png',
        tag: `lalistita-${listId}`,
        renotify: true,
        silent: false,
        data: { scope: self.registration.scope, mapsUrl, listId },
        actions: [
          { action: 'ir', title: 'Ir →' },
          { action: 'ver', title: 'Ver lista' }
        ]
      })
    );
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const { scope, mapsUrl, listId } = e.notification.data || {};

  if (e.action === 'ir' && mapsUrl) {
    e.waitUntil(clients.openWindow(mapsUrl));
    return;
  }

  // 'ver' o click directo — abrir/enfocar la app
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // Buscar una ventana de la app ya abierta
      const appClient = list.find(c => c.url.includes('Lalistita'));
      if (appClient) {
        appClient.focus();
        if (listId) appClient.postMessage({ type: 'SWITCH_LIST', listId });
        return;
      }
      // Si no está abierta, abrirla
      return clients.openWindow(scope || '/Lalistita/');
    })
  );
});
