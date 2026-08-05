import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import catSrc from '@/assets/cat.jpg'

const CAT_COUNT = 16

/** Classic parametric heart → screen offsets (vmin). */
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

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const logoRef = useRef<HTMLHeadingElement>(null)
  const [phase, setPhase] = useState<Phase>('hold')
  const [logoBox, setLogoBox] = useState<LogoBox | null>(null)
  const reducedMotion = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const img = new Image()
    img.src = catSrc
    // Ensure Telegram loader is dismissed while splash runs
    try {
      ;(
        window as unknown as { Telegram?: { WebApp?: { ready?: () => void } } }
      ).Telegram?.WebApp?.ready?.()
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const timers: number[] = []
    let raf1 = 0
    let raf2 = 0

    const finish = () => {
      if (cancelled) return
      // Reveal real title first, then parent unmounts splash (same turn)
      document.documentElement.dataset.splash = 'done'
      onComplete()
    }

    if (reducedMotion.current) {
      timers.push(window.setTimeout(finish, 400))
      return () => {
        cancelled = true
        timers.forEach(clearTimeout)
      }
    }

    timers.push(
      window.setTimeout(() => {
        if (!cancelled) setPhase('burst')
      }, 1400),
    )

    timers.push(
      window.setTimeout(() => {
        if (cancelled) return
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

        // Match the real h1 box (includes main/header padding offset in viewport)
        setLogoBox({
          left: from.left,
          top: from.top,
          fontSize: parseFloat(fromCs.fontSize),
          lineHeight: fromCs.lineHeight,
          letterSpacing: fromCs.letterSpacing,
          fontWeight: fromCs.fontWeight,
          animate: false,
        })
        setPhase('morph')

        raf1 = requestAnimationFrame(() => {
          raf2 = requestAnimationFrame(() => {
            if (cancelled) return
            setLogoBox({
              left: to.left,
              top: to.top,
              fontSize: parseFloat(toCs.fontSize),
              lineHeight: toCs.lineHeight,
              letterSpacing: toCs.letterSpacing,
              fontWeight: toCs.fontWeight,
              animate: true,
            })
          })
        })
      }, 2550),
    )

    timers.push(window.setTimeout(finish, 3550))

    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [onComplete])

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
        transition: logoBox.animate
          ? 'left 0.9s var(--ease-out-soft), top 0.9s var(--ease-out-soft), font-size 0.9s var(--ease-out-soft), line-height 0.9s var(--ease-out-soft)'
          : 'none',
      }
    : undefined

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

      {(phase === 'burst' || phase === 'morph') &&
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
          !logoBox && 'text-6xl sm:text-7xl md:text-8xl',
          phase === 'hold' && 'splash-logo-in',
        )}
        style={logoStyle}
      >
        NasTask
      </h1>
    </div>
  )
}
