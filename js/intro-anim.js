/* =====================================================================
   js/intro-anim.js — intro animée CREATOR (remplace le loader statique)
   Lampe originale aux couleurs CREATOR, écrase le T de CREATOR.
   < 30 Ko, pas de Three.js, WebAudio pour les sons, sessionStorage.
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
    if (audioReady || !ctx) return;
    const AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC(); } catch (e) { ctx = null; }
    audioReady = true;
  }
  function resumeAudio() {
    initAudio();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }
  function tone(freq, dur, type, gain, delay, slideTo) {
    if (!audioReady || !ctx || global.UI && global.UI.Sound && global.UI.Sound.muted) return;
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
  const letters = Array.from(intro ? intro.querySelectorAll('.letter') : []);
  const dot = intro ? intro.querySelector('.dot') : null;
  const lamp = intro ? intro.querySelector('#introLamp') : null;
  const beam = intro ? intro.querySelector('#introBeam') : null;
  const skipBtn = intro ? intro.querySelector('#btnIntroSkip') : null;
  const loadingMsg = intro ? intro.querySelector('#introLoading') : null;

  /* positions cibles des lettres (index : cible X approximative en % du mot) */
  /* animation : on joue la séquence complète */
  function playLetterIn(i) {
    const l = letters[i];
    if (!l) return;
    l.classList.add('appear', 'on');
    switch (i) {
      case 0: sBoing(); break;
      case 3: sBoing(); break;
      case 6: sTing(); break;
    }
  }

  /* sauts de la lampe : translateY + scale (squash/stretch) + rotation du bras */
  function animateLampJump(t) {
    /* t dans [0,1] pour un saut */
    const h = 120; /* hauteur du saut en px (relative) */
    const y = -Math.sin(Math.PI * t) * h;
    const sq = t < 0.5 ? 1 + 0.18 * Math.sin(Math.PI * t) : 1 - 0.12 * Math.sin(Math.PI * (t - 0.5));
    const sx = t < 0.5 ? 1 - 0.1 * Math.sin(Math.PI * t) : 1 + 0.08 * Math.sin(Math.PI * (t - 0.5));
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

    function frame(now) {
      if (introAborted) { cancelAnimationFrame(frameId); return; }
      const elapsed = now - start;
      const p = Math.min(1, elapsed / T);

      /* 0.00-0.40 : lueur, rien */
      /* 0.40-1.10 : lettres apparaissent une par une */
      if (p >= 0.083 && !letters[0].classList.contains('on')) playLetterIn(0);
      if (p >= 0.208 && !letters[1].classList.contains('on')) playLetterIn(1);
      if (p >= 0.333 && !letters[2].classList.contains('on')) playLetterIn(2);
      if (p >= 0.417 && !letters[3].classList.contains('on')) playLetterIn(3);
      if (p >= 0.50 && !letters[4].classList.contains('on')) playLetterIn(4);
      if (p >= 0.583 && !letters[5].classList.contains('on')) playLetterIn(5);
      if (p >= 0.667 && !letters[6].classList.contains('on')) { playLetterIn(6); }

      /* 0.40-1.10 : lampe entre en sautant depuis la droite (3 sauts) */
      if (p >= 0.25 && p <= 0.75 && lamp && !isShort) {
        const jumpP = (p - 0.25) / 0.5; /* 0..1 sur 3 sauts */
        const jumpIndex = Math.floor(jumpP * 3);
        const j = (jumpP * 3) % 1;
        const s = animateLampJump(j);
        lamp.style.transform = `translate(${120 - jumpIndex * 110}px, ${s.y}px) scale(${s.sx}, ${s.sq})`;
        if (beam) {
          beam.style.opacity = j > 0.35 && j < 0.75 ? 0.9 : 0;
          beam.style.transform = `translate(${120 - jumpIndex * 110}px, ${s.y + 40}px)`;
        }
        if (j < 0.05 && jumpIndex > 0) sLand();
      }

      /* 0.667-0.75 : lampe s'arrête devant le T, hésite (casque penche) */
      if (p >= 0.667 && p < 0.75 && lamp && !isShort) {
        lamp.style.transform = `translate(0px, 0px) scale(1,1) rotate(${Math.sin((p-0.667)/0.083*Math.PI)*4}deg)`;
      }

      /* 0.75-0.875 : anticipation (accroupit) puis saute sur le T */
      if (p >= 0.75 && p < 0.875 && lamp && !isShort) {
        const ant = (p - 0.75) / 0.125;
        const scaleY = 1 - 0.25 * ant; /* s'accroupit */
        const scaleX = 1 + 0.15 * ant;
        lamp.style.transform = `translate(0px, ${10 * ant}px) scale(${scaleX}, ${scaleY})`;
        if (ant > 0.8 && !landedAtT) { sBoing(); landedAtT = true; }
      }

      /* 0.875-0.938 : impact, T écrasé */
      if (p >= 0.875 && p < 0.938 && lamp && !isShort) {
        sSplat();
        const t4 = letters[4];
        if (t4) t4.style.animation = 'none';
        t4 && t4.classList.add('crush');
        lamp.style.transform = `translate(0px, 8px) scale(1.05, 0.85)`;
      }

      /* 0.938-1.0 : lumière, point allumé, fade */
      if (p >= 0.938 && dot) dot.classList.add('on');
      if (p >= 0.938 && beam) beam.style.opacity = Math.min(1, (p - 0.938) / 0.062) * 0.9;

      if (p >= 1) {
        finishIntro();
        return;
      }
      frameId = requestAnimationFrame(frame);
    }

    frameId = requestAnimationFrame((now) => frame(now));

    /* sécurité : max wait puis forçage de l'affichage de l'app */
    setTimeout(() => {
      if (!introFinished) {
        if (loadingMsg) loadingMsg.classList.add('show');
        loadingMsg && (loadingMsg.textContent = 'Connexion lente, on y est presque…');
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
      if (global.UI && typeof global.UI.hideLoader === 'function') global.UI.hideLoader();
    }, 450);
  }

  /* ---------------- lancement ---------------- */
  function startIntro() {
    if (!intro) return;
    const isShort = alreadySeen();
    intro.classList.remove('hidden');
    if (isShort) {
      /* version courte : lampe + mot déjà allumé, fondu rapide */
      letters.forEach((l) => { l.classList.add('on'); l.style.opacity = 1; l.style.transform = 'none'; });
      if (dot) { dot.classList.add('on'); dot.style.opacity = 1; }
      if (lamp) lamp.style.transform = 'translate(0,0) scale(1,1)';
      if (beam) beam.style.opacity = 0.35;
      runIntro(true);
    } else {
      runIntro(false);
    }
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
