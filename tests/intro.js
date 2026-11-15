/* =====================================================================
   tests/intro.js — intro CREATOR : lampe visible, écrasement du T, fin
   Utilise ?introT= pour figer des instants exacts (déterministe).
   ===================================================================== */
'use strict';

const assert = require('assert');
const { spawn } = require('child_process');
const path = require('path');
const { chromium } = require('playwright');

const PORT = 5700 + Math.floor(Math.random() * 400);
const BASE = 'http://127.0.0.1:' + PORT;
let server = null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function freeze(page, sec) {
  await page.goto(BASE + '/?introT=' + sec, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#intro:not(.hidden)', { timeout: 8000 });
  await page.waitForFunction(() => window.IntroAnim && window.IntroAnim.layout, null, { timeout: 8000 });
  await sleep(150);
  return page.evaluate(() => {
    const r = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, right: b.right, bottom: b.bottom, w: b.width, h: b.height };
    };
    const word = r('#introWord');
    const t = r('#l-T');
    const lamp = r('#introLamp');
    return { word, t, lamp, vw: innerWidth, vh: innerHeight, tOpacity: getComputedStyle(document.querySelector('#l-T')).opacity };
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

  const browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  const a = await freeze(page, '2.0');
  assert.ok(a.lamp, 'lampe présente');
  assert.ok(a.lamp.w > 0 && a.lamp.h > 0, 'lampe mesurable');
  assert.ok(a.lamp.x >= -1 && a.lamp.right <= a.vw + 1, 'lampe entièrement à l’écran à 2,0 s (x=' + Math.round(a.lamp.x) + ', right=' + Math.round(a.lamp.right) + ')');
  assert.ok(a.lamp.x > a.word.right - 2, 'lampe à droite du mot à 2,0 s');
  console.log('  ✓ 2,0 s : lampe entièrement visible, à droite du mot');

  const b = await freeze(page, '3.3');
  assert.ok(b.lamp.x >= b.t.right - 2, 'lampe à droite du T à 3,3 s');
  assert.ok(b.lamp.right <= b.vw + 1, 'lampe encore à l’écran à 3,3 s');
  console.log('  ✓ 3,3 s : lampe à droite du T, dans l’écran');

  const c = await freeze(page, '3.8');
  assert.ok(c.t.h < a.t.h * 0.55, 'T écrasé à 3,8 s (h=' + Math.round(c.t.h) + ' vs ' + Math.round(a.t.h) + ')');
  console.log('  ✓ 3,8 s : T écrasé à moins de 55 % de sa hauteur');

  /* déroulé complet : l’intro doit disparaître avant 5,3 s */
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.IntroAnim && window.IntroAnim.isFinished(), null, { timeout: 8000 });
  await sleep(400);
  const gone = await page.evaluate(() => {
    const el = document.querySelector('#intro');
    return !el || el.classList.contains('hidden') || getComputedStyle(el).display === 'none';
  });
  assert.ok(gone, 'intro retirée après le storyboard');
  console.log('  ✓ fin : intro retirée proprement après ~5 s');

  for (const e of errors) assert.fail('erreur JS pendant l’intro : ' + e);

  await browser.close();
  server.kill('SIGTERM');
  console.log('\n4 tests intro réussis.\n');
}

main().catch((err) => {
  console.error('\n  ✗ échec intro :', err && err.stack ? err.stack : err);
  if (server) server.kill('SIGTERM');
  process.exit(1);
});
