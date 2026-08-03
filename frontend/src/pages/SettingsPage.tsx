import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { WEEKDAY_LABELS, WEEKDAYS } from '@/db/defaults'
import type { ReminderInterval, ScheduleException, Settings, Weekday } from '@/db/types'
import { syncSettingsToBackend } from '@/api/settingsApi'
import { useSettings } from '@/hooks/useSettings'
import { useTelegram } from '@/hooks/useTelegram'
import { REMINDER_INTERVAL_LABELS, REMINDER_INTERVALS } from '@/utils/dateHelpers'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function SettingsPage() {
  const { settings, isLoading, updateSettings } = useSettings()
  const { user, inTelegram } = useTelegram()
  const [draft, setDraft] = useState<Settings>(settings)
  const [firstOffsetText, setFirstOffsetText] = useState(
    String(settings.newTaskReminder.firstOffsetMinutes ?? 60),
  )
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setDraft(settings)
    setFirstOffsetText(String(settings.newTaskReminder.firstOffsetMinutes ?? 60))
    setSaveError(null)
  }, [settings])

  const updateDay = (day: Weekday, patch: Partial<Settings['workSchedule'][Weekday]>) => {
    setDraft((prev) => ({
      ...prev,
      workSchedule: {
        ...prev.workSchedule,
        [day]: { ...prev.workSchedule[day], ...patch },
      },
    }))
    setSaved(false)
  }

  const addException = () => {
    const today = new Date().toISOString().slice(0, 10)
    const item: ScheduleException = { date: today, isOff: true }
    setDraft((prev) => ({ ...prev, exceptions: [...prev.exceptions, item] }))
    setSaved(false)
  }

  const updateException = (index: number, patch: Partial<ScheduleException>) => {
    setDraft((prev) => ({
      ...prev,
      exceptions: prev.exceptions.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }))
    setSaved(false)
  }

  const removeException = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      exceptions: prev.exceptions.filter((_, i) => i !== index),
    }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaveError(null)

    if (draft.newTaskReminder.enabled) {
      const trimmed = firstOffsetText.trim()
      if (trimmed === '') {
        setSaveError('Укажите смещение после начала дня (минуты)')
        setSaved(false)
        return
      }
      if (!/^\d+$/.test(trimmed)) {
        setSaveError('Смещение должно быть целым числом минут ≥ 0')
        setSaved(false)
        return
      }
    }

    const firstOffsetMinutes = draft.newTaskReminder.enabled
      ? Number(firstOffsetText.trim())
      : (draft.newTaskReminder.firstOffsetMinutes ?? 60)

    const next = await updateSettings({
      workSchedule: draft.workSchedule,
      exceptions: draft.exceptions,
      reminderLeadTime: draft.reminderLeadTime,
      deadlineLeadTime: draft.deadlineLeadTime,
      newTaskReminder: {
        ...draft.newTaskReminder,
        firstOffsetMinutes,
      },
    })

    if (user?.id) {
      try {
        await syncSettingsToBackend(user.id, next)
      } catch (error) {
        console.error('[settings] sync to backend failed', error)
        setSaveError('Сохранено локально, но не удалось отправить на сервер')
        setSaved(false)
        return
      }
    }

    setSaved(true)
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Загрузка…</p>
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Настройки</h1>
        <p className="text-sm text-muted-foreground">
          Рабочее время и напоминания
          {inTelegram && user ? ` · Telegram ID: ${user.id}` : ''}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Рабочее время</CardTitle>
          <CardDescription>Уведомления отправляются только в рабочие часы</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {WEEKDAYS.map((day) => {
            const schedule = draft.workSchedule[day]
            return (
              <div key={day} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 sm:grid-cols-[140px_auto_1fr_1fr]">
                <div className="flex items-center gap-2 col-span-3 sm:col-span-2">
                  <Checkbox
                    checked={schedule.enabled}
                    onCheckedChange={(checked) => updateDay(day, { enabled: Boolean(checked) })}
                    id={`day-${day}`}
                  />
                  <Label htmlFor={`day-${day}`}>{WEEKDAY_LABELS[day]}</Label>
                </div>
                <Input
                  type="time"
                  value={schedule.start}
                  disabled={!schedule.enabled}
                  onChange={(e) => updateDay(day, { start: e.target.value })}
                />
                <Input
                  type="time"
                  value={schedule.end}
                  disabled={!schedule.enabled}
                  onChange={(e) => updateDay(day, { end: e.target.value })}
                />
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <CardTitle>Исключения</CardTitle>
              <CardDescription>Выходные и изменённый график</CardDescription>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={addException}>
              <Plus /> Добавить
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {draft.exceptions.length === 0 && (
            <p className="text-sm text-muted-foreground">Исключений нет</p>
          )}
          {draft.exceptions.map((item, index) => (
            <div key={`${item.date}-${index}`} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={item.date}
                  onChange={(e) => updateException(index, { date: e.target.value })}
                />
                <Button type="button" size="icon" variant="ghost" onClick={() => removeException(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={item.isOff}
                  onCheckedChange={(checked) => updateException(index, { isOff: checked })}
                  id={`off-${index}`}
                />
                <Label htmlFor={`off-${index}`}>Выходной</Label>
              </div>
              {!item.isOff && (
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="time"
                    value={item.start ?? '09:00'}
                    onChange={(e) => updateException(index, { start: e.target.value })}
                  />
                  <Input
                    type="time"
                    value={item.end ?? '18:00'}
                    onChange={(e) => updateException(index, { end: e.target.value })}
                  />
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Уведомления</CardTitle>
          <CardDescription>Клиентские напоминания (MVP)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="leadTime">Упреждение старта (часы)</Label>
            <Select
              value={String(
                Math.min(12, Math.max(1, Math.round(draft.reminderLeadTime) || 1)),
              )}
              onValueChange={(value) => {
                setDraft((prev) => ({ ...prev, reminderLeadTime: Number(value) }))
                setSaved(false)
              }}
            >
              <SelectTrigger id="leadTime">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[8.3rem]">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((hours) => (
                  <SelectItem
                    key={hours}
                    value={String(hours)}
                    className="rounded-none border-b border-border last:border-b-0"
                  >
                    {hours} {hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadlineLead">Упреждение дедлайна (часы)</Label>
            <Select
              value={String(
                Math.min(12, Math.max(1, Math.round(draft.deadlineLeadTime) || 1)),
              )}
              onValueChange={(value) => {
                setDraft((prev) => ({ ...prev, deadlineLeadTime: Number(value) }))
                setSaved(false)
              }}
            >
              <SelectTrigger id="deadlineLead">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[8.3rem]">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((hours) => (
                  <SelectItem
                    key={hours}
                    value={String(hours)}
                    className="rounded-none border-b border-border last:border-b-0"
                  >
                    {hours} {hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              За сколько часов до дедлайна придёт уведомление. В момент дедлайна задача
              завершится автоматически.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <Label htmlFor="newTasks">Проверьте новые задачи</Label>
              <p className="text-xs text-muted-foreground">Периодическое напоминание</p>
            </div>
            <Switch
              id="newTasks"
              checked={draft.newTaskReminder.enabled}
              onCheckedChange={(checked) => {
                setDraft((prev) => ({
                  ...prev,
                  newTaskReminder: { ...prev.newTaskReminder, enabled: checked },
                }))
                setSaved(false)
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Интервал</Label>
            <Select
              value={draft.newTaskReminder.interval}
              onValueChange={(value: ReminderInterval) => {
                setDraft((prev) => ({
                  ...prev,
                  newTaskReminder: { ...prev.newTaskReminder, interval: value },
                }))
                setSaved(false)
              }}
              disabled={!draft.newTaskReminder.enabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REMINDER_INTERVALS.map((interval) => (
                  <SelectItem key={interval} value={interval}>
                    {REMINDER_INTERVAL_LABELS[interval]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="firstOffset">Смещение после начала дня (мин)</Label>
            <Input
              id="firstOffset"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="60"
              disabled={!draft.newTaskReminder.enabled}
              value={firstOffsetText}
              onChange={(e) => {
                const next = e.target.value.replace(/[^\d]/g, '')
                setFirstOffsetText(next)
                setSaved(false)
                setSaveError(null)
              }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => void handleSave()}>Сохранить</Button>
        {saved && !saveError && (
          <span className="text-sm text-muted-foreground">Сохранено</span>
        )}
        {saveError && <span className="text-sm text-destructive">{saveError}</span>}
      </div>
    </div>
  )
}
