// «Смотреть пример древа»: a read-only demo of the Tree with three famous families.
// The demo swaps the family document (S) for a ready-made one while it is open and puts the visitor's own back when it closes.
// Nothing here is ever saved: core.ts skips persist / commit / cloud sync while `demo.on` is true.
import { S, ui, bump, replaceData, finishOnboarding, closePanel, demoClosed, demo, LANG, type Data, type Person, type Rel } from './core'
import { PRESET_TYPES, presetType } from './avatars'
import { goal } from './analytics'

import type { DemoFamily, Two } from './demoFamilies'
export type { DemoFamily } from './demoFamilies'

/** a friendship link inside the demo document: it is not one of the app's link types, the Tree draws it only in the demo */
export const FRIEND = 'friend' as Rel['type']

/** the families arrive with the first opening of the demo */
export let FAMILIES: DemoFamily[] = []
let loading: Promise<void> | null = null
export function loadFamilies() { return loading || (loading = import('./demoFamilies').then(m => { FAMILIES = m.FAMILIES })) }
export const famOf = (k?: string) => FAMILIES.find(f => f.k === k) || FAMILIES[0]
export const tr = (x?: Two) => (x ? (LANG === 'en' ? x[1] : x[0]) : '')

// ---------------------------------------------------------------- building the family document
/** a stable pseudo-random sequence, so the portraits are the same on every visit */
function seeded(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296 } }

export function buildFamily(f: DemoFamily): Data {
  const en = LANG === 'en', place = (k?: string) => (k ? (en ? f.places[k][1] : f.places[k][0]) : '')
  const people: Person[] = f.people.map(x => ({
    id: x.id, first: en ? x.n[2] : x.n[0], last: en ? x.n[3] : x.n[1], maiden: x.was ? (en ? x.was[1] : x.was[0]) : '', patronymic: '', gender: x.g,
    birthDate: x.b || '', birthPlace: x.minor ? '' : place(x.bp), deathDate: x.d || '', deathPlace: place(x.dp),
    job: '', edu: '', bio: '', avatar: '', media: [], events: [],
  }))
  const rels: Rel[] = f.rels.map(([type, a, b, from, flags, to], i) => {
    const r: Rel = { id: 'r' + i, type, a, b, from: from || '' }, fl = (flags || '').split(' ')
    if (fl.includes('step')) r.step = true; if (fl.includes('adopt')) r.adopt = true; if (fl.includes('partner')) r.partner = true
    if (fl.includes('ex')) { r.ex = true; if (to) r.to = to }
    return r
  })
  ;(f.friends || []).forEach(([a, b], i) => rels.push({ id: 'f' + i, type: FRIEND, a, b, from: '' }))
  // portraits: by the age they had (at death, or in the family's «now»), different from the people right next to them
  const rnd = seeded(f.k), near = (id: string) => rels.filter(r => r.a === id || r.b === id).map(r => (r.a === id ? r.b : r.a))
  const byId = (id: string) => people.find(p => p.id === id)!
  f.people.forEach(x => {
    const p = byId(x.id)
    const type = x.look || presetType({ gender: x.g, birthDate: x.b, deathDate: x.d || String(f.now) })
    const taken = new Set(near(x.id).map(id => byId(id).preset || '')), list = PRESET_TYPES[type], free = list.filter(v => !taken.has(v))
    const pool = free.length ? free : list; p.preset = pool[Math.floor(rnd() * pool.length)]
  })
  if (f.frame) (f.frameAll ? people : [byId(f.face)]).forEach(p => { p.frame = { ...f.frame! } })
  // real photos: small files next to the site, loaded only when this family opens
  ;(f.photos || []).forEach(id => { const p = people.find(x => x.id === id); if (p) p.avatar = `demo/${f.k}/${id}.webp` })
  // pets: Westeros years lose their leading zeros («0298» → «298»)
  const yr = (v?: string) => (v ? String(+v || v) : '')
  const pets = (f.pets || []).map(([owner, name, kind, born, died], i) => ({ id: 'pet' + i, owner, name: tr(name), kind, born: yr(born), died: yr(died) }))
  return { people, rels, pets, achievements: [], settings: { familyName: tr(f.title), theme: f.theme, ghosts: false, lines: 'smooth', kin: true, meId: f.face } }
}

/** person id → how they are related to the face, for what the rules cannot work out */
export function kinOverrides(f: DemoFamily) {
  const out: Record<string, string> = { [f.face]: tr(f.faceLabel) }
  Object.entries(f.kin || {}).forEach(([id, v]) => { out[id] = tr(v) })
  return out
}

/** «How many steps» from the face to everyone, through any link: the order in which the tree grows on first open */
export function distances(faceId: string) {
  const d: Record<string, number> = { [faceId]: 0 }, q = [faceId]
  while (q.length) { const x = q.shift()!; S.rels.forEach(r => { const o = r.a === x ? r.b : r.b === x ? r.a : null; if (o && d[o] == null) { d[o] = d[x] + 1; q.push(o) } }) }
  return d
}

// ---------------------------------------------------------------- open / switch / close
const hashFor = (k: string) => '#demo=' + k
function setHash(h: string) { try { history.replaceState(null, '', location.pathname + location.search + h) } catch { /* sandboxed */ } }
/** the demo can be opened by a link: …/#demo or …/#demo=kardashian */
export function demoFromHash() { const m = location.hash.match(/^#demo(?:=([a-z]+))?$/); return m ? m[1] || '' : null }

function load(k: string) {
  replaceData(buildFamily(famOf(k)))
  ui.panel = null; ui.treeRefit++
  setHash(hashFor(k))
}
export async function openDemo(k?: string) {
  await loadFamilies()
  if (!demo.on) { demo.saved = S; demo.on = true }
  const fam = famOf(k).k
  // the tree grows from the face only the first time the page opens, not when the family is switched
  ui.demo = { fam, intro: Date.now() }
  goal('demo_open', { family: fam })
  closePanel(); load(fam); bump()
}
export function switchDemo(k: string) {
  if (!ui.demo || ui.demo.fam === k) return
  ui.demo = { fam: k, intro: 0 }; load(k); bump(); goal('demo_family', { family: k })
}
/** leave the demo: back to the landing, or (start) straight into building one's own tree */
export function closeDemo(start = false) {
  if (!demo.on) return
  if (start) goal('demo_build', { family: ui.demo?.fam || '' })
  if (demo.saved) replaceData(demo.saved); demo.saved = null; demo.on = false
  demoClosed() // the own tree is saved and, if the cloud brought news while the demo was on, refreshed
  ui.demo = null; ui.panel = null; ui.treeRefit++; ui.mapRefit++
  setHash('')
  if (start) finishOnboarding(S.people.length ? null : 'blank')
  else { demo.backToEnd = true; if (!S.settings.onboarded) ui.onboarding = true }
  bump()
}
