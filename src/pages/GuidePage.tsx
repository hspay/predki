import { useEffect, useLayoutEffect, useRef } from 'react'
import { ui } from '../lib/core'
import { initGuide, jumpTo } from '../lib/guide'
import html from '../guide/content.html?raw'
import '../guide/guide.css'

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
