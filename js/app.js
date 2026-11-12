/* =====================================================================
   js/app.js — orchestration : hôte (projection) et joueurs (téléphone)
   ===================================================================== */
(function (global) {
  'use strict';

  const $ = global.UI.$;
  const esc = global.UI.esc;
  const Net = global.Net;
  const Game = global.Game;
  const Scene3D = global.Scene3D;
  const UI = global.UI;

  const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const REVEAL_MS = 4200;
  const MAX_ROOM_PLAYERS = 20;
  const LB_KEY = 'cq_lb';
  const makeHostSecret = () => Math.random().toString(36).slice(2, 14) + Math.random().toString(36).slice(2, 14);
  const roomUrl = (code, secret) => siteUrl(code) + (secret ? '&hs=' + encodeURIComponent(secret) : '');

  const makeCode = () => {
    let c = '';
    for (let i = 0; i < 5; i++) c += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    return c;
  };
  const sanitizeName = (s) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 16);
  const teamOfScore = (p) => p.team;

  /* ---------------- sons (WebAudio) ---------------- */
  const Sound = {
    ctx: null, on: true,
    ac() {
      if (!Sound.ctx) {
        const C = global.AudioContext || global.webkitAudioContext;
        if (C) Sound.ctx = new C();
      }
      if (Sound.ctx && Sound.ctx.state === 'suspended') Sound.ctx.resume();
      return Sound.ctx;
    },
    mute() { Sound.on = !Sound.on; return Sound.on; },
    beep(freq, dur, type, gain, delay) {
      if (!Sound.on) return;
      const ac = Sound.ac(); if (!ac) return;
      const t0 = ac.currentTime + (delay || 0);
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain || 0.16, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + (dur || 0.18));
      o.connect(g); g.connect(ac.destination);
      o.start(t0); o.stop(t0 + (dur || 0.18) + 0.02);
    },
    found() { Sound.beep(660, 0.12, 'triangle', 0.18); Sound.beep(990, 0.16, 'triangle', 0.14, 0.09); },
    dup() { Sound.beep(320, 0.14, 'sine', 0.12); },
    miss() { Sound.beep(180, 0.18, 'sawtooth', 0.08); },
    tick() { Sound.beep(880, 0.05, 'square', 0.03); },
    reveal() { Sound.beep(700, 0.06, 'square', 0.05); Sound.beep(1050, 0.1, 'triangle', 0.08, 0.08); },
    start() { Sound.beep(440, 0.14, 'triangle', 0.16); Sound.beep(660, 0.18, 'triangle', 0.16, 0.12); Sound.beep(880, 0.24, 'triangle', 0.16, 0.26); },
    win() { [523, 659, 784, 1047].forEach((f, i) => Sound.beep(f, 0.26, 'triangle', 0.16, i * 0.14)); },
    lose() { [392, 330, 262].forEach((f, i) => Sound.beep(f, 0.3, 'sine', 0.14, i * 0.16)); },
  };

  /* ---------------- hôte ---------------- */
  const Host = {
    order: [], qi: 0, started: false, duration: 60, mode: 'duel',
    roundStart: 0, roundEnd: 0, revealEnd: 0,
    tickTimer: null, lastSec: -1, answering: false,
    paused: false, pauseLeft: 0,
    attempts: { blue: 0, green: 0 },
    wrongGuesses: [],
  };

  const App = {
    role: null,          // 'host' | 'player'
    state: null,
    clockSkew: 0,        // Date.now() - state.ts
    joined: false,
    joinTries: 0,
    lastGuessAt: 0,
    submitted: false,
    char: +(localStorage.getItem('cq_char') || 1),
    sweat: localStorage.getItem('cq_sweat') || '#FF4E20',
  };

  /* =====================================================================
     BOOT
     ===================================================================== */
  function boot() {
    UI.init();
    UI.pickChar(App.char); UI.pickSweat(App.sweat);
    UI.bindKeyboard();
    const name = localStorage.getItem('cq_name') || '';
    $('pseudo').value = name;
    document.body.classList.toggle('phone-mode', !isDesktop());
    App.webglDisabled = document.body.classList.contains('webgl-disabled');
    if (App.webglDisabled) {
      UI.toast('WebGL indisponible : mode tableau seul (sans 3D)', 7000);
    }

    $('pseudo').addEventListener('input', () => {
      localStorage.setItem('cq_name', sanitizeName($('pseudo').value));
    });
    $('codeIn').addEventListener('input', () => {
      $('codeIn').value = $('codeIn').value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
    });

    $('btnJoin').addEventListener('click', joinRoom);
    $('codeIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') joinRoom(); });
    $('btnCreate').addEventListener('click', createRoom);
    $('btnAvatar').addEventListener('click', () => UI.screen('pAvatar'));
    $('btnAvatarOk').addEventListener('click', () => {
      localStorage.setItem('cq_char', UI.char);
      localStorage.setItem('cq_sweat', UI.sweat);
      App.char = UI.char; App.sweat = UI.sweat;
      UI.screen(App.role ? 'pLobby' : 'pHome');
    });
    $('btnLeaderTop').addEventListener('click', () => showLeaderboard('pHome'));
    $('btnLeaderLobby').addEventListener('click', () => showLeaderboard('pLobby'));
    $('btnLeaderEnd').addEventListener('click', () => showLeaderboard('pEnd'));
    $('btnLbBack').addEventListener('click', () => UI.screen(App.lastScreen || 'pHome'));
    $('btnLeave').addEventListener('click', leave);
    $('btnHome').addEventListener('click', leave);
    $('btnStart').addEventListener('click', () => startGame());
    $('btnHostMain').addEventListener('click', hostMain);
    $('btnHostSkip').addEventListener('click', () => endRound());
    $('btnHostPause').addEventListener('click', hostPauseToggle);
    $('btnHostPlus15').addEventListener('click', hostPlus15);
    $('btnHostReveal').addEventListener('click', () => { if (Net.isHost && App.state.phase === 'question') endRound(); });
    $('btnShare').addEventListener('click', shareRanking);
    $('btnQr').addEventListener('click', toggleQr);
    $('btnMute').addEventListener('click', () => {
      const on = Sound.mute();
      $('btnMute').textContent = on ? '🔊' : '🔇';
      UI.toast(on ? 'Son activé' : 'Son coupé', 1200);
    });
    $('btnLeaderboard').addEventListener('click', () => { UI.screen('pLeaderboard'); showLeaderboard('pHome'); });
    $('btnResume').addEventListener('click', () => UI.screen(App.lastScreen || 'pGame'));
    $('btnPauseMenu').addEventListener('click', leave);
    $('selDuration').addEventListener('change', () => { Host.duration = +$('selDuration').value; });
    $('selMode').addEventListener('change', () => { Host.mode = $('selMode').value; assignTeams(); publish(); });

    $('btnSubmit').addEventListener('click', submitGuess);
    UI.onSubmit = submitGuess;
    $('pAnswer').addEventListener('focus', (e) => e.target.blur());
    document.getElementById('pEmoji') && document.getElementById('pEmoji').querySelectorAll('.emoji').forEach((b) => {
      b.addEventListener('click', () => { if (App.role === 'player') sendReaction(b.dataset.e); });
    });

    // restauration d'une salle hôte après refresh
    const saved = Net.loadHostState();
    if (saved && saved.code && saved.phase !== 'end') {
      resumeHost(saved);
      return;
    }

    const room = new URLSearchParams(location.search).get('room');
    if (room) {
      $('codeIn').value = room.toUpperCase().slice(0, 5);
      if (localStorage.getItem('cq_name')) joinRoom();
    }
  }

  const isDesktop = () => global.matchMedia('(hover:hover) and (min-width:701px)').matches && !/room=/.test(location.search);

  /* =====================================================================
     HÔTE
     ===================================================================== */
  function resumeHost(saved) {
    App.role = 'host';
    Net.isHost = true;
    Net.room = saved.code;
    Net.hostSecret = saved.hostSecret || makeHostSecret();
    Net.roomSecret = Net.hostSecret;
    Net.state = saved;
    try { Host.order = JSON.parse(localStorage.getItem('cq_order') || '[]'); } catch (e) { Host.order = []; }
    Host.qi = saved.qi || 0;
    Host.started = saved.phase === 'question' || saved.phase === 'reveal' || saved.phase === 'end';
    Host.duration = saved.duration || 60;
    Host.mode = saved.mode || 'duel';
    $('selDuration').value = String(Host.duration);
    $('selMode').value = Host.mode;
    App.state = saved;
    UI.hostVisible(true);
    UI.screen('pHome');
    UI.phoneVisible(false);
    Net.hooks.state = null;
    Net.hooks.hostEvent = (ev) => hostEvent(ev);
    Net.hooks.closed = () => {};
    Net.connect(() => {
      Net.startHeartbeat();
      publish();
      if (Host.started) {
        if (!App.webglDisabled) {
          Scene3D.init($('scene'));
          Game.loadBank('js/survey-questions.js').then(() => {
            Scene3D.load(() => {}).then(() => {
              Scene3D.syncPlayers(App.state.players, Host.mode);
              Scene3D.syncCrowd(App.state.blue, App.state.green);
              renderHost();
            });
          });
        }
        // reprise propre : la manche en cours repart sur son temps restant
        if (App.state.phase === 'question') {
          if (App.state.roundEnd <= Date.now()) endRound();
          else startHostTick();
        } else if (App.state.phase === 'reveal') {
          if (App.state.roundEnd <= Date.now()) nextQuestion();
          else startHostTick();
        }
      }
      UI.toast('Salle ' + saved.code + ' restaurée', 3000);
    });
  }

  async function createRoom() {
    const name = sanitizeName($('pseudo').value) || 'Hôte';
    localStorage.setItem('cq_name', name);
    Net.me.name = name;
    App.role = 'host';
    Net.isHost = true;
    Host.mode = $('selMode').value;
    Host.duration = +$('selDuration').value;

    UI.loaderTxt('Chargement des questions…');
    try {
    try {
      await Game.loadBank('js/survey-questions.js');
    } catch (e) {
      UI.toast('Banque de questions indisponible', 4000);
      return;
    }
    } catch (e) {
      UI.toast('Banque de questions indisponible', 4000);
      return;
    }

    UI.hostVisible(true);
    UI.screen('pHome');
    UI.phoneVisible(false);
    UI.loader(0.15);

    Net.room = makeCode();
    Net.hostSecret = makeHostSecret();
    Net.roomSecret = Net.hostSecret;
    App.state = blankState();
    Net.state = App.state;

    if (!App.webglDisabled) {
      Scene3D.init($('scene'));
      Scene3D.load((label, pct) => {
        UI.loaderTxt(label + '…');
        UI.loader(0.15 + pct * 0.8);
      }).then(() => {
        UI.loader(1);
        UI.hideLoader();
        UI.code(Net.room);
        UI.joinUrl(roomUrl(Net.room, Net.hostSecret));
        UI.screen('pHome');
        renderHost();
      }).catch((e) => {
        console.error(e);
        UI.toast('Erreur de chargement du plateau', 5000);
      });
    } else {
      UI.loader(1); UI.hideLoader();
      UI.code(Net.room);
      UI.joinUrl(roomUrl(Net.room, Net.hostSecret));
      UI.screen('pHome');
      renderHost();
    }

    Net.hooks.state = null;
    Net.hooks.hostEvent = (ev) => hostEvent(ev);
    Net.hooks.closed = () => {};
    Net.connect(() => {
      Net.startHeartbeat();
      publish();
      UI.toast('Salle ' + Net.room + ' créée', 3200);
    });
  }

  function blankState() {
    return {
      code: Net.room, hostId: Net.me.id, hostSecret: Net.hostSecret, phase: 'lobby',
      mode: Host.mode, duration: Host.duration,
      qi: 0, qTotal: Game.GAME_Q,
      players: [], revealed: [], full: null,
      q: { text: '', slots: 0 },
      roundStart: 0, roundEnd: 0, mult: 1,
      blue: 0, green: 0, crowd: { blue: 0, green: 0 },
      ts: Date.now(), order: [],
    };
  }

  function publish() {
    if (!Net.isHost) return;
    App.state.code = Net.room;
    App.state.mode = Host.mode;
    App.state.duration = Host.duration;
    App.state.order = Host.order.slice();
    App.state.blue = sumTeam('blue');
    App.state.green = sumTeam('green');
    App.state.crowd = { blue: Math.floor(App.state.blue / 2), green: Math.floor(App.state.green / 2) };
    App.state.ts = Date.now();
    try { localStorage.setItem('cq_order', JSON.stringify(Host.order)); } catch (e) {}
    Net.state = App.state;
    Net.publishState();
    renderHost();
    renderPhone();
    Scene3D.syncCrowd(App.state.blue, App.state.green);
  }

  function sumTeam(team) {
    return (App.state.players || []).reduce((n, p) => n + (p.team === team ? p.score : 0), 0);
  }

  /* ---------------- joueurs ---------------- */
  Host.guessLog = new Map();   // id -> { last: ts, count: n, round: qi }
  Host.reactionLog = new Map(); // id -> last reaction ts

  function dedupeName(name) {
    const base = sanitizeName(name) || 'Joueur';
    const used = new Set((App.state.players || []).map((x) => x.name));
    if (!used.has(base)) return base;
    let n = 2;
    while (used.has(base + ' #' + n)) n++;
    return base + ' #' + n;
  }

  function hostEvent(ev) {
    if (!ev || !ev.type) return;
    const allowedTypes = ['join', 'leave', 'kick', 'guess'];
    if (allowedTypes.indexOf(ev.type) < 0) return;                // type invalide : ignore silencieusement
    const p = App.state.players.find((x) => x.id === ev.from);
    if (!p) return;                                               // expediteur non inscrit : ignore
    if (ev.token && ev.token !== p.token) return;                 // jeton invalide : ignore

    if (ev.type === 'join') {
      if ((App.state.players || []).length >= MAX_ROOM_PLAYERS) {
        Net.sendEvent({ type: 'denied', to: ev.from, reason: 'Salle pleine' });
        return;
      }
      const existing = App.state.players.find((x) => x.id === ev.from);
      if (existing) {
        existing.name = sanitizeName(ev.name) || existing.name;
      } else {
        App.state.players.push({
          id: ev.from,
          name: dedupeName(ev.name),
          char: Math.max(1, Math.min(6, ev.char | 0)) || 1,
          sweat: ev.sweat || '#FF4E20',
          score: 0, team: null,
          token: ev.token || Math.random().toString(36).slice(2, 10),
        });
      }
      assignTeams();
      publish();
      if (Host.started) Scene3D.syncPlayers(App.state.players, Host.mode);
      UI.toast((App.state.players.find((x) => x.id === ev.from) || { name: 'Joueur' }).name + ' a rejoint', 1400);
    } else if (ev.type === 'leave' || ev.type === 'kick') {
      const id = ev.type === 'kick' ? ev.to : ev.from;
      removePlayer(id);
    } else if (ev.type === 'guess') {
      handleGuess(ev.from, ev.text);
    } else if (ev.type === 'reaction') {
      const now = Date.now();
      const last = Host.reactionLog.get(ev.from) || 0;
      if (now - last < 3000) return; // 1 reaction / 3 s par joueur
      Host.reactionLog.set(ev.from, now);
      // diffusion a tous les clients (le sujet /events est partage)
      try {
        if (Net.client && Net.client.connected) {
          Net.client.publish(Net.topic('events'), JSON.stringify({ type: 'reaction', from: ev.from, emoji: ev.emoji, token: me.token }), { qos: 1 });
        }
      } catch (e) {}
    }
  }

  function removePlayer(id) {
    const i = (App.state.players || []).findIndex((p) => p.id === id);
    if (i < 0) return;
    const p = App.state.players.splice(i, 1)[0];
    assignTeams();
    publish();
    Scene3D.removePlayer(id);
    if (Host.started) Scene3D.syncPlayers(App.state.players, Host.mode);
    UI.toast(p.name + ' a quitté', 1600);
  }

  function assignTeams() {
    if (!App.state) return;
    if (Host.mode === 'solo') {
      App.state.players.forEach((p) => { p.team = 'blue'; });
      return;
    }
    let blue = 0, green = 0;
    App.state.players.forEach((p) => { if (p.team === 'blue') blue++; else if (p.team === 'green') green++; });
    App.state.players.forEach((p) => {
      if (p.team) return;
      if (blue <= green) { p.team = 'blue'; blue++; } else { p.team = 'green'; green++; }
    });
    // rééquilibrage si des joueurs sont partis
    const b = App.state.players.filter((p) => p.team === 'blue');
    const g = App.state.players.filter((p) => p.team === 'green');
    while (b.length - g.length > 1) { const p = b.pop(); p.team = 'green'; g.push(p); }
    while (g.length - b.length > 1) { const p = g.pop(); p.team = 'blue'; b.push(p); }
  }

  /* ---------------- lancement ---------------- */
  async function startGame() {
    if (!Net.isHost || !App.state.players.length) { UI.toast('Aucun joueur'); return; }
    try {
      await Game.loadBank('js/survey-questions.js');
    } catch (e) {
      UI.toast('Banque de questions indisponible', 4000);
      return;
    }
    Host.order = Game.pickQuestions(Game.GAME_Q).map((q) => Game.bank().indexOf(q));
    Host.qi = -1;
    Host.started = true;
    App.state.players.forEach((p) => { p.score = 0; });
    assignTeams();
    App.state.revealed = [];
    App.state.full = null;
    App.state.qTotal = Host.order.length;
    if (!App.webglDisabled) {
      Scene3D.dispose();
      Scene3D.syncPlayers(App.state.players, Host.mode);
      Scene3D.resetCrowd();
      Scene3D.updateCameraMode(Host.mode);
    }
    Sound.start();
    nextQuestion();
    UI.hostVisible(true);
    UI.hostButtons('question');
  }

  function nextQuestion() {
    if (!Net.isHost) return;
    Host.qi++;
    Host.guessLog.clear();
    Host.wrongGuesses = [];
    if (Host.qi >= Host.order.length) { endGame(); return; }
    const q = Game.bank()[Host.order[Host.qi]];
    const mult = Host.qi === Host.order.length - 1 ? 2 : 1;
    Host.roundStart = Date.now();
    Host.roundEnd = Host.roundStart + Host.duration * 1000;
    Host.answering = true;
    App.state.phase = 'question';
    App.state.qi = Host.qi;
    App.state.qTotal = Host.order.length;
    App.state.q = Game.publicQuestion(q);
    App.state.revealed = [];
    App.state.full = null;
    App.state.roundStart = Host.roundStart;
    App.state.roundEnd = Host.roundEnd;
    App.state.mult = mult;
    UI.hostQuestion(q.q, Host.qi + 1, Host.order.length);
    UI.board(q.answers.length, [], -1);
    UI.hostButtons('question');
    publish();
    startHostTick();
  }

  function handleGuess(fromId, text) {
    if (!Net.isHost || App.state.phase !== 'question') return;
    const p = App.state.players.find((x) => x.id === fromId);
    if (!p) return;
    if (typeof text !== 'string') return;
    const t = text.trim();
    if (!t || t.length > 40) return;
    if (!/^[A-Za-z\u00C0-\u024F0-9\s\u2019'\-.,!?:;]*$/.test(t)) return;
    const now = Date.now();
    let log = Host.guessLog.get(fromId);
    if (!log || log.round !== Host.qi) { log = { last: 0, count: 0, round: Host.qi }; Host.guessLog.set(fromId, log); }
    if (now - log.last < 600) return;
    if (log.count >= 60) return;
    log.last = now;
    log.count++;
    p.attempts = (p.attempts || 0) + 1;
    const q = Game.bank()[Host.order[Host.qi]];
    const elapsed = Date.now() - Host.roundStart;
    const res = Game.judge(q, t, App.state.revealed, elapsed, App.state.mult);
    if (res.kind === 'found') {
      p.score += res.pts;
      App.state.revealed.push({ i: res.index, text: res.entry.text, pts: res.pts, by: p.name, team: p.team, at: elapsed });
      Net.sendEvent({ type: 'result', to: fromId, kind: 'found', text: res.entry.text, pts: res.pts });
      Sound.found();
      Scene3D.pulse();
      UI.board(q.answers.length, App.state.revealed, res.index);
      publish();
      if (App.state.revealed.length === q.answers.length) endRound();
    } else if (res.kind === 'dup') {
      Net.sendEvent({ type: 'result', to: fromId, kind: 'dup', text: res.entry.text });
      Sound.dup();
    } else {
      Net.sendEvent({ type: 'result', to: fromId, kind: 'miss', text: t });
      Sound.miss();
      Host.wrongGuesses = Host.wrongGuesses || [];
      Host.wrongGuesses.push({ by: p.name, text: t, team: p.team });
      if (Host.wrongGuesses.length > 8) Host.wrongGuesses.shift();
      renderHost();
    }
  }

  function endRound() {
    if (!Net.isHost || App.state.phase !== 'question') return;
    Host.answering = false;
    const q = Game.bank()[Host.order[Host.qi]];
    App.state.phase = 'reveal';
    App.state.revealed = q.answers.map((a, i) => {
      const found = App.state.revealed.find((r) => r.i === i);
      if (found) return found;
      // reponse pas trouvee : cachee tant qu'elle n'est pas retournee
      return { i, text: null, pts: null, by: null, team: null, missed: true, answer: a.text };
    });
    App.state.full = q.answers.map((a) => a.text);
    UI.board(q.answers.length, App.state.revealed, -1);
    UI.markMiss(q.answers.length, App.state.revealed.filter((r) => !r.missed));
    UI.hostButtons('reveal');
    publish();
    startReveal();
  }

  /** Retourne les cases restantes une a une (400 ms) avec son. */
  function startReveal() {
    const q = Game.bank()[Host.order[Host.qi]];
    const missed = App.state.revealed.filter((r) => r.missed);
    let idx = 0;
    function step() {
      if (idx >= missed.length) {
        // toutes retournee : passe a la manche suivante apres un court delai
        Host.revealEnd = Date.now() + 700;
        App.state.roundEnd = Host.revealEnd;
        startHostTick();
        return;
      }
      const entry = missed[idx++];
      entry.text = entry.answer;
      entry.pts = q.answers[entry.i].pts;
      UI.board(q.answers.length, App.state.revealed, entry.i);
      Sound.reveal();
      // la camera suit la case unveilee (legere impulsion)
      Scene3D.pulse();
      setTimeout(step, 400);
    }
    step();
  }

  function endGame() {
    if (!Net.isHost) return;
    Host.started = false;
    App.state.phase = 'end';
    App.state.roundEnd = 0;
    const ranked = App.state.players.slice().sort((a, b) => b.score - a.score);
    App.state.ranking = ranked.map((p) => ({ id: p.id, name: p.name, score: p.score, team: p.team }));
    UI.ranks(ranked, true);
    UI.hostButtons('end');
    publish();
    Scene3D.celebrate(ranked, Host.mode, { blue: App.state.blue, green: App.state.green });
    const best = Host.mode === 'duel'
      ? (App.state.blue > App.state.green ? 'Équipe BLEUE' : (App.state.green > App.state.blue ? 'Équipe VERTE' : 'Égalité'))
      : (ranked[0] ? ranked[0].name : '—');
    const ell = document.getElementById('hostEnd');
    if (ell) {
      let t = ell.querySelector('.winner');
      if (!t) { t = document.createElement('p'); t.className = 'winner'; ell.insertBefore(t, ell.querySelector('#hostRank')); }
      t.innerHTML = 'Vainqueur : <b>' + esc(best) + '</b>';
    }
    // stats par joueur
    const statsBox = document.getElementById('hostEndStats');
    const foundBy = {};
    let fastest = null;
    ranked.forEach((p) => { foundBy[p.id] = 0; });
    (App.state.revealed || []).forEach((r) => {
      if (r.by) { foundBy[r.id] = (foundBy[r.id] || 0) + 1; }
      if (r.by && r.at != null) { if (!fastest || r.at < fastest.at) fastest = { id: r.id, at: r.at, name: r.by }; }
    });
    const mvp = ranked[0];
    let html = '<h3>Stats de la partie</h3>';
    html += '<p><b>MVP :</b> ' + esc(mvp ? mvp.name : '—') + ' (' + (mvp ? mvp.score : 0) + ' pts)</p>';
    html += '<p><b>Plus rapide :</b> ' + (fastest ? esc(fastest.name) + ' (' + Math.round(fastest.at) + ' ms)' : '—') + '</p>';
    html += '<ul style="margin:6px 0 0;padding-left:16px;font-size:13px">';
    ranked.forEach((p) => {
      html += '<li>' + esc(p.name) + ' : ' + (foundBy[p.id] || 0) + ' reponse(s) trouvee(s) · ' + p.score + ' pts</li>';
    });
    html += '</ul>';
    if (statsBox) { statsBox.innerHTML = html; statsBox.classList.remove('hidden'); }
    // confettis couleurs CREATOR
    fireConfetti();
    if (Sound.win) Sound.win();
    submitScores(ranked);
  }

  function fireConfetti() {
    const root = document.getElementById('confetti');
    if (!root) return;
    root.style.display = 'block';
    const colors = ['#0B35FE', '#FF4E20', '#00E472', '#FF7A00', '#2E85FF'];
    const count = 120;
    const pieces = [];
    for (let i = 0; i < count; i++) {
      pieces.push({
        x: Math.random() * innerWidth, y: Math.random() * innerHeight - innerHeight,
        w: 6 + Math.random() * 8, h: 6 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 14, vy: 4 + Math.random() * 14,
        rot: Math.random() * 360, vrot: (Math.random() - 0.5) * 20,
      });
    }
    const canvas = document.createElement('canvas');
    canvas.width = innerWidth; canvas.height = innerHeight;
    root.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let t = 0;
    function draw() {
      t += 0.03;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = 0;
      pieces.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.rot += p.vrot; p.vy += 0.35;
        if (p.y < canvas.height + 20) { alive++; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot * Math.PI / 180);
          ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore(); }
      });
      if (alive > 0 && t < 200) requestAnimationFrame(draw);
      else { root.style.display = 'none'; root.innerHTML = ''; }
    }
    requestAnimationFrame(draw);
  }

  function hostPauseToggle() {
    if (!Net.isHost) return;
    if (App.state.phase !== 'question' && App.state.phase !== 'reveal') return;
    Host.paused = !Host.paused;
    if (Host.paused) {
      Host.pauseLeft = App.state.phase === 'question' ? (App.state.roundEnd - Date.now()) : (Host.revealEnd - Date.now());
      if (Host.tickTimer) { clearInterval(Host.tickTimer); Host.tickTimer = null; }
      UI.screen('pPause'); UI.hostButtons('pause');
      UI.toast('Partie en pause', 1200);
    } else {
      const now = Date.now();
      if (App.state.phase === 'question') App.state.roundEnd = now + Math.max(1, Host.pauseLeft);
      else Host.revealEnd = now + Math.max(1, Host.pauseLeft);
      Host.pauseLeft = 0;
      UI.screen('pGame'); UI.hostButtons(App.state.phase === 'question' ? 'question' : 'reveal');
      startHostTick();
    }
  }

  function hostPlus15() {
    if (!Net.isHost || App.state.phase !== 'question') return;
    App.state.roundEnd += 15000;
    publish();
    UI.toast('+15 secondes', 1200);
  }

  function shareRanking() {
    const ranked = (App.state.ranking || (App.state.players || []).slice().sort((a, b) => b.score - a.score));
    const txt = 'CREATOR Guess Their Answer · Salle ' + (App.state && App.state.code) + '\n' + ranked.map((p, i) => (i + 1) + '. ' + p.name + ' ' + p.score + ' pts').join('\n');
    if (navigator.share) { navigator.share({ title: 'Classement CREATOR', text: txt }).catch(() => {}); }
    else { UI.toast(txt.slice(0, 200), 5000); }
  }

  function startHostTick() {
    if (Host.tickTimer) return;
    Host.tickTimer = setInterval(() => {
      if (!Net.isHost || Host.paused) return;
      const now = Date.now();
      if (App.state.phase === 'question') {
        const left = (App.state.roundEnd - now) / 1000;
        UI.timer(left, left <= 10);
        if (left <= 0) endRound();
      } else if (App.state.phase === 'reveal') {
        const left = (Host.revealEnd - now) / 1000;
        UI.timer(Math.max(0, left), false);
        if (left <= 0) nextQuestion();
      }
    }, 200);
  }

  function hostMain() {
    if (!Net.isHost) return;
    if (App.state.phase === 'end') { startGame(); return; }
    if (App.state.phase === 'question') { endRound(); return; }
    if (App.state.phase === 'reveal') { nextQuestion(); return; }
    startGame();
  }

  function renderHost() {
    if (!Net.isHost || !App.state) return;
    const s = App.state;
    UI.code(s.code);
    const inGame = s.phase === 'question' || s.phase === 'reveal' || s.phase === 'end';
    document.getElementById('hostLobby').classList.toggle('hidden', s.phase !== 'lobby');
    document.getElementById('hostEnd').classList.toggle('hidden', s.phase !== 'end');
    document.getElementById('board').style.display = s.phase === 'lobby' || s.phase === 'end' ? 'none' : '';
    document.getElementById('hostQuestionWrap').style.display = inGame ? '' : 'none';
    document.getElementById('hostBottom').style.display = s.phase === 'lobby' ? 'none' : '';
    if (s.phase === 'lobby') {
      UI.hostLobby(s.players, true);
      UI.joinUrl(siteUrl(s.code));
    }
    UI.balance(s.blue, s.green);
    UI.attempts(s, Host.mode);
    UI.wrongBanner(Host.wrongGuesses || []);
    UI.finalBanner(s, Host.mode, Host.qi);
    UI.speedBadge(s, Host);
    if (s.phase === 'lobby') {
      UI.hostLobby(s.players, true);
      UI.joinUrl(roomUrl(s.code, s.hostSecret));
    }
    if (s.phase === 'question') {
      UI.board(s.q.slots, s.revealed, -1);
      UI.hostQuestion(s.q.text, s.qi + 1, s.qTotal);
      UI.hostButtons(Host.paused ? 'pause' : 'question');
    } else if (s.phase === 'reveal') {
      UI.board(s.q.slots, s.revealed, -1);
      UI.hostButtons(Host.paused ? 'pause' : 'reveal');
    } else if (s.phase === 'end') {
      UI.hostButtons('end');
    }
  }

  function toggleQr() {
    const el = document.getElementById('hostLobby');
    if (App.state && App.state.phase === 'lobby') {
      el.classList.toggle('hidden');
      return;
    }
    // en partie : QR en surimpression rapide
    UI.toast('Rejoindre : ' + roomUrl(Net.room, Net.hostSecret), 6000);
  }

  /* =====================================================================
     JOUEUR
     ===================================================================== */
  function joinRoom() {
    const name = sanitizeName($('pseudo').value);
    const code = ($('codeIn').value || '').toUpperCase().trim();
    if (!name) { UI.toast('Choisis un pseudo'); $('pseudo').focus(); return; }
    if (code.length !== 5) { UI.toast('Code de salle invalide'); $('codeIn').focus(); return; }
    const hs = new URLSearchParams(location.search).get('hs');
    if (!hs) { UI.toast('Lien de connexion incomplet : scannez le QR code de la salle', 5000); return; }
    Net.roomSecret = hs;
    localStorage.setItem('cq_name', name);
    Net.me.name = name;
    App.role = 'player';
    Net.isHost = false;
    Net.room = code;
    App.joined = false;
    App.joinTries = 0;
    App.state = null;
    Net.state = null;

    document.body.classList.add('phone-mode');
    UI.screen('pLobby');
    UI.phoneVisible(true);
    UI.hostVisible(false);
    UI.code(code);
    $('pLobbyHint').textContent = 'Connexion à la salle…';

    Net.hooks.state = (s) => onState(s);
    Net.hooks.playerEvent = playerEvent;
    Net.hooks.closed = (msg) => { UI.toast(msg, 4000); leave(true); };
    Net.hooks.lost = () => { $('pLobbyHint').textContent = 'Connexion perdue, reconnexion…'; };

    Net.connect(() => {
      Net.startWatch();
      sendJoin();
      clearInterval(Net.joinTimer);
      Net.joinTimer = setInterval(() => {
        if (App.joined) { clearInterval(Net.joinTimer); Net.joinTimer = null; return; }
        if (++App.joinTries > 8) { clearInterval(Net.joinTimer); UI.toast('Salle introuvable', 4000); leave(true); return; }
        sendJoin();
      }, 2000);
    });
  }

  function sendJoin() {
    Net.sendEvent({ type: 'join', name: Net.me.name, char: App.char, sweat: App.sweat });
  }

  function onState(s) {
    if (Net.isHost) return;
    App.state = s;
    App.clockSkew = Date.now() - (s.ts || Date.now());
    const me = (s.players || []).find((p) => p.id === Net.me.id);
    if (me && !App.joined) {
      App.joined = true;
      if (Net.joinTimer) { clearInterval(Net.joinTimer); Net.joinTimer = null; }
      Sound.beep(660, 0.1, 'triangle', 0.12);
    }
    if (!me && App.joined) { UI.toast('Tu as été retiré de la salle', 4000); leave(true); return; }
    renderPhone();
  }

  function renderPhone() {
    if (App.role !== 'player' || !App.state) return;
    const s = App.state;
    const me = (s.players || []).find((p) => p.id === Net.me.id);
    UI.count((s.players || []).length);
    const cur = UI.current();

    if (s.phase === 'lobby') {
      if (cur !== 'pAvatar') {
        UI.screen('pLobby');
        UI.phoneLobby(s.players, Net.me.id, s.code);
        $('pLobbyHint').textContent = 'En attente de l\u2019hôte…';
      }
      return;
    }
    if (s.phase === 'end') {
      if (cur !== 'pLeaderboard' && cur !== 'pEnd') {
        const ranked = (s.ranking || (s.players || []).slice().sort((a, b) => b.score - a.score));
        UI.ranks(ranked, false, Net.me.id);
        UI.endTitle(me ? (ranked[0] && ranked[0].id === me.id ? 'Tu gagnes !' : 'Partie terminée') : 'Classement');
        UI.screen('pEnd');
        if (App.lastPhase !== 'end') { Sound.beep(520, 0.2, 'triangle', 0.14); Sound.beep(780, 0.25, 'triangle', 0.12, 0.15); }
      }
      App.lastPhase = 'end';
      return;
    }
    // question / reveal
    if (cur === 'pLeaderboard') { /* laisse le classement ouvert */ }
    else if (cur !== 'pGame') UI.screen('pGame');
    UI.hostQuestion(s.q.text, s.qi + 1, s.qTotal);
    UI.foundList(s.revealed);
    renderTimerLoop();
    const left = (s.roundEnd - (Date.now() - App.clockSkew)) / 1000;
    $('pAnswer').disabled = s.phase !== 'question' || left <= 0;
    $('btnSubmit').disabled = $('pAnswer').disabled;
    if (s.phase === 'reveal' && App.lastPhase !== 'reveal') {
      App.submitted = false;
      $('pAnswer').value = '';
      const missed = (s.revealed || []).filter((r) => r.missed).length;
      UI.reaction('bad', 'Manche finie', missed ? missed + ' réponse(s) non trouvée(s)' : 'Tout a été trouvé');
    }
    if (s.qi !== App.lastQi) { App.lastQi = s.qi; App.submitted = false; $('pAnswer').value = ''; }
    App.lastPhase = s.phase;
  }

  function renderTimerLoop() {
    if (App.timerTimer) return;
    App.timerTimer = setInterval(() => {
      const s = App.state;
      if (!s || s.phase !== 'question') { UI.timer(0, false); return; }
      const left = (s.roundEnd - (Date.now() - App.clockSkew)) / 1000;
      UI.timer(left, left <= 10);
    }, 250);
  }

  function submitGuess() {
    if (App.role !== 'player' || !App.state || App.state.phase !== 'question') return;
    const inp = $('pAnswer');
    const text = inp.value.trim();
    if (!text) return;
    const now = Date.now();
    if (now - App.lastGuessAt < 400) return;
    App.lastGuessAt = now;
    const left = (App.state.roundEnd - (now - App.clockSkew)) / 1000;
    if (left <= 0) { UI.toast('Temps écoulé'); return; }
    Net.sendEvent({ type: 'guess', text });
    inp.value = '';
  }

  function sendReaction(emoji) {
    if (App.role !== 'player' || !emoji) return;
    const now = Date.now();
    if (now - (App.lastReactionAt || 0) < 3000) return;
    App.lastReactionAt = now;
    UI.emoji(emoji);
    Net.sendEvent({ type: 'reaction', emoji: emoji });
  }

  /* ---------------- retours hôte → joueur ---------------- */
  function playerEvent(ev) {
    if (!ev) return;
    if (ev.to && ev.to !== Net.me.id) return;
    if (ev.type === 'result') {
      if (ev.kind === 'found') UI.reaction('ok', 'Trouvé !', '+' + ev.pts + ' pts · ' + ev.text);
      else if (ev.kind === 'dup') UI.reaction('dup', 'Déjà trouvé', ev.text);
      else if (ev.kind === 'miss') UI.reaction('bad', 'Raté', 'Réessaie !');
    } else if (ev.type === 'reaction') {
      UI.emoji(ev.emoji);
      if (Net.isHost) Scene3D.showEmojiAbove(ev.from, ev.emoji);
    } else if (ev.type === 'denied') {
      UI.toast(ev.reason || 'Refusé', 3500);
      leave(true);
    } else if (ev.type === 'kick') {
      UI.toast('Tu as été exclu de la salle', 4000);
      leave(true);
    } else if (ev.type === 'closed') {
      UI.toast('L\u2019hôte a fermé la salle', 3500);
      leave(true);
    }
  }

  /* =====================================================================
     SORTIE
     ===================================================================== */
  function leave(silent) {
    if (Net.isHost) {
      Net.leaveRoom(false);
      Host.started = false;
      if (Host.tickTimer) { clearInterval(Host.tickTimer); Host.tickTimer = null; }
      App.state = null;
      Net.clearHostState();
    } else {
      Net.leaveRoom(true);
    }
    if (App.timerTimer) { clearInterval(App.timerTimer); App.timerTimer = null; }
    App.role = null; App.joined = false; App.state = null;
    document.body.classList.remove('phone-mode', 'hosting');
    UI.hostVisible(false);
    UI.screen('pHome');
    UI.phoneVisible(true);
    if (!silent) UI.toast('Déconnecté', 1800);
  }

  /* =====================================================================
     CLASSEMENT GÉNÉRAL
     ===================================================================== */
  function siteUrl(code) {
    const base = location.origin + location.pathname.replace(/[^/]*$/, '');
    return base + '?room=' + code;
  }

  async function fetchScores() {
    try {
      const r = await fetch('/api/leaderboard', { headers: { accept: 'application/json' } });
      if (r.ok) {
        const data = await r.json();
        if (data && Array.isArray(data.scores)) return { scores: data.scores, live: true };
      }
    } catch (e) { /* fallback local */ }
    try {
      const local = JSON.parse(localStorage.getItem(LB_KEY) || '[]');
      return { scores: Array.isArray(local) ? local : [], live: false };
    } catch (e) { return { scores: [], live: false }; }
  }

  async function showLeaderboard(back) {
    App.lastScreen = back || 'pHome';
    UI.screen('pLeaderboard');
    UI.leaderboard([], 'Chargement…');
    const { scores, live } = await fetchScores();
    UI.leaderboard(scores, live ? 'Scores partagés (Upstash Redis)' : 'Scores enregistrés sur cet appareil uniquement');
  }

  async function submitScores(ranked) {
    const top = (ranked || []).filter((p) => p.score > 0).slice(0, 10);
    if (!top.length) return;
    const local = (() => { try { return JSON.parse(localStorage.getItem(LB_KEY) || '[]'); } catch (e) { return []; } })();
    const merged = mergeScores(local, top);
    try { localStorage.setItem(LB_KEY, JSON.stringify(merged)); } catch (e) {}
    for (const p of top) {
      try {
        await fetch('/api/leaderboard', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: p.name, score: p.score }),
        });
      } catch (e) { /* hors-ligne : le score local suffit */ }
    }
  }

  function mergeScores(list, top) {
    const map = new Map();
    (list || []).forEach((e) => { if (e && e.name) map.set(e.name, Math.max(e.score || 0, map.get(e.name) || 0)); });
    (top || []).forEach((p) => { map.set(p.name, Math.max(p.score || 0, map.get(p.name) || 0)); });
    return Array.from(map.entries())
      .map(([name, score]) => ({ name, score, date: Date.now() }))
      .sort((a, b) => b.score - a.score).slice(0, 50);
  }

  /* =====================================================================
     NET HOOKS
     ===================================================================== */
  Net.hooks.hostEvent = (ev) => { if (App.role === 'host') hostEvent(ev); };
  Net.hooks.state = (s) => { if (App.role === 'player') onState(s); };
  Net.hooks.playerEvent = (ev) => { if (App.role === 'player') playerEvent(ev); };

  global.App = App;
  global.Sound = Sound;
  global.Host = Host;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
