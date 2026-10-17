// Small copies of family photos for the places that show them small (Tree cards, round avatars in lists).
// A photo is kept up to 900 px; drawn into a 56 px circle on every frame of a drag, it made the Tree lag
// (Safari especially). The copy is made once per picture, in memory only, and the original is used until it is ready.
const SIZE = 160
const cache = new Map<string, string>(), busy = new Set<string>()
let onReady = () => {}
export function onThumbReady(fn: () => void) { onReady = fn }

/** a light square copy of a photo (cropped to the centre), or the photo itself while the copy is being made */
export function thumb(src: string) {
  if (!src || src.length < 200 && src.startsWith('data:')) return src // the blank pixel shown while a link is on its way
  const c = cache.get(src); if (c) return c
  if (!busy.has(src) && typeof document !== 'undefined') { busy.add(src); make(src) }
  return src
}
async function make(src: string) {
  try {
    const img = new Image(); img.decoding = 'async'
    if (!src.startsWith('data:') && !src.startsWith('blob:')) img.crossOrigin = 'anonymous' // signed links from Storage allow it
    img.src = src; await img.decode()
    const s = Math.min(img.naturalWidth, img.naturalHeight); if (!s) return
    if (s <= SIZE * 1.3) { cache.set(src, src); return } // already small
    const cv = document.createElement('canvas'); cv.width = cv.height = SIZE
    const x = cv.getContext('2d')!; x.imageSmoothingQuality = 'high'
    x.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, SIZE, SIZE)
    cache.set(src, cv.toDataURL('image/jpeg', .86)); onReady()
  } catch { cache.set(src, src) } // a picture that cannot be copied (no CORS) stays as it is
}
