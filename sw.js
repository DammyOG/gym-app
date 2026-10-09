// Stale-while-revalidate: serve from cache instantly, refresh the cache in the background.
const CACHE = 'rep-v1';
const SHELL = ['./', 'index.html', 'style.css', 'plan.js', 'app.js', 'exercises.json', 'manifest.json', 'icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request);
    const net = fetch(e.request).then(r => {
      if (r.ok) c.put(e.request, r.clone());
      return r;
    }).catch(() => hit || Response.error());
    e.waitUntil(net.catch(() => {}));
    return hit || net;
  }));
});
