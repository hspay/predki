// Look of a family's tree: background theme, family title above the tree, dashed places for unknown ancestors.
import { LANG } from './i18n'

export interface Theme { k: string; ru: string; en: string; fog: [number, number, number]; light?: boolean }
export const THEMES: Theme[] = [
  { k: 'night', ru: 'Ночь', en: 'Night', fog: [200, 210, 240] },
  { k: 'amber', ru: 'Янтарь', en: 'Amber', fog: [250, 225, 195] },
  { k: 'pastel', ru: 'Пастель', en: 'Pastel', fog: [255, 250, 252], light: true },
  { k: 'steel', ru: 'Сталь', en: 'Steel', fog: [215, 225, 235] },
  { k: 'rose', ru: 'Роза', en: 'Rose', fog: [235, 200, 215] },
]
export const themeOf = (k?: string) => THEMES.find(t => t.k === k) || THEMES[0]
export const themeName = (t: Theme) => (LANG === 'en' ? t.en : t.ru)

// ---- Russian surname forms
export const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)
export const mascSurname = (s: string) => s.replace(/(ов|ев|ёв|ин|ын)а$/i, '$1').replace(/ская$/i, 'ский').replace(/цкая$/i, 'цкий')
export const femSurname = (s: string) => /(ов|ев|ёв|ин|ын)$/i.test(s) ? s + 'а' : /(ский|цкий)$/i.test(s) ? s.replace(/ий$/i, 'ая') : s
/** «Ветрова» → «Ветровы», «Брызгалин» → «Брызгалины», «Вишневская» → «Вишневские»; in English: «The Smith family». */
export function familyTitle(last: string) {
  last = cap(last.trim()); if (!last) return ''
  if (LANG === 'en' || !/[а-яё]/i.test(last)) return LANG === 'en' ? `The ${last} family` : last
  const m = mascSurname(last)
  return /(ов|ев|ёв|ин|ын)$/i.test(m) ? m + 'ы' : /(ский|цкий)$/i.test(m) ? m.replace(/ий$/i, 'ие') : m
}
