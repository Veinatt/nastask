import { useCallback, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { memoryLocal } from '@/api/memoryLocal'
import { memoryRemote } from '@/api/memoryRemote'
import { enqueueOp } from '@/api/pendingOps'
import { ApiError } from '@/api/client'
import { useI18n } from '@/hooks/useI18n'
import { buildMemoryQuestions, isMemoryQuestionId } from '@/memory/memoryQuestions'
import type { MemoryAnswer } from '@/db/types'

function isOfflineError(error: unknown): boolean {
  return (
    !navigator.onLine ||
    error instanceof TypeError ||
    (error instanceof ApiError && error.status === 0)
  )
}

export function useMemoryQuiz() {
  const { t, locale } = useI18n()
  const questions = useMemo(() => buildMemoryQuestions(t), [t, locale])
  const answers =
    useLiveQuery(() => memoryLocal.list(), []) ?? ([] as MemoryAnswer[])

  const [saving, setSaving] = useState(false)

  const answerMap = Object.fromEntries(
    answers.map((a) => [a.questionId, a.answer ?? '']),
  ) as Record<string, string>

  const saveAnswer = useCallback(async (questionId: string, answer: string) => {
    if (!isMemoryQuestionId(questionId)) return
    const now = new Date().toISOString()
    const existing = await memoryLocal.get(questionId)
    const trimmed = answer.trim()
    const local: MemoryAnswer = {
      id: questionId,
      questionId,
      answer: trimmed.length > 0 ? trimmed : null,
      answeredAt:
        trimmed.length > 0
          ? existing?.answeredAt ?? now
          : null,
      updatedAt: now,
    }
    await memoryLocal.put(local)

    try {
      const remote = await memoryRemote.upsertAnswers([
        { questionId, answer },
      ])
      if (remote[0]) await memoryLocal.put(remote[0])
    } catch (error) {
      if (isOfflineError(error)) {
        await enqueueOp('memory_upsert', questionId, {
          questionId,
          answer,
        })
        return
      }
      throw error
    }
  }, [])

  /**
   * Persist draft. Empty answers wipe storage only for ids in `allowEmptyIds`
   * (user-edited). Untouched empty placeholders must not clear existing answers.
   */
  const saveAll = useCallback(
    async (draft: Record<string, string>, allowEmptyIds?: ReadonlySet<string>) => {
      setSaving(true)
      try {
        const items: Array<{ questionId: string; answer: string }> = []
        for (const [questionId, answer] of Object.entries(draft)) {
          if (!isMemoryQuestionId(questionId)) continue
          const trimmed = answer.trim()
          const existing = await memoryLocal.get(questionId)
          if (
            trimmed.length === 0 &&
            existing?.answer &&
            !allowEmptyIds?.has(questionId)
          ) {
            continue
          }
          items.push({ questionId, answer })
          const now = new Date().toISOString()
          await memoryLocal.put({
            id: questionId,
            questionId,
            answer: trimmed.length > 0 ? trimmed : null,
            answeredAt:
              trimmed.length > 0 ? existing?.answeredAt ?? now : null,
            updatedAt: now,
          })
        }
        if (items.length === 0) return
        try {
          const remote = await memoryRemote.upsertAnswers(items)
          await memoryLocal.putMany(remote)
        } catch (error) {
          if (isOfflineError(error)) {
            for (const item of items) {
              await enqueueOp('memory_upsert', item.questionId, item)
            }
            return
          }
          throw error
        }
      } finally {
        setSaving(false)
      }
    },
    [],
  )

  const pullAnswers = useCallback(async () => {
    try {
      const remote = await memoryRemote.listAnswers()
      await memoryLocal.putMany(remote)
    } catch (error) {
      console.error('[memory] pull failed', error)
    }
  }, [])

  return {
    questions,
    answers,
    answerMap,
    saving,
    saveAnswer,
    saveAll,
    pullAnswers,
  }
}
