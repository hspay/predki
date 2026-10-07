import { useEffect, useMemo, useRef, useState } from 'react'
import { S, ui, bump, persist, toast, LANG } from '../lib/core'
import { renderCard, passportData, cardLayout, SIZE, DW, DH, logoReady } from '../lib/passport'

// «Паспорт семьи»: preview the card, pick its look and share it as a picture.
const TX = {
  ru: { h: 'Паспорт семьи', sub: 'Посмотреть и поделиться', close: 'Закрыть', look: 'Оформление', night: 'Ночь', paper: 'Бумага', uv: 'УФ-свет', cover: 'Обложка', map: 'Карта переездов', stars: 'Созвездие рода',
    fmt: 'Формат', story: 'Сториз 9:16', post: 'Пост 4:5', labels: 'Подписи', fam: 'Род', keeper: 'Хранитель', save: 'Сохранить', toStory: 'В сториз', send: 'Отправить', copy: 'Копировать',
    saved: 'Картинка сохранена', copied: 'Картинка скопирована, её можно вставить в чат', noCopy: 'Браузер не дал скопировать картинку. Сохраните её и отправьте файлом',
    noShare: 'Картинка сохранена. Добавьте её в сториз из галереи', aria: 'Карточка «Паспорт семьи»', share: 'Мой род в Predki' },
  en: { h: 'Family passport', sub: 'View and share', close: 'Close', look: 'Look', night: 'Night', paper: 'Paper', uv: 'UV light', cover: 'Cover', map: 'Map of moves', stars: 'Family constellation',
    fmt: 'Format', story: 'Story 9:16', post: 'Post 4:5', labels: 'Captions', fam: 'Family', keeper: 'Keeper', save: 'Save', toStory: 'To story', send: 'Send', copy: 'Copy',
    saved: 'Picture saved', copied: 'Picture copied, paste it into a chat', noCopy: 'The browser did not allow copying. Save the picture and send it as a file',
    noShare: 'Picture saved. Add it to your story from the gallery', aria: 'Family passport card', share: 'My family in Predki' },
}
type St = { theme: string; hero: string; fmt: string; uv: boolean; fam: string; keeper: string }

export function openShare() { ui.share = true; bump() }
/** A passport booklet with a globe on the cover. */
export const PassportIcon = () => <svg viewBox="0 0 24 24"><rect x="4.5" y="2" width="15" height="20" rx="2.2" /><circle cx="12" cy="10.2" r="4.6" /><path d="M12 5.6c-1.5 1.3-2.2 2.8-2.2 4.6s.7 3.3 2.2 4.6c1.5-1.3 2.2-2.8 2.2-4.6s-.7-3.3-2.2-4.6zM7.4 10.2h9.2M9 18.4h6" /></svg>
export const passportLabel = () => TX[LANG === 'en' ? 'en' : 'ru'].h
export function ShareButton() {
  return <button className="btn sm share-btn" type="button" onClick={openShare}><PassportIcon /><span>{passportLabel()}</span></button>
}

export default function ShareSheet() {
  const T = TX[LANG === 'en' ? 'en' : 'ru']
  const auto = useMemo(() => passportData(), [])
  const saved = S.settings.share || {}
  const [st, setSt] = useState<St>({ theme: saved.theme || 'night', hero: saved.hero || 'map', fmt: saved.fmt || 'story', uv: !!saved.uv, fam: saved.fam || auto.fam, keeper: saved.keeper || auto.keeper })
  const [ready, setReady] = useState(0)
  const cvRef = useRef<HTMLCanvasElement>(null), tiltRef = useRef<HTMLDivElement>(null), glareRef = useRef<HTMLDivElement>(null), stageRef = useRef<HTMLDivElement>(null)
  const set = (p: Partial<St>) => setSt(s => ({ ...s, ...p }))
  const close = () => { ui.share = false; bump() }
  const data = () => passportData({ fam: st.fam, keeper: st.keeper })

  // the card is drawn with Onest and JetBrains Mono, so wait for them (and the logo) once
  useEffect(() => {
    let alive = true; const fonts = ['600 40px Onest', '300 40px Onest', '400 20px Onest', '500 20px Onest', '500 20px "JetBrains Mono"'].map(f => document.fonts?.load(f))
    Promise.race([Promise.all(fonts), new Promise(r => setTimeout(r, 2500))]).then(() => alive && setReady(v => v + 1))
    logoReady(() => alive && setReady(v => v + 1))
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    addEventListener('keydown', key); const rs = () => setReady(v => v + 1); addEventListener('resize', rs)
    return () => { alive = false; removeEventListener('keydown', key); removeEventListener('resize', rs) }
  }, [])
  useEffect(() => { S.settings.share = { ...st, fam: st.fam !== auto.fam ? st.fam : '', keeper: st.keeper !== auto.keeper ? st.keeper : '' }; persist() }, [st])
  useEffect(() => {
    const cv = cvRef.current, tilt = tiltRef.current, glare = glareRef.current; if (!cv || !tilt || !glare) return
    const id = requestAnimationFrame(() => {
      const [W, H] = SIZE[st.fmt as 'story' | 'post']; const k = Math.min(1, Math.max(.35, tilt.clientWidth * (devicePixelRatio || 1) / W))
      renderCard(cv, k, st, data())
      const L = cardLayout(st), d = tilt.clientWidth / W
      Object.assign(glare.style, { left: L.x / W * 100 + '%', top: L.y / H * 100 + '%', width: DW * L.s / W * 100 + '%', height: DH * L.s / H * 100 + '%', borderRadius: 40 * L.s * d + 'px' })
    })
    return () => cancelAnimationFrame(id)
  }, [st, ready])

  const move = (e: React.PointerEvent) => {
    const tilt = tiltRef.current!, glare = glareRef.current!, b = tilt.getBoundingClientRect(), px = (e.clientX - b.left) / b.width, py = (e.clientY - b.top) / b.height
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) tilt.style.transform = `rotateX(${(.5 - py) * 9}deg) rotateY(${(px - .5) * 11}deg)`
    const g = glare.getBoundingClientRect(); glare.style.setProperty('--mx', ((e.clientX - g.left) / g.width * 100) + '%'); glare.style.setProperty('--my', ((e.clientY - g.top) / g.height * 100) + '%')
    glare.style.setProperty('--fx', px * 100 + '%'); glare.style.setProperty('--fy', py * 100 + '%')
  }

  const blob = () => new Promise<Blob>((res, rej) => { const cv = document.createElement('canvas'); renderCard(cv, 1, st, data()); cv.toBlob(b => b ? res(b) : rej(), 'image/png') })
  const name = () => `predki-passport-${st.fmt}.png`
  const download = (b: Blob) => { const url = URL.createObjectURL(b), a = document.createElement('a'); a.href = url; a.download = name(); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000) }
  const act = async (kind: 'save' | 'story' | 'send' | 'copy') => {
    const b = await blob()
    if (kind === 'copy') {
      try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]); toast(T.copied) } catch { toast(T.noCopy) }
      return
    }
    if (kind !== 'save') {
      const file = new File([b], name(), { type: 'image/png' })
      try { if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: T.share }); return } } catch (err) { if ((err as Error)?.name === 'AbortError') return }
      download(b); toast(T.noShare); return
    }
    download(b); toast(T.saved)
  }

  const seg = (k: 'theme' | 'hero' | 'fmt', opts: [string, string][]) => (
    <div className="ps-seg" role="group">{opts.map(([v, l]) => <button key={v} type="button" aria-pressed={st[k] === v} onClick={() => set({ [k]: v } as Partial<St>)}>{l}</button>)}</div>
  )
  const [W, H] = SIZE[st.fmt as 'story' | 'post']
  return (
    <div className="ps-veil" onClick={e => { if (e.target === e.currentTarget) close() }}>
      <div className="ps" role="dialog" aria-modal="true" aria-label={T.h}>
        <header className="ps-top">
          <button className="ps-x" type="button" onClick={close} aria-label={T.close}><svg viewBox="0 0 16 16"><path d="M3 3l10 10M13 3 3 13" /></svg></button>
          <div><h2>{T.h}</h2><p>{T.sub}</p></div>
        </header>
        <div className="ps-grid">
          <div className="ps-stage" ref={stageRef} onPointerMove={move} onPointerLeave={() => { if (tiltRef.current) tiltRef.current.style.transform = '' }}>
            <div className={'ps-tilt' + (st.uv ? ' uv' : '')} ref={tiltRef} style={{ ['--ar' as string]: `${W}/${H}`, ['--arn' as string]: (W / H).toFixed(4) }}>
              <canvas ref={cvRef} aria-label={T.aria} /><div className="ps-glare" ref={glareRef} />
            </div>
          </div>
          <div className="ps-panel">
            <div className="ps-sec"><span className="eyebrow">{T.look}</span>
              <div className="ps-row">{seg('theme', [['night', T.night], ['paper', T.paper]])}
                <button type="button" className="ps-uv" aria-pressed={st.uv} onClick={() => set({ uv: !st.uv })}><svg viewBox="0 0 24 24"><path d="M9 3h6l-1 6h-4z" /><path d="M10 9v3a2 2 0 0 0 4 0V9" /><path d="M12 16v5M7 18l-2 2M17 18l2 2" /></svg>{T.uv}</button>
              </div>
            </div>
            <div className="ps-sec"><span className="eyebrow">{T.cover}</span>{seg('hero', [['map', T.map], ['stars', T.stars]])}</div>
            <div className="ps-sec"><span className="eyebrow">{T.fmt}</span>{seg('fmt', [['story', T.story], ['post', T.post]])}</div>
            <div className="ps-sec"><span className="eyebrow">{T.labels}</span>
              <label className="ps-field"><span>{T.fam}</span><input className="input" value={st.fam} maxLength={28} onChange={e => set({ fam: e.target.value })} /></label>
              <label className="ps-field"><span>{T.keeper}</span><input className="input" value={st.keeper} maxLength={32} onChange={e => set({ keeper: e.target.value })} /></label>
            </div>
            <div className="ps-share">
              <button type="button" onClick={() => act('save')}><span className="ic pri"><svg viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg></span>{T.save}</button>
              <button type="button" onClick={() => act('story')}><span className="ic"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="5" /><circle cx="12" cy="12" r="3.6" /><circle cx="16.6" cy="7.4" r=".6" fill="currentColor" /></svg></span>{T.toStory}</button>
              <button type="button" onClick={() => act('send')}><span className="ic"><svg viewBox="0 0 24 24"><path d="M21 3 10 14M21 3l-7 18-4-7-7-4z" /></svg></span>{T.send}</button>
              <button type="button" onClick={() => act('copy')}><span className="ic"><svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="3" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg></span>{T.copy}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
