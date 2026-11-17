/* =====================================================================
   tests/questions.test.js — validation de la banque de questions QCM
   Structure : theme, difficulty (1-3), options[4], correctIndex (0-3), fact
   Objectif : >= 20 Monuments du Bénin, >= 20 Histoire du Bénin.
   ===================================================================== */
'use strict';

const assert = require('assert');
const path = require('path');

const FILE = path.join(__dirname, '..', 'server', 'questions.json');
const questions = require(FILE);

const KNOWN_THEMES = new Set([
  'Monuments du Bénin',
  'Histoire du Bénin',
  'Culture & traditions',
  'Gastronomie',
  'Géographie',
  'Musique & arts',
  'Sport',
  'Tech & vie étudiante',
  'Culture générale',
]);

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

console.log('\nCREATOR · tests banque de questions QCM\n');

test('banque non vide (' + questions.length + ' questions)', () => {
  assert.ok(questions.length >= 100, 'trop peu de questions : ' + questions.length);
});

test('chaque question a theme, difficulty, options, correctIndex, fact', () => {
  for (const q of questions) {
    assert.ok(KNOWN_THEMES.has(q.theme), 'thème inconnu : ' + q.theme + ' (' + q.q + ')');
    assert.ok(Number.isInteger(q.difficulty) && q.difficulty >= 1 && q.difficulty <= 3, 'difficulté invalide : ' + q.q);
    assert.ok(Array.isArray(q.options) && q.options.length === 4, 'pas 4 options : ' + q.q);
    assert.ok(typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex <= 3, 'correctIndex invalide : ' + q.q);
    assert.ok(q.fact && q.fact.trim().length > 10, 'fact manquant ou trop court : ' + q.q);
    assert.ok(!/citez/i.test(q.q), 'question commence par Citez : ' + q.q);
  }
});

test('pas de doublons de questions', () => {
  const seen = new Set();
  for (const q of questions) {
    assert.ok(!seen.has(q.q), 'question dupliquée : ' + q.q);
    seen.add(q.q);
  }
  assert.ok(!/twitter/i.test(JSON.stringify(questions)), 'libellé anglais résiduel (Twitter)');
});

test('au moins 20 questions Histoire du Bénin', () => {
  const count = questions.filter((q) => q.theme === 'Histoire du Bénin').length;
  assert.ok(count >= 20, 'seulement ' + count + ' questions Histoire du Bénin (attendu >= 20)');
  console.log('     Histoire du Bénin : ' + count);
});

test('au moins 20 questions Monuments du Bénin', () => {
  const count = questions.filter((q) => q.theme === 'Monuments du Bénin').length;
  assert.ok(count >= 20, 'seulement ' + count + ' questions Monuments du Bénin (attendu >= 20)');
  console.log('     Monuments du Bénin : ' + count);
});

test('pas de libellé anglais résiduel', () => {
  for (const q of questions) {
    assert.ok(!/buzz|steal|strike|sondage|twitter/i.test(q.q), 'anglais dans la question : ' + q.q);
    for (const o of q.options) {
      assert.ok(!/buzz|steal|strike|sondage|twitter/i.test(o), 'anglais dans une option : ' + q.q);
    }
  }
});

console.log('\n  ✓ tests banque de questions QCM réussis (' + passed + ')\n');
