import { useCallback, useEffect, useState } from 'react'
import { listClientDocuments } from '../services/documentService.js'

export function useClientDocuments(clientId) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listClientDocuments(clientId)
      setDocuments(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { documents, loading, error, refetch }
}
