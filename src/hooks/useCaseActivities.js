import { useCallback, useEffect, useState } from 'react'
import { listClientCaseActivities } from '../services/caseActivityService.js'

export function useCaseActivities(clientId) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listClientCaseActivities(clientId)
      setActivities(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { activities, loading, error, refetch }
}
