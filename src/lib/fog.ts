// Fog: soft drifting clouds drawn on a canvas, thinner as `density` goes to 0, with a clearing around the family.
export interface Fog { density: number; target: number; color: [number, number, number]; destroy: () => void }

export function mountFog(cv: HTMLCanvasElement, opts: { density?: number; clear?: number } = {}): Fog {
  const ctx = cv.getContext('2d')!
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  let s = 17; const R = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
  const blobs = Array.from({ length: 34 }, () => ({ x: R(), y: R(), r: .16 + R() * .3, vx: (R() - .5) * .012, vy: (R() - .5) * .006, a: .35 + R() * .5, ph: R() * 6.28 }))
  const fog: Fog = { density: opts.density ?? 1, target: opts.density ?? 1, color: [200, 210, 240], destroy: () => {} }
  let raf = 0, last = 0, visible = true; const t0 = performance.now()
  const draw = (now: number) => {
    raf = requestAnimationFrame(draw); if (!visible || now - last < 1000 / 30) return; last = now
    const t = reduce ? 0 : (now - t0) / 1000
    const W = Math.max(2, Math.round(cv.clientWidth * .5)), H = Math.max(2, Math.round(cv.clientHeight * .5))
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H }
    fog.density += (fog.target - fog.density) * (reduce ? 1 : .03)
    const col = fog.color.join(','), M = Math.max(W, H)
    ctx.clearRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'
    for (const b of blobs) {
      const x = (((b.x + b.vx * t) % 1.4) + 1.4) % 1.4 - .2, y = (((b.y + b.vy * t) % 1.2) + 1.2) % 1.2 - .1
      const a = b.a * fog.density * (.75 + .25 * Math.sin(t * .4 + b.ph)) * .55
      const g = ctx.createRadialGradient(x * W, y * H, 0, x * W, y * H, b.r * M)
      g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    }
    ctx.globalCompositeOperation = 'destination-out'
    const clear = (1 - fog.density) * .75 + (opts.clear ?? .1)
    const g = ctx.createRadialGradient(W / 2, H * .52, 0, W / 2, H * .52, M * (.18 + clear * .55))
    g.addColorStop(0, `rgba(0,0,0,${Math.min(1, .35 + clear)})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    ctx.globalCompositeOperation = 'source-over'
  }
  const io = new IntersectionObserver(es => { visible = es[0].isIntersecting }); io.observe(cv)
  raf = requestAnimationFrame(draw)
  fog.destroy = () => { cancelAnimationFrame(raf); io.disconnect() }
  return fog
}
