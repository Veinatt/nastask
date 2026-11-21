/** User-chosen brand accent — drives --brand-h/s/l on <html>. */

const STORAGE_KEY = 'nastask-brand'
const SAVED_KEY = 'nastask-brand-saved'
const HIDDEN_PRESETS_KEY = 'nastask-brand-hidden-presets'
export const BRAND_CHANGE_EVENT = 'nastask-brand'
export const BRAND_SAVED_CHANGE_EVENT = 'nastask-brand-saved'

/** Max selectable swatches (Violet/Orange + customs). Base Sky does not count. */
export const MAX_BRAND_SWATCHES = 5

/** Default light primary (#72B3FF). */
export const DEFAULT_BRAND_HEX = '#72B3FF'

export type BrandPreset = {
  hex: string
  label: string
  /** Can be dismissed from the swatch row (still ships as default). */
  removable?: boolean
}

export const BRAND_PRESETS: BrandPreset[] = [
  { hex: '#72B3FF', label: 'Sky' },
  { hex: '#A78BFA', label: 'Violet', removable: true },
  { hex: '#F97316', label: 'Orange', removable: true },
]

const PRESET_SET = new Set(BRAND_PRESETS.map((p) => p.hex.toUpperCase()))
const REMOVABLE_PRESET_SET = new Set(
  BRAND_PRESETS.filter((p) => p.removable).map((p) => p.hex.toUpperCase()),
)

export type BrandHsl = { h: number; s: number; l: number }
/** HSV — matches the picker plane (top-right = full chroma, not pastel). */
export type BrandHsv = { h: number; s: number; v: number }

export function normalizeHex(raw: string): string | null {
  const v = raw.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{6}$/.test(v)) return `#${v.toUpperCase()}`
  if (/^[0-9a-fA-F]{3}$/.test(v)) {
    const [r, g, b] = v.split('')
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase()
  }
  return null
}

export function hexToHsl(hex: string): BrandHsl | null {
  const n = normalizeHex(hex)
  if (!n) return null
  const r = parseInt(n.slice(1, 3), 16) / 255
  const g = parseInt(n.slice(3, 5), 16) / 255
  const b = parseInt(n.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l: l * 100 }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6
      break
    case g:
      h = ((b - r) / d + 2) / 6
      break
    default:
      h = ((r - g) / d + 4) / 6
  }
  return { h: h * 360, s: s * 100, l: l * 100 }
}

export function hslToHex(h: number, s: number, l: number): string {
  const S = s / 100
  const L = l / 100
  const C = (1 - Math.abs(2 * L - 1)) * S
  const X = C * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = L - C / 2
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [C, X, 0]
  else if (h < 120) [r, g, b] = [X, C, 0]
  else if (h < 180) [r, g, b] = [0, C, X]
  else if (h < 240) [r, g, b] = [0, X, C]
  else if (h < 300) [r, g, b] = [X, 0, C]
  else [r, g, b] = [C, 0, X]
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase()
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (v: number) =>
    Math.round(clamp01(v) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase()
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n))
}

export function hsvToHex(h: number, s: number, v: number): string {
  const S = s / 100
  const V = v / 100
  const C = V * S
  const X = C * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = V - C
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [C, X, 0]
  else if (h < 120) [r, g, b] = [X, C, 0]
  else if (h < 180) [r, g, b] = [0, C, X]
  else if (h < 240) [r, g, b] = [0, X, C]
  else if (h < 300) [r, g, b] = [X, 0, C]
  else [r, g, b] = [C, 0, X]
  return rgbToHex(r + m, g + m, b + m)
}

export function hexToHsv(hex: string): BrandHsv | null {
  const n = normalizeHex(hex)
  if (!n) return null
  const r = parseInt(n.slice(1, 3), 16) / 255
  const g = parseInt(n.slice(3, 5), 16) / 255
  const b = parseInt(n.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      default:
        h = ((r - g) / d + 4) / 6
    }
  }
  const s = max === 0 ? 0 : (d / max) * 100
  return { h: h * 360, s, v: max * 100 }
}

export function isPresetHex(hex: string): boolean {
  const n = normalizeHex(hex)
  return n != null && PRESET_SET.has(n)
}

export function getBrandHex(): string | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (!value) return null
    return normalizeHex(value)
  } catch {
    return null
  }
}

export function getSavedBrandHexes(): string[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const out: string[] = []
    for (const item of parsed) {
      if (typeof item !== 'string') continue
      const n = normalizeHex(item)
      if (!n || PRESET_SET.has(n) || out.includes(n)) continue
      out.push(n)
      if (out.length >= MAX_BRAND_SWATCHES) break
    }
    return out
  } catch {
    return []
  }
}

function writeSaved(list: string[]): void {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(list.slice(0, MAX_BRAND_SWATCHES)))
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(BRAND_SAVED_CHANGE_EVENT))
}

function selectableSwatchCount(): number {
  return getBrandSwatches().filter((s) => s.hex !== DEFAULT_BRAND_HEX).length
}

/** Persist a custom color to the saved palette (skips presets / dupes / full row). */
export function saveBrandHex(hex: string): void {
  const n = normalizeHex(hex)
  if (!n || PRESET_SET.has(n)) return
  const existing = getSavedBrandHexes()
  if (existing.includes(n)) {
    writeSaved([n, ...existing.filter((h) => h !== n)])
    return
  }
  // Violet/Orange + customs share the 5-slot cap; Sky excluded
  if (selectableSwatchCount() >= MAX_BRAND_SWATCHES) return
  writeSaved([n, ...existing])
}

export function removeSavedBrandHex(hex: string): void {
  const n = normalizeHex(hex)
  if (!n) return
  writeSaved(getSavedBrandHexes().filter((h) => h !== n))
}

export function getHiddenPresetHexes(): string[] {
  try {
    const raw = localStorage.getItem(HIDDEN_PRESETS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((x): x is string => typeof x === 'string')
      .map((x) => normalizeHex(x))
      .filter((x): x is string => x != null && REMOVABLE_PRESET_SET.has(x))
  } catch {
    return []
  }
}

/** Hide a default removable preset (Violet / Orange) from the swatch row. */
export function hidePresetHex(hex: string): void {
  const n = normalizeHex(hex)
  if (!n || !REMOVABLE_PRESET_SET.has(n)) return
  const next = [...new Set([...getHiddenPresetHexes(), n])]
  try {
    localStorage.setItem(HIDDEN_PRESETS_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(BRAND_SAVED_CHANGE_EVENT))
}

/** Swatches for the settings row: Sky + up to 5 selectables (presets/customs). */
export function getBrandSwatches(): {
  hex: string
  label?: string
  removable: boolean
}[] {
  const hidden = new Set(getHiddenPresetHexes())
  const out: { hex: string; label?: string; removable: boolean }[] = []
  let selectable = 0
  for (const p of BRAND_PRESETS) {
    if (hidden.has(p.hex.toUpperCase())) continue
    const isBase = p.hex.toUpperCase() === DEFAULT_BRAND_HEX
    if (!isBase && selectable >= MAX_BRAND_SWATCHES) continue
    out.push({
      hex: p.hex,
      label: p.label,
      removable: Boolean(p.removable),
    })
    if (!isBase) selectable += 1
  }
  for (const hex of getSavedBrandHexes()) {
    if (selectable >= MAX_BRAND_SWATCHES) break
    if (out.some((s) => s.hex === hex)) continue
    out.push({ hex, removable: true })
    selectable += 1
  }
  return out
}

export function canAddBrandSwatch(): boolean {
  return selectableSwatchCount() < MAX_BRAND_SWATCHES
}

/** Remove a saved custom or hide a removable default preset. */
export function removeBrandSwatch(hex: string): void {
  const n = normalizeHex(hex)
  if (!n) return
  if (REMOVABLE_PRESET_SET.has(n)) {
    hidePresetHex(n)
    return
  }
  removeSavedBrandHex(n)
}

/** Commit brand: storage + CSS + notify listeners once. */
export function setBrandHex(hex: string | null): void {
  try {
    if (hex == null) localStorage.removeItem(STORAGE_KEY)
    else {
      const n = normalizeHex(hex)
      if (!n) return
      localStorage.setItem(STORAGE_KEY, n)
    }
  } catch {
    /* ignore */
  }
  applyBrandColor(getBrandHex())
  window.dispatchEvent(new Event(BRAND_CHANGE_EVENT))
}

/** Readable text-on-card channels from a brand fill (keeps gray brands gray). */
export function brandSoftFromHsl(hsl: BrandHsl): { s: number; l: number } {
  // Never invent chroma the swatch doesn't have (that made #454F5C titles blue).
  const s = Math.min(hsl.s, 70)
  // Bright pastels → darker text; already-dark fills keep their lightness.
  const l = hsl.l > 55 ? 48 : Math.min(Math.max(hsl.l, 22), 50)
  return { s, l }
}

/**
 * Push brand channels onto <html> as inline styles (override :root).
 * Dark theme ignores --brand-* (monochrome tokens). null → CSS defaults.
 */
export function applyBrandColor(hex: string | null): void {
  const root = document.documentElement
  if (!hex) {
    root.style.removeProperty('--brand-h')
    root.style.removeProperty('--brand-s')
    root.style.removeProperty('--brand-l')
    root.style.removeProperty('--brand-soft-s')
    root.style.removeProperty('--brand-soft-l')
    return
  }
  const hsl = hexToHsl(hex)
  if (!hsl) return
  const soft = brandSoftFromHsl(hsl)
  root.style.setProperty('--brand-h', String(Math.round(hsl.h)))
  root.style.setProperty('--brand-s', `${Math.round(hsl.s)}%`)
  root.style.setProperty('--brand-l', `${Math.round(hsl.l)}%`)
  root.style.setProperty('--brand-soft-s', `${Math.round(soft.s)}%`)
  root.style.setProperty('--brand-soft-l', `${Math.round(soft.l)}%`)
}
