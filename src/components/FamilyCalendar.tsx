import { useEffect, useMemo, useState } from 'react'
import { gate } from '../lib/chapters'
import { ui, bump, LANG, byId, avatarSmall, openPerson } from '../lib/core'
import { familyEvents, undatedCount, downloadIcs, type CalEvent } from '../lib/calendar'
import { kinship } from '../lib/kinship'
import { rootPerson } from '../lib/treeLayout'

// «Календарь семьи»: this year's birthdays, memorial dates and wedding anniversaries month by month,
// and an .ics file with the same dates for the phone's calendar.
const TX = {
  ru: {
    h: 'Календарь', close: 'Закрыть', prev: 'Предыдущий месяц', next: 'Следующий месяц', toToday: 'К сегодняшнему дню',
    week: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'], add: 'Добавить в календарь телефона',
    what: 'В файл попадут все даты из этого календаря ({n}). Напоминание придёт в 9:00 в сам день.',
    sub: (n: number) => `${n} ${pl(n, ['дата', 'даты', 'дат'])} в году`,
    list: 'В этом месяце', today: 'Сегодня', empty: 'В этом месяце памятных дат нет.',
    undated: (n: number) => `У ${n} ${pl(n, ['человека', 'человек', 'человек'])} нет полной даты рождения. Добавьте день и месяц в карточку, и дата появится в календаре.`,
    birth: (n: number) => `День рождения · ${n} ${pl(n, ['год', 'года', 'лет'])}`,
    memorial: (n: number) => `${n} ${pl(n, ['год', 'года', 'лет'])} со дня рождения`,
    death: (n: number) => `День памяти · ${n} ${pl(n, ['год', 'года', 'лет'])}`,
    wedding: (n: number) => `Годовщина свадьбы · ${n} ${pl(n, ['год', 'года', 'лет'])}`,
    more: (n: number) => `ещё ${n}`,
    helpH: 'Как добавить даты в календарь', helpP: 'Файл predki-kalendar-semi.ics скачан. Дальше всё зависит от устройства:',
    ios: 'iPhone', android: 'Android', desktop: 'Компьютер',
    iosSteps: ['Если Safari сразу показал список событий, нажмите «Добавить все».', 'Если файл просто скачался: откройте приложение «Файлы» → «Загрузки» → нажмите на файл → «Добавить все».', 'Выберите календарь, куда сложить даты, например «Семья».'],
    androidSteps: ['Нажмите на скачанный файл. Если телефон предложит календарь (например, Samsung), подтвердите импорт.', 'Если файл не открывается: на компьютере зайдите на calendar.google.com → шестерёнка → «Настройки» → «Импорт и экспорт» → выберите файл → «Импорт».', 'Через пару минут даты появятся в Google Календаре на телефоне.'],
    desktopSteps: ['Mac: дважды щёлкните по файлу, выберите календарь в приложении «Календарь» → «ОК».', 'Google Календарь: calendar.google.com → шестерёнка → «Настройки» → «Импорт и экспорт» → «Импорт».', 'Outlook: «Файл» → «Открыть и экспортировать» → «Импорт и экспорт» → файл .ics.'],
    snapshot: 'Это даты на сегодня. Когда добавите родных или уточните даты, скачайте файл ещё раз.',
    again: 'Скачать ещё раз', ok: 'Понятно', lg: { birth: 'день рождения', memorial: 'со дня рождения', death: 'день памяти', wedding: 'свадьба' },
  },
  en: {
    h: 'Calendar', close: 'Close', prev: 'Previous month', next: 'Next month', toToday: 'Back to today',
    week: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], add: 'Add to phone calendar',
    what: 'The file has every date from this calendar ({n}). A reminder comes at 9:00 on the day.',
    sub: (n: number) => `${n} ${n === 1 ? 'date' : 'dates'} a year`,
    list: 'This month', today: 'Today', empty: 'No family dates this month.',
    undated: (n: number) => `${n} ${n === 1 ? 'person has' : 'people have'} no full birth date. Add the day and month to their card and the date will appear here.`,
    birth: (n: number) => `Birthday · turns ${n}`,
    memorial: (n: number) => `${n} years since birth`,
    death: (n: number) => `Day of remembrance · ${n} ${n === 1 ? 'year' : 'years'}`,
    wedding: (n: number) => `Wedding anniversary · ${n} ${n === 1 ? 'year' : 'years'}`,
    more: (n: number) => `+${n} more`,
    helpH: 'Adding the dates to your calendar', helpP: 'predki-family-calendar.ics has been downloaded. What to do next depends on the device:',
    ios: 'iPhone', android: 'Android', desktop: 'Computer',
    iosSteps: ['If Safari shows the list of events right away, tap “Add All”.', 'If the file was just downloaded: open the Files app → Downloads → tap the file → “Add All”.', 'Pick the calendar to keep the dates in, for example “Family”.'],
    androidSteps: ['Tap the downloaded file. If the phone offers a calendar app (for example, Samsung), confirm the import.', 'If it does not open: on a computer go to calendar.google.com → gear → Settings → Import & export → choose the file → Import.', 'In a couple of minutes the dates appear in Google Calendar on the phone.'],
    desktopSteps: ['Mac: double-click the file, choose a calendar in the Calendar app → OK.', 'Google Calendar: calendar.google.com → gear → Settings → Import & export → Import.', 'Outlook: File → Open & Export → Import/Export → the .ics file.'],
    snapshot: 'These are today’s dates. When you add relatives or fix dates, download the file again.',
    again: 'Download again', ok: 'Got it', lg: { birth: 'birthday', memorial: 'years since birth', death: 'day of remembrance', wedding: 'wedding' },
  },
}
function pl(n: number, f: string[]) { const a = n % 10, b = n % 100; return f[(a === 1 && b !== 11) ? 0 : (a >= 2 && a <= 4 && (b < 12 || b > 14)) ? 1 : 2] }
type Platform = 'ios' | 'android' | 'desktop'
const platform = (): Platform => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? 'ios' : /Android/.test(navigator.userAgent) ? 'android' : 'desktop'

export function openCalendar() { if (!gate('calendar')) return; ui.calendar = true; bump() }
/** A calendar page with two rings and a plus. */
export const CalendarAddIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4M12 13v5M9.5 15.5h5" /></svg>

export default function FamilyCalendar() {
  const T = TX[LANG === 'en' ? 'en' : 'ru'], loc = LANG === 'en' ? 'en-GB' : 'ru-RU'
  const now = new Date(), year = now.getFullYear(), today0 = new Date(year, now.getMonth(), now.getDate())
  const [month, setMonth] = useState(now.getMonth())
  const [help, setHelp] = useState<Platform | null>(null)
  const events = useMemo(() => familyEvents(year), [year])
  const kin = useMemo(() => { const me = rootPerson(); return me ? kinship(me.id) : null }, [])
  const undated = useMemo(() => undatedCount(), [])
  const close = () => { ui.calendar = false; bump() }
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (help) setHelp(null); else close() } }
    addEventListener('keydown', key); return () => removeEventListener('keydown', key)
  }, [help])

  const monthName = (m: number, f: 'long' | 'short') => { const s = new Date(year, m, 1).toLocaleDateString(loc, { month: f }).replace('.', ''); return s[0].toUpperCase() + s.slice(1) }
  const inMonth = events.filter(e => e.month === month + 1)
  const byDay: Record<number, CalEvent[]> = {}; inMonth.forEach(e => (byDay[e.day] = byDay[e.day] || []).push(e))
  const offset = (new Date(year, month, 1).getDay() + 6) % 7, days = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  while (cells.length % 7) cells.push(null)
  const dateOf = (d: number) => new Date(year, month, d)
  const isToday = (d: number) => +dateOf(d) === +today0, isPast = (d: number) => dateOf(d) < today0
  const line = (e: CalEvent) => T[e.kind](e.n)
  const open = (e: CalEvent) => { ui.calendar = false; openPerson(e.id) }
  const get = () => { downloadIcs(); setHelp(platform()) }

  const Avatars = ({ e }: { e: CalEvent }) => <span className="cal-av">{e.ids.map(id => { const p = byId(id); return p ? <img key={id} src={avatarSmall(p)} alt="" /> : null })}</span>
  const short = (e: CalEvent) => { if (e.kind === 'wedding') return e.title; const p = byId(e.id); return (p && p.first) || e.title }

  return (
    <div className="ps-veil cal-veil" onClick={e => { if (e.target === e.currentTarget) close() }}>
      <div className="cal" role="dialog" aria-modal="true" aria-label={T.h}>
        <header className="cal-top">
          <button className="ps-x" type="button" onClick={close} aria-label={T.close}><svg viewBox="0 0 16 16"><path d="M3 3l10 10M13 3 3 13" /></svg></button>
          <div className="cal-t"><h2>{T.h}</h2><p>{T.sub(events.length)}</p></div>
          <div className="cal-get">
            <button className="btn cal-add" type="button" onClick={get} disabled={!events.length}><CalendarAddIcon />{T.add}</button>
            <small>{T.what.replace('{n}', String(events.length))}</small>
          </div>
        </header>

        <div className="cal-months" role="tablist" aria-label={T.h}>
          {Array.from({ length: 12 }, (_, m) => { const n = events.filter(e => e.month === m + 1).length; return (
            <button key={m} type="button" role="tab" aria-selected={m === month} className={(m === now.getMonth() ? 'cur ' : '') + (m < now.getMonth() ? 'gone' : '')} onClick={() => setMonth(m)}>
              {monthName(m, 'short')}{n > 0 && <i>{n}</i>}
            </button>) })}
        </div>

        <div className="cal-body">
          <section className="cal-main" aria-label={monthName(month, 'long')}>
            <div className="cal-nav">
              <button className="ps-x sm" type="button" aria-label={T.prev} disabled={month === 0} onClick={() => setMonth(month - 1)}><svg viewBox="0 0 16 16"><path d="M10 3 5 8l5 5" /></svg></button>
              <h3>{monthName(month, 'long')} <span>{year}</span></h3>
              <button className="ps-x sm" type="button" aria-label={T.next} disabled={month === 11} onClick={() => setMonth(month + 1)}><svg viewBox="0 0 16 16"><path d="m6 3 5 5-5 5" /></svg></button>
              {month !== now.getMonth() && <button className="btn sm cal-back" type="button" onClick={() => setMonth(now.getMonth())}>{T.toToday}</button>}
            </div>
            <div className="cal-week" aria-hidden="true">{T.week.map(w => <span key={w}>{w}</span>)}</div>
            <div className="cal-cells">
              {cells.map((d, i) => {
                if (!d) return <div key={'x' + i} className="cal-day blank" />
                const list = byDay[d] || [], shown = list.slice(0, 2)
                return (
                  <div key={d} className={'cal-day' + (list.length ? ' has' : '') + (isToday(d) ? ' today' : '') + (isPast(d) ? ' past' : '')}>
                    <span className="n">{d}</span>
                    {list.length > 0 && <div className="evs">
                      {shown.map(e => <button key={e.key} type="button" className={'cal-ev k-' + e.kind} title={`${e.title} — ${line(e)}`} onClick={() => open(e)}><Avatars e={e} /><span>{short(e)}</span></button>)}
                      {list.length > 2 && <span className="cal-more">{T.more(list.length - 2)}</span>}
                    </div>}
                  </div>
                )
              })}
            </div>
          </section>

          <aside className="cal-side">
            <span className="eyebrow">{T.list}</span>
            {inMonth.length ? <ul className="cal-list">
              {inMonth.map(e => { const k = kin && e.kind !== 'wedding' ? kin.label[e.id] : ''; return (
                <li key={e.key}>
                  <button type="button" className={'cal-item k-' + e.kind + (isPast(e.day) ? ' past' : '') + (isToday(e.day) ? ' today' : '')} onClick={() => open(e)}>
                    <span className="dt"><b>{e.day}</b><span>{dateOf(e.day).toLocaleDateString(loc, { weekday: 'short' }).replace('.', '')}</span></span>
                    <Avatars e={e} />
                    <span className="tx"><span className="nm">{e.title}{isToday(e.day) && <em>{T.today}</em>}</span><span className="ln">{line(e)}</span>{k && k !== 'Вы' && k !== 'You' && <span className="kn">{k}</span>}</span>
                  </button>
                </li>) })}
            </ul> : <p className="cal-empty">{T.empty}</p>}
            <p className="cal-lg" aria-hidden="true">{(['birth', 'memorial', 'death', 'wedding'] as const).map(k => <span key={k} className={'k-' + k}><i />{T.lg[k]}</span>)}</p>
            {undated > 0 && <p className="cal-note">{T.undated(undated)}</p>}
          </aside>
        </div>

        {help && <div className="cal-help-bg" onClick={e => { if (e.target === e.currentTarget) setHelp(null) }}>
          <div className="cal-help" role="dialog" aria-modal="true" aria-label={T.helpH}>
            <h3>{T.helpH}</h3>
            <p>{T.helpP}</p>
            <div className="ps-seg" role="group">{(['ios', 'android', 'desktop'] as Platform[]).map(k => <button key={k} type="button" aria-pressed={help === k} onClick={() => setHelp(k)}>{T[k]}</button>)}</div>
            <ol>{T[(help + 'Steps') as 'iosSteps'].map((s, i) => <li key={i}>{s}</li>)}</ol>
            <p className="cal-snap">{T.snapshot}</p>
            <div className="cal-help-act"><button className="btn" type="button" onClick={downloadIcs}>{T.again}</button><button className="btn primary" type="button" onClick={() => setHelp(null)}>{T.ok}</button></div>
          </div>
        </div>}
      </div>
    </div>
  )
}
