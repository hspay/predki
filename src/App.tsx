import { useEffect } from 'react'
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
import MapPage from './pages/MapPage'
import AlbumPage from './pages/AlbumPage' // «Альбом» (former «Прогресс»: pages/ProgressPage.tsx)
import GapsPage from './pages/GapsPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  useStore()
  useEffect(() => { boot() }, [])
  // names on the tree are measured with the real font: redraw once Onest has loaded
  useEffect(() => { document.fonts?.ready.then(() => bump()) }, [])
  // answers from relatives («Попросить заполнить»): the number shows on «Заполнить пробелы» in the menu
  useEffect(() => { if (ui.loaded && cloud.session) refreshInbox() }, [ui.loaded, !!cloud.session])
  if (!ui.loaded) return null
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
          {p === 'map' && <MapPage />}
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
