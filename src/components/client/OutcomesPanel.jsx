import { useState } from 'react'
import { Plus, Award } from 'lucide-react'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import StatusPill from '../ui/StatusPill.jsx'
import { useClientOutcomes } from '../../hooks/useClientOutcomes.js'
import { createOutcome } from '../../services/outcomeService.js'
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

export default function OutcomesPanel({ clientId, clientName }) {
  const { user } = useAuth()
  const toast = useToast()
  const { outcomes, loading, error, refetch } = useClientOutcomes(clientId)
  const [showForm, setShowForm] = useState(false)
  const [category, setCategory] = useState(CATEGORIES[0])
  const [outcomeType, setOutcomeType] = useState('')
  const [outcomeDate, setOutcomeDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [confidential, setConfidential] = useState(false)
  const [submitting, setSubmitting] = useState(false)

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
            {outcomes.map((o) => {
              const authorName = o.author
                ? [o.author.first_name, o.author.last_name].filter(Boolean).join(' ') || 'Unknown'
                : 'Unknown'
              return (
                <div className="note-item" key={o.id}>
                  <div className="note-item-meta">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <StatusPill tone={CATEGORY_TONE[o.category] ?? 'neutral'}>{o.category}</StatusPill>
                      <span>
                        {o.outcome_type} · {authorName}
                      </span>
                      {o.confidential && <StatusPill tone="danger">Confidential</StatusPill>}
                    </div>
                    <span>{o.outcome_date}</span>
                  </div>
                  {o.notes && <div className="note-item-text">{o.notes}</div>}
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
