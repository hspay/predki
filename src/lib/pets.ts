// @ts-nocheck — pet data and line icons, ported from the «Питомцы в Древе» preview
// Pets in the Tree: a round badge on the owner's card. One owner per pet; name, kind and years only.
// Pets stay out of the statistics, the stickers and the passport for now.
import { S, LANG, uid, commit } from './core'

export type PetKind = string
export interface Pet { id: string; name: string; kind: PetKind; born: string; died: string; owner: string }

// the most common pets; anything else is «Другое»
export const KINDS = [
  ['dog','Собака','Dog'],['cat','Кошка','Cat'],['parrot','Попугай','Parrot'],['canary','Канарейка','Canary'],['hamster','Хомяк','Hamster'],
  ['guinea','Морская свинка','Guinea pig'],['rabbit','Кролик','Rabbit'],['rat','Крыса','Rat'],['chinchilla','Шиншилла','Chinchilla'],
  ['ferret','Хорёк','Ferret'],['fish','Рыбки','Fish'],['turtle','Черепаха','Turtle'],['lizard','Ящерица','Lizard'],['snake','Змея','Snake'],
  ['hedgehog','Ёж','Hedgehog'],['horse','Лошадь','Horse'],['other','Другое','Other'],
]
export const kindName = k => { const r = KINDS.find(x => x[0] === k) || KINDS[KINDS.length - 1]; return LANG === 'en' ? r[2] : r[1] }
// simple line drawings until the real pet portraits are made (24×24, drawn with a stroke)
export const ICON = {
  dog:'<path d="M8 8.5c-1.6-.4-3.4.6-3.8 3.4-.2 1.6.8 2.4 1.8 1.6M16 8.5c1.6-.4 3.4.6 3.8 3.4.2 1.6-.8 2.4-1.8 1.6"/><path d="M8 8.5c1-1.6 2.4-2.3 4-2.3s3 .7 4 2.3c.6 1 .8 2.4.8 3.9 0 3.5-2.2 5.6-4.8 5.6s-4.8-2.1-4.8-5.6c0-1.5.2-2.9.8-3.9z"/><circle cx="10" cy="11.3" r=".6"/><circle cx="14" cy="11.3" r=".6"/><path d="M11 14.2h2l-1 1z"/>',
  cat:'<path d="M6.5 11V4.8l3.3 2.6h4.4l3.3-2.6V11c0 4-2.5 7-5.5 7s-5.5-3-5.5-7z"/><circle cx="10" cy="11.4" r=".6"/><circle cx="14" cy="11.4" r=".6"/><path d="M11.2 13.6h1.6l-.8.8zM12 14.4v1M4 13.5l3.5.4M4.4 15.5l3.2-.4M20 13.5l-3.5.4M19.6 15.5l-3.2-.4"/>',
  parrot:'<path d="M9 19c-2.4-3.4-2.2-9 1.6-11.4 2-1.3 4.6-1 5.8.8l2.4 1.4-2.6.8c.2 4.2-2 7.6-7.2 8.4z"/><circle cx="13.6" cy="9.6" r=".6"/><path d="M9 19l-1 2.4M11 18.6l.2 2.6M10.6 12.5c1.2 1.4 1.4 3.4.6 5"/>',
  canary:'<path d="M5 13c0-3 2.4-5.4 5.4-5.4 1.6 0 2.6-1.6 4.6-1.6 1.8 0 3 1.2 3 2.6l2 .8-2 .8c0 4.2-3.4 6.8-7.4 6.8H5l-2 2"/><circle cx="15.4" cy="8.8" r=".6"/><path d="M8 12c1.8 0 3.6 1 4.2 2.8"/>',
  hamster:'<ellipse cx="12" cy="13.2" rx="6.6" ry="5.4"/><circle cx="7.2" cy="8.4" r="1.6"/><circle cx="16.8" cy="8.4" r="1.6"/><circle cx="10" cy="12.4" r=".6"/><circle cx="14" cy="12.4" r=".6"/><path d="M11.4 14.4h1.2l-.6.6z"/>',
  guinea:'<path d="M4.5 14.5c0-3.8 3.4-6.5 7.5-6.5s7.5 2.7 7.5 6.5c0 2.2-1.6 3.5-3.5 3.5h-8c-1.9 0-3.5-1.3-3.5-3.5z"/><path d="M15.5 9c.4-1 1.4-1.4 2.2-1"/><circle cx="16" cy="12.6" r=".6"/><path d="M18.6 14.2h.9"/>',
  rabbit:'<path d="M9.6 10.4C8.6 6.6 8.6 3 9.9 3s1.9 3.4 1.6 7.4M14.4 10.4c1-3.8 1-7.4-.3-7.4s-1.9 3.4-1.6 7.4"/><ellipse cx="12" cy="14.4" rx="5" ry="4.6"/><circle cx="10.2" cy="13.8" r=".6"/><circle cx="13.8" cy="13.8" r=".6"/><path d="M11.4 15.8h1.2l-.6.6z"/>',
  rat:'<path d="M3.5 15.5c1.8-4.2 5.6-6.5 9.5-6.5 2.4 0 4.4 1.6 5.5 3.4l2 .9-2 .7c-.6 1.6-2.2 2.5-4.5 2.5H3.5z"/><circle cx="15" cy="9" r="1.6"/><circle cx="17" cy="12.4" r=".6"/><path d="M3.5 15.5c-.8 1.6-.4 3 1.4 3.4"/>',
  chinchilla:'<circle cx="8" cy="7" r="2.6"/><circle cx="16" cy="7" r="2.6"/><ellipse cx="12" cy="13.6" rx="6" ry="5.2"/><circle cx="10" cy="12.6" r=".6"/><circle cx="14" cy="12.6" r=".6"/><path d="M11.4 14.6h1.2l-.6.6zM5 14.4l3 .2M19 14.4l-3 .2"/>',
  ferret:'<path d="M2.5 17c2.6.2 4.6-.6 6.4-2 1.6-1.2 3.6-1.6 5.6-1.2l2.2-1.8c1.6-1.2 3.8-.8 4.8.8.8 1.2.2 2.6-1 3.2l-2 .6c-1.4 2-3.8 2.8-6.4 2.6-2.6-.2-4.6.4-6.6.6"/><circle cx="17" cy="10.2" r="1.2"/><circle cx="18.7" cy="13.4" r=".6"/><path d="M8.6 16.4v2.4M14.4 17.6v1.8M20.8 14.2h.9"/>',
  fish:'<path d="M3.4 12c3-4 8-5.2 12-3l4.2-3v12l-4.2-3c-4 2.2-9 1-12-3z"/><circle cx="8" cy="11.3" r=".6"/><path d="M11 9.6c.8 1.4.8 3.4 0 4.8"/>',
  turtle:'<path d="M4.5 15.5c0-4.2 3.4-7.5 7.5-7.5s7.5 3.3 7.5 7.5z"/><path d="M19.5 13.4c1.2-.6 2.4.2 2.4 1.2 0 .8-.6 1.2-1.4 1.2M7 15.5v2.2M17 15.5v2.2M9 10.4l3 2.4 3-2.4M12 12.8v2.7"/>',
  lizard:'<path d="M2.5 13.6c3 .3 5.2-.9 7.6-1.8 2-.7 3.8-.5 5.4.2 1.4.6 2.6.6 3.8.2l2.2-.6-1.4 1.6c-1 1.2-2.6 1.8-4.4 1.8-2 0-3.6 1-6 1.2-2.6.2-5.2-.6-7.2-2.6z"/><path d="M9.2 14.6l-1.2 2.8h-1.4M13.6 14.4l1 3h1.4M9.8 12l-1-2.4H7.6M14.8 11.8l.8-2.4h1.2"/><circle cx="18.8" cy="12.7" r=".6"/>',
  snake:'<path d="M5 18.5c3 0 4-1.4 4-3.2S7 12.6 7 10.6 8.6 7.5 11 7.5s4 1.6 4 3.6-2 2.6-2 4.4 1.2 3 3.2 3c2 0 3.4-1.4 3.4-3.6V7.6"/><path d="M18.2 7.6c.4-1.4 1.4-2.2 1.4-2.2s1 .8 1.4 2.2"/>',
  hedgehog:'<path d="M4 16c0-4.4 3.4-8 8-8 2.6 0 4.6 1.2 6 3.2l2.4 1.8-2.2 1c-.6 1.4-1.8 2-3.2 2H4z"/><path d="M6 11l-1.6-1.6M8.6 9.2l-.8-2M11.4 8.4V6.2M14.2 8.8l.8-2M16.4 10.2l1.6-1.4"/><circle cx="17.2" cy="12.4" r=".6"/>',
  horse:'<path d="M14.6 4.4l1.2-1.8.8 2.2c2.2 1.4 3.4 3.8 3.4 6.8V20.5h-5.6l-.6-4.6-3.4-1.2c-1.4-.5-3.2-.2-4.2.4l-1.6-1.2c-.9-.7-1-1.8-.2-2.6l5.2-5.6c1.4-1.4 3.2-1.8 5-1.3z"/><path d="M16.6 4.8c1.6 1.8 2 4.2 1.6 6.6M15 6.2c1 1.6 1.2 3.4.8 5.2"/><circle cx="12" cy="8.6" r=".7"/><circle cx="6.6" cy="12.4" r=".5"/>',
  other:'<circle cx="7" cy="9.4" r="1.7"/><circle cx="10.4" cy="6.4" r="1.7"/><circle cx="13.6" cy="6.4" r="1.7"/><circle cx="17" cy="9.4" r="1.7"/><path d="M12 11.4c2.6 0 4.6 2.6 4.6 4.6 0 1.6-1.2 2.4-2.4 2.4-.9 0-1.4-.5-2.2-.5s-1.3.5-2.2.5c-1.2 0-2.4-.8-2.4-2.4 0-2 2-4.6 4.6-4.6z"/>',
};
export const petIcon = k => ICON[k] || ICON.other

export const petsOf = (owner: string): Pet[] => (S.pets || []).filter(p => p.owner === owner)
export const petById = (id: string): Pet | undefined => (S.pets || []).find(p => p.id === id)
export const petYears = (p: Pet) => (p.born || p.died ? `${p.born || '…'}${p.died ? ' – ' + p.died : ''}` : '')
/** where a person's pets sit on their card (152×152): the 1st and 2nd from the right corner, the 3rd and 4th from the left one
 *  (the years stay visible longest), the 5th in the middle; from the 6th a new row starts under the card, in the same order */
export function petSpot(k: number) { const X = [138, 107, 14, 45, 76]; return [X[k % 5], 146 + Math.floor(k / 5) * 33] }
export const PET_R = 17

export function savePet(d: { id?: string; name: string; kind: string; born: string; died: string; owner: string }): Pet {
  S.pets = S.pets || []
  let p = d.id ? petById(d.id) : undefined
  if (p) Object.assign(p, { name: d.name, kind: d.kind, born: d.born, died: d.died })
  else { p = { id: uid(), name: d.name, kind: d.kind, born: d.born, died: d.died, owner: d.owner }; S.pets.push(p) }
  commit(); return p
}
export function removePet(id: string) { S.pets = (S.pets || []).filter(p => p.id !== id); commit() }
