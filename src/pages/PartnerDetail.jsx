import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, MapPin, Phone, Mail, Plus, Download, Users } from 'lucide-react'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { usePartners } from '../context/PartnersContext.jsx'
import { downloadCsv, partnersToMailMergeRows } from '../utils/exportCsv.js'
import { initials } from '../utils/initials.js'

const emptyForm = { name: '', phone: '', email: '' }

export default function PartnerDetail() {
  const { id } = useParams()
  const { partners, addContact } = usePartners()
  const partner = partners.find((p) => String(p.id) === id)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)

  if (!partner) {
    return (
      <div className="fade-up">
        <Link to="/partners" className="back-link">
          <ArrowLeft strokeWidth={2} />
          <span>Back to Partners</span>
        </Link>
        <div style={{ marginTop: 20 }}>
          <Card>
            <EmptyState title="Partner not found" text="This partner may have been removed." />
          </Card>
        </div>
      </div>
    )
  }

  const handleAdd = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    addContact(partner.id, { name: form.name.trim(), phone: form.phone, email: form.email })
    setForm(emptyForm)
    setShowForm(false)
  }

  const handleExport = () => {
    downloadCsv(`${partner.businessName}-contacts.csv`, partnersToMailMergeRows([partner]))
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
              <div className="client-detail-avatar">{initials(partner.businessName)}</div>
              <div className="client-detail-meta">
                <div className="client-detail-name">{partner.businessName}</div>
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
          </div>
        </Card>
      </div>

      <div className="fade-up" style={{ animationDelay: '120ms' }}>
        <div className="section-head">
          <div>
            <div className="section-title">Contacts</div>
            <div className="section-subtitle">
              {partner.contacts.length} {partner.contacts.length === 1 ? 'contact' : 'contacts'} at{' '}
              {partner.businessName}
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
                <Button type="submit">Save Contact</Button>
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
              </div>
              {partner.contacts.map((c) => (
                <div className="data-row partner-contacts-row" key={c.id}>
                  <span>{c.name}</span>
                  <span className="data-cell-muted">{c.phone || '—'}</span>
                  <span className="data-cell-muted partner-contacts-col-email">{c.email || '—'}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
