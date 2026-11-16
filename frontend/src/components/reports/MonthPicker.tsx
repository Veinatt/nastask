import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/hooks/useI18n'
import { addMonthsSafe, monthLabel } from '@/utils/dateHelpers'

type MonthPickerProps = {
  year: number
  month: number
  onChange: (next: { year: number; month: number }) => void
}

export function MonthPicker({ year, month, onChange }: MonthPickerProps) {
  const { t, locale } = useI18n()
  const label = monthLabel(year, month, locale)
  const now = new Date()
  const isCurrent =
    year === now.getFullYear() && month === now.getMonth() + 1

  return (
    <div className="flex w-full items-center gap-1 rounded-2xl bg-[hsl(var(--foreground)/0.06)] p-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={t('monthPicker.prev')}
        onClick={() => onChange(addMonthsSafe(year, month, -1))}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <div className="min-w-0 flex-1 px-2 text-center text-sm font-medium tracking-tight">
        {label}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={t('monthPicker.next')}
        disabled={isCurrent}
        onClick={() => {
          if (isCurrent) return
          onChange(addMonthsSafe(year, month, 1))
        }}
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  )
}
