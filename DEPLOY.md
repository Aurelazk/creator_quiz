# Déploiement — CREATOR QCM

## Hôte de jeu (obligatoire)

Le jeu utilise des salles en mémoire et des WebSocket persistantes : il doit tourner sur un hôte Node en une seule instance. Vercel Functions ne convient pas (instances éphémères, limite de 300 s).

Déploiement recommandé avec Render :

```bash
git push origin main
```

1. Créer un **Web Service** depuis `render.yaml` (ou manuellement : build `npm install`, start `npm start`, health check `/api/health`).
2. Définir les variables :
   - `PUBLIC_URL` : URL publique du service, sert à générer le QR et le lien de partage.
   - `ALLOWED_ORIGIN` : origine autorisée pour la WebSocket (même URL que `PUBLIC_URL` en production ; `*` uniquement pour un test).
   - `KV_REST_API_URL` et `KV_REST_API_TOKEN` : facultatifs, pour le classement général Upstash.
3. Vérifier :

```bash
curl https://<service>.onrender.com/api/health
curl https://<service>.onrender.com/version.json
```

Réponse attendue : `{"ok":true,"rooms":0,"questions":120,"hash":"…"}`.

> Le plan gratuit met le service en veille : la première connexion peut prendre environ 30 s. L’interface affiche « Connexion au serveur… (peut prendre 30 s) » et réessaie automatiquement.

## Site statique (optionnel)

Le serveur Node sert déjà tout le site (`/`, `/css`, `/js`, `/assets`, `/sw.js`). Si vous préférez servir le statique depuis un CDN :

- gardez `GAME_WS_URL=wss://<service>.onrender.com/ws` côté CDN ;
- gardez `PUBLIC_URL=https://<service>.onrender.com` pour les QR ;
- `api/ws.js` renvoie volontairement `503 websocket-not-available` : il ne doit jamais servir le jeu.

## Mise à jour du service worker

Le hash de build est calculé côté serveur à partir des fichiers sources et injecté dans `sw.js`. Le cache change donc à chaque déploiement. Les anciens caches sont supprimés à l’activation et un bandeau « Nouvelle version disponible » propose le rechargement. Un appui long sur le logo force la mise à jour.

## Classement général

Sans Upstash, le classement est stocké localement dans `server/data/leaderboard.json` (vidé avant livraison). Avec Upstash, les meilleurs scores sont écrits à la fin de chaque partie et `/api/leaderboard` lit le Redis.

## Local

```bash
npm install
npm start          # http://localhost:3000
npm test           # règles, code, jonction, banque
npm run test:e2e   # partie WebSocket complète
npm run test:visual
```
