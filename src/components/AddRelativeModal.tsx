import { useEffect, useRef, useState } from 'react'
import { S, ui, t, byId, fullName, yearsOf, commit, toast, closeModal, coupleRel, parentsOf, adoptParentsOf, currentSpousesOf, normDate, dateValid, bindDateMask, type RelKind } from '../lib/core'
import { REL_KINDS, linkPeople, linkCandidates, relativesOf, unlinkPeople } from '../lib/relations'
import Avatar from './Avatar'

/** «Связать с человеком из древа»: pick how someone is related, then who it is. Opened from «Семья → Изменить». */
export default function RelModal() {
  if (ui.modal?.kind === 'pair') return <PairModal key={ui.modal.a + ui.modal.b} a={ui.modal.a} b={ui.modal.b} />
  if (ui.modal?.kind === 'link' && ui.modal.other) return <DropModal key={ui.modal.id + ui.modal.other} id={ui.modal.id} other={ui.modal.other} />
  return <LinkModal />
}

function LinkModal() {
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

/** A card dropped onto another card on the Tree. «other» (the card that was carried) becomes «kind» of «id» (the card it was dropped on).
 *  A link the two already have can be removed right here; a child given new parents can leave the previous ones. */
function DropModal({ id, other }: { id: string; other: string }) {
  const T = byId(id), D = byId(other)
  const [kind, setKind] = useState<RelKind | null>(null)
  const [move, setMove] = useState<boolean | null>(null)
  if (!T || !D) return null
  const now = relativesOf(id).filter(g => g.list.some(x => x.p.id === other && x.own))
  const can = (k: RelKind) => linkCandidates(id, k).some(x => x.id === other)
  // a child who already has parents: the new ones can take their place (offered by default when both parents are known)
  const stay = new Set([id, ...currentSpousesOf(id).map(x => x.id)]), adopted = new Set(adoptParentsOf(other).map(x => x.id))
  const olds = (kind === 'child' ? parentsOf(other).filter(p => !adopted.has(p.id)) : kind === 'adoptchild' ? adoptParentsOf(other) : []).filter(p => !stay.has(p.id))
  const moving = olds.length > 0 && (move ?? olds.length > 1)
  const link = () => {
    if (!kind) return
    if (moving) { const gone = new Set(olds.map(p => p.id)); S.rels = S.rels.filter(r => !(r.type === 'parent' && !r.step && r.b === other && gone.has(r.a))) }
    linkPeople(id, other, kind); commit(); toast(t('rel.linked')); closeModal()
  }
  const unlink = (k: RelKind) => { if (confirm(t('rel.unlink.confirm', { a: fullName(D), b: fullName(T) }))) { unlinkPeople(id, other, k); closeModal() } }
  return (
    <div className="modal-bg open" id="modalBg" onClick={e => { if ((e.target as HTMLElement).id === 'modalBg') closeModal() }}>
      <div className="modal lk onto" id="modal" role="dialog" aria-label={t('drop.h')}>
        <div className="panel-head"><h3>{t('drop.h')}</h3><button className="btn icon ghost" onClick={closeModal} aria-label={t('p.cancel')}><X /></button></div>
        <div className="panel-body">
          <div className="lk-who"><Avatar p={D} size={28} /><span>{fullName(D)}</span></div>
          <div className="eyebrow">{t('rel.link.kind')}</div>
          <div className="lk-kinds" role="radiogroup" aria-label={t('rel.link.kind')}>
            {REL_KINDS.map(k => <button key={k} type="button" role="radio" aria-checked={kind === k} disabled={!can(k)} onClick={() => { setKind(k); setMove(null) }}>{t('rel.k.' + k)}</button>)}
          </div>
          <div className="eyebrow">{t('drop.to')}</div>
          <div className="lk-who"><Avatar p={T} size={28} /><span>{fullName(T)}</span></div>
          {olds.length > 0 && <label className="ts-toggle drop-move"><input type="checkbox" checked={moving} onChange={e => setMove(e.target.checked)} />
            <span><b>{t('drop.move')}</b><small>{olds.map(fullName).join(', ')}</small></span></label>}
          {now.map(g => <div key={g.kind} className="drop-now"><span>{t('drop.now')}: <b>{t('rel.k.' + g.kind)}</b></span>
            <button type="button" className="btn sm" onClick={() => unlink(g.kind)}>{t('rel.unlink')}</button></div>)}
        </div>
        <div className="panel-foot"><button className="btn ghost" onClick={closeModal}>{t('p.cancel')}</button><button className="btn primary" disabled={!kind} onClick={link}>{t('drop.go')}</button></div>
      </div>
    </div>
  )
}

const X = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>

/** A couple: married or partners, since when, and whether it is over (a divorce or a break-up: «бывший муж», a break in the line on the Tree). */
function PairModal({ a, b }: { a: string; b: string }) {
  const r = coupleRel(a, b), A = byId(a), B = byId(b)
  const [partner, setPartner] = useState(!!r?.partner), [ex, setEx] = useState(!!r?.ex)
  const fromRef = useRef<HTMLInputElement>(null), toRef = useRef<HTMLInputElement>(null)
  useEffect(() => { const offs = [fromRef.current, toRef.current].filter(Boolean).map(i => bindDateMask(i!)); return () => offs.forEach(o => o()) }, [ex])
  if (!r || !A || !B) return null
  const save = () => {
    const from = normDate(fromRef.current?.value || ''), to = ex ? normDate(toRef.current?.value || '') : ''
    const bad = [[fromRef, from], [toRef, to]].filter(([, v]) => !dateValid(v as string)) as [typeof fromRef, string][]
    if (bad.length) { bad.forEach(([x]) => x.current?.classList.add('bad')); toast(t('p.date.bad')); return }
    r.from = from
    if (partner) r.partner = true; else delete r.partner
    if (ex) { r.ex = true; if (to) r.to = to; else delete r.to } else { delete r.ex; delete r.to }
    commit(); toast(t('toast.saved')); closeModal()
  }
  return (
    <div className="modal-bg open" id="modalBg" onClick={e => { if ((e.target as HTMLElement).id === 'modalBg') closeModal() }}>
      <div className="modal lk pair" id="modal" role="dialog" aria-label={t('pair.h')}>
        <div className="panel-head"><h3>{t('pair.h')}</h3><button className="btn icon ghost" onClick={closeModal} aria-label={t('p.cancel')}><X /></button></div>
        <div className="panel-body">
          <div className="lk-who pair-who"><Avatar p={A} size={28} /><Avatar p={B} size={28} /><span>{fullName(A)} {t('pair.and')} {fullName(B)}</span></div>
          <div className="field"><label>{t('rel.who')}</label><div className="seg seg-rel n2">
            <button type="button" className={!partner ? 'active' : ''} onClick={() => setPartner(false)}>{t('rel.v.married')}</button>
            <button type="button" className={partner ? 'active' : ''} onClick={() => setPartner(true)}>{t('rel.v.partner')}</button>
          </div></div>
          <div className="field"><label>{t(partner ? 'pair.since' : 'pair.wed')}</label><input ref={fromRef} defaultValue={r.from || ''} placeholder={t('p.date.ph')} /></div>
          <label className="ts-toggle pair-ex"><input type="checkbox" checked={ex} onChange={e => setEx(e.target.checked)} />
            <span><b>{t(partner ? 'pair.ex.p' : 'pair.ex.m')}</b><small>{t('pair.ex.d')}</small></span></label>
          {ex && <div className="field"><label>{t(partner ? 'pair.to.p' : 'pair.to.m')}</label><input ref={toRef} defaultValue={r.to || ''} placeholder={t('p.date.ph')} /></div>}
        </div>
        <div className="panel-foot"><button className="btn ghost" onClick={closeModal}>{t('p.cancel')}</button><button className="btn primary" onClick={save}>{t('p.save')}</button></div>
      </div>
    </div>
  )
}
