import { apiFetch } from '@/api/client'
import type { MemoryAnswer } from '@/db/types'

type OkQuestions = { success: true; questions: Array<{ id: string }> }
type OkAnswers = { success: true; answers: MemoryAnswer[] }

export const memoryRemote = {
  async listQuestions(): Promise<Array<{ id: string }>> {
    const res = await apiFetch<OkQuestions>('/api/memory/questions')
    return res?.questions ?? []
  },

  async listAnswers(): Promise<MemoryAnswer[]> {
    const res = await apiFetch<OkAnswers>('/api/memory/answers')
    return (res?.answers ?? []).map((a) => ({
      ...a,
      id: a.questionId,
    }))
  },

  async upsertAnswers(
    answers: Array<{ questionId: string; answer: string }>,
  ): Promise<MemoryAnswer[]> {
    const res = await apiFetch<OkAnswers>('/api/memory/answers', {
      method: 'POST',
      body: JSON.stringify({ answers }),
    })
    return (res?.answers ?? []).map((a) => ({
      ...a,
      id: a.questionId,
    }))
  },
}
