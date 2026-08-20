import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { APP_LOGO_GRADIENT } from '@/components/layout/Navigation'
import { useTypewriterSwap } from '@/hooks/useTypewriterSwap'

const NOTEBOOK_BG = '#fcf8ef'
const NOTEBOOK_INK = '#8b6b4a'
const CENTER_FS = () => Math.min(72, window.innerWidth * 0.14)
const MORPH_MS = 700

type Phase = 'approach' | 'type' | 'morph'

type Flyer = {
  left: number
  top: number
  fontSize: number
  lineHeight: string
  letterSpacing: string
  fontWeight: string
  animate: boolean
}

type Props = {
  onComplete: () => void
}

/**
 * 1) NasTask flies from #app-logo → center (no caret)
 * 2) Center typewriter → NasTale (caret only here)
 * 3) Frozen NasTale FLIP → #memory-brand-logo (SplashScreen-style left/top)
 */
export function MemoryEnterSplash({ onComplete }: Props) {
  const finishedRef = useRef(false)
  const logoRef = useRef<HTMLHeadingElement>(null)
  const morphStartedRef = useRef(false)
  const [phase, setPhase] = useState<Phase>('approach')
  const [cream, setCream] = useState(false)
  const [flyer, setFlyer] = useState<Flyer | null>(null)
  const [swapTo, setSwapTo] = useState<'NasTask' | 'NasTale'>('NasTask')
  const [swapHand, setSwapHand] = useState(false)
  const [typingDone, setTypingDone] = useState(false)

  const finish = () => {
    if (finishedRef.current) return
    finishedRef.current = true
    onComplete()
  }

  const { text, hand, busy } = useTypewriterSwap(swapTo, swapHand, {
    onCleared: () => setCream(true),
    onDone: () => setTypingDone(true),
  })

  // Caret off → measure → FLIP (same left/top path as SplashScreen)
  useLayoutEffect(() => {
    if (!typingDone || morphStartedRef.current || phase !== 'type') return
    const logo = logoRef.current
    const dest = document.getElementById('memory-brand-logo')
    if (!logo || !dest) {
      finish()
      return
    }
    const from = logo.getBoundingClientRect()
    const to = dest.getBoundingClientRect()
    if (from.width < 2 || from.height < 2 || to.width < 2 || to.height < 2) {
      finish()
      return
    }
    morphStartedRef.current = true
    const fromCs = getComputedStyle(logo)
    const toCs = getComputedStyle(dest)

    setFlyer({
      left: from.left,
      top: from.top,
      fontSize: parseFloat(fromCs.fontSize) || CENTER_FS(),
      lineHeight: fromCs.lineHeight,
      letterSpacing: fromCs.letterSpacing,
      fontWeight: fromCs.fontWeight,
      animate: false,
    })
    setPhase('morph')

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setFlyer({
          left: to.left,
          top: to.top,
          fontSize: parseFloat(toCs.fontSize) || 18,
          lineHeight: toCs.lineHeight,
          letterSpacing: toCs.letterSpacing,
          fontWeight: toCs.fontWeight,
          animate: true,
        })
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typingDone, phase])

  useLayoutEffect(() => {
    document.documentElement.dataset.memoryEnter = '1'
    const source = document.getElementById('app-logo')
    if (source) {
      const r = source.getBoundingClientRect()
      const cs = getComputedStyle(source)
      setFlyer({
        left: r.left + r.width / 2,
        top: r.top + r.height / 2,
        fontSize: parseFloat(cs.fontSize) || 18,
        lineHeight: '1.35',
        letterSpacing: cs.letterSpacing,
        fontWeight: cs.fontWeight,
        animate: false,
      })
    } else {
      setFlyer({
        left: window.innerWidth / 2,
        top: window.innerHeight / 2,
        fontSize: CENTER_FS(),
        lineHeight: '1.35',
        letterSpacing: 'normal',
        fontWeight: '700',
        animate: false,
      })
    }
  }, [])

  useEffect(() => {
    const timers: number[] = []
    timers.push(window.setTimeout(finish, 5000))

    timers.push(
      window.setTimeout(() => {
        setFlyer((prev) =>
          prev
            ? {
                ...prev,
                left: window.innerWidth / 2,
                top: window.innerHeight / 2,
                fontSize: CENTER_FS(),
                lineHeight: '1.35',
                animate: true,
              }
            : prev,
        )
      }, 40),
    )

    timers.push(
      window.setTimeout(() => {
        setFlyer(null)
        setPhase('type')
        setSwapTo('NasTale')
        setSwapHand(true)
      }, 780),
    )

    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (phase !== 'morph' || !flyer?.animate) return
    const t = window.setTimeout(finish, MORPH_MS + 80)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, flyer?.animate])

  const displayText = phase === 'approach' ? 'NasTask' : text
  const displayHand = phase === 'approach' ? false : hand
  const showCaret = phase === 'type' && busy && !typingDone

  const approachStyle: CSSProperties | undefined =
    phase === 'approach' && flyer
      ? {
          position: 'fixed',
          left: flyer.left,
          top: flyer.top,
          transform: 'translate(-50%, -50%)',
          fontSize: flyer.fontSize,
          lineHeight: flyer.lineHeight,
          letterSpacing: flyer.letterSpacing,
          fontWeight: flyer.fontWeight,
          margin: 0,
          transition: flyer.animate
            ? 'left 0.7s var(--ease-out-soft), top 0.7s var(--ease-out-soft), font-size 0.7s var(--ease-out-soft)'
            : 'none',
        }
      : undefined

  const morphStyle: CSSProperties | undefined =
    phase === 'morph' && flyer
      ? {
          position: 'fixed',
          left: flyer.left,
          top: flyer.top,
          fontSize: flyer.fontSize,
          lineHeight: flyer.lineHeight,
          letterSpacing: flyer.letterSpacing,
          fontWeight: flyer.fontWeight,
          margin: 0,
          transition: flyer.animate
            ? 'left 0.7s var(--ease-out-soft), top 0.7s var(--ease-out-soft), font-size 0.7s var(--ease-out-soft), line-height 0.7s var(--ease-out-soft), letter-spacing 0.7s var(--ease-out-soft)'
            : 'none',
          color: NOTEBOOK_INK,
          fontFamily: `'Caveat', cursive`,
          backgroundImage: 'none',
          WebkitTextFillColor: NOTEBOOK_INK,
        }
      : undefined

  const typeStyle: CSSProperties | undefined =
    phase === 'type'
      ? {
          fontSize: CENTER_FS(),
          lineHeight: 1.35,
          margin: 0,
          color: displayHand ? NOTEBOOK_INK : undefined,
          fontFamily: displayHand ? `'Caveat', cursive` : undefined,
          ...(displayHand
            ? { backgroundImage: 'none', WebkitTextFillColor: NOTEBOOK_INK }
            : {}),
        }
      : undefined

  return (
    <div
      className={cn(
        'fixed inset-0 z-[220] overflow-hidden pointer-events-none',
        phase === 'type' && 'flex items-center justify-center',
      )}
      aria-hidden
    >
      <div
        className={cn('absolute inset-0', phase === 'morph' && 'splash-fade-bg')}
        style={{
          backgroundColor: cream ? NOTEBOOK_BG : 'hsl(var(--background))',
          transition: cream ? 'background-color 0.45s ease' : undefined,
          backgroundImage: cream
            ? undefined
            : `
            radial-gradient(ellipse 80% 50% at 0% -10%, hsl(var(--glow-a) / 0.14), transparent),
            radial-gradient(ellipse 60% 40% at 100% 0%, hsl(var(--glow-b) / 0.12), transparent),
            radial-gradient(ellipse 50% 30% at 50% 100%, hsl(var(--glow-c) / 0.08), transparent)
          `,
        }}
      />

      <h1
        ref={logoRef}
        className={cn(
          'memory-flyer-text relative z-10 select-none tracking-tight',
          phase === 'approach' && APP_LOGO_GRADIENT,
          phase === 'type' && !displayHand && APP_LOGO_GRADIENT,
        )}
        style={
          phase === 'approach'
            ? approachStyle
            : phase === 'morph'
              ? morphStyle
              : typeStyle
        }
      >
        {phase === 'type' && showCaret ? (
          <span className="memory-type-line">
            <span className="memory-type-text">{displayText || '\u00a0'}</span>
            <span
              className={cn('memory-type-caret', displayHand && 'memory-type-caret-hand')}
              aria-hidden
            />
          </span>
        ) : (
          displayText
        )}
      </h1>
    </div>
  )
}
