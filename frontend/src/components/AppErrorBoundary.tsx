import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

/** Prevents a blank Telegram WebView when a render error occurs. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[app-error]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-dvh flex flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-lg font-semibold">Ошибка загрузки</p>
          <pre className="max-w-full overflow-auto rounded-lg bg-muted p-3 text-left text-[11px] text-destructive">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
            onClick={() => window.location.reload()}
          >
            Обновить
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
