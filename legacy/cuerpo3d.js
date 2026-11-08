__M.cuerpo3d = (() => {
// v14 · FUTBOLISTAS 3D en las escenas animadas (tiros, goles, paradas, penaltis y tanda).
// Cuerpo humano realista con esqueleto («Superhero_Male_FullBody», Universal Base Characters de Quaternius, CC0) y la
// respiración en reposo de su Universal Animation Library (CC0), en assets/jugador.glb (scripts/build_jugador.py), que va junto al index.html.
// Sustituye al dibujo 2D de cada futbolista sin cambiar la coreografía: las escenas siguen mandando la postura con los
// mismos parámetros (piernas, brazos, inclinación, giro de la estirada, de frente o de espaldas) y aquí se colocan los
// huesos del modelo 3D para esa postura, se iluminan y se pintan en el lienzo de la escena. La equipación (camiseta con
// rayas, banda o franja, pantalón, medias, botas, guantes del portero), el tono de piel y el pelo salen de cada
// futbolista y se pintan en el sombreador según la zona del cuerpo. Si el dispositivo no tiene WebGL, el archivo no
// carga o se apaga (fc_3dpl = '0'), se usa el dibujo 2D de siempre.
const T = () => window.THREE;
const URL = 'assets/jugador.glb';
let state = 'idle', R = null; // R: { renderer, scene, cam, group, model, mixer, bones, mat, U, cv, t0 }
const off = () => { try { return localStorage.getItem('fc_3dpl') === '0'; } catch (e) { return false; } };
const hex = (c, d) => { try { return new (T().Color)(c || d); } catch (e) { return new (T().Color)(d); } };
const PAT = { stripes: 1, sash: 2, band: 3 };
function load() {
  if (state !== 'idle' || off()) return;
  if (location.protocol === 'file:') { state = 'fail'; return; } // abierto como archivo suelto: el navegador no deja leer el modelo
  if (!window.THREE || !THREE.GLTFLoader || !(__M.stadium && __M.stadium.ok && __M.stadium.ok())) { state = 'fail'; return; }
  state = 'loading';
  // en la app va el .glb; en la página web publicada, la misma copia en base64 (texto), que es lo que esa web sirve
  const b64 = () => fetch(URL + '.b64.txt').then((r) => { if (!r.ok) throw new Error('jugador.glb ' + r.status); return r.text(); }).then((t) => { const bin = atob(t.trim()), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return u8.buffer; });
  fetch(URL).then((r) => { if (!r.ok) throw new Error('jugador.glb ' + r.status); return r.arrayBuffer(); }).catch(b64)
    .then((buf) => new Promise((res, rej) => new THREE.GLTFLoader().parse(buf, '', res, rej)))
    .then(setup).catch((e) => { console.warn('Futbolistas 3D no disponibles:', e && e.message); state = 'fail'; });
}
function patch(mat, U) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vBind;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvBind = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vBind;
uniform vec3 uShirt, uTrim, uShorts, uSock, uBoot, uSkin, uHair, uGlove; uniform float uPat, uGK, uArm;
float hsh(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
{
  if (uArm > .5 && (vBind.x > -.37 || vBind.y < 1.3)) discard; // puño: solo antebrazo y mano derechos
  vec3 tex = diffuseColor.rgb; float lum = dot(tex, vec3(.299, .587, .114));
  float fold = clamp(.62 + (lum - .42) * 1.3, .45, 1.15); // pliegues y músculos del modelo como sombra de la tela
  float ax = abs(vBind.x), y = vBind.y;
  float arm = step(.2, ax) * step(1.3, y) * step(y, 1.62);
  vec3 skinC = tex * uSkin;
  vec3 col = skinC;
  float sleeve = uGK > .5 ? .69 : .40;
  if (y < .115) col = uBoot * (.7 + .5 * lum);
  else if (y < .5) col = uSock * fold;
  else if (y < .68) col = skinC;
  else if (y < 1.0 && ax < .27) col = uShorts * fold;
  else if (y < 1.0) col = skinC;
  else if ((y < 1.535 && ax < .25) || (arm > .5 && ax < sleeve)) {
    vec3 sc = uShirt;
    if (uPat > .5 && uPat < 1.5 && ax < .25 && step(.5, fract(vBind.x * 7.0 + .25)) > .5) sc = uTrim;
    if (uPat > 1.5 && uPat < 2.5 && ax < .25 && abs((y - 1.27) + vBind.x * 1.1) < .07) sc = uTrim;
    if (uPat > 2.5 && ax < .25 && abs(y - 1.33) < .045) sc = uTrim;
    if (arm > .5 && ax > sleeve - .035) sc = uTrim; // puño de la manga
    if (y > 1.505 && ax < .07 && vBind.z > -.02) sc = uTrim; // cuello
    col = sc * fold;
  }
  else if (arm > .5 && uGK > .5 && ax > .69) col = uGlove * (.75 + .4 * lum);
  if (uArm > .5 && vBind.x < -.37) col = skinC; // el puño va sin manga
  else if (y > 1.73 || (y > 1.63 && vBind.z < -.065)) col = uHair * (.75 + .5 * hsh(floor(vBind * 220.0))) * (.8 + .3 * lum);
  diffuseColor.rgb = col;
}`);
  };
  mat.needsUpdate = true;
}
function setup(gltf) {
  const Th = T();
  const cv = document.createElement('canvas'); cv.width = cv.height = 360;
  const renderer = new Th.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: false });
  renderer.setPixelRatio(1); renderer.outputEncoding = Th.sRGBEncoding; renderer.toneMapping = Th.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12; renderer.setClearColor(0x000000, 0);
  const scene = new Th.Scene();
  scene.add(new Th.HemisphereLight('#f4f7ff', '#3a5a32', .75));
  const key = new Th.DirectionalLight('#fff4e2', 2.2); key.position.set(-1.6, 2.4, 3); scene.add(key);
  const rim = new Th.DirectionalLight('#cfe3ff', 1.5); rim.position.set(2, 1.5, -2.5); scene.add(rim);
  const fill = new Th.DirectionalLight('#ffe9d0', .5); fill.position.set(2, .2, 2); scene.add(fill);
  const S = 1.25, cam = new Th.OrthographicCamera(-S, S, S, -S, .1, 20); cam.position.set(0, 0, 8); cam.lookAt(0, 0, 0);
  const group = new Th.Group(); scene.add(group);
  const model = gltf.scene; group.add(model);
  const bones = {}; model.traverse((o) => { if (o.isBone) bones[o.name] = o; if (o.isMesh) { o.frustumCulled = false; } });
  model.updateMatrixWorld(true);
  const pel = new Th.Vector3(); bones.pelvis.getWorldPosition(pel); model.position.y = -pel.y; // la cadera en el origen (como en el dibujo 2D)
  const U = { uShirt: { value: hex('#c00') }, uTrim: { value: hex('#fff') }, uShorts: { value: hex('#fff') }, uSock: { value: hex('#c00') }, uBoot: { value: hex('#111') }, uSkin: { value: new Th.Color(1, 1, 1) }, uHair: { value: hex('#2a1b10') }, uGlove: { value: hex('#e8ff3a') }, uPat: { value: 0 }, uGK: { value: 0 }, uArm: { value: 0 } };
  let body = null; model.traverse((o) => { if (o.isMesh && o.material && o.material.name === 'MI_Superhero_Male') body = o.material; });
  if (body) patch(body, U);
  const mixer = new Th.AnimationMixer(model), idle = gltf.animations.find((a) => a.name === 'Idle_Loop'), jab = gltf.animations.find((a) => a.name === 'Punch_Jab');
  const idleA = idle ? mixer.clipAction(idle) : null; if (idleA) idleA.play();
  const jabA = jab ? mixer.clipAction(jab) : null; if (jabA) { jabA.play(); jabA.setEffectiveWeight(0); }
  const others = []; model.traverse((o) => { if (o.isMesh && o.material && o.material.name !== 'MI_Superhero_Male') others.push(o); });
  R = { renderer, scene, cam, group, model, mixer, bones, U, cv, idleDur: idle ? idle.duration : 1, t0: performance.now(), S, idleA, jabA, others, fdice: null };
  state = 'ready';
  try { renderer.setSize(128, 128, false); renderer.compile(scene, cam); renderer.render(scene, cam); } catch (e) {} // v15 · compila ya los sombreadores (sin tirón en la primera jugada)
}
// ---------- postura ----------
const V = () => new (T().Vector3)(), Q = () => new (T().Quaternion)();
let _a, _b, _q, _wq, _pq;
function aim(bone, child, dir) {
  bone.getWorldPosition(_a); child.getWorldPosition(_b); _b.sub(_a); if (_b.lengthSq() < 1e-8) return; _b.normalize();
  _q.setFromUnitVectors(_b, dir);
  bone.getWorldQuaternion(_wq); _wq.premultiply(_q);
  bone.parent.getWorldQuaternion(_pq); bone.quaternion.copy(_pq.invert().multiply(_wq));
  bone.updateMatrixWorld(true);
}
// tono de piel: el modelo es de piel clara; se multiplica por el tono del futbolista respecto a esa referencia
const REF = { r: .86, g: .64, b: .5 };
function setLook(f) {
  const U = R.U, kit = f.kit || '#c00';
  const lumK = hex(kit).getHSL({}).l;
  U.uShirt.value.set(kit); U.uTrim.value.set(f.trim || (lumK > .7 ? '#1b2a4a' : '#ffffff'));
  U.uShorts.value.set(f.shorts || (lumK > .72 ? '#1d2230' : lumK < .25 ? '#e9edf2' : '#ffffff'));
  U.uSock.value.set(f.gk ? kit : kit); U.uBoot.value.set(f.boot || '#121418'); U.uGlove.value.set(f.glove || '#e8ff3a');
  U.uHair.value.set(f.hair || '#2a1b10');
  const sk = hex(f.skin, '#d9a582'); U.uSkin.value.setRGB(Math.min(1.25, sk.r / REF.r), Math.min(1.25, sk.g / REF.g), Math.min(1.25, sk.b / REF.b));
  [U.uShirt, U.uTrim, U.uShorts, U.uSock, U.uBoot, U.uGlove, U.uHair].forEach((x) => x.value.convertSRGBToLinear()); // colores de la equipación en espacio lineal
  U.uPat.value = f.gk ? 0 : PAT[f.pattern] || 0; U.uGK.value = f.gk ? 1 : 0;
}
function pose(f, p) {
  const Th = T(), B = R.bones, back = !!f.back;
  R.group.rotation.set(0, 0, -(p.phi || 0)); R.model.rotation.set(0, back ? Math.PI : 0, 0);
  R.mixer.setTime(((performance.now() - R.t0) / 1000) % R.idleDur);
  R.group.updateMatrixWorld(true);
  const gq = R.group.quaternion, depth = back ? -1 : 1;
  // lado de la pantalla → hueso: de frente, la izquierda de la pantalla es el lado derecho del futbolista
  const side = (sx) => ((sx < 0) !== back ? '_r' : '_l');
  const dirOf = (x, y, z) => V().set(x, y, z).normalize().applyQuaternion(gq);
  // inclinación del tronco
  if (p.lean && B.spine_01) { const q = Q().setFromAxisAngle(V().set(0, 0, 1).applyQuaternion(gq), -p.lean); const wq = B.spine_01.getWorldQuaternion(Q()).premultiply(q); const pq = B.spine_01.parent.getWorldQuaternion(Q()); B.spine_01.quaternion.copy(pq.invert().multiply(wq)); R.group.updateMatrixWorld(true); }
  // piernas: ángulo del muslo (adelante = hacia la cámara si mira de frente), flexión de rodilla y apertura lateral
  [[-1, p.legs[0]], [1, p.legs[1]]].forEach(([sx, L]) => {
    if (!L) return; const s = side(sx), th = B['thigh' + s], ca = B['calf' + s], fo = B['foot' + s]; if (!th || !ca || !fo) return;
    const a = L.a || 0, fl = L.flex || 0, lx = L.sx || 0, open = sx * .045;
    aim(th, ca, dirOf(lx * Math.sin(a) + open, -Math.cos(a), depth * (1 - Math.abs(lx)) * Math.sin(a)));
    const fa = a - fl; aim(ca, fo, dirOf(lx * Math.sin(fa) + open * .5, -Math.cos(fa), depth * (1 - Math.abs(lx)) * Math.sin(fa)));
  });
  // brazos: ángulo desde arriba (0 = arriba, ±π = abajo) en el plano de la pantalla; codo con su ángulo extra
  [[-1, p.aL ?? -2.8, p.eL], [1, p.aR ?? 2.8, p.eR]].forEach(([sx, a, e]) => {
    const s = side(sx), up = B['upperarm' + s], lo = B['lowerarm' + s], ha = B['hand' + s]; if (!up || !lo || !ha) return;
    aim(up, lo, dirOf(Math.sin(a), Math.cos(a), .12 * depth));
    const a2 = a + (e || 0) * sx; aim(lo, ha, dirOf(Math.sin(a2), Math.cos(a2), .18 * depth));
  });
}
// de perfil (primer plano del tiro): mira hacia +x; legs/arms [0] = lado lejano, [1] = cercano. Ángulos desde abajo
// (h: muslo, k: flexión de rodilla) y brazos (s: hombro, e: codo), positivos hacia delante; lean: tronco hacia delante
function poseSide(f, P) {
  const B = R.bones; R.group.rotation.set(0, 0, 0); R.model.rotation.set(0, Math.PI / 2, 0);
  R.mixer.setTime(((performance.now() - R.t0) / 1000) % R.idleDur); R.group.updateMatrixWorld(true);
  const d = (a) => V().set(Math.sin(a), -Math.cos(a), 0);
  if (P.lean && B.spine_01) { const q = Q().setFromAxisAngle(V().set(0, 0, 1), -P.lean); const wq = B.spine_01.getWorldQuaternion(Q()).premultiply(q); const pq = B.spine_01.parent.getWorldQuaternion(Q()); B.spine_01.quaternion.copy(pq.invert().multiply(wq)); R.group.updateMatrixWorld(true); }
  (P.legs || []).forEach((L, i) => { const s = i ? '_r' : '_l', th = B['thigh' + s], ca = B['calf' + s], fo = B['foot' + s], ba = B['ball' + s]; if (!th) return; aim(th, ca, d(L.h)); aim(ca, fo, d(L.h - L.k)); if (ba) aim(fo, ba, d(L.h - L.k + Math.PI / 2 - (L.p || 0))); });
  (P.arms || []).forEach((A, i) => { const s = i ? '_r' : '_l', up = B['upperarm' + s], lo = B['lowerarm' + s], ha = B['hand' + s]; if (!up) return; const sd = V().set(0, 0, i ? .25 : -.25); aim(up, lo, d(A.s).add(sd).normalize()); aim(lo, ha, d(A.s + A.e).add(sd).normalize()); });
}
function drawSide(c, hx, hy, u, f, P) {
  if (state === 'idle') load();
  if (state !== 'ready' || off() || !c || !(u > 2)) return false;
  try {
    if (!_a) { _a = V(); _b = V(); _q = Q(); _wq = Q(); _pq = Q(); }
    setLook({ ...f, back: false }); poseSide(f, P || {});
    const want = Math.max(96, Math.min(1024, Math.round(u * 2 * R.S * (window.devicePixelRatio > 1 ? 1.4 : 1))));
    if (Math.abs(R.cv.width - want) > 24) R.renderer.setSize(want, want, false);
    R.renderer.render(R.scene, R.cam);
    c.drawImage(R.cv, hx - R.S * u, hy - R.S * u, 2 * R.S * u, 2 * R.S * u);
    return true;
  } catch (e) { console.error(e); state = 'fail'; return false; }
}
// v14.1 · PUÑO CON DADOS (modo Dados y desempates): el antebrazo y la mano derechos del mismo modelo, cerrados (postura
// de puñetazo de la Universal Animation Library) y apuntando hacia arriba, con los dados asomando entre los dedos.
// o: { dice: [v1, v2…] caras que asoman, sty: 'me' | 'rv' | 'gold', shake: 0..1 (agitar), skin }
function drawFist(c, x, y, sz, o = {}) {
  if (state === 'idle') load();
  if (state !== 'ready' || !R.jabA || !__M.dados || !__M.dados.dieMesh) return false;
  try {
    const Th = T(), B = R.bones, n = Math.min(3, (o.dice || [1, 1]).length);
    if (!_a) { _a = V(); _b = V(); _q = Q(); _wq = Q(); _pq = Q(); }
    if (!R.fdice || R.fdice.sty !== (o.sty || 'me') || R.fdice.list.length !== n) {
      if (R.fdice) R.fdice.list.forEach((m) => R.scene.remove(m));
      R.fdice = { sty: o.sty || 'me', list: Array.from({ length: n }, () => { const m = __M.dados.dieMesh(.042, o.sty || 'me'); R.scene.add(m); return m; }) };
    }
    setLook({ kit: '#222', skin: o.skin || '#d9a582' }); R.U.uArm.value = 1; R.others.forEach((m) => { m.visible = false; });
    R.idleA && R.idleA.setEffectiveWeight(0); R.jabA.setEffectiveWeight(1);
    R.group.rotation.set(0, 0, 0); R.model.rotation.set(0, 0, 0);
    R.mixer.setTime(.18 * R.jabA.getClip().duration); R.group.updateMatrixWorld(true);
    // antebrazo casi vertical hacia arriba, algo inclinado hacia la cámara; agitar = vaivén rápido
    const sh = o.shake || 0, wob = sh ? Math.sin(performance.now() / 38) * .35 * sh : 0;
    aim(B.upperarm_r, B.lowerarm_r, V().set(-.25, -.75, .6).normalize());
    aim(B.lowerarm_r, B.hand_r, V().set(.12 + wob, 1, .32).normalize());
    const hp = B.hand_r.getWorldPosition(V()), mid = B.middle_01_r ? B.middle_01_r.getWorldPosition(V()) : hp.clone(), th = B.thumb_03_r ? B.thumb_03_r.getWorldPosition(V()) : hp.clone(), ix = B.index_02_r ? B.index_02_r.getWorldPosition(V()) : hp.clone();
    const up = mid.clone().sub(hp).normalize();
    // los dados: entre el pulgar y el índice, asomando por arriba del puño
    const base = th.clone().lerp(ix, .5).addScaledVector(up, .012).add(V().set(0, 0, .012));
    R.fdice.list.forEach((m, k) => {
      m.position.copy(base).add(V().set((k - (n - 1) / 2) * .034, k % 2 ? .006 : 0, -k * .01));
      m.quaternion.copy(__M.dados.targetQ(o.dice[k] || 1, .5 + k * .9)).premultiply(Q().setFromEuler(new Th.Euler(.5 + wob, k * .4, .3 - k * .5)));
      m.visible = true;
    });
    // encuadre del puño
    const cen = hp.clone().addScaledVector(up, .04), H = .115, old = { l: R.cam.left, r: R.cam.right, t: R.cam.top, b: R.cam.bottom, p: R.cam.position.clone() };
    R.cam.left = -H; R.cam.right = H; R.cam.top = H; R.cam.bottom = -H; R.cam.position.set(cen.x, cen.y, cen.z + 3); R.cam.lookAt(cen); R.cam.updateProjectionMatrix();
    const want = Math.max(128, Math.min(768, Math.round(sz * (window.devicePixelRatio > 1 ? 1.5 : 1))));
    if (Math.abs(R.cv.width - want) > 24) R.renderer.setSize(want, want, false);
    R.renderer.render(R.scene, R.cam);
    c.drawImage(R.cv, x - sz / 2, y - sz / 2, sz, sz);
    // se deja todo como estaba para los futbolistas
    R.cam.left = old.l; R.cam.right = old.r; R.cam.top = old.t; R.cam.bottom = old.b; R.cam.position.copy(old.p); R.cam.lookAt(0, 0, 0); R.cam.updateProjectionMatrix();
    R.fdice.list.forEach((m) => { m.visible = false; }); R.U.uArm.value = 0; R.others.forEach((m) => { m.visible = true; });
    R.jabA.setEffectiveWeight(0); R.idleA && R.idleA.setEffectiveWeight(1);
    return true;
  } catch (e) { console.error(e); return false; }
}
// pinta un futbolista en el lienzo 2D: (hx, hy) es la cadera y u los píxeles por metro, como el dibujo 2D
function draw(c, hx, hy, u, f, p) {
  if (state === 'idle') load();
  if (state !== 'ready' || off() || !c || !(u > 2)) return false;
  try {
    if (!_a) { _a = V(); _b = V(); _q = Q(); _wq = Q(); _pq = Q(); }
    setLook(f); pose(f, p || {});
    // resolución del lienzo 3D según el tamaño en pantalla (más nítido de cerca, más barato de lejos)
    const want = Math.max(96, Math.min(420, Math.round(u * 2 * R.S * (window.devicePixelRatio > 1 ? 1.15 : 1)))); // v15 · más barato: hay 2 por fotograma
    if (Math.abs(R.cv.width - want) > 24) { R.renderer.setSize(want, want, false); }
    R.renderer.render(R.scene, R.cam);
    c.drawImage(R.cv, hx - R.S * u, hy - R.S * u, 2 * R.S * u, 2 * R.S * u);
    return true;
  } catch (e) { console.error(e); state = 'fail'; return false; }
}
return { load, draw, drawSide, drawFist, ready: () => state === 'ready', get state() { return state; } };
})();
