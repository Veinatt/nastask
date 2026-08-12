import { useState, useRef } from 'react'
import { Bookmark, ChevronDown, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DictAutocomplete } from '@/components/dicts/DictAutocomplete'
import { useWorkTemplates } from '@/hooks/useWorkTemplates'
import { useDictionaries } from '@/hooks/useDictionaries'
import { useDropdownMaxWidth } from '@/hooks/useDropdownMaxWidth'
import { useI18n } from '@/hooks/useI18n'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { generateId } from '@/utils/idGenerator'
import type { WorkItemInput, WorkTemplate } from '@/db/types'

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

function isValidDraft(d: WorkItemDraft): boolean {
  const qty = Number(d.quantity)
  return Boolean(
    d.categoryId &&
      d.descriptionId &&
      d.unitId &&
      Number.isFinite(qty) &&
      qty > 0,
  )
}

function draftMatchesTemplate(d: WorkItemDraft, tpl: WorkTemplate): boolean {
  return (
    d.categoryId === tpl.categoryId &&
    d.descriptionId === tpl.descriptionId &&
    d.unitId === tpl.unitId &&
    Number(d.quantity) === Number(tpl.defaultQuantity)
  )
}

type Props = {
  items: WorkItemDraft[]
  onChange: (items: WorkItemDraft[]) => void
}

export function WorkItemsEditor({ items, onChange }: Props) {
  const { t } = useI18n()
  const { items: templates, create } = useWorkTemplates()
  const cats = useDictionaries('categories')
  const descs = useDictionaries('descriptions')
  const units = useDictionaries('units')
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const templatesTriggerRef = useRef<HTMLButtonElement>(null)
  const templatesMaxWidth = useDropdownMaxWidth(templatesOpen, templatesTriggerRef)
  const [saveDraft, setSaveDraft] = useState<WorkItemDraft | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)

  const nameOf = (list: { id: string; name: string }[], id: string) =>
    list.find((x) => x.id === id)?.name ?? ''

  const update = (key: string, patch: Partial<WorkItemDraft>) => {
    onChange(items.map((i) => (i.key === key ? { ...i, ...patch } : i)))
  }

  const applyTemplate = (tpl: WorkTemplate) => {
    const draft: WorkItemDraft = {
      key: generateId(),
      categoryId: tpl.categoryId,
      categoryName: nameOf(cats.items, tpl.categoryId),
      descriptionId: tpl.descriptionId,
      descriptionName: nameOf(descs.items, tpl.descriptionId),
      unitId: tpl.unitId,
      unitName: nameOf(units.items, tpl.unitId),
      quantity: String(tpl.defaultQuantity),
    }
    const onlyEmpty =
      items.length === 1 &&
      !items[0]!.categoryId &&
      !items[0]!.descriptionId &&
      !items[0]!.unitId &&
      !items[0]!.categoryName.trim() &&
      !items[0]!.descriptionName.trim()
    onChange(onlyEmpty ? [draft] : [...items, draft])
    setTemplatesOpen(false)
  }

  const openSaveTemplate = (item: WorkItemDraft) => {
    if (!isValidDraft(item)) return
    if (templates.some((tpl) => draftMatchesTemplate(item, tpl))) return
    const defaultName =
      item.descriptionName.trim() ||
      nameOf(descs.items, item.descriptionId) ||
      t('templates.save')
    setTemplateName(defaultName)
    setSaveDraft(item)
  }

  const confirmSaveTemplate = async () => {
    if (!saveDraft) return
    const trimmed = templateName.trim()
    if (!trimmed) return
    setSavingTemplate(true)
    try {
      await create({
        name: trimmed,
        categoryId: saveDraft.categoryId,
        descriptionId: saveDraft.descriptionId,
        unitId: saveDraft.unitId,
        defaultQuantity: Number(saveDraft.quantity),
      })
      setSaveDraft(null)
      setTemplateName('')
    } finally {
      setSavingTemplate(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label>{t('workItems.label')}</Label>
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <Button
              ref={templatesTriggerRef}
              type="button"
              variant="outline"
              size="sm"
              disabled={templates.length === 0}
              aria-expanded={templatesOpen}
              aria-label={t('templates.title')}
              onClick={() => setTemplatesOpen((v) => !v)}
              onBlur={() => {
                window.setTimeout(() => setTemplatesOpen(false), 150)
              }}
            >
              {t('templates.pick')}
              <ChevronDown className="h-4 w-4 ml-1 shrink-0 opacity-70" />
            </Button>
            {templatesOpen && templates.length > 0 && (
              <ul
                className="absolute left-0 top-full z-50 mt-1 max-h-40 min-w-full overflow-x-hidden overflow-y-auto rounded-md border bg-popover text-sm shadow-md"
                style={
                  templatesMaxWidth != null
                    ? { maxWidth: templatesMaxWidth, width: templatesMaxWidth }
                    : undefined
                }
              >
                {templates.map((tpl) => (
                  <li key={tpl.id} className="min-w-0">
                    <button
                      type="button"
                      className="block w-full truncate px-3 py-2 text-left hover:bg-accent"
                      title={tpl.name}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyTemplate(tpl)}
                    >
                      {tpl.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
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
      </div>

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('workItems.emptyHint')}</p>
      )}

      {items.map((item) => {
        const alreadyTemplate = templates.some((tpl) => draftMatchesTemplate(item, tpl))
        const canSave = isValidDraft(item) && !alreadyTemplate
        return (
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
              <div className="flex items-center shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn('text-primary-soft', alreadyTemplate && 'opacity-40')}
                  disabled={!canSave}
                  onClick={() => openSaveTemplate(item)}
                  aria-label={t('templates.save')}
                  title={
                    alreadyTemplate ? t('templates.alreadyExists') : t('templates.save')
                  }
                >
                  <Bookmark className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onChange(items.filter((i) => i.key !== item.key))}
                  aria-label={t('workItems.deleteAria')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )
      })}

      <Dialog
        open={saveDraft != null}
        onOpenChange={(open) => {
          if (!open) {
            setSaveDraft(null)
            setTemplateName('')
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('templates.namePrompt')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="template-name">{t('templates.nameLabel')}</Label>
            <Input
              id="template-name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void confirmSaveTemplate()
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={savingTemplate}
              onClick={() => {
                setSaveDraft(null)
                setTemplateName('')
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              disabled={savingTemplate || !templateName.trim()}
              onClick={() => void confirmSaveTemplate()}
            >
              {savingTemplate ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
