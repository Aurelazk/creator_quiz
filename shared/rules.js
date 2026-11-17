/* =====================================================================
   shared/rules.js — moteur de règles isomorphe pour le QCM CREATOR Quiz
   Phases : LOBBY → COUNTDOWN → QUESTION → REVEAL → END
   Aucune dépendance externe : le moteur est pur et déterministe.
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

  const GAME_Q = 10;           // nombre de questions par partie
  const COUNTDOWN_MS = 3000;   // 3 s de décompte avant chaque question
  const QUESTION_MS = 15000;   // 15 s pour répondre (configurable 10/15/20)
  const REVEAL_MS = 5000;      // 5 s de révélation (bonne réponse + fait amusant)
  const BONUS_MAX_PTS = 5;     // bonus de rapidité max (0 à 5 pts)

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

  /* ------------------------------------------------------------------ */
  /* Sélection de questions par thème                                   */
  /* ------------------------------------------------------------------ */
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

  function pickQuestionsByTheme(bank, count, themes, askedHistory) {
    const cats = Array.isArray(themes) ? themes : [];
    const onlyAll = cats.length === 0 || cats.includes('tout') || cats.includes('Tout mélanger');
    const eligible = bank.filter((q, idx) => {
      if (!onlyAll && !cats.includes(q.theme)) return false;
      if (askedHistory && askedHistory.has(q.q)) return false;
      return true;
    });
    return shuffle(eligible).slice(0, Math.min(count || GAME_Q, eligible.length));
  }

  /* ------------------------------------------------------------------ */
  /* Juge une réponse QCM : `optionIdx` est l'index de l'option choisie (0-3).
     Retourne { kind: 'found' | 'miss' | 'dup', index, entry }.
  ------------------------------------------------------------------ */
  function judgeQCM(question, optionIdx, answeredOptions) {
    const opt = question.options && question.options[optionIdx];
    if (!opt) return { kind: 'miss' };
    const correctIdx = question.correctIndex != null ? question.correctIndex : 0;
    if (answeredOptions && answeredOptions.includes(correctIdx)) {
      return { kind: 'dup', index: correctIdx, entry: question.options[correctIdx] };
    }
    if (optionIdx === correctIdx) {
      return { kind: 'found', index: correctIdx, entry: question.options[correctIdx] };
    }
    return { kind: 'miss' };
  }

  /* ------------------------------------------------------------------ */
  /* Calcul des points : 10 pts de base + bonus de rapidité (0-5)       */
  /* ------------------------------------------------------------------ */
  function pointsForResponse(timeLeftMs, timeLimitMs) {
    const base = 10;
    if (timeLeftMs <= 0) return base;
    const ratio = timeLeftMs / timeLimitMs; // 1 = répondu instantanément, 0 = à la dernière seconde
    const bonus = Math.floor(ratio * BONUS_MAX_PTS);
    return base + Math.min(bonus, BONUS_MAX_PTS);
  }

  /* ------------------------------------------------------------------ */
  /* Équilibrage des thèmes : 3 faciles, 4 moyennes, 3 difficiles       */
  /* ------------------------------------------------------------------ */
  function balanceDifficulty(questions) {
    const easy = questions.filter((q) => q.difficulty === 1);
    const medium = questions.filter((q) => q.difficulty === 2);
    const hard = questions.filter((q) => q.difficulty === 3);
    return [
      ...shuffle(easy).slice(0, 3),
      ...shuffle(medium).slice(0, 4),
      ...shuffle(hard).slice(0, 3),
    ];
  }

  return {
    PHASES,
    GAME_Q,
    COUNTDOWN_MS,
    QUESTION_MS,
    REVEAL_MS,
    BONUS_MAX_PTS,
    THEMES,
    shuffle,
    pickQuestions,
    pickQuestionsByTheme,
    judgeQCM,
    pointsForResponse,
    balanceDifficulty,
  };
}));
