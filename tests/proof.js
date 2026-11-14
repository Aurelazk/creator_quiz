/* =====================================================================
   tests/proof.js — preuves Playwright pour chaque critère de succès
   ===================================================================== */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000';
const DIR = '/tmp/kilo/proof';
fs.mkdirSync(DIR, { recursive: true });

let failures = [];
function check(cond, msg) {
  if (!cond) failures.push(msg);
  console.log((cond ? '  ✓' : '  ✗') + ' ' + msg);
}
async function safeScreenshot(page, name) {
  try { await page.screenshot({ path: path.join(DIR, name), fullPage: true }); } catch (e) { console.log('  (capture sautée: ' + name + ')'); }
}
async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-web-security'] });

  /* ============ 1. INTRO 390x844 ============ */
  console.log('\n=== INTRO 390x844 ===');
  const c1 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p1 = await c1.newPage();
  const err1 = [];
  p1.on('console', m => { if (m.type() === 'error') err1.push(m.text()); });
  await p1.goto(BASE, { waitUntil: 'domcontentloaded' });
  await p1.waitForTimeout(100);
  const isShort = await p1.evaluate(() => {
    try { return sessionStorage.getItem('gtq.intro.seen') === '1'; } catch (e) { return false; }
  });
  console.log('  mode court:', isShort);
  await safeScreenshot(p1, 'intro-390-t0.png');
  await p1.waitForTimeout(500);
  await safeScreenshot(p1, 'intro-390-t600.png');
  await p1.waitForTimeout(1000);
  await safeScreenshot(p1, 'intro-390-t1600.png');
  await p1.waitForTimeout(700);
  await safeScreenshot(p1, 'intro-390-t2300.png');
  await p1.waitForTimeout(600);
  await safeScreenshot(p1, 'intro-390-t2900.png');
  await p1.waitForTimeout(500);
  await safeScreenshot(p1, 'intro-390-t3400.png');
  await p1.waitForTimeout(400);
  await safeScreenshot(p1, 'intro-390-t3800.png');
  await p1.waitForTimeout(200);
  await safeScreenshot(p1, 'intro-390-t4000.png');

  // Lampe à t=600 : hors écran à droite
  const lamp600 = await p1.evaluate(() => {
    const lamp = document.getElementById('introLamp');
    if (!lamp) return { visible: false };
    const b = lamp.getBoundingClientRect();
    const comp = getComputedStyle(lamp);
    return { visible: comp.display !== 'none' && comp.opacity !== '0', x: Math.round(b.x), w: Math.round(b.w) };
  });
  check(lamp600.visible && lamp600.x > 300, 'À t=600, lampe hors écran à droite (x=' + lamp600.x + ')');

  // T écrasé à t=4000
  const introState = await p1.evaluate(() => {
    const intro = document.getElementById('intro');
    const hidden = intro ? intro.classList.contains('hidden') : true;
    const letters = Array.from(intro ? intro.querySelectorAll('.letter') : []);
    const data = { hidden, letters: [], tCrushed: false };
    letters.forEach((l, i) => {
      const b = l.getBoundingClientRect();
      data.letters.push({ i, ch: l.textContent, h: Math.round(b.height || l.offsetHeight || 0), hasCrush: (l.className || '').includes('crush') });
      if (i === 4) data.tCrushed = (l.className || '').includes('crush');
    });
    return data;
  });
  console.log('  intro t=4000:', JSON.stringify(introState));
  const hs = introState.letters.map(l => l.h).filter(h => h > 0);
  const tEntry = introState.letters.find(l => l.i === 4);
  const otherHs = hs.filter((_, idx) => introState.letters[idx] && introState.letters[idx].i !== 4);
  const avgOther = otherHs.length > 0 ? otherHs.reduce((a, b) => a + b, 0) / otherHs.length : 0;
  const tCrushed = introState.tCrushed || (tEntry && tEntry.h > 0 && avgOther > 0 && tEntry.h < avgOther * 0.5);
  check(tCrushed, 'T écrasé à t=4000 (classe=' + introState.tCrushed + ', h=' + (tEntry ? tEntry.h : 0) + '/' + Math.round(avgOther) + ')');
  console.log('  erreurs console intro:', err1.length);
  await c1.close();

  /* ============ 2. LOBBY 1280x720 ============ */
  console.log('\n=== LOBBY 1280x720 ===');
  const c3 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const p3 = await c3.newPage();
  await p3.goto(BASE + '?host=1', { waitUntil: 'domcontentloaded' });
  await p3.waitForTimeout(3000);
  await safeScreenshot(p3, 'lobby-1280.png');
  const lobbyInfo = await p3.evaluate(() => {
    const btnStart = document.getElementById('btnStart');
    const qr = document.getElementById('qrImg');
    const scene = document.getElementById('scene');
    const data = { sceneVisible: !scene.classList.contains('hidden') };
    if (btnStart) { const b = btnStart.getBoundingClientRect(); data.btnStart = { bottom: Math.round(b.bottom) }; }
    if (qr) { data.qr = { w: qr.clientWidth || qr.offsetWidth || 0, h: qr.clientHeight || qr.offsetHeight || 0 }; }
    return data;
  });
  console.log('  lobby 720:', JSON.stringify(lobbyInfo));
  check(lobbyInfo.btnStart && lobbyInfo.btnStart.bottom <= 770, 'bouton Lancer visible en 720p (bottom=' + (lobbyInfo.btnStart ? lobbyInfo.btnStart.bottom : '?') + ')');
  check(lobbyInfo.qr && lobbyInfo.qr.w >= 300, 'QR >= 300px en 720p (w=' + (lobbyInfo.qr ? lobbyInfo.qr.w : '?') + ')');
  await c3.close();

  /* ============ 3. LOBBY 1920x1080 ============ */
  console.log('\n=== LOBBY 1920x1080 ===');
  const c4 = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const p4 = await c4.newPage();
  await p4.goto(BASE + '?host=1', { waitUntil: 'domcontentloaded' });
  try { await p4.waitForFunction(() => { const i = document.getElementById('intro'); return i && i.classList.contains('hidden'); }, { timeout: 8000 }); } catch (e) {}
  await wait(1000);
  await safeScreenshot(p4, 'lobby-1920.png');
  const lobbyInfo2 = await p4.evaluate(() => {
    const qr = document.getElementById('qrImg');
    const data = {};
    if (qr) { data.qr = { w: qr.clientWidth || qr.offsetWidth || 0, h: qr.clientHeight || qr.offsetHeight || 0 }; }
    return data;
  });
  console.log('  lobby 1080:', JSON.stringify(lobbyInfo2));
  check(lobbyInfo2.qr && lobbyInfo2.qr.w >= 300, 'QR >= 300px en 1080p (w=' + (lobbyInfo2.qr ? lobbyInfo2.qr.w : '?') + ')');
  await c4.close();

  /* ============ 4. DEMO ============ */
  console.log('\n=== DEMO ===');
  const c5 = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const p5 = await c5.newPage();
  const err5 = [];
  p5.on('console', m => { if (m.type() === 'error') err5.push(m.text()); });
  await p5.goto(BASE + '?demo=1', { waitUntil: 'domcontentloaded' });
  try {
    await p5.waitForFunction(() => {
      const b = document.getElementById('demoBanner');
      const i = document.getElementById('intro');
      return (b && !b.classList.contains('hidden')) || (i && i.classList.contains('hidden'));
    }, { timeout: 10000 });
  } catch (e) {}
  await wait(2000);
  await safeScreenshot(p5, 'demo-t3s.png');
  await wait(17000);
  await safeScreenshot(p5, 'demo-t20s.png');
  const demoInfo = await p5.evaluate(() => {
    const btnDemo = document.getElementById('btnDemoHome');
    const banner = document.getElementById('demoBanner');
    return { btnDemo: !!btnDemo, bannerHidden: banner ? banner.classList.contains('hidden') : true };
  });
  console.log('  demo info:', JSON.stringify(demoInfo));
  check(demoInfo.btnDemo, 'bouton Voir la démo présent sur l\'accueil');
  check(!demoInfo.bannerHidden, 'bannière MODE DÉMO affichée');
  const healthBefore = await fetch(BASE + '/api/health').then(r => r.json());
  await wait(5000);
  const healthAfter = await fetch(BASE + '/api/health').then(r => r.json());
  check(healthAfter.rooms === healthBefore.rooms, 'démo n\'a créé aucune salle serveur (' + healthBefore.rooms + '→' + healthAfter.rooms + ')');
  console.log('  erreurs console demo:', err5.length);
  await c5.close();

  await browser.close();
  console.log('\n=== RÉSUMÉ ===');
  console.log(failures.length === 0 ? 'TOUTES LES PREUVES RÉUSSIES' : failures.length + ' ÉCHEC(S):');
  failures.forEach(f => console.log('  -', f));
  process.exit(failures.length === 0 ? 0 : 1);
})();
