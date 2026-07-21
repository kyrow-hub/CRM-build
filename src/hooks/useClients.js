import { useCallback, useEffect, useState } from 'react'
import { listClients } from '../services/clientService.js'

export function useClients({ search = '', status = '', assignedWorkerId = '' } = {}) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listClients({ search, status, assignedWorkerId })
      setClients(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [search, status, assignedWorkerId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { clients, loading, error, refetch }
}
