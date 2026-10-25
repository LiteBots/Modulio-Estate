// Ilustracje SVG generowane po stronie serwera: zastępcze "zdjęcia" ogłoszeń bez fotografii,
// tło hero (wybrzeże) oraz mozaika z trójkątów w stylu logo ModulioEstate.

function rng(seed) {
  let s = seed | 0 || 1;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NAVY = '#18325a', TEAL = '#37908f', ORANGE = '#e9733b', YELLOW = '#f4a942';

const PAL = {
  dawn: { sky: ['#fde6cf', '#f5b98f'], hill: '#e4a07d', ground: '#cbd9bd', wall: '#fbf7f0', glass: '#8fbccc', accent: YELLOW, roof: '#b85a32' },
  day: { sky: ['#dff0f2', '#a3d3d6'], hill: '#7fb8b4', ground: '#bad6a6', wall: '#ffffff', glass: '#7fb3c4', accent: YELLOW, roof: NAVY },
  dusk: { sky: ['#f8c196', '#7b5a7a'], hill: '#5a4a6d', ground: '#5d6f59', wall: '#efe3d4', glass: '#5a6f93', accent: '#ffcf6a', roof: '#3d2f45' },
  teal: { sky: ['#e3f1ef', '#9fd0cb'], hill: '#6aaba5', ground: '#a8cf98', wall: '#ffffff', glass: '#6fa8b8', accent: ORANGE, roof: TEAL },
  night: { sky: ['#2c4772', '#14223f'], hill: '#203458', ground: '#24362f', wall: '#d9dee8', glass: '#3a4f78', accent: '#ffd36b', roof: '#121c33' }
};
const PAL_KEYS = Object.keys(PAL);

function win(x, y, w, h, p, r, lit) {
  const on = r() < lit;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="${on ? p.accent : p.glass}" opacity="${on ? 0.95 : 0.8}"/>`;
}
function tree(x, y, s, r) {
  const c = r() < 0.5 ? '#3f7a62' : '#5e9a6c';
  return `<rect x="${x - 2 * s}" y="${y - 14 * s}" width="${4 * s}" height="${14 * s}" fill="#6b4e3d"/><circle cx="${x}" cy="${y - 22 * s}" r="${13 * s}" fill="${c}"/><circle cx="${x - 7 * s}" cy="${y - 16 * s}" r="${8 * s}" fill="${c}"/><circle cx="${x + 8 * s}" cy="${y - 17 * s}" r="${9 * s}" fill="${c}"/>`;
}

function building(kind, p, r, night) {
  let s = '';
  const lit = night ? 0.55 : 0.18;
  if (kind === 'block') {
    s += `<rect x="52" y="112" width="82" height="134" fill="${p.wall}" opacity=".78"/>`;
    for (let yy = 124; yy < 236; yy += 18) for (let xx = 62; xx < 126; xx += 20) s += win(xx, yy, 12, 10, p, r, lit);
    s += `<rect x="140" y="48" width="140" height="198" fill="${p.wall}"/><rect x="140" y="44" width="140" height="8" fill="${p.roof}"/>`;
    for (let yy = 62; yy < 232; yy += 19) {
      for (let xx = 152; xx < 270; xx += 24) s += win(xx, yy, 16, 12, p, r, lit);
      s += `<rect x="146" y="${yy + 13}" width="128" height="2" fill="${p.roof}" opacity=".25"/>`;
    }
    s += `<rect x="198" y="222" width="24" height="24" fill="${p.roof}" opacity=".85"/>`;
  } else if (kind === 'house') {
    s += `<rect x="128" y="150" width="160" height="96" fill="${p.wall}"/><polygon points="116,154 208,92 300,154" fill="${p.roof}"/><rect x="250" y="102" width="16" height="34" fill="${p.roof}"/>`;
    s += win(146, 172, 34, 28, p, r, lit) + win(236, 172, 34, 28, p, r, lit) + `<rect x="194" y="186" width="28" height="60" rx="2" fill="${p.roof}" opacity=".85"/>` + win(196, 116, 24, 20, p, r, lit);
    for (let x = 60; x < 350; x += 12) s += `<rect x="${x}" y="232" width="4" height="16" fill="#fff" opacity=".7"/>`;
    s += `<rect x="60" y="238" width="290" height="3" fill="#fff" opacity=".7"/>`;
  } else if (kind === 'villa') {
    s += `<rect x="70" y="168" width="250" height="78" fill="${p.wall}"/><rect x="150" y="116" width="180" height="56" fill="${p.wall}"/>`;
    s += `<rect x="146" y="112" width="188" height="6" fill="${p.roof}"/><rect x="66" y="164" width="88" height="6" fill="${p.roof}"/>`;
    s += `<rect x="170" y="126" width="140" height="36" fill="${p.glass}" opacity=".85"/><rect x="88" y="182" width="120" height="56" fill="${p.glass}" opacity=".85"/>`;
    for (let x = 198; x < 310; x += 28) s += `<rect x="${x}" y="126" width="2" height="36" fill="${p.wall}"/>`;
    for (let x = 118; x < 208; x += 30) s += `<rect x="${x}" y="182" width="2" height="56" fill="${p.wall}"/>`;
    s += `<rect x="226" y="182" width="78" height="56" fill="#cdb79c"/>`;
  } else if (kind === 'office') {
    s += `<rect x="146" y="24" width="104" height="222" fill="${p.glass}"/><rect x="254" y="86" width="76" height="160" fill="${p.glass}" opacity=".75"/><rect x="74" y="120" width="68" height="126" fill="${p.wall}" opacity=".85"/>`;
    for (let x = 158; x < 250; x += 13) s += `<rect x="${x}" y="24" width="1.5" height="222" fill="${p.wall}" opacity=".6"/>`;
    for (let y = 36; y < 246; y += 14) s += `<rect x="146" y="${y}" width="104" height="1.5" fill="${p.wall}" opacity=".5"/>`;
    for (let y = 98; y < 246; y += 16) for (let x = 262; x < 326; x += 16) s += win(x, y, 10, 9, p, r, lit);
    for (let y = 134; y < 240; y += 18) for (let x = 84; x < 136; x += 18) s += win(x, y, 10, 10, p, r, lit);
    s += `<polygon points="146,24 196,24 146,110" fill="#fff" opacity=".22"/>`;
  } else if (kind === 'plot') {
    for (let i = 0; i < 7; i++) s += `<path d="M0 ${232 + i * 10} L400 ${226 + i * 11}" stroke="${i % 2 ? '#9bbf86' : '#b9d6a1'}" stroke-width="10"/>`;
    for (let x = 30; x < 380; x += 26) s += tree(x, 214, 0.45 + r() * 0.25, r);
    [[110, 260], [300, 256], [200, 280]].forEach(([x, y]) => {
      s += `<rect x="${x}" y="${y - 26}" width="3" height="26" fill="#6b4e3d"/><polygon points="${x + 3},${y - 26} ${x + 18},${y - 21} ${x + 3},${y - 16}" fill="${ORANGE}"/>`;
    });
  } else if (kind === 'loft') {
    s += `<rect x="84" y="96" width="232" height="150" fill="#a8573f"/><rect x="270" y="34" width="22" height="66" fill="#8f4734"/><rect x="80" y="90" width="240" height="8" fill="#6d3626"/>`;
    for (let y = 112; y < 230; y += 44)
      for (let x = 100; x < 300; x += 40) {
        const on = r() < lit;
        s += `<rect x="${x}" y="${y + 8}" width="24" height="26" fill="${on ? p.accent : p.glass}"/><circle cx="${x + 12}" cy="${y + 8}" r="12" fill="${on ? p.accent : p.glass}"/><rect x="${x + 11}" y="${y - 4}" width="2" height="38" fill="#a8573f"/>`;
      }
  } else if (kind === 'warehouse' || kind === 'garage') {
    const w = kind === 'garage' ? 200 : 320, x0 = kind === 'garage' ? 100 : 40;
    s += `<rect x="${x0}" y="164" width="${w}" height="82" fill="#cfd6d9"/>`;
    for (let x = x0; x < x0 + w; x += 40) s += `<polygon points="${x},164 ${x + 40},164 ${x + 40},138" fill="#aab6bb"/><rect x="${x + 30}" y="140" width="10" height="24" fill="${p.glass}" opacity=".8"/>`;
    for (let x = x0 + 20; x < x0 + w - 40; x += 56) {
      s += `<rect x="${x}" y="196" width="40" height="50" fill="#8e9ba1"/>`;
      for (let y = 200; y < 246; y += 5) s += `<rect x="${x}" y="${y}" width="40" height="1" fill="#fff" opacity=".3"/>`;
    }
    s += `<rect x="${x0 + 20}" y="176" width="${w - 40}" height="6" fill="${ORANGE}" opacity=".85"/>`;
  } else if (kind === 'sea') {
    s += `<rect y="196" width="400" height="104" fill="#5fa9c4"/>`;
    for (let i = 0; i < 9; i++) s += `<path d="M${r() * 360} ${206 + i * 10} q 10 -4 20 0 t 20 0" stroke="#fff" stroke-width="1.6" fill="none" opacity=".55"/>`;
    s += `<path d="M0 262 Q 120 244 260 258 T 400 250 V300 H0Z" fill="#ecd9b4"/>`;
    s += `<rect x="190" y="110" width="150" height="150" fill="${p.wall}"/><rect x="186" y="104" width="158" height="8" fill="${p.roof}"/>`;
    for (let y = 122; y < 246; y += 22) {
      for (let x = 200; x < 330; x += 26) s += win(x, y, 18, 14, p, r, lit);
      s += `<rect x="194" y="${y + 16}" width="142" height="3" fill="${p.roof}" opacity=".35"/>`;
    }
    s += `<polygon points="60,196 70,160 80,196" fill="#fff"/><rect x="68" y="196" width="4" height="8" fill="#8a4b3b"/>`;
  }
  return s;
}

const cache = new Map();
function scene(kind = 'block', palName, seed = 1) {
  const pal = palName || PAL_KEYS[Math.abs(seed) % PAL_KEYS.length];
  const key = `${kind}|${pal}|${seed}`;
  if (cache.has(key)) return cache.get(key);
  const p = PAL[pal] || PAL.day;
  const r = rng(seed);
  const night = pal === 'night' || pal === 'dusk';
  const id = `sg${seed}${kind}${pal}`;
  let s = `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="scene-svg"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky[0]}"/><stop offset="1" stop-color="${p.sky[1]}"/></linearGradient></defs><rect width="400" height="300" fill="url(#${id})"/>`;
  s += `<circle cx="${50 + r() * 300}" cy="${44 + r() * 36}" r="${16 + r() * 14}" fill="${p.accent}" opacity="${pal === 'night' ? 0.9 : 0.75}"/>`;
  if (pal === 'night') for (let i = 0; i < 30; i++) s += `<circle cx="${(r() * 400).toFixed(1)}" cy="${(r() * 140).toFixed(1)}" r="${(r() * 1.3 + 0.3).toFixed(2)}" fill="#fff" opacity="${(0.4 + r() * 0.5).toFixed(2)}"/>`;
  else
    for (let i = 0; i < 3; i++) {
      const cx = r() * 400, cy = 30 + r() * 70;
      s += `<g fill="#fff" opacity=".6"><ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(26 + r() * 18).toFixed(1)}" ry="8"/><ellipse cx="${(cx + 14).toFixed(1)}" cy="${(cy - 6).toFixed(1)}" rx="16" ry="9"/></g>`;
    }
  s += `<path d="M0 ${(196 + r() * 20).toFixed(1)} Q 100 ${(150 + r() * 30).toFixed(1)} 200 186 T 400 ${(176 + r() * 20).toFixed(1)} V300 H0Z" fill="${p.hill}" opacity=".75"/>`;
  s += `<rect y="244" width="400" height="56" fill="${p.ground}"/>`;
  s += building(kind, p, r, night);
  if (kind !== 'plot' && kind !== 'sea') {
    s += tree(34, 250, 1, r) + tree(370, 250, 0.9, r);
    if (r() < 0.6) s += tree(326, 252, 0.7, r);
  }
  s += '</svg>';
  cache.set(key, s);
  return s;
}

// Tło hero: wybrzeże z latarnią, molo i panoramą miasta.
let heroCache = null;
function heroCoast() {
  if (heroCache) return heroCache;
  const r = rng(2026);
  const W = 1600, H = 720;
  let s = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="scene-svg"><defs>
<linearGradient id="hsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f2547"/><stop offset=".42" stop-color="#2d5f7a"/><stop offset=".72" stop-color="#e48b5a"/><stop offset="1" stop-color="#f6c48a"/></linearGradient>
<linearGradient id="hsea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f7f86"/><stop offset="1" stop-color="#12304f"/></linearGradient>
<radialGradient id="hsun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffe2a8"/><stop offset="1" stop-color="#ffe2a8" stop-opacity="0"/></radialGradient></defs>
<rect width="${W}" height="${H}" fill="url(#hsky)"/><circle cx="1140" cy="500" r="300" fill="url(#hsun)" opacity=".85"/><circle cx="1140" cy="512" r="74" fill="#ffd796"/>`;
  for (let i = 0; i < 70; i++) s += `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * 250).toFixed(0)}" r="${(r() * 1.4 + 0.4).toFixed(2)}" fill="#fff" opacity="${(0.2 + r() * 0.5).toFixed(2)}"/>`;
  // miasto (warstwy)
  const layer = (x0, x1, base, minH, maxH, col, lit, op) => {
    let x = x0, out = '';
    while (x < x1) {
      const w = 40 + r() * 90, h = minH + r() * (maxH - minH), y = base - h;
      out += `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(0)}" height="${(h + 4).toFixed(0)}" fill="${col}"/>`;
      if (r() < 0.2) out += `<rect x="${(x + w / 2 - 2).toFixed(0)}" y="${(y - 26).toFixed(0)}" width="4" height="26" fill="${col}"/>`;
      for (let yy = y + 12; yy < base - 8; yy += 16) for (let xx = x + 8; xx < x + w - 10; xx += 14) if (r() < lit) out += `<rect x="${xx.toFixed(0)}" y="${yy.toFixed(0)}" width="6" height="8" fill="#ffd27a" opacity="${(op * (0.5 + r() * 0.5)).toFixed(2)}"/>`;
      x += w + r() * 6;
    }
    return out;
  };
  s += layer(-20, 900, 560, 120, 300, '#21456a', 0.12, 0.6);
  s += layer(-20, 760, 590, 70, 220, '#16304f', 0.22, 0.9);
  // morze
  s += `<rect y="560" width="${W}" height="${H - 560}" fill="url(#hsea)"/>`;
  s += `<rect x="1030" y="560" width="220" height="160" fill="#ffd796" opacity=".25"/>`;
  for (let i = 0; i < 40; i++) {
    const y = 575 + r() * 140, x = r() * W;
    s += `<path d="M${x.toFixed(0)} ${y.toFixed(0)} h ${(20 + r() * 50).toFixed(0)}" stroke="#ffe2b0" stroke-width="2" opacity="${(0.15 + r() * 0.35).toFixed(2)}"/>`;
  }
  // nabrzeże z miastem na pierwszym planie
  s += `<path d="M-10 620 L 640 600 L 700 620 L 700 720 L -10 720Z" fill="#0d1d33"/>`;
  s += layer(-20, 620, 620, 40, 140, '#0d1d33', 0.3, 1);
  // molo
  s += `<rect x="760" y="602" width="420" height="7" fill="#0d1d33"/>`;
  for (let x = 770; x < 1180; x += 24) s += `<rect x="${x}" y="606" width="4" height="40" fill="#0d1d33"/>`;
  s += `<rect x="1150" y="584" width="40" height="20" fill="#0d1d33"/>`;
  // latarnia
  s += `<polygon points="1380,640 1396,470 1420,470 1436,640" fill="#f7f6f2"/><rect x="1387" y="520" width="42" height="18" fill="${ORANGE}"/><rect x="1384" y="580" width="48" height="18" fill="${ORANGE}"/>`;
  s += `<rect x="1392" y="446" width="32" height="24" fill="#0d1d33"/><rect x="1398" y="452" width="20" height="14" fill="#ffd27a"/><polygon points="1388,446 1408,430 1428,446" fill="#0d1d33"/>`;
  s += `<polygon points="1408,458 1600,410 1600,500" fill="#ffd27a" opacity=".18"/>`;
  s += `<path d="M1300 650 Q 1420 630 1600 640 V720 H1300Z" fill="#0d1d33"/>`;
  // mewy
  for (let i = 0; i < 5; i++) {
    const x = 700 + r() * 600, y = 180 + r() * 160;
    s += `<path d="M${x.toFixed(0)} ${y.toFixed(0)} q 8 -8 16 0 q 8 -8 16 0" stroke="#0d1d33" stroke-width="2.5" fill="none" opacity=".55"/>`;
  }
  s += '</svg>';
  heroCache = s;
  return s;
}

// Mozaika z trójkątów w kolorach logo
function mosaic(cols = 6, rows = 4, seed = 7, opts = {}) {
  const r = rng(seed);
  const colors = opts.colors || [NAVY, TEAL, ORANGE, YELLOW, '#1f6f78', '#2a4c7a'];
  const size = 40;
  let s = `<svg viewBox="0 0 ${cols * size} ${rows * size}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" preserveAspectRatio="xMidYMid slice" class="scene-svg">`;
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const X = x * size, Y = y * size;
      const c1 = colors[Math.floor(r() * colors.length)], c2 = colors[Math.floor(r() * colors.length)];
      const skip = opts.sparse && r() < opts.sparse;
      if (skip) continue;
      if (r() < 0.5) {
        s += `<polygon points="${X},${Y} ${X + size},${Y} ${X},${Y + size}" fill="${c1}"/><polygon points="${X + size},${Y} ${X + size},${Y + size} ${X},${Y + size}" fill="${c2}"/>`;
      } else {
        s += `<polygon points="${X},${Y} ${X + size},${Y + size} ${X},${Y + size}" fill="${c1}"/><polygon points="${X},${Y} ${X + size},${Y} ${X + size},${Y + size}" fill="${c2}"/>`;
      }
    }
  return s + '</svg>';
}

function sceneFor(listing) {
  const { TYPE_BY_KEY } = require('../config/property');
  const t = TYPE_BY_KEY[listing.type];
  let kind = t ? t.scene : 'block';
  if (listing.type === 'mieszkanie' && (listing.features || []).includes('widok_na_morze')) kind = 'sea';
  if (listing.type === 'dom' && listing.price > 2500000) kind = 'villa';
  const seed = Number(listing.num || 1);
  return scene(kind, null, seed);
}

module.exports = { scene, sceneFor, heroCoast, mosaic, rng };
