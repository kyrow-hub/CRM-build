import { useCallback, useEffect, useState } from 'react'
import { listReferralDocuments } from '../services/documentService.js'

export function useReferralDocuments(referralId) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listReferralDocuments(referralId)
      setDocuments(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [referralId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { documents, loading, error, refetch }
}
