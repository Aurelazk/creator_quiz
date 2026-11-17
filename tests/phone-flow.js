'use strict';

const assert = require('assert');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const PORT = 7500 + Math.floor(Math.random() * 400);
const BASE = 'http://127.0.0.1:' + PORT;
const env = {
  ...process.env,
  PORT: String(PORT),
  PUBLIC_URL: BASE,
  QUIZ_TEST_MODE: '1',
  QUIZ_TEST_COUNTDOWN_MS: '40',
  QUIZ_TEST_REVEAL_MS: '40',
  QUIZ_TEST_QUESTION_MS: '20000',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let server = null;
let logs = '';

async function startServer() {
  server = spawn(process.execPath, [path.join(ROOT, 'server', 'index.js')], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', (d) => { logs += d.toString(); });
  server.stderr.on('data', (d) => { logs += d.toString(); });
  for (let i = 0; i < 80; i++) {
    await sleep(100);
    try {
      const res = await fetch(BASE + '/api/health');
      if (res.ok) return;
    } catch (e) {}
  }
  throw new Error('serveur non démarré : ' + logs);
}

async function ready(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.IntroAnim && window.IntroAnim.isFinished(), null, { timeout: 20000 });
  await page.waitForFunction(() => window.Net && window.Net.connected, null, { timeout: 20000 });
}

async function run() {
  await startServer();
  console.log('\nCREATOR · test du parcours téléphone de bout en bout\n');

  const browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
  try {
    const hostCtx = await browser.newContext({ viewport: { width: 1280, height: 720 }, serviceWorkers: 'block' });
    const phoneCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    for (const ctx of [hostCtx, phoneCtx]) {
      await ctx.addInitScript(() => { try { sessionStorage.setItem('gtq.intro.seen', '1'); } catch (e) {} });
    }
    const host = await hostCtx.newPage();
    const phone = await phoneCtx.newPage();
    const errors = [];
    for (const [label, page] of [['host', host], ['phone', phone]]) {
      page.on('pageerror', (e) => errors.push(label + ': ' + e.message));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(label + ': ' + m.text()); });
    }

    await ready(host, BASE);
    await host.click('#btnCreate');
    await host.waitForFunction(() => /^[A-Z2-9]{5}$/.test((document.querySelector('#lobbyCode') || {}).textContent || ''), null, { timeout: 10000 });
    const code = (await host.textContent('#lobbyCode')).trim();
    console.log('  ✓ salle créée : ' + code);

    await ready(phone, BASE + '/?room=' + code);
    await phone.fill('#pseudo', 'Test Telephone');
    await phone.click('#btnJoin');
    await phone.waitForSelector('#pLobby:not(.hidden)', { timeout: 10000 });
    assert.strictEqual(await phone.evaluate(() => window.App.role), 'player');
    console.log('  ✓ joueur connecté avec le rôle player');

    await phone.waitForFunction(() => document.querySelectorAll('#pLobbyList .lobby-player').length === 1, null, { timeout: 5000 });
    await host.waitForFunction(() => document.querySelectorAll('#lobbyPlayers .player-chip').length === 1, null, { timeout: 5000 });
    console.log('  ✓ joueur affiché une seule fois des deux côtés');

    await host.evaluate(() => window.Net.send('host:start'));
    await phone.waitForSelector('#pGame:not(.hidden)', { timeout: 10000 });
    await phone.waitForFunction(() => (document.querySelector('#pQuestion') || {}).textContent.trim().length > 3, null, { timeout: 10000 });
    const q = await phone.evaluate(() => ({
      phase: window.App.state.phase,
      text: document.querySelector('#pQuestion').innerText.trim(),
      options: [...document.querySelectorAll('#pQcmOptions .qcm-option:not(.hidden)')].filter((b) => !b.disabled).length,
    }));
    assert.strictEqual(q.phase, 'question');
    assert.strictEqual(q.options, 4);
    console.log('  ✓ question visible sur le téléphone : ' + q.text.split('\n').pop().slice(0, 60));
    console.log('  ✓ 4 réponses cliquables');

    await phone.click('#optA');
    await phone.waitForFunction(() => window.App.state.me && window.App.state.me.answered, null, { timeout: 10000 });
    console.log('  ✓ réponse envoyée depuis le téléphone');

    assert.deepStrictEqual(errors, []);
    console.log('  ✓ aucune erreur console');
    console.log('\n  ✓ parcours téléphone réussi\n');
  } finally {
    await browser.close();
    if (server) server.kill('SIGTERM');
  }
}

run().catch((e) => {
  console.error(e);
  if (server) server.kill('SIGTERM');
  process.exit(1);
});
