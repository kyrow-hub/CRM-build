import { useEffect, useState } from 'react'
import { Plus, ClipboardList, X } from 'lucide-react'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import { useClientStaffAssignments } from '../../hooks/useClientStaffAssignments.js'
import { addStaffAssignment, removeStaffAssignment } from '../../services/clientStaffAssignmentService.js'
import { listAssignableWorkers } from '../../services/clientService.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { initials } from '../../utils/initials.js'
import { avatarTone } from '../../utils/avatarColor.js'

const ROLE_OPTIONS = [
  'Primary Case Worker',
  'Secondary Case Worker',
  'Program Worker',
  'Cultural Support Worker',
  'Family Support Worker',
  'Supervisor',
  'Other',
]

const todayISO = () => new Date().toISOString().slice(0, 10)

const emptyForm = { profile_id: '', role_on_case: ROLE_OPTIONS[0], assigned_date: todayISO(), notes: '' }

export default function ClientStaffRegisterPanel({ clientId, clientName }) {
  const { user, profile } = useAuth()
  const toast = useToast()
  const { assignments, loading, error, refetch } = useClientStaffAssignments(clientId)
  const [workers, setWorkers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [removingId, setRemovingId] = useState(null)

  const canRemove = profile?.role === 'administrator' || profile?.role === 'manager'

  useEffect(() => {
    listAssignableWorkers()
      .then(setWorkers)
      .catch(() => setWorkers([]))
  }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await addStaffAssignment({
        client_id: clientId,
        profile_id: form.profile_id,
        role_on_case: form.role_on_case,
        assigned_date: form.assigned_date,
        notes: form.notes.trim() || null,
        created_by: user?.id,
      })
      toast.success('Staff member added to register.')
      setForm(emptyForm)
      setShowForm(false)
      refetch()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemove = async (assignment) => {
    if (!window.confirm(`Remove ${assignment.worker ? [assignment.worker.first_name, assignment.worker.last_name].filter(Boolean).join(' ') : 'this staff member'} from the register?`)) return
    setRemovingId(assignment.id)
    try {
      await removeStaffAssignment(assignment.id)
      toast.success('Removed from register.')
      refetch()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div>
      <div className="section-head">
        <div>
          <div className="section-title">Staff Register</div>
          <div className="section-subtitle">
            {loading
              ? 'Loading...'
              : `${assignments.length} staff ${assignments.length === 1 ? 'member' : 'members'} responsible for ${clientName}`}
          </div>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus strokeWidth={2} />
          Add Staff Member
        </Button>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 18 }}>
          <form onSubmit={handleAdd}>
            <div className="form-grid">
              <div>
                <label className="form-label" htmlFor="sr-worker">
                  Staff Member
                </label>
                <select
                  id="sr-worker"
                  className="input"
                  value={form.profile_id}
                  onChange={(e) => setForm((f) => ({ ...f, profile_id: e.target.value }))}
                  required
                >
                  <option value="">Select a staff member...</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {[w.first_name, w.last_name].filter(Boolean).join(' ') || w.id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="sr-role">
                  Role on Case
                </label>
                <select
                  id="sr-role"
                  className="input"
                  value={form.role_on_case}
                  onChange={(e) => setForm((f) => ({ ...f, role_on_case: e.target.value }))}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="sr-date">
                  Assigned Date
                </label>
                <input
                  id="sr-date"
                  type="date"
                  className="input"
                  value={form.assigned_date}
                  onChange={(e) => setForm((f) => ({ ...f, assigned_date: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label className="form-label" htmlFor="sr-notes">
                Notes
              </label>
              <textarea
                id="sr-notes"
                className="input"
                rows={2}
                placeholder="Optional notes about this assignment..."
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

      <Card style={!loading && assignments.length === 0 ? undefined : { padding: 0 }}>
        {loading ? (
          <EmptyState icon={ClipboardList} title="Loading..." text="Fetching this client's staff register." />
        ) : error ? (
          <EmptyState icon={ClipboardList} title="Couldn't load staff register" text={error} />
        ) : assignments.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No staff assigned yet"
            text="Staff members responsible for this client will be listed here."
          />
        ) : (
          <div className="note-list">
            {assignments.map((a) => {
              const name = a.worker ? [a.worker.first_name, a.worker.last_name].filter(Boolean).join(' ') : 'Unknown'
              return (
                <div className="note-item" key={a.id}>
                  <div className="note-item-meta">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className={`client-avatar avatar--${avatarTone(name)}`} style={{ width: 26, height: 26, fontSize: 10.5 }}>
                        {initials(name)}
                      </div>
                      <span>
                        {name} · {a.role_on_case}
                      </span>
                    </div>
                    <span>{a.assigned_date}</span>
                  </div>
                  {a.notes && <div className="note-item-text">{a.notes}</div>}
                  {canRemove && (
                    <button
                      type="button"
                      className="link-button"
                      style={{ color: '#f87171', marginTop: 8 }}
                      onClick={() => handleRemove(a)}
                      disabled={removingId === a.id}
                    >
                      <X strokeWidth={2} style={{ width: 13, height: 13, marginRight: 4, verticalAlign: 'text-bottom' }} />
                      {removingId === a.id ? 'Removing...' : 'Remove'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
