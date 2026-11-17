/* =====================================================================
   server/index.js — serveur autoritaire CREATOR · QCM Quiz
   - HTTP statique (aucun build)
   - WebSocket natif (paquet ws)
   - Salles, chronos, scores et validation calculés ici, jamais côté client
   - Classement général persistant dans server/data/leaderboard.json
   ===================================================================== */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { WebSocketServer, WebSocket } = require('ws');
const QRCode = require('qrcode');
const G = require('../shared/rules');
const upstash = require('../shared/upstash');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(__dirname, 'data');
const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');
const QUESTIONS_FILE = path.join(__dirname, 'questions.json');
const PORT = Number(process.env.PORT) || 3000;
const HOST_IDLE_MS = 5 * 60 * 1000;
const LOBBY_DISCONNECT_MS = 30 * 1000;
// Alphabet sans I, L, O, 0, 1 (caractères visuellement confus)
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 5;
const CODE_MAX_TRIES = 50;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '';
const JOIN_FAIL_MAX = 30;
const JOIN_WINDOW_MS = 60 * 1000;
const joinFailures = new Map();
const DEMO_MAX_MS = 12 * 60 * 1000;
const DEMO_BOT_COUNT = 8;
const DEMO_ROUNDS = G.GAME_Q;

const QUESTIONS = JSON.parse(fs.readFileSync(QUESTIONS_FILE, 'utf8'));

function lanIp() {
  for (const list of Object.values(os.networkInterfaces() || {})) {
    for (const n of (list || [])) {
      if (n.family === 'IPv4' && !n.internal) return n.address;
    }
  }
  return null;
}

function randCode() {
  let c = '';
  for (let i = 0; i < CODE_LENGTH; i++) c += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  return c;
}

function createCode(rooms) {
  for (let i = 0; i < CODE_MAX_TRIES; i++) {
    const code = randCode();
    if (!rooms.has(code)) return code;
  }
  return null;
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

/* ------------------------------------------------------------------ */
/* Limite des échecs de jonction                                      */
/* ------------------------------------------------------------------ */
function noteJoinFailure(ip, code) {
  const now = Date.now();
  const key = ip + '|' + code;
  const ipKey = ip + '|all';
  const codeKey = code + '|all';
  const entry = joinFailures.get(key) || { times: [], count: 0 };
  const ipEntry = joinFailures.get(ipKey) || { times: [], count: 0 };
  const codeEntry = joinFailures.get(codeKey) || { times: [], count: 0 };
  entry.times.push(now);
  ipEntry.times.push(now);
  codeEntry.times.push(now);
  entry.times = entry.times.filter((t) => now - t < JOIN_WINDOW_MS);
  ipEntry.times = ipEntry.times.filter((t) => now - t < JOIN_WINDOW_MS);
  codeEntry.times = codeEntry.times.filter((t) => now - t < JOIN_WINDOW_MS);
  entry.count = entry.times.length;
  ipEntry.count = ipEntry.times.length;
  codeEntry.count = codeEntry.times.length;
  joinFailures.set(key, entry);
  joinFailures.set(ipKey, ipEntry);
  joinFailures.set(codeKey, codeEntry);
}
function joinBlocked(ip, code) {
  const now = Date.now();
  const key = ip + '|' + code;
  const ipKey = ip + '|all';
  const codeKey = code + '|all';
  const entry = joinFailures.get(key);
  const ipEntry = joinFailures.get(ipKey);
  const codeEntry = joinFailures.get(codeKey);
  if (!entry && !ipEntry && !codeEntry) return false;
  const times = (entry ? entry.times : []).concat(ipEntry ? ipEntry.times : []).concat(codeEntry ? codeEntry.times : []);
  const recent = times.filter((t) => now - t < JOIN_WINDOW_MS);
  return recent.length >= JOIN_FAIL_MAX;
}

/* ------------------------------------------------------------------ */
/* Classement général                                                 */
/* ------------------------------------------------------------------ */
let leaderboard = [];
let leaderboardDirty = false;
function loadLeaderboard() {
  try {
    leaderboard = JSON.parse(fs.readFileSync(LEADERBOARD_FILE, 'utf8'));
    if (!Array.isArray(leaderboard)) leaderboard = [];
  } catch (e) { leaderboard = []; }
}
function saveLeaderboard() {
  if (!leaderboardDirty) return;
  try { fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(leaderboard, null, 2)); } catch (e) {}
  leaderboardDirty = false;
}
function recordScore(playerName, score, correctCount, avgTimeMs) {
  leaderboard.push({ name: playerName, score, correct: correctCount, avgTimeMs, at: Date.now() });
  leaderboard.sort((a, b) => b.score - a.score || b.correct - a.correct || a.avgTimeMs - b.avgTimeMs);
  if (leaderboard.length > 100) leaderboard.length = 100;
  leaderboardDirty = true;
}

/* ------------------------------------------------------------------ */
/* État d'une salle                                                   */
/* ------------------------------------------------------------------ */
function makeRoom(code, hostToken, hostName, settings) {
  return {
    code,
    hostToken,
    hostName: (hostName || 'Animateur').slice(0, 30),
    hostWs: null,
    hostConnected: true,
    hostDisconnectedAt: 0,
    phase: G.PHASES.LOBBY,
    paused: false,
    settings: {
      duration: [10, 15, 20].includes(Number(settings && settings.duration)) ? Number(settings.duration) : 15,
      maxPlayers: clamp(Number(settings && settings.maxPlayers) || 20, 2, 20),
      themes: Array.isArray(settings && settings.themes) && settings.themes.length > 0
        ? settings.themes.slice()
        : ['tout'],
    },
    mode: (settings && settings.mode === 'teams') ? 'teams' : 'solo',
    teamScores: { bleu: 0, orange: 0 },
    players: new Map(),
    order: [],
    askedHistory: new Set(),
    qi: -1,
    qTotal: 0,
    question: null,
    questionStartAt: 0,
    answers: new Map(),   /* playerId => { optionIdx, at, correct, points, locked } */
    revealed: false,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    demo: false,
    demoTimer: null,
    demoKill: null,
    _answerLock: false,
  };
}

function touch(room) { room.lastActivity = Date.now(); }

/* ------------------------------------------------------------------ */
/* Génération du état transmis aux clients                            */
/* ------------------------------------------------------------------ */
function refObj(room, id) {
  const p = room.players.get(id);
  if (!p) return null;
  return { id: p.id, name: p.name, score: p.score || 0, team: p.team };
}

function baseState(room) {
  return {
    code: room.code,
    phase: room.phase,
    paused: room.paused,
    settings: room.settings,
    mode: room.mode,
    teamScores: room.teamScores,
    players: Array.from(room.players.values()).map(refObj.bind(null, room)),
    qi: room.qi,
    qTotal: room.qTotal,
    question: room.question ? {
      text: room.question.q,
      theme: room.question.theme,
      format: 'qcm',
      options: room.question.options.map((o) => ({ id: String.fromCharCode(65 + o.index || 0), text: o })),
      timeLimit: room.settings.duration * 1000,
    } : null,
    timeLeft: room.question && room.questionStartAt
      ? Math.max(0, room.questionStartAt + room.settings.duration * 1000 - Date.now())
      : 0,
    revealed: room.revealed,
    answers: room.answers ? Array.from(room.answers.entries()).map(([pid, a]) => ({
      playerId: pid, optionIdx: a.optionIdx, correct: a.correct, points: a.points,
    })) : [],
  };
}

function playerState(room, playerId) {
  const s = baseState(room);
  const p = room.players.get(playerId);
  if (p) {
    s.me = { id: p.id, name: p.name, score: p.score || 0, team: p.team };
    s.me.isController = false; /* plus de contrôleur */
    s.me.isStealer = false;
    s.me.canAnswer = room.phase === G.PHASES.QUESTION && !room.paused;
    s.me.canBuzz = false;
    s.me.isStealer = false;
    const myAns = room.answers && room.answers.get(playerId);
    s.me.locked = myAns ? myAns.locked : false;
    s.me.myAnswer = myAns ? myAns.optionIdx : null;
    s.me.correctCount = p.correctCount || 0;
  }
  return s;
}

function broadcast(room) {
  const state = baseState(room);
  const payload = JSON.stringify({ type: 'state', state });
  for (const p of room.players.values()) {
    if (p.ws && p.ws.readyState === WebSocket.OPEN) p.ws.send(payload);
  }
  if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
    room.hostWs.send(JSON.stringify({ type: 'state', state, role: 'host' }));
  }
}

function eventToAll(room, event) {
  const payload = JSON.stringify({ type: 'event', event });
  for (const p of room.players.values()) {
    if (p.ws && p.ws.readyState === WebSocket.OPEN) p.ws.send(payload);
  }
  if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
    room.hostWs.send(JSON.stringify({ type: 'event', event, role: 'host' }));
  }
}

function eventToPlayer(room, playerId, event) {
  const p = room.players.get(playerId);
  if (p && p.ws && p.ws.readyState === WebSocket.OPEN) {
    p.ws.send(JSON.stringify({ type: 'event', event }));
  }
}

function sendError(ws, code, message) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'error', code, message }));
}

/* ------------------------------------------------------------------ */
/* Cycle de jeu                                                       */
/* ------------------------------------------------------------------ */
function startGame(room) {
  if (room.players.size < 1) return false;
  const total = G.GAME_Q;
  room.order = G.pickQuestionsByTheme(QUESTIONS, total, room.settings.themes, room.askedHistory);
  for (const q of room.order) room.askedHistory.add(q.q);
  /* équilibre difficulté : 3 faciles, 4 moyennes, 3 difficiles */
  room.order = G.balanceDifficulty(room.order);
  room.qi = -1;
  room.qTotal = room.order.length;
  room.phase = G.PHASES.COUNTDOWN;
  room.question = null;
  room.answers = new Map();
  room.revealed = false;
  room.questionStartAt = 0;
  touch(room);
  eventToAll(room, { type: 'game-start', room: room.code });
  nextQuestion(room);
  return true;
}

function nextQuestion(room) {
  room.qi++;
  if (room.qi >= room.order.length) {
    endGame(room);
    return;
  }
  room.question = room.order[room.qi];
  room.answers = new Map();
  room.revealed = false;
  room.questionStartAt = Date.now();
  room.phase = G.PHASES.COUNTDOWN;
  touch(room);
  eventToAll(room, {
    type: 'round-start',
    qi: room.qi,
    qTotal: room.qTotal,
    question: room.question.q,
    theme: room.question.theme,
    phase: 'countdown',
    timeLimit: room.settings.duration * 1000,
  });
  broadcast(room);
  setTimeout(() => {
    if (!rooms.has(room.code)) return;
    if (room.phase !== G.PHASES.COUNTDOWN) return;
    openQuestion(room);
  }, G.COUNTDOWN_MS);
}

function openQuestion(room) {
  room.phase = G.PHASES.QUESTION;
  room.questionStartAt = Date.now();
  touch(room);
  eventToAll(room, { type: 'round-start', qi: room.qi, qTotal: room.qTotal, phase: 'question' });
  broadcast(room);
  /* Auto-reveal après le délai */
  room._questionTimer = setTimeout(() => {
    if (!rooms.has(room.code)) return;
    if (room.phase !== G.PHASES.QUESTION) return;
    revealQuestion(room, 'timeout');
  }, room.settings.duration * 1000);
}

function handleAnswer(room, playerId, optionIdx) {
  if (room.paused) return;
  const player = room.players.get(playerId);
  if (!player || room.phase !== G.PHASES.QUESTION) return;
  /* verrou : une seule réponse par joueur par question */
  if (room.answers.has(playerId)) return;
  if (room._answerLock) return;
  room._answerLock = true;

  const now = Date.now();
  const timeLeft = Math.max(0, room.questionStartAt + room.settings.duration * 1000 - now);
  const res = G.judgeQCM(room.question, optionIdx, room.answers ? Array.from(room.answers.values()).map((a) => a.optionIdx) : []);

  const answer = {
    optionIdx,
    at: now,
    correct: res.kind === 'found',
    locked: true,
    points: 0,
  };

  if (res.kind === 'found') {
    answer.points = G.pointsForResponse(timeLeft, room.settings.duration * 1000);
    player.score = (player.score || 0) + answer.points;
    player.correctCount = (player.correctCount || 0) + 1;
    room.answers.set(playerId, answer);
    room._answerLock = false;
    eventToPlayer(room, playerId, { type: 'result', kind: 'found', points: answer.points, timeLeft });
    /* premier juste : reveal immédiat pour tous */
    revealQuestion(room, 'found', playerId);
  } else if (res.kind === 'dup') {
    room.answers.set(playerId, answer);
    room._answerLock = false;
    eventToPlayer(room, playerId, { type: 'result', kind: 'dup' });
  } else {
    answer.locked = true;
    room.answers.set(playerId, answer);
    room._answerLock = false;
    eventToPlayer(room, playerId, { type: 'result', kind: 'miss', locked: true });
  }
  touch(room);
  broadcast(room);
}

function revealQuestion(room, reason, winnerId) {
  if (room.revealed) return;
  room.revealed = true;
  room.phase = G.PHASES.REVEAL;
  const correctIdx = room.question.correctIndex != null ? room.question.correctIndex : 0;
  const correctText = room.question.options[correctIdx];
  touch(room);
  eventToAll(room, {
    type: 'reveal',
    qi: room.qi,
    qTotal: room.qTotal,
    correctIndex: correctIdx,
    correctText,
    fact: room.question.fact,
    winnerId,
    reason,
    answers: Array.from(room.answers.entries()).map(([pid, a]) => ({
      playerId: pid, optionIdx: a.optionIdx, correct: a.correct, points: a.points,
    })),
  });
  broadcast(room);
  room._revealTimer = setTimeout(() => {
    if (!rooms.has(room.code)) return;
    nextQuestion(room);
  }, G.REVEAL_MS);
}

function endGame(room) {
  room.phase = G.PHASES.END;
  room.question = null;
  room.answers = new Map();
  room.revealed = false;
  touch(room);
  /* classement final */
  const sorted = Array.from(room.players.values())
    .slice()
    .sort((a, b) => (b.score || 0) - (a.score || 0) || (b.correctCount || 0) - (a.correctCount || 0));
  const podium = sorted.slice(0, 3);
  /* enregistrement au classement général */
  if (!room.demo) {
    for (const p of sorted) {
      recordScore(p.name, p.score || 0, p.correctCount || 0, 0);
    }
    saveLeaderboard();
  }
  eventToAll(room, {
    type: 'end',
    podium: podium.map((p) => ({ id: p.id, name: p.name, score: p.score || 0 })),
    scores: sorted.map((p) => ({ id: p.id, name: p.name, score: p.score || 0, correct: p.correctCount || 0 })),
  });
  broadcast(room);
  /* démo : redémarrage auto */
  if (room.demo) {
    room.demoEndedAt = Date.now();
    room._demoRestart = setTimeout(() => {
      if (rooms.has(room.code)) startGame(room);
    }, 7000);
  }
}

/* ------------------------------------------------------------------ */
/* Gestion des joueurs                                                */
/* ------------------------------------------------------------------ */
function joinPlayer(room, ws, msg) {
  const name = (msg.name || 'Joueur').slice(0, 24);
  const token = crypto.randomBytes(16).toString('hex');
  const avatar = msg.avatar || { silhouette: 'neutral', hair: 'short', outfit: 'jacket', accessory: 'none', colors: { hair: '#FF6B2C', jacket: '#0B35FE', shirt: '#FF4E20', pants: '#0C1A4B', shoes: '#FF4E20', skin: '#E0AC69' } };
  const team = room.mode === 'teams' ? (room.teamScores.bleu <= room.teamScores.orange ? 'bleu' : 'orange') : null;
  const player = {
    id: 'p_' + crypto.randomBytes(8).toString('hex'),
    token,
    name,
    avatar,
    team,
    score: 0,
    correctCount: 0,
    ws,
    connected: true,
    joinedAt: Date.now(),
  };
  room.players.set(player.id, player);
  ws._ctx = { role: 'player', code: room.code, playerId: player.id, token };
  touch(room);
  broadcast(room);
  return { player, token };
}

function findPlayerByToken(room, token) {
  for (const p of room.players.values()) {
    if (p.token === token) return p;
  }
  return null;
}

function removePlayer(room, playerId, reason) {
  const p = room.players.get(playerId);
  if (!p) return;
  p.connected = false;
  p.ws = null;
  room.players.delete(playerId);
  touch(room);
  broadcast(room);
  if (room.players.size === 0 && room.phase === G.PHASES.LOBBY) {
    /* salle vide : fermeture après délai */
    room._emptyTimer = setTimeout(() => {
      if (rooms.has(room.code) && rooms.get(room.code).players.size === 0) closeRoom(room);
    }, LOBBY_DISCONNECT_MS);
  }
}

/* ------------------------------------------------------------------ */
/* Fermeture de salle                                                 */
/* ------------------------------------------------------------------ */
function closeRoom(room) {
  if (room._questionTimer) clearTimeout(room._questionTimer);
  if (room._revealTimer) clearTimeout(room._revealTimer);
  if (room._emptyTimer) clearTimeout(room._emptyTimer);
  if (room._demoRestart) clearTimeout(room._demoRestart);
  if (room.demoTimer) clearInterval(room.demoTimer);
  if (room.demoKill) clearTimeout(room.demoKill);
  rooms.delete(room.code);
}

/* ------------------------------------------------------------------ */
/* Démo                                                               */
/* ------------------------------------------------------------------ */
const DEMO_BOTS = ['Awa', 'Koffi', 'Fatou', 'Yao', 'Mariam', 'Sènami', 'Kodjo', 'Chantal'];
const DEMO_WRONG = ['Zorglub', 'Bidule', 'Patatras', 'Glouglou', 'Machin', 'Truc'];

function demoAvatar(i) {
  const SILHOUETTES = ['masc', 'fem', 'neutral'];
  const HAIRS = ['short', 'curly', 'afro', 'braids', 'ponytail', 'bald', 'cap'];
  const OUTFITS = ['jacket', 'hoodie', 'dress', 'tee'];
  const ACCESSORIES = ['none', 'glasses', 'headphones', 'beanie', 'backpack'];
  const HAIR_COLORS = ['#FF6B2C', '#2B1B12', '#F5C542', '#1B2A6B', '#E84A8A', '#F4F6FC', '#5AD86B', '#8B5CF6'];
  const TOP_COLORS = ['#FF4E20', '#0B35FE', '#00E472', '#FF7A00', '#2E85FF', '#F4F6FC', '#111827'];
  const PANTS_COLORS = ['#0C1A4B', '#111827', '#3B4A6B', '#6B7280', '#F4F6FC'];
  const SHOE_COLORS = ['#FF4E20', '#F4F6FC', '#0B35FE', '#111827', '#00E472'];
  const SKIN_COLORS = ['#F1C27D', '#E0AC69', '#C68642', '#A16B3A', '#8D5524', '#7A4E28', '#5C3317', '#3E2723'];
  return {
    silhouette: SILHOUETTES[i % SILHOUETTES.length],
    hair: HAIRS[(i * 3) % HAIRS.length],
    outfit: OUTFITS[i % OUTFITS.length],
    accessory: ACCESSORIES[(i * 2) % ACCESSORIES.length],
    colors: {
      hair: HAIR_COLORS[(i * 2) % HAIR_COLORS.length],
      jacket: TOP_COLORS[(i * 4 + 1) % TOP_COLORS.length],
      shirt: TOP_COLORS[(i * 2) % TOP_COLORS.length],
      pants: PANTS_COLORS[i % PANTS_COLORS.length],
      shoes: SHOE_COLORS[(i * 3) % SHOE_COLORS.length],
      skin: SKIN_COLORS[i % SKIN_COLORS.length],
    },
  };
}

function startDemo(room) {
  const d = room._demo = { joined: 0, nextAt: Date.now() + 800, started: false, botIds: [] };
  const bots = () => d.botIds.map((id) => room.players.get(id)).filter(Boolean);
  const tick = () => {
    if (!rooms.has(room.code)) { if (room._demoTimer) clearInterval(room._demoTimer); return; }
    if (room.paused) return;
    const now = Date.now();
    if (room.qi < 0) {
      if (d.joined < DEMO_BOT_COUNT) {
        if (now >= d.nextAt) {
          const i = d.joined++;
          const ws = { readyState: WebSocket.OPEN, send() {}, close() {}, _bot: true };
          joinPlayer(room, ws, { name: DEMO_BOTS[i], avatar: demoAvatar(i) });
          const p = Array.from(room.players.values()).find((x) => x.name === DEMO_BOTS[i]);
          if (p) d.botIds.push(p.id);
          d.nextAt = now + 700;
        }
      } else if (!d.started && now >= d.nextAt + 1500) { d.started = true; startGame(room); }
      return;
    }
    /* en jeu : les bots répondent aléatoirement */
    const now2 = Date.now();
    if (room.phase === G.PHASES.QUESTION && !room.revealed && room.answers) {
      const unanswered = bots().filter((b) => !room.answers.has(b.id));
      if (unanswered.length > 0 && Math.random() < 0.4) {
        const pick = unanswered[Math.floor(Math.random() * unanswered.length)];
        const q = room.question;
        const correctIdx = q.correctIndex != null ? q.correctIndex : 0;
        const isCorrect = Math.random() < 0.6;
        const optionIdx = isCorrect ? correctIdx : ((correctIdx + 1 + Math.floor(Math.random() * 3)) % 4);
        handleAnswer(room, pick.id, optionIdx);
      }
    }
  };
  room._demoTimer = setInterval(tick, 400);
  room._demoKill = setTimeout(() => { if (rooms.has(room.code)) closeRoom(room); }, DEMO_MAX_MS);
}

/* ------------------------------------------------------------------ */
/* Serveur HTTP + WebSocket                                           */
/* ------------------------------------------------------------------ */
const rooms = new Map();

function handleHttp(req, res) {
  const { url } = req;
  const pathname = new URL(url, 'http://localhost').pathname;

  /* Fichiers statiques */
  if (pathname === '/' || pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(path.join(ROOT, 'index.html')));
    return;
  }
  if (pathname.startsWith('/css/') || pathname.startsWith('/js/') || pathname.startsWith('/assets/') || (pathname.startsWith('/shared/') && pathname === '/shared/rules.js')) {
    const filePath = path.join(ROOT, pathname);
    try {
      const data = fs.readFileSync(filePath);
      const ext = path.extname(filePath);
      const ct = ext === '.css' ? 'text/css' : ext === '.js' ? 'application/javascript' : ext === '.html' ? 'text/html' : 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': ct + '; charset=utf-8' });
      res.end(data);
    } catch (e) { res.writeHead(404); res.end('not found'); }
    return;
  }

  /* API */
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size, demoRooms: Array.from(rooms.values()).filter((r) => r.demo).length }));
    return;
  }
  if (pathname === '/api/config') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ publicUrl: process.env.PUBLIC_URL || 'http://localhost:' + PORT }));
    return;
  }
  if (pathname === '/api/leaderboard') {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ scores: leaderboard.slice(0, 50), count: leaderboard.length }));
    } else {
      res.writeHead(405); res.end();
    }
    return;
  }
  if (pathname === '/shared/rules.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
    res.end(fs.readFileSync(path.join(ROOT, 'shared', 'rules.js')));
    return;
  }

  res.writeHead(404); res.end('not found');
}

const server = http.createServer(handleHttp);
const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });

server.on('upgrade', (req, socket, head) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname !== '/ws') { socket.destroy(); return; }
  const origin = req.headers.origin || '';
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const proto = forwardedProto || (req.socket.encrypted ? 'https' : 'http');
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  const isSameOrigin = origin === proto + '://' + host;
  const isLocalDev = process.env.NODE_ENV !== 'production' && /^(localhost|127\.|\[::1\])/.test(host);
  if (ALLOWED_ORIGIN === '*' || isSameOrigin || isLocalDev) {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws, req) => {
  let ctx = null;
  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch (e) { return; }

    if (msg.type === 'host:create') {
      const code = createCode(rooms);
      if (!code) { sendError(ws, 'no-code', 'Impossible de créer une salle.'); return; }
      const hostToken = crypto.randomBytes(16).toString('hex');
      const room = makeRoom(code, hostToken, msg.name, msg.settings);
      rooms.set(code, room);
      ctx = { role: 'host', code, playerId: 'host_' + code, token: hostToken };
      ws._ctx = ctx;
      room.hostWs = ws;
      ws.send(JSON.stringify({ type: 'host:created', code, token: hostToken, room: baseState(room) }));
      broadcast(room);
      return;
    }

    if (msg.type === 'host:start') {
      if (ctx.role !== 'host') return;
      const room = rooms.get(ctx.code);
      if (!room || room.phase !== G.PHASES.LOBBY) return;
      startGame(room);
      return;
    }

    if (msg.type === 'host:next') {
      if (ctx.role !== 'host') return;
      const room = rooms.get(ctx.code);
      if (!room) return;
      if (room.phase === G.PHASES.END) { startGame(room); return; }
      if (room.phase === G.PHASES.REVEAL) {
        if (room._revealTimer) clearTimeout(room._revealTimer);
        nextQuestion(room);
      }
      return;
    }

    if (msg.type === 'host:reveal') {
      if (ctx.role !== 'host') return;
      const room = rooms.get(ctx.code);
      if (!room || room.phase !== G.PHASES.QUESTION) return;
      if (room._questionTimer) clearTimeout(room._questionTimer);
      revealQuestion(room, 'host');
      return;
    }

    if (msg.type === 'host:pause') {
      if (ctx.role !== 'host') return;
      const room = rooms.get(ctx.code);
      if (!room) return;
      room.paused = msg.paused !== false;
      touch(room);
      broadcast(room);
      return;
    }

    if (msg.type === 'host:settings') {
      if (ctx.role !== 'host') return;
      const room = rooms.get(ctx.code);
      if (!room || room.phase !== G.PHASES.LOBBY) return;
      if (msg.duration != null && [10, 15, 20].includes(Number(msg.duration))) room.settings.duration = Number(msg.duration);
      if (msg.maxPlayers != null) room.settings.maxPlayers = clamp(Number(msg.maxPlayers) || 20, Math.max(2, room.players.size), 20);
      if (Array.isArray(msg.themes) && msg.themes.length > 0) room.settings.themes = msg.themes.slice();
      touch(room);
      broadcast(room);
      return;
    }

    if (msg.type === 'host:close') {
      if (ctx.role !== 'host') return;
      const room = rooms.get(ctx.code);
      if (!room) return;
      closeRoom(room);
      ws.send(JSON.stringify({ type: 'closed' }));
      return;
    }

    if (msg.type === 'player:join') {
      const room = rooms.get(msg.code);
      if (!room) { sendError(ws, 'no-room', 'Salle introuvable.'); return; }
      if (room.phase !== G.PHASES.LOBBY) { sendError(ws, 'started', 'La partie a déjà commencé.'); return; }
      /* reconnexion avec jeton : acceptée même si la salle est pleine */
      if (msg.token) {
        const existing = findPlayerByToken(room, msg.token);
        if (existing) {
          existing.ws = ws;
          existing.connected = true;
          ctx = { role: 'player', code: room.code, playerId: existing.id, token: msg.token };
          ws._ctx = ctx;
          touch(room);
          broadcast(room);
          ws.send(JSON.stringify({ type: 'joined', playerId: existing.id, token: msg.token, reconnected: true, state: baseState(room) }));
          return;
        }
      }
      if (room.players.size >= room.settings.maxPlayers) { sendError(ws, 'full', 'Salle pleine.'); return; }
      const { player, token } = joinPlayer(room, ws, msg);
      ws.send(JSON.stringify({ type: 'joined', playerId: player.id, token, state: baseState(room) }));
      return;
    }

    if (msg.type === 'player:answer') {
      if (!ctx || ctx.role !== 'player') return;
      const room = rooms.get(ctx.code);
      if (!room) return;
      const optionIdx = typeof msg.optionIdx === 'number' && msg.optionIdx >= 0 && msg.optionIdx <= 3 ? msg.optionIdx : null;
      handleAnswer(room, ctx.playerId, optionIdx);
      return;
    }

    if (msg.type === 'player:leave') {
      if (!ctx || ctx.role !== 'player') return;
      const room = rooms.get(ctx.code);
      if (!room) return;
      removePlayer(room, ctx.playerId, 'Départ joueur');
      ws._ctx = null;
      return;
    }
  });

  ws.on('close', () => {
    if (!ctx) return;
    if (ctx.role === 'host') {
      const room = rooms.get(ctx.code);
      if (room) {
        room.hostWs = null;
        room.hostConnected = false;
        room.hostDisconnectedAt = Date.now();
        touch(room);
        broadcast(room);
        /* fermeture auto après délai */
        setTimeout(() => {
          const r = rooms.get(ctx.code);
          if (r && !r.hostConnected && Date.now() - r.hostDisconnectedAt > HOST_IDLE_MS) closeRoom(r);
        }, HOST_IDLE_MS);
      }
    } else if (ctx.role === 'player') {
      const room = rooms.get(ctx.code);
      if (room) removePlayer(room, ctx.playerId, 'Déconnexion');
    }
  });

  ws.on('error', () => {});
});

/* ------------------------------------------------------------------ */
/* Démo côté serveur                                                  */
/* ------------------------------------------------------------------ */
function startDemoServer() {
  /* pas de démo auto au démarrage */
}

/* ------------------------------------------------------------------ */
/* Démarrage                                                          */
/* ------------------------------------------------------------------ */
loadLeaderboard();
setInterval(saveLeaderboard, 30000);

server.listen(PORT, () => {
  console.log(`CREATOR QCM server listening on :${PORT}`);
  console.log(`LAN IP: ${lanIp()}`);
  console.log(`Rooms in memory (${rooms.size})`);
});

process.on('SIGTERM', () => {
  saveLeaderboard();
  server.close();
});

module.exports = {
  rooms, makeRoom, PORT,
  CODE_LENGTH, CODE_ALPHABET,
  randomCode: randCode,
  noteJoinFailure, joinBlocked,
  lanIp,
};
