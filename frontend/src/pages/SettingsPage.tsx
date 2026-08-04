import { useEffect, useState, type ReactNode } from 'react'
import {
  Check,
  Coffee,
  Monitor,
  Moon,
  Pencil,
  Sun,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSettings } from '@/hooks/useSettings'
import { useTheme } from '@/hooks/useTheme'
import { useTelegram } from '@/hooks/useTelegram'
import { useDictionaries } from '@/hooks/useDictionaries'
import { useI18n } from '@/hooks/useI18n'
import { SegmentedControl } from '@/components/ui/segmented-control'
import type { ThemePreference } from '@/lib/theme'
import type { AppLocale } from '@/lib/i18n'
import type { DictKind } from '@/db/types'

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
    <section className="surface-panel p-4 sm:p-5 space-y-3 h-full flex flex-col">
      <h2 className="font-semibold text-primary-soft/90">{title}</h2>
      <div className="flex gap-2">
        <Input
          value={name}
          placeholder={t('settings.dict.newPlaceholder')}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add()
          }}
        />
        <Button type="button" variant="secondary" onClick={add} disabled={!name.trim()}>
          {t('common.add')}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <ul className="space-y-1 flex-1">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-2 text-sm py-1.5 border-b border-border/60 last:border-0"
          >
            {editingId === item.id ? (
              <>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-8"
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
                    className="h-8 w-8 text-emerald-500"
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
                <span className="min-w-0 truncate">{item.name}</span>
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
                    className="h-8 w-8 text-destructive hover:text-destructive"
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
  const { inTelegram } = useTelegram()
  const [hourlyRate, setHourlyRate] = useState('')
  const [taxRate, setTaxRate] = useState('')
  const [currency, setCurrency] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const themeOptions: {
    value: ThemePreference
    label: string
    icon: ReactNode
  }[] = [
    { value: 'light', label: t('settings.theme.light'), icon: <Sun /> },
    { value: 'dark', label: t('settings.theme.dark'), icon: <Moon /> },
    { value: 'cozy', label: t('settings.theme.cozy'), icon: <Coffee /> },
    {
      value: 'system',
      label: inTelegram ? t('settings.theme.telegram') : t('settings.theme.system'),
      icon: <Monitor />,
    },
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

  return (
    <div className="grid gap-6">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('settings.title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('settings.subtitle')}
        </p>
      </header>

      <section className="surface-panel p-4 sm:p-5 space-y-3">
        <h2 className="font-semibold">{t('settings.theme')}</h2>
        <SegmentedControl
          fullWidth
          value={preference}
          onChange={setPreference}
          options={themeOptions}
        />
      </section>

      <section className="surface-panel p-4 sm:p-5 space-y-3">
        <h2 className="font-semibold">{t('settings.language')}</h2>
        <SegmentedControl
          fullWidth
          value={locale}
          onChange={setLocale}
          options={languageOptions}
        />
      </section>

      <section className="surface-panel p-4 sm:p-5 space-y-4">
        <h2 className="font-semibold">{t('settings.pay')}</h2>
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

      <div className="grid gap-4 md:grid-cols-3">
        <DictSection kind="categories" title={t('settings.dict.categories')} />
        <DictSection kind="descriptions" title={t('settings.dict.descriptions')} />
        <DictSection kind="units" title={t('settings.dict.units')} />
      </div>
    </div>
  )
}
