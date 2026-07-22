import { useState } from 'react'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'

const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Not stated']
const INDIGENOUS_OPTIONS = ['Aboriginal', 'Torres Strait Islander', 'Both', 'Neither', 'Not stated']
const STATUS_OPTIONS = ['active', 'inactive', 'pending', 'closed']
const RISK_LEVEL_OPTIONS = ['Low', 'Medium', 'High']

const blankValues = {
  client_number: '',
  first_name: '',
  middle_name: '',
  last_name: '',
  preferred_name: '',
  date_of_birth: '',
  gender: '',
  indigenous_status: '',
  phone: '',
  email: '',
  address: '',
  suburb: '',
  postcode: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  referral_source: '',
  risk_level: '',
  cultural_background: '',
  assigned_worker_id: '',
  status: 'active',
  exit_reason: '',
}

function toFormValues(initialValues) {
  // Only pull the known form fields out of initialValues (which, when editing,
  // is the full client record from Supabase and includes extra properties
  // like the joined `assigned_worker` object, id, created_at, etc. that are
  // not real form fields and must never be sent back in an update payload).
  const values = { ...blankValues }
  for (const key of Object.keys(blankValues)) {
    if (initialValues?.[key] != null) values[key] = initialValues[key]
  }
  return values
}

export default function ClientForm({ initialValues, workers, onSubmit, onCancel, submitLabel = 'Save Client' }) {
  const [values, setValues] = useState(() => toFormValues(initialValues))
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      const payload = { ...values }
      // Empty strings should be stored as null, and an empty client_number
      // should be omitted so the database can auto-generate one.
      for (const key of Object.keys(payload)) {
        if (payload[key] === '') payload[key] = key === 'client_number' ? undefined : null
      }
      await onSubmit(payload)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card style={{ marginBottom: 18 }}>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div>
            <label className="form-label" htmlFor="cf-client_number">
              Client Number
            </label>
            <input
              id="cf-client_number"
              className="input"
              placeholder="Auto-generated if left blank"
              value={values.client_number}
              onChange={set('client_number')}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="cf-first_name">
              First Name
            </label>
            <input id="cf-first_name" className="input" value={values.first_name} onChange={set('first_name')} required />
          </div>
          <div>
            <label className="form-label" htmlFor="cf-middle_name">
              Middle Name
            </label>
            <input id="cf-middle_name" className="input" value={values.middle_name} onChange={set('middle_name')} />
          </div>
          <div>
            <label className="form-label" htmlFor="cf-last_name">
              Last Name
            </label>
            <input id="cf-last_name" className="input" value={values.last_name} onChange={set('last_name')} required />
          </div>
          <div>
            <label className="form-label" htmlFor="cf-preferred_name">
              Preferred Name
            </label>
            <input
              id="cf-preferred_name"
              className="input"
              value={values.preferred_name}
              onChange={set('preferred_name')}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="cf-date_of_birth">
              Date of Birth
            </label>
            <input
              id="cf-date_of_birth"
              type="date"
              className="input"
              max={new Date().toISOString().slice(0, 10)}
              value={values.date_of_birth}
              onChange={set('date_of_birth')}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="cf-gender">
              Gender
            </label>
            <select id="cf-gender" className="input" value={values.gender} onChange={set('gender')}>
              <option value="">Select...</option>
              {GENDER_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="cf-indigenous_status">
              Indigenous Status
            </label>
            <select
              id="cf-indigenous_status"
              className="input"
              value={values.indigenous_status}
              onChange={set('indigenous_status')}
            >
              <option value="">Select...</option>
              {INDIGENOUS_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="cf-phone">
              Phone
            </label>
            <input id="cf-phone" type="tel" className="input" value={values.phone} onChange={set('phone')} />
          </div>
          <div>
            <label className="form-label" htmlFor="cf-email">
              Email
            </label>
            <input id="cf-email" type="email" className="input" value={values.email} onChange={set('email')} />
          </div>
          <div>
            <label className="form-label" htmlFor="cf-address">
              Address
            </label>
            <input id="cf-address" className="input" value={values.address} onChange={set('address')} />
          </div>
          <div>
            <label className="form-label" htmlFor="cf-suburb">
              Suburb
            </label>
            <input id="cf-suburb" className="input" value={values.suburb} onChange={set('suburb')} />
          </div>
          <div>
            <label className="form-label" htmlFor="cf-postcode">
              Postcode
            </label>
            <input id="cf-postcode" className="input" value={values.postcode} onChange={set('postcode')} />
          </div>
          <div>
            <label className="form-label" htmlFor="cf-emergency_contact_name">
              Emergency Contact Name
            </label>
            <input
              id="cf-emergency_contact_name"
              className="input"
              value={values.emergency_contact_name}
              onChange={set('emergency_contact_name')}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="cf-emergency_contact_phone">
              Emergency Contact Phone
            </label>
            <input
              id="cf-emergency_contact_phone"
              type="tel"
              className="input"
              value={values.emergency_contact_phone}
              onChange={set('emergency_contact_phone')}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="cf-referral_source">
              Referral Source
            </label>
            <input
              id="cf-referral_source"
              className="input"
              value={values.referral_source}
              onChange={set('referral_source')}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="cf-risk_level">
              Risk Level
            </label>
            <select id="cf-risk_level" className="input" value={values.risk_level} onChange={set('risk_level')}>
              <option value="">Select...</option>
              {RISK_LEVEL_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="cf-cultural_background">
              Cultural Background
            </label>
            <input
              id="cf-cultural_background"
              className="input"
              value={values.cultural_background}
              onChange={set('cultural_background')}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="cf-assigned_worker_id">
              Assigned Worker
            </label>
            <select
              id="cf-assigned_worker_id"
              className="input"
              value={values.assigned_worker_id}
              onChange={set('assigned_worker_id')}
            >
              <option value="">Unassigned</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {[w.first_name, w.last_name].filter(Boolean).join(' ') || w.id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="cf-status">
              Status
            </label>
            <select id="cf-status" className="input" value={values.status} onChange={set('status')}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="cf-exit_reason">
              Exit Reason
            </label>
            <input
              id="cf-exit_reason"
              className="input"
              placeholder="Only relevant if closing this client"
              value={values.exit_reason}
              onChange={set('exit_reason')}
            />
          </div>
        </div>

        {formError && <div className="login-error" style={{ marginTop: 16 }}>{formError}</div>}

        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : submitLabel}
          </Button>
        </div>
      </form>
    </Card>
  )
}
