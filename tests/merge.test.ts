import { merge3, same } from '../src/lib/merge'
import assert from 'node:assert/strict'
const P = (id: string, x: any = {}) => ({ id, first: id, last: 'Иванов', maiden: '', patronymic: '', gender: '', birthDate: '', birthPlace: '', deathDate: '', deathPlace: '', job: '', edu: '', bio: '', avatar: '', media: [], events: [], ...x })
const D = (people: any[], rels: any[] = [], extra: any = {}) => ({ people, rels, achievements: [], settings: { onboarded: true }, ...extra })
const clone = (x: any) => JSON.parse(JSON.stringify(x))
let n = 0; const test = (name: string, fn: () => void) => { fn(); n++; console.log('✓', name) }

const base = D([P('a'), P('b', { avatar: 'sb:u/a/avatar-1.jpg' })], [{ id: 'r1', type: 'parent', a: 'a', b: 'b', from: '' }])

test('изменения в разных людях складываются', () => {
  const l = clone(base); l.people[0].bio = 'local'
  const r = clone(base); r.people[1].job = 'remote'
  const m = merge3(base, l, r)
  assert.equal(m.people[0].bio, 'local'); assert.equal(m.people[1].job, 'remote')
})
test('разные поля одного человека складываются', () => {
  const l = clone(base); l.people[1].bio = 'local'
  const r = clone(base); r.people[1].avatar = 'sb:u/b/avatar-2.jpg'
  const m = merge3(base, l, r)
  assert.equal(m.people[1].bio, 'local'); assert.equal(m.people[1].avatar, 'sb:u/b/avatar-2.jpg')
})
test('старая копия не возвращает удалённое и не затирает новое фото', () => {
  const l = clone(base) // ничего не меняли в этом окне
  const r = clone(base); r.people[1].avatar = 'sb:u/b/avatar-NEW.jpg'
  assert.equal(merge3(base, l, r).people[1].avatar, 'sb:u/b/avatar-NEW.jpg')
})
test('одно поле изменено с двух сторон: побеждает это окно', () => {
  const l = clone(base); l.people[0].bio = 'L'; const r = clone(base); r.people[0].bio = 'R'
  assert.equal(merge3(base, l, r).people[0].bio, 'L')
})
test('люди, добавленные в двух окнах, оба остаются', () => {
  const l = clone(base); l.people.push(P('c')); const r = clone(base); r.people.push(P('d'))
  assert.deepEqual(merge3(base, l, r).people.map((p: any) => p.id), ['a', 'b', 'c', 'd'])
})
test('удаление на одной стороне проходит, связи чистятся', () => {
  const l = clone(base); l.people = l.people.filter((p: any) => p.id !== 'b'); l.rels = []
  const r = clone(base); r.people[0].bio = 'x'
  const m = merge3(base, l, r)
  assert.deepEqual(m.people.map((p: any) => p.id), ['a']); assert.equal(m.rels.length, 0); assert.equal(m.people[0].bio, 'x')
})
test('удалён в одном окне, но отредактирован в другом — остаётся', () => {
  const l = clone(base); l.people = l.people.filter((p: any) => p.id !== 'b'); l.rels = []
  const r = clone(base); r.people[1].bio = 'важное'
  const m = merge3(base, l, r)
  assert.ok(m.people.some((p: any) => p.id === 'b' && p.bio === 'важное'))
})
test('фото в галерее, добавленные в двух окнах, оба остаются', () => {
  const l = clone(base); l.people[0].media.push({ id: 'm1', type: 'photo', name: '1', data: 'sb:1' })
  const r = clone(base); r.people[0].media.push({ id: 'm2', type: 'photo', name: '2', data: 'sb:2' })
  assert.deepEqual(merge3(base, l, r).people[0].media.map((x: any) => x.id), ['m1', 'm2'])
})
test('одна и та же связь, добавленная дважды, не дублируется', () => {
  const l = clone(base); l.people.push(P('c')); l.rels.push({ id: 'x1', type: 'spouse', a: 'a', b: 'c', from: '' })
  const r = clone(l); r.rels[1].id = 'x2'; r.rels[1].a = 'c'; r.rels[1].b = 'a'
  const m = merge3(base, l, r)
  assert.equal(m.rels.filter((x: any) => x.type === 'spouse').length, 1)
})
test('наклейки объединяются, главы не откатываются', () => {
  const b = clone(base); b.achievements = ['k1']; b.settings.chapter = 1
  const l = clone(b); l.achievements.push('k2'); l.settings.chapter = 2
  const r = clone(b); r.achievements.push('k3'); r.settings.chapter = 1
  const m = merge3(b, l, r)
  assert.deepEqual(m.achievements, ['k1', 'k2', 'k3']); assert.equal(m.settings.chapter, 2)
})
test('без общей копии ничего не удаляется', () => {
  const l = D([P('a', { bio: 'L' })]); const r = D([P('a', { job: 'R' }), P('z')])
  const m = merge3(null, l, r)
  assert.deepEqual(m.people.map((p: any) => p.id), ['a', 'z']); assert.equal(m.people[0].bio, 'L'); assert.equal(m.people[0].job, 'R')
})
test('порядок ключей из базы данных не считается изменением', () => {
  const r = JSON.parse(JSON.stringify(base, (k, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).reverse()) : v))
  const l = clone(base); l.people[0].bio = 'local'
  const m = merge3(base, l, r)
  assert.equal(m.people[0].bio, 'local'); assert.ok(same(r, base))
})
test('питомец без хозяина уходит, «я» без человека — тоже', () => {
  const b = clone(base); b.pets = [{ id: 'p1', name: 'Пиксель', kind: 'dog', born: '', died: '', owner: 'b' }]; b.settings.meId = 'b'
  const l = clone(b); l.people = l.people.filter((p: any) => p.id !== 'b'); l.pets = []; delete l.settings.meId; l.rels = []
  const m = merge3(b, l, clone(b))
  assert.equal(m.pets!.length, 0); assert.equal(m.settings.meId, undefined)
})
console.log(`\n${n} проверок прошли`)
