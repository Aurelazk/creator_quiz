/* =====================================================================
   js/intro-anim.js — intro animée CREATOR (remplace le loader statique)
   Lampe originale aux couleurs CREATOR, écrase le T de CREATOR.
   < 30 Ko, pas de Three.js, WebAudio pour les sons, sessionStorage.
   Storyboard exact ≈ 4,8 s. Mesure du DOM (pas de pixels fixes).
   ===================================================================== */
(function (global) {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const DURATION_FULL = 4800;
  const DURATION_SHORT = 1200;
  const MAX_WAIT = 8000;
  const STORAGE_KEY = 'gtq.intro.seen';

  let introStarted = false;
  let introFinished = false;
  let introAborted = false;
  let audioReady = false;
  let ctx = null;

  /* ---------------- sons synthétisés (WebAudio) ---------------- */
  function initAudio() {
    if (audioReady) return;
    const AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC(); audioReady = true; } catch (e) { ctx = null; audioReady = true; }
  }
  function resumeAudio() {
    initAudio();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }
  function tone(freq, dur, type, gain, delay, slideTo) {
    if (!audioReady || !ctx || (global.UI && global.UI.Sound && global.UI.Sound.muted)) return;
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
  }
  function sBoing()  { tone(320, 0.14, 'triangle', 0.1, 0, 560); }
  function sLand()   { tone(150, 0.12, 'sawtooth', 0.12); }
  function sSplat()  { tone(110, 0.22, 'sawtooth', 0.16, 0, 60); tone(70, 0.3, 'sawtooth', 0.1, 0.12, 40); }
  function sTing()   { tone(980, 0.16, 'sine', 0.1); }

  /* ---------------- état ---------------- */
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

  function refreshRefs() {
    if (!intro) return;
    letters = Array.from(intro.querySelectorAll('.letter'));
    dot = intro.querySelector('.dot');
    lamp = intro.querySelector('#introLamp');
    beam = intro.querySelector('#introBeam');
    skipBtn = intro.querySelector('#btnIntroSkip');
    loadingMsg = intro.querySelector('#introLoading');
  }

  /* Mesure les positions réelles des lettres après chargement des polices */
  function measureLetters() {
    refreshRefs();
    return letters.map((l, i) => {
      const b = l.getBoundingClientRect();
      return {
        el: l, i, ch: l.textContent,
        w: b.width || l.offsetWidth || 0,
        h: b.height || l.offsetHeight || 0,
        x: b.x || l.offsetLeft || 0,
        y: b.y || l.offsetTop || 0,
        right: (b.x || l.offsetLeft || 0) + (b.width || l.offsetWidth || 0),
      };
    });
  }

  /* Animation d'un saut (t in [0,1]) */
  function animateLampJump(t) {
    const h = 90;
    const y = -Math.sin(Math.PI * t) * h;
    const sq = t < 0.5 ? 1 + 0.2 * Math.sin(Math.PI * t) : 1 - 0.15 * Math.sin(Math.PI * (t - 0.5));
    const sx = t < 0.5 ? 1 - 0.12 * Math.sin(Math.PI * t) : 1 + 0.1 * Math.sin(Math.PI * (t - 0.5));
    return { y, sq, sx };
  }

  function runIntro(isShort) {
    if (introStarted) return;
    introStarted = true;
    resumeAudio();

    const T = isShort ? DURATION_SHORT : DURATION_FULL;
    const start = performance.now();
    let frameId = null;
    let landedAtT = false;

    /* Mesures DOM (recalculées si redimensionnement pendant l'intro) */
    let metric = measureLetters();
    const letterH = Math.max(...metric.map(m => m.h), 60);
    const lampH = letterH * 1.6;
    const lampW = lampH * 0.62;
    const wordRight = metric.length ? metric[metric.length - 1].right : window.innerWidth / 2;
    const wordLeft = metric.length ? metric[0].x : window.innerWidth / 2;
    const wordCenter = (wordLeft + wordRight) / 2;
    /* La lampe s'arrête à côté du T (index 4), pas sur les lettres voisines */
    const tEl = metric[4];
    const lampStopX = tEl ? tEl.right + lampW * 0.35 : wordCenter + lampW;

    /* Position initiale de la lampe : hors écran à droite */
    if (lamp && !isShort) {
      lamp.style.transform = `translate(${window.innerWidth + lampW}px, 0px) scale(1,1)`;
    }

    window.addEventListener('resize', () => { metric = measureLetters(); }, { passive: true });

    function frame(now) {
      if (introAborted) { cancelAnimationFrame(frameId); return; }
      const elapsed = now - start;
      const p = Math.min(1, elapsed / T);

      /* 0.40-1.10 : lettres apparaissent une par une */
      if (p >= 0.083 && !letters[0].classList.contains('on')) { letters[0].classList.add('appear', 'on'); sBoing(); }
      if (p >= 0.208 && !letters[1].classList.contains('on')) letters[1].classList.add('appear', 'on');
      if (p >= 0.333 && !letters[2].classList.contains('on')) letters[2].classList.add('appear', 'on');
      if (p >= 0.417 && !letters[3].classList.contains('on')) { letters[3].classList.add('appear', 'on'); sBoing(); }
      if (p >= 0.50 && !letters[4].classList.contains('on')) letters[4].classList.add('appear', 'on');
      if (p >= 0.583 && !letters[5].classList.contains('on')) letters[5].classList.add('appear', 'on');
      if (p >= 0.667 && !letters[6].classList.contains('on')) { letters[6].classList.add('appear', 'on'); sTing(); }

      /* 0.25-0.75 : lampe entre depuis la droite en 3 sauts jusqu'au T */
      if (p >= 0.25 && p <= 0.75 && lamp && !isShort) {
        const jumpP = (p - 0.25) / 0.5;
        const jumpIndex = Math.floor(jumpP * 3);
        const j = (jumpP * 3) % 1;
        const s = animateLampJump(j);
        /* position X : du bord droit vers lampStopX */
        const xFrom = window.innerWidth + lampW;
        const xTo = lampStopX;
        const x = xFrom + (xTo - xFrom) * jumpP;
        lamp.style.transform = `translate(${Math.round(x)}px, ${Math.round(s.y)}px) scale(${s.sx}, ${s.sq})`;
        lamp.style.zIndex = '25';
        if (beam) {
          beam.style.opacity = j > 0.35 && j < 0.75 ? 0.9 : 0;
          beam.style.transform = `translate(${Math.round(x)}px, ${Math.round(s.y + 45)}px) scale(${lampW / 170}, 1)`;
        }
        if (j < 0.05 && jumpIndex > 0) sLand();
      }

      /* 0.62-0.72 : lampe s'arrête devant le T, casque penche */
      if (p >= 0.62 && p < 0.72 && lamp && !isShort) {
        lamp.style.transform = `translate(${Math.round(lampStopX)}px, 0px) scale(1,1) rotate(${Math.sin((p - 0.62) / 0.10 * Math.PI) * 4}deg)`;
      }

      /* 0.72-0.80 : anticipation puis saut sur le T */
      if (p >= 0.72 && p < 0.80 && lamp && !isShort) {
        const ant = (p - 0.72) / 0.08;
        const scaleY = 1 - 0.25 * ant;
        const scaleX = 1 + 0.15 * ant;
        lamp.style.transform = `translate(${Math.round(lampStopX)}px, ${Math.round(10 * ant)}px) scale(${scaleX}, ${scaleY})`;
        if (ant > 0.8 && !landedAtT) { sBoing(); landedAtT = true; }
      }

      /* 0.80-0.86 : impact, T écrasé */
      if (p >= 0.80 && p < 0.86 && lamp && !isShort) {
        sSplat();
        const t4 = letters[4];
        if (t4) t4.classList.add('crush');
        lamp.style.transform = `translate(${Math.round(lampStopX)}px, 8px) scale(1.05, 0.85)`;
      }

      /* 0.86-1.0 : lumière, point allumé, fade */
      if (p >= 0.86 && dot) dot.classList.add('on');
      if (p >= 0.86 && beam) beam.style.opacity = Math.min(1, (p - 0.86) / 0.14) * 0.9;

      if (p >= 1) {
        finishIntro();
        return;
      }
      frameId = requestAnimationFrame(frame);
    }

    frameId = requestAnimationFrame(frame);

    /* sécurité : max wait puis forçage de l'affichage de l'app */
    setTimeout(() => {
      if (!introFinished) {
        if (loadingMsg) { loadingMsg.classList.add('show'); loadingMsg.textContent = 'Connexion lente, on y est presque…'; }
        setTimeout(() => finishIntro(true), 1500);
      }
    }, MAX_WAIT);

    /* skip */
    function skip() {
      introAborted = true;
      cancelAnimationFrame(frameId);
      finishIntro(true);
    }
    if (skipBtn) {
      setTimeout(() => skipBtn.classList.add('show'), 800);
      skipBtn.addEventListener('click', skip);
      skipBtn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') skip(); });
    }
    intro.addEventListener('click', skip);
    intro.addEventListener('keydown', (e) => { if (e.key === 'Escape') skip(); });
  }

  function finishIntro(skipped) {
    if (introFinished) return;
    introFinished = true;
    if (!skipped) markSeen();
    intro.classList.add('fade-out');
    setTimeout(() => {
      intro.classList.add('hidden');
      const app = document.getElementById('app');
      if (app) app.style.visibility = '';
      if (global.UI && typeof global.UI.hideLoader === 'function') global.UI.hideLoader();
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new Event('intro:done'));
      }
    }, 450);
  }

  function startIntro() {
    if (!intro) return;
    const isShort = alreadySeen();
    refreshRefs();
    intro.classList.remove('hidden');
    /* Cache le contenu de l'app pendant l'intro */
    const app = document.getElementById('app');
    if (app) app.style.visibility = 'hidden';
    if (isShort) {
      letters.forEach((l) => { l.classList.add('on'); l.style.opacity = 1; l.style.transform = 'none'; });
      if (dot) { dot.classList.add('on'); dot.style.opacity = 1; }
      if (lamp) lamp.style.transform = `translate(${lampStopX()}px, 0px) scale(1,1)`;
      if (beam) beam.style.opacity = 0.35;
      runIntro(true);
    } else {
      runIntro(false);
    }
  }
  function lampStopX() {
    const m = measureLetters();
    const t = m[4];
    return t ? t.right : window.innerWidth / 2;
  }

  /* exposition */
  global.IntroAnim = {
    start: startIntro,
    skip: finishIntro,
    isFinished: () => introFinished,
  };

  /* démarrage automatique une fois le DOM prêt (avant app.js) */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startIntro);
  } else {
    startIntro();
  }

})(window);
