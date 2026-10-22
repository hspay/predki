import { Fragment, useEffect, useMemo, useState } from 'react'
import { S, ui, go, t, LANG, generations, bump, type Page } from '../lib/core'
import { globeSvg } from '../lib/globe'
import { Progress } from '../lib/progress'
import { openCalendar } from './FamilyCalendar'
import { newCount } from '../lib/invites'
import { ChapterRing, LockIcon, FeatureIcon } from './Chapters'
import { isOpen, openedBy, pending } from '../lib/chapters'

/** a calendar page with two rings and a few marked days */
const CalendarIcon = () => <svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /><path d="M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01" strokeWidth="2.4" strokeLinecap="round" /></svg>

const NAV: [Page, JSX.Element][] = [
  ['tree', <svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2.5" /><circle cx="5" cy="19" r="2.5" /><circle cx="19" cy="19" r="2.5" /><path d="M12 7.5V12M12 12 5 16.5M12 12l7 4.5" /></svg>],
  // «Альбом»: a postage stamp — perforated edge, a little landscape inside
  ['progress', <svg viewBox="0 0 24 24"><path d="M5 3h14v18H5z" strokeDasharray="1.6 1.7" /><rect x="7.6" y="6" width="8.8" height="9" rx=".6" /><path d="m7.6 13.4 2.6-2.8 2.2 2.2 1.4-1.3 2.6 2.5" /><circle cx="14.2" cy="8.6" r=".9" /></svg>],
  ['map', <svg viewBox="0 0 24 24"><path d="M3 6.5 9 4l6 2.5 6-2.5v13.5L15 20l-6-2.5-6 2.5z" /><path d="M9 4v13.5M15 6.5V20" /></svg>],
  // «Альбом» (the achievements, collected as stickers): an open album with a round sticker on the right page
  ['gaps', <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.4-4.4" /></svg>],
  // «Хранитель»: the keeper of the family — you, your chapter and what you have collected
  ['keeper', <svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="3.4" /><path d="M5.6 19.2c1.2-3 3.6-4.6 6.4-4.6s5.2 1.6 6.4 4.6" /><rect x="2.8" y="2.8" width="18.4" height="18.4" rx="5" /></svg>],
  ['settings', <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>],
]

const MINI_KEY = 'predki:sbMini'
/** a closed part keeps its place in the menu; the hint says which chapter opens it */
const bookLabel = () => (LANG === 'en' ? 'Family book' : 'Книга семьи')
const lockTitle = (f: 'map' | 'calendar' | 'passport' | 'book', name: string) => isOpen(f) ? name : `${name} · ${LANG === 'en' ? 'opens with chapter' : 'откроется в главе'} ${openedBy(f) + 1}`

export default function Sidebar() {
  const logo = useMemo(() => globeSvg('#F4F2EC', 26, true), [])
  const unseen = Progress.unseen()
  // desktop only: the menu can shrink to icons; the choice is remembered in this browser
  const [mini, setMiniState] = useState(() => { try { return localStorage.getItem(MINI_KEY) === '1' } catch { return false } })
  const setMini = (v: boolean) => { setMiniState(v); try { v ? localStorage.setItem(MINI_KEY, '1') : localStorage.removeItem(MINI_KEY) } catch { /* private mode */ } }
  useEffect(() => { document.body.classList.toggle('sb-mini', mini) }, [mini])
  return (
    <aside className="sidebar">
      <div className="brand-row">
        {/* the logo opens the welcome screen again */}
        <button className="brand" id="brandBtn" type="button" aria-label="Predki" onClick={() => { ui.onboarding = true; bump() }}>
          <span className="brand-mark" dangerouslySetInnerHTML={{ __html: logo }} />
          <div><span className="brand-name">Predki</span><span className="brand-tag">{t('brand.tag')}</span></div>
        </button>
        <button className="sb-toggle" type="button" onClick={() => setMini(!mini)} aria-label={mini ? t('sb.open') : t('sb.close')} title={mini ? t('sb.open') : t('sb.close')}>
          <svg viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="3.5" /><path d="M9.5 4.5v15" /><path d={mini ? 'm13.5 10 2 2-2 2' : 'm16 10-2 2 2 2'} /></svg>
        </button>
      </div>
      <nav className="nav" id="nav">
        {NAV.map(([k, icon]) => <Fragment key={k}>
          {k === 'settings' && S.people.length > 0 && <button className={'nav-calendar' + (ui.calendar ? ' active' : '') + (isOpen('calendar') ? '' : ' locked')} onClick={openCalendar} title={lockTitle('calendar', t('nav.calendar'))}><CalendarIcon /><span>{t('nav.calendar')}</span>{!isOpen('calendar') && <LockIcon />}</button>}
          {k === 'settings' && S.people.length > 0 && <button className={'nav-book' + (ui.page === 'book' ? ' active' : '') + (isOpen('book') ? '' : ' locked')} onClick={() => go('book')} title={lockTitle('book', bookLabel())}><FeatureIcon f="book" /><span>{bookLabel()}</span>{!isOpen('book') && <LockIcon />}</button>}
          <button className={(ui.page === k ? 'active' : '') + (k === 'settings' ? ' nav-settings' : '') + (k === 'keeper' ? ' nav-keeper' : '') + (k === 'map' && !isOpen('map') ? ' locked' : '')} onClick={() => go(k)} title={k === 'map' ? lockTitle('map', t('nav.map')) : t('nav.' + k)}>
            {icon}<span>{t('nav.' + k)}</span>
            {k === 'map' && !isOpen('map') && <LockIcon />}
            {k === 'keeper' && pending() && <i className="ch-dot" aria-label={LANG === 'en' ? 'A chapter is done' : 'Глава пройдена'} />}
            {k === 'progress' && unseen > 0 && <i className="badge">{unseen}</i>}
            {k === 'gaps' && newCount() > 0 && <i className="badge">{newCount()}</i>}
          </button>
        </Fragment>)}
      </nav>
      <div className="sidebar-foot">
        <ChapterRing />
      </div>
    </aside>
  )
}
