// «Путеводитель»: behaviour of the guide page (pages/GuidePage.tsx). The markup is static HTML (guide/content.html),
// so the few interactive bits are wired here once it is in the page: short words tied to the next one, the split-flap
// title, the meeting checklist, the request templates with «Скопировать», and the section chips that follow the scroll.
import { ui, go, bump, toast } from './core'
import { TPL } from '../guide/templates'

export type GuideSection = 'start' | 'talk' | 'photos' | 'video' | 'search' | 'requests' | 'names' | 'inheritance' | 'faq'

/** open the guide, optionally right at one section (the in-context links on other pages use this) */
export function openGuide(section?: GuideSection) {
  ui.guideAt = section || ''
  if (ui.page === 'guide') { bump(); return }
  go('guide')
}

/** short words stay on the line with the next word (no hanging prepositions) */
function tie(root: HTMLElement) {
  const re = /(^|[\s(«—])([а-яёА-ЯЁA-Za-z0-9]{1,2}|без|для|при|над|под|про|или|как|что|это)\s+/g
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement?.closest('pre,script,style') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT })
  const nodes: Text[] = []; while (w.nextNode()) nodes.push(w.currentNode as Text)
  for (const n of nodes) { const t = n.nodeValue!.replace(re, (_m, a, x) => a + x + ' ').replace(/(\S)\s+—/g, '$1 —'); if (t !== n.nodeValue) n.nodeValue = t }
}

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

/** the split-flap title: stands on the word at once, then the letters run and land on it again (also on a tap) */
function board(root: HTMLElement, word: string): () => void {
  const ABC = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ', D = 70
  const el = root.querySelector<HTMLButtonElement>('#board'); if (!el) return () => {}
  el.textContent = ''
  const cells = [...word].map(ch => {
    const c = document.createElement('span'); c.className = 'sf-c'; c.setAttribute('aria-hidden', 'true')
    c.innerHTML = '<span class="sf-h sf-top"><b></b></span><span class="sf-h sf-bot"><b></b></span><span class="sf-h sf-ft"><b></b></span><span class="sf-h sf-fb"><b></b></span>'
    c.querySelectorAll('.sf-h b').forEach(b => { b.textContent = ch })
    el.appendChild(c); return c
  })
  const state = [...word]; let timers: ReturnType<typeof setTimeout>[] = []
  const q = (c: HTMLElement, s: string) => c.querySelector(s) as HTMLElement
  function flipTo(i: number, ch: string) {
    const c = cells[i], cur = state[i]; state[i] = ch
    q(c, '.sf-top b').textContent = ch; q(c, '.sf-bot b').textContent = cur
    q(c, '.sf-ft b').textContent = cur; q(c, '.sf-fb b').textContent = ch
    c.style.setProperty('--d', D + 'ms'); c.classList.remove('go'); void c.offsetWidth; c.classList.add('go')
    timers.push(setTimeout(() => { q(c, '.sf-bot b').textContent = ch }, D))
  }
  function run(delay: number) {
    if (reduced()) return
    timers.forEach(clearTimeout); timers = []
    ;[...word].forEach((ch, i) => {
      const steps = 3 + ((i * 7 + word.length) % 4)
      const seq = [...Array(steps)].map(() => ABC[Math.floor(Math.random() * ABC.length)]).concat(ch)
      seq.forEach((x, k) => timers.push(setTimeout(() => flipTo(i, x), delay + i * 55 + k * (D + 8))))
    })
  }
  const onClick = () => run(0)
  run(500); el.addEventListener('click', onClick)
  return () => { timers.forEach(clearTimeout); el.removeEventListener('click', onClick) }
}

async function copyText(text: string, fallback?: HTMLElement | null) {
  try { await navigator.clipboard.writeText(text); return true }
  catch {
    if (fallback) { const r = document.createRange(); r.selectNodeContents(fallback); const s = getSelection(); s?.removeAllRanges(); s?.addRange(r) }
    return false
  }
}

/** the meeting checklist is remembered on this device */
function checklist(root: HTMLElement) {
  const CK = 'predki:guideCheck'
  const box = root.querySelector('#checklist'); if (!box) return
  const boxes = [...box.querySelectorAll<HTMLInputElement>('input')]
  let saved: Record<string, 1> = {}; try { saved = JSON.parse(localStorage.getItem(CK) || '{}') || {} } catch { /* private mode */ }
  boxes.forEach(b => { b.checked = !!saved[b.id] })
  const count = () => { const el = root.querySelector('#checkCount'); if (el) el.textContent = `${boxes.filter(b => b.checked).length} из ${boxes.length}` }
  count()
  box.addEventListener('change', () => {
    const s: Record<string, 1> = {}; boxes.forEach(b => { if (b.checked) s[b.id] = 1 })
    try { localStorage.setItem(CK, JSON.stringify(s)) } catch { /* private mode */ }
    count()
  })
  root.querySelector('#checkReset')?.addEventListener('click', () => { boxes.forEach(b => { b.checked = false }); try { localStorage.removeItem(CK) } catch { /* private mode */ } count() })
}

/** request templates: three tabs, the parts to replace are highlighted, «Скопировать» copies the plain text */
function templates(root: HTMLElement) {
  const tabs = root.querySelector('.tpl-tabs'), pre = root.querySelector<HTMLElement>('#tplText'), note = root.querySelector('#tplNote')
  if (!tabs || !pre || !note) return
  const esc = (s: string) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as Record<string, string>)[c])
  let cur = 'zags'
  const show = (k: string) => {
    cur = k
    pre.innerHTML = esc(TPL[k].text).replace(/\[([^\]]+)\]/g, '<mark>[$1]</mark>')
    note.textContent = TPL[k].note
    tabs.querySelectorAll<HTMLButtonElement>('button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.t === k)))
    root.querySelector('#tpl')?.setAttribute('aria-labelledby', 'tab-' + k)
  }
  show('zags')
  tabs.addEventListener('click', e => { const b = (e.target as HTMLElement).closest('button'); if (b?.dataset.t) show(b.dataset.t) })
  root.querySelector('#copyBtn')?.addEventListener('click', async () => {
    const ok = await copyText(TPL[cur].text, pre)
    toast(ok ? 'Шаблон скопирован' : 'Текст выделен, скопируйте его')
  })
  root.querySelector('#mailBtn')?.addEventListener('click', async () => { const ok = await copyText('hello@predki.me'); toast(ok ? 'Адрес скопирован' : 'hello@predki.me') })
}

/** the chips follow the scroll; a chip tap scrolls inside the page (the app keeps the address bar for itself) */
function chips(root: HTMLElement, scroller: HTMLElement): () => void {
  const bar = root.querySelector<HTMLElement>('#chips'); if (!bar) return () => {}
  const links = [...bar.querySelectorAll<HTMLAnchorElement>('a')]
  const secs = links.map(a => root.querySelector<HTMLElement>(a.getAttribute('href')!)).filter(Boolean) as HTMLElement[]
  let active: string | null = null
  const set = (id: string | null) => {
    if (id === active) return; active = id
    links.forEach(a => a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + id)))
    const a = links.find(l => l.getAttribute('href') === '#' + id)
    if (a) bar.scrollTo({ left: a.offsetLeft - bar.offsetLeft - bar.clientWidth / 2 + a.offsetWidth / 2, behavior: reduced() ? 'auto' : 'smooth' })
  }
  let f = 0
  const spy = () => {
    const top = scroller.getBoundingClientRect().top, y = top + scroller.clientHeight * .3
    let id: string | null = null
    for (const s of secs) if (s.getBoundingClientRect().top <= y) id = s.id
    set(id)
  }
  const onScroll = () => { cancelAnimationFrame(f); f = requestAnimationFrame(spy) }
  // in-page links (chips, «открытые базы», «документы») scroll the page itself instead of changing the address
  const onClick = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]'); if (!a) return
    const t = root.querySelector<HTMLElement>(a.getAttribute('href')!); if (!t) return
    e.preventDefault(); t.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' })
  }
  scroller.addEventListener('scroll', onScroll, { passive: true }); root.addEventListener('click', onClick)
  spy()
  return () => { scroller.removeEventListener('scroll', onScroll); root.removeEventListener('click', onClick); cancelAnimationFrame(f) }
}

/** wire everything once the markup is in the page; returns the cleanup */
export function initGuide(root: HTMLElement, scroller: HTMLElement): () => void {
  const main = root.querySelector<HTMLElement>('.gd-main'); if (main) tie(main)
  const offs = [board(root, 'ПУТЕВОДИТЕЛЬ'), chips(root, scroller)]
  checklist(root); templates(root)
  return () => offs.forEach(f => f())
}

/** jump to a section without the smooth scroll (used when the page opens from a link on another page) */
export function jumpTo(root: HTMLElement, section: string) {
  const t = root.querySelector<HTMLElement>('#' + section); if (t) t.scrollIntoView({ behavior: 'auto', block: 'start' })
}
