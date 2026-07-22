import { useEffect, useState } from 'react'
import { FileText, Share2, TrendingUp, PackageCheck, Users } from 'lucide-react'
import Card from '../components/ui/Card.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import StatusPill from '../components/ui/StatusPill.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { countClientNotes, listAllClientNotes } from '../services/clientNoteService.js'
import { countClientGoals, listAllClientGoals } from '../services/clientGoalService.js'
import { countClientsWithDetails } from '../services/clientService.js'

const GOAL_STATUS_TONE = {
  'Not Started': 'neutral',
  'In Progress': 'info',
  Achieved: 'success',
  'Not Achieved': 'danger',
}

const REPORT_TABS = [
  { key: 'case-notes', label: 'Case Notes', icon: FileText },
  { key: 'referrals', label: 'Referrals', icon: Share2 },
  { key: 'goals-outcomes', label: 'Goals & Outcomes', icon: TrendingUp },
  { key: 'service-delivery', label: 'Service Delivery', icon: PackageCheck },
  { key: 'demographics', label: 'Demographics', icon: Users },
]

function clientName(client) {
  return client ? [client.first_name, client.last_name].filter(Boolean).join(' ') : '—'
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState(REPORT_TABS[0].key)
  const [loading, setLoading] = useState(true)
  const [notesCount, setNotesCount] = useState(0)
  const [goalsCount, setGoalsCount] = useState(0)
  const [detailsCount, setDetailsCount] = useState(0)
  const [notes, setNotes] = useState([])
  const [goals, setGoals] = useState([])

  useEffect(() => {
    Promise.all([countClientNotes(), countClientGoals(), countClientsWithDetails(), listAllClientNotes(), listAllClientGoals()])
      .then(([nCount, gCount, dCount, allNotes, allGoals]) => {
        setNotesCount(nCount)
        setGoalsCount(gCount)
        setDetailsCount(dCount)
        setNotes(allNotes)
        setGoals(allGoals)
      })
      .finally(() => setLoading(false))
  }, [])

  const stats = {
    'case-notes': { label: 'Case Notes Logged', value: notesCount },
    referrals: { label: 'Referrals Made', value: 0 },
    'goals-outcomes': { label: 'Goals Tracked', value: goalsCount },
    'service-delivery': { label: 'Services Delivered', value: 0 },
    demographics: { label: 'Clients with Details Captured', value: detailsCount },
  }

  return (
    <>
      <div className="stats-grid stats-grid--five">
        {REPORT_TABS.map(({ key, icon }, i) => (
          <div key={key} className="fade-up" style={{ animationDelay: `${i * 80}ms` }}>
            <StatCard
              label={stats[key].label}
              value={loading ? '—' : String(stats[key].value)}
              meta={loading ? 'Loading...' : stats[key].value === 0 ? 'No data recorded yet' : 'Across all clients'}
              icon={icon}
            />
          </div>
        ))}
      </div>

      <div className="fade-up" style={{ animationDelay: '320ms' }}>
        <div className="tabs">
          {REPORT_TABS.map(({ key, label, icon: Icon }) => (
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
            <Card style={!loading && notes.length === 0 ? undefined : { padding: 0 }}>
              {loading ? (
                <EmptyState icon={FileText} title="Loading..." text="Fetching case notes." />
              ) : notes.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No case notes to report"
                  text="Case notes entered across your clients will be summarized here."
                />
              ) : (
                <div className="data-table">
                  <div className="data-row notes-row data-row--head">
                    <span>Client</span>
                    <span>Note</span>
                    <span>Date</span>
                    <span>Type</span>
                  </div>
                  {notes.map((n) => (
                    <div className="data-row notes-row" key={n.id}>
                      <span>{clientName(n.client)}</span>
                      <span className="data-cell-muted">{n.content}</span>
                      <span className="data-cell-muted">{n.note_date}</span>
                      <span className="data-cell-muted">{n.note_type || '—'}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ) : activeTab === 'goals-outcomes' ? (
            <Card style={!loading && goals.length === 0 ? undefined : { padding: 0 }}>
              {loading ? (
                <EmptyState icon={TrendingUp} title="Loading..." text="Fetching goals." />
              ) : goals.length === 0 ? (
                <EmptyState
                  icon={TrendingUp}
                  title="No goals to report"
                  text="Goals and outcomes entered across your clients will be summarized here."
                />
              ) : (
                <div className="data-table">
                  <div className="data-row goals-row data-row--head">
                    <span>Goal</span>
                    <span className="goals-col-date">Target Date</span>
                    <span>Status</span>
                    <span className="goals-col-notes">Client</span>
                  </div>
                  {goals.map((g) => (
                    <div className="data-row goals-row" key={g.id}>
                      <span>{g.title}</span>
                      <span className="data-cell-muted goals-col-date">{g.target_date || '—'}</span>
                      <StatusPill tone={GOAL_STATUS_TONE[g.status] ?? 'neutral'}>{g.status}</StatusPill>
                      <span className="data-cell-muted goals-col-notes">{clientName(g.client)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ) : activeTab === 'demographics' ? (
            <Card>
              <EmptyState
                icon={Users}
                title={loading ? 'Loading...' : `${detailsCount} client${detailsCount === 1 ? '' : 's'} with details captured`}
                text="A breakdown by gender, ethnicity, and other fields isn't built yet - this is a running count of clients with at least one demographic field filled in."
              />
            </Card>
          ) : (
            <Card>
              <EmptyState
                icon={activeTab === 'referrals' ? Share2 : PackageCheck}
                title={activeTab === 'referrals' ? 'Referral tracking not built yet' : 'Service delivery tracking not built yet'}
                text="There's no database table for this yet, so there's nothing real to report."
              />
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
