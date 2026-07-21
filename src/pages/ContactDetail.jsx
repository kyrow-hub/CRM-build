import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, Building2 } from 'lucide-react'
import Card from '../components/ui/Card.jsx'
import StatusPill from '../components/ui/StatusPill.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { mockContacts } from '../data/mockContacts.js'
import { CONTACT_TABS } from '../data/contactTabs.js'

const STATUS_TONE = {
  Customer: 'success',
  Lead: 'warning',
  Churned: 'danger',
}

export default function ContactDetail() {
  const { id } = useParams()
  const contact = mockContacts.find((c) => String(c.id) === id)
  const [activeTab, setActiveTab] = useState(CONTACT_TABS[0].key)

  if (!contact) {
    return (
      <div className="fade-up">
        <Link to="/contacts" className="back-link">
          <ArrowLeft strokeWidth={2} />
          <span>Back to Contacts</span>
        </Link>
        <div style={{ marginTop: 20 }}>
          <Card>
            <EmptyState title="Contact not found" text="This contact may have been removed." />
          </Card>
        </div>
      </div>
    )
  }

  const activeTabConfig = CONTACT_TABS.find((t) => t.key === activeTab)

  return (
    <>
      <div className="fade-up">
        <Link to="/contacts" className="back-link">
          <ArrowLeft strokeWidth={2} />
          <span>Back to Contacts</span>
        </Link>
      </div>

      <div className="fade-up" style={{ animationDelay: '60ms' }}>
        <Card>
          <div className="contact-detail-header">
            <div className="contact-detail-identity">
              <div className="contact-detail-avatar">{contact.initials}</div>
              <div className="contact-detail-meta">
                <div className="contact-detail-name">
                  {contact.name}
                  <StatusPill tone={STATUS_TONE[contact.status] ?? 'neutral'}>
                    {contact.status}
                  </StatusPill>
                </div>
                <div className="contact-detail-sub">
                  <span className="contact-detail-sub-item">
                    <Building2 strokeWidth={2} />
                    {contact.company}
                  </span>
                  <span className="contact-detail-sub-item">
                    <Mail strokeWidth={2} />
                    {contact.email}
                  </span>
                  <span className="contact-detail-sub-item">
                    <Phone strokeWidth={2} />
                    {contact.phone}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="fade-up" style={{ animationDelay: '120ms' }}>
        <div className="tabs">
          {CONTACT_TABS.map(({ key, label, icon: Icon }) => (
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
          <Card>
            <EmptyState
              icon={activeTabConfig.icon}
              title={activeTabConfig.emptyTitle}
              text={activeTabConfig.emptyText}
            />
          </Card>
        </div>
      </div>
    </>
  )
}
