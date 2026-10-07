import { Fragment, useEffect, useMemo, useState } from 'react'
import { S, ui, go, setLang, t, LANG, generations, type Page } from '../lib/core'
import { predkiLogo } from '../lib/logo'
import { Progress } from '../lib/progress'
import { PassportIcon, passportLabel, openShare } from './ShareSheet'

const NAV: [Page, JSX.Element][] = [
  ['tree', <svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2.5" /><circle cx="5" cy="19" r="2.5" /><circle cx="19" cy="19" r="2.5" /><path d="M12 7.5V12M12 12 5 16.5M12 12l7 4.5" /></svg>],
  ['map', <svg viewBox="0 0 24 24"><path d="M3 6.5 9 4l6 2.5 6-2.5v13.5L15 20l-6-2.5-6 2.5z" /><path d="M9 4v13.5M15 6.5V20" /></svg>],
  ['progress', <svg viewBox="0 0 24 24"><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4" /><path d="M12 13v4M9 20h6M10 17h4" /></svg>],
  ['people', <svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.5c3 0 5.5 2 5.5 5" /></svg>],
  ['ai', <svg viewBox="0 0 24 24"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" /><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" /></svg>],
  ['settings', <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>],
]

/** «Вашему древу: N лет» — age from the oldest year in any card; the ring is the share of achievements earned. */
function Growth() {
  const ru = LANG !== 'en'
  const plr = (n: number, f: string[]) => { if (!ru) return n === 1 ? f[3] : f[4]; const m = n % 100, k = n % 10; return m > 10 && m < 20 ? f[2] : k === 1 ? f[0] : k > 1 && k < 5 ? f[1] : f[2] }
  const years = S.people.flatMap(p => [p.birthDate, p.deathDate, ...(p.events || []).map(e => e.year)]).map(v => { const m = String(v || '').match(/(\d{4})/); return m ? +m[1] : 0 }).filter(y => y > 0)
  const age = years.length ? new Date().getFullYear() - Math.min(...years) : null
  const n = S.people.length, g = n ? generations() : 0
  const title = age == null ? t('growth.none') : t('growth.title', { a: `${age} ${plr(age, ['год', 'года', 'лет', 'year', 'years'])}` })
  const sub = [`${n} ${plr(n, ['человек', 'человека', 'человек', 'person', 'people'])}`, `${g} ${plr(g, ['поколение', 'поколения', 'поколений', 'generation', 'generations'])}`]
  const pct = Progress.N.length ? (S.achievements || []).length / Progress.N.length : 0
  const r = 18, c = 2 * Math.PI * r
  return (
    <button className="growth" id="growth" type="button" aria-label={t('nav.progress')} onClick={() => go('progress')}>
      <svg className="ring" viewBox="0 0 44 44"><circle className="track" cx="22" cy="22" r={r} /><circle className="bar" cx="22" cy="22" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform="rotate(-90 22 22)" /></svg>
      <div><b>{title}</b><small>{sub.map((s, i) => <span key={i}>{i ? ' · ' : ''}<span style={{ whiteSpace: 'nowrap' }}>{s}</span></span>)}</small></div>
    </button>
  )
}

const MINI_KEY = 'predki:sbMini'

export default function Sidebar() {
  const logo = useMemo(() => predkiLogo(), [])
  const unseen = Progress.unseen()
  // desktop only: the menu can shrink to icons; the choice is remembered in this browser
  const [mini, setMiniState] = useState(() => { try { return localStorage.getItem(MINI_KEY) === '1' } catch { return false } })
  const setMini = (v: boolean) => { setMiniState(v); try { v ? localStorage.setItem(MINI_KEY, '1') : localStorage.removeItem(MINI_KEY) } catch { /* private mode */ } }
  useEffect(() => { document.body.classList.toggle('sb-mini', mini) }, [mini])
  return (
    <aside className="sidebar">
      <div className="brand-row">
        <button className="brand" id="brandBtn" type="button" aria-label="Predki" onClick={() => go('tree')}>
          <span className="brand-mark" dangerouslySetInnerHTML={{ __html: logo }} />
          <div><span className="brand-name">Predki</span><span className="brand-tag">{t('brand.tag')}</span></div>
        </button>
        <button className="sb-toggle" type="button" onClick={() => setMini(!mini)} aria-label={mini ? t('sb.open') : t('sb.close')} title={mini ? t('sb.open') : t('sb.close')}>
          <svg viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="3.5" /><path d="M9.5 4.5v15" /><path d={mini ? 'm13.5 10 2 2-2 2' : 'm16 10-2 2 2 2'} /></svg>
        </button>
      </div>
      <nav className="nav" id="nav">
        {NAV.map(([k, icon]) => <Fragment key={k}>
          {k === 'settings' && S.people.length > 0 && <button className={'nav-passport' + (ui.share ? ' active' : '')} onClick={openShare} title={passportLabel()}><PassportIcon /><span>{passportLabel()}</span></button>}
          <button className={(ui.page === k ? 'active' : '') + (k === 'settings' ? ' nav-settings' : '') + (k === 'ai' ? ' nav-ai' : '')} onClick={() => go(k)} title={t('nav.' + k)}>
            {icon}<span>{t('nav.' + k)}</span>
            {k === 'ai' && <i className="beta">beta</i>}
            {k === 'ai' && ui.ai.drafts.length > 0 && <i className="badge">{ui.ai.drafts.length}</i>}
            {k === 'progress' && unseen > 0 && <i className="badge">{unseen}</i>}
          </button>
        </Fragment>)}
      </nav>
      <div className="sidebar-foot">
        <Growth />
        <div className="lang" id="lang">
          {(['ru', 'en'] as const).map(l => <button key={l} className={LANG === l ? 'active' : ''} onClick={() => setLang(l)}>{l.toUpperCase()}</button>)}
        </div>
      </div>
    </aside>
  )
}
