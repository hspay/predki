/// <reference types="vite/client" />
// Default portraits: soft, faceless silhouettes chosen by gender and age until the family adds a real photo.
// Age is counted at death for those who have passed; without a gender the neutral figure is used.

const files = import.meta.glob('../assets/avatars/*.webp', { eager: true, import: 'default' }) as Record<string, string>
export const PRESET_SRC: Record<string, string> = Object.fromEntries(Object.entries(files).map(([path, url]) => [path.split('/').pop()!.replace('.webp', ''), url]))

export const PRESET_TYPES = {
  girl: ['girl1', 'girl2'], boy: ['boy1', 'boy2'],
  woman: ['woman1', 'woman2', 'woman3'], man: ['man1', 'man2', 'man3'],
  oldw: ['oldw1', 'oldw2'], oldm: ['oldm1', 'oldm2'],
  neutral: ['neutral'],
} as const
export type PresetType = keyof typeof PRESET_TYPES
const ALL = Object.entries(PRESET_TYPES) as [PresetType, readonly string[]][]
export const typeOfPreset = (key?: string): PresetType | null => (key && ALL.find(([, list]) => list.includes(key))?.[0]) || null

const year = (v?: string | number | '') => { const m = String(v || '').match(/\d{4}/); return m ? +m[0] : 0 }
/** under 20 → child, 20–50 → adult, over 50 → elder; unknown birth year → adult; unknown gender → neutral */
export function presetType(p: { gender?: string; birthDate?: string | number; deathDate?: string | number }): PresetType {
  if (p.gender !== 'm' && p.gender !== 'f') return 'neutral'
  const f = p.gender === 'f', b = year(p.birthDate)
  if (!b) return f ? 'woman' : 'man'
  const age = (year(p.deathDate) || new Date().getFullYear()) - b
  return age < 20 ? (f ? 'girl' : 'boy') : age <= 50 ? (f ? 'woman' : 'man') : (f ? 'oldw' : 'oldm')
}
/** Pick a variant of the right type, avoiding the ones already worn by the given neighbours. */
export function pickPreset(type: PresetType, taken: Set<string>, rnd = Math.random) {
  const list = PRESET_TYPES[type]; const free = list.filter(v => !taken.has(v)); const pool = free.length ? free : list
  return pool[Math.floor(rnd() * pool.length)]
}
/** Stable preview for things that are not saved yet (form, archivist drafts): same input → same picture. */
export function previewPreset(p: { gender?: string; birthDate?: string | number; deathDate?: string | number; preset?: string; id?: string; first?: string; last?: string }) {
  const type = presetType(p)
  if (p.preset && typeOfPreset(p.preset) === type) return p.preset
  const list = PRESET_TYPES[type]; const s = String(p.id || '') + (p.first || '') + (p.last || '')
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return list[h % list.length]
}
