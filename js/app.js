/* =====================================================================
   js/app.js — orchestration CREATOR · Guess Their Answer
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
    lobby: 'Salle d’attente', countdown: 'Prêts ?', buzz: 'Buzz !', play: 'Au jeu',
    steal: 'Vol !', reveal: 'Révélation', end: 'Fin de partie',
  };
  const LS = {
    host: 'gtq.host',
    player: 'gtq.player',
    role: 'gtq.role',
    name: 'gtq.name',
    avatar: 'gtq.avatar',
  };

  const App = {
    role: null,
    code: '',
    state: null,
    skew: 0,
    lastPhase: null,
    phoneScreen: 'pHome',
    avatarFrom: 'home',
    lbReturn: 'home',
    pending: null,
    hostSession: null,
    playerSession: null,
    playerName: '',
    avatar: null,
    answerFocusKey: '',
    xTimer: null,
    netWarned: false,
    lobbyCollapsed: false,
  };

  if (!global.Scene3D) {
    global.Scene3D = {
      ready: false,
      init: () => false,
      setRound: () => {},
      setPlayers: () => {},
      react: () => {},
      crowdReact: () => {},
      celebrate: () => {},
      reset: () => {},
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
    if (!a || !a.colors) {
      a = global.Avatar.random();
      saveJSON(LS.avatar, a);
    }
    return a;
  }

  /* ---------------- écrans ---------------- */
  function showPlayerScreen(id, force) {
    if (!force && App.phoneScreen === id) return;
    hide($('#hostView'));
    show($('#playerView'));
    $$('#playerView .screen').forEach((sec) => {
      if (sec.id === id) show(sec); else hide(sec);
    });
    App.phoneScreen = id;
    const main = $('.phone-main');
    if (main) main.scrollTop = 0;
    updatePhoneShell();
  }

  function updatePhoneShell() {
    const inRoom = !!App.code && App.role === 'player';
    const btnLeave = $('#btnLeave');
    const phoneRoom = $('.phone-room');
    if (btnLeave) btnLeave.style.display = inRoom ? 'block' : 'none';
    // le code est déjà affiché en grand dans le lobby : pas besoin du badge header là-bas
    if (phoneRoom) phoneRoom.style.display = (App.phoneScreen === 'pLobby') ? 'none' : (inRoom ? 'block' : 'none');
  }

  async function showHostView() {
    hide($('#playerView'));
    show($('#hostView'));
    await ensureScene();
    if (!global.Scene3D?.ready && !App.sceneWarned) {
      App.sceneWarned = true;
      toast('#hostToasts', 'Rendu 3D indisponible sur cet appareil.', 'warn', 4000);
    }
  }

  function toastBox() {
    return App.role === 'host' ? '#hostToasts' : '#phoneToasts';
  }

  /* ---------------- panneau d'invitation rétractable ---------------- */
  function setLobbyCollapsed(collapsed) {
    App.lobbyCollapsed = !!collapsed;
    const view = $('#hostView');
    const panel = $('#hostLobby');
    const openBtn = $('#btnLobbyOpen');
    const closeBtn = $('#btnLobbyCollapse');
    if (view) view.classList.toggle('lobby-collapsed', App.lobbyCollapsed);
    if (panel) {
      panel.setAttribute('aria-hidden', App.lobbyCollapsed ? 'true' : 'false');
      try { panel.inert = App.lobbyCollapsed; } catch (e) {}
    }
    if (closeBtn) closeBtn.setAttribute('aria-expanded', App.lobbyCollapsed ? 'false' : 'true');
    if (openBtn) openBtn.setAttribute('aria-expanded', App.lobbyCollapsed ? 'false' : 'true');
    syncLobbyReopen(!!(App.state && App.state.phase === 'lobby'));
  }

  function closeHostRoom(btn) {
    /* confirmation en deux temps, sans boîte de dialogue native */
    if (!App.closeArmed) {
      App.closeArmed = true;
      const target = btn || $('#btnHostClose');
      if (target) {
        target.dataset.label = target.textContent;
        target.textContent = 'Confirmer ?';
        target.classList.add('btn--armed');
      }
      toast('#hostToasts', 'Appuie à nouveau pour fermer la salle.', 'warn', 3500);
      clearTimeout(App.closeTimer);
      App.closeTimer = setTimeout(() => {
        App.closeArmed = false;
        if (target) {
          target.textContent = target.dataset.label || 'Fermer';
          target.classList.remove('btn--armed');
        }
      }, 4000);
      return;
    }
    App.closeArmed = false;
    clearTimeout(App.closeTimer);
    Net.send('host:close');
    clearKey(LS.host);
    App.hostSession = null;
    resetToHome('Salle fermée.', 'warn');
  }

  function syncLobbyReopen(inLobby) {
    const openBtn = $('#btnLobbyOpen');
    const collapsed = App.lobbyCollapsed && inLobby;
    toggle(openBtn, collapsed);
    if (openBtn && inLobby) openBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    if ($('#lobbyReopenCode')) $('#lobbyReopenCode').textContent = App.code || '-----';
  }

  async function copyJoinLink() {
    const link = joinUrl();
    let ok = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(link);
        ok = true;
      }
    } catch (e) { ok = false; }
    if (!ok) {
      try {
        const area = document.createElement('textarea');
        area.value = link;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        ok = document.execCommand('copy');
        document.body.removeChild(area);
      } catch (e) { ok = false; }
    }
    toast('#hostToasts', ok ? 'Lien copié !' : link, ok ? 'gold' : null, ok ? 2200 : 6000);
  }

  /* ---------------- code / QR ---------------- */
  function joinUrl() {
    const base = Net.publicUrl || location.origin;
    return base + '/?room=' + encodeURIComponent(App.code || '');
  }

  function updateRoomChrome() {
    const code = App.code || '-----';
    if ($('#hostCode')) $('#hostCode').textContent = code;
    if ($('#lobbyCode')) $('#lobbyCode').textContent = code;
    if ($('#lobbyReopenCode')) $('#lobbyReopenCode').textContent = code;
    if ($('#qrCode')) $('#qrCode').textContent = code;
    if ($('#pLobbyCode')) $('#pLobbyCode').textContent = code;
    if ($('#phoneRoom')) $('#phoneRoom').textContent = App.code ? 'SALLE ' + App.code : '';
    if (!App.code) return;

    const url = joinUrl();
    if ($('#joinUrl')) $('#joinUrl').textContent = url;
    if ($('#qrUrl')) $('#qrUrl').textContent = url;
    const src = '/api/qr?text=' + encodeURIComponent(url);
    const imgA = $('#qrImg');
    const imgB = $('#qrImgBig');
    if (imgA && imgA.getAttribute('src') !== src) imgA.src = src;
    if (imgB && imgB.getAttribute('src') !== src) imgB.src = src;
  }

  function showDemoBanner() {
    const banner = $('#demoBanner');
    if (banner) banner.classList.remove('hidden');
  }

  function avatarSvg(avatar) {
    /* Chaque appel régénère un SVG aux identifiants de dégradé uniques :
       le mettre en cache réinjecterait le même id plusieurs fois dans le
       DOM et rendrait les têtes invisibles (chevauchement d'url(#…)). */
    return global.Avatar.svg(avatar || global.Avatar.DEFAULTS);
  }

  /* ------------------------------------------------------------------ */
  /* Chargement différé de la 3D (animateur seulement, jamais téléphone) */
  /* ------------------------------------------------------------------ */
  function loadScript(src) {
    return new Promise((ok, ko) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = ok;
      s.onerror = ko;
      document.head.appendChild(s);
    });
  }
  async function ensureScene() {
    if (global.Scene3D && global.Scene3D.ready) return true;
    if (App.scenePromise) return App.scenePromise;
    App.scenePromise = (async () => {
      await loadScript('assets/vendor/three.min.js');
      await loadScript('js/scene.js');
      if (global.Scene3D) global.Scene3D.init($('#scene'));
      if (global.Scene3D && global.Scene3D.ready && App.role === 'host' && App.state) {
        const s = App.state;
        const inLobby = s.phase === 'lobby';
        if (global.Scene3D.setLobby) global.Scene3D.setLobby(inLobby);
        global.Scene3D.setRound(inLobby || s.phase === 'end' ? 0 : s.qi + 1, s.qTotal, s.multiplier, s.question ? s.question.text : '');
        global.Scene3D.setPlayers(s.players || [], s.controller && s.controller.id, s.stealer && s.stealer.id);
      }
      return !!global.Scene3D && global.Scene3D.ready;
    })();
    return App.scenePromise;
  }

  /* ================================================================== */
  /* INITIALISATION                                                     */
  /* ================================================================== */
  function init() {
    App.hostSession = loadJSON(LS.host);
    App.playerSession = loadJSON(LS.player);
    try { App.playerName = localStorage.getItem(LS.name) || ''; } catch (e) {}
    App.avatar = loadAvatar();

    buildAvatarControls();
    bindEvents();
    updateMuteButton();
    renderHomePreview();
    renderAvatarScreen();

    const params = new URLSearchParams(location.search);
    const room = String(params.get('room') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);

    /* ---------- MODE DÉMO : vraie partie serveur avec 8 bots ---------- */
    if (params.get('demo') === '1') {
      bindNet();
      App.demo = true;
      App.role = 'host';
      saveJSON(LS.role, 'host');
      showHostView();
      showDemoBanner();
      updateRoomChrome();
      const startDemo = () => {
        const payload = {
          name: 'Démo',
          demo: true,
          settings: {
            duration: 30,
            maxPlayers: 20,
            mode: params.get('mode') === 'teams' ? 'teams' : 'solo',
          },
        };
        const send = () => Net.send('host:create', payload);
        if (Net.connected) send();
        else { App.pending = send; Net.connect(); }
      };
      if (global.IntroAnim && !global.IntroAnim.isFinished()) {
        window.addEventListener('intro:done', startDemo, { once: true });
      } else {
        startDemo();
      }
      return;
    }

    bindNet();

    if (room) {
      App.code = room;
      App.role = App.playerSession && App.playerSession.code === room ? 'player' : null;
      showPlayerScreen('pHome', true);
      if ($('#codeIn')) $('#codeIn').value = room;
      document.body.classList.add('join-via-qr');
      if ($('#pRoomChip')) $('#pRoomChip').textContent = 'Salle ' + room;
      if ($('#pQrWelcome')) {
        $('#pQrWelcome').classList.remove('hidden');
        $('#pQrWelcome').textContent = 'Bienvenue ! Tu rejoins la salle ' + room + '. Choisis ton pseudo pour entrer.';
      }
      const input = $('#pseudo');
      if (App.playerName) input.value = App.playerName;
      if (App.playerSession && App.playerSession.code === room) {
        toast('#phoneToasts', 'Reconnexion à la salle ' + room + '…', null, 2000);
      }
      setTimeout(() => { if (input) input.focus({ preventScroll: false }); }, 300);
      Net.connect();
    } else if (params.has('host') || (loadJSON(LS.role) === 'host' && App.hostSession)) {
      enterHost();
    } else {
      App.role = null;
      showPlayerScreen('pHome', true);
      Net.connect();
    }

    updateRoomChrome();
    setInterval(updateClocks, 100);
    setTimeout(updateClocks, 50);
    updateMuteButton();
    /* Le masquage du loader est confié à l'intro animée (js/intro-anim.js).
       L'appel direct est retiré pour éviter tout clignotement avec l'intro. */
  }

  function enterHost() {
    App.role = 'host';
    saveJSON(LS.role, 'host');
    showHostView();
    updateRoomChrome();
    Sound.unlock();
    if (App.hostSession && App.hostSession.code) {
      App.code = App.hostSession.code;
      updateRoomChrome();
      if (Net.connected) {
        Net.send('host:rejoin', { code: App.hostSession.code, hostToken: App.hostSession.token });
      } else {
        Net.connect();
      }
    } else {
      createHostRoom();
    }
  }

  function createHostRoom() {
    showHostView();
    updateRoomChrome();
    const payload = {
      name: App.playerName || 'Animateur',
      settings: {
        duration: Number(($('#selDuration') || {}).value) || 60,
        maxPlayers: Number(($('#selMaxPlayers') || {}).value) || 20,
        categories: selectedCategories(),
      },
    };
    const send = () => Net.send('host:create', payload);
    if (Net.connected) send();
    else { App.pending = send; Net.connect(); }
  }

  function selectedCategories() {
    const active = $$('.cat-btn.active');
    if (!active || active.length === 0) return ['tout'];
    const cats = active.map((b) => b.getAttribute('data-cat'));
    if (cats.includes('tout')) return ['tout'];
    return cats;
  }

  function syncCatButtons(categories) {
    const cats = Array.isArray(categories) ? categories : ['tout'];
    $$('.cat-btn').forEach((b) => {
      const val = b.getAttribute('data-cat');
      const active = cats.includes('tout') ? val === 'tout' : cats.includes(val);
      b.classList.toggle('active', active);
    });
  }

  function resetToHome(message, kind) {
    App.state = null;
    App.role = null;
    App.demo = false;
    App.code = '';
    App.lastPhase = null;
    App.phoneScreen = 'pHome';
    clearKey(LS.role);
    hide($('#hostView'));
    show($('#playerView'));
    closeModal('#hostLobby');
    closeModal('#hostEnd');
    closeModal('#hostLeaderboard');
    closeModal('#qrModal');
    hide($('#hostPaused'));
    showPlayerScreen('pHome', true);
    updateRoomChrome();
    renderHomePreview();
    if (message) toast('#phoneToasts', message, kind || null, 4000);
  }

  /* ================================================================== */
  /* ÉVÉNEMENTS DOM                                                     */
  /* ================================================================== */
  function bindEvents() {
    on(document, 'pointerdown', () => Sound.unlock(), { once: true });
    on(document, 'keydown', () => Sound.unlock(), { once: true });

    /* raccourcis animateur : Espace = action, P = pause, R = révéler, H = masquer la barre */
    on(document, 'keydown', (e) => {
      if (App.role !== 'host' || App.demo) return;
      const tag = (e.target && e.target.tagName) || '';
      if (/INPUT|SELECT|TEXTAREA|BUTTON/.test(tag)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === ' ') { e.preventDefault(); hostMain(); }
      else if (e.key === 'p' || e.key === 'P') Net.send('host:pause');
      else if (e.key === 'r' || e.key === 'R') Net.send('host:reveal');
      else if (e.key === 'h' || e.key === 'H') {
        const hv = $('#hostView');
        if (hv) hv.classList.toggle('hide-bar');
      }
    });

    on($('#btnMute'), 'click', () => {
      const muted = Sound.toggle();
      updateMuteButton();
      toast('#hostToasts', muted ? 'Son coupé.' : 'Son activé.', null, 1600);
      if (!muted) Sound.play('click');
    });

    /* ---- accueil joueur ---- */
    on($('#btnJoin'), 'click', joinGame);
    on($('#codeIn'), 'input', (e) => {
      e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
    });
    on($('#codeIn'), 'keydown', (e) => { if (e.key === 'Enter') joinGame(); });
    on($('#pseudo'), 'keydown', (e) => { if (e.key === 'Enter') joinGame(); });
    on($('#pseudo'), 'input', (e) => {
      App.playerName = e.target.value.slice(0, 16);
      if ($('#avatarName')) $('#avatarName').textContent = App.playerName || 'Joueur';
    });
    on($('#btnAvatar'), 'click', () => openAvatar('home'));
    on($('#btnCreate'), 'click', () => {
      if (App.hostSession && App.hostSession.code) {
        const ok = global.confirm('Reprendre la salle ' + App.hostSession.code + ' ?');
        if (!ok) { App.hostSession = null; clearKey(LS.host); }
      }
      enterHost();
    });
    on($('#btnLeaderTop'), 'click', () => openPlayerLeaderboard('home'));
    on($('#btnDemoHome'), 'click', () => {
      const url = new URL(location);
      url.searchParams.set('demo', '1');
      url.searchParams.delete('room');
      url.searchParams.delete('host');
      location.href = url.toString();
    });
    on($('#btnDemoRestart'), 'click', restartDemo);
    on($('#btnDemoQuit'), 'click', () => {
      App.demo = false;
      clearKey(LS.host);
      const url = new URL(location);
      url.searchParams.delete('demo');
      location.href = url.toString();
    });

    /* ---- personnage ---- */
    on($('#btnAvatarBack'), 'click', closeAvatar);
    on($('#btnAvatarOk'), 'click', closeAvatar);
    on($('#btnAvatarRandom'), 'click', () => {
      App.avatar = global.Avatar.random(App.avatar);
      applyAvatarChange();
      Sound.play('click');
    });
    on($('#silhouetteGrid'), 'click', onChoiceClick);
    on($('#hairGrid'), 'click', onChoiceClick);
    on($('#outfitGrid'), 'click', onChoiceClick);
    on($('#accessoryGrid'), 'click', onChoiceClick);
    ['hair', 'jacket', 'shirt', 'pants', 'shoes'].forEach((key) => {
      const box = $('#' + key + 'Colors');
      if (box) on(box, 'click', (e) => {
        const dot = e.target.closest('.color-dot');
        if (!dot) return;
        App.avatar.colors[key] = dot.dataset.color;
        applyAvatarChange();
        Sound.play('click');
      });
    });

    /* ---- lobby / jeu joueur ---- */
    on($('#btnPlayerAvatar'), 'click', () => openAvatar('lobby'));
    on($('#btnLeaderLobby'), 'click', () => openPlayerLeaderboard('lobby'));
    on($('#btnBuzz'), 'click', () => {
      if (!App.state || !App.state.canBuzz) return;
      Net.send('player:buzz');
      $('#btnBuzz').disabled = true;
      Sound.play('buzz');
      if (navigator.vibrate) navigator.vibrate(60);
      toast('#phoneToasts', 'Buzz envoyé !', null, 1200);
    });
    on($('#btnSubmit'), 'click', submitGuess);
    on($('#pAnswer'), 'keydown', (e) => { if (e.key === 'Enter') submitGuess(); });
    on($('#btnSpectSubmit'), 'click', submitSpectGuess);
    on($('#pSpectAnswer'), 'keydown', (e) => { if (e.key === 'Enter') submitSpectGuess(); });
    on($('#btnLeave'), 'click', () => {
      const inGame = App.state && ['buzz', 'play', 'steal', 'reveal'].includes(App.state.phase);
      if (inGame && !global.confirm('Quitter la partie en cours ?')) return;
      leavePlayer();
    });
    on($('#btnLeaderEnd'), 'click', () => openPlayerLeaderboard('end'));
    on($('#btnHome'), 'click', () => leavePlayer(true));
    on($('#btnLbBack'), 'click', () => {
      const back = App.lbReturn === 'end' ? 'pEnd' : App.lbReturn === 'lobby' ? 'pLobby' : 'pHome';
      showPlayerScreen(back, true);
    });

    /* ---- hôte ---- */
    on($('#btnQr'), 'click', () => { updateRoomChrome(); openModal('#qrModal'); });
    on($('#btnQrClose'), 'click', () => closeModal('#qrModal'));
    on($('#btnHostRetry'), 'click', () => Net.connect());
    on($('#btnPhoneRetry'), 'click', () => Net.connect());
    on($('#btnHostMain'), 'click', hostMain);
    on($('#btnStart'), 'click', hostMain);
    on($('#btnHostSkip'), 'click', () => Net.send('host:next'));
    on($('#btnHostReveal'), 'click', () => Net.send('host:reveal'));
    on($('#btnHostPause'), 'click', () => {
      if (!App.state) return;
      Net.send('host:pause', { paused: !App.state.paused });
    });
    on($('#btnHostPlus15'), 'click', () => Net.send('host:addtime', { seconds: 15 }));
    on($('#btnHostClose'), 'click', (e) => closeHostRoom(e.currentTarget));
    on($('#btnLobbyClose'), 'click', (e) => closeHostRoom(e.currentTarget));
    on($('#btnLobbyCollapse'), 'click', () => {
      setLobbyCollapsed(true);
      if ($('#btnLobbyOpen')) $('#btnLobbyOpen').focus();
    });
    on($('#btnLobbyOpen'), 'click', () => {
      setLobbyCollapsed(false);
      if ($('#btnLobbyCollapse')) $('#btnLobbyCollapse').focus();
    });
    on($('#btnCopyLink'), 'click', copyJoinLink);
    on(document, 'keydown', (e) => {
      if (e.key === 'Escape' && App.state && App.state.phase === 'lobby' && !App.lobbyCollapsed) {
        setLobbyCollapsed(true);
        if ($('#btnLobbyOpen')) $('#btnLobbyOpen').focus();
      }
    });
    on($('#btnLeaderboard'), 'click', () => { openModal('#hostLeaderboard'); loadLeaderboard('#hostLbList', '#hostLbHint'); });
    on($('#btnHostLbBack'), 'click', () => closeModal('#hostLeaderboard'));
    on($('#btnReplay'), 'click', () => {
      closeModal('#hostEnd');
      closeModal('#hostLeaderboard');
      Net.send('host:next');
    });
    on($('#btnShare'), 'click', shareRoom);
    on($('#lobbyPlayers'), 'click', (e) => {
      const btn = e.target.closest('[data-kick]');
      if (!btn) return;
      const name = btn.getAttribute('data-name') || 'ce joueur';
      if (global.confirm('Exclure ' + name + ' ?')) Net.send('host:kick', { playerId: btn.getAttribute('data-kick') });
    });
    on($('#selDuration'), 'change', (e) => Net.send('host:settings', { duration: Number(e.target.value) }));
    on($('#selMaxPlayers'), 'change', (e) => Net.send('host:settings', { maxPlayers: Number(e.target.value) }));
    $$('.cat-btn').forEach((btn) => {
      on(btn, 'click', () => {
        const val = btn.getAttribute('data-cat');
        if (val === 'tout') {
          $$('.cat-btn').forEach((b) => b.classList.toggle('active', b.getAttribute('data-cat') === 'tout'));
        } else {
          btn.classList.toggle('active');
          const tout = $$('.cat-btn[data-cat="tout"]')[0];
          if (tout) tout.classList.remove('active');
        }
        Net.send('host:settings', { categories: selectedCategories() });
      });
    });
  }

  function updateMuteButton() {
    const btn = $('#btnMute');
    if (btn) btn.textContent = Sound.muted ? '🔇' : '🔊';
  }

  function onChoiceClick(e) {
    const btn = e.target.closest('.choice');
    if (!btn) return;
    const group = btn.dataset.group;
    const value = btn.dataset.value;
    if (!group || !value) return;
    App.avatar[group] = value;
    applyAvatarChange();
    Sound.play('click');
  }

  function applyAvatarChange() {
    saveJSON(LS.avatar, App.avatar);
    renderAvatarScreen();
    renderHomePreview();
    if (App.role === 'player' && App.playerSession && App.state && App.state.phase === 'lobby') {
      Net.send('player:avatar', { avatar: App.avatar });
    }
  }

  function openAvatar(from) {
    App.avatarFrom = from;
    if (App.state && App.state.me && App.state.me.avatar) {
      App.avatar = global.Avatar.clone(App.state.me.avatar);
    }
    renderAvatarScreen();
    renderHomePreview();
    showPlayerScreen('pAvatar', true);
  }

  function closeAvatar() {
    const back = App.avatarFrom === 'lobby' ? 'pLobby' : 'pHome';
    showPlayerScreen(back, true);
  }

  /* ================================================================== */
  /* ACCUEIL / CONNEXION JOUEUR                                         */
  /* ================================================================== */
  function joinGame() {
    Sound.unlock();
    const name = String($('#pseudo').value || '').trim().slice(0, 16);
    const code = String($('#codeIn').value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
    if (!name) { toast('#phoneToasts', 'Choisis un pseudo.', 'warn'); $('#pseudo').focus(); return; }
    if (code.length !== 5) { toast('#phoneToasts', 'Le code de la salle fait 5 caractères.', 'warn'); $('#codeIn').focus(); return; }

    App.playerName = name;
    try { localStorage.setItem(LS.name, name); } catch (e) {}
    App.code = code;
    App.role = 'player';
    saveJSON(LS.role, 'player');

    const reuseToken = App.playerSession && App.playerSession.code === code ? App.playerSession.token : '';
    const payload = { code, name, avatar: App.avatar };
    if (reuseToken) payload.token = reuseToken;
    App.joinPayload = payload;
    App.joinAttempts = 0;

    const send = () => Net.send('player:join', payload);
    if (Net.connected) send();
    else { App.pending = send; Net.connect(); }
    updateRoomChrome();
    toast('#phoneToasts', 'Connexion à la salle ' + code + '…', null, 1800);
  }

  function leavePlayer(skipConfirm) {
    if (!skipConfirm && App.state && ['buzz', 'play', 'steal'].includes(App.state.phase)) {
      if (!global.confirm('Quitter la partie en cours ?')) return;
    }
    Net.send('player:leave');
    App.playerSession = null;
    clearKey(LS.player);
    clearKey(LS.role);
    resetToHome('Tu as quitté la salle.', null);
  }

  function openPlayerLeaderboard(from) {
    App.lbReturn = from || 'home';
    showPlayerScreen('pLeaderboard', true);
    loadLeaderboard('#lbList', '#lbHint');
  }

  async function loadLeaderboard(listSel, hintSel) {
    const list = $(listSel);
    const hint = $(hintSel);
    if (hint) hint.textContent = 'Chargement…';
    try {
      await Net.loadConfig();
      const res = await fetch('/api/leaderboard', { cache: 'no-store' });
      const data = await res.json();
      const rows = (data.scores || []).map((e, i) => ({
        rank: i + 1,
        name: e.name,
        score: e.score,
      }));
      rankList(list, rows, {});
      if (data.configured === false) {
        if (hint) hint.textContent = 'Classement général indisponible : stockage non configuré.';
      } else if (hint) {
        hint.textContent = rows.length ? 'Meilleurs scores enregistrés sur ce serveur.' : 'Aucun score enregistré pour le moment.';
      }
    } catch (e) {
      if (hint) hint.textContent = 'Classement indisponible.';
    }
  }

  async function shareRoom() {
    const url = joinUrl();
    const text = 'Rejoins la partie CREATOR · Guess Their Answer — code ' + App.code;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'CREATOR · Guess Their Answer', text, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text + ' ' + url);
        toast('#hostToasts', 'Lien copié dans le presse-papiers.', 'gold');
      } else {
        global.prompt('Copie ce lien :', url);
      }
    } catch (e) {}
  }

  /* ================================================================== */
  /* PERSONNAGE (UI)                                                    */
  /* ================================================================== */
  function buildAvatarControls() {
    const A = global.Avatar;
    const groups = {
      silhouetteGrid: 'silhouette',
      hairGrid: 'hair',
      outfitGrid: 'outfit',
      accessoryGrid: 'accessory',
    };
    for (const [id, group] of Object.entries(groups)) {
      const box = $('#' + id);
      if (!box) continue;
      box.innerHTML = Object.keys(A.LABELS[group]).map((key) =>
        '<button class="choice" data-group="' + group + '" data-value="' + key + '" type="button">' +
        '<span class="choice-ico">' + A.ICONS[group][key] + '</span>' +
        '<span>' + A.LABELS[group][key] + '</span>' +
        '</button>'
      ).join('');
    }
    const colorRows = { hairColors: 'hair', skinColors: 'skin', jacketColors: 'jacket', shirtColors: 'shirt', pantsColors: 'pants', shoeColors: 'shoes' };
    for (const [id, key] of Object.entries(colorRows)) {
      const box = $('#' + id);
      if (!box) continue;
      box.innerHTML = A.PALETTES[key].map((color) =>
        '<button class="color-dot" type="button" data-color="' + color + '" style="background:' + color + '" aria-label="' + color + '"></button>'
      ).join('');
    }
  }

  function renderHomePreview() {
    const box = $('#homePreview');
    if (box) box.innerHTML = avatarSvg(App.avatar);
  }

  function renderAvatarScreen() {
    if (!$('#avatarPreview')) return;
    $('#avatarPreview').innerHTML = avatarSvg(App.avatar);
    $('#avatarName').textContent = App.playerName || 'Joueur';
    $$('#pAvatar .choice').forEach((btn) => {
      btn.classList.toggle('on', App.avatar[btn.dataset.group] === btn.dataset.value);
    });
    const colorRows = { hairColors: 'hair', skinColors: 'skin', jacketColors: 'jacket', shirtColors: 'shirt', pantsColors: 'pants', shoeColors: 'shoes' };
    for (const [id, key] of Object.entries(colorRows)) {
      $$('#' + id + ' .color-dot').forEach((dot) => {
        dot.classList.toggle('on', App.avatar.colors[key] === dot.dataset.color);
      });
    }
    const name = $('#pseudo');
    if (name && !name.value) name.value = App.playerName || '';
  }

  /* ================================================================== */
  /* RÉSEAU                                                             */
  /* ================================================================== */
  function bindNet() {
    let connStart = 0;

    /* Sur Vercel, chaque connexion WebSocket peut atterrir sur une instance
       différente de celle qui héberge la salle. On retente donc la jonction
       sur une nouvelle connexion jusqu'à tomber sur la bonne instance. */
    function retryPlayerJoin() {
      if (!App.joinPayload) return false;
      App.joinAttempts = (App.joinAttempts || 0) + 1;
      if (App.joinAttempts > 8) return false;
      const payload = App.joinPayload;
      const delay = Math.min(200 + App.joinAttempts * 200, 1500);
      setTimeout(() => {
        if (App.role !== 'player') return;
        Net.close();
        App.pending = () => Net.send('player:join', payload);
        Net.connect();
      }, delay);
      return true;
    }

    function retryHostRejoin() {
      if (!App.hostSession) return false;
      App.hostRejoinAttempts = (App.hostRejoinAttempts || 0) + 1;
      if (App.hostRejoinAttempts > 8) return false;
      const session = App.hostSession;
      const delay = Math.min(200 + App.hostRejoinAttempts * 200, 1500);
      setTimeout(() => {
        if (App.role !== 'host') return;
        Net.close();
        App.pending = () => Net.send('host:rejoin', { code: session.code, hostToken: session.token });
        Net.connect();
      }, delay);
      return true;
    }
    Net.onStatus = (status) => {
      const hostTxt = $('#hostReconnectTxt');
      const phoneTxt = $('#phoneReconnectTxt');
      const connecting = status === 'connecting';
      const disconnected = status === 'disconnected';
      const showBanner = connecting || disconnected;
      toggle($('#hostReconnect'), showBanner);
      toggle($('#phoneReconnect'), showBanner);
      if (connecting) {
        connStart = Date.now();
        App.connectAttempts = (App.connectAttempts || 0) + 1;
        const txt = 'Connexion au serveur… (' + App.connectAttempts + ')';
        if (hostTxt) hostTxt.textContent = txt;
        if (phoneTxt) phoneTxt.textContent = txt;
        if (!App.connWakeScheduled) {
          App.connWakeScheduled = true;
          setTimeout(() => {
            if (Net.connecting && !Net.connected) {
              toast(toastBox(), 'Le serveur se réveille, patiente quelques secondes.', 'info', 6000);
            }
          }, 4000);
        }
      } else if (disconnected) {
        const txt = Net.everConnected ? 'Reconnexion…' : 'Connexion perdue — reconnexion…';
        if (hostTxt) hostTxt.textContent = txt;
        if (phoneTxt) phoneTxt.textContent = txt;
          if (!Net.everConnected && Net.retry >= 3 && !App.netWarned) {
            App.netWarned = true;
            toast(toastBox(), 'Serveur de jeu injoignable. Lancez npm start (ou verifiez GAME_WS_URL).', 'bad', 8000);
          }
      } else {
        App.connectAttempts = 0;
        App.connWakeScheduled = false;
        App.netWarned = false;
      }
    };

    Net.onOpen = () => {
      const pending = App.pending;
      App.pending = null;
      if (pending) { pending(); return; }
      reauth();
    };

    Net.handlers['host:created'] = (msg) => {
      App.role = 'host';
      App.code = msg.code;
      App.lastPhase = null;
      if (App.demo) {
        App.hostSession = null;
        clearKey(LS.host);
        updateRoomChrome();
        showHostView();
        showDemoBanner();
        return;
      }
      App.hostSession = { code: msg.code, token: msg.hostToken };
      saveJSON(LS.host, App.hostSession);
      saveJSON(LS.role, 'host');
      updateRoomChrome();
      showHostView();
      Sound.play('join');
      toast('#hostToasts', 'Salle ' + msg.code + ' créée. Partage le code !', 'gold', 3500);
    };

    Net.handlers['host:joined'] = (msg) => {
      App.role = 'host';
      App.code = msg.code;
      App.hostRejoinAttempts = 0;
      if (msg.hostToken) {
        App.hostSession = { code: msg.code, token: msg.hostToken };
        saveJSON(LS.host, App.hostSession);
      }
      updateRoomChrome();
      showHostView();
    };

    Net.handlers.joined = (msg) => {
      App.role = 'player';
      App.code = msg.code;
      App.joinAttempts = 0;
      App.joinPayload = null;
      App.playerSession = {
        code: msg.code,
        token: msg.token,
        playerId: msg.playerId,
        name: msg.name,
      };
      saveJSON(LS.player, App.playerSession);
      saveJSON(LS.role, 'player');
      if (msg.avatar) {
        App.avatar = global.Avatar.clone(msg.avatar);
        saveJSON(LS.avatar, App.avatar);
      }
      App.playerName = msg.name || App.playerName;
      if ($('#pseudo') && App.playerName) $('#pseudo').value = App.playerName;
      App.lastPhase = null;
      updateRoomChrome();
      showPlayerScreen('pLobby', true);
      renderAvatarScreen();
      Sound.play('join');
      toast('#phoneToasts', msg.reconnected ? 'Reconnecté à la salle !' : 'Bienvenue dans la salle ' + msg.code + ' !', 'gold', 2500);
    };

    Net.handlers.state = onState;
    Net.handlers.event = onEvent;

    Net.handlers.error = (msg) => {
      const code = msg.code;
      if (code === 'not-found' && App.role === 'player' && retryPlayerJoin()) return;
      if (code === 'host-gone' && App.role === 'host' && retryHostRejoin()) return;
      toast(toastBox(), msg.message || 'Erreur.', 'bad', 4000);
      if (code === 'avatar_taken') {
        App.avatar = loadJSON(LS.avatar) || App.avatar;
        if (App.state && App.state.me && App.state.me.avatar) App.avatar = global.Avatar.clone(App.state.me.avatar);
        renderAvatarScreen();
        renderHomePreview();
      }
      if (code === 'host-gone') {
        App.hostSession = null;
        clearKey(LS.host);
        App.state = null;
        if (App.role === 'host') {
          toast('#hostToasts', 'Salle précédente introuvable : création d’une nouvelle salle…', 'warn', 3500);
          setTimeout(createHostRoom, 400);
        }
      }
      if (code === 'not-found' || code === 'locked' || code === 'full' || code === 'host-gone') {
        if (App.role === 'player' && App.playerSession) {
          App.playerSession = null;
          clearKey(LS.player);
          clearKey(LS.role);
          setTimeout(() => resetToHome(msg.message || 'Connexion impossible.', 'bad'), 900);
        }
      }
      if (code === 'no-player') {
        toast('#hostToasts', 'Ajoute au moins un joueur avant de lancer.', 'warn');
      }
    };
  }

  function reauth() {
    if (App.role === 'host' && App.hostSession && App.hostSession.code) {
      Net.send('host:rejoin', { code: App.hostSession.code, hostToken: App.hostSession.token });
    } else if (App.role === 'player' && App.playerSession && App.playerSession.token) {
      const payload = {
        code: App.playerSession.code,
        name: App.playerName || App.playerSession.name,
        avatar: App.avatar,
        token: App.playerSession.token,
      };
      App.joinPayload = payload;
      Net.send('player:join', payload);
    }
  }

  /* ================================================================== */
  /* ÉTAT                                                               */
  /* ================================================================== */
  function onState(s) {
    const phaseChanged = s.phase !== App.lastPhase;
    App.state = s;
    App.skew = Date.now() - (s.serverNow || Date.now());
    App.code = s.code || App.code;
    if (s.role) App.role = s.role;

    if (App.role === 'host') {
      showHostView();
      renderHost(s, phaseChanged);
    } else {
      renderPlayer(s, phaseChanged);
    }
    updateRoomChrome();
    updateClocks();

    if (s.phase === 'end' && phaseChanged) {
      if (App.role === 'host') {
        Sound.play('win');
        confetti($('#confetti'), 3.4);
      } else if (s.me && s.ranking) {
        Sound.play(s.ranking[0] && s.ranking[0].id === s.me.id ? 'win' : 'lose');
      }
    }
    App.lastPhase = s.phase;
  }

  /* ================================================================== */
  /* RENDU ANIMATEUR                                                    */
  /* ================================================================== */
  function renderHost(s, phaseChanged) {
    const inLobby = s.phase === 'lobby';
    const isEnd = s.phase === 'end';

    if (inLobby && phaseChanged) App.lobbyCollapsed = false;
    const hostView = $('#hostView');
    if (hostView) {
      hostView.classList.toggle('is-lobby', inLobby && !isEnd);
      hostView.classList.toggle('is-demo', !!App.demo);
    }

    toggle($('#hostLobby'), inLobby && !isEnd);
    syncLobbyReopen(inLobby && !isEnd);
    toggle($('#hostEnd'), isEnd);
    toggle($('#hostPaused'), !!s.paused);
    if ($('#btnHostPause')) $('#btnHostPause').textContent = s.paused ? 'Reprendre' : 'Pause';

    if ($('#hostRound')) {
      if (inLobby) $('#hostRound').textContent = 'SALLE D’ATTENTE';
      else if (isEnd) $('#hostRound').textContent = 'FIN DE PARTIE';
      else {
        const mult = s.multiplier || 1;
        $('#hostRound').textContent = 'MANCHE ' + Math.min(s.qi + 1, s.qTotal) + ' / ' + s.qTotal +
          (mult > 1 ? ' · ×' + String(mult).replace('.', ',') : '');
      }
    }
    if ($('#hostQuestion')) {
      let text = 'En attente des joueurs…';
      if (s.question) text = s.question.text;
      if (isEnd) text = 'Partie terminée. Bravo à tous !';
      $('#hostQuestion').textContent = text;
    }
    if ($('#hostPhase')) $('#hostPhase').textContent = s.paused ? 'Pause' : (PHASE_LABEL[s.phase] || s.phase);
    const pot = $('#hostPot');
    if (pot) {
      pot.textContent = 'Cagnotte ' + fmt(s.pot);
      toggle(pot, s.pot > 0);
    }

    renderHostBoard(s);
    renderHostStrikes(s);
    renderHostScoreboard(s);
    renderHostWrong(s);
    renderHostLobby(s);
    renderHostControls(s);

    if (isEnd) {
      const rows = s.ranking || [];
      rankList($('#hostRank'), rows, {});
      const win = rows[0];
      if ($('#hostWinner')) {
        $('#hostWinner').innerHTML = win
          ? 'Vainqueur : <b>' + esc(win.name) + '</b> — ' + fmt(win.score) + ' pts'
          : '';
      }
    }

    if (global.Scene3D.setLobby) global.Scene3D.setLobby(inLobby && !isEnd);
    if (phaseChanged && global.Scene3D.ready) {
      global.Scene3D.setRound(inLobby || isEnd ? 0 : s.qi + 1, s.qTotal, s.multiplier, s.question ? s.question.text : '');
    }
    if (global.Scene3D.ready) {
      global.Scene3D.setPlayers(s.players || [], s.controller && s.controller.id, s.stealer && s.stealer.id);
    }

    if (inLobby && phaseChanged) {
      setTimeout(() => { if ($('#qrImg')) updateRoomChrome(); }, 60);
    }
  }

  function renderHostBoard(s) {
    const board = $('#board');
    if (!board) return;
    const off = s.phase === 'lobby' || s.phase === 'end';
    board.classList.toggle('hidden', off);
    if (off) return;
    const slots = s.question ? s.question.slots : 0;
    if (board.dataset.slots !== String(slots)) {
      board.dataset.slots = String(slots);
      board.innerHTML = '';
      for (let i = 0; i < slots; i++) {
        const card = document.createElement('div');
        card.className = 'board-card';
        card.innerHTML =
          '<div class="card-inner">' +
          '<div class="card-face card-front"><span class="card-idx">' + (i + 1) + '</span><span class="card-q">•••</span></div>' +
        '<div class="card-face card-back">' +
        '<span class="card-answer"></span>' +
        '<span class="card-by"></span>' +
        '<span class="card-points"></span>' +
        '</div></div>';
        board.appendChild(card);
      }
    }
    const byIndex = new Map((s.board || []).map((r) => [r.i, r]));
    const cards = $$('.board-card', board);
    cards.forEach((card, i) => {
      const row = byIndex.get(i);
      card.classList.toggle('revealed', !!row);
      card.classList.toggle('missed', !!(row && row.missed));
      card.classList.toggle('active', !!(row && s.phase === 'reveal' && !row.missed));
      if (row) {
        const a = $('.card-answer', card);
        const p = $('.card-points', card);
        const b = $('.card-by', card);
        if (a) a.textContent = row.text;
        if (p) p.textContent = fmt(row.pts);
        if (b) b.textContent = row.by ? 'Trouvé par ' + row.by : '';
        card.title = row.by ? 'Trouvé par ' + row.by : '';
      }
    });
  }

  function renderHostStrikes(s) {
    const box = $('#hostStrikes');
    if (!box) return;
    box.classList.toggle('hidden', s.phase === 'lobby' || s.phase === 'end');
    const max = s.maxStrikes || 3;
    if (box.children.length !== max) {
      box.innerHTML = '';
      for (let i = 0; i < max; i++) {
        const x = document.createElement('span');
        x.className = 'strike-x';
        x.textContent = '✕';
        box.appendChild(x);
      }
    }
    Array.from(box.children).forEach((x, i) => x.classList.toggle('on', i < (s.strikes || 0)));
  }

  function renderHostScoreboard(s) {
    const box = $('#hostScoreboard');
    if (!box) return;
    const lead = Math.max.apply(null, (s.players || []).map((p) => p.score || 0));
    box.innerHTML = (s.players || []).map((p) => {
      const active = (s.controller && s.controller.id === p.id) || (s.stealer && s.stealer.id === p.id);
      const cls = 'score-chip' + (active ? ' on' : '') + (p.connected === false ? ' offline' : '') + (lead > 0 && p.score === lead ? ' lead' : '');
      return '<span class="' + cls + '">' +
        '<span class="mini-avatar">' + avatarSvg(p.avatar) + '</span>' +
        '<span class="sc-name">' + esc(p.name) + '</span>' +
        '<span class="sc-score">' + fmt(p.score) + '</span>' +
        '</span>';
    }).join('');
  }

  function renderHostWrong(s) {
    const banner = $('#hostWrong');
    const list = $('#hostWrongList');
    if (!banner || !list) return;
    const guesses = s.wrongGuesses || [];
    toggle(banner, guesses.length > 0);
    if (!guesses.length) { list.innerHTML = ''; return; }
    list.innerHTML = guesses.slice(-5).map((g) =>
      '<span class="wrong-item">' + esc(g.by) + ' : « ' + esc(g.text) + ' »</span>'
    ).join('');
  }

  function renderHostLobby(s) {
    if (s.phase !== 'lobby') {
      if ($('#btnStart')) $('#btnStart').disabled = true;
      return;
    }
    if ($('#lobbyCode')) $('#lobbyCode').textContent = s.code || App.code;
    const box = $('#lobbyPlayers');
    if (box) {
      box.innerHTML = (s.players || []).map((p) =>
        '<span class="lobby-player">' +
        '<span class="mini-avatar">' + avatarSvg(p.avatar) + '</span>' +
        '<span>' + esc(p.name) + '</span>' +
        '<button type="button" data-kick="' + esc(p.id) + '" data-name="' + esc(p.name) + '" title="Exclure">✕</button>' +
        '</span>'
      ).join('');
    }
    if ($('#btnStart')) $('#btnStart').disabled = !(s.players && s.players.length);
    if ($('#lobbyReopenCode')) $('#lobbyReopenCode').textContent = s.code || App.code || '-----';
    setLobbyCollapsed(App.lobbyCollapsed);
    const dur = $('#selDuration');
    const maxp = $('#selMaxPlayers');
    if (dur && document.activeElement !== dur) dur.value = String(s.settings.duration);
    if (maxp && document.activeElement !== maxp) maxp.value = String(s.settings.maxPlayers);
    syncCatButtons(s.settings.categories);
    updateRoomChrome();
  }

  function renderHostControls(s) {
    const main = $('#btnHostMain');
    if (App.demo) {
      if (main) {
        main.textContent = 'Recommencer la démo';
        main.disabled = false;
      }
      return;
    }
    if (main) {
      let label = 'Terminer la manche';
      let disabled = false;
      if (s.phase === 'lobby') { label = 'Lancer la partie'; disabled = !(s.players && s.players.length); }
      else if (s.phase === 'reveal') { label = 'Manche suivante'; disabled = false; }
      else if (s.phase === 'end') label = 'Rejouer';
      main.textContent = label;
      main.disabled = disabled;
    }
    const skip = $('#btnHostSkip');
    if (skip) skip.disabled = s.phase === 'lobby' || s.phase === 'end';
    const reveal = $('#btnHostReveal');
    if (reveal) reveal.disabled = !['buzz', 'play', 'steal', 'reveal'].includes(s.phase);
    const pause = $('#btnHostPause');
    if (pause) pause.disabled = !['buzz', 'play', 'steal', 'reveal'].includes(s.phase);
    const plus = $('#btnHostPlus15');
    if (plus) plus.disabled = !['buzz', 'play', 'steal'].includes(s.phase);
  }

  function restartDemo() {
    if (!App.demo) return;
    Net.send('host:close');
    Net.send('host:create', { name: 'Démo', demo: true, settings: { duration: 30, maxPlayers: 20, mode: 'solo' } });
    toast('#hostToasts', 'Nouvelle démo lancée.', 'gold', 2000);
  }

  function hostMain() {
    const s = App.state;
    if (App.demo) { restartDemo(); return; }
    if (!s) return;
    if (s.phase === 'lobby') Net.send('host:start');
    else Net.send('host:next');
    closeModal('#hostEnd');
    closeModal('#hostLeaderboard');
    Sound.play('click');
  }

  /* ================================================================== */
  /* RENDU JOUEUR                                                       */
  /* ================================================================== */
  function renderPlayer(s, phaseChanged) {
    const isEnd = s.phase === 'end';
    const isLobby = s.phase === 'lobby';
    const editingAvatar = App.phoneScreen === 'pAvatar';
    const onBoard = App.phoneScreen === 'pLeaderboard';

    if (isEnd) {
      showPlayerScreen('pEnd', true);
      closeModal('#hostEnd');
    } else if (isLobby) {
      if (!editingAvatar && !onBoard) showPlayerScreen('pLobby');
    } else {
      if ((!editingAvatar && !onBoard) || phaseChanged) showPlayerScreen('pGame');
    }

    if ($('#phoneRoom')) $('#phoneRoom').textContent = App.code ? 'SALLE ' + App.code : '';
    if ($('#pLobbyCode')) $('#pLobbyCode').textContent = App.code || '-----';

    if (isLobby) renderPlayerLobby(s);
    else if (isEnd) renderPlayerEnd(s);
    else renderPlayerGame(s);
  }

  function renderPlayerLobby(s) {
    if ($('#pLobbyCode')) $('#pLobbyCode').textContent = s.code || App.code;
    const me = s.me || {};
    const preview = $('#lobbyPreview');
    if (preview && me.avatar) preview.innerHTML = '<div class="avatar-preview">' + avatarSvg(me.avatar) + '</div>';
    const box = $('#pLobbyList');
    if (box) {
      box.innerHTML = (s.players || []).map((p) => {
        const isMe = p.id === me.id;
        return '<span class="lobby-player' + (isMe ? ' me' : '') + '">' +
          '<span class="mini-avatar">' + avatarSvg(p.avatar) + '</span>' +
          '<span>' + esc(p.name) + '</span>' +
          '</span>';
      }).join('');
    }
    if ($('#pLobbyHint')) {
      const n = (s.players || []).length;
      $('#pLobbyHint').textContent = n < 2
        ? 'En attente d’autres joueurs et du lancement par l’animateur…'
        : n + ' joueurs prêts. L’animateur va lancer la partie.';
    }
  }

  function renderPlayerGame(s) {
    const me = s.me || {};
    if ($('#pQnum')) $('#pQnum').textContent = 'MANCHE ' + Math.min(s.qi + 1, s.qTotal) + ' / ' + s.qTotal;
    if ($('#pQuestion')) $('#pQuestion').textContent = s.question ? s.question.text : '…';
    if ($('#pScore')) $('#pScore').textContent = fmt(me.score);

    const box = $('#pStrikes');
    if (box) {
      const max = s.maxStrikes || 3;
      if (box.children.length !== max) {
        box.innerHTML = '';
        for (let i = 0; i < max; i++) {
          const x = document.createElement('span');
          x.className = 'strike-x';
          x.textContent = '✕';
          box.appendChild(x);
        }
      }
      Array.from(box.children).forEach((x, i) => x.classList.toggle('on', i < (s.strikes || 0)));
    }

    const status = $('#pStatus');
    if (status) {
      status.className = 'game-status';
      let text = 'En attente…';
      if (s.paused) text = 'Partie en pause';
      else if (s.phase === 'countdown') {
        text = s.canBuzz ? 'À toi de buzzer !' : 'Décompte…';
        if (s.canBuzz) status.classList.add('you');
      } else if (s.phase === 'buzz') {
        text = s.canBuzz ? 'À toi de buzzer !' : 'Attends le signal…';
        if (s.canBuzz) status.classList.add('you');
        } else if (s.phase === 'play') {
        if (me.isController) { text = 'C’est à toi ! Propose une réponse.'; status.classList.add('you'); }
        else if (me.isTeammate) { text = 'Ton équipe joue. Propose aussi !'; status.classList.add('you'); }
        else if (s.canGuessSpectator) { text = 'Devine aussi pour un bonus.'; status.classList.add('steal'); }
        else text = (s.controller ? s.controller.name : 'Un joueur') + ' joue…';
      } else if (s.phase === 'steal') {
        if (me.isStealer) { text = 'VOL ! À toi de rafler la cagnotte !'; status.classList.add('steal'); }
        else if (me.isController) text = 'Vol en cours…';
        else if (s.canBuzz) { text = 'À toi de voler ! Buzze maintenant !'; status.classList.add('steal'); }
        else text = (s.stealer ? s.stealer.name : 'Un joueur') + ' tente de voler…';
      } else if (s.phase === 'reveal') {
        text = 'Réponses révélées — on passe à la suite.';
      }
      status.textContent = text;
    }

    const buzz = $('#btnBuzz');
    if (buzz) {
      toggle(buzz, !!s.canBuzz);
      buzz.disabled = !s.canBuzz;
    }

    const answer = $('#pAnswer');
    const send = $('#btnSubmit');
    const canAnswer = !!s.canAnswer;
    if (answer) {
      answer.disabled = !canAnswer;
      answer.placeholder = canAnswer ? 'Ta réponse…' : (s.phase === 'steal' ? 'Vol en cours…' : 'Attends ton tour…');
    }
    if (send) send.disabled = !canAnswer;

    /* Spectateur actif : "Devine aussi" (bonus secret) */
    const spectBox = $('#pSpectatorBox');
    const spectInput = $('#pSpectAnswer');
    const spectSend = $('#btnSpectSubmit');
    const canSpect = !!s.canGuessSpectator;
    if (spectBox) toggle(spectBox, canSpect);
    if (spectInput) {
      spectInput.disabled = !canSpect;
      spectInput.placeholder = canSpect ? 'Propose en secret…' : '';
    }
    if (spectSend) spectSend.disabled = !canSpect;
    if (canSpect) {
      const key = s.qi + '|play|spect|' + (me.id || '');
      if (App.spectFocusKey !== key) {
        App.spectFocusKey = key;
        setTimeout(() => { if (spectInput && !spectInput.disabled) spectInput.focus(); }, 80);
      }
    } else {
      App.spectFocusKey = '';
    }

    if (canAnswer) {
      const key = s.qi + '|' + s.phase + '|' + (me.isController ? 'c' : 's') + '|' + (s.stealer ? s.stealer.id : '');
      if (App.answerFocusKey !== key) {
        App.answerFocusKey = key;
        setTimeout(() => { if (answer && !answer.disabled) answer.focus(); }, 80);
      }
    } else {
      App.answerFocusKey = '';
    }

    renderMiniBoard(s);

    const found = $('#pFound');
    if (found) {
      found.innerHTML = (s.board || []).map((r) =>
        '<span' + (r.missed ? ' class="missed"' : '') + '>' + esc(r.text) + ' +' + fmt(r.pts) + '</span>'
      ).join('');
    }

    const pot = $('#pPot');
    if (pot) {
      toggle(pot, s.pot > 0);
      const b = $('b', pot);
      if (b) b.textContent = fmt(s.pot);
    }
  }

  function renderMiniBoard(s) {
    const box = $('#pMiniBoard');
    const list = $('#pMiniList');
    if (!box || !list) return;
    const me = s.me || {};
    const rows = (s.players || [])
      .map((p) => ({ id: p.id, name: p.name, score: Number(p.score) || 0 }))
      .sort((a, b) => b.score - a.score);
    const top = rows.slice(0, 3);
    const inTop = top.some((r) => r.id === me.id);
    if (!inTop && me.id) {
      const mine = rows.find((r) => r.id === me.id);
      if (mine) top.push(mine);
    }
    box.hidden = rows.length < 2;
    list.innerHTML = top.map((r, i) => {
      const rank = rows.indexOf(r) + 1;
      const isMe = r.id === me.id;
      return '<li class="mini-board-row' + (isMe ? ' me' : '') + '">' +
        '<span class="mini-board-pos">' + (i < 3 ? rank : '…') + '</span>' +
        '<span class="mini-board-name">' + esc(r.name || 'Joueur') + '</span>' +
        '<span class="mini-board-score">' + fmt(r.score) + '</span>' +
        '</li>';
    }).join('');
  }

  function renderPlayerEnd(s) {
    const rows = s.ranking || (s.players || []).slice().sort((a, b) => b.score - a.score).map((p, i) => ({
      rank: i + 1, id: p.id, name: p.name, score: p.score, avatar: p.avatar,
    }));
    rankList($('#pRank'), rows, { meId: s.me && s.me.id });
    const win = rows[0];
    if ($('#pEndTitle')) {
      $('#pEndTitle').textContent = win && s.me && win.id === s.me.id ? 'Tu as gagné !' : 'Classement final';
    }
    if ($('#pWinner')) {
      $('#pWinner').innerHTML = win
        ? 'Vainqueur : <b>' + esc(win.name) + '</b> — ' + fmt(win.score) + ' pts'
        : '';
    }
  }

  function submitGuess() {
    const s = App.state;
    if (!s || !s.canAnswer) return;
    const input = $('#pAnswer');
    if (!input) return;
    const text = input.value.trim();
    if (!text) { input.focus(); return; }
    Net.send('player:guess', { text });
    input.value = '';
    input.focus();
    Sound.play('click');
  }

  function submitSpectGuess() {
    const s = App.state;
    if (!s || !s.canGuessSpectator) return;
    const input = $('#pSpectAnswer');
    if (!input) return;
    const text = input.value.trim();
    if (!text) { input.focus(); return; }
    Net.send('player:guess', { text });
    input.value = '';
    input.focus();
    Sound.play('click');
  }

  /* ================================================================== */
  /* ÉVÉNEMENTS SERVEUR                                                 */
  /* ================================================================== */
  function onEvent(msg) {
    const ev = msg.event;
    const d = msg.data || {};
    const isHost = App.role === 'host';

    switch (ev) {
      case 'game-start':
        closeModal('#hostLobby');
        closeModal('#hostEnd');
        if (isHost) toast('#hostToasts', 'La partie commence !', 'gold', 2600);
        else toast('#phoneToasts', 'La partie commence !', 'gold', 2200);
        Sound.play('join');
        break;

      case 'round-start':
        if (isHost) Sound.play('tick');
        break;

      case 'control':
        if (isHost) {
          toast('#hostToasts', d.name + ' prend la main !', null, 2200);
          Sound.play('buzz');
          if (App.state) {
            const p = (App.state.players || []).find((x) => x.name === d.name);
            if (p) global.Scene3D.react(p.id, 'buzz');
          }
        } else {
          toast('#phoneToasts', d.name + ' prend la main !', null, 1600);
        }
        break;

      case 'stealer':
        toast(toastBox(), d.name + ' tente de voler la cagnotte !', 'gold', 2400);
        if (isHost && App.state) {
          const p = (App.state.players || []).find((x) => x.name === d.name);
          if (p) global.Scene3D.react(p.id, 'buzz');
        }
        break;

      case 'found':
        if (isHost) {
          toast('#hostToasts', d.name + ' trouve « ' + d.text + ' » (+' + fmt(d.pts) + ')', null, 2400);
          global.Scene3D.react(d.playerId, 'joy');
          global.Scene3D.crowdReact('found');
          Sound.play('found');
        }
        break;

      case 'spectator-found':
        if (!isHost && d.secret) {
          toast('#phoneToasts', 'Bonus spectateur : « ' + d.text + ' » (+' + fmt(d.pts) + ')', 'gold', 2600);
          Sound.play('found');
        }
        break;

      case 'spectator-bonus':
        if (!isHost) toast('#phoneToasts', d.name + ' a trouvé « ' + d.text + ' » en secret (+' + fmt(d.pts) + ')', 'gold', 2600);
        break;

      case 'strike':
        flashX();
        Sound.play('wrong');
        if (isHost) {
          toast('#hostToasts', 'Raté : « ' + d.text + ' »', 'warn', 2200);
          global.Scene3D.crowdReact('error');
          if (App.state) {
            const p = (App.state.players || []).find((x) => x.name === d.name);
            if (p) global.Scene3D.react(p.id, 'error');
          }
        }
        break;

      case 'no-buzz':
        toast(toastBox(), 'Personne n’a buzzé — relance…', 'warn', 3000);
        Sound.play('tick');
        break;

      case 'steal-open':
        toast(toastBox(), '3 erreurs ! La cagnotte peut être volée.', 'gold', 3200);
        Sound.play('steal');
        break;

      case 'steal-failed':
        toast(toastBox(), d.name + ' a raté le vol.', 'warn', 2400);
        Sound.play('wrong');
        if (isHost) global.Scene3D.crowdReact('error');
        break;

      case 'round-end': {
        const a = d.awards;
        if (a && a.amount > 0) {
          toast(toastBox(), a.winnerName + ' remporte ' + fmt(a.amount) + ' points !', 'gold', 3200);
          if (isHost && App.state) global.Scene3D.react(a.winnerId, 'joy');
        }
        if (isHost) global.Scene3D.crowdReact(d.reason === 'complete' ? 'celebrate' : 'error');
        break;
      }

      case 'paused':
        toast(toastBox(), d.paused ? 'Partie en pause.' : 'Reprise de la partie !', null, 2200);
        break;

      case 'player-joined':
        if (isHost) {
          toast('#hostToasts', d.name + ' a rejoint la salle.', null, 2200);
          Sound.play('join');
          global.Scene3D.crowdReact('found');
        }
        break;

      case 'game-over':
        if (isHost) {
          confetti($('#confetti'), 3.6);
          Sound.play('win');
          global.Scene3D.celebrate();
          global.Scene3D.crowdReact('celebrate');
        }
        break;

      case 'result':
        onPlayerResult(d);
        break;

      case 'kicked':
        App.playerSession = null;
        clearKey(LS.player);
        clearKey(LS.role);
        resetToHome(d.message || 'Tu as été retiré de la salle.', 'bad');
        break;

      case 'closed':
        if (App.demo) {
          /* en démo, une fermeture est suivie d'une relance immédiate */
          App.state = null;
          App.lastPhase = null;
          break;
        }
        clearKey(LS.host);
        clearKey(LS.player);
        clearKey(LS.role);
        App.hostSession = null;
        App.playerSession = null;
        resetToHome(d.message || 'La salle a été fermée.', 'warn');
        break;

      default:
        break;
    }
  }

  function onPlayerResult(d) {
    if (App.role !== 'player') return;
    if (d.kind === 'found') {
      reaction('found', 'TROUVÉ !', (d.text ? '« ' + d.text + ' » ' : '') + '+' + fmt(d.pts) + ' pts', 1500);
      Sound.play('found');
      if (navigator.vibrate) navigator.vibrate([20, 40, 20]);
    } else if (d.kind === 'steal') {
      reaction('steal', 'VOLÉ !', (d.text ? '« ' + d.text + ' » ' : '') + '+' + fmt(d.pts) + ' pts', 1800);
      Sound.play('steal');
      if (navigator.vibrate) navigator.vibrate([30, 50, 30, 50, 60]);
    } else if (d.kind === 'dup') {
      reaction('dup', 'DÉJÀ TROUVÉ', d.text || 'Cette réponse est déjà sur le tableau.', 1400);
      Sound.play('tick');
    } else if (d.kind === 'miss') {
      reaction('bad', 'RATÉ', 'Ce n’est pas sur le tableau. Réessaie !', 1500);
      Sound.play('wrong');
      if (navigator.vibrate) navigator.vibrate(80);
    } else if (d.kind === 'wait') {
      toast('#phoneToasts', 'Ce n’est pas ton tour.', 'warn', 1600);
    }
  }

  function flashX() {
    const x = $('#bigX');
    if (!x) return;
    clearTimeout(App.xTimer);
    x.classList.remove('hidden');
    x.style.animation = 'none';
    void x.offsetWidth;
    x.style.animation = '';
    App.xTimer = setTimeout(() => x.classList.add('hidden'), 850);
  }

  /* ================================================================== */
  /* HORLOGES                                                           */
  /* ================================================================== */
  function updateClocks() {
    const s = App.state;
    const timed = s && s.phaseEnd > 0 && !s.paused &&
      ['countdown', 'buzz', 'play', 'steal'].includes(s.phase);
    const running = s && s.phaseEnd > 0 && !s.paused && ['buzz', 'play', 'steal'].includes(s.phase);
    let remaining = 0;
    /* jamais de « -- » : 0 tant qu'aucun chrono n'est actif */
    let label = '0';
    if (timed) {
      remaining = Math.max(0, s.phaseEnd - (Date.now() - App.skew));
      label = String(secs(remaining));
    }
    const low = running && remaining <= 10000;
    [['#hostTimer', '#hostTimerWrap'], ['#pTimer', '#pTimerWrap']].forEach(([id]) => {
      const el = $(id);
      if (!el) return;
      if (el.textContent !== label) el.textContent = label;
      el.classList.toggle('low', low);
    });
    const cd = $('#hostCountdown');
    if (cd) {
      const on = !!s && s.phase === 'countdown' && !App.demo;
      cd.classList.toggle('hidden', !on);
      if (on && timed) {
        const n = Math.max(1, Math.ceil(remaining / 1000));
        if ($('#hostCountdownNum') && $('#hostCountdownNum').textContent !== String(n)) {
          $('#hostCountdownNum').textContent = String(n);
          const el = $('#hostCountdownNum');
          el.style.animation = 'none';
          void el.offsetWidth;
          el.style.animation = '';
        }
      }
    }
    const hw = $('#hostTimerWrap');
    const pw = $('#pTimerWrap');
    if (hw) hw.classList.toggle('hidden', !s || s.phase === 'lobby' || s.phase === 'end');
    if (pw) pw.classList.toggle('hidden', !s || s.phase === 'lobby' || s.phase === 'end');
  }

  /* exposé pour les tests d'interface (anti-chevauchement, chronos) */
  global.__CREATOR_APP__ = App;

  /* ---------------- démarrage ---------------- */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
