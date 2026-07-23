import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MessageSquare, MessageSquareText, Plus, Send, Users, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import StatusPill from '../components/ui/StatusPill.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { useAllSms } from '../hooks/useAllSms.js'
import { sendSms, sendBulkSms, linkSmsToClient, markSmsRead } from '../services/smsService.js'
import { listClients } from '../services/clientService.js'
import { listContactableRelationships } from '../services/relationshipService.js'
import { useToast } from '../context/ToastContext.jsx'

const STATUS_TONE = { sent: 'success', failed: 'danger', received: 'info' }
const DIRECTION_OPTIONS = ['All', 'Inbound', 'Outbound', 'Unread']

const BULK_SCOPE_OPTIONS = [
  { value: 'client', label: 'Client only' },
  { value: 'primary_contact', label: "Primary contact only (parent/guardian)" },
  { value: 'all_contacts', label: 'All contacts (all parents/guardians on file)' },
  { value: 'client_and_primary', label: 'Client + primary contact' },
]

const emptyIndividualForm = { client_id: '', recipient: 'client', to: '', body: '' }
const emptyBulkForm = { scope: 'client', body: '' }

function clientName(client) {
  return client ? [client.first_name, client.last_name].filter(Boolean).join(' ') : null
}

function SmsItem({ sms, clients, onUpdated }) {
  const toast = useToast()
  const [linking, setLinking] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [savingLink, setSavingLink] = useState(false)
  const [savingRead, setSavingRead] = useState(false)

  const name = clientName(sms.client)
  const contactName = sms.relationship ? `${sms.relationship.full_name} (${sms.relationship.relationship_type})` : null
  const isInbound = sms.direction === 'inbound'

  const handleToggleRead = async () => {
    setSavingRead(true)
    try {
      await markSmsRead(sms.id, !sms.read)
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
      await linkSmsToClient(sms.id, selectedClientId)
      toast.success('SMS linked to client.')
      setLinking(false)
      onUpdated()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingLink(false)
    }
  }

  return (
    <div className="note-item" style={sms.read ? undefined : { background: 'rgba(59, 130, 246, 0.05)' }}>
      <div className="note-item-meta">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isInbound ? (
            <ArrowDownLeft strokeWidth={2} style={{ width: 15, height: 15, color: '#60a5fa' }} />
          ) : (
            <ArrowUpRight strokeWidth={2} style={{ width: 15, height: 15, color: '#4ade80' }} />
          )}
          <span style={{ fontWeight: !sms.read ? 700 : 600 }}>
            {contactName || name || (isInbound ? sms.from_number : sms.to_number)}
          </span>
          {!sms.read && <StatusPill tone="info">Unread</StatusPill>}
          <StatusPill tone={STATUS_TONE[sms.status] ?? 'neutral'}>{sms.status}</StatusPill>
        </div>
        <span>{new Date(sms.created_at).toLocaleString()}</span>
      </div>
      <div className="data-cell-muted" style={{ marginBottom: 6 }}>
        {isInbound ? `From ${sms.from_number}` : `To ${sms.to_number}`}
        {name && contactName ? ` · ${name}'s ${sms.relationship.relationship_type}` : ''}
      </div>
      <div className="note-item-text">{sms.body}</div>
      {sms.error_message && (
        <div className="data-cell-muted" style={{ marginTop: 6, color: '#f87171' }}>
          Error: {sms.error_message}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center' }}>
        <button type="button" className="link-button" onClick={handleToggleRead} disabled={savingRead}>
          {sms.read ? 'Mark as unread' : 'Mark as read'}
        </button>
        {isInbound && !sms.client_id && (
          <button type="button" className="link-button" onClick={() => setLinking((v) => !v)}>
            {linking ? 'Cancel' : 'Link to client'}
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

export default function Sms() {
  const toast = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [relationships, setRelationships] = useState([])
  const [mode, setMode] = useState(null) // null | 'individual' | 'bulk'
  const [filter, setFilter] = useState('All')
  const { sms, loading, error, refetch } = useAllSms()

  const [individualForm, setIndividualForm] = useState(emptyIndividualForm)
  const [sendingIndividual, setSendingIndividual] = useState(false)

  const [bulkClientSearch, setBulkClientSearch] = useState('')
  const [bulkSelectedIds, setBulkSelectedIds] = useState(() => new Set())
  const [bulkForm, setBulkForm] = useState(emptyBulkForm)
  const [sendingBulk, setSendingBulk] = useState(false)

  useEffect(() => {
    listClients()
      .then(setClients)
      .catch(() => setClients([]))
    listContactableRelationships()
      .then(setRelationships)
      .catch(() => setRelationships([]))
  }, [])

  const relationshipsByClient = useMemo(() => {
    const map = new Map()
    for (const r of relationships) {
      if (!map.has(r.client_id)) map.set(r.client_id, [])
      map.get(r.client_id).push(r)
    }
    return map
  }, [relationships])

  const closeForms = () => {
    setMode(null)
    setIndividualForm(emptyIndividualForm)
    setBulkForm(emptyBulkForm)
    setBulkSelectedIds(new Set())
    setBulkClientSearch('')
  }

  // --- Individual send ---

  const selectedClient = clients.find((c) => c.id === individualForm.client_id)
  const selectedClientContacts = relationshipsByClient.get(individualForm.client_id) || []

  const handleIndividualClientChange = (clientId) => {
    const client = clients.find((c) => c.id === clientId)
    setIndividualForm({ client_id: clientId, recipient: 'client', to: client?.phone || '', body: individualForm.body })
  }

  // Arriving from a client's profile page ("Send SMS" button) pre-selects
  // that client once the client list has loaded, then clears the nav state
  // so refreshing or navigating back here later doesn't reopen the form.
  const prefillHandled = useRef(false)
  useEffect(() => {
    const prefillClientId = location.state?.prefillClientId
    if (!prefillClientId || prefillHandled.current || clients.length === 0) return
    prefillHandled.current = true
    handleIndividualClientChange(prefillClientId)
    setMode('individual')
    navigate(location.pathname, { replace: true, state: {} })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, location.state])

  const handleIndividualRecipientChange = (recipient) => {
    if (recipient === 'client') {
      setIndividualForm((f) => ({ ...f, recipient, to: selectedClient?.phone || '' }))
    } else {
      const contact = selectedClientContacts.find((r) => r.id === recipient)
      setIndividualForm((f) => ({ ...f, recipient, to: contact?.phone || '' }))
    }
  }

  const handleSendIndividual = async (e) => {
    e.preventDefault()
    setSendingIndividual(true)
    try {
      const relationshipId = individualForm.recipient !== 'client' ? individualForm.recipient : null
      await sendSms({ clientId: individualForm.client_id || null, relationshipId, to: individualForm.to, body: individualForm.body })
      toast.success('SMS sent.')
      closeForms()
      refetch()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSendingIndividual(false)
    }
  }

  // --- Bulk send ---

  const filteredBulkClients = clients.filter((c) => {
    if (!bulkClientSearch.trim()) return true
    const term = bulkClientSearch.trim().toLowerCase()
    return clientName(c)?.toLowerCase().includes(term)
  })

  const toggleBulkClient = (clientId) => {
    setBulkSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(clientId)) next.delete(clientId)
      else next.add(clientId)
      return next
    })
  }

  const bulkRecipients = useMemo(() => {
    const recipients = []
    let skipped = 0
    for (const clientId of bulkSelectedIds) {
      const client = clients.find((c) => c.id === clientId)
      if (!client) continue
      const contacts = relationshipsByClient.get(clientId) || []
      const primaryContacts = contacts.filter((c) => c.is_primary_contact)

      const wantsClient = bulkForm.scope === 'client' || bulkForm.scope === 'client_and_primary'
      const wantsPrimary = bulkForm.scope === 'primary_contact' || bulkForm.scope === 'client_and_primary'
      const wantsAllContacts = bulkForm.scope === 'all_contacts'

      if (wantsClient) {
        if (client.phone) recipients.push({ clientId, relationshipId: null, to: client.phone, label: clientName(client) })
        else skipped += 1
      }
      if (wantsPrimary) {
        if (primaryContacts.length > 0) {
          for (const contact of primaryContacts) {
            recipients.push({ clientId, relationshipId: contact.id, to: contact.phone, label: `${clientName(client)}'s ${contact.relationship_type}` })
          }
        } else {
          skipped += 1
        }
      }
      if (wantsAllContacts) {
        if (contacts.length > 0) {
          for (const contact of contacts) {
            recipients.push({ clientId, relationshipId: contact.id, to: contact.phone, label: `${clientName(client)}'s ${contact.relationship_type}` })
          }
        } else {
          skipped += 1
        }
      }
    }
    return { recipients, skipped }
  }, [bulkSelectedIds, bulkForm.scope, clients, relationshipsByClient])

  const handleSendBulk = async (e) => {
    e.preventDefault()
    if (bulkRecipients.recipients.length === 0) {
      toast.error('No recipients with a phone number match the selected clients/scope.')
      return
    }
    setSendingBulk(true)
    try {
      const results = await sendBulkSms(bulkRecipients.recipients, bulkForm.body)
      const sentCount = results.filter((r) => !r.error).length
      const failedCount = results.length - sentCount
      if (failedCount === 0) {
        toast.success(`Sent to ${sentCount} recipient${sentCount === 1 ? '' : 's'}.`)
      } else {
        toast.error(`${sentCount} sent, ${failedCount} failed. Check the SMS history for details.`)
      }
      closeForms()
      refetch()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSendingBulk(false)
    }
  }

  const filteredSms = sms.filter((s) => {
    if (filter === 'Inbound') return s.direction === 'inbound'
    if (filter === 'Outbound') return s.direction === 'outbound'
    if (filter === 'Unread') return !s.read
    return true
  })
  const unreadCount = sms.filter((s) => !s.read).length

  return (
    <div className="fade-up">
      <div className="section-head">
        <div>
          <div className="section-title">All SMS</div>
          <div className="section-subtitle">{loading ? 'Loading...' : `${sms.length} messages · ${unreadCount} unread`}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select className="input" style={{ width: 150 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
            {DIRECTION_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <Button variant="secondary" onClick={() => (mode === 'bulk' ? closeForms() : setMode('bulk'))}>
            <Users strokeWidth={2} />
            Bulk Send
          </Button>
          <Button onClick={() => (mode === 'individual' ? closeForms() : setMode('individual'))}>
            <Plus strokeWidth={2} />
            Compose SMS
          </Button>
        </div>
      </div>

      {mode === 'individual' && (
        <Card style={{ marginBottom: 18 }}>
          <div className="section-title" style={{ marginBottom: 4 }}>
            Send SMS
          </div>
          <div className="section-subtitle" style={{ marginBottom: 18 }}>
            Send a text to a client or one of their parents/guardians.
          </div>
          <form onSubmit={handleSendIndividual}>
            <div className="form-grid">
              <div>
                <label className="form-label" htmlFor="sms-client">
                  Client
                </label>
                <select
                  id="sms-client"
                  className="input"
                  value={individualForm.client_id}
                  onChange={(e) => handleIndividualClientChange(e.target.value)}
                  required
                >
                  <option value="">Select a client...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {clientName(c)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="sms-recipient">
                  Recipient
                </label>
                <select
                  id="sms-recipient"
                  className="input"
                  value={individualForm.recipient}
                  onChange={(e) => handleIndividualRecipientChange(e.target.value)}
                  disabled={!individualForm.client_id}
                >
                  <option value="client">{selectedClient ? clientName(selectedClient) : 'Client'} (client)</option>
                  {selectedClientContacts.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.full_name} ({r.relationship_type})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="sms-to">
                  Phone Number
                </label>
                <input
                  id="sms-to"
                  type="tel"
                  className="input"
                  placeholder="e.g. 0412 345 678"
                  value={individualForm.to}
                  onChange={(e) => setIndividualForm((f) => ({ ...f, to: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label className="form-label" htmlFor="sms-body">
                Message
              </label>
              <textarea
                id="sms-body"
                className="input"
                rows={4}
                value={individualForm.body}
                onChange={(e) => setIndividualForm((f) => ({ ...f, body: e.target.value }))}
                required
              />
            </div>
            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={closeForms}>
                Cancel
              </Button>
              <Button type="submit" disabled={sendingIndividual}>
                <Send strokeWidth={2} />
                {sendingIndividual ? 'Sending...' : 'Send SMS'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {mode === 'bulk' && (
        <Card style={{ marginBottom: 18 }}>
          <div className="section-title" style={{ marginBottom: 4 }}>
            Bulk Send
          </div>
          <div className="section-subtitle" style={{ marginBottom: 18 }}>
            Send the same message to many clients and/or their parents/guardians at once.
          </div>
          <form onSubmit={handleSendBulk}>
            <div style={{ marginBottom: 14 }}>
              <label className="form-label" htmlFor="sms-bulk-scope">
                Send to
              </label>
              <select
                id="sms-bulk-scope"
                className="input"
                style={{ maxWidth: 420 }}
                value={bulkForm.scope}
                onChange={(e) => setBulkForm((f) => ({ ...f, scope: e.target.value }))}
              >
                {BULK_SCOPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <label className="form-label">Select clients ({bulkSelectedIds.size} selected)</label>
            <input
              className="input"
              placeholder="Filter by name..."
              value={bulkClientSearch}
              onChange={(e) => setBulkClientSearch(e.target.value)}
              style={{ marginBottom: 8 }}
            />
            <div
              style={{
                maxHeight: 220,
                overflowY: 'auto',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: 8,
                marginBottom: 14,
              }}
            >
              {filteredBulkClients.length === 0 ? (
                <div className="data-cell-muted" style={{ padding: 8 }}>
                  No clients match.
                </div>
              ) : (
                filteredBulkClients.map((c) => (
                  <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={bulkSelectedIds.has(c.id)} onChange={() => toggleBulkClient(c.id)} />
                    <span>{clientName(c)}</span>
                  </label>
                ))
              )}
            </div>

            <div className="data-cell-muted" style={{ marginBottom: 14 }}>
              {bulkRecipients.recipients.length} message{bulkRecipients.recipients.length === 1 ? '' : 's'} will be sent.
              {bulkRecipients.skipped > 0 &&
                ` ${bulkRecipients.skipped} selected client${bulkRecipients.skipped === 1 ? '' : 's'} have no phone number on file for the chosen recipient and will be skipped.`}
            </div>

            <div>
              <label className="form-label" htmlFor="sms-bulk-body">
                Message
              </label>
              <textarea
                id="sms-bulk-body"
                className="input"
                rows={4}
                value={bulkForm.body}
                onChange={(e) => setBulkForm((f) => ({ ...f, body: e.target.value }))}
                required
              />
            </div>
            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={closeForms}>
                Cancel
              </Button>
              <Button type="submit" disabled={sendingBulk || bulkSelectedIds.size === 0}>
                <Send strokeWidth={2} />
                {sendingBulk ? 'Sending...' : `Send to ${bulkRecipients.recipients.length}`}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card style={{ padding: 0 }}>
        {loading ? (
          <EmptyState icon={MessageSquare} title="Loading SMS..." text="Fetching text message history." />
        ) : error ? (
          <EmptyState icon={MessageSquare} title="Couldn't load SMS" text={error} />
        ) : filteredSms.length === 0 ? (
          <EmptyState
            icon={filter === 'Unread' ? MessageSquareText : MessageSquare}
            title="No messages found"
            text="Texts sent to and received from clients and their contacts will appear here."
          />
        ) : (
          <div className="note-list">
            {filteredSms.map((s) => (
              <SmsItem key={s.id} sms={s} clients={clients} onUpdated={refetch} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
