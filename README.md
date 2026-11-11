# Quiz 3D – CREATOR

Quiz multijoueur en 3D (Three.js + MQTT), sans build : un simple site statique (Vercel).

## Structure
```
index.html          page + conteneurs d'interface
css/style.css       design (palette CREATOR : bleu #0B35FE, vert #00E472, corail #FF4E20, marine #0C1A4B)
js/config.js        réglages : durée, points, palette, serveur MQTT
js/questions.js     les questions (Oui/Non + explication)
js/game.js          logique de jeu PURE (scores, phases, anti-triche) — testable sans navigateur
js/net.js           réseau MQTT
js/character.js     perso argile lisse, sans visage, bras croisés
js/intro.js         intro façon Pixar : le perso écrase le « O » de CREATOR
js/scene.js         scène 3D : lobby (gradins) et table (tableau + joueurs)
js/ui.js            panneaux et boutons
js/main.js          chef d'orchestre (hôte / joueur)
```

## Ce qui a changé
- Hôte = joueur (il répond aussi). Jusqu'à 16 joueurs, 1 couleur chacun.
- Réponses SECRÈTES jusqu'à la révélation (avant, tout le monde les voyait dans l'état partagé).
- 15 s par question, révélation automatique quand tout le monde a répondu ou à la fin du temps.
- Points : 100 + jusqu'à 50 de bonus de rapidité. Explication affichée après chaque question.
- Persos qui réagissent (saut = bonne réponse, tremblement = raté), plots lumineux sur la table.
- Reconnexion après rafraîchissement, salle fermée proprement si l'hôte part, lien de salle partageable.
- Suppression des fichiers inutiles (`Lobby 3D(1).html`, `Table 3D.html`, redirections).

## Déploiement
Copie ces fichiers dans ton dépôt (remplace les anciens, garde `.git`) puis push : Vercel sert le site tel quel.
Pour tester en local : `npx serve .` (les modules JS ont besoin d'un serveur, pas d'un double-clic).

## Limites connues
- Le broker MQTT `broker.emqx.io` est public : pour un vrai événement, prends un broker privé (changer `MQTT_URL`).
- Non testé dans un vrai navigateur pendant la création : si un réglage visuel cloche, regarde `scene.js` / `intro.js`.
