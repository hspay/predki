// Visit statistics: Yandex Metrica (counter 113662509), without Webvisor, click map or form analytics —
// it never sees what people type into their trees. Only on the live site: not on localhost or a test build,
// and not on the page a relative opens from «Попросить заполнить» (?s=…).
// The app has one address for every page, so each screen is sent as its own virtual page (hit), and the steps
// that matter are goals (reachGoal). The goal names below have to exist in Metrica as «JavaScript-событие» goals.
const ID = 113662509
const LIVE = /(^|\.)(predki\.me|hspay\.github\.io)$/
declare global { interface Window { ym?: (...a: unknown[]) => void } }

const on = () => typeof location !== 'undefined' && LIVE.test(location.hostname) && !new URLSearchParams(location.search).has('s')
let started = false
/** load the counter once; the first screen is sent by screen() */
export function initAnalytics() {
  if (started || !on()) return; started = true
  const w = window as Window & { ym?: { (...a: unknown[]): void; a?: unknown[][]; l?: number } }
  // the standard Metrica loader: calls wait in a queue until tag.js arrives
  const q = function (...a: unknown[]) { (q.a = q.a || []).push(a) } as { (...a: unknown[]): void; a?: unknown[][]; l?: number }
  q.l = Date.now(); w.ym = w.ym || q
  const s = document.createElement('script'); s.async = true; s.src = 'https://mc.yandex.ru/metrika/tag.js?id=' + ID
  document.head.appendChild(s)
  w.ym!(ID, 'init', { ssr: true, defer: true, webvisor: false, clickmap: false, trackLinks: true, accurateTrackBounce: true, ecommerce: false, trackHash: false })
}

let last = ''
/** a screen of the app as its own page in the reports: «landing», «tree», «demo/romanov»… */
export function screen(name: string, title: string) {
  if (!started || name === last) return
  const first = !last; last = name
  const base = location.origin + location.pathname.replace(/[^/]*$/, '')
  // the first page of a visit carries where the visitor came from (Instagram, Telegram, search…)
  window.ym?.(ID, 'hit', base + name, first ? { title: title + ' · Predki', referer: document.referrer } : { title: title + ' · Predki' })
}

/** goals (create them in Metrica → Цели → JavaScript-событие with exactly these names):
 *  landing_start — «Построить древо» on the landing     demo_open — the sample tree opened
 *  demo_family — another family picked (params: family)  demo_build — «Построить своё древо» in the demo
 *  sign_up — an account created                          sign_in — signed in (email or Google)
 *  no_account — «Продолжить без аккаунта»                first_tree — the first steps done (you and your parents)
 *  person_add — a person added                            map_play — the map's story played
 *  passport — the family passport opened                  ask_relatives — a «Попросить заполнить» link made
 *  calendar_export — the calendar saved to the phone */
export function goal(name: string, params?: Record<string, string | number>) {
  if (!started) return
  window.ym?.(ID, 'reachGoal', name, params)
}
