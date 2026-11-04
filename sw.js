/* Santa Shortlist TV: keeps the TV page, the game file and the fonts on the TV so the game still plays if the wifi drops. */
const V = 'sl-tv-v1';
const CORE = ['tv.html', 'game-core.js'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(CORE).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
function swr(req) {
  return caches.open(V).then(c => c.match(req).then(hit => {
    const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
}
function netFirst(req) {
  return caches.open(V).then(c => fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => c.match(req)));
}
function cacheFirst(req) {
  return caches.open(V).then(c => c.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; })));
}
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.hostname.endsWith('gstatic.com') || u.hostname.endsWith('googleapis.com')) {
    if (u.hostname === 'firestore.googleapis.com') return;
    e.respondWith(swr(r)); return;
  }
  if (u.origin !== location.origin) return;
  if (/game-meta\.json$/.test(u.pathname)) { e.respondWith(netFirst(r)); return; }
  if (/\/game-[^/]+\.json$/.test(u.pathname)) { e.respondWith(cacheFirst(r)); return; }
  if (/tv\.html$|game-core\.js$/.test(u.pathname)) { e.respondWith(swr(r)); return; }
});
