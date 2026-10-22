import { useEffect, useState } from 'react'
import { S, commit, LANG, t, byId, fullName, avatarSmall, openPerson, editPerson, editEvent, toast, type Person } from '../lib/core'
import { familyGaps, life, kinFrom, GAP_MIN, question, question2, message, factLabel, witnessLabel, missing, type Gap } from '../lib/gaps'
import { rootPerson } from '../lib/treeLayout'
import FamilyAnswers, { FamilyLinks, AskLink, LinkIcon } from '../components/FamilyAnswers'

// «Заполнить пробелы»: years of family history with no record, who may remember them, and a question worded for that person.
const TX = {
  ru: {
    askFill: 'Попросить заполнить', invite: 'Попросить родных заполнить древо', anyone: 'любому из родных',
    hello: 'Привет! Собираю наше семейное древо. Посмотри, пожалуйста, и допиши, что помнишь: даты, места, истории.', helloGap: 'Привет! Помоги восстановить историю семьи.',
    lede: (y: number, n: number) => <>{pl(y, ['год', 'года', 'лет'])} из жизни семьи — <b>без единой записи</b>. {n ? <>На {n} {pl(n, ['пробел', 'пробела', 'пробелов'])} есть родственник, который может помнить: эти вопросы можно задать уже сегодня. Начните со старших.</> : <>Живых свидетелей для них нет: помогут документы и архивы.</>}</>,
    first: 'Выбрали пробелы, о которых могут знать родственники', you: 'вы', lgKnown: 'годы с записями', lgGap: 'пробел, о котором спрашиваем',
    who: 'Кто может помнить:', nobody: 'Из живых родственников помнить некому — ищите в документах и архивах.',
    last: 'Последняя запись:', next: 'Следующая:', silence: (a: number, place: string, n: number) => `Последняя запись — ${a}${place ? ', ' + place : ''}. После неё ${n} ${pl(n, ['год', 'года', 'лет'])} тишины.`,
    add: 'Добавить, что узнали', more: (n: number) => `Ещё ${n} ${pl(n, ['вопрос', 'вопроса', 'вопросов'])}`,
    missH: 'Чего ещё не хватает', missS: 'Это не пробелы во времени, а пустые поля. Их тоже проще всего заполнить разговором.',
    noYear: 'Без года рождения', noYearD: 'Без года человек не попадает в пробелы и на линию времени. Хватит и примерного.',
    noDay: 'Без дня и месяца рождения', noDayD: 'Чтобы день рождения появился в календаре семьи, нужны день и месяц.',
    approx: 'Даты «примерно»', approxD: 'Записи с пометками «≈», «уточнить», «под вопросом». Проверить их можно по документам: метрики, трудовые книжки, письма.',
    noPlace: 'Места без точки на карте', noPlaceD: 'Этих мест нет в справочнике городов. Найдите их на старой карте и введите координаты в событии.',
    people: (n: number) => `${n} ${pl(n, ['человек', 'человека', 'человек'])}`, records: (n: number) => `${n} ${pl(n, ['запись', 'записи', 'записей'])}`,
    emptyH: 'Пробелов не нашлось', emptyP: 'Чтобы найти годы без записей, нужны годы рождения и события в анкетах. Добавьте их — и здесь появятся вопросы для родственников.',
    to: 'Кому:', toS: 'Текст уже подстроен под родство: кто кому кем приходится.', text: 'Текст вопроса',
    close: 'Закрыть', copy: 'Скопировать текст', copied: 'Текст скопирован. Отправьте его в мессенджере', copyFail: 'Не получилось скопировать. Выделите текст и скопируйте вручную', send: 'Отправить',
  },
  en: {
    askFill: 'Ask to fill in', invite: 'Ask relatives to fill in the tree', anyone: 'any relative',
    hello: 'Hi! I am putting together our family tree. Please have a look and add what you remember: dates, places, stories.', helloGap: 'Hi! Help me piece together our family history.',
    lede: (y: number, n: number) => <>{y === 1 ? 'year' : 'years'} of family life with <b>no record at all</b>. {n ? <>For {n} {n === 1 ? 'gap' : 'gaps'} there is a relative who may remember: you can ask today. Start with the eldest.</> : <>No living relative remembers them: documents and archives will help.</>}</>,
    first: 'Gaps your relatives may know about', you: 'you', lgKnown: 'years with records', lgGap: 'the gap we ask about',
    who: 'Who may remember:', nobody: 'No living relative remembers this — look in documents and archives.',
    last: 'Last record:', next: 'Next:', silence: (a: number, place: string, n: number) => `Last record — ${a}${place ? ', ' + place : ''}. ${n} ${n === 1 ? 'year' : 'years'} of silence since.`,
    add: 'Add what you learned', more: (n: number) => `${n} more ${n === 1 ? 'question' : 'questions'}`,
    missH: 'What else is missing', missS: 'Not gaps in time but empty fields. A conversation is the easiest way to fill them too.',
    noYear: 'No birth year', noYearD: 'Without a year a person is left out of gaps and timelines. An approximate one will do.',
    noDay: 'No birth day and month', noDayD: 'A birthday appears in the family calendar once it has a day and a month.',
    approx: 'Approximate dates', approxD: 'Records marked “≈”, “to check”, “unsure”. Documents can confirm them: certificates, work records, letters.',
    noPlace: 'Places not on the map', noPlaceD: 'These places are not in the city list. Find them on an old map and enter coordinates in the event.',
    people: (n: number) => `${n} ${n === 1 ? 'person' : 'people'}`, records: (n: number) => `${n} ${n === 1 ? 'record' : 'records'}`,
    emptyH: 'No gaps found', emptyP: 'Finding years with no records needs birth years and events in profiles. Add them and questions for your relatives will appear here.',
    to: 'To:', toS: 'The text already fits the relationship: who is who to whom.', text: 'Question text',
    close: 'Close', copy: 'Copy text', copied: 'Copied. Send it in a messenger', copyFail: 'Could not copy. Select the text and copy it yourself', send: 'Send',
  },
}
function pl(n: number, f: string[]) { const a = n % 10, b = n % 100; return f[(a === 1 && b !== 11) ? 0 : (a >= 2 && a <= 4 && (b < 12 || b > 14)) ? 1 : 2] }
const SearchIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.4-4.4" /></svg>

/** the person's life as a thin line: green where records come no more than GAP_MIN years apart, this card's gap hatched, other empty years left bare */
function Mini({ g }: { g: Gap }) {
  const l = life(g.id), a0 = l.by!, a1 = Math.max(l.end ?? g.b, g.b), W = 400, sc = (y: number) => 6 + (y - a0) / Math.max(1, a1 - a0) * (W - 12)
  const known: [number, number][] = []; let s = a0
  l.facts.forEach((f, k) => { const nx = l.facts[k + 1]; if (nx != null && nx - f > GAP_MIN) { known.push([s, f]); s = nx } })
  known.push([s, l.last ?? a0])
  const pc = (y: number) => (sc(y) / W * 100).toFixed(2) + '%'
  return (<div className="gp-life">
    <svg className="gp-mini" viewBox={`0 0 ${W} 26`} preserveAspectRatio="none" aria-hidden="true">
      <path d={`M${sc(a0)} 13H${sc(a1)}`} className="ln" vectorEffect="non-scaling-stroke" />
      {known.map(([x, y]) => <rect key={x} x={sc(x)} y="9" width={Math.max(4, sc(y) - sc(x))} height="8" rx="4" className="known" />)}
      <rect x={sc(g.a)} y="6" width={Math.max(2, sc(g.b) - sc(g.a))} height="14" rx="4" className="gap" vectorEffect="non-scaling-stroke" />
    </svg>
    {/* years under the line: birth, the gap, the end */}
    <div className="gp-life-y" aria-hidden="true"><span style={{ left: pc(a0) }}>{a0}</span><span className="g" style={{ left: `calc((${pc(g.a)} + ${pc(g.b)}) / 2)` }}>{g.a}–{g.b}</span><span className="e" style={{ left: pc(a1) }}>{a1}</span></div>
  </div>)
}

export default function GapsPage() {
  const T = TX[LANG === 'en' ? 'en' : 'ru']
  const [all, setAll] = useState(false)
  // the message window: g — the gap (none for a general invitation), w — whom it is for (none: any relative), auto — add the link at once
  const [ask, setAsk] = useState<{ g: Gap | null; w: string | null; text: string; auto?: boolean } | null>(null)
  const generic = (g: Gap | null) => g ? [T.helloGap, question(g, null), question2(g, null)].filter(Boolean).join(' ') : T.hello
  const askFill = (g: Gap | null) => { const w = g && g.w[0] ? g.w[0] : null; setAsk({ g, w, text: w && g ? message(g, w) : generic(g), auto: true }) }
  const gaps = familyGaps()
  const me = rootPerson(), kin = me ? kinFrom(me.id) : null // who each person is to you: «прапрадедушка»
  const miss = missing()
  const midYears = gaps.filter(g => g.kind === 'mid').reduce((s, g) => s + g.len, 0)
  const answerable = gaps.filter(g => g.w.length).length
  const shown = all ? gaps : gaps.slice(0, 6)
  const firstOf = new Map<string, Gap>(); gaps.forEach(g => { if (!firstOf.has(g.id)) firstOf.set(g.id, g) })
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setAsk(null) }
    addEventListener('keydown', key); return () => removeEventListener('keydown', key)
  }, [])

  // copying or sending the question counts as asking relatives (the «Первый вопрос» sticker), the same as a «Попросить заполнить» link
  const asked = () => { S.settings.asked = (S.settings.asked || 0) + 1; commit() }
  const copy = async () => { if (!ask) return; asked(); try { await navigator.clipboard.writeText(ask.text); toast(T.copied) } catch { toast(T.copyFail) } }
  const share = async () => { if (!ask) return; try { await navigator.share({ text: ask.text }); asked() } catch { /* closed by the person */ } }
  const ctx = (g: Gap) => {
    const p = byId(g.id)!
    if (g.kind === 'tail') { const e = (p.events || []).filter(e => e.year && +e.year <= g.a && e.place).sort((a, b) => +a.year - +b.year).pop(); return T.silence(g.a, e ? e.place : '', g.len) }
    return `${T.last} ${factLabel(g.id, g.a)}. ${T.next} ${factLabel(g.id, g.b)}.`
  }
  const Chip = ({ p, small, onClick }: { p: Person; small?: string; onClick: () => void }) => (
    <button type="button" className="gp-chip" onClick={onClick}><img src={avatarSmall(p)} alt="" /><span>{fullName(p)}</span>{small && <small>{small}</small>}</button>
  )

  return (
    <section className="page active" data-page="gaps">
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true"><defs>
        <pattern id="gpHatch" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)"><path d="M0 0V5" className="gp-hatch" /></pattern>
      </defs></svg>
      <div className="topbar"><h2><span>{t('nav.gaps')}</span></h2></div>
      <div className="scroll gp">
        <FamilyAnswers />
        {gaps.length ? <>
          <div className="gp-hero"><b className="gp-big">{midYears}</b><div className="gp-hero-r"><p>{T.lede(midYears, answerable)}</p><button type="button" className="btn wax" onClick={() => askFill(null)}><LinkIcon />{T.invite}</button></div></div>
          <div className="gp-h-row"><h3 className="gp-h gp-h-solo">{T.first}</h3>
            <span className="gp-legend" aria-hidden="true"><span><i className="k" />{T.lgKnown}</span><span><i className="g" />{T.lgGap}</span></span></div>
          <div className="gp-cards">
            {shown.map((g, i) => {
              const p = byId(g.id)!, q2 = firstOf.get(g.id) === g ? question2(g, null) : ''
              return (
                <article className="gp-card" key={g.id + g.a}>
                  <div className="gp-hd">
                    <button type="button" className="gp-who" onClick={() => openPerson(g.id)}><img src={avatarSmall(p)} alt="" />{fullName(p)}</button>
                    <span className="gp-kin">{me && g.id === me.id ? T.you : kin ? kin.label[g.id] || '' : ''}</span>
                  </div>
                  <Mini g={g} />
                  <div className="gp-ctx">{ctx(g)}</div>
                  <p className="gp-q">{question(g, null)}</p>
                  {q2 && <p className="gp-q2">{q2}</p>}
                  <div className="gp-witn">
                    {g.w.length ? <><span className="lbl">{T.who}</span>{g.w.map(w => { const wp = byId(w)!, lab = witnessLabel(g.id, w), by = life(w).by
                      return <Chip key={w} p={wp} small={[lab, by].filter(Boolean).join(' · ')} onClick={() => setAsk({ g, w, text: message(g, w) })} /> })}</>
                      : <span className="lbl">{T.nobody}</span>}
                  </div>
                  <div className="gp-acts">
                    <button type="button" className="btn sm gp-askfill" onClick={() => askFill(g)}><LinkIcon />{T.askFill}</button>
                    <button type="button" className="btn sm ghost" onClick={() => editEvent(g.id, null)}>+ {T.add}</button>
                  </div>
                </article>
              )
            })}
          </div>
          {!all && gaps.length > 6 && <button type="button" className="btn gp-more" onClick={() => setAll(true)}>{T.more(gaps.length - 6)}</button>}
        </> : <div className="gp-empty"><SearchIcon /><h3>{T.emptyH}</h3><p>{T.emptyP}</p></div>}

        {(miss.noYear.length + miss.noDay.length + miss.approx.length + miss.noPlace.length) > 0 && <>
          <h3 className="gp-h">{T.missH}</h3>
          <p className="gp-s">{T.missS}</p>
          <div className="gp-cards">
            {miss.noYear.length > 0 && <article className="gp-card"><div className="gp-hd"><b>{T.noYear}</b><span className="gp-span">{T.people(miss.noYear.length)}</span></div><p className="gp-d">{T.noYearD}</p>
              <div className="gp-names">{miss.noYear.map(p => <Chip key={p.id} p={p} onClick={() => editPerson(p.id)} />)}</div></article>}
            {miss.noDay.length > 0 && <article className="gp-card"><div className="gp-hd"><b>{T.noDay}</b><span className="gp-span">{T.people(miss.noDay.length)}</span></div><p className="gp-d">{T.noDayD}</p>
              <div className="gp-names">{miss.noDay.map(p => <Chip key={p.id} p={p} small={String(life(p.id).by)} onClick={() => editPerson(p.id)} />)}</div></article>}
            {miss.approx.length > 0 && <article className="gp-card"><div className="gp-hd"><b>{T.approx}</b><span className="gp-span">{T.records(miss.approx.length)}</span></div><p className="gp-d">{T.approxD}</p>
              <div className="gp-names">{miss.approx.slice(0, 10).map(({ p, e }) => <Chip key={e.id} p={p} small={[e.year, e.place].filter(Boolean).join(' · ')} onClick={() => editEvent(p.id, e.id)} />)}</div></article>}
            {miss.noPlace.length > 0 && <article className="gp-card"><div className="gp-hd"><b>{T.noPlace}</b><span className="gp-span">{T.records(miss.noPlace.length)}</span></div><p className="gp-d">{T.noPlaceD}</p>
              <div className="gp-names">{miss.noPlace.map(({ p, e }) => <Chip key={e.id} p={p} small={e.place} onClick={() => editEvent(p.id, e.id)} />)}</div></article>}
          </div>
        </>}
        <FamilyLinks />
      </div>

      {ask && <div className="gp-veil" onClick={e => { if (e.target === e.currentTarget) setAsk(null) }}>
        <div className="gp-sheet" role="dialog" aria-modal="true" aria-label={T.to + ' ' + (ask.w ? fullName(byId(ask.w)!) : T.anyone)}>
          <h3>{T.to} {ask.w ? fullName(byId(ask.w)!) : T.anyone}</h3>
          <p className="gp-sub">{T.toS}</p>
          <div className="gp-bubble"><textarea id="gpAskText" aria-label={T.text} value={ask.text} onChange={e => setAsk({ ...ask, text: e.target.value })} /></div>
          <AskLink key={(ask.g ? ask.g.id + ask.g.a : 'all') + (ask.w || '')} g={ask.g} w={ask.w} auto={ask.auto} text={ask.text} onText={text => setAsk(a => a && { ...a, text })} />
          <div className="gp-sheet-acts">
            <button type="button" className="btn ghost" onClick={() => setAsk(null)}>{T.close}</button>
            {typeof navigator.share === 'function' && <button type="button" className="btn" onClick={share}>{T.send}</button>}
            <button type="button" className="btn primary" onClick={copy}>{T.copy}</button>
          </div>
        </div>
      </div>}

    </section>
  )
}
