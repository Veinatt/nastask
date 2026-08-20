import { useEffect, useRef, useState } from 'react'

type Options = {
  enterMs?: number
  eraseMs?: number
  typeMs?: number
  pauseMs?: number
  settleMs?: number
  onCleared?: () => void
  onDone?: () => void
}

/**
 * Focus caret → erase → switch style → type new target.
 * Geometry-safe: callers should keep this only while the label is NOT FLIP-flying.
 */
export function useTypewriterSwap(
  target: string,
  styleHand: boolean,
  options: Options = {},
) {
  const enterMs = options.enterMs ?? 480
  const eraseMs = options.eraseMs ?? 48
  const typeMs = options.typeMs ?? 58
  const pauseMs = options.pauseMs ?? 160
  const settleMs = options.settleMs ?? 220
  const onClearedRef = useRef(options.onCleared)
  const onDoneRef = useRef(options.onDone)
  onClearedRef.current = options.onCleared
  onDoneRef.current = options.onDone

  const [text, setText] = useState(target)
  const [hand, setHand] = useState(styleHand)
  const [busy, setBusy] = useState(false)
  const genRef = useRef(0)
  const textRef = useRef(text)
  textRef.current = text

  useEffect(() => {
    if (textRef.current === target && hand === styleHand) {
      return
    }

    const id = ++genRef.current
    const timers: number[] = []
    let current = textRef.current
    setBusy(true)

    const eraseStep = () => {
      if (genRef.current !== id) return
      if (current.length === 0) {
        setHand(styleHand)
        onClearedRef.current?.()
        timers.push(window.setTimeout(typeStep, pauseMs))
        return
      }
      current = current.slice(0, -1)
      setText(current)
      timers.push(window.setTimeout(eraseStep, eraseMs))
    }

    const typeStep = () => {
      if (genRef.current !== id) return
      if (current.length >= target.length) {
        setText(target)
        timers.push(
          window.setTimeout(() => {
            if (genRef.current !== id) return
            setBusy(false)
            onDoneRef.current?.()
          }, settleMs),
        )
        return
      }
      current = target.slice(0, current.length + 1)
      setText(current)
      timers.push(window.setTimeout(typeStep, typeMs))
    }

    timers.push(window.setTimeout(eraseStep, enterMs))

    return () => {
      timers.forEach(clearTimeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, styleHand, enterMs, eraseMs, typeMs, pauseMs, settleMs])

  return { text, hand, busy }
}
