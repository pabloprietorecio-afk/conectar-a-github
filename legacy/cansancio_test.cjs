// v13.2 · cansancio durante el partido: partidos entre bots (sin cambios) y energía de los jugadores de campo.
// Uso: node pruebas/cansancio_test.cjs [partidos]
const M = require('../sim/load.js')();
const E = M.engine, Pl = M.players, Bt = M.bots, C = E.CFG;
const N = +process.argv[2] || 60, REST = C.halfRest;
let ok = true; const check = (n, c, x = '') => { ok = ok && !!c; console.log((c ? 'OK   ' : 'FALLA') + ' ' + n + (x ? ' · ' + x : '')); };
const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
function run(minutes) {
  C.minutes = minutes; C.halfRest = 0; // el descanso se suma aquí para ver la energía de antes y de después
  const o = { pre: [], preMin: [], post: [], end: [], b35: 0, b15: 0, goals: 0 };
  for (let k = 0; k < N; k++) {
    const r = E.mulberry32(900 + k);
    const a = Pl.buildSide(r, {}), b = Pl.buildSide(r, { avoid: a.players.map((p) => p.name) });
    const G = E.createGame({ teamA: a.players, teamB: b.players, deckA: a.deck, deckB: b.deck, seed: 900 + k, kickoff: k % 2 });
    const field = (sd) => G.en[sd].filter((e, i) => i && !(G.off && G.off[sd][i]));
    while (!G.over) {
      Bt.botDraw(G, 0); Bt.botDraw(G, 1);
      const f = G.init, p1 = Bt.greedyBot.plan(G, f, null), p2 = Bt.greedyBot.plan(G, 1 - f, { ...p1, card: null, special: null });
      const plans = []; plans[f] = p1; plans[1 - f] = p2;
      const wasHalf = G.half, R = E.resolveMano(G, plans);
      if (R.goal) o.goals++;
      if (!wasHalf && G.half) for (const sd of [0, 1]) { o.pre.push(avg(field(sd))); o.preMin.push(Math.min(...field(sd))); G.en[sd] = G.en[sd].map((e) => Math.min(100, e + REST)); o.post.push(avg(field(sd))); }
      Bt.botTrim(G, 0); Bt.botTrim(G, 1);
    }
    for (const sd of [0, 1]) { const fl = field(sd); o.end.push(avg(fl)); o.b35 += fl.filter((e) => e < 35).length; o.b15 += fl.filter((e) => e < 15).length; }
  }
  C.minutes = 90; C.halfRest = REST;
  return { pre: avg(o.pre), preMin: avg(o.preMin), post: avg(o.post), end: avg(o.end), b35: o.b35 / 2 / N, b15: o.b15 / 2 / N, goals: o.goals / N };
}
const r90 = run(90), r40 = run(40), f = (x) => x.toFixed(1);
console.log(`      90': descanso ${f(r90.pre)} % (el más cansado ${f(r90.preMin)}) → ${f(r90.post)} % · final ${f(r90.end)} % · por equipo < 35 %: ${f(r90.b35)}, < 15 %: ${r90.b15.toFixed(2)} · goles ${r90.goals.toFixed(2)}`);
console.log(`      40': descanso ${f(r40.pre)} % → ${f(r40.post)} % · final ${f(r40.end)} % · < 35 %: ${f(r40.b35)}`);
check('al descanso se nota el cansancio (media de campo 65–82 %)', r90.pre >= 65 && r90.pre <= 82);
check('tras el descanso no vuelven todos al 100 % (media 80–93 %)', r90.post >= 80 && r90.post <= 93);
check('al final la media de campo está entre 50 y 68 %', r90.end >= 50 && r90.end <= 68);
check('1–3 jugadores por equipo acaban por debajo del 35 % (para que los cambios importen)', r90.b35 >= 0.7 && r90.b35 <= 3);
check('pocos agotados (< 15 %): menos de 0,6 por equipo', r90.b15 < 0.6);
check('en partidos de 40\' también se cansan (media final 50–68 %)', r40.end >= 50 && r40.end <= 68);
console.log(ok ? 'TODO OK' : 'HAY FALLOS'); if (!ok) process.exitCode = 1;
