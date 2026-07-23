import { useState } from 'react'
import { Plus, Award, Pencil, Trash2 } from 'lucide-react'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import StatusPill from '../ui/StatusPill.jsx'
import { useClientOutcomes } from '../../hooks/useClientOutcomes.js'
import { createOutcome, updateOutcome, deleteOutcome } from '../../services/outcomeService.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'

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
