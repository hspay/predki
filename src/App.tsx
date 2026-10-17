import { useEffect, lazy, Suspense } from 'react'
import { ui, boot, useStore, bump, cloud } from './lib/core'
import { refreshInbox } from './lib/invites'
import AuthScreen from './components/AuthScreen'
import Sidebar from './components/Sidebar'
import Toasts from './components/Toasts'
import SkyBackground from './components/SkyBackground'
import Onboarding from './components/Onboarding'
import FirstRun from './components/FirstRun'
import PersonPanel from './components/PersonPanel'
import AddRelativeModal from './components/AddRelativeModal'
import ShareSheet from './components/ShareSheet'
import FamilyCalendar from './components/FamilyCalendar'
import TreePage from './pages/TreePage'
// the Map with its world outline and borders (~230 KB) loads when it is first opened
const MapPage = lazy(() => import('./pages/MapPage'))
import AlbumPage from './pages/AlbumPage' // «Альбом» (former «Прогресс»: pages/ProgressPage.tsx)
import GapsPage from './pages/GapsPage'
import SettingsPage from './pages/SettingsPage'
import DemoPage from './components/DemoPage'
import { openDemo, demoFromHash } from './lib/demo'
import { screen } from './lib/analytics'

const SCREEN_TITLE: Record<string, string> = { landing: 'Лендинг', demo: 'Пример древа', 'sign-in': 'Вход', start: 'Первые шаги', tree: 'Древо', map: 'Карта', album: 'Альбом', gaps: 'Заполнить пробелы', settings: 'Настройки' }

export default function App() {
  useStore()
  useEffect(() => { boot() }, [])
  // names on the tree are measured with the real font: redraw once Onest has loaded
  useEffect(() => { document.fonts?.ready.then(() => bump()) }, [])
  // answers from relatives («Попросить заполнить»): the number shows on «Заполнить пробелы» in the menu
  useEffect(() => { if (ui.loaded && cloud.session) refreshInbox() }, [ui.loaded, !!cloud.session])
  // a link to the demo (…/#demo=kardashian) opens it straight away
  useEffect(() => { if (ui.loaded) { const k = demoFromHash(); if (k !== null && !ui.demo) openDemo(k || undefined) } }, [ui.loaded])
  // statistics: each screen of the app is a page in Yandex Metrica (lib/analytics.ts)
  const signInNow = !ui.onboarding && ((!cloud.session && !cloud.skipped) || cloud.recovery)
  const scr = !ui.loaded ? '' : ui.demo ? 'demo/' + ui.demo.fam : ui.onboarding ? 'landing' : signInNow ? 'sign-in' : ui.firstRun && ui.page === 'tree' ? 'start' : ({ tree: 'tree', map: 'map', progress: 'album', gaps: 'gaps', settings: 'settings' } as Record<string, string>)[ui.page]
  useEffect(() => { if (scr) screen(scr, SCREEN_TITLE[scr.split('/')[0]] + (ui.demo ? ' · ' + ui.demo.fam : '')) }, [scr])
  if (!ui.loaded) return null
  // «Смотреть пример древа»: the demo tree takes the whole screen, before any sign-in
  if (ui.demo) return <><DemoPage /><Toasts /></>
  const p = ui.page
  // after the welcome landing nobody enters the tree without an account (unless they chose «without an account»)
  const signIn = !ui.onboarding && ((!cloud.session && !cloud.skipped) || cloud.recovery)
  const loading = !ui.onboarding && !signIn && !!cloud.session && cloud.busy
  if (signIn || loading) return <><SkyBackground /><AuthScreen key={cloud.recovery ? 'r' : 'a'} loading={loading} /><Toasts /></>
  return (
    <>
      {ui.onboarding && <Onboarding />}
      {!ui.onboarding && ui.firstRun && p === 'tree' && <FirstRun />}
      <SkyBackground />
      <div id="app">
        <Sidebar />
        <main id="main">
          {p === 'tree' && <TreePage />}
          {p === 'map' && <Suspense fallback={null}><MapPage /></Suspense>}
          {p === 'progress' && <AlbumPage />}
          {p === 'gaps' && <GapsPage />}
          {p === 'settings' && <SettingsPage />}
          <PersonPanel />
        </main>
      </div>
      <AddRelativeModal />
      {ui.share && <ShareSheet />}
      {ui.calendar && <FamilyCalendar />}
      <Toasts />
    </>
  )
}
