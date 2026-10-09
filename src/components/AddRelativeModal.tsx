import { useState } from 'react'
import { ui, t, byId, fullName, yearsOf, commit, toast, closeModal, type RelKind } from '../lib/core'
import { REL_KINDS, linkPeople, linkCandidates } from '../lib/relations'
import Avatar from './Avatar'

/** «Связать с человеком из древа»: pick how someone is related, then who it is. Opened from «Семья → Изменить». */
export default function LinkModal() {
  const m = ui.modal
  const [kind, setKind] = useState<RelKind>('parent')
  const [q, setQ] = useState('')
  if (!m || m.kind !== 'link') return null
  const p = byId(m.id); if (!p) return null
  const ql = q.trim().toLowerCase()
  const list = linkCandidates(p.id, kind).filter(x => !ql || fullName(x).toLowerCase().includes(ql) || (x.maiden || '').toLowerCase().includes(ql))
  const close = () => { setQ(''); closeModal() }
  const pick = (otherId: string) => { linkPeople(p.id, otherId, kind); commit(); toast(t('rel.linked')); close() }
  return (
    <div className="modal-bg open" id="modalBg" onClick={e => { if ((e.target as HTMLElement).id === 'modalBg') close() }}>
      <div className="modal lk" id="modal">
        <div className="panel-head"><h3>{t('rel.link.h')}</h3>
          <button className="btn icon ghost" onClick={close} aria-label={t('p.cancel')}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
        </div>
        <div className="panel-body">
          <div className="lk-who"><Avatar p={p} size={28} /><span>{fullName(p)}</span></div>
          <div className="eyebrow">{t('rel.link.kind')}</div>
          <div className="lk-kinds" role="radiogroup" aria-label={t('rel.link.kind')}>
            {REL_KINDS.map(k => <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}>{t('rel.k.' + k)}</button>)}
          </div>
          <div className="eyebrow">{t('rel.link.who')}</div>
          <div className="search lk-search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg><input value={q} placeholder={t('people.search')} onChange={e => setQ(e.target.value)} /></div>
          <div className="lk-list">
            {list.length ? list.map(x => <button key={x.id} type="button" onClick={() => pick(x.id)}><Avatar p={x} size={32} /><span><b>{fullName(x)}</b>{yearsOf(x) && <small>{yearsOf(x)}</small>}</span></button>)
              : <p className="muted">{t('rel.link.none')}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
