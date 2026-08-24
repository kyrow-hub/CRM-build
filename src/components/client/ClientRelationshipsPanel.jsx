import { useState } from 'react'
import { Plus, Users, X, Pencil, Phone, Mail, MapPin, Star } from 'lucide-react'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import StatusPill from '../ui/StatusPill.jsx'
import { useClientRelationships } from '../../hooks/useClientRelationships.js'
import { createRelationship, updateRelationship, deleteRelationship } from '../../services/relationshipService.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { initials } from '../../utils/initials.js'
import { avatarTone } from '../../utils/avatarColor.js'

const RELATIONSHIP_OPTIONS = [
  'Mother',
  'Father',
  'Guardian',
  'Grandmother',
  'Grandfather',
  'Brother',
  'Sister',
  'Aunt',
  'Uncle',
  'Foster Carer',
  'Case Worker (External)',
  'Other',
]

const emptyForm = {
  relationship_type: RELATIONSHIP_OPTIONS[0],
  full_name: '',
  phone: '',
  email: '',
  address: '',
  is_primary_contact: false,
  notes: '',
}

function relationshipFormFromRecord(r) {
  return {
    relationship_type: r.relationship_type,
    full_name: r.full_name,
    phone: r.phone || '',
    email: r.email || '',
    address: r.address || '',
    is_primary_contact: r.is_primary_contact,
    notes: r.notes || '',
  }
}

function RelationshipRow({ relationship, canEdit, canRemove, onChanged }) {
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(() => relationshipFormFromRecord(relationship))
  const [submitting, setSubmitting] = useState(false)
  const [removing, setRemoving] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await updateRelationship(relationship.id, {
        relationship_type: form.relationship_type,
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        is_primary_contact: form.is_primary_contact,
        notes: form.notes.trim() || null,
      })
      toast.success('Contact updated.')
      setEditing(false)
      onChanged()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemove = async () => {
    if (!window.confirm(`Remove ${relationship.full_name} (${relationship.relationship_type}) from this client's contacts?`)) return
    setRemoving(true)
    try {
      await deleteRelationship(relationship.id)
      toast.success('Contact removed.')
      onChanged()
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
              <label className="form-label" htmlFor={`rel-type-${relationship.id}`}>
                Relationship
              </label>
              <select
                id={`rel-type-${relationship.id}`}
                className="input"
                value={form.relationship_type}
                onChange={(e) => setForm((f) => ({ ...f, relationship_type: e.target.value }))}
              >
                {RELATIONSHIP_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor={`rel-name-${relationship.id}`}>
                Full Name
              </label>
              <input
                id={`rel-name-${relationship.id}`}
                className="input"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="form-label" htmlFor={`rel-phone-${relationship.id}`}>
                Phone
              </label>
              <input
                id={`rel-phone-${relationship.id}`}
                type="tel"
                className="input"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label" htmlFor={`rel-email-${relationship.id}`}>
                Email
              </label>
              <input
                id={`rel-email-${relationship.id}`}
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label" htmlFor={`rel-address-${relationship.id}`}>
                Address
              </label>
              <input
                id={`rel-address-${relationship.id}`}
                className="input"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--text)' }}>
                <input
                  type="checkbox"
                  checked={form.is_primary_contact}
                  onChange={(e) => setForm((f) => ({ ...f, is_primary_contact: e.target.checked }))}
                />
                Primary emergency contact
              </label>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <label className="form-label" htmlFor={`rel-notes-${relationship.id}`}>
              Notes
            </label>
            <textarea
              id={`rel-notes-${relationship.id}`}
              className="input"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
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

  const r = relationship
  return (
    <div className="note-item">
      <div className="note-item-meta">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className={`client-avatar avatar--${avatarTone(r.full_name)}`} style={{ width: 26, height: 26, fontSize: 10.5 }}>
            {initials(r.full_name)}
          </div>
          <span style={{ fontWeight: 600 }}>{r.full_name}</span>
          <StatusPill tone="info">{r.relationship_type}</StatusPill>
          {r.is_primary_contact && (
            <StatusPill tone="warning">
              <Star strokeWidth={2} style={{ width: 11, height: 11, marginRight: 3, verticalAlign: 'text-bottom' }} />
              Primary
            </StatusPill>
          )}
        </div>
      </div>
      <div className="data-cell-muted" style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 4 }}>
        {r.phone && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Phone strokeWidth={2} style={{ width: 13, height: 13 }} />
            {r.phone}
          </span>
        )}
        {r.email && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Mail strokeWidth={2} style={{ width: 13, height: 13 }} />
            {r.email}
          </span>
        )}
        {r.address && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <MapPin strokeWidth={2} style={{ width: 13, height: 13 }} />
            {r.address}
          </span>
        )}
        {!r.phone && !r.email && !r.address && <span>No contact details recorded</span>}
      </div>
      {r.notes && <div className="note-item-text">{r.notes}</div>}
      {(canEdit || canRemove) && (
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          {canEdit && (
            <button type="button" className="link-button" onClick={() => setEditing(true)}>
              <Pencil strokeWidth={2} style={{ width: 13, height: 13, marginRight: 4, verticalAlign: 'text-bottom' }} />
              Edit
            </button>
          )}
          {canRemove && (
            <button
              type="button"
              className="link-button"
              style={{ color: '#f87171' }}
              onClick={handleRemove}
              disabled={removing}
            >
              <X strokeWidth={2} style={{ width: 13, height: 13, marginRight: 4, verticalAlign: 'text-bottom' }} />
              {removing ? 'Removing...' : 'Remove'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function ClientRelationshipsPanel({ clientId, clientName }) {
  const { user, profile } = useAuth()
  const toast = useToast()
  const { relationships, loading, error, refetch } = useClientRelationships(clientId)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  const canEdit = profile?.role === 'administrator' || profile?.role === 'manager' || profile?.role === 'case_worker' || profile?.role === 'program_worker'
  const canRemove = profile?.role === 'administrator' || profile?.role === 'manager'

  const handleAdd = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createRelationship({
        client_id: clientId,
        relationship_type: form.relationship_type,
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        is_primary_contact: form.is_primary_contact,
        notes: form.notes.trim() || null,
        created_by: user?.id,
      })
      toast.success('Contact added.')
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
          <div className="section-title">Family & Emergency Contacts</div>
          <div className="section-subtitle">
            {loading
              ? 'Loading...'
              : `${relationships.length} ${relationships.length === 1 ? 'contact' : 'contacts'} for ${clientName}`}
          </div>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus strokeWidth={2} />
          Add Contact
        </Button>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 18 }}>
          <form onSubmit={handleAdd}>
            <div className="form-grid">
              <div>
                <label className="form-label" htmlFor="rel-type">
                  Relationship
                </label>
                <select
                  id="rel-type"
                  className="input"
                  value={form.relationship_type}
                  onChange={(e) => setForm((f) => ({ ...f, relationship_type: e.target.value }))}
                >
                  {RELATIONSHIP_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="rel-name">
                  Full Name
                </label>
                <input
                  id="rel-name"
                  className="input"
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="rel-phone">
                  Phone
                </label>
                <input
                  id="rel-phone"
                  type="tel"
                  className="input"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="rel-email">
                  Email
                </label>
                <input
                  id="rel-email"
                  type="email"
                  className="input"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="rel-address">
                  Address
                </label>
                <input
                  id="rel-address"
                  className="input"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--text)' }}>
                  <input
                    type="checkbox"
                    checked={form.is_primary_contact}
                    onChange={(e) => setForm((f) => ({ ...f, is_primary_contact: e.target.checked }))}
                  />
                  Primary emergency contact
                </label>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label className="form-label" htmlFor="rel-notes">
                Notes
              </label>
              <textarea
                id="rel-notes"
                className="input"
                rows={2}
                placeholder="Optional notes (custody arrangements, best times to call, etc.)..."
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

      <Card style={!loading && relationships.length === 0 ? undefined : { padding: 0 }}>
        {loading ? (
          <EmptyState icon={Users} title="Loading..." text="Fetching this client's family and contact details." />
        ) : error ? (
          <EmptyState icon={Users} title="Couldn't load contacts" text={error} />
        ) : relationships.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No contacts recorded yet"
            text="Parents, guardians, siblings, and other emergency contacts for this client will appear here."
          />
        ) : (
          <div className="note-list">
            {relationships.map((r) => (
              <RelationshipRow key={r.id} relationship={r} canEdit={canEdit} canRemove={canRemove} onChanged={refetch} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
