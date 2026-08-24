import { useState } from 'react'
import { Plus, Award, Pencil, Trash2, TrendingUp } from 'lucide-react'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import StatusPill from '../ui/StatusPill.jsx'
import { useClientOutcomes } from '../../hooks/useClientOutcomes.js'
import { useClientGoals } from '../../hooks/useClientGoals.js'
import { createOutcome, updateOutcome, deleteOutcome } from '../../services/outcomeService.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'

const GOAL_STATUS_TONE = {
  'Not Started': 'neutral',
  'In Progress': 'info',
  Achieved: 'success',
  'Not Achieved': 'danger',
}

const WILLINGNESS_TONE = {
  'Not Interested in Change': 'danger',
  'Thinking About Change': 'warning',
  'Taking Steps to Change': 'info',
  'Making Change': 'success',
}

// Ties Goals (status + Willingness to Change) and Outcomes together into
// one at-a-glance summary, since they're tracked on separate tabs but
// answer the same underlying question: how is this client actually going?
function ChangeProgressTracker({ clientId, outcomeCount }) {
  const { goals, loading } = useClientGoals(clientId)

  if (loading || goals.length === 0) return null

  const latestWillingness = goals.find((g) => g.willingness_to_change)?.willingness_to_change
  const total = goals.length
  const achieved = goals.filter((g) => g.status === 'Achieved').length
  const inProgress = goals.filter((g) => g.status === 'In Progress').length
  const notStarted = goals.filter((g) => g.status === 'Not Started').length
  const notAchieved = goals.filter((g) => g.status === 'Not Achieved').length
  const achievedPct = total > 0 ? Math.round((achieved / total) * 100) : 0

  return (
    <Card style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <TrendingUp strokeWidth={2} style={{ width: 18, height: 18, color: 'var(--accent)' }} />
        <div className="section-title" style={{ marginBottom: 0 }}>
          Change Progress
        </div>
      </div>
      <div className="section-subtitle" style={{ marginBottom: 16 }}>
        How this client is tracking toward their goals, based on the latest Willingness to Change rating and goal
        outcomes so far.
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div className="data-cell-muted" style={{ marginBottom: 6 }}>
            Current Willingness to Change
          </div>
          {latestWillingness ? (
            <StatusPill tone={WILLINGNESS_TONE[latestWillingness] ?? 'neutral'}>{latestWillingness}</StatusPill>
          ) : (
            <span className="data-cell-muted">Not recorded</span>
          )}
        </div>
        <div>
          <div className="data-cell-muted" style={{ marginBottom: 6 }}>
            Outcomes Recorded
          </div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{outcomeCount}</div>
        </div>
      </div>

      <div className="data-cell-muted" style={{ marginBottom: 6 }}>
        Goal Progress · {achieved} of {total} achieved ({achievedPct}%)
      </div>
      <div style={{ display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden', background: 'var(--surface-2)', marginBottom: 12 }}>
        {achieved > 0 && <div style={{ width: `${(achieved / total) * 100}%`, background: '#22c55e' }} />}
        {inProgress > 0 && <div style={{ width: `${(inProgress / total) * 100}%`, background: '#3b82f6' }} />}
        {notAchieved > 0 && <div style={{ width: `${(notAchieved / total) * 100}%`, background: '#ef4444' }} />}
        {notStarted > 0 && <div style={{ width: `${(notStarted / total) * 100}%`, background: 'var(--border)' }} />}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <StatusPill tone={GOAL_STATUS_TONE.Achieved}>{achieved} Achieved</StatusPill>
        <StatusPill tone={GOAL_STATUS_TONE['In Progress']}>{inProgress} In Progress</StatusPill>
        <StatusPill tone={GOAL_STATUS_TONE['Not Started']}>{notStarted} Not Started</StatusPill>
        <StatusPill tone={GOAL_STATUS_TONE['Not Achieved']}>{notAchieved} Not Achieved</StatusPill>
      </div>
    </Card>
  )
}

const CATEGORIES = ['Education', 'Employment', 'Health', 'Justice', 'Family', 'Cultural', 'Camp']

const CATEGORY_SUGGESTIONS = {
  Education: ['School Enrolment', 'Attendance Improvement', 'Re-engagement with Education', 'Alternative Education', 'Qualification Commenced', 'Qualification Completed'],
  Employment: ['Employment Gained', 'Work Experience Completed', 'Job Readiness Activity', 'Training Participation', 'Apprenticeship', 'Traineeship'],
  Health: ['Mental Health Referral', 'AOD Referral', 'Housing Support', 'Medical Appointment', 'Counselling Attendance', 'Physical Wellbeing Activity'],
  Justice: ['Bail Support', 'Court Support', 'Diversion Participation', 'Offending Behaviour Goal', 'Breach Recorded', 'Protective Factor'],
  Family: ['Family Meeting Outcome', 'Family Participation', 'Improved Family Relationship', 'Parenting Support Referral'],
  Cultural: ['Connection to Country Activity', 'Elder Engagement', 'Cultural Mentoring', 'Language Activity', 'Traditional Practice'],
  Camp: ['Camp Outcome', 'Camp Behaviour Improvement', 'Peer Relationship Outcome'],
}

const CATEGORY_TONE = {
  Education: 'info',
  Employment: 'success',
  Health: 'warning',
  Justice: 'danger',
  Family: 'neutral',
  Cultural: 'info',
  Camp: 'success',
}

const todayISO = () => new Date().toISOString().slice(0, 10)

function OutcomeItem({ outcome, canEdit, canDelete, onUpdated, onDeleted }) {
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [category, setCategory] = useState(outcome.category)
  const [outcomeType, setOutcomeType] = useState(outcome.outcome_type)
  const [outcomeDate, setOutcomeDate] = useState(outcome.outcome_date)
  const [notes, setNotes] = useState(outcome.notes || '')
  const [confidential, setConfidential] = useState(outcome.confidential)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const authorName = outcome.author ? [outcome.author.first_name, outcome.author.last_name].filter(Boolean).join(' ') || 'Unknown' : 'Unknown'

  const handleSave = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await updateOutcome(outcome.id, {
        category,
        outcome_type: outcomeType.trim(),
        outcome_date: outcomeDate,
        notes: notes.trim() || null,
        confidential,
      })
      toast.success('Outcome updated.')
      setEditing(false)
      onUpdated()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this outcome? This cannot be undone.')) return
    setDeleting(true)
    try {
      await deleteOutcome(outcome.id)
      toast.success('Outcome deleted.')
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
              <label className="form-label" htmlFor={`eo-category-${outcome.id}`}>
                Category
              </label>
              <select id={`eo-category-${outcome.id}`} className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor={`eo-type-${outcome.id}`}>
                Outcome
              </label>
              <input
                id={`eo-type-${outcome.id}`}
                className="input"
                list={`eo-suggestions-${outcome.id}`}
                value={outcomeType}
                onChange={(e) => setOutcomeType(e.target.value)}
                required
              />
              <datalist id={`eo-suggestions-${outcome.id}`}>
                {(CATEGORY_SUGGESTIONS[category] ?? []).map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="form-label" htmlFor={`eo-date-${outcome.id}`}>
                Date
              </label>
              <input
                id={`eo-date-${outcome.id}`}
                type="date"
                className="input"
                value={outcomeDate}
                onChange={(e) => setOutcomeDate(e.target.value)}
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
          <StatusPill tone={CATEGORY_TONE[outcome.category] ?? 'neutral'}>{outcome.category}</StatusPill>
          <span>
            {outcome.outcome_type} · {authorName}
          </span>
          {outcome.confidential && <StatusPill tone="danger">Confidential</StatusPill>}
        </div>
        <span>{outcome.outcome_date}</span>
      </div>
      {outcome.notes && <div className="note-item-text">{outcome.notes}</div>}
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

export default function OutcomesPanel({ clientId, clientName }) {
  const { user, profile } = useAuth()
  const toast = useToast()
  const { outcomes, loading, error, refetch } = useClientOutcomes(clientId)
  const [showForm, setShowForm] = useState(false)
  const [category, setCategory] = useState(CATEGORIES[0])
  const [outcomeType, setOutcomeType] = useState('')
  const [outcomeDate, setOutcomeDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [confidential, setConfidential] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const isAdminManager = profile?.role === 'administrator' || profile?.role === 'manager'

  const handleAdd = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createOutcome({
        client_id: clientId,
        category,
        outcome_type: outcomeType.trim(),
        outcome_date: outcomeDate,
        notes: notes.trim() || null,
        confidential,
        created_by: user?.id,
      })
      toast.success('Outcome recorded.')
      setCategory(CATEGORIES[0])
      setOutcomeType('')
      setOutcomeDate(todayISO())
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
      <ChangeProgressTracker clientId={clientId} outcomeCount={outcomes.length} />

      <div className="section-head">
        <div>
          <div className="section-title">Outcomes</div>
          <div className="section-subtitle">
            {loading
              ? 'Loading...'
              : `${outcomes.length} ${outcomes.length === 1 ? 'outcome' : 'outcomes'} for ${clientName}`}
          </div>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus strokeWidth={2} />
          Record Outcome
        </Button>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 18 }}>
          <form onSubmit={handleAdd}>
            <div className="form-grid">
              <div>
                <label className="form-label" htmlFor="outcome-category">
                  Category
                </label>
                <select
                  id="outcome-category"
                  className="input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="outcome-type">
                  Outcome
                </label>
                <input
                  id="outcome-type"
                  className="input"
                  list="outcome-suggestions"
                  placeholder="e.g. Employment Gained"
                  value={outcomeType}
                  onChange={(e) => setOutcomeType(e.target.value)}
                  required
                />
                <datalist id="outcome-suggestions">
                  {(CATEGORY_SUGGESTIONS[category] ?? []).map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="form-label" htmlFor="outcome-date">
                  Date
                </label>
                <input
                  id="outcome-date"
                  type="date"
                  className="input"
                  value={outcomeDate}
                  onChange={(e) => setOutcomeDate(e.target.value)}
                  required
                />
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label className="form-label" htmlFor="outcome-notes">
                Notes
              </label>
              <textarea
                id="outcome-notes"
                className="input"
                rows={3}
                placeholder="Details about this outcome..."
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
                {submitting ? 'Saving...' : 'Save Outcome'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card style={!loading && outcomes.length === 0 ? undefined : { padding: 0 }}>
        {loading ? (
          <EmptyState icon={Award} title="Loading outcomes..." text="Fetching recorded outcomes for this client." />
        ) : error ? (
          <EmptyState icon={Award} title="Couldn't load outcomes" text={error} />
        ) : outcomes.length === 0 ? (
          <EmptyState
            icon={Award}
            title="No outcomes recorded yet"
            text="Education, employment, health, justice, family, and cultural outcomes for this client will appear here."
          />
        ) : (
          <div className="note-list">
            {outcomes.map((o) => (
              <OutcomeItem
                key={o.id}
                outcome={o}
                canEdit={isAdminManager || o.created_by === user?.id}
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
