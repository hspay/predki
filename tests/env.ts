// The app's modules expect a browser. The tests run in plain Node, so the few globals touched while a module loads are stubbed here
// (nothing is drawn or saved in tests: only the logic of the tree is checked).
const g = globalThis as any
const store = new Map<string, string>()
g.localStorage ??= { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, String(v)) }, removeItem: (k: string) => { store.delete(k) } }
g.sessionStorage ??= g.localStorage
g.location ??= { href: 'http://localhost/', hash: '', search: '', pathname: '/', hostname: 'localhost', origin: 'http://localhost', protocol: 'http:' }
const el = (): any => new Proxy(function () {}, { get: (_t, k) => k === 'style' || k === 'dataset' || k === 'classList' ? el() : k === 'getContext' ? () => null : k === Symbol.toPrimitive ? () => '' : el(), apply: () => el(), set: () => true })
g.document ??= { documentElement: { dataset: {}, lang: 'ru', style: { setProperty() {} }, classList: { add() {}, remove() {}, toggle() {} } }, addEventListener() {}, removeEventListener() {}, createElement: () => el(), querySelector: () => null, querySelectorAll: () => [], visibilityState: 'visible', fonts: { ready: Promise.resolve() }, body: el(), head: el(), cookie: '' }
g.window ??= g
g.addEventListener ??= () => {}
g.removeEventListener ??= () => {}
g.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })
g.requestAnimationFrame ??= (f: () => void) => setTimeout(f, 0)
g.cancelAnimationFrame ??= (h: any) => clearTimeout(h)
g.indexedDB ??= undefined
g.Image ??= class { set src(_v: string) {} }
// Node 20 (the version the site is built with on GitHub) has no WebSocket of its own, and the Supabase client refuses to start without one.
// The tests never open a connection, so an empty stand-in is enough.
g.WebSocket ??= class { close() {} send() {} addEventListener() {} removeEventListener() {} }
// a BroadcastChannel would keep Node running after the tests
g.BroadcastChannel = class { postMessage() {} close() {} addEventListener() {} removeEventListener() {} onmessage = null }
export {}
