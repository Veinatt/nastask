const MAX = 6
const lines: string[] = []

export const DOWNLOAD_DEBUG_BUILD = 'dl1'

function stamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export function downloadDebug(text: string): void {
  const line = `${stamp()} ${text}`
  lines.push(line)
  if (lines.length > MAX) lines.shift()
  console.log('[download-debug]', line)
  window.dispatchEvent(
    new CustomEvent('nastask:download-debug', { detail: lines.slice() }),
  )
}

export function downloadDebugLines(): string[] {
  return lines.slice()
}
