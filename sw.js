/* =====================================================================
   sw.js — auto-destruction du service worker historique
   Les anciennes versions mettaient en cache /js et /css sans versionner,
   ce qui pouvait servir du code obsolète. Ce worker supprime tous les
   caches, se désinscrit puis recharge les onglets concernés.
   ===================================================================== */
'use strict';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => {
        try { client.navigate(client.url); } catch (e) {}
      });
    } catch (e) {}
  })());
});

self.addEventListener('fetch', () => {});
