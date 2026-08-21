import { useI18n } from '@/hooks/useI18n'

export function MemoryFinishPage() {
  const { t } = useI18n()

  return (
    <div className="memory-content flex min-h-0 w-full flex-1 flex-col">
      <blockquote className="notebook-quote">{t('memory.finish.quote')}</blockquote>
      <p className="notebook-finish-hint">{t('memory.finish.hint')}</p>
    </div>
  )
}
