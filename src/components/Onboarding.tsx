import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Landing } from '../lib/landing'
import '../landing.css'
import { Sky } from '../lib/sky'
import { WORLD } from '../lib/world'
import { predkiLogo } from '../lib/logo'
import { S, LANG, finishOnboarding, setLang } from '../lib/core'

/** Welcome landing: hero collage, app tabs, snippets, family phone and planet CTA. The landing itself is framework-free (lib/landing.js). */
export default function Onboarding() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current!; el.scrollTop = 0
    const destroy = Landing.mount(el, {
      gsap, ScrollTrigger, lang: LANG, world: WORLD, sky: Sky, logo: predkiLogo,
      hasData: () => S.people.length > 0,
      onStart: (how: 'sample' | 'blank' | null) => finishOnboarding(S.people.length ? null : how),
      onBrand: () => finishOnboarding(S.people.length ? null : 'blank'),
      onLang: (l: 'ru' | 'en') => setLang(l),
    })
    return () => { if (typeof destroy === 'function') destroy() }
  }, [])
  return <div id="landing" ref={ref} />
}
