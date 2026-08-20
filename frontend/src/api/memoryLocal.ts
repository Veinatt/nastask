import { db } from '@/db'
import type { MemoryAnswer } from '@/db/types'

export const memoryLocal = {
  async list(): Promise<MemoryAnswer[]> {
    return db.memoryQuiz.orderBy('questionId').toArray()
  },

  async get(questionId: string): Promise<MemoryAnswer | undefined> {
    return db.memoryQuiz.get(questionId)
  },

  async put(answer: MemoryAnswer): Promise<void> {
    await db.memoryQuiz.put({ ...answer, id: answer.questionId })
  },

  async putMany(answers: MemoryAnswer[]): Promise<void> {
    if (!answers.length) return
    await db.memoryQuiz.bulkPut(
      answers.map((a) => ({ ...a, id: a.questionId })),
    )
  },
}
