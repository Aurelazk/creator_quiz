'use strict';

/* =====================================================================
   api/ws.js — point d'entrée WebSocket sur Vercel Functions
   Vercel sert désormais les connexions WebSocket nativement (Fluid
   compute). On réutilise le serveur autoritaire de server/index.js et on
   exporte le http.Server comme export par défaut de la fonction.
   ===================================================================== */

const http = require('http');
const { createWebSocketServer } = require('../server/index.js');

const server = http.createServer((req, res) => {
  res.statusCode = 426;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify({
    error: 'upgrade-required',
    message: 'Cette route attend une connexion WebSocket (wss://…/api/ws).',
  }));
});

createWebSocketServer(server, ['/ws', '/api/ws']);

module.exports = server;
