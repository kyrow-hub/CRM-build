import { useCallback, useEffect, useState } from 'react'
import { listAllRiskAssessmentDocuments } from '../services/documentService.js'

export function useRiskAssessmentDocuments() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listAllRiskAssessmentDocuments()
      setDocuments(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { documents, loading, error, refetch }
}
