// «Попросить заполнить»: a link that opens a light, read-only copy of the tree for a relative without an account.
// The relative suggests what they know; the answer comes back to the owner, who accepts or declines each line.
// Server side: supabase/share-links.sql (tables share_links + suggestions, functions shared_tree + submit_suggestion).
import { sb, cloud } from './cloud'
import { S, LANG, bump, byId, fullName, yearOf, uid, addPerson, syncLifeEvents, commit, spousesOf, type Person, type EvType, type Rel } from './core'
import { linkPeople } from './relations'
import { findCity } from './world'
import { rootPerson } from './treeLayout'
import { goal } from './analytics'
import { familyTitle } from './treeStyle'
import type { Gap } from './gaps'

/** What the relative sees: names, relations, dates and places. No photos, documents, stories or notes. */
export interface Snapshot {
  v: 1; lang: 'ru' | 'en'; made: string
  owner: string; ownerId: string | null; family: string
  /** the relative the link was made for (labels and the question are worded for them) */
  to: string | null
  gap: { id: string; a: number; b: number; kind: 'mid' | 'tail' } | null
  people: Person[]; rels: Rel[]
}
/** One line of an answer. `id` — the person it is about. */
export type Item =
  | { t: 'field'; id: string; f: 'birthDate' | 'birthPlace' | 'deathDate' | 'deathPlace'; v: string; st?: Decision }
  | { t: 'event'; id: string; ev: { type: EvType; year: number | ''; place: string; note: string }; st?: Decision }
  | { t: 'wedding'; id: string; with: string; v: string; st?: Decision }
  | { t: 'story'; id: string; v: string; st?: Decision }
  | { t: 'person'; first: string; last: string; gender: '' | 'm' | 'f'; birth: string; kind: 'parent' | 'child' | 'spouse' | 'sibling'; of: string; note: string; st?: Decision }
  | { t: 'note'; v: string; st?: Decision }
export type Decision = 'ok' | 'no'
export interface Suggestion { id: string; token: string; author: string; items: Item[]; status: 'new' | 'done'; created_at: string }
export interface ShareLink { token: string; label: string; created_at: string; expires_at: string; revoked: boolean }

// ---------- owner: links ----------
const URL_KEY = 's'
export const linkUrl = (token: string) => `${location.origin}${location.pathname}?${URL_KEY}=${token}`
export const tokenFromUrl = () => new URLSearchParams(location.search).get(URL_KEY)
function newToken() { const b = new Uint8Array(18); crypto.getRandomValues(b); return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }

export function buildSnapshot(to: string | null, gap: Gap | null): Snapshot {
  const me = rootPerson()
  const people = S.people.map(p => {
    return {
      id: p.id, first: p.first, last: p.last, maiden: p.maiden || '', patronymic: p.patronymic || '', gender: p.gender, preset: p.preset || '',
      birthDate: p.birthDate || '', birthPlace: p.birthPlace || '', deathDate: p.deathDate || '', deathPlace: p.deathPlace || '',
      events: (p.events || []).map(e => ({ id: e.id, type: e.type, year: e.year, place: e.place, lat: e.lat, lon: e.lon, note: '' })),
      job: '', edu: '', bio: '', avatar: '', media: [],
    } as Person
  })
  const rels = S.rels.map(r => ({ id: r.id, type: r.type, a: r.a, b: r.b, from: yearOf(r.from), ...(r.step ? { step: true } : {}), ...(r.adopt ? { adopt: true } : {}), ...(r.partner ? { partner: true } : {}), ...(r.ex ? { ex: true } : {}) }) as Rel)
  return {
    v: 1, lang: LANG, made: new Date().toISOString(), owner: me ? me.first || fullName(me) : '', ownerId: me ? me.id : null,
    family: (S.settings.familyName || '').trim() || (me ? familyTitle(me.last) : ''), to, gap: gap ? { id: gap.id, a: gap.a, b: gap.b, kind: gap.kind } : null, people, rels,
  }
}

/** a server error → a sentence for the owner */
export function serverError(e: { code?: string; message?: string } | null | undefined) {
  const ru = LANG !== 'en', m = (e?.message || '').toLowerCase()
  if (e?.code === 'PGRST202' || e?.code === '42P01' || e?.code === 'PGRST205' || m.includes('does not exist') || m.includes('could not find'))
    return ru ? 'Ссылки ещё не включены на сервере: выполните SQL из файла supabase/share-links.sql в Supabase' : 'Links are not set up on the server yet: run supabase/share-links.sql in Supabase'
  if (m.includes('fetch') || m.includes('network') || m.includes('timeout')) return ru ? 'Нет связи с сервером. Проверьте интернет' : 'Cannot reach the server. Check your connection'
  return e?.message || (ru ? 'Что-то пошло не так' : 'Something went wrong')
}

export async function createLink(to: string | null, gap: Gap | null) {
  goal('ask_relatives')
  if (!cloud.session) throw new Error(LANG === 'en' ? 'Sign in to send links' : 'Чтобы отправлять ссылки, войдите в аккаунт')
  const token = newToken(), label = to && byId(to) ? fullName(byId(to)) : ''
  const { error } = await sb.from('share_links').insert({ token, label, snapshot: buildSnapshot(to, gap) })
  if (error) throw new Error(serverError(error))
  refreshInbox()
  return linkUrl(token)
}
export async function closeLink(token: string) {
  const { error } = await sb.from('share_links').update({ revoked: true }).eq('token', token)
  if (error) throw new Error(serverError(error))
  await refreshInbox()
}

// ---------- owner: answers ----------
export const inbox = { list: [] as Suggestion[], links: [] as ShareLink[], loaded: false, error: '' }
export const newCount = () => inbox.list.filter(s => s.status === 'new').reduce((n, s) => n + s.items.filter(i => !i.st).length, 0)
let loading: Promise<void> | null = null
export function refreshInbox() {
  if (!cloud.session) return Promise.resolve()
  if (loading) return loading
  loading = (async () => {
    try {
      const [a, b] = await Promise.all([
        sb.from('suggestions').select('id, token, author, items, status, created_at').order('created_at', { ascending: false }).limit(100),
        sb.from('share_links').select('token, label, created_at, expires_at, revoked').order('created_at', { ascending: false }).limit(100),
      ])
      if (a.error) throw a.error; if (b.error) throw b.error
      inbox.list = (a.data || []) as Suggestion[]; inbox.links = (b.data || []) as ShareLink[]; inbox.error = ''
    } catch (e) { inbox.error = serverError(e as { message?: string }) }
    inbox.loaded = true; loading = null; bump()
  })()
  return loading
}

const today = () => new Date().toLocaleDateString(LANG === 'en' ? 'en-GB' : 'ru-RU')
const said = (author: string) => (LANG === 'en' ? `as told by ${author}, ${today()}` : `со слов: ${author}, ${today()}`)

/** Put one accepted line into the tree. Returns false when the person it is about is gone. */
function apply(it: Item, author: string) {
  if (it.t === 'note') return true
  if (it.t === 'person') {
    if (!byId(it.of)) return false
    const p = addPerson({ first: it.first.trim(), last: it.last.trim(), gender: it.gender, birthDate: it.birth.trim(), bio: it.note.trim() ? `${it.note.trim()}\n— ${said(author)}` : '' })
    linkPeople(it.of, p.id, it.kind); syncLifeEvents(p); return true
  }
  const p = byId(it.id); if (!p) return false
  if (it.t === 'field') { p[it.f] = it.v; syncLifeEvents(p); return true }
  if (it.t === 'story') { p.bio = (p.bio ? p.bio.trimEnd() + '\n\n' : '') + `${it.v.trim()}\n— ${said(author)}`; return true }
  if (it.t === 'event') {
    const c = findCity(it.ev.place)
    p.events = p.events || []
    p.events.push({ id: uid(), type: it.ev.type, year: it.ev.year, place: it.ev.place, lat: c ? c.lat : null, lon: c ? c.lon : null, note: [it.ev.note, said(author)].filter(Boolean).join(' · ') })
    return true
  }
  if (it.t === 'wedding') {
    const r = S.rels.find(r => r.type === 'spouse' && ((r.a === p.id && r.b === it.with) || (r.b === p.id && r.a === it.with)))
    if (r) r.from = it.v
    const y = +yearOf(it.v) || ''
    const e = (p.events || []).find(e => e.type === 'marriage' && (!e.with || e.with === it.with))
    if (e) { e.date = it.v; e.year = y; e.with = it.with } else { p.events = p.events || []; p.events.push({ id: uid(), type: 'marriage', year: y, place: '', lat: null, lon: null, note: said(author), date: it.v, with: it.with }) }
    return true
  }
  return false
}

/** Accept or decline lines of an answer (all of them when `idx` is null) and save the decision on the server. */
export async function decide(s: Suggestion, idx: number | null, d: Decision) {
  const items = s.items.map((it, i) => ({ ...it }))
  let changed = false
  items.forEach((it, i) => {
    if ((idx != null && i !== idx) || it.st) return
    if (d === 'ok') { it.st = apply(it, s.author) ? 'ok' : 'no'; if (it.st === 'ok' && it.t !== 'note') changed = true } else it.st = 'no'
  })
  if (changed) commit()
  const status = items.every(it => it.st) ? 'done' : 'new'
  s.items = items; s.status = status; bump()
  const { error } = await sb.from('suggestions').update({ items, status }).eq('id', s.id)
  if (error) throw new Error(serverError(error))
}

/** «Дата рождения · 12.03.1885 · было 1885» — how a line reads in the inbox */
export function describe(it: Item): { who: string; what: string; value: string; was: string } {
  const ru = LANG !== 'en', name = (id: string) => (byId(id) ? fullName(byId(id)) : ru ? 'человек удалён' : 'removed')
  const F = { birthDate: ru ? 'Дата рождения' : 'Birth date', birthPlace: ru ? 'Место рождения' : 'Birthplace', deathDate: ru ? 'Дата ухода' : 'Date of death', deathPlace: ru ? 'Место ухода' : 'Place of death' }
  if (it.t === 'field') { const p = byId(it.id); return { who: name(it.id), what: F[it.f], value: it.v, was: p ? p[it.f] || '' : '' } }
  if (it.t === 'event') { const K: Record<string, string> = ru ? { move: 'Жил(а)', study: 'Учёба', work: 'Работа', other: 'Событие' } : { move: 'Lived', study: 'Study', work: 'Work', other: 'Event' }; return { who: name(it.id), what: K[it.ev.type] || K.other, value: [it.ev.place, it.ev.year, it.ev.note].filter(Boolean).join(' · '), was: '' } }
  if (it.t === 'wedding') return { who: name(it.id), what: (ru ? 'Свадьба с ' : 'Wedding with ') + (byId(it.with) ? byId(it.with)!.first : ''), value: it.v, was: '' }
  if (it.t === 'story') return { who: name(it.id), what: ru ? 'Рассказ' : 'Story', value: it.v, was: '' }
  if (it.t === 'person') {
    const K = ru ? { parent: 'родитель', child: 'ребёнок', spouse: 'супруг(а)', sibling: 'брат или сестра' } : { parent: 'parent', child: 'child', spouse: 'spouse', sibling: 'sibling' }
    return { who: [it.first, it.last].filter(Boolean).join(' '), what: (ru ? 'Новый человек — ' : 'New person — ') + K[it.kind] + (ru ? '. Кому: ' : '. Related to: ') + name(it.of), value: [it.birth, it.note].filter(Boolean).join(' · '), was: '' }
  }
  return { who: '', what: ru ? 'Сообщение' : 'Message', value: it.v, was: '' }
}

// ---------- guest ----------
export async function fetchShared(token: string): Promise<{ snapshot: Snapshot; expires_at: string } | null> {
  const { data, error } = await sb.rpc('shared_tree', { p_token: token })
  if (error) throw error
  return (data as { snapshot: Snapshot; expires_at: string } | null) || null
}
export async function submitAnswer(token: string, author: string, items: Item[]) {
  const { error } = await sb.rpc('submit_suggestion', { p_token: token, p_author: author, p_items: items })
  if (error) throw error
}
export const spouseOptions = (id: string) => spousesOf(id)
