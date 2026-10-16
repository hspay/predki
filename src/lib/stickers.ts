/// <reference types="vite/client" />
// Album stickers (one per achievement): the sticker itself and its dotted outline for the empty place on the page.
// Basic set for now; final illustrations replace these files one by one under the same names.
const files = import.meta.glob('../assets/stickers/*.webp', { eager: true, import: 'default' }) as Record<string, string>
const SRC: Record<string, string> = Object.fromEntries(Object.entries(files).map(([path, url]) => [path.split('/').pop()!.replace('.webp', ''), url]))
export const stickerSrc = (id: string) => SRC[id] || ''
export const outlineSrc = (id: string) => SRC[id + '-o'] || ''
