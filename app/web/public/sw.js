const CACHE_NAME = 'nutriai-offline-v2';
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(OFFLINE_URL).then((cached) => cached || new Response('Offline', { status: 503 }))
    )
  );
});

// ─── Web Push ────────────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch (_e) {
    payload = { title: 'NutryAI', body: event.data.text() };
  }

  const title = payload.title || 'NutryAI Diary';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/icon-192x192.png',
    tag: payload.tag,
    renotify: true,
    data: payload.data || {},
    requireInteraction: false,
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      (async () => {
        if ('setAppBadge' in self.navigator) {
          try {
            const existing = await self.registration.getNotifications();
            await self.navigator.setAppBadge(existing.length + 1);
          } catch (_e) {
            // ignore
          }
        }
      })(),
    ])
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url =
    (event.notification.data && event.notification.data.url) || '/coaching/chat';

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const c of all) {
        if (c.url.includes(self.location.origin)) {
          await c.focus();
          c.postMessage({
            type: 'notification_click',
            data: event.notification.data || {},
          });
          if ('navigate' in c) {
            try {
              await c.navigate(url);
            } catch (_e) {
              // ignore
            }
          }
          return;
        }
      }
      await self.clients.openWindow(url);
    })()
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager.getSubscription().then((sub) => {
      if (!sub) {
        return self.clients.matchAll().then((cs) =>
          cs.forEach((c) =>
            c.postMessage({ type: 'push_subscription_changed' })
          )
        );
      }
    })
  );
});
