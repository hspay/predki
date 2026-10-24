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
/** files Storage says are not there (deleted, or in another account's folder): not asked for again for a while.
 *  Without this a missing file was asked for again after every redraw, and every answer redrew the whole tree —
 *  an endless loop that made the Tree stutter on drag and zoom and left a blank (blue) portrait. */
const missing = new Map<string, number>(), MISS_FOR = 10 * 60e3
export const isMissing = (ref?: string) => { const at = ref ? missing.get(ref) : 0; return !!at && Date.now() - at < MISS_FOR }
let onReady = () => {}
export function onMediaReady(fn: () => void) { onReady = fn }

/** Something an <img> can show right now: the file itself, or a blank pixel until its link arrives. */
export function mediaUrl(ref?: string) {
  if (!ref) return ''
  if (!isCloudRef(ref)) return ref
  if (isMissing(ref)) return BLANK
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
    const exp = Date.now() + TTL * 1000, now = Date.now()
    // the answers come in the order asked; one without a link is a file that is not there
    ;(data || []).forEach((d, i) => { if (d.signedUrl) urls.set(refs[i], { url: d.signedUrl, exp }); else missing.set(refs[i], now) })
    onReady()
  } catch { failedAt = Date.now() }
  finally { refs.forEach(r => inflight.delete(r)) }
}
export function clearMediaCache() { urls.clear(); queue.clear(); missing.clear() }

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
export async function uploadInline(data: string, personId: string, kind: string, uid = cloud.session?.user.id) {
  // uid: the account the tree belongs to — if another account signed in meanwhile (another tab), its folder is not the place
  if (!uid || cloud.session?.user.id !== uid) throw new Error('no session')
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

// ---------- deleting: only on an explicit action (delete the account, clear the whole tree), never automatically ----------
/** One folder of the bucket, page by page (Storage gives at most 1000 entries at a time). */
async function listDir(dir: string) {
  const out: { name: string; file: boolean }[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await sb.storage.from(BUCKET).list(dir, { limit: 1000, offset })
    if (error) throw error
    ;(data || []).forEach(d => out.push({ name: d.name, file: !!d.id }))
    if (!data || data.length < 1000) return out
  }
}
/** Delete every file in the account's folder: <uid>/<person>/<file>, plus any loose ones. Returns how many. */
export async function removeAllOwnFiles(uid: string) {
  if (cloud.session?.user.id !== uid) throw new Error('another account is signed in')
  const paths: string[] = []
  for (const d of await listDir(uid)) {
    if (d.file) paths.push(`${uid}/${d.name}`)
    else for (const f of await listDir(`${uid}/${d.name}`)) if (f.file) paths.push(`${uid}/${d.name}/${f.name}`)
  }
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await sb.storage.from(BUCKET).remove(paths.slice(i, i + 100))
    if (error) throw error
  }
  urls.clear()
  return paths.length
}

// ---------- export: a JSON backup carries the files themselves ----------
const blobToData = (b: Blob) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(b) })
export async function refToInline(ref: string) {
  if (!isCloudRef(ref)) return ref
  const { data, error } = await sb.storage.from(BUCKET).download(ref.slice(PREFIX.length))
  if (error || !data) throw error || new Error('download failed')
  return blobToData(data)
}

// ---------- opening and saving a file (the viewer in the person card) ----------
/** The file itself: from the private bucket, decoded from an inline data: URL, or fetched (demo pictures). */
export async function mediaBlob(ref: string): Promise<Blob> {
  if (isCloudRef(ref)) {
    const { data, error } = await sb.storage.from(BUCKET).download(ref.slice(PREFIX.length))
    if (error || !data) throw error || new Error('download failed')
    return data
  }
  if (isInline(ref)) return dataToBlob(ref)
  const r = await fetch(ref); if (!r.ok) throw new Error('download failed')
  return r.blob()
}
/** The name to save under, with the extension of what is really inside (photos are re-saved as JPEG). */
export function fileName(name: string, type: string) {
  const ext = EXT[type], base = (name || 'file').replace(/\.[A-Za-z0-9]{1,5}$/, '') || 'file'
  return ext ? `${base}.${ext}` : name || 'file'
}
/** Save to the device: Downloads on a computer, the share/files sheet on a phone. */
export async function downloadMedia(ref: string, name: string) {
  const blob = await mediaBlob(ref), url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = fileName(name, blob.type)
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60e3)
}
