import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { LANG, cloud, toast, bump, useStore } from '../lib/core'
import { inbox, refreshInbox, createTreeLink, closeLink, isForever, linkUrl, type LinkMode, type ShareLink } from '../lib/invites'
import { openShare, PassportIcon } from './ShareSheet'

// «Поделиться» on the Tree: a link to the tree (for social networks or for relatives) or the family passport.
// The link holds a snapshot made at this moment: later changes to the tree do not reach it.
const TX = {
  ru: {
    h: 'Поделиться', tabLink: 'Ссылка на древо', tabPass: 'Паспорт семьи', who: 'Кому',
    show: 'Для соцсетей', showP: 'Только просмотр', ask: 'Для родных', askP: 'Можно дополнить',
    seen: { show: ['Имена', 'Фото', 'Годы ушедших'], ask: ['Имена и фамилии', 'Фото', 'Даты и места'] },
    hidden: { show: ['Фамилии и даты живых', 'Заметки и документы'], ask: ['Заметки и документы'] },
    snap: (d: string, show: boolean) => `Снимок на ${d} · ${show ? 'без срока' : '30 дней'}`,
    make: 'Создать ссылку', making: 'Готовлю…', copy: 'Скопировать', copied: 'Скопировано', open: 'Открыть как гость',
    links: 'Ссылки', none: 'Пока нет', close: 'Закрыть', closeAll: 'Закрыть окно', since: 'с', until: 'до', forever: 'без срока', field: 'Ссылка',
    signIn: 'Чтобы делиться ссылкой, войдите в аккаунт', closed: 'Ссылка закрыта',
    pass: 'Картинка для сторис и постов', passBtn: 'Открыть паспорт',
  },
  en: {
    h: 'Share', tabLink: 'Link to the tree', tabPass: 'Family passport', who: 'For whom',
    show: 'Social networks', showP: 'View only', ask: 'Relatives', askP: 'Can add to it',
    seen: { show: ['Names', 'Photos', 'Years of the departed'], ask: ['Full names', 'Photos', 'Dates and places'] },
    hidden: { show: ['Surnames and dates of the living', 'Notes and documents'], ask: ['Notes and documents'] },
    snap: (d: string, show: boolean) => `Snapshot of ${d} · ${show ? 'no end date' : '30 days'}`,
    make: 'Create a link', making: 'Preparing…', copy: 'Copy', copied: 'Copied', open: 'Open as a guest',
    links: 'Links', none: 'None yet', close: 'Close', closeAll: 'Close', since: 'from', until: 'until', forever: 'no end date', field: 'Link',
    signIn: 'Sign in to share a link', closed: 'The link is closed',
    pass: 'A picture for stories and posts', passBtn: 'Open the passport',
  },
}
const day = (iso: string) => new Date(iso).toLocaleDateString(LANG === 'en' ? 'en-GB' : 'ru-RU', { day: 'numeric', month: 'short' }).replace('.', '')

export default function ShareDialog({ onClose }: { onClose: () => void }) {
  useStore()
  const T = TX[LANG === 'en' ? 'en' : 'ru']
  const [tab, setTab] = useState<'link' | 'pass'>('link')
  const [mode, setMode] = useState<LinkMode>('show')
  const [busy, setBusy] = useState(false), [url, setUrl] = useState(''), [copied, setCopied] = useState(false), [err, setErr] = useState('')
  useEffect(() => { if (cloud.session) refreshInbox() }, [])
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose() }; addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, [busy, onClose])
  const pick = (m: LinkMode) => { setMode(m); setUrl(''); setCopied(false); setErr('') }
  const make = async () => {
    setBusy(true); setErr('')
    try { setUrl(await createTreeLink(mode)); setCopied(false) } catch (e) { setErr((e as Error).message) }
    setBusy(false)
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true) }
    catch { (document.getElementById('shLink') as HTMLInputElement | null)?.select() }
  }
  const live = inbox.links.filter(l => !l.revoked && +new Date(l.expires_at) > Date.now())
  const kindOf = (l: ShareLink): LinkMode => l.mode === 'show' ? 'show' : 'ask'
  const shut = async (token: string) => {
    try { await closeLink(token); if (url.endsWith(token)) setUrl(''); toast(T.closed) } catch (e) { toast((e as Error).message) }
    bump()
  }
  const today = day(new Date().toISOString())

  return createPortal(
    <div className="modal-bg open" id="shDlgBg" onClick={e => { if ((e.target as HTMLElement).id === 'shDlgBg' && !busy) onClose() }}>
      <div className="modal sh-dlg" role="dialog" aria-modal="true" aria-label={T.h}>
        <div className="panel-head"><h3>{T.h}</h3><button className="btn icon ghost" onClick={onClose} aria-label={T.closeAll}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg></button></div>
        <div className="panel-body">
          <div className="sh-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'link'} onClick={() => setTab('link')}>{T.tabLink}</button>
            <button type="button" role="tab" aria-selected={tab === 'pass'} onClick={() => setTab('pass')}>{T.tabPass}</button>
          </div>

          {tab === 'link' && (!cloud.session ? <p className="dlg-note">{T.signIn}</p> : <>
            <div className="sh-modes" role="radiogroup" aria-label={T.who}>
              {(['show', 'ask'] as const).map(m => (
                <button key={m} type="button" role="radio" aria-checked={mode === m} className={'sh-mode ' + m} onClick={() => pick(m)}>
                  <b>{m === 'show' ? <GlobeIcon /> : <PeopleIcon />}{m === 'show' ? T.show : T.ask}</b>
                  <span>{m === 'show' ? T.showP : T.askP}</span>
                </button>))}
            </div>
            <div className="sh-seen">
              {T.seen[mode].map(x => <span key={x} className="y"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5" /></svg>{x}</span>)}
              {T.hidden[mode].map(x => <span key={x} className="n">{x}</span>)}
            </div>
            <p className="sh-meta">{T.snap(today, mode === 'show')}</p>
            {url ? <div className="sh-made">
              <div className="sh-url"><label htmlFor="shLink" className="vh">{T.field}</label><input id="shLink" readOnly value={url.replace(/^https?:\/\//, '')} onFocus={e => e.currentTarget.select()} />
                <button type="button" className={'btn ' + (copied ? 'sh-ok' : 'primary')} onClick={copy}>{copied ? T.copied : T.copy}</button></div>
              <a className="sh-open" href={url} target="_blank" rel="noopener">{T.open}</a>
            </div> : <button type="button" className="btn primary sh-make" onClick={make} disabled={busy}>{busy ? T.making : T.make}</button>}
            {err && <p className="dlg-err" role="alert">{err}</p>}

            <div className="sh-list">
              <h4>{T.links}</h4>
              {live.length ? live.map(l => { const k = kindOf(l); return (
                <div key={l.token} className="sh-row">
                  <span className={'sh-chip ' + k}>{k === 'show' ? T.show : T.ask}</span>
                  <a className="sh-when" href={linkUrl(l.token)} target="_blank" rel="noopener">{`${T.since} ${day(l.created_at)} · ${isForever(l.expires_at) ? T.forever : `${T.until} ${day(l.expires_at)}`}`}</a>
                  <button type="button" className="sh-x" onClick={() => shut(l.token)}>{T.close}</button>
                </div>) }) : <p className="dlg-note">{T.none}</p>}
            </div>
          </>)}

          {tab === 'pass' && <div className="sh-pass">
            <p className="dlg-p">{T.pass}</p>
            <button type="button" className="btn primary" onClick={() => { onClose(); openShare() }}><PassportIcon />{T.passBtn}</button>
          </div>}
        </div>
      </div>
    </div>,
    document.body,
  )
}

const GlobeIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18" /></svg>
const PeopleIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.4" /><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5M14.5 14.6c.8-.4 1.6-.6 2.5-.6 2.2 0 3.8 1.5 4.2 4" /></svg>
/** the share mark (a box with an arrow out of it) for the Tree's header */
export const ShareIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3.5M7.5 8 12 3.5 16.5 8M5 12.5V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6.5" /></svg>
