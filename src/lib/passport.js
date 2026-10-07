// @ts-nocheck — canvas drawing ported from the «Паспорт семьи» prototype
// «Паспорт семьи»: a shareable card built from the family data (stories 9:16 or post 4:5).
import { S, LANG, byId, parentsOf, fullName, yearOf, generations } from './core'
import { WORLD, findCity, countryAt } from './world'
import { familyTitle } from './treeStyle'
import { Progress } from './progress'
import { predkiLogo } from './logo'

export const SIZE = { story: [1080, 1920], post: [1080, 1350] }
export const DW = 1000, DH = 1480
const F = { d: '"Onest",system-ui,-apple-system,"Segoe UI",sans-serif', m: '"JetBrains Mono",ui-monospace,Menlo,monospace' }
let WORLD_P = null
let logoImg = null
export function logoReady(cb) {
  if (!logoImg) { logoImg = new Image(); const svg = predkiLogo().replace('width="100%" height="100%"', 'width="1024" height="1024"'); logoImg.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg))) }
  if (logoImg.complete && logoImg.naturalWidth) cb(); else logoImg.addEventListener('load', cb, { once: true })
}

const TX = {
  ru: { title: 'ПАСПОРТ СЕМЬИ', sub: 'РОДОСЛОВНАЯ • FAMILY PASSPORT • FAMILIENPASS', side: 'PREDKI · ПАСПОРТ СЕМЬИ', tag: 'конструктор семейного древа и карта миграций', post: 'Конструктор семейного древа',
    people: ['человек', 'человека', 'человек'], fam: 'Род', keeper: 'Хранитель', place: 'Место выдачи', since: 'В Predki с', gens: 'Поколений', years: 'Лет истории', cities: 'Городов', countries: 'Стран',
    you: 'ХРАНИТЕЛЬ РОДА', mrzFam: 'РОД', mrzP: 'ЧЕЛ', mrzG: 'ПОК', mrzS: 'С', noFam: 'Без названия' },
  en: { title: 'FAMILY PASSPORT', sub: 'FAMILY RECORD • ПАСПОРТ СЕМЬИ • FAMILIENPASS', side: 'PREDKI · FAMILY PASSPORT', tag: 'family tree builder and a map of your family’s moves', post: 'Family tree builder',
    people: ['person', 'people', 'people'], fam: 'Family', keeper: 'Keeper', place: 'Place of issue', since: 'In Predki since', gens: 'Generations', years: 'Years of history', cities: 'Cities', countries: 'Countries',
    you: 'FAMILY KEEPER', mrzFam: 'FAMILY', mrzP: 'PPL', mrzG: 'GEN', mrzS: 'S', noFam: 'Untitled' }
}
const tx = () => TX[LANG === 'en' ? 'en' : 'ru']
const plural = (n, f) => { if (LANG === 'en') return n === 1 ? f[0] : f[1]; const a = n % 10, b = n % 100; return f[(a === 1 && b !== 11) ? 0 : (a >= 2 && a <= 4 && (b < 12 || b > 14)) ? 1 : 2] }

// ---------- flags (simplified, drawn inside a circle) ----------
export const FLAGS = {
  RU: { h: ['#FFFFFF', '#1C57A5', '#D52B1E'] }, UA: { h: ['#0057B7', '#FFD700'] }, BY: { h: ['#C8313E', '#C8313E', '#4AA657'] }, LV: { h: ['#9E3039', '#9E3039', '#FFFFFF', '#9E3039', '#9E3039'] },
  LT: { h: ['#FDB913', '#006A44', '#C1272D'] }, EE: { h: ['#0072CE', '#111111', '#FFFFFF'] }, MD: { v: ['#0046AE', '#FFD200', '#CC092F'] }, GE: { bg: '#FFFFFF', cross: '#E8112D' },
  AM: { h: ['#D90012', '#0033A0', '#F2A800'] }, AZ: { h: ['#00B5E2', '#EF3340', '#509E2F'] }, UZ: { h: ['#1EB5E5', '#FFFFFF', '#2FB04A'] }, KZ: { bg: '#00AFCA', disc: '#FEC50C' },
  KG: { bg: '#E8112D', sun: '#FFEF00' }, TM: { bg: '#00843D', band: '#D22630' }, TJ: { h: ['#CC0000', '#FFFFFF', '#006600'] }, DE: { h: ['#111111', '#DD0000', '#FFCE00'] }, FR: { v: ['#0055A4', '#FFFFFF', '#EF4135'] },
  GB: { bg: '#012169', cross: '#C8102E', crossW: '#FFFFFF' }, PL: { h: ['#FFFFFF', '#DC143C'] }, CZ: { h: ['#FFFFFF', '#D7141A'], tri: '#11457E' }, AT: { h: ['#ED2939', '#FFFFFF', '#ED2939'] },
  IT: { v: ['#009246', '#FFFFFF', '#CE2B37'] }, ES: { h: ['#AA151B', '#F1BF00', '#F1BF00', '#AA151B'] }, PT: { v: ['#006600', '#FF0000', '#FF0000'] }, NL: { h: ['#AE1C28', '#FFFFFF', '#21468B'] },
  FI: { bg: '#FFFFFF', cross: '#002F6C' }, SE: { bg: '#006AA7', cross: '#FECC00' }, TR: { bg: '#E30A17', crescent: '#FFFFFF' }, IL: { h: ['#FFFFFF', '#0038B8', '#FFFFFF', '#FFFFFF', '#0038B8', '#FFFFFF'] },
  AE: { h: ['#00732F', '#FFFFFF', '#111111'], tri: '#FF0000' }, RS: { h: ['#C6363C', '#0C4076', '#FFFFFF'] }, CY: { bg: '#FFFFFF', disc: '#D57800' }, US: { h: ['#B22234', '#FFFFFF', '#B22234', '#FFFFFF', '#B22234', '#FFFFFF', '#B22234'], canton: '#3C3B6E' },
  CA: { v: ['#FF0000', '#FFFFFF', '#FFFFFF', '#FF0000'], disc: '#FF0000' }, AR: { h: ['#74ACDF', '#FFFFFF', '#74ACDF'] }, BR: { bg: '#009C3B', disc: '#FFDF00' }, AU: { bg: '#012169', disc: '#FFFFFF' },
  JP: { bg: '#FFFFFF', disc: '#BC002D' }, CN: { bg: '#EE1C25', star: '#FFDE00', starAt: 'tl' }, KR: { bg: '#FFFFFF', disc: '#CD2E3A' }, TH: { h: ['#A51931', '#F4F5F8', '#2D2A4A', '#2D2A4A', '#F4F5F8', '#A51931'] },
  VN: { bg: '#DA251D', star: '#FFFF00' }, ID: { h: ['#CE1126', '#FFFFFF'] }, EG: { h: ['#CE1126', '#FFFFFF', '#111111'] }, ZA: { h: ['#E03C31', '#FFFFFF', '#007749', '#FFFFFF', '#001489'] },
  MX: { v: ['#006847', '#FFFFFF', '#CE1126'] }, CU: { h: ['#002A8F', '#FFFFFF', '#002A8F', '#FFFFFF', '#002A8F'], tri: '#CF142B' }
}

// ---------- palettes ----------
const PAL = {
  night: { bgA: '#18214A', bgB: '#05070D', cover: '#1C2547', pageA: '#111830', pageB: '#0C1121', ink: '#EEF1F7', ink2: '#C3CADA', muted: '#7C8698', word: '#F2C879',
    hatch: ['#2F3E6C', '#43588F'], gu: 'rgba(242,200,121,.055)', band: 'rgba(255,255,255,.035)', dot: '#F2C879', ring: '#10162B', arc: 'rgba(242,200,121,.95)', arcA: 'rgba(242,200,121,.25)',
    strip: ['#F2C879', '#E9A6B8', '#9DB7FF', '#79D9A6'], edge: 'rgba(242,200,121,.22)', foot: '#EEF1F7', footMuted: '#8A93A8', star: '255,255,255', ghost: 'rgba(183,191,207,.4)', pill: 'rgba(242,200,121,.12)', pillInk: '#F2C879', glow: 'rgba(242,200,121,.45)', core: '#FFF8E6' },
  paper: { bgA: '#EEF1F6', bgB: '#C9D1DF', cover: '#1E2C5C', pageA: '#F7F8FA', pageB: '#ECF0F2', ink: '#1D2B5E', ink2: '#34427A', muted: '#6B76A0', word: '#6474B0',
    hatch: ['#8FD3C0', '#83BFD8'], gu: 'rgba(40,140,130,.10)', band: 'rgba(29,43,94,.05)', dot: '#C9452B', ring: '#F7F8FA', arc: 'rgba(201,95,40,.95)', arcA: 'rgba(201,95,40,.25)',
    strip: ['#C4612C', '#C2678F', '#5D7BD6', '#3FA58A'], edge: 'rgba(29,43,94,.14)', foot: '#1D2B5E', footMuted: '#55618C', star: '29,43,94', ghost: 'rgba(29,43,94,.32)', pill: 'rgba(29,43,94,.07)', pillInk: '#1D2B5E', glow: 'rgba(201,69,43,.22)', core: '#FFF1E8' },
  uv: { bgA: '#4A1890', bgB: '#0A0520', cover: '#2A1670', pageA: '#BAC4FF', pageMid: '#EBB9F0', pageB: '#A2E9F3', ink: '#22105A', ink2: '#36217F', muted: '#5B4C9C', word: '#6D28D9',
    hatch: ['#E56BD6', '#3FCFE0'], gu: 'rgba(90,40,180,.13)', band: 'rgba(60,20,140,.08)', dot: '#5B21B6', ring: '#EDE6FF', arc: 'rgba(76,29,170,.95)', arcA: 'rgba(76,29,170,.3)',
    strip: ['#D946EF', '#8B5CF6', '#22B8CF', '#EC4899'], edge: 'rgba(255,255,255,.45)', foot: '#F1E9FF', footMuted: '#BBA7F0', star: '255,255,255', ghost: 'rgba(54,33,127,.38)', pill: 'rgba(91,33,182,.12)', pillInk: '#4C1D95', glow: 'rgba(255,255,255,.6)', core: '#FFFFFF' }
}

// ---------- data from the family ----------
const today = () => { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}` }
/** «You» on the card: the person created as «me» in the first run, otherwise whoever has the most known ancestors (the youngest on a tie). */
export function ownerOf() {
  const me = S.settings.meId && byId(S.settings.meId); if (me) return me
  const count = (id, seen = new Set()) => { let n = 0; parentsOf(id).forEach(p => { if (!seen.has(p.id)) { seen.add(p.id); n += 1 + count(p.id, seen) } }); return n }
  let best = null, bs = -1, by = -1
  S.people.forEach(p => { const c = count(p.id), y = +yearOf(p.birthDate) || 0; if (c > bs || (c === bs && y > by)) { best = p; bs = c; by = y } })
  return best
}
const placeKey = (lat, lon) => (+lat).toFixed(1) + ',' + (+lon).toFixed(1)
export function passportData(opts = {}) {
  const T = tx(), owner = ownerOf(), YEAR = new Date().getFullYear()
  // ancestors by Ahnentafel number: 1 = you, 2n = father, 2n+1 = mother
  const anc = {}
  if (owner) { const walk = (p, n, seen) => { if (n >= 32 || seen.has(p.id)) return; seen.add(p.id); anc[n] = +yearOf(p.birthDate) || 0
      const ps = parentsOf(p.id); let f = ps.find(x => x.gender === 'm'), m = ps.find(x => x.gender === 'f'); const rest = ps.filter(x => x !== f && x !== m)
      if (!f) f = rest.shift(); if (!m) m = rest.shift(); if (f) walk(f, 2 * n, seen); if (m) walk(m, 2 * n + 1, seen) }
    walk(owner, 1, new Set()) }
  // places and moves (the same events the map page draws)
  const pts = new Map(), arcs = [], seen = new Set()
  S.people.forEach(p => {
    const ev = (p.events || []).filter(e => e.lat != null && e.lat !== '' && e.lon != null && e.lon !== '').sort((a, b) => (+a.year || 0) - (+b.year || 0))
    ev.forEach(e => { const k = placeKey(e.lat, e.lon); if (!pts.has(k)) pts.set(k, { key: k, lat: +e.lat, lon: +e.lon, name: (findCity(e.place)?.[LANG === 'en' ? 'en' : 'ru']) || e.place || '', country: countryAt(e.lat, e.lon) || findCity(e.place)?.country || '', count: 0 }); pts.get(k).count++ })
    for (let i = 1; i < ev.length; i++) { const a = placeKey(ev[i - 1].lat, ev[i - 1].lon), b = placeKey(ev[i].lat, ev[i].lon); const k = a + '>' + b; if (a !== b && !seen.has(k)) { seen.add(k); arcs.push([a, b]) } }
  })
  const cities = [...pts.values()]
  const ob = owner && (owner.events || []).find(e => e.type === 'birth' && e.lat != null && e.lat !== '')
  const home = ob ? placeKey(ob.lat, ob.lon) : null
  const homeC = home && pts.get(home)?.country
  const cc = {}; cities.forEach(c => { if (c.country) cc[c.country] = (cc[c.country] || 0) + c.count })
  const countries = Object.keys(cc).sort((a, b) => (b === homeC) - (a === homeC) || cc[b] - cc[a])
  const ys = S.people.map(p => +yearOf(p.birthDate)).filter(Boolean); const first = ys.length ? Math.min(...ys) : null
  // surnames by frequency, as family names («Ветровы»)
  const sc = {}; S.people.forEach(p => [p.last, p.maiden].filter(Boolean).forEach(l => { const f = familyTitle(l).replace(/^The (.*) family$/, '$1'); if (f) sc[f] = (sc[f] || 0) + 1 }))
  const fam = (opts.fam ?? '').trim() || (S.settings.familyName || '').trim() || Object.keys(sc).sort((a, b) => sc[b] - sc[a])[0] || T.noFam
  const surnames = [fam, ...Object.keys(sc).filter(s => s !== fam).sort((a, b) => sc[b] - sc[a])]
  Progress.evaluate(); const N = Progress.N || [], ST = Progress.ST || {}
  const ob2 = owner && findCity(owner.birthPlace)
  return { people: S.people.length, gens: generations(), first, years: first ? YEAR - first : 0, year: YEAR, fam, surnames,
    keeper: (opts.keeper ?? '').trim() || (owner ? fullName(owner) : '—'), place: ob2 ? ob2[LANG === 'en' ? 'en' : 'ru'] : (owner?.birthPlace || '—'),
    since: S.settings.since || today(), ach: [N.filter(n => ST[n.id] === 'done').length, N.length], anc, cities, arcs, home, countries }
}

// ---------- drawing ----------
const rnd = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath() }
function font(c, w, px, fam, ls) { c.font = `${w} ${px}px ${fam}`; if ('letterSpacing' in c) c.letterSpacing = (ls || 0) + 'px' }
function fit(c, txt, maxW, w, px, fam, ls) { let s = px; font(c, w, s, fam, ls); while (c.measureText(txt).width > maxW && s > 10) { s -= 1; font(c, w, s, fam, ls) } return s }
const proj = (lat, lon) => [(lon + 180) / 360 * 1000, (90 - lat) / 180 * 500]

export function cardLayout(st) {
  if (st.fmt === 'story') { const s = .94; return { s, x: (1080 - DW * s) / 2, y: 312 } }
  const s = 1190 / DH; return { s, x: (1080 - DW * s) / 2, y: 46 }
}
/** Draw the whole image (background, card, captions) into `cv` at scale `k` of the export size. */
export function renderCard(cv, k, st, D) {
  if (!WORLD_P) WORLD_P = new Path2D(WORLD)
  const [W, H] = SIZE[st.fmt]; cv.width = Math.round(W * k); cv.height = Math.round(H * k)
  const c = cv.getContext('2d'); c.setTransform(k, 0, 0, k, 0, 0)
  const P = st.uv ? PAL.uv : PAL[st.theme] || PAL.night, L = cardLayout(st), X = { c, P, D, st, T: tx() }
  drawBg(X, W, H)
  c.save(); c.translate(L.x, L.y); c.scale(L.s, L.s)
  c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 60; c.shadowOffsetY = 30; rr(c, 0, 0, DW, DH, 40); c.fillStyle = P.cover; c.fill(); c.shadowColor = 'transparent'
  drawDoc(X)
  c.restore()
  drawFrame(X, W, H)
}
function drawBg({ c, P, st }, W, H) {
  const g = c.createRadialGradient(W / 2, H * .18, 40, W / 2, H * .45, H * .95); g.addColorStop(0, P.bgA); g.addColorStop(1, P.bgB)
  c.fillStyle = g; c.fillRect(0, 0, W, H)
  if (st.theme === 'paper' && !st.uv) {
    c.strokeStyle = 'rgba(29,43,94,.05)'; c.lineWidth = 1.2
    for (let i = 0; i < 70; i++) { c.beginPath(); for (let x = 0; x <= W; x += 12) { const y = i * 30 + Math.sin(x * .008 + i * .4) * 26; x ? c.lineTo(x, y) : c.moveTo(x, y) } c.stroke() }
  } else {
    const r = rnd(7)
    for (let i = 0; i < 220; i++) { const x = r() * W, y = r() * H, s = r() * 1.8 + .3; c.fillStyle = `rgba(${P.star},${(r() * .5 + .1).toFixed(2)})`; c.beginPath(); c.arc(x, y, s, 0, 7); c.fill() }
  }
}
function drawLogo(c, x, y, s) { if (logoImg && logoImg.complete && logoImg.naturalWidth) c.drawImage(logoImg, x, y, s, s); else { rr(c, x, y, s, s, s * .24); c.fillStyle = '#151B2E'; c.fill() } }
function drawFrame({ c, P, st, T }, W) {
  if (st.fmt === 'story') {
    font(c, 600, 44, F.d, -.5); const tw = c.measureText('Predki').width; const lx = (W - (64 + 18 + tw)) / 2
    drawLogo(c, lx, 138, 64); c.fillStyle = P.foot; c.textBaseline = 'middle'; c.fillText('Predki', lx + 82, 171)
    c.textAlign = 'center'; c.textBaseline = 'alphabetic'
    font(c, 400, 24, F.m, 0); c.fillStyle = P.footMuted; c.fillText(T.tag, W / 2, 252)
    c.textAlign = 'left'
  } else {
    font(c, 500, 26, F.d, 0); const t = T.post; const tw = c.measureText(t).width; const lx = (W - (40 + 14 + tw)) / 2
    drawLogo(c, lx, 1268, 40); c.fillStyle = P.foot; c.textBaseline = 'middle'; c.fillText(t, lx + 54, 1289); c.textBaseline = 'alphabetic'
  }
}
function drawDoc(X) {
  const { c, P, st } = X
  c.save(); rr(c, 0, 14, DW, DH - 34, 34); c.clip()
  const g = c.createLinearGradient(0, 0, DW, DH); g.addColorStop(0, P.pageA); if (P.pageMid) g.addColorStop(.5, P.pageMid); g.addColorStop(1, P.pageB)
  c.fillStyle = g; c.fillRect(0, 0, DW, DH)
  c.strokeStyle = P.gu; c.lineWidth = 1.3 // security print
  for (let i = 0; i < 48; i++) { c.beginPath(); for (let x = 0; x <= DW; x += 10) { const y = i * 32 + Math.sin(x * .011 + i * .5) * 22 + Math.sin(x * .027 + i * 1.3) * 7; x ? c.lineTo(x, y) : c.moveTo(x, y) } c.stroke() }
  if (st.uv) reveal(X)
  strip(X); side(X); hero(X); flags(X)
  c.strokeStyle = P.edge; c.lineWidth = 3; c.lineCap = 'round'; c.setLineDash([.1, 11]); c.beginPath(); c.moveTo(44, 792); c.lineTo(956, 792); c.stroke(); c.setLineDash([]); c.lineCap = 'butt'
  title(X); body(X); nums(X); mrz(X)
  c.restore()
  rr(c, 0, 14, DW, DH - 34, 34); c.strokeStyle = P.edge; c.lineWidth = 2; c.stroke()
}
function strip({ c, P, D }) {
  const items = []; D.surnames.forEach((s, i) => { items.push(s.toUpperCase()); if (i === 0 && D.first) items.push(String(D.first)) })
  font(c, 500, 17, F.m, 2); c.textBaseline = 'middle'
  let x = 30, i = 0; const y = 48
  while (x < DW) { const t = items[i % items.length], col = P.strip[i % P.strip.length]
    c.fillStyle = col; c.globalAlpha = .9; c.save(); c.translate(x + 6, y); c.rotate(Math.PI / 4); c.fillRect(-4, -4, 8, 8); c.restore()
    x += 22; c.fillText(t, x, y + 1); x += c.measureText(t).width + 22; i++ }
  c.globalAlpha = 1; c.textBaseline = 'alphabetic'
}
function side({ c, P, T }) { c.save(); c.translate(36, 690); c.rotate(-Math.PI / 2); font(c, 500, 15, F.m, 4); c.fillStyle = P.muted; c.globalAlpha = .55; c.fillText(T.side, 0, 0); c.restore() }
function hero(X) {
  const { c, st } = X, W = 880, H = 600, sc = c.getTransform().a
  const oc = document.createElement('canvas'); oc.width = Math.ceil(W * sc); oc.height = Math.ceil(H * sc)
  const o = oc.getContext('2d'); o.scale(sc, sc)
  if (st.hero === 'stars') heroStars(X, o, W, H); else heroMap(X, o, W, H)
  const fx = st.hero === 'stars' ? .015 : .07
  o.globalCompositeOperation = 'destination-in' // soft edges
  let m = o.createLinearGradient(0, 0, W, 0); m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(fx, '#000'); m.addColorStop(1 - fx, '#000'); m.addColorStop(1, 'rgba(0,0,0,0)'); o.fillStyle = m; o.fillRect(0, 0, W, H)
  m = o.createLinearGradient(0, 0, 0, H); m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(.06, '#000'); m.addColorStop(.92, '#000'); m.addColorStop(1, 'rgba(0,0,0,0)'); o.fillStyle = m; o.fillRect(0, 0, W, H)
  c.drawImage(oc, 60, 82, W, H)
}
function heroMap({ P, D }, o, W, H) {
  const pts = D.cities.length ? D.cities.map(p => proj(p.lat, p.lon)) : [proj(55.75, 37.62)]
  const x0 = Math.min(...pts.map(p => p[0])), x1 = Math.max(...pts.map(p => p[0])), y0 = Math.min(...pts.map(p => p[1])), y1 = Math.max(...pts.map(p => p[1]))
  let w = Math.max((x1 - x0) * 1.45, 150), h = Math.max((y1 - y0) * 1.6, 60); const A = W / H
  if (w / h < A) w = h * A; else h = w / A
  if (w > 1000) { w = 1000; h = w / A }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2 - h * .04
  const vx = Math.min(Math.max(cx - w / 2, 0), 1000 - w), vy = Math.min(Math.max(cy - h / 2, 0), Math.max(0, 500 - h))
  const k = W / w, at = p => { const q = proj(p.lat, p.lon); return [(q[0] - vx) * k, (q[1] - vy) * k] }
  const byKey = Object.fromEntries(D.cities.map(p => [p.key, p]))
  o.save(); const T = o.getTransform(); o.translate(-vx * k, -vy * k); o.scale(k, k); o.clip(WORLD_P); o.setTransform(T) // engraved land
  const hg = o.createLinearGradient(0, 0, W, H); hg.addColorStop(0, P.hatch[0]); hg.addColorStop(1, P.hatch[1]); o.strokeStyle = hg; o.lineWidth = 2.6
  o.beginPath(); for (let y = 1; y < H; y += 6) { o.moveTo(0, y); o.lineTo(W, y) } o.stroke(); o.restore()
  o.lineCap = 'round'
  D.arcs.forEach(([a, b]) => { const p = at(byKey[a]), q = at(byKey[b]); const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, dx = q[0] - p[0], dy = q[1] - p[1], d = Math.hypot(dx, dy) || 1
    let nx = -dy / d, ny = dx / d; if (ny > 0) { nx = -nx; ny = -ny } const cxp = mx + nx * d * .24, cyp = my + ny * d * .24
    const g = o.createLinearGradient(p[0], p[1], q[0], q[1]); g.addColorStop(0, P.arcA); g.addColorStop(1, P.arc)
    o.strokeStyle = g; o.lineWidth = 3; o.beginPath(); o.moveTo(p[0], p[1]); o.quadraticCurveTo(cxp, cyp, q[0], q[1]); o.stroke() })
  D.cities.forEach(p => { const [x, y] = at(p), r = 6.5 + Math.min(3, p.count - 1) * 1.3
    if (p.key === D.home) { o.fillStyle = P.glow; o.beginPath(); o.arc(x, y, r + 12, 0, 7); o.fill() }
    o.fillStyle = P.ring; o.beginPath(); o.arc(x, y, r + 3.5, 0, 7); o.fill(); o.fillStyle = P.dot; o.beginPath(); o.arc(x, y, r, 0, 7); o.fill() })
  const order = [...D.cities].sort((a, b) => (b.key === D.home) - (a.key === D.home) || b.count - a.count); const used = []
  font(o, 500, 17, F.m, 1.5); o.textBaseline = 'middle'
  order.slice(0, 8).forEach(p => { if (!p.name) return; const [x, y] = at(p), t = p.name.toUpperCase(), tw = o.measureText(t).width
    const box = [x + 16, y - 12, tw, 24]; if (box[0] + tw > W - 30) box[0] = x - 16 - tw
    if (used.some(u => box[0] < u[0] + u[2] + 8 && box[0] + box[2] + 8 > u[0] && box[1] < u[1] + u[3] && box[1] + box[3] > u[1])) return
    used.push(box); o.lineWidth = 6; o.strokeStyle = P.ring; o.lineJoin = 'round'; o.strokeText(t, box[0], y); o.fillStyle = p.key === D.home ? P.ink : P.ink2; o.fillText(t, box[0], y) })
  o.textBaseline = 'alphabetic'
}
function sparkle(o, x, y, R, k, rot) { const r = R * k; o.beginPath()
  for (let i = 0; i < 4; i++) { const a = rot + i * Math.PI / 2 - Math.PI / 2, b = a + Math.PI / 4, a2 = a + Math.PI / 2
    if (!i) o.moveTo(x + Math.cos(a) * R, y + Math.sin(a) * R)
    o.quadraticCurveTo(x + Math.cos(b) * r, y + Math.sin(b) * r, x + Math.cos(a2) * R, y + Math.sin(a2) * R) }
  o.closePath() }
function heroStars({ P, D, T }, o, W, H) {
  const r = rnd(11)
  for (let i = 0; i < 170; i++) { o.fillStyle = `rgba(${P.star},${(r() * .35 + .06).toFixed(2)})`; o.beginPath(); o.arc(r() * W, r() * H, r() * 1.6 + .3, 0, 7); o.fill() }
  const A = D.anc, ns = Object.keys(A).map(Number); if (!ns.length) ns.push(1)
  const maxG = Math.max(...ns.map(n => Math.floor(Math.log2(n)))), G = Math.min(5, maxG + 2), top = 62, bot = H - 96, gy = g => bot - g * (bot - top) / (G - 1)
  const known = n => n === 1 || A[n] != null
  const pos = n => { const g = Math.floor(Math.log2(n)), i = n - 2 ** g; return [110 + (i + .5) / 2 ** g * (W - 140), gy(g)] }
  for (let n = 1; n < 2 ** (G - 1); n++) { if (!known(n)) continue; const [x, y] = pos(n)
    ;[2 * n, 2 * n + 1].forEach(p => { const [px, py] = pos(p); o.beginPath(); o.moveTo(x, y); o.lineTo(px, py)
      if (A[p] != null) { o.setLineDash([]); o.strokeStyle = P.arc; o.globalAlpha = .55; o.lineWidth = 2 } else { o.setLineDash([5, 7]); o.strokeStyle = P.ghost; o.globalAlpha = 1; o.lineWidth = 1.5 }
      o.stroke(); o.globalAlpha = 1 }) }
  o.setLineDash([])
  for (let n = 2 ** G - 1; n >= 1; n--) { const [x, y] = pos(n), g = Math.floor(Math.log2(n))
    if (known(n)) { const s = n === 1 ? 30 : 22 - g * 2.2
      const gl = o.createRadialGradient(x, y, 0, x, y, s * 1.9); gl.addColorStop(0, P.glow); gl.addColorStop(1, 'rgba(0,0,0,0)'); o.fillStyle = gl; o.beginPath(); o.arc(x, y, s * 1.9, 0, 7); o.fill()
      o.fillStyle = P.dot; o.globalAlpha = .55; sparkle(o, x, y, s * .52, .3, Math.PI / 4); o.fill(); o.globalAlpha = 1
      sparkle(o, x, y, s, .2, 0); o.fill()
      o.fillStyle = P.core; o.beginPath(); o.arc(x, y, Math.max(2, s * .13), 0, 7); o.fill()
    } else if (known(n >> 1)) { o.strokeStyle = P.ghost; o.lineWidth = 1.5; sparkle(o, x, y, 11, .26, 0); o.stroke() } }
  font(o, 500, 16, F.m, 1); o.fillStyle = P.muted // approximate year of each generation
  for (let g = 0; g < G; g++) { const ys = ns.filter(n => Math.floor(Math.log2(n)) === g).map(n => A[n]).filter(Boolean); if (!ys.length) continue
    const avg = Math.round(ys.reduce((a, b) => a + b, 0) / ys.length); o.fillText((ys.length > 1 || g ? '≈' : '') + avg, 14, gy(g) + 6) }
  const [x, y] = pos(1); fit(o, D.keeper, 360, 500, 22, F.d, 0); o.textAlign = 'center'; o.fillStyle = P.ink; o.fillText(D.keeper, x, y + 56)
  font(o, 400, 15, F.m, 2); o.fillStyle = P.muted; o.fillText(T.you, x, y + 82); o.textAlign = 'left'
}
function flags({ c, P, D }) {
  const list = D.countries.slice(0, 18), r = 22, step = list.length > 14 ? 32 : 38, w = (list.length - 1) * step, y = 734; let x = DW / 2 - w / 2
  list.forEach(code => { const f = FLAGS[code]
    c.save(); c.beginPath(); c.arc(x, y, r, 0, 7); c.clip()
    if (!f) { c.fillStyle = P.pill; c.fillRect(x - r, y - r, 2 * r, 2 * r); font(c, 600, 15, F.m, 0); c.fillStyle = P.ink2; c.textAlign = 'center'; c.fillText(code, x, y + 5); c.textAlign = 'left' }
    else {
      if (f.bg) { c.fillStyle = f.bg; c.fillRect(x - r, y - r, 2 * r, 2 * r) }
      if (f.h) { const n = f.h.length; f.h.forEach((col, i) => { c.fillStyle = col; c.fillRect(x - r, y - r + i * 2 * r / n, 2 * r, 2 * r / n + .5) }) }
      if (f.v) { const n = f.v.length; f.v.forEach((col, i) => { c.fillStyle = col; c.fillRect(x - r + i * 2 * r / n, y - r, 2 * r / n + .5, 2 * r) }) }
      if (f.canton) { c.fillStyle = f.canton; c.fillRect(x - r, y - r, r, r * 1.08) }
      if (f.tri) { c.fillStyle = f.tri; c.beginPath(); c.moveTo(x - r, y - r); c.lineTo(x, y); c.lineTo(x - r, y + r); c.fill() }
      if (f.crossW) { c.fillStyle = f.crossW; c.fillRect(x - 7, y - r, 14, 2 * r); c.fillRect(x - r, y - 7, 2 * r, 14) }
      if (f.cross) { const off = code === 'FI' || code === 'SE' ? -6 : 0; c.fillStyle = f.cross; c.fillRect(x - 4 + off, y - r, 8, 2 * r); c.fillRect(x - r, y - 4, 2 * r, 8) }
      if (f.star) { const big = f.starAt !== 'tl', sx = big ? x : x - 8, sy = big ? y : y - 7, R = big ? 10 : 7; c.fillStyle = f.star; c.beginPath()
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? R * .4 : R; c.lineTo(sx + q * Math.cos(a), sy + q * Math.sin(a)) } c.fill() }
      if (f.sun) { c.strokeStyle = f.sun; c.lineWidth = 1.6; for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; c.beginPath(); c.moveTo(x + 7 * Math.cos(a), y + 7 * Math.sin(a)); c.lineTo(x + 12 * Math.cos(a), y + 12 * Math.sin(a)); c.stroke() }
        c.fillStyle = f.sun; c.beginPath(); c.arc(x, y, 6, 0, 7); c.fill(); c.strokeStyle = f.bg; c.lineWidth = 1; c.beginPath(); c.arc(x, y, 3.6, 0, 7); c.stroke() }
      if (f.band) { c.fillStyle = f.band; c.fillRect(x - r + 7, y - r, 9, 2 * r) }
      if (f.disc) { c.fillStyle = f.disc; c.beginPath(); c.arc(x, y, 8, 0, 7); c.fill() }
      if (f.crescent) { c.fillStyle = f.crescent; c.beginPath(); c.arc(x - 3, y, 10, 0, 7); c.fill(); c.fillStyle = f.bg; c.beginPath(); c.arc(x, y, 8, 0, 7); c.fill() }
    }
    c.restore(); c.strokeStyle = P.ring; c.lineWidth = 3.5; c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); x += step })
}
function trophy(c, x, y, s, col) { c.save(); c.translate(x, y); c.scale(s / 24, s / 24); c.strokeStyle = col; c.lineWidth = 2; c.lineCap = 'round'; c.lineJoin = 'round'
  c.stroke(new Path2D('M8 4h8v5a4 4 0 0 1-8 0z')); c.stroke(new Path2D('M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4')); c.stroke(new Path2D('M12 13v4M9 20h6M10 17h4')); c.restore() }
function title({ c, P, D, T }) {
  fit(c, T.title, 560, 600, 40, F.d, 1.5); c.fillStyle = P.ink; c.fillText(T.title, 60, 864)
  c.strokeStyle = P.muted; c.lineWidth = 2; rr(c, 60, 885, 24, 17, 4); c.stroke(); c.beginPath(); c.moveTo(66, 891); c.lineTo(78, 891); c.moveTo(66, 896); c.lineTo(74, 896); c.stroke()
  font(c, 500, 17, F.m, 1.5); c.fillStyle = P.muted; c.fillText(T.sub, 96, 900)
  drawLogo(c, 868, 822, 72)
  const [a, b] = D.ach, t = `${a} / ${b}`; font(c, 500, 19, F.m, 1); const tw = c.measureText(t).width, pw = tw + 64, px = 852 - pw
  rr(c, px, 836, pw, 44, 22); c.fillStyle = P.pill; c.fill(); trophy(c, px + 14, 846, 24, P.pillInk); c.fillStyle = P.pillInk; c.fillText(t, px + 46, 865)
}
function body({ c, P, D, T }) {
  font(c, 600, 160, F.d, -4); c.fillStyle = P.ink; c.fillText(String(D.people), 52, 1084)
  const wd = plural(D.people, T.people); fit(c, wd, 470, 300, 62, F.d, -1); c.fillStyle = P.word; c.fillText(wd, 58, 1152)
  const rows = [[T.fam, D.fam], [T.keeper, D.keeper], [T.place, D.place], [T.since, D.since]]
  rows.forEach(([l, v], i) => { const y = 976 + i * 46; font(c, 400, 22, F.d, 0); c.fillStyle = P.muted; c.fillText(l, 560, y)
    const lw = c.measureText(l).width + 10; fit(c, v, 940 - 560 - lw, 500, 22, F.d, 0); c.fillStyle = P.ink2; c.fillText(v, 560 + lw, y) })
}
function nums({ c, P, D, T }) {
  const cols = [[T.gens, D.gens], [T.years, D.years || '—'], [T.cities, D.cities.length], [T.countries, D.countries.length]]
  cols.forEach(([l, v], i) => { const x = 60 + i * 230; fit(c, l, 210, 400, 22, F.d, 0); c.fillStyle = P.muted; c.fillText(l, x, 1218); font(c, 600, 54, F.d, -1); c.fillStyle = P.ink; c.fillText(String(v), x, 1278) })
}
function mrz({ c, P, D, T }) {
  c.fillStyle = P.band; c.fillRect(0, 1312, DW, 140)
  c.fillStyle = P.muted; c.globalAlpha = .6; [[26, 1382, 1], [974, 1382, -1]].forEach(([x, y, d]) => { c.beginPath(); c.moveTo(x, y - 14); c.lineTo(x + 12 * d, y); c.lineTo(x, y + 14); c.closePath(); c.fill() }); c.globalAlpha = 1
  const pad = (s, n) => (s + '<'.repeat(n)).slice(0, n)
  let s1 = T.mrzFam + '<'; D.surnames.forEach(s => { const n = '<' + s.toUpperCase().replace(/\s+/g, '<'); if ((s1 + n).length <= 44) s1 += n }); const l1 = pad(s1, 44)
  const l2 = pad(`${D.first || '----'}<${D.year}<<${D.people}${T.mrzP}<${D.gens}${T.mrzG}<<${T.mrzS}${D.since.replace(/\./g, '')}`, 38) + 'PREDKI'
  font(c, 500, 31, F.m, 0); c.fillStyle = P.ink2; c.textAlign = 'center'
  ;[l1, l2].forEach((l, j) => { for (let i = 0; i < 44; i++) c.fillText(l[i], 70 + i * 20, 1372 + j * 48) })
  c.textAlign = 'left'
}
function reveal({ c }) {
  c.save(); c.strokeStyle = 'rgba(120,40,220,.13)'; c.lineCap = 'round'
  const br = (x, y, len, a, d) => { if (!d) return; const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len; c.lineWidth = d * 1.25; c.beginPath(); c.moveTo(x, y); c.lineTo(x2, y2); c.stroke(); br(x2, y2, len * .74, a - .43, d - 1); br(x2, y2, len * .72, a + .37, d - 1) }
  br(870, 1470, 165, -Math.PI / 2 - .06, 9); c.restore()
  const r = rnd(5); for (let i = 0; i < 60; i++) { const x = r() * DW, y = 760 + r() * 700, s = r() * 5 + 2; c.fillStyle = 'rgba(255,255,255,' + (r() * .5 + .2).toFixed(2) + ')'
    c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s * .3, y - s * .3); c.lineTo(x + s, y); c.lineTo(x + s * .3, y + s * .3); c.lineTo(x, y + s); c.lineTo(x - s * .3, y + s * .3); c.lineTo(x - s, y); c.lineTo(x - s * .3, y - s * .3); c.fill() }
}
