'use strict';

/* =====================================================================
   api/config.js — configuration runtime du client
   Sans GAME_WS_URL, le client utilise /api/ws servi par api/ws.mjs
   sur Vercel (WebSocket natif avec Fluid compute). GAME_WS_URL permet
   de pointer vers un serveur Node persistant (Render, VPS…).
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
  res.end(JSON.stringify({ wsUrl, wsPath: '/api/ws', publicUrl }));
};
