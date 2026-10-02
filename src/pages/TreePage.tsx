import { useEffect, useLayoutEffect, useRef } from 'react'
import { S, ui, t, yearOf, parentsOf, yearsOf, avatarSrc, fullName, fillPercent, generations, openPerson, closePanel, editPerson, openModal, type Person } from '../lib/core'
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
  const lay = layout()
  // the family's look: title above the tree, dashed places for the parents of the oldest relatives
  const st = S.settings, theme = themeOf(st.theme)
  const title = (st.familyName || '').trim()
  const minY = S.people.length ? Math.min(...S.people.map(p => lay.pos[p.id]?.y ?? Infinity)) : 0
  const roots = st.ghosts === false ? [] : S.people.filter(p => lay.pos[p.id] && lay.pos[p.id].y === minY && !parentsOf(p.id).length)
  const GH = roots.length ? 84 : 0, TH = title ? 96 : 0, TOP = GH + TH
  // approximate birth year of each generation row, drawn as a scale on the left
  const scale = (() => {
    const rows = new Map<number, number[]>(); let minX = Infinity
    S.people.forEach(p => { const P = lay.pos[p.id]; if (!P) return; minX = Math.min(minX, P.x); if (!rows.has(P.y)) rows.set(P.y, []); const y = +yearOf(p.birthDate); if (y) rows.get(P.y)!.push(y) })
    const list = [...rows.entries()].filter(([, ys]) => ys.length).map(([y, ys]) => ({ y: y + NH / 2, label: (ys.length > 1 ? '≈' : '') + Math.round(ys.reduce((a, b) => a + b, 0) / ys.length) })).sort((a, b) => a.y - b.y)
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
    if (sx < 40 || sx > W - panelW - NW * v.k - 40 || sy < 40 || sy > H - 100) { TV.view = { ...v, x: (W - panelW) / 2 - (p.x + NW / 2) * v.k, y: H / 2 - (p.y + NH / 2) * v.k }; apply(true) }
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

  // ---- links: marriages, then smooth S-curves from the couple (or single parent) down to each child
  const col = branchColors(); const links: JSX.Element[] = [], dots: JSX.Element[] = []
  S.rels.filter(r => r.type === 'spouse' && lay.pos[r.a] && lay.pos[r.b]).forEach(r => {
    const A = lay.pos[r.a], B = lay.pos[r.b]
    if (A.y === B.y) { const l = A.x < B.x ? A : B, rr = A.x < B.x ? B : A; links.push(<path key={'m' + r.id} className="link marriage" d={`M${l.x + NW} ${l.y + NH / 2}H${rr.x}`} />); if (r.from) links.push(<text key={'mt' + r.id} className="yr" x={(l.x + NW + rr.x) / 2} y={l.y + NH / 2 - 7} textAnchor="middle" style={{ fontFamily: 'var(--f-mono)', fontSize: 10, fill: 'var(--accent)' }}>{r.from}</text>) }
    else links.push(<path key={'m' + r.id} className="link marriage" d={`M${A.x + NW / 2} ${A.y + NH}C${A.x + NW / 2} ${(A.y + B.y) / 2 + NH / 2} ${B.x + NW / 2} ${(A.y + B.y) / 2 + NH / 2} ${B.x + NW / 2} ${B.y}`} />)
  })
  S.people.forEach(ch => {
    const ps = parentsOf(ch.id).filter(p => lay.pos[p.id]); if (!ps.length) return; const C = { x: lay.pos[ch.id].x + NW / 2, y: lay.pos[ch.id].y }
    let sx: number, sy: number
    if (ps.length >= 2 && lay.pos[ps[0].id].y === lay.pos[ps[1].id].y && Math.abs(lay.pos[ps[0].id].x - lay.pos[ps[1].id].x) < NW + PG + 2) { const a = lay.pos[ps[0].id], b = lay.pos[ps[1].id]; sx = (a.x + b.x + NW) / 2; sy = a.y + NH / 2 }
    else { sx = lay.pos[ps[0].id].x + NW / 2; sy = lay.pos[ps[0].id].y + NH }
    const y0 = Math.max(sy, lay.pos[ps[0].id].y + NH) + 6, y1 = C.y - 8, k = (y1 - y0) * .55; const color = (LINE as Record<string, string>)[col.link(ch.id)] || LINE.n
    links.push(<path key={'k' + ch.id} className="link kin" style={{ stroke: color }} d={`M${sx} ${sy}V${y0}C${sx} ${y0 + k} ${C.x} ${y1 - k} ${C.x} ${y1}V${C.y}`} />)
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
          <defs><clipPath id="avClip"><circle r="21" /></clipPath></defs>
          <g id="treeView" ref={gRef}>
            {title && <text className="tree-title" x={(lay.w || NW) / 2} y={-GH - 34} textAnchor="middle">{title}</text>}
            {roots.map(p => { const P = lay.pos[p.id], w = (NW - 10) / 2, y = P.y - 64; return (
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
              return (
                <g key={p.id} className={'node' + (sel === p.id ? ' selected' : '') + (fillPercent(p) === 100 ? ' complete' : '')} data-id={p.id} transform={`translate(${P.x},${P.y})`}>
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
