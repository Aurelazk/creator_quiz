/* =====================================================================
   sw.js — Service Worker PWA CREATOR QCM Quiz
   Stratégie :
   - HTML et JS : network-first (toujours la dernière version après déploiement)
   - CSS, assets, polices : cache-first avec mise à jour arrière-plan
   - API (/api/*) : network-first, fallback cache
   - Activation : supprime les anciens caches, affiche "Nouvelle version"
   ===================================================================== */
'use strict';

const CACHE_NAME = 'creator-quiz-v6';
const ASSETS_CACHE = 'creator-quiz-assets-v6';

const HTML_JS = [
  '/',
  '/index.html',
  '/js/net.js',
  '/js/ui.js',
  '/js/intro-anim.js',
  '/js/app.js',
  '/js/avatar.js',
  '/shared/rules.js',
];

const ASSETS = [
  '/css/tokens.css',
  '/css/base.css',
  '/css/components.css',
  '/css/screens.css',
  '/css/intro.css',
  '/assets/fonts/famous-college.ttf',
  '/assets/fonts/janda-manatee-solid.ttf',
  '/assets/fonts/granika.otf',
  '/assets/ui/hourglass.webp',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(ASSETS_CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== ASSETS_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  /* HTML et JS : network-first (toujours la dernière version) */
  if (url.origin === location.origin &&
      (HTML_JS.includes(url.pathname) || url.pathname.startsWith('/js/') || url.pathname.startsWith('/shared/'))) {
    event.respondWith(
      fetch(event.request).then((resp) => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return resp;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  /* CSS et assets : cache-first */
  if (url.origin === location.origin &&
      (url.pathname.startsWith('/css/') || url.pathname.startsWith('/assets/'))) {
    event.respondWith(
      caches.match(event.request).then((cached) =>
        cached || fetch(event.request).then((resp) => {
          const clone = resp.clone();
          caches.open(ASSETS_CACHE).then((cache) => cache.put(event.request, clone));
          return resp;
        })
      )
    );
    return;
  }

  /* API : network-first, fallback cache */
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  /* Navigation : network-first pour l'accueil */
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }
});
