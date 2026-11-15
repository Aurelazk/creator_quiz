/* =====================================================================
   tests/demo.js — mode démo côté serveur : 8 bots, partie isolée
   ===================================================================== */
'use strict';

const assert = require('assert');
const { spawn } = require('child_process');
const path = require('path');
const WebSocket = require('ws');

const PORT = 6200 + Math.floor(Math.random() * 400);
const BASE = 'http://127.0.0.1:' + PORT;
let server = null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function connect() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://127.0.0.1:' + PORT + '/ws', { origin: BASE });
    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
  });
}
const send = (ws, o) => ws.send(JSON.stringify(o));
function once(ws, type) {
  return new Promise((resolve, reject) => {
    const to = setTimeout(() => reject(new Error('timeout ' + type)), 5000);
    ws.on('message', (b) => {
      let m; try { m = JSON.parse(b); } catch (e) { return; }
      if (m.type !== type) return;
      clearTimeout(to); resolve(m);
    });
  });
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
    await sleep(100);
    try { const r = await fetch(BASE + '/api/health'); if (r.ok) break; } catch (e) {}
  }

  const host = await connect();
  send(host, { type: 'host:create', name: 'Démo', demo: true, settings: { duration: 30, maxPlayers: 20 } });
  const created = await once(host, 'host:created');
  assert.strictEqual(created.demo, true, 'salle identifiée comme démo');
  console.log('  ✓ salle de démo créée côté serveur');

  let maxPlayers = 0;
  let phases = new Set();
  host.on('message', (b) => {
    let m; try { m = JSON.parse(b); } catch (e) { return; }
    if (m.type !== 'state') return;
    maxPlayers = Math.max(maxPlayers, (m.players || []).length);
    phases.add(m.phase);
  });

  await sleep(4500);
  assert.strictEqual(maxPlayers, 8, '8 bots jouent (reçu ' + maxPlayers + ')');
  assert.ok(phases.has('play') || phases.has('countdown') || phases.has('buzz'), 'la partie démarre toute seule');
  console.log('  ✓ 8 bots présents, la partie démarre automatiquement');

  const health = await (await fetch(BASE + '/api/health')).json();
  assert.strictEqual(health.demos, 1, 'démo comptée séparément dans /api/health');
  console.log('  ✓ démo isolée des salles réelles dans /api/health');

  const intruder = await connect();
  send(intruder, { type: 'player:join', code: created.code, name: 'Intrus', avatar: {
    silhouette: 'masc', hair: 'short', outfit: 'jacket', accessory: 'none',
    colors: { hair: '#111111', jacket: '#222222', shirt: '#333333', pants: '#444444', shoes: '#555555' },
  } });
  const err = await once(intruder, 'error');
  assert.strictEqual(err.code, 'demo', 'un joueur réel ne peut pas rejoindre la démo');
  console.log('  ✓ joueur réel refusé (code demo)');

  host.close();
  await sleep(400);
  const after = await (await fetch(BASE + '/api/health')).json();
  assert.strictEqual(after.demos, 0, 'démo fermée quand l’animateur quitte');
  console.log('  ✓ démo fermée à la déconnexion de l’hôte');

  intruder.close();
  server.kill('SIGTERM');
  console.log('\n4 tests démo réussis.\n');
}

main().catch((err) => {
  console.error('\n  ✗ échec démo :', err && err.stack ? err.stack : err);
  if (server) server.kill('SIGTERM');
  process.exit(1);
});
