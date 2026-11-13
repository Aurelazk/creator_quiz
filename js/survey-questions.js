/* =====================================================================
   survey-questions.js — banque de sondages "Guess Their Answer"
   CREATOR · Epitech Bénin
   Chargée UNIQUEMENT côté hôte (Game.loadBank). Jamais envoyée aux joueurs.
   Format : { q, answers:[{ text, pts, aliases:[...] }] }
   5 à 6 réponses par question, points décroissants, somme ≈ 100.
   =====================================================================
 */

(function (global) {
  'use strict';

  global.SURVEY_QUESTIONS = [
  {
    "q": "Quel langage de programmation est le plus populaire selon toi ?",
    "answers": [
      {
        "text": "Python",
        "pts": 35,
        "aliases": [
          "py",
          "python3",
          "python 3"
        ]
      },
      {
        "text": "JavaScript",
        "pts": 25,
        "aliases": [
          "js",
          "javascript",
          "node",
          "node.js",
          "ecmascript"
        ]
      },
      {
        "text": "Java",
        "pts": 15,
        "aliases": [
          "jdk",
          "openjdk"
        ]
      },
      {
        "text": "C++",
        "pts": 10,
        "aliases": [
          "cpp",
          "c plus plus"
        ]
      },
      {
        "text": "PHP",
        "pts": 8,
        "aliases": [
          "hypertext preprocessor"
        ]
      },
      {
        "text": "C#",
        "pts": 7,
        "aliases": [
          "csharp",
          "c sharp",
          "dotnet",
          ".net"
        ]
      }
    ]
  },
  {
    "q": "Quel éditeur de code utilises-tu le plus ?",
    "answers": [
      {
        "text": "Visual Studio Code",
        "pts": 45,
        "aliases": [
          "vscode",
          "vs code",
          "visual studio code",
          "code"
        ]
      },
      {
        "text": "IntelliJ",
        "pts": 15,
        "aliases": [
          "idea",
          "intellij idea",
          "jetbrains"
        ]
      },
      {
        "text": "Sublime Text",
        "pts": 12,
        "aliases": [
          "sublime",
          "st"
        ]
      },
      {
        "text": "Vim",
        "pts": 10,
        "aliases": [
          "vi",
          "neovim",
          "nvim"
        ]
      },
      {
        "text": "Notepad++",
        "pts": 9,
        "aliases": [
          "notepad plus plus",
          "npp"
        ]
      },
      {
        "text": "Atom",
        "pts": 8,
        "aliases": []
      }
    ]
  },
  {
    "q": "Quel système d'exploitation tournes-tu au quotidien ?",
    "answers": [
      {
        "text": "Windows",
        "pts": 40,
        "aliases": [
          "win",
          "windows 10",
          "windows 11"
        ]
      },
      {
        "text": "macOS",
        "pts": 25,
        "aliases": [
          "mac",
          "os x",
          "mac os"
        ]
      },
      {
        "text": "Linux",
        "pts": 20,
        "aliases": [
          "ubuntu",
          "debian",
          "fedora",
          "arch",
          "gnu linux"
        ]
      },
      {
        "text": "ChromeOS",
        "pts": 8,
        "aliases": [
          "chromebook"
        ]
      },
      {
        "text": "Android",
        "pts": 5,
        "aliases": []
      },
      {
        "text": "iOS",
        "pts": 2,
        "aliases": [
          "iphone",
          "ipados"
        ]
      }
    ]
  },
  {
    "q": "Quel gestionnaire de versions utilises-tu ?",
    "answers": [
      {
        "text": "Git",
        "pts": 60,
        "aliases": [
          "github",
          "gitlab",
          "git hub"
        ]
      },
      {
        "text": "SVN",
        "pts": 15,
        "aliases": [
          "subversion"
        ]
      },
      {
        "text": "Mercurial",
        "pts": 10,
        "aliases": [
          "hg"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "pas de gestion",
          "rien"
        ]
      },
      {
        "text": "Perforce",
        "pts": 7,
        "aliases": [
          "p4"
        ]
      }
    ]
  },
  {
    "q": "Quelle base de données préfères-tu ?",
    "answers": [
      {
        "text": "MySQL",
        "pts": 30,
        "aliases": [
          "mysql",
          "mariadb"
        ]
      },
      {
        "text": "PostgreSQL",
        "pts": 25,
        "aliases": [
          "postgres",
          "pg"
        ]
      },
      {
        "text": "MongoDB",
        "pts": 20,
        "aliases": [
          "mongo",
          "nosql"
        ]
      },
      {
        "text": "SQLite",
        "pts": 12,
        "aliases": [
          "sqlite3"
        ]
      },
      {
        "text": "Redis",
        "pts": 8,
        "aliases": []
      },
      {
        "text": "Oracle",
        "pts": 5,
        "aliases": []
      }
    ]
  },
  {
    "q": "Quel navigateur web utilises-tu le plus ?",
    "answers": [
      {
        "text": "Google Chrome",
        "pts": 45,
        "aliases": [
          "chrome",
          "google chrome",
          "chromium"
        ]
      },
      {
        "text": "Firefox",
        "pts": 20,
        "aliases": [
          "mozilla firefox"
        ]
      },
      {
        "text": "Safari",
        "pts": 15,
        "aliases": []
      },
      {
        "text": "Microsoft Edge",
        "pts": 10,
        "aliases": [
          "edge"
        ]
      },
      {
        "text": "Brave",
        "pts": 6,
        "aliases": []
      },
      {
        "text": "Opera",
        "pts": 4,
        "aliases": []
      }
    ]
  },
  {
    "q": "Quelle est la spécialité Epitech la plus connue ?",
    "answers": [
      {
        "text": "Développement web",
        "pts": 30,
        "aliases": [
          "web",
          "full stack",
          "front end",
          "back end"
        ]
      },
      {
        "text": "Intelligence artificielle",
        "pts": 25,
        "aliases": [
          "ia",
          "ai",
          "machine learning",
          "deep learning"
        ]
      },
      {
        "text": "Cybersécurité",
        "pts": 20,
        "aliases": [
          "cyber securite",
          "securite",
          "security",
          "hacking"
        ]
      },
      {
        "text": "Data",
        "pts": 15,
        "aliases": [
          "big data",
          "data science",
          "analyse de donnees"
        ]
      },
      {
        "text": "Jeux video",
        "pts": 10,
        "aliases": [
          "jeu video",
          "gamedev",
          "unreal",
          "unity"
        ]
      }
    ]
  },
  {
    "q": "Quel projet Epitech t'a le plus marqué ?",
    "answers": [
      {
        "text": "42sh / shell",
        "pts": 25,
        "aliases": [
          "42sh",
          "minishell",
          "shell"
        ]
      },
      {
        "text": "RTYPE / arcade",
        "pts": 20,
        "aliases": [
          "rtype",
          "jeu d'arcade",
          "shmup"
        ]
      },
      {
        "text": "Push_swap",
        "pts": 18,
        "aliases": [
          "pushswap",
          "push swap"
        ]
      },
      {
        "text": "Philosophes",
        "pts": 15,
        "aliases": [
          "philo",
          "philosophe",
          "dining philosophers"
        ]
      },
      {
        "text": "MiniRT",
        "pts": 12,
        "aliases": [
          "minirt",
          "ray tracing",
          "raytracing"
        ]
      },
      {
        "text": "Libft",
        "pts": 10,
        "aliases": []
      }
    ]
  },
  {
    "q": "Où se situe le campus Epitech du Bénin ?",
    "answers": [
      {
        "text": "Cotonou",
        "pts": 70,
        "aliases": [
          "cotou",
          "kotonou"
        ]
      },
      {
        "text": "Porto-Novo",
        "pts": 15,
        "aliases": [
          "porto novo"
        ]
      },
      {
        "text": "Parakou",
        "pts": 8,
        "aliases": []
      },
      {
        "text": "Abomey-Calavi",
        "pts": 5,
        "aliases": [
          "calavi",
          "abomey calavi"
        ]
      },
      {
        "text": "Ouidah",
        "pts": 2,
        "aliases": []
      }
    ]
  },
  {
    "q": "Quel langage est enseigné en premier à Epitech ?",
    "answers": [
      {
        "text": "C",
        "pts": 55,
        "aliases": [
          "langage c",
          "ansi c"
        ]
      },
      {
        "text": "Python",
        "pts": 20,
        "aliases": [
          "py"
        ]
      },
      {
        "text": "C++",
        "pts": 12,
        "aliases": [
          "cpp"
        ]
      },
      {
        "text": "Ocaml",
        "pts": 8,
        "aliases": [
          "caml"
        ]
      },
      {
        "text": "Shell",
        "pts": 5,
        "aliases": [
          "bash",
          "zsh"
        ]
      }
    ]
  },
  {
    "q": "Quel est le surnom des élèves d'Epitech ?",
    "answers": [
      {
        "text": "Epitechiens",
        "pts": 45,
        "aliases": [
          "epitechien",
          "etudiant epitech"
        ]
      },
      {
        "text": "Epitechiennes",
        "pts": 25,
        "aliases": [
          "epitechienne"
        ]
      },
      {
        "text": "Piscinards",
        "pts": 15,
        "aliases": [
          "piscine",
          "piscinard"
        ]
      },
      {
        "text": "Geeks",
        "pts": 10,
        "aliases": [
          "geek"
        ]
      },
      {
        "text": "Hackers",
        "pts": 5,
        "aliases": []
      }
    ]
  },
  {
    "q": "Combien d'années dure le cursus Epitech ?",
    "answers": [
      {
        "text": "5",
        "pts": 60,
        "aliases": [
          "cinq",
          "5 ans",
          "cinq ans"
        ]
      },
      {
        "text": "3",
        "pts": 20,
        "aliases": [
          "trois",
          "3 ans"
        ]
      },
      {
        "text": "4",
        "pts": 10,
        "aliases": [
          "quatre"
        ]
      },
      {
        "text": "6",
        "pts": 4,
        "aliases": [
          "six"
        ]
      },
      {
        "text": "2",
        "pts": 3,
        "aliases": [
          "deux"
        ]
      }
    ]
  },
  {
    "q": "Quelle est la capitale politique du Bénin ?",
    "answers": [
      {
        "text": "Porto-Novo",
        "pts": 55,
        "aliases": [
          "porto novo",
          "porto-novo"
        ]
      },
      {
        "text": "Cotonou",
        "pts": 30,
        "aliases": [
          "cotou",
          "kotonou"
        ]
      },
      {
        "text": "Parakou",
        "pts": 8,
        "aliases": []
      },
      {
        "text": "Ouidah",
        "pts": 4,
        "aliases": []
      },
      {
        "text": "Abomey",
        "pts": 3,
        "aliases": []
      }
    ]
  },
  {
    "q": "Quelle monnaie utilise-t-on au Bénin ?",
    "answers": [
      {
        "text": "Franc CFA",
        "pts": 70,
        "aliases": [
          "cfa",
          "franc cfa",
          "xof",
          "f cfa"
        ]
      },
      {
        "text": "Euro",
        "pts": 12,
        "aliases": [
          "eur"
        ]
      },
      {
        "text": "Naira",
        "pts": 8,
        "aliases": [
          "ngn"
        ]
      },
      {
        "text": "Dollar",
        "pts": 6,
        "aliases": [
          "usd",
          "dollars"
        ]
      },
      {
        "text": "Cedi",
        "pts": 4,
        "aliases": [
          "ghs"
        ]
      }
    ]
  },
  {
    "q": "Quel est le plus grand marché en plein air du Bénin ?",
    "answers": [
      {
        "text": "Dantokpa",
        "pts": 55,
        "aliases": [
          "dan tokpa",
          "dantokpa market",
          "marché dantokpa"
        ]
      },
      {
        "text": "Azêlèkè",
        "pts": 15,
        "aliases": [
          "azeleke",
          "azèkè"
        ]
      },
      {
        "text": "Misserete",
        "pts": 12,
        "aliases": [
          "misserete"
        ]
      },
      {
        "text": "Ganhi",
        "pts": 10,
        "aliases": [
          "ganhi"
        ]
      },
      {
        "text": "Azerekete",
        "pts": 8,
        "aliases": [
          "azerekete"
        ]
      }
    ]
  },
  {
    "q": "Quelle spécialité culinaire béninoise est la plus connue ?",
    "answers": [
      {
        "text": "Pâte d'arachide",
        "pts": 30,
        "aliases": [
          "pate d'arachide",
          "pâte de arachide",
          "kpankou",
          "soumbara"
        ]
      },
      {
        "text": "Amiwo",
        "pts": 25,
        "aliases": [
          "ami wo",
          "maize dough"
        ]
      },
      {
        "text": "Yovo doko",
        "pts": 20,
        "aliases": [
          "beignet",
          "beignets",
          "doko"
        ]
      },
      {
        "text": "Aloko",
        "pts": 15,
        "aliases": [
          "plantain",
          "banane plante"
        ]
      },
      {
        "text": "Akassa",
        "pts": 10,
        "aliases": []
      }
    ]
  },
  {
    "q": "Quelle langue est la plus parlée au Bénin après le français ?",
    "answers": [
      {
        "text": "Fon",
        "pts": 40,
        "aliases": [
          "fongbe"
        ]
      },
      {
        "text": "Yoruba",
        "pts": 20,
        "aliases": [
          "yorouba"
        ]
      },
      {
        "text": "Bariba",
        "pts": 15,
        "aliases": [
          "baatonum"
        ]
      },
      {
        "text": "Dendi",
        "pts": 12,
        "aliases": []
      },
      {
        "text": "Adja",
        "pts": 8,
        "aliases": []
      },
      {
        "text": "Goun",
        "pts": 5,
        "aliases": []
      }
    ]
  },
  {
    "q": "Quel artiste béninois est le plus écouté ?",
    "answers": [
      {
        "text": "Angélique Kidjo",
        "pts": 40,
        "aliases": [
          "kidjo",
          "angelique kidjo"
        ]
      },
      {
        "text": "Sagbohan Danialou",
        "pts": 15,
        "aliases": [
          "danialou",
          "sagbohan"
        ]
      },
      {
        "text": "Séverin Vodounon",
        "pts": 14,
        "aliases": [
          "severin"
        ]
      },
      {
        "text": "Gael Adanle",
        "pts": 12,
        "aliases": [
          "gael"
        ]
      },
      {
        "text": "Richarliste",
        "pts": 10,
        "aliases": []
      },
      {
        "text": "Tchaoudjo",
        "pts": 8,
        "aliases": []
      }
    ]
  },
  {
    "q": "Où étudies-tu le plus souvent ?",
    "answers": [
      {
        "text": "Bibliothèque",
        "pts": 30,
        "aliases": [
          "biblio",
          "BU",
          "bibliotheque universitaire"
        ]
      },
      {
        "text": "Chez moi / dortoir",
        "pts": 25,
        "aliases": [
          "maison",
          "chambre",
          "chez soi",
          "foyer"
        ]
      },
      {
        "text": "Café",
        "pts": 18,
        "aliases": [
          "cafe",
          "starbucks"
        ]
      },
      {
        "text": "Parc / exterieur",
        "pts": 12,
        "aliases": [
          "parc",
          "extérieur",
          "dehors"
        ]
      },
      {
        "text": "Salle informatique",
        "pts": 10,
        "aliases": [
          "salle info",
          "labo",
          "tp"
        ]
      },
      {
        "text": "Bibliothèque universitaire",
        "pts": 5,
        "aliases": []
      }
    ]
  },
  {
    "q": "Quelle boisson bois-tu pour réviser tard le soir ?",
    "answers": [
      {
        "text": "Café",
        "pts": 40,
        "aliases": [
          "cafe",
          "expresso",
          "cafeine"
        ]
      },
      {
        "text": "Thé",
        "pts": 20,
        "aliases": [
          "the",
          "infusion"
        ]
      },
      {
        "text": "Eau",
        "pts": 15,
        "aliases": [
          "eau plate",
          "bouteille d'eau"
        ]
      },
      {
        "text": "Boisson énergisante",
        "pts": 12,
        "aliases": [
          "red bull",
          "energisant",
          "booster"
        ]
      },
      {
        "text": "Jus",
        "pts": 8,
        "aliases": [
          "jus de fruit"
        ]
      },
      {
        "text": "Soda",
        "pts": 5,
        "aliases": [
          "coca",
          "cola"
        ]
      }
    ]
  },
  {
    "q": "Combien d'heures dors-tu en moyenne par nuit pendant les cours ?",
    "answers": [
      {
        "text": "6",
        "pts": 35,
        "aliases": [
          "six",
          "6h",
          "6 heures"
        ]
      },
      {
        "text": "7",
        "pts": 25,
        "aliases": [
          "sept",
          "7h"
        ]
      },
      {
        "text": "5",
        "pts": 20,
        "aliases": [
          "cinq",
          "5h"
        ]
      },
      {
        "text": "8",
        "pts": 12,
        "aliases": [
          "huit",
          "8h"
        ]
      },
      {
        "text": "4",
        "pts": 8,
        "aliases": [
          "quatre",
          "4h"
        ]
      }
    ]
  },
  {
    "q": "Quel réseau social utilises-tu le plus ?",
    "answers": [
      {
        "text": "Instagram",
        "pts": 35,
        "aliases": [
          "insta",
          "ig"
        ]
      },
      {
        "text": "TikTok",
        "pts": 30,
        "aliases": [
          "tt",
          "tic toc"
        ]
      },
      {
        "text": "WhatsApp",
        "pts": 15,
        "aliases": [
          "wa",
          "whatsapp"
        ]
      },
      {
        "text": "Twitter/X",
        "pts": 10,
        "aliases": [
          "x",
          "twitter"
        ]
      },
      {
        "text": "Facebook",
        "pts": 6,
        "aliases": [
          "fb"
        ]
      },
      {
        "text": "Discord",
        "pts": 4,
        "aliases": []
      }
    ]
  },
  {
    "q": "Quel moyen de transport prends-tu pour aller au campus ?",
    "answers": [
      {
        "text": "Moto taxi",
        "pts": 35,
        "aliases": [
          "zemidjan",
          "zemi",
          "moto",
          "taxi moto"
        ]
      },
      {
        "text": "Marche a pied",
        "pts": 25,
        "aliases": [
          "marche",
          "a pied",
          "pieds"
        ]
      },
      {
        "text": "Bus",
        "pts": 15,
        "aliases": [
          "autobus"
        ]
      },
      {
        "text": "Voiture personnelle",
        "pts": 12,
        "aliases": [
          "auto",
          "ma voiture",
          "voiture"
        ]
      },
      {
        "text": "Velo",
        "pts": 8,
        "aliases": [
          "vélo",
          "bicyclette"
        ]
      },
      {
        "text": "Taxi",
        "pts": 5,
        "aliases": []
      }
    ]
  },
  {
    "q": "Quel est le plus grand océan de la Terre ?",
    "answers": [
      {
        "text": "Pacifique",
        "pts": 50,
        "aliases": [
          "ocean pacifique"
        ]
      },
      {
        "text": "Atlantique",
        "pts": 20,
        "aliases": []
      },
      {
        "text": "Indien",
        "pts": 15,
        "aliases": []
      },
      {
        "text": "Arctique",
        "pts": 10,
        "aliases": []
      },
      {
        "text": "Austral",
        "pts": 5,
        "aliases": [
          "antarctique",
          "glacial antarctique"
        ]
      }
    ]
  },
  {
    "q": "Quelle est la plus haute montagne du monde ?",
    "answers": [
      {
        "text": "Everest",
        "pts": 60,
        "aliases": [
          "mont everest"
        ]
      },
      {
        "text": "K2",
        "pts": 15,
        "aliases": [
          "chogori"
        ]
      },
      {
        "text": "Kilimandjaro",
        "pts": 12,
        "aliases": [
          "kili"
        ]
      },
      {
        "text": "Mont Blanc",
        "pts": 8,
        "aliases": []
      },
      {
        "text": "Aconcagua",
        "pts": 5,
        "aliases": []
      }
    ]
  },
  {
    "q": "Quelle planète est surnommée la planète rouge ?",
    "answers": [
      {
        "text": "Mars",
        "pts": 70,
        "aliases": []
      },
      {
        "text": "Vénus",
        "pts": 12,
        "aliases": [
          "venus"
        ]
      },
      {
        "text": "Jupiter",
        "pts": 8,
        "aliases": []
      },
      {
        "text": "Mercure",
        "pts": 6,
        "aliases": []
      },
      {
        "text": "Saturne",
        "pts": 4,
        "aliases": []
      }
    ]
  },
  {
    "q": "Qui a peint La Joconde ?",
    "answers": [
      {
        "text": "Léonard de Vinci",
        "pts": 65,
        "aliases": [
          "leonard de vinci",
          "da vinci",
          "leonardo da vinci"
        ]
      },
      {
        "text": "Michel-Ange",
        "pts": 12,
        "aliases": [
          "michelangelo"
        ]
      },
      {
        "text": "Raphaël",
        "pts": 10,
        "aliases": [
          "raphael"
        ]
      },
      {
        "text": "Rembrandt",
        "pts": 8,
        "aliases": []
      },
      {
        "text": "Monet",
        "pts": 5,
        "aliases": [
          "claude monet"
        ]
      }
    ]
  },
  {
    "q": "Quel est le plus grand pays du monde par sa superficie ?",
    "answers": [
      {
        "text": "Russie",
        "pts": 65,
        "aliases": [
          "federation de russie"
        ]
      },
      {
        "text": "Canada",
        "pts": 15,
        "aliases": []
      },
      {
        "text": "Chine",
        "pts": 10,
        "aliases": []
      },
      {
        "text": "Etats-Unis",
        "pts": 6,
        "aliases": [
          "usa",
          "etats unis",
          "amerique"
        ]
      },
      {
        "text": "Bresil",
        "pts": 4,
        "aliases": [
          "brésil",
          "brazil"
        ]
      }
    ]
  },
  {
    "q": "Dans quelle ville se tiennent les JO d'été 2024 ?",
    "answers": [
      {
        "text": "Paris",
        "pts": 75,
        "aliases": []
      },
      {
        "text": "Los Angeles",
        "pts": 10,
        "aliases": [
          "la"
        ]
      },
      {
        "text": "Tokyo",
        "pts": 7,
        "aliases": []
      },
      {
        "text": "Londres",
        "pts": 5,
        "aliases": []
      },
      {
        "text": "Rio",
        "pts": 3,
        "aliases": [
          "rio de janeiro"
        ]
      }
    ]
  },
  {
    "q": "Quel est l'element le plus abondant dans l'univers ?",
    "answers": [
      {
        "text": "Hydrogene",
        "pts": 70,
        "aliases": [
          "hydrogène",
          "h",
          "h2"
        ]
      },
      {
        "text": "Oxygene",
        "pts": 15,
        "aliases": [
          "oxygène",
          "o",
          "o2"
        ]
      },
      {
        "text": "Carbone",
        "pts": 8,
        "aliases": [
          "c"
        ]
      },
      {
        "text": "Fer",
        "pts": 4,
        "aliases": [
          "fe"
        ]
      },
      {
        "text": "Helium",
        "pts": 3,
        "aliases": [
          "hélium",
          "he"
        ]
      }
    ]
  },
  {
    "q": "Votre langage de programmation préféré ?",
    "answers": [
      {
        "text": "Python",
        "pts": 40,
        "aliases": [
          "py",
          "python3"
        ]
      },
      {
        "text": "JavaScript",
        "pts": 30,
        "aliases": [
          "js",
          "node",
          "ecmascript"
        ]
      },
      {
        "text": "Java",
        "pts": 15,
        "aliases": [
          "jdk",
          "openjdk"
        ]
      },
      {
        "text": "C++",
        "pts": 10,
        "aliases": [
          "cpp",
          "c plus plus"
        ]
      },
      {
        "text": "C#",
        "pts": 5,
        "aliases": [
          "csharp",
          "c sharp",
          ".net"
        ]
      }
    ]
  },
  {
    "q": "Votre projet Epitech préféré ?",
    "answers": [
      {
        "text": "42sh / shell",
        "pts": 45,
        "aliases": [
          "42sh",
          "minishell"
        ]
      },
      {
        "text": "RTYPE / arcade",
        "pts": 20,
        "aliases": [
          "rtype",
          "jeu d'arcade",
          "shmup"
        ]
      },
      {
        "text": "Push_swap",
        "pts": 15,
        "aliases": [
          "pushswap",
          "push swap"
        ]
      },
      {
        "text": "Philosophes",
        "pts": 12,
        "aliases": [
          "philo",
          "philosophe"
        ]
      },
      {
        "text": "MiniRT",
        "pts": 8,
        "aliases": [
          "minirt",
          "ray tracing"
        ]
      }
    ]
  },
  {
    "q": "La langue la plus parlée au Bénin ?",
    "answers": [
      {
        "text": "Français",
        "pts": 40,
        "aliases": [
          "francais",
          "fr",
          "france"
        ]
      },
      {
        "text": "Fon",
        "pts": 25,
        "aliases": [
          "fon",
          "fongbe"
        ]
      },
      {
        "text": "Yoruba",
        "pts": 15,
        "aliases": [
          "yoruba",
          "yorouba"
        ]
      },
      {
        "text": "Bariba",
        "pts": 12,
        "aliases": [
          "bariba"
        ]
      },
      {
        "text": "Dendi",
        "pts": 8,
        "aliases": [
          "dendi"
        ]
      }
    ]
  },
  {
    "q": "Votre heure de réveil étudiante ?",
    "answers": [
      {
        "text": "6h",
        "pts": 30,
        "aliases": [
          "6h",
          "matin",
          "tot"
        ]
      },
      {
        "text": "7h",
        "pts": 25,
        "aliases": [
          "7h",
          "lever"
        ]
      },
      {
        "text": "8h",
        "pts": 20,
        "aliases": [
          "8h",
          "cours"
        ]
      },
      {
        "text": "9h",
        "pts": 15,
        "aliases": [
          "9h",
          "tard"
        ]
      },
      {
        "text": "10h+",
        "pts": 10,
        "aliases": [
          "10h",
          "10h+",
          "grasse matinee"
        ]
      }
    ]
  },
  {
    "q": "Votre instrument de musique préféré ?",
    "answers": [
      {
        "text": "Piano",
        "pts": 40,
        "aliases": [
          "piano",
          "clavier"
        ]
      },
      {
        "text": "Guitare",
        "pts": 30,
        "aliases": [
          "guitare",
          "acoustique",
          "electrique"
        ]
      },
      {
        "text": "Batterie",
        "pts": 15,
        "aliases": [
          "batterie",
          "percussion"
        ]
      },
      {
        "text": "Violon",
        "pts": 10,
        "aliases": [
          "violon",
          "cordes"
        ]
      },
      {
        "text": "Flûte",
        "pts": 5,
        "aliases": [
          "flûte",
          "vent"
        ]
      }
    ]
  },
  {
    "q": "Votre framework front-end préféré ?",
    "answers": [
      {
        "text": "React",
        "pts": 30,
        "aliases": [
          "react",
          "reactjs"
        ]
      },
      {
        "text": "Vue",
        "pts": 25,
        "aliases": [
          "vue",
          "vuejs"
        ]
      },
      {
        "text": "Angular",
        "pts": 20,
        "aliases": [
          "angular",
          "angularjs"
        ]
      },
      {
        "text": "Svelte",
        "pts": 15,
        "aliases": [
          "svelte"
        ]
      },
      {
        "text": "Aucun",
        "pts": 10,
        "aliases": [
          "aucun",
          "rien",
          "pas de framework"
        ]
      }
    ]
  },
  {
    "q": "Votre binôme Epitech préféré ?",
    "answers": [
      {
        "text": "Aucun",
        "pts": 30,
        "aliases": [
          "aucun",
          "personne"
        ]
      },
      {
        "text": "Mon meilleur ami",
        "pts": 25,
        "aliases": [
          "ami",
          "pote"
        ]
      },
      {
        "text": "Un inconnu",
        "pts": 20,
        "aliases": [
          "inconnu",
          "etranger"
        ]
      },
      {
        "text": "Un camarade",
        "pts": 15,
        "aliases": [
          "camarade",
          "collègue"
        ]
      },
      {
        "text": "Moi-même",
        "pts": 10,
        "aliases": [
          "moi",
          "solo"
        ]
      }
    ]
  },
  {
    "q": "Votre vêtement traditionnel béninois ?",
    "answers": [
      {
        "text": "Boubou",
        "pts": 30,
        "aliases": [
          "boubou",
          "habit",
          "tenue"
        ]
      },
      {
        "text": "Kaba",
        "pts": 25,
        "aliases": [
          "kaba",
          "femme"
        ]
      },
      {
        "text": "Pagne",
        "pts": 20,
        "aliases": [
          "pagne",
          "tissu"
        ]
      },
      {
        "text": "Tapis",
        "pts": 15,
        "aliases": [
          "tapis"
        ]
      },
      {
        "text": "Aucun",
        "pts": 10,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre réseau social étudiant préféré ?",
    "answers": [
      {
        "text": "Instagram",
        "pts": 40,
        "aliases": [
          "instagram",
          "insta",
          "photos"
        ]
      },
      {
        "text": "TikTok",
        "pts": 25,
        "aliases": [
          "tiktok",
          "video",
          "court"
        ]
      },
      {
        "text": "WhatsApp",
        "pts": 15,
        "aliases": [
          "whatsapp",
          "msg",
          "groupe"
        ]
      },
      {
        "text": "Facebook",
        "pts": 12,
        "aliases": [
          "facebook",
          "fb",
          "reseau"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre planète préférée ?",
    "answers": [
      {
        "text": "Terre",
        "pts": 50,
        "aliases": [
          "terre",
          "maison",
          "vie"
        ]
      },
      {
        "text": "Mars",
        "pts": 20,
        "aliases": [
          "mars",
          "rouge",
          "rover"
        ]
      },
      {
        "text": "Jupiter",
        "pts": 12,
        "aliases": [
          "jupiter",
          "geante",
          "gazeuse"
        ]
      },
      {
        "text": "Saturne",
        "pts": 10,
        "aliases": [
          "saturne",
          "anneaux"
        ]
      },
      {
        "text": "Vénus",
        "pts": 8,
        "aliases": [
          "venus",
          "amour",
          "etoile du berger"
        ]
      }
    ]
  },
  {
    "q": "Votre langage typé préféré ?",
    "answers": [
      {
        "text": "TypeScript",
        "pts": 35,
        "aliases": [
          "typescript",
          "ts"
        ]
      },
      {
        "text": "Python",
        "pts": 30,
        "aliases": [
          "python",
          "py"
        ]
      },
      {
        "text": "Java",
        "pts": 15,
        "aliases": [
          "java"
        ]
      },
      {
        "text": "C#",
        "pts": 12,
        "aliases": [
          "csharp",
          "c sharp",
          ".net"
        ]
      },
      {
        "text": "Go",
        "pts": 8,
        "aliases": [
          "go",
          "golang"
        ]
      }
    ]
  },
  {
    "q": "Votre outil Epitech préféré ?",
    "answers": [
      {
        "text": "Git",
        "pts": 30,
        "aliases": [
          "git",
          "github"
        ]
      },
      {
        "text": "Linux",
        "pts": 25,
        "aliases": [
          "linux",
          "ubuntu"
        ]
      },
      {
        "text": "GCC",
        "pts": 20,
        "aliases": [
          "gcc",
          "compilateur"
        ]
      },
      {
        "text": "Make",
        "pts": 15,
        "aliases": [
          "make",
          "build"
        ]
      },
      {
        "text": "Vim",
        "pts": 10,
        "aliases": [
          "vim",
          "editeur"
        ]
      }
    ]
  },
  {
    "q": "Votre région béninoise préférée ?",
    "answers": [
      {
        "text": "Littoral",
        "pts": 35,
        "aliases": [
          "littoral",
          "cotou"
        ]
      },
      {
        "text": "Ouémé",
        "pts": 30,
        "aliases": [
          "oueme",
          "porto-novo"
        ]
      },
      {
        "text": "Plateau",
        "pts": 15,
        "aliases": [
          "plateau",
          "sakete"
        ]
      },
      {
        "text": "Collines",
        "pts": 12,
        "aliases": [
          "collines",
          "sava",
          "dassa"
        ]
      },
      {
        "text": "Borgou",
        "pts": 8,
        "aliases": [
          "borgou",
          "parakou"
        ]
      }
    ]
  },
  {
    "q": "Votre matière étudiant la plus difficile ?",
    "answers": [
      {
        "text": "Math",
        "pts": 45,
        "aliases": [
          "math",
          "difficile",
          "calcul"
        ]
      },
      {
        "text": "Physique",
        "pts": 20,
        "aliases": [
          "physique",
          "chimie"
        ]
      },
      {
        "text": "Algo",
        "pts": 15,
        "aliases": [
          "algo",
          "informatique",
          "code"
        ]
      },
      {
        "text": "Droit",
        "pts": 12,
        "aliases": [
          "droit",
          "loi"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre saison préférée ?",
    "answers": [
      {
        "text": "Printemps",
        "pts": 40,
        "aliases": [
          "printemps",
          "fleurs",
          "renaissance"
        ]
      },
      {
        "text": "Ete",
        "pts": 30,
        "aliases": [
          "ete",
          "soleil",
          "plage"
        ]
      },
      {
        "text": "Automne",
        "pts": 15,
        "aliases": [
          "automne",
          "feuilles",
          "couleurs"
        ]
      },
      {
        "text": "Hiver",
        "pts": 10,
        "aliases": [
          "hiver",
          "neige",
          "froid"
        ]
      },
      {
        "text": "Aucun",
        "pts": 5,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre éditeur de base de données préféré ?",
    "answers": [
      {
        "text": "phpMyAdmin",
        "pts": 35,
        "aliases": [
          "phpmyadmin",
          "mysql"
        ]
      },
      {
        "text": "pgAdmin",
        "pts": 25,
        "aliases": [
          "pgadmin",
          "postgres"
        ]
      },
      {
        "text": "MongoDB Compass",
        "pts": 20,
        "aliases": [
          "compass",
          "mongo"
        ]
      },
      {
        "text": "DBeaver",
        "pts": 12,
        "aliases": [
          "dbeaver",
          "universel"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre promotion Epitech préférée ?",
    "answers": [
      {
        "text": "2024",
        "pts": 35,
        "aliases": [
          "promo 2024"
        ]
      },
      {
        "text": "2025",
        "pts": 25,
        "aliases": [
          "promo 2025"
        ]
      },
      {
        "text": "2026",
        "pts": 20,
        "aliases": [
          "promo 2026"
        ]
      },
      {
        "text": "2027",
        "pts": 12,
        "aliases": [
          "promo 2027"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre boisson traditionnelle béninoise ?",
    "answers": [
      {
        "text": "Sodabi",
        "pts": 40,
        "aliases": [
          "sodabi",
          "vin de palme"
        ]
      },
      {
        "text": "Bissap",
        "pts": 30,
        "aliases": [
          "bissap",
          "hibiscus"
        ]
      },
      {
        "text": "Ginger",
        "pts": 15,
        "aliases": [
          "gingembre",
          "jus"
        ]
      },
      {
        "text": "Aucun",
        "pts": 10,
        "aliases": [
          "aucun",
          "rien"
        ]
      },
      {
        "text": "Autre",
        "pts": 5,
        "aliases": [
          "autre",
          "divers"
        ]
      }
    ]
  },
  {
    "q": "Votre moyen de paiement étudiant ?",
    "answers": [
      {
        "text": "Especes",
        "pts": 30,
        "aliases": [
          "especes",
          "cash"
        ]
      },
      {
        "text": "Carte",
        "pts": 25,
        "aliases": [
          "carte",
          "bancaire"
        ]
      },
      {
        "text": "Mobile Money",
        "pts": 20,
        "aliases": [
          "mobile money",
          "mtn",
          "moov"
        ]
      },
      {
        "text": "Virement",
        "pts": 15,
        "aliases": [
          "virement",
          "bic"
        ]
      },
      {
        "text": "Aucun",
        "pts": 10,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre sport d'hiver préféré ?",
    "answers": [
      {
        "text": "Ski",
        "pts": 50,
        "aliases": [
          "ski",
          "neige",
          "montagne"
        ]
      },
      {
        "text": "Patinage",
        "pts": 20,
        "aliases": [
          "patinage",
          "glace",
          "patinoire"
        ]
      },
      {
        "text": "Luge",
        "pts": 12,
        "aliases": [
          "luge",
          "descente"
        ]
      },
      {
        "text": "Snowboard",
        "pts": 10,
        "aliases": [
          "snowboard",
          "planche"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre éditeur de markdown préféré ?",
    "answers": [
      {
        "text": "Obsidian",
        "pts": 45,
        "aliases": [
          "obsidian",
          "notes"
        ]
      },
      {
        "text": "Notion",
        "pts": 20,
        "aliases": [
          "notion",
          "en ligne"
        ]
      },
      {
        "text": "Typora",
        "pts": 15,
        "aliases": [
          "typora",
          "editeur"
        ]
      },
      {
        "text": "Vim",
        "pts": 12,
        "aliases": [
          "vim",
          "terminal"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre langage Epitech pour le web ?",
    "answers": [
      {
        "text": "JavaScript",
        "pts": 40,
        "aliases": [
          "javascript",
          "web",
          "node"
        ]
      },
      {
        "text": "PHP",
        "pts": 30,
        "aliases": [
          "php",
          "laravel"
        ]
      },
      {
        "text": "Python",
        "pts": 15,
        "aliases": [
          "python",
          "django"
        ]
      },
      {
        "text": "C",
        "pts": 10,
        "aliases": [
          "c",
          "bas niveau"
        ]
      },
      {
        "text": "Aucun",
        "pts": 5,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre danse traditionnelle béninoise préférée ?",
    "answers": [
      {
        "text": "Sato",
        "pts": 30,
        "aliases": [
          "sato",
          "fon",
          "danse"
        ]
      },
      {
        "text": "Ganwi",
        "pts": 25,
        "aliases": [
          "ganwi",
          "adja"
        ]
      },
      {
        "text": "Zangbeto",
        "pts": 20,
        "aliases": [
          "zangbeto",
          "culte"
        ]
      },
      {
        "text": "Tchinkoume",
        "pts": 15,
        "aliases": [
          "tchinkoume",
          "nord"
        ]
      },
      {
        "text": "Aucun",
        "pts": 10,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre mode de transport étudiant ?",
    "answers": [
      {
        "text": "Bus",
        "pts": 40,
        "aliases": [
          "bus",
          "transport",
          "tc"
        ]
      },
      {
        "text": "Vélo",
        "pts": 30,
        "aliases": [
          "velo",
          "bicyclette"
        ]
      },
      {
        "text": "Marche",
        "pts": 15,
        "aliases": [
          "marche",
          "a pied"
        ]
      },
      {
        "text": "Moto",
        "pts": 10,
        "aliases": [
          "moto",
          "mobylette",
          "scooter"
        ]
      },
      {
        "text": "Aucun",
        "pts": 5,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Le plus grand océan ?",
    "answers": [
      {
        "text": "Pacifique",
        "pts": 35,
        "aliases": [
          "pacifique",
          "mer du sud"
        ]
      },
      {
        "text": "Atlantique",
        "pts": 25,
        "aliases": [
          "atlantique"
        ]
      },
      {
        "text": "Indien",
        "pts": 20,
        "aliases": [
          "indien",
          "mer des indes"
        ]
      },
      {
        "text": "Arctique",
        "pts": 12,
        "aliases": [
          "arctique",
          "nord"
        ]
      },
      {
        "text": "Austral",
        "pts": 8,
        "aliases": [
          "austral",
          "sud"
        ]
      }
    ]
  },
  {
    "q": "Votre éditeur de diagrammes préféré ?",
    "answers": [
      {
        "text": "Draw.io",
        "pts": 45,
        "aliases": [
          "draw.io",
          "diagrammes"
        ]
      },
      {
        "text": "Lucidchart",
        "pts": 20,
        "aliases": [
          "lucidchart",
          "en ligne"
        ]
      },
      {
        "text": "Miro",
        "pts": 15,
        "aliases": [
          "miro",
          "tableau"
        ]
      },
      {
        "text": "Excalidraw",
        "pts": 12,
        "aliases": [
          "excalidraw",
          "dessin"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "La spécialité Epitech la plus connue ?",
    "answers": [
      {
        "text": "Développement web",
        "pts": 50,
        "aliases": [
          "web",
          "full stack",
          "front end"
        ]
      },
      {
        "text": "Intelligence artificielle",
        "pts": 20,
        "aliases": [
          "ia",
          "ai",
          "machine learning"
        ]
      },
      {
        "text": "Cybersécurité",
        "pts": 12,
        "aliases": [
          "cyber",
          "securite",
          "hacking"
        ]
      },
      {
        "text": "Data",
        "pts": 10,
        "aliases": [
          "data",
          "big data",
          "data science"
        ]
      },
      {
        "text": "Jeux vidéo",
        "pts": 8,
        "aliases": [
          "jeux",
          "gamedev",
          "unity"
        ]
      }
    ]
  },
  {
    "q": "Votre sport préféré au Bénin ?",
    "answers": [
      {
        "text": "Football",
        "pts": 40,
        "aliases": [
          "football",
          "foot",
          "soccer"
        ]
      },
      {
        "text": "Athlétisme",
        "pts": 30,
        "aliases": [
          "athletisme",
          "course"
        ]
      },
      {
        "text": "Boxe",
        "pts": 15,
        "aliases": [
          "boxe",
          "combat"
        ]
      },
      {
        "text": "Lutte",
        "pts": 10,
        "aliases": [
          "lutte",
          "traditionnelle"
        ]
      },
      {
        "text": "Aucun",
        "pts": 5,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre snack étudiant préféré ?",
    "answers": [
      {
        "text": "Sandwich",
        "pts": 30,
        "aliases": [
          "sandwich",
          "rapide",
          "faim"
        ]
      },
      {
        "text": "Fruit",
        "pts": 25,
        "aliases": [
          "fruit",
          "pomme",
          "banane"
        ]
      },
      {
        "text": "Barre céréales",
        "pts": 20,
        "aliases": [
          "barre",
          "energie",
          "sport"
        ]
      },
      {
        "text": "Yaourt",
        "pts": 15,
        "aliases": [
          "yaourt",
          "laitage"
        ]
      },
      {
        "text": "Aucun",
        "pts": 10,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Le plus grand désert ?",
    "answers": [
      {
        "text": "Sahara",
        "pts": 50,
        "aliases": [
          "sahara",
          "afrique",
          "sable"
        ]
      },
      {
        "text": "Arabie",
        "pts": 20,
        "aliases": [
          "arabie",
          "moyen-orient"
        ]
      },
      {
        "text": "Gobi",
        "pts": 12,
        "aliases": [
          "gobi",
          "asie",
          "chine"
        ]
      },
      {
        "text": "Arctique",
        "pts": 10,
        "aliases": [
          "arctique",
          "nord",
          "glace"
        ]
      },
      {
        "text": "Kalahari",
        "pts": 8,
        "aliases": [
          "kalahari",
          "afrique australe"
        ]
      }
    ]
  },
  {
    "q": "Votre éditeur de code principal ?",
    "answers": [
      {
        "text": "Visual Studio Code",
        "pts": 40,
        "aliases": [
          "vscode",
          "vs code",
          "code"
        ]
      },
      {
        "text": "IntelliJ",
        "pts": 30,
        "aliases": [
          "idea",
          "intellij",
          "jetbrains"
        ]
      },
      {
        "text": "Vim",
        "pts": 15,
        "aliases": [
          "vim",
          "vi",
          "nvim"
        ]
      },
      {
        "text": "Sublime Text",
        "pts": 10,
        "aliases": [
          "sublime",
          "st"
        ]
      },
      {
        "text": "Notepad++",
        "pts": 5,
        "aliases": [
          "notepad++",
          "npp"
        ]
      }
    ]
  },
  {
    "q": "La piscine Epitech, c'est ?",
    "answers": [
      {
        "text": "Difficile",
        "pts": 50,
        "aliases": [
          "difficile",
          "hardcore"
        ]
      },
      {
        "text": "Intense",
        "pts": 20,
        "aliases": [
          "intense",
          "formation"
        ]
      },
      {
        "text": "Passionnante",
        "pts": 12,
        "aliases": [
          "passionnante",
          "super"
        ]
      },
      {
        "text": "Épuisante",
        "pts": 10,
        "aliases": [
          "epuisante",
          "fatiguant"
        ]
      },
      {
        "text": "Inoubliable",
        "pts": 8,
        "aliases": [
          "inoubliable",
          "marquant"
        ]
      }
    ]
  },
  {
    "q": "Votre instrument béninois préféré ?",
    "answers": [
      {
        "text": "Tambour",
        "pts": 50,
        "aliases": [
          "tambour",
          "tam-tam",
          "djembe"
        ]
      },
      {
        "text": "Sanza",
        "pts": 20,
        "aliases": [
          "sanza",
          "piano a pouces"
        ]
      },
      {
        "text": "Balafon",
        "pts": 12,
        "aliases": [
          "balafon",
          "xylophone"
        ]
      },
      {
        "text": "Kora",
        "pts": 10,
        "aliases": [
          "kora",
          "harpe"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre budget étudiant mensuel ?",
    "answers": [
      {
        "text": "Moins de 100€",
        "pts": 50,
        "aliases": [
          "moins100",
          "petit budget",
          "faible"
        ]
      },
      {
        "text": "100-300€",
        "pts": 20,
        "aliases": [
          "100-300",
          "moyen"
        ]
      },
      {
        "text": "300-500€",
        "pts": 12,
        "aliases": [
          "300-500",
          "confortable"
        ]
      },
      {
        "text": "500€+",
        "pts": 10,
        "aliases": [
          "500€+",
          "plus500",
          "aise"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre cuisine du monde préférée ?",
    "answers": [
      {
        "text": "Italienne",
        "pts": 30,
        "aliases": [
          "italienne",
          "pizza",
          "pates"
        ]
      },
      {
        "text": "Japonaise",
        "pts": 25,
        "aliases": [
          "japonaise",
          "sushi",
          "ramen"
        ]
      },
      {
        "text": "Française",
        "pts": 20,
        "aliases": [
          "francaise",
          "baguette",
          "fromage"
        ]
      },
      {
        "text": "Indienne",
        "pts": 15,
        "aliases": [
          "indienne",
          "curry",
          "epices"
        ]
      },
      {
        "text": "Mexicaine",
        "pts": 10,
        "aliases": [
          "mexicaine",
          "tacos",
          "burrito"
        ]
      }
    ]
  },
  {
    "q": "Votre plateforme cloud favorite ?",
    "answers": [
      {
        "text": "AWS",
        "pts": 50,
        "aliases": [
          "aws",
          "amazon web services"
        ]
      },
      {
        "text": "Azure",
        "pts": 20,
        "aliases": [
          "azure",
          "microsoft azure"
        ]
      },
      {
        "text": "Google Cloud",
        "pts": 12,
        "aliases": [
          "gcp",
          "google cloud"
        ]
      },
      {
        "text": "OVH",
        "pts": 10,
        "aliases": [
          "ovh",
          "ovhcloud"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien",
          "on-premise"
        ]
      }
    ]
  },
  {
    "q": "Votre projet de fin d'études ?",
    "answers": [
      {
        "text": "Stage",
        "pts": 50,
        "aliases": [
          "stage",
          "entreprise"
        ]
      },
      {
        "text": "Projet personnel",
        "pts": 20,
        "aliases": [
          "projet",
          "portfolio"
        ]
      },
      {
        "text": "Startup",
        "pts": 12,
        "aliases": [
          "startup",
          "creation"
        ]
      },
      {
        "text": "Freelance",
        "pts": 10,
        "aliases": [
          "freelance",
          "independant"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre ethnie béninoise préférée ?",
    "answers": [
      {
        "text": "Fon",
        "pts": 50,
        "aliases": [
          "fon",
          "fongbe"
        ]
      },
      {
        "text": "Yoruba",
        "pts": 20,
        "aliases": [
          "yoruba",
          "yorouba"
        ]
      },
      {
        "text": "Bariba",
        "pts": 12,
        "aliases": [
          "bariba"
        ]
      },
      {
        "text": "Adja",
        "pts": 10,
        "aliases": [
          "adja"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre moyen de révision préféré ?",
    "answers": [
      {
        "text": "Fiches",
        "pts": 40,
        "aliases": [
          "fiches",
          "revision"
        ]
      },
      {
        "text": "Cours",
        "pts": 25,
        "aliases": [
          "cours",
          "polycopie"
        ]
      },
      {
        "text": "Annales",
        "pts": 15,
        "aliases": [
          "annales",
          "sujets"
        ]
      },
      {
        "text": "Vidéos",
        "pts": 12,
        "aliases": [
          "videos",
          "youtube"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre boisson chaude préférée ?",
    "answers": [
      {
        "text": "Café",
        "pts": 40,
        "aliases": [
          "cafe",
          "caffeine",
          "matin"
        ]
      },
      {
        "text": "Thé",
        "pts": 25,
        "aliases": [
          "the",
          "infusion",
          "soir"
        ]
      },
      {
        "text": "Chocolat",
        "pts": 15,
        "aliases": [
          "chocolat",
          "cacao",
          "sucre"
        ]
      },
      {
        "text": "Tisane",
        "pts": 12,
        "aliases": [
          "tisane",
          "plantes",
          "detente"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre gestionnaire de paquets préféré ?",
    "answers": [
      {
        "text": "npm",
        "pts": 45,
        "aliases": [
          "npm",
          "node"
        ]
      },
      {
        "text": "pip",
        "pts": 20,
        "aliases": [
          "pip",
          "python"
        ]
      },
      {
        "text": "maven",
        "pts": 15,
        "aliases": [
          "maven",
          "java"
        ]
      },
      {
        "text": "composer",
        "pts": 12,
        "aliases": [
          "composer",
          "php"
        ]
      },
      {
        "text": "cargo",
        "pts": 8,
        "aliases": [
          "cargo",
          "rust"
        ]
      }
    ]
  },
  {
    "q": "Votre salle Epitech préférée ?",
    "answers": [
      {
        "text": "Salle A",
        "pts": 40,
        "aliases": [
          "salle a"
        ]
      },
      {
        "text": "Salle B",
        "pts": 30,
        "aliases": [
          "salle b"
        ]
      },
      {
        "text": "Salle C",
        "pts": 15,
        "aliases": [
          "salle c"
        ]
      },
      {
        "text": "Salle D",
        "pts": 10,
        "aliases": [
          "salle d"
        ]
      },
      {
        "text": "Salle E",
        "pts": 5,
        "aliases": [
          "salle e"
        ]
      }
    ]
  },
  {
    "q": "Votre ville béninoise du sud ?",
    "answers": [
      {
        "text": "Cotonou",
        "pts": 45,
        "aliases": [
          "cotonou",
          "littoral"
        ]
      },
      {
        "text": "Ouidah",
        "pts": 20,
        "aliases": [
          "ouidah",
          "histoire"
        ]
      },
      {
        "text": "Grand-Popo",
        "pts": 15,
        "aliases": [
          "grand-popo",
          "plage"
        ]
      },
      {
        "text": "Aplahoue",
        "pts": 12,
        "aliases": [
          "aplahoue",
          "couffo"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre activité étudiante préférée ?",
    "answers": [
      {
        "text": "Sortie",
        "pts": 35,
        "aliases": [
          "sortie",
          "amis",
          "soiree"
        ]
      },
      {
        "text": "Sport",
        "pts": 30,
        "aliases": [
          "sport",
          "salle",
          "foot"
        ]
      },
      {
        "text": "Fete",
        "pts": 15,
        "aliases": [
          "fete",
          "musique"
        ]
      },
      {
        "text": "Etude",
        "pts": 12,
        "aliases": [
          "etude",
          "bibliotheque"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre compositeur préféré ?",
    "answers": [
      {
        "text": "Mozart",
        "pts": 35,
        "aliases": [
          "mozart",
          "musique classique"
        ]
      },
      {
        "text": "Beethoven",
        "pts": 30,
        "aliases": [
          "beethoven",
          "symphonie"
        ]
      },
      {
        "text": "Bach",
        "pts": 15,
        "aliases": [
          "bach",
          "orgue",
          "baroque"
        ]
      },
      {
        "text": "Vivaldi",
        "pts": 12,
        "aliases": [
          "vivaldi",
          "quatre saisons"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre langage de templates préféré ?",
    "answers": [
      {
        "text": "Jinja",
        "pts": 40,
        "aliases": [
          "jinja",
          "python"
        ]
      },
      {
        "text": "Blade",
        "pts": 25,
        "aliases": [
          "blade",
          "laravel"
        ]
      },
      {
        "text": "Twig",
        "pts": 15,
        "aliases": [
          "twig",
          "php"
        ]
      },
      {
        "text": "Handlebars",
        "pts": 12,
        "aliases": [
          "handlebars",
          "node"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre projet Epitech le plus long ?",
    "answers": [
      {
        "text": "MiniRT",
        "pts": 40,
        "aliases": [
          "minirt",
          "long",
          "graphisme"
        ]
      },
      {
        "text": "Philosophes",
        "pts": 25,
        "aliases": [
          "philo",
          "reflexion"
        ]
      },
      {
        "text": "Push_swap",
        "pts": 15,
        "aliases": [
          "pushswap",
          "algo"
        ]
      },
      {
        "text": "42sh",
        "pts": 12,
        "aliases": [
          "42sh",
          "shell"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre temps de sommeil étudiant ?",
    "answers": [
      {
        "text": "5h",
        "pts": 40,
        "aliases": [
          "5h",
          "peu",
          "fatigue"
        ]
      },
      {
        "text": "6h",
        "pts": 25,
        "aliases": [
          "6h",
          "moyen"
        ]
      },
      {
        "text": "7h",
        "pts": 15,
        "aliases": [
          "7h",
          "normal"
        ]
      },
      {
        "text": "8h",
        "pts": 12,
        "aliases": [
          "8h",
          "bonne nuit"
        ]
      },
      {
        "text": "4h-",
        "pts": 8,
        "aliases": [
          "4h",
          "tres peu",
          "4h-"
        ]
      }
    ]
  },
  {
    "q": "Votre langage Epitech le plus moderne ?",
    "answers": [
      {
        "text": "Rust",
        "pts": 50,
        "aliases": [
          "rust",
          "moderne"
        ]
      },
      {
        "text": "TypeScript",
        "pts": 20,
        "aliases": [
          "typescript",
          "web"
        ]
      },
      {
        "text": "Go",
        "pts": 12,
        "aliases": [
          "go",
          "google"
        ]
      },
      {
        "text": "Kotlin",
        "pts": 10,
        "aliases": [
          "kotlin",
          "android"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre boisson béninoise préférée ?",
    "answers": [
      {
        "text": "Sodabi",
        "pts": 40,
        "aliases": [
          "sodabi",
          "alcool",
          "vin de palme"
        ]
      },
      {
        "text": "Bière",
        "pts": 30,
        "aliases": [
          "biere",
          "lager",
          "pils"
        ]
      },
      {
        "text": "Jus de bissap",
        "pts": 15,
        "aliases": [
          "bissap",
          "jus",
          "hibiscus"
        ]
      },
      {
        "text": "Eau",
        "pts": 10,
        "aliases": [
          "eau",
          "minerale"
        ]
      },
      {
        "text": "Aucun",
        "pts": 5,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre matière étudiante préférée ?",
    "answers": [
      {
        "text": "Math",
        "pts": 40,
        "aliases": [
          "math",
          "algo",
          "calcul"
        ]
      },
      {
        "text": "Informatique",
        "pts": 30,
        "aliases": [
          "informatique",
          "code",
          "dev"
        ]
      },
      {
        "text": "Histoire",
        "pts": 15,
        "aliases": [
          "histoire",
          "guerre",
          "dates"
        ]
      },
      {
        "text": "Anglais",
        "pts": 10,
        "aliases": [
          "anglais",
          "langue",
          "langue vivante"
        ]
      },
      {
        "text": "Sport",
        "pts": 5,
        "aliases": [
          "sport",
          "foot"
        ]
      }
    ]
  },
  {
    "q": "Votre projet Epitech le plus difficile ?",
    "answers": [
      {
        "text": "Philosophes",
        "pts": 40,
        "aliases": [
          "philo",
          "dining philosophers"
        ]
      },
      {
        "text": "MiniRT",
        "pts": 30,
        "aliases": [
          "minirt",
          "raytracing"
        ]
      },
      {
        "text": "Push_swap",
        "pts": 15,
        "aliases": [
          "pushswap",
          "push swap"
        ]
      },
      {
        "text": "42sh",
        "pts": 10,
        "aliases": [
          "42sh",
          "minishell"
        ]
      },
      {
        "text": "RTYPE",
        "pts": 5,
        "aliases": [
          "rtype",
          "arcade"
        ]
      }
    ]
  },
  {
    "q": "Votre symbole béninois préféré ?",
    "answers": [
      {
        "text": "L'étoile",
        "pts": 40,
        "aliases": [
          "etoile",
          "benin",
          "bj"
        ]
      },
      {
        "text": "Le drapeau",
        "pts": 30,
        "aliases": [
          "drapeau",
          "tricolore"
        ]
      },
      {
        "text": "L'arbre à palabres",
        "pts": 15,
        "aliases": [
          "palabre",
          "arbre",
          "conseil",
          "village"
        ]
      },
      {
        "text": "Le sable",
        "pts": 10,
        "aliases": [
          "sable",
          "desert"
        ]
      },
      {
        "text": "Aucun",
        "pts": 5,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre jour de cours préféré ?",
    "answers": [
      {
        "text": "Lundi",
        "pts": 45,
        "aliases": [
          "lundi",
          "debut",
          "semaine"
        ]
      },
      {
        "text": "Mardi",
        "pts": 20,
        "aliases": [
          "mardi"
        ]
      },
      {
        "text": "Mercredi",
        "pts": 15,
        "aliases": [
          "mercredi",
          "milieu"
        ]
      },
      {
        "text": "Jeudi",
        "pts": 12,
        "aliases": [
          "jeudi"
        ]
      },
      {
        "text": "Vendredi",
        "pts": 8,
        "aliases": [
          "vendredi",
          "fin",
          "weekend"
        ]
      }
    ]
  },
  {
    "q": "Votre instrument de musique à cordes préféré ?",
    "answers": [
      {
        "text": "Guitare",
        "pts": 40,
        "aliases": [
          "guitare",
          "cordes",
          "acoustique"
        ]
      },
      {
        "text": "Piano",
        "pts": 25,
        "aliases": [
          "piano",
          "touches",
          "clavier"
        ]
      },
      {
        "text": "Violon",
        "pts": 15,
        "aliases": [
          "violon",
          "archet"
        ]
      },
      {
        "text": "Harpe",
        "pts": 12,
        "aliases": [
          "harpe",
          "angélique"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Le symbole Epitech le plus connu ?",
    "answers": [
      {
        "text": "Le 'E'",
        "pts": 35,
        "aliases": [
          "e",
          "logo"
        ]
      },
      {
        "text": "La piscine",
        "pts": 25,
        "aliases": [
          "piscine",
          "formation"
        ]
      },
      {
        "text": "Les projets",
        "pts": 20,
        "aliases": [
          "projets",
          "42",
          "rendu"
        ]
      },
      {
        "text": "Le réseau",
        "pts": 12,
        "aliases": [
          "reseau",
          "alumni"
        ]
      },
      {
        "text": "Les notes",
        "pts": 8,
        "aliases": [
          "notes",
          "moyenne"
        ]
      }
    ]
  },
  {
    "q": "Votre plat de rue béninois ?",
    "answers": [
      {
        "text": "Yovo doko",
        "pts": 30,
        "aliases": [
          "yovo doko",
          "beignet",
          "rue"
        ]
      },
      {
        "text": "Amiwo",
        "pts": 25,
        "aliases": [
          "amiwo",
          "mais",
          "bouillie"
        ]
      },
      {
        "text": "Pâté",
        "pts": 20,
        "aliases": [
          "pate",
          "sauce"
        ]
      },
      {
        "text": "Djèwô",
        "pts": 15,
        "aliases": [
          "djewo",
          "haricot"
        ]
      },
      {
        "text": "Aucun",
        "pts": 10,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre nom de resto U préféré ?",
    "answers": [
      {
        "text": "Resto U",
        "pts": 40,
        "aliases": [
          "resto u",
          "restaurant universitaire"
        ]
      },
      {
        "text": "Cafétéria",
        "pts": 30,
        "aliases": [
          "cafétéria",
          "self"
        ]
      },
      {
        "text": "Self",
        "pts": 15,
        "aliases": [
          "rapide"
        ]
      },
      {
        "text": "Snack",
        "pts": 10,
        "aliases": [
          "snack"
        ]
      },
      {
        "text": "Aucun",
        "pts": 5,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre légume préféré ?",
    "answers": [
      {
        "text": "Tomate",
        "pts": 45,
        "aliases": [
          "tomate",
          "rouge",
          "salade"
        ]
      },
      {
        "text": "Carotte",
        "pts": 20,
        "aliases": [
          "carotte",
          "orange",
          "vitamine"
        ]
      },
      {
        "text": "Pomme de terre",
        "pts": 15,
        "aliases": [
          "pomme de terre",
          "feculent",
          "frite"
        ]
      },
      {
        "text": "Brocoli",
        "pts": 12,
        "aliases": [
          "brocoli",
          "vert",
          "sante"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre projet Epitech le plus amusant ?",
    "answers": [
      {
        "text": "RTYPE",
        "pts": 40,
        "aliases": [
          "rtype",
          "arcade",
          "fun"
        ]
      },
      {
        "text": "Push_swap",
        "pts": 25,
        "aliases": [
          "pushswap",
          "algo"
        ]
      },
      {
        "text": "Philosophes",
        "pts": 15,
        "aliases": [
          "philo",
          "reflexion"
        ]
      },
      {
        "text": "MiniRT",
        "pts": 12,
        "aliases": [
          "minirt",
          "graphisme"
        ]
      },
      {
        "text": "42sh",
        "pts": 8,
        "aliases": [
          "42sh",
          "shell"
        ]
      }
    ]
  },
  {
    "q": "Votre boisson de fête béninoise ?",
    "answers": [
      {
        "text": "Sodabi",
        "pts": 50,
        "aliases": [
          "sodabi",
          "alcool"
        ]
      },
      {
        "text": "Bière",
        "pts": 20,
        "aliases": [
          "biere",
          "fete"
        ]
      },
      {
        "text": "Bissap",
        "pts": 12,
        "aliases": [
          "bissap",
          "jus"
        ]
      },
      {
        "text": "Aucun",
        "pts": 10,
        "aliases": [
          "aucun",
          "rien"
        ]
      },
      {
        "text": "Autre",
        "pts": 8,
        "aliases": [
          "autre",
          "divers"
        ]
      }
    ]
  },
  {
    "q": "Votre repas étudiant préféré ?",
    "answers": [
      {
        "text": "Resto U",
        "pts": 40,
        "aliases": [
          "resto u",
          "cantine",
          "universite"
        ]
      },
      {
        "text": "Sandwich",
        "pts": 25,
        "aliases": [
          "sandwich",
          "rapide"
        ]
      },
      {
        "text": "Pâtes",
        "pts": 15,
        "aliases": [
          "pates",
          "nourriture"
        ]
      },
      {
        "text": "Pizza",
        "pts": 12,
        "aliases": [
          "pizza",
          "italien"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Le pays le plus peuplé du monde ?",
    "answers": [
      {
        "text": "Inde",
        "pts": 30,
        "aliases": [
          "inde",
          "bharat"
        ]
      },
      {
        "text": "Chine",
        "pts": 25,
        "aliases": [
          "chine",
          "pekin"
        ]
      },
      {
        "text": "États-Unis",
        "pts": 20,
        "aliases": [
          "etats-unis",
          "usa",
          "amerique"
        ]
      },
      {
        "text": "Indonésie",
        "pts": 15,
        "aliases": [
          "indonesie",
          "jakarta"
        ]
      },
      {
        "text": "Pakistan",
        "pts": 10,
        "aliases": [
          "pakistan",
          "islamabad"
        ]
      }
    ]
  },
  {
    "q": "Votre exam Epitech préféré ?",
    "answers": [
      {
        "text": "Rendu",
        "pts": 45,
        "aliases": [
          "rendu",
          "projet final"
        ]
      },
      {
        "text": "Projet",
        "pts": 20,
        "aliases": [
          "projet",
          "noté"
        ]
      },
      {
        "text": "Partiel",
        "pts": 15,
        "aliases": [
          "partiel",
          "ecrit"
        ]
      },
      {
        "text": "Control continu",
        "pts": 12,
        "aliases": [
          "controle continu",
          "cc"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre plat béninois préféré ?",
    "answers": [
      {
        "text": "Pâté",
        "pts": 40,
        "aliases": [
          "pate",
          "pâte",
          "sauce arachide"
        ]
      },
      {
        "text": "Amiwo",
        "pts": 30,
        "aliases": [
          "amiwo",
          "mais",
          "bouillie"
        ]
      },
      {
        "text": "Djèwô",
        "pts": 15,
        "aliases": [
          "djewo",
          "haricot",
          "piment"
        ]
      },
      {
        "text": "Fufu",
        "pts": 10,
        "aliases": [
          "fufu",
          "igname",
          "cassava"
        ]
      },
      {
        "text": "Yovo doko",
        "pts": 5,
        "aliases": [
          "yovo doko",
          "beignet",
          "haricots"
        ]
      }
    ]
  },
  {
    "q": "Votre lieu de sortie étudiant ?",
    "answers": [
      {
        "text": "Bar",
        "pts": 40,
        "aliases": [
          "bar",
          "soiree",
          "verre"
        ]
      },
      {
        "text": "Cinéma",
        "pts": 30,
        "aliases": [
          "cinema",
          "film",
          "salle"
        ]
      },
      {
        "text": "Parc",
        "pts": 15,
        "aliases": [
          "parc",
          "jardin",
          "detente"
        ]
      },
      {
        "text": "Chez soi",
        "pts": 10,
        "aliases": [
          "chez soi",
          "maison",
          "soiree privee"
        ]
      },
      {
        "text": "Aucun",
        "pts": 5,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre livre préféré ?",
    "answers": [
      {
        "text": "Roman",
        "pts": 45,
        "aliases": [
          "roman",
          "litterature"
        ]
      },
      {
        "text": "Bande dessinée",
        "pts": 20,
        "aliases": [
          "bd",
          "comics",
          "bande dessinée"
        ]
      },
      {
        "text": "Manga",
        "pts": 15,
        "aliases": [
          "manga",
          "japonais"
        ]
      },
      {
        "text": "Poésie",
        "pts": 12,
        "aliases": [
          "poesie",
          "vers",
          "rimes"
        ]
      },
      {
        "text": "Essai",
        "pts": 8,
        "aliases": [
          "essai",
          "philosophie"
        ]
      }
    ]
  },
  {
    "q": "Votre langage Epitech pour l'IA ?",
    "answers": [
      {
        "text": "Python",
        "pts": 40,
        "aliases": [
          "python",
          "ia",
          "ml"
        ]
      },
      {
        "text": "C",
        "pts": 25,
        "aliases": [
          "c",
          "base"
        ]
      },
      {
        "text": "C++",
        "pts": 15,
        "aliases": [
          "cpp",
          "performance"
        ]
      },
      {
        "text": "Ocaml",
        "pts": 12,
        "aliases": [
          "ocaml",
          "fonctionnel"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre marché béninois préféré ?",
    "answers": [
      {
        "text": "Dantokpa",
        "pts": 45,
        "aliases": [
          "dantokpa",
          "grand marche"
        ]
      },
      {
        "text": "Azêlê",
        "pts": 20,
        "aliases": [
          "azele",
          "azêlê"
        ]
      },
      {
        "text": "Gbotèdè",
        "pts": 15,
        "aliases": [
          "gbotede",
          "marche"
        ]
      },
      {
        "text": "Aguégués",
        "pts": 12,
        "aliases": [
          "aguegues",
          "lac"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre période historique préférée ?",
    "answers": [
      {
        "text": "Antiquité",
        "pts": 35,
        "aliases": [
          "antiquite",
          "rome",
          "grece"
        ]
      },
      {
        "text": "Moyen Âge",
        "pts": 30,
        "aliases": [
          "moyen age",
          "chevaliers",
          "chateau"
        ]
      },
      {
        "text": "Renaissance",
        "pts": 15,
        "aliases": [
          "renaissance",
          "art",
          "leonard"
        ]
      },
      {
        "text": "Révolution",
        "pts": 12,
        "aliases": [
          "revolution",
          "1789",
          "liberte"
        ]
      },
      {
        "text": "Époque moderne",
        "pts": 8,
        "aliases": [
          "moderne",
          "industrie"
        ]
      }
    ]
  },
  {
    "q": "Le campus Epitech du Bénin ?",
    "answers": [
      {
        "text": "Cotonou",
        "pts": 40,
        "aliases": [
          "cotonou",
          "kotou"
        ]
      },
      {
        "text": "Porto-Novo",
        "pts": 25,
        "aliases": [
          "porto-novo",
          "porto novo"
        ]
      },
      {
        "text": "Parakou",
        "pts": 15,
        "aliases": [
          "parakou"
        ]
      },
      {
        "text": "Abomey-Calavi",
        "pts": 12,
        "aliases": [
          "calavi",
          "abomey calavi"
        ]
      },
      {
        "text": "Ouidah",
        "pts": 8,
        "aliases": [
          "ouidah"
        ]
      }
    ]
  },
  {
    "q": "Votre spécialité culinaire béninoise ?",
    "answers": [
      {
        "text": "Pâté en sauce",
        "pts": 40,
        "aliases": [
          "pate",
          "pâte",
          "sauce arachide"
        ]
      },
      {
        "text": "Amiwo",
        "pts": 25,
        "aliases": [
          "amiwo",
          "mais",
          "bouillie"
        ]
      },
      {
        "text": "Djèwô",
        "pts": 15,
        "aliases": [
          "djewo",
          "haricot",
          "piment"
        ]
      },
      {
        "text": "Yovo doko",
        "pts": 12,
        "aliases": [
          "yovo doko",
          "beignet",
          "haricots"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre élément préféré ?",
    "answers": [
      {
        "text": "Feu",
        "pts": 35,
        "aliases": [
          "feu",
          "flamme",
          "chaud"
        ]
      },
      {
        "text": "Eau",
        "pts": 30,
        "aliases": [
          "eau",
          "oceans",
          "pluie"
        ]
      },
      {
        "text": "Terre",
        "pts": 15,
        "aliases": [
          "terre",
          "plantes",
          "nature"
        ]
      },
      {
        "text": "Air",
        "pts": 12,
        "aliases": [
          "air",
          "vent",
          "respiration"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre langage de requête préféré ?",
    "answers": [
      {
        "text": "SQL",
        "pts": 35,
        "aliases": [
          "sql",
          "relationnel"
        ]
      },
      {
        "text": "MongoDB",
        "pts": 25,
        "aliases": [
          "mongo",
          "document"
        ]
      },
      {
        "text": "Redis",
        "pts": 20,
        "aliases": [
          "redis",
          "cle-valeur"
        ]
      },
      {
        "text": "Elasticsearch",
        "pts": 12,
        "aliases": [
          "elasticsearch",
          "recherche"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre langue étudiant préférée ?",
    "answers": [
      {
        "text": "Français",
        "pts": 50,
        "aliases": [
          "francais",
          "maternelle"
        ]
      },
      {
        "text": "Anglais",
        "pts": 20,
        "aliases": [
          "anglais",
          "international"
        ]
      },
      {
        "text": "Espagnol",
        "pts": 12,
        "aliases": [
          "espagnol",
          "espagne"
        ]
      },
      {
        "text": "Allemand",
        "pts": 10,
        "aliases": [
          "allemand",
          "allemagne"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre sport d'été préféré ?",
    "answers": [
      {
        "text": "Natation",
        "pts": 35,
        "aliases": [
          "natation",
          "eau",
          "piscine"
        ]
      },
      {
        "text": "Voile",
        "pts": 25,
        "aliases": [
          "voile",
          "bateau",
          "mer"
        ]
      },
      {
        "text": "Surf",
        "pts": 20,
        "aliases": [
          "surf",
          "vague",
          "plage"
        ]
      },
      {
        "text": "Petanque",
        "pts": 12,
        "aliases": [
          "petanque",
          "boules",
          "ete"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre heure de coucher étudiante ?",
    "answers": [
      {
        "text": "Minuit",
        "pts": 40,
        "aliases": [
          "minuit",
          "nuit",
          "tard"
        ]
      },
      {
        "text": "1h",
        "pts": 30,
        "aliases": [
          "1h",
          "coucher"
        ]
      },
      {
        "text": "2h",
        "pts": 15,
        "aliases": [
          "2h",
          "etude",
          "revision"
        ]
      },
      {
        "text": "3h",
        "pts": 10,
        "aliases": [
          "3h",
          "tres tard"
        ]
      },
      {
        "text": "4h+",
        "pts": 5,
        "aliases": [
          "4h",
          "4h+",
          "aube"
        ]
      }
    ]
  },
  {
    "q": "Votre navigateur web principal ?",
    "answers": [
      {
        "text": "Google Chrome",
        "pts": 35,
        "aliases": [
          "chrome",
          "google chrome",
          "chromium"
        ]
      },
      {
        "text": "Firefox",
        "pts": 25,
        "aliases": [
          "firefox",
          "mozilla"
        ]
      },
      {
        "text": "Safari",
        "pts": 20,
        "aliases": [
          "safari"
        ]
      },
      {
        "text": "Microsoft Edge",
        "pts": 12,
        "aliases": [
          "edge"
        ]
      },
      {
        "text": "Brave",
        "pts": 8,
        "aliases": [
          "brave"
        ]
      }
    ]
  },
  {
    "q": "Votre musique béninoise préférée ?",
    "answers": [
      {
        "text": "Hip-hop béninois",
        "pts": 45,
        "aliases": [
          "hip-hop",
          "rap benin"
        ]
      },
      {
        "text": "Chants traditionnels",
        "pts": 20,
        "aliases": [
          "traditionnel",
          "folklore"
        ]
      },
      {
        "text": "Zangbeto",
        "pts": 15,
        "aliases": [
          "zangbeto",
          "masque",
          "cultes"
        ]
      },
      {
        "text": "Akpalla",
        "pts": 12,
        "aliases": [
          "akpalla",
          "danse"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre base de données NoSQL préférée ?",
    "answers": [
      {
        "text": "MongoDB",
        "pts": 35,
        "aliases": [
          "mongo",
          "nosql"
        ]
      },
      {
        "text": "Redis",
        "pts": 30,
        "aliases": [
          "redis",
          "cle-valeur",
          "cache"
        ]
      },
      {
        "text": "Cassandra",
        "pts": 15,
        "aliases": [
          "cassandra"
        ]
      },
      {
        "text": "DynamoDB",
        "pts": 12,
        "aliases": [
          "dynamodb",
          "aws"
        ]
      },
      {
        "text": "CouchDB",
        "pts": 8,
        "aliases": [
          "couchdb"
        ]
      }
    ]
  },
  {
    "q": "Votre fête béninoise préférée ?",
    "answers": [
      {
        "text": "Indépendance",
        "pts": 40,
        "aliases": [
          "independance",
          "1er aout",
          "1er août"
        ]
      },
      {
        "text": "Noël",
        "pts": 30,
        "aliases": [
          "noel",
          "nativite"
        ]
      },
      {
        "text": "Pâques",
        "pts": 15,
        "aliases": [
          "paques",
          "resurrection"
        ]
      },
      {
        "text": "Ramadan",
        "pts": 10,
        "aliases": [
          "ramadan",
          "aide",
          "islam"
        ]
      },
      {
        "text": "Aucun",
        "pts": 5,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre musée préféré ?",
    "answers": [
      {
        "text": "Louvre",
        "pts": 30,
        "aliases": [
          "louvre",
          "paris",
          "mona lisa"
        ]
      },
      {
        "text": "British Museum",
        "pts": 25,
        "aliases": [
          "british",
          "londres"
        ]
      },
      {
        "text": "Metropolitan",
        "pts": 20,
        "aliases": [
          "met",
          "new york"
        ]
      },
      {
        "text": "Uffizi",
        "pts": 15,
        "aliases": [
          "uffizi",
          "florence"
        ]
      },
      {
        "text": "Aucun",
        "pts": 10,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre outil de test préféré ?",
    "answers": [
      {
        "text": "Jest",
        "pts": 40,
        "aliases": [
          "jest",
          "node"
        ]
      },
      {
        "text": "PyTest",
        "pts": 30,
        "aliases": [
          "pytest",
          "python"
        ]
      },
      {
        "text": "JUnit",
        "pts": 15,
        "aliases": [
          "junit",
          "java"
        ]
      },
      {
        "text": "PHPUnit",
        "pts": 10,
        "aliases": [
          "phpunit",
          "php"
        ]
      },
      {
        "text": "Aucun",
        "pts": 5,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre partie de la journée préférée ?",
    "answers": [
      {
        "text": "Matin",
        "pts": 45,
        "aliases": [
          "matin",
          "lever",
          "energie"
        ]
      },
      {
        "text": "Apres-midi",
        "pts": 20,
        "aliases": [
          "apres-midi",
          "cours"
        ]
      },
      {
        "text": "Soir",
        "pts": 15,
        "aliases": [
          "soir",
          "detente",
          "sortie"
        ]
      },
      {
        "text": "Nuit",
        "pts": 12,
        "aliases": [
          "nuit",
          "calme",
          "etude"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre langage de configuration préféré ?",
    "answers": [
      {
        "text": "YAML",
        "pts": 30,
        "aliases": [
          "yaml",
          "yml"
        ]
      },
      {
        "text": "JSON",
        "pts": 25,
        "aliases": [
          "json",
          "api"
        ]
      },
      {
        "text": "TOML",
        "pts": 20,
        "aliases": [
          "toml",
          "config"
        ]
      },
      {
        "text": "XML",
        "pts": 15,
        "aliases": [
          "xml",
          "ancien"
        ]
      },
      {
        "text": "Aucun",
        "pts": 10,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre instrument de percussion béninois ?",
    "answers": [
      {
        "text": "Tambour",
        "pts": 35,
        "aliases": [
          "tambour",
          "tam-tam"
        ]
      },
      {
        "text": "Djembe",
        "pts": 25,
        "aliases": [
          "djembe",
          "percussion"
        ]
      },
      {
        "text": "Talking drum",
        "pts": 20,
        "aliases": [
          "talking drum",
          "parle"
        ]
      },
      {
        "text": "Aucun",
        "pts": 12,
        "aliases": [
          "aucun",
          "rien"
        ]
      },
      {
        "text": "Autre",
        "pts": 8,
        "aliases": [
          "autre",
          "divers"
        ]
      }
    ]
  },
  {
    "q": "Votre lieu d'étude préféré ?",
    "answers": [
      {
        "text": "Bibliothèque",
        "pts": 40,
        "aliases": [
          "bibliotheque",
          "mediatheque"
        ]
      },
      {
        "text": "Chez soi",
        "pts": 25,
        "aliases": [
          "chez soi",
          "maison",
          "dortoir",
          "chambre"
        ]
      },
      {
        "text": "Salle TP",
        "pts": 15,
        "aliases": [
          "tp",
          "salle informatique"
        ]
      },
      {
        "text": "Cafétéria",
        "pts": 12,
        "aliases": [
          "cafétéria",
          "self",
          "resto u"
        ]
      },
      {
        "text": "Parc",
        "pts": 8,
        "aliases": [
          "parc",
          "exterieur",
          "jardin"
        ]
      }
    ]
  },
  {
    "q": "Votre langage de base préféré ?",
    "answers": [
      {
        "text": "C",
        "pts": 50,
        "aliases": [
          "c",
          "ansi c"
        ]
      },
      {
        "text": "Python",
        "pts": 20,
        "aliases": [
          "python",
          "py"
        ]
      },
      {
        "text": "Java",
        "pts": 12,
        "aliases": [
          "java",
          "jdk"
        ]
      },
      {
        "text": "JavaScript",
        "pts": 10,
        "aliases": [
          "javascript",
          "js"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre langage pour l'algo à Epitech ?",
    "answers": [
      {
        "text": "C",
        "pts": 40,
        "aliases": [
          "c",
          "ansi c"
        ]
      },
      {
        "text": "Python",
        "pts": 30,
        "aliases": [
          "python",
          "py"
        ]
      },
      {
        "text": "Ocaml",
        "pts": 15,
        "aliases": [
          "ocaml",
          "caml"
        ]
      },
      {
        "text": "Shell",
        "pts": 10,
        "aliases": [
          "shell",
          "bash"
        ]
      },
      {
        "text": "Java",
        "pts": 5,
        "aliases": [
          "java"
        ]
      }
    ]
  },
  {
    "q": "Votre éditeur de notebook préféré ?",
    "answers": [
      {
        "text": "Jupyter",
        "pts": 45,
        "aliases": [
          "jupyter",
          "python"
        ]
      },
      {
        "text": "Colab",
        "pts": 20,
        "aliases": [
          "colab",
          "google"
        ]
      },
      {
        "text": "Observable",
        "pts": 15,
        "aliases": [
          "observable",
          "js"
        ]
      },
      {
        "text": "VS Code",
        "pts": 12,
        "aliases": [
          "vs code",
          "editeur"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre gestionnaire de versions ?",
    "answers": [
      {
        "text": "Git",
        "pts": 35,
        "aliases": [
          "git",
          "github",
          "gitlab"
        ]
      },
      {
        "text": "SVN",
        "pts": 30,
        "aliases": [
          "svn",
          "subversion"
        ]
      },
      {
        "text": "Mercurial",
        "pts": 15,
        "aliases": [
          "hg"
        ]
      },
      {
        "text": "Aucun",
        "pts": 12,
        "aliases": [
          "aucun",
          "rien",
          "pas de gestion"
        ]
      },
      {
        "text": "Perforce",
        "pts": 8,
        "aliases": [
          "p4"
        ]
      }
    ]
  },
  {
    "q": "Votre prof Epitech préféré ?",
    "answers": [
      {
        "text": "Intervenant",
        "pts": 40,
        "aliases": [
          "intervenant",
          "exterieur"
        ]
      },
      {
        "text": "Permanent",
        "pts": 25,
        "aliases": [
          "permanent",
          "ecole"
        ]
      },
      {
        "text": "Externe",
        "pts": 15,
        "aliases": [
          "externe",
          "pro"
        ]
      },
      {
        "text": "Alumni",
        "pts": 12,
        "aliases": [
          "alumni",
          "ancien"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre outil de conteneurisation ?",
    "answers": [
      {
        "text": "Docker",
        "pts": 50,
        "aliases": [
          "docker",
          "conteneurs"
        ]
      },
      {
        "text": "Kubernetes",
        "pts": 20,
        "aliases": [
          "k8s",
          "kubernetes"
        ]
      },
      {
        "text": "Podman",
        "pts": 12,
        "aliases": [
          "podman"
        ]
      },
      {
        "text": "LXC",
        "pts": 10,
        "aliases": [
          "lxc"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre outil Epitech préféré en 2026 ?",
    "answers": [
      {
        "text": "GitHub Copilot",
        "pts": 35,
        "aliases": [
          "copilot",
          "ia"
        ]
      },
      {
        "text": "ChatGPT",
        "pts": 30,
        "aliases": [
          "chatgpt"
        ]
      },
      {
        "text": "Stack Overflow",
        "pts": 15,
        "aliases": [
          "stackoverflow",
          "communaute"
        ]
      },
      {
        "text": "Documentation",
        "pts": 12,
        "aliases": [
          "documentation",
          "docs"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre langage de shell préféré ?",
    "answers": [
      {
        "text": "Bash",
        "pts": 50,
        "aliases": [
          "bash",
          "shell"
        ]
      },
      {
        "text": "Zsh",
        "pts": 20,
        "aliases": [
          "zsh",
          "oh my zsh"
        ]
      },
      {
        "text": "Fish",
        "pts": 12,
        "aliases": [
          "fish"
        ]
      },
      {
        "text": "PowerShell",
        "pts": 10,
        "aliases": [
          "powershell",
          "windows"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre outil de versionnage préféré ?",
    "answers": [
      {
        "text": "GitHub",
        "pts": 40,
        "aliases": [
          "github",
          "depot"
        ]
      },
      {
        "text": "GitLab",
        "pts": 25,
        "aliases": [
          "gitlab",
          "self hosted"
        ]
      },
      {
        "text": "Bitbucket",
        "pts": 15,
        "aliases": [
          "bitbucket",
          "atlassian"
        ]
      },
      {
        "text": "Azure DevOps",
        "pts": 12,
        "aliases": [
          "azure devops",
          "microsoft"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre base de données préférée ?",
    "answers": [
      {
        "text": "MySQL",
        "pts": 30,
        "aliases": [
          "mysql",
          "mariadb"
        ]
      },
      {
        "text": "PostgreSQL",
        "pts": 25,
        "aliases": [
          "postgres",
          "pg"
        ]
      },
      {
        "text": "MongoDB",
        "pts": 20,
        "aliases": [
          "mongo",
          "nosql"
        ]
      },
      {
        "text": "SQLite",
        "pts": 15,
        "aliases": [
          "sqlite",
          "sqlite3"
        ]
      },
      {
        "text": "Redis",
        "pts": 10,
        "aliases": [
          "redis",
          "cache"
        ]
      }
    ]
  },
  {
    "q": "Votre langage de script préféré ?",
    "answers": [
      {
        "text": "Python",
        "pts": 35,
        "aliases": [
          "python",
          "py",
          "python3"
        ]
      },
      {
        "text": "Bash",
        "pts": 25,
        "aliases": [
          "bash",
          "shell",
          "sh"
        ]
      },
      {
        "text": "PowerShell",
        "pts": 20,
        "aliases": [
          "powershell",
          "ps1"
        ]
      },
      {
        "text": "Lua",
        "pts": 12,
        "aliases": [
          "lua"
        ]
      },
      {
        "text": "Ruby",
        "pts": 8,
        "aliases": [
          "ruby",
          "rb"
        ]
      }
    ]
  },
  {
    "q": "Votre plat de fête béninois ?",
    "answers": [
      {
        "text": "Pâté",
        "pts": 30,
        "aliases": [
          "pate",
          "fete",
          "mariage"
        ]
      },
      {
        "text": "Amiwo",
        "pts": 25,
        "aliases": [
          "amiwo",
          "cereale"
        ]
      },
      {
        "text": "Yovo doko",
        "pts": 20,
        "aliases": [
          "yovo doko",
          "beignet"
        ]
      },
      {
        "text": "Djèwô",
        "pts": 15,
        "aliases": [
          "djewo",
          "haricot"
        ]
      },
      {
        "text": "Aucun",
        "pts": 10,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre peintre préféré ?",
    "answers": [
      {
        "text": "Léonard de Vinci",
        "pts": 40,
        "aliases": [
          "leonard de vinci",
          "renaissance"
        ]
      },
      {
        "text": "Van Gogh",
        "pts": 25,
        "aliases": [
          "van gogh",
          "impressionnisme"
        ]
      },
      {
        "text": "Picasso",
        "pts": 15,
        "aliases": [
          "picasso",
          "cubisme"
        ]
      },
      {
        "text": "Monet",
        "pts": 12,
        "aliases": [
          "monet"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre langage Epitech préféré ?",
    "answers": [
      {
        "text": "C",
        "pts": 35,
        "aliases": [
          "c"
        ]
      },
      {
        "text": "C++",
        "pts": 30,
        "aliases": [
          "cpp",
          "c plus plus"
        ]
      },
      {
        "text": "Python",
        "pts": 15,
        "aliases": [
          "python",
          "py"
        ]
      },
      {
        "text": "Ocaml",
        "pts": 12,
        "aliases": [
          "ocaml",
          "caml"
        ]
      },
      {
        "text": "Shell",
        "pts": 8,
        "aliases": [
          "shell",
          "bash"
        ]
      }
    ]
  },
  {
    "q": "Votre genre de film préféré ?",
    "answers": [
      {
        "text": "Action",
        "pts": 50,
        "aliases": [
          "action",
          "combat",
          "marvel"
        ]
      },
      {
        "text": "Comédie",
        "pts": 20,
        "aliases": [
          "comedie",
          "rire",
          "humour"
        ]
      },
      {
        "text": "Drame",
        "pts": 12,
        "aliases": [
          "drame",
          "emotion"
        ]
      },
      {
        "text": "Science-fiction",
        "pts": 10,
        "aliases": [
          "science-fiction",
          "sci-fi",
          "espace"
        ]
      },
      {
        "text": "Horreur",
        "pts": 8,
        "aliases": [
          "horreur",
          "peur"
        ]
      }
    ]
  },
  {
    "q": "Votre serveur web préféré ?",
    "answers": [
      {
        "text": "Nginx",
        "pts": 40,
        "aliases": [
          "nginx",
          "reverse proxy"
        ]
      },
      {
        "text": "Apache",
        "pts": 25,
        "aliases": [
          "apache",
          "httpd"
        ]
      },
      {
        "text": "Caddy",
        "pts": 15,
        "aliases": [
          "caddy",
          "moderne"
        ]
      },
      {
        "text": "IIS",
        "pts": 12,
        "aliases": [
          "iis",
          "windows"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre langage de shader préféré ?",
    "answers": [
      {
        "text": "GLSL",
        "pts": 50,
        "aliases": [
          "glsl",
          "opengl"
        ]
      },
      {
        "text": "HLSL",
        "pts": 20,
        "aliases": [
          "hlsl",
          "directx"
        ]
      },
      {
        "text": "WGSL",
        "pts": 12,
        "aliases": [
          "wgsl",
          "webgpu"
        ]
      },
      {
        "text": "Cg",
        "pts": 10,
        "aliases": [
          "cg",
          "ancien"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre fête traditionnelle béninoise ?",
    "answers": [
      {
        "text": "Vaudou",
        "pts": 40,
        "aliases": [
          "vaudou",
          "culte",
          "fetiche"
        ]
      },
      {
        "text": "Gani",
        "pts": 25,
        "aliases": [
          "gani",
          "fete",
          "roi"
        ]
      },
      {
        "text": "Zangbeto",
        "pts": 15,
        "aliases": [
          "zangbeto",
          "masque"
        ]
      },
      {
        "text": "Aucun",
        "pts": 12,
        "aliases": [
          "aucun",
          "rien"
        ]
      },
      {
        "text": "Autre",
        "pts": 8,
        "aliases": [
          "autre",
          "divers"
        ]
      }
    ]
  },
  {
    "q": "Votre système Epitech préféré ?",
    "answers": [
      {
        "text": "Linux",
        "pts": 40,
        "aliases": [
          "linux",
          "ubuntu",
          "debian"
        ]
      },
      {
        "text": "Windows",
        "pts": 25,
        "aliases": [
          "windows",
          "ecole"
        ]
      },
      {
        "text": "macOS",
        "pts": 15,
        "aliases": [
          "macos",
          "apple"
        ]
      },
      {
        "text": "BSD",
        "pts": 12,
        "aliases": [
          "bsd",
          "unix"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre boisson étudiante préférée ?",
    "answers": [
      {
        "text": "Café",
        "pts": 35,
        "aliases": [
          "cafe",
          "expresso",
          "caffeine"
        ]
      },
      {
        "text": "Thé",
        "pts": 30,
        "aliases": [
          "the",
          "infusion"
        ]
      },
      {
        "text": "Eau",
        "pts": 15,
        "aliases": [
          "eau",
          "minerale"
        ]
      },
      {
        "text": "Soda",
        "pts": 12,
        "aliases": [
          "soda",
          "sucre",
          "boisson gazeuse"
        ]
      },
      {
        "text": "Jus",
        "pts": 8,
        "aliases": [
          "jus",
          "fruits"
        ]
      }
    ]
  },
  {
    "q": "Votre outil CI/CD préféré ?",
    "answers": [
      {
        "text": "GitHub Actions",
        "pts": 40,
        "aliases": [
          "github actions",
          "gh actions"
        ]
      },
      {
        "text": "GitLab CI",
        "pts": 25,
        "aliases": [
          "gitlab ci",
          "gitlab"
        ]
      },
      {
        "text": "Jenkins",
        "pts": 15,
        "aliases": [
          "jenkins"
        ]
      },
      {
        "text": "CircleCI",
        "pts": 12,
        "aliases": [
          "circleci"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Le plus grand fleuve ?",
    "answers": [
      {
        "text": "Nil",
        "pts": 45,
        "aliases": [
          "nil",
          "egypte"
        ]
      },
      {
        "text": "Amazone",
        "pts": 20,
        "aliases": [
          "amazone",
          "bresil",
          "foret"
        ]
      },
      {
        "text": "Yangtsé",
        "pts": 15,
        "aliases": [
          "yangtze",
          "chine"
        ]
      },
      {
        "text": "Mississippi",
        "pts": 12,
        "aliases": [
          "mississippi",
          "usa"
        ]
      },
      {
        "text": "Dano",
        "pts": 8,
        "aliases": [
          "dano",
          "afrique"
        ]
      }
    ]
  },
  {
    "q": "Votre danse béninoise préférée ?",
    "answers": [
      {
        "text": "Sato",
        "pts": 45,
        "aliases": [
          "sato",
          "rythme",
          "danse"
        ]
      },
      {
        "text": "Ganwi",
        "pts": 20,
        "aliases": [
          "ganwi"
        ]
      },
      {
        "text": "Zangbeto",
        "pts": 15,
        "aliases": [
          "zangbeto",
          "masque"
        ]
      },
      {
        "text": "Traditionnelle",
        "pts": 12,
        "aliases": [
          "traditionnelle",
          "folklore"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre langage de requête graphique ?",
    "answers": [
      {
        "text": "GraphQL",
        "pts": 30,
        "aliases": [
          "graphql",
          "api"
        ]
      },
      {
        "text": "REST",
        "pts": 25,
        "aliases": [
          "rest",
          "http"
        ]
      },
      {
        "text": "gRPC",
        "pts": 20,
        "aliases": [
          "grpc",
          "google"
        ]
      },
      {
        "text": "SOAP",
        "pts": 15,
        "aliases": [
          "soap",
          "ancien"
        ]
      },
      {
        "text": "Aucun",
        "pts": 10,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre langage Epitech le plus utile ?",
    "answers": [
      {
        "text": "C",
        "pts": 50,
        "aliases": [
          "c",
          "base",
          "fondamentaux"
        ]
      },
      {
        "text": "Python",
        "pts": 20,
        "aliases": [
          "python",
          "automatisation"
        ]
      },
      {
        "text": "Shell",
        "pts": 12,
        "aliases": [
          "shell",
          "terminal"
        ]
      },
      {
        "text": "SQL",
        "pts": 10,
        "aliases": [
          "sql",
          "base de donnees"
        ]
      },
      {
        "text": "Git",
        "pts": 8,
        "aliases": [
          "git",
          "versionnage"
        ]
      }
    ]
  },
  {
    "q": "Votre fruit préféré ?",
    "answers": [
      {
        "text": "Pomme",
        "pts": 45,
        "aliases": [
          "pomme",
          "croquant",
          "rouge"
        ]
      },
      {
        "text": "Banane",
        "pts": 20,
        "aliases": [
          "banane",
          "energie",
          "jaune"
        ]
      },
      {
        "text": "Mangue",
        "pts": 15,
        "aliases": [
          "mangue",
          "tropicale",
          "sucre"
        ]
      },
      {
        "text": "Fraise",
        "pts": 12,
        "aliases": [
          "fraise",
          "printemps"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "La capitale officielle du Bénin ?",
    "answers": [
      {
        "text": "Porto-Novo",
        "pts": 45,
        "aliases": [
          "porto-novo",
          "porto novo",
          "capitale"
        ]
      },
      {
        "text": "Cotonou",
        "pts": 20,
        "aliases": [
          "cotonou",
          "kotou"
        ]
      },
      {
        "text": "Parakou",
        "pts": 15,
        "aliases": [
          "parakou"
        ]
      },
      {
        "text": "Abomey-Calavi",
        "pts": 12,
        "aliases": [
          "calavi",
          "abomey calavi"
        ]
      },
      {
        "text": "Ouidah",
        "pts": 8,
        "aliases": [
          "ouidah"
        ]
      }
    ]
  },
  {
    "q": "Votre sport préféré ?",
    "answers": [
      {
        "text": "Football",
        "pts": 30,
        "aliases": [
          "football",
          "foot",
          "soccer"
        ]
      },
      {
        "text": "Basket",
        "pts": 25,
        "aliases": [
          "basket",
          "nba"
        ]
      },
      {
        "text": "Tennis",
        "pts": 20,
        "aliases": [
          "tennis",
          "roland garros"
        ]
      },
      {
        "text": "Natation",
        "pts": 15,
        "aliases": [
          "natation",
          "piscine"
        ]
      },
      {
        "text": "Athlétisme",
        "pts": 10,
        "aliases": [
          "athletisme",
          "course"
        ]
      }
    ]
  },
  {
    "q": "Votre heure de pause déjeuner ?",
    "answers": [
      {
        "text": "12h",
        "pts": 35,
        "aliases": [
          "12h",
          "midi"
        ]
      },
      {
        "text": "13h",
        "pts": 25,
        "aliases": [
          "13h",
          "une heure"
        ]
      },
      {
        "text": "14h",
        "pts": 20,
        "aliases": [
          "14h",
          "deux heures"
        ]
      },
      {
        "text": "12h30",
        "pts": 12,
        "aliases": [
          "12h30"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre animal préféré ?",
    "answers": [
      {
        "text": "Chien",
        "pts": 35,
        "aliases": [
          "chien",
          "fidele",
          "animal de compagnie"
        ]
      },
      {
        "text": "Chat",
        "pts": 30,
        "aliases": [
          "chat",
          "independant",
          "miaulement"
        ]
      },
      {
        "text": "Cheval",
        "pts": 15,
        "aliases": [
          "cheval",
          "galop"
        ]
      },
      {
        "text": "Lion",
        "pts": 12,
        "aliases": [
          "lion",
          "safari",
          "roi"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre matière Epitech préférée ?",
    "answers": [
      {
        "text": "Algo",
        "pts": 40,
        "aliases": [
          "algo",
          "algorithme"
        ]
      },
      {
        "text": "Système",
        "pts": 30,
        "aliases": [
          "systeme",
          "os",
          "linux"
        ]
      },
      {
        "text": "Réseau",
        "pts": 15,
        "aliases": [
          "reseau",
          "tcp",
          "ip"
        ]
      },
      {
        "text": "Web",
        "pts": 10,
        "aliases": [
          "web",
          "html",
          "css"
        ]
      },
      {
        "text": "Base de données",
        "pts": 5,
        "aliases": [
          "bdd",
          "sql",
          "mysql"
        ]
      }
    ]
  },
  {
    "q": "Votre ville béninoise du nord ?",
    "answers": [
      {
        "text": "Parakou",
        "pts": 45,
        "aliases": [
          "parakou",
          "nord",
          "bourgou"
        ]
      },
      {
        "text": "Nikki",
        "pts": 20,
        "aliases": [
          "nikki",
          "borgu"
        ]
      },
      {
        "text": "Kandi",
        "pts": 15,
        "aliases": [
          "kandi",
          "alibori"
        ]
      },
      {
        "text": "Bembereke",
        "pts": 12,
        "aliases": [
          "bembereke",
          "collines"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre oeuvre d'art préférée ?",
    "answers": [
      {
        "text": "Mona Lisa",
        "pts": 50,
        "aliases": [
          "mona lisa",
          "louvre",
          "leonard"
        ]
      },
      {
        "text": "La Nuit etoilée",
        "pts": 20,
        "aliases": [
          "nuit etoilee",
          "van gogh"
        ]
      },
      {
        "text": "Le Cri",
        "pts": 12,
        "aliases": [
          "le cri",
          "munch"
        ]
      },
      {
        "text": "La Joconde",
        "pts": 10,
        "aliases": [
          "la joconde"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre langage Epitech le plus difficile ?",
    "answers": [
      {
        "text": "C",
        "pts": 50,
        "aliases": [
          "c",
          "pointeurs"
        ]
      },
      {
        "text": "Ocaml",
        "pts": 20,
        "aliases": [
          "ocaml",
          "fonctionnel"
        ]
      },
      {
        "text": "Haskell",
        "pts": 12,
        "aliases": [
          "haskell",
          "monade"
        ]
      },
      {
        "text": "Assembleur",
        "pts": 10,
        "aliases": [
          "assembleur",
          "bas niveau"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre diplôme visé ?",
    "answers": [
      {
        "text": "Bachelor",
        "pts": 30,
        "aliases": [
          "bachelor",
          "licence",
          "bac+3"
        ]
      },
      {
        "text": "Master",
        "pts": 25,
        "aliases": [
          "master",
          "mastère",
          "bac+5"
        ]
      },
      {
        "text": "MBA",
        "pts": 20,
        "aliases": [
          "mba",
          "gestion"
        ]
      },
      {
        "text": "Doctorat",
        "pts": 15,
        "aliases": [
          "doctorat",
          "phd",
          "these"
        ]
      },
      {
        "text": "Aucun",
        "pts": 10,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre ville béninoise préférée ?",
    "answers": [
      {
        "text": "Cotonou",
        "pts": 40,
        "aliases": [
          "cotonou",
          "kotou"
        ]
      },
      {
        "text": "Porto-Novo",
        "pts": 25,
        "aliases": [
          "porto-novo",
          "porto novo",
          "capitale"
        ]
      },
      {
        "text": "Parakou",
        "pts": 15,
        "aliases": [
          "parakou",
          "nord"
        ]
      },
      {
        "text": "Ouidah",
        "pts": 12,
        "aliases": [
          "ouidah",
          "histoire",
          "esclaves",
          "fort"
        ]
      },
      {
        "text": "Abomey",
        "pts": 8,
        "aliases": [
          "abomey",
          "royaume",
          "palais"
        ]
      }
    ]
  },
  {
    "q": "Votre couleur préférée ?",
    "answers": [
      {
        "text": "Bleu",
        "pts": 35,
        "aliases": [
          "bleu",
          "ciel",
          "mer"
        ]
      },
      {
        "text": "Rouge",
        "pts": 30,
        "aliases": [
          "rouge",
          "sang",
          "passion"
        ]
      },
      {
        "text": "Vert",
        "pts": 15,
        "aliases": [
          "vert",
          "nature",
          "espoir"
        ]
      },
      {
        "text": "Jaune",
        "pts": 12,
        "aliases": [
          "jaune",
          "soleil"
        ]
      },
      {
        "text": "Noir",
        "pts": 8,
        "aliases": [
          "noir",
          "elegance",
          "nuit"
        ]
      }
    ]
  },
  {
    "q": "Votre roi béninois préféré ?",
    "answers": [
      {
        "text": "Guézo",
        "pts": 50,
        "aliases": [
          "guezo",
          "royaume d'abomey"
        ]
      },
      {
        "text": "Glélé",
        "pts": 20,
        "aliases": [
          "glele",
          "roi"
        ]
      },
      {
        "text": "Agonglo",
        "pts": 12,
        "aliases": [
          "agonglo",
          "fondateur"
        ]
      },
      {
        "text": "Toffa",
        "pts": 10,
        "aliases": [
          "toffa",
          "porto-novo"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre club Epitech préféré ?",
    "answers": [
      {
        "text": "Jeux vidéo",
        "pts": 40,
        "aliases": [
          "jeux",
          "gamedev"
        ]
      },
      {
        "text": "IA",
        "pts": 30,
        "aliases": [
          "ia",
          "machine learning"
        ]
      },
      {
        "text": "Cyber",
        "pts": 15,
        "aliases": [
          "cyber",
          "securite"
        ]
      },
      {
        "text": "Web",
        "pts": 10,
        "aliases": [
          "web",
          "developpement"
        ]
      },
      {
        "text": "Aucun",
        "pts": 5,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "La capitale économique du Bénin ?",
    "answers": [
      {
        "text": "Cotonou",
        "pts": 40,
        "aliases": [
          "cotonou",
          "kotou",
          "kotonou"
        ]
      },
      {
        "text": "Porto-Novo",
        "pts": 30,
        "aliases": [
          "porto-novo",
          "porto novo"
        ]
      },
      {
        "text": "Parakou",
        "pts": 15,
        "aliases": [
          "parakou"
        ]
      },
      {
        "text": "Abomey-Calavi",
        "pts": 10,
        "aliases": [
          "calavi",
          "abomey calavi"
        ]
      },
      {
        "text": "Ouidah",
        "pts": 5,
        "aliases": [
          "ouidah"
        ]
      }
    ]
  },
  {
    "q": "La plus haute montagne du monde ?",
    "answers": [
      {
        "text": "Everest",
        "pts": 35,
        "aliases": [
          "everest",
          "mont everest",
          "himalaya"
        ]
      },
      {
        "text": "K2",
        "pts": 25,
        "aliases": [
          "k2",
          "chogori"
        ]
      },
      {
        "text": "Kangchenjunga",
        "pts": 20,
        "aliases": [
          "kangchenjunga",
          "nepal"
        ]
      },
      {
        "text": "Lhotse",
        "pts": 12,
        "aliases": [
          "lhotse",
          "tibet"
        ]
      },
      {
        "text": "Makalu",
        "pts": 8,
        "aliases": [
          "makalu"
        ]
      }
    ]
  },
  {
    "q": "Votre outil d'étude préféré ?",
    "answers": [
      {
        "text": "Ordinateur",
        "pts": 35,
        "aliases": [
          "ordinateur",
          "pc",
          "mac",
          "portable"
        ]
      },
      {
        "text": "Tablette",
        "pts": 25,
        "aliases": [
          "tablette",
          "ipad"
        ]
      },
      {
        "text": "Papier",
        "pts": 20,
        "aliases": [
          "papier",
          "cahier",
          "stylo"
        ]
      },
      {
        "text": "Téléphone",
        "pts": 12,
        "aliases": [
          "telephone",
          "mobile",
          "appli"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre pays de rêve ?",
    "answers": [
      {
        "text": "Japon",
        "pts": 30,
        "aliases": [
          "japon",
          "tokyo",
          "manga"
        ]
      },
      {
        "text": "Canada",
        "pts": 25,
        "aliases": [
          "canada",
          "nature",
          "froid"
        ]
      },
      {
        "text": "Australie",
        "pts": 20,
        "aliases": [
          "australie",
          "kangourou",
          "plages"
        ]
      },
      {
        "text": "Italie",
        "pts": 15,
        "aliases": [
          "italie",
          "rome",
          "pates"
        ]
      },
      {
        "text": "Aucun",
        "pts": 10,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre moteur de jeu préféré ?",
    "answers": [
      {
        "text": "Unity",
        "pts": 35,
        "aliases": [
          "unity",
          "c sharp"
        ]
      },
      {
        "text": "Unreal",
        "pts": 30,
        "aliases": [
          "unreal",
          "cpp"
        ]
      },
      {
        "text": "Godot",
        "pts": 15,
        "aliases": [
          "godot",
          "gdscript"
        ]
      },
      {
        "text": "Roblox",
        "pts": 12,
        "aliases": [
          "roblox",
          "lua"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre langage de préférence pour l'IA ?",
    "answers": [
      {
        "text": "Python",
        "pts": 50,
        "aliases": [
          "python",
          "ia",
          "ml"
        ]
      },
      {
        "text": "R",
        "pts": 20,
        "aliases": [
          "r",
          "statistiques"
        ]
      },
      {
        "text": "Julia",
        "pts": 12,
        "aliases": [
          "julia",
          "calcul"
        ]
      },
      {
        "text": "C++",
        "pts": 10,
        "aliases": [
          "cpp",
          "performance"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre logement étudiant ?",
    "answers": [
      {
        "text": "Cité U",
        "pts": 45,
        "aliases": [
          "cite u",
          "dortoir",
          "universite"
        ]
      },
      {
        "text": "Colocation",
        "pts": 20,
        "aliases": [
          "colocation",
          "coloc",
          "shared"
        ]
      },
      {
        "text": "Chez les parents",
        "pts": 15,
        "aliases": [
          "chez les parents",
          "famille"
        ]
      },
      {
        "text": "Studio",
        "pts": 12,
        "aliases": [
          "studio",
          "appartement"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Le rythme Epitech, c'est ?",
    "answers": [
      {
        "text": "Intense",
        "pts": 40,
        "aliases": [
          "intense",
          "formation"
        ]
      },
      {
        "text": "Souple",
        "pts": 30,
        "aliases": [
          "souple",
          "cours"
        ]
      },
      {
        "text": "Dur",
        "pts": 15,
        "aliases": [
          "dur",
          "travail"
        ]
      },
      {
        "text": "Flexible",
        "pts": 10,
        "aliases": [
          "flexible",
          "emploi du temps"
        ]
      },
      {
        "text": "Épuisant",
        "pts": 5,
        "aliases": [
          "epuisant",
          "fatigue"
        ]
      }
    ]
  },
  {
    "q": "Votre lieu de pause préféré ?",
    "answers": [
      {
        "text": "Cafétéria",
        "pts": 40,
        "aliases": [
          "cafétéria",
          "self",
          "resto u"
        ]
      },
      {
        "text": "Parc",
        "pts": 30,
        "aliases": [
          "parc",
          "jardin"
        ]
      },
      {
        "text": "Couloir",
        "pts": 15,
        "aliases": [
          "couloir",
          "fac"
        ]
      },
      {
        "text": "Chez soi",
        "pts": 10,
        "aliases": [
          "chez soi",
          "maison"
        ]
      },
      {
        "text": "Aucun",
        "pts": 5,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre langage mobile préféré ?",
    "answers": [
      {
        "text": "Swift",
        "pts": 45,
        "aliases": [
          "swift",
          "ios"
        ]
      },
      {
        "text": "Kotlin",
        "pts": 20,
        "aliases": [
          "kotlin",
          "android"
        ]
      },
      {
        "text": "Flutter",
        "pts": 15,
        "aliases": [
          "flutter",
          "dart"
        ]
      },
      {
        "text": "React Native",
        "pts": 12,
        "aliases": [
          "react native",
          "js"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre système d'exploitation quotidien ?",
    "answers": [
      {
        "text": "Windows",
        "pts": 40,
        "aliases": [
          "win",
          "windows 10",
          "windows 11"
        ]
      },
      {
        "text": "macOS",
        "pts": 25,
        "aliases": [
          "mac",
          "os x",
          "mac os"
        ]
      },
      {
        "text": "Linux",
        "pts": 15,
        "aliases": [
          "linux",
          "ubuntu",
          "debian",
          "fedora"
        ]
      },
      {
        "text": "ChromeOS",
        "pts": 12,
        "aliases": [
          "chromebook",
          "chromeos"
        ]
      },
      {
        "text": "Android",
        "pts": 8,
        "aliases": [
          "android"
        ]
      }
    ]
  },
  {
    "q": "Votre matériel étudiant préféré ?",
    "answers": [
      {
        "text": "Ordinateur",
        "pts": 35,
        "aliases": [
          "ordinateur",
          "pc",
          "portable"
        ]
      },
      {
        "text": "Tablette",
        "pts": 25,
        "aliases": [
          "tablette",
          "ipad"
        ]
      },
      {
        "text": "Calculatrice",
        "pts": 20,
        "aliases": [
          "calculatrice",
          "scientifique"
        ]
      },
      {
        "text": "Stylo",
        "pts": 12,
        "aliases": [
          "stylo",
          "cahier"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Le langage enseigné en premier à Epitech ?",
    "answers": [
      {
        "text": "C",
        "pts": 50,
        "aliases": [
          "c",
          "ansi c"
        ]
      },
      {
        "text": "Python",
        "pts": 20,
        "aliases": [
          "python",
          "py"
        ]
      },
      {
        "text": "C++",
        "pts": 12,
        "aliases": [
          "cpp",
          "c plus plus"
        ]
      },
      {
        "text": "Ocaml",
        "pts": 10,
        "aliases": [
          "ocaml",
          "caml"
        ]
      },
      {
        "text": "Shell",
        "pts": 8,
        "aliases": [
          "shell",
          "bash",
          "zsh"
        ]
      }
    ]
  },
  {
    "q": "Votre lieu d'étude Epitech préféré ?",
    "answers": [
      {
        "text": "Salle TP",
        "pts": 30,
        "aliases": [
          "tp",
          "salle informatique"
        ]
      },
      {
        "text": "Bibliothèque",
        "pts": 25,
        "aliases": [
          "bibliotheque",
          "mediatheque"
        ]
      },
      {
        "text": "Cafétéria",
        "pts": 20,
        "aliases": [
          "cafétéria",
          "self"
        ]
      },
      {
        "text": "Chez soi",
        "pts": 15,
        "aliases": [
          "chez soi",
          "maison",
          "dortoir"
        ]
      },
      {
        "text": "Amphi",
        "pts": 10,
        "aliases": [
          "amphi",
          "amphithéâtre"
        ]
      }
    ]
  },
  {
    "q": "Votre outil de formatage préféré ?",
    "answers": [
      {
        "text": "Prettier",
        "pts": 40,
        "aliases": [
          "prettier",
          "js"
        ]
      },
      {
        "text": "ESLint",
        "pts": 25,
        "aliases": [
          "eslint",
          "lint"
        ]
      },
      {
        "text": "Black",
        "pts": 15,
        "aliases": [
          "black",
          "python"
        ]
      },
      {
        "text": "ClangFormat",
        "pts": 12,
        "aliases": [
          "clang",
          "cpp"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre langage de préférence pour le web ?",
    "answers": [
      {
        "text": "JavaScript",
        "pts": 35,
        "aliases": [
          "javascript",
          "js",
          "web"
        ]
      },
      {
        "text": "TypeScript",
        "pts": 25,
        "aliases": [
          "typescript",
          "ts"
        ]
      },
      {
        "text": "Python",
        "pts": 20,
        "aliases": [
          "python",
          "django"
        ]
      },
      {
        "text": "PHP",
        "pts": 12,
        "aliases": [
          "php",
          "laravel"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre outil Epitech le plus utilisé ?",
    "answers": [
      {
        "text": "Terminal",
        "pts": 35,
        "aliases": [
          "terminal",
          "console"
        ]
      },
      {
        "text": "Git",
        "pts": 25,
        "aliases": [
          "git",
          "versionnage"
        ]
      },
      {
        "text": "GCC",
        "pts": 20,
        "aliases": [
          "gcc",
          "compilation"
        ]
      },
      {
        "text": "Make",
        "pts": 12,
        "aliases": [
          "make",
          "build"
        ]
      },
      {
        "text": "Vim",
        "pts": 8,
        "aliases": [
          "vim",
          "edition"
        ]
      }
    ]
  },
  {
    "q": "Votre projet Epitech préféré en groupe ?",
    "answers": [
      {
        "text": "RTYPE",
        "pts": 40,
        "aliases": [
          "rtype",
          "groupe",
          "jeu"
        ]
      },
      {
        "text": "Philosophes",
        "pts": 30,
        "aliases": [
          "philo",
          "reflexion"
        ]
      },
      {
        "text": "Push_swap",
        "pts": 15,
        "aliases": [
          "pushswap",
          "algo"
        ]
      },
      {
        "text": "MiniRT",
        "pts": 10,
        "aliases": [
          "minirt",
          "graphisme"
        ]
      },
      {
        "text": "Aucun",
        "pts": 5,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre jour de la semaine prefere ?",
    "answers": [
      {
        "text": "Lundi",
        "pts": 35,
        "aliases": [
          "lundi",
          "debut"
        ]
      },
      {
        "text": "Vendredi",
        "pts": 30,
        "aliases": [
          "vendredi",
          "fin semaine"
        ]
      },
      {
        "text": "Samedi",
        "pts": 15,
        "aliases": [
          "samedi",
          "weekend"
        ]
      },
      {
        "text": "Dimanche",
        "pts": 12,
        "aliases": [
          "dimanche",
          "repos"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre type de livre prefere ?",
    "answers": [
      {
        "text": "Roman",
        "pts": 35,
        "aliases": [
          "roman",
          "litterature"
        ]
      },
      {
        "text": "BD",
        "pts": 25,
        "aliases": [
          "bd",
          "comics"
        ]
      },
      {
        "text": "Manga",
        "pts": 20,
        "aliases": [
          "manga",
          "japonais"
        ]
      },
      {
        "text": "Poesie",
        "pts": 12,
        "aliases": [
          "poesie",
          "vers"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre arbre prefere ?",
    "answers": [
      {
        "text": "Chene",
        "pts": 35,
        "aliases": [
          "chene",
          "robuste"
        ]
      },
      {
        "text": "Palmier",
        "pts": 25,
        "aliases": [
          "palmier",
          "exotique"
        ]
      },
      {
        "text": "Saule",
        "pts": 20,
        "aliases": [
          "saule",
          "pleureur"
        ]
      },
      {
        "text": "Pin",
        "pts": 12,
        "aliases": [
          "pin",
          "montagne"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre type de pain prefere ?",
    "answers": [
      {
        "text": "Baguette",
        "pts": 50,
        "aliases": [
          "baguette",
          "francaise"
        ]
      },
      {
        "text": "Pain complet",
        "pts": 20,
        "aliases": [
          "pain complet",
          "sante"
        ]
      },
      {
        "text": "Pain de mie",
        "pts": 12,
        "aliases": [
          "pain de mie",
          "moelleux"
        ]
      },
      {
        "text": "Brioche",
        "pts": 10,
        "aliases": [
          "brioche",
          "sucre"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre couleur de voiture preferee ?",
    "answers": [
      {
        "text": "Noire",
        "pts": 40,
        "aliases": [
          "noire",
          "elegante"
        ]
      },
      {
        "text": "Blanche",
        "pts": 25,
        "aliases": [
          "blanche",
          "propre"
        ]
      },
      {
        "text": "Rouge",
        "pts": 15,
        "aliases": [
          "rouge",
          "sportive"
        ]
      },
      {
        "text": "Bleue",
        "pts": 12,
        "aliases": [
          "bleue",
          "classique"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre objet indispensable prefere ?",
    "answers": [
      {
        "text": "Telephone",
        "pts": 40,
        "aliases": [
          "telephone",
          "mobile"
        ]
      },
      {
        "text": "Portefeuille",
        "pts": 25,
        "aliases": [
          "portefeuille",
          "argent"
        ]
      },
      {
        "text": "Clefs",
        "pts": 15,
        "aliases": [
          "clefs",
          "maison"
        ]
      },
      {
        "text": "Montre",
        "pts": 12,
        "aliases": [
          "montre",
          "heure"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre dessert prefere ?",
    "answers": [
      {
        "text": "Tarte",
        "pts": 35,
        "aliases": [
          "tarte",
          "pomme"
        ]
      },
      {
        "text": "Gateau",
        "pts": 25,
        "aliases": [
          "gateau",
          "anniversaire"
        ]
      },
      {
        "text": "Glace",
        "pts": 20,
        "aliases": [
          "glace",
          "dessert"
        ]
      },
      {
        "text": "Fruit",
        "pts": 12,
        "aliases": [
          "fruit",
          "sante"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre boisson energisante preferee ?",
    "answers": [
      {
        "text": "Cafe",
        "pts": 35,
        "aliases": [
          "cafe",
          "caffeine"
        ]
      },
      {
        "text": "The",
        "pts": 25,
        "aliases": [
          "the",
          "theine"
        ]
      },
      {
        "text": "Soda",
        "pts": 20,
        "aliases": [
          "soda",
          "sucre"
        ]
      },
      {
        "text": "Boisson energisante",
        "pts": 12,
        "aliases": [
          "boisson energisante",
          "taurine"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre compositeur prefere ?",
    "answers": [
      {
        "text": "Mozart",
        "pts": 40,
        "aliases": [
          "mozart",
          "classique"
        ]
      },
      {
        "text": "Beethoven",
        "pts": 25,
        "aliases": [
          "beethoven",
          "symphonie"
        ]
      },
      {
        "text": "Bach",
        "pts": 15,
        "aliases": [
          "bach",
          "baroque"
        ]
      },
      {
        "text": "Vivaldi",
        "pts": 12,
        "aliases": [
          "vivaldi",
          "quatre saisons"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre type de musique prefere ?",
    "answers": [
      {
        "text": "Pop",
        "pts": 35,
        "aliases": [
          "pop",
          "musique"
        ]
      },
      {
        "text": "Rock",
        "pts": 25,
        "aliases": [
          "rock",
          "guitare"
        ]
      },
      {
        "text": "Rap",
        "pts": 20,
        "aliases": [
          "rap",
          "rythme"
        ]
      },
      {
        "text": "Jazz",
        "pts": 12,
        "aliases": [
          "jazz",
          "saxophone"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre fleur preferee ?",
    "answers": [
      {
        "text": "Rose",
        "pts": 35,
        "aliases": [
          "rose",
          "amour"
        ]
      },
      {
        "text": "Tulipe",
        "pts": 30,
        "aliases": [
          "tulipe",
          "printemps"
        ]
      },
      {
        "text": "Tournesol",
        "pts": 15,
        "aliases": [
          "tournesol",
          "soleil"
        ]
      },
      {
        "text": "Orchidee",
        "pts": 12,
        "aliases": [
          "orchidee",
          "exotique"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre plat de pates prefere ?",
    "answers": [
      {
        "text": "Carbonara",
        "pts": 45,
        "aliases": [
          "carbonara",
          "creme",
          "lardons"
        ]
      },
      {
        "text": "Bolognaise",
        "pts": 20,
        "aliases": [
          "bolognaise",
          "viande",
          "tomate"
        ]
      },
      {
        "text": "Pesto",
        "pts": 15,
        "aliases": [
          "pesto",
          "basilic"
        ]
      },
      {
        "text": "A la sauce tomate",
        "pts": 12,
        "aliases": [
          "sauce tomate",
          "simple"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre glace preferee ?",
    "answers": [
      {
        "text": "Chocolat",
        "pts": 45,
        "aliases": [
          "chocolat",
          "glace"
        ]
      },
      {
        "text": "Vanille",
        "pts": 20,
        "aliases": [
          "vanille",
          "classique"
        ]
      },
      {
        "text": "Fraise",
        "pts": 15,
        "aliases": [
          "fraise",
          "fruit"
        ]
      },
      {
        "text": "Pistache",
        "pts": 12,
        "aliases": [
          "pistache",
          "verte"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre type de chocolat prefere ?",
    "answers": [
      {
        "text": "Noir",
        "pts": 50,
        "aliases": [
          "chocolat noir",
          "cacao"
        ]
      },
      {
        "text": "Au lait",
        "pts": 20,
        "aliases": [
          "chocolat au lait",
          "doux"
        ]
      },
      {
        "text": "Blanc",
        "pts": 12,
        "aliases": [
          "chocolat blanc",
          "sucre"
        ]
      },
      {
        "text": "Praline",
        "pts": 10,
        "aliases": [
          "praline",
          "noisette"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre oeuvre d'art preferee ?",
    "answers": [
      {
        "text": "Mona Lisa",
        "pts": 45,
        "aliases": [
          "mona lisa",
          "louvre"
        ]
      },
      {
        "text": "La Nuit etoilee",
        "pts": 20,
        "aliases": [
          "nuit etoilee",
          "van gogh"
        ]
      },
      {
        "text": "Le Cri",
        "pts": 15,
        "aliases": [
          "le cri",
          "munch"
        ]
      },
      {
        "text": "La Joconde",
        "pts": 12,
        "aliases": [
          "la joconde"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre type de film prefere ?",
    "answers": [
      {
        "text": "Action",
        "pts": 50,
        "aliases": [
          "action",
          "combat"
        ]
      },
      {
        "text": "Comedie",
        "pts": 20,
        "aliases": [
          "comedie",
          "rire"
        ]
      },
      {
        "text": "Drame",
        "pts": 12,
        "aliases": [
          "drame",
          "emotion"
        ]
      },
      {
        "text": "Science-fiction",
        "pts": 10,
        "aliases": [
          "science-fiction",
          "espace"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre animal sauvage prefere ?",
    "answers": [
      {
        "text": "Lion",
        "pts": 45,
        "aliases": [
          "lion",
          "roi",
          "safari"
        ]
      },
      {
        "text": "Elephant",
        "pts": 20,
        "aliases": [
          "elephant",
          "trompe"
        ]
      },
      {
        "text": "Tigre",
        "pts": 15,
        "aliases": [
          "tigre",
          "rayures"
        ]
      },
      {
        "text": "Aigle",
        "pts": 12,
        "aliases": [
          "aigle",
          "vol"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre petit-dejeuner prefere ?",
    "answers": [
      {
        "text": "Tartines",
        "pts": 35,
        "aliases": [
          "tartines",
          "beurre",
          "confiture"
        ]
      },
      {
        "text": "Cereales",
        "pts": 25,
        "aliases": [
          "cereales",
          "lait"
        ]
      },
      {
        "text": "Oeufs",
        "pts": 20,
        "aliases": [
          "oeufs",
          "brouilles"
        ]
      },
      {
        "text": "Yaourt",
        "pts": 12,
        "aliases": [
          "yaourt",
          "laitage"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre animal de compagnie préféré ?",
    "answers": [
      {
        "text": "Chien",
        "pts": 35,
        "aliases": [
          "chien",
          "fidele"
        ]
      },
      {
        "text": "Chat",
        "pts": 25,
        "aliases": [
          "chat",
          "independant"
        ]
      },
      {
        "text": "Lapin",
        "pts": 20,
        "aliases": [
          "lapin",
          "rongeur"
        ]
      },
      {
        "text": "Poisson",
        "pts": 12,
        "aliases": [
          "poisson",
          "aquarium"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre mois de l'annee prefere ?",
    "answers": [
      {
        "text": "Decembre",
        "pts": 45,
        "aliases": [
          "decembre",
          "noel",
          "fete"
        ]
      },
      {
        "text": "Juillet",
        "pts": 20,
        "aliases": [
          "juillet",
          "ete",
          "vacances"
        ]
      },
      {
        "text": "Aout",
        "pts": 15,
        "aliases": [
          "aout",
          "plage"
        ]
      },
      {
        "text": "Mai",
        "pts": 12,
        "aliases": [
          "mai",
          "printemps"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre moyen de communication prefere ?",
    "answers": [
      {
        "text": "Telephone",
        "pts": 30,
        "aliases": [
          "telephone",
          "appel"
        ]
      },
      {
        "text": "SMS",
        "pts": 25,
        "aliases": [
          "sms",
          "texte"
        ]
      },
      {
        "text": "Appel",
        "pts": 20,
        "aliases": [
          "voix"
        ]
      },
      {
        "text": "Visio",
        "pts": 15,
        "aliases": [
          "visio",
          "video"
        ]
      },
      {
        "text": "Aucun",
        "pts": 10,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre éditeur de terminal préféré ?",
    "answers": [
      {
        "text": "Vim",
        "pts": 40,
        "aliases": [
          "vim",
          "vi"
        ]
      },
      {
        "text": "Nano",
        "pts": 25,
        "aliases": [
          "nano",
          "pico"
        ]
      },
      {
        "text": "Emacs",
        "pts": 15,
        "aliases": [
          "emacs"
        ]
      },
      {
        "text": "Neovim",
        "pts": 12,
        "aliases": [
          "neovim",
          "nvim"
        ]
      },
      {
        "text": "Micro",
        "pts": 8,
        "aliases": [
          "micro"
        ]
      }
    ]
  },
  {
    "q": "Votre boisson gazeuse preferee ?",
    "answers": [
      {
        "text": "Coca",
        "pts": 45,
        "aliases": [
          "coca",
          "cola"
        ]
      },
      {
        "text": "Sprite",
        "pts": 20,
        "aliases": [
          "sprite",
          "citron"
        ]
      },
      {
        "text": "Fanta",
        "pts": 15,
        "aliases": [
          "fanta",
          "orange"
        ]
      },
      {
        "text": "Orangina",
        "pts": 12,
        "aliases": [
          "orangina"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre fromage prefere ?",
    "answers": [
      {
        "text": "Camembert",
        "pts": 40,
        "aliases": [
          "camembert",
          "fort"
        ]
      },
      {
        "text": "Roquefort",
        "pts": 25,
        "aliases": [
          "roquefort",
          "bleu"
        ]
      },
      {
        "text": "Comte",
        "pts": 15,
        "aliases": [
          "comte",
          "suisse"
        ]
      },
      {
        "text": "Mozzarella",
        "pts": 12,
        "aliases": [
          "mozzarella",
          "italien"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre moment de la journee prefere ?",
    "answers": [
      {
        "text": "Matin",
        "pts": 40,
        "aliases": [
          "matin",
          "reveil"
        ]
      },
      {
        "text": "Midi",
        "pts": 30,
        "aliases": [
          "midi",
          "dejeuner"
        ]
      },
      {
        "text": "Soir",
        "pts": 15,
        "aliases": [
          "soir",
          "diner"
        ]
      },
      {
        "text": "Nuit",
        "pts": 10,
        "aliases": [
          "nuit",
          "calme"
        ]
      },
      {
        "text": "Aucun",
        "pts": 5,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  },
  {
    "q": "Votre nombre porte-bonheur prefere ?",
    "answers": [
      {
        "text": "7",
        "pts": 35,
        "aliases": [
          "sept",
          "chance"
        ]
      },
      {
        "text": "3",
        "pts": 30,
        "aliases": [
          "trois",
          "equilibre"
        ]
      },
      {
        "text": "1",
        "pts": 15,
        "aliases": [
          "un",
          "unite"
        ]
      },
      {
        "text": "13",
        "pts": 12,
        "aliases": [
          "treize",
          "superstition"
        ]
      },
      {
        "text": "Aucun",
        "pts": 8,
        "aliases": [
          "aucun",
          "rien"
        ]
      }
    ]
  }
];

  /* ---------- helpers exposés ---------- */
  const bank = () => global.SURVEY_QUESTIONS || [];
  const questionCount = () => bank().length;

  global.SURVEY_QUESTIONS.bank = bank;
  global.SURVEY_QUESTIONS.questionCount = questionCount;
})(window);
