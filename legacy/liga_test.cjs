// Pruebas del módulo de Liga en Node: node pruebas/liga_test.cjs
const fs = require('fs'), path = require('path');
const store = {}; global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
const __M = {}; eval(fs.readFileSync(path.join(__dirname, '..', 'fuente', 'liga.js'), 'utf8'));
const L = __M.league;
let ok = true; const check = (n, c, x = '') => { ok = ok && !!c; console.log((c ? 'OK   ' : 'FALLA') + ' ' + n + (x ? ' · ' + x : '')); };
const IDS = ['ath','atm','fcb','rma','vil','bet','cel','rso','get','val','sev','ray','osa','esp','ala','lev','elc','rac','dep','mal'];
for (const legs of [1, 2]) {
  const S = L.newSeason({ clubIds: IDS, userClubId: 'bet', legs, division: 3, seed: 1234 + legs });
  check(`temporada ${legs === 1 ? 'solo ida' : 'ida y vuelta'}: ${S.rounds.length} jornadas`, S.rounds.length === 19 * legs && Object.keys(S.matches).length === 190 * legs && !L.validate(S));
  // juega la temporada entera con resultados al azar para el usuario
  const r = L.rngFrom(99); let last;
  while (S.status === 'active') { const um = L.userMatch(S); check.q = um; last = L.playRound(S, Math.floor(r() * 4), Math.floor(r() * 3), { scorers: { p1: 1 } }); }
  const tab = L.standings(S);
  const pts = tab.reduce((t, x) => t + x.pts, 0), games = tab.reduce((t, x) => t + x.pj, 0);
  const draws = Object.values(S.matches).filter((m) => m.score[0] === m.score[1]).length;
  check('todos los partidos jugados y la tabla cuadra', games === 2 * 190 * legs && pts === 3 * (190 * legs - draws) + 2 * draws, `pts ${pts}, empates ${draws}`);
  const goals = Object.values(S.matches).filter((m) => m.sim).reduce((t, m) => t + m.score[0] + m.score[1], 0) / Object.values(S.matches).filter((m) => m.sim).length;
  check('goles por partido simulado entre 2,4 y 3,4', goals > 2.4 && goals < 3.4, goals.toFixed(2));
  check('posHistory completo', IDS.every((id) => S.posHistory[id].length === S.rounds.length));
  check('usuario: 1 partido por jornada', S.userStats.pj === S.rounds.length);
  const e = L.seasonEnd(S, 2); check('premios de fin de temporada', e.money > 0 && e.parts.length >= 1, JSON.stringify(e.parts));
  // reproducible: misma semilla, mismos resultados simulados
  const S2 = L.newSeason({ clubIds: IDS, userClubId: 'bet', legs, division: 3, seed: 1234 + legs }); const r2 = L.rngFrom(99);
  while (S2.status === 'active') L.playRound(S2, Math.floor(r2() * 4), Math.floor(r2() * 3));
  check('misma semilla → misma tabla final', JSON.stringify(L.standings(S2).map((x) => x.id + x.pts)) === JSON.stringify(tab.map((x) => x.id + x.pts)));
}
// fuerzas: en 200 temporadas simuladas, los de nivel 1 acaban arriba y los de nivel 4 abajo
const avgPos = { 1: [], 2: [], 3: [], 4: [] };
for (let k = 0; k < 200; k++) { const S = L.newSeason({ clubIds: IDS, userClubId: 'mal', legs: 2, seed: 5000 + k }); while (S.status === 'active') { const um = L.userMatch(S); const t = L.teamOf(S, um.opp); const sc = L.simScore(um.isHome ? L.teamOf(S, 'mal') : t, um.isHome ? t : L.teamOf(S, 'mal'), L.rngFrom(k * 977 + S.cursor)); L.playRound(S, um.isHome ? sc[0] : sc[1], um.isHome ? sc[1] : sc[0]); } L.standings(S).forEach((x) => avgPos[L.tierOfClub(x.id)].push(x.pos)); }
const av = (a) => +(a.reduce((t, x) => t + x, 0) / a.length).toFixed(1);
console.log('posición media por nivel (200 temporadas):', Object.entries(avgPos).map(([t, a]) => `nivel ${t}: ${av(a)}`).join(' · '));
check('el nivel ordena la tabla', av(avgPos[1]) < av(avgPos[2]) && av(avgPos[2]) < av(avgPos[3]) && av(avgPos[3]) < av(avgPos[4]));
// guardado: escribir, leer, copia de seguridad ante JSON roto
L._reset(); const R = L.load(); check('sin liga al empezar', !R.active);
L.start({ clubIds: IDS, userClubId: 'sev', legs: 1, division: 4, seed: 77 });
L.playRound(L.active(), 2, 1); L.save();
L._reset(); check('se recupera tras recargar', L.active() && L.active().cursor === 1 && L.active().userClubId === 'sev');
L.playRound(L.active(), 0, 0); L.save();
store['fc_league_v1'] = '{roto';
L._reset(); check('JSON roto → se restaura la copia anterior', L.active() && L.active().cursor === 1 && L.load().restored === true);
const sit = L.situation(L.active()); check('situación: puesto, líder, objetivo', sit.me && typeof sit.leaderGap === 'number' && sit.left === 18, JSON.stringify({ pos: sit.me.pos, gap: sit.leaderGap, obj: sit.objOk, objGap: sit.objGap }));
L.abandon(); L._reset(); check('abandonar deja la liga vacía y la apunta en el historial', !L.active() && L.load().career.seasons[0].status === 'abandoned');
// v12 · ascensos por plazas europeas: del 1º al 4º suben, el 5º y el 6º juegan la eliminatoria; bajan el 19º y el 20º
// y el 18º juega la eliminatoria de permanencia. En Leyenda, los puestos de ascenso dan una estrella.
const seen = {};
for (let k = 0; k < 600 && Object.keys(seen).length < 7; k++) {
  const S = L.newSeason({ clubIds: IDS, userClubId: 'cel', legs: 1, division: 3, seed: 9000 + k }); const r = L.rngFrom(k);
  while (S.status === 'active') L.playRound(S, Math.floor(r() * 4), Math.floor(r() * 4));
  const pos = L.standings(S).find((x) => x.id === 'cel').pos, po = L.playoffNeeded(S);
  if (pos <= 4) { seen.top = 1; const e = L.seasonEnd(S); check('1º-4º: suben sin eliminatoria y cobran el ascenso', !po && e.divChange === -1 && e.parts.some((x) => /Ascenso a Diamante/.test(x[0])), 'pos ' + pos); }
  else if (pos === 5 || pos === 6) { seen['p' + pos] = 1; check(pos + 'º: eliminatoria de ascenso', po && po.type === 'up' && po.div === 2 && L.seasonEnd(S).divChange === 0); L.setPlayoff(S, 'up', 2, 1, true); check(pos + 'º que gana la eliminatoria: sube', !L.playoffNeeded(S) && L.seasonEnd(S).divChange === -1); }
  else if (pos === 18) { seen.p18 = 1; check('18º: eliminatoria de permanencia', po && po.type === 'down' && po.div === 4); L.setPlayoff(S, 'down', 0, 1, false); check('18º que pierde la eliminatoria: baja', L.seasonEnd(S).divChange === 1); }
  else if (pos >= 19) { seen.bot = 1; check('19º-20º: bajan sin eliminatoria', !po && L.seasonEnd(S).divChange === 1, 'pos ' + pos); }
  else if (!seen.mid) { seen.mid = 1; check('zona media (7º-17º): ni sube ni baja', !po && L.seasonEnd(S).divChange === 0, 'pos ' + pos); }
}
check('se han visto todos los casos de ascenso y descenso', seen.top && seen.p5 && seen.p6 && seen.p18 && seen.bot && seen.mid, JSON.stringify(seen));
// Leyenda: los puestos de ascenso dan estrella; el 5º-6º la juega en una eliminatoria; Bronce no baja
{
  let got = {};
  for (let k = 0; k < 600 && Object.keys(got).length < 3; k++) {
    const S = L.newSeason({ clubIds: IDS, userClubId: 'cel', legs: 1, division: 1, seed: 7000 + k }); const r = L.rngFrom(k + 3);
    while (S.status === 'active') L.playRound(S, Math.floor(r() * 4), Math.floor(r() * 4));
    const pos = L.standings(S).find((x) => x.id === 'cel').pos, po = L.playoffNeeded(S), e = L.seasonEnd(S);
    if (pos <= 4 && !got.a) { got.a = 1; check('Leyenda 1º-4º: estrella, sin cambio de división', e.star && e.divChange === 0 && !po); }
    if ((pos === 5 || pos === 6) && !got.b) { got.b = 1; check('Leyenda 5º-6º: eliminatoria por la estrella', po && po.star && po.type === 'up'); L.setPlayoff(S, 'up', 1, 0, true); check('…y si la gana, estrella', L.seasonEnd(S).star === true && L.seasonEnd(S).divChange === 0); }
    if (pos >= 19 && !got.c) { got.c = 1; check('Leyenda 19º-20º: baja a Diamante', e.divChange === 1 && !e.star); }
  }
  const S = L.newSeason({ clubIds: IDS, userClubId: 'cel', legs: 1, division: 5, seed: 3 }); const r = L.rngFrom(1);
  while (S.status === 'active') L.playRound(S, 0, 3 + Math.floor(r() * 2));
  check('Bronce: el último no baja ni juega eliminatoria', L.standings(S).find((x) => x.id === 'cel').pos === 20 && !L.playoffNeeded(S) && L.seasonEnd(S).divChange === 0);
  check('nombres de categoría', L.catName(5) === 'Bronce' && L.catName(1, 3) === 'Leyenda ★3' && L.catName(2) === 'Diamante');
}
// historial de carrera: temporadas sin subir (colchón) y estrellas
{
  L._reset(); for (const k of Object.keys(store)) delete store[k];
  const R = L.load(); const fin = (division, divChange, star = false) => R.career.seasons.push({ status: 'finished', division, pos: 10, divChange, star });
  check('carrera vacía', JSON.stringify(L.careerInfo(5)) === JSON.stringify({ done: 0, noPromo: 0, stars: 0, starsBest: 0 }));
  fin(5, 0); fin(5, 0); fin(5, 0); check('3 temporadas en Bronce sin subir', L.careerInfo(5).noPromo === 3 && L.careerInfo(5).done === 3);
  fin(5, -1); check('al subir, el colchón vuelve a 0', L.careerInfo(4).noPromo === 0);
  fin(4, -1); fin(3, -1); fin(2, -1); fin(1, 0, true); fin(1, 0, true); fin(1, 0, false);
  check('2 estrellas en Leyenda', L.careerInfo(1).stars === 2 && L.careerInfo(1).starsBest === 2 && L.careerInfo(1).noPromo === 1);
  fin(1, 1); fin(2, -1); fin(1, 0, true);
  check('al bajar se pierden las estrellas; el récord se queda', L.careerInfo(1).stars === 1 && L.careerInfo(1).starsBest === 2);
  R.career.seasons.push({ status: 'finished', division: 3, pos: 2 }); // temporada de antes de v12 (sin divChange): subía el 2º
  check('temporadas antiguas: 1º-2º cuentan como ascenso', L.careerInfo(3).noPromo === 0);
  L._reset(); for (const k of Object.keys(store)) delete store[k];
}
const S5 = L.newSeason({ clubIds: IDS, userClubId: 'cel', legs: 1, division: 5, seed: 1 }); check('crecimiento: 0 en la jornada 1, 1 en la última', L.growth(S5, 1) === 0 && L.growth(S5, 19) === 1);
console.log(ok ? 'TODO BIEN' : 'HAY FALLOS'); process.exit(ok ? 0 : 1);
