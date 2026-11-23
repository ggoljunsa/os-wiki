/* 한입 학습 service worker — scope is this duo/ folder only. */
var PREFIX = 'duo-os-';
var CACHE = PREFIX + '47219e8132';
var CORE = ['./', './index.html', './manifest.webmanifest', './icon.svg'];
var CDN = 'https://cdn.jsdelivr.net/';
var KATEX = [
  CDN + 'npm/katex@0.16.11/dist/katex.min.css',
  CDN + 'npm/katex@0.16.11/dist/katex.min.js',
  CDN + 'npm/katex@0.16.11/dist/contrib/auto-render.min.js'
];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(CORE).then(function () {
      return Promise.all(KATEX.map(function (u) { return fetch(u, { mode: 'cors' }).then(function (r) { if (r.ok) return c.put(u, r); }).catch(function () {}); }));
    });
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    // only this course's old caches — sibling courses share the origin
    return Promise.all(keys.filter(function (k) { return k.indexOf(PREFIX) === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  var scope = self.registration.scope;
  if (req.mode === 'navigate' && req.url.indexOf(scope) === 0) {
    // network first so new builds show up; cached copy offline
    e.respondWith(fetch(req).then(function (r) {
      var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put('./index.html', cp); });
      return r;
    }).catch(function () { return caches.match('./index.html', { ignoreSearch: true }); }));
    return;
  }
  if (req.url.indexOf(scope) === 0 || req.url.indexOf(CDN) === 0) {
    e.respondWith(caches.match(req, { ignoreSearch: url.origin === self.location.origin }).then(function (hit) {
      var net = fetch(req).then(function (r) {
        if (r && (r.ok || r.type === 'opaque')) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); }
        return r;
      });
      if (hit) { net.catch(function () {}); return hit; }
      return net;
    }));
  }
});
