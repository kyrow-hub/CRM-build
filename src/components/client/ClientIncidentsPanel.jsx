import { useState } from 'react'
import { Plus, AlertOctagon } from 'lucide-react'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import IncidentRow from '../incident/IncidentRow.jsx'
import { useClientIncidents } from '../../hooks/useClientIncidents.js'
import { createIncident } from '../../services/incidentService.js'
import { INCIDENT_TYPES, SEVERITY_LEVELS } from '../../data/incidentOptions.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'

const todayISO = () => new Date().toISOString().slice(0, 10)

const emptyForm = {
  incident_type: INCIDENT_TYPES[0],
  severity: 'Medium',
  incident_date: todayISO(),
  description: '',
  location: '',
  confidential: false,
}

export default function ClientIncidentsPanel({ clientId, clientName }) {
  const { user, profile } = useAuth()
  const toast = useToast()
  const { incidents, loading, error, refetch } = useClientIncidents(clientId)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  const canManage = profile?.role !== 'viewer'

  const handleAdd = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createIncident({
        client_id: clientId,
        incident_type: form.incident_type,
        severity: form.severity,
        incident_date: form.incident_date,
        description: form.description.trim(),
        location: form.location.trim() || null,
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
    <div>
      <div className="section-head">
        <div>
          <div className="section-title">Incidents</div>
          <div className="section-subtitle">
            {loading ? 'Loading...' : `${incidents.length} ${incidents.length === 1 ? 'incident' : 'incidents'} for ${clientName}`}
          </div>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus strokeWidth={2} />
          Report Incident
        </Button>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 18 }}>
          <form onSubmit={handleAdd}>
            <div className="form-grid">
              <div>
                <label className="form-label" htmlFor="ci-type">
                  Incident Type
                </label>
                <select id="ci-type" className="input" value={form.incident_type} onChange={(e) => setForm((f) => ({ ...f, incident_type: e.target.value }))}>
                  {INCIDENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="ci-severity">
                  Severity
                </label>
                <select id="ci-severity" className="input" value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}>
                  {SEVERITY_LEVELS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="ci-date">
                  Incident Date
                </label>
                <input
                  id="ci-date"
                  type="date"
                  className="input"
                  value={form.incident_date}
                  onChange={(e) => setForm((f) => ({ ...f, incident_date: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="ci-location">
                  Location
                </label>
                <input id="ci-location" className="input" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label className="form-label" htmlFor="ci-description">
                Description
              </label>
              <textarea
                id="ci-description"
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
          <EmptyState icon={AlertOctagon} title="Loading..." text="Fetching incidents for this client." />
        ) : error ? (
          <EmptyState icon={AlertOctagon} title="Couldn't load incidents" text={error} />
        ) : incidents.length === 0 ? (
          <EmptyState icon={AlertOctagon} title="No incidents recorded" text="Incidents involving this client will appear here." />
        ) : (
          <div className="note-list">
            {incidents.map((incident) => (
              <IncidentRow key={incident.id} incident={incident} canManage={canManage} onUpdated={refetch} showClient={false} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
