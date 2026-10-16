import { useEffect, useRef, useState } from 'react'
import { S, ui, t, LANG, bump, generations } from '../lib/core'
import { Progress } from '../lib/progress'
import { stickerSrc, outlineSrc } from '../lib/stickers'
import { openShare } from '../components/ShareSheet'
import { globeSvg } from '../lib/globe'

type Node = any // achievement node, see lib/progress.ts
const P = Progress
const TX = {
  ru: { stickers: ['наклейки', 'наклеек', 'наклеек'], of: 'из', wait: ['ждёт, чтобы её вклеили', 'ждут, чтобы их вклеили', 'ждут, чтобы их вклеили'], all: 'Все наклейки на месте',
    gens: ['поколение', 'поколения', 'поколений'], people: ['человек', 'человека', 'человек'], cities: ['город', 'города', 'городов'], years: ['год истории', 'года истории', 'лет истории'],
    sec: { kin: ['Род', 'Люди и поколения'], chron: ['Летопись', 'Лица, истории и документы'], road: ['Странствия', 'Города, переезды и годы'], more: ['Особые', 'Связки разделов и скрытые'] },
    got: 'Собрано', paste: 'Вклеить', pasteBig: 'Вклеить в альбом', isNew: 'новая', ready: 'готово', hidden: 'Скрытая', hiddenT: 'Скрытая наклейка', hiddenD: 'Откроется сама, когда условие выполнится. Подсказка: ',
    closest: 'Ближе всего', left: 'ещё', one: 'одно условие', sheet: 'Наклейка', close: 'Закрыть', gotOn: 'Получена {d}', newS: 'Новая — вклейте её в альбом',
    tip: 'Совет.', pass: 'Паспорт семьи', passGo: 'Открыть и поделиться', passSub: ['наклейка', 'наклейки', 'наклеек'], since: 'с' },
  en: { stickers: ['sticker', 'stickers', 'stickers'], of: 'of', wait: ['is waiting to be pasted', 'are waiting to be pasted', 'are waiting to be pasted'], all: 'Every sticker is in place',
    gens: ['generation', 'generations', 'generations'], people: ['person', 'people', 'people'], cities: ['city', 'cities', 'cities'], years: ['year of history', 'years of history', 'years of history'],
    sec: { kin: ['Kin', 'People and generations'], chron: ['Chronicle', 'Faces, stories and papers'], road: ['Journeys', 'Cities, moves and years'], more: ['Special', 'Links between sections and hidden ones'] },
    got: 'Collected', paste: 'Paste', pasteBig: 'Paste into the album', isNew: 'new', ready: 'ready', hidden: 'Hidden', hiddenT: 'Hidden sticker', hiddenD: 'Unlocks by itself once the condition is met. Hint: ',
    closest: 'Closest', left: '', one: 'one condition', sheet: 'Sticker', close: 'Close', gotOn: 'Earned {d}', newS: 'New — paste it into the album',
    tip: 'Tip.', pass: 'Family passport', passGo: 'Open and share', passSub: ['sticker', 'stickers', 'stickers'], since: 'since' },
}
const SECS = ['kin', 'chron', 'road', 'more'] as const
type Sec = typeof SECS[number]
const plr = (n: number, f: string[]) => { if (LANG === 'en') return n === 1 ? f[0] : f[1]; const a = n % 10, b = n % 100; return f[(a === 1 && b !== 11) ? 0 : (a >= 2 && a <= 4 && (b < 12 || b > 14)) ? 1 : 2] }
/** stickers lie a little askew, each at its own angle */
const tilt = (id: string) => ((id.charCodeAt(2) * 7 + id.length * 13) % 9) - 4

type Look = 'pasted' | 'new' | 'pasting' | 'ready' | 'avail' | 'lock'
function lookOf(n: Node, pasting: string | null): Look {
  const st = P.ST[n.id]
  if (st === 'done') return n.id === pasting ? 'pasting' : P.isPasted(n.id) ? 'pasted' : 'new'
  return st
}

/** The sticker as it lies on the page (or its dotted place while it is not earned yet). */
function Art({ n, look, size }: { n: Node; look: Look; size: 'slot' | 'big' }) {
  const hid = n.br === 'secret' && P.ST[n.id] !== 'done', r = P.ratio(n), src = stickerSrc(n.id)
  const shown = look === 'pasted' || look === 'new' || look === 'pasting'
  return <span className={'al-art ' + size} style={{ transform: `rotate(${tilt(n.id)}deg)` }}>
    {!shown && !hid && <img className={'al-ct' + (look === 'avail' && r > 0 ? ' al-ct2 cp' + Math.round(r * 10) : '')} src={outlineSrc(n.id)} alt="" draggable={false} />}
    {!shown && !hid && look === 'avail' && r > 0 && <img className="al-ct" src={outlineSrc(n.id)} alt="" draggable={false} />}
    {hid && <span className="al-q" aria-hidden="true">?</span>}
    {look === 'pasting'
      ? <span className="al-peel">
          <img className="al-stk stuck" src={src} alt="" draggable={false} />
          <img className="al-stk lifted" src={src} alt="" draggable={false} />
          <span className="al-fold" style={{ WebkitMaskImage: `url(${src})`, maskImage: `url(${src})` }} />
          <span className="al-burst" />
        </span>
      : shown && <img className="al-stk" src={src} alt="" draggable={false} />}
    {look === 'pasted' && n.tier === 4 && <span className="al-holo" style={{ WebkitMaskImage: `url(${src})`, maskImage: `url(${src})` }} />}
  </span>
}

/** Achievements as an album: four sections, stickers pasted onto paper pages; the family passport at the bottom. */
export default function AlbumPage() {
  const T = TX[LANG === 'en' ? 'en' : 'ru']
  P.evaluate()
  const N: Node[] = P.N, ST = P.ST, M: Record<string, number> = P.M
  const tab = (SECS as readonly string[]).includes(ui.album.tab) ? ui.album.tab as Sec : 'kin'
  const sheet = ui.album.sheet
  const [pasting, setPasting] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && ui.album.sheet) { ui.album.sheet = null; bump() } }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k) }, [])
  const setTab = (k: Sec) => { ui.album.tab = k; ui.album.sheet = null; bump() }
  const open = (id: string | null) => { ui.album.sheet = id; if (id) { const n = P.byN(id); if (n) ui.album.tab = P.secOf(n) } bump() }
  // paper is laid down from left to right, then the sticker counts as pasted
  const paste = (id: string) => {
    if (pasting || P.isPasted(id)) return
    setPasting(id); clearTimeout(timer.current)
    timer.current = setTimeout(() => { P.paste(id); setPasting(null) }, 1500)
  }

  const got = N.filter(n => ST[n.id] === 'done').length
  const secCount = (k: string) => { const L = N.filter(n => P.secOf(n) === k); return { got: L.filter(n => ST[n.id] === 'done').length, all: L.length } }
  const years = S.people.flatMap(p => [p.birthDate, p.deathDate, ...(p.events || []).map(e => e.year)]).map(v => { const m = String(v || '').match(/(\d{4})/); return m ? +m[1] : 0 }).filter(y => y > 0)
  const age = years.length ? new Date().getFullYear() - Math.min(...years) : 0, gens = S.people.length ? generations() : 0
  const stats = [[gens, T.gens], [S.people.length, T.people], [M.cities || 0, T.cities], [age, T.years]] as [number, string[]][]
  const list = N.filter(n => P.secOf(n) === tab)
  const cand = list.filter(n => ST[n.id] === 'avail' && n.goal > 1 && n.br !== 'secret').sort((a, b) => P.ratio(b) - P.ratio(a))[0]
  const left = (n: Node) => { if (n.goal === 1) return T.one; const v = M[n.m] || 0, l = Math.max(0, Math.ceil(n.goal - v)), u = n.u || P.U.people; return (T.left ? T.left + ' ' : '') + P.nf(l) + ' ' + P.pl(l, u) }
  const pr = got / N.length, R = 33, C = 2 * Math.PI * R
  const since = years.length ? String(Math.min(...years)) : ''

  return (
    <section className="page active" data-page="progress" id="albumPage">
      <div className="topbar">
        <h2><span>{t('nav.progress')}</span><span className="sub">{got} {T.of} {N.length} {plr(N.length, T.stickers)}</span></h2>
        <div className="al-ring" title={`${got} / ${N.length}`}>
          <svg viewBox="0 0 76 76" aria-hidden="true"><circle className="tr" cx="38" cy="38" r={R} /><circle className="br" cx="38" cy="38" r={R} strokeDasharray={C} strokeDashoffset={C * (1 - pr)} transform="rotate(-90 38 38)" /></svg>
          <b>{got}/{N.length}</b>
        </div>
      </div>
      <div className="scroll al-scroll">
        <div className="al-in">
          <div className="al-stats">{stats.map(([v, f], i) => <div className="al-stat" key={i}><b>{P.nf(v)}</b><span>{plr(v, f)}</span></div>)}</div>
          <div className="al-tabs" role="tablist">
            {SECS.map(k => { const c = secCount(k); return <button key={k} type="button" role="tab" aria-selected={tab === k} className={'al-tab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>
              {T.sec[k][0].toUpperCase()} <i>{c.got}/{c.all}</i></button> })}
          </div>
          <div className="al-page" key={tab}>
            <div className="al-pg-h"><span>{T.sec[tab][0].toUpperCase()} <span className="d">— {T.sec[tab][1]}</span></span><span>{T.got.toUpperCase()} {secCount(tab).got} {T.of.toUpperCase()} {secCount(tab).all}</span></div>
            <div className="al-grid">
              {list.map((n, i) => {
                const look = lookOf(n, pasting), hid = n.br === 'secret' && ST[n.id] !== 'done', r = P.ratio(n)
                const sub = look === 'pasted' ? '' : look === 'new' || look === 'pasting' ? T.isNew : hid ? '?' : look === 'ready' ? T.ready : n.goal > 1 && r > 0 ? `${P.nf(Math.min(M[n.m] || 0, n.goal))} / ${P.nf(n.goal)}` : ''
                return <div key={n.id} className={'al-slot s-' + look + (sheet === n.id ? ' cur' : '')} style={{ animationDelay: i * 45 + 'ms' }}>
                  <button type="button" className="al-slot-b" onClick={() => open(n.id)} aria-label={(hid ? T.hiddenT : P.tx(n.t)) + (look === 'new' ? ', ' + T.isNew : '')}>
                    <Art n={n} look={look} size="slot" />
                    <span className="al-t">{hid ? T.hidden : P.tx(n.t)}</span>
                    <span className="al-s">{sub}</span>
                  </button>
                  {look === 'new' && <button type="button" className="al-paste" onClick={() => paste(n.id)}>{T.paste}</button>}
                </div>
              })}
            </div>
            {cand && <button type="button" className="al-closest" onClick={() => open(cand.id)}>
              <span>{T.closest}: {LANG === 'en' ? `“${P.tx(cand.t)}”` : `«${P.tx(cand.t)}»`} — {left(cand)}</span><span className="al-bar"><i style={{ width: Math.round(P.ratio(cand) * 100) + '%' }} /></span>
            </button>}
          </div>
          {S.people.length > 0 && <button type="button" className="al-passbar" onClick={openShare}>
            <span className="pi" dangerouslySetInnerHTML={{ __html: globeSvg('#F4F2EC', 24) }} />
            <span className="pt"><b>{T.pass}</b><small>{(S.achPasted || []).length} {plr((S.achPasted || []).length, T.passSub)} · {S.people.length} {plr(S.people.length, T.people)}{since ? ` · ${T.since} ${since}` : ''}</small></span>
            <span className="go">{T.passGo}<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
          </button>}
        </div>
      </div>
      {sheet && P.byN(sheet) && <Sheet id={sheet} look={lookOf(P.byN(sheet), pasting)} paste={paste} open={open} />}
    </section>
  )
}

/** The light card of one sticker: picture, title, description, its own progress, a tip and one action. */
function Sheet({ id, look, paste, open }: { id: string; look: Look; paste: (id: string) => void; open: (id: string | null) => void }) {
  const T = TX[LANG === 'en' ? 'en' : 'ru'], n: Node = P.byN(id), ST = P.ST, st = ST[n.id], hid = n.br === 'secret' && st !== 'done'
  const bar = n.goal > 1 && !hid && st !== 'done', r = P.ratio(n)
  let status = ''
  if (look === 'new' || look === 'pasting') status = T.newS
  else if (st === 'done') { const d = P.earnedDate(n); status = d ? T.gotOn.replace('{d}', d) : '' }
  const act = P.act(n, st, (x: string | null) => open(x))
  return (
    <section className="al-sheet" aria-live="polite">
      <div className="panel-head"><h3 key={id}>{T.sheet} · {T.sec[P.secOf(n) as Sec][0]}</h3>
        <button className="btn icon ghost" onClick={() => open(null)} aria-label={T.close}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg></button></div>
      <div className="al-sh-b pn-in" key={id}>
        <div className="al-sh-art"><Art n={n} look={look} size="big" /></div>
        <h3 className="al-sh-t">{hid ? T.hiddenT : P.tx(n.t)}</h3>
        <p className="al-sh-d">{hid ? T.hiddenD + P.tx(n.hint) : P.tx(n.d)}</p>
        {bar && <><span className="al-bar big"><i style={{ width: (r * 100).toFixed(1) + '%' }} /></span><div className="al-barrow"><span>{P.fmt(n)}</span><span>{Math.round(r * 100)}%</span></div></>}
        {status && <p className="al-st">{status}</p>}
        {(st === 'avail' || st === 'lock') && !hid && <div className="al-tip"><svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: P.IC.bulb }} /><span><b>{T.tip}</b> {P.tx(n.tip)}</span></div>}
      </div>
      <div className="al-sh-f">
        {look === 'new' || look === 'pasting'
          ? <button type="button" className="btn wax full" onClick={() => paste(n.id)} disabled={look === 'pasting'}>{T.pasteBig}</button>
          : <button type="button" className={'btn full ' + (act.primary ? 'wax' : 'line')} onClick={act.run}>{act.label}<svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: P.IC.arrow }} /></button>}
      </div>
    </section>
  )
}
