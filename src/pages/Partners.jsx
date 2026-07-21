import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Building2, Plus, Download } from 'lucide-react'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { usePartners } from '../context/PartnersContext.jsx'
import { downloadCsv, partnersToMailMergeRows } from '../utils/exportCsv.js'
import { initials } from '../utils/initials.js'

const emptyForm = {
  businessName: '',
  address: '',
  phone: '',
  email: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
}

export default function Partners() {
  const { partners, addPartner } = usePartners()
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return partners
    return partners.filter((p) => {
      const haystack = [p.businessName, p.address, p.email, ...p.contacts.map((c) => `${c.name} ${c.email}`)]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [partners, query])

  const handleAdd = (e) => {
    e.preventDefault()
    if (!form.businessName.trim()) return
    const contacts = form.contactName.trim()
      ? [{ id: Date.now(), name: form.contactName.trim(), phone: form.contactPhone, email: form.contactEmail }]
      : []
    addPartner({
      businessName: form.businessName.trim(),
      address: form.address,
      phone: form.phone,
      email: form.email,
      contacts,
    })
    setForm(emptyForm)
    setShowForm(false)
  }

  const handleExportAll = () => {
    downloadCsv('partners-mail-merge.csv', partnersToMailMergeRows(partners))
  }

  return (
    <div className="fade-up">
      <div className="section-head">
        <div>
          <div className="section-title">All Partners</div>
          <div className="section-subtitle">{partners.length} total partners</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="search-input" style={{ width: 220 }}>
            <Search strokeWidth={2} />
            <input
              className="input"
              style={{ paddingLeft: 40 }}
              placeholder="Search partners..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Button variant="secondary" onClick={handleExportAll}>
            <Download strokeWidth={2} />
            Export for Mail Merge
          </Button>
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus strokeWidth={2} />
            Add Partner
          </Button>
        </div>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 18 }}>
          <form onSubmit={handleAdd}>
            <div className="form-grid">
              <div>
                <label className="form-label" htmlFor="p-businessName">
                  Business Name
                </label>
                <input
                  id="p-businessName"
                  className="input"
                  value={form.businessName}
                  onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="p-address">
                  Business Address
                </label>
                <input
                  id="p-address"
                  className="input"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="p-phone">
                  Business Phone Number
                </label>
                <input
                  id="p-phone"
                  type="tel"
                  className="input"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="p-email">
                  Business Email
                </label>
                <input
                  id="p-email"
                  type="email"
                  className="input"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="p-contactName">
                  Contact Name
                </label>
                <input
                  id="p-contactName"
                  className="input"
                  value={form.contactName}
                  onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="p-contactPhone">
                  Contact Number
                </label>
                <input
                  id="p-contactPhone"
                  type="tel"
                  className="input"
                  value={form.contactPhone}
                  onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="p-contactEmail">
                  Contact Email
                </label>
                <input
                  id="p-contactEmail"
                  type="email"
                  className="input"
                  value={form.contactEmail}
                  onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Partner</Button>
            </div>
          </form>
        </Card>
      )}

      <Card style={{ padding: 0 }}>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No partners found"
            text="Try a different business or contact name."
          />
        ) : (
          <div className="data-table">
            <div className="data-row partners-row data-row--head">
              <span>Business Name</span>
              <span className="partners-col-address">Address</span>
              <span>Phone</span>
              <span className="partners-col-email">Email</span>
              <span>Contacts</span>
            </div>
            {filtered.map((p) => (
              <Link to={`/partners/${p.id}`} className="data-row partners-row clients-row--clickable" key={p.id}>
                <div className="client-identity">
                  <div className="client-avatar">{initials(p.businessName)}</div>
                  <span>{p.businessName}</span>
                </div>
                <span className="data-cell-muted partners-col-address">{p.address}</span>
                <span className="data-cell-muted">{p.phone}</span>
                <span className="data-cell-muted partners-col-email">{p.email}</span>
                <span className="data-cell-muted">
                  {p.contacts.length} {p.contacts.length === 1 ? 'contact' : 'contacts'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
