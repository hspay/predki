// The logic of the tree: lookups, layout, kinship labels and links between relatives. Runs in Node (npm test), before every publish.
import { describe, test, expect, beforeEach } from 'vitest'
import * as core from '../src/lib/core'
import { S, byId, parentsOf, childrenOf, spousesOf, siblingsOf, coupleRel, addPerson, addRel, removePerson, replaceData, type Data, type Person } from '../src/lib/core'
import { layout, NW, NH } from '../src/lib/treeLayout'
import { kinship } from '../src/lib/kinship'
import { linkPeople } from '../src/lib/relations'
import { buildFamily } from '../src/lib/demo'
import { FAMILIES } from '../src/lib/demoFamilies'
import { sampleData } from '../src/lib/sample'

const blank = (): Data => ({ people: [], rels: [], achievements: [], settings: {} })
const ids = (l: Person[]) => l.map(p => p.id)
// the plain way, as the helpers worked before the indexes: every answer of the fast ones must match it
const slow = {
  byId: (id: string) => S.people.find(p => p.id === id),
  parents: (id: string) => S.rels.filter(r => r.type === 'parent' && !r.step && r.b === id).map(r => slow.byId(r.a)).filter(Boolean) as Person[],
  children: (id: string) => S.rels.filter(r => r.type === 'parent' && !r.step && r.a === id).map(r => slow.byId(r.b)).filter(Boolean) as Person[],
  spouses: (id: string) => S.rels.filter(r => r.type === 'spouse' && (r.a === id || r.b === id)).map(r => slow.byId(r.a === id ? r.b : r.a)).filter(Boolean) as Person[],
  couple: (a: string, b: string) => S.rels.find(r => r.type === 'spouse' && ((r.a === a && r.b === b) || (r.a === b && r.b === a))),
}
function sameAsSlow() {
  for (const p of S.people) {
    expect(byId(p.id)).toBe(slow.byId(p.id))
    expect(ids(parentsOf(p.id))).toEqual(ids(slow.parents(p.id)))
    expect(ids(childrenOf(p.id))).toEqual(ids(slow.children(p.id)))
    expect(ids(spousesOf(p.id))).toEqual(ids(slow.spouses(p.id)))
    for (const q of slow.spouses(p.id)) expect(coupleRel(p.id, q.id)).toBe(slow.couple(p.id, q.id))
  }
  expect(byId('nobody')).toBeUndefined()
}
const families: [string, () => Data][] = [...FAMILIES.map(f => [f.k, () => buildFamily(f)] as [string, () => Data]), ['sample', () => sampleData() as Data]]

describe('поиск людей и связей', () => {
  test.each(families)('%s: быстрый поиск отвечает так же, как простой перебор', (_k, make) => { replaceData(make()); sameAsSlow() })
  test('после любых правок списка ответы остаются верными', () => {
    replaceData(sampleData() as Data); sameAsSlow()
    const a = addPerson({ first: 'Новый' }), first = S.people[0]; addRel('parent', first.id, a.id); sameAsSlow()
    removePerson(first.id); sameAsSlow(); expect(byId(first.id)).toBeUndefined()
    S.rels = S.rels.filter((_r, i) => i % 2 === 0); sameAsSlow()
    // the list changed in place, same length: the old person is gone, the new one is found
    const gone = S.people[1].id, b: Person = { ...S.people[1], id: 'swapped' }; S.people[1] = b
    expect(byId('swapped')).toBe(b); expect(byId(gone)).toBeUndefined(); sameAsSlow()
    S.people.pop(); S.people.push({ ...b, id: 'last' }); expect(byId('last')?.id).toBe('last'); sameAsSlow()
  })
})

describe('раскладка древа', () => {
  test.each(families)('%s: все на месте, никто ни на кого не наехал', (_k, make) => {
    const d = make(); replaceData(d)
    const lay = layout(() => NH), pos = d.people.map(p => lay.pos[p.id])
    expect(pos.every(P => P && Number.isFinite(P.x) && Number.isFinite(P.y))).toBe(true)
    expect(Number.isFinite(lay.w) && Number.isFinite(lay.h)).toBe(true)
    const hit: string[] = []
    pos.forEach((A, i) => pos.forEach((B, j) => { if (j > i && Math.abs(A.x - B.x) < NW - .5 && Math.abs(A.y - B.y) < NH - .5) hit.push(d.people[i].id + '×' + d.people[j].id) }))
    expect(hit).toEqual([])
    // parents stand above their children
    d.rels.filter(r => r.type === 'parent' && !r.step).forEach(r => expect(lay.pos[r.a].y).toBeLessThan(lay.pos[r.b].y))
  })
})

describe('родство и связи', () => {
  let me: Person, mom: Person, dad: Person
  beforeEach(() => {
    core.setLang?.('ru'); replaceData(blank())
    me = addPerson({ first: 'Я', gender: 'm' }); mom = addPerson({ first: 'Мама', gender: 'f' }); dad = addPerson({ first: 'Папа', gender: 'm' })
    linkPeople(me.id, mom.id, 'parent'); linkPeople(me.id, dad.id, 'parent')
  })
  test('второй родитель становится супругом первого', () => { expect(coupleRel(mom.id, dad.id)).toBeTruthy(); expect(ids(parentsOf(me.id)).sort()).toEqual([mom.id, dad.id].sort()) })
  test('ребёнок, добавленный одному из супругов, становится общим', () => {
    const kid = addPerson({ first: 'Сестра', gender: 'f' }); linkPeople(mom.id, kid.id, 'child')
    expect(ids(parentsOf(kid.id)).sort()).toEqual([mom.id, dad.id].sort()); expect(ids(siblingsOf(me.id))).toEqual([kid.id])
  })
  test('брат без родителей получает родителей брата', () => { const bro = addPerson({ first: 'Брат', gender: 'm' }); linkPeople(me.id, bro.id, 'sibling'); expect(ids(parentsOf(bro.id)).sort()).toEqual([mom.id, dad.id].sort()) })
  test('убрать связь — убирается только она, люди остаются', () => {
    S.rels = S.rels.filter(r => !(r.type === 'parent' && r.a === dad.id && r.b === me.id))
    expect(ids(parentsOf(me.id))).toEqual([mom.id]); expect(S.people.length).toBe(3); expect(coupleRel(mom.id, dad.id)).toBeTruthy()
  })
  test('подписи родства: мама, папа, бабушка, дедушка, сестра, дядя, жена', () => {
    const gm = addPerson({ first: 'Бабушка', gender: 'f' }), gf = addPerson({ first: 'Дедушка', gender: 'm' }), sis = addPerson({ first: 'Сестра', gender: 'f' }), uncle = addPerson({ first: 'Дядя', gender: 'm' }), wife = addPerson({ first: 'Жена', gender: 'f' })
    linkPeople(dad.id, gm.id, 'parent'); linkPeople(dad.id, gf.id, 'parent'); linkPeople(mom.id, sis.id, 'child'); linkPeople(gm.id, uncle.id, 'child'); linkPeople(me.id, wife.id, 'spouse')
    const L = kinship(me.id).label
    expect([L[mom.id], L[dad.id], L[gm.id], L[gf.id], L[sis.id], L[uncle.id], L[wife.id]].map(s => s.toLowerCase())).toEqual(['мама', 'папа', 'бабушка', 'дедушка', 'сестра', 'дядя', 'жена'])
  })
})
