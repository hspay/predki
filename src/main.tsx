import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './fonts'
import './styles.css'
import { applyAppearance, onThemeChange } from './lib/appearance'
import { bump } from './lib/core'

applyAppearance()
onThemeChange(bump) // canvas and SVG parts redraw with the new colours

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
