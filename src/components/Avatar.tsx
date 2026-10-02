import { avatarSrc, type Person } from '../lib/core'

/** Round portrait: the family photo if there is one, otherwise the soft default silhouette. */
export default function Avatar({ p, size, id }: { p: Partial<Person>; size: number; id?: string }) {
  return (
    <span className={'avatar' + (p.avatar ? '' : ' preset')} id={id} style={{ width: size, height: size }}>
      <img src={avatarSrc(p)} alt="" />
    </span>
  )
}
