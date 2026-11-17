import { cn } from '@/lib/utils'

type Props = {
  label: string
  tone: 'warn' | 'ok'
  className?: string
}

export function StatusChip({ label, tone, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full truncate rounded-full px-2.5 py-1 text-[11px] font-medium tracking-normal',
        tone === 'warn' && 'bg-[hsl(var(--destructive)/0.12)] text-destructive',
        tone === 'ok' && 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]',
        className,
      )}
    >
      {label}
    </span>
  )
}
