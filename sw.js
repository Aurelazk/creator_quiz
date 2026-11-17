'use strict';

const BUILD_HASH = '__BUILD_HASH__';
const CACHE = 'creator-quiz-' + BUILD_HASH;
const ASSET_CACHE = 'creator-quiz-assets-' + BUILD_HASH;
const SHELL = [
  '/',
  '/index.html',
  '/js/net.js',
  '/js/ui.js',
  '/js/app.js',
  '/js/avatar.js',
  '/js/intro-anim.js',
  '/shared/rules.js',
  '/css/tokens.css',
  '/css/base.css',
  '/css/components.css',
  '/css/screens.css',
  '/css/intro.css',
];

self.addEventListener('message', (event) => {
  if (event && event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(ASSET_CACHE)
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== ASSET_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function networkFirst(request, cacheName) {
  return fetch(request).then((response) => {
    if (response && response.ok && request.method === 'GET') {
      const clone = response.clone();
      caches.open(cacheName).then((cache) => cache.put(request, clone)).catch(() => {});
    }
    return response;
  }).catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html')));
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  if (url.pathname === '/' || url.pathname === '/index.html' ||
      url.pathname.startsWith('/js/') || url.pathname.startsWith('/css/') ||
      url.pathname.startsWith('/shared/')) {
    event.respondWith(networkFirst(request, CACHE));
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(ASSET_CACHE).then((cache) => cache.put(request, clone)).catch(() => {});
        }
        return response;
      }))
    );
    return;
  }

  if (request.mode === 'navigate') event.respondWith(networkFirst(request, CACHE));
});
