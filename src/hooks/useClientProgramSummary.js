import { useCallback, useEffect, useState } from 'react'
import { getClientProgramSummary } from '../services/programService.js'

export function useClientProgramSummary(clientId) {
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getClientProgramSummary(clientId)
      setPrograms(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { programs, loading, error, refetch }
}
