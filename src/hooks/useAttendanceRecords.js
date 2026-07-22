import { useCallback, useEffect, useState } from 'react'
import { listAttendanceRecords } from '../services/attendanceService.js'

export function useAttendanceRecords() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listAttendanceRecords()
      setRecords(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { records, loading, error, refetch }
}
