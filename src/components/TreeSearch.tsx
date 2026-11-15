import { useEffect, useRef, useState } from 'react'
import { S, t, fullName, yearsOf, formerNames, type Person } from '../lib/core'
import Avatar from './Avatar'

/** «Найти человека» on the Tree: type a name, pick someone — the camera flies to their card. Opened by the magnifier in the page
 *  header or by «/»; Enter takes the first match, Esc closes. Nothing is changed in the tree. */
export default function TreeSearch({ onPick, onClose, labelOf }: { onPick: (id: string) => void; onClose: () => void; labelOf?: (id: string) => string | undefined }) {
  const [q, setQ] = useState(''), [at, setAt] = useState(0)
  const inp = useRef<HTMLInputElement>(null)
  useEffect(() => { inp.current?.focus() }, [])
  const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').trim()
  const ql = norm(q), words = ql.split(/\s+/).filter(Boolean)
  // every word typed must be found somewhere in the names: first, last, patronymic, maiden and former names
  const hay = (p: Person) => norm([p.first, p.last, p.patronymic, p.maiden, ...formerNames(p)].filter(Boolean).join(' '))
  const list = words.length ? S.people.filter(p => { const h = hay(p); return words.every(w => h.includes(w)) })
    // names that start with what was typed come first
    .sort((a, b) => +!norm(fullName(a)).startsWith(ql) - +!norm(fullName(b)).startsWith(ql)).slice(0, 8) : []
  const cur = Math.min(at, Math.max(0, list.length - 1))
  const key = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setAt(Math.min(cur + 1, list.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAt(Math.max(cur - 1, 0)) }
    else if (e.key === 'Enter' && list[cur]) { e.preventDefault(); onPick(list[cur].id) }
  }
  return (
    <div className="tree-find" role="dialog" aria-label={t('tree.find')}>
      <div className="search lk-search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input ref={inp} value={q} placeholder={t('people.search')} aria-label={t('tree.find')} onChange={e => { setQ(e.target.value); setAt(0) }} onKeyDown={key} />
        <button type="button" className="tf-x" onClick={onClose} aria-label={t('p.cancel')}><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
      </div>
      {words.length > 0 && <div className="lk-list" role="listbox">
        {list.length ? list.map((p, i) => { const k = labelOf?.(p.id), sub = [yearsOf(p), k].filter(Boolean).join(' · ')
          return <button key={p.id} type="button" role="option" aria-selected={i === cur} className={i === cur ? 'on' : ''} onMouseEnter={() => setAt(i)} onClick={() => onPick(p.id)}>
            <Avatar p={p} size={32} /><span><b>{fullName(p)}</b>{sub && <small>{sub}</small>}</span></button> })
          : <p className="muted">{t('tree.find.none')}</p>}
      </div>}
    </div>
  )
}
