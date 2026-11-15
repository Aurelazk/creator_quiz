/* =====================================================================
   js/avatar.js — personnages modulaires (aperçu SVG + données partagées)
   Le même objet de configuration pilote le SVG du téléphone et le modèle 3D.
   ===================================================================== */
(function (global) {
  'use strict';

  const PALETTES = {
    hair: ['#FF6B2C', '#2B1B12', '#F5C542', '#1B2A6B', '#E84A8A', '#F4F6FC', '#5AD86B', '#8B5CF6', '#B9B9C9'],
    jacket: ['#FF4E20', '#0B35FE', '#00E472', '#FF7A00', '#2E85FF', '#F4F6FC', '#111827', '#F5C542', '#E84A8A'],
    shirt: ['#FF4E20', '#0B35FE', '#00E472', '#FF7A00', '#2E85FF', '#F4F6FC', '#111827', '#F5C542', '#E84A8A'],
    pants: ['#0C1A4B', '#111827', '#3B4A6B', '#6B7280', '#F4F6FC', '#7A3E1D', '#1F2937'],
    shoes: ['#FF4E20', '#F4F6FC', '#0B35FE', '#111827', '#00E472', '#F5C542', '#E84A8A'],
    /* carnations : du clair au foncé, majoritairement peaux brunes à foncées */
    skin: ['#F1C27D', '#E0AC69', '#C68642', '#A16B3A', '#8D5524', '#7A4E28', '#5C3317', '#3E2723'],
  };

  const LABELS = {
    silhouette: { masc: 'Masculine', fem: 'Féminine', neutral: 'Neutre' },
    hair: { short: 'Courte', curly: 'Bouclée', afro: 'Afro', braids: 'Tresses', ponytail: 'Queue de cheval', bald: 'Chauve', cap: 'Casquette' },
    outfit: { jacket: 'Veste + tee', hoodie: 'Sweat à capuche', dress: 'Robe', tee: 'T-shirt' },
    accessory: { none: 'Aucun', glasses: 'Lunettes', headphones: 'Casque audio', beanie: 'Bonnet', backpack: 'Sac à dos' },
  };

  const ICONS = {
    silhouette: { masc: '♂', fem: '♀', neutral: '◉' },
    hair: { short: '▰', curly: '◌', afro: '●', braids: '≋', ponytail: '⌁', bald: '○', cap: '⌂' },
    outfit: { jacket: '◧', hoodie: '⌓', dress: '△', tee: '▣' },
    accessory: { none: '∅', glasses: '⌐', headphones: 'Ω', beanie: '⌒', backpack: '▤' },
  };

  /* Identifiants de dégradé uniques à chaque rendu : le même SVG peut être
     inséré plusieurs fois dans le DOM (scoreboard, lobby, aperçu), il ne faut
     jamais réutiliser un id sous peine de rendre les têtes invisibles. */
  let svgUid = 0;
  function nextUid() { return 'a' + (++svgUid); }

  const DEFAULTS = {
    silhouette: 'neutral',
    hair: 'short',
    outfit: 'jacket',
    accessory: 'none',
    colors: {
      hair: '#FF6B2C',
      jacket: '#0B35FE',
      shirt: '#FF4E20',
      pants: '#0C1A4B',
      shoes: '#FF4E20',
      skin: '#E0AC69',
    },
  };

  function clone(config) {
    return JSON.parse(JSON.stringify(config));
  }

  function random(existing) {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    let conf;
    let guard = 0;
    do {
      conf = {
        silhouette: pick(['masc', 'fem', 'neutral']),
        hair: pick(['short', 'curly', 'afro', 'braids', 'ponytail', 'bald', 'cap']),
        outfit: pick(['jacket', 'hoodie', 'dress', 'tee']),
        accessory: pick(['none', 'none', 'glasses', 'headphones', 'beanie', 'backpack']),
        colors: {
          hair: pick(PALETTES.hair),
          jacket: pick(PALETTES.jacket),
          shirt: pick(PALETTES.shirt),
          pants: pick(PALETTES.pants),
          shoes: pick(PALETTES.shoes),
          skin: pick(PALETTES.skin),
        },
      };
      guard++;
    } while (existing && sameKey(conf, existing) && guard < 30);
    return conf;
  }

  function sameKey(a, b) {
    if (!a || !b) return false;
    return a.silhouette === b.silhouette &&
      a.hair === b.hair &&
      a.outfit === b.outfit &&
      a.accessory === b.accessory &&
      a.colors.hair === b.colors.hair &&
      a.colors.jacket === b.colors.jacket &&
      a.colors.shirt === b.colors.shirt &&
      a.colors.pants === b.colors.pants &&
      a.colors.shoes === b.colors.shoes;
  }

  /* Génère un avatar visuellement distinct des configs deja prises :
     couleur dominante (veste) et coiffure differentes si possible. */
  function distinctFrom(existing) {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const takenJackets = new Set((existing || []).map((e) => e && e.colors && e.colors.jacket).filter(Boolean));
    const takenHairs = new Set((existing || []).map((e) => e && e.hair).filter(Boolean));
    let conf;
    let guard = 0;
    do {
      conf = {
        silhouette: pick(['masc', 'fem', 'neutral']),
        hair: pick(['short', 'curly', 'afro', 'braids', 'ponytail', 'bald', 'cap']),
        outfit: pick(['jacket', 'hoodie', 'dress', 'tee']),
        accessory: pick(['none', 'none', 'glasses', 'headphones', 'beanie', 'backpack']),
        colors: {
          hair: pick(PALETTES.hair),
          jacket: pick(PALETTES.jacket),
          shirt: pick(PALETTES.shirt),
          pants: pick(PALETTES.pants),
          shoes: pick(PALETTES.shoes),
          skin: pick(PALETTES.skin),
        },
      };
      guard++;
    } while ((takenJackets.has(conf.colors.jacket) || takenHairs.has(conf.hair)) && guard < 40);
    return conf;
  }

  function shade(hex, amount) {
    const m = /^#([0-9a-f]{6})$/i.exec(String(hex || ''));
    if (!m) return hex;
    const n = parseInt(m[1], 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.max(0, Math.min(255, Math.round(r + amount)));
    g = Math.max(0, Math.min(255, Math.round(g + amount)));
    b = Math.max(0, Math.min(255, Math.round(b + amount)));
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  function svg(config) {
    const c = config && config.colors ? config.colors : DEFAULTS.colors;
    const sil = config ? config.silhouette : DEFAULTS.silhouette;
    const hair = config ? config.hair : DEFAULTS.hair;
    const outfit = config ? config.outfit : DEFAULTS.outfit;
    const accessory = config ? config.accessory : DEFAULTS.accessory;

    const shoulder = sil === 'masc' ? 66 : sil === 'fem' ? 56 : 61;
    const waist = sil === 'masc' ? 54 : sil === 'fem' ? 46 : 50;
    const hip = sil === 'fem' ? 56 : sil === 'masc' ? 52 : 52;
    const legW = sil === 'masc' ? 17 : sil === 'fem' ? 14 : 15;
    const uid = nextUid();

    const parts = [];
    parts.push(`<defs>
      <radialGradient id="${uid}h" cx="38%" cy="28%" r="78%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="68%" stop-color="#f7f9ff"/>
        <stop offset="100%" stop-color="#dbe3f4"/>
      </radialGradient>
      <linearGradient id="${uid}sk" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${shade(c.shirt, 14)}"/>
        <stop offset="100%" stop-color="${shade(c.shirt, -14)}"/>
      </linearGradient>
    </defs>`);

    // Sac à dos (derrière)
    if (accessory === 'backpack') {
      parts.push(`<rect x="64" y="132" width="72" height="68" rx="20" fill="${shade(c.jacket, -34)}"/>`);
      parts.push(`<rect x="70" y="138" width="60" height="24" rx="10" fill="${shade(c.jacket, -18)}" opacity="0.8"/>`);
    }

    // Jambes
    const legY = 192, legH = 34;
    const legXs = [100 - hip / 2 + 4, 100 + hip / 2 - 4 - legW];
    parts.push(`<rect x="${legXs[0]}" y="${legY}" width="${legW}" height="${legH}" rx="8" fill="${c.pants}"/>`);
    parts.push(`<rect x="${legXs[1]}" y="${legY}" width="${legW}" height="${legH}" rx="8" fill="${shade(c.pants, -10)}"/>`);

    // Baskets
    const shoeY = legY + legH - 4;
    parts.push(`<path d="M${legXs[0] - 3} ${shoeY} q0 -8 10 -8 h${legW - 4} q6 0 6 8 v6 h-16 z" fill="${c.shoes}"/>`);
    parts.push(`<path d="M${legXs[1] - 3} ${shoeY} q0 -8 10 -8 h${legW - 4} q6 0 6 8 v6 h-16 z" fill="${shade(c.shoes, -8)}"/>`);
    parts.push(`<rect x="${legXs[0] - 4}" y="${shoeY + 5}" width="${legW + 14}" height="6" rx="3" fill="#F7F9FF"/>`);
    parts.push(`<rect x="${legXs[1] - 4}" y="${shoeY + 5}" width="${legW + 14}" height="6" rx="3" fill="#E8EDF8"/>`);

    // Bras
    const armTop = 138;
    const armLen = 58;
    const armW = sil === 'masc' ? 15 : 13;
    const leftX = 100 - shoulder / 2 - armW + 4;
    const rightX = 100 + shoulder / 2 - 4;
    const sleeveColor = outfit === 'tee' ? c.shirt : outfit === 'dress' ? c.jacket : c.jacket;
    parts.push(`<rect x="${leftX}" y="${armTop}" width="${armW}" height="${armLen}" rx="${armW / 2}" fill="${sleeveColor}" transform="rotate(7 ${leftX + armW / 2} ${armTop})"/>`);
    parts.push(`<rect x="${rightX}" y="${armTop}" width="${armW}" height="${armLen}" rx="${armW / 2}" fill="${shade(sleeveColor, -8)}" transform="rotate(-7 ${rightX + armW / 2} ${armTop})"/>`);
    // Gants
    parts.push(`<circle cx="${leftX + armW / 2 - 2}" cy="${armTop + armLen - 1}" r="${armW * 0.72}" fill="${c.skin}"/>`);
    parts.push(`<circle cx="${rightX + armW / 2 + 2}" cy="${armTop + armLen - 1}" r="${armW * 0.72}" fill="${c.skin}"/>`);

    // Corps
    const bodyTop = 128, bodyBottom = 196;
    const topW = shoulder, botW = waist;
    let bodyPath = `M${100 - topW / 2} ${bodyTop} q0 -10 10 -10 h${topW - 20} q10 0 10 10 v${bodyBottom - bodyTop - 6} q0 10 -12 10 h${-(topW - 24)} q-12 0 -12 -10 z`;
    parts.push(`<path d="${bodyPath}" fill="${outfit === 'tee' ? `url(#${uid}sk)` : c.shirt}"/>`);

    if (outfit === 'jacket') {
      // panneaux de veste ouverts
      const panelW = topW * 0.30;
      parts.push(`<path d="M${100 - topW / 2 + 4} ${bodyTop + 4} h${panelW} l8 26 v${bodyBottom - bodyTop - 30} h${-panelW - 4} q-8 0 -8 -9 v${-(bodyBottom - bodyTop - 22)} q0 -10 8 -10 z" fill="${c.jacket}"/>`);
      parts.push(`<path d="M${100 + topW / 2 - 4} ${bodyTop + 4} h${-panelW} l-8 26 v${bodyBottom - bodyTop - 30} h${panelW + 4} q8 0 8 -9 v${-(bodyBottom - bodyTop - 22)} q0 -10 -8 -10 z" fill="${shade(c.jacket, -12)}"/>`);
      // col en V
      parts.push(`<path d="M${100 - 15} ${bodyTop + 2} l15 26 l15 -26 q-8 -8 -15 -8 q-7 0 -15 8 z" fill="${shade(c.shirt, 18)}"/>`);
      // revers
      parts.push(`<path d="M${100 - 16} ${bodyTop + 2} l-8 28 l10 -4 z" fill="${shade(c.jacket, 16)}"/>`);
      parts.push(`<path d="M${100 + 16} ${bodyTop + 2} l8 28 l-10 -4 z" fill="${shade(c.jacket, 4)}"/>`);
    } else if (outfit === 'hoodie') {
      parts.push(`<path d="M${100 - topW / 2 + 6} ${bodyTop + 2} q${topW / 2 - 6} -26 ${topW - 12} 0 q-14 -12 -${topW - 28} 0 z" fill="${shade(c.jacket, -18)}"/>`);
      parts.push(`<path d="M${100 - 24} ${bodyTop + 56} h48 v26 h-48 z" rx="8" fill="${shade(c.jacket, -14)}" opacity="0.7"/>`);
      parts.push(`<path d="M${100 - 12} ${bodyTop + 6} v22 M${100 + 12} ${bodyTop + 6} v18" stroke="${shade(c.jacket, 28)}" stroke-width="3" fill="none" stroke-linecap="round"/>`);
    } else if (outfit === 'dress') {
      parts.push(`<path d="M${100 - waist / 2} 182 h${waist} l${hip / 2 - waist / 2 + 12} 34 q2 6 -6 6 h-${waist + 12} q-8 0 -6 -6 z" fill="${c.jacket}"/>`);
      parts.push(`<path d="M${100 - 15} ${bodyTop + 2} l15 24 l15 -24 q-8 -7 -15 -7 q-7 0 -15 7 z" fill="${shade(c.shirt, 10)}"/>`);
    } else {
      parts.push(`<rect x="${100 - 22}" y="${bodyBottom - 12}" width="44" height="9" rx="4" fill="${shade(c.shirt, -22)}" opacity="0.55"/>`);
    }

    // Cou
    parts.push(`<rect x="90" y="112" width="20" height="20" rx="8" fill="${c.skin}"/>`);

    // Tête
    parts.push(`<circle cx="100" cy="76" r="47" fill="${c.skin}"/>`);

    // Cheveux
    const hc = c.hair;
    if (hair === 'short') {
      parts.push(`<path d="M53 74 q-2 -42 47 -44 q49 2 47 44 q-4 -26 -22 -28 q-12 8 -25 8 q-13 0 -25 -8 q-18 2 -22 28 z" fill="${hc}"/>`);
    } else if (hair === 'curly') {
      parts.push(`<path d="M53 76 q-4 -46 47 -46 q51 0 47 46 q-6 -24 -22 -28 q-12 8 -25 8 q-13 0 -25 -8 q-16 4 -22 28 z" fill="${hc}"/>`);
      const curls = [[58, 58], [70, 42], [86, 34], [100, 31], [114, 34], [130, 42], [142, 58], [62, 76], [138, 76]];
      curls.forEach(([x, y], i) => parts.push(`<circle cx="${x}" cy="${y}" r="${i < 7 ? 11 : 8}" fill="${i % 2 ? shade(hc, -10) : hc}"/>`));
    } else if (hair === 'afro') {
      parts.push(`<circle cx="100" cy="56" r="52" fill="${hc}"/>`);
      parts.push(`<circle cx="62" cy="54" r="17" fill="${shade(hc, -6)}"/><circle cx="138" cy="54" r="17" fill="${shade(hc, -6)}"/>`);
      parts.push(`<circle cx="80" cy="30" r="15" fill="${shade(hc, 8)}"/><circle cx="120" cy="30" r="15" fill="${shade(hc, 8)}"/>`);
      parts.push(`<circle cx="100" cy="76" r="47" fill="url(#${uid}h)"/>`);
      parts.push(`<path d="M55 66 q8 -32 45 -34 q37 2 45 34 q-10 -18 -45 -20 q-35 2 -45 20 z" fill="${hc}"/>`);
    } else if (hair === 'braids') {
      parts.push(`<path d="M54 74 q-2 -44 46 -46 q48 2 46 46 q-6 -26 -23 -30 q-11 8 -23 8 q-12 0 -23 -8 q-17 4 -23 30 z" fill="${hc}"/>`);
      parts.push(`<rect x="54" y="72" width="12" height="62" rx="6" fill="${hc}"/><rect x="134" y="72" width="12" height="62" rx="6" fill="${shade(hc, -8)}"/>`);
      parts.push(`<circle cx="60" cy="136" r="6" fill="${shade(hc, 30)}"/><circle cx="140" cy="136" r="6" fill="${shade(hc, 30)}"/>`);
    } else if (hair === 'ponytail') {
      parts.push(`<path d="M54 74 q-2 -44 46 -46 q48 2 46 46 q-6 -26 -23 -30 q-11 8 -23 8 q-12 0 -23 -8 q-17 4 -23 30 z" fill="${hc}"/>`);
      parts.push(`<circle cx="151" cy="62" r="19" fill="${shade(hc, -6)}"/>`);
      parts.push(`<path d="M148 76 q14 24 8 52 q-12 -8 -16 -22 q-5 -16 8 -30 z" fill="${hc}"/>`);
      parts.push(`<circle cx="146" cy="66" r="7" fill="${shade(hc, 32)}"/>`);
    } else if (hair === 'cap') {
      parts.push(`<path d="M55 66 q0 -40 45 -40 q45 0 45 40 z" fill="${hc}"/>`);
      parts.push(`<path d="M55 64 q-14 0 -20 12 q24 8 48 0 q-12 -6 -28 -12 z" fill="${shade(hc, -16)}"/>`);
      parts.push(`<rect x="95" y="26" width="10" height="6" rx="3" fill="${shade(hc, 30)}"/>`);
    } else {
      // chauve : petit reflet
      parts.push(`<ellipse cx="82" cy="46" rx="11" ry="6" fill="#ffffff" opacity="0.5" transform="rotate(-24 82 46)"/>`);
    }

    // Accessoires
    if (accessory === 'glasses') {
      parts.push(`<g fill="none" stroke="#10152b" stroke-width="4">
        <rect x="61" y="66" width="32" height="24" rx="10"/>
        <rect x="107" y="66" width="32" height="24" rx="10"/>
        <path d="M93 78 h14"/><path d="M61 76 l-10 -4"/><path d="M139 76 l10 -4"/>
      </g>`);
      parts.push(`<rect x="64" y="69" width="26" height="18" rx="8" fill="#8fc6ff" opacity="0.25"/>`);
      parts.push(`<rect x="110" y="69" width="26" height="18" rx="8" fill="#8fc6ff" opacity="0.25"/>`);
    } else if (accessory === 'headphones') {
      parts.push(`<path d="M55 68 q0 -46 45 -46 q45 0 45 46" fill="none" stroke="#10152b" stroke-width="9" stroke-linecap="round"/>`);
      parts.push(`<rect x="47" y="64" width="17" height="32" rx="8" fill="#20263f"/><rect x="136" y="64" width="17" height="32" rx="8" fill="#20263f"/>`);
      parts.push(`<rect x="50" y="70" width="11" height="20" rx="5" fill="${c.jacket}"/><rect x="139" y="70" width="11" height="20" rx="5" fill="${c.jacket}"/>`);
    } else if (accessory === 'beanie') {
      parts.push(`<path d="M54 65 q2 -40 46 -40 q44 0 46 40 z" fill="${c.jacket}"/>`);
      parts.push(`<rect x="52" y="58" width="96" height="17" rx="8" fill="${shade(c.jacket, -18)}"/>`);
      parts.push(`<circle cx="100" cy="20" r="9" fill="${shade(c.jacket, 30)}"/>`);
    }

    return `<svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Personnage ${sil}">${parts.join('')}</svg>`;
  }

  global.Avatar = {
    PALETTES, LABELS, ICONS, DEFAULTS,
    clone, random, sameKey, distinctFrom, svg, shade,
  };
})(window);
