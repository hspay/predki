import { useState } from 'react'
import { S, t, commit } from '../lib/core'
import { THEMES, themeName } from '../lib/treeStyle'

/** Pencil in the corner of the Tree: the family's title, background and places for ancestors. */
export default function TreeStyle() {
  const [open, setOpen] = useState(false)
  const st = S.settings
  const set = (patch: Partial<typeof st>) => { Object.assign(st, patch); commit(true) }
  return <>
    <button className={'btn icon ts-pen' + (open ? ' on' : '')} title={t('ts.title')} aria-label={t('ts.title')} aria-expanded={open} onClick={() => setOpen(!open)}>
      <svg viewBox="0 0 24 24"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></svg>
    </button>
    {open && <div className="ts-pop" role="dialog" aria-label={t('ts.title')}>
      <div className="ts-h"><b>{t('ts.title')}</b><button className="btn sm" onClick={() => setOpen(false)}>{t('ts.close')}</button></div>
      <div className="field"><label htmlFor="tsName">{t('ts.name')}</label>
        <input id="tsName" type="text" defaultValue={st.familyName || ''} placeholder={t('ts.name.ph')} onChange={e => set({ familyName: e.target.value })} /></div>
      <div className="field"><label>{t('ts.bg')}</label>
        <div className="ts-sw" role="radiogroup" aria-label={t('ts.bg')}>
          {THEMES.map(th => <button key={th.k} type="button" role="radio" aria-checked={(st.theme || 'night') === th.k} onClick={() => set({ theme: th.k })}>
            <span className={'chip th-' + th.k} />{themeName(th)}</button>)}
        </div></div>
      <div className="field"><label id="tsLinesL">{t('ts.lines')}</label>
        <div className="seg ts-seg" role="radiogroup" aria-labelledby="tsLinesL">
          {(['smooth', 'straight'] as const).map(k => <button key={k} type="button" role="radio" aria-checked={(st.lines || 'smooth') === k} onClick={() => set({ lines: k })}>
            <svg viewBox="0 0 28 16" aria-hidden="true">{k === 'smooth' ? <path d="M3 2v3c0 5 22 3 22 8v1" /> : <path d="M3 2v6h22v6" />}</svg>{t('ts.lines.' + k)}</button>)}
        </div></div>
      <label className="ts-toggle"><input type="checkbox" checked={st.ghosts !== false} onChange={e => set({ ghosts: e.target.checked })} />
        <span><b>{t('ts.ghosts')}</b><small>{t('ts.ghosts.d')}</small></span></label>
    </div>}
  </>
}
