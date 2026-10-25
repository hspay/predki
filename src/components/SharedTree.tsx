import { useEffect, useMemo, useRef, useState } from 'react'
import { S, ui, LANG, byId, fullName, showYear, closePanel, generations, demo, useStore, bindDateMask, normDate, dateValid, type Person } from '../lib/core'
import { setLangValue } from '../lib/i18n'
import TreePage, { introStep, INTRO_START } from '../pages/TreePage'
import { distances } from '../lib/demo'
import { kinship, chainName } from '../lib/kinship'
import { familyColors } from '../lib/treeLayout'
import { themeOf } from '../lib/treeStyle'
import { globeMark } from '../lib/globe'
import { fetchShared, submitAnswer, type Shared, type Item } from '../lib/invites'
import SkyBackground from './SkyBackground'
import GuestApp from './GuestApp'
import '../demo.css'

// «Ссылка на древо»: what a guest opens by a link (?s=…). The owner's tree as a snapshot made when the link was created,
// on the demo tree's engine: it grows from the owner on first open, cards open with a tap, nothing is saved on this device.
// show — for social networks: only to look, then «Построить своё древо». ask — for relatives: «Кто вы?» and «Дополнить».
// Links made before (with no kind, from «Заполнить пробелы») still open the older page, GuestApp.

/** the link page: the new tree for «Ссылка на древо», the older page for the links made in «Заполнить пробелы» */
export function ShareGate({ token }: { token: string }) {
  const [r, setR] = useState<Shared | 'old' | null>(null)
  useEffect(() => { fetchShared(token).then(x => setR(x && x.snapshot.v === 2 && x.snapshot.mode ? x : 'old')).catch(() => setR('old')) }, [token])
  if (!r) return null
  return r === 'old' ? <GuestApp token={token} /> : <SharedTree token={token} data={r} />
}

const TX = {
  ru: {
    people: ['человек', 'человека', 'человек'], gens: ['поколение', 'поколения', 'поколений'],
    leads: (n: string) => `ведёт ${n}`, asks: (n: string, d: string) => `${n} просит дополнить древо · до ${d}`, leader: 'ведёт древо',
    hint: 'Нажмите на карточку', cta: 'Построить своё древо', closeCard: 'Закрыть карточку',
    born: (g: string): string => (g === 'f' ? 'Родилась' : 'Родился'), died: (g: string): string => (g === 'f' ? 'Ушла' : 'Ушёл'), was: 'При рождении',
    who: 'Кто вы?', whoYou: (n: string) => `Вы: ${n}`, notHere: 'Меня нет в древе', notHereShort: 'Не в древе', search: 'Поиск по имени',
    introH: 'Что вы помните?', introP: (n: string) => `Выберите человека в древе. ${n} проверит и добавит.`,
    addPerson: '+ Добавить человека', write: (n: string) => `Написать ${n}`, add: 'Дополнить', doneHere: 'Вы уже дополнили',
    bDate: 'Дата рождения', bPlace: 'Место рождения', dDate: 'Дата ухода', dPlace: 'Место ухода', story: 'Что вы помните', storyPh: 'Где жил, кем работал, каким был',
    datePh: 'ДД.ММ.ГГГГ', placePh: 'Город или село', name: 'Ваше имя', namePh: 'Например, Ольга',
    send: (n: string) => `Отправить ${n}`, cancel: 'Отмена', sending: 'Отправляю…',
    sentH: 'Отправлено', sentP: (n: string) => `Спасибо! ${n} увидит.`, more: 'Дополнить ещё',
    newH: 'Новый человек', first: 'Имя', last: 'Фамилия', gender: 'Пол', f: 'Женщина', m: 'Мужчина', birth: 'Год или дата рождения',
    kind: 'Кем приходится', of: 'Кому', kinds: { parent: 'Мама или папа', child: 'Сын или дочь', spouse: 'Муж или жена', sibling: 'Брат или сестра' }, note: 'Что вы знаете',
    noteH: (n: string) => `Сообщение для ${n}`, notePh: 'Поправка, вопрос, история о семье',
    empty: 'Заполните хотя бы одно поле', badDate: 'Дата: ДД.ММ.ГГГГ или только год', needName: 'Напишите, как вас зовут',
    failed: 'Не получилось отправить. Проверьте интернет', tooMany: 'Слишком много ответов за час. Попробуйте позже', closedLink: 'Ссылку закрыли',
    mGen: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
  },
  en: {
    people: ['person', 'people', 'people'], gens: ['generation', 'generations', 'generations'],
    leads: (n: string) => `kept by ${n}`, asks: (n: string, d: string) => `${n} asks you to add to the tree · until ${d}`, leader: 'keeps the tree',
    hint: 'Tap a card', cta: 'Build your own tree', closeCard: 'Close the card',
    born: (_g: string): string => 'Born', died: (_g: string): string => 'Died', was: 'Born as',
    who: 'Who are you?', whoYou: (n: string) => `You: ${n}`, notHere: 'I am not in the tree', notHereShort: 'Not in the tree', search: 'Search by name',
    introH: 'What do you remember?', introP: (n: string) => `Pick a person in the tree. ${n} will check and add it.`,
    addPerson: '+ Add a person', write: (n: string) => `Write to ${n}`, add: 'Add to it', doneHere: 'You already added to this',
    bDate: 'Birth date', bPlace: 'Birthplace', dDate: 'Date of death', dPlace: 'Place of death', story: 'What you remember', storyPh: 'Where they lived, their work, what they were like',
    datePh: 'DD.MM.YYYY', placePh: 'Town or village', name: 'Your name', namePh: 'For example, Olga',
    send: (n: string) => `Send to ${n}`, cancel: 'Cancel', sending: 'Sending…',
    sentH: 'Sent', sentP: (n: string) => `Thank you! ${n} will see it.`, more: 'Add more',
    newH: 'New person', first: 'First name', last: 'Last name', gender: 'Gender', f: 'Woman', m: 'Man', birth: 'Birth year or date',
    kind: 'Who they are', of: 'To whom', kinds: { parent: 'Mother or father', child: 'Son or daughter', spouse: 'Husband or wife', sibling: 'Brother or sister' }, note: 'What you know',
    noteH: (n: string) => `Message for ${n}`, notePh: 'A correction, a question, a family story',
    empty: 'Fill in at least one field', badDate: 'Date: DD.MM.YYYY or just the year', needName: 'Please write your name',
    failed: 'Could not send. Check your connection', tooMany: 'Too many answers this hour. Try again later', closedLink: 'The link was closed',
    mGen: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  },
}
type T_ = typeof TX.ru
const pl = (n: number, f: string[]) => { if (LANG === 'en') return n === 1 ? f[0] : f[1]; const a = n % 10, b = n % 100; return f[(a === 1 && b !== 11) ? 0 : (a >= 2 && a <= 4 && (b < 12 || b > 14)) ? 1 : 2] }
/** «Андрей» → «Андрея» / «Андрею», «Ольга» → «Ольги» / «Ольге»; English and unusual names stay as they are */
function nameCase(n: string, c: 'g' | 'd', gender?: string) {
  if (LANG === 'en' || !/[а-яё]$/i.test(n)) return n
  if (/ия$/i.test(n)) return n.slice(0, -1) + 'и'
  if (/[ая]$/i.test(n)) { const s = n.slice(0, -1); return c === 'd' ? s + 'е' : s + (/[гкхжчшщ]$/i.test(s) || /я$/i.test(n) ? 'и' : 'ы') }
  if (/й$/i.test(n)) return n.slice(0, -1) + (c === 'g' ? 'я' : 'ю')
  if (/ь$/i.test(n)) return gender === 'm' ? n.slice(0, -1) + (c === 'g' ? 'я' : 'ю') : n
  if (/[бвгджзклмнпрстфхцчшщ]$/i.test(n)) return n + (c === 'g' ? 'а' : 'у')
  return n
}
/** «21.10.1980» → «21 октября 1980», «1980» stays */
function fmtDate(v: string, T: T_) {
  const m = v.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (m) return LANG === 'en' ? `${T.mGen[+m[2] - 1]} ${+m[1]}, ${m[3]}` : `${+m[1]} ${T.mGen[+m[2] - 1]} ${m[3]}`
  return showYear(v)
}
const store = { get: (k: string) => { try { return localStorage.getItem(k) || '' } catch { return '' } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* private mode */ } } }
const NAME_KEY = 'predki:guestName', WHO_KEY = 'predki:guestWho:'
const HOME = location.origin + location.pathname

type Sheet = { k: 'intro' } | { k: 'person'; id: string } | { k: 'add' } | { k: 'note' } | { k: 'sent' }

function SharedTree({ token, data }: { token: string; data: Shared }) {
  useStore()
  const snap = data.snapshot, ask = (data.mode || snap.mode) === 'ask'
  const T = TX[snap.lang === 'en' ? 'en' : 'ru']
  const ownerId = snap.ownerId && snap.people.some(p => p.id === snap.ownerId) ? snap.ownerId : ''
  const [who, setWho] = useState<string>(() => { const w = ask ? store.get(WHO_KEY + token) : ''; return w && snap.people.some(p => p.id === w) ? w : w === '-' ? '-' : '' })
  const [intro, setIntro] = useState(Date.now())
  const [sheet, setSheet] = useState<Sheet>({ k: 'intro' })
  const [done, setDone] = useState<Set<string>>(new Set())
  const [whoOpen, setWhoOpen] = useState(false)

  // the snapshot becomes the tree on screen; nothing is ever saved from it (the same switch the demo uses)
  useMemo(() => {
    demo.on = true; demo.saved = null
    setLangValue(snap.lang === 'en' ? 'en' : 'ru')
    S.people = snap.people as Person[]; S.rels = snap.rels; S.pets = []; S.achievements = []
    S.settings = { theme: snap.style?.theme, lines: snap.style?.lines, kin: snap.style?.kin, ghosts: false, familyName: '' }
  }, [snap])
  const viewer = who && who !== '-' ? who : ''
  S.settings.meId = viewer || ownerId || undefined
  const owner = snap.owner || (LANG === 'en' ? 'the owner' : 'владелец'), og = ownerId ? byId(ownerId)?.gender : ''
  const ownerG = nameCase(owner, 'g', og), ownerD = nameCase(owner, 'd', og)
  const labels: Record<string, string> = !viewer && ownerId ? { [ownerId]: T.leader } : {}
  const face = viewer || ownerId || (snap.people[0] && snap.people[0].id) || ''

  // the growth runs once, from the owner
  useEffect(() => {
    if (!intro || !face) return
    const d = distances(face), mx = Math.max(0, ...Object.values(d)), ms = (INTRO_START + mx * introStep(mx) + 1.6) * 1000
    const h = setTimeout(() => setIntro(0), ms); return () => clearTimeout(h)
  }, [])
  useEffect(() => { document.title = (snap.family || 'Predki') + ' · Predki' }, [snap])
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { setWhoOpen(false); if (ui.panel) closePanel() } }; addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, [])

  const sel = ui.panel && ui.panel.mode === 'view' ? ui.panel.id : null
  const kin = S.settings.meId ? kinship(S.settings.meId) : null
  const theme = themeOf(S.settings.theme), col = familyColors(!!theme.light)
  const labelOf = (id: string) => { const l = labels[id] || (kin && kin.label[id]) || ''; return !viewer && l && id !== ownerId ? `${l} ${ownerG}` : l }
  const n = S.people.length, g = generations()
  const until = new Date(data.expires_at).toLocaleDateString(LANG === 'en' ? 'en-GB' : 'ru-RU', { day: 'numeric', month: 'long' })
  const pickWho = (id: string) => { setWho(id); store.set(WHO_KEY + token, id); setWhoOpen(false) }
  const sent = (ids: string[]) => { setDone(d => new Set([...d, ...ids])); setSheet({ k: 'sent' }) }

  return (
    <>
      <SkyBackground />
      <div id="demo" className={'shared' + (ask ? ' ask' : ' show') + (ask && sheet.k !== 'intro' ? ' filling' : '') + (intro ? ' intro' : '')}>
        <header className="dm-top">
          <a className="dm-brand" href={HOME}><span className="mk" dangerouslySetInnerHTML={{ __html: globeMark('currentColor', 20) }} />PREDKI</a>
          <div className="dm-mid">
            <h1 className="sh-fam">{snap.family || owner}</h1>
            <p className="dm-sub">{ask ? <span>{T.asks(owner, until)}</span> : <><span>{n} {pl(n, T.people)} · {g} {pl(g, T.gens)}</span><span>{T.leads(owner)}</span></>}</p>
          </div>
          {ask ? <div className="sh-who">
            <button type="button" className={'sh-who-btn' + (who ? ' on' : '')} aria-expanded={whoOpen} onClick={() => setWhoOpen(!whoOpen)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4.5 4.2-7 8-7s7 2.5 8 7" /></svg>
              <span className="full">{viewer ? T.whoYou(byId(viewer)!.first) : who === '-' ? T.notHere : T.who}</span>
              <span className="short">{viewer ? byId(viewer)!.first : who === '-' ? T.notHereShort : T.who}</span>
            </button>
            {whoOpen && <WhoMenu T={T} current={who} onPick={pickWho} />}
          </div> : <span />}
        </header>
        <div className={'dm-main sh-main' + (ask ? ' ask' : '')}>
          <TreePage demo={{ labels, face, intro }}>
            {sel && byId(sel) && <Card key={sel} id={sel} T={T} label={labelOf(sel)} color={sel === face ? '' : col.kin(sel)} chainFrom={S.settings.meId || ''}
              ask={ask} done={done.has(sel)} onAdd={() => setSheet({ k: 'person', id: sel })} />}
            {!ask && <div className="dm-cta">
              <p className="dm-hint" aria-hidden={!!sel}>{T.hint}</p>
              <a className="dm-btn" href={HOME}>{T.cta}</a>
            </div>}
          </TreePage>
          {ask && <aside className={'sh-side k-' + sheet.k} aria-label={T.introH}>
            {sheet.k === 'intro' && <div className="sh-intro">
              <h2>{T.introH}</h2>
              <p>{T.introP(owner)}</p>
              <div className="sh-intro-btns">
                <button type="button" className="btn" onClick={() => setSheet({ k: 'add' })}>{T.addPerson}</button>
                <button type="button" className="btn" onClick={() => setSheet({ k: 'note' })}>{T.write(ownerD)}</button>
              </div>
            </div>}
            {sheet.k === 'person' && byId(sheet.id) && <PersonForm key={sheet.id} p={byId(sheet.id)!} T={T} token={token} who={viewer} ownerD={ownerD} onCancel={() => setSheet({ k: 'intro' })} onSent={() => sent([sheet.id])} />}
            {sheet.k === 'add' && <NewPersonForm T={T} token={token} who={viewer} ownerD={ownerD} onCancel={() => setSheet({ k: 'intro' })} onSent={() => sent([])} />}
            {sheet.k === 'note' && <NoteForm T={T} token={token} who={viewer} owner={ownerG} ownerD={ownerD} onCancel={() => setSheet({ k: 'intro' })} onSent={() => sent([])} />}
            {sheet.k === 'sent' && <div className="sh-sent">
              <span className="ok"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5" /></svg></span>
              <div><h2>{T.sentH}</h2><p>{T.sentP(owner)}</p></div>
              <button type="button" className="btn" onClick={() => { setSheet({ k: 'intro' }); closePanel() }}>{T.more}</button>
            </div>}
          </aside>}
        </div>
      </div>
    </>
  )
}

/** «Кто вы?»: the relative finds themselves, and every label turns to them */
function WhoMenu({ T, current, onPick }: { T: T_; current: string; onPick: (id: string) => void }) {
  const [q, setQ] = useState('')
  const list = S.people.filter(p => !q.trim() || fullName(p).toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => fullName(a).localeCompare(fullName(b)))
  return (
    <div className="sh-who-menu" role="listbox" aria-label={T.who}>
      <input className="sh-who-q" placeholder={T.search} value={q} autoFocus onChange={e => setQ(e.target.value)} aria-label={T.search} />
      <div className="sh-who-list">
        {list.map(p => <button key={p.id} type="button" role="option" aria-selected={current === p.id} onClick={() => onPick(p.id)}>{fullName(p)}</button>)}
      </div>
      <button type="button" role="option" aria-selected={current === '-'} className="sh-who-none" onClick={() => onPick('-')}>{T.notHere}</button>
    </div>
  )
}

/** the card of the selected person: who they are, born and died with places, the chain of relatives; for relatives — «Дополнить» */
function Card({ id, T, label, color, chainFrom, ask, done, onAdd }: { id: string; T: T_; label: string; color: string; chainFrom: string; ask: boolean; done: boolean; onAdd: () => void }) {
  const p = byId(id)!
  const chain = chainFrom && id !== chainFrom ? kinship(chainFrom).chain(id) : []
  const row = (k: string, date: string, place: string) => (date || place) ? <div className="r"><span className="l">{k}</span><span className="v">{[date && fmtDate(date, T), place].filter(Boolean).join(' · ')}</span></div> : null
  return (
    <div className="tree-kin dm-card" role="dialog" aria-label={fullName(p)}>
      <button type="button" className="dm-card-x" onClick={closePanel} aria-label={T.closeCard}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
      {label && <span className="k" style={{ color: color || undefined }}>{label}</span>}
      <b className="n">{fullName(p)}</b>
      {p.maiden && <span className="was">{T.was}: {p.maiden}</span>}
      {row(T.born(p.gender), p.birthDate, p.birthPlace)}
      {row(T.died(p.gender), p.deathDate, p.deathPlace)}
      {chain.length > 1 && <span className="ch">{chain.map((x, i) => <span key={x}>{i > 0 && <i aria-hidden="true">→</i>}{chainName(x)}</span>)}</span>}
      {ask && <>{done && <span className="sh-done">{T.doneHere}</span>}<button type="button" className="btn add sh-add" onClick={onAdd}>{T.add}</button></>}
    </div>
  )
}

/** a masked date input: digits only, dots appear by themselves (uncontrolled: the mask rewrites the value itself) */
function DateInput({ id, onChange, placeholder }: { id: string; onChange: (v: string) => void; placeholder: string }) {
  const cb = useRef(onChange); cb.current = onChange
  return <input id={id} placeholder={placeholder} inputMode="numeric" ref={el => { if (el && !el.dataset.mask) { el.dataset.mask = '1'; bindDateMask(el); el.addEventListener('input', () => cb.current(el.value)) } }} />
}

/** sending: the guest's name (kept on this device for next time), the server's refusals in plain words */
function useSend(T: T_, token: string, who: string) {
  const [name, setName] = useState(() => (who && byId(who)?.first) || store.get(NAME_KEY))
  const [busy, setBusy] = useState(false), [err, setErr] = useState('')
  const send = async (items: Item[], onSent: () => void) => {
    if (!items.length) { setErr(T.empty); return }
    if (!name.trim()) { setErr(T.needName); return }
    setBusy(true); setErr('')
    try { await submitAnswer(token, name.trim(), items); store.set(NAME_KEY, name.trim()); onSent() }
    catch (e) { const m = (e as { message?: string }).message || ''; setErr(m.includes('too_many') ? T.tooMany : m.includes('link_closed') ? T.closedLink : T.failed) }
    setBusy(false)
  }
  return { name, setName, busy, err, setErr, send }
}
function NameField({ T, name, setName }: { T: T_; name: string; setName: (v: string) => void }) {
  return <div className="field"><label htmlFor="shName">{T.name}</label><input id="shName" value={name} placeholder={T.namePh} onChange={e => setName(e.target.value)} /></div>
}
function Foot({ T, busy, err, label, onCancel }: { T: T_; busy: boolean; err: string; label: string; onCancel: () => void }) {
  return <>
    {err && <p className="dlg-err" role="alert">{err}</p>}
    <div className="sh-foot"><button type="button" className="btn ghost" onClick={onCancel} disabled={busy}>{T.cancel}</button><button type="submit" className="btn primary" disabled={busy}>{busy ? T.sending : label}</button></div>
  </>
}

function PersonForm({ p, T, token, who, ownerD, onCancel, onSent }: { p: Person; T: T_; token: string; who: string; ownerD: string; onCancel: () => void; onSent: () => void }) {
  const gone = !!(p.deathDate || p.deathPlace)
  const v = useRef({ bd: '', bp: '', dd: '', dp: '', st: '' })
  const s = useSend(T, token, who)
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const { bd, bp, dd, dp, st } = v.current, items: Item[] = []
    for (const [f, raw] of [['birthDate', bd], ['deathDate', dd]] as const) {
      const d = normDate(raw.trim()); if (!raw.trim()) continue
      if (!dateValid(d)) { s.setErr(T.badDate); return }
      items.push({ t: 'field', id: p.id, f, v: d })
    }
    if (bp.trim()) items.push({ t: 'field', id: p.id, f: 'birthPlace', v: bp.trim() })
    if (dp.trim()) items.push({ t: 'field', id: p.id, f: 'deathPlace', v: dp.trim() })
    if (st.trim()) items.push({ t: 'story', id: p.id, v: st.trim() })
    s.send(items, onSent)
  }
  return (
    <form className="sh-form" onSubmit={submit}>
      <h2>{fullName(p)}</h2>
      <div className="field"><label htmlFor="shBd">{T.bDate}</label><DateInput id="shBd" placeholder={T.datePh} onChange={x => { v.current.bd = x }} /></div>
      <div className="field"><label htmlFor="shBp">{T.bPlace}</label><input id="shBp" placeholder={T.placePh} onChange={e => { v.current.bp = e.target.value }} /></div>
      {gone && <>
        <div className="field"><label htmlFor="shDd">{T.dDate}</label><DateInput id="shDd" placeholder={T.datePh} onChange={x => { v.current.dd = x }} /></div>
        <div className="field"><label htmlFor="shDp">{T.dPlace}</label><input id="shDp" placeholder={T.placePh} onChange={e => { v.current.dp = e.target.value }} /></div>
      </>}
      <div className="field"><label htmlFor="shSt">{T.story}</label><textarea id="shSt" rows={4} placeholder={T.storyPh} onChange={e => { v.current.st = e.target.value }} /></div>
      <NameField T={T} name={s.name} setName={s.setName} />
      <Foot T={T} busy={s.busy} err={s.err} label={T.send(ownerD)} onCancel={onCancel} />
    </form>
  )
}

function NewPersonForm({ T, token, who, ownerD, onCancel, onSent }: { T: T_; token: string; who: string; ownerD: string; onCancel: () => void; onSent: () => void }) {
  const [first, setFirst] = useState(''), [last, setLast] = useState(''), [gender, setGender] = useState<'' | 'm' | 'f'>('')
  const [kind, setKind] = useState<'parent' | 'child' | 'spouse' | 'sibling'>('child'), [of, setOf] = useState(who || ''), [note, setNote] = useState('')
  const birth = useRef('')
  const s = useSend(T, token, who)
  const people = [...S.people].sort((a, b) => fullName(a).localeCompare(fullName(b)))
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!first.trim() || !of) { s.setErr(T.empty); return }
    const b = normDate(birth.current.trim()); if (b && !dateValid(b)) { s.setErr(T.badDate); return }
    s.send([{ t: 'person', first: first.trim(), last: last.trim(), gender, birth: b, kind, of, note: note.trim() }], onSent)
  }
  return (
    <form className="sh-form" onSubmit={submit}>
      <h2>{T.newH}</h2>
      <div className="sh-two">
        <div className="field"><label htmlFor="shF">{T.first}</label><input id="shF" value={first} onChange={e => setFirst(e.target.value)} /></div>
        <div className="field"><label htmlFor="shL">{T.last}</label><input id="shL" value={last} onChange={e => setLast(e.target.value)} /></div>
      </div>
      <div className="field"><span className="lb">{T.gender}</span><div className="sh-seg">
        {(['f', 'm'] as const).map(x => <button key={x} type="button" aria-pressed={gender === x} onClick={() => setGender(gender === x ? '' : x)}>{x === 'f' ? T.f : T.m}</button>)}
      </div></div>
      <div className="field"><label htmlFor="shB">{T.birth}</label><DateInput id="shB" placeholder={T.datePh} onChange={x => { birth.current = x }} /></div>
      <div className="sh-two">
        <div className="field"><label htmlFor="shK">{T.kind}</label><select id="shK" value={kind} onChange={e => setKind(e.target.value as typeof kind)}>{(Object.keys(T.kinds) as (keyof typeof T.kinds)[]).map(k => <option key={k} value={k}>{T.kinds[k]}</option>)}</select></div>
        <div className="field"><label htmlFor="shO">{T.of}</label><select id="shO" value={of} onChange={e => setOf(e.target.value)}><option value="" />{people.map(p => <option key={p.id} value={p.id}>{fullName(p)}</option>)}</select></div>
      </div>
      <div className="field"><label htmlFor="shN">{T.note}</label><textarea id="shN" rows={3} value={note} onChange={e => setNote(e.target.value)} /></div>
      <NameField T={T} name={s.name} setName={s.setName} />
      <Foot T={T} busy={s.busy} err={s.err} label={T.send(ownerD)} onCancel={onCancel} />
    </form>
  )
}

function NoteForm({ T, token, who, owner, ownerD, onCancel, onSent }: { T: T_; token: string; who: string; owner: string; ownerD: string; onCancel: () => void; onSent: () => void }) {
  const [v, setV] = useState('')
  const s = useSend(T, token, who)
  return (
    <form className="sh-form" onSubmit={e => { e.preventDefault(); s.send(v.trim() ? [{ t: 'note', v: v.trim() }] : [], onSent) }}>
      <h2>{T.noteH(owner)}</h2>
      <div className="field"><label htmlFor="shNote" className="vh">{T.noteH(owner)}</label><textarea id="shNote" rows={6} value={v} placeholder={T.notePh} onChange={e => setV(e.target.value)} /></div>
      <NameField T={T} name={s.name} setName={s.setName} />
      <Foot T={T} busy={s.busy} err={s.err} label={T.send(ownerD)} onCancel={onCancel} />
    </form>
  )
}

