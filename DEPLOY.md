# Déploiement

## Ce tourne où

| Composant | Hébergeur | Pourquoi |
| --- | --- | --- |
| Site (HTML/CSS/JS), `/api/health`, `/api/qr`, `/api/leaderboard`, `/api/config` | **Vercel** | statique + fonctions serverless |
| Serveur de jeu (`server/index.js`, WebSocket + salles + tick 200 ms) | **hôte Node persistant** (Render, Railway, Fly, VPS) | Vercel Functions sont éphémères : pas de WebSocket, pas d'état de salle partagé |

Le frontend lit l'URL du serveur de jeu sur `/api/config`, qui renvoie la variable
d'environnement `GAME_WS_URL`. Sans elle, il utilise le même domaine (`/api/ws`),
ce qui fonctionne en local et sur un hôte Node persistant.

## 1. Serveur de jeu (Render, exemple)

1. Pousser le dépôt sur GitHub (déjà fait : `Aurelazk/creator_quiz`).
2. Sur Render : **New → Blueprint**, sélectionner le dépôt. Le fichier
   `render.yaml` crée le service `creator-quiz-game`.
   Ou **New → Web Service** avec :
   - Build : `npm install`
   - Start : `npm start`
   - Health check : `/api/health`
3. Récupérer l'URL publique, par exemple `https://creator-quiz-game.onrender.com`.
   L'URL WebSocket est `wss://creator-quiz-game.onrender.com/ws`.

Vérification :

```bash
curl https://creator-quiz-game.onrender.com/api/health
# {"ok":true,"rooms":0,"questions":10}
```

> Le plan gratuit Render met le service en veille après inactivité : la première
> connexion peut prendre ~30 s, le client réessaie automatiquement.

## 2. Vercel

```bash
vercel env add GAME_WS_URL production
# valeur : wss://creator-quiz-game.onrender.com/ws
vercel --prod
```

Pour le classement général, installer **Upstash for Redis** depuis le
Marketplace Vercel sur le projet, puis vérifier que `KV_REST_API_URL` et
`KV_REST_API_TOKEN` sont présentes (`vercel env ls`). Tant qu'elles manquent,
`/api/leaderboard` répond `{"scores":[],"configured":false}` et l'interface
affiche « Classement général indisponible » au lieu d'une erreur.

## 3. Vérifications

```bash
curl https://<projet>.vercel.app/api/config     # {"wsUrl":"wss://…/ws"}
curl https://<projet>.vercel.app/api/health     # {"ok":true,"mode":"serverless",…}
curl https://<projet>.vercel.app/api/leaderboard
curl https://<projet>.vercel.app/api/ws         # 501 explicite (normal sur Vercel)
```

## Local

```bash
npm install
npm start          # http://localhost:3000
npm test           # règles du jeu
npm run test:e2e   # partie complète WebSocket
```
