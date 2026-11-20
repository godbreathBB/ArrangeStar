// BASE_VERSION 由人工维护大版本；CACHE 与 build-hash 由 tools/sync_sw.py 按外壳内容自动生成。
// 请勿手工编辑 CACHE 行——发布时漏改会让已安装客户端一直命中旧缓存。
const BASE_VERSION = 'v13';
const CACHE = 'xingyuan-v13-3fba6f14b790';
// build-hash: 3fba6f14b790
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

function offlineResponse() {
  return new Response('', { status: 503, statusText: 'offline' });
}

function offlineFallback(req) {
  // 只有页面导航才回退 HTML；脚本 / 样式 / 图片离线时拿到 HTML 会被当作源码解析而报错
  if (req.mode === 'navigate') {
    return caches.match('./index.html').then(r => r || offlineResponse());
  }
  return offlineResponse();
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                              // 非 GET 交给浏览器默认处理
  if (new URL(req.url).origin !== self.location.origin) return;  // 跨域请求不进缓存

  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(resp => {
        // 只缓存同源的成功响应，避免 404 / 5xx / opaque 被永久写入
        if (resp && resp.status === 200 && resp.type !== 'opaque' && resp.type !== 'error') {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return resp;
      }).catch(() => offlineFallback(req));
    })
  );
});
