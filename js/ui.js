/* =====================================================================
   js/ui.js — DOM : écrans, tableau des réponses, clavier, classements
   ===================================================================== */
(function (global) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const PALETTE = global.PALETTE || ['#0B35FE', '#FF4E20', '#00E472', '#FF7A00', '#2E85FF', '#0C1A4B', '#F4F6FC'];

  const SCREENS = ['pHome', 'pAvatar', 'pLobby', 'pGame', 'pEnd', 'pLeaderboard', 'pPause'];
  let toastT = null;
  let currentScreen = 'pHome';

  const UI = {
    $, esc, PALETTE,

    init() {
      if (!$('toast')) {
        const t = document.createElement('div');
        t.id = 'toast';
        document.body.appendChild(t);
      }
      UI.buildKeyboard();
      UI.buildChars();
      UI.buildSweat();
      UI.hideLoader();
    },

    hideLoader() { const l = $('loader'); if (l) { l.classList.add('done'); setTimeout(() => l.remove(), 500); } },
    loader(pct) { const b = $('loaderBar'); if (b) b.style.width = Math.round(pct * 100) + '%'; },
    loaderTxt(t) { const e = $('loaderTxt'); if (e) e.textContent = t; },

    /* ---------------- écrans ---------------- */
    screen(name) {
      currentScreen = name;
      SCREENS.forEach((id) => { const e = $(id); if (e) e.classList.toggle('hidden', id !== name); });
      $('pTop').classList.toggle('hidden', name === 'pHome' || name === 'pAvatar');
      const phone = $('phone');
      phone.classList.toggle('inGame', name === 'pGame');
      phone.classList.toggle('inMenu', name === 'pHome' || name === 'pAvatar');
    },
    phoneVisible(on) { $('phone').classList.toggle('hidden', !on); },
    hostVisible(on) { $('hostHud').classList.toggle('hidden', !on); },
    current() { return currentScreen; },

    /* ---------------- divers ---------------- */
    toast(msg, ms) {
      const t = $('toast');
      if (!t) return;
      t.textContent = msg;
      t.classList.add('show');
      clearTimeout(toastT);
      toastT = setTimeout(() => t.classList.remove('show'), ms || 2600);
    },

    code(code) {
      ['roomCode', 'lobbyCode', 'pRoom', 'pLobbyCode'].forEach((id) => { const e = $(id); if (e) e.textContent = code || '-----'; });
    },

    joinUrl(url) {
      const e = $('joinUrl'); if (e) e.textContent = url.replace(/^https?:\/\//, '');
      const qr = $('qrImg');
      if (qr) qr.src = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(url);
    },

    count(n) { const e = $('pCount'); if (e) e.textContent = n; },

    /* ---------------- question + tableau (hôte) ---------------- */
    hostQuestion(text, num, total) {
      $('hostQnum').textContent = 'Manche ' + num + ' / ' + total;
      $('hostQuestion').textContent = text;
      $('pQnum').textContent = 'Manche ' + num + ' / ' + total;
      $('pQuestion').textContent = text;
    },

    board(slots, revealed, lastFoundIndex) {
      const b = $('board');
      if (!b) return;
      b.innerHTML = '';
      const rows = slots <= 4 ? 1 : 2;
      b.style.gridTemplateColumns = 'repeat(' + Math.ceil(slots / rows) + ',minmax(0,1fr))';
      for (let i = 0; i < slots; i++) {
        const found = (revealed || []).find((r) => r.i === i && !r.missed);
        const d = document.createElement('div');
        d.className = 'case' + (found ? ' done' : '');
        d.dataset.i = i;
        d.innerHTML = '<span class="idx">' + (i + 1) + '</span>' +
          '<span class="txt">' + (found ? esc(found.text) : '?????') + '</span>' +
          '<span class="pts">' + (found ? '+' + found.pts : '') + '</span>';
        if (found && lastFoundIndex === i) d.classList.add('flip');
        b.appendChild(d);
      }
    },

    markMiss(slots, revealed) {
      const b = $('board');
      if (!b) return;
      for (let i = 0; i < slots; i++) {
        const found = (revealed || []).find((r) => r.i === i && !r.missed);
        if (found) continue;
        const el = b.querySelector('[data-i="' + i + '"]');
        if (!el) continue;
        el.classList.add('miss');
        el.querySelector('.txt').textContent = '—';
        const pts = el.querySelector('.pts');
        if (pts) pts.textContent = '';
      }
    },

    foundList(revealed) {
      const f = $('pFound');
      if (!f) return;
      f.innerHTML = (revealed || [])
        .filter((r) => r && r.text)
        .map((r) => '<span>' + esc(r.text) + ' · ' + r.pts + '</span>').join('');
    },

    /* ---------------- timer ---------------- */
    timer(sec, low) {
      const a = $('timer'), b = $('pTimer');
      const v = Math.max(0, Math.ceil(sec));
      if (a) { a.textContent = v; a.classList.toggle('low', !!low); }
      if (b) { b.textContent = v; b.classList.toggle('low', !!low); }
    },

    /* ---------------- lobbies ---------------- */
    hostLobby(players, canStart) {
      const box = $('lobbyPlayers');
      if (box) {
        box.innerHTML = (players || []).map((p) =>
          '<span class="pl" data-id="' + esc(p.id) + '" title="Exclure"><i style="background:' + esc(p.sweat || '#2E85FF') + '"></i><b>' + esc(p.name) + '</b><button aria-label="Exclure">×</button></span>'
        ).join('');
      }
      const b = $('btnStart');
      if (b) { b.disabled = !(players && players.length); b.textContent = players && players.length ? 'Lancer la partie (' + players.length + ')' : 'En attente de joueurs…'; }
      const hb = $('btnHostMain'); if (hb) hb.textContent = 'Lancer la partie';
    },

    phoneLobby(players, meId, code) {
      const box = $('pLobbyList');
      if (box) {
        box.innerHTML = (players || []).map((p) =>
          '<span class="pl' + (p.id === meId ? ' me' : '') + '"><i style="background:' + esc(p.sweat || '#2E85FF') + '"></i><b>' + esc(p.name) + '</b>' +
          (p.team ? '<em>' + (p.team === 'blue' ? 'BLEU' : 'VERT') + '</em>' : '') + '</span>'
        ).join('');
      }
      $('pLobbyCode').textContent = code || '-----';
      $('pLobbyTitle').textContent = 'Salle d\u2019attente';
      UI.count((players || []).length);
    },

    /* ---------------- scores ---------------- */
    balance(blue, green) {
      const total = Math.max(1, blue + green);
      const pct = Math.max(0, Math.min(100, (blue / total) * 100));
      const mark = $('balanceMark');
      if (mark) mark.style.left = pct + '%';
      const b = $('blueScore'), g = $('greenScore');
      if (b) b.textContent = blue;
      if (g) g.textContent = green;
      $('modeChip').textContent = 'Bleu ' + blue + ' · ' + green + ' Vert';
    },

    /* ---------------- fin ---------------- */
    ranks(list, host, meId) {
      const html = (list || []).map((p, i) =>
        '<li class="' + (i === 0 ? 'win ' : '') + (p.id === meId ? 'me' : '') + '">' +
        '<span class="med">' + (i === 0 ? '1' : i + 1) + '</span>' +
        '<b>' + esc(p.name) + '</b>' +
        '<span class="s">' + p.score + '</span></li>').join('');
      const r = $(host ? 'hostRank' : 'pRank');
      if (r) r.innerHTML = html;
    },
    endTitle(title) { const e = $('pEndTitle'); if (e) e.textContent = title || 'Classement'; },

    /* ---------------- classement général ---------------- */
    leaderboard(list, hint) {
      const box = $('lbList');
      if (box) {
        box.innerHTML = (list || []).slice(0, 50).map((e, i) =>
          '<li class="' + (i === 0 ? 'win' : '') + '"><span class="med">' + (i + 1) + '</span><b>' + esc(e.name) + '</b><span class="s">' + e.score + '</span></li>'
        ).join('') || '<li><b>Aucun score pour le moment.</b></li>';
      }
      const h = $('lbHint'); if (h) h.textContent = hint || '';
    },

    /* ---------------- avatar ---------------- */
    buildChars() {
      const g = $('charGrid');
      if (!g) return;
      const names = ['Héros 1', 'Héros 2', 'Héros 3', 'Héros 4', 'Héros 5', 'Héros 6'];
      g.innerHTML = names.map((n, i) =>
        '<button data-char="' + (i + 1) + '"><img src="assets/ui/podium.webp" alt=""><span>' + n + '</span></button>'
      ).join('');
      g.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => UI.pickChar(+b.dataset.char)));
    },
    pickChar(n) {
      UI.char = n;
      document.querySelectorAll('#charGrid button').forEach((b) => b.classList.toggle('on', +b.dataset.char === n));
    },
    buildSweat() {
      const g = $('sweatGrid');
      if (!g) return;
      g.innerHTML = PALETTE.map((c) => '<button data-c="' + c + '" style="background:' + c + '"></button>').join('');
      g.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => UI.pickSweat(b.dataset.c)));
    },
    pickSweat(c) {
      UI.sweat = c;
      document.querySelectorAll('#sweatGrid button').forEach((b) => b.classList.toggle('on', b.dataset.c === c));
    },

    /* ---------------- clavier ---------------- */
    KEY_SHIFT: ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P',
      'Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M',
      'W', 'X', 'C', 'V', 'B', 'N'],
    KEY_DIGIT: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
      '-', "'", '"', '.', ',', '?', '!', ':', ';', '/'],
    ACCENTS: ['à', 'â', 'ä', 'ç', 'é', 'è', 'ê', 'ë', 'î', 'ï', 'ô', 'ö', 'ù', 'û', 'ü', 'œ'],

    buildKeyboard() {
      const kb = $('pKeyboard');
      if (!kb) return;
      UI.kbState = { upper: false, digits: false };
      kb.innerHTML =
        '<div class="accents" id="kbAccents">' +
        UI.ACCENTS.map((c) => '<button type="button" data-k="' + c + '">' + c + '</button>').join('') +
        '</div>';
      const acc = $('kbAccents');
      // 3 rangées de lettres + rangée spéciale, insérées dans la grille principale
      const rows = document.createElement('div');
      kb.appendChild(rows);
      UI.kbRows = rows;
      rows.className = 'kb-rows';
      UI.renderKbRows();
      acc.addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        UI.insert(b.dataset.k);
      });
    },

    renderKbRows() {
      const rows = UI.kbRows;
      if (!rows) return;
      const st = UI.kbState;
      const letters = st.digits ? UI.KEY_DIGIT : UI.KEY_SHIFT;
      let html = '';
      for (let i = 0; i < letters.length; i++) {
        const k = letters[i];
        const label = (!st.digits && st.upper) ? k : k.toLowerCase();
        html += '<button type="button" data-k="' + esc(label) + '">' + esc(label) + '</button>';
      }
      html += '<button type="button" class="img" data-act="shift"><img src="assets/ui/key-shift.webp" alt="maj"></button>';
      html += '<button type="button" class="img" data-act="digits"><img src="assets/ui/key-123.webp" alt="123"></button>';
      html += '<button type="button" class="img wide" data-act="space"><img src="assets/ui/key-space.webp" alt="espace"></button>';
      html += '<button type="button" class="img" data-act="back"><img src="assets/ui/key-back.webp" alt="effacer"></button>';
      rows.innerHTML = html;
    },

    insert(ch) {
      const inp = $('pAnswer');
      if (!inp) return;
      if (inp.value.length >= 34) return;
      inp.value += ch;
      UI.answerChanged && UI.answerChanged();
    },

    bindKeyboard() {
      const kb = $('pKeyboard');
      if (!kb || kb.dataset.bound) return;
      kb.dataset.bound = '1';
      kb.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.k) { UI.insert(b.dataset.k); return; }
        const act = b.dataset.act;
        if (act === 'shift') { UI.kbState.upper = !UI.kbState.upper; UI.renderKbRows(); }
        else if (act === 'digits') { UI.kbState.digits = !UI.kbState.digits; UI.renderKbRows(); }
        else if (act === 'space') UI.insert(' ');
        else if (act === 'back') {
          const inp = $('pAnswer');
          inp.value = inp.value.slice(0, -1);
          UI.answerChanged && UI.answerChanged();
        }
      });
      // clavier physique (utile en démo desktop)
      document.addEventListener('keydown', (e) => {
        if (UI.current() !== 'pGame') return;
        const inp = $('pAnswer');
        if (e.key === 'Enter') { UI.onSubmit && UI.onSubmit(); return; }
        if (e.key === 'Backspace') { inp.value = inp.value.slice(0, -1); e.preventDefault(); UI.answerChanged && UI.answerChanged(); return; }
        if (e.key.length === 1) { UI.insert(e.key); e.preventDefault(); }
      });
    },

    /* ---------------- réactions ---------------- */
    reaction(kind, big, sub) {
      const r = $('pReaction');
      if (!r) return;
      const b = r.querySelector('.rbig'), s = r.querySelector('.rsub');
      b.className = 'rbig ' + (kind || '');
      b.textContent = big || '';
      s.textContent = sub || '';
      r.classList.add('show');
      clearTimeout(UI._rt);
      UI._rt = setTimeout(() => r.classList.remove('show'), 1100);
      if (navigator.vibrate) navigator.vibrate(kind === 'ok' ? 30 : 12);
    },

    /* ---------------- petits boutons ---------------- */
    hostButtons(phase) {
      const main = $('btnHostMain'), skip = $('btnHostSkip');
      if (!main) return;
      const isPause = phase === 'pause';
      main.style.display = isPause || phase === 'lobby' ? 'none' : '';
      main.textContent = phase === 'end' ? 'Rejouer' : (phase === 'reveal' ? 'Question suivante' : 'Terminer la manche');
      if (skip) skip.style.display = (phase === 'question' && !isPause) ? '' : 'none';
      const p15 = $('btnHostPlus15'), rev = $('btnHostReveal'), pbtn = $('btnHostPause');
      if (p15) p15.style.display = (phase === 'question' && !isPause) ? '' : 'none';
      if (rev) rev.style.display = (phase === 'question' && !isPause) ? '' : 'none';
      if (pbtn) pbtn.style.display = (phase === 'question' || phase === 'reveal') && !isPause ? '' : 'none';
      if (pbtn) pbtn.textContent = isPause ? 'Reprendre' : 'Pause';
    },

    /* tentatives par equipe */
    attempts(s, mode) {
      const el = $('hostAttempts');
      if (!el) return;
      const blue = s && s.players ? s.players.filter((p) => p.team === 'blue').reduce((n, p) => n + (p.attempts || 0), 0) : 0;
      const green = s && s.players ? s.players.filter((p) => p.team === 'green').reduce((n, p) => n + (p.attempts || 0), 0) : 0;
      const b = $('attemptsBlue'), g = $('attemptsGreen');
      if (b) b.textContent = blue;
      if (g) g.textContent = green;
      el.style.display = mode === 'duel' ? '' : 'none';
    },

    /* bandeau defilant des fausses propositions */
    wrongBanner(list) {
      const el = $('hostWrong');
      const marquee = document.querySelector('.wrong-marquee');
      if (!el || !marquee) return;
      if ((list || []).length === 0) { el.classList.add('hidden'); marquee.innerHTML = ''; return; }
      el.classList.remove('hidden');
      marquee.innerHTML = (list || []).map((w) =>
        '<span class="wrong-item">' + esc(w.by || '?') + ' : "' + esc(w.text || '') + '" ✗</span>').join('');
    },

    /* bannière manche finale x2 */
    finalBanner(s, mode, qi) {
      const el = document.getElementById('finalBanner');
      const total = s && s.qTotal ? s.qTotal : 0;
      const isFinal = mode !== 'solo' && qi >= 0 && total > 0 && qi === total - 1;
      if (!el) {
        const div = document.createElement('div');
        div.id = 'finalBanner';
        div.className = 'final-banner';
        div.style.display = 'none';
        const board = document.getElementById('board');
        if (board) board.parentNode.insertBefore(div, board.nextSibling);
      }
      const banner = document.getElementById('finalBanner');
      if (!banner) return;
      if (isFinal) {
        banner.textContent = 'MANCHE FINALE — x2';
        banner.classList.remove('hidden');
      } else {
        banner.classList.add('hidden');
      }
    },

    /* badge de bonus de rapidite */
    speedBadge(s, host) {
      let el = document.getElementById('speedBadge');
      if (!el) {
        el = document.createElement('div');
        el.id = 'speedBadge';
        el.style.position = 'absolute';
        el.style.left = '50%';
        el.style.top = 'calc(58px + var(--safe-t) + 42px)';
        el.style.transform = 'translateX(-50%)';
        el.style.fontFamily = "'Granika'";
        el.style.fontSize = '13px';
        el.style.color = varColor('--orange');
        el.style.letterSpacing = '1px';
        el.style.textTransform = 'uppercase';
        el.style.display = 'none';
        document.getElementById('hostQuestionWrap').parentNode.appendChild(el);
      }
      const now = Date.now();
      const elapsed = host && host.roundStart ? now - host.roundStart : 0;
      const show = s && s.phase === 'question' && elapsed < 10000;
      if (show) {
        const pct = Math.round(25 * (1 - elapsed / 10000));
        el.textContent = '+Vitesse ' + Math.max(0, pct) + '%';
        el.style.display = '';
      } else {
        el.style.display = 'none';
      }
    },

    /* emoji de reaction (affiche brièvement sur le telephone) */
    emoji(emoji) {
      const r = $('pReaction');
      if (!r) return;
      const b = r.querySelector('.rbig'), s = r.querySelector('.rsub');
      b.textContent = emoji; b.className = 'rbig';
      s.textContent = '';
      r.classList.add('show');
      clearTimeout(UI._emojiT);
      UI._emojiT = setTimeout(() => r.classList.remove('show'), 1400);
    },
  };

  global.UI = UI;
})(window);

function varColor(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#FF7A00';
}
