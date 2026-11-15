/* =====================================================================
   tests/visual.js — vérification visuelle mobile (Playwright, headless)
   - Aucun script 3D chargé côté joueur
   - Parcours QR : écran minimal, code pré-rempli, pseudo focus
   - Captures des écrans joueur 360×640 et 390×844
   ===================================================================== */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000';
const DIR = '/tmp/kilo/visual';
fs.mkdirSync(DIR, { recursive: true });

let failures = [];
function check(cond, msg) {
  if (!cond) failures.push(msg);
  console.log((cond ? '  ✓' : '  ✗') + ' ' + msg);
}

(async () => {
  const browser = await chromium.launch();

  /* ---------- 1. Page d'accueil joueur : pas de Three.js ---------- */
  const ctx1 = await browser.newContext({ viewport: { width: 360, height: 640 } });
  const p1 = await ctx1.newPage();
  const requests = [];
  p1.on('request', (req) => requests.push(req.url()));
  await p1.goto(BASE, { waitUntil: 'networkidle' });
  await p1.waitForTimeout(800);
  await p1.screenshot({ path: path.join(DIR, 'home-360x640.png'), fullPage: true });
  const loadedThree = requests.some((u) => u.includes('three.min.js'));
  const loadedScene = requests.some((u) => u.includes('/js/scene.js'));
  const loadedMqtt = requests.some((u) => u.includes('mqtt.min.js'));
  check(!loadedThree, 'three.min.js non chargé côté joueur (360×640)');
  check(!loadedScene, 'scene.js non chargé côté joueur (360×640)');
  check(!loadedMqtt, 'mqtt.min.js non chargé côté joueur');
  // contrôles vitaux visibles sans scroller
  const vp = p1.viewportSize();
  const joinBox = await p1.locator('#btnJoin').boundingBox();
  const pseudoBox = await p1.locator('#pseudo').boundingBox();
  const codeBox = await p1.locator('#codeIn').boundingBox();
  check(!!joinBox && joinBox.y + joinBox.height <= vp.height, 'bouton Rejoindre dans la fenêtre (360×640)');
  check(!!pseudoBox && !!codeBox, 'champs pseudo et code présents');
  await ctx1.close();

  /* ---------- 2. Parcours QR : salle pré-remplie, écran minimal ---------- */
  const ctx2 = await browser.newContext({ viewport: { width: 360, height: 640 } });
  const p2 = await ctx2.newPage();
  await p2.goto(BASE + '/?room=ABCDE', { waitUntil: 'networkidle' });
  await p2.waitForTimeout(800);
  await p2.screenshot({ path: path.join(DIR, 'qr-join-360x640.png'), fullPage: true });
  const bodyClass = await p2.evaluate(() => document.body.className);
  check(bodyClass.includes('join-via-qr'), 'classe join-via-qr sur le body');
  const chip = await p2.locator('#pRoomChip').textContent();
  check(chip === 'Salle ABCDE', 'puce salle affichée (Salle ABCDE)');
  const codeVal = await p2.locator('#codeIn').inputValue();
  check(codeVal === 'ABCDE', 'code pré-rempli dans le champ');
  const pseudoVal = await p2.locator('#pseudo').inputValue();
  check(pseudoVal === '', 'pseudo vide (focus prêt)');
  const focused = await p2.evaluate(() => document.activeElement?.id === 'pseudo');
  check(focused, 'champ pseudo au focus');
  const heroHidden = await p2.locator('.home-hero').isVisible() === false;
  const previewHidden = await p2.locator('.home-preview').isVisible() === false;
  const footHidden = await p2.locator('.home-foot').isVisible() === false;
  const linksHidden = await p2.locator('.home-links').isVisible() === false;
  const codeFieldHidden = await p2.locator('.field--code').isVisible() === false;
  check(heroHidden, 'hero masqué (parcours QR)');
  check(previewHidden, 'aperçu masqué (parcours QR)');
  check(linksHidden, 'liens masqués (parcours QR)');
  check(codeFieldHidden, 'champ code masqué (parcours QR)');
  await ctx2.close();

  /* ---------- 3. 390×844 ---------- */
  const ctx3 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p3 = await ctx3.newPage();
  await p3.goto(BASE, { waitUntil: 'networkidle' });
  await p3.waitForTimeout(800);
  await p3.screenshot({ path: path.join(DIR, 'home-390x844.png'), fullPage: true });
  const vp3 = p3.viewportSize();
  const joinBox3 = await p3.locator('#btnJoin').boundingBox();
  check(!!joinBox3 && joinBox3.y + joinBox3.height <= vp3.height, 'bouton Rejoindre dans la fenêtre (390×844)');
  await ctx3.close();

  /* ---------- 4. Animateur : la 3D se charge ---------- */
  const ctx4 = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const p4 = await ctx4.newPage();
  const req4 = [];
  p4.on('request', (req) => req4.push(req.url()));
  await p4.goto(BASE + '?host=1', { waitUntil: 'networkidle' });
  await p4.waitForTimeout(800);
  await p4.screenshot({ path: path.join(DIR, 'host-1920x1080.png'), fullPage: true });
  await p4.waitForTimeout(2500); // laisser le temps au chargement de three + scene
  const loadedThreeHost = req4.some((u) => u.includes('three.min.js'));
  const loadedSceneHost = req4.some((u) => u.includes('/js/scene.js'));
  check(loadedThreeHost, 'three.min.js chargé côté animateur');
  check(loadedSceneHost, 'scene.js chargé côté animateur');
  await ctx4.close();

  await browser.close();
  console.log('\n' + (failures.length === 0 ? 'TOUS LES TESTS VISUELS RÉUSSIS' : failures.length + ' ÉCHEC(S) :\n' + failures.join('\n')));
  process.exit(failures.length === 0 ? 0 : 1);
})();
