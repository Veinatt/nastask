import { AppErrorBoundary } from '@/components/AppErrorBoundary'
import { AppLayout } from '@/components/layout/AppLayout'
import { AppTabProvider } from '@/components/layout/AppTabContext'

export default function App() {
  return (
    <AppErrorBoundary>
      <AppTabProvider>
        <div className="app-shell min-h-dvh min-h-[100vh]">
          <AppLayout />
        </div>
      </AppTabProvider>
    </AppErrorBoundary>
  )
}
