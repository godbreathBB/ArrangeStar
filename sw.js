const CACHE = 'xingyuan-v13';
const SHELL = [
  './', './index.html', './bundle.js', './css/style.css', './css/onboarding.css',
  './js/data.js', './js/onboarding.js',
  './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png',
  './icon-maskable-192.png', './icon-maskable-512.png',
  './assets/symbols/four-creatures.svg', './assets/symbols/mansions.svg'
];

self.addEventListener('install', e => e.waitUntil(
  caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
));

self.addEventListener('activate', e => e.waitUntil(
  caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
));

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      const copy = resp.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return resp;
    }).catch(() => caches.match('./index.html')))
  );
});
