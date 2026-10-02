import { S, ui, t, LANG, toast, importData, clearData, bump } from '../lib/core'

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
        <div className="card"><h3>{t('set.data')}</h3><p className="muted" style={{ fontSize: 13 }}>{t('set.data.p')}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn" onClick={exportJson}>{t('set.export')}</button>
            <button className="btn" onClick={importJson}>{t('set.import')}</button>
            <button className="btn ghost danger" onClick={() => { if (confirm(t('set.clear.confirm'))) { clearData(); toast(t('set.cleared')) } }}>{t('set.clear')}</button>
          </div></div>
        <div className="card about"><h3>{t('set.about')}</h3>
          <p>PREDKI — {t('set.about.p')}</p>
          <p>{t('set.author')} — {LANG === 'en' ? 'Andrey Bryzgalin' : 'Андрей Брызгалин'} · <a href="https://t.me/HSpay" target="_blank" rel="noopener noreferrer">Telegram</a> · <a href="https://www.instagram.com/hspay/" target="_blank" rel="noopener noreferrer">Instagram</a></p>
          <p>{t('set.coffee.q')} <a href="https://t.tb.ru/pm_short/2A9fc8Oh3Xe" target="_blank" rel="noopener noreferrer">{t('set.coffee')}</a></p>
        </div>
        <div><button className="btn" onClick={() => { ui.onboarding = true; bump() }}>{t('set.onboard')}</button></div>
      </div></div>
    </section>
  )
}
