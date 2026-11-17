'use strict';

/* =====================================================================
   api/ws.js — WebSocket sur Vercel (AVERTISSEMENT)
   Le serveur de jeu CREATOR QCM nécessite un hôte Node persistant
   (Render, Railway, VPS…) car les salles sont en mémoire (Map) et le
   WebSocket ne fonctionne pas sur les fonctions serverless Vercel
   (300 s max, instances éphémères).
   
   Pour le déploiement production :
   1. Héberge server/index.js sur un Node persistant (GAME_WS_URL).
   2. Configure la variable d'environnement GAME_WS_URL côté client.
   3. Ce fichier retourne simplement un message d'erreur explicite.
   ===================================================================== */

module.exports = (req, res) => {
  res.statusCode = 503;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify({
    error: 'websocket-not-available',
    message: 'Le serveur WebSocket CREATOR QCM n\'est pas disponible sur Vercel Functions.',
    detail: 'Hébergez server/index.js sur un nœud Node persistant (Render, Railway, VPS) et configurez GAME_WS_URL.',
    docs: 'Consultez DEPLOY.md pour la procédure de déploiement.',
  }));
};
