# CREATOR 3D Quiz Room

## 🎮 nouvelle expérience 3D pour ton quiz multijoueur

### Description

La **Room 3D** est une version immersive en 3D du jeu CREATOR Quiz. Les joueurs rejoignent une salle virtuelle en 3D avec :

- **Environnement 3D complet** : salle avec éclairage neon (cyan, rose, vert)
- **Avatars 3D** : chaque joueur a son avatar coloré dans la salle
- **Table centrale** : pour afficher les questions
- **Écran géant** : projection des questions et résultats
- **Tableau de classement** : en temps réel sur le mur
- **Podium final** : pour les 3 premiers joueurs

### ✨ Fonctionnalités

- ✅ 10 questions pour débutants
- ✅ Système multijoueur en temps réel
- ✅ Classements en direct
- ✅ Design cyberpunk/neon
- ✅ Compatible mobile et desktop
- ✅ Animations fluides

### 📋 Questions pour débutants

Le quiz utilise 10 questions aléatoires parmi cette banque :

1. Nommez un fruit jaune
2. Nommez un super-héros célèbre
3. Nommez une capitale africaine
4. Nommez un sport qu'on pratique en équipe
5. Nommez un plat que tout le monde aime
6. Nommez un animal qu'on peut voir en Afrique
7. Nommez une application populaire sur téléphone
8. Nommez un langage de programmation
9. Nommez quelque chose qu'on emmène à la plage
10. Nommez une marque de téléphone
11. Nommez un film culte
12. Nommez un pays d'Europe
13. Nommez un instrument de musique
14. Nommez un réseau social
15. Nommez une matière enseignée à l'école

### 🚀 Comment utiliser

#### 1. Démarrer le serveur

```bash
cd creator_quiz
npm start
# ou
node server.js
```

Le serveur démarrera sur `http://localhost:3000`

#### 2. Créer une partie en 3D

- Ouvrez `http://localhost:3000/room-3d.html` dans votre navigateur
- Cliquez sur **"CREER UNE SALLE"**
- Entrez votre pseudo (vous serez l'animateur)
- Un code de salle à 4 lettres sera généré

#### 3. Rejoindre la partie

- Les autres joueurs ouvrent `http://localhost:3000/room-3d.html`
- Cliquez sur **"REJOINDRE"**
- Entrez le code de la salle et votre pseudo
- Attendez que l'animateur lance la partie

#### 4. Jouer

- **Animateur** : Lance la partie avec le bouton "LANCER LA PARTIE"
- **Joueurs** : Répondez aux questions dans le champ de texte
- Après chaque question, les résultats s'affichent
- L'animateur clique sur "SUIVANT" pour passer à la question suivante
- Après 10 questions, le podium final s'affiche

### 🎨 Design et couleurs

La Room 3D utilise le même thème visuel que le jeu NEON DOORS :

- **Fond sombre** : `#0d0e15`
- **Cyan** : `#38e8ff` (éclairage principal)
- **Rose/Magenta** : `#ff3355` (accents)
- **Vert** : `#00ffa3` (réussite)
- **Or** : `#ffd166` (podium)

### 💡 Astuces

1. **Meilleure expérience** : Utilisez Chrome ou Firefox pour les meilleures performances 3D
2. **Fullscreen** : Appuyez sur F11 pour une immersion totale
3. **Navigation** : Utilisez la souris pour explorer la salle 3D
4. **Mobile** : Fonctionne sur mobile mais mieux sur desktop

### 📁 Structure des fichiers

```
creator_quiz/
├── server.js          # Serveur Node.js + Socket.io
├── room-3d.html       # Nouvelle interface 3D
├── public/
│   └── index.html     # Version existante (Guess Their Answer)
└── ...
```

### 🔧 Personnalisation

#### Changer les questions

Modifiez le tableau `QUESTION_BANK` dans `server.js` :

```javascript
const QUESTION_BANK = [
  'Votre question 1',
  'Votre question 2',
  // ...
];
```

#### Changer le temps par question

Modifiez la constante `ROUND_DURATION` dans `server.js` :

```javascript
const ROUND_DURATION = 30; // secondes
```

#### Changer les couleurs

Modifiez les variables CSS dans `room-3d.html` :

```css
:root{
  --cyan:#38e8ff;
  --red:#ff3355;
  --green:#00ffa3;
  /* ... */
}
```

### 🐛 Dépannage

#### La page ne se charge pas
- Vérifiez que le serveur est démarré (`node server.js`)
- Vérifiez que vous accédez à `http://localhost:3000/room-3d.html`
- Vérifiez la console du navigateur (F12) pour les erreurs

#### Three.js ne s'affiche pas
- Assurez-vous que votre navigateur supporte WebGL
- Essayez de vider le cache (Ctrl+F5)

#### Socket.io ne se connecte pas
- Vérifiez que le serveur est bien démarré
- Vérifiez que vous utilisez le bon port (3000 par défaut)
- Essayez d'ouvrir la console pour voir les erreurs de connexion

### 📞 Support

Pour toute question ou problème, vérifiez :
- La console du navigateur (F12)
- Les logs du serveur
- Ce fichier README

### 🎉 Bon jeu !

Amusez-vous bien avec la nouvelle expérience 3D !
