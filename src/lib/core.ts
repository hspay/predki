// Predki data layer: one mutable family document (S), saved to IndexedDB, plus the UI state.
// Components read S directly and re-render on bump(); every data change goes through commit().
import { useSyncExternalStore } from 'react'
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval'
import { t, setLangValue, LANG } from './i18n'
import { findCity } from './world'
import { sampleData } from './sample'
import { Progress } from './progress'
import { sb, cloud, initSession, pullTree, pushTree, signOutCloud, setSkipped } from './cloud'
import type { FrameLook } from './frames'
import { PRESET_SRC, presetType, typeOfPreset, pickPreset, previewPreset } from './avatars'

// ---------- types ----------
export type Gender = '' | 'm' | 'f'
export type EvType = 'birth' | 'move' | 'study' | 'work' | 'marriage' | 'death' | 'other'
export interface LifeEvent { id: string; type: EvType; year: number | ''; place: string; lat: number | null; lon: number | null; note: string }
export interface Media { id: string; type: 'photo' | 'doc'; name: string; data: string }
export interface Person {
  id: string; first: string; last: string; maiden: string; patronymic: string; gender: Gender
  birthDate: string; birthPlace: string; deathDate: string; deathPlace: string; job: string; edu: string; bio: string; avatar: string
  media: Media[]; events: LifeEvent[]; auto?: boolean
  /** default portrait (lib/avatars.ts) shown while there is no photo */
  preset?: string
  /** portrait frame on the Tree; none = the usual card */
  frame?: FrameLook
}
export interface Rel { id: string; type: 'parent' | 'spouse'; a: string; b: string; from: string }
export interface Settings {
  lang?: 'ru' | 'en'; onboarded?: boolean; aiUsed?: boolean; aiAudio?: boolean
  /** tree look: background theme, title above the tree, dashed places for unknown ancestors */
  theme?: string; familyName?: string; ghosts?: boolean
  /** links between relatives on the Tree */
  lines?: 'smooth' | 'straight'
  /** «you» in the tree and the day the family started using Predki (ДД.ММ.ГГГГ), both shown on the family passport */
  meId?: string; since?: string
  /** last look picked for the family passport */
  share?: { theme?: string; hero?: string; fmt?: string; uv?: boolean; fam?: string; keeper?: string }
}
export interface Data { people: Person[]; rels: Rel[]; achievements: string[]; achDates?: Record<string, string>; achSeen?: string[]; settings: Settings }

// ---------- utils ----------
export function uid() { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3) }
export function yearOf(d?: string | number) { if (!d) return ''; const m = String(d).match(/\d{4}/); return m ? m[0] : '' }
function debounce<A extends unknown[]>(fn: (...a: A) => void, ms: number) { let h: ReturnType<typeof setTimeout>; return (...a: A) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms) } }

// ---------- state & storage ----------
export let S: Data = { people: [], rels: [], achievements: [], settings: {} }
export function replaceData(d: Data) { S = d }
const KEY = 'predki:tree'
export async function loadState(): Promise<Data | null> {
  try { return (await idbGet<Data>(KEY)) || null } catch { try { return JSON.parse(localStorage.getItem('predki') || 'null') } catch { return null } }
}
const KEY_AT = 'predki:savedAt', KEY_OWNER = 'predki:owner'
export const persist = debounce(async () => {
  try { await idbSet(KEY, S); await idbSet(KEY_AT, Date.now()) } catch { try { localStorage.setItem('predki', JSON.stringify(S)) } catch { /* storage unavailable */ } }
  pushSoon()
}, 300)

// ---------- cloud sync: the browser copy is a cache, the account copy is the source of truth ----------
const blank = (): Data => ({ people: [], rels: [], achievements: [], settings: {} })
let cloudAt = 0, pushWarned = false, syncing: Promise<void> | null = null
const pushSoon = debounce(async () => {
  if (!cloud.session || !cloud.synced) return
  try { cloudAt = await pushTree(S); if (cloud.offline || pushWarned) { cloud.offline = false; pushWarned = false; bump() } }
  catch { cloud.offline = true; if (!pushWarned) { pushWarned = true; toast(t('cloud.saveFail')) } bump() }
}, 1200)
/** Pull the account's tree and reconcile it with this browser. soft = a quiet re-check when the tab comes back. */
export function syncFromCloud(soft = false) {
  if (!syncing) { if (!soft && !cloud.synced) { cloud.busy = true; bump() } syncing = doSync(soft).finally(() => { syncing = null; if (cloud.busy) { cloud.busy = false; bump() } }) }
  return syncing
}
async function doSync(soft: boolean) {
  const uid = cloud.session?.user.id; if (!uid) return
  try {
    const row = await pullTree()
    if (soft && (!row || row.at <= cloudAt + 500)) return
    const owner = await idbGet<string>(KEY_OWNER).catch(() => undefined)
    const localAt = (await idbGet<number>(KEY_AT).catch(() => 0)) || 0
    const cloudHas = !!row && Array.isArray(row.data?.people) && row.data.people.length > 0
    if (owner && owner !== uid && S.people.length) { // someone else's tree left in this browser: keep a copy, never upload it
      await idbSet(KEY + ':backup', S).catch(() => {}); S = { ...blank(), settings: { lang: S.settings.lang, onboarded: true } }
    }
    const localNewer = owner === uid && localAt > (row?.at || 0)
    if (cloudHas && !localNewer) {
      if (S.people.length && !owner) await idbSet(KEY + ':backup', S).catch(() => {}) // a tree made before signing in
      S = migrateDates(Object.assign(blank(), row!.data)); S.settings.onboarded = true; cloudAt = row!.at
      await idbSet(KEY, S).catch(() => {}); await idbSet(KEY_AT, row!.at).catch(() => {})
    } else if (S.people.length || cloudHas) { cloudAt = await pushTree(S) }
    await idbSet(KEY_OWNER, uid).catch(() => {})
    cloud.synced = true; cloud.offline = false
  } catch { cloud.offline = true; if (!soft) toast(t('cloud.loadFail')) }
  if (!soft || cloud.synced) afterLoad()
}
export async function signOut() {
  try { await signOutCloud() } catch { /* offline: the local session is dropped anyway */ }
  cloud.session = null; cloud.synced = false; cloudAt = 0
  S = { ...blank(), settings: { lang: S.settings.lang, onboarded: true } }
  try { await idbDel(KEY); await idbDel(KEY_AT); await idbDel(KEY_OWNER) } catch { /* storage unavailable */ }
  ui.page = 'tree'; ui.panel = null; afterLoad()
}
export function askToSignIn() { setSkipped(false); bump() }
export function continueWithoutAccount() { setSkipped(true); bump() }

// ---------- UI state ----------
export type Page = 'tree' | 'map' | 'progress' | 'people' | 'ai' | 'settings'
export type Panel =
  | { mode: 'view'; id: string }
  | { mode: 'edit'; id: string | null; preset?: Partial<Person> & { _title?: string }; after?: (p: Person) => void; key: number }
  | { mode: 'event'; id: string; eventId: string | null; key: number }
export type Modal = { kind: 'addRelative'; id: string; rel: 'parent' | 'child' | 'spouse' } | null
export interface Toast { id: string; msg: string; kind?: 'ach' }
export interface Draft {
  id: string; first: string; last: string; patronymic: string; maiden: string; gender: string; rel: string
  birthYear: number | ''; birthDate: string; birthPlace: string; deathYear: number | ''; deathPlace: string; job: string
  events: { type: EvType; year: number | ''; place: string; note?: string; conf?: string }[]; spouses: string[]; parents: string[]
  conf: Record<string, string>; selected: boolean; matchId?: string
}
export const ui = {
  page: 'tree' as Page, panel: null as Panel | null, modal: null as Modal, toasts: [] as Toast[],
  /** the profile panel shows the frame settings instead of the profile */
  frameEdit: false,
  onboarding: false, firstRun: false, loaded: false, treeRefit: 0, mapRefit: 0, share: false,
  ai: { mode: 'text' as 'text' | 'audio' | 'photo', drafts: [] as Draft[], busy: false, transcript: '', text: '', ran: false, simulating: false },
}

// ---------- re-render plumbing ----------
let version = 0
const listeners = new Set<() => void>()
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
export function bump() { version++; listeners.forEach(l => l()) }
export function useStore() { return useSyncExternalStore(subscribe, () => version) }

export function commit(quiet = false) { assignPresets(); persist(); Progress.check(quiet); bump() }
export const refresh = bump

export function go(page: Page) { ui.page = page; ui.panel = null; bump() }
export function setLang(l: 'ru' | 'en') { setLangValue(l); S.settings.lang = l; document.documentElement.lang = l; persist(); bump() }
export function toast(msg: string, kind?: 'ach') {
  const id = uid(); ui.toasts = [...ui.toasts, { id, msg, kind }]; bump()
  setTimeout(() => { ui.toasts = ui.toasts.filter(x => x.id !== id); bump() }, 2900)
}
let panelKey = 0
export function openPerson(id: string) { if (!byId(id)) return; ui.panel = { mode: 'view', id }; bump() }
export function editPerson(id: string | null, preset?: Partial<Person> & { _title?: string }, after?: (p: Person) => void) { ui.panel = { mode: 'edit', id, preset, after, key: ++panelKey }; bump() }
export function editEvent(id: string, eventId: string | null) { ui.panel = { mode: 'event', id, eventId, key: ++panelKey }; bump() }
export function closePanel() { ui.panel = null; ui.frameEdit = false; bump() }
export function openModal(m: Modal) { ui.modal = m; bump() }
export function closeModal() { ui.modal = null; bump() }

// ---------- files ----------
export function pickFile(accept: string, cb: (data: string, name: string, mime: string) => void) {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = accept
  inp.onchange = () => { const f = inp.files && inp.files[0]; if (!f) return; if (f.type.startsWith('image/')) shrinkImage(f, 900, data => cb(data, f.name, f.type)); else { const r = new FileReader(); r.onload = () => cb(String(r.result), f.name, f.type); r.readAsDataURL(f) } }
  inp.click()
}
function shrinkImage(file: File, max: number, cb: (d: string) => void) {
  const img = new Image(); const url = URL.createObjectURL(file)
  img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); cb(c.toDataURL('image/jpeg', .85)) }
  img.src = url
}

// ---------- dates: DD.MM.YYYY, typed as digits only; a bare year (or MM.YYYY) is allowed when the exact day is unknown
export function normDate(v?: string) {
  if (!v) return ''; v = String(v).trim(); const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/); if (m) return `${m[3]}.${m[2]}.${m[1]}`
  if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(v)) { const [d, mo, y] = v.split('.'); return `${d.padStart(2, '0')}.${mo.padStart(2, '0')}.${y}` }
  const g = v.replace(/\D/g, ''); if (/[^\d.\s]/.test(v)) return v; if (g.length === 8) return `${g.slice(0, 2)}.${g.slice(2, 4)}.${g.slice(4)}`; if (g.length === 6) return `${g.slice(0, 2)}.${g.slice(2)}`; if (g.length === 4) return g; return v
}
export function maskDigits(g: string) { g = g.slice(0, 8); return g.length > 4 ? `${g.slice(0, 2)}.${g.slice(2, 4)}.${g.slice(4)}` : g.length > 2 ? `${g.slice(0, 2)}.${g.slice(2)}` : g }
export function dateValid(v?: string) {
  if (!v) return true; if (/^\d{4}$/.test(v)) return true; let m = v.match(/^(\d{2})\.(\d{4})$/); if (m) return +m[1] >= 1 && +m[1] <= 12
  m = v.match(/^(\d{2})\.(\d{2})\.(\d{4})$/); if (!m) return false; const d = +m[1], mo = +m[2], y = +m[3]; return mo >= 1 && mo <= 12 && d >= 1 && d <= new Date(y, mo, 0).getDate()
}
/** Attach the ДД.ММ.ГГГГ mask to an input: digits only, dots appear by themselves. */
export function bindDateMask(inp: HTMLInputElement) {
  inp.setAttribute('inputmode', 'numeric'); inp.setAttribute('autocomplete', 'off'); inp.maxLength = 10
  const apply = () => {
    const pos = inp.selectionStart || 0; const before = inp.value.slice(0, pos).replace(/\D/g, '').length; inp.value = maskDigits(inp.value.replace(/\D/g, ''))
    let i = 0, n = 0; while (i < inp.value.length && n < before) { if (/\d/.test(inp.value[i])) n++; i++ }
    if (n === before && inp.value[i] === '.' && before % 2 === 0 && before > 0 && before < 6) i++
    try { inp.setSelectionRange(i, i) } catch { /* not focusable */ } inp.classList.remove('bad')
  }
  const onKey = (e: KeyboardEvent) => { const p = inp.selectionStart || 0; if (e.key === 'Backspace' && p === inp.selectionEnd && p > 0 && inp.value[p - 1] === '.') { e.preventDefault(); inp.value = inp.value.slice(0, p - 2) + inp.value.slice(p); inp.setSelectionRange(p - 2, p - 2); apply() } }
  const onBlur = () => { inp.value = normDate(inp.value); inp.classList.toggle('bad', !dateValid(inp.value)) }
  inp.addEventListener('keydown', onKey); inp.addEventListener('input', apply); inp.addEventListener('blur', onBlur)
  return () => { inp.removeEventListener('keydown', onKey); inp.removeEventListener('input', apply); inp.removeEventListener('blur', onBlur) }
}
export function migrateDates(st: Data) { (st.people || []).forEach(p => { p.birthDate = normDate(p.birthDate); p.deathDate = normDate(p.deathDate) }); return st }

// ---------- people helpers ----------
export const byId = (id: string) => S.people.find(p => p.id === id)
export function fullName(p?: Person | null) { if (!p) return ''; const n = [p.first, p.last].filter(Boolean).join(' '); return n || t('p.unknown') }
export function initials(p: { first?: string; last?: string }) { return ((p.first || '')[0] || '') + ((p.last || '')[0] || '') || '?' }
export function yearsOf(p: Person) { const b = yearOf(p.birthDate), d = yearOf(p.deathDate); if (!b && !d) return ''; return `${b || '…'} – ${d || ''}`.replace(/ – $/, '') }
export function parentsOf(id: string) { return S.rels.filter(r => r.type === 'parent' && r.b === id).map(r => byId(r.a)).filter(Boolean) as Person[] }
export function childrenOf(id: string) { return S.rels.filter(r => r.type === 'parent' && r.a === id).map(r => byId(r.b)).filter(Boolean) as Person[] }
export function spousesOf(id: string) { return S.rels.filter(r => r.type === 'spouse' && (r.a === id || r.b === id)).map(r => byId(r.a === id ? r.b : r.a)).filter(Boolean) as Person[] }
export function siblingsOf(id: string) { const ps = parentsOf(id).map(p => p.id); const set = new Set<string>(); ps.forEach(pid => childrenOf(pid).forEach(c => { if (c.id !== id) set.add(c.id) })); return [...set].map(byId).filter(Boolean) as Person[] }
/** Birth year for choosing a portrait: the real one, else a guess from children (−27) or parents (+27). Never saved. */
function estBirthYear(p: Person) {
  const own = +yearOf(p.birthDate); if (own) return own
  const kids = childrenOf(p.id).map(c => +yearOf(c.birthDate)).filter(Boolean); if (kids.length) return Math.min(...kids) - 27
  const ps = parentsOf(p.id).map(c => +yearOf(c.birthDate)).filter(Boolean); if (ps.length) return Math.max(...ps) + 27
  return 0
}
/** Give everyone a default portrait: chosen once, re-chosen only when gender or age group changes; relatives next to each other get different variants. */
export function assignPresets() {
  let changed = false
  S.people.forEach(p => {
    const type = presetType({ ...p, birthDate: String(estBirthYear(p) || '') }); if (p.preset && typeOfPreset(p.preset) === type) return
    const near = [...parentsOf(p.id), ...childrenOf(p.id), ...spousesOf(p.id), ...siblingsOf(p.id)]
    p.preset = pickPreset(type, new Set(near.map(x => x.preset || ''))); changed = true
  })
  return changed
}
/** What to show in the round portrait: the family photo, else the default silhouette. */
export function avatarSrc(p: Partial<Person>) { return p.avatar || PRESET_SRC[(p.id && byId(p.id) === p && p.preset) || previewPreset(p)] }
export function avatarTint(p: { gender?: string }) { return p.gender === 'f' ? { background: 'rgba(255,205,225,.16)', color: '#F6D3E2' } : p.gender === 'm' ? { background: 'rgba(170,205,255,.16)', color: '#CFE0FA' } : {} }
/** Profile completeness: 8 checks (occupation is optional, files are not counted). */
export function fillPercent(p: Person) { const f = ['first', 'last', 'gender', 'birthDate', 'birthPlace', 'bio', 'avatar'] as const; let n = 0; f.forEach(k => { if (p[k]) n++ }); if (p.events && p.events.length) n++; return Math.round(n / 8 * 100) }
export function generations() {
  const memo: Record<string, number> = {}
  const depth = (id: string): number => { if (memo[id] != null) return memo[id]; memo[id] = 0; const ps = parentsOf(id); memo[id] = ps.length ? 1 + Math.max(...ps.map(p => depth(p.id))) : 0; return memo[id] }
  let max = -1; S.people.forEach(p => { max = Math.max(max, depth(p.id)) }); return max + 1
}
export function addPerson(data?: Partial<Person>): Person {
  const p: Person = Object.assign({ id: uid(), first: '', last: '', maiden: '', patronymic: '', gender: '', birthDate: '', birthPlace: '', deathDate: '', deathPlace: '', job: '', edu: '', bio: '', avatar: '', media: [], events: [] }, data || {})
  S.people.push(p); return p
}
export function addRel(type: Rel['type'], a: string, b: string, from?: string) { if (a === b) return; if (S.rels.some(r => r.type === type && ((r.a === a && r.b === b) || (type === 'spouse' && r.a === b && r.b === a)))) return; S.rels.push({ id: uid(), type, a, b, from: from || '' }) }
export function removePerson(id: string) { S.people = S.people.filter(p => p.id !== id); S.rels = S.rels.filter(r => r.a !== id && r.b !== id) }
/** Birth/death fields on the card double as map events. */
export function syncLifeEvents(p: Person) {
  p.events = p.events || []
  ;([['birth', 'birthDate', 'birthPlace'], ['death', 'deathDate', 'deathPlace']] as const).forEach(([type, dk, pk]) => {
    const y = +yearOf(p[dk]); if (!p[pk] && !y) return; let e = p.events.find(x => x.type === type); const c = findCity(p[pk])
    if (!e) { e = { id: uid(), type, year: '', place: '', lat: null, lon: null, note: '' }; p.events.push(e) }
    if (y) e.year = y; if (p[pk]) { e.place = p[pk]; if (c && e.lat == null) { e.lat = c.lat; e.lon = c.lon } }
  })
}

// ---------- father from patronymic: «Голышев Михаил Иванович» → a card «Иван Голышев» when the father is missing
const PATRO_EXC: Record<string, string> = {'ильич':'Илья','ильинична':'Илья','кузьмич':'Кузьма','кузьминична':'Кузьма','лукич':'Лука','лукинична':'Лука','фомич':'Фома','фоминична':'Фома','никитич':'Никита','никитична':'Никита','саввич':'Савва','саввична':'Савва',
  'михайлович':'Михаил','михайловна':'Михаил','павлович':'Павел','павловна':'Павел','петрович':'Пётр','петровна':'Пётр','львович':'Лев','львовна':'Лев','яковлевич':'Яков','яковлевна':'Яков',
  'шамильевич':'Шамиль','шамильевна':'Шамиль','шамилевич':'Шамиль','шамилевна':'Шамиль','эмильевич':'Эмиль','эмильевна':'Эмиль','рамильевич':'Рамиль','рамильевна':'Рамиль','камильевич':'Камиль','камильевна':'Камиль'}
export function nameFromPatronymic(pt?: string) {
  if (!pt) return ''; const w = pt.trim().toLowerCase().replace(/ё/g, 'е'); if (!/^[а-я-]+$/.test(w)) return ''; if (PATRO_EXC[w]) return PATRO_EXC[w]
  let base = ''; if (/(ович|овна)$/.test(w)) base = w.slice(0, -4)
  else if (/(евич|евна)$/.test(w)) { base = w.slice(0, -4); if (/ь$/.test(base)) base = base.slice(0, -1) + 'ий'; else if (/[аеиоуюя]$/.test(base)) base += 'й'; else base += 'ь' }
  else return ''
  return base.length > 1 ? base[0].toUpperCase() + base.slice(1) : ''
}
function mascForm(s: string) { return s.replace(/(ов|ев|ёв|ин|ын)а$/i, '$1').replace(/ская$/i, 'ский').replace(/цкая$/i, 'цкий') }
function mascSurname(p: Person) {
  let s = (p.gender === 'f' ? (p.maiden || p.last) : p.last) || ''; s = s.trim(); if (!s) return ''
  if (p.gender === 'f') { if (!p.maiden) { const sp = spousesOf(p.id).find(x => x.gender === 'm' && x.last); if (sp && mascForm(s) === sp.last.trim()) return '' } s = mascForm(s) }
  return s
}
export function ensureFathers(ids?: string[]) {
  const made: Person[] = []
  ;(ids || S.people.map(p => p.id)).forEach(id => {
    const p = byId(id); if (!p || !p.patronymic) return
    const ps = parentsOf(id); if (ps.some(x => x.gender === 'm')) return
    const first = nameFromPatronymic(p.patronymic), last = mascSurname(p); if (!first || !last) return
    if (ps.some(x => !x.gender && x.first === first)) return
    const by = +yearOf(p.birthDate) || 0
    let f = S.people.find(x => x.id !== id && x.gender === 'm' && x.first === first && x.last === last && (!by || !(+yearOf(x.birthDate)) || +yearOf(x.birthDate) < by - 12))
    if (!f) { f = addPerson({ first, last, gender: 'm', auto: true, bio: t('auto.father.bio', { name: fullName(p) }) }); made.push(f) }
    addRel('parent', f.id, id); const moms = ps.filter(x => x.gender === 'f'); if (moms.length === 1) addRel('spouse', f.id, moms[0].id)
  })
  return made
}

// ---------- data actions ----------
export function loadSample() { const d = migrateDates(sampleData()); S.people = d.people; S.rels = d.rels; S.achievements = []; ui.treeRefit++; ui.mapRefit++; commit(true) }
export function finishOnboarding(how?: 'sample' | 'blank' | null) {
  ui.onboarding = false; S.settings.onboarded = true
  if (how === 'sample') loadSample()
  else if (how === 'blank') { S.people = []; S.rels = []; commit(); ui.firstRun = true }
  persist(); go('tree')
}
export function importData(d: Partial<Data>) {
  if (!Array.isArray(d.people)) throw new Error('bad json')
  migrateDates(d as Data); S.people = d.people; S.rels = d.rels || []; S.achievements = d.achievements || []; S.achDates = d.achDates || {}
  const made = ensureFathers(); if (made.length) setTimeout(() => toast(t('auto.father', { name: made.map(fullName).join(', ') })), 900)
  ui.treeRefit++; ui.mapRefit++; commit(true)
}
export function clearData() { S.people = []; S.rels = []; S.achievements = []; S.achDates = {}; S.achSeen = []; delete S.settings.familyName; delete S.settings.theme; delete S.settings.meId; ui.firstRun = true; commit() }
/** First run of an empty family: you, your parents, the tree's look. */
export function completeFirstRun(d: { theme: string; familyName: string; me: Partial<Person>; mom: { first: string; last: string }; dad: { first: string; last: string } }) {
  S.settings.theme = d.theme; S.settings.familyName = d.familyName; S.settings.ghosts = true
  const me = addPerson(d.me); syncLifeEvents(me); S.settings.meId = me.id
  const mom = d.mom.first ? addPerson({ first: d.mom.first, last: d.mom.last, gender: 'f' }) : null
  const dad = d.dad.first ? addPerson({ first: d.dad.first, last: d.dad.last, gender: 'm' }) : null
  if (mom) addRel('parent', mom.id, me.id); if (dad) addRel('parent', dad.id, me.id); if (mom && dad) addRel('spouse', dad.id, mom.id)
  ui.firstRun = false; ui.treeRefit++; commit()
  setTimeout(() => toast(t('fr.done', { name: me.first })), 400)
}

// ---------- boot ----------
function afterLoad() {
  const l = S.settings.lang || 'ru' // Russian by default; English only when chosen in the switcher
  setLangValue(l); document.documentElement.lang = l
  Progress.check(true)
  if (assignPresets()) persist()
  if (!S.settings.since) { // first day in Predki: the earliest achievement, otherwise today
    const ds = Object.values(S.achDates || {}).map(v => new Date(v)).filter(d => !isNaN(+d)); const d = ds.length ? new Date(Math.min(...ds.map(Number))) : new Date()
    S.settings.since = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`; persist()
  }
  ui.onboarding = !S.settings.onboarded; ui.firstRun = !!S.settings.onboarded && !S.people.length
  ui.treeRefit++; ui.mapRefit++; bump()
}
export async function boot() {
  const saved = await loadState()
  if (saved && Array.isArray(saved.people)) S = migrateDates(Object.assign(blank(), saved))
  setLangValue(S.settings.lang || 'ru')
  await initSession()
  sb.auth.onAuthStateChange((ev, session) => {
    const was = cloud.session?.user.id; cloud.session = session
    if (ev === 'PASSWORD_RECOVERY') cloud.recovery = true
    if (ev === 'SIGNED_IN' && session && session.user.id !== was) { setSkipped(false); cloud.busy = true; setTimeout(() => syncFromCloud(), 0) } // never await Supabase inside this callback
    if (ev === 'SIGNED_OUT') cloud.synced = false
    bump()
  })
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && cloud.session) syncFromCloud(true) })
  if (cloud.session) await syncFromCloud(); else afterLoad()
  ui.loaded = true; bump()
}
export { t, LANG, cloud }
