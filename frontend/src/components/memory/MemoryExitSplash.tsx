import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { APP_LOGO_CLASS } from '@/components/layout/Navigation'
import catSrc from '@/assets/cat.jpg'

const CAT_COUNT = 16
const NOTEBOOK_BG = '#fcf8ef'
const NOTEBOOK_INK = '#8b6b4a'

function buildCats() {
  return Array.from({ length: CAT_COUNT }, (_, i) => {
    const t = (i / CAT_COUNT) * Math.PI * 2
    const hx = 16 * Math.sin(t) ** 3
    const hy = -(
      13 * Math.cos(t) -
      5 * Math.cos(2 * t) -
      2 * Math.cos(3 * t) -
      Math.cos(4 * t)
    )
    const scale = 2.2
    return {
      id: i,
      tx: `${hx * scale}vmin`,
      ty: `${hy * scale - 4}vmin`,
      rot: `${(i % 2 === 0 ? 1 : -1) * (12 + (i % 5) * 6)}deg`,
      delay: `${40 + i * 30}ms`,
      size: 64 + (i % 4) * 14,
    }
  })
}

const CATS = buildCats()

type Phase = 'hold' | 'burst' | 'morph'

type Flyer = {
  left: number
  top: number
  fontSize: number
  animate: boolean
  label: 'NasTask' | 'NasTales'
  hand: boolean
}

type Props = {
  onHidePage: () => void
  onComplete: () => void
}

/**
 * Reverse of enter / mirror of boot splash:
 * NasTales → center → NasTask, then morph to #app-logo while overlay fades → app shows through.
 */
export function MemoryExitSplash({ onHidePage, onComplete }: Props) {
  const finishedRef = useRef(false)
  const hiddenRef = useRef(false)
  const [phase, setPhase] = useState<Phase>('hold')
  const [burst, setBurst] = useState(false)
  const [cream, setCream] = useState(true)
  const [flyer, setFlyer] = useState<Flyer | null>(null)

  const finish = () => {
    if (finishedRef.current) return
    finishedRef.current = true
    onComplete()
  }

  useLayoutEffect(() => {
    document.documentElement.dataset.memoryExit = '1'
    const source = document.getElementById('memory-brand-logo')
    if (source) {
      const r = source.getBoundingClientRect()
      const cs = getComputedStyle(source)
      setFlyer({
        left: r.left,
        top: r.top,
        fontSize: parseFloat(cs.fontSize) || 18,
        animate: false,
        label: 'NasTales',
        hand: true,
      })
    } else {
      setFlyer({
        left: window.innerWidth / 2 - 48,
        top: window.innerHeight / 2 - 20,
        fontSize: Math.min(72, window.innerWidth * 0.14),
        animate: false,
        label: 'NasTales',
        hand: true,
      })
    }
  }, [])

  useEffect(() => {
    const img = new Image()
    img.src = catSrc
  }, [])

  useEffect(() => {
    const timers: number[] = []
    let raf1 = 0
    let raf2 = 0

    timers.push(window.setTimeout(finish, 2800))

    timers.push(
      window.setTimeout(() => {
        const fontSize = Math.min(72, window.innerWidth * 0.14)
        const width = fontSize * 4.6
        const height = fontSize * 1.15
        setFlyer((prev) =>
          prev
            ? {
                ...prev,
                left: (window.innerWidth - width) / 2,
                top: (window.innerHeight - height) / 2,
                fontSize,
                animate: true,
              }
            : prev,
        )
      }, 40),
    )

    timers.push(
      window.setTimeout(() => {
        setBurst(true)
        setPhase('burst')
      }, 850),
    )

    timers.push(
      window.setTimeout(() => {
        // Opaque app-colored cover, then drop notebook underneath (no flash)
        setCream(false)
        if (!hiddenRef.current) {
          hiddenRef.current = true
          onHidePage()
        }
        setFlyer((prev) =>
          prev
            ? {
                ...prev,
                label: 'NasTask',
                hand: false,
                fontSize: Math.min(72, window.innerWidth * 0.14),
                animate: true,
              }
            : prev,
        )
      }, 900),
    )

    // Morph: land on header logo + fade overlay → app appears (boot splash style)
    timers.push(
      window.setTimeout(() => {
        const dest = document.getElementById('app-logo')
        if (!dest) {
          finish()
          return
        }
        const to = dest.getBoundingClientRect()
        if (to.width < 2 || to.height < 2) {
          finish()
          return
        }
        const toCs = getComputedStyle(dest)

        setFlyer((prev) =>
          prev
            ? {
                ...prev,
                animate: false,
                label: 'NasTask',
                hand: false,
              }
            : prev,
        )
        setPhase('morph')

        raf1 = requestAnimationFrame(() => {
          raf2 = requestAnimationFrame(() => {
            setFlyer({
              left: to.left,
              top: to.top,
              fontSize: parseFloat(toCs.fontSize) || 18,
              animate: true,
              label: 'NasTask',
              hand: false,
            })
          })
        })
      }, 1800),
    )

    timers.push(window.setTimeout(finish, 2600))

    return () => {
      timers.forEach(clearTimeout)
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const flyerStyle: CSSProperties | undefined = flyer
    ? {
        position: 'fixed',
        left: flyer.left,
        top: flyer.top,
        fontSize: flyer.fontSize,
        lineHeight: 1.25,
        margin: 0,
        opacity: 1,
        zIndex: 10,
        transition: flyer.animate
          ? 'left 0.7s var(--ease-out-soft), top 0.7s var(--ease-out-soft), font-size 0.7s var(--ease-out-soft), color 0.45s ease'
          : 'none',
        color: flyer.hand ? NOTEBOOK_INK : undefined,
        fontFamily: flyer.hand ? `'Caveat', cursive` : undefined,
        fontWeight: 700,
        ...(flyer.hand
          ? { backgroundImage: 'none', WebkitTextFillColor: NOTEBOOK_INK }
          : {}),
      }
    : undefined

  return (
    <div className="fixed inset-0 z-[220] overflow-hidden pointer-events-none" aria-hidden>
      <div
        className={cn('absolute inset-0', phase === 'morph' && 'splash-fade-bg')}
        style={{
          backgroundColor: cream ? NOTEBOOK_BG : 'hsl(var(--background))',
          transition: !cream ? 'background-color 0.45s ease' : undefined,
          backgroundImage: cream
            ? undefined
            : `
            radial-gradient(ellipse 80% 50% at 0% -10%, hsl(var(--glow-a) / 0.14), transparent),
            radial-gradient(ellipse 60% 40% at 100% 0%, hsl(var(--glow-b) / 0.12), transparent),
            radial-gradient(ellipse 50% 30% at 50% 100%, hsl(var(--glow-c) / 0.08), transparent)
          `,
        }}
      />

      {burst &&
        CATS.map((cat) => (
          <img
            key={cat.id}
            src={catSrc}
            alt=""
            draggable={false}
            className={cn(
              'splash-cat absolute left-1/2 top-1/2 z-0 rounded-2xl object-cover shadow-lg',
              phase === 'morph' && 'splash-cat-fade',
            )}
            style={
              {
                width: cat.size,
                height: cat.size,
                '--tx': cat.tx,
                '--ty': cat.ty,
                '--rot': cat.rot,
                animationDelay: cat.delay,
              } as CSSProperties
            }
          />
        ))}

      {flyer && (
        <h1
          className={cn(
            'relative z-10 select-none tracking-tight whitespace-nowrap font-bold',
            !flyer.hand && APP_LOGO_CLASS,
          )}
          style={flyerStyle}
        >
          {flyer.label}
        </h1>
      )}
    </div>
  )
}
