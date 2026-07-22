import { useCallback, useEffect, useState } from 'react'
import { listPartners } from '../services/partnerService.js'

export function usePartners(search = '') {
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listPartners(search)
      setPartners(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { partners, loading, error, refetch }
}
