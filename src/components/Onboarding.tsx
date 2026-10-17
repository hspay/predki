import Landing from './Landing'
import { S, LANG, finishOnboarding, setLang, bump } from '../lib/core'
import { openDemo } from '../lib/demo'
import { goal } from '../lib/analytics'

/** Welcome landing (October 2026 redesign): components/Landing.tsx. The old one is kept in _backup/landing-v2. */
export default function Onboarding() {
  return <Landing lang={LANG === 'en' ? 'en' : 'ru'} hasData={S.people.length > 0}
    onStart={how => { goal('landing_start'); finishOnboarding(S.people.length ? null : how) }}
    onLang={l => { setLang(l); bump() }} onDemo={() => openDemo()} />
}
