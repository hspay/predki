// Links between relatives: adding someone new (straight into the form), linking two people already in the tree, removing a link.
import {
  S, t, byId, fullName, parentsOf, childrenOf, spousesOf, linkedSiblingsOf, siblingsOf, stepParentsOf, stepChildrenOf,
  addRel, removePerson, commit, openPerson, editPerson, toast, type Person, type RelKind,
} from './core'

export const REL_KINDS: RelKind[] = ['parent', 'step', 'spouse', 'child', 'stepchild', 'sibling']

/** «+ Родитель», «+ Брат/сестра»…: the form opens right away; the link is made when it is saved. */
export function addRelative(id: string, kind: 'parent' | 'spouse' | 'child' | 'sibling') {
  const p = byId(id); if (!p) return
  const preset: Partial<Person> & { _title?: string; _rel?: RelKind } = { _title: t('p.newfor', { rel: t('rel.' + kind), name: fullName(p) }), _rel: kind, last: kind === 'spouse' ? '' : p.last }
  if (kind === 'spouse') preset.gender = p.gender === 'm' ? 'f' : p.gender === 'f' ? 'm' : ''
  editPerson(null, preset, (other, step) => {
    linkPeople(id, other.id, step ? (kind === 'parent' ? 'step' : kind === 'child' ? 'stepchild' : kind) : kind)
    commit(); openPerson(other.id)
  })
}

/** «other» becomes «kind» of «id» (e.g. kind 'parent': other is a parent of id). */
export function linkPeople(id: string, otherId: string, kind: RelKind) {
  const other = byId(otherId); if (!other || id === otherId) return
  if (kind === 'parent') {
    // a real father replaces the one guessed from the patronymic
    if (other.gender === 'm') parentsOf(id).filter(x => x.auto && x.gender === 'm' && x.id !== other.id && !parentsOf(x.id).length && childrenOf(x.id).length === 1).forEach(x => removePerson(x.id))
    const before = parentsOf(id).filter(x => x.id !== otherId)
    addRel('parent', otherId, id)
    if (before.length === 1) addRel('spouse', before[0].id, otherId) // the second parent is the first one's spouse
    // brothers and sisters linked directly share the new parent too
    linkedSiblingsOf(id).forEach(s => { if (!parentsOf(s.id).length) addRel('parent', otherId, s.id) })
    tidySiblings()
  } else if (kind === 'step') {
    addRel('parent', otherId, id, '', true)
    // a stepfather is usually married to the mother (and a stepmother to the father)
    const ps = parentsOf(id), match = ps.filter(x => other.gender ? x.gender !== other.gender : true)
    if (match.length === 1 && !spousesOf(otherId).some(s => s.id === match[0].id)) addRel('spouse', otherId, match[0].id)
  } else if (kind === 'child') {
    addRel('parent', id, otherId)
    const sp = spousesOf(id); if (sp.length === 1 && parentsOf(otherId).length < 2) addRel('parent', sp[0].id, otherId) // the spouse is the second parent
    tidySiblings()
  } else if (kind === 'stepchild') {
    addRel('parent', id, otherId, '', true)
  } else if (kind === 'spouse') {
    addRel('spouse', id, otherId)
  } else if (kind === 'sibling') {
    const P = parentsOf(id), Q = parentsOf(otherId)
    if (P.length && !Q.length) P.forEach(x => addRel('parent', x.id, otherId))
    else if (Q.length && !P.length) Q.forEach(x => addRel('parent', x.id, id))
    else if (!P.some(x => Q.some(y => y.id === x.id))) {
      // no parents known: a direct link, shared with the brothers and sisters already linked this way
      const group = new Set([id, otherId, ...linkedSiblingsOf(id).map(x => x.id), ...linkedSiblingsOf(otherId).map(x => x.id)])
      if (P.length || Q.length) addRel('sibling', id, otherId) // half-siblings with different known parents
      else [...group].forEach(a => [...group].forEach(b => { if (a < b) addRel('sibling', a, b) }))
    }
  }
}

/** a direct sibling link is dropped once the two share a parent */
function tidySiblings() {
  S.rels = S.rels.filter(r => r.type !== 'sibling' || !parentsOf(r.a).some(x => parentsOf(r.b).some(y => y.id === x.id)))
}

/** Relatives of a person grouped for the profile; «own» = the link can be removed right here. */
export function relativesOf(id: string) {
  const direct = new Set(linkedSiblingsOf(id).map(x => x.id))
  return [
    { kind: 'parent' as RelKind, label: 'p.parents', list: parentsOf(id).map(p => ({ p, own: true })) },
    { kind: 'step' as RelKind, label: 'p.steps', list: stepParentsOf(id).map(p => ({ p, own: true })) },
    { kind: 'spouse' as RelKind, label: 'p.spouses', list: spousesOf(id).map(p => ({ p, own: true })) },
    { kind: 'child' as RelKind, label: 'p.children', list: childrenOf(id).map(p => ({ p, own: true })) },
    { kind: 'stepchild' as RelKind, label: 'p.stepkids', list: stepChildrenOf(id).map(p => ({ p, own: true })) },
    { kind: 'sibling' as RelKind, label: 'p.siblings', list: siblingsOf(id).map(p => ({ p, own: direct.has(p.id) })) },
  ]
}

/** Remove one link between id and other (the people stay in the tree). */
export function unlinkPeople(id: string, otherId: string, kind: RelKind) {
  const pair = (a: string, b: string) => (r: { a: string; b: string }) => (r.a === a && r.b === b) || (r.a === b && r.b === a)
  const before = S.rels.length
  if (kind === 'parent' || kind === 'step') S.rels = S.rels.filter(r => !(r.type === 'parent' && r.a === otherId && r.b === id))
  else if (kind === 'child' || kind === 'stepchild') S.rels = S.rels.filter(r => !(r.type === 'parent' && r.a === id && r.b === otherId))
  else if (kind === 'spouse') S.rels = S.rels.filter(r => !(r.type === 'spouse' && pair(id, otherId)(r)))
  else if (kind === 'sibling') S.rels = S.rels.filter(r => !(r.type === 'sibling' && pair(id, otherId)(r)))
  if (S.rels.length !== before) { commit(); toast(t('rel.unlinked')) }
}

/** People who can still be linked to id as «kind». */
export function linkCandidates(id: string, kind: RelKind) {
  const taken = new Set<string>([id])
  relativesOf(id).find(g => g.kind === kind)?.list.forEach(x => taken.add(x.p.id))
  return S.people.filter(p => !taken.has(p.id))
}
