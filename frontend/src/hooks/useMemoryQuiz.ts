import { useCallback, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { memoryLocal } from '@/api/memoryLocal'
import { memoryRemote } from '@/api/memoryRemote'
import { enqueueOp } from '@/api/pendingOps'
import { ApiError } from '@/api/client'
import { MEMORY_QUESTIONS, getMemoryQuestion } from '@/memory/memoryQuestions'
import type { MemoryAnswer } from '@/db/types'

function isOfflineError(error: unknown): boolean {
  return (
    !navigator.onLine ||
    error instanceof TypeError ||
    (error instanceof ApiError && error.status === 0)
  )
}

export function useMemoryQuiz() {
  const questions = MEMORY_QUESTIONS
  const answers =
    useLiveQuery(() => memoryLocal.list(), []) ?? ([] as MemoryAnswer[])

  const [saving, setSaving] = useState(false)

  const answerMap = Object.fromEntries(
    answers.map((a) => [a.questionId, a.answer ?? '']),
  ) as Record<string, string>

  const saveAnswer = useCallback(async (questionId: string, answer: string) => {
    const q = getMemoryQuestion(questionId)
    if (!q) return
    const now = new Date().toISOString()
    const existing = await memoryLocal.get(questionId)
    const trimmed = answer.trim()
    const local: MemoryAnswer = {
      id: questionId,
      questionId,
      question: q.text,
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

  const saveAll = useCallback(
    async (draft: Record<string, string>) => {
      setSaving(true)
      try {
        const items = Object.entries(draft).map(([questionId, answer]) => ({
          questionId,
          answer,
        }))
        for (const item of items) {
          const q = getMemoryQuestion(item.questionId)
          if (!q) continue
          const now = new Date().toISOString()
          const existing = await memoryLocal.get(item.questionId)
          const trimmed = item.answer.trim()
          await memoryLocal.put({
            id: item.questionId,
            questionId: item.questionId,
            question: q.text,
            answer: trimmed.length > 0 ? trimmed : null,
            answeredAt:
              trimmed.length > 0 ? existing?.answeredAt ?? now : null,
            updatedAt: now,
          })
        }
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
