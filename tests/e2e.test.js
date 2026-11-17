'use strict';

const assert = require('assert');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const WebSocket = require('ws');

const ROOT = path.join(__dirname, '..');
const PORT = 3200 + Math.floor(Math.random() * 900);
const BASE = 'http://127.0.0.1:' + PORT;
const WS_URL = 'ws://127.0.0.1:' + PORT + '/ws';
const QUESTIONS = JSON.parse(fs.readFileSync(path.join(ROOT, 'server', 'questions.json'), 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const env = {
  ...process.env,
  PORT: String(PORT),
  PUBLIC_URL: BASE,
  QUIZ_TEST_MODE: '1',
  QUIZ_TEST_COUNTDOWN_MS: '30',
  QUIZ_TEST_REVEAL_MS: '30',
  QUIZ_TEST_QUESTION_MS: '1500',
};

let server = null;
let logs = '';

function request(method, pathname) {
  return new Promise((resolve, reject) => {
    const req = http.request(BASE + pathname, { method }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.end();
  });
}

function client(tag) {
  const ws = new WebSocket(WS_URL, { headers: { origin: BASE } });
  ws.tag = tag;
  ws.inbox = [];
  ws.errors = [];
  ws.on('message', (buf) => {
    try { ws.inbox.push(JSON.parse(buf.toString())); } catch (e) {}
  });
  ws.on('error', (err) => ws.errors.push(String(err)));
  return ws;
}

function open(ws) {
  return new Promise((resolve, reject) => {
    if (ws.readyState === WebSocket.OPEN) return resolve();
    ws.once('open', resolve);
    ws.once('error', reject);
    setTimeout(() => reject(new Error('connexion WS expirée (' + ws.tag + ')')), 4000);
  });
}

function waitFor(ws, predicate, timeout, label) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const iv = setInterval(() => {
      const idx = ws.inbox.findIndex(predicate);
      if (idx >= 0) {
        const msg = ws.inbox.splice(idx, 1)[0];
        clearInterval(iv);
        resolve(msg);
      } else if (Date.now() - start > (timeout || 5000)) {
        clearInterval(iv);
        reject(new Error('timeout ' + (label || ws.tag) + ' — ' + JSON.stringify(ws.inbox.slice(-3))));
      }
    }, 10);
  });
}

const stateWhere = (fn) => (m) => m.type === 'state' && (!fn || fn(m.state));
const eventWhere = (fn) => (m) => m.type === 'event' && m.event && (!fn || fn(m.event));
function send(ws, type, data) { ws.send(JSON.stringify(Object.assign({ type }, data || {}))); }

async function startServer() {
  server = spawn(process.execPath, [path.join(ROOT, 'server', 'index.js')], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', (d) => { logs += d.toString(); });
  server.stderr.on('data', (d) => { logs += d.toString(); });
  for (let i = 0; i < 80; i++) {
    await sleep(100);
    try { if ((await request('GET', '/api/health')).status === 200) return; } catch (e) {}
  }
  throw new Error('serveur non démarré : ' + logs);
}

async function run() {
  await startServer();
  console.log('\nCREATOR · test de bout en bout QCM (port ' + PORT + ')\n');

  const health = JSON.parse((await request('GET', '/api/health')).body.toString());
  assert.strictEqual(health.questions, 120);
  const sw = (await request('GET', '/sw.js')).body.toString();
  assert.ok(!sw.includes('__BUILD_HASH__'), 'hash de build injecté');
  const qr = await request('GET', '/api/qr?text=' + encodeURIComponent(BASE + '/?room=ABCDE'));
  assert.ok(/image\/png/.test(qr.headers['content-type']));
  console.log('  ✓ routes HTTP, QR et service worker versionné');

  const host = client('host');
  await open(host);
  send(host, 'host:create', {
    name: 'Animateur',
    settings: { duration: 15, maxPlayers: 8, themes: ['Gastronomie'], mode: 'solo' },
  });
  const created = await waitFor(host, (m) => m.type === 'host:created', 4000, 'host:created');
  const code = created.code;
  assert.strictEqual(created.joinPath, '/?room=' + code);
  console.log('  ✓ salle créée : ' + code + ' (thème Gastronomie)');

  const players = [];
  for (let i = 0; i < 3; i++) {
    const ws = client('telephone' + (i + 1));
    await open(ws);
    send(ws, 'player:join', { code, name: 'Joueur ' + (i + 1) });
    const joined = await waitFor(ws, (m) => m.type === 'joined', 4000, 'joined ' + i);
    players.push({ ws, id: joined.playerId, token: joined.token, name: joined.name });
  }
  await waitFor(host, stateWhere((s) => s.players.length === 3), 4000, 'lobby 3 joueurs');
  console.log('  ✓ 3 téléphones connectés');

  send(host, 'host:start');
  const started = await waitFor(players[0].ws, stateWhere((s) => s.question && s.phase === 'question' && s.qi === 0), 5000, 'question 1');
  const firstState = started.state;
  assert.strictEqual(firstState.question.theme, 'Gastronomie');
  assert.strictEqual(firstState.question.format, 'qcm');
  assert.strictEqual(firstState.question.options.length, 4);
  assert.ok(!('correct' in firstState) && !('correctIndex' in firstState.question) && firstState.reveal === null, 'aucune bonne réponse avant REVEAL');
  const q0 = QUESTIONS.find((q) => q.q === firstState.question.text);
  assert.ok(q0, 'question présente dans la banque');
  console.log('  ✓ état public sans bonne réponse : ' + q0.q);

  const wrong = [0, 1, 2, 3].find((i) => i !== q0.correctIndex);
  send(players[0].ws, 'player:answer', { optionIdx: wrong, qi: 0, questionId: firstState.questionId });
  const miss = await waitFor(players[0].ws, eventWhere((e) => e.kind === 'miss'), 3000, 'résultat incorrect');
  assert.strictEqual(miss.event.locked, true);
  const locked = await waitFor(players[0].ws, stateWhere((s) => s.me && s.me.locked), 3000, 'verrouillage');
  assert.strictEqual(locked.state.me.myAnswer, wrong);
  console.log('  ✓ mauvaise réponse verrouillée');

  send(players[1].ws, 'player:answer', { optionIdx: q0.correctIndex, qi: 0, questionId: firstState.questionId });
  const found = await waitFor(players[1].ws, eventWhere((e) => e.kind === 'found'), 3000, 'bonne réponse');
  assert.ok(found.event.points >= 10 && found.event.points <= 15, 'score 10 + bonus 0-5');
  const reveal = await waitFor(players[2].ws, eventWhere((e) => e.type === 'reveal'), 3000, 'reveal');
  assert.strictEqual(reveal.event.correctIndex, q0.correctIndex);
  assert.strictEqual(reveal.event.winnerId, players[1].id);
  assert.ok(reveal.event.fact && reveal.event.fact.length > 10);
  const revealedState = await waitFor(players[0].ws, stateWhere((s) => s.phase === 'reveal' && s.reveal), 3000, 'état reveal');
  assert.ok(revealedState.state.reveal.fact);
  console.log('  ✓ bonne réponse : +' + found.event.points + ' pts, révélation avec fait');

  send(players[2].ws, 'player:answer', { optionIdx: q0.correctIndex, qi: 0, questionId: firstState.questionId });
  await sleep(120);
  assert.strictEqual(players[2].ws.inbox.filter((m) => m.type === 'event' && m.event && m.event.kind === 'found').length, 0, 'réponse tardive ignorée');
  console.log('  ✓ réponse tardive ignorée');

  const q1 = await waitFor(players[1].ws, stateWhere((s) => s.qi === 1 && s.phase === 'question'), 6000, 'question 2');
  players[1].ws.close();
  const recon = client('reconnexion');
  await open(recon);
  send(recon, 'player:join', { code, token: players[1].token, name: players[1].name });
  const rejoined = await waitFor(recon, (m) => m.type === 'joined', 4000, 'reconnexion');
  assert.strictEqual(rejoined.reconnected, true);
  assert.strictEqual(rejoined.playerId, players[1].id);
  assert.strictEqual(rejoined.state.me.score, found.event.points, 'score conservé');
  assert.strictEqual(rejoined.state.qi, 1, 'question en cours conservée');
  players[1].ws = recon;
  console.log('  ✓ reconnexion en cours de partie');

  const timeout = await waitFor(recon, eventWhere((e) => e.type === 'reveal' && e.qi === 1), 5000, 'timeout reveal');
  assert.strictEqual(timeout.event.reason, 'timeout');
  console.log('  ✓ timeout sans réponse révélé');

  const seen = [firstState.question.text];
  const difficulties = { 1: 0, 2: 0, 3: 0, [q0.difficulty]: 1 };
  for (const m of players[0].ws.inbox) {
    if (m.type === 'state' && m.state.question && m.state.phase === 'question') {
      const item = QUESTIONS.find((q) => q.q === m.state.question.text);
      if (item && !seen.includes(item.q)) { seen.push(item.q); difficulties[item.difficulty]++; }
    }
  }
  const end = await waitFor(players[0].ws, stateWhere((s) => s.phase === 'end'), 30000, 'fin de partie');
  for (const m of players[0].ws.inbox) {
    if (m.type === 'state' && m.state.question && m.state.phase === 'question') {
      const item = QUESTIONS.find((q) => q.q === m.state.question.text);
      if (item && !seen.includes(item.q)) { seen.push(item.q); difficulties[item.difficulty]++; }
    }
  }
  assert.strictEqual(seen.length, 10, '10 questions jouées');
  assert.strictEqual(new Set(seen).size, 10, 'aucun doublon');
  assert.strictEqual(seen.filter((text) => QUESTIONS.find((q) => q.q === text).theme === 'Gastronomie').length, 10, 'thème respecté');
  assert.deepStrictEqual(difficulties, { 1: 3, 2: 4, 3: 3 }, 'mix difficultés 3/4/3');
  assert.ok(end.state.podium && end.state.podium.length > 0, 'podium présent');
  assert.ok(end.state.scores.some((p) => p.name === players[1].name && p.score > 0), 'classement final');
  console.log('  ✓ 10 questions, thème respecté, mix 3/4/3, podium');

  send(host, 'host:close');
  await sleep(150);
  for (const p of players) { try { p.ws.close(); } catch (e) {} }
  try { recon.close(); } catch (e) {}
  host.close();
  assert.strictEqual(host.errors.length, 0);
  console.log('\n  ✓ test de bout en bout réussi\n');
}

run()
  .then(() => { if (server) server.kill('SIGTERM'); setTimeout(() => process.exit(0), 150); })
  .catch((err) => {
    console.error('\n  ✗ échec :', err && err.stack ? err.stack : err);
    console.error(logs.slice(-1500));
    if (server) server.kill('SIGTERM');
    setTimeout(() => process.exit(1), 150);
  });
