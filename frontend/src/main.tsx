import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

function showBootError(err: unknown) {
  const message = err instanceof Error ? err.stack || err.message : String(err)
  console.error('[boot]', err)
  const show = (
    window as unknown as { __showBootError?: (title: string, detail?: string) => void }
  ).__showBootError
  if (show) {
    show('NasTask boot error', message)
    return
  }
  const root = document.getElementById('root')
  if (root) {
    root.innerHTML = `<div style="padding:24px;font-family:sans-serif">
      <h1 style="font-size:18px;margin:0 0 8px">NasTask boot error</h1>
      <pre style="white-space:pre-wrap;font-size:12px;color:#b91c1c">${String(message).replace(/</g, '&lt;')}</pre>
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
