// «Хранитель»: the person who keeps this family's story.
// A keeper's card (portrait, name, the family, what is collected, the latest stickers pasted on it like in a travel passport)
// and the route of chapters as one winding line — the journey the family has already made.
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { S, t, LANG, go, generations } from '../lib/core'
import { Progress } from '../lib/progress'
import { rootPerson } from '../lib/treeLayout'
import { familyTitle } from '../lib/treeStyle'
import { globeSvg } from '../lib/globe'
import { stickerSrc } from '../lib/stickers'
import { flagSvg } from '../lib/passport'
import { countryAt, findCity } from '../lib/world'
import Avatar from '../components/Avatar'
import { openShare, PassportIcon } from '../components/ShareSheet'
import { FeatureIcon, LockIcon } from '../components/Chapters'
import { CHAPTERS, COLLECTION, FEATURE, tx, counted, current, closed, openChapter, isOpen, openedBy, collectionIds, isSkipped, plural, pending, claim } from '../lib/chapters'

export default function KeeperPage() {
  const ru = LANG !== 'en', L = (r: string, e: string) => (ru ? r : e)
  Progress.evaluate()
  const me = rootPerson(), cur = current(), shut = closed(), M = Progress.M as Record<string, number>, ready = pending()
  const fam = (S.settings.familyName || '').trim() || (me ? familyTitle(me.last) : '')
  const N = Progress.N, got = N.filter((n: any) => Progress.ST[n.id] === 'done').length
  const years = S.people.flatMap(p => [p.birthDate, p.deathDate, ...(p.events || []).map(e => e.year)]).map(v => { const m = String(v || '').match(/(\d{4})/); return m ? +m[1] : 0 }).filter(y => y > 0)
  const oldest = years.length ? Math.min(...years) : 0, age = oldest ? new Date().getFullYear() - oldest : 0
  const stats: [number, [string, string, string], [string, string]][] = [
    [S.people.length ? generations() : 0, ['поколение', 'поколения', 'поколений'], ['generation', 'generations']],
    [S.people.length, ['человек', 'человека', 'человек'], ['person', 'people']],
    [M.cities || 0, ['город', 'города', 'городов'], ['city', 'cities']],
    [age, ['год истории', 'года истории', 'лет истории'], ['year of history', 'years of history']],
  ]
  const since = S.settings.since ? (() => { const [d, m, y] = S.settings.since!.split('.'); const dt = new Date(+y, +m - 1, +d); return isNaN(+dt) ? '' : dt.toLocaleDateString(ru ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).replace(' г.', '') })() : ''
  // the three hardest stickers pasted so far lie on the card, a little askew (the latest first among equals)
  const pastedAll = (S.achPasted || []).filter(id => stickerSrc(id))
  const tier = (id: string) => (Progress.byN(id) as any)?.tier || 0
  const pasted = pastedAll.map((id, i) => ({ id, i })).sort((a, b) => tier(b.id) - tier(a.id) || b.i - a.i).slice(0, 3).map(x => x.id)
  const countries = familyCountries()
  const chapLabel = cur < CHAPTERS.length ? `${cur + 1} · ${tx(CHAPTERS[cur].t)}` : L('путь пройден', 'path complete')

  return (
    <section className="page active" data-page="keeper" id="keeperPage">
      <div className="topbar">
        <h2><span>{t('nav.keeper')}</span></h2>
        <button type="button" className="btn icon kp-set" onClick={() => go('settings')} aria-label={t('nav.settings')} title={t('nav.settings')}>
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
        </button>
      </div>
      <div className="scroll kp-scroll"><div className="kp-in">
        <div className="kp-left">
          {/* the keeper's card */}
          <article className="kp-card">
            <div className="kp-card-top">
              <span className="kp-brand"><span dangerouslySetInnerHTML={{ __html: globeSvg('#F4F2EC', 18) }} />Predki</span>
              <span className="kp-role">{L('Хранитель истории семьи', 'Keeper of the family story')}</span>
            </div>
            <div className="kp-card-mid">
              <div className="kp-photo-col">
                <div className="kp-photo">{me && <Avatar p={me} size={150} />}</div>
                {countries.length > 0 && <div className="kp-flags" title={countries.map(c => c.name).join(', ')}>
                  {countries.slice(0, 8).map(c => <span key={c.code} dangerouslySetInnerHTML={{ __html: flagSvg(c.code, c.name) }} />)}
                  {countries.length > 8 && <i>+{countries.length - 8}</i>}
                </div>}
              </div>
              <div className="kp-id">
                <span className="kp-role">{L('Хранитель истории семьи', 'Keeper of the family story')}</span>
                <FitName lines={me ? [me.first, me.last].filter(Boolean) : [L('Вы', 'You')]} />
              </div>
            </div>
            <dl className="kp-fields">
              {fam && <div><dt>{L('Род', 'Family')}</dt><dd>{fam}</dd></div>}
              <div><dt>{L('Глава', 'Chapter')}</dt><dd>{chapLabel}</dd></div>
              <div><dt>{L('Наклейки', 'Stickers')}</dt><dd>{got} {L('из', 'of')} {N.length}</dd></div>
              {since && <div><dt>{L('В Predki с', 'In Predki since')}</dt><dd>{since}</dd></div>}
              {countries.length > 0 && <div><dt>{L('Страны', 'Countries')}</dt><dd>{countries.length} · {countries.slice(0, 3).map(c => c.name).join(', ')}{countries.length > 3 ? '…' : ''}</dd></div>}
            </dl>
            <div className="kp-nums">{stats.map(([v, r, e], i) => <div key={i}><b>{Progress.nf(v)}</b><span>{plural(v, r, e)}</span></div>)}</div>
            {pasted.length > 0 && <div className="kp-stk" aria-hidden="true">{pasted.map((id, i) => <img key={id} src={stickerSrc(id)} alt="" style={{ ['--r' as string]: [-9, 7, -3][i] + 'deg', ['--i' as string]: i }} />)}</div>}
            {ready && <button type="button" className="kp-claim" onClick={claim}>{cur + 1 < CHAPTERS.length ? L(`Глава ${cur + 1} пройдена — открыть главу ${cur + 2}`, `Chapter ${cur + 1} done — open chapter ${cur + 2}`) : L('Последняя глава пройдена — завершить путь', 'The last chapter is done — finish the path')}</button>}
          </article>

          <div className="kp-tiles">
            <button type="button" className={'kp-tile' + (isOpen('passport') ? '' : ' locked')} onClick={openShare}>
              <span className="ic"><PassportIcon /></span>
              <span className="tx"><b>{tx(FEATURE.passport.t)}</b><small>{isOpen('passport') ? L('Открыть и поделиться', 'Open and share') : L(`Откроется в главе ${openedBy('passport') + 1}`, `Opens with chapter ${openedBy('passport') + 1}`)}</small></span>
              {!isOpen('passport') && <LockIcon />}
            </button>
            <button type="button" className={'kp-tile' + (isOpen('book') ? '' : ' locked')} onClick={() => go('book')}>
              <span className="ic"><FeatureIcon f="book" /></span>
              <span className="tx"><b>{tx(FEATURE.book.t)}</b><small>{isOpen('book') ? L('Жизнь каждого по годам', 'Each life year by year') : L(`Откроется в главе ${openedBy('book') + 1}`, `Opens with chapter ${openedBy('book') + 1}`)}</small></span>
              {!isOpen('book') && <LockIcon />}
            </button>
            <div className="kp-tile soon">
              <span className="ic"><FeatureIcon f="bookPdf" /></span>
              <span className="tx"><b>{tx(FEATURE.bookPdf.t)}</b><small>{L(`Скоро · глава ${openedBy('bookPdf') + 1}`, `Soon · chapter ${openedBy('bookPdf') + 1}`)}</small></span>
            </div>
          </div>
        </div>

        <div className="kp-right">
          <div className="kp-sec"><span className="kp-h">{L('Маршрут', 'Route')}</span><span className="kp-hs">{L(`${CHAPTERS.length} глав пути, который ваша семья уже совершила`, `${CHAPTERS.length} chapters of the journey your family has already made`)}</span></div>
          <Route cur={cur} shut={shut} ready={ready} />
        </div>
      </div></div>
    </section>
  )
}

/** The chapters as stations on one winding line: passed — solid green, ahead — dashed. Each station shows the chapter's stickers. */
function Route({ cur, shut, ready }: { cur: number; shut: number; ready: boolean }) {
  const ru = LANG !== 'en', L = (r: string, e: string) => (ru ? r : e)
  const box = useRef<HTMLOListElement>(null)
  const [geo, setGeo] = useState<{ w: number; h: number; pts: [number, number][]; gaps: number[] }>({ w: 0, h: 0, pts: [], gaps: [] })
  // the line is drawn through the real centres of the station circles, so it follows any width
  useLayoutEffect(() => {
    const el = box.current; if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      const pts = [...el.querySelectorAll<HTMLElement>('.kr-dot')].map(d => { const b = d.getBoundingClientRect(); return [b.left - r.left + b.width / 2, b.top - r.top + b.height / 2] as [number, number] })
      // the line crosses between two stations in the free space under the first one's text, never through the text
      const rows = [...el.querySelectorAll<HTMLElement>(':scope > li')].map(li => li.getBoundingClientRect())
      const gaps = rows.slice(0, -1).map((a, i) => (a.bottom + rows[i + 1].top) / 2 - r.top)
      setGeo({ w: r.width, h: r.height, pts, gaps })
    }
    measure(); const ro = new ResizeObserver(measure); ro.observe(el); return () => ro.disconnect()
  }, [cur, shut])
  // down from a station to the gap under its row, across, and down into the next station — two soft curves
  const seg = (a: [number, number], b: [number, number], gy: number) => { const mx = (a[0] + b[0]) / 2; return `C${a[0]} ${gy} ${a[0]} ${gy} ${mx} ${gy}C${b[0]} ${gy} ${b[0]} ${gy} ${b[0]} ${b[1]}` }
  const path = (from: number, to: number) => { const p = geo.pts.slice(from, to + 1); if (p.length < 2) return ''; return `M${p[0][0]} ${p[0][1]}` + p.slice(1).map((q, i) => seg(p[i], q, geo.gaps[from + i] ?? (p[i][1] + q[1]) / 2)).join('') }
  const doneTo = Math.min(shut, geo.pts.length - 1)
  const coll = collectionIds(), collGot = coll.filter(id => Progress.ST[id] === 'done').length
  const items = [...CHAPTERS.map((c, i) => ({ i, c })), { i: CHAPTERS.length, c: null }]
  return <div className="kr">
    <svg className="kr-line" width={geo.w} height={geo.h} viewBox={`0 0 ${geo.w || 1} ${geo.h || 1}`} aria-hidden="true">
      <path d={path(0, geo.pts.length - 1)} className="ahead" />
      {doneTo > 0 && <path d={path(0, doneTo)} className="done" />}
    </svg>
    <ol ref={box} className="kr-list">
      {items.map(({ i, c }) => {
        const st = !c ? (cur >= CHAPTERS.length ? 'now' : 'next') : i < shut ? 'done' : i === cur ? 'now' : 'next'
        const ids: string[] = c ? c.st : coll
        const k = c ? counted(c) : collGot
        const opens = c ? c.opens : []
        return <li key={i} className={'kr-st ' + st + (i % 2 ? ' r' : ' l') + (st === 'now' && ready ? ' ready' : '')}>
          <button type="button" className="kr-dot" onClick={() => (st === 'now' && ready ? claim() : openChapter(i))} aria-label={c ? L(`Глава ${i + 1}`, `Chapter ${i + 1}`) : tx(COLLECTION.t)}>
            {st === 'now' && <span className="kr-burst" />}
            <span className="kr-n">{c ? i + 1 : '★'}</span>
            {st === 'done' && <svg viewBox="0 0 24 24" className="kr-ok"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
          </button>
          <div className="kr-tx">
            <span className="kr-e">{c ? L(`Глава ${i + 1}`, `Chapter ${i + 1}`) : L('После пути', 'After the path')}{st === 'now' && c ? (ready ? L(' · пройдена', ' · done') : L(' · вы здесь', ' · you are here')) : ''}</span>
            <b className="kr-t">{c ? tx(c.t) : tx(COLLECTION.t)}</b>
            <span className="kr-d">{c ? tx(c.d) : tx(COLLECTION.d)}</span>
            <span className="kr-stk">{ids.map(id => { const d = Progress.ST[id] === 'done', sk = isSkipped(id); return <img key={id} src={stickerSrc(id)} alt="" className={d ? 'd' : sk ? 's' : ''} /> })}
              <i>{k} {L('из', 'of')} {c ? c.need : coll.length}</i></span>
            {opens.length > 0 && <span className="kr-op">{opens.map(f => <span key={f} className={'chip' + (st === 'done' ? ' on' : '')}><FeatureIcon f={f} />{st === 'done' ? '' : L('откроет ', 'opens ')}{tx(FEATURE[f].t)}{FEATURE[f].soon ? L(' · скоро', ' · soon') : ''}</span>)}</span>}
            {st === 'now' && ready && <button type="button" className="btn sm kr-claim" onClick={claim}>{i + 1 < CHAPTERS.length ? L(`Открыть главу ${i + 2}`, `Open chapter ${i + 2}`) : L('Завершить путь', 'Finish the path')}</button>}
          </div>
        </li>
      })}
    </ol>
  </div>
}

/** The keeper's name fills the card's width: the longest line sets the size, no word is ever broken. */
function FitName({ lines }: { lines: string[] }): ReactNode {
  const box = useRef<HTMLHeadingElement>(null), [size, setSize] = useState(56)
  useLayoutEffect(() => {
    const el = box.current; if (!el) return
    const fit = () => {
      const w = el.clientWidth; if (!w) return
      const spans = [...el.querySelectorAll<HTMLElement>('span')], base = 100
      el.style.fontSize = base + 'px'
      const widest = Math.max(...spans.map(x => x.scrollWidth))
      setSize(Math.max(22, Math.min(58, Math.floor(base * w / widest * .98))))
      el.style.fontSize = ''
    }
    fit(); const ro = new ResizeObserver(fit); ro.observe(el); document.fonts?.ready.then(fit); return () => ro.disconnect()
  }, [lines.join(' ')])
  return <h3 ref={box} style={{ fontSize: size }}>{lines.map((l, i) => <span key={i}>{l}</span>)}</h3>
}

/** Countries the family lived in (from places with coordinates), the most visited first — the same as on the family passport. */
function familyCountries() {
  const cc: Record<string, number> = {}
  S.people.forEach(p => (p.events || []).forEach(e => { if (e.lat == null || (e.lat as unknown) === '') return; const c = countryAt(e.lat, e.lon) || findCity(e.place)?.country || ''; if (c) cc[c] = (cc[c] || 0) + 1 }))
  let names: Intl.DisplayNames | null = null
  const name = (c: string) => { try { names = names || new Intl.DisplayNames([LANG === 'en' ? 'en' : 'ru'], { type: 'region' }); return names.of(c) || c } catch { return c } }
  return Object.keys(cc).sort((a, b) => cc[b] - cc[a]).map(code => ({ code, name: name(code) }))
}
