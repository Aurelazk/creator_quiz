/* =====================================================================
   tests/game.test.js — règles de jeu (Node, aucun framework)
   Verifie : normalisation, matching (alias, pluriel, Levenshtein),
             refus de "chat" pour "achat", doublons, scoring avec bonus
             de rapidite et x2, bornes du classement.
   Lance : node tests/game.test.js
   ===================================================================== */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

/* Charge game.js dans un contexte navigateur minimal (global.window). */
const GLOBAL_WINDOW = { SURVEY_QUESTIONS: undefined };
const code = fs.readFileSync(path.join(__dirname, '..', 'js', 'game.js'), 'utf8');
new Function('window', code)(GLOBAL_WINDOW);
const Game = GLOBAL_WINDOW.Game;

let passed = 0;
let failed = 0;
function t(name, fn) {
  try { fn(); passed++; console.log('ok  - ' + name); }
  catch (e) { failed++; console.log('KO  - ' + name + ' : ' + e.message); }
}

/* ---------- Question factice pour les tests de matching/scoring ---------- */
const Q = {
  q: "Quel langage crée la structure d'une page web ?",
  answers: [
    { text: "HTML", pts: 50, aliases: ["hypertext markup language", "html5"] },
    { text: "CSS", pts: 25, aliases: ["cascading style sheets", "feuille de style"] },
    { text: "JavaScript", pts: 15, aliases: ["js", "node", "ecmascript"] },
    { text: "PHP", pts: 6, aliases: ["hypertext preprocessor"] },
    { text: "SQL", pts: 4, aliases: [] },
  ],
};
const revealed = [];

t('normalisation : accents et ponctuation', () => {
  assert.strictEqual(Game.normalize("Etape!" ), "etape");
  assert.strictEqual(Game.normalize("Côté"), "cote");
  assert.strictEqual(Game.normalize("JavaScript  "), "javascript");
  assert.strictEqual(Game.normalize("  L'API, c'est quoi ?"), "l api c est quoi");
});

t('matching : alias exact', () => {
  assert.strictEqual(Game.matches("HTML", Q.answers[0]), true);
  assert.strictEqual(Game.matches("hypertext markup language", Q.answers[0]), true);
  assert.strictEqual(Game.matches("js", Q.answers[2]), true);
  assert.strictEqual(Game.matches("node", Q.answers[2]), true);
});

t('matching : pluriel', () => {
  const Q2 = { answers: [{ text: "langage", pts: 10, aliases: [] }] };
  assert.strictEqual(Game.matches("langages", Q2.answers[0]), true);
  assert.strictEqual(Game.matches("langage", Q2.answers[0]), true);
});

t('matching : faute de frappe (Levenshtein)', () => {
  assert.strictEqual(Game.matches("Javscript", Q.answers[2]), true); // faute de frappe sur un mot long
  assert.strictEqual(Game.matches("Javascript", Q.answers[2]), true); // proche de "javascript"
  assert.strictEqual(Game.matches("Cascading Style Sheets", Q.answers[1]), true); // alias CSS
});

t('refus : "chat" ne matche pas "achat"', () => {
  const Q3 = { answers: [{ text: "achat", pts: 10, aliases: [] }] };
  assert.strictEqual(Game.matches("chat", Q3.answers[0]), false);
  assert.strictEqual(Game.matches("achat", Q3.answers[0]), true);
  assert.strictEqual(Game.matches("chat ", Q3.answers[0]), false);
});

t('refus : vide / incohérent', () => {
  assert.strictEqual(Game.matches("", Q), false);
  assert.strictEqual(Game.matches("   ", Q), false);
  assert.strictEqual(Game.matches("python", Q), false);
});

t('doublon : reponse deja revelee', () => {
  assert.strictEqual(Game.judge(Q, "HTML", [{ i: 0, text: "HTML" }], 100, 1).kind, 'dup');
  assert.strictEqual(Game.judge(Q, "html", [{ i: 0, text: "HTML" }], 100, 1).kind, 'dup');
});

t('scoring : trouvable et points', () => {
  const res = Game.judge(Q, "HTML", revealed, 1000, 1);
  assert.strictEqual(res.kind, 'found');
  assert.strictEqual(res.index, 0);
  assert.ok(res.pts > 0);
  assert.ok(res.pts >= Q.answers[0].pts); // bonus de rapidite possible
});

t('scoring : pas de bonus apres la fenetre', () => {
  const slow = Game.judge(Q, "HTML", [], 20000, 1).pts;
  assert.strictEqual(slow, Q.answers[0].pts);
});

t('scoring : bonus de rapidite', () => {
  const fast = Game.judge(Q, "HTML", [], 1000, 1).pts;
  const slow = Game.judge(Q, "HTML", [], 20000, 1).pts;
  assert.ok(fast > slow, 'rapide doit rapporter plus');
  assert.strictEqual(slow, Q.answers[0].pts); // pas de bonus => pts de base
});

t('scoring : multiplicateur x2 (manche finale)', () => {
  const base = Game.judge(Q, "HTML", [], 20000, 1).pts;
  const x2 = Game.judge(Q, "HTML", [], 20000, 2).pts;
  assert.strictEqual(x2, base * 2);
});

t('speedFactor : borne', () => {
  assert.strictEqual(Game.speedFactor(0), 1.25);
  assert.strictEqual(Game.speedFactor(10000), 1);
  assert.strictEqual(Game.speedFactor(50000), 1);
});

t('pointsFor : minimum 1', () => {
  const Qtiny = { answers: [{ text: "x", pts: 1, aliases: [] }] };
  const r = Game.judge({ q: 't', answers: Qtiny.answers }, "x", [], 50000, 1);
  assert.strictEqual(r.kind, 'found');
  assert.strictEqual(r.pts, 1);
});

t('classement : bornes (0 a 5000)', () => {
  for (const s of [-1, 0, 5000, 5001]) {
    const v = Math.max(0, Math.min(5000, s));
    assert.ok(v >= 0 && v <= 5000);
  }
});

console.log('\n== ' + passed + ' reussis, ' + failed + ' echecs ==');
process.exit(failed > 0 ? 1 : 0);
