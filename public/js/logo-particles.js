const LINE1 = 'CREATOR';
const LINE2 = 'CHALLENGE';
const LINE3 = 'EPITECH BÉNIN · 4 NIVEAUX';

export function initLogoParticles(canvas) {
  const ctx = canvas.getContext('2d');
  let cssW = 0;
  let cssH = 0;
  let dpr = 1;
  let particles = [];
  let gatherStart = 0;
  let palette = readPalette();
  const pointer = { x: -9999, y: -9999 };
  let resizeTimer = 0;

  function readPalette() {
    const cs = getComputedStyle(document.documentElement);
    const get = (name, fallback) => cs.getPropertyValue(name).trim() || fallback;
    return {
      mint: hexToRgb(get('--mint', '#00a878')),
      blue: hexToRgb(get('--blue', '#0033ff')),
      coral: hexToRgb(get('--coral', '#f05030')),
      yellow: hexToRgb(get('--yellow', '#ffc107')),
      ink: hexToRgb(get('--ink', '#10131c')),
      paper: hexToRgb(get('--paper', '#f7f3e8')),
    };
  }

  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const n = h.length === 3
      ? h.split('').map((c) => c + c).join('')
      : h.padEnd(6, '0').slice(0, 6);
    return {
      r: parseInt(n.slice(0, 2), 16),
      g: parseInt(n.slice(2, 4), 16),
      b: parseInt(n.slice(4, 6), 16),
    };
  }

  function mix(a, b, t) {
    const k = Math.max(0, Math.min(1, t));
    return {
      r: Math.round(a.r + (b.r - a.r) * k),
      g: Math.round(a.g + (b.g - a.g) * k),
      b: Math.round(a.b + (b.b - a.b) * k),
    };
  }

  function css({ r, g, b }) {
    return `rgb(${r}, ${g}, ${b})`;
  }

  function buildTargets() {
    if (cssW < 20 || cssH < 20) return;

    const off = document.createElement('canvas');
    off.width = Math.round(cssW);
    off.height = Math.round(cssH);
    const g = off.getContext('2d');
    if (!g) return;

    let size = Math.min(cssH * 0.3, cssW * 0.15);
    g.font = `700 ${size}px Georgia, "Times New Roman", serif`;
    const measured = g.measureText(LINE1).width;
    if (measured > cssW * 0.84) size *= (cssW * 0.84) / measured;

    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#fff';

    try {
      g.letterSpacing = `${Math.round(size * 0.03)}px`;
    } catch {
      /* canvas letterSpacing non supporté */
    }
    g.font = `700 ${size}px Georgia, "Times New Roman", serif`;
    g.fillText(LINE1, cssW / 2, cssH * 0.28);

    let size2 = Math.min(cssH * 0.2, cssW * 0.105);
    try {
      g.letterSpacing = `${Math.round(size2 * 0.04)}px`;
    } catch {
      /* ignore */
    }
    g.font = `900 ${size2}px "Arial Black", Impact, "Segoe UI", system-ui, sans-serif`;
    const measured2 = g.measureText(LINE2).width;
    if (measured2 > cssW * 0.84) {
      size2 *= (cssW * 0.84) / measured2;
      g.font = `900 ${size2}px "Arial Black", Impact, "Segoe UI", system-ui, sans-serif`;
    }
    g.fillText(LINE2, cssW / 2, cssH * 0.6);

    const size3 = Math.max(9, Math.min(cssH * 0.058, cssW * 0.026));
    try {
      g.letterSpacing = `${Math.round(size3 * 0.22)}px`;
    } catch {
      /* ignore */
    }
    g.font = `600 ${size3}px ui-monospace, "SFMono-Regular", Menlo, monospace`;
    g.fillText(LINE3, cssW / 2, cssH * 0.84);

    const data = g.getImageData(0, 0, off.width, off.height).data;
    const raw = [];
    const step = 2;
    const splitY1 = cssH * 0.45;
    const splitY2 = cssH * 0.73;

    for (let y = 0; y < off.height; y += step) {
      for (let x = 0; x < off.width; x += step) {
        const alpha = data[(y * off.width + x) * 4 + 3];
        if (alpha > 130) {
          raw.push({ x, y, line: y < splitY1 ? 0 : y < splitY2 ? 1 : 2 });
        }
      }
    }
    if (!raw.length) return;

    const max = cssW < 700 ? 1700 : 3200;
    const points = raw.length > max
      ? raw.filter(() => Math.random() < max / raw.length)
      : raw;

    const cx = cssW / 2;
    const cy = cssH / 2;
    const spread = Math.max(cssW, cssH);

    particles = points.map((pt) => {
      const t = pt.x / cssW;
      let color;
      if (pt.line === 0) {
        color = mix(palette.ink, palette.blue, t);
        if (Math.random() < 0.1) color = palette.coral;
      } else if (pt.line === 1) {
        color = mix(palette.coral, palette.ink, t);
        if (Math.random() < 0.07) color = palette.yellow;
      } else {
        color = mix(palette.mint, palette.blue, t);
        if (Math.random() < 0.2) color = palette.ink;
      }

      const angle = Math.random() * Math.PI * 2;
      const radius = spread * (0.25 + Math.random() * 0.72);

      return {
        tx: pt.x,
        ty: pt.y,
        sx: cx + Math.cos(angle) * radius,
        sy: cy + Math.sin(angle) * radius * 0.62,
        color: css(color),
        size: 1 + Math.random() * 1.5,
        alpha: 0.5 + Math.random() * 0.5,
        delay: Math.random() * 0.75,
        dur: 1.05 + Math.random() * 0.55,
        phase: Math.random() * Math.PI * 2,
        amp: 0.35 + Math.random() * 1.5,
        ox: 0,
        oy: 0,
      };
    });

    gatherStart = performance.now() / 1000;
  }

  function burst() {
    if (!particles.length) return;
    const spread = Math.max(cssW, cssH) * 0.22;
    for (const p of particles) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 30 + Math.random() * spread;
      p.sx = p.tx + Math.cos(angle) * distance;
      p.sy = p.ty + Math.sin(angle) * distance * 0.7;
      p.delay = Math.random() * 0.28;
      p.dur = 0.85 + Math.random() * 0.5;
      p.ox = 0;
      p.oy = 0;
    }
    gatherStart = performance.now() / 1000;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    if (w < 20 || h < 20) return;
    if (w === cssW && h === cssH) return;

    cssW = w;
    cssH = h;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    palette = readPalette();
    buildTargets();
  }

  function frame(now) {
    requestAnimationFrame(frame);

    if (canvas.offsetWidth === 0) return;
    if (Math.round(canvas.clientWidth) !== cssW || Math.round(canvas.clientHeight) !== cssH) {
      resize();
    }
    if (!particles.length) return;

    const t = now / 1000;
    ctx.clearRect(0, 0, cssW, cssH);

    const R = 74;
    const R2 = R * R;

    for (const p of particles) {
      const local = (t - gatherStart - p.delay) / p.dur;
      const k = local <= 0 ? 0 : local >= 1 ? 1 : 1 - Math.pow(1 - local, 3);
      const drift = k * k;
      const tx = p.tx + Math.sin(t * 0.9 + p.phase) * p.amp * drift;
      const ty = p.ty + Math.cos(t * 0.75 + p.phase * 1.3) * p.amp * drift;
      const x = p.sx + (tx - p.sx) * k;
      const y = p.sy + (ty - p.sy) * k;

      const dx = x - pointer.x;
      const dy = y - pointer.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < R2 && d2 > 0.01) {
        const d = Math.sqrt(d2);
        const force = (1 - d / R) * 5.5;
        p.ox += (dx / d) * force;
        p.oy += (dy / d) * force;
      }
      p.ox *= 0.87;
      p.oy *= 0.87;

      ctx.globalAlpha = p.alpha * (0.2 + 0.8 * k);
      ctx.fillStyle = p.color;
      const s = p.size * (0.65 + 0.55 * k);
      ctx.fillRect(x + p.ox, y + p.oy, s, s);
    }

    ctx.globalAlpha = 1;
  }

  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
  });
  canvas.addEventListener('pointerleave', () => {
    pointer.x = -9999;
    pointer.y = -9999;
  });
  canvas.addEventListener('pointerdown', () => burst());

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      palette = readPalette();
      buildTargets();
    });
  }

  resize();
  requestAnimationFrame(frame);

  return { burst, refresh: resize };
}
