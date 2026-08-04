import { useCallback, useEffect, useState } from 'react'
import { intervalsRemote } from '@/api/intervalsRemote'
import { t } from '@/lib/i18n'
import type { SalaryReport, TaxReport } from '@/db/types'

export function useReports(year: number, month: number) {
  const [salary, setSalary] = useState<SalaryReport | null>(null)
  const [tax, setTax] = useState<TaxReport | null>(null)
  const [groupBy, setGroupBy] = useState<'category' | 'description' | 'both'>('both')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [s, t] = await Promise.all([
        intervalsRemote.salaryReport(year, month),
        intervalsRemote.taxReport(year, month, groupBy),
      ])
      setSalary(s)
      setTax(t)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('reports.loadError'))
    } finally {
      setLoading(false)
    }
  }, [year, month, groupBy])

  useEffect(() => {
    void reload()
  }, [reload])

  return { salary, tax, groupBy, setGroupBy, loading, error, reload }
}
