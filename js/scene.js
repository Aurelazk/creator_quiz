/* =====================================================================
   js/scene.js — plateau 3D procédural (Three.js r128)
   - Un seul modèle de personnage de base, assemblé à partir de pièces
   - Variantes : silhouette, coiffure, tenue, accessoire, couleurs
   - Foule, gradins, écran de scène, trophées, animations
   Aucune dépendance à un GLB : tout est généré, léger et fluide.
   ===================================================================== */
(function (global) {
  'use strict';

  const S = {
    ready: false,
    renderer: null,
    scene: null,
    camera: null,
    clock: null,
    canvas: null,
    players: new Map(),
    crowd: [],
    crowdCheer: 0,
    crowdInst: null,
    crowdData: [],
    crowdDummy: null,
    t: 0,
    stageScreen: null,
    screenCtx: null,
    screenTex: null,
    count: 0,
    lastTime: 0,
    question: '',
    round: 0,
    total: 10,
    multiplier: 1,
    reduceMotion: false,
    lobbyMode: false,
  };

  const GEO = {};
  const MATS = new Map();

  function initGeo() {
    if (GEO.sphere) return;
    GEO.sphere = new THREE.SphereGeometry(1, 24, 18);
    GEO.sphereLow = new THREE.SphereGeometry(1, 12, 9);
    GEO.hemi = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    GEO.hemiLow = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    GEO.cyl = new THREE.CylinderGeometry(1, 1, 1, 16);
    GEO.cylLow = new THREE.CylinderGeometry(1, 1, 1, 8);
    GEO.cone = new THREE.ConeGeometry(1, 1, 16);
    GEO.box = new THREE.BoxGeometry(1, 1, 1);
    GEO.torus = new THREE.TorusGeometry(1, 0.05, 8, 36);
    GEO.ring = new THREE.RingGeometry(0.78, 1, 40);
    GEO.circle = new THREE.CircleGeometry(1, 48);
  }

  function mat(color, opts) {
    const o = opts || {};
    const key = color + '|' + (o.opacity || 1) + '|' + (o.emissive || '');
    if (MATS.has(key)) return MATS.get(key);
    const m = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: o.opacity != null && o.opacity < 1,
      opacity: o.opacity != null ? o.opacity : 1,
    });
    MATS.set(key, m);
    return m;
  }

  function mesh(geo, material, x, y, z, sx, sy, sz) {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x || 0, y || 0, z || 0);
    if (sx != null) m.scale.set(sx, sy == null ? sx : sy, sz == null ? sx : sz);
    return m;
  }

  /* ------------------------------------------------------------------ */
  /* Initialisation                                                     */
  /* ------------------------------------------------------------------ */
  function init(canvas) {
    if (S.ready) return true;
    if (!global.THREE || !canvas) return false;
    initGeo();
    S.canvas = canvas;
    S.reduceMotion = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false });
    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 1.6));
    renderer.setSize(global.innerWidth, global.innerHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    S.renderer = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#050b26');
    scene.fog = new THREE.Fog('#050b26', 22, 46);
    S.scene = scene;

    const camera = new THREE.PerspectiveCamera(43, global.innerWidth / global.innerHeight, 0.1, 120);
    camera.position.set(0, 4.9, 13.2);
    camera.lookAt(0, 2.8, 0.6);
    S.camera = camera;

    const hemi = new THREE.HemisphereLight(0xdce8ff, 0x101c44, 0.95);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.05);
    key.position.set(-7, 12, 9);
    key.castShadow = true;
    key.shadow.mapSize.width = 1024;
    key.shadow.mapSize.height = 1024;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 40;
    key.shadow.bias = -0.0005;
    scene.add(key);

    /* fill lumiere froide opposee, adoucit les ombres (eclaire aussi le public) */
    const fill = new THREE.DirectionalLight(0x2e85ff, 0.55);
    fill.position.set(6, 4, -8);
    scene.add(fill);

    const rim = new THREE.DirectionalLight('#2E85FF', 0.9);
    rim.position.set(7, 6, -8);
    scene.add(rim);

    /* douce lumiere chaude sur le public pour qu'il ne soit pas noir */
    const crowdLight = new THREE.PointLight('#FFFFFF', 0.8, 60);
    crowdLight.position.set(0, 5, -9);
    scene.add(crowdLight);

    const spot = new THREE.SpotLight(0xffffff, 1.8, 34, 0.6, 0.55, 1);
    spot.position.set(0, 13, 7);
    spot.target.position.set(0, 1, 1);
    spot.castShadow = true;
    scene.add(spot, spot.target);
    S.spot = spot;

    buildStage(scene);
    buildTribune(scene);
    buildCrowd(scene);
    buildScreen(scene);
    buildTrophies(scene);

    S.clock = new THREE.Clock();
    S.ready = true;
    global.addEventListener('resize', resize);
    animate();
    return true;
  }

  function resize() {
    if (!S.renderer) return;
    S.renderer.setSize(global.innerWidth, global.innerHeight, false);
    S.camera.aspect = global.innerWidth / global.innerHeight;
    S.camera.updateProjectionMatrix();
  }

  function buildStage(scene) {
    // sol circulaire
    const floor = mesh(GEO.circle, mat('#0a1840', { rough: 0.42, metal: 0.3 }), 0, 0, 0, 9.5, 1, 9.5);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const inner = mesh(GEO.circle, mat('#0d2358', { rough: 0.5, metal: 0.2 }), 0, 0.01, 1.2, 6.8, 1, 6.8);
    inner.rotation.x = -Math.PI / 2;
    scene.add(inner);

    // anneaux lumineux
    const ringMat = new THREE.MeshBasicMaterial({ color: '#2E85FF', transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    const r1 = mesh(GEO.ring, ringMat, 0, 0.03, 1.1, 9.2, 1, 9.2);
    r1.rotation.x = -Math.PI / 2;
    scene.add(r1);
    const r2 = mesh(GEO.ring, new THREE.MeshBasicMaterial({ color: '#00E472', transparent: true, opacity: 0.32, side: THREE.DoubleSide }), 0, 0.035, 1.1, 7.6, 1, 7.6);
    r2.rotation.x = -Math.PI / 2;
    scene.add(r2);
    S.rings = [r1, r2];

    // devant + marches
    for (let i = 0; i < 3; i++) {
      const step = mesh(GEO.box, mat('#101d49', { rough: 0.7 }), 0, 0.06 + i * 0.05, 4.7 + i * 0.5, 14 - i * 1.2, 0.12, 0.5);
      scene.add(step);
    }

    // piliers latéraux
    const pillarMat = mat('#0d1f50', { rough: 0.5, metal: 0.2 });
    [-8.6, 8.6].forEach((x) => {
      const pillar = mesh(GEO.cyl, pillarMat, x, 3.4, -2.8, 0.34, 6.8, 0.34);
      scene.add(pillar);
      const glow = mesh(GEO.cyl, new THREE.MeshBasicMaterial({ color: '#2E85FF', transparent: true, opacity: 0.35 }), x, 3.4, -2.8, 0.18, 6.2, 0.18);
      scene.add(glow);
    });

    // cônes de projecteurs
    const coneMat = new THREE.MeshBasicMaterial({ color: '#2E85FF', transparent: true, opacity: 0.055, side: THREE.DoubleSide, depthWrite: false });
    [[-4, 1], [4, 1], [0, -0.5]].forEach(([x, z], i) => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(2.4, 10, 20, 1, true), coneMat);
      cone.position.set(x, 6.2, z + 1);
      cone.rotation.x = Math.PI;
      scene.add(cone);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Tribune unique : une seule structure avec pente réelle, sièges,
     nez de marche, escaliers latéraux et mur LED au fond               */
  /* ------------------------------------------------------------------ */
  function buildTribune(scene) {
    const ROWS = 6;
    const treadDepth = 0.95;      /* profondeur d'une marche */
    const rise = 0.5;             /* hauteur d'une rangée (≥ 0.45 pour voir par-dessus) */
    const seatH = 0.42;
    const width = 17;
    const startZ = -7.0;
    const startY = 0.3;

    const standMat = mat('#0d1a44', { rough: 0.8 });
    const edgeMat = mat('#16295f', { rough: 0.5, metal: 0.25 });
    const seatMat = mat('#101f4f', { rough: 0.7, metal: 0.15 });

    /* contre-marches et nez de marche de chaque rangée */
    for (let r = 0; r < ROWS; r++) {
      const y = startY + r * rise;
      const z = startZ - r * treadDepth;
      const riser = mesh(GEO.box, standMat, 0, y - seatH / 2 - 0.16, z + treadDepth / 2, width, seatH + 0.16, 0.14);
      scene.add(riser);
      const nosing = mesh(GEO.box, edgeMat, 0, y - seatH / 2 + 0.02, z + treadDepth - 0.06, width, 0.07, 0.16);
      scene.add(nosing);
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.9, 0.03, 0.06),
        new THREE.MeshBasicMaterial({ color: r % 2 ? '#FF4E20' : '#2E85FF', transparent: true, opacity: 0.5 })
      );
      strip.position.set(0, y - seatH / 2 + 0.04, z + treadDepth - 0.04);
      scene.add(strip);
    }

    /* sièges : assises + dossiers instanciés */
    const seatPerRow = 14;
    const seatW = 0.62;
    const seatGap = 0.08;
    const totalCount = ROWS * seatPerRow;
    const seatGeo = new THREE.BoxGeometry(seatW, 0.1, 0.5);
    const backGeo = new THREE.BoxGeometry(seatW * 0.9, 0.45, 0.12);
    const seats = new THREE.InstancedMesh(seatGeo, seatMat, totalCount);
    const backs = new THREE.InstancedMesh(backGeo, seatMat, totalCount);
    seats.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    backs.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    const dummy = new THREE.Object3D();
    let k = 0;
    for (let r = 0; r < ROWS; r++) {
      const y = startY + r * rise;
      const z = startZ - r * treadDepth;
      for (let s = 0; s < seatPerRow; s++) {
        const x = (s - (seatPerRow - 1) / 2) * (seatW + seatGap);
        dummy.position.set(x, y - seatH / 2 + 0.05, z + treadDepth - 0.42);
        dummy.updateMatrix();
        seats.setMatrixAt(k, dummy.matrix);
        dummy.position.set(x, y - seatH / 2 + 0.05 + 0.28, z + treadDepth - 0.42 - 0.22);
        dummy.updateMatrix();
        backs.setMatrixAt(k, dummy.matrix);
        k++;
      }
    }
    seats.instanceMatrix.needsUpdate = true;
    backs.instanceMatrix.needsUpdate = true;
    scene.add(seats, backs);

    /* escaliers latéraux + rampes lumineuses */
    const stairMat = mat('#0a1230', { rough: 0.75 });
    [-1, 1].forEach((side) => {
      for (let r = 0; r < ROWS; r++) {
        const y = startY + r * rise - seatH;
        const z = startZ - r * treadDepth - 0.05;
        const step = mesh(GEO.box, stairMat, side * (width / 2 + 0.6), y + 0.2, z, 1.1, 0.3, 0.95);
        scene.add(step);
      }
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, ROWS * rise + 1, 0.06),
        new THREE.MeshBasicMaterial({ color: '#2E85FF', transparent: true, opacity: 0.5 })
      );
      rail.position.set(side * (width / 2 + 1.0), startY + (ROWS * rise) / 2, startZ - ROWS * treadDepth - 0.5);
      scene.add(rail);
    });

    /* mur LED du fond derrière le public : remplace le grand vide noir */
    const ledCanvas = document.createElement('canvas');
    ledCanvas.width = 512; ledCanvas.height = 256;
    const ledCtx = ledCanvas.getContext('2d');
    const ledTex = new THREE.CanvasTexture(ledCanvas);
    if (THREE.sRGBEncoding) ledTex.encoding = THREE.sRGBEncoding;
    ledCtx.fillStyle = '#061033'; ledCtx.fillRect(0, 0, 512, 256);
    ledCtx.fillStyle = '#00E472'; ledCtx.font = 'bold 42px Famous College, sans-serif'; ledCtx.textAlign = 'center';
    ledCtx.fillText('CREATOR.', 256, 128);
    ledCtx.fillStyle = '#2E85FF'; ledCtx.font = '18px Famous College, sans-serif';
    ledCtx.fillText('GUESS THEIR ANSWER', 256, 166);
    for (let i = 0; i < 6; i++) {
      ledCtx.fillStyle = i % 2 ? '#2E85FF' : '#00E472';
      ledCtx.fillRect(i * 90, 212, 72, 6);
    }
    ledTex.needsUpdate = true;
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(18, 8), new THREE.MeshBasicMaterial({ map: ledTex }));
    wall.position.set(0, 3.5, -15);
    scene.add(wall);
    S.ledWall = { tex: ledTex, ctx: ledCtx, canvas: ledCanvas };
    S.tribune = { ROWS, treadDepth, rise, startZ, startY, seatPerRow, seatW, seatGap, width };
  }

  function buildScreen(scene) {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 320;
    const tex = new THREE.CanvasTexture(c);
    if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
    S.screenCtx = c.getContext('2d');
    S.screenTex = tex;
    drawScreen();
    /* bandeau supérieur (marquee) : assez fin pour ne pas masquer le public derrière */
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(14.5, 2.6),
      new THREE.MeshBasicMaterial({ map: tex })
    );
    plane.position.set(0, 8.6, -6.4);
    scene.add(plane);
    S.stageScreen = plane;

    // cadre lumineux autour du bandeau
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(15.2, 3.3, 0.25),
      mat('#0a1230', { rough: 0.6, metal: 0.3 })
    );
    frame.position.set(0, 8.6, -6.55);
    scene.add(frame);
    const glow = new THREE.Mesh(
      new THREE.BoxGeometry(15.5, 0.08, 0.3),
      new THREE.MeshBasicMaterial({ color: '#00E472', transparent: true, opacity: 0.8 })
    );
    glow.position.set(0, 10.0, -6.4);
    scene.add(glow);
  }

  function drawScreen() {
    const ctx = S.screenCtx;
    if (!ctx) return;
    const W = 1024, H = 320;
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#0b1f5c');
    g.addColorStop(0.5, '#0C1A4B');
    g.addColorStop(1, '#061033');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // liserés LED verticaux
    ctx.save();
    ctx.globalAlpha = 0.15;
    for (let i = 0; i < 12; i++) {
      const x = (i / 11) * W;
      ctx.fillStyle = i % 2 ? '#2E85FF' : '#00E472';
      ctx.fillRect(x - 2, 0, 4, H);
    }
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '700 52px "Famous College", system-ui, sans-serif';
    ctx.fillText('CREATOR.', W / 2, H / 2 + 14);
    ctx.fillStyle = 'rgba(46,133,255,0.7)';
    ctx.font = '700 18px "Famous College", system-ui, sans-serif';
    ctx.fillText('GUESS THEIR ANSWER', W / 2, H / 2 + 42);

    /* le texte de manche et la question sont affichés par l'UI hôte (pas de doublon 3D) */
    if (S.screenTex) S.screenTex.needsUpdate = true;
  }

  function buildTrophies(scene) {
    const gold = mat('#FFCF5A', { rough: 0.22, metal: 0.92 });
    const goldDark = mat('#B8860B', { rough: 0.3, metal: 0.8 });
    const pedestal = mat('#111c42', { rough: 0.5, metal: 0.25 });
    [-6.4, 6.4].forEach((x, idx) => {
      const base = mesh(GEO.cyl, pedestal, x, 0.42, -0.2, 0.62, 0.84, 0.62);
      scene.add(base);
      const plate = mesh(GEO.cyl, goldDark, x, 0.9, -0.2, 0.46, 0.08, 0.46);
      scene.add(plate);
      const stem = mesh(GEO.cyl, gold, x, 1.18, -0.2, 0.12, 0.5, 0.12);
      scene.add(stem);
      const cup = mesh(GEO.sphere, gold, x, 1.58, -0.2, 0.36, 0.4, 0.36);
      scene.add(cup);
      const rim = mesh(GEO.torus, gold, x, 1.82, -0.2, 0.36, 0.36, 0.36);
      rim.rotation.x = Math.PI / 2;
      scene.add(rim);
      [-1, 1].forEach((side) => {
        const handle = mesh(GEO.torus, gold, x + side * 0.38, 1.62, -0.2, 0.18, 0.22, 0.18);
        handle.rotation.y = Math.PI / 2;
        scene.add(handle);
      });
      const star = mesh(GEO.sphere, mat('#FFF2B8', { rough: 0.2, metal: 0.6, emissive: '#FFCF5A', emissiveIntensity: 0.45 }), x, 2.02, -0.2, 0.1);
      scene.add(star);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Personnages                                                        */
  /* ------------------------------------------------------------------ */
  function addPart(parent, geo, material, x, y, z, sx, sy, sz) {
    const m = mesh(geo, material, x, y, z, sx, sy, sz);
    parent.add(m);
    return m;
  }

  function createCharacter(config, opts) {
    const o = opts || {};
    const low = !!o.low;
    const c = config && config.colors ? config.colors : {
      hair: '#FF6B2C', jacket: '#0B35FE', shirt: '#FF4E20', pants: '#0C1A4B', shoes: '#FF4E20',
    };
    const sil = (config && config.silhouette) || 'neutral';
    const hair = (config && config.hair) || 'short';
    const outfit = (config && config.outfit) || 'jacket';
    const accessory = (config && config.accessory) || 'none';

    const sphere = low ? GEO.sphereLow : GEO.sphere;
    const hemi = low ? GEO.hemiLow : GEO.hemi;
    const cyl = low ? GEO.cylLow : GEO.cyl;

    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);

    const white = mat('#F7F9FF', { rough: 0.28 });
    const headMat = mat(c.skin || '#E0AC69', { rough: 0.28, metal: 0.02 });
    const eyeMat = mat('#FFFFFF', { rough: 0.15, metal: 0.02 });
    const irisMat = mat('#3B4A6B', { rough: 0.4, metal: 0.02 });
    const mouthMat = mat('#5C2E22', { rough: 0.6, metal: 0.0 });
    const jacketMat = mat(c.jacket, { rough: 0.4 });
    const shirtMat = mat(c.shirt, { rough: 0.42 });
    const pantsMat = mat(c.pants, { rough: 0.55 });
    const shoeMat = mat(c.shoes, { rough: 0.4 });
    const hairMat = mat(c.hair, { rough: 0.5 });
    const soleMat = mat('#F7F9FF', { rough: 0.6 });

    const shoulderW = sil === 'masc' ? 0.86 : sil === 'fem' ? 0.72 : 0.8;
    const hipW = sil === 'fem' ? 0.7 : sil === 'masc' ? 0.62 : 0.66;

    // ---- jambes ----
    const legY = 0.52;
    const legH = 0.62;
    const legX = hipW / 2 - 0.14;
    const legGeo = cyl;
    const legL = addPart(body, legGeo, pantsMat, -legX, legY, 0, 0.115, legH, 0.115);
    const legR = addPart(body, legGeo, pantsMat, legX, legY, 0, 0.115, legH, 0.115);
    legL.name = 'legL'; legR.name = 'legR';

    // ---- chaussures ----
    const shoeY = 0.17;
    [-legX, legX].forEach((x, i) => {
      const shoe = addPart(body, sphere, shoeMat, x, shoeY, 0.04, 0.17, 0.13, 0.23);
      shoe.scale.z = 0.25;
      const sole = addPart(body, GEO.box, soleMat, x, 0.075, 0.06, 0.34, 0.06, 0.44);
      sole.name = 'sole';
    });

    // ---- torse ----
    const torsoY = 1.08;
    const torso = addPart(body, sphere, outfit === 'tee' ? shirtMat : shirtMat, 0, torsoY, 0, shoulderW * 0.5, 0.36, 0.27);
    torso.name = 'torso';

    if (outfit === 'jacket') {
      // panneaux de veste ouverts (t-shirt visible au centre)
      const panelL = addPart(body, sphere, jacketMat, -shoulderW * 0.37, torsoY + 0.02, 0.01, 0.16, 0.35, 0.27);
      const panelR = addPart(body, sphere, jacketMat, shoulderW * 0.37, torsoY + 0.02, 0.01, 0.16, 0.35, 0.27);
      panelL.rotation.z = 0.12; panelR.rotation.z = -0.12;
      // revers
      const lapelL = addPart(body, GEO.box, mat(AvatarShade(c.jacket, 18), { rough: 0.4 }), -0.13, torsoY + 0.23, 0.24, 0.1, 0.3, 0.05);
      const lapelR = addPart(body, GEO.box, mat(AvatarShade(c.jacket, 18), { rough: 0.4 }), 0.13, torsoY + 0.23, 0.24, 0.1, 0.3, 0.05);
      lapelL.rotation.z = -0.32; lapelR.rotation.z = 0.32;
      // col V du t-shirt
      addPart(body, GEO.cone, mat(AvatarShade(c.shirt, 16), { rough: 0.42 }), 0, torsoY + 0.24, 0.245, 0.13, 0.22, 0.04);
    } else if (outfit === 'hoodie') {
      torso.material = jacketMat;
      const pocket = addPart(body, GEO.box, mat(AvatarShade(c.jacket, -16), { rough: 0.5 }), 0, torsoY - 0.18, 0.25, 0.36, 0.18, 0.06);
      pocket.name = 'pocket';
      const hood = addPart(body, sphere, mat(AvatarShade(c.jacket, -10), { rough: 0.55 }), 0, torsoY + 0.42, -0.12, 0.32, 0.12, 0.24);
      hood.name = 'hood';
      [-0.09, 0.09].forEach((x) => {
        addPart(body, cyl, mat(AvatarShade(c.jacket, 34), { rough: 0.5 }), x, torsoY + 0.08, 0.275, 0.012, 0.2, 0.012);
      });
    } else if (outfit === 'dress') {
      torso.material = shirtMat;
      const skirt = addPart(body, cyl, jacketMat, 0, 0.6, 0, 0.4, 0.42, 0.34);
      skirt.name = 'skirt';
      addPart(body, GEO.torus, mat(AvatarShade(c.jacket, -20), { rough: 0.5 }), 0, 0.81, 0, 0.4, 0.4, 0.34).rotation.x = Math.PI / 2;
    } else {
      // tee simple : bande de bas
      addPart(body, GEO.box, mat(AvatarShade(c.shirt, -18), { rough: 0.5 }), 0, torsoY - 0.3, 0.235, 0.44, 0.06, 0.04);
    }

    // ---- bras (pivots) ----
    const armY = torsoY + 0.22;
    const armLen = 0.56;
    function makeArm(side) {
      const pivot = new THREE.Group();
      pivot.position.set(side * (shoulderW / 2 + 0.06), armY, 0);
      const sleeve = outfit === 'tee'
        ? addPart(pivot, sphere, shirtMat, 0, -0.02, 0, 0.14, 0.17, 0.14)
        : addPart(pivot, cyl, outfit === 'dress' ? jacketMat : jacketMat, 0, -armLen / 2 + 0.04, 0, 0.095, armLen, 0.095);
      if (outfit !== 'tee') {
        addPart(pivot, sphere, jacketMat, 0, 0.02, 0, 0.15, 0.14, 0.15);
      }
      // avant-bras / peau blanc + gant
      addPart(pivot, cyl, white, 0, -armLen + 0.12, 0, 0.085, 0.24, 0.085);
      const hand = addPart(pivot, sphere, white, 0, -armLen - 0.02, 0, 0.14);
      hand.name = 'hand';
      pivot.rotation.z = side * 0.06;
      body.add(pivot);
      return pivot;
    }
    const armL = makeArm(-1);
    const armR = makeArm(1);
    armL.name = 'armL'; armR.name = 'armR';

    // ---- cou + tête ----
    addPart(body, cyl, white, 0, 1.47, 0, 0.16, 0.14, 0.16);
    const head = new THREE.Group();
    head.position.set(0, 1.86, 0);
    body.add(head);
    /* tête de carnation avec traits du visage */
    addPart(head, sphere, headMat, 0, 0, 0, 0.5, 0.52, 0.48);
    head.name = 'head';

    /* ---- visage : yeux, iris, sourcils, bouche ---- */
    const eyeZ = 0.46;
    const eyeY = 0.07;
    const eyeX = 0.11;
    const browY = 0.14;
    const mouthY = -0.13;
    addPart(head, sphere, eyeMat, -eyeX, eyeY, eyeZ, 0.085, 0.075, 0.02);
    addPart(head, sphere, eyeMat, eyeX, eyeY, eyeZ, 0.085, 0.075, 0.02);
    addPart(head, sphere, irisMat, -eyeX, eyeY, eyeZ + 0.012, 0.04, 0.04, 0.01);
    addPart(head, sphere, irisMat, eyeX, eyeY, eyeZ + 0.012, 0.04, 0.04, 0.01);
    addPart(head, GEO.box, mat('#222222', { rough: 0.6 }), -eyeX - 0.015, browY, eyeZ + 0.006, 0.11, 0.02, 0.015);
    addPart(head, GEO.box, mat('#222222', { rough: 0.6 }), eyeX - 0.015, browY, eyeZ + 0.006, 0.11, 0.02, 0.015);
    addPart(head, GEO.box, mouthMat, 0, mouthY, eyeZ + 0.018, 0.09, 0.02, 0.012);

    // ---- cheveux ----
    if (hair === 'short') {
      const h = addPart(head, hemi, hairMat, 0, 0.07, -0.01, 0.52, 0.36, 0.5);
      h.rotation.x = -0.06;
    } else if (hair === 'curly') {
      addPart(head, hemi, hairMat, 0, 0.08, -0.02, 0.53, 0.33, 0.51);
      const curls = [[-0.32, 0.3, 0.16], [-0.16, 0.42, 0.2], [0.02, 0.45, 0.18], [0.2, 0.4, 0.2], [0.35, 0.28, 0.12], [-0.4, 0.15, 0.06], [0.4, 0.15, 0.06]];
      curls.forEach(([x, y, z], i) => addPart(head, sphere, mat(i % 2 ? AvatarShade(c.hair, -12) : c.hair, { rough: 0.55 }), x, y, z, 0.14));
    } else if (hair === 'afro') {
      addPart(head, sphere, hairMat, 0, 0.16, -0.08, 0.62, 0.58, 0.6);
      addPart(head, hemi, hairMat, 0, 0.1, 0.02, 0.56, 0.4, 0.53);
      [[-0.42, 0.2, 0], [0.42, 0.2, 0], [-0.3, 0.42, -0.1], [0.3, 0.42, -0.1], [0, 0.5, -0.12]].forEach(([x, y, z]) => {
        addPart(head, sphere, hairMat, x, y, z, 0.18);
      });
    } else if (hair === 'braids') {
      addPart(head, hemi, hairMat, 0, 0.08, -0.01, 0.52, 0.34, 0.5);
      [-1, 1].forEach((side) => {
        addPart(head, cyl, hairMat, side * 0.46, -0.18, -0.02, 0.07, 0.62, 0.07);
        addPart(head, sphere, mat(AvatarShade(c.hair, 34), { rough: 0.5 }), side * 0.46, -0.48, -0.02, 0.09);
      });
    } else if (hair === 'ponytail') {
      addPart(head, hemi, hairMat, 0, 0.08, -0.01, 0.52, 0.34, 0.5);
      addPart(head, sphere, hairMat, 0, 0.08, -0.45, 0.2);
      addPart(head, GEO.cone, hairMat, 0, -0.28, -0.48, 0.17, 0.6, 0.17).rotation.x = -0.2;
      addPart(head, sphere, mat(AvatarShade(c.hair, 34), { rough: 0.5 }), 0, 0.06, -0.4, 0.08);
    } else if (hair === 'cap') {
      addPart(head, hemi, hairMat, 0, 0.06, -0.01, 0.53, 0.38, 0.51);
      addPart(head, GEO.box, mat(AvatarShade(c.hair, -18), { rough: 0.5 }), 0, 0.02, 0.46, 0.7, 0.07, 0.34);
      addPart(head, sphere, mat(AvatarShade(c.hair, 30), { rough: 0.4 }), 0, 0.46, 0, 0.06);
    } else {
      // chauve : reflet
      addPart(head, sphere, mat('#FFFFFF', { rough: 0.12, metal: 0.1 }), -0.18, 0.24, 0.32, 0.1, 0.05, 0.02);
    }

    // ---- accessoire ----
    const darkFrame = mat('#141a33', { rough: 0.35, metal: 0.3 });
    if (accessory === 'glasses') {
      [-1, 1].forEach((side) => {
        const lens = addPart(head, GEO.torus, darkFrame, side * 0.19, -0.02, 0.44, 0.15, 0.15, 0.15);
        lens.rotation.x = 0;
        const glass = addPart(head, sphere, new THREE.MeshStandardMaterial({
          color: '#9fd0ff', transparent: true, opacity: 0.22, roughness: 0.1, metalness: 0.2,
        }), side * 0.19, -0.02, 0.44, 0.13, 0.12, 0.02);
      });
      addPart(head, GEO.box, darkFrame, 0, 0.02, 0.45, 0.1, 0.025, 0.03);
    } else if (accessory === 'headphones') {
      const bandGeo = new THREE.TorusGeometry(0.56, 0.05, 8, 36, Math.PI);
      addPart(head, bandGeo, darkFrame, 0, 0.04, 0, 1, 1, 1);
      [-1, 1].forEach((side) => {
        addPart(head, cyl, darkFrame, side * 0.5, -0.02, 0, 0.09, 0.24, 0.09).rotation.z = Math.PI / 2;
        addPart(head, cyl, mat(c.jacket, { rough: 0.4 }), side * 0.53, -0.02, 0, 0.11, 0.17, 0.11).rotation.z = Math.PI / 2;
      });
    } else if (accessory === 'beanie') {
      addPart(head, hemi, mat(c.jacket, { rough: 0.55 }), 0, 0.1, -0.01, 0.54, 0.42, 0.52);
      addPart(head, GEO.torus, mat(AvatarShade(c.jacket, -18), { rough: 0.55 }), 0, 0.13, 0, 0.52, 0.52, 0.5).rotation.x = Math.PI / 2;
      addPart(head, sphere, mat(AvatarShade(c.jacket, 30), { rough: 0.45 }), 0, 0.55, 0, 0.09);
    } else if (accessory === 'backpack') {
      addPart(body, GEO.box, mat(AvatarShade(c.jacket, -32), { rough: 0.55 }), 0, torsoY + 0.02, -0.32, 0.5, 0.62, 0.24);
      addPart(body, GEO.box, mat(AvatarShade(c.jacket, -16), { rough: 0.5 }), 0, torsoY - 0.16, -0.45, 0.38, 0.2, 0.1);
      [-1, 1].forEach((side) => {
        addPart(body, GEO.box, mat(AvatarShade(c.jacket, -22), { rough: 0.5 }), side * 0.26, torsoY + 0.1, 0.18, 0.06, 0.44, 0.04).rotation.z = side * 0.08;
      });
    }

    // ---- étiquette de nom ----
    let label = null;
    if (!low) {
      label = makeLabel(o.name || '');
      label.position.set(0, 2.78, 0);
      root.add(label);
    }

    // ---- halo du joueur actif ----
    let halo = null;
    if (!low) {
      halo = new THREE.Mesh(
        new THREE.RingGeometry(0.44, 0.62, 40),
        new THREE.MeshBasicMaterial({ color: '#FFCF5A', transparent: true, opacity: 0, side: THREE.DoubleSide })
      );
      halo.rotation.x = -Math.PI / 2;
      halo.position.y = 0.035;
      root.add(halo);
    }

    const ch = {
      id: o.id || null,
      root, body, head, armL, armR, legL, legR, label, halo,
      anim: 'idle', animUntil: 0, phase: Math.random() * Math.PI * 2,
      baseY: 0, config, configKey: JSON.stringify(config || {}), low,
    };
    root.userData.character = ch;
    if (o.shadows) {
      root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    }
    return ch;
  }

  function AvatarShade(hex, amount) {
    return global.Avatar ? global.Avatar.shade(hex, amount) : hex;
  }

  function makeLabel(text) {
    const c = document.createElement('canvas');
    c.width = 384; c.height = 96;
    const g = c.getContext('2d');
    const tex = new THREE.CanvasTexture(c);
    if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
    tex.minFilter = THREE.LinearFilter;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    sprite.scale.set(1.9, 0.48, 1);
    sprite.renderOrder = 10;
    sprite.userData.canvas = c;
    sprite.userData.ctx = g;
    sprite.userData.tex = tex;
    setLabelText(sprite, text);
    return sprite;
  }

  function setLabelText(sprite, text) {
    if (!sprite || !sprite.userData.ctx) return;
    const g = sprite.userData.ctx;
    const c = sprite.userData.canvas;
    g.clearRect(0, 0, c.width, c.height);
    if (!text) { sprite.visible = false; return; }
    sprite.visible = true;
    g.fillStyle = 'rgba(7, 14, 40, 0.82)';
    const r = 26;
    g.beginPath();
    g.moveTo(r, 8);
    g.lineTo(c.width - r, 8);
    g.quadraticCurveTo(c.width - 8, 8, c.width - 8, r + 8);
    g.lineTo(c.width - 8, c.height - r);
    g.quadraticCurveTo(c.width - 8, c.height - 8, c.width - r, c.height - 8);
    g.lineTo(r, c.height - 8);
    g.quadraticCurveTo(8, c.height - 8, 8, c.height - r);
    g.lineTo(8, r + 8);
    g.quadraticCurveTo(8, 8, r, 8);
    g.closePath();
    g.fill();
    g.strokeStyle = '#00E472';
    g.lineWidth = 4;
    g.stroke();
    g.fillStyle = '#ffffff';
    g.font = '700 40px "Janda Manatee Solid", system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(text).slice(0, 14), c.width / 2, c.height / 2 + 2);
    sprite.userData.tex.needsUpdate = true;
  }

  /* ------------------------------------------------------------------ */
  /* Public : joueurs                                                   */
  /* ------------------------------------------------------------------ */
  function positionPlayers() {
    const list = Array.from(S.players.values());
    const n = list.length;
    list.forEach((ch, idx) => {
      let col, row, rows, perRow;
      if (n <= 8) { rows = 1; perRow = n; }
      else { rows = 2; perRow = Math.ceil(n / 2); }
      col = perRow === 1 ? 0 : (idx % perRow) - (perRow - 1) / 2;
      row = Math.floor(idx / perRow);
      /* arc unique face public : les joueurs se tiennent côte à côte,
         légèrement en cercle, tournés en 3/4 vers la caméra. */
      const spacing = n <= 4 ? 1.7 : n <= 8 ? 1.5 : 1.36;
      const x = col * spacing;
      const z = 2.7 - row * 1.25 + Math.abs(col) * 0.1;
      const y = row * 0.16;
      ch.root.position.set(x, y, z);
      ch.root.scale.setScalar(n > 8 ? 0.92 : n > 5 ? 0.98 : 1.06);
      ch.baseY = y;
      /* 3/4 : chaque personnage pivote un peu vers le centre */
      ch.root.rotation.y = -col * 0.11;
      if (ch.label) {
        const lw = Math.min(1.75, Math.max(1.0, spacing - 0.12));
        ch.label.position.set(0, 2.74 + row * 0.18, 0.08);
        ch.label.scale.set(lw, lw * 0.26, 1);
      }
    });
    /* anti-collision des plaques : une plaque qui en touche une autre monte
       automatiquement, pour ne jamais masquer une tête ni un nom. */
    const placed = [];
    for (const ch of list) {
      if (!ch.label) continue;
      const lw = ch.label.scale.x;
      const lx = ch.root.position.x;
      const lz = ch.root.position.z;
      let ly = ch.label.position.y;
      for (let guard = 0; guard < 4; guard++) {
        const hit = placed.find((p) =>
          Math.abs(lx - p.x) < (lw + p.w) / 2 + 0.06 &&
          Math.abs(lz - p.z) < 0.25 &&
          Math.abs(ly - p.y) < 0.24
        );
        if (!hit) break;
        ly = hit.y + 0.3;
      }
      ch.label.position.y = ly;
      placed.push({ x: lx, z: lz, y: ly, w: lw });
    }
  }

  function setPlayers(list, controllerId, stealerId) {
    if (!S.ready) return;
    const now = performance.now();
    const seen = new Set();
    (list || []).forEach((p) => {
      seen.add(p.id);
      let ch = S.players.get(p.id);
      if (!ch) {
        ch = createCharacter(p.avatar, { id: p.id, name: p.name, shadows: true });
        ch.justCreated = true;
        ch.animEnterTime = now;
        S.players.set(p.id, ch);
        S.scene.add(ch.root);
      } else {
        // mise à jour nom / config si besoin
        if (ch.configKey !== JSON.stringify(p.avatar)) {
          S.scene.remove(ch.root);
          disposeCharacter(ch);
          ch = createCharacter(p.avatar, { id: p.id, name: p.name, shadows: true });
          ch.justCreated = true;
          ch.animEnterTime = now;
          ch.configKey = JSON.stringify(p.avatar);
          S.players.set(p.id, ch);
          S.scene.add(ch.root);
        }
      }
      if (ch.label) setLabelText(ch.label, p.name);
      const active = p.id === controllerId || p.id === stealerId;
      if (ch.halo) ch.halo.material.opacity = active ? 0.85 : 0;
    });
    for (const [id, ch] of Array.from(S.players.entries())) {
      if (!seen.has(id)) {
        S.scene.remove(ch.root);
        disposeCharacter(ch);
        S.players.delete(id);
      }
    }
    positionPlayers();
    /* animation d'arrivée : les nouveaux personnages descendent du haut avec rebond */
    for (const ch of S.players.values()) {
      if (ch.justCreated) {
        ch.justCreated = false;
        ch.anim = 'entering';
        ch.animUntil = now + 800;
        ch.animStartTime = now;
      }
    }
  }

  function disposeCharacter(ch) {
    ch.root.traverse((o) => {
      if (o.isSprite && o.userData.tex) o.userData.tex.dispose();
    });
  }

  function react(playerId, kind) {
    const ch = S.players.get(playerId);
    if (!ch) return;
    const now = performance.now();
    ch.anim = kind || 'idle';
    ch.animUntil = now + (kind === 'error' ? 2000 : kind === 'buzz' ? 1600 : 1500);
    if (kind === 'joy') S.crowdCheer = Math.max(S.crowdCheer, 1);
    if (kind === 'buzz') S.crowdCheer = Math.max(S.crowdCheer, 0.45);
  }

  function celebrate() {
    S.crowdCheer = 2.4;
    for (const ch of S.players.values()) {
      ch.anim = 'joy';
      ch.animUntil = performance.now() + 2600;
    }
  }

  function crowdReact(kind) {
    const now = performance.now();
    if (kind === 'found') {
      S.crowdCheer = Math.max(S.crowdCheer, 1.2);
      for (const ch of S.crowdData) {
        if (Math.random() < 0.45) { ch.anim = 'cheer'; ch.until = now + 500 + Math.random() * 500; }
      }
    } else if (kind === 'error') {
      S.crowdCheer = Math.max(S.crowdCheer, 0.6);
      for (const ch of S.crowdData) {
        if (Math.random() < 0.35) { ch.anim = 'oh'; ch.until = now + 800; }
      }
    } else if (kind === 'celebrate') {
      S.crowdCheer = 2.4;
      for (const ch of S.crowdData) { ch.anim = 'cheer'; ch.until = now + 2200; }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Foule                                                              */
  /* ------------------------------------------------------------------ */
  function buildCrowd(scene) {
    /* Foule humanoïde instanciée sur le tribune unique : torso (boubou/tenue),
       tête, chevelure et bras. Chaque spectateur occupe un siège ; ≤ 8 % des
       sièges sont volontairement vides (pas de grille rigide, pas de dos). */
    const trib = S.tribune;
    const ROWS = trib.ROWS;
    const seatPerRow = trib.seatPerRow;
    const seatW = trib.seatW;
    const seatGap = trib.seatGap;
    const rise = trib.rise;
    const startZ = trib.startZ;
    const startY = trib.startY;
    const treadDepth = trib.treadDepth;
    const totalCount = ROWS * seatPerRow;
    const seatH = 0.42;

    const bodyGeo = new THREE.BoxGeometry(0.5, 1.5, 0.3);   /* torso + jambes (boubou) */
    const headGeo = new THREE.SphereGeometry(0.22, 10, 8);
    const hairGeo = new THREE.BoxGeometry(0.28, 0.2, 0.28); /* afro / gélé / casquette */
    const armGeo = new THREE.BoxGeometry(0.07, 0.5, 0.07);

    const bodyMat = new THREE.MeshBasicMaterial({ color: '#00E472', vertexColors: true });
    const headMat = new THREE.MeshBasicMaterial({ color: '#E0AC69', vertexColors: true });
    const hairMat = new THREE.MeshBasicMaterial({ color: '#2B1B12', vertexColors: true });
    const armMat = new THREE.MeshBasicMaterial({ color: '#00E472', vertexColors: true });

    const bodies = new THREE.InstancedMesh(bodyGeo, bodyMat, totalCount);
    const heads = new THREE.InstancedMesh(headGeo, headMat, totalCount);
    const hairs = new THREE.InstancedMesh(hairGeo, hairMat, totalCount);
    const arms = new THREE.InstancedMesh(armGeo, armMat, totalCount * 2);
    for (const inst of [bodies, heads, hairs, arms]) {
      inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      inst.castShadow = false;
    }

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    /* carnations : majorité de peaux brunes à foncées, gamme complète */
    const skins = ['#C68642', '#E0AC69', '#5C3317', '#A16B3A', '#8D5524', '#F1C27D', '#B9875C', '#7A4E28'];
    /* tenues béninoises : boubou, pagne/wax, maillot des Écureuils, tee */
    const outfits = ['#00E472', '#FF4E20', '#0B35FE', '#F5C542', '#E84A8A', '#2E85FF', '#F4F6FC', '#8B5CF6', '#B9B9C9'];
    const hairsCol = ['#2B1B12', '#1B2A6B', '#F5C542', '#F4F6FC', '#5AD86B', '#8B5CF6', '#B9B9C9', '#2B1B12'];

    S.crowdData = [];
    let present = 0;
    for (let row = 0; row < ROWS; row++) {
      const y = startY + row * rise;
      const z = startZ - row * treadDepth;
      /* même Z que le siège (buildTribune) : z + treadDepth - seatH/2*0 + ... pour s'asseoir */
      const seatZ = z + treadDepth - 0.42;
      for (let s = 0; s < seatPerRow; s++) {
        const i = row * seatPerRow + s;
        /* chaque siège est occupé (pas de vide artificiel) */
        present++;
        const x = (s - (seatPerRow - 1) / 2) * (seatW + seatGap) + (Math.random() - 0.5) * 0.04;
        const bodyY = y - seatH / 2 + 0.05 + 0.75;
        const headY = bodyY + 0.75 + 0.22;
        const data = {
          i, x, bodyY, headY, z: seatZ, row,
          phase: Math.random() * Math.PI * 2,
          anim: 'idle', until: 0,
          skin: skins[(present * 5) % skins.length],
          outfit: outfits[(present * 7) % outfits.length],
          hair: hairsCol[(present * 3) % hairsCol.length],
        };
        S.crowdData.push(data);

        /* rotation vers la caméra (public face à la scène) + léger décalage */
        const ry = Math.PI + (Math.random() - 0.5) * 0.15;
        const rz = (Math.random() - 0.5) * 0.06;

        /* corps (boubou) */
        dummy.position.set(x, bodyY, seatZ);
        dummy.rotation.set(0, ry, rz);
        dummy.updateMatrix();
        bodies.setMatrixAt(data.crowdIdx = i, dummy.matrix);
        color.set(data.outfit); bodies.setColorAt(i, color);

        /* tête */
        dummy.position.set(x, headY, seatZ);
        dummy.updateMatrix();
        heads.setMatrixAt(i, dummy.matrix);
        color.set(data.skin); heads.setColorAt(i, color);

        /* chevelure */
        dummy.position.set(x, headY + 0.16, seatZ + 0.02);
        dummy.updateMatrix();
        hairs.setMatrixAt(i, dummy.matrix);
        color.set(data.hair); hairs.setColorAt(i, color);

        /* bras : deux instances par spectateur (gauche, droite) */
        [ -1, 1 ].forEach((side) => {
          const ai = i * 2 + (side === -1 ? 0 : 1);
          dummy.position.set(x + side * 0.3, bodyY - 0.25, seatZ + 0.02);
          dummy.rotation.set(0, 0, side * 0.1);
          dummy.updateMatrix();
          arms.setMatrixAt(ai, dummy.matrix);
          color.set(data.outfit); arms.setColorAt(ai, color);
        });
      }
    }
    bodies.instanceColor.needsUpdate = true;
    heads.instanceColor.needsUpdate = true;
    hairs.instanceColor.needsUpdate = true;
    arms.instanceColor.needsUpdate = true;
    bodies.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
    hairs.instanceMatrix.needsUpdate = true;
    arms.instanceMatrix.needsUpdate = true;

    scene.add(bodies, heads, hairs, arms);
    S.crowdInst = { bodies, heads, hairs, arms };
    S.crowdCount = present;
  }

  function animateCrowd(t, now, dt) {
    const inst = S.crowdInst;
    if (!inst) return;
    S.crowdCheer = Math.max(0, S.crowdCheer - dt * 0.55);
    const dummy = new THREE.Object3D();
    for (const ch of S.crowdData) {
      if (now > ch.until) {
        if (S.crowdCheer > 1.5 && Math.random() < 0.03) { ch.anim = 'cheer'; ch.until = now + 700; }
        else { ch.anim = 'idle'; }
      }
      let lift = 0, tilt = 0;
      if (ch.anim === 'cheer') { lift = Math.abs(Math.sin(t * 12 + ch.phase)) * 0.14; tilt = Math.sin(t * 10 + ch.phase) * 0.12; }
      else if (ch.anim === 'oh') { lift = 0; tilt = -0.1; }
      const ry = Math.PI + (ch.tiltOffset || 0);
      const rz = tilt;

      /* corps */
      dummy.position.set(ch.x, ch.bodyY + lift, ch.z);
      dummy.rotation.set(0, ry, rz);
      dummy.updateMatrix();
      inst.bodies.setMatrixAt(ch.i, dummy.matrix);
      /* tête */
      dummy.position.set(ch.x, ch.headY + lift, ch.z);
      dummy.updateMatrix();
      inst.heads.setMatrixAt(ch.i, dummy.matrix);
      /* chevelure */
      dummy.position.set(ch.x, ch.headY + 0.16 + lift, ch.z + 0.02);
      dummy.updateMatrix();
      inst.hairs.setMatrixAt(ch.i, dummy.matrix);
      /* bras : bras levés quand on applaudit */
      let armLift = 0;
      if (ch.anim === 'cheer') armLift = Math.abs(Math.sin(t * 12 + ch.phase)) * 0.5;
      [ -1, 1 ].forEach((side) => {
        const ai = ch.i * 2 + (side === -1 ? 0 : 1);
        dummy.position.set(ch.x + side * 0.3, ch.bodyY - 0.25 + armLift, ch.z + 0.02);
        dummy.rotation.set(0, 0, side * 0.1 + (ch.anim === 'cheer' ? side * 0.8 : 0));
        dummy.updateMatrix();
        inst.arms.setMatrixAt(ai, dummy.matrix);
      });
    }
    inst.bodies.instanceMatrix.needsUpdate = true;
    inst.heads.instanceMatrix.needsUpdate = true;
    inst.hairs.instanceMatrix.needsUpdate = true;
    inst.arms.instanceMatrix.needsUpdate = true;
  }

  /* ------------------------------------------------------------------ */
  /* Animation                                                          */
  /* ------------------------------------------------------------------ */
  function animate() {
    if (!S.ready) return;
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, S.clock.getDelta());
    S.t += dt;
    const t = S.t;
    const now = performance.now();

    // joueurs
    for (const ch of S.players.values()) {
      animateCharacter(ch, t, now, 1);
    }
    // foule instanciée
    animateCrowd(t, now, dt);

    // anneaux
    if (S.rings) {
      S.rings[0].rotation.z += dt * 0.08;
      S.rings[1].rotation.z -= dt * 0.06;
      S.rings[0].material.opacity = 0.35 + Math.sin(t * 1.4) * 0.12;
    }
    // halo joueur actif
    for (const ch of S.players.values()) {
      if (ch.halo && ch.halo.material.opacity > 0) {
        ch.halo.rotation.z += dt * 0.9;
        ch.halo.material.opacity = 0.55 + Math.sin(t * 5) * 0.3;
        ch.halo.scale.setScalar(1 + Math.sin(t * 3) * 0.06);
      }
    }
    // caméra légère
    if (!S.reduceMotion) {
      const shift = S.lobbyMode ? -1.9 : 0;
      S.camera.position.x = shift + Math.sin(t * 0.16) * 0.32;
      S.camera.position.y = 4.9 + Math.sin(t * 0.22) * 0.08;
      S.camera.lookAt(shift * 0.55, 2.8, 0.6);
    }
    S.renderer.render(S.scene, S.camera);
  }

  function animateCharacter(ch, t, now, weight) {
    if (ch.animUntil && now > ch.animUntil) { ch.anim = 'idle'; ch.animUntil = 0; }
    const anim = ch.anim;
    const phase = ch.phase;
    const lerp = (a, b, k) => a + (b - a) * Math.min(1, k);

    let armLTarget = 0.06, armRTarget = -0.06;
    let headX = 0, headZ = 0;
    let bodyZ = Math.sin(t * 1.7 + phase) * 0.018 * weight;
    let jump = 0;
    const speed = ch.low ? 0.1 : 0.14;

    if (anim === 'joy') {
      armLTarget = 2.45; armRTarget = -2.45;
      headZ = Math.sin(t * 6 + phase) * 0.08;
      jump = Math.abs(Math.sin(t * 6.2 + phase)) * 0.2;
    } else if (anim === 'error') {
      armLTarget = 0.25; armRTarget = -0.25;
      headX = 0.5;
      bodyZ = 0.08;
      jump = 0;
    } else if (anim === 'buzz') {
      armRTarget = -2.7;
      armLTarget = 0.25;
      headZ = -0.06;
      jump = Math.abs(Math.sin(t * 9)) * 0.04;
    } else if (anim === 'entering') {
      const elapsed = now - (ch.animStartTime || now);
      const k = Math.min(1, elapsed / 800);
      const bounce = 1 - Math.pow(1 - k, 3);
      const extraY = (1 - bounce) * 2.2;
      const sq = k < 0.5 ? 1 + 0.18 * Math.sin(Math.PI * k) : 1 - 0.12 * Math.sin(Math.PI * k);
      const sx = k < 0.5 ? 1 - 0.14 * Math.sin(Math.PI * k) : 1 + 0.1 * Math.sin(Math.PI * k);
      ch.root.position.y = (ch.baseY || 0) + extraY;
      ch.root.scale.set(sx, sq, 1);
      armLTarget = 0;
      armRTarget = 0;
      headX = 0;
      headZ = 0;
      bodyZ = 0;
      jump = 0;
    } else {
      armLTarget = 0.06 + Math.sin(t * 1.9 + phase) * 0.05;
      armRTarget = -0.06 - Math.sin(t * 1.9 + phase + 0.7) * 0.05;
      jump = Math.sin(t * 1.9 + phase) * 0.012;
    }
    ch.armL.rotation.z = lerp(ch.armL.rotation.z, armLTarget, speed);
    ch.armR.rotation.z = lerp(ch.armR.rotation.z, armRTarget, speed);
    ch.armL.rotation.x = lerp(ch.armL.rotation.x, anim === 'joy' ? -0.1 : 0, speed);
    ch.armR.rotation.x = lerp(ch.armR.rotation.x, anim === 'joy' ? -0.1 : 0, speed);
    ch.head.rotation.x = lerp(ch.head.rotation.x, headX, speed);
    ch.head.rotation.z = lerp(ch.head.rotation.z, headZ, speed);
    ch.body.rotation.z = lerp(ch.body.rotation.z, bodyZ, speed);
    ch.root.position.y = (ch.baseY || 0) + jump * weight;
  }

  /* ------------------------------------------------------------------ */
  /* API                                                                */
  /* ------------------------------------------------------------------ */
  function setLobby(on) {
    S.lobbyMode = !!on;
  }

  function setRound(round, total, multiplier, question) {
    S.round = round || 0;
    S.total = total || 10;
    S.multiplier = multiplier || 1;
    S.question = question || '';
    if (S.ready) drawScreen();
  }

  function destroy() {
    S.ready = false;
    for (const ch of S.players.values()) {
      if (S.scene) S.scene.remove(ch.root);
    }
    S.players.clear();
    if (S.crowdInst) {
      for (const k of ['bodies', 'heads', 'seats']) {
        try { S.scene.remove(S.crowdInst[k]); S.crowdInst[k].geometry.dispose(); S.crowdInst[k].material.dispose(); } catch (e) {}
      }
      S.crowdInst = null;
    }
    if (S.renderer) {
      try { S.renderer.dispose(); } catch (e) {}
    }
  }

  global.Scene3D = {
    init, setPlayers, react, celebrate, crowdReact, setRound, setLobby, resize, destroy,
    get ready() { return S.ready; },
  };
})(window);
