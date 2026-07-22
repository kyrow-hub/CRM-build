import { useEffect, useState } from 'react'
import { Plus, TrendingUp } from 'lucide-react'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import StatusPill from '../ui/StatusPill.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import { useClientGoals } from '../../hooks/useClientGoals.js'
import { createClientGoal } from '../../services/clientGoalService.js'
import { listAssignableWorkers } from '../../services/clientService.js'
import { GOAL_TYPES } from '../../data/assessmentOptions.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'

const STATUS_OPTIONS = ['Not Started', 'In Progress', 'Achieved', 'Not Achieved']

const STATUS_TONE = {
  'Not Started': 'neutral',
  'In Progress': 'info',
  Achieved: 'success',
  'Not Achieved': 'danger',
}

const emptyForm = { title: '', targetDate: '', status: 'Not Started', actions: '', responsiblePerson: '', notes: '' }

export default function GoalsOutcomesPanel({ clientId, clientName }) {
  const { user } = useAuth()
  const toast = useToast()
  const { goals, loading, error, refetch } = useClientGoals(clientId)
  const [workers, setWorkers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    listAssignableWorkers()
      .then(setWorkers)
      .catch(() => setWorkers([]))
  }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSubmitting(true)
    try {
      await createClientGoal({
        client_id: clientId,
        title: form.title.trim(),
        target_date: form.targetDate || null,
        status: form.status,
        actions: form.actions.trim() || null,
        responsible_person: form.responsiblePerson || null,
        notes: form.notes || null,
        created_by: user?.id,
      })
      toast.success('Goal added.')
      setForm(emptyForm)
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
          <div className="section-title">Goals & Outcomes</div>
          <div className="section-subtitle">
            {loading ? 'Loading...' : `${goals.length} ${goals.length === 1 ? 'goal' : 'goals'} for ${clientName}`}
          </div>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus strokeWidth={2} />
          Add Goal
        </Button>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 18 }}>
          <form onSubmit={handleAdd}>
            <div className="form-grid">
              <div>
                <label className="form-label" htmlFor="goal-title">
                  Goal
                </label>
                <input
                  id="goal-title"
                  className="input"
                  list="goal-type-options"
                  placeholder="e.g. Improve school attendance"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                />
                <datalist id="goal-type-options">
                  {GOAL_TYPES.map((g) => (
                    <option key={g} value={g} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="form-label" htmlFor="goal-date">
                  Target Date
                </label>
                <input
                  id="goal-date"
                  type="date"
                  className="input"
                  value={form.targetDate}
                  onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="goal-status">
                  Status
                </label>
                <select
                  id="goal-status"
                  className="input"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="goal-responsible">
                  Responsible Person
                </label>
                <select
                  id="goal-responsible"
                  className="input"
                  value={form.responsiblePerson}
                  onChange={(e) => setForm((f) => ({ ...f, responsiblePerson: e.target.value }))}
                >
                  <option value="">Unassigned</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {[w.first_name, w.last_name].filter(Boolean).join(' ') || w.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label className="form-label" htmlFor="goal-actions">
                Actions
              </label>
              <textarea
                id="goal-actions"
                className="input"
                rows={2}
                placeholder="Steps agreed to work toward this goal..."
                value={form.actions}
                onChange={(e) => setForm((f) => ({ ...f, actions: e.target.value }))}
              />
            </div>
            <div style={{ marginTop: 14 }}>
              <label className="form-label" htmlFor="goal-notes">
                Outcome Notes
              </label>
              <textarea
                id="goal-notes"
                className="input"
                rows={3}
                placeholder="Progress notes or outcome details..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Goal'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card style={!loading && goals.length === 0 ? undefined : { padding: 0 }}>
        {loading ? (
          <EmptyState icon={TrendingUp} title="Loading goals..." text="Fetching goals for this client." />
        ) : error ? (
          <EmptyState icon={TrendingUp} title="Couldn't load goals" text={error} />
        ) : goals.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No goals set yet"
            text="Goals and outcome tracking for this client will appear here."
          />
        ) : (
          <div className="data-table">
            <div className="data-row goals-row data-row--head">
              <span>Goal</span>
              <span className="goals-col-date">Target Date</span>
              <span>Status</span>
              <span className="goals-col-notes">Outcome Notes</span>
            </div>
            {goals.map((g) => {
              const responsibleName = g.responsible
                ? [g.responsible.first_name, g.responsible.last_name].filter(Boolean).join(' ')
                : null
              return (
              <div className="data-row goals-row" key={g.id}>
                <span>
                  {g.title}
                  {responsibleName && <div className="data-cell-muted" style={{ fontSize: 11.5 }}>Responsible: {responsibleName}</div>}
                  {g.actions && <div className="data-cell-muted" style={{ fontSize: 11.5 }}>Actions: {g.actions}</div>}
                </span>
                <span className="data-cell-muted goals-col-date">{g.target_date || '—'}</span>
                <StatusPill tone={STATUS_TONE[g.status] ?? 'neutral'}>{g.status}</StatusPill>
                <span className="data-cell-muted goals-col-notes">{g.notes || '—'}</span>
              </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
