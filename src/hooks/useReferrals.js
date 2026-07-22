import { useCallback, useEffect, useState } from 'react'
import { listReferrals } from '../services/referralService.js'

export function useReferrals({ search = '', status = '' } = {}) {
  const [referrals, setReferrals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listReferrals({ search, status })
      setReferrals(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [search, status])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { referrals, loading, error, refetch }
}
