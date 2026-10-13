// «Заполнить пробелы»: stretches of a life with no single record, and the living relatives who may remember them.
// A question is worded for the person it is sent to: «Бабушка, где жила твоя мама с 1923 по 1947 год?»
import { S, LANG, byId, fullName, parentsOf, childrenOf, spousesOf, yearOf, type Person } from './core'
import { kinship, type Kinship } from './kinship'
import { rootPerson } from './treeLayout'

const NOW = new Date().getFullYear()
/** years without a record that count as a gap */
export const GAP_MIN = 12

export interface Life { id: string; by: number | null; dy: number | null; died: boolean; facts: number[]; last: number | null; end: number | null }
export interface Gap { id: string; a: number; b: number; kind: 'mid' | 'tail'; len: number; w: string[] }

const evYear = (p: Person, type: string) => { const e = (p.events || []).find(e => e.type === type && e.year); return e ? +e.year : null }
const num = (s?: string) => +yearOf(s) || null
const marriageRels = (id: string) => S.rels.filter(r => r.type === 'spouse' && (r.a === id || r.b === id))

/** what is known about a life, as a list of years with at least one record */
export function lifeOf(p: Person): Life {
  const by = num(p.birthDate) ?? evYear(p, 'birth'), dy = num(p.deathDate) ?? evYear(p, 'death')
  const facts = new Set<number>()
  ;[by, dy, ...(p.events || []).map(e => (e.year ? +e.year : null))].forEach(y => { if (y) facts.add(y) })
  marriageRels(p.id).forEach(r => { const y = num(r.from); if (y) facts.add(y) })
  childrenOf(p.id).forEach(c => { const y = num(c.birthDate) ?? evYear(c, 'birth'); if (y) facts.add(y) })
  const list = [...facts].filter(y => !by || y >= by).sort((a, b) => a - b)
  const last = list.length ? list[list.length - 1] : null
  const died = dy != null || !!(p.deathDate || '').trim()
  const end = dy ?? (died ? last : by != null ? Math.min(NOW, by + 95) : null)
  return { id: p.id, by, dy, died, facts: list, last, end }
}

// ---------- kinship between any two people ----------
let cacheKey = '', KIN = new Map<string, Kinship>(), LIVES = new Map<string, Life>()
function signature() {
  return S.people.map(p => [p.id, p.first, p.gender, p.birthDate, p.deathDate, (p.events || []).map(e => e.type + e.year).join(',')].join('|')).join(';') + '#' + S.rels.map(r => r.type + r.a + r.b + r.from + (r.step ? 's' : '')).join(';') + LANG
}
function fresh() { const k = signature(); if (k !== cacheKey) { cacheKey = k; KIN = new Map(); LIVES = new Map() } }
/** labels of everyone as seen from `root` («мама», «двоюродная сестра») */
export function kinFrom(root: string) { fresh(); let k = KIN.get(root); if (!k) { k = kinship(root); KIN.set(root, k) } return k }
export function life(id: string) { fresh(); let l = LIVES.get(id); if (!l) { l = lifeOf(byId(id)!); LIVES.set(id, l) } return l }
const ups = (id: string) => { const d: Record<string, number> = { [id]: 0 }, q = [id]; while (q.length) { const x = q.shift()!; parentsOf(x).forEach(p => { if (d[p.id] == null) { d[p.id] = d[x] + 1; q.push(p.id) } }) } return d }
/** steps between two people through the nearest shared ancestor; a spouse counts as 1 */
function distance(a: string, b: string) {
  if (spousesOf(a).some(s => s.id === b)) return 1
  const A = ups(a), B = ups(b); let best = Infinity
  Object.keys(B).forEach(c => { if (A[c] != null) best = Math.min(best, A[c] + B[c]) })
  return best
}

/** living relatives who were around then and may remember: closest first, then the eldest */
const canTell = (l: Life) => !l.died && l.by != null && l.by >= NOW - 95 && l.by <= NOW - 16
function witnesses(x: string, meId: string) {
  return S.people.filter(w => w.id !== x && w.id !== meId && canTell(life(w.id)))
    .map(w => ({ id: w.id, d: distance(x, w.id), by: life(w.id).by! })).filter(o => o.d <= 3)
    .sort((a, b) => a.d - b.d || a.by - b.by).slice(0, 3).map(o => o.id)
}

/** Every gap in the family, the ones someone can answer first, then the oldest lives, the longest first. */
export function familyGaps() {
  const me = rootPerson(), meId = me ? me.id : ''
  const out: Gap[] = []
  S.people.forEach(p => {
    const l = life(p.id); if (l.by == null) return
    l.facts.forEach((f, k) => { const nx = l.facts[k + 1]; if (nx != null && nx - f > GAP_MIN) out.push({ id: p.id, a: f, b: nx, kind: 'mid', len: nx - f, w: [] }) })
    if (!l.died && l.by >= NOW - 95 && l.by <= NOW - 45 && l.last != null && NOW - l.last > 20) out.push({ id: p.id, a: l.last, b: NOW, kind: 'tail', len: NOW - l.last, w: [] })
  })
  out.forEach(g => { const self = g.id !== meId && canTell(life(g.id)); g.w = (self ? [g.id, ...witnesses(g.id, meId)] : witnesses(g.id, meId)).slice(0, 3) })
  out.sort((x, y) => (x.w.length ? 0 : 1) - (y.w.length ? 0 : 1) || +(x.kind === 'tail') - +(y.kind === 'tail') || life(x.id).by! - life(y.id).by! || y.len - x.len)
  // one question per person first, the rest after
  const seen = new Set<string>(), a: Gap[] = [], b: Gap[] = []
  out.forEach(g => (seen.has(g.id) ? b : (seen.add(g.id), a)).push(g))
  return [...a, ...b]
}

// ---------- wording ----------
const ru = () => LANG !== 'en'
/** their own gender, otherwise the opposite of a spouse whose gender is known */
const gOf = (p: Person): '' | 'm' | 'f' => {
  if (p.gender === 'm' || p.gender === 'f') return p.gender
  const s = spousesOf(p.id).find(s => s.gender === 'm' || s.gender === 'f'); return s ? (s.gender === 'm' ? 'f' : 'm') : ''
}
const fv = (p: Person, m: string, f: string) => { const g = gOf(p); return g === 'f' ? f : g === 'm' ? m : m + '(' + f.replace(m, '') + ')' }
const first = (p: Person) => p.first || fullName(p)

/** what `x` is to `w` with the first name, as «твоя бабушка Таиса» / «your grandmother Taisa», or the full name when there is no simple word */
export function refFor(w: string, x: string) {
  if (w === x) return ru() ? 'ты' : 'you'
  const p = byId(x)!, label = kinFrom(w).label[x] || ''
  if (!label || label.includes('/') || label.includes('’')) return fullName(p)
  const words = label.split(' ')
  if (ru()) {
    const simple = words.length === 1 || (words.length === 2 && /(ый|ий|ая|яя)$/.test(words[0]))
    return simple ? (gOf(p) === 'f' ? 'твоя ' : 'твой ') + label + ' ' + first(p) : fullName(p)
  }
  return 'your ' + label + ' ' + first(p)
}
/** how I would start a message to `w`: «Мама», «Бабушка», «Тётя Света», or the first name */
export function address(w: string) {
  const me = rootPerson(); const p = byId(w)!; if (!me) return first(p)
  const label = kinFrom(me.id).label[w] || ''
  if (ru()) {
    if (label === 'мама' || label === 'папа') return label[0].toUpperCase() + label.slice(1)
    if (/^(пра)*(бабушка|дедушка)$/.test(label)) return label.endsWith('бабушка') ? 'Бабушка' : 'Дедушка'
    if (/(бабушка|дедушка|тётя|дядя)$/.test(label) && !label.includes('/')) { const n = label.split(' ').pop()!; return n[0].toUpperCase() + n.slice(1) + ' ' + first(p) }
    return first(p)
  }
  const EN: Record<string, string> = { mother: 'Mom', father: 'Dad' }
  if (EN[label]) return EN[label]
  if (/grandmother$/.test(label)) return 'Grandma'
  if (/grandfather$/.test(label)) return 'Grandpa'
  if (/^(great-)*aunt$/.test(label)) return 'Aunt ' + first(p)
  if (/^(great-)*uncle$/.test(label)) return 'Uncle ' + first(p)
  return first(p)
}

/** the main question about a gap; w = whom it is asked (null: neutral wording for the card) */
export function question(g: Gap, w: string | null) {
  const p = byId(g.id)!, x = w ? refFor(w, g.id) : fullName(p), you = w === g.id
  if (ru()) {
    if (g.kind === 'tail') return you ? `Что было в твоей жизни после ${g.a} года? Где ты ${fv(p, 'жил', 'жила')} и кем ${fv(p, 'работал', 'работала')}?` : w ? `Как ${fv(p, 'жил', 'жила')} ${x} после ${g.a} года? Где, с кем, кем ${fv(p, 'работал', 'работала')}?` : `После ${g.a} года — ни одной записи. Что было дальше?`
    return you ? `Где ты ${fv(p, 'жил', 'жила')} с ${g.a} по ${g.b} год?` : `Где ${fv(p, 'жил', 'жила')} ${x} с ${g.a} по ${g.b} год?`
  }
  if (g.kind === 'tail') return you ? `What happened in your life after ${g.a}? Where did you live and work?` : w ? `What was ${x}’s life like after ${g.a}? Where, with whom, what work?` : `No records after ${g.a}. What happened next?`
  return `Where did ${x} live from ${g.a} to ${g.b}?`
}
/** a second question when the person's marriage has no date at all */
export function question2(g: Gap, w: string | null) {
  if (g.kind !== 'mid') return ''
  const p = byId(g.id)!
  const sp = spousesOf(p.id).find(s => { const r = marriageRels(p.id).find(r => r.a === s.id || r.b === s.id); return r && !num(r.from) })
  if (!sp || (p.events || []).some(e => e.type === 'marriage') || (sp.events || []).some(e => e.type === 'marriage')) return ''
  if (w === p.id || w === sp.id) return ru() ? 'И когда была ваша свадьба?' : 'And when was your wedding?'
  const a = w ? refFor(w, p.id) : first(p), b = w ? refFor(w, sp.id) : first(sp)
  return ru() ? `И когда поженились ${a} и ${b}?` : `And when did ${a} and ${b} get married?`
}
/** the whole message for a relative, ready to send */
export function message(g: Gap, w: string) {
  const q = question(g, w), q2 = question2(g, w)
  return ru()
    ? `${address(w)}, помоги восстановить историю семьи. ${q}${q2 ? ' ' + q2 : ''} Можно ответить сообщением или голосовым — я сохраню это в наше древо.`
    : `${address(w)}, help me piece together our family history. ${q}${q2 ? ' ' + q2 : ''} You can reply with a message or a voice note — I’ll save it to our family tree.`
}
/** «Котовск, 1923 — рождение», «1947 — родилась дочь Ольга» */
export function factLabel(id: string, y: number) {
  const p = byId(id)!, e = (p.events || []).find(e => +e.year === y)
  const R = ru()
  if (e) return `${e.place ? e.place + ', ' : ''}${y}${e.type === 'birth' ? (R ? ' — рождение' : ' — birth') : e.type === 'marriage' ? (R ? ' — свадьба' : ' — wedding') : e.type === 'death' ? (R ? ' — уход из жизни' : ' — death') : ''}`
  const c = childrenOf(id).find(c => (num(c.birthDate) ?? evYear(c, 'birth')) === y)
  if (c) return R ? `${y} — ${gOf(c) === 'f' ? 'родилась дочь' : gOf(c) === 'm' ? 'родился сын' : 'родился ребёнок'} ${first(c)}` : `${y} — ${gOf(c) === 'f' ? 'daughter' : gOf(c) === 'm' ? 'son' : 'child'} ${first(c)} born`
  if (life(id).by === y) return R ? `${y} — рождение` : `${y} — birth`
  if (marriageRels(id).some(r => num(r.from) === y)) return R ? `${y} — свадьба` : `${y} — wedding`
  return String(y)
}
/** «сама», «дочь», «внук» — what the witness is to the person the gap belongs to */
export function witnessLabel(x: string, w: string) {
  if (x === w) { const p = byId(w)!; return ru() ? fv(p, 'сам', 'сама') : 'themselves' }
  const l = kinFrom(x).label[w] || ''; return l
}

// ---------- empty fields ----------
const APPROX = /≈|примерн|уточнить|условн|под вопросом|approx|circa|\?/i
export function missing() {
  const noYear = S.people.filter(p => life(p.id).by == null)
  const noDay = S.people.filter(p => life(p.id).by != null && !/^\d{1,2}\.\d{1,2}\.\d{4}$/.test((p.birthDate || '').trim()) && !life(p.id).died)
  const approx = S.people.flatMap(p => (p.events || []).filter(e => APPROX.test(e.note || '')).map(e => ({ p, e })))
  const noPlace = S.people.flatMap(p => (p.events || []).filter(e => e.place && e.lat == null).map(e => ({ p, e })))
  return { noYear, noDay, approx, noPlace }
}
