import { useRef, useState } from 'react'
import { Pencil, Plus, Play, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { TimerCard } from '@/components/intervals/TimerCard'
import { CompleteIntervalDialog } from '@/components/intervals/CompleteIntervalDialog'
import { ManualEntryDialog } from '@/components/intervals/ManualEntryDialog'
import { useActiveIntervals } from '@/hooks/useActiveIntervals'
import { useI18n } from '@/hooks/useI18n'
import { SoftDivider } from '@/components/ui/soft-divider'
import { formatDecimal } from '@/utils/formatNumber'
import { formatDuration, getTimeRangeParts } from '@/utils/timeDisplay'
import type { TimeEntry } from '@/db/types'

function CompletedList({
  title,
  entries,
  onEdit,
  onDelete,
}: {
  title: string
  entries: TimeEntry[]
  onEdit: (e: TimeEntry) => void
  onDelete: (id: string) => void
}) {
  const { t } = useI18n()

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="section-label">{title}</h2>
        <span className="count-chip">{entries.length}</span>
      </div>
      {entries.length === 0 ? (
        <div className="surface-panel px-5 py-8 text-center text-sm text-muted-foreground">
          {t('home.completedEmpty')}
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {entries
            .slice()
            .sort((a, b) => (b.end ?? '').localeCompare(a.end ?? ''))
            .map((e) => {
              const range = getTimeRangeParts(e.start, e.end)
              return (
                <div
                  key={e.id}
                  className="surface-panel flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="flex min-w-0 items-center text-sm font-medium">
                      {range.dateLabel ? (
                        <>
                          <span className="shrink-0 tabular-nums">{range.dateLabel}</span>
                          <SoftDivider />
                          <span className="min-w-0 truncate tabular-nums">{range.timeLabel}</span>
                        </>
                      ) : (
                        <span className="truncate tabular-nums">{range.timeLabel}</span>
                      )}
                    </p>
                    <p className="flex items-center text-xs text-muted-foreground tabular-nums">
                      <span>{formatDuration(e.totalSeconds)}</span>
                      {e.coefficient !== 1 ? (
                        <>
                          <SoftDivider />
                          <span>×{formatDecimal(e.coefficient)}</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 text-primary-soft"
                      aria-label={t('common.edit')}
                      onClick={() => onEdit(e)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 text-destructive hover:text-destructive"
                      aria-label={t('timer.deleteAria')}
                      onClick={() => onDelete(e.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
        </div>
      )}
    </section>
  )
}

export function HomePage() {
  const { t } = useI18n()
  const {
    views,
    completedToday,
    completedYesterday,
    start,
    pause,
    resume,
    complete,
    createManual,
    updateInterval,
    remove,
    refreshActive,
  } = useActiveIntervals()

  const [starting, setStarting] = useState(false)
  const [completeTarget, setCompleteTarget] = useState<TimeEntry | null>(null)
  const [editTarget, setEditTarget] = useState<TimeEntry | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** If we auto-paused this interval for the complete dialog, resume on cancel */
  const pausedForCompleteRef = useRef<string | null>(null)

  const handleStart = async () => {
    setStarting(true)
    setError(null)
    try {
      await start()
      await refreshActive()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('home.startError'))
    } finally {
      setStarting(false)
    }
  }

  const openComplete = async (entry: TimeEntry) => {
    pausedForCompleteRef.current = null
    if (!entry.pauseStartedAt) {
      try {
        await pause(entry.id)
        pausedForCompleteRef.current = entry.id
        await refreshActive()
      } catch (e) {
        setError(e instanceof Error ? e.message : t('common.error'))
        return
      }
    }
    setCompleteTarget(entry)
  }

  const closeComplete = (open: boolean) => {
    if (open) return
    const resumeId = pausedForCompleteRef.current
    pausedForCompleteRef.current = null
    setCompleteTarget(null)
    if (resumeId) {
      void resume(resumeId).then(() => refreshActive())
    }
  }

  return (
    <div className="grid gap-6 lg:gap-8">
      <header className="flex flex-col gap-4">
        <div className="space-y-1 min-w-0">
          <h1
            id="home-brand-title"
            className="w-fit text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
          >
            {t('home.title')}
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            {t('home.subtitle')}
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2">
          <Button
            size="lg"
            className="w-full shadow-md shadow-primary/25"
            onClick={() => void handleStart()}
            disabled={starting}
          >
            <Play className="h-4 w-4 mr-1.5 fill-current" />
            {starting ? t('home.starting') : t('home.start')}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full border-[hsl(var(--primary)/0.2)] bg-[hsl(var(--card)/0.8)] shadow-sm"
            onClick={() => setManualOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t('home.manual')}
          </Button>
        </div>
      </header>

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="section-label">{t('home.active')}</h2>
          <span className="count-chip">{views.length}</span>
        </div>
        {views.length === 0 ? (
          <div className="surface-panel px-5 py-10 text-center text-sm text-muted-foreground">
            {t('home.activeEmpty')}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {views.map((entry) => (
              <TimerCard
                key={entry.id}
                entry={entry}
                onPause={() => void pause(entry.id).then(() => refreshActive())}
                onResume={() => void resume(entry.id).then(() => refreshActive())}
                onComplete={() => void openComplete(entry)}
                onDelete={() => setDeleteId(entry.id)}
              />
            ))}
          </div>
        )}
      </section>

      <CompletedList
        title={t('home.completedToday')}
        entries={completedToday}
        onEdit={setEditTarget}
        onDelete={setDeleteId}
      />
      <CompletedList
        title={t('home.completedYesterday')}
        entries={completedYesterday}
        onEdit={setEditTarget}
        onDelete={setDeleteId}
      />

      <CompleteIntervalDialog
        open={completeTarget != null}
        entry={completeTarget}
        displaySeconds={
          completeTarget
            ? views.find((v) => v.id === completeTarget.id)?.displaySeconds ??
              completeTarget.totalSeconds
            : undefined
        }
        onOpenChange={closeComplete}
        onSubmit={async (payload) => {
          if (!completeTarget) return
          // Completed — do not resume on dialog close
          pausedForCompleteRef.current = null
          await complete(completeTarget.id, payload)
          await refreshActive()
        }}
      />

      <CompleteIntervalDialog
        open={editTarget != null}
        entry={editTarget}
        dialogTitle={t('home.editInterval')}
        editTime
        displaySeconds={editTarget?.totalSeconds}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null)
        }}
        onSubmit={async (payload) => {
          if (!editTarget) return
          await updateInterval(editTarget.id, {
            coefficient: payload.coefficient,
            workItems: payload.workItems,
            start: payload.start,
            end: payload.end ?? null,
          })
        }}
      />

      <ManualEntryDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        onSubmit={async (payload) => {
          await createManual(payload)
        }}
      />

      <AlertDialog
        open={deleteId != null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('home.deleteTitle')}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deleteId) return
                void remove(deleteId).then(() => refreshActive())
              }}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
