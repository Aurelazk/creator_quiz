// Chef d'orchestre : relie réseau (Net), logique (QuizGame), scène 3D et interface.
import { QuizGame, cleanName } from './game.js';
import { Net, topics } from './net.js';
import { initScene, sync } from './scene.js';
import { createUI } from './ui.js';
import { playIntro } from './intro.js';

const me = { id: sessionStorage.cq_id || (sessionStorage.cq_id = Math.random().toString(36).slice(2, 11)), name: '', isHost: false, room: null };
let net = null, game = null, pub = null, recvAt = 0, pick = null, tp = null, timers = [];
const now = () => Date.now();
const remaining = () => (pub && pub.phase === 'question' ? Math.max(0, pub.timeLeft - (now() - recvAt)) : 0);
const myPick = () => (pick && pub && pick.qi === pub.qi ? pick.a : null);
const ui = createUI({ create, join, start: () => act('start'), leave, copy, next: () => act('next'), replay: () => act('reset'), answer });

function render() { ui.render({ pub, me, pick: myPick() }); sync(pub, me.id); }
function pushState() { pub = game.snapshot(now()); recvAt = now(); net.publish(tp.state, pub, true); render(); }
function stop() { timers.forEach(clearInterval); timers = []; }

// ---------- Hôte ----------
async function create(name) {
  me.name = cleanName(name); localStorage.cq_name = me.name; ui.status('Création de la salle…');
  const room = Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[(Math.random() * 32) | 0]).join('');
  tp = topics(room); net = new Net({ onMessage: onHostMessage, onConnection: () => {} });
  try { await net.connect({ topic: tp.state, payload: JSON.stringify({ phase: 'closed' }), qos: 0, retain: true }); } catch (e) { return ui.status(e.message, true); }
  Object.assign(me, { isHost: true, room }); game = new QuizGame(me.id, me.name); net.subscribe([tp.toHost]);
  history.replaceState(null, '', '?room=' + room); pushState(); ui.status('');
  timers.push(setInterval(() => { if (game.expired(now()) || (game.phase === 'question' && game.everyoneAnswered())) { game.reveal(); pushState(); } }, 250), setInterval(pushState, 3000));
}
function onHostMessage(_, m) {
  if (!game) return; let changed = false;
  if (m.t === 'join') changed = game.addPlayer(m.id, m.name) && !pub.players.some((p) => p.id === m.id && p.name === cleanName(m.name));
  else if (m.t === 'leave') { game.removePlayer(m.id); changed = true; }
  else if (m.t === 'answer') changed = game.submit(m.id, m.qi, m.a, now());
  if (changed) pushState();
}
function act(kind) {
  if (!me.isHost) return;
  if (kind === 'start') game.start(now()); else if (kind === 'next') game.next(now()); else if (kind === 'reset') game.reset();
  pick = null; pushState();
}

// ---------- Joueur ----------
async function join(name, code) {
  const room = (code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (room.length < 4) return ui.status('Entre un code de salle valide.', true);
  me.name = cleanName(name); localStorage.cq_name = me.name; ui.status('Connexion à la salle ' + room + '…');
  tp = topics(room); net = new Net({ onMessage: onClientMessage, onConnection: () => {} });
  try { await net.connect(); } catch (e) { return ui.status(e.message, true); }
  me.room = room; net.subscribe([tp.state]); history.replaceState(null, '', '?room=' + room);
  const sendJoin = () => net.publish(tp.toHost, { t: 'join', id: me.id, name: me.name }); sendJoin();
  const started = now();
  timers.push(setInterval(() => {
    if (pub && pub.players.some((p) => p.id === me.id)) return;
    if (now() - started > 9000) { ui.status(pub ? 'Salle pleine ou indisponible.' : 'Salle introuvable ou hôte hors ligne.', true); leave(true); } else sendJoin();
  }, 2500));
}
function onClientMessage(_, m) {
  if (m.phase === 'closed') { ui.status('L’hôte a fermé la salle.', true); return leave(true); }
  if (!m.players) return; if (pub && m.qi !== pub.qi) pick = null;
  pub = m; recvAt = now(); render();
}
function answer(a) {
  if (!pub || pub.phase !== 'question' || myPick() !== null) return;
  pick = { qi: pub.qi, a };
  if (me.isHost) { game.submit(me.id, pub.qi, a, now()); pushState(); } else net.publish(tp.toHost, { t: 'answer', id: me.id, qi: pub.qi, a });
  render();
}

function leave(silent) {
  stop();
  if (net) { if (me.isHost) net.clear(tp.state); else net.publish(tp.toHost, { t: 'leave', id: me.id }); net.close(); }
  net = null; game = null; pub = null; pick = null; Object.assign(me, { isHost: false, room: null });
  history.replaceState(null, '', location.pathname); render(); if (silent !== true) ui.status('');
}
function copy() {
  const url = location.origin + location.pathname + '?room=' + me.room;
  (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => ui.status('Lien copié !'), () => ui.status('Code : ' + me.room));
}
addEventListener('pagehide', () => { if (net && !me.isHost && me.room) net.publish(tp.toHost, { t: 'leave', id: me.id }); });

// ---------- Démarrage ----------
if (localStorage.cq_name) document.getElementById('nameInput').value = localStorage.cq_name;
const qr = new URLSearchParams(location.search).get('room'); if (qr) document.getElementById('roomInput').value = qr.toUpperCase();
initScene(document.getElementById('stage'), () => ({ pub, remaining: remaining() }));
setInterval(() => ui.tick(remaining()), 100); render();
playIntro(document.getElementById('intro'), () => document.body.classList.add('ready'));
