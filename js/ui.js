/* =====================================================================
   js/ui.js — petits utilitaires d'interface + sons + confettis
   ===================================================================== */
(function (global) {
  'use strict';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const on = (el, ev, fn, opts) => { if (el) el.addEventListener(ev, fn, opts); };
  const show = (el) => { if (el) el.classList.remove('hidden'); };
  const hide = (el) => { if (el) el.classList.add('hidden'); };
  const toggle = (el, force) => { if (el) el.classList.toggle('hidden', force === undefined ? undefined : !force); };

  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const fmt = (n) => String(Math.round(Number(n) || 0));
  const secs = (ms) => Math.max(0, Math.ceil(ms / 1000));

  let toastTimers = new WeakMap();
  function toast(container, message, kind, ms) {
    const box = typeof container === 'string' ? $(container) : container;
    if (!box || !message) return;
    /* une seule notification à la fois : on remplace la précédente */
    while (box.firstChild) box.removeChild(box.firstChild);
    const el = document.createElement('div');
    el.className = 'toast' + (kind ? ' toast--' + kind : '');
    el.textContent = message;
    el.setAttribute('role', 'status');
    box.appendChild(el);
    const t = setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(6px)';
      el.style.transition = 'opacity .25s, transform .25s';
      setTimeout(() => el.remove(), 260);
    }, ms || 3000);
    const old = toastTimers.get(el);
    if (old) clearTimeout(old);
    toastTimers.set(el, t);
  }

  function openModal(id) { const el = typeof id === 'string' ? $(id) : id; show(el); }
  function closeModal(id) { const el = typeof id === 'string' ? $(id) : id; hide(el); }

  function miniAvatar(avatar) {
    return '<span class="rank-avatar">' + (global.Avatar ? global.Avatar.svg(avatar) : '') + '</span>';
  }

  function rankList(target, rows, opts) {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    const o = opts || {};
    el.innerHTML = (rows || []).map((r, i) => {
      const rank = r.rank || i + 1;
      const isMe = o.meId && r.id === o.meId;
      const win = rank === 1;
      const av = r.avatar ? miniAvatar(r.avatar) : '';
      return '<li class="rank-item' + (win ? ' win' : '') + (isMe ? ' me' : '') + '">' +
        '<span class="rank-pos">' + esc(rank) + '</span>' +
        av +
        '<span class="rank-name">' + esc(r.name || 'Joueur') + '</span>' +
        '<span class="rank-score">' + fmt(r.score) + '</span>' +
        '</li>';
    }).join('');
  }

  let reactionTimer = null;
  function reaction(kind, big, sub, ms) {
    const el = $('#pReaction');
    if (!el) return;
    clearTimeout(reactionTimer);
    el.className = 'reaction ' + (kind === 'found' ? 'ok' : kind === 'steal' ? 'steal' : kind === 'dup' ? 'dup' : 'bad');
    el.innerHTML = '<div class="r-big">' + esc(big || '') + '</div>' +
      (sub ? '<div class="r-sub">' + esc(sub) + '</div>' : '');
    el.classList.remove('hidden');
    reactionTimer = setTimeout(() => el.classList.add('hidden'), ms || 1500);
  }

  /* ---------------- Confettis ---------------- */
  let confettiRaf = null;
  function confetti(canvas, duration) {
    if (!canvas) return;
    if (confettiRaf) cancelAnimationFrame(confettiRaf);
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(global.devicePixelRatio || 1, 2);
    const W = canvas.clientWidth || global.innerWidth;
    const H = canvas.clientHeight || global.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    canvas.classList.remove('hidden');

    const colors = ['#00E472', '#2E85FF', '#FF4E20', '#FF7A00', '#FFCF5A', '#F4F6FC'];
    const parts = [];
    for (let i = 0; i < 140; i++) {
      parts.push({
        x: W * (0.1 + Math.random() * 0.8),
        y: -20 - Math.random() * H * 0.5,
        vx: (Math.random() - 0.5) * 1.6,
        vy: 1.4 + Math.random() * 2.6,
        w: 5 + Math.random() * 8,
        h: 8 + Math.random() * 10,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    const start = performance.now();
    function frame(now) {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.025; p.rot += p.vr;
        if (p.y > H + 30) { p.y = -30; p.x = Math.random() * W; }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = t > (duration || 3) ? Math.max(0, 1 - (t - (duration || 3)) / 0.6) : 0.95;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (t < (duration || 3) + 0.7) {
        confettiRaf = requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, W, H);
        canvas.classList.add('hidden');
        confettiRaf = null;
      }
    }
    confettiRaf = requestAnimationFrame(frame);
  }

  /* ---------------- Sons synthétisés ---------------- */
  const Sound = {
    ctx: null,
    muted: false,
    init() {
      if (Sound.ctx) return;
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return;
      try { Sound.ctx = new AC(); } catch (e) { Sound.ctx = null; }
    },
    unlock() {
      Sound.init();
      if (Sound.ctx && Sound.ctx.state === 'suspended') Sound.ctx.resume().catch(() => {});
    },
    setMuted(v) {
      Sound.muted = !!v;
      try { localStorage.setItem('gtq.muted', Sound.muted ? '1' : '0'); } catch (e) {}
    },
    toggle() { Sound.setMuted(!Sound.muted); return Sound.muted; },
    tone(freq, dur, type, gain, delay, slideTo) {
      if (Sound.muted || !Sound.ctx) return;
      const ctx = Sound.ctx;
      const t0 = ctx.currentTime + (delay || 0);
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(0.02, gain || 0.15), t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    },
    play(name) {
      if (Sound.muted) return;
      Sound.init();
      if (!Sound.ctx) return;
      switch (name) {
        case 'click': Sound.tone(520, 0.06, 'triangle', 0.08); break;
        case 'join': Sound.tone(480, 0.1, 'sine', 0.1); Sound.tone(720, 0.12, 'sine', 0.1, 0.09); break;
        case 'buzz':
          Sound.tone(180, 0.28, 'sawtooth', 0.16, 0, 90);
          Sound.tone(360, 0.28, 'square', 0.06);
          break;
        case 'found':
          Sound.tone(660, 0.1, 'triangle', 0.14);
          Sound.tone(880, 0.12, 'triangle', 0.13, 0.09);
          Sound.tone(1320, 0.18, 'triangle', 0.11, 0.19);
          break;
        case 'wrong':
          Sound.tone(220, 0.18, 'sawtooth', 0.14, 0, 140);
          Sound.tone(140, 0.26, 'sawtooth', 0.12, 0.16, 70);
          break;
        case 'steal':
          Sound.tone(520, 0.1, 'square', 0.1);
          Sound.tone(700, 0.1, 'square', 0.1, 0.1);
          Sound.tone(980, 0.2, 'square', 0.1, 0.2);
          break;
        case 'tick': Sound.tone(880, 0.04, 'sine', 0.05); break;
        case 'win':
          [523, 659, 784, 1046].forEach((f, i) => Sound.tone(f, 0.24, 'triangle', 0.13, i * 0.13));
          break;
        case 'lose':
          [392, 330, 262].forEach((f, i) => Sound.tone(f, 0.24, 'sine', 0.12, i * 0.15));
          break;
        default: break;
      }
    },
  };
  try { Sound.muted = localStorage.getItem('gtq.muted') === '1'; } catch (e) {}

  function setLoader(progress, text) {
    const bar = $('#loaderBar');
    const txt = $('#loaderTxt');
    if (bar) bar.style.width = Math.max(0, Math.min(100, progress)) + '%';
    if (txt && text) txt.textContent = text;
  }
  function hideLoader() {
    const loader = $('#loader');
    if (!loader) return;
    setLoader(100, 'C’est parti !');
    setTimeout(() => loader.classList.add('done'), 260);
    setTimeout(() => hide(loader), 900);
  }

  global.UI = {
    $, $$, on, show, hide, toggle, esc, fmt, secs,
    toast, openModal, closeModal, miniAvatar, rankList, reaction, confetti,
    Sound, setLoader, hideLoader,
  };
})(window);
