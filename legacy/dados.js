__M.dados = (() => {
// v14 · DADOS 3D: dados de marfil y de casino (rojos translúcidos) con aristas redondeadas, puntos hundidos (mapa de
// normales), barniz y reflejos, sobre un tapete de fieltro largo con barandillas de madera. Todo se dibuja aquí (canvas +
// three.js r149): no hay fotos ni modelos externos.
// El resultado lo decide siempre el juego (el motor ya ha tirado): la animación es una trayectoria «física» (vuelo, botes que
// se apagan, giro que se frena) que acaba exactamente con la cara pedida arriba. Así el resultado no depende del móvil.
// Gestos para tirar: arrastrar los dados con el dedo y soltar con impulso, agitar el móvil (al parar, salen) o un empujón
// largo del móvil hacia delante (salen disparados). Si no hay gesto en 15 s, se tiran solos.
const T = () => window.THREE;
const ok = () => { try { if (!window.THREE) return false; const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (u) => u * u * (3 - 2 * u);
// caras del cubo en el orden de los grupos de BoxGeometry: +x, -x, +y, -y, +z, -z (las opuestas suman 7)
const FACE_VAL = [3, 4, 1, 6, 2, 5];
const FACE_N = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const PIPS = { 1: [[.5, .5]], 2: [[.27, .27], [.73, .73]], 3: [[.25, .25], [.5, .5], [.75, .75]], 4: [[.27, .27], [.73, .27], [.27, .73], [.73, .73]], 5: [[.26, .26], [.74, .26], [.5, .5], [.26, .74], [.74, .74]], 6: [[.27, .23], [.73, .23], [.27, .5], [.73, .5], [.27, .77], [.73, .77]] };
const STYLES = {
  me: { base: ['#fbf8f0', '#efe8d8', '#e3dac6'], pip: '#141414', ring: 'rgba(0,0,0,.35)', rough: .28, coat: .7, tint: null },
  rv: { base: ['#e1263d', '#c8102e', '#9c0b22'], pip: '#fbfbf6', ring: 'rgba(0,0,0,.45)', rough: .18, coat: 1, tint: '#b00d26' },
  gold: { base: ['#ffe9a8', '#f2c84b', '#c9971f'], pip: '#2a1a00', ring: 'rgba(0,0,0,.4)', rough: .22, coat: .8, tint: null },
};
const texCache = {};
function canvas(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }
function faceTex(v, sty) {
  const key = 'c' + v + sty; if (texCache[key]) return texCache[key];
  const S = STYLES[sty], N = 256;
  const c = canvas(N, N, (g) => {
    const gr = g.createRadialGradient(N * .38, N * .32, N * .05, N / 2, N / 2, N * .75);
    gr.addColorStop(0, S.base[0]); gr.addColorStop(.55, S.base[1]); gr.addColorStop(1, S.base[2]);
    g.fillStyle = gr; g.fillRect(0, 0, N, N);
    // grano muy fino (marfil / resina)
    for (let i = 0; i < 2600; i++) { g.globalAlpha = .035; g.fillStyle = Math.random() < .5 ? '#000' : '#fff'; g.fillRect(Math.random() * N, Math.random() * N, 1.2, 1.2); }
    g.globalAlpha = 1;
    const r = v === 1 ? N * .1 : N * .078;
    for (const [x, y] of PIPS[v]) {
      // punto hundido: borde algo más oscuro, fondo pintado y un brillo en el labio inferior
      g.fillStyle = S.ring; g.beginPath(); g.arc(x * N, y * N, r * 1.12, 0, 7); g.fill();
      const pg = g.createRadialGradient(x * N - r * .3, y * N - r * .35, r * .1, x * N, y * N, r);
      pg.addColorStop(0, sty === 'me' ? '#3a3a3a' : sty === 'rv' ? '#ffffff' : '#4a3200'); pg.addColorStop(1, S.pip);
      g.fillStyle = v === 1 && sty === 'me' ? '#9c0b22' : pg; g.beginPath(); g.arc(x * N, y * N, r, 0, 7); g.fill();
    }
  });
  const t = new (T().CanvasTexture)(c); t.encoding = T().sRGBEncoding; t.anisotropy = 4;
  return (texCache[key] = t);
}
// mapa de normales: cada punto es un cuenco (pendiente hacia dentro) con labio redondeado
function faceNormal(v) {
  const key = 'n' + v; if (texCache[key]) return texCache[key];
  const N = 128, r = v === 1 ? N * .1 : N * .078;
  const c = canvas(N, N, (g) => {
    const im = g.createImageData(N, N), d = im.data;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let nx = 0, ny = 0;
      for (const [px, py] of PIPS[v]) {
        const dx = x - px * N, dy = y - py * N, q = Math.hypot(dx, dy);
        if (q < r * 1.15 && q > 0.001) { const k = q < r ? -Math.sin((q / r) * Math.PI * .5) * .9 : Math.sin(((q - r) / (r * .15)) * Math.PI) * .5; nx += (dx / q) * k; ny += (dy / q) * k; }
      }
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), o = (y * N + x) * 4;
      d[o] = (nx * .5 + .5) * 255; d[o + 1] = (-ny * .5 + .5) * 255; d[o + 2] = nz * 255; d[o + 3] = 255;
    }
    g.putImageData(im, 0, 0);
  });
  return (texCache[key] = new (T().CanvasTexture)(c));
}
function roundedBox(size, radius, seg = 6) {
  const g = new (T().BoxGeometry)(size, size, size, seg, seg, seg), p = g.attributes.position, h = size / 2, inner = h - radius, v = new (T().Vector3)(), c = new (T().Vector3)();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); c.set(clamp(v.x, -inner, inner), clamp(v.y, -inner, inner), clamp(v.z, -inner, inner));
    const dv = v.clone().sub(c); if (dv.lengthSq() > 1e-9) dv.setLength(radius); v.copy(c).add(dv); p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals(); return g;
}
function dieMesh(size, sty) {
  const S = STYLES[sty], Th = T();
  const mats = FACE_VAL.map((v) => new Th.MeshPhysicalMaterial({ map: faceTex(v, sty), normalMap: faceNormal(v), normalScale: new Th.Vector2(.9, .9), roughness: S.rough, metalness: 0, clearcoat: S.coat, clearcoatRoughness: .12, sheen: sty === 'rv' ? .2 : 0, envMapIntensity: 1 }));
  const m = new Th.Mesh(roundedBox(size, size * .13), mats); m.castShadow = true; m.receiveShadow = true; return m;
}
// fieltro verde de casino con impresión dorada y barandillas de madera barnizada
function feltTex(len) {
  const W = 512, H = Math.round(512 * len);
  const c = canvas(W, Math.min(4096, H), (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#0b4a2c'); gr.addColorStop(.5, '#0f5c37'); gr.addColorStop(1, '#0b4a2c');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < w * h / 18; i++) { g.globalAlpha = .06; g.fillStyle = Math.random() < .5 ? '#03260f' : '#2f8a5a'; const x = Math.random() * w, y = Math.random() * h; g.fillRect(x, y, 1 + Math.random() * 2.5, 1); }
    g.globalAlpha = 1; g.strokeStyle = 'rgba(232,196,96,.55)'; g.lineWidth = 5; g.strokeRect(26, 26, w - 52, h - 52);
    g.strokeStyle = 'rgba(232,196,96,.3)'; g.lineWidth = 2; g.strokeRect(40, 40, w - 80, h - 80);
    g.save(); g.translate(w / 2, h * .62); g.rotate(-Math.PI / 2); g.fillStyle = 'rgba(232,196,96,.22)'; g.font = '900 64px Georgia,serif'; g.textAlign = 'center'; g.fillText('FOOTBALL CARDS', 0, 22); g.restore();
    g.fillStyle = 'rgba(232,196,96,.2)'; g.beginPath(); g.arc(w / 2, h * .2, 70, 0, 7); g.lineWidth = 4; g.strokeStyle = 'rgba(232,196,96,.35)'; g.stroke();
  });
  const t = new (T().CanvasTexture)(c); t.encoding = T().sRGBEncoding; t.anisotropy = 8; return t;
}
function woodTex() {
  if (texCache.wood) return texCache.wood;
  const c = canvas(256, 1024, (g, w, h) => {
    g.fillStyle = '#4a2410'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(${20 + Math.random() * 40},${8 + Math.random() * 14},2,${.25 + Math.random() * .3})`; g.lineWidth = 1 + Math.random() * 3; g.beginPath(); const x = Math.random() * w; g.moveTo(x, 0); for (let y = 0; y <= h; y += 32) g.lineTo(x + Math.sin(y / 90 + i) * 6, y); g.stroke(); }
  });
  const t = new (T().CanvasTexture)(c); t.encoding = T().sRGBEncoding; t.wrapS = t.wrapT = T().RepeatWrapping; return (texCache.wood = t);
}
// entorno para los reflejos: una sala oscura con paneles de luz (sale en el barniz de los dados)
function envMap(renderer) {
  const Th = T(), sc = new Th.Scene(); sc.background = new Th.Color('#120d08');
  const panel = (w, h, x, y, z, col, i) => { const m = new Th.Mesh(new Th.PlaneGeometry(w, h), new Th.MeshBasicMaterial({ color: new Th.Color(col).multiplyScalar(i), side: Th.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); sc.add(m); };
  panel(8, 3, 0, 9, 0, '#fff4dc', 3); panel(3, 6, 8, 3, 2, '#ffd9a0', 1.6); panel(3, 6, -8, 4, -2, '#c8e0ff', 1.2); panel(10, 2, 0, 2, -9, '#ff3355', .7);
  const pm = new Th.PMREMGenerator(renderer), rt = pm.fromScene(sc, .03); pm.dispose(); return rt.texture;
}

function create(host, opts = {}) {
  const Th = T();
  const cv = document.createElement('canvas'); cv.className = 'dz-cv'; host.appendChild(cv);
  const ui = document.createElement('div'); ui.className = 'dz-ui'; host.appendChild(ui);
  ui.innerHTML = '<div class="dz-hint" id="dzhint"></div><div class="dz-lab" id="dzlab"></div><div class="dz-sums" id="dzsums"></div>';
  const $u = (id) => ui.querySelector('#' + id);
  const renderer = new Th.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.outputEncoding = Th.sRGBEncoding; renderer.toneMapping = Th.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = Th.PCFSoftShadowMap; renderer.setClearColor(0x000000, 0);
  const scene = new Th.Scene(); scene.environment = envMap(renderer);
  const cam = new Th.PerspectiveCamera(30, 1, .1, 200);
  scene.add(new Th.HemisphereLight('#fff6e6', '#203020', .55));
  const sun = new Th.DirectionalLight('#fff1d6', 1.7); sun.position.set(-4, 14, 6); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -.0004; sun.shadow.radius = 4;
  scene.add(sun); scene.add(sun.target);
  const spot = new Th.SpotLight('#ffe4b8', 1.2, 40, .5, .7, 1.2); spot.position.set(3, 12, -2); scene.add(spot); scene.add(spot.target);
  // tapete (se recoloca en cada disposición)
  const table = new Th.Group(); scene.add(table);
  let mat = null, felt = null;
  // sombra suave en el suelo transparente (modo lateral: los dados en reposo sobre la pantalla)
  const shadowCatcher = new Th.Mesh(new Th.PlaneGeometry(80, 80), new Th.ShadowMaterial({ opacity: .35 })); shadowCatcher.rotation.x = -Math.PI / 2; shadowCatcher.receiveShadow = true; scene.add(shadowCatcher);
  let W = 1, H = 1, layout = 'side', size = .8, dice = [], raf = 0, alive = true, anim = null, onFrame = null;
  const camGoal = { pos: new Th.Vector3(0, 16, 7), look: new Th.Vector3(0, 0, 0) }, camLook = new Th.Vector3();
  const rc = new Th.Raycaster(), plane = new Th.Plane(new Th.Vector3(0, 1, 0), 0), tmp = new Th.Vector3();
  const ground = (nx, ny, y = 0) => { rc.setFromCamera({ x: nx * 2 - 1, y: -(ny * 2 - 1) }, cam); plane.constant = -y; const p = new Th.Vector3(); rc.ray.intersectPlane(plane, p); return p; };
  const toScreen = (v) => { tmp.copy(v).project(cam); return { x: (tmp.x * .5 + .5) * W, y: (-tmp.y * .5 + .5) * H }; };
  let area = null; // { x0, x1, zBot, zTop } zona útil del tapete
  function buildTable(len, wid, cx, cz) {
    table.clear(); if (felt) { felt.map.dispose(); }
    const rail = Math.max(.32, wid * .07), hgt = rail * .9;
    felt = new Th.MeshStandardMaterial({ map: feltTex(len / wid), roughness: .96, metalness: 0 });
    mat = new Th.Mesh(new Th.PlaneGeometry(wid, len), felt); mat.rotation.x = -Math.PI / 2; mat.position.set(cx, 0, cz); mat.receiveShadow = true; table.add(mat);
    const wood = new Th.MeshPhysicalMaterial({ map: woodTex(), roughness: .35, clearcoat: .9, clearcoatRoughness: .2, color: '#c58a5c' });
    const r = (w, d, x, z) => { const m = new Th.Mesh(roundedBox(1, .12, 2), wood); m.scale.set(w, hgt, d); m.position.set(x, hgt / 2, z); m.castShadow = m.receiveShadow = true; table.add(m); };
    r(rail, len + rail * 2, cx - wid / 2 - rail / 2, cz); r(rail, len + rail * 2, cx + wid / 2 + rail / 2, cz); r(wid, rail, cx, cz - len / 2 - rail / 2); r(wid, rail, cx, cz + len / 2 + rail / 2);
    // cojín de goma bajo la barandilla de arriba (donde rebotan)
    area = { x0: cx - wid / 2 + size * .8, x1: cx + wid / 2 - size * .8, zBot: cz + len / 2 - size * .8, zTop: cz - len / 2 + size * .8, cx, cz, len, wid };
    sun.target.position.set(cx, 0, cz); spot.target.position.set(cx, 0, cz - len * .2); spot.position.set(cx + 2, 12, cz - 2);
  }
  function setLayout(mode) {
    layout = mode; W = host.clientWidth || innerWidth; H = host.clientHeight || innerHeight;
    renderer.setSize(W, H, false); cam.aspect = W / H;
    if (mode === 'side') {
      // cámara casi cenital algo inclinada: el tapete sube por el lateral derecho y se ve largo, en perspectiva
      cam.fov = 30; cam.position.set(0, 18, 8); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
      const b0 = ground(.57, .93), b1 = ground(.97, .93), t0 = ground(.62, .08);
      const wid = Math.abs(b1.x - b0.x) * .86, len = Math.abs(b0.z - t0.z), cx = (b0.x + b1.x) / 2, cz = (b0.z + t0.z) / 2;
      size = clamp(wid * .2, .45, 1.1); buildTable(len, wid, cx, cz);
      camGoal.pos.copy(cam.position); camGoal.look.set(0, 0, 0); camLook.set(0, 0, 0);
      shadowCatcher.visible = true;
    } else {
      cam.fov = 40; const len = 13, wid = W < H ? 4.4 : 6.4; size = W < H ? .8 : .95; buildTable(len, wid, 0, 0);
      fullCam(true); shadowCatcher.visible = false;
    }
    sun.shadow.camera.left = -14; sun.shadow.camera.right = 14; sun.shadow.camera.top = 14; sun.shadow.camera.bottom = -14; sun.shadow.camera.updateProjectionMatrix();
  }
  // v14.1 · cámara a pantalla completa: distancia para que quepa lo pedido (medio ancho `half`) con el móvil en vertical
  const VIEW = () => new Th.Vector3(0, 1, .58).normalize();
  const fitDist = (half) => { const tv = Math.tan(cam.fov * Math.PI / 360), th = tv * cam.aspect; return Math.max(half / th, half * .8 / tv); };
  function fullCam(snap) {
    const look = new Th.Vector3(0, 0, .6), d = fitDist(area.wid / 2 + .55);
    camGoal.look.copy(look); camGoal.pos.copy(look).addScaledVector(VIEW(), d);
    if (snap) { camLook.copy(look); cam.position.copy(camGoal.pos); cam.lookAt(camLook); cam.updateProjectionMatrix(); cam.updateMatrixWorld(); }
    return d;
  }
  const restSpot = (k, n) => { // dónde esperan los dados antes de tirar
    if (layout === 'side') { const p = ground(.69 + (k % 2) * .15, .86 - Math.floor(k / 2) * .07, size / 2); p.y = size / 2; return p; } // v15 · en el tapete, a la derecha
    const p = ground(.5 + (k - (n - 1) / 2) * (n > 4 ? .15 : .19), .8, size / 2); p.y = size / 2; return p; // a la vista, abajo
  };
  function clearDice() { dice.forEach((d) => { scene.remove(d.m); d.m.geometry.dispose(); }); dice = []; }
  function setDice(list) { // list: [{ sty }]
    clearDice();
    dice = list.map((d, k) => { const m = dieMesh(size, d.sty || 'me'); const p = restSpot(k, list.length); m.position.copy(p); m.quaternion.setFromEuler(new Th.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6)); snapFlat(m, 1 + Math.floor(Math.random() * 6)); scene.add(m); return { m, sty: d.sty, rest: p.clone() }; });
    kick();
  }
  // orientación con la cara v arriba (y un giro al azar sobre la vertical)
  function targetQ(v, yaw) {
    const k = FACE_VAL.indexOf(v), n = new Th.Vector3(...FACE_N[k]);
    const q = new Th.Quaternion().setFromUnitVectors(n, new Th.Vector3(0, 1, 0));
    return new Th.Quaternion().setFromAxisAngle(new Th.Vector3(0, 1, 0), yaw).multiply(q);
  }
  function snapFlat(m, v) { m.quaternion.copy(targetQ(v, Math.random() * 6)); }
  // ---------- tirada ----------
  // dice: índices de `dice`; vals: caras finales; power 0..1; from: posiciones de salida (por defecto, donde están)
  function roll(idx, vals, power = .6, o = {}) {
    return new Promise((done) => {
      const t0 = performance.now(), dur = (o.fast ? .7 : 1.45 + .55 * power) * 1000;
      const used = dice.filter((d, k) => !idx.includes(k) && d.landed).map((d) => d.m.position);
      const plans = idx.map((k, j) => {
        const d = dice[k], P0 = d.m.position.clone();
        // destino en el tapete: más lejos cuanto más fuerte; separado de los demás dados
        // v14.1 · destino en una casilla libre de una rejilla (los dados nunca acaban montados unos sobre otros)
        const taken = used.concat(idx.slice(0, j).map((q) => dice[q].P1)).filter(Boolean);
        const cs = size * 1.75, nx = Math.max(1, Math.floor((area.x1 - area.x0 + size) / cs)), nz = Math.max(1, Math.floor((area.zBot - area.zTop + size) / cs));
        const tz = area.zBot + (area.zTop - area.zBot) * clamp(.3 + power * .5 + (Math.random() - .5) * .2, .12, .92);
        let P1 = null, best = 1e9;
        for (let ix = 0; ix < nx; ix++) for (let iz = 0; iz < nz; iz++) {
          const cx = area.x0 - size / 2 + cs * (ix + .5) + (area.x1 - area.x0 + size - nx * cs) / 2, cz = area.zTop - size / 2 + cs * (iz + .5);
          if (taken.some((u) => Math.hypot(u.x - cx, u.z - cz) < cs * .98)) continue;
          const sc = Math.abs(cz - tz) + Math.random() * cs * 1.2;
          if (sc < best) { best = sc; P1 = new Th.Vector3(cx, size / 2, cz); }
        }
        if (!P1) P1 = new Th.Vector3(area.cx, size / 2, tz);
        const jit = (cs - size * 1.45) / 2; P1.x += (Math.random() - .5) * 2 * jit; P1.z += (Math.random() - .5) * 2 * jit;
        d.P1 = P1; d.landed = false;
        const dir = P1.clone().sub(P0).setY(0).normalize();
        const axis = new Th.Vector3(dir.z, 0, -dir.x).add(new Th.Vector3((Math.random() - .5) * .8, (Math.random() - .5) * .6, (Math.random() - .5) * .8)).normalize();
        const k0 = 2.4, w0 = 14 + power * 10 + Math.random() * 6, Aend = (w0 / k0) * (1 - Math.exp(-k0 * dur / 1000));
        return { d, P0, P1, axis, k0, w0, Aend, qT: targetQ(vals[j], Math.random() * 6), H0: size * (1.6 + power * 2.2), delay: j * 70, hits: 0 };
      });
      // botes: duración relativa y altura de cada arco (el primero es el vuelo desde la mano)
      const ARCS = [[.36, 1], [.22, .3], [.15, .1], [.1, .035]], restFrac = 1 - ARCS.reduce((t, a) => t + a[0], 0);
      anim = (now) => {
        let all = true;
        for (const pl of plans) {
          const tt = clamp((now - t0 - pl.delay) / dur, 0, 1); if (tt < 1) all = false;
          const ez = 1 - Math.pow(1 - tt, 2.1);
          const p = pl.P0.clone().lerp(pl.P1, ez);
          // altura: arcos parabólicos que se apagan
          let acc = 0, y = 0, arc = -1;
          for (let a = 0; a < ARCS.length; a++) { const [f, h] = ARCS[a]; if (tt < acc + f) { const u = (tt - acc) / f; y = 4 * h * pl.H0 * u * (1 - u); arc = a; break; } acc += f; }
          if (arc === 0 && pl.P0.y > size / 2) y += (pl.P0.y - size / 2) * (1 - (tt / ARCS[0][0])); // si sale desde la mano, en el aire
          p.y = size / 2 + y;
          if (arc !== pl.arc) { if (pl.arc != null && pl.arc >= 0 && opts.sound && opts.sound.hit) opts.sound.hit(Math.pow(.45, pl.arc) * (.5 + power * .5), pl.d.sty); pl.arc = arc; }
          pl.d.m.position.copy(p);
          const ts = tt * dur / 1000, ang = (pl.w0 / pl.k0) * (1 - Math.exp(-pl.k0 * ts));
          pl.d.m.quaternion.copy(new Th.Quaternion().setFromAxisAngle(pl.axis, ang - pl.Aend).multiply(pl.qT));
          if (tt >= 1 && !pl.d.landed) { pl.d.landed = true; pl.d.m.position.copy(pl.P1); pl.d.m.quaternion.copy(pl.qT); if (opts.sound && opts.sound.hit) opts.sound.hit(.15, pl.d.sty); }
        }
        if (layout === 'full') { // la cámara sigue a los dados y acaba con un zoom a la tirada
          // encuadre: todos los dados que hay en la mesa (los que ruedan y los que ya están); al final, zoom a la tirada
          const vis = dice.filter((d) => d.m.visible && (d.landed || plans.some((pl) => pl.d === d))).map((d) => d.m.position);
          const c = new Th.Vector3(); vis.forEach((v) => c.add(v)); c.multiplyScalar(1 / Math.max(1, vis.length));
          const rad = Math.max(size, ...vis.map((v) => Math.hypot(v.x - c.x, v.z - c.z)));
          const tt = clamp((now - t0) / dur, 0, 1), zoom = smooth(clamp((tt - .55) / .45, 0, 1));
          // zoom final moderado: siempre caben todos los dados con margen
          const d0 = fitDist(area.wid / 2 + .55), dEnd = clamp(fitDist(rad + size * 1.6), d0 * .55, d0), dist = d0 + (dEnd - d0) * zoom;
          const look = new Th.Vector3(c.x * zoom, 0, .6 + (c.z - .6) * (.35 + zoom * .65));
          camGoal.look.copy(look); camGoal.pos.copy(look).addScaledVector(VIEW(), dist);
        }
        if (all) { anim = null; if (opts.sound && opts.sound.stop) opts.sound.stop(); setTimeout(done, o.fast ? 80 : 260); }
      };
      if (opts.sound && opts.sound.roll) opts.sound.roll(dur / 1000, power);
      kick();
    });
  }
  // ---------- gestos ----------
  let motionOn = false, gest = null;
  function askMotion() {
    try { if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') DeviceMotionEvent.requestPermission().catch(() => {}); } catch (e) {}
  }
  // espera a que el usuario tire los dados `idx`; resuelve con la potencia (0..1) y el tipo de gesto
  function waitThrow(idx, o = {}) {
    return new Promise((done) => {
      let finished = false, drag = null, shake = { on: false, t: 0, last: 0, n: 0 }, fling = { t: 0 };
      const hint = $u('dzhint'); hint.innerHTML = o.hint || 'Arrastra los dados y suelta, <b>agita</b> el móvil<br>o empújalo hacia delante'; hint.classList.add('on');
      const hitR = Math.max(70, size * 140);
      const center0 = () => { const c = new Th.Vector3(); idx.forEach((k) => c.add(dice[k].m.position)); return toScreen(c.multiplyScalar(1 / idx.length)); };
      // v14.1 · los dados esperan dentro de un puño 3D (se ven entre los dedos); el puño se arrastra y se agita
      const C3 = __M.cuerpo3d, fistSz = Math.round(Math.min(W, H) * (layout === 'full' ? .66 : .42));
      let fist = null;
      if (C3 && C3.drawFist && o.fist === true) { // v15 · el puño queda desactivado (los dados se ven a la vista)
        const fc = document.createElement('canvas'), dpr = Math.min(2, window.devicePixelRatio || 1); fc.className = 'dz-fist'; fc.width = fc.height = Math.round(fistSz * dpr);
        fc.style.width = fc.style.height = fistSz + 'px'; ui.appendChild(fc);
        const c0 = center0(); fist = { cv: fc, g: fc.getContext('2d'), x: c0.x, y: Math.min(H - fistSz * .38, c0.y - fistSz * .1), shake: 0, ok: false, dpr, vals: idx.map(() => 1 + Math.floor(Math.random() * 6)) };
        const place = () => { fc.style.left = (fist.x - fistSz / 2) + 'px'; fc.style.top = (fist.y - fistSz / 2) + 'px'; };
        fist.place = place; place();
        onFrame = () => {
          fist.g.clearRect(0, 0, fc.width, fc.height);
          fist.shake *= .9; const ok2 = C3.drawFist(fist.g, fc.width / 2, fc.height / 2, fc.width, { dice: fist.vals, sty: dice[idx[0]].sty, shake: fist.shake });
          if (ok2 && !fist.ok) { fist.ok = true; idx.forEach((k) => { dice[k].m.visible = false; }); }
          fc.style.opacity = fist.ok ? 1 : 0;
        };
        if (C3.load) C3.load();
      }
      const center = () => (fist && fist.ok ? { x: fist.x, y: fist.y } : center0());
      const finish = (power, how) => {
        if (finished) return; finished = true; cleanup(); hint.classList.remove('on');
        if (fist) { // los dados salen de donde está el puño
          if (fist.ok) { const g = ground(fist.x / W, (fist.y - fistSz * .12) / H, size * 2.2); idx.forEach((k, j) => { const d = dice[k]; d.m.visible = true; d.m.position.set(g.x + (j - (idx.length - 1) / 2) * size * .9, size * 2.2, g.z); }); }
          onFrame = null; fist.cv.remove(); kick();
        }
        done({ power: clamp(power, 0, 1), how });
      };
      const fingerPt = (e) => { const r = host.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
      const down = (e) => {
        askMotion(); // iPhone: el permiso del acelerómetro se pide con un toque
        const p = fingerPt(e), c = center(); if (Math.hypot(p.x - c.x, p.y - c.y) > hitR * 1.6) return;
        drag = { id: e.pointerId, pts: [{ ...p, t: e.timeStamp }] }; try { ui.setPointerCapture(e.pointerId); } catch (er) {}
        if (opts.sound && opts.sound.rattle) opts.sound.rattle(.3);
      };
      const move = (e) => {
        if (!drag || e.pointerId !== drag.id) return; const p = fingerPt(e); drag.pts.push({ ...p, t: e.timeStamp }); if (drag.pts.length > 30) drag.pts.shift();
        // los dados siguen al dedo, un poco levantados y bailando
        if (fist && fist.ok) { fist.x = p.x; fist.y = p.y; fist.shake = Math.min(1, fist.shake + .25); fist.place(); kick(); return; }
        const g = ground(p.x / W, p.y / H, size * 1.2);
        idx.forEach((k, j) => { const d = dice[k]; d.m.position.lerp(new Th.Vector3(g.x + (j - (idx.length - 1) / 2) * size * 1.15, size * 1.2, g.z + j * .1), .5); d.m.rotateX(.25 + Math.random() * .2); d.m.rotateZ(.18); });
        kick();
      };
      const up = (e) => {
        if (!drag || e.pointerId !== drag.id) return; const P = drag.pts, a = P.find((q) => e.timeStamp - q.t < 110) || P[0], b = P[P.length - 1];
        const dt = Math.max(16, b.t - a.t), sp = Math.hypot(b.x - a.x, b.y - a.y) / dt * 1000, upward = (a.y - b.y) > -20;
        const tot = Math.hypot(b.x - P[0].x, b.y - P[0].y); drag = null;
        if ((sp > 260 || tot > 70) && upward) finish(clamp(sp / 2600, .15, 1), 'arrastre');
        else if (fist && fist.ok) { const c0 = center0(); fist.x = c0.x; fist.y = Math.min(H - fistSz * .38, c0.y - fistSz * .1); fist.place(); } else idx.forEach((k) => { dice[k].m.position.copy(dice[k].rest || restSpot(k, dice.length)); });
      };
      // agitar: aceleración (sin gravedad) por encima de 13 m/s² varias veces; al parar 0,3 s, salen.
      // empujón hacia delante: aceleración larga (≥ 0,12 s) a lo largo del eje de la pantalla (z) o hacia arriba (y)
      const motion = (e) => {
        const a = e.acceleration && e.acceleration.x != null ? e.acceleration : null, ag = e.accelerationIncludingGravity;
        const now = e.timeStamp || performance.now();
        let mag = 0, fwd = 0;
        if (a) { mag = Math.hypot(a.x || 0, a.y || 0, a.z || 0); fwd = Math.max(-(a.z || 0), (a.y || 0)); }
        else if (ag) { mag = Math.abs(Math.hypot(ag.x || 0, ag.y || 0, ag.z || 0) - 9.81); fwd = 0; }
        if (fwd > 9 && !shake.on) { if (!fling.t) fling.t = now; if (now - fling.t > 160) return finish(1, 'empujon'); } else fling.t = 0;
        if (mag > (a ? 11 : 10)) { shake.n++; shake.last = now; if (!shake.on && shake.n > 3) { shake.on = true; shake.t = now; } if (opts.sound && opts.sound.rattle && Math.random() < .5) opts.sound.rattle(.2); if (fist) fist.shake = 1; idx.forEach((k) => { dice[k].m.rotateX(Math.random()); dice[k].m.rotateY(Math.random()); }); kick(); }
        if (shake.on && now - shake.last > 300) finish(clamp((shake.last - shake.t) / 1400, .3, .95), 'agitar');
      };
      const timer = setTimeout(() => finish(.55, 'solo'), o.timeout || 15000);
      ui.classList.add('grab'); ui.addEventListener('pointerdown', down); ui.addEventListener('pointermove', move); ui.addEventListener('pointerup', up); ui.addEventListener('pointercancel', up);
      window.addEventListener('devicemotion', motion);
      const cleanup = () => { clearTimeout(timer); ui.classList.remove('grab'); ui.removeEventListener('pointerdown', down); ui.removeEventListener('pointermove', move); ui.removeEventListener('pointerup', up); ui.removeEventListener('pointercancel', up); window.removeEventListener('devicemotion', motion); gest = null; };
      gest = { cancel: () => finish(.55, 'solo') };
    });
  }
  // ---------- etiquetas ----------
  function label(text, cls = '') { const l = $u('dzlab'); l.className = 'dz-lab ' + cls + (text ? ' on' : ''); l.innerHTML = text || ''; }
  function sums(list) { // [{ idx, text, cls }] etiquetas junto a cada grupo de dados
    const box = $u('dzsums'); box.innerHTML = '';
    for (const s of list) {
      const c = new Th.Vector3(); s.idx.forEach((k) => c.add(dice[k].m.position)); c.multiplyScalar(1 / s.idx.length); c.y += size;
      const p = toScreen(c), e = document.createElement('div'); e.className = 'dz-sum ' + (s.cls || ''); e.innerHTML = s.text; e.style.left = p.x + 'px'; e.style.top = (p.y - size * 40) + 'px'; box.appendChild(e);
    }
  }
  // ---------- bucle ----------
  let lastT = 0, idleFrames = 0;
  function frame(now) {
    raf = 0; if (!alive) return;
    if (anim) anim(now);
    // la cámara se acerca suavemente a su objetivo
    const dtc = Math.min(.1, (now - (lastT || now)) / 1000), kc = layout === 'full' ? 1 - Math.exp(-dtc * 4.5) : 1; cam.position.lerp(camGoal.pos, kc); camLook.lerp(camGoal.look, kc); cam.lookAt(camLook);
    if (onFrame) onFrame(now);
    renderer.render(scene, cam); lastT = now;
    const moving = anim || gest || cam.position.distanceTo(camGoal.pos) > .01;
    idleFrames = moving ? 0 : idleFrames + 1;
    if (idleFrames < 3) raf = requestAnimationFrame(frame);
  }
  function kick() { idleFrames = 0; if (!raf && alive) raf = requestAnimationFrame(frame); }
  const onResize = () => { const l = layout; setLayout(l); dice.forEach((d, k) => { if (!d.landed) { d.rest = restSpot(k, dice.length); d.m.position.copy(d.rest); } }); kick(); };
  window.addEventListener('resize', onResize);
  setLayout(opts.layout || 'side');
  return {
    layout: (m) => { setLayout(m); kick(); },
    setDice, roll, waitThrow, label, sums,
    get size() { return size; }, get dice() { return dice; },
    reset: () => { if (layout === 'full') fullCam(true); dice.forEach((d, k) => { d.landed = false; d.rest = restSpot(k, dice.length); d.m.position.copy(d.rest); }); $u('dzsums').innerHTML = ''; label(''); kick(); },
    cancelGesture: () => gest && gest.cancel(),
    render: kick,
    probe: () => ({ layout, size, n: dice.length, landed: dice.map((d) => !!d.landed), up: dice.map((d) => upFace(d.m)), area }),
    dispose: () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); clearDice(); renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) {} host.innerHTML = ''; },
  };
}
// cara que mira hacia arriba (para comprobar en las pruebas que el dado enseña lo que dijo el juego)
function upFace(m) {
  const Th = T(); let best = -2, v = 0;
  FACE_N.forEach((n, k) => { const w = new Th.Vector3(...n).applyQuaternion(m.quaternion); if (w.y > best) { best = w.y; v = FACE_VAL[k]; } });
  return v;
}
return { ok, create, FACE_VAL, dieMesh, targetQ: (v, yaw) => { const Th = T(), k = FACE_VAL.indexOf(v), n = new Th.Vector3(...FACE_N[k]); return new Th.Quaternion().setFromAxisAngle(new Th.Vector3(0, 1, 0), yaw).multiply(new Th.Quaternion().setFromUnitVectors(n, new Th.Vector3(0, 1, 0))); } };
})();
