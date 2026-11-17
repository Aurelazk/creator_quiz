/* =====================================================================
   server/index.js — serveur autoritaire CREATOR · QCM Quiz
   - HTTP statique (aucun build) + QR + configuration runtime
   - WebSocket natif : salles, chronos, scores et validation 100 % serveur
   - Phases : LOBBY → COUNTDOWN → QUESTION → REVEAL → END
   - La bonne réponse ne part qu'au REVEAL (avec le fait amusant)
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
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sans I, L, O, 0, 1
const CODE_LENGTH = 5;
const CODE_MAX_TRIES = 50;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '';
const JOIN_FAIL_MAX = 30;
const JOIN_WINDOW_MS = 60 * 1000;
const PING_MS = 25 * 1000;
const joinFailures = new Map();

/* Durées raccourcies UNIQUEMENT pour les tests automatisés. */
const COUNTDOWN_MS = Math.max(20, Number(process.env.QUIZ_TEST_COUNTDOWN_MS) || G.COUNTDOWN_MS);
const REVEAL_MS = Math.max(20, Number(process.env.QUIZ_TEST_REVEAL_MS) || G.REVEAL_MS);
const QUESTION_TEST_MS = Number(process.env.QUIZ_TEST_QUESTION_MS) || 0;

const QUESTIONS = JSON.parse(fs.readFileSync(QUESTIONS_FILE, 'utf8'));

function computeBuildHash() {
  const files = [
    'index.html', 'sw.js', 'shared/rules.js',
    'js/app.js', 'js/net.js', 'js/ui.js', 'js/avatar.js', 'js/intro-anim.js',
    'css/tokens.css', 'css/base.css', 'css/components.css', 'css/screens.css', 'css/intro.css',
    'server/questions.json',
  ];
  const hash = crypto.createHash('sha256');
  for (const file of files) {
    try { hash.update(file).update(fs.readFileSync(path.join(ROOT, file))); } catch (e) {}
  }
  return hash.digest('hex').slice(0, 12);
}
function buildHash() { return computeBuildHash(); }

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

function noteJoinFailure(ip, code) {
  const now = Date.now();
  const keys = [ip + '|' + code, ip + '|all', code + '|all'];
  for (const key of keys) {
    const entry = joinFailures.get(key) || { times: [] };
    entry.times.push(now);
    entry.times = entry.times.filter((t) => now - t < JOIN_WINDOW_MS);
    joinFailures.set(key, entry);
  }
}

function joinBlocked(ip, code) {
  const now = Date.now();
  const keys = [ip + '|' + code, ip + '|all', code + '|all'];
  const times = [];
  for (const key of keys) {
    const entry = joinFailures.get(key);
    if (entry) times.push(...entry.times);
  }
  return times.filter((t) => now - t < JOIN_WINDOW_MS).length >= JOIN_FAIL_MAX;
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

function recordScore(name, score, correct, avgTimeMs) {
  leaderboard.push({ name, score, correct, avgTimeMs, at: Date.now() });
  G.sortRanking(leaderboard);
  if (leaderboard.length > 100) leaderboard.length = 100;
  leaderboardDirty = true;
}

function pushUpstash(sorted) {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return;
  for (const p of sorted) {
    upstash.upsertScore(p.name, p.score || 0).catch(() => {});
  }
}

/* ------------------------------------------------------------------ */
/* Salles                                                             */
/* ------------------------------------------------------------------ */
function makeRoom(code, hostToken, hostName, settings) {
  const s = settings || {};
  const themes = Array.isArray(s.themes) && s.themes.length
    ? s.themes.filter((t) => t === 'tout' || G.THEMES.indexOf(t) >= 0)
    : ['tout'];
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
      duration: [10, 15, 20].indexOf(Number(s.duration)) >= 0 ? Number(s.duration) : 15,
      maxPlayers: clamp(Number(s.maxPlayers) || 20, 2, 20),
      themes: themes.length ? themes : ['tout'],
      mode: s.mode === 'teams' ? 'teams' : 'solo',
    },
    players: new Map(),
    queue: [],
    order: [],
    askedHistory: new Set(),
    themeWarnings: [],
    qi: -1,
    qTotal: 0,
    question: null,
    questionId: null,
    questionEndsAt: 0,
    answers: new Map(),
    revealed: false,
    revealInfo: null,
    teamScores: { bleu: 0, orange: 0 },
    createdAt: Date.now(),
    lastActivity: Date.now(),
    _questionTimer: null,
    _revealTimer: null,
    demo: false,
  };
}

function touch(room) { room.lastActivity = Date.now(); }

function questionDuration(room) {
  return QUESTION_TEST_MS || room.settings.duration * 1000;
}

function rankOf(room, playerId) {
  const sorted = G.sortRanking(Array.from(room.players.values()));
  const i = sorted.findIndex((p) => p.id === playerId);
  return i < 0 ? 0 : i + 1;
}

function refObj(room, p) {
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    score: p.score || 0,
    correctCount: p.correctCount || 0,
    avgTimeMs: p.correctCount ? Math.round(p.totalTimeMs / p.correctCount) : 0,
    team: p.team || null,
    avatar: p.avatar,
    connected: p.connected !== false,
    rank: rankOf(room, p.id),
  };
}

function rankingOf(room) {
  return G.sortRanking(Array.from(room.players.values())).map((p) => refObj(room, p));
}

/* État PUBLIC : jamais de correctIndex ni de fact avant REVEAL. */
function baseState(room) {
  const timeLeft = room.question && room.phase === G.PHASES.QUESTION
    ? Math.max(0, room.questionEndsAt - Date.now())
    : 0;
  const state = {
    code: room.code,
    phase: room.phase,
    paused: room.paused,
    serverNow: Date.now(),
    settings: room.settings,
    mode: room.settings.mode,
    teamScores: room.teamScores,
    players: Array.from(room.players.values()).map((p) => refObj(room, p)),
    ranking: rankingOf(room),
    qi: room.qi,
    qTotal: room.qTotal,
    questionId: room.questionId,
    question: room.question && (room.phase === G.PHASES.QUESTION || room.phase === G.PHASES.REVEAL) ? {
      text: room.question.q,
      theme: room.question.theme,
      format: 'qcm',
      options: room.question.options.map((o, i) => ({ id: String.fromCharCode(65 + i), text: o })),
      timeLimit: room.settings.duration * 1000,
    } : null,
    timeLeft,
    phaseEnd: Date.now() + timeLeft,
    answerCount: room.answers.size,
    revealed: room.revealed,
    reveal: room.revealed ? room.revealInfo : null,
    themeWarnings: room.themeWarnings,
  };
  if (room.phase === G.PHASES.END) {
    state.podium = (state.ranking || []).slice(0, 3);
    state.scores = state.ranking;
  }
  return state;
}

function playerState(room, playerId) {
  const s = baseState(room);
  const p = room.players.get(playerId);
  if (p) {
    const ans = room.answers.get(playerId);
    s.me = {
      id: p.id, name: p.name, score: p.score || 0, team: p.team || null,
      avatar: p.avatar, correctCount: p.correctCount || 0,
      rank: rankOf(room, p.id),
      canAnswer: room.phase === G.PHASES.QUESTION && !room.paused && !ans,
      locked: !!ans && !ans.correct,
      answered: !!ans,
      myAnswer: ans ? ans.optionIdx : null,
      answerState: !ans ? null : (ans.correct ? 'correct' : 'miss'),
    };
  }
  return s;
}

function send(ws, obj) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}

function broadcast(room) {
  const state = baseState(room);
  const payload = JSON.stringify({ type: 'state', state });
  for (const p of room.players.values()) {
    send(p.ws, { type: 'state', state: playerState(room, p.id) });
  }
  if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
    room.hostWs.send(JSON.stringify({ type: 'state', state, role: 'host' }));
  }
  void payload;
}

function eventToAll(room, event) {
  for (const p of room.players.values()) send(p.ws, { type: 'event', event });
  if (room.hostWs) send(room.hostWs, { type: 'event', event, role: 'host' });
}

function eventToPlayer(room, playerId, event) {
  const p = room.players.get(playerId);
  if (p) send(p.ws, { type: 'event', event });
}

function sendError(ws, code, message, extra) {
  send(ws, Object.assign({ type: 'error', code, message }, extra || {}));
}

/* ------------------------------------------------------------------ */
/* Cycle de jeu                                                       */
/* ------------------------------------------------------------------ */
function startGame(room) {
  admitQueue(room);
  if (room.players.size < 1) { eventToAll(room, { type: 'event-error', message: 'Ajoute au moins un joueur avant de lancer.' }); return false; }

  const picked = G.buildGameQuestions(QUESTIONS, G.GAME_Q, room.settings.themes, room.askedHistory);
  room.order = picked.questions;
  room.themeWarnings = picked.warnings;
  for (const q of room.order) room.askedHistory.add(q.q);
  room.qi = -1;
  room.qTotal = room.order.length;
  room.phase = G.PHASES.COUNTDOWN;
  room.question = null;
  room.questionId = null;
  room.answers = new Map();
  room.revealed = false;
  room.revealInfo = null;
  room.questionEndsAt = 0;
  room.teamScores = { bleu: 0, orange: 0 };
  touch(room);
  eventToAll(room, { type: 'game-start', room: room.code });
  if (picked.warnings.length && room.hostWs) {
    send(room.hostWs, { type: 'event', event: { type: 'theme-warning', messages: picked.warnings }, role: 'host' });
  }
  nextQuestion(room);
  return true;
}

function nextQuestion(room) {
  if (room._revealTimer) { clearTimeout(room._revealTimer); room._revealTimer = null; }
  room.qi++;
  if (room.qi >= room.order.length) { endGame(room); return; }

  room.question = room.order[room.qi];
  room.questionId = 'q' + room.qi + '_' + crypto.createHash('sha1').update(room.question.q).digest('hex').slice(0, 8);
  room.answers = new Map();
  room.revealed = false;
  room.revealInfo = null;
  room.questionEndsAt = Date.now() + questionDuration(room);
  room.phase = G.PHASES.COUNTDOWN;
  touch(room);
  eventToAll(room, {
    type: 'round-start', qi: room.qi, questionId: room.questionId, qTotal: room.qTotal,
    question: room.question.q, theme: room.question.theme,
    phase: 'countdown', timeLimit: room.settings.duration * 1000,
  });
  broadcast(room);
  room._questionTimer = setTimeout(() => {
    if (room.phase === G.PHASES.COUNTDOWN && room.qi >= 0) openQuestion(room);
  }, COUNTDOWN_MS);
}

function openQuestion(room) {
  if (room.phase !== G.PHASES.COUNTDOWN) return;
  room.phase = G.PHASES.QUESTION;
  room.questionEndsAt = Date.now() + questionDuration(room);
  touch(room);
  eventToAll(room, { type: 'round-start', qi: room.qi, questionId: room.questionId, qTotal: room.qTotal, phase: 'question' });
  broadcast(room);
  room._questionTimer = setTimeout(() => {
    if (room.phase === G.PHASES.QUESTION) revealQuestion(room, 'timeout');
  }, questionDuration(room));
}

function handleAnswer(room, playerId, optionIdx, qi, questionId) {
  if (room.paused || room.phase !== G.PHASES.QUESTION || !room.question) return;
  if (qi != null && qi !== room.qi) return;
  if (questionId != null && questionId !== room.questionId) return;
  const player = room.players.get(playerId);
  if (!player || room.answers.has(playerId)) return;
  if (typeof optionIdx !== 'number' || optionIdx < 0 || optionIdx > 3) return;

  const now = Date.now();
  const timeLeft = Math.max(0, room.questionEndsAt - now);
  const judge = G.judgeQCM(room.question, optionIdx);
  const answer = { optionIdx, at: now, correct: judge.kind === 'found', points: 0, timeMs: questionDuration(room) - timeLeft };

  if (judge.kind === 'found') {
    answer.points = G.pointsForResponse(timeLeft, room.settings.duration * 1000);
    player.score = (player.score || 0) + answer.points;
    player.correctCount = (player.correctCount || 0) + 1;
    player.totalTimeMs = (player.totalTimeMs || 0) + answer.timeMs;
    if (player.team) room.teamScores[player.team] = (room.teamScores[player.team] || 0) + answer.points;
    room.answers.set(playerId, answer);
    eventToPlayer(room, playerId, {
      type: 'result', kind: 'found', points: answer.points,
      timeLeft, qi: room.qi, questionId: room.questionId,
    });
    revealQuestion(room, 'found', playerId);
  } else {
    room.answers.set(playerId, answer);
    eventToPlayer(room, playerId, {
      type: 'result', kind: 'miss', locked: true,
      qi: room.qi, questionId: room.questionId,
    });
  }
  touch(room);
  broadcast(room);
}

function revealQuestion(room, reason, winnerId) {
  if (room.revealed) return;
  if (room._questionTimer) { clearTimeout(room._questionTimer); room._questionTimer = null; }
  room.revealed = true;
  room.phase = G.PHASES.REVEAL;
  const correctIndex = room.question.correctIndex;
  const winner = winnerId ? room.players.get(winnerId) : null;
  const wAnswer = winnerId ? room.answers.get(winnerId) : null;
  room.revealInfo = {
    correctIndex,
    correctText: room.question.options[correctIndex],
    fact: room.question.fact,
    winnerId: winnerId || null,
    winnerName: winner ? winner.name : null,
    winnerTimeMs: wAnswer ? Math.max(0, Math.round(wAnswer.timeMs)) : null,
    winnerPoints: wAnswer ? wAnswer.points : 0,
    reason: reason || 'timeout',
    answers: Array.from(room.answers.entries()).map(([pid, a]) => ({
      playerId: pid, optionIdx: a.optionIdx, correct: a.correct, points: a.points,
    })),
  };
  touch(room);
  eventToAll(room, {
    type: 'reveal', qi: room.qi, questionId: room.questionId,
    correctIndex, correctText: room.revealInfo.correctText, fact: room.question.fact,
    winnerId: winnerId || null, winnerName: room.revealInfo.winnerName,
    winnerTimeMs: room.revealInfo.winnerTimeMs, reason,
  });
  broadcast(room);
  room._revealTimer = setTimeout(() => nextQuestion(room), REVEAL_MS);
}

function endGame(room) {
  if (room._questionTimer) { clearTimeout(room._questionTimer); room._questionTimer = null; }
  room.phase = G.PHASES.END;
  room.question = null;
  room.questionId = null;
  room.answers = new Map();
  room.revealed = false;
  room.revealInfo = null;
  touch(room);
  const sorted = G.sortRanking(Array.from(room.players.values()));
  const podium = sorted.slice(0, 3);
  if (!room.demo) {
    for (const p of sorted) recordScore(p.name, p.score || 0, p.correctCount || 0, p.correctCount ? Math.round(p.totalTimeMs / p.correctCount) : 0);
    saveLeaderboard();
    pushUpstash(sorted);
  }
  eventToAll(room, {
    type: 'end',
    podium: podium.map((p) => ({ id: p.id, name: p.name, score: p.score || 0 })),
    scores: sorted.map((p) => ({ id: p.id, name: p.name, score: p.score || 0, correct: p.correctCount || 0 })),
  });
  broadcast(room);
}

/* ------------------------------------------------------------------ */
/* Joueurs                                                            */
/* ------------------------------------------------------------------ */
function joinPlayer(room, ws, msg, options) {
  const name = (msg.name || 'Joueur').slice(0, 24);
  const token = (options && options.token) || crypto.randomBytes(16).toString('hex');
  const avatar = msg.avatar || globalAvatar();
  const team = room.settings.mode === 'teams'
    ? ((room.teamScores.bleu || 0) <= (room.teamScores.orange || 0) ? 'bleu' : 'orange')
    : null;
  const player = {
    id: 'p_' + crypto.randomBytes(8).toString('hex'),
    token, name, avatar, team,
    score: 0, correctCount: 0, totalTimeMs: 0,
    ws, connected: true, joinedAt: Date.now(),
  };
  room.players.set(player.id, player);
  ws._ctx = { role: 'player', code: room.code, playerId: player.id, token };
  touch(room);
  broadcast(room);
  return { player, token };
}

function globalAvatar() {
  return {
    silhouette: 'neutral', hair: 'short', outfit: 'jacket', accessory: 'none',
    colors: { hair: '#FF6B2C', jacket: '#0B35FE', shirt: '#FF4E20', pants: '#0C1A4B', shoes: '#FF4E20', skin: '#E0AC69' },
  };
}

function findPlayerByToken(room, token) {
  for (const p of room.players.values()) if (p.token === token) return p;
  return null;
}

function admitQueue(room) {
  if (!room.queue.length) return;
  const pending = room.queue.splice(0);
  for (const entry of pending) {
    if (room.players.size >= room.settings.maxPlayers) break;
    if (findPlayerByToken(room, entry.token)) continue;
    const { player } = joinPlayer(room, entry.ws, entry, { token: entry.token });
    send(entry.ws, {
      type: 'joined', code: room.code, playerId: player.id, token: player.token,
      name: player.name, avatar: player.avatar, state: playerState(room, player.id),
    });
  }
}

function removePlayer(room, playerId) {
  const p = room.players.get(playerId);
  if (!p) return;
  p.connected = false;
  p.ws = null;
  room.players.delete(playerId);
  touch(room);
  broadcast(room);
  if (room.players.size === 0 && room.phase === G.PHASES.LOBBY) {
    room._emptyTimer = setTimeout(() => {
      if (rooms.get(room.code) && rooms.get(room.code).players.size === 0) closeRoom(room);
    }, LOBBY_DISCONNECT_MS);
  }
}

function closeRoom(room) {
  for (const key of ['_questionTimer', '_revealTimer', '_emptyTimer', '_demoTimer', '_demoKill']) {
    if (room[key]) clearTimeout(room[key]);
  }
  rooms.delete(room.code);
}

/* ------------------------------------------------------------------ */
/* HTTP                                                               */
/* ------------------------------------------------------------------ */
const rooms = new Map();

function safeFile(pathname) {
  const file = path.resolve(ROOT, '.' + pathname);
  return file.startsWith(ROOT + path.sep) ? file : null;
}

function handleHttp(req, res) {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const json = (obj, status) => {
    res.writeHead(status || 200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(obj));
  };

  if (pathname === '/' || pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(fs.readFileSync(path.join(ROOT, 'index.html')));
    return;
  }
  if (pathname === '/sw.js') {
    const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8').replace(/__BUILD_HASH__/g, buildHash());
    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(sw);
    return;
  }
  if (pathname === '/version.json') {
    json({ hash: buildHash(), questions: QUESTIONS.length });
    return;
  }
  const isPublicShared = pathname === '/shared/rules.js';
  if (/^\/(css|js|assets|tools)\//.test(pathname) || isPublicShared || pathname === '/version.json') {
    const file = safeFile(pathname);
    if (!file) { res.writeHead(403); res.end('forbidden'); return; }
    try {
      const data = fs.readFileSync(file);
      const ext = path.extname(file);
      const ct = ext === '.css' ? 'text/css' : ext === '.js' ? 'application/javascript' : ext === '.json' ? 'application/json' : ext === '.html' ? 'text/html' : 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': ct + '; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(data);
    } catch (e) { res.writeHead(404); res.end('not found'); }
    return;
  }

  if (pathname === '/api/health') {
    json({ ok: true, rooms: rooms.size, questions: QUESTIONS.length });
    return;
  }
  if (pathname === '/api/config') {
    const raw = String(process.env.GAME_WS_URL || '').trim();
    let wsUrl = null;
    if (raw) {
      try {
        const url = new URL(raw);
        if (url.protocol === 'wss:' || url.protocol === 'ws:') {
          if (!url.pathname || url.pathname === '/') url.pathname = '/ws';
          wsUrl = url.toString();
        }
      } catch (e) { wsUrl = null; }
    }
    json({ wsUrl, wsPath: '/ws', publicUrl: process.env.PUBLIC_URL || ('http://localhost:' + PORT) });
    return;
  }
  if (pathname === '/api/leaderboard') {
    const configured = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
    if (!configured) {
      json({ scores: leaderboard.slice(0, 50), count: leaderboard.length, configured: false });
      return;
    }
    upstash.getLeaderboard()
      .then((remote) => json({ scores: (remote || []).slice(0, 50), count: (remote || []).length, configured: true }))
      .catch(() => json({ scores: leaderboard.slice(0, 50), count: leaderboard.length, configured: true }));
    return;
  }
  if (pathname === '/api/qr') {
    const text = new URL(req.url, 'http://localhost').searchParams.get('text') || '';
    if (!text || text.length > 500) { json({ error: 'text requis' }, 400); return; }
    QRCode.toBuffer(text, { type: 'png', width: 420, margin: 1, color: { dark: '#0C1A4B', light: '#FFFFFF' } })
      .then((buf) => {
        res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' });
        res.end(buf);
      })
      .catch(() => json({ error: 'QR indisponible' }, 500));
    return;
  }

  res.writeHead(404); res.end('not found');
}

const server = http.createServer(handleHttp);
const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });

function wsOriginAllowed(origin, proto, host) {
  if (ALLOWED_ORIGIN === '*') return true;
  const publicUrl = process.env.PUBLIC_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL : '');
  const allowed = [ALLOWED_ORIGIN, publicUrl]
    .filter(Boolean)
    .map((value) => String(value).replace(/\/+$/, ''));
  if (allowed.includes(origin)) return true;
  if (origin === proto + '://' + host) return true;
  if (process.env.NODE_ENV !== 'production' && /^(localhost|127\.|\[::1\])/.test(host)) return true;
  if (process.env.VERCEL && /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  return false;
}

server.on('upgrade', (req, socket, head) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname !== '/ws' && pathname !== '/api/ws') { socket.destroy(); return; }
  const origin = req.headers.origin || '';
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const proto = forwardedProto || (req.socket.encrypted ? 'https' : 'http');
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  if (wsOriginAllowed(origin, proto, host)) {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws) => {
  let ctx = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch (e) { return; }
    if (!msg || !msg.type) return;
    if (ws._ctx && ws._ctx !== ctx) ctx = ws._ctx;

    if (msg.type === 'ping') { send(ws, { type: 'pong', t: msg.t }); return; }

    if (msg.type === 'host:create') {
      const code = createCode(rooms);
      if (!code) { sendError(ws, 'no-code', 'Impossible de créer une salle.'); return; }
      const hostToken = crypto.randomBytes(16).toString('hex');
      const room = makeRoom(code, hostToken, msg.name, msg.settings);
      if (msg.demo || process.env.QUIZ_TEST_MODE) room.demo = true;
      rooms.set(code, room);
      ctx = { role: 'host', code, token: hostToken };
      ws._ctx = ctx;
      room.hostWs = ws;
      send(ws, { type: 'host:created', code, hostToken, joinPath: '/?room=' + code, room: baseState(room) });
      broadcast(room);
      return;
    }

    if (msg.type === 'host:rejoin') {
      const room = rooms.get(msg.code);
      if (!room || msg.hostToken !== room.hostToken) { sendError(ws, 'host-gone', 'Salle introuvable.'); return; }
      ctx = { role: 'host', code: room.code, token: room.hostToken };
      ws._ctx = ctx;
      room.hostWs = ws;
      room.hostConnected = true;
      touch(room);
      send(ws, { type: 'host:joined', code: room.code, hostToken: room.hostToken, role: 'host', state: baseState(room) });
      broadcast(room);
      return;
    }

    if (ctx && ctx.role === 'host') {
      const room = rooms.get(ctx.code);
      if (!room) return;
      switch (msg.type) {
        case 'host:start':
          if (room.phase === G.PHASES.LOBBY || room.phase === G.PHASES.END) startGame(room);
          break;
        case 'host:next':
          if (room.phase === G.PHASES.REVEAL) nextQuestion(room);
          else if (room.phase === G.PHASES.END) startGame(room);
          break;
        case 'host:reveal':
          if (room.phase === G.PHASES.QUESTION) revealQuestion(room, 'host');
          break;
        case 'host:pause':
          room.paused = msg.paused !== false;
          if (room.paused && room.questionEndsAt) {
            room._pausedLeft = Math.max(0, room.questionEndsAt - Date.now());
          } else if (room._pausedLeft) {
            room.questionEndsAt = Date.now() + room._pausedLeft;
            room._pausedLeft = 0;
          }
          touch(room);
          broadcast(room);
          break;
        case 'host:settings':
          if (room.phase !== G.PHASES.LOBBY) break;
          if (msg.duration != null && [10, 15, 20].indexOf(Number(msg.duration)) >= 0) room.settings.duration = Number(msg.duration);
          if (msg.maxPlayers != null) room.settings.maxPlayers = clamp(Number(msg.maxPlayers) || 20, Math.max(2, room.players.size), 20);
          if (Array.isArray(msg.themes)) {
            const themes = msg.themes.filter((t) => t === 'tout' || G.THEMES.indexOf(t) >= 0);
            if (themes.length) room.settings.themes = themes.slice();
          }
          if (msg.mode === 'solo' || msg.mode === 'teams') room.settings.mode = msg.mode;
          touch(room);
          broadcast(room);
          break;
        case 'host:kick': {
          const target = findPlayerByToken(room, msg.token) || room.players.get(msg.playerId);
          if (target) {
            send(target.ws, { type: 'event', event: { type: 'kicked', message: 'Tu as été retiré de la salle.' } });
            removePlayer(room, target.id);
          }
          break;
        }
        case 'host:close':
          closeRoom(room);
          send(ws, { type: 'closed' });
          break;
        default:
          break;
      }
      return;
    }

    if (msg.type === 'player:join') {
      const room = rooms.get(msg.code);
      if (!room) { sendError(ws, 'no-room', 'Salle introuvable. Vérifie le code affiché à l’écran.'); return; }

      /* reconnexion par token : acceptée dans TOUTES les phases */
      if (msg.token) {
        const existing = findPlayerByToken(room, msg.token);
        if (existing) {
          existing.ws = ws;
          existing.connected = true;
          ctx = { role: 'player', code: room.code, playerId: existing.id, token: msg.token };
          ws._ctx = ctx;
          touch(room);
          send(ws, {
            type: 'joined', code: room.code, playerId: existing.id, token: msg.token,
            name: existing.name, avatar: existing.avatar, reconnected: true,
            state: playerState(room, existing.id),
          });
          broadcast(room);
          return;
        }
      }

      if (room.phase !== G.PHASES.LOBBY) {
        sendError(ws, 'started', 'La partie a déjà commencé.', { canJoinNext: true, code: room.code });
        return;
      }
      if (joinBlocked((reqIp(ws)), msg.code)) { sendError(ws, 'rate-limit', 'Trop de tentatives. Réessaie dans une minute.'); return; }
      if (room.players.size >= room.settings.maxPlayers) { sendError(ws, 'full', 'Salle pleine.'); return; }
      const { player, token } = joinPlayer(room, ws, msg);
      send(ws, {
        type: 'joined', code: room.code, playerId: player.id, token,
        name: player.name, avatar: player.avatar, state: playerState(room, player.id),
      });
      eventToAll(room, { type: 'player-joined', name: player.name });
      return;
    }

    if (msg.type === 'player:queue') {
      const room = rooms.get(msg.code || (ctx && ctx.code));
      if (!room) { sendError(ws, 'no-room', 'Salle introuvable.'); return; }
      const token = crypto.randomBytes(16).toString('hex');
      room.queue.push({ name: (msg.name || 'Joueur').slice(0, 24), avatar: msg.avatar || globalAvatar(), token, ws });
      ctx = { role: 'queued', code: room.code, token };
      ws._ctx = ctx;
      send(ws, { type: 'queued', code: room.code, token, message: 'Tu rejoindras la salle à la prochaine manche.' });
      return;
    }

    if (ctx && ctx.role === 'player') {
      const room = rooms.get(ctx.code);
      if (!room) return;
      if (msg.type === 'player:answer') {
        handleAnswer(room, ctx.playerId, msg.optionIdx, msg.qi, msg.questionId);
      } else if (msg.type === 'player:leave') {
        removePlayer(room, ctx.playerId);
        ws._ctx = null;
        ctx = null;
      } else if (msg.type === 'player:avatar') {
        const p = room.players.get(ctx.playerId);
        if (p && msg.avatar && msg.avatar.colors) { p.avatar = msg.avatar; broadcast(room); }
      }
    }
  });

  ws.on('close', () => {
    const c = ws._ctx || ctx;
    if (!c) return;
    if (c.role === 'host') {
      const room = rooms.get(c.code);
      if (room && room.hostWs === ws) {
        room.hostWs = null;
        room.hostConnected = false;
        room.hostDisconnectedAt = Date.now();
        touch(room);
        setTimeout(() => {
          const r = rooms.get(c.code);
          if (r && !r.hostConnected && Date.now() - r.hostDisconnectedAt > HOST_IDLE_MS) closeRoom(r);
        }, HOST_IDLE_MS);
      }
    } else if (c.role === 'player') {
      const room = rooms.get(c.code);
      if (room) {
        const p = room.players.get(c.playerId);
        if (p && p.ws === ws) {
          p.ws = null;
          p.connected = false;
          broadcast(room);
        }
      }
    }
  });

  ws.on('error', () => {});
});

function reqIp(ws) {
  try {
    const req = ws._req;
    return (req && req.headers && (req.headers['x-forwarded-for'] || '').split(',')[0].trim()) ||
      (req && req.socket && req.socket.remoteAddress) || 'unknown';
  } catch (e) { return 'unknown'; }
}

/* Ping serveur toutes les 25 s : garde les WebSocket ouvertes derrière les proxies. */
setInterval(() => {
  for (const room of rooms.values()) {
    const payload = JSON.stringify({ type: 'ping', t: Date.now() });
    if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) room.hostWs.send(payload);
    for (const p of room.players.values()) {
      if (p.ws && p.ws.readyState === WebSocket.OPEN) p.ws.send(payload);
    }
  }
}, PING_MS).unref();

loadLeaderboard();
setInterval(saveLeaderboard, 30000).unref();

if (require.main === module) {
  server.listen(PORT, () => {
    console.log('CREATOR QCM server listening on :' + PORT);
    console.log('LAN IP: ' + lanIp());
    console.log('Questions: ' + QUESTIONS.length + ' · rooms in memory');
  });
  process.on('SIGTERM', () => { saveLeaderboard(); server.close(() => process.exit(0)); });
}

module.exports = {
  rooms, makeRoom, PORT,
  CODE_LENGTH, CODE_ALPHABET,
  randomCode: randCode,
  noteJoinFailure, joinBlocked,
  lanIp, server, QUESTIONS,
};
