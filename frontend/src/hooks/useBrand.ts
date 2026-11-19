import { useCallback, useEffect, useState } from 'react'
import {
  BRAND_CHANGE_EVENT,
  BRAND_SAVED_CHANGE_EVENT,
  canAddBrandSwatch,
  DEFAULT_BRAND_HEX,
  getBrandHex,
  getBrandSwatches,
  normalizeHex,
  removeBrandSwatch,
  saveBrandHex,
  setBrandHex,
} from '@/lib/brand'

export function useBrand() {
  const [hex, setHexState] = useState<string>(() => getBrandHex() ?? DEFAULT_BRAND_HEX)
  const [isCustom, setIsCustom] = useState(() => getBrandHex() != null)
  const [swatches, setSwatches] = useState(() => getBrandSwatches())
  const [canAdd, setCanAdd] = useState(() => canAddBrandSwatch())

  const refreshSwatches = () => {
    setSwatches(getBrandSwatches())
    setCanAdd(canAddBrandSwatch())
  }

  useEffect(() => {
    const syncBrand = () => {
      const stored = getBrandHex()
      setIsCustom(stored != null)
      setHexState(stored ?? DEFAULT_BRAND_HEX)
    }
    const syncSwatches = () => refreshSwatches()
    window.addEventListener(BRAND_CHANGE_EVENT, syncBrand)
    window.addEventListener(BRAND_SAVED_CHANGE_EVENT, syncSwatches)
    window.addEventListener('storage', syncBrand)
    window.addEventListener('storage', syncSwatches)
    return () => {
      window.removeEventListener(BRAND_CHANGE_EVENT, syncBrand)
      window.removeEventListener(BRAND_SAVED_CHANGE_EVENT, syncSwatches)
      window.removeEventListener('storage', syncBrand)
      window.removeEventListener('storage', syncSwatches)
    }
  }, [])

  const applyCommitted = useCallback((stored: string | null) => {
    setHexState(stored ?? DEFAULT_BRAND_HEX)
    setIsCustom(stored != null)
  }, [])

  const setHex = useCallback(
    (next: string) => {
      const n = normalizeHex(next)
      if (!n) return
      // Sky = CSS default — don't persist as "custom"
      if (n === DEFAULT_BRAND_HEX) {
        setBrandHex(null)
        applyCommitted(null)
        return
      }
      setBrandHex(n)
      applyCommitted(getBrandHex())
    },
    [applyCommitted],
  )

  const commitHex = useCallback(
    (next: string, opts?: { save?: boolean }) => {
      const n = normalizeHex(next)
      if (!n) return
      if (n === DEFAULT_BRAND_HEX) {
        setBrandHex(null)
        applyCommitted(null)
        refreshSwatches()
        return
      }
      setBrandHex(n)
      if (opts?.save) saveBrandHex(n)
      applyCommitted(getBrandHex())
      if (opts?.save) refreshSwatches()
    },
    [applyCommitted],
  )

  const reset = useCallback(() => {
    setBrandHex(null)
    applyCommitted(null)
  }, [applyCommitted])

  const removeSwatch = useCallback(
    (color: string) => {
      const n = normalizeHex(color)
      const active = normalizeHex(getBrandHex() ?? '')
      removeBrandSwatch(color)
      // Removing the active color must fall back to Sky
      if (n && active && n === active) {
        setBrandHex(null)
        applyCommitted(null)
      }
      refreshSwatches()
    },
    [applyCommitted],
  )

  return {
    hex,
    isCustom,
    swatches,
    canAddSaved: canAdd,
    setHex,
    commitHex,
    reset,
    removeSwatch,
  }
}
