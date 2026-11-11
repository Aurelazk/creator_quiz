/* =====================================================================
   BANQUE DE QUESTIONS  —  Quiz 3D CREATOR — Epitech Bénin
   10 questions niveau débutant, culture informatique générale
   ===================================================================== */

function shuffle(a) {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

const QUESTIONS = [
  { q: "Quel est le rôle principal d'un compilateur ou d'un interpréteur en informatique ?", options: ["Traduire le code écrit par le développeur en langage machine (0 et 1) compréhensible par l'ordinateur", "Corriger automatiquement toutes les fautes d'orthographe du texte", "Sauvegarder le projet sur un serveur distant"], ans: 0, info: "Un compilateur ou interprète traduit le code source humain en instructions que la machine peut exécuter." },
  { q: "Le langage Python est très populaire aujourd'hui. Dans quel domaine est-il particulièrement le leader incontesté ?", options: ["La création de jeux vidéo en 3D pour consoles", "L'intelligence artificielle, la science des données (Data Science) et les scripts d'automatisation", "La mise en page visuelle et le design des sites web"], ans: 1, info: "Python excelle en IA, data science et automatisation grâce à ses nombreuses bibliothèques." },
  { q: "En programmation, qu'est-ce qu'une condition de type \"If / Else\" (Si / Sinon) ?", options: ["Une structure qui permet à l'ordinateur de faire un choix et d'exécuter un code plutôt qu'un autre selon une règle", "Une erreur qui bloque le fonctionnement du programme", "Une fonction qui sert à effacer la mémoire"], ans: 0, info: "Une condition if/else permet de choisir entre deux blocs de code selon qu'une condition est vraie ou fausse." },
  { q: "Quelle est la différence majeure entre les langages HTML et JavaScript sur un site web ?", options: ["HTML gère la base de données, JavaScript gère la sécurité du serveur", "HTML crée la structure fixe de la page (textes, images), tandis que JavaScript gère la logique et les éléments dynamiques (calculs, animations)", "HTML est fait pour les ordinateurs, JavaScript est uniquement pour les smartphones"], ans: 1, info: "HTML structure la page, JavaScript la rend vivante et interactive." },
  { q: "Dans la plupart des langages de programmation, à quoi sert une \"fonction\" ?", options: ["À donner un nom au site internet", "À regrouper un bloc d'instructions réutilisable plusieurs fois dans le programme pour éviter de le réécrire", "À changer la couleur de l'écran de développement"], ans: 1, info: "Une fonction permet de réutiliser un bloc de code plusieurs fois sans le réécrire." },
  { q: "Qu'est-ce qu'un langage de programmation dit de \"Haut Niveau\" (comme Python ou JavaScript) ?", options: ["Un langage très proche de la logique humaine et facile à lire, qui nécessite une traduction pour la machine", "Un langage ultra-complexe réservé uniquement aux ingénieurs de la NASA", "Un langage qui ne fonctionne que sur les ordinateurs les plus puissants du marché"], ans: 0, info: "Un langage de haut niveau est proche de l'anglais et facile à lire pour les humains." },
  { q: "Quel caractère ou symbole est presque universellement utilisé pour attribuer une valeur à une variable (par exemple : stocker le chiffre 5 dans la variable \"score\") ?", options: ["Le signe égal (=)", "Le point d'interrogation (?)", "Le symbole dièse (#)"], ans: 0, info: "Le signe égal = sert à assigner une valeur à une variable." },
  { q: "Qu'appelle-t-on la \"syntaxe\" d'un langage de programmation ?", options: ["La vitesse d'exécution du code par le processeur", "L'ensemble des règles d'écriture et de grammaire strictes que le développeur doit respecter pour que le code soit compris", "Le choix des couleurs utilisées dans le logiciel de code"], ans: 1, info: "La syntaxe est l'ensemble des règles d'écriture du langage." },
  { q: "À quoi sert le langage SQL (Structured Query Language) ?", options: ["À sécuriser les connexions Wi-Fi d'un site web", "À communiquer avec des bases de données pour rechercher, ajouter ou modifier des informations", "À programmer des applications mobiles sur iPhone et Android"], ans: 1, info: "SQL sert à interroger et gérer des bases de données relationnelles." },
  { q: "Qu'est-ce qu'un \"tableau\" (ou une \"Array / List\") en programmation ?", options: ["Une structure de données qui permet de stocker plusieurs éléments ou valeurs ensemble dans une seule variable", "Un écran de contrôle qui affiche la météo du serveur", "Un outil pour dessiner des graphiques sur l'écran"], ans: 0, info: "Un tableau (array/list) regroupe plusieurs valeurs sous un seul nom de variable." }
];

const optsOf = (q) => q.options || OPTIONS;
