const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000';
const DIR = '/tmp/kilo/diag_final';
fs.mkdirSync(DIR, { recursive: true });

let failures = [];
function check(cond, msg) {
  if (!cond) failures.push(msg);
  console.log((cond ? '  ✓' : '  ✗') + ' ' + msg);
}

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-web-security'] });

  /* ============ 1. INTRO aux 7 instants ============ */
  console.log('\n=== INTRO 390x844 ===');
  const c1 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p1 = await c1.newPage();
  const errors = [];
  p1.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  p1.on('pageerror', e => errors.push(e.message));
  await p1.goto(BASE, { waitUntil: 'domcontentloaded' });
  await p1.waitForTimeout(100);
  await p1.screenshot({ path: path.join(DIR,'intro-390-t0.png'), fullPage: true });
  await p1.waitForTimeout(500);
  await p1.screenshot({ path: path.join(DIR,'intro-390-t600.png'), fullPage: true });
  await p1.waitForTimeout(1000);
  await p1.screenshot({ path: path.join(DIR,'intro-390-t1600.png'), fullPage: true });
  await p1.waitForTimeout(700);
  await p1.screenshot({ path: path.join(DIR,'intro-390-t2300.png'), fullPage: true });
  await p1.waitForTimeout(600);
  await p1.screenshot({ path: path.join(DIR,'intro-390-t2900.png'), fullPage: true });
  await p1.waitForTimeout(500);
  await p1.screenshot({ path: path.join(DIR,'intro-390-t3400.png'), fullPage: true });
  await p1.waitForTimeout(400);
  await p1.screenshot({ path: path.join(DIR,'intro-390-t3800.png'), fullPage: true });
  await p1.waitForTimeout(600);
  await p1.screenshot({ path: path.join(DIR,'intro-390-t4400.png'), fullPage: true });
  console.log('  erreurs console intro 390:', errors.length);
  errors.slice(0,5).forEach(e => console.log('   -', e));

  // Mesure positions des lettres et lampe à t=3800
  const introInfo = await p1.evaluate(() => {
    const intro = document.getElementById('intro');
    const letters = Array.from(intro ? intro.querySelectorAll('.letter') : []);
    const lamp = document.getElementById('introLamp');
    const tEl = letters[4];
    const data = { letters: [], lamp: null, introVisible: !!intro && intro.style.display !== 'none' && intro.style.opacity !== '0' };
    letters.forEach((l, i) => {
      const b = l.getBoundingClientRect();
      data.letters.push({ i, ch: l.textContent, w: Math.round(b.w), h: Math.round(b.h), x: Math.round(b.x), y: Math.round(b.y), opacity: getComputedStyle(l).opacity });
    });
    if (lamp) {
      const b = lamp.getBoundingClientRect();
      data.lamp = { w: Math.round(b.w), h: Math.round(b.h), x: Math.round(b.x), y: Math.round(b.y), transform: getComputedStyle(lamp).transform };
    }
    return data;
  });
  console.log('  intro info:', JSON.stringify(introInfo));
  // Vérifier T écrasé (h < 50% des autres)
  const hs = introInfo.letters.map(l => l.h);
  const others = hs.filter((_,i) => i !== 4);
  const avgOther = others.reduce((a,b)=>a+b,0)/others.length;
  const tCrushed = introInfo.letters[4] && introInfo.letters[4].h < avgOther * 0.5;
  check(tCrushed, 'T écrasé à t=3800 (h=' + introInfo.letters[4]?.h + ' vs moy ' + Math.round(avgOther) + ')');
  // Aucune lampe visible à t=600
  await c1.close();

  console.log('\n=== INTRO 1280x720 ===');
  const c2 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const p2 = await c2.newPage();
  const err2 = [];
  p2.on('console', m => { if (m.type() === 'error') err2.push(m.text()); });
  await p2.goto(BASE, { waitUntil: 'domcontentloaded' });
  await p2.waitForTimeout(3800);
  await p2.screenshot({ path: path.join(DIR,'intro-1280-t3800.png'), fullPage: true });
  const introInfo2 = await p2.evaluate(() => {
    const intro = document.getElementById('intro');
    const letters = Array.from(intro ? intro.querySelectorAll('.letter') : []);
    const lamp = document.getElementById('introLamp');
    const data = { letters: [], lamp: null };
    letters.forEach((l, i) => {
      const b = l.getBoundingClientRect();
      data.letters.push({ i, ch: l.textContent, w: Math.round(b.w), h: Math.round(b.h), x: Math.round(b.x) });
    });
    if (lamp) { const b = lamp.getBoundingClientRect(); data.lamp = { w: Math.round(b.w), h: Math.round(b.h), x: Math.round(b.x) }; }
    return data;
  });
  console.log('  intro 1280 info:', JSON.stringify(introInfo2));
  await c2.close();

  /* ============ 2. LOBBY ANIMATEUR ============ */
  console.log('\n=== LOBBY 1280x720 ===');
  const c3 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const p3 = await c3.newPage();
  const err3 = [];
  p3.on('console', m => { if (m.type() === 'error') err3.push(m.text()); });
  await p3.goto(BASE + '?host=1', { waitUntil: 'networkidle' });
  await p3.waitForTimeout(1500);
  await p3.screenshot({ path: path.join(DIR,'lobby-1280.png'), fullPage: true });
  const lobbyInfo = await p3.evaluate(() => {
    const modal = document.getElementById('hostLobby');
    const scene = document.getElementById('scene');
    const btnStart = document.getElementById('btnStart');
    const qr = document.getElementById('qrImg');
    const data = { modalHidden: modal.classList.contains('hidden'), btnStartVisible: !btnStart?.classList.contains('hidden') && !!btnStart, btnStartBox: null, sceneVisible: !scene.classList.contains('hidden'), qrBox: null };
    if (btnStart) { const b = btnStart.getBoundingClientRect(); data.btnStartBox = { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w), h: Math.round(b.h), bottom: Math.round(b.bottom) }; }
    if (qr) { const b = qr.getBoundingClientRect(); data.qrBox = { w: Math.round(b.w), h: Math.round(b.h) }; }
    // texte 3D chevauchement : vérifier positions des éléments UI
    const h1 = document.querySelector('.host-question');
    if (h1) { const b = h1.getBoundingClientRect(); data.questionBox = { y: Math.round(b.y), h: Math.round(b.h) }; }
    return data;
  });
  console.log('  lobby info:', JSON.stringify(lobbyInfo));
  check(lobbyInfo.btnStartBox && lobbyInfo.btnStartBox.bottom <= 720, 'bouton Lancer visible dans 720p (bottom=' + (lobbyInfo.btnStartBox?lobbyInfo.btnStartBox.bottom:'?') + ')');
  check(lobbyInfo.qrBox && lobbyInfo.qrBox.w >= 240, 'QR >= 240px en 720p (w=' + (lobbyInfo.qrBox?lobbyInfo.qrBox.w:'?') + ')');
  console.log('  erreurs console lobby:', err3.length);
  await c3.close();

  console.log('\n=== LOBBY 1920x1080 ===');
  const c4 = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const p4 = await c4.newPage();
  await p4.goto(BASE + '?host=1', { waitUntil: 'networkidle' });
  await p4.waitForTimeout(1500);
  await p4.screenshot({ path: path.join(DIR,'lobby-1920.png'), fullPage: true });
  await c4.close();

  /* ============ 3. MANCHE AVEC 3 JOUEURS ============ */
  console.log('\n=== MANCHE 3 JOUEURS ===');
  const ch = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const hp = await ch.newPage();
  await hp.goto(BASE + '?host=1', { waitUntil: 'networkidle' });
  await hp.waitForTimeout(1500);
  const code = await hp.evaluate(() => document.getElementById('lobbyCode')?.textContent);
  console.log('  code salle:', code);
  const players = [];
  for (let i = 0; i < 3; i++) {
    const cc = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const pg = await cc.newPage();
    await pg.goto(BASE + '/?room=' + code, { waitUntil: 'networkidle' });
    await pg.waitForTimeout(500);
    await pg.locator('#pseudo').fill('Joueur' + (i+1));
    await pg.locator('#btnJoin').click();
    await pg.waitForTimeout(800);
    players.push({ ctx: cc, page: pg });
  }
  await hp.waitForFunction(() => {
    const el = document.querySelector('#lobbyPlayers');
    return el && el.children.length >= 3;
  }, { timeout: 5000 }).catch(() => {});
  await hp.screenshot({ path: path.join(DIR,'manche-lobby-3j.png'), fullPage: true });
  // lancer partie
  await hp.locator('#btnStart').click();
  await hp.waitForTimeout(1500);
  await hp.screenshot({ path: path.join(DIR,'manche-debut.png'), fullPage: true });
  for (const pl of players) {
    await pl.page.waitForTimeout(800);
    await pl.page.screenshot({ path: path.join(DIR,'manche-joueur-' + (players.indexOf(pl)+1) + '.png'), fullPage: true });
  }
  await ch.close();
  for (const pl of players) await pl.ctx.close();

  /* ============ 4. DEMO ============ */
  console.log('\n=== DEMO ===');
  const c5 = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const p5 = await c5.newPage();
  const err5 = [];
  p5.on('console', m => { if (m.type() === 'error') err5.push(m.text()); });
  await p5.goto(BASE + '?demo=1', { waitUntil: 'networkidle' });
  await p5.waitForTimeout(3000);
  await p5.screenshot({ path: path.join(DIR,'demo-t3s.png'), fullPage: true });
  await p5.waitForTimeout(17000);
  await p5.screenshot({ path: path.join(DIR,'demo-t20s.png'), fullPage: true });
  const demoInfo = await p5.evaluate(() => {
    const btnDemo = document.querySelector('[id*="demo"], .btn-demo, #btnDemo');
    const banner = document.querySelector('.demo-banner, #demoBanner');
    return { btnDemo: !!btnDemo, banner: !!banner };
  });
  console.log('  demo info:', JSON.stringify(demoInfo));
  console.log('  erreurs console demo:', err5.length);
  await c5.close();

  await browser.close();
  console.log('\n=== RÉSUMÉ DIAGNOSTIC ===');
  console.log(failures.length === 0 ? 'AUCUN ÉCHEC' : failures.length + ' ÉCHEC(S):');
  failures.forEach(f => console.log('  -', f));
  process.exit(failures.length === 0 ? 0 : 1);
})();
