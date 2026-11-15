/* =====================================================================
   tests/overlap.js — RÈGLE D'OR : aucun élément visible ne se chevauche
   (> 6×6 px) ni ne sort de l'écran, à toutes les phases et sur les
   résolutions de projection 1280×720, 1366×768 et 1920×1080.
   La scène Three.js est remplacée par un stub (pas de WebGL en CI).
   ===================================================================== */
'use strict';

const assert = require('assert');
const { spawn } = require('child_process');
const path = require('path');
const { chromium } = require('playwright');
const WebSocket = require('ws');

const PORT = 5100 + Math.floor(Math.random() * 500);
const BASE = 'http://127.0.0.1:' + PORT;
const VIEWPORTS = [
  { width: 1280, height: 720, name: '1280×720' },
  { width: 1366, height: 768, name: '1366×768' },
  { width: 1920, height: 1080, name: '1920×1080' },
];
const TOL = 6;

let server = null;

function connect() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://127.0.0.1:' + PORT + '/ws', { origin: BASE });
    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
  });
}
function send(ws, obj) { ws.send(JSON.stringify(obj)); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function onMsg(ws, fn) {
  ws.on('message', (buf) => {
    let m; try { m = JSON.parse(buf); } catch (e) { return; }
    fn(m);
  });
}

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
      hair: '#' + (110000 + n * 1117).toString(16).slice(0, 6).padStart(6, '0'),
      jacket: '#' + (220000 + n * 2131).toString(16).slice(0, 6).padStart(6, '0'),
      shirt: '#' + (330000 + n * 3137).toString(16).slice(0, 6).padStart(6, '0'),
      pants: '#' + (440000 + n * 4139).toString(16).slice(0, 6).padStart(6, '0'),
      shoes: '#' + (550000 + n * 5147).toString(16).slice(0, 6).padStart(6, '0'),
    },
  };
}

const SCENE_STUB = `
window.Scene3D = {
  ready: true,
  init: function () { return true; },
  setRound: function () {},
  setPlayers: function () {},
  react: function () {},
  crowdReact: function () {},
  celebrate: function () {},
  reset: function () {},
};
`;

async function measure(page) {
  return page.evaluate(() => {
    const SELS = {
      top: '.host-top',
      banner: '.host-banner',
      board: '#board',
      strikes: '#hostStrikes',
      lower: '.host-lower',
      scoreboard: '#hostScoreboard',
      timer: '#hostTimerWrap',
      controls: '.host-controls',
      wrong: '#hostWrong',
      lobby: '#hostLobby',
      reopen: '#btnLobbyOpen',
      countdown: '#hostCountdown',
    };
    function visible(el) {
      if (!el) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }
    const vw = innerWidth, vh = innerHeight;
    const items = [];
    for (const [key, sel] of Object.entries(SELS)) {
      const el = document.querySelector(sel);
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      items.push({
        key, x: r.x, y: r.y, w: r.width, h: r.height,
        right: r.right, bottom: r.bottom,
        off: r.x < -1 || r.y < -1 || r.right > vw + 1 || r.bottom > vh + 1,
      });
    }
    const overlaps = [];
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i], b = items[j];
        /* un élément parent ne peut pas « chevaucher » son enfant */
        const ea = document.querySelector(Object.entries(SELS).find(([k]) => k === a.key)[1]);
        const eb = document.querySelector(Object.entries(SELS).find(([k]) => k === b.key)[1]);
        if (ea.contains(eb) || eb.contains(ea)) continue;
        /* le décompte 3-2-1 est une surcouche plein écran assumée */
        if (a.key === 'countdown' || b.key === 'countdown') continue;
        const w = Math.min(a.right, b.right) - Math.max(a.x, b.x);
        const h = Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y);
        if (w > 6 && h > 6) overlaps.push([a.key, b.key, Math.round(w) + '×' + Math.round(h)]);
      }
    }
    return {
      vw, vh,
      items,
      overlaps,
      offscreen: items.filter((i) => i.off).map((i) => i.key),
      timer: (document.querySelector('#hostTimer') || {}).textContent,
      boardRatio: (() => {
        const b = document.querySelector('#board');
        if (!visible(b)) return 0;
        return b.getBoundingClientRect().height / vh;
      })(),
      questionLines: (() => {
        const q = document.querySelector('#hostQuestion');
        if (!q) return 0;
        const cs = getComputedStyle(q);
        const lh = parseFloat(cs.lineHeight) || (parseFloat(cs.fontSize) * 1.2);
        return Math.round(q.scrollHeight / lh);
      })(),
      scoreboardH: (() => {
        const el = document.querySelector('#hostScoreboard');
        return visible(el) ? el.getBoundingClientRect().height : 0;
      })(),
      strikeOn: document.querySelectorAll('#hostStrikes .strike-x.on').length,
      wrongVisible: (() => {
        const el = document.querySelector('#hostWrong');
        return visible(el);
      })(),
      labels: [
        (document.querySelector('#hostRound') || {}).textContent || '',
        (document.querySelector('#hostPhase') || {}).textContent || '',
        (document.querySelector('#hostQuestion') || {}).textContent || '',
      ].join(' | '),
      phase: (window.__CREATOR_APP__ && window.__CREATOR_APP__.state && window.__CREATOR_APP__.state.phase) || 'unknown',
    };
  });
}

function check(phase, vp, m, failures) {
  for (const [a, b, size] of m.overlaps) {
    failures.push(phase + ' @ ' + vp.name + ' : chevauchement ' + a + ' × ' + b + ' (' + size + ')');
  }
  for (const k of m.offscreen) {
    failures.push(phase + ' @ ' + vp.name + ' : ' + k + ' hors écran');
  }
  if (m.timer === '--') {
    failures.push(phase + ' @ ' + vp.name + ' : chrono affiché « -- »');
  }
  if (m.boardRatio > 0.37) {
    failures.push(phase + ' @ ' + vp.name + ' : tableau trop haut (' + Math.round(m.boardRatio * 100) + '% > 36%)');
  }
  if (m.questionLines > 2) {
    failures.push(phase + ' @ ' + vp.name + ' : question sur ' + m.questionLines + ' lignes (> 2)');
  }
  if (/COUNTDOWN|LOBBY|BUZZ|STEAL|REVEAL|PLAY/i.test(m.labels)) {
    failures.push(phase + ' @ ' + vp.name + ' : libellé non traduit « ' + m.labels + ' »');
  }
  if (phase !== 'lobby' && phase !== 'end' && m.scoreboardH > 74) {
    failures.push(phase + ' @ ' + vp.name + ' : classement sur plusieurs lignes (' + Math.round(m.scoreboardH) + 'px)');
  }
}

async function setPhase(page, expected) {
  const start = Date.now();
  while (Date.now() - start < 8000) {
    const st = await page.evaluate(() => window.__CREATOR_APP__ && window.__CREATOR_APP__.state && window.__CREATOR_APP__.state.phase);
    if (st === expected) return true;
    await sleep(80);
  }
  return false;
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

  const browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
  const ctx = await browser.newContext({ viewport: VIEWPORTS[0] });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('gtq.intro.seen', '1'); } catch (e) {} });
  await ctx.route('**/js/scene.js', (route) => route.fulfill({ contentType: 'application/javascript', body: SCENE_STUB }));
  await ctx.route('**/assets/vendor/three.min.js', (route) => route.fulfill({ contentType: 'application/javascript', body: '' }));

  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror : ' + e.message));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push('console : ' + msg.text()); });

  await page.goto(BASE + '/?host=1', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#hostView:not(.hidden)', { timeout: 8000 });
  await page.waitForFunction(() => window.__CREATOR_APP__ && window.__CREATOR_APP__.code, null, { timeout: 8000 });
  const allQuestions = require('../server/questions.json');
  await page.evaluate((qs) => { window.__QUESTIONS__ = qs; }, allQuestions);
  const code = await page.evaluate(() => window.__CREATOR_APP__.code);

  /* 6 joueurs, avatars distincts */
  const players = [];
  for (let i = 0; i < 6; i++) {
    const ws = await connect();
    players.push(ws);
    send(ws, { type: 'player:join', code, name: 'Joueur ' + (i + 1), avatar: avatar(i) });
  }
  await sleep(600);

  const failures = [];
  async function record(phase, frozen) {
    if (frozen) await page.evaluate(() => window.Net.send('host:pause', { paused: true }));
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await sleep(220);
      const m = await measure(page);
      if (m.phase !== phase) {
        failures.push(phase + ' @ ' + vp.name + ' : phase inattendue ' + m.phase);
      }
      check(phase, vp, m, failures);
    }
    if (frozen) await page.evaluate(() => window.Net.send('host:pause', { paused: false }));
  }

  async function findCorrect() {
    return page.evaluate(() => {
      const st = window.__CREATOR_APP__.state;
      const taken = new Set((st.board || []).map((b) => b.text));
      return (window.__QUESTIONS__ || []).find((q) => q.q === (st.question && st.question.text)) &&
        (window.__QUESTIONS__ || []).find((q) => q.q === (st.question && st.question.text)).answers
          .find((a) => !taken.has(a.text));
    });
  }

  await record('lobby', false);

  await page.evaluate(() => window.Net.send('host:start'));
  await setPhase(page, 'countdown');
  await record('countdown', false);

  /* buzz pendant le décompte → passe directement en jeu */
  send(players[0], { type: 'player:buzz' });
  await setPhase(page, 'play');
  await record('play', true);

  /* une bonne réponse (cagnotte > 0) puis 3 mauvaises → vol */
  const correct = await findCorrect();
  if (correct) send(players[0], { type: 'player:guess', text: correct.text });
  await sleep(520);
  for (let i = 0; i < 3; i++) {
    send(players[0], { type: 'player:guess', text: 'mauvaise réponse ' + i });
    await sleep(520);
  }
  await setPhase(page, 'steal');

  send(players[1], { type: 'player:buzz' });
  await sleep(200);
  await record('steal', true);

  const stealCorrect = await findCorrect();
  if (stealCorrect) send(players[1], { type: 'player:guess', text: stealCorrect.text });
  await setPhase(page, 'reveal');
  await record('reveal', true);

  /* remise à zéro de manche : nouvelle manche propre */
  await page.evaluate(() => window.Net.send('host:next'));
  await setPhase(page, 'countdown');
  const reset = await page.evaluate(() => ({
    strikes: document.querySelectorAll('#hostStrikes .strike-x.on').length,
    wrongHidden: document.querySelector('#hostWrong').classList.contains('hidden'),
    revealed: document.querySelectorAll('#board .board-card.revealed').length,
  }));
  if (reset.strikes !== 0) failures.push('reset : croix encore allumées (' + reset.strikes + ')');
  if (!reset.wrongHidden) failures.push('reset : bandeau des fausses réponses encore visible');
  if (reset.revealed !== 0) failures.push('reset : tableau encore révélé (' + reset.revealed + ')');

  /* avance rapidement jusqu'à la fin : buzz immédiat puis révélation */
  for (let round = 0; round < 14; round++) {
    const st = await page.evaluate(() => window.__CREATOR_APP__.state.phase);
    if (st === 'end') break;
    if (st === 'countdown') {
      send(players[0], { type: 'player:buzz' });
      await setPhase(page, 'play');
    }
    await page.evaluate(() => window.Net.send('host:reveal'));
    await sleep(150);
    await page.evaluate(() => window.Net.send('host:next'));
    await sleep(180);
  }
  await setPhase(page, 'end');
  await record('end', false);

  /* erreurs JS / 404 */
  for (const e of errors) failures.push(e);

  for (const p of players) { try { p.close(); } catch (e) {} }
  await browser.close();
  server.kill('SIGTERM');

  if (failures.length) {
    console.error('\n  ✗ RÈGLE D\'OR : ' + failures.length + ' problème(s)\n');
    for (const f of failures) console.error('   - ' + f);
    console.error('');
    process.exit(1);
  }
  console.log('\n  ✓ RÈGLE D\'OR : aucun chevauchement (>6×6) ni débordement, toutes phases, 3 résolutions.\n');
}

main().catch(async (err) => {
  console.error('\n  ✗ échec du test :', err && err.stack ? err.stack : err);
  if (server) server.kill('SIGTERM');
  process.exit(1);
});
