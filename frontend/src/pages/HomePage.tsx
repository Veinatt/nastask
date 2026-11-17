import { useEffect, useRef, useState } from 'react'
import { Plus, Play, StickyNote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog'
import { TimerCard } from '@/components/intervals/TimerCard'
import { CompleteIntervalDialog } from '@/components/intervals/CompleteIntervalDialog'
import { ManualEntryDialog } from '@/components/intervals/ManualEntryDialog'
import {
  StartIntervalDialog,
  type StartIntervalPayload,
} from '@/components/intervals/StartIntervalDialog'
import { useActiveIntervals } from '@/hooks/useActiveIntervals'
import { useI18n } from '@/hooks/useI18n'
import { SoftDivider } from '@/components/ui/soft-divider'
import { StatusChip } from '@/components/ui/status-chip'
import { SwipeToDelete } from '@/components/ui/swipe-to-delete'
import { formatDecimal } from '@/utils/formatNumber'
import { formatDuration, getTimeRangeParts } from '@/utils/timeDisplay'
import {
  formatFillSummary,
  getIntervalFillState,
  slavicPluralForm,
} from '@/utils/intervalFill'
import { continuousRunHours } from '@/utils/intervalFreshness'
import type { TimeEntry } from '@/db/types'

/** Same thresholds as backend bot still-working reminders. */
const STILL_WORKING_HOURS = 1.5
const STILL_WORKING_COOLDOWN_MS = 1.5 * 60 * 60 * 1000
const STILL_WORKING_CHECK_MS = 30 * 60 * 1000

/** entryId → last prompt ms (SPA lifetime; like bot in-memory map). */
const stillWorkingSentAt = new Map<string, number>()

function worksLabel(
  t: (key: string, params?: Record<string, string | number>) => string,
  n: number,
): string {
  const form = slavicPluralForm(n)
  const key =
    form === 'one' ? 'fill.worksOne' : form === 'few' ? 'fill.worksFew' : 'fill.worksMany'
  return t(key, { n: String(n) })
}

function CompletedRow({
  entry,
  workCount,
  onEdit,
  onDelete,
}: {
  entry: TimeEntry
  workCount: number
  onEdit: (e: TimeEntry) => void
  onDelete: (id: string) => void
}) {
  const { t } = useI18n()

  const range = getTimeRangeParts(entry.start, entry.end)
  const hasNotes = Boolean(entry.notes?.trim())
  const titleText = entry.title?.trim()
  const fill = getIntervalFillState(entry, workCount)
  const fillSummary = formatFillSummary(fill, {
    empty: t('fill.empty'),
    works: (n) => worksLabel(t, n),
  })

  return (
    <SwipeToDelete
      onDelete={() => onDelete(entry.id)}
      deleteAriaLabel={t('timer.deleteAria')}
      onTap={() => onEdit(entry)}
      contentClassName="surface-card flex cursor-pointer items-center justify-between gap-3 px-4 py-3 select-none"
    >
      <div
        title={t('timer.swipeDelete')}
        aria-label={t('common.edit')}
        className="flex min-w-0 flex-1 items-center justify-between gap-3 outline-none"
      >
        <div className="min-w-0 flex-1 space-y-1">
          <p className="flex min-w-0 items-center text-sm font-medium">
            {range.dateLabel ? (
              <span className="shrink-0 tabular-nums">{range.dateLabel}</span>
            ) : null}
            {titleText ? (
              <>
                {range.dateLabel ? <SoftDivider /> : null}
                <span className="min-w-0 truncate">{titleText}</span>
              </>
            ) : null}
            {hasNotes ? (
              <StickyNote
                className="ml-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
                aria-label={t('list.notesIndicator')}
              />
            ) : null}
          </p>
          <div className="min-w-0 space-y-0.5 text-xs text-muted-foreground tabular-nums">
            <p className="min-w-0 break-words [overflow-wrap:anywhere]">
              {range.timeLabel}
            </p>
            <p className="flex flex-wrap items-center gap-x-0">
              <span>{formatDuration(entry.totalSeconds)}</span>
              {entry.coefficient !== 1 ? (
                <>
                  <SoftDivider />
                  <span>×{formatDecimal(entry.coefficient)}</span>
                </>
              ) : null}
            </p>
          </div>
        </div>
        <StatusChip
          className="shrink-0"
          label={fillSummary}
          tone={fill.needsWorks ? 'warn' : 'ok'}
        />
      </div>
    </SwipeToDelete>
  )
}

function CompletedList({
  title,
  entries,
  workCountByEntry,
  onEdit,
  onDelete,
}: {
  title: string
  entries: TimeEntry[]
  workCountByEntry: Record<string, number>
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
        <div className="surface-card px-5 py-8 text-center text-sm text-muted-foreground">
          {t('home.completedEmpty')}
        </div>
      ) : (
        <ul className="grid gap-2">
          {entries
            .slice()
            .sort((a, b) => (b.end ?? '').localeCompare(a.end ?? ''))
            .map((e) => (
              <li key={e.id}>
                <CompletedRow
                  entry={e}
                  workCount={workCountByEntry[e.id] ?? 0}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </li>
            ))}
        </ul>
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
    workCountByEntry,
    start,
    pause,
    resume,
    complete,
    createManual,
    updateInterval,
    remove,
    refreshActive,
  } = useActiveIntervals()

  const [startOpen, setStartOpen] = useState(false)
  const [starting, setStarting] = useState(false)
  const [completeTarget, setCompleteTarget] = useState<TimeEntry | null>(null)
  const [editTarget, setEditTarget] = useState<TimeEntry | null>(null)
  const [draftTarget, setDraftTarget] = useState<TimeEntry | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stillWorking, setStillWorking] = useState<TimeEntry | null>(null)
  const [stillWorkingHours, setStillWorkingHours] = useState(0)
  /** If we auto-paused this interval for the complete dialog, resume on cancel */
  const pausedForCompleteRef = useRef<string | null>(null)
  const stillWorkingOpenRef = useRef(false)
  stillWorkingOpenRef.current = stillWorking != null

  useEffect(() => {
    const maybePrompt = () => {
      if (stillWorkingOpenRef.current) return
      if (document.visibilityState !== 'visible') return
      const now = new Date()
      for (const entry of views) {
        if (entry.pauseStartedAt) continue
        const hours = continuousRunHours(entry, now)
        if (hours < STILL_WORKING_HOURS) continue
        const last = stillWorkingSentAt.get(entry.id) ?? 0
        if (now.getTime() - last < STILL_WORKING_COOLDOWN_MS) continue
        stillWorkingSentAt.set(entry.id, now.getTime())
        setStillWorkingHours(Math.floor(hours))
        setStillWorking(entry)
        break
      }
    }

    maybePrompt()
    const id = window.setInterval(maybePrompt, STILL_WORKING_CHECK_MS)
    document.addEventListener('visibilitychange', maybePrompt)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', maybePrompt)
    }
  }, [views])

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
    const id = pausedForCompleteRef.current
    pausedForCompleteRef.current = null
    setCompleteTarget(null)
    if (id) {
      void resume(id).then(() => refreshActive())
    }
  }

  return (
    <div className="grid min-w-0 gap-6">
      <div className="grid w-full grid-cols-2 gap-2">
        <Button
          size="lg"
          className="w-full"
          onClick={() => setStartOpen(true)}
          disabled={starting}
        >
          <Play className="h-4 w-4 mr-1.5 fill-current" />
          {starting ? t('home.starting') : t('home.start')}
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="w-full"
          onClick={() => setManualOpen(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          {t('home.manual')}
        </Button>
      </div>

      {error && (
        <p className="surface-card px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="section-label">{t('home.active')}</h2>
          <span className="count-chip">{views.length}</span>
        </div>
        {views.length === 0 ? (
          <div className="surface-card px-5 py-8 text-center text-sm text-muted-foreground">
            {t('home.activeEmpty')}
          </div>
        ) : (
          <div className="grid grid-cols-1 items-stretch gap-2 md:grid-cols-2 xl:grid-cols-3">
            {views.map((entry) => (
              <TimerCard
                key={entry.id}
                entry={entry}
                onEdit={() => setDraftTarget(entry)}
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
        workCountByEntry={workCountByEntry}
        onEdit={setEditTarget}
        onDelete={setDeleteId}
      />
      <CompletedList
        title={t('home.completedYesterday')}
        entries={completedYesterday}
        workCountByEntry={workCountByEntry}
        onEdit={setEditTarget}
        onDelete={setDeleteId}
      />

      <CompleteIntervalDialog
        open={completeTarget != null}
        entry={completeTarget}
        mode="complete"
        displaySeconds={
          completeTarget
            ? views.find((v) => v.id === completeTarget.id)?.displaySeconds ??
              completeTarget.totalSeconds
            : undefined
        }
        onOpenChange={closeComplete}
        onSubmit={async (payload) => {
          if (!completeTarget) return
          pausedForCompleteRef.current = null
          await complete(completeTarget.id, payload)
          await refreshActive()
        }}
      />

      <CompleteIntervalDialog
        open={draftTarget != null}
        entry={draftTarget}
        mode="draft"
        dialogTitle={t('completeDialog.draftTitle')}
        displaySeconds={
          draftTarget
            ? views.find((v) => v.id === draftTarget.id)?.displaySeconds ??
              draftTarget.totalSeconds
            : undefined
        }
        onOpenChange={(open) => {
          if (!open) setDraftTarget(null)
        }}
        onSubmit={async (payload) => {
          if (!draftTarget) return
          await updateInterval(draftTarget.id, {
            title: payload.title,
            coefficient: payload.coefficient,
            workItems: payload.workItems,
            notes: payload.notes ?? null,
          })
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
            title: payload.title,
            coefficient: payload.coefficient,
            workItems: payload.workItems,
            start: payload.start,
            end: payload.end ?? null,
            notes: payload.notes ?? null,
          })
        }}
      />

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

      <AlertDialog
        open={stillWorking != null}
        onOpenChange={(open) => {
          if (!open) setStillWorking(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('home.stillWorkingTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('home.stillWorkingBody', {
                title: stillWorking?.title.trim() || t('stats.untitled'),
                hours: stillWorkingHours,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('home.stillWorkingContinue')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const id = stillWorking?.id
                setStillWorking(null)
                if (!id) return
                void pause(id).then(() => refreshActive())
              }}
            >
              {t('timer.pause')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
