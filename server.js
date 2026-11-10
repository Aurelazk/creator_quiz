// ============================================================
//  CREATOR Quiz – Serveur Node.js (Express + Socket.io)
//  Jeu multijoueur « Guess Their Answer » en temps réel
// ============================================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- Fichiers statiques ------------------------------------------------
app.use(express.static('public'));
app.use(express.static('.')); // Servir aussi les fichiers à la racine

// === Stockage en mémoire ===============================================
const rooms = {}; // code → Room

// Couleurs attribuées aux joueurs
const PLAYER_COLORS = [
  '#0033FF', // Bleu
  '#00E5A0', // Vert Menthe
  '#FF5C35', // Orange
  '#FFD700', // Jaune
  '#8B5CF6', // Violet
  '#FF69B4', // Rose
  '#00BCD4', // Cyan
  '#E91E63', // Fuchsia
];

// Banque de questions (15 ; on en tire 10 aléatoirement)
const QUESTION_BANK = [
  'Nommez un fruit jaune',
  'Nommez un super-héros célèbre',
  'Nommez une capitale africaine',
  "Nommez un sport qu'on pratique en équipe",
  'Nommez un plat que tout le monde aime',
  "Nommez un animal qu'on peut voir en Afrique",
  'Nommez une application populaire sur téléphone',
  'Nommez un langage de programmation',
  "Nommez quelque chose qu'on emmène à la plage",
  'Nommez une marque de téléphone',
  'Nommez un film culte',
  "Nommez un pays d'Europe",
  'Nommez un instrument de musique',
  'Nommez un réseau social',
  'Nommez une matière enseignée à l\'école',
];

const ROUND_DURATION = 30; // secondes par question

// Noms & réponses pour les bots (mode démo)
const BOT_NAMES = ['Koffi 🔥', 'Amina ✨', 'Yao 💪', 'Fatou 🌟', 'Kodjo 🎯'];
const BOT_ANSWERS = {
  'Nommez un fruit jaune':                        ['banane', 'banane', 'citron', 'ananas', 'mangue'],
  'Nommez un super-héros célèbre':                ['Spider-Man', 'Batman', 'Spider-Man', 'Superman', 'Iron Man'],
  'Nommez une capitale africaine':                 ['Cotonou', 'Lagos', 'Dakar', 'Cotonou', 'Abidjan'],
  "Nommez un sport qu'on pratique en équipe":      ['football', 'football', 'basketball', 'football', 'volleyball'],
  'Nommez un plat que tout le monde aime':         ['pizza', 'pizza', 'riz', 'pâtes', 'pizza'],
  "Nommez un animal qu'on peut voir en Afrique":   ['lion', 'éléphant', 'lion', 'girafe', 'lion'],
  'Nommez une application populaire sur téléphone':['WhatsApp', 'TikTok', 'WhatsApp', 'Instagram', 'WhatsApp'],
  'Nommez un langage de programmation':            ['Python', 'JavaScript', 'Python', 'C', 'Python'],
  "Nommez quelque chose qu'on emmène à la plage":  ['serviette', 'lunettes', 'serviette', 'ballon', 'crème solaire'],
  'Nommez une marque de téléphone':                ['Samsung', 'iPhone', 'Samsung', 'iPhone', 'Xiaomi'],
  'Nommez un film culte':                          ['Titanic', 'Avengers', 'Titanic', 'Black Panther', 'Avengers'],
  "Nommez un pays d'Europe":                       ['France', 'France', 'Allemagne', 'France', 'Espagne'],
  'Nommez un instrument de musique':               ['guitare', 'piano', 'guitare', 'batterie', 'piano'],
  'Nommez un réseau social':                       ['Instagram', 'TikTok', 'Instagram', 'Twitter', 'Instagram'],
  "Nommez une matière enseignée à l'école":        ['maths', 'maths', 'français', 'maths', 'physique'],
};

// === Helpers ============================================================

/** Génère un code de salle à 4 lettres unique */
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // pas de I/O pour éviter la confusion
  let code;
  do {
    code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  } while (rooms[code]);
  return code;
}

/** Normalise une réponse pour faciliter le regroupement */
function normalizeAnswer(raw) {
  return raw
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')                       // supprime les accents
    .replace(/^(le |la |les |l'|l'|un |une |des |du )/i, '') // articles courants
    .replace(/[^a-z0-9 ]/g, '')                             // caractères spéciaux
    .trim();
}

/** Tire 10 questions au hasard */
function pickQuestions() {
  const shuffled = [...QUESTION_BANK].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 10);
}

// === Socket.io – Logique de jeu =========================================

io.on('connection', (socket) => {
  console.log(`✦ Connexion : ${socket.id}`);

  // Métadonnées rattachées au socket
  socket.data = { role: null, roomCode: null };

  // ---- Créer une salle -------------------------------------------------
  socket.on('create-room', () => {
    const code = generateRoomCode();
    rooms[code] = {
      code,
      animatorId: socket.id,
      players: [],
      questions: pickQuestions(),
      currentQuestion: -1,
      answers: {},          // normalized → { original, playerIds[] }
      state: 'lobby',       // lobby | question | results | podium
      timer: null,
      timeLeft: 0,
    };
    socket.data.role = 'animator';
    socket.data.roomCode = code;
    socket.join(code);
    socket.emit('room-created', { code });
    console.log(`✦ Salle créée : ${code}`);
  });

  // ---- Rejoindre une salle ---------------------------------------------
  socket.on('join-room', ({ code, pseudo }) => {
    code = (code || '').toUpperCase().trim();
    const room = rooms[code];

    if (!room) return socket.emit('error-msg', { message: 'Salle introuvable 😕' });
    if (room.state !== 'lobby') return socket.emit('error-msg', { message: 'La partie a déjà commencé !' });
    if (!pseudo || !pseudo.trim()) return socket.emit('error-msg', { message: 'Choisis un pseudo !' });

    const colorIndex = room.players.length % PLAYER_COLORS.length;
    const player = {
      id: socket.id,
      pseudo: pseudo.trim().substring(0, 15),
      color: PLAYER_COLORS[colorIndex],
      score: 0,
      answered: false,
    };

    room.players.push(player);
    socket.data.role = 'player';
    socket.data.roomCode = code;
    socket.join(code);

    socket.emit('joined-room', { player, code });
    io.to(code).emit('players-updated', { players: room.players });
    console.log(`✦ ${player.pseudo} a rejoint ${code}`);
  });

  // ---- Lancer la partie ------------------------------------------------
  socket.on('start-game', ({ code }) => {
    const room = rooms[code];
    if (!room || socket.id !== room.animatorId) return;
    if (room.players.length < 1) {
      return socket.emit('error-msg', { message: 'Il faut au moins 1 joueur !' });
    }

    room.state = 'question';
    room.currentQuestion = 0;
    io.to(code).emit('game-started');
    sendQuestion(code);
  });

  // ---- Envoyer la question courante ------------------------------------
  function sendQuestion(code) {
    const room = rooms[code];
    if (!room) return;

    // Réinitialiser les réponses
    room.answers = {};
    room.players.forEach((p) => (p.answered = false));
    room.timeLeft = ROUND_DURATION;
    room.state = 'question';

    io.to(code).emit('new-question', {
      number: room.currentQuestion + 1,
      text: room.questions[room.currentQuestion],
      total: room.questions.length,
      timeLeft: room.timeLeft,
    });

    // Chrono côté serveur (source de vérité)
    if (room.timer) clearInterval(room.timer);
    room.timer = setInterval(() => {
      room.timeLeft--;
      io.to(code).emit('timer-tick', { timeLeft: room.timeLeft });
      if (room.timeLeft <= 0) {
        clearInterval(room.timer);
        room.timer = null;
        calculateResults(code);
      }
    }, 1000);
  }

  // ---- Soumettre une réponse -------------------------------------------
  socket.on('submit-answer', ({ code, answer }) => {
    const room = rooms[code];
    if (!room || room.state !== 'question') return;

    const player = room.players.find((p) => p.id === socket.id);
    if (!player || player.answered) return;
    if (!answer || !answer.trim()) return;

    player.answered = true;
    const key = normalizeAnswer(answer);

    if (!room.answers[key]) {
      room.answers[key] = { original: answer.trim(), playerIds: [] };
    }
    room.answers[key].playerIds.push(player.id);

    // Prévenir l'animateur
    io.to(room.animatorId).emit('player-answered', {
      playerId: player.id,
      pseudo: player.pseudo,
    });
    socket.emit('answer-confirmed');

    // Tous ont répondu → on calcule tout de suite
    if (room.players.every((p) => p.answered)) {
      if (room.timer) clearInterval(room.timer);
      room.timer = null;
      setTimeout(() => calculateResults(code), 800);
    }
  });

  // ---- Calcul des résultats --------------------------------------------
  function calculateResults(code) {
    const room = rooms[code];
    if (!room || room.state === 'results') return; // éviter le doublon
    room.state = 'results';

    const totalAnswered = room.players.filter((p) => p.answered).length;
    const results = [];

    for (const [, data] of Object.entries(room.answers)) {
      const count = data.playerIds.length;
      const percentage = totalAnswered > 0 ? Math.round((count / totalAnswered) * 100) : 0;
      const points = percentage * 10; // Score = % × 10

      // Attribuer les points
      data.playerIds.forEach((pid) => {
        const p = room.players.find((pl) => pl.id === pid);
        if (p) p.score += points;
      });

      results.push({
        text: data.original,
        count,
        percentage,
        points,
        playerIds: data.playerIds,
      });
    }

    // Trier par popularité décroissante
    results.sort((a, b) => b.count - a.count);

    io.to(code).emit('question-results', {
      questionText: room.questions[room.currentQuestion],
      results,
      scores: room.players.map((p) => ({
        id: p.id,
        pseudo: p.pseudo,
        score: p.score,
        color: p.color,
      })),
    });
  }

  // ---- Question suivante -----------------------------------------------
  socket.on('next-question', ({ code }) => {
    const room = rooms[code];
    if (!room || socket.id !== room.animatorId) return;

    room.currentQuestion++;
    if (room.currentQuestion >= room.questions.length) {
      showPodium(code);
    } else {
      sendQuestion(code);
    }
  });

  // ---- Podium final ----------------------------------------------------
  function showPodium(code) {
    const room = rooms[code];
    if (!room) return;

    room.state = 'podium';
    if (room.timer) clearInterval(room.timer);

    const rankings = [...room.players].sort((a, b) => b.score - a.score);
    io.to(code).emit('show-podium', { rankings });
  }

  // ---- Rejouer ---------------------------------------------------------
  socket.on('play-again', ({ code }) => {
    const room = rooms[code];
    if (!room || socket.id !== room.animatorId) return;

    room.questions = pickQuestions();
    room.currentQuestion = -1;
    room.state = 'lobby';
    room.answers = {};
    room.players.forEach((p) => {
      p.score = 0;
      p.answered = false;
    });

    io.to(code).emit('back-to-lobby', { players: room.players });
  });

  // ---- Déconnexion -----------------------------------------------------
  socket.on('disconnect', () => {
    const code = socket.data.roomCode;
    if (!code || !rooms[code]) return;
    const room = rooms[code];

    if (socket.data.role === 'animator') {
      // L'animateur quitte → fin de partie
      if (room.timer) clearInterval(room.timer);
      io.to(code).emit('game-ended', { message: "L'animateur a quitté la partie." });
      delete rooms[code];
      console.log(`✦ Salle ${code} supprimée (animateur parti)`);
    } else {
      room.players = room.players.filter((p) => p.id !== socket.id);
      io.to(code).emit('players-updated', { players: room.players });
      console.log(`✦ Joueur déconnecté de ${code}`);
    }
  });
});

// === Démarrage du serveur ===============================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🎮 CREATOR Quiz – Serveur démarré sur http://localhost:${PORT}\n`);
});
