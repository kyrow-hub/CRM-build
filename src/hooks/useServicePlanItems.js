import { useCallback, useEffect, useState } from 'react'
import { listServicePlanItems } from '../services/servicePlanService.js'

export function useServicePlanItems(clientId) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listServicePlanItems(clientId)
      setItems(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { items, loading, error, refetch }
}
