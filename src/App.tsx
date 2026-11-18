import { useEffect, lazy, Suspense } from 'react'
import { ui, boot, useStore, bump, cloud } from './lib/core'
import { refreshInbox } from './lib/invites'
import AuthScreen from './components/AuthScreen'
import Sidebar from './components/Sidebar'
import Toasts from './components/Toasts'
import SkyBackground from './components/SkyBackground'
import Onboarding from './components/Onboarding'
import PersonPanel from './components/PersonPanel'
import AddRelativeModal from './components/AddRelativeModal'
import ShareSheet from './components/ShareSheet'
import FamilyCalendar from './components/FamilyCalendar'
import TreePage from './pages/TreePage'
// the Map with its world outline and borders (~230 KB) loads when it is first opened
const MapPage = lazy(() => import('./pages/MapPage'))
// The Tree is the first screen; the other pages, the demo and the first-run dialog come as separate files, so the first load is lighter.
// They are fetched in the background a moment after the app opens (preloadPages), so switching pages does not wait for the network.
const pages = {
  album: () => import('./pages/AlbumPage'), // «Альбом» (former «Прогресс»: pages/ProgressPage.tsx)
  gaps: () => import('./pages/GapsPage'), settings: () => import('./pages/SettingsPage'), keeper: () => import('./pages/KeeperPage'),
  book: () => import('./pages/BookPage'), guide: () => import('./pages/GuidePage'),
}
const AlbumPage = lazy(pages.album), GapsPage = lazy(pages.gaps), SettingsPage = lazy(pages.settings), KeeperPage = lazy(pages.keeper), BookPage = lazy(pages.book), GuidePage = lazy(pages.guide)
const DemoPage = lazy(() => import('./components/DemoPage')), FirstRun = lazy(() => import('./components/FirstRun'))
let preloaded = false
function preloadPages() { if (preloaded) return; preloaded = true; Object.values(pages).forEach(load => load().catch(() => { preloaded = false })) }
import { ChapterUp, LockSheet } from './components/Chapters'
import PreviewBar from './components/PreviewBar'
import PageGuard from './components/PageGuard'
import { openDemo, demoFromHash } from './lib/demo'
import { screen } from './lib/analytics'

const SCREEN_TITLE: Record<string, string> = { landing: 'Лендинг', demo: 'Пример древа', 'sign-in': 'Вход', start: 'Первые шаги', tree: 'Древо', map: 'Карта', album: 'Альбом', gaps: 'Заполнить пробелы', keeper: 'Хранитель', book: 'Книга семьи', guide: 'Путеводитель', settings: 'Настройки' }

export default function App() {
  useStore()
  useEffect(() => { boot() }, [])
  // names on the tree are measured with the real font: redraw once Onest has loaded
  useEffect(() => { document.fonts?.ready.then(() => bump()) }, [])
  // answers from relatives («Попросить заполнить»): the number shows on «Заполнить пробелы» in the menu
  useEffect(() => { if (ui.loaded && cloud.session) refreshInbox() }, [ui.loaded, !!cloud.session])
  // a link to the demo (…/#demo=kardashian) opens it straight away
  // the other pages are fetched once the first screen has settled
  useEffect(() => { if (!ui.loaded) return; const h = setTimeout(preloadPages, 2500); return () => clearTimeout(h) }, [ui.loaded])
  useEffect(() => { if (ui.loaded) { const k = demoFromHash(); if (k !== null && !ui.demo) openDemo(k || undefined) } }, [ui.loaded])
  // statistics: each screen of the app is a page in Yandex Metrica (lib/analytics.ts)
  const signInNow = !ui.onboarding && ((!cloud.session && !cloud.skipped) || cloud.recovery)
  const scr = !ui.loaded ? '' : ui.demo ? 'demo/' + ui.demo.fam : ui.onboarding ? 'landing' : signInNow ? 'sign-in' : ui.firstRun && ui.page === 'tree' ? 'start' : ({ tree: 'tree', map: 'map', progress: 'album', gaps: 'gaps', keeper: 'keeper', book: 'book', guide: 'guide', settings: 'settings' } as Record<string, string>)[ui.page]
  useEffect(() => { if (scr) screen(scr, SCREEN_TITLE[scr.split('/')[0]] + (ui.demo ? ' · ' + ui.demo.fam : '')) }, [scr])
  if (!ui.loaded) return null
  // «Смотреть пример древа»: the demo tree takes the whole screen, before any sign-in
  if (ui.demo) return <><Suspense fallback={null}><DemoPage /></Suspense><Toasts /></>
  const p = ui.page
  // after the welcome landing nobody enters the tree without an account (unless they chose «without an account»)
  const signIn = !ui.onboarding && ((!cloud.session && !cloud.skipped) || cloud.recovery)
  const loading = !ui.onboarding && !signIn && !!cloud.session && cloud.busy
  if (signIn || loading) return <><SkyBackground /><AuthScreen key={cloud.recovery ? 'r' : cloud.linkError ? 'e' : 'a'} loading={loading} /><Toasts /></>
  return (
    <>
      {ui.onboarding && <Onboarding />}
      {!ui.onboarding && ui.firstRun && p === 'tree' && <Suspense fallback={null}><FirstRun /></Suspense>}
      <SkyBackground />
      <div id="app">
        <PageGuard name="menu" small><Sidebar /></PageGuard>
        <main id="main">
          <PageGuard key={p} name={p}>
            <Suspense fallback={null}>
              {p === 'tree' && <TreePage />}
              {p === 'map' && <MapPage />}
              {p === 'progress' && <AlbumPage />}
              {p === 'gaps' && <GapsPage />}
              {p === 'keeper' && <KeeperPage />}
              {p === 'book' && <BookPage />}
              {p === 'guide' && <GuidePage />}
              {p === 'settings' && <SettingsPage />}
              {p === 'calendar' && <FamilyCalendar />}
            </Suspense>
          </PageGuard>
          <PageGuard name="panel" small resetKey={ui.panel ? ui.panel.mode + ('id' in ui.panel ? ui.panel.id : '') : ''}><PersonPanel /></PageGuard>
        </main>
      </div>
      <AddRelativeModal />
      {ui.share && <ShareSheet />}
      <LockSheet />
      <ChapterUp />
      {import.meta.env.VITE_PREVIEW === '1' && <PreviewBar />}
      <Toasts />
    </>
  )
}
