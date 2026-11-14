/* =====================================================================
   tests/e2e.test.js — partie complète contre un vrai serveur WebSocket
   Lance un serveur sur un port de test, joue une manche, vérifie l'état
   public/privé, le vol, la reconnexion et les routes HTTP.
   ===================================================================== */
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

const AVATARS = [
  { silhouette: 'neutral', hair: 'short', outfit: 'jacket', accessory: 'none', colors: { hair: '#FF6B2C', jacket: '#0B35FE', shirt: '#FF4E20', pants: '#0C1A4B', shoes: '#FF4E20' } },
  { silhouette: 'fem', hair: 'afro', outfit: 'dress', accessory: 'glasses', colors: { hair: '#2B1B12', jacket: '#00E472', shirt: '#F5C542', pants: '#111827', shoes: '#F4F6FC' } },
  { silhouette: 'masc', hair: 'curly', outfit: 'hoodie', accessory: 'headphones', colors: { hair: '#F5C542', jacket: '#FF7A00', shirt: '#2E85FF', pants: '#3B4A6B', shoes: '#111827' } },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const env = { ...process.env, PORT: String(PORT) };

let server = null;
let served = false;

function request(method, pathname) {
  return new Promise((resolve, reject) => {
    const req = http.request(BASE + pathname, { method }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks),
      }));
    });
    req.on('error', reject);
    req.end();
  });
}

function client(tag) {
  const ws = new WebSocket(WS_URL);
  ws.tag = tag;
  ws.inbox = [];
  ws.errors = [];
  ws.on('message', (buf) => {
    let msg;
    try { msg = JSON.parse(buf.toString()); } catch (e) { return; }
    ws.inbox.push(msg);
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
        reject(new Error(
          'timeout ' + (label || ws.tag) + ' — derniers messages : ' +
          JSON.stringify(ws.inbox.slice(-4))
        ));
      }
    }, 15);
  });
}

const stateWhere = (fn) => (m) => m.type === 'state' && (!fn || fn(m));
const eventNamed = (name) => (m) => m.type === 'event' && m.event === name;

function send(ws, type, data) {
  ws.send(JSON.stringify(Object.assign({ type }, data || {})));
}

async function startServer() {
  server = spawn(process.execPath, [path.join(ROOT, 'server', 'index.js')], {
    cwd: ROOT,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  server.stdout.on('data', (d) => { logs += d.toString(); });
  server.stderr.on('data', (d) => { logs += d.toString(); });
  for (let i = 0; i < 60; i++) {
    await sleep(100);
    try {
      const res = await request('GET', '/api/health');
      if (res.status === 200) { served = true; return; }
    } catch (e) {}
  }
  throw new Error('serveur non démarré : ' + logs);
}

async function run() {
  await startServer();
  console.log('\nCREATOR · test de bout en bout (port ' + PORT + ')\n');

  const health = await request('GET', '/api/health');
  assert.strictEqual(health.status, 200);
  assert.strictEqual(JSON.parse(health.body.toString()).ok, true);

  const appJs = await request('GET', '/js/app.js');
  assert.strictEqual(appJs.status, 200);
  assert.ok(/javascript/.test(appJs.headers['content-type']));

  const sw = await request('GET', '/sw.js');
  assert.strictEqual(sw.status, 200);

  const qr = await request('GET', '/api/qr?text=' + encodeURIComponent('http://example.test/?room=ABCDE'));
  assert.strictEqual(qr.status, 200);
  assert.ok(/image\/png/.test(qr.headers['content-type']));
  assert.ok(qr.body.length > 100);

  const lb = await request('GET', '/api/leaderboard');
  assert.strictEqual(lb.status, 200);
  assert.ok(Array.isArray(JSON.parse(lb.body.toString()).scores));

  const host = client('host');
  await open(host);
  send(host, 'host:create', { name: 'Animateur', settings: { duration: 30, maxPlayers: 8 } });
  const created = await waitFor(host, (m) => m.type === 'host:created', 4000, 'host:created');
  assert.ok(/^[A-Z0-9]{5}$/.test(created.code));
  assert.strictEqual(created.joinPath, '/?room=' + created.code);
  await waitFor(host, stateWhere((m) => m.phase === 'lobby'), 4000, 'lobby hôte');
  console.log('  ✓ salle créée : ' + created.code);

  const players = [];
  for (let i = 0; i < 2; i++) {
    const ws = client('joueur' + (i + 1));
    await open(ws);
    send(ws, 'player:join', { code: created.code, name: 'Joueur ' + (i + 1), avatar: AVATARS[i] });
    const joined = await waitFor(ws, (m) => m.type === 'joined', 4000, 'joined p' + (i + 1));
    assert.strictEqual(joined.code, created.code);
    assert.strictEqual(joined.reconnected, undefined);
    await waitFor(ws, stateWhere(), 4000, 'état p' + (i + 1));
    players.push({ ws, id: joined.playerId, token: joined.token, joined });
  }
  assert.notStrictEqual(players[0].id, players[1].id);

  const lobby = await waitFor(host, stateWhere((m) => m.phase === 'lobby' && m.players.length === 2), 5000, 'lobby 2 joueurs');
  assert.strictEqual(lobby.players.length, 2);
  assert.strictEqual(lobby.settings.duration, 30);
  console.log('  ✓ 2 joueurs dans le lobby');

  send(host, 'host:start');
  const buzz = await waitFor(host, stateWhere((m) => m.phase === 'buzz'), 5000, 'phase buzz');
  const q = QUESTIONS.find((item) => item.q === buzz.question.text);
  assert.ok(q, 'question diffusée présente dans la banque');
  assert.strictEqual(buzz.question.slots, q.answers.length);
  assert.strictEqual(buzz.board.length, 0, 'aucune réponse cachée dans le tableau');
  assert.strictEqual(buzz.question.answers, undefined, 'les réponses ne fuient jamais');
  assert.ok(buzz.phaseEnd > Date.now() + 5000);
  console.log('  ✓ manche 1 : ' + q.q);

  send(players[0].ws, 'player:buzz');
  const play = await waitFor(host, stateWhere((m) => m.phase === 'play'), 4000, 'phase play');
  assert.strictEqual(play.controller.id, players[0].id);
  const p1State = await waitFor(players[0].ws, stateWhere((m) => m.phase === 'play' && m.me));
  assert.strictEqual(p1State.me.isController, true);
  assert.strictEqual(p1State.canAnswer, true);
  const p2State = await waitFor(players[1].ws, stateWhere((m) => m.phase === 'play' && m.me));
  assert.strictEqual(p2State.me.isController, false);
  assert.strictEqual(p2State.canAnswer, false);
  console.log('  ✓ buzz prioritaire et droits de réponse');

  const firstGuess = q.answers[0].aliases[0];
  send(players[0].ws, 'player:guess', { text: firstGuess });
  const result = await waitFor(players[0].ws, eventNamed('result'), 3000, 'result found');
  assert.strictEqual(result.data.kind, 'found');
  assert.ok(result.data.pts > 0);
  let st = await waitFor(host, stateWhere((m) => m.board.length === 1), 3000, 'tableau 1 réponse');
  assert.strictEqual(st.board[0].i, 0);
  assert.ok(st.pot > 0);
  assert.strictEqual(st.board[0].by, 'Joueur 1');
  console.log('  ✓ réponse validée : ' + st.board[0].text + ' (+' + st.board[0].pts + ')');

  for (let i = 0; i < 2; i++) {
    await sleep(520);
    send(players[0].ws, 'player:guess', { text: 'zzz' + i });
    await waitFor(host, stateWhere((m) => m.strikes === i + 1), 3000, 'strike ' + (i + 1));
  }
  await sleep(520);
  send(players[0].ws, 'player:guess', { text: 'zzz2' });
  st = await waitFor(host, stateWhere((m) => m.phase === 'steal'), 4000, 'phase steal');
  assert.strictEqual(st.strikes, 3);
  assert.ok(st.wrongGuesses.length >= 3);
  console.log('  ✓ 3 erreurs → phase de vol');

  send(players[1].ws, 'player:buzz');
  st = await waitFor(host, stateWhere((m) => m.phase === 'steal' && m.stealer), 4000, 'stealer');
  assert.strictEqual(st.stealer.id, players[1].id);
  const stealState = await waitFor(players[1].ws, stateWhere((m) => m.me && m.me.isStealer), 3000, 'état stealer');
  assert.strictEqual(stealState.canAnswer, true);
  const potBefore = st.pot;

  send(players[1].ws, 'player:guess', { text: q.answers[1].aliases[0] });
  const stealResult = await waitFor(players[1].ws, eventNamed('result'), 3000, 'result steal');
  assert.strictEqual(stealResult.data.kind, 'steal');
  st = await waitFor(host, stateWhere((m) => m.phase === 'reveal'), 4000, 'reveal');
  assert.strictEqual(st.board.length, q.answers.length, 'toutes les réponses sont révélées');
  assert.ok(st.awards);
  assert.strictEqual(st.awards.winnerId, players[1].id);
  assert.strictEqual(st.awards.reason, 'steal');
  assert.ok(st.awards.amount >= potBefore, 'le voleur rafle au moins la cagnotte');
  assert.strictEqual(st.awards.amount, stealResult.data.pts);
  console.log('  ✓ vol réussi : ' + st.awards.amount + ' points');

  send(host, 'host:next');
  st = await waitFor(host, stateWhere((m) => m.phase === 'buzz' && m.qi === 1), 5000, 'manche 2');
  assert.strictEqual(st.qi, 1);
  assert.strictEqual(st.multiplier, 1);
  console.log('  ✓ passage à la manche 2');

  players[0].ws.close();
  await sleep(350);
  const p1 = client('joueur1-reconnexion');
  await open(p1);
  send(p1, 'player:join', { code: created.code, token: players[0].token, name: 'Joueur 1', avatar: AVATARS[0] });
  const rejoined = await waitFor(p1, (m) => m.type === 'joined', 4000, 'reconnexion');
  assert.strictEqual(rejoined.reconnected, true);
  assert.strictEqual(rejoined.playerId, players[0].id);
  await waitFor(p1, stateWhere((m) => m.me), 4000, 'état après reconnexion');
  console.log('  ✓ reconnexion par token');

  send(host, 'host:close');
  await sleep(300);
  players[1].ws.close();
  p1.close();
  host.close();

  assert.strictEqual(host.errors.length, 0);
  console.log('\n  ✓ test de bout en bout réussi\n');
}

run()
  .then(() => {
    if (server) server.kill('SIGTERM');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n  ✗ échec :', err && err.stack ? err.stack : err);
    if (server) server.kill('SIGTERM');
    process.exit(1);
  });
