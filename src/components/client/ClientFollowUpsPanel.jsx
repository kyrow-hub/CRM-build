import { useEffect, useState } from 'react'
import { Plus, CalendarClock, Check, X, RotateCcw } from 'lucide-react'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import StatusPill from '../ui/StatusPill.jsx'
import { useClientFollowUps } from '../../hooks/useClientFollowUps.js'
import { createFollowUp, updateFollowUpStatus } from '../../services/followUpService.js'
import { listAssignableWorkers } from '../../services/clientService.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'

const STATUS_TONE = { Pending: 'info', Completed: 'success', Cancelled: 'neutral' }

const todayISO = () => new Date().toISOString().slice(0, 10)

const emptyForm = { title: '', due_date: todayISO(), assigned_to: '', notes: '' }

function FollowUpItem({ followUp, onUpdated }) {
  const toast = useToast()
  const [submitting, setSubmitting] = useState(false)

  const assigneeName = followUp.assignee
    ? [followUp.assignee.first_name, followUp.assignee.last_name].filter(Boolean).join(' ')
    : null
  const isOverdue = followUp.status === 'Pending' && followUp.due_date < todayISO()

  const handleStatusChange = async (status) => {
    setSubmitting(true)
    try {
      await updateFollowUpStatus(followUp.id, status)
      toast.success(`Follow-up marked ${status.toLowerCase()}.`)
      onUpdated()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="note-item">
      <div className="note-item-meta">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 600 }}>{followUp.title}</span>
          <StatusPill tone={STATUS_TONE[followUp.status] ?? 'neutral'}>{followUp.status}</StatusPill>
          {isOverdue && <StatusPill tone="danger">Overdue</StatusPill>}
        </div>
        <span style={isOverdue ? { color: '#f87171', fontWeight: 600 } : undefined}>{followUp.due_date}</span>
      </div>
      <div className="data-cell-muted" style={{ marginBottom: followUp.notes ? 6 : 0 }}>
        {assigneeName ? `Assigned to ${assigneeName}` : 'Unassigned'}
      </div>
      {followUp.notes && <div className="note-item-text">{followUp.notes}</div>}
      <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
        {followUp.status === 'Pending' && (
          <>
            <button type="button" className="link-button" onClick={() => handleStatusChange('Completed')} disabled={submitting}>
              <Check strokeWidth={2} style={{ width: 13, height: 13, marginRight: 4, verticalAlign: 'text-bottom' }} />
              Mark Complete
            </button>
            <button
              type="button"
              className="link-button"
              style={{ color: '#f87171' }}
              onClick={() => handleStatusChange('Cancelled')}
              disabled={submitting}
            >
              <X strokeWidth={2} style={{ width: 13, height: 13, marginRight: 4, verticalAlign: 'text-bottom' }} />
              Cancel
            </button>
          </>
        )}
        {followUp.status !== 'Pending' && (
          <button type="button" className="link-button" onClick={() => handleStatusChange('Pending')} disabled={submitting}>
            <RotateCcw strokeWidth={2} style={{ width: 13, height: 13, marginRight: 4, verticalAlign: 'text-bottom' }} />
            Reopen
          </button>
        )}
      </div>
    </div>
  )
}

export default function ClientFollowUpsPanel({ clientId, clientName }) {
  const { user } = useAuth()
  const toast = useToast()
  const { followUps, loading, error, refetch } = useClientFollowUps(clientId)
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
    setSubmitting(true)
    try {
      await createFollowUp({
        client_id: clientId,
        title: form.title.trim(),
        due_date: form.due_date,
        assigned_to: form.assigned_to || null,
        notes: form.notes.trim() || null,
        created_by: user?.id,
      })
      toast.success('Follow-up scheduled.')
      setForm(emptyForm)
      setShowForm(false)
      refetch()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const pendingCount = followUps.filter((f) => f.status === 'Pending').length

  return (
    <div>
      <div className="section-head">
        <div>
          <div className="section-title">Follow Ups</div>
          <div className="section-subtitle">
            {loading ? 'Loading...' : `${pendingCount} pending of ${followUps.length} for ${clientName}`}
          </div>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus strokeWidth={2} />
          Add Follow Up
        </Button>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 18 }}>
          <form onSubmit={handleAdd}>
            <div className="form-grid">
              <div>
                <label className="form-label" htmlFor="fu-title">
                  Title
                </label>
                <input
                  id="fu-title"
                  className="input"
                  placeholder="e.g. Call parent re: school enrolment"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="fu-date">
                  Due Date
                </label>
                <input
                  id="fu-date"
                  type="date"
                  className="input"
                  value={form.due_date}
                  onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="fu-assignee">
                  Assigned To (optional)
                </label>
                <select
                  id="fu-assignee"
                  className="input"
                  value={form.assigned_to}
                  onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))}
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
              <label className="form-label" htmlFor="fu-notes">
                Notes
              </label>
              <textarea
                id="fu-notes"
                className="input"
                rows={2}
                placeholder="Optional details..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card style={!loading && followUps.length === 0 ? undefined : { padding: 0 }}>
        {loading ? (
          <EmptyState icon={CalendarClock} title="Loading..." text="Fetching follow-ups for this client." />
        ) : error ? (
          <EmptyState icon={CalendarClock} title="Couldn't load follow-ups" text={error} />
        ) : followUps.length === 0 ? (
          <EmptyState icon={CalendarClock} title="No follow-ups scheduled" text="Upcoming and completed follow-ups will be tracked here." />
        ) : (
          <div className="note-list">
            {followUps.map((f) => (
              <FollowUpItem key={f.id} followUp={f} onUpdated={refetch} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
