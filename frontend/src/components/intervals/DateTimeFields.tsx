import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/hooks/useI18n'
import { t } from '@/lib/i18n'

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
  const { t } = useI18n()

  // Pin native picker icons inside the field; give date a bit more width than time.
  const pickerClassName =
    'relative min-w-0 pr-9 ' +
    '[&::-webkit-calendar-picker-indicator]:absolute ' +
    '[&::-webkit-calendar-picker-indicator]:right-2.5 ' +
    '[&::-webkit-calendar-picker-indicator]:top-1/2 ' +
    '[&::-webkit-calendar-picker-indicator]:h-4 ' +
    '[&::-webkit-calendar-picker-indicator]:w-4 ' +
    '[&::-webkit-calendar-picker-indicator]:-translate-y-1/2 ' +
    '[&::-webkit-calendar-picker-indicator]:cursor-pointer'

  return (
    <div className="space-y-2">
      <Label className="text-muted-foreground">{label}</Label>
      <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)] gap-2">
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor={`${idPrefix}-date`} className="text-xs font-normal">
            {t('dateTime.date')}
          </Label>
          <Input
            id={`${idPrefix}-date`}
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className={pickerClassName}
          />
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor={`${idPrefix}-time`} className="text-xs font-normal">
            {t('dateTime.time')}
          </Label>
          <Input
            id={`${idPrefix}-time`}
            type="time"
            value={time}
            onChange={(e) => onTimeChange(e.target.value)}
            className={pickerClassName}
          />
        </div>
      </div>
    </div>
  )
}
