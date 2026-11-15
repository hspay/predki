import { useEffect, useRef } from 'react'
import { FirstRun as Dialog } from '../lib/firstRun'
import { CITIES } from '../lib/world'
import { LANG, completeFirstRun, askToSignIn, signOut, cloud } from '../lib/core'

/** First run of an empty family: the five-step dialog over the Tree page (lib/firstRun.ts). */
export default function FirstRun() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const destroy = Dialog.mount(ref.current!, {
      lang: LANG, cities: CITIES.map(c => (LANG === 'en' ? c.en : c.ru)),
      onDone: completeFirstRun, email: cloud.session?.user.email || '',
      onSignIn: askToSignIn, onSignOut: () => { signOut() },
    })
    return () => destroy()
  }, [])
  return <div id="firstRun" ref={ref} />
}
