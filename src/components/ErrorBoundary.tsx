import { Component, type ReactNode } from 'react'
import type { Lang } from '../config/types'
import { uiStrings } from '../i18n'

interface State {
  failed: boolean
}

/** Last line of defence: a calm message instead of a white screen. */
export class ErrorBoundary extends Component<{ children: ReactNode; message: string; lang: Lang }, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('[birthdayverse] render error', error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="fixed inset-0 grid place-items-center bg-bg p-8 text-center">
        <div>
          <p className="font-display text-4xl text-accent">{this.props.message}</p>
          <button
            type="button"
            className="mt-8 rounded-full border border-ink/20 px-6 py-3 font-body text-sm text-ink"
            onClick={() => window.location.reload()}
          >
            {uiStrings(this.props.lang).startAgain}
          </button>
        </div>
      </div>
    )
  }
}
