type Props = {
  onStart: () => void
}

export function MemoryWelcomePage({ onStart }: Props) {
  return (
    <div className="memory-content memory-card-enter w-full max-w-xl">
      <p className="notebook-meta">Личная тетрадь</p>
      <div className="notebook-prose">
      <p>
          Это твоя личная тетрадь. Здесь ты можешь сохранять свои воспоминания, мысли и чувства. Всё что я бы
        </p>
        <p>
          Это твоя личная тетрадь. Здесь ты можешь сохранять свои воспоминания, мысли и чувства. Всё что я бы
        </p>
        <p>
          Дальше будут короткие вопросы: про время, дни, чувства, музыку, книги и то, как ты тогда
          жила. Отвечай как получается — коротко или подробно. Всё сохраняется, и ты всегда можешь
          поправить.
        </p>
      </div>
      <div className="notebook-actions">
        <button type="button" className="notebook-btn notebook-btn-primary" onClick={onStart}>
          Открыть вопросы
        </button>
      </div>
    </div>
  )
}
