__M.league = (() => {
// v9 · LIGA: temporada de liga con los 20 clubes, calendario, clasificación con los desempates de LaLiga, resultados
// simulados del resto de partidos, objetivos, premios y guardado. Lógica pura (sin interfaz): se puede probar en Node.
// Diseño completo: docs/LIGA.md. Los partidos son la única fuente de verdad; la tabla se recalcula siempre desde ellos.
const KEY = 'fc_league_v1', VERSION = 1;

// ---------- generador aleatorio con estado y utilidades ----------
function rngFrom(state) {
  let a = state >>> 0;
  const f = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.state = () => a; return f;
}
const hash = (seed, str) => { let h = (seed >>> 0) ^ 0x9e3779b9; for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 0x01000193) >>> 0; } return h >>> 0; };
const shuffleR = (arr, r) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- fuerza de los clubes (valores de diseño, editables; no son datos reales) ----------
const TIER_OF = { rma: 1, fcb: 1, atm: 2, ath: 2, vil: 2, bet: 2, rso: 2, sev: 3, val: 3, cel: 3, osa: 3, get: 3, ray: 3, esp: 4, ala: 4, lev: 4, elc: 4, rac: 4, dep: 4, mal: 4 };
const TIERS = {
  1: { name: 'Aspirante al título', att: 88, def: 86, obj: { pos: 1, label: 'Ganar la Liga' }, shift: -1 },
  2: { name: 'Europa', att: 81, def: 80, obj: { pos: 6, label: 'Puestos europeos (top 6)' }, shift: 0 },
  3: { name: 'Zona media', att: 75, def: 75, obj: { pos: 10, label: 'Mitad alta (top 10)' }, shift: 0 },
  4: { name: 'Permanencia', att: 70, def: 70, obj: { pos: 17, label: 'Salvación (17º o mejor)' }, shift: 1 },
};
const tierOfClub = (id) => TIER_OF[id] || 3;
// estadios (nombres tradicionales, sin patrocinador)
const STADIUM = { ath: 'San Mamés', atm: 'Metropolitano', fcb: 'Camp Nou', rma: 'Santiago Bernabéu', vil: 'La Cerámica', bet: 'Benito Villamarín', cel: 'Balaídos', rso: 'Anoeta', get: 'Coliseum Alfonso Pérez', val: 'Mestalla', sev: 'Ramón Sánchez-Pizjuán', ray: 'Vallecas', osa: 'El Sadar', esp: 'Cornellà-El Prat', ala: 'Mendizorroza', lev: 'Ciutat de València', elc: 'Martínez Valero', rac: 'El Sardinero', dep: 'Riazor', mal: 'La Rosaleda' };
// derbis y rivalidades (doble recompensa y grada más caliente)
const DERBIES = [['rma', 'atm'], ['rma', 'fcb'], ['fcb', 'esp'], ['bet', 'sev'], ['ath', 'rso'], ['val', 'lev'], ['rma', 'ray'], ['atm', 'get'], ['cel', 'dep'], ['ath', 'osa']];
const isDerby = (a, b) => DERBIES.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

// ---------- calendario: método del polígono (tablas de Berger) ----------
function makeSchedule(teams, legs, seed) {
  const r = rngFrom(seed);
  const t = shuffleR(teams, r);
  if (t.length % 2) t.push('BYE');
  const n = t.length, m = n - 1, rounds = [];
  for (let k = 0; k < m; k++) {
    const pairs = [];
    for (let i = 0; i < n / 2; i++) {
      let h = (k + i) % m, a = i === 0 ? m : (m - i + k) % m;
      if (i === 0 ? k % 2 === 1 : i % 2 === 1) [h, a] = [a, h]; // alterna los campos: nadie encadena más de 2 en casa o fuera
      pairs.push([t[h], t[a]]);
    }
    rounds.push(pairs.filter(([x, y]) => x !== 'BYE' && y !== 'BYE'));
  }
  if (legs === 2) rounds.push(...rounds.map((rd) => rd.map(([h, a]) => [a, h])));
  return rounds;
}

// ---------- clasificación (3-1-0 y desempates de LaLiga) ----------
function table(teams, matches, legs = 2) {
  const s = Object.fromEntries(teams.map((id) => [id, { id, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0, form: [] }]));
  const played = matches.filter((m) => m.score).sort((a, b) => a.round - b.round);
  for (const m of played) {
    const [g1, g2] = m.score, H = s[m.home], A = s[m.away];
    if (!H || !A) continue;
    H.pj++; A.pj++; H.gf += g1; H.gc += g2; A.gf += g2; A.gc += g1;
    if (g1 > g2) { H.pg++; A.pp++; H.pts += 3; H.form.push('V'); A.form.push('D'); }
    else if (g1 < g2) { A.pg++; H.pp++; A.pts += 3; A.form.push('V'); H.form.push('D'); }
    else { H.pe++; A.pe++; H.pts++; A.pts++; H.form.push('E'); A.form.push('E'); }
  }
  const rows = Object.values(s); rows.forEach((x) => { x.dg = x.gf - x.gc; x.form = x.form.slice(-5); });
  const h2h = (ids) => {
    const set = new Set(ids), o = Object.fromEntries(ids.map((id) => [id, { pts: 0, dg: 0 }]));
    for (const m of played) if (set.has(m.home) && set.has(m.away)) {
      const [g1, g2] = m.score; o[m.home].dg += g1 - g2; o[m.away].dg += g2 - g1;
      if (g1 > g2) o[m.home].pts += 3; else if (g1 < g2) o[m.away].pts += 3; else { o[m.home].pts++; o[m.away].pts++; }
    }
    return o;
  };
  // el enfrentamiento directo solo cuenta cuando se han jugado TODOS los partidos entre los empatados
  const breakTie = (g) => {
    if (g.length === 1) return g;
    const ids = new Set(g.map((x) => x.id)), need = legs * g.length * (g.length - 1) / 2;
    const allDone = played.filter((m) => ids.has(m.home) && ids.has(m.away)).length === need;
    const o = h2h([...ids]);
    const key = (x) => [allDone && g.length > 2 ? o[x.id].pts : 0, allDone ? o[x.id].dg : 0, x.dg, x.gf];
    return g.slice().sort((a, b) => { const A = key(a), B = key(b); for (let i = 0; i < A.length; i++) if (A[i] !== B[i]) return B[i] - A[i]; return a.id < b.id ? -1 : 1; });
  };
  const byPts = {}; rows.forEach((x) => (byPts[x.pts] = byPts[x.pts] || []).push(x));
  const out = [];
  for (const p of Object.keys(byPts).map(Number).sort((a, b) => b - a)) out.push(...breakTie(byPts[p]));
  return out.map((x, i) => ({ pos: i + 1, ...x }));
}

// ---------- resultado simulado: goles de Poisson según fuerza y campo ----------
const MU = { home: 1.52, away: 1.38 }, KPT = 0.03; // ≈ 2,9 goles por partido, como el motor
function poisson(lambda, r) { const L = Math.exp(-lambda); let k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1; }
function simScore(H, A, r) {
  const lh = MU.home * Math.exp(KPT * (H.att - A.def)), la = MU.away * Math.exp(KPT * (A.att - H.def));
  return [Math.min(9, poisson(lh, r)), Math.min(9, poisson(la, r))];
}

// ---------- temporada ----------
function newSeason({ clubIds, userClubId, legs = 1, minutes = 90, division = 5, seed, index = 0, year = 2026 }) {
  seed = (seed == null ? Math.floor(Math.random() * 4294967295) : seed) >>> 0;
  const r = rngFrom(hash(seed, 'teams'));
  const teams = clubIds.map((id) => {
    const tier = tierOfClub(id), T = TIERS[tier], j = () => Math.round((r() - 0.5) * 4); // ±2 por temporada
    return { id, tier, att: T.att + j(), def: T.def + j(), rivalSeed: Math.floor(r() * 4294967295) >>> 0, isUser: id === userClubId };
  });
  const sched = makeSchedule(clubIds, legs, hash(seed, 'calendar'));
  const matches = {}, rounds = [];
  sched.forEach((rd, i) => {
    const ids = rd.map(([home, away], j) => { const id = `L-R${i + 1}-M${j + 1}`; matches[id] = { id, round: i + 1, home, away, score: null, sim: false }; return id; });
    rounds.push({ n: i + 1, matchIds: ids, done: false });
  });
  const tier = tierOfClub(userClubId);
  return {
    id: 's' + seed.toString(36), index, label: `${year + index}/${String((year + index + 1) % 100).padStart(2, '0')}`, seed,
    userClubId, division, format: { legs, minutes }, objective: { ...TIERS[tier].obj, tier },
    status: 'active', cursor: 0, calendar: rounds.map((rd) => ({ comp: 'L', round: rd.n })),
    teams, rounds, matches, posHistory: {}, userStats: { pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, cs: 0, streak: 0, best: 0, unbeaten: 0, scorers: {}, home: [0, 0, 0], away: [0, 0, 0] },
    createdAt: Date.now(), updatedAt: Date.now(), rulesVersion: VERSION,
  };
}
const teamOf = (S, id) => S.teams.find((t) => t.id === id);
const nRounds = (S) => S.rounds.length;
const roundOf = (S, n) => S.rounds[n - 1];
const currentRound = (S) => (S.cursor < S.calendar.length ? roundOf(S, S.calendar[S.cursor].round) : null);
const allMatches = (S) => Object.values(S.matches);
const standings = (S) => table(S.teams.map((t) => t.id), allMatches(S), S.format.legs);
function userMatch(S, n) {
  const rd = n ? roundOf(S, n) : currentRound(S); if (!rd) return null;
  const m = rd.matchIds.map((id) => S.matches[id]).find((x) => x.home === S.userClubId || x.away === S.userClubId);
  return m ? { ...m, isHome: m.home === S.userClubId, opp: m.home === S.userClubId ? m.away : m.home } : null;
}
// el rival en tu partido: la dificultad sale de la división de la temporada desplazada por el nivel del club
const rivalDiv = (S, oppId) => clampN(S.division + TIERS[tierOfClub(oppId)].shift, 1, 5);

// registra tu resultado, simula el resto de la jornada y avanza. Devuelve lo necesario para la pantalla de jornada.
function playRound(S, gf, ga, extra = {}) {
  const rd = currentRound(S); if (!rd || rd.done) return null;
  const before = standings(S).map((x) => x.id);
  const um = userMatch(S);
  const m = S.matches[um.id];
  m.score = um.isHome ? [gf, ga] : [ga, gf]; m.sim = false; if (extra.forfeit) m.forfeit = true;
  const results = [];
  for (const id of rd.matchIds) {
    const x = S.matches[id];
    if (!x.score) { const r = rngFrom(hash(S.seed, id)); x.score = simScore(teamOf(S, x.home), teamOf(S, x.away), r); x.sim = true; }
    results.push(x);
  }
  rd.done = true; rd.doneAt = Date.now();
  const tab = standings(S);
  tab.forEach((x) => { (S.posHistory[x.id] = S.posHistory[x.id] || [])[rd.n - 1] = x.pos; });
  // estadísticas de tu temporada
  const u = S.userStats, res = gf > ga ? 0 : gf === ga ? 1 : 2;
  u.pj++; u.gf += gf; u.gc += ga; if (res === 0) u.pg++; else if (res === 1) u.pe++; else u.pp++;
  if (ga === 0) u.cs++;
  u.streak = res === 0 ? u.streak + 1 : 0; u.best = Math.max(u.best, u.streak);
  u.unbeaten = res < 2 ? u.unbeaten + 1 : 0;
  (um.isHome ? u.home : u.away)[res]++;
  for (const [pid, g] of Object.entries(extra.scorers || {})) u.scorers[pid] = (u.scorers[pid] || 0) + g;
  S.cursor++; S.updatedAt = Date.now();
  if (S.cursor >= S.calendar.length) S.status = 'finished';
  const moved = Object.fromEntries(tab.map((x) => [x.id, before.indexOf(x.id) + 1 - x.pos]));
  return { round: rd.n, results, table: tab, moved, finished: S.status === 'finished' };
}

// situación del usuario: puesto, distancia al líder y al objetivo, campeón matemático
function situation(S) {
  const tab = standings(S), me = tab.find((x) => x.id === S.userClubId), lead = tab[0];
  const left = nRounds(S) - S.cursor, maxGain = left * 3;
  const objRow = tab[S.objective.pos - 1];
  const objOk = me.pos <= S.objective.pos;
  // distancia al puesto objetivo: si estás dentro, ventaja sobre el primero de fuera; si no, puntos que te faltan
  const outRow = tab[S.objective.pos];
  const objGap = objOk ? (outRow ? me.pts - outRow.pts : null) : objRow.pts - me.pts;
  const champ = lead.pts > tab[1].pts + maxGain ? lead.id : null; // campeón matemático (sin contar desempates)
  return { tab, me, lead, leaderGap: lead.id === me.id ? me.pts - tab[1].pts : lead.pts - me.pts, isLeader: lead.id === me.id, left, objOk, objGap, champ };
}
// v12 · categorías con nombre (la División 5 es Bronce y la 1, Leyenda). En Leyenda, cada «ascenso» es una estrella.
const CAT = { 5: 'Bronce', 4: 'Plata', 3: 'Oro', 2: 'Diamante', 1: 'Leyenda' };
const catName = (div, stars = 0) => (CAT[div] || 'División ' + div) + (div === 1 && stars > 0 ? ' ★' + stars : '');
// v12 · ascenso por plazas europeas: del 1º al 4º suben directos y el 5º y el 6º juegan la eliminatoria de ascenso
// (antes subían 2 y el 3º jugaba la promoción: en 2.500 temporadas simuladas, con 1,6 puntos por partido se subía el
// 9,5 % de las veces; ahora, el 37 %). Bajan el 19º y el 20º y el 18º juega la eliminatoria de permanencia.
// En Leyenda (División 1) no se sube: los mismos puestos dan una estrella y el rival crece con ellas.
const UP_DIRECT = 4, UP_PLAYOFF = [5, 6];
const upZone = (pos) => pos <= UP_DIRECT;
const upPlayoff = (pos) => UP_PLAYOFF.includes(pos);
// premios y cambio de división al terminar la temporada
function seasonEnd(S, divMult = 1) {
  const tab = standings(S), me = tab.find((x) => x.id === S.userClubId);
  const met = me.pos <= S.objective.pos;
  const r10 = (v) => Math.round(v / 10000) * 10000;
  const parts = [['Premio por puesto (' + me.pos + 'º)', r10((21 - me.pos) * 150000 * divMult)]];
  if (met) parts.push(['Objetivo cumplido: ' + S.objective.label, r10(1000000 * divMult)]);
  if (me.pos === 1) parts.push(['¡Campeón de Liga!', r10(2000000 * divMult)]);
  const n = tab.length, po = S.playoff && S.playoff.done ? S.playoff : null;
  const upOk = upZone(me.pos) || (upPlayoff(me.pos) && po && po.type === 'up' && po.won);
  let divChange = 0, star = false;
  if (upOk) { if (S.division > 1) divChange = -1; else star = true; }
  if (S.division < 5 && (me.pos >= n - 1 || (me.pos === n - 2 && po && po.type === 'down' && !po.won))) divChange = 1;
  if (po && po.won) parts.push([po.type === 'up' ? (S.division > 1 ? '¡Ganas la eliminatoria de ascenso!' : '¡Ganas la eliminatoria por la estrella!') : 'Salvas la categoría en la eliminatoria', r10(500000 * divMult)]);
  if (divChange < 0) parts.push([`¡Ascenso a ${catName(S.division - 1)}!`, r10(1000000 * divMult)]);
  if (star) parts.push(['★ Nueva estrella de Leyenda', r10(1500000 * divMult)]);
  return { pos: me.pos, pts: me.pts, met, champion: tab[0].id, parts, money: parts.reduce((t, x) => t + x[1], 0), divChange, star, playoff: po, table: tab.map((x) => ({ id: x.id, pts: x.pts, dg: x.dg })) };
}
// ¿te toca eliminatoria? (5º o 6º: de ascenso, o por la estrella en Leyenda; 18º con división por debajo: de
// permanencia) y aún no se ha jugado
function playoffNeeded(S) {
  if (S.status !== 'finished' || (S.playoff && S.playoff.done)) return null;
  const tab = standings(S), me = tab.find((x) => x.id === S.userClubId), n = tab.length;
  if (upPlayoff(me.pos)) return S.division > 1
    ? { type: 'up', div: S.division - 1, label: `Eliminatoria de ascenso contra un club de ${catName(S.division - 1)}` }
    : { type: 'up', div: 1, star: true, label: 'Eliminatoria por la estrella contra un club de Leyenda' };
  if (me.pos === n - 2 && S.division < 5) return { type: 'down', div: S.division + 1, label: `Eliminatoria de permanencia contra un club de ${catName(S.division + 1)}` };
  return null;
}
// v12 · historial de la carrera (de career.seasons, la fuente de verdad): temporadas terminadas, temporadas seguidas
// sin subir en la división actual (colchón: el rival empieza 2 puntos más bajo por cada una, máximo 2) y estrellas
// de Leyenda de la racha actual y la mejor
function careerInfo(div) {
  const R = load(), fin = R.career.seasons.filter((x) => x.status === 'finished');
  const chg = (x) => (x.divChange != null ? x.divChange : x.pos <= 2 && x.division > 1 ? -1 : 0); // temporadas de antes de v12
  let noPromo = 0;
  for (let i = fin.length - 1; i >= 0; i--) { const x = fin[i]; if (x.division !== div || chg(x) !== 0 || x.star) break; noPromo++; }
  let stars = 0, best = 0, run = 0;
  for (const x of fin) { if (x.division === 1) { if (x.star) run++; if (chg(x) > 0) run = 0; } else run = 0; best = Math.max(best, run); }
  for (let i = fin.length - 1; i >= 0 && fin[i].division === 1; i--) { if (chg(fin[i]) > 0) break; if (fin[i].star) stars++; }
  return { done: fin.length, noPromo, stars, starsBest: best };
}
// el rival de la promoción: un club al azar (fijo para la temporada) con la dificultad de la otra división
function playoffOpp(S) { const ids = S.teams.map((t) => t.id).filter((id) => id !== S.userClubId); return ids[hash(S.seed, 'playoff') % ids.length]; }
function setPlayoff(S, type, gf, ga, won, pens) { S.playoff = { type, done: true, won, score: [gf, ga], pens: !!pens }; S.updatedAt = Date.now(); }
// v10 · los rivales crecen durante la temporada: 0 en la jornada 1 → 1 en la última
const growth = (S, round) => (nRounds(S) > 1 ? clampN((round - 1) / (nRounds(S) - 1), 0, 1) : 0);

// ---------- validación (al cargar) ----------
function validate(S) {
  if (!S || typeof S !== 'object' || !Array.isArray(S.teams) || !Array.isArray(S.rounds) || !S.matches) return 'estructura';
  const n = S.teams.length, perLeg = n * (n - 1) / 2, legs = S.format && S.format.legs;
  if (Object.keys(S.matches).length !== perLeg * legs) return 'partidos';
  if (S.cursor < 0 || S.cursor > S.calendar.length) return 'cursor';
  for (let i = 0; i < S.cursor; i++) { const rd = roundOf(S, S.calendar[i].round); if (!rd || rd.matchIds.some((id) => !S.matches[id] || !S.matches[id].score)) return 'jornada ' + (i + 1); }
  if (!teamOf(S, S.userClubId)) return 'club';
  return null;
}

// ---------- guardado: una clave, copia de seguridad, versión y espejo nativo (Capacitor Preferences) ----------
let prefsP;
const nativePrefs = () => { // en el APK: plugin @capacitor/preferences (UserDefaults / SharedPreferences); en la web, nada
  if (prefsP !== undefined) return prefsP;
  const C = typeof window !== 'undefined' && window.Capacitor;
  try { prefsP = (C && C.isNativePlatform && C.isNativePlatform() && ((C.Plugins && C.Plugins.Preferences) || (C.registerPlugin && C.registerPlugin('Preferences')))) || null; } catch (e) { prefsP = null; }
  return prefsP;
};
const blank = () => ({ v: VERSION, rev: 0, active: null, live: null, pending: null, career: { seasons: [], champions: [] } });
let ROOT = null, saveOk = true;
function migrate(o) { if (!o || typeof o !== 'object') return null; if (o.v === VERSION) return o; return null; /* futuras versiones: cadena de migraciones */ }
function parse(txt) { try { const o = migrate(JSON.parse(txt)); if (o && (!o.active || !validate(o.active))) return o; } catch (e) {} return null; }
function load() {
  if (ROOT) return ROOT;
  let txt = null, bak = null;
  try { txt = localStorage.getItem(KEY); bak = localStorage.getItem(KEY + '.bak'); } catch (e) {}
  ROOT = (txt && parse(txt)) || (bak && parse(bak)) || blank();
  ROOT.restored = !!(txt && !parse(txt) && bak && parse(bak));
  return ROOT;
}
function save() {
  const R = load(); R.rev = (R.rev || 0) + 1;
  const txt = JSON.stringify({ ...R, restored: undefined });
  try {
    const prev = localStorage.getItem(KEY); if (prev && parse(prev)) localStorage.setItem(KEY + '.bak', prev);
    localStorage.setItem(KEY, txt); saveOk = true;
  } catch (e) { saveOk = false; }
  const P = nativePrefs(); if (P) { try { P.set({ key: KEY, value: txt }); } catch (e) {} }
  return saveOk;
}
// al arrancar en el APK: si el sistema borró localStorage pero Preferences conserva la liga, se recupera
async function restoreNative() {
  const P = nativePrefs(); if (!P) return false;
  try {
    const v = (await P.get({ key: KEY })).value; if (!v) return false;
    const o = parse(v), cur = load();
    if (o && (o.rev || 0) > (cur.rev || 0)) { ROOT = o; try { localStorage.setItem(KEY, v); } catch (e) {} return true; }
  } catch (e) {}
  return false;
}
function canSave() { try { localStorage.setItem(KEY + '.t', '1'); localStorage.removeItem(KEY + '.t'); return true; } catch (e) { return false; } }
const active = () => { const R = load(); return R.active; };
function start(opts) { const R = load(); R.active = newSeason({ ...opts, index: R.career.seasons.length }); R.live = null; R.pending = null; save(); return R.active; }
function abandon() {
  const R = load(), S = R.active; if (!S) return;
  const sit = situation(S);
  R.career.seasons.push({ id: S.id, label: S.label, club: S.userClubId, division: S.division, status: 'abandoned', round: S.cursor, pos: sit.me.pos, pts: sit.me.pts });
  R.active = null; R.live = null; R.pending = null; save();
}
// cierra la temporada: archiva el resumen (sin los partidos) y devuelve los premios
function archive(divMult) {
  const R = load(), S = R.active; if (!S || S.status !== 'finished') return null;
  const e = seasonEnd(S, divMult);
  R.career.seasons.push({ id: S.id, label: S.label, club: S.userClubId, division: S.division, status: 'finished', pos: e.pos, pts: e.pts, met: e.met, champion: e.champion, objective: S.objective.label, table: e.table, stats: S.userStats, divChange: e.divChange, star: e.star });
  R.career.champions.push({ season: S.label, comp: 'Liga', club: e.champion, userWon: e.champion === S.userClubId });
  R.active = null; R.live = null; save();
  return e;
}

return { KEY, VERSION, rngFrom, hash, makeSchedule, table, simScore, poisson, newSeason, standings, userMatch, currentRound, roundOf, nRounds, teamOf, rivalDiv, playRound, situation, seasonEnd, validate, playoffNeeded, playoffOpp, setPlayoff, growth,
  CAT, catName, UP_DIRECT, UP_PLAYOFF, upZone, upPlayoff, careerInfo,
  load, save, restoreNative, canSave, active, start, abandon, archive, TIERS, TIER_OF, tierOfClub, STADIUM, isDerby, MU,
  get saveOk() { return saveOk; }, _reset() { ROOT = null; } };
})();
