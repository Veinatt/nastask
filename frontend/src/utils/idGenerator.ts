export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}
