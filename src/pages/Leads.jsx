import { useState } from 'react'
import { Search, Target, Plus } from 'lucide-react'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import StatusPill from '../components/ui/StatusPill.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { useLeads } from '../hooks/useLeads.js'
import { createLead } from '../services/leadService.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { initials } from '../utils/initials.js'

const STATUS_TONE = {
  New: 'info',
  Contacted: 'warning',
  Qualified: 'success',
  Lost: 'danger',
}

const STATUS_OPTIONS = ['New', 'Contacted', 'Qualified', 'Lost']

const emptyForm = {
  first_name: '',
  last_name: '',
  company: '',
  email: '',
  phone: '',
  source: '',
  status: 'New',
}

export default function Leads() {
  const { user } = useAuth()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const { leads, loading, error, refetch } = useLeads({ search, status })

  const handleAdd = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createLead({ ...form, created_by: user?.id })
      toast.success('Lead added.')
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
          <div className="section-title">All Leads</div>
          <div className="section-subtitle">{loading ? 'Loading...' : `${leads.length} leads shown`}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="search-input" style={{ width: 220 }}>
            <Search strokeWidth={2} />
            <input
              className="input"
              style={{ paddingLeft: 40 }}
              placeholder="Search leads..."
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
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus strokeWidth={2} />
            Add Lead
          </Button>
        </div>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 18 }}>
          <form onSubmit={handleAdd}>
            <div className="form-grid">
              <div>
                <label className="form-label" htmlFor="lead-first">
                  First Name
                </label>
                <input
                  id="lead-first"
                  className="input"
                  value={form.first_name}
                  onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="lead-last">
                  Last Name
                </label>
                <input
                  id="lead-last"
                  className="input"
                  value={form.last_name}
                  onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="lead-company">
                  Company
                </label>
                <input
                  id="lead-company"
                  className="input"
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="lead-email">
                  Email
                </label>
                <input
                  id="lead-email"
                  type="email"
                  className="input"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="lead-phone">
                  Phone
                </label>
                <input
                  id="lead-phone"
                  type="tel"
                  className="input"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="lead-source">
                  Source
                </label>
                <input
                  id="lead-source"
                  className="input"
                  value={form.source}
                  onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="lead-status">
                  Status
                </label>
                <select
                  id="lead-status"
                  className="input"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Lead'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card style={{ padding: 0 }}>
        {loading ? (
          <EmptyState icon={Target} title="Loading leads..." text="Fetching the latest lead records." />
        ) : error ? (
          <EmptyState icon={Target} title="Couldn't load leads" text={error} />
        ) : leads.length === 0 ? (
          <EmptyState icon={Target} title="No leads found" text="Try a different search or filter, or add a new lead." />
        ) : (
          <div className="data-table">
            <div className="data-row leads-row data-row--head">
              <span>Name</span>
              <span>Company</span>
              <span className="leads-col-email">Email</span>
              <span className="leads-col-phone">Phone</span>
              <span className="leads-col-source">Source</span>
              <span>Status</span>
            </div>
            {leads.map((l) => {
              const fullName = [l.first_name, l.last_name].filter(Boolean).join(' ')
              return (
                <div className="data-row leads-row" key={l.id}>
                  <div className="client-identity">
                    <div className="client-avatar">{initials(fullName)}</div>
                    <span>{fullName}</span>
                  </div>
                  <span className="data-cell-muted">{l.company || '—'}</span>
                  <span className="data-cell-muted leads-col-email">{l.email || '—'}</span>
                  <span className="data-cell-muted leads-col-phone">{l.phone || '—'}</span>
                  <span className="data-cell-muted leads-col-source">{l.source || '—'}</span>
                  <StatusPill tone={STATUS_TONE[l.status] ?? 'neutral'}>{l.status}</StatusPill>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
