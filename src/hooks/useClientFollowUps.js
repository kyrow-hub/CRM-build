import { useCallback, useEffect, useState } from 'react'
import { listClientFollowUps } from '../services/followUpService.js'

export function useClientFollowUps(clientId) {
  const [followUps, setFollowUps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listClientFollowUps(clientId)
      setFollowUps(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { followUps, loading, error, refetch }
}
