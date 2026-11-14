'use strict';

/* =====================================================================
   api/ws.js — Vercel ne peut pas héberger de WebSocket
   Les fonctions Vercel sont éphémères : pas de connexion longue, pas de
   tick serveur, pas d'état de salle partagé. Le serveur de jeu doit donc
   tourner sur un hôte Node persistant (Render, Railway, Fly, VPS…).
   Cette route existe uniquement pour renvoyer un diagnostic explicite.
   ===================================================================== */

module.exports = (req, res) => {
  res.statusCode = 501;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify({
    error: 'websocket-not-supported',
    message: 'Vercel Functions ne supportent pas les connexions WebSocket.',
    hint: 'Déploie le serveur de jeu sur un hôte Node persistant puis renseigne GAME_WS_URL dans les variables d’environnement Vercel.',
  }));
};
