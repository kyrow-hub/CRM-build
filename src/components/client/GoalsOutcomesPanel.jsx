import { useState } from 'react'
import { Plus, TrendingUp } from 'lucide-react'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import StatusPill from '../ui/StatusPill.jsx'
import EmptyState from '../ui/EmptyState.jsx'

const STATUS_OPTIONS = ['Not Started', 'In Progress', 'Achieved', 'Not Achieved']

const STATUS_TONE = {
  'Not Started': 'neutral',
  'In Progress': 'info',
  Achieved: 'success',
  'Not Achieved': 'danger',
}

const emptyForm = { title: '', targetDate: '', status: 'Not Started', notes: '' }

export default function GoalsOutcomesPanel({ clientName }) {
  const [goals, setGoals] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const handleAdd = (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setGoals((prev) => [{ id: Date.now(), ...form, title: form.title.trim() }, ...prev])
    setForm(emptyForm)
    setShowForm(false)
  }

  return (
    <div>
      <div className="section-head">
        <div>
          <div className="section-title">Goals & Outcomes</div>
          <div className="section-subtitle">
            {goals.length} {goals.length === 1 ? 'goal' : 'goals'} for {clientName}
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
                  placeholder="e.g. Improve school attendance"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                />
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
              <Button type="submit">Save Goal</Button>
            </div>
          </form>
        </Card>
      )}

      <Card style={goals.length === 0 ? undefined : { padding: 0 }}>
        {goals.length === 0 ? (
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
            {goals.map((g) => (
              <div className="data-row goals-row" key={g.id}>
                <span>{g.title}</span>
                <span className="data-cell-muted goals-col-date">{g.targetDate || '—'}</span>
                <StatusPill tone={STATUS_TONE[g.status] ?? 'neutral'}>{g.status}</StatusPill>
                <span className="data-cell-muted goals-col-notes">{g.notes || '—'}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
