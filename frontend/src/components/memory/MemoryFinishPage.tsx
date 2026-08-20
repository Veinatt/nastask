import { useI18n } from '@/hooks/useI18n'

type Props = {
  onEdit: () => void
}

export function MemoryFinishPage({ onEdit }: Props) {
  const { t } = useI18n()

  return (
    <div className="memory-content memory-card-enter flex min-h-0 w-full flex-1 flex-col">
      <blockquote className="notebook-quote">{t('memory.finish.quote')}</blockquote>
      <p className="notebook-finish-hint">{t('memory.finish.hint')}</p>
      <div className="notebook-actions flex justify-end">
        <button type="button" className="notebook-btn notebook-btn-primary" onClick={onEdit}>
          {t('memory.finish.edit')}
        </button>
      </div>
    </div>
  )
}
