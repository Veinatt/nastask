import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

/** Overlay on render errors so Telegram WebView is never a silent blank. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[app-error]', error, info.componentStack)
  }

  render() {
    return (
      <>
        {this.state.error ? null : this.props.children}
        {this.state.error ? (
          <div
            className="fixed inset-0 z-[200] flex items-start justify-center overflow-auto bg-slate-900/45 p-6 backdrop-blur-[4px]"
            role="alertdialog"
            aria-modal="true"
          >
            <div className="mt-[12vh] w-full max-w-lg rounded-xl bg-card p-5 text-left shadow-xl">
              <p className="text-lg font-semibold">Ошибка загрузки</p>
              <pre className="mt-3 max-w-full overflow-auto rounded-lg bg-destructive/10 p-3 text-[11px] text-destructive">
                {this.state.error.message}
              </pre>
              <button
                type="button"
                className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
                onClick={() => window.location.reload()}
              >
                Обновить
              </button>
            </div>
          </div>
        ) : null}
      </>
    )
  }
}
