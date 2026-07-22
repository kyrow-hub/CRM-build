import { useEffect, useState } from 'react'
import { FileText, Share2, TrendingUp, Award, Activity, PackageCheck, Users, Download, Gauge, BarChart3, Tent, StickyNote, Sparkles, Plus, ClipboardList } from 'lucide-react'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import StatusPill from '../components/ui/StatusPill.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { countClientNotes, listAllClientNotes } from '../services/clientNoteService.js'
import { countClientGoals, listAllClientGoals } from '../services/clientGoalService.js'
import { countClientsWithDetails, listClientsForReports, listClients } from '../services/clientService.js'
import { countReferralsByStatus, listReferrals } from '../services/referralService.js'
import { countCaseActivities, listAllCaseActivities } from '../services/caseActivityService.js'
import { countOutcomesByCategory, listAllOutcomes } from '../services/outcomeService.js'
import { getEngagedClientCount, getProgramHoursStats, getAttendanceStats, getGoalStatusCounts } from '../services/kpiService.js'
import { getProgramPerformance } from '../services/programPerformanceService.js'
import { getCampReport } from '../services/campReportService.js'
import { listGroupNoteReport } from '../services/groupSessionService.js'
import { listGoodNewsStories, createGoodNewsStory } from '../services/goodNewsStoryService.js'
import { listPrograms } from '../services/programService.js'
import { getGroupAttendanceReport } from '../services/groupAttendanceReportService.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { initials } from '../utils/initials.js'
import { avatarTone } from '../utils/avatarColor.js'
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
  { key: 'kpi', label: 'KPI Report', icon: Gauge, tone: 'indigo' },
  { key: 'program-performance', label: 'Program Performance', icon: BarChart3, tone: 'red' },
  { key: 'camps', label: 'Overnight Camps', icon: Tent, tone: 'cyan' },
  { key: 'group-notes', label: 'Group Note Report', icon: StickyNote, tone: 'violet' },
  { key: 'good-news', label: 'Good News Stories', icon: Sparkles, tone: 'lime' },
  { key: 'group-attendance', label: 'Group Attendance', icon: ClipboardList, tone: 'amber' },
]

const ATTENDANCE_STATUS_TONE = {
  Present: 'success',
  Absent: 'danger',
  Late: 'warning',
  'Left Early': 'warning',
  Excused: 'neutral',
}

function formatPercent(numerator, denominator) {
  if (!denominator) return '—'
  return `${Math.round((numerator / denominator) * 100)}%`
}

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

function kpiToRows(kpi) {
  return [
    { Metric: 'Young People Supported (all-time)', Value: kpi.engagedClientCount },
    { Metric: 'Program Hours Delivered', Value: kpi.programHours.totalHours.toFixed(1) },
    { Metric: 'Average Hours per Participant', Value: kpi.avgHoursPerParticipant },
    { Metric: 'Referrals Received', Value: kpi.referralsCount },
    { Metric: 'Referral Acceptance Rate', Value: kpi.referralAcceptanceRate },
    { Metric: 'Goal Completion Rate', Value: kpi.goalCompletionRate },
    { Metric: 'Attendance Rate', Value: kpi.attendanceRate },
    { Metric: 'Outcomes Achieved', Value: kpi.outcomesCount },
  ]
}

function programPerformanceToRows(programs) {
  return programs.map((p) => ({
    Program: p.name,
    'Sessions Run': p.sessionCount,
    'Camp Sessions': p.campSessions,
    'Total Attendance': p.totalAttendance,
    'Distinct Participants': p.distinctParticipants,
    'Repeat Attendance': p.repeatParticipants,
    'Avg Attendance per Session': p.avgAttendance.toFixed(1),
    'Hours Delivered': p.hours.toFixed(1),
    'Attendance Rate': p.attendanceRate == null ? '' : `${Math.round(p.attendanceRate * 100)}%`,
  }))
}

function campSessionsToRows(sessions) {
  return sessions.map((s) => ({
    Program: s.programName,
    Date: s.sessionDate,
    Location: s.location || '',
    Participants: s.participantCount,
    'Group Note': s.groupNote || '',
  }))
}

function campNotesToRows(notes) {
  return notes.map((n) => ({
    Client: clientName(n.client),
    Note: n.content,
    Date: n.note_date,
    Type: n.is_group_note ? 'Group Note' : 'Individual Note',
  }))
}

function campOutcomesToRows(outcomes) {
  return outcomes.map((o) => ({
    Client: clientName(o.client),
    Outcome: o.outcome_type,
    Date: o.outcome_date,
    Notes: o.notes || '',
  }))
}

function groupNotesToRows(sessions) {
  return sessions.map((s) => ({
    Program: s.program?.name ?? '',
    'Activity Type': s.activity_type || '',
    Date: s.session_date,
    Location: s.location || '',
    Facilitator: s.facilitator ? [s.facilitator.first_name, s.facilitator.last_name].filter(Boolean).join(' ') : '',
    Participants: s.participantCount,
    'Overnight Camp': s.overnight_camp ? 'Yes' : 'No',
    'Group Note': s.group_note,
  }))
}

function goodNewsStoriesToRows(stories) {
  return stories.map((s) => ({
    Title: s.title,
    Story: s.story,
    Client: clientName(s.client),
    Program: s.program?.name ?? '',
    Date: s.story_date,
  }))
}

function groupAttendanceToRows(sessions) {
  return sessions.flatMap((s) =>
    s.records.map((r) => ({
      Program: s.program?.name ?? '',
      'Activity Type': s.activity_type || '',
      Date: s.session_date,
      Location: s.location || '',
      'Overnight Camp': s.overnight_camp ? 'Yes' : 'No',
      Participant: clientName(r.client),
      Status: r.attendance_status,
    })),
  )
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

const todayISO = () => new Date().toISOString().slice(0, 10)

const emptyGoodNewsForm = { title: '', story: '', client_id: '', program_id: '', story_date: todayISO() }

export default function Reports() {
  const { user } = useAuth()
  const toast = useToast()
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
  const [engagedClientCount, setEngagedClientCount] = useState(0)
  const [programHours, setProgramHours] = useState({ totalHours: 0, sessionsWithDuration: 0, totalSessions: 0 })
  const [attendanceStats, setAttendanceStats] = useState({ statusCounts: {}, total: 0, distinctClients: 0 })
  const [goalStatusCounts, setGoalStatusCounts] = useState({})
  const [programPerformance, setProgramPerformance] = useState([])
  const [campReport, setCampReport] = useState({
    sessions: [],
    totalCamps: 0,
    totalParticipants: 0,
    totalAttendanceRecords: 0,
    repeatCampers: [],
    notes: [],
    outcomes: [],
  })
  const [groupNoteSessions, setGroupNoteSessions] = useState([])
  const [goodNewsStories, setGoodNewsStories] = useState([])
  const [clientsForForm, setClientsForForm] = useState([])
  const [programsForForm, setProgramsForForm] = useState([])
  const [showGoodNewsForm, setShowGoodNewsForm] = useState(false)
  const [goodNewsForm, setGoodNewsForm] = useState(emptyGoodNewsForm)
  const [submittingGoodNews, setSubmittingGoodNews] = useState(false)
  const [groupAttendanceReport, setGroupAttendanceReport] = useState({
    sessions: [],
    totalSessions: 0,
    totalRecords: 0,
    presentCount: 0,
    distinctParticipants: 0,
  })

  const refetchGoodNewsStories = () => {
    listGoodNewsStories()
      .then(setGoodNewsStories)
      .catch(() => {})
  }

  useEffect(() => {
    listClients()
      .then(setClientsForForm)
      .catch(() => setClientsForForm([]))
    listPrograms()
      .then(setProgramsForForm)
      .catch(() => setProgramsForForm([]))
  }, [])

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
      getEngagedClientCount(),
      getProgramHoursStats(),
      getAttendanceStats(),
      getGoalStatusCounts(),
      getProgramPerformance(),
      getCampReport(),
      listGroupNoteReport(),
      listGoodNewsStories(),
      getGroupAttendanceReport(),
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
          engagedCount,
          hoursStats,
          attendanceStatsResult,
          goalStatuses,
          programPerformanceResult,
          campReportResult,
          groupNoteSessionsResult,
          goodNewsStoriesResult,
          groupAttendanceReportResult,
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
          setEngagedClientCount(engagedCount)
          setProgramHours(hoursStats)
          setAttendanceStats(attendanceStatsResult)
          setGoalStatusCounts(goalStatuses)
          setProgramPerformance(programPerformanceResult)
          setCampReport(campReportResult)
          setGroupNoteSessions(groupNoteSessionsResult)
          setGoodNewsStories(goodNewsStoriesResult)
          setGroupAttendanceReport(groupAttendanceReportResult)
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
    kpi: { label: 'Young People Supported', value: engagedClientCount },
    'program-performance': { label: 'Programs Delivered', value: programPerformance.filter((p) => p.sessionCount > 0).length },
    camps: { label: 'Overnight Camps Run', value: campReport.totalCamps },
    'group-notes': { label: 'Group Notes Written', value: groupNoteSessions.length },
    'good-news': { label: 'Good News Stories', value: goodNewsStories.length },
    'group-attendance': { label: 'Group Sessions Attended', value: groupAttendanceReport.totalSessions },
  }

  const groupAttendancePresentRate = formatPercent(groupAttendanceReport.presentCount, groupAttendanceReport.totalRecords)

  const activeCount = clientsForReports.filter((c) => c.status === 'active' && !c.archived_at).length
  const closedCount = clientsForReports.filter((c) => c.status !== 'active' || c.archived_at).length
  const ageBreakdown = countBy(clientsForReports, (c) => ageBand(c.date_of_birth))
  const genderBreakdown = countBy(clientsForReports, (c) => c.gender)
  const indigenousBreakdown = countBy(clientsForReports, (c) => c.indigenous_status)
  const riskBreakdown = countBy(clientsForReports, (c) => c.risk_level)
  const suburbBreakdown = countBy(clientsForReports, (c) => c.suburb).slice(0, 8)
  const culturalRecordedCount = clientsForReports.filter((c) => c.cultural_background).length

  const closedClients = clientsForReports.filter((c) => c.status !== 'active' || c.archived_at)
  const closureReasonBreakdown = countBy(closedClients, (c) => c.exit_reason)

  const attendedStatuses = ['Present', 'Late', 'Left Early']
  const attendedCount = attendedStatuses.reduce((sum, s) => sum + (attendanceStats.statusCounts[s] ?? 0), 0)
  const excusedCount = attendanceStats.statusCounts.Excused ?? 0
  const attendanceRateDenominator = attendanceStats.total - excusedCount
  const attendanceRate = formatPercent(attendedCount, attendanceRateDenominator)

  const goalsAchieved = goalStatusCounts.Achieved ?? 0
  const totalGoalsForRate = Object.values(goalStatusCounts).reduce((sum, n) => sum + n, 0)
  const goalCompletionRate = formatPercent(goalsAchieved, totalGoalsForRate)

  const referralAcceptanceRate = formatPercent(referralsByStatus.Accepted ?? 0, referralsCount)

  const avgHoursPerParticipant = attendanceStats.distinctClients
    ? (programHours.totalHours / attendanceStats.distinctClients).toFixed(1)
    : '—'

  const kpiData = {
    engagedClientCount,
    programHours,
    avgHoursPerParticipant,
    referralsCount,
    referralAcceptanceRate,
    goalCompletionRate,
    attendanceRate,
    outcomesCount,
  }

  const programsDelivered = programPerformance.filter((p) => p.sessionCount > 0).length
  const totalGroupsRun = programPerformance.reduce((sum, p) => sum + p.sessionCount, 0)
  const totalProgramHours = programPerformance.reduce((sum, p) => sum + p.hours, 0)
  const totalProgramAttendance = programPerformance.reduce((sum, p) => sum + p.totalAttendance, 0)
  const overallAvgAttendance = totalGroupsRun ? totalProgramAttendance / totalGroupsRun : 0

  const repeatCamperEntries = campReport.repeatCampers.map((c) => [c.name, c.campsAttended])

  const totalGroupNoteParticipants = groupNoteSessions.reduce((sum, s) => sum + s.participantCount, 0)
  const avgParticipantsPerGroupNote = groupNoteSessions.length
    ? (totalGroupNoteParticipants / groupNoteSessions.length).toFixed(1)
    : '—'

  const handleAddGoodNewsStory = async (e) => {
    e.preventDefault()
    setSubmittingGoodNews(true)
    try {
      await createGoodNewsStory({
        title: goodNewsForm.title,
        story: goodNewsForm.story,
        client_id: goodNewsForm.client_id || null,
        program_id: goodNewsForm.program_id || null,
        story_date: goodNewsForm.story_date,
        created_by: user?.id,
      })
      toast.success('Good news story saved.')
      setGoodNewsForm(emptyGoodNewsForm)
      setShowGoodNewsForm(false)
      refetchGoodNewsStories()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmittingGoodNews(false)
    }
  }

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
          ) : activeTab === 'kpi' ? (
            <>
              <ExportButton rows={kpiToRows(kpiData)} filename="kpi-report.csv" />
              <div className="details-grid" style={{ marginBottom: 18 }}>
                <Card>
                  <div className="section-subtitle" style={{ marginBottom: 8, fontWeight: 700, color: 'var(--text)' }}>
                    Young People Supported
                  </div>
                  <div className="stat-card-value" style={{ fontSize: 24 }}>
                    {loading ? '—' : engagedClientCount}
                  </div>
                  <div className="data-cell-muted">All-time, at least one recorded touchpoint</div>
                </Card>
                <Card>
                  <div className="section-subtitle" style={{ marginBottom: 8, fontWeight: 700, color: 'var(--text)' }}>
                    Program Hours Delivered
                  </div>
                  <div className="stat-card-value" style={{ fontSize: 24 }}>
                    {loading ? '—' : programHours.totalHours.toFixed(1)}
                  </div>
                  <div className="data-cell-muted">
                    From {programHours.sessionsWithDuration} of {programHours.totalSessions} sessions with times set
                  </div>
                </Card>
                <Card>
                  <div className="section-subtitle" style={{ marginBottom: 8, fontWeight: 700, color: 'var(--text)' }}>
                    Avg. Hours per Participant
                  </div>
                  <div className="stat-card-value" style={{ fontSize: 24 }}>
                    {loading ? '—' : avgHoursPerParticipant}
                  </div>
                </Card>
                <Card>
                  <div className="section-subtitle" style={{ marginBottom: 8, fontWeight: 700, color: 'var(--text)' }}>
                    Referrals Received
                  </div>
                  <div className="stat-card-value" style={{ fontSize: 24 }}>
                    {loading ? '—' : referralsCount}
                  </div>
                </Card>
                <Card>
                  <div className="section-subtitle" style={{ marginBottom: 8, fontWeight: 700, color: 'var(--text)' }}>
                    Referral Acceptance Rate
                  </div>
                  <div className="stat-card-value" style={{ fontSize: 24 }}>
                    {loading ? '—' : referralAcceptanceRate}
                  </div>
                </Card>
                <Card>
                  <div className="section-subtitle" style={{ marginBottom: 8, fontWeight: 700, color: 'var(--text)' }}>
                    Goal Completion Rate
                  </div>
                  <div className="stat-card-value" style={{ fontSize: 24 }}>
                    {loading ? '—' : goalCompletionRate}
                  </div>
                  <div className="data-cell-muted">{goalsAchieved} of {totalGoalsForRate} goals achieved</div>
                </Card>
                <Card>
                  <div className="section-subtitle" style={{ marginBottom: 8, fontWeight: 700, color: 'var(--text)' }}>
                    Attendance Rate
                  </div>
                  <div className="stat-card-value" style={{ fontSize: 24 }}>
                    {loading ? '—' : attendanceRate}
                  </div>
                  <div className="data-cell-muted">Present, Late, or Left Early - excludes Excused</div>
                </Card>
                <Card>
                  <div className="section-subtitle" style={{ marginBottom: 8, fontWeight: 700, color: 'var(--text)' }}>
                    Outcomes Achieved
                  </div>
                  <div className="stat-card-value" style={{ fontSize: 24 }}>
                    {loading ? '—' : outcomesCount}
                  </div>
                </Card>
              </div>
              <div className="details-grid">
                <BreakdownCard title="Case Closure Reasons" entries={closureReasonBreakdown} />
              </div>
            </>
          ) : activeTab === 'program-performance' ? (
            <>
              <ExportButton rows={programPerformanceToRows(programPerformance)} filename="program-performance-report.csv" />
              <div className="details-grid" style={{ marginBottom: 18 }}>
                <Card>
                  <div className="section-subtitle" style={{ marginBottom: 8, fontWeight: 700, color: 'var(--text)' }}>
                    Programs Delivered
                  </div>
                  <div className="stat-card-value" style={{ fontSize: 24 }}>
                    {loading ? '—' : programsDelivered}
                  </div>
                </Card>
                <Card>
                  <div className="section-subtitle" style={{ marginBottom: 8, fontWeight: 700, color: 'var(--text)' }}>
                    Groups Run
                  </div>
                  <div className="stat-card-value" style={{ fontSize: 24 }}>
                    {loading ? '—' : totalGroupsRun}
                  </div>
                </Card>
                <Card>
                  <div className="section-subtitle" style={{ marginBottom: 8, fontWeight: 700, color: 'var(--text)' }}>
                    Total Program Hours
                  </div>
                  <div className="stat-card-value" style={{ fontSize: 24 }}>
                    {loading ? '—' : totalProgramHours.toFixed(1)}
                  </div>
                </Card>
                <Card>
                  <div className="section-subtitle" style={{ marginBottom: 8, fontWeight: 700, color: 'var(--text)' }}>
                    Overall Avg. Attendance
                  </div>
                  <div className="stat-card-value" style={{ fontSize: 24 }}>
                    {loading ? '—' : overallAvgAttendance.toFixed(1)}
                  </div>
                </Card>
              </div>
              <Card style={!loading && programPerformance.length === 0 ? undefined : { padding: 0 }}>
                {loading ? (
                  <EmptyState icon={BarChart3} title="Loading..." text="Fetching program performance." />
                ) : programPerformance.length === 0 ? (
                  <EmptyState
                    icon={BarChart3}
                    title="No programs to report"
                    text="Programs created in Attendance Register will be summarized here once they have sessions."
                  />
                ) : (
                  <div className="data-table">
                    <div className="data-row program-performance-row data-row--head">
                      <span>Program</span>
                      <span>Sessions</span>
                      <span>Camps</span>
                      <span>Attendance</span>
                      <span>Repeat</span>
                      <span>Avg/Session</span>
                      <span>Hours</span>
                      <span>Present Rate</span>
                    </div>
                    {programPerformance.map((p) => (
                      <div className="data-row program-performance-row" key={p.id}>
                        <span>{p.name}</span>
                        <span className="data-cell-muted">{p.sessionCount}</span>
                        <span className="data-cell-muted">{p.campSessions}</span>
                        <span className="data-cell-muted">{p.totalAttendance}</span>
                        <span className="data-cell-muted">{p.repeatParticipants}</span>
                        <span className="data-cell-muted">{p.avgAttendance.toFixed(1)}</span>
                        <span className="data-cell-muted">{p.hours.toFixed(1)}</span>
                        <span className="data-cell-muted">
                          {p.attendanceRate == null ? '—' : `${Math.round(p.attendanceRate * 100)}%`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          ) : activeTab === 'camps' ? (
            <>
              <ExportButton rows={campSessionsToRows(campReport.sessions)} filename="overnight-camps-report.csv" />
              <div className="details-grid" style={{ marginBottom: 18 }}>
                <Card>
                  <div className="section-subtitle" style={{ marginBottom: 8, fontWeight: 700, color: 'var(--text)' }}>
                    Overnight Camps Run
                  </div>
                  <div className="stat-card-value" style={{ fontSize: 24 }}>
                    {loading ? '—' : campReport.totalCamps}
                  </div>
                </Card>
                <Card>
                  <div className="section-subtitle" style={{ marginBottom: 8, fontWeight: 700, color: 'var(--text)' }}>
                    Camp Participants
                  </div>
                  <div className="stat-card-value" style={{ fontSize: 24 }}>
                    {loading ? '—' : campReport.totalParticipants}
                  </div>
                  <div className="data-cell-muted">Distinct young people across all camps</div>
                </Card>
                <Card>
                  <div className="section-subtitle" style={{ marginBottom: 8, fontWeight: 700, color: 'var(--text)' }}>
                    Camp Attendance Records
                  </div>
                  <div className="stat-card-value" style={{ fontSize: 24 }}>
                    {loading ? '—' : campReport.totalAttendanceRecords}
                  </div>
                </Card>
                <Card>
                  <div className="section-subtitle" style={{ marginBottom: 8, fontWeight: 700, color: 'var(--text)' }}>
                    Repeat Campers
                  </div>
                  <div className="stat-card-value" style={{ fontSize: 24 }}>
                    {loading ? '—' : campReport.repeatCampers.length}
                  </div>
                  <div className="data-cell-muted">Attended more than one camp</div>
                </Card>
              </div>

              <div className="section-title" style={{ marginBottom: 12 }}>
                Camps
              </div>
              <Card style={!loading && campReport.sessions.length === 0 ? undefined : { padding: 0, marginBottom: 24 }}>
                {loading ? (
                  <EmptyState icon={Tent} title="Loading..." text="Fetching overnight camps." />
                ) : campReport.sessions.length === 0 ? (
                  <EmptyState
                    icon={Tent}
                    title="No overnight camps recorded"
                    text="Mark a group session as an overnight camp in Attendance Register to see it here."
                  />
                ) : (
                  <div className="data-table">
                    <div className="data-row camp-session-row data-row--head">
                      <span>Program</span>
                      <span>Date</span>
                      <span>Location</span>
                      <span>Participants</span>
                    </div>
                    {campReport.sessions.map((s) => (
                      <div className="data-row camp-session-row" key={s.id}>
                        <span>{s.programName}</span>
                        <span className="data-cell-muted">{s.sessionDate}</span>
                        <span className="data-cell-muted">{s.location || '—'}</span>
                        <span className="data-cell-muted">{s.participantCount}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {repeatCamperEntries.length > 0 && (
                <div className="details-grid" style={{ marginBottom: 24 }}>
                  <BreakdownCard title="Which Participants Attended Multiple Camps" entries={repeatCamperEntries} />
                </div>
              )}

              <div className="section-head">
                <div>
                  <div className="section-title">Individual Camp Notes</div>
                  <div className="section-subtitle">Notes tied to a camp session, including group notes copied to each attendee</div>
                </div>
                <ExportButton rows={campNotesToRows(campReport.notes)} filename="camp-notes-report.csv" />
              </div>
              <Card style={!loading && campReport.notes.length === 0 ? undefined : { padding: 0, marginBottom: 24 }}>
                {campReport.notes.length === 0 ? (
                  <EmptyState icon={FileText} title="No camp notes yet" text="Notes logged for camp sessions will appear here." />
                ) : (
                  <div className="data-table">
                    <div className="data-row notes-row data-row--head">
                      <span>Client</span>
                      <span>Note</span>
                      <span>Date</span>
                      <span>Type</span>
                    </div>
                    {campReport.notes.map((n) => (
                      <div className="data-row notes-row" key={n.id}>
                        <span>{clientName(n.client)}</span>
                        <span className="data-cell-muted">{n.content}</span>
                        <span className="data-cell-muted">{n.note_date}</span>
                        <span className="data-cell-muted">{n.is_group_note ? 'Group Note' : 'Individual Note'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <div className="section-head">
                <div>
                  <div className="section-title">Camp Outcomes</div>
                  <div className="section-subtitle">Outcomes logged under the Camp category on a client's Outcomes tab</div>
                </div>
                <ExportButton rows={campOutcomesToRows(campReport.outcomes)} filename="camp-outcomes-report.csv" />
              </div>
              <Card style={!loading && campReport.outcomes.length === 0 ? undefined : { padding: 0 }}>
                {campReport.outcomes.length === 0 ? (
                  <EmptyState icon={Award} title="No camp outcomes yet" text="Outcomes logged with the Camp category will appear here." />
                ) : (
                  <div className="data-table">
                    <div className="data-row goals-row data-row--head">
                      <span>Outcome</span>
                      <span className="goals-col-date">Date</span>
                      <span>Client</span>
                      <span className="goals-col-notes">Notes</span>
                    </div>
                    {campReport.outcomes.map((o) => (
                      <div className="data-row goals-row" key={o.id}>
                        <span>{o.outcome_type}</span>
                        <span className="data-cell-muted goals-col-date">{o.outcome_date}</span>
                        <span className="data-cell-muted">{clientName(o.client)}</span>
                        <span className="data-cell-muted goals-col-notes">{o.notes || '—'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          ) : activeTab === 'group-notes' ? (
            <>
              <ExportButton rows={groupNotesToRows(groupNoteSessions)} filename="group-note-report.csv" />
              <div className="details-grid" style={{ marginBottom: 18 }}>
                <Card>
                  <div className="section-subtitle" style={{ marginBottom: 8, fontWeight: 700, color: 'var(--text)' }}>
                    Group Notes Written
                  </div>
                  <div className="stat-card-value" style={{ fontSize: 24 }}>
                    {loading ? '—' : groupNoteSessions.length}
                  </div>
                </Card>
                <Card>
                  <div className="section-subtitle" style={{ marginBottom: 8, fontWeight: 700, color: 'var(--text)' }}>
                    Total Attendee Reach
                  </div>
                  <div className="stat-card-value" style={{ fontSize: 24 }}>
                    {loading ? '—' : totalGroupNoteParticipants}
                  </div>
                  <div className="data-cell-muted">Sum of participants across every group note</div>
                </Card>
                <Card>
                  <div className="section-subtitle" style={{ marginBottom: 8, fontWeight: 700, color: 'var(--text)' }}>
                    Avg. Participants per Note
                  </div>
                  <div className="stat-card-value" style={{ fontSize: 24 }}>
                    {loading ? '—' : avgParticipantsPerGroupNote}
                  </div>
                </Card>
              </div>
              <Card style={!loading && groupNoteSessions.length === 0 ? undefined : { padding: 0 }}>
                {loading ? (
                  <EmptyState icon={StickyNote} title="Loading..." text="Fetching group notes." />
                ) : groupNoteSessions.length === 0 ? (
                  <EmptyState
                    icon={StickyNote}
                    title="No group notes yet"
                    text="The shared note written when you save a Group Session in Attendance Register will appear here."
                  />
                ) : (
                  <div className="note-list">
                    {groupNoteSessions.map((s) => {
                      const facilitatorName = s.facilitator
                        ? [s.facilitator.first_name, s.facilitator.last_name].filter(Boolean).join(' ')
                        : 'No facilitator recorded'
                      return (
                        <div className="note-item" key={s.id}>
                          <div className="note-item-meta">
                            <span>
                              {s.program?.name ?? 'Program'}
                              {s.activity_type ? ` · ${s.activity_type}` : ''} · {facilitatorName}
                            </span>
                            <span>{s.session_date}</span>
                          </div>
                          <div className="data-cell-muted" style={{ marginBottom: 8 }}>
                            {s.location ? `${s.location} · ` : ''}
                            {s.participantCount} participant{s.participantCount === 1 ? '' : 's'}
                            {s.overnight_camp ? ' · Overnight Camp' : ''}
                          </div>
                          <div className="note-item-text">{s.group_note}</div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            </>
          ) : activeTab === 'good-news' ? (
            <>
              <div className="section-head">
                <div>
                  <div className="section-title">Good News Stories</div>
                  <div className="section-subtitle">
                    {loading ? 'Loading...' : `${goodNewsStories.length} ${goodNewsStories.length === 1 ? 'story' : 'stories'}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <ExportButton rows={goodNewsStoriesToRows(goodNewsStories)} filename="good-news-stories.csv" />
                  <Button onClick={() => setShowGoodNewsForm((v) => !v)}>
                    <Plus strokeWidth={2} />
                    Add Story
                  </Button>
                </div>
              </div>

              {showGoodNewsForm && (
                <Card style={{ marginBottom: 18 }}>
                  <form onSubmit={handleAddGoodNewsStory}>
                    <div className="form-grid">
                      <div>
                        <label className="form-label" htmlFor="gn-title">
                          Title
                        </label>
                        <input
                          id="gn-title"
                          className="input"
                          value={goodNewsForm.title}
                          onChange={(e) => setGoodNewsForm((f) => ({ ...f, title: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <label className="form-label" htmlFor="gn-date">
                          Date
                        </label>
                        <input
                          id="gn-date"
                          type="date"
                          className="input"
                          value={goodNewsForm.story_date}
                          onChange={(e) => setGoodNewsForm((f) => ({ ...f, story_date: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <label className="form-label" htmlFor="gn-client">
                          Client (optional)
                        </label>
                        <select
                          id="gn-client"
                          className="input"
                          value={goodNewsForm.client_id}
                          onChange={(e) => setGoodNewsForm((f) => ({ ...f, client_id: e.target.value }))}
                        >
                          <option value="">None</option>
                          {clientsForForm.map((c) => (
                            <option key={c.id} value={c.id}>
                              {[c.first_name, c.last_name].filter(Boolean).join(' ')}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="form-label" htmlFor="gn-program">
                          Program (optional)
                        </label>
                        <select
                          id="gn-program"
                          className="input"
                          value={goodNewsForm.program_id}
                          onChange={(e) => setGoodNewsForm((f) => ({ ...f, program_id: e.target.value }))}
                        >
                          <option value="">None</option>
                          {programsForForm.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div style={{ marginTop: 14 }}>
                      <label className="form-label" htmlFor="gn-story">
                        Story
                      </label>
                      <textarea
                        id="gn-story"
                        className="input"
                        rows={4}
                        placeholder="What happened, and why it's worth sharing..."
                        value={goodNewsForm.story}
                        onChange={(e) => setGoodNewsForm((f) => ({ ...f, story: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="form-actions">
                      <Button type="button" variant="secondary" onClick={() => setShowGoodNewsForm(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={submittingGoodNews}>
                        {submittingGoodNews ? 'Saving...' : 'Save Story'}
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              <Card style={!loading && goodNewsStories.length === 0 ? undefined : { padding: 0 }}>
                {loading ? (
                  <EmptyState icon={Sparkles} title="Loading..." text="Fetching good news stories." />
                ) : goodNewsStories.length === 0 ? (
                  <EmptyState
                    icon={Sparkles}
                    title="No good news stories yet"
                    text="Write up a short success story worth sharing in a newsletter or funding report."
                  />
                ) : (
                  <div className="note-list">
                    {goodNewsStories.map((s) => (
                      <div className="note-item" key={s.id}>
                        <div className="note-item-meta">
                          <span>
                            {s.title}
                            {s.client ? ` · ${clientName(s.client)}` : ''}
                            {s.program ? ` · ${s.program.name}` : ''}
                          </span>
                          <span>{s.story_date}</span>
                        </div>
                        <div className="note-item-text">{s.story}</div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          ) : activeTab === 'group-attendance' ? (
            <>
              <ExportButton
                rows={groupAttendanceToRows(groupAttendanceReport.sessions)}
                filename="group-attendance-report.csv"
              />
              <div className="details-grid" style={{ marginBottom: 18 }}>
                <Card>
                  <div className="section-subtitle" style={{ marginBottom: 8, fontWeight: 700, color: 'var(--text)' }}>
                    Sessions with Attendance
                  </div>
                  <div className="stat-card-value" style={{ fontSize: 24 }}>
                    {loading ? '—' : groupAttendanceReport.totalSessions}
                  </div>
                </Card>
                <Card>
                  <div className="section-subtitle" style={{ marginBottom: 8, fontWeight: 700, color: 'var(--text)' }}>
                    Total Attendance Records
                  </div>
                  <div className="stat-card-value" style={{ fontSize: 24 }}>
                    {loading ? '—' : groupAttendanceReport.totalRecords}
                  </div>
                </Card>
                <Card>
                  <div className="section-subtitle" style={{ marginBottom: 8, fontWeight: 700, color: 'var(--text)' }}>
                    Distinct Participants
                  </div>
                  <div className="stat-card-value" style={{ fontSize: 24 }}>
                    {loading ? '—' : groupAttendanceReport.distinctParticipants}
                  </div>
                </Card>
                <Card>
                  <div className="section-subtitle" style={{ marginBottom: 8, fontWeight: 700, color: 'var(--text)' }}>
                    Present Rate
                  </div>
                  <div className="stat-card-value" style={{ fontSize: 24 }}>
                    {loading ? '—' : groupAttendancePresentRate}
                  </div>
                </Card>
              </div>

              {loading ? (
                <Card>
                  <EmptyState icon={ClipboardList} title="Loading..." text="Fetching group attendance." />
                </Card>
              ) : groupAttendanceReport.sessions.length === 0 ? (
                <Card>
                  <EmptyState
                    icon={ClipboardList}
                    title="No group attendance recorded"
                    text="Attendance logged in Attendance Register will appear here, grouped by session."
                  />
                </Card>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {groupAttendanceReport.sessions.map((s) => (
                    <Card key={s.id} style={{ padding: 0 }}>
                      <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 700, fontSize: 14.5 }}>
                          {s.program?.name ?? 'Program'}
                          {s.activity_type ? ` · ${s.activity_type}` : ''}
                          {s.overnight_camp ? ' · Overnight Camp' : ''}
                        </div>
                        <div className="data-cell-muted" style={{ marginTop: 4 }}>
                          {s.session_date}
                          {s.location ? ` · ${s.location}` : ''} · {s.records.length}{' '}
                          {s.records.length === 1 ? 'participant' : 'participants'}
                        </div>
                      </div>
                      <div className="data-table">
                        {s.records.map((r) => {
                          const name = clientName(r.client)
                          return (
                            <div className="data-row roster-row" key={r.id}>
                              <div className="client-identity">
                                <div className={`client-avatar avatar--${avatarTone(name)}`}>{initials(name)}</div>
                                <span>{name}</span>
                              </div>
                              <StatusPill tone={ATTENDANCE_STATUS_TONE[r.attendance_status] ?? 'neutral'}>
                                {r.attendance_status}
                              </StatusPill>
                            </div>
                          )
                        })}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
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
