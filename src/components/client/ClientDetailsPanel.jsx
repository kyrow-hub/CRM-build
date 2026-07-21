import { useState } from 'react'
import { Pencil } from 'lucide-react'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'
import StatusPill from '../ui/StatusPill.jsx'

const GENDER_OPTIONS = ['Male', 'Female', 'Other']
const ETHNICITY_OPTIONS = ['Aboriginal', 'Torres Strait Islander', 'Both', 'Other']
const CONSENT_OPTIONS = ['Yes', 'No']
const PROGRAM_STATUS_OPTIONS = ['Active', 'Inactive', 'Pending', 'Completed']

const DISPLAY_FIELDS = [
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'dob', label: 'Date of Birth' },
  { key: 'gender', label: 'Gender' },
  { key: 'ethnicity', label: 'Ethnicity' },
  { key: 'culturalGroup', label: 'Cultural Group' },
  { key: 'school', label: 'School' },
  { key: 'suburb', label: 'Suburb' },
  { key: 'parentGuardian', label: 'Parent/Guardian' },
  { key: 'parentPhone', label: 'Parent Phone Number' },
  { key: 'parentEmail', label: 'Parent Email' },
  { key: 'emergencyContactName', label: 'Emergency Contact Name' },
  { key: 'emergencyContactPhone', label: 'Emergency Contact Phone Number' },
  { key: 'referralSource', label: 'Referral Source' },
  { key: 'consentReceived', label: 'Consent Received', pill: true },
  { key: 'assignedMentor', label: 'Assigned Mentor' },
  { key: 'status', label: 'Status' },
]

function initialDetails(client) {
  const [firstName, ...rest] = client.name.split(' ')
  return {
    firstName: firstName ?? '',
    lastName: rest.join(' '),
    dob: '',
    gender: '',
    ethnicity: '',
    culturalGroup: '',
    school: '',
    suburb: '',
    parentGuardian: '',
    parentPhone: '',
    parentEmail: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    referralSource: '',
    consentReceived: '',
    assignedMentor: '',
    status: '',
  }
}

export default function ClientDetailsPanel({ client }) {
  const [details, setDetails] = useState(() => initialDetails(client))
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(details)

  const startEditing = () => {
    setDraft(details)
    setEditing(true)
  }

  const handleChange = (field) => (e) => {
    setDraft((d) => ({ ...d, [field]: e.target.value }))
  }

  const handleSave = (e) => {
    e.preventDefault()
    setDetails(draft)
    setEditing(false)
  }

  if (editing) {
    return (
      <Card>
        <form onSubmit={handleSave}>
          <div className="form-grid">
            <div>
              <label className="form-label" htmlFor="d-firstName">
                First Name
              </label>
              <input
                id="d-firstName"
                className="input"
                value={draft.firstName}
                onChange={handleChange('firstName')}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="d-lastName">
                Last Name
              </label>
              <input
                id="d-lastName"
                className="input"
                value={draft.lastName}
                onChange={handleChange('lastName')}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="d-dob">
                Date of Birth
              </label>
              <input
                id="d-dob"
                type="date"
                className="input"
                value={draft.dob}
                onChange={handleChange('dob')}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="d-gender">
                Gender
              </label>
              <select id="d-gender" className="input" value={draft.gender} onChange={handleChange('gender')}>
                <option value="">Select...</option>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="d-ethnicity">
                Ethnicity
              </label>
              <select
                id="d-ethnicity"
                className="input"
                value={draft.ethnicity}
                onChange={handleChange('ethnicity')}
              >
                <option value="">Select...</option>
                {ETHNICITY_OPTIONS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="d-culturalGroup">
                Cultural Group
              </label>
              <input
                id="d-culturalGroup"
                className="input"
                value={draft.culturalGroup}
                onChange={handleChange('culturalGroup')}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="d-school">
                School
              </label>
              <input id="d-school" className="input" value={draft.school} onChange={handleChange('school')} />
            </div>
            <div>
              <label className="form-label" htmlFor="d-suburb">
                Suburb
              </label>
              <input id="d-suburb" className="input" value={draft.suburb} onChange={handleChange('suburb')} />
            </div>
            <div>
              <label className="form-label" htmlFor="d-parentGuardian">
                Parent/Guardian
              </label>
              <input
                id="d-parentGuardian"
                className="input"
                value={draft.parentGuardian}
                onChange={handleChange('parentGuardian')}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="d-parentPhone">
                Parent Phone Number
              </label>
              <input
                id="d-parentPhone"
                type="tel"
                className="input"
                value={draft.parentPhone}
                onChange={handleChange('parentPhone')}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="d-parentEmail">
                Parent Email
              </label>
              <input
                id="d-parentEmail"
                type="email"
                className="input"
                value={draft.parentEmail}
                onChange={handleChange('parentEmail')}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="d-emergencyContactName">
                Emergency Contact Name
              </label>
              <input
                id="d-emergencyContactName"
                className="input"
                value={draft.emergencyContactName}
                onChange={handleChange('emergencyContactName')}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="d-emergencyContactPhone">
                Emergency Contact Phone Number
              </label>
              <input
                id="d-emergencyContactPhone"
                type="tel"
                className="input"
                value={draft.emergencyContactPhone}
                onChange={handleChange('emergencyContactPhone')}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="d-referralSource">
                Referral Source
              </label>
              <input
                id="d-referralSource"
                className="input"
                value={draft.referralSource}
                onChange={handleChange('referralSource')}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="d-consentReceived">
                Consent Received
              </label>
              <select
                id="d-consentReceived"
                className="input"
                value={draft.consentReceived}
                onChange={handleChange('consentReceived')}
              >
                <option value="">Select...</option>
                {CONSENT_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="d-assignedMentor">
                Assigned Mentor
              </label>
              <input
                id="d-assignedMentor"
                className="input"
                value={draft.assignedMentor}
                onChange={handleChange('assignedMentor')}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="d-status">
                Status
              </label>
              <select id="d-status" className="input" value={draft.status} onChange={handleChange('status')}>
                <option value="">Select...</option>
                {PROGRAM_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Details</Button>
          </div>
        </form>
      </Card>
    )
  }

  return (
    <Card>
      <div className="section-head" style={{ marginBottom: 18 }}>
        <div>
          <div className="section-title">Client Details</div>
          <div className="section-subtitle">Intake and demographic information</div>
        </div>
        <Button onClick={startEditing}>
          <Pencil strokeWidth={2} />
          Edit Details
        </Button>
      </div>

      <div className="details-grid">
        {DISPLAY_FIELDS.map(({ key, label, pill }) => {
          const value = details[key]
          return (
            <div className="details-field" key={key}>
              <div className="details-field-label">{label}</div>
              <div className="details-field-value">
                {!value ? (
                  <span className="details-field-empty">Not recorded</span>
                ) : pill ? (
                  <StatusPill tone={value === 'Yes' ? 'success' : 'danger'}>{value}</StatusPill>
                ) : (
                  value
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
