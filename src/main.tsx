import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import GuestApp from './components/GuestApp'
import { tokenFromUrl } from './lib/invites'
import './fonts'
import './styles.css'
import { applyAppearance, onThemeChange } from './lib/appearance'
import { bump } from './lib/core'

applyAppearance()
onThemeChange(bump) // canvas and SVG parts redraw with the new colours

// «Попросить заполнить»: a relative's link (?s=…) opens a light copy of the tree, without an account and without the app's own data
const shareToken = tokenFromUrl()
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode>{shareToken ? <GuestApp token={shareToken} /> : <App />}</React.StrictMode>)
