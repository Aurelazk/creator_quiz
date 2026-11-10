import { Quiz, loadLevels, QUESTION_TIME } from './quiz.js';
import { DuelClient } from './duel.js';
import { fetchLeaderboard, postScore, subscribeLive } from './api.js';
import { sfx, unlockAudio } from './audio.js';
import { initLogoParticles } from './logo-particles.js';

const $ = (id) => document.getElementById(id);
const logo = initLogoParticles($('logo-canvas'));

let levels = [];
try {
  levels = await loadLevels();
} catch (error) {
  console.error('Chargement des niveaux impossible.', error);
}


function noopScene() {
  return {
    spinWheel: () => setTimeout(() => window.__spinEnd?.(Math.floor(Math.random() * 4)), 1200),
    onSpinEnd: (cb) => (window.__spinEnd = cb),
    highlightLevel: () => {},
    reactCorrect: () => {},
    reactWrong: () => {},
    win: () => {},
    reset: () => {},
  };
}

let scene3d;
try {
  const mod = await import('./three-scene.js');
  scene3d = mod.initScene($('bg-canvas'));
} catch (error) {
  console.warn('WebGL indisponible, mode 2D activé.', error);
  scene3d = noopScene();
}

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const intro = $('intro');

function finishIntro() {
  document.body.classList.add('is-loaded');
  if (!intro) return;
  intro.classList.add('is-out');
  window.setTimeout(() => {
    intro.hidden = true;
  }, reduceMotion ? 80 : 1150);
}

window.setTimeout(finishIntro, reduceMotion ? 120 : 1450);

let pseudo = '';
let lastMode = 'solo';
let lastDuelLevel = null;
let currentLevel = levels[0] || null;
let wheelReady = false;
let soloStartTimer = null;

let soloQuiz = null;
let gameStart = 0;

let duel = null;
let duelState = null;
let duelSelectedLevel = 'web';
let duelTimer = null;
let promptTimer = null;
let duelAnswered = true;
let promptSubmitted = false;
let duelEnded = false;

const savedPseudo = (() => {
  try {
    return localStorage.getItem('creator-pseudo') || '';
  } catch {
    return '';
  }
})();
if (savedPseudo) $('pseudo').value = savedPseudo;

function show(id) {
  document.querySelectorAll('.scene').forEach((scene) => scene.classList.remove('active'));
  const target = $(id);
  if (target) target.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getPseudo() {
  const input = $('pseudo');
  const value = input.value.trim().slice(0, 20);
  if (!value) {
    input.focus();
    input.style.boxShadow = '4px 4px 0 var(--coral)';
    setTimeout(() => (input.style.boxShadow = ''), 900);
    return null;
  }
  input.value = value;
  try {
    localStorage.setItem('creator-pseudo', value);
  } catch {
    /* stockage local indisponible */
  }
  return value;
}

function resetLegend() {
  document.querySelectorAll('#wheel-levels li').forEach((item) => item.classList.remove('is-picked'));
}

function pickLegend(levelId) {
  document.querySelectorAll('#wheel-levels li').forEach((item) => {
    item.classList.toggle('is-picked', item.dataset.level === levelId);
  });
}

function goHome() {
  clearTimeout(soloStartTimer);
  soloQuiz?.destroy();
  soloQuiz = null;
  if (duel) {
    duel.close();
    duel = null;
  }
  duelEnded = false;
  resetDuelUi();
  wheelReady = false;
  $('btn-spin').disabled = false;
  $('wheel-info').textContent = 'La roue hésite encore…';
  resetLegend();
  scene3d.reset();
  scene3d.highlightLevel(-1);
  show('scene-home');
  logo.burst();
}

document.querySelector('.masthead-brand').addEventListener('click', (event) => {
  event.preventDefault();
  goHome();
});

document.body.addEventListener('pointerdown', () => unlockAudio(), { once: true });

$('pseudo').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') $('btn-solo').click();
});

// ---------------- SOLO ----------------
$('btn-solo').onclick = () => {
  const value = getPseudo();
  if (!value) return;
  pseudo = value;
  lastMode = 'solo';
  unlockAudio();
  sfx.click();
  openWheel();
};

function openWheel() {
  clearTimeout(soloStartTimer);
  soloQuiz?.destroy();
  soloQuiz = null;
  wheelReady = false;
  lastMode = 'solo';
  $('btn-spin').disabled = false;
  $('wheel-info').textContent = 'La roue hésite encore…';
  resetLegend();
  scene3d.reset();
  scene3d.highlightLevel(-1);
  show('scene-wheel');
  logo.burst();
}

$('btn-wheel-back').onclick = () => goHome();

scene3d.onSpinEnd((index) => {
  const level = levels[index];
  if (!level) return;
  currentLevel = level;
  pickLegend(level.id);
  scene3d.highlightLevel(index);
  $('wheel-info').textContent = `${level.name} — ${level.description}`;
  soloStartTimer = setTimeout(() => startSolo(level), 1150);
});

$('btn-spin').onclick = () => {
  if (wheelReady) return;
  wheelReady = true;
  unlockAudio();
  sfx.spin();
  $('btn-spin').disabled = true;
  $('wheel-info').textContent = 'La roue tourne…';
  scene3d.spinWheel();
};

function startSolo(level) {
  clearTimeout(soloStartTimer);
  currentLevel = level;
  soloQuiz?.destroy();

  soloQuiz = new Quiz({
    level,
    questions: shuffle(level.questions),
    onCorrect: () => {
      sfx.correct();
      scene3d.reactCorrect();
    },
    onWrong: () => {
      sfx.wrong();
      scene3d.reactWrong();
    },
    onEnd: (score) => void finishSolo(score, level),
  });

  $('duel-hud').classList.add('hidden');
  $('duel-wait').classList.add('hidden');
  $('q-context').classList.add('hidden');
  $('q-context').textContent = '';
  $('q-explain').classList.add('hidden');
  $('q-explain').textContent = '';
  show('scene-quiz');
  gameStart = Date.now();
  soloQuiz.start();
}

async function finishSolo(score, level) {
  const time = Math.max(1, Math.round((Date.now() - gameStart) / 1000));
  let rank = '—';
  try {
    const response = await postScore(pseudo, score, time);
    if (response?.rank) rank = response.rank;
  } catch (error) {
    console.warn('Score non enregistré :', error);
  }

  if (score >= 1200) scene3d.win();
  else scene3d.reset();

  $('result-kicker').textContent = `Mode solo · Niveau ${String(level.number).padStart(2, '0')} · ${level.name}`;
  $('result-title').textContent = score >= 1800
    ? 'Impressionnant.'
    : score >= 1000
      ? 'Bien joué.'
      : score >= 500
        ? 'Pas mal.'
        : 'On recommence ?';
  $('result-score').textContent = `Score : ${score} pts · Temps : ${time}s`;
  $('result-rank').textContent = `Rang : ${rank}`;
  $('result-detail').textContent = `${level.short} · 10 questions · ${level.description}`;
  await loadBoard();
  show('scene-result');
}

// ---------------- DUEL : salon ----------------
document.querySelectorAll('#level-options .level-option').forEach((button) => {
  button.onclick = () => {
    duelSelectedLevel = button.dataset.level;
    document.querySelectorAll('#level-options .level-option').forEach((item) => {
      item.classList.toggle('is-active', item === button);
    });
  };
});

$('btn-duel').onclick = () => {
  const value = getPseudo();
  if (!value) return;
  pseudo = value;
  unlockAudio();
  sfx.click();
  openDuelLobby();
};

function ensureDuel() {
  if (duel) return duel;

  duel = new DuelClient({
    onRoomCreated: (msg) => {
      $('btn-create-room').disabled = false;
      $('btn-join-room').disabled = false;
      renderRoom(msg.room);
    },
    onRoomJoined: (msg) => {
      $('btn-create-room').disabled = false;
      $('btn-join-room').disabled = false;
      renderRoom(msg.room);
    },
    onRoomState: (msg) => {
      if (msg.room.state === 'waiting') renderRoom(msg.room);
    },
    onRoomLeft: () => {},
    onRoomError: (msg) => {
      $('btn-create-room').disabled = false;
      $('btn-join-room').disabled = false;
      showDuelError(msg.message || 'Salon indisponible.');
    },
    onStart: handleDuelStart,
    onQuestion: handleDuelQuestion,
    onAnswerResult: handleDuelAnswerResult,
    onState: handleDuelState,
    onPromptStart: handlePromptStart,
    onPromptSubmitted: () => {
      $('prompt-status').textContent = 'Prompt envoyé. En attente de l’autre joueur…';
    },
    onPromptState: (msg) => {
      if (!promptSubmitted) {
        $('prompt-status').textContent = `${msg.submitted} / ${msg.total} prompt(s) envoyé(s)…`;
      }
    },
    onPromptResult: renderPromptResult,
    onEnd: (msg) => void handleDuelEnd(msg),
    onOpponentLeft: (msg) => {
      const wait = $('duel-wait');
      wait.textContent = `${msg.pseudo} a quitté le duel…`;
      wait.classList.remove('hidden');
    },
    onError: () => {
      $('btn-create-room').disabled = false;
      $('btn-join-room').disabled = false;
      showDuelError('Connexion instable. Réessaie dans un instant.');
    },
    onClose: () => {
      if (duelEnded || lastMode !== 'duel') return;
      $('btn-create-room').disabled = false;
      $('btn-join-room').disabled = false;
      showDuelError('Connexion perdue. Relance le mode duel.');
      const wait = $('duel-wait');
      if (wait) {
        wait.textContent = 'Connexion perdue.';
        wait.classList.remove('hidden');
      }
      duel = null;
    },
  });

  duel.connect(pseudo);
  return duel;
}

function openDuelLobby() {
  lastMode = 'duel';
  duelEnded = false;
  resetDuelUi();
  $('duel-setup').classList.remove('hidden');
  $('room-panel').classList.add('hidden');
  $('duel-error').classList.add('hidden');
  $('btn-create-room').disabled = false;
  $('btn-join-room').disabled = false;
  $('join-code').value = '';
  show('scene-duel');
  ensureDuel();
}

function showDuelError(message) {
  const error = $('duel-error');
  error.textContent = message;
  error.classList.remove('hidden');
}

function renderRoom(room) {
  $('duel-setup').classList.add('hidden');
  $('room-panel').classList.remove('hidden');
  $('duel-error').classList.add('hidden');
  $('room-code').textContent = room.code;
  $('room-level').textContent = `Niveau ${String(room.level.number).padStart(2, '0')} · ${room.level.name}`;

  const players = $('room-players');
  players.innerHTML = '';
  room.players.forEach((player) => {
    const tag = document.createElement('span');
    tag.textContent = player.id === room.hostId ? `${player.pseudo} · hôte` : player.pseudo;
    players.appendChild(tag);
  });

  $('duel-status').textContent = room.players.length < 2
    ? 'En attente de ton adversaire…'
    : 'Deux joueurs prêts. Lancement du duel…';
}

$('btn-create-room').onclick = () => {
  const value = getPseudo();
  if (!value) return;
  pseudo = value;
  $('duel-error').classList.add('hidden');
  $('btn-create-room').disabled = true;
  ensureDuel().createRoom(duelSelectedLevel);
};

$('join-code').addEventListener('input', () => {
  const input = $('join-code');
  input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
});

$('join-code').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') $('btn-join-room').click();
});

$('btn-join-room').onclick = () => {
  const value = getPseudo();
  if (!value) return;
  const code = $('join-code').value.trim().toUpperCase();
  if (code.length !== 4) {
    showDuelError('Le code d’un salon contient 4 caractères.');
    $('join-code').focus();
    return;
  }
  pseudo = value;
  $('duel-error').classList.add('hidden');
  $('btn-join-room').disabled = true;
  ensureDuel().joinRoom(code);
};

$('btn-cancel-room').onclick = () => {
  if (duel) {
    duel.leave();
    duel = null;
  }
  openDuelLobby();
};

// ---------------- DUEL : quiz ----------------
function resetDuelUi() {
  clearInterval(duelTimer);
  clearInterval(promptTimer);
  duelTimer = null;
  promptTimer = null;
  duelState = null;
  duelAnswered = true;
  promptSubmitted = false;
  duelEnded = false;
  $('duel-hud').classList.add('hidden');
  $('duel-wait').classList.add('hidden');
  $('q-context').classList.add('hidden');
  $('q-context').textContent = '';
  $('q-explain').classList.add('hidden');
  $('q-explain').textContent = '';
  $('answers').innerHTML = '';
  $('prompt-result').classList.add('hidden');
  $('prompt-duelists').innerHTML = '';
  $('prompt-status').textContent = '';
  $('prompt-input').disabled = false;
  $('btn-submit-prompt').disabled = false;
}

function handleDuelStart(msg) {
  duelEnded = false;
  lastDuelLevel = msg.level || null;
  duelState = {
    matchId: msg.matchId,
    selfId: msg.selfId,
    total: msg.total,
    level: msg.level,
    players: msg.players || [],
  };

  const self = duelState.players.find((player) => player.id === duelState.selfId);
  const opponent = duelState.players.find((player) => player.id !== duelState.selfId);

  $('duel-self-name').textContent = self ? self.pseudo : pseudo;
  $('duel-opp-name').textContent = opponent ? opponent.pseudo : 'Adversaire';
  $('duel-self-score').textContent = '0';
  $('duel-opp-score').textContent = '0';
  $('duel-opp-progress').textContent = `0 / ${msg.total}`;
  $('duel-hud').classList.remove('hidden');
  $('duel-wait').classList.add('hidden');
  $('q-progress').textContent = `01 / ${String(msg.total).padStart(2, '0')}`;
  $('q-score').textContent = '0 pts';
  $('q-timer').textContent = `${QUESTION_TIME}s`;
  $('q-timer').classList.remove('is-low');
  $('q-context').classList.add('hidden');
  $('q-explain').classList.add('hidden');
  $('question-text').textContent = 'Préparation du duel…';
  $('answers').innerHTML = '';

  if (msg.level) {
    $('q-level').textContent = msg.level.name;
    $('q-level').style.setProperty('--level-color', msg.level.color);
  }
  $('q-kind').textContent = 'Duel en cours';
  show('scene-quiz');
}

function handleDuelQuestion(msg) {
  if (!duelState) return;
  duelState.total = msg.total;
  if (msg.level) duelState.level = msg.level;
  duelAnswered = false;

  const self = msg.players?.find((player) => player.id === duelState.selfId);
  const opponent = msg.players?.find((player) => player.id !== duelState.selfId);
  if (self) $('duel-self-score').textContent = self.score;
  if (opponent) {
    $('duel-opp-score').textContent = opponent.score;
    $('duel-opp-progress').textContent = `${Math.min(opponent.index, msg.total)} / ${msg.total}`;
  }

  $('q-progress').textContent = `${String(msg.index + 1).padStart(2, '0')} / ${String(msg.total).padStart(2, '0')}`;
  $('q-timer').textContent = `${msg.duration}s`;
  $('q-timer').classList.remove('is-low');
  $('q-level').textContent = msg.level ? msg.level.name : 'Duel';
  if (msg.level) $('q-level').style.setProperty('--level-color', msg.level.color);
  $('q-kind').textContent = 'Question éclair';
  $('question-text').textContent = msg.q;
  $('duel-wait').classList.add('hidden');

  const context = $('q-context');
  context.textContent = msg.context || '';
  context.classList.toggle('hidden', !msg.context);

  $('q-explain').textContent = '';
  $('q-explain').classList.add('hidden');

  const box = $('answers');
  box.innerHTML = '';
  msg.a.forEach((label, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'answer';

    const key = document.createElement('span');
    key.className = 'answer-key';
    key.textContent = String.fromCharCode(65 + index);

    const text = document.createElement('span');
    text.className = 'answer-label';
    text.textContent = label;

    button.append(key, text);
    button.onclick = () => submitDuelAnswer(msg.index, index);
    box.appendChild(button);
  });

  startDuelTimer(msg.duration);
}

function startDuelTimer(seconds) {
  clearInterval(duelTimer);
  let left = seconds;
  $('q-timer').textContent = `${left}s`;
  duelTimer = setInterval(() => {
    left--;
    const timer = $('q-timer');
    timer.textContent = `${Math.max(0, left)}s`;
    timer.classList.toggle('is-low', left <= 5);
    if (left <= 0) {
      clearInterval(duelTimer);
      document.querySelectorAll('#answers .answer').forEach((button) => (button.disabled = true));
    }
  }, 1000);
}

function submitDuelAnswer(index, choice) {
  if (duelAnswered || !duelState) return;
  duelAnswered = true;
  clearInterval(duelTimer);

  const buttons = document.querySelectorAll('#answers .answer');
  buttons.forEach((button) => (button.disabled = true));
  buttons[choice]?.classList.add('selected');

  duel.answer(duelState.matchId, index, choice);
}

function handleDuelAnswerResult(msg) {
  clearInterval(duelTimer);
  const buttons = document.querySelectorAll('#answers .answer');
  buttons.forEach((button, index) => {
    button.disabled = true;
    if (index === msg.correctIndex) button.classList.add('correct');
    if (index !== msg.correctIndex && button.classList.contains('selected')) button.classList.add('wrong');
  });

  if (msg.explain) {
    const explain = $('q-explain');
    explain.textContent = msg.explain;
    explain.classList.remove('hidden');
  }

  $('q-score').textContent = `${msg.score} pts`;
  $('duel-self-score').textContent = msg.score;
  $('q-timer').textContent = msg.timedOut
    ? 'Temps écoulé'
    : msg.gained > 0
      ? `+${msg.gained} pts`
      : 'Raté';

  if (msg.correct) {
    sfx.correct();
    scene3d.reactCorrect();
  } else {
    sfx.wrong();
    scene3d.reactWrong();
  }

  if (duelState && msg.index + 1 >= duelState.total) {
    $('duel-wait').textContent = 'Quiz terminé — préparation du Prompt Battle…';
    $('duel-wait').classList.remove('hidden');
  }
}

function handleDuelState(msg) {
  if (!duelState) return;
  const self = msg.players.find((player) => player.id === duelState.selfId);
  const opponent = msg.players.find((player) => player.id !== duelState.selfId);

  if (self) {
    $('duel-self-score').textContent = self.score;
    $('q-score').textContent = `${self.score} pts`;
  }
  if (opponent) {
    $('duel-opp-score').textContent = opponent.score;
    $('duel-opp-progress').textContent = `${Math.min(opponent.index, duelState.total)} / ${duelState.total}`;
  }
  if (self?.finished && opponent && !opponent.finished) {
    $('duel-wait').classList.remove('hidden');
  }
}

// ---------------- PROMPT BATTLE ----------------
function handlePromptStart(msg) {
  clearInterval(promptTimer);
  promptSubmitted = false;
  duelAnswered = true;

  $('prompt-theme').textContent = msg.theme;
  $('prompt-rubric').textContent = msg.rubric || 'Clarté, contexte, contraintes, format de sortie';
  $('prompt-timer').textContent = `${msg.duration}s`;
  $('prompt-input').value = '';
  $('prompt-input').disabled = false;
  $('btn-submit-prompt').disabled = false;
  $('prompt-count').textContent = '0 / 600';
  $('prompt-status').textContent = 'Écris ton prompt. Le jury applique les critères affichés.';
  $('prompt-result').classList.add('hidden');
  $('prompt-duelists').innerHTML = '';
  show('scene-prompt');

  let left = msg.duration;
  promptTimer = setInterval(() => {
    left--;
    $('prompt-timer').textContent = `${Math.max(0, left)}s`;
    if (left <= 0) {
      clearInterval(promptTimer);
      $('prompt-input').disabled = true;
      $('btn-submit-prompt').disabled = true;
      if (!promptSubmitted) $('prompt-status').textContent = 'Temps écoulé. Le jury va délibérer…';
    }
  }, 1000);

  setTimeout(() => $('prompt-input').focus(), 100);
}

$('prompt-input').addEventListener('input', () => {
  $('prompt-count').textContent = `${$('prompt-input').value.length} / 600`;
});

$('btn-submit-prompt').onclick = () => {
  if (!duelState || promptSubmitted) return;
  const text = $('prompt-input').value.trim();
  if (!text) {
    $('prompt-status').textContent = 'Écris au moins une phrase avant d’envoyer.';
    $('prompt-input').focus();
    return;
  }

  promptSubmitted = true;
  clearInterval(promptTimer);
  $('prompt-timer').textContent = 'Envoyé';
  $('prompt-input').disabled = true;
  $('btn-submit-prompt').disabled = true;
  $('prompt-status').textContent = 'Prompt envoyé. En attente de l’autre joueur…';
  duel.submitPrompt(duelState.matchId, text);
  sfx.click();
};

function renderPromptResult(msg) {
  clearInterval(promptTimer);
  $('prompt-timer').textContent = 'Terminé';
  $('prompt-input').disabled = true;
  $('btn-submit-prompt').disabled = true;
  $('prompt-result-theme').textContent = msg.theme;

  const list = $('prompt-duelists');
  list.innerHTML = '';
  msg.players.forEach((player) => {
    const card = document.createElement('article');
    card.className = `prompt-card${player.id === msg.selfId ? ' is-self' : ''}`;

    const head = document.createElement('div');
    head.className = 'prompt-card-head';
    const name = document.createElement('strong');
    name.textContent = player.id === msg.selfId ? `${player.pseudo} · toi` : player.pseudo;
    const points = document.createElement('span');
    points.textContent = `${player.promptScore} / 100`;
    head.append(name, points);

    const prompt = document.createElement('p');
    prompt.textContent = player.prompt;

    const detail = document.createElement('small');
    detail.textContent = `${player.feedback} Quiz ${player.quizScore} + prompt ${player.promptScore} = ${player.score} pts.`;

    card.append(head, prompt, detail);
    list.appendChild(card);
  });

  $('prompt-result').classList.remove('hidden');
  $('prompt-status').textContent = 'Résultats affichés. Podium dans un instant…';
}

// ---------------- FIN DE DUEL ----------------
async function handleDuelEnd(msg) {
  duelEnded = true;
  clearInterval(duelTimer);
  clearInterval(promptTimer);
  if (!duelState) return;

  const self = msg.players.find((player) => player.id === duelState.selfId);
  const opponent = msg.players.find((player) => player.id !== duelState.selfId);
  if (!self || !opponent) return;

  const draw = !msg.winnerId;
  const win = msg.winnerId === duelState.selfId;
  const forfeit = msg.reason === 'forfeit';
  const level = msg.level || lastDuelLevel;

  $('result-kicker').textContent = level
    ? `Mode duel · Niveau ${String(level.number).padStart(2, '0')} · ${level.name}`
    : 'Mode duel · CREATOR Challenge';
  $('result-title').textContent = draw
    ? 'Égalité.'
    : win
      ? forfeit
        ? 'Victoire par forfait.'
        : 'Victoire.'
      : 'Défaite.';
  $('result-score').textContent = `${self.pseudo} ${self.score} pts — ${opponent.pseudo} ${opponent.score} pts`;
  $('result-rank').textContent = self.rank ? `Ton rang : ${self.rank}` : 'Rang : —';

  if (forfeit) {
    $('result-detail').textContent = `${opponent.pseudo} a quitté la partie. ${level ? level.description : ''}`;
  } else {
    $('result-detail').textContent = `Quiz ${self.quizScore} pts · Prompt Battle ${self.promptScore} pts · ${level ? level.short : 'Duel'} · temps ${self.totalTime}s.`;
  }

  if (win) {
    sfx.win();
    scene3d.win();
  } else if (!draw) {
    sfx.wrong();
    scene3d.reset();
  }

  if (duel) {
    duel.close();
    duel = null;
  }

  await loadBoard();
  show('scene-result');
}

// ---------------- CLASSEMENT / NAVIGATION ----------------
function scoreEntry(entry, index, compact = false) {
  const li = document.createElement('li');

  const rank = document.createElement('span');
  rank.className = 'rank';
  rank.textContent = String(index + 1).padStart(2, '0');

  const name = document.createElement('strong');
  name.textContent = entry.pseudo || 'Anonyme';

  const points = document.createElement('span');
  points.className = 'pts';
  points.textContent = compact
    ? `${Number(entry.score)} pts`
    : `${Number(entry.score)} pts · ${Number(entry.time)}s`;

  li.append(rank, name, points);
  return li;
}

async function loadBoard() {
  let list = [];
  try {
    list = await fetchLeaderboard();
  } catch {
    list = [];
  }

  const podium = $('podium');
  const leaderboard = $('leaderboard');
  podium.innerHTML = '';
  leaderboard.innerHTML = '';

  if (!list.length) {
    const empty = document.createElement('li');
    empty.className = 'podium-empty';
    empty.textContent = 'Aucun score pour l’instant. À toi de jouer.';
    podium.appendChild(empty);
    return;
  }

  list.slice(0, 3).forEach((entry, index) => podium.appendChild(scoreEntry(entry, index)));
  list.slice(0, 12).forEach((entry, index) => leaderboard.appendChild(scoreEntry(entry, index, true)));
}

$('btn-replay').onclick = () => {
  if (lastMode === 'duel') {
    openDuelLobby();
    return;
  }
  openWheel();
};

$('btn-menu').onclick = () => goHome();

subscribeLive((msg) => {
  if (msg.type === 'new-score' && $('scene-result').classList.contains('active')) {
    loadBoard();
  }
});
