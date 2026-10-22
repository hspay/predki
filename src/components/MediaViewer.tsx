// Photos & documents of a person, opened full-screen: pictures and PDFs are shown right here,
// anything else (or anything the browser cannot draw) can still be saved to the device.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { mediaBlob, downloadMedia, fileName } from '../lib/media'
import { t, toast } from '../lib/core'
import type { Media } from '../lib/core'

const X = () => <svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17" /></svg>
const Prev = () => <svg viewBox="0 0 24 24"><path d="m15 6-6 6 6 6" /></svg>
const Next = () => <svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6" /></svg>
const Doc = () => <svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></svg>

type Loaded = { url: string; type: string } | null | 'err'
/** what the browser can draw inline; HEIC and the rest are offered as a download */
const kindOf = (type: string) => /^image\/(jpeg|png|webp|gif|svg\+xml|avif|bmp)$/.test(type) ? 'img' : type === 'application/pdf' ? 'pdf' : 'other'

export default function MediaViewer({ items, start, onClose, onDelete }: {
  items: Media[]; start: number; onClose: () => void; onDelete: (id: string) => void
}) {
  const [i, setI] = useState(Math.min(start, items.length - 1))
  const [file, setFile] = useState<Loaded>(null)
  const m = items[i]
  const n = items.length
  const go = (d: number) => n > 1 && setI(k => (k + d + n) % n)

  // the file itself, as a local blob: link (private files never leave the signed request)
  useEffect(() => {
    if (!m) return
    let alive = true, url = ''
    setFile(null)
    mediaBlob(m.data).then(b => { if (!alive) return; url = URL.createObjectURL(b); setFile({ url, type: b.type }) }).catch(() => alive && setFile('err'))
    return () => { alive = false; if (url) URL.revokeObjectURL(url) }
  }, [m?.id, m?.data])

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); else if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'ArrowRight') go(1) }
    addEventListener('keydown', k); return () => removeEventListener('keydown', k)
  }, [n])

  useEffect(() => { if (!m) onClose() }, [m])
  if (!m) return null

  const ready = file && file !== 'err' ? file : null
  const kind = ready ? kindOf(ready.type) : ''
  const name = m.name || t(m.type === 'doc' ? 'mv.doc' : 'mv.photo')
  const save = () => downloadMedia(m.data, name).catch(() => toast(t('mv.err')))
  const del = () => {
    if (!confirm(t('mv.delete.confirm'))) return
    onDelete(m.id)
    if (n <= 1) onClose(); else setI(k => Math.min(k, n - 2))
  }

  return createPortal(
    <div className="mv-back" onClick={onClose}>
      <div className="mv" role="dialog" aria-modal="true" aria-label={name} onClick={e => e.stopPropagation()}>
        <header className="mv-h">
          <span className="mv-n" title={name}>{name}</span>
          {n > 1 && <span className="mv-c">{i + 1} / {n}</span>}
          <button type="button" className="mv-x" aria-label={t('mv.close')} onClick={onClose}><X /></button>
        </header>
        <div className={'mv-body ' + kind}>
          {file === null && <div className="mv-msg">{t('mv.loading')}</div>}
          {file === 'err' && <div className="mv-msg">{t('mv.err')}</div>}
          {ready && kind === 'img' && <img src={ready.url} alt={name} />}
          {ready && kind === 'pdf' && <iframe src={ready.url} title={name} />}
          {ready && kind === 'other' && <div className="mv-msg"><Doc /><b>{name}</b>{t('mv.noPreview')}</div>}
          {n > 1 && <>
            <button type="button" className="mv-nav prev" aria-label={t('mv.prev')} onClick={() => go(-1)}><Prev /></button>
            <button type="button" className="mv-nav next" aria-label={t('mv.next')} onClick={() => go(1)}><Next /></button>
          </>}
        </div>
        <footer className="mv-f">
          <button type="button" className="btn sm ghost danger" onClick={del}>{t('mv.delete')}</button>
          <span className="mv-sp" />
          {ready && kind !== 'other' && <a className="btn sm ghost" href={ready.url} target="_blank" rel="noopener">{t('mv.open')}</a>}
          {ready
            ? <a className="btn sm" href={ready.url} download={fileName(name, ready.type)}>{t('mv.download')}</a>
            : <button type="button" className="btn sm" onClick={save}>{t('mv.download')}</button>}
        </footer>
      </div>
    </div>,
    document.body
  )
}
