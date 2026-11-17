'use strict';

const assert = require('assert');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const WebSocket = require('ws');

const ROOT = path.join(__dirname, '..');
const PORT = 5600 + Math.floor(Math.random() * 400);
const BASE = 'http://127.0.0.1:' + PORT;
const QUESTIONS = require('../server/questions.json');
const VIEWPORTS = [
  { width: 1280, height: 720, name: '1280×720' },
  { width: 1366, height: 768, name: '1366×768' },
  { width: 1920, height: 1080, name: '1920×1080' },
];
const SELECTORS = {
  top: '.host-top',
  banner: '.host-banner',
  options: '#hostOptions',
  answers: '#hostAnswers',
  reveal: '#hostReveal',
  board: '#board',
  scoreboard: '#hostScoreboard',
  timer: '#hostTimerWrap',
  controls: '.host-controls',
  lobby: '#hostLobby',
  countdown: '#hostCountdown',
};
const SCENE_STUB = 'window.Scene3D={ready:true,init:function(){return true;},setRound:function(){},setPlayers:function(){},react:function(){},crowdReact:function(){},celebrate:function(){},reset:function(){},result:function(){}};';

let server = null;
let logs = '';
const failures = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function startServer() {
  server = spawn(process.execPath, [path.join(ROOT, 'server', 'index.js')], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT), PUBLIC_URL: BASE, QUIZ_TEST_MODE: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
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
    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
  });
}
function send(ws, type, data) { ws.send(JSON.stringify(Object.assign({ type }, data || {}))); }

async function measure(page) {
  return page.evaluate((sels) => {
    const visible = (el) => {
      if (!el) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const vw = innerWidth;
    const vh = innerHeight;
    const items = [];
    for (const [key, sel] of Object.entries(sels)) {
      const el = document.querySelector(sel);
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      items.push({ key, el, x: r.x, y: r.y, right: r.right, bottom: r.bottom, w: r.width, h: r.height });
    }
    const overlaps = [];
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        if (a.key === 'lobby' || b.key === 'lobby' || a.key === 'countdown' || b.key === 'countdown') continue;
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        const w = Math.min(a.right, b.right) - Math.max(a.x, b.x);
        const h = Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y);
        if (w > 6 && h > 6) overlaps.push(a.key + ' × ' + b.key + ' (' + Math.round(w) + '×' + Math.round(h) + ')');
      }
    }
    return {
      vw,
      vh,
      offscreen: items.filter((i) => i.key !== 'lobby' && (i.x < -1 || i.y < -1 || i.right > vw + 1 || i.bottom > vh + 1)).map((i) => i.key),
      overlaps,
      labels: ['.host-top', '.host-banner', '.host-controls'].map((sel) => (document.querySelector(sel) || {}).textContent || '').join(' | '),
      phase: (window.App && window.App.state && window.App.state.phase) || 'unknown',
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
    };
  }, SELECTORS);
}

async function setPhase(page, expected, timeout) {
  await page.waitForFunction((phase) => window.App && window.App.state && window.App.state.phase === phase, expected, { timeout: timeout || 10000 });
}

async function record(page, phase, label) {
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await sleep(250);
    const m = await measure(page);
    if (m.phase !== phase) failures.push(label + ' @ ' + vp.name + ' : phase ' + m.phase + ' au lieu de ' + phase);
    for (const o of m.overlaps) failures.push(label + ' @ ' + vp.name + ' : chevauchement ' + o);
    for (const k of m.offscreen) failures.push(label + ' @ ' + vp.name + ' : ' + k + ' hors écran');
    if (m.scrollWidth > m.vw + 1) failures.push(label + ' @ ' + vp.name + ' : scroll horizontal');
    if (m.scrollHeight > m.vh + 1) failures.push(label + ' @ ' + vp.name + ' : scroll vertical');
    if (/buzz|steal|strikes?|sondage/i.test(m.labels)) failures.push(label + ' @ ' + vp.name + ' : ancien libellé dans ' + m.labels);
  }
}

async function run() {
  await startServer();
  console.log('\nCREATOR · règle d’or QCM (1920×1080 + projecteurs)\n');

  const browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
  const ctx = await browser.newContext({ viewport: VIEWPORTS[2], serviceWorkers: 'block' });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('gtq.intro.seen', '1'); } catch (e) {} });
  await ctx.route('**/js/scene.js', (route) => route.fulfill({ contentType: 'application/javascript', body: SCENE_STUB }));
  await ctx.route('**/assets/vendor/three.min.js', (route) => route.fulfill({ contentType: 'application/javascript', body: '' }));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror : ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console : ' + m.text()); });

  await page.goto(BASE + '/?host=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.App && window.App.code, null, { timeout: 10000 });
  const code = await page.evaluate(() => window.App.code);

  const players = [];
  for (let i = 0; i < 3; i++) {
    const ws = await connect();
    send(ws, 'player:join', { code, name: 'Joueur ' + (i + 1) });
    players.push(ws);
  }
  await page.waitForFunction(() => window.App && window.App.state && window.App.state.players.length === 3, null, { timeout: 8000 });
  await record(page, 'lobby', 'lobby');

  await page.evaluate(() => window.Net.send('host:start'));
  await setPhase(page, 'question', 10000);
  await record(page, 'question', 'question');

  const questionText = await page.evaluate(() => window.App.state.question.text);
  const question = QUESTIONS.find((q) => q.q === questionText);
  assert.ok(question, 'question de la banque introuvable');
  send(players[0], 'player:answer', { optionIdx: question.correctIndex });
  await setPhase(page, 'reveal', 6000);
  await record(page, 'reveal', 'révélation');

  for (let i = 0; i < 9; i++) {
    await page.evaluate(() => window.Net.send('host:next'));
    await setPhase(page, 'question', 10000);
    await page.evaluate(() => window.Net.send('host:reveal'));
    await setPhase(page, 'reveal', 6000);
  }
  await setPhase(page, 'end', 10000);
  await record(page, 'end', 'fin');

  for (const e of errors) failures.push(e);
  for (const ws of players) { try { ws.close(); } catch (e) {} }
  await browser.close();
  server.kill('SIGTERM');

  if (failures.length) {
    console.error('\n  ✗ règle d’or : ' + failures.length + ' problème(s)\n');
    for (const f of failures) console.error('   - ' + f);
    console.error('');
    process.exit(1);
  }
  console.log('\n  ✓ règle d’or : aucun chevauchement ni débordement, toutes phases, 3 résolutions.\n');
}

run()
  .then(() => { if (server) server.kill('SIGTERM'); setTimeout(() => process.exit(0), 150); })
  .catch((err) => {
    console.error('\n  ✗ échec règle d’or :', err && err.stack ? err.stack : err);
    console.error(logs.slice(-1200));
    if (server) server.kill('SIGTERM');
    setTimeout(() => process.exit(1), 150);
  });
