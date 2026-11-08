// Pruebas del cálculo de la tanda de penaltis por gestos (fuente/penales.js), sin navegador: node pruebas/penales_test.cjs
// Además de comprobar reglas, recalibra el modelo: imprime los porcentajes de gol, parada y fuera.
const fs = require('fs'), path = require('path');
const __M = {}; eval(fs.readFileSync(path.join(__dirname, '..', 'fuente', 'penales.js'), 'utf8'));
const P = __M.pens;
let ok = true; const check = (n, c, x = '') => { ok = ok && !!c; console.log((c ? 'OK   ' : 'FALLA') + ' ' + n + (x ? ' · ' + x : '')); };
const pct = (a, n) => Math.round(1000 * a / n) / 10;

// ---------- gesto ----------
const arc = (x0, y0, x1, y1, h, n = 40, ms = 300) => { const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L, nx = -uy, ny = ux; return Array.from({ length: n + 1 }, (_, i) => { const t = i / n, d = 4 * h * t * (1 - t); return { x: x0 + (x1 - x0) * t + nx * d, y: y0 + (y1 - y0) * t + ny * d, t: t * ms }; }); };
const C = { x: 180, y: 505 }, R = 46;
let g = P.analyze(arc(180, 530, 180, 330, 0), C, R);
check('trazo recto de 200 px: potencia 0,65, sin rosca, golpeo por debajo del centro', g.ok && Math.abs(g.p - 0.652) < 0.01 && g.s === 0 && g.g > 0.5, JSON.stringify({ p: g.p.toFixed(2), s: g.s, g: g.g.toFixed(2) }));
g = P.analyze(arc(180, 530, 180, 330, 30), C, R);
check('arco abombado a la derecha (flecha 30 px): rosca positiva ≈ 0,25 (v15: hace falta un trazo claramente curvo)', g.ok && Math.abs(g.s - 0.25) < 0.04, g.s.toFixed(2));
g = P.analyze(arc(180, 530, 180, 330, -30), C, R);
check('arco abombado a la izquierda: rosca negativa', g.ok && g.s < -0.2, g.s.toFixed(2));
const S1 = arc(180, 530, 180, 430, 25, 20).slice(0, 11).concat(arc(180, 430, 180, 330, -25, 20).slice(1).map((p) => ({ ...p, t: p.t + 150 })));
check('trazo en S: la rosca se anula', P.analyze(S1, C, R).s === 0);
check('trazo hacia abajo: se anula', P.analyze(arc(180, 330, 180, 530, 0), C, R).why === 'abajo');
check('toque sin deslizar: no tira', P.analyze(arc(180, 505, 180, 480, 0), C, R).why === 'toque');
check('trazo de más de 1,2 s: se anula', P.analyze(arc(180, 530, 180, 330, 0, 40, 1400), C, R).why === 'lento');
check('longitud: 50 px → 0 y 280 px → 1', P.analyze(arc(180, 530, 180, 480, 0), C, R).p === 0 && P.analyze(arc(180, 530, 180, 250, 0), C, R).p === 1);
check('ángulo: hacia arriba a la derecha es positivo', P.analyze(arc(180, 530, 280, 330, 0), C, R).angle > 0.4);

// ---------- tiro ----------
const A = (v) => ({ def: v, tec: v, pot: v, sf: v, fat: 0.3, foot: 'R' }), KA = (v) => ({ refl: v, col: v, agil: v, est: v });
const row = (p) => { const v = P.ballSpeed(p, 0.5), tb = P.flightTime(3, 0.5, v, 0); return { p, kmh: Math.round(v * 3.6), tb: +tb.toFixed(2), sigma: +P.sigmaOf(p, { ...A(0.5), fat: 0 }, 0, 0, 'R').toFixed(2) }; };
const tab = [0, 0.35, 0.7, 1].map(row); console.log('      potencia:', JSON.stringify(tab));
check('velocidad 54 → 97 km/h y llegada 0,80 → 0,44 s (como el documento)', tab[0].kmh === 54 && tab[3].kmh === 97 && tab[0].tb === 0.8 && tab[3].tb === 0.44);
check('error típico 26 cm flojo, 54 cm al 70 % y ~1 m a tope (zona roja del anillo)', tab[0].sigma === 0.26 && tab[2].sigma === 0.54 && tab[3].sigma > 0.95, JSON.stringify(tab.map((x) => x.sigma)));
check('portero medio: 0,60 s a la esquina rasa y ~0,94 s a la escuadra', Math.abs(P.tNeed(3.3, 0.2, KA(0.5)) - 0.6) < 0.01 && Math.abs(P.tNeed(3.3, 2.2, KA(0.5)) - 0.94) < 0.01);
check('trivela: diestro con rosca negativa, zurdo con positiva', P.isTrivela(-0.5, 'R') && P.isTrivela(0.5, 'L') && !P.isTrivela(0.5, 'R'));

// ---------- atributos desde las cualidades del juego ----------
const sa = P.shooterAttrs({ name: 'Lionel Messi', trait: 'mago', stats: { TIR: 95, REG: 99, PAS: 92, FIS: 70 } }, 80, 94);
check('atributos del lanzador derivados (Messi): zurdo y cansancio 0,2', sa.foot === 'L' && Math.abs(sa.fat - 0.2) < 1e-9 && sa.def > 0.9 && sa.sf > 0.9, JSON.stringify(sa.show));
const ka = P.keeperAttrs({ name: 'Iker Casillas', stats: { POR: 88, VEL: 60 } });
check('atributos del portero derivados', ka.refl > 0.8 && ka.agil > 0.6, JSON.stringify(ka.show));

// ---------- simulación entre bots ----------
function sim(a, k, n, o = {}) {
  const rng = P.mulberry(o.seed || 7), res = { gol: 0, parada: 0, fuera: 0 };
  for (let i = 0; i < n; i++) { const r = P.botKick(A(a), KA(k), { P: o.P ?? 0.4, keeperHome: false }, rng); res[r.goal ? 'gol' : r.kind === 'parada' ? 'parada' : 'fuera']++; }
  return { gol: pct(res.gol, n), parada: pct(res.parada, n), fuera: pct(res.fuera, n) };
}
const m = sim(0.5, 0.5, 60000); console.log('      bot medio contra portero medio:', JSON.stringify(m));
check('entre bots medios entra el 72–80 % (real en tandas: ~75 %)', m.gol >= 72 && m.gol <= 80);
const hi = sim(0.8, 0.5, 40000), lo = sim(0.5, 0.8, 40000), w = sim(0.2, 0.8, 40000), s = sim(0.8, 0.2, 40000);
console.log('      0,8·0,5', JSON.stringify(hi), ' 0,5·0,8', JSON.stringify(lo), ' 0,2·0,8', JSON.stringify(w), ' 0,8·0,2', JSON.stringify(s));
check('los atributos cuentan: buen lanzador > medio > malo, buen portero para más', hi.gol > m.gol && lo.gol < m.gol && w.gol < lo.gol && s.gol > hi.gol);
const ph = sim(0.5, 0.5, 40000, { P: 0.95 }), pl = sim(0.5, 0.5, 40000, { P: 0.1 });
console.log('      presión 0,95', JSON.stringify(ph), ' presión 0,1', JSON.stringify(pl));
check('la presión alta hace fallar más', ph.fuera > pl.fuera + 2 && ph.gol < pl.gol);

// usuario de portero que solo reacciona: 0,33 ± 0,05 s reales (0,25 humanos + ~0,08 del móvil) por la cámara lenta
function human(scale, n = 40000, early = 0) {
  const rng = P.mulberry(11); let sv = 0;
  for (let i = 0; i < n; i++) {
    const it = P.botShot(A(0.5), null, rng), sh = P.resolveShot(it, A(0.5), 0.4, rng);
    if (sh.frame.k === 'fuera' || sh.frame.k === 'palo_fuera') continue;
    let D; if (rng() < early) D = { dir: rng() < 0.5 ? -1 : 1, hd: 0.5, t0: -0.2 * rng() }; else D = { dir: P.sideOf(sh.x + 0.8 * sh.bend), hd: P.heightOf(sh.y), t0: (0.33 + 0.05 * P.gauss(rng)) * scale };
    if (P.keeperResolve(sh, D, KA(0.5), {}, rng).saved) sv++;
  }
  return pct(sv, n);
}
const med = P.K.slowBase - P.K.slowRefl * 0.5;
const sa2 = P.shooterAttrs({ name: 'X', stats: { TIR: 78, REG: 72, PAS: 70, FIS: 70 } }, 80, 76), ka2 = P.keeperAttrs({ name: 'Y', stats: { POR: 78, VEL: 60 } });
const pr = P.powerRing; check('anillo de potencia: 0 al tocar, 1 a los 0,65 s y vuelve a 0 a los 1,3 s', pr(0) === 0 && Math.abs(pr(650) - 1) < .01 && pr(1300) < .01);
const hs = [1, med, 0.5].map((x) => human(x)); console.log(`      usuario de portero reaccionando, paradas con ×1/×${med.toFixed(2)} (portero medio)/×0,5:`, hs.join(' · '));
check(`casi sin cámara lenta (×${med.toFixed(2)}): el balón del bot va a velocidad real`, med >= .9);
// v15 · portero del usuario con las manos a un punto: reacción 0,2–0,3 s tras el golpeo y error de puntería
const kp = (err, t0) => { const r = P.mulberry(11); let sv = 0, n = 0; for (let i = 0; i < 20000; i++) { const it = P.botShot(sa2, { dives: [] }, r), sh = P.resolveShot(it, sa2, 0.3, r); if (sh.frame.k === 'fuera' || sh.frame.k === 'palo_fuera') continue; n++; if (P.keeperPoint(sh, { X: sh.x + P.gauss(r) * err, Y: sh.y + P.gauss(r) * err * 0.6, t0 }, ka2, {}, r).saved) sv++; } return pct(sv, n); };
const kps = [kp(0, .15), kp(.4, .2), kp(.8, .25)]; console.log('      manos a un punto: paradas exacto y rápido / error 0,4 m / error 0,8 m y lento:', kps.join(' · '));
check('manos a un punto: acertar el sitio rápido para mucho, fallar por medio metro para poco', kps[0] > 40 && kps[1] >= 15 && kps[1] <= 35 && kps[2] < 18);
const sh0 = { x: 2.5, y: .5, v: 22, tb: .55, s: 0 };
check('manos justo en el balón: blocaje; cerca: despeje; lejos: gol', P.keeperPoint(sh0, { X: 2.5, Y: .5, t0: 0 }, ka2, {}, () => .1).kind === 'blocaje' && P.keeperPoint(sh0, { X: 2.2, Y: .7, t0: 0 }, ka2, {}, () => .1).kind === 'despeje' && !P.keeperPoint(sh0, { X: -2.5, Y: .5, t0: 0 }, ka2, {}, () => .1).saved);

// ---------- reglas de la tanda ----------
let S = P.newShootout([[1, 2, 3, 4, 5], [1, 2, 3, 4, 5]], 0);
[[0, 1], [1, 0], [0, 1], [1, 0], [0, 1], [1, 0]].forEach(([sd, gl]) => P.record(S, sd, !!gl)); // 3-0 tras tres rondas
check('3-0 tras tres rondas: decidida', S.winner === 0, `${S.goals}`);
S = P.newShootout([[1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6]], 1);
for (let k = 0; k < 10; k++) P.record(S, P.nextKick(S).side, true);
check('5-5: no decidida, sigue la muerte súbita y lanza primero el mismo equipo', S.winner === null && P.nextKick(S).side === 1 && P.nextKick(S).sudden);
P.record(S, 1, false); check('muerte súbita: falla el primero, aún no decidida', S.winner === null);
P.record(S, 0, true); check('marca el segundo: gana', S.winner === 0);
S = P.newShootout([[1, 2], [1, 2]], 0); P.record(S, 0, true); P.record(S, 1, true); P.record(S, 0, true);
check('vuelta nueva: repite lanzador cuando han tirado todos', P.nextKick(S).who === 2 && P.nextKick({ ...S, kicks: 4, n: [2, 2] }).who === 1);
const L2 = P.takerLists([[{ i: 0, q: 30 }, { i: 1, q: 80 }, { i: 2, q: 70 }, { i: 3, q: 60 }], [{ i: 0, q: 30 }, { i: 1, q: 80 }, { i: 2, q: 70 }]]);
check('un equipo con un expulsado: el otro retira al peor lanzador y el portero tira el último', JSON.stringify(L2) === '[[1,2,0],[1,2,0]]', JSON.stringify(L2));
S = P.newShootout([[1, 2, 3, 4, 5], [1, 2, 3, 4, 5]], 0); [1, 1, 1, 1, 1, 1, 1, 0].forEach((gl, k) => P.record(S, k % 2, !!gl));
const st = P.stakes(S, 0); check('4-3 y tira el primero en la 5ª: si marca, gana', st.scoreWins && !st.missLoses, JSON.stringify(st));
const st2 = P.stakes(P.record(P.newShootout([[1], [1]], 0), 0, false), 1); check('si el rival falló el primero y marcas, no ganas aún', !st2.scoreWins);
check('presión: si fallar es perder, sube mucho', P.pressure({ missLoses: true, sudden: true }) - P.pressure({}) > 0.35 && P.pressure({ scoreWins: true }) < P.pressure({}));

// tandas completas entre bots: duración y equilibrio
let tot = 0, kicks = 0, firstWins = 0; const rng = P.mulberry(5);
const T = [{ sh: Array(11).fill(0).map(() => A(0.5)), kp: KA(0.5) }, { sh: Array(11).fill(0).map(() => A(0.5)), kp: KA(0.5) }];
for (let k = 0; k < 4000; k++) { const S2 = P.simShootout(T, [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 0], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 0]], 0, rng); kicks += S2.kicks; tot++; if (S2.winner === 0) firstWins++; }
console.log('      lanzamientos por tanda:', (kicks / tot).toFixed(1), '· gana el que tira primero:', pct(firstWins, tot), '%');
check('una tanda dura 8–12 lanzamientos de media', kicks / tot > 8 && kicks / tot < 12);
check('explicación de un tiro alto con mucha potencia', /Demasiada potencia/.test(P.explain({ frame: { k: 'fuera', high: true }, y: 2.9, x: 1, p: 0.9, s: 0 }, null, true)));
console.log(ok ? '\nTODO OK' : '\nHAY FALLOS'); process.exit(ok ? 0 : 1);
