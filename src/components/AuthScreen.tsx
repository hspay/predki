import { useMemo, useState, type FormEvent } from 'react'
import { predkiLogo } from '../lib/logo'
import { t, LANG, cloud, continueWithoutAccount, bump } from '../lib/core'
import { signInGoogle, signInEmail, signUpEmail, resetPassword, setNewPassword, authError } from '../lib/cloud'

type Mode = 'in' | 'up' | 'reset' | 'sent' | 'newpass'
const G = <svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>

/** Sign in before the tree opens: Google or email + password. Also shows «loading your tree» and the new-password step after a reset link. */
export default function AuthScreen({ loading = false }: { loading?: boolean }) {
  const logo = useMemo(() => predkiLogo(), [])
  const [mode, setMode] = useState<Mode>(cloud.recovery ? 'newpass' : 'in')
  const [email, setEmail] = useState(''); const [pass, setPass] = useState('')
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const go = (m: Mode) => { setMode(m); setErr('') }
  const fail = (e: unknown) => setErr(authError(e as { message?: string }, LANG))

  const google = async () => { setBusy(true); setErr(''); const { error } = await signInGoogle().catch(e => ({ error: e })); if (error) { fail(error); setBusy(false) } }
  const submit = async (e: FormEvent) => {
    e.preventDefault(); if (busy) return; setErr('')
    const em = email.trim()
    if (mode !== 'newpass' && !/^\S+@\S+\.\S+$/.test(em)) return setErr(authError({ message: 'valid email' }, LANG))
    if ((mode === 'up' || mode === 'newpass') && pass.length < 6) return setErr(authError({ message: 'password at least' }, LANG))
    setBusy(true)
    try {
      if (mode === 'in') { const { error } = await signInEmail(em, pass); if (error) throw error }
      else if (mode === 'up') { const { data, error } = await signUpEmail(em, pass); if (error) throw error; if (!data.session) go('sent') }
      else if (mode === 'reset') { const { error } = await resetPassword(em); if (error) throw error; go('sent') }
      else if (mode === 'newpass') { const { error } = await setNewPassword(pass); if (error) throw error; cloud.recovery = false; bump() }
    } catch (x) { fail(x) }
    setBusy(false)
  }

  if (loading) return (
    <div id="auth"><div className="au-card au-loading" aria-live="polite">
      <span className="au-mark" dangerouslySetInnerHTML={{ __html: logo }} /><span className="au-spin" /><p>{t('auth.loading')}</p>
    </div></div>
  )

  const head = mode === 'reset' ? [t('auth.reset.h'), t('auth.reset.p')] : mode === 'sent' ? [t('auth.sent.h'), t('auth.sent.p', { email: email.trim() })] : mode === 'newpass' ? [t('auth.newpass.h'), t('auth.newpass.p')] : [t('auth.h'), t('auth.p')]
  return (
    <div id="auth">
      <div className="au-card" role="dialog" aria-modal="true" aria-labelledby="auTitle">
        <div className="au-brand"><span className="au-mark" dangerouslySetInnerHTML={{ __html: logo }} /><b>Predki</b></div>
        <div className="au-head"><h1 id="auTitle">{head[0]}</h1><p>{head[1]}</p></div>

        {(mode === 'in' || mode === 'up') && <>
          <button type="button" className="au-google" onClick={google} disabled={busy}>{G}<span>{t('auth.google')}</span></button>
          <div className="au-or"><span>{t('auth.or')}</span></div>
          <div className="au-seg" role="tablist">
            <button type="button" role="tab" aria-selected={mode === 'in'} onClick={() => go('in')}>{t('auth.in')}</button>
            <button type="button" role="tab" aria-selected={mode === 'up'} onClick={() => go('up')}>{t('auth.up')}</button>
          </div>
        </>}

        {mode !== 'sent' && <form className="au-form" onSubmit={submit} noValidate>
          {mode !== 'newpass' && <div className="au-field"><label htmlFor="auEmail">{t('auth.email')}</label>
            <input id="auEmail" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} /></div>}
          {mode !== 'reset' && <div className="au-field"><label htmlFor="auPass">{t('auth.pass')}</label>
            <input id="auPass" type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} placeholder={mode === 'in' ? '' : t('auth.pass.ph')} value={pass} onChange={e => setPass(e.target.value)} /></div>}
          {err && <p className="au-err" role="alert">{err}</p>}
          <button type="submit" className="btn primary au-submit" disabled={busy}>
            {busy && <span className="au-spin sm" />}{t(mode === 'in' ? 'auth.submit.in' : mode === 'up' ? 'auth.submit.up' : mode === 'reset' ? 'auth.reset.send' : 'auth.newpass.save')}
          </button>
          {mode === 'in' && <button type="button" className="au-link" onClick={() => go('reset')}>{t('auth.forgot')}</button>}
          {mode === 'reset' && <button type="button" className="au-link" onClick={() => go('in')}>← {t('auth.back')}</button>}
        </form>}
        {mode === 'sent' && <button type="button" className="btn au-submit" onClick={() => go('in')}>{t('auth.sent.back')}</button>}

        {(mode === 'in' || mode === 'up') && <p className="au-legal">{t('auth.legal.a')} <a href="privacy.html" target="_blank" rel="noopener">{t('auth.legal.b')}</a></p>}
        {(mode === 'in' || mode === 'up') && <div className="au-skip">
          <button type="button" className="au-link" onClick={continueWithoutAccount}>{t('auth.skip')}</button><small>{t('auth.skip.p')}</small>
        </div>}
      </div>
    </div>
  )
}
