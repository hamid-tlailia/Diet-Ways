// Diet Ways service worker: offline app shell + push notifications.
const CACHE = 'diet-ways-v7';
const SHELL = ['/', '/index.html', '/favicon.svg', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/badge-96.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) return;

  // Pages: network first so updates show up, cache when offline.
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html')),
    );
    return;
  }
  // Hashed assets, fonts, icons: cache first.
  const net = () => fetch(request).catch(() => new Promise((r) => setTimeout(r, 800)).then(() => fetch(request)));
  e.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        net().then((res) => {
          if (res.ok && (url.origin === location.origin || url.hostname.endsWith('gstatic.com') || url.hostname.endsWith('googleapis.com'))) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        }),
    ),
  );
});

self.addEventListener('push', (e) => {
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch {
    data = { title: 'Diet Ways', body: e.data?.text() };
  }
  e.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      clients.forEach((c) => c.postMessage({ type: 'push', payload: data }));
      await self.registration.showNotification(data.title || 'Diet Ways', {
        body: data.body,
        icon: '/icon-192.png',
        badge: '/badge-96.png',
        tag: data.kind === 'coach' ? 'coach' : `fast-${data.kind}`,
        data,
      });
    })(),
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((list) => {
      if (list.length) return list[0].focus();
      return self.clients.openWindow('/');
    }),
  );
});
