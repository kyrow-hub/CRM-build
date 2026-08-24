import { useState } from 'react'
import { Users2, Pencil, Trash2 } from 'lucide-react'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import StatusPill from '../ui/StatusPill.jsx'
import {
  listSessionAttendance,
  addIndividualSessionNote,
  updateGroupSession,
  deleteGroupSession,
} from '../../services/groupSessionService.js'
import { updateAttendanceRecord, deleteAttendanceRecord } from '../../services/attendanceService.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { initials } from '../../utils/initials.js'
import { avatarTone } from '../../utils/avatarColor.js'

const STATUS_TONE = {
  Present: 'success',
  Absent: 'danger',
  Late: 'warning',
  'Left Early': 'warning',
  Excused: 'neutral',
}

const STATUS_OPTIONS = ['Present', 'Absent', 'Late', 'Left Early', 'Excused']

function ParticipantRow({ record, sessionId, canEdit, canDelete, onRemoved }) {
  const { user } = useAuth()
  const toast = useToast()
  const [showNote, setShowNote] = useState(false)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(record.attendance_status)
  const [savingStatus, setSavingStatus] = useState(false)
  const [removing, setRemoving] = useState(false)
  const client = record.client
  const name = client ? [client.first_name, client.last_name].filter(Boolean).join(' ') : 'Unknown'

  const handleSaveNote = async () => {
    if (!note.trim()) return
    setSaving(true)
    try {
      await addIndividualSessionNote({ clientId: record.client_id, sessionId, content: note, createdBy: user?.id })
      toast.success(`Note added to ${name}'s profile.`)
      setNote('')
      setShowNote(false)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    setStatus(newStatus)
    setSavingStatus(true)
    try {
      await updateAttendanceRecord(record.id, { attendance_status: newStatus })
      toast.success(`${name}'s attendance updated.`)
    } catch (err) {
      toast.error(err.message)
      setStatus(record.attendance_status)
    } finally {
      setSavingStatus(false)
    }
  }

  const handleRemove = async () => {
    if (!window.confirm(`Remove ${name}'s attendance record from this session? This cannot be undone.`)) return
    setRemoving(true)
    try {
      await deleteAttendanceRecord(record.id)
      toast.success('Attendance record deleted.')
      onRemoved(record.id)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="group-session-participant-detail">
      <div className="group-session-participant-detail-main">
        <div className={`client-avatar avatar--${avatarTone(name)}`}>{initials(name)}</div>
        <span style={{ flex: 1, fontWeight: 600, fontSize: 13.5 }}>{name}</span>
        {canEdit ? (
          <select className="input" style={{ width: 140 }} value={status} onChange={(e) => handleStatusChange(e.target.value)} disabled={savingStatus}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        ) : (
          <StatusPill tone={STATUS_TONE[record.attendance_status] ?? 'neutral'}>{record.attendance_status}</StatusPill>
        )}
        <button type="button" className="link-button" onClick={() => setShowNote((v) => !v)}>
          {showNote ? 'Cancel' : 'Add individual note'}
        </button>
        {canDelete && (
          <button type="button" className="icon-button" title="Remove from session" onClick={handleRemove} disabled={removing}>
            <Trash2 strokeWidth={2} />
          </button>
        )}
      </div>
      {showNote && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <textarea
            className="input"
            rows={2}
            placeholder={`Additional note for ${name} only...`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button type="button" onClick={handleSaveNote} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      )}
    </div>
  )
}

function sessionFormFromRecord(session) {
  return {
    sessionDate: session.session_date,
    startTime: session.start_time || '',
    endTime: session.end_time || '',
    location: session.location || '',
    activityType: session.activity_type || '',
    facilitatorId: session.facilitator_id || '',
    overnightCamp: session.overnight_camp || false,
  }
}

function GroupSessionCard({ session, workers, canEdit, canDelete, onChanged }) {
  const toast = useToast()
  const [expanded, setExpanded] = useState(false)
  const [records, setRecords] = useState(null)
  const [loading, setLoading] = useState(false)
  const [editingSession, setEditingSession] = useState(false)
  const [sessionForm, setSessionForm] = useState(() => sessionFormFromRecord(session))
  const [savingSession, setSavingSession] = useState(false)
  const [deletingSession, setDeletingSession] = useState(false)
  const facilitatorName = session.facilitator
    ? [session.facilitator.first_name, session.facilitator.last_name].filter(Boolean).join(' ')
    : null

  const handleToggle = async () => {
    setExpanded((v) => !v)
    if (!records && !expanded) {
      setLoading(true)
      try {
        const data = await listSessionAttendance(session.id)
        setRecords(data)
      } finally {
        setLoading(false)
      }
    }
  }

  const handleParticipantRemoved = (recordId) => {
    setRecords((prev) => (prev ? prev.filter((r) => r.id !== recordId) : prev))
  }

  const handleSaveSession = async (e) => {
    e.preventDefault()
    setSavingSession(true)
    try {
      await updateGroupSession(session.id, {
        session_date: sessionForm.sessionDate,
        start_time: sessionForm.startTime || null,
        end_time: sessionForm.endTime || null,
        location: sessionForm.location || null,
        activity_type: sessionForm.activityType || null,
        facilitator_id: sessionForm.facilitatorId || null,
        overnight_camp: sessionForm.overnightCamp,
      })
      toast.success('Session updated.')
      setEditingSession(false)
      onChanged()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingSession(false)
    }
  }

  const handleDeleteSession = async () => {
    if (!window.confirm(`Delete this ${session.program?.name ?? 'group'} session from ${session.session_date}? This removes every attendance record logged for it. This cannot be undone.`)) return
    setDeletingSession(true)
    try {
      await deleteGroupSession(session.id)
      toast.success('Group session deleted.')
      onChanged()
    } catch (err) {
      toast.error(err.message)
      setDeletingSession(false)
    }
  }

  if (editingSession) {
    return (
      <div className="group-session-card">
        <form onSubmit={handleSaveSession}>
          <div className="form-grid">
            <div>
              <label className="form-label" htmlFor={`gs-date-${session.id}`}>
                Date
              </label>
              <input
                id={`gs-date-${session.id}`}
                type="date"
                className="input"
                value={sessionForm.sessionDate}
                onChange={(e) => setSessionForm((f) => ({ ...f, sessionDate: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="form-label" htmlFor={`gs-start-${session.id}`}>
                Start Time
              </label>
              <input
                id={`gs-start-${session.id}`}
                type="time"
                className="input"
                value={sessionForm.startTime}
                onChange={(e) => setSessionForm((f) => ({ ...f, startTime: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label" htmlFor={`gs-end-${session.id}`}>
                End Time
              </label>
              <input
                id={`gs-end-${session.id}`}
                type="time"
                className="input"
                value={sessionForm.endTime}
                onChange={(e) => setSessionForm((f) => ({ ...f, endTime: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label" htmlFor={`gs-location-${session.id}`}>
                Location
              </label>
              <input
                id={`gs-location-${session.id}`}
                className="input"
                value={sessionForm.location}
                onChange={(e) => setSessionForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label" htmlFor={`gs-activity-${session.id}`}>
                Activity Type
              </label>
              <input
                id={`gs-activity-${session.id}`}
                className="input"
                value={sessionForm.activityType}
                onChange={(e) => setSessionForm((f) => ({ ...f, activityType: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label" htmlFor={`gs-facilitator-${session.id}`}>
                Staff Facilitating
              </label>
              <select
                id={`gs-facilitator-${session.id}`}
                className="input"
                value={sessionForm.facilitatorId}
                onChange={(e) => setSessionForm((f) => ({ ...f, facilitatorId: e.target.value }))}
              >
                <option value="">Select a staff member...</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {[w.first_name, w.last_name].filter(Boolean).join(' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={sessionForm.overnightCamp}
              onChange={(e) => setSessionForm((f) => ({ ...f, overnightCamp: e.target.checked }))}
            />
            <span>This is an overnight camp</span>
          </label>
          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => setEditingSession(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={savingSession}>
              {savingSession ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="group-session-card">
      <div className="group-session-card-head">
        <div>
          <div className="group-session-card-title">
            {session.program?.name ?? 'Program'} {session.activity_type ? `— ${session.activity_type}` : ''}
          </div>
          <div className="group-session-card-meta">
            {session.session_date}
            {session.location ? ` · ${session.location}` : ''}
            {facilitatorName ? ` · Facilitated by ${facilitatorName}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canEdit && (
            <button type="button" className="icon-button" title="Edit session" onClick={() => setEditingSession(true)}>
              <Pencil strokeWidth={2} />
            </button>
          )}
          {canDelete && (
            <button type="button" className="icon-button" title="Delete session" onClick={handleDeleteSession} disabled={deletingSession}>
              <Trash2 strokeWidth={2} />
            </button>
          )}
          <Button variant="secondary" onClick={handleToggle}>
            {expanded ? 'Hide' : 'Manage'}
          </Button>
        </div>
      </div>
      {expanded && (
        <div className="group-session-card-body">
          <div className="note-item-text" style={{ marginBottom: 14 }}>
            {session.group_note}
          </div>
          {loading ? (
            <div className="data-cell-muted">Loading participants...</div>
          ) : (
            records?.map((r) => (
              <ParticipantRow
                key={r.id}
                record={r}
                sessionId={session.id}
                canEdit={canEdit}
                canDelete={canDelete}
                onRemoved={handleParticipantRemoved}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function GroupSessionsList({ sessions, loading, error, workers = [], canEdit = false, canDelete = false, onChanged = () => {} }) {
  if (loading) {
    return (
      <Card>
        <EmptyState icon={Users2} title="Loading group sessions..." text="Fetching recent group sessions." />
      </Card>
    )
  }
  if (error) {
    return (
      <Card>
        <EmptyState icon={Users2} title="Couldn't load group sessions" text={error} />
      </Card>
    )
  }
  if (sessions.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Users2}
          title="No group sessions yet"
          text="Click 'New Group Session' above to log one — it will create individual case notes for every participant automatically."
        />
      </Card>
    )
  }
  return (
    <Card>
      {sessions.map((session) => (
        <GroupSessionCard key={session.id} session={session} workers={workers} canEdit={canEdit} canDelete={canDelete} onChanged={onChanged} />
      ))}
    </Card>
  )
}
