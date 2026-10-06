import { useEffect, useLayoutEffect, useRef } from 'react'
import { S, ui, t, byId, yearOf, parentsOf, yearsOf, avatarSrc, fullName, fillPercent, generations, openPerson, closePanel, editPerson, openModal, type Person } from '../lib/core'
import { frameSvg, frameDims } from '../lib/frames'
import { themeOf } from '../lib/treeStyle'
import { mountFog, type Fog } from '../lib/fog'
import TreeStyle from '../components/TreeStyle'
import { layout, branchColors, LINE, NW, NH, PG } from '../lib/treeLayout'
import { Progress } from '../lib/progress'
import { ShareButton } from '../components/ShareSheet'

// Names are measured with the same font the card uses, so long surnames get an ellipsis inside the card.
let measureCtx: CanvasRenderingContext2D | null = null
function fitText(s: string, max: number) {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d')
  const ctx = measureCtx!; ctx.font = '600 13px Onest, system-ui, -apple-system, "Segoe UI", sans-serif'
  if (ctx.measureText(s).width <= max) return s
  let x = s; while (x.length > 2 && ctx.measureText(x.trimEnd() + '…').width > max) x = x.slice(0, -1)
  return x.trimEnd() + '…'
}
const textW = (s: string) => { if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d'); measureCtx!.font = '600 13px Onest, system-ui, sans-serif'; return measureCtx!.measureText(s).width }
// a framed portrait: the frame, then a name plate under it
const PLQ = 48
const boxH = (id: string) => { const p = byId(id); return p && p.frame ? frameDims(p.frame).h + PLQ : NH }
const frameW = (p?: Person) => (p && p.frame ? frameDims(p.frame).w : NW)

type View = { x: number; y: number; k: number }
// pan/zoom survive switching pages, like in the prototype
const TV = { view: { x: 0, y: 0, k: 1 } as View, fitted: false, lastN: -1, lastSz: '', refit: -1, lastTop: -1 }

function NodeLabel({ p, yrs }: { p: Person; yrs: string }) {
  const rows = [p.first, p.last].filter(Boolean); if (!rows.length) rows.push(fullName(p))
  const lh = 16, total = rows.length * lh + (yrs ? 16 : 0); let y = (NH - total) / 2 + 12
  const max = NW - 54 - 12; const cut = rows.some(r => fitText(r, max) !== r)
  return <>
    {cut && <title>{rows.join(' ')}</title>}
    {rows.map((r, i) => { const el = <text key={i} className="nm" x="54" y={y}>{fitText(r, max)}</text>; y += lh; return el })}
    {yrs && <text className="yr" x="54" y={y + 1}>{yrs}</text>}
  </>
}

function Memo() {
  const m = Progress.nearestBirthday(); if (!m) return null
  return (
    <button className="tree-memo" id="treeMemo" type="button" onClick={() => openPerson(m.id)}>
      <span className="d"><b>{m.day}</b><span>{m.month}</span></span>
      <span className="tx">{m.line} <b>{m.name}</b></span>
    </button>
  )
}

export default function TreePage() {
  const svgRef = useRef<SVGSVGElement>(null), gRef = useRef<SVGGElement>(null)
  const sel = ui.panel && ui.panel.mode === 'view' ? ui.panel.id : null
  const lay = layout(boxH)
  // the family's look: title above the tree, dashed places for the parents of the oldest relatives
  const st = S.settings, theme = themeOf(st.theme)
  const title = (st.familyName || '').trim()
  const roots = st.ghosts === false ? [] : S.people.filter(p => lay.pos[p.id] && lay.pos[p.id].g === 0 && !parentsOf(p.id).length)
  const GH = roots.length ? 84 : 0, TH = title ? 96 : 0, TOP = GH + TH
  // approximate birth year of each generation row, drawn as a scale on the left
  const scale = (() => {
    const rows = new Map<number, number[]>(); let minX = Infinity
    S.people.forEach(p => { const P = lay.pos[p.id]; if (!P) return; minX = Math.min(minX, P.x); const ry = P.top + P.rh / 2; if (!rows.has(ry)) rows.set(ry, []); const y = +yearOf(p.birthDate); if (y) rows.get(ry)!.push(y) })
    const list = [...rows.entries()].filter(([, ys]) => ys.length).map(([y, ys]) => ({ y, label: (ys.length > 1 ? '≈' : '') + Math.round(ys.reduce((a, b) => a + b, 0) / ys.length) })).sort((a, b) => a.y - b.y)
    return rows.size > 1 && list.length ? { x: minX - 28, list } : null
  })()
  const SC = scale ? 100 : 0
  const fogRef = useRef<HTMLCanvasElement>(null), fog = useRef<Fog | null>(null)
  useEffect(() => { fog.current = mountFog(fogRef.current!, { density: .32, clear: .35 }); return () => fog.current?.destroy() }, [])
  useEffect(() => { if (fog.current) { fog.current.color = theme.fog; fog.current.target = .32 } }, [theme.k])
  const memo = Progress.nearestBirthday()

  const apply = (anim?: boolean) => { const g = gRef.current; if (!g) return; const v = TV.view; if (anim) { g.style.transition = 'transform .35s'; setTimeout(() => { g.style.transition = '' }, 400) } g.setAttribute('transform', `translate(${v.x},${v.y}) scale(${v.k})`) }
  const fit = () => {
    const svg = svgRef.current; if (!svg) return; const W = svg.clientWidth || 800, H = svg.clientHeight || 600; const pad = Progress.nearestBirthday() ? 64 : 0
    const lw = (lay.w || NW) + SC, lh = (lay.h || NH) + TOP; const k = Math.min(1.1, Math.max(.25, Math.min((W - 80) / lw, (H - 80 - pad) / lh)))
    TV.view = { k, x: (W - lw * k) / 2 + SC * k, y: (H - pad - lh * k) / 2 + TOP * k }; apply()
  }
  const zoomBy = (f: number, cx?: number, cy?: number) => {
    const svg = svgRef.current!; cx = cx == null ? svg.clientWidth / 2 : cx; cy = cy == null ? svg.clientHeight / 2 : cy
    const v = TV.view; const k = Math.min(3, Math.max(.15, v.k * f)); const r = k / v.k; TV.view = { k, x: cx - (cx - v.x) * r, y: cy - (cy - v.y) * r }; apply()
  }

  // fit on first show, when the number of people or the size changes, or when asked (sample loaded, drafts approved)
  useLayoutEffect(() => {
    const svg = svgRef.current; if (!svg) return; const sz = svg.clientWidth + 'x' + svg.clientHeight
    if (!TV.fitted || TV.lastN !== S.people.length || TV.lastSz !== sz || TV.refit !== ui.treeRefit || TV.lastTop !== TOP) { fit(); TV.fitted = true; TV.lastN = S.people.length; TV.lastSz = sz; TV.refit = ui.treeRefit; TV.lastTop = TOP } else apply()
  })
  // keep the selected card in view when the profile panel opens
  useEffect(() => {
    const svg = svgRef.current; if (!sel || !svg || !lay.pos[sel]) return
    const W = svg.clientWidth, H = svg.clientHeight, v = TV.view, p = lay.pos[sel]; const sx = p.x * v.k + v.x, sy = p.y * v.k + v.y; const panelW = W > 860 ? 400 : 0
    if (sx < 40 || sx > W - panelW - NW * v.k - 40 || sy < 40 || sy > H - 100) { TV.view = { ...v, x: (W - panelW) / 2 - (p.x + NW / 2) * v.k, y: H / 2 - (p.y + p.h / 2) * v.k }; apply(true) }
  }, [sel])
  // wheel zoom, drag pan, pinch zoom, tap to open
  useEffect(() => {
    const svg = svgRef.current!; let drag: { x: number; y: number; vx: number; vy: number; node: Element | null } | null = null, moved = false, pinch: { d: number; k: number } | null = null
    const pts = new Map<number, { x: number; y: number }>()
    const wheel = (e: WheelEvent) => { e.preventDefault(); const r = svg.getBoundingClientRect(); zoomBy(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top) }
    const down = (e: PointerEvent) => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); svg.setPointerCapture(e.pointerId)
      if (pts.size === 1) { drag = { x: e.clientX, y: e.clientY, vx: TV.view.x, vy: TV.view.y, node: (e.target as Element).closest('.node, .ghost') }; moved = false }
      else if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: TV.view.k }; drag = null }
    }
    const move = (e: PointerEvent) => {
      if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); const r = svg.getBoundingClientRect(); const cx = (a.x + b.x) / 2 - r.left, cy = (a.y + b.y) / 2 - r.top; const nk = Math.min(3, Math.max(.15, pinch.k * d / pinch.d)); const rr = nk / TV.view.k; TV.view = { k: nk, x: cx - (cx - TV.view.x) * rr, y: cy - (cy - TV.view.y) * rr }; apply(); moved = true; return }
      if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 3) { moved = true; svg.classList.add('dragging') } TV.view = { ...TV.view, x: drag.vx + dx, y: drag.vy + dy }; apply() }
    }
    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId); if (pts.size < 2) pinch = null
      if (pts.size === 0) { svg.classList.remove('dragging'); if (!moved) { const n = drag && drag.node as SVGGElement | null; if (n && n.dataset.ghost) openModal({ kind: 'addRelative', id: n.dataset.ghost, rel: 'parent' }); else if (n && n.dataset.id) openPerson(n.dataset.id); else closePanel() } drag = null }
    }
    const resize = () => setTimeout(fit, 50)
    svg.addEventListener('wheel', wheel, { passive: false }); svg.addEventListener('pointerdown', down); svg.addEventListener('pointermove', move); svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up); window.addEventListener('resize', resize)
    return () => { svg.removeEventListener('wheel', wheel); svg.removeEventListener('pointerdown', down); svg.removeEventListener('pointermove', move); svg.removeEventListener('pointerup', up); svg.removeEventListener('pointercancel', up); window.removeEventListener('resize', resize) }
  })

  // ---- links: marriages, then lines from the couple (or single parent) down to each child: smooth S-curves or straight steps
  const col = branchColors(); const links: JSX.Element[] = [], dots: JSX.Element[] = []
  const straight = st.lines === 'straight'
  const box = (id: string) => { const P = lay.pos[id], fw = frameW(byId(id)); return { cx: P.x + NW / 2, l: P.x + (NW - fw) / 2, r: P.x + (NW + fw) / 2, top: P.y, bot: P.y + P.h, mid: P.top + P.rh / 2, g: P.g } }
  S.rels.filter(r => r.type === 'spouse' && lay.pos[r.a] && lay.pos[r.b]).forEach(r => {
    const A = box(r.a), B = box(r.b)
    if (A.g === B.g) { const l = A.cx < B.cx ? A : B, rr = A.cx < B.cx ? B : A; links.push(<path key={'m' + r.id} className="link marriage" d={`M${l.r} ${l.mid}H${rr.l}`} />); if (r.from) links.push(<text key={'mt' + r.id} className="yr" x={(l.r + rr.l) / 2} y={l.mid - 7} textAnchor="middle" style={{ fontFamily: 'var(--f-mono)', fontSize: 10, fill: 'var(--accent)' }}>{r.from}</text>) }
    else { const my = (A.bot + B.top) / 2; links.push(<path key={'m' + r.id} className="link marriage" d={`M${A.cx} ${A.bot}C${A.cx} ${my} ${B.cx} ${my} ${B.cx} ${B.top}`} />) }
  })
  S.people.forEach(ch => {
    const ps = parentsOf(ch.id).filter(p => lay.pos[p.id]); if (!ps.length) return; const C = { x: box(ch.id).cx, y: box(ch.id).top }
    let sx: number, sy: number, y0: number
    const a = lay.pos[ps[0].id], b = ps[1] && lay.pos[ps[1].id]
    if (b && a.g === b.g && Math.abs(a.x - b.x) < NW + PG + 2) { sx = (a.x + b.x + NW) / 2; sy = a.top + a.rh / 2; y0 = Math.max(box(ps[0].id).bot, box(ps[1].id).bot) + 6 }
    else { const A = box(ps[0].id); sx = A.cx; sy = A.bot; y0 = sy + 6 }
    const color = (LINE as Record<string, string>)[col.link(ch.id)] || LINE.n
    let d: string
    if (straight) { const bus = Math.max(y0, lay.pos[ch.id].top - 26); d = `M${sx} ${sy}V${bus}H${C.x}V${C.y}` }
    else { const y1 = C.y - 8, k = (y1 - y0) * .55; d = `M${sx} ${sy}V${y0}C${sx} ${y0 + k} ${C.x} ${y1 - k} ${C.x} ${y1}V${C.y}` }
    links.push(<path key={'k' + ch.id} className="link kin" style={{ stroke: color }} d={d} />)
    dots.push(<circle key={'d' + ch.id} cx={sx} cy={sy} r="3.5" fill={color} />)
  })

  return (
    <section className="page active" data-page="tree">
      <div className="topbar">
        <h2><span>{t('nav.tree')}</span><span className="sub" id="treeSub">{S.people.length ? t('tree.sub', { n: S.people.length, g: generations() }) : ''}</span></h2>
        <button className="btn" id="btnAddPerson" onClick={() => editPerson(null)}><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg><span>{t('tree.add')}</span></button>
        {S.people.length > 0 && <ShareButton />}
      </div>
      <div className={'tree-wrap th-' + theme.k + (theme.light ? ' th-light' : '')}>
        <canvas className="tree-fog" ref={fogRef} aria-hidden="true" />
        <svg id="treeSvg" ref={svgRef}>
          <defs><clipPath id="avClip"><circle r="21" /></clipPath>
            <filter id="frShadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000" floodOpacity=".45" /></filter>
            <radialGradient id="frGlow"><stop offset="0" stopColor="#F2C879" stopOpacity=".5" /><stop offset="1" stopColor="#F2C879" stopOpacity="0" /></radialGradient></defs>
          <g id="treeView" ref={gRef}>
            {title && <text className="tree-title" x={(lay.w || NW) / 2} y={-GH - 34} textAnchor="middle">{title}</text>}
            {roots.map(p => { const P = lay.pos[p.id], w = (NW - 10) / 2, y = P.top - 64; return (
              <g key={'gh' + p.id} className="ghost" data-ghost={p.id} role="button" aria-label={t('ts.ghost') + ': ' + fullName(p)}>
                <title>{t('ts.ghost')}</title>
                <path className="gl" d={`M${P.x + w} ${y + 17}H${P.x + w + 10}M${P.x + NW / 2} ${y + 17}V${P.y}`} />
                <rect x={P.x} y={y} width={w} height={34} rx="12" /><rect x={P.x + w + 10} y={y} width={w} height={34} rx="12" />
                <text x={P.x + w / 2} y={y + 22} textAnchor="middle">+</text><text x={P.x + w * 1.5 + 10} y={y + 22} textAnchor="middle">+</text>
              </g>) })}
            {scale && <g className="gen-scale" aria-hidden="true">
              {scale.list.length > 1 && <line x1={scale.x} x2={scale.x} y1={scale.list[0].y} y2={scale.list[scale.list.length - 1].y} />}
              {scale.list.map(r => <g key={r.y}><circle cx={scale.x} cy={r.y} r="3" /><text x={scale.x - 14} y={r.y + 4} textAnchor="end">{r.label}</text></g>)}
            </g>}
            {links}{dots}
            {S.people.map(p => {
              const P = lay.pos[p.id]; if (!P) return null; const yrs = yearsOf(p)
              const cls = 'node' + (sel === p.id ? ' selected' : '') + (fillPercent(p) === 100 ? ' complete' : '')
              if (p.frame) {
                const fs = frameSvg(p.frame, 'fr' + p.id.replace(/[^A-Za-z0-9]/g, ''), avatarSrc(p)), nm = fitText(fullName(p), NW - 28)
                const pw = Math.min(NW, Math.max(textW(nm), yrs.length * 7) + 28), py = fs.h + 10
                return (
                  <g key={p.id} className={cls + ' framed'} data-id={p.id} transform={`translate(${P.x},${P.y})`}>
                    {nm !== fullName(p) && <title>{fullName(p)}</title>}
                    <ellipse className="fr-glow" cx={NW / 2} cy={fs.h / 2} rx={fs.w * .8} ry={fs.h * .74} />
                    <g className="fr-art" transform={`translate(${(NW - fs.w) / 2},0)`} filter="url(#frShadow)" dangerouslySetInnerHTML={{ __html: `<defs>${fs.defs}</defs>${fs.body}` }} />
                    <rect className="card" x={(NW - pw) / 2} y={py} width={pw} height={yrs ? 38 : 26} rx="10" />
                    <text className="nm" x={NW / 2} y={py + 17} textAnchor="middle">{nm}</text>
                    {yrs && <text className="yr" x={NW / 2} y={py + 31} textAnchor="middle">{yrs}</text>}
                  </g>
                )
              }
              return (
                <g key={p.id} className={cls} data-id={p.id} transform={`translate(${P.x},${P.y})`}>
                  <rect className="card" width={NW} height={NH} rx="14" />
                  <g transform={`translate(29,${NH / 2})`}>
                    <image href={avatarSrc(p)} x="-21" y="-21" width="42" height="42" clipPath="url(#avClip)" preserveAspectRatio="xMidYMid slice" />
                    <circle className="av-ring" r="21" />
                  </g>
                  <NodeLabel p={p} yrs={yrs} />
                </g>
              )
            })}
          </g>
        </svg>
        {!S.people.length && <div className="empty" id="treeEmpty">
          <h3>{t('tree.empty.h')}</h3><p className="muted" style={{ maxWidth: '36ch' }}>{t('tree.empty.p')}</p>
          <button className="btn primary" onClick={() => editPerson(null)}>{t('tree.add')}</button>
        </div>}
        <div className="tree-tools">
          <TreeStyle />
          <button className="btn icon" title="+" onClick={() => zoomBy(1.25)}><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg></button>
          <button className="btn icon" title="−" onClick={() => zoomBy(.8)}><svg viewBox="0 0 24 24"><path d="M5 12h14" /></svg></button>
          <button className="btn icon" title="fit" onClick={fit}><svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg></button>
        </div>
        {memo && <Memo />}
      </div>
    </section>
  )
}
