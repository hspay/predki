import { useState } from 'react'
import { ui, t, byId, fullName, yearsOf, commit, closeModal, avatarSrc, type Person } from '../lib/core'
import { FR, frameSvg, frameName, frameMood, frameAchName, isOpen, varOf, colorName, PAL, type FrameLook, type FrameSize } from '../lib/frames'
import Avatar from './Avatar'

const Lock = () => <svg className="fp-lock" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>

/** «Выбрать рамку» in the profile: shape, colour and size of the portrait frame on the Tree, or no frame at all. */
export default function FramePicker() {
  const m = ui.modal
  if (!m || m.kind !== 'frame') return null
  const p = byId(m.id); if (!p) return null
  return <Picker key={p.id} p={p} />
}

function Picker({ p }: { p: Person }) {
  const [hint, setHint] = useState('')
  const look = p.frame
  const F = look ? FR.find(x => x.id === look.id) : null
  const set = (f?: FrameLook) => { if (f) p.frame = f; else delete p.frame; commit(true) }
  const choose = (id: string) => {
    const N = FR.find(x => x.id === id)!
    if (!isOpen(N)) { setHint(t('frm.lock', { a: frameAchName(N) })); return }
    setHint(''); set({ id, color: varOf(N, look?.color).k, size: look?.size || 'M' })
  }
  const prev = look ? frameSvg(look, 'fpv', avatarSrc(p)) : null
  return (
    <div className="modal-bg open" id="modalBg" onClick={e => { if ((e.target as HTMLElement).id === 'modalBg') closeModal() }}>
      <div className="modal fp" role="dialog" aria-labelledby="fpTitle">
        <div className="panel-head"><h3 id="fpTitle">{t('frm.title')}</h3></div>
        <div className="panel-body fp-body">
          <div className="fp-preview">
            {prev
              ? <svg viewBox={`-14 -14 ${prev.w + 28} ${prev.h + 28}`} style={{ height: Math.round((prev.h + 28) * 1.05) }}><defs><filter id="fpSh" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000" floodOpacity=".45" /></filter></defs><g filter="url(#fpSh)" dangerouslySetInnerHTML={{ __html: `<defs>${prev.defs}</defs>${prev.body}` }} /></svg>
              : <div className="fp-card"><Avatar p={p} size={42} /><span><b>{fullName(p)}</b><small>{yearsOf(p)}</small></span></div>}
            <div className="fp-cap">{F ? <><b>{frameName(F)}</b> · {frameMood(F)}</> : <><b>{t('frm.none')}</b> · {t('frm.none.d')}</>}</div>
          </div>

          <div className="fp-grid" role="radiogroup" aria-label={t('frm.title')}>
            <button type="button" role="radio" aria-checked={!look} className="fp-tile" onClick={() => { setHint(''); set() }}>
              <span className="fp-none"><Avatar p={p} size={22} /><i /><i /></span>{t('frm.none')}
            </button>
            {FR.map(N => {
              const th = frameSvg({ id: N.id, color: varOf(N, look?.color).k, size: 'M' }, 'fpt' + N.id), open = isOpen(N)
              return <button key={N.id} type="button" role="radio" aria-checked={look?.id === N.id} aria-disabled={!open} className={'fp-tile' + (open ? '' : ' locked')} title={open ? frameMood(N) : t('frm.lock', { a: frameAchName(N) })} onClick={() => choose(N.id)}>
                <svg viewBox={`-6 -6 ${th.w + 12} ${th.h + 12}`} aria-hidden="true" dangerouslySetInnerHTML={{ __html: `<defs>${th.defs}</defs>${th.body}` }} />
                {!open && <Lock />}{frameName(N)}
              </button>
            })}
          </div>
          {hint && <p className="fp-hint" role="status">{hint}</p>}

          {look && F && <>
            <div className="fp-row"><span className="eyebrow">{t('frm.color')}</span><span className="fp-val">{colorName(varOf(F, look.color).k)}</span></div>
            <div className="fp-sw">
              {F.vars.map((V: { k: string; edge?: string; ring?: string }) => <button key={V.k} type="button" aria-label={colorName(V.k)} title={colorName(V.k)} aria-pressed={V.k === varOf(F, look.color).k} style={{ background: PAL[V.k][0] }} onClick={() => set({ ...look, color: V.k })}>
                {(V.edge || V.ring) && <i style={{ boxShadow: `0 0 0 3px ${V.edge || V.ring} inset` }} />}</button>)}
            </div>
            <div className="fp-row"><span className="eyebrow">{t('frm.size')}</span></div>
            <div className="ts-seg fp-size" role="radiogroup" aria-label={t('frm.size')}>
              {(['S', 'M', 'L'] as FrameSize[]).map(s => <button key={s} type="button" role="radio" aria-checked={look.size === s} onClick={() => set({ ...look, size: s })}>{t('frm.' + s)}</button>)}
            </div>
          </>}
          <div className="fp-foot"><button className="btn primary" onClick={closeModal}>{t('frm.done')}</button></div>
        </div>
      </div>
    </div>
  )
}
