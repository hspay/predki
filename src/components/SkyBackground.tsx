import { useEffect, useRef } from 'react'
import { Sky } from '../lib/sky'

/** Ambient starfield behind the whole app (canvas, ~24 fps). */
export default function SkyBackground() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => Sky.start(ref.current), [])
  return <div id="sky"><canvas id="skyCanvas" ref={ref} /></div>
}
