/* =====================================================================
   tests/join.test.js — 20 joueurs derrière la même IP puis reconnexions
   Vérifie que seuls les ÉCHECS sont limités (jamais les arrivées valides).
   ===================================================================== */
'use strict';

const assert = require('assert');
const { spawn } = require('child_process');
const path = require('path');
const WebSocket = require('ws');

const PORT = 4300 + Math.floor(Math.random() * 400);
const BASE = 'http://127.0.0.1:' + PORT;
let server = null;

function connect() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://127.0.0.1:' + PORT + '/ws', { origin: BASE });
    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
  });
}
function once(ws, type) {
  return new Promise((resolve, reject) => {
    const to = setTimeout(() => reject(new Error('timeout ' + type)), 4000);
    function onMsg(buf) {
      let m;
      try { m = JSON.parse(buf); } catch (e) { return; }
      if (m.type !== type) return;
      clearTimeout(to);
      ws.off('message', onMsg);
      resolve(m);
    }
    ws.on('message', onMsg);
  });
}
function send(ws, obj) { ws.send(JSON.stringify(obj)); }

const HAIRS = ['short', 'curly', 'afro', 'braids', 'ponytail', 'bald', 'cap'];
const OUTFITS = ['jacket', 'hoodie', 'dress', 'tee'];
function avatar(i) {
  const n = i + 1;
  return {
    silhouette: ['masc', 'fem', 'neutral'][i % 3],
    hair: HAIRS[i % HAIRS.length],
    outfit: OUTFITS[i % OUTFITS.length],
    accessory: ['none', 'glasses', 'headphones', 'beanie', 'backpack'][i % 5],
    colors: {
      hair: '#' + (100000 + n * 1013).toString(16).slice(0, 6).padStart(6, '0'),
      jacket: '#' + (200000 + n * 2027).toString(16).slice(0, 6).padStart(6, '0'),
      shirt: '#' + (300000 + n * 3041).toString(16).slice(0, 6).padStart(6, '0'),
      pants: '#' + (400000 + n * 4057).toString(16).slice(0, 6).padStart(6, '0'),
      shoes: '#' + (500000 + n * 5077).toString(16).slice(0, 6).padStart(6, '0'),
    },
  };
}

async function main() {
  server = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(PORT), PUBLIC_URL: BASE },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  server.stdout.on('data', (d) => { logs += d.toString(); });
  server.stderr.on('data', (d) => { logs += d.toString(); });
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 100));
    try { const r = await fetch(BASE + '/api/health'); if (r.ok) break; } catch (e) {}
  }

  const host = await connect();
  send(host, { type: 'host:create', name: 'Prof', settings: { maxPlayers: 20, duration: 60 } });
  const created = await once(host, 'host:created');
  assert.ok(created.code, 'salle créée');

  const sockets = [];
  const tokens = [];
  for (let i = 0; i < 20; i++) {
    const ws = await connect();
    sockets.push(ws);
    send(ws, { type: 'player:join', code: created.code, name: 'Eleve ' + i, avatar: avatar(i) });
    const joined = await once(ws, 'joined');
    assert.ok(joined.playerId, 'joueur ' + i + ' accepté');
    tokens.push(joined.token);
  }
  console.log('  ✓ 20 élèves derrière la même IP acceptés sans rate-limit');

  /* 21e : la salle est pleine, PAS une limite de débit */
  const extra = await connect();
  send(extra, { type: 'player:join', code: created.code, name: 'Trop', avatar: avatar(99) });
  const fullErr = await once(extra, 'error');
  assert.strictEqual(fullErr.code, 'full', 'la 21e doit être refusée pour salle pleine');
  extra.close();
  console.log('  ✓ 21e refusé pour salle pleine, pas pour débit');

  /* reconnexions valides toujours acceptées, même après l'échec */
  const reconnect = await connect();
  send(reconnect, {
    type: 'player:join', code: created.code, name: 'Eleve 0',
    avatar: avatar(0), token: tokens[0],
  });
  const rejoined = await once(reconnect, 'joined');
  assert.strictEqual(rejoined.reconnected, true, 'reconnexion acceptée');
  console.log('  ✓ reconnexion valide acceptée après un échec');

  for (const ws of sockets) { try { ws.close(); } catch (e) {} }
  try { reconnect.close(); } catch (e) {}
  try { host.close(); } catch (e) {}
  await new Promise((r) => setTimeout(r, 200));
  server.kill('SIGTERM');
  console.log('\n3 tests de jonction réussis.\n');
}

main().catch((err) => {
  console.error('\n  ✗ échec :', err && err.stack ? err.stack : err);
  if (server) server.kill('SIGTERM');
  process.exit(1);
});
