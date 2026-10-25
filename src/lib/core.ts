// Predki data layer: one mutable family document (S), saved to IndexedDB, plus the UI state.
// Components read S directly and re-render on bump(); every data change goes through commit().
import { useSyncExternalStore } from 'react'
import { get as idbGet, set as idbSet, del as idbDel, update as idbUpdate } from 'idb-keyval'
import { t, setLangValue, LANG } from './i18n'
import { findCity } from './world'
import { sampleData } from './sample'
import { Progress } from './progress'
import { sync as syncChapters, gate } from './chapters'
import { sb, cloud, initSession, pullTree, saveTree, signOutCloud, setSkipped, deleteAccountCloud, type Row } from './cloud'
import { logProblem, setProblemContext } from './problems'
import { merge3, same } from './merge'
import type { FrameLook } from './frames'
import { PRESET_SRC, presetType, typeOfPreset, pickPreset, previewPreset } from './avatars'
import { onThumbReady, thumb } from './thumbs'
import { goal } from './analytics'
import { mediaUrl, isMissing, isInline, uploadInline, isPermanent, clearMediaCache, onMediaReady, removeAllOwnFiles } from './media'

// ---------- types ----------
export type Gender = '' | 'm' | 'f'
export type EvType = 'birth' | 'move' | 'study' | 'work' | 'service' | 'marriage' | 'death' | 'other'
export interface LifeEvent { id: string; type: EvType; year: number | ''; place: string; lat: number | null; lon: number | null; note: string
  /** a wedding: the full date (ДД.ММ.ГГГГ, also written into the marriage link) and the spouse */
  date?: string; with?: string }
export interface Media { id: string; type: 'photo' | 'doc'; name: string; data: string }
export interface Person {
  id: string; first: string; last: string; maiden: string; patronymic: string; gender: Gender
  birthDate: string; birthPlace: string; deathDate: string; deathPlace: string; job: string; edu: string; bio: string; avatar: string
  media: Media[]; events: LifeEvent[]; auto?: boolean
  /** default portrait (lib/avatars.ts) shown while there is no photo */
  preset?: string
  /** portrait frame on the Tree; none = the usual card */
  frame?: FrameLook
  /** a tree opened by link: the person's place in the owner's elder-first order (lib/invites.ts), for the same layout */
  ord?: number
  /** earlier names (changed after a move, a war, a marriage…); shown under the name and found by search */
  names?: FormerName[]
}
export interface FormerName { id: string; first: string; last: string; patronymic: string; until: string }
/** parent: a → b (step = stepfather / stepmother, adopt = adoptive parent); spouse: a ↔ b (a marriage, or partners); sibling: a ↔ b when they have no shared parent in the tree */
export interface Rel { id: string; type: 'parent' | 'spouse' | 'sibling'; a: string; b: string
  /** a marriage: the wedding date (ДД.ММ.ГГГГ or a year); partners: the year they got together */
  from: string; step?: boolean
  /** an adoptive parent: a parent in every way (siblings, the layout), labelled «приёмный» and drawn dotted */
  adopt?: boolean
  /** a couple who never married: «партнёр / партнёрша», a dashed line */
  partner?: boolean
  /** the marriage (or partnership) is over: «бывший муж», a break in the line; to = the year or date it ended */
  ex?: boolean; to?: string }
export interface Settings {
  lang?: 'ru' | 'en'; onboarded?: boolean; aiUsed?: boolean; aiAudio?: boolean
  /** tree look: background theme, title above the tree, dashed places for unknown ancestors */
  theme?: string; familyName?: string; ghosts?: boolean
  /** links between relatives on the Tree */
  lines?: 'smooth' | 'straight'
  /** kinship labels on the Tree cards («бабушка», «тёща»), on unless switched off */
  kin?: boolean
  /** «you» in the tree and the day the family started using Predki (ДД.ММ.ГГГГ), both shown on the family passport */
  meId?: string; since?: string
  /** last look picked for the family passport */
  share?: { theme?: string; hero?: string; fmt?: string; uv?: boolean; fam?: string; keeper?: string }
  /** chapters (lib/chapters.ts): how many are closed (never goes down), when each closed, stickers marked «не знаю» */
  chapter?: number; chDates?: Record<string, string>; chSkip?: string[]
  /** the furthest chapter already announced (its toast was shown), so the toast comes once */
  chReady?: number
  /** «Попросить заполнить»: links sent and answers accepted (for the «Голоса родных» chapter) */
  asked?: number; answered?: number
}
/** achPasted: stickers the family has pasted into the Album (an earned achievement waits there until it is pasted) */
/** pets (lib/pets.ts): a badge on the owner's card in the Tree; name, kind, years */
export interface Pet { id: string; name: string; kind: string; born: string; died: string; owner: string }
export interface Data { people: Person[]; rels: Rel[]; pets?: Pet[]; achievements: string[]; achDates?: Record<string, string>; achSeen?: string[]; achPasted?: string[]; settings: Settings }

// ---------- utils ----------
export function uid() { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3) }
export function yearOf(d?: string | number) { if (!d) return ''; const m = String(d).match(/\d{4}/); return m ? m[0] : '' }
function debounce<A extends unknown[]>(fn: (...a: A) => void, ms: number) { let h: ReturnType<typeof setTimeout>; return (...a: A) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms) } }

// ---------- state & storage ----------
export let S: Data = { people: [], rels: [], achievements: [], settings: {} }
/** «Смотреть пример древа» (lib/demo.ts): while a demo family is on screen S holds it, the family's own tree waits in `saved`,
 *  and nothing is saved, synced or awarded from S */
export const demo = { on: false, backToEnd: false, saved: null as Data | null }
export function replaceData(d: Data) { S = d }
/** the family's own tree, even while the demo is on screen: everything that loads, saves or syncs works on it, never on the demo */
const own = () => demo.on && demo.saved ? demo.saved : S
function setOwn(d: Data) { if (demo.on && demo.saved) demo.saved = d; else S = d }

/** A tree kept only in this browser (no account, or before signing in). An account's tree is cached under its own key
 *  (cacheKey), so two accounts in one browser never mix — this browser storage is shared by all tabs. */
const KEY = 'predki:tree'
const cacheKey = (id: string) => 'predki:acc:' + id
/** data: the tree; base and ver: the cloud copy it grew from and its version (updated_at); dirty: has edits the cloud has not got yet.
 *  legacyAt: a cache from before this version (one key for any account) — when it was last saved, to decide once whether it is newer */
interface Cache { data: Data; base: Data | null; ver: string | null; dirty: boolean; legacyAt?: number }
export async function loadState(): Promise<Data | null> {
  try { return (await idbGet<Data>(KEY)) || null } catch { try { return JSON.parse(localStorage.getItem('predki') || 'null') } catch { return null } }
}
/** Until now one key held the tree of whichever account signed in last; it moves under that account's own key. */
async function moveLegacyCache() {
  try {
    const was = await idbGet<string>('predki:owner'); if (!was) return
    const data = await idbGet<Data>(KEY), at = (await idbGet<number>('predki:savedAt')) || 0
    if (data && !(await idbGet(cacheKey(was)))) await idbSet(cacheKey(was), { data, base: null, ver: null, dirty: false, legacyAt: at } as Cache)
    await idbDel(KEY); await idbDel('predki:savedAt'); await idbDel('predki:owner')
  } catch { /* storage unavailable */ }
}

// ---------- cloud sync ----------
// The account's copy in the cloud is the source of truth; this browser keeps a cache for a quick start and for offline edits.
// Every save says which cloud version it was built on (ver), and the cloud takes it only if it still holds that version.
// If another window or device saved first, its copy is pulled in and merged with ours (lib/merge.ts) — nothing is overwritten blindly.
const blank = (): Data => ({ people: [], rels: [], achievements: [], settings: {} })
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))
/** whose tree is in this window: an account id, or '' for a tree without an account */
let owner = ''
let base: Data | null = null, ver: string | null = null, dirty = false, legacyAt = 0, edits = 0
/** the window is opening another account's tree: nothing is saved until it has */
let switching = false
let pushWarned = false, syncing: Promise<void> | null = null, pushing: Promise<void> | null = null, afterDemo = false

async function saveLocal() {
  const o = owner, d = own()
  if (o && paused === o) return // the account is being deleted
  try { if (o) await idbSet(cacheKey(o), { data: d, base, ver, dirty, legacyAt } as Cache); else await idbSet(KEY, d) }
  catch { if (!o) try { localStorage.setItem('predki', JSON.stringify(d)) } catch { /* storage unavailable */ } }
}
let missedSave = false
/** Every change is marked at once, not after the short pause before writing: a cloud copy arriving in that pause
 *  must merge with it, not replace it. */
export function persist() {
  if (demo.on) { missedSave = true; return } // asked for just before the demo opened: done when it closes
  if (switching) return
  dirty = true; edits++
  writeSoon()
}
const writeSoon = debounce(async () => {
  if (demo.on || switching) return
  await saveLocal()
  pushSoon()
}, 300)
const pushSoon = debounce(() => { pushNow() }, 1200)
function pushNow() { if (!pushing) pushing = doPush().finally(() => { pushing = null; if (dirty && canPush()) pushSoon() }); return pushing }
/** the account is being deleted (here or in another tab): nothing more is saved to it */
let paused = ''
const canPush = () => !!owner && cloud.synced && !switching && paused !== owner && cloud.session?.user.id === owner
async function doPush() {
  for (let tries = 0; tries < 4; tries++) {
    if (!canPush() || !dirty) return
    const o = owner
    if (hasInlineFiles()) await moveFilesToCloud() // photos go to Storage first, so the tree row stays light
    if (!canPush() || owner !== o) return
    const e = edits, doc = clone(own())
    try {
      const v = await saveTree(o, doc, ver)
      if (owner !== o) return
      if (v) { // saved
        ver = v; base = doc; if (edits === e) dirty = false
        await saveLocal(); tell({ uid: o, ver: v })
        if (cloud.offline || pushWarned) { cloud.offline = false; pushWarned = false; bump() }
        return
      }
      // someone saved first: take their copy, merge ours into it and try again
      const row = await pullTree(o); if (owner !== o) return
      // the cloud refused our version but still holds it: saving cannot work this way — say so rather than lose edits quietly
      if ((row ? row.ver : null) === ver) throw new Error('version check failed')
      if (takeRemote(row) && !demo.on) refreshAfterRemote()
    } catch (e) {
      // a broken version check is our bug, not a lost connection: it is reported at once
      logProblem('save', e, e instanceof Error && e.message === 'version check failed')
      cloud.offline = true; if (!pushWarned) { pushWarned = true; toast(t('cloud.saveFail')) } bump()
      return
    }
  }
}
/** Bring the cloud copy into this window. Nothing edited here → simply take it; edits here → merge them in.
 *  Returns true if the tree on screen changed. */
function takeRemote(row: Row | null): boolean {
  const rv = row ? row.ver : null
  if (rv && rv === ver) return false
  if (!row) { ver = null; base = null; legacyAt = 0; if (own().people.length) dirty = true; return false } // no copy in the cloud (yet): ours goes there
  const remote = migrateDates(Object.assign(blank(), clone(row.data)))
  if (legacyAt) { dirty = dirty || legacyAt > (Date.parse(row.ver) || 0) + 1000; legacyAt = 0 } // first start after the update
  const mine = own(), lang = mine.settings.lang
  let next = remote
  if (dirty) {
    next = merge3(base, mine, remote)
    if (!same(next, mine) && cloud.synced) toast(t('cloud.merged'))
  }
  next.settings.onboarded = true; if (lang) next.settings.lang = lang
  base = clone(remote); ver = row.ver
  if (same(next, mine)) return false
  setOwn(next); return true
}
/** Other tabs of this browser hear about a save at once (a tab in the background also re-checks when it comes back). */
const channel = (() => { try { return new BroadcastChannel('predki-sync') } catch { return null } })()
type Msg = { uid?: string; ver?: string; pause?: string; resume?: string }
function tell(m: Msg) { try { channel?.postMessage(m) } catch { /* closed */ } }
if (channel) channel.onmessage = ev => {
  const m = ev.data as Msg; if (!m) return
  if (m.pause && m.pause === owner) { paused = owner; dirty = false } // the account is being deleted in another tab
  else if (m.resume && m.resume === owner) { paused = ''; dirty = true; pushSoon() } // it was not: our edits go back to the cloud
  else if (m.uid === owner && m.ver !== ver) syncFromCloud(true)
}

/** Pull the account's tree and reconcile it with this window. soft = a quiet re-check (the tab came back, another tab saved). */
export function syncFromCloud(soft = false) {
  if (!syncing) {
    if (!soft && !cloud.synced) { cloud.busy = true; bump() }
    syncing = doSync(soft).finally(() => {
      syncing = null; if (cloud.busy) { cloud.busy = false; bump() }
      if (cloud.session && cloud.session.user.id !== owner) syncFromCloud() // the account changed while this sync ran
    })
  }
  return syncing
}
/** The window now shows account `id`: the previous tree stays in its own place, this account's cached tree comes up. */
async function openAccount(id: string) {
  const prevOwner = owner, prev = own()
  // the previous account's tree goes back to its own place; an edit whose save had not run yet counts as not in the cloud
  if (prevOwner && paused !== prevOwner) idbSet(cacheKey(prevOwner), { data: clone(prev), base, ver, dirty: dirty || !same(prev, base), legacyAt } as Cache).catch(() => {})
  owner = id; switching = true; cloud.synced = false; base = null; ver = null; dirty = false; legacyAt = 0; clearMediaCache()
  setOwn({ ...blank(), settings: { lang: prev.settings.lang, onboarded: true } })
  try {
    const c = await idbGet<Cache>(cacheKey(id)).catch(() => undefined)
    if (owner !== id) return
    if (c && c.data && Array.isArray(c.data.people)) { setOwn(migrateDates(Object.assign(blank(), c.data))); base = c.base; ver = c.ver; dirty = c.dirty; legacyAt = c.legacyAt || 0 }
    // a tree made in this browser before signing in comes along, if the account has none yet (decided once the cloud answers)
    else if (!prevOwner && prev.people.length) adopt = prev
  } finally { if (owner === id) switching = false }
}
let adopt: Data | null = null
async function doSync(soft: boolean) {
  const id = cloud.session?.user.id; if (!id) return
  if (owner !== id) { if (owner) toast(t('cloud.otherAccount')); await openAccount(id); soft = false }
  let changed = false
  try {
    const row = await pullTree(id)
    if (owner !== id) return
    if (adopt) {
      const guest = adopt; adopt = null
      if (!row || !Array.isArray(row.data?.people) || !row.data.people.length) { setOwn(guest); dirty = true; ver = row ? row.ver : null; base = row ? clone(row.data) : null; changed = true }
      else await idbSet(KEY + ':backup', guest).catch(() => {}) // the account already has a tree: the one made before signing in is kept aside
      await idbDel(KEY).catch(() => {})
    }
    if (!(cloud.synced && (row ? row.ver : null) === ver)) changed = takeRemote(row) || changed
    cloud.synced = true; cloud.offline = false
    await saveLocal()
    if (dirty) pushNow()
  } catch (e) { logProblem('load', e); cloud.offline = true; if (!soft) toast(t('cloud.loadFail')) }
  if (owner !== id) return
  if (demo.on) { afterDemo = afterDemo || changed || !soft; return } // the demo is on screen: the own tree is updated quietly, shown when it closes
  if (!soft) afterLoad(); else if (changed) refreshAfterRemote()
}
/** fresh edits from another window are on screen: recount progress, keep the view where it is (no re-fit of the Tree) */
function refreshAfterRemote() { assignPresets(); Progress.check(true); syncChapters(true); ui.firstRun = !!S.settings.onboarded && !S.people.length; bump() }
/** lib/demo.ts: the demo closed and the own tree is back in S */
export function demoClosed() {
  if (afterDemo) { afterDemo = false; afterLoad() }
  if (missedSave) { missedSave = false; persist() } else if (dirty && canPush()) pushSoon()
}

/** This window's account is gone (signed out here or in another tab): show the sign-in screen with an empty tree. */
function closeAccount() {
  const o = owner, keep = dirty, prev = own(), was = { base, ver, legacyAt }
  owner = ''; cloud.synced = false; base = null; ver = null; dirty = false; legacyAt = 0; clearMediaCache()
  setOwn({ ...blank(), settings: { lang: own().settings.lang, onboarded: true } })
  // nothing of the account stays in this browser — unless it has edits that never reached the cloud: they wait for the next sign-in
  // (written here and now: the usual save comes a moment after an edit, and by then the window holds no account)
  if (o && keep) idbSet(cacheKey(o), { data: clone(prev), base: was.base, ver: was.ver, dirty: true, legacyAt: was.legacyAt } as Cache).catch(() => {})
  // another tab of this account may have just put its unsaved edits there: the copy is cleared in one step, and only without them
  else if (o && paused === o) idbDel(cacheKey(o)).catch(() => {}) // the account was deleted: nothing of it stays, edits included
  else if (o) idbUpdate<Cache | undefined>(cacheKey(o), c => c && c.dirty ? c : undefined)
    .then(() => idbGet(cacheKey(o))).then(c => { if (c === undefined) return idbDel(cacheKey(o)) }).catch(() => {})
  idbDel(KEY).catch(() => {})
  ui.page = 'tree'; ui.panel = null; afterLoad()
}
export async function signOut() {
  if (dirty && canPush()) await Promise.race([pushNow(), new Promise(r => setTimeout(r, 5000))]) // the last edits reach the cloud first
  try { await signOutCloud() } catch { /* offline: the local session is dropped anyway */ }
  cloud.session = null
  if (owner) closeAccount()
}
/** Delete the account for good: files in Storage, then the tree, links for relatives, their answers and the account itself.
 *  Other tabs stop saving first, so none of them brings the tree back. Throws 'not_ready' without a connection. */
export async function deleteAccount() {
  const id = cloud.session?.user.id
  if (!id || owner !== id || !cloud.synced) throw new Error('not_ready')
  await deleteAccountCloud(false) // the database part is set up and allowed: only then is anything deleted
  paused = id; tell({ pause: id })
  try {
    await removeAllOwnFiles(id)
    await deleteAccountCloud(true)
  } catch (e) { paused = ''; tell({ resume: id }); logProblem('delete-account', e, true); throw e }
  goal('account_delete')
  dirty = false
  await Promise.all([cacheKey(id), KEY + ':backup', KEY + ':before-storage'].map(k => idbDel(k).catch(() => {})))
  try { await sb.auth.signOut({ scope: 'local' }) } catch { /* the account is gone anyway */ }
  cloud.session = null
  if (owner) closeAccount()
}
export function askToSignIn() { setSkipped(false); bump() }
export function continueWithoutAccount() { goal('no_account'); setSkipped(true); bump() }

// ---------- UI state ----------
export type Page = 'tree' | 'map' | 'progress' | 'gaps' | 'keeper' | 'book' | 'settings' // 'ai' (Архивариус) is archived: _backup/archivist-page
export type Panel =
  | { mode: 'view'; id: string }
  | { mode: 'pet'; id: string }
  | { mode: 'petEdit'; id: string | null; owner: string; key: number }
  | { mode: 'edit'; id: string | null; preset?: Partial<Person> & { _title?: string; _rel?: RelKind }; after?: (p: Person, v: RelVariant) => void; key: number }
  | { mode: 'event'; id: string; eventId: string | null; key: number }
/** how someone is related to the person whose profile is open */
export type RelKind = 'parent' | 'adopt' | 'step' | 'spouse' | 'partner' | 'ex' | 'child' | 'adoptchild' | 'stepchild' | 'sibling'
/** how a new relative from «+ Родитель», «+ Супруг(а)», «+ Ребёнок» is related: by birth (or married), adopted, a step-relative, a partner */
export type RelVariant = 'own' | 'adopt' | 'step' | 'partner'
export type Modal = { kind: 'link'; id: string } | { kind: 'pair'; a: string; b: string } | null
export interface Toast { id: string; msg: string; kind?: 'ach'; sticker?: string; act?: { label: string; run: () => void } }
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
  /** the «Семья» block of the profile shows remove buttons and «Связать» */
  relEdit: false,
  onboarding: false, firstRun: false, loaded: false, treeRefit: 0, mapRefit: 0, share: false,
  /** «Календарь семьи» is open over the page */
  calendar: false,
  /** the demo tree is open (lib/demo.ts): which family, and when the page opened (0 = no growth animation) */
  demo: null as null | { fam: string; intro: number },
  /** the Album: open section and the sticker whose card is open */
  album: { tab: '', sheet: null as string | null },
  /** a chapter has just closed: the board shows from → to (numbers of closed chapters) */
  levelUp: null as null | { from: number; to: number },
  /** a closed part of the app was tapped: its lock sheet is open */
  lock: null as null | import('./chapters').Feature,
  ai: { mode: 'text' as 'text' | 'audio' | 'photo', drafts: [] as Draft[], busy: false, transcript: '', text: '', ran: false, simulating: false },
}

// ---------- re-render plumbing ----------
let version = 0
const listeners = new Set<() => void>()
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
export function bump() { version++; listeners.forEach(l => l()) }
export function useStore() { return useSyncExternalStore(subscribe, () => version) }

export function commit(quiet = false) { if (demo.on) { bump(); return } assignPresets(); persist(); Progress.check(quiet); syncChapters(quiet); bump() }
onMediaReady(bump); onThumbReady(bump)

// ---------- photos & documents in Supabase Storage (lib/media.ts) ----------
// Every place a file can sit in the tree: the portrait and each gallery item.
// Files are never deleted automatically: a photo that is replaced or removed simply stays in Storage. An older copy of the tree
// (another tab, device or account) could still point to it, and a deleted file is gone for good (claude/sync-and-files-safety.md).
interface Slot { p: Person; kind: string; get: () => string; set: (v: string) => void }
function fileSlots(): Slot[] {
  const out: Slot[] = []
  own().people.forEach(p => {
    if (p.avatar) out.push({ p, kind: 'avatar', get: () => p.avatar, set: v => { p.avatar = v } })
    ;(p.media || []).forEach(m => out.push({ p, kind: m.type, get: () => m.data, set: v => { m.data = v } }))
  })
  return out
}
const refused = new Set<string>() // inline files the bucket will not take (type/size): they stay in the tree
const hasInlineFiles = () => fileSlots().some(x => isInline(x.get()) && !refused.has(x.get()))
let moving: Promise<void> | null = null, movedBackup = false, moveWarned = false
/** Upload inline photos (new ones, old ones from before Storage, ones added without an account) and keep only references. */
function moveFilesToCloud() {
  if (!canPush()) return Promise.resolve()
  if (!moving) moving = doMoveFiles().finally(() => { moving = null })
  return moving
}
async function doMoveFiles() {
  const o = owner, slots = fileSlots().filter(x => isInline(x.get()) && !refused.has(x.get())); if (!slots.length) return
  if (!movedBackup) { movedBackup = true; await idbSet(KEY + ':before-storage', clone(own())).catch(() => {}) }
  let moved = 0, failed = 0
  for (const x of slots) {
    if (owner !== o || !canPush()) return // the account changed in another tab: its folder is not this tree's place
    const data = x.get()
    try {
      const ref = await uploadInline(data, x.p.id, x.kind, o)
      if (owner === o && own().people.includes(x.p) && x.get() === data) { x.set(ref); moved++ } // changed while uploading: the file just stays unused
    } catch (e) { if (isPermanent(e)) refused.add(data); else { failed++; logProblem('upload', e) } }
  }
  if (moved && owner === o) { await saveLocal(); bump() }
  if (failed && !moveWarned) { moveWarned = true; toast(t('media.later')) }
  if (!failed) moveWarned = false
}
export const refresh = bump

export function go(page: Page) { if ((page === 'map' || page === 'book') && !demo.on && !gate(page)) return; ui.page = page; ui.panel = null; bump() }
// Language: Russian by default for now. Only a language the person picked in the RU/EN switcher on this device counts
// (old builds could save English automatically from the browser language, so the saved data value is ignored).
// TODO before the App Store release: when nothing was picked, follow the device language instead of 'ru'.
const LANG_KEY = 'predki:lang'
function pickedLang(): 'ru' | 'en' { try { return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'ru' } catch { return 'ru' } }
export function setLang(l: 'ru' | 'en') { try { localStorage.setItem(LANG_KEY, l) } catch { /* private mode */ } setLangValue(l); S.settings.lang = l; document.documentElement.lang = l; persist(); bump() }
export function toast(msg: string, kind?: 'ach', extra?: Pick<Toast, 'sticker' | 'act'>) {
  const id = uid(); ui.toasts = [...ui.toasts, { id, msg, kind, ...extra }].slice(-3); bump()
  setTimeout(() => dropToast(id), kind === 'ach' ? 5200 : 2900) // a new sticker stays a bit longer
}
export function dropToast(id: string) { if (ui.toasts.some(x => x.id === id)) { ui.toasts = ui.toasts.filter(x => x.id !== id); bump() } }
let panelKey = 0
export function openPerson(id: string) { if (!byId(id)) return; if (ui.panel?.mode !== 'view' || ui.panel.id !== id) ui.relEdit = false; ui.panel = { mode: 'view', id }; bump() }
export function editPerson(id: string | null, preset?: Partial<Person> & { _title?: string; _rel?: RelKind }, after?: (p: Person, v: RelVariant) => void) { ui.panel = { mode: 'edit', id, preset, after, key: ++panelKey }; bump() }
export function editEvent(id: string, eventId: string | null) { ui.panel = { mode: 'event', id, eventId, key: ++panelKey }; bump() }
export function openPet(id: string) { ui.panel = { mode: 'pet', id }; bump() }
export function editPet(id: string | null, owner: string) { ui.panel = { mode: 'petEdit', id, owner, key: ++panelKey }; bump() }
export function closePanel() { ui.panel = null; ui.frameEdit = false; ui.relEdit = false; bump() }
/** a person was just added: the form closes and the Tree shows the new branch growing — everything was just typed in, the card would only cover it (phone and wide screen alike) */
export function showNewPerson(_id: string) { closePanel() }
export function openModal(m: Modal) { ui.modal = m; bump() }
export function closeModal() { ui.modal = null; bump() }

// ---------- files ----------
/** max: the longest side a picture is shrunk to; portraits 900 px, gallery photos and document scans larger so they stay readable */
export function pickFile(accept: string, cb: (data: string, name: string, mime: string) => void, max = 900) {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = accept
  inp.onchange = () => { const f = inp.files && inp.files[0]; if (!f) return; if (f.type.startsWith('image/')) shrinkImage(f, max, data => cb(data, f.name, f.type)); else { const r = new FileReader(); r.onload = () => cb(String(r.result), f.name, f.type); r.readAsDataURL(f) } }
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
/** «0284» → «284»: years before 1000 (the Westeros calendar of a demo family) are stored with leading zeros */
export const showYear = (y: string) => y.replace(/^0+(?=\d)/, '')
export function yearsOf(p: Person) { const b = showYear(yearOf(p.birthDate)), d = showYear(yearOf(p.deathDate)); if (!b && !d) return ''; return `${b || '…'} – ${d || ''}`.replace(/ – $/, '') }
// parents / children are by birth (or adoption); stepfathers and stepmothers are kept apart
export function parentsOf(id: string) { return S.rels.filter(r => r.type === 'parent' && !r.step && r.b === id).map(r => byId(r.a)).filter(Boolean) as Person[] }
export function childrenOf(id: string) { return S.rels.filter(r => r.type === 'parent' && !r.step && r.a === id).map(r => byId(r.b)).filter(Boolean) as Person[] }
export function stepParentsOf(id: string) { return S.rels.filter(r => r.type === 'parent' && r.step && r.b === id).map(r => byId(r.a)).filter(Boolean) as Person[] }
export function stepChildrenOf(id: string) { return S.rels.filter(r => r.type === 'parent' && r.step && r.a === id).map(r => byId(r.b)).filter(Boolean) as Person[] }
/** brothers and sisters linked directly (no shared parent in the tree yet) */
export function linkedSiblingsOf(id: string) { return S.rels.filter(r => r.type === 'sibling' && (r.a === id || r.b === id)).map(r => byId(r.a === id ? r.b : r.a)).filter(Boolean) as Person[] }
/** the marriage or partnership link between two people */
export function coupleRel(a: string, b: string) { return S.rels.find(r => r.type === 'spouse' && ((r.a === a && r.b === b) || (r.a === b && r.b === a))) }
/** spouses and partners the person is still with (not the former ones) */
export function currentSpousesOf(id: string) { return S.rels.filter(r => r.type === 'spouse' && !r.ex && (r.a === id || r.b === id)).map(r => byId(r.a === id ? r.b : r.a)).filter(Boolean) as Person[] }
export function adoptParentsOf(id: string) { return S.rels.filter(r => r.type === 'parent' && r.adopt && r.b === id).map(r => byId(r.a)).filter(Boolean) as Person[] }
export function adoptChildrenOf(id: string) { return S.rels.filter(r => r.type === 'parent' && r.adopt && r.a === id).map(r => byId(r.b)).filter(Boolean) as Person[] }
/** «1978 – 1991»: the years of a couple (an ended one gets its end too) */
export function coupleYears(r: Rel) { const a = showYear(yearOf(r.from)), b = showYear(yearOf(r.to)); return r.ex ? (a || b ? `${a || '…'} – ${b || '…'}` : '') : a }
export function spousesOf(id: string) { return S.rels.filter(r => r.type === 'spouse' && (r.a === id || r.b === id)).map(r => byId(r.a === id ? r.b : r.a)).filter(Boolean) as Person[] }
export function siblingsOf(id: string) { const ps = parentsOf(id).map(p => p.id); const set = new Set<string>(); ps.forEach(pid => childrenOf(pid).forEach(c => { if (c.id !== id) set.add(c.id) })); linkedSiblingsOf(id).forEach(x => set.add(x.id)); return [...set].map(byId).filter(Boolean) as Person[] }
/** «Голышев Иван (до 1946)» — earlier names in one line */
export function formerNames(p: Person) { return (p.names || []).map(n => { const s = [n.first, n.patronymic, n.last].filter(Boolean).join(' '); return n.until ? `${s} (${t('p.names.upto')} ${n.until})` : s }).filter(Boolean) }
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
/** the default portrait key of a saved person (or a stable preview for a form) */
export function presetOf(p: Partial<Person>) { return (p.id && byId(p.id) === p && p.preset) || previewPreset(p) }
/** What to show in the round portrait: the family photo, else the default colour silhouette (picked by gender and age). */
/** the portrait: the photo, or the drawn one when there is none or its file is gone from Storage */
export function avatarSrc(p: Partial<Person>) { return p.avatar && !isMissing(p.avatar) ? mediaUrl(p.avatar) : PRESET_SRC[presetOf(p)] }
/** the same for small places (Tree cards, lists): a light copy of a photo instead of the full one (lib/thumbs.ts) */
export function avatarSmall(p: Partial<Person>) { const s = avatarSrc(p); return p.avatar && !isMissing(p.avatar) ? thumb(s) : s }
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
export function addRel(type: Rel['type'], a: string, b: string, from?: string, step?: boolean, extra?: Partial<Pick<Rel, 'adopt' | 'partner' | 'ex' | 'to'>>) {
  if (a === b) return; const sym = type !== 'parent'
  if (S.rels.some(r => r.type === type && ((r.a === a && r.b === b) || (sym && r.a === b && r.b === a)))) return
  S.rels.push(Object.assign(step ? { id: uid(), type, a, b, from: from || '', step: true } : { id: uid(), type, a, b, from: from || '' }, extra || {}))
}
export function removePerson(id: string) { S.people = S.people.filter(p => p.id !== id); S.rels = S.rels.filter(r => r.a !== id && r.b !== id); if (S.pets) S.pets = S.pets.filter(p => p.owner !== id) }
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
export function mascForm(s: string) { return s.replace(/(ов|ев|ёв|ин|ын)а$/i, '$1').replace(/ская$/i, 'ский').replace(/цкая$/i, 'цкий') }
/** a family surname in the right form for a man or a woman: Ершова → Ершов, Журавский → Журавская */
export function surnameFor(s: string, g: Gender) {
  if (!s || !g) return s; const m = mascForm(s.trim())
  return g === 'm' ? m : m.replace(/(ов|ев|ёв|ин|ын)$/i, '$1а').replace(/ский$/i, 'ская').replace(/цкий$/i, 'цкая')
}
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
export function loadSample() { const d = migrateDates(sampleData()); S.people = d.people; S.rels = d.rels; S.achievements = []; S.achPasted = []; ui.treeRefit++; ui.mapRefit++; commit(true) }
export function finishOnboarding(how?: 'sample' | 'blank' | null) {
  ui.onboarding = false; S.settings.onboarded = true
  if (how === 'sample') loadSample()
  else if (how === 'blank') { S.people = []; S.rels = []; commit(); ui.firstRun = true }
  persist(); go('tree')
}
export function importData(d: Partial<Data>) {
  if (!Array.isArray(d.people)) throw new Error('bad json')
  migrateDates(d as Data); S.people = d.people; S.rels = d.rels || []; S.achievements = d.achievements || []; S.achDates = d.achDates || {}
  // an older backup has no Album: everything earned counts as pasted, so the stickers do not all come back as new
  S.pets = Array.isArray(d.pets) ? d.pets.filter(p => p && p.owner && d.people!.some(x => x.id === p.owner)) : []
  S.achPasted = Array.isArray(d.achPasted) ? d.achPasted : [...S.achievements]; S.achSeen = Array.isArray(d.achSeen) ? d.achSeen : [...S.achievements]
  // «you», the title above the tree, its look and the first day come back too (an older backup has none of them)
  if (d.settings) { const keep = ['meId', 'since', 'familyName', 'theme', 'lines', 'kin', 'ghosts', 'share'] as const; keep.forEach(k => { if (d.settings![k] !== undefined) (S.settings as Record<string, unknown>)[k] = d.settings![k] }) }
  if (S.settings.meId && !S.people.some(p => p.id === S.settings.meId)) delete S.settings.meId
  const made = ensureFathers(); if (made.length) setTimeout(() => toast(t('auto.father', { name: made.map(fullName).join(', ') })), 900)
  ui.treeRefit++; ui.mapRefit++; commit(true)
}
export function clearData() {
  S.people = []; S.rels = []; S.pets = []; S.achievements = []; S.achDates = {}; S.achSeen = []; S.achPasted = []; delete S.settings.familyName; delete S.settings.theme; delete S.settings.meId; ui.firstRun = true; commit()
  // «Очистить всё» is a deliberate request: once the empty tree is in the cloud, the photos and documents go too (as the privacy policy says)
  const o = owner
  if (o && canPush()) pushNow().then(() => { if (owner === o && !dirty && !own().people.length) removeAllOwnFiles(o).catch(e => logProblem('clear-files', e)) })
}
/** First run of an empty family: you, your parents, the tree's look. */
export function completeFirstRun(d: { theme: string; familyName: string; me: Partial<Person>; mom: { first: string; last: string }; dad: { first: string; last: string } }) {
  goal('first_tree')
  S.settings.theme = d.theme; S.settings.familyName = d.familyName; S.settings.ghosts = true
  const me = addPerson(d.me); syncLifeEvents(me); S.settings.meId = me.id
  const mom = d.mom.first ? addPerson({ first: d.mom.first, last: d.mom.last, gender: 'f' }) : null
  const dad = d.dad.first ? addPerson({ first: d.dad.first, last: d.dad.last, gender: 'm' }) : null
  if (mom) addRel('parent', mom.id, me.id); if (dad) addRel('parent', dad.id, me.id); if (mom && dad) addRel('spouse', dad.id, mom.id)
  // show the tree first, then save: the first achievement pops up once the new tree is on screen
  ui.firstRun = false; ui.treeRefit++; persist(); bump()
  setTimeout(() => commit(), 700)
}

// ---------- boot ----------
function afterLoad() {
  const l = pickedLang(); S.settings.lang = l
  setLangValue(l); document.documentElement.lang = l
  Progress.check(true); syncChapters(true)
  if (assignPresets()) persist()
  if (!S.settings.since) { // first day in Predki: the earliest achievement, otherwise today
    const ds = Object.values(S.achDates || {}).map(v => new Date(v)).filter(d => !isNaN(+d)); const d = ds.length ? new Date(Math.min(...ds.map(Number))) : new Date()
    S.settings.since = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`; persist()
  }
  // a link from our e-mail (a new password, or one that no longer works) goes straight to the sign-in card, not to the landing
  ui.onboarding = !S.settings.onboarded && !cloud.recovery && !cloud.linkError; ui.firstRun = !!S.settings.onboarded && !S.people.length
  ui.treeRefit++; ui.mapRefit++; bump()
}
setProblemContext(() => ({ screen: demo.on ? 'demo' : ui.page, people: own().people.length, synced: cloud.synced, offline: cloud.offline, unsaved: dirty, lang: LANG }))
export async function boot() {
  await moveLegacyCache()
  const saved = await loadState()
  if (saved && Array.isArray(saved.people)) S = migrateDates(Object.assign(blank(), saved))
  // preview build: no account, no landing — straight into the first-run dialog of an empty family
  if (import.meta.env.VITE_PREVIEW === '1') { setSkipped(true); S.settings.onboarded = true }
  setLangValue(pickedLang()); document.documentElement.lang = pickedLang()
  await initSession()
  // Sign-in is shared by all tabs of a browser: signing into another account (or out) in one tab changes it in the others too.
  sb.auth.onAuthStateChange((ev, session) => {
    const was = cloud.session?.user.id; cloud.session = session
    if (ev === 'PASSWORD_RECOVERY') cloud.recovery = true
    if (ev === 'SIGNED_IN') cloud.linkError = false
    if (ev === 'SIGNED_IN' && session && session.user.id !== owner) { if (session.user.id !== was) goal('sign_in'); setSkipped(false); cloud.busy = true; setTimeout(() => syncFromCloud(), 0) } // never await Supabase inside this callback
    if (ev === 'SIGNED_OUT') setTimeout(() => { if (!cloud.session && owner) closeAccount() }, 0)
    bump()
  })
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && cloud.session) syncFromCloud(true) })
  window.addEventListener('online', () => { if (cloud.session) syncFromCloud(true) })
  if (cloud.session) await syncFromCloud(); else afterLoad()
  ui.loaded = true; bump()
}
export { t, LANG, cloud }
