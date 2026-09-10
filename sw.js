/* Bakebook with a playful animated bagel baker.
   Bagel Log service worker — offline app shell.
   Bump CACHE when you edit index.html so phones pick the new build up. */
const CACHE = 'bagel-log-v10';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './bakebook.css',
  './assets/mascot.png',
  './assets/fraunces.ttf',
  './assets/home.svg',
  './assets/chart-bar.svg',
  './assets/settings.svg',
  './assets/plus.svg',
  './assets/camera.svg',
  './assets/photo.svg',
  './assets/star.svg',
  './assets/x.svg',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Add one at a time: a single missing icon must not fail the whole install.
    await Promise.all(ASSETS.map(url => cache.add(url).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => k === CACHE ? null : caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: network first so a fresh deploy lands, cache as the offline floor.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put('./index.html', fresh.clone());
        return fresh;
      } catch (e) {
        return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }

  // Everything else: cache first, refill in the background.
  event.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    try {
      const fresh = await fetch(req);
      if (fresh && fresh.ok && fresh.type === 'basic') {
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
      }
      return fresh;
    } catch (e) {
      return Response.error();
    }
  })());
});
