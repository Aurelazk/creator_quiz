/* =====================================================================
   js/scene.js — plateau 3D (three r128)
   Uniquement des meshes GLB venant des assets Unity + géométrie minimale.
   ===================================================================== */
(function (global) {
  'use strict';

  const PALETTE = ['#0B35FE', '#FF4E20', '#00E472', '#FF7A00', '#2E85FF', '#0C1A4B', '#F4F6FC'];
  const SKIN = '#F4F6FC';
  const ACCENT = '#0C1A4B';
  const LIGHT_MODE_CROWD = 20;
  const CROWD_MAX = 50;

  /* ---------- matériau "argile" : sweat / peau / chaussures par bandes Y ---------- */
  const UNIFORM_DECL = 'uniform vec3 uSweat;\nuniform vec3 uSkin;\nuniform vec3 uAccent;\nuniform float uSkinY;\nuniform float uShoeY;\nvarying float vY;\n';
  const FRAG = [
    'vec3 bandCol = uSweat;',
    'if (vY > uSkinY) bandCol = uSkin;',
    'else if (vY < uShoeY) bandCol = uAccent;',
    'vec4 diffuseColor = vec4( bandCol, opacity );',
  ].join('\n');

  const matCache = new Map();
  function clayMaterial(sweat, bbox) {
    const key = sweat;
    if (matCache.has(key)) return matCache.get(key);
    const h = bbox.max.y - bbox.min.y;
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.72, metalness: 0.02, skinning: false });
    m.userData.clay = true;
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uSweat = { value: new THREE.Color(sweat) };
      shader.uniforms.uSkin = { value: new THREE.Color(SKIN) };
      shader.uniforms.uAccent = { value: new THREE.Color(ACCENT) };
      shader.uniforms.uSkinY = { value: bbox.min.y + h * 0.80 };
      shader.uniforms.uShoeY = { value: bbox.min.y + h * 0.10 };
      shader.vertexShader = UNIFORM_DECL + shader.vertexShader.replace(
        '#include <begin_vertex>', '#include <begin_vertex>\nvY = position.y;');
      shader.fragmentShader = UNIFORM_DECL + shader.fragmentShader.replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );', FRAG);
    };
    m.customProgramCacheKey = () => 'clay';
    matCache.set(key, m);
    return m;
  }

  function glowMaterial(color, opacity) {
    return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: opacity == null ? 0.16 : opacity, depthWrite: false });
  }

  /* ---------- étiquettes ---------- */
  function nameSprite(text, color) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(12,26,75,.82)';
    g.beginPath();
    const r = 18;
    g.moveTo(r, 4); g.lineTo(256 - r, 4); g.quadraticCurveTo(252, 4, 252, r + 4);
    g.lineTo(252, 60 - r); g.quadraticCurveTo(252, 60, 256 - r, 60);
    g.lineTo(r, 60); g.quadraticCurveTo(4, 60, 4, 60 - r);
    g.lineTo(4, r + 4); g.quadraticCurveTo(4, 4, r, 4);
    g.closePath(); g.fill();
    g.strokeStyle = color; g.lineWidth = 4; g.stroke();
    g.fillStyle = '#fff';
    g.font = 'bold 30px system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(text).slice(0, 12), 128, 33);
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    sp.scale.set(1.6, 0.4, 1);
    sp.renderOrder = 5;
    return sp;
  }

  /* ===================================================================== */
  const S = {
    ready: false, lightMode: false, mode: 'duel',
    renderer: null, scene: null, camera: null, clock: null,
    groupScene: null, podium: null, platform: null, floor: null,
    clips: null, crowdClips: null, crowdAnimByName: null,
    charCache: new Map(), charLoading: new Map(),
    players: new Map(), crowd: [], crowdSeats: [], crowdSlots: {},
    camBase: new THREE.Vector3(0, 8.2, 19), camLook: new THREE.Vector3(0, 3.1, -2),
    camPos: new THREE.Vector3(), camTarget: new THREE.Vector3(),
    pulseT: 0, fpsAcc: 0, fpsFrames: 0, fpsChecked: false,
    boardGlow: null,
    onPerf: null,

    /* ---------------- init ---------------- */
    init(canvas) {
      const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
      r.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
      r.setSize(global.innerWidth, global.innerHeight, false);
      r.shadowMap.enabled = true;
      r.shadowMap.type = THREE.PCFShadowMap;
      if (THREE.sRGBEncoding) r.outputEncoding = THREE.sRGBEncoding;
      S.renderer = r;

      const sc = new THREE.Scene();
      sc.background = new THREE.Color('#0C1A4B');
      sc.fog = new THREE.Fog('#0C1A4B', 34, 72);
      S.scene = sc;

      const cam = new THREE.PerspectiveCamera(44, global.innerWidth / global.innerHeight, 0.1, 200);
      S.camera = cam;
      S.camPos.copy(S.camBase);
      S.camTarget.copy(S.camLook);
      cam.position.copy(S.camPos);
      cam.lookAt(S.camTarget);

      sc.add(new THREE.HemisphereLight(0xdfe9ff, 0x1a2350, 0.95));
      const key = new THREE.DirectionalLight(0xffffff, 1.15);
      key.position.set(-8, 18, 12);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.camera.left = -16; key.shadow.camera.right = 16;
      key.shadow.camera.top = 16; key.shadow.camera.bottom = -16;
      key.shadow.camera.far = 60;
      key.shadow.bias = -0.0012;
      sc.add(key);
      const rim = new THREE.DirectionalLight('#2E85FF', 0.7);
      rim.position.set(10, 8, -14);
      sc.add(rim);
      const fill = new THREE.PointLight('#FF4E20', 0.5, 40);
      fill.position.set(0, 6, 10);
      sc.add(fill);

      // projecteur avec cône lumineux (pupitre / plateau actif)
      const spot = new THREE.SpotLight(0xffffff, 2.5, 45, 0.55, 0.6, 1);
      spot.position.set(0, 14, 6);
      spot.target.position.set(0, 1.5, 3);
      spot.castShadow = true;
      spot.shadow.mapSize.set(1024, 1024);
      spot.shadow.camera.near = 0.5; spot.shadow.camera.far = 45;
      sc.add(spot);
      sc.add(spot.target);
      S.spotLight = spot;

      // fond dégradé + texture de ciel fournie par l'UI Unity
      const bg = new THREE.Mesh(
        new THREE.PlaneGeometry(60, 22),
        new THREE.MeshBasicMaterial({ map: S.texture('assets/ui/sky.webp'), color: 0x5f7bd6 })
      );
      bg.position.set(0, 9, -15.5);
      sc.add(bg);

      S.clock = new THREE.Clock();
      global.addEventListener('resize', S.resize);
      S.loop();
    },

    texture(url, repeat) {
      const t = new THREE.TextureLoader().load(url);
      if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding;
      t.anisotropy = 4;
      if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
      return t;
    },

    resize() {
      if (!S.renderer) return;
      S.camera.aspect = global.innerWidth / global.innerHeight;
      S.camera.updateProjectionMatrix();
      S.renderer.setSize(global.innerWidth, global.innerHeight, false);
    },

    /* ---------------- chargement ---------------- */
    load(onProgress) {
      const loader = new THREE.GLTFLoader();
      if (THREE.DRACOLoader) {
        const d = new THREE.DRACOLoader();
        d.setDecoderPath('assets/vendor/draco/');
        loader.setDRACOLoader(d);
      }
      S.loader = loader;
      let done = 0;
      const step = (label) => (ev) => {
        if (ev && ev.total) {
          const pct = Math.min(1, ev.loaded / ev.total);
          onProgress && onProgress(label, pct);
        }
      };
      return Promise.all([
        new Promise((res, rej) => loader.load('assets/models/scene.glb', res, step('Plateau'), rej)),
        new Promise((res, rej) => loader.load('assets/models/char1.glb', res, step('Personnage'), rej)),
        new Promise((res, rej) => loader.load('assets/models/crowd.glb', res, step('Public'), rej)),
      ]).then(([gScene, gChar, gCrowd]) => {
        S.buildStage(gScene.scene);
        S.clips = gChar.animations || [];
        S.charCache.set(1, gChar.scene);
        S.crowdGeoSource = gCrowd.scene;
        S.crowdBBox = new THREE.Box3().setFromObject(gCrowd.scene);
        S.crowdAnimByName = new Map();
        (gCrowd.animations || []).forEach((clip) => S.crowdAnimByName.set(clip.name, clip));
        S.buildCrowd();
        S.ready = true;
        done++;
        return true;
      });
    },

    buildStage(root) {
      root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(root);
      const find = (n) => root.getObjectByName(n);
      const floor = find('Floor'), backdrop = find('Backdrop'), podium = find('Podium'), platform = find('Platform');

      // fond Unity retiré : il ne couvre qu'un muret latéral
      if (backdrop) backdrop.visible = false;

      // sol : recoloré aux couleurs CREATOR
      if (floor) {
        floor.traverse((o) => {
          if (!o.isMesh) return;
          o.material = new THREE.MeshStandardMaterial({ color: '#132a63', roughness: 0.92, metalness: 0.0 });
          o.receiveShadow = true;
        });
        const fb = new THREE.Box3().setFromObject(floor);
        floor.position.y += (0 - fb.min.y);
      }

      // pupitre : deux copies alignées sur les camps
      if (podium) {
        const pb = new THREE.Box3().setFromObject(podium);
        podium.position.y += (0 - pb.min.y);
        podium.traverse((o) => {
          if (!o.isMesh) return;
          o.material = new THREE.MeshStandardMaterial({ color: '#F4F6FC', roughness: 0.55, metalness: 0.05 });
          o.castShadow = true; o.receiveShadow = true;
        });
        const clone = podium.clone(true);
        podium.position.set(-5.4, podium.position.y, -1.8);
        clone.position.set(5.4, podium.position.y, -1.8);
        S.scene.add(podium, clone);
      }

      // cordons rouges : décor au fond
      if (platform) {
        platform.position.set(0, platform.position.y, -6.4);
        S.scene.add(platform);
        S.platform = platform;
      }

      // tapis d'équipe (textures du pack UI)
      const blue = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 5.2),
        new THREE.MeshStandardMaterial({ map: S.texture('assets/ui/turf-blue.webp'), roughness: 0.95 }));
      blue.rotation.x = -Math.PI / 2; blue.position.set(-5.4, 0.012, 2.4); blue.receiveShadow = true;
      const green = blue.clone();
      green.material = new THREE.MeshStandardMaterial({ map: S.texture('assets/ui/turf-green.webp'), roughness: 0.95 });
      green.position.set(5.4, 0.012, 2.4);
      S.scene.add(blue, green);

      // halo au sol sous le tableau des réponses
      S.boardGlow = new THREE.Mesh(new THREE.CircleGeometry(6, 40), glowMaterial('#2E85FF', 0.18));
      S.boardGlow.rotation.x = -Math.PI / 2;
      S.boardGlow.position.set(0, 0.02, 9.6);
      S.scene.add(S.boardGlow);

      S.groupScene = root;
    },

    /* ---------------- personnages ---------------- */
    loadChar(n) {
      const id = Math.max(1, Math.min(6, n | 0));
      if (S.charCache.has(id)) return Promise.resolve(S.charCache.get(id));
      if (S.charLoading.has(id)) return S.charLoading.get(id);
      const p = new Promise((res, rej) => {
        S.loader.load('assets/models/char' + id + '.glb', (g) => {
          S.charCache.set(id, g.scene);
          if (!S.clips || !S.clips.length) S.clips = g.animations;
          res(g.scene);
        }, undefined, rej);
      });
      S.charLoading.set(id, p);
      return p;
    },

    /** Crée une instance animée d'un personnage. */
    async spawnChar(charId, sweat, opts) {
      const src = await S.loadChar(charId);
      const root = THREE.SkeletonUtils.clone(src);
      const bbox = new THREE.Box3().setFromObject(src);
      const height = bbox.max.y - bbox.min.y;
      const mat = clayMaterial(sweat, bbox);
      root.traverse((o) => {
        if (!o.isMesh) return;
        o.material = mat;
        o.castShadow = !(opts && opts.noShadow);
        o.receiveShadow = false;
        o.frustumCulled = true;
      });
      // normalise la taille (1,75 m) et pose les pieds sur y = 0
      const k = 1.75 / (height || 1);
      const wrapper = new THREE.Group();
      root.scale.multiplyScalar(k);
      root.position.y = -bbox.min.y * k;
      root.rotation.y = 0;
      wrapper.add(root);
      const mixer = new THREE.AnimationMixer(root);
      const actions = {};
      (opts && opts.clips ? opts.clips : S.clips || []).forEach((clip) => {
        const a = mixer.clipAction(clip);
        actions[clip.name] = a;
      });
      return { wrapper, root, mixer, actions, height: 1.75 };
    },

    play(inst, name, fade) {
      if (!inst || !inst.actions) return null;
      let next = inst.actions[name];
      if (!next && name === 'Cheer') next = inst.actions['Win']; // pas de clip Cheer : on reuse Win (bras leves)
      if (!next) return null;
      const cur = inst.current;
      if (cur === next) return next;
      next.reset().setEffectiveWeight(1).fadeIn(fade || 0.2).play();
      if (cur) cur.fadeOut(fade || 0.2);
      inst.current = next;
      return next;
    },

    teamSide(team) { return team === 'green' ? 1 : -1; },

    async syncPlayers(list, mode) {
      if (!S.ready) return;
      const wanted = new Set();
      const teams = { blue: [], green: [] };
      (list || []).forEach((p) => teams[p.team === 'green' ? 'green' : 'blue'].push(p));

      if (mode === 'solo') {
        // en solo, tout le monde est aligné devant le plateau
        const all = (list || []).slice(0, 20);
        for (let i = 0; i < all.length; i++) {
          const p = all[i];
          wanted.add(p.id);
          let inst = S.players.get(p.id);
          if (!inst || inst.char !== p.char) {
            if (inst) S.removePlayer(p.id);
            inst = await S.spawnChar(p.char || 1, p.sweat || PALETTE[i % PALETTE.length], {});
            inst.char = p.char; inst.sweat = p.sweat;
            S.scene.add(inst.wrapper);
            S.players.set(p.id, inst);
            S.play(inst, 'Idle');
          }
          const col = i % 10, row = Math.floor(i / 10);
          inst.wrapper.position.set((col - 4.5) * 1.15, 0, 7.2 + row * 1.5);
          inst.wrapper.rotation.y = Math.PI;
          S.trackLabel(inst, p.name, '#2E85FF');
        }
      } else {
        for (const team of ['blue', 'green']) {
          const side = S.teamSide(team);
          const arr = teams[team].slice(0, 10);
          for (let i = 0; i < arr.length; i++) {
            const p = arr[i];
            wanted.add(p.id);
            let inst = S.players.get(p.id);
            if (!inst || inst.char !== p.char) {
              if (inst) S.removePlayer(p.id);
              inst = await S.spawnChar(p.char || 1, p.sweat || (team === 'blue' ? '#0B35FE' : '#00E472'), {});
              inst.char = p.char; inst.sweat = p.sweat;
              S.scene.add(inst.wrapper);
              S.players.set(p.id, inst);
              S.play(inst, 'Idle');
            }
            const col = i % 5, row = Math.floor(i / 5);
            inst.wrapper.position.set(side * 5.4 + (col - 2) * 1.25, 0, 1.2 + row * 1.6);
            inst.wrapper.rotation.y = 0;
            S.trackLabel(inst, p.name, team === 'blue' ? '#0B35FE' : '#00E472');
          }
        }
      }
      for (const id of Array.from(S.players.keys())) {
        if (!wanted.has(id)) S.removePlayer(id);
      }
    },

    trackLabel(inst, name, color) {
      if (inst.labelText === name) return;
      if (inst.label) { inst.wrapper.remove(inst.label); inst.label.material.map.dispose(); inst.label.material.dispose(); }
      const sp = nameSprite(name || '?', color);
      sp.position.y = 2.15;
      inst.wrapper.add(sp);
      inst.label = sp; inst.labelText = name;
    },

    removePlayer(id) {
      const inst = S.players.get(id);
      if (!inst) return;
      S.scene.remove(inst.wrapper);
      if (inst.mixer) inst.mixer.stopAllAction();
      S.players.delete(id);
    },

    /* ---------------- public ---------------- */
    buildCrowd() {
      if (!S.crowdGeoSource) return;
      const base = S.crowdBBox.clone();
      const h = base.max.y - base.min.y;
      const k = 1.55 / (h || 1);
      const cols = 10, rows = 5;
      for (let i = 0; i < CROWD_MAX; i++) {
        const root = THREE.SkeletonUtils.clone(S.crowdGeoSource);
        root.scale.multiplyScalar(k);
        root.position.y = -base.min.y * k;
        root.traverse((o) => { if (o.isMesh) { o.material = S.crowdMat(i); o.castShadow = false; } });
        const wrap = new THREE.Group();
        wrap.add(root);
        const col = i % cols, row = Math.floor(i / cols);
        const seat = new THREE.Vector3((col - (cols - 1) / 2) * 1.35, 0, -9.4 + row * 1.15);
        wrap.position.copy(seat);
        wrap.rotation.y = 0;
        S.scene.add(wrap);
        const mixer = new THREE.AnimationMixer(root);
        const actions = {};
        // le public recoit ses propres clips (retargetes dans crowd.glb : Idle, Running, Win)
        const clips = Array.from(S.crowdAnimByName.values()) || [];
        clips.forEach((clip) => { actions[clip.name] = mixer.clipAction(clip); });
        const inst = { wrap, root, mixer, actions, seat, assigned: null, slot: null, current: null };
        // tous les spectateurs sont animes (Idle par defaut)
        S.play(inst, 'Idle', 0.1);
        S.crowd.push(inst);
      }
      S.crowdSeats = S.crowd.map((c) => c.seat.clone());
      S.crowdSlots = { blue: S.makeSlots(-1), green: S.makeSlots(1) };
    },

    crowdMat(i) {
      const col = PALETTE[i % PALETTE.length];
      return clayMaterial(col, S.crowdBBox);
    },

    makeSlots(side) {
      const out = [];
      for (let i = 0; i < CROWD_MAX; i++) {
        const col = i % 5, row = Math.floor(i / 5);
        out.push(new THREE.Vector3(side * (7.2 + row * 0.95), 0, 3.6 - col * 1.05 - row * 0.2));
      }
      return out;
    },

    /** Applique le score d'équipe : floor(points/2) spectateurs dans le camp. */
    syncCrowd(bluePts, greenPts) {
      if (!S.ready || !S.crowd.length) return;
      const limit = S.lightMode ? LIGHT_MODE_CROWD : CROWD_MAX;
      const want = { blue: Math.min(limit, Math.floor((bluePts || 0) / 2)), green: Math.min(limit, Math.floor((greenPts || 0) / 2)) };
      for (const team of ['blue', 'green']) {
        const sideSlots = S.crowdSlots[team];
        let have = S.crowd.filter((c) => c.assigned === team).length;
        // trop de monde : on renvoie les derniers arrivés dans les gradins
        while (have > want[team]) {
          const c = S.crowd.filter((x) => x.assigned === team).pop();
          c.assigned = null; c.slot = null;
          S.moveCrowd(c, c.seat, null);
          have--;
        }
        for (let i = have; i < want[team]; i++) {
          const c = S.crowd.find((x) => !x.assigned);
          if (!c) break;
          c.assigned = team;
          c.slot = sideSlots[i];
          S.moveCrowd(c, sideSlots[i], team);
        }
      }
      // un trou dans les gradins doit être comblé par le camp adverse ? non : jamais de retour
    },

    moveCrowd(c, target, team) {
      c.target = target.clone();
      c.moving = true;
      S.play(c, 'Running', 0.15);
    },

    resetCrowd() {
      S.crowd.forEach((c, i) => {
        c.assigned = null; c.slot = null; c.target = null; c.moving = false;
        c.wrap.position.copy(c.seat);
        S.play(c, 'Idle', 0.1);
      });
    },

    /* ---------------- fin de partie ---------------- */
    celebrate(ranked, mode, teamScores) {
      const scores = {};
      (ranked || []).forEach((p) => { scores[p.id] = p.score; });
      const teamOf = {};
      (ranked || []).forEach((p) => { teamOf[p.id] = p.team; });

      let winnerTeam = null;
      if (mode === 'duel' && teamScores) {
        const b = teamScores.blue || 0, g = teamScores.green || 0;
        winnerTeam = b > g ? 'blue' : (g > b ? 'green' : null);
      }

      S.players.forEach((inst, id) => {
        const p = (ranked || []).find((x) => x.id === id);
        const team = teamOf[id];
        if (mode === 'solo') {
          const rank = (ranked || []).findIndex((x) => x.id === id);
          if (rank >= 0 && rank < 3) {
            S.play(inst, 'Win', 0.25); // Podium (pas de clip dedie : pose Win = victoire)
            S.trackLabel(inst, (p && p.name || '?') + '  •  ' + (scores[id] || 0) + ' pts', team === 'blue' ? '#0B35FE' : '#00E472');
          } else {
            S.play(inst, 'Lose', 0.25);
            S.trackLabel(inst, p && p.name || '?', team === 'blue' ? '#0B35FE' : '#00E472');
          }
        } else {
          const win = winnerTeam !== null && team === winnerTeam;
          S.play(inst, win ? 'Win' : 'Lose', 0.25);
          S.trackLabel(inst, p && p.name || '?', team === 'blue' ? '#0B35FE' : '#00E472');
        }
      });

      // public : camp gagnant saute (Cheer), l'autre baisse les bras (Lose)
      S.crowd.forEach((c) => {
        if (c.assigned === 'blue' || c.assigned === 'green') {
          const win = winnerTeam !== null && c.assigned === winnerTeam;
          S.play(c, win ? 'Cheer' : 'Lose', 0.25);
        } else {
          S.play(c, 'Idle', 0.2);
        }
      });

      S.updateCameraMode('end');
    },

    /** Affiche un emoji au-dessus du personnage d'un joueur pendant 2 s. */
    showEmojiAbove(id, emoji) {
      const inst = S.players.get(id);
      if (!inst || !emoji) return;
      const c = document.createElement('canvas');
      c.width = 96; c.height = 96;
      const g = c.getContext('2d');
      g.font = '72px sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(emoji, 48, 52);
      const tex = new THREE.CanvasTexture(c);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
      sp.position.set(0, 2.7, 0);
      sp.renderOrder = 6;
      inst.wrapper.add(sp);
      setTimeout(() => {
        try { inst.wrapper.remove(sp); } catch (e) {}
        tex.dispose(); sp.material.dispose();
      }, 2000);
    },

    /* ---------------- caméra ---------------- */
    updateCameraMode(mode) {
      if (mode === 'end') {
        S.camBase.set(0, 5.4, 13);
        S.camLook.set(0, 2.2, 6);
      } else if (mode === 'solo') {
        S.camBase.set(0, 6.6, 16);
        S.camLook.set(0, 2.2, 4);
      } else {
        S.camBase.set(0, 8.2, 19);
        S.camLook.set(0, 3.1, -2);
      }
    },

    pulse() { S.pulseT = 1; },

    /* ---------------- boucle ---------------- */
    loop() {
      requestAnimationFrame(S.loop);
      if (!S.renderer) return;
      const dt = Math.min(0.05, S.clock.getDelta());

      S.players.forEach((inst) => inst.mixer && inst.mixer.update(dt));
      for (let i = 0; i < S.crowd.length; i++) {
        const c = S.crowd[i];
        if (i < (S.lightMode ? LIGHT_MODE_CROWD : CROWD_MAX) && c.mixer) c.mixer.update(dt);
        if (c.moving && c.target) {
          const p = c.wrap.position;
          const d = p.distanceTo(c.target);
          if (d < 0.12) {
            p.copy(c.target);
            c.moving = false;
            S.play(c, 'Idle', 0.25);
          } else {
            p.lerp(c.target, Math.min(1, dt * 2.4));
            c.wrap.rotation.y = Math.atan2(c.target.x - p.x, c.target.z - p.z);
          }
        }
      }

      if (S.pulseT > 0) {
        S.pulseT = Math.max(0, S.pulseT - dt * 0.9);
        const e = S.pulseT * S.pulseT;
        S.camPos.lerpVectors(S.camBase, new THREE.Vector3(S.camBase.x * 0.82, S.camBase.y - 0.7, S.camBase.z - 2.2), e);
        S.camTarget.lerpVectors(S.camLook, new THREE.Vector3(0, 2.9, 4), e);
      } else {
        S.camPos.lerp(S.camBase, Math.min(1, dt * 1.6));
        S.camTarget.lerp(S.camLook, Math.min(1, dt * 1.6));
      }
      S.camera.position.lerp(S.camPos, Math.min(1, dt * 6));
      S.camera.lookAt(S.camTarget);

      S.renderer.render(S.scene, S.camera);

      // détection de perf : bascule en mode léger
      S.fpsAcc += dt; S.fpsFrames++;
      if (!S.fpsChecked && S.fpsAcc > 3) {
        const fps = S.fpsFrames / S.fpsAcc;
        S.fpsChecked = true;
        if (fps < 25) S.setLightMode(true);
        S.onPerf && S.onPerf(Math.round(fps));
      }
    },

    setLightMode(on) {
      if (S.lightMode === on) return;
      S.lightMode = on;
      if (S.renderer) S.renderer.shadowMap.enabled = !on;
      S.crowd.forEach((c, i) => {
        c.wrap.visible = on ? i < LIGHT_MODE_CROWD : true;
      });
    },

    /* ---------------- liberation des ressources (nouvelle partie) ---------------- */
    dispose() {
      // arrete et retire tous les joueurs (ressources d'une partie)
      S.players.forEach((inst) => {
        if (inst.mixer) inst.mixer.stopAllAction();
        if (inst.label) {
          if (inst.label.material && inst.label.material.map) inst.label.material.map.dispose();
          if (inst.label.material) inst.label.material.dispose();
          inst.wrapper.remove(inst.label);
        }
        S.scene.remove(inst.wrapper);
      });
      S.players.clear();
    },
  };

  global.PALETTE = PALETTE;
  global.Scene3D = S;
})(window);
