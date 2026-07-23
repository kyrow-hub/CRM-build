import { useState } from 'react'
import { Plus, Activity, Pencil, Trash2 } from 'lucide-react'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import StatusPill from '../ui/StatusPill.jsx'
import { useCaseActivities } from '../../hooks/useCaseActivities.js'
import { createCaseActivity, updateCaseActivity, deleteCaseActivity } from '../../services/caseActivityService.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'

const ACTIVITY_TYPES = [
  'Individual Support Session',
  'Home Visit',
  'School Visit',
  'Family Meeting',
  'Case Conference',
  'Referral Made',
  'Safety Plan',
  'Other',
]

const todayISO = () => new Date().toISOString().slice(0, 10)

function ActivityItem({ activity, canEdit, canDelete, onUpdated, onDeleted }) {
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [activityType, setActivityType] = useState(activity.activity_type)
  const [activityDate, setActivityDate] = useState(activity.activity_date)
  const [notes, setNotes] = useState(activity.notes || '')
  const [confidential, setConfidential] = useState(activity.confidential)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const authorName = activity.author ? [activity.author.first_name, activity.author.last_name].filter(Boolean).join(' ') || 'Unknown' : 'Unknown'

  const handleSave = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await updateCaseActivity(activity.id, {
        activity_type: activityType,
        activity_date: activityDate,
        notes: notes.trim() || null,
        confidential,
      })
      toast.success('Activity updated.')
      setEditing(false)
      onUpdated()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this activity? This cannot be undone.')) return
    setDeleting(true)
    try {
      await deleteCaseActivity(activity.id)
      toast.success('Activity deleted.')
      onDeleted()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleting(false)
    }
  }

  if (editing) {
    return (
      <div className="note-item">
        <form onSubmit={handleSave}>
          <div className="form-grid">
            <div>
              <label className="form-label" htmlFor={`activity-type-${activity.id}`}>
                Activity Type
              </label>
              <select id={`activity-type-${activity.id}`} className="input" value={activityType} onChange={(e) => setActivityType(e.target.value)}>
                {ACTIVITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor={`activity-date-${activity.id}`}>
                Date
              </label>
              <input
                id={`activity-date-${activity.id}`}
                type="date"
                className="input"
                value={activityDate}
                onChange={(e) => setActivityDate(e.target.value)}
                required
              />
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <label className="checkbox-field">
            <input type="checkbox" checked={confidential} onChange={(e) => setConfidential(e.target.checked)} />
            <span>Mark as confidential (only visible to you and administrators/managers)</span>
          </label>
          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="note-item">
      <div className="note-item-meta">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>
            {authorName} · {activity.activity_type}
          </span>
          {activity.confidential && <StatusPill tone="danger">Confidential</StatusPill>}
        </div>
        <span>{activity.activity_date}</span>
      </div>
      {activity.notes && <div className="note-item-text">{activity.notes}</div>}
      {(canEdit || canDelete) && (
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          {canEdit && (
            <button type="button" className="link-button" onClick={() => setEditing(true)}>
              <Pencil strokeWidth={2} style={{ width: 13, height: 13, marginRight: 4, verticalAlign: 'text-bottom' }} />
              Edit
            </button>
          )}
          {canDelete && (
            <button type="button" className="link-button" style={{ color: '#f87171' }} onClick={handleDelete} disabled={deleting}>
              <Trash2 strokeWidth={2} style={{ width: 13, height: 13, marginRight: 4, verticalAlign: 'text-bottom' }} />
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function CaseActivitiesPanel({ clientId, clientName }) {
  const { user, profile } = useAuth()
  const toast = useToast()
  const { activities, loading, error, refetch } = useCaseActivities(clientId)
  const [showForm, setShowForm] = useState(false)
  const [activityType, setActivityType] = useState(ACTIVITY_TYPES[0])
  const [activityDate, setActivityDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [confidential, setConfidential] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const isAdminManager = profile?.role === 'administrator' || profile?.role === 'manager'

  const handleAdd = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createCaseActivity({
        client_id: clientId,
        activity_type: activityType,
        activity_date: activityDate,
        notes: notes.trim() || null,
        confidential,
        created_by: user?.id,
      })
      toast.success('Case activity logged.')
      setActivityType(ACTIVITY_TYPES[0])
      setActivityDate(todayISO())
      setNotes('')
      setConfidential(false)
      setShowForm(false)
      refetch()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="section-head">
        <div>
          <div className="section-title">Case Activities</div>
          <div className="section-subtitle">
            {loading
              ? 'Loading...'
              : `${activities.length} ${activities.length === 1 ? 'activity' : 'activities'} for ${clientName}`}
          </div>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus strokeWidth={2} />
          Log Activity
        </Button>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 18 }}>
          <form onSubmit={handleAdd}>
            <div className="form-grid">
              <div>
                <label className="form-label" htmlFor="activity-type">
                  Activity Type
                </label>
                <select
                  id="activity-type"
                  className="input"
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                >
                  {ACTIVITY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="activity-date">
                  Date
                </label>
                <input
                  id="activity-date"
                  type="date"
                  className="input"
                  value={activityDate}
                  onChange={(e) => setActivityDate(e.target.value)}
                  required
                />
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label className="form-label" htmlFor="activity-notes">
                Notes
              </label>
              <textarea
                id="activity-notes"
                className="input"
                rows={3}
                placeholder="What happened during this activity..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <label className="checkbox-field">
              <input type="checkbox" checked={confidential} onChange={(e) => setConfidential(e.target.checked)} />
              <span>Mark as confidential (only visible to you and administrators/managers)</span>
            </label>
            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Activity'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card style={!loading && activities.length === 0 ? undefined : { padding: 0 }}>
        {loading ? (
          <EmptyState icon={Activity} title="Loading activities..." text="Fetching case activities for this client." />
        ) : error ? (
          <EmptyState icon={Activity} title="Couldn't load activities" text={error} />
        ) : activities.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No case activities yet"
            text="Home visits, school visits, family meetings, and other activities logged for this client will appear here."
          />
        ) : (
          <div className="note-list">
            {activities.map((a) => (
              <ActivityItem
                key={a.id}
                activity={a}
                canEdit={isAdminManager || a.created_by === user?.id}
                canDelete={isAdminManager}
                onUpdated={refetch}
                onDeleted={refetch}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
