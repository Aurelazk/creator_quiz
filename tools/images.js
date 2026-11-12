#!/usr/bin/env node
/* Conversion des visuels du pack Unity "Guess Their Answer" en WebP optimisé.
   Usage : node tools/images.js <dossier Unity Assets> <dossier de sortie> */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SRC = process.argv[2];
const OUT = process.argv[3];
const MAX = 1024;

// nom de sortie -> fichier source (chemins relatifs à Assets/)
const MAP = {
  'ui/balance-bar.webp': 'Resources/GuessTheirAnswerUI/BalanceBar.png',
  'ui/hourglass.webp': 'Resources/GuessTheirAnswerUI/Hourglass.png',
  'ui/input-field.webp': 'Resources/GuessTheirAnswerUI/InputFieldBackground.png',
  'ui/menu-bg.webp': 'GAME UI guess the words/MAIN MENU BG-03.png',
  'ui/panel-win.webp': 'GAME UI guess the words/WIN PANEL-02.png',
  'ui/panel-fail.webp': 'GAME UI guess the words/FAILED PANEL-02.png',
  'ui/panel-pause.webp': 'GAME UI guess the words/pause panel-02.png',
  'ui/btn-play.webp': 'GAME UI guess the words/BUTTONS/Asset 21.png',
  'ui/btn-exit.webp': 'GAME UI guess the words/BUTTONS/Asset 22.png',
  'ui/btn-next.webp': 'GAME UI guess the words/BUTTONS/Asset 23.png',
  'ui/btn-continue.webp': 'GAME UI guess the words/BUTTONS/Asset 24.png',
  'ui/btn-menu.webp': 'GAME UI guess the words/BUTTONS/Asset 25.png',
  'ui/btn-resume.webp': 'GAME UI guess the words/BUTTONS/Asset 26.png',
  'ui/btn-pause.webp': 'GAME UI guess the words/BUTTONS/Asset 16.png',
  'ui/btn-close.webp': 'GAME UI guess the words/BUTTONS/Asset 19.png',
  'ui/btn-restart.webp': 'GAME UI guess the words/BUTTONS/Asset 17.png',
  'ui/btn-settings.webp': 'GAME UI guess the words/BUTTONS/Asset 18.png',
  'ui/btn-enter.webp': 'Gameplay UI GUESS the answers/Gameplay UI/ASSETS/Asset 2.png',
  'ui/turf-blue.webp': 'Gameplay UI GUESS the answers/Gameplay UI/ASSETS/Asset 7.png',
  'ui/turf-green.webp': 'Gameplay UI GUESS the answers/Gameplay UI/ASSETS/Asset 6.png',
  'ui/podium.webp': 'Gameplay UI GUESS the answers/Gameplay UI/ASSETS/Asset 5.png',
  'ui/pink-bar.webp': 'Gameplay UI GUESS the answers/Gameplay UI/ASSETS/Asset 8.png',
  'ui/stand.webp': 'Gameplay UI GUESS the answers/Gameplay UI/ASSETS/Asset 11.png',
  'ui/projector.webp': 'Gameplay UI GUESS the answers/Gameplay UI/ASSETS/Asset 12.png',
  'ui/sky.webp': 'Gameplay UI GUESS the answers/Gameplay UI/ASSETS/Asset 14.png',
  'ui/key-go.webp': 'keyboard ui/1x/Asset 27.png',
  'ui/key-space.webp': 'keyboard ui/1x/Asset 28.png',
  'ui/key-123.webp': 'keyboard ui/1x/Asset 29.png',
  'ui/key-back.webp': 'keyboard ui/1x/Asset 30.png',
  'ui/key-shift.webp': 'keyboard ui/1x/Asset 31.png',
};

(async () => {
  let total = 0;
  for (const [dst, src] of Object.entries(MAP)) {
    const input = path.join(SRC, src);
    if (!fs.existsSync(input)) { console.warn('absent:', src); continue; }
    const out = path.join(OUT, dst);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await sharp(input)
      .resize({ width: MAX, height: MAX, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 86, alphaQuality: 90 })
      .toFile(out);
    const size = fs.statSync(out).size;
    total += size;
    console.log(`  ${dst.padEnd(26)} ${String(Math.round(size / 1024)).padStart(4)} Ko`);
  }
  console.log(`  total UI : ${(total / 1024 / 1024).toFixed(2)} Mo`);
})();
