import { db } from '@/db'
import { emitSyncStatus } from '@/components/layout/SyncStatusBanner'
import { tasksRemote } from '@/api/tasksRemote'
import type { PendingOp, PendingOpType, Task } from '@/db/types'
import { generateId } from '@/utils/idGenerator'
import { ApiError } from '@/api/client'

export async function enqueueOp(
  type: PendingOpType,
  taskId: string,
  payload: unknown,
): Promise<void> {
  const op: PendingOp = {
    id: generateId(),
    type,
    taskId,
    payload,
    createdAt: new Date().toISOString(),
    tries: 0,
  }
  await db.pendingOps.put(op)
  emitSyncStatus('Не синхронизировано — будет отправлено при появлении сети')
  console.warn(`[pending] queued ${type} taskId=${taskId}`)
}

export async function pendingCount(): Promise<number> {
  return db.pendingOps.count()
}

export async function flushPendingOps(): Promise<void> {
  const ops = await db.pendingOps.orderBy('createdAt').toArray()
  if (ops.length === 0) return

  console.log(`[pending] flushing ${ops.length} op(s)`)

  for (const op of ops) {
    try {
      await applyOp(op)
      await db.pendingOps.delete(op.id)
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        emitSyncStatus('Ошибка авторизации — откройте приложение из Telegram')
        console.error('[pending] auth error, stop flush', error)
        return
      }
      await db.pendingOps.update(op.id, { tries: op.tries + 1 })
      console.error(`[pending] ${op.type} failed taskId=${op.taskId}`, error)
      emitSyncStatus('Не синхронизировано — повтор при следующем подключении')
      return
    }
  }

  if ((await pendingCount()) === 0) {
    emitSyncStatus(null)
    console.log('[pending] flush complete')
  }
}

async function applyOp(op: PendingOp): Promise<void> {
  switch (op.type) {
    case 'create':
      await tasksRemote.create(op.payload as Task)
      return
    case 'update':
      await tasksRemote.update(op.taskId, op.payload as Task)
      return
    case 'complete':
      await tasksRemote.complete(op.taskId)
      return
    case 'delete':
      await tasksRemote.remove(op.taskId)
      return
  }
}
