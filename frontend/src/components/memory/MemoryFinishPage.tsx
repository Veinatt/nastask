type Props = {
  onEdit: () => void
}

const QUOTE =
  'Та девочка никуда не ушла — она ждёт, пока ты снова позовёшь её по имени.'

export function MemoryFinishPage({ onEdit }: Props) {
  return (
    <div className="memory-content memory-card-enter w-full max-w-xl">
      <blockquote className="notebook-quote">{QUOTE}</blockquote>
      <p className="notebook-finish-hint">
        Можно вернуться к вопросам или выйти, нажав на NasTales сверху.
      </p>
      <div className="notebook-actions">
        <button type="button" className="notebook-btn notebook-btn-primary" onClick={onEdit}>
          Редактировать
        </button>
      </div>
    </div>
  )
}
