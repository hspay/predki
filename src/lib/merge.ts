// Three-way merge of the family document: what this window changed and what another window or device changed
// since the copy both started from (base) are put together, so neither side's edits are lost.
// Pure functions, no app state: core.ts calls merge3() when the cloud copy turns out to be newer than ours.
import type { Data } from './core'

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v)

/** JSON with sorted keys: the database (jsonb) reorders keys, so plain JSON.stringify would see changes that are not there */
export function stable(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(x => x === undefined ? 'null' : stable(x)).join(',') + ']'
  if (isObj(v)) return '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}'
  return v === undefined ? 'undefined' : JSON.stringify(v)
}
export const same = (a: unknown, b: unknown) => stable(a) === stable(b)
/** fields the app fills in by itself (the default portrait): a change there is not an edit that should save a deleted person */
const AUTO = ['preset']
const sameByHand = (a: Obj, b: Obj) => { const strip = (x: Obj) => { const y = { ...x }; AUTO.forEach(k => delete y[k]); return y }; return same(strip(a), strip(b)) }

/** a list of things with their own id (people, links, photos, life events, pets) */
const isIdList = (...vs: unknown[]) => vs.filter(Array.isArray).length >= 2 && vs.every(v => v === undefined || (Array.isArray(v) && v.every(x => isObj(x) && typeof x.id === 'string')))
const isFlatList = (...vs: unknown[]) => vs.every(v => v === undefined || (Array.isArray(v) && v.every(x => x === null || typeof x !== 'object')))

/** The rules, for any value:
 *  – changed on one side only → that side;
 *  – changed on both → lists of things with ids are merged item by item, objects field by field,
 *    plain lists (earned stickers…) are joined, and for one value changed both ways this window wins
 *    (unless here it is empty and there it is filled in);
 *  – deleted on one side and untouched on the other → deleted; deleted on one side but edited on the other → kept. */
export function mergeValue(b: unknown, l: unknown, r: unknown): unknown {
  if (same(l, r)) return l
  if (same(l, b)) return r
  if (same(r, b)) return l
  if (isIdList(b, l, r)) return mergeById((b || []) as Obj[], (l || []) as Obj[], (r || []) as Obj[])
  if (isObj(l) && isObj(r)) {
    const bo = isObj(b) ? b : {}, out: Obj = {}
    new Set([...Object.keys(l), ...Object.keys(r)]).forEach(k => { const v = mergeValue(bo[k], l[k], r[k]); if (v !== undefined) out[k] = v })
    return out
  }
  if (Array.isArray(l) && Array.isArray(r) && isFlatList(l, r)) return [...l, ...r.filter(x => !l.includes(x))]
  return isEmpty(l) && !isEmpty(r) ? r : l // an empty value never wipes out a filled one
}
const isEmpty = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)

function mergeById(b: Obj[], l: Obj[], r: Obj[]) {
  const B = new Map(b.map(x => [x.id as string, x])), L = new Map(l.map(x => [x.id as string, x])), R = new Map(r.map(x => [x.id as string, x]))
  const one = (id: string) => {
    const bi = B.get(id), li = L.get(id), ri = R.get(id)
    if (li && ri) return mergeValue(bi, li, ri) as Obj
    if (li) return bi && sameByHand(li, bi) ? null : li // gone from the other copy: deleted there unless edited here
    if (ri) return bi && sameByHand(ri, bi) ? null : ri
    return null
  }
  const out: Obj[] = []
  l.forEach(x => { const v = one(x.id as string); if (v) out.push(v) })
  r.forEach(x => { if (!L.has(x.id as string)) { const v = one(x.id as string); if (v) out.push(v) } }) // added elsewhere: at the end
  return out
}

/** Merge the whole family document, then tidy what a merge can leave behind: links to people deleted elsewhere,
 *  the same link added in both places, pets without an owner. base = null: the common copy is unknown, nothing is deleted. */
export function merge3(base: Data | null, local: Data, remote: Data): Data {
  const m = JSON.parse(JSON.stringify(mergeValue(base || undefined, local, remote))) as Data
  m.people = m.people || []; m.rels = m.rels || []; m.achievements = m.achievements || []; m.settings = m.settings || {}
  const ids = new Set(m.people.map(p => p.id)), seen = new Set<string>()
  m.rels = m.rels.filter(x => {
    if (!ids.has(x.a) || !ids.has(x.b)) return false
    const k = x.type === 'parent' ? `p:${x.a}:${x.b}` : `${x.type}:${[x.a, x.b].sort().join(':')}`
    if (seen.has(k)) return false
    seen.add(k); return true
  })
  if (m.pets) m.pets = m.pets.filter(p => ids.has(p.owner))
  if (m.settings.meId && !ids.has(m.settings.meId)) delete m.settings.meId
  // counters that never go down (closed chapters, sent links): the bigger one
  const ls = local.settings || {}, rs = remote.settings || {}
  ;(['chapter', 'chReady', 'asked', 'answered'] as const).forEach(k => { const v = Math.max(+(ls[k] || 0), +(rs[k] || 0)); if (v) m.settings[k] = v })
  // the language is this device's choice
  if (ls.lang) m.settings.lang = ls.lang
  return m
}
