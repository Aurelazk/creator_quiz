/* =====================================================================
   tests/questions.test.js — validation de la banque de questions
   Structure : category, difficulty (1-3), source, fact, pointsEstimes.
   Objectif : >= 15 questions Histoire/Monuments du Bénin.
   ===================================================================== */
'use strict';

const assert = require('assert');
const path = require('path');

const FILE = path.join(__dirname, '..', 'server', 'questions.json');
const questions = require(FILE);

const KNOWN_CATEGORIES = new Set([
  'Histoire du Bénin',
  'Monuments et patrimoine',
  'Culture et traditions',
  'Gastronomie',
  'Géographie',
  'Sport',
  'Musique et arts',
  'Vie étudiante et technologie',
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

console.log('\nCREATOR · tests banque de questions\n');

test('banque non vide (' + questions.length + ' questions)', () => {
  assert.ok(questions.length >= 40, 'trop peu de questions : ' + questions.length);
});

test('chaque question a category, difficulty, source, fact', () => {
  for (const q of questions) {
    assert.ok(KNOWN_CATEGORIES.has(q.category), 'catégorie inconnue : ' + q.category + ' (' + q.q + ')');
    assert.ok(Number.isInteger(q.difficulty) && q.difficulty >= 1 && q.difficulty <= 3, 'difficulté invalide : ' + q.q);
    assert.ok(q.source && q.source.trim(), 'source manquante : ' + q.q);
    assert.ok(q.fact && q.fact.trim(), 'fact manquant : ' + q.q);
  }
});

test('total des points = 100, 5-8 réponses, alias non vides', () => {
  for (const q of questions) {
    const total = q.answers.reduce((s, a) => s + Number(a.pts || 0), 0);
    assert.strictEqual(total, 100, 'total pts != 100 : ' + q.q + ' (' + total + ')');
    assert.ok(q.answers.length >= 5 && q.answers.length <= 8, 'nombre de réponses : ' + q.q);
    for (const a of q.answers) {
      assert.ok(a.text && a.text.trim(), 'réponse sans texte : ' + q.q);
      assert.ok(Array.isArray(a.aliases) && a.aliases.length > 0, 'aliases vides : ' + q.q + ' / ' + a.text);
      for (const alias of a.aliases) {
        assert.ok(typeof alias === 'string' && alias.trim().length > 0, 'alias vide : ' + q.q);
      }
    }
  }
});

test('pas de doublons de questions', () => {
  const seen = new Set();
  for (const q of questions) {
    assert.ok(!seen.has(q.q), 'question dupliquée : ' + q.q);
    seen.add(q.q);
  }
});

test('au moins 15 questions Histoire/Monuments du Bénin', () => {
  const count = questions.filter(
    (q) => q.category === 'Histoire du Bénin' || q.category === 'Monuments et patrimoine',
  ).length;
  assert.ok(count >= 15, 'seulement ' + count + ' questions Histoire/Monuments (attendu >= 15)');
  console.log('     Histoire du Bénin : ' + questions.filter((q) => q.category === 'Histoire du Bénin').length);
  console.log('     Monuments et patrimoine : ' + questions.filter((q) => q.category === 'Monuments et patrimoine').length);
});

test('pas de libellé anglais résiduel (Twitter corrigé en X)', () => {
  for (const q of questions) {
    assert.ok(!/twitter/i.test(q.q), 'libellé anglais dans la question : ' + q.q);
    for (const a of q.answers) {
      assert.ok(!/twitter/i.test(a.text), 'libellé anglais dans une réponse : ' + q.q);
      for (const alias of a.aliases) {
        assert.ok(!/twitter/i.test(alias), 'alias anglais : ' + q.q + ' / ' + alias);
      }
    }
  }
});

console.log('\n  ✓ tests banque de questions réussis (' + passed + ')\n');
