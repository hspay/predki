import { useEffect, useLayoutEffect, useRef } from 'react'
import { LANG } from '../lib/core'

// The family's name above the Tree as a split-flap board, like the cities on the welcome screen.
// Drawn in the tree's own SVG (it zooms with the tree and works in every browser): each tile is two halves,
// a flap folds down over the hinge when a letter changes. A tap runs the letters and lands on the name again;
// a tree opened by link (or a demo family) starts blank and flips to the name once the tree has grown.

/** tile size in tree units: the old title was 64 px type */
export const FT = { W: 58, H: 80, G: 6 }
const ABC = { ru: 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ', en: 'ABCDEFGHIJKLMNOPRSTUVWXYZ' }
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
const FLIP = 120 // ms for one letter: the top flap falls in the first half, the bottom one opens in the second

interface Cell { top: SVGTextElement; bot: SVGTextElement; ft: SVGGElement; ftT: SVGTextElement; ftShade: SVGRectElement; fb: SVGGElement; fbT: SVGTextElement }

/** word — what the board says; cx, y — its top centre in tree units; maxW — wider names are scaled down to it;
 *  play — a tap (each change runs the letters); start — blank first, then flip to the name after this many ms (null: show it at once) */
export default function FlapTitle({ word, cx, y, maxW, play, start }: { word: string; cx: number; y: number; maxW: number; play: number; start: number | null }) {
  const up = word.toLocaleUpperCase(LANG === 'en' ? 'en' : 'ru')
  const n = Math.max(1, [...up].length)
  const cells = useRef<(Cell | null)[]>([]), state = useRef<string[]>([]), timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const anims = useRef(new Map<number, number>()), raf = useRef(0)
  const { W, H, G } = FT, total = n * W + (n - 1) * G, s = Math.min(1, maxW / total)

  const hinge = (k: number) => `translate(0 ${H / 2}) scale(1 ${Math.max(k, .001)}) translate(0 ${-H / 2})`
  const paint = (i: number, ch: string) => { const c = cells.current[i]; if (!c) return; state.current[i] = ch; c.top.textContent = ch; c.bot.textContent = ch; c.ft.style.visibility = 'hidden'; c.fb.style.visibility = 'hidden' }
  /** one frame for every flap in motion */
  const tick = () => {
    raf.current = 0; const now = performance.now()
    anims.current.forEach((t0, i) => {
      const c = cells.current[i]; if (!c) { anims.current.delete(i); return }
      const p = (now - t0) / FLIP
      if (p >= 1) { c.bot.textContent = state.current[i]; c.ft.style.visibility = 'hidden'; c.fb.style.visibility = 'hidden'; anims.current.delete(i); return }
      if (p < .5) { const k = 1 - p * 2; c.ft.style.visibility = 'visible'; c.ft.setAttribute('transform', hinge(k)); c.ftShade.setAttribute('opacity', String((1 - k) * .5)); c.fb.style.visibility = 'hidden' }
      else { c.ft.style.visibility = 'hidden'; c.fb.style.visibility = 'visible'; c.fb.setAttribute('transform', hinge((p - .5) * 2)) }
    })
    if (anims.current.size) raf.current = requestAnimationFrame(tick)
  }
  const flip = (i: number, ch: string) => {
    const c = cells.current[i]; if (!c) return
    const old = state.current[i] ?? ' '; state.current[i] = ch
    c.top.textContent = ch; c.bot.textContent = old; c.ftT.textContent = old; c.fbT.textContent = ch
    anims.current.set(i, performance.now()); if (!raf.current) raf.current = requestAnimationFrame(tick)
  }
  /** each tile runs a few random letters and lands on its own one, a little after its left neighbour */
  const run = (target: string) => {
    timers.current.forEach(clearTimeout); timers.current = []
    const chars = [...target.padEnd(n, ' ')], abc = ABC[LANG === 'en' ? 'en' : 'ru']
    chars.forEach((ch, i) => {
      if (reduced()) { paint(i, ch); return }
      const steps = ch === ' ' && (state.current[i] ?? ' ') === ' ' ? 0 : 3 + ((i * 7 + n) % 4)
      if (!steps) return
      const seq = [...Array(steps)].map(() => abc[Math.floor(Math.random() * abc.length)]).concat(ch)
      seq.forEach((x, k) => timers.current.push(setTimeout(() => flip(i, x), i * 55 + k * (FLIP + 10))))
    })
  }

  // first show: the name at once, or blank tiles that flip to it later (a tree opened by link, a demo family)
  const shown = useRef('')
  useLayoutEffect(() => {
    if (start != null && !reduced()) { [...Array(n).keys()].forEach(i => paint(i, ' ')); shown.current = up; timers.current.push(setTimeout(() => run(up), start)) }
    else { [...up.padEnd(n, ' ')].forEach((ch, i) => paint(i, ch)); shown.current = up }
    return () => { timers.current.forEach(clearTimeout); timers.current = []; cancelAnimationFrame(raf.current); raf.current = 0; anims.current.clear() }
  }, [start])
  // a new family name: the board flips to it
  useEffect(() => { if (shown.current && shown.current !== up) { shown.current = up; run(up) } }, [up])
  // a tap: the letters run and come back to the name
  useEffect(() => { if (play) run(up) }, [play])

  const fs = 66
  const txt = (ref: (e: SVGTextElement | null) => void) => <text ref={ref} x={W / 2} y={H / 2 + 2} textAnchor="middle" dominantBaseline="central" fontSize={fs} />
  return (
    <g className="tflap" transform={`translate(${cx - total * s / 2} ${y}) scale(${s})`} role="img" aria-label={word}>
      <title>{word}</title>
      <rect width={total} height={FT.H} fill="transparent" />
      <defs>
        <clipPath id="tfTile"><rect width={W} height={H} rx="7" /></clipPath>
        <clipPath id="tfTop"><rect width={W} height={H / 2} /></clipPath>
        <clipPath id="tfBot"><rect y={H / 2} width={W} height={H / 2} /></clipPath>
      </defs>
      {[...Array(n).keys()].map(i => {
        const set = (k: keyof Cell) => (e: SVGTextElement | SVGGElement | SVGRectElement | null) => { const c = (cells.current[i] = cells.current[i] || ({} as Cell)); (c as unknown as Record<string, unknown>)[k] = e }
        return (
          <g key={i} transform={`translate(${i * (W + G)} 0)`}>
            <rect className="tf-sh" width={W} height={H} rx="7" />
            <g clipPath="url(#tfTile)">
              <g clipPath="url(#tfTop)"><rect className="tf-t" width={W} height={H} />{txt(set('top'))}</g>
              <g clipPath="url(#tfBot)"><rect className="tf-b" width={W} height={H} />{txt(set('bot'))}</g>
              <g ref={set('ft')} style={{ visibility: 'hidden' }}><g clipPath="url(#tfTop)"><rect className="tf-t" width={W} height={H} />{txt(set('ftT'))}<rect ref={set('ftShade')} width={W} height={H / 2} fill="#000" opacity="0" /></g></g>
              <g ref={set('fb')} style={{ visibility: 'hidden' }}><g clipPath="url(#tfBot)"><rect className="tf-b" width={W} height={H} />{txt(set('fbT'))}</g></g>
              <rect className="tf-hinge" y={H / 2 - .75} width={W} height="1.5" />
            </g>
          </g>
        )
      })}
    </g>
  )
}
