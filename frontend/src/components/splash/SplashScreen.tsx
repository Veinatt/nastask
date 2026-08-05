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

/** macOS / desktop Telegram WKWebView often breaks FLIP + opacity animations → blank beige. */
function shouldUseLiteSplash(): boolean {
  try {
    const platform = String(
      (
        window as unknown as {
          Telegram?: { WebApp?: { platform?: string } }
        }
      ).Telegram?.WebApp?.platform ?? '',
    ).toLowerCase()
    if (
      platform === 'macos' ||
      platform === 'tdesktop' ||
      platform === 'web' ||
      platform === 'weba' ||
      platform === 'webk' ||
      platform === 'unigram'
    ) {
      return true
    }
  } catch {
    // ignore
  }
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true
    // Fine pointer + wide window ≈ desktop client embedding
    if (window.matchMedia('(pointer: fine) and (min-width: 900px)').matches) {
      return true
    }
  } catch {
    // ignore
  }
  return false
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const logoRef = useRef<HTMLHeadingElement>(null)
  const finishedRef = useRef(false)
  const [phase, setPhase] = useState<Phase>('hold')
  const [logoBox, setLogoBox] = useState<LogoBox | null>(null)
  const [burst, setBurst] = useState(false)
  const [lite] = useState(() => shouldUseLiteSplash())

  const finish = () => {
    if (finishedRef.current) return
    finishedRef.current = true
    document.documentElement.dataset.splash = 'done'
    onComplete()
  }

  useEffect(() => {
    signalReady()
    if (!lite) {
      const img = new Image()
      img.src = catSrc
    }
  }, [lite])

  useEffect(() => {
    const timers: number[] = []
    let raf1 = 0
    let raf2 = 0

    // Hard failsafe — never leave blank overlay (esp. macOS TG)
    timers.push(window.setTimeout(finish, lite ? 600 : 2800))

    if (lite) {
      timers.push(window.setTimeout(finish, 280))
      return () => timers.forEach(clearTimeout)
    }

    timers.push(
      window.setTimeout(() => {
        setBurst(true)
        setPhase('burst')
      }, 900),
    )

    timers.push(
      window.setTimeout(() => {
        const logo = logoRef.current
        const dest = document.getElementById('home-brand-title')
        if (!logo || !dest) {
          finish()
          return
        }

        const from = logo.getBoundingClientRect()
        const to = dest.getBoundingClientRect()
        // Invalid / zero rects → skip FLIP (common in odd WebViews)
        if (
          from.width < 2 ||
          from.height < 2 ||
          to.width < 2 ||
          to.height < 2 ||
          !Number.isFinite(to.left) ||
          !Number.isFinite(to.top)
        ) {
          finish()
          return
        }

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
      }, 1800),
    )

    timers.push(window.setTimeout(finish, 2600))

    return () => {
      timers.forEach(clearTimeout)
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lite])

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
        color: 'hsl(var(--foreground, 222 47% 11%))',
        transition: logoBox.animate
          ? 'left 0.7s var(--ease-out-soft), top 0.7s var(--ease-out-soft), font-size 0.7s var(--ease-out-soft)'
          : 'none',
      }
    : {
        opacity: 1,
        color: 'hsl(var(--foreground, 222 47% 11%))',
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

      {!lite &&
        burst &&
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
          'splash-logo relative z-10 select-none font-bold tracking-tight',
          !logoBox && 'text-6xl sm:text-7xl md:text-8xl splash-logo-pop',
        )}
        style={logoStyle}
      >
        NasTask
      </h1>
    </div>
  )
}
