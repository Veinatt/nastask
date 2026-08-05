import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { NAV_ITEMS, NAV_ROUTES } from '@/components/layout/navItems'

export type AppTab = (typeof NAV_ROUTES)[number]

type AppTabContextValue = {
  tab: AppTab
  tabIndex: number
  setTab: (tab: AppTab) => void
  setTabIndex: (index: number) => void
}

const AppTabContext = createContext<AppTabContextValue | null>(null)

export function AppTabProvider({ children }: { children: ReactNode }) {
  const [tab, setTabState] = useState<AppTab>('/')

  const value = useMemo<AppTabContextValue>(() => {
    const tabIndex = Math.max(
      0,
      NAV_ITEMS.findIndex((item) => item.to === tab),
    )
    return {
      tab,
      tabIndex,
      setTab: (next) => setTabState(next),
      setTabIndex: (index) => {
        const item = NAV_ITEMS[index]
        if (item) setTabState(item.to)
      },
    }
  }, [tab])

  return <AppTabContext.Provider value={value}>{children}</AppTabContext.Provider>
}

export function useAppTab() {
  const ctx = useContext(AppTabContext)
  if (!ctx) throw new Error('useAppTab must be used within AppTabProvider')
  return ctx
}
