/** Known question ids — text lives on the client (locales). */
export const MEMORY_QUESTION_IDS = [
  'time-period',
  'time-place',
  'memory-day',
  'memory-detail',
  'feelings-body',
  'feelings-spark',
  'music-repeat',
  'music-where',
  'books-screen',
  'people-near',
  'time-evenings',
  'time-lost',
  'now-bridge',
  'now-piece',
  'open-add',
] as const

export type MemoryQuestionId = (typeof MEMORY_QUESTION_IDS)[number]

export function isMemoryQuestionId(id: string): id is MemoryQuestionId {
  return (MEMORY_QUESTION_IDS as readonly string[]).includes(id)
}
