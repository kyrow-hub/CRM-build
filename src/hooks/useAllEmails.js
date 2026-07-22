import { useCallback, useEffect, useState } from 'react'
import { listAllEmails } from '../services/emailService.js'

export function useAllEmails() {
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listAllEmails()
      setEmails(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { emails, loading, error, refetch }
}
