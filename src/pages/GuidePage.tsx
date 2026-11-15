/// <reference types="vite/client" />
import { useEffect, useLayoutEffect, useRef } from 'react'
import { ui } from '../lib/core'
import { initGuide, jumpTo } from '../lib/guide'
import raw from '../guide/content.html?raw'
import '../guide/guide.css'

// the guide's photos live in guide/photos; the markup names one as %photo:<file name>% and gets its address in the build here
const PHOTOS = import.meta.glob('../guide/photos/*.webp', { eager: true, import: 'default' }) as Record<string, string>
const html = raw.replace(/%photo:([\w-]+)%/g, (_m, name) => PHOTOS[`../guide/photos/${name}.webp`] || '')

/** «Путеводитель»: FAQ, a checklist for talking to relatives and how to ask the state archives.
 *  Static markup from guide/content.html (Russian only for now), behaviour in lib/guide.ts. */
export default function GuidePage() {
  const root = useRef<HTMLElement>(null), scroller = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!root.current || !scroller.current) return
    return initGuide(root.current, scroller.current)
  }, [])
  // a link from another page («Где искать →», «Как говорить с родными») opens the guide right at its section
  const at = ui.guideAt
  useLayoutEffect(() => {
    if (!at || !root.current) return
    jumpTo(root.current, at); ui.guideAt = ''
  }, [at])
  return (
    <section className="page active" data-page="guide" id="guidePage" ref={root}>
      <div className="gd-scroll" ref={scroller} dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  )
}
