// @ts-nocheck — canvas drawing ported from the «Паспорт семьи» prototype
// «Паспорт семьи»: a shareable card built from the family data (stories 9:16 or post 4:5).
import { S, LANG, byId, parentsOf, fullName, yearOf, generations } from './core'
import { WORLD, findCity, countryAt } from './world'
import { familyTitle } from './treeStyle'
import { Progress } from './progress'
import { globeTile } from './globe'
import { rootPerson } from './treeLayout'
import { stickerSrc } from './stickers'

export const SIZE = { story: [1080, 1920], post: [1080, 1350] }
export const DW = 1000, DH = 1480
// type of the new identity: condensed capitals for headings and big numbers, Plex for words, Plex Mono for labels
const F = { d: '"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif', m: '"IBM Plex Mono",ui-monospace,Menlo,monospace', h: '"Sofia Sans Extra Condensed","Arial Narrow",sans-serif' }
let WORLD_P = null
let logoImg = null
export function logoReady(cb) {
  if (!logoImg) { logoImg = new Image(); const svg = globeTile(1024); logoImg.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg))) }
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
/** Canada's maple leaf in the 24×24 flag box */
export const LEAF = 'M12 6L13 8.3L14.6 7.6L14.1 10.6L16.2 9.2L16.7 10.4L18.4 10L17.6 12.2L18.6 12.8L15.6 15.2L16 16.4L12.5 16L12.5 18.5L11.5 18.5L11.5 16L8 16.4L8.4 15.2L5.4 12.8L6.4 12.2L5.6 10L7.3 10.4L7.8 9.2L9.9 10.6L9.4 7.6L11 8.3Z'
export const FLAGS = {
  RU: { h: ['#FFFFFF', '#1C57A5', '#D52B1E'] }, UA: { h: ['#0057B7', '#FFD700'] }, BY: { h: ['#C8313E', '#C8313E', '#4AA657'] }, LV: { h: ['#9E3039', '#9E3039', '#FFFFFF', '#9E3039', '#9E3039'] },
  LT: { h: ['#FDB913', '#006A44', '#C1272D'] }, EE: { h: ['#0072CE', '#111111', '#FFFFFF'] }, MD: { v: ['#0046AE', '#FFD200', '#CC092F'] }, GE: { bg: '#FFFFFF', cross: '#E8112D', crosslets: true },
  AM: { h: ['#D90012', '#0033A0', '#F2A800'] }, AZ: { h: ['#00B5E2', '#EF3340', '#509E2F'] }, UZ: { h: ['#1EB5E5', '#FFFFFF', '#2FB04A'] }, KZ: { bg: '#00AFCA', disc: '#FEC50C' },
  KG: { bg: '#E8112D', sun: '#FFEF00' }, TM: { bg: '#00843D', band: '#D22630' }, TJ: { h: ['#CC0000', '#FFFFFF', '#006600'] }, DE: { h: ['#111111', '#DD0000', '#FFCE00'] }, FR: { v: ['#0055A4', '#FFFFFF', '#EF4135'] },
  GB: { bg: '#012169', saltire: ['#FFFFFF', '#C8102E'], cross: '#C8102E', crossW: '#FFFFFF' }, PL: { h: ['#FFFFFF', '#DC143C'] }, CZ: { h: ['#FFFFFF', '#D7141A'], tri: '#11457E' }, AT: { h: ['#ED2939', '#FFFFFF', '#ED2939'] },
  IT: { v: ['#009246', '#FFFFFF', '#CE2B37'] }, ES: { h: ['#AA151B', '#F1BF00', '#F1BF00', '#AA151B'] }, PT: { v: ['#006600', '#FF0000', '#FF0000'] }, NL: { h: ['#AE1C28', '#FFFFFF', '#21468B'] },
  FI: { bg: '#FFFFFF', cross: '#002F6C' }, SE: { bg: '#006AA7', cross: '#FECC00' }, TR: { bg: '#E30A17', crescent: '#FFFFFF' }, IL: { h: ['#FFFFFF', '#0038B8', '#FFFFFF', '#FFFFFF', '#0038B8', '#FFFFFF'] },
  AE: { h: ['#00732F', '#FFFFFF', '#111111'], tri: '#FF0000' }, RS: { h: ['#C6363C', '#0C4076', '#FFFFFF'] }, CY: { bg: '#FFFFFF', disc: '#D57800' }, US: { h: ['#B22234', '#FFFFFF', '#B22234', '#FFFFFF', '#B22234', '#FFFFFF', '#B22234'], canton: '#3C3B6E' },
  CA: { v: ['#FF0000', '#FFFFFF', '#FFFFFF', '#FF0000'], leaf: '#FF0000' }, AR: { h: ['#74ACDF', '#FFFFFF', '#74ACDF'] }, BR: { bg: '#009C3B', disc: '#FFDF00' }, AU: { bg: '#012169', disc: '#FFFFFF' },
  JP: { bg: '#FFFFFF', disc: '#BC002D' }, CN: { bg: '#EE1C25', star: '#FFDE00', starAt: 'tl' }, KR: { bg: '#FFFFFF', disc: '#CD2E3A' }, TH: { h: ['#A51931', '#F4F5F8', '#2D2A4A', '#2D2A4A', '#F4F5F8', '#A51931'] },
  VN: { bg: '#DA251D', star: '#FFFF00' }, ID: { h: ['#CE1126', '#FFFFFF'] }, EG: { h: ['#CE1126', '#FFFFFF', '#111111'] }, ZA: { h: ['#E03C31', '#FFFFFF', '#007749', '#FFFFFF', '#001489'] },
  MX: { v: ['#006847', '#FFFFFF', '#CE1126'] }, CU: { h: ['#002A8F', '#FFFFFF', '#002A8F', '#FFFFFF', '#002A8F'], tri: '#CF142B' }
}

// round flag icons from the specs above (also used on «Хранитель»)
const escF = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
function starPathF(cx, cy, R) { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? R * .4 : R; d += (i ? 'L' : 'M') + (cx + q * Math.cos(a)).toFixed(2) + ' ' + (cy + q * Math.sin(a)).toFixed(2) } return d + 'Z' }
/** Round flag icon from the passport's flag specs. */
export function flagSvg(code, title) {
  const f = FLAGS[code]; let b = ''
  if (!f) b = `<rect width="24" height="24" fill="#3A4152"/><text x="12" y="15" font-size="8" text-anchor="middle" fill="#EEF1F7">${code}</text>`
  else {
    if (f.bg) b += `<rect width="24" height="24" fill="${f.bg}"/>`
    if (f.h) f.h.forEach((c, i, a) => { b += `<rect y="${i * 24 / a.length}" width="24" height="${24 / a.length + .3}" fill="${c}"/>` })
    if (f.v) f.v.forEach((c, i, a) => { b += `<rect x="${i * 24 / a.length}" width="${24 / a.length + .3}" height="24" fill="${c}"/>` })
    if (f.canton) b += `<rect width="12" height="13" fill="${f.canton}"/>`
    if (f.tri) b += `<path d="M0 0L12 12L0 24Z" fill="${f.tri}"/>`
    if (f.band) b += `<rect x="5" width="5" height="24" fill="${f.band}"/>`
    // the Union Jack: white and red diagonals under the cross, otherwise it reads as a Nordic flag
    if (f.saltire) b += `<path d="M0 0L24 24M24 0L0 24" stroke="${f.saltire[0]}" stroke-width="5"/><path d="M0 0L24 24M24 0L0 24" stroke="${f.saltire[1]}" stroke-width="1.8"/>`
    if (f.crossW) b += `<rect x="8" width="8" height="24" fill="${f.crossW}"/><rect y="8" width="24" height="8" fill="${f.crossW}"/>`
    if (f.cross) { const o = code === 'FI' || code === 'SE' ? -3 : 0; b += `<rect x="${10 + o}" width="4" height="24" fill="${f.cross}"/><rect y="10" width="24" height="4" fill="${f.cross}"/>` }
    if (f.star) b += `<path d="${f.starAt === 'tl' ? starPathF(7.5, 8, 4.5) : starPathF(12, 12.5, 6)}" fill="${f.star}"/>`
    if (f.sun) b += `<circle cx="12" cy="12" r="5.5" fill="${f.sun}"/><circle cx="12" cy="12" r="3" fill="none" stroke="${f.bg}" stroke-width="1"/>`
    if (f.disc) b += `<circle cx="12" cy="12" r="4.5" fill="${f.disc}"/>`
    if (f.leaf) b += `<path d="${LEAF}" fill="${f.leaf}"/>`
    if (f.crosslets) [[5.5, 5.5], [18.5, 5.5], [5.5, 18.5], [18.5, 18.5]].forEach(([x, y]) => { b += `<rect x="${x - .8}" y="${y - 2}" width="1.6" height="4" fill="${f.cross}"/><rect x="${x - 2}" y="${y - .8}" width="4" height="1.6" fill="${f.cross}"/>` })
    if (f.crescent) b += `<circle cx="10.5" cy="12" r="5.5" fill="${f.crescent}"/><circle cx="12" cy="12" r="4.4" fill="${f.bg}"/>`
  }
  return `<svg viewBox="0 0 24 24" role="img" aria-label="${escF(title)}"><title>${escF(title)}</title>${b}</svg>`
}

// ---------- palettes ----------
const PAL = {
  // night: deep ultramarine-night, paper words, sky accents, warm gold stops and stars on the map (red read as ominous on the dark card)
  night: { bgA: '#18217A', bgB: '#04061A', cover: '#0E1650', pageA: '#0F1862', pageB: '#080E3E', ink: '#F4F2EC', ink2: '#C6C9DE', muted: '#868DB6', word: '#8C96FF',
    hatch: ['#2533FF', '#5A66FF'], gu: 'rgba(140,150,255,.07)', band: 'rgba(140,150,255,.06)', dot: '#FFC94D', ring: '#0B1352', arc: 'rgba(244,242,236,.95)', arcA: 'rgba(244,242,236,.22)',
    strip: ['#F4F2EC', '#8C96FF', '#FFC94D', '#B4BAFF'], edge: 'rgba(140,150,255,.26)', foot: '#F4F2EC', footMuted: '#868DB6', star: '200,208,255', ghost: 'rgba(140,150,255,.42)', pill: 'rgba(37,51,255,.45)', pillInk: '#F4F2EC', glow: 'rgba(255,201,77,.42)', core: '#FFFFFF', sheet: '#F1EFE8', sheetDot: 'rgba(37,51,255,.16)' },
  // ultramarine: the whole card in the brand blue, paper ink
  ultra: { bgA: '#3A47FF', bgB: '#0B1352', cover: '#1A27D9', pageA: '#2D3BFF', pageB: '#1E2BE6', ink: '#F4F2EC', ink2: '#E4E3F2', muted: '#B8BEFF', word: '#F4F2EC',
    hatch: ['rgba(244,242,236,.55)', 'rgba(244,242,236,.38)'], gu: 'rgba(244,242,236,.06)', band: 'rgba(7,11,43,.2)', dot: '#FFD45E', ring: '#2533FF', arc: 'rgba(244,242,236,.95)', arcA: 'rgba(244,242,236,.25)',
    strip: ['#F4F2EC', '#B4BAFF', '#FFD45E', '#F4F2EC'], edge: 'rgba(244,242,236,.26)', foot: '#F4F2EC', footMuted: 'rgba(244,242,236,.72)', star: '244,242,236', ghost: 'rgba(244,242,236,.42)', pill: 'rgba(7,11,43,.28)', pillInk: '#F4F2EC', glow: 'rgba(255,212,94,.5)', core: '#FFFFFF', sheet: '#F1EFE8', sheetDot: 'rgba(37,51,255,.16)' },
  // paper: warm paper, Berlin-blue ink, ultramarine lines and stops
  paper: { bgA: '#F4F2EC', bgB: '#D6D3C9', cover: '#0B1352', pageA: '#F8F6F0', pageB: '#ECE9E0', ink: '#0B1352', ink2: '#24307A', muted: '#5F6596', word: '#2533FF',
    hatch: ['#2533FF', '#6B76FF'], gu: 'rgba(37,51,255,.07)', band: 'rgba(11,19,82,.05)', dot: '#2533FF', ring: '#F8F6F0', arc: 'rgba(37,51,255,.95)', arcA: 'rgba(37,51,255,.25)',
    strip: ['#2533FF', '#C98A12', '#0B1352', '#6B76FF'], edge: 'rgba(11,19,82,.14)', foot: '#0B1352', footMuted: '#5F6596', star: '11,19,82', ghost: 'rgba(11,19,82,.3)', pill: 'rgba(37,51,255,.1)', pillInk: '#2533FF', glow: 'rgba(37,51,255,.22)', core: '#FFF1E8', sheet: '#ECE9E0', sheetDot: 'rgba(37,51,255,.14)' },
  uv: { bgA: '#4A1890', bgB: '#0A0520', cover: '#2A1670', pageA: '#BAC4FF', pageMid: '#EBB9F0', pageB: '#A2E9F3', ink: '#22105A', ink2: '#36217F', muted: '#5B4C9C', word: '#6D28D9',
    hatch: ['#E56BD6', '#3FCFE0'], gu: 'rgba(90,40,180,.13)', band: 'rgba(60,20,140,.08)', dot: '#5B21B6', ring: '#EDE6FF', arc: 'rgba(76,29,170,.95)', arcA: 'rgba(76,29,170,.3)',
    strip: ['#D946EF', '#8B5CF6', '#22B8CF', '#EC4899'], edge: 'rgba(255,255,255,.45)', foot: '#F1E9FF', footMuted: '#BBA7F0', star: '255,255,255', ghost: 'rgba(54,33,127,.38)', pill: 'rgba(91,33,182,.12)', pillInk: '#4C1D95', glow: 'rgba(255,255,255,.6)', core: '#FFFFFF', sheet: 'rgba(255,255,255,.55)', sheetDot: 'rgba(91,33,182,.18)' }
}

// stickers pasted into the Album: the «Наклейки» cover; ready(cb) calls back as each picture arrives
const stickerImgs = new Map()
export function stickersReady(ids, cb) {
  ids.forEach(id => { if (stickerImgs.has(id)) return; const src = stickerSrc(id); if (!src) return; const im = new Image(); im.onload = cb; im.src = src; stickerImgs.set(id, im) })
}

// ---------- data from the family ----------
const today = () => { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}` }
/** «You» on the card: the person created as «me» in the first run, otherwise whoever has the most known ancestors (the youngest on a tie). */
export function ownerOf() { return rootPerson() }
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
    since: S.settings.since || today(), ach: [N.filter(n => ST[n.id] === 'done').length, N.length], anc, cities, arcs, home, countries,
    // the newest pasted stickers first, for the «Наклейки» cover
    stickers: (S.achPasted || []).filter(id => ST[id] === 'done').slice().sort((a, b) => String(S.achDates?.[b] || '').localeCompare(String(S.achDates?.[a] || ''))) }
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
    font(c, 800, 60, F.h, 1); const tw = c.measureText('PREDKI').width; const lx = (W - (64 + 18 + tw)) / 2
    drawLogo(c, lx, 138, 64); c.fillStyle = P.foot; c.textBaseline = 'middle'; c.fillText('PREDKI', lx + 82, 174)
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
  if (st.hero === 'stars') heroStars(X, o, W, H); else if (st.hero === 'stickers') heroStickers(X, o, W, H); else heroMap(X, o, W, H)
  const fx = st.hero === 'stars' || st.hero === 'stickers' ? .015 : .07
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
/** «Наклейки»: the newest stickers from the Album, lying askew on a paper page with a dot grid */
function heroStickers({ P, D }, o, W, H) {
  o.save(); rr(o, 30, 24, W - 60, H - 48, 26); o.clip(); o.fillStyle = P.sheet; o.fillRect(0, 0, W, H)
  o.fillStyle = P.sheetDot; for (let y = 36; y < H; y += 22) for (let x = 40; x < W; x += 22) { o.beginPath(); o.arc(x, y, 1.6, 0, 7); o.fill() }
  const ids = D.stickers.slice(0, 8), r = rnd(3)
  const spots = [[150, 150], [370, 128], [590, 150], [770, 140], [120, 395], [345, 410], [565, 385], [770, 410]]
  ids.forEach((id, i) => { const im = stickerImgs.get(id); if (!im || !im.complete || !im.naturalWidth) return
    const [x, y] = spots[i], s = 230, a = (r() - .5) * .3
    o.save(); o.translate(x, y); o.rotate(a); o.shadowColor = 'rgba(11,19,82,.28)'; o.shadowBlur = 18; o.shadowOffsetY = 8; o.drawImage(im, -s / 2, -s / 2, s, s); o.restore() })
  if (!ids.length) { font(o, 500, 22, F.m, 2); o.fillStyle = 'rgba(11,19,82,.45)'; o.textAlign = 'center'; o.fillText(LANG === 'en' ? 'PASTE STICKERS IN THE ALBUM' : 'ВКЛЕЙТЕ НАКЛЕЙКИ В АЛЬБОМ', W / 2, H / 2); o.textAlign = 'left' }
  o.restore()
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
      if (f.saltire) [[9, f.saltire[0]], [3.3, f.saltire[1]]].forEach(([w, col]) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x - r, y - r); c.lineTo(x + r, y + r); c.moveTo(x + r, y - r); c.lineTo(x - r, y + r); c.stroke() })
      if (f.crossW) { c.fillStyle = f.crossW; c.fillRect(x - 7, y - r, 14, 2 * r); c.fillRect(x - r, y - 7, 2 * r, 14) }
      if (f.cross) { const off = code === 'FI' || code === 'SE' ? -6 : 0; c.fillStyle = f.cross; c.fillRect(x - 4 + off, y - r, 8, 2 * r); c.fillRect(x - r, y - 4, 2 * r, 8) }
      if (f.star) { const big = f.starAt !== 'tl', sx = big ? x : x - 8, sy = big ? y : y - 7, R = big ? 10 : 7; c.fillStyle = f.star; c.beginPath()
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? R * .4 : R; c.lineTo(sx + q * Math.cos(a), sy + q * Math.sin(a)) } c.fill() }
      if (f.sun) { c.strokeStyle = f.sun; c.lineWidth = 1.6; for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; c.beginPath(); c.moveTo(x + 7 * Math.cos(a), y + 7 * Math.sin(a)); c.lineTo(x + 12 * Math.cos(a), y + 12 * Math.sin(a)); c.stroke() }
        c.fillStyle = f.sun; c.beginPath(); c.arc(x, y, 6, 0, 7); c.fill(); c.strokeStyle = f.bg; c.lineWidth = 1; c.beginPath(); c.arc(x, y, 3.6, 0, 7); c.stroke() }
      if (f.band) { c.fillStyle = f.band; c.fillRect(x - r + 7, y - r, 9, 2 * r) }
      if (f.disc) { c.fillStyle = f.disc; c.beginPath(); c.arc(x, y, 8, 0, 7); c.fill() }
      if (f.leaf || f.crosslets) { c.save(); c.translate(x - r, y - r); c.scale(r / 12, r / 12); c.fillStyle = f.leaf || f.cross
        if (f.leaf) c.fill(new Path2D(LEAF))
        if (f.crosslets) [[5.5, 5.5], [18.5, 5.5], [5.5, 18.5], [18.5, 18.5]].forEach(([a, b]) => { c.fillRect(a - .8, b - 2, 1.6, 4); c.fillRect(a - 2, b - .8, 4, 1.6) })
        c.restore() }
      if (f.crescent) { c.fillStyle = f.crescent; c.beginPath(); c.arc(x - 3, y, 10, 0, 7); c.fill(); c.fillStyle = f.bg; c.beginPath(); c.arc(x, y, 8, 0, 7); c.fill() }
    }
    c.restore(); c.strokeStyle = P.ring; c.lineWidth = 3.5; c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); x += step })
}
/** the Album mark: an open album with a round sticker */
function trophy(c, x, y, s, col) { c.save(); c.translate(x, y); c.scale(s / 24, s / 24); c.strokeStyle = col; c.lineWidth = 2; c.lineCap = 'round'; c.lineJoin = 'round'
  c.stroke(new Path2D('M3.5 5.5C6.2 4.4 9 4.5 12 6c3-1.5 5.8-1.6 8.5-.5v13.5c-2.7-1.1-5.5-1-8.5.5-3-1.5-5.8-1.6-8.5-.5zM12 6v13.5')); c.beginPath(); c.arc(16.2, 10.3, 2, 0, 7); c.stroke(); c.restore() }
function title({ c, P, D, T }) {
  fit(c, T.title, 560, 800, 58, F.h, 1.5); c.fillStyle = P.ink; c.fillText(T.title, 60, 866)
  c.strokeStyle = P.muted; c.lineWidth = 2; rr(c, 60, 885, 24, 17, 4); c.stroke(); c.beginPath(); c.moveTo(66, 891); c.lineTo(78, 891); c.moveTo(66, 896); c.lineTo(74, 896); c.stroke()
  font(c, 500, 17, F.m, 1.5); c.fillStyle = P.muted; c.fillText(T.sub, 96, 900)
  drawLogo(c, 868, 822, 72)
  const [a, b] = D.ach, t = `${a} / ${b}`; font(c, 500, 19, F.m, 1); const tw = c.measureText(t).width, pw = tw + 64, px = 852 - pw
  rr(c, px, 836, pw, 44, 22); c.fillStyle = P.pill; c.fill(); trophy(c, px + 14, 846, 24, P.pillInk); c.fillStyle = P.pillInk; c.fillText(t, px + 46, 865)
}
function body({ c, P, D, T }) {
  font(c, 800, 200, F.h, 0); c.fillStyle = P.ink; c.fillText(String(D.people), 52, 1096)
  const wd = plural(D.people, T.people).toUpperCase(); fit(c, wd, 470, 800, 64, F.h, 2); c.fillStyle = P.word; c.fillText(wd, 58, 1156)
  const rows = [[T.fam, D.fam], [T.keeper, D.keeper], [T.place, D.place], [T.since, D.since]]
  rows.forEach(([l, v], i) => { const y = 976 + i * 46; font(c, 400, 22, F.d, 0); c.fillStyle = P.muted; c.fillText(l, 560, y)
    const lw = c.measureText(l).width + 10; fit(c, v, 940 - 560 - lw, 500, 22, F.d, 0); c.fillStyle = P.ink2; c.fillText(v, 560 + lw, y) })
}
function nums({ c, P, D, T }) {
  const cols = [[T.gens, D.gens], [T.years, D.years || '—'], [T.cities, D.cities.length], [T.countries, D.countries.length]]
  cols.forEach(([l, v], i) => { const x = 60 + i * 230; fit(c, l.toUpperCase(), 210, 500, 17, F.m, 2); c.fillStyle = P.muted; c.fillText(l.toUpperCase(), x, 1216); font(c, 800, 72, F.h, 0); c.fillStyle = P.ink; c.fillText(String(v), x, 1282) })
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
