/* =====================================================================
   sw.js — Service Worker PWA CREATOR Guess Their Answer
   Stratégie :
   - Cache-first pour les assets statiques (HTML, CSS, JS, polices, images)
   - Network-first avec fallback cache pour les appels API (/api/*)
   - Hors-ligne : page d'accueil et assets disponibles sans réseau
   ===================================================================== */
'use strict';

const CACHE_NAME = 'creator-quiz-v4';
const ASSETS = [
  '/',
  '/index.html',
  '/css/tokens.css',
  '/css/base.css',
  '/css/components.css',
  '/css/screens.css',
  '/css/intro.css',
  '/js/avatar.js',
  '/js/net.js',
  '/js/ui.js',
  '/js/intro-anim.js',
  '/js/app.js',
  '/shared/rules.js',
  '/assets/fonts/famous-college.ttf',
  '/assets/fonts/janda-manatee-solid.ttf',
  '/assets/fonts/granika.otf',
  '/assets/ui/hourglass.webp',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Assets statiques : cache-first
  if (url.origin === location.origin && (url.pathname.startsWith('/css/') ||
      url.pathname.startsWith('/js/') || url.pathname.startsWith('/assets/') ||
      url.pathname === '/' || url.pathname === '/index.html')) {
    event.respondWith(
      caches.match(event.request).then((cached) =>
        cached || fetch(event.request).then((resp) => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return resp;
        })
      )
    );
    return;
  }

  // API : network-first, fallback cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Navigation : cache-first pour l'accueil
  if (event.request.mode === 'navigate') {
    event.respondWith(caches.match('/index.html'));
    return;
  }
});
