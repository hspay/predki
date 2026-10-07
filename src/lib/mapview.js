// «Карта» page: dark map with thin family routes, land borders, a chronicle of moves/events on the left,
// a two-row people filter under the map and a decade timeline that plays the family's story.
// Drawn imperatively (SVG + innerHTML) for smooth zoom and animation; MapPage only mounts it.
import { S, LANG, fullName, openPerson } from './core'
import { WORLD, countryAt } from './world'
import { BORDERS } from './borders'
import { FLAGS } from './passport'

const PALETTE = ['#F2C879', '#7FB8FF', '#79D9A6', '#F09BC0', '#5FD3D3', '#C9B4FF', '#F0776B', '#A6D86B', '#FFB070', '#8FA9FF', '#E6E6A0', '#FF9FD8']
const EV_MS = 1700, QUIET_MS = 110, MOVE_MS = 1500, STAR_MS = 1300 // a year with events lasts 1.7 s, a quiet year flies by

const TX = {
  ru: {
    chron: 'Хроника рода', moves: 'Переезды', all: 'Вся хроника', only: 'Только линия:', showAll: 'Показать всех', allLines: 'Все линии',
    noYear: 'Год не указан', dec: d => `${d}-е`, km: 'км', years: ['год истории', 'года истории', 'лет истории'], cities: ['город', 'города', 'городов'],
    kmWay: 'км в пути', countries: ['страна', 'страны', 'стран'], ctryLater: 'Страны появятся по ходу истории', starts: 'История начинается…',
    emptyPerson: m => `У этого человека пока нет ${m === 'moves' ? 'переездов' : 'событий'} с датой.`,
    empty: 'Добавьте в анкету события с местом — они появятся на карте и в хронике.', noPlace: 'место не указано',
    playing: 'идёт история', paused: 'пауза', play: 'Показать историю семьи', pause: 'Пауза', zin: 'Приблизить', zout: 'Отдалить', zfit: 'Вся семья',
    slider: 'Год на шкале времени', more: n => `и ещё ${n}`, map: 'Карта перемещений семьи', lines: 'Линии родственников',
    kind: { birth: 'рождение', move: 'переезд', study: 'учёба', work: 'работа', marriage: 'свадьба', deathF: 'ушла из жизни', deathM: 'ушёл из жизни', other: 'событие' },
  },
  en: {
    chron: 'Family chronicle', moves: 'Moves', all: 'Full chronicle', only: 'Only:', showAll: 'Show everyone', allLines: 'All lines',
    noYear: 'Year unknown', dec: d => `${d}s`, km: 'km', years: ['year of history', 'years of history'], cities: ['city', 'cities'],
    kmWay: 'km travelled', countries: ['country', 'countries'], ctryLater: 'Countries appear as the story unfolds', starts: 'The story begins…',
    emptyPerson: m => `This person has no dated ${m === 'moves' ? 'moves' : 'events'} yet.`,
    empty: 'Add events with a place to a profile — they will appear on the map and in the chronicle.', noPlace: 'no place given',
    playing: 'playing', paused: 'paused', play: 'Play the family story', pause: 'Pause', zin: 'Zoom in', zout: 'Zoom out', zfit: 'Whole family',
    slider: 'Year on the timeline', more: n => `and ${n} more`, map: 'Map of family moves', lines: 'Family lines',
    kind: { birth: 'birth', move: 'move', study: 'study', work: 'work', marriage: 'wedding', deathF: 'passed away', deathM: 'passed away', other: 'event' },
  },
}

// state that survives leaving the page, like the old map
const MV = { mode: 'all', only: null, view: null, refit: -1 }

const X = lo => (lo + 180) / 360 * 1000, Y = la => (90 - la) / 180 * 500
const yearOf = s => { const m = String(s || '').match(/(\d{4})/); return m ? +m[1] : null }
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const km = (a, b) => { const R = 6371, r = Math.PI / 180, dLa = (b.la - a.la) * r, dLo = (b.lo - a.lo) * r; const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.la * r) * Math.cos(b.la * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)) }
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

function starPath(cx, cy, R) { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? R * .4 : R; d += (i ? 'L' : 'M') + (cx + q * Math.cos(a)).toFixed(2) + ' ' + (cy + q * Math.sin(a)).toFixed(2) } return d + 'Z' }
/** Round flag icon from the passport's flag specs. */
function flagSvg(code, title) {
  const f = FLAGS[code]; let b = ''
  if (!f) b = `<rect width="24" height="24" fill="#3A4152"/><text x="12" y="15" font-size="8" text-anchor="middle" fill="#EEF1F7">${code}</text>`
  else {
    if (f.bg) b += `<rect width="24" height="24" fill="${f.bg}"/>`
    if (f.h) f.h.forEach((c, i, a) => { b += `<rect y="${i * 24 / a.length}" width="24" height="${24 / a.length + .3}" fill="${c}"/>` })
    if (f.v) f.v.forEach((c, i, a) => { b += `<rect x="${i * 24 / a.length}" width="${24 / a.length + .3}" height="24" fill="${c}"/>` })
    if (f.canton) b += `<rect width="12" height="13" fill="${f.canton}"/>`
    if (f.tri) b += `<path d="M0 0L12 12L0 24Z" fill="${f.tri}"/>`
    if (f.band) b += `<rect x="5" width="5" height="24" fill="${f.band}"/>`
    if (f.crossW) b += `<rect x="8" width="8" height="24" fill="${f.crossW}"/><rect y="8" width="24" height="8" fill="${f.crossW}"/>`
    if (f.cross) { const o = code === 'FI' || code === 'SE' ? -3 : 0; b += `<rect x="${10 + o}" width="4" height="24" fill="${f.cross}"/><rect y="10" width="24" height="4" fill="${f.cross}"/>` }
    if (f.star) b += `<path d="${f.starAt === 'tl' ? starPath(7.5, 8, 4.5) : starPath(12, 12.5, 6)}" fill="${f.star}"/>`
    if (f.sun) b += `<circle cx="12" cy="12" r="5.5" fill="${f.sun}"/><circle cx="12" cy="12" r="3" fill="none" stroke="${f.bg}" stroke-width="1"/>`
    if (f.disc) b += `<circle cx="12" cy="12" r="4.5" fill="${f.disc}"/>`
    if (f.crescent) b += `<circle cx="10.5" cy="12" r="5.5" fill="${f.crescent}"/><circle cx="12" cy="12" r="4.4" fill="${f.bg}"/>`
  }
  return `<svg viewBox="0 0 24 24" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${b}</svg>`
}

/** Mount the map page into `root`. Returns { update, refit, destroy }. */
export function mountMap(root) {
  const L = () => TX[LANG === 'en' ? 'en' : 'ru']
  const plural = (n, f) => { if (f.length === 2) return f[n === 1 ? 0 : 1]; const a = n % 10, b = n % 100; return f[(a === 1 && b !== 11) ? 0 : (a >= 2 && a <= 4 && (b < 12 || b > 14)) ? 1 : 2] }
  let regionNames = null; const cname = c => { try { regionNames = regionNames || new Intl.DisplayNames([LANG === 'en' ? 'en' : 'ru'], { type: 'region' }); return regionNames.of(c) || c } catch { return c } }

  root.innerHTML = `
    <aside class="mp-panel">
      <div class="mp-ph">
        <div><div class="eyebrow" data-r="chron"></div><h3 class="mp-ttl" data-r="ttl"></h3></div>
        <div class="mp-stats" data-r="stats"></div>
        <div class="mp-ctry" data-r="ctry"></div>
        <div class="mp-fnote" data-r="fnote" hidden></div>
      </div>
      <div class="mp-list" data-r="list"></div>
    </aside>
    <section class="mp-mapcol">
      <div class="mp-map" data-r="map">
        <svg data-r="svg">
          <g data-r="world">
            <path data-r="land" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.2)" stroke-width=".6" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
            <path data-r="borders" fill="none" stroke="rgba(255,255,255,.24)" stroke-width=".7" stroke-dasharray="3 2.5" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
          </g>
          <g data-r="routes"></g><g data-r="stations"></g><g data-r="labels"></g><g data-r="fx"></g><g data-r="deco"></g>
        </svg>
        <div class="mp-tl" data-r="tl">
          <div class="mp-tl-year" data-r="tlYear"></div>
          <div class="mp-tl-track" data-r="tlTrack" role="slider" tabindex="0">
            <div class="mp-tl-rail"><div class="mp-tl-fill" data-r="tlFill"></div></div>
            <div class="mp-tl-marks" data-r="tlMarks"></div><div class="mp-tl-labels" data-r="tlLabels"></div><div class="mp-tl-knob" data-r="tlKnob"></div>
          </div>
          <button class="mp-tl-play" data-r="tlPlay"></button>
        </div>
        <div class="mp-now" data-r="nowcard" aria-live="polite"></div>
        <div class="mp-ctrls">
          <button data-r="zin">+</button><button data-r="zout">−</button>
          <button data-r="zfit"><svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>
        </div>
        <div class="mp-tip" data-r="tip" hidden></div>
      </div>
      <div class="mp-lines" data-r="lines"></div>
    </section>`
  const $ = r => root.querySelector(`[data-r="${r}"]`)
  const list = $('list'), map = $('map'), tip = $('tip'), lines = $('lines')
  $('land').setAttribute('d', WORLD); $('borders').setAttribute('d', BORDERS)

  // ---------- model, rebuilt when the family data changes ----------
  let M = null
  const key = e => (+e.la).toFixed(2) + ',' + (+e.lo).toFixed(2)
  const byYear = (a, b) => (a.y ?? 9999) - (b.y ?? 9999)
  function build() {
    const t = L(), P = S.people
    const byId = Object.fromEntries(P.map(p => [p.id, p]))
    const evs = p => (p.events || []).map(e => ({ t: e.type, y: e.year === '' || e.year == null ? null : +e.year, pl: e.place || '', la: e.lat, lo: e.lon, no: e.note || '' }))
    const places = new Map(), travellers = []
    P.forEach(p => {
      const ev = evs(p), geo = ev.filter(e => e.la != null && e.lo != null && e.la !== '' && e.lo !== '').sort(byYear)
      p._ev = ev; if (!geo.length) return
      geo.forEach(e => { const k = key(e); if (!places.has(k)) places.set(k, { key: k, name: e.pl, la: +e.la, lo: +e.lo, c: countryAt(e.la, e.lo), visits: [] }); places.get(k).visits.push({ pid: p.id, ev: e }) })
      travellers.push({ p, geo, first: geo.find(e => e.y != null)?.y ?? 9999 })
    })
    travellers.sort((a, b) => a.first - b.first)
    const colorOf = {}; travellers.forEach((tr, i) => { tr.color = PALETTE[i % PALETTE.length]; colorOf[tr.p.id] = tr.color })
    const segs = []
    travellers.forEach(tr => { let prev = null; tr.geo.forEach(e => { if (prev && key(prev) !== key(e)) segs.push({ id: 's' + segs.length, pid: tr.p.id, a: key(prev), b: key(e), from: prev, to: e, km: km({ la: +prev.la, lo: +prev.lo }, { la: +e.la, lo: +e.lo }) }); prev = e }) })
    const kindOf = (ty, p) => ty === 'death' ? t.kind[p.gender === 'f' ? 'deathF' : 'deathM'] : (t.kind[ty] || t.kind.other)
    const moves = segs.map(s => ({ id: s.id, seg: s.id, pid: s.pid, y: s.to.y, kind: kindOf(s.to.t, byId[s.pid]), route: `${s.from.pl} → ${s.to.pl}`, km: s.km, note: s.to.no, geo: true }))
    const all = []
    P.forEach(p => {
      p._ev.forEach((e, i) => {
        const s = segs.find(s => s.to === e)
        const geo = e.la != null && e.la !== ''
        all.push({ id: s ? s.id : p.id + ':' + i, seg: s?.id, place: geo ? key(e) : null, pid: p.id, y: e.y, kind: kindOf(e.t, p), route: s ? `${s.from.pl} → ${s.to.pl}` : (e.pl || t.noPlace), km: s?.km, note: e.no, geo })
      })
      const has = ty => p._ev.some(e => e.t === ty)
      if (!has('birth') && yearOf(p.birthDate)) all.push({ id: p.id + ':b', pid: p.id, y: yearOf(p.birthDate), kind: t.kind.birth, route: p.birthPlace || t.noPlace, note: '', geo: false })
      if (!has('death') && yearOf(p.deathDate)) all.push({ id: p.id + ':d', pid: p.id, y: yearOf(p.deathDate), kind: kindOf('death', p), route: p.deathPlace || t.noPlace, note: '', geo: false })
    })
    const stamp = e => e.y ?? 9999
    moves.sort((a, b) => stamp(a) - stamp(b)); all.sort((a, b) => stamp(a) - stamp(b))
    const years = P.flatMap(p => [yearOf(p.birthDate), ...p._ev.map(e => e.y)]).filter(Boolean)
    // playback clock
    const evYears = new Set([...all, ...moves].map(e => e.y).filter(y => y != null))
    const has = evYears.size > 0
    const Y0 = has ? Math.min(...evYears) : 2000, YE = has ? Math.max(...evYears) + 1 : 2001
    const startAt = {}; let acc = 0
    for (let y = Y0; y <= YE; y++) { startAt[y] = acc; acc += evYears.has(y) ? EV_MS : QUIET_MS }
    const destSet = new Set(segs.map(x => x.to))
    const sparks = []
    travellers.forEach(tr => tr.geo.forEach((e, i) => { if (e.y == null || destSet.has(e)) return; sparks.push({ pid: tr.p.id, e, kind: e.t === 'marriage' ? 'wed' : (e.t === 'birth' || i === 0) ? 'star' : 'pulse' }) }))
    // family title: chosen name, else the most common surnames
    const sc = {}; P.forEach(p => { const l = p.last || ''; if (l) { const base = l.replace(/(ая|а)$/, m => m === 'ая' ? 'ий' : ''); sc[base] = (sc[base] || 0) + 1 } })
    const title = (S.settings.familyName || '').trim() || Object.entries(sc).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s]) => LANG === 'en' ? s : s.replace(/ий$/, 'ие').replace(/([^ие])$/, '$1ы')).join(', ')
    M = { byId, places, travellers, colorOf, segs, moves, all, years, firstYear: years.length ? Math.min(...years) : null, evYears, has, Y0, YE, T0: Math.floor(Y0 / 10) * 10, T1: Math.ceil(YE / 10) * 10, startAt, TOTAL: startAt[YE], destSet, sparks, title, totalKm: segs.reduce((s, x) => s + x.km, 0) }
  }
  const st = y => y == null ? Infinity : y < M.Y0 ? 0 : y > M.YE ? M.TOTAL : M.startAt[y]
  const durOf = y => M.evYears.has(y) ? EV_MS : QUIET_MS
  function yearAt(t) { for (let y = M.YE; y >= M.Y0; y--) if (t >= M.startAt[y]) return y + Math.min(.999, (t - M.startAt[y]) / durOf(y)); return M.Y0 }
  function timeAt(yf) { yf = Math.max(M.Y0, Math.min(M.YE, yf)); const y = Math.floor(yf); return Math.min(M.TOTAL, M.startAt[y] + (yf - y) * durOf(y)) }
  const vis = id => !MV.only || MV.only === id
  function appearAt(pl, any) { let m = Infinity; pl.visits.forEach(v => { if ((!any && !vis(v.pid)) || v.ev.y == null) return; const a = st(v.ev.y) + (M.destSet.has(v.ev) ? MOVE_MS * .95 : 0); if (a < m) m = a }); return m }
  const nameOf = id => fullName(M.byId[id])

  // ---------- transient state ----------
  const A = { anim: null, preview: null, hi: null, pin: null }
  let W = 0, H = 0, U = 1, shown = new Set(), sig = '', raf = null, flyRaf = null, last = 0, endTimer = null

  // ---------- static texts ----------
  function texts() {
    const t = L()
    $('chron').textContent = t.chron; $('ttl').textContent = M.title
    $('svg').setAttribute('aria-label', t.map); lines.setAttribute('aria-label', t.lines)
    $('zin').setAttribute('aria-label', t.zin); $('zout').setAttribute('aria-label', t.zout); $('zfit').setAttribute('aria-label', t.zfit); $('zfit').title = t.zfit
    $('tlTrack').setAttribute('aria-label', t.slider); $('tl').style.display = M.has ? '' : 'none'
  }

  // ---------- header stats (they grow while the story plays) ----------
  function renderStats() {
    const t = L(), an = A.anim, now = an ? Math.floor(yearAt(an.t)) : new Date().getFullYear()
    const all = [...M.places.values()], seen = an ? all.filter(pl => appearAt(pl, true) <= an.t) : all
    const kmDone = an ? M.segs.filter(x => x.to.y != null && an.t >= st(x.to.y) + MOVE_MS).reduce((s, x) => s + x.km, 0) : M.totalKm
    const ctry = [...new Set(seen.map(x => x.c).filter(Boolean))], span = M.firstYear ? Math.max(0, now - M.firstYear) : 0
    $('stats').innerHTML = [[span, plural(span, t.years)], [seen.length, plural(seen.length, t.cities)], [Math.round(kmDone).toLocaleString(LANG === 'en' ? 'en-US' : 'ru-RU'), t.kmWay]]
      .map(([b, s]) => `<div class="mp-stat"><b>${b}</b><span>${s}</span></div>`).join('')
    $('ctry').innerHTML = ctry.length ? `<span class="mp-flags">${ctry.map(c => flagSvg(c, cname(c))).join('')}</span><span>${ctry.length} ${plural(ctry.length, t.countries)}: ${ctry.map(cname).join(', ')}</span>`
      : (an ? `<span class="muted">${t.ctryLater}</span>` : '')
  }

  // ---------- chronicle ----------
  const entryById = id => M.moves.find(e => e.id === id) || M.all.find(e => e.id === id)
  function renderList() {
    const t = L(), an = A.anim, nowY = an ? Math.floor(yearAt(an.t)) : null
    const src = (MV.mode === 'moves' ? M.moves : M.all).filter(e => (!MV.only || e.pid === MV.only) && (!an || (e.y != null && an.t >= st(e.y))))
    let html = '', dec = null
    src.forEach(e => {
      const d = e.y == null ? t.noYear : t.dec(Math.floor(e.y / 10) * 10)
      if (d !== dec) { dec = d; html += `<div class="mp-dec">${d}</div>` }
      const cls = (an && !shown.has(e.id) ? ' fresh' : '') + (an && e.y === nowY ? ' now' : '') + (e.geo ? '' : ' nogeo') + (A.pin === e.id ? ' pin' : '')
      html += `<button class="mp-entry${cls}" data-id="${e.id}" style="--c:${M.colorOf[e.pid] || '#8E8676'}">
        <span class="yr">${e.y ?? '—'}</span><span class="rail"><i></i></span>
        <span class="bd"><span class="who">${esc(nameOf(e.pid))}<span class="kind">${e.kind}</span></span>
        <span class="route">${esc(e.route)}${e.km ? `<em>${Math.round(e.km).toLocaleString(LANG === 'en' ? 'en-US' : 'ru-RU')} ${t.km}</em>` : ''}</span>
        ${e.note ? `<span class="note">${esc(e.note)}</span>` : ''}</span></button>`
    })
    const grew = an && src.some(e => !shown.has(e.id))
    shown = an ? new Set(src.map(e => e.id)) : new Set()
    list.innerHTML = html || `<div class="mp-empty">${an ? t.starts : MV.only ? t.emptyPerson(MV.mode) : t.empty}</div>`
    if (grew && list.scrollHeight > list.clientHeight + 4) list.scrollTo({ top: list.scrollHeight, behavior: reduced() ? 'auto' : 'smooth' })
    const fn = $('fnote'); fn.hidden = !MV.only
    if (MV.only) fn.innerHTML = `<span>${t.only} <b>${esc(nameOf(MV.only))}</b></span><button data-act="clr">${t.showAll}</button>`
  }
  function renderChips() {
    const t = L()
    const chips = M.travellers.map(tr => `<button class="mp-chip${MV.only === tr.p.id ? ' on' : MV.only ? ' off' : ''}" data-p="${tr.p.id}" style="--c:${tr.color}"><i class="sw"></i>${esc(fullName(tr.p))}<span class="n">${tr.geo.length}</span></button>`)
    const all = `<button class="mp-chip all${MV.only ? '' : ' on'}" data-p="" style="--c:var(--accent)"><i class="sw"></i>${t.allLines}</button>`
    const row = [all, ...chips], half = Math.ceil(row.length / 2)
    lines.innerHTML = M.travellers.length ? `<div class="mp-row">${row.slice(0, half).join('')}</div><div class="mp-row">${row.slice(half).join('')}</div>` : ''
  }

  // ---------- view ----------
  function viewFor(pts, maxK) {
    const r = map.getBoundingClientRect(); W = r.width; H = r.height
    const xs = pts.map(p => X(+p.lo)), ys = pts.map(p => Y(+p.la))
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys)
    const padX = W < 600 ? 22 : Math.min(110, W * .1 + 40), padY = Math.min(70, H * .08 + 20), topBar = M.has ? (W < 600 ? 64 : 78) : 0
    const k = Math.max(W / 1000, Math.min(maxK * W / 1000 * 4, (W - 2 * padX) / Math.max(x1 - x0, 6), (H - topBar - 2 * padY) / Math.max(y1 - y0, 4)))
    return { k, tx: W / 2 - (x0 + x1) / 2 * k, ty: topBar + (H - topBar) / 2 - (y0 + y1) / 2 * k }
  }
  function flyTo(pts, maxK, animate = true) {
    if (!pts.length) { const r = map.getBoundingClientRect(); W = r.width; H = r.height; const k = W / 1000; MV.view = { k, tx: 0, ty: (H - 500 * k) / 2 }; draw(); return }
    const to = viewFor(pts, maxK), from = MV.view
    if (!animate || reduced() || !from) { MV.view = to; draw(); return }
    cancelAnimationFrame(flyRaf); const t0 = performance.now(), D = 650
    const step = now => { const tt = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - tt, 3)
      const k = from.k * Math.pow(to.k / from.k, e)
      const cx0 = (W / 2 - from.tx) / from.k, cy0 = (H / 2 - from.ty) / from.k, cx1 = (W / 2 - to.tx) / to.k, cy1 = (H / 2 - to.ty) / to.k
      const cx = cx0 + (cx1 - cx0) * e, cy = cy0 + (cy1 - cy0) * e
      MV.view = { k, tx: W / 2 - cx * k, ty: H / 2 - cy * k }; draw(); if (tt < 1) flyRaf = requestAnimationFrame(step) }
    flyRaf = requestAnimationFrame(step)
  }
  function fit(animate) {
    const pts = []; M.travellers.forEach(tr => { if (vis(tr.p.id)) tr.geo.forEach(e => pts.push(e)) })
    flyTo(pts.length ? pts : [...M.places.values()], 9, animate)
  }
  const sx = lo => X(lo) * MV.view.k + MV.view.tx, sy = la => Y(la) * MV.view.k + MV.view.ty

  // ---------- drawing ----------
  function draw() {
    if (!MV.view) return
    if (!W) { const r = map.getBoundingClientRect(); W = r.width; H = r.height }
    U = Math.max(.7, Math.min(1, W / 900))
    const { k, tx, ty } = MV.view, an = A.anim, T = an ? an.t : Infinity, C = M.colorOf
    $('world').setAttribute('transform', `translate(${tx} ${ty}) scale(${k})`)
    const focusP = A.preview, hiEntry = A.hi ? entryById(A.hi) : A.pin ? entryById(A.pin) : null
    const hiSeg = hiEntry?.seg || null, hiPlace = hiEntry && !hiEntry.seg ? hiEntry.place : null
    const live = M.segs.filter(s => vis(s.pid) && (!an || T >= st(s.to.y)))
    const bundles = new Map()
    live.forEach(s => { const bk = [s.a, s.b].sort().join('|'); if (!bundles.has(bk)) bundles.set(bk, []); const arr = bundles.get(bk); if (!arr.includes(s.pid)) arr.push(s.pid); s.bk = bk })

    let paths = '', glow = '', heads = ''; const drawn = new Set()
    live.forEach(s => {
      const isHi = s.id === hiSeg, dk = s.bk + '#' + s.pid, p = an ? Math.min(1, (T - st(s.to.y)) / MOVE_MS) : 1
      if (drawn.has(dk) && !isHi && p >= 1) return; drawn.add(dk)
      // people sharing a stretch get slightly different bends, so their lines sit side by side
      const [u, v] = s.bk.split('|').map(x => M.places.get(x)), arr = bundles.get(s.bk), lane = arr.indexOf(s.pid) - (arr.length - 1) / 2
      const x1 = sx(u.lo), y1 = sy(u.la), x2 = sx(v.lo), y2 = sy(v.la), dx = x2 - x1, dy = y2 - y1, Ln = Math.hypot(dx, dy) || 1
      const bend = Math.min(70, Ln * .2) + lane * 7 * U, mx = (x1 + x2) / 2 - dy / Ln * bend, my = (y1 + y2) / 2 + dx / Ln * bend
      const faded = !isHi && ((hiSeg && s.id !== hiSeg) || (focusP && s.pid !== focusP))
      if (p < 1) { // the move is being drawn, from the old home to the new one
        const e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2, fwd = s.a === u.key
        const ox = fwd ? x1 : x2, oy = fwd ? y1 : y2, ex = fwd ? x2 : x1, ey = fwd ? y2 : y1
        const hx = (1 - e) ** 2 * ox + 2 * (1 - e) * e * mx + e * e * ex, hy = (1 - e) ** 2 * oy + 2 * (1 - e) * e * my + e * e * ey
        paths += `<path d="M${ox.toFixed(1)} ${oy.toFixed(1)}Q${mx.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="${(1 - e).toFixed(4)}" stroke="${C[s.pid]}" stroke-width="2.6"/>`
        heads += `<circle cx="${hx}" cy="${hy}" r="9" fill="${C[s.pid]}" opacity=".22"/><circle cx="${hx}" cy="${hy}" r="3.6" fill="#fff"/>`
        return
      }
      const d = `M${x1.toFixed(1)} ${y1.toFixed(1)}Q${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`
      if (isHi) glow += `<path d="${d}" stroke="${C[s.pid]}" stroke-width="8" opacity=".25"/>`
      paths += `<path d="${d}" stroke="${C[s.pid]}" stroke-width="${isHi ? 3.2 : 2.1}" opacity="${faded ? .16 : 1}"/>`
    })
    $('routes').innerHTML = `<g fill="none" stroke-linecap="round">${glow}${paths}</g>${heads}`

    // stations: a little larger than plain dots; shared places get a light centre like an interchange
    let stn = ''; const placed = []
    const hiSt = new Set(); if (hiSeg) { const s = M.segs.find(x => x.id === hiSeg); if (s) hiSt.add(s.a).add(s.b) } if (hiPlace) hiSt.add(hiPlace)
    M.places.forEach(pl => {
      if (!pl.visits.some(v => vis(v.pid)) || (an && appearAt(pl) > T)) return
      const x = sx(pl.lo), y = sy(pl.la), who = [...new Set(pl.visits.filter(v => vis(v.pid) && (!an || (v.ev.y != null && st(v.ev.y) + (M.destSet.has(v.ev) ? MOVE_MS * .95 : 0) <= T))).map(v => v.pid))]
      if (!who.length) return
      const multi = who.length > 1, r = (multi ? 5.5 + Math.min(3, who.length * .4) : 4.5) * U + (hiSt.has(pl.key) ? 2 : 0)
      const faded = (hiSeg || hiPlace) ? !hiSt.has(pl.key) : focusP ? !who.includes(focusP) : false
      stn += `<g class="mp-stn" data-k="${pl.key}" opacity="${faded ? .3 : 1}">` + (multi
        ? `<circle cx="${x}" cy="${y}" r="${r}" fill="#EEF1F7" stroke="#0B0F17" stroke-width="2"/><circle cx="${x}" cy="${y}" r="${r * .42}" fill="#0B0F17"/>`
        : `<circle cx="${x}" cy="${y}" r="${r}" fill="${C[who[0]]}" stroke="#0B0F17" stroke-width="1.8"/>`) + `<circle cx="${x}" cy="${y}" r="${r + 6}" fill="transparent"/></g>`
      placed.push({ pl, x, y, r, pri: (hiSt.has(pl.key) ? 100 : 0) + pl.visits.length, faded, fade: an ? Math.min(1, (T - appearAt(pl)) / 500) : 1 })
    })
    $('stations').innerHTML = stn

    // labels with simple collision avoidance, busiest places first
    const boxes = [], hit = b => boxes.some(o => b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y)
    placed.forEach(s => boxes.push({ x: s.x - s.r, y: s.y - s.r, w: s.r * 2, h: s.r * 2 }))
    const top = M.has ? (W < 600 ? 64 : 78) : 4
    let lb = ''
    placed.sort((a, b) => b.pri - a.pri).forEach(s => {
      const fs = Math.max(11, (s.pl.visits.length > 8 ? 13.5 : 12) * U), w = s.pl.name.length * fs * .56, h = fs + 2
      const tries = [[s.x + s.r + 5, s.y + fs * .35, 'start'], [s.x - s.r - 5, s.y + fs * .35, 'end'], [s.x, s.y - s.r - 6, 'middle'], [s.x, s.y + s.r + fs + 2, 'middle']]
      for (const [x, y, a] of tries) { const bx = a === 'start' ? x : a === 'end' ? x - w : x - w / 2, b = { x: bx - 2, y: y - fs, w: w + 4, h }
        if ((!hit(b) && b.x > 4 && b.x + b.w < W - 4 && b.y > top) || s.pri >= 100) { boxes.push(b); lb += `<text x="${x}" y="${y}" text-anchor="${a}" font-size="${fs}" font-weight="${s.pl.visits.length > 3 ? 600 : 500}" opacity="${(s.faded ? .35 : 1) * s.fade}">${esc(s.pl.name)}</text>`; break } }
    })
    $('labels').innerHTML = `<g fill="#EEF1F7" stroke="#0B0F17" stroke-width="3" paint-order="stroke" stroke-linejoin="round">${lb}</g>`

    // twinkles for births, weddings and first appearances; a pulse for other events in place
    let fx = ''
    if (an) M.sparks.forEach(sp => { if (!vis(sp.pid)) return; const p = (T - st(sp.e.y)) / STAR_MS; if (p < 0 || p >= 1) return
      const x = sx(+sp.e.lo), y = sy(+sp.e.la), c = sp.kind === 'wed' ? '#F2C879' : C[sp.pid], a = Math.sin(Math.PI * p)
      if (sp.kind === 'pulse') { fx += `<circle cx="${x}" cy="${y}" r="${6 + 22 * p}" fill="none" stroke="${c}" stroke-width="2" opacity="${(1 - p).toFixed(3)}"/>`; return }
      const R = (8 + 10 * a) * U
      fx += `<circle cx="${x}" cy="${y}" r="${R * 1.5}" fill="${c}" opacity="${(.3 * a).toFixed(3)}"/><path transform="rotate(${(p * 90).toFixed(1)} ${x} ${y})" d="M${x} ${y - R}Q${x} ${y} ${x + R} ${y}Q${x} ${y} ${x} ${y + R}Q${x} ${y} ${x - R} ${y}Q${x} ${y} ${x} ${y - R}Z" fill="#fff" opacity="${a.toFixed(3)}"/>` })
    $('fx').innerHTML = fx

    // scale bar in real kilometres
    const midLat = 90 - ((H / 2 - ty) / k) / 500 * 180, kmPerPx = .36 * 111.32 * Math.cos(midLat * Math.PI / 180) / k
    const nice = [10, 20, 50, 100, 200, 250, 500, 1000, 2000, 5000].find(v => v / kmPerPx > 70) || 5000, bw = nice / kmPerPx
    $('deco').innerHTML = `<g transform="translate(18 ${H - 22})" font-family="JetBrains Mono,monospace" font-size="10.5" fill="#7C8698"><path d="M0 0H${bw}M0 -4V0M${bw} -4V0" stroke="#7C8698" stroke-width="1" fill="none"/><text x="${bw + 8}" y="3">${nice.toLocaleString(LANG === 'en' ? 'en-US' : 'ru-RU')} ${L().km}</text></g>`
  }

  // ---------- timeline & playback ----------
  const ICON = { play: '<svg viewBox="0 0 16 16"><path d="M4 2.5v11l9-5.5z"/></svg>', pause: '<svg viewBox="0 0 16 16"><path d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z"/></svg>', again: '<svg viewBox="0 0 16 16"><path d="M8 2.5a5.5 5.5 0 1 1-5.2 3.7l1.6.6A3.8 3.8 0 1 0 8 4.2V6L4.8 3.4 8 .8z"/></svg>' }
  const pos = y => (y - M.T0) / (M.T1 - M.T0) * 100
  let lastMarkY = null
  function buildTimeline() {
    $('tlMarks').innerHTML = [...M.evYears].sort().map(y => `<i data-y="${y}" style="left:${pos(y)}%"></i>`).join('')
    lastMarkY = null; lblW = -1; tlLabels()
  }
  // year captions: as many as fit without touching (a caption needs ~44 px), always on round years
  let lblW = -1
  function tlLabels() {
    const w = $('tlTrack').getBoundingClientRect().width; if (!w || Math.abs(w - lblW) < 4) return; lblW = w
    const span = M.T1 - M.T0, step = [10, 20, 30, 40, 50, 100, 200].find(s => span / s * 44 <= w) || 200
    let lbl = ''; for (let d = Math.ceil(M.T0 / step) * step; d <= M.T1; d += step) lbl += `<span style="left:${pos(d)}%">${d}</span>`
    $('tlLabels').innerHTML = lbl
  }
  function tlRender() {
    if (!M.has) return
    const t = L(), an = A.anim, yf = an ? yearAt(an.t) : M.YE, y = Math.floor(yf)
    $('tlYear').innerHTML = an ? `<b>${y}</b><span>${an.playing ? t.playing : t.paused}</span>` : `<b>${M.Y0}</b><span>— ${M.YE - 1}</span>`
    $('tlFill').style.width = pos(yf) + '%'; $('tlKnob').style.left = pos(yf) + '%'
    if (y !== lastMarkY) { lastMarkY = y; root.querySelectorAll('.mp-tl-marks i').forEach(i => i.classList.toggle('on', !an || +i.dataset.y <= y)) }
    const playing = an && an.playing, btn = $('tlPlay')
    btn.innerHTML = playing ? ICON.pause : (an && an.t >= M.TOTAL ? ICON.again : ICON.play); btn.setAttribute('aria-label', playing ? t.pause : t.play)
    const tr = $('tlTrack'); tr.setAttribute('aria-valuemin', M.T0); tr.setAttribute('aria-valuemax', M.T1); tr.setAttribute('aria-valuenow', y)
  }
  function syncPanel() {
    const an = A.anim, src = MV.mode === 'moves' ? M.moves : M.all
    const n = an ? src.filter(e => e.y != null && an.t >= st(e.y)).length : -1
    const s2 = an ? `${n}|${Math.floor(yearAt(an.t))}|${MV.mode}|${MV.only}` : `all|${MV.mode}|${MV.only}|${LANG}`
    if (s2 === sig) return
    sig = s2; renderList(); renderStats()
    // on a phone the chronicle sits below the map, so the latest event is echoed on the map itself
    const nc = $('nowcard'), lastE = an && src.filter(e => (!MV.only || e.pid === MV.only) && e.y != null && an.t >= st(e.y)).pop()
    nc.classList.toggle('on', !!lastE && W < 600)
    if (lastE) { nc.style.setProperty('--c', M.colorOf[lastE.pid]); nc.innerHTML = `<i></i><div><b>${lastE.y} · ${esc(nameOf(lastE.pid))}</b><br>${esc(lastE.route)} <span>${lastE.kind}</span></div>` }
  }
  function frame() { draw(); tlRender(); syncPanel() }
  function tick(now) {
    const an = A.anim; if (!an || !an.playing) return
    an.t += Math.min(64, now - last); last = now
    if (an.t >= M.TOTAL) { an.t = M.TOTAL; an.playing = false; frame()
      endTimer = setTimeout(() => { if (A.anim && !A.anim.playing && A.anim.t >= M.TOTAL) { A.anim = null; frame() } }, 1800); return }
    frame(); raf = requestAnimationFrame(tick)
  }
  function play() {
    clearTimeout(endTimer)
    if (!A.anim || A.anim.t >= M.TOTAL) { A.anim = { t: 0, playing: false }; shown = new Set(); A.pin = null; fit(true) }
    A.anim.playing = true; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); frame()
  }
  function pause() { if (A.anim) A.anim.playing = false; cancelAnimationFrame(raf); frame() }
  const startScrub = () => { clearTimeout(endTimer); if (!A.anim) { A.anim = { t: 0, playing: false }; shown = new Set() } A.anim.playing = false; cancelAnimationFrame(raf) }
  const scrubTo = e => { const r = $('tlTrack').getBoundingClientRect(), f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); startScrub(); A.anim.t = timeAt(M.T0 + f * (M.T1 - M.T0)); frame() }

  // ---------- events ----------
  const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); offs.push(() => el.removeEventListener(ev, fn, o)) }
  const offs = []
  on($('tlPlay'), 'click', () => (A.anim && A.anim.playing ? pause() : play()))
  let scrub = false
  on($('tlTrack'), 'pointerdown', e => { scrub = true; $('tlTrack').setPointerCapture(e.pointerId); scrubTo(e) })
  on($('tlTrack'), 'pointermove', e => { if (scrub) scrubTo(e) })
  on($('tlTrack'), 'pointerup', () => { scrub = false }); on($('tlTrack'), 'pointercancel', () => { scrub = false })
  on($('tlTrack'), 'keydown', e => { if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault()
    const y = A.anim ? Math.floor(yearAt(A.anim.t)) : M.YE; startScrub(); A.anim.t = timeAt(y + (e.key === 'ArrowRight' ? 1 : -1)); frame() })
  on($('fnote'), 'click', e => { if (e.target.closest('[data-act="clr"]')) setOnly(null) })
  on(list, 'pointerover', e => { const b = e.target.closest('.mp-entry'); if (!b) return; A.hi = b.dataset.id; draw() })
  on(list, 'pointerleave', () => { A.hi = null; draw() })
  on(list, 'click', e => {
    const b = e.target.closest('.mp-entry'); if (!b) return
    A.pin = A.pin === b.dataset.id ? null : b.dataset.id
    list.querySelectorAll('.mp-entry.pin').forEach(x => x.classList.remove('pin')); if (A.pin) b.classList.add('pin')
    const en = entryById(b.dataset.id), sg = en && M.segs.find(s => s.id === en.seg)
    if (A.pin && sg) flyTo([sg.from, sg.to], 2.2); else if (A.pin && en?.place) flyTo([M.places.get(en.place)], 3)
    draw()
  })
  function setOnly(id) { MV.only = MV.only === id ? null : id; A.pin = null; sig = ''; renderChips(); frame(); fit(true) }
  on(lines, 'click', e => { const b = e.target.closest('.mp-chip'); if (b) setOnly(b.dataset.p || null) })
  on(lines, 'pointerover', e => { const b = e.target.closest('.mp-chip'); A.preview = b && b.dataset.p ? b.dataset.p : null; draw() })
  on(lines, 'pointerleave', () => { A.preview = null; draw() })

  // pan, zoom, pinch; a tap on a single person's station opens their card
  const ptrs = new Map(); let drag = null, pinch = null, moved = false, downStn = null
  const zoomAt = (cx, cy, f) => { const v = MV.view, k = Math.min(W / 1000 * 40, Math.max(W / 1000, v.k * f)), r = k / v.k; MV.view = { k, tx: cx - (cx - v.tx) * r, ty: cy - (cy - v.ty) * r }; draw() }
  on(map, 'wheel', e => { e.preventDefault(); const r = map.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * .0016)) }, { passive: false })
  on(map, 'pointerdown', e => { if (e.target.closest('.mp-ctrls, .mp-tl')) return; ptrs.set(e.pointerId, [e.clientX, e.clientY]); map.setPointerCapture(e.pointerId); moved = false
    downStn = e.target.closest('.mp-stn')
    if (ptrs.size === 1) drag = { x: e.clientX, y: e.clientY, tx: MV.view.tx, ty: MV.view.ty }
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), k: MV.view.k }; drag = null } })
  on(map, 'pointermove', e => {
    if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, [e.clientX, e.clientY])
    const r = map.getBoundingClientRect()
    if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); zoomAt((a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top, (pinch.k * d / pinch.d) / MV.view.k); moved = true; return }
    if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 3) { moved = true; map.classList.add('drag') } if (moved) { MV.view = { ...MV.view, tx: drag.tx + dx, ty: drag.ty + dy }; draw(); tip.hidden = true } return }
    const s = e.target.closest && e.target.closest('.mp-stn'); if (!s) { tip.hidden = true; return }
    const t = L(), pl = M.places.get(s.dataset.k), vs = pl.visits.filter(v => vis(v.pid)).slice().sort((a, b) => (a.ev.y ?? 9999) - (b.ev.y ?? 9999))
    tip.innerHTML = `<b>${esc(pl.name)}</b> <span class="m">${pl.c ? esc(cname(pl.c)) : ''}</span>` + vs.slice(0, 7).map(v => `<div class="r"><i style="background:${M.colorOf[v.pid]}"></i>${esc(nameOf(v.pid))} <span class="m">${t.kind[v.ev.t] || ''} ${v.ev.y ?? ''}</span></div>`).join('') + (vs.length > 7 ? `<div class="m">${t.more(vs.length - 7)}</div>` : '')
    tip.hidden = false; tip.style.left = Math.min(e.clientX - r.left, W - 280) + 'px'; tip.style.top = Math.max(0, Math.min(e.clientY - r.top, H - tip.offsetHeight - 20)) + 'px'
  })
  const up = e => {
    if (downStn && !moved && ptrs.size === 1) { const pl = M.places.get(downStn.dataset.k), who = [...new Set(pl.visits.filter(v => vis(v.pid)).map(v => v.pid))]; if (who.length === 1) openPerson(who[0]) }
    ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) { drag = null; downStn = null; map.classList.remove('drag') }
  }
  on(map, 'pointerup', up); on(map, 'pointercancel', up); on(map, 'pointerleave', () => { tip.hidden = true })
  on($('zin'), 'click', () => zoomAt(W / 2, H / 2, 1.5)); on($('zout'), 'click', () => zoomAt(W / 2, H / 2, 1 / 1.5)); on($('zfit'), 'click', () => fit(true))
  const ro = new ResizeObserver(() => { const r = map.getBoundingClientRect(); if (!r.width) return; if (M && M.has) tlLabels(); const first = !W; W = r.width; H = r.height; if (first && !MV.view) fit(false); else draw() })
  ro.observe(map)

  // ---------- data changes ----------
  let dataSig = ''
  function update() {
    const s2 = LANG + '|' + (S.settings.familyName || '') + '|' + JSON.stringify(S.people.map(p => [p.id, p.first, p.last, p.gender, p.birthDate, p.birthPlace, p.deathDate, p.deathPlace, p.events]))
    if (s2 === dataSig) return
    const firstTime = !dataSig; dataSig = s2
    regionNames = null; if (A.anim) { A.anim = null; cancelAnimationFrame(raf) }
    build(); if (MV.only && !M.byId[MV.only]) MV.only = null
    texts(); buildTimeline(); renderChips(); sig = ''
    if (firstTime && MV.view) { const r = map.getBoundingClientRect(); W = r.width; H = r.height }
    frame()
  }
  update()
  return {
    update,
    refit(n) { if (n !== MV.refit) { MV.refit = n; fit(false) } },
    destroy() { cancelAnimationFrame(raf); cancelAnimationFrame(flyRaf); clearTimeout(endTimer); ro.disconnect(); offs.forEach(f => f()); A.anim = null },
  }
}
