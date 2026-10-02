import { S, ui, t, byId, fullName, yearsOf, parentsOf, childrenOf, spousesOf, addRel, removePerson, commit, openPerson, editPerson, closeModal, type Person } from '../lib/core'

/** Add a parent / spouse / child: create a new card or link someone already in the tree. */
export default function AddRelativeModal() {
  const m = ui.modal
  if (!m || m.kind !== 'addRelative') return null
  const { id, rel: kind } = m
  const p = byId(id); if (!p) return null
  const title = t('p.newfor', { rel: t('rel.' + kind), name: fullName(p) })
  const others = S.people.filter(x => x.id !== id)
  const link = (other: Person) => {
    if (kind === 'parent' && other.gender === 'm') parentsOf(id).filter(x => x.auto && x.gender === 'm' && x.id !== other.id && !parentsOf(x.id).length && childrenOf(x.id).length === 1).forEach(x => removePerson(x.id))
    if (kind === 'parent') addRel('parent', other.id, id); else if (kind === 'child') addRel('parent', id, other.id); else addRel('spouse', id, other.id)
    // a new child gets the spouse as second parent; a new parent is linked as spouse of the existing parent
    if (kind === 'child') { const sp = spousesOf(id); if (sp.length === 1) addRel('parent', sp[0].id, other.id) }
    if (kind === 'parent') { const ps = parentsOf(id).filter(x => x.id !== other.id); if (ps.length === 1) addRel('spouse', ps[0].id, other.id) }
    commit(); openPerson(other.id)
  }
  const createNew = () => {
    closeModal()
    const preset: Partial<Person> & { _title?: string } = { _title: title, last: kind === 'spouse' ? '' : p.last }
    if (kind === 'spouse') preset.gender = p.gender === 'm' ? 'f' : p.gender === 'f' ? 'm' : ''
    editPerson(null, preset, link)
  }
  return (
    <div className="modal-bg open" id="modalBg" onClick={e => { if ((e.target as HTMLElement).id === 'modalBg') closeModal() }}>
      <div className="modal" id="modal">
        <div className="panel-head"><h3>{title}</h3></div>
        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button className="btn primary" style={{ justifyContent: 'center' }} onClick={createNew}>{t('rel.create')}</button>
          {others.length > 0 && <>
            <div className="eyebrow" style={{ marginTop: 6 }}>{t('rel.link')}</div>
            <div className="field"><select defaultValue="" onChange={e => { const o = byId(e.target.value); if (o) { closeModal(); link(o) } }}>
              <option value="">{t('rel.pick')}</option>
              {others.map(o => <option key={o.id} value={o.id}>{fullName(o)} {yearsOf(o)}</option>)}
            </select></div>
          </>}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button className="btn ghost" onClick={closeModal}>{t('p.cancel')}</button></div>
        </div>
      </div>
    </div>
  )
}
