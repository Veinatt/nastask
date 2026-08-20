import type { MessageKey } from '@/locales/ru'

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

export type MemoryQuestion = {
  id: MemoryQuestionId
  theme: string
  text: string
}

type Translate = (key: MessageKey) => string

function questionKey(id: MemoryQuestionId, part: 'theme' | 'text'): MessageKey {
  return `memory.q.${id}.${part}` as MessageKey
}

export function buildMemoryQuestions(t: Translate): MemoryQuestion[] {
  return MEMORY_QUESTION_IDS.map((id) => ({
    id,
    theme: t(questionKey(id, 'theme')),
    text: t(questionKey(id, 'text')),
  }))
}

export function getMemoryQuestion(id: string, t: Translate): MemoryQuestion | undefined {
  if (!isMemoryQuestionId(id)) return undefined
  const qid = id
  return {
    id: qid,
    theme: t(questionKey(qid, 'theme')),
    text: t(questionKey(qid, 'text')),
  }
}

export function isMemoryQuestionId(id: string): id is MemoryQuestionId {
  return (MEMORY_QUESTION_IDS as readonly string[]).includes(id)
}
