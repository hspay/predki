import { S, ui, t, LANG, toast, importData, clearData, bump, cloud, signOut, askToSignIn } from '../lib/core'
import { CHANGELOG, type Release } from '../lib/changelog'

const MONTHS = { ru: ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'], en: ['January','February','March','April','May','June','July','August','September','October','November','December'] }
function relDate(iso: string) { const [y, m, d] = iso.split('-').map(Number); return LANG === 'en' ? `${MONTHS.en[m - 1]} ${d}, ${y}` : `${d} ${MONTHS.ru[m - 1]} ${y}` }
function ReleaseNote({ r }: { r: Release }) {
  const L = LANG === 'en' ? 'en' : 'ru'
  return <div className="release"><time className="release-date" dateTime={r.date}>{relDate(r.date)}</time><ul>{r.items.map((it, i) => <li key={i}>{it[L]}</li>)}</ul></div>
}

export default function SettingsPage() {
  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), people: S.people, rels: S.rels, achievements: S.achievements, achDates: S.achDates }, null, 2)], { type: 'application/json' })
    const u = URL.createObjectURL(blob); const l = document.createElement('a'); l.href = u; l.download = 'predki-' + new Date().toISOString().slice(0, 10) + '.json'; l.click(); setTimeout(() => URL.revokeObjectURL(u), 1000)
    toast(t('set.exported'))
  }
  const importJson = () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json'
    inp.onchange = () => { const f = inp.files && inp.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { importData(JSON.parse(String(r.result))); toast(t('set.imported')) } catch { toast(LANG === 'en' ? 'Invalid JSON' : 'Файл не похож на экспорт Predki') } }; r.readAsText(f) }
    inp.click()
  }
  return (
    <section className="page active" data-page="settings">
      <div className="topbar"><h2>{t('nav.settings')}</h2></div>
      <div className="scroll"><div className="settings">
        <div className="card account"><h3>{t('acc.h')}</h3>
          {cloud.session ? <>
            <p className="who">{t('acc.in', { email: cloud.session.user.email || '' })}</p>
            <p className={'state' + (cloud.offline ? ' off' : '')}><i />{t(cloud.offline ? 'acc.offline' : 'acc.synced')}</p>
            <div><button className="btn" onClick={() => { if (confirm(t('acc.out.confirm'))) signOut() }}>{t('acc.out')}</button></div>
          </> : <>
            <p className="muted" style={{ fontSize: 13 }}>{t('acc.local')}</p>
            <div><button className="btn primary" onClick={askToSignIn}>{t('acc.signin')}</button></div>
          </>}
        </div>
        <div className="card"><h3>{t('set.data')}</h3><p className="muted" style={{ fontSize: 13 }}>{t(cloud.session ? 'set.data.p.cloud' : 'set.data.p')}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn" onClick={exportJson}>{t('set.export')}</button>
            <button className="btn" onClick={importJson}>{t('set.import')}</button>
            <button className="btn ghost danger" onClick={() => { if (confirm(t('set.clear.confirm'))) { clearData(); toast(t('set.cleared')) } }}>{t('set.clear')}</button>
          </div></div>
        <div className="card about"><h3>{t('set.about')}</h3>
          <p>PREDKI — {t('set.about.p')}</p>
          <p>{t('set.author')} — {LANG === 'en' ? 'Andrey Bryzgalin' : 'Андрей Брызгалин'} · <a href="https://t.me/HSpay" target="_blank" rel="noopener noreferrer">Telegram</a> · <a href="https://www.instagram.com/hspay/" target="_blank" rel="noopener noreferrer">Instagram</a></p>
          <p>{t('set.coffee.q')} <a href="https://t.tb.ru/pm_short/2A9fc8Oh3Xe" target="_blank" rel="noopener noreferrer">{t('set.coffee')}</a></p>
          <p><a href="privacy.html" target="_blank" rel="noopener">{t('set.privacy')}</a></p>
        </div>
        <div className="card changelog"><h3>{t('set.changes')}</h3>
          <ReleaseNote r={CHANGELOG[0]} />
          {CHANGELOG.length > 1 && <details className="older">
            <summary>{t('set.changes.older')}</summary>
            {CHANGELOG.slice(1).map(r => <ReleaseNote key={r.date} r={r} />)}
          </details>}
        </div>
        <div><button className="btn" onClick={() => { ui.onboarding = true; bump() }}>{t('set.onboard')}</button></div>
      </div></div>
    </section>
  )
}
