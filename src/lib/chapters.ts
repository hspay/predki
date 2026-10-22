// Chapters: the path through Predki. Each chapter is a page of the Album with a few stickers;
// enough of them (earned, or honestly marked «не знаю») close the chapter, open the next one and unlock a part of the app.
// Stickers stay independent: any sticker can be earned at any time, a chapter only counts them.
import { S, ui, LANG, bump, persist, go, toast, byId, parentsOf } from './core'
import { rootPerson } from './treeLayout'
import { addRelative } from './relations'
import { Progress } from './progress'

const T = (ru: string, en: string) => ({ ru, en })
type Tx = { ru: string; en: string }
export const tx = (v: Tx | undefined) => (v ? (LANG === 'en' ? v.en : v.ru) : '')

/** parts of the app that a chapter opens */
export type Feature = 'calendar' | 'map' | 'passport' | 'book' | 'compare' | 'bookPdf'
export const FEATURE: Record<Feature, { t: Tx; d: Tx; soon?: boolean }> = {
  calendar: { t: T('Календарь', 'Calendar'), d: T('Дни рождения, годовщины и памятные даты — с выгрузкой в календарь телефона.', 'Birthdays, anniversaries and memorial dates, exported to your phone’s calendar.') },
  map: { t: T('Карта жизни семьи', 'Family life map'), d: T('Где семья рождалась и куда переезжала — по годам, с анимацией.', 'Where the family was born and moved, year by year, animated.') },
  passport: { t: T('Паспорт семьи', 'Family passport'), d: T('Красивая карточка вашей семьи для сторис и постов.', 'A card of your family for stories and posts.') },
  book: { t: T('Книга семьи', 'Family book'), d: T('Жизнь каждого родственника по годам: где жил, кто был рядом, что происходило в стране.', 'Each relative’s life year by year: where they lived, who was near, what was happening around.') },
  compare: { t: T('Сравнение с другими семьями', 'Compare with other families'), d: T('Насколько глубоко вы знаете свою семью — среди семей Predki.', 'How deep you know your family, among Predki families.'), soon: true },
  bookPdf: { t: T('Книга семьи в PDF', 'Family book as PDF'), d: T('Вся история семьи одной книгой — для печати и подарка.', 'The whole family story as one book, to print and give.'), soon: true },
}

export interface Chapter {
  id: string; t: Tx; d: Tx
  /** stickers on this chapter's page, from simple to hard */
  st: string[]
  /** how many of them close the chapter */
  need: number
  opens: Feature[]
}
export const CHAPTERS: Chapter[] = [
  // the first chapter goes past the onboarding (you and your parents) up to the grandparents, so nobody gets a board before seeing the app
  { id: 'start', t: T('Отправление', 'Departure'), d: T('Вы, родители, бабушки и дедушки', 'You, your parents and grandparents'), st: ['root', 'k_parents', 'k_gen3', 'k_gp', 'k_patro', 'k_family'], need: 4, opens: ['calendar'] },
  { id: 'where', t: T('Откуда мы', 'Where we come from'), d: T('Где родились и куда переезжали', 'Where they were born and where they moved'), st: ['r_born', 'r_move', 'r_3', 'x_roots'], need: 3, opens: ['map'] },
  { id: 'faces', t: T('Лица и дела', 'Faces and work'), d: T('Фотографии и профессии', 'Photos and occupations'), st: ['c_face', 'c_jobs', 'r_work', 'c_gallery'], need: 3, opens: ['passport'] },
  // harder than faces: it needs other people — a question, an answer — and a document from the family archive
  { id: 'voices', t: T('Голоса родных', 'Family voices'), d: T('Спросите тех, кто помнит, и найдите первый документ', 'Ask those who remember and find the first document'), st: ['v_ask', 'v_answer', 'c_story', 'c_doc'], need: 3, opens: ['book'] },
  { id: 'wide', t: T('Шире и глубже', 'Wider and deeper'), d: T('Прадеды, тёти, двоюродные', 'Great-grandparents, aunts, cousins'), st: ['k_15', 'k_maiden', 'k_cousins', 'k_gen4', 'r_route', 'r_1000', 'c_full'], need: 4, opens: [] },
  { id: 'century', t: T('Век', 'A century'), d: T('Сто лет истории семьи', 'A hundred years of family history'), st: ['r_century', 'c_papers', 'k_30', 'r_10', 'x_faces', 'x_bio', 'c_20'], need: 4, opens: ['bookPdf'] },
]
/** the last page of the Album: the rarest stickers, outside the path */
export const COLLECTION = { id: 'legend', t: T('Коллекция', 'Collection'), d: T('Самые редкие наклейки', 'The rarest stickers') }
export const collectionIds = () => { const inCh = new Set(CHAPTERS.flatMap(c => c.st)); return Progress.N.map((n: any) => n.id).filter((id: string) => !inCh.has(id)) }

/** «не знаю»: a sticker that may honestly be skipped, and how the skip is worded */
export const SKIP: Record<string, Tx> = {
  k_parents: T('Не знаю одного из родителей', 'I don’t know one of my parents'),
  k_gp: T('Знаю не всех', 'I don’t know all of them'),
  r_move: T('Семья не переезжала', 'The family never moved'),
  x_roots: T('Не знаю, где они родились', 'I don’t know where they were born'),
  k_cousins: T('Двоюродных нет', 'No cousins'),
}
export const isSkipped = (id: string) => (S.settings.chSkip || []).includes(id)
export function setSkip(id: string, on: boolean) {
  const l = new Set(S.settings.chSkip || []); on ? l.add(id) : l.delete(id); S.settings.chSkip = [...l]
  persist(); sync(false); bump()
}

/* ---- state ---- */
const done = (id: string) => Progress.ST[id] === 'done'
/** stickers of a chapter that count: earned or skipped */
export const counted = (c: Chapter) => c.st.filter(id => done(id) || isSkipped(id)).length
const closes = (c: Chapter) => counted(c) >= c.need
/** chapters closed so far, in order. Never goes back: what is opened stays open. */
export function closedNow() { let k = 0; while (k < CHAPTERS.length && closes(CHAPTERS[k])) k++; return Math.max(k, S.settings.chapter || 0) }
export const closed = () => Math.max(S.settings.chapter || 0, 0)
/** the chapter the family is on (index); CHAPTERS.length = the path is finished */
export const current = () => Math.min(closed(), CHAPTERS.length)
export const finished = () => closed() >= CHAPTERS.length
export const openedBy = (f: Feature) => CHAPTERS.findIndex(c => c.opens.includes(f))
export const isOpen = (f: Feature) => closed() > openedBy(f)
/** a share of the current chapter: 0…1 */
export function share() { const c = CHAPTERS[current()]; return c ? Math.min(1, counted(c) / c.need) : 1 }

/** A chapter is done, but the family has not opened the next one yet: the ring in the menu lights up and waits for a tap.
 *  The next chapter, its parts of the app and the board come only with that tap — the reward is taken, not thrown at you. */
export const pending = () => closedNow() > closed()
/** the tap on the lit ring (or on «Открыть главу N» on a phone): store the new chapter and show the board */
export function claim() {
  const was = closed(), now = closedNow(); if (now <= was) return
  S.settings.chapter = now; S.settings.chDates = { ...(S.settings.chDates || {}) }
  for (let i = was; i < now; i++) S.settings.chDates[CHAPTERS[i].id] = new Date().toISOString()
  persist(); ui.levelUp = { from: was, to: now }; bump()
}
/** After every change (from commit / boot). A newly finished chapter only says so with a short toast; nothing covers the screen.
 *  quiet = loading. The very first load with chapters (families from before them) takes what they have earned silently. */
export function sync(quiet: boolean) {
  Progress.evaluate()
  const now = closedNow()
  if (S.settings.chapter == null && quiet) { S.settings.chapter = now; S.settings.chReady = now; persist(); return }
  if (now > (S.settings.chReady ?? S.settings.chapter ?? 0)) {
    S.settings.chReady = now; persist()
    if (!quiet) { const c = CHAPTERS[now - 1]; toast(tx(T(`Глава «${tx(c.t)}» пройдена`, `Chapter “${tx(c.t)}” done`)), 'ach', { act: { label: tx(T('Открыть новую', 'Open the next')), run: claim } }) }
  }
}

/** the one step to suggest now: the first sticker of the current chapter that is neither earned nor skipped */
export function nextStep() {
  const c = CHAPTERS[current()]; if (!c) return null
  const id = c.st.find(id => !done(id) && !isSkipped(id)); if (!id) return null
  return { c, n: Progress.byN(id) }
}

/** open the Album on a chapter page (index; CHAPTERS.length = the Collection) */
export function openChapter(i: number) { ui.album.tab = 'ch' + i; ui.album.sheet = null; go('progress') }
/** the Album page a sticker lives on */
export function pageOf(id: string) { const i = CHAPTERS.findIndex(c => c.st.includes(id)); return i < 0 ? CHAPTERS.length : i }

/** A closed part of the app: show the lock sheet instead (the part stays visible in the menu, with its condition). */
export function gate(f: Feature) { if (isOpen(f)) return true; ui.lock = f; bump(); return false }

export function chapterDate(i: number) {
  const d = S.settings.chDates?.[CHAPTERS[i]?.id]; return d ? new Date(d).toLocaleDateString(LANG === 'en' ? 'en-GB' : 'ru-RU', { day: 'numeric', month: 'long' }) : ''
}
export const plural = (n: number, ru: [string, string, string], en: [string, string]) => {
  if (LANG === 'en') return n === 1 ? en[0] : en[1]
  const a = n % 10, b = n % 100; return ru[(a === 1 && b !== 11) ? 0 : (a >= 2 && a <= 4 && (b < 12 || b > 14)) ? 1 : 2]
}
export { toast }

/** each sticker of the path as one plain step — the line on «Следующая остановка» */
export const TASK: Record<string, Tx> = {
  root: T('Добавьте себя в древо', 'Add yourself to the tree'),
  k_parents: T('Впишите маму и папу', 'Add your mother and father'),
  k_family: T('Добавьте ещё двоих: брата, сестру или супруга', 'Add two more: a sibling or a spouse'),
  k_gen3: T('Добавьте бабушку или дедушку', 'Add a grandparent'),
  k_gp: T('Добавьте всех четырёх бабушек и дедушек', 'Add all four grandparents'),
  k_patro: T('Впишите отчества', 'Add patronymics'),
  r_born: T('Укажите, кто где родился', 'Add where people were born'),
  r_move: T('Добавьте первый переезд', 'Add the first move'),
  r_3: T('Отметьте три города, где жила семья', 'Mark three cities where the family lived'),
  x_roots: T('Узнайте, где родились бабушки и дедушки', 'Find where your grandparents were born'),
  v_ask: T('Попросите родных дополнить древо', 'Ask relatives to fill in the tree'),
  v_answer: T('Примите первый ответ родных', 'Accept the first answer from a relative'),
  c_story: T('Запишите историю одного человека', 'Write one person’s story'),
  c_face: T('Добавьте первый портрет', 'Add the first portrait'),
  c_doc: T('Прикрепите первый документ', 'Attach the first document'),
  c_jobs: T('Впишите, кто кем работал', 'Add occupations'),
  r_work: T('Добавьте учёбу и работу', 'Add study and work'),
  c_gallery: T('Соберите десять портретов', 'Collect ten portraits'),
  k_15: T('Соберите в древе 15 человек', 'Get 15 people into the tree'),
  k_maiden: T('Впишите девичьи фамилии', 'Add maiden names'),
  k_cousins: T('Добавьте двоюродных', 'Add cousins'),
  k_gen4: T('Добавьте прадеда или прабабушку', 'Add a great-grandparent'),
  r_route: T('Проследите путь одного человека', 'Trace one person’s route'),
  r_1000: T('Найдите переезд длиннее тысячи вёрст', 'Find a move longer than a thousand versts'),
  c_full: T('Заполните одну карточку целиком', 'Fill one card completely'),
  r_century: T('Охватите сто лет истории', 'Cover a hundred years'),
  c_papers: T('Прикрепите документы пятерым', 'Attach documents for five people'),
  k_30: T('Соберите в древе 30 человек', 'Get 30 people into the tree'),
  r_10: T('Отметьте десять городов', 'Mark ten cities'),
  x_faces: T('Найдите портреты четырёх поколений', 'Find portraits from four generations'),
  x_bio: T('Соберите биографию с маршрутом', 'Put together a biography with a route'),
  c_20: T('Запишите двадцать историй', 'Write twenty stories'),
}

/** a step of the path opens exactly the form it needs: «add a parent to you», «add a parent to your mother»… */
export function stepAction(id: string): { label: string; run: () => void } | null {
  const me = rootPerson(); if (!me) return null
  const ps = (pid: string) => parentsOf(pid)
  const lacking = (ids: string[]) => ids.map(byId).filter(Boolean).find(p => ps(p!.id).length < 2) || null
  const add = (pid: string) => () => { go('tree'); setTimeout(() => addRelative(pid, 'parent'), 150) }
  if (id === 'k_parents' && ps(me.id).length < 2) return { label: tx(T('Добавить родителя', 'Add a parent')), run: add(me.id) }
  if (id === 'k_family') return { label: tx(T('Добавить брата или сестру', 'Add a sibling')), run: () => { go('tree'); setTimeout(() => addRelative(me.id, 'sibling'), 150) } }
  if (id === 'k_gen3' || id === 'k_gp') { const p = lacking(ps(me.id).map(x => x.id)); if (p) return { label: tx(T('Добавить бабушку или дедушку', 'Add a grandparent')), run: add(p.id) } }
  if (id === 'k_gen4') { const gp = ps(me.id).flatMap(x => ps(x.id)).map(x => x.id); const p = lacking(gp); if (p) return { label: tx(T('Добавить прадеда', 'Add a great-grandparent')), run: add(p.id) } }
  return null
}
