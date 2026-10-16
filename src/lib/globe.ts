// The Predki mark: a desk globe whose stand is a trunk with roots. One colour, no gradient; in the app its meridian turns slowly.
/** SVG markup of the globe (stroke only). size = rendered width in px; the box is 200×220. */
export function globeSvg(color = '#F4F2EC', size = 30, animated = false) {
  const h = Math.round(size * 1.1)
  return `<svg class="globe${animated ? ' turning' : ''}" viewBox="0 0 200 220" width="${size}" height="${h}" aria-hidden="true">`
    + `<g fill="none" stroke="${color}" stroke-width="14" stroke-linecap="round"><circle cx="100" cy="86" r="64"/>`
    + `<g transform="rotate(-23 100 86)"><ellipse class="mer" cx="100" cy="86" rx="27" ry="64"/><ellipse class="mer2" cx="100" cy="86" rx="46" ry="64" stroke-width="9"/><path d="M36 86H164"/></g>`
    + `<path d="M100 150V196M100 186C92 196 80 202 66 204M100 186C108 196 120 202 134 204"/></g></svg>`
}
/** The mark on an ultramarine tile (app icon look), as an SVG string with its own size. */
export function globeTile(px = 1024) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${px}" height="${px}"><rect width="100" height="100" rx="24" fill="#2533FF"/>`
    + `<g transform="translate(22 18) scale(.28)"><g fill="none" stroke="#F4F2EC" stroke-width="14" stroke-linecap="round"><circle cx="100" cy="86" r="64"/>`
    + `<g transform="rotate(-23 100 86)"><ellipse cx="100" cy="86" rx="27" ry="64"/><ellipse cx="100" cy="86" rx="46" ry="64" stroke-width="9" opacity=".5"/><path d="M36 86H164"/></g>`
    + `<path d="M100 150V196M100 186C92 196 80 202 66 204M100 186C108 196 120 202 134 204"/></g></g></svg>`
}
/** A crisp static mark for small sizes: one meridian, bolder strokes (the second, thinner meridian blurs below ~40 px). */
export function globeMark(color = '#F4F2EC', size = 22) {
  const h = Math.round(size * 1.1)
  return `<svg viewBox="0 0 200 220" width="${size}" height="${h}" aria-hidden="true"><g fill="none" stroke="${color}" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"><circle cx="100" cy="86" r="62"/>`
    + `<g transform="rotate(-23 100 86)"><ellipse cx="100" cy="86" rx="26" ry="62"/><path d="M38 86H162"/></g>`
    + `<path d="M100 150V196M100 186C92 196 80 202 66 204M100 186C108 196 120 202 134 204"/></g></svg>`
}
