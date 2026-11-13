/* =====================================================================
   js/game.js — règles de Guess Their Answer (côté hôte)
   Banque de questions : chargée UNIQUEMENT par l'hôte (survey-questions.js)
   ===================================================================== */
(function (global) {
  'use strict';

  const GAME_Q = 10;          // manches par partie
  const DEFAULT_DURATION = 60;
  const SPEED_WINDOW = 10000; // bonus de rapidité sur les 10 premières secondes
  const SPEED_MAX = 0.25;     // +25 % max
  const MAX_LEV = 2;          // distance de Levenshtein max (C# AnswerMatcher maxDistance = 2)

  /* ---------- normalisation ---------- */
  const ACCENTS = /[\u0300-\u036f]/g;
  function normalize(value) {
    return String(value == null ? '' : value)
      .toLowerCase()
      .normalize('NFD').replace(ACCENTS, '')
      .replace(/[\u2019\u2018']/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  /* ---------- distance de Levenshtein (bornée) ---------- */
  function levenshtein(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
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
   * Comparaison tolérante entre la saisie et une réponse de la banque.
   * Sémantique C# AnswerMatcher.Evaluate :
   *   - égalité exacte après normalisation (couvre alias)
   *   - pluriel simple ("langage"/"langages")
   *   - faute de frappe Levenshtein : dist <= 2 ET dist <= 25 % de la longueur max
   *   - JAMAIS de "contains" (défaut corrigé : "chat" ne valide pas "achat",
   *     une extension par préfixe/suffixe d'un seul caractère est rejetée).
   */
  function matches(guess, entry) {
    const g = normalize(guess);
    if (!g) return false;
    const candidates = [entry.text].concat(entry.aliases || []);
    for (const raw of candidates) {
      const c = normalize(raw);
      if (!c) continue;
      if (g === c) return true;
      // pluriel simple : "langage"/"langages"
      const gs = g.replace(/s$/, ''), cs = c.replace(/s$/, '');
      if (gs.length > 3 && gs === cs) return true;
      // Levenshtein borné (C# : dist <= maxDistance && dist <= maxLen * 0.25)
      const maxLen = Math.max(g.length, c.length);
      const dist = levenshtein(g, c);
      if (dist <= MAX_LEV && dist <= Math.floor(maxLen * 0.25)) {
        // défaut corrigé : une insertion/suppression en bordure (préfixe ou suffixe)
        // d'un seul caractère ne suffit pas (ex. "chat" dans "achat").
        if (Math.abs(g.length - c.length) === 1 && dist === 1) {
          const longer = g.length > c.length ? g : c;
          const shorter = g.length > c.length ? c : g;
          if (longer.startsWith(shorter) || longer.endsWith(shorter)) continue;
        }
        return true;
      }
    }
    return false;
  }

  /* ---------- banque de questions (hôte seulement) ---------- */
  let BANK = null;
function loadBank(src) {
  if (BANK) return Promise.resolve(BANK);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src || 'survey-questions.js';
    let settled = false;
    const onLoad = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      s.remove();
      if (!global.SURVEY_QUESTIONS || !global.SURVEY_QUESTIONS.length) {
        reject(new Error('Banque de questions vide')); return;
      }
      BANK = global.SURVEY_QUESTIONS;
      resolve(BANK);
    };
    const onError = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      s.remove();
      reject(new Error('Banque de questions introuvable'));
    };
    s.onload = onLoad;
    s.onerror = onError;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      s.onload = null;
      s.onerror = null;
      s.remove();
      reject(new Error('Banque de questions : timeout'));
    }, 10000);
    document.head.appendChild(s);
  });
}
  const bank = () => BANK || [];

  function pickQuestions(n) {
    const all = bank().slice();
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all.slice(0, Math.min(n || GAME_Q, all.length));
  }

  /* ---------- scoring ---------- */
  function speedFactor(elapsedMs) {
    if (elapsedMs >= SPEED_WINDOW) return 1;
    const left = 1 - Math.max(0, elapsedMs) / SPEED_WINDOW;
    return 1 + SPEED_MAX * left;
  }
  function pointsFor(entry, elapsedMs, multiplier) {
    return Math.max(1, Math.round(entry.pts * speedFactor(elapsedMs) * (multiplier || 1)));
  }

  /**
   * Valide une proposition de joueur contre la question courante.
   * Renvoie { kind: 'found' | 'dup' | 'miss', entry?, index?, pts? }.
   */
  function judge(question, guess, revealed, elapsedMs, multiplier) {
    for (let i = 0; i < question.answers.length; i++) {
      const entry = question.answers[i];
      if (matches(guess, entry)) {
        if (revealed.some((r) => r.i === i)) return { kind: 'dup', entry, index: i };
        return { kind: 'found', entry, index: i, pts: pointsFor(entry, elapsedMs, multiplier) };
      }
    }
    return { kind: 'miss' };
  }

  /* ---------- données d'affichage sûres ---------- */
  /** Ce que les téléphones ont le droit de recevoir. */
  function publicQuestion(question) {
    return { text: question.q, slots: question.answers.length };
  }

  global.Game = {
    GAME_Q, DEFAULT_DURATION, SPEED_WINDOW,
    normalize, levenshtein, matches, speedFactor, pointsFor, judge,
    loadBank, bank, pickQuestions, publicQuestion,
  };
})(window);
