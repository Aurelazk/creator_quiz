'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const PORT = 7000 + Math.floor(Math.random() * 500);
const BASE = 'http://127.0.0.1:' + PORT;
const DIR = '/tmp/opencode/visual';
const env = {
  ...process.env,
  PORT: String(PORT),
  PUBLIC_URL: BASE,
  QUIZ_TEST_MODE: '1',
};

let server = null;
let logs = '';
const failures = [];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function request(pathname) {
  return fetch(BASE + pathname).catch(() => null);
}

async function startServer() {
  server = spawn(process.execPath, [path.join(ROOT, 'server', 'index.js')], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', (d) => { logs += d.toString(); });
  server.stderr.on('data', (d) => { logs += d.toString(); });
  for (let i = 0; i < 80; i++) {
    await sleep(100);
    const res = await request('/api/health');
    if (res && res.ok) return;
  }
  throw new Error('serveur non démarré : ' + logs);
}

function check(cond, msg) {
  if (!cond) failures.push(msg);
  console.log((cond ? '  ✓ ' : '  ✗ ') + msg);
}

function watchErrors(page) {
  page.on('pageerror', (e) => failures.push('pageerror : ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') failures.push('console : ' + m.text()); });
}

async function metrics(page) {
  return page.evaluate(() => {
    const visible = (el) => {
      if (!el) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const btns = [...document.querySelectorAll('button:not([disabled])')].filter(visible);
    return {
      vw: innerWidth,
      vh: innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      smallestButton: btns.length ? Math.min(...btns.map((b) => b.getBoundingClientRect().height)) : 0,
      buttonsInView: btns.filter((b) => {
        const r = b.getBoundingClientRect();
        return r.top >= -1 && r.bottom <= innerHeight + 1;
      }).map((b) => b.id || b.className),
    };
  });
}

async function run() {
  fs.mkdirSync(DIR, { recursive: true });
  await startServer();
  console.log('\nCREATOR · tests visuels QCM (' + BASE + ')\n');

  const browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });

  const ctxPhone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  await ctxPhone.addInitScript(() => { try { sessionStorage.setItem('gtq.intro.seen', '1'); } catch (e) {} });
  const phone = await ctxPhone.newPage();
  watchErrors(phone);
  const phoneRequests = [];
  const phoneResponses = [];
  phone.on('request', (r) => phoneRequests.push(r.url()));
  phone.on('response', (r) => phoneResponses.push(r));
  await phone.goto(BASE, { waitUntil: 'domcontentloaded' });
  await phone.waitForFunction(() => window.App && window.Net, null, { timeout: 8000 });
  await phone.waitForFunction(() => window.IntroAnim && window.IntroAnim.isFinished(), null, { timeout: 20000 });
  await phone.screenshot({ path: path.join(DIR, 'phone-home-390x844.png'), fullPage: true });
  const pm = await metrics(phone);
  check(!phoneRequests.some((u) => u.includes('three.min.js')), 'three.min.js non chargé côté joueur');
  check(!phoneRequests.some((u) => u.includes('/js/scene.js')), 'scene.js non chargé côté joueur');
  let playerBytes = 0;
  for (const response of phoneResponses) {
    if (!response.url().startsWith(BASE)) continue;
    try { playerBytes += (await response.body()).length; } catch (e) {}
  }
  check(playerBytes < 500 * 1024, 'page joueur < 500 Ko (' + Math.round(playerBytes / 1024) + ' Ko)');
  check(pm.scrollWidth <= pm.vw + 1, 'aucun débordement horizontal joueur (' + pm.scrollWidth + ' ≤ ' + pm.vw + ')');
  check(pm.smallestButton >= 48, 'zones tactiles ≥ 48 px (' + Math.round(pm.smallestButton) + ' px)');
  const join = await phone.locator('#btnJoin').boundingBox();
  check(!!join && join.y + join.height <= pm.vh + 1, 'bouton Rejoindre visible sans scroll');
  await ctxPhone.close();

  const ctxQr = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  await ctxQr.addInitScript(() => { try { sessionStorage.setItem('gtq.intro.seen', '1'); } catch (e) {} });
  const qr = await ctxQr.newPage();
  watchErrors(qr);
  await qr.goto(BASE + '/?room=ABCDE', { waitUntil: 'domcontentloaded' });
  await qr.waitForFunction(() => window.App && window.Net, null, { timeout: 8000 });
  await qr.screenshot({ path: path.join(DIR, 'phone-qr-390x844.png'), fullPage: true });
  const bodyClass = await qr.evaluate(() => document.body.className);
  check(bodyClass.includes('join-via-qr'), 'classe join-via-qr sur le body');
  check((await qr.locator('#pRoomChip').textContent()).trim() === 'Salle ABCDE', 'puce salle affichée');
  check(await qr.locator('#codeIn').inputValue() === 'ABCDE', 'code pré-rempli');
  check(await qr.locator('#pseudo').inputValue() === '', 'pseudo vide');
  check(await qr.evaluate(() => document.activeElement && document.activeElement.id === 'pseudo'), 'pseudo au focus');
  check(!(await qr.locator('.field--code').isVisible()), 'champ code masqué (parcours QR)');
  check(!(await qr.locator('.home-hero').isVisible()), 'hero masqué (parcours QR)');
  check(await qr.locator('#pQrWelcome').isVisible(), 'message d’accueil visible (parcours QR)');
  check(await qr.locator('#homePreview').isVisible(), 'aperçu du personnage visible (parcours QR)');
  await ctxQr.close();

  const ctxHost = await browser.newContext({ viewport: { width: 1920, height: 1080 }, serviceWorkers: 'block' });
  await ctxHost.addInitScript(() => { try { sessionStorage.setItem('gtq.intro.seen', '1'); } catch (e) {} });
  const host = await ctxHost.newPage();
  watchErrors(host);
  const hostRequests = [];
  host.on('request', (r) => hostRequests.push(r.url()));
  await host.goto(BASE + '/?host=1', { waitUntil: 'domcontentloaded' });
  await host.waitForFunction(() => window.App && window.App.code, null, { timeout: 10000 });
  await host.waitForTimeout(1200);
  await host.screenshot({ path: path.join(DIR, 'host-1920x1080.png'), fullPage: true });
  const hm = await metrics(host);
  check(hostRequests.some((u) => u.includes('three.min.js')), 'three.min.js chargé côté animateur');
  check(hostRequests.some((u) => u.includes('/js/scene.js')), 'scene.js chargé côté animateur');
  check(hm.scrollWidth <= hm.vw + 1, 'aucun débordement horizontal animateur');
  check(hm.scrollHeight <= hm.vh + 1, 'aucun débordement vertical animateur');
  check(await host.locator('#scene').isVisible(), 'canvas 3D présent');
  await ctxHost.close();

  const ctxSw = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'allow' });
  await ctxSw.addInitScript(() => { try { sessionStorage.setItem('gtq.intro.seen', '1'); } catch (e) {} });
  const swPage = await ctxSw.newPage();
  await swPage.goto(BASE, { waitUntil: 'domcontentloaded' });
  await swPage.waitForFunction(() => !!(navigator.serviceWorker && navigator.serviceWorker.controller), null, { timeout: 10000 });
  await swPage.waitForTimeout(1000);
  const swFile = path.join(ROOT, 'js', 'net.js');
  const swOriginal = fs.readFileSync(swFile);
  try {
    fs.appendFileSync(swFile, '\n');
    await swPage.evaluate(() => {
      navigator.serviceWorker.addEventListener('controllerchange', () => { try { sessionStorage.setItem('swChanged', '1'); } catch (e) {} });
    });
    await swPage.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      await reg.update();
    });
    await swPage.waitForSelector('#updateBanner:not(.hidden)', { timeout: 8000 });
    check(true, 'bandeau nouvelle version affiché après changement JS');
    await swPage.click('#btnUpdate');
    await swPage.waitForFunction(() => sessionStorage.getItem('swChanged') === '1', null, { timeout: 10000 });
    check(true, 'mise à jour du service worker appliquée');
  } finally {
    fs.writeFileSync(swFile, swOriginal);
  }
  await ctxSw.close();

  await browser.close();
  server.kill('SIGTERM');

  if (failures.length) {
    console.error('\n  ✗ ' + failures.length + ' échec(s) visuel(s)\n' + failures.map((f) => '   - ' + f).join('\n') + '\n');
    process.exit(1);
  }
  console.log('\n  ✓ tests visuels réussis (390×844 joueur, QR, 1920×1080 animateur)\n');
}

run()
  .then(() => { if (server) server.kill('SIGTERM'); setTimeout(() => process.exit(0), 150); })
  .catch((err) => {
    console.error('\n  ✗ échec visuel :', err && err.stack ? err.stack : err);
    console.error(logs.slice(-1200));
    if (server) server.kill('SIGTERM');
    setTimeout(() => process.exit(1), 150);
  });
