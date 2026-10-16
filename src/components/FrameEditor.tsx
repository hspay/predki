import { useState } from 'react'
import { ui, t, commit, refresh, avatarSrc, yearsOf, type Person } from '../lib/core'
import { FR, frameOf, frameName, frameMood, frameAchName, isOpen, colorName, swatchCss, miniCard, type FrameLook } from '../lib/frames'
import { isLight } from '../lib/appearance'

const Lock = () => <svg className="fp-lock" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>

/** «Настроить рамку»: the card's own frame on the Tree; replaces the profile under the photo, every change shows up on the Tree right away. */
export default function FrameEditor({ p }: { p: Person }) {
  const [hint, setHint] = useState('')
  const look = frameOf(p)
  const F = look ? FR.find(x => x.id === look.id) : null
  const set = (f?: FrameLook) => { if (f) p.frame = f; else delete p.frame; commit(true) }
  const choose = (id: string) => {
    const N = FR.find(x => x.id === id)!
    if (!isOpen(N)) { setHint(t('frm.lock', { a: frameAchName(N) })); return }
    setHint(''); set({ id, color: look && look.id === id ? look.color : N.vars[0] })
  }
  const close = () => { ui.frameEdit = false; refresh() }
  const card = { src: avatarSrc(p), first: p.first, last: p.last, years: yearsOf(p), light: isLight() }
  const tile = (svg: string) => <svg viewBox="-32 -34 216 222" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />
  const key = p.id.replace(/[^A-Za-z0-9]/g, '')
  return (
    <div className="fe">
      <div className="fe-head">
        <h3>{t('frm.title')}</h3>
        <span className="fe-mood">{F ? <><b>{frameName(F)}</b> · {frameMood(F)}</> : t('frm.none.d')}</span>
        <button type="button" className="btn icon ghost fe-x" aria-label={t('frm.close')} onClick={close}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
      </div>

      <div className="fp-grid" role="radiogroup" aria-label={t('frm.title')}>
        <button type="button" role="radio" aria-checked={!look} className="fp-tile" onClick={() => { setHint(''); set() }}>
          {tile(miniCard(null, 'fpn' + key, card))}{t('frm.none')}
        </button>
        {FR.map(N => {
          const open = isOpen(N), th = miniCard({ id: N.id, color: look && look.id === N.id ? look.color : N.vars[0] }, 'fpt' + N.id + key, card)
          return <button key={N.id} type="button" role="radio" aria-checked={look?.id === N.id} aria-disabled={!open} className={'fp-tile' + (open ? '' : ' locked')} title={open ? frameMood(N) : t('frm.lock', { a: frameAchName(N) })} onClick={() => choose(N.id)}>
            {tile(th)}{!open && <Lock />}{frameName(N)}
          </button>
        })}
      </div>
      {hint && <p className="fp-hint" role="status">{hint}</p>}

      {look && F && <>
        <div className="fp-row"><span className="eyebrow">{t('frm.color')}</span><span className="fp-val">{colorName(look.color)}</span></div>
        <div className="fp-sw">
          {F.vars.map((v: string) => <button key={v} type="button" aria-label={colorName(v)} title={colorName(v)} aria-pressed={v === look.color} style={{ background: swatchCss(v) }} onClick={() => set({ id: look.id, color: v })} />)}
        </div>
      </>}
      <p className="fe-note fe-desk">{t('frm.live')}</p>
      <p className="fe-note fe-mob">{t('frm.live.m')}</p>
    </div>
  )
}
