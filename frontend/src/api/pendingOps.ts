import { db } from '@/db'
import { emitSyncStatus } from '@/components/layout/SyncStatusBanner'
import { intervalsRemote } from '@/api/intervalsRemote'
import { intervalsLocal } from '@/api/intervalsLocal'
import { dictsRemote } from '@/api/dictsRemote'
import { settingsRemote } from '@/api/settingsApi'
import { t } from '@/lib/i18n'
import type { DictKind, PendingOp, PendingOpType, WorkItemInput } from '@/db/types'
import { generateId } from '@/utils/idGenerator'
import { ApiError } from '@/api/client'

export async function enqueueOp(
  type: PendingOpType,
  entityId: string,
  payload: unknown,
): Promise<void> {
  const op: PendingOp = {
    id: generateId(),
    type,
    entityId,
    payload,
    createdAt: new Date().toISOString(),
    tries: 0,
  }
  await db.pendingOps.put(op)
  emitSyncStatus(t('sync.queued'))
  console.warn(`[pending] queued ${type} entityId=${entityId}`)
}

export async function pendingCount(): Promise<number> {
  return db.pendingOps.count()
}

function isAuthError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403)
}

/** Client/permanent failures — drop op and continue the queue. */
function isDeadOpError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false
  const { status } = error
  return status === 404 || status === 400 || status === 409 || status === 422
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
      if (isAuthError(error)) {
        emitSyncStatus(t('sync.authError'))
        console.error('[pending] auth error, stop flush', error)
        return
      }

      const tries = op.tries + 1
      await db.pendingOps.update(op.id, { tries })

      if (isDeadOpError(error)) {
        console.error(
          `[pending] dropping ${op.type} entityId=${op.entityId} (HTTP ${(error as ApiError).status})`,
          error,
        )
        await db.pendingOps.delete(op.id)
        // Never existed on server — drop local ghost. "Already completed" (400) keeps local; pull upserts.
        if (
          error instanceof ApiError &&
          error.status === 404 &&
          (op.type === 'interval_complete' || op.type === 'interval_manual')
        ) {
          try {
            await intervalsLocal.remove(op.entityId)
          } catch {
            // ignore
          }
        }
        continue
      }

      console.error(`[pending] ${op.type} failed entityId=${op.entityId}`, error)
      emitSyncStatus(t('sync.retryLater'))
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
    case 'interval_start': {
      const p = op.payload as { title: string; id: string }
      const result = await intervalsRemote.start(p.title, p.id)
      await intervalsLocal.putEntry(result.entry, result.workItems)
      return
    }
    case 'interval_manual': {
      const result = await intervalsRemote.manual(
        op.payload as {
          id: string
          title: string
          start: string
          end: string
          coefficient: number
          workItems: WorkItemInput[]
        },
      )
      await intervalsLocal.putEntry(result.entry, result.workItems)
      return
    }
    case 'interval_pause': {
      const result = await intervalsRemote.pause(op.entityId)
      await intervalsLocal.putEntry(result.entry, result.workItems)
      return
    }
    case 'interval_resume': {
      const result = await intervalsRemote.resume(op.entityId)
      await intervalsLocal.putEntry(result.entry, result.workItems)
      return
    }
    case 'interval_complete': {
      const p = op.payload as { coefficient: number; workItems: WorkItemInput[] }
      const result = await intervalsRemote.complete(op.entityId, p)
      await intervalsLocal.putEntry(result.entry, result.workItems)
      return
    }
    case 'interval_update': {
      const result = await intervalsRemote.update(
        op.entityId,
        op.payload as Parameters<typeof intervalsRemote.update>[1],
      )
      await intervalsLocal.putEntry(result.entry, result.workItems)
      return
    }
    case 'interval_delete':
      await intervalsRemote.remove(op.entityId)
      await intervalsLocal.remove(op.entityId)
      return
    case 'dict_create': {
      const p = op.payload as { kind: DictKind; name: string; id: string }
      await dictsRemote.create(p.kind, p.name, p.id)
      return
    }
    case 'dict_update': {
      const p = op.payload as { kind: DictKind; name: string }
      await dictsRemote.update(p.kind, op.entityId, p.name)
      return
    }
    case 'dict_delete': {
      const p = op.payload as { kind: DictKind }
      await dictsRemote.remove(p.kind, op.entityId)
      return
    }
    case 'settings_put':
      await settingsRemote.put(
        op.payload as Parameters<typeof settingsRemote.put>[0],
      )
      return
  }
}
