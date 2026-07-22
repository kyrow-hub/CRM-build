import { useCallback, useEffect, useState } from 'react'
import { Share2 } from 'lucide-react'
import Card from '../ui/Card.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import StatusPill from '../ui/StatusPill.jsx'
import { listReferralsForClient } from '../../services/referralService.js'

const STATUS_TONE = { Received: 'info', Accepted: 'success', Declined: 'danger' }

export default function ClientReferralsPanel({ clientId, clientName }) {
  const [referrals, setReferrals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listReferralsForClient(clientId)
      setReferrals(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return (
    <div>
      <div className="section-head">
        <div>
          <div className="section-title">Referrals</div>
          <div className="section-subtitle">
            {loading ? 'Loading...' : `Referral history for ${clientName}`}
          </div>
        </div>
      </div>

      <Card style={!loading && referrals.length === 0 ? undefined : { padding: 0 }}>
        {loading ? (
          <EmptyState icon={Share2} title="Loading referrals..." text="Fetching referral history for this client." />
        ) : error ? (
          <EmptyState icon={Share2} title="Couldn't load referrals" text={error} />
        ) : referrals.length === 0 ? (
          <EmptyState
            icon={Share2}
            title="No referrals linked yet"
            text="Referrals that led to this client record will appear here once linked from the Referrals page."
          />
        ) : (
          <div className="note-list">
            {referrals.map((r) => (
              <div className="note-item" key={r.id}>
                <div className="note-item-meta">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <StatusPill tone={STATUS_TONE[r.status] ?? 'neutral'}>{r.status}</StatusPill>
                    <span>{r.referral_source || 'Unknown source'}</span>
                  </div>
                  <span>{r.date_received}</span>
                </div>
                {r.notes && <div className="note-item-text">{r.notes}</div>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
