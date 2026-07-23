import { useEffect, useState } from 'react'
import { AlertOctagon, Plus } from 'lucide-react'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import IncidentRow from '../components/incident/IncidentRow.jsx'
import { useIncidents } from '../hooks/useIncidents.js'
import { createIncident } from '../services/incidentService.js'
import { listClients } from '../services/clientService.js'
import { INCIDENT_TYPES, SEVERITY_LEVELS, INCIDENT_STATUSES } from '../data/incidentOptions.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

const todayISO = () => new Date().toISOString().slice(0, 10)

const emptyForm = {
  incident_type: INCIDENT_TYPES[0],
  severity: 'Medium',
  incident_date: todayISO(),
  description: '',
  location: '',
  client_id: '',
  confidential: false,
}

export default function Incidents() {
  const { user, profile } = useAuth()
  const toast = useToast()
  const [status, setStatus] = useState('')
  const [severity, setSeverity] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [clients, setClients] = useState([])
  const { incidents, loading, error, refetch } = useIncidents({ status, severity })

  const canManage = profile?.role !== 'viewer'

  useEffect(() => {
    listClients()
      .then(setClients)
      .catch(() => setClients([]))
  }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createIncident({
        incident_type: form.incident_type,
        severity: form.severity,
        incident_date: form.incident_date,
        description: form.description.trim(),
        location: form.location.trim() || null,
        client_id: form.client_id || null,
        confidential: form.confidential,
        reported_by: user?.id,
        created_by: user?.id,
      })
      toast.success('Incident logged.')
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
    <div className="fade-up">
      <div className="section-head">
        <div>
          <div className="section-title">Incidents</div>
          <div className="section-subtitle">{loading ? 'Loading...' : `${incidents.length} incidents shown`}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select className="input" style={{ width: 150 }} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {INCIDENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select className="input" style={{ width: 150 }} value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="">All severities</option>
            {SEVERITY_LEVELS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus strokeWidth={2} />
            Report Incident
          </Button>
        </div>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 18 }}>
          <form onSubmit={handleAdd}>
            <div className="form-grid">
              <div>
                <label className="form-label" htmlFor="inc-type">
                  Incident Type
                </label>
                <select id="inc-type" className="input" value={form.incident_type} onChange={(e) => setForm((f) => ({ ...f, incident_type: e.target.value }))}>
                  {INCIDENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="inc-severity">
                  Severity
                </label>
                <select id="inc-severity" className="input" value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}>
                  {SEVERITY_LEVELS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="inc-date">
                  Incident Date
                </label>
                <input
                  id="inc-date"
                  type="date"
                  className="input"
                  value={form.incident_date}
                  onChange={(e) => setForm((f) => ({ ...f, incident_date: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="inc-client">
                  Client (optional)
                </label>
                <select id="inc-client" className="input" value={form.client_id} onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}>
                  <option value="">Not linked to a client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {[c.first_name, c.last_name].filter(Boolean).join(' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="inc-location">
                  Location
                </label>
                <input id="inc-location" className="input" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label className="form-label" htmlFor="inc-description">
                Description
              </label>
              <textarea
                id="inc-description"
                className="input"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                required
              />
            </div>
            <label className="checkbox-field">
              <input type="checkbox" checked={form.confidential} onChange={(e) => setForm((f) => ({ ...f, confidential: e.target.checked }))} />
              Mark this incident confidential (visible only to you and administrators/managers)
            </label>
            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Incident'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card style={!loading && incidents.length === 0 ? undefined : { padding: 0 }}>
        {loading ? (
          <EmptyState icon={AlertOctagon} title="Loading incidents..." text="Fetching the latest incident records." />
        ) : error ? (
          <EmptyState icon={AlertOctagon} title="Couldn't load incidents" text={error} />
        ) : incidents.length === 0 ? (
          <EmptyState icon={AlertOctagon} title="No incidents recorded" text="Report an incident above, or try a different filter." />
        ) : (
          <div className="note-list">
            {incidents.map((incident) => (
              <IncidentRow key={incident.id} incident={incident} canManage={canManage} onUpdated={refetch} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
