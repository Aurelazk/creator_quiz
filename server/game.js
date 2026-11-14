/* =====================================================================
   server/game.js — règles autoritaires de Guess Their Answer
   Aucune de ces fonctions ne dépend du client : le serveur décide tout.
   ===================================================================== */
'use strict';

const PHASES = Object.freeze({
  LOBBY: 'lobby',
  BUZZ: 'buzz',
  PLAY: 'play',
  STEAL: 'steal',
  REVEAL: 'reveal',
  END: 'end',
});

const GAME_Q = 10;
const BUZZ_MS = 10000;
const STEAL_MS = 12000;
const REVEAL_MS = 6000;
const MAX_STRIKES = 3;
const MAX_GUESS_LEN = 40;

const ACCENTS = /[\u0300-\u036f]/g;
const STOP_WORDS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'd', 'l', 'au', 'aux',
  'et', 'ou', 'a', 'en', 'dans', 'sur', 'pour', 'avec', 'son', 'sa', 'ses',
  'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'ce', 'cet', 'cette', 'ces',
]);

function normalize(value) {
  return String(value == null ? '' : value)
    .toLowerCase()
    .normalize('NFD').replace(ACCENTS, '')
    .replace(/[\u2019\u2018']/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function tokens(value) {
  return normalize(value).split(' ').filter((w) => w && !STOP_WORDS.has(w));
}

function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = new Array(n + 1), cur = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    const tmp = prev; prev = cur; cur = tmp;
  }
  return prev[n];
}

/**
 * Comparaison tolérante : accents, casse, pluriel, fautes légères, articles,
 * et inclusion de tous les mots significatifs (synonymes fournis par alias).
 */
function matches(guess, entry) {
  const g = normalize(guess);
  if (!g) return false;
  const gTokens = tokens(guess);
  const candidates = [entry.text].concat(entry.aliases || []);
  for (const raw of candidates) {
    const c = normalize(raw);
    if (!c) continue;
    if (g === c) return true;
    const gs = g.replace(/s$/, '');
    const cs = c.replace(/s$/, '');
    if (gs.length > 3 && gs === cs) return true;
    const maxLen = Math.max(g.length, c.length);
    const dist = levenshtein(g, c);
    if (dist <= 2 && dist <= Math.floor(maxLen * 0.25)) {
      if (Math.abs(g.length - c.length) === 1 && dist === 1) {
        const longer = g.length > c.length ? g : c;
        const shorter = g.length > c.length ? c : g;
        if (longer.startsWith(shorter) || longer.endsWith(shorter)) continue;
      }
      return true;
    }
    // Tous les mots significatifs de la réponse sont présents dans la saisie.
    const cTokens = tokens(raw);
    if (cTokens.length > 1 && gTokens.length >= cTokens.length) {
      const set = new Set(gTokens);
      if (cTokens.every((t) => set.has(t) || set.has(t.replace(/s$/, '')))) return true;
    }
  }
  return false;
}

function clampText(raw) {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, MAX_GUESS_LEN);
}

function judge(question, guess, board) {
  const text = clampText(guess);
  if (!text) return { kind: 'empty' };
  for (let i = 0; i < question.answers.length; i++) {
    if (board.some((r) => r.i === i)) {
      if (matches(text, question.answers[i])) return { kind: 'dup', index: i, entry: question.answers[i] };
      continue;
    }
    if (matches(text, question.answers[i])) {
      return { kind: 'found', index: i, entry: question.answers[i] };
    }
  }
  return { kind: 'miss' };
}

function multiplierFor(qi) {
  if (qi >= 7) return 2;
  if (qi >= 5) return 1.5;
  return 1;
}

function pointsFor(entry, multiplier) {
  return Math.max(1, Math.round(entry.pts * (multiplier || 1)));
}

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickQuestions(bank, count) {
  return shuffle(bank).slice(0, Math.min(count || GAME_Q, bank.length));
}

module.exports = {
  PHASES, GAME_Q, BUZZ_MS, STEAL_MS, REVEAL_MS, MAX_STRIKES,
  normalize, tokens, levenshtein, matches, clampText, judge,
  multiplierFor, pointsFor, shuffle, pickQuestions,
};
