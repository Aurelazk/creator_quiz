# Quiz 3D – CREATOR (Epitech Bénin)
- `index.html` : application (hôte = écran 3D projeté, joueurs = téléphone) + intro CREATOR (perso qui écrase le « O »).
- `questions.js` : banque de 31 questions ; chaque partie en tire 10 au hasard (`GAME_Q` dans index.html).
- Intro : une fois par session. Pour la rejouer : `sessionStorage.removeItem('cq_intro')` puis recharger.
- Limite connue : `questions.js` (avec les bonnes réponses) est téléchargé par chaque navigateur ; un joueur déterminé peut le lire. Une vraie protection demande un serveur.
- Déploiement : Vercel statique, aucun build.
