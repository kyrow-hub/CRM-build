import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, MapPin, Cake, Pencil, Archive } from 'lucide-react'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import StatusPill from '../components/ui/StatusPill.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ClientForm from '../components/client/ClientForm.jsx'
import CaseNotesPanel from '../components/client/CaseNotesPanel.jsx'
import GoalsOutcomesPanel from '../components/client/GoalsOutcomesPanel.jsx'
import CaseActivitiesPanel from '../components/client/CaseActivitiesPanel.jsx'
import OutcomesPanel from '../components/client/OutcomesPanel.jsx'
import ClientReferralsPanel from '../components/client/ClientReferralsPanel.jsx'
import ClientProgramsPanel from '../components/client/ClientProgramsPanel.jsx'
import ClientServiceDeliveryPanel from '../components/client/ClientServiceDeliveryPanel.jsx'
import { getClientById, updateClient, archiveClient, listAssignableWorkers } from '../services/clientService.js'
import { useToast } from '../context/ToastContext.jsx'
import { initials } from '../utils/initials.js'
import { avatarTone } from '../utils/avatarColor.js'
import { CLIENT_TABS } from '../data/clientTabs.js'

const STATUS_TONE = {
  active: 'success',
  pending: 'warning',
  inactive: 'neutral',
  closed: 'neutral',
  archived: 'danger',
}

const DETAIL_FIELDS = [
  { key: 'preferred_name', label: 'Preferred Name' },
  { key: 'date_of_birth', label: 'Date of Birth' },
  { key: 'gender', label: 'Gender' },
  { key: 'indigenous_status', label: 'Indigenous Status' },
  { key: 'address', label: 'Address' },
  { key: 'suburb', label: 'Suburb' },
  { key: 'postcode', label: 'Postcode' },
  { key: 'emergency_contact_name', label: 'Emergency Contact Name' },
  { key: 'emergency_contact_phone', label: 'Emergency Contact Phone' },
  { key: 'referral_source', label: 'Referral Source' },
  { key: 'risk_level', label: 'Risk Level' },
  { key: 'cultural_background', label: 'Cultural Background' },
  { key: 'date_opened', label: 'Date Opened' },
  { key: 'date_closed', label: 'Date Closed' },
  { key: 'exit_reason', label: 'Exit Reason' },
]

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [workers, setWorkers] = useState([])
  const [showEditForm, setShowEditForm] = useState(false)
  const [activeTab, setActiveTab] = useState(CLIENT_TABS[0].key)

  const loadClient = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getClientById(id)
      setClient(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadClient()
  }, [loadClient])

  useEffect(() => {
    listAssignableWorkers()
      .then(setWorkers)
      .catch(() => setWorkers([]))
  }, [])

  const handleEdit = async (payload) => {
    const updated = await updateClient(id, payload)
    setClient(updated)
    toast.success('Client updated.')
    setShowEditForm(false)
  }

  const handleArchive = async () => {
    if (!window.confirm('Archive this client? Archived clients are hidden from the active list but not deleted.')) {
      return
    }
    try {
      await archiveClient(id)
      toast.success('Client archived.')
      navigate('/clients')
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (loading) {
    return (
      <div className="fade-up">
        <Card>
          <EmptyState title="Loading client..." text="Fetching this client's record." />
        </Card>
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="fade-up">
        <Link to="/clients" className="back-link">
          <ArrowLeft strokeWidth={2} />
          <span>Back to Clients</span>
        </Link>
        <div style={{ marginTop: 20 }}>
          <Card>
            <EmptyState title="Client not found" text={error || 'This client may have been removed.'} />
          </Card>
        </div>
      </div>
    )
  }

  const fullName = [client.first_name, client.last_name].filter(Boolean).join(' ')
  const workerName = client.assigned_worker
    ? [client.assigned_worker.first_name, client.assigned_worker.last_name].filter(Boolean).join(' ')
    : 'Unassigned'
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
              <div className={`client-detail-avatar avatar--${avatarTone(fullName)}`}>{initials(fullName)}</div>
              <div className="client-detail-meta">
                <div className="client-detail-name">
                  {fullName}
                  <StatusPill tone={STATUS_TONE[client.status] ?? 'neutral'}>{client.status}</StatusPill>
                </div>
                <div className="client-detail-sub">
                  <span className="client-detail-sub-item">{client.client_number}</span>
                  {client.date_of_birth && (
                    <span className="client-detail-sub-item">
                      <Cake strokeWidth={2} />
                      {client.date_of_birth}
                    </span>
                  )}
                  {client.phone && (
                    <span className="client-detail-sub-item">
                      <Phone strokeWidth={2} />
                      {client.phone}
                    </span>
                  )}
                  {client.email && (
                    <span className="client-detail-sub-item">
                      <Mail strokeWidth={2} />
                      {client.email}
                    </span>
                  )}
                  {client.suburb && (
                    <span className="client-detail-sub-item">
                      <MapPin strokeWidth={2} />
                      {client.suburb}
                    </span>
                  )}
                  <span className="client-detail-sub-item">Assigned: {workerName}</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="secondary" onClick={() => setShowEditForm((v) => !v)}>
                <Pencil strokeWidth={2} />
                Edit
              </Button>
              {client.status !== 'archived' && (
                <Button variant="secondary" onClick={handleArchive}>
                  <Archive strokeWidth={2} />
                  Archive
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>

      {showEditForm && (
        <div className="fade-up">
          <ClientForm
            initialValues={client}
            workers={workers}
            onSubmit={handleEdit}
            onCancel={() => setShowEditForm(false)}
            submitLabel="Save Changes"
          />
        </div>
      )}

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
          {activeTab === 'details' ? (
            <Card>
              <div className="details-grid">
                {DETAIL_FIELDS.map(({ key, label }) => (
                  <div className="details-field" key={key}>
                    <div className="details-field-label">{label}</div>
                    <div className="details-field-value">
                      {client[key] || <span className="details-field-empty">Not recorded</span>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : activeTab === 'activities' ? (
            <CaseActivitiesPanel key={client.id} clientId={client.id} clientName={fullName} />
          ) : activeTab === 'case-notes' ? (
            <CaseNotesPanel key={client.id} clientId={client.id} clientName={fullName} />
          ) : activeTab === 'referrals' ? (
            <ClientReferralsPanel key={client.id} clientId={client.id} clientName={fullName} />
          ) : activeTab === 'goals-outcomes' ? (
            <GoalsOutcomesPanel key={client.id} clientId={client.id} clientName={fullName} />
          ) : activeTab === 'outcomes' ? (
            <OutcomesPanel key={client.id} clientId={client.id} clientName={fullName} />
          ) : activeTab === 'programs' ? (
            <ClientProgramsPanel key={client.id} clientId={client.id} clientName={fullName} />
          ) : activeTab === 'service-delivery' ? (
            <ClientServiceDeliveryPanel key={client.id} clientId={client.id} clientName={fullName} />
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
