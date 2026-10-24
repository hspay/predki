// Predki cloud: Supabase accounts + one row per user in public.trees holding the whole family document.
// This module knows nothing about the app state — core.ts decides what to pull and push.
import { createClient, type Session, type EmailOtpType } from '@supabase/supabase-js'

// Both values are public by design: access to data is guarded by Row Level Security in the database.
const SUPABASE_URL = 'https://ptdahtotkbycfbwappdn.supabase.co'
const SUPABASE_KEY = 'sb_publishable_L_uSkEpU_XP4d2cUzV6bMg_rJZNKraB'

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
})

const SKIP_KEY = 'predki:noAccount'
export const cloud = {
  session: null as Session | null,
  /** user chose «continue without an account»: the tree lives only in this browser */
  skipped: (() => { try { return localStorage.getItem(SKIP_KEY) === '1' } catch { return false } })(),
  /** the cloud copy of the account on screen was read: only then is saving to the cloud safe */
  synced: false,
  /** came back from a «reset password» email: ask for a new password */
  recovery: false,
  /** a link from our e-mail that no longer works (used already, expired, opened by a mail scanner) */
  linkError: false,
  offline: false,
  /** first load of the account's tree is in progress */
  busy: false,
}
export function setSkipped(v: boolean) { cloud.skipped = v; try { v ? localStorage.setItem(SKIP_KEY, '1') : localStorage.removeItem(SKIP_KEY) } catch { /* private mode */ } }

const withTimeout = <T,>(p: PromiseLike<T>, ms: number) => Promise.race([Promise.resolve(p), new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))])
const here = () => location.origin + location.pathname

/** Session from storage, from the ?code= Google sent us back with, or from a link in our e-mails.
 *  The e-mails link to predki.me/?token_hash=…&type=… (not to Supabase's own /verify): such a link works in any browser,
 *  not only in the one where it was asked for, and mail scanners that open links do not use it up. */
export async function initSession() {
  const q = new URLSearchParams(location.search), th = q.get('token_hash'), type = q.get('type') as EmailOtpType | null
  if (th && type) {
    try {
      const { error } = await withTimeout(sb.auth.verifyOtp({ token_hash: th, type }), 10000)
      if (error) throw error
      if (type === 'recovery') cloud.recovery = true
    } catch { cloud.linkError = true }
  }
  if (q.get('error') || /[#&]error=/.test(location.hash)) cloud.linkError = true
  try { const { data } = await withTimeout(sb.auth.getSession(), 8000); cloud.session = data.session } catch { cloud.session = null }
  if (/[?&](code|error|token_hash)=/.test(location.search) || /[#&]error=/.test(location.hash)) history.replaceState(null, '', location.pathname + (/error=/.test(location.hash) ? '' : location.hash))
  if (cloud.session) setSkipped(false)
  return cloud.session
}

/** The account's tree and its version: updated_at exactly as the database gave it, used as a token, never compared as a time. */
export type Row = { data: any; ver: string }
export async function pullTree(uid: string): Promise<Row | null> {
  const { data, error } = await withTimeout(sb.from('trees').select('data, updated_at').eq('user_id', uid).maybeSingle(), 10000)
  if (error) throw error
  return data ? { data: data.data, ver: String(data.updated_at) } : null
}
/** Save the whole document, but only over the version it was built on (ver; null = the account has no row yet).
 *  Returns the new version, or null when another window or device saved first — then nothing is written. */
export async function saveTree(uid: string, doc: unknown, ver: string | null): Promise<string | null> {
  if (cloud.session?.user.id !== uid) throw new Error('another account is signed in')
  const at = new Date().toISOString()
  if (ver === null) {
    const { data, error } = await withTimeout(sb.from('trees').insert({ user_id: uid, data: doc, updated_at: at }).select('updated_at').single(), 20000)
    if (error) { if (error.code === '23505') return null; throw error } // a row appeared meanwhile
    return String(data.updated_at)
  }
  const { data, error } = await withTimeout(sb.from('trees').update({ data: doc, updated_at: at }).eq('user_id', uid).eq('updated_at', ver).select('updated_at'), 20000)
  if (error) throw error
  return data && data.length ? String(data[0].updated_at) : null
}

/** Deleting the account happens in the database (supabase/account-and-problems.sql): it removes the tree, the links for
 *  relatives with their answers, problem reports and the account itself. really = false only checks that it is set up. */
export async function deleteAccountCloud(really: boolean) {
  const { data, error } = await withTimeout(sb.rpc('delete_my_account', { p_really: really }), 20000)
  if (error) throw error
  return String(data)
}

// ---------- sign in / up / out ----------
export const signInGoogle = () => sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: here() } })
export const signInEmail = (email: string, password: string) => sb.auth.signInWithPassword({ email, password })
export const signUpEmail = (email: string, password: string) => sb.auth.signUp({ email, password, options: { emailRedirectTo: here() } })
export const resetPassword = (email: string) => sb.auth.resetPasswordForEmail(email, { redirectTo: here() })
export const setNewPassword = (password: string) => sb.auth.updateUser({ password })
export const signOutCloud = () => sb.auth.signOut()

/** Supabase error → a calm human sentence. */
export function authError(e: { message?: string; code?: string; status?: number } | null | undefined, lang: 'ru' | 'en') {
  const m = (e?.message || '').toLowerCase(); const ru = lang !== 'en'
  if (m.includes('invalid login')) return ru ? 'Неверная почта или пароль' : 'Wrong email or password'
  if (m.includes('already registered') || e?.code === 'user_already_exists') return ru ? 'С этой почтой уже есть аккаунт — войдите. Не помните пароль? Нажмите «Забыли пароль?»' : 'This email already has an account — sign in. Forgot the password? Use «Forgot password?»'
  if (m.includes('not confirmed')) return ru ? 'Подтвердите почту: ссылка в письме от Predki' : 'Confirm your email first: the link is in our message'
  if (m.includes('password') && (m.includes('at least') || m.includes('weak'))) return ru ? 'Пароль слишком простой: минимум 6 символов' : 'Password is too weak: at least 6 characters'
  if (m.includes('rate limit') || e?.status === 429) return ru ? 'Слишком много попыток. Попробуйте чуть позже' : 'Too many attempts. Try again a bit later'
  if (m.includes('valid email') || m.includes('invalid format')) return ru ? 'Проверьте адрес почты' : 'Check the email address'
  if (m.includes('fetch') || m.includes('network') || m.includes('timeout')) return ru ? 'Нет связи с сервером. Проверьте интернет или включите VPN' : 'Cannot reach the server. Check your connection'
  return e?.message || (ru ? 'Что-то пошло не так' : 'Something went wrong')
}
