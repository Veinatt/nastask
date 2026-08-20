import { useI18n } from '@/hooks/useI18n'

type Props = {
  onStart: () => void
}

export function MemoryWelcomePage({ onStart }: Props) {
  const { t } = useI18n()

  return (
    <div className="memory-content memory-card-enter flex min-h-0 w-full flex-1 flex-col">
      <p className="notebook-meta">{t('memory.welcome.meta')}</p>
      <div className="notebook-prose max-w-xl">
        <p>{t('memory.welcome.p1')}</p>
        <p>{t('memory.welcome.p2')}</p>
        <p>{t('memory.welcome.p3')}</p>
      </div>
      <div className="notebook-actions flex justify-end">
        <button type="button" className="notebook-btn notebook-btn-primary" onClick={onStart}>
          {t('memory.welcome.start')}
        </button>
      </div>
    </div>
  )
}
