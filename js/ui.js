// Interface DOM (panneaux, boutons). Reçoit un "view" et affiche ; renvoie les actions via des callbacks.
import { QUESTIONS, OPTIONS } from './questions.js';
import { PALETTE, MAX_PLAYERS, QUESTION_MS } from './config.js';
const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

export function createUI(h) {
  let endClosed = false;
  $('createBtn').onclick = () => h.create($('nameInput').value);
  $('joinBtn').onclick = () => h.join($('nameInput').value, $('roomInput').value);
  $('roomInput').onkeydown = (e) => { if (e.key === 'Enter') $('joinBtn').click(); };
  $('startBtn').onclick = h.start; $('leaveBtn').onclick = h.leave; $('copyBtn').onclick = h.copy;
  $('nextBtn').onclick = h.next; $('replayBtn').onclick = h.replay; $('closeEnd').onclick = () => { endClosed = true; $('end').hidden = true; };

  function status(msg, err) { const s = $('status'); s.textContent = msg || ''; s.className = err ? 'err' : ''; }

  function render(v) {
    const { pub, me, pick } = v, inRoom = !!pub && pub.phase !== 'closed';
    $('join').hidden = inRoom; ['hud', 'players'].forEach((i) => { $(i).hidden = !inRoom; });
    if (!inRoom) { ['lobbyBar', 'qpanel', 'end'].forEach((i) => { $(i).hidden = true; }); return; }
    $('code').textContent = me.room;
    const list = $('plist'); list.replaceChildren();
    [...pub.players].sort((a, b) => b.score - a.score || a.ci - b.ci).forEach((p) => {
      const row = el('div', 'p' + (p.id === me.id ? ' me' : '')); const dot = el('i'); dot.style.background = PALETTE[p.ci % PALETTE.length];
      row.append(dot, el('span', 'n', p.name + (p.id === pub.hostId ? ' ★' : '')),
        el('b', '', pub.phase === 'question' && pub.answered.includes(p.id) ? '✓' : p.score)); list.append(row);
    });
    const ph = pub.phase;
    $('lobbyBar').hidden = ph !== 'lobby';
    $('lobbyTxt').textContent = 'En attente de joueurs… ' + pub.players.length + '/' + MAX_PLAYERS;
    $('startBtn').hidden = !me.isHost; $('waitHost').hidden = me.isHost;
    const q = QUESTIONS[pub.qi], showQ = ph === 'question' || ph === 'reveal';
    $('qpanel').hidden = !showQ;
    if (showQ) {
      $('qnum').textContent = 'Question ' + (pub.qi + 1) + ' / ' + pub.total; $('qtext').textContent = q.q;
      const res = pub.results && pub.results[me.id], mine = pub.players.some((p) => p.id === me.id);
      $('answers').replaceChildren(...OPTIONS.map((o, i) => {
        const b = el('button', 'ans', o); b.disabled = ph !== 'question' || !mine || pick !== null || pub.answered.includes(me.id);
        if (pick === i || (res && res.a === i)) b.classList.add('sel');
        if (ph === 'reveal') { if (pub.correct === i) b.classList.add('good'); else if (res && res.a === i) b.classList.add('bad'); }
        b.onclick = () => h.answer(i); return b;
      }));
      $('feedback').textContent = ph === 'question' ? (pick !== null || pub.answered.includes(me.id) ? 'Réponse enregistrée — on attend les autres…' : 'Choisis vite : plus tu réponds tôt, plus tu gagnes !')
        : res ? (res.ok ? '✓ Bonne réponse ! +' + res.pts + ' pts' : res.a === null ? '⏱ Temps écoulé' : '✗ Raté') : '';
      $('feedback').className = ph === 'reveal' && res ? (res.ok ? 'ok' : 'ko') : '';
      $('nextBtn').hidden = !(me.isHost && ph === 'reveal'); $('nextBtn').textContent = pub.qi + 1 >= pub.total ? 'Voir le classement ▶' : 'Question suivante ▶';
      $('timer').hidden = ph !== 'question';
    }
    if (ph !== 'end') endClosed = false;
    $('end').hidden = ph !== 'end' || endClosed;
    if (ph === 'end') fillEnd(pub, me);
  }

  function fillEnd(pub, me) {
    const medals = ['🥇', '🥈', '🥉'], box = $('lb'); box.replaceChildren();
    [...pub.players].sort((a, b) => b.score - a.score).forEach((p, i) => {
      const r = el('div', 'lb' + (i === 0 ? ' win' : '') + (p.id === me.id ? ' me' : '')); r.append(el('span', '', (medals[i] || i + 1 + '.') + ' ' + p.name), el('b', '', p.score + ' pts')); box.append(r);
    });
    $('replayBtn').hidden = !me.isHost;
  }

  function tick(ms) { $('bar').style.width = Math.max(0, ms / QUESTION_MS * 100) + '%'; $('bar').classList.toggle('low', ms < 5000); $('secs').textContent = Math.ceil(ms / 1000) + ' s'; }
  return { render, tick, status };
}
