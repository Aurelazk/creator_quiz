# Déploiement

## Ce tourne où

| Composant | Hébergeur | Pourquoi |
| --- | --- | --- |
| Site (HTML/CSS/JS), `/api/health`, `/api/qr`, `/api/leaderboard`, `/api/config` | **Vercel** | statique + fonctions serverless |
| Serveur de jeu (`api/ws.js` → `server/index.js`, WebSocket + salles + tick 200 ms) | **Vercel Functions** (WebSocket natif) | suffisant pour une salle de démo ; chaque connexion reste épinglée à une instance |
| (optionnel) Serveur de jeu sur hôte Node persistant | **Render, Railway, Fly, VPS** | connexions > 300 s et instance unique garantie |

Le frontend lit l'URL du serveur de jeu sur `/api/config`. Si `GAME_WS_URL` est
absente, il utilise le même domaine (`/api/ws`) : c'est le cas par défaut sur
Vercel, où la fonction WebSocket est servie directement.

> Sur Vercel, une connexion WebSocket est limitée à 300 s (plan Hobby) et peut
> atterrir sur une autre instance que celle qui héberge la salle. Le client
> retente automatiquement la jonction (jusqu'à 8 fois) pour retrouver la bonne
> instance. Pour une partie longue ou très fréquentée, préférez un hôte Node
> persistant et renseignez `GAME_WS_URL`.

## 1. Serveur de jeu persistant (optionnel — Render, exemple)

1. Pousser le dépôt sur GitHub (déjà fait : `Aurelazk/creator_quiz`).
2. Sur Render : **New → Blueprint**, sélectionner le dépôt. Le fichier
   `render.yaml` crée le service `creator-quiz-game`.
   Ou **New → Web Service** avec :
   - Build : `npm install`
   - Start : `npm start`
   - Health check : `/api/health`
   - Variables d'environnement à définir sur Render :
     - `PUBLIC_URL` : l'URL publique du service Render (ex. `https://creator-quiz-game.onrender.com`), sert à générer le QR lisible depuis un téléphone.
     - `ALLOWED_ORIGIN` : l'origine autorisée pour le WebSocket et le CORS (ex. `https://<ton-projet>.vercel.app`). Valeur `*` pour accepter tout (déconseillé en prod).
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
# Optionnel : uniquement si le serveur de jeu tourne sur un hôte persistant.
vercel env add GAME_WS_URL production
# valeur : wss://creator-quiz-game.onrender.com/ws
vercel env add PUBLIC_URL production   # optionnel : https://<ton-projet>.vercel.app (sert pour le QR)
vercel env add ALLOWED_ORIGIN production # optionnel : https://<ton-projet>.vercel.app (CORS/WebSocket)
vercel env add LEADERBOARD_WRITE_TOKEN production # chaine secrete protegeant l'ecriture POST /api/leaderboard
vercel --prod
```

Pour le classement général, installer **Upstash for Redis** depuis le
Marketplace Vercel sur le projet, puis vérifier que `KV_REST_API_URL` et
`KV_REST_API_TOKEN` sont présentes (`vercel env ls`). Les mêmes variables doivent
également être définies côté **Render** (serveur de jeu) : le serveur Node ecrit
directement dans Upstash a la fin de chaque partie (plus de fichier JSON
ephemere). Tant qu'elles manquent, `/api/leaderboard` repond
`{"scores":[],"configured":false}` et l'interface affiche « Classement général
indisponible » au lieu d'une erreur.

L'ecriture POST sur `/api/leaderboard` est verrouillee par le jeton
`LEADERBOARD_WRITE_TOKEN` (meme valeur cote Render et cote Vercel) : sans jeton
correct, le serveur renvoie 401. Le GET et OPTIONS restent publics.

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
