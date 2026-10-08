// Light / dark look of the app. Dark by default; «auto» follows the device; the choice is per device (kept in this browser).
export type Appearance = 'auto' | 'light' | 'dark'
const KEY = 'predki:appearance'
const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: light)') : null

export function getAppearance(): Appearance {
  try { const v = localStorage.getItem(KEY); return v === 'light' || v === 'auto' ? v : 'dark' } catch { return 'dark' }
}
export const resolvedTheme = (a = getAppearance()): 'light' | 'dark' => a === 'auto' ? (mq?.matches ? 'light' : 'dark') : a
export const isLight = () => document.documentElement.dataset.theme === 'light'

const listeners = new Set<() => void>()
export function onThemeChange(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn) } }

export function applyAppearance(a = getAppearance()) {
  const th = resolvedTheme(a), root = document.documentElement
  if (root.dataset.theme === th) return
  root.dataset.theme = th
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', th === 'light' ? '#E8EAE5' : '#07090F')
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', th)
  listeners.forEach(f => f())
}
export function setAppearance(a: Appearance) {
  try { a === 'dark' ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, a) } catch { /* private mode: still applies for this visit */ }
  applyAppearance(a)
}
mq?.addEventListener?.('change', () => { if (getAppearance() === 'auto') applyAppearance() })
