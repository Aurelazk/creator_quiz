/**
 * scenes/main.ts — Scène principale du studio 3D (Three.js + Wanaka)
 * Construit le plateau, le public, les blocs de réponse, le timer et le bouton Play.
 */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LAYOUT } from '../layout.js';
import { visualProfile } from '../visual.js';

const COLOR = {
  room: '#180c2c',
  ceiling: '#0f0720',
  floor: '#150a28',
  tier: '#22103c',
  stage: '#2c1754',
  stagePlate: '#3a1f6b',
  metal: '#2a2338',
  neonPink: '#ff3f9d',
  neonCyan: '#41e2ff',
  neonGold: '#ffc93c',
  neonViolet: '#a86bff',
  seat: ['#1b2334', '#232c42', '#161c2b', '#2a3450'] as const,
} as const;

const hasDom = () => typeof document !== 'undefined';

function canvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): THREE.Texture {
  if (!hasDom()) {
    return new THREE.Texture();
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return new THREE.Texture();
  }
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** Peint le nom de l'option sur une face de bloc de cristal. */
export interface BlockLabel {
  readonly texture: THREE.Texture;
  readonly paint: (text: string, accent: string, hint: string) => void;
}

function createBlockLabel(): BlockLabel {
  let texture: THREE.Texture;
  let ctxRef: CanvasRenderingContext2D | null = null;
  if (hasDom()) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    ctxRef = canvas.getContext('2d');
    const canvasTextureSource = new THREE.CanvasTexture(canvas);
    canvasTextureSource.colorSpace = THREE.SRGBColorSpace;
    canvasTextureSource.anisotropy = 4;
    texture = canvasTextureSource;
  } else {
    texture = new THREE.DataTexture(new Uint8Array(4), 1, 1);
  }
  const paint = (text: string, accent: string, hint: string): void => {
    const ctx = ctxRef;
    if (!ctx) {
      return;
    }
    ctx.clearRect(0, 0, 512, 256);
    ctx.save();
    ctx.fillStyle = 'rgba(10, 5, 24, 0.55)';
    roundRect(ctx, 16, 16, 480, 224, 48);
    ctx.fill();
    ctx.lineWidth = 7;
    ctx.strokeStyle = accent;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 26;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Badge de touche.
    ctx.beginPath();
    ctx.arc(70, 128, 30, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.fill();
    ctx.fillStyle = '#140a24';
    ctx.font = 'bold 36px "Trebuchet MS", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(hint, 70, 132);

    // Nom de l'option, rétréci pour tenir.
    let size = 88;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    while (size > 34) {
      ctx.font = `bold ${size}px "Trebuchet MS", system-ui, sans-serif`;
      if (ctx.measureText(text).width <= 330) {
        break;
      }
      size -= 4;
    }
    ctx.shadowColor = accent;
    ctx.shadowBlur = 18;
    ctx.fillText(text, 290, 134);
    ctx.restore();
    texture.needsUpdate = true;
  };
  paint('', COLOR.neonGold, '1');
  return { texture, paint };
}

function createNoiseTexture(): THREE.Texture {
  const size = 128;
  if (!hasDom()) {
    return new THREE.Texture();
  }
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return new THREE.Texture();
  }
  ctx.fillStyle = '#8a8a8a';
  ctx.fillRect(0, 0, size, size);
  let seed = 991;
  const rand = (): number => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < 2600; i += 1) {
    const grey = 104 + Math.floor(rand() * 92);
    ctx.fillStyle = `rgb(${grey},${grey},${grey})`;
    ctx.fillRect(Math.floor(rand() * size), Math.floor(rand() * size), 2, 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.anisotropy = 4;
  return texture;
}

function createWallTexture(): THREE.Texture {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#1a0d30';
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 64) {
      for (let x = 0; x < w; x += 64) {
        const shade = 22 + ((x / 64 + y / 64) % 3) * 4;
        ctx.fillStyle = `rgb(${shade + 8},${shade},${shade + 22})`;
        ctx.fillRect(x + 3, y + 3, 58, 58);
        ctx.strokeStyle = 'rgba(168,107,255,0.22)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 3, y + 3, 58, 58);
        ctx.beginPath();
        ctx.arc(x + 32, y + 32, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,201,60,0.5)';
        ctx.fill();
      }
    }
  });
}

function createStageTexture(): THREE.Texture {
  return canvasTexture(1024, 1024, (ctx, w) => {
    const c = w / 2;
    ctx.fillStyle = '#1d1034';
    ctx.fillRect(0, 0, w, w);
    for (let i = 0; i < 9; i += 1) {
      ctx.beginPath();
      ctx.arc(c, c, 46 + i * 54, 0, Math.PI * 2);
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(168,107,255,0.34)' : 'rgba(255,201,60,0.16)';
      ctx.lineWidth = i % 2 === 0 ? 10 : 4;
      ctx.stroke();
    }
    for (let i = 0; i < 16; i += 1) {
      const a = (i / 16) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(c + Math.cos(a) * 96, c + Math.sin(a) * 96);
      ctx.lineTo(c + Math.cos(a) * 494, c + Math.sin(a) * 494);
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    const glow = ctx.createRadialGradient(c, c, 0, c, c, 280);
    glow.addColorStop(0, 'rgba(255,214,120,0.26)');
    glow.addColorStop(1, 'rgba(255,214,120,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(c, c, 280, 0, Math.PI * 2);
    ctx.fill();
  });
}

function createLedTexture(): THREE.Texture {
  return canvasTexture(1024, 512, (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#1a0b33');
    bg.addColorStop(1, '#3a0f4d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.045)';
    ctx.lineWidth = 2;
    for (let x = 0; x < w; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ff3f9d';
    ctx.shadowBlur = 40;
    ctx.fillStyle = '#ffd75e';
    ctx.font = 'bold 132px "Trebuchet MS", system-ui, sans-serif';
    ctx.fillText('GUESS', w / 2, 176);
    ctx.shadowColor = '#41e2ff';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 92px "Trebuchet MS", system-ui, sans-serif';
    ctx.fillText('THEIR ANSWER', w / 2, 300);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.font = 'bold 40px "Trebuchet MS", system-ui, sans-serif';
    ctx.fillText('PIXAR EDITION', w / 2, 396);

    for (let i = 0; i < 26; i += 1) {
      const x = ((i * 137) % 1000) + 12;
      const y = ((i * 271) % 470) + 20;
      const r = 2 + (i % 3);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.55)' : 'rgba(255,201,60,0.55)';
      ctx.fill();
    }
  });
}

function createGlowDisc(color: string, opacity: number): THREE.Texture {
  return canvasTexture(256, 256, (ctx, w) => {
    const c = w / 2;
    const g = ctx.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, color);
    g.addColorStop(0.55, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = opacity;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
  });
}

/** Types de partie de studio exposés à Play pour l'animation et l'interaction. */
export interface CrystalBlock {
  readonly group: THREE.Group;
  readonly body: THREE.Mesh;
  readonly core: THREE.Mesh;
  readonly halo: THREE.Mesh;
  readonly bodyMaterial: THREE.MeshPhysicalMaterial;
  readonly coreMaterial: THREE.MeshStandardMaterial;
  readonly label: BlockLabel;
}

export interface StudioSet {
  readonly crowd: THREE.Group;
  readonly root: THREE.Group;
  readonly stage: THREE.Mesh;
  readonly stagePlate: THREE.Mesh;
  readonly stageRim: THREE.Mesh;
  readonly ledWall: THREE.Mesh;
  readonly audience: THREE.InstancedMesh;
  readonly playButton: THREE.Group;
  readonly playButtonCap: THREE.Mesh;
  readonly playButtonRing: THREE.Mesh;
  readonly playButtonHalo: THREE.Mesh;
  readonly leftBlock: CrystalBlock;
  readonly rightBlock: CrystalBlock;
  readonly timer: THREE.Group;
  readonly timerSegments: THREE.InstancedMesh;
  readonly timerGlobe: THREE.Mesh;
  readonly castGroup: THREE.Group;
  readonly plinths: THREE.Group;
}

export function buildStudioSet(scope: { own<T extends { dispose(): void }>(value: T): T }, scene: THREE.Scene): StudioSet {
  const own = <T extends { dispose(): void }>(value: T): T => {
    scope.own(value);
    return value;
  };

  const root = new THREE.Group();
  root.name = 'StudioRoot';
  scene.add(root);

  // Coque non éclairée : la pièce reste un vide violet profond.
  const roomMaterial = own(
    new THREE.MeshBasicMaterial({ color: COLOR.room, side: THREE.BackSide }),
  );
  const room = new THREE.Mesh(
    own(new THREE.CylinderGeometry(30, 30, 24, 64, 1, true)),
    roomMaterial,
  );
  room.name = 'StudioShell';
  room.position.y = 11;
  root.add(room);

  const ceiling = new THREE.Mesh(
    own(new THREE.CircleGeometry(30, 64)),
    own(new THREE.MeshBasicMaterial({ color: COLOR.ceiling })),
  );
  ceiling.name = 'StudioCeiling';
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 17.5;
  root.add(ceiling);

  const floor = new THREE.Mesh(
    own(new THREE.CylinderGeometry(30, 30, 0.4, 64)),
    own(new THREE.MeshStandardMaterial({ color: COLOR.floor, roughness: 0.42, metalness: 0.35 })),
  );
  floor.name = 'StudioFloor';
  floor.position.y = -1.4;
  floor.receiveShadow = true;
  root.add(floor);

  // Public
  const seatGeometry = own(
    mergeGeometries([
      new THREE.BoxGeometry(0.48, 0.1, 0.46).translate(0, 0.32, 0),
      new THREE.BoxGeometry(0.48, 0.54, 0.09).translate(0, 0.6, -0.21),
      new THREE.BoxGeometry(0.14, 0.32, 0.14).translate(0, 0.16, 0),
    ]) ?? new THREE.BoxGeometry(0.48, 1, 0.48),
  );

  const placements: { x: number; y: number; z: number; yaw: number }[] = [];
  const rows = 9;
  for (let row = 0; row < rows; row += 1) {
    const radius = 10.6 + row * 1.95;
    const y = -1.2 + row * 0.62;
    const count = Math.floor((Math.PI * 2 * radius) / 1.12);
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2 + (row % 2 === 0 ? 0 : 0.035);
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;
      if (Math.abs(angle > Math.PI ? angle - Math.PI * 2 : angle) < 0.52 && radius < 16) {
        continue;
      }
      placements.push({ x, y, z, yaw: Math.atan2(-x, -z) });
    }
  }

  const audienceMaterial = own(
    new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.72, metalness: 0.08 }),
  );
  const audience = new THREE.InstancedMesh(seatGeometry, audienceMaterial, placements.length);
  audience.name = 'Audience';
  audience.castShadow = false;
  audience.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const seatColor = new THREE.Color();
  placements.forEach((place, index) => {
    dummy.position.set(place.x, place.y, place.z);
    dummy.rotation.set(0, place.yaw, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    audience.setMatrixAt(index, dummy.matrix);
    seatColor.set(COLOR.seat[index % COLOR.seat.length] ?? '#3d2470');
    audience.setColorAt(index, seatColor);
  });
  audience.instanceMatrix.needsUpdate = true;
  if (audience.instanceColor) {
    audience.instanceColor.needsUpdate = true;
  }
  root.add(audience);

  // Foule stylisée
  const crowd = new THREE.Group();
  crowd.name = 'Crowd';
  audience.add(crowd);

  let crowdSeed = 20261115;
  const crowdRandom = (): number => {
    crowdSeed = (crowdSeed * 1103515245 + 12345) & 0x7fffffff;
    return crowdSeed / 0x7fffffff;
  };
  const pick = <T>(list: readonly T[]): T => list[Math.floor(crowdRandom() * list.length)] ?? list[0] as T;

  const SHIRT = ['#f4f1ea', '#2f7cff', '#ff8a3d', '#3ddc84', '#1b1626'] as const;
  const SKIN = ['#f7e6d2', '#eccfae', '#dcb894', '#c99b76'] as const;
  const HAIR = ['#141018', '#1b1626', '#2f7cff', '#ff8a3d'] as const;

  const bodyGeometry = own(
    mergeGeometries([
      new THREE.BoxGeometry(0.32, 0.2, 0.24).translate(0, 0.52, 0),
      new THREE.BoxGeometry(0.34, 0.42, 0.24).translate(0, 0.74, 0),
      new THREE.SphereGeometry(0.095, 6, 4).translate(-0.16, 0.88, 0),
      new THREE.SphereGeometry(0.095, 6, 4).translate(0.16, 0.88, 0),
      new THREE.BoxGeometry(0.085, 0.28, 0.085).rotateZ(0.12).translate(-0.215, 0.74, 0.01),
      new THREE.BoxGeometry(0.085, 0.28, 0.085).rotateZ(-0.12).translate(0.215, 0.74, 0.01),
      new THREE.BoxGeometry(0.075, 0.24, 0.075).rotateX(-1.15).translate(-0.19, 0.58, 0.1),
      new THREE.BoxGeometry(0.075, 0.24, 0.075).rotateX(-1.15).translate(0.19, 0.58, 0.1),
      new THREE.BoxGeometry(0.13, 0.14, 0.42).translate(-0.09, 0.52, 0.16),
      new THREE.BoxGeometry(0.13, 0.14, 0.42).translate(0.09, 0.52, 0.16),
      new THREE.BoxGeometry(0.1, 0.36, 0.11).translate(-0.09, 0.3, 0.33),
      new THREE.BoxGeometry(0.1, 0.36, 0.11).translate(0.09, 0.3, 0.33),
      new THREE.BoxGeometry(0.11, 0.07, 0.19).translate(-0.09, 0.09, 0.38),
      new THREE.BoxGeometry(0.11, 0.07, 0.19).translate(0.09, 0.09, 0.38),
    ]) ?? new THREE.BoxGeometry(0.42, 0.9, 0.3),
  );
  const headGeometry = own(
    new THREE.SphereGeometry(0.162, 10, 8).scale(1, 1.06, 0.98).translate(0, 1.07, 0),
  );
  const faceGeometry = own(
    mergeGeometries([
      new THREE.SphereGeometry(0.024, 5, 4).translate(-0.056, 1.09, 0.148),
      new THREE.SphereGeometry(0.024, 5, 4).translate(0.056, 1.09, 0.148),
    ]) ?? new THREE.SphereGeometry(0.024, 5, 4),
  );
  const hairGeometry = own(
    new THREE.SphereGeometry(0.172, 10, 8).scale(1, 0.78, 1).translate(0, 1.13, -0.012),
  );
  const hatGeometry = own(
    mergeGeometries([
      new THREE.CylinderGeometry(0.165, 0.17, 0.09, 10).translate(0, 1.23, 0),
      new THREE.CylinderGeometry(0.25, 0.25, 0.025, 10).translate(0, 1.19, 0.05),
    ]) ?? new THREE.CylinderGeometry(0.17, 0.17, 0.09, 10),
  );

  const fabricTexture = own(createNoiseTexture());
  const crowdMaterial = own(
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.78,
      roughnessMap: fabricTexture,
      metalness: 0.02,
    }),
  );
  const skinMaterial = own(
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.86,
      roughnessMap: fabricTexture,
      metalness: 0,
    }),
  );
  const hairMaterial = own(
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.62,
      roughnessMap: fabricTexture,
      metalness: 0.08,
    }),
  );
  const faceMaterial = own(
    new THREE.MeshStandardMaterial({ color: '#141018', roughness: 0.35, metalness: 0.1 }),
  );

  const occupied = placements.filter(() => crowdRandom() > 0.12);
  const bodies = new THREE.InstancedMesh(bodyGeometry, crowdMaterial, occupied.length);
  bodies.name = 'CrowdBodies';
  const heads = new THREE.InstancedMesh(headGeometry, skinMaterial, occupied.length);
  heads.name = 'CrowdHeads';
  const faces = new THREE.InstancedMesh(faceGeometry, faceMaterial, occupied.length);
  faces.name = 'CrowdFaces';
  const hair = new THREE.InstancedMesh(hairGeometry, hairMaterial, occupied.length);
  hair.name = 'CrowdHair';
  const hats = new THREE.InstancedMesh(hatGeometry, crowdMaterial, occupied.length);
  hats.name = 'CrowdHats';
  for (const mesh of [bodies, heads, faces, hair, hats]) {
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    crowd.add(mesh);
  }

  const personDummy = new THREE.Object3D();
  const hatDummy = new THREE.Object3D();
  const tint = new THREE.Color();
  occupied.forEach((place, index) => {
    const height = 0.92 + crowdRandom() * 0.18;
    const lean = (crowdRandom() - 0.5) * 0.12;
    personDummy.position.set(place.x, place.y, place.z);
    personDummy.rotation.set(0, place.yaw + (crowdRandom() - 0.5) * 0.18, 0);
    personDummy.scale.set(height, height, height);
    personDummy.updateMatrix();
    bodies.setMatrixAt(index, personDummy.matrix);
    heads.setMatrixAt(index, personDummy.matrix);
    faces.setMatrixAt(index, personDummy.matrix);
    hair.setMatrixAt(index, personDummy.matrix);

    bodies.setColorAt(index, tint.set(pick(SHIRT)));
    heads.setColorAt(index, tint.set(pick(SKIN)));
    hair.setColorAt(index, tint.set(pick(HAIR)));

    const wearsHat = crowdRandom() > 0.68;
    hatDummy.copy(personDummy);
    if (wearsHat) {
      hatDummy.rotation.z = lean;
      hatDummy.scale.setScalar(height);
    } else {
      hatDummy.scale.setScalar(0.0001);
    }
    hatDummy.updateMatrix();
    hats.setMatrixAt(index, hatDummy.matrix);
    hats.setColorAt(index, tint.set(pick(SHIRT)));
  });
  for (const mesh of [bodies, heads, faces, hair, hats]) {
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }

  // Plateformes de gradins fusionnées.
  const tierParts: THREE.BufferGeometry[] = [];
  for (let row = 0; row < rows; row += 1) {
    const radius = 10.6 + row * 1.95;
    const y = -1.2 + row * 0.62;
    const ring = new THREE.RingGeometry(radius - 1.05, radius + 1.0, 64, 1);
    ring.rotateX(-Math.PI / 2);
    ring.translate(0, y - 0.02, 0);
    tierParts.push(ring);
    const riser = new THREE.CylinderGeometry(radius - 1.05, radius - 1.05, 0.62, 64, 1, true);
    riser.translate(0, y - 0.33, 0);
    tierParts.push(riser);
  }
  const tierGeometry = own(mergeGeometries(tierParts) ?? new THREE.BufferGeometry());
  tierParts.forEach((part) => part.dispose());
  const tiers = new THREE.Mesh(
    tierGeometry,
    own(new THREE.MeshStandardMaterial({ color: COLOR.tier, roughness: 0.9, metalness: 0.1, side: THREE.DoubleSide })),
  );
  tiers.name = 'AudienceTiers';
  tiers.receiveShadow = true;
  root.add(tiers);

  // Scène
  const stage = new THREE.Mesh(
    own(new THREE.CylinderGeometry(LAYOUT.stageRadius, LAYOUT.stageRadius + 0.35, LAYOUT.stageHeight, 72)),
    own(new THREE.MeshStandardMaterial({ color: COLOR.stage, roughness: 0.5, metalness: 0.42 })),
  );
  stage.name = 'Stage';
  stage.position.y = -LAYOUT.stageHeight / 2;
  stage.receiveShadow = true;
  root.add(stage);

  const stageTexture = own(createStageTexture());
  const stagePlate = new THREE.Mesh(
    own(new THREE.CylinderGeometry(LAYOUT.stageRadius - 0.18, LAYOUT.stageRadius - 0.18, 0.07, 72)),
    own(
      new THREE.MeshStandardMaterial({
        map: stageTexture,
        emissiveMap: stageTexture,
        emissive: new THREE.Color('#ffffff'),
        emissiveIntensity: 0.6,
        roughness: 0.32,
        metalness: 0.4,
      }),
    ),
  );
  stagePlate.name = 'StagePlate';
  stagePlate.position.y = 0.035;
  stagePlate.receiveShadow = true;
  root.add(stagePlate);

  const stageRim = new THREE.Mesh(
    own(new THREE.TorusGeometry(LAYOUT.stageRadius - 0.1, 0.08, 10, 96)),
    own(
      new THREE.MeshStandardMaterial({
        color: '#22103c',
        emissive: new THREE.Color(COLOR.neonGold),
        emissiveIntensity: 2.6,
        roughness: 0.3,
      }),
    ),
  );
  stageRim.name = 'StageRim';
  stageRim.rotation.x = -Math.PI / 2;
  stageRim.position.y = 0.06;
  root.add(stageRim);

  // Plinthes des animateurs.
  const plinths = new THREE.Group();
  plinths.name = 'CastPlinths';
  const plinthGeometry = own(new THREE.CylinderGeometry(0.92, 1.02, 0.55, 32));
  const plinthMaterial = own(
    new THREE.MeshStandardMaterial({ color: '#331a5e', roughness: 0.35, metalness: 0.55 }),
  );
  const plinthRimGeometry = own(new THREE.TorusGeometry(0.94, 0.035, 8, 40));
  const plinthRimMaterial = own(
    new THREE.MeshStandardMaterial({
      color: '#2a1550',
      emissive: new THREE.Color(COLOR.neonGold),
      emissiveIntensity: 1.3,
      roughness: 0.4,
    }),
  );
  for (const spot of [LAYOUT.host, LAYOUT.coHost]) {
    const plinth = new THREE.Mesh(plinthGeometry, plinthMaterial);
    plinth.position.set(spot.x, 0.275, spot.z);
    plinth.receiveShadow = true;
    plinth.castShadow = true;
    plinths.add(plinth);
    const rim = new THREE.Mesh(plinthRimGeometry, plinthRimMaterial);
    rim.rotation.x = -Math.PI / 2;
    rim.position.set(spot.x, 0.56, spot.z);
    plinths.add(rim);
  }
  root.add(plinths);

  // Mur du fond
  const wallTexture = own(createWallTexture());
  wallTexture.wrapS = THREE.RepeatWrapping;
  wallTexture.wrapT = THREE.RepeatWrapping;
  wallTexture.repeat.set(3, 1.4);
  const backWall = new THREE.Mesh(
    own(new THREE.BoxGeometry(27, 11.5, 0.6)),
    own(
      new THREE.MeshStandardMaterial({
        map: wallTexture,
        emissiveMap: wallTexture,
        emissive: new THREE.Color('#ffffff'),
        emissiveIntensity: 0.32,
        color: '#b7a6d8',
        roughness: 0.9,
        metalness: 0.12,
      }),
    ),
  );
  backWall.name = 'BackWall';
  backWall.position.set(0, 5.2, -11.6);
  backWall.receiveShadow = true;
  root.add(backWall);

  const ledTexture = own(createLedTexture());
  const ledWall = new THREE.Mesh(
    own(new THREE.PlaneGeometry(15, 6.6)),
    own(
      new THREE.MeshStandardMaterial({
        map: ledTexture,
        emissiveMap: ledTexture,
        emissive: new THREE.Color('#ffffff'),
        emissiveIntensity: 0.9,
        roughness: 0.6,
        metalness: 0,
      }),
    ),
  );
  ledWall.name = 'LedWall';
  ledWall.position.set(0, 4.6, -11.2);
  root.add(ledWall);

  const ledGlow = new THREE.Mesh(
    own(new THREE.PlaneGeometry(17.4, 8.6)),
    own(
      new THREE.MeshBasicMaterial({
        map: own(createGlowDisc('rgba(255,80,170,0.30)', 1)),
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    ),
  );
  ledGlow.name = 'LedWallGlow';
  ledGlow.position.set(0, 4.6, -11.35);
  root.add(ledGlow);

  const archSpecs: { radius: number; tube: number; color: string }[] = [
    { radius: 5.4, tube: 0.1, color: COLOR.neonCyan },
    { radius: 7.0, tube: 0.12, color: COLOR.neonPink },
    { radius: 8.7, tube: 0.14, color: COLOR.neonGold },
  ];
  for (const spec of archSpecs) {
    const arch = new THREE.Mesh(
      own(new THREE.TorusGeometry(spec.radius, spec.tube, 10, 72, Math.PI)),
      own(
        new THREE.MeshStandardMaterial({
          color: '#1b0f31',
          emissive: new THREE.Color(spec.color),
          emissiveIntensity: 2.8,
          roughness: 0.35,
        }),
      ),
    );
    arch.name = `NeonArch${spec.radius}`;
    arch.position.set(0, 0.05, -10.6);
    root.add(arch);
  }

  const stripGeometry = own(new THREE.BoxGeometry(0.14, 9, 0.14));
  for (const x of [-8.6, 8.6]) {
    const strip = new THREE.Mesh(
      stripGeometry,
      own(
        new THREE.MeshStandardMaterial({
          color: '#1b0f31',
          emissive: new THREE.Color(COLOR.neonViolet),
          emissiveIntensity: 2.4,
          roughness: 0.4,
        }),
      ),
    );
    strip.name = `NeonStrip${x < 0 ? 'Left' : 'Right'}`;
    strip.position.set(x, 4.6, -10.9);
    root.add(strip);
  }

  // Truss
  const truss = new THREE.Group();
  truss.name = 'Truss';
  const trussMaterial = own(new THREE.MeshStandardMaterial({ color: COLOR.metal, roughness: 0.6, metalness: 0.7 }));
  for (const spec of [{ radius: 12.5, y: 9.2 }, { radius: 19.5, y: 11.6 }]) {
    const ring = new THREE.Mesh(own(new THREE.TorusGeometry(spec.radius, 0.09, 6, 64)), trussMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = spec.y;
    truss.add(ring);
  }
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    const beam = new THREE.Mesh(own(new THREE.BoxGeometry(0.13, 0.13, 13.4)), trussMaterial);
    beam.position.set(Math.sin(angle) * 14.3, 9.2, Math.cos(angle) * 14.3);
    beam.rotation.y = angle;
    truss.add(beam);
  }
  const fixtureGeometry = own(new THREE.CylinderGeometry(0.24, 0.36, 0.72, 12));
  const fixtureMaterial = own(new THREE.MeshStandardMaterial({ color: '#241d33', roughness: 0.5, metalness: 0.6 }));
  const lensMaterial = own(
    new THREE.MeshStandardMaterial({ color: '#100a1c', emissive: new THREE.Color('#ffd9a3'), emissiveIntensity: 3.4 }),
  );
  const lensGeometry = own(new THREE.CircleGeometry(0.2, 16));
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2 + 0.4;
    const x = Math.sin(angle) * 9.6;
    const z = Math.cos(angle) * 9.6;
    const fixture = new THREE.Mesh(fixtureGeometry, fixtureMaterial);
    fixture.position.set(x, 8.5, z);
    fixture.rotation.set(0.42 * Math.cos(angle), angle, 0.42 * Math.sin(angle));
    truss.add(fixture);
    const lens = new THREE.Mesh(lensGeometry, lensMaterial);
    lens.position.set(x, 8.12, z);
    lens.rotation.x = Math.PI / 2;
    truss.add(lens);
  }
  root.add(truss);

  const pinkLight = new THREE.PointLight(new THREE.Color(COLOR.neonPink), 42, 20, 2);
  pinkLight.name = 'PinkPractical';
  pinkLight.position.set(-6.5, 4.6, 1.5);
  root.add(pinkLight);
  const cyanLight = new THREE.PointLight(new THREE.Color(COLOR.neonCyan), 34, 20, 2);
  cyanLight.name = 'CyanPractical';
  cyanLight.position.set(6.5, 4.6, 1.5);
  root.add(cyanLight);

  // Bouton Play
  const playButton = new THREE.Group();
  playButton.name = 'PlayButton';
  playButton.position.set(LAYOUT.playButton.x, LAYOUT.playButton.y, LAYOUT.playButton.z);
  root.add(playButton);

  const base = new THREE.Mesh(
    own(new THREE.CylinderGeometry(1.85, 2.0, 0.26, 48)),
    own(new THREE.MeshStandardMaterial({ color: '#241040', roughness: 0.35, metalness: 0.65 })),
  );
  base.position.y = -0.05;
  base.receiveShadow = true;
  playButton.add(base);

  const playButtonCap = new THREE.Mesh(
    own(new THREE.CylinderGeometry(1.34, 1.42, 0.46, 48)),
    own(
      new THREE.MeshPhysicalMaterial({
        color: '#d41736',
        roughness: 0.28,
        metalness: 0.08,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        emissive: new THREE.Color('#4d0010'),
        emissiveIntensity: 0.22,
      }),
    ),
  );
  playButtonCap.name = 'PlayButtonCap';
  playButtonCap.position.y = 0.28;
  playButtonCap.castShadow = true;
  playButtonCap.receiveShadow = true;
  playButton.add(playButtonCap);

  const playButtonRing = new THREE.Mesh(
    own(new THREE.TorusGeometry(1.42, 0.07, 10, 64)),
    own(
      new THREE.MeshStandardMaterial({
        color: '#2a1550',
        emissive: new THREE.Color(COLOR.neonGold),
        emissiveIntensity: 1.5,
        roughness: 0.3,
      }),
    ),
  );
  playButtonRing.name = 'PlayButtonRing';
  playButtonRing.rotation.x = -Math.PI / 2;
  playButtonRing.position.y = 0.5;
  playButton.add(playButtonRing);

  const playShape = new THREE.Shape();
  playShape.moveTo(-0.34, -0.42);
  playShape.lineTo(0.46, 0);
  playShape.lineTo(-0.34, 0.42);
  playShape.closePath();
  const glyph = new THREE.Mesh(
    own(new THREE.ExtrudeGeometry(playShape, { depth: 0.1, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 })),
    own(
      new THREE.MeshStandardMaterial({
        color: '#fff6d8',
        emissive: new THREE.Color('#ffe9a8'),
        emissiveIntensity: 1.1,
        roughness: 0.2,
      }),
    ),
  );
  glyph.name = 'PlayGlyph';
  glyph.rotation.x = -Math.PI / 2;
  glyph.position.y = 0.53;
  playButton.add(glyph);

  const playButtonHalo = new THREE.Mesh(
    own(new THREE.PlaneGeometry(6.4, 6.4)),
    own(
      new THREE.MeshBasicMaterial({
        map: own(createGlowDisc('rgba(255,70,90,0.55)', 1)),
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    ),
  );
  playButtonHalo.name = 'PlayButtonHalo';
  playButtonHalo.rotation.x = -Math.PI / 2;
  playButtonHalo.position.y = 0.02;
  playButton.add(playButtonHalo);

  // Blocs de réponse
  const blockGeometry = own(
    new RoundedBoxGeometry(LAYOUT.blockSize.x, LAYOUT.blockSize.y, LAYOUT.blockSize.z, 4, 0.14),
  );
  const coreGeometry = own(
    new RoundedBoxGeometry(LAYOUT.blockSize.x - 0.42, LAYOUT.blockSize.y - 0.34, 0.22, 3, 0.08),
  );
  const labelGeometry = own(new THREE.PlaneGeometry(2.3, 1.15));
  const haloGeometry = own(new THREE.PlaneGeometry(4.4, 4.4));
  const haloTexture = own(createGlowDisc('rgba(120,220,255,0.6)', 1));

  const makeBlock = (
    side: 'left' | 'right',
    position: { x: number; y: number; z: number },
    color: string,
    glow: string,
  ): CrystalBlock => {
    const group = new THREE.Group();
    group.name = side === 'left' ? 'AnswerBlockLeft' : 'AnswerBlockRight';
    group.position.set(position.x, position.y, position.z);
    group.rotation.x = -0.13;
    root.add(group);

    const bodyMaterial = own(
      new THREE.MeshPhysicalMaterial({
        color,
        emissive: new THREE.Color(glow),
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.86,
        roughness: 0.09,
        metalness: 0.05,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
        ior: 1.6,
      }),
    );
    const body = new THREE.Mesh(blockGeometry, bodyMaterial);
    body.name = `${group.name}Body`;
    body.castShadow = true;
    group.add(body);

    const coreMaterial = own(
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        emissive: new THREE.Color(glow),
        emissiveIntensity: 1.9,
        transparent: true,
        opacity: 0.85,
        roughness: 0.5,
      }),
    );
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.name = `${group.name}Core`;
    group.add(core);

    const label = createBlockLabel();
    own(label.texture);
    const labelMesh = new THREE.Mesh(
      labelGeometry,
      own(
        new THREE.MeshBasicMaterial({
          map: label.texture,
          transparent: true,
          depthWrite: false,
          toneMapped: false,
        }),
      ),
    );
    labelMesh.name = `${group.name}Label`;
    labelMesh.position.set(0, 0.02, LAYOUT.blockSize.z / 2 + 0.03);
    group.add(labelMesh);

    const halo = new THREE.Mesh(
      haloGeometry,
      own(
        new THREE.MeshBasicMaterial({
          map: haloTexture,
          transparent: true,
          opacity: 0.5,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          color: new THREE.Color(glow),
        }),
      ),
    );
    halo.name = `${group.name}Halo`;
    halo.rotation.x = -Math.PI / 2;
    halo.position.set(0, -position.y + 0.06, 0);
    group.add(halo);

    return { group, body, core, halo, bodyMaterial, coreMaterial, label };
  };

  const leftBlock = makeBlock('left', LAYOUT.blockLeft, '#38d6ff', '#0bb7ff');
  const rightBlock = makeBlock('right', LAYOUT.blockRight, '#ff5fb2', '#ff1f8f');

  // Timer
  const timer = new THREE.Group();
  timer.name = 'ScoreTimer';
  timer.position.set(LAYOUT.timer.x, LAYOUT.timer.y, LAYOUT.timer.z);
  root.add(timer);

  const globeTexture = own(
    canvasTexture(512, 256, (ctx, w, h) => {
      const ocean = ctx.createLinearGradient(0, 0, 0, h);
      ocean.addColorStop(0, '#1f8fff');
      ocean.addColorStop(1, '#0b4bb5');
      ctx.fillStyle = ocean;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(90, 240, 180, 0.92)';
      const blobs = [
        [70, 90, 46, 26], [120, 150, 38, 30], [250, 74, 56, 24],
        [268, 128, 30, 20], [380, 96, 52, 30], [430, 160, 26, 18],
      ] as const;
      for (const blob of blobs) {
        ctx.beginPath();
        ctx.ellipse(blob[0], blob[1], blob[2], blob[3], 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }),
  );
  const timerGlobe = new THREE.Mesh(
    own(new THREE.SphereGeometry(0.62, 32, 24)),
    own(
      new THREE.MeshStandardMaterial({
        map: globeTexture,
        emissiveMap: globeTexture,
        emissive: new THREE.Color('#5fc8ff'),
        emissiveIntensity: 0.7,
        roughness: 0.45,
        metalness: 0.2,
      }),
    ),
  );
  timerGlobe.name = 'TimerGlobe';
  timer.add(timerGlobe);

  const wire = new THREE.Mesh(
    own(new THREE.SphereGeometry(0.64, 14, 10)),
    own(
      new THREE.MeshBasicMaterial({
        color: '#9fe8ff',
        wireframe: true,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      }),
    ),
  );
  wire.name = 'TimerGlobeWire';
  timer.add(wire);

  const trackRing = new THREE.Mesh(
    own(new THREE.TorusGeometry(1.02, 0.022, 6, 72)),
    own(
      new THREE.MeshStandardMaterial({
        color: '#1a0f30',
        emissive: new THREE.Color('#5b3fa8'),
        emissiveIntensity: 1.2,
        roughness: 0.5,
      }),
    ),
  );
  trackRing.name = 'TimerTrack';
  timer.add(trackRing);

  const segmentCount = 44;
  const segmentGeometry = own(new RoundedBoxGeometry(0.07, 0.24, 0.07, 2, 0.02));
  const segmentMaterial = own(
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: 0.9,
      roughness: 0.35,
    }),
  );
  const timerSegments = new THREE.InstancedMesh(segmentGeometry, segmentMaterial, segmentCount);
  timerSegments.name = 'TimerSegments';
  timerSegments.frustumCulled = false;
  for (let i = 0; i < segmentCount; i += 1) {
    const angle = (i / segmentCount) * Math.PI * 2;
    dummy.position.set(Math.cos(angle) * 1.02, Math.sin(angle) * 1.02, 0);
    dummy.rotation.set(0, 0, angle - Math.PI / 2);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    timerSegments.setMatrixAt(i, dummy.matrix);
    timerSegments.setColorAt(i, new THREE.Color('#48ff9e'));
  }
  timerSegments.instanceMatrix.needsUpdate = true;
  if (timerSegments.instanceColor) {
    timerSegments.instanceColor.needsUpdate = true;
  }
  timer.add(timerSegments);

  const castGroup = new THREE.Group();
  castGroup.name = 'Cast';
  root.add(castGroup);

  return {
    root,
    stage,
    stagePlate,
    stageRim,
    ledWall,
    audience,
    crowd,
    playButton,
    playButtonCap,
    playButtonRing,
    playButtonHalo,
    leftBlock,
    rightBlock,
    timer,
    timerSegments,
    timerGlobe,
    castGroup,
    plinths,
  };
}
