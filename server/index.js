/* =====================================================================
   server/index.js — serveur autoritaire CREATOR · Guess Their Answer
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
const G = require('./game');
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
// Origines WebSocket autorisées (production : domaine du site). '*' = tout accepter (dév uniquement).
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '';
// Limite des ÉCHECS de jonction : 30 par minute et par IP, ET 30 par minute
// et par code de salle. Les jonctions réussies et les reconnexions ne comptent pas.
const JOIN_FAIL_MAX = 30;
const JOIN_WINDOW_MS = 60 * 1000;
const joinFailures = new Map();
const DEMO_MAX_MS = 12 * 60 * 1000;
const DEMO_BOT_COUNT = 8;
/* 6 manches : la démo montre aussi le multiplicateur ×1,5. */
const DEMO_ROUNDS = 6;

function lanIp() {
  for (const list of Object.values(os.networkInterfaces() || {})) {
    for (const n of (list || [])) {
      if (n.family === 'IPv4' && !n.internal) return n.address;
    }
  }
  return null;
}

function joinBlocked(ip, code) {
  const now = Date.now();
  const keys = ['ip|' + String(ip || 'unknown'), 'code|' + String(code || '')];
  for (const k of keys) {
    const e = joinFailures.get(k);
    if (e && now <= e.resetAt && e.count >= JOIN_FAIL_MAX) return true;
  }
  return false;
}
/* Ne consigne QUE les échecs (jamais les arrivées valides ni les reconnexions). */
function noteJoinFailure(ip, code) {
  const now = Date.now();
  const keys = ['ip|' + String(ip || 'unknown'), 'code|' + String(code || '')];
  for (const k of keys) {
    const e = joinFailures.get(k);
    if (!e || now > e.resetAt) joinFailures.set(k, { count: 1, resetAt: now + JOIN_WINDOW_MS });
    else e.count++;
  }
}
/* Compatibilité : ancienne API, désormais réservée aux échecs. */
function tooManyJoins(ip, code) {
  if (joinBlocked(ip, code)) return true;
  noteJoinFailure(ip, code);
  return false;
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  const addr = (fwd ? fwd.split(',')[0] : req.socket.remoteAddress) || '';
  return String(addr).trim() || 'unknown';
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.glb': 'model/gltf-binary',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
};

const SILHOUETTES = ['masc', 'fem', 'neutral'];
const HAIRS = ['short', 'curly', 'afro', 'braids', 'ponytail', 'bald', 'cap'];
const OUTFITS = ['jacket', 'hoodie', 'dress', 'tee'];
const ACCESSORIES = ['none', 'glasses', 'headphones', 'beanie', 'backpack'];
const HAIR_COLORS = ['#FF6B2C', '#2B1B12', '#F5C542', '#1B2A6B', '#E84A8A', '#F4F6FC', '#5AD86B', '#8B5CF6', '#B9B9C9'];
const TOP_COLORS = ['#FF4E20', '#0B35FE', '#00E472', '#FF7A00', '#2E85FF', '#F4F6FC', '#111827', '#F5C542', '#E84A8A'];
const PANTS_COLORS = ['#0C1A4B', '#111827', '#3B4A6B', '#6B7280', '#F4F6FC', '#7A3E1D', '#1F2937'];
const SHOE_COLORS = ['#FF4E20', '#F4F6FC', '#0B35FE', '#111827', '#00E472', '#F5C542', '#E84A8A'];
const SKIN_COLORS = ['#F1C27D', '#E0AC69', '#C68642', '#A16B3A', '#8D5524', '#7A4E28', '#5C3317', '#3E2723'];

let QUESTIONS = [];
try {
  /* require statique : le bundler Vercel inclut questions.json dans la fonction. */
  QUESTIONS = require('./questions.json');
  if (!Array.isArray(QUESTIONS) || QUESTIONS.length < 1) throw new Error('questions.json vide');
} catch (err) {
  console.error('Impossible de charger les questions :', err.message);
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* Classement persistant                                              */
/* ------------------------------------------------------------------ */
function ensureDataDir() {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}
function loadLeaderboard() {
  ensureDataDir();
  try {
    const raw = JSON.parse(fs.readFileSync(LEADERBOARD_FILE, 'utf8'));
    return Array.isArray(raw) ? raw : [];
  } catch (e) { return []; }
}
let leaderboard = loadLeaderboard();
let leaderboardDirty = false;
let leaderboardTimer = null;

function scheduleLeaderboardWrite() {
  leaderboardDirty = true;
  if (leaderboardTimer) return;
  leaderboardTimer = setTimeout(() => {
    leaderboardTimer = null;
    if (!leaderboardDirty) return;
    leaderboardDirty = false;
    ensureDataDir();
    try {
      fs.writeFile(LEADERBOARD_FILE, JSON.stringify(leaderboard.slice(0, 100), null, 2), () => {});
    } catch (e) { console.warn('Écriture classement :', e.message); }
  }, 250);
}

function recordScores(players) {
  const now = Date.now();
  const useUpstash = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  if (useUpstash) {
    /* Seul le serveur (légitime, vient de calculer les scores) écrit dans Upstash. */
    for (const p of players) {
      if (!p.score || p.score <= 0) continue;
      const name = String(p.name || 'Joueur').slice(0, 16);
      upstash.upsertScore(name, p.score).catch((e) => console.warn('Upstash upsertScore :', e.message));
    }
    return;
  }
  /* Fallback fichier JSON si Upstash non configure. */
  for (const p of players) {
    if (!p.score || p.score <= 0) continue;
    const name = String(p.name || 'Joueur').slice(0, 16);
    const existing = leaderboard.find((e) => e.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (p.score > existing.score) {
        existing.score = p.score;
        existing.date = now;
      }
    } else {
      leaderboard.push({ name, score: p.score, date: now });
    }
  }
  leaderboard.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  leaderboard = leaderboard.slice(0, 100);
  scheduleLeaderboardWrite();
}

/* ------------------------------------------------------------------ */
/* Utilitaires                                                        */
/* ------------------------------------------------------------------ */
const randStr = (len) => crypto.randomBytes(len).toString('base64url').slice(0, len).replace(/[-_]/g, 'A');
const randomCode = () => {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  }
  return code;
};
const sanitizeName = (raw) => String(raw == null ? '' : raw)
  .replace(/[\u0000-\u001f<>]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 16);

function sanitizeHex(value, fallback) {
  return /^#[0-9a-fA-F]{6}$/i.test(String(value || '')) ? String(value).toUpperCase() : fallback;
}
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function sanitizeAvatar(raw) {
  const a = raw && typeof raw === 'object' ? raw : {};
  const colors = a.colors && typeof a.colors === 'object' ? a.colors : {};
  /* Quand le client n'envoie pas d'avatar personnalisé, on tire au hasard
     une tenue, une coiffure, des couleurs et une carnation pour que chaque
     personnage soit différent dès son arrivée. */
  const randomColors = !colors.hair && !colors.jacket && !colors.shirt && !colors.pants && !colors.shoes && !colors.skin;
  return {
    silhouette: SILHOUETTES.includes(a.silhouette) ? a.silhouette : pickRandom(SILHOUETTES),
    hair: HAIRS.includes(a.hair) ? a.hair : pickRandom(HAIRS),
    outfit: OUTFITS.includes(a.outfit) ? a.outfit : pickRandom(OUTFITS),
    accessory: ACCESSORIES.includes(a.accessory) ? a.accessory : pickRandom(ACCESSORIES),
    colors: {
      hair: randomColors ? pickRandom(HAIR_COLORS) : sanitizeHex(colors.hair, pickRandom(HAIR_COLORS)),
      jacket: randomColors ? pickRandom(TOP_COLORS) : sanitizeHex(colors.jacket, pickRandom(TOP_COLORS)),
      shirt: randomColors ? pickRandom(TOP_COLORS) : sanitizeHex(colors.shirt, pickRandom(TOP_COLORS)),
      pants: randomColors ? pickRandom(PANTS_COLORS) : sanitizeHex(colors.pants, pickRandom(PANTS_COLORS)),
      shoes: randomColors ? pickRandom(SHOE_COLORS) : sanitizeHex(colors.shoes, pickRandom(SHOE_COLORS)),
      skin: randomColors ? pickRandom(SKIN_COLORS) : sanitizeHex(colors.skin, pickRandom(SKIN_COLORS)),
    },
  };
}
function avatarKey(a) {
  return [a.silhouette, a.hair, a.outfit, a.accessory, a.colors.hair, a.colors.jacket, a.colors.shirt, a.colors.pants, a.colors.shoes].join('|');
}
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

/* ------------------------------------------------------------------ */
/* État des salles                                                    */
/* ------------------------------------------------------------------ */
const rooms = new Map();

function makeRoom(code, hostToken, name, settings) {
  return {
    code,
    hostToken,
    hostName: sanitizeName(name) || 'Animateur',
    hostWs: null,
    hostConnected: true,
    hostDisconnectedAt: 0,
    phase: G.PHASES.LOBBY,
    paused: false,
    pauseLeft: 0,
    settings: {
      duration: [30, 45, 60, 90].includes(Number(settings && settings.duration)) ? Number(settings.duration) : 60,
      maxPlayers: clamp(Number(settings && settings.maxPlayers) || 20, 2, 20),
      categories: Array.isArray(settings && settings.categories) && settings.categories.length > 0
        ? settings.categories.slice()
        : ['tout'],
    },
    mode: (settings && settings.mode === 'teams') ? 'teams' : 'solo',
    teamScores: { bleu: 0, orange: 0 },
    roundMain: null,
    mainStreak: new Map(),
    spectatorGuesses: new Map(),
    secretFound: new Set(),
    players: new Map(),
    order: [],
    askedHistory: new Set(),
    qi: -1,
    qTotal: 0,
    question: null,
    board: [],
    multiplier: 1,
    controllerId: null,
    stealerId: null,
    _buzzLock: false,
    strikes: 0,
    pot: 0,
    phaseEnd: 0,
    wrongGuesses: [],
    lastAwards: null,
    ranking: null,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    demo: false,
    demoStartedAt: 0,
    demoEndedAt: 0,
    demoTimer: null,
  };
}

function touch(room) { room.lastActivity = Date.now(); }

function send(ws, payload) {
  if (!ws) return;
  if (ws.readyState !== WebSocket.OPEN) return;
  try { ws.send(JSON.stringify(payload)); } catch (e) {}
}
function sendError(ws, code, message) {
  send(ws, { type: 'error', code, message });
}

function playerPublic(p) {
  return {
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    score: p.score,
    team: p.team,
    connected: p.connected,
  };
}
function refObj(room, id) {
  if (!id) return null;
  const p = room.players.get(id);
  return p ? { id: p.id, name: p.name } : null;
}

function baseState(room, role) {
  return {
    type: 'state',
    role,
    code: room.code,
    hostName: room.hostName,
    phase: room.phase,
    paused: room.paused,
    settings: room.settings,
    mode: room.mode,
    teamScores: room.teamScores,
    qi: room.qi,
    qTotal: room.qTotal,
    multiplier: room.multiplier,
    question: room.question ? { text: room.question.q, slots: room.question.answers.length } : null,
    board: room.board.map((r) => ({
      i: r.i, text: r.text, pts: r.pts, by: r.by, missed: !!r.missed,
    })),
    controller: refObj(room, room.controllerId),
    stealer: refObj(room, room.stealerId),
    roundMain: refObj(room, room.roundMain),
    strikes: room.strikes,
    maxStrikes: G.MAX_STRIKES,
    pot: room.pot,
    phaseEnd: room.phaseEnd,
    serverNow: Date.now(),
    wrongGuesses: room.wrongGuesses.slice(-6),
    players: Array.from(room.players.values()).map(playerPublic),
    ranking: room.phase === G.PHASES.END ? room.ranking : null,
    awards: room.lastAwards,
  };
}

function hostState(room) {
  return baseState(room, 'host');
}

function playerState(room, p) {
  const s = baseState(room, 'player');
  const isController = room.controllerId === p.id;
  const isStealer = room.stealerId === p.id;
  const controller = room.controllerId ? room.players.get(room.controllerId) : null;
  const isTeammate = room.mode === 'teams' && controller && p.team === controller.team;
  s.me = Object.assign(playerPublic(p), { isController, isStealer, isTeammate });
  s.canBuzz = !room.paused && (
    (room.phase === G.PHASES.BUZZ && !room.controllerId) ||
    (room.phase === G.PHASES.STEAL && !room.stealerId && !isController)
  );
  s.canAnswer = !room.paused && (
    (room.phase === G.PHASES.PLAY && (isController || (room.mode === 'teams' && isTeammate))) ||
    (room.phase === G.PHASES.STEAL && isStealer)
  );
  /* spectateur actif : peut deviner en secret quand ce n'est pas son équipe qui joue */
  s.canGuessSpectator = !room.paused && room.phase === G.PHASES.PLAY && !isController && !isTeammate
    && !(room.mode === 'teams' && controller && p.team === controller.team);
  return s;
}

function broadcast(room) {
  if (room.hostWs) send(room.hostWs, hostState(room));
  for (const p of room.players.values()) {
    if (p.ws) send(p.ws, playerState(room, p));
  }
}

function envelope(event) {
  return { type: 'event', event: event.type, data: event };
}
function eventToAll(room, event) {
  const msg = envelope(event);
  if (room.hostWs) send(room.hostWs, msg);
  for (const p of room.players.values()) {
    if (p.ws) send(p.ws, msg);
  }
}
function eventToPlayer(room, playerId, event) {
  const p = room.players.get(playerId);
  if (p && p.ws) send(p.ws, envelope(event));
}

/* ------------------------------------------------------------------ */
/* Déroulé d'une manche                                               */
/* ------------------------------------------------------------------ */
function startGame(room, rounds) {
  if (room.players.size < 1) return false;
  const total = Number(rounds) > 0 ? Math.floor(Number(rounds)) : G.GAME_Q;
  room.order = G.pickQuestionsByCategory(QUESTIONS, total, room.settings.categories, room.askedHistory);
  for (const q of room.order) room.askedHistory.add(q.q);
  room.qi = -1;
  room.qTotal = room.order.length;
  room.ranking = null;
  room.lastAwards = null;
  room.paused = false;
  room.pauseLeft = 0;
  room.phase = G.PHASES.LOBBY;
  room.teamScores = { bleu: 0, orange: 0 };
  room.roundMain = null;
  room.mainStreak = new Map();
  room.spectatorGuesses = new Map();
  room.secretFound = new Set();
  for (const p of room.players.values()) {
    p.score = 0;
    p.lastGuessAt = 0;
  }
  eventToAll(room, { type: 'game-start' });
  nextRound(room);
  return true;
}

function nextRound(room) {
  room._buzzLock = false;
  room.qi = room.qi + 1;
  if (room.qi >= room.order.length) {
    endGame(room);
    return;
  }
  room.question = room.order[room.qi];
  room.board = [];
  room.pot = 0;
  room.strikes = 0;
  room.controllerId = null;
  room.stealerId = null;
  room.multiplier = G.multiplierFor(room.qi);
  room.wrongGuesses = [];
  room.lastAwards = null;
  room.paused = false;
  room.pauseLeft = 0;
  room.spectatorGuesses = new Map();
  room.secretFound = new Set();
  room.buzzRetry = false;
  /* rotation : un joueur ne peut pas être main plus de 2 manches de suite
     si d'autres n'ont pas joué (équipes : capitaine tournant). */
  if (room.mode === 'teams' && room.players.size >= 2) {
    const ids = Array.from(room.players.keys());
    let picked = null;
    for (const id of ids) {
      const streak = room.mainStreak.get(id) || 0;
      if (streak < 2) { picked = id; break; }
    }
    if (!picked) {
      /* tous à 2 : remet les streaks à 0 et prend le premier */
      room.mainStreak = new Map();
      picked = ids[0];
      room.mainStreak.set(picked, 1);
    } else {
      room.mainStreak.set(picked, (room.mainStreak.get(picked) || 0) + 1);
    }
    room.roundMain = picked;
    for (const id of ids) if (id !== picked) room.mainStreak.set(id, 0);
  } else {
    room.roundMain = null;
  }
  room.phase = G.PHASES.COUNTDOWN;
  room.phaseEnd = Date.now() + G.COUNTDOWN_MS;
  touch(room);
  eventToAll(room, {
    type: 'round-start',
    qi: room.qi,
    qTotal: room.qTotal,
    text: room.question.q,
    multiplier: room.multiplier,
    phase: 'countdown',
  });
  broadcast(room);
}

function awardPot(room, winnerId, reason) {
  const winner = winnerId ? room.players.get(winnerId) : null;
  const amount = room.pot;
  if (winner && amount > 0) {
    winner.score += amount;
    if (room.mode === 'teams' && winner.team) {
      room.teamScores[winner.team] = (room.teamScores[winner.team] || 0) + amount;
    }
    room.lastAwards = { winnerId: winner.id, winnerName: winner.name, amount, reason, team: winner.team };
  } else {
    room.lastAwards = null;
  }
  room.pot = 0;
}

function finishRound(room, reason) {
  room._buzzLock = false;
  if (room.phase === G.PHASES.REVEAL || room.phase === G.PHASES.END) return;
  const wasSteal = room.phase === G.PHASES.STEAL;
  if (reason === 'stolen' && room.stealerId) {
    awardPot(room, room.stealerId, 'steal');
  } else if (room.controllerId) {
    awardPot(room, room.controllerId, wasSteal ? 'steal-failed' : 'kept');
  } else {
    awardPot(room, null, 'none');
  }

  const q = room.question;
  const revealed = new Map(room.board.map((r) => [r.i, r]));
  room.board = q.answers.map((ans, i) => {
    const found = revealed.get(i);
    if (found) return found;
    return {
      i,
      text: ans.text,
      pts: G.pointsFor(ans, room.multiplier),
      by: null,
      missed: true,
    };
  });
  room.phase = G.PHASES.REVEAL;
  room.phaseEnd = Date.now() + G.REVEAL_MS;
  room.strikes = Math.min(room.strikes, G.MAX_STRIKES);
  touch(room);
  eventToAll(room, {
    type: 'round-end',
    reason,
    qi: room.qi,
    qTotal: room.qTotal,
    awards: room.lastAwards,
    scores: Array.from(room.players.values()).map((p) => ({ id: p.id, name: p.name, score: p.score })),
  });
  broadcast(room);
}

function openSteal(room) {
  const others = Array.from(room.players.values()).filter(
    (p) => p.id !== room.controllerId && p.connected !== false
  );
  if (room.pot > 0 && others.length > 0) {
    room.phase = G.PHASES.STEAL;
    room.stealerId = null;
    room.phaseEnd = Date.now() + G.STEAL_MS;
    touch(room);
    eventToAll(room, { type: 'steal-open', controller: refObj(room, room.controllerId) });
    broadcast(room);
  } else {
    finishRound(room, 'strikes');
  }
}

function addFound(room, player, index, entry) {
  const pts = G.pointsFor(entry, room.multiplier);
  room.board.push({ i: index, text: entry.text, pts, by: player.name, at: Date.now() });
  room.board.sort((a, b) => a.i - b.i);
  room.pot += pts;
  return pts;
}

function handleBuzz(room, playerId) {
  const player = room.players.get(playerId);
  if (!player || room.paused) return;
  /* le buzzer désigne le contrôleur : le premier qui buzz joue le tableau */
  if (room.phase === G.PHASES.COUNTDOWN && !room.controllerId) {
    /* buzz pendant le décompte : démarre immédiatement la manche */
    room.controllerId = playerId;
    room.phase = G.PHASES.PLAY;
    room.phaseEnd = Date.now() + room.settings.duration * 1000;
    touch(room);
    eventToAll(room, { type: 'control', playerId, name: player.name });
    broadcast(room);
  } else if (room.phase === G.PHASES.BUZZ && !room.controllerId) {
    room.controllerId = playerId;
    room.phase = G.PHASES.PLAY;
    room.phaseEnd = Date.now() + room.settings.duration * 1000;
    touch(room);
    eventToAll(room, { type: 'control', playerId, name: player.name });
    broadcast(room);
  } else if (room.phase === G.PHASES.STEAL && !room.stealerId && playerId !== room.controllerId) {
    room.stealerId = playerId;
    room.phaseEnd = Date.now() + G.STEAL_MS;
    touch(room);
    eventToAll(room, { type: 'stealer', playerId, name: player.name });
    broadcast(room);
  }
}

function handleGuess(room, playerId, rawText, optionIdx) {
  if (room.paused) return;
  const player = room.players.get(playerId);
  if (!player || !room.question) return;
  const isQCM = room.question.format === 'qcm';
  let text = '';
  if (isQCM && optionIdx != null) {
    /* QCM : on juge par index d'option, pas par texte libre */
    text = '';
  } else {
    text = G.clampText(rawText);
    if (!text) return;
  }

  const now = Date.now();
  if (!player.lastGuessAt) player.lastGuessAt = 0;
  if (now - player.lastGuessAt < 450) return;
  player.lastGuessAt = now;

  const isTeams = room.mode === 'teams';
  const controller = room.controllerId ? room.players.get(room.controllerId) : null;
  const isController = room.controllerId === playerId;
  const isTeammate = isTeams && controller && player.team === controller.team;
  const isOpponent = isTeams && controller && player.team !== controller.team;

  /* ---------- COUNTDOWN : décompte, pas de réponse encore ---------- */
  if (room.phase === G.PHASES.COUNTDOWN) {
    eventToPlayer(room, playerId, { type: 'result', kind: 'wait', text: 'Décompte…' });
    return;
  }

  /* ---------- BUZZ : course à la première réponse (désigne qui joue le tableau) ---------- */
  if (room.phase === G.PHASES.BUZZ) {
    /* verrou : un seul joueur peut devenir contrôleur par phase de buzz */
    if (room._buzzLock) { eventToPlayer(room, playerId, { type: 'result', kind: 'wait', text: 'Buzz déjà pris.' }); return; }
    if (room.controllerId) return;
    const res = isQCM ? G.judgeQCM(room.question, optionIdx, room.board) : G.judge(room.question, text, room.board);
    if (res.kind === 'found') {
      room.controllerId = playerId;
      const pts = addFound(room, player, res.index, res.entry);
      room.phase = G.PHASES.PLAY;
      room.phaseEnd = Date.now() + room.settings.duration * 1000;
      room.roundMain = playerId;
      eventToAll(room, { type: 'control', playerId, name: player.name, auto: true, teams: isTeams });
      eventToPlayer(room, playerId, { type: 'result', kind: 'found', text: res.entry.text, pts });
      if (room.board.length >= room.question.answers.length) finishRound(room, 'complete');
      else broadcast(room);
    } else if (res.kind === 'dup') {
      eventToPlayer(room, playerId, { type: 'result', kind: 'dup', text: res.entry.text });
    } else {
      eventToPlayer(room, playerId, { type: 'result', kind: 'miss', text });
    }
    return;
  }

  /* ---------- PLAY : le tableau ---------- */
  if (room.phase === G.PHASES.PLAY) {
    /* SPECTATEUR ACTIF ("Devine aussi") : pas son équipe / pas le main -> bonus secret */
    if (!isController && !isTeammate) {
      const res = isQCM ? G.judgeQCM(room.question, optionIdx, room.board) : G.judge(room.question, text, room.board);
      if (res.kind === 'found' && !room.board.some((r) => r.i === res.index) && !room.secretFound.has(res.index)) {
        if (!room.spectatorGuesses.has(playerId)) room.spectatorGuesses.set(playerId, new Set());
        const sset = room.spectatorGuesses.get(playerId);
        if (!sset.has(res.index)) {
          sset.add(res.index);
          room.secretFound.add(res.index);
          const bonus = 2;
          player.score = (player.score || 0) + bonus;
          eventToPlayer(room, playerId, { type: 'result', kind: 'spectator-found', text: res.entry.text, pts: bonus, secret: true });
          eventToAll(room, { type: 'spectator-bonus', name: player.name, text: res.entry.text, pts: bonus });
        }
      }
      return;
    }
    /* Seul le main (et ses coéquipiers en équipes) peut révéler publiquement */
    if (isTeams && !isTeammate) { eventToPlayer(room, playerId, { type: 'result', kind: 'wait' }); return; }
    if (!isTeams && !isController) { eventToPlayer(room, playerId, { type: 'result', kind: 'wait' }); return; }
    const res = isQCM ? G.judgeQCM(room.question, optionIdx, room.board) : G.judge(room.question, text, room.board);
    if (res.kind === 'found') {
      const pts = addFound(room, player, res.index, res.entry);
      eventToPlayer(room, playerId, { type: 'result', kind: 'found', text: res.entry.text, pts });
      eventToAll(room, { type: 'found', playerId, name: player.name, text: res.entry.text, pts, teams: isTeams });
      if (room.board.length >= room.question.answers.length) finishRound(room, 'complete');
      else broadcast(room);
    } else if (res.kind === 'dup') {
      eventToPlayer(room, playerId, { type: 'result', kind: 'dup', text: res.entry.text });
    } else {
      room.strikes++;
      room.wrongGuesses.push({ by: player.name, text });
      if (room.wrongGuesses.length > 8) room.wrongGuesses.shift();
      player.lastGuessAt = now;
      eventToAll(room, { type: 'strike', name: player.name, text, strikes: room.strikes });
      if (room.strikes >= G.MAX_STRIKES) openSteal(room);
      else broadcast(room);
    }
    return;
  }

  /* ---------- STEAL ---------- */
  if (room.phase === G.PHASES.STEAL) {
    const stealer = room.stealerId ? room.players.get(room.stealerId) : null;
    const isStealer = room.stealerId === playerId;
    /* en équipes, le stealer peut être un coéquipier de l'équipe adverse qui a buzzé */
    if (!isStealer) { eventToPlayer(room, playerId, { type: 'result', kind: 'wait' }); return; }
    const res = G.judge(room.question, text, room.board);
    if (res.kind === 'found') {
      addFound(room, player, res.index, res.entry);
      eventToPlayer(room, playerId, { type: 'result', kind: 'steal', text: res.entry.text, pts: room.pot });
      finishRound(room, 'stolen');
    } else {
      eventToAll(room, { type: 'steal-failed', name: player.name });
      finishRound(room, 'steal-failed');
    }
  }
}

function endGame(room) {
  room.phase = G.PHASES.END;
  room.phaseEnd = 0;
  room.question = null;
  room.board = [];
  room.controllerId = null;
  room.stealerId = null;
  room.paused = false;
  room.pot = 0;
  room.phaseEnd = 0;
  const sorted = Array.from(room.players.values())
    .slice()
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  room.ranking = sorted.map((p, i) => ({
    rank: i + 1,
    id: p.id,
    name: p.name,
    score: p.score,
    avatar: p.avatar,
    team: p.team,
  }));
  /* MVP par équipe */
  const mvp = {};
  if (room.mode === 'teams') {
    for (const t of ['bleu', 'orange']) {
      const best = Array.from(room.players.values())
        .filter((p) => p.team === t)
        .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))[0];
      if (best) mvp[t] = { id: best.id, name: best.name, score: best.score };
    }
  }
  if (!room.demo) recordScores(sorted);
  touch(room);
  eventToAll(room, {
    type: 'game-over',
    ranking: room.ranking,
    teamScores: room.mode === 'teams' ? room.teamScores : null,
    mvp: room.mode === 'teams' ? mvp : null,
  });
  broadcast(room);
}

/* ------------------------------------------------------------------ */
/* Tick global (200 ms)                                               */
/* ------------------------------------------------------------------ */
setInterval(() => {
  const now = Date.now();
  /* purge non bornée des IP de rate-limit expirées */
  for (const [key, e] of joinFailures.entries()) {
    if (now > e.resetAt) joinFailures.delete(key);
  }
  for (const room of rooms.values()) {
    if (room.demo && now - (room.demoStartedAt || room.createdAt) > DEMO_MAX_MS) {
      closeRoom(room);
      continue;
    }
    if (!room.hostConnected && room.hostDisconnectedAt && now - room.hostDisconnectedAt > HOST_IDLE_MS) {
      eventToAll(room, { type: 'closed', message: "L'animateur a quitté la salle." });
      for (const p of room.players.values()) if (p.ws) { try { p.ws.close(); } catch (e) {} }
      rooms.delete(room.code);
      continue;
    }

    if (room.phase === G.PHASES.LOBBY) {
      for (const p of Array.from(room.players.values())) {
        if (!p.connected && p.disconnectedAt && now - p.disconnectedAt > LOBBY_DISCONNECT_MS) {
          room.players.delete(p.id);
          broadcast(room);
        }
      }
      continue;
    }

    /* joueurs fantômes en jeu : retirés après 5 min de déconnexion
       (délai suffisant pour permettre la reconnexion) */
    for (const p of Array.from(room.players.values())) {
      if (!p.connected && p.disconnectedAt && now - p.disconnectedAt > 300000) {
        room.players.delete(p.id);
        broadcast(room);
      }
    }

    if (room.paused) {
      if (room.pauseLeft > 0) room.pauseLeft = Math.max(0, room.pauseLeft);
      continue;
    }

    if (!room.phaseEnd) continue;
    if (now < room.phaseEnd) continue;

    if (room.phase === G.PHASES.COUNTDOWN) {
      room.phase = G.PHASES.BUZZ;
      room.phaseEnd = Date.now() + G.BUZZ_MS;
      eventToAll(room, { type: 'round-start', qi: room.qi, qTotal: room.qTotal, text: room.question.q, multiplier: room.multiplier, phase: 'buzz' });
      broadcast(room);
    } else if (room.phase === G.PHASES.BUZZ) {
      if (!room.controllerId && !room.buzzRetry) {
        /* première absence de buzz : message + relance 10 s */
        room.buzzRetry = true;
        room.phaseEnd = Date.now() + 10000;
        eventToAll(room, { type: 'no-buzz', qi: room.qi, qTotal: room.qTotal });
        broadcast(room);
      } else {
        finishRound(room, 'timeout-buzz');
        room.buzzRetry = false;
      }
    } else if (room.phase === G.PHASES.PLAY) {
      finishRound(room, 'timeout');
    } else if (room.phase === G.PHASES.STEAL) {
      finishRound(room, 'steal-timeout');
    } else if (room.phase === G.PHASES.REVEAL) {
      nextRound(room);
    }
  }
}, 200).unref?.();

/* ------------------------------------------------------------------ */
/* Actions hôte                                                       */
/* ------------------------------------------------------------------ */
function hostPause(room, force) {
  if (room.phase !== G.PHASES.BUZZ && room.phase !== G.PHASES.PLAY &&
      room.phase !== G.PHASES.STEAL && room.phase !== G.PHASES.REVEAL) return;
  const want = typeof force === 'boolean' ? force : !room.paused;
  if (want === room.paused) return;
  if (want) {
    room.paused = true;
    room.pauseLeft = Math.max(0, room.phaseEnd - Date.now());
    room.phaseEnd = 0;
    eventToAll(room, { type: 'paused', paused: true });
  } else {
    room.paused = false;
    room.phaseEnd = Date.now() + Math.max(500, room.pauseLeft || 1000);
    room.pauseLeft = 0;
    eventToAll(room, { type: 'paused', paused: false });
  }
  broadcast(room);
}

function hostNext(room) {
  if (room.phase === G.PHASES.END) { startGame(room); return; }
  if (room.phase === G.PHASES.REVEAL) { nextRound(room); return; }
  if (room.phase === G.PHASES.BUZZ || room.phase === G.PHASES.PLAY || room.phase === G.PHASES.STEAL) {
    finishRound(room, 'host-skip');
  }
}

function hostReveal(room) {
  if (room.phase === G.PHASES.BUZZ || room.phase === G.PHASES.PLAY || room.phase === G.PHASES.STEAL) {
    finishRound(room, 'host-reveal');
  } else if (room.phase === G.PHASES.REVEAL) {
    nextRound(room);
  }
}

function hostAddTime(room, seconds) {
  if (room.phase !== G.PHASES.BUZZ && room.phase !== G.PHASES.PLAY && room.phase !== G.PHASES.STEAL) return;
  if (room.paused) { room.pauseLeft += 15000; }
  else { room.phaseEnd += clamp(Number(seconds) || 15, 5, 60) * 1000; }
  broadcast(room);
}

function removePlayer(room, playerId, reason) {
  const p = room.players.get(playerId);
  if (!p) return;
  room.players.delete(playerId);
  if (p.ws) {
    send(p.ws, envelope({ type: 'kicked', message: reason || 'Tu as été retiré de la salle.' }));
  }
  if (room.controllerId === playerId) {
    room.controllerId = null;
    if (room.phase === G.PHASES.PLAY) finishRound(room, 'controller-left');
  }
  if (room.stealerId === playerId) {
    room.stealerId = null;
    if (room.phase === G.PHASES.STEAL) finishRound(room, 'steal-timeout');
  }
  touch(room);
  broadcast(room);
}

function closeRoom(room) {
  stopDemo(room);
  eventToAll(room, { type: 'closed', message: "L'animateur a fermé la salle." });
  for (const p of room.players.values()) {
    if (p.ws) { try { p.ws.close(); } catch (e) {} }
  }
  if (room.hostWs) { try { room.hostWs.close(); } catch (e) {} }
  rooms.delete(room.code);
}

/* ------------------------------------------------------------------ */
/* WebSocket                                                          */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* Mode démo serveur : 8 bots jouent une vraie partie isolée           */
/* ------------------------------------------------------------------ */
const DEMO_BOTS = [
  { name: 'Aïcha', silhouette: 'fem', hair: 'braids', outfit: 'dress', accessory: 'none', jacket: '#FF4E20', shirt: '#FF4E20', pants: '#0C1A4B', shoes: '#F4F6FC', hairColor: '#2B1B12' },
  { name: 'Koffi', silhouette: 'masc', hair: 'short', outfit: 'jacket', accessory: 'glasses', jacket: '#0B35FE', shirt: '#F4F6FC', pants: '#111827', shoes: '#FF4E20', hairColor: '#2B1B12' },
  { name: 'Mariam', silhouette: 'fem', hair: 'afro', outfit: 'tee', accessory: 'none', jacket: '#00E472', shirt: '#00E472', pants: '#3B4A6B', shoes: '#111827', hairColor: '#2B1B12' },
  { name: 'Sèna', silhouette: 'neutral', hair: 'cap', outfit: 'hoodie', accessory: 'beanie', jacket: '#F5C542', shirt: '#111827', pants: '#0C1A4B', shoes: '#F4F6FC', hairColor: '#111827' },
  { name: 'Dossou', silhouette: 'masc', hair: 'curly', outfit: 'jacket', accessory: 'headphones', jacket: '#8B5CF6', shirt: '#F4F6FC', pants: '#111827', shoes: '#00E472', hairColor: '#111827' },
  { name: 'Adjoa', silhouette: 'fem', hair: 'ponytail', outfit: 'dress', accessory: 'none', jacket: '#E84A8A', shirt: '#E84A8A', pants: '#F4F6FC', shoes: '#FF4E20', hairColor: '#1B2A6B' },
  { name: 'Ibrahim', silhouette: 'masc', hair: 'bald', outfit: 'tee', accessory: 'backpack', jacket: '#F4F6FC', shirt: '#F4F6FC', pants: '#1F2937', shoes: '#F5C542', hairColor: '#2B1B12' },
  { name: 'Grâce', silhouette: 'neutral', hair: 'short', outfit: 'hoodie', accessory: 'glasses', jacket: '#2E85FF', shirt: '#0B35FE', pants: '#3B4A6B', shoes: '#F4F6FC', hairColor: '#5AD86B' },
];
const DEMO_GUESSES = ['Le football', 'La musique', 'Paris', 'Le riz', 'Un téléphone', 'Le marché', 'La pluie', 'Les vacances'];

function demoAvatar(i) {
  const b = DEMO_BOTS[i % DEMO_BOTS.length];
  return sanitizeAvatar({
    silhouette: b.silhouette,
    hair: b.hair,
    outfit: b.outfit,
    accessory: b.accessory,
    colors: {
      hair: b.hairColor,
      jacket: b.jacket,
      shirt: b.shirt,
      pants: b.pants,
      shoes: b.shoes,
    },
  });
}

function addDemoBot(room, i) {
  const b = DEMO_BOTS[i % DEMO_BOTS.length];
  const player = {
    id: 'bot_' + i + '_' + randStr(6),
    token: 'demo-' + randStr(12),
    name: b.name,
    avatar: demoAvatar(i),
    score: 0,
    team: room.mode === 'teams' ? (i % 2 === 0 ? 'bleu' : 'orange') : null,
    connected: true,
    disconnectedAt: 0,
    ws: null,
    lastGuessAt: 0,
    bot: true,
  };
  room.players.set(player.id, player);
  return player;
}

function startDemo(room) {
  room.demo = true;
  room.demoStartedAt = Date.now();
  const count = Math.min(DEMO_BOT_COUNT, room.settings.maxPlayers);
  for (let i = 0; i < count; i++) addDemoBot(room, i);
  touch(room);
  broadcast(room);
  setTimeout(() => {
    if (!rooms.has(room.code) || !room.demo) return;
    if (room.phase === G.PHASES.LOBBY) startGame(room, DEMO_ROUNDS);
  }, 1400);
  if (room.demoTimer) clearInterval(room.demoTimer);
  room.demoTimer = setInterval(() => demoStep(room), 850);
  if (room.demoTimer.unref) room.demoTimer.unref();
}

function demoBotIdle(room, excludeId) {
  const list = Array.from(room.players.values()).filter(
    (p) => p.bot && p.connected !== false && p.id !== excludeId
  );
  if (!list.length) return null;
  return list[crypto.randomInt(list.length)].id;
}

function demoStep(room) {
  if (!rooms.has(room.code) || !room.demo) {
    if (room.demoTimer) clearInterval(room.demoTimer);
    room.demoTimer = null;
    return;
  }
  if (room.phase === G.PHASES.LOBBY) {
    if (room.players.size) startGame(room, DEMO_ROUNDS);
    return;
  }
  if (room.phase === G.PHASES.END) {
    if (!room.demoEndedAt) room.demoEndedAt = Date.now();
    if (Date.now() - room.demoEndedAt > 7000) {
      room.demoEndedAt = 0;
      startGame(room, DEMO_ROUNDS);
    }
    return;
  }
  if (room.phase === G.PHASES.BUZZ && !room.controllerId) {
    const id = demoBotIdle(room, null);
    if (id) handleBuzz(room, id);
    return;
  }
  if (room.phase === G.PHASES.PLAY && room.controllerId) {
    const ctrl = room.players.get(room.controllerId);
    if (!ctrl || !ctrl.bot) return;
    const q = room.question;
    if (!q) return;
    const isQCM = q.format === 'qcm';
    const taken = new Set(room.board.map((r) => r.i));
    const options = q.answers.map((a, i) => ({ a, i })).filter((x) => !taken.has(x.i));
    if (!options.length) { finishRound(room, 'complete'); return; }
    if (Math.random() < 0.22 && room.strikes < G.MAX_STRIKES - 1) {
      const wrong = DEMO_GUESSES[crypto.randomInt(DEMO_GUESSES.length)];
      handleGuess(room, ctrl.id, wrong, isQCM ? null : undefined);
    } else {
      const pick = options[crypto.randomInt(options.length)];
      if (isQCM) {
        /* Trouve l'index de l'option qui correspond à la bonne réponse */
        const optIdx = q.options.findIndex((o) => o.text === pick.a.text);
        handleGuess(room, ctrl.id, pick.a.text, optIdx >= 0 ? optIdx : 0);
      } else {
        handleGuess(room, ctrl.id, pick.a.text);
      }
    }
    return;
  }
  if (room.phase === G.PHASES.STEAL) {
    if (!room.stealerId) {
      const id = demoBotIdle(room, room.controllerId);
      if (id) handleBuzz(room, id);
    } else {
      const q = room.question;
      const isQCM = !!q && q.format === 'qcm';
      const taken = new Set(room.board.map((r) => r.i));
      const options = q ? q.answers.map((a, i) => ({ a, i })).filter((x) => !taken.has(x.i)) : [];
      if (options.length && Math.random() < 0.7) {
        const pick = options[crypto.randomInt(options.length)];
        if (isQCM) {
          const optIdx = q.options.findIndex((o) => o.text === pick.a.text);
          handleGuess(room, room.stealerId, pick.a.text, optIdx >= 0 ? optIdx : 0);
        } else {
          handleGuess(room, room.stealerId, pick.a.text);
        }
      } else {
        handleGuess(room, room.stealerId, DEMO_GUESSES[crypto.randomInt(DEMO_GUESSES.length)], isQCM ? null : undefined);
      }
    }
  }
}

function stopDemo(room) {
  if (room.demoTimer) clearInterval(room.demoTimer);
  room.demoTimer = null;
}

function createWebSocketServer(server, paths) {
  const allowed = Array.isArray(paths) ? paths : [paths || '/ws'];
  const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });
  server.on('upgrade', (req, socket, head) => {
    let pathname = '/';
    try { pathname = new URL(req.url, 'http://localhost').pathname; } catch (e) {}
    if (!allowed.includes(pathname)) { socket.destroy(); return; }
    const origin = req.headers.origin || '';
    /* Derrière un proxy (Vercel, Render…) le TLS est terminé en amont :
       on se fie à x-forwarded-proto / x-forwarded-host pour comparer. */
    const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
    const proto = forwardedProto || (req.socket.encrypted ? 'https' : 'http');
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
    const isSameOrigin = origin === proto + '://' + host;
    const isLocalDev = process.env.NODE_ENV !== 'production' && /^(localhost|127\.|\[::1\])/.test(host);
    if (ALLOWED_ORIGIN === '*') {
      /* accepte tout (dev uniquement, a definir explicitement) */
    } else if (ALLOWED_ORIGIN) {
      if (origin !== ALLOWED_ORIGIN) { socket.destroy(); return; }
    } else if (isLocalDev) {
      /* developpement local : accepter meme sans en-tete Origin */
    } else {
      /* production sans ALLOWED_ORIGIN : same-origin uniquement */
      if (!isSameOrigin) { socket.destroy(); return; }
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });

function attachHost(room, ws) {
  room.hostWs = ws;
  room.hostConnected = true;
  room.hostDisconnectedAt = 0;
  ws._ctx = { role: 'host', code: room.code };
  touch(room);
}

function joinPlayer(room, ws, msg) {
  const name = sanitizeName(msg.name) || 'Joueur';
  const avatar = sanitizeAvatar(msg.avatar);
  const token = typeof msg.token === 'string' ? msg.token : '';

  if (token) {
    const existing = Array.from(room.players.values()).find((p) => p.token === token);
    if (existing) {
      existing.ws = ws;
      existing.connected = true;
      existing.disconnectedAt = 0;
      ws._ctx = { role: 'player', code: room.code, playerId: existing.id };
      send(ws, {
        type: 'joined',
        playerId: existing.id,
        token: existing.token,
        code: room.code,
        name: existing.name,
        avatar: existing.avatar,
        reconnected: true,
      });
      send(ws, playerState(room, existing));
      broadcast(room);
      return;
    }
  }

  if (room.demo) {
    sendError(ws, 'demo', 'Partie de démonstration : regarde, tu ne peux pas la rejoindre.');
    return 'demo';
  }
  if (room.phase !== G.PHASES.LOBBY) {
    sendError(ws, 'locked', 'La partie a déjà commencé. Demande le lien de reconnexion à l’animateur.');
    return 'locked';
  }
  if (room.players.size >= room.settings.maxPlayers) {
    sendError(ws, 'full', 'La salle est complète.');
    return 'full';
  }
  const key = avatarKey(avatar);
  if (Array.from(room.players.values()).some((p) => avatarKey(p.avatar) === key)) {
    sendError(ws, 'avatar_taken', 'Ce personnage est déjà pris. Choisis-en un autre !');
    return 'avatar_taken';
  }

  let finalName = name;
  let n = 2;
  const names = new Set(Array.from(room.players.values()).map((p) => p.name.toLowerCase()));
  while (names.has(finalName.toLowerCase())) {
    finalName = name.slice(0, 13) + ' #' + n;
    n++;
  }

  const player = {
    id: 'p_' + randStr(10),
    token: randStr(24),
    name: finalName,
    avatar,
    score: 0,
    team: room.mode === 'teams' ? (room.players.size % 2 === 0 ? 'bleu' : 'orange') : null,
    connected: true,
    disconnectedAt: 0,
    ws,
    lastGuessAt: 0,
  };
  room.players.set(player.id, player);
  ws._ctx = { role: 'player', code: room.code, playerId: player.id };
  touch(room);
  send(ws, {
    type: 'joined',
    playerId: player.id,
    token: player.token,
    code: room.code,
    name: player.name,
    avatar: player.avatar,
  });
  eventToAll(room, { type: 'player-joined', name: player.name });
  broadcast(room);
  return null;
}

wss.on('connection', (ws, req) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws._ctx = null;
  ws._ip = clientIp(req);

  ws.on('message', (buf) => {
    let msg;
    try { msg = JSON.parse(buf.toString()); } catch (e) { return; }
    if (!msg || typeof msg.type !== 'string') return;
    const ctx = ws._ctx || {};

    switch (msg.type) {
      case 'host:create': {
        let code, tries = 0;
        do { code = randomCode(); } while (rooms.has(code) && ++tries < CODE_MAX_TRIES);
        if (rooms.has(code)) {
          sendError(ws, 'busy', 'Réessaie dans un instant.');
          break;
        }
        const room = makeRoom(code, randStr(24), msg.name, msg.settings);
        rooms.set(code, room);
        attachHost(room, ws);
        send(ws, {
          type: 'host:created',
          code,
          hostToken: room.hostToken,
          joinPath: '/?room=' + code,
          demo: !!msg.demo,
        });
        if (msg.demo) startDemo(room);
        else broadcast(room);
        break;
      }
      case 'host:rejoin': {
        const code = String(msg.code || '').toUpperCase();
        const room = rooms.get(code);
        if (!room || room.hostToken !== msg.hostToken) {
          sendError(ws, 'host-gone', 'Cette salle n’existe plus.');
          return;
        }
        attachHost(room, ws);
        send(ws, { type: 'host:joined', code, hostToken: room.hostToken, joinPath: '/?room=' + code });
        broadcast(room);
        break;
      }
      case 'player:join':
      case 'player:rejoin': {
        const code = String(msg.code || '').toUpperCase();
        const room = rooms.get(code);
        const token = typeof msg.token === 'string' ? msg.token : '';
        const tokenRejoin = !!(room && token &&
          Array.from(room.players.values()).some((p) => p.token === token));
        /* Une reconnexion valide n'est jamais limitée. */
        if (!tokenRejoin && joinBlocked(ws._ip, code)) {
          sendError(ws, 'rate', 'Trop d’essais, attends une minute.');
          return;
        }
        if (!room) {
          sendError(ws, 'not-found', 'Salle introuvable. Vérifie le code.');
          noteJoinFailure(ws._ip, code);
          return;
        }
        const failure = joinPlayer(room, ws, msg);
        if (failure) noteJoinFailure(ws._ip, code);
        break;
      }
      case 'player:avatar': {
        if (ctx.role !== 'player') return;
        const room = rooms.get(ctx.code);
        const p = room && room.players.get(ctx.playerId);
        if (!p || room.phase !== G.PHASES.LOBBY) return;
        const avatar = sanitizeAvatar(msg.avatar);
        const key = avatarKey(avatar);
        const taken = Array.from(room.players.values()).some((x) => x.id !== p.id && avatarKey(x.avatar) === key);
        if (taken) { sendError(ws, 'avatar_taken', 'Ce personnage est déjà pris.'); return; }
        p.avatar = avatar;
        touch(room);
        broadcast(room);
        break;
      }
      case 'player:buzz': {
        if (ctx.role !== 'player') return;
        const room = rooms.get(ctx.code);
        if (room) handleBuzz(room, ctx.playerId);
        break;
      }
      case 'player:guess': {
        if (ctx.role !== 'player') return;
        const room = rooms.get(ctx.code);
        if (room) {
          const optionIdx = typeof msg.optionIdx === 'number' && msg.optionIdx >= 0 && msg.optionIdx <= 3 ? msg.optionIdx : null;
          handleGuess(room, ctx.playerId, msg.text, optionIdx);
        }
        break;
      }
      case 'player:leave': {
        if (ctx.role !== 'player') return;
        const room = rooms.get(ctx.code);
        if (!room) return;
        const p = room.players.get(ctx.playerId);
        if (p) { p.ws = null; p.connected = false; }
        removePlayer(room, ctx.playerId, 'Tu as quitté la salle.');
        ws._ctx = null;
        break;
      }
      case 'host:start': {
        if (ctx.role !== 'host') return;
        const room = rooms.get(ctx.code);
        if (!room) return;
        if (room.phase !== G.PHASES.LOBBY) return;
        if (room.players.size < 1) { sendError(ws, 'no-player', 'Il faut au moins un joueur.'); return; }
        for (const p of room.players.values()) { p.score = 0; p.connected = p.connected !== false; }
        startGame(room);
        break;
      }
      case 'host:next': {
        if (ctx.role !== 'host') return;
        const room = rooms.get(ctx.code);
        if (room) hostNext(room);
        break;
      }
      case 'host:reveal': {
        if (ctx.role !== 'host') return;
        const room = rooms.get(ctx.code);
        if (room) hostReveal(room);
        break;
      }
      case 'host:pause': {
        if (ctx.role !== 'host') return;
        const room = rooms.get(ctx.code);
        if (room) hostPause(room, msg.paused);
        break;
      }
      case 'host:addtime': {
        if (ctx.role !== 'host') return;
        const room = rooms.get(ctx.code);
        if (room) hostAddTime(room, msg.seconds);
        break;
      }
      case 'host:settings': {
        if (ctx.role !== 'host') return;
        const room = rooms.get(ctx.code);
        if (!room || room.phase !== G.PHASES.LOBBY) return;
        if (msg.duration != null && [30, 45, 60, 90].includes(Number(msg.duration))) {
          room.settings.duration = Number(msg.duration);
        }
        if (msg.maxPlayers != null) {
          room.settings.maxPlayers = clamp(Number(msg.maxPlayers) || 20, Math.max(2, room.players.size), 20);
        }
        if (Array.isArray(msg.categories) && msg.categories.length > 0) {
          room.settings.categories = msg.categories.slice();
        }
        touch(room);
        broadcast(room);
        break;
      }
      case 'host:kick': {
        if (ctx.role !== 'host') return;
        const room = rooms.get(ctx.code);
        if (!room) return;
        removePlayer(room, String(msg.playerId || ''), 'Tu as été exclu par l’animateur.');
        break;
      }
      case 'host:close': {
        if (ctx.role !== 'host') return;
        const room = rooms.get(ctx.code);
        if (room) closeRoom(room);
        ws._ctx = null;
        break;
      }
      default:
        break;
    }
  });

  ws.on('close', () => {
    const ctx = ws._ctx || {};
    if (ctx.role === 'host') {
      const room = rooms.get(ctx.code);
      if (room && room.hostWs === ws) {
        room.hostWs = null;
        room.hostConnected = false;
        room.hostDisconnectedAt = Date.now();
        if (room.demo) {
          closeRoom(room);
        } else if (room.phase !== G.PHASES.LOBBY && room.phase !== G.PHASES.END && !room.paused) {
          hostPause(room, true);
        }
      }
    } else if (ctx.role === 'player') {
      const room = rooms.get(ctx.code);
      if (!room) return;
      const p = room.players.get(ctx.playerId);
      if (p && p.ws === ws) {
        p.ws = null;
        p.connected = false;
        p.disconnectedAt = Date.now();
        if (room.phase === G.PHASES.PLAY && room.controllerId === p.id) {
          finishRound(room, 'controller-left');
        } else if (room.phase === G.PHASES.STEAL && room.stealerId === p.id) {
          finishRound(room, 'steal-timeout');
        } else {
          broadcast(room);
        }
      }
    }
  });
});

setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) { try { ws.terminate(); } catch (e) {} continue; }
    ws.isAlive = false;
    try { ws.ping(); } catch (e) {}
  }
}, 30000).unref?.();

  return wss;
}

/* ------------------------------------------------------------------ */
/* HTTP statique + API                                                */
/* ------------------------------------------------------------------ */
function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  const allow = ALLOWED_ORIGIN === '*' ? '*' : ALLOWED_ORIGIN;
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'no-referrer',
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  };
  if (allow) headers['access-control-allow-origin'] = allow;
  res.writeHead(status, headers);
  res.end(body);
}

function safeStaticPath(urlPath) {
  if (urlPath === '/' || urlPath === '/index.html') return path.join(ROOT, 'index.html');
  if (urlPath === '/sw.js') return path.join(ROOT, 'sw.js');
  /* liste blanche stricte : seul le moteur de règles est public,
     shared/upstash.js (secrets) reste inaccessible. */
  if (urlPath === '/shared/rules.js') return path.join(ROOT, 'shared', 'rules.js');
  const allowed = ['/css/', '/js/', '/assets/', '/favicon.ico'];
  if (!allowed.some((p) => urlPath === p || urlPath.startsWith(p))) return null;
  const decoded = decodeURIComponent(urlPath);
  const full = path.resolve(ROOT, '.' + decoded);
  if (!full.startsWith(ROOT + path.sep)) return null;
  return full;
}

async function handleHttp(req, res) {
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  const pathname = url.pathname;

  if (pathname === '/api/health') {
    let demos = 0;
    for (const r of rooms.values()) if (r.demo) demos++;
    sendJson(res, 200, { ok: true, rooms: rooms.size - demos, demos, questions: QUESTIONS.length });
    return;
  }

  if (pathname === '/api/config') {
    const host = req.headers.host || '';
    const isLocal = /^(localhost|127\.|\[::1\])/.test(host);
    const publicUrl = process.env.PUBLIC_URL
      || (isLocal && lanIp() ? `http://${lanIp()}:${PORT}` : null);
    sendJson(res, 200, { wsUrl: null, publicUrl });
    return;
  }

  if (pathname === '/api/leaderboard') {
    if (req.method === 'GET') {
      if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        upstash.getLeaderboard().then((scores) => {
          sendJson(res, 200, { scores, count: scores.length, configured: true });
        }).catch((e) => {
          sendJson(res, 502, { error: 'indisponible', detail: e.message });
        });
        return;
      }
      sendJson(res, 200, { scores: leaderboard.slice(0, 50) });
      return;
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        try {
          const msg = JSON.parse(body || '{}');
          if (msg.reset) {
            leaderboard = [];
            leaderboardDirty = true;
            fs.writeFile(LEADERBOARD_FILE, '[]', () => {});
            sendJson(res, 200, { ok: true, message: 'Classement réinitialisé' });
          } else {
            sendJson(res, 400, { error: 'paramètre reset requis' });
          }
        } catch (e) {
          sendJson(res, 400, { error: 'json invalide' });
        }
      });
      return;
    }
    sendJson(res, 405, { error: 'method not allowed' });
    return;
  }

  if (pathname === '/api/qr') {
    const text = url.searchParams.get('text') || '';
    if (!text || text.length > 500) { sendJson(res, 400, { error: 'text requis' }); return; }
    try {
      const buf = await QRCode.toBuffer(text, {
        type: 'png', width: 420, margin: 1,
        color: { dark: '#0C1A4B', light: '#FFFFFF' },
      });
      res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'public, max-age=300' });
      res.end(buf);
    } catch (e) {
      sendJson(res, 500, { error: 'QR indisponible' });
    }
    return;
  }

  if (pathname === '/api/rooms') {
    let demos = 0;
    for (const r of rooms.values()) if (r.demo) demos++;
    sendJson(res, 200, { count: rooms.size - demos, demos });
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(res, 405, { error: 'method not allowed' });
    return;
  }

  const filePath = safeStaticPath(pathname);
  if (!filePath) {
    const isPage = !pathname.startsWith('/api/') && !path.extname(pathname);
    if (isPage) return serveFile(path.join(ROOT, 'index.html'), req, res);
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Introuvable');
    return;
  }
  serveFile(filePath, req, res);
}

function serveFile(filePath, req, res) {
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Introuvable');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const noCache = ['.html', '.js', '.css', '.json'].includes(ext);
    const headers = {
      'content-type': MIME[ext] || 'application/octet-stream',
      'cache-control': noCache ? 'no-cache' : 'public, max-age=3600',
      'content-length': stat.size,
    };
    res.writeHead(200, headers);
    if (req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(filePath).pipe(res);
  });
}

function startLocalServer() {
  const server = http.createServer(handleHttp);
  const wss = createWebSocketServer(server, ['/ws', '/api/ws']);
  server.listen(PORT, () => {
    console.log('');
    console.log('  CREATOR · Guess Their Answer');
    console.log('  http://localhost:' + PORT);
    console.log('  Questions : ' + QUESTIONS.length + ' · Salles : ' + rooms.size);
    if (!ALLOWED_ORIGIN && process.env.NODE_ENV === 'production') {
      console.log('  AVERTISSEMENT : ALLOWED_ORIGIN non defini — seules les connexions');
      console.log('  same-origin sont acceptees. Definissez ALLOWED_ORIGIN pour autoriser');
      console.log('  le frontend (ex. https://<ton-projet>.vercel.app).');
    }
    console.log('');
  });
  return { server, wss };
}

if (require.main === module) startLocalServer();

module.exports = {
  createWebSocketServer,
  startLocalServer,
  handleHttp,
  rooms,
  questions: QUESTIONS,
  randomCode,
  CODE_ALPHABET,
  CODE_LENGTH,
  tooManyJoins,
  joinBlocked,
  noteJoinFailure,
  startDemo,
  DEMO_BOTS,
  lanIp,
};
