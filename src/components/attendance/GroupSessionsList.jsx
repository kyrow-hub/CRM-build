import { useState } from 'react'
import { Users2 } from 'lucide-react'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import StatusPill from '../ui/StatusPill.jsx'
import { listSessionAttendance, addIndividualSessionNote } from '../../services/groupSessionService.js'
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

function ParticipantRow({ record, sessionId }) {
  const { user } = useAuth()
  const toast = useToast()
  const [showNote, setShowNote] = useState(false)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
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

  return (
    <div className="group-session-participant-detail">
      <div className="group-session-participant-detail-main">
        <div className={`client-avatar avatar--${avatarTone(name)}`}>{initials(name)}</div>
        <span style={{ flex: 1, fontWeight: 600, fontSize: 13.5 }}>{name}</span>
        <StatusPill tone={STATUS_TONE[record.attendance_status] ?? 'neutral'}>{record.attendance_status}</StatusPill>
        <button type="button" className="link-button" onClick={() => setShowNote((v) => !v)}>
          {showNote ? 'Cancel' : 'Add individual note'}
        </button>
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

function GroupSessionCard({ session }) {
  const [expanded, setExpanded] = useState(false)
  const [records, setRecords] = useState(null)
  const [loading, setLoading] = useState(false)
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
        <Button variant="secondary" onClick={handleToggle}>
          {expanded ? 'Hide' : 'Manage'}
        </Button>
      </div>
      {expanded && (
        <div className="group-session-card-body">
          <div className="note-item-text" style={{ marginBottom: 14 }}>
            {session.group_note}
          </div>
          {loading ? (
            <div className="data-cell-muted">Loading participants...</div>
          ) : (
            records?.map((r) => <ParticipantRow key={r.id} record={r} sessionId={session.id} />)
          )}
        </div>
      )}
    </div>
  )
}

export default function GroupSessionsList({ sessions, loading, error }) {
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
        <GroupSessionCard key={session.id} session={session} />
      ))}
    </Card>
  )
}
