import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import GuestApp from './components/GuestApp'
import { tokenFromUrl } from './lib/invites'
import './fonts'
import './styles.css'
import './design.css'
import { applyAppearance, onThemeChange, isLight } from './lib/appearance'
import { S, ui, bump, persist } from './lib/core'
import { THEMES } from './lib/treeStyle'

applyAppearance()
onThemeChange(() => {
  // the light app gets the «Пастель» tree, the dark one «Ночь» (when its tree was on a light style); people can still pick any style after
  if (ui.loaded) {
    const light = isLight(), cur = THEMES.find(x => x.k === S.settings.theme)
    if (light) S.settings.theme = 'pastel'
    else if (!cur || cur.light) S.settings.theme = 'night'
    persist()
  }
  bump() // canvas and SVG parts redraw with the new colours
})

// «Попросить заполнить»: a relative's link (?s=…) opens a light copy of the tree, without an account and without the app's own data
const shareToken = tokenFromUrl()
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode>{shareToken ? <GuestApp token={shareToken} /> : <App />}</React.StrictMode>)
