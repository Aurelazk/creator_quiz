/* =====================================================================
   js/ui.js — Logique UI complète (réécriture intégrale)
   Gère tous les écrans : host, phone, loader, lobby, game, end, leaderboard
   ===================================================================== */

const UI = (() => {
  // ── Références DOM ──
  const $ = (id) => document.getElementById(id);
  const screens = {
    pHome: $('pHome'),
    pAvatar: $('pAvatar'),
    pLobby: $('pLobby'),
    pGame: $('pGame'),
    pEnd: $('pEnd'),
    pLeaderboard: $('pLeaderboard'),
    pPause: $('pPause'),
    hostLobby: $('hostLobby'),
    hostEnd: $('hostEnd'),
  };

  // État exposé (getters pour refléter les valeurs actuelles)
  const state = { char: 'Char_1', sweat: 'bleu', onSubmit: null };

  // ── Initialisation ──
  function init() {
    // Masquer tous les écrans au démarrage
    Object.values(screens).forEach((s) => s.classList.add('hidden'));
    $('loader').classList.remove('hidden');
    phoneVisible = false;
    hostVisible = false;
  }

  function pickChar(c) { state.char = c; }
  function pickSweat(s) { state.sweat = s; }

  // ── Loader ──
  function loaderTxt(text) {
    const t = $('loaderTxt');
    if (t) t.textContent = text;
  }
  function loader(pct) {
    const bar = $('loaderBar');
    if (bar) bar.style.width = `${Math.round(pct * 100)}%`;
  }
  function hideLoader() {
    const loader = $('loader');
    if (loader) loader.classList.add('hidden');
  }

  // ── Code salle / URL ──
  function code(c) {
    const el = $('roomCode') || $('lobbyCode') || $('pLobbyCode');
    if (el) el.textContent = c;
  }
  function joinUrl(url) {
    const el = $('joinUrl');
    if (el) el.textContent = url;
  }

  // ── Gestion des écrans ──
  function screen(id) {
    Object.values(screens).forEach((s) => s.classList.add('hidden'));
    const el = screens[id];
    if (el) el.classList.remove('hidden');
  }

  function phoneVisible(v) {
    phoneVisible = !!v;
    const phone = $('phone');
    const host = $('hostHud');
    if (phone) phone.classList.toggle('hidden', !v);
    if (host) host.classList.toggle('hidden', v);
    document.body.classList.toggle('phone-mode', v);
  }

  function hostVisible(v) {
    hostVisible = !!v;
    const phone = $('phone');
    const host = $('hostHud');
    if (phone) phone.classList.toggle('hidden', v);
    if (host) host.classList.toggle('hidden', !v);
    document.body.classList.toggle('phone-mode', !v);
  }

  // ── Loader ──
  function loaderProgress(pct, text) {
    const bar = $('#loaderBar');
    const txt = $('#loaderTxt');
    if (bar) bar.style.width = `${pct}%`;
    if (txt && text) txt.textContent = text;
  }

  function loaderDone() {
    const loader = $('loader');
    if (loader) loader.classList.add('hidden');
  }

  // ── Board (host) ──
  function board(slots, revealed, activeIdx) {
    const b = $('board');
    if (!b) return;
    b.innerHTML = '';
    for (let i = 0; i < slots; i++) {
      const d = document.createElement('div');
      d.className = 'board-case';
      d.dataset.i = i;

      const found = (revealed || []).find((r) => r && r.i === i && !r.missed);
      const missed = (revealed || []).find((r) => r && r.i === i && r.missed);

      d.innerHTML = `
        <span class="board-case__idx">${i + 1}</span>
        <span class="board-case__txt">${found ? esc(found.text) : '?????'}</span>
        <span class="board-case__pts">${found ? '+' + found.pts : ''}</span>
      `;

      if (found) d.classList.add('board-case--done');
      if (missed) d.classList.add('board-case--miss');
      if (activeIdx === i) d.classList.add('board-case--active');

      b.appendChild(d);
    }
  }

  function markMiss(slots, revealed) {
    const b = $('board');
    if (!b) return;
    for (let i = 0; i < slots; i++) {
      const el = b.querySelector(`[data-i="${i}"]`);
      if (!el) continue;
      const found = (revealed || []).find((r) => r && r.i === i && !r.missed);
      const missed = (revealed || []).find((r) => r && r.i === i && r.missed);
      if (found) continue;
      el.classList.add('board-case--miss');
      const txt = el.querySelector('.board-case__txt');
      if (txt) txt.textContent = '—';
      const pts = el.querySelector('.board-case__pts');
      if (pts) pts.textContent = '';
    }
  }

  function revealCase(idx, text, pts) {
    const b = $('board');
    if (!b) return;
    const el = b.querySelector(`[data-i="${idx}"]`);
    if (!el) return;
    el.classList.add('board-case--done');
    const t = el.querySelector('.board-case__txt');
    if (t) t.textContent = esc(text);
    const p = el.querySelector('.board-case__pts');
    if (p) p.textContent = '+' + pts;
  }

  // ── Bandeau fausses propositions ──
  function wrongBanner(list) {
    const el = $('hostWrong');
    const marquee = document.querySelector('.wrong-marquee');
    if (!el || !marquee) return;
    if ((list || []).length === 0) {
      el.classList.add('hidden');
      marquee.innerHTML = '';
      return;
    }
    el.classList.remove('hidden');
    marquee.innerHTML = (list || [])
      .map((w) => `<span class="wrong-item">${esc(w.by || '?')} : "${esc(w.text || '')}" ✗</span>`)
      .join('');
  }

  // ── Liste des trouvailles côté joueur ──
  function foundList(revealed) {
    const f = $('pFound');
    if (!f) return;
    f.innerHTML = (revealed || [])
      .filter((r) => r && r.text)
      .map((r) => `<span class="p-found__item">${esc(r.text)} · ${r.pts}</span>`)
      .join('');
  }

// ── Clavier AZERTY ──
function buildKeyboard(onKey) {
  const kb = $('pKeyboard');
  if (!kb) return;
  kb.innerHTML = '';

  const rows = [
    ['a','z','e','r','t','y','u','i','o','p'],
    ['q','s','d','f','g','h','j','k','l','m'],
    ['w','x','c','v','b','n',',',';',':','!'],
    ['⇧','⌫','123','espace','GO'],
  ];

  rows.forEach((row) => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'kb-row';
    row.forEach((key) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'key';
      if (key === 'espace') {
        btn.className = 'key key--wide';
        btn.textContent = 'espace';
      } else if (key === '⌫') {
        btn.textContent = '⌫';
      } else if (key === '⇧') {
        btn.textContent = '⇧';
      } else if (key === '123') {
        btn.className = 'key key--med';
        btn.textContent = '123';
      } else if (key === 'GO') {
        btn.className = 'key key--go';
        btn.textContent = 'GO';
      } else {
        btn.textContent = key;
      }
      btn.addEventListener('click', () => onKey(key));
      rowDiv.appendChild(btn);
    });
    kb.appendChild(rowDiv);
  });
}

function bindKeyboard(onKey) {
  buildKeyboard(onKey);
}

// ── Host buttons state ──
function hostButtons(mode) {
  const main = $('btnHostMain');
  const skip = $('btnHostSkip');
  const reveal = $('btnHostReveal');
  if (!main || !skip || !reveal) return;

  main.classList.add('hidden');
  skip.classList.add('hidden');
  reveal.classList.add('hidden');

  if (mode === 'question') {
    main.classList.remove('hidden');
    main.textContent = 'Vérifier';
    skip.classList.remove('hidden');
  } else if (mode === 'reveal') {
    reveal.classList.remove('hidden');
  } else if (mode === 'end') {
    main.classList.remove('hidden');
    main.textContent = 'Rejouer';
  }
}

// ── Host question ──
function hostQuestion(text, num, total) {
  const qn = $('hostQnum');
  const qt = $('hostQuestion');
  if (qn) qn.textContent = `Manche ${num} / ${total}`;
  if (qt) qt.textContent = text;
}

// ── Ranks ──
function ranks(ranked, isHost) {
  const el = $('hostRank') || $('pRank');
  if (!el) return;
  el.innerHTML = '';
  (ranked || []).forEach((s, i) => {
    const li = document.createElement('li');
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
    li.innerHTML = `
      <span class="lb-rank">${medal} #${i + 1}</span>
      <span class="text-gras">${esc(s.name || 'Joueur')}</span>
      <span class="text-bleu">${s.score || 0} pts</span>
    `;
    el.appendChild(li);
  });
}

// ── Avatar / couleur sweat ──
  function buildAvatarGrid(characters, onSelect) {
    const grid = $('charGrid');
    if (!grid) return;
    grid.innerHTML = '';
    (characters || []).forEach((char, idx) => {
      const div = document.createElement('div');
      div.className = 'char-option' + (idx === 0 ? ' char-option--selected' : '');
      div.title = char;
      div.addEventListener('click', () => {
        grid.querySelectorAll('.char-option').forEach((c) => c.classList.remove('char-option--selected'));
        div.classList.add('char-option--selected');
        onSelect(char, idx);
      });
      grid.appendChild(div);
    });
  }

  function buildSweatGrid(colors, onSelect) {
    const grid = $('sweatGrid');
    if (!grid) return;
    grid.innerHTML = '';
    colors.forEach((c) => {
      const div = document.createElement('div');
      div.className = `sweat-option sweat-${c}` + (c === 'bleu' ? ' sweat-option--selected' : '');
      div.addEventListener('click', () => {
        grid.querySelectorAll('.sweat-option').forEach((d) => d.classList.remove('sweat-option--selected'));
        div.classList.add('sweat-option--selected');
        onSelect(c);
      });
      grid.appendChild(div);
    });
  }

  // ── Lobby joueurs ──
  function lobbyPlayers(players, meId, onKick) {
    const list = $('lobbyPlayers') || $('pLobbyList');
    if (!list) return;
    list.innerHTML = '';
    (players || []).forEach((p) => {
      const div = document.createElement('div');
      div.className = 'lobby-player';
      div.innerHTML = `
        <div class="lobby-player__name">${esc(p.name || 'Joueur')}</div>
        <div class="badge badge--${p.team || 'bleu'}">${p.team || '?'}</div>
      `;
      if (onKick && p.id !== meId) {
        div.addEventListener('click', () => onKick(p.id));
      }
      list.appendChild(div);
    });
  }

  // ── Classement ──
  function leaderboard(scores, containerId) {
    const el = $(containerId);
    if (!el) return;
    el.innerHTML = '';
    (scores || []).forEach((s, i) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="lb-rank">#${i + 1}</span>
        <span class="text-gras">${esc(s.name)}</span>
        <span class="text-bleu">${s.score} pts</span>
      `;
      el.appendChild(li);
    });
  }

  // ── Toasts ──
  function toast(msg, type = 'info', ms = 3000) {
    const container = $('toastContainer');
    if (!container) return;
    const t = document.createElement('div');
    t.className = `toast toast--${type}`;
    t.textContent = msg;
    container.appendChild(t);
    requestAnimationFrame(() => t.classList.add('toast--show'));
    setTimeout(() => {
      t.classList.remove('toast--show');
      setTimeout(() => t.remove(), 300);
    }, ms);
  }

  // ── Score / balance ──
  function updateScore(blue, green) {
    const b = $('blueScore');
    const g = $('greenScore');
    if (b) b.textContent = blue;
    if (g) g.textContent = green;
  }

  function updateTimer(sec) {
    const t = $('hostTimer') || $('pTimer');
    if (t) t.textContent = sec;
  }

  function updateQuestion(num, total, text) {
    const qn = $('hostQnum') || $('pQnum');
    const qt = $('hostQuestion') || $('pQuestion');
    if (qn) qn.textContent = `Manche ${num} / ${total}`;
    if (qt) qt.textContent = text;
  }

  // ── Utilitaires ──
  function esc(s) {
    const div = document.createElement('div');
    div.textContent = s == null ? '' : String(s);
    return div.innerHTML;
  }

  // ── Timer ──
  function timer(sec, warning) {
    const t = $('hostTimer') || $('pTimer');
    if (t) {
      t.textContent = Math.max(0, sec);
      t.classList.toggle('text-orange', !!warning);
      t.classList.toggle('text-bleu', !warning);
    }
  }

  // ── Balance bar ──
  function balance(blue, green) {
    const b = $('blueScore');
    const g = $('greenScore');
    const mark = $('balanceMark');
    if (b) b.textContent = blue;
    if (g) g.textContent = green;
    if (mark && blue + green > 0) {
      const pct = (blue / (blue + green)) * 100;
      mark.style.left = `${pct}%`;
    }
  }

  // ── Attempts ──
  function attempts(state, mode) {
    const ab = $('attemptsBlue');
    const ag = $('attemptsGreen');
    if (!ab || !ag) return;
    const bluePlays = (state.players || []).filter((p) => p.team === 'bleu').length;
    const greenPlays = (state.players || []).filter((p) => p.team === 'vert').length;
    ab.textContent = bluePlays;
    ag.textContent = greenPlays;
  }

  // ── Final banner ──
  function finalBanner(s, mode, qi) {
    const el = $('finalBanner');
    if (!el) return;
    const total = (s.answers || []).length;
    const found = (s.revealed || []).filter((r) => r && !r.missed).length;
    el.innerHTML = `
      <div class="final-banner">
        <span class="final-text">Manche ${qi + 1} — ${found}/${total} trouvée(s)</span>
        <span class="final-mode">${mode === 'duel' ? 'Duel' : 'Solo'}</span>
      </div>
    `;
    el.classList.remove('hidden');
  }

  // ── Speed badge ──
  function speedBadge(s, Host) {
    const el = $('speedBadge');
    if (!el) return;
    const first = (s.revealed || []).sort((a, b) => (a.at || 0) - (b.at || 0))[0];
    if (first) {
      el.textContent = `⚡ ${esc(first.by || '?')} — ${Math.round((first.at || 0) / 1000)}s`;
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  }

  // ── Count ──
  function count(n) {
    const el = $('pCount');
    if (el) el.textContent = n;
  }

  // ── Current ──
  function current() {
    for (const [id, el] of Object.entries(screens)) {
      if (!el.classList.contains('hidden')) return id;
    }
    return null;
  }

  // ── Phone lobby ──
  function phoneLobby(players, meId, code) {
    const list = $('pLobbyList');
    const hint = $('pLobbyHint');
    const codeEl = $('pLobbyCode');
    if (codeEl) codeEl.textContent = code;
    if (list) {
      list.innerHTML = '';
      (players || []).forEach((p) => {
        const div = document.createElement('div');
        div.className = 'lobby-player';
        div.innerHTML = `
          <div class="lobby-player__name">${esc(p.name || 'Joueur')}</div>
          <div class="badge badge--${p.team || 'bleu'}">${p.team || '?'}</div>
        `;
        list.appendChild(div);
      });
    }
    if (hint) hint.textContent = players && players.length > 0 ? 'Joueurs connectés' : 'En attente de l\'hôte…';
  }

  // ── End title ──
  function endTitle(text) {
    const el = $('pEndTitle');
    if (el) el.textContent = text;
  }

  // ── Reaction ──
  function reaction(kind, title, subtitle) {
    const container = $('pReaction');
    if (!container) return;
    const big = container.querySelector('.rbig');
    const sub = container.querySelector('.rsub');
    if (big) big.textContent = title;
    if (sub) sub.textContent = subtitle;
    container.className = 'reaction show reaction-' + kind;
    setTimeout(() => {
      container.classList.remove('show');
    }, 2500);
  }

  // ── Emoji ──
  function emoji(emojiChar) {
    toast(emojiChar, 'info', 1500);
  }

  return {
    init,
    screen,
    phoneVisible,
    hostVisible,
    pickChar,
    pickSweat,
    get char() { return state.char; },
    get sweat() { return state.sweat; },
    get onSubmit() { return state.onSubmit; },
    set onSubmit(v) { state.onSubmit = v; },
    loaderProgress,
    loaderTxt,
    loader,
    hideLoader,
    code,
    joinUrl,
    board,
    markMiss,
    revealCase,
    wrongBanner,
    foundList,
    buildKeyboard,
    bindKeyboard,
    hostButtons,
    hostQuestion,
    buildAvatarGrid,
    buildSweatGrid,
    lobbyPlayers,
    leaderboard,
    ranks,
    timer,
    balance,
    attempts,
    finalBanner,
    speedBadge,
    count,
    current,
    phoneLobby,
    endTitle,
    reaction,
    emoji,
    toast,
    updateScore,
    updateTimer,
    updateQuestion,
    esc,
  };
})();

window.UI = UI;
