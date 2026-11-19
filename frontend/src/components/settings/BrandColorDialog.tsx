import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/hooks/useI18n'
import {
  hexToHsv,
  hsvToHex,
  normalizeHex,
  type BrandHsv,
} from '@/lib/brand'
import { cn } from '@/lib/utils'

type Props = {
  open: boolean
  initialHex: string
  onOpenChange: (open: boolean) => void
  onSave: (hex: string) => void
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

/** Plane matches CSS: x→S, y→V (top = bright, right = saturated). */
function hsvFromPointer(h: number, x: number, y: number): BrandHsv {
  return {
    h,
    s: clamp(x, 0, 1) * 100,
    v: clamp(1 - y, 0, 1) * 100,
  }
}

export function BrandColorDialog({
  open,
  initialHex,
  onOpenChange,
  onSave,
}: Props) {
  const { t } = useI18n()
  const [hsv, setHsv] = useState<BrandHsv>(
    () => hexToHsv(initialHex) ?? { h: 212, s: 100, v: 100 },
  )
  const [hexText, setHexText] = useState(initialHex)
  const planeRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const hsvRef = useRef(hsv)
  hsvRef.current = hsv

  const draftHex = hsvToHex(hsv.h, hsv.s, hsv.v)

  const publish = useCallback((next: BrandHsv) => {
    setHsv(next)
    setHexText(hsvToHex(next.h, next.s, next.v))
  }, [])

  useEffect(() => {
    if (!open) return
    const parsed = hexToHsv(initialHex) ?? { h: 212, s: 100, v: 100 }
    setHsv(parsed)
    setHexText(normalizeHex(initialHex) ?? initialHex)
  }, [open, initialHex])

  const pickFromPlane = (clientX: number, clientY: number) => {
    const el = planeRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (clientX - rect.left) / rect.width
    const y = (clientY - rect.top) / rect.height
    publish(hsvFromPointer(hsvRef.current.h, x, y))
  }

  const hueColor = `hsl(${Math.round(hsv.h)} 100% 50%)`
  const labelStyle = { color: draftHex }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('settings.brand.pick')}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div
            ref={planeRef}
            role="slider"
            aria-label={t('settings.brand')}
            tabIndex={0}
            className="relative h-40 w-full touch-none select-none overflow-hidden rounded-2xl"
            style={{
              background: `
                linear-gradient(to bottom, transparent, #000),
                linear-gradient(to right, #fff, ${hueColor})
              `,
            }}
            onPointerDown={(e) => {
              dragging.current = true
              e.currentTarget.setPointerCapture(e.pointerId)
              pickFromPlane(e.clientX, e.clientY)
            }}
            onPointerMove={(e) => {
              if (!dragging.current) return
              pickFromPlane(e.clientX, e.clientY)
            }}
            onPointerUp={() => {
              dragging.current = false
            }}
            onPointerCancel={() => {
              dragging.current = false
            }}
          >
            <span
              className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
              style={{
                left: `${clamp(hsv.s / 100, 0, 1) * 100}%`,
                top: `${clamp(1 - hsv.v / 100, 0, 1) * 100}%`,
                backgroundColor: draftHex,
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand-hue" style={labelStyle}>
              {t('settings.brand')}
            </Label>
            <input
              id="brand-hue"
              type="range"
              min={0}
              max={360}
              step={1}
              value={Math.round(hsv.h)}
              className={cn(
                'h-3 w-full cursor-pointer appearance-none rounded-full',
                '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4',
                '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white',
                '[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgba(0,0,0,0.25)]',
                '[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full',
                '[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-white',
              )}
              style={{
                background:
                  'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
              }}
              onChange={(e) => {
                publish({ ...hsvRef.current, h: Number(e.target.value) })
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand-hex" style={labelStyle}>
              HEX
            </Label>
            <div className="flex items-center gap-2">
              <span
                className="h-10 w-10 shrink-0 rounded-xl border border-border"
                style={{ backgroundColor: draftHex }}
                aria-hidden
              />
              <Input
                id="brand-hex"
                value={hexText}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                className="font-mono uppercase"
                onChange={(e) => {
                  const v = e.target.value
                  setHexText(v)
                  const n = normalizeHex(v)
                  if (!n) return
                  const parsed = hexToHsv(n)
                  if (!parsed) return
                  setHsv(parsed)
                }}
                onBlur={() => {
                  const n = normalizeHex(hexText)
                  if (n) {
                    setHexText(n)
                    const parsed = hexToHsv(n)
                    if (parsed) setHsv(parsed)
                  } else {
                    setHexText(draftHex)
                  }
                }}
              />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="border-0"
            style={{
              color: draftHex,
              backgroundColor: `${draftHex}2E`,
            }}
            onClick={() => onOpenChange(false)}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            className="border-0 text-white hover:opacity-90"
            style={{ backgroundColor: draftHex }}
            onClick={() => {
              onSave(draftHex)
              onOpenChange(false)
            }}
          >
            {t('settings.brand.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
