/* =====================================================================
   sw.js — service worker CREATOR (cache versionne des assets)
   Mise en cache de assets/ pour les parties suivantes.
   ===================================================================== */
'use strict';

const CACHE = 'creator-quiz-v2';
const ASSETS = [
  './', './index.html', './css/style.css',
  './js/game.js', './js/net.js', './js/scene.js', './js/ui.js', './js/app.js', './js/intro.js',
  './js/survey-questions.js',
  './assets/vendor/three.min.js', './assets/vendor/mqtt.min.js',
  './assets/vendor/GLTFLoader.js', './assets/vendor/DRACOLoader.js', './assets/vendor/SkeletonUtils.js',
  './assets/vendor/draco/draco_decoder.js', './assets/vendor/draco/draco_decoder.wasm',
  './assets/vendor/draco/draco_wasm_wrapper.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS).catch((e) => console.warn('SW install cache', e)))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isAsset = url.pathname.startsWith('/assets/') || url.pathname.startsWith('/js/') || url.pathname.startsWith('/css/');
  if (!isAsset) return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((resp) => {
      if (resp.ok) {
        const clone = resp.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, clone)).catch(() => {});
      }
      return resp;
    }).catch(() => cached))
  );
});
