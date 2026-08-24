import { useEffect, useState } from 'react'
import { Mail, MailOpen, Plus, Send, Inbox, ArrowUpRight, ArrowDownLeft, Trash2 } from 'lucide-react'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import StatusPill from '../components/ui/StatusPill.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { useAllEmails } from '../hooks/useAllEmails.js'
import { sendEmail, linkEmailToClient, markEmailRead, deleteEmail } from '../services/emailService.js'
import { listClients } from '../services/clientService.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { initials } from '../utils/initials.js'
import { avatarTone } from '../utils/avatarColor.js'

const STATUS_TONE = { sent: 'success', failed: 'danger', received: 'info' }
const DIRECTION_OPTIONS = ['All', 'Inbound', 'Outbound', 'Unread']

const emptyForm = { client_id: '', to: '', subject: '', body: '' }

function clientName(client) {
  return client ? [client.first_name, client.last_name].filter(Boolean).join(' ') : null
}

function EmailItem({ email, clients, canDelete, onUpdated, onDeleted }) {
  const toast = useToast()
  const [linking, setLinking] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [savingLink, setSavingLink] = useState(false)
  const [savingRead, setSavingRead] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const name = clientName(email.client)
  const isInbound = email.direction === 'inbound'

  const handleToggleRead = async () => {
    setSavingRead(true)
    try {
      await markEmailRead(email.id, !email.read)
      onUpdated()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingRead(false)
    }
  }

  const handleLink = async () => {
    if (!selectedClientId) return
    setSavingLink(true)
    try {
      await linkEmailToClient(email.id, selectedClientId)
      toast.success('Email linked to client.')
      setLinking(false)
      onUpdated()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingLink(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this email? This cannot be undone.')) return
    setDeleting(true)
    try {
      await deleteEmail(email.id)
      toast.success('Email deleted.')
      onDeleted()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="note-item" style={email.read ? undefined : { background: 'rgba(59, 130, 246, 0.05)' }}>
      <div className="note-item-meta">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isInbound ? (
            <ArrowDownLeft strokeWidth={2} style={{ width: 15, height: 15, color: '#60a5fa' }} />
          ) : (
            <ArrowUpRight strokeWidth={2} style={{ width: 15, height: 15, color: '#4ade80' }} />
          )}
          <span style={{ fontWeight: !email.read ? 700 : 600 }}>
            {name || (isInbound ? email.from_address : email.to_address)}
          </span>
          {!email.read && <StatusPill tone="info">Unread</StatusPill>}
          <StatusPill tone={STATUS_TONE[email.status] ?? 'neutral'}>{email.status}</StatusPill>
        </div>
        <span>{new Date(email.created_at).toLocaleString()}</span>
      </div>
      <div className="data-cell-muted" style={{ marginBottom: 6 }}>
        {isInbound ? `From ${email.from_address}` : `To ${email.to_address}`} · {email.subject}
      </div>
      <div className="note-item-text">{email.body}</div>
      {email.error_message && (
        <div className="data-cell-muted" style={{ marginTop: 6, color: '#f87171' }}>
          Error: {email.error_message}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center' }}>
        <button type="button" className="link-button" onClick={handleToggleRead} disabled={savingRead}>
          {email.read ? 'Mark as unread' : 'Mark as read'}
        </button>
        {isInbound && !email.client_id && (
          <button type="button" className="link-button" onClick={() => setLinking((v) => !v)}>
            {linking ? 'Cancel' : 'Link to client'}
          </button>
        )}
        {canDelete && (
          <button type="button" className="link-button" style={{ color: '#f87171' }} onClick={handleDelete} disabled={deleting}>
            <Trash2 strokeWidth={2} style={{ width: 13, height: 13, marginRight: 4, verticalAlign: 'text-bottom' }} />
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>
      {linking && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <select className="input" style={{ maxWidth: 320 }} value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)}>
            <option value="">Select a client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {[c.first_name, c.last_name].filter(Boolean).join(' ')}
              </option>
            ))}
          </select>
          <Button type="button" onClick={handleLink} disabled={savingLink || !selectedClientId}>
            {savingLink ? 'Saving...' : 'Confirm'}
          </Button>
        </div>
      )}
    </div>
  )
}

export default function Email() {
  const { profile } = useAuth()
  const isAdminManager = profile?.role === 'administrator' || profile?.role === 'manager'
  const toast = useToast()
  const [clients, setClients] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [filter, setFilter] = useState('All')
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

  const filteredEmails = emails.filter((e) => {
    if (filter === 'Inbound') return e.direction === 'inbound'
    if (filter === 'Outbound') return e.direction === 'outbound'
    if (filter === 'Unread') return !e.read
    return true
  })
  const unreadCount = emails.filter((e) => !e.read).length

  return (
    <div className="fade-up">
      <div className="section-head">
        <div>
          <div className="section-title">All Emails</div>
          <div className="section-subtitle">
            {loading ? 'Loading...' : `${emails.length} emails · ${unreadCount} unread`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select className="input" style={{ width: 150 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
            {DIRECTION_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus strokeWidth={2} />
            Compose Email
          </Button>
        </div>
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
          <EmptyState icon={Mail} title="Loading emails..." text="Fetching email history." />
        ) : error ? (
          <EmptyState icon={Mail} title="Couldn't load emails" text={error} />
        ) : filteredEmails.length === 0 ? (
          <EmptyState
            icon={filter === 'Inbound' ? Inbox : filter === 'Unread' ? MailOpen : Mail}
            title="No emails found"
            text="Emails sent to and received from clients will appear here."
          />
        ) : (
          <div className="note-list">
            {filteredEmails.map((e) => (
              <EmailItem key={e.id} email={e} clients={clients} canDelete={isAdminManager} onUpdated={refetch} onDeleted={refetch} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
