import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export function splitLocalDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) {
    const now = new Date()
    return splitLocalDateTime(now.toISOString())
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

export function joinLocalDateTime(date: string, time: string): string {
  if (!date || !time) throw new Error(t('dateTime.required'))
  const ms = Date.parse(`${date}T${time}:00`)
  if (!Number.isFinite(ms)) throw new Error(t('dateTime.invalid'))
  return new Date(ms).toISOString()
}

/** ISO `yyyy-MM-dd` → display `dd.MM.yyyy`. */
function formatDateDisplay(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (!m) return isoDate
  return `${m[3]}.${m[2]}.${m[1]}`
}

type Props = {
  label: string
  date: string
  time: string
  onDateChange: (date: string) => void
  onTimeChange: (time: string) => void
  idPrefix: string
}

/** Separate date + time inputs (not a single datetime-local). */
export function DateTimeFields({
  label,
  date,
  time,
  onDateChange,
  onTimeChange,
  idPrefix,
}: Props) {
  // Hide native picker icons; keep the indicator as a full-field hit target.
  const timeClassName = cn(
    'relative min-w-0 text-center tabular-nums',
    '[&::-webkit-calendar-picker-indicator]:absolute',
    '[&::-webkit-calendar-picker-indicator]:inset-0',
    '[&::-webkit-calendar-picker-indicator]:h-full',
    '[&::-webkit-calendar-picker-indicator]:w-full',
    '[&::-webkit-calendar-picker-indicator]:cursor-pointer',
    '[&::-webkit-calendar-picker-indicator]:opacity-0',
    '[&::-webkit-datetime-edit]:mx-auto',
    '[&::-webkit-datetime-edit]:w-full',
    '[&::-webkit-datetime-edit]:text-center',
    '[&::-webkit-date-and-time-value]:w-full',
    '[&::-webkit-date-and-time-value]:text-center',
  )

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="grid grid-cols-2 gap-2">
        <div className="relative min-w-0">
          <Input
            readOnly
            tabIndex={-1}
            value={formatDateDisplay(date)}
            aria-hidden
            className="pointer-events-none text-center tabular-nums"
          />
          <input
            id={`${idPrefix}-date`}
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            aria-label={t('dateTime.date')}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </div>
        <Input
          id={`${idPrefix}-time`}
          type="time"
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
          aria-label={t('dateTime.time')}
          className={timeClassName}
        />
      </div>
    </div>
  )
}
