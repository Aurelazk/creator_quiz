/* =====================================================================
   tests/smoke.test.js — test de fumée Playwright (headless)
   Cree une salle (hôte), un joueur rejoint, une manche complete, fin
   de partie, classement. Echoue si une erreur console apparait.
   Lance : npx playwright test tests/smoke.test.js
   Precondition : un serveur HTTP sert le repertoire courant sur le port 5173.
   ===================================================================== */
const { test, expect } = require('@playwright/test');

test.use({ headless: true });

const BASE = process.env.SMOKE_BASE || 'http://localhost:5173';

test('manche complete : salle, 2 joueurs, fin, classement', async ({ page, browser }) => {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));

  /* --- hôte crée une salle --- */
  await page.goto(BASE + '/index.html');
  await page.fill('#pseudo', 'HoteTest');
  await page.click('#btnCreate');
  await page.waitForFunction(() => document.getElementById('roomCode') && document.getElementById('roomCode').textContent !== '-----');
  const room = await page.evaluate(() => document.getElementById('roomCode').textContent);
  const hostSecret = await page.evaluate(() => {
    const s = document.querySelector('script') && null;
    return window.Net && window.Net.hostSecret ? window.Net.hostSecret : null;
  });
  expect(room.length).toBe(5);

  /* --- joueur rejoint via le lien securise (QR) --- */
  const player = await browser.newPage();
  player.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  player.on('pageerror', (e) => errors.push(e.message));
  await player.goto(BASE + '/index.html?room=' + encodeURIComponent(room) + '&hs=' + encodeURIComponent(hostSecret));
  await player.fill('#pseudo', 'JoueurTest');
  await player.click('#btnJoin');
  await player.waitForFunction(() => {
    const s = document.getElementById('pLobbyHint');
    return s && s.textContent && s.textContent.indexOf('perdu') === -1;
  }, { timeout: 15000 });

  /* hôte voit le joueur --- */
  await page.waitForFunction(() => {
    const list = document.getElementById('lobbyPlayers');
    return list && list.children.length >= 1;
  }, { timeout: 15000 });

  /* --- hôte lance la partie --- */
  await page.click('#btnStart');
  await page.waitForFunction(() => document.getElementById('hostQuestion'), { timeout: 15000 });
  const question = await page.evaluate(() => document.getElementById('hostQuestion').textContent);
  expect(question.length).toBeGreaterThan(0);

  /* --- joueur repond (premiere reponse de la banque, inconnue ici : on envoie un miss puis attend) --- */
  await player.fill('#pAnswer', 'plopinon');
  await player.click('#btnSubmit');

  /* --- hôte termine la manche et va jusqu'à la fin (raccourci : Repeated hostMain) --- */
  // On termine la manche courante puis on avance jusqu'à la fin
  await page.click('#btnHostSkip'); // passer = fin de manche
  await page.waitForTimeout(1200);
  // avance jusqu'au bout (manches restantes)
  let phase = await page.evaluate(() => window.App && window.App.state && window.App.state.phase);
  let steps = 0;
  while (phase !== 'end' && steps < 20) {
    await page.click('#btnHostMain');
    await page.waitForTimeout(700);
    phase = await page.evaluate(() => window.App && window.App.state && window.App.state.phase);
    steps++;
  }
  expect(phase).toBe('end');

  /* --- classement final affiche --- */
  await page.waitForFunction(() => {
    const r = document.getElementById('hostRank');
    return r && r.children.length >= 1;
  }, { timeout: 10000 });

  /* --- classement général accessible --- */
  await page.click('#btnLeaderboard');
  await page.waitForFunction(() => document.getElementById('lbList'), { timeout: 10000 });

  await player.close();

  /* --- aucune erreur console --- */
  expect(errors.length).toBe(0, 'Erreurs console :\n' + errors.join('\n'));
});
