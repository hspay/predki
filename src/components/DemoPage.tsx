import { useEffect, useState, lazy, Suspense } from 'react'
import { S, ui, LANG, byId, fullName, showYear, closePanel, generations, bump } from '../lib/core'
import TreePage, { introStep, INTRO_START } from '../pages/TreePage'
import BookPage from '../pages/BookPage'
const MapPage = lazy(() => import('../pages/MapPage'))
import { FAMILIES, famOf, tr, kinOverrides, switchDemo, closeDemo, distances } from '../lib/demo'
import { kinship, chainName } from '../lib/kinship'
import { familyColors } from '../lib/treeLayout'
import { themeOf } from '../lib/treeStyle'
import { globeMark } from '../lib/globe'
import SkyBackground from './SkyBackground'
import { petById, petYears, kindName } from '../lib/pets'
import '../demo.css'

// «Смотреть пример древа» from the welcome landing: a famous family's tree to look at, without the menu and without editing.
// Families switch at the top, the tree style can be changed with the pencil, the CTA at the bottom starts the usual onboarding.
const TX = {
  ru: {
    label: 'Пример древа', cta: 'Построить своё древо', views: 'Разделы', view: { tree: 'Древо', map: 'Карта', book: 'Книга семьи' }, close: 'Закрыть пример', closeCard: 'Закрыть карточку',
    hint: (n: string) => `Нажмите на карточку — покажем, кто это для ${n}`,
    born: (g: string): string => (g === 'f' ? 'Родилась' : 'Родился'), died: (g: string): string => (g === 'f' ? 'Умерла' : 'Умер'),
    was: 'При рождении', years: (e: string) => `Годы — ${e}`, families: 'Семьи',
    petYears: 'Годы', owner: (kind: string): string => (kind === 'dragon' ? 'Всадник' : 'Хозяин'),
    people: ['человек', 'человека', 'человек'], gens: ['поколение', 'поколения', 'поколений'],
    mGen: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
    mNom: ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'],
  },
  en: {
    label: 'Sample tree', cta: 'Build your own tree', views: 'Sections', view: { tree: 'Tree', map: 'Map', book: 'Family book' }, close: 'Close the sample', closeCard: 'Close the card',
    hint: (n: string) => `Tap a card to see who they are to ${n}`,
    born: (_g: string): string => 'Born', died: (_g: string): string => 'Died',
    was: 'Born as', years: (e: string) => `Years ${e}`, families: 'Families',
    petYears: 'Years', owner: (kind: string): string => (kind === 'dragon' ? 'Rider' : 'Owner'),
    people: ['person', 'people', 'people'], gens: ['generation', 'generations', 'generations'],
    mGen: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    mNom: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  },
}
const pl = (n: number, f: string[]) => { if (LANG === 'en') return n === 1 ? f[0] : f[1]; const a = n % 10, b = n % 100; return f[(a === 1 && b !== 11) ? 0 : (a >= 2 && a <= 4 && (b < 12 || b > 14)) ? 1 : 2] }

/** «21.10.1980» → «21 октября 1980», «09.2006» → «сентябрь 2006», «0284» → «284» */
function fmtDate(v: string, T: typeof TX.ru) {
  let m = v.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (m) return LANG === 'en' ? `${T.mGen[+m[2] - 1]} ${+m[1]}, ${m[3]}` : `${+m[1]} ${T.mGen[+m[2] - 1]} ${m[3]}`
  m = v.match(/^(\d{2})\.(\d{4})$/)
  if (m) return `${T.mNom[+m[1] - 1]} ${m[2]}`
  return showYear(v)
}

export default function DemoPage() {
  const T = TX[LANG === 'en' ? 'en' : 'ru'], st = ui.demo!, fam = famOf(st.fam)
  const labels = kinOverrides(fam)
  const sel = ui.panel && ui.panel.mode === 'view' ? ui.panel.id : null
  const selPet = ui.panel && ui.panel.mode === 'pet' ? ui.panel.id : null
  const theme = themeOf(S.settings.theme), col = familyColors(!!theme.light)
  // a family with life events also shows its Map and Family book; another family opens on its Tree
  const [view, setView] = useState<View>('tree')
  useEffect(() => { setView('tree') }, [st.fam])
  // a person picked on the map or in the book is shown on the tree, with their card
  useEffect(() => { if (view !== 'tree' && (sel || selPet)) setView('tree') }, [sel, selPet])

  // the growth runs once; after it the tree is an ordinary still tree (and switching families does not replay it)
  useEffect(() => {
    if (!st.intro) return
    const at = st.intro, d = distances(fam.face), mx = Math.max(0, ...Object.values(d)), ms = (INTRO_START + mx * introStep(mx) + 1.6) * 1000
    const h = setTimeout(() => { if (ui.demo && ui.demo.intro === at) { ui.demo.intro = 0; bump() } }, ms)
    return () => clearTimeout(h)
  }, [st.intro])
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (ui.panel) closePanel(); else closeDemo() } }
    addEventListener('keydown', key); return () => removeEventListener('keydown', key)
  }, [])
  useEffect(() => { document.title = tr(fam.title) + ' · Predki'; return () => { document.title = 'Predki' } }, [st.fam])

  const n = S.people.length, g = generations()
  return (
    <>
      <SkyBackground />
      <div id="demo" className={st.intro ? 'intro' : ''}>
        <header className="dm-top">
          <button type="button" className="dm-brand" onClick={() => closeDemo()} aria-label={T.close}>
            <span className="mk" dangerouslySetInnerHTML={{ __html: globeMark('currentColor', 20) }} />PREDKI
          </button>
          <div className="dm-mid">
            <nav className="dm-fams" role="tablist" aria-label={T.families}>
              {FAMILIES.map(f => <button key={f.k} type="button" role="tab" aria-selected={f.k === st.fam} onClick={() => switchDemo(f.k)}>{tr(f.tab)}</button>)}
            </nav>
            {fam.views && <nav className="dm-views" role="tablist" aria-label={T.views}>
              {VIEWS.map(v => <button key={v} type="button" role="tab" aria-selected={v === view} onClick={() => { setView(v); if (ui.panel) closePanel() }}>{T.view[v]}</button>)}
            </nav>}
            <p className="dm-sub">
              <span className="tag">{T.label}</span>
              <span>{n} {pl(n, T.people)} · {g} {pl(g, T.gens)}</span>
              {fam.era && <span>{T.years(tr(fam.era))}</span>}
            </p>
          </div>
          <button type="button" className="dm-x" onClick={() => closeDemo()} aria-label={T.close} title={T.close}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>
        <div className="dm-main">
          {view !== 'tree' ? <div className={'dm-view dm-' + view}>
            {view === 'map' ? <Suspense fallback={null}><MapPage /></Suspense> : <BookPage demo start={fam.bio?.[fam.face] ? fam.face : undefined} />}
            <div className="dm-cta"><button type="button" className="dm-btn" onClick={() => closeDemo(true)}>{T.cta}</button></div>
          </div> : <TreePage key={st.fam} demo={{ labels, face: fam.face, intro: st.intro }}>
            {sel && byId(sel) && <DemoCard key={sel} id={sel} T={T} label={kinOf(sel, labels)} color={sel === fam.face ? '' : col.kin(sel)} face={fam.face} />}
            {selPet && petById(selPet) && <DemoPetCard key={selPet} id={selPet} T={T} />}
            <div className="dm-cta">
              <p className="dm-hint" aria-hidden={!!(sel || selPet)}>{T.hint(tr(fam.faceDat))}</p>
              <button type="button" className="dm-btn" onClick={() => closeDemo(true)}>{T.cta}</button>
            </div>
          </TreePage>}
        </div>
      </div>
    </>
  )
}

type View = 'tree' | 'map' | 'book'
const VIEWS: View[] = ['tree', 'map', 'book']

/** the kinship label for one person: the demo's own words where it has them, else the usual rules */
function kinOf(id: string, labels: Record<string, string>) {
  if (labels[id]) return labels[id]
  const me = S.settings.meId; return me ? kinship(me).label[id] || '' : ''
}

/** Read-only card of one person: who they are to the face, the name, birth and death with places, and the chain of relatives. */
function DemoCard({ id, T, label, color, face }: { id: string; T: typeof TX.ru; label: string; color: string; face: string }) {
  const p = byId(id)!, me = S.settings.meId
  const chain = me && id !== face ? kinship(me).chain(id) : []
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
    </div>
  )
}

/** Read-only card of a pet: its kind, name, years and whose it is (a dragon has a rider, anyone else an owner). */
function DemoPetCard({ id, T }: { id: string; T: typeof TX.ru }) {
  const pt = petById(id)!, owner = byId(pt.owner), yrs = petYears(pt)
  const row = (k: string, v: string) => v ? <div className="r"><span className="l">{k}</span><span className="v">{v}</span></div> : null
  return (
    <div className="tree-kin dm-card" role="dialog" aria-label={pt.name}>
      <button type="button" className="dm-card-x" onClick={closePanel} aria-label={T.closeCard}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
      <span className="k">{kindName(pt.kind)}</span>
      <b className="n">{pt.name}</b>
      {row(T.petYears, yrs)}
      {owner && row(T.owner(pt.kind), fullName(owner))}
    </div>
  )
}
