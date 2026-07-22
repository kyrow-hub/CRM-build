import { useEffect, useState } from 'react'
import { Mail, Plus, Send } from 'lucide-react'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import StatusPill from '../components/ui/StatusPill.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { useAllEmails } from '../hooks/useAllEmails.js'
import { sendEmail } from '../services/emailService.js'
import { listClients } from '../services/clientService.js'
import { useToast } from '../context/ToastContext.jsx'
import { initials } from '../utils/initials.js'
import { avatarTone } from '../utils/avatarColor.js'

const STATUS_TONE = { sent: 'success', failed: 'danger' }

const emptyForm = { client_id: '', to: '', subject: '', body: '' }

export default function Email() {
  const toast = useToast()
  const [clients, setClients] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const { emails, loading, error, refetch } = useAllEmails()

  useEffect(() => {
    listClients()
      .then(setClients)
      .catch(() => setClients([]))
  }, [])

  const handleClientChange = (clientId) => {
    const client = clients.find((c) => c.id === clientId)
    setForm((f) => ({ ...f, client_id: clientId, to: client?.email || f.to }))
  }

  const handleSend = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await sendEmail({ clientId: form.client_id, to: form.to, subject: form.subject, body: form.body })
      toast.success('Email sent.')
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
          <div className="section-title">All Emails</div>
          <div className="section-subtitle">{loading ? 'Loading...' : `${emails.length} emails sent`}</div>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus strokeWidth={2} />
          Compose Email
        </Button>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 18 }}>
          <form onSubmit={handleSend}>
            <div className="form-grid">
              <div>
                <label className="form-label" htmlFor="email-client">
                  Client
                </label>
                <select
                  id="email-client"
                  className="input"
                  value={form.client_id}
                  onChange={(e) => handleClientChange(e.target.value)}
                  required
                >
                  <option value="">Select a client...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {[c.first_name, c.last_name].filter(Boolean).join(' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="email-to">
                  To
                </label>
                <input
                  id="email-to"
                  type="email"
                  className="input"
                  value={form.to}
                  onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="email-subject">
                  Subject
                </label>
                <input
                  id="email-subject"
                  className="input"
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label className="form-label" htmlFor="email-body">
                Message
              </label>
              <textarea
                id="email-body"
                className="input"
                rows={6}
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                required
              />
            </div>
            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                <Send strokeWidth={2} />
                {submitting ? 'Sending...' : 'Send Email'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card style={{ padding: 0 }}>
        {loading ? (
          <EmptyState icon={Mail} title="Loading emails..." text="Fetching sent email history." />
        ) : error ? (
          <EmptyState icon={Mail} title="Couldn't load emails" text={error} />
        ) : emails.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No emails sent yet"
            text="Emails you send to clients from the CRM will be logged here."
          />
        ) : (
          <div className="data-table">
            <div className="data-row attendance-row data-row--head">
              <span>Client</span>
              <span>Subject</span>
              <span>To</span>
              <span>Date</span>
              <span>Status</span>
            </div>
            {emails.map((e) => {
              const clientFullName = e.client
                ? [e.client.first_name, e.client.last_name].filter(Boolean).join(' ')
                : '—'
              return (
                <div className="data-row attendance-row" key={e.id}>
                  <div className="client-identity">
                    <div className={`client-avatar avatar--${avatarTone(clientFullName)}`}>
                      {initials(clientFullName)}
                    </div>
                    <span>{clientFullName}</span>
                  </div>
                  <span className="data-cell-muted">{e.subject}</span>
                  <span className="data-cell-muted">{e.to_address}</span>
                  <span className="data-cell-muted">{new Date(e.created_at).toLocaleString()}</span>
                  <StatusPill tone={STATUS_TONE[e.status] ?? 'neutral'}>{e.status}</StatusPill>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
