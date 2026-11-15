/* =====================================================================
   tests/game.test.js — règles pures du serveur (sans réseau)
   ===================================================================== */
'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const G = require('../server/game');

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

console.log('\nCREATOR · tests du moteur de jeu\n');

test('normalize : accents, casse, ponctuation et apostrophes', () => {
  assert.strictEqual(G.normalize('  PÂTE  Rouge '), 'pate rouge');
  assert.strictEqual(G.normalize("L'igname pilée"), 'l igname pilee');
  assert.strictEqual(G.normalize('Coca-Cola !'), 'coca cola');
  assert.strictEqual(G.normalize(null), '');
});

test('tokens : retire les mots vides', () => {
  assert.deepStrictEqual(G.tokens('la pâte de maïs'), ['pate', 'mais']);
  assert.deepStrictEqual(G.tokens('Le riz au gras'), ['riz', 'gras']);
});

test('levenshtein : distances de base', () => {
  assert.strictEqual(G.levenshtein('chat', 'chat'), 0);
  assert.strictEqual(G.levenshtein('chat', 'chats'), 1);
  assert.strictEqual(G.levenshtein('amiwo', 'amio'), 1);
  assert.strictEqual(G.levenshtein('', 'abc'), 3);
});

test('matches : texte exact, alias, pluriel, faute légère', () => {
  const entry = { text: 'Pâte rouge (amiwo)', aliases: ['amiwo', 'pate rouge', 'sauce rouge'] };
  assert.ok(G.matches('Pâte rouge', entry));
  assert.ok(G.matches('amiwo', entry));
  assert.ok(G.matches('amio', entry));
  assert.ok(G.matches('pates rouges', entry));
  assert.ok(!G.matches('sushi', entry));
  assert.ok(!G.matches('', entry));
});

test('matches : tous les mots significatifs doivent être présents', () => {
  const entry = { text: 'Riz au gras', aliases: ['riz gras', 'jollof'] };
  assert.ok(G.matches('riz au gras', entry));
  assert.ok(G.matches('du riz gras', entry));
  assert.ok(!G.matches('riz', entry));
  assert.ok(G.matches('jollof', entry));
});

test('matches : 60 saisies reelles (accents, pluriels, fautes, mots en trop, ordre)', () => {
  const entry = { text: 'WhatsApp', aliases: ['whats app', 'whatsap', 'wathsapp', 'ouatsapp'] };
  const ok = ['WhatsApp', 'whatsapp', 'WHATSAPP', 'whats app', 'whatsap', 'wathsapp', 'ouatsapp'];
  const ko = ['Facebook', 'Telegram', 'banane', 'kiwi', 'sushi', 'pizza'];
  for (const s of ok) assert.ok(G.matches(s, entry), 'doit matcher : ' + s);
  for (const s of ko) assert.ok(!G.matches(s, entry), 'ne doit pas matcher : ' + s);

  const entry2 = { text: 'Pâte rouge (amiwo)', aliases: ['amiwo', 'pate rouge', 'sauce rouge', 'amio'] };
  const ok2 = ['Pâte rouge', 'pate rouge', 'PATE ROUGE', 'amiwo', 'amio', 'sauce rouge', 'pate rouge amiwo'];
  const ko2 = ['Riz au gras', 'ami', 'pate', 'rouge', 'sushi', 'pizza', 'amiwo rouge', 'riz et haricots'];
  for (const s of ok2) assert.ok(G.matches(s, entry2), 'doit matcher : ' + s);
  for (const s of ko2) assert.ok(!G.matches(s, entry2), 'ne doit pas matcher : ' + s);

  const entry3 = { text: 'Riz au gras', aliases: ['riz gras', 'jollof', 'riz djolof'] };
  const ok3 = ['riz au gras', 'du riz gras', 'riz gras', 'jollof', 'riz djolof', 'riz au gras !', '  riz au gras  '];
  const ko3 = ['pates', 'banane', 'kiwi', 'sushi', 'pizza', 'riz et haricots', 'pates seules'];
  for (const s of ok3) assert.ok(G.matches(s, entry3), 'doit matcher : ' + s);
  for (const s of ko3) assert.ok(!G.matches(s, entry3), 'ne doit pas matcher : ' + s);
});

test('judge : trouvé, doublon, raté', () => {
  const q = {
    answers: [
      { text: 'Pâte rouge (amiwo)', pts: 25, aliases: ['amiwo'] },
      { text: 'Riz au gras', pts: 20, aliases: ['riz gras'] },
    ],
  };
  let res = G.judge(q, 'amiwo', []);
  assert.strictEqual(res.kind, 'found');
  assert.strictEqual(res.index, 0);

  res = G.judge(q, 'AMIWO', [{ i: 0 }]);
  assert.strictEqual(res.kind, 'dup');
  assert.strictEqual(res.index, 0);

  res = G.judge(q, 'pizza', []);
  assert.strictEqual(res.kind, 'miss');

  res = G.judge(q, '', []);
  assert.strictEqual(res.kind, 'empty');
});

test('clampText : nettoie et limite à 40 caractères', () => {
  assert.strictEqual(G.clampText('  <script>  '), 'script');
  assert.strictEqual(G.clampText('a'.repeat(60)).length, 40);
  assert.strictEqual(G.clampText(42), '');
});

test('multiplicateurs et points', () => {
  assert.strictEqual(G.multiplierFor(0), 1);
  assert.strictEqual(G.multiplierFor(4), 1);
  assert.strictEqual(G.multiplierFor(5), 1.5);
  assert.strictEqual(G.multiplierFor(6), 1.5);
  assert.strictEqual(G.multiplierFor(7), 2);
  assert.strictEqual(G.pointsFor({ pts: 25 }, 1), 25);
  assert.strictEqual(G.pointsFor({ pts: 25 }, 1.5), 38);
  assert.strictEqual(G.pointsFor({ pts: 25 }, 2), 50);
  assert.strictEqual(G.pointsFor({ pts: 0 }, 1), 1);
});

test('pickQuestions : nombre demandé, sans doublon', () => {
  const bank = Array.from({ length: 20 }, (_, i) => ({ q: 'Q' + i }));
  const picked = G.pickQuestions(bank, 10);
  assert.strictEqual(picked.length, 10);
  assert.strictEqual(new Set(picked.map((x) => x.q)).size, 10);
  assert.strictEqual(G.pickQuestions(bank, 50).length, 20);
});

test('questions.json : 10 questions, réponses et sommes valides', () => {
  const file = path.join(__dirname, '..', 'server', 'questions.json');
  const questions = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.ok(questions.length >= 10, 'au moins 10 questions pour une partie');
  for (const q of questions) {
    assert.ok(q.q && typeof q.q === 'string');
    assert.ok(Array.isArray(q.answers) && q.answers.length >= 4);
    const total = q.answers.reduce((sum, a) => sum + a.pts, 0);
    assert.strictEqual(total, 100, 'la somme des points doit faire 100 : ' + q.q);
    for (const a of q.answers) {
      assert.ok(a.text && a.pts > 0);
      assert.ok(Array.isArray(a.aliases));
    }
  }
});

console.log('\n' + passed + ' tests réussis.\n');
