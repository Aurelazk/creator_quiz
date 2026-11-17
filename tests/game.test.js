/* =====================================================================
   tests/game.test.js — règles pures du serveur QCM (sans réseau)
   ===================================================================== */
'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const G = require('../shared/rules');

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ✓ ' + name);
  } catch (err) {
    console.error('  ✗ ' + name);
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  }
}

console.log('\nCREATOR · tests du moteur de règles QCM\n');

/* ------------------------------------------------------------------ */
/* PHASES                                                             */
/* ------------------------------------------------------------------ */
test('PHASES : LOBBY → COUNTDOWN → QUESTION → REVEAL → END', () => {
  assert.strictEqual(G.PHASES.LOBBY, 'lobby');
  assert.strictEqual(G.PHASES.COUNTDOWN, 'countdown');
  assert.strictEqual(G.PHASES.QUESTION, 'question');
  assert.strictEqual(G.PHASES.REVEAL, 'reveal');
  assert.strictEqual(G.PHASES.END, 'end');
});

/* ------------------------------------------------------------------ */
/* JUGE QCM                                                           */
/* ------------------------------------------------------------------ */
test('judgeQCM : bonne réponse', () => {
  const q = { options: ['A', 'B', 'C', 'D'], correctIndex: 1 };
  const res = G.judgeQCM(q, 1, []);
  assert.strictEqual(res.kind, 'found');
  assert.strictEqual(res.index, 1);
});

test('judgeQCM : mauvaise réponse', () => {
  const q = { options: ['A', 'B', 'C', 'D'], correctIndex: 1 };
  const res = G.judgeQCM(q, 0, []);
  assert.strictEqual(res.kind, 'miss');
});

test('judgeQCM : doublon (déjà trouvé)', () => {
  const q = { options: ['A', 'B', 'C', 'D'], correctIndex: 1 };
  const res = G.judgeQCM(q, 1, [1]);
  assert.strictEqual(res.kind, 'dup');
});

test('judgeQCM : option invalide', () => {
  const q = { options: ['A', 'B', 'C', 'D'], correctIndex: 1 };
  const res = G.judgeQCM(q, 99, []);
  assert.strictEqual(res.kind, 'miss');
});

/* ------------------------------------------------------------------ */
/* POINTS                                                             */
/* ------------------------------------------------------------------ */
test('pointsForResponse : 10 pts de base + bonus rapidité', () => {
  assert.strictEqual(G.pointsForResponse(15000, 15000), 15); // 10 + 5
  assert.strictEqual(G.pointsForResponse(7500, 15000), 12);   // 10 + 2
  assert.strictEqual(G.pointsForResponse(0, 15000), 10);      // 10 + 0
  assert.strictEqual(G.pointsForResponse(-1, 15000), 10);     // 10 + 0
});

/* ------------------------------------------------------------------ */
/* SÉLECTION DE QUESTIONS                                             */
/* ------------------------------------------------------------------ */
test('pickQuestions : nombre demandé, sans doublon', () => {
  const bank = Array.from({ length: 20 }, (_, i) => ({ q: 'Q' + i }));
  const picked = G.pickQuestions(bank, 10);
  assert.strictEqual(picked.length, 10);
  assert.strictEqual(new Set(picked.map((x) => x.q)).size, 10);
});

test('pickQuestionsByTheme : filtre par thème', () => {
  const bank = [
    { q: 'Q1', theme: 'Histoire du Bénin' },
    { q: 'Q2', theme: 'Monuments du Bénin' },
    { q: 'Q3', theme: 'Histoire du Bénin' },
  ];
  const picked = G.pickQuestionsByTheme(bank, 10, ['Histoire du Bénin'], new Set());
  assert.strictEqual(picked.length, 2);
  assert.ok(picked.every((q) => q.theme === 'Histoire du Bénin'));
});

test('pickQuestionsByTheme : tout mélanger', () => {
  const bank = [
    { q: 'Q1', theme: 'Histoire du Bénin' },
    { q: 'Q2', theme: 'Monuments du Bénin' },
  ];
  const picked = G.pickQuestionsByTheme(bank, 10, ['tout'], new Set());
  assert.strictEqual(picked.length, 2);
});

test('balanceDifficulty : 3 faciles, 4 moyennes, 3 difficiles', () => {
  const questions = [
    ...Array.from({ length: 5 }, (_, i) => ({ q: 'E' + i, difficulty: 1 })),
    ...Array.from({ length: 5 }, (_, i) => ({ q: 'M' + i, difficulty: 2 })),
    ...Array.from({ length: 5 }, (_, i) => ({ q: 'H' + i, difficulty: 3 })),
  ];
  const balanced = G.balanceDifficulty(questions);
  assert.strictEqual(balanced.length, 10);
  assert.strictEqual(balanced.filter((q) => q.difficulty === 1).length, 3);
  assert.strictEqual(balanced.filter((q) => q.difficulty === 2).length, 4);
  assert.strictEqual(balanced.filter((q) => q.difficulty === 3).length, 3);
});

/* ------------------------------------------------------------------ */
/* BANQUE DE QUESTIONS                                                */
/* ------------------------------------------------------------------ */
test('questions.json : 120 questions, structure QCM valide', () => {
  const file = path.join(__dirname, '..', 'server', 'questions.json');
  const questions = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.ok(questions.length >= 100, 'au moins 100 questions : ' + questions.length);
  let monuments = 0, histoire = 0;
  for (const q of questions) {
    assert.ok(q.q && typeof q.q === 'string', 'question sans texte');
    assert.ok(!/citez/i.test(q.q), 'question commence par Citez : ' + q.q);
    assert.ok(Array.isArray(q.options) && q.options.length === 4, 'pas 4 options : ' + q.q);
    assert.ok(typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex <= 3, 'correctIndex invalide : ' + q.q);
    assert.ok(q.fact && q.fact.length > 10, 'fact manquant : ' + q.q);
    assert.ok(q.theme, 'thème manquant : ' + q.q);
    assert.ok(q.difficulty >= 1 && q.difficulty <= 3, 'difficulté invalide : ' + q.q);
    const seen = new Set();
    for (const o of q.options) {
      assert.ok(typeof o === 'string' && o.length > 0, 'option vide : ' + q.q);
      assert.ok(!seen.has(o), 'option dupliquée : ' + q.q);
      seen.add(o);
    }
    if (q.theme === 'Monuments du Bénin') monuments++;
    if (q.theme === 'Histoire du Bénin') histoire++;
  }
  assert.ok(monuments >= 20, 'moins de 20 Monuments du Bénin : ' + monuments);
  assert.ok(histoire >= 20, 'moins de 20 Histoire du Bénin : ' + histoire);
});

test('pas de libellé anglais résiduel', () => {
  const file = path.join(__dirname, '..', 'server', 'questions.json');
  const questions = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const q of questions) {
    assert.ok(!/buzz|steal|strike|sondage|twitter/i.test(q.q), 'anglais dans la question : ' + q.q);
    for (const o of q.options) {
      assert.ok(!/buzz|steal|strike|sondage|twitter/i.test(o), 'anglais dans une option : ' + q.q);
    }
  }
});

console.log('\n' + passed + ' tests réussis.\n');
