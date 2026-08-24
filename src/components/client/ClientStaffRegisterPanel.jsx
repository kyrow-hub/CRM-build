import { useEffect, useState } from 'react'
import { Plus, ClipboardList, X, Pencil } from 'lucide-react'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import StatusPill from '../ui/StatusPill.jsx'
import { useClientStaffAssignments } from '../../hooks/useClientStaffAssignments.js'
import { addStaffAssignment, updateStaffAssignment, removeStaffAssignment } from '../../services/clientStaffAssignmentService.js'
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

const emptyForm = {
  personType: 'internal',
  profile_id: '',
  externalName: '',
  externalOrganisation: '',
  role_on_case: ROLE_OPTIONS[0],
  assigned_date: todayISO(),
  notes: '',
}

function AssignmentItem({ assignment, canManage, onUpdated, onRemoved }) {
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [roleOnCase, setRoleOnCase] = useState(assignment.role_on_case)
  const [assignedDate, setAssignedDate] = useState(assignment.assigned_date)
  const [notes, setNotes] = useState(assignment.notes || '')
  const [submitting, setSubmitting] = useState(false)
  const [removing, setRemoving] = useState(false)

  const isExternal = !assignment.profile_id
  const name = assignment.worker
    ? [assignment.worker.first_name, assignment.worker.last_name].filter(Boolean).join(' ')
    : assignment.external_name || 'Unknown'

  const handleSave = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await updateStaffAssignment(assignment.id, { role_on_case: roleOnCase, assigned_date: assignedDate, notes: notes.trim() || null })
      toast.success('Assignment updated.')
      setEditing(false)
      onUpdated()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemove = async () => {
    if (!window.confirm(`Remove ${name} from the register?`)) return
    setRemoving(true)
    try {
      await removeStaffAssignment(assignment.id)
      toast.success('Removed from register.')
      onRemoved()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setRemoving(false)
    }
  }

  if (editing) {
    return (
      <div className="note-item">
        <form onSubmit={handleSave}>
          <div className="form-grid">
            <div>
              <label className="form-label" htmlFor={`sa-role-${assignment.id}`}>
                Role on Case
              </label>
              <select id={`sa-role-${assignment.id}`} className="input" value={roleOnCase} onChange={(e) => setRoleOnCase(e.target.value)}>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor={`sa-date-${assignment.id}`}>
                Assigned Date
              </label>
              <input
                id={`sa-date-${assignment.id}`}
                type="date"
                className="input"
                value={assignedDate}
                onChange={(e) => setAssignedDate(e.target.value)}
                required
              />
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
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
          <div className={`client-avatar avatar--${avatarTone(name)}`} style={{ width: 26, height: 26, fontSize: 10.5 }}>
            {initials(name)}
          </div>
          <span>
            {name} · {assignment.role_on_case}
          </span>
          {isExternal && <StatusPill tone="info">External</StatusPill>}
        </div>
        <span>{assignment.assigned_date}</span>
      </div>
      {isExternal && assignment.external_organisation && (
        <div className="data-cell-muted" style={{ marginBottom: assignment.notes ? 4 : 0 }}>
          {assignment.external_organisation}
        </div>
      )}
      {assignment.notes && <div className="note-item-text">{assignment.notes}</div>}
      {canManage && (
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button type="button" className="link-button" onClick={() => setEditing(true)}>
            <Pencil strokeWidth={2} style={{ width: 13, height: 13, marginRight: 4, verticalAlign: 'text-bottom' }} />
            Edit
          </button>
          <button type="button" className="link-button" style={{ color: '#f87171' }} onClick={handleRemove} disabled={removing}>
            <X strokeWidth={2} style={{ width: 13, height: 13, marginRight: 4, verticalAlign: 'text-bottom' }} />
            {removing ? 'Removing...' : 'Remove'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function ClientStaffRegisterPanel({ clientId, clientName }) {
  const { user, profile } = useAuth()
  const toast = useToast()
  const { assignments, loading, error, refetch } = useClientStaffAssignments(clientId)
  const [workers, setWorkers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  const canManage = profile?.role === 'administrator' || profile?.role === 'manager'

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
        profile_id: form.personType === 'internal' ? form.profile_id : null,
        external_name: form.personType === 'external' ? form.externalName.trim() : null,
        external_organisation: form.personType === 'external' ? form.externalOrganisation.trim() || null : null,
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
                <label className="form-label" htmlFor="sr-person-type">
                  Staff Member Type
                </label>
                <select
                  id="sr-person-type"
                  className="input"
                  value={form.personType}
                  onChange={(e) => setForm((f) => ({ ...f, personType: e.target.value }))}
                >
                  <option value="internal">Internal (Bori Muy staff)</option>
                  <option value="external">External (from another organisation)</option>
                </select>
              </div>
              {form.personType === 'internal' ? (
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
              ) : (
                <>
                  <div>
                    <label className="form-label" htmlFor="sr-external-name">
                      External Worker's Name
                    </label>
                    <input
                      id="sr-external-name"
                      className="input"
                      value={form.externalName}
                      onChange={(e) => setForm((f) => ({ ...f, externalName: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="sr-external-org">
                      Their Organisation
                    </label>
                    <input
                      id="sr-external-org"
                      className="input"
                      placeholder="e.g. Youth Justice, Department of Communities"
                      value={form.externalOrganisation}
                      onChange={(e) => setForm((f) => ({ ...f, externalOrganisation: e.target.value }))}
                    />
                  </div>
                </>
              )}
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
            {assignments.map((a) => (
              <AssignmentItem key={a.id} assignment={a} canManage={canManage} onUpdated={refetch} onRemoved={refetch} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
