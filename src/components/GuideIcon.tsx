/** «Путеводитель»: a clipboard with a checklist; the board's top edge stops at the clip, so no lines run under it */
export const GuideIcon = () => <svg viewBox="0 0 24 24"><path d="M9 4.5H7A2.5 2.5 0 0 0 4.5 7v12A2.5 2.5 0 0 0 7 21.5h10a2.5 2.5 0 0 0 2.5-2.5V7A2.5 2.5 0 0 0 17 4.5h-2" /><rect x="9" y="3" width="6" height="3.2" rx="1" /><path d="m7.8 11.2 1.3 1.3 2.3-2.5M13.6 11.2h3M7.8 16.4l1.3 1.3 2.3-2.5M13.6 16.4h3" /></svg>

import type { ReactNode } from 'react'
import { openGuide, type GuideSection } from '../lib/guide'

/** a quiet link into «Путеводитель», right at the section that answers the question on this page */
export function GuideLink({ to, children }: { to: GuideSection; children: ReactNode }) {
  return <button type="button" className="guide-link" onClick={e => { e.stopPropagation(); openGuide(to) }}><GuideIcon /><span>{children}</span></button>
}
