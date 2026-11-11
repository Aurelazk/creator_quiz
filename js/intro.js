// Intro façon Pixar (Luxo Jr.) : le perso CREATOR arrive en sautillant dans le noir, écrase le "O"
// de CREATOR, puis la lumière s'allume. Cliquer = passer. Rendu réaliste (ombres douces, tone mapping).
import { makeCharacter, col } from './character.js';
const T = THREE, WORD = 'CREATOR', GAP = 1.5;
const clamp = (v) => Math.min(1, Math.max(0, v)), ease = (v) => v * v * (3 - 2 * v), lerp = (a, b, k) => a + (b - a) * k;

function slabGeo(w, h, r, d) {
  const s = new T.Shape();
  s.moveTo(-w / 2 + r, 0); s.lineTo(w / 2 - r, 0); s.quadraticCurveTo(w / 2, 0, w / 2, r); s.lineTo(w / 2, h - r);
  s.quadraticCurveTo(w / 2, h, w / 2 - r, h); s.lineTo(-w / 2 + r, h); s.quadraticCurveTo(-w / 2, h, -w / 2, h - r);
  s.lineTo(-w / 2, r); s.quadraticCurveTo(-w / 2, 0, -w / 2 + r, 0);
  return new T.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelSize: .06, bevelThickness: .06, bevelSegments: 4, curveSegments: 10 }).translate(0, 0, -d / 2);
}
function letterTex(ch, color) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.font = '800 190px Poppins, Arial Black, Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = color; x.fillText(ch, 128, 140);
  const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t;
}

export function playIntro(root, onDone) {
  const renderer = new T.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  root.appendChild(renderer.domElement);
  const scene = new T.Scene(), dark = col('#050B26'), light = col('#E4ECFF');
  scene.background = dark.clone();
  const camera = new T.PerspectiveCamera(34, innerWidth / innerHeight, .1, 100);
  const fit = () => { camera.aspect = innerWidth / innerHeight; camera.position.set(0, 2.7, Math.max(10.5, 20 / camera.aspect)); camera.lookAt(0, 1.1, 0); camera.updateProjectionMatrix(); };
  fit();
  const hemi = new T.HemisphereLight(0xffffff, 0x4a5fd0, .05), key = new T.DirectionalLight(0xfff3e0, 0);
  key.position.set(5, 10, 8); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.0004;
  Object.assign(key.shadow.camera, { left: -12, right: 12, top: 8, bottom: -8, near: 1, far: 40 });
  scene.add(hemi, key);

  const floor = new T.Mesh(new T.PlaneGeometry(60, 40), new T.MeshStandardMaterial({ color: col('#F4F6FC'), roughness: .55, metalness: .02 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  const letters = [...WORD].map((ch, i) => {
    const o = new T.Group(); o.position.set((i - 3) * GAP, .06, 0);
    const isO = i === 5;
    const slab = new T.Mesh(slabGeo(1.15, 1.5, .24, .5), new T.MeshStandardMaterial({ color: col(isO ? '#00E472' : '#FFFFFF'), roughness: .62 }));
    slab.castShadow = slab.receiveShadow = true; o.add(slab);
    const face = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: letterTex(ch, isO ? '#0C1A4B' : '#0B35FE'), transparent: true }));
    face.position.set(0, .75, .32); o.add(face); scene.add(o); return o;
  });
  const O = letters[5];
  const bar = new T.Mesh(new T.PlaneGeometry(10.4, .14), new T.MeshBasicMaterial({ color: col('#00E472') }));
  bar.rotation.x = -Math.PI / 2; bar.position.set(0, .012, 1.1); bar.scale.x = 0.001; scene.add(bar);

  const hero = makeCharacter('#0B35FE'); hero.group.scale.setScalar(.8); scene.add(hero.group);
  const lamp = new T.PointLight(0xbcd0ff, 1.6, 9, 1.6); lamp.position.set(0, 2.3, 1); hero.group.add(lamp); // la "lampe" du perso

  const HOP = .55, DIST = 1.73, X0 = -9, JUMP_T = 6 * HOP, LAND_T = JUMP_T + .7, XJ = X0 + 6 * DIST, TOP = 1.62;
  let t = 0, last = performance.now(), done = false, raf = 0;

  const frame = (now) => {
    const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt; let s = t - LAND_T;
    let x, y = 0, sq = 1, ry = Math.PI / 2;
    if (t < JUMP_T) {                                  // petits sauts
      const i = Math.floor(t / HOP), u = (t - i * HOP) / HOP;
      x = X0 + (i + u) * DIST; y = 4 * .8 * u * (1 - u); sq = (u < .12 || u > .88) ? .86 : 1;
    } else if (t < LAND_T) {                           // grand saut sur le "O"
      const u = (t - JUMP_T) / .7; x = lerp(XJ, 3, u); y = TOP * u * 1 + 4 * 1.1 * u * (1 - u);
    } else {                                           // atterrissage : le "O" s'écrase puis rebondit
      const sy = s < .12 ? 1 - .55 * (s / .12) : 1 - .55 * Math.exp(-(s - .12) * 5) * Math.cos((s - .12) * 16);
      O.scale.set(1 + (1 - sy) * .45, sy, 1 + (1 - sy) * .45);
      x = 3; y = 1.5 * sy + .12; ry = lerp(Math.PI / 2, 0, ease(clamp((s - .3) / .6)));
      if (s > 1.6) y += Math.abs(Math.sin((s - 1.6) * 7)) * .35 * clamp(2.6 - s);
    }
    hero.group.position.set(x, y, 0); hero.group.rotation.y = ry; hero.rig.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    const L = ease(clamp((s - .3) / 1.2));             // la lumière s'allume
    hemi.intensity = lerp(.05, .95, L); key.intensity = lerp(0, 1.05, L); lamp.intensity = lerp(1.6, 0, L);
    scene.background.copy(dark).lerp(light, L);
    bar.scale.x = Math.max(.001, ease(clamp((s - .8) / .9)));
    renderer.render(scene, camera);
    if (s > 2.7) return finish();
    raf = requestAnimationFrame(frame);
  };
  function finish() {
    if (done) return; done = true; cancelAnimationFrame(raf);
    root.classList.add('fade');
    setTimeout(() => { renderer.dispose(); root.remove(); onDone(); }, 600);
  }
  root.addEventListener('pointerdown', finish);
  addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); fit(); });
  raf = requestAnimationFrame(frame);
}
