import { useEffect, useState } from 'react'
import { Users, Share2, Calendar, Activity, FileText, Award, Sparkles, CalendarClock, ShieldAlert, AlertOctagon } from 'lucide-react'
import StatCard from '../components/ui/StatCard.jsx'
import Card from '../components/ui/Card.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { getDashboardStats, getRecentActivity } from '../services/dashboardService.js'
import { getComplianceSummary } from '../services/complianceService.js'
import { countOpenIncidents } from '../services/incidentService.js'

const ACTIVITY_ICON = {
  'Case Note': FileText,
  'Case Activity': Activity,
  Meeting: Calendar,
  Referral: Share2,
  Outcome: Award,
  'Good News': Sparkles,
}

const ACTIVITY_TONE = {
  'Case Note': 'blue',
  'Case Activity': 'purple',
  Meeting: 'orange',
  Referral: 'teal',
  Outcome: 'pink',
  'Good News': 'lime',
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({ activeClients: 0, referralsThisWeek: 0, meetingsThisWeek: 0, reviewsOverdue: 0 })
  const [activity, setActivity] = useState([])
  const [complianceAlerts, setComplianceAlerts] = useState(0)
  const [openIncidents, setOpenIncidents] = useState(0)

  useEffect(() => {
    Promise.all([getDashboardStats(), getRecentActivity(), getComplianceSummary(), countOpenIncidents()])
      .then(([statsResult, activityResult, complianceResult, openIncidentsResult]) => {
        setStats(statsResult)
        setActivity(activityResult)
        setComplianceAlerts(complianceResult.totals.criticalAlerts ?? 0)
        setOpenIncidents(openIncidentsResult)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const statCards = [
    { label: 'Active Clients', value: stats.activeClients, meta: 'Currently active, not archived', icon: Users, tone: 'blue' },
    { label: 'Referrals This Week', value: stats.referralsThisWeek, meta: 'Received since Monday', icon: Share2, tone: 'teal' },
    { label: 'Meetings This Week', value: stats.meetingsThisWeek, meta: 'Scheduled this week', icon: Calendar, tone: 'orange' },
    {
      label: 'Reviews Overdue',
      value: stats.reviewsOverdue,
      meta: stats.reviewsOverdue > 0 ? 'Needs a review assessment' : 'All caught up',
      icon: CalendarClock,
      tone: stats.reviewsOverdue > 0 ? 'red' : 'green',
    },
    {
      label: 'Compliance Alerts',
      value: complianceAlerts,
      meta: complianceAlerts > 0 ? 'Critical items across active clients' : 'No critical alerts',
      icon: ShieldAlert,
      tone: complianceAlerts > 0 ? 'red' : 'green',
    },
    {
      label: 'Open Incidents',
      value: openIncidents,
      meta: openIncidents > 0 ? 'Awaiting review, follow-up, or outcome' : 'All incidents closed',
      icon: AlertOctagon,
      tone: openIncidents > 0 ? 'red' : 'green',
    },
  ]

  return (
    <>
      <div className="stats-grid">
        {statCards.map((stat, i) => (
          <div key={stat.label} className="fade-up" style={{ animationDelay: `${i * 80}ms` }}>
            <StatCard
              label={stat.label}
              value={loading ? '—' : String(stat.value)}
              meta={loading ? 'Loading...' : stat.meta}
              icon={stat.icon}
              tone={stat.tone}
            />
          </div>
        ))}
      </div>

      <div className="fade-up" style={{ animationDelay: '320ms' }}>
        <div className="section-head">
          <div>
            <div className="section-title">Recent Activity</div>
            <div className="section-subtitle">The latest updates across your workspace</div>
          </div>
        </div>

        <Card style={!loading && !error && activity.length === 0 ? undefined : { padding: 0 }}>
          {loading ? (
            <EmptyState icon={Activity} title="Loading..." text="Fetching recent activity." />
          ) : error ? (
            <EmptyState icon={Activity} title="Couldn't load recent activity" text={error} />
          ) : activity.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No recent activity yet"
              text="Once you start adding clients, referrals, meetings, and case notes, your activity will show up here."
            />
          ) : (
            <div className="note-list">
              {activity.map((item) => {
                const Icon = ACTIVITY_ICON[item.type] ?? Activity
                return (
                  <div className="note-item" key={item.id}>
                    <div className="note-item-meta">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className={`stat-card-icon stat-card-icon--${ACTIVITY_TONE[item.type] ?? 'blue'}`} style={{ width: 26, height: 26 }}>
                          <Icon strokeWidth={2} style={{ width: 13, height: 13 }} />
                        </div>
                        <span>{item.type}</span>
                      </div>
                      <span>{new Date(item.date).toLocaleString()}</span>
                    </div>
                    <div className="note-item-text">{item.description}</div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
