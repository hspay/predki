import { useEffect, useRef } from 'react'
import { ui, t } from '../lib/core'
import { mountMap } from '../lib/mapview'

// The map itself lives in lib/mapview.js (imperative SVG for smooth zoom and the story playback); the page mounts it.
export default function MapPage() {
  const ref = useRef<HTMLDivElement>(null), inst = useRef<ReturnType<typeof mountMap> | null>(null)
  useEffect(() => {
    inst.current = mountMap(ref.current!); inst.current.refit(ui.mapRefit)
    return () => { inst.current?.destroy(); inst.current = null }
  }, [])
  // every store update: rebuild only if the family data or language changed, refit after an import
  useEffect(() => { inst.current?.update(); inst.current?.refit(ui.mapRefit) })
  return (
    <section className="page active" data-page="map">
      <div className="topbar"><h2><span>{t('nav.map')}</span><span className="sub">{t('map.sub')}</span></h2></div>
      <div className="mp-body" ref={ref} />
    </section>
  )
}
