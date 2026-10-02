import { useEffect } from 'react'
import { ui, boot, useStore, bump } from './lib/core'
import Sidebar from './components/Sidebar'
import Toasts from './components/Toasts'
import SkyBackground from './components/SkyBackground'
import Onboarding from './components/Onboarding'
import FirstRun from './components/FirstRun'
import PersonPanel from './components/PersonPanel'
import AddRelativeModal from './components/AddRelativeModal'
import ShareSheet from './components/ShareSheet'
import TreePage from './pages/TreePage'
import MapPage from './pages/MapPage'
import ProgressPage from './pages/ProgressPage'
import PeoplePage from './pages/PeoplePage'
import ArchivistPage from './pages/ArchivistPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  useStore()
  useEffect(() => { boot() }, [])
  // names on the tree are measured with the real font: redraw once Onest has loaded
  useEffect(() => { document.fonts?.ready.then(() => bump()) }, [])
  if (!ui.loaded) return null
  const p = ui.page
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
          {p === 'progress' && <ProgressPage />}
          {p === 'people' && <PeoplePage />}
          {p === 'ai' && <ArchivistPage />}
          {p === 'settings' && <SettingsPage />}
          <PersonPanel />
        </main>
      </div>
      <AddRelativeModal />
      {ui.share && <ShareSheet />}
      <Toasts />
    </>
  )
}
