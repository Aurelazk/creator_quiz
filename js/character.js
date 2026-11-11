// Perso "argile" lisse et sans visage, bras croisés (fidèle à la référence). Partagé par l'intro et la scène.
const T = THREE;
export const col = (hex) => new T.Color(hex).convertSRGBToLinear(); // couleurs de marque exactes
const cache = {};
const capGeo = (r, h) => cache['c' + r + h] || (cache['c' + r + h] = (() => {
  const p = [], n = 14;
  for (let i = 0; i <= n; i++) { const a = i / n * Math.PI / 2; p.push(new T.Vector2(Math.sin(a) * r, -Math.cos(a) * r)); }
  for (let i = 0; i <= n; i++) { const a = i / n * Math.PI / 2; p.push(new T.Vector2(Math.cos(a) * r, h + Math.sin(a) * r)); }
  return new T.LatheGeometry(p, 32);
})());
const sphGeo = (r) => cache['s' + r] || (cache['s' + r] = new T.SphereGeometry(r, 36, 28));
const shadowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c); })();

export function makeCharacter(hex) {
  const group = new T.Group(), rig = new T.Group();
  const mat = new T.MeshStandardMaterial({ color: col(hex), roughness: 0.72, metalness: 0 });
  const add = (geo, x, y, z, rotZ = 0, s) => {
    const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.z = rotZ; if (s) m.scale.set(...s);
    m.castShadow = true; rig.add(m); return m;
  };
  [-1, 1].forEach((d) => { add(capGeo(.12, .55), d * .15, .2, 0); add(sphGeo(.17), d * .15, .1, .07, 0, [1, .62, 1.5]); }); // jambes + bottes
  add(capGeo(.27, .5), 0, .85, 0);                       // torse
  add(sphGeo(.52), 0, 2.03, 0, 0, [1, 1.1, 1]);          // grosse tête ronde
  [-1, 1].forEach((d) => {                                // bras croisés
    const z = d < 0 ? .31 : .38;
    add(capGeo(.085, .25), d * .33, 1.1, 0);              // bras
    add(capGeo(.075, .40), d * .305, 1.1, z, d * Math.PI / 2); // avant-bras
    add(sphGeo(.09), -d * .2, 1.1, z);                    // main
  });
  group.add(rig);
  const sh = new T.Mesh(new T.PlaneGeometry(1.5, 1.5), new T.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.015; group.add(sh);
  return { group, rig };
}

export function makeCrowd(hex) { // version légère pour les gradins
  const g = new T.Group(), m = new T.MeshStandardMaterial({ color: col(hex), roughness: .8 });
  const b = new T.Mesh(capGeo(.27, .5), m); b.position.y = .85; const h = new T.Mesh(sphGeo(.52), m); h.position.y = 2.03; h.scale.y = 1.1;
  g.add(b, h); g.scale.setScalar(.3); return g;
}
