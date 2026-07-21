import { useState } from 'react'
import { FileText, Share2, TrendingUp, PackageCheck } from 'lucide-react'
import Card from '../components/ui/Card.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'

const REPORT_TABS = [
  {
    key: 'case-notes',
    label: 'Case Notes',
    icon: FileText,
    statLabel: 'Case Notes Logged',
    emptyTitle: 'No case notes to report',
    emptyText: 'Case notes entered across your clients will be summarized here.',
  },
  {
    key: 'referrals',
    label: 'Referrals',
    icon: Share2,
    statLabel: 'Referrals Made',
    emptyTitle: 'No referrals to report',
    emptyText: 'Referrals entered across your clients will be summarized here.',
  },
  {
    key: 'goals-outcomes',
    label: 'Goals & Outcomes',
    icon: TrendingUp,
    statLabel: 'Goals Tracked',
    emptyTitle: 'No goals to report',
    emptyText: 'Goals and outcomes entered across your clients will be summarized here.',
  },
  {
    key: 'service-delivery',
    label: 'Service Delivery',
    icon: PackageCheck,
    statLabel: 'Services Delivered',
    emptyTitle: 'No service delivery to report',
    emptyText: 'Service delivery records entered across your clients will be summarized here.',
  },
]

export default function Reports() {
  const [activeTab, setActiveTab] = useState(REPORT_TABS[0].key)
  const activeConfig = REPORT_TABS.find((t) => t.key === activeTab)

  return (
    <>
      <div className="stats-grid">
        {REPORT_TABS.map(({ key, statLabel, icon }, i) => (
          <div key={key} className="fade-up" style={{ animationDelay: `${i * 80}ms` }}>
            <StatCard label={statLabel} value="0" meta="No data recorded yet" icon={icon} />
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
          <Card>
            <EmptyState icon={activeConfig.icon} title={activeConfig.emptyTitle} text={activeConfig.emptyText} />
          </Card>
        </div>
      </div>
    </>
  )
}
