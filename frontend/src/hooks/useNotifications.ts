import { useEffect, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { settingsApi } from '@/api/settingsApi'
import { tasksApi } from '@/api/tasksApi'
import { db } from '@/db'
import {
  shouldSendCloseReminder,
  shouldSendNewTaskReminder,
  shouldSendStartReminder,
} from '@/utils/dateHelpers'

async function ensurePermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

function notify(title: string, body: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, tag: `${title}-${body}`.slice(0, 80) })
  } catch (error) {
    console.warn('Notification failed', error)
  }
}

export function useNotifications(enabled = true) {
  const permissionAsked = useRef(false)
  const settings = useLiveQuery(() => settingsApi.get(), [])
  const activeTasks = useLiveQuery(() => tasksApi.getByStatus('active'), [])

  useEffect(() => {
    if (!enabled) return
    if (!permissionAsked.current) {
      permissionAsked.current = true
      void ensurePermission()
    }

    const tick = async () => {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

      const currentSettings = await settingsApi.get()
      const tasks = await db.tasks.where('status').equals('active').toArray()
      const now = new Date()

      for (const task of tasks) {
        if (shouldSendStartReminder(task, currentSettings, now)) {
          notify('Скоро старт задачи', `«${task.title}» начинается в ближайшее время`)
          await tasksApi.update(task.id, { startNotified: true })
        }

        if (shouldSendCloseReminder(task, currentSettings, now)) {
          notify('Незавершённая задача', `Не забудьте закрыть «${task.title}»`)
          await tasksApi.update(task.id, { lastReminderSent: now.toISOString() })
        }
      }

      if (shouldSendNewTaskReminder(currentSettings, now)) {
        notify('Проверьте новые задачи', 'Появились ли новые заказы?')
        await settingsApi.update({ lastNewTaskReminderSent: now.toISOString() })
      }
    }

    void tick()
    const id = window.setInterval(() => void tick(), 60_000)
    return () => window.clearInterval(id)
  }, [enabled, settings, activeTasks])
}
