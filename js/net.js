/* =====================================================================
   js/net.js — transport MQTT + etat de salle (securise)
   Topics : creatorquiz3d/<code>/<hostSecret>/state  et  /events
   Le hostSecret est genere par l'hote et communique aux joueurs uniquement
   par QR code (lien de connexion). Un broker public ne permet pas de deviner
   le sujet : seuls le code (court, affiche) et le secret (QR) y donnent acces.
   ===================================================================== */
(function (global) {
  'use strict';

const BROKER = 'wss://broker.emqx.io:8084/mqtt';
const MAX_PLAYERS = 20;
const HOST_STATE_KEY = 'cq_host_state';
const ID_KEY = 'cq_id', NAME_KEY = 'cq_name', TOKEN_KEY = 'cq_token';
const TOPIC_PREFIX = 'creatorquiz3d';

const randInt = (max) => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
};
const randStr = (len) => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijklmnopqrstuvwxyz0123456789';
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  let s = '';
  for (let i = 0; i < len; i++) s += alphabet[buf[i] % alphabet.length];
  return s;
};
const uid = () => randStr(12) + Date.now().toString(36).slice(-4);
const makeSecret = () => randStr(12) + randStr(12);
const me = {
  id: localStorage.getItem(ID_KEY) || uid(),
  name: '',
  token: localStorage.getItem(TOKEN_KEY) || randStr(12),
};
localStorage.setItem(ID_KEY, me.id);
localStorage.setItem(TOKEN_KEY, me.token);

  const Net = {
    BROKER, TOPIC_PREFIX, MAX_PLAYERS, me,
    room: null, roomSecret: null, hostSecret: null, isHost: false, state: null,
    client: null,
    hooks: {},          // { state, hostEvent, playerEvent, closed, lost, reconnecting }
    lastStateAt: 0,
    hbTimer: null, watchTimer: null, joinTimer: null,

    /* ---------------- sujets MQTT ---------------- */
    topic(t) {
      return TOPIC_PREFIX + '/' + Net.room + '/' + Net.roomSecret + '/' + t;
    },

    /* ---------------- etat hote (reprise apres refresh) ---------------- */
    saveHostState() {
      if (!Net.isHost || !Net.state) return;
      try { localStorage.setItem(HOST_STATE_KEY, JSON.stringify(Net.state)); } catch (e) {}
    },
    loadHostState() {
      try {
        const raw = localStorage.getItem(HOST_STATE_KEY);
        const parsed = raw && JSON.parse(raw);
        return parsed && parsed.code ? parsed : null;
      } catch (e) { return null; }
    },
    clearHostState() { try { localStorage.removeItem(HOST_STATE_KEY); } catch (e) {} },

    /* ---------------- connexion ---------------- */
    connect(onReady) {
      if (Net.client) { try { Net.client.end(true); } catch (e) {} }
      const c = mqtt.connect(BROKER, {
        clientId: 'cq_' + me.id + '_' + Math.random().toString(16).slice(2, 6),
        clean: true, reconnectPeriod: 2000, connectTimeout: 8000, keepalive: 20,
      });
      Net.client = c;
      let first = true;
      c.on('connect', () => {
        c.subscribe([Net.topic('state'), Net.topic('events')], { qos: 1 }, () => {
          if (first) { first = false; onReady && onReady(); }
          else if (Net.isHost) Net.publishState();
        });
      });
      c.on('reconnect', () => { if (Net.hooks.reconnecting) Net.hooks.reconnecting(); });
      c.on('error', (e) => console.warn('MQTT', e && e.message));
      c.on('message', (topic, buf) => {
        let msg = null;
        try { msg = JSON.parse(buf.toString()); } catch (e) { return; }
        if (topic.endsWith('/state')) Net.onState(msg);
        else if (msg) Net.onEvent(msg);
      });
    },

    /**
     * Envoie un evenement joueur. Porne l'emetteur (from) et son jeton (token).
     */
    sendEvent(ev) {
      if (Net.client && Net.client.connected) {
        Net.client.publish(Net.topic('events'), JSON.stringify(Object.assign({}, ev, { from: me.id, token: me.token })), { qos: 1 });
      }
    },

    /**
     * Publie l'etat. Anti-triche : l'etat ne contient JAMAIS la banque, l'ordre
     * des questions ni les reponses non trouvees.
     */
    publishState() {
      if (!Net.isHost || !Net.client || !Net.state) return;
      Net.state.ts = Date.now();
      const pub = JSON.parse(JSON.stringify(Net.state));
      delete pub.qAns;
      delete pub.bank;
      delete pub.order;
      if (!Net.client.connected) { Net.saveHostState(); return; }
      Net.client.publish(Net.topic('state'), JSON.stringify(pub), { qos: 1, retain: true });
      Net.saveHostState();
      if (Net.hooks.state) Net.hooks.state(Net.state);
    },

    onState(s) {
      if (Net.isHost) return; // l'hote ignore tout etat publie par un tiers
      if (!s) { if (Net.state && Net.hooks.closed) Net.hooks.closed("L'hote a ferme la salle."); return; }
      if (s.code !== Net.room) return;
      const fresh = !Net.state;
      Net.state = s;
      Net.lastStateAt = Date.now();
      if (fresh && Date.now() - (s.ts || 0) > 60000) { Net.hooks.closed && Net.hooks.closed('La salle a expire.'); return; }
      if (Net.hooks.state) Net.hooks.state(s);
    },

    onEvent(ev) {
      if (Net.isHost) {
        if (ev.from !== me.id && Net.hooks.hostEvent) Net.hooks.hostEvent(ev);
        return;
      }
      if (ev.type === 'closed' && Net.hooks.closed) { Net.hooks.closed("L'hote a ferme la salle."); return; }
      if (Net.hooks.playerEvent) Net.hooks.playerEvent(ev);
    },

    /* ---------------- boucles ---------------- */
    startHeartbeat() {
      Net.stopHeartbeat();
      Net.hbTimer = setInterval(() => Net.publishState(), 3000);
    },
    stopHeartbeat() { if (Net.hbTimer) clearInterval(Net.hbTimer); Net.hbTimer = null; },

    startWatch() {
      Net.stopWatch();
      const joinedAt = Date.now();
      Net.watchTimer = setInterval(() => {
        const ref = Net.lastStateAt || joinedAt;
        const idle = Date.now() - ref;
        if (!Net.lastStateAt && idle > 15000) { Net.hooks.closed && Net.hooks.closed('Salle introuvable : verifiez le code.'); return; }
        if (idle > 60000) { Net.hooks.closed && Net.hooks.closed('La salle a expire.'); return; }
        if (Net.lastStateAt && idle > 12000 && Net.hooks.lost) Net.hooks.lost();
      }, 1000);
    },
    stopWatch() { if (Net.watchTimer) clearInterval(Net.watchTimer); Net.watchTimer = null; },

    /* ---------------- sortie ---------------- */
    leaveRoom(notify) {
      const c = Net.client;
      if (c) {
        try {
          if (Net.isHost) {
            c.publish(Net.topic('state'), '', { qos: 0, retain: true });
            c.publish(Net.topic('events'), JSON.stringify({ type: 'closed', from: me.id, token: me.token }));
          } else if (notify) {
            Net.sendEvent({ type: 'leave' });
          }
        } catch (e) {}
        setTimeout(() => { try { c.end(true); } catch (e) {} }, 250);
      }
      Net.stopHeartbeat(); Net.stopWatch();
      if (Net.joinTimer) clearInterval(Net.joinTimer); Net.joinTimer = null;
      Net.client = null; Net.state = null; Net.room = null; Net.roomSecret = null; Net.hostSecret = null;
      Net.isHost = false;
      Net.clearHostState();
    },
  };

  global.Net = Net;
})(window);
