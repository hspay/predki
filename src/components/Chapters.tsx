// The path through Predki on screen: the chapter ring in the menu, «Следующая остановка» on the Tree,
// the board when a chapter closes, and the lock sheet of a part that is not open yet.
import { useEffect, useState } from 'react'
import { S, ui, bump, LANG, go } from '../lib/core'
import { Progress } from '../lib/progress'
import { CHAPTERS, FEATURE, TASK, SKIP, tx, counted, current, finished, share, nextStep, openChapter, setSkip, isSkipped, isOpen, openedBy, plural, collectionIds, stepAction, pending, claim, type Feature } from '../lib/chapters'
import { stickerSrc } from '../lib/stickers'
import { SplitFlap } from './Landing'
import { PassportIcon } from './ShareSheet'

const ru = () => LANG !== 'en'
const L = (r: string, e: string) => (ru() ? r : e)

/* ---------- icons of the parts a chapter opens ---------- */
export function FeatureIcon({ f }: { f: Feature }) {
  if (f === 'passport') return <PassportIcon />
  const d: Record<string, JSX.Element> = {
    calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /><path d="M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01" strokeWidth="2.4" strokeLinecap="round" /></>,
    map: <><path d="M3 6.5 9 4l6 2.5 6-2.5v13.5L15 20l-6-2.5-6 2.5z" /><path d="M9 4v13.5M15 6.5V20" /></>,
    book: <path d="M12 6.5C10 5 7 4.5 4 5v14c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5zM12 6.5v14" />,
    bookPdf: <><path d="M12 6.5C10 5 7 4.5 4 5v14c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5zM12 6.5v14" /><path d="M15 11.5l1.5 1.5 3-3" /></>,
    compare: <path d="M5 20V12M10 20V6M15 20v-9M20 20V9" />,
  }
  return <svg viewBox="0 0 24 24">{d[f]}</svg>
}
export const LockIcon = () => <svg viewBox="0 0 24 24" className="lk"><rect x="5" y="11" width="14" height="9.5" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>

/** a small ring with the chapter number inside */
function Ring({ v, n, size = 40 }: { v: number; n: number | string; size?: number }) {
  const r = 18.5, c = 2 * Math.PI * r
  return <svg className="ch-ring" viewBox="0 0 44 44" width={size} height={size} aria-hidden="true">
    <circle className="track" cx="22" cy="22" r={r} />
    <circle className="bar" cx="22" cy="22" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - v)} transform="rotate(-90 22 22)" />
    <text x="22" y="23" textAnchor="middle" dominantBaseline="middle">{n}</text>
  </svg>
}

/* ---------- the menu: the chapter instead of «Вашему древу: N лет» ---------- */
export function ChapterRing() {
  Progress.evaluate()
  const i = current(), c = CHAPTERS[i]
  // a chapter is done: the ring is full and glows until it is tapped — the tap opens the next chapter with the board
  if (pending()) return <button className="growth ch-ready" id="growth" type="button" onClick={claim} aria-label={L('Глава пройдена — открыть следующую', 'Chapter done — open the next one')}>
    <Ring v={1} n={i + 1} />
    <div><b>{L(`Глава ${i + 1} пройдена`, `Chapter ${i + 1} done`)}</b><small>{i + 1 < CHAPTERS.length ? L(`Нажмите, чтобы открыть главу ${i + 2}`, `Tap to open chapter ${i + 2}`) : L('Нажмите, чтобы завершить путь', 'Tap to finish the path')}</small></div>
  </button>
  if (!c) {
    const ids = collectionIds(), got = ids.filter(id => Progress.ST[id] === 'done').length
    return <button className="growth" id="growth" type="button" onClick={() => openChapter(CHAPTERS.length)}>
      <Ring v={got / ids.length} n="★" />
      <div><b>{L('Все главы пройдены', 'All chapters done')}</b><small>{L(`Коллекция: ${got} из ${ids.length}`, `Collection: ${got} of ${ids.length}`)}</small></div>
    </button>
  }
  const k = counted(c), next = c.opens.map(f => FEATURE[f]).find(x => !x.soon)
  return <button className="growth" id="growth" type="button" onClick={() => openChapter(i)} aria-label={L('Глава', 'Chapter') + ' ' + (i + 1)}>
    <Ring v={share()} n={i + 1} />
    <div><b>{L('Глава', 'Chapter')} {i + 1}. {tx(c.t)}</b>
      <small>{k} {L('из', 'of')} {c.need} {plural(c.need, ['наклейки', 'наклеек', 'наклеек'], ['sticker', 'stickers'])}{next ? L(' · откроет ', ' · opens ') + tx(next.t) : ''}</small></div>
  </button>
}

/* ---------- the Tree: one next step, always in view ---------- */
export function NextStop() {
  const [hide, setHide] = useState(false)
  const s = nextStep(), ready = pending()
  useEffect(() => { setHide(false) }, [s?.n?.id, ready])
  // on a phone the menu ring is not visible: the same «open the next chapter» lives here
  if (ready && !hide && S.people.length) { const i = current(), c = CHAPTERS[i]
    return <div className="ns ns-ready" role="region" aria-label={L('Глава пройдена', 'Chapter done')}>
      <button type="button" className="ns-main" onClick={claim}><Ring v={1} n={i + 1} size={44} />
        <span className="ns-tx"><span className="ns-e">{L('Глава', 'Chapter')} {i + 1} · {tx(c.t)}</span><b>{L('Глава пройдена', 'Chapter done')}</b><small>{i + 1 < CHAPTERS.length ? L(`Впереди глава ${i + 2} «${tx(CHAPTERS[i + 1].t)}»`, `Next: chapter ${i + 2}, “${tx(CHAPTERS[i + 1].t)}”`) : L('Это была последняя глава пути', 'That was the last chapter of the path')}</small></span>
      </button>
      <div className="ns-acts"><button type="button" className="btn sm ns-go" onClick={claim}>{i + 1 < CHAPTERS.length ? L(`Открыть главу ${i + 2}`, `Open chapter ${i + 2}`) : L('Завершить путь', 'Finish the path')}</button></div>
      <button type="button" className="ns-x" onClick={() => setHide(true)} aria-label={L('Скрыть', 'Hide')}><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
    </div> }
  if (!s || hide || !S.people.length) return null
  const c = s.c, n: any = s.n, i = CHAPTERS.indexOf(c), st = Progress.ST[n.id], act = stepAction(n.id) || Progress.act(n, st, null)
  const prog = n.goal > 1 ? Progress.fmt(n) : ''
  return <div className="ns" role="region" aria-label={L('Следующая остановка', 'Next stop')}>
    <button type="button" className="ns-main" onClick={() => openChapter(i)}>
      <Ring v={share()} n={i + 1} size={44} />
      <span className="ns-tx">
        <span className="ns-e">{L('Глава', 'Chapter')} {i + 1} · {tx(c.t)}</span>
        <b>{tx(TASK[n.id]) || Progress.tx(n.t)}</b>
        {prog && <small>{prog}</small>}
      </span>
    </button>
    <div className="ns-acts">
      <button type="button" className="btn sm ns-go" onClick={act.run}>{act.label}</button>
      {SKIP[n.id] && <button type="button" className="btn sm ghost ns-skip" onClick={() => setSkip(n.id, true)}>{tx(SKIP[n.id])}</button>}
    </div>
    <button type="button" className="ns-x" onClick={() => setHide(true)} aria-label={L('Скрыть', 'Hide')}><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
  </div>
}

/* ---------- a chapter closed: the split-flap board from the landing, now with the chapter number ---------- */
export function ChapterUp() {
  const u = ui.levelUp
  useEffect(() => { if (!u) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k) }, [!!u])
  if (!u) return null
  const close = () => { ui.levelUp = null; bump() }
  const end = u.to >= CHAPTERS.length, c = CHAPTERS[u.to]
  const passed = CHAPTERS.slice(u.from, u.to)
  const opened = passed.flatMap(x => x.opens)
  const w = (k: number) => (L('Глава ', 'Chapter ') + k)
  const words = [w(u.from + 1), end ? L('Финиш', 'Finish') : w(u.to + 1)]
  const eyebrow = passed.length > 1 ? L(`Пройдено глав: ${passed.length}`, `${passed.length} chapters done`)
    : L(`Глава «${tx(passed[0].t)}» пройдена`, `Chapter “${tx(passed[0].t)}” done`)
  const toMap = opened.includes('map'), toBook = opened.includes('book')
  return <div className="cu-back" role="dialog" aria-modal="true" aria-label={eyebrow}>
    <div className="cu">
      <span className="cu-e">{eyebrow}</span>
      <div className="cu-board"><SplitFlap key={u.from + '-' + u.to} words={words} lang={LANG === 'en' ? 'en' : 'ru'} once delay={650} /></div>
      {end
        ? <><h2 className="cu-t">{L('Путь пройден', 'The path is done')}</h2><p className="cu-d">{L('Вы отлично научились искать и сохранять историю ваших предков. Дальше — детали, дальние родственники, питомцы и трогательные истории, которые станут единым рассказом в виде Книги семьи.', 'You have learned to find and keep your ancestors’ story. Next come the details, distant relatives, pets and touching stories that will become one tale: the Family Book.')}</p></>
        : <><h2 className="cu-t">{tx(c.t)}</h2><p className="cu-d">{tx(c.d)}.</p></>}
      {opened.length > 0 && <div className="cu-open">
        <span className="cu-oh">{L('Открыто', 'Unlocked')}</span>
        {opened.map(f => <div className="cu-f" key={f}><span className="ic"><FeatureIcon f={f} /></span><span><b>{tx(FEATURE[f].t)}{FEATURE[f].soon && <i className="soon">{L('скоро', 'soon')}</i>}</b><small>{tx(FEATURE[f].d)}</small></span></div>)}
      </div>}
      <div className="cu-btns">
        <button type="button" className="btn line" onClick={() => { close(); openChapter(Math.min(u.to, CHAPTERS.length)) }}>{L('В альбом', 'To the album')}</button>
        <button type="button" className="btn wax" autoFocus onClick={() => { close(); if (toMap) go('map'); else if (toBook) go('book') }}>{toMap ? L('Открыть карту', 'Open the map') : toBook ? L('Открыть книгу', 'Open the book') : L('Дальше', 'Continue')}</button>
      </div>
    </div>
  </div>
}

/* ---------- a part that is not open yet: what it is and what opens it ---------- */
export function LockSheet() {
  const f = ui.lock
  useEffect(() => { if (!f) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k) }, [f])
  if (!f) return null
  const close = () => { ui.lock = null; bump() }
  Progress.evaluate()
  const i = openedBy(f), c = CHAPTERS[i], cur = current(), k = counted(c)
  return <div className="lk-back" onClick={e => { if (e.target === e.currentTarget) close() }}>
    <section className="lk-sheet" role="dialog" aria-modal="true" aria-label={tx(FEATURE[f].t)}>
      <button type="button" className="lk-x" onClick={close} aria-label={L('Закрыть', 'Close')}><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
      <span className="lk-ic"><FeatureIcon f={f} /><LockIcon /></span>
      <h3>{tx(FEATURE[f].t)}</h3>
      <p className="lk-d">{tx(FEATURE[f].d)}</p>
      <div className="lk-cond">
        <b>{L(`Откроется в главе ${i + 1} «${tx(c.t)}»`, `Opens with chapter ${i + 1}, “${tx(c.t)}”`)}</b>
        <span>{i > cur ? L(`Сейчас вы в главе ${cur + 1}. Наклейки этой главы можно собирать уже сейчас.`, `You are on chapter ${cur + 1}. You can collect this chapter’s stickers already.`)
          : L(`Нужно ${c.need} ${plural(c.need, ['наклейка', 'наклейки', 'наклеек'], ['sticker', 'stickers'])} из ${c.st.length}, собрано ${k}.`, `${c.need} of ${c.st.length} stickers needed, ${k} collected.`)}</span>
      </div>
      <ul className="lk-list">
        {c.st.map(id => { const n: any = Progress.byN(id), d = Progress.ST[id] === 'done', sk = isSkipped(id), r = Progress.ratio(n)
          return <li key={id} className={d ? 'd' : sk ? 's' : ''}>
            <img src={stickerSrc(id)} alt="" />
            <span className="t"><b>{tx(TASK[id]) || Progress.tx(n.t)}</b><small>{d ? L('Есть', 'Done') : sk ? tx(SKIP[id]) : n.goal > 1 ? Progress.fmt(n) : L('Пока нет', 'Not yet')}</small></span>
            {!d && !sk && n.goal > 1 && <span className="al-bar"><i style={{ width: Math.round(r * 100) + '%' }} /></span>}
            {d && <svg viewBox="0 0 24 24" className="ok"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
          </li> })}
      </ul>
      <div className="lk-btns">
        <button type="button" className="btn line" onClick={close}>{L('Понятно', 'Got it')}</button>
        <button type="button" className="btn wax" onClick={() => { close(); openChapter(i) }}>{L(`К главе ${i + 1}`, `To chapter ${i + 1}`)}</button>
      </div>
    </section>
  </div>
}

/** is a part open? for the menu */
export const openPart = (f: Feature) => isOpen(f)
export const finishedPath = finished
