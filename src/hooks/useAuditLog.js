import { useCallback, useEffect, useState } from 'react'
import { listAuditLog } from '../services/auditLogService.js'

export function useAuditLog(filters) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listAuditLog(filters)
      setEntries(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filters.tableName, filters.action, filters.recordId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { entries, loading, error, refetch }
}
