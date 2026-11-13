# Quiz 3D – CREATOR (Guess Their Answer · Epitech Bénin)

Application "Guess Their Answer" (Family Feud-like) en temps réel :
- **Hôte** : écran 3D projeté (plateau, gradins, 2 pupitres, duel Bleu/Vert ou solo).
- **Joueurs** : UI téléphone 2D avec clavier AZERTY intégré.
- **Réseau** : MQTT sur `wss://broker.emqx.io:8084/mqtt` (public, sans authentification).
- **Déploiement** : Vercel statique, aucun build.

## Architecture

| Fichier | Rôle |
|---------|------|
| `index.html` | Squelette : écrans (home/avatar/lobby/jeu/fin/classement/pause), HUD hôte, clavier, intro |
| `css/style.css` | Palette CREATOR, polices, responsive, safe-area iOS, contraste, tactiles |
| `js/game.js` | Règles (hôte seulement) : normalisation, matching (alias/pluriel/Levenshtein borné), scoring + bonus rapidité + ×2 |
| `js/survey-questions.js` | Banque de sondages (200 questions, françaises) — chargée UNIQUEMENT côté hôte (`window.SURVEY_QUESTIONS`). Validée par `tools/validate-bank.js`. |
| `ASSET_MAP.md` | Inventaire des actifs (provenance, destination à l'écran, budget). |
| `CREDITS.md` | Provenance et licence de chaque actif (extraction APK `com.qoni.guesstheiranswer`). |
| `js/net.js` | Transport MQTT + état de salle, sujets sécurisés, jetons, validation |
| `js/scene.js` | Plateau 3D Three.js r128 (GLTF/Draco), personnages, public animé, caméra, projecteur |
| `js/ui.js` | DOM : tableau des réponses, clavier, réactions, classements |
| `js/app.js` | Orchestration hôte/joueur, sons WebAudio, classement général, confettis |
| `js/intro.js` | Intro CREATOR (perso qui écrase le "O") |
| `api/leaderboard.js` | Function serverless Vercel : classement général (Upstash Redis REST) |
| `sw.js` | Service worker : cache versionné de `assets/` |
| `tools/validate-bank.js` | Validation de la banque de questions |
| `tools/build_models.py` | Réassemblage / retargeting des modèles GLB |
| `tools/build-assets.sh` | Pipeline de génération des assets (depuis le projet Unity source) |
| `tests/game.test.js` | Tests Node (aucun framework) : `npm test` |

## Lancer en local

Aucun build, aucune dépendance npm pour le site. Ouvrez `index.html` dans un navigateur, ou servez le répertoire :

```bash
python3 -m http.server 5173   # puis ouvrir http://localhost:5173/index.html
```

Le rôle (hôte / joueur) se détermine par l'écran : "Créer une salle" = hôte (projection), "Rejoindre" = joueur (téléphone).

## Variables d'environnement (Vercel)

Déclarer dans le tableau de bord Vercel (Projet > Settings > Environment Variables) :

| Variable | Rôle |
|----------|------|
| `KV_REST_API_URL` | URL REST Upstash Redis (ex. `https://xxx.upstash.io`) |
| `KV_REST_API_TOKEN` | Token Upstash Redis |
| `ALLOWED_ORIGIN` | Origine autorisée pour le CORS (ex. `https://mon-site.vercel.app`) ; `*` en dev |

Aucun secret n'est présent dans le dépôt. Sans ces variables, le classement général bascule silencieusement sur `localStorage` (fallback local, message affiché).

## Ajouter une question

Éditer `js/survey-questions.js` : tableau `SURVEY_QUESTIONS`, format
`{ q, answers:[{ text, pts, aliases:[...] }] }` (5 à 6 réponses, points décroissants, somme ≈ 100).

Puis valider :

```bash
node tools/validate-bank.js
npm run validate-bank
```

## Régénérer les assets

`tools/build-assets.sh [chemin/vers/Guess-Their-Answer/Assets]` (nécessite FBX2glTF, gltf-transform, sharp ; hors dépôt). Les modèles déjà construits sont dans `assets/models/` (Draco). `sw.js` en met en cache les octets pour les parties suivantes.

## Sécurité réseau (état actuel)

- Sujet de salle imprévisible : `creatorquiz3d/<code>/<hostSecret>/<state|events>` ; le `hostSecret` n'est communiqué qu'au moyen du QR code (pas devinable).
- L'hôte est l'unique autorité : ignore tout événement dont `from` n'est pas un joueur inscrit, ignore tout `state` publié par un tiers, valide strictement chaque message (type, texte ≤ 40 caractères, jeu de caractères autorisé).
- Chaque joueur reçoit un jeton à l'inscription ; ses guess le portent. Limite hôte : 1 guess / 600 ms par joueur, max 60 par manche (rejet silencieux au-delà).
- Tout texte affiché (pseudos, réponses) est échappé ; pseudonymes dédoublonnés (suffixe `#2`).

**Limite restante** : le broker MQTT public est sans authentification ni chiffrement de bout en bout — un attaquant ayant le sujet peut toujours inonder. Migration proposée (non implémentée) : remplacer le broker public par un petit serveur WebSocket dédié (authentification par jeton, sujets par salle, validation côté serveur).

## Tests

```bash
npm test                 # tests de règles (Node, aucun framework)
npm run validate-bank    # validation de la banque de questions
```

Test de fumée Playwright : `tests/smoke.test.js` (nécessite `@playwright/test` + un serveur HTTP local + accès au broker MQTT ; non exécutable tel quel dans cet environnement sans ces dépendances).

## Checklist de recette (manuelle)

- [ ] Créer une salle (code 5 caractères) + QR affiché
- [ ] 2 téléphones rejoignent via le QR (lien sécurisé `?room=…&hs=…`)
- [ ] Une manche complète : question → réponses → révélation case par case → fin
- [ ] Public qui court puis s'anime (Idle / Running / Cheer), 50 spectateurs
- [ ] Win pour l'équipe gagnante, Lose pour l'autre ; podium solo (3 premiers)
- [ ] Classement général (localStorage ou Upstash si configuré)
- [ ] Reconnexion téléphone (garde sa place et son score)
- [ ] Mode léger (bascule automatique si < 25 fps)
- [ ] Pause / +15 s / Passer / Révéler maintenant / relancer sans recréer la salle / exclure un joueur
