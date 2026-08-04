import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DictAutocomplete } from '@/components/dicts/DictAutocomplete'
import { useI18n } from '@/hooks/useI18n'
import { t } from '@/lib/i18n'
import { generateId } from '@/utils/idGenerator'
import type { WorkItemInput } from '@/db/types'

export type WorkItemDraft = {
  key: string
  categoryName: string
  categoryId: string
  descriptionName: string
  descriptionId: string
  quantity: string
  unitName: string
  unitId: string
}

export function emptyWorkItemDraft(): WorkItemDraft {
  return {
    key: generateId(),
    categoryName: '',
    categoryId: '',
    descriptionName: '',
    descriptionId: '',
    quantity: '1',
    unitName: '',
    unitId: '',
  }
}

type Props = {
  items: WorkItemDraft[]
  onChange: (items: WorkItemDraft[]) => void
}

export function WorkItemsEditor({ items, onChange }: Props) {
  const { t } = useI18n()

  const update = (key: string, patch: Partial<WorkItemDraft>) => {
    onChange(items.map((i) => (i.key === key ? { ...i, ...patch } : i)))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{t('workItems.label')}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...items, emptyWorkItemDraft()])}
        >
          <Plus className="h-4 w-4 mr-1" />
          {t('workItems.add')}
        </Button>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('workItems.emptyHint')}</p>
      )}

      {items.map((item) => (
        <div key={item.key} className="grid gap-2 rounded-lg border p-3">
          <DictAutocomplete
            kind="categories"
            value={item.categoryName}
            resolvedId={item.categoryId}
            placeholder={t('workItems.category')}
            onChange={(name) => update(item.key, { categoryName: name, categoryId: '' })}
            onResolved={(id, name) =>
              update(item.key, { categoryId: id, categoryName: name })
            }
          />
          <DictAutocomplete
            kind="descriptions"
            value={item.descriptionName}
            resolvedId={item.descriptionId}
            placeholder={t('workItems.description')}
            onChange={(name) =>
              update(item.key, { descriptionName: name, descriptionId: '' })
            }
            onResolved={(id, name) =>
              update(item.key, { descriptionId: id, descriptionName: name })
            }
          />
          <div className="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-2">
            <Input
              type="number"
              min={0.01}
              step="any"
              value={item.quantity}
              onChange={(e) => update(item.key, { quantity: e.target.value })}
              placeholder={t('workItems.quantity')}
            />
            <DictAutocomplete
              kind="units"
              value={item.unitName}
              resolvedId={item.unitId}
              placeholder={t('workItems.unit')}
              onChange={(name) => update(item.key, { unitName: name, unitId: '' })}
              onResolved={(id, name) => update(item.key, { unitId: id, unitName: name })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-destructive hover:text-destructive"
              onClick={() => onChange(items.filter((i) => i.key !== item.key))}
              aria-label={t('workItems.deleteAria')}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

/** Convert drafts to API payload. Requires ids already confirmed (pick or checkmark). */
export function draftsToWorkItems(drafts: WorkItemDraft[]): WorkItemInput[] {
  const result: WorkItemInput[] = []
  for (const d of drafts) {
    if (!d.categoryName.trim() && !d.descriptionName.trim() && !d.unitName.trim()) {
      continue
    }
    if (!d.categoryName.trim() || !d.descriptionName.trim() || !d.unitName.trim()) {
      throw new Error(t('workItems.fillAll'))
    }
    if (!d.categoryId) {
      throw new Error(t('workItems.confirmCategory'))
    }
    if (!d.descriptionId) {
      throw new Error(t('workItems.confirmDescription'))
    }
    if (!d.unitId) {
      throw new Error(t('workItems.confirmUnit'))
    }
    const quantity = Number(d.quantity)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error(t('workItems.quantityInvalid'))
    }
    result.push({
      id: generateId(),
      categoryId: d.categoryId,
      descriptionId: d.descriptionId,
      quantity,
      unitId: d.unitId,
    })
  }
  return result
}
