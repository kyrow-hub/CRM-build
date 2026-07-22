import { useState } from 'react'
import { Plus, Users, X, Phone, Mail, MapPin, Star } from 'lucide-react'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import StatusPill from '../ui/StatusPill.jsx'
import { useClientRelationships } from '../../hooks/useClientRelationships.js'
import { createRelationship, deleteRelationship } from '../../services/relationshipService.js'
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

export default function ClientRelationshipsPanel({ clientId, clientName }) {
  const { user, profile } = useAuth()
  const toast = useToast()
  const { relationships, loading, error, refetch } = useClientRelationships(clientId)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [removingId, setRemovingId] = useState(null)

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

  const handleRemove = async (relationship) => {
    if (!window.confirm(`Remove ${relationship.full_name} (${relationship.relationship_type}) from this client's contacts?`)) return
    setRemovingId(relationship.id)
    try {
      await deleteRelationship(relationship.id)
      toast.success('Contact removed.')
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
              <div className="note-item" key={r.id}>
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
                {canRemove && (
                  <button
                    type="button"
                    className="link-button"
                    style={{ color: '#f87171', marginTop: 8 }}
                    onClick={() => handleRemove(r)}
                    disabled={removingId === r.id}
                  >
                    <X strokeWidth={2} style={{ width: 13, height: 13, marginRight: 4, verticalAlign: 'text-bottom' }} />
                    {removingId === r.id ? 'Removing...' : 'Remove'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
