import { S, ui, t, LANG, byId, fullName, avatarSrc, addPerson, addRel, syncLifeEvents, ensureFathers, commit, toast, go, bump, pickFile, uid, type Draft, type Person } from '../lib/core'
import { findCity } from '../lib/world'
import { MockExtractor } from '../lib/extractor'
import { AI_SAMPLES } from '../lib/sample'

// AI archivist (mock): source text / recording / document photo → draft cards → the user approves.
const AI = ui.ai
function simulate(isA: boolean) { AI.simulating = true; bump(); setTimeout(() => { AI.simulating = false; AI.transcript = isA ? AI_SAMPLES.audio : AI_SAMPLES.photo; bump() }, 1400) }
function run(text: string) {
  if (!text || !text.trim() || AI.busy) return; AI.busy = true; bump()
  setTimeout(() => {
    AI.drafts = MockExtractor.extract(text) as Draft[]
    AI.drafts.forEach(d => { const m = S.people.find(p => p.first === d.first && (!d.last || !p.last || p.last === d.last)); if (m) d.matchId = m.id })
    AI.busy = false; AI.ran = true; S.settings.aiUsed = true; commit()
  }, 1200 + Math.random() * 800)
}
function approve() {
  const sel = AI.drafts.filter(d => d.selected); const map: Record<string, string> = {}
  sel.forEach(d => {
    let p: Person | undefined = d.matchId ? byId(d.matchId) : undefined
    const data: Partial<Person> = { first: d.first, last: d.last, patronymic: d.patronymic, maiden: d.maiden, gender: d.gender as Person['gender'], birthDate: d.birthDate || String(d.birthYear || ''), birthPlace: d.birthPlace, deathDate: String(d.deathYear || ''), deathPlace: d.deathPlace, job: d.job }
    if (p) { const tp = p as unknown as Record<string, unknown>; (Object.keys(data) as (keyof Person)[]).forEach(k => { if (!tp[k] && data[k]) tp[k] = data[k] }) } else p = addPerson(data)
    d.events.forEach(e => { const c = findCity(e.place); p!.events.push({ id: uid(), type: e.type, year: e.year || '', place: e.place, lat: c ? c.lat : null, lon: c ? c.lon : null, note: e.note || '' }) })
    syncLifeEvents(p); map[d.id] = p.id
  })
  sel.forEach(d => { d.spouses.forEach(s => { if (map[s]) addRel('spouse', map[d.id], map[s]) }); d.parents.forEach(pp => { if (map[pp]) addRel('parent', map[pp], map[d.id]) }) })
  ensureFathers(Object.values(map))
  if (AI.mode === 'audio' && sel.length) S.settings.aiAudio = true
  const n = sel.length; AI.drafts = []; AI.transcript = ''; AI.text = ''; ui.treeRefit++; commit(); toast(t('ai.added', { n })); go('tree')
}

const Thinking = ({ label }: { label: string }) => <div className="thinking"><i /><i /><i /><span>{label}</span></div>

function Source() {
  const mode = AI.mode
  if (AI.simulating) return <Thinking label={mode === 'audio' ? (LANG === 'en' ? 'Transcribing the recording…' : 'Расшифровываю запись…') : (LANG === 'en' ? 'Recognizing the document…' : 'Распознаю документ…')} />
  if (mode === 'text') return <>
    <div><h3>{t('ai.text.h')}</h3><p className="muted" style={{ fontSize: 13 }}>{t('ai.text.p')}</p></div>
    <textarea id="aiText" className="src-text" value={AI.text} onChange={e => { AI.text = e.target.value; bump() }} />
    <div className="samples"><span className="muted" style={{ fontSize: 12, alignSelf: 'center' }}>{t('ai.samples')}</span>
      <button onClick={() => { AI.text = AI_SAMPLES.story; bump() }}>{t('ai.sample.1')}</button>
      <button onClick={() => { AI.text = AI_SAMPLES.letter; bump() }}>{t('ai.sample.2')}</button></div>
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button className="btn primary" disabled={AI.busy} onClick={() => run(AI.text)}>{t('ai.extract')}</button></div>
  </>
  const isA = mode === 'audio'
  return <>
    <div><h3>{t(isA ? 'ai.audio.h' : 'ai.photo.h')}</h3><p className="muted" style={{ fontSize: 13 }}>{t(isA ? 'ai.audio.p' : 'ai.photo.p')}</p></div>
    {AI.transcript ? <>
      <div className="eyebrow">{t(isA ? 'ai.transcribed' : 'ai.recognized')}</div><div className="transcript">{AI.transcript}</div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn ghost" onClick={() => { AI.transcript = ''; bump() }}>{t('p.cancel')}</button>
        <button className="btn primary" disabled={AI.busy} onClick={() => run(AI.transcript)}>{t('ai.extract')}</button>
      </div>
    </> : <div className="drop" onClick={() => pickFile(isA ? 'audio/*' : 'image/*', () => simulate(isA))} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); simulate(isA) }}>
      {isA ? <svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg> : <svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>}
      <b>{isA ? 'audio/*' : 'image/*'}</b><span style={{ fontSize: 12 }}>{LANG === 'en' ? 'click to choose a file' : 'нажмите, чтобы выбрать файл'}</span>
    </div>}
  </>
}

function Output() {
  if (AI.busy) return <Thinking label={t('ai.extracting')} />
  if (!AI.drafts.length) return <div className="ai-empty"><b>{t('ai.empty.b')}</b><span style={{ maxWidth: '40ch' }}>{t(AI.ran ? 'ai.nothing' : 'ai.empty.p')}</span></div>
  const nameOf = (id: string) => { const x = AI.drafts.find(y => y.id === id); return x ? [x.first, x.last].filter(Boolean).join(' ') : '' }
  const F = (d: Draft, k: keyof Draft, label: string) => {
    const c = d.conf[k as string] || 'mid'
    return <div className={'df ' + (c === 'low' ? 'low' : '')} key={k as string}><label>{t(label)}<span className="conf">{t('ai.conf.' + c)}</span></label>
      <input value={String(d[k] ?? '')} onChange={e => { (d as unknown as Record<string, unknown>)[k as string] = e.target.value; d.conf[k as string] = 'high'; bump() }} /></div>
  }
  return <>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span className="chip draft">{t('ai.found', { n: AI.drafts.length })}</span><span style={{ flex: 1 }} />
      <button className="btn ghost sm" onClick={() => { AI.drafts = []; AI.ran = false; bump() }}>{t('ai.discard')}</button>
      <button className="btn primary sm" onClick={approve}>{t('ai.approve')}</button>
    </div>
    {AI.drafts.map(d => (
      <div key={d.id} className={'draft ' + (d.selected ? '' : 'off')}>
        <div className="draft-head">
          <span className="avatar preset" style={{ width: 38, height: 38 }}><img src={avatarSrc({ id: d.id, first: d.first, last: d.last, gender: d.gender as Person['gender'], birthDate: String(d.birthYear || d.birthDate || ''), deathDate: String(d.deathYear || '') })} alt="" /></span>
          <div><b>{[d.first, d.patronymic, d.last].filter(Boolean).join(' ') || '?'}</b>
            <small>{d.rel ? t('ai.rel') + ': ' + d.rel : ''}{d.gender ? ' · ' + t('gender.' + d.gender) : ''}{d.spouses.length ? ' · ♥ ' + d.spouses.map(nameOf).join(', ') : ''}{d.parents.length ? ' · ↑ ' + d.parents.map(nameOf).join(', ') : ''}</small></div>
          <input type="checkbox" checked={d.selected} onChange={e => { d.selected = e.target.checked; bump() }} />
        </div>
        {d.matchId && <div className="chip accent" style={{ alignSelf: 'flex-start' }}>{t('ai.match', { name: fullName(byId(d.matchId)) })}</div>}
        <div className="draft-fields">{F(d, 'first', 'p.first')}{F(d, 'last', 'p.last')}{F(d, 'birthYear', 'p.birth')}{F(d, 'birthPlace', 'p.place')}{F(d, 'deathYear', 'p.death')}{F(d, 'deathPlace', 'p.place')}{d.job || d.maiden ? F(d, 'job', 'p.job') : null}{d.maiden ? F(d, 'maiden', 'p.maiden') : null}</div>
        {d.events.length > 0 && <div className="draft-ev"><span className="muted">{t('ai.events')}</span>
          {d.events.map((e, i) => <span key={i} className={'chip ' + (e.conf === 'low' ? 'low' : '')}><i className={'ic ' + e.type} style={{ width: 6, height: 6, borderRadius: 99, background: 'currentColor', display: 'inline-block' }} />{t('ev.' + e.type)} {e.year || ''} {e.place || ''}</span>)}</div>}
      </div>
    ))}
  </>
}

export default function ArchivistPage() {
  return (
    <section className="page active" data-page="ai">
      <div className="topbar"><h2>{t('nav.ai')}</h2>
        <div className="seg" id="aiMode">{(['text', 'audio', 'photo'] as const).map(m => <button key={m} className={AI.mode === m ? 'active' : ''} onClick={() => { AI.mode = m; AI.transcript = ''; bump() }}>{t('ai.' + m)}</button>)}</div>
      </div>
      <div className="scroll"><div className="ai-layout">
        <div className="ai-src" id="aiSrc"><Source /></div>
        <div className="ai-out" id="aiOut"><Output /></div>
      </div></div>
    </section>
  )
}
