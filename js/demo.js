/* =====================================================================
   js/demo.js — mode démo : simulateur de partie locale (aucun serveur)
   Fournit DemoNet, avec la même interface que Net (connect/send/handlers),
   pour montrer lobby, jeu, révélation, fin, classement sans serveur WebSocket.
   Charge à la demande (?demo=1). N'écrit rien en base, pas d'Upstash.
   Les règles (normalize/levenshtein/matches/judge/…) sont partagées via
   shared/rules.js (chargé par <script> dans index.html).
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

  /* ---------- règles partagées (délégue à shared/rules.js) ---------- */
  const GAME_Q = 5;               /* démo : 5 questions */
  const DEFAULT_DURATION = 30;
  const SPEED_WINDOW = 10000;
  const SPEED_MAX = 0.25;

  /* ---------- scénario de la démo (5 questions, actions chronométrées) ---------- */
  const DEMO_SCRIPT = [
    {
      q: 'Quel langage est enseigne en premier a Epitech ?',
      answers: [
        { text: 'C', pts: 55, aliases: ['c', 'langage c'] },
        { text: 'Python', pts: 20, aliases: ['py'] },
        { text: 'C++', pts: 12, aliases: ['cpp'] },
        { text: 'Ocaml', pts: 8, aliases: ['caml'] },
        { text: 'Shell', pts: 5, aliases: ['bash', 'zsh'] },
      ],
      actions: [
        { delay: 600,  actor: 'bot-0', type: 'buzz' },
        { delay: 1400, actor: 'bot-0', type: 'guess', text: 'C' },
        { delay: 2200, actor: 'bot-1', type: 'guess', text: 'Python' },
        { delay: 3000, actor: 'bot-2', type: 'guess', text: 'Java' },
        { delay: 3800, actor: 'bot-3', type: 'guess', text: 'Ruby' },
        { delay: 4600, actor: 'host',  type: 'reveal' },
        { delay: 5400, actor: 'host',  type: 'next' },
      ],
    },
    {
      q: 'Ou se situe le campus Epitech du Benin ?',
      answers: [
        { text: 'Cotonou', pts: 70, aliases: ['cotou', 'kotonou'] },
        { text: 'Porto-Novo', pts: 15, aliases: ['porto novo'] },
        { text: 'Parakou', pts: 8 },
        { text: 'Abomey-Calavi', pts: 5, aliases: ['calavi'] },
        { text: 'Ouidah', pts: 2 },
      ],
      actions: [
        { delay: 500,  actor: 'bot-4', type: 'buzz' },
        { delay: 1300, actor: 'bot-4', type: 'guess', text: 'Porto-Novo' },
        { delay: 2100, actor: 'bot-5', type: 'guess', text: 'Paris' },
        { delay: 2900, actor: 'bot-0', type: 'guess', text: 'Londres' },
        { delay: 3700, actor: 'bot-1', type: 'guess', text: 'Berlin' },
        { delay: 4500, actor: 'bot-2', type: 'buzz' },      /* vol */
        { delay: 5300, actor: 'bot-2', type: 'guess', text: 'Cotonou' }, /* vol reussi */
        { delay: 6100, actor: 'host',  type: 'next' },
      ],
    },
    {
      q: 'Quelle monnaie utilise-t-on au Benin ?',
      answers: [
        { text: 'Franc CFA', pts: 70, aliases: ['cfa', 'franc cfa', 'xof'] },
        { text: 'Euro', pts: 12, aliases: ['eur'] },
        { text: 'Naira', pts: 8, aliases: ['ngn'] },
        { text: 'Dollar', pts: 6 },
        { text: 'Cedi', pts: 4 },
      ],
      actions: [
        { delay: 400,  actor: 'bot-3', type: 'buzz' },
        { delay: 1200, actor: 'bot-3', type: 'guess', text: 'Franc CFA' },
        { delay: 2000, actor: 'bot-4', type: 'guess', text: 'Euro' },
        { delay: 2800, actor: 'bot-5', type: 'guess', text: 'Naira' },
        { delay: 3600, actor: 'host',  type: 'reveal' },
        { delay: 4400, actor: 'host',  type: 'reveal' },
        { delay: 5200, actor: 'host',  type: 'next' },
      ],
    },
    {
      q: 'Quel reseau social utilises-tu le plus ?',
      answers: [
        { text: 'Instagram', pts: 35, aliases: ['insta', 'ig'] },
        { text: 'TikTok', pts: 30, aliases: ['tt'] },
        { text: 'WhatsApp', pts: 15, aliases: ['wa'] },
        { text: 'Twitter', pts: 12, aliases: ['x', 'twitter'] },
        { text: 'Facebook', pts: 8, aliases: ['fb'] },
      ],
      actions: [
        { delay: 700,  actor: 'bot-1', type: 'buzz' },
        { delay: 1500, actor: 'bot-1', type: 'guess', text: 'Instagram' },
        { delay: 2300, actor: 'bot-2', type: 'guess', text: 'LinkedIn' },
        { delay: 3100, actor: 'bot-3', type: 'guess', text: 'BeReal' },
        { delay: 3900, actor: 'bot-4', type: 'guess', text: 'Mastodon' },
        { delay: 4700, actor: 'bot-5', type: 'buzz' },      /* vol */
        { delay: 5500, actor: 'bot-5', type: 'guess', text: 'TikTok' }, /* vol reussi */
        { delay: 6300, actor: 'host',  type: 'next' },
      ],
    },
    {
      q: 'Quelle boisson bois-tu pour reviser tard le soir ?',
      answers: [
        { text: 'Cafe', pts: 40, aliases: ['cafe', 'expresso'] },
        { text: 'The', pts: 20, aliases: ['the', 'infusion'] },
        { text: 'Eau', pts: 15 },
        { text: 'Boisson energisante', pts: 15, aliases: ['red bull', 'energisant'] },
        { text: 'Jus', pts: 10 },
      ],
      actions: [
        { delay: 500,  actor: 'bot-0', type: 'buzz' },
        { delay: 1300, actor: 'bot-0', type: 'guess', text: 'Cafe' },
        { delay: 2100, actor: 'bot-1', type: 'guess', text: 'The' },
        { delay: 2900, actor: 'bot-2', type: 'guess', text: 'Eau' },
        { delay: 3700, actor: 'host',  type: 'reveal' },
        { delay: 4500, actor: 'host',  type: 'reveal' },
        { delay: 5300, actor: 'host',  type: 'next' },
      ],
    },
  ];

  /* ---------- état de la salle démo ---------- */
  const DemoState = {
    phase: 'lobby',           // lobby | countdown | buzz | play | steal | reveal | end
    code: 'DEMO1',
    round: 1, total: DEMO_SCRIPT.length,
    multiplier: 1,
    qi: 0,
    question: null,
    board: [],
    revealed: [],             // indexes révélés
    strikes: 0,
    players: [],
    activePlayerId: null,     // qui joue actuellement
    stealerId: null,
    controllerId: null,       // qui a le droit de répondre
    phaseEnd: 0,
    scores: {},               // id -> pts
    spectatorGuesses: {},     // id -> { answerIndex: pts } bonus spectateur
    crowdCheer: 0,
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
    qi: 0,

    /* --- Acte 1 : tour de lobby, arrivée successive des bots --- */
    startDemo() {
      if (DemoSim.started) return;
      DemoSim.started = true;
      seedRandom(demoSeed);
      DemoState.code = 'DEMO1';
      DemoState.players = [];
      DemoState.scores = {};
      DemoState.spectatorGuesses = {};
      DemoState.phase = 'lobby';
      DemoState.round = 1;
      DemoState.total = DEMO_SCRIPT.length;
      DemoState.qi = 0;
      DemoState.crowdCheer = 0;
      // joueur humain (si connecte)
      const me = global.App && global.App.playerSession ? global.App.playerSession : null;
      if (me) {
        DemoState.players.push({ id: me.id, name: me.name, avatar: me.avatar, score: 0, team: 'bleu', ready: true });
        DemoState.scores[me.id] = 0;
      }
      DemoSim.pushState();
      // arrivée successive des bots (tous les ~900 ms)
      const bots = DEMO_PLAYERS.slice(0, 6);
      let i = 0;
      const addBot = () => {
        if (i >= bots.length) {
          setTimeout(() => { DemoSim.startAct2(); }, 1200);
          return;
        }
        const p = bots[i];
        const id = 'bot-' + i;
        DemoState.players.push({ id, name: p.name, avatar: p.avatar, score: 0, team: i % 2 === 0 ? 'bleu' : 'orange', ready: true });
        DemoState.scores[id] = 0;
        DemoSim.notify(null, p.name + ' a rejoint la salle.', 'good');
        DemoSim.crowdReact('found');
        DemoSim.pushState();
        i++;
        setTimeout(addBot, 900);
      };
      addBot();
    },

    /* --- Acte 2 : compte a rebours puis questions --- */
    startAct2() {
      DemoState.phase = 'countdown';
      DemoState.phaseEnd = Date.now() + 3000;
      DemoSim.notify(null, 'La partie commence dans 3…', 'info');
      DemoSim.pushState();
      setTimeout(() => { DemoSim.runQuestion(0); }, 3000);
    },

    runQuestion(idx) {
      if (idx >= DEMO_SCRIPT.length) {
        DemoSim.endDemo();
        return;
      }
      const s = DEMO_SCRIPT[idx];
      DemoState.question = { q: s.q, answers: s.answers };
      DemoState.board = [];
      DemoState.revealed = [];
      DemoState.strikes = 0;
      DemoState.controllerId = null;
      DemoState.stealerId = null;
      DemoState.phase = 'buzz';
      DemoState.phaseEnd = Date.now() + 15000;
      DemoSim.notify(null, 'MANCHE ' + (idx + 1) + ' : ' + s.q, 'info');
      DemoSim.pushState();
      DemoSim.runScenario(s.actions);
    },

    runScenario(actions) {
      let offset = 0;
      for (const action of actions) {
        offset += action.delay;
        setTimeout(() => { DemoSim.doAction(action); }, offset);
      }
    },

    doAction(action) {
      switch (action.type) {
        case 'buzz': DemoNet.send({ type: 'player:buzz', playerId: action.actor }); break;
        case 'guess': DemoNet.send({ type: 'player:answer', playerId: action.actor, text: action.text }); break;
        case 'reveal': DemoNet.send({ type: 'host:reveal' }); break;
        case 'next': DemoSim.nextQuestion(); break;
        default: break;
      }
    },

    onHostMessage(msg) {
      if (!msg) return;
      switch (msg.type || msg.action || msg.kind) {
        case 'host:start': case 'start': DemoSim.nextQuestion(); break;
        case 'player:answer': DemoSim.judgeAnswer(msg.playerId, msg.text); break;
        case 'player:buzz': DemoSim.onBuzz(msg.playerId); break;
        case 'host:reveal': DemoSim.revealNext(); break;
        case 'host:next': DemoSim.nextQuestion(); break;
        case 'host:pause': DemoState.paused = !DemoState.paused; DemoSim.pushState(); break;
        default: break;
      }
    },

    onBuzz(playerId) {
      if (DemoState.phase !== 'buzz' && DemoState.phase !== 'steal') return;
      if (DemoState.phase === 'buzz') {
        if (DemoState.controllerId) return;
        DemoState.controllerId = playerId;
        DemoState.activePlayerId = playerId;
        DemoState.phase = 'play';
        DemoState.phaseEnd = Date.now() + 12000 * demoSpeed;
      } else {
        /* steal : premier qui buzz devient stealer */
        if (DemoState.stealerId || playerId === DemoState.controllerId) return;
        DemoState.stealerId = playerId;
        DemoState.activePlayerId = playerId;
        DemoState.phaseEnd = Date.now() + 8000 * demoSpeed;
      }
      DemoSim.pushState();
    },

    judgeAnswer(playerId, text) {
      if (!DemoState.question) return;
      const q = DemoState.question;
      let foundIndex = -1;
      for (let i = 0; i < q.answers.length; i++) {
        if (Rules.matches(text, q.answers[i])) { foundIndex = i; break; }
      }
      if (foundIndex >= 0) {
        if (DemoState.revealed.includes(foundIndex) || DemoState.board.some((r) => r.i === foundIndex)) {
          DemoSim.notify(playerId, 'deja trouve', 'bad');
          return;
        }
        const entry = q.answers[foundIndex];
        const pts = Rules.pointsFor(entry, DemoState.multiplier);
        DemoState.scores[playerId] = (DemoState.scores[playerId] || 0) + pts;
        if (DemoState.mode === 'teams') {
          const p = DemoState.players.find((x) => x.id === playerId);
          if (p && p.team) DemoState.teamScores = DemoState.teamScores || {};
          DemoState.teamScores[p.team] = (DemoState.teamScores[p.team] || 0) + pts;
        }
        DemoState.revealed.push(foundIndex);
        DemoState.board.push({ i: foundIndex, text: entry.text, pts, by: playerId });
        DemoSim.notify(playerId, 'TROUVE ! ' + entry.text + ' (+' + pts + ')', 'good');
        DemoSim.crowdReact('found');
        if (DemoState.board.length >= q.answers.length) {
          DemoSim.finishRound('complete');
        } else {
          DemoSim.pushState();
        }
      } else {
        DemoState.strikes++;
        DemoSim.notify(playerId, 'PAS DANS LA LISTE', 'bad');
        DemoSim.crowdReact('error');
        if (DemoState.strikes >= 3) {
          DemoState.phase = 'steal';
          DemoState.phaseEnd = Date.now() + 10000 * demoSpeed;
          DemoSim.pushState();
        } else {
          DemoSim.pushState();
        }
      }
    },

    checkRoundEnd() {
      if (DemoState.board.length >= DemoState.question.answers.length || DemoState.strikes >= 3) {
        DemoSim.finishRound(DemoState.strikes >= 3 ? 'stolen-failed' : 'complete');
      }
    },

    revealNext() {
      if (DemoState.phase !== 'reveal') return;
      const hidden = DemoState.question.answers.map((_, i) => i).filter(i => !DemoState.revealed.includes(i) && !DemoState.board.some((r) => r.i === i));
      if (hidden.length > 0) {
        DemoState.revealed.push(hidden[0]);
        DemoSim.pushState();
        setTimeout(() => { DemoSim.revealNext(); }, 400 * demoSpeed);
      } else {
        DemoSim.finishRound('complete');
      }
    },

    nextQuestion() {
      DemoState.strikes = 0;
      DemoState.revealed = [];
      DemoState.controllerId = null;
      DemoState.stealerId = null;
      DemoState.spectatorGuesses = {};
      DemoState.round++;
      if (DemoState.round > DemoState.total) {
        DemoSim.endDemo();
        return;
      }
      DemoSim.runQuestion(DemoState.round - 1);
    },

    finishRound(reason) {
      DemoState.phase = 'reveal';
      DemoState.phaseEnd = Date.now() + 2500 * demoSpeed;
      // attribuer la cagnotte au controleur si vol reussi, sinon deja attribue au trouve
      const awards = { reason };
      if (DemoState.controllerId) {
        const p = DemoState.players.find((x) => x.id === DemoState.controllerId);
        if (p) {
          awards.winnerId = p.id;
          awards.winnerName = p.name;
          awards.amount = 0; // les points sont déjà distribués au fil de l'eau
        }
      }
      DemoSim.notify(null, reason === 'complete' ? 'Manche terminee.' : 'Manche terminee (vol).', 'good');
      DemoSim.crowdReact(reason === 'complete' ? 'celebrate' : 'error');
      DemoSim.pushState();
      setTimeout(() => { DemoSim.nextQuestion(); }, 2500 * demoSpeed);
    },

    endDemo() {
      DemoState.phase = 'end';
      DemoState.phaseEnd = 0;
      DemoSim.crowdReact('celebrate');
      DemoSim.notify(null, 'Partie terminee ! Bravo a tous.', 'good');
      // classement final
      const sorted = DemoState.players.slice().sort((a, b) => (DemoState.scores[b.id] || 0) - (DemoState.scores[a.id] || 0) || a.name.localeCompare(b.name));
      DemoSim.notify(null, 'Gagnant : ' + sorted[0].name, 'good');
      if (DemoNet.handlers.event) {
        DemoNet.handlers.event({ type: 'game-over', ranking: sorted.map((p, i) => ({ rank: i + 1, id: p.id, name: p.name, score: DemoState.scores[p.id] || 0, avatar: p.avatar })) });
      }
      DemoSim.pushState();
    },

    crowdReact(kind) {
      const now = Date.now();
      if (kind === 'found') { DemoState.crowdCheer = Math.max(DemoState.crowdCheer, 1.2); }
      else if (kind === 'error') { DemoState.crowdCheer = Math.max(DemoState.crowdCheer, 0.6); }
      else if (kind === 'celebrate') { DemoState.crowdCheer = 2.4; }
      setTimeout(() => { DemoState.crowdCheer = 0; DemoSim.pushState(); }, 1200);
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
  global.DemoQuestions = DEMO_SCRIPT;
})(window);
