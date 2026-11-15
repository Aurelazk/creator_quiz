/* =====================================================================
   js/net.js — client WebSocket (reconnexion automatique)
   Le serveur reste l'unique source de vérité : on ne fait qu'envoyer des
   intentions et afficher l'état reçu.

   L'URL du serveur de jeu est lue depuis /api/config (variable GAME_WS_URL
   sur Vercel). Si elle est absente, on retombe sur le même hôte (/api/ws),
   ce qui fonctionne en local et sur un hôte Node persistant.
   ===================================================================== */
(function (global) {
  'use strict';

  function normalizeWsUrl(raw) {
    if (typeof raw !== 'string' || !raw.trim()) return null;
    let url;
    try { url = new URL(raw.trim()); } catch (e) { return null; }
    if (url.protocol !== 'wss:' && url.protocol !== 'ws:') return null;
    if (!url.pathname || url.pathname === '/') url.pathname = '/ws';
    return url.toString();
  }

  const Net = {
    ws: null,
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
    configPromise: null,
    everConnected: false,

    loadConfig() {
      if (Net.wsBase) return Promise.resolve(Net.wsBase);
      if (!Net.configPromise) {
        Net.configPromise = fetch('/api/config', { cache: 'no-store' })
          .then((res) => (res.ok ? res.json() : null))
          .then((cfg) => {
            Net.wsBase = cfg ? normalizeWsUrl(cfg.wsUrl) : null;
            Net.publicUrl = cfg && typeof cfg.publicUrl === 'string'
              ? cfg.publicUrl.replace(/\/+$/, '') : null;
            return Net.wsBase;
          })
          .catch(() => null);
      }
      return Net.configPromise;
    },

    url() {
      if (Net.wsBase) return Net.wsBase;
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      return proto + '//' + location.host + '/api/ws';
    },

    /* Origine HTTP du serveur de jeu ('' si même hôte). */
    apiBase() {
      if (!Net.wsBase) return '';
      try {
        const url = new URL(Net.wsBase);
        return url.origin;
      } catch (e) { return ''; }
    },

    connect() {
      if (Net.ws && (Net.ws.readyState === 0 || Net.ws.readyState === 1)) return;
      Net.active = true;
      Net.connecting = true;
      clearTimeout(Net.retryTimer);
      Net.loadConfig().then(() => {
        if (Net.active) Net.open();
      });
    },

    open() {
      if (Net.ws && (Net.ws.readyState === 0 || Net.ws.readyState === 1)) return;
      let ws;
      try { ws = new WebSocket(Net.url()); } catch (e) { Net.scheduleRetry(); return; }
      Net.ws = ws;

      ws.onopen = () => {
        Net.connected = true;
        Net.connecting = false;
        Net.everConnected = true;
        Net.retry = 0;
        if (Net.onStatus) Net.onStatus('connected');
        if (Net.onOpen) Net.onOpen();
      };
      ws.onmessage = (ev) => {
        let msg;
        try { msg = JSON.parse(ev.data); } catch (e) { return; }
        if (!msg || !msg.type) return;
        if (msg.type === 'state') {
          if (Net.handlers.state) Net.handlers.state(msg);
        } else if (msg.type === 'event') {
          if (Net.handlers.event) Net.handlers.event(msg);
        } else if (Net.handlers[msg.type]) {
          Net.handlers[msg.type](msg);
        }
      };
      ws.onclose = () => {
        Net.connected = false;
        Net.connecting = false;
        if (Net.onStatus) Net.onStatus('disconnected');
        if (Net.active) Net.scheduleRetry();
      };
      ws.onerror = () => {
        try { ws.close(); } catch (e) {}
      };
    },

    scheduleRetry() {
      clearTimeout(Net.retryTimer);
      Net.retry = Math.min(Net.retry + 1, 8);
      const delay = Math.min(500 * Math.pow(1.5, Net.retry), 5000);
      Net.retryTimer = setTimeout(() => Net.connect(), delay);
    },

    send(type, payload) {
      if (!Net.ws || Net.ws.readyState !== 1) return false;
      try {
        Net.ws.send(JSON.stringify(Object.assign({ type }, payload || {})));
        return true;
      } catch (e) { return false; }
    },

    close() {
      Net.active = false;
      clearTimeout(Net.retryTimer);
      if (Net.ws) { try { Net.ws.close(); } catch (e) {} }
      Net.ws = null;
      Net.connected = false;
    },
  };

  global.Net = Net;
})(window);
