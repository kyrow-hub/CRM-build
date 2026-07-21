import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Users, Plus } from 'lucide-react'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import StatusPill from '../components/ui/StatusPill.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import ClientForm from '../components/client/ClientForm.jsx'
import { useClients } from '../hooks/useClients.js'
import { createClient, listAssignableWorkers } from '../services/clientService.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { initials } from '../utils/initials.js'

const STATUS_TONE = {
  active: 'success',
  pending: 'warning',
  inactive: 'neutral',
  closed: 'neutral',
  archived: 'danger',
}

export default function Clients() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [assignedWorkerId, setAssignedWorkerId] = useState('')
  const [workers, setWorkers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const { user } = useAuth()
  const toast = useToast()
  const { clients, loading, error, refetch } = useClients({ search, status, assignedWorkerId })

  useEffect(() => {
    listAssignableWorkers()
      .then(setWorkers)
      .catch(() => setWorkers([]))
  }, [])

  const handleAdd = async (payload) => {
    await createClient({ ...payload, created_by: user?.id })
    toast.success('Client added.')
    setShowForm(false)
    refetch()
  }

  return (
    <div className="fade-up">
      <div className="section-head">
        <div>
          <div className="section-title">All Clients</div>
          <div className="section-subtitle">{loading ? 'Loading...' : `${clients.length} clients shown`}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="search-input" style={{ width: 220 }}>
            <Search strokeWidth={2} />
            <input
              className="input"
              style={{ paddingLeft: 40 }}
              placeholder="Search name, client #, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="input" style={{ width: 150 }} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
            <option value="closed">Closed</option>
          </select>
          <select
            className="input"
            style={{ width: 170 }}
            value={assignedWorkerId}
            onChange={(e) => setAssignedWorkerId(e.target.value)}
          >
            <option value="">All workers</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {[w.first_name, w.last_name].filter(Boolean).join(' ') || w.id}
              </option>
            ))}
          </select>
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus strokeWidth={2} />
            Add Client
          </Button>
        </div>
      </div>

      {showForm && (
        <ClientForm workers={workers} onSubmit={handleAdd} onCancel={() => setShowForm(false)} submitLabel="Add Client" />
      )}

      <Card style={{ padding: 0 }}>
        {loading ? (
          <EmptyState icon={Users} title="Loading clients..." text="Fetching the latest client records." />
        ) : error ? (
          <EmptyState icon={Users} title="Couldn't load clients" text={error} />
        ) : clients.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No clients found"
            text="Try a different search or filter, or add a new client."
          />
        ) : (
          <div className="clients-table">
            <div className="clients-row clients-row--head">
              <span>Client #</span>
              <span>Name</span>
              <span className="clients-col-email">Phone</span>
              <span className="clients-col-phone">Assigned Worker</span>
              <span>Status</span>
            </div>
            {clients.map((c) => {
              const fullName = [c.first_name, c.last_name].filter(Boolean).join(' ')
              const workerName = c.assigned_worker
                ? [c.assigned_worker.first_name, c.assigned_worker.last_name].filter(Boolean).join(' ')
                : '—'
              return (
                <Link to={`/clients/${c.id}`} className="clients-row clients-row--clickable" key={c.id}>
                  <span className="clients-cell-muted">{c.client_number}</span>
                  <div className="client-identity">
                    <div className="client-avatar">{initials(fullName)}</div>
                    <span>{fullName}</span>
                  </div>
                  <span className="clients-cell-muted clients-col-email">{c.phone || '—'}</span>
                  <span className="clients-cell-muted clients-col-phone">{workerName}</span>
                  <StatusPill tone={STATUS_TONE[c.status] ?? 'neutral'}>{c.status}</StatusPill>
                </Link>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
