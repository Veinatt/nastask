import { useI18n } from '@/hooks/useI18n'

export function MemoryWelcomePage() {
  const { t } = useI18n()

  return (
    <div className="memory-content flex min-h-0 w-full flex-1 flex-col">
      <p className="notebook-meta">{t('memory.welcome.meta')}</p>
      <div className="notebook-prose max-w-xl">
        <p>{t('memory.welcome.p1')}</p>
        <p>{t('memory.welcome.p2')}</p>
        <p>{t('memory.welcome.p3')}</p>
      </div>
    </div>
  )
}
