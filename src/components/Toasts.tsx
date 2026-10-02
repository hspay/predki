import { ui } from '../lib/core'

export default function Toasts() {
  return (
    <div className="toasts" id="toasts">
      {ui.toasts.map(x => (
        <div key={x.id} className={'toast ' + (x.kind || '')}>
          {x.kind === 'ach' && <svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" /></svg>}
          <span>{x.msg}</span>
        </div>
      ))}
    </div>
  )
}
