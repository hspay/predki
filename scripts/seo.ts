// Static pages for search engines and AI assistants, written into dist/ after `vite build` (npm run build).
// The app itself is one page that draws everything with JavaScript, so robots that do not run scripts (Yandex often,
// GPTBot, ClaudeBot, Perplexity) see an empty page. These pages are plain HTML with real text:
//   /primery/                 «Примеры семейного древа» — the hub of the sample families
//   /romanovy/                «Древо Романовых»
//   /game-of-thrones/         «Игра престолов»: Таргариены and the great houses, + one page per house (/game-of-thrones/stark/ …)
//   /cullens/  /kardashians/  the other sample families
//   /putevoditel/             «Путеводитель» (src/guide/content.html) as a public page
//   sitemap.xml
// Everything comes from the same data as the demo (src/lib/demoFamilies.ts), so the pages never drift from the app.
// Run on its own: npx tsx scripts/seo.ts (after a build).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { FAMILIES, type DemoFamily, type DP } from '../src/lib/demoFamilies'
import { TPL } from '../src/guide/templates'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const SITE = 'https://predki.me'
const TODAY = new Date().toISOString().slice(0, 10)
const METRICA = 113662509
/** the brand fonts already on the site (public/fonts/brand), as on the 404 page */
const FONT_FACES = `@font-face{font-family:"Sofia Sans Extra Condensed";font-weight:800;font-display:swap;src:url(/fonts/brand/sofia-sans-extra-condensed-cyrillic-800-normal.woff2) format("woff2");unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}
@font-face{font-family:"Sofia Sans Extra Condensed";font-weight:800;font-display:swap;src:url(/fonts/brand/sofia-sans-extra-condensed-latin-800-normal.woff2) format("woff2");unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:"IBM Plex Sans";font-weight:400;font-display:swap;src:url(/fonts/brand/ibm-plex-sans-cyrillic-400-normal.woff2) format("woff2");unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}
@font-face{font-family:"IBM Plex Sans";font-weight:400;font-display:swap;src:url(/fonts/brand/ibm-plex-sans-latin-400-normal.woff2) format("woff2");unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:"IBM Plex Sans";font-weight:500;font-display:swap;src:url(/fonts/brand/ibm-plex-sans-cyrillic-500-normal.woff2) format("woff2");unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}
@font-face{font-family:"IBM Plex Sans";font-weight:500;font-display:swap;src:url(/fonts/brand/ibm-plex-sans-latin-500-normal.woff2) format("woff2");unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:"IBM Plex Mono";font-weight:500;font-display:swap;src:url(/fonts/brand/ibm-plex-mono-cyrillic-500-normal.woff2) format("woff2");unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}
@font-face{font-family:"IBM Plex Mono";font-weight:500;font-display:swap;src:url(/fonts/brand/ibm-plex-mono-latin-500-normal.woff2) format("woff2");unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
`

if (!fs.existsSync(path.join(DIST, 'index.html'))) { console.error('seo: run `vite build` first (dist/index.html is missing)'); process.exit(1) }

// ---------------------------------------------------------------- text helpers
const esc = (s: string) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as Record<string, string>)[c])
/** short words stay on the line with the next word (no hanging prepositions), only in text, never inside tags, <pre> or scripts */
const TIE = /(^|[\s(«—])([а-яёА-ЯЁA-Za-z0-9]{1,2}|без|для|при|над|под|про|или|как|что|это)\s+/g
function tieHtml(html: string) {
  return html.split(/(<pre[\s\S]*?<\/pre>|<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>)/).map((part, i) => {
    if (i % 2) return part
    return part.replace(TIE, (_m, a, x) => a + x + '\u00a0').replace(TIE, (_m, a, x) => a + x + '\u00a0').replace(/(\S) +—/g, '$1\u00a0—')
  }).join('')
}
const plural = (n: number, one: string, few: string, many: string) => {
  const a = Math.abs(n) % 100, b = a % 10
  return `${n}\u00a0${a > 10 && a < 20 ? many : b === 1 ? one : b >= 2 && b <= 4 ? few : many}`
}
const MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
const MON1 = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь']

// ---------------------------------------------------------------- one family, read from the demo data
interface Rel { id: string; step?: boolean; adopt?: boolean; partner?: boolean; ex?: boolean; from?: string; to?: string }
class Fam {
  f: DemoFamily; byId = new Map<string, DP>(); parents = new Map<string, Rel[]>(); children = new Map<string, Rel[]>(); spouses = new Map<string, Rel[]>()
  pets = new Map<string, { name: string; kind: string }[]>(); westeros: boolean
  constructor(f: DemoFamily) {
    this.f = f; this.westeros = !!f.era
    f.people.forEach(p => this.byId.set(p.id, p))
    const push = (m: Map<string, Rel[]>, k: string, r: Rel) => { if (!m.has(k)) m.set(k, []); m.get(k)!.push(r) }
    f.rels.forEach(([type, a, b, from, flags, to]) => {
      const fl = (flags || '').split(' '), o = { step: fl.includes('step'), adopt: fl.includes('adopt'), partner: fl.includes('partner'), ex: fl.includes('ex'), from: from || '', to: to || '' }
      if (type === 'parent') { push(this.parents, b, { id: a, ...o }); push(this.children, a, { id: b, ...o }) }
      if (type === 'spouse') { push(this.spouses, a, { id: b, ...o }); push(this.spouses, b, { id: a, ...o }) }
    })
    ;(f.pets || []).forEach(([owner, name, kind]) => { if (!this.pets.has(owner)) this.pets.set(owner, []); this.pets.get(owner)!.push({ name: name[0], kind }) })
  }
  name(p: DP) { return `${p.n[0]} ${p.n[1]}`.trim() }
  place(k?: string) { return k ? this.f.places[k]?.[0] || '' : '' }
  year(s?: string) { const m = (s || '').match(/(\d{3,4})$/); return m ? String(+m[1]) : '' }
  date(s?: string) {
    if (!s) return ''
    if (this.westeros) return `${+s} г. от Завоевания`
    const p = s.split('.')
    if (p.length === 3) return `${+p[0]} ${MON[+p[1] - 1]} ${p[2]}`
    if (p.length === 2) return `${MON1[+p[0] - 1]} ${p[1]}`
    return `${s}`
  }
  years(p: DP) {
    const b = this.year(p.b), d = this.year(p.d)
    return b && d ? `${b}–${d}` : b ? `род. ${b}` : d ? `ум. ${d}` : ''
  }
  /** the longest line of parents and children: «N поколений» */
  generations() {
    const memo = new Map<string, number>()
    const depth = (id: string, seen = new Set<string>()): number => {
      if (memo.has(id)) return memo.get(id)!
      if (seen.has(id)) return 1
      seen.add(id)
      const ps = (this.parents.get(id) || []).filter(r => !r.step && !r.adopt)
      const d = 1 + Math.max(0, ...ps.map(r => depth(r.id, seen)))
      memo.set(id, d); return d
    }
    return Math.max(...this.f.people.map(p => depth(p.id)))
  }
}

// ---------------------------------------------------------------- Westeros houses
const HOUSES: Record<string, { ru: string; gen: string; seat: string; words?: string; about: string }> = {
  targaryen: { ru: 'Таргариены', gen: 'Таргариенов', seat: 'Драконий Камень, после Завоевания — Королевская Гавань', words: '«Пламя и кровь»', about: 'Королевская династия Вестероса и всадники драконов: от Эйегона Завоевателя до Дейенерис, матери драконов, через Пляску драконов из «Дома дракона».' },
  stark: { ru: 'Старки', gen: 'Старков', seat: 'Винтерфелл', words: '«Зима близко»', about: 'Хранители Севера: Рикард Старк, Эддард и Кейтилин, их дети Робб, Санса, Арья, Бран, Рикон и Джон Сноу.' },
  lannister: { ru: 'Ланнистеры', gen: 'Ланнистеров', seat: 'Утёс Кастерли', words: '«Услышь мой рёв!»', about: 'Самый богатый дом Вестероса: Тайвин Ланнистер, его дети Серсея, Джейме и Тирион и внуки на Железном троне.' },
  baratheon: { ru: 'Баратеоны', gen: 'Баратеонов', seat: 'Штормовой Предел', words: '«Нам ярость!»', about: 'Родня Таргариенов по крови: от Рогара Баратеона до Роберта, Станниса и Ренли, а также Джоффри, Мирцеллы, Томмена и Джендри.' },
  tully: { ru: 'Талли', gen: 'Талли', seat: 'Риверран', words: '«Семья, долг, честь»', about: 'Лорды Речных земель: Хостер Талли и его дети Кейтилин, Лиза и Эдмар.' },
  arryn: { ru: 'Аррены', gen: 'Арренов', seat: 'Орлиное Гнездо', words: '«Высокий, как честь»', about: 'Хранители Долины: Джон Аррен, Лиза и их сын Роберт, а в эпоху «Дома дракона» — Эймма Аррен, мать Рейениры.' },
  velaryon: { ru: 'Веларионы', gen: 'Веларионов', seat: 'Дрифтмарк', about: 'Морской дом валирийской крови: Корлис Морской Змей, Лейна и Лейнор, сыновья Рейениры.' },
  hightower: { ru: 'Хайтауэры', gen: 'Хайтауэров', seat: 'Высокая Башня в Староместе', words: '«Мы освещаем путь»', about: 'Дом королевы Алисенты, матери Эйегона II и Эймонда.' },
  martell: { ru: 'Мартеллы', gen: 'Мартеллов', seat: 'Солнечное Копьё', words: '«Непреклонные, несгибаемые, несдающиеся»', about: 'Правители Дорна, породнившиеся с Таргариенами.' },
  tyrell: { ru: 'Тиреллы', gen: 'Тиреллов', seat: 'Хайгарден', words: '«Вырастая — крепнем»', about: 'Дом Маргери Тирелл, королевы трёх королей.' },
}
const HOUSE_OF_EN: Record<string, string> = Object.fromEntries(Object.keys(HOUSES).map(k => [k[0].toUpperCase() + k.slice(1), k]))
const MANUAL: Record<string, string[]> = { jon: ['stark', 'targaryen'] }
function housesOf(F: Fam, p: DP, seen = new Set<string>()): string[] {
  if (MANUAL[p.id]) return MANUAL[p.id]
  const out: string[] = []
  const own = HOUSE_OF_EN[p.n[3]]
  if (own) out.push(own)
  const was = p.was && HOUSE_OF_EN[p.was[1]]
  if (was && !out.includes(was)) out.push(was)
  if (!out.length && !seen.has(p.id)) {
    seen.add(p.id)
    // bastards and epithets («Дункан Малый», «Кровавый Ворон»): the father's house, else the mother's
    const ps = (F.parents.get(p.id) || []).filter(r => !r.step).map(r => F.byId.get(r.id)!).sort((a, b) => (a.g === 'm' ? -1 : 1) - (b.g === 'm' ? -1 : 1))
    for (const q of ps) { const h = housesOf(F, q, seen)[0]; if (h) { out.push(h); break } }
  }
  return out
}

// ---------------------------------------------------------------- page parts
const FONTS = `<link rel="preload" href="/fonts/brand/sofia-sans-extra-condensed-cyrillic-800-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/brand/ibm-plex-sans-cyrillic-400-normal.woff2" as="font" type="font/woff2" crossorigin>`
const metrica = (page: string) => `<script>
if (/(^|\\.)predki\\.me$/.test(location.hostname)) {
  (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=${METRICA}','ym');
  ym(${METRICA},'init',{webvisor:false,clickmap:false,trackLinks:true,accurateTrackBounce:true});
  // «Открыть древо» / «Построить древо» on a public page: goal seo_cta (create it in Metrica as «JavaScript-событие»)
  document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('[data-cta]');if(a)ym(${METRICA},'reachGoal','seo_cta',{page:'${page}',cta:a.getAttribute('data-cta')})});
}
</script>`

interface Page { url: string; title: string; description: string; h1: string; body: string; jsonld: object[]; crumbs: [string, string][]; image?: string; css?: string; noTop?: boolean; head?: string }
const crumbsLd = (c: [string, string][]) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: c.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + url })) })
const faqLd = (qa: [string, string][]) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: qa.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } })) })
const faqHtml = (qa: [string, string][]) => `<section class="sec" id="faq"><div class="wrap"><h2>Вопросы</h2><div class="faq">${qa.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${a}</p></details>`).join('')}</div></div></section>`
const ORG = { '@type': 'Organization', '@id': SITE + '/#org', name: 'Predki', url: SITE + '/', logo: SITE + '/apple-touch-icon.png', email: 'hello@predki.me', founder: { '@type': 'Person', name: 'Андрей Брызгалин' } }

const TOP = `<header class="top"><div class="wrap">
  <a class="brand" href="/" aria-label="Predki — на главную"><img src="/favicon.svg?v=2" alt="" width="22" height="22">Predki</a>
  <nav aria-label="Разделы"><a href="/primery/">Примеры древа</a><a href="/putevoditel/">Путеводитель</a><a class="btn" href="/" data-cta="top">Построить древо</a></nav>
</div></header>`
const FOOT = `<footer class="site"><div class="wrap">
  <div class="foot-cols">
    <div><a class="brand light" href="/"><img src="/favicon.svg?v=2" alt="" width="22" height="22">Predki</a><p>Семейное древо онлайн: постройте родословную, карту переездов и календарь памятных дат вместе с родными. Бесплатно.</p></div>
    <nav aria-label="Примеры древа"><b>Примеры древа</b><a href="/romanovy/">Древо Романовых</a><a href="/game-of-thrones/">Древо «Игры престолов»</a><a href="/cullens/">Семья Калленов</a><a href="/kardashians/">Кардашьяны и Дженнеры</a></nav>
    <nav aria-label="Полезное"><b>Полезное</b><a href="/putevoditel/">Как составить родословную</a><a href="/putevoditel/#requests">Образцы запросов в архив</a><a href="/privacy.html">Политика конфиденциальности</a><a href="mailto:hello@predki.me">hello@predki.me</a></nav>
  </div>
</div></footer>`

function render(p: Page) {
  const crumbs = p.crumbs.length > 1 ? `<nav class="crumbs" aria-label="Навигация">${p.crumbs.map(([n, u], i) => i < p.crumbs.length - 1 ? `<a href="${u}">${esc(n)}</a>` : `<span aria-current="page">${esc(n)}</span>`).join(' / ')}</nav>` : ''
  const body = tieHtml(p.body.replace('%CRUMBS%', crumbs))
  const ld = [...p.jsonld, crumbsLd(p.crumbs)]
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.description)}">
<link rel="canonical" href="${SITE}${p.url}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Predki">
<meta property="og:locale" content="ru_RU">
<meta property="og:title" content="${esc(p.h1)}">
<meta property="og:description" content="${esc(p.description)}">
<meta property="og:url" content="${SITE}${p.url}">
<meta property="og:image" content="${SITE}${p.image || '/og.jpg'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#2533FF">
<link rel="icon" type="image/svg+xml" href="/favicon.svg?v=2">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png?v=2">
<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2">
${FONTS}
<link rel="stylesheet" href="${p.css || '/static.css'}">
${p.head || ''}
<script type="application/ld+json">${JSON.stringify(ld.length === 1 ? ld[0] : ld).replace(/</g, '\\u003c')}</script>
</head>
<body>
${p.noTop ? '' : TOP}
${body}
${p.noTop ? '' : FOOT}
${metrica(p.url)}
</body>
</html>
`
}

function write(url: string, html: string) {
  const dir = path.join(DIST, url)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'index.html'), html)
}

// ---------------------------------------------------------------- a person card
interface CardOpts { here: (id: string) => string | null; photo?: (id: string) => string | null; house?: (p: DP) => string }
function personCard(F: Fam, p: DP, o: CardOpts) {
  const link = (id: string) => { const q = F.byId.get(id)!, u = o.here(id); return u ? `<a href="${u}">${esc(F.name(q))}</a>` : esc(F.name(q)) }
  const f = p.g === 'f', parts: string[] = []
  const bp = F.place(p.bp), dp = F.place(p.dp)
  if (p.b) parts.push(`${f ? 'Родилась' : 'Родился'}${p.minor ? ' в' : ''} ${F.date(p.b)}${p.minor ? ' году' : ''}${bp ? `, ${bp}` : ''}.`)
  else if (bp) parts.push(`${f ? 'Родилась' : 'Родился'}: ${bp}.`)
  if (p.d) parts.push(`${f ? 'Умерла' : 'Умер'} ${F.date(p.d)}${dp ? `, ${dp}` : ''}.`)
  if (p.was) parts.push(`${f ? 'Урождённая' : 'При рождении —'} ${esc(p.was[0])}.`)
  const rels: string[] = []
  const ps = F.parents.get(p.id) || []
  const bio = ps.filter(r => !r.step && !r.adopt), step = ps.filter(r => r.step), adopt = ps.filter(r => r.adopt)
  if (bio.length) rels.push(`${bio.length > 1 ? 'Родители' : F.byId.get(bio[0].id)!.g === 'f' ? 'Мать' : 'Отец'}: ${bio.map(r => link(r.id)).join(' и ')}.`)
  if (adopt.length) rels.push(`${adopt.length > 1 ? 'Приёмные родители' : 'Приёмный родитель'}: ${adopt.map(r => link(r.id)).join(' и ')}.`)
  if (step.length) rels.push(`Растил${step.length > 1 ? 'и' : F.byId.get(step[0].id)!.g === 'f' ? 'а' : ''} как своего: ${step.map(r => link(r.id)).join(', ')}.`)
  const sp = F.spouses.get(p.id) || []
  sp.forEach(r => {
    const q = F.byId.get(r.id)!, qf = q.g === 'f'
    const label = r.partner ? (qf ? 'Партнёрша' : 'Партнёр') : r.ex ? (qf ? 'Бывшая супруга' : 'Бывший супруг') : (qf ? 'Супруга' : 'Супруг')
    const y = F.year(r.from), y2 = F.year(r.to)
    const when = r.partner ? (y ? ` (вместе с ${y}${y2 ? ` по ${y2}` : ''})` : '') : y ? ` (брак ${y}${y2 ? `–${y2}` : ''})` : ''
    rels.push(`${label}: ${link(r.id)}${when}.`)
  })
  const ch = (F.children.get(p.id) || [])
  const own = ch.filter(r => !r.step && !r.adopt), ad = ch.filter(r => r.adopt), st = ch.filter(r => r.step)
  if (own.length) rels.push(`${own.length > 1 ? 'Дети' : F.byId.get(own[0].id)!.g === 'f' ? 'Дочь' : 'Сын'}: ${own.map(r => link(r.id)).join(', ')}.`)
  if (ad.length) rels.push(`Приёмные дети: ${ad.map(r => link(r.id)).join(', ')}.`)
  if (st.length) rels.push(`Растил${f ? 'а' : ''} как своих: ${st.map(r => link(r.id)).join(', ')}.`)
  const pets = F.pets.get(p.id)
  if (pets) {
    const KIND: Record<string, [string, string]> = { dragon: ['Дракон', 'Драконы'], wolf: ['Лютоволк', 'Лютоволки'] }
    const groups = new Map<string, string[]>(); pets.forEach(x => { if (!groups.has(x.kind)) groups.set(x.kind, []); groups.get(x.kind)!.push(x.name) })
    groups.forEach((names, k) => rels.push(`${(KIND[k] || ['Питомец', 'Питомцы'])[names.length > 1 ? 1 : 0]}: ${names.map(esc).join(', ')}.`))
  }
  const job = F.f.job?.[p.id]?.[0], story = F.f.bio?.[p.id]?.[0]
  const img = o.photo?.(p.id)
  const house = o.house?.(p)
  return `<article class="pp" id="p-${p.id}">
  <header>${img ? `<img src="${img}" alt="${esc(F.name(p))} — портрет" width="56" height="56" loading="lazy" decoding="async">` : ''}<div><h3>${esc(F.name(p))}</h3><p class="yrs">${[F.years(p), house].filter(Boolean).join(' · ')}</p></div></header>
  ${parts.length ? `<p>${parts.join(' ')}</p>` : ''}${rels.length ? `<p>${rels.join(' ')}</p>` : ''}${job ? `<p>Занятие: ${esc(job)}.</p>` : ''}${story ? `<p class="bio">${esc(story)}</p>` : ''}
</article>`
}
/** the family as schema.org people: names, years and links between them (for search engines and AI answers) */
function peopleLd(F: Fam, base: string, ids: string[], fictional: string | null) {
  const set = new Set(ids), ref = (id: string) => ({ '@id': `${SITE}${base}#p-${id}` })
  return ids.map(id => {
    const p = F.byId.get(id)!, o: Record<string, unknown> = { '@type': 'Person', '@id': `${SITE}${base}#p-${id}`, name: F.name(p), gender: p.g === 'f' ? 'Female' : 'Male' }
    if (p.n[2]) o.alternateName = `${p.n[2]} ${p.n[3]}`.trim()
    if (!F.westeros && F.year(p.b)) o.birthDate = F.year(p.b)
    if (!F.westeros && F.year(p.d)) o.deathDate = F.year(p.d)
    if (F.place(p.bp)) o.birthPlace = { '@type': 'Place', name: F.place(p.bp) }
    if (F.place(p.dp)) o.deathPlace = { '@type': 'Place', name: F.place(p.dp) }
    const par = (F.parents.get(id) || []).filter(r => !r.step && set.has(r.id)).map(r => ref(r.id)); if (par.length) o.parent = par
    const kid = (F.children.get(id) || []).filter(r => !r.step && set.has(r.id)).map(r => ref(r.id)); if (kid.length) o.children = kid
    const sp = (F.spouses.get(id) || []).filter(r => !r.partner && set.has(r.id)).map(r => ref(r.id)); if (sp.length) o.spouse = sp
    if (fictional) o.subjectOf = { '@type': 'CreativeWork', name: fictional }
    return o
  })
}

const pages: { url: string; priority: string }[] = []
const add = (p: Page, priority = '0.8') => { write(p.url, render(p)); pages.push({ url: p.url, priority }) }
const famBy = (k: string) => new Fam(FAMILIES.find(f => f.k === k)!)
const hero = (h1: string, lead: string, ctas: string, facts: [string | number, string][]) => `<section class="hero"><div class="wrap">%CRUMBS%
  <h1>${h1}</h1><p class="lead">${lead}</p><div class="cta">${ctas}</div>
  <ul class="facts">${facts.map(([n, l]) => `<li><b>${n}</b>${l}</li>`).join('')}</ul>
</div></section>`
const openBtn = (k: string, label = 'Открыть интерактивное древо') => `<a class="btn" href="/#demo=${k}" data-cta="demo-${k}">${label}</a>`
const ownBtn = `<a class="btn ghost" href="/" data-cta="own">Построить своё древо</a>`
const endCta = (title = 'Постройте древо своей семьи') => `<section class="sec end"><div class="wrap">
  <h2>${title}</h2><p class="lead">Начните с себя и родителей — остальное подскажут родные. Карта переездов, календарь памятных дат и Книга семьи соберутся сами.</p>
  <div class="cta"><a class="btn" href="/" data-cta="end">Построить древо бесплатно</a></div>
</div></section>`
const others = (skip: string) => {
  const all: [string, string, string][] = [['romanov', '/romanovy/', 'Древо Романовых'], ['targaryen', '/game-of-thrones/', 'Таргариены и великие дома'], ['cullen', '/cullens/', 'Семья Калленов'], ['kardashian', '/kardashians/', 'Кардашьяны и Дженнеры']]
  return `<section class="sec"><div class="wrap"><h2>Другие примеры</h2><div class="links">${all.filter(x => x[0] !== skip).map(([, u, t]) => `<a href="${u}">${t}</a>`).join('')}<a href="/primery/">Все примеры древа</a></div></div></section>`
}

// ================================================================ /romanovy/
{
  const F = famBy('romanov'), base = '/romanovy/'
  const photos = new Set(F.f.photos || []), photo = (id: string) => (photos.has(id) ? `/demo/romanov/${id}.webp` : null)
  const here = (id: string) => `#p-${id}`
  const RULERS: [string, string, string][] = [
    ['mikhail', '1613–1645', 'Первый царь из Романовых'], ['alexeiM', '1645–1676', 'Царь'], ['fyodor3', '1676–1682', 'Царь'],
    ['ivan5', '1682–1696', 'Царь, правил вместе с Петром I'], ['peter1', '1682–1725', 'Царь, с 1721 года — первый император'],
    ['cath1', '1725–1727', 'Императрица'], ['peter2', '1727–1730', 'Император'], ['annaI', '1730–1740', 'Императрица'], ['ivan6', '1740–1741', 'Император'],
    ['elizabeth', '1741–1761', 'Императрица'], ['peter3', '1761–1762', 'Император'], ['cath2', '1762–1796', 'Императрица'], ['paul1', '1796–1801', 'Император'],
    ['alex1', '1801–1825', 'Император'], ['nick1', '1825–1855', 'Император'], ['alex2', '1855–1881', 'Император'], ['alex3', '1881–1894', 'Император'],
    ['nick2', '1894–1917', 'Последний император'],
  ]
  const n = F.f.people.length, gens = F.generations()
  const qa: [string, string][] = [
    ['Кто был первым царём из династии Романовых?', 'Михаил Фёдорович. Земский собор избрал его на царство в 1613 году, ему было 16 лет. Его отец — патриарх Филарет (Фёдор Никитич Романов).'],
    ['Кто последний император из Романовых?', 'Николай II Александрович. Он правил с 1894 года и отрёкся от престола в марте 1917-го. В июле 1918 года его вместе с женой и детьми расстреляли в Екатеринбурге.'],
    ['Сколько лет правили Романовы?', 'С 1613 по 1917 год — 304 года. За это время на престоле сменились 18 правителей: цари, а с 1721 года — императоры и императрицы.'],
    ['Откуда фамилия Романовы?', 'От боярина Романа Юрьевича Захарьина-Юрьева, жившего в XVI веке. Его дочь Анастасия стала первой женой Ивана Грозного, а внук Фёдор Никитич (патриарх Филарет) — отцом первого царя династии.'],
    ['Как Романовы связаны с британской королевской семьёй?', `Последняя императрица Александра Фёдоровна — внучка королевы Виктории: её мать <a href="#p-alice">Алиса</a> была дочерью Виктории и принца Альберта. Поэтому Николай II и британский король Георг V приходились родственниками своим жёнам и друг другу.`],
    ['Сколько детей было у Николая II?', 'Пятеро: Ольга, Татьяна, Мария, Анастасия и цесаревич Алексей.'],
    ['Есть ли сейчас потомки Романовых?', 'Прямых потомков Николая II нет. Но живы потомки других ветвей дома — например, его сестёр Ксении и Ольги Александровны.'],
    ['По какому стилю указаны даты?', 'Даты до 1918 года — по старому стилю (юлианскому календарю), как в русских источниках. У тех, кто родился за границей, — по календарю их страны.'],
  ]
  const body = `${hero('Древо Романовых', `Генеалогическое древо династии Романовых — от патриарха Филарета и царя Михаила Фёдоровича до детей Николая II. ${plural(n, 'человек', 'человека', 'человек')}, даты жизни, браки и настоящие портреты. Откройте его в Predki и посмотрите, как связаны все цари и императоры.`,
    openBtn('romanov') + ownBtn, [[n, 'человек'], [gens, 'поколений'], [18, 'правителей'], ['304', 'года на троне']])}
<section class="sec"><div class="wrap">
  <div class="tldr"><p><b>Коротко.</b> Романовы правили Россией с 1613 по 1917 год. Первый царь — Михаил Фёдорович, первый император — Пётр I, последний — Николай II.</p>
  <p>В древе — ${plural(n, 'человек', 'человека', 'человек')} в ${gens} поколениях: цари, императоры, их супруги, дети и родня из Гессена, Дании и Великобритании. У каждого есть портрет — фотография или музейная картина.</p></div>
</div></section>
<section class="sec" id="rulers"><div class="wrap"><h2>Цари и императоры по порядку</h2>
  <ol class="rulers">${RULERS.map(([id, reign, role]) => { const p = F.byId.get(id)!; return `<li>${photo(id) ? `<img src="${photo(id)}" alt="${esc(F.name(p))}" width="44" height="44" loading="lazy">` : ''}<span><a href="#p-${id}">${esc(F.name(p))}</a><small>${reign} · ${role}</small></span></li>` }).join('')}</ol>
</div></section>
<section class="sec" id="tree"><div class="wrap"><h2>Все в древе Романовых</h2>
  <p class="note">От старших поколений к младшим. Даты до 1918 года — по старому стилю. <a href="/demo/romanov/CREDITS.txt">Источники портретов</a>: Wikimedia Commons, общественное достояние.</p>
  <div class="grid">${F.f.people.map(p => personCard(F, p, { here, photo })).join('')}</div>
  <div class="cta center">${openBtn('romanov', 'Смотреть древо целиком')}</div>
</div></section>
${faqHtml(qa)}
${others('romanov')}
${endCta()}`
  add({ url: base, title: 'Древо Романовых: генеалогическое древо династии с портретами — Predki', description: `Родословная Романовых от Михаила Фёдоровича до детей Николая II: ${n} человек, ${gens} поколений, даты жизни, браки и портреты. Интерактивное древо династии — бесплатно.`,
    h1: 'Древо Романовых', body, crumbs: [['Predki', '/'], ['Примеры древа', '/primery/'], ['Древо Романовых', base]], image: '/demo/romanov/nick2.webp',
    jsonld: [{ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Древо Романовых', description: 'Генеалогическое древо династии Романовых', inLanguage: 'ru', publisher: ORG, about: { '@type': 'Organization', name: 'Дом Романовых' }, mainEntity: { '@type': 'ItemList', name: 'Династия Романовых', itemListElement: peopleLd(F, base, F.f.people.map(p => p.id), null).map((x, i) => ({ '@type': 'ListItem', position: i + 1, item: x })) } }, faqLd(qa)] }, '0.9')
}

// ================================================================ /game-of-thrones/ and the houses
{
  const F = famBy('targaryen'), base = '/game-of-thrones/'
  const houses = new Map<string, DP[]>(), primary = new Map<string, string>()
  F.f.people.forEach(p => { const hs = housesOf(F, p); primary.set(p.id, hs[0] || ''); hs.forEach(h => { if (!houses.has(h)) houses.set(h, []); houses.get(h)!.push(p) }) })
  const pageHouses = Object.keys(HOUSES).filter(h => (houses.get(h)?.length || 0) >= 3)
  const houseUrl = (h: string) => `${base}${h}/`
  const houseLabel = (p: DP) => { const h = primary.get(p.id); return h ? `Дом ${HOUSES[h].gen}` : '' }
  const n = F.f.people.length, gens = F.generations(), dragons = (F.f.pets || []).filter(x => x[2] === 'dragon'), wolves = (F.f.pets || []).filter(x => x[2] === 'wolf')
  const WORK = '«Игра престолов» и «Дом дракона»'
  // the hub: every person once, under their first house
  const hubHere = (id: string) => `#p-${id}`
  const grouped = new Map<string, DP[]>()
  F.f.people.forEach(p => { const h = primary.get(p.id) || 'other'; if (!grouped.has(h)) grouped.set(h, []); grouped.get(h)!.push(p) })
  const order = [...Object.keys(HOUSES).filter(h => grouped.has(h)), 'other'].filter(h => grouped.has(h))
  const qa: [string, string][] = [
    ['Кто родители Джона Сноу?', `<a href="#p-rhaegar">Рейегар Таргариен</a> и <a href="#p-lyanna">Лианна Старк</a>. Эддард Старк растил его как своего сына, поэтому в древе Эддард — приёмный отец.`],
    ['Кем Дейенерис приходится Джону Сноу?', 'Тётей: Дейенерис — младшая сестра Рейегара, отца Джона.'],
    ['Как связаны «Дом дракона» и «Игра престолов»?', 'События «Дома дракона» — Пляска драконов между Рейенирой и Эйегоном II — происходят примерно за 170 лет до «Игры престолов». Дейенерис — потомок Рейениры и Деймона через их сына Эйегона III.'],
    ['Кто был первым королём из Таргариенов?', 'Эйегон I Завоеватель. Вместе с сёстрами-жёнами Висеньей и Рейенис он завоевал Вестерос на драконах, с этого события в Вестеросе ведут отсчёт лет.'],
    ['Как зовут драконов Дейенерис?', 'Дрогон, Рейегаль и Визерион — в честь Кхала Дрого и братьев Рейегара и Визериса.'],
    ['Почему Таргариены женились на родственниках?', 'Чтобы сохранить валирийскую кровь и связь с драконами. Поэтому в древе много браков между братьями и сёстрами, дядями и племянницами.'],
    ['Какие браки есть в древе?', 'Брак засчитан, если он есть хотя бы в книгах Джорджа Мартина или в сериалах HBO. Годы указаны от Завоевания Эйегона.'],
  ]
  const hub = `${hero('Древо Таргариенов и великих домов', `Генеалогическое древо Вестероса по книгам Джорджа Мартина и сериалам ${WORK}: Таргариены от Эйегона Завоевателя до Дейенерис, Старки, Ланнистеры, Баратеоны и другие великие дома. ${plural(n, 'персонаж', 'персонажа', 'персонажей')} с годами жизни, браками, драконами и лютоволками.`,
    openBtn('targaryen') + ownBtn, [[n, 'персонажей'], [gens, 'поколений'], [pageHouses.length, 'великих домов'], [dragons.length, 'драконов']])}
<section class="sec"><div class="wrap">
  <div class="tldr"><p><b>Коротко.</b> Древо начинается с Эйерион и Валейны, родителей Эйегона Завоевателя, проходит через Пляску драконов из «Дома дракона» и заканчивается детьми Старков, Ланнистеров и Баратеонов из «Игры престолов».</p>
  <p>Годы — от Завоевания Эйегона. Брак засчитан, если он есть в книгах или в сериале.</p></div>
  <div class="houses">${pageHouses.map(h => `<a class="house" href="${houseUrl(h)}"><b>${HOUSES[h].ru}</b><span>${plural(houses.get(h)!.length, 'человек', 'человека', 'человек')}${HOUSES[h].words ? ` · ${HOUSES[h].words}` : ''}</span></a>`).join('')}</div>
</div></section>
${order.map(h => `<section class="sec" id="${h}"><div class="wrap"><h2>${h === 'other' ? 'Другие персонажи' : `Дом ${HOUSES[h].gen}`}</h2>${h !== 'other' && pageHouses.includes(h) ? `<p class="note"><a href="${houseUrl(h)}">Отдельная страница: древо ${HOUSES[h].gen} →</a></p>` : ''}
  <div class="grid">${grouped.get(h)!.map(p => personCard(F, p, { here: hubHere })).join('')}</div></div></section>`).join('\n')}
<section class="sec" id="dragons"><div class="wrap"><h2>Драконы и лютоволки</h2>
  <div class="grid two"><div class="tldr"><h3>Драконы и их всадники</h3><ul>${dragons.map(([o, nm]) => `<li><b>${esc(nm[0])}</b> — <a href="#p-${o}">${esc(F.name(F.byId.get(o)!))}</a></li>`).join('')}</ul></div>
  <div class="tldr"><h3>Лютоволки Старков</h3><ul>${wolves.map(([o, nm]) => `<li><b>${esc(nm[0])}</b> — <a href="#p-${o}">${esc(F.name(F.byId.get(o)!))}</a></li>`).join('')}</ul></div></div>
</div></section>
${faqHtml(qa)}
<section class="sec"><div class="wrap"><div class="cta center">${openBtn('targaryen', 'Открыть древо Вестероса')}</div></div></section>
${others('targaryen')}
${endCta('А теперь — древо вашей семьи')}`
  add({ url: base, title: 'Древо Таргариенов и великих домов: Игра престолов и Дом дракона — Predki', description: `Генеалогическое древо Вестероса: Таргариены от Эйегона Завоевателя до Дейенерис, Старки, Ланнистеры, Баратеоны. ${n} персонажей, браки, драконы и лютоволки — по книгам и сериалам.`,
    h1: 'Древо Таргариенов и великих домов', body: hub, crumbs: [['Predki', '/'], ['Примеры древа', '/primery/'], ['Игра престолов', base]],
    jsonld: [{ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Древо Таргариенов и великих домов Вестероса', inLanguage: 'ru', publisher: ORG, about: [{ '@type': 'CreativeWork', name: 'Игра престолов' }, { '@type': 'CreativeWork', name: 'Дом дракона' }, { '@type': 'CreativeWork', name: 'Песнь льда и пламени' }] }, faqLd(qa)] }, '0.9')

  // one page per great house
  pageHouses.forEach(h => {
    const H = HOUSES[h], url = houseUrl(h), members = houses.get(h)!, ids = new Set(members.map(p => p.id))
    const here = (id: string) => ids.has(id) ? `#p-${id}` : `${base}#p-${id}`
    const qa2: [string, string][] = [
      [`Кто входит в дом ${H.gen}?`, `В древе — ${plural(members.length, 'человек', 'человека', 'человек')}: ${members.map(p => `<a href="#p-${p.id}">${esc(F.name(p))}</a>`).join(', ')}.`],
      [`Где родовой замок ${H.gen}?`, `${H.seat}.${H.words ? ` Девиз дома — ${H.words}.` : ''}`],
      [`Как посмотреть древо ${H.gen} целиком?`, `Откройте <a href="/#demo=targaryen">интерактивное древо Вестероса</a> в Predki: там видно, как ${H.ru} породнились с Таргариенами и другими домами.`],
    ]
    const otherHouses = pageHouses.filter(x => x !== h)
    const body = `${hero(`Древо ${H.gen}`, `Родословная дома ${H.gen} из «Игры престолов» и книг Джорджа Мартина. ${H.about}`, openBtn('targaryen', 'Открыть интерактивное древо') + ownBtn,
      [[members.length, 'человек в древе']])}
<section class="sec"><div class="wrap"><div class="tldr"><p><b>Коротко.</b> Дом ${H.gen}: родовой замок — ${H.seat}.${H.words ? ` Девиз — ${H.words}.` : ''} В древе — ${plural(members.length, 'человек', 'человека', 'человек')}.</p><p>Годы указаны от Завоевания Эйегона. Ссылки на людей из других домов ведут в <a href="${base}">общее древо Вестероса</a>.</p></div></div></section>
<section class="sec"><div class="wrap"><h2>Все ${H.ru}</h2>
  <div class="grid">${members.map(p => personCard(F, p, { here, house: q => primary.get(q.id) !== h ? houseLabel(q) : '' })).join('')}</div>
  <div class="cta center">${openBtn('targaryen', 'Смотреть всё древо Вестероса')}</div>
</div></section>
${faqHtml(qa2)}
<section class="sec"><div class="wrap"><h2>Другие дома</h2><div class="links">${otherHouses.map(x => `<a href="${houseUrl(x)}">Древо ${HOUSES[x].gen}</a>`).join('')}<a href="${base}">Все великие дома</a></div></div></section>
${endCta('А теперь — древо вашей семьи')}`
    add({ url, title: `Древо ${H.gen}: родословная дома ${H.gen} | Игра престолов`, description: `Генеалогическое древо дома ${H.gen} из «Игры престолов»${h === 'targaryen' || h === 'velaryon' || h === 'hightower' ? ' и «Дома дракона»' : ''}: ${members.length} человек, годы жизни, браки и дети. ${H.seat}${H.words ? `, девиз ${H.words}` : ''}.`,
      h1: `Древо ${H.gen}`, body, crumbs: [['Predki', '/'], ['Примеры древа', '/primery/'], ['Игра престолов', base], [`Дом ${H.gen}`, url]],
      jsonld: [{ '@context': 'https://schema.org', '@type': 'WebPage', name: `Древо ${H.gen}`, inLanguage: 'ru', publisher: ORG, about: { '@type': 'CreativeWork', name: 'Игра престолов' }, mainEntity: { '@type': 'ItemList', name: `Дом ${H.gen}`, itemListElement: peopleLd(F, url, members.map(p => p.id), 'Песнь льда и пламени').map((x, i) => ({ '@type': 'ListItem', position: i + 1, item: x })) } }, faqLd(qa2)] }, '0.7')
  })
}

// ================================================================ /cullens/
{
  const F = famBy('cullen'), base = '/cullens/', n = F.f.people.length
  const qa: [string, string][] = [
    ['Кто родители Ренесми?', '<a href="#p-edward">Эдвард Каллен</a> и <a href="#p-bella">Белла Свон</a>. Ренесми родилась в сентябре 2006 года в Форксе.'],
    ['Кто приёмные дети Карлайла и Эсми?', 'Эдвард, Элис, Джаспер, Розали и Эмметт. Поэтому в древе у них пунктирные линии и подписи «приёмный».'],
    ['Почему Розали и Джаспер — Хейлы, а не Каллены?', 'В Форксе они выдают себя за близнецов Хейл, племянников Эсми. Элис и Эмметт носят фамилию Каллен.'],
    ['Как Джейкоб Блэк связан с Калленами?', 'Его отец Билли — лучший друг Чарли Свона, отца Беллы. В древе эта дружба показана отдельной линией.'],
  ]
  const body = `${hero('Семья Калленов', `Древо Калленов из «Сумерек» Стефани Майер: Карлайл и Эсми, их приёмные дети Эдвард, Элис, Джаспер, Розали и Эмметт, Белла Свон и Ренесми, а также Своны и Блэки из Ла-Пуш. ${plural(n, 'персонаж', 'персонажа', 'персонажей')}, карта переездов семьи и Книга семьи.`,
    openBtn('cullen') + ownBtn, [[n, 'персонажей'], [F.generations(), 'поколения'], ['1640', 'год рождения Карлайла']])}
<section class="sec"><div class="wrap"><div class="tldr"><p><b>Коротко.</b> Глава семьи — доктор Карлайл Каллен, родился в Лондоне в 1640 году. Он и Эсми усыновили пятерых: Эдварда, Элис, Джаспера, Розали и Эмметта. Эдвард женился на Белле Свон, их дочь — Ренесми.</p>
<p>Это пример того, как в Predki выглядят приёмные родственники, разводы и друзья семьи.</p></div></div></section>
<section class="sec"><div class="wrap"><h2>Все в древе</h2><div class="grid">${F.f.people.map(p => personCard(F, p, { here: id => `#p-${id}` })).join('')}</div>
<div class="cta center">${openBtn('cullen', 'Открыть древо, карту и Книгу семьи')}</div></div></section>
${faqHtml(qa)}
${others('cullen')}
${endCta()}`
  add({ url: base, title: 'Семья Калленов: древо из «Сумерек» — Predki', description: `Генеалогическое древо Калленов из «Сумерек»: Карлайл, Эсми, Эдвард, Белла, Ренесми, приёмные дети и Своны. ${n} персонажей, карта переездов и истории.`,
    h1: 'Семья Калленов', body, crumbs: [['Predki', '/'], ['Примеры древа', '/primery/'], ['Семья Калленов', base]],
    jsonld: [{ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Семья Калленов — древо', inLanguage: 'ru', publisher: ORG, about: { '@type': 'CreativeWork', name: 'Сумерки' }, mainEntity: { '@type': 'ItemList', itemListElement: peopleLd(F, base, F.f.people.map(p => p.id), 'Сумерки').map((x, i) => ({ '@type': 'ListItem', position: i + 1, item: x })) } }, faqLd(qa)] })
}

// ================================================================ /kardashians/
{
  const F = famBy('kardashian'), base = '/kardashians/', n = F.f.people.length
  const qa: [string, string][] = [
    ['Сколько детей у Крис Дженнер?', 'Шестеро: Кортни, Ким, Хлои и Роб от Роберта Кардашьяна, Кендалл и Кайли — от Кейтлин Дженнер.'],
    ['Кто отец Кендалл и Кайли Дженнер?', '<a href="#p-caitlyn">Кейтлин Дженнер</a>, бывшая супруга Крис Дженнер (брак 1991–2015).'],
    ['Сколько детей у Ким Кардашьян?', 'Четверо от Канье Уэста: Норт, Сейнт, Чикаго и Псалм.'],
    ['Откуда у Кардашьянов армянская фамилия?', 'Предки Роберта Кардашьяна — армяне, переселившиеся в США в начале XX века. Его мать Хелен — урождённая Аракелян.'],
  ]
  const body = `${hero('Кардашьяны и Дженнеры', `Древо семьи Кардашьян-Дженнер: Крис Дженнер, Роберт Кардашьян и Кейтлин Дженнер, их дети Кортни, Ким, Хлои, Роб, Кендалл и Кайли, супруги, партнёры и внуки. Пример древа с разводами и сводными семьями.`,
    openBtn('kardashian') + ownBtn, [[n, 'человек'], [F.generations(), 'поколения'], [6, 'детей у Крис']])}
<section class="sec"><div class="wrap"><div class="tldr"><p><b>Коротко.</b> У Крис Дженнер шестеро детей от двух браков: Кортни, Ким, Хлои и Роб Кардашьяны и Кендалл и Кайли Дженнер. У детей детей пока указан только год рождения.</p></div></div></section>
<section class="sec"><div class="wrap"><h2>Все в древе</h2><div class="grid">${F.f.people.map(p => personCard(F, p, { here: id => `#p-${id}` })).join('')}</div>
<div class="cta center">${openBtn('kardashian', 'Открыть интерактивное древо')}</div></div></section>
${faqHtml(qa)}
${others('kardashian')}
${endCta()}`
  add({ url: base, title: 'Древо семьи Кардашьян-Дженнер — Predki', description: `Семейное древо Кардашьянов и Дженнеров: Крис, Ким, Кортни, Хлои, Роб, Кендалл, Кайли, их партнёры и дети. ${n} человек, браки и разводы.`,
    h1: 'Кардашьяны и Дженнеры', body, crumbs: [['Predki', '/'], ['Примеры древа', '/primery/'], ['Кардашьяны и Дженнеры', base]],
    jsonld: [{ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Древо семьи Кардашьян-Дженнер', inLanguage: 'ru', publisher: ORG }, faqLd(qa)] }, '0.6')
}

// ================================================================ /primery/
{
  const base = '/primery/'
  const card = (k: string, url: string, title: string, text: string, img?: string) => `<a class="fam" href="${url}">${img ? `<img src="${img}" alt="" width="64" height="64" loading="lazy">` : ''}<b>${title}</b><span>${text}</span></a>`
  const ro = famBy('romanov'), tg = famBy('targaryen'), cu = famBy('cullen'), ka = famBy('kardashian')
  const qa: [string, string][] = [
    ['Как составить семейное древо?', 'Начните с себя, затем добавьте родителей, бабушек и дедушек. Запишите имена, даты и места, спросите родных о тех, кого не знаете. Подробно — в <a href="/putevoditel/">путеводителе</a>.'],
    ['Что должно быть в древе для школы?', 'Обычно три-четыре поколения: вы, родители, бабушки и дедушки, прабабушки и прадедушки. Для каждого — имя, годы жизни и пара слов: кем работал, где жил.'],
    ['Чем родословная отличается от семейного древа?', 'Родословная — описание происхождения семьи, часто по одной фамилии. Семейное древо — схема, где видны все родственники и связи между ними.'],
    ['Можно ли сделать древо онлайн бесплатно?', 'Да. В Predki древо, карта переездов, календарь памятных дат и приглашения родных бесплатны.'],
  ]
  const body = `${hero('Примеры семейного древа', 'Посмотрите, как выглядит готовое древо: династия Романовых, великие дома Вестероса, Каллены из «Сумерек» и Кардашьяны. Каждое можно открыть интерактивно — а потом построить своё.', ownBtn.replace('btn ghost', 'btn'), [])}
<section class="sec"><div class="wrap"><div class="fams">
${card('romanov', '/romanovy/', 'Древо Романовых', `${plural(ro.f.people.length, 'человек', 'человека', 'человек')}, ${ro.generations()} поколений, настоящие портреты`, '/demo/romanov/nick2.webp')}
${card('targaryen', '/game-of-thrones/', 'Таргариены и великие дома', `«Игра престолов» и «Дом дракона»: ${plural(tg.f.people.length, 'персонаж', 'персонажа', 'персонажей')}, драконы и лютоволки`)}
${card('cullen', '/cullens/', 'Семья Калленов', `«Сумерки»: приёмные дети, карта переездов и Книга семьи, ${plural(cu.f.people.length, 'персонаж', 'персонажа', 'персонажей')}`)}
${card('kardashian', '/kardashians/', 'Кардашьяны и Дженнеры', `Разводы, сводные семьи и внуки: ${plural(ka.f.people.length, 'человек', 'человека', 'человек')}`)}
</div></div></section>
<section class="sec"><div class="wrap"><h2>Как составить своё древо</h2>
<ol class="steps"><li><b>Начните с себя</b>Добавьте себя, родителей, бабушек и дедушек — то, что знаете сами.</li><li><b>Спросите родных</b>Отправьте ссылку: родные дополнят древо без регистрации.</li><li><b>Найдите документы</b>Свидетельства, фото с подписями, ответы архивов — <a href="/putevoditel/">путеводитель</a> подскажет, где искать.</li><li><b>Соберите историю</b>Карта переездов, календарь памятных дат и Книга семьи появятся сами.</li></ol>
</div></section>
${faqHtml(qa)}
${endCta()}`
  add({ url: base, title: 'Примеры семейного древа: образцы родословной онлайн — Predki', description: 'Готовые примеры генеалогического древа: Романовы, Таргариены и великие дома «Игры престолов», Каллены, Кардашьяны. Откройте интерактивно и постройте своё древо бесплатно.',
    h1: 'Примеры семейного древа', body, crumbs: [['Predki', '/'], ['Примеры древа', base]],
    jsonld: [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Примеры семейного древа', inLanguage: 'ru', publisher: ORG, hasPart: ['/romanovy/', '/game-of-thrones/', '/cullens/', '/kardashians/'].map(u => ({ '@type': 'WebPage', url: SITE + u })) }, faqLd(qa)] }, '0.9')
}

// ================================================================ /putevoditel/ — the guide as a public page
{
  const base = '/putevoditel/', dir = path.join(DIST, base)
  fs.mkdirSync(path.join(dir, 'photos'), { recursive: true })
  let html = fs.readFileSync(path.join(ROOT, 'src/guide/content.html'), 'utf8')
  html = html.replace(/%photo:([\w-]+)%/g, (_m, name) => { fs.copyFileSync(path.join(ROOT, 'src/guide/photos', name + '.webp'), path.join(dir, 'photos', name + '.webp')); return `photos/${name}.webp` })
  // the split-flap title needs the app; here the title is plain text in the same poster font
  html = html.replace(/<h1 id="heroH">[\s\S]*?<\/h1>/, '<h1 id="heroH" class="plain-h1">Путеводитель по поиску предков</h1>')
  html = html.replace(/<span class="brand">([\s\S]*?)Путеводитель<\/span>/, '<a class="brand" href="/" title="Predki — на главную">$1Predki</a>')
  // the request templates: all three on the page at once (people search for «образец запроса в ЦАМО»), each with its own «Скопировать»
  const tplHtml = (['zags', 'arch', 'camo'] as const).map(k => {
    const t = TPL[k], h = { zags: 'Образец заявления в ЗАГС', arch: 'Образец генеалогического запроса в региональный архив', camo: 'Образец запроса в ЦАМО' }[k]
    return `<h3 class="tpl-h">${h}</h3><div class="tpl"><div class="tpl-top"><p>${esc(t.note)}</p><button type="button" class="copy" data-copy="${k}"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-copy"/></svg>Скопировать</button></div><pre id="tpl-${k}">${esc(t.text).replace(/\[([^\]]+)\]/g, '<mark>[$1]</mark>')}</pre></div>`
  }).join('\n')
  html = html.replace(/<div class="tpl-tabs"[\s\S]*?<\/div>\s*<div class="tpl" id="tpl"[\s\S]*?<\/pre>\s*<\/div>/, tplHtml)
  // a way into the app before the footer
  html = html.replace(/<footer class="wrap end">/, `<section class="sec wrap blue" id="build"><div class="sec-head"><h2>Постройте древо</h2></div><p class="lead-in">Всё, что узнаете от родных и из архивов, сохраните в древе Predki: карта переездов, календарь памятных дат и Книга семьи соберутся сами.</p><p><a class="go-btn" href="/" data-cta="guide-end">Построить древо бесплатно</a> <a class="go-btn ghost" href="/primery/">Посмотреть примеры</a></p></section>\n<footer class="wrap end">`)
  // FAQ for search: the questions on the page as FAQPage
  const qa: [string, string][] = [...html.matchAll(/<details><summary>([\s\S]*?)<\/summary><div class="ans">([\s\S]*?)<\/div><\/details>/g)].map(m => [m[1].trim(), m[2].replace(/<[^>]+>/g, '').trim()])
  const checked = html.match(/Проверено<br>([^<]+)</)?.[1] || ''
  const MONTHS: Record<string, string> = { января: '01', февраля: '02', марта: '03', апреля: '04', мая: '05', июня: '06', июля: '07', августа: '08', сентября: '09', октября: '10', ноября: '11', декабря: '12' }
  const cm = checked.match(/(\d+) (\S+) (\d{4})/), modified = cm ? `${cm[3]}-${MONTHS[cm[2]]}-${cm[1].padStart(2, '0')}` : TODAY
  const css = fs.readFileSync(path.join(ROOT, 'src/guide/guide.css'), 'utf8') + `
/* the public page (scripts/seo.ts): the page itself scrolls, the brand fonts come from /fonts/brand */
html,body{margin:0;background:#F4F2EC}
#guidePage .gd-scroll{overflow:visible;min-height:100svh}
#guidePage .hero h1.plain-h1{display:block;font:800 clamp(44px,9vw,120px)/.9 var(--f-head);text-transform:uppercase;line-height:.9;max-width:none;margin:0 auto 28px;text-wrap:balance;hyphens:manual;overflow-wrap:normal}
#guidePage .tpl-h{margin:36px 0 12px}
#guidePage .lead-in{max-width:720px;font-size:19px}
#guidePage .go-btn{display:inline-flex;align-items:center;min-height:48px;padding:0 22px;border-radius:999px;background:var(--accent);color:var(--accent-ink);font:500 16px/1 var(--f-body);text-decoration:none;margin:8px 8px 0 0}
#guidePage .go-btn.ghost{background:transparent;color:var(--ink);border:1.5px solid var(--line-2)}
`
  fs.writeFileSync(path.join(dir, 'guide.css'), FONT_FACES + css)
  const script = `<script>
(function(){var root=document.getElementById('guidePage');
var T=${JSON.stringify(Object.fromEntries(Object.entries(TPL).map(([k, v]) => [k, v.text])))};
function copy(t){if(navigator.clipboard)return navigator.clipboard.writeText(t).then(function(){return true},function(){return false});return Promise.resolve(false)}
function say(b,t){var o=b.lastChild.nodeValue;b.lastChild.nodeValue=t;setTimeout(function(){b.lastChild.nodeValue=o},1600)}
root.addEventListener('click',function(e){var b=e.target.closest('[data-copy]');if(b){copy(T[b.getAttribute('data-copy')]).then(function(ok){say(b,ok?'Скопировано':'Выделите текст')})}
  var m=e.target.closest('#mailBtn');if(m){copy('hello@predki.me').then(function(ok){if(ok)say(m,'Адрес скопирован')})}});
var CK='predki:guideCheck',box=document.getElementById('checklist');if(!box)return;var bs=[].slice.call(box.querySelectorAll('input'));var s={};try{s=JSON.parse(localStorage.getItem(CK)||'{}')||{}}catch(e){}
function count(){var el=document.getElementById('checkCount');if(el)el.textContent=bs.filter(function(b){return b.checked}).length+' из '+bs.length}
bs.forEach(function(b){b.checked=!!s[b.id]});count();
box.addEventListener('change',function(){var n={};bs.forEach(function(b){if(b.checked)n[b.id]=1});try{localStorage.setItem(CK,JSON.stringify(n))}catch(e){}count()});
var r=document.getElementById('checkReset');if(r)r.addEventListener('click',function(){bs.forEach(function(b){b.checked=false});try{localStorage.removeItem(CK)}catch(e){}count()});
})();
</script>`
  const body = `<div id="guidePage"><div class="gd-scroll">${html}</div></div>${script}`
  add({ url: base, title: 'Как составить родословную: поиск предков и образцы запросов в архив — Predki',
    description: 'С чего начать поиск предков, как говорить с родными, что искать на старых фото, где искать в архивах и базах. Образцы запросов в ЗАГС, госархив и ЦАМО, словарь генеалогии и FAQ.',
    h1: 'Путеводитель по поиску предков', body, crumbs: [['Predki', '/'], ['Путеводитель', base]], css: '/putevoditel/guide.css', noTop: true,
    jsonld: [{ '@context': 'https://schema.org', '@type': 'Article', headline: 'Путеводитель по поиску предков', description: 'Как составить родословную: разговор с родными, фото и видеокассеты, архивы и базы, образцы запросов, смена фамилий, наследство.', inLanguage: 'ru', dateModified: modified, author: ORG, publisher: ORG, mainEntityOfPage: SITE + base, image: SITE + '/og.jpg' }, faqLd(qa)] }, '0.9')
}

// ---------------------------------------------------------------- the shared stylesheet of the public pages, the sitemap
fs.writeFileSync(path.join(DIST, 'static.css'), STATIC_CSS())
const urls = [{ url: '/', priority: '1.0' }, ...pages, { url: '/privacy.html', priority: '0.2' }]
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${SITE}${u.url}</loc><lastmod>${TODAY}</lastmod><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`)
console.log(`seo: ${pages.length} pages + sitemap.xml (${urls.length} addresses)`)

function STATIC_CSS() {
  return FONT_FACES + `:root{--ultra:#2533FF;--berlin:#0B1352;--paper:#F4F2EC;--card:#FAF9F5;--ink:#0B1352;--ink2:#2E3670;--muted:#5F6596;--line:rgba(11,19,82,.16);--line2:rgba(11,19,82,.34);
  --head:"Sofia Sans Extra Condensed","Arial Narrow","Roboto Condensed",system-ui,sans-serif;--body:"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif;--mono:"IBM Plex Mono",ui-monospace,Menlo,monospace}
*{box-sizing:border-box}
html{color-scheme:light;scroll-padding-top:72px}
body{margin:0;background:radial-gradient(rgba(11,19,82,.09) 1.1px,transparent 1.4px) 0 0/22px 22px,var(--paper);color:var(--ink);font:400 17px/1.6 var(--body);-webkit-font-smoothing:antialiased}
a{color:var(--ultra);text-underline-offset:3px;text-decoration-thickness:1px}
a:hover{text-decoration-thickness:2px}
:focus-visible{outline:2px solid var(--ultra);outline-offset:3px;border-radius:4px}
.wrap{max-width:1160px;margin:0 auto;padding-left:max(20px,env(safe-area-inset-left));padding-right:max(20px,env(safe-area-inset-right))}
/* header */
.top{position:sticky;top:0;z-index:5;background:color-mix(in srgb,var(--paper) 90%,transparent);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.top .wrap{display:flex;align-items:center;gap:16px;height:60px}
.brand{display:inline-flex;align-items:center;gap:9px;font:800 24px/1 var(--head);letter-spacing:.05em;text-transform:uppercase;color:var(--ink);text-decoration:none;margin-right:auto}
.brand img{width:24px;height:24px}
.brand.light{color:#fff}
.top nav{display:flex;align-items:center;gap:22px;font:500 15px/1 var(--body)}
.top nav a:not(.btn){color:var(--ink);text-decoration:none}
.top nav a:not(.btn):hover{color:var(--ultra)}
@media(max-width:720px){.top nav a:not(.btn){display:none}}
/* buttons */
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 22px;border-radius:999px;background:var(--ultra);color:#fff;font:500 16px/1.1 var(--body);text-decoration:none;text-align:center;transition:transform .15s,box-shadow .15s}
.btn:hover{transform:translateY(-1px);box-shadow:0 10px 24px -12px rgba(37,51,255,.7)}
.btn.ghost{background:transparent;color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--line2)}
.top .btn{min-height:38px;padding:0 16px;font-size:14px}
.hero .btn{background:#fff;color:var(--ultra)}
.hero .btn.ghost{background:transparent;color:#fff;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.6)}
.cta{display:flex;flex-wrap:wrap;gap:12px}
.cta.center{justify-content:center;margin-top:32px}
/* hero */
.hero{background:radial-gradient(60% 70% at 85% 10%,rgba(255,255,255,.16),transparent 70%),radial-gradient(rgba(255,255,255,.1) 1.2px,transparent 1.5px) 0 0/22px 22px,var(--ultra);color:#fff;padding:36px 0 56px}
.crumbs{font:500 12px/1.5 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.72);margin:0 0 40px}
.crumbs a{color:inherit;text-decoration:none}
.crumbs a:hover{color:#fff}
.hero h1{font:800 clamp(52px,11vw,128px)/.9 var(--head);text-transform:uppercase;letter-spacing:.005em;margin:0 0 22px;max-width:14ch;text-wrap:balance}
.lead{font-size:clamp(17px,2.1vw,20px);line-height:1.55;max-width:760px;margin:0 0 30px}
.hero .lead{color:rgba(255,255,255,.92)}
.facts{display:flex;flex-wrap:wrap;gap:16px 40px;margin:44px 0 0;padding:28px 0 0;list-style:none;border-top:1px solid rgba(255,255,255,.25);font:500 12px/1.3 var(--mono);text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,.78)}
.facts:empty{display:none}
.facts b{display:block;font:800 48px/1 var(--head);color:#fff;letter-spacing:0;margin-bottom:6px}
/* sections */
.sec{padding:48px 0}
.sec+.sec{padding-top:8px}
h2{font:800 clamp(38px,6.4vw,68px)/.95 var(--head);text-transform:uppercase;margin:0 0 24px;text-wrap:balance}
h3{font:500 19px/1.3 var(--body);margin:0}
.note{font-size:14px;color:var(--muted);margin:-8px 0 20px;max-width:760px}
.tldr{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--ultra);border-radius:14px;padding:20px 24px;max-width:860px}
.tldr p{margin:0}
.tldr p+p{margin-top:8px}
.tldr ul{margin:10px 0 0;padding-left:18px}
.tldr h3{margin-bottom:4px}
/* people */
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr));gap:14px}
.grid.two{grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr))}
.grid.two .tldr{max-width:none}
.pp{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px 18px 18px;scroll-margin-top:76px;transition:box-shadow .2s}
.pp:target{box-shadow:0 0 0 2px var(--ultra),0 18px 40px -24px rgba(37,51,255,.6)}
.pp header{display:flex;gap:12px;align-items:center;margin-bottom:6px}
.pp img{width:56px;height:56px;border-radius:12px;object-fit:cover;flex:none;background:var(--line)}
.yrs{font:500 13px/1.35 var(--mono);color:var(--muted);margin:3px 0 0}
.pp p{margin:8px 0 0;font-size:15px;line-height:1.55;color:var(--ink2)}
.pp .bio{color:var(--muted);font-size:14px}
.rulers{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr));gap:10px;counter-reset:r}
.rulers li{counter-increment:r;display:flex;gap:12px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:10px 14px}
.rulers li::before{content:counter(r);font:800 26px/1 var(--head);color:var(--ultra);min-width:22px;text-align:center}
.rulers img{width:44px;height:44px;border-radius:10px;object-fit:cover;flex:none}
.rulers a{font-weight:500;color:var(--ink);text-decoration:none}
.rulers a:hover{color:var(--ultra)}
.rulers small{display:block;font:500 12px/1.35 var(--mono);color:var(--muted);margin-top:2px}
/* houses, families, links */
.houses,.fams{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,240px),1fr));gap:10px;margin-top:22px}
.house,.fam{display:flex;flex-direction:column;gap:4px;padding:16px 18px;border-radius:14px;background:var(--card);border:1px solid var(--line);text-decoration:none;color:var(--ink);transition:border-color .2s,transform .15s}
.house:hover,.fam:hover{border-color:var(--ultra);transform:translateY(-2px)}
.house b,.fam b{font:800 30px/1 var(--head);text-transform:uppercase;color:var(--ultra)}
.house span,.fam span{font-size:14px;color:var(--muted)}
.fams{grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));margin-top:0}
.fam{padding:20px}
.fam img{width:64px;height:64px;border-radius:12px;object-fit:cover;margin-bottom:8px}
.links{display:flex;flex-wrap:wrap;gap:10px}
.links a{padding:10px 16px;border-radius:999px;background:var(--card);border:1px solid var(--line);color:var(--ink);text-decoration:none;font-weight:500;font-size:15px}
.links a:hover{border-color:var(--ultra);color:var(--ultra)}
.steps{list-style:none;counter-reset:s;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,250px),1fr));gap:14px}
.steps li{counter-increment:s;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px 20px;color:var(--ink2);font-size:15px}
.steps li::before{content:counter(s);display:block;font:800 44px/1 var(--head);color:var(--ultra);margin-bottom:8px}
.steps b{display:block;font-size:17px;color:var(--ink);margin-bottom:4px}
/* faq */
.faq{max-width:860px;border-bottom:1px solid var(--line)}
.faq details{border-top:1px solid var(--line);padding:4px 0}
.faq summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:16px;padding:14px 0;font:500 18px/1.4 var(--body)}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:"+";font:800 28px/.8 var(--head);color:var(--ultra);transition:transform .2s}
.faq details[open] summary::after{transform:rotate(45deg)}
.faq p{margin:0 0 16px;color:var(--ink2);max-width:760px}
/* end */
.end{background:var(--ultra);color:#fff;margin-top:40px;padding:64px 0 72px!important}
.end .lead{color:rgba(255,255,255,.9)}
.end .btn{background:#fff;color:var(--ultra)}
footer.site{background:var(--berlin);color:rgba(255,255,255,.72);padding:44px 0 56px;font-size:14px}
.foot-cols{display:grid;grid-template-columns:2fr 1fr 1fr;gap:28px}
.foot-cols p{max-width:380px;margin:12px 0 0}
.foot-cols nav{display:flex;flex-direction:column;gap:8px}
.foot-cols b{font:500 12px/1.3 var(--mono);text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,.5);margin-bottom:4px}
footer.site a:not(.brand){color:#fff;text-decoration:none}
footer.site a:not(.brand):hover{text-decoration:underline}
@media(max-width:760px){.foot-cols{grid-template-columns:1fr}.facts b{font-size:40px}.sec{padding:36px 0}}
@media(prefers-reduced-motion:reduce){*{transition:none!important}}
`
}
