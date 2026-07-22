import { useCallback, useEffect, useState } from 'react'
import { listClientGoals } from '../services/clientGoalService.js'

export function useClientGoals(clientId) {
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    setError(null)
    try {
      const data = await listClientGoals(clientId)
      setGoals(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { goals, loading, error, refetch }
}
