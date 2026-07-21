import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Users } from 'lucide-react'
import Card from '../components/ui/Card.jsx'
import StatusPill from '../components/ui/StatusPill.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { mockClients } from '../data/mockClients.js'

const STATUS_TONE = {
  Customer: 'success',
  Lead: 'warning',
  Churned: 'danger',
}

export default function Clients() {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return mockClients
    return mockClients.filter((c) =>
      [c.name, c.company, c.email, c.status].some((field) => field.toLowerCase().includes(q)),
    )
  }, [query])

  return (
    <div className="fade-up">
      <div className="section-head">
        <div>
          <div className="section-title">All Clients</div>
          <div className="section-subtitle">{mockClients.length} total clients</div>
        </div>
        <div className="search-input" style={{ width: 260 }}>
          <Search strokeWidth={2} />
          <input
            className="input"
            style={{ paddingLeft: 40 }}
            placeholder="Search clients..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <Card style={{ padding: 0 }}>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No clients found"
            text="Try a different name, company, or email."
          />
        ) : (
          <div className="clients-table">
            <div className="clients-row clients-row--head">
              <span>Name</span>
              <span>Company</span>
              <span className="clients-col-email">Email</span>
              <span className="clients-col-phone">Phone</span>
              <span>Status</span>
            </div>
            {filtered.map((c) => (
              <Link
                to={`/clients/${c.id}`}
                className="clients-row clients-row--clickable"
                key={c.id}
              >
                <div className="client-identity">
                  <div className="client-avatar">{c.initials}</div>
                  <span>{c.name}</span>
                </div>
                <span className="clients-cell-muted">{c.company}</span>
                <span className="clients-cell-muted clients-col-email">{c.email}</span>
                <span className="clients-cell-muted clients-col-phone">{c.phone}</span>
                <StatusPill tone={STATUS_TONE[c.status] ?? 'neutral'}>{c.status}</StatusPill>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
