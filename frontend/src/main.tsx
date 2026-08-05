import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

function showBootError(err: unknown) {
  const root = document.getElementById('root')
  const message = err instanceof Error ? err.message : String(err)
  console.error('[boot]', err)
  if (root) {
    root.innerHTML = `<div style="padding:24px;font-family:sans-serif">
      <h1 style="font-size:18px;margin:0 0 8px">NasTask boot error</h1>
      <pre style="white-space:pre-wrap;font-size:12px;color:#b91c1c">${message.replace(/</g, '&lt;')}</pre>
      <p style="font-size:13px;color:#666">Если видишь это — пришли текст ошибки.</p>
    </div>`
  }
}

try {
  const el = document.getElementById('root')
  if (!el) throw new Error('#root not found')
  // Clear static HTML fallback before React takes over
  el.innerHTML = ''
  createRoot(el).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (err) {
  showBootError(err)
}

window.addEventListener('error', (ev) => {
  console.error('[window.error]', ev.error || ev.message)
})
window.addEventListener('unhandledrejection', (ev) => {
  console.error('[unhandledrejection]', ev.reason)
})
