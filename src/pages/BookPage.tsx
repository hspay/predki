// «Книга семьи»: the life of each relative told by the app itself — where they lived, what happened around them, who was near.
// Ported from the «Жизнь» view of the «Машина времени семьи» concept; built on the same life/gap logic as «Заполнить пробелы».
import { useEffect, useMemo, useRef, useState } from 'react'
import { S, LANG, go, byId, fullName, parentsOf, childrenOf, spousesOf, siblingsOf, yearOf, openPerson, type Person, type LifeEvent } from '../lib/core'
import { rootPerson } from '../lib/treeLayout'
import { life, kinFrom, familyGaps, question, witnessLabel } from '../lib/gaps'
import Avatar from '../components/Avatar'

const NOW = new Date().getFullYear()
const ru = () => LANG !== 'en'
const L = (r: string, e: string) => (ru() ? r : e)
const plural = (n: number, r: [string, string, string], e: [string, string]) => { if (!ru()) return n === 1 ? e[0] : e[1]; const a = n % 10, b = n % 100; return r[(a === 1 && b !== 11) ? 0 : (a >= 2 && a <= 4 && (b < 12 || b > 14)) ? 1 : 2] }
const yrs = (n: number) => `${n} ${plural(n, ['год', 'года', 'лет'], ['year', 'years'])}`
const fv = (p: Person, m: string, f: string) => (p.gender === 'f' ? f : m)
const first = (p: Person) => p.first || fullName(p)
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
const dateText = (s: string) => { const m = String(s || '').match(/^(\d{2})\.(\d{2})\.(\d{4})$/); if (m) return ru() ? `${+m[1]} ${MONTHS[+m[2] - 1]} ${m[3]}` : new Date(+m[3], +m[2] - 1, +m[1]).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); const y = yearOf(s); return y ? L(`в ${y} году`, `in ${y}`) : '' }
const approx = (e: LifeEvent) => /≈|примерн|уточнить|условн|под вопросом|approx/i.test(e.note || '')
const clean = (s: string) => String(s || '').replace(/;?\s*≈\s*\d{4}/g, '').replace(/^≈\s*\d{4};?\s*/, '').trim()
const km = (a: LifeEvent, b: LifeEvent) => { const R0 = 6371, r = Math.PI / 180, dLa = (+b.lat! - +a.lat!) * r, dLo = (+b.lon! - +a.lon!) * r; const h = Math.sin(dLa / 2) ** 2 + Math.cos(+a.lat! * r) * Math.cos(+b.lat! * r) * Math.sin(dLo / 2) ** 2; return 2 * R0 * Math.asin(Math.sqrt(h)) }

/** what was happening in the country: shown inside a chapter of someone's life (place-bound ones only where they were) */
const ERAS: { a: number; b: number; t: [string, string]; place?: string }[] = [
  { a: 1903, b: 1903, t: ['По КВЖД пошли поезда', 'Trains start running on the Chinese Eastern Railway'], place: 'Харбин' },
  { a: 1914, b: 1918, t: ['Первая мировая война', 'World War I'] },
  { a: 1917, b: 1917, t: ['Революция', 'The Revolution'] },
  { a: 1921, b: 1922, t: ['Голод в Поволжье и на Украине', 'Famine in the Volga region and Ukraine'] },
  { a: 1937, b: 1938, t: ['Большой террор', 'The Great Terror'] },
  { a: 1941, b: 1945, t: ['Великая Отечественная война', 'World War II'] },
  { a: 1961, b: 1961, t: ['Первый полёт человека в космос', 'First human flight into space'] },
  { a: 1966, b: 1966, t: ['Землетрясение в Ташкенте', 'The Tashkent earthquake'], place: 'Ташкент' },
  { a: 1986, b: 1986, t: ['Авария на Чернобыльской АЭС', 'The Chernobyl disaster'] },
  { a: 1991, b: 1991, t: ['Распад СССР', 'The USSR breaks up'] },
]

type Item = { y: number; ap?: boolean; pl?: string; geo?: boolean; txt: string; fam?: boolean }
const geoOf = (p: Person) => (p.events || []).filter(e => e.lat != null && e.year !== '' && e.year != null).sort((a, b) => +a.year - +b.year)
const alive = (q: Person, y: number) => { const l = life(q.id); return l.by != null && l.by <= y && l.end != null && y <= l.end }
const where = (p: Person, y: number) => { let w: LifeEvent | null = null; geoOf(p).forEach(e => { if (+e.year <= y) w = e }); return w as LifeEvent | null }

/** everything that happened in this life, with the family woven in: children and grandchildren born, parents gone */
function lifeItems(p: Person): Item[] {
  const it: Item[] = []
  ;(p.events || []).forEach(e => {
    const y = e.year === '' ? null : +e.year; if (y == null) return
    const note = clean(e.note), n = note ? ' ' + note + '.' : '', at = e.place ? ' — ' + e.place : '', geo = e.lat != null
    if (e.type === 'birth') it.push({ y, pl: e.place, geo, txt: `${L(`Родил${fv(p, 'ся', 'ась')}`, 'Born')} ${dateText(p.birthDate) || y}${at}.${n}` })
    else if (e.type === 'move') it.push({ y, ap: approx(e), pl: e.place, geo, txt: `${L('Переезд', 'Moved')}: ${e.place}.${n}` })
    else if (e.type === 'work') it.push({ y, ap: approx(e), pl: e.place, geo, txt: `${L('Работа', 'Work')}${at}.${n}` })
    else if (e.type === 'study') it.push({ y, ap: approx(e), pl: e.place, geo, txt: `${L('Учёба', 'Study')}${at}.${n}` })
    else if (e.type === 'service') it.push({ y, ap: approx(e), pl: e.place, geo, txt: `${L('Служба', 'Military service')}${at}.${n}` })
    else if (e.type === 'marriage') { const sp = (e.with && byId(e.with)) || spousesOf(p.id)[0]; it.push({ y, txt: `${L('Свадьба', 'Wedding')}${sp ? ` — ${L(fv(p, 'жена', 'муж'), fv(p, 'wife', 'husband'))} ${fullName(sp)}` : ''}.${n}` }) }
    else if (e.type === 'death') it.push({ y, txt: `${L(`Ушл${fv(p, 'ёл', 'а')} из жизни`, 'Passed away')}${at}.` })
    else it.push({ y, ap: approx(e), pl: e.place, geo, txt: `${note || e.place}.` })
  })
  const by = life(p.id).by
  if (!(p.events || []).some(e => e.type === 'birth') && by) it.push({ y: by, txt: `${L(`Родил${fv(p, 'ся', 'ась')}`, 'Born')} ${dateText(p.birthDate) || by}${p.birthPlace ? ' — ' + p.birthPlace : ''}.` })
  childrenOf(p.id).forEach(c => {
    const y = life(c.id).by; if (y) it.push({ y, fam: true, txt: L(`Родил${fv(c, 'ся', 'ась')} ${fv(c, 'сын', 'дочь')} ${first(c)}.`, `${fv(c, 'Son', 'Daughter')} ${first(c)} is born.`) })
    childrenOf(c.id).forEach(g => { const z = life(g.id).by; if (z) it.push({ y: z, fam: true, txt: L(`Родил${fv(g, 'ся', 'ась')} ${fv(g, 'внук', 'внучка')} ${first(g)}.`, `${fv(g, 'Grandson', 'Granddaughter')} ${first(g)} is born.`) }) })
  })
  parentsOf(p.id).forEach(q => { const dy = life(q.id).dy; if (dy) it.push({ y: dy, fam: true, txt: L(`Не стало ${fv(q, 'отца', 'мамы')} — ${first(q)}.`, `${fv(q, 'Father', 'Mother')} ${first(q)} dies.`) }) })
  return it.sort((a, b) => a.y - b.y)
}
/** the life split by places: a new chapter begins with each new city */
function chaptersOf(p: Person) {
  const out: { pl: string; from: number; to: number | null; items: Item[] }[] = []; let ch: typeof out[number] | null = null
  lifeItems(p).forEach(x => {
    if (x.geo && x.pl && (!ch || ch.pl !== x.pl)) { if (ch) ch.to = x.y; ch = { pl: x.pl, from: x.y, to: null, items: [] }; out.push(ch) }
    if (!ch) { ch = { pl: x.pl || L('Место неизвестно', 'Place unknown'), from: x.y, to: null, items: [] }; out.push(ch) }
    ch.items.push(x)
  })
  const l = life(p.id); if (ch) (ch as typeof out[number]).to = l.died ? l.last : null
  return out
}
/** who was near at that moment: parents, grandparents, a spouse after the wedding, brothers and sisters, children — with their age */
function near(p: Person, y: number) {
  const ps = parentsOf(p.id), ids = [...ps, ...ps.flatMap(x => parentsOf(x.id)), ...spousesOf(p.id), ...siblingsOf(p.id), ...childrenOf(p.id)]
  const wed = (q: Person) => { const r = S.rels.find(r => r.type === 'spouse' && [r.a, r.b].includes(p.id) && [r.a, r.b].includes(q.id)); return +yearOf(r?.from) || +((p.events || []).find(e => e.type === 'marriage')?.year || 0) || (life(p.id).by || 0) + 20 }
  const K = kinFrom(p.id).label, sp = new Set(spousesOf(p.id).map(x => x.id))
  return [...new Map(ids.map(q => [q.id, q])).values()].filter(q => alive(q, y) && (!sp.has(q.id) || y >= wed(q)))
    .map(q => ({ q, t: K[q.id] || L('родственник', 'relative'), a: y - life(q.id).by! })).slice(0, 6)
}
/** who has a life worth a chapter: events, a story, a birth year */
const richness = (p: Person) => (p.events || []).length + ((p.bio || '').trim() ? 3 : 0) + (life(p.id).by ? 1 : 0)

export default function BookPage() {
  const people = useMemo(() => S.people.filter(p => richness(p) >= 2).sort((a, b) => richness(b) - richness(a)), [S.people.length, S.people])
  const me = rootPerson()
  const [cur, setCur] = useState<string>(() => (people.find(p => p.id !== me?.id && (p.bio || '').length > 80) || people[0] || me)?.id || '')
  const p = byId(cur) || people[0]
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => { box.current?.closest('.scroll')?.scrollTo({ top: 0, behavior: 'smooth' }) }, [cur])
  if (!p) return <section className="page active" data-page="book" id="bookPage"><div className="topbar"><h2><span>{L('Книга семьи', 'Family book')}</span></h2></div>
    <div className="scroll bk-scroll"><p className="bk-empty">{L('Добавьте людей с датами и событиями — и у каждого появится своя глава.', 'Add people with dates and events, and each of them gets a chapter.')}</p></div></section>

  const l = life(p.id), geo = geoOf(p)
  const stops: LifeEvent[] = []; geo.forEach(e => { if (!stops.length || stops[stops.length - 1].place !== e.place) stops.push(e) })
  const moves = Math.max(0, stops.length - 1), cities = new Set(geo.map(e => e.place)).size
  let dist = 0; stops.forEach((e, i) => { if (i) dist += km(stops[i - 1], e) })
  const sub = [p.patronymic, l.by ? (l.dy ? `${l.by}–${l.dy}` : L(`${fv(p, 'родился', 'родилась')} в ${l.by}`, `born ${l.by}`)) : '', p.job].filter(Boolean).join(' · ')
  const ch = chaptersOf(p)
  const gaps = familyGaps().filter(g => g.id === p.id)
  const step = 132, rw = Math.max(1, stops.length) * step

  return (
    <section className="page active" data-page="book" id="bookPage">
      <div className="topbar">
        <h2><span>{L('Книга семьи', 'Family book')}</span><span className="sub">{people.length} {plural(people.length, ['глава', 'главы', 'глав'], ['chapter', 'chapters'])} · {L('жизнь каждого по годам', 'each life year by year')}</span></h2>
        <button type="button" className="btn sm ghost bk-back" onClick={() => go('keeper')}><svg viewBox="0 0 24 24"><path d="m15 6-6 6 6 6" /></svg>{L('Хранитель', 'Keeper')}</button>
      </div>
      <div className="scroll bk-scroll"><div className="bk-in" ref={box}>
        <div className="bk-picker" role="tablist" aria-label={L('Чья глава', 'Whose chapter')}>
          {people.map(q => <button key={q.id} type="button" role="tab" aria-selected={q.id === p.id} className={'bk-chip' + (q.id === p.id ? ' on' : '')} onClick={() => setCur(q.id)}>
            <Avatar p={q} size={26} /><span>{fullName(q)}</span>{life(q.id).by ? <small>{life(q.id).by}</small> : null}</button>)}
        </div>

        <div className="bk-head" key={p.id}>
          <button type="button" className="bk-av" onClick={() => openPerson(p.id)} aria-label={L('Открыть карточку', 'Open the card')}><Avatar p={p} size={112} /></button>
          <div className="bk-who">
            <h1>{fullName(p)}</h1>
            {sub && <div className="bk-sub">{sub}</div>}
            <div className="bk-stats">
              <div><b>{l.facts.length}</b><span>{plural(l.facts.length, ['год с записями', 'года с записями', 'лет с записями'], ['year on record', 'years on record'])}</span></div>
              <div><b>{moves}</b><span>{plural(moves, ['переезд', 'переезда', 'переездов'], ['move', 'moves'])}</span></div>
              <div><b>{cities}</b><span>{plural(cities, ['город', 'города', 'городов'], ['city', 'cities'])}</span></div>
              <div><b>{Math.round(dist).toLocaleString(ru() ? 'ru-RU' : 'en-US')}</b><span>{L('км в пути', 'km travelled')}</span></div>
            </div>
          </div>
        </div>

        {stops.length > 0 && <div className="bk-route"><svg viewBox={`0 0 ${rw} 74`} width={rw} height={74} aria-label={L('Маршрут жизни', 'Life route')}>
          <path d={`M${step / 2} 24H${rw - step / 2}`} className="ln" />
          {stops.map((e, i) => <g key={i}><circle cx={i * step + step / 2} cy={24} r={8} className="st" /><text x={i * step + step / 2} y={53} textAnchor="middle">{e.place}</text><text className="y" x={i * step + step / 2} y={68} textAnchor="middle">{e.year}</text></g>)}
        </svg></div>}

        <div className="bk-life">
          <div className="bk-story">
            <h3>{L('Как рассказывают в семье', 'As the family tells it')}</h3>
            {(p.bio || '').trim() ? p.bio.split(/\n+/).filter(Boolean).map((t, i) => <p key={i}>{t}</p>)
              : <p className="bk-empty">{L('Рассказа пока нет. Справа — то, что уже известно; ниже — вопросы, с которых можно начать.', 'No story yet. On the right is what is already known; below are questions to start with.')}</p>}
            {gaps.length > 0 && <>
              <h3 className="bk-h2">{L('Белые пятна', 'Blank spots')}</h3>
              {gaps.map((g, i) => <div className="bk-gap" key={i}>
                <p>{g.a}–{g.kind === 'tail' ? L('сегодня', 'today') : g.b}: {question(g, null)}</p>
                {g.w.length > 0 && <div className="bk-witn"><span className="lbl">{L('Кто может рассказать:', 'Who may remember:')}</span>
                  {g.w.map(w => { const q = byId(w)!; return <button key={w} type="button" className="bk-chip sm" onClick={() => go('gaps')}><Avatar p={q} size={22} /><span>{fullName(q)}</span><small>{witnessLabel(g.id, w)}</small></button> })}</div>}
              </div>)}
            </>}
          </div>
          <div className="bk-chaps">
            <h3>{L('Линия жизни', 'Life line')}</h3>
            {ch.length ? ch.map((c, i) => {
              const span = c.to && c.to !== c.from ? `${c.from}–${c.to}` : c.to === null && !l.died ? L(`с ${c.from}`, `since ${c.from}`) : `${c.from}`
              const until = c.to && c.to > c.from ? c.to : i === ch.length - 1 ? NOW + 1 : c.from + 1
              const nb = near(p, c.from)
              const eras = ERAS.filter(e => e.a >= c.from && e.a < until && e.a >= (l.by ?? 0)).filter(e => !e.place || where(p, e.a)?.place === e.place)
              return <div className="bk-ch" key={i}>
                <div className="yrs">{span}</div><div className="pl">{c.pl}</div>
                <ul>{c.items.map((x, k) => <li key={k} className={x.fam ? 'fam' : ''}><span className="y">{x.ap ? '≈' : ''}{x.y}</span><span>{x.txt}</span></li>)}</ul>
                {nb.length > 0 && <div className="bk-near">{nb.map(n => <span key={n.q.id}>{n.t} <b>{first(n.q)}</b> · {n.a}</span>)}</div>}
                {eras.map(e => { const w = where(p, e.a), age = l.by ? e.a - l.by : null, t = ru() ? e.t[0] : e.t[1]
                  return <div className="bk-era" key={e.a}><b>{e.a === e.b ? e.a : `${e.a}–${e.b}`} · {t}.</b> {w && age != null ? (+w.year >= e.a - 12
                    ? L(`${first(p)} в это время — ${w.place}, ${fv(p, 'ему', 'ей')} ${yrs(age)}.`, `${first(p)} is in ${w.place} at the time, aged ${age}.`)
                    : L(`${fv(p, 'Ему', 'Ей')} ${yrs(age)}; последняя запись до этого — ${w.place}, ${w.year}.`, `Aged ${age}; the last record before that: ${w.place}, ${w.year}.`)) : ''}</div> })}
              </div>
            }) : <p className="bk-empty">{L('Пока нет событий с годами.', 'No dated events yet.')}</p>}
          </div>
        </div>
      </div></div>
    </section>
  )
}
