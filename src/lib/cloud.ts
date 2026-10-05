// Predki cloud: Supabase accounts + one row per user in public.trees holding the whole family document.
// This module knows nothing about the app state — core.ts decides what to pull and push.
import { createClient, type Session } from '@supabase/supabase-js'

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
  /** the cloud copy was read at least once this session: only then is pushing safe */
  synced: false,
  /** came back from a «reset password» email: ask for a new password */
  recovery: false,
  offline: false,
  /** first load of the account's tree is in progress */
  busy: false,
}
export function setSkipped(v: boolean) { cloud.skipped = v; try { v ? localStorage.setItem(SKIP_KEY, '1') : localStorage.removeItem(SKIP_KEY) } catch { /* private mode */ } }

const withTimeout = <T,>(p: PromiseLike<T>, ms: number) => Promise.race([Promise.resolve(p), new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))])
const here = () => location.origin + location.pathname

/** Session from storage or from the ?code= the provider sent us back with. */
export async function initSession() {
  try { const { data } = await withTimeout(sb.auth.getSession(), 8000); cloud.session = data.session } catch { cloud.session = null }
  if (/[?&](code|error)=/.test(location.search)) history.replaceState(null, '', location.pathname + location.hash)
  if (cloud.session) setSkipped(false)
  return cloud.session
}

export async function pullTree(): Promise<{ data: any; at: number } | null> {
  const uid = cloud.session?.user.id; if (!uid) return null
  const { data, error } = await withTimeout(sb.from('trees').select('data, updated_at').eq('user_id', uid).maybeSingle(), 10000)
  if (error) throw error
  return data ? { data: data.data, at: Date.parse(data.updated_at) || 0 } : null
}
/** Save the whole document; returns the moment it was stamped with (ms). */
export async function pushTree(doc: unknown) {
  const uid = cloud.session?.user.id; if (!uid) return 0
  const at = new Date()
  const { error } = await withTimeout(sb.from('trees').upsert({ user_id: uid, data: doc, updated_at: at.toISOString() }), 20000)
  if (error) throw error
  return +at
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
  if (m.includes('already registered') || e?.code === 'user_already_exists') return ru ? 'Такой аккаунт уже есть — войдите' : 'This account already exists — sign in'
  if (m.includes('not confirmed')) return ru ? 'Подтвердите почту: ссылка в письме от Predki' : 'Confirm your email first: the link is in our message'
  if (m.includes('password') && (m.includes('at least') || m.includes('weak'))) return ru ? 'Пароль слишком простой: минимум 6 символов' : 'Password is too weak: at least 6 characters'
  if (m.includes('rate limit') || e?.status === 429) return ru ? 'Слишком много попыток. Попробуйте чуть позже' : 'Too many attempts. Try again a bit later'
  if (m.includes('valid email') || m.includes('invalid format')) return ru ? 'Проверьте адрес почты' : 'Check the email address'
  if (m.includes('fetch') || m.includes('network') || m.includes('timeout')) return ru ? 'Нет связи с сервером. Проверьте интернет или включите VPN' : 'Cannot reach the server. Check your connection'
  return e?.message || (ru ? 'Что-то пошло не так' : 'Something went wrong')
}
