import { useEffect, useLayoutEffect, useState, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Bookmark, ChevronDown, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DictAutocomplete } from '@/components/dicts/DictAutocomplete'
import { useWorkTemplates } from '@/hooks/useWorkTemplates'
import { useDictionaries } from '@/hooks/useDictionaries'
import { useI18n } from '@/hooks/useI18n'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { generateId } from '@/utils/idGenerator'
import type { WorkItemInput, WorkTemplate } from '@/db/types'

const TEMPLATES_MENU_MAX_H = 160
const VIEWPORT_PAD = 8

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
  /** Extra header actions (e.g. notes toggle), same style row as template/add */
  headerExtra?: ReactNode
}

export function WorkItemsEditor({ items, onChange, headerExtra }: Props) {
  const { t } = useI18n()
  const { items: templates, create } = useWorkTemplates()
  const cats = useDictionaries('categories')
  const descs = useDictionaries('descriptions')
  const units = useDictionaries('units')
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const editorRootRef = useRef<HTMLDivElement>(null)
  const templatesTriggerRef = useRef<HTMLButtonElement>(null)
  const templatesMenuRef = useRef<HTMLUListElement>(null)
  const templatesPortalRef = useRef<HTMLElement | null>(null)
  const [templatesPos, setTemplatesPos] = useState<{
    top: number
    left: number
    width: number
    maxHeight: number
  } | null>(null)
  const [saveDraft, setSaveDraft] = useState<WorkItemDraft | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [focusItemKey, setFocusItemKey] = useState<string | null>(null)

  useEffect(() => {
    if (!focusItemKey) return
    if (!items.some((i) => i.key === focusItemKey)) return
    const id = window.requestAnimationFrame(() => {
      const input = editorRootRef.current?.querySelector<HTMLInputElement>(
        `[data-work-focus-key="${focusItemKey}"] input`,
      )
      input?.focus()
      setFocusItemKey(null)
    })
    return () => window.cancelAnimationFrame(id)
  }, [focusItemKey, items])

  useLayoutEffect(() => {
    if (!templatesOpen) {
      setTemplatesPos(null)
      templatesPortalRef.current = null
      return
    }
    const update = () => {
      const el = templatesTriggerRef.current
      const root = editorRootRef.current
      if (!el || !root) return
      // Portal into dialog content (RemoveScroll shard). Body portals stay
      // blocked by the dialog's document wheel/touch listeners.
      const portal =
        el.closest<HTMLElement>('.dialog-content') ??
        el.closest<HTMLElement>('[role="dialog"]') ??
        document.body
      templatesPortalRef.current = portal
      const r = el.getBoundingClientRect()
      const pr = portal.getBoundingClientRect()
      const rootRect = root.getBoundingClientRect()
      const left = r.left - pr.left
      // Cover past the fields' right edge a few px so input borders
      // don't peek beside the menu scrollbar; clamp to dialog edge.
      const width = Math.max(
        r.width,
        Math.min(
          Math.floor(rootRect.right - r.left) + 1,
          Math.floor(pr.right - r.left),
        ),
      )
      const spaceBelow = pr.bottom - r.bottom - VIEWPORT_PAD
      const spaceAbove = r.top - pr.top - VIEWPORT_PAD
      const openUp = spaceBelow < TEMPLATES_MENU_MAX_H && spaceAbove > spaceBelow
      const maxHeight = Math.max(
        72,
        Math.min(TEMPLATES_MENU_MAX_H, openUp ? spaceAbove : spaceBelow),
      )
      setTemplatesPos({
        top: openUp
          ? r.top - pr.top - 4 - maxHeight
          : r.bottom - pr.top + 4,
        left,
        width,
        maxHeight,
      })
    }
    const onScroll = (e: Event) => {
      const menu = templatesMenuRef.current
      if (menu && (e.target === menu || menu.contains(e.target as Node))) return
      update()
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [templatesOpen, templates.length])

  useLayoutEffect(() => {
    if (!templatesOpen) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null
      if (!target) return
      if (templatesTriggerRef.current?.contains(target)) return
      if (templatesMenuRef.current?.contains(target)) return
      setTemplatesOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [templatesOpen])

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
      items.length === 0 ||
      (items.length === 1 &&
        !items[0]!.categoryId &&
        !items[0]!.descriptionId &&
        !items[0]!.unitId &&
        !items[0]!.categoryName.trim() &&
        !items[0]!.descriptionName.trim())
    onChange(onlyEmpty ? [draft] : [draft, ...items])
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
    <div ref={editorRootRef} className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
        <Label className="shrink-0 pb-0 leading-10">{t('workItems.label')}</Label>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
          <div className="relative">
            <Button
              ref={templatesTriggerRef}
              type="button"
              variant="secondary"
              className="control-surface h-10 px-3 text-primary-soft"
              disabled={templates.length === 0}
              aria-expanded={templatesOpen}
              aria-label={t('templates.title')}
              onClick={() => setTemplatesOpen((v) => !v)}
            >
              {t('templates.pick')}
              <ChevronDown className="h-4 w-4 shrink-0" strokeWidth={2.5} />
            </Button>
            {templatesOpen &&
              templates.length > 0 &&
              templatesPos &&
              templatesPortalRef.current &&
              createPortal(
                <ul
                  ref={templatesMenuRef}
                  className="absolute z-[200] overflow-x-hidden overflow-y-auto overscroll-contain rounded-md border border-border bg-popover text-sm shadow-sm [touch-action:pan-y]"
                  style={{
                    top: templatesPos.top,
                    left: templatesPos.left,
                    width: templatesPos.width,
                    maxHeight: templatesPos.maxHeight,
                  }}
                >
                  {templates.map((tpl, index) => (
                    <li
                      key={tpl.id}
                      className={cn(
                        'min-w-0',
                        index > 0 && 'border-t border-border/60',
                      )}
                    >
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
                </ul>,
                templatesPortalRef.current,
              )}
          </div>
          <Button
            type="button"
            variant="secondary"
            className="control-surface h-10 px-3 text-primary-soft"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              const draft = emptyWorkItemDraft()
              setFocusItemKey(draft.key)
              onChange([draft, ...items])
            }}
            aria-label={t('workItems.add')}
            title={t('workItems.add')}
          >
            <span className="hidden sm:inline">{t('workItems.add')}</span>
            <Plus className="h-4 w-4" />
          </Button>
          {headerExtra}
        </div>
      </div>

      {items.map((item, index) => {
        const alreadyTemplate = templates.some((tpl) => draftMatchesTemplate(item, tpl))
        const canSave = isValidDraft(item) && !alreadyTemplate
        return (
          <div
            key={item.key}
            data-work-focus-key={item.key}
            className={cn('grid gap-2', index > 0 && 'border-t border-border/50 pt-3')}
          >
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
            <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-2">
              <Input
                type="number"
                min={0.01}
                step="any"
                value={item.quantity}
                onChange={(e) => update(item.key, { quantity: e.target.value })}
                placeholder={t('workItems.quantity')}
                className="px-2 tabular-nums"
              />
              <DictAutocomplete
                kind="units"
                value={item.unitName}
                resolvedId={item.unitId}
                placeholder={t('workItems.unit')}
                onChange={(name) => update(item.key, { unitName: name, unitId: '' })}
                onResolved={(id, name) => update(item.key, { unitId: id, unitName: name })}
              />
              <div className="flex shrink-0 items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn('h-9 w-9 text-primary-soft', alreadyTemplate && 'opacity-40')}
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
                  className="h-9 w-9 text-destructive hover:bg-destructive/15 hover:text-destructive"
                  disabled={items.length <= 1}
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
          <DialogBody className="space-y-2">
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
          </DialogBody>
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
