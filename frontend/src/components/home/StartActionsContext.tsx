import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ManualEntryDialog } from '@/components/intervals/ManualEntryDialog'
import {
  StartIntervalDialog,
  type StartIntervalPayload,
} from '@/components/intervals/StartIntervalDialog'
import { useIntervals } from '@/hooks/useIntervals'
import { useI18n } from '@/hooks/useI18n'

type StartActionsValue = {
  openStart: () => void
  openManual: () => void
  starting: boolean
}

const StartActionsContext = createContext<StartActionsValue | null>(null)

export function StartActionsProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const { start, createManual, refreshActive } = useIntervals()
  const [startOpen, setStartOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openStart = useCallback(() => setStartOpen(true), [])
  const openManual = useCallback(() => setManualOpen(true), [])

  const handleStartConfirm = async (payload: StartIntervalPayload) => {
    setStarting(true)
    setError(null)
    try {
      await start(payload.title, payload.workItems ?? [])
      setStartOpen(false)
      void refreshActive()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('home.startError'))
    } finally {
      setStarting(false)
    }
  }

  const value = useMemo(
    () => ({ openStart, openManual, starting }),
    [openStart, openManual, starting],
  )

  return (
    <StartActionsContext.Provider value={value}>
      {children}
      {error ? (
        <p className="pointer-events-none fixed bottom-24 left-1/2 z-[60] max-w-sm -translate-x-1/2 rounded-xl bg-card px-4 py-2 text-sm text-destructive shadow-lg md:bottom-8">
          {error}
        </p>
      ) : null}
      <StartIntervalDialog
        open={startOpen}
        busy={starting}
        onOpenChange={setStartOpen}
        onConfirm={handleStartConfirm}
      />
      <ManualEntryDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        onSubmit={async (payload) => {
          await createManual(payload)
        }}
      />
    </StartActionsContext.Provider>
  )
}

export function useStartActions() {
  const ctx = useContext(StartActionsContext)
  if (!ctx) throw new Error('useStartActions must be used within StartActionsProvider')
  return ctx
}
