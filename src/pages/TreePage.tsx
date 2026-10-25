import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { S, ui, t, LANG, byId, yearOf, showYear, parentsOf, childrenOf, yearsOf, avatarSmall, fullName, fillPercent, generations, openPerson, openPet, closePanel, editPerson, bump, type Person } from '../lib/core'
import { addRelative } from '../lib/relations'
import { frameOf, frameArt } from '../lib/frames'
import { petsOf, petSpot, petIcon, petYears, kindName, PET_R } from '../lib/pets'
import { themeOf } from '../lib/treeStyle'
import TreeStyle from '../components/TreeStyle'
import { openCalendar } from '../components/FamilyCalendar'
import { layout, familyColors, rootPerson, NW, NH, PG } from '../lib/treeLayout'
import { kinship, chainName } from '../lib/kinship'
import { Progress } from '../lib/progress'
import { NextStop } from '../components/Chapters'
import { nextStep } from '../lib/chapters'
import { distances, FRIEND } from '../lib/demo'
import ShareDialog, { ShareIcon } from '../components/ShareDialog'

/** The demo tree («Смотреть пример древа»): no page header, no adding, labels from the demo family, growth from the face on first open */
export interface DemoView { labels: Record<string, string>; face: string; intro: number }
/** growth on the demo's first open: each step away from the face starts a little later */
export const INTRO_START = .4
/** a big dynasty grows faster per step, so the whole growth stays within about seven seconds */
export const introStep = (maxD: number) => Math.min(.5, 6.5 / Math.max(1, maxD))

/** «39 человек · 6 поколений» — full words, with the right Russian plural. */
function treeSub(n: number, g: number) {
  const ru = LANG !== 'en', pl = (k: number, f: string[]) => { const a = k % 10, b = k % 100; return f[(a === 1 && b !== 11) ? 0 : (a >= 2 && a <= 4 && (b < 12 || b > 14)) ? 1 : 2] }
  return t('tree.sub', { n, g, people: ru ? pl(n, ['человек', 'человека', 'человек']) : n === 1 ? 'person' : 'people', gens: ru ? pl(g, ['поколение', 'поколения', 'поколений']) : g === 1 ? 'generation' : 'generations' })
}

// Names are measured with the same font the card uses, so long surnames get an ellipsis inside the card.
// Names: condensed capitals; kinship: small mono capitals with tracking (canvas does not track, so it is added by hand).
let measureCtx: CanvasRenderingContext2D | null = null
const NM_FONT = '800 17px "Sofia Sans Extra Condensed", "Arial Narrow", sans-serif', KN_FONT = '500 10px "IBM Plex Mono", ui-monospace, monospace'
function fitText(s: string, max: number, font = NM_FONT, track = 0) {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d')
  const ctx = measureCtx!; ctx.font = font
  const w = (x: string) => ctx.measureText(x).width + x.length * track
  if (w(s) <= max) return s
  let x = s; while (x.length > 2 && w(x.trimEnd() + '…') > max) x = x.slice(0, -1)
  return x.trimEnd() + '…'
}
const up = (s: string) => s.toLocaleUpperCase(LANG === 'en' ? 'en' : 'ru')
type View = { x: number; y: number; k: number }
// pan/zoom survive switching pages, like in the prototype
const TV = { view: { x: 0, y: 0, k: 1 } as View, fitted: false, lastN: -1, lastSz: '', refit: -1, lastTop: -1, introAt: 0, tk: 0, raf: 0, pan: null as null | { x: number; y: number } }
// growth: who has just appeared in the tree (their branch draws, the card blooms)
const GROW = { known: null as Set<string> | null, refit: -1, ids: new Set<string>(), until: 0, n: 0, timer: 0 as ReturnType<typeof setTimeout> | 0 }
const GROW_MS = 4700

// Square cards, all the same size. A frame goes along the card's own edge and the content shrinks a little to fit inside it.


/** portrait in a circle, first name and surname on two lines in capitals, years */
function Portrait({ p, yrs, kin }: { p: Person; yrs: string; kin: boolean }) {
  const r = 28, rows = [p.first, p.last].filter(Boolean); if (!rows.length) rows.push(fullName(p))
  const h = 2 * r + 9 + rows.length * 17 + (yrs ? 15 : 0), top = kin ? 25 : 8, cy = top + (NH - 6 - top - h) / 2 + r, y = cy + r + 22
  return <>
    <circle className="av-bg" cx={NW / 2} cy={cy} r={r} />
    <image className="av" href={avatarSmall(p)} x={NW / 2 - r} y={cy - r} width={2 * r} height={2 * r} clipPath="url(#avClip)" preserveAspectRatio="xMidYMid slice" />
    {rows.map((s, i) => <text key={i} className="nm" x={NW / 2} y={y + i * 17} textAnchor="middle">{fitText(up(s), NW - 18)}</text>)}
    {yrs && <text className="yr" x={NW / 2} y={y + rows.length * 17 - 1} textAnchor="middle">{yrs}</text>}
  </>
}


/** the memorial date can be closed with the cross: it stays hidden until the next date comes up (remembered in this browser) */
const MEMO_KEY = 'predki:memoHide'
const memoKey = (m: { id: string; day: number; month: string }) => `${m.id}:${m.day}.${m.month}`
const memoHidden = (m: { id: string; day: number; month: string } | null) => { if (!m) return true; try { return localStorage.getItem(MEMO_KEY) === memoKey(m) } catch { return false } }
function Memo({ onClose }: { onClose: () => void }) {
  const m = Progress.nearestBirthday(); if (!m) return null
  const close = () => { try { localStorage.setItem(MEMO_KEY, memoKey(m)) } catch { /* private mode */ } onClose() }
  return (
    <div className="tree-memo-w">
      <button className="tree-memo" id="treeMemo" type="button" onClick={openCalendar}>
        <span className="d" aria-hidden="true"><span className="m">{m.month}</span><b>{m.day}</b></span>
        <span className="tx">{m.line} <b>{m.name}</b></span>
      </button>
      <button type="button" className="ns-x memo-x" onClick={close} aria-label={LANG === 'en' ? 'Hide' : 'Скрыть'}><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
    </div>
  )
}

/** a spark that runs along a new branch once, from the relative to the newcomer */
function Spark({ d, color, n, rev }: { d: string; color: string; n: number; rev?: boolean }) {
  const ref = useRef<SVGAnimateMotionElement>(null)
  useEffect(() => { const a = ref.current; if (!a) return; const h = setTimeout(() => { try { a.beginElement() } catch { /* no SMIL */ } }, matchMedia('(max-width:860px)').matches ? 600 : 200); return () => clearTimeout(h) }, [n])
  return <circle className="spark" r="4.5" style={{ fill: color, color }}>
    <animateMotion ref={ref} begin="indefinite" dur="1.6s" fill="freeze" calcMode="spline" keyPoints={rev ? "1;0" : "0;1"} keyTimes="0;1" keySplines=".65 0 .35 1" path={d} />
  </circle>
}

export default function TreePage({ demo: dv, children }: { demo?: DemoView; children?: React.ReactNode } = {}) {
  const svgRef = useRef<SVGSVGElement>(null), gRef = useRef<SVGGElement>(null), panRef = useRef<HTMLDivElement>(null)
  const sel = ui.panel && ui.panel.mode === 'view' ? ui.panel.id : null
  const selPet = ui.panel && ui.panel.mode === 'pet' ? ui.panel.id : null
  const lay = layout(() => NH)
  // the family's look: title above the tree, dashed places for the parents of the oldest relatives
  const st = S.settings, theme = themeOf(st.theme)
  const title = (st.familyName || '').trim()
  const roots = st.ghosts === false ? [] : S.people.filter(p => lay.pos[p.id] && lay.pos[p.id].g === 0 && !lay.pos[p.id].iso && !parentsOf(p.id).length
    // brothers and sisters linked directly share one pair of empty places, above the leftmost of them
    && !S.rels.some(r => r.type === 'sibling' && (r.a === p.id || r.b === p.id) && lay.pos[r.a === p.id ? r.b : r.a] && lay.pos[r.a === p.id ? r.b : r.a].x < lay.pos[p.id].x))
  const GH = roots.length ? 84 : 0, TH = title ? 96 : 0, TOP = GH + TH
  // approximate birth year of each generation row, drawn as a scale on the left
  const scale = (() => {
    const rows = new Map<number, number[]>(); let minX = Infinity
    S.people.forEach(p => { const P = lay.pos[p.id]; if (!P || P.iso) return; minX = Math.min(minX, P.x); const ry = P.top + P.rh / 2; if (!rows.has(ry)) rows.set(ry, []); const y = +yearOf(p.birthDate); if (y) rows.get(ry)!.push(y) })
    const list = [...rows.entries()].filter(([, ys]) => ys.length).map(([y, ys]) => ({ y, label: (ys.length > 1 ? '≈' : '') + Math.round(ys.reduce((a, b) => a + b, 0) / ys.length) })).sort((a, b) => a.y - b.y)
    return rows.size > 1 && list.length ? { x: minX - 28, list } : null
  })()
  const SC = scale ? 130 : 0
  const [, setMemoTick] = useState(0)
  const [sharing, setSharing] = useState(false)
  const memo0 = dv ? null : Progress.nearestBirthday()
  const memo = memoHidden(memo0) ? null : memo0
  // «Следующая остановка» and the memorial date share the bottom-left corner
  const ns = !dv && S.people.length > 0 && !!nextStep()
  const dock = (memo ? 64 : 0) + (ns ? 96 : 0) + (memo && ns ? 12 : 0)
  // «бабушка», «тёща»… under the names, relative to «you»; the chain of relatives for the selected person
  const me = st.kin === false ? null : rootPerson()
  const kin = me ? kinship(me.id) : null
  if (kin && dv) Object.assign(kin.label, dv.labels)
  // demo, first open: how many steps each person is from the face (the order of growth)
  const intro = dv && dv.intro ? distances(dv.face) : null
  const maxD = intro ? Math.max(0, ...Object.values(intro)) : 0, INTRO_STEP = introStep(maxD)
  const dl = (id: string) => INTRO_START + (intro && intro[id] != null ? intro[id] : 0) * INTRO_STEP
  const introEnd = intro ? INTRO_START + maxD * INTRO_STEP + .9 : 0

  // ---- who is new: a person or two added by hand grows in; a sample, an import or the first render does not
  const now = Date.now(), ids = new Set(S.people.map(p => p.id))
  if (!GROW.known || GROW.refit !== ui.treeRefit) { GROW.known = ids; GROW.refit = ui.treeRefit }
  else {
    const fresh = S.people.filter(p => !GROW.known!.has(p.id) && lay.pos[p.id]).map(p => p.id)
    if (fresh.length && fresh.length <= 3) { GROW.ids = new Set(fresh); GROW.until = now + GROW_MS; GROW.n++ }
    GROW.known = ids
  }
  const growing = GROW.until > now ? GROW.ids : new Set<string>()
  useEffect(() => { if (!growing.size) return; clearTimeout(GROW.timer as ReturnType<typeof setTimeout>); GROW.timer = setTimeout(bump, GROW.until - Date.now() + 50) }, [GROW.n])

  const apply = (anim?: boolean, ms = 900) => { const g = gRef.current; if (!g) return; const v = TV.view; if (anim) { g.style.transition = `transform ${ms}ms cubic-bezier(${ms > 900 ? '.5,.05,.25,1' : '.22,.61,.36,1'})`; setTimeout(() => { g.style.transition = '' }, ms + 50) } g.setAttribute('transform', `translate(${v.x},${v.y}) scale(${v.k})`); if (TV.tk !== v.k) { TV.tk = v.k; g.style.setProperty('--tk', String(v.k)) } }
  /** wheel and pinch can fire faster than the screen redraws: one update per frame */
  const applySoon = () => { if (!TV.raf) TV.raf = requestAnimationFrame(() => { TV.raf = 0; apply() }) }
  const fitView = (): View | null => {
    const svg = svgRef.current; if (!svg) return null; const W = svg.clientWidth || 800, H = svg.clientHeight || 600; const pad = dock ? dock : dv ? 120 : 0
    // the demo shows the whole family at once, even when the cards get small on a phone
    const lw = (lay.w || NW) + SC, lh = (lay.h || NH) + TOP; const k = Math.min(1.1, Math.max(dv ? .16 : .25, Math.min((W - (dv ? 32 : 80)) / lw, (H - 80 - pad) / lh)))
    return { k, x: (W - lw * k) / 2 + SC * k, y: (H - pad - lh * k) / 2 + TOP * k }
  }
  const fit = (anim?: boolean) => { const v = fitView(); if (v) { TV.view = v; apply(anim) } }
  /** demo, first open: where the camera stops — the face with about a row and a half of relatives above and below it
   *  (a big family shown whole is too small to read); null when the whole family fits at that size anyway */
  const closeUp = (P: { x: number; y: number; h: number }): View | null => {
    const svg = svgRef.current; if (!svg) return null; const W = svg.clientWidth || 800, H = svg.clientHeight || 600, pad = 120
    const tops = [...new Set(Object.values(lay.pos).map((q: any) => Math.round(q.top ?? q.y)))].sort((a, b) => a - b)
    const gaps = tops.slice(1).map((t, i) => t - tops[i]).filter(d => d > 0).sort((a, b) => a - b); if (!gaps.length) return null
    const pitch = gaps[Math.floor(gaps.length / 2)], k = Math.min(1.1, (H - pad - 40) / (3.6 * pitch))
    const whole = fitView(); if (!whole || k <= whole.k * 1.15) return null
    // centred on the face, but never past the family's top or bottom edge (a face in the last row would leave half the screen empty)
    const y0 = (H - pad) / 2 + 20 - (P.y + P.h / 2) * k, lh = lay.h || NH
    const y = Math.min(Math.max(y0, H - pad - 20 - lh * k), TOP * k + 20)
    return { k, x: W / 2 - (P.x + NW / 2) * k, y }
  }
  /** demo, first open: the camera starts close on the face and pulls back while the family grows around it */
  const startIntro = () => {
    const svg = svgRef.current, P = dv && lay.pos[dv.face], all = fitView(); if (!svg || !P || !all) { fit(); return }
    const end = closeUp(P) || all
    const W = svg.clientWidth || 800, H = svg.clientHeight || 600, k = Math.max(end.k, Math.min(1, W / 520))
    TV.view = { k, x: W / 2 - (P.x + NW / 2) * k, y: H / 2 - (P.y + P.h / 2) * k }; apply()
    setTimeout(() => { if (TV.introAt !== dv!.intro) return; TV.view = end; apply(true, Math.round((introEnd - .2) * 1000)) }, 500)
  }
  /** a new relative: the camera moves in on them and the relatives they are linked to, so the growth is seen up close */
  const focus = (who: Set<string>) => {
    const svg = svgRef.current; if (!svg) return; const H = svg.clientHeight || 600; const pad = dock
    // the profile panel covers the right side on a wide screen: centre in what is left
    const W = (svg.clientWidth || 800) - (ui.panel && window.innerWidth > 860 ? 420 : 0)
    const near = new Set(who)
    who.forEach(id => { parentsOf(id).forEach(p => near.add(p.id)); childrenOf(id).forEach(c => near.add(c.id))
      S.rels.forEach(r => { if (r.type === 'spouse' && (r.a === id || r.b === id)) near.add(r.a === id ? r.b : r.a) }) })
    const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }
    near.forEach(id => { const P = lay.pos[id]; if (!P) return; box.x0 = Math.min(box.x0, P.x); box.y0 = Math.min(box.y0, P.y); box.x1 = Math.max(box.x1, P.x + NW); box.y1 = Math.max(box.y1, P.y + P.h) })
    if (!isFinite(box.x0)) { fit(true); return }
    const bw = box.x1 - box.x0, bh = box.y1 - box.y0
    const k = Math.min(1.05, Math.max(.6, Math.min((W - 160) / bw, (H - 140 - pad) / bh)))
    // centre on the newcomers when everything around them does not fit
    const nb = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }
    who.forEach(id => { const P = lay.pos[id]; if (!P) return; nb.x0 = Math.min(nb.x0, P.x); nb.y0 = Math.min(nb.y0, P.y); nb.x1 = Math.max(nb.x1, P.x + NW); nb.y1 = Math.max(nb.y1, P.y + P.h) })
    const fits = bw * k <= W - 120 && bh * k <= H - 100 - pad
    const cx = fits || !isFinite(nb.x0) ? (box.x0 + box.x1) / 2 : (nb.x0 + nb.x1) / 2, cy = fits || !isFinite(nb.y0) ? (box.y0 + box.y1) / 2 : (nb.y0 + nb.y1) / 2
    TV.view = { k, x: W / 2 - cx * k, y: (H - pad) / 2 - cy * k }; apply(true)
  }
  const zoomBy = (f: number, cx?: number, cy?: number, soon?: boolean) => {
    const svg = svgRef.current!; cx = cx == null ? svg.clientWidth / 2 : cx; cy = cy == null ? svg.clientHeight / 2 : cy
    const v = TV.view; const k = Math.min(3, Math.max(.15, v.k * f)); const r = k / v.k; TV.view = { k, x: cx - (cx - v.x) * r, y: cy - (cy - v.y) * r }; if (soon) applySoon(); else apply()
  }

  // fit on first show, when the number of people or the size changes, or when asked (sample loaded, drafts approved)
  useLayoutEffect(() => {
    const svg = svgRef.current; if (!svg) return; const sz = svg.clientWidth + 'x' + svg.clientHeight
    if (intro && TV.introAt !== dv!.intro) { TV.introAt = dv!.intro; TV.fitted = true; TV.lastN = S.people.length; TV.lastSz = sz; TV.refit = ui.treeRefit; TV.lastTop = TOP; startIntro(); return }
    if (!TV.fitted || TV.lastN !== S.people.length || TV.lastSz !== sz || TV.refit !== ui.treeRefit || TV.lastTop !== TOP) { if (TV.fitted && TV.lastN !== S.people.length && growing.size > 0 && TV.lastSz === sz) focus(growing); else fit(); TV.fitted = true; TV.lastN = S.people.length; TV.lastSz = sz; TV.refit = ui.treeRefit; TV.lastTop = TOP } else apply()
  })
  // keep the selected card in view when the profile panel opens
  useEffect(() => {
    const svg = svgRef.current; if (!sel || !svg || !lay.pos[sel]) return
    const W = svg.clientWidth, H = svg.clientHeight, v = TV.view, p = lay.pos[sel]; const sx = p.x * v.k + v.x, sy = p.y * v.k + v.y; const panelW = W > 860 && !dv ? 400 : 0
    if (sx < 40 || sx > W - panelW - NW * v.k - 40 || sy < 40 || sy > H - 100) { TV.view = { ...v, x: (W - panelW) / 2 - (p.x + NW / 2) * v.k, y: H / 2 - (p.y + p.h / 2) * v.k }; apply(true) }
  }, [sel])
  // wheel zoom, drag pan, pinch zoom, tap to open
  useEffect(() => {
    const svg = svgRef.current!; let drag: { x: number; y: number; vx: number; vy: number; node: Element | null } | null = null, moved = false, pinch: { d: number; k: number } | null = null
    const pts = new Map<number, { x: number; y: number }>()
    const wheel = (e: WheelEvent) => { e.preventDefault(); const r = svg.getBoundingClientRect(); zoomBy(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top, true) }
    // a drag moves the drawn tree as one ready picture (CSS transform of the whole SVG, no redrawing of the cards);
    // the real position is written once, when the finger or the mouse is released
    const settle = () => { const p = TV.pan; if (!p) return; TV.pan = null; TV.view = { ...TV.view, x: TV.view.x + p.x, y: TV.view.y + p.y }; if (panRef.current) panRef.current.style.transform = ''; apply() }
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') e.preventDefault() // no text selection while dragging
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); svg.setPointerCapture(e.pointerId)
      if (pts.size === 1) { drag = { x: e.clientX, y: e.clientY, vx: TV.view.x, vy: TV.view.y, node: (e.target as Element).closest('.petb, .node, .ghost') }; moved = false }
      else if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: TV.view.k }; drag = null }
    }
    const move = (e: PointerEvent) => {
      if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pts.size === 2 && pinch) { settle(); const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); const r = svg.getBoundingClientRect(); const cx = (a.x + b.x) / 2 - r.left, cy = (a.y + b.y) / 2 - r.top; const nk = Math.min(3, Math.max(.15, pinch.k * d / pinch.d)); const rr = nk / TV.view.k; TV.view = { k: nk, x: cx - (cx - TV.view.x) * rr, y: cy - (cy - TV.view.y) * rr }; applySoon(); moved = true; return }
      if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 3) { moved = true; svg.classList.add('dragging') }
        if (moved) { TV.pan = { x: dx, y: dy }; if (panRef.current) panRef.current.style.transform = `translate(${dx}px, ${dy}px)` } }
    }
    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId); if (pts.size < 2) pinch = null
      if (pts.size === 0) { settle(); svg.classList.remove('dragging'); if (!moved) { const n = drag && drag.node as SVGGElement | null; if (n && n.dataset.ghost) addRelative(n.dataset.ghost, 'parent'); else if (n && n.dataset.pet) openPet(n.dataset.pet); else if (n && n.dataset.id) openPerson(n.dataset.id); else closePanel() } drag = null }
    }
    const resize = () => setTimeout(fit, 50)
    svg.addEventListener('wheel', wheel, { passive: false }); svg.addEventListener('pointerdown', down); svg.addEventListener('pointermove', move); svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up); window.addEventListener('resize', resize)
    return () => { svg.removeEventListener('wheel', wheel); svg.removeEventListener('pointerdown', down); svg.removeEventListener('pointermove', move); svg.removeEventListener('pointerup', up); svg.removeEventListener('pointercancel', up); window.removeEventListener('resize', resize) }
  })

  // ---- links: marriages, then lines from the couple (or single parent) down to each child: smooth S-curves or straight steps
  const col = familyColors(!!theme.light); const links: JSX.Element[] = [], dots: JSX.Element[] = []
  const straight = st.lines === 'straight'
  const box = (id: string) => { const P = lay.pos[id]; return { cx: P.x + NW / 2, l: P.x, r: P.x + NW, top: P.y, bot: P.y + P.h, mid: P.top + P.rh / 2, g: P.g } }
  // a new branch draws itself (pathLength 1 + dash offset) from the relative already in the tree towards the newcomer:
  // a new parent grows upwards from the child, a new child downwards. The first branch also carries a spark.
  const spark = { cur: null as null | { d: string; color: string; rev: boolean } }
  const grows = (...who: string[]) => growing.size > 0 && who.some(id => growing.has(id))
  /** the path is drawn from `from` to `to`: true when only the far end is new, so it has to grow backwards */
  const back = (from: string[], to: string[]) => from.some(id => growing.has(id)) && !to.some(id => growing.has(id))
  const lk = (key: string, cls: string, d: string, color: string, grow: boolean, rev = false, ends?: [string[], string[]]) => {
    if (intro && ends) { // demo growth: the line draws from the side nearer to the face, once its first card is there
      const near = (ids: string[]) => Math.min(...ids.map(id => intro[id] ?? 99)), a = near(ends[0]), b = near(ends[1])
      const dashed = cls.includes('partner') || cls.includes('adopt') || cls.includes(' ex')
      links.push(<path key={key} className={'link ' + cls + (dashed ? ' in-fade' : ' in' + (b < a ? ' rev' : ''))} style={{ stroke: color, '--dl': (INTRO_START + Math.min(a, b) * INTRO_STEP + .15) + 's' } as React.CSSProperties} d={d} pathLength={dashed ? undefined : 1} />)
      return
    }
    if (grow && !spark.cur && !cls.includes('marriage')) spark.cur = { d, color, rev }
    // a marriage that ended has a break in the middle: drawn with a dash pattern in parts of the line's length
    const brk = cls.includes(' ex') && !cls.includes('partner')
    links.push(<path key={key} className={'link ' + cls + (grow ? ' grow' + (rev ? ' rev' : '') : '')} style={{ stroke: color }} d={d} pathLength={grow || brk ? 1 : undefined} />)
  }
  /** a couple who split up: the genealogists' «//» over a break in the line */
  const exMark = (id: string, x: number, y: number, color: string, near: string) => {
    links.push(<g key={'x' + id} className="ex-mark" style={{ '--dl': dl(near) + .6 + 's' } as React.CSSProperties}>
      <path d={`M${x - 5.5} ${y + 6}L${x - 1.5} ${y - 6}M${x + 1.5} ${y + 6}L${x + 5.5} ${y - 6}`} style={{ stroke: color }} />
    </g>)
  }
  S.rels.filter(r => r.type === 'spouse' && lay.pos[r.a] && lay.pos[r.b]).forEach(r => {
    const A = box(r.a), B = box(r.b)
    const color = col.mar(r), mcls = 'marriage' + (r.partner ? ' partner' : '') + (r.ex ? ' ex' : '')
    if (A.g === B.g) {
      const l = A.cx < B.cx ? A : B, rr = A.cx < B.cx ? B : A
      // spouses not side by side (a third marriage): an arc under the cards instead of a line through someone else
      const apart = Math.abs(lay.pos[r.a].x - lay.pos[r.b].x) > NW + PG + 1, yb = Math.max(l.bot, rr.bot)
      const lid = A.cx < B.cx ? r.a : r.b, rid = lid === r.a ? r.b : r.a
      lk('m' + r.id, mcls, apart ? `M${l.cx} ${yb}C${l.cx} ${yb + 44} ${rr.cx} ${yb + 44} ${rr.cx} ${yb}` : `M${l.r} ${l.mid}H${rr.l}`, color, grows(r.a, r.b), back([lid], [rid]), [[lid], [rid]])
      const yst = { fill: color, '--dl': dl(lid) + .6 + 's' } as React.CSSProperties, x = (l.r + rr.l) / 2
      // the wedding year above the line; for a couple who split up, the year it ended right under it (still above the line:
      // the children's line starts from the middle of it and goes down)
      const end = r.ex && r.to && !apart
      if (r.from && !apart) links.push(<text key={'mt' + r.id} className="mar-yr" x={x} y={l.mid - (end ? 19 : 7)} textAnchor="middle" style={yst}>{showYear(yearOf(r.from)) || r.from}</text>)
      if (end) links.push(<text key={'me' + r.id} className="mar-yr ex" x={x} y={l.mid - 7} textAnchor="middle" style={yst}>{showYear(yearOf(r.to)) || r.to}</text>)
      if (r.ex) exMark(r.id, apart ? (l.cx + rr.cx) / 2 : x, apart ? yb + 33 : l.mid, color, lid)
    }
    else { const my = (A.bot + B.top) / 2; lk('m' + r.id, mcls, `M${A.cx} ${A.bot}C${A.cx} ${my} ${B.cx} ${my} ${B.cx} ${B.top}`, color, grows(r.a, r.b), back([r.a], [r.b]), [[r.a], [r.b]]); if (r.ex) exMark(r.id, (A.cx + B.cx) / 2, my, color, r.a) }
  })
  // parents → child: by birth a solid line; adoptive parents a dotted one (their own line when the birth parents are in the tree too)
  const adoptedBy = (p: string, c: string) => S.rels.some(r => r.type === 'parent' && r.adopt && r.a === p && r.b === c)
  S.people.forEach(ch => {
    const all = parentsOf(ch.id).filter(p => lay.pos[p.id]), bio = all.filter(p => !adoptedBy(p.id, ch.id)), ad = all.filter(p => adoptedBy(p.id, ch.id))
    if (bio.length) kidLine(ch.id, bio, ''); if (ad.length) kidLine(ch.id, ad, ' adopt')
  })
  function kidLine(chId: string, ps: Person[], extra: string) {
    const ch = byId(chId)!, C = { x: box(ch.id).cx, y: box(ch.id).top }
    let sx: number, sy: number, y0: number
    const a = lay.pos[ps[0].id], b = ps[1] && lay.pos[ps[1].id]
    if (b && a.g === b.g && Math.abs(a.x - b.x) < NW + PG + 2) { sx = (a.x + b.x + NW) / 2; sy = a.top + a.rh / 2; y0 = Math.max(box(ps[0].id).bot, box(ps[1].id).bot) + 6 }
    else { const A = box(ps[0].id); sx = A.cx; sy = A.bot; y0 = sy + 6 }
    const color = col.kin(ch.id)
    let d: string
    if (straight) { const bus = Math.max(y0, lay.pos[ch.id].top - 26); d = `M${sx} ${sy}V${bus}H${C.x}V${C.y}` }
    else { const y1 = C.y - 8, k = (y1 - y0) * .55; d = `M${sx} ${sy}V${y0}C${sx} ${y0 + k} ${C.x} ${y1 - k} ${C.x} ${y1}V${C.y}` }
    lk('k' + extra + ch.id, 'kin' + extra, d, color, grows(ch.id, ...ps.map(p => p.id)), back(ps.map(p => p.id), [ch.id]), [ps.map(p => p.id), [ch.id]])
    dots.push(<circle key={'d' + extra + ch.id} className="cdot" cx={sx} cy={sy} r="3.5" fill={color} style={intro ? { '--dl': Math.min(...ps.map(p => dl(p.id))) + .3 + 's' } as React.CSSProperties : undefined} />)
  }
  // stepfather / stepmother → stepchild: a dashed line
  S.rels.filter(r => r.type === 'parent' && r.step && lay.pos[r.a] && lay.pos[r.b]).forEach(r => {
    const A = box(r.a), C = box(r.b), sy = A.bot, y1 = C.top - 8, k = (y1 - sy) * .55
    const d = straight ? `M${A.cx} ${sy}V${Math.max(sy + 6, lay.pos[r.b].top - 18)}H${C.cx}V${C.top}` : `M${A.cx} ${sy}C${A.cx} ${sy + k} ${C.cx} ${y1 - k} ${C.cx} ${y1}V${C.top}`
    links.push(<path key={'s' + r.id} className={'link kin step' + (intro ? ' in-fade' : '')} style={{ stroke: col.kin(r.b), '--dl': Math.min(dl(r.a), dl(r.b)) + .2 + 's' } as React.CSSProperties} d={d} />)
  })
  // demo only: two families who are friends (Charlie Swan and Billy Black) — a dotted arc over the cards with a small «друзья»
  if (dv) S.rels.filter(r => r.type === FRIEND && lay.pos[r.a] && lay.pos[r.b]).forEach(r => {
    const A = box(r.a), B = box(r.b), y = Math.min(A.top, B.top) - 58, st = { '--dl': Math.min(dl(r.a), dl(r.b)) + .3 + 's' } as React.CSSProperties
    links.push(<path key={'fr' + r.id} className={'link friend' + (intro ? ' in-fade' : '')} style={st} d={`M${A.cx} ${A.top}C${A.cx} ${y} ${B.cx} ${y} ${B.cx} ${B.top}`} />)
    links.push(<text key={'frt' + r.id} className="friend-t" x={(A.cx + B.cx) / 2} y={y + 12} textAnchor="middle" style={st}>{LANG === 'en' ? 'friends' : 'друзья'}</text>)
  })
  // brothers and sisters with no parent in the tree yet: a bracket above the cards
  S.rels.filter(r => r.type === 'sibling' && lay.pos[r.a] && lay.pos[r.b] && lay.pos[r.a].g === lay.pos[r.b].g).forEach(r => {
    const A = box(r.a), B = box(r.b), y = Math.min(A.top, B.top) - 22
    lk('b' + r.id, 'sib', `M${A.cx} ${A.top}V${y}H${B.cx}V${B.top}`, col.kin(r.a), grows(r.a, r.b), back([r.a], [r.b]), [[r.a], [r.b]])
  })


  return (
    <section className="page active" data-page="tree">
      {!dv && <div className="topbar">
        <h2><span>{t('nav.tree')}</span><span className="sub" id="treeSub">{S.people.length ? treeSub(S.people.length, generations()) : ''}</span></h2>
        <div className="tb-acts">
          <button className="btn rnd add" id="btnAddPerson" onClick={() => editPerson(null)} aria-label={t('tree.add')} title={t('tree.add')}><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg></button>
          <button className="btn rnd" id="btnShare" onClick={() => setSharing(true)} aria-label={LANG === 'en' ? 'Share' : 'Поделиться'} title={LANG === 'en' ? 'Share' : 'Поделиться'}><ShareIcon /></button>
        </div>
      </div>}
      {sharing && <ShareDialog onClose={() => setSharing(false)} />}
      <div className={'tree-wrap th-' + theme.k + (theme.light ? ' th-light' : '') + (intro ? ' intro' : '')} style={intro ? { '--end': introEnd - .5 + 's' } as React.CSSProperties : undefined}>
        <div className="tree-pan" ref={panRef}><svg id="treeSvg" ref={svgRef}>
          <defs><clipPath id="avClip" clipPathUnits="objectBoundingBox"><circle cx=".5" cy=".5" r=".5" /></clipPath>
            <filter id="frShadow" x="-20%" y="-20%" width="140%" height="145%"><feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000" floodOpacity=".4" /></filter>
            <filter id="ndGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="14" /></filter>
            <linearGradient id="petBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F6C9A8" /><stop offset="1" stopColor="#B9A3E0" /></linearGradient>
            <radialGradient id="frGlow"><stop offset="0" stopColor="#8C96FF" stopOpacity=".5" /><stop offset="1" stopColor="#8C96FF" stopOpacity="0" /></radialGradient>
          </defs>
          <g id="treeView" ref={gRef}>
            {title && <text className="tree-title" x={(lay.w || NW) / 2} y={-GH - 34} textAnchor="middle">{up(title)}</text>}
            {roots.map(p => { const P = lay.pos[p.id], w = (NW - 10) / 2, y = P.top - 64; return (
              <g key={'gh' + p.id} className="ghost" data-ghost={p.id} role="button" aria-label={t('ts.ghost') + ': ' + fullName(p)}>
                <title>{t('ts.ghost')}</title>
                <path className="gl" d={`M${P.x + w} ${y + 17}H${P.x + w + 10}M${P.x + NW / 2} ${y + 17}V${P.y}`} />
                <rect x={P.x} y={y} width={w} height={34} rx="8" /><rect x={P.x + w + 10} y={y} width={w} height={34} rx="8" />
                <text x={P.x + w / 2} y={y + 23} textAnchor="middle">+</text><text x={P.x + w * 1.5 + 10} y={y + 23} textAnchor="middle">+</text>
              </g>) })}
            {scale && <g className="gen-scale" aria-hidden="true">
              {scale.list.length > 1 && <line x1={scale.x} x2={scale.x} y1={scale.list[0].y} y2={scale.list[scale.list.length - 1].y} />}
              {scale.list.map(r => <g key={r.y}><circle cx={scale.x} cy={r.y} r="4" /><text x={scale.x - 14} y={r.y} dominantBaseline="central" textAnchor="end">{r.label}</text></g>)}
            </g>}
            {links}{dots}
            {spark.cur && <Spark key={'sp' + GROW.n} n={GROW.n} d={spark.cur.d} color={spark.cur.color} rev={spark.cur.rev} />}
            {S.people.map(p => {
              const P = lay.pos[p.id]; if (!P) return null; const yrs = yearsOf(p), k = kin && kin.label[p.id], isMe = !!me && me.id === p.id, look = frameOf(p)
              const art = look ? frameArt(look, 'fr' + p.id.replace(/[^A-Za-z0-9]/g, '')) : null
              const cls = 'node' + (sel === p.id ? ' selected' : '') + (fillPercent(p) === 100 ? ' complete' : '') + (look ? ' framed' : '') + (isMe ? ' me' : '') + (growing.has(p.id) ? ' grow' : '')
              return (
                <g key={p.id} className={cls} data-id={p.id} transform={`translate(${P.x},${P.y})`} style={intro ? { '--dl': dl(p.id) + 's' } as React.CSSProperties : undefined}>
                  <title>{fullName(p) + (k ? ' — ' + k : '')}</title>
                  <g className="nd-in">
                    {sel === p.id && <rect className="nd-glow" x="-10" y="-10" width={NW + 20} height={NH + 20} rx="18" filter="url(#ndGlow)" />}
                    {growing.has(p.id) && <circle className="nd-flash" cx={NW / 2} cy={NH / 2} r={NW * .72} />}
                    <rect className="card" width={NW} height={NH} rx={art ? art.rx : 10} />
                    <g transform={art ? `translate(${NW / 2} ${NH / 2}) scale(${art.sc}) translate(${-NW / 2} ${-NH / 2})` : undefined}>
                      {k && <text className="kn" x={NW / 2} y="21" textAnchor="middle" style={{ fill: isMe ? undefined : col.kin(p.id) }}>{fitText(up(k), NW - 18, KN_FONT, .8)}</text>}
                      <Portrait p={p} yrs={yrs} kin={!!k} />
                    </g>
                    {art && <g className="frm" filter="url(#frShadow)" dangerouslySetInnerHTML={{ __html: `<defs>${art.defs}</defs>${art.body}` }} />}
                    {petsOf(p.id).map((pt, i) => { const [x, y] = petSpot(i), ir = PET_R * 1.12; return (
                      <g key={pt.id} className={'petb' + (selPet === pt.id ? ' sel' : '')} data-pet={pt.id}>
                        <title>{[pt.name, kindName(pt.kind), petYears(pt)].filter(Boolean).join(' · ')}</title>
                        <circle className="pb-c" cx={x} cy={y} r={PET_R} />
                        <circle cx={x} cy={y} r={PET_R - 4} fill="url(#petBg)" />
                        <svg className="pb-i" x={x - ir / 2} y={y - ir / 2} width={ir} height={ir} viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: petIcon(pt.kind) }} />
                      </g>) })}
                  </g>
                </g>
              )
            })}
          </g>
        </svg></div>
        {!dv && kin && sel && me && sel !== me.id && byId(sel) && (() => {
          const chain = kin.chain(sel)
          return <div className="tree-kin" key={sel} aria-live="polite">
            {kin.label[sel] && <span className="k" style={{ color: col.kin(sel) }}>{kin.label[sel]}</span>}
            <b className="n">{fullName(byId(sel))}</b>
            {chain.length > 1 && <span className="ch">{chain.map((id, i) => <span key={id}>{i > 0 && <i aria-hidden="true">→</i>}{chainName(id)}</span>)}</span>}
            {!kin.blood[sel] && <span className="m">{t(kin.linked(sel) ? 'kin.marriage' : 'kin.none')}</span>}
          </div>
        })()}
        {!S.people.length && <div className="empty" id="treeEmpty">
          <h3>{t('tree.empty.h')}</h3><p className="muted" style={{ maxWidth: '36ch' }}>{t('tree.empty.p')}</p>
          <button className="btn add" onClick={() => editPerson(null)}>{t('tree.add')}</button>
        </div>}
        <div className="tree-tools">
          <TreeStyle />
          <button className="btn icon" title="+" onClick={() => zoomBy(1.25)}><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg></button>
          <button className="btn icon" title="−" onClick={() => zoomBy(.8)}><svg viewBox="0 0 24 24"><path d="M5 12h14" /></svg></button>
          <button className="btn icon" title="fit" onClick={() => fit()}><svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg></button>
        </div>
        {!dv && <div className={'tree-dock' + (memo ? ' has-memo' : '')}><NextStop />{memo && <Memo onClose={() => setMemoTick(x => x + 1)} />}</div>}
        {children}
      </div>
    </section>
  )
}
