# Quiz 3D – CREATOR (Epitech Bénin)
- `index.html` : application (hôte = écran 3D projeté, joueurs = téléphone) + intro CREATOR (perso qui écrase le « O »).
- `questions.js` : banque de questions.
- L'intro se joue une fois par session ; toucher l'écran la passe. Pour la rejouer : `sessionStorage.removeItem('cq_intro')` puis recharger.
- Déploiement : Vercel statique (`vercel.json`), aucun build.
