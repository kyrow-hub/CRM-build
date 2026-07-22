import { useCallback, useEffect, useState } from 'react'
import { listClientAssessments } from '../services/assessmentService.js'

export function useClientAssessments(clientId) {
  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listClientAssessments(clientId)
      setAssessments(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { assessments, loading, error, refetch }
}
