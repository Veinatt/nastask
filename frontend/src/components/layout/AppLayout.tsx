import { useEffect, useRef, useState } from 'react'
import { Navigation } from './Navigation'
import { SyncStatusBanner } from '@/components/layout/SyncStatusBanner'
import { NAV_ROUTES } from '@/components/layout/navItems'
import { useAppTab } from '@/components/layout/AppTabContext'
import { useSplashDone } from '@/components/splash/SplashDoneContext'
import { useSync } from '@/hooks/useSync'
import { useTelegram } from '@/hooks/useTelegram'
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation'
import { HomePage } from '@/pages/HomePage'
import { StatsPage } from '@/pages/StatsPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { cn } from '@/lib/utils'

function TabPage({ tab }: { tab: (typeof NAV_ROUTES)[number] }) {
  switch (tab) {
    case '/stats':
      return <StatsPage />
    case '/reports':
      return <ReportsPage />
    case '/settings':
      return <SettingsPage />
    case '/':
    default:
      return <HomePage />
  }
}

export function AppLayout() {
  useTelegram()
  useSync()
  const { tab } = useAppTab()
  const splashDone = useSplashDone()
  const mainRef = useRef<HTMLElement>(null)
  useSwipeNavigation(mainRef)

  const skipFirstPageIn = useRef(true)
  const [pageIn, setPageIn] = useState(false)

  useEffect(() => {
    if (!splashDone) {
      setPageIn(false)
      return
    }
    if (skipFirstPageIn.current) {
      skipFirstPageIn.current = false
      setPageIn(false)
      return
    }
    setPageIn(true)
  }, [tab, splashDone])

  return (
    <div className="min-h-dvh flex flex-col">
      <Navigation />
      <SyncStatusBanner />
      <main
        ref={mainRef}
        className="mx-auto w-full min-w-0 max-w-6xl flex-1 overflow-x-clip px-4 py-5 md:px-6 md:py-8 md:pb-10 touch-pan-y"
        style={{
          paddingBottom:
            'calc(5.5rem + var(--tg-safe-area-inset-bottom, 0px) + var(--tg-content-safe-area-inset-bottom, 0px))',
        }}
      >
        <div key={tab} className={cn('min-w-0', pageIn && 'animate-page-in')}>
          <TabPage tab={tab} />
        </div>
      </main>
    </div>
  )
}
