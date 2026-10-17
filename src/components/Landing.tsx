import { useEffect, useRef, useState } from 'react'
import { globeMark } from '../lib/globe'
import { WORLD } from '../lib/world'
import girl1 from '../assets/avatars/girl1.webp'
import man1 from '../assets/avatars/man1.webp'
import man2 from '../assets/avatars/man2.webp'
import man3 from '../assets/avatars/man3.webp'
import woman1 from '../assets/avatars/woman1.webp'
import woman2 from '../assets/avatars/woman2.webp'
import woman3 from '../assets/avatars/woman3.webp'
import stWorld from '../assets/stickers/r_world.webp'
import st100 from '../assets/stickers/k_100.webp'
import stFaces from '../assets/stickers/c_faces.webp'
import stGen5 from '../assets/stickers/k_gen5.webp'
import st1000 from '../assets/stickers/r_1000.webp'
import stFace from '../assets/stickers/c_face.webp'
import stGgp from '../assets/stickers/k_ggp.webp'
import stRoots from '../assets/stickers/x_roots.webp'
import stCentury from '../assets/stickers/r_century.webp'
import stName from '../assets/stickers/s_name.webp'
import '../landing2.css'
import { demo } from '../lib/core'

// The welcome landing (October 2026). Screens alternate: white on ultramarine, ultramarine on paper.
// A calm first screen with a split-flap board of cities, a tree that grows by itself
// once it comes into view, what else Predki does in a bento grid, and one start at the end over a slowly turning globe.
// The demo family is the Cullens from «Twilight» — a pop-culture wink, no real people.
type L = 'ru' | 'en'
const TX = {
  ru: {
    l1: 'Мои предки', from: 'из', cities: ['Ташкента', 'Москвы', 'Токио', 'Читы', 'Берлина', 'Пензы', 'Риги', 'Казани', 'Одессы', 'Тбилиси'],
    sub: 'Конструктор семейного древа и карта миграции', start: 'Построить древо', demo: 'Смотреть пример древа', back: 'Вернуться к древу', scroll: 'Листайте',
    grow: 'Построй древо семьи за пару минут',
    tree: [['Ренесми', 'Каллен', '2006'], ['Эдвард', 'Каллен', '1901'], ['Белла', 'Свон', '1987'], ['Карлайл', 'Каллен', '1640'], ['Эсми', 'Каллен', '1895'], ['Чарли', 'Свон', '1964'], ['Рене', 'Дуайер', '1966']],
    moreH: 'А ещё',
    map: 'Карта миграций и событий',
    gaps: ['Пробелы вместе с семьёй', 'Подсветим годы без записей и подскажем, кто из родных может их помнить.'],
    q: 'Где жил твой папа Эдвард с 1918 по 2005 год?', answer: 'Ответить', life: ['1901', '1918–2005', '2006'],
    cal: ['Календарь памятных дат', 'Дни рождения, годовщины и даты свадеб в одном календаре — для iOS, Android или компьютеров.'],
    calRows: [['20', 'июн', 'Эдвард Каллен', '125 лет со дня рождения', 'm'], ['13', 'авг', 'Эдвард и Белла', 'Годовщина свадьбы · 20 лет', 'w'], ['13', 'сен', 'Белла Свон', 'День рождения · 39 лет', 'b']],
    album: 'Альбом наклеек',
    endH: 'Начни с себя', endP: 'Остальное подскажут родные', privacy: 'Политика конфиденциальности',
    places: { lon: 'Лондон', vol: 'Вольтерра', chi: 'Чикаго', for: 'Форкс', phx: 'Финикс', col: 'Колумбус', jax: 'Джэксонвилл' },
  },
  en: {
    l1: 'My ancestors', from: 'are from', cities: ['Tashkent', 'Moscow', 'Tokyo', 'Chita', 'Berlin', 'Penza', 'Riga', 'Kazan', 'Odesa', 'Tbilisi'],
    sub: 'A family tree builder and a migration map', start: 'Build the tree', demo: 'See a sample tree', back: 'Back to the tree', scroll: 'Scroll',
    grow: 'Build your family tree in a couple of minutes',
    tree: [['Renesmee', 'Cullen', '2006'], ['Edward', 'Cullen', '1901'], ['Bella', 'Swan', '1987'], ['Carlisle', 'Cullen', '1640'], ['Esme', 'Cullen', '1895'], ['Charlie', 'Swan', '1964'], ['Renée', 'Dwyer', '1966']],
    moreH: 'And also',
    map: 'Map of migrations and events',
    gaps: ['Gaps, together with family', 'We highlight years with no records and suggest which relatives may remember them.'],
    q: 'Where did your dad Edward live from 1918 to 2005?', answer: 'Answer', life: ['1901', '1918–2005', '2006'],
    cal: ['Calendar of family dates', 'Birthdays, anniversaries and wedding dates in one calendar — for iOS, Android or computers.'],
    calRows: [['20', 'Jun', 'Edward Cullen', '125 years since birth', 'm'], ['13', 'Aug', 'Edward and Bella', 'Wedding anniversary · 20 years', 'w'], ['13', 'Sep', 'Bella Swan', 'Birthday · turns 39', 'b']],
    album: 'Sticker album',
    endH: 'Start with yourself', endP: 'Your family will tell you the rest', privacy: 'Privacy policy',
    places: { lon: 'London', vol: 'Volterra', chi: 'Chicago', for: 'Forks', phx: 'Phoenix', col: 'Columbus', jax: 'Jacksonville' },
  },
}
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v))
/** runs once when the element comes into view */
function useSeen<T extends Element>(threshold = .35) {
  const ref = useRef<T>(null), [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return; if (reduced()) { setSeen(true); return }
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { setSeen(true); io.disconnect() } }, { threshold })
    io.observe(el); return () => io.disconnect()
  }, [])
  return [ref, seen] as const
}

// ---------------------------------------------------------------- split-flap board
const ABC = { ru: 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ', en: 'ABCDEFGHIJKLMNOPRSTUVWXYZ' }
/** A row of flap cells. Each cell flips through a few random letters and lands on its own one, a little after its left neighbour. */
function SplitFlap({ words, lang }: { words: string[]; lang: L }) {
  const ref = useRef<HTMLSpanElement>(null)
  const N = Math.max(...words.map(w => w.length))
  useEffect(() => {
    const root = ref.current!; const cells = [...root.querySelectorAll<HTMLElement>('.sf-c')]
    const state = cells.map(() => ' '); const timers: ReturnType<typeof setTimeout>[] = []
    const show = (c: HTMLElement, ch: string) => { c.querySelectorAll<HTMLElement>('.sf-h b').forEach(h => { h.textContent = ch }) }
    const flipTo = (i: number, ch: string, dur: number) => {
      const c = cells[i], cur = state[i]; state[i] = ch
      const top = c.querySelector<HTMLElement>('.sf-top b')!, bot = c.querySelector<HTMLElement>('.sf-bot b')!
      const ft = c.querySelector<HTMLElement>('.sf-ft b')!, fb = c.querySelector<HTMLElement>('.sf-fb b')!
      top.textContent = ch; bot.textContent = cur; ft.textContent = cur; fb.textContent = ch
      c.style.setProperty('--d', dur + 'ms'); c.classList.remove('go'); void c.offsetWidth; c.classList.add('go')
      timers.push(setTimeout(() => { bot.textContent = ch }, dur))
    }
    const word = (w: string, first: boolean) => {
      const up = w.toLocaleUpperCase(lang).padEnd(N, ' ')
      cells.forEach((c, i) => {
        if (reduced()) { state[i] = up[i]; show(c, up[i]); return }
        const steps = up[i] === ' ' && state[i] === ' ' ? 0 : 2 + ((i * 7 + w.length) % 4), D = 70
        const seq = [...Array(steps).keys()].map(() => ABC[lang][Math.floor(Math.random() * ABC[lang].length)]).concat(up[i])
        if (!steps) return
        seq.forEach((ch, k) => timers.push(setTimeout(() => flipTo(i, ch, D), (first ? 300 : 0) + i * 55 + k * (D + 8))))
      })
    }
    let n = 0; word(words[0], true)
    const iv = setInterval(() => { n = (n + 1) % words.length; word(words[n], false) }, 2900)
    return () => { clearInterval(iv); timers.forEach(clearTimeout) }
  }, [words.join('|'), lang])
  return <span className="sf" ref={ref} aria-label={words[0]} role="img">
    {[...Array(N).keys()].map(i => <span className="sf-c" key={i} aria-hidden="true">
      <span className="sf-h sf-top"><b /></span><span className="sf-h sf-bot"><b /></span><span className="sf-h sf-ft"><b /></span><span className="sf-h sf-fb"><b /></span>
    </span>)}
  </span>
}

// ---------------------------------------------------------------- the tree: grows by itself in about two seconds when it comes into view
// Renesmee on top, her parents Edward and Bella, then Edward's (Carlisle, Esme) and Bella's (Charlie, Renée)
const AV = [girl1, man1, woman1, man3, woman2, man2, woman3]
const CW = 132, CH = 148
const POS: [number, number][] = [[400, 0], [200, 210], [600, 210], [100, 420], [300, 420], [500, 420], [700, 420]]
const KIDS: [number, number][] = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]]
/** timeline of the growth, in parts of the whole run: when each card blooms and each branch draws */
const CARD_AT = [0, .34, .34, .76, .76, .76, .76], LINE_AT = [.1, .1, .5, .5, .5, .5], GROW_MS = 2200
function GrowingTree({ T }: { T: typeof TX.ru }) {
  const [ref, seen] = useSeen<HTMLDivElement>(.45), [p, setP] = useState(reduced() ? 1 : 0)
  useEffect(() => {
    if (!seen || reduced()) return
    let raf = 0; const t0 = performance.now()
    const step = (now: number) => { const v = clamp((now - t0) / GROW_MS); setP(v); if (v < 1) raf = requestAnimationFrame(step) }
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf)
  }, [seen])
  const ease = (v: number) => 1 - Math.pow(1 - v, 3)
  const card = (i: number) => ease(clamp((p - CARD_AT[i]) / .16)), line = (k: number) => clamp((p - LINE_AT[k]) / .26)
  const words = ease(clamp((p - .86) / .14))
  return (
    <section className="lp-grow paper">
      <div className="lp-grow-in" ref={ref}>
        <svg className="lp-tree" viewBox={`-10 -10 ${800 + 20} ${420 + CH + 20}`} role="img" aria-label={T.grow}>
          <defs><clipPath id="lpAv" clipPathUnits="objectBoundingBox"><circle cx=".5" cy=".5" r=".5" /></clipPath></defs>
          {KIDS.map(([a, b], k) => {
            const [ax, ay] = POS[a], [bx, by] = POS[b], sx = ax, sy = ay + CH, y1 = by, m = (sy + y1) / 2
            return <path key={k} d={`M${sx} ${sy}C${sx} ${m} ${bx} ${m} ${bx} ${y1}`} pathLength={1} className="lp-br"
              style={{ strokeDashoffset: 1 - line(k), opacity: line(k) > 0 ? 1 : 0 }} />
          })}
          {POS.map(([x, y], i) => { const v = card(i), [f, l, yr] = T.tree[i]
            return <g key={i} className="lp-card" style={{ opacity: v, transform: `translate(${x - CW / 2}px, ${y + (1 - v) * 14}px) scale(${.86 + .14 * v})`, transformOrigin: `${x}px ${y + CH / 2}px` }}>
              <rect width={CW} height={CH} rx="10" />
              <circle cx={CW / 2} cy="44" r="30" className="av-bg" />
              <image href={AV[i]} x={CW / 2 - 30} y="14" width="60" height="60" clipPath="url(#lpAv)" preserveAspectRatio="xMidYMid slice" />
              <text x={CW / 2} y="97" textAnchor="middle" className="nm">{f.toLocaleUpperCase()}</text>
              <text x={CW / 2} y="115" textAnchor="middle" className="nm">{l.toLocaleUpperCase()}</text>
              <text x={CW / 2} y="133" textAnchor="middle" className="yr">{yr}</text>
            </g> })}
        </svg>
        <h2 className="lp-grow-h" style={{ opacity: words, transform: `translateY(${(1 - words) * 18}px)` }}>{T.grow}</h2>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------- what else: routes on a map, a gap, dates, a handful of stickers
const X = (lo: number) => (lo + 180) / 360 * 1000, Y = (la: number) => (90 - la) / 180 * 500
const CITY: Record<string, [number, number]> = { lon: [51.51, -0.13], vol: [43.40, 10.86], chi: [41.88, -87.63], for: [47.95, -124.39], phx: [33.45, -112.07], col: [39.96, -83.0], jax: [30.33, -81.66] }
/** each person's route: city to city, drawn as one connected line, one after another */
const ROUTES: { c: string; via: string[]; bend: number }[] = [
  { c: '#F2C879', via: ['lon', 'vol', 'chi', 'for'], bend: 1 },   // Carlisle
  { c: '#7FB8FF', via: ['chi', 'for'], bend: -1 },               // Edward
  { c: '#9C9BFF', via: ['col', 'chi', 'for'], bend: 1.6 },       // Esme
  { c: '#F09BC0', via: ['phx', 'for'], bend: 1 },                // Bella
  { c: '#F7A48A', via: ['phx', 'jax'], bend: -1 },               // Renée
]
const arc = (a: string, b: string, bend: number) => {
  const [la1, lo1] = CITY[a], [la2, lo2] = CITY[b], x1 = X(lo1), y1 = Y(la1), x2 = X(lo2), y2 = Y(la2), dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), k = Math.min(16, L * .2) * bend
  return `Q${((x1 + x2) / 2 - dy / L * k).toFixed(1)} ${((y1 + y2) / 2 + dx / L * k).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`
}
function MiniMap({ T }: { T: typeof TX.ru }) {
  const [ref, seen] = useSeen<SVGSVGElement>()
  const right = new Set(['for', 'phx'])
  // a phone tile is taller: show more of the map around the same routes
  const [narrow, setNarrow] = useState(() => typeof matchMedia === 'function' && matchMedia('(max-width:600px)').matches)
  useEffect(() => { const m = matchMedia('(max-width:600px)'), f = () => setNarrow(m.matches); m.addEventListener('change', f); return () => m.removeEventListener('change', f) }, [])
  return <svg ref={ref} className={'lp-map' + (seen ? ' on' : '')} viewBox={narrow ? '136 22 420 250' : '132 70 422 150'} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <path d={WORLD} className="land" />
    {ROUTES.map((r, i) => { const [la, lo] = CITY[r.via[0]]; let d = `M${X(lo).toFixed(1)} ${Y(la).toFixed(1)}`
      for (let k = 1; k < r.via.length; k++) d += arc(r.via[k - 1], r.via[k], r.bend)
      return <path key={i} d={d} pathLength={1} className="rt" style={{ stroke: r.c, transitionDelay: `${.3 + i * .45}s` }} /> })}
    {Object.entries(CITY).map(([k, [la, lo]], i) => <g key={k} className="st" style={{ transitionDelay: `${.1 + i * .1}s` }}>
      <circle cx={X(lo)} cy={Y(la)} r="2.1" />
      <text x={X(lo) + (right.has(k) ? 4 : -4)} y={Y(la) + (k === 'chi' ? -3.5 : k === 'col' ? 7.5 : 1.8)} textAnchor={right.has(k) ? 'start' : 'end'}>{T.places[k as keyof typeof T.places]}</text>
    </g>)}
  </svg>
}

// ten stickers in two rows; the three rarest shimmer, as in the album itself
const STICKERS: [string, boolean][] = [[stWorld, true], [stGen5, false], [stFace, false], [st100, true], [stRoots, false], [st1000, false], [stName, false], [stFaces, true], [stCentury, false], [stGgp, false]]
const TILT = [-6, 4, -3, 5, -4, 3, -5, 4, -2, 6], LIFT = [0, 8, -4, 6, -2, -3, 6, -6, 4, 0]
function Features({ T }: { T: typeof TX.ru }) {
  return (
    <section className="lp-more blue"><div className="lp-more-in">
      <h2 className="lp-h2">{T.moreH}</h2>
      <div className="lp-bento">
        <article className="lp-t t-map"><div className="tx"><h3>{T.map}</h3></div><MiniMap T={T} /></article>
        <article className="lp-t t-gaps">
          <div className="tx"><h3>{T.gaps[0]}</h3><p>{T.gaps[1]}</p></div>
          <div className="lp-gap" aria-hidden="true">
            <div className="life"><i className="k" style={{ left: '0%', width: '16%' }} /><i className="g" style={{ left: '16%', width: '78%' }} /><i className="k" style={{ left: '94%', width: '6%' }} /></div>
            <div className="yrs"><span>{T.life[0]}</span><span className="g">{T.life[1]}</span><span>{T.life[2]}</span></div>
            <div className="bub"><p>{T.q}</p><span className="ans">{T.answer}</span></div>
          </div>
        </article>
        <article className="lp-t t-cal">
          <div className="tx"><h3>{T.cal[0]}</h3><p>{T.cal[1]}</p></div>
          <ul className="lp-dates" aria-hidden="true">{T.calRows.map(([d, m, n, l, k]) => <li key={n} className={'k-' + k}><span className="dt"><b>{d}</b>{m}</span><span><b>{n}</b>{l}</span></li>)}</ul>
        </article>
        <article className="lp-t t-album">
          <h3>{T.album}</h3>
          <div className="lp-stk" aria-hidden="true">{STICKERS.map(([src, holo], i) => <span key={i} className="art" style={{ transform: `rotate(${TILT[i]}deg) translateY(${LIFT[i]}px)` }}>
            <img src={src} alt="" />{holo && <span className="holo" style={{ WebkitMaskImage: `url(${src})`, maskImage: `url(${src})`, animationDelay: `${-i * 1.3}s` }} />}</span>)}</div>
        </article>
      </div>
    </div></section>
  )
}

// ---------------------------------------------------------------- the end: a slowly turning dotted ultramarine globe — the logo, grown big — with warm lights of family cities
const LIGHTS: [number, number][] = [[41.30, 69.24], [55.75, 37.62], [35.68, 139.69], [52.03, 113.50], [52.52, 13.41], [53.20, 45.00], [56.95, 24.11], [55.79, 49.12], [46.48, 30.73], [45.80, 126.53], [41.72, 44.79], [40.71, -74.01], [47.95, -124.39], [41.88, -87.63], [51.51, -0.13]]
function Globe() {
  const cv = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = cv.current!; let raf = 0, vis = false, last = 0; const t0 = performance.now()
    const draw = (t: number) => {
      const dpr = Math.min(2, devicePixelRatio || 1), W = Math.round(c.clientWidth * dpr), H = Math.round(c.clientHeight * dpr); if (!W || !H) return
      if (c.width !== W || c.height !== H) { c.width = W; c.height = H }
      const x = c.getContext('2d')!; x.clearRect(0, 0, W, H)
      const mob = W < H, R = mob ? W * .66 : Math.min(W * .4, H * .78), cx = W / 2, cy = mob ? H * 1.02 : H * .6 + R, rot = t * .12, tilt = .35
      let g = x.createRadialGradient(cx, cy, R * .96, cx, cy, R * 1.18); g.addColorStop(0, 'rgba(37,51,255,.28)'); g.addColorStop(1, 'rgba(37,51,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R * 1.18, 0, 7); x.fill()
      g = x.createRadialGradient(cx - R * .35, cy - R * .4, R * .1, cx, cy, R); g.addColorStop(0, '#4A57FF'); g.addColorStop(1, '#1622C4'); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R, 0, 7); x.fill()
      const P = (la: number, lo: number) => { const A = la * Math.PI / 180, Lo = lo * Math.PI / 180 + rot, px = Math.cos(A) * Math.sin(Lo), py = Math.sin(A), pz = Math.cos(A) * Math.cos(Lo); return [cx + px * R, cy - (py * Math.cos(tilt) - pz * Math.sin(tilt)) * R, py * Math.sin(tilt) + pz * Math.cos(tilt)] }
      const ds = Math.max(1.2, R / 260)
      for (let la = -80; la <= 80; la += 6) { const n = Math.max(6, Math.round(60 * Math.cos(la * Math.PI / 180))); for (let i = 0; i < n; i++) { const [px, py, pz] = P(la, i * 360 / n); if (pz < 0) continue; x.fillStyle = `rgba(244,242,236,${.22 + .6 * pz})`; x.beginPath(); x.arc(px, py, ds * (.6 + .6 * pz), 0, 7); x.fill() } }
      const hot = Math.floor(t / 2.2) % LIGHTS.length
      LIGHTS.forEach(([la, lo], i) => { const [px, py, pz] = P(la, lo); if (pz < .05) return; const h = i === hot, r = (h ? 7 : 4.2) * ds * (.7 + .3 * pz)
        const gg = x.createRadialGradient(px, py, 0, px, py, r * 5); gg.addColorStop(0, `rgba(255,201,77,${h ? .8 : .5})`); gg.addColorStop(1, 'rgba(255,201,77,0)'); x.fillStyle = gg; x.beginPath(); x.arc(px, py, r * 5, 0, 7); x.fill()
        x.fillStyle = h ? '#FFF3D6' : '#FFC94D'; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill() })
      x.strokeStyle = 'rgba(37,51,255,.5)'; x.lineWidth = 1.5 * dpr; x.beginPath(); x.arc(cx, cy, R, 0, 7); x.stroke()
    }
    const loop = (now: number) => { raf = 0; if (!vis) return; raf = requestAnimationFrame(loop); if (now - last < 1000 / 30) return; last = now; draw(reduced() ? 0 : (now - t0) / 1000) }
    const io = new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis && !raf) raf = requestAnimationFrame(loop) }); io.observe(c)
    const rs = () => draw((performance.now() - t0) / 1000); addEventListener('resize', rs); draw(0)
    return () => { io.disconnect(); cancelAnimationFrame(raf); removeEventListener('resize', rs) }
  }, [])
  return <canvas ref={cv} className="lp-globe" aria-hidden="true" />
}

// ---------------------------------------------------------------- the page
export default function Landing({ lang, hasData, onStart, onLang, onDemo }: { lang: L; hasData: boolean; onStart: (how: 'blank' | null) => void; onLang: (l: L) => void; onDemo?: () => void }) {
  const T = TX[lang], root = useRef<HTMLDivElement>(null)
  // back from the sample tree: the landing opens where its button was, at the end
  useEffect(() => { const r = root.current; if (!r) return; if (demo.backToEnd) { demo.backToEnd = false; r.scrollTo(0, r.scrollHeight) } else r.scrollTo(0, 0) }, [])
  const go = () => onStart(hasData ? null : 'blank')
  const Start = ({ big }: { big?: boolean }) => <div className={'lp-acts' + (big ? ' big' : '')}><button type="button" className={'lp-btn ' + (big ? 'blue' : 'white')} onClick={go}>{hasData ? T.back : T.start}</button>
    {big && onDemo && <button type="button" className="lp-btn ghost" onClick={onDemo}>{T.demo}</button>}</div>
  return (
    <div id="lp" ref={root}>
      <header className="lp-top">
        <button type="button" className="lp-brand" onClick={go} aria-label="Predki"><span className="mk" dangerouslySetInnerHTML={{ __html: globeMark('#FFFFFF', 22) }} />PREDKI</button>
        <div className="lp-lang" role="group" aria-label="Language">{(['ru', 'en'] as const).map(l => <button key={l} type="button" aria-pressed={lang === l} onClick={() => lang !== l && onLang(l)}>{l.toUpperCase()}</button>)}</div>
      </header>
      <section className="lp-hero blue">
        <h1><span className="l1">{T.l1}</span><span className="l2"><span className="from">{T.from}</span><SplitFlap words={T.cities} lang={lang} /></span></h1>
        <p className="lp-sub">{T.sub}</p>
        <Start />
        <span className="lp-scroll" aria-hidden="true">{T.scroll}<i /></span>
      </section>
      <GrowingTree T={T} />
      <Features T={T} />
      <section className="lp-end paper">
        <Globe />
        <div className="lp-end-in">
          <h2>{T.endH}</h2><p>{T.endP}</p>
          <Start big />
        </div>
        <footer className="lp-foot"><a href="privacy.html" target="_blank" rel="noopener">{T.privacy}</a></footer>
      </section>
    </div>
  )
}
