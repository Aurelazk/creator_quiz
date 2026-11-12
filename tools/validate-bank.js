#!/usr/bin/env node
/* =====================================================================
   tools/validate-bank.js — validation de la banque survey-questions.js
   Verifie : pas de doublon d'alias entre reponses d'une meme question,
             pts decroissants, somme 90-110, 5-6 reponses,
             aucune reponse vide.
   Usage : node tools/validate-bank.js [chemin/vers/survey-questions.js]
   ===================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

const src = process.argv[2] || path.join(__dirname, '..', 'js', 'survey-questions.js');
if (!fs.existsSync(src)) {
  console.error('Fichier introuvable :', src);
  process.exit(1);
}

/* On extrait le tableau SURVEY_QUESTIONS en executant le fichier dans un
   contexte Node minimal (pas de navigateur). */
const code = fs.readFileSync(src, 'utf8');
const sandbox = { window: { SURVEY_QUESTIONS: undefined } };
const wrapper = new Function('window', code + '; return window.SURVEY_QUESTIONS;');
let questions;
try {
  questions = wrapper(sandbox.window);
} catch (e) {
  console.error('Erreur lors de l execution de la banque :', e.message);
  process.exit(1);
}

if (!Array.isArray(questions) || questions.length === 0) {
  console.error('Aucune question trouvee.');
  process.exit(1);
}

let errors = 0;
let warns = 0;

function fail(qIdx, msg) {
  errors++;
  console.log(`  [Q${qIdx + 1}] ERREUR : ${msg}`);
}

questions.forEach((q, qi) => {
  const label = `Q${qi + 1}`;
  if (!q.q || !String(q.q).trim()) { fail(qi, 'question vide'); }
  const ans = q.answers;
  if (!Array.isArray(ans)) { fail(qi, 'answers n est pas un tableau'); return; }
  if (ans.length < 5 || ans.length > 6) {
    fail(qi, `${ans.length} reponses (attendu 5-6)`);
  }
  let sum = 0;
  let prevPts = Infinity;
  const seenAliases = new Set();
  const aliasOwner = new Map();
  const seenTexts = new Set();
  ans.forEach((a, ai) => {
    if (!a.text || !String(a.text).trim()) { fail(qi, `reponse #${ai + 1} vide`); }
    seenTexts.add(String(a.text || '').trim().toLowerCase());
    if (typeof a.pts !== 'number' || !Number.isFinite(a.pts)) {
      fail(qi, `pts invalide pour "${a.text}"`);
    } else {
      sum += a.pts;
      if (a.pts >= prevPts) {
        fail(qi, `pts non decroissants : ${prevPts} puis ${a.pts} ("${a.text}")`);
      }
      prevPts = a.pts;
    }
    (a.aliases || []).forEach((alias) => {
      const key = String(alias || '').trim().toLowerCase();
      const t = a.text || '(sans texte)';
      if (!key) { fail(qi, 'alias vide pour "' + t + '"'); return; }
      if (seenAliases.has(key)) {
        const owner = aliasOwner.get(key);
        fail(qi, `alias en double "${key}" (deja declare pour "${owner}")`);
      }
      seenAliases.add(key);
      aliasOwner.set(key, a.text || '(sans texte)');
    });
  });
  if (sum < 90 || sum > 110) {
    fail(qi, `somme des pts = ${sum} (attendu 90-110)`);
  } else {
    warns++;
    console.log(`  [Q${qi + 1}] OK : ${ans.length} reponses, somme=${sum}`);
  }
});

console.log('\n== Rapport ==');
console.log('Questions :', questions.length);
console.log('Erreurs :', errors);
console.log('Questions validees (somme 90-110) :', warns);
process.exit(errors > 0 ? 1 : 0);
