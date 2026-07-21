import { useMemo, useState } from 'react'
import { Search, Target } from 'lucide-react'
import Card from '../components/ui/Card.jsx'
import StatusPill from '../components/ui/StatusPill.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { mockLeads } from '../data/mockLeads.js'

const STATUS_TONE = {
  New: 'info',
  Contacted: 'warning',
  Qualified: 'success',
  Lost: 'danger',
}

export default function Leads() {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return mockLeads
    return mockLeads.filter((l) =>
      [l.name, l.company, l.email, l.source, l.status].some((field) =>
        field.toLowerCase().includes(q),
      ),
    )
  }, [query])

  return (
    <div className="fade-up">
      <div className="section-head">
        <div>
          <div className="section-title">All Leads</div>
          <div className="section-subtitle">{mockLeads.length} total leads</div>
        </div>
        <div className="search-input" style={{ width: 260 }}>
          <Search strokeWidth={2} />
          <input
            className="input"
            style={{ paddingLeft: 40 }}
            placeholder="Search leads..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <Card style={{ padding: 0 }}>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No leads found"
            text="Try a different name, company, source, or status."
          />
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
            {filtered.map((l) => (
              <div className="data-row leads-row" key={l.id}>
                <div className="client-identity">
                  <div className="client-avatar">{l.initials}</div>
                  <span>{l.name}</span>
                </div>
                <span className="data-cell-muted">{l.company}</span>
                <span className="data-cell-muted leads-col-email">{l.email}</span>
                <span className="data-cell-muted leads-col-phone">{l.phone}</span>
                <span className="data-cell-muted leads-col-source">{l.source}</span>
                <StatusPill tone={STATUS_TONE[l.status] ?? 'neutral'}>{l.status}</StatusPill>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
