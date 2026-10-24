import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { t, toast, cloud, deleteAccount } from '../lib/core'
import { sendReport } from '../lib/problems'

const X = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>

/** a dialog over the page; Esc and a tap outside close it (unless it is busy) */
function Dialog({ title, busy, onClose, children, foot }: { title: string; busy?: boolean; onClose: () => void; children: ReactNode; foot: ReactNode }) {
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose() }; addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, [busy, onClose])
  // drawn over the whole app, not inside the Settings page: the page scrolls and would carry a fixed layer along with it
  return createPortal(
    <div className="modal-bg open" id="accDlgBg" onClick={e => { if ((e.target as HTMLElement).id === 'accDlgBg' && !busy) onClose() }}>
      <div className="modal acc-dlg" role="dialog" aria-modal="true" aria-label={title}>
        <div className="panel-head"><h3>{title}</h3><button className="btn icon ghost" onClick={onClose} disabled={busy} aria-label={t('p.cancel')}><X /></button></div>
        <div className="panel-body">{children}</div>
        <div className="panel-foot">{foot}</div>
      </div>
    </div>,
    document.body,
  )
}

/** «Удалить аккаунт»: what goes, a copy to keep, and the word typed to confirm — it cannot be undone. */
export function DeleteAccountDialog({ onClose, onExport }: { onClose: () => void; onExport: () => Promise<void> | void }) {
  const [word, setWord] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState('')
  const ok = word.trim().toLowerCase() === t('del.word').toLowerCase()
  const ready = !!cloud.session && cloud.synced && !cloud.offline
  const go = async () => {
    if (!ok || busy) return
    setBusy(true); setErr('')
    try { await deleteAccount(); toast(t('del.done')); onClose() }
    catch (e) {
      const m = (e as { code?: string; message?: string }) || {}
      setErr(m.message === 'not_ready' ? t('del.offline') : m.code === 'PGRST202' || /delete_my_account/.test(m.message || '') ? t('del.notready') : t('del.fail'))
      setBusy(false)
    }
  }
  return (
    <Dialog title={t('del.h')} busy={busy} onClose={onClose} foot={<>
      <button className="btn ghost" onClick={onClose} disabled={busy}>{t('p.cancel')}</button>
      <button className="btn kill" onClick={go} disabled={!ok || busy || !ready}>{busy ? t('del.busy') : t('del.go')}</button>
    </>}>
      <p className="dlg-p">{t('del.p')}</p>
      <div className="dlg-copy"><p>{t('del.copy')}</p><button className="btn" onClick={() => onExport()} disabled={busy}>{t('del.copy.btn')}</button></div>
      <div className="field"><label htmlFor="delWord">{t('del.type')}</label>
        <input id="delWord" value={word} autoComplete="off" autoCapitalize="off" spellCheck={false} disabled={busy} placeholder={t('del.word')} onChange={e => setWord(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') go() }} /></div>
      <p className="dlg-note">{t('del.backups')}</p>
      {!ready && <p className="dlg-err" role="status">{t('del.offline')}</p>}
      {err && <p className="dlg-err" role="alert">{err}</p>}
    </Dialog>
  )
}

/** «Сообщить о проблеме»: a few words from the person; the technical details go along by themselves. */
export function ReportDialog({ onClose }: { onClose: () => void }) {
  const [msg, setMsg] = useState(''), [contact, setContact] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState('')
  const area = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { area.current?.focus() }, [])
  const email = cloud.session?.user.email || ''
  const send = async () => {
    if (!msg.trim() || busy) return
    setBusy(true); setErr('')
    try { await sendReport(msg, email || contact); toast(t('rep.done')); onClose() }
    catch { setErr(t('rep.fail')); setBusy(false) }
  }
  return (
    <Dialog title={t('rep.h')} busy={busy} onClose={onClose} foot={<>
      <button className="btn ghost" onClick={onClose} disabled={busy}>{t('p.cancel')}</button>
      <button className="btn primary" onClick={send} disabled={!msg.trim() || busy}>{busy ? t('rep.busy') : t('rep.send')}</button>
    </>}>
      <div className="field"><label htmlFor="repMsg">{t('rep.what')}</label>
        <textarea id="repMsg" ref={area} rows={5} maxLength={4000} value={msg} disabled={busy} placeholder={t('rep.ph')} onChange={e => setMsg(e.target.value)} /></div>
      {email
        ? <p className="dlg-note">{t('rep.reply', { email })}</p>
        : <div className="field"><label htmlFor="repContact">{t('rep.contact')}</label><input id="repContact" type="email" value={contact} maxLength={200} disabled={busy} placeholder="name@mail.ru" onChange={e => setContact(e.target.value)} /></div>}
      <p className="dlg-note">{t('rep.details')}</p>
      {err && <p className="dlg-err" role="alert">{err}<a href="https://t.me/HSpay" target="_blank" rel="noopener noreferrer">Telegram</a></p>}
    </Dialog>
  )
}
