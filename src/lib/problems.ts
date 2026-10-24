// «Сообщить о проблеме» and the error log. Reports go to the public.problems table through report_problem()
// (supabase/account-and-problems.sql); you read them in Supabase → Table Editor → problems.
// What a report carries: the text, the page, the browser and screen, and the last errors of this visit.
// Never the tree itself: no names, dates, photos or notes.
import { sb, cloud } from './cloud'
import { CHANGELOG } from './changelog'

type Entry = { at: string; where: string; msg: string; stack?: string }
const recent: Entry[] = []
/** filled in by core.ts: where the person is in the app, without the tree's content */
let context: () => Record<string, unknown> = () => ({})
export function setProblemContext(fn: () => Record<string, unknown>) { context = fn }

// errors that say nothing about Predki: browser extensions, the network dropping, a known harmless browser warning
const NOISE = /ResizeObserver loop|^Script error\.?$|extension:\/\/|Failed to fetch|Load failed|NetworkError|network error|timeout|AbortError/i
// only the live site sends automatic reports: not localhost or a test build
const LIVE = /(^|\.)(predki\.me|hspay\.github\.io)$/.test(location.hostname)

const text = (e: unknown) => e instanceof Error ? `${e.name}: ${e.message}` : typeof e === 'string' ? e : (() => { try { return JSON.stringify(e) } catch { return String(e) } })()
const stackOf = (e: unknown) => e instanceof Error && e.stack ? e.stack.slice(0, 1500) : undefined

/** Note an error. send = also report it automatically (once per message, at most 5 a visit). */
export function logProblem(where: string, e: unknown, send = false) {
  const entry: Entry = { at: new Date().toISOString(), where, msg: text(e).slice(0, 500), stack: stackOf(e) }
  recent.push(entry); if (recent.length > 20) recent.shift()
  if (send) sendAuto(entry)
}

function details(): Record<string, unknown> {
  let ctx: Record<string, unknown> = {}
  try { ctx = context() } catch { /* the app is half-broken: send what we have */ }
  return {
    app: CHANGELOG[0]?.date || '', page: location.pathname + location.hash.replace(/=.*/, ''), // no query: a relative's link token stays private
    browser: navigator.userAgent, screen: `${innerWidth}×${innerHeight}`, deviceLang: navigator.language, online: navigator.onLine,
    signedIn: !!cloud.session, ...ctx, recent: recent.slice(-10),
  }
}

let sent = 0
const sentMsgs = new Set<string>()
async function sendAuto(e: Entry) {
  if (!LIVE || sent >= 5 || sentMsgs.has(e.msg) || NOISE.test(e.msg)) return
  sent++; sentMsgs.add(e.msg)
  try { await sb.rpc('report_problem', { p_kind: 'auto', p_message: `[${e.where}] ${e.msg}`, p_contact: '', p_details: details() }) } catch { /* nothing more to do */ }
}

/** The person's own report from Settings. Throws if it could not be sent. */
export async function sendReport(message: string, contact = '') {
  const { error } = await sb.rpc('report_problem', { p_kind: 'user', p_message: message.trim().slice(0, 4000), p_contact: contact.trim().slice(0, 200), p_details: details() })
  if (error) throw error
}

/** Errors nobody caught: the page broke somewhere. Reported automatically. */
export function watchErrors() {
  addEventListener('error', ev => { if (ev.error || ev.message) logProblem('page', ev.error || ev.message, true) })
  addEventListener('unhandledrejection', ev => logProblem('promise', ev.reason, true))
}
