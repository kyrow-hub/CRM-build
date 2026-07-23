import { useCallback, useEffect, useState } from 'react'
import { listAllProgramRiskAssessments } from '../services/programRiskAssessmentService.js'

export function useProgramRiskAssessments() {
  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listAllProgramRiskAssessments()
      setAssessments(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { assessments, loading, error, refetch }
}
