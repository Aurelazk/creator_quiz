import * as THREE from 'three';

const LEVELS = [
  { number: '01', name: 'BASES DU WEB', color: '#0033FF', text: '#F7F3E8' },
  { number: '02', name: 'APPS & DONNÉES', color: '#F05030', text: '#F7F3E8' },
  { number: '03', name: 'DÉVELOPPER AVEC L’IA', color: '#00A878', text: '#10131C' },
  { number: '04', name: 'DESIGN & MISE EN LIGNE', color: '#FFC107', text: '#10131C' },
];

export function initScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(44, window.innerWidth / window.innerHeight, 0.1, 60);
  camera.position.set(0, 2.05, 7.7);
  camera.lookAt(0, 1.28, 0);

  scene.add(new THREE.HemisphereLight(0xfff9eb, 0x6c7488, 1.65));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(4, 7, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffe0c2, 0.8);
  fill.position.set(-5, 3, 3);
  scene.add(fill);
  const blueRim = new THREE.DirectionalLight(0x8b9cff, 0.7);
  blueRim.position.set(0, 4, -6);
  scene.add(blueRim);

  // ---- Sol graphique ----
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(2.3, 48),
    new THREE.MeshBasicMaterial({ color: 0x10131c, transparent: true, opacity: 0.07 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(-1.45, 0.012, 0.3);
  shadow.scale.set(1, 0.62, 1);
  scene.add(shadow);

  // ---- Roue 4 niveaux ----
  const wheelGroup = new THREE.Group();
  wheelGroup.position.set(2.35, 2.35, -0.85);
  scene.add(wheelGroup);

  const SIZE = 1024;
  const wheelCanvas = document.createElement('canvas');
  wheelCanvas.width = wheelCanvas.height = SIZE;
  const ctx = wheelCanvas.getContext('2d');
  const center = SIZE / 2;

  LEVELS.forEach((level, index) => {
    const start = (index / LEVELS.length) * Math.PI * 2 - Math.PI / 2;
    const end = ((index + 1) / LEVELS.length) * Math.PI * 2 - Math.PI / 2;

    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, center - 10, start, end);
    ctx.closePath();
    ctx.fillStyle = level.color;
    ctx.fill();
    ctx.strokeStyle = '#10131C';
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.save();
    ctx.translate(center, center);
    ctx.rotate((start + end) / 2 + Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = level.text;

    ctx.font = '700 102px Georgia, "Times New Roman", serif';
    ctx.fillText(level.number, 0, -152);

    const words = level.name.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      if ((line + ' ' + word).trim().length > 13 && line) {
        lines.push(line);
        line = word;
      } else {
        line = (line + ' ' + word).trim();
      }
    }
    if (line) lines.push(line);

    ctx.font = '700 34px "Arial Black", Impact, sans-serif';
    lines.slice(0, 2).forEach((part, lineIndex) => {
      ctx.fillText(part, 0, 10 + lineIndex * 42);
    });
    ctx.restore();
  });

  const wheelTexture = new THREE.CanvasTexture(wheelCanvas);
  wheelTexture.colorSpace = THREE.SRGBColorSpace;
  wheelTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(1.62, 64),
    new THREE.MeshStandardMaterial({ map: wheelTexture, roughness: 0.82, metalness: 0.02 })
  );
  wheelGroup.add(disc);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1.66, 0.055, 12, 72),
    new THREE.MeshStandardMaterial({ color: 0x10131c, roughness: 0.8, flatShading: true })
  );
  wheelGroup.add(rim);

  const hub = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.18, 0),
    new THREE.MeshStandardMaterial({ color: 0x10131c, roughness: 0.75, flatShading: true })
  );
  hub.position.z = -0.1;
  wheelGroup.add(hub);

  const pointer = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.48, 4),
    new THREE.MeshStandardMaterial({ color: 0x10131c, roughness: 0.65, flatShading: true })
  );
  pointer.position.set(wheelGroup.position.x, wheelGroup.position.y + 1.9, wheelGroup.position.z + 0.08);
  pointer.rotation.z = Math.PI;
  scene.add(pointer);

  const standMaterial = new THREE.MeshStandardMaterial({
    color: 0x10131c,
    roughness: 0.72,
    metalness: 0.08,
    flatShading: true,
  });

  const stand = new THREE.Group();
  stand.position.set(wheelGroup.position.x, 0, wheelGroup.position.z - 0.18);
  scene.add(stand);

  const standBase = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.62, 0.14, 8), standMaterial);
  standBase.position.y = 0.07;
  stand.add(standBase);

  const standFoot = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.075, 0.42), standMaterial);
  standFoot.position.y = 0.04;
  stand.add(standFoot);

  const standPost = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.086, 2.18, 6), standMaterial);
  standPost.position.y = 1.16;
  stand.add(standPost);

  for (const side of [-1, 1]) {
    const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.042, 0.84, 5), standMaterial);
    brace.position.set(side * 0.22, 0.37, 0);
    brace.rotation.z = side * 0.56;
    stand.add(brace);
  }

  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.54, 8), standMaterial);
  axle.rotation.x = Math.PI / 2;
  axle.position.set(wheelGroup.position.x, wheelGroup.position.y, wheelGroup.position.z - 0.02);
  scene.add(axle);

  const tickGroup = new THREE.Group();
  tickGroup.position.copy(wheelGroup.position);
  tickGroup.position.z += 0.045;
  scene.add(tickGroup);

  const tickOuter = new THREE.Mesh(
    new THREE.TorusGeometry(1.91, 0.011, 6, 96),
    new THREE.MeshStandardMaterial({ color: 0x10131c, roughness: 0.9 })
  );
  tickGroup.add(tickOuter);

  for (let i = 0; i < 32; i++) {
    const angle = (i / 32) * Math.PI * 2;
    const major = i % 4 === 0;
    const tick = new THREE.Mesh(
      new THREE.BoxGeometry(0.022, major ? 0.16 : 0.085, 0.022),
      standMaterial
    );
    tick.position.set(Math.cos(angle) * 1.84, Math.sin(angle) * 1.84, 0);
    tick.rotation.z = angle + Math.PI / 2;
    tickGroup.add(tick);
  }

  const hubCanvas = document.createElement('canvas');
  hubCanvas.width = hubCanvas.height = 256;
  const hubCtx = hubCanvas.getContext('2d');
  hubCtx.beginPath();
  hubCtx.arc(128, 128, 112, 0, Math.PI * 2);
  hubCtx.fillStyle = '#F7F3E8';
  hubCtx.fill();
  hubCtx.lineWidth = 18;
  hubCtx.strokeStyle = '#10131C';
  hubCtx.stroke();
  hubCtx.fillStyle = '#0033FF';
  hubCtx.font = '700 150px Georgia, "Times New Roman", serif';
  hubCtx.textAlign = 'center';
  hubCtx.textBaseline = 'middle';
  hubCtx.fillText('C', 128, 138);

  const hubTexture = new THREE.CanvasTexture(hubCanvas);
  hubTexture.colorSpace = THREE.SRGBColorSpace;
  hubTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const hubCap = new THREE.Mesh(
    new THREE.CircleGeometry(0.37, 40),
    new THREE.MeshStandardMaterial({ map: hubTexture, roughness: 0.86, metalness: 0.02 })
  );
  hubCap.position.z = 0.12;
  wheelGroup.add(hubCap);

  // ---- Renard low-poly ----
  const fox = new THREE.Group();
  fox.position.set(-1.62, 0, 0.45);
  fox.rotation.y = 0.18;
  scene.add(fox);

  const orange = new THREE.MeshStandardMaterial({ color: 0xf05030, roughness: 0.78, flatShading: true });
  const orangeDark = new THREE.MeshStandardMaterial({ color: 0xc83c24, roughness: 0.8, flatShading: true });
  const cream = new THREE.MeshStandardMaterial({ color: 0xf7ead3, roughness: 0.88, flatShading: true });
  const ink = new THREE.MeshStandardMaterial({ color: 0x161922, roughness: 0.55, flatShading: true });
  const blue = new THREE.MeshStandardMaterial({ color: 0x0033ff, roughness: 0.7, flatShading: true });

  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.72, 0), orange);
  body.scale.set(0.88, 0.78, 1.08);
  body.position.set(0, 0.92, -0.08);
  fox.add(body);

  const chest = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), cream);
  chest.scale.set(0.78, 0.95, 0.58);
  chest.position.set(0, 0.9, 0.52);
  fox.add(chest);

  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), orange);
  head.scale.set(1, 0.92, 1.02);
  head.position.set(0, 1.62, 0.4);
  fox.add(head);

  const cheekL = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 0), cream);
  cheekL.scale.set(0.9, 0.72, 0.65);
  cheekL.position.set(-0.24, 1.5, 0.74);
  fox.add(cheekL);
  const cheekR = cheekL.clone();
  cheekR.position.x = 0.24;
  fox.add(cheekR);

  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.58, 4), cream);
  snout.rotation.x = Math.PI / 2;
  snout.rotation.z = Math.PI / 4;
  snout.position.set(0, 1.48, 0.96);
  fox.add(snout);

  const nose = new THREE.Mesh(new THREE.IcosahedronGeometry(0.085, 0), ink);
  nose.position.set(0, 1.48, 1.25);
  fox.add(nose);

  const eyeL = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 0), ink);
  eyeL.position.set(-0.19, 1.69, 0.84);
  fox.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.19;
  fox.add(eyeR);

  const glintMaterial = new THREE.MeshBasicMaterial({ color: 0xfffdf5 });
  const glintGeometry = new THREE.IcosahedronGeometry(0.018, 0);
  const glintL = new THREE.Mesh(glintGeometry, glintMaterial);
  glintL.position.set(-0.172, 1.708, 0.892);
  fox.add(glintL);
  const glintR = glintL.clone();
  glintR.position.x = 0.172;
  fox.add(glintR);

  const earL = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.62, 4), orangeDark);
  earL.position.set(-0.31, 2.03, 0.29);
  earL.rotation.z = 0.12;
  earL.rotation.y = 0.14;
  fox.add(earL);
  const earR = earL.clone();
  earR.position.x = 0.31;
  earR.rotation.z = -0.12;
  earR.rotation.y = -0.14;
  fox.add(earR);

  const innerL = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.34, 4), cream);
  innerL.position.set(-0.31, 2.03, 0.36);
  innerL.rotation.z = 0.12;
  innerL.rotation.y = 0.14;
  fox.add(innerL);
  const innerR = innerL.clone();
  innerR.position.x = 0.31;
  innerR.rotation.z = -0.12;
  innerR.rotation.y = -0.14;
  fox.add(innerR);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.055, 5, 12), blue);
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 1.28, 0.32);
  fox.add(collar);

  const badge = new THREE.Mesh(new THREE.OctahedronGeometry(0.085, 0), blue);
  badge.position.set(0, 1.02, 0.76);
  badge.scale.set(1, 1.35, 0.45);
  badge.rotation.z = Math.PI / 4;
  fox.add(badge);

  const legGeometry = new THREE.CylinderGeometry(0.075, 0.09, 0.52, 4);
  const pawGeometry = new THREE.IcosahedronGeometry(0.12, 0);
  const legPositions = [
    [-0.29, 0.32, 0.45],
    [0.29, 0.32, 0.45],
    [-0.3, 0.32, -0.45],
    [0.3, 0.32, -0.45],
  ];
  for (const [x, y, z] of legPositions) {
    const leg = new THREE.Mesh(legGeometry, orangeDark);
    leg.position.set(x, y, z);
    fox.add(leg);
    const paw = new THREE.Mesh(pawGeometry, cream);
    paw.scale.set(1.2, 0.58, 1.35);
    paw.position.set(x, 0.09, z + 0.04);
    fox.add(paw);
  }

  const tail = new THREE.Group();
  tail.position.set(0, 0.92, -0.78);
  tail.rotation.x = -0.42;
  tail.rotation.z = 0.3;
  fox.add(tail);

  const tailBody = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.28, 5), orange);
  tailBody.position.y = 0.56;
  tail.add(tailBody);

  const tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.46, 5), cream);
  tailTip.position.y = 1.18;
  tail.add(tailTip);

  // ---- Formes flottantes ----
  const shapes = [];
  const shapeMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x0033ff, roughness: 0.7, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0xf05030, roughness: 0.7, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0x00a878, roughness: 0.7, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0xffc107, roughness: 0.7, flatShading: true }),
  ];
  for (let i = 0; i < 10; i++) {
    const geometry = i % 2
      ? new THREE.TetrahedronGeometry(0.08 + Math.random() * 0.08, 0)
      : new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const mesh = new THREE.Mesh(geometry, shapeMaterials[i % shapeMaterials.length]);
    mesh.position.set((Math.random() - 0.5) * 8, 0.5 + Math.random() * 3.8, -1.5 - Math.random() * 2);
    mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    mesh.userData.phase = Math.random() * Math.PI * 2;
    mesh.userData.speed = 0.2 + Math.random() * 0.4;
    mesh.userData.baseY = mesh.position.y;
    scene.add(mesh);
    shapes.push(mesh);
  }

  // ---- Confettis de victoire ----
  const burstPieces = [];
  const burstPalette = [0x0033ff, 0xf05030, 0x00a878, 0xffc107, 0x10131c];
  for (let i = 0; i < 24; i++) {
    const mesh = new THREE.Mesh(
      new THREE.TetrahedronGeometry(0.07 + Math.random() * 0.04, 0),
      new THREE.MeshStandardMaterial({
        color: burstPalette[i % burstPalette.length],
        roughness: 0.66,
        flatShading: true,
      })
    );
    mesh.visible = false;
    mesh.userData = {};
    scene.add(mesh);
    burstPieces.push(mesh);
  }

  function spawnBurst(strength = 1) {
    for (const piece of burstPieces) {
      const data = piece.userData;
      piece.visible = true;
      piece.position.set(
        -1.62 + (Math.random() - 0.5) * 0.45,
        1.02 + Math.random() * 0.4,
        0.55 + (Math.random() - 0.5) * 0.36
      );
      piece.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      data.vx = (Math.random() - 0.5) * 0.075 * strength;
      data.vy = (0.038 + Math.random() * 0.045) * strength;
      data.vz = (Math.random() - 0.2) * 0.06 * strength;
      data.rx = (Math.random() - 0.5) * 0.22;
      data.ry = (Math.random() - 0.5) * 0.22;
      data.life = 1;
      piece.scale.setScalar(1);
    }
  }

  function hideBurst() {
    for (const piece of burstPieces) {
      piece.visible = false;
      piece.userData.life = 0;
    }
  }

  // ---- État ----
  let onSpinEnd = null;
  const state = {
    spinning: false,
    spinFrom: 0,
    spinTo: 0,
    spinStart: 0,
    spinDuration: 4.1,
    targetLevel: 0,
    shake: 0,
    hop: 0,
    highlighted: -1,
    time: 0,
    blink: 0,
    nextBlink: 2.2,
  };

  const api = {
    spinWheel() {
      if (state.spinning) return;
      state.targetLevel = Math.floor(Math.random() * LEVELS.length);
      const segment = Math.PI * 2 / LEVELS.length;
      const desired = Math.PI / 2 - (state.targetLevel + 0.5) * segment;
      const current = wheelGroup.rotation.z;
      const turns = Math.PI * 2 * (5 + Math.random() * 1.5);
      let delta = desired - current;
      delta = ((delta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      state.spinFrom = current;
      state.spinTo = current + turns + delta;
      state.spinStart = state.time;
      state.spinning = true;
    },
    highlightLevel(index) {
      state.highlighted = Number.isInteger(index) ? index : -1;
    },
    reactCorrect() {
      state.hop = 1.15;
      spawnBurst(0.9);
    },
    reactWrong() {
      state.shake = 1;
    },
    win() {
      state.hop = 1.7;
      spawnBurst(1.35);
    },
    reset() {
      state.shake = 0;
      state.hop = 0;
      state.spinning = false;
      state.highlighted = -1;
      fox.position.y = 0;
      fox.rotation.z = 0;
      hideBurst();
    },
    onSpinEnd(cb) {
      onSpinEnd = cb;
    },
  };

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cursor = { x: 0, y: 0 };

  if (!reduceMotion) {
    window.addEventListener('pointermove', (event) => {
      cursor.x = (event.clientX / window.innerWidth - 0.5) * 2;
      cursor.y = (event.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();
    state.time = time;

    const introT = reduceMotion ? 1 : Math.min(1, Math.max(0, (time - 0.2) / 2));
    const introEase = 1 - Math.pow(1 - introT, 3);

    let spinPulse = 1;
    if (state.spinning) {
      const t = Math.min(1, (time - state.spinStart) / state.spinDuration);
      const eased = 1 - Math.pow(1 - t, 4);
      wheelGroup.rotation.z = state.spinFrom + (state.spinTo - state.spinFrom) * eased;
      spinPulse = 1 + Math.sin(t * Math.PI) * 0.022;
      if (t >= 1) {
        state.spinning = false;
        wheelGroup.rotation.z = state.spinTo;
        onSpinEnd?.(state.targetLevel);
      }
    } else if (state.shake === 0) {
      wheelGroup.rotation.z += 0.0012 * introEase;
    }
    wheelGroup.scale.setScalar((0.84 + 0.16 * introEase) * spinPulse);

    if (!reduceMotion) {
      camera.position.x += (cursor.x * 0.34 - camera.position.x) * 0.035;
      camera.position.y += (2.05 + cursor.y * 0.13 - camera.position.y) * 0.035;
      camera.lookAt(cursor.x * 0.12, 1.28 + cursor.y * 0.07, 0);
    }

    if (time > state.nextBlink) {
      state.blink = 1;
      state.nextBlink = time + 2.4 + Math.random() * 3.4;
    }
    if (state.blink > 0) {
      state.blink = Math.max(0, state.blink - 0.14);
      const eyeScale = 1 - state.blink * 0.86;
      eyeL.scale.y = eyeScale;
      eyeR.scale.y = eyeScale;
      glintL.scale.y = eyeScale;
      glintR.scale.y = eyeScale;
    }

    const bounce = Math.sin(time * 1.8) * 0.022;
    fox.scale.setScalar(0.86 + 0.14 * introEase);
    fox.position.y = bounce - (1 - introEase) * 0.32 + state.hop * 0.32;
    if (state.hop > 0) {
      fox.position.y += Math.sin((1 - Math.min(1, state.hop)) * Math.PI) * 0.4;
      state.hop *= 0.9;
      if (state.hop < 0.015) state.hop = 0;
    }

    const earSway = Math.sin(time * 2.1) * 0.025;
    tail.rotation.y = Math.sin(time * 1.7) * 0.32;
    tail.rotation.z = 0.3 + Math.sin(time * 1.3) * 0.06;
    earL.rotation.z = 0.12 + earSway;
    earR.rotation.z = -0.12 - earSway;
    innerL.rotation.z = earL.rotation.z;
    innerR.rotation.z = earR.rotation.z;

    if (state.shake > 0) {
      fox.position.x = -1.62 + (Math.random() - 0.5) * 0.16;
      fox.rotation.z = (Math.random() - 0.5) * 0.06;
      state.shake *= 0.88;
      if (state.shake < 0.01) {
        state.shake = 0;
        fox.position.x = -1.62;
        fox.rotation.z = 0;
      }
    } else {
      fox.position.x = -1.62;
    }

    for (const shape of shapes) {
      shape.rotation.x += 0.002 * shape.userData.speed * 4;
      shape.rotation.y += 0.003 * shape.userData.speed * 4;
      shape.position.y = shape.userData.baseY + Math.sin(time * shape.userData.speed + shape.userData.phase) * 0.13;
    }

    for (const piece of burstPieces) {
      if (!piece.visible) continue;
      const data = piece.userData;
      data.life -= 0.014;
      if (data.life <= 0) {
        piece.visible = false;
        continue;
      }
      data.vy -= 0.0022;
      piece.position.x += data.vx;
      piece.position.y += data.vy;
      piece.position.z += data.vz;
      piece.rotation.x += data.rx;
      piece.rotation.y += data.ry;
      piece.scale.setScalar(data.life);
    }

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return api;
}
