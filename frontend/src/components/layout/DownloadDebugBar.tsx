import { useEffect, useState } from 'react'
import { DOWNLOAD_DEBUG_BUILD, downloadDebugLines } from '@/utils/downloadDebug'

export function DownloadDebugBar() {
  const [lines, setLines] = useState<string[]>(() => downloadDebugLines())

  useEffect(() => {
    const onUpdate = (event: Event) => {
      const next = (event as CustomEvent<string[]>).detail
      setLines(Array.isArray(next) ? next : downloadDebugLines())
    }
    window.addEventListener('nastask:download-debug', onUpdate)
    return () => window.removeEventListener('nastask:download-debug', onUpdate)
  }, [])

  return (
    <div className="sticky bottom-[calc(4.5rem+var(--tg-safe-area-inset-bottom,0px))] z-30 mx-auto w-full max-w-6xl px-3 md:bottom-2">
      <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border border-amber-500/40 bg-amber-50/95 px-2 py-1.5 text-[11px] leading-snug text-amber-950 shadow-sm">
        {`download-debug ${DOWNLOAD_DEBUG_BUILD}`}
        {lines.length > 0 ? `\n${lines.join('\n')}` : '\nожидание нажатия CSV / Excel / JSON'}
      </pre>
    </div>
  )
}
