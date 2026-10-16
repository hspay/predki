// What each person is to «you»: «бабушка», «тёща», «троюродный брат», «муж двоюродной бабушки».
// Blood relatives are named by the nearest shared ancestor (steps up from you, steps down to them),
// people who married in by the relative they married, your spouse's family by your spouse.
import { S, LANG, byId, fullName, parentsOf, spousesOf, stepParentsOf, type Person } from './core'

type G = 'm' | 'f' | ''
type AB = { a: number; b: number; s: number; c: string }
export interface Kinship { label: Record<string, string>; blood: Record<string, boolean>; chain: (id: string) => string[]; linked: (id: string) => boolean }

/** gender used for the wording: their own, otherwise the opposite of a spouse whose gender is known */
function gOf(p: Person): G {
  if (p.gender === 'm' || p.gender === 'f') return p.gender
  const s = spousesOf(p.id).find(x => x.gender === 'm' || x.gender === 'f'); return s ? (s.gender === 'm' ? 'f' : 'm') : ''
}
const N = (m: string, f: string, g: G) => (g === 'm' ? m : g === 'f' ? f : m + '/' + f)

/** every ancestor of id with the number of steps up (id itself = 0); down[x] = the child through whom x was reached */
function ups(id: string, down?: Record<string, string>) {
  const d: Record<string, number> = { [id]: 0 }, q = [id]
  while (q.length) { const x = q.shift()!; parentsOf(x).forEach(p => { if (d[p.id] == null) { d[p.id] = d[x] + 1; if (down) down[p.id] = x; q.push(p.id) } }) }
  return d
}
function nearest(A: Record<string, number>, id: string): AB | null {
  const B = ups(id); let best: AB | null = null
  Object.keys(B).forEach(c => { if (A[c] == null) return; const s = A[c] + B[c]; if (!best || s < best.s || (s === best.s && A[c] < best.a)) best = { s, a: A[c], b: B[c], c } })
  return best
}

// ---------- Russian ----------
const DEG = ['', 'двоюродн', 'троюродн', 'четвероюродн', 'пятиюродн', 'шестиюродн']
const adj = (k: number, g: G) => (k > 0 ? (DEG[k] || k + 1 + '-юродн') + (g === 'f' ? 'ая' : 'ый') + ' ' : '')
const pra = (n: number) => 'пра'.repeat(Math.max(0, n))
function ruBlood(a: number, b: number, g: G) {
  if (!a && !b) return 'Вы'
  if (!b) return a === 1 ? N('папа', 'мама', g) : N(pra(a - 2) + 'дедушка', pra(a - 2) + 'бабушка', g)
  if (!a) return b === 1 ? N('сын', 'дочь', g) : N(pra(b - 2) + 'внук', pra(b - 2) + 'внучка', g)
  if (a === b) return adj(a - 1, g) + N('брат', 'сестра', g)
  if (a > b) { const d = a - b; return d === 1 ? adj(b - 1, g) + N('дядя', 'тётя', g) : adj(b, g) + N(pra(d - 2) + 'дедушка', pra(d - 2) + 'бабушка', g) }
  const d = b - a
  return d === 1 ? adj(a - 1, g) + N('племянник', 'племянница', g) : adj(a - 1, g) + N(pra(d - 2) + 'внучатый племянник', pra(d - 2) + 'внучатая племянница', g)
}
/** genitive: «тётя» → «тёти», «двоюродный дядя» → «двоюродного дяди» */
function genWord(w: string) {
  if (/ый$/.test(w)) return w.replace(/ый$/, 'ого'); if (/ий$/.test(w)) return w.replace(/ий$/, 'его'); if (/ая$/.test(w)) return w.replace(/ая$/, 'ой')
  if (w === 'дочь') return 'дочери'; if (/я$/.test(w)) return w.replace(/я$/, 'и')
  if (/а$/.test(w)) return w.replace(/а$/, /[гкхжчшщ]а$/.test(w) ? 'и' : 'ы')
  if (/ь$/.test(w)) return w.replace(/ь$/, 'и'); return w + 'а'
}
const ruGen = (s: string) => s.split(' ').map(t => t.split('/').map(genWord).join('/')).join(' ')

// ---------- English ----------
// Everyday words rather than genealogists' «first cousin once removed»: «father's cousin», «cousin's son».
const ordinal = (n: number) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th')
/** great-grandmother, great-great-grandmother, 3rd great-grandmother… */
const great = (n: number) => (n <= 0 ? '' : n <= 2 ? 'great-'.repeat(n) : ordinal(n) + ' great-')
const COUSIN = ['', 'cousin', 'second cousin', 'third cousin', 'fourth cousin', 'fifth cousin']
const cousin = (k: number) => COUSIN[k] || ordinal(k) + ' cousin'
/** my ancestor d generations up, named from me: father, grandmother… (g = their gender) */
const anc = (d: number, g: G) => (d === 1 ? N('father', 'mother', g) : N(great(d - 2) + 'grandfather', great(d - 2) + 'grandmother', g))
function enBlood(a: number, b: number, g: G, ag: (d: number) => G = () => '') {
  if (!a && !b) return 'You'
  if (!b) return a === 1 ? N('father', 'mother', g) : N(great(a - 2) + 'grandfather', great(a - 2) + 'grandmother', g)
  if (!a) return b === 1 ? N('son', 'daughter', g) : N(great(b - 2) + 'grandson', great(b - 2) + 'granddaughter', g)
  if (a === 1 && b === 1) return N('brother', 'sister', g)
  if (b === 1) return N(great(a - 2) + 'uncle', great(a - 2) + 'aunt', g)
  if (a === 1) return N(great(b - 2) + 'nephew', great(b - 2) + 'niece', g)
  if (a === b) return cousin(a - 1)
  // an older generation: the cousin of one of my ancestors («father's cousin»)
  if (a > b) { const d = a - b, ag0 = ag(d); return (ag0 ? anc(d, ag0) : d === 1 ? 'parent' : great(d - 2) + 'grandparent') + '’s ' + cousin(b - 1) }
  // a younger one: a cousin's child or grandchild («cousin's son»)
  const d = b - a; return cousin(a - 1) + '’s ' + (d === 1 ? N('son', 'daughter', g) : N(great(d - 2) + 'grandson', great(d - 2) + 'granddaughter', g))
}
const enOf = (rel: string, what: string) => `${rel}’s ${what}`

/** Labels for everyone in the tree, relative to «me». */
export function kinship(meId: string): Kinship {
  const ru = LANG !== 'en', label: Record<string, string> = {}, blood: Record<string, boolean> = {}
  const down: Record<string, string> = {}
  const upMe = ups(meId, down), AB: Record<string, AB> = {}
  S.people.forEach(p => { const r = nearest(upMe, p.id); if (r) AB[p.id] = r })
  // gender of my ancestor d generations up on the way to c (for «father's cousin» / «mother's cousin»)
  const ancG = (c: string) => (d: number): G => { let x: string | undefined = c; while (x && upMe[x] > d) x = down[x]; const p = x ? byId(x) : null; return p ? gOf(p) : '' }
  const name = (a: number, b: number, g: G, c = '') => (ru ? ruBlood(a, b, g) : enBlood(a, b, g, ancG(c)))
  const closest = (list: Person[]) => list.filter(x => AB[x.id] && x.id !== meId).sort((x, y) => AB[x.id].s - AB[y.id].s)[0]
  const relName = (x: Person) => name(AB[x.id].a, AB[x.id].b, gOf(x), AB[x.id].c)
  const spouse = spousesOf(meId)[0], upSp = spouse ? ups(spouse.id) : null
  // everyone reachable from me through any links; the rest are not related to me in the tree at all
  const linked = new Set([meId]), lq = [meId]
  while (lq.length) { const x = lq.shift()!; S.rels.forEach(r => { const o = r.a === x ? r.b : r.b === x ? r.a : null; if (o && !linked.has(o)) { linked.add(o); lq.push(o) } }) }

  S.people.forEach(p => {
    const id = p.id, g = gOf(p)
    if (!linked.has(id)) return
    if (AB[id]) { label[id] = name(AB[id].a, AB[id].b, g, AB[id].c); blood[id] = true; return }
    if (spousesOf(meId).some(s => s.id === id)) { label[id] = ru ? N('муж', 'жена', g) : N('husband', 'wife', g); return }
    // married to one of my blood relatives
    const R = closest(spousesOf(id))
    if (R) {
      const { a, b } = AB[R.id]
      if (a === 1 && b === 0) label[id] = ru ? N('отчим', 'мачеха', g) : N('stepfather', 'stepmother', g)
      else if (a === 0 && b === 1) label[id] = ru ? N('зять', 'невестка', g) : N('son-in-law', 'daughter-in-law', g)
      else if (a === 1 && b === 1) label[id] = ru ? N('зять', 'невестка', g) : N('brother-in-law', 'sister-in-law', g)
      else label[id] = ru ? N('муж', 'жена', g) + ' ' + ruGen(relName(R)) : enOf(relName(R), N('husband', 'wife', g))
      return
    }
    // my spouse's family
    const w = upSp && spouse ? nearest(upSp, id) : null
    if (w && spouse) {
      const wg = gOf(spouse)
      if (w.a === 1 && w.b === 0) label[id] = ru ? (wg === 'm' ? N('свёкор', 'свекровь', g) : N('тесть', 'тёща', g)) : N('father-in-law', 'mother-in-law', g)
      else if (w.a === 1 && w.b === 1) label[id] = ru ? (wg === 'm' ? N('деверь', 'золовка', g) : N('шурин', 'свояченица', g)) : N('brother-in-law', 'sister-in-law', g)
      else if (w.a === 0 && w.b === 1) label[id] = ru ? N('пасынок', 'падчерица', g) : N('stepson', 'stepdaughter', g)
      else label[id] = ru ? name(w.a, w.b, g) + ' ' + (wg === 'm' ? 'мужа' : 'жены') : enOf(wg === 'm' ? 'husband' : 'wife', name(w.a, w.b, g))
      return
    }
    // stepchild of a blood relative, or a child of their spouse
    const P = closest([...stepParentsOf(id), ...parentsOf(id).flatMap(x => spousesOf(x.id))])
    if (P) {
      const { a, b } = AB[P.id]
      if (a === 1 && b === 0) label[id] = ru ? N('сводный брат', 'сводная сестра', g) : N('stepbrother', 'stepsister', g)
      else label[id] = ru ? N('пасынок', 'падчерица', g) + ' ' + ruGen(relName(P)) : enOf(relName(P), N('stepson', 'stepdaughter', g))
      return
    }
    label[id] = ru ? N('свойственник', 'свойственница', g) : 'in-law'
  })
  return { label, blood, chain: id => chainTo(meId, id), linked: id => linked.has(id) }
}

/** the shortest chain of people from me to id, through any links */
function chainTo(from: string, id: string) {
  const prev: Record<string, string | null> = { [from]: null }, q = [from]
  while (q.length) {
    const x = q.shift()!; if (x === id) break
    S.rels.forEach(r => { const o = r.a === x ? r.b : r.b === x ? r.a : null; if (o && !(o in prev)) { prev[o] = x; q.push(o) } })
  }
  if (!(id in prev)) return []
  const out: string[] = []; for (let x: string | null = id; x; x = prev[x]) out.unshift(x)
  return out
}
export const chainName = (id: string) => { const p = byId(id); return p ? p.first || fullName(p) : '' }
