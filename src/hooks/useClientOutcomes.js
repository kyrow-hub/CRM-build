import { useCallback, useEffect, useState } from 'react'
import { listClientOutcomes } from '../services/outcomeService.js'

export function useClientOutcomes(clientId) {
  const [outcomes, setOutcomes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listClientOutcomes(clientId)
      setOutcomes(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { outcomes, loading, error, refetch }
}
