// @ts-nocheck — frame drawing is plain SVG string building, shared with the «Рамки карточек» preview
// Card frames for the Tree: the frame is drawn along the card's own edge (a little outside, mostly inside),
// and the card's content shrinks to fit the opening. A person without `frame` keeps the usual card.
// Some frames open with stickers from the Album. Frames from before October 2026 (round frames around the portrait) are gone:
// a person who still has one simply shows the usual card.
import { S } from './core'
import { LANG } from './i18n'

export type FrameLook = { id: string; color: string; size?: string }

const W = 152, H = 152;
const f = n => (Math.round(n * 10) / 10).toString();

// ---------- materials: four tones from shadow to highlight ----------
const MAT = {
  gold:   { n:'Золото',   c:['#5C3F12','#9C7426','#D8B45A','#FFF0B8'] },
  silver: { n:'Серебро',  c:['#3E424C','#8A8F9B','#CDD1D8','#FFFFFF'] },
  bronze: { n:'Бронза',   c:['#1C130B','#4A3420','#7C5A36','#C59A62'] },
  black:  { n:'Чёрный',   c:['#040406','#17171D','#34343E','#80808E'] },
  white:  { n:'Белый',    c:['#9E978A','#D8D3C8','#F2EFE8','#FFFFFF'] },
  oak:    { n:'Дуб',      c:['#4A2E16','#8A5A30','#C08C58','#EBC594'] },
  ultra:  { n:'Ультрамарин', c:['#070C5A','#1420B8','#3A47FF','#A8B0FF'] },
  walnut: { n:'Орех',     c:['#170D06','#3E2513','#64401F','#946645'] },
};
const hex = h => [1,3,5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('') };
function tone(m, t) { const c = MAT[m].c, P = [0, .4, .75, 1]; t = Math.max(0, Math.min(1, t));
  for (let i = 0; i < 3; i++) if (t <= P[i + 1]) return mix(c[i], c[i + 1], (t - P[i]) / (P[i + 1] - P[i])); return c[3] }

// ---------- a moulding: four mitred sides, each with the profile drawn across it, lit from the top left ----------
const SIDE = { t:.1, l:.05, r:-.1, b:-.18 };
function band(u, m, o, i, prof) {
  const x0 = -o, y0 = -o, x1 = W + o, y1 = H + o, a0 = i, b0 = i, a1 = W - i, b1 = H - i; // o: out past the card edge, i: in from it
  const g = (id, sx, sy, ex, ey, k) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f(sx)}" y1="${f(sy)}" x2="${f(ex)}" y2="${f(ey)}">${prof.map(([of, t]) => `<stop offset="${of}" stop-color="${tone(m, t + k)}"/>`).join('')}</linearGradient>`;
  const defs = g(u + 't', 0, y0, 0, b0, SIDE.t) + g(u + 'l', x0, 0, a0, 0, SIDE.l) + g(u + 'r', x1, 0, a1, 0, SIDE.r) + g(u + 'b', 0, y1, 0, b1, SIDE.b);
  const poly = (pts, id) => `<polygon points="${pts.map(p => p.map(f).join(',')).join(' ')}" fill="url(#${id})"/>`;
  const body = poly([[x0,y0],[x1,y0],[a1,b0],[a0,b0]], u + 't') + poly([[x1,y0],[x1,y1],[a1,b1],[a1,b0]], u + 'r') + poly([[x1,y1],[x0,y1],[a0,b1],[a1,b1]], u + 'b') + poly([[x0,y1],[x0,y0],[a0,b0],[a0,b1]], u + 'l')
    + `<rect x="${f(x0)}" y="${f(y0)}" width="${f(x1 - x0)}" height="${f(y1 - y0)}" fill="none" stroke="${tone(m, .02)}" stroke-opacity=".55" stroke-width=".8"/>`
    + `<rect x="${f(a0)}" y="${f(b0)}" width="${f(a1 - a0)}" height="${f(b1 - b0)}" fill="none" stroke="${tone(m, 0)}" stroke-opacity=".7" stroke-width="1"/>`;
  return { defs, body };
}
/** evenly spaced points along a rectangle d px inside the frame's outer edge, with the outward normal */
function ring(o, d, step) {
  const x0 = -o + d, y0 = -o + d, x1 = W + o - d, y1 = H + o - d, out = [];
  [[x0,y0,x1,y0,0,-1],[x1,y0,x1,y1,1,0],[x1,y1,x0,y1,0,1],[x0,y1,x0,y0,-1,0]].forEach(([ax,ay,bx,by,nx,ny]) => {
    const L = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.round(L / step));
    for (let k = 0; k < n; k++) out.push([ax + (bx - ax) * k / n, ay + (by - ay) * k / n, nx, ny]) });
  return out;
}
const ballGrad = (id, m) => `<radialGradient id="${id}" cx=".35" cy=".32" r=".75"><stop offset="0" stop-color="${tone(m, 1)}"/><stop offset=".45" stop-color="${tone(m, .7)}"/><stop offset="1" stop-color="${tone(m, .12)}"/></radialGradient>`;
const beads = (pts, r, id) => pts.map(([x, y]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="url(#${id})"/>`).join('');
/** the four corners: an ornament drawn for the top-left corner, mirrored to the others */
const corners = (svg, d) => [`translate(${-d},${-d})`, `translate(${W + d},${-d}) scale(-1,1)`, `translate(${-d},${H + d}) scale(1,-1)`, `translate(${W + d},${H + d}) scale(-1,-1)`].map(tr => `<g transform="${tr}">${svg}</g>`).join('');
const tops = (svg, d) => `<g transform="translate(${W / 2},${-d})">${svg}</g><g transform="translate(${W / 2},${H + d}) scale(1,-1)">${svg}</g>`;
const sides = (svg, d) => `<g transform="translate(${-d},${H / 2}) rotate(-90)">${svg}</g><g transform="translate(${W + d},${H / 2}) rotate(90)">${svg}</g>`;
/** a C-scroll with a dark underside, so it reads as carved */
const scroll = (d, m, w) => `<path d="${d}" fill="none" stroke="${tone(m, .05)}" stroke-width="${w + 1.8}" stroke-linecap="round" transform="translate(.8,1.1)" opacity=".75"/><path d="${d}" fill="none" stroke="${tone(m, .62)}" stroke-width="${w}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${tone(m, .95)}" stroke-width="${w * .35}" stroke-linecap="round" transform="translate(-.5,-.6)" opacity=".8"/>`;
const petal = (cx, cy, rx, ry, a, id) => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${rx}" ry="${ry}" transform="rotate(${f(a)} ${f(cx)} ${f(cy)})" fill="url(#${id})"/>`;
function shell(cx, cy, n, len, spread, base, id) { let s = ''; for (let k = 0; k < n; k++) { const a = base - spread / 2 + spread * k / (n - 1), r = a * Math.PI / 180; s += petal(cx + Math.cos(r) * len * .55, cy + Math.sin(r) * len * .55, len * .2, len * .5, a + 90, id) } return s }

const PROF_CLASSIC = [[0,.35],[.06,.95],[.14,.45],[.3,.2],[.5,.78],[.66,1],[.76,.45],[.86,.85],[.94,.4],[1,.12]];
const PROF_FLAT = [[0,.3],[.07,.9],[.15,.55],[.5,.8],[.82,.62],[.9,.95],[.96,.35],[1,.1]];
const PROF_SATIN = [[0,.28],[.08,.75],[.18,.42],[.6,.3],[.84,.22],[.9,.7],[1,.12]];
const PROF_ROD = [[0,.15],[.25,.75],[.45,1],[.65,.55],[1,.12]];

// ---------- the frames ----------
const ALL = [
  { id:'modern', n:'Современный', grp:'A', mood:'строгий', vars:['black','white','oak','ultra'],
    draw(u, m) { const o = 5, i = 11, B = band(u, m, o, i, PROF_SATIN); return { sc:.85, defs: B.defs, body: B.body + `<rect x="${i - 1.5}" y="${i - 1.5}" width="${W - 2 * i + 3}" height="${H - 2 * i + 3}" fill="none" stroke="${m === 'white' ? '#C9C3B6' : '#F4F2EC'}" stroke-width="2"/>` } } },
  { id:'ren', n:'Ренессанс', grp:'A', mood:'основательный', vars:['gold','silver','bronze'],
    draw(u, m) { const o = 6, B = band(u, m, o, 13, PROF_FLAT), bd = ballGrad(u + 'k', m);
      const eggs = ring(o, 11.5, 7).map(([x, y, nx]) => petal(x, y, 1.9, 3.1, nx ? 0 : 90, u + 'k')).join('');
      return { sc:.82, defs: B.defs + bd, body: B.body + beads(ring(o, 3.8, 4.6), 1.5, u + 'k') + eggs } } },
  { id:'baroque', n:'Барокко', grp:'A', mood:'пышный', ach:'Первое лицо', vars:['gold','silver','bronze'],
    draw(u, m) { const o = 6, B = band(u, m, o, 12, PROF_CLASSIC), k = u + 'k', bd = ballGrad(k, m);
      const corner = scroll('M8,-6 C18,-16 32,-12 33,-4 C34,1 29,3 26,0', m, 3) + scroll('M-6,8 C-16,18 -12,32 -4,33 C1,34 3,29 0,26', m, 3)
        + shell(-6, -6, 5, 20, 120, -135, k) + `<circle cx="-6" cy="-6" r="5.2" fill="url(#${k})"/>` + petal(44, -8, 2.4, 6, 90, k) + petal(-8, 44, 2.4, 6, 0, k);
      const mid = shell(0, 2, 5, 16, 140, -90, k) + `<circle cx="0" cy="2" r="4" fill="url(#${k})"/>` + scroll('M-8,0 C-14,-6 -22,-4 -24,2', m, 2.4) + scroll('M8,0 C14,-6 22,-4 24,2', m, 2.4);
      const side = petal(0, -6, 2.6, 7, 0, k) + `<circle cx="0" cy="0" r="3" fill="url(#${k})"/>`;
      return { sc:.83, defs: B.defs + bd, body: B.body + beads(ring(o, 4, 5), 1.4, k) + corners(corner, o - 8) + tops(mid, o - 4) + sides(side, o - 6) } } },
  { id:'rococo', n:'Рококо', grp:'A', mood:'изящный', ach:'Три колена', vars:['walnut','white','black'],
    draw(u, m) { const o = 5, i = 11, B = band(u, m, o, i, PROF_CLASSIC), k = u + 'k', bd = ballGrad(k, 'gold');
      const fil = `<rect x="${i - 1.5}" y="${i - 1.5}" width="${W - 2 * i + 3}" height="${H - 2 * i + 3}" fill="none" stroke="${tone('gold', .7)}" stroke-width="2.4"/><rect x="${-o + 2.5}" y="${-o + 2.5}" width="${W + 2 * o - 5}" height="${H + 2 * o - 5}" fill="none" stroke="${tone('gold', .55)}" stroke-width="1.2"/>`;
      const corner = scroll('M-2,12 C-16,6 -18,-10 -7,-17 C3,-22 15,-15 11,-7 C8,-2 2,-4 3,-8', 'gold', 2.6) + scroll('M14,-4 C24,-10 34,-6 36,0', 'gold', 2) + shell(-4, -4, 3, 13, 80, -135, k) + petal(-14, 22, 2, 5.5, 20, k);
      const mid = scroll('M-14,2 C-12,-8 -2,-10 0,-3 C2,-10 12,-8 14,2', 'gold', 2.2) + `<circle cx="0" cy="-1" r="3.2" fill="url(#${k})"/>`;
      return { sc:.85, defs: B.defs + bd, body: B.body + fil + corners(corner, o - 8) + tops(mid, o - 8) } } },
  { id:'empire', n:'Ампир', grp:'A', mood:'торжественный', ach:'Пятнадцать', vars:['gold','black','white'],
    draw(u, m) { const o = 6, B = band(u, m, o, 12, PROF_CLASSIC), g = 'gold', k = u + 'k', bd = ballGrad(k, g), bl = u + 'q';
      const blk = `<linearGradient id="${bl}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${tone(m, .85)}"/><stop offset="1" stop-color="${tone(m, .2)}"/></linearGradient>`;
      let ros = ''; for (let a = 0; a < 360; a += 45) { const r = a * Math.PI / 180; ros += petal(Math.cos(r) * 5.2, Math.sin(r) * 5.2, 2, 4.4, a + 90, k) }
      const corner = `<rect x="-11.5" y="-11.5" width="23" height="23" fill="url(#${bl})" stroke="${tone(m, .05)}" stroke-width=".8"/>` + ros + `<circle r="2.8" fill="url(#${k})"/>`;
      const palm = shell(0, 0, 7, 22, 110, -90, k) + `<circle cx="0" cy="0" r="3.4" fill="url(#${k})"/>`;
      return { sc:.83, defs: B.defs + bd + blk, body: B.body + beads(ring(o, 12.6, 5), 1.2, k) + corners(corner, o - 7.5) + tops(palm, o - 4) } } },
  { id:'deco', n:'Ар-деко', grp:'A', mood:'элегантный', ach:'Первый переезд', vars:['black','ultra','white'],
    draw(u, m) { const o = 5, i = 11, B = band(u, m, o, i, PROF_SATIN), G = tone('gold', .78), Gd = tone('gold', .45), k = u + 'k', bd = ballGrad(k, 'gold');
      const rect = (d, w, c) => `<rect x="${f(-o + d)}" y="${f(-o + d)}" width="${f(W + 2 * (o - d))}" height="${f(H + 2 * (o - d))}" fill="none" stroke="${c}" stroke-width="${w}"/>`;
      // gold lines along the band: the outer edge, a hairline in the middle, the opening
      const lines = rect(1.4, 1.6, G) + rect((o + i) / 2, .8, Gd) + `<rect x="${i - 1}" y="${i - 1}" width="${W - 2 * i + 2}" height="${H - 2 * i + 2}" fill="none" stroke="${G}" stroke-width="1.8"/>`;
      // stepped corners: two gold stairs and a diamond at the very corner
      const corner = `<path d="M-1,30 V-1 H30" fill="none" stroke="${G}" stroke-width="1.6"/><path d="M-5,20 V8 H-1 M8,-5 H20 M-5,8 H-9 V-9 H8 V-5" fill="none" stroke="${G}" stroke-width="1.3"/>`
        + `<rect x="-14.5" y="-14.5" width="7" height="7" transform="rotate(45 -11 -11)" fill="url(#${k})"/>`;
      // a sunburst over the top edge, a small one under the bottom
      let rays = ''; for (let a = 196; a <= 344; a += 12) { const r = a * Math.PI / 180, l = a % 24 === 4 ? 17 : 12; rays += `<path d="M${f(Math.cos(r) * 6)},${f(Math.sin(r) * 6)} L${f(Math.cos(r) * l)},${f(Math.sin(r) * l)}" stroke="${G}" stroke-width="1.4" stroke-linecap="round"/>` }
      const sun = rays + `<path d="M-6,0 A6,6 0 0 1 6,0 Z" fill="url(#${k})"/>`;
      const bars = [-4, 0, 4].map(y => `<path d="M${f(-o + 2)},${y} H${f(i - 2)}" stroke="${G}" stroke-width="1.2"/>`).join('');
      const sideBars = `<g transform="translate(0,${H / 2})">${bars}</g><g transform="translate(${W},${H / 2}) scale(-1,1)">${bars}</g>`;
      return { sc:.85, defs: B.defs + bd, body: B.body + lines + corners(corner, -i + 1) + `<g transform="translate(${W / 2},${-o + 1})">${sun}</g><g transform="translate(${W / 2},${H + o - 1}) scale(.7,-.7)">${sun}</g>` + sideBars } } },
  { id:'bricks', n:'Конструктор', grp:'B', mood:'весёлый', ach:'Галерея', vars:['multi','red','yellow','white'],
    draw(u, m) { const e = 3, o = (W + 2 * e) / 12, P = { red:'#D3201B', yellow:'#F2C230', blue:'#1F5FD0', green:'#2E9447', white:'#F3F1EA', orange:'#F28A1E' };
      const pal = m === 'multi' ? ['red','yellow','blue','green','orange','blue','red','green','yellow','blue','red','yellow','green','orange'] : null;
      let s = '', idx = 0;
      const plate = (x, y, len, horiz) => { const c = P[pal ? pal[idx++ % pal.length] : m] , cw = horiz ? len * o : o, ch = horiz ? o : len * o;
        s += `<rect x="${f(x + .4)}" y="${f(y + .4)}" width="${f(cw - .8)}" height="${f(ch - .8)}" rx="1.6" fill="${c}" stroke="${mix(c, '#000000', .35)}" stroke-width=".8"/>`
          + `<rect x="${f(x + 1.4)}" y="${f(y + 1.4)}" width="${f(cw - 2.8)}" height="${f(ch - 2.8)}" rx="1" fill="none" stroke="${mix(c, '#FFFFFF', .35)}" stroke-width=".7" opacity=".7"/>`;
        for (let k = 0; k < len; k++) { const cx = x + (horiz ? (k + .5) * o : o / 2), cy = y + (horiz ? o / 2 : (k + .5) * o);
          s += `<circle cx="${f(cx + .7)}" cy="${f(cy + 1)}" r="${f(o * .31)}" fill="${mix(c, '#000000', .3)}"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(o * .31)}" fill="${mix(c, '#FFFFFF', .12)}" stroke="${mix(c, '#000000', .18)}" stroke-width=".6"/><path d="M${f(cx - o * .2)},${f(cy - o * .05)} a${f(o * .22)},${f(o * .22)} 0 0 1 ${f(o * .25)},${f(-o * .17)}" fill="none" stroke="#FFFFFF" stroke-opacity=".75" stroke-width="1.1" stroke-linecap="round"/>` } };
      let x = -e; [4,2,3,3].forEach(n => { plate(x, -e, n, true); x += n * o });
      x = -e; [3,4,2,3].forEach(n => { plate(x, H + e - o, n, true); x += n * o });
      let y = -e + o; [3,2,3,2].forEach(n => { plate(-e, y, n, false); y += n * o });
      y = -e + o; [2,4,2,2].forEach(n => { plate(W + e - o, y, n, false); y += n * o });
      return { sc:.84, defs:'', body:s } } },
  { id:'clouds', n:'Облака', grp:'B', mood:'светлая память', vars:['dusk'],
    draw(u, m) { const C = ['#E4E7F6','#C4CAE7','rgba(15,20,70,.5)'];
      let seed = 11; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
      // two paper-cut layers of clouds over the top edge and two under the bottom one; the sides stay open
      const row = (y, x0, x1, step, r0, r1, fill) => { let c = ''; for (let x = x0; x <= x1 + .1; x += step) { const r = r0 + rnd() * (r1 - r0); c += `<circle cx="${f(x + (rnd() - .5) * 3)}" cy="${f(y + (rnd() - .5) * 2)}" r="${f(r)}" fill="${fill}"/>` } return c };
      const flt = `<filter id="${u}f" x="-15%" y="-40%" width="130%" height="180%"><feDropShadow dx="0" dy="2" stdDeviation="1.8" flood-color="${C[2]}" flood-opacity="1"/></filter>`;
      const layer = c => `<g filter="url(#${u}f)">${c}</g>`;
      const top = layer(row(-6, -6, W + 6, 13, 9, 14, C[1])) + layer(row(2, -2, W + 2, 11, 6.5, 10.5, C[0]));
      const bot = layer(row(H + 6, -6, W + 6, 13, 9, 14, C[1])) + layer(row(H - 2, -2, W + 2, 11, 6.5, 10.5, C[0]));
      return { sc:.82, rx:10, defs: flt, body: top + bot } } },
];
const VARC = { multi:'conic-gradient(#D3201B 0 25%,#F2C230 0 50%,#1F5FD0 0 75%,#2E9447 0)', red:'#D3201B', yellow:'#F2C230', day:'#FFFFFF', dawn:'#FFE3D6', dusk:'#AEB6E2' };
const swatch = v => VARC[v] && v !== 'white' ? VARC[v] : MAT[v] ? `linear-gradient(135deg,${MAT[v].c[3]},${MAT[v].c[2]} 45%,${MAT[v].c[1]})` : '#F3F1EA';



// the frames in the app, in the order of the frame shelf
const READY = ['modern', 'ren', 'baroque', 'rococo', 'empire', 'deco', 'bricks', 'clouds']
const META = {
  modern:  { en:'Modern', mood:['строгий','strict'] },
  ren:     { en:'Renaissance', mood:['основательный','steady'] },
  baroque: { en:'Baroque', mood:['пышный','lavish'], ach:'c_face', achT:['Первое лицо','First face'] },
  rococo:  { en:'Rococo', mood:['изящный','graceful'], ach:'k_gen3', achT:['Три колена','Three generations'] },
  empire:  { en:'Empire', mood:['торжественный','solemn'], ach:'k_15', achT:['Пятнадцать','Fifteen'] },
  deco:    { en:'Art Deco', mood:['элегантный','elegant'], ach:'r_move', achT:['Первый переезд','First move'] },
  bricks:  { en:'Bricks', mood:['весёлый','cheerful'], ach:'c_gallery', achT:['Галерея','Gallery'] },
  clouds:  { en:'Clouds', mood:['светлая память','in loving memory'] },
}
export const FR = READY.map(id => ({ ...ALL.find(F => F.id === id), ...META[id], ru: ALL.find(F => F.id === id).n }))
export const FBY = Object.fromEntries(FR.map(F => [F.id, F]))
const L = () => (LANG === 'en' ? 1 : 0)
export const frameName = F => (L() ? F.en : F.ru)
export const frameMood = F => F.mood[L()]
export const frameAchName = F => (F.achT ? F.achT[L()] : '')
export const isOpen = F => !F.ach || (S.achievements || []).includes(F.ach)
const VN = { multi:['Разноцветный','Multicolour'], red:['Красный','Red'], yellow:['Жёлтый','Yellow'], day:['Белые','White'], dawn:['Рассвет','Dawn'], dusk:['Сумерки','Dusk'],
  gold:['Золото','Gold'], silver:['Серебро','Silver'], bronze:['Бронза','Bronze'], black:['Чёрный','Black'], white:['Белый','White'], oak:['Дуб','Oak'], ultra:['Ультрамарин','Ultramarine'], walnut:['Орех','Walnut'] }
export const colorName = v => (VN[v] ? VN[v][L()] : v)
export const swatchCss = swatch
/** the person's frame if it is one of today's frames, with a colour it really has; otherwise null (the usual card) */
export function frameOf(p) {
  const fr = p && p.frame, F = fr && FBY[fr.id]; if (!F) return null
  return { id: F.id, color: F.vars.includes(fr.color) ? fr.color : F.vars[0] }
}
/** the frame for one card: defs, the drawing over the card, how much the content shrinks, the card's corner radius */
export function frameArt(look, u) {
  const F = FBY[look.id], D = F.draw(u, look.color)
  return { defs: D.defs || '', body: D.body, sc: D.sc || .85, rx: D.rx == null ? 2 : D.rx }
}
const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' })[c])
/** a small card in its frame for the frame shelf and the phone preview; draw it in viewBox "-32 -34 216 222" */
export function miniCard(look, u, d) {
  const A = look ? frameArt(look, u) : null, light = !!d.light
  const fill = light ? '#FFFFFF' : '#0E1650', stroke = light ? 'rgba(11,19,82,.62)' : 'rgba(244,242,236,.82)', ink = light ? '#0B1352' : '#F4F2EC', dim = light ? 'rgba(11,19,82,.55)' : 'rgba(244,242,236,.56)'
  const nm = (t, y) => `<text x="${W / 2}" y="${y}" text-anchor="middle" font-family="'Sofia Sans Extra Condensed','Arial Narrow',sans-serif" font-weight="800" font-size="19" letter-spacing=".6" fill="${ink}">${esc(String(t || '').toUpperCase().slice(0, 14))}</text>`
  const inner = `<clipPath id="${u}av"><circle cx="${W / 2}" cy="58" r="30"/></clipPath><circle cx="${W / 2}" cy="58" r="30" fill="#2533FF"/>`
    + (d.src ? `<image href="${esc(d.src)}" x="${W / 2 - 30}" y="28" width="60" height="60" clip-path="url(#${u}av)" preserveAspectRatio="xMidYMid slice"/>` : '')
    + nm(d.first, 112) + nm(d.last, 130) + (d.years ? `<text x="${W / 2}" y="146" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="11" fill="${dim}">${esc(d.years)}</text>` : '')
  const sc = A ? A.sc : 1
  return (A ? `<defs>${A.defs}</defs>` : '') + `<rect width="${W}" height="${H}" rx="${A ? A.rx : 10}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`
    + `<g transform="translate(${W / 2} ${H / 2}) scale(${sc}) translate(${-W / 2} ${-H / 2})">${inner}</g>` + (A ? A.body : '')
}
