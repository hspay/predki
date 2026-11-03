import { Component, type ReactNode } from 'react'
import { LANG, ui, bump } from '../lib/core'
import { logProblem } from '../lib/problems'

/** One page (or the profile panel) that breaks no longer takes the whole app down with it: the rest keeps working,
 *  the page offers to draw itself again, and the error comes to us with its stack (Supabase → problems). */
export default class PageGuard extends Component<{ name: string; children: ReactNode; small?: boolean; resetKey?: string; root?: boolean }, { err: boolean }> {
  state = { err: false }
  static getDerivedStateFromError() { return { err: true } }
  componentDidCatch(e: unknown) { logProblem('render:' + this.props.name, e, true) }
  /** another person opened in the panel: try again */
  componentDidUpdate(prev: { resetKey?: string }) { if (this.state.err && prev.resetKey !== this.props.resetKey) this.setState({ err: false }) }
  /** the whole app (root) can only start over: the page reloads; a part draws itself again */
  retry = () => { if (this.props.root) { location.reload(); return } ui.treeRefit++; ui.mapRefit++; this.setState({ err: false }); bump() }
  render() {
    if (!this.state.err) return this.props.children
    const ru = LANG !== 'en'
    return (
      <div className={'page-err' + (this.props.small ? ' small' : '') + (this.props.root ? ' root' : '')} role="alert">
        <b>{ru ? 'Не получилось показать эту часть' : 'This part could not be shown'}</b>
        <span>{ru ? 'Данные на\u00A0месте, ничего не\u00A0потерялось. Мы получили отчёт об\u00A0ошибке.' : 'Your data is safe. We have received an error report.'}</span>
        <button type="button" className="btn sm" onClick={this.retry}>{this.props.root ? (ru ? 'Обновить страницу' : 'Reload the page') : ru ? 'Показать снова' : 'Show again'}</button>
      </div>
    )
  }
}
