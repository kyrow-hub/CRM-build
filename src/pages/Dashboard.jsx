import { Handshake, DollarSign, Calendar, Activity } from 'lucide-react'
import StatCard from '../components/ui/StatCard.jsx'
import Card from '../components/ui/Card.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'

const STATS = [
  { label: 'Active Deals', value: '0', meta: 'No deals in pipeline', icon: Handshake },
  { label: 'Revenue', value: '$0', meta: 'This quarter', icon: DollarSign },
  { label: 'Meetings This Week', value: '0', meta: 'Nothing scheduled', icon: Calendar },
]

export default function Dashboard() {
  return (
    <>
      <div className="stats-grid stats-grid--three">
        {STATS.map((stat, i) => (
          <div key={stat.label} className="fade-up" style={{ animationDelay: `${i * 80}ms` }}>
            <StatCard {...stat} />
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

        <Card>
          <EmptyState
            icon={Activity}
            title="No recent activity yet"
            text="Once you start adding leads, deals, and meetings, your activity will show up here."
          />
        </Card>
      </div>
    </>
  )
}
