import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Users } from 'lucide-react'
import Card from '../components/ui/Card.jsx'
import StatusPill from '../components/ui/StatusPill.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { mockContacts } from '../data/mockContacts.js'

const STATUS_TONE = {
  Customer: 'success',
  Lead: 'warning',
  Churned: 'danger',
}

export default function Contacts() {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return mockContacts
    return mockContacts.filter((c) =>
      [c.name, c.company, c.email, c.status].some((field) => field.toLowerCase().includes(q)),
    )
  }, [query])

  return (
    <div className="fade-up">
      <div className="section-head">
        <div>
          <div className="section-title">All Contacts</div>
          <div className="section-subtitle">{mockContacts.length} total contacts</div>
        </div>
        <div className="search-input" style={{ width: 260 }}>
          <Search strokeWidth={2} />
          <input
            className="input"
            style={{ paddingLeft: 40 }}
            placeholder="Search contacts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <Card style={{ padding: 0 }}>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No contacts found"
            text="Try a different name, company, or email."
          />
        ) : (
          <div className="contacts-table">
            <div className="contacts-row contacts-row--head">
              <span>Name</span>
              <span>Company</span>
              <span className="contacts-col-email">Email</span>
              <span className="contacts-col-phone">Phone</span>
              <span>Status</span>
            </div>
            {filtered.map((c) => (
              <Link
                to={`/contacts/${c.id}`}
                className="contacts-row contacts-row--clickable"
                key={c.id}
              >
                <div className="contact-identity">
                  <div className="contact-avatar">{c.initials}</div>
                  <span>{c.name}</span>
                </div>
                <span className="contacts-cell-muted">{c.company}</span>
                <span className="contacts-cell-muted contacts-col-email">{c.email}</span>
                <span className="contacts-cell-muted contacts-col-phone">{c.phone}</span>
                <StatusPill tone={STATUS_TONE[c.status] ?? 'neutral'}>{c.status}</StatusPill>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
