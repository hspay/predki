import { useEffect, useMemo, useRef, useState } from 'react'
import { S, LANG, byId, fullName, yearOf, yearsOf, avatarSrc, parentsOf, childrenOf, spousesOf, normDate, dateValid, bindDateMask, type Person } from '../lib/core'
import { setLangValue } from '../lib/i18n'
import { layout } from '../lib/treeLayout'
import { kinship } from '../lib/kinship'
import { question, question2, familyGaps, type Gap } from '../lib/gaps'
import { fetchShared, submitAnswer, type Snapshot, type Item } from '../lib/invites'
import { globeSvg } from '../lib/globe'

// The page a relative opens from a «Попросить заполнить» link: a light, read-only view of the family
// and a short form per person. Nothing is saved on this device except the name the relative typed.
const TX = {
  ru: {
    loading: 'Открываем древо…', closedH: 'Ссылка больше не работает', closedP: 'Её закрыли или прошло 30 дней. Попросите новую у того, кто её прислал.',
    errH: 'Не получилось открыть древо', errP: 'Проверьте интернет и обновите страницу.',
    eyebrow: 'Семейное древо', asks: (o: O) => `Помогите ${o.d} заполнить ваше семейное древо. Дополните даты рождений, расскажите о переездах или просто поделитесь историями из жизни ваших близких, которые хочется сохранить.`,
    review: (o: O) => `Регистрироваться не нужно: ${o.n} сначала прочитает ваши ответы, а потом добавит их в древо.`,
    whoPick: 'Выбрать себя из списка', whoSearch: 'Поиск по имени',
    startH: 'С чего начать', startP: (o: O) => `Этого ${o.n} пока не знает. Возможно, вы помните.`,
    bDay: 'Точная дата рождения', yearKnown: (y: string) => `Известен только год: ${y}`, dayKnown: 'день и месяц известны', dDay: 'Точная дата ухода',
    allKnown: 'Основное об этом человеке уже известно. Самое ценное теперь — истории и то, где и когда он жил.', fix: 'Нашли ошибку в том, что уже известно? Исправить',
    whoH: 'Кто вы?', whoP: 'Найдите себя в списке — подписи подстроятся под вас.', notHere: 'Меня нет в древе', you: 'Вы', notYou: 'Это не вы?',
    qEyebrow: (o: O) => `Вопрос от ${o.g}`, answer: 'Ответить',
    listH: 'Кто есть в древе', listP: 'Нажмите на человека, чтобы дописать, что вы знаете.', gen: 'поколение',
    addPerson: '+ Добавить человека, которого нет в древе', write: (o: O) => `Написать ${o.d}`,
    until: (d: string) => `Ссылка действует до ${d}.`, foot: 'Predki — конструктор семейного древа',
    miss: { birth: 'нет даты рождения', place: 'нет места рождения' }, sent: 'дополнено',
    known: 'Что уже известно', born: 'Рождение', died: 'Ушёл(ла) из жизни', lived: 'События', spouses: 'Супруги', kids: 'Дети', parents: 'Родители', nothing: 'Пока почти ничего — тем ценнее, что вы расскажете.',
    form: 'Что вы помните', bDate: 'Дата или год рождения', bPlace: 'Место рождения', dToggle: 'Если ушёл(ла) из жизни', dDate: 'Дата или год ухода', dPlace: 'Место',
    whereH: 'Где жил(а) и когда', from: 'С года', to: 'По год', city: 'Город или село', moreRow: '+ Ещё место',
    wedH: 'Свадьба', wedWith: 'С кем', wedDate: 'Дата или год', story: 'Что вы о нём или о ней помните', storyPh: 'Любые истории: где работал, каким был, что рассказывал…',
    name: 'Как вас зовут?', namePh: 'Например, Ольга', send: (o: O) => `Отправить ${o.d}`, cancel: 'Закрыть',
    empty: 'Заполните хотя бы одно поле', badDate: 'Проверьте дату: ДД.ММ.ГГГГ или только год', needName: 'Напишите, как вас зовут',
    thanks: (o: O) => `Отправлено. ${o.n} увидит это и добавит в древо. Спасибо!`, failed: 'Не получилось отправить. Проверьте интернет и попробуйте ещё раз', tooMany: 'Слишком много ответов за час. Попробуйте чуть позже',
    newH: 'Новый человек', first: 'Имя', last: 'Фамилия', gender: 'Пол', f: 'Женщина', m: 'Мужчина', birth: 'Год или дата рождения', kind: 'Кем приходится', of: 'Кому',
    kinds: { parent: 'Мама или папа', child: 'Сын или дочь', spouse: 'Муж или жена', sibling: 'Брат или сестра' }, note: 'Что вы о нём или о ней знаете',
    noteH: (o: O) => `Сообщение для ${o.g}`, forOwner: (o: O) => `для ${o.g}`, notePh: 'Что угодно: поправка, вопрос, история о семье',
    till: (y: string) => `по ${y}`,
    people: ['человек', 'человека', 'человек'], gens: ['поколение', 'поколения', 'поколений'], since: 'история с',
    how: (o: O) => [['Выберите человека', 'Себя, родителей, бабушку — любого, о ком что-то знаете.'], ['Напишите, что помните', 'Даты, города, истории. Можно коротко, можно примерно.'], [`${o.n} проверит`, 'И добавит всё в древо. Регистрироваться не нужно.']],
  },
  en: {
    loading: 'Opening the tree…', closedH: 'This link no longer works', closedP: 'It was closed or 30 days have passed. Ask whoever sent it for a new one.',
    errH: 'Could not open the tree', errP: 'Check your connection and reload the page.',
    eyebrow: 'Family tree', asks: (o: O) => `Help ${o.n} fill in your family tree. Add birthdays, tell about moves, or simply share stories from the lives of your loved ones that are worth keeping.`,
    review: (o: O) => `No sign-up needed: ${o.n} will read your answers first and then add them to the tree.`,
    whoPick: 'Find yourself in the list', whoSearch: 'Search by name',
    startH: 'Where to start', startP: (o: O) => `${o.n} does not know this yet. Maybe you remember.`,
    bDay: 'Exact birth date', yearKnown: (y: string) => `Only the year is known: ${y}`, dayKnown: 'day and month are known', dDay: 'Exact date of death',
    allKnown: 'The basics about this person are known. What matters most now are stories and where and when they lived.', fix: 'Found a mistake in what is known? Correct it',
    whoH: 'Who are you?', whoP: 'Find yourself in the list and the captions will adapt to you.', notHere: 'I am not in the tree', you: 'You', notYou: 'Not you?',
    qEyebrow: (o: O) => `A question from ${o.n}`, answer: 'Answer',
    listH: 'Who is in the tree', listP: 'Tap a person to add what you know.', gen: 'generation',
    addPerson: '+ Add someone who is missing', write: (o: O) => `Write to ${o.n}`,
    until: (d: string) => `The link works until ${d}.`, foot: 'Predki — a family tree builder',
    miss: { birth: 'no birth date', place: 'no birthplace' }, sent: 'added',
    known: 'What is known', born: 'Born', died: 'Passed away', lived: 'Events', spouses: 'Spouses', kids: 'Children', parents: 'Parents', nothing: 'Almost nothing yet — so whatever you tell matters.',
    form: 'What you remember', bDate: 'Birth date or year', bPlace: 'Birthplace', dToggle: 'If they have passed away', dDate: 'Date or year of death', dPlace: 'Place',
    whereH: 'Where and when they lived', from: 'From', to: 'To', city: 'Town or village', moreRow: '+ Another place',
    wedH: 'Wedding', wedWith: 'With', wedDate: 'Date or year', story: 'What you remember about them', storyPh: 'Any stories: their work, what they were like, what they told…',
    name: 'Your name', namePh: 'For example, Olga', send: (o: O) => `Send to ${o.n}`, cancel: 'Close',
    empty: 'Fill in at least one field', badDate: 'Check the date: DD.MM.YYYY or just the year', needName: 'Please write your name',
    thanks: (o: O) => `Sent. ${o.n} will see it and add it to the tree. Thank you!`, failed: 'Could not send. Check your connection and try again', tooMany: 'Too many answers this hour. Try again a bit later',
    newH: 'New person', first: 'First name', last: 'Last name', gender: 'Gender', f: 'Woman', m: 'Man', birth: 'Birth year or date', kind: 'Who they are', of: 'To whom',
    kinds: { parent: 'Mother or father', child: 'Son or daughter', spouse: 'Husband or wife', sibling: 'Brother or sister' }, note: 'What you know about them',
    noteH: (o: O) => `Message for ${o.n}`, forOwner: (o: O) => `to ${o.n}`, notePh: 'Anything: a correction, a question, a family story',
    till: (y: string) => `until ${y}`,
    people: ['person', 'people', 'people'], gens: ['generation', 'generations', 'generations'], since: 'history since',
    how: (o: O) => [['Pick a person', 'Yourself, your parents, a grandmother — anyone you know something about.'], ['Write what you remember', 'Dates, towns, stories. Short or approximate is fine.'], [`${o.n} checks it`, 'And adds it to the tree. No sign-up needed.']],
  },
}
type T_ = typeof TX.ru
type O = { n: string; g: string; d: string }
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
const pl = (n: number, f: string[]) => { if (LANG === 'en') return n === 1 ? f[0] : f[1]; const a = n % 10, b = n % 100; return f[(a === 1 && b !== 11) ? 0 : (a >= 2 && a <= 4 && (b < 12 || b > 14)) ? 1 : 2] }
const NAME_KEY = 'predki:guestName', WHO_KEY = 'predki:guestWho:'
const store = { get: (k: string) => { try { return localStorage.getItem(k) || '' } catch { return '' } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* private mode */ } } }
const NOW = new Date().getFullYear()
const yearOk = (s: string) => !s || (/^\d{4}$/.test(s) && +s >= 1500 && +s <= NOW)

/** a masked date input: digits only, dots appear by themselves. It is uncontrolled on purpose: the mask rewrites
 *  the value itself, and React would not notice that change in a controlled input. */
function DateInput({ id, onChange, placeholder }: { id: string; value?: string; onChange: (v: string) => void; placeholder?: string }) {
  const cb = useRef(onChange); cb.current = onChange
  return <input id={id} placeholder={placeholder || (LANG === 'en' ? 'DD.MM.YYYY' : 'ДД.ММ.ГГГГ')} ref={el => {
    if (el && !el.dataset.mask) { el.dataset.mask = '1'; bindDateMask(el); el.addEventListener('input', () => cb.current(el.value)) }
  }} />
}

/** the app's address without the link token: a visitor without a tree sees the welcome landing there */
const HOME = location.origin + location.pathname

type Sheet = { kind: 'person'; id: string; gap?: Gap } | { kind: 'new' } | { kind: 'note' }

export default function GuestApp({ token }: { token: string }) {
  const [state, setState] = useState<'loading' | 'closed' | 'error' | 'ready'>('loading')
  const [snap, setSnap] = useState<Snapshot | null>(null)
  const [until, setUntil] = useState('')
  const [who, setWho] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [done, setDone] = useState<Set<string>>(new Set())
  const [banner, setBanner] = useState('')
  const T: T_ = TX[(snap?.lang || LANG) === 'en' ? 'en' : 'ru'] as T_

  useEffect(() => {
    document.title = 'Predki'
    fetchShared(token).then(r => {
      if (!r) { setState('closed'); return }
      const s = r.snapshot; setLangValue(s.lang === 'en' ? 'en' : 'ru')
      // the copy lives only in memory: nothing is written to this device's storage
      S.people = s.people; S.rels = s.rels; S.settings = { meId: s.ownerId || undefined }
      setSnap(s); setUntil(new Date(r.expires_at).toLocaleDateString(s.lang === 'en' ? 'en-GB' : 'ru-RU', { day: 'numeric', month: 'long' }))
      const saved = store.get(WHO_KEY + token)
      setWho(saved === '-' ? null : saved && byId(saved) ? saved : s.to && byId(s.to) ? s.to : null)
      setPicking(!saved && !s.to)
      setState('ready')
    }).catch(() => setState('error'))
  }, [token])

  const owner = snap?.owner || (LANG === 'en' ? 'The tree owner' : 'Владелец древа')
  const og = snap && snap.ownerId && byId(snap.ownerId) ? byId(snap.ownerId)!.gender : ''
  const O: O = { n: owner, g: snap?.owner ? nameCase(owner, 'g', og) : owner, d: snap?.owner ? nameCase(owner, 'd', og) : owner }
  const gens = useMemo(() => {
    if (!snap) return []
    const lay = layout(() => 1), rows = new Map<number, Person[]>()
    S.people.forEach(p => { const P = lay.pos[p.id]; const g = P ? P.g : 99; if (!rows.has(g)) rows.set(g, []); rows.get(g)!.push(p) })
    return [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([g, ps]) => {
      const ys = ps.map(p => +yearOf(p.birthDate)).filter(Boolean)
      return { g, label: ys.length ? '≈' + Math.round(ys.reduce((a, b) => a + b, 0) / ys.length) : '', people: ps.sort((a, b) => (yearOf(a.birthDate) || '9999').localeCompare(yearOf(b.birthDate) || '9999')) }
    })
  }, [snap])
  const kin = useMemo(() => { const root = who || (snap && snap.ownerId) || ''; return snap && byId(root) ? kinship(root) : null }, [snap, who])
  const kinLabel = (id: string) => { if (!kin) return ''; const l = kin.label[id] || ''; if (!who) return l && l !== 'Вы' && l !== 'You' ? `${l} ${T.forOwner(O)}` : ''; return l === 'Вы' || l === 'You' ? T.you : l }
  const gap = useMemo<Gap | null>(() => (snap && snap.gap && byId(snap.gap.id) ? { ...snap.gap, len: snap.gap.b - snap.gap.a, w: [] } : null), [snap])
  // other gaps this relative may remember (all of them when we do not know who they are), four at most
  const starts = useMemo(() => {
    if (!snap) return []
    const all = familyGaps().filter(g => !(gap && g.id === gap.id && g.a === gap.a) && (!who || g.w.includes(who)))
    return all.slice(0, 4)
  }, [snap, who, gap])
  const pickWho = (id: string | null) => { setWho(id); setPicking(false); store.set(WHO_KEY + token, id || '-') }

  if (state !== 'ready' || !snap) return (
    <div className="gs"><div className="gs-wrap gs-center">
      {state === 'loading' ? <p className="gs-muted">{T.loading}</p> : <>
        <h1>{state === 'closed' ? T.closedH : T.errH}</h1><p className="gs-muted">{state === 'closed' ? T.closedP : T.errP}</p></>}
      {state !== 'loading' && <a className="gs-brand" href={HOME}>{T.foot}</a>}
    </div></div>
  )

  const ys = S.people.map(p => +yearOf(p.birthDate)).filter(Boolean), since = ys.length ? String(Math.min(...ys)) : ''
  const missing = (p: Person) => [!p.birthDate && T.miss.birth, p.birthDate && !p.birthPlace && T.miss.place].filter(Boolean).join(' · ')
  const sent = (ids: string[]) => { setDone(d => new Set([...d, ...ids])); setSheet(null); setBanner(T.thanks(O)); setTimeout(() => setBanner(''), 6000) }

  return (
    <div className="gs">
      <div className="gs-wrap">
        <header className="gs-top"><span className="gs-logo"><span className="gs-mark" dangerouslySetInnerHTML={{ __html: globeSvg('#F4F2EC', 18) }} />PREDKI</span></header>
        <section className="gs-hero">
          <span className="eyebrow">{T.eyebrow}</span>
          <h1>{snap.family || owner}</h1>
          <p className="gs-stats">{[`${S.people.length} ${pl(S.people.length, T.people)}`, `${gens.length} ${pl(gens.length, T.gens)}`, since ? `${T.since} ${since}` : ''].filter(Boolean).map(x => <span key={x}>{x}</span>)}</p>
          <p>{T.asks(O)}</p>
        </section>
        <ol className="gs-how">{T.how(O).map(([h, d], i) => <li key={i}><b>{i + 1}</b><span><strong>{h}</strong>{d}</span></li>)}</ol>

        {picking ? <WhoPicker T={T} ownerId={snap.ownerId} onPick={pickWho} />
         : who && <p className="gs-me"><img src={avatarSrc(byId(who)!)} alt="" /><span>{T.you}: <b>{fullName(byId(who)!)}</b></span><button type="button" onClick={() => setPicking(true)}>{T.notYou}</button></p>}

        {gap && <section className="gs-card gs-q">
          <span className="eyebrow">{T.qEyebrow(O)}</span>
          <p className="q">{question(gap, who)}{question2(gap, who) ? ' ' + question2(gap, who) : ''}</p>
          <button type="button" className="btn go" onClick={() => setSheet({ kind: 'person', id: gap.id, gap })}>{T.answer}</button>
        </section>}
        {starts.length > 0 && <section className="gs-start">
          <h2 className="gs-h">{T.startH}</h2>
          <p className="gs-muted">{T.startP(O)}</p>
          <ul>{starts.map(g => { const p = byId(g.id)!; return (
            <li key={g.id + g.a}><img src={avatarSrc(p)} alt="" /><span className="q">{question(g, who)}</span>
              <button type="button" className="btn sm go-o" onClick={() => setSheet({ kind: 'person', id: g.id, gap: g })}>{T.answer}</button></li>) })}</ul>
        </section>}

        <h2 className="gs-h">{T.listH}</h2>
        <p className="gs-muted">{T.listP}</p>
        {gens.map((row, i) => (
          <div className="gs-gen" key={row.g}>
            <span className="gs-gen-y">{row.label || `${i + 1} ${T.gen}`}</span>
            <div className="gs-people">{row.people.map(p => { const k = kinLabel(p.id), m = missing(p); return (
              <button key={p.id} type="button" className={'gs-person' + (done.has(p.id) ? ' done' : '')} onClick={() => setSheet({ kind: 'person', id: p.id })}>
                <img src={avatarSrc(p)} alt="" />
                <span className="tx"><b>{fullName(p)}</b><span>{[yearsOf(p), k].filter(Boolean).join(' · ')}</span>{done.has(p.id) ? <em className="ok">✓ {T.sent}</em> : m && <em className="miss">{m}</em>}</span>
              </button>) })}</div>
          </div>
        ))}
        <div className="gs-more">
          <button type="button" className="btn" onClick={() => setSheet({ kind: 'new' })}>{T.addPerson}</button>
          <button type="button" className="btn ghost" onClick={() => setSheet({ kind: 'note' })}>{T.write(O)}</button>
        </div>
        <footer className="gs-foot">{T.review(O)} {T.until(until)} <a className="gs-brand" href={HOME} target="_blank" rel="noopener">{T.foot}</a></footer>
      </div>
      {banner && <div className="gs-banner" role="status">{banner}</div>}
      {sheet && <GuestSheet sheet={sheet} T={T} O={O} who={who} token={token} kinLabel={kinLabel} onClose={() => setSheet(null)} onSent={sent} />}
    </div>
  )
}

/** «Кто вы?»: one field; the list of people opens inside it, with a search on top */
function WhoPicker({ T, ownerId, onPick }: { T: T_; ownerId: string | null; onPick: (id: string | null) => void }) {
  const [open, setOpen] = useState(false), [q, setQ] = useState('')
  const ql = q.trim().toLowerCase()
  // only people who can be alive: no death date and not born more than a hundred years ago
  const list = S.people.filter(p => !(p.deathDate || '').trim() && !(+yearOf(p.birthDate) && +yearOf(p.birthDate) < NOW - 100) && p.id !== ownerId && (!ql || fullName(p).toLowerCase().includes(ql))).sort((a, b) => fullName(a).localeCompare(fullName(b)))
  return (
    <section className="gs-card gs-who">
      <h2>{T.whoH}</h2><p className="gs-muted">{T.whoP}</p>
      <button type="button" className="gs-select" aria-expanded={open} onClick={() => setOpen(!open)}><span>{T.whoPick}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d={open ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} /></svg></button>
      {open && <div className="gs-dd">
        <input className="gs-dd-q" type="search" placeholder={T.whoSearch} value={q} onChange={e => setQ(e.target.value)} aria-label={T.whoSearch} />
        <div className="gs-dd-list" role="listbox" aria-label={T.whoH}>
          {list.map(p => <button key={p.id} type="button" role="option" aria-selected="false" className="gs-dd-item" onClick={() => onPick(p.id)}><img src={avatarSrc(p)} alt="" /><span>{fullName(p)}</span><small>{yearOf(p.birthDate)}</small></button>)}
        </div>
        <button type="button" className="gs-dd-item ghost" onClick={() => onPick(null)}>{T.notHere}</button>
      </div>}
    </section>
  )
}

function GuestSheet({ sheet, T, O, who, token, kinLabel, onClose, onSent }: { sheet: Sheet; T: T_; O: O; who: string | null; token: string; kinLabel: (id: string) => string; onClose: () => void; onSent: (ids: string[]) => void }) {
  const p = sheet.kind === 'person' ? byId(sheet.id)! : null
  const [f, setF] = useState<Record<string, string>>({})
  const [rows, setRows] = useState<{ from: string; to: string; city: string }[]>(() => [sheet.kind === 'person' && sheet.gap ? { from: String(sheet.gap.a), to: sheet.gap.kind === 'tail' ? '' : String(sheet.gap.b), city: '' } : { from: '', to: '', city: '' }])
  const [showDeath, setShowDeath] = useState(false)
  const [fix, setFix] = useState(false)
  const [name, setName] = useState(() => (who && byId(who) ? fullName(byId(who)!) : store.get(NAME_KEY)))
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k: string) => (v: string) => { setF(x => ({ ...x, [k]: v })); setErr('') }
  const spouses = p ? spousesOf(p.id) : []
  // what is already known: a full birth date (or the mark that the owner has it), a place, a wedding year
  const full = (d?: string) => /^\d{1,2}\.\d{1,2}\.\d{4}$/.test((d || '').trim())
  const bdHidden = !!(p && (p as Person & { _bd?: number })._bd)
  const need = p ? {
    bDate: fix || !(full(p.birthDate) || bdHidden), bPlace: fix || !p.birthPlace,
    dead: !!(p.deathDate || '').trim(), dDate: fix || !full(p.deathDate), dPlace: fix || !p.deathPlace,
    wed: spouses.filter(s => !S.rels.some(r => r.type === 'spouse' && ((r.a === p.id && r.b === s.id) || (r.b === p.id && r.a === s.id)) && (r.from || r.partner))),
  } : null
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, [])

  const build = (): Item[] | string => {
    const items: Item[] = [], v = (k: string) => (f[k] || '').trim()
    const date = (k: string) => { const d = normDate(v(k)); return dateValid(d) ? d : null }
    if (sheet.kind === 'person' && p) {
      for (const k of ['birthDate', 'deathDate'] as const) { if (v(k)) { const d = date(k); if (d == null) return T.badDate; if (d !== p[k]) items.push({ t: 'field', id: p.id, f: k, v: d }) } }
      for (const k of ['birthPlace', 'deathPlace'] as const) if (v(k) && v(k) !== p[k]) items.push({ t: 'field', id: p.id, f: k, v: v(k) })
      for (const r of rows) {
        const from = r.from.trim(), to = r.to.trim(), city = r.city.trim(); if (!city && !from && !to) continue
        if (!yearOk(from) || !yearOk(to)) return T.badDate
        items.push({ t: 'event', id: p.id, ev: { type: 'move', year: from ? +from : '', place: city, note: to ? T.till(to) : '' } })
      }
      if (v('wedDate')) { const d = date('wedDate'); if (d == null) return T.badDate; const wl = need ? need.wed : spouses, w = v('wedWith') || (wl.length === 1 ? wl[0].id : ''); if (w) items.push({ t: 'wedding', id: p.id, with: w, v: d }) }
      if (v('story')) items.push({ t: 'story', id: p.id, v: v('story').slice(0, 4000) })
    } else if (sheet.kind === 'new') {
      if (!v('first') && !v('last')) return T.empty
      const b = v('birth') ? date('birth') : ''; if (b == null) return T.badDate
      const of = v('of') || (who || ''); if (!of) return T.empty
      items.push({ t: 'person', first: v('first'), last: v('last'), gender: (v('gender') as '' | 'm' | 'f') || '', birth: b, kind: (v('kind') as 'parent') || 'child', of, note: v('note').slice(0, 2000) })
    } else if (v('note')) items.push({ t: 'note', v: v('note').slice(0, 4000) })
    return items.length ? items : T.empty
  }
  const send = async () => {
    const items = build(); if (typeof items === 'string') { setErr(items); return }
    if (!name.trim()) { setErr(T.needName); return }
    setBusy(true); store.set(NAME_KEY, name.trim())
    try { await submitAnswer(token, name.trim(), items); onSent(p ? [p.id] : []) }
    catch (e) { setErr(String((e as { message?: string }).message || '').includes('too_many') ? T.tooMany : T.failed) }
    setBusy(false)
  }
  const fact = (label: string, value: string) => value ? <><dt>{label}</dt><dd>{value}</dd></> : null
  const evs = p ? (p.events || []).filter(e => e.type !== 'birth' && e.type !== 'death' && (e.year || e.place)).sort((a, b) => (+a.year || 0) - (+b.year || 0)) : []

  return (
    <div className="gs-veil" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="gs-sheet" role="dialog" aria-modal="true">
        {p ? <>
          <div className="gs-sh-head"><img src={avatarSrc(p)} alt="" /><div><h2>{fullName(p)}</h2>{kinLabel(p.id) && <span className="gs-muted">{kinLabel(p.id)}</span>}</div></div>
          {sheet.kind === 'person' && sheet.gap && <p className="gs-sh-q">{question(sheet.gap, who)}</p>}
          <h3>{T.known}</h3>
          {(p.birthDate || p.birthPlace || p.deathDate || evs.length || spouses.length || childrenOf(p.id).length || parentsOf(p.id).length) ? <dl className="gs-facts">
            {fact(T.born, [p.birthDate + (bdHidden ? ` (${T.dayKnown})` : ''), p.birthPlace].filter(Boolean).join(', '))}
            {fact(T.died, [p.deathDate, p.deathPlace].filter(Boolean).join(', '))}
            {fact(T.lived, evs.map(e => [e.year, e.place].filter(Boolean).join(' ')).join('; '))}
            {fact(T.parents, parentsOf(p.id).map(fullName).join(', '))}
            {fact(T.spouses, spouses.map(fullName).join(', '))}
            {fact(T.kids, childrenOf(p.id).map(c => c.first || fullName(c)).join(', '))}
          </dl> : <p className="gs-muted">{T.nothing}</p>}
          <h3>{T.form}</h3>
          {need && !need.bDate && !need.bPlace && (!need.dead || (!need.dDate && !need.dPlace)) && <p className="gs-note">{T.allKnown}</p>}
          {need && (need.bDate || need.bPlace) && <div className="gs-row">
            {need.bDate && <label>{p.birthDate && !fix ? T.bDay : T.bDate}<DateInput id="gBDate" onChange={set('birthDate')} />{p.birthDate && !fix && <small>{T.yearKnown(p.birthDate)}</small>}</label>}
            {need.bPlace && <label>{T.bPlace}<input id="gBPlace" value={f.birthPlace || ''} placeholder={fix ? p.birthPlace : ''} onChange={e => set('birthPlace')(e.target.value)} /></label>}
          </div>}
          <fieldset className="gs-where"><legend>{T.whereH}</legend>
            {rows.map((r, i) => <div className="gs-row three" key={i}>
              <label>{T.from}<input inputMode="numeric" maxLength={4} value={r.from} onChange={e => setRows(rs => rs.map((x, j) => j === i ? { ...x, from: e.target.value.replace(/\D/g, '') } : x))} /></label>
              <label>{T.to}<input inputMode="numeric" maxLength={4} value={r.to} onChange={e => setRows(rs => rs.map((x, j) => j === i ? { ...x, to: e.target.value.replace(/\D/g, '') } : x))} /></label>
              <label className="wide">{T.city}<input value={r.city} onChange={e => setRows(rs => rs.map((x, j) => j === i ? { ...x, city: e.target.value } : x))} /></label>
            </div>)}
            <button type="button" className="gs-link" onClick={() => setRows(rs => [...rs, { from: '', to: '', city: '' }])}>{T.moreRow}</button>
          </fieldset>
          {need && need.wed.length > 0 && <div className="gs-row">
            {need.wed.length > 1 && <label>{T.wedWith}<select value={f.wedWith || ''} onChange={e => set('wedWith')(e.target.value)}><option value="">—</option>{need.wed.map(s => <option key={s.id} value={s.id}>{fullName(s)}</option>)}</select></label>}
            <label>{T.wedH}{need.wed.length === 1 ? ` · ${need.wed[0].first}` : ''}<DateInput id="gWed" onChange={set('wedDate')} /></label>
          </div>}
          {need && !need.dead && <button type="button" className="gs-link" onClick={() => setShowDeath(!showDeath)}>{T.dToggle}</button>}
          {need && ((need.dead && (need.dDate || need.dPlace)) || showDeath) && <div className="gs-row">
            {(need.dDate || showDeath) && <label>{need.dead && !fix ? T.dDay : T.dDate}<DateInput id="gDDate" onChange={set('deathDate')} /></label>}
            {(need.dPlace || showDeath) && <label>{T.dPlace}<input id="gDPlace" value={f.deathPlace || ''} placeholder={fix ? p.deathPlace : ''} onChange={e => set('deathPlace')(e.target.value)} /></label>}
          </div>}
          <label className="gs-full">{T.story}<textarea rows={4} value={f.story || ''} placeholder={T.storyPh} onChange={e => set('story')(e.target.value)} /></label>
          {!fix && <button type="button" className="gs-link gs-fix" onClick={() => setFix(true)}>{T.fix}</button>}
        </> : sheet.kind === 'new' ? <>
          <h2>{T.newH}</h2>
          <div className="gs-row"><label>{T.first}<input value={f.first || ''} onChange={e => set('first')(e.target.value)} /></label><label>{T.last}<input value={f.last || ''} onChange={e => set('last')(e.target.value)} /></label></div>
          <div className="gs-row"><label>{T.gender}<select value={f.gender || ''} onChange={e => set('gender')(e.target.value)}><option value="">—</option><option value="f">{T.f}</option><option value="m">{T.m}</option></select></label>
            <label>{T.birth}<DateInput id="gNBirth" value={f.birth || ''} onChange={set('birth')} /></label></div>
          <div className="gs-row"><label>{T.kind}<select value={f.kind || 'child'} onChange={e => set('kind')(e.target.value)}>{(Object.keys(T.kinds) as (keyof T_['kinds'])[]).map(k => <option key={k} value={k}>{T.kinds[k]}</option>)}</select></label>
            <label>{T.of}<select value={f.of || who || ''} onChange={e => set('of')(e.target.value)}><option value="">—</option>{S.people.slice().sort((a, b) => fullName(a).localeCompare(fullName(b))).map(x => <option key={x.id} value={x.id}>{fullName(x)}</option>)}</select></label></div>
          <label className="gs-full">{T.note}<textarea rows={3} value={f.note || ''} onChange={e => set('note')(e.target.value)} /></label>
        </> : <>
          <h2>{T.noteH(O)}</h2>
          <label className="gs-full"><textarea rows={6} value={f.note || ''} placeholder={T.notePh} onChange={e => set('note')(e.target.value)} /></label>
        </>}
        {!(who && byId(who)) && <label className="gs-full gs-name">{T.name}<input value={name} placeholder={T.namePh} onChange={e => { setName(e.target.value); setErr('') }} /></label>}
        {err && <p className="gs-err" role="alert">{err}</p>}
        <div className="gs-acts"><button type="button" className="btn ghost" onClick={onClose}>{T.cancel}</button><button type="button" className="btn go" disabled={busy} onClick={send}>{T.send(O)}</button></div>
      </div>
    </div>
  )
}
