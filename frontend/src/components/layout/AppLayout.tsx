import { useEffect, useRef, useState } from 'react'
import { Navigation } from './Navigation'
import { SyncStatusBanner } from '@/components/layout/SyncStatusBanner'
import { NAV_ROUTES } from '@/components/layout/navItems'
import { useAppTab } from '@/components/layout/AppTabContext'
import { useSplashDone } from '@/components/splash/SplashDoneContext'
import { useMemoryOpen } from '@/components/memory/MemoryOpenContext'
import { MemoryEnterSplash } from '@/components/memory/MemoryEnterSplash'
import { MemoryExitSplash } from '@/components/memory/MemoryExitSplash'
import { useSync } from '@/hooks/useSync'
import { useTelegram } from '@/hooks/useTelegram'
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation'
import { HomePage } from '@/pages/HomePage'
import { StatsPage } from '@/pages/StatsPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { MemoryQuizPage } from '@/pages/memory/MemoryQuizPage'
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
  const {
    gate,
    pageMounted,
    onEnterComplete,
    hideMemoryPage,
    onExitComplete,
  } = useMemoryOpen()
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

  // Like boot splash: destination stays under the overlay; chrome hidden only while
  // memory is the active screen (notebook covers full viewport).
  const hideAppChrome = gate === 'open' || (gate === 'entering' && pageMounted)

  return (
    <div className="min-h-dvh flex flex-col">
      <Navigation className={cn(hideAppChrome && 'invisible pointer-events-none')} />
      {gate === 'closed' && <SyncStatusBanner />}
      <main
        ref={mainRef}
        className={cn(
          'mx-auto w-full min-w-0 max-w-6xl flex-1 overflow-x-clip px-4 py-5 md:px-6 md:py-8 md:pb-10 touch-pan-y',
          hideAppChrome && 'invisible pointer-events-none',
        )}
        style={{
          paddingBottom:
            'calc(5.5rem + var(--tg-safe-area-inset-bottom, 0px) + var(--tg-content-safe-area-inset-bottom, 0px))',
        }}
        aria-hidden={hideAppChrome || undefined}
      >
        <div key={tab} className={cn('min-w-0', pageIn && 'animate-page-in')}>
          <TabPage tab={tab} />
        </div>
      </main>
      {pageMounted && <MemoryQuizPage />}
      {gate === 'entering' && <MemoryEnterSplash onComplete={onEnterComplete} />}
      {gate === 'exiting' && (
        <MemoryExitSplash onHidePage={hideMemoryPage} onComplete={onExitComplete} />
      )}
    </div>
  )
}
