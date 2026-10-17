// «Календарь семьи»: birthdays, memorial dates and wedding anniversaries that have a full date (day, month, year),
// placed on this year's calendar, plus the same dates as an .ics file for the phone's calendar.
import { S, LANG, byId, fullName, type Person } from './core'
import { rootPerson } from './treeLayout'
import { kinship } from './kinship'
import { goal } from './analytics'

export type CalKind = 'birth' | 'memorial' | 'death' | 'wedding'
export interface CalEvent {
  key: string; kind: CalKind
  /** the person whose card opens on tap (for a wedding: the spouse closest to you) */
  id: string
  /** both spouses for a wedding */
  ids: string[]
  month: number; day: number; year: number
  /** years since the original date, in this calendar year */
  n: number
  title: string
  /** the original date */
  orig: { d: number; m: number; y: number }
}

/** «12.10.1971» or «1971-10-12» → {d, m, y}; anything without a day and month → null */
export function parseDate(s?: string) {
  const t = String(s || '').trim(); let m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (m) return { d: +m[1], m: +m[2], y: +m[3] }
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return { d: +m[3], m: +m[2], y: +m[1] }
  return null
}
const valid = (x: { d: number; m: number } | null) => !!x && x.m >= 1 && x.m <= 12 && x.d >= 1 && x.d <= 31

/** All dated events for the given year. 29 February falls on the 28th in other years. */
export function familyEvents(year = new Date().getFullYear()) {
  const leap = new Date(year, 1, 29).getMonth() === 1
  const place = (d: number, m: number) => (m === 2 && d === 29 && !leap ? 28 : d)
  const out: CalEvent[] = []
  S.people.forEach(p => {
    const b = parseDate(p.birthDate), dd = parseDate(p.deathDate)
    // «N лет со дня рождения» for those who have passed, and for anyone born a century ago even if no death date was entered
    const dead = !!(p.deathDate || '').trim() || (!!b && year - b.y >= 100)
    if (valid(b) && b!.y <= year) out.push({ key: 'b' + p.id, kind: dead ? 'memorial' : 'birth', id: p.id, ids: [p.id], month: b!.m, day: place(b!.d, b!.m), year: b!.y, n: year - b!.y, title: fullName(p), orig: b! })
    if (valid(dd) && dd!.y < year) out.push({ key: 'd' + p.id, kind: 'death', id: p.id, ids: [p.id], month: dd!.m, day: place(dd!.d, dd!.m), year: dd!.y, n: year - dd!.y, title: fullName(p), orig: dd! })
  })
  // weddings: only when the marriage has a full date
  const me = rootPerson(), kin = me ? kinship(me.id) : null
  S.rels.filter(r => r.type === 'spouse' && !r.ex && !r.partner).forEach(r => { // anniversaries of marriages that last
    const w = parseDate(r.from); const A = byId(r.a), B = byId(r.b); if (!valid(w) || !A || !B || w!.y > year) return
    const steps = (x: Person) => (kin ? kin.chain(x.id).length || 99 : 99)
    const near = steps(A) <= steps(B) ? A : B
    out.push({ key: 'w' + r.id, kind: 'wedding', id: near.id, ids: [A.id, B.id], month: w!.m, day: place(w!.d, w!.m), year: w!.y, n: year - w!.y, title: (A.first || fullName(A)) + (LANG === 'en' ? ' and ' : ' и ') + (B.first || fullName(B)), orig: w! })
  })
  // a wedding entered only as a life event (the spouse is not in the tree; otherwise the marriage link above has the date)
  S.people.forEach(p => (p.events || []).forEach(ev => {
    if (ev.type !== 'marriage') return; const w = parseDate(ev.date); if (!valid(w) || w!.y > year) return
    if (ev.with && S.rels.some(r => r.type === 'spouse' && ((r.a === p.id && r.b === ev.with) || (r.b === p.id && r.a === ev.with)))) return
    out.push({ key: 'm' + ev.id, kind: 'wedding', id: p.id, ids: [p.id], month: w!.m, day: place(w!.d, w!.m), year: w!.y, n: year - w!.y, title: fullName(p), orig: w! })
  }))
  return out.sort((x, y) => x.month - y.month || x.day - y.day || x.title.localeCompare(y.title))
}

/** people whose birthday has no full date yet (shown as a nudge under the list) */
export const undatedCount = () => S.people.filter(p => !valid(parseDate(p.birthDate))).length

// ---------- .ics ----------
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
/** fold lines at 75 bytes, as the format asks */
function fold(line: string) {
  const enc = new TextEncoder(); if (enc.encode(line).length <= 75) return line
  const parts: string[] = []; let cur = ''
  for (const ch of line) { if (enc.encode(cur + ch).length > (parts.length ? 74 : 75)) { parts.push(cur); cur = '' } cur += ch }
  parts.push(cur); return parts.join('\r\n ')
}
const pad = (n: number) => String(n).padStart(2, '0')

/** Every dated event as a yearly all-day event with a reminder at 9:00 on the day. */
export function buildIcs() {
  const ru = LANG !== 'en', year = new Date().getFullYear(), now = new Date()
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}00Z`
  const me = rootPerson(), kin = me ? kinship(me.id) : null
  const L = ru
    ? { cal: 'Календарь семьи · Predki', birth: 'День рождения', memorial: 'Памятная дата', death: 'День памяти', wedding: 'Годовщина свадьбы', born: 'Дата рождения', died: 'Дата ухода', married: 'Дата свадьбы', remind: 'Сегодня памятная дата в семье' }
    : { cal: 'Family calendar · Predki', birth: 'Birthday', memorial: 'Remembering', death: 'Day of remembrance', wedding: 'Wedding anniversary', born: 'Born', died: 'Died', married: 'Married', remind: 'A family date today' }
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Predki//Family calendar//' + (ru ? 'RU' : 'EN'), 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:' + esc(L.cal)]
  familyEvents(year).forEach(e => {
    const p = byId(e.id)!, orig = e.orig
    const feb29 = orig.m === 2 && orig.d === 29
    const label = e.kind === 'wedding' ? L.wedding : L[e.kind], who = e.kind === 'wedding' ? e.title : fullName(p)
    const rel = kin && e.kind !== 'wedding' ? kin.label[p.id] : ''
    const what = e.kind === 'death' ? L.died : e.kind === 'wedding' ? L.married : L.born
    lines.push('BEGIN:VEVENT', 'UID:' + e.key + '@predki', 'DTSTAMP:' + stamp,
      `DTSTART;VALUE=DATE:${year}${pad(orig.m)}${pad(feb29 ? 28 : orig.d)}`,
      feb29 ? 'RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-1' : 'RRULE:FREQ=YEARLY',
      'SUMMARY:' + esc(`${label}: ${who} (${orig.y})`),
      'DESCRIPTION:' + esc(`${what}: ${pad(orig.d)}.${pad(orig.m)}.${orig.y}` + (rel && rel !== 'Вы' && rel !== 'You' ? ` · ${rel}` : '')),
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(L.remind), 'TRIGGER:PT9H', 'END:VALARM',
      'END:VEVENT')
  })
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}

/** Save the .ics file; the phone or computer offers to add the events to its calendar. */
export function downloadIcs() {
  goal('calendar_export')
  const blob = new Blob([buildIcs()], { type: 'text/calendar;charset=utf-8' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = LANG === 'en' ? 'predki-family-calendar.ics' : 'predki-kalendar-semi.ics'
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}
