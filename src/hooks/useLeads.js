import { useCallback, useEffect, useState } from 'react'
import { listLeads } from '../services/leadService.js'

export function useLeads({ search = '', status = '' } = {}) {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listLeads({ search, status })
      setLeads(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [search, status])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { leads, loading, error, refetch }
}
