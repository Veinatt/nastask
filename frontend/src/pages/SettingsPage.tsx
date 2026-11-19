import { useEffect, useState, type ReactNode } from 'react'
import {
  Check,
  Download,
  Moon,
  Pencil,
  Plus,
  Sun,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSettings } from '@/hooks/useSettings'
import { useTheme } from '@/hooks/useTheme'
import { useBrand } from '@/hooks/useBrand'
import { BrandColorDialog } from '@/components/settings/BrandColorDialog'
import { cn } from '@/lib/utils'
import { useDictionaries } from '@/hooks/useDictionaries'
import { useWorkTemplates } from '@/hooks/useWorkTemplates'
import { useI18n } from '@/hooks/useI18n'
import { useTripleTap } from '@/hooks/useTripleTap'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { MemoryExportViewer } from '@/components/memory/MemoryExportViewer'
import { DownloadBurstButton } from '@/components/reports/DownloadBurstButton'
import { requestApiDownload } from '@/utils/downloadFile'
import type { ThemePreference } from '@/lib/theme'
import type { AppLocale } from '@/lib/i18n'
import type { DictKind } from '@/db/types'

function TemplatesSection() {
  const { t } = useI18n()
  const { items, rename, remove } = useWorkTemplates()
  const cats = useDictionaries('categories')
  const descs = useDictionaries('descriptions')
  const units = useDictionaries('units')
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const nameOf = (list: { id: string; name: string }[], id: string) =>
    list.find((x) => x.id === id)?.name ?? '—'

  const startEdit = (id: string, current: string) => {
    setEditingId(id)
    setEditName(current)
    setError(null)
  }

  const saveEdit = () => {
    if (!editingId) return
    void rename(editingId, editName)
      .then(() => {
        setEditingId(null)
        setEditName('')
        setError(null)
      })
      .catch((err) => setError(err instanceof Error ? err.message : t('common.error')))
  }

  return (
    <section className="surface-card min-w-0 overflow-hidden px-4 py-4 space-y-3 h-full flex flex-col">
      <h2 className="section-label">{t('templates.title')}</h2>
      <p className="text-xs text-muted-foreground">{t('templates.settingsHint')}</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <ul className="min-w-0 space-y-1 flex-1">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex min-w-0 items-center justify-between gap-2 text-sm py-1.5 border-b border-border/60 last:border-0"
          >
            {editingId === item.id ? (
              <>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-8 min-w-0 flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit()
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  autoFocus
                />
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-success"
                    aria-label={t('common.save')}
                    onClick={saveEdit}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label={t('common.cancel')}
                    onClick={() => setEditingId(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="truncate font-medium" title={item.name}>
                    {item.name}
                  </p>
                  <p
                    className="truncate text-xs text-muted-foreground"
                    title={`${nameOf(cats.items, item.categoryId)} · ${nameOf(descs.items, item.descriptionId)} · ${item.defaultQuantity} ${nameOf(units.items, item.unitId)}`}
                  >
                    {nameOf(cats.items, item.categoryId)}
                    {' · '}
                    {nameOf(descs.items, item.descriptionId)}
                    {' · '}
                    {item.defaultQuantity} {nameOf(units.items, item.unitId)}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-primary-soft"
                    aria-label={t('common.edit')}
                    onClick={() => startEdit(item.id, item.name)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:bg-destructive/15 hover:text-destructive"
                    aria-label={t('common.delete')}
                    onClick={() =>
                      void remove(item.id).catch((err) =>
                        setError(err instanceof Error ? err.message : t('common.error')),
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-sm text-muted-foreground py-2">{t('common.empty')}</li>
        )}
      </ul>
    </section>
  )
}

function DictSection({ kind, title }: { kind: DictKind; title: string }) {
  const { t } = useI18n()
  const { items, create, rename, remove } = useDictionaries(kind)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const add = () => {
    void create(name)
      .then(() => {
        setName('')
        setError(null)
      })
      .catch((err) => setError(err instanceof Error ? err.message : t('common.error')))
  }

  const startEdit = (id: string, current: string) => {
    setEditingId(id)
    setEditName(current)
    setError(null)
  }

  const saveEdit = () => {
    if (!editingId) return
    void rename(editingId, editName)
      .then(() => {
        setEditingId(null)
        setEditName('')
        setError(null)
      })
      .catch((err) => setError(err instanceof Error ? err.message : t('common.error')))
  }

  return (
    <section className="surface-card min-w-0 overflow-hidden px-4 py-4 space-y-3 h-full flex flex-col">
      <h2 className="section-label">{title}</h2>
      <div className="flex min-w-0 gap-2">
        <Input
          value={name}
          placeholder={t('settings.dict.newPlaceholder')}
          className="min-w-0 flex-1"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add()
          }}
        />
        <Button type="button" variant="secondary" className="shrink-0" onClick={add} disabled={!name.trim()}>
          {t('common.add')}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <ul className="min-w-0 space-y-1 flex-1">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex min-w-0 items-center justify-between gap-2 text-sm py-1.5 border-b border-border/60 last:border-0"
          >
            {editingId === item.id ? (
              <>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-8 min-w-0 flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit()
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  autoFocus
                />
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-success"
                    aria-label={t('common.save')}
                    onClick={saveEdit}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label={t('common.cancel')}
                    onClick={() => setEditingId(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <span className="min-w-0 flex-1 truncate" title={item.name}>
                  {item.name}
                </span>
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-primary-soft"
                    aria-label={t('common.edit')}
                    onClick={() => startEdit(item.id, item.name)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:bg-destructive/15 hover:text-destructive"
                    aria-label={t('common.delete')}
                    onClick={() =>
                      void remove(item.id).catch((err) =>
                        setError(err instanceof Error ? err.message : t('common.error')),
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-sm text-muted-foreground py-2">{t('common.empty')}</li>
        )}
      </ul>
    </section>
  )
}

export function SettingsPage() {
  const { t, locale, setLocale } = useI18n()
  const { settings, updateSettings } = useSettings()
  const { preference, setPreference } = useTheme()
  const {
    hex: brandHex,
    isCustom: brandCustom,
    swatches: brandSwatches,
    canAddSaved: canAddBrand,
    setHex: setBrandHex,
    commitHex: commitBrandHex,
    reset: resetBrand,
    removeSwatch: removeBrandSwatch,
  } = useBrand()
  const [brandPickerOpen, setBrandPickerOpen] = useState(false)
  const [hourlyRate, setHourlyRate] = useState('')
  const [taxRate, setTaxRate] = useState('')
  const [currency, setCurrency] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exportBusy, setExportBusy] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [memoryViewerOpen, setMemoryViewerOpen] = useState(false)
  const onDarkThemeTriple = useTripleTap(() => setMemoryViewerOpen(true))

  const themeOptions: {
    value: ThemePreference
    label: string
    icon: ReactNode
  }[] = [
    { value: 'light', label: t('settings.theme.light'), icon: <Sun /> },
    { value: 'dark', label: t('settings.theme.dark'), icon: <Moon /> },
  ]

  const languageOptions: { value: AppLocale; label: string }[] = [
    { value: 'ru', label: t('settings.language.ru') },
    { value: 'be', label: t('settings.language.be') },
  ]

  useEffect(() => {
    setHourlyRate(String(settings.hourlyRate))
    setTaxRate(String(settings.taxRate))
    setCurrency(settings.currency)
  }, [settings.hourlyRate, settings.taxRate, settings.currency])

  const save = async () => {
    setError(null)
    setSaved(false)
    try {
      await updateSettings({
        hourlyRate: Number(hourlyRate),
        taxRate: Number(taxRate),
        currency: currency.trim() || 'BYN',
      })
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('settings.saveError'))
    }
  }

  const downloadJsonBackup = async () => {
    setExportBusy(true)
    setExportError(null)
    try {
      await requestApiDownload('json-backup')
    } catch (e) {
      setExportError(e instanceof Error ? e.message : t('common.error'))
      throw e
    } finally {
      setExportBusy(false)
    }
  }

  return (
    <div className="grid min-w-0 gap-6">
      {memoryViewerOpen && (
        <MemoryExportViewer onClose={() => setMemoryViewerOpen(false)} />
      )}
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-wide text-primary-soft/90 dark:text-foreground">
          {t('settings.title')}
        </h1>
      </header>

      <div className="grid gap-3">
        <div className="space-y-2">
          <h2 className="section-label">{t('settings.theme')}</h2>
          <SegmentedControl
            fullWidth
            value={preference}
            onChange={setPreference}
            onOptionTap={(value) => {
              if (value === 'dark') onDarkThemeTriple()
            }}
            options={themeOptions}
          />
        </div>
        {preference !== 'dark' ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="section-label">{t('settings.brand')}</h2>
              <button
                type="button"
                className={cn(
                  'section-label text-muted-foreground transition-opacity',
                  brandCustom
                    ? 'hover:text-foreground'
                    : 'invisible pointer-events-none',
                )}
                tabIndex={brandCustom ? 0 : -1}
                aria-hidden={!brandCustom}
                disabled={!brandCustom}
                onClick={resetBrand}
              >
                {t('settings.brand.reset')}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {brandSwatches.map((swatch) => {
                const active = brandHex.toUpperCase() === swatch.hex.toUpperCase()
                return (
                  <div key={swatch.hex} className="relative size-9 shrink-0">
                    <button
                      type="button"
                      title={swatch.label ?? swatch.hex}
                      aria-label={swatch.label ?? swatch.hex}
                      aria-pressed={active}
                      onClick={() => setBrandHex(swatch.hex)}
                      className={cn(
                        'box-border size-9 rounded-full border-2 transition-[box-shadow,border-color]',
                        active ? 'border-foreground' : 'border-transparent',
                      )}
                      style={{ backgroundColor: swatch.hex }}
                    />
                    {swatch.removable ? (
                      <button
                        type="button"
                        className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-card text-[10px] leading-none text-muted-foreground shadow-sm ring-1 ring-border"
                        aria-label={t('settings.brand.remove')}
                        title={t('settings.brand.remove')}
                        onClick={(e) => {
                          e.stopPropagation()
                          removeBrandSwatch(swatch.hex)
                        }}
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                )
              })}
              <button
                type="button"
                title={t('settings.brand.pick')}
                aria-label={t('settings.brand.pick')}
                disabled={!canAddBrand}
                onClick={() => setBrandPickerOpen(true)}
                className={cn(
                  'box-border flex size-9 shrink-0 items-center justify-center rounded-full',
                  'border-2 border-dashed border-primary text-primary',
                  'disabled:pointer-events-none disabled:opacity-20',
                )}
              >
                <Plus className="size-3.5" strokeWidth={2.25} />
              </button>
            </div>
            <BrandColorDialog
              open={brandPickerOpen}
              initialHex={brandHex}
              onOpenChange={setBrandPickerOpen}
              onSave={(hex) => commitBrandHex(hex, { save: true })}
            />
          </div>
        ) : null}
        <div className="space-y-2">
          <h2 className="section-label">{t('settings.language')}</h2>
          <SegmentedControl
            fullWidth
            value={locale}
            onChange={setLocale}
            options={languageOptions}
          />
        </div>
      </div>

      <section className="surface-card px-4 py-4 space-y-4">
        <h2 className="section-label">{t('settings.pay')}</h2>
        <p className="text-sm text-muted-foreground">{t('settings.timezone')}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="rate">{t('settings.hourlyRate')}</Label>
            <Input
              id="rate"
              type="number"
              min={0}
              step="any"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tax">{t('settings.tax')}</Label>
            <Input
              id="tax"
              type="number"
              min={0}
              max={100}
              step="any"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">{t('settings.currency')}</Label>
            <Input
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => void save()}>{t('common.save')}</Button>
          {saved && <span className="text-sm text-primary-soft">{t('settings.saved')}</span>}
          {error && <span className="text-sm text-destructive">{error}</span>}
        </div>
      </section>

      <div className="grid min-w-0 gap-3 md:grid-cols-2">
        <DictSection kind="categories" title={t('settings.dict.categories')} />
        <DictSection kind="descriptions" title={t('settings.dict.descriptions')} />
        <DictSection kind="units" title={t('settings.dict.units')} />
        <DictSection kind="expenses" title={t('settings.dict.expenses')} />
        <TemplatesSection />
      </div>

      <section className="surface-card px-4 py-4 space-y-4">
        <h2 className="section-label">{t('settings.export.title')}</h2>
        <DownloadBurstButton
          variant="secondary"
          className="w-full"
          wrapperClassName="flex w-full"
          disabled={exportBusy}
          onDownload={downloadJsonBackup}
        >
          <Download className="h-4 w-4 mr-1.5" />
          {t('settings.export.json')}
        </DownloadBurstButton>
        {exportError && <p className="text-sm text-destructive">{exportError}</p>}
      </section>
    </div>
  )
}
