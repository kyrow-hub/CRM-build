import { useCallback, useEffect, useState } from 'react'
import { listClientRelationships } from '../services/relationshipService.js'

export function useClientRelationships(clientId) {
  const [relationships, setRelationships] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listClientRelationships(clientId)
      setRelationships(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { relationships, loading, error, refetch }
}
