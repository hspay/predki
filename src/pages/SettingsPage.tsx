import { useState } from 'react'
import { getAppearance, setAppearance, type Appearance } from '../lib/appearance'
import { S, ui, t, LANG, toast, importData, clearData, bump, cloud, signOut, askToSignIn, setLang, type Person } from '../lib/core'
import { isCloudRef, refToInline } from '../lib/media'
import { CHANGELOG, type Release } from '../lib/changelog'
import { globeMark } from '../lib/globe'
import anya from '../assets/team/anya.webp'
import lesha from '../assets/team/lesha.webp'
import katya from '../assets/team/katya.webp'

// Settings as a bento grid: why Predki exists (its logo leads back to the welcome screen), theme and language, the account with its data, the testers, the changelog.
const TX = {
  ru: {
    mission: <>Проект социолога Андрея Брызгалина. Будет круто, если сайт станет поводом поговорить с роднёй, сохранить историю семьи или обсудить миграцию, чтобы лучше понимать, кто мы и откуда. А ещё сайт появился потому, что дизайн у других сервисов — полный отстой.</>,
    testers: 'Друзья-тестеры', names: ['Аня Журавская', 'Лёша Ремез', 'Катя Мазепо'], ideas: 'Нашли баги или есть пожелания?', write: 'Напишите мне', theme: 'Тема приложения',
    lang: 'Язык', home: 'Открыть начальный экран', ad: ['Место свободно', 'Здесь может быть ваша реклама'], privacy: 'Политика конфиденциальности',
  },
  en: {
    mission: <>A project by sociologist Andrey Bryzgalin. It would be great if the site became a reason to talk with your family, keep its story, or talk about migration, to better understand who we are and where we come from. And the site exists because the design of other services is total rubbish.</>,
    testers: 'Friends who test', names: ['Anya Zhuravskaya', 'Lyosha Remez', 'Katya Mazepo'], ideas: 'Found a bug or have a wish?', write: 'Write to me', theme: 'App theme',
    lang: 'Language', home: 'Open the welcome screen', ad: ['Spot available', 'Your ad could be here'], privacy: 'Privacy policy',
  },
}
const TG = 'https://t.me/HSpay'

const MONTHS = { ru: ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'], en: ['January','February','March','April','May','June','July','August','September','October','November','December'] }
function relDate(iso: string) { const [y, m, d] = iso.split('-').map(Number); return LANG === 'en' ? `${MONTHS.en[m - 1]} ${d}, ${y}` : `${d} ${MONTHS.ru[m - 1]} ${y}` }
function ReleaseNote({ r }: { r: Release }) {
  const L = LANG === 'en' ? 'en' : 'ru'
  return <div className="release"><time className="release-date" dateTime={r.date}>{relDate(r.date)}</time><ul>{r.items.map((it, i) => <li key={i}>{it[L]}</li>)}</ul></div>
}

/** what belongs to the family in a backup: «you», the title, the Tree look, the first day; not the device's language or theme */
const backupSettings = () => { const s = S.settings; return { meId: s.meId, since: s.since, familyName: s.familyName, theme: s.theme, lines: s.lines, kin: s.kin, ghosts: s.ghosts, share: s.share } }

export default function SettingsPage() {
  const [look, setLook] = useState<Appearance>(getAppearance)
  const exportJson = async () => {
    // files from Storage go into the backup itself, so it stays complete without the account
    const people: Person[] = JSON.parse(JSON.stringify(S.people))
    const refs = people.flatMap(p => [p.avatar, ...(p.media || []).map(m => m.data)]).filter(isCloudRef)
    if (refs.length) {
      toast(t('set.exporting'))
      const got = new Map<string, string>()
      await Promise.all([...new Set(refs)].map(r => refToInline(r).then(d => { got.set(r, d) }).catch(() => {})))
      people.forEach(p => { if (got.has(p.avatar)) p.avatar = got.get(p.avatar)!; (p.media || []).forEach(m => { if (got.has(m.data)) m.data = got.get(m.data)! }) })
    }
    const blob = new Blob([JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), people, rels: S.rels, achievements: S.achievements, achDates: S.achDates, achSeen: S.achSeen, achPasted: S.achPasted, pets: S.pets || [], settings: backupSettings() }, null, 2)], { type: 'application/json' })
    const u = URL.createObjectURL(blob); const l = document.createElement('a'); l.href = u; l.download = 'predki-' + new Date().toISOString().slice(0, 10) + '.json'; l.click(); setTimeout(() => URL.revokeObjectURL(u), 1000)
    toast(t('set.exported'))
  }
  const importJson = () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json'
    inp.onchange = () => { const f = inp.files && inp.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { importData(JSON.parse(String(r.result))); toast(t('set.imported')) } catch { toast(LANG === 'en' ? 'Invalid JSON' : 'Файл не похож на экспорт Predki') } }; r.readAsText(f) }
    inp.click()
  }
  const T = TX[LANG === 'en' ? 'en' : 'ru']
  return (
    <section className="page active" data-page="settings">
      <div className="topbar"><h2>{t('nav.settings')}</h2></div>
      <div className="scroll"><div className="settings bento">
        <div className="bt bt-mission">
          {/* the full logo: the globe and the name; it leads back to the welcome screen, like the one in the menu */}
          <button type="button" className="bt-logo" aria-label={T.home} title={T.home} onClick={() => { ui.onboarding = true; bump() }}>
            <span className="bt-mark" dangerouslySetInnerHTML={{ __html: globeMark('#F4F2EC', 24) }} /><b>PREDKI</b>
          </button>
          <p>{T.mission}</p>
          <p className="bt-links"><a href={TG} target="_blank" rel="noopener noreferrer">Telegram</a><a href="https://www.instagram.com/hspay/" target="_blank" rel="noopener noreferrer">Instagram</a><a href="privacy.html" target="_blank" rel="noopener">{T.privacy}</a></p>
        </div>
        <div className="bt bt-look">
          <h3 className="bt-h">{T.theme}</h3>
          <div className="look-seg" role="group" aria-label={t('look.h')}>
            {(['auto', 'light', 'dark'] as const).map(a => <button key={a} type="button" aria-pressed={look === a} onClick={() => { setAppearance(a); setLook(a) }}><i className={a} />{t('look.' + a)}</button>)}
          </div>
          <h3 className="bt-h bt-h2">{T.lang}</h3>
          <div className="lang-seg" role="group" aria-label={T.lang}>
            {([['ru', 'Русский'], ['en', 'English']] as const).map(([l, n]) => <button key={l} type="button" aria-pressed={LANG === l} onClick={() => LANG !== l && setLang(l)}>{n}</button>)}
          </div>
        </div>
        {/* the account and the data files in one tile: both are about where the tree lives */}
        <div className="bt bt-account">
          <div className="acc-part">
            {cloud.session ? <>
              <p className="who">{t('acc.in', { email: cloud.session.user.email || '' })}</p>
              <p className={'state' + (cloud.offline ? ' off' : '')}><i />{t(cloud.offline ? 'acc.offline' : 'acc.synced')}</p>
              <div><button className="btn" onClick={() => { if (confirm(t('acc.out.confirm'))) signOut() }}>{t('acc.out')}</button></div>
            </> : <>
              <p className="bt-p">{t('acc.local')}</p>
              <div><button className="btn primary" onClick={askToSignIn}>{t('acc.signin')}</button></div>
            </>}
          </div>
          <div className="acc-part acc-files">
            <p className="bt-p">{t(cloud.session ? 'set.data.p.cloud' : 'set.data.p')}</p>
            <div className="bt-btns">
              <button className="btn" onClick={exportJson}>{t('set.export')}</button>
              <button className="btn" onClick={importJson}>{t('set.import')}</button>
              <button className="btn ghost danger" onClick={() => { if (confirm(t('set.clear.confirm'))) { clearData(); toast(t('set.cleared')) } }}>{t('set.clear')}</button>
            </div>
          </div>
        </div>
        {/* a joke in the free cell: a shiny sticker selling the spot */}
        <div className="bt bt-ad" aria-label={T.ad[1]}>
          <div className="ad-stk"><small>{T.ad[0]}</small><b>{T.ad[1]}</b><i className="ad-holo" /></div>
        </div>
        <div className="bt bt-team">
          <h3 className="bt-h">{T.testers}</h3>
          <ul className="bt-people">{[anya, lesha, katya].map((src, i) => <li key={i}><span className="ph"><img src={src} alt="" /></span><b>{T.names[i]}</b></li>)}</ul>
          <p className="bt-ideas">{T.ideas} <a href={TG} target="_blank" rel="noopener noreferrer">{T.write}</a></p>
        </div>
        <div className="bt bt-log changelog"><h3>{t('set.changes')}</h3>
          <ReleaseNote r={CHANGELOG[0]} />
          {CHANGELOG.length > 1 && <details className="older">
            <summary>{t('set.changes.older')}</summary>
            {CHANGELOG.slice(1).map(r => <ReleaseNote key={r.date} r={r} />)}
          </details>}
        </div>
      </div></div>
    </section>
  )
}
