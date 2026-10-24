// End-to-end sync scenarios for Predki against a fake Supabase (auth + trees table with RLS + storage), in real Chromium tabs.
// How to run: npm i -D playwright && npx playwright install chromium; then `npx vite --port 5199` in one terminal
// and `node tests/sync-scenarios.mjs` in another. The script adds e2e.html (the app plus window.__core / __cloud / __demo) and removes it after.
import fs from 'node:fs'
import { chromium } from 'playwright'
const HTML = new URL('../e2e.html', import.meta.url)
fs.writeFileSync(HTML, fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8').replace('<script type="module" src="/src/main.tsx"></script>', '<script type="module" src="/src/main.tsx"></script>\n    <script type="module">import * as core from "/src/lib/core.ts"; import * as cl from "/src/lib/cloud.ts"; import * as dm from "/src/lib/demo.ts"; import * as pr from "/src/lib/problems.ts"; window.__core = core; window.__cloud = cl; window.__demo = dm; window.__problems = pr</script>'))
process.on('exit', () => { try { fs.unlinkSync(HTML) } catch { } })
import assert from 'node:assert/strict'

const APP = process.env.APP || 'http://localhost:5199/e2e.html'
const SB = 'https://ptdahtotkbycfbwappdn.supabase.co'
const USERS = { 'a@x.ru': 'uidA', 'b@x.ru': 'uidB' }
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')

// ---------------------------------------------------------------- fake Supabase
const db = new Map(), files = new Set(), log = { deletes: [], saves: [] }, gone = new Set(), problems = []
let rpcMissing = false
let down = false
const pgTime = d => new Date(d).toISOString().replace('Z', '+00:00')
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url')
const jwt = uid => b64({ alg: 'HS256', typ: 'JWT' }) + '.' + b64({ sub: uid, exp: 4102444800, role: 'authenticated', aud: 'authenticated' }) + '.sig'
const user = (uid) => ({ id: uid, aud: 'authenticated', role: 'authenticated', email: Object.keys(USERS).find(k => USERS[k] === uid), app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' })
const session = uid => ({ access_token: jwt(uid), token_type: 'bearer', expires_in: 3e8, expires_at: 4102444800, refresh_token: 'r-' + uid, user: user(uid) })
const uidOf = req => { const a = req.headers()['authorization'] || ''; try { return JSON.parse(Buffer.from(a.split(' ')[1].split('.')[1], 'base64url').toString()).sub } catch { return null } }
function seed(uid, people, extra = {}) {
  db.set(uid, { data: { people, rels: [], achievements: [], settings: { onboarded: true, familyName: uid }, ...extra }, updated_at: pgTime(Date.now() - 864e5) })
  people.forEach(p => p.avatar && files.add(p.avatar.slice(3)))
}
const P = (id, x = {}) => ({ id, first: id, last: 'Тестов', maiden: '', patronymic: '', gender: 'm', birthDate: '', birthPlace: '', deathDate: '', deathPlace: '', job: '', edu: '', bio: '', avatar: '', media: [], events: [], ...x })

async function fake(route) {
  const req = route.request(), u = new URL(req.url()), path = u.pathname, m = req.method()
  if (down) return route.abort('internetdisconnected')
  const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
  const me = uidOf(req)
  if (path === '/auth/v1/token') {
    const b = req.postDataJSON() || {}
    if (u.searchParams.get('grant_type') === 'password') return USERS[b.email] && !gone.has(USERS[b.email]) ? json(session(USERS[b.email])) : json({ error: 'invalid_grant', error_description: 'Invalid login credentials' }, 400)
    return json(session((b.refresh_token || 'r-uidA').slice(2)))
  }
  if (path === '/auth/v1/logout') return route.fulfill({ status: 204 })
  if (path === '/auth/v1/user') return json(user(me))
  if (path === '/rest/v1/trees') {
    const uidF = (u.searchParams.get('user_id') || '').replace(/^eq\./, ''), verF = u.searchParams.get('updated_at')
    const mine = uidF && uidF === me // row level security: each account sees only its own row
    const one = (req.headers()['accept'] || '').includes('vnd.pgrst.object')
    if (m === 'GET') { const r = mine && db.get(uidF); return json(r ? [{ data: r.data, updated_at: r.updated_at }] : []) }
    if (m === 'PATCH') {
      const b = req.postDataJSON(), r = mine && db.get(uidF)
      if (!r || (verF && +new Date(verF.replace(/^eq\./, '')) !== +new Date(r.updated_at))) return json([])
      r.data = b.data; r.updated_at = pgTime(b.updated_at); log.saves.push({ uid: uidF, people: b.data.people.map(p => p.id) })
      return json([{ updated_at: r.updated_at }])
    }
    if (m === 'POST') {
      const b = req.postDataJSON(), prefer = req.headers()['prefer'] || ''
      if (b.user_id !== me) return json({ code: '42501', message: 'new row violates row-level security policy' }, 403)
      if (gone.has(me)) return json({ code: '23503', message: 'insert or update on table "trees" violates foreign key constraint' }, 409)
      if (db.has(b.user_id) && !prefer.includes('merge-duplicates')) return json({ code: '23505', message: 'duplicate key value violates unique constraint' }, 409)
      db.set(b.user_id, { data: b.data, updated_at: pgTime(b.updated_at) }); log.saves.push({ uid: b.user_id, people: b.data.people.map(p => p.id) })
      const row = { updated_at: db.get(b.user_id).updated_at }
      return one ? json(row, 201) : json([row], 201)
    }
  }
  if (path.startsWith('/storage/v1/object/sign/media') && m === 'POST') {
    const { paths } = req.postDataJSON()
    return json(paths.map(p => files.has(p) && p.startsWith(me + '/') ? { path: p, signedURL: `/object/sign/media/${p}?token=t`, error: null } : { path: p, signedURL: null, error: 'Object not found' }))
  }
  if (path.startsWith('/storage/v1/object/sign/media/')) return route.fulfill({ status: 200, contentType: 'image/png', body: PNG })
  if (path.startsWith('/storage/v1/object/media/') && (m === 'POST' || m === 'PUT')) { const p = decodeURIComponent(path.slice('/storage/v1/object/media/'.length)); if (!p.startsWith(me + '/')) return json({ statusCode: '403', message: 'rls' }, 403); files.add(p); return json({ Key: 'media/' + p, Id: p }) }
  if (path.startsWith('/storage/v1/object/media') && m === 'DELETE') {
    const { prefixes } = req.postDataJSON(); log.deletes.push(prefixes)
    const done = prefixes.filter(p => p.startsWith(me + '/') && files.delete(p)); return json(done.map(name => ({ name })))
  }
  if (path.startsWith('/storage/v1/object/list/media')) {
    const { prefix, limit = 100, offset = 0 } = req.postDataJSON(); if (!prefix.startsWith(me)) return json([])
    const seen = new Map()
    for (const f of files) if (f.startsWith(prefix + '/')) { const rest = f.slice(prefix.length + 1).split('/'); seen.set(rest[0], rest.length === 1) }
    return json([...seen].sort().slice(offset, offset + limit).map(([name, file]) => file ? { name, id: 'id-' + name, created_at: '2026-10-01T00:00:00Z' } : { name, id: null }))
  }
  if (path === '/rest/v1/rpc/delete_my_account') {
    if (rpcMissing) return json({ code: 'PGRST202', message: 'Could not find the function public.delete_my_account(p_really) in the schema cache' }, 404)
    if (!me) return json({ code: 'P0001', message: 'not_signed_in' }, 400)
    if (!req.postDataJSON().p_really) return json('ready')
    db.delete(me); gone.add(me); for (let i = problems.length - 1; i >= 0; i--) if (problems[i].user_id === me) problems.splice(i, 1)
    return json('deleted')
  }
  if (path === '/rest/v1/rpc/report_problem') { const b = req.postDataJSON(); problems.push({ user_id: me, ...b }); return json('00000000-0000-0000-0000-000000000001') }
  if (path.startsWith('/rest/v1/')) return json([]) // share links, inbox
  return json({})
}

// ---------------------------------------------------------------- helpers
const sleep = ms => new Promise(r => setTimeout(r, ms))
async function until(fn, what, ms = 8000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await fn()) return } catch { } await sleep(100) } throw new Error('timeout: ' + what) }
const browser = await chromium.launch()
async function ctx() {
  const c = await browser.newContext()
  await c.route(SB + '/**', fake)
  await c.route(/mc\.yandex|yandex\.ru|googletagmanager/, r => r.abort())
  return c
}
async function open(c) {
  const p = await c.newPage(); p.on('pageerror', e => console.log('  [pageerror]', e.message))
  await p.goto(APP); await p.waitForFunction(() => window.__core && window.__core.ui.loaded)
  return p
}
const signIn = (p, email) => p.evaluate(e => window.__cloud.signInEmail(e, 'pw'), email)
const ready = (p, uid) => until(() => p.evaluate(u => window.__core.cloud.synced && !window.__core.cloud.busy && window.__core.cloud.session?.user.id === u && window.__core.S.settings.familyName === u, uid), 'tab ready for ' + uid)
const people = p => p.evaluate(() => window.__core.S.people.map(x => x.id))
const edit = (p, id, field, v) => p.evaluate(([id, f, v]) => { const x = window.__core.S.people.find(q => q.id === id); x[f] = v; window.__core.commit(true) }, [id, field, v])
const add = (p, first) => p.evaluate(f => { window.__core.addPerson({ first: f, last: 'Новый', gender: 'f' }); window.__core.commit(true) }, first)
const cloudOf = uid => db.get(uid)?.data
const person = (uid, id) => cloudOf(uid)?.people.find(x => x.id === id)
const toasts = p => p.evaluate(() => window.__core.ui.toasts.map(t => t.msg))
const results = []
async function scenario(name, fn, opt = {}) {
  db.clear(); files.clear(); log.deletes = []; log.saves = []; down = false; gone.clear(); problems.length = 0; rpcMissing = false
  seed('uidA', [P('a1', { avatar: 'sb:uidA/a1/avatar-1.png' }), P('a2', { avatar: 'sb:uidA/a2/avatar-2.png' }), P('a3')])
  seed('uidB', [P('b1', { avatar: 'sb:uidB/b1/avatar-9.png' })])
  try {
    await fn()
    if (!opt.custom) {
    assert.equal(log.deletes.length, 0, 'no file is ever deleted from Storage')
    // the photos of A are still in A's tree, and B's tree never got A's people (and back)
    assert.ok(cloudOf('uidA').people.every(p => p.id !== 'b1'), 'B people never land in A')
    assert.ok(cloudOf('uidB').people.every(p => !['a1', 'a2', 'a3'].includes(p.id)), 'A people never land in B')
    assert.equal(person('uidA', 'a1').avatar, 'sb:uidA/a1/avatar-1.png'); assert.equal(person('uidA', 'a2').avatar, 'sb:uidA/a2/avatar-2.png')
    }
    results.push(['✓', name]); console.log('✓', name)
  } catch (e) { results.push(['✗', name, e.message]); console.log('✗', name, '\n   ', e.message) }
}

// ---------------------------------------------------------------- scenarios
await scenario('Две вкладки одного аккаунта правят разных людей почти одновременно', async () => {
  const c = await ctx(); const t1 = await open(c); await signIn(t1, 'a@x.ru'); await ready(t1, 'uidA')
  const t2 = await open(c); await ready(t2, 'uidA')
  await Promise.all([edit(t1, 'a1', 'bio', 'из первой'), edit(t2, 'a2', 'job', 'из второй')])
  await until(() => person('uidA', 'a1').bio === 'из первой' && person('uidA', 'a2').job === 'из второй', 'both edits in the cloud')
  await until(async () => (await t1.evaluate(() => window.__core.S.people.find(p => p.id === 'a2').job)) === 'из второй', 'tab 1 sees tab 2 edit')
  await c.close()
})

await scenario('Две вкладки одновременно добавляют людей', async () => {
  const c = await ctx(); const t1 = await open(c); await signIn(t1, 'a@x.ru'); await ready(t1, 'uidA')
  const t2 = await open(c); await ready(t2, 'uidA')
  await Promise.all([add(t1, 'Анна'), add(t2, 'Борис')])
  await until(() => cloudOf('uidA').people.map(p => p.first).includes('Борис') && cloudOf('uidA').people.map(p => p.first).includes('Анна'), 'both new people kept')
  await c.close()
})

await scenario('Смена аккаунта в соседней вкладке: древа не смешиваются, правка не теряется', async () => {
  const c = await ctx(); const t1 = await open(c); await signIn(t1, 'a@x.ru'); await ready(t1, 'uidA')
  const t2 = await open(c); await ready(t2, 'uidA')
  await edit(t1, 'a3', 'bio', 'перед сменой') // saved a moment later — the switch in t2 happens in between
  await t2.evaluate(async () => { await window.__cloud.signOutCloud(); await window.__cloud.signInEmail('b@x.ru', 'pw') })
  await ready(t1, 'uidB')
  assert.deepEqual(await people(t1), ['b1'], 'tab 1 now shows B')
  await sleep(2500)
  // the edit made for A reached A (before the switch) or waits in A's cache: signing back in as A brings it
  await t2.evaluate(async () => { await window.__cloud.signOutCloud(); await window.__cloud.signInEmail('a@x.ru', 'pw') })
  await ready(t1, 'uidA')
  await until(() => person('uidA', 'a3').bio === 'перед сменой', 'A edit in the cloud')
  await c.close()
})

await scenario('Правка и сразу открытие демо: в аккаунт не уходят Романовы, правка сохраняется', async () => {
  const c = await ctx(); const t1 = await open(c); await signIn(t1, 'a@x.ru'); await ready(t1, 'uidA')
  await t1.evaluate(async () => { const x = window.__core.S.people.find(p => p.id === 'a1'); x.bio = 'до демо'; window.__core.commit(true); await window.__demo.openDemo('romanov') })
  await sleep(3000)
  assert.equal(cloudOf('uidA').people.length, 3, 'no demo people in the cloud')
  await t1.evaluate(() => window.__demo.closeDemo())
  await until(() => person('uidA', 'a1').bio === 'до демо', 'edit saved after the demo')
  assert.deepEqual(await people(t1), ['a1', 'a2', 'a3'])
  await c.close()
})

await scenario('Вход и сразу открытие демо', async () => {
  const c = await ctx(); const t1 = await open(c)
  await t1.evaluate(async () => { window.__cloud.signInEmail('a@x.ru', 'pw'); await window.__demo.openDemo('romanov') })
  await sleep(3000)
  assert.equal(cloudOf('uidA').people.length, 3, 'no demo people in the cloud')
  await t1.evaluate(() => window.__demo.closeDemo())
  await ready(t1, 'uidA'); assert.deepEqual(await people(t1), ['a1', 'a2', 'a3'])
  await sleep(2000); assert.equal(cloudOf('uidA').people.length, 3)
  await c.close()
})

await scenario('Ноутбук и телефон (инкогнито): правки на обоих, одно было без связи', async () => {
  const laptop = await ctx(), phone = await ctx()
  const l = await open(laptop); await signIn(l, 'a@x.ru'); await ready(l, 'uidA')
  const ph = await open(phone); await signIn(ph, 'a@x.ru'); await ready(ph, 'uidA')
  // the phone loses the connection (metro) and edits; the laptop edits too
  await phone.route(SB + '/**', r => r.abort('internetdisconnected'))
  await edit(ph, 'a2', 'bio', 'с телефона в метро'); await sleep(2000)
  await edit(l, 'a3', 'job', 'с ноутбука'); await until(() => person('uidA', 'a3').job === 'с ноутбука', 'laptop saved')
  await phone.unroute(SB + '/**'); await phone.route(SB + '/**', fake)
  await ph.evaluate(() => dispatchEvent(new Event('online')))
  await until(() => person('uidA', 'a2').bio === 'с телефона в метро' && person('uidA', 'a3').job === 'с ноутбука', 'both edits survive')
  await laptop.close(); await phone.close()
})

await scenario('Старая вкладка, открытая со вчера, не затирает свежие правки', async () => {
  const c1 = await ctx(), c2 = await ctx()
  const old = await open(c1); await signIn(old, 'a@x.ru'); await ready(old, 'uidA')
  const fresh = await open(c2); await signIn(fresh, 'a@x.ru'); await ready(fresh, 'uidA')
  await fresh.evaluate(() => { window.__core.S.people = window.__core.S.people.filter(p => p.id !== 'a3'); window.__core.S.people.find(p => p.id === 'a1').avatar = 'sb:uidA/a1/avatar-NEW.png'; window.__core.commit(true) })
  files.add('uidA/a1/avatar-NEW.png')
  await until(() => person('uidA', 'a1').avatar === 'sb:uidA/a1/avatar-NEW.png', 'new photo saved')
  // the old tab (did not see this) changes something else
  await edit(old, 'a2', 'bio', 'из старой вкладки')
  await until(() => person('uidA', 'a2').bio === 'из старой вкладки', 'old tab edit saved')
  assert.equal(person('uidA', 'a1').avatar, 'sb:uidA/a1/avatar-NEW.png', 'new photo not overwritten')
  assert.ok(!person('uidA', 'a3'), 'deleted person did not come back')
  db.get('uidA').data.people.find(p => p.id === 'a1').avatar = 'sb:uidA/a1/avatar-1.png' // for the common checks
  await c1.close(); await c2.close()
})

await scenario('Кэш прошлой версии приложения (общий ключ) не воскрешает удалённое', async () => {
  const c = await ctx(); const t1 = await open(c)
  // the old version left account A's tree in the shared key, saved before the cloud copy changed elsewhere
  await t1.evaluate(async () => {
    const r = indexedDB.open('keyval-store'); await new Promise(ok => r.onsuccess = ok)
    const tx = r.result.transaction('keyval', 'readwrite'), st = tx.objectStore('keyval')
    st.put({ people: ['a1', 'a2', 'a3', 'a4'].map(id => ({ id, first: id, last: '', media: [], events: [], avatar: '' })), rels: [], achievements: [], settings: { onboarded: true, familyName: 'uidA' } }, 'predki:tree')
    st.put('uidA', 'predki:owner'); st.put(Date.now() - 2 * 864e5, 'predki:savedAt'); await new Promise(ok => tx.oncomplete = ok)
  })
  const t2 = await open(c); await signIn(t2, 'a@x.ru'); await ready(t2, 'uidA')
  assert.deepEqual(await people(t2), ['a1', 'a2', 'a3'], 'the cloud copy wins: a4 was deleted elsewhere')
  await c.close()
})

await scenario('Выход и вход другим аккаунтом в той же вкладке', async () => {
  const c = await ctx(); const t1 = await open(c); await signIn(t1, 'a@x.ru'); await ready(t1, 'uidA')
  await edit(t1, 'a1', 'bio', 'последняя правка'); await t1.evaluate(() => window.__core.signOut())
  assert.equal(person('uidA', 'a1').bio, 'последняя правка', 'the last edit reached the cloud before signing out')
  await signIn(t1, 'b@x.ru'); await ready(t1, 'uidB'); assert.deepEqual(await people(t1), ['b1'])
  await sleep(2000)
  await c.close()
})

// ---------------------------------------------------------------- account deletion, clearing, problem reports
const settings = async p => { await p.evaluate(() => window.__core.go('settings')); await p.waitForSelector('.bt-account') }
const idbKeys = p => p.evaluate(async () => { const r = indexedDB.open('keyval-store'); await new Promise(ok => r.onsuccess = ok); const st = r.result.transaction('keyval').objectStore('keyval'); const q = st.getAllKeys(); await new Promise(ok => q.onsuccess = ok); return q.result })

await scenario('Удаление аккаунта: древо, файлы и вход исчезают, соседняя вкладка не возвращает древо', async () => {
  const c = await ctx(); const t1 = await open(c); await signIn(t1, 'a@x.ru'); await ready(t1, 'uidA')
  const t2 = await open(c); await ready(t2, 'uidA')
  await settings(t1)
  await t1.getByRole('button', { name: 'Удалить аккаунт' }).click()
  const go = t1.getByRole('button', { name: 'Удалить навсегда' })
  assert.ok(await go.isDisabled(), 'disabled until the word is typed')
  await t1.fill('#delWord', 'Удалить')
  await edit(t2, 'a3', 'bio', 'правка в последний момент') // the other tab is about to save
  await go.click()
  await until(() => t1.evaluate(() => !window.__core.cloud.session), 'tab 1 signed out')
  await until(async () => (await toasts(t1)).some(m => m.includes('удалены')), 'toast shown')
  await until(() => t2.evaluate(() => !window.__core.cloud.session && !window.__core.S.people.length), 'tab 2 signed out and empty')
  await sleep(3000)
  assert.ok(!db.has('uidA'), 'the tree row is gone and stays gone')
  assert.ok(![...files].some(f => f.startsWith('uidA/')), 'A files deleted')
  assert.ok(files.has('uidB/b1/avatar-9.png'), 'B files untouched'); assert.ok(db.has('uidB'))
  assert.ok(!(await idbKeys(t1)).some(k => String(k).includes('uidA')), 'no copy of A left in the browser')
  await c.close()
}, { custom: 1 })

await scenario('Удаление, когда SQL ещё не запущен: ничего не удаляется, понятное сообщение', async () => {
  rpcMissing = true
  const c = await ctx(); const t1 = await open(c); await signIn(t1, 'a@x.ru'); await ready(t1, 'uidA')
  await settings(t1); await t1.getByRole('button', { name: 'Удалить аккаунт' }).click()
  await t1.fill('#delWord', 'удалить'); await t1.getByRole('button', { name: 'Удалить навсегда' }).click()
  await t1.waitForSelector('.dlg-err')
  assert.match(await t1.textContent('.dlg-err'), /не\s*настроено/)
  assert.equal(log.deletes.length, 0); assert.ok(db.has('uidA')); assert.ok(files.has('uidA/a1/avatar-1.png'))
  await c.close()
}, { custom: 1 })

await scenario('«Очистить всё» удаляет и файлы, но только свои', async () => {
  const c = await ctx(); const t1 = await open(c); t1.on('dialog', d => d.accept()); await signIn(t1, 'a@x.ru'); await ready(t1, 'uidA')
  await settings(t1); await t1.getByRole('button', { name: 'Очистить всё' }).click()
  await until(() => cloudOf('uidA').people.length === 0 && ![...files].some(f => f.startsWith('uidA/')), 'tree and files cleared')
  assert.ok(files.has('uidB/b1/avatar-9.png'))
  await c.close()
}, { custom: 1 })

await scenario('Сообщить о проблеме: текст и тех. детали без содержимого древа', async () => {
  const c = await ctx(); const t1 = await open(c); await signIn(t1, 'a@x.ru'); await ready(t1, 'uidA')
  await t1.evaluate(() => { try { JSON.parse('{oops') } catch (e) { window.__problems?.logProblem('test', e) } })
  await settings(t1); await t1.getByRole('button', { name: /Сообщить о\s*проблеме/ }).click()
  assert.ok(await t1.getByRole('button', { name: 'Отправить' }).isDisabled())
  await t1.fill('#repMsg', 'Фото бабушки не появилось'); await t1.getByRole('button', { name: 'Отправить' }).click()
  await until(() => problems.length === 1, 'report saved')
  const r = problems[0]
  assert.equal(r.p_kind, 'user'); assert.equal(r.p_message, 'Фото бабушки не появилось'); assert.equal(r.p_contact, 'a@x.ru'); assert.equal(r.user_id, 'uidA')
  assert.equal(r.p_details.people, 3); assert.equal(r.p_details.screen, 'settings')
  assert.ok(!JSON.stringify(r.p_details).includes('Тестов'), 'no names from the tree')
  await until(async () => (await toasts(t1)).some(m => m.includes('Спасибо')), 'thank-you toast')
  await c.close()
})

await browser.close()
console.log(`\n${results.filter(r => r[0] === '✓').length} из ${results.length} сценариев прошли`)
process.exit(results.every(r => r[0] === '✓') ? 0 : 1)
