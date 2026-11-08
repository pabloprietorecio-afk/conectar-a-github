__M.tanda = (() => {
// v13 · TANDA DE PENALTIS POR GESTOS: la escena a pantalla completa (canvas 2D) y los gestos, sin botones.
// · Lanzador: cámara tras el balón; deslizas desde el balón hacia la portería (dirección = lado, longitud = potencia,
//   curva del trazo = rosca, punto donde tocas el balón = altura).
// · Portero (v15): cámara tras la portería; deslizas desde el portero hasta el punto donde van sus manos.
// · Tiro (v15): mantienes el dedo en el balón, el anillo de potencia sube y baja; arrastras y sueltas.
// El cálculo está en __M.pens; aquí solo se dibuja lo que se calculó (la estirada dura su tiempo real, el balón llega
// cuando llega). Futbolistas, grada y balón: las mismas piezas que los remates (__M.cine.lib).
const P = __M.pens, Lb = __M.cine.lib;
const { GW, GH, HW } = P;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3), easeIn = (t) => clamp(t) * clamp(t), smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const KZ = { shoot: 0.25, keep: 0.4 }; // profundidad del portero (m delante de la línea)
const TIER_C = ['#5fe39a', '#ffcf33', '#ff6b5b'];
const TIP = 1.24; // de la cadera a la punta de los guantes con los brazos estirados (m)

// ---------- cámaras (estenopeica con inclinación) ----------
function proj(W, o) {
  return (X, Y, z) => {
    const sp = Math.sin(o.pitch), cp = Math.cos(o.pitch), dz = o.mode === 'shoot' ? o.zc - z : z - o.zc, dy = Y - o.hc;
    const depth = Math.max(0.15, dz * cp - dy * sp), up = dy * cp + dz * sp, k = o.F / depth;
    return { x: W / 2 + (o.mode === 'keep' ? -X : X) * k, y: o.cy - up * k, k, d: depth };
  };
}
function cams(W, H) {
  // lanzador: balón a 1,08 m de la cámara (radio ≈ 13 % del ancho) y portería ≈ 78 % del ancho
  const S = { mode: 'shoot', F: 1.275 * W, zc: 11 + 1.08, zc0: 11 + 1.08, hc: 0.62, pitch: 0, cy: 0.72 * H - 0.602 * W };
  // portero: cámara elevada tras la portería; postes a ±47 % del ancho y pies del portero al 66 % de la altura
  const K = { mode: 'keep', hc: 7, pitch: 0.3, zc: -11, F: 1, cy: 0 };
  K.F = 0.47 * W / Math.abs(proj(W, K)(HW, 1.2, 0).x - W / 2);
  K.cy = 0.66 * H - proj(W, K)(0, 0, KZ.keep).y;
  return { S, K };
}

// ---------- balón ----------
function drawBallAt(c, x, y, r, spin, blur) {
  c.save(); c.translate(x, y);
  if (blur) { for (let i = 4; i >= 1; i--) { c.globalAlpha = .1 * (5 - i) / 4; c.fillStyle = '#fff'; c.beginPath(); c.arc(-blur.x * i, -blur.y * i, r * (1 - i * .05), 0, 7); c.fill(); } c.globalAlpha = 1; }
  c.rotate(spin);
  const g = c.createRadialGradient(-r * .35, -r * .4, r * .1, 0, 0, r * 1.05); g.addColorStop(0, '#ffffff'); g.addColorStop(.7, '#dfe3e8'); g.addColorStop(1, '#8f98a6');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
  c.save(); const cp = new Path2D(); cp.arc(0, 0, r, 0, 7); c.clip(cp);
  c.fillStyle = '#1a1d23';
  const pent = (px_, py_, rr, rot0) => { c.beginPath(); for (let i = 0; i < 5; i++) { const a = rot0 + i * 1.2566; c.lineTo(px_ + Math.cos(a) * rr, py_ + Math.sin(a) * rr); } c.closePath(); c.fill(); };
  pent(0, 0, r * .36, -1.5708);
  for (let i = 0; i < 5; i++) { const a = -1.5708 + i * 1.2566 + .6283; pent(Math.cos(a) * r, Math.sin(a) * r, r * .36, a + 3.1416); c.strokeStyle = '#1a1d23'; c.lineWidth = Math.max(.7, r * .07); c.beginPath(); const a2 = -1.5708 + i * 1.2566; c.moveTo(Math.cos(a2) * r * .36, Math.sin(a2) * r * .36); c.lineTo(Math.cos(a2) * r * .66, Math.sin(a2) * r * .66); c.stroke(); }
  c.restore();
  const sh = c.createRadialGradient(r * .4, r * .45, r * .2, 0, 0, r * 1.05); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,30,.4)'); c.fillStyle = sh; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
  c.restore();
}

// ---------- grada (se pinta una vez por cámara): dos anfiteatros con palcos, la afición del local con sus colores,
// un sector visitante, pancartas, focos y vallas LED a escala (≈ 1 m de alto a 15 m de la portería) ----------
function standsBg(W, H, hy, dpr, cols, seed, mode) {
  const shade = Lb.shade;
  let a = seed >>> 0; const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const cv = document.createElement('canvas'); cv.width = Math.round(W * dpr); cv.height = Math.round((hy + 4) * dpr);
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const sky = g.createLinearGradient(0, 0, 0, hy); sky.addColorStop(0, '#02060c'); sky.addColorStop(.5, '#0b1a2a'); sky.addColorStop(1, '#13283a'); g.fillStyle = sky; g.fillRect(0, 0, W, hy + 4);
  const bh = Math.max(10, Math.min(24, H * (mode === 'shoot' ? .024 : .03))), top = hy * .07, bot = hy - bh - 2, split = lerp(top, bot, .42);
  const home = cols.home || ['#ffffff', '#1d2a5b'], away = cols.away || ['#a50044', '#004d98'];
  const NEUT = ['#2a2f3a', '#e9edf2', '#8fb2d6', '#3a3f4a', '#5b4636', '#c9ced6', '#1f2733'];
  const SK = ['#f6d5b8', '#e8b98f', '#d09a6b', '#a9744a', '#5c3720'];
  const awayX = mode === 'shoot' ? [W * .74, W * 1.1] : [-W * .1, W * .26];
  const fans = [];
  const tier = (y0, y1, rh0, rh1, bgc) => {
    const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, shade(bgc, -.35)); gr.addColorStop(1, bgc); g.fillStyle = gr; g.fillRect(0, y0, W, y1 - y0);
    let y = y0 + rh0 * .9;
    while (y < y1 - 2) {
      const k = (y - y0) / (y1 - y0), rh = lerp(rh0, rh1, k), dx = rh * .78; let x = -rnd() * dx;
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, y + rh * .55, W, Math.max(1, rh * .12));
      while (x < W + dx) {
        if (rnd() > .045) {
          const inAway = x > awayX[0] && x < awayX[1] && k > .25, r = rnd();
          const c = inAway ? (r < .62 ? away[0] : r < .82 ? away[1] : NEUT[Math.floor(rnd() * NEUT.length)]) : (r < .5 ? home[0] : r < .7 ? home[1] : NEUT[Math.floor(rnd() * NEUT.length)]);
          const sk = SK[Math.floor(rnd() * SK.length)], xx = x + (rnd() - .5) * dx * .25, yy = y + (rnd() - .5) * rh * .15;
          g.fillStyle = c; g.fillRect(xx - rh * .34, yy - rh * .05, rh * .68, rh * .62);
          g.fillStyle = sk; g.beginPath(); g.arc(xx, yy - rh * .22, rh * .26, 0, 7); g.fill();
          if (rnd() < .12) { g.fillStyle = c; g.fillRect(xx + rh * .2, yy - rh * .75, rh * .14, rh * .5); } // brazo en alto
          if (k > .3 && rnd() < .5) fans.push({ x: xx, y: yy, r: rh * .26, c, sk, ph: rnd() * 6.28 });
        }
        x += dx * (.85 + rnd() * .3);
      }
      y += rh * 1.12;
    }
  };
  tier(top, split - 6, 5.5, 8.5, '#1a2230'); // anfiteatro alto (más lejos: más pequeño)
  const pg = g.createLinearGradient(0, split - 6, 0, split + 4); pg.addColorStop(0, '#05080d'); pg.addColorStop(1, '#0e1520'); g.fillStyle = pg; g.fillRect(0, split - 6, W, 10); // palcos
  for (let x = 4; x < W; x += 9) { g.fillStyle = rnd() < .5 ? 'rgba(255,230,170,.55)' : 'rgba(170,210,255,.35)'; g.fillRect(x, split - 3, 4, 3); }
  tier(split + 4, bot, 8.5, 12.5, '#222c3b');
  // pancartas con los colores del local
  for (let i = 0; i < 3; i++) { const w = W * (.18 + rnd() * .12), x = rnd() * (W - w), y = lerp(split + 10, bot - 16, rnd()), hh = 9 + rnd() * 5; g.save(); g.globalAlpha = .9; g.fillStyle = home[0]; g.fillRect(x, y, w, hh); g.fillStyle = home[1]; for (let j = 0; j < w; j += 14) g.fillRect(x + j, y, 7, hh); g.restore(); }
  // desenfoque suave de profundidad
  try { const c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height; const g2 = c2.getContext('2d'); g2.filter = 'blur(.6px)'; g2.drawImage(cv, 0, 0); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(c2, 0, 0); g.setTransform(dpr, 0, 0, dpr, 0, 0); } catch (e) {}
  // cubierta y focos
  const roof = g.createLinearGradient(0, 0, 0, top + 14); roof.addColorStop(0, '#000'); roof.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = roof; g.fillRect(0, 0, W, top + 16);
  [.12, .5, .88].forEach((fx) => { const gl = g.createRadialGradient(W * fx, 4, 2, W * fx, 4, H * .3); gl.addColorStop(0, 'rgba(255,255,235,.6)'); gl.addColorStop(.3, 'rgba(255,255,225,.14)'); gl.addColorStop(1, 'rgba(255,255,230,0)'); g.fillStyle = gl; g.fillRect(0, 0, W, hy); g.fillStyle = '#fffbe0'; for (let i = -2; i <= 2; i++) for (let j = 0; j < 2; j++) { g.beginPath(); g.arc(W * fx + i * 6, 5 + j * 6, 2.2, 0, 7); g.fill(); } });
  // vallas LED
  g.fillStyle = '#04070c'; g.fillRect(0, hy - bh, W, bh);
  const LED = ['#e11d48', '#0284c7', '#f5b301', '#16a34a', '#9333ea'], names = ['FOOTBALL CARDS', 'GOLAZO', 'LEGENDS', 'FÚTBOL', 'TCG'], seg = W / 3.2;
  for (let k = 0; k < 5; k++) { const x = k * seg - seg * .4; g.fillStyle = LED[k % 5]; g.fillRect(x + 2, hy - bh + 2, seg - 4, bh - 4); g.fillStyle = '#fff'; g.font = `900 ${Math.round(bh * .55)}px system-ui,Arial`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(names[k], x + seg / 2, hy - bh / 2 + 1); }
  g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, hy - bh, W, 1.5);
  return { img: cv, fans: fans.length > 900 ? fans.filter((_, i) => i % Math.ceil(fans.length / 900) === 0) : fans };
}

// trayectoria del balón: recta del punto de penalti al destino + barriga de la rosca + parábola (vaselinas y globos)
function pathAt(sh, u) {
  const b = 4 * u * (1 - u), arc = Math.pow(1 - sh.p, 2) * (0.35 + 0.9 * (sh.g + 1) / 2);
  return { X: sh.x * u + (sh.bend || 0) * b, Y: 0.11 + (sh.y - 0.11) * u + arc * b, z: 11 * (1 - u) };
}

function create(host, opt = {}) {
  const sfx = opt.sfx || null, buzz = opt.haptic || (() => {}), reduce = !!opt.reduce;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = host.clientWidth || innerWidth, H = host.clientHeight || innerHeight;
  const cv = document.createElement('canvas'); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.className = 'tk-cv';
  host.appendChild(cv); const c = cv.getContext('2d');
  const ui = document.createElement('div'); ui.className = 'tk-ui';
  ui.innerHTML = '<div class="tk-hud" id="tkhud"></div><div class="tk-pres" id="tkpres"></div><div class="cn-word" id="tkword"></div><div class="tk-line" id="tkline"></div><div class="tk-hint" id="tkhint"></div><div class="tk-cap" id="tkcap"></div><div class="tk-cd" id="tkcd"></div><div class="tk-rep" id="tkrep">REPETICIÓN</div><button type="button" class="tk-skip" id="tkskip" aria-label="Saltar la repetición">Saltar »</button>';
  host.appendChild(ui);
  const $u = (id) => ui.querySelector('#' + id);
  // saltar la repetición: termina ya y sigue la tanda
  const skipReplay = (e) => { if (e) { e.preventDefault(); e.stopPropagation(); } if (st && st.replay && st.phase !== 'done') { buzz('light'); finish(st); } };
  $u('tkskip').addEventListener('pointerdown', skipReplay); $u('tkskip').addEventListener('click', skipReplay);
  const CAM = cams(W, H), vS = proj(W, CAM.S), vK = proj(W, CAM.K);
  const hyS = vS(0, 0, -25).y, hyK = vK(0, 0, 45).y;
  const shade = Lb.shade, cseed = (opt.seed || 7) >>> 0;
  const stS = standsBg(W, H, hyS, dpr, opt.crowd || {}, cseed, 'shoot'), stK = standsBg(W, H, hyK, dpr, opt.crowd || {}, cseed + 99, 'keep');
  const bg = { topA: stS.img, topB: stK.img };
  const crowd = { shoot: stS.fans, keep: stK.fans };
  const ballS = () => { const b = vS(0, 0.11, 11); return { x: b.x, y: b.y, r: 0.11 * b.k }; };
  let st = null, T0 = performance.now(), last = T0, raf = 0, paused = false, flashes = [], dead = false;

  // ---------- dibujo ----------
  function drawGround(v, mode) {
    const hy = mode === 'shoot' ? hyS : hyK, zr = mode === 'shoot' ? [-25, 11.95] : [-10.8, 45];
    const gg = c.createLinearGradient(0, hy, 0, H); gg.addColorStop(0, '#0b3f27'); gg.addColorStop(.35, '#14663c'); gg.addColorStop(1, '#0c5230'); c.fillStyle = gg; c.fillRect(0, hy, W, H - hy);
    // franjas de corte del césped (cada 4,5 m)
    for (let z = -27, k = 0; z < 47; z += 4.5, k++) {
      const z1 = clamp(z, zr[0], zr[1]), z2 = clamp(z + 4.5, zr[0], zr[1]); if (z2 - z1 < .05) continue;
      const a = v(-60, 0, z1), b = v(60, 0, z1), d = v(60, 0, z2), e = v(-60, 0, z2);
      c.fillStyle = k % 2 ? 'rgba(255,255,255,.065)' : 'rgba(0,0,0,.09)'; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(d.x, d.y); c.lineTo(e.x, e.y); c.closePath(); c.fill();
    }
    const spot = v(0, 0, 6), sp = c.createRadialGradient(W / 2, spot.y, 10, W / 2, spot.y, W * .9); sp.addColorStop(0, 'rgba(255,255,220,.12)'); sp.addColorStop(1, 'rgba(255,255,220,0)'); c.fillStyle = sp; c.fillRect(0, hy, W, H - hy);
    const turf = Lb.turf();
    if (turf) { c.save(); c.globalAlpha = .5; c.fillStyle = c.createPattern(turf, 'repeat'); c.translate(0, hy); c.scale(1.6, .8); c.fillRect(0, 0, W / 1.6, (H - hy) / .8); c.restore(); }
    // líneas: gol, área pequeña, área grande, punto de penalti y semicírculo
    c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineCap = 'butt';
    const seg = (x1, z1, x2, z2) => {
      z1 = clamp(z1, zr[0], zr[1]); z2 = clamp(z2, zr[0], zr[1]); const a = v(x1, 0, z1), b = v(x2, 0, z2), m = v((x1 + x2) / 2, 0, (z1 + z2) / 2);
      c.lineWidth = Math.max(1, .12 * m.k); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
    };
    seg(-34, 0, 34, 0); seg(-9.16, 0, -9.16, 5.5); seg(9.16, 0, 9.16, 5.5); seg(-9.16, 5.5, 9.16, 5.5);
    seg(-20.16, 0, -20.16, 16.5); seg(20.16, 0, 20.16, 16.5); seg(-20.16, 16.5, 20.16, 16.5);
    if (mode === 'keep') { c.lineWidth = Math.max(1, .12 * v(0, 0, 18).k); c.beginPath(); let s0 = false; for (let a = -.93; a <= .93; a += .05) { const X = 9.15 * Math.sin(a), z = 11 + 9.15 * Math.cos(a); if (z < 16.5) continue; const p = v(X, 0, z); if (!s0) { c.moveTo(p.x, p.y); s0 = true; } else c.lineTo(p.x, p.y); } c.stroke(); }
    const ps = v(0, 0, 11); c.fillStyle = 'rgba(255,255,255,.92)'; c.beginPath(); c.ellipse(ps.x, ps.y, Math.max(2, .12 * ps.k), Math.max(1, .12 * ps.k * (mode === 'shoot' ? .18 : .5)), 0, 0, 7); c.fill();
  }
  function crowdLayer(mode, t, hype) {
    const hy = mode === 'shoot' ? hyS : hyK;
    if (hype > 0 && !reduce) for (const d of crowd[mode]) { const j = hype * Math.abs(Math.sin(t * 9 + d.ph)) * 3.5; if (j > .6) { c.fillStyle = d.c; c.fillRect(d.x - d.r * 1.3, d.y - d.r * .2 - j, d.r * 2.6, d.r * 1.5); c.fillStyle = d.sk; c.beginPath(); c.arc(d.x, d.y - d.r * .85 - j, d.r, 0, 7); c.fill(); } }
    if (!reduce && Math.random() < .35 + hype) flashes.push({ x: Math.random() * W, y: hy * (.14 + Math.random() * .65), l: .12 });
    flashes = flashes.filter((f) => { f.l -= .016; if (f.l <= 0) return false; c.fillStyle = `rgba(255,255,255,${f.l * 7})`; c.beginPath(); c.arc(f.x, f.y, 1.5 + f.l * 16, 0, 7); c.fill(); return true; });
  }
  // red (fondo, techo y laterales), con el bulto donde entra el balón
  function drawNet(v, imp, t, alpha) {
    const zb = -1.6, nx = 24, ny = 8, tn = imp ? t - imp.t : -1, amp = imp && tn >= 0 ? Math.exp(-tn * 2.4) * Math.cos(tn * 15) : 0;
    const pt = (X, Y, z) => {
      let dz = 0, dx = 0, dy = 0;
      if (amp && z === zb) { const d = Math.hypot(X - imp.X, Y - imp.Y), k = Math.exp(-d * d / 2.2); dz = -amp * k * .9; dx = (X - imp.X) * -.06 * k * amp; dy = -(Y - imp.Y) * .06 * k * amp; }
      return v(X + dx, Y + dy, z + dz);
    };
    c.strokeStyle = `rgba(255,255,255,${alpha})`; c.lineWidth = 1; c.beginPath();
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) { const p = pt(lerp(-HW, HW, i / nx), lerp(0, GH - .4, j / ny), zb); i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); }
    for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) { const p = pt(lerp(-HW, HW, i / nx), lerp(0, GH - .4, j / ny), zb); j ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); }
    for (let i = 0; i <= 12; i++) { const X = lerp(-HW, HW, i / 12), a = pt(X, GH, 0), b = pt(X, GH - .4, zb); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); }
    for (let k = 1; k <= 4; k++) { const z = lerp(0, zb, k / 5), Y = lerp(GH, GH - .4, k / 5), a = pt(-HW, Y, z), b = pt(HW, Y, z); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); }
    for (const sx of [-1, 1]) for (let j = 0; j <= 6; j++) { const Y = lerp(0, GH, j / 6), a = pt(sx * HW, Y, 0), b = pt(sx * HW, Math.min(Y, GH - .4), zb); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); }
    c.stroke();
    c.strokeStyle = `rgba(230,235,240,${alpha * 1.6})`; c.lineWidth = Math.max(1.5, .07 * v(0, 0, zb).k); c.beginPath();
    for (const sx of [-1, 1]) { const a = pt(sx * HW, 0, zb), b = pt(sx * HW, GH - .4, zb); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); } c.stroke();
  }
  function drawFrame(v, shake) {
    const a = v(-HW, 0, 0), b = v(-HW, GH, 0), d = v(HW, GH, 0), e = v(HW, 0, 0), lw = Math.max(2, .12 * a.k);
    const sx = shake ? (Math.random() - .5) * shake : 0;
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = '#9aa3ad'; c.lineWidth = lw + 1.5; c.beginPath(); c.moveTo(a.x + sx, a.y); c.lineTo(b.x + sx, b.y); c.lineTo(d.x + sx, d.y); c.lineTo(e.x + sx, e.y); c.stroke();
    c.strokeStyle = '#f7f9fb'; c.lineWidth = lw; c.beginPath(); c.moveTo(a.x + sx, a.y); c.lineTo(b.x + sx, b.y); c.lineTo(d.x + sx, d.y); c.lineTo(e.x + sx, e.y); c.stroke();
    c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = lw * .3; c.beginPath(); c.moveTo(a.x + lw * .25, a.y); c.lineTo(b.x + lw * .25, b.y + lw * .3); c.lineTo(d.x - lw * .25, d.y + lw * .3); c.lineTo(e.x - lw * .25, e.y); c.stroke();
  }
  function drawBall(v, B, prev, scaleFar = true) {
    const p = v(B.X, B.Y, B.z), g = v(B.X, 0, B.z), rk = scaleFar ? 1 + .45 * clamp((p.d - 3) / 10) : 1, r = Math.max(2.5, .11 * p.k * rk);
    c.fillStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.ellipse(g.x + 2, g.y + 1, r * (1 + B.Y * .12), r * .3 / (1 + B.Y * .3), 0, 0, 7); c.fill();
    let bl = null; if (prev) { const q = v(prev.X, prev.Y, prev.z); bl = { x: (p.x - q.x) * .22, y: (p.y - q.y) * .22 }; }
    drawBallAt(c, p.x, p.y, r, B.spin || 0, bl);
    return { x: p.x, y: p.y, r };
  }

  // ---------- portero: de pie, balanceo, amagos y estirada calculada ----------
  function keeperPose(v, mode, s, T) {
    const kz = KZ[mode], u = v(0, 0, kz).k, sd = (d) => (mode === 'keep' ? -d : d), base = v(0, .95, kz);
    const kan = s.kan, tt = T - (s.ts ?? 1e9);
    const idle = () => { const sw = Math.sin(T * 6), fe = s.feint ? Math.sin(Math.PI * clamp((T - s.feint.t) / .45)) * sd(s.feint.d) * .35 : 0; return { x: base.x + (sw * .09 + fe) * u, y: base.y + Math.abs(sw) * u * .035, phi: fe * .25, q: 0, aL: -2.4, aR: 2.4, legs: [{ a: -.28, sx: 1 }, { a: .28, sx: 1 }] }; };
    if (!kan || tt < kan.t1) return { ...idle(), u, kz };
    const p = clamp((tt - kan.t1) / kan.dur), e = easeOut(p), dir = sd(kan.dir);
    const tg = v(kan.X1, kan.Y1, kz);
    if (kan.kind === 'stay') { const q = easeOut(p * 1.6); return { x: base.x, y: base.y + .2 * u * q, phi: 0, q, aL: lerp(-2.4, -1.5, q), aR: lerp(2.4, 1.5, q), legs: [{ a: -.45, flex: .5 * q, sx: 1 }, { a: .45, flex: .5 * q, sx: 1 }], u, kz }; }
    if (kan.kind === 'jump') { const j = Math.sin(Math.PI * clamp(p * .8)); return { x: base.x, y: base.y - .55 * u * j, phi: 0, q: e, aL: lerp(-2.4, -.25, e), aR: lerp(2.4, .25, e), legs: [{ a: -.15, flex: .4 * j, sx: 1 }, { a: .15, flex: .4 * j, sx: 1 }], u, kz, hand: { X: 0, Y: lerp(2.0, 2.45, j) } }; }
    const phiF = kan.kind === 'step' ? dir * .3 : dir * (kan.Y1 > 1.5 ? .62 : kan.Y1 < .5 ? 1.3 : 1.05);
    const phi = lerp(0, phiF, easeOut(p * 1.1));
    const tip = { x: TIP * u * Math.sin(phiF), y: -TIP * u * Math.cos(phiF) };
    const hipEnd = kan.kind === 'step' ? { x: tg.x - tip.x * .55, y: base.y } : { x: tg.x - tip.x, y: tg.y - tip.y };
    const jump = (kan.Y1 > 1.2 ? .55 : .25) * u * Math.sin(Math.PI * p) * (kan.kind === 'step' ? .3 : 1);
    let x = lerp(base.x, hipEnd.x, e), y = lerp(base.y, hipEnd.y, e) - jump, ph = phi, lie = 0;
    const tEnd = kan.t1 + kan.dur + (s.catchIt ? 9 : .18);
    if (kan.kind !== 'step' && tt > tEnd) { const g = easeIn((tt - tEnd) / .55); lie = g; x = lerp(hipEnd.x, hipEnd.x + dir * u * .9, g); y = lerp(hipEnd.y, v(0, .28, kz).y, g); ph = lerp(phiF, dir * 1.5, g); }
    const q = e;
    return { x, y, phi: ph, q, aL: lerp(lerp(-2.4, -.12, q), -.7, lie), aR: lerp(lerp(2.4, .12, q), .7, lie), legs: [{ a: lerp(-.28, -.05 * dir - .04, q), flex: q * .14, sx: 1 }, { a: lerp(.28, .1 * dir + .08, q), flex: q * .4 * (1 - lie * .5), sx: 1 }], u, kz, hand: { X: kan.X1, Y: kan.Y1 }, reached: p >= 1 };
  }
  function drawKeeper(v, mode, s, T) {
    const kp = keeperPose(v, mode, s, T), g = v(0, 0, kp.kz);
    c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(kp.x, g.y + 2, kp.u * .6, kp.u * .13, 0, 0, 7); c.fill();
    Lb.figure(c, kp.x, kp.y, kp.u, { ...s.keeper, gk: true, back: mode === 'keep' }, { phi: kp.phi, aL: kp.aL, aR: kp.aR, legs: kp.legs });
    const a = kp.phi, gx = kp.x + TIP * kp.u * Math.sin(a), gy = kp.y - TIP * kp.u * Math.cos(a);
    s.glove = { x: gx, y: gy, u: kp.u }; s.kpose = kp;
  }
  // lanzador rival (solo con la cámara del portero): carrera, señal en los últimos 0,25 s y golpeo
  function drawShooter(v, s, T) {
    const tt = T - s.ts, foot = s.sA.foot === 'L' ? -1 : 1, run = s.run;
    const x0 = -foot * 1.15, z0 = 13.6, x1 = -foot * .35, z1 = 11.32;
    let pr = clamp((tt + run.dur) / run.dur);
    if (run.feint && tt > -run.dur * .3 && tt < -run.dur * .3 + run.feint) pr = clamp(.7); // amago: se para un instante
    const X = lerp(x0, x1, smooth(pr)), z = lerp(z0, z1, smooth(pr)), p = v(X, .95, z), u = p.k, gr = v(X, 0, z);
    const ph = (tt + run.dur) * 11, running = pr > 0 && pr < 1 && tt < 0;
    const cue = tt > -.25 && tt < .05 && s.cue && s.cue.side ? s.cue.side : 0;
    c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(gr.x, gr.y + 1, u * .5, u * .1, 0, 0, 7); c.fill();
    let legs, aL = -2.6, aR = 2.6, phi = 0, bob = 0;
    if (tt >= 0) { const k = clamp(tt / .45); legs = [{ a: .18 * foot, sx: 0 }, { a: foot * lerp(1.15, .15, k), flex: .25, sx: 0 }]; aL = -1.9; aR = 1.9; }
    else if (running) { const s1 = Math.sin(ph); legs = [{ a: -.12, flex: .7 * Math.max(0, s1), sx: 0 }, { a: .12, flex: .7 * Math.max(0, -s1), sx: 0 }]; aL = -2.6 + .45 * s1; aR = 2.6 + .45 * s1; bob = Math.abs(s1) * .05; }
    else legs = [{ a: -.1, sx: 0 }, { a: .1, sx: 0 }];
    if (cue) phi = -cue * .16; // inclina la cadera hacia el lado de la señal (en pantalla, invertido)
    Lb.figure(c, p.x, p.y - bob * u, u, { ...s.shooter, back: false }, { legs, aL, aR, phi });
  }
  // vista del balón y del portero según el momento
  function ballNow(s, T) {
    const tt = T - (s.ts ?? 1e9), sh = s.sh;
    if (!sh || tt <= 0) return { X: 0, Y: .11, z: 11, spin: 0 };
    if (tt <= sh.tb) { const u = tt / sh.tb, b = pathAt(sh, u); return { ...b, spin: tt * (8 + sh.v * .5) * (sh.s ? 1 + Math.abs(sh.s) : 1) }; }
    const ta = tt - sh.tb, o = s.outcome, sx = Math.sign(sh.x) || 1;
    if (o === 'gol' || o === 'palo_dentro') {
      const X0 = o === 'palo_dentro' ? sh.x - sx * .5 * clamp(ta / .12) : sh.x - sx * .25 * clamp(ta / .3), k = clamp(ta / .14);
      let Y = sh.y - (ta > .14 ? 4.9 * (ta - .14) ** 2 : 0); if (Y < .12) Y = .12 + Math.abs(Math.sin((ta - .14) * 9)) * .06 * Math.exp(-ta * 2);
      return { X: X0, Y: Math.max(.12, Y), z: lerp(0, -1.35, k), spin: tt * 6 };
    }
    if (o === 'blocaje' && s.glove) return { glove: true };
    if (o === 'parada' || o === 'palo_fuera') {
      const vx = sx * (o === 'parada' ? 3.2 : 2.6) * (s.parryUp ? .7 : 1), vz = o === 'parada' ? 5.5 : 4, vy = s.parryUp ? 4.2 : 2.2;
      let Y = sh.y + vy * ta - 4.9 * ta * ta; if (Y < .11) Y = .11 + Math.abs(Y - .11) * .45;
      return { X: sh.x + vx * ta, Y, z: Math.min(10, (o === 'parada' ? .2 : 0) + vz * ta), spin: tt * 10 };
    }
    // fuera: sigue su camino hasta perderse
    const u = 1 + ta / sh.tb, b = pathAt({ ...sh, bend: 0 }, u);
    return { X: b.X, Y: b.Y + ta * (sh.y > GH ? 1.5 : 0), z: b.z, spin: tt * 8, gone: ta > .9 };
  }
  function draw(now) {
    const s = st, mode = s ? s.mode : 'shoot', v = mode === 'shoot' ? vS : vK, T = s ? s.T : 0, real = (now - T0) / 1000;
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    c.save();
    const shk = s && s.shake && !reduce ? s.shake * Math.max(0, 1 - (real - s.shakeAt) / .45) : 0;
    if (shk > 0) c.translate((Math.random() - .5) * shk, (Math.random() - .5) * shk);
    if (s && s.bump && !reduce) { const k = Math.sin(Math.PI * clamp((T - s.bump) / .25)); c.translate(W / 2, H * .7); c.scale(1 + .025 * k, 1 + .025 * k); c.translate(-W / 2, -H * .7); }
    c.drawImage(mode === 'shoot' ? bg.topA : bg.topB, 0, 0, W, (mode === 'shoot' ? hyS : hyK) + 4);
    { const hy = mode === 'shoot' ? hyS : hyK, dk = c.createLinearGradient(0, 0, 0, hy); dk.addColorStop(0, 'rgba(0,4,10,.45)'); dk.addColorStop(.7, 'rgba(0,4,10,.18)'); dk.addColorStop(1, 'rgba(0,4,10,0)'); c.fillStyle = dk; c.fillRect(0, 0, W, hy); } // la grada, un paso atrás
    crowdLayer(mode, real, s ? s.hype || 0 : 0);
    drawGround(v, mode);
    if (!s) { c.restore(); return; }
    const B = ballNow(s, T), Bp = ballNow(s, T - .03), imp = s.netImp;
    const postShake = s.postAt != null ? 5 * Math.max(0, 1 - (T - s.postAt) / .3) : 0;
    if (mode === 'shoot') {
      drawNet(v, imp, T, .3);
      const ballBehind = B.z < KZ.shoot && !B.glove;
      if (ballBehind && !B.gone) drawBall(v, B, Bp);
      drawFrame(v, postShake);
      drawKeeper(v, mode, s, T);
      if (B.glove) drawBallAt(c, s.glove.x, s.glove.y, Math.max(3, .11 * s.glove.u * 1.2), 0);
      else if (!ballBehind) { const r = drawBall(v, B, s.ts != null && T > s.ts ? Bp : null, false); s.ballScr = r; }
    } else {
      if (s.ts != null) drawShooter(v, s, T);
      const ballFar = B.z > KZ.keep && !B.glove;
      if (ballFar && !B.gone) drawBall(v, B, s.ts != null && T > s.ts ? Bp : null);
      drawKeeper(v, mode, s, T);
      if (B.glove) drawBallAt(c, s.glove.x, s.glove.y, Math.max(3, .11 * s.glove.u * 1.3), 0);
      else if (!ballFar && !B.gone) drawBall(v, B, Bp);
      drawFrame(v, postShake);
      drawNet(v, imp, T, .14); // red tenue en primer plano
    }
    c.restore();
    if (mode === 'shoot') drawAim(s, real);
    if (mode === 'keep') drawKeepHint(s, real);
    // viñeta con latido (más intensa con más presión) y destellos de gol o parada
    const beat = (s.phase === 'wait' || s.phase === 'aim') ? Math.pow(Math.max(0, Math.sin(real * Math.PI * (70 + 60 * s.P) / 60)), 8) : 0;
    const vg = c.createRadialGradient(W / 2, H * .5, H * .3, W / 2, H * .5, H * .85); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(${beat > .05 ? 40 : 0},0,0,${.45 + .25 * beat * s.P})`); c.fillStyle = vg; c.fillRect(0, 0, W, H);
    if (s.flash && !reduce) { const k = 1 - (real - s.flash.t) / .35; if (k > 0) { c.fillStyle = `rgba(${s.flash.c},${.5 * k})`; c.fillRect(0, 0, W, H); } }
  }
  // gesto del lanzador: trazo, anillo de potencia, punto de golpeo y el primer 30 % de la trayectoria
  function drawAim(s, real) {
    const b = ballS();
    if (s.phase === 'wait' && s.tut && !s.touched) { // mano de ayuda
      const k = (real % 1.8) / 1.3, q = clamp(k), x = b.x + 30 * Math.sin(q * Math.PI) * .6 + q * 40, y = b.y + b.r * .5 - q * 230;
      c.globalAlpha = q < 1 ? .9 : 0; c.font = '34px system-ui'; c.textAlign = 'center'; c.fillText('👆', x, y + 26); c.globalAlpha = 1;
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.setLineDash([6, 6]); c.lineWidth = 3; c.beginPath(); c.moveTo(b.x, b.y + b.r * .5); c.quadraticCurveTo(b.x + 55, b.y - 120, b.x + 40, b.y + b.r * .5 - 230); c.stroke(); c.setLineDash([]);
    }
    if (s.phase === 'wait' && s.tut) { c.font = '800 10px system-ui'; c.textAlign = 'center'; c.fillStyle = 'rgba(0,0,0,.55)'; c.fillText('RASO', b.x, b.y - b.r * .55); c.fillText('ALTO', b.x, b.y + b.r * .75); c.strokeStyle = 'rgba(0,0,0,.35)'; c.setLineDash([3, 3]); c.lineWidth = 1; [-.33, .33].forEach((f) => { const w = Math.sqrt(1 - f * f) * b.r; c.beginPath(); c.moveTo(b.x - w, b.y + f * b.r); c.lineTo(b.x + w, b.y + f * b.r); c.stroke(); }); c.setLineDash([]); }
    const a = s.aim; if (!a || s.phase !== 'aim') return;
    const p0 = a.pts[0], pw = ringNow(a);
    // v15 · anillo de potencia: sube y baja solo mientras mantienes el dedo; zona verde = buena, roja = se va
    const R = b.r * 1.42, A0 = -Math.PI / 2, G = P.K.ringGood, ang = (x) => A0 + x * Math.PI * 2;
    c.lineCap = 'butt'; c.lineWidth = 10;
    [[0, G[0], 'rgba(255,207,51,.35)'], [G[0], G[1], 'rgba(95,227,154,.45)'], [G[1], .85, 'rgba(255,207,51,.35)'], [.85, 1, 'rgba(255,107,91,.5)']].forEach(([x0, x1, col]) => { c.strokeStyle = col; c.beginPath(); c.arc(b.x, b.y, R, ang(x0), ang(x1)); c.stroke(); });
    c.lineCap = 'round'; c.lineWidth = 6; c.strokeStyle = pw > .85 ? '#ff6b5b' : pw >= G[0] && pw <= G[1] ? '#5fe39a' : '#ffcf33';
    c.beginPath(); c.arc(b.x, b.y, R, A0, ang(Math.max(.005, pw))); c.stroke();
    c.font = '900 13px system-ui'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText(pw > .85 ? '¡DEMASIADO FUERTE!' : pw >= G[0] && pw <= G[1] ? 'POTENCIA BUENA' : pw < G[0] ? 'FLOJO' : 'FUERTE', b.x, b.y - R - 12);
    // punto de golpeo
    c.fillStyle = '#38bdf8'; c.beginPath(); c.arc(p0.x, p0.y, 6, 0, 7); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke();
    // trazo del dedo (tiembla con la presión si el lanzador no tiene sangre fría)
    const jit = s.P * (1 - s.sA.sf) * 3.2;
    c.strokeStyle = 'rgba(56,189,248,.9)'; c.lineWidth = 6; c.lineJoin = 'round'; c.beginPath();
    a.pts.forEach((q, i) => { const jx = jit ? (Math.random() - .5) * jit : 0; i ? c.lineTo(q.x + jx, q.y) : c.moveTo(q.x, q.y); }); c.stroke();
    // vista previa: primer 30 % de la trayectoria, sin el error (que se decide al soltar)
    const g = P.analyze(a.pts, b, b.r, s.bias || 0, { power: pw });
    if (g.ok) {
      const it = intentOf(g), sh = { x: it.xt, y: P.heightTarget(it.g, it.p), p: it.p, g: it.g, bend: P.bendOf(it.s, it.p) };
      c.fillStyle = 'rgba(255,255,255,.85)';
      for (let k = 1; k <= 12; k++) { const pp = pathAt(sh, k * .025), q = vS(pp.X, pp.Y, pp.z), jx = jit ? (Math.random() - .5) * jit : 0; c.beginPath(); c.arc(q.x + jx, q.y, Math.max(1.5, 4 - k * .2), 0, 7); c.fill(); }
    }
  }
  function drawKeepHint(s, real) {
    // v15 · dónde irán las manos: trazo desde el portero y guantes en el punto
    if (s.KT && s.phase !== 'after' && s.phase !== 'done') {
      const tg = vK(s.KT.X, s.KT.Y, KZ.keep), k0 = vK(0, 1, KZ.keep);
      c.strokeStyle = 'rgba(232,255,58,.55)'; c.lineWidth = 4; c.setLineDash([8, 6]); c.beginPath(); c.moveTo(k0.x, k0.y); c.lineTo(tg.x, tg.y); c.stroke(); c.setLineDash([]);
      c.font = '30px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🧤', tg.x, tg.y); c.textBaseline = 'alphabetic';
    }
    if (!s.tut || s.D || s.phase === 'pres' || s.phase === 'after') return;
    const k = (real % 2) / 1.4, q = clamp(k), x = W * .5 + (q * 120) * (Math.floor(real / 2) % 2 ? -1 : 1), y = H * .8 - q * 40;
    c.globalAlpha = q < 1 ? .85 : 0; c.font = '34px system-ui'; c.textAlign = 'center'; c.fillText('👆', x, y); c.globalAlpha = 1;
  }

  // ---------- gestos ----------
  const gMid = () => vS(0, 1.22, 0).y, kGoal = () => vS(1, 1.22, 0).x - W / 2;
  // ángulo de la cuerda prolongado hasta la portería (a media altura) → x en la portería
  const ringNow = (a) => (a && a.t0 ? P.powerRing(performance.now() - a.t0) : 0);
  const mulb = (seed) => P.mulberry(seed); // azar fijo por tiro: mover el dedo no cambia la suerte, solo el sitio de las manos
  function intentOf(g) { const b = ballS(), xt = clamp(Math.tan(g.angle) * (b.y - gMid()) / kGoal(), -9, 9); return { xt, g: g.g, p: g.p, s: g.s }; }
  function pt(e) { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, t: e.timeStamp || performance.now() }; }
  const gameTimeAt = (tms) => { const s = st; if (!s) return 0; return s.T + Math.max(-.05, (tms - last) / 1000) * rateOf(s); };
  function onDown(e) {
    const s = st; if (!s || paused) return; const q = pt(e);
    try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    if (s.mode === 'shoot') {
      if (s.phase !== 'wait') return;
      const b = ballS(), d = Math.hypot(q.x - b.x, q.y - b.y);
      if (d > Math.max(b.r * 1.35, 24)) { hint('Mantén el dedo en el balón: el anillo de potencia sube y baja'); return; }
      s.touched = true; s.phase = 'aim'; s.aim = { pts: [q], id: e.pointerId, tier: -1, t0: performance.now() }; s.aimAt = s.real;
      showHud(false); hint(''); sfx && sfx.hush && sfx.hush(true); buzz('sel'); opt.onEvent && opt.onEvent('aim', s);
    } else {
      if (s.phase === 'pres' || s.phase === 'after' || s.phase === 'done') return;
      if (q.x < 24 || q.x > W - 24 || q.y < H * .45) return;
      if (!s.kd && !s.kdone) s.kd = { pts: [q], id: e.pointerId }; // v15 · desde el portero hasta el punto donde van las manos
    }
  }
  function onMove(e) {
    const s = st; if (!s || paused) return; const q = pt(e);
    if (s.mode === 'shoot' && s.phase === 'aim' && s.aim && e.pointerId === s.aim.id) {
      const lp = s.aim.pts[s.aim.pts.length - 1]; if (Math.hypot(q.x - lp.x, q.y - lp.y) < 2) return;
      s.aim.pts.push(q);
      return;
    }
    if (s.mode === 'keep') {
      if (s.kd && e.pointerId === s.kd.id) {
        s.kd.pts.push(q); const p0 = s.kd.pts[0], L = Math.hypot(q.x - p0.x, q.y - p0.y);
        if (!s.kd.t0 && L >= 12) s.kd.t0 = gameTimeAt(q.t); // empieza a moverse
        if (s.kd.t0) aimHands(s, q, false);
      }
    }
  }
  function onUp(e) {
    const s = st; if (!s) return;
    if (s.mode === 'shoot' && s.phase === 'aim' && s.aim && e.pointerId === s.aim.id) { s.aim.pts.push(pt(e)); release(s); }
    if (s.mode === 'keep' && s.kd && e.pointerId === s.kd.id) {
      const pn = pt(e); if (s.kd.t0) { aimHands(s, pn, true); s.kdone = true; }
      s.kd = null;
    }
    if (s.kf && e.pointerId === s.kf.id) s.kf = null;
  }
  cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp);
  function hint(t) { const h = $u('tkhint'); h.textContent = t; h.classList.toggle('on', !!t); }
  function caption(t, ms = 2200) { const el = $u('tkcap'); el.textContent = t; el.classList.add('on'); clearTimeout(caption.t); caption.t = setTimeout(() => el.classList.remove('on'), ms); }
  function showHud(on) { $u('tkhud').classList.toggle('off', !on); }

  // ---------- lanzar (usuario) ----------
  function release(s) {
    if (s.phase !== 'aim') return;
    const b = ballS(), g = P.analyze(s.aim.pts, b, b.r, s.bias || 0, { power: ringNow(s.aim) });
    if (!g.ok) {
      s.phase = 'wait'; s.aim = null; sfx && sfx.hush && sfx.hush(false); showHud(true);
      hint({ toque: 'Mantén el dedo en el balón, arrastra hacia la portería y suelta', abajo: 'Arrastra hacia la portería, no hacia abajo', lento: 'Suelta cuando el anillo esté en verde' }[g.why] || ''); return;
    }
    if (opt.onBias) opt.onBias(P.calibrate(s.bias || 0, g.f));
    shoot(s, intentOf(g), g);
  }
  function shoot(s, it, g = null) {
    const rhythm = P.rhythmOf(s.waitReal || 0), Pr = clamp(s.P0 + rhythm, 0, 1);
    s.P = Pr; s.intent = it; s.gesture = g; s.rhythm = rhythm;
    s.sh = P.resolveShot(it, s.sA, Pr, s.rng);
    s.D = P.botKeeper(s.kA, s.sh, s.mem, s.rng);
    s.res = s.sh.frame.k === 'fuera' || s.sh.frame.k === 'palo_fuera' ? null : P.keeperResolve(s.sh, s.D, s.kA, { keeperHome: s.keeperHome }, s.rng);
    s.outcome = outcomeOf(s.sh, s.res); s.catchIt = s.outcome === 'blocaje';
    s.ts = s.T + .32; s.bump = s.T + .2; s.phase = 'windup';
    s.kan = planDive(s.D, s.sh, s.res, s.kA);
    hint('');
  }
  const outcomeOf = (sh, res) => (sh.frame.k === 'fuera' ? 'fuera' : sh.frame.k === 'palo_fuera' ? 'palo_fuera' : res && res.saved ? (res.kind === 'blocaje' ? 'blocaje' : 'parada') : sh.frame.k === 'palo_dentro' ? 'palo_dentro' : 'gol');
  function planDive(D, sh, res, KA) {
    if (!D) return null;
    if (D.dir === 0) return { kind: D.hd >= .75 ? 'jump' : 'stay', t1: D.t0, dur: .45, X1: 0, Y1: D.hd >= .75 ? 2.3 : .6, dir: 0 };
    const same = sh && P.sideOf(sh.x) === D.dir;
    let X1, Y1;
    if (D.step) { X1 = D.dir * 1.0; Y1 = lerp(.35, 1.5, D.hd ?? .5); if (same && Math.abs(sh.x) < 1.6 && sh.y < 1.9) { X1 = sh.x; Y1 = sh.y; } }
    else if (same && Math.abs(sh.x) < HW + .4 && sh.y < GH + .3) { X1 = sh.x; Y1 = sh.y; }
    else { X1 = D.dir * (2.5 + .5 * KA.est); Y1 = lerp(.3, 2.0, D.hd ?? .5); }
    let dur = P.tNeed(X1, Y1, KA) * (D.step ? .8 : 1);
    if (res && res.saved && sh) dur = Math.min(dur, Math.max(.18, sh.tb - D.t0 - .01)); // la mano llega a tiempo
    return { kind: D.step ? 'step' : 'dive', t1: D.t0, dur, X1, Y1, dir: D.dir };
  }

  // ---------- parar (usuario) ----------
  // v15 · punto de la pantalla → punto de la portería (m) en el plano del portero
  function goalPt(q) { const z = KZ.keep, o0 = vK(0, 0, z), ox = vK(1, 0, z), oy = vK(0, 1, z); return { X: (q.x - o0.x) / (ox.x - o0.x), Y: (q.y - o0.y) / (oy.y - o0.y) }; }
  function aimHands(s, q, final) {
    const g = goalPt(q), t0 = s.kd.t0 - (s.ts ?? s.kd.t0 + 2);
    s.KT = { X: g.X, Y: g.Y, t0, final, sx: q.x, sy: q.y };
    s.D = { dir: Math.abs(g.X) < .5 ? 0 : Math.sign(g.X), hd: clamp((g.Y - .1) / 2.1), step: false, t0, fix: 0, point: true };
    if (final) { buzz('sel'); if (s.ts == null || s.T < s.ts) { const pe = P.punishEarly(s.intent, s.D, s.sA, s.rng); if (pe) { s.intent = pe; s.read = true; } } }
    replan(s);
  }
  function decideKeeper(s, dx, dy, tg) {
    const ang = Math.atan2(dx, -dy) * 180 / Math.PI, a = Math.abs(ang), sdir = dx === 0 ? 0 : -Math.sign(dx); // la cámara mira hacia el lanzador: pantalla invertida
    let dir = sdir, hd;
    if (a <= 25) { dir = 0; hd = 1; } else if (a <= 65) hd = .9; else if (a <= 115) hd = .5; else if (a <= 155) hd = .1; else { dir = 0; hd = 0; }
    const t0 = tg - (s.ts ?? tg + 2); // respecto al golpeo (negativo = antes)
    s.D = { dir, hd, step: null, t0, fix: 0 }; buzz('sel');
    if (s.ts == null || s.T < s.ts) { // antes del golpeo: ¿le ha leído el lanzador?
      const pe = P.punishEarly(s.intent, s.D, s.sA, s.rng);
      if (pe) { s.intent = pe; s.read = true; }
    }
    replan(s);
  }
  function replan(s) {
    if (!s.D) return;
    const out = s.sh && (s.sh.frame.k === 'fuera' || s.sh.frame.k === 'palo_fuera');
    if (s.D.point && s.KT) { // v15 · manos al punto
      if (s.sh) s.res = out ? null : P.keeperPoint(s.sh, s.KT, s.kA, { keeperHome: s.keeperHome }, mulb(s.seedK || (s.seedK = 1 + Math.floor(s.rng() * 1e9))));
      s.outcome = s.sh ? outcomeOf(s.sh, s.res) : null; s.catchIt = s.outcome === 'blocaje';
      const r = s.res || (s.sh ? P.keeperPoint(s.sh, s.KT, s.kA, {}, () => .99) : null), tgt = r ? r.target : { x: s.KT.X, y: s.KT.Y };
      const need = (.16 + .34 * Math.min(Math.hypot(tgt.x, tgt.y - 1), 3) / 2.6) * (1.15 - .30 * s.kA.agil);
      let X1 = tgt.x, Y1 = tgt.y; if (s.res && s.res.saved) { X1 = s.sh.x; Y1 = s.sh.y; } // si para, la mano llega al balón
      s.kan = { kind: Math.abs(X1) < .7 && Y1 < 1.4 ? 'step' : Math.abs(X1) < .7 ? 'jump' : 'dive', t1: s.KT.t0, dur: need, X1, Y1, dir: Math.abs(X1) < .5 ? 0 : Math.sign(X1) };
      return;
    }
    if (s.sh) s.res = out ? null : P.keeperResolve(s.sh, s.D, s.kA, { keeperHome: s.keeperHome }, s.rng);
    s.outcome = s.sh ? outcomeOf(s.sh, s.res) : null; s.catchIt = s.outcome === 'blocaje';
    s.kan = planDive(s.D, s.sh, s.res, s.kA);
  }
  function handFix(s, dx, dy) {
    if (!s.sh || !s.kan || s.fixed) return;
    s.fixed = true;
    const tg = vK(s.kan.X1, s.kan.Y1, KZ.keep), bl = vK(s.sh.x, s.sh.y, KZ.keep), nx = bl.x - tg.x, ny = bl.y - tg.y, nl = Math.hypot(nx, ny);
    s.D.fix = nl < 8 ? -1 : (dx * nx + dy * ny) / (Math.hypot(dx, dy) * nl) > .3 ? 1 : -1;
    buzz('light'); replan(s);
  }

  // ---------- reloj ----------
  function rateOf(s) {
    if (s.replay) return s.replay;
    const tt = s.T - (s.ts ?? 1e9);
    if (s.mode === 'keep' && tt >= 0 && s.sh && tt < s.sh.tb + .05) return s.slow;
    if (s.sh && s.tight && tt > s.sh.tb - .15 && tt < s.sh.tb + .1) return .5;
    return 1;
  }
  function step(s, dt) {
    s.real += dt; const prevT = s.T; s.T += dt * rateOf(s);
    if ((s.phase === 'wait' || s.phase === 'aim') && sfx && sfx.beat) { s.beatT = (s.beatT || 0) - dt; if (s.beatT <= 0) { sfx.beat(s.P); s.beatT = 60 / (70 + 60 * s.P); } }
    if (s.phase === 'pres') { s.presLeft -= dt; if (s.presLeft <= 0) startWait(s); return; }
    if (s.mode === 'shoot') {
      if (s.phase === 'wait' || s.phase === 'aim') {
        s.waitReal += dt; if (s.phase === 'wait') s.idleReal += dt;
        if (s.phase === 'wait' && !s.feint && Math.random() < dt * .25) s.feint = { t: s.T, d: Math.random() < .5 ? -1 : 1 };
        if (s.feint && s.T - s.feint.t > .6) s.feint = null;
        if (s.phase === 'wait' && s.idleReal > P.K.refWhistle && !s.warned) { s.warned = true; sfx && sfx.whistle(.5); caption('El árbitro pide que lances'); }
        if (s.phase === 'wait' && s.idleReal > P.K.autoShot) { caption('Tiro flojo automático'); s.auto = true; shoot(s, { xt: 0, g: -.5, p: .12, s: 0 }); }
      }
    } else if (s.phase === 'wait' && s.ts != null && s.T >= s.ts - s.run.dur - .02 && !s.runStarted) { s.runStarted = true; sfx && sfx.hush && sfx.hush(true); opt.onEvent && opt.onEvent('runup', s); }
    // golpeo
    if (s.ts != null && prevT < s.ts && s.T >= s.ts) strike(s);
    // llegada a la portería
    if (s.sh && s.ts != null && s.phase === 'flight' && s.T >= s.ts + s.sh.tb) impact(s);
    if (s.phase === 'after' && s.real - s.afterAt >= (s.replay ? .8 : 1.7)) finish(s);
  }
  function startWait(s) {
    s.phase = 'wait'; $u('tkpres').classList.remove('on'); sfx && sfx.whistle(.6); buzz('light');
    if (s.mode === 'keep') {
      showHud(false);
      s.intent = P.botShot(s.sA, s.mem, s.rng); s.cue = P.cueOf(s.intent, s.sA, s.rng);
      const pause = .6 + s.rng() * 1.8; s.run = { dur: 1.25, feint: s.rng() < .15 * s.sA.tec ? .3 : 0 };
      s.P = clamp(s.P0 + P.rhythmOf(pause + s.run.dur), 0, 1);
      s.ts = s.T + pause + s.run.dur + s.run.feint;
      if (s.tut) hint('Desliza desde el portero hasta donde quieres poner las manos 🧤');
    } else if (s.tut) hint('Mantén el dedo en el balón · arrastra a la portería · suelta con el anillo en verde');
    opt.onEvent && opt.onEvent('wait', s);
  }
  function strike(s) {
    if (s.mode === 'keep') {
      s.sh = P.resolveShot(s.intent, s.sA, s.P, s.rng);
      if (s.D) replan(s); else { s.outcome = outcomeOf(s.sh, null); }
      if (s.tut) hint('');
    }
    s.phase = 'flight'; sfx && sfx.kick(.9 + s.sh.p * .5); if (!s.replay) buzz('heavy');
    s.tight = Math.abs(Math.abs(s.sh.x) - HW) < .3 || s.sh.frame.k.startsWith('palo');
    opt.onEvent && opt.onEvent('strike', s);
  }
  function impact(s) {
    if (s.mode === 'keep') { if (!s.D) { s.D = { dir: 0, hd: 0, t0: 9, step: false, fix: 0, none: true }; } replan(s); }
    const o = s.outcome, sh = s.sh, mine = s.mode === 'shoot';
    if (s.res && s.res.margin != null && Math.abs(s.res.margin) < .05) s.tight = true;
    s.phase = 'after'; s.afterAt = s.real; s.parryUp = sh.y > 1.6;
    const crowdHappy = (o === 'gol' || o === 'palo_dentro') === mine; // para quien juega (no la grada)
    if (o === 'gol' || o === 'palo_dentro') { s.netImp = { X: sh.x - (Math.sign(sh.x) || 1) * .25, Y: Math.min(GH - .45, sh.y), t: s.T + .14 }; if (o === 'palo_dentro') { sfx && sfx.post(); s.postAt = s.T; } setTimeout(() => sfx && sfx.net(), 120); s.flash = { t: s.real, c: '255,240,170' }; s.shake = 6; s.shakeAt = s.real; }
    else if (o === 'parada' || o === 'blocaje') { sfx && sfx.glove(); s.flash = { t: s.real, c: '160,220,255' }; }
    else if (o === 'palo_fuera') { sfx && sfx.post(); s.postAt = s.T; s.shake = 5; s.shakeAt = s.real; }
    else sfx && sfx.ooh();
    if (!s.replay) buzz(crowdHappy ? 'good' : o === 'palo_fuera' ? 'heavy' : 'bad');
    s.hype = (o === 'gol' || o === 'palo_dentro') === (s.crowdFav ?? mine) ? 1 : .15;
    sfx && sfx.hush && sfx.hush(false);
    if (!s.replay) {
      const word = { gol: mine ? ['¡GOOOL!', 'gold'] : ['¡GOL!', 'bad'], palo_dentro: ['¡GOL!', mine ? 'gold' : 'bad'], parada: ['¡PARADA!', mine ? 'bad' : 'good'], blocaje: ['¡LA ATRAPA!', mine ? 'bad' : 'good'], palo_fuera: [sh.frame.bar ? '¡AL LARGUERO!' : '¡AL PALO!', 'mute'], fuera: ['¡FUERA!', 'mute'] }[o];
      const w = $u('tkword'); w.className = 'cn-word ' + word[1]; w.textContent = word[0]; void w.offsetWidth; w.classList.add('show');
      s.explain = (s.read && !mine ? 'Te lanzaste antes de tiempo: te ha leído · ' : '') + P.explain(sh, s.res, mine);
      const ln = $u('tkline'); ln.textContent = s.explain; ln.classList.toggle('low', !mine); ln.classList.add('on');
      opt.onEvent && opt.onEvent('impact', s);
    }
  }
  function finish(s) {
    if (s.phase === 'done') return; s.phase = 'done';
    const r = s.replay ? null : { goal: s.outcome === 'gol' || s.outcome === 'palo_dentro', kind: s.outcome, sh: s.sh, D: s.D, res: s.res, intent: s.intent, explain: s.explain, tight: !!s.tight, read: !!s.read, rhythm: s.rhythm, P: s.P, auto: !!s.auto, panenka: !!(s.sh && s.sh.panenka), curl: !!(s.sh && Math.abs(s.sh.s) > .3) };
    if (r) s.result = r;
    const done = s.done; s.done = null; if (done) done(r);
  }

  // ---------- API ----------
  function kick(o) {
    return new Promise((done) => {
      CAM.S.zc = CAM.S.zc0;
      $u('tkword').className = 'cn-word'; $u('tkline').classList.remove('on'); hint('');
      st = { mode: o.mode, shooter: o.shooter, keeper: o.keeper, sA: o.sA, kA: o.kA, P0: o.P0 ?? .4, P: o.P0 ?? .4, keeperHome: !!o.keeperHome, mem: o.mem || null, rng: o.rng || Math.random,
        tut: !!o.tutorial, bias: o.bias || 0, crowdFav: o.crowdFav, slow: P.K.slowBase - P.K.slowRefl * (o.mode === 'keep' ? o.kA.refl : 0),
        T: 0, real: 0, waitReal: 0, idleReal: 0, phase: 'pres', presLeft: o.present ? 1.5 : .2, ts: null, sh: null, D: null, res: null, kan: null, outcome: null, done };
      if (o.hud != null) $u('tkhud').innerHTML = o.hud;
      showHud(true);
      const pr = $u('tkpres'); if (o.present) { pr.innerHTML = o.present; pr.classList.add('on'); } else pr.classList.remove('on');
      ui.onpointerdown = () => { if (st && st.phase === 'pres') st.presLeft = Math.min(st.presLeft, .05); };
    });
  }
  // repetición lenta de un lanzamiento ajustado (mismo guion, sin azar)
  function replay() {
    const s0 = st; if (!s0 || !s0.sh || reduce) return Promise.resolve();
    return new Promise((done) => {
      $u('tkword').className = 'cn-word'; $u('tkline').classList.remove('on'); $u('tkrep').classList.add('on'); $u('tkskip').classList.add('on');
      st = { ...s0, T: s0.ts - .35, real: 0, phase: 'flight', replay: .38, netImp: null, postAt: null, flash: null, shake: 0, hype: 0, done: () => { $u('tkrep').classList.remove('on'); $u('tkskip').classList.remove('on'); st = s0; done(); } };
      if (st.mode === 'shoot') CAM.S.zc = CAM.S.zc0;
    });
  }
  function frame(now) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (st && !paused) {
      step(st, dt);
      if (st.mode === 'shoot' && st.sh && st.ts != null) { const tt = st.T - st.ts; CAM.S.zc = CAM.S.zc0 - (reduce ? 0 : 3.2 * smooth(tt / (st.sh.tb + .3))); } // la cámara empuja hacia la portería
    }
    try { draw(now); } catch (err) { console.error(err); }
  }
  raf = requestAnimationFrame(frame);
  function pause() { paused = true; }
  async function resume() {
    const el = $u('tkcd'); el.classList.add('on');
    for (const n of [3, 2, 1]) { el.textContent = n; await new Promise((r) => setTimeout(r, 650)); }
    el.classList.remove('on'); last = performance.now(); paused = false;
  }
  return {
    kick, replay, pause, resume, get paused() { return paused; },
    setHud(html) { $u('tkhud').innerHTML = html; showHud(true); }, hud: showHud, caption, hint,
    dispose() { dead = true; cancelAnimationFrame(raf); cv.remove(); ui.remove(); },
    // para las pruebas: dónde está el balón y cómo se apunta a un punto de la portería
    probe: () => ({ W, H, ball: ballS(), goalMidY: gMid(), kGoal: kGoal(), phase: st && st.phase, mode: st && st.mode, ts: st && st.ts, T: st && st.T, outcome: st && st.outcome, keepZoneY: H * .45 }),
  };
}

return { create, pathAt, cams, proj };
})();
