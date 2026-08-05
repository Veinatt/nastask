import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import catSrc from '@/assets/cat.jpg'

const CAT_COUNT = 16

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

type LogoBox = {
  left: number
  top: number
  fontSize: number
  lineHeight: string
  letterSpacing: string
  fontWeight: string
  animate: boolean
}

type SplashScreenProps = {
  onComplete: () => void
}

function signalReady() {
  try {
    ;(
      window as unknown as { Telegram?: { WebApp?: { ready?: () => void } } }
    ).Telegram?.WebApp?.ready?.()
  } catch {
    // ignore
  }
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const logoRef = useRef<HTMLHeadingElement>(null)
  const finishedRef = useRef(false)
  const [phase, setPhase] = useState<Phase>('hold')
  const [logoBox, setLogoBox] = useState<LogoBox | null>(null)
  const [burst, setBurst] = useState(false)

  const finish = () => {
    if (finishedRef.current) return
    finishedRef.current = true
    document.documentElement.dataset.splash = 'done'
    onComplete()
  }

  useEffect(() => {
    signalReady()
    const img = new Image()
    img.src = catSrc
  }, [])

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timers: number[] = []
    let raf1 = 0
    let raf2 = 0

    // Absolute failsafe — never leave user on blank splash
    timers.push(window.setTimeout(finish, reduced ? 500 : 4500))

    if (reduced) {
      timers.push(window.setTimeout(finish, 400))
      return () => timers.forEach(clearTimeout)
    }

    timers.push(
      window.setTimeout(() => {
        setBurst(true)
        setPhase('burst')
      }, 1200),
    )

    timers.push(
      window.setTimeout(() => {
        const logo = logoRef.current
        const dest = document.getElementById('home-brand-title')
        if (!logo || !dest) {
          setPhase('morph')
          return
        }

        const from = logo.getBoundingClientRect()
        const to = dest.getBoundingClientRect()
        const fromCs = getComputedStyle(logo)
        const toCs = getComputedStyle(dest)

        setLogoBox({
          left: from.left,
          top: from.top,
          fontSize: parseFloat(fromCs.fontSize) || 48,
          lineHeight: fromCs.lineHeight,
          letterSpacing: fromCs.letterSpacing,
          fontWeight: fromCs.fontWeight,
          animate: false,
        })
        setPhase('morph')

        raf1 = requestAnimationFrame(() => {
          raf2 = requestAnimationFrame(() => {
            setLogoBox({
              left: to.left,
              top: to.top,
              fontSize: parseFloat(toCs.fontSize) || 24,
              lineHeight: toCs.lineHeight,
              letterSpacing: toCs.letterSpacing,
              fontWeight: toCs.fontWeight,
              animate: true,
            })
          })
        })
      }, 2300),
    )

    timers.push(window.setTimeout(finish, 3400))

    return () => {
      timers.forEach(clearTimeout)
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
    // finish/onComplete intentionally stable via ref + useCallback in App
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const logoStyle: CSSProperties | undefined = logoBox
    ? {
        position: 'fixed',
        left: logoBox.left,
        top: logoBox.top,
        fontSize: logoBox.fontSize,
        lineHeight: logoBox.lineHeight,
        letterSpacing: logoBox.letterSpacing,
        fontWeight: logoBox.fontWeight,
        margin: 0,
        opacity: 1,
        transition: logoBox.animate
          ? 'left 0.85s var(--ease-out-soft), top 0.85s var(--ease-out-soft), font-size 0.85s var(--ease-out-soft)'
          : 'none',
      }
    : {
        opacity: 1,
      }

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] overflow-hidden pointer-events-none',
        !logoBox && 'flex items-center justify-center',
      )}
      aria-hidden
    >
      <div
        className={cn(
          'absolute inset-0 bg-background',
          phase === 'morph' && 'splash-fade-bg',
        )}
        style={{
          backgroundImage: `
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

      <h1
        ref={logoRef}
        className={cn(
          'splash-logo relative z-10 select-none font-bold tracking-tight text-foreground',
          !logoBox && 'text-6xl sm:text-7xl md:text-8xl splash-logo-pop',
        )}
        style={logoStyle}
      >
        NasTask
      </h1>
    </div>
  )
}
