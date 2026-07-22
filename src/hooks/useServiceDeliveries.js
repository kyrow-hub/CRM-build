import { useCallback, useEffect, useState } from 'react'
import { listClientServiceDeliveries } from '../services/serviceDeliveryService.js'

export function useServiceDeliveries(clientId) {
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listClientServiceDeliveries(clientId)
      setDeliveries(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { deliveries, loading, error, refetch }
}
