import { useCallback, useEffect, useState } from 'react'
import { listProgramParticipants } from '../services/programParticipantService.js'

export function useProgramParticipants(programId) {
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    if (!programId) {
      setParticipants([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await listProgramParticipants(programId)
      setParticipants(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [programId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { participants, loading, error, refetch }
}
