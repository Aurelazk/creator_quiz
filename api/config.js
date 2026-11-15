'use strict';

/* =====================================================================
   api/config.js — configuration runtime du client
   Vercel ne peut pas héberger le serveur de jeu (WebSocket + état des
   salles). Le frontend lit ici l'URL du serveur Node persistant.
   ===================================================================== */

module.exports = (req, res) => {
  const raw = String(process.env.GAME_WS_URL || '').trim();
  let wsUrl = null;
  if (raw) {
    try {
      const url = new URL(raw);
      if (url.protocol === 'wss:' || url.protocol === 'ws:') {
        if (!url.pathname || url.pathname === '/') url.pathname = '/ws';
        wsUrl = url.toString();
      }
    } catch (e) {
      wsUrl = null;
    }
  }

  const publicUrl = process.env.PUBLIC_URL
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL : null);

  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify({ wsUrl, publicUrl }));
};
