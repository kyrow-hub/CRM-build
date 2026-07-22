import { useCallback, useEffect, useState } from 'react'
import { listMeetings } from '../services/meetingService.js'

export function useMeetings({ search = '', status = '', meetingType = '' } = {}) {
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listMeetings({ search, status, meetingType })
      setMeetings(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [search, status, meetingType])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { meetings, loading, error, refetch }
}
