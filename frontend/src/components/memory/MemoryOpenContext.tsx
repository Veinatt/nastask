import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAppTab } from '@/components/layout/AppTabContext'

export type MemoryGate = 'closed' | 'entering' | 'open' | 'exiting'

type MemoryOpenContextValue = {
  gate: MemoryGate
  active: boolean
  open: boolean
  exiting: boolean
  interactive: boolean
  /** Memory page stays mounted under splash until exit morph hides it. */
  pageMounted: boolean
  openMemory: () => void
  onEnterComplete: () => void
  beginClose: () => void
  hideMemoryPage: () => void
  onExitComplete: () => void
  closeMemory: () => void
}

const MemoryOpenContext = createContext<MemoryOpenContextValue | null>(null)

export function MemoryOpenProvider({ children }: { children: ReactNode }) {
  const { setTab } = useAppTab()
  const [gate, setGate] = useState<MemoryGate>('closed')
  const [pageMounted, setPageMounted] = useState(false)

  const openMemory = useCallback(() => {
    setPageMounted(true)
    setGate((g) => (g === 'closed' ? 'entering' : g))
    setTab('/')
  }, [setTab])

  const onEnterComplete = useCallback(() => {
    setGate((g) => (g === 'entering' ? 'open' : g))
    delete document.documentElement.dataset.memoryEnter
  }, [])

  const beginClose = useCallback(() => {
    setGate((g) => (g === 'open' ? 'exiting' : g))
  }, [])

  /** Called under opaque exit overlay right before bg fade reveals the app. */
  const hideMemoryPage = useCallback(() => {
    setPageMounted(false)
  }, [])

  const onExitComplete = useCallback(() => {
    setGate('closed')
    setPageMounted(false)
    delete document.documentElement.dataset.memoryEnter
    delete document.documentElement.dataset.memoryExit
  }, [])

  const closeMemory = useCallback(() => {
    setGate('closed')
    setPageMounted(false)
    delete document.documentElement.dataset.memoryEnter
    delete document.documentElement.dataset.memoryExit
  }, [])

  const value = useMemo(
    () => ({
      gate,
      active: gate !== 'closed',
      open: gate === 'open',
      exiting: gate === 'exiting',
      interactive: gate === 'open',
      pageMounted,
      openMemory,
      onEnterComplete,
      beginClose,
      hideMemoryPage,
      onExitComplete,
      closeMemory,
    }),
    [
      gate,
      pageMounted,
      openMemory,
      onEnterComplete,
      beginClose,
      hideMemoryPage,
      onExitComplete,
      closeMemory,
    ],
  )

  return (
    <MemoryOpenContext.Provider value={value}>{children}</MemoryOpenContext.Provider>
  )
}

export function useMemoryOpen() {
  const ctx = useContext(MemoryOpenContext)
  if (!ctx) throw new Error('useMemoryOpen must be used within MemoryOpenProvider')
  return ctx
}
