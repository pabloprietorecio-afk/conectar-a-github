__M.pens = (() => {
// v13 · TANDA DE PENALTIS POR GESTOS: todo el cálculo, sin interfaz (se prueba en Node: pruebas/penales_test.cjs).
// Diseño: documento «Tanda de penaltis por gestos» (2-11-2026) y docs/DISENO.md. Unidades: metros y segundos.
// Portería de 7,32 × 2,44; x = 0 en el centro (positivo = a la derecha del lanzador) e y = 0 en el suelo.
// Los coeficientes son VALORES DE DISEÑO calibrados con simulación (~76 % de gol entre bots medios, cerca del ~75 %
// real en tandas, Kerwin y Bray 2006); los marcados «de diseño» no tienen fuente y se ajustan con probadores.
const GW = 7.32, GH = 2.44, HW = GW / 2, BALL_R = 0.11, POST_R = 0.06, DIST = 11;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sig = (z) => 1 / (1 + Math.exp(-z));
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function gauss(rng) { let u = 0, v = 0; while (u === 0) u = rng(); while (v === 0) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0; return h >>> 0; };
const norm = (x) => clamp(((x == null ? 50 : x) - 40) / 59, 0, 1); // atributo de 40 a 99 → 0 a 1

// Ajustes en una sola tabla (como CFG del partido) para probarlos con probadores
const K = {
  fullLen: 280, zeroLen: 50, minLen: 30, maxT: 1.2, // gesto: px (≈ dp) y segundos
  dead: 0.10, curveMax: 0.30, // rosca: flecha/cuerda (v15: hace falta un trazo claramente curvo)
  sigma0: 0.26, presK: 1.2, spinDelay: 0.05, // error base (m), peso de la presión, retraso por rosca (s)
  homeKeeper: 0.02, // margen extra del portero local (s)
  ringPeriod: 1.3, ringGood: [0.45, 0.82], // v15 · anillo de potencia: sube y baja cada 1,3 s; zona verde (la roja, > 0,85, se va)
  slowBase: 1.0, slowRefl: 0.1, // cámara lenta del vuelo con el usuario de portero: ×(0,9 − 0,2·Reflejos), ×0,8 el medio (v13.1: antes ×0,5, el balón del bot parecía lento)
  earlyRead: 0.25, // si el portero se lanza más de 0,25 s antes del golpeo, el lanzador puede cambiar de lado
  autoShot: 25, refWhistle: 12, // s de espera
};

// ---------- atributos de la tanda a partir de los del juego ----------
// El juego guarda VEL, REG, PAS, TIR, DEF, FIS (y POR en porteros), rasgo y resistencia. La tanda usa ocho atributos
// derivados (valores de diseño): Definición = Tiro; Técnica = media de Regate y Pase; Potencia = 60 % Tiro + 40 % Físico;
// Sangre fría = media de Tiro y media general, más el rasgo (capitán +6, finalizador +4, mago +3).
// Portero: Reflejos = Portero; Colocación y Estirón = Portero ± 4 (fijo por futbolista); Agilidad = 75 % Portero + 25 % Velocidad.
const TRAIT_SF = { capitan: 6, finalizador: 4, mago: 3, muro: 2 };
// zurdos conocidos del catálogo (el resto, diestros por defecto; se puede editar)
const LEFT = new Set(['Lionel Messi', 'Diego Maradona', 'Mohamed Salah', 'Roberto Carlos', 'Lamine Yamal', 'Ferenc Puskás', 'Antoine Griezmann', 'Marcelo', 'Ángel Di María', 'Bernardo Silva', 'Bukayo Saka', 'Jordi Alba', 'Arjen Robben', 'Robin van Persie', 'Gareth Bale', 'Ryan Giggs', 'Hristo Stoichkov', 'Marcos Alonso', 'Iago Aspas', 'James Rodríguez', 'Alphonso Davies', 'Riyad Mahrez', 'Hakim Ziyech']);
function shooterAttrs(p, energy = 100, ovr = null) {
  const st = (p && p.stats) || {}, tir = st.TIR ?? 50, reg = st.REG ?? 50, pas = st.PAS ?? 50, fis = st.FIS ?? 50;
  const o = ovr ?? Math.round(0.4 * tir + 0.3 * reg + 0.3 * pas), tr = p && p.trait;
  const raw = { def: tir, tec: (reg + pas) / 2 + (tr === 'mago' ? 4 : 0), pot: 0.6 * tir + 0.4 * fis, sf: (tir + o) / 2 + (TRAIT_SF[tr] || 0) };
  return { def: norm(raw.def), tec: norm(raw.tec), pot: norm(raw.pot), sf: norm(raw.sf), fat: clamp(1 - (energy ?? 100) / 100, 0, 1), foot: p && LEFT.has(p.name) ? 'L' : 'R',
    show: { Definición: Math.round(raw.def), Técnica: Math.round(raw.tec), Potencia: Math.round(raw.pot), 'Sangre fría': Math.round(Math.min(99, raw.sf)) } };
}
function keeperAttrs(p) {
  const st = (p && p.stats) || {}, por = st.POR ?? 60, vel = st.VEL ?? 55, h = hashStr((p && p.name) || '');
  const raw = { refl: por, col: por + (h % 9) - 4, agil: 0.75 * por + 0.25 * vel, est: por + ((h >>> 5) % 9) - 4 };
  return { refl: norm(raw.refl), col: norm(raw.col), agil: norm(raw.agil), est: norm(raw.est),
    show: { Reflejos: Math.round(raw.refl), Colocación: Math.round(raw.col), Agilidad: Math.round(raw.agil), Estirón: Math.round(raw.est) } };
}

// ---------- gesto del lanzador ----------
// pts: [{x, y, t}] en px de pantalla (y hacia abajo) y ms; centro y radio del balón en pantalla.
// Devuelve el punto de golpeo g (−1 arriba del balón … +1 abajo), el ángulo de la cuerda (0 = recto a la portería,
// positivo a la derecha), la potencia p (0–1), la rosca s (−1…1; positiva = trazo abombado a la derecha) y su tramo.
// v15 · potencia por anillo: si llega o.power (0..1, la del anillo al soltar), la longitud y la velocidad del trazo ya no
// cuentan para la potencia; el trazo solo da la dirección (y la rosca, si es claramente curvo).
const powerRing = (ms) => { const ph = (ms / 1000) / K.ringPeriod; const f = ph - Math.floor(ph); return 1 - Math.abs(1 - 2 * f); }; // 0→1→0
function analyze(pts, center, radius, bias = 0, o = {}) {
  if (!pts || pts.length < 2) return { ok: false, why: 'toque' };
  const a = pts[0], b = pts[pts.length - 1], cx = b.x - a.x, cy = b.y - a.y, L = Math.hypot(cx, cy), dur = ((b.t ?? 0) - (a.t ?? 0)) / 1000;
  if (L < K.minLen) return { ok: false, why: 'toque' };
  if (cy > -0.17 * L) return { ok: false, why: 'abajo' }; // hacia abajo o casi horizontal (más de 100° de la vertical)
  if (o.power == null && dur > K.maxT) return { ok: false, why: 'lento' };
  const g = clamp((a.y - center.y) / radius, -1, 1);
  const angle = Math.atan2(cx, -cy);
  const p = o.power != null ? clamp(o.power, 0, 1) : clamp((L - K.zeroLen) / (K.fullLen - K.zeroLen), 0, 1);
  let area = 0; // área con signo entre el trazo y su cuerda (fórmula del polígono)
  for (let i = 0; i < pts.length - 1; i++) { const ax = pts[i].x - a.x, ay = pts[i].y - a.y, bx = pts[i + 1].x - a.x, by = pts[i + 1].y - a.y; area += ax * by - ay * bx; }
  const f = -1.5 * (area / 2) / (L * L) - bias; // en un arco, 1,5·A/L² = flecha/cuerda; positiva = barriga a la derecha
  const r = clamp((Math.abs(f) - K.dead) / (K.curveMax - K.dead), 0, 1);
  return { ok: true, g, angle, p, s: r * Math.sign(f), f, L, dur, tier: p < 0.35 ? 0 : p <= 0.7 ? 1 : 2 };
}
const tierOf = (p) => (p < 0.35 ? 0 : p <= 0.7 ? 1 : 2);
// calibración automática del pulgar: media de la curva de los trazos casi rectos (|f| < 0,10), como mucho ±0,05
function calibrate(bias, f) { if (Math.abs(f) >= 0.10) return bias; return clamp(bias * 0.8 + (f + bias) * 0.2 * 0.6, -0.05, 0.05); }

// ---------- tiro ----------
const ballSpeed = (p, pot) => 15 + (24 + 6 * pot - 15) * Math.pow(clamp(p, 0, 1), 0.8); // m/s: 54 km/h a 97 km/h (medio)
const heightTarget = (g, p) => 0.15 + (g + 1) / 2 * (1.50 - 0.15) + 0.5 * p * p; // raso 0,15 m · centro 0,83 · abajo 1,50
const bendOf = (s, p) => s * (0.9 + 0.6 * (1 - p)); // curva visible (m): más en un tiro colocado que a tope
function flightTime(x, y, v, s) { const d = Math.sqrt(DIST * DIST + x * x + (y - BALL_R) ** 2) * (1 + 0.03 * Math.abs(s)); return d / v * 1.05; }
// trivela: rosca hacia el lado del pie (exterior). Diestro: s < 0; zurdo: s > 0
const isTrivela = (s, foot) => Math.abs(s) > 0.05 && (foot === 'L' ? s > 0 : s < 0);
function sigmaOf(p, A, P, s, foot) {
  let sg = K.sigma0 * (1 + 2.2 * p * p + 3 * Math.max(0, p - 0.85) ** 2 * 10) * (1.2 - 0.4 * A.def) * (1.1 - 0.2 * A.tec) * (1 + K.presK * P * (1 - A.sf)) * (1 + 0.25 * (A.fat || 0)) * (1 + (0.7 - 0.3 * A.tec) * Math.abs(s));
  if (isTrivela(s, foot)) sg *= 1 + 0.3 * Math.abs(s) * (1 - A.tec);
  return sg;
}
// marco: dentro, palo (que entra o sale) o fuera
function frameOf(x, y, rng) {
  const ax = Math.abs(x);
  if (ax <= HW - BALL_R && y <= GH - BALL_R) return { k: 'dentro' };
  if (ax <= HW + POST_R + BALL_R && y <= GH + POST_R + BALL_R) return { k: rng() < 0.4 ? 'palo_dentro' : 'palo_fuera', bar: ax <= HW - BALL_R };
  return { k: 'fuera', high: y > GH + POST_R + BALL_R && ax <= HW + 0.6, wide: ax > HW + POST_R + BALL_R };
}
// intención (xt, g, p, s) → tiro real con el error de los atributos y la presión
function resolveShot(it, A, P, rng) {
  const p = clamp(it.p, 0, 1), s = clamp(it.s || 0, -1, 1);
  const yt = it.yt ?? heightTarget(it.g ?? 0, p);
  const sg = sigmaOf(p, A, P, s, A.foot);
  const x = it.xt + gauss(rng) * sg, y = Math.max(BALL_R, yt + 0.25 * p * p + 0.6 * Math.max(0, p - 0.85) + gauss(rng) * (0.9 + 0.25 * Math.max(0, yt - 1.2)) * sg);
  const v = ballSpeed(p, A.pot), tb = flightTime(x, y, v, s);
  return { xt: it.xt, yt, x, y, p, s, g: it.g ?? 0, v, tb, sigma: sg, bend: bendOf(s, p), trivela: isTrivela(s, A.foot), frame: frameOf(x, y, rng), panenka: p < 0.2 && Math.abs(it.xt) < 1.2 && yt > 1.0 };
}

// ---------- portero ----------
// tiempo que necesita para llegar a (x, y): alcance de cuerpo y brazo 0,45 + 0,30·Estirón
function tNeed(x, y, KA, extra = 0) {
  const reach = 0.45 + 0.30 * KA.est + extra, xe = Math.max(0, Math.abs(x) - reach);
  return (0.25 + 0.40 * xe / (HW - 0.6) + 0.40 * Math.max(0, y - 1) / 1.44) * (1.15 - 0.30 * KA.agil);
}
const heightOf = (y) => clamp((y - 0.1) / 2.1, 0, 1); // 0 raso · 0,5 media · 1 alto
const sideOf = (x) => (Math.abs(x) < 0.9 ? 0 : x > 0 ? 1 : -1);
// D: decisión del portero { dir −1|0|1, hd altura elegida 0–1, step paso corto, t0 s respecto al golpeo, fix mano cambiada ±1 }
function keeperResolve(sh, D, KA, o, rng) {
  const { x, y, tb } = sh, side = sideOf(x), refl = KA.refl, ax = Math.abs(x);
  const out = (saved, kind, m = null) => ({ saved, kind, margin: m, side, correct: D.dir === side });
  if (D.dir === 0) {
    if (D.hd >= 0.75) { // salto vertical: balón alto al centro
      if (ax < 1.1 && y > 1.2) { const m = (tb - D.t0) - 0.5 * (1.15 - 0.30 * KA.agil) + (o.keeperHome ? K.homeKeeper : 0); return out(rng() < sig(m / 0.05) * (0.85 + 0.10 * refl), 'alto', m); }
      if (ax < 0.6 && y <= 1.2) return out(rng() < 0.5, 'cuerpo');
      return out(false, null);
    }
    if (side === 0 && y < 1.9) return out(rng() < 0.80 * (0.85 + 0.15 * refl), 'cuerpo');
    return out(false, null);
  }
  if (D.dir !== side) return side === 0 && ax < 0.6 && y < 0.8 && rng() < 0.15 ? out(true, 'pie') : out(false, null);
  let need = tNeed(x, y, KA);
  if (D.step) { if (ax > 1.6 || y > 1.9) return out(false, 'corto', -1); need *= 0.8; }
  need += 0.06 * Math.abs((D.hd ?? heightOf(y)) - heightOf(y)); // se lanzó raso y el balón va alto, o al revés
  let m = (tb - D.t0) - need - K.spinDelay * Math.abs(sh.s || 0) * (1 - 0.6 * KA.col) + (o.keeperHome ? K.homeKeeper : 0);
  if (D.fix) m += 0.05 * D.fix;
  const saved = rng() < sig(m / 0.05) * (0.85 + 0.10 * refl);
  return out(saved, saved ? (m > 0.12 && sh.v < 22 ? 'blocaje' : 'despeje') : m > -0.02 ? 'cuela' : 'tarde', m);
}

// ---------- bots ----------
// Portero rival (cuando tiras tú): a veces lee el balón tras el golpeo; si no, adivina antes, inclinado por tus
// últimos 10 tiros (si repites lado, se inclina hacia él; dos vaselinas en cuatro tiros → se queda quieto un 30 % más)
// v15 · PORTERO DEL USUARIO: desliza desde el portero hasta un punto de la portería y las manos van a ese punto exacto.
// T = { X, Y } (m, en la portería; X > 0 a la derecha del portero visto desde el lanzador) y t0 (s respecto al golpeo,
// cuando empezó a moverse). Alcance máximo 2,3 + 0,7·Estirón desde el centro del cuerpo (0, 1); tiempo para llegar según la
// distancia y la Agilidad. Si llega tarde, las manos están a medio camino cuando pasa el balón.
// Blocaje: balón a ≤ 0,20 m de las manos y no muy fuerte · despeje: ≤ 0,42 (+ Reflejos) de las manos o choca con el cuerpo.
function keeperPoint(sh, T, KA, o, rng) {
  const cx = 0, cy = 1.0, maxR = 2.3 + 0.7 * KA.est;
  let X = T.X, Y = clamp(T.Y, 0.05, GH + 0.25); const dx = X - cx, dy = Y - cy, dl = Math.hypot(dx, dy);
  if (dl > maxR) { X = cx + dx / dl * maxR; Y = cy + dy / dl * maxR; }
  const need = (0.16 + 0.34 * Math.min(dl, maxR) / 2.6) * (1.15 - 0.30 * KA.agil);
  const avail = sh.tb - T.t0 + (o.keeperHome ? K.homeKeeper : 0), k = clamp(avail / need, 0, 1);
  const hx = cx + (X - cx) * k, hy = cy + (Y - cy) * k; // dónde están las manos cuando pasa el balón
  const d = Math.hypot(sh.x - hx, sh.y - hy);
  // cuerpo: segmento de los pies a las manos (los pies se quedan cerca del centro)
  const fx = hx * 0.25, fy = 0.15, vx = hx - fx, vy = hy - fy, L2 = vx * vx + vy * vy || 1, u = clamp(((sh.x - fx) * vx + (sh.y - fy) * vy) / L2, 0, 1);
  const db = Math.hypot(sh.x - (fx + vx * u), sh.y - (fy + vy * u));
  const rc = 0.20 + 0.06 * KA.col, rp = 0.42 + 0.10 * KA.refl, side = sideOf(sh.x);
  const out = (saved, kind) => ({ saved, kind, margin: avail - need, side, correct: sideOf(X) === side, hands: { x: hx, y: hy }, target: { x: X, y: Y }, d, k });
  if (d <= rc) return out(true, sh.v < 23 || rng() < 0.4 ? 'blocaje' : 'despeje');
  if (d <= rp) return out(rng() < 0.92 - (d - rc) / (rp - rc) * 0.35, 'despeje');
  if (db <= 0.26 && u < 0.9) return out(rng() < 0.85, 'cuerpo');
  return out(false, k < 1 ? 'tarde' : 'lejos');
}
function botKeeper(KA, sh, mem, rng) {
  if (rng() < 0.18 + 0.22 * KA.refl) { // reacciona al balón (la rosca le engaña: ve la dirección inicial)
    const seen = sh.x + 0.8 * (sh.bend || 0);
    return { dir: sideOf(seen), hd: heightOf(sh.y), step: false, t0: 0.30 - 0.12 * KA.refl + gauss(rng) * 0.03, read: true };
  }
  let pl = 0.47, pc = 0.06, pr = 0.47;
  const last = ((mem && mem.shots) || []).slice(-10);
  if (last.length >= 3) {
    const bias = (last.filter((v) => v.side > 0).length - last.filter((v) => v.side < 0).length) / last.length;
    pr += 0.2 * bias; pl -= 0.2 * bias;
    if (last.slice(-4).filter((v) => v.panenka).length >= 2) pc += 0.30;
  }
  const tot = pl + pc + pr, r = rng() * tot;
  const dir = r < pl ? -1 : r < pl + pc ? 0 : 1;
  const hr = rng(), hd = dir === 0 ? (rng() < 0.25 ? 1 : 0.4) : hr < 0.45 ? 0.1 : hr < 0.8 ? 0.5 : 0.9;
  return { dir, hd, step: false, t0: -0.07 + 0.08 * gauss(rng), read: false }; // arranca ~70 ms antes del golpeo (los reales, ~50 ms)
}
// Lanzador rival (cuando paras tú): 38 % izquierda, 24 % centro, 38 % derecha, corregido por tus últimas estiradas
function botShot(A, mem, rng) {
  let pl = 0.38, pc = 0.24, pr = 0.38;
  const last = ((mem && mem.dives) || []).slice(-10);
  if (last.length >= 3) { const bias = (last.filter((d) => d > 0).length - last.filter((d) => d < 0).length) / last.length; pl += 0.15 * bias; pr -= 0.15 * bias; }
  if (rng() < 0.03 * A.sf) return { xt: (rng() - 0.5) * 0.6, g: 0.9, p: 0.06, s: 0, side: 0 }; // vaselina (Panenka)
  const r = rng() * (pl + pc + pr), side = r < pl ? -1 : r < pl + pc ? 0 : 1;
  const xt = side === 0 ? (rng() - 0.5) : side * (2.0 + rng() * (0.6 + 0.6 * A.def));
  const gr = rng(), g = gr < 0.5 ? -0.8 : gr < 0.8 ? 0 : 0.8;
  const p = 0.35 + rng() * 0.5, s = rng() < 0.25 ? (rng() - 0.5) * 1.2 : 0;
  return { xt, g, p, s, side };
}
// señal del lanzador en los últimos 0,1–0,25 s (carrera, pie de apoyo, cadera): honesta 0,8 − 0,5·Técnica, engaño 0,15·Técnica
function cueOf(intent, A, rng) {
  const side = Math.abs(intent.xt) < 0.9 ? 0 : Math.sign(intent.xt), r = rng(), honest = 0.8 - 0.5 * A.tec, fake = 0.15 * A.tec;
  if (side === 0) return { side: 0, kind: r < honest ? 'honesta' : 'ninguna' };
  return r < honest ? { side, kind: 'honesta' } : r < honest + fake ? { side: -side, kind: 'engaño' } : { side: 0, kind: 'ninguna' };
}
// el portero se lanzó demasiado pronto: el lanzador puede cambiar de lado (0,6·Sangre fría·Técnica)
function punishEarly(intent, D, A, rng) {
  if (D.t0 > -K.earlyRead || D.dir === 0) return null;
  if (rng() >= 0.6 * A.sf * A.tec) return null;
  const xt = -D.dir * (1.8 + rng() * 1.2);
  return { ...intent, xt, side: Math.sign(xt), read: true };
}

// ---------- presión ----------
const IMPORTANCE = { amistoso: 0, liga: 0, copa: 0.10, eliminatoria: 0.20, estrella: 0.35, final: 0.35 };
function pressure(o = {}) {
  let P = 0.25 + (IMPORTANCE[o.importance] ?? (+o.importance || 0));
  if (o.missLoses) P += 0.30; if (o.scoreWins) P -= 0.15; if (o.sudden) P += 0.10;
  if (o.home === true) P -= 0.03; else if (o.home === false) P += 0.05;
  return clamp(P + (o.rhythm || 0), 0, 1);
}
const rhythmOf = (secs) => (secs < 1 ? 0.10 : secs >= 2 && secs <= 5 ? -0.05 : secs > 10 ? 0.05 : 0); // Jordet: con prisa se falla más

// ---------- reglas de la tanda (regla 10) ----------
// listas de lanzadores: solo los que acabaron el partido; si un equipo tiene más, retira a los sobrantes (los peores);
// cuando han tirado todos, otra vuelta (el portero, al final de cada vuelta)
function takerLists(cands) { // cands: [[{i, q}] × 2] (i 0 = portero), orden ya elegido
  const n = Math.min(cands[0].length, cands[1].length);
  return cands.map((c) => {
    const keep = c.slice().sort((a, b) => (b.i === 0) - (a.i === 0) || b.q - a.q).slice(0, n).map((x) => x.i);
    const ord = c.map((x) => x.i).filter((i) => keep.includes(i));
    return ord.filter((i) => i !== 0).concat(ord.includes(0) ? [0] : []);
  });
}
function newShootout(lists, first = 0) { return { lists, first, goals: [0, 0], hist: [[], []], n: [0, 0], kicks: 0, winner: null, log: [] }; }
function nextKick(S) { const side = S.kicks % 2 === 0 ? S.first : 1 - S.first, L = S.lists[side]; return { side, who: L[S.n[side] % L.length], round: Math.floor(S.kicks / 2) + 1, sudden: S.kicks >= 10 }; }
function decidedOf(goals, hist, first) {
  const a = first, b = 1 - first, ka = hist[a].length, kb = hist[b].length;
  if (ka <= 5 && kb <= 5 && !(ka === 5 && kb === 5)) {
    if (goals[a] > goals[b] + (5 - kb)) return a;
    if (goals[b] > goals[a] + (5 - ka)) return b;
    return null;
  }
  return ka === kb && goals[a] !== goals[b] ? (goals[a] > goals[b] ? a : b) : null;
}
function record(S, side, goal, info = {}) {
  S.hist[side].push(!!goal); if (goal) S.goals[side]++; S.n[side]++; S.kicks++; S.log.push({ side, goal: !!goal, ...info });
  S.winner = decidedOf(S.goals, S.hist, S.first); return S;
}
// ¿qué pasa si falla o marca este lanzamiento? (para la presión)
function stakes(S, side) {
  const g = S.goals.slice(), h = S.hist.map((x) => x.slice());
  h[side].push(false); const ifMiss = decidedOf(g, h, S.first); h[side].pop();
  h[side].push(true); g[side]++; const ifGoal = decidedOf(g, h, S.first);
  return { missLoses: ifMiss === 1 - side, scoreWins: ifGoal === side, sudden: S.kicks >= 10 };
}

// ---------- un penalti entre bots (tanda rápida, partida guiada y simulaciones) ----------
function botKick(A, KA, o, rng, mem = null) {
  const it = botShot(A, mem, rng), sh = resolveShot(it, A, o.P ?? 0.4, rng);
  if (sh.frame.k === 'fuera' || sh.frame.k === 'palo_fuera') return { goal: false, kind: sh.frame.k, sh };
  const D = botKeeper(KA, sh, null, rng), r = keeperResolve(sh, D, KA, o, rng);
  return { goal: !r.saved, kind: r.saved ? 'parada' : sh.frame.k === 'palo_dentro' ? 'palo_dentro' : 'gol', sh, D, r };
}
// T: [{ sh: [atributos de lanzador por índice], kp: atributos del portero }, …]; lists de takerLists
function simShootout(T, lists, first, rng, o = {}) {
  const S = newShootout(lists, first);
  while (S.winner == null && S.kicks < 60) {
    const k = nextKick(S), st = stakes(S, k.side);
    const P = pressure({ importance: o.importance, ...st, home: o.home == null ? null : (k.side === 0) === o.home });
    const r = botKick(T[k.side].sh[k.who], T[1 - k.side].kp, { P, keeperHome: o.home == null ? false : (1 - k.side === 0) === o.home }, rng);
    record(S, k.side, r.goal, { who: k.who, kind: r.kind });
  }
  if (S.winner == null) S.winner = rng() < 0.5 ? 0 : 1;
  return S;
}

// ---------- texto que explica el tiro ----------
const cm = (m) => Math.max(5, Math.round(m * 100 / 5) * 5);
function explain(sh, r, mine) {
  const f = sh.frame;
  if (f.k === 'fuera') {
    if (f.high) return sh.p > 0.7 ? `Demasiada potencia: se fue ${cm(sh.y - GH)} cm arriba` : `Se fue ${cm(sh.y - GH)} cm alto`;
    return `Se fue ${cm(Math.abs(sh.x) - HW)} cm fuera${sh.p > 0.7 ? ': mucha potencia, poco control' : ''}`;
  }
  if (f.k === 'palo_fuera') return f.bar ? '¡Al larguero!' : '¡Al palo!';
  if (r && r.saved) {
    if (mine) return r.kind === 'blocaje' ? 'Lo atrapa: tiro flojo y a su alcance' : r.kind === 'cuerpo' ? 'Se quedó en el centro y la para con el cuerpo' : r.kind === 'pie' ? 'Se lanzó al otro lado, pero llega con el pie' : 'Adivinó el lado y llegó a tiempo';
    return r.kind === 'cuerpo' ? 'Te quedas en el centro y la paras' : `¡Lado bueno y a tiempo! Margen ${Math.abs(r.margin ?? 0).toFixed(2).replace('.', ',')} s`;
  }
  const tags = [];
  if (Math.abs(sh.x) > 2.8 && sh.y > 1.75) tags.push('¡A la escuadra!');
  else if (sh.y < 0.45 && Math.abs(sh.x) > 2.6) tags.push('Raso y pegado al palo');
  if (Math.abs(sh.s) > 0.3) tags.push(sh.trivela ? 'De trivela' : 'Con rosca');
  if (sh.panenka) tags.push('¡A lo Panenka!');
  if (f.k === 'palo_dentro') tags.push('Entra tras tocar el palo');
  if (!mine && r) {
    if (r.correct && r.margin != null && r.margin < 0) tags.push(`Lado bueno, pero tarde: ${Math.abs(r.margin).toFixed(2).replace('.', ',')} s`);
    else if (r.side !== 0 && !r.correct) tags.push(r.kind === 'corto' ? 'Diste un paso corto: no llegabas' : 'Te lanzaste al otro lado');
    else if (r.side === 0) tags.push('Al centro: había que quedarse');
  }
  if (mine && r && r.side !== 0 && !r.correct) tags.push('El portero se fue al otro lado');
  return tags.join(' · ') || (mine ? 'Gol: colocado y con potencia justa' : 'No hubo forma de pararlo');
}

return { K, GW, GH, HW, BALL_R, POST_R, DIST, clamp, sig, mulberry, gauss, norm, shooterAttrs, keeperAttrs, LEFT, analyze, tierOf, calibrate, powerRing, keeperPoint,
  ballSpeed, heightTarget, bendOf, flightTime, sigmaOf, frameOf, resolveShot, isTrivela, tNeed, heightOf, sideOf, keeperResolve,
  botKeeper, botShot, cueOf, punishEarly, pressure, rhythmOf, IMPORTANCE, takerLists, newShootout, nextKick, record, stakes, decidedOf, botKick, simShootout, explain };
})();
