/* =====================================================================
   js/app.js — orchestration CREATOR · QCM Quiz
   - Vue animateur (projection) et vue joueur (téléphone)
   - Le serveur envoie l'état ; on ne fait que l'afficher
   ===================================================================== */
(function (global) {
  'use strict';

  const {
    $, $$, on, show, hide, toggle, esc, fmt, secs,
    toast, openModal, closeModal, rankList, reaction, confetti, Sound,
  } = global.UI;

  const PHASE_LABEL = {
    lobby: 'Salle d’attente', countdown: 'Prêts ?', question: 'Question',
    reveal: 'Révélation', end: 'Fin de partie',
  };
  const LS = {
    host: 'gtq.host', player: 'gtq.player', role: 'gtq.role',
    name: 'gtq.name', avatar: 'gtq.avatar',
  };

  const App = {
    role: null, code: '', state: null, skew: 0, lastPhase: null,
    phoneScreen: 'pHome', avatarFrom: 'home', lbReturn: 'home',
    pending: null, hostSession: null, playerSession: null,
    playerName: '', avatar: null, answerFocusKey: '', xTimer: null,
    netWarned: false, lobbyCollapsed: false,
  };

  if (!global.Scene3D) {
    global.Scene3D = {
      ready: false, init: () => false, setRound: () => {},
      setPlayers: () => {}, react: () => {}, crowdReact: () => {},
      celebrate: () => {}, reset: () => {},
    };
  }

  /* ---------------- stockage ---------------- */
  function loadJSON(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
  }
  function saveJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }
  function clearKey(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }
  function loadAvatar() {
    let a = loadJSON(LS.avatar);
    if (!a || !a.colors) { a = global.Avatar.random(); saveJSON(LS.avatar, a); }
    return a;
  }

  /* ---------------- écrans ---------------- */
  function showPlayerScreen(id, force) {
    if (!force && App.phoneScreen === id) return;
    hide($('#hostView')); show($('#playerView'));
    $$('#playerView .screen').forEach((sec) => { if (sec.id === id) show(sec); else hide(sec); });
    App.phoneScreen = id;
    const main = $('.phone-main');
    if (main) main.scrollTop = 0;
    updatePhoneShell();
  }

  function showHostView() {
    hide($('#playerView')); show($('#hostView'));
    App.role = 'host';
  }

  function updatePhoneShell() {
    const inRoom = !!App.code && App.role === 'player';
    const btnLeave = $('#btnLeave');
    const phoneRoom = $('.phone-room');
    if (btnLeave) btnLeave.style.display = inRoom ? 'block' : 'none';
    if (phoneRoom) phoneRoom.style.display = (App.phoneScreen === 'pLobby') ? 'none' : (inRoom ? 'block' : 'none');
  }

  /* ---------------- réseau ---------------- */
  function netSend(type, data) {
    if (!global.Net || !global.Net.send) return;
    global.Net.send(type, data || {});
  }

  /* ---------------- rendu hôte ---------------- */
  function renderHostLobby(room) {
    const codeEl = $('#lobbyCode');
    if (codeEl) codeEl.textContent = room.code || '-----';
    const playersBox = $('#lobbyPlayers');
    if (playersBox) {
      playersBox.innerHTML = room.players.map((p) => `
        <div class="player-chip" style="background:${p.avatar.colors.jacket || '#0B35FE'}">
          ${esc(p.name)}
        </div>`).join('');
    }
    const nb = $('#hostNbPlayers');
    if (nb) nb.textContent = room.players.length + ' / ' + room.settings.maxPlayers;
    /* thèmes */
    const themeBtns = $$('#catButtons .cat-btn');
    themeBtns.forEach((b) => {
      const t = b.getAttribute('data-cat');
      b.classList.toggle('active', room.settings.themes.includes(t));
    });
    const durSel = $('#selDuration');
    if (durSel) durSel.value = room.settings.duration;
    const maxSel = $('#selMaxPlayers');
    if (maxSel) maxSel.value = room.settings.maxPlayers;
  }

  function renderHostGame(room) {
    const qBox = $('#hostQuestion');
    if (qBox && room.question) {
      qBox.innerHTML = `
        <div class="q-theme">${esc(room.question.theme)}</div>
        <div class="q-text">${esc(room.question.text)}</div>
        <div class="q-options">
          ${room.question.options.map((o, i) => `
            <div class="q-opt ${i === room.question.correctIndex ? 'q-opt-correct' : ''}" id="qopt${i}">
              <span class="q-opt-letter">${String.fromCharCode(65 + i)}</span>
              <span class="q-opt-text">${esc(o)}</span>
            </div>`).join('')}
        </div>
        <div class="q-timer" id="hostQTimer">${Math.ceil(room.timeLeft / 1000)}</div>
      `;
    }
    const ansBox = $('#hostAnswers');
    if (ansBox) {
      const answered = room.answers.length;
      const correct = room.answers.filter((a) => a.correct).length;
      ansBox.innerHTML = `
        <div class="ans-stat"><span>${answered}</span> / ${room.players.length} répondu</div>
        <div class="ans-stat"><span style="color:#00E472">${correct}</span> bonne${correct > 1 ? 's' : ''}</div>
      `;
    }
  }

  /* ---------------- rendu joueur ---------------- */
  function renderPlayerGame(s) {
    const me = s.me || {};
    if ($('#pQnum')) $('#pQnum').textContent = 'MANCHE ' + Math.min(s.qi + 1, s.qTotal) + ' / ' + s.qTotal;
    if ($('#pScore')) $('#pScore').textContent = fmt(me.score);

    if ($('#pQuestion') && s.question) {
      $('#pQuestion').innerHTML = `
        <div class="q-theme">${esc(s.question.theme)}</div>
        <div class="q-text">${esc(s.question.text)}</div>
      `;
    }

    const qcmBox = $('#pQcmOptions');
    const q = s.question;
    const isQCM = !!q && q.format === 'qcm';
    const canAnswer = s.phase === 'question' && s.canAnswer && !me.locked;
    if (qcmBox) {
      qcmBox.style.display = (isQCM && canAnswer) ? 'grid' : 'none';
      if (isQCM && q.options) {
        q.options.forEach((opt, i) => {
          const btn = qcmBox.querySelector('[data-idx="' + i + '"]');
          if (btn) {
            btn.textContent = String.fromCharCode(65 + i) + '. ' + esc(opt.text);
            btn.disabled = !canAnswer;
            btn.classList.remove('selected', 'correct', 'wrong');
            if (me.myAnswer === i) btn.classList.add('selected');
          }
        });
      }
    }

    const answer = $('#pAnswer');
    const send = $('#btnSubmit');
    if (answer) { answer.disabled = true; answer.style.display = isQCM ? 'none' : 'block'; }
    if (send) { send.disabled = true; send.style.display = isQCM ? 'none' : 'block'; }

    const status = $('#pStatus');
    if (status) {
      status.className = 'game-status';
      let text = 'En attente…';
      if (s.paused) text = 'Partie en pause';
      else if (s.phase === 'countdown') text = 'La question arrive…';
      else if (s.phase === 'question') {
        if (me.locked) text = 'Réponse envoyée, attends la suite…';
        else text = 'Choisis ta réponse !';
      } else if (s.phase === 'reveal') text = 'Révélation en cours…';
      else if (s.phase === 'end') text = 'Partie terminée.';
      status.textContent = text;
    }

    const timerWrap = $('#pTimerWrap');
    const timerVal = $('#pTimer');
    if (s.phase === 'question' && s.timeLeft > 0) {
      if (timerWrap) timerWrap.style.display = 'flex';
      if (timerVal) timerVal.textContent = Math.ceil(s.timeLeft / 1000);
    } else {
      if (timerWrap) timerWrap.style.display = 'none';
    }

    const found = $('#pFound');
    if (found) {
      found.innerHTML = (s.answers || []).map((a) => {
        const cls = a.correct ? 'found-ok' : 'found-miss';
        return '<span class="' + cls + '">' + esc(a.playerId.substring(0, 4)) + ' ' + (a.correct ? '✓' : '✗') + '</span>';
      }).join('');
    }
  }

  /* ---------------- choix QCM ---------------- */
  function selectQcmOption(idx) {
    const s = App.state;
    if (!s || !s.canAnswer || s.me.locked) return;
    const q = s.question;
    if (!q || q.format !== 'qcm') return;
    netSend('player:answer', { optionIdx: idx });
    Sound.play('click');
    $$('#pQcmOptions .qcm-option').forEach((b) => {
      b.disabled = true;
      const bIdx = Number(b.getAttribute('data-idx'));
      if (bIdx === idx) b.classList.add('selected');
    });
  }

  /* ---------------- événements serveur ---------------- */
  function onState(s) {
    App.state = s;
    if (App.role === 'host') {
      renderHostLobby(s);
      if (s.phase !== 'lobby') renderHostGame(s);
    } else if (App.role === 'player') {
      renderPlayerGame(s);
    }
  }

  function onEvent(ev) {
    const e = ev.event || ev;
    if (App.role === 'player') {
      if (e.kind === 'found') {
        reaction('found', 'BONNE RÉPONSE !', (e.text ? '+' + fmt(e.points) + ' pts' : ''), 1200);
        Sound.play('found');
      } else if (e.kind === 'miss') {
        reaction('miss', 'RATÉ', 'Tu es verrouillé pour cette question.', 1200);
        Sound.play('miss');
      } else if (e.kind === 'dup') {
        reaction('info', 'Déjà répondu', 'Tu as déjà répondu à cette question.', 800);
      }
    }
    if (App.role === 'host' && e.type === 'reveal') {
      global.Scene3D?.crowdReact?.('found');
    }
  }

  /* ---------------- initialisation ---------------- */
  function init() {
    /* enregistre les handlers auprès du module réseau */
    if (global.Net && global.Net.handlers) {
      global.Net.handlers.state = onState;
      global.Net.handlers.event = onEvent;
    }

    $$('#pQcmOptions .qcm-option').forEach((btn) => {
      on(btn, 'click', () => {
        const idx = Number(btn.getAttribute('data-idx'));
        selectQcmOption(idx);
      });
    });

    /* thème hôte */
    $$('#catButtons .cat-btn').forEach((btn) => {
      on(btn, 'click', () => {
        const t = btn.getAttribute('data-cat');
        if (!t) return;
        btn.classList.toggle('active');
        const active = $$('#catButtons .cat-btn.active').map((b) => b.getAttribute('data-cat'));
        const themes = active.includes('tout') ? ['tout'] : active;
        netSend('host:settings', { themes });
      });
    });

    const durSel = $('#selDuration');
    if (durSel) on(durSel, 'change', (e) => netSend('host:settings', { duration: Number(e.target.value) }));
    const maxSel = $('#selMaxPlayers');
    if (maxSel) on(maxSel, 'change', (e) => netSend('host:settings', { maxPlayers: Number(e.target.value) }));

    const btnStart = $('#btnHostMain');
    if (btnStart) on(btnStart, 'click', () => netSend('host:start'));

    const btnReveal = $('#btnHostReveal');
    if (btnReveal) on(btnReveal, 'click', () => netSend('host:reveal'));

    const btnNext = $('#btnHostSkip');
    if (btnNext) on(btnNext, 'click', () => netSend('host:next'));

    const btnClose = $('#btnHostClose');
    if (btnClose) on(btnClose, () => netSend('host:close'));

    const btnPause = $('#btnHostPause');
    if (btnPause) on(btnPause, () => {
      if (!App.state) return;
      netSend('host:pause', { paused: !App.state.paused });
    });

    global.App = App;
  }

  init();

})(window);
