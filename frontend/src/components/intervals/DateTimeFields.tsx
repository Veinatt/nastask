import { useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

/** ISO `yyyy-MM-dd` → display `dd.MM.yyyy`. */
function formatDateDisplay(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (!m) return isoDate
  return `${m[3]}.${m[2]}.${m[1]}`
}

function openNativePicker(el: HTMLInputElement | null) {
  if (!el) return
  try {
    if (typeof el.showPicker === 'function') {
      void el.showPicker()
      return
    }
  } catch {
    // showPicker can throw if not triggered by a user gesture / unsupported.
  }
  el.focus()
  el.click()
}

type PickerFieldProps = {
  id: string
  type: 'date' | 'time'
  value: string
  display: string
  ariaLabel: string
  onChange: (value: string) => void
}

function PickerField({ id, type, value, display, ariaLabel, onChange }: PickerFieldProps) {
  const nativeRef = useRef<HTMLInputElement>(null)

  return (
    <div className="relative min-w-0">
      <Input
        readOnly
        value={display}
        aria-label={ariaLabel}
        className="cursor-pointer text-center tabular-nums"
        onClick={() => openNativePicker(nativeRef.current)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            openNativePicker(nativeRef.current)
          }
        }}
      />
      <input
        ref={nativeRef}
        id={id}
        type={type}
        value={value}
        tabIndex={-1}
        aria-hidden
        onChange={(e) => onChange(e.target.value)}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
      />
    </div>
  )
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
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="grid grid-cols-2 gap-2">
        <PickerField
          id={`${idPrefix}-date`}
          type="date"
          value={date}
          display={formatDateDisplay(date)}
          ariaLabel={t('dateTime.date')}
          onChange={onDateChange}
        />
        <PickerField
          id={`${idPrefix}-time`}
          type="time"
          value={time}
          display={time}
          ariaLabel={t('dateTime.time')}
          onChange={onTimeChange}
        />
      </div>
    </div>
  )
}
