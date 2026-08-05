import { AppErrorBoundary } from '@/components/AppErrorBoundary'
import { AppLayout } from '@/components/layout/AppLayout'
import { AppTabProvider } from '@/components/layout/AppTabContext'
import { SplashDoneProvider } from '@/components/splash/SplashDoneContext'

/**
 * Splash temporarily disabled: macOS Telegram WKWebView showed a permanent
 * blank beige screen (logo/morph stuck, brand title hidden via data-splash).
 * Re-enable SplashScreen only after a Mac-specific smoke test.
 */
export default function App() {
  return (
    <AppErrorBoundary>
      <SplashDoneProvider value={true}>
        <AppTabProvider>
          <div className="app-shell min-h-dvh min-h-[100vh]">
            <AppLayout />
          </div>
        </AppTabProvider>
      </SplashDoneProvider>
    </AppErrorBoundary>
  )
}
