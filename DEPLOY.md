# Déploiement — CREATOR QCM

## Déploiement Vercel

Le WebSocket est servi nativement par `api/ws.mjs` (export d’un serveur Node avec `ws`) et Fluid compute est activé dans `vercel.json`. Le client lit le chemin `/api/ws` depuis `/api/config`.

```bash
vercel --prod
```

1. Vérifier que `vercel.json` contient bien `"fluid": true` et `maxDuration: 300` pour `api/ws.mjs`.
2. Variables facultatives :
   - `PUBLIC_URL` : URL publique utilisée pour les QR ; sinon Vercel fournit `VERCEL_PROJECT_PRODUCTION_URL`.
   - `ALLOWED_ORIGIN` : origine autorisée pour la WebSocket ; les domaines `*.vercel.app` sont autorisés automatiquement.
   - `GAME_WS_URL` : permet de remplacer `/api/ws` par un serveur Node persistant (Render, VPS…).
   - `KV_REST_API_URL` et `KV_REST_API_TOKEN` : classement général Upstash.
3. Vérifier après déploiement :

```bash
curl https://<projet>.vercel.app/api/config
```

Réponse attendue : `{"wsUrl":null,"wsPath":"/api/ws","publicUrl":"https://<projet>.vercel.app"}`.

> Limite Vercel : une connexion WebSocket ferme au plus tard à 300 s sur le plan Hobby ; le client se reconnecte automatiquement. Les salles sont en mémoire par instance : si plusieurs instances servent le même jeu, les joueurs peuvent être séparés. Pour une partie robuste, utilisez un unique hôte Node persistant.

## Hôte Node persistant (recommandé pour production)

Le jeu garde les salles en mémoire : un seul processus Node évite toute séparation de joueurs. Déploiement avec Render :

1. Créer un **Web Service** depuis `render.yaml` (build `npm install`, start `npm start`, health check `/api/health`).
2. Définir `PUBLIC_URL`, `ALLOWED_ORIGIN` (même URL que `PUBLIC_URL`) et facultativement les variables Upstash.
3. Pousser sur `main` :

```bash
git push origin main
```

4. Vérifier :

```bash
curl https://<service>.onrender.com/api/health
curl https://<service>.onrender.com/version.json
```

Réponse attendue : `{"ok":true,"rooms":0,"questions":120}`.

> Le plan gratuit met le service en veille : la première connexion peut prendre environ 30 s. L’interface affiche « Connexion au serveur… (peut prendre 30 s) » et réessaie automatiquement.

## Site statique + WebSocket externe

Le serveur Node sert déjà tout le site (`/`, `/css`, `/js`, `/assets`, `/sw.js`). Si vous servez le statique depuis un CDN :

- gardez `GAME_WS_URL=wss://<service>.onrender.com/ws` côté CDN ;
- gardez `PUBLIC_URL=https://<service>.onrender.com` pour les QR ;
- le client utilisera alors directement `GAME_WS_URL` au lieu de `/api/ws`.

## Mise à jour du service worker

Le hash de build est calculé à partir des fichiers sources et injecté dans `sw.js` : par `server/index.js` sur l’hôte Node, par `api/sw.mjs` sur Vercel (réécriture `/sw.js` → `/api/sw`). Le cache change donc à chaque déploiement. Les anciens caches sont supprimés à l’activation et un bandeau « Nouvelle version disponible » propose le rechargement. Un appui long sur le logo force la mise à jour.

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
