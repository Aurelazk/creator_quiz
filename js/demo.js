/* =====================================================================
   js/demo.js — mode démo : simulateur de partie locale (aucun serveur)
   Fournit DemoNet, avec la même interface que Net (connect/send/handlers),
   pour montrer lobby, jeu, révélation, fin, classement sans serveur WebSocket.
   Charge à la demande (?demo=1). N'écrit rien en base, pas d'Upstash.
   ===================================================================== */
(function (global) {
  'use strict';

  const DEMO_PLAYERS = [
    { name: 'Awa', avatar: 'jacket|short|none|#0B35FE|#FF4E20|#00E472|#0C1A4B|#FF4E20' },
    { name: 'Kofi', avatar: 'hoodie|curly|glasses|#FF4E20|#00E472|#0B35FE|#111827|#F4F6FC' },
    { name: 'Fatou', avatar: 'dress|braids|headphones|#00E472|#FF7A00|#2E85FF|#3B4A6B|#F5C542' },
    { name: 'Yao', avatar: 'tee|bald|beanie|#2E85FF|#111827|#F4F6FC|#6B7280|#E84A8A' },
    { name: 'Sika', avatar: 'jacket|afro|backpack|#8B5CF6|#0B35FE|#FF4E20|#7A3E1D|#00E472' },
    { name: 'Esseh', avatar: 'hoodie|ponytail|none|#E84A8A|#F4F6FC|#0B35FE|#1F2937|#FF4E20' },
    { name: 'Tayo', avatar: 'dress|cap|none|#0B35FE|#FF4E20|#00E472|#111827|#111827' },
    { name: 'Nina', avatar: 'tee|short|glasses|#F5C542|#FF7A00|#2E85FF|#0C1A4B|#F4F6FC' },
  ];

  /* ---------- règles partagées (même logique que server/game.js) ---------- */
  const GAME_Q = 10;
  const DEFAULT_DURATION = 30;
  const SPEED_WINDOW = 10000;
  const SPEED_MAX = 0.25;

  function normalize(value) {
    return String(value == null ? '' : value)
      .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u2019\u2018']/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
  }

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

  function matches(guess, entry) {
    const g = normalize(guess);
    if (!g) return false;
    const candidates = [entry.text].concat(entry.aliases || []);
    for (const raw of candidates) {
      const c = normalize(raw);
      if (!c) continue;
      if (g === c) return true;
      const gs = g.replace(/s$/, ''), cs = c.replace(/s$/, '');
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
    }
    return false;
  }

  /* ---------- banque de questions démo (échantillon) ---------- */
  const DEMO_QUESTIONS = [
    { q: 'Quel langage est enseigné en premier à Epitech ?', answers: [{ text: 'C', pts: 55, aliases: ['c', 'langage c'] }, { text: 'Python', pts: 20, aliases: ['py'] }, { text: 'C++', pts: 12, aliases: ['cpp'] }, { text: 'Ocaml', pts: 8, aliases: ['caml'] }, { text: 'Shell', pts: 5, aliases: ['bash', 'zsh'] }] },
    { q: 'Où se situe le campus Epitech du Bénin ?', answers: [{ text: 'Cotonou', pts: 70, aliases: ['cotou', 'kotonou'] }, { text: 'Porto-Novo', pts: 15, aliases: ['porto novo'] }, { text: 'Parakou', pts: 8 }, { text: 'Abomey-Calavi', pts: 5, aliases: ['calavi'] }, { text: 'Ouidah', pts: 2 }] },
    { q: 'Quelle monnaie utilise-t-on au Bénin ?', answers: [{ text: 'Franc CFA', pts: 70, aliases: ['cfa', 'franc cfa', 'xof'] }, { text: 'Euro', pts: 12, aliases: ['eur'] }, { text: 'Naira', pts: 8, aliases: ['ngn'] }, { text: 'Dollar', pts: 6 }, { text: 'Cedi', pts: 4 }] },
    { q: 'Quel réseau social utilises-tu le plus ?', answers: [{ text: 'Instagram', pts: 35, aliases: ['insta', 'ig'] }, { text: 'TikTok', pts: 30, aliases: ['tt'] }, { text: 'WhatsApp', pts: 15, aliases: ['wa'] }, { text: 'Twitter/X', pts: 10, aliases: ['x', 'twitter'] }, { text: 'Facebook', pts: 6, aliases: ['fb'] }] },
    { q: 'Quelle est la spécialité culinaire béninoise la plus connue ?', answers: [{ text: 'Pâte d\'arachide', pts: 30, aliases: ['pate darachide', 'kpankou'] }, { text: 'Amiwo', pts: 25, aliases: ['ami wo'] }, { text: 'Yovo doko', pts: 20, aliases: ['beignet', 'doko'] }, { text: 'Aloko', pts: 15, aliases: ['plantain'] }, { text: 'Akassa', pts: 10 }] },
    { q: 'Quelle boisson bois-tu pour réviser tard le soir ?', answers: [{ text: 'Café', pts: 40, aliases: ['cafe', 'expresso'] }, { text: 'Thé', pts: 20, aliases: ['the', 'infusion'] }, { text: 'Eau', pts: 15 }, { text: 'Boisson énergisante', pts: 12, aliases: ['red bull', 'energisant'] }, { text: 'Jus', pts: 8 }] },
    { q: 'Combien d\'années dure le cursus Epitech ?', answers: [{ text: '5', pts: 60, aliases: ['cinq', '5 ans'] }, { text: '3', pts: 20, aliases: ['trois', '3 ans'] }, { text: '4', pts: 10 }, { text: '6', pts: 4 }, { text: '2', pts: 3 }] },
    { q: 'Quel éditeur de code utilises-tu le plus ?', answers: [{ text: 'Visual Studio Code', pts: 45, aliases: ['vscode', 'vs code', 'code'] }, { text: 'IntelliJ', pts: 15, aliases: ['idea', 'intellij'] }, { text: 'Sublime Text', pts: 12 }, { text: 'Vim', pts: 10, aliases: ['vi', 'neovim'] }, { text: 'Notepad++', pts: 9 }] },
    { q: 'Quel est le plus grand marché en plein air du Bénin ?', answers: [{ text: 'Dantokpa', pts: 55, aliases: ['dan tokpa', 'marché dantokpa'] }, { text: 'Azêlèkè', pts: 15, aliases: ['azeleke'] }, { text: 'Misserete', pts: 12 }, { text: 'Ganhi', pts: 10 }, { text: 'Azerekete', pts: 8 }] },
    { q: 'Quel artisanat béninois est le plus connu ?', answers: [{ text: 'Pagne', pts: 35, aliases: ['tissu', 'wax'] }, { text: 'Boubou', pts: 25 }, { text: 'Kaba', pts: 15, aliases: ['femme'] }, { text: 'Sculpture', pts: 15 }, { text: 'Bijoux', pts: 10 }] },
  ];

  /* ---------- état de la salle démo ---------- */
  const DemoState = {
    phase: 'lobby',           // lobby | buzz | play | steal | reveal | end
    code: 'DEMO1',
    round: 1, total: GAME_Q,
    multiplier: 1,
    question: null,
    answers: [],
    revealed: [],             // indexes révélés
    strikes: 0,
    players: [],
    activePlayerId: null,     // qui joue actuellement
    stealerId: null,
    controllerId: null,       // qui a le droit de répondre
    phaseEnd: 0,
    scores: {},               // id -> pts
    spectatorGuesses: {},     // id -> { answerIndex: pts } bonus spectateur
  };

  let demoTimer = null;
  let demoSpeed = 1;
  let demoSeed = 42;
  let demoRng = () => Math.random();

  function seedRandom(s) {
    let x = s >>> 0;
    demoRng = () => {
      x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
      return (x >>> 0) / 0xffffffff;
    };
  }

  function pick(n, count) {
    const all = n.slice();
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(demoRng() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all.slice(0, count);
  }

  /* ---------- DemoNet : même interface que Net ---------- */
  const DemoNet = {
    connected: false,
    connecting: false,
    active: false,
    retry: 0,
    retryTimer: null,
    handlers: {},
    onOpen: null,
    onStatus: null,
    wsBase: null,
    publicUrl: null,

    connect() {
      if (DemoNet.ws && DemoNet.ws.readyState === 1) return;
      DemoNet.active = true;
      DemoNet.connecting = true;
      clearTimeout(DemoNet.retryTimer);
      DemoNet.ws = { readyState: 1, send: () => {}, close: () => {} };
      setTimeout(() => {
        DemoNet.connected = true;
        DemoNet.connecting = false;
        DemoNet.retry = 0;
        if (DemoNet.onStatus) DemoNet.onStatus('connected');
        if (DemoNet.onOpen) DemoNet.onOpen();
        // démarrer la partie démo automatiquement si un hôte est présent
        if (global.App && global.App.role === 'host') {
          DemoSim.startDemo();
        }
      }, 600);
    },

    send(msg) {
      if (!DemoNet.active) return;
      DemoSim.onHostMessage(msg);
    },

    close() {
      DemoNet.active = false;
      DemoNet.connected = false;
      clearTimeout(DemoNet.retryTimer);
      if (demoTimer) clearInterval(demoTimer);
    },

    on(event, fn) {
      DemoNet.handlers[event] = fn;
    },
  };

  /* ---------- simulateur de partie ---------- */
  const DemoSim = {
    started: false,
    auto: true,

    startDemo() {
      if (DemoSim.started) return;
      DemoSim.started = true;
      seedRandom(demoSeed);
      DemoState.code = 'DEMO1';
      DemoState.players = [];
      DemoState.scores = {};
      DemoState.spectatorGuesses = {};
      // ajouter le joueur humain (si connecté) + bots
      const me = global.App && global.App.playerSession ? global.App.playerSession : null;
      if (me) {
        DemoState.players.push({ id: me.id, name: me.name, avatar: me.avatar, score: 0, team: 'bleu', ready: true });
        DemoState.scores[me.id] = 0;
      }
      const nbBots = Math.min(DEMO_PLAYERS.length, 6);
      for (let i = 0; i < nbBots; i++) {
        const p = DEMO_PLAYERS[i];
        const id = 'bot-' + i;
        DemoState.players.push({ id, name: p.name, avatar: p.avatar, score: 0, team: i % 2 === 0 ? 'bleu' : 'orange', ready: true });
        DemoState.scores[id] = 0;
      }
      DemoState.controllerId = DemoState.players[0].id;
      DemoState.activePlayerId = DemoState.players[0].id;
      DemoSim.pushState();
      // lancer la partie après un court délai
      setTimeout(() => { DemoSim.nextQuestion(); }, 1500);
    },

    onHostMessage(msg) {
      if (!msg) return;
      switch (msg.type || msg.action || msg.kind) {
        case 'host:start':
        case 'start':
          DemoSim.nextQuestion();
          break;
        case 'player:answer':
          DemoSim.judgeAnswer(msg.playerId, msg.text);
          break;
        case 'player:buzz':
          DemoSim.onBuzz(msg.playerId);
          break;
        case 'host:reveal':
          DemoSim.revealNext();
          break;
        case 'host:next':
          DemoSim.nextQuestion();
          break;
        case 'host:pause':
          DemoState.paused = !DemoState.paused;
          DemoSim.pushState();
          break;
        default:
          break;
      }
    },

    onBuzz(playerId) {
      if (DemoState.phase !== 'buzz') return;
      if (DemoState.controllerId) return; // déjà un contrôleur
      DemoState.controllerId = playerId;
      DemoState.activePlayerId = playerId;
      DemoState.phaseEnd = Date.now() + 8000 * demoSpeed; // 8s pour répondre
      DemoSim.pushState();
    },

    judgeAnswer(playerId, text) {
      if (!DemoState.question) return;
      const q = DemoState.question;
      let foundIndex = -1;
      for (let i = 0; i < q.answers.length; i++) {
        if (matches(text, q.answers[i])) { foundIndex = i; break; }
      }
      if (foundIndex >= 0) {
        if (DemoState.revealed.includes(foundIndex)) {
          // déjà trouvé -> doublon
          DemoSim.notify(playerId, 'déjà trouvé', 'bad');
          return;
        }
        const entry = q.answers[foundIndex];
        const elapsed = Date.now() - (DemoState.phaseEnd - 8000 * demoSpeed);
        const pts = Math.max(1, Math.round(entry.pts * (1 + SPEED_MAX * Math.max(0, 1 - Math.max(0, elapsed) / SPEED_WINDOW)) * DemoState.multiplier));
        DemoState.scores[playerId] = (DemoState.scores[playerId] || 0) + pts;
        DemoState.revealed.push(foundIndex);
        DemoSim.notify(playerId, 'TROUVÉ ! +' + pts, 'good');
        // si c'est le joueur actif qui a trouvé, il continue
        if (playerId === DemoState.activePlayerId) {
          DemoSim.checkRoundEnd();
        } else {
          // spectateur bonus
          DemoState.spectatorGuesses[playerId] = DemoState.spectatorGuesses[playerId] || {};
          DemoState.spectatorGuesses[playerId][foundIndex] = pts;
          DemoSim.notify(playerId, '+'+pts+' pts (bonus)', 'good');
        }
      } else {
        // erreur
        DemoState.strikes++;
        DemoSim.notify(playerId, 'PAS DANS LA LISTE', 'bad');
        if (DemoState.strikes >= 3) {
          DemoState.phase = 'steal';
          DemoState.phaseEnd = Date.now() + 8000 * demoSpeed;
          DemoSim.pushState();
        } else {
          DemoSim.pushState();
        }
      }
    },

    checkRoundEnd() {
      if (DemoState.revealed.length >= DemoState.question.answers.length || DemoState.strikes >= 3) {
        DemoState.phase = 'reveal';
        DemoState.phaseEnd = Date.now() + 2500 * demoSpeed;
        DemoSim.pushState();
        setTimeout(() => { DemoSim.nextQuestion(); }, 2500 * demoSpeed);
      }
    },

    revealNext() {
      if (DemoState.phase !== 'reveal') return;
      // révéler une case non trouvée
      const hidden = DemoState.question.answers.map((_, i) => i).filter(i => !DemoState.revealed.includes(i));
      if (hidden.length > 0) {
        DemoState.revealed.push(hidden[0]);
        DemoSim.pushState();
        setTimeout(() => { DemoSim.revealNext(); }, 400 * demoSpeed);
      } else {
        setTimeout(() => { DemoSim.nextQuestion(); }, 800 * demoSpeed);
      }
    },

    nextQuestion() {
      DemoState.strikes = 0;
      DemoState.revealed = [];
      DemoState.controllerId = null;
      DemoState.activePlayerId = null;
      DemoState.spectatorGuesses = {};
      DemoState.round++;
      if (DemoState.round > DemoState.total) {
        DemoState.phase = 'end';
        DemoState.phaseEnd = 0;
        DemoSim.pushState();
        return;
      }
      DemoState.question = pick(DEMO_QUESTIONS, 1)[0];
      DemoState.phase = 'buzz';
      DemoState.phaseEnd = Date.now() + DEFAULT_DURATION * 1000 * demoSpeed;
      DemoSim.pushState();
    },

    pushState() {
      if (DemoNet.handlers.state) {
        DemoNet.handlers.state({ type: 'state', ...DemoState });
      }
    },

    notify(playerId, text, kind) {
      if (DemoNet.handlers.event) {
        DemoNet.handlers.event({ type: 'toast', playerId, text, kind });
      }
    },
  };

  /* ---------- exposition ---------- */
  global.DemoNet = DemoNet;
  global.DemoState = DemoState;
  global.DemoSim = DemoSim;
  global.DemoQuestions = DEMO_QUESTIONS;
})(window);
