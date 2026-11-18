import { Fragment, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ui, go, t, bump, LANG, type Page } from '../lib/core'
import { globeSvg } from '../lib/globe'
import { Progress } from '../lib/progress'
import { openCalendar } from './FamilyCalendar'
import { newCount } from '../lib/invites'
import { ChapterRing, LockIcon, FeatureIcon } from './Chapters'
import { isOpen, pending } from '../lib/chapters'
import { GuideIcon } from './GuideIcon'

/** a calendar page with two rings and a few marked days */
const CalendarIcon = () => <svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /><path d="M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01" strokeWidth="2.4" strokeLinecap="round" /></svg>

const IC = {
  tree: <svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2.5" /><circle cx="5" cy="19" r="2.5" /><circle cx="19" cy="19" r="2.5" /><path d="M12 7.5V12M12 12 5 16.5M12 12l7 4.5" /></svg>,
  album: <svg viewBox="0 0 24 24"><path d="M5 3h14v18H5z" strokeDasharray="1.6 1.7" /><rect x="7.6" y="6" width="8.8" height="9" rx=".6" /><path d="m7.6 13.4 2.6-2.8 2.2 2.2 1.4-1.3 2.6 2.5" /><circle cx="14.2" cy="8.6" r=".9" /></svg>,
  map: <svg viewBox="0 0 24 24"><path d="M3 6.5 9 4l6 2.5 6-2.5v13.5L15 20l-6-2.5-6 2.5z" /><path d="M9 4v13.5M15 6.5V20" /></svg>,
  keeper: <svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="3.4" /><path d="M5.6 19.2c1.2-3 3.6-4.6 6.4-4.6s5.2 1.6 6.4 4.6" /><rect x="2.8" y="2.8" width="18.4" height="18.4" rx="5" /></svg>,
  guide: <GuideIcon />,
  settings: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>,
  kin: <svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.4" /><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5M14.5 14.6c.8-.4 1.6-.6 2.500-.6 2.200 0 3.800 1.500 4.200 4" /></svg>,
  story: <svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.600-5.900" /><path d="M4 4.500v4h4" /><path d="M12 8v4.500l3 1.800" /></svg>,
  card: <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.5" /><circle cx="9" cy="11" r="2.2" /><path d="M5.8 16c.6-1.6 1.800-2.400 3.200-2.400s2.600.8 3.200 2.400M14.500 10h3.500M14.500 13.500h2.500" /></svg>,
}
type Sub = { k: string; label: string; icon: JSX.Element; active: boolean; locked?: boolean; badge?: number; dot?: boolean; run: () => void }
type Sec = { k: string; label: string; icon: JSX.Element; subs: Sub[] }
/** The menu in four parts, in the order of the journey: build the tree, ask relatives, see the story, your own path.
 *  On the computer «Настройки» stays at the bottom of the menu; on the phone (four tabs, no room) it is a part of «Хранитель». */
export function sections(phone: boolean): Sec[] {
  const pg = (k: Page) => ui.page === k, L = (r: string, e: string) => (LANG === 'en' ? e : r)
  const settings: Sub = { k: 'settings', label: t('nav.settings'), icon: IC.settings, active: pg('settings'), run: () => go('settings') }
  return [
    { k: 'tree', label: t('nav.tree'), icon: IC.tree, subs: [{ k: 'tree', label: t('nav.tree'), icon: IC.tree, active: pg('tree'), run: () => go('tree') }] },
    { k: 'kin', label: t('nav.gaps'), icon: IC.kin, subs: [{ k: 'gaps', label: t('nav.gaps'), icon: IC.kin, active: pg('gaps'), badge: newCount(), run: () => go('gaps') }] },
    { k: 'story', label: L('Наша история', 'Our story'), icon: IC.story, subs: [
      { k: 'map', label: L('Карта', 'Map'), icon: IC.map, active: pg('map'), locked: !isOpen('map'), run: () => go('map') },
      { k: 'calendar', label: t('nav.calendar'), icon: <CalendarIcon />, active: pg('calendar'), locked: !isOpen('calendar'), run: openCalendar },
      { k: 'book', label: L('Книга семьи', 'Family book'), icon: <FeatureIcon f="book" />, active: pg('book'), locked: !isOpen('book'), run: () => go('book') },
    ] },
    { k: 'keeper', label: t('nav.keeper'), icon: IC.keeper, subs: [
      { k: 'keeper', label: L('Профиль', 'Profile'), icon: IC.card, active: pg('keeper'), dot: pending(), run: () => go('keeper') },
      { k: 'progress', label: t('nav.progress'), icon: IC.album, active: pg('progress'), badge: Progress.unseen(), run: () => go('progress') },
      { k: 'guide', label: t('nav.guide'), icon: IC.guide, active: pg('guide'), run: () => go('guide') },
      ...(phone ? [settings] : []),
    ] },
    ...(phone ? [] : [{ k: 'settings', label: settings.label, icon: IC.settings, subs: [settings] }]),
  ]
}
const current = (secs: Sec[]) => secs.find(s => s.subs.some(x => x.active))
const PHONE = '(max-width:860px)'
/** follows the screen width, so the menu rebuilds when a window is resized across the phone layout */
function usePhone() {
  const [v, setV] = useState(() => matchMedia(PHONE).matches)
  useEffect(() => { const m = matchMedia(PHONE), f = () => setV(m.matches); m.addEventListener('change', f); return () => m.removeEventListener('change', f) }, [])
  return v
}

const MINI_KEY = 'predki:sbMini'
/** wide pages: the menu folds to icons on its own when one opens, and goes back to the saved choice on leaving */
/** a closed part keeps its place in the menu; the hint says which chapter opens it */

export default function Sidebar() {
  const logo = useMemo(() => globeSvg('#F4F2EC', 26, true), [])
  const phone = usePhone()
  const all = sections(phone), act = current(all)
  const secs = all.filter(s => s.k !== 'settings'), setSec = all.find(s => s.k === 'settings')
  // which sections are unfolded: all folded when the app opens; only the person unfolds them
  const [open, save] = useState<string[]>([])
  // phone: which section's list is open above its tab, and where that tab is
  const [pop, setPop] = useState<{ k: string; r: DOMRect } | null>(null)
  useEffect(() => { if (!pop) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setPop(null) }; const r = () => setPop(null)
    addEventListener('keydown', k); addEventListener('resize', r); return () => { removeEventListener('keydown', k); removeEventListener('resize', r) } }, [pop])
  // on the phone a section is a tab: it opens its first part; on the computer it only unfolds or folds
  const enter = (sec: Sec, cur: boolean, btn?: HTMLElement) => {
    if (sec.subs.length < 2) return sec.subs[0].run()
    if (phone) { setPop(pop && pop.k === sec.k ? null : { k: sec.k, r: btn!.getBoundingClientRect() }); return }
    save(open.includes(sec.k) ? open.filter(k => k !== sec.k) : [...open, sec.k])
  }
  // desktop only: the menu can shrink to icons; the choice is remembered in this browser
  const [mini, setMiniState] = useState(() => { try { return localStorage.getItem(MINI_KEY) === '1' } catch { return false } })
  const setMini = (v: boolean) => { setMiniState(v); try { v ? localStorage.setItem(MINI_KEY, '1') : localStorage.removeItem(MINI_KEY) } catch { /* private mode */ } }
  // the menu folds only by the person's choice (no more auto-folding on Карта and Путеводитель)
  const folded = mini
  const toggle = () => setMini(!mini)
  // before the page's own effects run, so the map measures its final width on the first draw
  useLayoutEffect(() => { document.body.classList.toggle('sb-mini', folded) }, [folded])
  return (
    <aside className="sidebar">
      <div className="brand-row">
        {/* the logo opens the welcome screen again */}
        <button className="brand" id="brandBtn" type="button" aria-label="Predki" onClick={() => { ui.onboarding = true; bump() }}>
          <span className="brand-mark" dangerouslySetInnerHTML={{ __html: logo }} />
          <div><span className="brand-name">Predki</span><span className="brand-tag">{t('brand.tag')}</span></div>
        </button>
        <button className="sb-toggle" type="button" onClick={toggle} aria-label={folded ? t('sb.open') : t('sb.close')} title={folded ? t('sb.open') : t('sb.close')}>
          <svg viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="3.5" /><path d="M9.5 4.5v15" /><path d={folded ? 'm13.5 10 2 2-2 2' : 'm16 10-2 2 2 2'} /></svg>
        </button>
      </div>
      <nav className="nav nav2" id="nav">
        {secs.map(sec => { const cur = sec === act, many = sec.subs.length > 1, unfolded = many && open.includes(sec.k)
          const badge = sec.subs.reduce((n, x) => n + (x.badge || 0), 0), dot = sec.subs.some(x => x.dot)
          return <Fragment key={sec.k}>
            <button className={'sec' + (cur ? ' active' : '')} aria-expanded={many ? (pop ? pop.k === sec.k : unfolded) : undefined} title={sec.label} onClick={e => enter(sec, cur, e.currentTarget)}>
              {sec.icon}<span>{sec.label}</span>
              {dot && <i className="ch-dot" aria-label="Глава пройдена" />}
              {badge > 0 && <i className="badge">{badge}</i>}
              {many && <svg className="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 14.5 5-5 5 5" /></svg>}
            </button>
            {unfolded && <div className="subs">
              {sec.subs.map(x => <button key={x.k} className={'sub' + (x.active ? ' on' : '') + (x.locked ? ' locked' : '')} title={x.label} onClick={x.run}>{x.icon}<span>{x.label}</span>{x.locked && <LockIcon />}{!!x.badge && <i className="badge">{x.badge}</i>}</button>)}
            </div>}
          </Fragment> })}
      </nav>
      {pop && (() => { const sec = secs.find(s => s.k === pop.k)!, W = 236, vw = innerWidth
        const left = Math.max(10, Math.min(vw - W - 10, pop.r.left + pop.r.width / 2 - W / 2))
        const tail = Math.max(18, Math.min(W - 18, pop.r.left + pop.r.width / 2 - left))
        return createPortal(<div className="sec-pop-veil" onClick={() => setPop(null)}>
          <div className="sec-pop" role="menu" aria-label={sec.label} style={{ left, width: W, bottom: innerHeight - pop.r.top + 10, ['--tail' as string]: tail + 'px' }} onClick={e => e.stopPropagation()}>
            {sec.subs.map(x => <button key={x.k} type="button" role="menuitem" className={'sub' + (x.active ? ' on' : '') + (x.locked ? ' locked' : '')} onClick={() => { setPop(null); x.run() }}>
              {x.icon}<span>{x.label}</span>{x.locked && <LockIcon />}{!!x.badge && <i className="badge">{x.badge}</i>}</button>)}
          </div>
        </div>, document.body) })()}
      <div className="sidebar-foot">
        {setSec && <nav className="nav nav2 nav-foot" aria-label={setSec.label}>
          <button className={'sec' + (act === setSec ? ' active' : '')} title={setSec.label} onClick={setSec.subs[0].run}>{setSec.icon}<span>{setSec.label}</span></button>
        </nav>}
        <ChapterRing />
      </div>
    </aside>
  )
}
