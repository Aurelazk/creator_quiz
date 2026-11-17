/* =====================================================================
   shared/rules.js — moteur de règles isomorphe pour le QCM CREATOR Quiz
   Phases : LOBBY → COUNTDOWN → QUESTION → REVEAL → END
   Aucune dépendance externe : le moteur est pur et déterministe.
   La bonne réponse (correctIndex) ne quitte JAMAIS le serveur avant REVEAL.
   ===================================================================== */
(function (root, factory) {
  'use strict';
  if (typeof define === 'function' && define.amd) {
    define(factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Rules = factory();
  }
}(this, function () {
  'use strict';

  const PHASES = Object.freeze({
    LOBBY: 'lobby',
    COUNTDOWN: 'countdown',
    QUESTION: 'question',
    REVEAL: 'reveal',
    END: 'end',
  });

  const GAME_Q = 10;
  const COUNTDOWN_MS = 3000;
  const QUESTION_MS = 15000;
  const REVEAL_MS = 5000;
  const BONUS_MAX_PTS = 5;
  const BASE_PTS = 10;
  const DIFFICULTY_QUOTA = Object.freeze({ 1: 3, 2: 4, 3: 3 });

  const THEMES = Object.freeze([
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

  function isAllThemes(themes) {
    const cats = Array.isArray(themes) ? themes : [];
    return cats.length === 0 || cats.indexOf('tout') >= 0 || cats.indexOf('Tout mélanger') >= 0;
  }

  function pickQuestionsByTheme(bank, count, themes, askedHistory) {
    if (isAllThemes(themes)) {
      const fresh = bank.filter((q) => !askedHistory || !askedHistory.has(q.q));
      return shuffle(fresh).slice(0, Math.min(count || GAME_Q, fresh.length));
    }
    const cats = Array.isArray(themes) ? themes : [];
    const eligible = bank.filter((q) => {
      if (cats.indexOf(q.theme) < 0) return false;
      return !(askedHistory && askedHistory.has(q.q));
    });
    return shuffle(eligible).slice(0, Math.min(count || GAME_Q, eligible.length));
  }

  /* ------------------------------------------------------------------ */
  /* Sélection des 10 questions : 3 faciles, 4 moyennes, 3 difficiles.
     Si un thème manque de questions, on complète avec les autres thèmes
     et on retourne un avertissement pour l'animateur.
  ------------------------------------------------------------------ */
  function buildGameQuestions(bank, count, themes, askedHistory) {
    const total = Math.min(count || GAME_Q, bank.length);
    const warnings = [];
    const asked = askedHistory || new Set();
    const all = isAllThemes(themes);
    const cats = all ? [] : (Array.isArray(themes) ? themes.slice() : []);

    const inScope = (q) => all || cats.indexOf(q.theme) >= 0;
    const fresh = (q) => !asked.has(q.q);
    const chosen = [];
    const used = new Set();

    function take(pool, n) {
      let added = 0;
      for (const q of shuffle(pool)) {
        if (added >= n) break;
        if (used.has(q.q)) continue;
        chosen.push(q);
        used.add(q.q);
        added++;
      }
      return added;
    }

    /* 1. quota de difficulté dans les thèmes demandés */
    for (const difficulty of [1, 2, 3]) {
      const need = DIFFICULTY_QUOTA[difficulty] * (total / GAME_Q);
      const want = Math.max(0, Math.round(need));
      const pool = bank.filter((q) => q.difficulty === difficulty && inScope(q) && fresh(q));
      const got = take(pool, want);
      if (got < want) {
        warnings.push('Thème sélectionné : il manque ' + (want - got) +
          ' question' + (want - got > 1 ? 's' : '') + ' de difficulté ' + difficulty + '.');
      }
    }

    /* 2. complément hors difficulté, toujours dans les thèmes demandés */
    if (chosen.length < total) {
      take(bank.filter((q) => inScope(q) && fresh(q)), total - chosen.length);
    }

    /* 3. complément dans toute la banque si les thèmes sont épuisés */
    if (chosen.length < total) {
      const missing = total - chosen.length;
      take(bank.filter((q) => fresh(q)), missing);
      warnings.push('Les thèmes choisis sont épuisés : ' + missing +
        ' question' + (missing > 1 ? 's' : '') + ' ajoutée' + (missing > 1 ? 's' : '') + ' depuis les autres thèmes.');
    }

    /* 4. dernier recours : questions déjà posées dans cette salle */
    if (chosen.length < total) {
      const missing = total - chosen.length;
      take(bank, missing);
      warnings.push('La banque est épuisée : ' + missing +
        ' question' + (missing > 1 ? 's' : '') + ' déjà posée' + (missing > 1 ? 's' : '') + ' dans cette salle a été rejouée.');
    }

    /* difficultés équilibrées puis ordre mélangé */
    const balanced = balanceDifficulty(chosen);
    const picked = new Set(balanced.map((q) => q.q));
    for (const q of chosen) {
      if (balanced.length >= total) break;
      if (!picked.has(q.q)) { balanced.push(q); picked.add(q.q); }
    }
    return { questions: shuffle(balanced).slice(0, total), warnings };
  }

  /* Juge une réponse QCM. Le serveur est la seule autorité. */
  function judgeQCM(question, optionIdx, answered) {
    if (Array.isArray(answered) && answered.length) return { kind: 'dup' };
    const opt = question && question.options && question.options[optionIdx];
    if (!opt) return { kind: 'miss' };
    return optionIdx === question.correctIndex
      ? { kind: 'found', index: question.correctIndex, entry: opt }
      : { kind: 'miss' };
  }

  /* 10 pts de base + bonus de rapidité de 0 à 5 pts */
  function pointsForResponse(timeLeftMs, timeLimitMs) {
    if (timeLeftMs <= 0 || !timeLimitMs) return BASE_PTS;
    const ratio = Math.max(0, Math.min(1, timeLeftMs / timeLimitMs));
    const bonus = Math.floor(ratio * BONUS_MAX_PTS);
    return BASE_PTS + Math.min(bonus, BONUS_MAX_PTS);
  }

  function balanceDifficulty(questions) {
    const list = questions || [];
    const out = [];
    for (const difficulty of [1, 2, 3]) {
      out.push(...shuffle(list.filter((q) => q.difficulty === difficulty)).slice(0, DIFFICULTY_QUOTA[difficulty]));
    }
    const picked = new Set(out.map((q) => q.q));
    for (const q of shuffle(list)) {
      if (out.length >= GAME_Q) break;
      if (!picked.has(q.q)) { out.push(q); picked.add(q.q); }
    }
    return out;
  }

  function sortRanking(players) {
    return (players || []).slice().sort((a, b) =>
      (b.score || 0) - (a.score || 0) ||
      (b.correctCount || 0) - (a.correctCount || 0) ||
      (a.avgTimeMs || Infinity) - (b.avgTimeMs || Infinity)
    );
  }

  return {
    PHASES, GAME_Q, COUNTDOWN_MS, QUESTION_MS, REVEAL_MS,
    BASE_PTS, BONUS_MAX_PTS, DIFFICULTY_QUOTA, THEMES,
    shuffle, pickQuestions, pickQuestionsByTheme, isAllThemes,
    buildGameQuestions, judgeQCM, pointsForResponse, balanceDifficulty, sortRanking,
  };
}));
