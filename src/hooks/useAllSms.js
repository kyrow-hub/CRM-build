import { useCallback, useEffect, useState } from 'react'
import { listAllSms } from '../services/smsService.js'

export function useAllSms() {
  const [sms, setSms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listAllSms()
      setSms(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { sms, loading, error, refetch }
}
