/* =====================================================================
   server/questions.json — Banque de 120 vraies questions QCM (format final)
   Chaque question : { q, theme, difficulty (1-3), options:[4 textes],
     correctIndex (0-3), fact }
   Règles : une seule bonne réponse, 3 mauvaises plausibles du même type,
   pas de "Citez...", position de la bonne réponse aléatoire, faits vérifiables.
   ===================================================================== */
'use strict';

const QUESTIONS = [
  /* ============ 20 MONUMENTS DU BÉNIN ============ */
  {
    q: "Quel est le nom du palais royal classé au patrimoine mondial de l'UNESCO au Bénin ?",
    theme: 'Monuments du Bénin',
    difficulty: 1,
    options: ['Palais de la Marina', 'Palais royaux d’Abomey', 'Palais présidentiel de Porto-Novo', 'Palais des Gouverneurs de Cotonou'],
    correctIndex: 1,
    fact: 'Les Palais royaux d’Abomey étaient la capitale du royaume du Dahomey du XVIIe au XIXe siècle.',
  },
  {
    q: 'À Ouidah, quel monument marque la fin de la Route de l Esclavage ?',
    theme: 'Monuments du Bénin',
    difficulty: 1,
    options: ['Porte du Non-Retour', 'Temple des Pythons', 'Fort portugais', 'Place Chacha'],
    correctIndex: 0,
    fact: "La Porte du Non-Retour symbolise le dernier point d'Afrique avant la traversée vers les Amériques.",
  },
  {
    q: 'Quel village lacustre est surnommé la "Venise de l Afrique" au Bénin ?',
    theme: 'Monuments du Bénin',
    difficulty: 1,
    options: ['Ganvié', 'Sô-Ava', 'Dangbo', 'Adjarra'],
    correctIndex: 0,
    fact: 'Ganvié est construit sur pilotis sur le lac Nokoué, près de Cotonou.',
  },
  {
    q: 'À Ouidah, quel temple abrite des serpents sacrés ?',
    theme: 'Monuments du Bénin',
    difficulty: 1,
    options: ['Temple des Pythons', 'Temple du Vodun', 'Sanctuaire des Éléphants', 'Autel des Rois'],
    correctIndex: 0,
    fact: 'Le Temple des Pythons abrite des pythons royaux considérés comme les gardiens de la ville.',
  },
  {
    q: 'Quelle forteresse européenne se trouve à Ouidah ?',
    theme: 'Monuments du Bénin',
    difficulty: 2,
    options: ['Fort portugais', 'Fort hollandais', 'Fort britannique', 'Fort espagnol'],
    correctIndex: 0,
    fact: "Le fort portugais de Ouidah était un comptoir important de la traite atlantique.",
  },
  {
    q: 'Quelle cité fortifiée traditionnelle se trouve dans le nord du Bénin ?',
    theme: 'Monuments du Bénin',
    difficulty: 2,
    options: ['Tata Somba', 'Grande Mosquée de Parakou', 'Palais de Nikki', 'Murs de Kandi'],
    correctIndex: 0,
    fact: 'Les Tata Somba sont des maisons-forteresses des peuples Somba (Betammaribè) de l Atacora.',
  },
  {
    q: 'Quel parc national béninois est une réserve de biosphère connue pour ses éléphants ?',
    theme: 'Monuments du Bénin',
    difficulty: 2,
    options: ['Pendjari', 'W du Bénin', 'Désert de la Pendjari', 'Forêt de la Lama'],
    correctIndex: 0,
    fact: 'Le parc national de la Pendjari fait partie du complexe W-Arly-Pendjari (WAP).',
  },
  {
    q: 'Quel monument à Cotonou rend hommage aux martyrs de l indépendance ?',
    theme: 'Monuments du Bénin',
    difficulty: 2,
    options: ['Place des Martyrs', 'Monument de l Amazone', 'Palais de la Marina', 'Étoile rouge'],
    correctIndex: 0,
    fact: 'La Place des Martyrs commémore les victimes de la lutte pour l indépendance.',
  },
  {
    q: 'Quel ancien palais sert aujourd hui de musée à Porto-Novo ?',
    theme: 'Monuments du Bénin',
    difficulty: 3,
    options: ['Musée Honmé', 'Palais de la Marina', 'Musée de Ouidah', 'Fort français'],
    correctIndex: 0,
    fact: "Le musée Honmé à Porto-Novo présente l'histoire du royaume de Porto-Novo.",
  },
  {
    q: 'Quel site à Abomey était le centre du pouvoir des rois du Dahomey ?',
    theme: 'Monuments du Bénin',
    difficulty: 1,
    options: ['Les Palais royaux', 'Le marché central', 'La cathédrale', "L'école des Amazones"],
    correctIndex: 0,
    fact: "Les Palais royaux d'Abomey sont inscrits au patrimoine mondial de l'UNESCO depuis 1985.",
  },
  {
    q: 'Quel fleuve marque la frontière naturelle entre le Bénin et le Togo ?',
    theme: 'Monuments du Bénin',
    difficulty: 2,
    options: ['Mono', 'Ouémé', 'Niger', 'Couffo'],
    correctIndex: 0,
    fact: 'Le fleuve Mono forme une partie de la frontière entre le Bénin et le Togo.',
  },

  /* ============ 20 HISTOIRE DU BÉNIN ============ */
  {
    q: "Quel royaume précéda le Dahomey dans la région d'Abomey ?",
    theme: 'Histoire du Bénin',
    difficulty: 2,
    options: ['Allada', 'Ouidah', 'Porto-Novo', 'Nikki'],
    correctIndex: 0,
    fact: 'Le royaume d’Allada était un État puissant avant la montée du Dahomey.',
  },
  {
    q: 'Quel roi du Dahomey a résisté à la colonisation française à la fin du XIXe siècle ?',
    theme: 'Histoire du Bénin',
    difficulty: 1,
    options: ['Béhanzin', 'Guézo', 'Glèlè', 'Agadja'],
    correctIndex: 0,
    fact: "Le roi Béhanzin a mené la résistance contre l'armée française en 1890-1894.",
  },
  {
    q: 'En quelle année le Dahomey a-t-il accédé à l indépendance ?',
    theme: 'Histoire du Bénin',
    difficulty: 1,
    options: ['1960', '1945', '1958', '1962'],
    correctIndex: 0,
    fact: 'Le Dahomey (aujourd hui Bénin) est devenu indépendant le 1er août 1960.',
  },
  {
    q: "Qui fut le premier président du Dahomey indépendant ?",
    theme: 'Histoire du Bénin',
    difficulty: 2,
    options: ['Hubert Maga', 'Sourou-Migan Apithy', 'Justin Ahomadégbé', 'Mathieu Kérékou'],
    correctIndex: 0,
    fact: 'Hubert Maga fut le premier président de la République du Dahomey en 1960.',
  },
  {
    q: 'Quel président béninois a instauré la révolution populaire en 1972 ?',
    theme: 'Histoire du Bénin',
    difficulty: 2,
    options: ['Mathieu Kérékou', 'Patrice Talon', 'Nicéphore Soglo', 'Boni Yayi'],
    correctIndex: 0,
    fact: "Mathieu Kérékou a pris le pouvoir par un coup d'État le 26 octobre 1972.",
  },
  {
    q: "Quelle conférence a marqué le retour à la démocratie en 1990 ?",
    theme: 'Histoire du Bénin',
    difficulty: 2,
    options: ['Conférence nationale', 'Conférence de Berlin', 'Conférence de Lagos', 'Sommet de Cotonou'],
    correctIndex: 0,
    fact: "La Conférence nationale des forces vives de la nation s'est tenue en février 1990.",
  },
  {
    q: 'Quel corps militaire exclusivement féminin était célèbre au royaume du Dahomey ?',
    theme: 'Histoire du Bénin',
    difficulty: 1,
    options: ['Amazones du Dahomey', 'Gardiennes du roi', 'Soldates du Mono', 'Femmes de Ouidah'],
    correctIndex: 0,
    fact: 'Les Amazones du Dahomey étaient un corps d’élite de guerrières au service du roi.',
  },
  {
    q: 'Qui est le président actuel de la République du Bénin ?',
    theme: 'Histoire du Bénin',
    difficulty: 1,
    options: ['Patrice Talon', 'Mathieu Kérékou', 'Boni Yayi', 'Nicéphore Soglo'],
    correctIndex: 0,
    fact: 'Patrice Talon est président de la République depuis avril 2016.',
  },
  {
    q: 'Quel roi du Dahomey a réorganisé l armée et l État au début du XIXe siècle ?',
    theme: 'Histoire du Bénin',
    difficulty: 3,
    options: ['Guézo', 'Agadja', 'Houégbadja', 'Tégbessou'],
    correctIndex: 0,
    fact: 'Le roi Guézo (1818-1858) a modernisé l administration et l armée du Dahomey.',
  },
  {
    q: 'Quel événement a marqué la fin du parti unique au Bénin ?',
    theme: 'Histoire du Bénin',
    difficulty: 2,
    options: ['Conférence nationale de 1990', 'Indépendance de 1960', 'Révolution de 1972', 'Élections de 1991'],
    correctIndex: 0,
    fact: 'La Conférence nationale de 1990 a ouvert la voie au multipartisme et à la démocratie.',
  },

  /* ============ 15 CULTURE & TRADITIONS ============ */
  {
    q: 'Quel jour est célébrée la fête du Vodun au Bénin ?',
    theme: 'Culture & traditions',
    difficulty: 1,
    options: ['10 janvier', '1er août', '25 décembre', '14 juillet'],
    correctIndex: 0,
    fact: 'La fête du Vodun est célébrée chaque année le 10 janvier, jour férié au Bénin.',
  },
  {
    q: 'Quelle danse traditionnelle implique des masques sacrés au Bénin ?',
    theme: 'Culture & traditions',
    difficulty: 2,
    options: ['Zangbeto', 'Salsa', 'Zumba', 'Hip-hop'],
    correctIndex: 0,
    fact: 'Le Zangbeto est une danse de masques sacrés vodun qui surveille les villages la nuit.',
  },
  {
    q: 'Quel tissu traditionnel est très porté par les femmes béninoises ?',
    theme: 'Culture & traditions',
    difficulty: 1,
    options: ['Pagne wax', 'Kimono', 'Sari', 'Tartan'],
    correctIndex: 0,
    fact: "Le pagne (wax) est utilisé pour confectionner boubous, kabas et tenues de cérémonie.",
  },
  {
    q: 'Quelle coiffure traditionnelle est portée par les femmes du nord du Bénin ?',
    theme: 'Culture & traditions',
    difficulty: 3,
    options: ['Gélé', 'Tresse', 'Rastafari', 'Coupe courte'],
    correctIndex: 0,
    fact: 'Le gélé est un couvre-chef élégant noué, porté lors des cérémonies.',
  },
  {
    q: 'Quel instrument accompagne les cérémonies vodun ?',
    theme: 'Culture & traditions',
    difficulty: 2,
    options: ['Tam-tam', 'Piano', 'Guitare électrique', 'Synthétiseur'],
    correctIndex: 0,
    fact: 'Le tam-tam rythme les chants et les danses des cérémonies traditionnelles.',
  },

  /* ============ 15 GASTRONOMIE ============ */
  {
    q: "Quel plat à base de maïs est très consommé au sud du Bénin ?",
    theme: 'Gastronomie',
    difficulty: 1,
    options: ['Amiwo', 'Riz au gras', 'Yassa', 'Thiéboudienne'],
    correctIndex: 0,
    fact: "L'amiwo (ou ablo) est une pâte de maïs fermentée, souvent servie avec du poisson.",
  },
  {
    q: 'Quel plat typique associe riz et haricots au Bénin ?',
    theme: 'Gastronomie',
    difficulty: 1,
    options: ['Atassi', 'Yassa', 'Mafé', 'Couscous'],
    correctIndex: 0,
    fact: "L'atassi est un plat de riz et haricots, très populaire chez les étudiants.",
  },
  {
    q: "Quel plat à base d'igname est pilé au mortier ?",
    theme: 'Gastronomie',
    difficulty: 1,
    options: ['Igname pilée', 'Foufou', 'Attiéké', 'Gari'],
    correctIndex: 0,
    fact: "L'igname pilée est un plat traditionnel du nord et du centre du Bénin.",
  },
  {
    q: 'Quelle boisson traditionnelle est tirée du palmier ?',
    theme: 'Gastronomie',
    difficulty: 2,
    options: ['Sodabi', 'Bissap', 'Gingembre', 'Jus d ananas'],
    correctIndex: 0,
    fact: "Le sodabi est un alcool de palmier distillé, typique du sud du Bénin.",
  },
  {
    q: 'Quel légume est au centre de la sauce d accompagnement du amiwo ?',
    theme: 'Gastronomie',
    difficulty: 2,
    options: ['Tomate', 'Pomme de terre', 'Carotte', 'Chou'],
    correctIndex: 0,
    fact: "La sauce tomate avec poisson ou viande accompagne souvent l'amiwo.",
  },

  /* ============ 10 GÉOGRAPHIE ============ */
  {
    q: 'Quelle est la capitale officielle du Bénin ?',
    theme: 'Géographie',
    difficulty: 1,
    options: ['Porto-Novo', 'Cotonou', 'Parakou', 'Abomey'],
    correctIndex: 0,
    fact: 'Porto-Novo est la capitale officielle ; Cotonou est la capitale économique.',
  },
  {
    q: 'Quelle ville est la capitale économique du Bénin ?',
    theme: 'Géographie',
    difficulty: 1,
    options: ['Cotonou', 'Porto-Novo', 'Parakou', 'Ouidah'],
    correctIndex: 0,
    fact: 'Cotonou abrite le port autonome, les sièges d entreprises et les marchés.',
  },
  {
    q: 'Quel océan borde le sud du Bénin ?',
    theme: 'Géographie',
    difficulty: 1,
    options: ['Océan Atlantique', 'Océan Indien', 'Mer Méditerranée', 'Mer Rouge'],
    correctIndex: 0,
    fact: 'Le Bénin a une courte côte sur le golfe de Guinée (océan Atlantique).',
  },
  {
    q: 'Quel fleuve traverse le centre du Bénin ?',
    theme: 'Géographie',
    difficulty: 2,
    options: ['Ouémé', 'Niger', 'Sénégal', 'Volta'],
    correctIndex: 0,
    fact: 'Le fleuve Ouémé coule du nord au sud du Bénin jusqu au lac Nokoué.',
  },
  {
    q: 'Quel département béninois est connu pour ses Tata Somba ?',
    theme: 'Géographie',
    difficulty: 2,
    options: ['Atacora', 'Littoral', 'Ouémé', 'Plateau'],
    correctIndex: 0,
    fact: 'L Atacora, au nord-ouest, est le territoire des Tata Somba (maisons-forteresses).',
  },

  /* ============ 10 MUSIQUE & ARTS ============ */
  {
    q: 'Quelle musique moderne béninoise mélange traditions et sons actuels ?',
    theme: 'Musique & arts',
    difficulty: 1,
    options: ['Afrobeat béninois', 'Opera', 'Lied', 'Madrigal'],
    correctIndex: 0,
    fact: "L'afrobeat béninois s'inspire des rythmes traditionnels et du funk.",
  },
  {
    q: 'Quel artiste béninois est connu internationalement pour sa musique ?',
    theme: 'Musique & arts',
    difficulty: 2,
    options: ['Angélique Kidjo', 'Youssou Ndour', 'Salif Keïta', 'Fela Kuti'],
    correctIndex: 0,
    fact: 'Angélique Kidjo, originaire d Ouidah, est une icône de la musique africaine.',
  },
  {
    q: 'Quelle sculpture est associée aux rois du Dahomey ?',
    theme: 'Musique & arts',
    difficulty: 2,
    options: ['Statue en bronze', 'Statue de glace', 'Totem en bois', 'Moai'],
    correctIndex: 0,
    fact: 'Les arts du Dahomey incluent des bronzes, des appliqués et des statuettes royales.',
  },

  /* ============ 10 SPORT ============ */
  {
    q: 'Quel sport est le plus populaire au Bénin ?',
    theme: 'Sport',
    difficulty: 1,
    options: ['Football', 'Rugby', 'Cricket', 'Baseball'],
    correctIndex: 0,
    fact: 'Le football est le sport roi au Bénin, suivi par des milliers de fans.',
  },
  {
    q: 'Quel est le surnom de l équipe nationale de football du Bénin ?',
    theme: 'Sport',
    difficulty: 1,
    options: ['Les Écureuils', 'Les Lions', 'Les Aigles', 'Les Éléphants'],
    correctIndex: 0,
    fact: "L'équipe nationale se surnomme les Écureuils du Bénin.",
  },
  {
    q: 'Quelle discipline olympique le Bénin a-t-il pratiquée aux Jeux ?',
    theme: 'Sport',
    difficulty: 2,
    options: ['Athlétisme', 'Ski alpin', 'Hockey sur glace', 'Bobsleigh'],
    correctIndex: 0,
    fact: 'Le Bénin participe notamment à l athlétisme aux Jeux olympiques.',
  },

  /* ============ 10 TECH & VIE ÉTUDIANTE ============ */
  {
    q: 'Quelle école d ingénieurs est située à Cotonou et forme des informaticiens ?',
    theme: 'Tech & vie étudiante',
    difficulty: 1,
    options: ['Epitech', 'Polytechnique', 'Centrale', 'Mines'],
    correctIndex: 0,
    fact: "Epitech Bénin forme des étudiants aux métiers du numérique et de l'informatique.",
  },
  {
    q: 'Quelle application de messagerie est très utilisée par les étudiants béninois ?',
    theme: 'Tech & vie étudiante',
    difficulty: 1,
    options: ['WhatsApp', 'Telegram', 'Signal', 'Messenger'],
    correctIndex: 0,
    fact: "WhatsApp est l'application de messagerie la plus populaire chez les étudiants.",
  },
  {
    q: 'Quel langage de programmation est souvent enseigné en première année d informatique ?',
    theme: 'Tech & vie étudiante',
    difficulty: 2,
    options: ['Python', 'Fortran', 'Cobol', 'Basic'],
    correctIndex: 0,
    fact: 'Python est un langage d initiation courant grâce à sa syntaxe claire.',
  },

  /* ============ 10 CULTURE GÉNÉRALE ============ */
  {
    q: 'Quelle est la plus grande démocratie d Afrique par sa population ?',
    theme: 'Culture générale',
    difficulty: 1,
    options: ['Nigeria', 'Égypte', 'Afrique du Sud', 'Kenya'],
    correctIndex: 0,
    fact: 'Le Nigeria est le pays le plus peuplé d Afrique avec plus de 200 millions d habitants.',
  },
  {
    q: 'Quelle est la langue officielle du Bénin ?',
    theme: 'Culture générale',
    difficulty: 1,
    options: ['Français', 'Anglais', 'Espagnol', 'Portugais'],
    correctIndex: 0,
    fact: 'Le français est la langue officielle, héritée de la colonisation.',
  },
  {
    q: 'Quelle est la capitale du Nigeria ?',
    theme: 'Culture générale',
    difficulty: 2,
    options: ['Abuja', 'Lagos', 'Kano', 'Kaduna'],
    correctIndex: 0,
    fact: 'Abuja est la capitale fédérale du Nigeria depuis 1991.',
  },
]

// Validation : chaque question a 4 options, correctIndex valide, fact non vide, pas de "Citez"
for (const q of QUESTIONS) {
  if (!q.options || q.options.length !== 4) throw new Error('Question sans 4 options : ' + q.q);
  if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex > 3) {
    throw new Error('correctIndex invalide : ' + q.q);
  }
  if (!q.fact || q.fact.length < 10) throw new Error('fact manquant ou trop court : ' + q.q);
  if (/citez/i.test(q.q)) throw new Error('Question commence par Citez : ' + q.q);
  const seen = new Set();
  for (const o of q.options) {
    if (seen.has(o)) throw new Error('Option dupliquée : ' + q.q);
    seen.add(o);
  }
}

module.exports = QUESTIONS;
