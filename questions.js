/* =====================================================================
   BANQUE DE QUESTIONS  —  Quiz 3D CREATOR — Epitech Bénin
   15 questions niveau débutant, web & mobile
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
  { q: "Quel langage crée la structure d'une page web ?", options: ["HTML", "CSS", "JS", "PHP"], ans: 0, info: "HTML = HyperText Markup Language, c'est le squelette de la page." },
  { q: "Quel langage met en forme (couleurs, polices) une page ?", options: ["CSS", "HTML", "JS", "SQL"], ans: 0, info: "CSS = Cascading Style Sheets, pour le design et la mise en page." },
  { q: "Quel langage rend une page web interactive ?", options: ["JavaScript", "HTML", "CSS", "Python"], ans: 0, info: "JavaScript gère les interactions clic, formulaire, animation." },
  { q: "Quelle balise crée un titre principal ?", options: ["<h1>", "<title>", "<p>", "<div>"], ans: 0, info: "La balise <h1> est le titre le plus important de la page." },
  { q: "Quelle balise crée un lien cliquable ?", options: ["<a>", "<link>", "<url>", "<href>"], ans: 0, info: "La balise <a> (anchor) crée un hyperlien avec l'attribut href." },
  { q: "Quelle balise affiche une image ?", options: ["", "", "<pic>", "<photo>"], ans: 0, info: "La balise  affiche une image avec l'attribut src." },
  { q: "Quelle extension a un fichier HTML ?", options: [".html", ".htm", ".htmlx", ".page"], ans: 0, info: "L'extension standard est .html (ou .htm autrefois)." },
  { q: "Que signifie le \"H\" de HTML ?", options: ["HyperText", "Home", "Hyperlink", "High"], ans: 0, info: "HTML = HyperText Markup Language." },
  { q: "Quel langage s'exécute dans le navigateur ?", options: ["JavaScript", "Python", "Java", "C++"], ans: 0, info: "JavaScript tourne directement dans le navigateur web." },
  { q: "Quelle balise crée un paragraphe ?", options: ["<p>", "<para>", "<text>", "<div>"], ans: 0, info: "La balise <p> définit un paragraphe de texte." },
  { q: "Quelle application est une app mobile ?", options: ["Une app installée sur téléphone", "Un site web", "Un logiciel PC", "Un fichier PDF"], ans: 0, info: "Une app mobile s'installe sur un smartphone ou tablette." },
  { q: "Que signifie le sigle API ?", options: ["Application Programming Interface", "Advanced Programming Input", "Auto Program Interface", "App Public Internet"], ans: 0, info: "Une API permet à deux logiciels de communiquer." },
  { q: "Quel outil enregistre l'historique du code ?", options: ["Git", "HTML", "CSS", "JSON"], ans: 0, info: "Git est un gestionnaire de versions pour le code source." },
  { q: "Qu'est-ce qu'une application web ?", options: ["Un site accessible via navigateur", "Un logiciel à installer", "Un fichier image", "Un base de données"], ans: 0, info: "Une app web se utilise directement dans le navigateur, sans installation." },
  { q: "Quel langage est utilisé pour créer des apps Android natives ?", options: ["Kotlin", "Swift", "HTML", "SQL"], ans: 0, info: "Kotlin (et Java) est le langage officiel pour le développement Android." }
];

const optsOf = (q) => q.options || OPTIONS;
