const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { randomUUID } = require('crypto');
const { WebSocketServer, WebSocket } = require('ws');
const { attachGuessGame, registerGuessRoutes } = require('./guess-game');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB = path.join(DATA_DIR, 'scores.json');
const QUESTION_DATA = require('./public/js/questions.json');
const LEVELS = QUESTION_DATA.levels;
const LEVEL_MAP = new Map(LEVELS.map((level) => [level.id, level]));
const QUESTION_TIME = 15;
const PROMPT_TIME = 60;
const ROOM_SIZE = 2;

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB)) fs.writeFileSync(DB, '[]');

const load = () => {
  try {
    return JSON.parse(fs.readFileSync(DB, 'utf8'));
  } catch {
    return [];
  }
};
const save = (data) => fs.writeFileSync(DB, JSON.stringify(data, null, 2));
const sortScores = (scores) => scores.sort((a, b) => b.score - a.score || a.time - b.time);
const cleanPseudo = (raw) => String(raw || '').trim().slice(0, 20) || 'Anonyme';
const publicLevel = (level) => ({
  id: level.id,
  number: level.number,
  name: level.name,
  short: level.short,
  color: level.color,
  description: level.description,
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
registerGuessRoutes(app);

// ---------- Classement temps réel ----------
const streamingClients = new Set();
const broadcast = (data) => {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of streamingClients) {
    try {
      res.write(payload);
    } catch {
      streamingClients.delete(res);
    }
  }
};

function addScore(pseudo, score, time) {
  const scores = load();
  const entry = { pseudo, score, time, date: Date.now() };
  scores.push(entry);
  save(scores);

  const top = sortScores(scores);
  const rank = top.indexOf(entry) + 1;
  broadcast({ type: 'new-score', pseudo: entry.pseudo, score: entry.score, rank });
  return rank;
}

// Sécurité : synchronisation atomique des scores
const SCORE_LOCK = { value: false };
function addScoreAtomic(pseudo, score, time) {
  if (SCORE_LOCK.value) return addScore(pseudo, score, time);
  SCORE_LOCK.value = true;
  try {
    const existing = load();
    const entry = { pseudo, score: Math.max(0, Math.round(score)), time: Math.max(0, Math.round(time)), date: Date.now() };
    const newScores = [...existing, entry];
    newScores.sort((a, b) => b.score - a.score || a.time - b.time);
    save(newScores.slice(-1000));
    const sorted = sortScores(newScores);
    const rank = sorted.indexOf(entry) + 1;
    broadcast({ type: 'new-score', pseudo: entry.pseudo, score: entry.score, rank });
    return rank;
  } finally {
    SCORE_LOCK.value = false;
  }
}

app.get('/api/leaderboard', (req, res) => {
  res.json(sortScores(load()).slice(0, 20));
});

app.get('/api/levels', (req, res) => {
  res.json(LEVELS.map(publicLevel));
});

app.post('/api/score', (req, res) => {
  const { pseudo, score, time } = req.body || {};
  if (!pseudo || typeof pseudo !== 'string' || typeof score !== 'number' || typeof time !== 'number') {
    return res.status(400).json({ error: 'payload invalide' });
  }

  const rank = addScoreAtomic(
    cleanPseudo(pseudo),
    Math.max(0, Math.round(score)),
    Math.max(0, Math.round(time))
  );
  res.json({ ok: true, rank });
});

app.post('/api/prompt-score', (req, res) => {
  const { prompt, theme } = req.body || {};
  if (typeof prompt !== 'string' || prompt.length > 1200) {
    return res.status(400).json({ error: 'prompt invalide' });
  }
  res.json(scorePrompt(prompt, String(theme || '')));
});

app.get('/api/stream', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write(': connected\n\n');

  streamingClients.add(res);
  const ping = setInterval(() => res.write(': ping\n\n'), 25000);

  req.on('close', () => {
    clearInterval(ping);
    streamingClients.delete(res);
  });
});

// ---------- Multijoueur : salons WebSocket ----------
const wss = new WebSocketServer({ noServer: true });
const guessWss = attachGuessGame();
const rooms = new Map();

server.on('upgrade', (req, socket, head) => {
  const pathname = String(req.url || '').split('?')[0];
  if (pathname === '/ws') {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  } else if (pathname === '/ws/guess') {
    guessWss.handleUpgrade(req, socket, head, (ws) => guessWss.emit('connection', ws, req));
  } else {
    socket.destroy();
  }
});

const send = (ws, msg) => {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
};

const publicPlayers = (match) =>
  match.players.map((player) => ({
    id: player.id,
    pseudo: player.pseudo,
    score: player.score,
    quizScore: player.quizScore,
    promptScore: player.promptScore,
    index: player.index,
    finished: player.finished,
    promptSubmitted: player.promptSubmitted,
    totalTime: Math.round(player.totalTime * 10) / 10,
    rank: player.rank ?? null,
  }));

const publicRoom = (room) => ({
  code: room.code,
  level: publicLevel(room.level),
  hostId: room.hostId,
  state: room.state,
  players: room.players.map((player) => ({
    id: player.id,
    pseudo: player.pseudo,
  })),
});

const broadcastMatch = (match, msg) => {
  for (const player of match.players) send(player.ws, msg);
};

const broadcastRoom = (room, msg) => {
  for (const player of room.players) send(player.ws, msg);
};

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function makePlayer(ws) {
  return {
    ws,
    id: ws.id,
    pseudo: ws.pseudo,
    score: 0,
    quizScore: 0,
    promptScore: 0,
    index: 0,
    finished: false,
    totalTime: 0,
    answered: false,
    questionStart: 0,
    timeout: null,
    rank: null,
    promptText: '',
    promptSubmitted: false,
  };
}

function resetPlayer(player) {
  player.score = 0;
  player.quizScore = 0;
  player.promptScore = 0;
  player.index = 0;
  player.finished = false;
  player.totalTime = 0;
  player.answered = false;
  player.questionStart = 0;
  player.rank = null;
  player.promptText = '';
  player.promptSubmitted = false;
  clearTimeout(player.timeout);
  player.timeout = null;
}

function makeRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function detachWaitingPlayer(ws) {
  const room = ws.room;
  if (!room || room.state !== 'waiting') return;
  const index = room.players.findIndex((player) => player.ws === ws);
  if (index === -1) return;

  room.players.splice(index, 1);
  ws.room = null;
  ws.match = null;

  if (!room.players.length) {
    clearTimeout(room.startTimer);
    rooms.delete(room.code);
    return;
  }

  if (room.hostId === ws.id) room.hostId = room.players[0].id;
  clearTimeout(room.startTimer);
  room.startTimer = null;
  broadcastRoom(room, { type: 'room-state', room: publicRoom(room) });
}

function createRoom(ws, msg) {
  if (ws.match) return send(ws, { type: 'room-error', message: 'Tu es déjà en partie.' });
  if (ws.room) detachWaitingPlayer(ws);

  ws.pseudo = cleanPseudo(msg.pseudo || ws.pseudo);
  const level = LEVEL_MAP.get(msg.level) || LEVELS[0];
  const room = {
    code: makeRoomCode(),
    level,
    hostId: ws.id,
    players: [makePlayer(ws)],
    state: 'waiting',
    match: null,
    startTimer: null,
  };

  rooms.set(room.code, room);
  ws.room = room;
  ws.match = null;

  send(ws, { type: 'room-created', room: publicRoom(room) });
  broadcastRoom(room, { type: 'room-state', room: publicRoom(room) });
}

function joinRoom(ws, msg) {
  if (ws.match) return send(ws, { type: 'room-error', message: 'Tu es déjà en partie.' });
  if (ws.room) detachWaitingPlayer(ws);

  const code = String(msg.code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  const room = rooms.get(code);
  if (!room) return send(ws, { type: 'room-error', message: 'Salon introuvable.' });
  if (room.state !== 'waiting') return send(ws, { type: 'room-error', message: 'Ce salon a déjà commencé.' });
  if (room.players.length >= ROOM_SIZE) return send(ws, { type: 'room-error', message: 'Ce salon est complet.' });

  ws.pseudo = cleanPseudo(msg.pseudo || ws.pseudo);
  room.players.push(makePlayer(ws));
  ws.room = room;
  ws.match = null;

  send(ws, { type: 'room-joined', room: publicRoom(room) });
  broadcastRoom(room, { type: 'room-state', room: publicRoom(room) });

  clearTimeout(room.startTimer);
  room.startTimer = setTimeout(() => startMatch(room), 900);
}

function startMatch(room) {
  room.startTimer = null;
  if (room.state !== 'waiting' || room.players.length < ROOM_SIZE) {
    broadcastRoom(room, { type: 'room-state', room: publicRoom(room) });
    return;
  }

  room.state = 'playing';
  for (const player of room.players) resetPlayer(player);

  const match = {
    id: randomUUID(),
    room,
    players: room.players,
    questions: shuffle(room.level.questions).slice(0, 10),
    ended: false,
    phase: 'quiz',
    prompt: null,
  };

  room.match = match;
  for (const player of room.players) player.ws.match = match;

  const startPlayers = match.players.map((player) => ({
    id: player.id,
    pseudo: player.pseudo,
    score: 0,
    quizScore: 0,
    promptScore: 0,
    index: 0,
    finished: false,
    promptSubmitted: false,
    totalTime: 0,
    rank: null,
  }));

  for (const player of match.players) {
    send(player.ws, {
      type: 'match-start',
      matchId: match.id,
      selfId: player.id,
      level: publicLevel(room.level),
      total: match.questions.length,
      players: startPlayers,
    });
  }

  broadcastMatch(match, { type: 'match-state', matchId: match.id, players: publicPlayers(match) });
  for (const player of match.players) sendQuestion(match, player);
}

function sendQuestion(match, player) {
  if (match.ended || match.phase !== 'quiz' || player.finished) return;
  const question = match.questions[player.index];
  if (!question) return finishQuizPlayer(match, player);

  player.answered = false;
  player.questionStart = Date.now();

  send(player.ws, {
    type: 'question',
    matchId: match.id,
    index: player.index,
    total: match.questions.length,
    q: question.q,
    context: question.context || '',
    kind: question.type || 'mcq',
    a: question.a,
    duration: QUESTION_TIME,
    level: publicLevel(match.room.level),
    players: publicPlayers(match),
  });

  clearTimeout(player.timeout);
  player.timeout = setTimeout(
    () => processAnswer(match, player, player.index, -1, true),
    (QUESTION_TIME + 0.6) * 1000
  );
}

function finishQuizPlayer(match, player) {
  if (player.finished) return;
  player.finished = true;
  clearTimeout(player.timeout);
  player.timeout = null;
  broadcastMatch(match, { type: 'match-state', matchId: match.id, players: publicPlayers(match) });

  if (match.players.every((item) => item.finished)) beginPrompt(match);
}

function processAnswer(match, player, index, choice, timedOut = false) {
  if (match.ended || match.phase !== 'quiz' || player.finished || player.answered || index !== player.index) return;
  player.answered = true;
  clearTimeout(player.timeout);
  player.timeout = null;

  const question = match.questions[player.index];
  const elapsed = (Date.now() - player.questionStart) / 1000;
  const timeLeft = timedOut
    ? 0
    : Math.max(0, Math.min(QUESTION_TIME, Math.floor(QUESTION_TIME - elapsed + 0.5)));
  const correct = !timedOut && choice === question.c;
  const gained = correct ? 100 + timeLeft * 10 : 0;

  player.score += gained;
  player.quizScore = player.score;
  player.totalTime += Math.min(elapsed, QUESTION_TIME + 0.6);
  player.index++;

  send(player.ws, {
    type: 'answer-result',
    matchId: match.id,
    index,
    kind: question.type || 'mcq',
    correct,
    correctIndex: question.c,
    explain: question.explain || '',
    gained,
    timedOut,
    score: player.score,
    index: player.index,
  });

  broadcastMatch(match, { type: 'match-state', matchId: match.id, players: publicPlayers(match) });

  if (player.index >= match.questions.length) {
    finishQuizPlayer(match, player);
    return;
  }

  setTimeout(() => {
    if (!match.ended && !player.finished) sendQuestion(match, player);
  }, 900);
}

function beginPrompt(match) {
  if (match.ended || match.phase !== 'quiz') return;
  match.phase = 'prompt';

  const prompts = match.room.level.prompts || ['Imagine un produit utile pour les étudiants de Cotonou.'];
  const theme = prompts[Math.floor(Math.random() * prompts.length)];
  match.prompt = {
    theme,
    startedAt: Date.now(),
    duration: PROMPT_TIME,
    finalized: false,
  };

  for (const player of match.players) {
    player.promptText = '';
    player.promptSubmitted = false;
  }

  broadcastMatch(match, {
    type: 'prompt-start',
    matchId: match.id,
    theme,
    duration: PROMPT_TIME,
    rubric: QUESTION_DATA.promptRubric,
    level: publicLevel(match.room.level),
    players: publicPlayers(match),
  });

  match.prompt.timeout = setTimeout(() => finalizePrompt(match), (PROMPT_TIME + 0.5) * 1000);
}

function submitPrompt(match, player, text) {
  if (match.ended || match.phase !== 'prompt' || player.promptSubmitted) return;
  player.promptText = String(text || '').trim().slice(0, 600);
  player.promptSubmitted = true;

  send(player.ws, { type: 'prompt-submitted' });
  broadcastMatch(match, {
    type: 'prompt-state',
    matchId: match.id,
    submitted: match.players.filter((item) => item.promptSubmitted).length,
    total: match.players.length,
  });

  if (match.players.every((item) => item.promptSubmitted)) {
    setTimeout(() => finalizePrompt(match), 600);
  }
}

function finalizePrompt(match) {
  if (match.ended || match.phase !== 'prompt') return;
  const prompt = match.prompt;
  if (!prompt || prompt.finalized) return;
  prompt.finalized = true;
  clearTimeout(prompt.timeout);

  for (const player of match.players) {
    if (!player.promptSubmitted) player.promptSubmitted = true;
    const result = scorePrompt(player.promptText, prompt.theme);
    player.promptScore = result.score;
    player.promptFeedback = result.feedback;
    player.score += result.score;
  }

  match.phase = 'prompt-result';
  const summary = match.players.map((player) => ({
    id: player.id,
    pseudo: player.pseudo,
    prompt: player.promptText || '(aucun prompt envoyé)',
    promptScore: player.promptScore,
    quizScore: player.quizScore,
    score: player.score,
    feedback: player.promptFeedback,
  }));

  for (const player of match.players) {
    send(player.ws, {
      type: 'prompt-result',
      matchId: match.id,
      selfId: player.id,
      theme: prompt.theme,
      rubric: QUESTION_DATA.promptRubric,
      players: summary,
    });
  }

  match.prompt.endTimer = setTimeout(() => endMatch(match, 'finished'), 6500);
}

function scorePrompt(rawPrompt, theme = '') {
  const text = String(rawPrompt || '').trim();
  if (!text) return { score: 0, feedback: 'Aucun prompt envoyé : 0 point.' };

  const lower = text.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  let score = 20;
  let context = 0;
  let constraints = 0;
  let format = 0;

  if (words.length >= 12) score += 12;
  if (words.length >= 28) score += 8;
  if (words.length < 6) score -= 12;
  if (words.length > 150) score -= 6;

  if (/(agis comme|tu es|r[oô]le|expert|senior|d[ée]veloppeur|designer|professeur)/.test(lower)) {
    score += 14;
    context += 14;
  }
  if (/(cr[ée]e|cr[ée]er|g[ée]n[èe]re|g[ée]n[ée]rer|construis|construire|propose|r[ée]dige|corrige|explique|fais|con[çc]ois)/.test(lower)) {
    score += 12;
    context += 12;
  }

  const constraintWords = [
    'dois', 'ne dois pas', 'inclure', 'sans', 'avec', 'format', 'style', 'public',
    'mobile', 'responsive', 'accessible', 'max', 'min', 'étapes', 'contrainte',
    'uniquement', 'cotonou', 'étudiant', 'couleur', 'typographie', 'bouton',
  ];
  for (const word of constraintWords) {
    if (lower.includes(word)) constraints++;
  }
  score += Math.min(24, constraints * 3);

  if (/(format|r[ée]ponse|liste|tableau|json|markdown|[ée]tapes|exemple|maquette)/.test(lower)) {
    score += 10;
    format += 10;
  }

  const themeWords = theme
    .toLowerCase()
    .split(/[^a-zà-ÿ0-9]+/)
    .filter((word) => word.length > 4);
  const themeMatches = themeWords.filter((word) => lower.includes(word)).length;
  score += Math.min(8, themeMatches * 2);

  if (/\n|^\s*[-*•]|\d[.)]\s/m.test(text)) score += 5;
  if (/(.)\1{5,}/.test(text)) score -= 6;

  score = Math.max(0, Math.min(100, Math.round(score)));
  const parts = [];
  if (context >= 12) parts.push('contexte posé');
  if (constraints >= 3) parts.push('contraintes précises');
  if (format >= 10) parts.push('format attendu');
  if (!parts.length) parts.push('prompt encore trop général');
  const feedback = `${parts.join(', ')}. Score : ${score}/100.`;

  return { score, feedback };
}

function endMatch(match, reason, forfeiterId = null) {
  if (match.ended) return;
  match.ended = true;
  match.phase = 'ended';

  for (const player of match.players) {
    clearTimeout(player.timeout);
    player.timeout = null;
  }
  if (match.prompt) {
    clearTimeout(match.prompt.timeout);
    clearTimeout(match.prompt.endTimer);
  }

  const [a, b] = match.players;
  let winnerId = null;

  if (reason === 'forfeit' && forfeiterId) {
    const remaining = match.players.find((player) => player.id !== forfeiterId);
    winnerId = remaining ? remaining.id : null;
  } else if (a.score !== b.score) {
    winnerId = a.score > b.score ? a.id : b.id;
  } else if (a.totalTime !== b.totalTime) {
    winnerId = a.totalTime < b.totalTime ? a.id : b.id;
  }

  if (reason !== 'forfeit') {
    const scores = load();
    const entries = match.players.map((player) => ({
      pseudo: player.pseudo,
      score: player.score,
      time: Math.max(1, Math.round(player.totalTime)),
      date: Date.now(),
    }));
    scores.push(...entries);
    save(scores);

    const top = sortScores(scores);
    match.players.forEach((player, index) => {
      player.rank = top.indexOf(entries[index]) + 1;
      broadcast({
        type: 'new-score',
        pseudo: player.pseudo,
        score: player.score,
        rank: player.rank,
        source: 'duel',
      });
    });
  }

  const room = match.room;
  if (room) {
    room.state = 'ended';
    room.match = null;
    clearTimeout(room.startTimer);
    rooms.delete(room.code);
  }

  broadcastMatch(match, {
    type: 'match-end',
    matchId: match.id,
    reason,
    winnerId,
    level: room ? publicLevel(room.level) : null,
    players: publicPlayers(match),
  });

  for (const player of match.players) {
    player.ws.match = null;
    player.ws.room = null;
  }
}

function leaveRoom(ws) {
  const room = ws.room;
  const match = ws.match;

  if (match && !match.ended) {
    const player = match.players.find((item) => item.ws === ws);
    if (player) {
      player.finished = true;
      clearTimeout(player.timeout);
      const opponent = match.players.find((item) => item !== player);
      if (opponent && opponent.ws.readyState === WebSocket.OPEN) {
        send(opponent.ws, {
          type: 'opponent-left',
          matchId: match.id,
          pseudo: player.pseudo,
        });
      }
      endMatch(match, 'forfeit', player.id);
    }
    return;
  }

  if (room) {
    detachWaitingPlayer(ws);
    if (ws.room === room) {
      ws.room = null;
      ws.match = null;
    }
  }
}

wss.on('connection', (ws) => {
  ws.id = randomUUID();
  ws.pseudo = 'Anonyme';
  ws.room = null;
  ws.match = null;
  ws.isAlive = true;

  ws.on('pong', () => (ws.isAlive = true));

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return send(ws, { type: 'error', message: 'Message invalide' });
    }

    if (!msg || typeof msg.type !== 'string') {
      return send(ws, { type: 'error', message: 'Message invalide' });
    }

    switch (msg.type) {
      case 'create-room':
        createRoom(ws, msg);
        break;
      case 'join-room':
        joinRoom(ws, msg);
        break;
      case 'leave-room':
        leaveRoom(ws);
        send(ws, { type: 'room-left' });
        break;
      case 'answer': {
        const match = ws.match;
        if (!match || match.ended || match.phase !== 'quiz') return;
        const player = match.players.find((item) => item.ws === ws);
        if (!player) return;
        const choice = Number.isInteger(msg.choice) ? msg.choice : -1;
        processAnswer(match, player, msg.index, choice, choice === -1);
        break;
      }
      case 'submit-prompt': {
        const match = ws.match;
        if (!match || match.ended) return;
        const player = match.players.find((item) => item.ws === ws);
        if (!player) return;
        submitPrompt(match, player, msg.text);
        break;
      }
      default:
        send(ws, { type: 'error', message: 'Type de message inconnu' });
    }
  });

  ws.on('close', () => {
    leaveRoom(ws);
  });
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

server.listen(PORT, () => {
  console.log(`CREATOR Challenge → http://localhost:${PORT}`);
  console.log(`Guess Their Answer → http://localhost:${PORT}/guess`);
});
