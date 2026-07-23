import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, MapPin, Phone, Mail, Plus, Download, Users, Pencil, Trash2 } from 'lucide-react'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import {
  getPartnerById,
  addPartnerContact,
  updatePartner,
  deletePartner,
  updatePartnerContact,
  deletePartnerContact,
} from '../services/partnerService.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { downloadCsv, partnersToMailMergeRows } from '../utils/exportCsv.js'
import { initials } from '../utils/initials.js'
import { avatarTone } from '../utils/avatarColor.js'

const emptyForm = { name: '', phone: '', email: '' }
const emptyPartnerForm = { business_name: '', address: '', phone: '', email: '' }

export default function PartnerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const toast = useToast()
  const [partner, setPartner] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [showEditPartner, setShowEditPartner] = useState(false)
  const [partnerForm, setPartnerForm] = useState(emptyPartnerForm)
  const [savingPartner, setSavingPartner] = useState(false)
  const [deletingPartner, setDeletingPartner] = useState(false)
  const [editingContactId, setEditingContactId] = useState(null)
  const [contactForm, setContactForm] = useState(emptyForm)
  const [deletingContactId, setDeletingContactId] = useState(null)

  const isAdminManager = profile?.role === 'administrator' || profile?.role === 'manager'

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getPartnerById(id)
      setPartner(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    refetch()
  }, [refetch])

  const handleAdd = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await addPartnerContact(id, {
        name: form.name.trim(),
        phone: form.phone,
        email: form.email,
        created_by: user?.id,
      })
      toast.success('Contact added.')
      setForm(emptyForm)
      setShowForm(false)
      refetch()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleExport = () => {
    downloadCsv(`${partner.business_name}-contacts.csv`, partnersToMailMergeRows([partner]))
  }

  const openEditPartner = () => {
    setPartnerForm({
      business_name: partner.business_name || '',
      address: partner.address || '',
      phone: partner.phone || '',
      email: partner.email || '',
    })
    setShowEditPartner(true)
  }

  const handleSavePartner = async (e) => {
    e.preventDefault()
    setSavingPartner(true)
    try {
      await updatePartner(id, {
        business_name: partnerForm.business_name.trim(),
        address: partnerForm.address.trim() || null,
        phone: partnerForm.phone.trim() || null,
        email: partnerForm.email.trim() || null,
      })
      toast.success('Partner updated.')
      setShowEditPartner(false)
      refetch()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingPartner(false)
    }
  }

  const handleDeletePartner = async () => {
    if (!window.confirm(`Permanently delete "${partner.business_name}" and all of its contacts? This cannot be undone.`)) return
    setDeletingPartner(true)
    try {
      await deletePartner(id)
      toast.success('Partner deleted.')
      navigate('/partners')
    } catch (err) {
      toast.error(err.message)
      setDeletingPartner(false)
    }
  }

  const openEditContact = (contact) => {
    setEditingContactId(contact.id)
    setContactForm({ name: contact.name || '', phone: contact.phone || '', email: contact.email || '' })
  }

  const handleSaveContact = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await updatePartnerContact(editingContactId, {
        name: contactForm.name.trim(),
        phone: contactForm.phone.trim() || null,
        email: contactForm.email.trim() || null,
      })
      toast.success('Contact updated.')
      setEditingContactId(null)
      refetch()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteContact = async (contact) => {
    if (!window.confirm(`Remove contact "${contact.name}"?`)) return
    setDeletingContactId(contact.id)
    try {
      await deletePartnerContact(contact.id)
      toast.success('Contact removed.')
      refetch()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeletingContactId(null)
    }
  }

  if (loading) {
    return (
      <div className="fade-up">
        <Link to="/partners" className="back-link">
          <ArrowLeft strokeWidth={2} />
          <span>Back to Partners</span>
        </Link>
        <div style={{ marginTop: 20 }}>
          <Card>
            <EmptyState title="Loading partner..." text="Fetching the latest partner details." />
          </Card>
        </div>
      </div>
    )
  }

  if (error || !partner) {
    return (
      <div className="fade-up">
        <Link to="/partners" className="back-link">
          <ArrowLeft strokeWidth={2} />
          <span>Back to Partners</span>
        </Link>
        <div style={{ marginTop: 20 }}>
          <Card>
            <EmptyState title="Partner not found" text={error || 'This partner may have been removed.'} />
          </Card>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="fade-up">
        <Link to="/partners" className="back-link">
          <ArrowLeft strokeWidth={2} />
          <span>Back to Partners</span>
        </Link>
      </div>

      <div className="fade-up" style={{ animationDelay: '60ms' }}>
        <Card>
          <div className="client-detail-header">
            <div className="client-detail-identity">
              <div className={`client-detail-avatar avatar--${avatarTone(partner.business_name)}`}>{initials(partner.business_name)}</div>
              <div className="client-detail-meta">
                <div className="client-detail-name">{partner.business_name}</div>
                <div className="client-detail-sub">
                  {partner.address && (
                    <span className="client-detail-sub-item">
                      <MapPin strokeWidth={2} />
                      {partner.address}
                    </span>
                  )}
                  {partner.phone && (
                    <span className="client-detail-sub-item">
                      <Phone strokeWidth={2} />
                      {partner.phone}
                    </span>
                  )}
                  {partner.email && (
                    <span className="client-detail-sub-item">
                      <Mail strokeWidth={2} />
                      {partner.email}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {isAdminManager && (
              <div style={{ display: 'flex', gap: 10 }}>
                <Button variant="secondary" onClick={() => (showEditPartner ? setShowEditPartner(false) : openEditPartner())}>
                  <Pencil strokeWidth={2} />
                  Edit
                </Button>
                <Button variant="secondary" onClick={handleDeletePartner} disabled={deletingPartner}>
                  <Trash2 strokeWidth={2} />
                  {deletingPartner ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      {showEditPartner && (
        <div className="fade-up">
          <Card style={{ marginBottom: 18 }}>
            <form onSubmit={handleSavePartner}>
              <div className="form-grid">
                <div>
                  <label className="form-label" htmlFor="ep-name">
                    Business Name
                  </label>
                  <input
                    id="ep-name"
                    className="input"
                    value={partnerForm.business_name}
                    onChange={(e) => setPartnerForm((f) => ({ ...f, business_name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="ep-address">
                    Business Address
                  </label>
                  <input
                    id="ep-address"
                    className="input"
                    value={partnerForm.address}
                    onChange={(e) => setPartnerForm((f) => ({ ...f, address: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="ep-phone">
                    Business Phone Number
                  </label>
                  <input
                    id="ep-phone"
                    type="tel"
                    className="input"
                    value={partnerForm.phone}
                    onChange={(e) => setPartnerForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="ep-email">
                    Business Email
                  </label>
                  <input
                    id="ep-email"
                    type="email"
                    className="input"
                    value={partnerForm.email}
                    onChange={(e) => setPartnerForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-actions">
                <Button type="button" variant="secondary" onClick={() => setShowEditPartner(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingPartner}>
                  {savingPartner ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      <div className="fade-up" style={{ animationDelay: '120ms' }}>
        <div className="section-head">
          <div>
            <div className="section-title">Contacts</div>
            <div className="section-subtitle">
              {partner.contacts.length} {partner.contacts.length === 1 ? 'contact' : 'contacts'} at{' '}
              {partner.business_name}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" onClick={handleExport} disabled={partner.contacts.length === 0}>
              <Download strokeWidth={2} />
              Export CSV
            </Button>
            <Button onClick={() => setShowForm((v) => !v)}>
              <Plus strokeWidth={2} />
              Add Contact
            </Button>
          </div>
        </div>

        {showForm && (
          <Card style={{ marginBottom: 18 }}>
            <form onSubmit={handleAdd}>
              <div className="form-grid">
                <div>
                  <label className="form-label" htmlFor="c-name">
                    Contact Name
                  </label>
                  <input
                    id="c-name"
                    className="input"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="c-phone">
                    Contact Number
                  </label>
                  <input
                    id="c-phone"
                    type="tel"
                    className="input"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="c-email">
                    Contact Email
                  </label>
                  <input
                    id="c-email"
                    type="email"
                    className="input"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-actions">
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Contact'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        <Card style={{ padding: 0 }}>
          {partner.contacts.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No contacts yet"
              text="Add the people you work with at this business."
            />
          ) : (
            <div className="data-table">
              <div className="data-row partner-contacts-row data-row--head">
                <span>Name</span>
                <span>Phone</span>
                <span className="partner-contacts-col-email">Email</span>
                {isAdminManager && <span>Actions</span>}
              </div>
              {partner.contacts.map((c) =>
                editingContactId === c.id ? (
                  <div key={c.id} style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)' }}>
                    <form onSubmit={handleSaveContact}>
                      <div className="form-grid">
                        <div>
                          <label className="form-label" htmlFor={`ec-name-${c.id}`}>
                            Contact Name
                          </label>
                          <input
                            id={`ec-name-${c.id}`}
                            className="input"
                            value={contactForm.name}
                            onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))}
                            required
                          />
                        </div>
                        <div>
                          <label className="form-label" htmlFor={`ec-phone-${c.id}`}>
                            Contact Number
                          </label>
                          <input
                            id={`ec-phone-${c.id}`}
                            type="tel"
                            className="input"
                            value={contactForm.phone}
                            onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="form-label" htmlFor={`ec-email-${c.id}`}>
                            Contact Email
                          </label>
                          <input
                            id={`ec-email-${c.id}`}
                            type="email"
                            className="input"
                            value={contactForm.email}
                            onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="form-actions">
                        <Button type="button" variant="secondary" onClick={() => setEditingContactId(null)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={submitting}>
                          {submitting ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="data-row partner-contacts-row" key={c.id}>
                    <span>{c.name}</span>
                    <span className="data-cell-muted">{c.phone || '—'}</span>
                    <span className="data-cell-muted partner-contacts-col-email">{c.email || '—'}</span>
                    {isAdminManager && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button type="button" className="icon-button" title="Edit" onClick={() => openEditContact(c)}>
                          <Pencil strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          title="Delete"
                          disabled={deletingContactId === c.id}
                          onClick={() => handleDeleteContact(c)}
                        >
                          <Trash2 strokeWidth={2} />
                        </button>
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
