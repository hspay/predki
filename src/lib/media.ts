// Predki files in Supabase Storage. Photos and documents live in the private «media» bucket;
// the tree keeps only a reference «sb:<user id>/<person id>/<file id>.<ext>».
// A file that is not uploaded yet (no account, offline) stays inline in the tree as a data: URL.
import { sb, cloud } from './cloud'

const BUCKET = 'media', PREFIX = 'sb:'
const TTL = 3600 // seconds a signed link stays valid
/** transparent pixel shown while a signed link is on its way */
export const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
export const isCloudRef = (v?: string) => !!v && v.startsWith(PREFIX)
export const isInline = (v?: string) => !!v && v.startsWith('data:')

// ---------- showing: private files open through short-lived signed links, remembered for the session ----------
const urls = new Map<string, { url: string; exp: number }>()
const queue = new Set<string>(), inflight = new Set<string>()
let timer: ReturnType<typeof setTimeout> | null = null, failedAt = 0
let onReady = () => {}
export function onMediaReady(fn: () => void) { onReady = fn }

/** Something an <img> can show right now: the file itself, or a blank pixel until its link arrives. */
export function mediaUrl(ref?: string) {
  if (!ref) return ''
  if (!isCloudRef(ref)) return ref
  const c = urls.get(ref)
  if (c && c.exp - Date.now() > 5 * 60e3) return c.url
  if (cloud.session && !inflight.has(ref) && Date.now() - failedAt > 30e3) { queue.add(ref); if (!timer) timer = setTimeout(signQueued, 20) }
  return c ? c.url : BLANK
}
async function signQueued() {
  timer = null; const refs = [...queue]; queue.clear(); if (!refs.length) return
  refs.forEach(r => inflight.add(r))
  try {
    const { data, error } = await sb.storage.from(BUCKET).createSignedUrls(refs.map(r => r.slice(PREFIX.length)), TTL)
    if (error) throw error
    const exp = Date.now() + TTL * 1000
    ;(data || []).forEach((d, i) => { if (d.signedUrl) urls.set(d.path ? PREFIX + d.path : refs[i], { url: d.signedUrl, exp }) })
    onReady()
  } catch { failedAt = Date.now() }
  finally { refs.forEach(r => inflight.delete(r)) }
}
export function clearMediaCache() { urls.clear(); queue.clear() }

// ---------- uploading ----------
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/heic': 'heic', 'application/pdf': 'pdf' }
function dataToBlob(d: string) {
  const i = d.indexOf(','); const head = d.slice(0, i), body = d.slice(i + 1)
  const mime = (head.match(/^data:([^;,]+)/) || [])[1] || 'application/octet-stream'
  const bin = head.includes(';base64') ? atob(body) : decodeURIComponent(body)
  const u = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k++) u[k] = bin.charCodeAt(k)
  return new Blob([u], { type: mime })
}
const safe = (s: string) => s.replace(/[^A-Za-z0-9_-]/g, '') || 'x'

/** Short fingerprint of the file: the same picture always gets the same name, so it is never stored twice. */
async function fingerprint(data: string) {
  try {
    const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data)))
    return Array.from(h.slice(0, 8), b => b.toString(16).padStart(2, '0')).join('')
  } catch { return Math.random().toString(36).slice(2, 12) }
}
/** Upload an inline file into the user's folder; returns its reference for the tree. kind: avatar | photo | doc */
export async function uploadInline(data: string, personId: string, kind: string) {
  const uid = cloud.session?.user.id; if (!uid) throw new Error('no session')
  const blob = dataToBlob(data)
  const path = `${uid}/${safe(personId)}/${safe(kind)}-${await fingerprint(data)}.${EXT[blob.type] || 'bin'}`
  const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: blob.type, upsert: true, cacheControl: '31536000' })
  if (error) throw error
  const ref = PREFIX + path
  urls.set(ref, { url: data, exp: Number.MAX_SAFE_INTEGER }) // we already have the picture: no need to download it back
  return ref
}
/** The bucket refused this file for good (type or size), so retrying will not help. */
export function isPermanent(e: unknown) {
  const x = e as { statusCode?: string | number; status?: number; message?: string } | null
  const s = String(x?.statusCode || x?.status || ''); const m = (x?.message || '').toLowerCase()
  return ['400', '413', '415'].includes(s) || /mime|too large|exceed|maximum allowed size|not allowed/.test(m)
}

// ---------- deleting ----------
export async function removeRefs(refs: string[]) {
  const uid = cloud.session?.user.id; if (!uid) return
  const paths = refs.filter(isCloudRef).map(r => r.slice(PREFIX.length)).filter(p => p.startsWith(uid + '/'))
  refs.forEach(r => urls.delete(r))
  if (!paths.length) return
  try { await sb.storage.from(BUCKET).remove(paths) } catch { /* an orphan file is harmless; it just takes space */ }
}

/** Every file in the user's folder with its upload time — to find files the tree no longer uses. */
export async function listOwnFiles() {
  const uid = cloud.session?.user.id; if (!uid) return []
  const out: { ref: string; at: number }[] = []
  const { data: dirs, error } = await sb.storage.from(BUCKET).list(uid, { limit: 1000 })
  if (error) throw error
  for (const d of dirs || []) {
    if (d.id) continue // a loose file, not a person's folder
    const { data: files, error: e2 } = await sb.storage.from(BUCKET).list(`${uid}/${d.name}`, { limit: 1000 })
    if (e2) throw e2
    ;(files || []).forEach(f => { if (f.id) out.push({ ref: `${PREFIX}${uid}/${d.name}/${f.name}`, at: Date.parse(f.created_at || '') || 0 }) })
  }
  return out
}

// ---------- export: a JSON backup carries the files themselves ----------
const blobToData = (b: Blob) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(b) })
export async function refToInline(ref: string) {
  if (!isCloudRef(ref)) return ref
  const { data, error } = await sb.storage.from(BUCKET).download(ref.slice(PREFIX.length))
  if (error || !data) throw error || new Error('download failed')
  return blobToData(data)
}
