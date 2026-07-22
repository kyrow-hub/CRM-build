import { useState } from 'react'
import { Plus, Activity } from 'lucide-react'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import StatusPill from '../ui/StatusPill.jsx'
import { useCaseActivities } from '../../hooks/useCaseActivities.js'
import { createCaseActivity } from '../../services/caseActivityService.js'
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

export default function CaseActivitiesPanel({ clientId, clientName }) {
  const { user } = useAuth()
  const toast = useToast()
  const { activities, loading, error, refetch } = useCaseActivities(clientId)
  const [showForm, setShowForm] = useState(false)
  const [activityType, setActivityType] = useState(ACTIVITY_TYPES[0])
  const [activityDate, setActivityDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [confidential, setConfidential] = useState(false)
  const [submitting, setSubmitting] = useState(false)

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
            {activities.map((a) => {
              const authorName = a.author
                ? [a.author.first_name, a.author.last_name].filter(Boolean).join(' ') || 'Unknown'
                : 'Unknown'
              return (
                <div className="note-item" key={a.id}>
                  <div className="note-item-meta">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>
                        {authorName} · {a.activity_type}
                      </span>
                      {a.confidential && <StatusPill tone="danger">Confidential</StatusPill>}
                    </div>
                    <span>{a.activity_date}</span>
                  </div>
                  {a.notes && <div className="note-item-text">{a.notes}</div>}
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
