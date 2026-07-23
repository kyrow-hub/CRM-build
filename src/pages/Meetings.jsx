import { useEffect, useState } from 'react'
import { Search, Calendar, Plus, Check, X, Pencil, Trash2 } from 'lucide-react'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import StatusPill from '../components/ui/StatusPill.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { useMeetings } from '../hooks/useMeetings.js'
import { createMeeting, updateMeeting, updateMeetingStatus, deleteMeeting } from '../services/meetingService.js'
import { listClients } from '../services/clientService.js'
import { listPartners } from '../services/partnerService.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

const STATUS_TONE = { Scheduled: 'info', Completed: 'success', Cancelled: 'danger' }
const STATUS_OPTIONS = ['Scheduled', 'Completed', 'Cancelled']
const MEETING_TYPE_OPTIONS = ['Internal', 'Client', 'Partner', 'Community', 'Other']

const todayISO = () => new Date().toISOString().slice(0, 10)

const emptyForm = {
  title: '',
  meeting_date: todayISO(),
  start_time: '',
  end_time: '',
  location: '',
  meeting_type: 'Internal',
  client_id: '',
  partner_id: '',
  notes: '',
}

function linkedName(meeting) {
  if (meeting.client) return [meeting.client.first_name, meeting.client.last_name].filter(Boolean).join(' ')
  if (meeting.partner) return meeting.partner.business_name
  return '—'
}

function MeetingRow({ meeting, canManage, onUpdated, onEdit, onDeleted }) {
  const toast = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleStatusChange = async (status) => {
    setSubmitting(true)
    try {
      await updateMeetingStatus(meeting.id, status)
      toast.success(`Meeting marked ${status.toLowerCase()}.`)
      onUpdated()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${meeting.title}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await deleteMeeting(meeting.id)
      toast.success('Meeting deleted.')
      onDeleted()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="data-row leads-row" key={meeting.id}>
      <span>{meeting.title}</span>
      <span className="data-cell-muted">
        {meeting.meeting_date}
        {meeting.start_time ? ` · ${meeting.start_time.slice(0, 5)}` : ''}
      </span>
      <span className="data-cell-muted leads-col-email">{meeting.location || '—'}</span>
      <span className="data-cell-muted leads-col-phone">{meeting.meeting_type}</span>
      <span className="data-cell-muted leads-col-source">{linkedName(meeting)}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <StatusPill tone={STATUS_TONE[meeting.status] ?? 'neutral'}>{meeting.status}</StatusPill>
        {meeting.status === 'Scheduled' && (
          <>
            <button
              type="button"
              className="icon-button"
              title="Mark completed"
              disabled={submitting}
              onClick={() => handleStatusChange('Completed')}
            >
              <Check strokeWidth={2} />
            </button>
            <button
              type="button"
              className="icon-button"
              title="Cancel meeting"
              disabled={submitting}
              onClick={() => handleStatusChange('Cancelled')}
            >
              <X strokeWidth={2} />
            </button>
          </>
        )}
      </div>
      {canManage && (
        <div style={{ display: 'flex', gap: 4 }}>
          <button type="button" className="icon-button" title="Edit" onClick={() => onEdit(meeting)}>
            <Pencil strokeWidth={2} />
          </button>
          <button type="button" className="icon-button" title="Delete" disabled={deleting} onClick={handleDelete}>
            <Trash2 strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  )
}

export default function Meetings() {
  const { user, profile } = useAuth()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [meetingType, setMeetingType] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [clients, setClients] = useState([])
  const [partners, setPartners] = useState([])
  const { meetings, loading, error, refetch } = useMeetings({ search, status, meetingType })

  const isAdminManager = profile?.role === 'administrator' || profile?.role === 'manager'

  useEffect(() => {
    listClients()
      .then(setClients)
      .catch(() => setClients([]))
    listPartners()
      .then(setPartners)
      .catch(() => setPartners([]))
  }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        title: form.title,
        meeting_date: form.meeting_date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        location: form.location || null,
        meeting_type: form.meeting_type,
        client_id: form.client_id || null,
        partner_id: form.partner_id || null,
        notes: form.notes || null,
      }
      if (editingId) {
        await updateMeeting(editingId, payload)
        toast.success('Meeting updated.')
      } else {
        await createMeeting({ ...payload, created_by: user?.id })
        toast.success('Meeting scheduled.')
      }
      setForm(emptyForm)
      setEditingId(null)
      setShowForm(false)
      refetch()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (meeting) => {
    setEditingId(meeting.id)
    setForm({
      title: meeting.title || '',
      meeting_date: meeting.meeting_date,
      start_time: meeting.start_time ? meeting.start_time.slice(0, 5) : '',
      end_time: meeting.end_time ? meeting.end_time.slice(0, 5) : '',
      location: meeting.location || '',
      meeting_type: meeting.meeting_type,
      client_id: meeting.client_id || '',
      partner_id: meeting.partner_id || '',
      notes: meeting.notes || '',
    })
    setShowForm(true)
  }

  const handleCancelForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  return (
    <div className="fade-up">
      <div className="section-head">
        <div>
          <div className="section-title">All Meetings</div>
          <div className="section-subtitle">{loading ? 'Loading...' : `${meetings.length} meetings shown`}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="search-input" style={{ width: 220 }}>
            <Search strokeWidth={2} />
            <input
              className="input"
              style={{ paddingLeft: 40 }}
              placeholder="Search meetings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="input" style={{ width: 150 }} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className="input"
            style={{ width: 150 }}
            value={meetingType}
            onChange={(e) => setMeetingType(e.target.value)}
          >
            <option value="">All types</option>
            {MEETING_TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <Button
            onClick={() => {
              if (showForm) {
                handleCancelForm()
              } else {
                setShowForm(true)
              }
            }}
          >
            <Plus strokeWidth={2} />
            Add Meeting
          </Button>
        </div>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 18 }}>
          <div className="section-subtitle" style={{ marginBottom: 14, fontWeight: 700, color: 'var(--text)' }}>
            {editingId ? 'Edit Meeting' : 'Add Meeting'}
          </div>
          <form onSubmit={handleAdd}>
            <div className="form-grid">
              <div>
                <label className="form-label" htmlFor="mt-title">
                  Title
                </label>
                <input
                  id="mt-title"
                  className="input"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="mt-date">
                  Date
                </label>
                <input
                  id="mt-date"
                  type="date"
                  className="input"
                  value={form.meeting_date}
                  onChange={(e) => setForm((f) => ({ ...f, meeting_date: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="mt-start">
                  Start Time
                </label>
                <input
                  id="mt-start"
                  type="time"
                  className="input"
                  value={form.start_time}
                  onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="mt-end">
                  End Time
                </label>
                <input
                  id="mt-end"
                  type="time"
                  className="input"
                  value={form.end_time}
                  onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="mt-location">
                  Location
                </label>
                <input
                  id="mt-location"
                  className="input"
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="mt-type">
                  Meeting Type
                </label>
                <select
                  id="mt-type"
                  className="input"
                  value={form.meeting_type}
                  onChange={(e) => setForm((f) => ({ ...f, meeting_type: e.target.value }))}
                >
                  {MEETING_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="mt-client">
                  With Client (optional)
                </label>
                <select
                  id="mt-client"
                  className="input"
                  value={form.client_id}
                  onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
                >
                  <option value="">None</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {[c.first_name, c.last_name].filter(Boolean).join(' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="mt-partner">
                  With Partner (optional)
                </label>
                <select
                  id="mt-partner"
                  className="input"
                  value={form.partner_id}
                  onChange={(e) => setForm((f) => ({ ...f, partner_id: e.target.value }))}
                >
                  <option value="">None</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.business_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label className="form-label" htmlFor="mt-notes">
                Notes
              </label>
              <textarea
                id="mt-notes"
                className="input"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={handleCancelForm}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Save Meeting'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card style={{ padding: 0 }}>
        {loading ? (
          <EmptyState icon={Calendar} title="Loading meetings..." text="Fetching the latest meetings." />
        ) : error ? (
          <EmptyState icon={Calendar} title="Couldn't load meetings" text={error} />
        ) : meetings.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No meetings found"
            text="Try a different search or filter, or schedule a new meeting."
          />
        ) : (
          <div className="data-table">
            <div className="data-row leads-row data-row--head">
              <span>Title</span>
              <span>Date</span>
              <span className="leads-col-email">Location</span>
              <span className="leads-col-phone">Type</span>
              <span className="leads-col-source">Linked</span>
              <span>Status</span>
              {isAdminManager && <span>Actions</span>}
            </div>
            {meetings.map((m) => (
              <MeetingRow key={m.id} meeting={m} canManage={isAdminManager} onUpdated={refetch} onEdit={handleEdit} onDeleted={refetch} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
