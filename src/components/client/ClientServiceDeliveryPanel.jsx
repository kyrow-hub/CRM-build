import { useState } from 'react'
import { Plus, PackageCheck } from 'lucide-react'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import StatusPill from '../ui/StatusPill.jsx'
import { useServiceDeliveries } from '../../hooks/useServiceDeliveries.js'
import { createServiceDelivery } from '../../services/serviceDeliveryService.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'

const SERVICE_TYPE_SUGGESTIONS = [
  'Food Relief',
  'Transport',
  'Clothing / Material Aid',
  'Counselling',
  'Information & Referral',
  'Advocacy',
  'Emergency Relief',
  'Other',
]

const todayISO = () => new Date().toISOString().slice(0, 10)

export default function ClientServiceDeliveryPanel({ clientId, clientName }) {
  const { user } = useAuth()
  const toast = useToast()
  const { deliveries, loading, error, refetch } = useServiceDeliveries(clientId)
  const [showForm, setShowForm] = useState(false)
  const [serviceType, setServiceType] = useState('')
  const [deliveryDate, setDeliveryDate] = useState(todayISO())
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [confidential, setConfidential] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleAdd = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createServiceDelivery({
        client_id: clientId,
        service_type: serviceType.trim(),
        delivery_date: deliveryDate,
        quantity: Number(quantity) || 1,
        notes: notes.trim() || null,
        confidential,
        created_by: user?.id,
      })
      toast.success('Service delivery logged.')
      setServiceType('')
      setDeliveryDate(todayISO())
      setQuantity(1)
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
          <div className="section-title">Service Delivery</div>
          <div className="section-subtitle">
            {loading
              ? 'Loading...'
              : `${deliveries.length} ${deliveries.length === 1 ? 'service' : 'services'} delivered to ${clientName}`}
          </div>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus strokeWidth={2} />
          Log Service
        </Button>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 18 }}>
          <form onSubmit={handleAdd}>
            <div className="form-grid">
              <div>
                <label className="form-label" htmlFor="sd-type">
                  Service Type
                </label>
                <input
                  id="sd-type"
                  className="input"
                  list="service-type-suggestions"
                  placeholder="e.g. Food Relief"
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  required
                />
                <datalist id="service-type-suggestions">
                  {SERVICE_TYPE_SUGGESTIONS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="form-label" htmlFor="sd-date">
                  Date
                </label>
                <input
                  id="sd-date"
                  type="date"
                  className="input"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="sd-quantity">
                  Quantity
                </label>
                <input
                  id="sd-quantity"
                  type="number"
                  min="1"
                  className="input"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label className="form-label" htmlFor="sd-notes">
                Notes
              </label>
              <textarea
                id="sd-notes"
                className="input"
                rows={3}
                placeholder="Details about this service..."
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
                {submitting ? 'Saving...' : 'Save Service'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card style={!loading && deliveries.length === 0 ? undefined : { padding: 0 }}>
        {loading ? (
          <EmptyState icon={PackageCheck} title="Loading..." text="Fetching services delivered to this client." />
        ) : error ? (
          <EmptyState icon={PackageCheck} title="Couldn't load service deliveries" text={error} />
        ) : deliveries.length === 0 ? (
          <EmptyState
            icon={PackageCheck}
            title="No services delivered yet"
            text="Food relief, transport, material aid, and other services delivered to this client will appear here."
          />
        ) : (
          <div className="note-list">
            {deliveries.map((d) => {
              const authorName = d.author
                ? [d.author.first_name, d.author.last_name].filter(Boolean).join(' ') || 'Unknown'
                : 'Unknown'
              return (
                <div className="note-item" key={d.id}>
                  <div className="note-item-meta">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>
                        {d.service_type} · Qty {d.quantity} · {authorName}
                      </span>
                      {d.confidential && <StatusPill tone="danger">Confidential</StatusPill>}
                    </div>
                    <span>{d.delivery_date}</span>
                  </div>
                  {d.notes && <div className="note-item-text">{d.notes}</div>}
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
