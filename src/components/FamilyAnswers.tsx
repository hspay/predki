import { useEffect, useRef, useState } from 'react'
import { LANG, byId, openPerson, toast, cloud } from '../lib/core'
import { inbox, refreshInbox, decide, describe, closeLink, createLink, linkUrl, type Suggestion } from '../lib/invites'
import type { Gap } from '../lib/gaps'

// Owner's side of «Попросить заполнить»: answers from relatives to check and accept, the open links,
// and the link block inside the message window.
const TX = {
  ru: {
    h: 'Ответы от родных', s: 'Проверьте и примите то, что верно. Принятое сразу попадёт в древо с пометкой «со слов».',
    ok: 'Принять', no: 'Отклонить', okAll: 'Принять всё', noAll: 'Отклонить всё', accepted: 'Принято', declined: 'Отклонено', was: 'было',
    general: 'по общей ссылке', forWho: (n: string) => `по ссылке для: ${n}`,
    links: 'Управлять ссылками для родных', linkAll: 'Для всех родных', until: (d: string) => `до ${d}`,
    answers: (n: number) => `${n} ${pl(n, ['ответ', 'ответа', 'ответов'])}`, view: 'Открыть', close: 'Закрыть доступ', closedToast: 'Ссылка закрыта: по ней больше нельзя открыть древо',
    lH: 'Ссылка на древо', lP: 'Родственник откроет древо без регистрации, посмотрит его и допишет, что помнит. Вы увидите ответ здесь и сами решите, что принять. В ссылке нет фото, документов, рассказов и заметок; работает 30 дней.',
    lAdd: 'Добавить ссылку', lBusy: 'Создаём ссылку…', lDone: 'Ссылка добавлена в текст сообщения', lNoAcc: 'Чтобы отправить родственнику ссылку на древо, войдите в аккаунт: ответы приходят в него.',
    line: (u: string) => `Тут можно посмотреть историю семьи и дополнить, что помнишь ${u}`,
    tail: 'Можно ответить сообщением или голосовым — я сохраню это в наше древо.',
  },
  en: {
    h: 'Answers from relatives', s: 'Check them and accept what is right. Accepted lines go straight into the tree, marked “as told by”.',
    ok: 'Accept', no: 'Decline', okAll: 'Accept all', noAll: 'Decline all', accepted: 'Accepted', declined: 'Declined', was: 'was',
    general: 'via a general link', forWho: (n: string) => `via the link for ${n}`,
    links: 'Manage links for relatives', linkAll: 'For any relative', until: (d: string) => `until ${d}`,
    answers: (n: number) => `${n} ${n === 1 ? 'answer' : 'answers'}`, view: 'Open', close: 'Close access', closedToast: 'Link closed: it no longer opens the tree',
    lH: 'Link to the tree', lP: 'Your relative opens the tree without signing up, looks through it and adds what they remember. You see the answer here and decide what to accept. No photos, documents, stories or notes; works for 30 days.',
    lAdd: 'Add a link', lBusy: 'Creating the link…', lDone: 'The link is in the message', lNoAcc: 'To send a relative a link to the tree, sign in: answers arrive in your account.',
    line: (u: string) => `Here you can look through our family history and add what you remember ${u}`,
    tail: 'You can reply with a message or a voice note — I’ll save it to our family tree.',
  },
}
function pl(n: number, f: string[]) { const a = n % 10, b = n % 100; return f[(a === 1 && b !== 11) ? 0 : (a >= 2 && a <= 4 && (b < 12 || b > 14)) ? 1 : 2] }
const tx = () => TX[LANG === 'en' ? 'en' : 'ru']
const loc = () => (LANG === 'en' ? 'en-GB' : 'ru-RU')
/** a chain link */
export const LinkIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2" /><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2" /></svg>

/** The link block in the message window. `auto` creates the link right away («Попросить заполнить»). */
export function AskLink({ g, w, auto, text, onText }: { g: Gap | null; w: string | null; auto?: boolean; text: string; onText: (t: string) => void }) {
  const T = tx(), [state, setState] = useState<'idle' | 'busy' | 'done'>('idle'), [err, setErr] = useState(''), started = useRef(false)
  const textRef = useRef(text); textRef.current = text
  const create = async () => {
    setState('busy'); setErr('')
    try {
      const url = await createLink(w, g), t = textRef.current
      onText((t.includes(T.tail) ? t.replace(T.tail, '').trimEnd() : t.trimEnd()) + '\n\n' + T.line(url)); setState('done')
    } catch (e) { setErr((e as Error).message); setState('idle') }
  }
  useEffect(() => { if (auto && cloud.session && !started.current) { started.current = true; create() } }, [])
  if (!cloud.session) return <div className="gp-link"><LinkIcon /><span><b>{T.lH}</b><small>{T.lNoAcc}</small></span></div>
  return (
    <div className={'gp-link' + (state === 'done' ? ' on' : '')}><LinkIcon />
      <span><b>{state === 'done' ? T.lDone : T.lH}</b><small>{T.lP}</small>{err && <small className="gp-err">{err}</small>}</span>
      {state !== 'done' && <button type="button" className="btn sm" disabled={state === 'busy'} onClick={create}>{state === 'busy' ? T.lBusy : T.lAdd}</button>}
    </div>
  )
}

/** Answers waiting for a decision. Shown at the top of «Заполнить пробелы». */
export default function FamilyAnswers() {
  const T = tx()
  const [, force] = useState(0)
  useEffect(() => { refreshInbox() }, [])
  if (!cloud.session) return null
  const pending = inbox.list.filter(s => s.status === 'new')
  const linkOf = (s: Suggestion) => inbox.links.find(l => l.token === s.token)
  const run = (p: Promise<unknown>) => p.catch(e => toast((e as Error).message)).finally(() => force(x => x + 1))
  const when = (iso: string) => new Date(iso).toLocaleString(loc(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).replace('.', '')

  return <>
    {inbox.error && <p className="gp-warn">{inbox.error}</p>}
    {pending.length > 0 && <section className="fa">
      <h3 className="gp-h">{T.h} <i className="badge">{pending.reduce((n, s) => n + s.items.filter(i => !i.st).length, 0)}</i></h3>
      <p className="gp-s">{T.s}</p>
      <div className="fa-list">
        {pending.map(s => { const l = linkOf(s), left = s.items.filter(i => !i.st).length; return (
          <article className="gp-card fa-card" key={s.id}>
            <div className="gp-hd"><b>{s.author || '—'}</b><span className="gp-span">{when(s.created_at)} · {l && l.label ? T.forWho(l.label) : T.general}</span></div>
            <ul className="fa-items">
              {s.items.map((it, i) => { const d = describe(it), id = 'id' in it ? it.id : it.t === 'person' ? it.of : ''; return (
                <li key={i} className={it.st ? 'st-' + it.st : ''}>
                  <div className="fa-what">{d.who && (id && byId(id) && it.t !== 'person' ? <button type="button" className="fa-who" onClick={() => openPerson(id)}>{d.who}</button> : <b>{d.who}</b>)}<span>{d.what}</span></div>
                  <div className="fa-val">{d.value}{d.was && <small>{T.was}: {d.was}</small>}</div>
                  {it.st ? <span className="fa-st">{it.st === 'ok' ? T.accepted : T.declined}</span>
                    : <div className="fa-btns"><button type="button" className="btn sm ghost" onClick={() => run(decide(s, i, 'no'))}>{T.no}</button><button type="button" className="btn sm primary" onClick={() => run(decide(s, i, 'ok'))}>{T.ok}</button></div>}
                </li>) })}
            </ul>
            {left > 1 && <div className="gp-acts fa-all"><button type="button" className="btn sm ghost" onClick={() => run(decide(s, null, 'no'))}>{T.noAll}</button><button type="button" className="btn sm" onClick={() => run(decide(s, null, 'ok'))}>{T.okAll}</button></div>}
          </article>) })}
      </div>
    </section>}
  </>
}

/** All links made for relatives, collapsed: open one, close access. Shown at the bottom of «Заполнить пробелы». */
export function FamilyLinks() {
  const T = tx()
  const [, force] = useState(0)
  const now = Date.now(), live = inbox.links.filter(l => !l.revoked && Date.parse(l.expires_at) > now) // closed and expired links are not shown
  if (!cloud.session || !live.length) return null
  const run = (p: Promise<unknown>) => p.catch(e => toast((e as Error).message)).finally(() => force(x => x + 1))
  return (
    <details className="fa-links">
      <summary><LinkIcon />{T.links}<svg className="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></summary>
      <ul>
        {live.map(l => { const n = inbox.list.filter(s => s.token === l.token).length; return (
          <li key={l.token}>
            <span className="nm">{l.label || T.linkAll}</span>
            <span className="gp-span">{T.until(new Date(l.expires_at).toLocaleDateString(loc(), { day: 'numeric', month: 'long' }))}{n ? ' · ' + T.answers(n) : ''}</span>
            <span className="fa-btns"><a className="btn sm ghost" href={linkUrl(l.token)} target="_blank" rel="noopener">{T.view}</a><button type="button" className="btn sm ghost" onClick={() => run(closeLink(l.token).then(() => toast(T.closedToast)))}>{T.close}</button></span>
          </li>) })}
      </ul>
    </details>
  )
}
