import { useState } from 'react'
import { S, t, fullName, formerNames, yearsOf, yearOf, fillPercent, generations, openPerson, editPerson } from '../lib/core'
import Avatar from '../components/Avatar'

export default function PeoplePage() {
  const [q, setQ] = useState('')
  const places = new Set<string>(); let media = 0
  S.people.forEach(p => { (p.events || []).forEach(e => { if (e.lat != null) places.add(e.place) }); media += (p.media || []).length + (p.avatar ? 1 : 0) })
  const stats: [number, string][] = [[S.people.length, 'people.stat.people'], [generations(), 'people.stat.gen'], [media, 'people.stat.photos'], [places.size, 'people.stat.places']]
  const ql = q.toLowerCase()
  const list = S.people.filter(p => !ql || fullName(p).toLowerCase().includes(ql) || (p.maiden || '').toLowerCase().includes(ql) || formerNames(p).some(n => n.toLowerCase().includes(ql))).sort((a, b) => (yearOf(a.birthDate) || '9999').localeCompare(yearOf(b.birthDate) || '9999'))
  return (
    <section className="page active" data-page="people">
      <div className="topbar">
        <h2>{t('nav.people')}</h2>
        <div className="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg><input id="peopleSearch" placeholder={t('people.search')} value={q} onChange={e => setQ(e.target.value)} /></div>
        <button className="btn primary" onClick={() => editPerson(null)}><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg><span>{t('tree.add')}</span></button>
      </div>
      <div className="scroll">
        <div className="stats">{stats.map(([n, k]) => <div className="stat" key={k}><b>{n}</b><span>{t(k)}</span></div>)}</div>
        <div className="people-grid">
          {list.map(p => { const f = fillPercent(p), r = 12, c = 2 * Math.PI * r; return (
            <button className={'person-card' + (f === 100 ? ' complete' : '')} key={p.id} onClick={() => openPerson(p.id)}>
              <Avatar p={p} size={44} />
              <div><b>{fullName(p)}</b><small>{yearsOf(p) || ' '}{p.birthPlace ? ' · ' + p.birthPlace : ''}</small></div>
              {f === 100
                ? <svg className="fill done" viewBox="0 0 28 28" role="img" aria-label="100%"><title>100%</title><circle cx="14" cy="14" r="12.5" /><path d="M8.5 14.4l3.7 3.6 7.3-7.4" /></svg>
                : <svg className="fill" viewBox="0 0 28 28"><title>{f + '%'}</title><circle cx="14" cy="14" r={r} fill="none" stroke="var(--glass-3)" strokeWidth="3" /><circle cx="14" cy="14" r={r} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - f / 100)} transform="rotate(-90 14 14)" /></svg>}
            </button>) })}
        </div>
      </div>
    </section>
  )
}
