import { useEffect, useState } from 'react'
import { FileText, Share2, TrendingUp, Award, Activity, PackageCheck, Users, Download } from 'lucide-react'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import StatusPill from '../components/ui/StatusPill.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { countClientNotes, listAllClientNotes } from '../services/clientNoteService.js'
import { countClientGoals, listAllClientGoals } from '../services/clientGoalService.js'
import { countClientsWithDetails, listClientsForReports } from '../services/clientService.js'
import { countReferralsByStatus, listReferrals } from '../services/referralService.js'
import { countCaseActivities, listAllCaseActivities } from '../services/caseActivityService.js'
import { countOutcomesByCategory, listAllOutcomes } from '../services/outcomeService.js'
import { downloadCsv } from '../utils/exportCsv.js'

const GOAL_STATUS_TONE = {
  'Not Started': 'neutral',
  'In Progress': 'info',
  Achieved: 'success',
  'Not Achieved': 'danger',
}

const REFERRAL_STATUS_TONE = { Received: 'info', Accepted: 'success', Declined: 'danger' }

const OUTCOME_CATEGORY_TONE = {
  Education: 'info',
  Employment: 'success',
  Health: 'warning',
  Justice: 'danger',
  Family: 'neutral',
  Cultural: 'info',
  Camp: 'success',
}

const REPORT_TABS = [
  { key: 'case-notes', label: 'Case Notes', icon: FileText, tone: 'blue' },
  { key: 'activities', label: 'Case Activities', icon: Activity, tone: 'purple' },
  { key: 'referrals', label: 'Referrals', icon: Share2, tone: 'teal' },
  { key: 'goals-outcomes', label: 'Goals & Outcomes', icon: TrendingUp, tone: 'green' },
  { key: 'outcomes', label: 'Outcomes', icon: Award, tone: 'pink' },
  { key: 'service-delivery', label: 'Service Delivery', icon: PackageCheck, tone: 'orange' },
  { key: 'demographics', label: 'Demographics', icon: Users, tone: 'yellow' },
]

function clientName(client) {
  return client ? [client.first_name, client.last_name].filter(Boolean).join(' ') : '—'
}

function ageBand(dob) {
  if (!dob) return null
  const ageMs = Date.now() - new Date(dob).getTime()
  const age = Math.floor(ageMs / (365.25 * 24 * 3600 * 1000))
  if (age < 12) return 'Under 12'
  if (age < 16) return '12-15'
  if (age < 19) return '16-18'
  if (age < 25) return '19-24'
  return '25+'
}

function countBy(items, fn) {
  const map = {}
  for (const item of items) {
    const key = fn(item) || 'Not recorded'
    map[key] = (map[key] ?? 0) + 1
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1])
}

function notesToRows(notes) {
  return notes.map((n) => ({
    Client: clientName(n.client),
    Note: n.content,
    Date: n.note_date,
    Type: n.note_type || '',
  }))
}

function activitiesToRows(activities) {
  return activities.map((a) => ({
    Client: clientName(a.client),
    Type: a.activity_type,
    Date: a.activity_date,
    Notes: a.notes || '',
  }))
}

function referralsToRows(referrals) {
  return referrals.map((r) => ({
    Name: [r.first_name, r.last_name].filter(Boolean).join(' '),
    Source: r.referral_source || '',
    'Referred By': r.referred_by || '',
    'Date Received': r.date_received,
    Status: r.status,
    'Decline Reason': r.decline_reason || '',
    'Accepted Date': r.accepted_date || '',
    'Client Linked': clientName(r.client),
  }))
}

function goalsToRows(goals) {
  return goals.map((g) => ({
    Client: clientName(g.client),
    Goal: g.title,
    'Target Date': g.target_date || '',
    Status: g.status,
    Notes: g.notes || '',
  }))
}

function outcomesToRows(outcomes) {
  return outcomes.map((o) => ({
    Client: clientName(o.client),
    Category: o.category,
    Outcome: o.outcome_type,
    Date: o.outcome_date,
    Notes: o.notes || '',
  }))
}

function demographicsToRows(clients) {
  return clients.map((c) => ({
    'Client ID': c.id,
    Status: c.status,
    'Date of Birth': c.date_of_birth || '',
    Gender: c.gender || '',
    'Indigenous Status': c.indigenous_status || '',
    'Risk Level': c.risk_level || '',
    'Cultural Background': c.cultural_background || '',
    Suburb: c.suburb || '',
    Postcode: c.postcode || '',
    'Date Opened': c.date_opened || '',
    'Date Closed': c.date_closed || '',
    Archived: c.archived_at ? 'Yes' : 'No',
  }))
}

function ExportButton({ rows, filename }) {
  return (
    <Button
      variant="secondary"
      disabled={rows.length === 0}
      onClick={() => downloadCsv(filename, rows)}
      style={{ marginBottom: 18 }}
    >
      <Download strokeWidth={2} />
      Export CSV
    </Button>
  )
}

function BreakdownCard({ title, entries }) {
  return (
    <Card>
      <div className="section-subtitle" style={{ marginBottom: 12, fontWeight: 700, color: 'var(--text)' }}>
        {title}
      </div>
      {entries.length === 0 ? (
        <div className="data-cell-muted">No data recorded yet</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {entries.map(([label, count]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>{label}</span>
              <span className="data-cell-muted">{count}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState(REPORT_TABS[0].key)
  const [loading, setLoading] = useState(true)
  const [notesCount, setNotesCount] = useState(0)
  const [goalsCount, setGoalsCount] = useState(0)
  const [detailsCount, setDetailsCount] = useState(0)
  const [activitiesCount, setActivitiesCount] = useState(0)
  const [outcomesByCategory, setOutcomesByCategory] = useState({})
  const [referralsByStatus, setReferralsByStatus] = useState({})
  const [notes, setNotes] = useState([])
  const [goals, setGoals] = useState([])
  const [activities, setActivities] = useState([])
  const [outcomes, setOutcomes] = useState([])
  const [referrals, setReferrals] = useState([])
  const [clientsForReports, setClientsForReports] = useState([])

  useEffect(() => {
    Promise.all([
      countClientNotes(),
      countClientGoals(),
      countClientsWithDetails(),
      countCaseActivities(),
      countOutcomesByCategory(),
      countReferralsByStatus(),
      listAllClientNotes(),
      listAllClientGoals(),
      listAllCaseActivities(),
      listAllOutcomes(),
      listReferrals(),
      listClientsForReports(),
    ])
      .then(
        ([
          nCount,
          gCount,
          dCount,
          aCount,
          outcomeCategoryCounts,
          referralStatusCounts,
          allNotes,
          allGoals,
          allActivities,
          allOutcomes,
          allReferrals,
          allClients,
        ]) => {
          setNotesCount(nCount)
          setGoalsCount(gCount)
          setDetailsCount(dCount)
          setActivitiesCount(aCount)
          setOutcomesByCategory(outcomeCategoryCounts)
          setReferralsByStatus(referralStatusCounts)
          setNotes(allNotes)
          setGoals(allGoals)
          setActivities(allActivities)
          setOutcomes(allOutcomes)
          setReferrals(allReferrals)
          setClientsForReports(allClients)
        },
      )
      .finally(() => setLoading(false))
  }, [])

  const outcomesCount = Object.values(outcomesByCategory).reduce((sum, n) => sum + n, 0)
  const referralsCount = Object.values(referralsByStatus).reduce((sum, n) => sum + n, 0)

  const stats = {
    'case-notes': { label: 'Case Notes Logged', value: notesCount },
    activities: { label: 'Case Activities Logged', value: activitiesCount },
    referrals: { label: 'Referrals Received', value: referralsCount },
    'goals-outcomes': { label: 'Goals Tracked', value: goalsCount },
    outcomes: { label: 'Outcomes Recorded', value: outcomesCount },
    'service-delivery': { label: 'Services Delivered', value: 0 },
    demographics: { label: 'Clients with Details Captured', value: detailsCount },
  }

  const activeCount = clientsForReports.filter((c) => c.status === 'active' && !c.archived_at).length
  const closedCount = clientsForReports.filter((c) => c.status !== 'active' || c.archived_at).length
  const ageBreakdown = countBy(clientsForReports, (c) => ageBand(c.date_of_birth))
  const genderBreakdown = countBy(clientsForReports, (c) => c.gender)
  const indigenousBreakdown = countBy(clientsForReports, (c) => c.indigenous_status)
  const riskBreakdown = countBy(clientsForReports, (c) => c.risk_level)
  const suburbBreakdown = countBy(clientsForReports, (c) => c.suburb).slice(0, 8)
  const culturalRecordedCount = clientsForReports.filter((c) => c.cultural_background).length

  return (
    <>
      <div className="stats-grid">
        {REPORT_TABS.map(({ key, icon, tone }, i) => (
          <div key={key} className="fade-up" style={{ animationDelay: `${i * 80}ms` }}>
            <StatCard
              label={stats[key].label}
              value={loading ? '—' : String(stats[key].value)}
              meta={loading ? 'Loading...' : stats[key].value === 0 ? 'No data recorded yet' : 'Across all clients'}
              icon={icon}
              tone={tone}
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
            <>
              <ExportButton rows={notesToRows(notes)} filename="case-notes-report.csv" />
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
            </>
          ) : activeTab === 'activities' ? (
            <>
              <ExportButton rows={activitiesToRows(activities)} filename="case-activities-report.csv" />
              <Card style={!loading && activities.length === 0 ? undefined : { padding: 0 }}>
              {loading ? (
                <EmptyState icon={Activity} title="Loading..." text="Fetching case activities." />
              ) : activities.length === 0 ? (
                <EmptyState
                  icon={Activity}
                  title="No case activities to report"
                  text="Home visits, school visits, family meetings, and other logged activities will be summarized here."
                />
              ) : (
                <div className="data-table">
                  <div className="data-row notes-row data-row--head">
                    <span>Client</span>
                    <span>Notes</span>
                    <span>Date</span>
                    <span>Type</span>
                  </div>
                  {activities.map((a) => (
                    <div className="data-row notes-row" key={a.id}>
                      <span>{clientName(a.client)}</span>
                      <span className="data-cell-muted">{a.notes || '—'}</span>
                      <span className="data-cell-muted">{a.activity_date}</span>
                      <span className="data-cell-muted">{a.activity_type}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            </>
          ) : activeTab === 'referrals' ? (
            <>
              <ExportButton rows={referralsToRows(referrals)} filename="referrals-report.csv" />
              <div className="details-grid" style={{ marginBottom: 18 }}>
                {['Received', 'Accepted', 'Declined'].map((status) => (
                  <Card key={status}>
                    <div className="section-subtitle" style={{ marginBottom: 8, fontWeight: 700, color: 'var(--text)' }}>
                      {status}
                    </div>
                    <div className="stat-card-value" style={{ fontSize: 24 }}>
                      {loading ? '—' : referralsByStatus[status] ?? 0}
                    </div>
                  </Card>
                ))}
              </div>
              <Card style={!loading && referrals.length === 0 ? undefined : { padding: 0 }}>
                {loading ? (
                  <EmptyState icon={Share2} title="Loading..." text="Fetching referrals." />
                ) : referrals.length === 0 ? (
                  <EmptyState
                    icon={Share2}
                    title="No referrals to report"
                    text="Referrals logged on the Referrals page will be summarized here."
                  />
                ) : (
                  <div className="data-table">
                    <div className="data-row leads-row data-row--head">
                      <span>Name</span>
                      <span>Source</span>
                      <span className="leads-col-email">Referred By</span>
                      <span className="leads-col-phone">Date</span>
                      <span className="leads-col-source">Client Linked</span>
                      <span>Status</span>
                    </div>
                    {referrals.map((r) => (
                      <div className="data-row leads-row" key={r.id}>
                        <span>{[r.first_name, r.last_name].filter(Boolean).join(' ')}</span>
                        <span className="data-cell-muted">{r.referral_source || '—'}</span>
                        <span className="data-cell-muted leads-col-email">{r.referred_by || '—'}</span>
                        <span className="data-cell-muted leads-col-phone">{r.date_received}</span>
                        <span className="data-cell-muted leads-col-source">{clientName(r.client)}</span>
                        <StatusPill tone={REFERRAL_STATUS_TONE[r.status] ?? 'neutral'}>{r.status}</StatusPill>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          ) : activeTab === 'goals-outcomes' ? (
            <>
              <ExportButton rows={goalsToRows(goals)} filename="goals-report.csv" />
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
            </>
          ) : activeTab === 'outcomes' ? (
            <>
              <ExportButton rows={outcomesToRows(outcomes)} filename="outcomes-report.csv" />
              <div className="details-grid" style={{ marginBottom: 18 }}>
                {['Education', 'Employment', 'Health', 'Justice', 'Family', 'Cultural', 'Camp'].map((category) => (
                  <Card key={category}>
                    <div className="section-subtitle" style={{ marginBottom: 8, fontWeight: 700, color: 'var(--text)' }}>
                      {category}
                    </div>
                    <div className="stat-card-value" style={{ fontSize: 24 }}>
                      {loading ? '—' : outcomesByCategory[category] ?? 0}
                    </div>
                  </Card>
                ))}
              </div>
              <Card style={!loading && outcomes.length === 0 ? undefined : { padding: 0 }}>
                {loading ? (
                  <EmptyState icon={Award} title="Loading..." text="Fetching outcomes." />
                ) : outcomes.length === 0 ? (
                  <EmptyState
                    icon={Award}
                    title="No outcomes to report"
                    text="Education, employment, health, justice, family, and cultural outcomes will be summarized here."
                  />
                ) : (
                  <div className="data-table">
                    <div className="data-row goals-row data-row--head">
                      <span>Outcome</span>
                      <span className="goals-col-date">Date</span>
                      <span>Category</span>
                      <span className="goals-col-notes">Client</span>
                    </div>
                    {outcomes.map((o) => (
                      <div className="data-row goals-row" key={o.id}>
                        <span>{o.outcome_type}</span>
                        <span className="data-cell-muted goals-col-date">{o.outcome_date}</span>
                        <StatusPill tone={OUTCOME_CATEGORY_TONE[o.category] ?? 'neutral'}>{o.category}</StatusPill>
                        <span className="data-cell-muted goals-col-notes">{clientName(o.client)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          ) : activeTab === 'demographics' ? (
            <>
              <ExportButton rows={demographicsToRows(clientsForReports)} filename="demographics-report.csv" />
              <div className="details-grid" style={{ marginBottom: 18 }}>
                <Card>
                  <div className="section-subtitle" style={{ marginBottom: 8, fontWeight: 700, color: 'var(--text)' }}>
                    Active Participants
                  </div>
                  <div className="stat-card-value" style={{ fontSize: 24 }}>
                    {loading ? '—' : activeCount}
                  </div>
                </Card>
                <Card>
                  <div className="section-subtitle" style={{ marginBottom: 8, fontWeight: 700, color: 'var(--text)' }}>
                    Closed Participants
                  </div>
                  <div className="stat-card-value" style={{ fontSize: 24 }}>
                    {loading ? '—' : closedCount}
                  </div>
                </Card>
                <Card>
                  <div className="section-subtitle" style={{ marginBottom: 8, fontWeight: 700, color: 'var(--text)' }}>
                    Cultural Background Recorded
                  </div>
                  <div className="stat-card-value" style={{ fontSize: 24 }}>
                    {loading ? '—' : culturalRecordedCount}
                  </div>
                </Card>
              </div>
              <div className="details-grid">
                <BreakdownCard title="Age" entries={ageBreakdown} />
                <BreakdownCard title="Gender" entries={genderBreakdown} />
                <BreakdownCard title="Aboriginal & Torres Strait Islander Status" entries={indigenousBreakdown} />
                <BreakdownCard title="Risk Level" entries={riskBreakdown} />
                <BreakdownCard title="Suburb" entries={suburbBreakdown} />
              </div>
            </>
          ) : (
            <Card>
              <EmptyState
                icon={PackageCheck}
                title="Service delivery tracking not built yet"
                text="There's no database table for this yet, so there's nothing real to report. Program attendance and hours are tracked in Attendance Register."
              />
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
