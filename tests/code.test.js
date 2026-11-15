/* =====================================================================
   tests/code.test.js — code de salle, limite de tentatives, URL QR
   ===================================================================== */
'use strict';

const assert = require('assert');
const { spawn } = require('child_process');
const path = require('path');
const S = require('../server/index');

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ✓ ' + name);
  } catch (err) {
    console.error('  ✗ ' + name);
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  }
}

console.log('\nCREATOR · tests code de salle / sécurité\n');

test('alphabet : 5 caractères, sans I, L, O, 0, 1', () => {
  assert.strictEqual(S.CODE_LENGTH, 5);
  const confusants = ['I', 'L', 'O', '0', '1'];
  for (const c of confusants) {
    assert.ok(!S.CODE_ALPHABET.includes(c), 'caractère confus présent : ' + c);
  }
  let seen = new Set();
  for (let i = 0; i < 2000; i++) {
    const code = S.randomCode();
    assert.strictEqual(code.length, 5);
    assert.ok(/^[A-Z0-9]{5}$/.test(code), 'code invalide : ' + code);
    for (const ch of code) {
      assert.ok(S.CODE_ALPHABET.includes(ch), 'caractère hors alphabet : ' + ch);
    }
    seen.add(code);
  }
  assert.ok(seen.size > 1900, 'trop de collisions sur 2000 tirages : ' + seen.size);
});

test('limite de tentatives par IP (12/minute)', () => {
  const ip = '1.2.3.4';
  let limited = 0;
  for (let i = 0; i < 12; i++) {
    if (S.tooManyJoins(ip)) limited++;
  }
  assert.strictEqual(limited, 0, 'les 12 premières tentatives doivent passer');
  assert.ok(S.tooManyJoins(ip), 'la 13ème tentative doit être bloquée');
  assert.ok(S.tooManyJoins(ip), 'les suivantes restent bloquées');
  assert.ok(!S.tooManyJoins('5.6.7.8'), 'autre IP limitée à tort');
});

let server = null;
async function runHttp() {
  const PORT = 3400 + Math.floor(Math.random() * 900);
  server = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(PORT), PUBLIC_URL: 'https://quiz.creator.example' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  server.stdout.on('data', (d) => { logs += d.toString(); });
  server.stderr.on('data', (d) => { logs += d.toString(); });
  const base = 'http://127.0.0.1:' + PORT;
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 100));
    try {
      const res = await fetch(base + '/api/config');
      if (res.ok) {
        const cfg = await res.json();
        test('publicUrl : utilise PUBLIC_URL (jamais localhost)', () => {
          assert.strictEqual(cfg.publicUrl, 'https://quiz.creator.example');
          assert.ok(!cfg.publicUrl.includes('localhost'), 'publicUrl contient localhost');
        });
        return;
      }
    } catch (e) {}
  }
  throw new Error('config non joignable : ' + logs);
}

test('lanIp : une IP LAN détectée en local (pas de boucle)', () => {
  const ip = S.lanIp();
  assert.ok(ip, 'aucune IP LAN détectée');
  assert.ok(!/^(127\.|::1|localhost)$/.test(ip || ''), 'IP LAN en boucle : ' + ip);
});

runHttp()
  .then(() => {
    if (server) server.kill('SIGTERM');
    console.log('\n' + passed + ' tests réussis.\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n  ✗ échec :', err && err.stack ? err.stack : err);
    if (server) server.kill('SIGTERM');
    process.exit(1);
  });
