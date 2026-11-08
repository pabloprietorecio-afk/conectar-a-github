// v12 · pruebas en Node de las recompensas y los sobres (sin interfaz): node pruebas/v12_test.cjs
const M = require('../sim/load.js')();
const meta = M.meta;
let ok = true; const check = (n, c, x = '') => { ok = ok && !!c; console.log((c ? 'OK   ' : 'FALLA') + ' ' + n + (x ? ' · ' + x : '')); };
const R0 = { gf: 1, ga: 0, won: true, drawn: false, lost: false, pens: false, pensWon: false, quick: false, maxByPlayer: 1, farGoal: false, trailed: false, saves: 2, dribbles: 3, steals: 6, lateGoal: false, races: 1, passes: 10, supers: 0, players: {}, league: true, home: true, away: false, shots: 5 };
const res = (o = {}) => ({ ...R0, ...o });
const realRandom = Math.random;
const RealDate = Date; let NOW = RealDate.now(); // reloj falso: el juego usa new Date() y Date.now()
global.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(NOW); } static now() { return NOW; } };
const day = (s) => { NOW = RealDate.parse(s + 'T10:00:00'); };

// ---------- perfil nuevo ----------
day('2026-11-02'); // lunes
let p = meta.reset();
check('perfil nuevo: 40 puntos de mazo', meta.deckPoints(meta.deckFrom(p)) === 40);
check('una Común nueva no mejora el mazo (ya hay 32 cartas Comunes o mejores)', !Object.keys(M.players.COMPOSITION).some((t) => meta.improves(p, t, 'C')));

// ---------- protección de repetidas ----------
{
  const before = meta.deckPoints(meta.deckFrom(p));
  const x = meta.grantOne(p, { kind: 'card', type: 'pase', rarity: 'C' });
  check('Común repetida → fichas', x.fichas === 5 && p.fichas === 5 && meta.deckPoints(meta.deckFrom(p)) === before);
  let redir = 0, gain = 0;
  for (let k = 0; k < 40; k++) { const b = meta.deckPoints(meta.deckFrom(p)); const y = meta.grantOne(p, { kind: 'card', type: 'pase', rarity: 'U' }); if (y.redir) redir++; gain += meta.deckPoints(meta.deckFrom(p)) - b; if (y.fichas) break; }
  check('Infrecuentes del mismo tipo: se reparten donde mejoran el mazo', redir > 0 && gain > 0, `cambiadas de tipo ${redir}, +${gain} puntos`);
  const allU = !Object.keys(M.players.COMPOSITION).some((t) => meta.improves(p, t, 'U'));
  check('con todo el mazo en Infrecuente, la siguiente Infrecuente da fichas', allU && meta.grantOne(p, { kind: 'card', type: 'corte', rarity: 'U' }).fichas === 15);
  check('mazo entero de Infrecuentes = 64 puntos', meta.deckPoints(meta.deckFrom(p)) === 64);
  p.supers = { misil: 1 };
  const s1 = meta.grantOne(p, { kind: 'super', key: 'misil' });
  check('SÚPER repetida → otra SÚPER que no tienes', s1.redir && s1.key !== 'misil' && p.supers[s1.key] === 1);
  p.supers = { misil: 1, paradon: 1, turbo: 1, elastica: 1 }; const f0 = p.fichas;
  check('con todas las SÚPER, la repetida da 400 fichas', meta.grantOne(p, { kind: 'super', key: 'misil' }).fichas === 400 && p.fichas === f0 + 400);
  meta.save();
}

// ---------- taller ----------
{
  p = meta.load(); p.fichas = 1000; meta.save();
  const pts0 = meta.deckPoints(meta.deckFrom(meta.load()));
  const c = meta.craft('R');
  check('Taller: 160 fichas por una Rara que mejora el mazo', c && c.rarity === 'R' && meta.load().fichas === 840 && meta.deckPoints(meta.deckFrom(meta.load())) === pts0 + 1);
  check('Taller: sin fichas suficientes no se puede', !meta.canCraft('L') && meta.craft('L') === null);
}

// ---------- garantías de los sobres ----------
{
  p = meta.reset(); p.money = 1e12; meta.save();
  Math.random = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  let sinceE = 0, sinceL = 0, maxE = 0, maxL = 0, packs = 0;
  for (let k = 0; k < 300; k++) {
    const out = meta.openPack('cartas'); packs++;
    const L = out.some((x) => x.kind === 'super' || (x.kind === 'card' && x.rarity === 'L') || x.fichas >= 400), E = L || out.some((x) => x.kind === 'card' && x.rarity === 'E') || out.some((x) => x.fichas === 120);
    sinceE = E ? 0 : sinceE + 1; sinceL = L ? 0 : sinceL + 1; maxE = Math.max(maxE, sinceE); maxL = Math.max(maxL, sinceL);
  }
  Math.random = realRandom;
  check('300 sobres de cartas: nunca 10 seguidos sin Épica', maxE < 10, 'racha máxima sin Épica ' + maxE);
  check('300 sobres de cartas: nunca 30 seguidos sin Legendaria o SÚPER', maxL < 30, 'racha máxima sin Legendaria ' + maxL);
  const pl = meta.pityLeft(); check('contador de garantía visible', pl.e >= 1 && pl.e <= 10 && pl.l >= 1 && pl.l <= 30, JSON.stringify(pl));
}

// ---------- calendario, primera victoria, rachas, regreso, misiones semanales y pase ----------
{
  p = meta.reset(); meta.save(); day('2026-11-02');
  const r1 = meta.settleMatch(res());
  check('día 1 del calendario: dinero', r1.cal && r1.cal.day === 1 && r1.parts.some((x) => /Calendario: día 1/.test(x[0])));
  check('primera victoria del día: una carta', r1.gifts.length >= 1 && r1.bonus.some((b) => /Primera victoria/.test(b[1])));
  check('regalo de debut en la Liga: Sobre de oro', r1.bonus.some((b) => /primer partido de Liga/.test(b[1])) && meta.load().freePremium >= 1);
  const r2 = meta.settleMatch(res());
  check('la segunda victoria del día ya no da carta ni calendario', !r2.cal && !r2.bonus.some((b) => /Primera victoria/.test(b[1])));
  const r3 = meta.settleMatch(res());
  check('racha de 3 victorias: sobre de cartas', r3.bonus.some((b) => /Racha de 3/.test(b[1])));
  meta.settleMatch(res()); const r5 = meta.settleMatch(res());
  check('racha de 5 victorias: Sobre de oro', r5.bonus.some((b) => /Racha de 5/.test(b[1])));
  for (let k = 0; k < 2; k++) meta.settleMatch(res({ won: false, lost: true, gf: 0, ga: 1 }));
  const r8 = meta.settleMatch(res({ won: false, drawn: true, gf: 0, ga: 0 }));
  check('desde el 7º partido del día, la taquilla es la mitad', r8.half && /mitad/.test(r8.parts[0][0]));
  // calendario: faltar no lo reinicia
  day('2026-11-03'); const c2 = meta.settleMatch(res()); day('2026-11-05'); const c3 = meta.settleMatch(res()); day('2026-11-06'); const c4 = meta.settleMatch(res());
  check('calendario: días 2, 3 y 4 aunque faltes un día', c2.cal.day === 2 && c3.cal.day === 3 && c4.cal.day === 4 && c4.bonus.some((b) => /día 4 de 7/.test(b[1])));
  // regreso tras 4 días
  day('2026-11-11'); const rb = meta.settleMatch(res());
  check('regreso tras 5 días: Sobre de oro y experiencia doble', rb.bonus.some((b) => /Bienvenido de vuelta/.test(b[1])) && rb.boost);
  const rb2 = meta.settleMatch(res()), rb3 = meta.settleMatch(res()), rb4 = meta.settleMatch(res());
  check('la experiencia doble dura 3 partidos', rb2.boost && rb3.boost && !rb4.boost);
  // semanales
  day('2026-11-16'); const w = meta.weekly();
  check('5 misiones semanales distintas', w.list.length === 5 && new Set(w.list.map((m) => m.k)).size === 5, w.list.map((m) => m.k).join(','));
  let wsum = 0, all = false;
  for (let k = 0; k < 40 && !all; k++) { const x = meta.settleMatch(res({ gf: 3, ga: 0, dribbles: 6, steals: 12, saves: 4, passes: 22, shots: 10, trailed: k % 3 === 0, away: k % 2 === 1, home: k % 2 === 0 })); wsum += x.weekly.length; all = x.wAll; if (k % 6 === 5) day('2026-11-' + (17 + Math.floor(k / 6))); }
  check('las cinco semanales se completan y dan Sobre de oro', all && wsum === 5);
  day('2026-11-23'); check('la semana siguiente hay misiones nuevas', meta.weekly().week === '2026-11-23' && meta.weekly().list.every((m) => !m.done));
  // pase
  const ps = meta.passState(meta.load());
  check('el pase sube con los partidos', ps.lv >= 5, 'nivel ' + ps.lv);
  check('premios del pase', meta.passReward(40).player === 'leyenda' && meta.passReward(20).pack === 'premium' && meta.passReward(8).pack === 'cartas' && meta.passReward(15).super && meta.passReward(3).money);
  day('2026-12-30'); check('pase nuevo cada 4 semanas', meta.passState(meta.load()).lv === 0);
}
console.log(ok ? 'TODO BIEN' : 'HAY FALLOS'); process.exit(ok ? 0 : 1);
