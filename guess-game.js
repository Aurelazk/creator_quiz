const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { WebSocketServer, WebSocket } = require('ws');

const DATA_DIR = path.join(__dirname, 'data');
const DB = path.join(DATA_DIR, 'guess-scores.json');
const PAGE = path.join(__dirname, 'Guess Their Answer — CREATOR.html');
const PARTY_PAGE = path.join(__dirname, 'Guess Their Answer — Soirée.html');
const DURATION = 3;
const ROUNDS = 10;
const MAX_PLAYERS = 80;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const QUESTIONS = [
  ['Nomme un fruit tropical', [['mangue', 38], ['ananas', 26], ['banane', 16], ['papaye', 12], ['noix de coco|coco', 8]]],
  ['Nomme un plat qu’on mange souvent au Bénin', [['pate|pâte', 32], ['riz', 24], ['haricot', 16], ['igname', 14], ['alloco|attieke', 14]]],
  ['Nomme un réseau social', [['whatsapp', 34], ['facebook', 24], ['tiktok', 18], ['instagram', 14], ['snapchat', 10]]],
  ['Nomme un langage de programmation', [['python', 32], ['javascript|js', 26], ['java', 16], ['c', 14], ['php', 12]]],
  ['Nomme un moyen de transport à Cotonou', [['zem|zemidjan|moto', 45], ['taxi', 20], ['voiture', 13], ['bus', 12], ['velo', 10]]],
  ['Nomme un objet dans le sac d’un étudiant', [['cahier', 30], ['stylo', 26], ['ordinateur|pc|laptop', 20], ['livre', 14], ['trousse', 10]]],
  ['Nomme un métier de la tech', [['developpeur|dev', 36], ['designer', 22], ['hacker', 16], ['community manager', 14], ['data scientist|data analyst', 12]]],
  ['Nomme un sport populaire', [['football|foot', 55], ['basket|basketball', 15], ['tennis', 10], ['handball', 10], ['athletisme|course', 10]]],
  ['Nomme une boisson quand il fait chaud', [['eau', 40], ['jus', 22], ['bissap', 16], ['soda|coca', 14], ['the glace', 8]]],
  ['Nomme une chose qu’on fait avec son téléphone', [['appeler|appel', 30], ['message|sms|whatsapp', 24], ['photo|selfie', 18], ['musique', 16], ['jeu|jouer', 12]]],
];

const rooms = new Map();

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB)) fs.writeFileSync(DB, '[]');

const normalize = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeName = (value) => normalize(value).replace(/ /g, '_');

function levenshtein(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const saved = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = saved;
    }
  }
  return row[b.length];
}

function findAnswer(raw, answers) {
  const text = normalize(raw);
  if (!text) return -1;
  for (let i = 0; i < answers.length; i++) {
    for (const variant of answers[i][0].split('|').map(normalize)) {
      if (
        text === variant ||
        (variant.length >= 4 && text.includes(variant)) ||
        (text.length >= 4 && variant.startsWith(text)) ||
        (variant.length >= 5 && levenshtein(text, variant) <= 1)
      ) {
        return i;
      }
    }
  }
  return -1;
}

function cleanText(value, max = 40) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function clampInt(value, min, max, fallback = min) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function shuffle(list) {
  const array = [...list];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function send(ws, message) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
}

function makeCode() {
  let code = '';
  do {
    code = Array.from({ length: 4 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function loadScores() {
  try {
    const parsed = JSON.parse(fs.readFileSync(DB, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveScores(entries) {
  fs.writeFileSync(DB, JSON.stringify(entries.slice(-500), null, 2));
}

function updateLeaderboard(players) {
  const entries = loadScores();
  for (const player of players) {
    const key = normalizeName(player.name);
    if (!key) continue;
    const existing = entries.find((entry) => entry.key === key);
    if (existing) {
      existing.name = player.name;
      existing.hood = player.hood;
      existing.hat = player.hat;
      existing.face = player.face;
      existing.costume = player.costume;
      existing.acc = player.acc;
      existing.best = Math.max(existing.best || 0, player.score);
      existing.games = (existing.games || 0) + 1;
      existing.last = Date.now();
    } else {
      entries.push({
        key,
        name: player.name,
        hood: player.hood,
        hat: player.hat,
        face: player.face,
        costume: player.costume,
        acc: player.acc,
        best: player.score,
        games: 1,
        last: Date.now(),
      });
    }
  }
  saveScores(entries);
}

function leaderboard() {
  return loadScores()
    .sort((a, b) => (b.best || 0) - (a.best || 0) || (a.name || '').localeCompare(b.name || ''))
    .slice(0, 10)
    .map(({ name, hood, hat, face, costume, acc, best }) => ({ name, hood, hat, face, costume, acc, best }));
}

function publicPlayers(room, ranked = false) {
  const players = [...room.players.values()].map((player) => ({
    id: player.id,
    name: player.name,
    hood: player.hood,
    hat: player.hat,
    face: player.face,
    costume: player.costume,
    acc: player.acc,
    score: player.score,
    gained: player.gained,
    answer: player.answer,
    answerIndex: player.answerIndex,
    answered: player.answered,
    rank: player.rank || null,
  }));
  if (ranked) return players.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return players;
}

function broadcast(room, message) {
  send(room.host, message);
  for (const player of room.players.values()) send(player.ws, message);
}

function broadcastPlayers(room, message) {
  for (const player of room.players.values()) send(player.ws, message);
}

function roomLobby(room) {
  return {
    type: 'lobby',
    code: room.code,
    players: publicPlayers(room),
    count: room.players.size,
    max: MAX_PLAYERS,
  };
}

function notifyRoster(room) {
  if (room.closed) return;
  if (room.state === 'lobby') {
    broadcast(room, roomLobby(room));
    return;
  }
  if (room.state !== 'question') return;
  broadcast(room, {
    type: 'answer-count',
    count: [...room.players.values()].filter((item) => item.answered).length,
    total: room.players.size,
  });
  if (room.players.size && [...room.players.values()].every((item) => item.answered)) {
    clearTimeout(room.autoReveal);
    room.autoReveal = setTimeout(() => revealQuestion(room), 500);
  }
}

function clearRoomTimers(room) {
  clearTimeout(room.timer);
  clearTimeout(room.autoReveal);
  room.timer = null;
  room.autoReveal = null;
}

function closeRoom(room, message = 'La salle est fermée.') {
  if (!room || room.closed) return;
  room.closed = true;
  clearRoomTimers(room);
  for (const player of room.players.values()) {
    send(player.ws, { type: 'room-closed', message });
    player.ws.guessRoom = null;
    player.ws.guessPlayer = null;
  }
  if (room.host) {
    room.host.guessRoom = null;
    room.host.guessRole = null;
  }
  rooms.delete(room.code);
}

function startQuestion(room) {
  clearRoomTimers(room);
  room.state = 'question';
  room.deadline = Date.now() + DURATION * 1000;
  for (const player of room.players.values()) {
    player.answer = '';
    player.answerIndex = -1;
    player.answered = false;
    player.gained = 0;
    player.rank = null;
  }

  const [question] = QUESTIONS[room.order[room.index]];
  broadcast(room, {
    type: 'question',
    index: room.index,
    total: ROUNDS,
    q: question,
    duration: DURATION,
    multiplier: room.index >= ROUNDS - 2 ? 2 : 1,
    players: publicPlayers(room),
  });

  room.timer = setTimeout(() => revealQuestion(room), DURATION * 1000 + 120);
}

function revealQuestion(room) {
  if (!room || room.closed || room.state !== 'question') return;
  clearRoomTimers(room);
  room.state = 'reveal';

  const [, answers] = QUESTIONS[room.order[room.index]];
  const multiplier = room.index >= ROUNDS - 2 ? 2 : 1;
  const namesByIndex = answers.map(() => []);

  for (const player of room.players.values()) {
    const index = findAnswer(player.answer, answers);
    player.answerIndex = index;
    player.gained = index >= 0 ? answers[index][1] * multiplier : 0;
    player.score += player.gained;
    if (index >= 0) namesByIndex[index].push(player.name);
  }

  const ranked = publicPlayers(room).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  ranked.forEach((player, index) => {
    const source = room.players.get(player.id);
    if (source) source.rank = index + 1;
    player.rank = index + 1;
  });

  broadcast(room, {
    type: 'reveal',
    index: room.index,
    total: ROUNDS,
    q: QUESTIONS[room.order[room.index]][0],
    multiplier,
    distribution: answers.map(([label, points], index) => ({
      label: label.split('|')[0],
      points: points * multiplier,
      players: namesByIndex[index],
    })),
    players: ranked,
  });
}

function endGame(room) {
  if (!room || room.closed) return;
  clearRoomTimers(room);
  room.state = 'end';
  const ranked = publicPlayers(room).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  ranked.forEach((player, index) => {
    const source = room.players.get(player.id);
    if (source) source.rank = index + 1;
    player.rank = index + 1;
  });
  updateLeaderboard(ranked);
  broadcast(room, { type: 'end', players: ranked, leaderboard: leaderboard() });
}

function startGame(room) {
  if (!room || room.closed || !room.host) return;
  if (room.state === 'question' || room.state === 'reveal') {
    send(room.host, { type: 'error', message: 'La partie est déjà en cours.' });
    return;
  }
  if (!room.players.size) {
    send(room.host, { type: 'error', message: 'Attends au moins un joueur avant de lancer.' });
    return;
  }
  room.order = shuffle(QUESTIONS.map((_, index) => index)).slice(0, ROUNDS);
  room.index = 0;
  for (const player of room.players.values()) {
    player.score = 0;
    player.gained = 0;
    player.rank = null;
  }
  startQuestion(room);
}

function handleHost(ws, message) {
  if (ws.guessRoom) closeRoom(ws.guessRoom, 'La salle est fermée.');
  const room = {
    code: makeCode(),
    host: ws,
    players: new Map(),
    state: 'lobby',
    order: [],
    index: 0,
    deadline: 0,
    timer: null,
    autoReveal: null,
    closed: false,
    createdAt: Date.now(),
  };
  rooms.set(room.code, room);
  ws.guessRoom = room;
  ws.guessRole = 'host';
  send(ws, { type: 'room-created', code: room.code, max: MAX_PLAYERS });
  send(ws, roomLobby(room));
}

function handleJoin(ws, message) {
  if (ws.guessRoom) return send(ws, { type: 'error', message: 'Tu es déjà dans une salle.' });
  const code = String(message.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  const room = rooms.get(code);
  if (!room) return send(ws, { type: 'error', message: 'Salle introuvable. Vérifie le code.' });
  if (room.state !== 'lobby') return send(ws, { type: 'error', message: 'Cette partie a déjà commencé.' });
  if (room.players.size >= MAX_PLAYERS) return send(ws, { type: 'error', message: 'La salle est complète.' });

  const player = {
    id: randomUUID(),
    ws,
    name: cleanText(message.name, 14) || 'Joueur',
    hood: clampInt(message.hood, 0, 4, 0),
    hat: clampInt(message.hat, 0, 6, 0),
    face: clampInt(message.face, 0, 3, 0),
    costume: clampInt(message.costume, 0, 5, 0),
    acc: clampInt(message.acc, 0, 3, 0),
    score: 0,
    gained: 0,
    answer: '',
    answerIndex: -1,
    answered: false,
    rank: null,
  };
  room.players.set(player.id, player);
  ws.guessRoom = room;
  ws.guessRole = 'player';
  ws.guessPlayer = player;

  send(ws, { type: 'joined', selfId: player.id, code: room.code });
  broadcast(room, roomLobby(room));
}

function handleAnswer(ws, message) {
  const room = ws.guessRoom;
  const player = ws.guessPlayer;
  if (!room || !player || room.closed) return;
  if (room.state !== 'question' || player.answered) return;
  const text = cleanText(message.text, 40);
  if (!text) return;
  player.answer = text;
  player.answered = true;
  send(ws, { type: 'answer-accepted' });
  broadcast(room, {
    type: 'answer-count',
    count: [...room.players.values()].filter((item) => item.answered).length,
    total: room.players.size,
  });
  if ([...room.players.values()].every((item) => item.answered)) {
    clearTimeout(room.autoReveal);
    room.autoReveal = setTimeout(() => revealQuestion(room), 600);
  }
}

function handleReveal(ws) {
  const room = ws.guessRoom;
  if (!room || ws.guessRole !== 'host') return;
  if (room.state !== 'question') return;
  revealQuestion(room);
}

function handleNext(ws) {
  const room = ws.guessRoom;
  if (!room || ws.guessRole !== 'host') return;
  if (room.state !== 'reveal') return;
  if (room.index >= ROUNDS - 1) {
    endGame(room);
    return;
  }
  room.index++;
  startQuestion(room);
}

function handleRestart(ws) {
  const room = ws.guessRoom;
  if (!room || ws.guessRole !== 'host') return;
  clearRoomTimers(room);
  room.state = 'lobby';
  room.index = 0;
  for (const player of room.players.values()) {
    player.score = 0;
    player.gained = 0;
    player.answer = '';
    player.answerIndex = -1;
    player.answered = false;
    player.rank = null;
  }
  broadcast(room, roomLobby(room));
}

function handleLeave(ws) {
  const room = ws.guessRoom;
  if (!room) return;
  if (ws.guessRole === 'host') {
    closeRoom(room, 'L’animateur a fermé la salle.');
    send(ws, { type: 'left' });
    return;
  }
  const player = ws.guessPlayer;
  if (player) room.players.delete(player.id);
  ws.guessRoom = null;
  ws.guessPlayer = null;
  ws.guessRole = null;
  send(ws, { type: 'left' });
  notifyRoster(room);
}

function detach(ws) {
  const room = ws.guessRoom;
  if (!room || room.closed) return;
  if (ws.guessRole === 'host') {
    closeRoom(room, 'L’animateur a fermé la salle.');
    return;
  }
  const player = ws.guessPlayer;
  if (player) room.players.delete(player.id);
  ws.guessRoom = null;
  ws.guessPlayer = null;
  ws.guessRole = null;
  notifyRoster(room);
}

function handleMessage(ws, raw) {
  let message;
  try {
    message = JSON.parse(raw.toString());
  } catch {
    return send(ws, { type: 'error', message: 'Message invalide.' });
  }

  switch (message.type) {
    case 'host':
      handleHost(ws, message);
      break;
    case 'join':
      handleJoin(ws, message);
      break;
    case 'start':
      startGame(ws.guessRoom);
      break;
    case 'answer':
      handleAnswer(ws, message);
      break;
    case 'reveal':
      handleReveal(ws);
      break;
    case 'next':
      handleNext(ws);
      break;
    case 'restart':
      handleRestart(ws);
      break;
    case 'leave':
      handleLeave(ws);
      break;
    default:
      send(ws, { type: 'error', message: 'Type de message inconnu.' });
  }
}

function attachGuessGame() {
  const wss = new WebSocketServer({ noServer: true });
  wss.on('connection', (ws) => {
    ws.guessRoom = null;
    ws.guessRole = null;
    ws.guessPlayer = null;
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    ws.on('message', (raw) => handleMessage(ws, raw));
    ws.on('close', () => detach(ws));
  });

  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.isAlive === false) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, 30000);
  wss.on('close', () => clearInterval(heartbeat));
  return wss;
}

function registerGuessRoutes(app) {
  const sendPage = (req, res) => res.sendFile(PAGE);
  const sendPartyPage = (req, res) => res.sendFile(PARTY_PAGE);
  app.get('/guess', sendPage);
  app.get('/guess/', sendPage);
  app.get('/guess-their-answer', sendPage);
  app.get('/guess-party', sendPartyPage);
  app.get('/guess-party/', sendPartyPage);
  app.get('/api/guess/leaderboard', (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.json(leaderboard());
  });
}

module.exports = { attachGuessGame, registerGuessRoutes };
