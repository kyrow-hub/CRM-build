import { useEffect, useState } from 'react'
import { Search, Share2, Plus, Check, X, Link2, Folder, Pencil, Trash2 } from 'lucide-react'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import StatusPill from '../components/ui/StatusPill.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ReferralDocumentsPanel from '../components/referral/ReferralDocumentsPanel.jsx'
import { useReferrals } from '../hooks/useReferrals.js'
import { createReferral, updateReferral, deleteReferral } from '../services/referralService.js'
import { syncReferralDocumentsClient } from '../services/documentService.js'
import { listClients } from '../services/clientService.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { initials } from '../utils/initials.js'
import { avatarTone } from '../utils/avatarColor.js'

const STATUS_TONE = { Received: 'info', Accepted: 'success', Declined: 'danger' }
const STATUS_OPTIONS = ['Received', 'Accepted', 'Declined']

const todayISO = () => new Date().toISOString().slice(0, 10)

const emptyForm = {
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  referral_source: '',
  referred_by: '',
  date_received: todayISO(),
  notes: '',
}

function ReferralRow({ referral, clients, canManage, onUpdated, onDeleted }) {
  const toast = useToast()
  const [mode, setMode] = useState(null)
  const [clientId, setClientId] = useState('')
  const [declineReason, setDeclineReason] = useState('')
  const [editForm, setEditForm] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const name = [referral.first_name, referral.last_name].filter(Boolean).join(' ')

  const openEdit = () => {
    setEditForm({
      first_name: referral.first_name || '',
      last_name: referral.last_name || '',
      phone: referral.phone || '',
      email: referral.email || '',
      referral_source: referral.referral_source || '',
      referred_by: referral.referred_by || '',
      notes: referral.notes || '',
    })
    setMode(mode === 'edit' ? null : 'edit')
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await updateReferral(referral.id, editForm)
      toast.success('Referral updated.')
      setMode(null)
      onUpdated()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Delete the referral for ${name}? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await deleteReferral(referral.id)
      toast.success('Referral deleted.')
      onDeleted()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const handleAccept = async () => {
    setSubmitting(true)
    try {
      await updateReferral(referral.id, {
        status: 'Accepted',
        accepted_date: todayISO(),
        client_id: clientId || null,
      })
      await syncReferralDocumentsClient(referral.id, clientId || null)
      toast.success('Referral accepted.')
      setMode(null)
      onUpdated()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDecline = async () => {
    setSubmitting(true)
    try {
      await updateReferral(referral.id, { status: 'Declined', decline_reason: declineReason || null })
      toast.success('Referral declined.')
      setMode(null)
      onUpdated()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const openLink = () => {
    setClientId(referral.client_id || '')
    setMode(mode === 'link' ? null : 'link')
  }

  const handleLink = async () => {
    setSubmitting(true)
    try {
      await updateReferral(referral.id, { client_id: clientId || null })
      await syncReferralDocumentsClient(referral.id, clientId || null)
      toast.success(clientId ? 'Referral linked to client. Any attached documents now appear on their Documents tab.' : 'Referral unlinked.')
      setMode(null)
      onUpdated()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const linkedName = referral.client
    ? [referral.client.first_name, referral.client.last_name].filter(Boolean).join(' ')
    : null

  return (
    <div className="group-session-participant-row">
      <div className="group-session-participant-main">
        <div className={`client-avatar avatar--${avatarTone(name)}`}>{initials(name)}</div>
        <span className="group-session-participant-name">{name}</span>
        <span className="data-cell-muted" style={{ width: 160 }}>
          {referral.referral_source || '—'}
        </span>
        <span className="data-cell-muted" style={{ width: 110 }}>
          {referral.date_received}
        </span>
        <StatusPill tone={STATUS_TONE[referral.status] ?? 'neutral'}>{referral.status}</StatusPill>
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          {referral.status === 'Received' && (
            <>
              <Button type="button" variant="secondary" onClick={() => setMode(mode === 'accept' ? null : 'accept')}>
                <Check strokeWidth={2} />
                Accept
              </Button>
              <Button type="button" variant="secondary" onClick={() => setMode(mode === 'decline' ? null : 'decline')}>
                <X strokeWidth={2} />
                Decline
              </Button>
            </>
          )}
          <Button type="button" variant="secondary" onClick={openLink}>
            <Link2 strokeWidth={2} />
            {linkedName ? 'Change Client' : 'Link Client'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setMode(mode === 'documents' ? null : 'documents')}>
            <Folder strokeWidth={2} />
            Documents
          </Button>
          {canManage && (
            <>
              <button type="button" className="icon-button" title="Edit" onClick={openEdit}>
                <Pencil strokeWidth={2} />
              </button>
              <button type="button" className="icon-button" title="Delete" disabled={deleting} onClick={handleDelete}>
                <Trash2 strokeWidth={2} />
              </button>
            </>
          )}
        </div>
      </div>
      <div className="data-cell-muted" style={{ marginTop: -4 }}>
        {linkedName ? `Linked to ${linkedName}` : 'Not linked to a client'}
      </div>
      {mode === 'documents' && (
        <div style={{ marginTop: 4 }}>
          <ReferralDocumentsPanel referralId={referral.id} clientId={referral.client_id} />
        </div>
      )}
      {mode === 'edit' && editForm && (
        <form onSubmit={handleSaveEdit} style={{ marginTop: 4 }}>
          <div className="form-grid">
            <div>
              <label className="form-label" htmlFor={`edit-first-${referral.id}`}>
                First Name
              </label>
              <input
                id={`edit-first-${referral.id}`}
                className="input"
                value={editForm.first_name}
                onChange={(e) => setEditForm((f) => ({ ...f, first_name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="form-label" htmlFor={`edit-last-${referral.id}`}>
                Last Name
              </label>
              <input
                id={`edit-last-${referral.id}`}
                className="input"
                value={editForm.last_name}
                onChange={(e) => setEditForm((f) => ({ ...f, last_name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="form-label" htmlFor={`edit-phone-${referral.id}`}>
                Phone
              </label>
              <input
                id={`edit-phone-${referral.id}`}
                type="tel"
                className="input"
                value={editForm.phone}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label" htmlFor={`edit-email-${referral.id}`}>
                Email
              </label>
              <input
                id={`edit-email-${referral.id}`}
                type="email"
                className="input"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label" htmlFor={`edit-source-${referral.id}`}>
                Referral Source
              </label>
              <input
                id={`edit-source-${referral.id}`}
                className="input"
                value={editForm.referral_source}
                onChange={(e) => setEditForm((f) => ({ ...f, referral_source: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label" htmlFor={`edit-referredby-${referral.id}`}>
                Referred By
              </label>
              <input
                id={`edit-referredby-${referral.id}`}
                className="input"
                value={editForm.referred_by}
                onChange={(e) => setEditForm((f) => ({ ...f, referred_by: e.target.value }))}
              />
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <label className="form-label" htmlFor={`edit-notes-${referral.id}`}>
              Notes
            </label>
            <textarea
              id={`edit-notes-${referral.id}`}
              className="input"
              rows={2}
              value={editForm.notes}
              onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => setMode(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      )}
      {mode === 'link' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="input" style={{ maxWidth: 320 }} value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">No client (unlinked)</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {[c.first_name, c.last_name].filter(Boolean).join(' ')}
              </option>
            ))}
          </select>
          <Button type="button" onClick={handleLink} disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Link'}
          </Button>
        </div>
      )}
      {mode === 'accept' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="input" style={{ maxWidth: 320 }} value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Link to an existing client (optional)</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {[c.first_name, c.last_name].filter(Boolean).join(' ')}
              </option>
            ))}
          </select>
          <Button type="button" onClick={handleAccept} disabled={submitting}>
            {submitting ? 'Saving...' : 'Confirm Accept'}
          </Button>
        </div>
      )}
      {mode === 'decline' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            className="input"
            placeholder="Reason for declining (optional)"
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
          />
          <Button type="button" onClick={handleDecline} disabled={submitting}>
            {submitting ? 'Saving...' : 'Confirm Decline'}
          </Button>
        </div>
      )}
    </div>
  )
}

export default function Referrals() {
  const { user, profile } = useAuth()
  const isAdminManager = profile?.role === 'administrator' || profile?.role === 'manager'
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [clients, setClients] = useState([])
  const { referrals, loading, error, refetch } = useReferrals({ search, status })

  useEffect(() => {
    listClients()
      .then(setClients)
      .catch(() => setClients([]))
  }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createReferral({ ...form, created_by: user?.id })
      toast.success('Referral logged.')
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
          <div className="section-title">All Referrals</div>
          <div className="section-subtitle">{loading ? 'Loading...' : `${referrals.length} referrals shown`}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="search-input" style={{ width: 220 }}>
            <Search strokeWidth={2} />
            <input
              className="input"
              style={{ paddingLeft: 40 }}
              placeholder="Search referrals..."
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
            Add Referral
          </Button>
        </div>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 18 }}>
          <form onSubmit={handleAdd}>
            <div className="form-grid">
              <div>
                <label className="form-label" htmlFor="ref-first">
                  First Name
                </label>
                <input
                  id="ref-first"
                  className="input"
                  value={form.first_name}
                  onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="ref-last">
                  Last Name
                </label>
                <input
                  id="ref-last"
                  className="input"
                  value={form.last_name}
                  onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="ref-phone">
                  Phone
                </label>
                <input
                  id="ref-phone"
                  type="tel"
                  className="input"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="ref-email">
                  Email
                </label>
                <input
                  id="ref-email"
                  type="email"
                  className="input"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="ref-source">
                  Referral Source
                </label>
                <input
                  id="ref-source"
                  className="input"
                  placeholder="e.g. School, Self, Police, Family"
                  value={form.referral_source}
                  onChange={(e) => setForm((f) => ({ ...f, referral_source: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="ref-referred-by">
                  Referred By
                </label>
                <input
                  id="ref-referred-by"
                  className="input"
                  value={form.referred_by}
                  onChange={(e) => setForm((f) => ({ ...f, referred_by: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="ref-date">
                  Date Received
                </label>
                <input
                  id="ref-date"
                  type="date"
                  className="input"
                  value={form.date_received}
                  onChange={(e) => setForm((f) => ({ ...f, date_received: e.target.value }))}
                />
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label className="form-label" htmlFor="ref-notes">
                Notes
              </label>
              <textarea
                id="ref-notes"
                className="input"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Referral'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {loading ? (
          <EmptyState icon={Share2} title="Loading referrals..." text="Fetching the latest referral records." />
        ) : error ? (
          <EmptyState icon={Share2} title="Couldn't load referrals" text={error} />
        ) : referrals.length === 0 ? (
          <EmptyState icon={Share2} title="No referrals found" text="Try a different search or filter, or log a new referral." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {referrals.map((r) => (
              <ReferralRow key={r.id} referral={r} clients={clients} canManage={isAdminManager} onUpdated={refetch} onDeleted={refetch} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
