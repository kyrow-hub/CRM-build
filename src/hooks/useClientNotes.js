import { useCallback, useEffect, useState } from 'react'
import { listClientNotes } from '../services/clientNoteService.js'

export function useClientNotes(clientId) {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    setError(null)
    try {
      const data = await listClientNotes(clientId)
      setNotes(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { notes, loading, error, refetch }
}
