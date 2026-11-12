/* =====================================================================
   survey-questions.js — banque de sondages "Guess Their Answer"
   CREATOR · Epitech Bénin
   Chargée UNIQUEMENT côté hôte (Game.loadBank). Jamais envoyée aux joueurs.
   Format : { q, answers:[{ text, pts, aliases:[...] }] }
   5 à 6 réponses par question, points décroissants, somme ≈ 100.
   ===================================================================== */
(function (global) {
  'use strict';

  global.SURVEY_QUESTIONS = [
    /* ---------------- Culture informatique ---------------- */
    {
      q: "Quel langage de programmation est le plus populaire selon toi ?",
      answers: [
        { text: "Python", pts: 35, aliases: ["py", "python3", "python 3"] },
        { text: "JavaScript", pts: 25, aliases: ["js", "javascript", "node", "node.js", "ecmascript"] },
        { text: "Java", pts: 15, aliases: ["jdk", "openjdk"] },
        { text: "C++", pts: 10, aliases: ["cpp", "c plus plus"] },
        { text: "PHP", pts: 8, aliases: ["hypertext preprocessor"] },
        { text: "C#", pts: 7, aliases: ["csharp", "c sharp", "dotnet", ".net"] },
      ],
    },
    {
      q: "Quel éditeur de code utilises-tu le plus ?",
      answers: [
        { text: "Visual Studio Code", pts: 45, aliases: ["vscode", "vs code", "visual studio code", "code"] },
        { text: "IntelliJ", pts: 15, aliases: ["idea", "intellij idea", "jetbrains"] },
        { text: "Sublime Text", pts: 12, aliases: ["sublime", "st"] },
        { text: "Vim", pts: 10, aliases: ["vi", "neovim", "nvim"] },
        { text: "Notepad++", pts: 9, aliases: ["notepad plus plus", "npp"] },
        { text: "Atom", pts: 8, aliases: [] },
      ],
    },
    {
      q: "Quel système d'exploitation tournes-tu au quotidien ?",
      answers: [
        { text: "Windows", pts: 40, aliases: ["win", "windows 10", "windows 11"] },
        { text: "macOS", pts: 25, aliases: ["mac", "os x", "mac os"] },
        { text: "Linux", pts: 20, aliases: ["ubuntu", "debian", "fedora", "arch", "gnu linux"] },
        { text: "ChromeOS", pts: 8, aliases: ["chromebook"] },
        { text: "Android", pts: 5, aliases: [] },
        { text: "iOS", pts: 2, aliases: ["iphone", "ipados"] },
      ],
    },
    {
      q: "Quel gestionnaire de versions utilises-tu ?",
      answers: [
        { text: "Git", pts: 60, aliases: ["github", "gitlab", "git hub"] },
        { text: "SVN", pts: 15, aliases: ["subversion"] },
        { text: "Mercurial", pts: 10, aliases: ["hg"] },
        { text: "Aucun", pts: 8, aliases: ["aucun", "pas de gestion", "rien"] },
        { text: "Perforce", pts: 7, aliases: ["p4"] },
      ],
    },
    {
      q: "Quelle base de données préfères-tu ?",
      answers: [
        { text: "MySQL", pts: 30, aliases: ["mysql", "mariadb"] },
        { text: "PostgreSQL", pts: 25, aliases: ["postgres", "pg"] },
        { text: "MongoDB", pts: 20, aliases: ["mongo", "nosql"] },
        { text: "SQLite", pts: 12, aliases: ["sqlite3"] },
        { text: "Redis", pts: 8, aliases: [] },
        { text: "Oracle", pts: 5, aliases: [] },
      ],
    },
    {
      q: "Quel navigateur web utilises-tu le plus ?",
      answers: [
        { text: "Google Chrome", pts: 45, aliases: ["chrome", "google chrome", "chromium"] },
        { text: "Firefox", pts: 20, aliases: ["mozilla firefox"] },
        { text: "Safari", pts: 15, aliases: [] },
        { text: "Microsoft Edge", pts: 10, aliases: ["edge"] },
        { text: "Brave", pts: 6, aliases: [] },
        { text: "Opera", pts: 4, aliases: [] },
      ],
    },

    /* ---------------- Epitech ---------------- */
    {
      q: "Quelle est la spécialité Epitech la plus connue ?",
      answers: [
        { text: "Développement web", pts: 30, aliases: ["web", "full stack", "front end", "back end"] },
        { text: "Intelligence artificielle", pts: 25, aliases: ["ia", "ai", "machine learning", "deep learning"] },
        { text: "Cybersécurité", pts: 20, aliases: ["cyber securite", "securite", "security", "hacking"] },
        { text: "Data", pts: 15, aliases: ["big data", "data science", "analyse de donnees"] },
        { text: "Jeux video", pts: 10, aliases: ["jeu video", "gamedev", "unreal", "unity"] },
      ],
    },
    {
      q: "Quel projet Epitech t'a le plus marqué ?",
      answers: [
        { text: "42sh / shell", pts: 25, aliases: ["42sh", "minishell", "shell"] },
        { text: "RTYPE / arcade", pts: 20, aliases: ["rtype", "jeu d'arcade", "shmup"] },
        { text: "Push_swap", pts: 18, aliases: ["pushswap", "push swap"] },
        { text: "Philosophes", pts: 15, aliases: ["philo", "philosophe", "dining philosophers"] },
        { text: "MiniRT", pts: 12, aliases: ["minirt", "ray tracing", "raytracing"] },
        { text: "Libft", pts: 10, aliases: [] },
      ],
    },
    {
      q: "Où se situe le campus Epitech du Bénin ?",
      answers: [
        { text: "Cotonou", pts: 70, aliases: ["cotou", "kotonou"] },
        { text: "Porto-Novo", pts: 15, aliases: ["porto novo"] },
        { text: "Parakou", pts: 8, aliases: [] },
        { text: "Abomey-Calavi", pts: 5, aliases: ["calavi", "abomey calavi"] },
        { text: "Ouidah", pts: 2, aliases: [] },
      ],
    },
    {
      q: "Quel langage est enseigné en premier à Epitech ?",
      answers: [
        { text: "C", pts: 55, aliases: ["langage c", "ansi c"] },
        { text: "Python", pts: 20, aliases: ["py"] },
        { text: "C++", pts: 12, aliases: ["cpp"] },
        { text: "Ocaml", pts: 8, aliases: ["caml"] },
        { text: "Shell", pts: 5, aliases: ["bash", "zsh"] },
      ],
    },
    {
      q: "Quel est le surnom des élèves d'Epitech ?",
      answers: [
        { text: "Epitechiens", pts: 45, aliases: ["epitechien", "etudiant epitech"] },
        { text: "Epitechiennes", pts: 25, aliases: ["epitechienne"] },
        { text: "Piscinards", pts: 15, aliases: ["piscine", "piscinard"] },
        { text: "Geeks", pts: 10, aliases: ["geek"] },
        { text: "Hackers", pts: 5, aliases: [] },
      ],
    },
    {
      q: "Combien d'années dure le cursus Epitech ?",
      answers: [
        { text: "5", pts: 60, aliases: ["cinq", "5 ans", "cinq ans"] },
        { text: "3", pts: 20, aliases: ["trois", "3 ans"] },
        { text: "4", pts: 10, aliases: ["quatre"] },
        { text: "6", pts: 4, aliases: ["six"] },
        { text: "2", pts: 3, aliases: ["deux"] },
      ],
    },

    /* ---------------- Bénin ---------------- */
    {
      q: "Quelle est la capitale politique du Bénin ?",
      answers: [
        { text: "Porto-Novo", pts: 55, aliases: ["porto novo", "porto-novo"] },
        { text: "Cotonou", pts: 30, aliases: ["cotou", "kotonou"] },
        { text: "Parakou", pts: 8, aliases: [] },
        { text: "Ouidah", pts: 4, aliases: [] },
        { text: "Abomey", pts: 3, aliases: [] },
      ],
    },
    {
      q: "Quelle monnaie utilise-t-on au Bénin ?",
      answers: [
        { text: "Franc CFA", pts: 70, aliases: ["cfa", "franc cfa", "xof", "f cfa"] },
        { text: "Euro", pts: 12, aliases: ["eur"] },
        { text: "Naira", pts: 8, aliases: ["ngn"] },
        { text: "Dollar", pts: 6, aliases: ["usd", "dollars"] },
        { text: "Cedi", pts: 4, aliases: ["ghs"] },
      ],
    },
    {
      q: "Quel est le plus grand marché en plein air du Bénin ?",
      answers: [
        { text: "Dantokpa", pts: 55, aliases: ["dan tokpa", "dantokpa market", "marché dantokpa"] },
        { text: "Azêlèkè", pts: 15, aliases: ["azeleke", "azèkè"] },
        { text: "Misserete", pts: 12, aliases: ["misserete"] },
        { text: "Ganhi", pts: 10, aliases: ["ganhi"] },
        { text: "Azerekete", pts: 8, aliases: ["azerekete"] },
      ],
    },
    {
      q: "Quelle spécialité culinaire béninoise est la plus connue ?",
      answers: [
        { text: "Pâte d'arachide", pts: 30, aliases: ["pate d'arachide", "pâte de arachide", "kpankou", "soumbara"] },
        { text: "Amiwo", pts: 25, aliases: ["ami wo", "maize dough"] },
        { text: "Yovo doko", pts: 20, aliases: ["beignet", "beignets", "doko"] },
        { text: "Aloko", pts: 15, aliases: ["plantain", "banane plante"] },
        { text: "Akassa", pts: 10, aliases: [] },
      ],
    },
    {
      q: "Quelle langue est la plus parlée au Bénin après le français ?",
      answers: [
        { text: "Fon", pts: 40, aliases: ["fongbe"] },
        { text: "Yoruba", pts: 20, aliases: ["yorouba"] },
        { text: "Bariba", pts: 15, aliases: ["baatonum"] },
        { text: "Dendi", pts: 12, aliases: [] },
        { text: "Adja", pts: 8, aliases: [] },
        { text: "Goun", pts: 5, aliases: [] },
      ],
    },
    {
      q: "Quel artiste béninois est le plus écouté ?",
      answers: [
        { text: "Angélique Kidjo", pts: 40, aliases: ["kidjo", "angelique kidjo"] },
        { text: "Sagbohan Danialou", pts: 15, aliases: ["danialou", "sagbohan"] },
        { text: "Séverin Vodounon", pts: 14, aliases: ["severin"] },
        { text: "Gael Adanle", pts: 12, aliases: ["gael"] },
        { text: "Richarliste", pts: 10, aliases: [] },
        { text: "Tchaoudjo", pts: 8, aliases: [] },
      ],
    },

    /* ---------------- Vie étudiante ---------------- */
    {
      q: "Où étudies-tu le plus souvent ?",
      answers: [
        { text: "Bibliothèque", pts: 30, aliases: ["biblio", "BU", "bibliotheque universitaire"] },
        { text: "Chez moi / dortoir", pts: 25, aliases: ["maison", "chambre", "chez soi", "foyer"] },
        { text: "Café", pts: 18, aliases: ["cafe", "starbucks"] },
        { text: "Parc / exterieur", pts: 12, aliases: ["parc", "extérieur", "dehors"] },
        { text: "Salle informatique", pts: 10, aliases: ["salle info", "labo", "tp"] },
        { text: "Bibliothèque universitaire", pts: 5, aliases: [] },
      ],
    },
    {
      q: "Quelle boisson bois-tu pour réviser tard le soir ?",
      answers: [
        { text: "Café", pts: 40, aliases: ["cafe", "expresso", "cafeine"] },
        { text: "Thé", pts: 20, aliases: ["the", "infusion"] },
        { text: "Eau", pts: 15, aliases: ["eau plate", "bouteille d'eau"] },
        { text: "Boisson énergisante", pts: 12, aliases: ["red bull", "energisant", "booster"] },
        { text: "Jus", pts: 8, aliases: ["jus de fruit"] },
        { text: "Soda", pts: 5, aliases: ["coca", "cola"] },
      ],
    },
    {
      q: "Combien d'heures dors-tu en moyenne par nuit pendant les cours ?",
      answers: [
        { text: "6", pts: 35, aliases: ["six", "6h", "6 heures"] },
        { text: "7", pts: 25, aliases: ["sept", "7h"] },
        { text: "5", pts: 20, aliases: ["cinq", "5h"] },
        { text: "8", pts: 12, aliases: ["huit", "8h"] },
        { text: "4", pts: 8, aliases: ["quatre", "4h"] },
      ],
    },
    {
      q: "Quel réseau social utilises-tu le plus ?",
      answers: [
        { text: "Instagram", pts: 35, aliases: ["insta", "ig"] },
        { text: "TikTok", pts: 30, aliases: ["tt", "tic toc"] },
        { text: "WhatsApp", pts: 15, aliases: ["wa", "whatsapp"] },
        { text: "Twitter/X", pts: 10, aliases: ["x", "twitter"] },
        { text: "Facebook", pts: 6, aliases: ["fb"] },
        { text: "Discord", pts: 4, aliases: [] },
      ],
    },
    {
      q: "Quel moyen de transport prends-tu pour aller au campus ?",
      answers: [
        { text: "Moto taxi", pts: 35, aliases: ["zemidjan", "zemi", "moto", "taxi moto"] },
        { text: "Marche a pied", pts: 25, aliases: ["marche", "a pied", "pieds"] },
        { text: "Bus", pts: 15, aliases: ["autobus"] },
        { text: "Voiture personnelle", pts: 12, aliases: ["auto", "ma voiture", "voiture"] },
        { text: "Velo", pts: 8, aliases: ["vélo", "bicyclette"] },
        { text: "Taxi", pts: 5, aliases: [] },
      ],
    },

    /* ---------------- Culture générale ---------------- */
    {
      q: "Quel est le plus grand océan de la Terre ?",
      answers: [
        { text: "Pacifique", pts: 50, aliases: ["ocean pacifique"] },
        { text: "Atlantique", pts: 20, aliases: [] },
        { text: "Indien", pts: 15, aliases: [] },
        { text: "Arctique", pts: 10, aliases: [] },
        { text: "Austral", pts: 5, aliases: ["antarctique", "glacial antarctique"] },
      ],
    },
    {
      q: "Quelle est la plus haute montagne du monde ?",
      answers: [
        { text: "Everest", pts: 60, aliases: ["mont everest"] },
        { text: "K2", pts: 15, aliases: ["chogori"] },
        { text: "Kilimandjaro", pts: 12, aliases: ["kili"] },
        { text: "Mont Blanc", pts: 8, aliases: [] },
        { text: "Aconcagua", pts: 5, aliases: [] },
      ],
    },
    {
      q: "Quelle planète est surnommée la planète rouge ?",
      answers: [
        { text: "Mars", pts: 70, aliases: [] },
        { text: "Vénus", pts: 12, aliases: ["venus"] },
        { text: "Jupiter", pts: 8, aliases: [] },
        { text: "Mercure", pts: 6, aliases: [] },
        { text: "Saturne", pts: 4, aliases: [] },
      ],
    },
    {
      q: "Qui a peint La Joconde ?",
      answers: [
        { text: "Léonard de Vinci", pts: 65, aliases: ["leonard de vinci", "da vinci", "leonardo da vinci"] },
        { text: "Michel-Ange", pts: 12, aliases: ["michelangelo"] },
        { text: "Raphaël", pts: 10, aliases: ["raphael"] },
        { text: "Rembrandt", pts: 8, aliases: [] },
        { text: "Monet", pts: 5, aliases: ["claude monet"] },
      ],
    },
    {
      q: "Quel est le plus grand pays du monde par sa superficie ?",
      answers: [
        { text: "Russie", pts: 65, aliases: ["federation de russie"] },
        { text: "Canada", pts: 15, aliases: [] },
        { text: "Chine", pts: 10, aliases: [] },
        { text: "Etats-Unis", pts: 6, aliases: ["usa", "etats unis", "amerique"] },
        { text: "Bresil", pts: 4, aliases: ["brésil", "brazil"] },
      ],
    },
    {
      q: "Dans quelle ville se tiennent les JO d'été 2024 ?",
      answers: [
        { text: "Paris", pts: 75, aliases: [] },
        { text: "Los Angeles", pts: 10, aliases: ["la"] },
        { text: "Tokyo", pts: 7, aliases: [] },
        { text: "Londres", pts: 5, aliases: [] },
        { text: "Rio", pts: 3, aliases: ["rio de janeiro"] },
      ],
    },
    {
      q: "Quel est l'element le plus abondant dans l'univers ?",
      answers: [
        { text: "Hydrogene", pts: 70, aliases: ["hydrogène", "h", "h2"] },
        { text: "Oxygene", pts: 15, aliases: ["oxygène", "o", "o2"] },
        { text: "Carbone", pts: 8, aliases: ["c"] },
        { text: "Fer", pts: 4, aliases: ["fe"] },
        { text: "Helium", pts: 3, aliases: ["hélium", "he"] },
      ],
    },
  ];

  /* ---------- helpers exposés ---------- */
  const bank = () => global.SURVEY_QUESTIONS || [];
  const questionCount = () => bank().length;

  global.SURVEY_QUESTIONS.bank = bank;
  global.SURVEY_QUESTIONS.questionCount = questionCount;
})(window);
