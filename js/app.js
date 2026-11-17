(function (global) {
  'use strict';

  const { $, $$, on, show, hide, esc, fmt, toast, rankList, reaction, confetti, Sound } = global.UI;
  const G = global.Rules;

  const LS = {
    name: 'creator.name',
    avatar: 'creator.avatar',
    host: 'creator.host',
    players: 'creator.players',
  };
  const SCREENS = ['pHome', 'pAvatar', 'pLobby', 'pGame', 'pEnd', 'pLeaderboard'];

  const App = {
    role: null,
    code: '',
    state: null,
    name: '',
    avatar: null,
    hostToken: '',
    playerTokens: {},
    pendingAuth: null,
    phoneScreen: 'pHome',
    avatarFrom: 'pHome',
    lbReturn: 'pHome',
    queuedMode: false,
    lastQi: -1,
    lastPhase: '',
    timerId: null,
    countdownId: null,
    countdownStart: 0,
    checkedUpdate: false,
    sceneLoading: false,
    netWarned: false,
  };

  function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; }
  }
  function saveJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }
  function clearKey(key) { try { localStorage.removeItem(key); } catch (e) {} }

  function storedCode() {
    const p = new URLSearchParams(location.search);
    const room = (p.get('room') || p.get('code') || '').trim().toUpperCase();
    return /^[A-Z2-9]{5}$/.test(room) ? room : '';
  }

  function isHostUrl() {
    const p = new URLSearchParams(location.search);
    return p.has('host') || p.get('view') === 'host';
  }

  function send(type, data) {
    if (global.Net && global.Net.connected) global.Net.send(type, data || {});
  }

  function authenticate(auth) {
    App.pendingAuth = auth;
    if (global.Net && global.Net.connected) flushAuth();
    else global.Net.connect();
  }

  function flushAuth() {
    const auth = App.pendingAuth;
    if (!auth) return;
    App.pendingAuth = null;
    send(auth.type, auth.payload);
  }

  function showHostView() {
    hide($('#playerView'));
    show($('#hostView'));
    App.role = 'host';
    loadScene();
  }

  function showPlayerScreen(id) {
    if (!id) return;
    hide($('#hostView'));
    show($('#playerView'));
    SCREENS.forEach((sid) => {
      const el = $('#' + sid);
      if (el) el.classList.toggle('hidden', sid !== id);
    });
    App.phoneScreen = id;
    const main = $('.phone-main');
    if (main) main.scrollTop = 0;
    const inRoom = !!App.code && App.role === 'player';
    const leave = $('#btnLeave');
    const room = $('.phone-room');
    if (leave) leave.classList.toggle('hidden', !inRoom);
    if (room) {
      room.textContent = inRoom ? 'Salle ' + App.code : '';
      room.style.display = inRoom && id !== 'pLobby' ? '' : 'none';
    }
  }

  function startHost() {
    App.name = App.name || $('#pseudo') && $('#pseudo').value.trim() || 'Animateur';
    App.code = '';
    authenticate({ type: 'host:create', payload: { name: App.name, settings: hostSettings() } });
    toast('#phoneToasts', 'Création de la salle…', 'info', 2000);
  }

  function hostSettings() {
    const themes = $$('#catButtons .cat-btn.active').map((b) => b.getAttribute('data-cat'));
    return {
      duration: Number($('#selDuration') && $('#selDuration').value) || 15,
      maxPlayers: Number($('#selMaxPlayers') && $('#selMaxPlayers').value) || 20,
      themes: themes.length ? themes : ['tout'],
      mode: ($('#selMode') && $('#selMode').value) || 'solo',
    };
  }

  function reconnectHost(saved) {
    App.code = saved.code;
    App.hostToken = saved.token;
    authenticate({ type: 'host:rejoin', payload: { code: saved.code, hostToken: saved.token } });
  }

  function joinRoom() {
    const code = ($('#codeIn') && $('#codeIn').value || '').trim().toUpperCase();
    if (!/^[A-Z2-9]{5}$/.test(code)) { toast('#phoneToasts', 'Code invalide : 5 caractères (pas de I, L, O, 0 ni 1).', 'error'); return; }
    const name = ($('#pseudo') && $('#pseudo').value.trim()) || App.name || 'Joueur';
    App.name = name;
    saveJSON(LS.name, name);
    const token = App.playerTokens[code] || null;
    App.code = code;
    App.role = 'player';
    App.queuedMode = false;
    authenticate({ type: 'player:join', payload: { code, name, token, avatar: App.avatar } });
    toast('#phoneToasts', 'Connexion à la salle…', 'info', 1800);
  }

  function queueRoom() {
    const code = App.code || storedCode();
    if (!code) return;
    authenticate({ type: 'player:queue', payload: { code, name: App.name || 'Joueur', avatar: App.avatar } });
    App.queuedMode = false;
    const btn = $('#btnJoin');
    if (btn) btn.textContent = 'Rejoindre la partie';
  }

  function leaveRoom() {
    if (App.role !== 'player') return;
    send('player:leave', {});
    clearKey(LS.players + '.' + App.code);
    delete App.playerTokens[App.code];
    App.code = '';
    App.state = null;
    App.role = null;
    showPlayerScreen('pHome');
    const codeIn = $('#codeIn');
    if (codeIn) codeIn.value = '';
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function loadScene() {
    if (global.Scene3D && global.Scene3D.ready) return;
    if (App.sceneLoading) return;
    App.sceneLoading = true;
    const canvas = $('#scene');
    const ensureThree = global.THREE ? Promise.resolve() : loadScript('assets/vendor/three.min.js');
    ensureThree
      .then(() => global.Scene3D ? null : loadScript('js/scene.js'))
      .then(() => {
        if (!global.Scene3D || !canvas) return;
        global.Scene3D.init(canvas);
        try { global.Scene3D.setRoom && global.Scene3D.setRoom(App.code); } catch (e) {}
        try { global.Scene3D.setLobby && global.Scene3D.setLobby(true); } catch (e) {}
      })
      .catch(() => {})
      .then(() => { App.sceneLoading = false; });
  }

  function qrUrl(code) {
    const base = (global.Net && global.Net.publicUrl) || location.origin;
    return base.replace(/\/+$/, '') + '/?room=' + encodeURIComponent(code);
  }

  function refreshQr(code) {
    const url = qrUrl(code);
    const src = ((global.Net && global.Net.apiBase && global.Net.apiBase()) || '') + '/api/qr?text=' + encodeURIComponent(url);
    ['qrImg', 'qrImgBig'].forEach((id) => { const el = $('#' + id); if (el) el.src = src; });
    ['joinUrl', 'qrUrl'].forEach((id) => { const el = $('#' + id); if (el) el.textContent = url; });
    ['lobbyCode', 'qrCode', 'lobbyReopenCode', 'hostCode'].forEach((id) => { const el = $('#' + id); if (el) el.textContent = code; });
  }

  function setNetStatus(connected) {
    const host = $('#hostReconnect');
    const phone = $('#phoneReconnect');
    if (host) host.classList.toggle('hidden', connected || App.role !== 'host');
    if (phone) phone.classList.toggle('hidden', connected || App.role !== 'player');
    if (connected) {
      App.netWarned = false;
      flushAuth();
    } else if (!App.netWarned) {
      App.netWarned = true;
    }
  }

  function renderLobbyPlayers(s) {
    const hostBox = $('#lobbyPlayers');
    if (hostBox) {
      const players = s.players || [];
      hostBox.innerHTML = players.length
        ? players.map((p) => '<button type="button" class="player-chip" data-token="' + esc(p.id) + '" title="Retirer ' + esc(p.name) + '">' +
            (global.Avatar ? global.Avatar.svg(p.avatar) : '') + '<span>' + esc(p.name) + '</span>' +
            (p.team ? '<small>' + esc(p.team) + '</small>' : '') + '</button>').join('')
        : '<p class="hint">En attente des joueurs…</p>';
      $$('.player-chip', hostBox).forEach((btn) => {
        on(btn, 'click', () => send('host:kick', { playerId: btn.getAttribute('data-token') }));
      });
    }
    const playerBox = $('#pLobbyList');
    if (playerBox) {
      playerBox.innerHTML = (s.players || []).map((p) =>
        '<div class="lobby-player">' + (global.Avatar ? global.Avatar.svg(p.avatar) : '') +
        '<span>' + esc(p.name) + '</span>' + (p.team ? '<small>' + esc(p.team) + '</small>' : '') + '</div>'
      ).join('');
    }
    const preview = $('#lobbyPreview');
    if (preview) preview.textContent = (s.players || []).length + ' joueur(s) connecté(s)';
    const count = $('#hostNbPlayers');
    if (count) count.textContent = (s.players || []).length + ' / ' + s.settings.maxPlayers;
  }

  function renderHost(s) {
    const phase = s.phase;
    const hostView = $('#hostView');
    if (hostView) hostView.classList.toggle('is-reveal', phase === 'reveal');
    $('#hostCode').textContent = s.code;
    $('#hostRound').textContent = phase === 'lobby' ? 'SALLE D’ATTENTE' : phase === 'end' ? 'FIN DE PARTIE' : 'MANCHE ' + Math.min(s.qi + 1, s.qTotal) + ' / ' + s.qTotal;
    $('#hostPhase').textContent = s.paused ? 'En pause' : (phase === 'countdown' ? 'Prêts ?' : phase === 'question' ? 'En cours' : phase === 'reveal' ? 'Révélation' : 'Salle d’attente');
    const warn = $('#hostWarning');
    if (warn) {
      const msgs = s.themeWarnings || [];
      warn.textContent = msgs.join(' ');
      warn.classList.toggle('hidden', !msgs.length || phase !== 'lobby');
    }
    refreshQr(s.code);
    renderLobbyPlayers(s);

    const lobby = $('#hostLobby');
    if (lobby) lobby.classList.toggle('hidden', phase !== 'lobby');
    const reopen = $('#btnLobbyOpen');
    if (reopen) reopen.classList.toggle('hidden', phase !== 'lobby');
    const endModal = $('#hostEnd');
    if (endModal) endModal.classList.toggle('hidden', phase !== 'end');
    const paused = $('#hostPaused');
    if (paused) paused.classList.toggle('hidden', !s.paused);

    const mainBtn = $('#btnHostMain');
    if (mainBtn) {
      mainBtn.classList.toggle('hidden', phase !== 'lobby' && phase !== 'end');
      mainBtn.textContent = phase === 'end' ? 'Rejouer' : 'Lancer la partie';
    }
    ['btnHostReveal', 'btnHostNext', 'btnHostPause'].forEach((id) => {
      const el = $('#' + id);
      if (el) el.classList.toggle('hidden', phase !== 'question' && phase !== 'reveal');
    });
    const pauseBtn = $('#btnHostPause');
    if (pauseBtn) pauseBtn.textContent = s.paused ? 'Reprendre' : 'Pause';
    const nextBtn = $('#btnHostNext');
    if (nextBtn) nextBtn.classList.toggle('hidden', phase !== 'reveal');

    const theme = $('#hostTheme');
    const question = $('#hostQuestion');
    const options = $('#hostOptions');
    const reveal = $('#hostReveal');
    if (theme) theme.textContent = (s.question && s.question.theme) || '';
    if (question) {
      question.textContent = s.question ? s.question.text
        : phase === 'countdown' ? 'La question arrive…'
        : phase === 'end' ? 'Partie terminée !' : 'En attente des joueurs…';
    }
    if (options) {
      if (s.question && (phase === 'question' || phase === 'reveal')) {
        options.innerHTML = s.question.options.map((o, i) => {
          const r = phase === 'reveal' && s.reveal;
          let cls = 'host-option';
          if (r && i === r.correctIndex) cls += ' correct';
          else if (r && r.answers && r.answers.some((a) => a.playerId === (s.me && s.me.id) && a.optionIdx === i && !a.correct)) cls += ' wrong';
          return '<div class="' + cls + '" id="hostOpt' + i + '"><span class="q-opt-letter">' + esc(o.id) + '</span><span>' + esc(o.text) + '</span></div>';
        }).join('');
      } else {
        options.innerHTML = '';
      }
    }
    if (reveal) {
      const r = s.reveal;
      const visible = !!(phase === 'reveal' && r);
      reveal.classList.toggle('hidden', !visible);
      if (visible) {
        reveal.innerHTML = '<div class="reveal-title">' + (r.winnerName ? esc(r.winnerName) + ' répond juste !' : 'Personne n’a trouvé…') + '</div>' +
          '<div class="reveal-answer">Bonne réponse : ' + esc(r.correctText) + '</div>' +
          (r.fact ? '<div class="reveal-fact">' + esc(r.fact) + '</div>' : '');
      }
    }
    const answers = $('#hostAnswers');
    if (answers) {
      answers.textContent = phase === 'question' || phase === 'reveal'
        ? (s.answerCount || 0) + ' / ' + (s.players || []).length + ' réponses' : '';
    }
    const timerWrap = $('#hostTimerWrap');
    if (timerWrap) timerWrap.classList.toggle('hidden', phase !== 'question');
    const timer = $('#hostTimer');
    if (timer) timer.textContent = Math.max(0, Math.ceil((s.timeLeft || 0) / 1000));
    const countdown = $('#hostCountdown');
    if (countdown) countdown.classList.toggle('hidden', phase !== 'countdown');

    const scoreboard = $('#hostScoreboard');
    if (scoreboard) {
      scoreboard.innerHTML = (s.ranking || []).slice(0, 5).map((p, i) =>
        '<span class="score-chip"><b>' + (i + 1) + '</b> ' + esc(p.name) + ' <strong>' + fmt(p.score) + '</strong></span>'
      ).join('');
    }
    const board = $('#board');
    if (board) {
      board.innerHTML = (s.players || []).map((p) =>
        '<div class="board-player" style="--jacket:' + esc((p.avatar && p.avatar.colors && p.avatar.colors.jacket) || '#0B35FE') + '">' +
        (global.Avatar ? global.Avatar.svg(p.avatar) : '') + '<span>' + esc(p.name) + '</span><b>' + fmt(p.score) + '</b></div>'
      ).join('');
    }
    if (phase === 'end') renderEnd(s, '#hostWinner', '#hostRank');
    updateScene(s);
  }

  function renderEnd(s, winnerSel, rankSel) {
    const podium = s.podium || [];
    const winner = $(winnerSel);
    if (winner) winner.textContent = podium.length ? '🏆 ' + podium[0].name + ' — ' + fmt(podium[0].score) + ' pts' : '';
    const list = $(rankSel);
    if (list) {
      list.innerHTML = (s.scores || s.ranking || []).map((p) =>
        '<li class="rank-item"><span class="rank-pos">' + (p.rank || '') + '</span><span class="rank-name">' + esc(p.name) + '</span><span class="rank-score">' + fmt(p.score) + '</span></li>'
      ).join('');
    }
  }

  function updateScene(s) {
    const scene = global.Scene3D;
    if (!scene || !scene.ready) return;
    try {
      if (scene.setPlayers) scene.setPlayers((s.players || []).map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, score: p.score })));
      if (scene.setRound) scene.setRound({ qi: s.qi, total: s.qTotal, phase: s.phase, theme: s.question && s.question.theme });
    } catch (e) {}
  }

  function renderPlayer(s) {
    const me = s.me || {};
    const phase = s.phase;
    const wanted = phase === 'lobby' ? 'pLobby' : phase === 'end' ? 'pEnd' : 'pGame';
    showPlayerScreen(wanted);
    if ($('#pLobbyCode')) $('#pLobbyCode').textContent = s.code;
    if ($('#pQnum')) $('#pQnum').textContent = 'MANCHE ' + Math.min(s.qi + 1, s.qTotal) + ' / ' + s.qTotal;
    if ($('#pScore')) $('#pScore').textContent = fmt(me.score);
    const qBox = $('#pQuestion');
    if (qBox) {
      qBox.innerHTML = s.question && (phase === 'question' || phase === 'reveal')
        ? '<div class="q-theme">' + esc(s.question.theme) + '</div><div class="q-text">' + esc(s.question.text) + '</div>'
        : phase === 'countdown' ? '<div class="q-wait">La question arrive…</div>' : '';
    }
    const optsBox = $('#pQcmOptions');
    if (optsBox) {
      const opts = s.question && s.question.options || [];
      optsBox.classList.toggle('hidden', !(s.question && phase === 'question'));
      $$('.qcm-option', optsBox).forEach((btn) => {
        const idx = Number(btn.getAttribute('data-idx'));
        const label = $('.qcm-label', btn);
        if (label) label.textContent = opts[idx] ? opts[idx].text : '';
        const isMine = me.myAnswer === idx;
        let cls = 'qcm-option';
        if (isMine) cls += ' selected';
        if (phase === 'reveal' && s.reveal) {
          if (idx === s.reveal.correctIndex) cls += ' correct';
          else if (isMine) cls += ' wrong';
        }
        btn.className = cls;
        btn.disabled = phase !== 'question' || !!me.answered || s.paused;
      });
    }
    const revealCard = $('#pReveal');
    if (revealCard) {
      const r = s.reveal;
      const visible = !!(phase === 'reveal' && r);
      revealCard.classList.toggle('hidden', !visible);
      if (visible) {
        revealCard.innerHTML = '<div class="reveal-title">' + (r.winnerId === me.id ? 'Bonne réponse ! +' + fmt(r.winnerPoints) + ' pts' : r.winnerName ? esc(r.winnerName) + ' a trouvé' : 'Personne n’a trouvé') + '</div>' +
          '<div class="reveal-answer">Bonne réponse : ' + esc(r.correctText) + '</div>' +
          (r.fact ? '<div class="reveal-fact">' + esc(r.fact) + '</div>' : '');
      }
    }
    const status = $('#pStatus');
    if (status) {
      status.textContent = s.paused ? 'Partie en pause'
        : phase === 'countdown' ? 'Prêts ?'
        : phase === 'question' ? (me.answered ? 'Réponse envoyée, attends la suite…' : 'Choisis ta réponse !')
        : phase === 'reveal' ? 'Révélation…' : '';
    }
    const timerWrap = $('#pTimerWrap');
    if (timerWrap) timerWrap.classList.toggle('hidden', phase !== 'question');
    if (phase === 'end') renderEnd(s, '#pWinner', '#pRank');
    renderLobbyPlayers(s);
    updateTimer(s);
  }

  function updateTimer(s) {
    const timer = $('#pTimer');
    if (!timer || !s || s.phase !== 'question') return;
    const end = (s.serverNow || Date.now()) + (s.timeLeft || 0);
    timer.textContent = Math.max(0, Math.ceil((end - Date.now()) / 1000));
  }

  function startCountdown() {
    stopCountdown();
    App.countdownStart = Date.now();
    const num = $('#hostCountdownNum');
    if (num) num.textContent = '3';
    App.countdownId = setInterval(() => {
      const elapsed = Date.now() - App.countdownStart;
      const value = Math.max(1, 3 - Math.floor(elapsed / 1000));
      if (num) num.textContent = value;
      if (elapsed >= G.COUNTDOWN_MS) stopCountdown();
    }, 100);
  }

  function stopCountdown() {
    if (App.countdownId) clearInterval(App.countdownId);
    App.countdownId = null;
  }

  function onState(msg) {
    const s = msg.state;
    if (!s) return;
    if (msg.role === 'host' && App.role !== 'host') return;
    App.state = s;
    if (App.role === 'host') renderHost(s);
    else if (App.role === 'player') renderPlayer(s);
    if (s.qi !== App.lastQi) {
      App.lastQi = s.qi;
      if (s.phase === 'countdown') startCountdown();
      if (App.role === 'player' && s.phase === 'question' && s.me && !s.me.answered) Sound.play('click');
    }
    App.lastPhase = s.phase;
  }

  function onEvent(msg) {
    const e = msg.event || msg;
    if (e && e.type === 'theme-warning') {
      e.messages.forEach((m) => toast('#hostToasts', m, 'info', 4000));
      return;
    }
    if (e && e.type === 'player-joined') {
      if (App.role === 'host' && App.state && App.state.phase === 'lobby') Sound.play('join');
      return;
    }
    if (e && e.type === 'kicked') {
      toast('#phoneToasts', e.message || 'Tu as été retiré de la salle.', 'error', 3000);
      setTimeout(leaveRoom, 400);
      return;
    }
    if (e && e.type === 'reveal') {
      reaction('found', '', e.correctText, 1600);
      const scene = global.Scene3D;
      if (scene && scene.ready) { try { scene.celebrate && scene.celebrate(e.winnerName || ''); } catch (err) {} }
      if (App.role === 'host') confetti($('#confetti'), 2);
      return;
    }
    if (App.role !== 'player') return;
    if (e.kind === 'found') {
      reaction('found', 'BONNE RÉPONSE !', e.points ? '+' + fmt(e.points) + ' pts' : '', 1200);
      Sound.play('found');
    } else if (e.kind === 'miss') {
      reaction('miss', 'RATÉ', 'Réponse verrouillée pour cette question.', 1200);
      Sound.play('wrong');
    }
  }

  function onError(msg) {
    const messages = {
      'no-room': 'Salle introuvable. Vérifie le code affiché à l’écran.',
      started: 'La partie a déjà commencé.',
      full: 'Salle pleine. Demande à l’animateur d’augmenter la limite.',
      'rate-limit': 'Trop de tentatives. Réessaie dans une minute.',
      'no-code': 'Impossible de créer une salle, réessaie.',
      'host-gone': 'Cette salle n’existe plus.',
    };
    const text = msg.message || messages[msg.code] || 'Une erreur est survenue.';
    toast(App.role === 'host' ? '#hostToasts' : '#phoneToasts', text, 'error', 4000);
    if (msg.code === 'started' && msg.canJoinNext) {
      App.queuedMode = true;
      const btn = $('#btnJoin');
      if (btn) btn.textContent = 'Rejoindre à la prochaine manche';
    }
  }

  function onJoined(msg) {
    if (App.role === 'host') return;
    App.role = 'player';
    App.code = msg.code;
    App.playerTokens[msg.code] = msg.token;
    saveJSON(LS.players, App.playerTokens);
    App.name = msg.name || App.name;
    saveJSON(LS.name, App.name);
    if (msg.avatar) { App.avatar = msg.avatar; saveJSON(LS.avatar, App.avatar); }
    if (msg.state) onState({ state: msg.state });
    showPlayerScreen(App.state && App.state.phase === 'lobby' ? 'pLobby' : 'pGame');
    toast('#phoneToasts', msg.reconnected ? 'Reconnecté à la partie.' : 'Tu es dans la salle !', 'ok', 1800);
  }

  function onHostCreated(msg) {
    App.role = 'host';
    App.code = msg.code;
    App.hostToken = msg.hostToken;
    saveJSON(LS.host, { code: msg.code, token: msg.hostToken, at: Date.now() });
    history.replaceState(null, '', location.pathname + '?host=1');
    showHostView();
    if (global.Scene3D && global.Scene3D.ready && global.Scene3D.setRoom) global.Scene3D.setRoom(msg.code);
    if (msg.state) onState({ state: msg.state, role: 'host' });
    refreshQr(msg.code);
    toast('#hostToasts', 'Salle créée : ' + msg.code, 'ok', 2500);
  }

  function onHostJoined(msg) {
    App.role = 'host';
    App.code = msg.code;
    App.hostToken = msg.hostToken;
    showHostView();
    if (global.Scene3D && global.Scene3D.ready && global.Scene3D.setRoom) global.Scene3D.setRoom(msg.code);
    if (msg.state) onState({ state: msg.state, role: 'host' });
    refreshQr(msg.code);
  }

  function onQueued(msg) {
    toast('#phoneToasts', msg.message || 'Tu rejoindras la prochaine manche.', 'ok', 3000);
  }

  function loadLeaderboard(which) {
    App.lbReturn = App.phoneScreen;
    fetch('/api/leaderboard', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : { scores: [] })
      .then((data) => {
        const rows = (data.scores || []).map((r, i) => ({ rank: i + 1, name: r.name, score: r.score, correct: r.correct }));
        if (which === 'host') {
          $('#hostLbHint').textContent = data.configured ? 'Classement synchronisé.' : 'Classement local à ce serveur.';
          rankList('#hostLbList', rows);
          $('#hostLeaderboard').classList.remove('hidden');
        } else {
          $('#lbHint').textContent = data.configured ? 'Classement synchronisé.' : 'Classement local à ce serveur.';
          rankList('#lbList', rows);
          showPlayerScreen('pLeaderboard');
        }
      })
      .catch(() => toast('#phoneToasts', 'Classement indisponible.', 'error'));
  }

  function buildAvatarEditor() {
    const groups = [
      ['silhouetteGrid', 'silhouette', 'choice'],
      ['hairGrid', 'hair', 'choice'],
      ['outfitGrid', 'outfit', 'choice'],
      ['accessoryGrid', 'accessory', 'choice'],
    ];
    groups.forEach(([id, key, kind]) => {
      const box = $('#' + id);
      if (!box) return;
      box.innerHTML = Object.keys(global.Avatar.LABELS[key]).map((value) =>
        '<button type="button" class="choice' + (App.avatar[key] === value ? ' active' : '') + '" data-key="' + key + '" data-value="' + esc(value) + '">' +
        '<span class="choice-icon">' + esc(global.Avatar.ICONS[key][value] || '●') + '</span>' +
        '<span>' + esc(global.Avatar.LABELS[key][value]) + '</span></button>'
      ).join('');
      on(box, 'click', (ev) => {
        const btn = ev.target.closest('[data-value]');
        if (!btn) return;
        App.avatar[btn.getAttribute('data-key')] = btn.getAttribute('data-value');
        refreshAvatarEditor();
      });
    });
    const colors = [
      ['hairColors', 'hair'], ['skinColors', 'skin'], ['jacketColors', 'jacket'],
      ['shirtColors', 'shirt'], ['pantsColors', 'pants'], ['shoeColors', 'shoes'],
    ];
    colors.forEach(([id, key]) => {
      const box = $('#' + id);
      if (!box) return;
      box.innerHTML = global.Avatar.PALETTES[key].map((hex) =>
        '<button type="button" class="swatch' + (App.avatar.colors[key] === hex ? ' active' : '') + '" data-color="' + key + '" data-hex="' + hex + '" style="--swatch:' + hex + '" aria-label="' + esc(hex) + '"></button>'
      ).join('');
      on(box, 'click', (ev) => {
        const btn = ev.target.closest('[data-hex]');
        if (!btn) return;
        App.avatar.colors[btn.getAttribute('data-color')] = btn.getAttribute('data-hex');
        refreshAvatarEditor();
      });
    });
    refreshAvatarEditor();
  }

  function refreshAvatarEditor() {
    const preview = $('#avatarPreview');
    if (preview) preview.innerHTML = global.Avatar.svg(App.avatar);
    const name = $('#avatarName');
    if (name) name.textContent = App.name || 'Joueur';
    $$('#pAvatar .choice').forEach((btn) => {
      btn.classList.toggle('active', App.avatar[btn.getAttribute('data-key')] === btn.getAttribute('data-value'));
    });
    $$('#pAvatar .swatch').forEach((btn) => {
      btn.classList.toggle('active', App.avatar.colors[btn.getAttribute('data-color')] === btn.getAttribute('data-hex'));
    });
  }

  function openAvatar(from) {
    App.avatarFrom = from;
    buildAvatarEditor();
    showPlayerScreen('pAvatar');
  }

  function bindEvents() {
    const handlers = {
      state: onState, event: onEvent, error: onError, joined: onJoined,
      queued: onQueued,
      'host:created': onHostCreated,
      'host:joined': onHostJoined,
      closed: () => { clearKey(LS.host); location.href = location.pathname; },
    };
    Object.keys(handlers).forEach((key) => { global.Net.handlers[key] = handlers[key]; });
    global.Net.onOpen = flushAuth;
    global.Net.onStatus = setNetStatus;

    on($('#btnJoin'), 'click', () => App.queuedMode ? queueRoom() : joinRoom());
    on($('#codeIn'), 'input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 5); });
    on($('#codeIn'), 'keydown', (e) => { if (e.key === 'Enter') App.queuedMode ? queueRoom() : joinRoom(); });
    on($('#pseudo'), 'keydown', (e) => { if (e.key === 'Enter') { const c = $('#codeIn'); if (c) c.focus(); } });
    on($('#btnCreate'), 'click', startHost);
    on($('#btnLeave'), 'click', leaveRoom);

    on($('#btnHostMain'), 'click', () => send(App.state && App.state.phase === 'end' ? 'host:start' : 'host:start'));
    on($('#btnReplay'), 'click', () => send('host:start'));
    on($('#btnHostNext'), 'click', () => send('host:next'));
    on($('#btnHostReveal'), 'click', () => send('host:reveal'));
    on($('#btnHostPause'), 'click', () => send('host:pause', { paused: !(App.state && App.state.paused) }));
    on($('#btnStart'), 'click', () => send('host:start'));
    on($('#btnLobbyClose'), 'click', () => send('host:close'));
    on($('#btnHostClose'), 'click', () => send('host:close'));
    on($('#btnHostRetry'), 'click', () => global.Net.connect());
    on($('#btnPhoneRetry'), 'click', () => global.Net.connect());

    on($('#btnLobbyCollapse'), 'click', () => {
      $('#hostLobby').classList.add('hidden');
      $('#btnLobbyOpen').classList.remove('hidden');
    });
    on($('#btnLobbyOpen'), 'click', () => {
      $('#hostLobby').classList.remove('hidden');
      $('#btnLobbyOpen').classList.add('hidden');
    });
    on($('#btnQr'), 'click', () => { refreshQr(App.code); $('#qrModal').classList.remove('hidden'); });
    on($('#btnQrClose'), 'click', () => $('#qrModal').classList.add('hidden'));
    on($('#btnCopyLink'), 'click', () => {
      const url = qrUrl(App.code);
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => toast('#hostToasts', 'Lien copié.', 'ok'));
      else toast('#hostToasts', url, 'info', 5000);
    });
    on($('#btnMute'), 'click', () => {
      const muted = Sound.toggle();
      $('#btnMute').textContent = muted ? '🔇' : '🔊';
    });

    const catButtons = $$('#catButtons .cat-btn');
    catButtons.forEach((btn) => {
      on(btn, 'click', () => {
        const cat = btn.getAttribute('data-cat');
        if (cat === 'tout') {
          catButtons.forEach((b) => b.classList.toggle('active', b === btn));
        } else {
          const tout = catButtons.find((b) => b.getAttribute('data-cat') === 'tout');
          if (tout) tout.classList.remove('active');
          btn.classList.toggle('active');
          if (!catButtons.some((b) => b !== tout && b.classList.contains('active')) && tout) tout.classList.add('active');
        }
        send('host:settings', hostSettings());
      });
    });
    ['selDuration', 'selMaxPlayers', 'selMode'].forEach((id) => {
      on($('#' + id), 'change', () => send('host:settings', hostSettings()));
    });

    $$('#pQcmOptions .qcm-option').forEach((btn) => {
      on(btn, 'click', () => {
        const s = App.state;
        if (!s || s.phase !== 'question' || !s.me || s.me.answered || s.paused) return;
        const idx = Number(btn.getAttribute('data-idx'));
        send('player:answer', { optionIdx: idx, qi: s.qi, questionId: s.questionId });
      });
    });

    on($('#btnAvatar'), 'click', () => openAvatar('pHome'));
    on($('#btnPlayerAvatar'), 'click', () => openAvatar('pLobby'));
    on($('#btnAvatarBack'), 'click', () => showPlayerScreen(App.avatarFrom));
    on($('#btnAvatarRandom'), 'click', () => { App.avatar = global.Avatar.random(App.avatar); saveJSON(LS.avatar, App.avatar); buildAvatarEditor(); });
    on($('#btnAvatarOk'), 'click', () => { saveJSON(LS.avatar, App.avatar); showPlayerScreen(App.avatarFrom); });

    on($('#btnLeaderTop'), 'click', () => loadLeaderboard('player'));
    on($('#btnLeaderLobby'), 'click', () => loadLeaderboard('player'));
    on($('#btnLeaderEnd'), 'click', () => loadLeaderboard('player'));
    on($('#btnLeaderboard'), 'click', () => loadLeaderboard('host'));
    on($('#btnHostLbBack'), 'click', () => $('#hostLeaderboard').classList.add('hidden'));
    on($('#btnLbBack'), 'click', () => showPlayerScreen(App.lbReturn === 'pLeaderboard' ? 'pHome' : App.lbReturn));
    on($('#btnHome'), 'click', () => { App.state = null; App.code = ''; showPlayerScreen('pHome'); });
    on($('#btnShare'), 'click', () => {
      const url = qrUrl(App.code);
      if (navigator.share) navigator.share({ title: 'CREATOR Quiz', text: 'Rejoins ma salle ' + App.code, url }).catch(() => {});
      else toast('#hostToasts', url, 'info', 5000);
    });

    function longPress(el, fn) {
      let timer = null;
      const cancel = () => { if (timer) clearTimeout(timer); timer = null; };
      on(el, 'pointerdown', () => { timer = setTimeout(fn, 900); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => on(el, ev, cancel));
    }
    longPress($('#hostLogo'), () => { if (global.__swUpdate) global.__swUpdate(); else location.reload(); });
    longPress($('#phoneLogo'), () => { if (global.__swUpdate) global.__swUpdate(); else location.reload(); });

    on($('#btnUpdate'), 'click', () => { if (global.__swUpdate) global.__swUpdate(); else location.reload(); });

    App.timerId = setInterval(() => {
      if (App.state) updateTimer(App.state);
    }, 200);
  }

  function init() {
    App.name = loadJSON(LS.name, '') || '';
    App.avatar = loadJSON(LS.avatar, null) || global.Avatar.random();
    saveJSON(LS.avatar, App.avatar);
    App.playerTokens = loadJSON(LS.players, {}) || {};
    const pseudo = $('#pseudo');
    if (pseudo) pseudo.value = App.name;
    const preview = $('#homePreview');
    if (preview) preview.innerHTML = global.Avatar.svg(App.avatar);
    const code = storedCode();
    document.body.classList.toggle('join-via-qr', !!code);
    if (code) {
      const el = $('#codeIn');
      if (el) el.value = code;
      const chip = $('#pRoomChip');
      if (chip) chip.textContent = 'Salle ' + code;
      const welcome = $('#pQrWelcome');
      if (welcome) {
        welcome.textContent = 'Bienvenue dans la salle ' + code + ' ! Choisis ton pseudo pour entrer.';
        welcome.classList.remove('hidden');
      }
      if (pseudo) pseudo.value = '';
      App.name = '';
    }

    bindEvents();
    showPlayerScreen('pHome');
    if (code && pseudo) pseudo.focus();

    const savedHost = loadJSON(LS.host, null);
    if (isHostUrl() && savedHost && savedHost.token) {
      reconnectHost(savedHost);
    } else if (isHostUrl()) {
      startHost();
    } else if (code) {
      const token = App.playerTokens[code];
      if (token) {
        App.code = code;
        App.name = App.name || 'Joueur';
        authenticate({ type: 'player:join', payload: { code, name: App.name, token, avatar: App.avatar } });
      } else {
        global.Net.connect();
      }
    } else {
      global.Net.connect();
    }
    global.App = App;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
