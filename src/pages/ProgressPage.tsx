import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { S, t, persist, bump } from '../lib/core'
import { Progress } from '../lib/progress'
import { ShareButton } from '../components/ShareSheet'

type Node = any // achievement node, see lib/progress.ts
const P = Progress

function Glyph({ n, size, st }: { n: Node; size: number; st: string }) {
  if (n.br === 'secret' && st !== 'done') return <text className="gl" fontSize={size * .9}>?</text>
  if (n.gl) { const fs = n.gl.length >= 4 ? size * .5 : n.gl.length === 3 ? size * .62 : size * .78; return <text className="gl" fontSize={fs} y="1">{n.gl}</text> }
  const s = size / 24
  return <g className="ic" strokeWidth={(1.6 / s).toFixed(2)} transform={`scale(${s.toFixed(3)}) translate(-12 -12)`} dangerouslySetInnerHTML={{ __html: P.IC[n.ic] }} />
}
function Badge({ n, px }: { n: Node; px: number }) {
  const st = P.ST[n.id], r = px / 2 - 3
  return <svg viewBox={`${-px / 2} ${-px / 2} ${px} ${px}`} aria-hidden="true"><g className={`nd ${st} ${n.br === 'secret' ? 'secret' : ''}`} style={{ filter: 'none' }}><circle className="base" r={r} /><Glyph n={n} size={r * 1.05} st={st} /></g></svg>
}

/** Achievements as a skill tree: Род · Летопись · Странствия. Tap a star to see what to fill in next. */
export default function ProgressPage() {
  P.evaluate()
  const ST = P.ST, N: Node[] = P.N, BR = P.BR, w = P.w, tx = P.tx
  const [selected, setSelected] = useState<string | null>(null) // the page always opens without a card
  const [fresh] = useState<string[]>(() => (S.achievements || []).filter(id => !(S.achSeen || []).includes(id)))
  const stageRef = useRef<HTMLDivElement>(null), tipRef = useRef<HTMLDivElement>(null)
  // pan & zoom: the view is a centre + zoom over the whole achievement map (k = 1 shows everything)
  const svgRef = useRef<SVGSVGElement>(null), view = useRef({ cx: 0, cy: 0, k: 1, init: false }), box = useRef({ x: 0, y: 0, w: 1, h: 1 }), dragged = useRef(false)

  // everything visible now counts as seen (the white dots stay until the next visit)
  useEffect(() => { if (fresh.length) { S.achSeen = [...new Set([...(S.achSeen || []), ...fresh])]; persist(); bump() } }, [])
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null) }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k) }, [])

  const xs = N.map(n => n.x), ys = N.map(n => n.y)
  const x0 = Math.min(...xs, BR.kin.lx) - 50, x1 = Math.max(...xs, BR.road.lx) + 50, y0 = Math.min(...ys, BR.chron.ly) - 45, y1 = Math.max(...ys) + 60
  box.current = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
  const apply = (anim?: boolean) => {
    const svg = svgRef.current; if (!svg) return; const v = view.current, B = box.current
    if (!v.init) { v.cx = B.x + B.w / 2; v.cy = B.y + B.h / 2; v.init = true }
    v.k = Math.min(5, Math.max(1, v.k)); const w = B.w / v.k, h = B.h / v.k
    v.cx = Math.min(B.x + B.w - w / 2, Math.max(B.x + w / 2, v.cx)); v.cy = Math.min(B.y + B.h - h / 2, Math.max(B.y + h / 2, v.cy))
    if (anim) { svg.style.transition = 'none' }
    svg.setAttribute('viewBox', `${(v.cx - w / 2).toFixed(1)} ${(v.cy - h / 2).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`)
    if (tipRef.current) tipRef.current.hidden = true
  }
  useLayoutEffect(() => apply())
  const toSvg = (x: number, y: number) => { const svg = svgRef.current!, m = svg.getScreenCTM(); if (!m) return { x: 0, y: 0 }; const p = new DOMPoint(x, y).matrixTransform(m.inverse()); return { x: p.x, y: p.y } }
  const zoomAt = (f: number, x?: number, y?: number) => {
    const v = view.current, svg = svgRef.current!, r = svg.getBoundingClientRect()
    const p = toSvg(x ?? r.left + r.width / 2, y ?? r.top + r.height / 2), k2 = Math.min(5, Math.max(1, v.k * f)), q = v.k / k2
    v.cx = p.x + (v.cx - p.x) * q; v.cy = p.y + (v.cy - p.y) * q; v.k = k2; apply()
  }
  const fitAll = () => { const v = view.current; v.k = 1; v.init = false; apply() }
  useEffect(() => {
    const svg = svgRef.current!; const pts = new Map<number, { x: number; y: number }>(); let start: { x: number; y: number; cx: number; cy: number; d: number; k: number } | null = null
    const wheel = (e: WheelEvent) => { e.preventDefault(); zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0018)), e.clientX, e.clientY) }
    const down = (e: PointerEvent) => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); dragged.current = false
      const a = [...pts.values()], v = view.current
      start = { x: a.reduce((s, p) => s + p.x, 0) / a.length, y: a.reduce((s, p) => s + p.y, 0) / a.length, cx: v.cx, cy: v.cy, d: a.length > 1 ? Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) : 0, k: v.k }
    }
    const move = (e: PointerEvent) => {
      if (!pts.has(e.pointerId) || !start) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
      const a = [...pts.values()], mx = a.reduce((s, p) => s + p.x, 0) / a.length, my = a.reduce((s, p) => s + p.y, 0) / a.length
      if (!dragged.current && Math.hypot(mx - start.x, my - start.y) < 5 && a.length < 2) return
      if (!dragged.current) { dragged.current = true; try { svg.setPointerCapture(e.pointerId) } catch { /* ignore */ } }
      const v = view.current, m = svg.getScreenCTM(); if (!m) return; const sc = 1 / m.a
      if (a.length > 1 && start.d) { const d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); v.k = Math.min(5, Math.max(1, start.k * d / start.d)) }
      v.cx = start.cx - (mx - start.x) * sc; v.cy = start.cy - (my - start.y) * sc; apply()
      if (a.length > 1) { start = { ...start, x: mx, y: my, cx: v.cx, cy: v.cy } ; start.d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); start.k = v.k }
    }
    const up = (e: PointerEvent) => { pts.delete(e.pointerId); const a = [...pts.values()]; const v = view.current; start = a.length ? { x: a[0].x, y: a[0].y, cx: v.cx, cy: v.cy, d: 0, k: v.k } : null }
    const stop = (e: MouseEvent) => { if (dragged.current) { e.stopPropagation(); e.preventDefault(); dragged.current = false } }
    const rs = () => apply()
    svg.addEventListener('wheel', wheel, { passive: false }); svg.addEventListener('pointerdown', down); svg.addEventListener('pointermove', move); svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up); svg.addEventListener('click', stop, true); addEventListener('resize', rs)
    return () => { svg.removeEventListener('wheel', wheel); svg.removeEventListener('pointerdown', down); svg.removeEventListener('pointermove', move); svg.removeEventListener('pointerup', up); svg.removeEventListener('pointercancel', up); svg.removeEventListener('click', stop, true); removeEventListener('resize', rs) }
  }, [])

  const showTip = (e: React.PointerEvent, n: Node) => {
    const st = ST[n.id], hid = n.br === 'secret' && st !== 'done', stage = stageRef.current!, tip = tipRef.current!
    const sr = stage.getBoundingClientRect(), b = (e.currentTarget.querySelector('.base') as Element).getBoundingClientRect()
    const right = st === 'done' ? w('done').toLowerCase() : st === 'ready' ? w('ready').toLowerCase() : hid ? '?' : n.goal > 1 ? Math.round(P.ratio(n) * 100) + '%' : w(st).toLowerCase()
    tip.innerHTML = ''; const bb = document.createElement('b'); bb.textContent = hid ? w('hidden') : tx(n.t); const sp = document.createElement('span'); sp.textContent = right; tip.append(bb, sp)
    tip.style.left = (b.left + b.width / 2 - sr.left + stage.scrollLeft) + 'px'; tip.style.top = (b.top - sr.top + stage.scrollTop) + 'px'; tip.hidden = false
  }

  return (
    <section className="page active" data-page="progress" id="pgPage">
      <div className="topbar"><h2><span>{t('nav.progress')}</span><span className="sub" id="pgSub">{N.filter(n => ST[n.id] === 'done').length} / {N.length}</span></h2>{S.people.length > 0 && <ShareButton />}</div>
      <div className="pg-body">
        <div className="pg-col">
          <div className="pg-stage" id="pgStage" ref={stageRef} onClick={e => { if (!(e.target as Element).closest('.nd')) setSelected(null) }}>
            <svg id="pgSvg" ref={svgRef} role="img" aria-label="Achievements">
              <defs>
                <radialGradient id="pgGold" cx=".38" cy=".3" r=".8"><stop offset="0" stopColor="#FFE9B8" /><stop offset=".55" stopColor="#F2C879" /><stop offset="1" stopColor="#C98F3A" /></radialGradient>
                <filter id="pgGlow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur in="SourceAlpha" stdDeviation="6" result="b" /><feFlood floodColor="#F2C879" floodOpacity=".5" result="f" /><feComposite in="f" in2="b" operator="in" result="g" /><feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              </defs>
              <g id="pgRegions">{['kin', 'chron', 'road'].map(b => { const h = P.hull(N.filter(n => n.br === b).map(n => [n.x, n.y])); return <g key={b} className="region"><path d={'M' + h.map((p: number[]) => p.join(' ')).join('L') + 'Z'} fill="#9DB0E0" stroke="#9DB0E0" strokeWidth="96" strokeLinejoin="round" /></g> })}</g>
              <g id="pgLinks">{N.flatMap(n => n.req.map((r: string) => { const a: Node = P.byN(r), sa = ST[a.id], sb = ST[n.id]; return <path key={r + n.id} className={`ln ${sa === 'done' && sb === 'done' ? 'gold' : sa === 'done' ? 'front' : 'dim'}${n.br === 'link' ? ' bridge' : ''}`} d={`M${a.x} ${a.y}L${n.x} ${n.y}`} /> }))}</g>
              <g id="pgLabels">
                {['kin', 'chron', 'road'].map(b => { const B = BR[b], all = N.filter(n => n.br === b), got = all.filter(n => ST[n.id] === 'done').length; return <g key={b}><text className="rlabel" x={B.lx} y={B.ly} textAnchor={B.a}>{B[P.L()].toUpperCase()}</text><text className="rcount" x={B.lx} y={B.ly + 20} textAnchor={B.a}>{got} / {all.length}</text></g> })}
                {N.filter(n => n.br === 'secret').map(n => <text key={n.id} className="slabel" x={n.x} y={n.y + n.r + 22} textAnchor="middle">{ST[n.id] === 'done' ? tx(n.t).toUpperCase() : w('secretL')}</text>)}
              </g>
              <g id="pgNodes">{N.map(n => {
                const st = ST[n.id], r = n.r, pr = P.ratio(n), arc = (st === 'avail' || st === 'lock') && pr > 0 && n.goal > 1 && n.br !== 'secret', C = 2 * Math.PI * (r + 5), hid = n.br === 'secret' && st !== 'done'
                return (
                  <g key={n.id} className={`nd ${st} ${n.br === 'secret' ? 'secret' : ''} ${selected === n.id ? 'selected' : ''}`} data-id={n.id} transform={`translate(${n.x.toFixed(1)} ${n.y.toFixed(1)})`} tabIndex={0} role="button" aria-label={hid ? w('hidden') : tx(n.t)}
                    onClick={() => setSelected(n.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(n.id) } }}
                    onPointerOver={e => showTip(e, n)} onPointerOut={e => { const rt = e.relatedTarget as Element | null; if (!rt || !rt.closest || !rt.closest('.nd')) tipRef.current!.hidden = true }}>
                    <circle className="halo" r={r + 4} />
                    {n.tier === 4 && <circle r={r + 9} fill="none" stroke={st === 'done' ? 'rgba(242,200,121,.55)' : 'rgba(255,255,255,.12)'} strokeWidth="1" />}
                    {arc && <><circle className="ptrack" r={r + 5} /><circle className="parc" r={r + 5} strokeDasharray={`${(C * pr).toFixed(1)} ${C.toFixed(1)}`} transform="rotate(-90)" /></>}
                    <circle className="base" r={r} /><Glyph n={n} size={r * 1.05} st={st} /><circle className="sel" r={r + 11} />
                    {fresh.includes(n.id) && <circle className="newdot" cx={(r * .72).toFixed(1)} cy={(-r * .72).toFixed(1)} r="4.5" />}
                  </g>
                )
              })}</g>
            </svg>
            <div className="pg-tip" id="pgTip" ref={tipRef} hidden />
            <div className="pg-zoom">
              <button className="btn icon" type="button" title="+" aria-label="+" onClick={() => zoomAt(1.35)}><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg></button>
              <button className="btn icon" type="button" title="−" aria-label="−" onClick={() => zoomAt(1 / 1.35)}><svg viewBox="0 0 24 24"><path d="M5 12h14" /></svg></button>
              <button className="btn icon" type="button" title="fit" aria-label="fit" onClick={fitAll}><svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg></button>
            </div>
          </div>
          <div className="pg-legend" id="pgLegend">{([['done', 'lg-done'], ['ready', 'lg-ready'], ['avail', 'lg-avail'], ['lock', 'lg-lock']] as const).map(([k, c]) => <span key={k}><i className={c} />{w(k)}</span>)}</div>
        </div>
        {selected && <Sheet id={selected} select={setSelected} />}
      </div>
    </section>
  )
}

/** The light card that opens on tap: icon, title, description, progress, tip and one action. */
function Sheet({ id, select }: { id: string; select: (id: string | null) => void }) {
  const n: Node = P.byN(id); if (!n) return null
  const ST = P.ST, w = P.w, tx = P.tx, st = ST[n.id], hid = n.br === 'secret' && st !== 'done', bar = n.goal > 1 && !hid && st !== 'done'
  const blockers = n.req.filter((r: string) => ST[r] !== 'done').map(P.byN)
  let status = ''
  if (st === 'done') { const d = P.earnedDate(n); status = d ? P.fill(w('got'), { d }) : w('done') }
  else if (st === 'ready' && blockers.length) status = P.fill(w('readyS'), { b: tx((blockers.find((x: Node) => ST[x.id] === 'avail') || blockers[0]).t) })
  const act = P.act(n, st, select)
  return (
    <section className="pg-sheet" id="pgSheet" aria-live="polite">
      <button className="x" aria-label={w('close')} onClick={() => select(null)}><svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: P.IC.x }} /></button>
      <div className="head"><Badge n={n} px={48} /><h3>{hid ? w('hidden') : tx(n.t)}</h3></div>
      <p className="desc">{hid ? w('hiddenD') + tx(n.hint) : tx(n.d)}</p>
      {bar && <div className="cond"><div className="bar"><i style={{ width: (P.ratio(n) * 100).toFixed(1) + '%' }} /></div><div className="barrow"><span>{P.fmt(n)}</span><span className="mono">{Math.round(P.ratio(n) * 100)}%</span></div></div>}
      {status && <p className="status">{status}</p>}
      {(st === 'avail' || st === 'lock') && !hid && <div className="hint"><svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: P.IC.bulb }} /><span>{tx(n.tip)}</span></div>}
      <button className={'btn ' + (act.primary ? 'primary' : '')} onClick={act.run}>{act.label} <svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: P.IC.arrow }} /></button>
    </section>
  )
}
