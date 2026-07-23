import { useCallback, useEffect, useState } from 'react'
import { listIncidents } from '../services/incidentService.js'

export function useIncidents({ status = '', severity = '' } = {}) {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listIncidents({ status, severity })
      setIncidents(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [status, severity])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { incidents, loading, error, refetch }
}
