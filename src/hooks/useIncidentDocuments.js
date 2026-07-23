import { useCallback, useEffect, useState } from 'react'
import { listIncidentDocuments } from '../services/documentService.js'

export function useIncidentDocuments(incidentId) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listIncidentDocuments(incidentId)
      setDocuments(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [incidentId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { documents, loading, error, refetch }
}
