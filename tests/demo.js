'use strict';

const assert = require('assert');
const path = require('path');
const { spawn } = require('child_process');
const WebSocket = require('ws');

const ROOT = path.join(__dirname, '..');
const PORT = 6600 + Math.floor(Math.random() * 300);
const BASE = 'http://127.0.0.1:' + PORT;
const env = {
  ...process.env,
  PORT: String(PORT),
  PUBLIC_URL: BASE,
  QUIZ_TEST_MODE: '1',
  QUIZ_TEST_COUNTDOWN_MS: '20',
  QUIZ_TEST_QUESTION_MS: '50',
  QUIZ_TEST_REVEAL_MS: '20',
};

let server = null;
let logs = '';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function startServer() {
  server = spawn(process.execPath, [path.join(ROOT, 'server', 'index.js')], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', (d) => { logs += d.toString(); });
  server.stderr.on('data', (d) => { logs += d.toString(); });
  for (let i = 0; i < 80; i++) {
    await sleep(100);
    try { if ((await fetch(BASE + '/api/health')).ok) return; } catch (e) {}
  }
  throw new Error('serveur non démarré : ' + logs);
}

function connect() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://127.0.0.1:' + PORT + '/ws', { origin: BASE });
    ws.inbox = [];
    ws.on('message', (buf) => {
      try { ws.inbox.push(JSON.parse(buf.toString())); } catch (e) {}
    });
    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
  });
}
function send(ws, type, data) { ws.send(JSON.stringify(Object.assign({ type }, data || {}))); }
function waitFor(ws, predicate, timeout, label) {
  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      const idx = ws.inbox.findIndex(predicate);
      if (idx >= 0) {
        clearInterval(timer);
        clearTimeout(fail);
        resolve(ws.inbox.splice(idx, 1)[0]);
      }
    }, 10);
    const fail = setTimeout(() => {
      clearInterval(timer);
      reject(new Error('timeout ' + label));
    }, timeout);
  });
}

async function run() {
  await startServer();
  console.log('\nCREATOR · test d’isolation QUIZ_TEST_MODE\n');

  const host = await connect();
  send(host, 'host:create', { name: 'Démo', settings: { duration: 15, maxPlayers: 8 } });
  const created = await waitFor(host, (m) => m.type === 'host:created', 5000, 'host:created');
  console.log('  ✓ salle créée ' + created.code);

  const players = [];
  for (let i = 0; i < 2; i++) {
    const ws = await connect();
    send(ws, 'player:join', { code: created.code, name: 'Joueur ' + (i + 1) });
    await waitFor(ws, (m) => m.type === 'joined', 5000, 'joined ' + i);
    players.push(ws);
  }
  const lobby = await waitFor(host, (m) => m.type === 'state' && m.state.players.length === 2, 5000, 'lobby');
  assert.strictEqual(lobby.state.players.length, 2, 'aucun bot ajouté');
  console.log('  ✓ 2 joueurs réels, aucun bot');

  send(host, 'host:start');
  await waitFor(host, (m) => m.type === 'state' && m.state.phase === 'end', 20000, 'fin de partie');
  console.log('  ✓ partie QCM terminée');

  const lb = await (await fetch(BASE + '/api/leaderboard')).json();
  assert.strictEqual(lb.count, 0, 'leaderboard non pollué par les tests');
  console.log('  ✓ leaderboard local intact');

  send(host, 'host:close');
  await sleep(150);
  for (const ws of players) { try { ws.close(); } catch (e) {} }
  host.close();
  server.kill('SIGTERM');
  console.log('\n  ✓ test d’isolation réussi\n');
}

run()
  .then(() => { if (server) server.kill('SIGTERM'); setTimeout(() => process.exit(0), 150); })
  .catch((err) => {
    console.error('\n  ✗ échec isolation :', err && err.stack ? err.stack : err);
    console.error(logs.slice(-1200));
    if (server) server.kill('SIGTERM');
    setTimeout(() => process.exit(1), 150);
  });
