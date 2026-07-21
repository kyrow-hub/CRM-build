import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, Building2 } from 'lucide-react'
import Card from '../components/ui/Card.jsx'
import StatusPill from '../components/ui/StatusPill.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import CaseNotesPanel from '../components/client/CaseNotesPanel.jsx'
import { mockClients } from '../data/mockClients.js'
import { CLIENT_TABS } from '../data/clientTabs.js'

const STATUS_TONE = {
  Customer: 'success',
  Lead: 'warning',
  Churned: 'danger',
}

export default function ClientDetail() {
  const { id } = useParams()
  const client = mockClients.find((c) => String(c.id) === id)
  const [activeTab, setActiveTab] = useState(CLIENT_TABS[0].key)

  if (!client) {
    return (
      <div className="fade-up">
        <Link to="/clients" className="back-link">
          <ArrowLeft strokeWidth={2} />
          <span>Back to Clients</span>
        </Link>
        <div style={{ marginTop: 20 }}>
          <Card>
            <EmptyState title="Client not found" text="This client may have been removed." />
          </Card>
        </div>
      </div>
    )
  }

  const activeTabConfig = CLIENT_TABS.find((t) => t.key === activeTab)

  return (
    <>
      <div className="fade-up">
        <Link to="/clients" className="back-link">
          <ArrowLeft strokeWidth={2} />
          <span>Back to Clients</span>
        </Link>
      </div>

      <div className="fade-up" style={{ animationDelay: '60ms' }}>
        <Card>
          <div className="client-detail-header">
            <div className="client-detail-identity">
              <div className="client-detail-avatar">{client.initials}</div>
              <div className="client-detail-meta">
                <div className="client-detail-name">
                  {client.name}
                  <StatusPill tone={STATUS_TONE[client.status] ?? 'neutral'}>
                    {client.status}
                  </StatusPill>
                </div>
                <div className="client-detail-sub">
                  <span className="client-detail-sub-item">
                    <Building2 strokeWidth={2} />
                    {client.company}
                  </span>
                  <span className="client-detail-sub-item">
                    <Mail strokeWidth={2} />
                    {client.email}
                  </span>
                  <span className="client-detail-sub-item">
                    <Phone strokeWidth={2} />
                    {client.phone}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="fade-up" style={{ animationDelay: '120ms' }}>
        <div className="tabs">
          {CLIENT_TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              className={`tab-item${activeTab === key ? ' active' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              <Icon strokeWidth={2} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div style={{ marginTop: 20 }}>
          {activeTab === 'case-notes' ? (
            <CaseNotesPanel key={client.id} clientName={client.name} />
          ) : (
            <Card>
              <EmptyState
                icon={activeTabConfig.icon}
                title={activeTabConfig.emptyTitle}
                text={activeTabConfig.emptyText}
              />
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
