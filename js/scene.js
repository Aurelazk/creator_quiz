// Scène 3D du quiz : lobby (gradins) <-> table (tableau + joueurs autour). Ne connaît pas le réseau.
import { PALETTE } from './config.js';
import { QUESTIONS, OPTIONS } from './questions.js';
import { makeCharacter, makeCrowd, col } from './character.js';
const T = THREE;
const std = (hex, o = {}) => new T.MeshStandardMaterial({ color: col(hex), roughness: .7, ...o });
const basic = (hex) => new T.MeshBasicMaterial({ color: col(hex) });
const MODES = { lobby: { bg: '#E4ECFF', hemi: .95, key: .85, cam: [0, 7.5, 12.5], look: [0, 1.4, -1.5] },
                table: { bg: '#0C1A4B', hemi: .5, key: .55, cam: [0, 11, 17], look: [0, 2.2, -1] } };
let renderer, scene, camera, hemi, key, getView, mode = 'lobby', mx = 0, camT = 1;
const lobbyG = new T.Group(), tableG = new T.Group(), chars = new Map();
const camP = new T.Vector3(), camL = new T.Vector3(), fromP = new T.Vector3(), fromL = new T.Vector3();
const bc = Object.assign(document.createElement('canvas'), { width: 1280, height: 640 }), bx = bc.getContext('2d');
const boardTex = new T.CanvasTexture(bc); boardTex.encoding = T.sRGBEncoding; boardTex.anisotropy = 4;
let boardKey = '';

function circle(hex, r, x, y, z) { const m = new T.Mesh(new T.CircleGeometry(r, 64), basic(hex)); m.position.set(x, y, z); return m; }

function buildLobby() {
  const floor = new T.Mesh(new T.PlaneGeometry(120, 80), std('#DDE5F7', { roughness: .85 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
  lobbyG.add(floor, circle('#0B35FE', 15, -8, 8, -19), circle('#00E472', 11, 9, 5, -18), circle('#FF4E20', 2.4, 2, 3.2, -17.5));
  const crowd = ['#8fa2d6', '#a9b8e0', '#7f93c9', '#9fd9bd', '#f2a58c', '#c6d0ee'];
  for (let r = 0; r < 5; r++) {
    const st = new T.Mesh(new T.BoxGeometry(15, .55 * (r + 1), 1.4), std('#C9D4F0')); st.position.set(0, .275 * (r + 1), -7 - r * 1.4); st.receiveShadow = st.castShadow = true; lobbyG.add(st);
    for (let i = 0; i < 14; i++) { const f = makeCrowd(crowd[(Math.random() * crowd.length) | 0]); f.position.set(-6.5 + i + (Math.random() - .5) * .3, .55 * (r + 1), -7 - r * 1.4); f.rotation.y = (Math.random() - .5) * .4; lobbyG.add(f); }
  }
}

function buildTable() {
  const floor = new T.Mesh(new T.CircleGeometry(28, 64), std('#10246B', { roughness: .35, metalness: .2 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
  const wall = new T.Mesh(new T.PlaneGeometry(70, 24), std('#0A1440', { roughness: .95 })); wall.position.set(0, 12, -14);
  const ring = new T.Mesh(new T.TorusGeometry(4.4, .06, 12, 96), basic('#00E472')); ring.rotation.x = Math.PI / 2; ring.position.y = .03;
  const top = new T.Mesh(new T.CylinderGeometry(3.9, 3.9, .18, 64), std('#F4F6FC', { roughness: .35 })); top.position.y = 1.35; top.castShadow = top.receiveShadow = true;
  const felt = new T.Mesh(new T.CircleGeometry(3.6, 64), std('#1A3DDB', { roughness: 1 })); felt.rotation.x = -Math.PI / 2; felt.position.y = 1.45; felt.receiveShadow = true;
  const rim = new T.Mesh(new T.TorusGeometry(3.92, .08, 14, 96), std('#00E472', { roughness: .4 })); rim.rotation.x = Math.PI / 2; rim.position.y = 1.4;
  const col1 = new T.Mesh(new T.CylinderGeometry(.6, .9, 1.3, 32), std('#0C1A4B')); col1.position.y = .65; col1.castShadow = true;
  const frame = new T.Mesh(new T.BoxGeometry(11.4, 5.8, .2), std('#00E472', { roughness: .4 })); frame.position.set(0, 5.4, -8.6);
  const board = new T.Mesh(new T.PlaneGeometry(11, 5.5), new T.MeshBasicMaterial({ map: boardTex })); board.position.set(0, 5.4, -8.48);
  [-5, 5].forEach((x) => { const b = new T.Mesh(new T.BoxGeometry(.5, 40, .5), basic(x < 0 ? '#0B35FE' : '#FF4E20')); b.position.set(x * 3, 0, -13.5); tableG.add(b); });
  const spot = new T.SpotLight(0xfff1dc, 1.3, 0, .8, .6, 1); spot.position.set(0, 14, 6); spot.target.position.set(0, 1, 0);
  tableG.add(floor, wall, ring, top, felt, rim, col1, frame, board, spot, spot.target);
}

function wrap(text, maxW) {
  const words = text.split(' '), lines = []; let cur = '';
  words.forEach((w) => { const t = cur ? cur + ' ' + w : w; if (bx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
  lines.push(cur); return lines;
}
function rrect(x, y, w, h, r, fill) { bx.beginPath(); bx.roundRect ? bx.roundRect(x, y, w, h, r) : bx.rect(x, y, w, h); bx.fillStyle = fill; bx.fill(); }

function drawBoard(pub, secs) {
  bx.clearRect(0, 0, 1280, 640); bx.fillStyle = '#0B35FE'; bx.fillRect(0, 0, 1280, 640);
  bx.fillStyle = '#00E472'; bx.beginPath(); bx.ellipse(1180, 620, 430, 220, -.3, 0, 7); bx.fill();
  rrect(36, 96, 1208, 508, 30, '#FFFFFF');
  bx.textBaseline = 'alphabetic'; bx.fillStyle = '#fff'; bx.font = '800 46px Poppins, Arial'; bx.textAlign = 'left'; bx.fillText('CREATOR', 48, 64);
  bx.fillStyle = '#00E472'; bx.fillRect(48, 74, 120, 6);
  if (pub) {
    bx.textAlign = 'right'; bx.fillStyle = '#fff'; bx.font = '600 30px Poppins, Arial';
    bx.fillText(pub.phase === 'end' ? 'Classement' : 'Question ' + (pub.qi + 1) + ' / ' + pub.total, 1232, 60);
    bx.textAlign = 'center';
    if (pub.phase === 'end') {
      const top = [...pub.players].sort((a, b) => b.score - a.score).slice(0, 3), medals = ['🥇', '🥈', '🥉'];
      bx.fillStyle = '#0C1A4B'; bx.font = '800 56px Poppins, Arial'; bx.fillText('Partie terminée !', 640, 200);
      bx.font = '700 46px Poppins, Arial';
      top.forEach((p, i) => bx.fillText(medals[i] + ' ' + p.name + ' — ' + p.score + ' pts', 640, 300 + i * 90));
    } else {
      const q = QUESTIONS[pub.qi], rev = pub.phase === 'reveal';
      bx.fillStyle = '#0C1A4B'; bx.font = '800 50px Poppins, Arial';
      wrap(q.q, 1080).slice(0, 3).forEach((l, i) => bx.fillText(l, 640, 180 + i * 62));
      OPTIONS.forEach((o, i) => {
        const dim = rev && pub.correct !== i, x = 76 + i * 590;
        bx.globalAlpha = dim ? .3 : 1; rrect(x, 350, 540, 140, 28, i === 0 ? '#00E472' : '#FF4E20');
        bx.fillStyle = i === 0 ? '#0C1A4B' : '#fff'; bx.font = '800 64px Poppins, Arial';
        bx.fillText((rev && pub.correct === i ? '✓ ' : '') + o + (rev ? '  ' + pub.counts[i] : ''), x + 270, 440); bx.globalAlpha = 1;
      });
      if (rev) { bx.fillStyle = '#0C1A4B'; bx.font = '600 30px Poppins, Arial'; bx.fillText(q.why, 640, 560); }
      else {
        rrect(76, 540, 1128, 24, 12, '#E4ECFF'); rrect(76, 540, Math.max(24, 1128 * secs / 15), 24, 12, secs < 5 ? '#FF4E20' : '#0B35FE');
        bx.fillStyle = '#0C1A4B'; bx.font = '600 26px Poppins, Arial'; bx.fillText(pub.answered.length + ' / ' + pub.players.length + ' ont répondu', 640, 592);
      }
    }
  }
  boardTex.needsUpdate = true;
}

const layout = {
  lobby: (i) => { if (!i) return { x: 0, z: 0, r: 0 }; const a = i * 2.39996, d = 1.4 + Math.sqrt(i) * 1.15; return { x: Math.sin(a) * d, z: Math.cos(a) * d * .8, r: (Math.random() - .5) * .5 }; },
  table: (i, n) => { const a = 2 * Math.PI * (i + .5) / n; return { x: Math.sin(a) * 5.1, z: Math.cos(a) * 5.1, r: a + Math.PI, a }; }
};

export function initScene(container, gv) {
  getView = gv; scene = new T.Scene();
  renderer = new T.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; container.appendChild(renderer.domElement);
  camera = new T.PerspectiveCamera(40, innerWidth / innerHeight, .1, 200);
  hemi = new T.HemisphereLight(0xffffff, 0x8aa0ff, .9); key = new T.DirectionalLight(0xffffff, .85); key.position.set(6, 14, 10); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 50 }); key.shadow.bias = -.0004;
  scene.add(hemi, key, lobbyG, tableG); scene.fog = new T.Fog(0xffffff, 40, 90);
  buildLobby(); buildTable(); setMode('lobby', true); drawBoard(null, 0);
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
  addEventListener('pointermove', (e) => { mx = (e.clientX / innerWidth - .5) * 2; });
  document.fonts?.ready.then(() => { boardKey = ''; });
  let last = performance.now();
  (function loop(now) { const dt = Math.min(.05, (now - last) / 1000); last = now; frame(now / 1000, dt); requestAnimationFrame(loop); })(last);
}

function setMode(m, instant) {
  mode = m; const c = MODES[m];
  lobbyG.visible = m === 'lobby'; tableG.visible = m === 'table';
  scene.background = col(c.bg); scene.fog.color.copy(col(c.bg)); hemi.intensity = c.hemi; key.intensity = c.key;
  fromP.copy(camP); fromL.copy(camL); camT = instant ? 1 : 0;
  if (instant) { camP.set(...c.cam); camL.set(...c.look); }
}

export function sync(pub, meId) {
  const list = pub && pub.phase !== 'closed' ? pub.players : [];
  const m = pub && pub.phase !== 'lobby' && pub.phase !== 'closed' ? 'table' : 'lobby';
  if (m !== mode) setMode(m);
  const ids = new Set(list.map((p) => p.id));
  chars.forEach((c, id) => { if (!ids.has(id)) { scene.remove(c.group); tableG.remove(c.pad); chars.delete(id); } });
  const ranks = pub && pub.phase === 'end' ? [...list].sort((a, b) => b.score - a.score).map((p) => p.id) : [];
  list.forEach((p, i) => {
    let c = chars.get(p.id);
    if (!c) {
      const hex = PALETTE[p.ci % PALETTE.length], ch = makeCharacter(hex);
      const pad = new T.Mesh(new T.CylinderGeometry(.34, .34, .06, 32), new T.MeshStandardMaterial({ color: col(hex), emissive: col(hex), emissiveIntensity: .1 }));
      c = { ...ch, pad, hex, ph: Math.random() * 6, lobby: layout.lobby(i), anim: 'idle' }; chars.set(p.id, c); scene.add(c.group); tableG.add(pad);
      const sp = labelSprite(p.name, p.id === meId); c.group.add(sp);
    }
    c.table = layout.table(i, list.length); c.pad.position.set(Math.sin(c.table.a) * 3.1, 1.5, Math.cos(c.table.a) * 3.1);
    const res = pub.results && pub.results[p.id];
    c.anim = res ? (res.ok ? 'win' : 'lose') : (pub.phase === 'end' && ranks.indexOf(p.id) === 0 ? 'win' : 'idle');
    const mat = c.pad.material, glow = pub.answered && pub.answered.includes(p.id);
    mat.emissiveIntensity = res ? (res.ok ? 1.4 : .05) : glow ? 1.2 : .1;
  });
}

function labelSprite(text, me) {
  const c = Object.assign(document.createElement('canvas'), { width: 256, height: 64 }), x = c.getContext('2d');
  x.font = '700 32px Poppins, Arial'; x.textAlign = 'center'; x.lineWidth = 6; x.strokeStyle = 'rgba(12,26,75,.8)'; x.strokeText(text, 128, 42);
  x.fillStyle = me ? '#FFC83D' : '#fff'; x.fillText(text, 128, 42);
  const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding;
  const s = new T.Sprite(new T.SpriteMaterial({ map: t, transparent: true, depthTest: false })); s.scale.set(1.9, .48, 1); s.position.y = 3.15; return s;
}

function frame(t, dt) {
  const c = MODES[mode]; camT = Math.min(1, camT + dt / 1.3); const k = camT * camT * (3 - 2 * camT);
  const tp = new T.Vector3(...c.cam), tl = new T.Vector3(...c.look);
  camera.position.lerpVectors(fromP.lengthSq() ? fromP : tp, tp, k); camera.position.x += mx * 2.2;
  camera.lookAt(new T.Vector3().lerpVectors(fromL.lengthSq() ? fromL : tl, tl, k));
  if (camT >= 1) { camP.copy(tp); camL.copy(tl); }
  chars.forEach((ch) => {
    const tg = mode === 'table' ? ch.table : ch.lobby, g = ch.group, f = 1 - Math.pow(.001, dt);
    g.position.x += (tg.x - g.position.x) * f; g.position.z += (tg.z - g.position.z) * f; g.rotation.y += (tg.r - g.rotation.y) * f;
    const r = ch.rig; r.rotation.z = 0;
    if (ch.anim === 'win') r.position.y = Math.abs(Math.sin(t * 6 + ch.ph)) * .4;
    else if (ch.anim === 'lose') { r.position.y = 0; r.rotation.z = Math.sin(t * 10) * .05; }
    else { r.position.y = Math.abs(Math.sin(t * 1.4 + ch.ph)) * .03; }
  });
  const v = getView(), secs = Math.ceil(v.remaining / 1000), p = v.pub;
  const bk = p ? [p.phase, p.qi, secs, p.answered && p.answered.length, p.players.length].join('|') : 'none';
  if (bk !== boardKey) { boardKey = bk; drawBoard(p && p.phase !== 'lobby' ? p : null, v.remaining / 1000); }
  renderer.render(scene, camera);
}
