/* =====================================================================
   js/intro-anim.js — intro animée CREATOR
   Lampe originale aux couleurs CREATOR qui écrase le T de CREATOR.
   Storyboard 5 s, cible mesurée sur la lettre T (#l-T) après chargement
   des polices, une seule horloge render(t), paramètre ?introT=3.6.
   ===================================================================== */
(function (global) {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const DURATION_FULL = 5000;
  const DURATION_SHORT = 1200;
  const MAX_WAIT = 6000;
  const STORAGE_KEY = 'gtq.intro.seen';

  let introStarted = false;
  let introFinished = false;
  let introAborted = false;
  let audioReady = false;
  let ctx = null;
  let frozen = false;

  /* ---------------- sons synthétisés (WebAudio) ---------------- */
  function initAudio() {
    if (audioReady) return;
    const AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) { audioReady = true; return; }
    try { ctx = new AC(); audioReady = true; } catch (e) { ctx = null; audioReady = true; }
  }
  function resumeAudio() {
    initAudio();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }
  function tone(freq, dur, type, gain, delay, slideTo) {
    if (frozen || !audioReady || !ctx || (global.UI && global.UI.Sound && global.UI.Sound.muted)) return;
    try {
      const t0 = ctx.currentTime + (delay || 0);
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(0.02, gain || 0.12), t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch (e) {}
  }
  const sBoing = () => tone(320, 0.14, 'triangle', 0.1, 0, 560);
  const sLand = () => tone(150, 0.12, 'sawtooth', 0.12);
  const sSplat = () => { tone(110, 0.22, 'sawtooth', 0.16, 0, 60); tone(70, 0.3, 'sawtooth', 0.1, 0.12, 40); };
  const sTing = () => tone(980, 0.16, 'sine', 0.1);

  function alreadySeen() {
    try { return sessionStorage.getItem(STORAGE_KEY) === '1'; } catch (e) { return false; }
  }
  function markSeen() {
    try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
  }

  /* ---------------- DOM ---------------- */
  const intro = $('#intro');
  let letters = [];
  let dot = null;
  let lamp = null;
  let beam = null;
  let skipBtn = null;
  let loadingMsg = null;
  let metric = [];
  let layout = null;

  function refreshRefs() {
    if (!intro) return;
    letters = Array.from(intro.querySelectorAll('.letter'));
    dot = intro.querySelector('.dot');
    lamp = intro.querySelector('#introLamp');
    beam = intro.querySelector('#introBeam');
    skipBtn = intro.querySelector('#btnIntroSkip');
    loadingMsg = intro.querySelector('#introLoading');
  }

  function measure() {
    const rects = letters.map((l) => {
      const b = l.getBoundingClientRect();
      return { el: l, x: b.x, y: b.y, w: b.width, h: b.height, right: b.right, bottom: b.bottom };
    });
    const t = rects[4] || null;
    const wordLeft = rects.length ? rects[0].x : global.innerWidth / 2;
    const wordRight = rects.length ? rects[rects.length - 1].right : global.innerWidth / 2;

    if (lamp) {
      const prev = lamp.style.transform;
      lamp.style.transform = 'none';
      lamp.style.visibility = 'hidden';
      const lb = lamp.getBoundingClientRect();
      lamp.style.transform = prev;
      lamp.style.visibility = '';
      const lampW = lb.width || 200;
      const lampH = lb.height || 150;
      const gap = Math.max(12, lampW * 0.06);
      /* la lampe entre et s'arrête à droite du mot entier… */
      let stopX = wordRight + gap;
      stopX = Math.min(stopX, global.innerWidth - lampW - 10);
      stopX = Math.max(stopX, 8);
      const stopY = t ? Math.max(8, t.bottom - lampH + t.h * 0.12) : global.innerHeight / 2;
      /* la lampe saute sur le T : centrée au-dessus de la lettre */
      const targetX = t ? t.x + t.w / 2 - lampW / 2 : stopX;
      const targetY = t ? Math.max(6, t.y - lampH * 0.62) : stopY - lampH * 0.6;
      layout = { lampW, lampH, stopX, stopY, targetX, targetY, wordLeft, wordRight, t };
    }
    metric = rects;
    return layout;
  }

  function placeLamp(x, y, sx, sy, rot) {
    if (!lamp) return;
    lamp.style.transform = 'translate3d(' + Math.round(x) + 'px,' + Math.round(y) + 'px,0)' +
      ' scale(' + (sx == null ? 1 : sx).toFixed(3) + ',' + (sy == null ? 1 : sy).toFixed(3) + ')' +
      (rot ? ' rotate(' + rot.toFixed(2) + 'deg)' : '');
    lamp.style.zIndex = '25';
  }
  function placeBeam(x, y, sx, opacity) {
    if (!beam) return;
    beam.style.opacity = String(opacity);
    beam.style.transform = 'translate3d(' + Math.round(x) + 'px,' + Math.round(y) + 'px,0) scale(' + (sx || 1).toFixed(2) + ',1)';
  }

  /* ---------------- état visuel à un instant t (ms) ---------------- */
  let shown = 0;
  function applyState(t) {
    if (!layout) return;
    const L = layout;

    /* 0.35–1.05 s : lettres une par une */
    const letterTimes = [350, 460, 570, 680, 790, 900, 1010];
    letterTimes.forEach((at, i) => {
      if (t >= at && letters[i] && !letters[i].classList.contains('on')) {
        letters[i].classList.add('appear', 'on');
        if (!frozen) {
          if (i === 0 || i === 3) sBoing();
          if (i === 6) sTing();
        }
      }
    });
    shown = letters.filter((l) => l.classList.contains('on')).length;

    /* 1.10–1.95 s : entrée de la lampe en 3 sauts (visible dès 2 s) */
    if (t < 1100) {
      placeLamp(global.innerWidth + L.lampW, L.stopY);
      placeBeam(0, 0, 1, 0);
    } else if (t < 1950) {
      const p = (t - 1100) / 850;
      const jump = (p * 3) % 1;
      const arc = -Math.sin(Math.PI * jump) * L.lampH * 0.5;
      const x = (global.innerWidth + L.lampW) + (L.stopX - (global.innerWidth + L.lampW)) * p;
      const sq = jump < 0.5 ? 1 + 0.16 * Math.sin(Math.PI * jump) : 1 - 0.1 * Math.sin(Math.PI * (jump - 0.5));
      const sx = 1 + (1 - sq) * 0.8;
      placeLamp(x, L.stopY + arc, sx, sq);
      placeBeam(x, L.stopY + arc + 40, L.lampW / 170, jump > 0.35 && jump < 0.75 ? 0.8 : 0);
      if (!frozen && jump < 0.04 && Math.floor(p * 3) > 0) sLand();
    } else if (t < 3300) {
      /* 1.95–3.30 s : la lampe observe, à droite du T */
      const p = (t - 1950) / 1350;
      placeLamp(L.stopX, L.stopY, 1, 1, Math.sin(p * Math.PI) * 4);
      placeBeam(L.stopX, L.stopY + 40, L.lampW / 170, 0.55);
    } else if (t < 3700) {
      /* 3.30–3.70 s : saut sur le T */
      const p = (t - 3300) / 400;
      const arc = -Math.sin(Math.PI * p) * L.lampH * 0.55;
      const x = L.stopX + (L.targetX - L.stopX) * p;
      const y = L.stopY + (L.targetY - L.stopY) * p + arc;
      const sy = 1 - 0.22 * p;
      placeLamp(x, y, 1 + 0.12 * p, sy);
      placeBeam(x, y + 40, L.lampW / 170, 0.6);
      if (!frozen && p > 0.92) sBoing();
    } else if (t < 4000) {
      /* 3.70–4.00 s : écrasement du T */
      const p = (t - 3700) / 300;
      const tEl = letters[4];
      if (tEl) tEl.classList.add('crush');
      placeLamp(L.targetX, L.targetY + Math.sin(p * Math.PI) * 6, 1.04, 0.86);
      placeBeam(L.targetX, L.targetY + 40, L.lampW / 170, 0.85);
      if (!frozen && p < 0.12) sSplat();
    } else if (t < 4600) {
      /* 4.00–4.60 s : la lampe se redresse, le mot s'illumine */
      const p = (t - 4000) / 600;
      placeLamp(L.targetX, L.targetY, 1 + 0.02 * p, 0.86 + 0.14 * p);
      placeBeam(L.targetX, L.targetY + 40, L.lampW / 170, 0.5 + 0.5 * p);
      if (dot) dot.classList.add('on');
    } else {
      if (dot) dot.classList.add('on');
      placeLamp(L.targetX, L.targetY, 1, 1);
      placeBeam(L.targetX, L.targetY + 40, L.lampW / 170, 0.6);
    }
  }

  function runIntro(isShort) {
    const params = new URLSearchParams(location.search);
    const seekRaw = parseFloat(params.get('introT'));
    const seekMs = Number.isFinite(seekRaw) ? Math.max(0, Math.min(5, seekRaw)) * 1000 : null;
    frozen = seekMs != null;

    const T = isShort ? DURATION_SHORT : DURATION_FULL;
    const start = performance.now();

    measure();
    measure();
    if (!isShort && !frozen) placeLamp(global.innerWidth + (layout ? layout.lampW : 200), 0);
    applyState(seekMs != null ? seekMs : (isShort ? T - 1 : 0));

    if (frozen) {
      /* instant figé pour les tests visuels : pas de boucle, pas de son */
      if (skipBtn) skipBtn.classList.add('show');
      if (intro) intro.classList.remove('hidden');
      applyState(seekMs);
      return;
    }

    let frameId = null;
    function frame(now) {
      if (introAborted) { cancelAnimationFrame(frameId); return; }
      const elapsed = now - start;
      applyState(isShort ? T - 1 : elapsed);
      if (elapsed >= T) { finishIntro(false); return; }
      frameId = requestAnimationFrame(frame);
    }
    frameId = requestAnimationFrame(frame);

    global.addEventListener('resize', () => { measure(); }, { passive: true });

    setTimeout(() => {
      if (!introFinished) {
        if (loadingMsg) { loadingMsg.classList.add('show'); loadingMsg.textContent = 'Connexion lente, on y est presque…'; }
        setTimeout(() => finishIntro(true), 1500);
      }
    }, MAX_WAIT);

    function skip() {
      if (frozen) return;
      introAborted = true;
      cancelAnimationFrame(frameId);
      finishIntro(true);
    }
    if (skipBtn) {
      setTimeout(() => skipBtn.classList.add('show'), 800);
      skipBtn.addEventListener('click', skip);
      skipBtn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') skip(); });
    }
    if (intro) {
      intro.addEventListener('click', skip);
      intro.addEventListener('keydown', (e) => { if (e.key === 'Escape') skip(); });
    }
  }

  function finishIntro(skipped) {
    if (introFinished) return;
    introFinished = true;
    if (!skipped) markSeen();
    if (!intro) return;
    intro.classList.add('fade-out');
    setTimeout(() => {
      intro.classList.add('hidden');
      const app = document.getElementById('app');
      if (app) app.style.visibility = '';
      if (global.UI && typeof global.UI.hideLoader === 'function') global.UI.hideLoader();
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new Event('intro:done'));
      }
    }, 250);
  }

  function startIntro() {
    if (!intro || introStarted) return;
    introStarted = true;
    refreshRefs();
    intro.classList.remove('hidden');
    /* l'audio ne se crée qu'au premier clic utilisateur (sécurité navigateur) */
    const startAudio = () => { resumeAudio(); document.removeEventListener('pointerdown', startAudio); document.removeEventListener('keydown', startAudio); };
    document.addEventListener('pointerdown', startAudio, { once: true });
    document.addEventListener('keydown', startAudio, { once: true });
    const isShort = alreadySeen();
    if (isShort) {
      letters.forEach((l) => { l.classList.add('on'); l.style.opacity = 1; });
      if (dot) dot.classList.add('on');
    }
    const go = () => {
      try { measure(); } catch (e) {}
      runIntro(isShort);
    };
    if (document.fonts && document.fonts.ready && !isShort) {
      document.fonts.ready.then(go).catch(go);
      /* filet de sécurité si les polices ne répondent pas */
      setTimeout(() => { if (!introStarted || !layout) go(); }, 1200);
    } else {
      go();
    }
  }

  function seek(seconds) {
    refreshRefs();
    measure();
    applyState(Math.max(0, Math.min(5, Number(seconds) || 0)) * 1000);
  }

  global.IntroAnim = {
    start: startIntro,
    skip: finishIntro,
    seek: seek,
    isFinished: () => introFinished,
    get layout() { return layout; },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startIntro);
  } else {
    startIntro();
  }
})(window);
