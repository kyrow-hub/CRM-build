import { useEffect, useState } from 'react'
import { Pencil, Trash2, Building2 } from 'lucide-react'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import StatusPill from '../ui/StatusPill.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import { listAllPrograms, updateProgram, deleteProgram } from '../../services/programService.js'
import { useToast } from '../../context/ToastContext.jsx'

function ProgramRow({ program, onUpdated, onDeleted }) {
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(program.name)
  const [location, setLocation] = useState(program.location || '')
  const [active, setActive] = useState(program.active)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await updateProgram(program.id, { name: name.trim(), location: location.trim() || null, active })
      toast.success('Program updated.')
      setEditing(false)
      onUpdated()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Permanently delete "${program.name}"? This also deletes every session, attendance record, roster entry, and risk assessment document linked to it. This cannot be undone - consider editing it to Inactive instead unless you're sure.`,
      )
    ) {
      return
    }
    setDeleting(true)
    try {
      await deleteProgram(program.id)
      toast.success('Program deleted.')
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
              <label className="form-label" htmlFor={`prog-name-${program.id}`}>
                Program Name
              </label>
              <input id={`prog-name-${program.id}`} className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="form-label" htmlFor={`prog-location-${program.id}`}>
                Location
              </label>
              <input id={`prog-location-${program.id}`} className="input" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>
          <label className="checkbox-field">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span>Active (inactive programs are hidden from session/attendance pickers)</span>
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
          <span style={{ fontWeight: 600 }}>{program.name}</span>
          <StatusPill tone={program.active ? 'success' : 'neutral'}>{program.active ? 'Active' : 'Inactive'}</StatusPill>
        </div>
        <span>{program.location || 'No location set'}</span>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button type="button" className="link-button" onClick={() => setEditing(true)}>
          <Pencil strokeWidth={2} style={{ width: 13, height: 13, marginRight: 4, verticalAlign: 'text-bottom' }} />
          Edit
        </button>
        <button type="button" className="link-button" style={{ color: '#f87171' }} onClick={handleDelete} disabled={deleting}>
          <Trash2 strokeWidth={2} style={{ width: 13, height: 13, marginRight: 4, verticalAlign: 'text-bottom' }} />
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  )
}

export default function ProgramManagerPanel({ onChanged }) {
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = () => {
    setLoading(true)
    setError(null)
    listAllPrograms()
      .then(setPrograms)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  const handleChanged = () => {
    load()
    onChanged?.()
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div>
      <div className="section-head">
        <div>
          <div className="section-title">Manage Programs</div>
          <div className="section-subtitle">Edit or delete a program - administrators/managers only</div>
        </div>
      </div>
      <Card style={!loading && programs.length === 0 ? undefined : { padding: 0 }}>
        {loading ? (
          <EmptyState icon={Building2} title="Loading..." text="Fetching programs." />
        ) : error ? (
          <EmptyState icon={Building2} title="Couldn't load programs" text={error} />
        ) : programs.length === 0 ? (
          <EmptyState icon={Building2} title="No programs yet" text="Create one above to get started." />
        ) : (
          <div className="note-list">
            {programs.map((p) => (
              <ProgramRow key={p.id} program={p} onUpdated={handleChanged} onDeleted={handleChanged} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
