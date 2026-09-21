import { useRef, useState } from 'react'
import { Button, type ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Shard = {
  id: number
  x: number
  y: number
  dx: number
  dy: number
  rot: number
  length: number
  vertical: boolean
}

function shardsAlongBorder(width: number, height: number): Shard[] {
  const edges: Array<{ x: number; y: number; vertical: boolean; nx: number; ny: number }> = []
  const step = 9
  for (let x = 6; x < width - 4; x += step) {
    edges.push({ x, y: 0, vertical: false, nx: 0, ny: -1 })
    edges.push({ x, y: height, vertical: false, nx: 0, ny: 1 })
  }
  for (let y = 6; y < height - 4; y += step) {
    edges.push({ x: 0, y, vertical: true, nx: -1, ny: 0 })
    edges.push({ x: width, y, vertical: true, nx: 1, ny: 0 })
  }
  return edges.map((edge, id) => {
    const spread = 16 + Math.random() * 28
    const side = (Math.random() - 0.5) * 18
    return {
      id,
      x: edge.x,
      y: edge.y,
      dx: edge.nx * spread + (edge.vertical ? 0 : side),
      dy: edge.ny * spread + (edge.vertical ? side : 0),
      rot: (Math.random() - 0.5) * 180,
      length: 5 + Math.random() * 6,
      vertical: edge.vertical,
    }
  })
}

type DownloadBurstButtonProps = Omit<ButtonProps, 'onClick'> & {
  onDownload: () => Promise<void>
  wrapperClassName?: string
}

export function DownloadBurstButton({
  onDownload,
  className,
  wrapperClassName,
  disabled,
  children,
  ...props
}: DownloadBurstButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const [hop, setHop] = useState(false)
  const [shards, setShards] = useState<Shard[]>([])
  const [busy, setBusy] = useState(false)

  async function handleClick() {
    if (busy || disabled) return
    setBusy(true)
    try {
      await onDownload()
      const rect = ref.current?.getBoundingClientRect()
      if (rect && rect.width > 0) {
        setShards(shardsAlongBorder(rect.width, rect.height))
      }
      setHop(true)
      window.setTimeout(() => {
        setHop(false)
        setShards([])
      }, 760)
    } catch {
      // The download helper already shows the error banner.
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className={cn('relative inline-flex', wrapperClassName)}>
      {shards.map((shard) => (
        <span
          key={shard.id}
          aria-hidden
          className="download-shard"
          style={{
            left: shard.x,
            top: shard.y,
            width: shard.vertical ? 2 : shard.length,
            height: shard.vertical ? shard.length : 2,
            ['--dx' as string]: `${shard.dx}px`,
            ['--dy' as string]: `${shard.dy}px`,
            ['--rot' as string]: `${shard.rot}deg`,
          }}
        />
      ))}
      <Button
        ref={ref}
        type="button"
        className={cn(className, hop && 'download-burst-btn')}
        disabled={disabled || busy}
        onClick={() => void handleClick()}
        {...props}
      >
        {children}
      </Button>
    </span>
  )
}
