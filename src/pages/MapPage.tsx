import { useEffect, useLayoutEffect, useRef } from 'react'
import { S, ui, t, byId, fullName, openPerson, bump, type Person, type LifeEvent } from '../lib/core'
import { WORLD } from '../lib/world'
import { ShareButton } from '../components/ShareSheet'

// Equirectangular SVG world map with family routes. State survives page switches, like in the prototype.
const MV = {
  hidden: new Set<string>(), focus: null as string | null, view: { x: 0, y: 0, k: 1 }, fitted: false, refit: -1,
  palette: ['#F2C879', '#7FB8FF', '#79D9A6', '#F09BC0', '#5FD3D3', '#C9B4FF', '#F0776B', '#A6D86B', '#FFB070', '#8FA9FF', '#E6E6A0', '#FF9FD8'],
}
const proj = (lat: number, lon: number): [number, number] => [(lon + 180) / 360 * 1000, (90 - lat) / 180 * 500 - 40] // viewBox 1000×420, Arctic cropped
const color = (i: number) => MV.palette[i % MV.palette.length]
const clamp = () => { const k = MV.view.k; MV.view.x = Math.min(0, Math.max(1000 - 1000 * k, MV.view.x)); MV.view.y = Math.min(0, Math.max(420 - 420 * k, MV.view.y)) }
type Mark = { p: Person; i: number; ev: LifeEvent[] }
function fitTo(withEv: Mark[]) {
  const pts: [number, number][] = []; withEv.forEach(({ p, ev }) => { if (!MV.hidden.has(p.id)) ev.forEach(e => pts.push(proj(e.lat!, e.lon!))) })
  if (pts.length < 2) { MV.view = { x: 0, y: 0, k: 1 }; return }
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys)
  const bw = Math.max(60, x1 - x0 + 240), bh = Math.max(40, y1 - y0 + 80); const k = Math.min(6, Math.max(1, Math.min(1000 / bw, 420 / bh)))
  MV.view = { k, x: 540 - (x0 + x1) / 2 * k, y: 210 - (y0 + y1) / 2 * k }; clamp()
}

export default function MapPage() {
  const svgRef = useRef<SVGSVGElement>(null), gRef = useRef<SVGGElement>(null), tipRef = useRef<HTMLDivElement>(null)
  const withEv: Mark[] = S.people.map((p, i) => ({ p, i, ev: (p.events || []).filter(e => e.lat != null && e.lon != null).sort((a, b) => (+a.year || 0) - (+b.year || 0)) })).filter(x => x.ev.length)
  if (MV.refit !== ui.mapRefit) { MV.fitted = false; MV.refit = ui.mapRefit }
  if (!MV.fitted) { fitTo(withEv); MV.fitted = true }

  const apply = () => { const g = gRef.current; if (!g) return; const k = MV.view.k; g.setAttribute('transform', `translate(${MV.view.x},${MV.view.y}) scale(${k})`); g.style.fontSize = (10 / k) + 'px'; g.querySelectorAll<SVGCircleElement>('.pt').forEach(c => c.setAttribute('r', String(+(c.dataset.r || 4) / Math.pow(k, .75)))) }
  useLayoutEffect(apply)
  useEffect(() => {
    const svg = svgRef.current!, tip = tipRef.current!; let drag: { x: number; y: number; vx: number; vy: number; pt: SVGElement | null } | null = null, moved = false
    const wheel = (e: WheelEvent) => { e.preventDefault(); const r = svg.getBoundingClientRect(); const sc = 1000 / r.width; const cx = (e.clientX - r.left) * sc, cy = (e.clientY - r.top) * sc; const k = Math.min(8, Math.max(1, MV.view.k * Math.exp(-e.deltaY * 0.0015))); const rr = k / MV.view.k; MV.view = { k, x: cx - (cx - MV.view.x) * rr, y: cy - (cy - MV.view.y) * rr }; clamp(); apply() }
    const down = (e: PointerEvent) => { drag = { x: e.clientX, y: e.clientY, vx: MV.view.x, vy: MV.view.y, pt: (e.target as Element).closest('.pt') }; moved = false; svg.setPointerCapture(e.pointerId) }
    const move = (e: PointerEvent) => {
      const pt = (e.target as Element).closest('.pt') as SVGElement | null
      if (pt && !drag) { const p = byId(pt.dataset.p!); const ev = p && p.events.find(x => x.id === pt.dataset.e); if (p && ev) { const r = (svg.parentNode as HTMLElement).getBoundingClientRect(); tip.style.display = 'block'; tip.style.left = (e.clientX - r.left) + 'px'; tip.style.top = (e.clientY - r.top) + 'px'; tip.textContent = `${fullName(p)} · ${t('ev.' + ev.type)} ${ev.year || ''} · ${ev.place}` } } else tip.style.display = 'none'
      if (drag) { const r = svg.getBoundingClientRect(); const sc = 1000 / r.width; const dx = (e.clientX - drag.x) * sc, dy = (e.clientY - drag.y) * sc; if (Math.abs(dx) + Math.abs(dy) > 2) moved = true; MV.view = { ...MV.view, x: drag.vx + dx, y: drag.vy + dy }; clamp(); apply() }
    }
    const up = () => { if (drag && !moved && drag.pt) openPerson(drag.pt.dataset.p!); drag = null }
    svg.addEventListener('wheel', wheel, { passive: false }); svg.addEventListener('pointerdown', down); svg.addEventListener('pointermove', move); svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up)
    return () => { svg.removeEventListener('wheel', wheel); svg.removeEventListener('pointerdown', down); svg.removeEventListener('pointermove', move); svg.removeEventListener('pointerup', up); svg.removeEventListener('pointercancel', up) }
  }, [])

  // tap a person to show only their route; tap them again to show everyone
  const toggle = (id: string) => {
    if (MV.focus === id) { MV.focus = null; MV.hidden = new Set() } else { MV.focus = id; MV.hidden = new Set(withEv.map(x => x.p.id).filter(x => x !== id)) }
    bump()
  }

  const routes: JSX.Element[] = [], points: JSX.Element[] = []; const labels: Record<string, { x: number; y: number; name: string }> = {}
  withEv.forEach(({ p, i, ev }) => {
    if (MV.hidden.has(p.id)) return; const col = color(i)
    if (ev.length > 1) {
      let d = ''
      for (let k = 0; k < ev.length - 1; k++) { const [x1, y1] = proj(ev[k].lat!, ev[k].lon!), [x2, y2] = proj(ev[k + 1].lat!, ev[k + 1].lon!); if (x1 === x2 && y1 === y2) continue; const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), bend = Math.min(40, L * .25); d += `M${x1} ${y1}Q${mx - dy / L * bend} ${my + dx / L * bend} ${x2} ${y2}` }
      routes.push(<path key={'r' + p.id} className="route" stroke={col} d={d} />)
    }
    ev.forEach(e => { const [x, y] = proj(e.lat!, e.lon!); points.push(<circle key={e.id + p.id} className="pt" cx={x} cy={y} r="4" data-r={e.type === 'birth' ? 4.5 : 3.5} fill={col} data-p={p.id} data-e={e.id} />); const key = e.lat!.toFixed(1) + ',' + e.lon!.toFixed(1); if (!labels[key]) labels[key] = { x, y, name: e.place } })
  })

  return (
    <section className="page active" data-page="map">
      <div className="topbar"><h2><span>{t('nav.map')}</span><span className="sub">{t('map.sub')}</span></h2>{S.people.length > 0 && <ShareButton />}</div>
      <div className="map-wrap">
        <svg id="mapSvg" viewBox="0 0 1000 420" ref={svgRef}>
          <g id="mapView" ref={gRef}>
            <path className="land" d={WORLD} transform="translate(0,-40)" />
            {routes}{points}
            {Object.entries(labels).map(([k, l]) => <text key={k} className="lbl" x={l.x + 6} y={l.y - 6}>{l.name}</text>)}
          </g>
        </svg>
        <div className="map-side"><h4>{t('map.legend')}</h4>
          <div className="legend" id="legend">
            {withEv.length ? withEv.map(({ p, i, ev }) => (
              <button key={p.id} data-id={p.id} className={MV.hidden.has(p.id) ? 'off' : ''} onClick={() => toggle(p.id)}>
                <i style={{ background: color(i) }} /><span style={{ flex: 1 }}>{fullName(p)}</span><span className="mono muted">{ev.length}</span>
              </button>
            )) : <div className="muted" style={{ fontSize: 12 }}>{t('map.empty')}</div>}
          </div>
        </div>
        <div className="map-tip" id="mapTip" ref={tipRef} />
      </div>
    </section>
  )
}
