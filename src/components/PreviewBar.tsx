// Preview build only (VITE_PREVIEW=1): a small panel to walk through the chapters without real data entry.
import { useState } from 'react'
import { S, ui, bump, commit, clearData, completeFirstRun, migrateDates, toast, t, go, persist } from '../lib/core'
import { Progress } from '../lib/progress'
import { sampleData } from '../lib/sample'
import { CHAPTERS, current, nextStep, isSkipped } from '../lib/chapters'
import { getAppearance, setAppearance } from '../lib/appearance'

function resetPath() {
  delete S.settings.chapter; delete S.settings.chReady; delete S.settings.chDates; delete S.settings.chSkip; delete S.settings.asked; delete S.settings.answered
  ui.levelUp = null; ui.lock = null; ui.album.tab = ''; ui.album.sheet = null
}
/** the family right after the first-run dialog: you and your parents */
export function afterOnboarding() {
  resetPath(); clearData(); ui.levelUp = null; go('tree')
  completeFirstRun({ theme: 'night', familyName: 'Ветровы', me: { first: 'Анна', last: 'Ветрова', gender: 'f', birthDate: '14.05.1990', birthPlace: 'Москва' }, mom: { first: 'Ольга', last: 'Ветрова' }, dad: { first: 'Андрей', last: 'Ветров' } })
}
function grant(ids: string[]) {
  const got: string[] = []
  ids.forEach(id => { if (!(S.achievements || []).includes(id)) { S.achievements.push(id); S.achDates = { ...(S.achDates || {}), [id]: new Date().toISOString() }; got.push(id) } })
  if (ids.includes('v_ask')) S.settings.asked = Math.max(1, S.settings.asked || 0)
  if (ids.includes('v_answer')) S.settings.answered = Math.max(1, S.settings.answered || 0)
  if (got.length) toast(got.length === 1 ? t('ach.unlocked', { t: Progress.tx((Progress.byN(got[0]) as any).t) }) : t('ach.unlockedN', { n: got.length }), 'ach', { sticker: got[0], act: { label: t('ach.toAlbum'), run: () => Progress.openSticker(got[0]) } })
  commit()
}

export default function PreviewBar() {
  const [open, setOpen] = useState(false)
  const run = (f: () => void) => () => { setOpen(false); f(); bump() }
  const step = nextStep(), sn: any = step?.n
  const items: [string, () => void, boolean?][] = [
    ['Начать с онбординга', () => { resetPath(); clearData(); go('tree') }],
    ['Сразу после онбординга', afterOnboarding],
    [sn ? `Получить наклейку «${Progress.tx(sn.t)}»` : 'Все главы пройдены', () => sn && grant([sn.id]), !sn],
    [current() < CHAPTERS.length ? `Закрыть главу ${current() + 1}` : 'Все главы пройдены', () => { const c = CHAPTERS[current()]; if (!c) return; const left = c.st.filter(id => Progress.ST[id] !== 'done' && !isSkipped(id)); const need = c.need - (c.st.length - left.length); grant(left.slice(0, Math.max(need, 0))) }, current() >= CHAPTERS.length],
    ['Загрузить большое древо (Ветровы)', () => { resetPath(); const d = migrateDates(sampleData()); S.people = d.people; S.rels = d.rels; S.achievements = []; S.achPasted = []; S.achSeen = []; S.achDates = {}; S.settings.familyName = 'Ветровы'; delete S.settings.meId; ui.firstRun = false; ui.treeRefit++; ui.mapRefit++; persist(); go('tree'); setTimeout(() => commit(), 400) }],
    [getAppearance() === 'light' ? 'Тёмная тема' : 'Светлая тема', () => setAppearance(getAppearance() === 'light' ? 'dark' : 'light')],
  ]
  return <div className={'pv' + (open ? ' open' : '')}>
    <button type="button" className="pv-b" onClick={() => setOpen(!open)}>Превью<svg viewBox="0 0 24 24"><path d={open ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} /></svg></button>
    {open && <div className="pv-m">
      <p>Это превью системы глав на копии приложения. Данные хранятся только в этом браузере.</p>
      {items.map(([l, f, off]) => <button type="button" key={l} disabled={!!off} onClick={run(f)}>{l}</button>)}
    </div>}
  </div>
}
