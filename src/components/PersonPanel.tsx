import React, { useEffect, useRef, useState } from 'react'
import {
  ui, t, LANG, byId, fullName, yearsOf, parentsOf, spousesOf, childrenOf, siblingsOf, fillPercent,
  closePanel, openPerson, editPerson, editEvent, openModal, commit, refresh, toast, removePerson, pickFile, uid, addPerson,
  avatarSrc, normDate, dateValid, bindDateMask, syncLifeEvents, ensureFathers, type Person, type EvType,
} from '../lib/core'
import { CITIES, findCity } from '../lib/world'
import Avatar from './Avatar'
import FrameEditor from './FrameEditor'

const EV_TYPES: EvType[] = ['birth', 'move', 'study', 'work', 'marriage', 'death', 'other']
const DocIcon = () => <svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></svg>
const deathLabel = (g?: string) => g === 'f' ? 'p.death.f' : g === 'm' ? 'p.death.m' : 'p.death'
const CameraIcon = () => <svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
const FrameIcon = () => <svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="3" /><rect x="8" y="7" width="8" height="10" rx="4" /></svg>
const ImageIcon = () => <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="10" r="1.5" /><path d="m21 15-5-5-9 9" /></svg>

function Frame({ title, children, foot }: { title: string; children: React.ReactNode; foot?: React.ReactNode }) {
  return <>
    <div className="panel-head"><h3 id="panelTitle">{title}</h3>
      <button className="btn icon ghost" id="panelClose" onClick={closePanel} aria-label="close"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
    </div>
    <div className="panel-body" id="panelBody">{children}</div>
    {foot && <div className="panel-foot" id="panelFoot">{foot}</div>}
  </>
}

/** Right-hand panel: person profile, person form, event form. */
export default function PersonPanel() {
  const panel = ui.panel
  const open = !!panel && (panel.mode !== 'view' || !!byId(panel.id))
  return (
    <div className={'panel' + (open ? ' open' : '')} id="panel">
      {panel?.mode === 'view' && <ViewPerson id={panel.id} />}
      {panel?.mode === 'edit' && <EditPerson key={panel.key} id={panel.id} preset={panel.preset} after={panel.after} />}
      {panel?.mode === 'event' && <EditEvent key={panel.key} pid={panel.id} eid={panel.eventId} />}
    </div>
  )
}

function ViewPerson({ id }: { id: string }) {
  const p = byId(id); if (!p) return null
  const rel = (k: string, arr: Person[]) => arr.length ? <>
    <div className="section-t" style={{ margin: '12px 0 6px' }}><span className="eyebrow">{t(k)}</span></div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{arr.map(r => <button key={r.id} className="chip" onClick={() => openPerson(r.id)}><Avatar p={r} size={18} />{fullName(r)}</button>)}</div>
  </> : null
  const setPhoto = () => pickFile('image/*', data => { p.avatar = data; commit(); toast(t('toast.photo')) })
  const addMedia = (kind: 'photo' | 'doc') => pickFile(kind === 'photo' ? 'image/*' : '*/*', (data, name) => { p.media = p.media || []; p.media.push({ id: uid(), type: kind, name, data }); commit(); toast(t('toast.photo')) })
  const body = (
    <div>
      <div className="profile-hero">
        <div className="halo" style={{ backgroundImage: `url(${avatarSrc(p)})` }} />
        <div className="ph-ava"><Avatar p={p} size={120} />
          <button type="button" className="ph-cam" aria-label={t('p.photo.add')} onClick={setPhoto}><CameraIcon /></button></div>
        {!ui.frameEdit && <button type="button" className="ph-frame" onClick={() => { ui.frameEdit = true; refresh() }}><FrameIcon />{t('frm.choose')}</button>}
        <h2>{fullName(p)}</h2>
        {(p.patronymic || p.maiden) && <div className="muted">{[p.patronymic, p.maiden ? `(${t('p.maiden').toLowerCase()} ${p.maiden})` : ''].filter(Boolean).join(' ')}</div>}
        {(yearsOf(p) || p.job) && <div className="mono">{[yearsOf(p), p.job].filter(Boolean).join(' · ')}</div>}
      </div>
      {ui.frameEdit ? <FrameEditor p={p} /> : <>
      <div className="quick-add">
        {(['parent', 'spouse', 'child'] as const).map(k => <button key={k} className="btn sm" onClick={() => openModal({ kind: 'addRelative', id, rel: k })}>{t('p.add.' + k)}</button>)}
      </div>
      <dl className="kv">
        <dt>{t('p.birth')}</dt><dd>{[p.birthDate, p.birthPlace].filter(Boolean).join(' · ') || '—'}</dd>
        {(p.deathDate || p.deathPlace) && <><dt>{t(deathLabel(p.gender))}</dt><dd>{[p.deathDate, p.deathPlace].filter(Boolean).join(' · ')}</dd></>}
        {p.edu && <><dt>{t('p.edu')}</dt><dd>{p.edu}</dd></>}
        <dt>{t('p.profile')}</dt><dd><span className={'chip ' + (fillPercent(p) === 100 ? 'done' : 'accent')}>{t('p.filled', { n: fillPercent(p) })}</span></dd>
      </dl>
      {p.bio && <><div className="section-t"><h3>{t('p.bio')}</h3></div><p className="story">{p.bio}</p></>}
      <div className="section-t"><h3>{t('p.events')}</h3><button className="btn sm ghost" onClick={() => editEvent(id, null)}>{t('ev.add')}</button></div>
      <div className="ev-list">
        {(p.events || []).length ? p.events.slice().sort((a, b) => (+a.year || 0) - (+b.year || 0)).map(e => (
          <div className="ev" key={e.id}><span className="yr">{e.year || ''}</span>
            <div><i className={'ic ' + e.type} />{t('ev.' + e.type)}{e.note ? ` — ${e.note}` : ''}
              <div className="pl">{e.place || ''}{e.lat == null && e.place ? <> · <span className="chip low" style={{ padding: '0 6px', fontSize: 10 }}>?</span></> : null}</div></div>
            <button className="btn sm ghost" onClick={() => editEvent(id, e.id)}>✎</button></div>
        )) : <div className="muted" style={{ fontSize: 13 }}>{t('p.noevents')}</div>}
      </div>
      <div className="section-t"><h3>{t('p.gallery')}</h3></div>
      <div className="gallery">
        {(p.media || []).map(m => (
          <div key={m.id} className={'ph ' + m.type}>
            {m.type === 'photo' ? <img src={m.data} alt="" /> : <><DocIcon /><span>{m.name}</span></>}
            <button className="del" onClick={() => { p.media = p.media.filter(x => x.id !== m.id); commit() }}>×</button>
          </div>
        ))}
        <button className="add" title="photo" onClick={() => addMedia('photo')}><ImageIcon /></button>
        <button className="add" title="document" onClick={() => addMedia('doc')}><DocIcon /></button>
      </div>
      <div className="section-t"><h3>{t('p.family')}</h3></div>
      {rel('p.parents', parentsOf(id))}{rel('p.spouses', spousesOf(id))}{rel('p.children', childrenOf(id))}{rel('p.siblings', siblingsOf(id))}
      </>}
    </div>
  )
  const foot = <>
    <button className="btn ghost danger" onClick={() => { if (confirm(t('p.delete.confirm', { name: fullName(p) }))) { removePerson(id); commit(); toast(t('toast.deleted')); closePanel() } }}>{t('p.delete')}</button>
    <button className="btn" onClick={() => editPerson(id)}>{t('p.edit')}</button>
  </>
  return <Frame title={fullName(p)} foot={ui.frameEdit ? undefined : foot}>{body}</Frame>
}

function EditPerson({ id, preset, after }: { id: string | null; preset?: Partial<Person> & { _title?: string }; after?: (p: Person) => void }) {
  const p: Partial<Person> = id ? byId(id)! : Object.assign({ first: '', last: '', maiden: '', patronymic: '', gender: '', birthDate: '', birthPlace: '', deathDate: '', deathPlace: '', job: '', edu: '', bio: '', avatar: '' }, preset || {})
  const [avatar, setAvatar] = useState(p.avatar || '')
  const [gender, setGender] = useState(p.gender || '')
  const form = useRef<HTMLFormElement>(null)
  useEffect(() => {
    const f = form.current!; const offs = (['birthDate', 'deathDate'] as const).map(k => bindDateMask(f.elements.namedItem(k) as HTMLInputElement))
    const tm = setTimeout(() => { const i = f.elements.namedItem('first') as HTMLInputElement; if (i && !i.value) i.focus() }, 350)
    return () => { offs.forEach(o => o()); clearTimeout(tm) }
  }, [])
  const save = () => {
    const f = form.current!; const fd = new FormData(f); const d: Record<string, string> = {}
    for (const [k, v] of fd.entries()) d[k] = String(v).trim()
    d.birthDate = normDate(d.birthDate); d.deathDate = normDate(d.deathDate)
    const bad = (['birthDate', 'deathDate'] as const).filter(k => !dateValid(d[k]))
    if (bad.length) { bad.forEach(k => (f.elements.namedItem(k) as HTMLInputElement).classList.add('bad')); toast(t('p.date.bad')); return }
    const data = { ...d, gender, avatar } as Partial<Person>
    let target: Person
    if (id) { target = byId(id)!; Object.assign(target, data) } else { target = addPerson(data); if (p.events) target.events = p.events }
    delete target.auto; syncLifeEvents(target); commit(); toast(t('toast.saved'))
    if (after) after(target); else openPerson(target.id)
    const made = ensureFathers([target.id]); if (made.length) { commit(); toast(t('auto.father', { name: made.map(fullName).join(', ') })) }
  }
  const F = (k: keyof Person, label: string, ph?: string) => <div className="field"><label>{t(label)}</label><input name={k} type="text" defaultValue={String(p[k] || '')} placeholder={ph || ''} /></div>
  const title = id ? t('p.edit') : (preset?._title || t('p.new'))
  const foot = <>
    <button className="btn ghost" onClick={() => id ? openPerson(id) : closePanel()}>{t('p.cancel')}</button>
    <button className="btn primary" onClick={save}>{t('p.save')}</button>
  </>
  return <Frame title={title} foot={foot}>
    <form className="form" ref={form} onSubmit={e => { e.preventDefault(); save() }}>
      <div className="avatar-edit">
        <Avatar p={{ ...p, gender: gender as Person['gender'], avatar }} size={64} id="avPrev" />
        <div><div className="eyebrow" style={{ marginBottom: 6 }}>{t('p.photo')}</div><button type="button" className="btn sm" onClick={() => pickFile('image/*', data => setAvatar(data))}>{t('p.photo.change')}</button></div>
      </div>
      <div className="row">{F('first', 'p.first')}{F('last', 'p.last')}</div>
      <div className="row">{F('patronymic', 'p.patronymic')}{F('maiden', 'p.maiden')}</div>
      <div className="field"><label>{t('p.gender')}</label><div className="seg">
        {([['m', 'p.m'], ['f', 'p.f'], ['', 'p.u']] as const).map(([g, l]) => <button key={g} type="button" className={gender === g ? 'active' : ''} onClick={() => setGender(g)}>{t(l)}</button>)}
      </div></div>
      <div className="eyebrow">{t('p.birth')}</div><div className="row">{F('birthDate', 'p.date', t('p.date.ph'))}{F('birthPlace', 'p.place', 'Казань')}</div>
      <div className="eyebrow">{t(deathLabel(gender))}</div><div className="row">{F('deathDate', 'p.date', t('p.date.ph'))}{F('deathPlace', 'p.place')}</div>
      <div className="row">{F('job', 'p.job')}{F('edu', 'p.edu')}</div>
      <div className="field"><label>{t('p.bio')}</label><textarea name="bio" placeholder={t('p.bio.ph')} defaultValue={p.bio || ''} /></div>
    </form>
  </Frame>
}

function EditEvent({ pid, eid }: { pid: string; eid: string | null }) {
  const p = byId(pid)!; const e = eid ? p.events.find(x => x.id === eid)! : { id: '', type: 'move' as EvType, year: '' as const, place: '', lat: null, lon: null, note: '' }
  const form = useRef<HTMLFormElement>(null)
  const save = () => {
    const d = Object.fromEntries(new FormData(form.current!).entries()) as Record<string, string>
    const ne = { id: e.id || uid(), type: d.type as EvType, year: (d.year ? +d.year : '') as number | '', place: d.place.trim(), lat: d.lat === '' ? null : +d.lat, lon: d.lon === '' ? null : +d.lon, note: d.note.trim() }
    if (!eid) p.events.push(ne); else Object.assign(e, ne)
    commit(); openPerson(pid)
  }
  const onPlace = (v: string) => { const c = findCity(v); const f = form.current!; if (c) { (f.elements.namedItem('lat') as HTMLInputElement).value = String(c.lat); (f.elements.namedItem('lon') as HTMLInputElement).value = String(c.lon) } }
  const foot = <>
    {eid && <button className="btn ghost danger" onClick={() => { p.events = p.events.filter(x => x.id !== eid); commit(); openPerson(pid) }}>{t('p.delete')}</button>}
    <button className="btn ghost" onClick={() => openPerson(pid)}>{t('p.cancel')}</button>
    <button className="btn primary" onClick={save}>{t('p.save')}</button>
  </>
  return <Frame title={t('ev.title')} foot={foot}>
    <form className="form" ref={form} onSubmit={ev => { ev.preventDefault(); save() }}>
      <div className="row">
        <div className="field"><label>{t('ev.type')}</label><select name="type" defaultValue={e.type}>{EV_TYPES.map(k => <option key={k} value={k}>{t('ev.' + k)}</option>)}</select></div>
        <div className="field"><label>{t('ev.year')}</label><input name="year" type="number" defaultValue={e.year || ''} placeholder="1955" /></div>
      </div>
      <div className="field"><label>{t('ev.place')}</label><input name="place" list="cityList" defaultValue={e.place || ''} placeholder={t('ev.place.ph')} onInput={x => onPlace((x.target as HTMLInputElement).value)} />
        <datalist id="cityList">{CITIES.map(c => <option key={c.ru + c.lat} value={LANG === 'en' ? c.en : c.ru} />)}</datalist></div>
      <div className="row">
        <div className="field"><label>{t('ev.lat')}</label><input name="lat" type="number" step="0.01" defaultValue={e.lat == null ? '' : e.lat} /></div>
        <div className="field"><label>{t('ev.lon')}</label><input name="lon" type="number" step="0.01" defaultValue={e.lon == null ? '' : e.lon} /></div>
      </div>
      <div className="field"><label>{t('ev.note')}</label><input name="note" defaultValue={e.note || ''} /></div>
    </form>
  </Frame>
}

