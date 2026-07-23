import { useCallback, useEffect, useState } from 'react'
import { listIncidentsForClient } from '../services/incidentService.js'

export function useClientIncidents(clientId) {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listIncidentsForClient(clientId)
      setIncidents(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { incidents, loading, error, refetch }
}
