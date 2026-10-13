// Offline support: cache the app shell, fall back to network for everything else.
const CACHE = 'car-service-v2';
const SHELL = [
  './', 'index.html', 'css/styles.css', 'manifest.webmanifest',
  'js/app.js', 'js/data.js', 'js/db.js', 'js/parse.js', 'js/schedule.js', 'js/essentials.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin === location.origin) {
    // Network first so updates show up, cache as offline fallback.
    e.respondWith(
      fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy));
        return res;
      }).catch(() => caches.match(request, { ignoreSearch: true }).then((r) => r || caches.match('index.html')))
    );
  } else if (url.hostname === 'cdn.jsdelivr.net' || url.hostname.endsWith('tessdata.projectnaptha.com')) {
    // Text-reader library and language data: cache after first download.
    e.respondWith(caches.match(request).then((hit) => hit || fetch(request).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); }
      return res;
    })));
  }
});
