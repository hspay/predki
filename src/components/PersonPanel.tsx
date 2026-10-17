import React, { useEffect, useRef, useState } from 'react'
import {
  ui, S, t, LANG, byId, fullName, spousesOf, yearOf, fillPercent, formerNames,
  closePanel, openPerson, openPet, editPet, showNewPerson, editPerson, editEvent, openModal, commit, refresh, toast, removePerson, pickFile, uid, addPerson,
  avatarSrc, yearsOf, surnameFor, normDate, dateValid, bindDateMask, syncLifeEvents, ensureFathers, coupleRel, coupleYears, type Person, type EvType, type FormerName, type RelKind, type RelVariant,
} from '../lib/core'
import { rootPerson } from '../lib/treeLayout'
import { kinship } from '../lib/kinship'
import { addRelative, relativesOf, unlinkPeople } from '../lib/relations'
import { frameOf, miniCard } from '../lib/frames'
import { isLight } from '../lib/appearance'
import { CITIES, findCity } from '../lib/world'
import { mediaUrl } from '../lib/media'
import { goal } from '../lib/analytics'
import Avatar from './Avatar'
import FrameEditor from './FrameEditor'
import { KINDS, kindName, petIcon, petsOf, petById, petYears, savePet, removePet } from '../lib/pets'

const EV_TYPES: EvType[] = ['birth', 'move', 'study', 'work', 'marriage', 'death', 'other']
const DocIcon = () => <svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></svg>
const deathLabel = (g?: string) => g === 'f' ? 'p.death.f' : g === 'm' ? 'p.death.m' : 'p.death'
const PenIcon = () => <svg viewBox="0 0 24 24"><path d="M5 19h3.5L18 9.5a2.5 2.5 0 0 0-3.5-3.5L5 15.5z" /></svg>
const couple = (k: RelKind) => k === 'spouse' || k === 'partner' || k === 'ex'
const CrossIcon = () => <svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17" /></svg>
const CameraIcon = () => <svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
const FrameIcon = () => <svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="3" /><rect x="8" y="7" width="8" height="10" rx="4" /></svg>
const ImageIcon = () => <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="10" r="1.5" /><path d="m21 15-5-5-9 9" /></svg>

function Frame({ title, children, foot, swap }: { title: string; children: React.ReactNode; foot?: React.ReactNode; swap?: string }) {
  return <>
    <div className="panel-head"><h3 id="panelTitle" key={swap}>{title}</h3>
      <button className="btn icon ghost" id="panelClose" onClick={closePanel} aria-label="close"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
    </div>
    <div className="panel-body" id="panelBody"><div className="pn-in" key={swap}>{children}</div></div>
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
      {panel?.mode === 'pet' && <ViewPet id={panel.id} />}
      {panel?.mode === 'petEdit' && <EditPet key={panel.key} id={panel.id} owner={panel.owner} />}
    </div>
  )
}

/** On a phone the Tree is hidden behind the profile, so the frame being set up is shown right here. */
function FramePreview({ p }: { p: Person }) {
  const look = frameOf(p)
  const svg = miniCard(look, 'fpv' + p.id.replace(/[^A-Za-z0-9]/g, ''), { src: avatarSrc(p), first: p.first, last: p.last, years: yearsOf(p), light: isLight() })
  return <div className="fe-prev"><svg width="216" height="222" viewBox="-32 -34 216 222" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} /></div>
}

/** «Семья»: relatives by kind; «Изменить» adds a remove button to each link and «Связать с человеком из древа». */
function Family({ id }: { id: string }) {
  const p = byId(id)!, edit = ui.relEdit
  const groups = relativesOf(id).filter(g => g.list.length)
  const drop = (other: Person, kind: RelKind) => { if (confirm(t('rel.unlink.confirm', { a: fullName(p), b: fullName(other) }))) unlinkPeople(id, other.id, kind) }
  return <>
    <div className="section-t fam-top"><h3>{t('p.family')}</h3>
      {(groups.length > 0 || edit) && <button className="btn sm ghost" onClick={() => { ui.relEdit = !edit; refresh() }}>{edit ? t('rel.done') : t('rel.edit')}</button>}</div>
    {groups.map(g => <div key={g.kind}>
      <div className="section-t" style={{ margin: '12px 0 6px' }}><span className="eyebrow">{t(g.label)}</span></div>
      <div className="fam-chips">{g.list.map(({ p: r, own }) => { const cr = couple(g.kind) ? coupleRel(id, r.id) : undefined, yrs = cr && cr.ex ? coupleYears(cr) : ''
        return <span key={r.id} className={'chip fam' + (edit ? ' editing' : '')}>
        <button type="button" onClick={() => openPerson(r.id)}><Avatar p={r} size={18} />{fullName(r)}{yrs && <small className="fam-yr">{yrs}</small>}</button>
        {edit && cr && <button type="button" className="fam-x fam-ed" aria-label={t('pair.edit')} title={t('pair.edit')} onClick={() => openModal({ kind: 'pair', a: id, b: r.id })}><PenIcon /></button>}
        {edit && own && <button type="button" className="fam-x" aria-label={t('rel.unlink')} title={t('rel.unlink')} onClick={() => drop(r, g.kind)}><CrossIcon /></button>}
      </span> })}</div>
    </div>)}
    {edit && groups.some(g => g.kind === 'sibling' && g.list.some(x => !x.own)) && <p className="fam-note">{t('rel.sib.note')}</p>}
    {(edit || !groups.length) && <button type="button" className="btn sm fam-link" onClick={() => openModal({ kind: 'link', id })}>{t('rel.link.btn')}</button>}
  </>
}

function ViewPerson({ id }: { id: string }) {
  const p = byId(id); if (!p) return null
  // the caption on the portrait: birth year · place · ФОТО
  const cap = [yearOf(p.birthDate), p.birthPlace, p.avatar ? t('cl.photoTag') : ''].filter(Boolean).join(' · ')
  // «КАРТОЧКА · МАМА»: how the person is related to you
  const me = S.settings.kin === false ? null : rootPerson(), kl = me && me.id !== p.id ? kinship(me.id).label[p.id] : me && me.id === p.id ? t('cl.you') : ''
  const head = t('cl.card') + (kl ? ' · ' + kl : '')
  const setPhoto = () => pickFile('image/*', data => { p.avatar = data; commit(); toast(t('toast.photo')) })
  const removePhoto = () => { if (confirm(t('p.photo.remove.confirm'))) { p.avatar = ''; commit(); toast(t('p.photo.removed')) } }
  const addMedia = (kind: 'photo' | 'doc') => pickFile(kind === 'photo' ? 'image/*' : 'image/*,application/pdf', (data, name) => { p.media = p.media || []; p.media.push({ id: uid(), type: kind, name, data }); commit(); toast(t('toast.photo')) })
  const body = (
    <div>
      <div className="profile-hero">
        {ui.frameEdit && <FramePreview p={p} />}
        <div className={'ph-ava ph-portrait' + (ui.frameEdit ? ' fe-hide' : '')}>
          <img className={'ph-img' + (p.avatar ? ' photo' : '')} src={avatarSrc(p)} alt="" />
          <i className="cm a" /><i className="cm b" /><i className="cm c" /><i className="cm d" />
          {cap && <span className="ph-cap">{cap}</span>}
          {p.avatar
            ? <button type="button" className="ph-cam rm" aria-label={t('p.photo.remove')} title={t('p.photo.remove')} onClick={removePhoto}><CrossIcon /></button>
            : <button type="button" className="ph-cam" aria-label={t('p.photo.add')} title={t('p.photo.add')} onClick={setPhoto}><CameraIcon /></button>}</div>
        {!ui.frameEdit && <button type="button" className="ph-frame" onClick={() => { ui.frameEdit = true; refresh() }}><FrameIcon />{t('frm.choose')}</button>}
        <h2>{fullName(p)}</h2>
        {(p.patronymic || p.maiden) && <div className="muted">{[p.patronymic, p.maiden ? `(${t('p.maiden').toLowerCase()} ${p.maiden})` : ''].filter(Boolean).join(' ')}</div>}
        {formerNames(p).length > 0 && <div className="muted ph-names">{t('p.names.was')}: {formerNames(p).join('; ')}</div>}
        {p.job && <div className="mono">{p.job}</div>}
      </div>
      {ui.frameEdit ? <FrameEditor p={p} /> : <>
      <Clarity p={p} setPhoto={setPhoto} />
      <Family id={id} />
      <div className="quick-add">
        {(['parent', 'spouse', 'child', 'sibling'] as const).map(k => <button key={k} className="btn sm" onClick={() => addRelative(id, k)}>{t('p.add.' + k)}</button>)}
      </div>
      <PetList id={id} />
      <dl className="kv">
        <dt>{t('p.birth')}</dt><dd>{[p.birthDate, p.birthPlace].filter(Boolean).join(' · ') || '—'}</dd>
        {(p.deathDate || p.deathPlace) && <><dt>{t(deathLabel(p.gender))}</dt><dd>{[p.deathDate, p.deathPlace].filter(Boolean).join(' · ')}</dd></>}
        {p.edu && <><dt>{t('p.edu')}</dt><dd>{p.edu}</dd></>}
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
            {m.type === 'photo' ? <img src={mediaUrl(m.data)} alt="" /> : <><DocIcon /><span>{m.name}</span></>}
            <button className="del" onClick={() => { p.media = p.media.filter(x => x.id !== m.id); commit() }}>×</button>
          </div>
        ))}
        <button className="add" title="photo" onClick={() => addMedia('photo')}><ImageIcon /></button>
        <button className="add" title="document" onClick={() => addMedia('doc')}><DocIcon /></button>
      </div>
      </>}
    </div>
  )
  const foot = <>
    <button className="btn ghost danger" onClick={() => { if (confirm(t('p.delete.confirm', { name: fullName(p) }))) { removePerson(id); commit(); toast(t('toast.deleted')); closePanel() } }}>{t('p.delete')}</button>
    <button className="btn" onClick={() => editPerson(id)}>{t('p.edit')}</button>
  </>
  return <Frame title={head} swap={id} foot={ui.frameEdit ? undefined : foot}>{body}</Frame>
}

/** «Известно 75%»: how full the card is (8 checks), and the missing facts as quick ways to fill them in */
function Clarity({ p, setPhoto }: { p: Person; setPhoto: () => void }) {
  const pc = fillPercent(p), left = Math.max(0, 8 - Math.round(pc / 12.5))
  const ru = LANG !== 'en', pl = (n: number, f: string[]) => { const a = n % 10, b = n % 100; return f[(a === 1 && b !== 11) ? 0 : (a >= 2 && a <= 4 && (b < 12 || b > 14)) ? 1 : 2] }
  const hint = pc >= 100 || !left ? t('cl.full') : ru ? `Ещё ${left} ${pl(left, ['факт', 'факта', 'фактов'])} — и карточка заполнена` : `${left} more ${left === 1 ? 'fact' : 'facts'} to complete the card`
  // open the form on the missing field
  const edit = (name: string) => { editPerson(p.id); setTimeout(() => { const el = document.querySelector<HTMLInputElement>(`#panel [name="${name}"]`); if (el) { el.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' }) } }, 160) }
  const miss: [string, () => void][] = []
  if (!p.first || !p.last) miss.push([t(!p.first ? 'p.first' : 'p.last'), () => edit(!p.first ? 'first' : 'last')])
  if (!p.gender) miss.push([t('p.gender'), () => edit('first')])
  if (!p.birthDate) miss.push([t('cl.birthDate'), () => edit('birthDate')])
  if (!p.birthPlace) miss.push([t('cl.birthPlace'), () => edit('birthPlace')])
  if (!p.avatar) miss.push([t('cl.photo'), setPhoto])
  if (!p.bio) miss.push([t('cl.bio'), () => edit('bio')])
  if (!(p.events || []).length) miss.push([t('cl.event'), () => editEvent(p.id, null)])
  return <>
    <div className="clar" aria-label={t('cl.known', { n: pc })}>
      <span className="dots" aria-hidden="true"><i style={{ width: pc + '%' }} /></span>
      <span><b>{t('cl.known', { n: pc })}</b><small>{hint}</small></span>
    </div>
    {miss.length > 0 && <div className="clar-more">
      <span className="eyebrow">{t('cl.more')}</span>
      <div className="clar-chips">{miss.map(([l, run]) => <button key={l} type="button" className="clar-chip" onClick={run}>+ {l}</button>)}</div>
    </div>}
  </>
}

function EditPerson({ id, preset, after }: { id: string | null; preset?: Partial<Person> & { _title?: string; _rel?: RelKind }; after?: (p: Person, v: RelVariant) => void }) {
  const p: Partial<Person> = id ? byId(id)! : Object.assign({ first: '', last: '', maiden: '', patronymic: '', gender: '', birthDate: '', birthPlace: '', deathDate: '', deathPlace: '', job: '', edu: '', bio: '', avatar: '' }, preset || {})
  const [avatar, setAvatar] = useState(p.avatar || '')
  const [gender, setGender] = useState(p.gender || '')
  // a new parent / child: by birth, adopted, or a stepfather, stepmother, stepchild; a new spouse: married or partners
  const [variant, setVariant] = useState<RelVariant>('own')
  const relKind = !id && (preset?._rel === 'parent' || preset?._rel === 'child' || preset?._rel === 'spouse') ? preset._rel : null
  const VARIANTS: Record<string, [RelVariant, string][]> = {
    parent: [['own', 'rel.own.parent'], ['adopt', 'rel.v.adopt'], ['step', 'rel.k.step']],
    child: [['own', 'rel.own.child'], ['adopt', 'rel.v.adopt'], ['step', 'rel.k.stepchild']],
    spouse: [['own', 'rel.v.married'], ['partner', 'rel.v.partner']],
  }
  // earlier names: fields appear only when someone needs them
  const [names, setNames] = useState<FormerName[]>(() => (p.names || []).map(n => ({ ...n })))
  const setName = (i: number, k: keyof FormerName, v: string) => setNames(ns => ns.map((n, j) => j === i ? { ...n, [k]: v } : n))
  // a new relative gets the family surname, in the form for the chosen gender; a stepparent / stepchild starts without it
  const autoLast = useRef(id ? null : (preset?.last || ''))
  const putLast = (g: string, isStep: boolean) => {
    const inp = form.current?.elements.namedItem('last') as HTMLInputElement | null; if (!inp || autoLast.current == null || inp.value !== autoLast.current) return
    const v = isStep ? '' : surnameFor(preset?.last || '', g as Person['gender']); inp.value = v; autoLast.current = v
  }
  const pickGender = (g: string) => { setGender(g); putLast(g, variant === 'step') }
  const pickVariant = (v: RelVariant) => { setVariant(v); if (relKind !== 'spouse') putLast(gender, v === 'step') }
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
    const kept = names.map(n => ({ ...n, first: n.first.trim(), last: n.last.trim(), patronymic: n.patronymic.trim(), until: n.until.trim() })).filter(n => n.first || n.last || n.patronymic)
    const data = { ...d, gender, avatar, names: kept } as Partial<Person>
    if (!kept.length) delete data.names
    let target: Person
    if (id) { target = byId(id)!; Object.assign(target, data); if (!kept.length) delete target.names } else { target = addPerson(data); if (p.events) target.events = p.events; goal('person_add') }
    delete target.auto; syncLifeEvents(target); commit(); toast(t('toast.saved'))
    if (after) after(target, variant); else if (id) openPerson(target.id); else showNewPerson(target.id)
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
      {relKind && <div className="field"><label>{t('rel.who')}</label><div className={'seg seg-rel n' + VARIANTS[relKind].length}>
        {VARIANTS[relKind].map(([v, l]) => <button key={v} type="button" className={variant === v ? 'active' : ''} onClick={() => pickVariant(v)}>{t(l)}</button>)}
      </div></div>}
      <div className="row">{F('first', 'p.first')}{F('last', 'p.last')}</div>
      <div className="row">{F('patronymic', 'p.patronymic')}{F('maiden', 'p.maiden')}</div>
      {names.map((n, i) => <div className="fn-card" key={n.id}>
        <div className="fn-head"><span className="eyebrow">{t('p.names.one')}</span><button type="button" className="btn icon ghost" aria-label={t('p.delete')} onClick={() => setNames(ns => ns.filter((_, j) => j !== i))}><CrossIcon /></button></div>
        <div className="row"><div className="field"><label>{t('p.first')}</label><input type="text" value={n.first} onChange={e => setName(i, 'first', e.target.value)} /></div>
          <div className="field"><label>{t('p.last')}</label><input type="text" value={n.last} onChange={e => setName(i, 'last', e.target.value)} /></div></div>
        <div className="row"><div className="field"><label>{t('p.patronymic')}</label><input type="text" value={n.patronymic} onChange={e => setName(i, 'patronymic', e.target.value)} /></div>
          <div className="field"><label>{t('p.names.until')}</label><input type="text" inputMode="numeric" maxLength={4} placeholder="1946" value={n.until} onChange={e => setName(i, 'until', e.target.value.replace(/\D/g, ''))} /></div></div>
      </div>)}
      <button type="button" className="fn-add" onClick={() => setNames(ns => [...ns, { id: uid(), first: '', last: '', patronymic: '', until: '' }])}>{t('p.names.add')}</button>
      <div className="field"><label>{t('p.gender')}</label><div className="seg">
        {([['m', 'p.m'], ['f', 'p.f'], ['', 'p.u']] as const).map(([g, l]) => <button key={g} type="button" className={gender === g ? 'active' : ''} onClick={() => pickGender(g)}>{t(l)}</button>)}
      </div></div>
      <div className="eyebrow">{t('p.birth')}</div><div className="row">{F('birthDate', 'p.date', t('p.date.ph'))}{F('birthPlace', 'p.place', 'Казань')}</div>
      <div className="eyebrow">{t(deathLabel(gender))}</div><div className="row">{F('deathDate', 'p.date', t('p.date.ph'))}{F('deathPlace', 'p.place')}</div>
      <div className="row">{F('job', 'p.job')}{F('edu', 'p.edu')}</div>
      <div className="field"><label>{t('p.bio')}</label><textarea name="bio" placeholder={t('p.bio.ph')} defaultValue={p.bio || ''} /></div>
    </form>
  </Frame>
}

function EditEvent({ pid, eid }: { pid: string; eid: string | null }) {
  const p = byId(pid)!; const e = eid ? p.events.find(x => x.id === eid)! : { id: '', type: 'move' as EvType, year: '' as const, place: '', lat: null, lon: null, note: '' } as LifeEventDraft
  const form = useRef<HTMLFormElement>(null), dateRef = useRef<HTMLInputElement>(null)
  const [type, setType] = useState<EvType>(e.type)
  // a wedding: the full date goes into the marriage link too, so the Tree and the family calendar know it
  const spouses = spousesOf(pid)
  const relWith = (sid: string) => S.rels.find(r => r.type === 'spouse' && ((r.a === pid && r.b === sid) || (r.b === pid && r.a === sid)))
  const withId = e.with || (spouses.length === 1 ? spouses[0].id : '')
  const date0 = e.date || (withId && relWith(withId)?.from) || (e.year ? String(e.year) : '')
  useEffect(() => { if (type === 'marriage' && dateRef.current) return bindDateMask(dateRef.current) }, [type])
  const save = () => {
    const d = Object.fromEntries(new FormData(form.current!).entries()) as Record<string, string>
    const ne: LifeEventDraft = { id: e.id || uid(), type: d.type as EvType, year: (d.year ? +d.year : '') as number | '', place: d.place.trim(), lat: d.lat === '' ? null : +d.lat, lon: d.lon === '' ? null : +d.lon, note: d.note.trim() }
    if (ne.type === 'marriage') {
      const date = normDate(d.date || '')
      if (!dateValid(date)) { dateRef.current?.classList.add('bad'); toast(t('p.date.bad')); return }
      ne.year = date ? (+yearOf(date) || '') : ''
      ne.date = date; ne.with = d.with || undefined
      const r = ne.with ? relWith(ne.with) : undefined; if (r && date) r.from = date
      if (r && r.partner) delete r.partner // a wedding: the partners are now married
    }
    if (!eid) p.events.push(ne as typeof p.events[number]); else { Object.assign(e, ne); if (ne.type !== 'marriage') { delete e.date; delete e.with } }
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
        <div className="field"><label>{t('ev.type')}</label><select name="type" defaultValue={e.type} onChange={x => setType(x.target.value as EvType)}>{EV_TYPES.map(k => <option key={k} value={k}>{t('ev.' + k)}</option>)}</select></div>
        {type === 'marriage'
          ? <div className="field"><label>{t('ev.date')}</label><input name="date" ref={dateRef} defaultValue={date0} placeholder={t('p.date.ph')} /></div>
          : <div className="field"><label>{t('ev.year')}</label><input name="year" type="number" defaultValue={e.year || ''} placeholder="1955" /></div>}
      </div>
      {type === 'marriage' && <>
        {spouses.length > 1 && <div className="field"><label>{t('ev.with')}</label><select name="with" defaultValue={withId}><option value="">—</option>{spouses.map(s => <option key={s.id} value={s.id}>{fullName(s)}</option>)}</select></div>}
        {spouses.length === 1 && <input type="hidden" name="with" value={spouses[0].id} />}
        <p className="muted" style={{ fontSize: 12.5, margin: '-4px 0 0' }}>{t('ev.date.hint')}</p>
      </>}
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
type LifeEventDraft = { id: string; type: EvType; year: number | ''; place: string; lat: number | null; lon: number | null; note: string; date?: string; with?: string }

// ---------- pets ----------
const PetFace = ({ kind, size }: { kind: string; size: number }) =>
  <span className="pet-face" style={{ width: size, height: size }}><svg viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: petIcon(kind) }} /></span>

/** «Питомцы» in a person's profile: their pets and «+ Питомец» */
function PetList({ id }: { id: string }) {
  const list = petsOf(id)
  return <>
    <div className="section-t"><h3>{t('p.pets')}</h3><button className="btn sm ghost" onClick={() => editPet(null, id)}>{t('pet.add')}</button></div>
    {list.length ? <div className="pet-list">{list.map(pt => <button key={pt.id} type="button" className="pet-row" onClick={() => openPet(pt.id)}>
      <PetFace kind={pt.kind} size={36} /><span><b>{pt.name}</b><small>{[kindName(pt.kind), petYears(pt)].filter(Boolean).join(' · ')}</small></span></button>)}</div>
      : <p className="muted pet-none">{t('pet.none')}</p>}
  </>
}

/** the pet's own small profile: name, kind, years, owner */
function ViewPet({ id }: { id: string }) {
  const pt = petById(id); if (!pt) return null
  const o = byId(pt.owner)
  const foot = <>
    <button className="btn ghost danger" onClick={() => { if (confirm(t('pet.del.confirm', { name: pt.name }))) { removePet(pt.id); toast(t('pet.deleted')); if (o) openPerson(o.id); else closePanel() } }}>{t('p.delete')}</button>
    <button className="btn" onClick={() => editPet(pt.id, pt.owner)}>{t('p.edit')}</button>
  </>
  return <Frame title={t('pet.title')} foot={foot} swap={id}>
    <div className="pet-head"><PetFace kind={pt.kind} size={96} /><div><h2 className="pet-name">{pt.name}</h2><div className="muted">{kindName(pt.kind)}</div></div></div>
    <dl className="kv">
      <dt>{t('pet.years')}</dt><dd>{petYears(pt) || t('pet.years.none')}</dd>
      {o && <><dt>{t('pet.owner')}</dt><dd><button type="button" className="pet-owner" onClick={() => openPerson(o.id)}><Avatar p={o} size={24} />{fullName(o)}</button></dd></>}
    </dl>
  </Frame>
}

/** add or change a pet: name, kind from the list, years */
function EditPet({ id, owner }: { id: string | null; owner: string }) {
  const pt = id ? petById(id) : undefined, o = byId(owner)
  const [name, setName] = useState(pt?.name || ''), [kind, setKind] = useState(pt?.kind || 'dog')
  const [born, setBorn] = useState(pt?.born || ''), [died, setDied] = useState(pt?.died || ''), [err, setErr] = useState('')
  const save = () => {
    const n = name.trim(); if (!n) { setErr(t('pet.err.name')); return }
    if (born && died && +died < +born) { setErr(t('pet.err.years')); return }
    const saved = savePet({ id: pt?.id, name: n, kind, born, died, owner }); toast(t('pet.saved'))
    // on a phone the Tree shows the new badge right away; on a wide screen the pet's profile opens beside it
    if (!pt && typeof matchMedia === 'function' && matchMedia('(max-width:860px)').matches) closePanel(); else openPet(saved.id)
  }
  const foot = <>
    <button className="btn ghost" onClick={() => pt ? openPet(pt.id) : openPerson(owner)}>{t('p.cancel')}</button>
    <button className="btn primary" onClick={save}>{t('p.save')}</button>
  </>
  const year = (v: string) => v.replace(/\D/g, '').slice(0, 4)
  return <Frame title={pt ? t('pet.edit') : o ? t('pet.new.for', { name: fullName(o) }) : t('pet.new')} foot={foot}>
    <form className="form" onSubmit={e => { e.preventDefault(); save() }}>
      <div className="field"><label htmlFor="petName">{t('pet.name')}</label><input id="petName" type="text" value={name} placeholder={t('pet.name.ph')} autoFocus onChange={e => { setName(e.target.value); setErr('') }} /></div>
      <div className="field"><label>{t('pet.kind')}</label>
        <div className="pet-kinds" role="radiogroup" aria-label={t('pet.kind')}>
          {KINDS.map(([k]) => <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}><svg viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: petIcon(k) }} />{kindName(k)}</button>)}
        </div></div>
      <div className="row">
        <div className="field"><label htmlFor="petBorn">{t('pet.born')}</label><input id="petBorn" type="text" inputMode="numeric" maxLength={4} placeholder="2015" value={born} onChange={e => { setBorn(year(e.target.value)); setErr('') }} /></div>
        <div className="field"><label htmlFor="petDied">{t('pet.died')}</label><input id="petDied" type="text" inputMode="numeric" maxLength={4} placeholder={t('pet.died.ph')} value={died} onChange={e => { setDied(year(e.target.value)); setErr('') }} /></div>
      </div>
      {err && <p className="pet-err" role="alert">{err}</p>}
      <button type="submit" hidden />
    </form>
  </Frame>
}
