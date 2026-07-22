import { useCallback, useEffect, useState } from 'react'
import { listClientStaffAssignments } from '../services/clientStaffAssignmentService.js'

export function useClientStaffAssignments(clientId) {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listClientStaffAssignments(clientId)
      setAssignments(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { assignments, loading, error, refetch }
}
