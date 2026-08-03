import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addMonthsSafe, monthLabel } from '@/utils/dateHelpers'
import { Button } from '@/components/ui/button'

type MonthPickerProps = {
  year: number
  month: number
  onChange: (year: number, month: number) => void
}

export function MonthPicker({ year, month, onChange }: MonthPickerProps) {
  const label = monthLabel(year, month)

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border bg-card p-2">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => {
          const next = addMonthsSafe(year, month, -1)
          onChange(next.year, next.month)
        }}
        aria-label="Предыдущий месяц"
      >
        <ChevronLeft />
      </Button>
      <div className="text-sm font-medium capitalize">{label}</div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => {
          const next = addMonthsSafe(year, month, 1)
          onChange(next.year, next.month)
        }}
        aria-label="Следующий месяц"
      >
        <ChevronRight />
      </Button>
    </div>
  )
}
